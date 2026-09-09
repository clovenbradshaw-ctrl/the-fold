// field-store.js — GFP Pass 33: the field's OPFS half, beside the records.
//
// One JSONL file under `field/`, APPEND-ONLY like record-store.js: a sync
// writes only the rows for nodes admitted since the last sync, and nothing
// here rewrites. The rows carry no positions (field-of-record.js), so the
// file's order is a convenience, never an address. The field is DERIVED:
// clearing it loses nothing — `bootField` rebuilds from the file, and the
// file itself can be rebuilt from the records and the sources.
//
// Crossings, named: OPFS (navigator.storage) — browser only; the record
// store's own append (record-store.js::onAppend) — every appended record
// line that carries text is admitted the moment it is written; the reader
// loop — the page hands `getField()` to readOnArrival's `field`.
import { Field } from "./relative.js";
import { admitRecordLines, rowsSince, fieldFromRows } from "./field-of-record.js";
import { onAppend } from "./record-store.js";

const FIELD_DIR = "field";
const FILE = "field.jsonl";
let _root = null;
async function getRoot() {
  if (_root) return _root;
  const top = await navigator.storage.getDirectory();
  _root = await top.getDirectoryHandle(FIELD_DIR, { create: true });
  return _root;
}

/** Every row in the store, in file order (a convenience, not an address). */
export async function loadFieldRows() {
  try {
    const root = await getRoot();
    const handle = await root.getFileHandle(FILE);
    const text = await (await handle.getFile()).text();
    return text.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
  } catch { return []; }
}

/** Append rows; O(new rows), never a rewrite. */
export async function appendFieldRows(rows) {
  if (!Array.isArray(rows) || !rows.length) return { appended: 0 };
  try {
    const root = await getRoot();
    const handle = await root.getFileHandle(FILE, { create: true });
    const size = (await handle.getFile()).size;
    const writable = await handle.createWritable({ keepExistingData: true });
    await writable.seek(size);
    await writable.write(rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
    await writable.close();
    return { appended: rows.length };
  } catch (err) {
    console.warn(`field-store: append failed:`, err?.message ?? err);
    return { appended: 0, error: err?.message ?? String(err) };
  }
}

/** For the person only: forget the derived field. It is rebuilt from the records and the sources. */
export async function clearField() {
  const top = await navigator.storage.getDirectory();
  try { await top.removeEntry(FIELD_DIR, { recursive: true }); } catch {}
  _root = null; _field = null; _synced = 0;
}

let _field = null;
let _synced = 0; // nodes already in the file
/** The live field, or null before boot. */
export function getField() { return _field; }
/** Rebuild the field from the store; the app calls this once, with the records. */
export async function bootField(opts) {
  const rows = await loadFieldRows();
  _field = fieldFromRows(rows, opts);
  _synced = _field.size;
  return _field;
}
/** Write the rows for nodes admitted since the last sync. */
export async function syncField() {
  if (!_field || _field.size <= _synced) return { appended: 0 };
  const rows = rowsSince(_field, _synced);
  const r = await appendFieldRows(rows);
  if (r.appended) _synced += r.appended;
  return r;
}
/** Admit a record's appended lines — the record's own door (record-store.js::onAppend). */
export function admitAppended(name, lines, { seqFrom = null } = {}) {
  if (!_field) return 0;
  return admitRecordLines(_field, name, lines, { seqFrom });
}
// The second door, registered once: every record line that carries text
// enters the field as it is written, then the field is synced beside it.
onAppend((name, lines) => { if (admitAppended(name, lines)) syncField().catch(() => {}); });
