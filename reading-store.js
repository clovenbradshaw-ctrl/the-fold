// reading-store.js — OPFS persistence for the constitutional reader's log
// (item 2 of the 2026-09-08 product review: "the page still runs the
// presence index at the turn" — THE-HOLOGRAPH §7's disclosed, owed step).
// Same discipline as record-store.js: one JSONL file per source under
// `readings/`, APPEND-ONLY, keyed by source name the way the ledger
// (record-store.js) and the sources themselves (sources-store.js) already
// are. Mirrors eoreader7's own `results/readings/<corpusId>-<assembly>.jsonl`
// (native/eval/the-fold/conversation.mjs), one reading per source rather
// than per corpus because the page admits sources one at a time and each
// keeps its own cursor and recipe (read-on-arrival.js).

const READINGS_DIR = "readings";
// The PROMISE is cached, not the resolved handle: caching only the value
// left a TOCTOU race when several sources start reading at once (a
// foreground priors sync, batched — 2026-09-08) — every call arriving
// before the first `getDirectoryHandle` resolves still saw `_root` as
// null, so each raced its own concurrent {create:true} on the SAME
// not-yet-existing directory. Measured live: "A requested file or
// directory could not be found" from appendReading, on the corpus's own
// first-ever writes. One in-flight creation, awaited by every caller.
let _rootPromise = null;

async function getRoot() {
  if (!_rootPromise) {
    _rootPromise = (async () => {
      const top = await navigator.storage.getDirectory();
      return top.getDirectoryHandle(READINGS_DIR, { create: true });
    })();
  }
  return _rootPromise;
}

const fileOf = (name) => `${String(name).replace(/[/\\:*?"<>|\x00-\x1f]/g, "_")}.jsonl`;

/** Every log entry for a source's constitutional reading, in file order. Empty when there is none. */
export async function loadReading(name) {
  try {
    const root = await getRoot();
    const handle = await root.getFileHandle(fileOf(name));
    const text = await (await handle.getFile()).text();
    return text.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
  } catch { return []; }
}

// ONE writer per source name at a time — appendReading and saveCursor both
// serialize through this, never just against themselves. The caller
// (reading-client.js's worker message handler) fires both per progress
// tick WITHOUT awaiting them — deliberately, so a slow write never stalls
// the next chunk — which means nothing upstream stops two ticks for the
// SAME source from reaching here close together. Measured live,
// 2026-09-08 (a batched foreground priors sync, several sources reading
// at once): "A requested file or directory could not be found", recurring
// for the SAME file across many ticks — a second createWritable() opened
// on a file the first had not yet closed. `getRoot()`'s own promise-cache
// fix (above) closed a real but DIFFERENT race, at startup only; this one
// recurs for the life of a fast-progressing read and needed its own fix.
const writeChains = new Map(); // name -> tail promise, always settled (never rejects), so one file's failure never blocks its own next write
function serialized(name, fn) {
  const tail = writeChains.get(name) ?? Promise.resolve();
  const run = tail.then(fn, fn);
  writeChains.set(name, run.then(() => {}, () => {}));
  return run;
}

/** Append log entries (raw objects). Same seek-and-write-new-bytes discipline as record-store.js — a sync is O(new entries), never a rewrite. Serialized per name (see writeChains above) against both this and saveCursor. */
export async function appendReading(name, entries) {
  if (!Array.isArray(entries) || !entries.length) return { appended: 0 };
  return serialized(name, async () => {
    try {
      const root = await getRoot();
      const handle = await root.getFileHandle(fileOf(name), { create: true });
      const size = (await handle.getFile()).size;
      const writable = await handle.createWritable({ keepExistingData: true });
      await writable.seek(size);
      await writable.write(entries.map((e) => JSON.stringify(e)).join("\n") + "\n");
      await writable.close();
      return { appended: entries.length };
    } catch (err) {
      console.warn(`reading-store: append ${name} failed:`, err?.message ?? err);
      return { appended: 0, error: err?.message ?? String(err) };
    }
  });
}

// The cursor is NOT derivable from the log: `cursor` counts CHUNKS
// (paragraphs) admitted, `sequence` counts ENCOUNTERS (sentences) emitted —
// a chunk holds many sentences, so the two grow at different rates and
// conflating them was caught in review before it shipped (see the-fold
// git history for this file's own first draft). Mirrors eoreader7's
// conversation.mjs `${READING_PATH}.cursor` sidecar exactly, one file per
// source instead of per corpus.
const cursorFileOf = (name) => `${String(name).replace(/[/\\:*?"<>|\x00-\x1f]/g, "_")}.cursor.json`;

/** {cursor, sequence, posPriorSource} for a source's reading, or null if it has never been read. */
export async function loadCursor(name) {
  try {
    const root = await getRoot();
    const handle = await root.getFileHandle(cursorFileOf(name));
    return JSON.parse(await (await handle.getFile()).text());
  } catch { return null; }
}

// posPriorSource travels in this same sidecar, not just an in-memory
// variable: a resumed read (cursor already at total) never re-contacts the
// worker, so without persisting this here, manifest() would report "not
// fetched" on every reload of a fully-read source — true of THIS page
// load's own fetch, false of the reading actually in use. Optional and
// additive: a sidecar written before this field existed loads fine, with
// posPriorSource simply undefined. Shares appendReading's writeChains queue
// (keyed by the same `name`, a different file underneath) rather than its
// own: the caller always appends the log then saves the cursor for one
// tick, and running strictly in that order — never a cursor write racing
// ahead of the log bytes it describes — is the crash-consistent one to
// enforce even though the two files don't collide at the OS level.
export async function saveCursor(name, { cursor, sequence, posPriorSource = undefined }) {
  return serialized(name, async () => {
    try {
      const root = await getRoot();
      const handle = await root.getFileHandle(cursorFileOf(name), { create: true });
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify({ cursor, sequence, ...(posPriorSource ? { posPriorSource } : {}) }));
      await writable.close();
    } catch (err) { console.warn(`reading-store: saveCursor ${name} failed:`, err?.message ?? err); }
  });
}

/** For the person only: forget every persisted constitutional reading. The app never calls this. */
export async function clearReadings() {
  const top = await navigator.storage.getDirectory();
  try { await top.removeEntry(READINGS_DIR, { recursive: true }); } catch {}
  _rootPromise = null;
}
