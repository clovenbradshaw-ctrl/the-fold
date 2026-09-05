// build-site.test.mjs — the static build's assay (deploy/build-site.mjs) (P118): the mount
// specifiers a server maps in dev are rewritten to relative paths from each
// file's own place, nothing else is touched, the plan is derived from the
// page graph, and a real --no-vendor build carries every page file with no
// mount specifier left and every mount tree beside it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rewriteMounts, planSite, extensionManifest, build, MOUNT_TARGETS } from "./deploy/build-site.mjs";
import { pageGraph, diskReader } from "./page-graph.mjs";

test("rewriteMounts: every mount prefix becomes a relative path from the file's depth; /api and relative imports are untouched", () => {
  const src = `import a from "/engine-v7/organs/index.js";\nimport b from '/engine/emergence/tiers.js';\nconst c = "/nul/index.js";\nconst d = \`/node_modules/pyodide/\`;\nfetch("/api/run");\nimport e from "../eoreader7/native/x.js";\nconst f = "/priors-data/pos-prior-eng.json";`;
  const d1 = rewriteMounts(src, 1);
  assert.match(d1, /from "\.\.\/eoreader7\/native\/organs\/index\.js"/);
  assert.match(d1, /from '\.\.\/eoreader7\/legacy-eoreader6\.1\/packages\/engine\/emergence\/tiers\.js'/);
  assert.match(d1, /"\.\.\/eoreader7\/legacy-eoreader6\.1\/nul\/index\.js"/);
  assert.match(d1, /`\.\.\/node_modules\/pyodide\/`/);
  assert.match(d1, /"\.\.\/the-fold\/priors-data\/pos-prior-eng\.json"/);
  assert.match(d1, /fetch\("\/api\/run"\)/, "/api is not a mount and stays absolute");
  assert.match(d1, /from "\.\.\/eoreader7\/native\/x\.js"/, "an already-relative import is untouched");
  const d2 = rewriteMounts(src, 2);
  assert.match(d2, /from "\.\.\/\.\.\/eoreader7\/native\/organs\/index\.js"/);
  for (const p of Object.keys(MOUNT_TARGETS)) assert.ok(!d1.includes(`"${p}`) && !d1.includes(`'${p}`), `${p} left in the output`);
});

test("planSite: derived from the page graph — the page's own files, the mounts it reaches, the vendored packages it loads", () => {
  const g = pageGraph({ entry: "index.html", read: diskReader(new URL(".", import.meta.url).pathname) });
  const plan = planSite(g);
  assert.ok(plan.own.includes("index.html") && plan.own.includes("app.js") && plan.own.includes("webllm-worker.js"));
  assert.ok(plan.own.length > 50);
  assert.deepEqual([...plan.mounts].sort(), ["/engine-v7/", "/engine/", "/nul/"]);
  for (const p of ["@mlc-ai/web-llm", "pyodide", "monaco-editor", "katex", "mathjs", "sql.js"]) assert.ok(plan.vendored.includes(p), `${p} is a vendored load`);
});

test("extensionManifest: MV3, wasm allowed, the local servers and the two weights hosts as host permissions, a version the store accepts", () => {
  const m = extensionManifest({ version: "0.1.0" });
  assert.equal(m.manifest_version, 3);
  assert.match(m.content_security_policy.extension_pages, /'wasm-unsafe-eval'/);
  assert.ok(m.host_permissions.includes("http://localhost:11434/*") && m.host_permissions.includes("http://localhost:8812/*"));
  assert.ok(m.host_permissions.some((h) => /huggingface/.test(h)) && m.host_permissions.some((h) => /archive\.org/.test(h)));
  assert.equal(extensionManifest({ version: "1.2.3-beta" }).version, "1.2.3");
});

test("a real --no-vendor build: every page file present, no mount specifier left anywhere under the-fold/, every mount tree beside it, the root lands on the page, the sums cover every file", async () => {
  const out = mkdtempSync(join(tmpdir(), "fold-site-"));
  try {
    const rec = await build({ out, models: "none", mirror: "https://archive.org/download/the-fold-pin/models", extension: true, vendor: false });
    assert.ok(rec.files > 200);
    assert.ok(existsSync(join(out, "the-fold", "index.html")) && existsSync(join(out, "the-fold", "app.js")) && existsSync(join(out, "the-fold", "term-py-worker.mjs")));
    for (const tree of ["eoreader7/native/organs/index.js", "eoreader7/native/kernel/notes.js", "eoreader7/legacy-eoreader6.1/packages/engine/emergence/tiers.js", "eoreader7/legacy-eoreader6.1/nul/index.js"]) assert.ok(existsSync(join(out, tree)), `${tree} carried`);
    const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
    const left = walk(join(out, "the-fold")).filter((p) => /\.(js|mjs|html|css)$/.test(p)).filter((p) => { const s = readFileSync(p, "utf8"); return Object.keys(MOUNT_TARGETS).some((m) => s.includes(`"${m}`) || s.includes(`'${m}`) || s.includes(`\`${m}`)); });
    assert.deepEqual(left.map((p) => p.slice(out.length)), []);
    assert.match(readFileSync(join(out, "index.html"), "utf8"), /url=the-fold\/index\.html/);
    const mirrors = JSON.parse(readFileSync(join(out, "the-fold", "models", "MIRRORS.json"), "utf8")).mirrors;
    assert.deepEqual(mirrors, ["https://archive.org/download/the-fold-pin/models/"]);
    assert.ok(existsSync(join(out, "manifest.json")) && existsSync(join(out, "background.js")));
    const sums = readFileSync(join(out, "SHA256SUMS"), "utf8").trim().split("\n");
    assert.equal(sums.length, rec.files);
    assert.ok(sums.every((l) => /^[0-9a-f]{64}  \S/.test(l)));
    assert.ok(!existsSync(join(out, "the-fold", "serve.mjs")), "the server is not part of the page");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
