// sources-store.test.mjs — per-tab session isolation for OPFS-persisted
// sources.
//
// Live finding (2026-09-15): a source saved in one browser tab showed up,
// unasked, in a completely independent second tab's Sources panel the
// instant that tab booted — proven directly against this repo's own dev
// server on a brand-new, never-before-used port (no reload, no shared
// conversation, no shared workspace; nothing in common but the origin).
// `sources` is listed in app.js's own PER_WORKSPACE, and CLAUDE.md's
// Workspaces section says isolation between workspaces "is the
// definition" — but sources-store.js wrote every source into one flat,
// origin-wide OPFS directory with no notion of which tab or workspace
// saved it, so a reload (or a second tab, or a dev-server port some
// unrelated earlier session happened to reuse) pooled everything ever
// saved at that origin into whatever workspace booted next.
//
// This file proves the fix directly against a fake OPFS that genuinely
// supports nested directories (so two different session subdirectories are
// provably separate stores, not just separate index rows in one shared
// file) plus a fake sessionStorage (the one browser storage that is
// private to a single tab, never shared with a second tab at the same
// origin, while still surviving a reload of that SAME tab).
import test from "node:test";
import assert from "node:assert/strict";

/**
 * A minimal in-memory OPFS stand-in with REAL nested directories — each
 * `getDirectoryHandle` call returns a handle backed by its OWN files map,
 * distinct from its parent's and from any sibling's. Good enough to run
 * sources-store.js's actual code, not a re-implementation of what it does.
 */
function makeFakeOPFS() {
  let nextId = 0;
  const dirs = new Map(); // id -> { files: Map<name,{text}>, subdirs: Map<name,id> }
  function newDir() { const id = nextId++; dirs.set(id, { files: new Map(), subdirs: new Map() }); return id; }
  const rootId = newDir();

  function fileHandleFor(dirId, name) {
    return {
      async getFile() {
        const f = dirs.get(dirId).files.get(name) ?? { text: "" };
        return { size: f.text.length, text: async () => f.text };
      },
      async createWritable() {
        let buf = "";
        return {
          async write(chunk) { buf += chunk; },
          async close() { dirs.get(dirId).files.set(name, { text: buf }); },
        };
      },
    };
  }
  function dirHandle(id) {
    return {
      async getDirectoryHandle(name, opts = {}) {
        const d = dirs.get(id);
        if (!d.subdirs.has(name)) {
          if (!opts.create) { const e = new Error("NotFoundError"); e.name = "NotFoundError"; throw e; }
          d.subdirs.set(name, newDir());
        }
        return dirHandle(d.subdirs.get(name));
      },
      async getFileHandle(name, opts = {}) {
        const d = dirs.get(id);
        if (!d.files.has(name)) {
          if (!opts.create) { const e = new Error("NotFoundError"); e.name = "NotFoundError"; throw e; }
          d.files.set(name, { text: "" });
        }
        return fileHandleFor(id, name);
      },
      async removeEntry(name) { dirs.get(id).files.delete(name); },
    };
  }
  return { getDirectory: async () => dirHandle(rootId) };
}

function stubNavigatorStorage(fake) {
  Object.defineProperty(globalThis, "navigator", { value: { storage: { getDirectory: fake.getDirectory } }, configurable: true });
}

/** A fake sessionStorage seeded with a fixed tab id — "no id yet" when
 * `id` is omitted, so the module mints and stores its own (the real
 * first-boot path). */
function stubSessionStorage(id) {
  const store = new Map();
  if (id) store.set("fold-session-ws-id", id);
  Object.defineProperty(globalThis, "sessionStorage", {
    value: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, v); },
    },
    configurable: true,
  });
  return store;
}

test("two DIFFERENT tabs (different sessionStorage) sharing one origin never see each other's sources", async () => {
  const fake = makeFakeOPFS();

  stubNavigatorStorage(fake);
  stubSessionStorage("tab-A");
  const modA = await import(`./sources-store.js?t=${Date.now()}-a`);
  await modA.persistSource("secret-to-A", "only tab A saved this", {});

  stubNavigatorStorage(fake);
  stubSessionStorage("tab-B");
  const modB = await import(`./sources-store.js?t=${Date.now()}-b`);
  const bSees = await modB.loadSources();

  assert.equal(bSees.find((s) => s.name === "secret-to-A"), undefined, "tab B must not inherit tab A's own source — that is the live bleed this closes");
});

test("the SAME tab id (a reload) still sees its own previously-saved source", async () => {
  const fake = makeFakeOPFS();

  stubNavigatorStorage(fake);
  stubSessionStorage("tab-A");
  const boot1 = await import(`./sources-store.js?t=${Date.now()}-c`);
  await boot1.persistSource("continuity-check", "saved before the reload", {});

  // A "reload" of the same tab: fresh module instance, SAME fake OPFS, SAME
  // sessionStorage id (sessionStorage itself would survive a real reload).
  stubNavigatorStorage(fake);
  stubSessionStorage("tab-A");
  const boot2 = await import(`./sources-store.js?t=${Date.now()}-d`);
  const reseen = await boot2.loadSources();

  const found = reseen.find((s) => s.name === "continuity-check");
  assert.ok(found, "a reload of the SAME tab must still see what it saved before — this is the continuity the store has always promised");
  assert.equal(found.text, "saved before the reload");
  assert.equal(found.meta.legacy, undefined, "this session's own source must never be tagged legacy");
});

test("pre-existing flat legacy sources are still visible to a brand-new tab, tagged legacy — nothing already attached vanishes", async () => {
  const fake = makeFakeOPFS();

  // Simulate a source saved under the OLD, pre-fix flat layout by writing
  // directly at the OPFS root's own index/file, bypassing session scoping
  // entirely — exactly what the store's on-disk shape was before this fix.
  const root = await fake.getDirectory();
  const sourcesRoot = await root.getDirectoryHandle("sources", { create: true });
  const fh = await sourcesRoot.getFileHandle("old-report.txt.txt", { create: true });
  const w = await fh.createWritable();
  await w.write("a source saved before per-tab isolation existed");
  await w.close();
  const idx = await sourcesRoot.getFileHandle("index.json", { create: true });
  const iw = await idx.createWritable();
  await iw.write(JSON.stringify({ sources: [{ name: "old-report.txt", fileName: "old-report.txt.txt", size: 10, addedAt: 1 }] }));
  await iw.close();

  stubNavigatorStorage(fake);
  stubSessionStorage("tab-fresh");
  const mod = await import(`./sources-store.js?t=${Date.now()}-e`);
  const seen = await mod.loadSources();

  const legacy = seen.find((s) => s.name === "old-report.txt");
  assert.ok(legacy, "a brand-new tab must still be able to read material saved before this fix — nothing already attached silently disappears");
  assert.equal(legacy.meta.legacy, true, "material from the flat pre-fix store must be tagged legacy so a caller can disclose it rather than claim it as this session's own");
});

test("a session-local source shadows a same-named legacy entry, and a NEW source never lands in the legacy store", async () => {
  const fake = makeFakeOPFS();
  const root = await fake.getDirectory();
  const sourcesRoot = await root.getDirectoryHandle("sources", { create: true });
  const fh = await sourcesRoot.getFileHandle("shared-name.txt.txt", { create: true });
  const w = await fh.createWritable();
  await w.write("legacy version");
  await w.close();
  const idx = await sourcesRoot.getFileHandle("index.json", { create: true });
  const iw = await idx.createWritable();
  await iw.write(JSON.stringify({ sources: [{ name: "shared-name.txt", fileName: "shared-name.txt.txt", size: 14, addedAt: 1 }] }));
  await iw.close();

  stubNavigatorStorage(fake);
  stubSessionStorage("tab-shadow");
  const mod = await import(`./sources-store.js?t=${Date.now()}-f`);
  await mod.persistSource("shared-name.txt", "local version", {});
  await mod.persistSource("brand-new-source", "never touches the legacy store", {});

  const seen = await mod.loadSources();
  const shared = seen.find((s) => s.name === "shared-name.txt");
  assert.equal(shared.text, "local version", "a locally-saved name must win over a same-named legacy entry");
  assert.notEqual(shared.meta.legacy, true, "the shadowing local copy must not itself be tagged legacy");
  assert.equal(seen.filter((s) => s.name === "shared-name.txt").length, 1, "the name must appear once, not duplicated");

  // The legacy store itself must be untouched by the new, unrelated source.
  const legacyEntries = JSON.parse(await (await (await sourcesRoot.getFileHandle("index.json")).getFile()).text());
  assert.equal(legacyEntries.sources.some((e) => e.name === "brand-new-source"), false, "a source saved after this fix must never land in the flat legacy store — that is how the leak this closes cannot recur");
});

test("unpersistSource removes a legacy-loaded source too, so it cannot resurface after deletion", async () => {
  const fake = makeFakeOPFS();
  const root = await fake.getDirectory();
  const sourcesRoot = await root.getDirectoryHandle("sources", { create: true });
  const fh = await sourcesRoot.getFileHandle("to-delete.txt.txt", { create: true });
  const w = await fh.createWritable();
  await w.write("delete me");
  await w.close();
  const idx = await sourcesRoot.getFileHandle("index.json", { create: true });
  const iw = await idx.createWritable();
  await iw.write(JSON.stringify({ sources: [{ name: "to-delete.txt", fileName: "to-delete.txt.txt", size: 9, addedAt: 1 }] }));
  await iw.close();

  stubNavigatorStorage(fake);
  stubSessionStorage("tab-deleter");
  const mod = await import(`./sources-store.js?t=${Date.now()}-g`);
  let seen = await mod.loadSources();
  assert.ok(seen.find((s) => s.name === "to-delete.txt"), "sanity: the legacy source is visible before deletion");

  await mod.unpersistSource("to-delete.txt");
  seen = await mod.loadSources();
  assert.equal(seen.find((s) => s.name === "to-delete.txt"), undefined, "a deleted legacy source must not resurface");
});
