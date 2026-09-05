// deploy/build-site.mjs — one static build of the page, for every home it has.
//
//   node deploy/build-site.mjs                      → dist/ (site; no weights)
//   node deploy/build-site.mjs --models link        → dist/ with models/ linked from this checkout (local testing)
//   node deploy/build-site.mjs --models copy        → dist/ with the mirrored weights copied in (an archive.org pin)
//   node deploy/build-site.mjs --mirror https://archive.org/download/<item>/models
//                                                   → dist/ that names a weights mirror the page tries before the publisher
//   node deploy/build-site.mjs --extension          → dist/ that is also a Chrome (MV3) extension: manifest.json + background.js
//   node deploy/build-site.mjs --out _site --no-vendor   (the Pages workflow, and the test, use these)
//
// THE PROBLEM THIS SOLVES (2026-09-05). The page runs in three homes — a
// terminal (`./fold`: serve.mjs + explore-server.mjs on localhost), GitHub
// Pages (a static host under a /the-fold/ subpath), and a browser extension
// (a chrome-extension:// origin) — and in dev it reaches its engine through
// server MOUNT POINTS: root-absolute specifiers like "/engine-v7/…",
// "/engine/…", "/nul/…" and "/node_modules/…" that serve.mjs maps onto
// sibling directories at request time. A static host has no server to do
// that mapping, and a subpath or an extension origin has no root of ours,
// so every one of those imports 404s and the page dies at import time. The
// Pages workflow used to sed those into "/the-fold/…" — right for exactly
// one subpath on one host, and it still checked out the OLD engine repo.
//
// This build makes the page ROOT-INDEPENDENT: it lays the repos out as the
// siblings they already are (dist/the-fold, dist/eoreader7, dist/node_modules),
// which keeps every relative import in every repo valid as written, and
// rewrites only the mount-point specifiers into relative paths from each
// file's own place. Nothing else in the code changes; serve.mjs keeps
// serving the same files from the same mounts in dev.
//
// What the build carries is DERIVED, not listed: page-graph.mjs walks what
// index.html actually loads (86 first-party files today) and names the
// mount and vendored edges; the engine trees are copied whole minus their
// tests, evals and docs (another repo's bytes, governed by its own tests).
//
// `/api/*` is left untouched on purpose: there is no server on a static
// host, and those calls must keep failing visibly (typed gaps in the page,
// routes.js's report at boot) rather than be pointed somewhere that lies.
//
// Pure parts (rewriteMounts, planSite, extensionManifest) are exported for
// deploy/build-site.test.mjs; the copying is at the bottom.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync, createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { pageGraph, diskReader, MOUNTS, VENDOR } from "../page-graph.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SIBLINGS = resolve(ROOT, "..");

/** Where each mount lives in the sibling layout, relative to the dist root. */
export const MOUNT_TARGETS = Object.freeze({
  "/engine-v7/": "eoreader7/native/",
  "/engine/": "eoreader7/legacy-eoreader6.1/packages/engine/",
  "/nul/": "eoreader7/legacy-eoreader6.1/nul/",
  "/node_modules/": "node_modules/",
  "/priors-data/": "the-fold/priors-data/",
});

/**
 * Rewrite every mount-point specifier in `src` into a path relative to the
 * dist root from a file `depth` directories below it (the-fold/app.js is
 * depth 1; the-fold/explore/explore.js is depth 2). Only quoted string
 * literals that BEGIN with a mount prefix are touched — "/api/…" is not a
 * mount and is left alone by construction (it is not in MOUNT_TARGETS).
 */
export function rewriteMounts(src, depth) {
  const up = "../".repeat(depth);
  let out = String(src);
  for (const [prefix, target] of Object.entries(MOUNT_TARGETS)) {
    const re = new RegExp(`(["'\`])${prefix.replace(/[/]/g, "\\/")}`, "g");
    out = out.replace(re, (_, q) => `${q}${up}${target}`);
  }
  return out;
}

/** The files the page loads, grouped by where they come from — the plan. */
export function planSite(graph) {
  const own = graph.files.filter((f) => !f.startsWith("../"));
  const vendored = [...new Set(graph.vendored.map((e) => packageOf(e.spec)))].filter(Boolean);
  const mounts = [...new Set(graph.external.map((e) => MOUNTS.find((m) => e.spec.startsWith(m.prefix))?.prefix).filter(Boolean))];
  return { own, vendored, mounts };
}
const packageOf = (spec) => {
  const p = String(spec).replace(/^\/node_modules\//, "").split("/");
  return p[0]?.startsWith("@") ? `${p[0]}/${p[1]}` : p[0];
};

/** A Chrome MV3 manifest for the same dist: the action opens the page in a
 * tab; host permissions name the local servers and the two weights hosts
 * the rung may reach when the site itself carries no mirror. */
export function extensionManifest({ version, name = "The Fold" } = {}) {
  return {
    manifest_version: 3,
    name,
    version: String(version ?? "0.1.0").replace(/[^0-9.]/g, "") || "0.1.0",
    description: "A reading that runs for months without degrading, in this tab. The model runs on WebGPU; nothing leaves the machine.",
    action: { default_title: "Open The Fold" },
    background: { service_worker: "background.js", type: "module" },
    host_permissions: ["http://localhost:11434/*", "http://localhost:8811/*", "http://localhost:8812/*", "https://huggingface.co/*", "https://*.huggingface.co/*", "https://archive.org/*", "https://*.archive.org/*"],
    permissions: ["storage", "unlimitedStorage"],
    content_security_policy: { extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; worker-src 'self'" },
    icons: {},
  };
}
export const EXTENSION_BACKGROUND = `// background.js — the extension's one act: open the page in a tab.
chrome.action.onClicked.addListener(() => { chrome.tabs.create({ url: chrome.runtime.getURL("the-fold/index.html") }); });
`;

// ── the build ────────────────────────────────────────────────────────────────
function args(argv) {
  const a = { out: "dist", models: "none", mirror: null, extension: false, vendor: true };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--out") a.out = argv[++i];
    else if (k === "--models") a.models = argv[++i];
    else if (k === "--mirror") a.mirror = argv[++i];
    else if (k === "--extension") a.extension = true;
    else if (k === "--no-vendor") a.vendor = false;
    else if (k === "--help") { console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(0, 12).join("\n")); process.exit(0); }
    else throw new Error(`unknown argument ${k}`);
  }
  return a;
}

const SKIP_DIRS = new Set([".git", "node_modules", "tests", "eval", "docs", "conformance", "goldens", "scripts", "record", "web", "materials", "library", "priors", ".venv", "models", "skills-demo", "dist", "_site"]);
function copyTree(from, to, { skip = SKIP_DIRS, filter = null } = {}) {
  mkdirSync(to, { recursive: true });
  for (const name of readdirSync(from)) {
    if (skip.has(name)) continue;
    const src = join(from, name);
    const st = statSync(src);
    if (st.isDirectory()) copyTree(src, join(to, name), { skip, filter });
    else if (!filter || filter(src)) cpSync(src, join(to, name));
  }
}

export async function build(opts) {
  const out = resolve(ROOT, opts.out);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const graph = pageGraph({ entry: "index.html", read: diskReader(ROOT) });
  const plan = planSite(graph);

  // 1. the page's own files, mount specifiers rewritten per depth
  const fold = join(out, "the-fold");
  for (const f of plan.own) {
    const src = join(ROOT, f);
    if (!existsSync(src)) continue;
    const dst = join(fold, f);
    mkdirSync(dirname(dst), { recursive: true });
    if (/\.(js|mjs|html|css)$/.test(f)) {
      const depth = f.split("/").length; // the-fold/<f>: files at the top are depth 1 from the dist root
      writeFileSync(dst, rewriteMounts(readFileSync(src, "utf8"), depth));
    } else cpSync(src, dst);
  }
  // the assets the page reaches by fetch, not import
  for (const extra of ["priors-data", "explore", "explore.html"]) {
    const src = join(ROOT, extra);
    if (!existsSync(src)) continue;
    if (statSync(src).isDirectory()) copyTree(src, join(fold, extra), { filter: (p) => !/\.test\.mjs$/.test(p) });
    else writeFileSync(join(fold, extra), rewriteMounts(readFileSync(src, "utf8"), 1));
  }
  // explore/ files are one level deeper: rewrite them at depth 2
  const exploreDir = join(fold, "explore");
  if (existsSync(exploreDir)) for (const f of readdirSync(exploreDir)) if (/\.(js|mjs|css|html)$/.test(f)) writeFileSync(join(exploreDir, f), rewriteMounts(readFileSync(join(exploreDir, f), "utf8"), 2));

  // 2. the engine trees, whole minus tests/evals/docs — another repo's bytes
  const e7 = join(SIBLINGS, "eoreader7");
  for (const [sub, keep] of [["native", null], ["legacy-eoreader6.1/packages/engine", null], ["legacy-eoreader6.1/nul", null]]) {
    const src = join(e7, sub);
    if (!existsSync(src)) throw new Error(`engine tree missing: ${src} — clone eoreader7 beside this repo (./fold does)`);
    copyTree(src, join(out, "eoreader7", sub));
  }

  // 3. vendored packages the page loads (page-graph's vendored edges) plus the
  //    import-map targets index.html names (onnxruntime for transformers.js)
  if (opts.vendor) {
    const pkgs = [...new Set([...plan.vendored, "onnxruntime-web", "onnxruntime-common"])];
    for (const p of pkgs) {
      const src = join(ROOT, "node_modules", p);
      if (!existsSync(src)) { console.warn(`vendored package missing: ${p} (npm ci)`); continue; }
      copyTree(src, join(out, "node_modules", p), { skip: new Set([".git", "test", "tests", "docs", "examples"]) });
    }
  }

  // 4. the weights: none (the page's ladder tries a mirror, then the
  //    publisher), linked (local testing), or copied (a pin)
  const modelsSrc = join(ROOT, "models");
  if (opts.models === "link" && existsSync(modelsSrc)) symlinkSync(modelsSrc, join(fold, "models"), "dir");
  else if (opts.models === "copy" && existsSync(modelsSrc)) copyTree(modelsSrc, join(fold, "models"), { skip: new Set([]) , filter: (p) => !/\.sh$/.test(p) });
  else mkdirSync(join(fold, "models"), { recursive: true });
  const mirrors = opts.mirror ? [opts.mirror.replace(/\/?$/, "/")] : [];
  writeFileSync(join(fold, "models", "MIRRORS.json"), JSON.stringify({ mirrors, note: "weights bases the page tries after its own models/ and before the publisher (webllm-rung.js weightsBases)" }, null, 2));

  // 5. a root that lands on the page, and the extension's two files
  writeFileSync(join(out, "index.html"), `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=the-fold/index.html"><title>The Fold</title><a href="the-fold/index.html">The Fold</a>\n`);
  let version = "0.1.0";
  try { version = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version || version; } catch { /* keep */ }
  if (opts.extension) {
    writeFileSync(join(out, "manifest.json"), JSON.stringify(extensionManifest({ version }), null, 2));
    writeFileSync(join(out, "background.js"), EXTENSION_BACKGROUND);
  }

  // 6. the record of the build: what, from which commit, and every byte's sum
  const sums = [];
  const walk = (dir) => { for (const n of readdirSync(dir)) { const p = join(dir, n); const st = statSync(p); if (st.isSymbolicLink?.()) continue; if (st.isDirectory()) walk(p); else sums.push(p); } };
  walk(out);
  const lines = [];
  let bytes = 0;
  for (const p of sums) {
    const rel = relative(out, p);
    if (rel === "SHA256SUMS" || rel === "BUILD.json") continue;
    const h = createHash("sha256");
    h.update(readFileSync(p));
    bytes += statSync(p).size;
    lines.push(`${h.digest("hex")}  ${rel}`);
  }
  writeFileSync(join(out, "SHA256SUMS"), lines.join("\n") + "\n");
  let commit = null;
  try { commit = execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim(); } catch { /* not a checkout */ }
  const record = { built: new Date().toISOString(), commit, out: relative(ROOT, out), files: lines.length, bytes, own: plan.own.length, mounts: plan.mounts, vendored: opts.vendor ? plan.vendored : [], models: opts.models, mirrors, extension: opts.extension };
  writeFileSync(join(out, "BUILD.json"), JSON.stringify(record, null, 2));
  return record;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rec = await build(args(process.argv.slice(2)));
  console.log(`built ${rec.out}: ${rec.files} files, ${(rec.bytes / 1e6).toFixed(0)} MB — ${rec.own} page files, mounts ${rec.mounts.join(" ")}, vendored ${rec.vendored.join(" ") || "none"}, models ${rec.models}${rec.mirrors.length ? `, mirror ${rec.mirrors[0]}` : ""}${rec.extension ? ", extension manifest" : ""}`);
}
