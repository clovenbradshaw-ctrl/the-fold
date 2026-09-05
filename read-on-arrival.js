// read-on-arrival.js — read when material arrives (Pass 18, P99). Pure.
//
// Until this file, `addSource` chunked and persisted a source and READ none
// of it: cast, relations and the hyperlexicon door ran only per turn, over
// the three passages retrieval happened to hand the model. A book attached
// and never asked about was a book never read. This is the reader loop:
// ordered, resumable, one passage at a time, yielding between passages so a
// long source never freezes the page (eoWebLLM L7's bookmarked
// chapter-at-a-time lesson), landing every bound claim on the SAME ledger a
// turn admits into, through the SAME door.
//
//   admitPassages(hyperlexicon, ledger, passages, {read, witnessFor, …})
//     — ONE implementation of "these passages' bound claims enter the
//       ledger", moved out of holon.js's per-part loop verbatim so the
//       per-turn path and the arrival path cannot drift (P22/P24/P39's class).
//   readOnArrival({name, passages, relationsFor, hyperlexicon, ledger, cursor, …})
//     — the loop. The relation reader is built ONCE over the source's own
//       passages as its pool (declared in the returned `pool`); the cursor is
//       the count of passages admitted under `recipe`, so a reload resumes
//       where it stopped and a reader with a different recipe reads again
//       under its own witness string (two instruments, counted apart —
//       `independentReadings`, P68).
//
// What the tests pin (read-on-arrival.test.mjs, real organs): a read resumed
// from its cursor is byte-identical to a straight read; a suffix never
// alters or removes a prefix note's own witnesses and spans (it may ADD a
// witness — that is corroboration, not drift); the door's refusals are
// carried, never discarded; and a second recipe is a second instrument.

/**
 * Admit the bound claims of `passages` into `ledger`. Returns the log (born
 * here if `ledger` was null and something bound), the count heard, and every
 * refusal the door typed — P57: `turnedAway` is not optional.
 */
export function admitPassages(hyperlexicon, ledger, passages, { read, witnessFor, classifyConnector = null, frame = null } = {}) {
  if (!hyperlexicon || typeof read !== "function" || typeof witnessFor !== "function") throw new TypeError("admitPassages: the door, the reader's read() and witnessFor are injected");
  let log = ledger ?? null;
  let heard = 0;
  const turnedAway = [];
  for (const p of passages ?? []) {
    const text = String(p?.text ?? "");
    if (!text.trim()) continue;
    const claims = read(text)?.claims ?? [];
    // Read off the claim's neutral arrangement (P72); the door's own admit()
    // still requires subject/verb/object as ITS field contract (P57's
    // independent ledger vocabulary), so the destination keys stay as they are.
    // polarity "-" is a CUT at the door (S69) — a denial, never a witness of
    // the link it denies.
    const edges = claims.filter((c) => c.verdict === "bound").map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, polarity: c.polarity ?? "+", spans: c.spans ?? [] }));
    if (!edges.length) continue;
    if (!log) log = hyperlexicon.createHyperlexicon(frame ? { frame } : undefined);
    // The frame in force follows the reader, not the ledger's birthday (P81).
    if (frame && hyperlexicon.redeclareFrame) log = hyperlexicon.redeclareFrame(log, frame);
    const admitted = hyperlexicon.admit(log, edges, { witness: witnessFor(p), classifyConnector });
    log = admitted.log;
    heard += admitted.heard.length;
    for (const t of admitted.turnedAway) turnedAway.push({ witness: p.ref ?? null, reason: t.reason, detail: t.detail, verb: t.edge?.verb ?? null });
  }
  return { log, heard, turnedAway };
}

/**
 * Read a source's passages from `cursor` to the end, in order, yielding
 * between passages. `yieldFn` is injected (the page yields a macrotask; a
 * test passes a no-op); `now` likewise, so the timing is the host's clock.
 */
export async function readOnArrival({
  name, passages, relationsFor, hyperlexicon, ledger = null, ledgerRef = null,
  frame = null, recipe = null, classifyConnector = null,
  cursor = 0, yieldEvery = 1, onProgress = null,
  yieldFn = () => new Promise((r) => setTimeout(r)), now = () => Date.now(),
} = {}) {
  if (!Array.isArray(passages)) throw new TypeError("readOnArrival: passages is the source's own ordered chunk list");
  if (typeof relationsFor !== "function" || !hyperlexicon) throw new TypeError("readOnArrival: the relation reader factory and the door are injected");
  if (!Number.isInteger(cursor) || cursor < 0) throw new TypeError("readOnArrival: cursor is a non-negative integer — how many passages were already admitted under this recipe");
  const t0 = now();
  const start = Math.min(cursor, passages.length);
  if (start >= passages.length) return { log: ledger, cursor: passages.length, read: 0, heard: 0, turnedAway: [], ms: 0, recipe, pool: { passages: passages.length }, resumed: cursor > 0 };
  const rel = relationsFor(passages, { pool: passages });
  const witnessFor = (p) => (p?.ref ? (recipe ? `${p.ref}~${recipe}` : p.ref) : null);
  // `ledgerRef` ({get, set}): each passage builds on the ledger OF THE MOMENT
  // and writes it back, so a chat turn that lands between two passages is
  // not overwritten by a stale chain (the app merges its own write-back the
  // same way, record-log.js::mergeAppendOnly). Absent, `ledger` is the chain.
  let log = ledgerRef ? ledgerRef.get() : ledger;
  let heard = 0;
  const turnedAway = [];
  for (let i = start; i < passages.length; i += 1) {
    if (ledgerRef) log = ledgerRef.get();
    const r = admitPassages(hyperlexicon, log, [passages[i]], { read: rel.read, witnessFor, classifyConnector, frame });
    log = r.log;
    if (ledgerRef && log) ledgerRef.set(log);
    heard += r.heard;
    turnedAway.push(...r.turnedAway);
    if (onProgress) onProgress({ name, read: i + 1, total: passages.length, heard, log });
    if ((i + 1 - start) % yieldEvery === 0 && i + 1 < passages.length) await yieldFn();
  }
  return { log, cursor: passages.length, read: passages.length - start, heard, turnedAway, ms: now() - t0, recipe, pool: { passages: passages.length }, resumed: start > 0 };
}

/** The typed unread extent of a source, for a question asked mid-read. */
export function unreadExtent({ name, cursor, total }) {
  const read = Math.min(Math.max(0, cursor | 0), total | 0);
  if (read >= total) return null;
  return { type: "unread_extent", name, read, total, unread: total - read, detail: `${name}: ${read} of ${total} passage(s) read so far; ${total - read} not yet read` };
}
