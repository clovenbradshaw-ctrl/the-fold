// field-of-record.js — GFP Pass 33: THE SHADOW, derived from the record and
// the sources. Pure; the OPFS half is field-store.js, the page crossings
// are named there.
//
// The shadow is the keyless field's remembered name (2026-09-11, user-given,
// an alias for relative.js's Field). The holograph is the addressable side of
// recall — every part points at the whole by address. The shadow is the other
// side — the whole settles from any part, by cue, no keys, no `get`: graceful
// and never exact, it degrades and says by how much. Ground casts; the shadow
// follows (derived, rebuilt losslessly, P3: it can never be its own light
// source — it never feeds the mouth on its own); the pattern measures the
// light (null band, drift, reanchor). Grep for THE_SHADOW to find the name
// everywhere it is introduced.
//
// And THE IMPRESSION (THE_IMPRESSION) is the minimum we remember: the shadow's
// thin form — a node with a state and a pointer, NO words (admitPassage /
// admitEntry with `impression: true`, or impressionOf for the pure state).
// It recalls, it names its origin, and it can never be re-expanded or
// re-anchored — there are no words to search for. Structurally unreadable:
// the sealed form to share across a room (GFP Pass 39). Its size knob is the
// state's resolution (SDR_BITS), which GFP Pass 36 measures — never picked.
//
// Material arrives at two doors and both admit here: the reader loop
// (read-on-arrival.js, one passage per macrotask — `admitPassage`) and the
// record's own append (every entry that carries text — `admitEntry`). The
// field is a projection: deleting it loses nothing, it is rebuilt from what
// the record and the sources hold (Pass 33's own claim, and this file's
// `fieldFromRows` is the rebuild).
//
// THE STORE CARRIES NO POSITIONS (F3). A row names its own predecessors by
// signature and nothing else; a successor's `next` is DERIVED on rebuild
// from the successors' `prev`, so an append-only store can name a link that
// did not exist when the earlier row was written. Shuffle the rows and the
// same field comes back — recall and navigation identical on every probe
// (tested here, measured in eval/field-of-record.mjs).
//
// Disclosed, not hidden: a signature is the hash of a text (relative.js),
// so two rows with the SAME text collapse into one node on rebuild. The
// eval counts how often the record repeats a text; the design decision of
// whether a signature should carry the ground address as well is the
// spec's author's, not this file's.
import { Field, tokensOf, isWord, sdrOf, SDR_BITS } from "./relative.js";

/** GFP Pass 35: how many recalled passages a turn will offer beside lexical retrieval.
 * Declared, not measured (2026-09-11, set by hand for the turn seat): a structural
 * budget — a cap on what the shadow may add to a turn's passages, never a cut against
 * the material. GFP Pass 36 measures the field at scale; the offer cap is a giver-
 * named convention until a measurement replaces it. */
export const FIELD_OFFER_MAX = 2;
/** The shadow's canonical name — the alias to grep for wherever the keyless field is introduced. */
export const THE_SHADOW = "shadow";
/** THE IMPRESSION — the minimum we remember of something: a state and a pointer,
 * NO words. The shadow's thin form (2026-09-11, user direction: "the minimum we
 * remember"). An impression node retains no text — it recalls (have I met this),
 * it names where it came from (payload), and it can never be re-expanded or
 * re-anchored (there are no words to search for). Structurally unreadable — the
 * sealed form to share. Resolution (SDR_BITS) is the size knob, measured by GFP
 * Pass 36, never picked by hand. Grep for THE_IMPRESSION to find it everywhere. */
export const THE_IMPRESSION = "impression";

/** The fields a ledger line may carry text in, in the order they are joined. */
export const TEXT_FIELDS = Object.freeze(["text", "description", "result", "question", "answer", "note"]);

/** The text an entry carries, or null when it carries none. No floor: an entry with two words is admitted with two words. */
export function textOfEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const parts = [];
  for (const k of TEXT_FIELDS) if (typeof entry[k] === "string" && entry[k].trim()) parts.push(entry[k].trim());
  if (!parts.length) return null;
  const text = parts.join("\n");
  return tokensOf(text).filter(isWord).length ? text : null;
}

/** A passage from the reader loop: its bytes, its ground address, its source.
 * `impression: true` admits THE IMPRESSION instead — the state and a pointer,
 * no words (recall-only, never re-expandable). */
export function admitPassage(field, passage, { source = passage?.source ?? null, impression = false } = {}) {
  const text = String(passage?.text ?? "");
  if (!text.trim()) return null;
  return field.admit(text, { source, at: passage?.ref ?? null }, { impression });
}

/** A ledger entry: its text, addressed by the record it sits in and its seq there.
 * `impression: true` admits the entry's impression — the state and pointer only. */
export function admitEntry(field, entry, { record = null, seq = entry?.seq ?? null, impression = false } = {}) {
  const text = textOfEntry(entry);
  if (!text) return null;
  return field.admit(text, { record, at: seq != null ? `${record}@${seq}` : null, kind: entry?.kind ?? entry?.event ?? entry?.schema ?? null }, { impression });
}

/** THE IMPRESSION of a text, as the minimum the shadow would remember: the state
 * (at the declared resolution) and the state's own signature — no words. */
export function impressionOf(text, { bits = SDR_BITS } = {}) {
  const sdr = sdrOf(String(text ?? ""), { bits });
  return { sdr, signature: stateSignatureOf(sdr), bits };
}
function stateSignatureOf(sdr) {
  let h = 0x811c9dc5;
  for (let i = 0; i < sdr.length; i++) { h ^= sdr[i]; h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16);
}

/** JSONL lines as the record store hands them; returns how many nodes were admitted. */
export function admitRecordLines(field, record, lines, { seqFrom = null } = {}) {
  let n = 0, i = 0;
  for (const line of lines ?? []) {
    let entry = null;
    try { entry = JSON.parse(line); } catch { i += 1; continue; }
    const seq = entry?.seq ?? (seqFrom != null ? seqFrom + i : null);
    if (admitEntry(field, entry, { record, seq })) n += 1;
    i += 1;
  }
  return n;
}

/** The rows for nodes admitted at or after `from` — predecessors by signature, no positions, no `next`. An impression row persists its state (nothing else can rebuild it). */
export function rowsSince(field, from = 0) {
  return field.nodes.slice(Math.max(0, from | 0)).map((n) => ({ text: n.text, ...(n.impression ? { sdr: Array.from(n.sdr) } : {}), payload: n.payload ?? null, signature: n.signature, prev: [...n.prev].map(([m, w]) => [m.signature, w]) }));
}

/**
 * The field a store rebuilds to. `next` is derived from `prev`, and the
 * field's `last` — where the next admission links — is the chain end the
 * store's order names last (store order is admission order; under a
 * shuffle, any chain end is a valid `last`, and recall does not depend on
 * it).
 */
export function fieldFromRows(rows = [], opts) {
  const next = new Map();
  for (const r of rows) for (const [sig, w] of r.prev ?? []) { if (!next.has(sig)) next.set(sig, []); next.get(sig).push([r.signature, w]); }
  const full = rows.map((r) => ({ text: r.text, ...(r.sdr ? { sdr: r.sdr } : {}), payload: r.payload ?? null, signature: r.signature, prev: r.prev ?? [], next: next.get(r.signature) ?? [] }));
  const f = Field.deserialize(full, opts);
  const ends = f.nodes.filter((n) => n.next.size === 0);
  f.last = ends.at(-1) ?? f.nodes.at(-1) ?? null;
  return f;
}

/** Build a field from sources' passages and records' lines in one go — the boot path and the eval's. */
export function fieldOf({ passages = [], records = {} } = {}, opts) {
  const f = new Field(opts);
  for (const p of passages) admitPassage(f, p);
  for (const [name, lines] of Object.entries(records)) admitRecordLines(f, name, lines);
  return f;
}

/**
 * GFP Pass 35 — the figure as one witness in retrieval. Recall the field from
 * a turn's cue and shape what settled for the turn: the recalled nodes as
 * passages with their ground addresses, the verdict against the field's own
 * null band, and the band itself. `steps`/`spread` default to the field's own;
 * a caller running the spec's shuffled-record null passes the SAME numbers to
 * both arms so the two bands are comparable. Returns `null` when there is no
 * field or the cue carries no words, and a verdict-only object (`nothing` /
 * `ambiguous`) when the cue does not settle above chance.
 */
export function recallForTurn(field, cue, { limit = FIELD_OFFER_MAX, draws = 150, steps, spread } = {}) {
  if (!field || !field.size) return null;
  const words = tokensOf(String(cue ?? "")).filter(isWord).length;
  if (!words) return null;
  const r = field.recallAgainstNull(cue, { draws, steps, spread });
  const shape = (row) => ({ text: row?.node?.text ?? null, ref: row?.node?.payload?.at ?? null, source: row?.node?.payload?.source ?? null, activation: row?.activation ?? 0 });
  if (r.kind !== "figure" && r.kind !== "ambiguous") return { kind: r.kind, band: r.band ?? null, top: null, passages: [] };
  // Only text-bearing nodes can be offered to a turn — an impression recalls
  // ("have I met this") but has no words to hand the mouth (THE_IMPRESSION).
  const ranked = (r.ranked ?? []).filter((row) => row?.node?.text);
  return {
    kind: r.kind,
    top: r.top && r.top.node?.text ? shape(r.top) : null,
    passages: ranked.slice(0, Math.max(1, limit | 0)).map(shape),
    band: r.band ?? null,
  };
}
