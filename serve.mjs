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

import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { createReadStream, statSync } from "node:fs";
import { spawn } from "node:child_process";

const ROOT = resolve(import.meta.dirname);
const ENGINE = resolve(ROOT, "..", "eoreader6", "packages", "engine");
// The engine's own null module. tiers.js (the surprise ladder) imports it as
// ../../../nul/index.js, which resolves above the /engine mount — so nul gets
// its own mount at the path that import lands on. Used, never copied, same as
// the engine itself.
const NUL = resolve(ROOT, "..", "eoreader6", "nul");
const PORT = Number(process.argv[2] ?? 8811);

// What "run this artifact" means. An artifact in a language with a runner here
// gets a Run control; anything else is refused by the UI, never by the model.
const RUNNERS = {
  python: ["python3", "-B", "-c"],
  javascript: ["node", "-e"],
  js: ["node", "-e"],
  node: ["node", "-e"],
  shell: ["sh", "-c"],
  bash: ["sh", "-c"],
};
// The caps: 10s of life, 64KB of voice. Enough for a countdown timer, not
// enough for an afternoon. This is a local instrument — not a security
// boundary, the whole machine is already the model's — but a runaway turn
// should cost seconds, not a reboot.
const RUN_TIMEOUT = 10_000;
const RUN_MAX_OUTPUT = 64 * 1024;

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

createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");

  // POST /api/run — run model-authored code as a throwaway process. Loopback
  // only: whatever interface this server binds, the run control answers no
  // machine but its own. JSON in, JSON out, nothing written to this repo.
  if (req.method === "POST" && rel === "/api/run") {
    const remote = req.socket.remoteAddress;
    if (remote !== "127.0.0.1" && remote !== "::1" && remote !== "::ffff:127.0.0.1") {
      res.writeHead(403, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "loopback only" }));
      return;
    }
    (async () => {
      let body = "";
      req.setEncoding("utf8");
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 64 * 1024) {
          res.writeHead(413, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: "body too large" }));
          return;
        }
      }
      let params;
      try {
        params = JSON.parse(body);
      } catch {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "bad json" }));
        return;
      }
      const cmd = RUNNERS[String(params.lang ?? "").toLowerCase()];
      if (!cmd) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: `no runner for "${params.lang}"` }));
        return;
      }
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
