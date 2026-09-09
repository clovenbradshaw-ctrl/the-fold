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
