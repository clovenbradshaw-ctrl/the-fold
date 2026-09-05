// sources-store.js — OPFS persistence for imported documents.
//
// Every source that passes through addSource() is written to the Origin
// Private File System so it survives a reload. On boot, loadSources()
// repopulates state.sources from OPFS. The store is append-on-add,
// delete-on-remove, with a single index file listing every source name
// and its metadata.

const SOURCES_DIR = "sources";
const INDEX_FILE = "index.json";

let _root = null;

async function getRoot() {
  if (_root) return _root;
  _root = await navigator.storage.getDirectory();
  try { _root = await _root.getDirectoryHandle(SOURCES_DIR, { create: true }); }
  catch { _root = await navigator.storage.getDirectory(); }
  return _root;
}

function sourceFileName(name) {
  // A file-safe name: replace path separators, control chars, and colons.
  return name.replace(/[/\\:*?"<>|\x00-\x1f]/g, "_");
}

async function readIndex() {
  try {
    const root = await getRoot();
    const handle = await root.getFileHandle(INDEX_FILE);
    const file = await handle.getFile();
    const text = await file.text();
    const idx = JSON.parse(text);
    if (idx && typeof idx === "object" && Array.isArray(idx.sources)) return idx.sources;
    return [];
  } catch { return []; }
}

async function writeIndex(entries) {
  const root = await getRoot();
  const handle = await root.getFileHandle(INDEX_FILE, { create: true });
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify({ sources: entries }, null, 2));
  await writable.close();
}

// ── public API ───────────────────────────────────────────────────────────────

/**
 * Persist a single source to OPFS. Called from addSource() in app.js.
 * The text is written as a plain .txt file alongside a metadata index.
 * `meta` is optional extra info (provenance, etc.) carried alongside.
 */
export async function persistSource(name, text, meta = {}) {
  try {
    const root = await getRoot();
    const fname = sourceFileName(name);
    const fileHandle = await root.getFileHandle(`${fname}.txt`, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(text);
    await writable.close();

    const entries = await readIndex();
    const existing = entries.findIndex((e) => e.name === name);
    // The source's content identity rides the index (Pass 17, P98): a record
    // whose addresses name this source can say which BYTES it named, and a
    // source re-added with different bytes is a different source by hash,
    // never silently the same one.
    let sha256 = null;
    try {
      const buf = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      sha256 = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch {}
    const entry = {
      name,
      fileName: `${fname}.txt`,
      size: text.length,
      sha256,
      addedAt: existing >= 0 ? entries[existing].addedAt : Date.now(),
      ...meta,
    };
    if (existing >= 0) entries[existing] = entry;
    else entries.push(entry);
    await writeIndex(entries);
  } catch (err) {
    console.warn("sources-store: persist failed:", err.message);
  }
}

/**
 * Remove a source from OPFS. Called from removeSource() in app.js.
 */
export async function unpersistSource(name) {
  try {
    const root = await getRoot();
    const entries = await readIndex();
    const entry = entries.find((e) => e.name === name);
    if (entry) {
      try { await root.removeEntry(entry.fileName); } catch {}
    }
    const next = entries.filter((e) => e.name !== name);
    await writeIndex(next);
  } catch (err) {
    console.warn("sources-store: unpersist failed:", err.message);
  }
}

/**
 * Load every persisted source from OPFS. Returns an array of
 * `{name, text, meta}` objects. Called once at boot.
 */
export async function loadSources() {
  const results = [];
  try {
    const entries = await readIndex();
    const root = await getRoot();
    for (const entry of entries) {
      try {
        const handle = await root.getFileHandle(entry.fileName);
        const file = await handle.getFile();
        const text = await file.text();
        if (text) results.push({ name: entry.name, text, meta: entry });
      } catch {
        // File gone from disk but index still lists it — skip, don't crash.
      }
    }
  } catch (err) {
    console.warn("sources-store: load failed:", err.message);
  }
  return results;
}
