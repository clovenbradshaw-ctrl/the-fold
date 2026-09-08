// reading-store.test.mjs — the OPFS persistence layer's own concurrency
// safety. Found live, 2026-09-08: a batched foreground priors sync (many
// sources reading at once, plus a fast-progressing single source's own
// successive ticks) produced "A requested file or directory could not be
// found", recurring for the SAME file across many progress ticks — a
// second createWritable() opened on a file the first had not yet closed,
// because appendReading/saveCursor are fired from the worker's message
// handler WITHOUT being awaited (deliberately: a slow write must never
// stall the next chunk). The fix is writeChains (reading-store.js): one
// writer per source name at a time, appendReading and saveCursor sharing
// it. This file proves that property against a fake OPFS that enforces
// the same exclusivity a real writable stream does — asserting the
// mutation would be CAUGHT (a second concurrent writable throws) before
// trusting that the fix prevents it, the discipline this repo's own
// review named: a mutation test that never actually exercises its own
// failure mode reports a false pass.
import test from "node:test";
import assert from "node:assert/strict";

/**
 * A minimal in-memory stand-in for the OPFS surface reading-store.js
 * actually calls (getDirectoryHandle, getFileHandle, getFile, createWritable,
 * seek, write, close, removeEntry) — enough to run its real code, not a
 * re-implementation of what it does. `createWritable` throws if a writable
 * for the SAME path is already open and not yet closed, which is exactly
 * the exclusivity a real OPFS writable stream enforces; a race here would
 * throw as a "SIMULATED CONCURRENT WRITABLE" error, not as the browser's
 * own "NotFoundError" wording, but the SHAPE of the bug — two writers open
 * on one file at once — is the same one live testing found.
 */
function makeFakeOPFS() {
  const files = new Map(); // path -> { text, openWritable }
  let concurrentWritableCount = 0;
  let maxConcurrentWritable = 0;

  const fileHandle = (path) => ({
    async getFile() {
      const f = files.get(path) ?? { text: "" };
      return { size: f.text.length, text: async () => f.text };
    },
    async createWritable(opts = {}) {
      const f = files.get(path) ?? { text: "", openWritable: false };
      if (f.openWritable) throw new Error(`SIMULATED CONCURRENT WRITABLE on ${path} — a second createWritable opened before the first closed`);
      f.openWritable = true;
      files.set(path, f);
      concurrentWritableCount++;
      maxConcurrentWritable = Math.max(maxConcurrentWritable, concurrentWritableCount);
      let buf = opts.keepExistingData ? f.text : "";
      let pos = buf.length;
      return {
        async seek(n) { pos = n; },
        async write(chunk) { buf = buf.slice(0, pos) + chunk; pos += chunk.length; },
        async close() {
          f.text = buf;
          f.openWritable = false;
          files.set(path, f);
          concurrentWritableCount--;
        },
      };
    },
  });

  const root = {
    async getFileHandle(name, opts = {}) {
      if (!files.has(name)) {
        if (!opts.create) { const e = new Error("NotFoundError"); e.name = "NotFoundError"; throw e; }
        files.set(name, { text: "", openWritable: false });
      }
      return fileHandle(name);
    },
    async getDirectoryHandle(_name, _opts) { return root; },
  };

  return {
    getDirectory: async () => root,
    stats: () => ({ maxConcurrentWritable }),
  };
}

// Node 21+ ships its own read-only `navigator` (a getter, not a plain
// property) — a bare assignment throws. reading-store.js only ever reads
// navigator.storage.getDirectory, lazily inside an async function, so
// replacing the whole global for the module's own use is enough.
function stubNavigatorStorage(fake) {
  Object.defineProperty(globalThis, "navigator", {
    value: { storage: { getDirectory: fake.getDirectory } },
    configurable: true,
  });
}

test("appendReading: many concurrent calls for the SAME source never open two writables at once", async () => {
  const fake = makeFakeOPFS();
  stubNavigatorStorage(fake);
  const mod = await import(`./reading-store.js?t=${Date.now()}-a`);

  const calls = Array.from({ length: 24 }, (_, i) => mod.appendReading("moby-dick.txt", [{ i, schema: "Encounter@1" }]));
  const results = await Promise.all(calls);

  assert.equal(results.filter((r) => r.error).length, 0, `expected zero errors, got: ${JSON.stringify(results.filter((r) => r.error))}`);
  assert.equal(fake.stats().maxConcurrentWritable, 1, "at most one writable should ever be open at once for one file");

  const entries = await mod.loadReading("moby-dick.txt");
  assert.equal(entries.length, 24, "every call's entry must land — none silently dropped by the race");
  assert.deepEqual(entries.map((e) => e.i).sort((a, b) => a - b), Array.from({ length: 24 }, (_, i) => i));
});

test("appendReading and saveCursor for the SAME source also serialize against each other", async () => {
  const fake = makeFakeOPFS();
  stubNavigatorStorage(fake);
  const mod = await import(`./reading-store.js?t=${Date.now()}-b`);

  const calls = [];
  for (let i = 0; i < 10; i++) {
    calls.push(mod.appendReading("dracula.txt", [{ i, schema: "Encounter@1" }]));
    calls.push(mod.saveCursor("dracula.txt", { cursor: i, sequence: i * 3 }));
  }
  await Promise.all(calls);

  assert.equal(fake.stats().maxConcurrentWritable, 1, "the .jsonl and .cursor.json writers for one name must not overlap either");
  const cursor = await mod.loadCursor("dracula.txt");
  assert.equal(cursor.cursor, 9, "the last-issued cursor write should be the one that lands");
});

test("SANITY: the fake OPFS itself throws on a genuine race (proves the assertion above is not vacuous)", async () => {
  const fake = makeFakeOPFS();
  const root = await fake.getDirectory();
  const h = await root.getFileHandle("unshared-write.txt", { create: true });
  const w1 = await h.createWritable({ keepExistingData: true });
  await assert.rejects(
    () => h.createWritable({ keepExistingData: true }),
    /SIMULATED CONCURRENT WRITABLE/,
    "a second concurrent createWritable on the same path must throw — otherwise this fake would never catch the bug the tests above guard against",
  );
  await w1.close();
});

test("two DIFFERENT source names read and write independently, unaffected by each other's serialization", async () => {
  const fake = makeFakeOPFS();
  stubNavigatorStorage(fake);
  const mod = await import(`./reading-store.js?t=${Date.now()}-c`);

  await Promise.all([
    mod.appendReading("a.txt", [{ i: 1 }]),
    mod.appendReading("b.txt", [{ i: 1 }]),
    mod.appendReading("a.txt", [{ i: 2 }]),
    mod.appendReading("b.txt", [{ i: 2 }]),
  ]);

  assert.equal((await mod.loadReading("a.txt")).length, 2);
  assert.equal((await mod.loadReading("b.txt")).length, 2);
});
