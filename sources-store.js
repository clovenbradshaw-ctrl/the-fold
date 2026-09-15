// sources-store.js — OPFS persistence for imported documents.
//
// Every source that passes through addSource() is written to the Origin
// Private File System so it survives a reload. On boot, loadSources()
// repopulates state.sources from OPFS. The store is append-on-add,
// delete-on-remove, with a single index file listing every source name
// and its metadata.
//
// SESSION ISOLATION (added 2026-09-15, live-testing pass). `sources` is
// listed in app.js's own PER_WORKSPACE — "between workspaces there is no
// switch: that isolation is the definition" (CLAUDE.md, Workspaces) — but
// that promise was never implemented here: every source, from any
// workspace, in any TAB, was written into ONE flat, origin-wide directory
// with no notion of "whose" it was. Reproduced live: a source saved in one
// browser tab appeared, unasked, in a completely independent second tab's
// Sources panel the instant that second tab booted — no shared workspace,
// no shared conversation, nothing in common but the origin (the same
// failure shape a real person would hit by reopening the app days apart,
// or that a dev-server port reused by an unrelated later session would hit
// automatically). `record-store.js` already discloses the adjacent half of
// this ("a second tab or session on this same origin shares this OPFS
// store") for the reading ledgers — deliberately app-wide there, P178 says
// so in words — but nothing said sources shared it too, and PER_WORKSPACE
// says the opposite.
//
// Fixed by keying every NEW write to a per-TAB id, kept in sessionStorage —
// the one browser storage that is genuinely private to one tab (never
// shared with a second tab at the same origin) while still surviving a
// reload of that SAME tab, which is the one continuity this store has ever
// promised ("saved to survive a reload" said nothing about surviving into
// a DIFFERENT tab). Material saved before this fix shipped lives in the
// old flat layout; it is not deleted or hidden (nothing a person already
// attached should silently vanish out from under them), but it is never
// written to again, and every source read back from it is tagged
// `meta.legacy = true` so a caller can disclose it as shared, origin-wide,
// possibly-not-yours material rather than pretend it is this session's own.
// A name this session holds locally always wins over a same-named legacy
// entry. Going forward the legacy pool only ever shrinks (as sources are
// removed) — it cannot grow, so the leak this closes cannot recur through
// it.

const SOURCES_DIR = "sources";
const INDEX_FILE = "index.json";
const SESSION_KEY = "fold-session-ws-id";

// The PROMISE is cached, not the resolved handle — several sources
// attaching at once (a foreground priors sync, 2026-09-08) each called
// this before the first getDirectoryHandle resolved, every one seeing
// `_root` still null and racing its own concurrent {create:true} on the
// same not-yet-existing directory (the same bug, and the same fix, as
// reading-store.js's getRoot — see that file's own note).
let _rootPromise = null;

async function getRoot() {
  if (!_rootPromise) {
    _rootPromise = (async () => {
      const top = await navigator.storage.getDirectory();
      try { return await top.getDirectoryHandle(SOURCES_DIR, { create: true }); }
      catch { return top; }
    })();
  }
  return _rootPromise;
}

// This tab's own id — generated once, held in sessionStorage so a reload of
// THIS tab keeps seeing its own material but a different tab (even at the
// same origin, even opened one second later) never can. A cached module
// variable means one id per page load even if sessionStorage itself is
// unreachable (a private window, storage blocked) — the SAFE direction for
// a storage failure here is a fresh, empty, isolated id, never a shared one.
let _sessionIdCache = null;
function freshId() {
  return globalThis.crypto?.randomUUID?.() ?? `sid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function sessionId() {
  if (_sessionIdCache) return _sessionIdCache;
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) { id = freshId(); sessionStorage.setItem(SESSION_KEY, id); }
    _sessionIdCache = id;
  } catch {
    _sessionIdCache = freshId();
  }
  return _sessionIdCache;
}

let _sessionRootPromise = null;
async function getSessionRoot() {
  if (!_sessionRootPromise) {
    _sessionRootPromise = (async () => {
      const root = await getRoot();
      try { return await root.getDirectoryHandle(`session-${sessionId()}`, { create: true }); }
      // Degraded: a directory that cannot be created falls back to the
      // flat legacy layout rather than losing the write outright — the one
      // case this fix does not improve on the old behavior, never worse
      // than it.
      catch { return root; }
    })();
  }
  return _sessionRootPromise;
}

function sourceFileName(name) {
  // A file-safe name: replace path separators, control chars, and colons.
  return name.replace(/[/\\:*?"<>|\x00-\x1f]/g, "_");
}

async function readIndexAt(dirHandle) {
  try {
    const handle = await dirHandle.getFileHandle(INDEX_FILE);
    const file = await handle.getFile();
    const text = await file.text();
    const idx = JSON.parse(text);
    if (idx && typeof idx === "object" && Array.isArray(idx.sources)) return idx.sources;
    return [];
  } catch { return []; }
}

async function writeIndexAt(dirHandle, entries) {
  const handle = await dirHandle.getFileHandle(INDEX_FILE, { create: true });
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify({ sources: entries }, null, 2));
  await writable.close();
}

// ── public API ───────────────────────────────────────────────────────────────

/**
 * Persist a single source to OPFS, under THIS TAB's own session directory —
 * never the flat legacy one (see the file header). Called from addSource()
 * in app.js. The text is written as a plain .txt file alongside a metadata
 * index.
 * `meta` is optional extra info (provenance, etc.) carried alongside.
 */
export async function persistSource(name, text, meta = {}) {
  try {
    const dir = await getSessionRoot();
    const fname = sourceFileName(name);
    const fileHandle = await dir.getFileHandle(`${fname}.txt`, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(text);
    await writable.close();

    const entries = await readIndexAt(dir);
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
    // A rewrite KEEPS the row's other fields (the reading cursor and recipe,
    // P99) — a source re-persisted with the same bytes must not forget how
    // far it was read; a source whose bytes changed starts its reading over.
    const prior = existing >= 0 ? entries[existing] : null;
    const sameBytes = prior && prior.sha256 && prior.sha256 === sha256;
    const entry = {
      ...(sameBytes ? prior : {}),
      name,
      fileName: `${fname}.txt`,
      size: text.length,
      sha256,
      addedAt: prior ? prior.addedAt : Date.now(),
      ...meta,
    };
    if (existing >= 0) entries[existing] = entry;
    else entries.push(entry);
    await writeIndexAt(dir, entries);
  } catch (err) {
    console.warn("sources-store: persist failed:", err.message);
  }
}

/**
 * Remove a source from OPFS. Called from removeSource() in app.js. A name
 * may live in this session's own directory, the flat legacy one, or
 * (rare) both if a legacy name was re-saved locally — every copy under
 * this name is removed, so a deleted source cannot resurface as "legacy"
 * on the next boot.
 */
export async function unpersistSource(name) {
  try {
    const dirs = [await getSessionRoot(), await getRoot()];
    for (const dir of dirs) {
      const entries = await readIndexAt(dir);
      const entry = entries.find((e) => e.name === name);
      if (!entry) continue;
      try { await dir.removeEntry(entry.fileName); } catch {}
      const next = entries.filter((e) => e.name !== name);
      await writeIndexAt(dir, next);
    }
  } catch (err) {
    console.warn("sources-store: unpersist failed:", err.message);
  }
}

/**
 * Load every source available to THIS tab from OPFS: everything this
 * session has itself saved, plus (additively, never overwriting a local
 * name) whatever sits in the flat legacy store from before per-session
 * isolation existed or from a different session that shares this origin —
 * each legacy entry's meta carries `legacy: true` so a caller can disclose
 * it rather than present it as this session's own. Called once at boot.
 */
export async function loadSources() {
  const results = [];
  const seen = new Set();
  try {
    const dir = await getSessionRoot();
    const entries = await readIndexAt(dir);
    for (const entry of entries) {
      try {
        const handle = await dir.getFileHandle(entry.fileName);
        const file = await handle.getFile();
        const text = await file.text();
        if (text) { results.push({ name: entry.name, text, meta: entry }); seen.add(entry.name); }
      } catch {
        // File gone from disk but index still lists it — skip, don't crash.
      }
    }
  } catch (err) {
    console.warn("sources-store: load failed:", err.message);
  }
  try {
    const legacyRoot = await getRoot();
    const legacyEntries = await readIndexAt(legacyRoot);
    for (const entry of legacyEntries) {
      if (seen.has(entry.name)) continue;
      try {
        const handle = await legacyRoot.getFileHandle(entry.fileName);
        const file = await handle.getFile();
        const text = await file.text();
        if (text) results.push({ name: entry.name, text, meta: { ...entry, legacy: true } });
      } catch {
        // File gone from disk but index still lists it — skip, don't crash.
      }
    }
  } catch (err) {
    console.warn("sources-store: legacy load failed:", err.message);
  }
  return results;
}

/**
 * Update a source's index row without rewriting its bytes — the reading
 * cursor and recipe (Pass 18, P99) change often; the text does not. Writes
 * to whichever store (this session's own, or the flat legacy one) actually
 * holds the name — the same lookup unpersistSource uses.
 */
export async function updateSourceMeta(name, meta = {}) {
  try {
    const dirs = [await getSessionRoot(), await getRoot()];
    for (const dir of dirs) {
      const entries = await readIndexAt(dir);
      const i = entries.findIndex((e) => e.name === name);
      if (i < 0) continue;
      entries[i] = { ...entries[i], ...meta };
      await writeIndexAt(dir, entries);
      return true;
    }
    return false;
  } catch (err) {
    console.warn("sources-store: meta update failed:", err.message);
    return false;
  }
}
