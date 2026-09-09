// record-store.js — OPFS persistence for the reading record (Pass 17, P98).
//
// The I/O half of record-log.js, on the same Origin Private File System
// sources-store.js already uses. One JSONL file per ledger under `records/`
// (`hyperlexicon.jsonl`, `grid.jsonl`, `meta.jsonl`), APPEND-ONLY: a sync
// writes only the entries whose seq is beyond what the file already holds,
// and nothing here ever truncates or rewrites — the record is the floor under
// every standing (FOLD-CONSTITUTION I.5) and deleting it is not an operation
// this module offers. `clearRecords()` exists for the person, not the app,
// and says so.

const RECORDS_DIR = "records";
// The PROMISE is cached, not the resolved handle — the same TOCTOU race,
// and the same fix, as reading-store.js's getRoot (see that file's note):
// several concurrent first-writers must share one in-flight directory
// creation, not each race their own.
let _rootPromise = null;

// Listeners on the record's own append (GFP Pass 33: the field is admitted
// from every line written here — field-store.js). A listener is told what
// was written, after it was written; it cannot change it.
const appendListeners = new Set();
export function onAppend(fn) { appendListeners.add(fn); return () => appendListeners.delete(fn); }
const notifyAppend = (name, lines) => { for (const fn of appendListeners) { try { fn(name, lines); } catch (err) { console.warn("record-store: append listener failed:", err?.message ?? err); } } };

async function getRoot() {
  if (!_rootPromise) {
    _rootPromise = (async () => {
      const top = await navigator.storage.getDirectory();
      return top.getDirectoryHandle(RECORDS_DIR, { create: true });
    })();
  }
  return _rootPromise;
}

const fileOf = (name) => `${String(name).replace(/[/\\:*?"<>|\x00-\x1f]/g, "_")}.jsonl`;

/** Every line of a record, in file order. Empty when there is none. */
export async function loadRecord(name) {
  try {
    const root = await getRoot();
    const handle = await root.getFileHandle(fileOf(name));
    const text = await (await handle.getFile()).text();
    return text.split("\n").filter((l) => l.trim());
  } catch { return []; }
}

/** How many lines the record holds — the seq the next append starts from. */
export async function recordLength(name) {
  return (await loadRecord(name)).length;
}

/**
 * Append lines. Seeks to the end of the existing file and writes only the
 * new bytes (keepExistingData), so a sync is O(new entries), never a rewrite.
 */
export async function appendRecord(name, lines) {
  if (!Array.isArray(lines) || !lines.length) return { appended: 0 };
  try {
    const root = await getRoot();
    const handle = await root.getFileHandle(fileOf(name), { create: true });
    const size = (await handle.getFile()).size;
    const writable = await handle.createWritable({ keepExistingData: true });
    await writable.seek(size);
    await writable.write((size ? "" : "") + lines.join("\n") + "\n");
    await writable.close();
    notifyAppend(name, lines);
    return { appended: lines.length };
  } catch (err) {
    console.warn(`record-store: append ${name} failed:`, err?.message ?? err);
    return { appended: 0, error: err?.message ?? String(err) };
  }
}

/** For the person only: forget the durable record. The app never calls this. */
export async function clearRecords() {
  const top = await navigator.storage.getDirectory();
  try { await top.removeEntry(RECORDS_DIR, { recursive: true }); } catch {}
  _rootPromise = null;
}
