// explore-server.mjs — the Explore tab's host. Dependency-free (node:http,
// node:fs, worker_threads), local-only: it binds localhost, serves this
// directory's static pages with no-store (serve.mjs's own reasoning — a
// cached module is worse than a failed edit), and exposes a read-only file
// API confined to one browse root plus a job API that hands engine work to
// a worker thread.
//
//   node explore-server.mjs [port] [browse-root]     default 8812, ../
//
// THE RECORD (FOLD-CONSTITUTION I.5). Every computed event — a source
// opened, a read job with its declared parameters, a kinds job with its
// null arm, a deposit from Converse, an error — is appended to
// record/explore-record.jsonl before the response ships. Append-only: this
// file never truncates or rewrites it. The record is itself a file inside
// the browse root, so Explore can open its own record.
//
// WHAT THIS SERVER NEVER DOES: write inside the browse root except the
// places it owns (append-only record/ and materials/; the clearable web/
// store; library/, "My files" — its OWN ledger append-only, its files
// unlisted on remove and never byte-deleted); accept absolute paths; follow
// a path outside the root; call a model. Remote fetching exists ONLY inside
// the /api/web/* organ — the one
// sanctioned egress (POLICIES P13, amending P1): the page or search the
// user explicitly asked for, plus web.archive.org when the archive setting
// is on. Every crossing is recorded before or as it resolves; nothing is
// fetched that a request did not name; the BROWSER page still fetches
// nothing remote (web.test.mjs pins that seam).

import http from "node:http";
import { Worker } from "node:worker_threads";
import { spawn } from "node:child_process";
import { createReadStream, statSync, readdirSync, openSync, readSync, closeSync, mkdirSync, appendFileSync, existsSync, writeFileSync, readFileSync, rmSync, unlinkSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { foldExtract } from "../eoreader7/legacy-eoreader6.1/packages/host/index.js";
import { foldLibrary, sanitizeFileName, LIBRARY_UPLOAD_MAX_BYTES } from "./library.js";
// the priors organ's GATE (toggle ledger fold, most-specific-wins
// resolution, papers via priors.js's one frontmatter reading) — this file
// owns only the crossings
import { foldPriorToggles, effectivePrior, declarationRows, normalizePriorPath, papersOf } from "./priors-toggles.js";
import { gradeLicense, admissibleFiles, pickSeedFile, seedProvenance, INGEST_MAX_BYTES } from "./seed.js";
import {
  extractReadable,
  extractFeed,
  feedText,
  looksLikeChallenge,
  parseSearchResults,
  foldWebHistory,
  normalizeUrl,
  archiveUrlFrom,
  extForContentType,
  WEB_FETCH_MAX_BYTES,
  WEB_FETCH_TIMEOUT_MS,
  WEB_SEARCH_MAX_RESULTS,
  WEB_ARCHIVE_TIMEOUT_MS,
  WEB_UA,
} from "./web.js";
// the primary-source walk's pure half (citations out of a saved wiki face,
// the claim-ordered ranking, the verbatim snip, the counted fold) — the
// route below owns only the crossings
import { extractCitations, rankPrimary, snipClaim, foldPrimary, PRIMARY_SOURCES_CONSULTED, PRIMARY_SNIPS_KEPT } from "./primary.js";
// the reference-library tier's pure half (provenance frontmatter, mechanical
// candidate ordering, the snip check, the counted fold) — the route below
// owns only the reads, confined to the corpus root
import { parseFrontmatter, readPriorDocument, rankPriorCandidates, checkPrior, foldPriors, PRIORS_DOCS_CONSULTED } from "./priors.js";
// the GitHub organ's pure half (device-flow shapes, Contents API payloads,
// base64, the repo-path convention for skills/history sync) — the routes
// below own only the crossings: github.com's device/token endpoints have no
// CORS headers, so even the device flow is relayed server-side via n8n.
import {
  GITHUB_APP_CLIENT_ID,
  GITHUB_DEVICE_CODE_RELAY_URL,
  GITHUB_ACCESS_TOKEN_RELAY_URL,
  buildDeviceCodeBody,
  buildAccessTokenBody,
  contentsUrl,
  decodeContentsGet,
  buildContentsWriteBody,
  decodeContentsWrite,
} from "./github.js";
import { skillDigest } from "./skills.js";
// the wheel organ's pure half (P21, amending P18) — the transitive
// dependency-closure walk over pyodide's own lock file; the route below
// owns only the crossing (the CDN fetch, the sha256 verify, the disk write)
import { wheelClosure } from "./wheels.js";
// the model-proxy organ's wire-shape half (P25, amending P1: the fold
// servable AS a model, not only a client OF one) — this file owns the two
// crossings (Ollama's real /api/tags, and the turn itself via
// proxy-runner.mjs's runProxyTurn), proxy-api.js owns only the shapes
import {
  parseProxyRequest,
  prefixModel,
  toOpenAIModelList,
  reprefixOllamaTags,
  openAIResponse,
  openAIStreamLines,
  ollamaChatResponse,
  ollamaChatStreamLines,
} from "./proxy-api.js";
import { OLLAMA as PROXY_OLLAMA_URL, offeredOllamaModels, runProxyTurn } from "./proxy-runner.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
// serve.mjs's own engine mount, unchanged: the Converse page imports the
// reader's engine as /engine/… modules, so this server carries the same
// mapping and one process serves the whole instrument.
const ENGINE = path.resolve(ROOT, "..", "eoreader7", "legacy-eoreader6.1", "packages", "engine");
// serve.mjs's nul mount, carried here for the same reason as /engine:
// tiers.js imports ../../../nul/index.js, which resolves to /nul/… in the
// browser, and this server also serves the chat page whole.
const NUL = path.resolve(ROOT, "..", "eoreader7", "legacy-eoreader6.1", "nul");
// serve.mjs's priors-data mount, carried here for the same reason as
// /engine and /nul: real, giver-cited data (POSPrior@1) read live off
// eoreader6.1's own gitignored, locally-reproducible build directory —
// never a stale copy vendored into this repo.
const PRIORS_DATA = path.resolve(ROOT, "..", "eoreader7", "legacy-eoreader6.1", "scripts", "corpus");
const PORT = Number(process.argv[2] ?? 8812);
const BROWSE_ROOT = path.resolve(process.argv[3] ?? path.join(ROOT, ".."));
const RECORD_DIR = path.join(ROOT, "record");
const RECORD_PATH = path.join(RECORD_DIR, "explore-record.jsonl");
const TRANSCRIBE_LOG_PATH = path.join(RECORD_DIR, "transcribe-log.jsonl");
const MATERIALS_DIR = path.join(ROOT, "materials");
// The web store — history the user may clear, unlike record/ which no one
// may. pages/ holds full content, addressed by sha256 of the bytes as they
// arrived; history.jsonl is the index the Explore tab's web view folds.
const WEB_DIR = path.join(ROOT, "web");
const WEB_PAGES_DIR = path.join(WEB_DIR, "pages");
const WEB_HISTORY_PATH = path.join(WEB_DIR, "history.jsonl");
const WEB_SETTINGS_PATH = path.join(WEB_DIR, "settings.json");
// "My files" — the flat index of what a reader explicitly added, and
// nothing else (library.js's own header). files/ holds uploaded bytes,
// content-addressed; library.jsonl is the append-only add/remove ledger
// library.js::foldLibrary reads.
const LIBRARY_DIR = path.join(ROOT, "library");
const LIBRARY_FILES_DIR = path.join(LIBRARY_DIR, "files");
const LIBRARY_LEDGER_PATH = path.join(LIBRARY_DIR, "library.jsonl");
// The priors organ — live_priors as toggleable, papers-carrying material.
// The corpus itself lives one level up (inside the browse root, so every
// existing read path — raw/peek/source/read — already serves its files);
// what lives HERE is the toggle ledger: append-only in operation, folded by
// priors.js, every line also mirrored to the record. priors/ is this
// server's to write, like library/ — never the corpus itself.
const PRIORS_ROOT = path.resolve(ROOT, "..", "live_priors");
const PRIORS_DIR = path.join(ROOT, "priors");
const PRIORS_LEDGER_PATH = path.join(PRIORS_DIR, "toggles.jsonl");
// The skill library's own persistence (skill-runner.mjs's declared path,
// dormant there until a skill is actually admitted) — GET/import here read
// and write the SAME directory skill-runner.mjs would, so a skill pulled
// from GitHub is indistinguishable from one admitted locally.
const SKILLS_DIR = path.join(ROOT, "skills");

// ── declared numbers, each with its giver ───────────────────────────────────
// Tree pages and hex pages are caps on a response, not on the data; every
// truncation they cause is counted in the response that carries it
// (FOLD-CONSTITUTION III.3). Givers: this file, engineering starting points.
const TREE_PAGE = 400;
const HEX_PAGE_MAX = 4096;
const HEX_PAGE_DEFAULT = 1024;
const DEPOSIT_MAX_BYTES = 25_000_000; // same bound terrain-explorer/server.mjs declares for a request body

// Kinds option sets. Givers: terrain-explorer/server.mjs's own declared
// starting points ("an interactive-speed starting point ... not a measured
// constant"), with reseeds raised to 2 — the floor induceKinds itself
// enforces — and nullArmDraws per FOLD-CONSTITUTION II.4: the finest rank
// sayable is 1/draws, so QUICK buys the coarsest honest statement and
// THOROUGH a 1-in-5 one. The arm itself always runs deferred (the kinds
// render provisional until it lands) — declining it is not offered here.
const KINDS_QUICK = { minPrevalence: 0.03, minKindSize: 5, permutations: 20, quantile: 0.95, seed: 42, reseeds: 2, nullArmDraws: 1 };
const KINDS_THOROUGH = { minPrevalence: 0.02, minKindSize: 8, permutations: 50, quantile: 0.95, seed: 42, reseeds: 2, nullArmDraws: 5 };

// The fold's resolution — how many sentences an extractive fold keeps. A
// declared interactive dial (the result always states kept-of-N); giver:
// this file, engineering starting point.
const FOLD_BUDGET_SENTENCES = 7;

// Search: a filename walk under the browse root. The skip list is a
// declared rule (dependency and build trees are machinery, not material),
// the caps bound one response, and every truncation is counted. Givers:
// this file, engineering starting points.
const FIND_SKIP = new Set(["node_modules", ".git", ".next", "dist", "out", "build", ".cache"]);
// The corpus's own machinery — fetch scripts, similarity code, manifests —
// is not priors material. A declared rule (live_priors' README draws the
// same line: the numbered category folders hold the documents); the walk
// also skips FIND_SKIP and top-level loose files (README, SOURCES.md,
// package.json — the corpus's papers about itself, not documents in it).
const PRIORS_SKIP = new Set(["scripts", "src", "manifests"]);
// One walk visits at most this many entries — same posture as
// FIND_MAX_VISITED, a cap on a response never on the data, truncation
// always counted. Giver: this file, engineering starting point.
const PRIORS_WALK_MAX = 60_000;
const FIND_MAX_RESULTS = 200;
const FIND_MAX_VISITED = 60_000;
const PEEK_CHARS = 400;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jsonl": "application/x-ndjson; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".tsv": "text/tab-separated-values; charset=utf-8",
  // The sandboxed terminal's runtimes (pyodide, sql.js) are wasm, vendored
  // and served from here too — this server also serves the chat page whole.
  ".wasm": "application/wasm",
  ".zip": "application/zip",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
  ".tiff": "image/tiff",
  ".tif": "image/tiff",
  ".pdf": "application/pdf",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".oga": "audio/ogg",
  ".m4a": "audio/mp4",
  ".flac": "audio/flac",
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

// Extensions whose text face is best read as code — display metadata for the
// viewer, never an interpretation of content.
const CODE_EXTS = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".py", ".rb", ".go", ".rs", ".c", ".h", ".cpp", ".hpp", ".java", ".sh", ".zsh", ".bash", ".sql", ".css", ".scss", ".yaml", ".yml", ".toml", ".ini", ".xml", ".swift", ".kt", ".php", ".pl", ".lua", ".r"]);

// ── the record ──────────────────────────────────────────────────────────────
mkdirSync(RECORD_DIR, { recursive: true });
mkdirSync(MATERIALS_DIR, { recursive: true });
mkdirSync(LIBRARY_FILES_DIR, { recursive: true });
function record(event, fields = {}) {
  const line = JSON.stringify({ at: new Date().toISOString(), event, ...fields });
  appendFileSync(RECORD_PATH, line + "\n");
  return line;
}

// ── the library ──────────────────────────────────────────────────────────────
function appendLibrary(entry) {
  mkdirSync(LIBRARY_FILES_DIR, { recursive: true });
  appendFileSync(LIBRARY_LEDGER_PATH, JSON.stringify(entry) + "\n");
}
function readLibrary() {
  const jsonl = existsSync(LIBRARY_LEDGER_PATH) ? readFileSync(LIBRARY_LEDGER_PATH, "utf8") : "";
  return foldLibrary(jsonl);
}

/** The raw-bytes half of the body reader — POST /api/library/upload arrives
 * as one file's bytes, not JSON, so it does not go through readJsonBody. */
function readRawBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(Object.assign(new Error(`upload exceeds the declared cap of ${maxBytes} bytes`), { code: "TOO_LARGE" }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// ── the priors organ's I/O half ─────────────────────────────────────────────
// The pure half (frontmatter parse, ledger fold, most-specific-wins) lives in
// priors.js and is tested offline; this half owns the ledger file and the
// corpus walk. Nothing here is ever ingested unasked: the walk lists, the
// toggle appends, the doc read is one document a request named — and the
// toggle and the open are record events, the listings are display.

function readPriorToggles() {
  const jsonl = existsSync(PRIORS_LEDGER_PATH) ? readFileSync(PRIORS_LEDGER_PATH, "utf8") : "";
  return foldPriorToggles(jsonl);
}

function appendPriorToggle(entry) {
  mkdirSync(PRIORS_DIR, { recursive: true });
  appendFileSync(PRIORS_LEDGER_PATH, JSON.stringify(entry) + "\n");
}

/** corpus-relative path -> absolute path inside PRIORS_ROOT, or null when it
 * escapes. "" resolves to the corpus root itself (the everything toggle). */
function confinePrior(rel) {
  const clean = normalizePriorPath(rel);
  if (clean.split("/").some((seg) => seg === "..")) return null;
  const abs = path.join(PRIORS_ROOT, clean);
  if (abs !== PRIORS_ROOT && !abs.startsWith(PRIORS_ROOT + path.sep)) return null;
  return abs;
}

/**
 * One pass over the corpus: per-category counts (files, bytes, how many are
 * in play) and the flat list of enabled documents. Categories are the
 * top-level folders — the corpus's own genre layer. Machinery (PRIORS_SKIP,
 * FIND_SKIP, dotfiles, top-level loose files) is out of scope by declared
 * rule, and the visit cap's truncation is counted, never silent.
 */
function walkPriors(byPath) {
  const categories = new Map();
  const enabled = [];
  let files = 0;
  let visited = 0;
  let truncated = false;
  const walk = (dir, rel, category) => {
    if (visited >= PRIORS_WALK_MAX) {
      truncated = true;
      return;
    }
    let names;
    try {
      names = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of names) {
      if (++visited >= PRIORS_WALK_MAX) {
        truncated = true;
        return;
      }
      if (ent.name.startsWith(".")) continue;
      const abs = path.join(dir, ent.name);
      const childRel = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        if (FIND_SKIP.has(ent.name) || (!rel && PRIORS_SKIP.has(ent.name))) continue;
        walk(abs, childRel, category ?? ent.name);
        continue;
      }
      if (!category) continue; // top-level loose files are the corpus's own papers
      let st;
      try {
        st = statSync(abs);
      } catch {
        continue;
      }
      files++;
      const c = categories.get(category) ?? { name: category, files: 0, bytes: 0, enabled: 0 };
      c.files++;
      c.bytes += st.size;
      categories.set(category, c);
      const eff = effectivePrior(byPath, childRel);
      if (eff.on) {
        c.enabled++;
        enabled.push({ name: ent.name, path: childRel, browsePath: relOf(abs), size: st.size, category, decidedBy: eff.decidedBy });
      }
    }
  };
  walk(PRIORS_ROOT, "", null);
  return {
    categories: [...categories.values()].sort((a, b) => a.name.localeCompare(b.name)),
    enabled,
    files,
    truncated,
  };
}

// The reference-library CHECK's listing (POST /api/priors/check): every
// document beside the title its own head declares, for the mechanical
// candidate ranking in priors.js::rankPriorCandidates. Scope mirrors
// walkPriors exactly — FIND_SKIP, PRIORS_SKIP, dotfiles and top-level loose
// files out by the same declared rule — so the two priors organs see one
// corpus. Titles come from ONE bounded head read per document, memoized by
// path·mtime·size (the read-reuse discipline completed reads already use);
// binary files are skipped because snipping needs a text face.
const PRIORS_HEAD_BYTES = 4096; // one head read per document for its provenance title; the longest real frontmatter measured (uk legislation) is ~1.6KB — giver: this file, engineering starting point
const priorsHeads = new Map(); // abs -> { mtimeMs, size, binary, title }
function listPriorDocuments() {
  if (!existsSync(PRIORS_ROOT)) return null;
  const entries = [];
  let visited = 0;
  let truncated = false;
  const walk = (dir, rel, category) => {
    if (visited >= PRIORS_WALK_MAX) {
      truncated = true;
      return;
    }
    let names;
    try {
      names = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of names) {
      if (++visited >= PRIORS_WALK_MAX) {
        truncated = true;
        return;
      }
      if (ent.name.startsWith(".")) continue;
      if (ent.isSymbolicLink()) continue; // a link may not lead a read outside the corpus
      const abs = path.join(dir, ent.name);
      const childRel = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        if (FIND_SKIP.has(ent.name) || (!rel && PRIORS_SKIP.has(ent.name))) continue;
        walk(abs, childRel, category ?? ent.name);
        continue;
      }
      if (!category) continue; // top-level loose files are the corpus's papers about itself
      let st;
      try {
        st = statSync(abs);
      } catch {
        continue;
      }
      let head = priorsHeads.get(abs);
      if (!head || head.mtimeMs !== st.mtimeMs || head.size !== st.size) {
        const buf = Buffer.alloc(Math.min(st.size, PRIORS_HEAD_BYTES));
        if (buf.length) {
          try {
            const fd = openSync(abs, "r");
            try {
              readSync(fd, buf, 0, buf.length, 0);
            } finally {
              closeSync(fd);
            }
          } catch {
            continue;
          }
        }
        const binary = buf.length ? !utf8Probe(buf) : false;
        head = { mtimeMs: st.mtimeMs, size: st.size, binary, title: binary ? null : parseFrontmatter(buf.toString("utf8")).title };
        priorsHeads.set(abs, head);
      }
      if (head.binary) continue;
      entries.push({ path: childRel, title: head.title });
    }
  };
  walk(PRIORS_ROOT, "", null);
  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return { entries, truncated };
}

// ── the web organ's I/O half ────────────────────────────────────────────────
// The pure half (extraction, parsing, the history fold) lives in web.js and
// is tested offline; this half is the P13 egress itself. Three destinations
// only, each by explicit user action: the search endpoint for a typed query,
// the page a request names, web.archive.org when the archive setting is on.

function webSettings() {
  try {
    return { archiveOrg: false, ...JSON.parse(readFileSync(WEB_SETTINGS_PATH, "utf8")) };
  } catch {
    return { archiveOrg: false };
  }
}

function appendWebHistory(line) {
  mkdirSync(WEB_DIR, { recursive: true });
  appendFileSync(WEB_HISTORY_PATH, JSON.stringify(line) + "\n");
}

/** Fetch with the declared byte cap enforced on the stream, not after it. */
async function fetchCapped(url, { timeoutMs = WEB_FETCH_TIMEOUT_MS, maxBytes = WEB_FETCH_MAX_BYTES } = {}) {
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "user-agent": WEB_UA, accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8" },
  });
  const chunks = [];
  let total = 0;
  for await (const chunk of res.body ?? []) {
    total += chunk.length;
    if (total > maxBytes) {
      res.body?.cancel?.().catch(() => {});
      throw Object.assign(new Error(`response exceeds the declared bound of ${maxBytes} bytes`), { code: "CENSORED_ABOVE" });
    }
    chunks.push(Buffer.from(chunk));
  }
  return { res, buf: Buffer.concat(chunks) };
}

/**
 * Save Page Now, DEFERRED — the history entry ships with archive "pending"
 * and this lands as a patch line carrying the same id (the fold in web.js
 * merges them), because SPN routinely takes a minute the fetch response
 * must not wait for. Success and failure both land; pending never silently
 * evaporates.
 *
 * Content-Location naming a snapshot address is the archive's OWN claim,
 * not a fact about what a reader following "archived ↗" will find — the
 * same distinction this instrument draws everywhere else between an
 * assertion and a checked one (L5: never left to the far side's own
 * word). Before "saved" ships, the named address is fetched and read
 * exactly as any other page is (`verifySnapshot`, below) — a link handed
 * to the reader as a stable snapshot must actually resolve to one.
 */
async function archivePage(id, url) {
  try {
    const { res } = await fetchCapped(`https://web.archive.org/save/${url}`, { timeoutMs: WEB_ARCHIVE_TIMEOUT_MS });
    const archiveUrl = archiveUrlFrom({ contentLocation: res.headers.get("content-location"), finalUrl: res.url });
    if (!archiveUrl) {
      const detail = `save-page-now answered ${res.status} without naming a snapshot`;
      appendWebHistory({ id, archive: { status: "failed", detail, at: new Date().toISOString() } });
      record("web-archive-error", { id, error: detail });
      return;
    }
    const verified = await verifySnapshot(archiveUrl);
    if (verified.ok) {
      appendWebHistory({ id, archive: { status: "saved", url: archiveUrl, at: new Date().toISOString() } });
      record("web-archive", { id, archiveUrl });
    } else {
      const detail = `the archive named a snapshot at ${archiveUrl} but it did not resolve to real content — ${verified.detail}`;
      appendWebHistory({ id, archive: { status: "failed", detail, url: archiveUrl, at: new Date().toISOString() } });
      record("web-archive-error", { id, error: detail, archiveUrl });
    }
  } catch (e) {
    appendWebHistory({ id, archive: { status: "failed", detail: e.message, at: new Date().toISOString() } });
    record("web-archive-error", { id, error: e.message });
  }
}

/**
 * Does the archive's own named snapshot actually hold a real page? Judged
 * by the SAME organ that already answers this question for every other
 * fetch (`looksLikeChallenge`, `extractReadable`) — never by trusting a
 * 2xx status alone, since a redirect loop or an unindexed snapshot can
 * still answer 200 with nothing readable behind it. Plain page fetch, so
 * the ordinary WEB_FETCH_TIMEOUT_MS/WEB_FETCH_MAX_BYTES bounds apply, not
 * the slow-by-design SPN ones.
 */
async function verifySnapshot(archiveUrl) {
  try {
    const { res, buf } = await fetchCapped(archiveUrl);
    if (!res.ok) return { ok: false, detail: `the snapshot itself answered ${res.status}` };
    const readable = extractReadable(buf.toString("utf8"));
    if (looksLikeChallenge({ title: readable.title, textChars: readable.text.length })) {
      return { ok: false, detail: "the snapshot page reads as a shell (bot-challenge shape), not the article" };
    }
    if (!readable.text.trim().length) return { ok: false, detail: "the snapshot page has no readable text" };
    return { ok: true };
  } catch (e) {
    return { ok: false, detail: `checking the snapshot failed: ${e.message}` };
  }
}

/**
 * The whole keep-everything fetch pipeline as ONE function, because two
 * routes now cross the seam (/api/web/fetch for the page a request names,
 * /api/web/primary for a claim's walk to a page's cited sources) and a
 * second copy of "what a fetch keeps" would drift from the first. One url
 * in; the raw bytes and readable face land content-addressed in web/pages/,
 * the visit lands in web/history.jsonl, the crossing lands on the record,
 * the archive setting is honoured — exactly what /api/web/fetch always did.
 * Returns { url, entry, fold, text } or { url, gap } with the gap typed.
 */
async function fetchAndKeep(url, { forceArchive = false } = {}) {
  const retrievedAt = new Date().toISOString();
  let fetched;
  try {
    fetched = await fetchCapped(url);
  } catch (e) {
    record("web-fetch-error", { url, error: e.message });
    const gap = e.code === "CENSORED_ABOVE"
      ? { silence: "censored-above", detail: `${e.message} — giver: web.js WEB_FETCH_MAX_BYTES, engineering starting point` }
      : { silence: "not-present", detail: e.message };
    return { url, gap };
  }
  const { res: r, buf } = fetched;
  const contentType = r.headers.get("content-type") ?? "";
  const sha = crypto.createHash("sha256").update(buf).digest("hex");
  const ext = extForContentType(contentType);
  mkdirSync(WEB_PAGES_DIR, { recursive: true });
  const rawFile = path.join(WEB_PAGES_DIR, `${sha.slice(0, 16)}${ext}`);
  if (!existsSync(rawFile)) writeFileSync(rawFile, buf);

  // the readable face — ALL of it, extraction is not a summary
  let title = null;
  let text = null;
  let textFile = null;
  if (ext === ".html" || ext === ".xml") {
    // A feed is not an article with unusual markup — it is a LIST of them
    // (extractFeed's own header, web.js). Tried FIRST for .xml, by the
    // bytes' own declared root element, never by extension alone (an .xml
    // save can be a sitemap or any other non-feed document, which falls
    // through to extractReadable exactly as before).
    const feed = ext === ".xml" ? extractFeed(buf.toString("utf8")) : null;
    const readable = feed ? null : extractReadable(buf.toString("utf8"));
    title = feed ? feed.title || null : readable.title || null;
    text = feed ? feedText(feed) : readable.text;
    textFile = path.join(WEB_PAGES_DIR, `${sha.slice(0, 16)}.txt`);
    if (!existsSync(textFile)) writeFileSync(textFile, text);
  } else {
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
      textFile = rawFile; // the raw face IS the text face
    } catch {
      /* binary — raw is kept, there is no text face */
    }
  }

  // salience — the fold over the whole saved text, never a paraphrase
  let fold = null;
  if (text?.length) {
    try {
      fold = { ...foldExtract({ text, budgetSentences: FOLD_BUDGET_SENTENCES }), budget: FOLD_BUDGET_SENTENCES };
    } catch (e) {
      fold = { gap: { reason: "fold_failed", detail: e.message } };
    }
  }

  const settings = webSettings();
  // `forceArchive` is a PER-CALL override, never a change to the standing
  // setting: a source the app is about to cite (an explicitly-named URL,
  // never a speculative search hit) is worth archiving regardless of
  // whether the reader has turned on general browsing archival — the same
  // way `every` overrides applyOps' default for one call without touching
  // its default. `archiveAsked` on the record names which reason applied.
  const willArchive = settings.archiveOrg || forceArchive;
  const entry = {
    id: crypto.randomUUID(),
    url,
    finalUrl: r.url || url,
    status: r.status,
    contentType,
    title,
    retrievedAt,
    bytes: buf.length,
    textChars: text?.length ?? null,
    sha256: sha,
    rawPath: relOf(rawFile),
    textPath: textFile ? relOf(textFile) : null,
    ...(looksLikeChallenge({ title, textChars: text?.length }) ? { challenge: true } : {}),
    archive: willArchive ? { status: "pending", askedAt: retrievedAt } : null,
  };
  appendWebHistory(entry);
  record("web-fetch", { id: entry.id, url, finalUrl: entry.finalUrl, status: entry.status, bytes: entry.bytes, sha256: sha, archiveAsked: willArchive });
  if (willArchive) archivePage(entry.id, entry.finalUrl); // deferred, lands as a patch line
  return { url, entry, fold, text };
}

// ── the wheel organ (P21, amending P18): pip installs closed to pyodide's
// own vetted package set ─────────────────────────────────────────────────
// pyodide ships pre-built wasm wheels for ~350 packages — its own CDN
// mirror, listed in node_modules/pyodide/pyodide-lock.json, the SAME index
// numpy/matplotlib/pandas already come from via
// scripts/fetch-pyodide-packages.sh. This route generalizes that script
// from three hardcoded names to any name in the lock: walk the transitive
// dependency closure, fetch whatever is not already vendored from that
// SAME pinned mirror (fetchAndKeep's own fetchCapped, reused — one fetch
// pipeline, not two), sha256-verify every wheel (newly-fetched AND
// already-present, so a corrupted prior download is caught, not trusted)
// against the lock's own declared hash, and write it into
// node_modules/pyodide/. Nothing downstream changes: term-py-worker.mjs's
// EXISTING loadPackagesFromImports mechanism picks up whatever sits at
// indexURL, vendored or freshly fetched, on that runtime's next FRESH
// session — exactly as it already does for numpy/pandas/matplotlib. A name
// not in this lock (arbitrary PyPI) is a typed refusal, never a silent
// miss or a half-simulation — a real micropip/PyPI-index tier is named
// future work, not implied.
const PYODIDE_DIR = path.join(ROOT, "node_modules", "pyodide");
const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide";
const WHEEL_MAX_BYTES = 90_000_000; // one wheel; this lock's own largest builds (scipy, opencv) run tens of MB — giver: this route, engineering starting point
const WHEEL_CLOSURE_MAX_BYTES = 260_000_000; // a whole install's dependency closure; exceeding it is refused, never half-fetched
const WHEEL_TIMEOUT_MS = 120_000; // a big wasm wheel over a slow link, not an interactive page wait

function pyodideVersion() {
  return JSON.parse(readFileSync(path.join(PYODIDE_DIR, "package.json"), "utf8")).version;
}

function pyodideLock() {
  return JSON.parse(readFileSync(path.join(PYODIDE_DIR, "pyodide-lock.json"), "utf8")).packages;
}

// ── path confinement ────────────────────────────────────────────────────────
/** rel (URL form, "/" separated, relative to BROWSE_ROOT) -> absolute path, or null when it escapes. */
function confine(rel) {
  const clean = path.normalize(String(rel ?? "").replace(/^\/+/, ""));
  if (clean.startsWith("..") || path.isAbsolute(clean)) return null;
  const abs = path.join(BROWSE_ROOT, clean);
  if (abs !== BROWSE_ROOT && !abs.startsWith(BROWSE_ROOT + path.sep)) return null;
  return abs;
}
const relOf = (abs) => path.relative(BROWSE_ROOT, abs).split(path.sep).join("/");

// ── modality sniffing ───────────────────────────────────────────────────────
// Magic bytes first (the file's own testimony), extension second (the name's
// claim), UTF-8 probe last. The result is DISPLAY metadata — which native
// surface can show these bytes — never an interpretation of content.
const MAGICS = [
  { name: "png", mime: "image/png", modality: "image", test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { name: "jpeg", mime: "image/jpeg", modality: "image", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { name: "gif", mime: "image/gif", modality: "image", test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 },
  { name: "webp", mime: "image/webp", modality: "image", test: (b) => b.length > 11 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
  { name: "bmp", mime: "image/bmp", modality: "image", test: (b) => b[0] === 0x42 && b[1] === 0x4d },
  { name: "tiff", mime: "image/tiff", modality: "image", test: (b) => (b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a) || (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0x00) },
  { name: "ico", mime: "image/x-icon", modality: "image", test: (b) => b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01 && b[3] === 0x00 },
  { name: "pdf", mime: "application/pdf", modality: "pdf", test: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
  { name: "zip", mime: "application/zip", modality: "binary", test: (b) => b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07) },
  { name: "gzip", mime: "application/gzip", modality: "binary", test: (b) => b[0] === 0x1f && b[1] === 0x8b },
  { name: "wav", mime: "audio/wav", modality: "audio", test: (b) => b.length > 11 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x41 && b[10] === 0x56 && b[11] === 0x45 },
  { name: "ogg", mime: "audio/ogg", modality: "audio", test: (b) => b[0] === 0x4f && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53 },
  { name: "flac", mime: "audio/flac", modality: "audio", test: (b) => b[0] === 0x66 && b[1] === 0x4c && b[2] === 0x61 && b[3] === 0x43 },
  { name: "mp3", mime: "audio/mpeg", modality: "audio", test: (b) => (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
  { name: "mp4", mime: "video/mp4", modality: "video", test: (b) => b.length > 11 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 },
];

function utf8Probe(buf) {
  // Strict decode of the head; a lone truncated multi-byte tail at the very
  // end of the sample is not evidence of binary, so trim up to 3 bytes.
  for (let trim = 0; trim <= 3 && trim < buf.length; trim++) {
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(buf.subarray(0, buf.length - trim));
      // NUL bytes decode fine but no text format carries them.
      if (text.includes(" ")) return false;
      return true;
    } catch {
      /* try one byte shorter */
    }
  }
  return false;
}

function sniff(abs, size) {
  const head = Buffer.alloc(Math.min(size, 4096));
  if (head.length) {
    const fd = openSync(abs, "r");
    try {
      readSync(fd, head, 0, head.length, 0);
    } finally {
      closeSync(fd);
    }
  }
  const ext = path.extname(abs).toLowerCase();
  const magic = MAGICS.find((m) => head.length >= 4 && m.test(head));
  if (magic) {
    // SVG arrives as text but displays as an image; the magic table cannot
    // see it, the extension can.
    return { modality: magic.modality, mime: MIME[ext] ?? magic.mime, magic: magic.name };
  }
  const textual = head.length === 0 ? true : utf8Probe(head);
  if (!textual) return { modality: "binary", mime: MIME[ext] ?? "application/octet-stream", magic: null };
  if (ext === ".svg") return { modality: "image", mime: MIME[ext], magic: null };
  if (ext === ".pdf") return { modality: "pdf", mime: MIME[ext], magic: null };
  if (ext === ".html" || ext === ".htm") return { modality: "html", mime: MIME[".html"], magic: null };
  if (ext === ".md" || ext === ".markdown") return { modality: "markdown", mime: MIME[".md"], magic: null };
  if (ext === ".csv") return { modality: "table", mime: MIME[".csv"], magic: null, delimiter: "," };
  if (ext === ".tsv") return { modality: "table", mime: MIME[".tsv"], magic: null, delimiter: "\t" };
  if (ext === ".json" || ext === ".jsonl") return { modality: "json", mime: MIME[ext] ?? MIME[".json"], magic: null };
  if (CODE_EXTS.has(ext)) return { modality: "code", mime: MIME[ext] ?? "text/plain; charset=utf-8", magic: null, language: ext.slice(1) };
  return { modality: "text", mime: MIME[ext] ?? "text/plain; charset=utf-8", magic: null };
}

// ── jobs ────────────────────────────────────────────────────────────────────
const jobs = new Map();

function startJob(kind, workerData, meta) {
  const id = crypto.randomUUID();
  const job = { id, kind, phase: "queued", startedAt: Date.now(), meta, phases: [], result: null, nullArm: null, error: null };
  jobs.set(id, job);
  record(`${kind}-start`, { job: id, ...meta });

  const worker = new Worker(new URL("./explore-worker.mjs", import.meta.url), { workerData });
  job.worker = worker;
  worker.on("message", (msg) => {
    job.phase = msg.phase;
    job.updatedAt = msg.at;
    job.phases.push({ phase: msg.phase, at: msg.at, ...(msg.note ? { note: msg.note } : {}) });
    if (msg.surface) {
      // a streamed surface — accumulated so a poll mid-read serves what exists
      job.partial ??= {};
      job.partial[msg.surface] = msg.data;
    }
    if (msg.result !== undefined) job.result = msg.result;
    if (msg.nullArm !== undefined) job.nullArm = msg.nullArm;
    if (msg.phase === "done") {
      record(`${kind}-done`, { job: id, elapsedMs: msg.at - job.startedAt, ...(msg.summary ?? {}) });
    }
    if (msg.phase === "error") {
      job.error = msg.error;
      record(`${kind}-error`, { job: id, error: msg.error?.message });
    }
  });
  worker.on("error", (err) => {
    job.phase = "error";
    job.error = { message: err.message, stack: err.stack };
    record(`${kind}-error`, { job: id, error: err.message });
  });
  worker.on("exit", () => {
    job.worker = null;
  });
  return id;
}

// ── http plumbing ───────────────────────────────────────────────────────────
// The Converse tab may be served by a sibling static server on another
// localhost port (serve.mjs on 8811/8815); its "open in Explore" bridge
// deposits here. CORS is opened for LOCALHOST ORIGINS ONLY — the repo's
// local-only rule, kept at the seam.
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
function corsHeaders(req) {
  const origin = req.headers.origin;
  return origin && LOCAL_ORIGIN.test(origin)
    ? { "access-control-allow-origin": origin, "access-control-allow-methods": "GET, POST", "access-control-allow-headers": "content-type" }
    : {};
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers });
  res.end(JSON.stringify(body));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > DEPOSIT_MAX_BYTES) {
        reject(new Error(`body too large (${DEPOSIT_MAX_BYTES} byte limit)`));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function serveStatic(req, res, pathname) {
  const rel = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  const file = rel.startsWith("/engine/") || rel.startsWith("engine/")
    ? path.join(ENGINE, rel.replace(/^\/?engine\//, ""))
    : rel.startsWith("/nul/") || rel.startsWith("nul/")
      ? path.join(NUL, rel.replace(/^\/?nul\//, ""))
      : rel.startsWith("/priors-data/") || rel.startsWith("priors-data/")
        ? path.join(PRIORS_DATA, rel.replace(/^\/?priors-data\//, ""))
        : path.join(ROOT, rel === "/" || rel === "." ? "index.html" : rel);
  const withinRoot = file === ROOT || file.startsWith(ROOT + path.sep);
  const withinEngine = file === ENGINE || file.startsWith(ENGINE + path.sep);
  const withinNul = file === NUL || file.startsWith(NUL + path.sep);
  const withinPriorsData = file === PRIORS_DATA || file.startsWith(PRIORS_DATA + path.sep);
  if (!withinRoot && !withinEngine && !withinNul && !withinPriorsData) {
    res.writeHead(403);
    return res.end("forbidden");
  }
  let st;
  try {
    st = statSync(file);
  } catch {
    res.writeHead(404);
    return res.end("not found");
  }
  if (st.isDirectory()) {
    res.writeHead(404);
    return res.end("not found");
  }
  // Static files carry the same localhost-only CORS the API speaks: the
  // Converse page on a sibling port reads saved page faces (web/pages/*)
  // to judge proof verdicts, and without the header the browser blocks the
  // GET — measured live 2026-08-17: every /web/pages/<sha>.txt read from
  // :8814 died net::ERR_FAILED and every verdict gapped out as
  // "Failed to fetch" while the API half of the same crossing succeeded.
  res.writeHead(200, { "content-type": MIME[path.extname(file)] ?? "application/octet-stream", "cache-control": "no-store", ...corsHeaders(req) });
  createReadStream(file).pipe(res);
}

// ── the API ─────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;

  // /v1/* joins /api/* here: it's the OpenAI-compatible half of the model
  // proxy, and an OpenAI-compatible client's own preflight/CORS behavior
  // must see the same treatment the rest of this server's JSON API gets.
  if (p.startsWith("/api/") || p.startsWith("/v1/")) {
    const cors = corsHeaders(req);
    for (const [k, v] of Object.entries(cors)) res.setHeader(k, v);
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }
  }

  try {
    // ---- tree: one directory level, folders first then name (a declared
    // ordering rule, not an outcome-chosen one — FOLD-CONSTITUTION III.1).
    if (req.method === "GET" && p === "/api/tree") {
      const abs = confine(url.searchParams.get("path") ?? "");
      if (!abs) return send(res, 400, { error: "path escapes the browse root" });
      let names;
      try {
        names = readdirSync(abs, { withFileTypes: true });
      } catch (e) {
        return send(res, 404, { error: e.message });
      }
      const entries = names
        .map((d) => {
          const entryAbs = path.join(abs, d.name);
          let st = null;
          try {
            st = statSync(entryAbs);
          } catch {
            /* dangling symlink etc — listed, unstatted */
          }
          return {
            name: d.name,
            dir: d.isDirectory(),
            size: st?.isFile() ? st.size : null,
            mtime: st ? st.mtimeMs : null,
            path: relOf(entryAbs),
          };
        })
        .sort((a, b) => (b.dir - a.dir) || a.name.localeCompare(b.name));
      const shown = entries.slice(0, TREE_PAGE);
      return send(res, 200, {
        path: relOf(abs),
        order: "folders first, then name — declared rule",
        total: entries.length,
        shown: shown.length,
        truncated: entries.length > shown.length,
        entries: shown,
      });
    }

    // ---- source: stat + modality. This is "opening" a source and is recorded.
    if (req.method === "GET" && p === "/api/source") {
      const rel = url.searchParams.get("path") ?? "";
      const abs = confine(rel);
      if (!abs) return send(res, 400, { error: "path escapes the browse root" });
      let st;
      try {
        st = statSync(abs);
      } catch (e) {
        return send(res, 404, { error: e.message });
      }
      if (!st.isFile()) return send(res, 400, { error: "not a file" });
      const s = sniff(abs, st.size);
      record("source-open", { path: relOf(abs), bytes: st.size, modality: s.modality });
      return send(res, 200, {
        path: relOf(abs),
        name: path.basename(abs),
        bytes: st.size,
        mtime: st.mtimeMs,
        ext: path.extname(abs).toLowerCase(),
        ...s,
      });
    }

    // ---- raw bytes, with Range for media scrubbing.
    if (req.method === "GET" && p === "/api/raw") {
      const abs = confine(url.searchParams.get("path") ?? "");
      if (!abs) return send(res, 400, { error: "path escapes the browse root" });
      let st;
      try {
        st = statSync(abs);
      } catch (e) {
        return send(res, 404, { error: e.message });
      }
      if (!st.isFile()) return send(res, 400, { error: "not a file" });
      const { mime } = sniff(abs, st.size);
      const range = req.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
      if (range && (range[1] || range[2])) {
        const start = range[1] ? Number(range[1]) : Math.max(0, st.size - Number(range[2]));
        const end = range[1] && range[2] ? Math.min(Number(range[2]), st.size - 1) : st.size - 1;
        if (start >= st.size || end < start) {
          res.writeHead(416, { "content-range": `bytes */${st.size}` });
          return res.end();
        }
        res.writeHead(206, {
          "content-type": mime,
          "content-range": `bytes ${start}-${end}/${st.size}`,
          "accept-ranges": "bytes",
          "content-length": end - start + 1,
          "cache-control": "no-store",
        });
        return createReadStream(abs, { start, end }).pipe(res);
      }
      res.writeHead(200, { "content-type": mime, "content-length": st.size, "accept-ranges": "bytes", "cache-control": "no-store" });
      return createReadStream(abs).pipe(res);
    }

    // ---- hex page: the binary Field surface.
    if (req.method === "GET" && p === "/api/hex") {
      const abs = confine(url.searchParams.get("path") ?? "");
      if (!abs) return send(res, 400, { error: "path escapes the browse root" });
      let st;
      try {
        st = statSync(abs);
      } catch (e) {
        return send(res, 404, { error: e.message });
      }
      const offset = Math.max(0, Math.min(Number(url.searchParams.get("offset") ?? 0) || 0, st.size));
      const length = Math.min(Number(url.searchParams.get("length") ?? HEX_PAGE_DEFAULT) || HEX_PAGE_DEFAULT, HEX_PAGE_MAX, st.size - offset);
      const buf = Buffer.alloc(length);
      if (length > 0) {
        const fd = openSync(abs, "r");
        try {
          readSync(fd, buf, 0, length, offset);
        } finally {
          closeSync(fd);
        }
      }
      const rows = [];
      for (let i = 0; i < buf.length; i += 16) {
        const slice = buf.subarray(i, Math.min(i + 16, buf.length));
        rows.push({
          off: offset + i,
          hex: [...slice].map((b) => b.toString(16).padStart(2, "0")),
          ascii: [...slice].map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : "·")).join(""),
        });
      }
      return send(res, 200, { offset, length, total: st.size, pageMax: HEX_PAGE_MAX, rows });
    }

    // ---- read job: admit + sessionTerrains in a worker. A read is
    // deterministic in the file's content, so a completed job is reused for
    // the same (path, mtime, size) — a re-open reports the same reading
    // rather than re-deriving it (and the reuse is recorded, not silent).
    if (req.method === "POST" && p === "/api/read") {
      const body = await readJsonBody(req);
      const abs = confine(body.path ?? "");
      if (!abs) return send(res, 400, { error: "path escapes the browse root" });
      let st;
      try {
        st = statSync(abs);
      } catch (e) {
        return send(res, 404, { error: e.message });
      }
      const s = sniff(abs, st.size);
      const cacheKey = `${relOf(abs)}·${st.mtimeMs}·${st.size}`;
      const cached = [...jobs.values()].find((j) => j.kind === "read" && j.cacheKey === cacheKey && (j.phase === "done" || j.phase !== "error"));
      if (cached) {
        record("read-reused", { job: cached.id, path: relOf(abs) });
        return send(res, 200, { jobId: cached.id, modality: s.modality, bytes: st.size, reused: true });
      }
      const jobId = startJob("read", { mode: "read", filePath: abs, rel: relOf(abs) }, { path: relOf(abs), bytes: st.size, modality: s.modality });
      jobs.get(jobId).cacheKey = cacheKey;
      return send(res, 200, { jobId, modality: s.modality, bytes: st.size });
    }

    // ---- kinds job: records + induceKinds + deferred null arm in a worker.
    if (req.method === "POST" && p === "/api/kinds") {
      const body = await readJsonBody(req);
      const abs = confine(body.path ?? "");
      if (!abs) return send(res, 400, { error: "path escapes the browse root" });
      let st;
      try {
        st = statSync(abs);
      } catch (e) {
        return send(res, 404, { error: e.message });
      }
      const opts = body.quick === false ? KINDS_THOROUGH : KINDS_QUICK;
      const jobId = startJob("kinds", { mode: "kinds", filePath: abs, rel: relOf(abs), opts }, { path: relOf(abs), bytes: st.size, opts });
      return send(res, 200, { jobId, opts });
    }

    // ---- find: filename search under the browse root (or a subtree).
    if (req.method === "GET" && p === "/api/find") {
      const q = (url.searchParams.get("q") ?? "").toLowerCase().trim();
      if (q.length < 2) return send(res, 400, { error: "query needs at least 2 characters" });
      const startAbs = confine(url.searchParams.get("path") ?? "") ?? BROWSE_ROOT;
      const results = [];
      let visited = 0;
      let truncated = false;
      const walk = (d) => {
        if (results.length >= FIND_MAX_RESULTS || visited >= FIND_MAX_VISITED) {
          truncated = true;
          return;
        }
        let names;
        try {
          names = readdirSync(d, { withFileTypes: true });
        } catch {
          return;
        }
        for (const ent of names) {
          if (results.length >= FIND_MAX_RESULTS || ++visited >= FIND_MAX_VISITED) {
            truncated = true;
            return;
          }
          const abs = path.join(d, ent.name);
          if (ent.isDirectory()) {
            if (!FIND_SKIP.has(ent.name)) walk(abs);
            continue;
          }
          if (ent.name.toLowerCase().includes(q)) {
            let st = null;
            try {
              st = statSync(abs);
            } catch {
              /* dangling */
            }
            results.push({ name: ent.name, path: relOf(abs), dir: false, size: st?.size ?? null, mtime: st?.mtimeMs ?? null });
          }
        }
      };
      walk(startAbs);
      record("find", { q, results: results.length, truncated });
      return send(res, 200, {
        q,
        results,
        truncated,
        visitedCap: FIND_MAX_VISITED,
        skipRule: [...FIND_SKIP].join(", ") + " — a declared rule, dependency and build trees are machinery",
      });
    }

    // ---- peek: the opening characters of a textual file, for preview cards.
    if (req.method === "GET" && p === "/api/peek") {
      const abs = confine(url.searchParams.get("path") ?? "");
      if (!abs) return send(res, 400, { error: "path escapes the browse root" });
      let st;
      try {
        st = statSync(abs);
      } catch (e) {
        return send(res, 404, { error: e.message });
      }
      if (!st.isFile()) return send(res, 400, { error: "not a file" });
      const head = Buffer.alloc(Math.min(st.size, PEEK_CHARS * 4));
      if (head.length) {
        const fd = openSync(abs, "r");
        try {
          readSync(fd, head, 0, head.length, 0);
        } finally {
          closeSync(fd);
        }
      }
      try {
        // lenient tail: a multi-byte char cut at the buffer edge is not binary
        let text = new TextDecoder("utf-8", { fatal: true }).decode(head.subarray(0, head.length - 3));
        if (text.includes(" ")) throw new Error("binary");
        text = text.slice(0, PEEK_CHARS);
        return send(res, 200, { peek: text, of: st.size, truncated: st.size > text.length });
      } catch {
        return send(res, 200, { peek: null, binary: true, of: st.size });
      }
    }

    // ---- fold: an extractive summary of an arbitrary place — whole source,
    // char range, or a word's arrival sentences. Engine-computed, verbatim,
    // addressed; no model. Synchronous (milliseconds) and recorded.
    if (req.method === "POST" && p === "/api/fold") {
      const body = await readJsonBody(req);
      const abs = confine(body.path ?? "");
      if (!abs) return send(res, 400, { error: "path escapes the browse root" });
      let text;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(abs));
      } catch (e) {
        return send(res, 400, { error: `not foldable: ${e.code === "ENOENT" ? e.message : "not valid UTF-8"}` });
      }
      const out = foldExtract({
        text,
        charStart: Number.isInteger(body.c0) ? body.c0 : undefined,
        charEnd: Number.isInteger(body.c1) ? body.c1 : undefined,
        word: typeof body.word === "string" && body.word ? body.word : undefined,
        budgetSentences: FOLD_BUDGET_SENTENCES,
      });
      record("fold", { path: relOf(abs), scope: out.scope ?? null, kept: out.kept ?? 0, of: out.of ?? 0, gap: out.gap ?? null });
      return send(res, 200, { ...out, budget: FOLD_BUDGET_SENTENCES });
    }

    // ---- job poll.
    if (req.method === "GET" && p.startsWith("/api/jobs/")) {
      const job = jobs.get(p.slice("/api/jobs/".length));
      if (!job) return send(res, 404, { error: "no such job" });
      return send(res, 200, {
        kind: job.kind,
        phase: job.phase,
        phases: job.phases,
        partial: job.result ? null : (job.partial ?? null),
        result: job.result,
        nullArm: job.nullArm,
        error: job.error,
        elapsedMs: (job.updatedAt ?? Date.now()) - job.startedAt,
      });
    }

    // ---- deposit: Converse hands a source over so Explore can open it by
    // path. Content-addressed name; append-only in effect (an existing
    // deposit is never overwritten); recorded.
    if (req.method === "POST" && p === "/api/deposit") {
      const body = await readJsonBody(req);
      const { name, text } = body;
      if (typeof text !== "string" || !text.length) return send(res, 400, { error: "text (string) is required" });
      const safe = String(name ?? "deposit.txt").replace(/[^\w.\-]+/g, "_").slice(0, 120) || "deposit.txt";
      const hash = crypto.createHash("sha256").update(text).digest("hex").slice(0, 12);
      const ext = path.extname(safe);
      const file = path.join(MATERIALS_DIR, `${safe.slice(0, safe.length - ext.length)}.${hash}${ext || ".txt"}`);
      const rel = relOf(file);
      const existed = existsSync(file);
      if (!existed) {
        writeFileSync(file, text);
        record("deposit", { path: rel, bytes: Buffer.byteLength(text), from: "converse" });
      }
      return send(res, 200, { path: rel, deduped: existed });
    }

    // ---- library: "My files" — starts empty, holds only what a reader
    // explicitly added (library.js's own header). Three writes, one read.

    // list: the current fold, newest-added first.
    if (req.method === "GET" && p === "/api/library") {
      const { entries, skipped } = readLibrary();
      return send(res, 200, { entries, skipped, total: entries.length });
    }

    // add-ref: index something ALREADY on disk under the browse root — no
    // copy, no bytes moved. A folder may be referenced; browsing into it
    // afterward is a live view of the real contents (the tree endpoints,
    // unchanged), not a second copy of this index.
    if (req.method === "POST" && p === "/api/library/add-ref") {
      const body = await readJsonBody(req);
      const abs = confine(body.path ?? "");
      if (!abs) return send(res, 400, { error: "path escapes the browse root" });
      let st;
      try {
        st = statSync(abs);
      } catch (e) {
        return send(res, 404, { error: e.message });
      }
      const id = crypto.randomUUID();
      const entry = {
        id,
        event: "add",
        kind: "ref",
        name: path.basename(abs),
        path: relOf(abs),
        dir: st.isDirectory(),
        size: st.isFile() ? st.size : null,
        mtime: st.mtimeMs,
        addedAt: new Date().toISOString(),
      };
      appendLibrary(entry);
      record("library-add", { id, kind: "ref", path: entry.path, dir: entry.dir });
      return send(res, 200, { entry });
    }

    // upload: real bytes from anywhere on the reader's OS — the browser's
    // own native file picker or a drag-drop, which never touches the
    // confined browse root until the bytes are already here. One file per
    // request (no multipart parser; a dependency this server has declared
    // it will not carry), named by X-File-Name, stored content-addressed
    // under library/files/ — itself inside the browse root, so every
    // existing read path (raw/peek/source) already knows how to serve it.
    if (req.method === "POST" && p === "/api/library/upload") {
      const rawName = req.headers["x-file-name"];
      if (!rawName) return send(res, 400, { error: "X-File-Name header is required" });
      let buf;
      try {
        buf = await readRawBody(req, LIBRARY_UPLOAD_MAX_BYTES);
      } catch (e) {
        return send(res, e.code === "TOO_LARGE" ? 413 : 400, { error: e.message });
      }
      if (!buf.length) return send(res, 400, { error: "empty upload" });
      let decodedName;
      try {
        decodedName = decodeURIComponent(String(rawName));
      } catch {
        decodedName = String(rawName);
      }
      const name = sanitizeFileName(decodedName);
      const hash = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16);
      const ext = path.extname(name);
      const base = ext ? name.slice(0, -ext.length) : name;
      const fileAbs = path.join(LIBRARY_FILES_DIR, `${base}.${hash}${ext}`);
      mkdirSync(LIBRARY_FILES_DIR, { recursive: true });
      const existed = existsSync(fileAbs);
      if (!existed) writeFileSync(fileAbs, buf);
      const id = crypto.randomUUID();
      const entry = {
        id,
        event: "add",
        kind: "upload",
        name,
        path: relOf(fileAbs),
        dir: false,
        size: buf.length,
        mtime: Date.now(),
        addedAt: new Date().toISOString(),
      };
      appendLibrary(entry);
      record("library-upload", { id, path: entry.path, bytes: buf.length, deduped: existed });
      return send(res, 200, { entry });
    }

    // remove: unlist an entry. Never deletes the underlying bytes — a
    // reference never owned them, and an upload's bytes may be exactly the
    // ones a still-open read is showing; the one deliberate deletion this
    // server performs is /api/web/clear, a different store with a
    // different, explicit "empty my history" contract.
    if (req.method === "POST" && p === "/api/library/remove") {
      const body = await readJsonBody(req);
      if (typeof body.id !== "string" || !body.id) return send(res, 400, { error: "id (string) is required" });
      appendLibrary({ id: body.id, event: "remove", removedAt: new Date().toISOString() });
      record("library-remove", { id: body.id });
      return send(res, 200, { removed: body.id });
    }

    // ---- priors: the corpus, its toggle state, and its papers. Listing is
    // display (like /api/tree); a TOGGLE and a DOC OPEN are computed events
    // and land on the record. The ledger is append-only in operation; the
    // current state is the fold; the most specific declaration decides.

    // the fold: declarations + the walk's per-genre counts, one call.
    if (req.method === "GET" && p === "/api/priors") {
      if (!existsSync(PRIORS_ROOT)) {
        return send(res, 200, { gap: { silence: "not-present", detail: `live_priors is not beside this repo (looked at ${PRIORS_ROOT})` } });
      }
      const { byPath, skipped } = readPriorToggles();
      const { categories, enabled, files, truncated } = walkPriors(byPath);
      return send(res, 200, {
        root: relOf(PRIORS_ROOT),
        declarations: declarationRows(byPath),
        ledgerSkipped: skipped,
        categories,
        files,
        enabledCount: enabled.length,
        truncated,
        walkCap: PRIORS_WALK_MAX,
        machineryRule: [...PRIORS_SKIP].join(", ") + " and top-level loose files — the corpus's own machinery and papers, not documents in it",
      });
    }

    // toggle: one line on the ledger, at whatever level the reader means —
    // "" is the whole corpus, a folder is a genre or a source collection, a
    // file is one document. The level must exist: a toggle on a typo would
    // fold forever and govern nothing.
    if (req.method === "POST" && p === "/api/priors/toggle") {
      const body = await readJsonBody(req);
      if (typeof body.on !== "boolean") return send(res, 400, { error: "on (boolean) is required" });
      const rel = normalizePriorPath(body.path ?? "");
      const abs = confinePrior(rel);
      if (!abs) return send(res, 400, { error: "path escapes the corpus" });
      if (!existsSync(abs)) return send(res, 404, { error: `no such path in the corpus: ${rel || "(root)"}` });
      const entry = { path: rel, on: body.on, at: new Date().toISOString() };
      appendPriorToggle(entry);
      record("prior-toggle", { path: rel || "(root)", on: body.on });
      const { byPath } = readPriorToggles();
      return send(res, 200, { entry, declarations: declarationRows(byPath) });
    }

    // doc: one document a request named — its papers (frontmatter, parsed
    // mechanically), its effective toggle state with the level that decided
    // it, and (with ?text=1) the text itself, so a chat attachment is one
    // crossing. The open is recorded WITH the document's own source URL:
    // the record answers "says who", not just "which file".
    if (req.method === "GET" && p === "/api/priors/doc") {
      const rel = normalizePriorPath(url.searchParams.get("path") ?? "");
      const abs = confinePrior(rel);
      if (!abs) return send(res, 400, { error: "path escapes the corpus" });
      let st;
      try {
        st = statSync(abs);
      } catch (e) {
        return send(res, 404, { error: e.message });
      }
      if (!st.isFile()) return send(res, 400, { error: "not a file — toggle a folder, read a document" });
      let text;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(abs));
      } catch {
        record("prior-open", { path: rel, bytes: st.size, gap: "binary" });
        return send(res, 200, {
          path: rel,
          browsePath: relOf(abs),
          name: path.basename(abs),
          bytes: st.size,
          gap: { silence: "beyond-reach", detail: "not valid UTF-8 — the bytes are servable raw, but papers and text need a text face" },
        });
      }
      const { provenance, line, bodyStart } = papersOf(text);
      const { byPath } = readPriorToggles();
      const eff = effectivePrior(byPath, rel);
      record("prior-open", { path: rel, bytes: st.size, on: eff.on, source: provenance?.url ?? null });
      return send(res, 200, {
        path: rel,
        browsePath: relOf(abs),
        name: path.basename(abs),
        bytes: st.size,
        chars: text.length,
        provenance,
        provenanceLine: line,
        bodyStart,
        enabled: eff,
        ...(url.searchParams.get("text") === "1" ? { text } : {}),
      });
    }

    // enabled: the flat list of documents currently in play — what the chat's
    // "already here" door offers. Display, not a record event; the crossing
    // that matters (a doc actually read) is recorded by /api/priors/doc.
    if (req.method === "GET" && p === "/api/priors/enabled") {
      if (!existsSync(PRIORS_ROOT)) {
        return send(res, 200, { entries: [], gap: { silence: "not-present", detail: "live_priors is not beside this repo" } });
      }
      const { byPath } = readPriorToggles();
      const { enabled, truncated } = walkPriors(byPath);
      return send(res, 200, { entries: enabled, total: enabled.length, truncated });
    }

    // ---- the check: the reference library as the grounding ladder's FREE
    // tier. A claim (the same {kind, text, tokens, sentence} shape
    // /api/web/primary takes) is judged against live_priors with ZERO
    // egress — no crossing, no consent to spend — which is why a chip flow
    // can consult the library BEFORE the web and spend P13's crossing only
    // on what the shelf leaves unsettled. The pure half (priors.js) parses
    // the provenance frontmatter, orders candidates mechanically and snips
    // the claim; this half owns only the reads, confined to PRIORS_ROOT.
    // FULL PROVENANCE (user direction 2026-08-17): every document in the
    // answer carries its publisher frontmatter (official URL, department,
    // date, status) and every snip its self-verified offsets into the
    // file's own chars — a count with no addresses behind it would be
    // knowledge from nowhere wearing a library card.
    //
    // Selection, measured (2026-08-17, this machine): 2,047 documents,
    // 183.4MB. Listing is ~20ms warm and reading every byte ~1.1s, but the
    // sentence walk over the whole corpus is ~9s per claim — not an
    // interactive check — so candidates are ordered mechanically (claim-word
    // overlap with filename + title, then the claim's category ladder, then
    // path order) and consultation is bounded by PRIORS_DOCS_CONSULTED with
    // the true candidate count on the result. A PROPER index would be
    // eoreader6 host ingestion (createSession/admitChunked, searchSpans —
    // the same {byte_start, byte_end} address shape this repo's refs use):
    // at the engine's measured 8.4s per 3.3MB, admitting 183MB is a
    // minutes-long one-time build whose persistence and staleness story
    // this server does not own — named future work, not half-built here.
    if (req.method === "POST" && p === "/api/priors/check") {
      const body = await readJsonBody(req);
      const c = body.claim ?? {};
      const tokens = Array.isArray(c.tokens) ? c.tokens.map(String).filter(Boolean) : [];
      const claim = {
        kind: typeof c.kind === "string" ? c.kind : "name",
        text: String(c.text ?? "").trim(),
        tokens: tokens.length ? tokens : String(c.text ?? "").split(/\s+/).filter(Boolean),
        sentence: String(c.sentence ?? ""),
      };
      if (!claim.tokens.length) return send(res, 400, { error: "claim needs tokens or text — the check judges the claim's own words, never a paraphrase" });
      const listing = listPriorDocuments();
      if (!listing) {
        record("priors-check", { claim: claim.text || claim.tokens.join(" "), consulted: 0, stating: 0, gap: "not-present" });
        return send(res, 200, {
          ...foldPriors(claim, {}),
          gap: { silence: "not-present", detail: `live_priors is not beside this repo (looked at ${PRIORS_ROOT})` },
        });
      }
      // The gate (closes the limit this repo's own notes named as future
      // work: "toggles gate the OFFER surface... the checking tier reads
      // the corpus directly"). Same ledger, same effectivePrior most-
      // specific-wins resolution walkPriors already uses for the picker —
      // one reading of "is this document in play", applied here too, so a
      // toggle now changes what the surf actually consults, not just what
      // the tab offers to attach.
      const { byPath } = readPriorToggles();
      const gated = listing.entries.filter((e) => effectivePrior(byPath, e.path).on);
      const ranked = rankPriorCandidates(claim, gated);
      const documents = [];
      for (const cand of ranked.slice(0, PRIORS_DOCS_CONSULTED)) {
        // The path came from this server's own walk, never from the request;
        // the confinement is restated where the read happens all the same.
        const abs = path.join(PRIORS_ROOT, cand.path);
        if (!abs.startsWith(PRIORS_ROOT + path.sep)) continue;
        let raw;
        try {
          raw = readFileSync(abs, "utf8");
        } catch (e) {
          // a file the walk saw and the read lost (moved, no longer UTF-8) —
          // a typed gap on that document, never a dropped row
          documents.push({ path: cand.path, category: cand.category, title: cand.title ?? null, stating: false, snipsFound: 0, snips: [], source: {}, gap: { silence: "not-present", detail: e.message } });
          continue;
        }
        documents.push(checkPrior(claim, readPriorDocument(cand.path, raw)));
      }
      const folded = foldPriors(claim, { candidates: ranked.length, documents });
      record("priors-check", { claim: claim.text || claim.tokens.join(" "), kind: claim.kind, candidates: ranked.length, consulted: folded.consulted, stating: folded.stating, corpusEnabled: gated.length, corpusTotal: listing.entries.length });
      return send(res, 200, {
        ...folded,
        // Stated plainly rather than left implicit: how many of the corpus's
        // documents were even eligible to be a candidate this time, per the
        // toggle ledger — the number a reader needs to tell "the shelf said
        // nothing" apart from "the shelf was switched off".
        gate: { enabled: gated.length, total: listing.entries.length },
        ...(listing.truncated ? { walkTruncated: true, walkCap: PRIORS_WALK_MAX } : {}),
      });
    }

    // ---- priors surface search: find which enabled priors docs mention
    // any of the given surface names (case-insensitive substring). Returns
    // matching passages per surface, with provenance. Used by Layer 2
    // priors-coref in the transcription pipeline — the engine's own
    // namesCorefer confirms identity on the client side.
    if (req.method === "POST" && p === "/api/priors/surfaces") {
      const body = await readJsonBody(req);
      const surfaces = Array.isArray(body.surfaces) ? body.surfaces.map(String).filter(Boolean) : [];
      if (!surfaces.length) return send(res, 400, { error: "surfaces (array of strings) is required" });
      const listing = listPriorDocuments();
      if (!listing) {
        record("priors-surfaces", { surfaces: surfaces.length, consulted: 0, matches: 0, gap: "not-present" });
        return send(res, 200, { matches: [], gate: { enabled: 0, total: 0 }, gap: { silence: "not-present", detail: `live_priors is not beside this repo (looked at ${PRIORS_ROOT})` } });
      }
      const { byPath } = readPriorToggles();
      const gated = listing.entries.filter((e) => effectivePrior(byPath, e.path).on);
      const surfaceLower = surfaces.map((s) => ({ original: s, folded: s.toLowerCase() }));
      const matches = new Map();
      let consulted = 0;
      const DOCS_MAX = 60;
      for (const entry of gated.slice(0, DOCS_MAX)) {
        const abs = path.join(PRIORS_ROOT, entry.path);
        if (!abs.startsWith(PRIORS_ROOT + path.sep)) continue;
        let raw;
        try { raw = readFileSync(abs, "utf8"); } catch { continue; }
        const doc = readPriorDocument(entry.path, raw);
        if (!doc?.text) continue;
        consulted++;
        const textLower = doc.text.toLowerCase();
        for (const { original, folded } of surfaceLower) {
          const idx = textLower.indexOf(folded);
          if (idx === -1) continue;
          const sentStart = doc.text.lastIndexOf(".", idx) + 1;
          const sentEnd = doc.text.indexOf(".", idx);
          const passage = doc.text.slice(sentStart, sentEnd === -1 ? idx + 200 : sentEnd + 1).trim();
          if (!matches.has(original)) matches.set(original, []);
          matches.get(original).push({
            passage: passage.slice(0, 300),
            path: entry.path,
            title: doc.title ?? null,
            source: doc.source ?? {},
            offset: doc.offset + sentStart,
          });
        }
      }
      const result = [...matches.entries()].map(([surface, passages]) => ({ surface, passages: passages.slice(0, 5) }));
      record("priors-surfaces", { surfaces: surfaces.length, consulted, matches: result.length, corpusEnabled: gated.length, corpusTotal: listing.entries.length });
      return send(res, 200, {
        matches: result,
        gate: { enabled: gated.length, total: listing.entries.length },
        ...(listing.truncated ? { walkTruncated: true, walkCap: PRIORS_WALK_MAX } : {}),
      });
    }

    // ---- web search: one query, one request to the no-key endpoint. The
    // endpoint's bot-challenge page is a typed refusal (P4: gaps are
    // results), never an empty success. Found vs shown is reported.
    // ---- seed scrub: find existing open work before the model builds its
    // own (the CRISPR rung, user-directed 2026-08-17), and ingest arbitrary
    // repos with provenance. One new egress DESTINATION — api.github.com +
    // raw.githubusercontent.com — sanctioned by P13 amendment: server-only,
    // every crossing recorded, rate-limit refusals typed. The GitHub API's
    // license.spdx_id is the mechanical license signal; provenance is
    // carried whatever the signal says.
    if (req.method === "POST" && p === "/api/seed/search") {
      const body = await readJsonBody(req);
      const query = String(body.query ?? "").trim();
      const lang = String(body.lang ?? "").trim() || null;
      if (!query) return send(res, 400, { error: "query (string) is required" });
      let gh;
      try {
        gh = await fetchCapped(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=5`);
      } catch (e) {
        record("seed-search", { query, gap: "unreachable", detail: e.message });
        return send(res, 200, { query, gap: { silence: "unreachable", detail: e.message } });
      }
      if (gh.res.status === 403 || gh.res.status === 429) {
        record("seed-search", { query, gap: "refused-upstream" });
        return send(res, 200, { query, gap: { silence: "refused-upstream", detail: "GitHub's search rate limit (10/min unauthenticated) declined this machine; try again shortly" } });
      }
      let items = [];
      try { items = JSON.parse(gh.buf.toString("utf8")).items ?? []; } catch { /* falls through to none */ }
      const candidates = items.map((it) => ({
        repo: it.full_name,
        url: it.html_url,
        description: it.description ?? null,
        stars: it.stargazers_count ?? 0,
        license: it.license?.spdx_id ?? null,
        grade: gradeLicense(it.license?.spdx_id).grade,
      }));
      record("seed-search", { query, found: items.length });
      // Splice automatically only from a known-permissive license AND an
      // unambiguous single file of the asked language — anything else is
      // an offer, never a silent splice.
      const auto = lang ? candidates.find((c) => c.grade === "seedable") : null;
      if (auto) {
        try {
          const listing = await fetchCapped(`https://api.github.com/repos/${auto.repo}/contents`);
          const entries = JSON.parse(listing.buf.toString("utf8"));
          const file = pickSeedFile(entries, lang);
          if (file?.url) {
            const raw = await fetchCapped(file.url, { maxBytes: INGEST_MAX_BYTES });
            const provenance = seedProvenance({ repo: auto.repo, path: file.path, url: `${auto.url}/blob/HEAD/${file.path}`, license: auto.license, stars: auto.stars, retrievedAt: new Date().toISOString() });
            record("seed-splice", { query, repo: auto.repo, path: file.path, license: auto.license, bytes: raw.buf.length });
            return send(res, 200, { query, candidates, seed: { code: raw.buf.toString("utf8"), lang: file.lang, provenance } });
          }
          record("seed-search", { query, repo: auto.repo, gap: "no-single-file" });
        } catch (e) {
          record("seed-search", { query, repo: auto.repo, gap: "fetch-failed", detail: e.message });
        }
      }
      return send(res, 200, { query, candidates });
    }

    // ---- repo ingestion: /ingest <owner/name> — every admissible file
    // becomes a fold with shared provenance; budgets declared and counted
    // (seed.js), the drop stated, never silent. No model call anywhere.
    if (req.method === "POST" && p === "/api/seed/ingest") {
      const body = await readJsonBody(req);
      const repo = String(body.repo ?? "").trim();
      if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return send(res, 400, { error: "repo (owner/name) is required" });
      let meta = null;
      try {
        const m = await fetchCapped(`https://api.github.com/repos/${repo}`);
        if (m.res.status === 403 || m.res.status === 429) {
          record("seed-ingest", { repo, gap: "refused-upstream" });
          return send(res, 200, { repo, gap: { silence: "refused-upstream", detail: "GitHub's rate limit declined this machine; try again shortly" } });
        }
        if (m.res.status === 404) {
          record("seed-ingest", { repo, gap: "not-present" });
          return send(res, 200, { repo, gap: { silence: "not-present", detail: `github.com/${repo} answered 404` } });
        }
        meta = JSON.parse(m.buf.toString("utf8"));
      } catch (e) {
        record("seed-ingest", { repo, gap: "unreachable", detail: e.message });
        return send(res, 200, { repo, gap: { silence: "unreachable", detail: e.message } });
      }
      const license = meta?.license?.spdx_id ?? null;
      let entries = [];
      try {
        const listing = await fetchCapped(`https://api.github.com/repos/${repo}/contents`);
        entries = JSON.parse(listing.buf.toString("utf8"));
      } catch (e) {
        record("seed-ingest", { repo, gap: "unreachable", detail: e.message });
        return send(res, 200, { repo, gap: { silence: "unreachable", detail: e.message } });
      }
      const admitted = admissibleFiles(entries);
      const files = [];
      for (const f of admitted.files) {
        if (!f.url) continue;
        try {
          const raw = await fetchCapped(f.url, { maxBytes: INGEST_MAX_BYTES });
          files.push({
            path: f.path,
            lang: f.lang,
            code: raw.buf.toString("utf8"),
            provenance: seedProvenance({ repo, path: f.path, url: `${meta.html_url}/blob/HEAD/${f.path}`, license, stars: meta.stargazers_count ?? null, retrievedAt: new Date().toISOString() }),
          });
        } catch (e) {
          files.push({ path: f.path, lang: f.lang, gap: { silence: "unreachable", detail: e.message } });
        }
      }
      record("seed-ingest", { repo, license, admitted: admitted.files.length, of: admitted.of, fetched: files.filter((x) => x.code).length });
      return send(res, 200, {
        repo,
        url: meta.html_url,
        license,
        grade: gradeLicense(license).grade,
        files,
        admitted: { kept: admitted.files.length, of: admitted.of, dropped: admitted.dropped },
      });
    }

    if (req.method === "POST" && p === "/api/web/search") {
      const body = await readJsonBody(req);
      const query = String(body.query ?? "").trim();
      if (!query) return send(res, 400, { error: "query (string) is required" });
      const endpoints = [
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
        `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`,
      ];
      let blocked = false;
      let results = null;
      let failure = null;
      for (const ep of endpoints) {
        try {
          const { res: r, buf } = await fetchCapped(ep);
          const parsed = parseSearchResults(buf.toString("utf8"));
          if (parsed.blocked) {
            blocked = true;
            continue;
          }
          if (parsed.offEndpoint || r.status >= 400) {
            failure = `the endpoint answered ${r.status} with something other than its results page`;
            continue;
          }
          results = parsed.results;
          break;
        } catch (e) {
          failure = e.message;
        }
      }
      if (!results) {
        const gap = blocked
          ? { silence: "refused-upstream", detail: "the search endpoint answered with its bot-challenge page — it declined this machine; the organ did not fail and the query was not silently empty" }
          : { silence: "not-present", detail: failure ?? "no search endpoint answered" };
        record("web-search", { query, gap: gap.silence });
        return send(res, 200, { query, engine: "duckduckgo html/lite (no key)", gap });
      }
      const shown = results.slice(0, WEB_SEARCH_MAX_RESULTS);
      record("web-search", { query, found: results.length, shown: shown.length });
      return send(res, 200, {
        query,
        engine: "duckduckgo html/lite (no key)",
        found: results.length,
        shown: shown.length,
        truncated: results.length > shown.length,
        results: shown,
      });
    }

    // ---- web fetch: read ONE page the request names. The whole response is
    // kept (content-addressed under web/pages/), the readable face is
    // extracted and kept beside it, salience is the fold over that face
    // (kept-of-N declared), and the visit lands in web/history.jsonl with
    // its retrieval date — a browser history that actually holds the pages.
    // With the archive setting on, Save Page Now runs deferred and patches
    // the entry when the snapshot has a name.
    if (req.method === "POST" && p === "/api/web/fetch") {
      const body = await readJsonBody(req);
      const url = normalizeUrl(body.url);
      if (!url) return send(res, 400, { error: "url must be http(s), not loopback — the tree already serves local files" });
      const got = await fetchAndKeep(url, { forceArchive: !!body.archive });
      if (got.gap) return send(res, 200, { url, gap: got.gap });
      return send(res, 200, { entry: got.entry, fold: got.fold });
    }

    // ---- the primary-source walk: Wikipedia as a stepping stone, never a
    // source of record. Given a claim and a SAVED Wikipedia page's raw HTML
    // face, the pure half (primary.js) extracts the article's outbound
    // citations and orders them for the claim; this route then reads the top
    // candidates through the SAME fetch pipeline as any other page — each
    // crossing saved, historied and recorded like any fetch — and snips the
    // claim against each saved face: verbatim sentences with char offsets
    // into content-addressed bytes. Sequential, never a burst; bounded by
    // PRIMARY_SOURCES_CONSULTED (giver: proof.js PROOF_PAGES_CONSULTED).
    // This stands on P13's proof-seeking amendment — pages chosen by the
    // article's own ranked citations instead of ranked search results, same
    // bound, same record, same typed gaps.
    if (req.method === "POST" && p === "/api/web/primary") {
      const body = await readJsonBody(req);
      const c = body.claim ?? {};
      const tokens = Array.isArray(c.tokens) ? c.tokens.map(String).filter(Boolean) : [];
      const claim = {
        kind: typeof c.kind === "string" ? c.kind : "name",
        text: String(c.text ?? "").trim(),
        tokens: tokens.length ? tokens : String(c.text ?? "").split(/\s+/).filter(Boolean),
        sentence: String(c.sentence ?? ""),
      };
      if (!claim.tokens.length) return send(res, 400, { error: "claim needs tokens or text — the walk judges the claim's own words, never a paraphrase" });
      const abs = confine(String(body.wikiPath ?? ""));
      if (!abs || !abs.startsWith(WEB_PAGES_DIR + path.sep)) {
        return send(res, 400, { error: "wikiPath must name a saved page under the web store (web/pages/…) — the walk starts from bytes already kept" });
      }
      if (!existsSync(abs)) return send(res, 404, { error: "no such saved page" });
      const citations = extractCitations(readFileSync(abs, "utf8"));
      const ranked = rankPrimary(claim, citations);
      const consulted = [];
      for (const cand of ranked.slice(0, PRIMARY_SOURCES_CONSULTED)) {
        // sequential by construction — each fetch completes (and lands on
        // history and the record) before the next candidate is touched
        let got = await fetchAndKeep(cand.url);
        let archivedCopy = false;
        if (got.gap && cand.archiveUrl) {
          // the wrapper exists because the target link was dying; the
          // archive copy is the disclosed fallback, never the silent default
          got = await fetchAndKeep(cand.archiveUrl);
          archivedCopy = true;
        }
        const base = { url: cand.url, host: cand.host, structuralClass: cand.structuralClass, citation: cand.text || null, ...(archivedCopy ? { archivedCopy: true } : {}) };
        if (got.gap) {
          consulted.push({ ...base, gap: got.gap });
          continue;
        }
        if (got.text == null) {
          // bytes kept, no text face (a PDF, an image): snipping is beyond
          // this organ's reach — a typed limit, never "the source is silent"
          consulted.push({
            ...base,
            title: got.entry.title,
            rawPath: got.entry.rawPath,
            gap: { silence: "beyond-reach", detail: `the saved face is ${got.entry.contentType || "binary"} — snipping needs a text face; the bytes are kept at ${got.entry.rawPath}` },
          });
          continue;
        }
        const snips = snipClaim(claim, got.text, { facePath: got.entry.textPath, url: got.entry.finalUrl, host: cand.host });
        consulted.push({
          ...base,
          title: got.entry.title,
          textPath: got.entry.textPath,
          textChars: got.entry.textChars, // a 200-char face is a bot shell wearing a 200 status — the size lets the reader see that (measured live 2026-08-17: muse.jhu.edu and doi.org both served ~206-char shells)
          ...(got.entry.challenge ? { challenge: true } : {}),
          snipsFound: snips.length,
          snips: snips.slice(0, PRIMARY_SNIPS_KEPT), // kept-of-N: snipsFound states the truth, the face keeps every sentence
        });
      }
      const folded = foldPrimary(claim, { citationsFound: citations.length, consulted });
      record("web-primary", {
        wikiPath: body.wikiPath,
        claim: claim.text || claim.tokens.join(" "),
        kind: claim.kind,
        citationsFound: citations.length,
        consulted: consulted.length,
        verdict: folded.verdict,
      });
      return send(res, 200, { wikiPath: body.wikiPath, ...folded });
    }

    // ---- web history: the fold over history.jsonl, newest first, with the
    // settings riding along so the view needs one call. Reading it is
    // display, not computation — like /api/tree, it is not a record event.
    if (req.method === "GET" && p === "/api/web/history") {
      const jsonl = existsSync(WEB_HISTORY_PATH) ? readFileSync(WEB_HISTORY_PATH, "utf8") : "";
      const { entries, skipped } = foldWebHistory(jsonl);
      return send(res, 200, { path: relOf(WEB_HISTORY_PATH), total: entries.length, skipped, settings: webSettings(), entries });
    }

    // ---- web settings: today one switch — submit each fetched page to
    // archive.org's Save Page Now for a stable public snapshot. Off by
    // default: the fetch itself is private; the archive crossing is not.
    if (req.method === "POST" && p === "/api/web/settings") {
      const body = await readJsonBody(req);
      const next = { ...webSettings(), ...(typeof body.archiveOrg === "boolean" ? { archiveOrg: body.archiveOrg } : {}) };
      mkdirSync(WEB_DIR, { recursive: true });
      writeFileSync(WEB_SETTINGS_PATH, JSON.stringify(next, null, 2) + "\n");
      record("web-settings", next);
      return send(res, 200, next);
    }

    // ---- web clear: the one deliberate deletion this server performs —
    // the user emptying their own page history (one entry by id, or all of
    // it). Saved content is content-addressed and may be shared between
    // visits, so a file is removed only when no kept entry still names it.
    // The clearing itself is recorded in record/ — the history store is
    // clearable, the fact that it was cleared is not.
    if (req.method === "POST" && p === "/api/web/clear") {
      const body = await readJsonBody(req);
      const jsonl = existsSync(WEB_HISTORY_PATH) ? readFileSync(WEB_HISTORY_PATH, "utf8") : "";
      const { entries } = foldWebHistory(jsonl);
      const victims = body.id ? entries.filter((e) => e.id === body.id) : entries;
      if (body.id && !victims.length) return send(res, 404, { error: "no such history entry" });
      const kept = body.id ? entries.filter((e) => e.id !== body.id) : [];
      const keptFiles = new Set(kept.flatMap((e) => [e.rawPath, e.textPath].filter(Boolean)));
      const removed = new Set();
      let bytes = 0;
      for (const e of victims) {
        for (const relFile of [e.rawPath, e.textPath]) {
          if (!relFile || keptFiles.has(relFile) || removed.has(relFile)) continue;
          const abs = confine(relFile);
          if (!abs || !abs.startsWith(WEB_PAGES_DIR + path.sep)) continue; // the organ deletes only inside its own store
          removed.add(relFile);
          try {
            bytes += statSync(abs).size;
            rmSync(abs);
          } catch {
            /* already gone */
          }
        }
      }
      if (kept.length) {
        writeFileSync(WEB_HISTORY_PATH, kept.map((e) => JSON.stringify(e)).join("\n") + "\n");
      } else {
        rmSync(WEB_HISTORY_PATH, { force: true });
      }
      record("web-clear", { scope: body.id ?? "all", entries: victims.length, files: removed.size, bytes });
      return send(res, 200, { cleared: victims.length, files: removed.size, bytes, remaining: kept.length });
    }

    // ---- the GitHub organ. Device flow relayed via n8n (github.com's token
    // endpoint has no CORS headers, so even a server-to-server proxy is the
    // only browser-reachable shape); Contents API read/write server-side so
    // the access token never appears in a URL the browser holds in history.
    // The token travels in the POST body from client to this server — the
    // same posture the priors/library routes already take with their own
    // request bodies; nothing here persists the token, the client does
    // (localStorage, github-pane.js's concern).
    if (req.method === "POST" && p === "/api/github/device-code") {
      try {
        const r = await fetch(GITHUB_DEVICE_CODE_RELAY_URL, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify(buildDeviceCodeBody()),
        });
        const data = await r.json();
        record("github-device-code", { ok: r.ok, hasCode: Boolean(data?.device_code) });
        return send(res, 200, data);
      } catch (e) {
        return send(res, 502, { error: e.message });
      }
    }

    if (req.method === "POST" && p === "/api/github/access-token") {
      const body = await readJsonBody(req);
      if (!body.device_code) return send(res, 400, { error: "device_code is required" });
      try {
        const r = await fetch(GITHUB_ACCESS_TOKEN_RELAY_URL, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify(buildAccessTokenBody(body.device_code)),
        });
        const data = await r.json();
        // a pending poll is not an event worth a record line — every 5s of
        // waiting would otherwise flood the record with nothing that happened
        if (data?.access_token || (data?.error && data.error !== "authorization_pending")) {
          record("github-access-token", { ok: Boolean(data?.access_token), error: data?.error ?? null });
        }
        return send(res, 200, data);
      } catch (e) {
        return send(res, 502, { error: e.message });
      }
    }

    // ---- Contents API read: a file OR a directory listing (owner/repo/path
    // named by the request; path "" reads the repo root). token travels in
    // the body, never the query string.
    if (req.method === "POST" && p === "/api/github/contents/read") {
      const body = await readJsonBody(req);
      const { owner, repo, token } = body;
      const contentsPath = body.path ?? "";
      if (!owner || !repo || !token) return send(res, 400, { error: "owner, repo, and token are required" });
      try {
        const r = await fetch(contentsUrl({ owner, repo, path: contentsPath }), {
          headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json" },
        });
        if (r.status === 404) {
          record("github-read", { owner, repo, path: contentsPath, found: false });
          return send(res, 200, { exists: false });
        }
        if (!r.ok) return send(res, r.status, { error: `GitHub read failed: ${r.status}` });
        const data = await r.json();
        const decoded = decodeContentsGet(data);
        record("github-read", { owner, repo, path: contentsPath, found: true, isDirectory: Boolean(decoded.isDirectory) });
        return send(res, 200, decoded);
      } catch (e) {
        return send(res, 502, { error: e.message });
      }
    }

    // ---- Contents API write: create or update one file. A 409 means the
    // sha the caller held is stale — reported as a typed conflict so
    // github-pane.js's retry (re-read the sha, try again, bounded by
    // MAX_CONFLICT_RETRIES) stays a client-side loop, not a server-side guess.
    if (req.method === "POST" && p === "/api/github/contents/write") {
      const body = await readJsonBody(req);
      const { owner, repo, token, content } = body;
      const contentsPath = body.path;
      if (!owner || !repo || !token || !contentsPath || content == null) {
        return send(res, 400, { error: "owner, repo, path, token, and content are required" });
      }
      try {
        const r = await fetch(contentsUrl({ owner, repo, path: contentsPath }), {
          method: "PUT",
          headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "content-type": "application/json" },
          body: JSON.stringify(buildContentsWriteBody({ content, sha: body.sha, message: body.message })),
        });
        if (r.status === 409) {
          record("github-write", { owner, repo, path: contentsPath, conflict: true });
          return send(res, 409, { ok: false, conflict: true });
        }
        if (!r.ok) {
          const detail = await r.text().catch(() => "");
          record("github-write", { owner, repo, path: contentsPath, ok: false, status: r.status });
          return send(res, 200, { ok: false, conflict: false, status: r.status, detail: detail.slice(0, 300) });
        }
        const data = await r.json();
        const decoded = decodeContentsWrite(data);
        record("github-write", { owner, repo, path: contentsPath, ok: true });
        return send(res, 200, { ok: true, sha: decoded.sha });
      } catch (e) {
        return send(res, 502, { error: e.message });
      }
    }

    // ---- the local skill library, for the "push skills" action: what this
    // machine already has, so github-pane.js can push only what a connected
    // repo does not. Reads skill-runner.mjs's own persistence directly — no
    // network, this is local disk, same posture as /api/library.
    if (req.method === "GET" && p === "/api/skills") {
      let names = [];
      try {
        names = readdirSync(SKILLS_DIR).filter((n) => n.endsWith(".json"));
      } catch {
        /* no skills admitted yet */
      }
      const skills = [];
      for (const name of names) {
        try {
          const skill = JSON.parse(readFileSync(path.join(SKILLS_DIR, name), "utf8"));
          skills.push({ digest: name.slice(0, -".json".length), skill });
        } catch {
          /* a file that no longer parses is not this route's problem to fix */
        }
      }
      return send(res, 200, { skills });
    }

    // ---- import ONE skill pulled from a connected repo into the local
    // library. The digest is RECOMPUTED from the mechanism (skills.js's own
    // identity — canonSkill excludes provenance) rather than trusted from
    // the filename, so a skill imported from GitHub is admitted the same
    // way skill-runner.mjs's saveSkill would name it, never a foreign claim.
    if (req.method === "POST" && p === "/api/skills/import") {
      const body = await readJsonBody(req);
      const skill = body.skill;
      if (!skill || typeof skill !== "object") return send(res, 400, { error: "skill (object) is required" });
      let digest;
      try {
        digest = await skillDigest(skill);
      } catch (e) {
        return send(res, 400, { error: `could not compute the skill's digest: ${e.message}` });
      }
      mkdirSync(SKILLS_DIR, { recursive: true });
      const dest = path.join(SKILLS_DIR, `${digest}.json`);
      const already = existsSync(dest);
      if (!already) writeFileSync(dest, JSON.stringify(skill, null, 2) + "\n");
      record("skill-import", { digest, already });
      return send(res, 200, { digest, imported: !already });
    }

    // ---- the wheel organ (P21): fetch a name from pyodide's own vetted
    // build, sha256-verified, onto local disk — see the block above
    // fetchAndKeep for the full design. Recorded before the fetch begins
    // (a name outside the lock, or one already fully vendored, never
    // touches the network at all) and again once it resolves or fails.
    if (req.method === "POST" && p === "/api/wheels/install") {
      const body = await readJsonBody(req);
      const name = String(body.name ?? "").trim();
      if (!name) return send(res, 400, { error: "name is required" });
      let lock, version;
      try {
        version = pyodideVersion();
        lock = pyodideLock();
      } catch (e) {
        return send(res, 200, { name, gap: { silence: "not-present", detail: `this checkout's pyodide vendor is incomplete: ${e.message}` } });
      }
      const closure = wheelClosure(name, lock);
      if (!closure) {
        record("wheel-install-refused", { name, reason: "not-in-lock" });
        return send(res, 200, { name, gap: { silence: "not-present", detail: `"${name}" is not one of this pyodide build's ${Object.keys(lock).length} vetted packages — arbitrary PyPI is a separate, not-yet-built tier (P21's disclosed limit), not a silent miss` } });
      }
      const need = closure.wheels.filter((w) => !existsSync(path.join(PYODIDE_DIR, w.file_name)));
      record("wheel-install-requested", { name: closure.key, version: closure.version, wheels: closure.wheels.map((w) => w.file_name), toFetch: need.map((w) => w.file_name) });
      const fetchedNow = [];
      let totalBytes = 0;
      try {
        for (const w of need) {
          const { res: r, buf } = await fetchCapped(`${PYODIDE_CDN}/v${version}/full/${w.file_name}`, { timeoutMs: WHEEL_TIMEOUT_MS, maxBytes: WHEEL_MAX_BYTES });
          if (!r.ok) throw new Error(`${w.file_name}: the mirror answered ${r.status}`);
          totalBytes += buf.length;
          if (totalBytes > WHEEL_CLOSURE_MAX_BYTES) {
            throw Object.assign(new Error(`"${name}"'s dependency closure exceeds the ${WHEEL_CLOSURE_MAX_BYTES}-byte bound — giver: this route, engineering starting point`), { code: "CENSORED_ABOVE" });
          }
          const sha = crypto.createHash("sha256").update(buf).digest("hex");
          if (sha !== w.sha256) throw new Error(`${w.file_name}: sha256 mismatch — pyodide's own lock says ${w.sha256}, the fetched bytes hash ${sha}`);
          writeFileSync(path.join(PYODIDE_DIR, w.file_name), buf);
          fetchedNow.push(w.file_name);
        }
        // Verify the WHOLE closure, not just what was just fetched — a
        // wheel already on disk from an interrupted prior run is checked
        // here too, never trusted because its filename already existed.
        for (const w of closure.wheels) {
          const buf = readFileSync(path.join(PYODIDE_DIR, w.file_name));
          const sha = crypto.createHash("sha256").update(buf).digest("hex");
          if (sha !== w.sha256) throw new Error(`${w.file_name}: sha256 mismatch on disk — pyodide's own lock says ${w.sha256}, the file on disk hashes ${sha}`);
        }
      } catch (e) {
        record("wheel-install-failed", { name: closure.key, error: e.message, fetchedNow });
        const gap = e.code === "CENSORED_ABOVE" ? { silence: "censored-above", detail: e.message } : { silence: "not-present", detail: e.message };
        return send(res, 200, { name: closure.key, gap });
      }
      record("wheel-install", { name: closure.key, version: closure.version, wheels: closure.wheels.map((w) => w.file_name), fetchedNow });
      return send(res, 200, { name: closure.key, version: closure.version, wheels: closure.wheels.map((w) => w.file_name), fetchedNow });
    }

    // ---- term-record: mirror the sandboxed terminal's own acts onto the
    // SAME append-only record everything else in this instrument already
    // lands on (FOLD-CONSTITUTION I.5) — the terminal's long-disclosed gap
    // ("terminal acts are not on the record... a term-record mirror is
    // named future work") closed by reusing `record()` rather than a
    // second file or a second reader. This route computes nothing and
    // still crosses nothing new — P18 stands: no exec route, the page
    // decided what happened, this only ever appends it. `event` must be
    // `term-`-prefixed so a reader can tell a terminal-typed act from a
    // web fetch or a deposit at a glance; everything else rides through
    // unchecked, the same posture `record()`'s other 20-odd callers here
    // already have.
    if (req.method === "POST" && p === "/api/term-record") {
      const body = await readJsonBody(req);
      if (typeof body.event !== "string" || !body.event.startsWith("term-")) return send(res, 400, { error: 'event (string, "term-"-prefixed) is required' });
      const { event, ...fields } = body;
      record(event, fields);
      return send(res, 200, { ok: true });
    }

    // ---- transcribe-log: append-only log for transcription pipeline layers.
    // Each entry is { layer, text, meta } — raw Whisper output, self-coref
    // resolution, and priors-coref resolution, in order. One entry per layer
    // per transcription run.
    if (req.method === "POST" && p === "/api/transcribe-log") {
      const body = await readJsonBody(req);
      if (typeof body.layer !== "string") return send(res, 400, { error: "layer (string) is required" });
      const entry = { at: new Date().toISOString(), layer: body.layer, text: body.text || "", meta: body.meta || {} };
      appendFileSync(TRANSCRIBE_LOG_PATH, JSON.stringify(entry) + "\n");
      return send(res, 200, { ok: true });
    }

    // ---- the model proxy (P25 amends P1): the fold servable AS a model —
    // an OpenAI-compatible client (OpenCode's custom-provider config, the
    // Ollama desktop app's "add provider") or an Ollama-native one points
    // here instead of straight at Ollama, and every answer has gone
    // through holon.js's real grounded pipeline (plan gate, retrieval,
    // quote/relation tiers, bounded correction), not a raw passthrough.
    // Loopback-bound like the rest of this server (server.listen below) —
    // this widens what a LOCAL tool may treat as a model, never who may
    // reach this machine. Listed models are real Ollama models, reprefixed
    // `fold:<name>` (proxy-api.js's MODEL_PREFIX) — never a bare name,
    // so a request naming plain "gemma2:2b" refuses rather than silently
    // answering as if the pipeline had run.
    if (req.method === "GET" && (p === "/v1/models" || p === "/api/tags")) {
      let real;
      try {
        real = await offeredOllamaModels();
      } catch (err) {
        return send(res, 502, { error: `ollama unreachable at ${PROXY_OLLAMA_URL}: ${err.message}` });
      }
      const names = (real.models ?? []).map((m) => m.name ?? m.model).filter(Boolean);
      return send(res, 200, p === "/v1/models" ? toOpenAIModelList(names) : reprefixOllamaTags(real));
    }

    if (req.method === "POST" && (p === "/v1/chat/completions" || p === "/api/chat")) {
      const body = await readJsonBody(req);
      const parsed = parseProxyRequest(body);
      if (parsed.error) return send(res, 400, { error: parsed.error });
      const { model, task, chatHistory, discourse, droppedRoles, stream, grounded } = parsed;
      const openai = p === "/v1/chat/completions";
      const id = `foldchat-${crypto.randomBytes(8).toString("hex")}`;
      const createdAt = new Date().toISOString();
      const created = Math.floor(Date.now() / 1000);
      record("proxy-chat-requested", { via: openai ? "openai" : "ollama", model, stream, grounded, droppedRoles });
      let turn;
      try {
        turn = await runProxyTurn({ model, task, chatHistory, discourse, grounded });
      } catch (err) {
        record("proxy-chat-failed", { via: openai ? "openai" : "ollama", model, error: err.message });
        return send(res, 502, { error: `the fold's turn failed: ${err.message}` });
      }
      const fold = {
        refs: turn.refs,
        unsupported: turn.unsupported,
        unbacked: turn.unbacked,
        open: turn.open,
        channels: turn.channels,
        planMode: turn.planMode,
        parts: turn.parts,
      };
      record("proxy-chat", {
        via: openai ? "openai" : "ollama",
        model,
        stream,
        grounded,
        planMode: turn.planMode,
        refs: turn.refs.length,
        unsupported: turn.unsupported.length,
        promptTokens: turn.usage.promptTokens,
        completionTokens: turn.usage.completionTokens,
      });
      const wireModel = prefixModel(model);
      if (stream) {
        const lines = openai
          ? openAIStreamLines({ id, model: wireModel, text: turn.text, created, fold })
          : ollamaChatStreamLines({ model: wireModel, text: turn.text, createdAt, usage: turn.usage, fold });
        res.writeHead(200, { "content-type": openai ? "text/event-stream" : "application/x-ndjson", "cache-control": "no-store" });
        for (const line of lines) res.write(line);
        return res.end();
      }
      return send(
        res,
        200,
        openai
          ? openAIResponse({ id, model: wireModel, text: turn.text, created, usage: turn.usage, fold })
          : ollamaChatResponse({ model: wireModel, text: turn.text, createdAt, usage: turn.usage, fold }),
      );
    }

    // ---- yt-dlp organ: metadata, audio extraction, and download via the
    // system's yt-dlp binary. Same posture as the transcribe route on
    // serve.mjs — the browser cannot reach YouTube directly under P1, so every
    // crossing lives server-side. Three actions: info (metadata only, no
    // download), audio (extract as mp3, save to materials, return path),
    // download (save to materials in a requested format). Recorded before and
    // after each crossing.
    if (req.method === "POST" && p === "/api/ytdlp") {
      const body = await readJsonBody(req);
      const action = String(body.action ?? "").trim();
      const url = String(body.url ?? "").trim();
      if (!url) return send(res, 400, { error: "url is required" });
      if (!["info", "audio", "download"].includes(action)) {
        return send(res, 400, { error: "action must be info, audio, or download" });
      }
      record("ytdlp-requested", { action, url });
      try {
        if (action === "info") {
          const proc = spawn("yt-dlp", [
            "--dump-json", "--no-playlist", "--no-warnings", url,
          ], { stdio: ["ignore", "pipe", "pipe"] });
          let stdout = "";
          let stderr = "";
          proc.stdout.on("data", (b) => { stdout += b.toString(); });
          proc.stderr.on("data", (b) => { stderr += b.toString(); });
          await new Promise((resolve, reject) => {
            proc.on("error", reject);
            proc.on("close", (code) => {
              if (code === 0) resolve();
              else reject(new Error(`yt-dlp exited ${code}: ${stderr.slice(0, 500)}`));
            });
          });
          const info = JSON.parse(stdout);
          const result = {
            title: info.title ?? null,
            duration: info.duration ?? null,
            uploader: info.uploader ?? null,
            upload_date: info.upload_date ?? null,
            description: (info.description ?? "").slice(0, 2000),
            webpage_url: info.webpage_url ?? url,
            ext: info.ext ?? null,
            formats: (info.formats ?? []).slice(-5).map((f) => ({
              format_id: f.format_id,
              ext: f.ext,
              resolution: f.resolution,
              filesize: f.filesize ?? null,
              vcodec: f.vcodec,
              acodec: f.acodec,
            })),
          };
          record("ytdlp-info", { url, title: result.title, duration: result.duration });
          return send(res, 200, result);
        }
        // audio or download — extract to a temp path, then move to materials
        const ext = action === "audio" ? "mp3" : String(body.format ?? "best").trim();
        const tmpBase = `/tmp/the-fold-ytdlp-${crypto.randomUUID()}`;
        const tmpTemplate = `${tmpBase}.%(ext)s`;
        try {
          const args = ["--no-playlist", "--no-warnings", "-o", tmpTemplate];
          if (action === "audio") {
            args.push("--extract-audio", "--audio-format", "mp3", "--audio-quality", "5");
          } else if (ext !== "best") {
            args.push("-f", ext);
          }
          args.push(url);
          const proc = spawn("yt-dlp", args, { stdio: ["ignore", "pipe", "pipe"] });
          let stderr = "";
          proc.stderr.on("data", (b) => { stderr += b.toString(); });
          await new Promise((resolve, reject) => {
            proc.on("error", reject);
            proc.on("close", (code) => {
              if (code === 0) resolve();
              else reject(new Error(`yt-dlp exited ${code}: ${stderr.slice(0, 500)}`));
            });
          });
          // find the output file — yt-dlp fills in %(ext)s
          let actualFile = null;
          let actualExt = null;
          for (const tryExt of [".mp3", ".webm", ".m4a", ".ogg", ".mp4", ".mkv", ".video", ".flv", ".avi", ".mov"]) {
            if (existsSync(tmpBase + tryExt)) { actualFile = tmpBase + tryExt; actualExt = tryExt.slice(1); break; }
          }
          if (!actualFile) throw new Error("yt-dlp produced no output file");
          // get the title for the filename
          let title = url;
          try {
            const tProc = spawn("yt-dlp", [
              "--print", "title", "--no-playlist", "--no-warnings", url,
            ], { stdio: ["ignore", "pipe", "ignore"] });
            title = await new Promise((resolve) => {
              let out = "";
              tProc.stdout.on("data", (b) => { out += b.toString(); });
              tProc.on("close", () => resolve(out.trim() || url));
              setTimeout(() => { tProc.kill(); resolve(url); }, 5000);
            });
          } catch {}
          const safeName = title.replace(/[^a-zA-Z0-9 _-]/g, "_").slice(0, 80).replace(/_+$/, "");
          const finalName = `${safeName}.${actualExt}`;
          const dest = path.join(MATERIALS_DIR, finalName);
          const buf = readFileSync(actualFile);
          writeFileSync(dest, buf);
          try { unlinkSync(actualFile); } catch {}
          record("ytdlp-download", { action, url, title, file: finalName, bytes: buf.length });
          return send(res, 200, {
            file: finalName,
            path: `materials/${finalName}`,
            title,
            bytes: buf.length,
          });
        } catch (e) {
          // clean up any temp files
          for (const tryExt of [".mp3", ".webm", ".m4a", ".ogg", ".mp4", ".mkv", ".video"]) {
            try { unlinkSync(tmpBase + tryExt); } catch {}
          }
          record("ytdlp-failed", { action, url, error: e.message });
          return send(res, 500, { error: e.message });
        }
      } catch (e) {
        record("ytdlp-failed", { action, url, error: e.message });
        return send(res, 500, { error: e.message });
      }
    }

    // ---- the record's tail, for the UI affordance; the full file is in the tree.
    // tail=N returns the last N lines (default 50); offset=M+N returns lines
    // M..M+N for lazy loading older batches. The file is append-only and never
    // truncated — every line is recorded, and the client loads what it needs.
    if (req.method === "GET" && p === "/api/record") {
      const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);
      const tail = Math.max(Number(url.searchParams.get("tail")) || 50, 0);
      let lines = [];
      let total = 0;
      try {
        const all = (await import("node:fs/promises")).readFile;
        lines = (await all(RECORD_PATH, "utf8")).trimEnd().split("\n");
        total = lines.length;
      } catch {
        /* no record yet */
      }
      // tail=N: last N lines. offset=M: lines starting at M (from the start).
      // When both are given, offset wins — it names a window.
      const slice = offset > 0
        ? lines.slice(offset, offset + (tail || 50))
        : lines.slice(-tail || -50);
      return send(res, 200, { path: relOf(RECORD_PATH), total, offset, tail: slice });
    }

    if (req.method === "GET") return serveStatic(req, res, p);

    res.writeHead(404);
    res.end("not found");
  } catch (err) {
    send(res, 500, { error: err.message });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  record("server-start", { port: PORT, browseRoot: BROWSE_ROOT });
  console.log(`the-fold explore listening on http://localhost:${PORT}/explore.html (browsing ${BROWSE_ROOT})`);
});
