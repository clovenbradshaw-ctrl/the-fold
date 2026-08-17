// builds.test.mjs — the build log's pure half: an append-only log whose head
// is a projection, re-appended byte-identically from the record lines alone.
// The I/O half (record/builds/ + materials/) is exercised by hand against
// serve.mjs, the same way library.test.mjs treats explore-server.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  BUILD_AUTHORS,
  BUILD_KINDS,
  BUILD_MESSAGE_MAX,
  CODE_KINDS,
  appendBuild,
  buildHash,
  captureMessage,
  createBuildLog,
  describeBuild,
  extFor,
  fileFor,
  lineDiff,
  projectCode,
  referencedBuild,
  slugify,
} from "./builds.js";

const deposit = (code, message = "a countdown timer", author = "model") => ({
  kind: BUILD_KINDS.DEPOSIT,
  message,
  author,
  code,
});

test("an empty log projects nothing", () => {
  assert.equal(projectCode(createBuildLog()), null);
});

test("deposits append sealed addenda: seq rises, prev chains, hash is stable", async () => {
  let log = createBuildLog();
  const a = "import time\n\nprint('hi')\n";
  log = await appendBuild(log, deposit(a));
  assert.equal(log.entries.length, 1);
  assert.equal(log.entries[0].seq, 0);
  assert.equal(log.entries[0].prev, null);
  assert.equal(log.entries[0].added, 3);
  assert.equal(log.entries[0].removed, 0);
  assert.equal(projectCode(log), a);

  const b = "import time\n\ndef countdown(t):\n    print(t)\n\nprint('hi')\n";
  log = await appendBuild(log, {
    kind: BUILD_KINDS.REVISION,
    message: "turn it into a function",
    author: "model",
    code: b,
  });
  assert.equal(log.entries.length, 2);
  assert.equal(log.entries[1].seq, 1);
  assert.equal(log.entries[1].prev, 0);
  assert.equal(projectCode(log), b);
  // the hash covers the payload AND the previous seq — git-like chaining
  assert.notEqual(log.entries[1].hash, log.entries[0].hash);
});

test("append-only is enforced by freeze — a sealed entry cannot be mutated", async () => {
  const log = await appendBuild(createBuildLog(), deposit("x = 1"));
  assert.ok(Object.isFrozen(log.entries));
  assert.ok(Object.isFrozen(log.entries[0]));
  assert.throws(() => {
    log.entries[0].code = "y = 2";
  }, TypeError);
});

test("the projection is the last code-bearing addendum; runs do not move it", async () => {
  let log = createBuildLog();
  const seed = "print('v1')\n";
  log = await appendBuild(log, deposit(seed));
  log = await appendBuild(log, {
    kind: BUILD_KINDS.RUN,
    message: "ran in the build editor",
    author: "me",
    run: { ok: true, code: 0, durationMs: 42 },
  });
  assert.equal(projectCode(log), seed);
  assert.equal(log.entries[1].kind, BUILD_KINDS.RUN);
  assert.equal(log.entries[1].added, undefined);
});

test("a reset addendum carries the deposit code, so the projection returns to it", async () => {
  let log = createBuildLog();
  const seed = "print('v1')\n";
  const rev = "print('v2')\n";
  log = await appendBuild(log, deposit(seed));
  log = await appendBuild(log, { kind: BUILD_KINDS.REVISION, message: "louder", author: "me", code: rev });
  assert.equal(projectCode(log), rev);
  log = await appendBuild(log, { kind: BUILD_KINDS.RESET, message: "reset to the original", author: "me", code: seed });
  assert.equal(projectCode(log), seed);
});

test("re-appending from the record lines alone reproduces the same log and projection", async () => {
  let log = createBuildLog();
  const seed = "print('v1')\n";
  const rev = "print('v2')\n";
  log = await appendBuild(log, deposit(seed));
  log = await appendBuild(log, { kind: BUILD_KINDS.REVISION, message: "louder", author: "me", code: rev });
  log = await appendBuild(log, { kind: BUILD_KINDS.RUN, message: "ran", author: "me", run: { ok: true, code: 0, durationMs: 9 } });

  let rebuilt = createBuildLog();
  for (const e of log.entries) {
    const { seq, hash, added, removed, ...payload } = e;
    rebuilt = await appendBuild(rebuilt, payload);
  }
  assert.equal(rebuilt.entries.length, log.entries.length);
  assert.deepEqual(
    rebuilt.entries.map((e) => [e.seq, e.prev, e.hash]),
    log.entries.map((e) => [e.seq, e.prev, e.hash]),
  );
  assert.equal(projectCode(rebuilt), projectCode(log));
});

test("the hash moves when the payload moves and only then", async () => {
  const a = await buildHash({ kind: BUILD_KINDS.DEPOSIT, message: "m", author: "model", code: "x", prev: null });
  const b = await buildHash({ kind: BUILD_KINDS.DEPOSIT, message: "m", author: "model", code: "x", prev: null });
  const c = await buildHash({ kind: BUILD_KINDS.DEPOSIT, message: "m", author: "model", code: "y", prev: null });
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("lineDiff counts added and removed lines as a multiset, not a set", () => {
  assert.deepEqual(lineDiff("", "a\nb\n"), { added: 2, removed: 0 });
  assert.deepEqual(lineDiff("a\nb\n", "a\nb\n"), { added: 0, removed: 0 });
  assert.deepEqual(lineDiff("a\nb\n", "a\nc\nb\n"), { added: 1, removed: 0 });
  assert.deepEqual(lineDiff("a\nb\n", "a\nc\n"), { added: 1, removed: 1 });
  assert.deepEqual(lineDiff("a\na\n", "a\n"), { added: 0, removed: 1 });
  assert.deepEqual(lineDiff("a\nb\n", ""), { added: 0, removed: 2 });
});

test("slugify and extFor make routes and extensions, never free strings", () => {
  assert.equal(slugify("Countdown Timer!!"), "countdown-timer");
  assert.equal(slugify("../../../etc/passwd"), "etc-passwd");
  assert.equal(slugify("   "), "build");
  assert.equal(extFor("python"), "py");
  assert.equal(extFor("JS"), "js");
  assert.equal(extFor("shell"), "sh");
  assert.equal(extFor("whatever"), "txt");
  assert.equal(fileFor("countdown", "a1b2c3d4e5f6", "python"), "countdown.a1b2c3d4.py");
});

test("referencedBuild reads only the number — the model's intent is never trusted", () => {
  assert.deepEqual(referencedBuild("here's a revision to build 3"), { n: 3 });
  assert.deepEqual(referencedBuild("revise build #2 please"), { n: 2 });
  assert.equal(referencedBuild("no build references here"), null);
  assert.equal(referencedBuild("build me a sandcastle"), null);
});

test("referencedBuild also resolves the panel's visible spelling: fold N", () => {
  assert.deepEqual(referencedBuild("a fix for fold 2"), { n: 2 });
  assert.deepEqual(referencedBuild("revise fold #4"), { n: 4 });
  assert.equal(referencedBuild("unfold 3 of the map"), null); // word boundary holds
  assert.equal(referencedBuild("the scaffold 9 story"), null);
});

test("captureMessage takes the first prose line, flattened and capped", () => {
  assert.equal(captureMessage("  \n\nA countdown timer.\n\nLonger notes."), "A countdown timer.");
  assert.equal(captureMessage(""), "");
  assert.equal(captureMessage("x".repeat(BUILD_MESSAGE_MAX + 20)).length, BUILD_MESSAGE_MAX);
});

test("describeBuild counts addenda and finds the most recent run outcome", async () => {
  let log = createBuildLog();
  log = await appendBuild(log, deposit("x"));
  assert.deepEqual(describeBuild(log), { addenda: 1, head: log.entries[0].hash, lastRun: null });
  log = await appendBuild(log, {
    kind: BUILD_KINDS.RUN,
    message: "ran",
    author: "me",
    at: "2026-08-16T12:00:00.000Z",
    run: { ok: true, code: 0, durationMs: 9 },
  });
  const d = describeBuild(log);
  assert.equal(d.addenda, 2);
  assert.deepEqual(d.lastRun, { ok: true, at: "2026-08-16T12:00:00.000Z" });
});

test("authors are a closed set and kinds are the closed vocabulary", async () => {
  await assert.rejects(
    appendBuild(createBuildLog(), { ...deposit("x"), author: "someone-else" }),
    /author/,
  );
  await assert.rejects(
    appendBuild(createBuildLog(), { kind: "whatever", message: "m", author: "model" }),
    /unknown kind/,
  );
  assert.ok(CODE_KINDS.includes(BUILD_KINDS.REVISION));
  assert.ok(BUILD_AUTHORS.includes("model") && BUILD_AUTHORS.includes("me"));
});
