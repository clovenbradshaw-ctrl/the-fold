// serve-run.test.mjs — the run crossing's assay: AUDIT-2026-08-16 finding 3.
//
// serve.mjs had no test file at all (builds.test.mjs:3-4 admits its I/O half
// is only "exercised by hand"), and /api/run — the build runner, sanctioned
// nowhere and recording nothing — was the residue left after the /api/exec
// PTY terminal was removed for P18. The POLICIES.md amendment to P16 (added
// alongside this file) sanctions /api/run explicitly on the condition that
// every attempt lands on record/build-record.jsonl, written by the server
// itself, before the crossing (a `build-run` row) and as it resolves (a
// `build-run-result` or `build-run-refused` row). This file boots a real
// serve.mjs as a child process — an ephemeral port, a throwaway record
// directory via THE_FOLD_RECORD_DIR — and checks the actual rows a real
// request produces, not a restatement of the code that writes them.

import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const here = (f) => join(ROOT, f);
const src = (f) => readFileSync(here(f), "utf8");

// Boots serve.mjs on an OS-assigned port against a throwaway record
// directory, waits for it to print that port, and returns a handle whose
// `stop()` kills the process and whose `recordPath` names the jsonl file
// this run's requests will land in.
async function bootServer() {
  const recordRoot = mkdtempSync(join(tmpdir(), "fold-serve-run-"));
  const proc = spawn("node", [here("serve.mjs"), "0"], {
    cwd: ROOT,
    env: { ...process.env, THE_FOLD_RECORD_DIR: join(recordRoot, "record") },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  proc.stderr.on("data", (b) => (stderr += b.toString()));
  const port = await new Promise((resolveP, rejectP) => {
    let out = "";
    const onData = (b) => {
      out += b.toString();
      const m = out.match(/localhost:(\d+)/);
      if (m) {
        proc.stdout.off("data", onData);
        resolveP(Number(m[1]));
      }
    };
    proc.stdout.on("data", onData);
    proc.on("error", rejectP);
    proc.on("exit", (code) => rejectP(new Error(`serve.mjs exited ${code} before listening: ${stderr}`)));
  });
  return {
    base: `http://127.0.0.1:${port}`,
    recordPath: join(recordRoot, "record", "build-record.jsonl"),
    stop: () => {
      proc.kill("SIGKILL");
      rmSync(recordRoot, { recursive: true, force: true });
    },
  };
}

// Every row written during a run — including build-entry rows from any
// concurrent /api/build-record test — filtered to just the run-crossing
// events, in the order they landed.
function runRows(recordPath) {
  if (!existsSync(recordPath)) return [];
  return readFileSync(recordPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l))
    .filter((r) => r.event === "build-run" || r.event === "build-run-result" || r.event === "build-run-refused");
}

test("a run that succeeds lands a build-run row before it starts and a build-run-result row after", async () => {
  const server = await bootServer();
  try {
    const res = await fetch(`${server.base}/api/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lang: "javascript", code: "console.log(2+2)" }),
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.stdout, "4\n");
    assert.equal(body.code, 0);

    const rows = runRows(server.recordPath);
    assert.equal(rows.length, 2, "exactly a crossing row and a result row");
    const [crossing, result] = rows;
    assert.equal(crossing.event, "build-run");
    assert.equal(result.event, "build-run-result");
    assert.equal(crossing.run, result.run, "the two rows share one id");
    assert.equal(crossing.lang, "javascript");
    assert.equal(crossing.code.text, "console.log(2+2)");
    assert.equal(crossing.code.kept, "console.log(2+2)".length);
    assert.equal(crossing.code.of, "console.log(2+2)".length);
    assert.match(crossing.code.sha256, /^[0-9a-f]{64}$/, "code is content-addressed");
    assert.equal(result.exit, 0);
    assert.equal(result.timedOut, false);
    assert.equal(result.stdout.of, "4\n".length, "the true output size is counted even though it fit");
    assert.equal(typeof result.durationMs, "number");
  } finally {
    server.stop();
  }
});

test("an unsupported language is refused before any process spawns, and the refusal is on record", async () => {
  const server = await bootServer();
  try {
    const res = await fetch(`${server.base}/api/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lang: "rust", code: "fn main() {}" }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /no runner/);

    const rows = runRows(server.recordPath);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].event, "build-run-refused");
    assert.equal(rows[0].lang, "rust");
    assert.match(rows[0].reason, /no runner/);
  } finally {
    server.stop();
  }
});

test("a malformed body is refused and recorded, never silently dropped", async () => {
  const server = await bootServer();
  try {
    const res = await fetch(`${server.base}/api/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    });
    assert.equal(res.status, 400);

    const rows = runRows(server.recordPath);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].event, "build-run-refused");
    assert.equal(rows[0].reason, "bad json");
  } finally {
    server.stop();
  }
});

test("a run that produces more output than the cap keeps the cap but records the true size", async () => {
  const server = await bootServer();
  try {
    // RUN_MAX_OUTPUT is 64KB; ask node to print well past it.
    const code = "process.stdout.write('x'.repeat(70000))";
    const res = await fetch(`${server.base}/api/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lang: "javascript", code }),
    });
    const body = await res.json();
    assert.equal(body.stdout.length, 64 * 1024, "the response itself stays capped");

    const rows = runRows(server.recordPath);
    const result = rows.find((r) => r.event === "build-run-result");
    assert.ok(result, "a result row landed");
    assert.equal(result.stdout.kept, 64 * 1024);
    assert.equal(result.stdout.of, 70000, "the drop is stated, not hidden");
  } finally {
    server.stop();
  }
});

test("a run this file's own oversized code never reaches the process is still on record as an attempt", async () => {
  // Code longer than RUN_CODE_KEPT (16KB) still runs in full — only the
  // RECORD row truncates the text, by design (the sha256 covers the whole
  // thing regardless).
  const server = await bootServer();
  try {
    const longCode = `console.log(${JSON.stringify("y".repeat(20000))}.length)`;
    const res = await fetch(`${server.base}/api/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lang: "javascript", code: longCode }),
    });
    const body = await res.json();
    assert.equal(body.stdout.trim(), "20000", "the full code ran, unaffected by the record's own kept budget");

    const rows = runRows(server.recordPath);
    const crossing = rows.find((r) => r.event === "build-run");
    assert.ok(crossing.code.of > 16 * 1024, "the full length is stated");
    assert.equal(crossing.code.kept, 16 * 1024, "the stored text is capped");
    assert.equal(crossing.code.text.length, 16 * 1024);
  } finally {
    server.stop();
  }
});

test("the off-loopback branch records through the same refuse() path as every other refusal", () => {
  // A real non-loopback request can't be produced from a same-machine test —
  // any socket this process opens to 127.0.0.1 IS loopback, by construction.
  // What's checkable, and what actually matters here, is that the branch
  // routes through the same recorded `refuse()` every other rejection uses
  // rather than a bare `json()` that would skip the record silently.
  const serve = src("serve.mjs");
  const runBlock = serve.slice(serve.indexOf('rel === "/api/run"'), serve.indexOf('rel === "/api/build-record"'));
  assert.match(
    runBlock,
    /if \(!isLoopback\(req\)\) return refuse\(403, "loopback only"/,
    "the off-loopback check must call refuse(), not a bare json() that would skip the record",
  );
});

test("POLICIES.md sanctions /api/run by name, with the P10 test link this file is", () => {
  const policies = src("POLICIES.md");
  assert.match(policies, /`\/api\/run`/, "the endpoint is named in policy, not left to a code comment alone");
  assert.match(policies, /serve-run\.test\.mjs/, "the amendment names its own enforcing test (P10)");
});

test("serve.mjs's own header names /api/run and the record it writes", () => {
  const serve = src("serve.mjs");
  assert.match(serve, /POST \/api\/run/);
  assert.match(serve, /build-run/);
  assert.match(serve, /build-run-result/);
  assert.match(serve, /build-run-refused/);
});
