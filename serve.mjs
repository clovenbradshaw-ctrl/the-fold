// serve.mjs — a static server that does not cache.
//
// The page is plain ES modules loaded straight from disk, and a browser will
// happily keep a module it already has. Editing cite.js, reloading, and then
// debugging behaviour that came from the previous copy costs more time than
// this file will ever save: an edit that appears not to work is worse than an
// edit that fails, because you go looking for the bug somewhere else.
//
// So: no-store on everything, and no dependencies.
//
//   node serve.mjs [port]
//
// Beyond static files, the API endpoints live here, all loopback-only:
//
//   POST /api/run              run a build's code as a throwaway process —
//                              sanctioned by P16's runner amendment, and
//                              recorded as a crossing BEFORE it runs
//   POST /api/build-record     mirror one build-log entry to the durable
//                              record (record/build-record.jsonl, append-only)
//
// Both write to the same record. A run is the only path in this instrument
// that turns model-authored text into a process on this machine, so it is
// the one that must never be silent: the page's own build-log mirror covers
// runs the UI started, and this file covers every run, including a direct
// POST that no page ever saw.
//
// THE TERMINAL IS NOT HERE ANY MORE (P18). It used to be: an exec route ran
// one zsh command per request under a real PTY helper in tools/ — a shell
// on the machine, streamed to the page. That whole path is gone,
// deliberately: the terminal now runs entirely in the browser sandbox
// (term.js and its workers — vendored pyodide, sql.js, a severed JS
// worker), and this server serves those bytes like any others.
// term.test.mjs fails if an exec route ever comes back.
//
// Python builds use ONE project-local virtualenv (`.venv`, created on first
// boot). npm installs land in this repo's own node_modules the same way.
// Nothing is installed globally, ever.

import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { appendFileSync, createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync, statSync, unlinkSync } from "node:fs";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";

const ROOT = resolve(import.meta.dirname);
const ENGINE = resolve(ROOT, "..", "eoreader7", "legacy-eoreader6.1", "packages", "engine");
// The engine's own null module. tiers.js (the surprise ladder) imports it as
// ../../../nul/index.js, which resolves above the /engine mount — so nul gets
// its own mount at the path that import lands on. Used, never copied, same as
// the engine itself.
const NUL = resolve(ROOT, "..", "eoreader7", "legacy-eoreader6.1", "nul");
// eoreader7's NATIVE tree, mounted separately from the legacy /engine path
// because they are different engines, not different folders: /engine is the
// frozen 6.1 compatibility surface, /engine-v7 is v7's own kernel. Kept
// apart by name so a reader of an import line always knows which one a
// module came from, and so retiring the legacy mount later is a deletion
// rather than an untangling. Used, never copied — the same discipline
// /engine and /nul already hold.
const ENGINE_V7 = resolve(ROOT, "..", "eoreader7", "native");
// Real, giver-cited data (POSPrior@1, scripts/build-pos-prior.mjs's own
// output) — never a fact this repo derives or vendors a stale copy of.
// scripts/corpus/ is eoreader6.1's OWN gitignored, locally-reproducible
// build directory (its README says so directly: raw corpora are "stripped
// out" of the published snapshot) — this mount, like /engine and /nul,
// reads it live off that disk rather than copying the 376KB file into this
// repo, so a rebuilt prior (e.g. eoreader6.1's own disclosed next step,
// extending it with participle FEATS) is picked up with no second copy to
// go stale. hypergraph.js's own posPriorFor() (app.js-injected) types the
// absence honestly when the file has never been built locally, rather than
// assuming every checkout has run the builder.
const PRIORS_DATA = resolve(ROOT, "..", "eoreader7", "legacy-eoreader6.1", "scripts", "corpus");
// The SHIPPED fallback for the same mount (P72): the primary above is a
// gitignored build directory inside a submodule most checkouts never
// initialize, so on a fresh machine the fetch 404'd and every organ gated
// on this prior silently degraded to off — hypergraph.js's vocabulary-level
// POS gate included, which is exactly the 18/32-junk admission condition
// eval/admission-gate.mjs measures. live_priors commits the SAME
// POSPrior@1 artifact (UD_English-EWT, giver + license + per-file sha256),
// so the mount now falls back to it — still read live off a sibling repo,
// never a copy vendored here, the same discipline as /engine and /nul.
// The alias is a DECLARED translation between two naming conventions
// (eoreader6.1 keys files by ISO-3 "eng"; live_priors by its own LANG_OF
// codes, "en") — THRAX_MAP's own precedent: named at the seam, once.
const PRIORS_DATA_SHIPPED = resolve(ROOT, "..", "live_priors", "derived-priors", "pos-priors");
const PRIORS_DATA_ALIASES = { "pos-prior-eng.json": "pos-prior-en.json" };
const PORT = Number(process.argv[2] ?? 8811);

// The one package environment. Both the build runner and the terminal get
// `.venv/bin` on PATH, so whatever was installed is importable from either.
const VENV = join(ROOT, ".venv");
const VENV_BIN = join(VENV, "bin");
const VENV_PYTHON = join(VENV_BIN, "python");
const pythonBin = () => (existsSync(VENV_PYTHON) ? VENV_PYTHON : "python3");

// What "run a build" means. A build in a language with a runner here gets a
// Run control; anything else is refused by the UI, never by the model. The
// python entry resolves to the venv at request time so a just-installed
// package is importable without a server restart.
function runnerFor(lang) {
  const key = String(lang ?? "").toLowerCase();
  if (key === "python") return [pythonBin(), "-B", "-c"];
  if (key === "javascript" || key === "js" || key === "node") return ["node", "-e"];
  if (key === "shell" || key === "bash") return ["sh", "-c"];
  return null;
}
// The caps: 10s of life, 64KB of voice. Enough for a countdown timer, not
// enough for an afternoon. This is a local instrument — not a security
// boundary, the whole machine is already the model's — but a runaway turn
// should cost seconds, not a reboot.
const RUN_TIMEOUT = 10_000;
const RUN_MAX_OUTPUT = 64 * 1024;

// Make the venv once, in the background. First boot is the only slow one;
// every later boot just uses what is there.
if (!existsSync(VENV_PYTHON)) {
  const v = spawn("python3", ["-m", "venv", VENV]);
  v.on("error", (e) => console.error(`could not create .venv: ${e.message}`));
  v.on("close", (code) => {
    if (code === 0) console.log(`.venv ready — pip install lands here (${VENV_BIN})`);
    else console.error(`venv creation exited ${code}; builds fall back to system python3`);
  });
}

// ── the build record ─────────────────────────────────────────────────────────
//
// Anything built is an append-only log (build-log.js owns the act→entry
// mapping; the page holds each build's log and mirrors every entry here the
// moment it is appended). record/build-record.jsonl is append-only — never
// truncated, never rewritten, same standing as explore's record
// (FOLD-CONSTITUTION I.5). Validation is the engine's own wall, not a local
// restatement: each mirrored entry must pass task-log.js's `append` on a
// fresh log, so an entry the engine would refuse to bring into being is
// refused here too — and the refusal itself lands on the record, typed,
// with the engine's own reason.
// Overridable only for serve-run.test.mjs, so the run-crossing test can point
// at a throwaway directory instead of appending to this repo's own record —
// unset in every real boot, where it is exactly `<repo>/record` as always.
const RECORD_DIR = process.env.THE_FOLD_RECORD_DIR ? resolve(process.env.THE_FOLD_RECORD_DIR) : join(ROOT, "record");
const BUILD_RECORD_PATH = join(RECORD_DIR, "build-record.jsonl");
mkdirSync(RECORD_DIR, { recursive: true });
let buildVocab = null;
try {
  buildVocab = await import(pathToFileURL(join(ENGINE, "holon", "task-log.js")).href);
} catch (e) {
  // The engine mount is this server's own hard dependency for the page; if
  // the module is unreachable the record still lands, disclosed as
  // unchecked rather than silently trusted-as-valid.
  console.error(`build record: engine task-log unavailable (${e.message}); entries land with vocab:"unchecked"`);
}
const recordBuild = (row) => appendFileSync(BUILD_RECORD_PATH, JSON.stringify(row) + "\n");
// A row whose loss must not take the response with it: the act it describes
// has already happened, so the honest move is to say so on the console rather
// than to throw into a socket the page is waiting on. The strict `recordBuild`
// is used where the record is a PRECONDITION (see the run crossing below).
const tryRecord = (row) => {
  try {
    recordBuild(row);
    return true;
  } catch (e) {
    console.error(`build record: could not append ${row.event} (${e.message}) — row lost`);
    return false;
  }
};

// ── the run crossing ─────────────────────────────────────────────────────────
//
// A run is a crossing, not a computation: model-authored text becomes a
// process with this machine's network and this machine's disk. P16's runner
// amendment sanctions that path — loopback only, capped, declared — on the
// condition that it is never invisible, so the wall here is mechanical rather
// than hoped for: the trace lands FIRST, and a run whose trace cannot be
// written does not happen. (P6 says a record exists only where a check ran;
// the runner holds the converse — an act exists only where its record ran.)
//
// Two rows per run, sharing one id: the crossing as it is admitted, carrying
// the code by content address, and the result as the process resolves. The
// result row says `exit`, not `code`, because in the crossing row `code` is
// the source that ran. Budgets are named, and what they drop is stated on the
// row (`kept`/`of`), never silently trimmed: the code text is kept to
// RUN_CODE_KEPT, and stdout/stderr are already held to RUN_MAX_OUTPUT by the
// runner itself, so the record reports the true size beside the kept size.
const RUN_CODE_KEPT = 16 * 1024;
const BOOT = Date.now().toString(36);
let runSeq = 0;
const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  // The sandboxed terminal's runtimes are wasm, vendored and served from
  // here — the right MIME lets the browser stream-compile them.
  ".wasm": "application/wasm",
  ".zip": "application/zip",
};

const json = (res, status, obj) => {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(obj));
};
const isLoopback = (req) => {
  const a = req.socket.remoteAddress;
  return a === "127.0.0.1" || a === "::1" || a === "::ffff:127.0.0.1";
};
const readJsonBody = async (req, res, limit = 64 * 1024) => {
  let body = "";
  req.setEncoding("utf8");
  for await (const chunk of req) {
    body += chunk;
    if (body.length > limit) return null;
  }
  try {
    return JSON.parse(body);
  } catch {
    return false;
  }
};

createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");

  // POST /api/run — run build code as a throwaway process. Loopback only,
  // JSON in, JSON out, nothing written to this repo, every attempt on the
  // record: a refusal is a row too, so an attempt from off the loopback or a
  // language with no runner is as visible as a run that happened.
  if (req.method === "POST" && rel === "/api/run") {
    const refuse = (status, reason, extra = {}) => {
      tryRecord({ at: new Date().toISOString(), event: "build-run-refused", reason, ...extra });
      return json(res, status, { error: reason });
    };
    if (!isLoopback(req)) return refuse(403, "loopback only", { from: req.socket.remoteAddress ?? null });
    (async () => {
      const params = await readJsonBody(req, res);
      if (params === null) return refuse(413, "body too large");
      if (params === false) return refuse(400, "bad json");
      const cmd = runnerFor(params.lang);
      const lang = String(params.lang ?? "");
      if (!cmd) return refuse(400, `no runner for "${params.lang}"`, { lang });
      const code = String(params.code ?? "");
      const run = `${BOOT}.${++runSeq}`;
      // No record, no run — the one place in this file where a failed append
      // stops the act instead of being disclosed after it.
      try {
        recordBuild({
          at: new Date().toISOString(),
          event: "build-run",
          run,
          lang,
          runner: cmd,
          code: { sha256: sha256(code), text: code.slice(0, RUN_CODE_KEPT), kept: Math.min(code.length, RUN_CODE_KEPT), of: code.length },
          timeoutMs: RUN_TIMEOUT,
          maxOutput: RUN_MAX_OUTPUT,
        });
      } catch (e) {
        console.error(`run refused: the record could not be written (${e.message})`);
        return json(res, 500, { error: "run refused: the record could not be written" });
      }
      const started = Date.now();
      const proc = spawn(cmd[0], [...cmd.slice(1), code], {
        stdio: ["ignore", "pipe", "pipe"],
      });
      let out = "";
      let err = "";
      // What the caps dropped is counted, not guessed: `of` is everything the
      // process actually said, `kept` is what fit.
      let outOf = 0;
      let errOf = 0;
      let spawnError = null;
      proc.stdout.on("data", (b) => {
        const s = b.toString();
        outOf += s.length;
        const room = RUN_MAX_OUTPUT - out.length;
        if (room > 0) out += s.slice(0, room);
      });
      proc.stderr.on("data", (b) => {
        const s = b.toString();
        errOf += s.length;
        const room = RUN_MAX_OUTPUT - err.length;
        if (room > 0) err += s.slice(0, room);
      });
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        const durationMs = Date.now() - started;
        tryRecord({
          at: new Date().toISOString(),
          event: "build-run-result",
          run,
          exit: proc.exitCode ?? null,
          timedOut: proc.killedByTimeout ?? false,
          durationMs,
          stdout: { kept: out.length, of: outOf },
          stderr: { kept: err.length, of: errOf },
          ...(spawnError ? { spawnError } : {}),
        });
        res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
        res.end(
          JSON.stringify({
            code: proc.exitCode ?? null,
            stdout: out,
            stderr: err,
            timedOut: proc.killedByTimeout ?? false,
            durationMs,
          }),
        );
      };
      const timer = setTimeout(() => {
        proc.killedByTimeout = true;
        proc.kill("SIGKILL");
      }, RUN_TIMEOUT);
      proc.on("error", (e) => {
        spawnError = e.message;
        out = `could not start ${cmd[0]}: ${e.message}`;
        outOf = out.length;
        finish();
      });
      proc.on("close", finish);
    })();
    return;
  }

  // POST /api/build-record — mirror a batch of build-log entries (or one
  // export event) to the durable record. A batch lands in one append block,
  // in log order — the page also chains its batches per build, so the
  // record's rows arrive in the order the acts happened. Each entry is
  // validated independently; a refused entry lands as its own typed row and
  // never blocks the valid ones around it. The body limit is above
  // /api/run's output cap because a result entry legitimately carries run
  // output (already held to the page's declared keep budget).
  if (req.method === "POST" && rel === "/api/build-record") {
    if (!isLoopback(req)) return json(res, 403, { error: "loopback only" });
    (async () => {
      const params = await readJsonBody(req, res, 256 * 1024);
      if (params === null) return json(res, 413, { error: "body too large" });
      if (params === false) return json(res, 400, { error: "bad json" });
      const { conv = null, build = null, entries, export: exp } = params ?? {};
      const at = new Date().toISOString();
      // A download is a crossing — the fold leaving for the user's disk —
      // recorded like any other.
      if (exp && typeof exp === "object") {
        recordBuild({ at, event: "build-export", conv, build, name: String(exp.name ?? ""), atSeq: exp.atSeq ?? null });
        return json(res, 200, { ok: true });
      }
      if (!Array.isArray(entries) || !entries.length) {
        recordBuild({ at, event: "build-entry-refused", conv, build, reason: "no entries" });
        return json(res, 400, { error: "no entries" });
      }
      let appended = 0;
      let refused = 0;
      for (const entry of entries) {
        if (!entry || typeof entry !== "object") {
          recordBuild({ at, event: "build-entry-refused", conv, build, reason: "not an object" });
          refused += 1;
          continue;
        }
        if (buildVocab) {
          try {
            buildVocab.append(buildVocab.createTaskLog(), entry);
          } catch (e) {
            recordBuild({ at, event: "build-entry-refused", conv, build, reason: e.message });
            refused += 1;
            continue;
          }
          recordBuild({ at, event: "build-entry", conv, build, entry });
        } else {
          recordBuild({ at, event: "build-entry", conv, build, entry, vocab: "unchecked" });
        }
        appended += 1;
      }
      json(res, refused && !appended ? 400 : 200, { ok: !refused, appended, refused });
    })();
    return;
  }

  // POST /api/transcribe — fetch audio from a YouTube URL via yt-dlp, return
  // the audio bytes as base64 so the browser can transcribe it with Whisper.
  // Loopback only. Body: { url: "https://youtube.com/..." }.
  // The crossing is recorded: a YouTube download is P13 web egress.
  if (req.method === "POST" && rel === "/api/transcribe") {
    const refuse = (status, reason) => json(res, status, { error: reason });
    if (!isLoopback(req)) return refuse(403, "loopback only");
    (async () => {
      const params = await readJsonBody(req, res);
      if (params === null) return refuse(413, "body too large");
      if (params === false) return refuse(400, "bad json");
      const url = String(params?.url ?? "").trim();
      if (!url) return refuse(400, "url is required");
      const tmpPath = `/tmp/the-fold-transcribe-${randomUUID()}.mp3`;
      try {
        // Download audio via yt-dlp — extracted as mp3, lowest quality to save
        // bandwidth and time (transcription doesn't need high fidelity).
        const proc = spawn("yt-dlp", [
          "--extract-audio",
          "--audio-format", "mp3",
          "--audio-quality", "5",
          "-o", tmpPath,
          "--no-playlist",
          "--no-warnings",
          url,
        ], { stdio: ["ignore", "pipe", "pipe"] });
        let stderr = "";
        proc.stderr.on("data", (b) => { stderr += b.toString(); });
        await new Promise((resolve, reject) => {
          proc.on("error", reject);
          proc.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`yt-dlp exited ${code}: ${stderr.slice(0, 500)}`));
          });
        });
        // Read the downloaded file and return as base64.
        const audio = readFileSync(tmpPath);
        const mime = "audio/mpeg";
        // Try to get the title from yt-dlp for a nicer source name.
        let title = url;
        try {
          const titleProc = spawn("yt-dlp", [
            "--print", "title",
            "--no-playlist",
            "--no-warnings",
            url,
          ], { stdio: ["ignore", "pipe", "ignore"] });
          title = await new Promise((resolve) => {
            let out = "";
            titleProc.stdout.on("data", (b) => { out += b.toString(); });
            titleProc.on("close", () => resolve(out.trim() || url));
            setTimeout(() => { titleProc.kill(); resolve(url); }, 5000);
          });
        } catch {}
        recordBuild({
          at: new Date().toISOString(),
          event: "transcribe-fetch",
          url,
          title,
          mime,
          sizeBytes: audio.length,
        });
        json(res, 200, {
          audio: audio.toString("base64"),
          mime,
          title,
          sizeBytes: audio.length,
        });
      } catch (e) {
        recordBuild({ at: new Date().toISOString(), event: "transcribe-fetch-failed", url, reason: e.message });
        refuse(500, e.message);
      } finally {
        try { unlinkSync(tmpPath); } catch {}
      }
    })();
    return;
  }

  // POST /api/transcribe-upload — transcribe an audio file server-side.
  // Raw binary body (audio bytes). Headers: x-file-name, x-file-mime.
  // The browser's in-browser Whisper may fail to load the model from CDN;
  // server-side Whisper is reliable and already confirmed working.
  if (req.method === "POST" && rel === "/api/transcribe-upload") {
    const refuse = (status, reason) => json(res, status, { error: reason });
    if (!isLoopback(req)) return refuse(403, "loopback only");
    (async () => {
      const fileName = String(req.headers["x-file-name"] ?? "audio.mp3");
      const mime = String(req.headers["x-file-mime"] ?? "audio/mpeg");
      // Collect raw binary body
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const audioBuf = Buffer.concat(chunks);
      if (!audioBuf.length) return refuse(400, "empty audio");
      const tmpPath = `/tmp/the-fold-upload-${randomUUID()}.dat`;
      const pcmPath = `/tmp/the-fold-upload-${randomUUID()}.raw`;
      try {
        writeFileSync(tmpPath, audioBuf);
        // Convert to raw mono 16kHz float32 PCM (no WAV header to parse)
        await new Promise((resolve, reject) => {
          const proc = spawn("ffmpeg", [
            "-y", "-i", tmpPath, "-ar", "16000", "-ac", "1", "-f", "f32le", pcmPath
          ], { stdio: ["ignore", "ignore", "pipe"] });
          let stderr = "";
          proc.stderr.on("data", (b) => { stderr += b.toString(); });
          proc.on("error", reject);
          proc.on("close", (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(0, 300)}`)));
        });
        // Get audio duration
        let duration = 0;
        try {
          const probe = spawn("ffprobe", [
            "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", tmpPath
          ], { stdio: ["ignore", "pipe", "ignore"] });
          duration = await new Promise((resolve) => {
            let out = "";
            probe.stdout.on("data", (b) => { out += b.toString(); });
            probe.on("close", () => resolve(parseFloat(out.trim()) || 0));
            setTimeout(() => { probe.kill(); resolve(0); }, 3000);
          });
        } catch {}
        // Transcribe with server-side Whisper
        const { pipeline } = await import("@huggingface/transformers");
        const asr = await pipeline("automatic-speech-recognition", "onnx-community/whisper-base", {
          device: "cpu", dtype: "q8",
        });
        const pcmBuf = readFileSync(pcmPath);
        const pcm = new Float32Array(pcmBuf.buffer, pcmBuf.byteOffset, pcmBuf.byteLength / 4);
        const t0 = Date.now();
        const out = await asr(pcm, {
          chunk_length_s: 30, stride_length_s: 5,
          return_timestamps: false, language: "english",
        });
        const text = String((out && out.text) || "").trim();
        const elapsed = Date.now() - t0;
        console.log(`[transcribe-upload] ${fileName}: ${text.length} chars in ${elapsed}ms, ${(duration/60).toFixed(1)}min audio`);
        recordBuild({ at: new Date().toISOString(), event: "transcribe-upload", fileName, chars: text.length, duration, elapsed });
        json(res, 200, { text, duration, chars: text.length });
      } catch (e) {
        console.error("[transcribe-upload] error:", e.message);
        refuse(500, e.message);
      } finally {
        try { unlinkSync(tmpPath); } catch {}
        try { unlinkSync(pcmPath); } catch {}
      }
    })();
    return;
  }

  let file = join(ROOT, rel === "/" ? "index.html" : rel);

  // Never serve outside the directory (or the engine/nul/priors-data mounts),
  // whatever the path claims to be.
  if (!file.startsWith(ROOT) && !file.startsWith(ENGINE) && !file.startsWith(ENGINE_V7) && !file.startsWith(NUL) && !file.startsWith(PRIORS_DATA) && !file.startsWith(PRIORS_DATA_SHIPPED)) {
    res.writeHead(403).end("no");
    return;
  }

  // The reading engine is used, not copied. /engine/* serves eoreader6's
  // packages/engine so the page imports the real organs — one source of truth
  // for how a boundary is found, and no vendored fork to drift.
  if (rel.startsWith("/engine/")) {
    file = join(ENGINE, rel.slice("/engine/".length));
    if (!file.startsWith(ENGINE)) {
      res.writeHead(403).end("no");
      return;
    }
  }
  if (rel.startsWith("/engine-v7/")) {
    file = join(ENGINE_V7, rel.slice("/engine-v7/".length));
    if (!file.startsWith(ENGINE_V7)) {
      res.writeHead(403).end("no");
      return;
    }
  }
  if (rel.startsWith("/nul/")) {
    file = join(NUL, rel.slice("/nul/".length));
    if (!file.startsWith(NUL)) {
      res.writeHead(403).end("no");
      return;
    }
  }
  if (rel.startsWith("/priors-data/")) {
    const name = rel.slice("/priors-data/".length);
    file = join(PRIORS_DATA, name);
    if (!file.startsWith(PRIORS_DATA)) {
      res.writeHead(403).end("no");
      return;
    }
    if (!existsSync(file)) {
      // Fall back to the shipped artifact (see PRIORS_DATA_SHIPPED above).
      const shipped = join(PRIORS_DATA_SHIPPED, PRIORS_DATA_ALIASES[name] ?? name);
      if (shipped.startsWith(PRIORS_DATA_SHIPPED) && existsSync(shipped)) file = shipped;
    }
  }

  let stat;
  try {
    stat = statSync(file);
    if (stat.isDirectory()) {
      file = join(file, "index.html");
      stat = statSync(file);
    }
  } catch {
    res.writeHead(404, { "content-type": "text/plain" }).end("not found");
    return;
  }

  res.writeHead(200, {
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    "content-length": stat.size,
    // The whole point of this file.
    "cache-control": "no-store, must-revalidate",
  });
  createReadStream(file).pipe(res);
})
  // The bound port is read back from the server, not the requested PORT, so
  // `node serve.mjs 0` (an OS-assigned ephemeral port — what
  // serve-run.test.mjs asks for, to run without colliding with a real
  // instance) prints the port it actually got, not the literal 0.
  .listen(PORT, function () {
    const url = `http://localhost:${this.address().port}`;
    console.log(`the-fold on ${url} (no-store)`);
    openBrowser(url);
  });

// Opens the reader's default browser at the given URL, best-effort. Skipped
// for `node serve.mjs 0` (serve-run.test.mjs's ephemeral-port boot — a test
// run should never pop a window) and under CI or THE_FOLD_NO_OPEN, and any
// failure (no display, no known opener command) is swallowed: a server that
// can't open a browser should still serve requests.
function openBrowser(url) {
  if (process.argv[2] === "0" || process.env.CI || process.env.THE_FOLD_NO_OPEN) return;
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  const args = process.platform === "win32" ? ["", url] : [url];
  try {
    spawn(cmd, args, { detached: true, stdio: "ignore", shell: process.platform === "win32" }).unref();
  } catch {
    /* no display, no opener on PATH — the server still runs */
  }
}
