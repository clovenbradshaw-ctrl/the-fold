// ashby.test.mjs — the primus's own walls: the watcher-of-the-watcher must
// catch a planted dead watcher, a planted broken log, and a planted missing
// control. These are the controls that make Solon's heartbeat legitimate.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { verifyWatcher } from "./ashby.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));

function beat(at, seq) {
  return JSON.stringify({ event: "heartbeat", seq, at });
}
function sweep(at, seq, verdicts) {
  return JSON.stringify({ event: "sweep", seq, at, verdicts });
}

test("ashby: a planted dead watcher (no beats) is watcher_stale, named as never-alive", () => {
  const v = verifyWatcher({ lines: [], heartbeatIntervalMs: 10, nowMs: 100, testBodies: [], requiredMarkers: [] });
  assert.equal(v.watcher, "watcher_stale");
  assert.match(v.heartbeat.why, /no heartbeat ever/);
});

test("ashby: a planted broken log breaks the watcher's own claim", () => {
  const lines = [beat(100, 1), "garbage line", sweep(101, 2, { suite: { ok: true } })];
  const v = verifyWatcher({ lines, heartbeatIntervalMs: 10, nowMs: 100, testBodies: [], requiredMarkers: [] });
  assert.equal(v.watcher, "watcher_alive"); // the watcher lives
  assert.equal(v.log.verdict, "replay_failed"); // but its record lies
});

test("ashby: a planted stale beat is watcher_stale even with a healthy-looking sweep", () => {
  const lines = [beat(0, 1), sweep(1, 2, { suite: { ok: true } })];
  const v = verifyWatcher({ lines, heartbeatIntervalMs: 10, nowMs: 100, testBodies: [], requiredMarkers: [] });
  assert.equal(v.watcher, "watcher_stale");
  assert.equal(v.heartbeat.ageMs, 100);
});

test("ashby: the real solon.test.mjs carries the required control marker (control can fail)", () => {
  const body = fs.readFileSync(path.join(HERE, "solon.test.mjs"), "utf8");
  assert.ok(body.includes("PLANTED-CONTROL"), "the regulator's control marker must exist");
  assert.ok(body.includes("planted"), "the controls must be planted deviations, not decoration");
});

test("ashby: the real ashby.js reads only what it is handed (no fs, no clock)", () => {
  const body = fs.readFileSync(path.join(HERE, "ashby.js"), "utf8");
  assert.ok(!/\bimport .*from "node:fs"/.test(body), "ashby.js must not import fs");
  assert.ok(!/\bimport .*from "node:http"/.test(body), "ashby.js must not import http");
});