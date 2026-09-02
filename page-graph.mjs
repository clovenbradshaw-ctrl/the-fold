// page-graph.mjs — what the page loads, DERIVED instead of listed.
//
// P1 says "no request leaves the machine" and names its enforcement as
// "constitution.test.mjs fails on any non-localhost host in any file the page
// loads". That claim was carried for months by a hand-written array of
// filenames in the assay — a list that went stale every time a module was
// added, and had (measured 2026-08-16: eleven page-loaded modules escaped
// every host scan in the repo, render.js and log-pane.js among them). A list
// cannot enforce "any file the page loads"; only a walk of what the page
// actually loads can.
//
// So this module is the walk. Start at the page's own HTML, take its script
// and stylesheet entry points, and follow every load edge transitively:
// static imports, dynamic imports, importScripts, Worker sources, and — the
// case that matters for the terminal — relative module PATHS held as data.
// term.js never writes `new Worker("./term-py-worker.mjs")`; it writes
// `new Worker(new URL(ROSTER[name].src, import.meta.url))`, with the paths in
// a registry object. A walker that only understood literal call arguments
// would miss all three worker files and report a clean sweep. A page module
// that names a sibling module by path is naming something it can load, so
// those literals are load edges here. The residue is over-inclusion — a path
// mentioned but never loaded still gets scanned — which can only widen the
// assay, never narrow it.
//
// WHAT IS OUT OF SCOPE IS TYPED, NEVER SILENT. Three kinds of edge leave this
// repo, and each one leaves it by name (see `MOUNTS`, `VENDOR`, and the
// `documents` result field), so a reader can see what is not being scanned
// and why, instead of trusting that the walk was complete:
//
//   /engine/*, /nul/*   another repo's code (eoreader6), served through a
//                       server mount. Governed by that repo's own tests; this
//                       repo does not own the bytes and must not pretend to
//                       audit them. Reported as `external`.
//   /node_modules/*     vendored third-party bytes (monaco, pyodide, sql.js).
//                       Not first-party source; their comments and their own
//                       CDN defaults name remote hosts that this app never
//                       reaches (no PyPI at runtime — term.js refuses pip by
//                       naming P1). What IS checked mechanically is the thing
//                       P1 actually cares about: the specifier is a local
//                       path and the bytes exist on this disk, i.e. the page
//                       is served them from localhost rather than a CDN.
//                       Reported as `vendored`.
//   an <iframe> src     a separate document with its own module graph. The
//                       Explore page is scanned by web.test.mjs's own seam
//                       test. Reported as `documents`.
//
// The reader is injected (the cast.js pattern) so the walk itself can be
// tested against a synthetic graph whose answer is known — a walker that
// silently returns nothing would otherwise make the assay pass vacuously.

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, normalize, relative, resolve } from "node:path";

// Server mounts: paths the page loads that are served from another repo.
// serve.mjs and explore-server.mjs both carry these two (the page dies at
// import time without either), and both resolve them under ../eoreader6.
export const MOUNTS = [
  {
    prefix: "/engine/",
    root: ["..", "eoreader7", "legacy-eoreader6.1", "packages", "engine"],
    why: "eoreader6's engine, used not copied — another repo's bytes, governed by its own tests",
  },
  {
    prefix: "/engine-v7/",
    root: ["..", "eoreader7", "native"],
    why: "eoreader7's NATIVE tree — a different engine from /engine, not a different folder of the same one, kept apart by name so an import line always says which it came from",
  },
  {
    prefix: "/nul/",
    root: ["..", "eoreader7", "legacy-eoreader6.1", "nul"],
    why: "the engine's own null module, imported by tiers.js from above the /engine mount",
  },
];

// Vendored third-party, served from this machine's node_modules.
export const VENDOR = {
  prefix: "/node_modules/",
  why: "vendored third-party bytes served from localhost — not first-party source",
};

const CODE = /\.(?:js|mjs|cjs)$/;
const HTML = /\.html?$/;
const CSS = /\.css$/;

// ── extraction ─────────────────────────────────────────────────────────────

const HTML_EDGES = [
  [/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi, "script"],
  [/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi, "stylesheet"],
  [/<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi, "document"],
];

const JS_EDGES = [
  [/(?:^|[\s;})])(?:import|export)\s[^;'"]*?from\s*["']([^"']+)["']/g, "import"],
  [/(?:^|[\s;})])import\s*["']([^"']+)["']/g, "import"],
  [/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g, "dynamic-import"],
  [/\bimportScripts\s*\(\s*["']([^"']+)["']/g, "importScripts"],
  [/\bnew\s+Worker\s*\(\s*(?:new\s+URL\s*\(\s*)?["']([^"']+)["']/g, "worker"],
  // The indirection case: a relative module path held as data (term.js's
  // ROSTER). Over-inclusive by construction; see the header.
  [/["'](\.{1,2}\/[A-Za-z0-9_@./-]+\.(?:js|mjs|css|html))["']/g, "module-path"],
];

const CSS_EDGES = [
  [/@import\s+(?:url\()?["']([^"']+)["']/g, "stylesheet"],
  [/\burl\(\s*["']?([^"')]+)["']?\s*\)/g, "asset"],
];

/** Every load edge a source states, as {spec, kind}. Duplicates collapsed. */
export function edgesIn(src, file) {
  const rules = HTML.test(file) ? HTML_EDGES : CSS.test(file) ? CSS_EDGES : JS_EDGES;
  const seen = new Map();
  for (const [re, kind] of rules) {
    for (const m of src.matchAll(re)) {
      const spec = m[1];
      const key = `${kind} ${spec}`;
      if (!seen.has(key)) seen.set(key, { spec, kind });
    }
  }
  return [...seen.values()];
}

/**
 * Every `http(s)://…` a source states, with template placeholders handled:
 * `https://${s}` has no literal host at all and `https://web.archive.org${c}`
 * has one only up to the placeholder. A host built at runtime is reported
 * with what is knowable (`host`) and the fact that the rest is not
 * (`dynamic`) — never quietly dropped for being unparseable.
 */
export function hostsIn(src) {
  const out = [];
  for (const m of src.matchAll(/https?:\/\/([^/"'`\s)>]+)/g)) {
    const raw = m[1];
    out.push({
      raw,
      host: raw.split("${")[0],
      dynamic: raw.includes("${"),
      at: m.index, // where the scheme starts — what the context around it is read from
      index: m.index + m[0].length - raw.length, // where the authority starts
    });
  }
  return out;
}

export function isLocalHost(host) {
  return /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
}

/**
 * Is an occurrence's authority provably local? A runtime placeholder is
 * harmless only once the host component is already SEALED: `localhost:${port}`
 * can still only reach this machine, because the colon ends the host and the
 * placeholder can only extend the port and path. `${h}` and `localhost${rest}`
 * can reach anything, and are not local.
 */
export function isLocalAuthority({ host, dynamic }) {
  if (!dynamic) return isLocalHost(host);
  return /^(localhost|127\.0\.0\.1):$/.test(host);
}

// ── resolution ─────────────────────────────────────────────────────────────

/** Where a specifier points, typed. Nothing is dropped without a class. */
export function classify(spec, fromFile) {
  if (/^(?:https?:)?\/\//.test(spec)) {
    const host = hostsIn(spec)[0]?.host ?? spec.replace(/^\/\//, "").split("/")[0];
    return { where: isLocalHost(host) ? "origin" : "remote", host };
  }
  if (/^(?:data|blob|mailto|javascript):/i.test(spec)) return { where: "inline" };
  for (const mount of MOUNTS) if (spec.startsWith(mount.prefix)) return { where: "external", mount: mount.prefix, why: mount.why };
  if (spec.startsWith(VENDOR.prefix)) return { where: "vendored", why: VENDOR.why };
  if (spec.startsWith("/")) return { where: "local", path: spec.slice(1).split(/[?#]/)[0] };
  if (/^[.]{1,2}\//.test(spec) || HTML.test(spec) || CSS.test(spec) || CODE.test(spec)) {
    const joined = normalize(join(dirname(fromFile), spec.split(/[?#]/)[0]));
    // A relative import that climbs out of this directory into eoreader7's
    // native tree (the organ seam, "../eoreader7/native/organs/index.js") is
    // the /engine-v7 mount by another spelling: the browser resolves it to
    // /eoreader7/native/…, which serve.mjs aliases onto ENGINE_V7. Typed as
    // that mount — with the spec rewritten so servedLocally checks the same
    // bytes — never as a local file that happens not to exist.
    const v7 = MOUNTS.find((m) => m.prefix === "/engine-v7/");
    if (joined.startsWith("../eoreader7/native/")) return { where: "external", mount: v7.prefix, why: v7.why, spec: v7.prefix + joined.slice("../eoreader7/native/".length) };
    return { where: "local", path: joined };
  }
  // A bare specifier has no meaning in a browser without an import map, and
  // this page has none — so it is a fact worth reporting, not a silent skip.
  return { where: "bare" };
}

const DEFINITE = new Set(["script", "stylesheet", "import", "dynamic-import", "importScripts", "worker"]);

/**
 * The transitive closure of what the page loads, from its HTML entry.
 *
 * @param {object} o
 * @param {string} o.entry        page-relative entry, e.g. "index.html"
 * @param {(p:string)=>string|null} o.read   page-relative read, null if absent
 * @returns {{entry, files, edges, external, vendored, documents, remote, bare, missing, dangling}}
 */
export function pageGraph({ entry = "index.html", read }) {
  const files = [];
  const edges = [];
  const external = [];
  const vendored = [];
  const documents = [];
  const remote = [];
  const bare = [];
  const missing = [];
  const dangling = [];
  const queue = [entry];
  const seen = new Set([entry]);

  while (queue.length) {
    const file = queue.shift();
    const src = read(file);
    if (src == null) {
      missing.push({ file, from: "entry" });
      continue;
    }
    files.push(file);
    if (!(CODE.test(file) || HTML.test(file) || CSS.test(file))) continue;
    for (const { spec, kind } of edgesIn(src, file)) {
      const target = classify(spec, file);
      const edge = { from: file, spec, kind, ...target };
      edges.push(edge);
      if (target.where === "external") external.push(edge);
      else if (target.where === "vendored") vendored.push(edge);
      else if (target.where === "remote") remote.push(edge);
      else if (target.where === "bare") bare.push(edge);
      else if (target.where === "origin" || kind === "document") documents.push(edge);
      else if (target.where === "local") {
        if (read(target.path) == null) {
          (DEFINITE.has(kind) ? missing : dangling).push(edge);
          continue;
        }
        if (!seen.has(target.path)) {
          seen.add(target.path);
          queue.push(target.path);
        }
      }
    }
  }
  return { entry, files, edges, external, vendored, documents, remote, bare, missing, dangling };
}

/** The fs-backed reader for a repo root. Never escapes the root. */
export function diskReader(root) {
  const base = resolve(root);
  return (p) => {
    const full = resolve(base, p);
    if (relative(base, full).startsWith("..")) return null;
    if (!existsSync(full)) return null;
    try {
      return readFileSync(full, "utf8");
    } catch {
      return null;
    }
  };
}

/** Does a vendored or mounted specifier resolve to bytes on this machine? */
export function servedLocally(edge, root) {
  const base = resolve(root);
  if (edge.where === "vendored") return existsSync(resolve(base, edge.spec.slice(1).split(/[?#]/)[0]));
  if (edge.where === "external") {
    const mount = MOUNTS.find((m) => m.prefix === edge.mount);
    if (!mount) return false;
    return existsSync(resolve(base, ...mount.root, edge.spec.slice(mount.prefix.length).split(/[?#]/)[0]));
  }
  return false;
}
