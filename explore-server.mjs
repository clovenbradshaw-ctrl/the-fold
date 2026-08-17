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
import { createReadStream, statSync, readdirSync, openSync, readSync, closeSync, mkdirSync, appendFileSync, existsSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { foldExtract } from "../eoreader6.1/packages/host/index.js";
import { foldLibrary, sanitizeFileName, LIBRARY_UPLOAD_MAX_BYTES } from "./library.js";
// the priors organ's GATE (toggle ledger fold, most-specific-wins
// resolution, papers via priors.js's one frontmatter reading) — this file
// owns only the crossings
import { foldPriorToggles, effectivePrior, declarationRows, normalizePriorPath, papersOf } from "./priors-toggles.js";
import {
  extractReadable,
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

const ROOT = path.dirname(fileURLToPath(import.meta.url));
// serve.mjs's own engine mount, unchanged: the Converse page imports the
// reader's engine as /engine/… modules, so this server carries the same
// mapping and one process serves the whole instrument.
const ENGINE = path.resolve(ROOT, "..", "eoreader6.1", "packages", "engine");
// serve.mjs's nul mount, carried here for the same reason as /engine:
// tiers.js imports ../../../nul/index.js, which resolves to /nul/… in the
// browser, and this server also serves the chat page whole.
const NUL = path.resolve(ROOT, "..", "eoreader6.1", "nul");
const PORT = Number(process.argv[2] ?? 8812);
const BROWSE_ROOT = path.resolve(process.argv[3] ?? path.join(ROOT, ".."));
const RECORD_DIR = path.join(ROOT, "record");
const RECORD_PATH = path.join(RECORD_DIR, "explore-record.jsonl");
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
async function fetchAndKeep(url) {
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
    const readable = extractReadable(buf.toString("utf8"));
    title = readable.title || null;
    text = readable.text;
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
    archive: settings.archiveOrg ? { status: "pending", askedAt: retrievedAt } : null,
  };
  appendWebHistory(entry);
  record("web-fetch", { id: entry.id, url, finalUrl: entry.finalUrl, status: entry.status, bytes: entry.bytes, sha256: sha, archiveAsked: !!settings.archiveOrg });
  if (settings.archiveOrg) archivePage(entry.id, entry.finalUrl); // deferred, lands as a patch line
  return { url, entry, fold, text };
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
      : path.join(ROOT, rel === "/" || rel === "." ? "index.html" : rel);
  const withinRoot = file === ROOT || file.startsWith(ROOT + path.sep);
  const withinEngine = file === ENGINE || file.startsWith(ENGINE + path.sep);
  const withinNul = file === NUL || file.startsWith(NUL + path.sep);
  if (!withinRoot && !withinEngine && !withinNul) {
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

  if (p.startsWith("/api/")) {
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

    // ---- web search: one query, one request to the no-key endpoint. The
    // endpoint's bot-challenge page is a typed refusal (P4: gaps are
    // results), never an empty success. Found vs shown is reported.
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
      const got = await fetchAndKeep(url);
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

    // ---- the record's tail, for the UI affordance; the full file is in the tree.
    if (req.method === "GET" && p === "/api/record") {
      const tail = Math.min(Number(url.searchParams.get("tail") ?? 50) || 50, 500);
      let lines = [];
      try {
        const all = (await import("node:fs/promises")).readFile;
        lines = (await all(RECORD_PATH, "utf8")).trimEnd().split("\n");
      } catch {
        /* no record yet */
      }
      return send(res, 200, { path: relOf(RECORD_PATH), total: lines.length, tail: lines.slice(-tail) });
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
