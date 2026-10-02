// page-native-browser-safe.test.mjs — every native module the page's load graph enters must LINK in a browser (POLICIES.md P264; eoreader7 S138).
//
// WHAT WAS NOT BEING ASKED. page-graph.mjs walks what the page loads and types each edge that leaves this repo — the /engine-v7 mount, which is
// eoreader7's native tree — as `external`, and stops there: "another repo's bytes, governed by its own tests". constitution.test.mjs then checks
// that the page's OWN files name no bare specifier and no remote host, and that every mounted specifier is served from this disk. Nothing asked
// the one question that decides whether the page runs at all: does what the page ENTERS in that tree reach a node built-in when it loads?
// A browser refuses a whole module graph at link time on a single `node:fs`, and a node test can import `node:fs`, so on 2026-09-28 three
// node-only organs were re-exported through the organs seam and the page could not link for days; the same had happened to the seam three times
// before (see eoreader7's conformance/seam-browser-safe.test.mjs, which guards the seam itself).
//
// WHAT IS ASKED NOW. The entries are DERIVED, not listed: every external edge on the /engine-v7 mount of the real page graph, in either
// spelling the page uses (`/engine-v7/kernel/cube.js`, or `../eoreader7/native/organs/index.js`, which page-graph types as the same mount).
// Each is imported in one child process by eoreader7's shared harness (conformance/lib/seam-reach.mjs: a resolution hook that records every
// built-in and bare package the real resolver is asked for, and `process` removed from module code, as in a browser). This file owns the
// DERIVATION; the reading of "browser-safe" is eoreader7's, in one place.
//
// CONTROLS, BUILT TO FAIL. The chain — graph → entries → files → harness — is run on a synthetic page whose answer is known: a planted native
// module that imports `node:fs`, entered through a shim by a relative spelling, must be derived, mapped to its file, and named with its parent.
// A derivation that returned nothing would pass the real run vacuously, so the real run also asserts the entries are many and include the seam.
//
// NOT COVERED, SAID HERE: the legacy mounts (/engine, /nul — eoreader6's bytes, absent from some checkouts and governed by that repo); this
// repo's own page files, which cannot load in node (they touch the DOM) and are held by constitution.test.mjs (no bare specifier, no remote
// host); the Explore iframe, a separate document with its own graph (web.test.mjs); and an `import("node:…")` inside a function, which a
// browser never runs unless it is called.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { pageGraph, diskReader, MOUNTS } from "./page-graph.mjs";
import { reached, describeOffenders } from "../eoreader7/native/conformance/lib/seam-reach.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const V7 = MOUNTS.find((m) => m.prefix === "/engine-v7/");

/** The native modules a page graph enters, deduplicated: `{ spec, file, href }` for every external edge on the /engine-v7 mount, under `root`. */
function nativeEntries(graph, root) {
  const out = new Map();
  for (const e of graph.external) {
    if (e.mount !== V7.prefix) continue;
    const file = path.resolve(root, ...V7.root, e.spec.slice(V7.prefix.length).split(/[?#]/)[0]);
    if (!out.has(file)) out.set(file, { spec: e.spec, file, href: pathToFileURL(file).href });
  }
  return [...out.values()];
}

test("CONTROL — the derivation reads both spellings of the mount, through a shim, once each", () => {
  const sources = {
    "index.html": `<script type="module" src="app.js"></script>`,
    "app.js": `import { a } from "../eoreader7/native/organs/index.js";\nimport { b } from "/engine-v7/kernel/cube.js";\nimport "./shim.js";`,
    "shim.js": `export * from "../eoreader7/native/organs/asserted.js";`,
  };
  const g = pageGraph({ entry: "index.html", read: (p) => sources[p] ?? null });
  const got = nativeEntries(g, "/r/the-fold").map((e) => e.file).sort();
  assert.deepEqual(got, [
    "/r/eoreader7/native/kernel/cube.js",
    "/r/eoreader7/native/organs/asserted.js",
    "/r/eoreader7/native/organs/index.js",
  ]);
});

test("CONTROL BUILT TO FAIL — a node-only native module entered through a shim is derived, mapped to its file, and named with its parent", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "page-native-"));
  const native = path.join(tmp, "eoreader7", "native", "organs");
  fs.mkdirSync(native, { recursive: true });
  fs.writeFileSync(path.join(native, "planted.js"), `import { readFileSync } from "node:fs";\nexport const planted = typeof readFileSync;\n`);
  fs.writeFileSync(path.join(native, "fine.js"), `export const fine = 1;\n`);
  const sources = {
    "index.html": `<script type="module" src="app.js"></script>`,
    "app.js": `import "./shim.js";\nimport { fine } from "../eoreader7/native/organs/fine.js";`,
    "shim.js": `export * from "../eoreader7/native/organs/planted.js";`,
  };
  const g = pageGraph({ entry: "index.html", read: (p) => sources[p] ?? null });
  const entries = nativeEntries(g, path.join(tmp, "the-fold"));
  assert.equal(entries.length, 2);
  const r = reached(entries.map((e) => e.href));
  assert.deepEqual(r.failures, [], "both planted modules load in node; the finding is the specifier, not a crash");
  assert.deepEqual(describeOffenders(r.offenders).map((l) => l.replace(/ <- .*\/(planted\.js)$/, " <- $1")), ["node:fs (builtin) <- planted.js"]);
});

test("the real page enters many native modules, the organs seam among them, and every one is on disk", () => {
  const g = pageGraph({ entry: "index.html", read: diskReader(ROOT) });
  const entries = nativeEntries(g, ROOT);
  assert.ok(entries.length >= 20, `the derivation found ${entries.length} native entries; a page that imports an engine imports more than that`);
  assert.ok(entries.some((e) => e.spec.endsWith("organs/index.js")), "the organs seam is one of the page's entries");
  for (const e of entries) assert.ok(fs.existsSync(e.file), `${e.spec} is imported by the page but is not at ${e.file}`);
});

test("every native module the page enters links without a node built-in or a bare package, and loads without `process`", () => {
  const g = pageGraph({ entry: "index.html", read: diskReader(ROOT) });
  const entries = nativeEntries(g, ROOT);
  const r = reached(entries.map((e) => e.href));
  const lines = describeOffenders(r.offenders);
  assert.deepEqual(lines, [],
    `the page enters native code that reaches node-only imports at load, so a browser cannot link it:\n  ${lines.join("\n  ")}\n` +
    "Do not export the organ from the seam or forward it from a shim: import it by path from the server-side caller (eoreader7 READING-SPEC.md S138).");
  assert.deepEqual(r.failures, [], "each entry must also load in a context with no `process`, as a browser has none");
});
