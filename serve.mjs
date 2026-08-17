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
import { appendFileSync, createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

const ROOT = resolve(import.meta.dirname);
const ENGINE = resolve(ROOT, "..", "eoreader6", "packages", "engine");
// The engine's own null module. tiers.js (the surprise ladder) imports it as
// ../../../nul/index.js, which resolves above the /engine mount — so nul gets
// its own mount at the path that import lands on. Used, never copied, same as
// the engine itself.
const NUL = resolve(ROOT, "..", "eoreader6", "nul");
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

  let file = join(ROOT, rel === "/" ? "index.html" : rel);

  // Never serve outside the directory (or the engine/nul mounts), whatever
  // the path claims to be.
  if (!file.startsWith(ROOT) && !file.startsWith(ENGINE) && !file.startsWith(NUL)) {
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
  if (rel.startsWith("/nul/")) {
    file = join(NUL, rel.slice("/nul/".length));
    if (!file.startsWith(NUL)) {
      res.writeHead(403).end("no");
      return;
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
    console.log(`the-fold on http://localhost:${this.address().port} (no-store)`);
  });
