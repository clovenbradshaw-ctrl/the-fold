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
// WHAT THIS SERVER NEVER DOES: write inside the browse root except the two
// append-only places it owns (record/, materials/); accept absolute paths;
// follow a path outside the root; call a model; fetch anything remote.

import http from "node:http";
import { Worker } from "node:worker_threads";
import { createReadStream, statSync, readdirSync, openSync, readSync, closeSync, mkdirSync, appendFileSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { foldExtract } from "../eoreader6/packages/host/index.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
// serve.mjs's own engine mount, unchanged: the Converse page imports the
// reader's engine as /engine/… modules, so this server carries the same
// mapping and one process serves the whole instrument.
const ENGINE = path.resolve(ROOT, "..", "eoreader6", "packages", "engine");
// serve.mjs's nul mount, carried here for the same reason as /engine:
// tiers.js imports ../../../nul/index.js, which resolves to /nul/… in the
// browser, and this server also serves the chat page whole.
const NUL = path.resolve(ROOT, "..", "eoreader6", "nul");
const PORT = Number(process.argv[2] ?? 8812);
const BROWSE_ROOT = path.resolve(process.argv[3] ?? path.join(ROOT, ".."));
const RECORD_DIR = path.join(ROOT, "record");
const RECORD_PATH = path.join(RECORD_DIR, "explore-record.jsonl");
const MATERIALS_DIR = path.join(ROOT, "materials");

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
function record(event, fields = {}) {
  const line = JSON.stringify({ at: new Date().toISOString(), event, ...fields });
  appendFileSync(RECORD_PATH, line + "\n");
  return line;
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
  res.writeHead(200, { "content-type": MIME[path.extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
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
