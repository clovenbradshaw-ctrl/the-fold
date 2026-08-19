#!/usr/bin/env node
// fold-proxy.mjs — transparent proxy between opencode and Ollama.
//
// Intercepts POST /v1/chat/completions, injects the fold's constitution
// into the system prompt, forwards to Ollama, streams back unchanged.
// opencode never knows.
//
// Usage:
//   node fold-proxy.mjs                    # defaults: port 11435, upstream 11434
//   FOLD_PROXY_PORT=9000 node fold-proxy.mjs
//   FOLD_UPSTREAM=http://remote:11434 node fold-proxy.mjs
//
// Then point opencode at http://localhost:11435/v1

import http from "node:http";

// ── config ──────────────────────────────────────────────────────────────────

const PORT = Number(process.env.FOLD_PROXY_PORT) || 11435;
const UPSTREAM = process.env.FOLD_UPSTREAM || "http://localhost:11434";
const { hostname: UP_HOST, port: UP_PORT } = new URL(UPSTREAM);

// ── the fold ────────────────────────────────────────────────────────────────
// Derived from constitution.js CONSTITUTION_PROMPT — the one bounded paragraph
// the fold's mouth receives every turn. Adapted for opencode's context:
// code is the material, file paths are the addresses, honesty is the floor.

const FOLD_SYSTEM_PROMPT =
  "You are the mouth of a careful instrument, not its memory and not its judge. " +
  "Answer the question you were asked, in plain prose. When code or files are supplied, answer from them first and cite each file path and line number exactly as it appears. " +
  "Where the material is silent, note the gap in passing and still answer from your own knowledge, plainly — but never attach a file path to what the material did not give you: the instrument marks what stands on the material and checks the rest, so an honest answer helps and a dressed-up one is caught. " +
  "Prefer precision to hedging when the code is clear. " +
  "Do not claim that anything was checked, measured, or verified — checking is not your job, and the instrument attaches its own results.";

// ── logging ─────────────────────────────────────────────────────────────────

const ts = () => new Date().toISOString().slice(11, 23);
const log = (msg) => process.stderr.write(`[${ts()}] ${msg}\n`);

// ── proxy ───────────────────────────────────────────────────────────────────

function forward(req, res) {
  const opts = {
    hostname: UP_HOST,
    port: UP_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `${UP_HOST}:${UP_PORT}` },
  };

  const up = http.request(opts, (upRes) => {
    res.writeHead(upRes.statusCode, upRes.headers);
    upRes.pipe(res, { end: true });
  });

  req.pipe(up, { end: true });

  up.on("error", (err) => {
    log(`upstream error: ${err.message}`);
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "application/json" });
    }
    res.end(JSON.stringify({ error: { message: `upstream: ${err.message}` } }));
  });

  req.on("close", () => {
    up.destroy();
  });
}

function intercept(req, res) {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { message: "bad json" } }));
      return;
    }

    const msgs = parsed.messages ?? [];
    const firstUser = msgs.findIndex((m) => m.role === "user");

    // inject after system (if present) or at the front
    const idx = firstUser === -1 ? msgs.length : firstUser;
    msgs.splice(idx, 0, { role: "system", content: FOLD_SYSTEM_PROMPT });
    parsed.messages = msgs;

    const model = parsed.model || "?";
    log(`inject → model=${model} msgs=${msgs.length} (system injected at ${idx})`);

    const payload = JSON.stringify(parsed);

    // rebuild the request for upstream
    req.headers["content-length"] = Buffer.byteLength(payload);
    req.headers["content-type"] = "application/json";

    const upOpts = {
      hostname: UP_HOST,
      port: UP_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers,
    };

    const up = http.request(upOpts, (upRes) => {
      res.writeHead(upRes.statusCode, upRes.headers);
      upRes.pipe(res, { end: true });
    });

    up.write(payload);
    up.end();

    up.on("error", (err) => {
      log(`upstream error: ${err.message}`);
      if (!res.headersSent) {
        res.writeHead(502, { "content-type": "application/json" });
      }
      res.end(JSON.stringify({ error: { message: `upstream: ${err.message}` } }));
    });
  });
}

// ── server ──────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "*");
  res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // health
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", upstream: UPSTREAM, fold: true }));
    return;
  }

  // intercept chat completions
  if (req.method === "POST" && req.url === "/v1/chat/completions") {
    intercept(req, res);
    return;
  }

  // everything else: pass through unchanged (GET /v1/models, etc.)
  forward(req, res);
});

server.listen(PORT, "127.0.0.1", () => {
  log(`fold proxy listening on http://127.0.0.1:${PORT}`);
  log(`upstream: ${UPSTREAM}`);
  log(`opencode → http://127.0.0.1:${PORT}/v1`);
  log(`fold prompt: ${FOLD_SYSTEM_PROMPT.length} chars injected per chat completion`);
});

process.on("SIGINT", () => {
  log("shutting down");
  server.close(() => process.exit(0));
});
process.on("SIGTERM", () => {
  log("shutting down");
  server.close(() => process.exit(0));
});
