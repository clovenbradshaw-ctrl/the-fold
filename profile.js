// profile.js — the durable ledger of what this instrument has been told
// about the PERSON it is talking to (their own name, role, ongoing work, a
// standing preference) — proposed from what they actually say, never
// invented, always reviewable, always revocable. Pure: no DOM, no network,
// no model call lives here.
//
// Distinct from the composer's own "memory" sheet (`memory-menu` in
// index.html/app.js) — that one is material "beyond the model" (attachments,
// web). This ledger is about the speaker, not the source material, so it
// gets its own name in the UI ("About you") to keep the two apart.
//
// App-wide (like `gridLog`/`hyperlexiconLog`) rather than per-conversation
// or per-workspace: a fact about the person is true regardless of which
// workspace they happen to be in. UNLIKE those two, this one IS persisted
// across reloads — a fresh page load must not forget who it is talking to
// — and it is the one ledger this app syncs to the person's own Matrix
// account (matrix-client.js's `pullProfile`/`pushProfile`), never to a
// shared room: it is never handed to another room member.

const encoder = new TextEncoder();
const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/**
 * Content-derived, the same posture matrix.js::entryId already holds
 * ("id is content-derived so a re-push from another browser of the same
 * person dedups on read" — eopm's rule, "dedup on read, never coordinate
 * on write"): two devices proposing the identical fact land the identical
 * id, so `merge` below reduces to a plain map union with no locking and no
 * server-side coordination required.
 */
export async function entryId({ text, category }) {
  const bytes = encoder.encode(JSON.stringify([category ?? null, String(text ?? "").trim().toLowerCase()]));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return b64url(new Uint8Array(digest).subarray(0, 12));
}

export function createLog() {
  return { entries: [] };
}

/**
 * Whether a message already contains an unmistakable first-person
 * self-referential statement — the MECHANICAL gate a caller runs before
 * ever spending a model call on it. Measured live against gemma2:2b
 * (2026-09-09): asked to freely judge "is this worth remembering" on an
 * arbitrary message, the small model conflated judging the message with
 * ANSWERING it — "What's the capital of France?" came back with `fact:
 * "Paris"`, the exact class of failure this codebase's own WITNESS_SCHEMA
 * header already names ("the model is only ever the mouth"). Gating on
 * this pattern first means a message with no first-person self-reference
 * never reaches the model at all, so it structurally cannot be "answered"
 * instead of judged — the model's only remaining job (see app.js's
 * `noticeAboutUser`) is restating the ALREADY-FLAGGED self-reference in
 * third person, never deciding whether one exists.
 *
 * Deliberately narrow and English-only, the same posture `NEGATION_WORDS`/
 * `DEFINITE_DETERMINERS` hold elsewhere in this codebase's own reading
 * pipeline: a real closed pattern, not a numeric threshold tuned against
 * an answer key.
 */
export const SELF_REFERENTIAL = /\bi'?m\b|\bi am\b|\bi'?ve\b|\bi have\b|\bmy name is\b|\bi go by\b|\bcall me\b|\bi work (?:as|at|on|for)\b|\bi'?m (?:working|building)\b|\bi like\b|\bi love\b|\bi prefer\b|\bi enjoy\b|\bi'?m (?:a|an)\b|\bi plan to\b|\bi want to\b|\bi'?m trying to\b/i;

export const looksSelfReferential = (text) => SELF_REFERENTIAL.test(String(text ?? ""));

/**
 * The categories on offer for a proposed entry — a closed, declared set
 * (folds-pane.js's own posture for its sort keys) rather than whatever
 * word an extraction call happens to produce. `classify` below refuses an
 * unlisted category rather than silently relabeling it.
 */
export const CATEGORIES = Object.freeze(["identity", "role", "project", "preference", "goal", "fact"]);

/**
 * Propose a candidate — status "pending" until a person confirms it.
 * Refuses blank text and an unlisted category outright (a caller error,
 * never a silent default: II.1's "defaults are givers and must sign" holds
 * here as much as anywhere else this codebase declares it). Already-known
 * content (same id) is a no-op, not a duplicate pending row.
 */
export async function propose(log, { text, category, turnRef = null }) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) throw new TypeError("propose: text is required");
  if (!CATEGORIES.includes(category)) throw new TypeError(`propose: unknown category ${JSON.stringify(category)}`);
  const id = await entryId({ text: trimmed, category });
  if (log.entries.some((e) => e.id === id)) return log;
  const now = Date.now();
  return { entries: [...log.entries, { id, text: trimmed, category, status: "pending", turnRef, createdAt: now, updatedAt: now }] };
}

/** Add an entry directly as kept — the manual "add a note" path, never
 * proposed and never needing a confirm click of its own. */
export async function addKept(log, { text, category, turnRef = null }) {
  const proposed = await propose(log, { text, category, turnRef });
  if (proposed === log) return log; // already known — leave its real status alone
  const id = proposed.entries.at(-1).id;
  return keep(proposed, id);
}

const touch = (log, id, patch) => ({
  entries: log.entries.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: Date.now() } : e)),
});

export function keep(log, id) { return touch(log, id, { status: "kept" }); }
export function dismiss(log, id) { return touch(log, id, { status: "dismissed" }); }
export function edit(log, id, text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) throw new TypeError("edit: text is required");
  return touch(log, id, { text: trimmed, status: "kept" });
}
export function remove(log, id) { return { entries: log.entries.filter((e) => e.id !== id) }; }

export const pending = (log) => log.entries.filter((e) => e.status === "pending");
export const kept = (log) => log.entries.filter((e) => e.status === "kept");

/**
 * Merge two logs by id — last-write-wins on `updatedAt`. This is the whole
 * mechanism `matrix-client.js`'s account_data sync needs: pull the
 * account's copy, merge with the local one, push the result back. No
 * server-side locking, no vector clock — a dismissed-then-re-proposed
 * entry simply carries a newer `updatedAt` than the stale copy it beat.
 */
export function merge(a, b) {
  const byId = new Map();
  for (const e of [...(a?.entries ?? []), ...(b?.entries ?? [])]) {
    const prev = byId.get(e.id);
    if (!prev || (e.updatedAt ?? 0) > (prev.updatedAt ?? 0)) byId.set(e.id, e);
  }
  return { entries: [...byId.values()].sort((x, y) => (x.createdAt ?? 0) - (y.createdAt ?? 0)) };
}
