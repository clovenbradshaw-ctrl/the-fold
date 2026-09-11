// field-of-record.js — GFP Pass 33: the field, DERIVED from the record and
// the sources. Pure; the OPFS half is field-store.js, the page crossings
// are named there.
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
import { Field, tokensOf, isWord } from "./relative.js";

/** GFP Pass 35: how many recalled passages a turn will offer beside lexical retrieval.
 * Declared, not measured (2026-09-11, set by hand for the turn seat): a structural
 * budget — a cap on what the field may add to a turn's passages, never a cut against
 * the material. GFP Pass 36 measures the field at scale; the offer cap is a giver-
 * named convention until a measurement replaces it. */
export const FIELD_OFFER_MAX = 2;

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

/** A passage from the reader loop: its bytes, its ground address, its source. */
export function admitPassage(field, passage, { source = passage?.source ?? null } = {}) {
  const text = String(passage?.text ?? "");
  if (!text.trim()) return null;
  return field.admit(text, { source, at: passage?.ref ?? null });
}

/** A ledger entry: its text, addressed by the record it sits in and its seq there. */
export function admitEntry(field, entry, { record = null, seq = entry?.seq ?? null } = {}) {
  const text = textOfEntry(entry);
  if (!text) return null;
  return field.admit(text, { record, at: seq != null ? `${record}@${seq}` : null, kind: entry?.kind ?? entry?.event ?? entry?.schema ?? null });
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

/** The rows for nodes admitted at or after `from` — predecessors by signature, no positions, no `next`. */
export function rowsSince(field, from = 0) {
  return field.nodes.slice(Math.max(0, from | 0)).map((n) => ({ text: n.text, payload: n.payload ?? null, signature: n.signature, prev: [...n.prev].map(([m, w]) => [m.signature, w]) }));
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
  const full = rows.map((r) => ({ text: r.text, payload: r.payload ?? null, signature: r.signature, prev: r.prev ?? [], next: next.get(r.signature) ?? [] }));
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
  return {
    kind: r.kind,
    top: r.top ? shape(r.top) : null,
    passages: (r.ranked ?? []).slice(0, Math.max(1, limit | 0)).map(shape),
    band: r.band ?? null,
  };
}
