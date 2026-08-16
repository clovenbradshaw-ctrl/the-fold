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
// Beyond static files, three API endpoints live here, all loopback-only:
//
//   POST /api/run/<lang>       run a build's code as a throwaway process
//   POST /api/exec/<id>        start a terminal command under a PTY and
//                              stream its output back until it exits
//   POST /api/exec/<id>/stdin  write one line to a running command
//   POST /api/exec/<id>/signal send a signal (SIGINT) to a running command
//
// Python builds and the terminal share ONE project-local virtualenv
// (`.venv`, created on first boot): `pip install` in the terminal lands where
// every future build's `python` will import from. npm installs land in this
// repo's own node_modules the same way. Nothing is installed globally, ever.

import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { createReadStream, existsSync, statSync } from "node:fs";
import { spawn } from "node:child_process";

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

// ── the terminal ────────────────────────────────────────────────────────────
//
// One command per exec, run under a PTY (`script`) so interactive programs —
// python, node, pip's prompts — behave like they do in a real terminal. Each
// exec is a fresh zsh; cwd is tracked per terminal session so `cd` carries
// over to the next command. Output is streamed raw; the page strips the
// control sequences.
const EXEC_ID = /^[a-zA-Z0-9-]{8,64}$/;
const execs = new Map();

createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");

  // POST /api/run — run build code as a throwaway process. Loopback only,
  // JSON in, JSON out, nothing written to this repo.
  if (req.method === "POST" && rel === "/api/run") {
    if (!isLoopback(req)) return json(res, 403, { error: "loopback only" });
    (async () => {
      const params = await readJsonBody(req, res);
      if (params === null) return json(res, 413, { error: "body too large" });
      if (params === false) return json(res, 400, { error: "bad json" });
      const cmd = runnerFor(params.lang);
      if (!cmd) return json(res, 400, { error: `no runner for "${params.lang}"` });
      const started = Date.now();
      const proc = spawn(cmd[0], [...cmd.slice(1), String(params.code ?? "")], {
        stdio: ["ignore", "pipe", "pipe"],
      });
      let out = "";
      let err = "";
      proc.stdout.on("data", (b) => {
        const s = b.toString();
        const room = RUN_MAX_OUTPUT - out.length;
        if (room > 0) out += s.slice(0, room);
      });
      proc.stderr.on("data", (b) => {
        const s = b.toString();
        const room = RUN_MAX_OUTPUT - err.length;
        if (room > 0) err += s.slice(0, room);
      });
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
        res.end(
          JSON.stringify({
            code: proc.exitCode ?? null,
            stdout: out,
            stderr: err,
            timedOut: proc.killedByTimeout ?? false,
            durationMs: Date.now() - started,
          }),
        );
      };
      const timer = setTimeout(() => {
        proc.killedByTimeout = true;
        proc.kill("SIGKILL");
      }, RUN_TIMEOUT);
      proc.on("error", (e) => {
        out = `could not start ${cmd[0]}: ${e.message}`;
        finish();
      });
      proc.on("close", finish);
    })();
    return;
  }

  // POST /api/exec/<id> — start a terminal command under a PTY and stream its
  // combined output back until the process exits. The response stays open:
  // the page reads the body as it arrives, which is what makes pip's progress
  // and a python REPL feel live instead of batched.
  const exec = rel.match(/^\/api\/exec\/([a-zA-Z0-9-]{8,64})$/);
  if (req.method === "POST" && exec) {
    if (!isLoopback(req)) return json(res, 403, { error: "loopback only" });
    (async () => {
      const id = exec[1];
      if (execs.has(id)) return json(res, 409, { error: "already running" });
      const params = await readJsonBody(req, res, 16 * 1024);
      if (params === null) return json(res, 413, { error: "body too large" });
      if (params === false) return json(res, 400, { error: "bad json" });
      const command = String(params.command ?? "");
      if (!command.trim()) return json(res, 400, { error: "empty command" });

      const cwd = String(params.cwd ?? ROOT);
      // A cd in the terminal moves the session; the page sends the session
      // cwd back on the next command, so `cd` behaves like it does in a
      // shell instead of being a lie.
      const cd = command.trim().match(/^cd(?:\s+(.+))?$/);
      if (cd) {
        const target = (cd[1] ?? "~").trim().replace(/^~/, process.env.HOME ?? "~");
        const next = normalize(resolve(cwd, target));
        if (existsSync(next)) {
          res.writeHead(200, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
          res.end(`\x1b]0;fold-cwd:${next}\x1b\\`);
          return;
        }
        res.writeHead(200, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
        res.end(`no such directory: ${target}\n`);
        return;
      }

      // tools/pty-exec.py gives the command a real PTY: interactive programs
      // see a terminal. TERM=dumb keeps the stream readable — readline's
      // redraw dance and colour codes stay out of it — while the PTY still
      // makes python/node/pip interactive. TERM=xterm-256color is one
      // command-prefix away for something that needs a full terminal. The
      // zsh is a login shell (-l) so the user's profile PATH survives; the
      // venv is prepended so `python`/`pip` here are the build environment,
      // never a surprise other one.
      const proc = spawn("python3", [join(ROOT, "tools", "pty-exec.py"), command], {
        cwd,
        env: {
          ...process.env,
          PATH: `${VENV_BIN}:${process.env.PATH ?? ""}`,
          TERM: "dumb",
        },
        stdio: ["pipe", "pipe", "pipe"],
        detached: true,
      });
      execs.set(id, proc);

      res.writeHead(200, {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      });
      let paused = false;
      const pump = (chunk) => {
        if (res.write(chunk) === false) {
          paused = true;
          proc.stdout.pause();
        }
      };
      res.on("drain", () => {
        if (paused) {
          paused = false;
          proc.stdout.resume();
        }
      });
      let finished = false;
      const killGroup = (sig) => {
        try {
          process.kill(-proc.pid, sig);
        } catch {
          /* already gone */
        }
      };
      // The client walked away mid-command (closed the tab, navigated): the
      // command must not survive its own terminal.
      res.on("close", () => {
        if (!finished) killGroup("SIGKILL");
      });
      proc.stdout.on("data", pump);
      proc.stderr.on("data", pump);
      proc.on("error", (e) => {
        res.write(`\x1b[31m${e.message}\x1b[0m\n`);
      });
      proc.on("close", () => {
        finished = true;
        execs.delete(id);
        // The real exit code arrived inside the stream, written by the pty
        // helper itself; the stream just ends here.
        res.end();
      });
    })();
    return;
  }

  // POST /api/exec/<id>/stdin — one line into the running command's PTY.
  const stdin = rel.match(/^\/api\/exec\/([a-zA-Z0-9-]{8,64})\/stdin$/);
  if (req.method === "POST" && stdin) {
    if (!isLoopback(req)) return json(res, 403, { error: "loopback only" });
    (async () => {
      const proc = execs.get(stdin[1]);
      if (!proc) return json(res, 404, { error: "not running" });
      const params = await readJsonBody(req, res, 8 * 1024);
      if (params === false) return json(res, 400, { error: "bad json" });
      if (proc.stdin.writable) {
        proc.stdin.write(String(params?.data ?? ""));
      }
      json(res, 200, { ok: true });
    })();
    return;
  }

  // POST /api/exec/<id>/signal — SIGINT by default; the process group, so the
  // command under the PTY receives it, not just the wrapper.
  const sig = rel.match(/^\/api\/exec\/([a-zA-Z0-9-]{8,64})\/signal$/);
  if (req.method === "POST" && sig) {
    if (!isLoopback(req)) return json(res, 403, { error: "loopback only" });
    (async () => {
      const proc = execs.get(sig[1]);
      if (!proc) return json(res, 404, { error: "not running" });
      const params = await readJsonBody(req, res, 8 * 1024);
      const signal = String(params?.signal ?? "SIGINT");
      try {
        process.kill(-proc.pid, signal);
      } catch {
        /* already gone */
      }
      json(res, 200, { ok: true });
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
}).listen(PORT, () => console.log(`the-fold on http://localhost:${PORT} (no-store)`));
