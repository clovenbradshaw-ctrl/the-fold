// solon.test.mjs — the Integrity archon's controls, BUILT TO FAIL (II.23:
// a statistic earns its use by a control built to fail, named as one). A
// planted deviation must be caught; a clean input must stay clean. These
// are the planted deviations Ashby source-scans for — see the marker below.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  auditEnforcementMap,
  auditResults,
  classifyResultsDoc,
  createKeeper,
  diffFailures,
  referencedBy,
  scanResultsDir,
} from "./solon.js";
import { checkAppendOnly, heartbeatVerdict, verifyWatcher } from "./ashby.js";

// PLANTED-CONTROL — the marker Ashby requires to exist here: the regulator's
// own controls can fail, or the regulator is a wish, not a wall.

const CLEAN_MAP = [
  { article: "II.3", holds: "readRange", where: "source.js", enforced: true },
  { article: "III.1", holds: null, where: null, enforced: null },
];

test("map: a planted article claiming a ghost enforcing file is caught", () => {
  const v = auditEnforcementMap(
    [{ article: "II.9", holds: "checkGrounding", where: "ghost.js", enforced: true }],
    ["source.js"],
    [{ name: "source.test.mjs", body: 'import { readRange } from "./source.js";' }],
  );
  assert.equal(v.verdict, "map_stale");
  assert.equal(v.failures[0].where, "ghost.js");
});

test("map: a planted article whose enforcing file no test reads is caught", () => {
  const v = auditEnforcementMap(
    [{ article: "II.5", holds: "normalizeSummary", where: "fold.js", enforced: true }],
    ["fold.js"],
    [{ name: "aperture.test.mjs", body: "the aperture holds nothing about fold" }],
  );
  assert.equal(v.verdict, "map_stale");
  assert.match(v.failures[0].why, /no test/);
});

test("map: a clean map stays honest, and unwired stays visible", () => {
  const v = auditEnforcementMap(
    CLEAN_MAP,
    ["source.js"],
    [{ name: "source.test.mjs", body: 'import { readRange } from "./source.js";' }],
  );
  assert.equal(v.verdict, "map_honest");
  assert.equal(v.unwiredVisible, true);
  assert.equal(v.unwiredCount, 1);
});

test("results: a planted unenforced transcription is flagged, references are not", () => {
  const rows = [
    { doc: "planted-work-RESULTS.md", kind: "transcription", base: "planted-work", readers: [] },
    { doc: "some-HANDOFF.md", kind: "reference", base: null, readers: [] },
    { doc: "data.json", kind: "data", base: null, readers: [] },
  ];
  const v = auditResults(rows);
  assert.equal(v.verdict, "unenforced");
  assert.equal(v.unenforcedCount, 1);
  assert.equal(v.unenforced[0], "planted-work-RESULTS.md");
  assert.equal(v.enforcedCount, 0);
});

test("results: a reader test enforces a transcription; all_enforced when none hang", () => {
  const rows = [
    { doc: "planted-work-RESULTS.md", kind: "transcription", base: "planted-work", readers: ["planted-work.test.mjs"] },
  ];
  const v = auditResults(rows, 40);
  assert.equal(v.verdict, "all_enforced");
  assert.equal(v.enforcedCount, 1);
});

test("results: classifyResultsDoc tells transcription from reference from data", () => {
  assert.equal(classifyResultsDoc("worker-RESULTS.md", new Set(["worker"])).kind, "transcription");
  assert.equal(classifyResultsDoc("worker-HANDOFF.md", new Set(["worker"])).kind, "reference");
  assert.equal(classifyResultsDoc("numbers.json", new Set(["numbers"])), null);
  assert.equal(classifyResultsDoc("stray.md", new Set(["unrelated"])).kind, "data");
});

test("results: referencedBy finds a strong-token reader and ignores prose", () => {
  const bodies = [
    { name: "worker.test.mjs", body: 'const DRIVER = path.join(HERE, "worker.mjs");' },
    { name: "other.test.mjs", body: "some prose mentioning worker in passing" },
  ];
  const r = referencedBy("worker", bodies);
  assert.deepEqual(r, ["worker.test.mjs"]);
});

test("results: a short stem matches only on a strong token — no unearned length floor", () => {
  // A floor would silently pardon a short stem ("mhc") whose driver is
  // named differently ("mhc-battery.mjs"): the strong token is the whole
  // precision, and it must stay the whole precision.
  const short = [{ name: "mhc.test.mjs", body: 'const DRIVER = "mhc-battery.mjs";' }];
  assert.deepEqual(referencedBy("mhc", short), []);
  const direct = [{ name: "run.test.mjs", body: 'spawn("node", ["run.mjs"])' }];
  assert.deepEqual(referencedBy("run", direct), ["run.test.mjs"]);
});

test("results: end-to-end scan over real fixture files (planted and enforced)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "solon-results-"));
  try {
    fs.mkdirSync(path.join(dir, "results"));
    fs.mkdirSync(path.join(dir, "drivers"));
    fs.writeFileSync(path.join(dir, "results", "planted-work-RESULTS.md"), "# transcript\n");
    fs.writeFileSync(path.join(dir, "results", "read-work-RESULTS.md"), "# transcript\n");
    fs.writeFileSync(path.join(dir, "drivers", "read-work.mjs"), "console.log('x')");
    fs.mkdirSync(path.join(dir, "tests"));
    fs.writeFileSync(path.join(dir, "tests", "read-work.test.mjs"), 'import { x } from "../read-work.mjs";');
    const rows = scanResultsDir(path.join(dir, "results"), path.join(dir, "drivers"), [path.join(dir, "tests")]);
    const v = auditResults(rows);
    assert.equal(v.verdict, "unenforced");
    assert.equal(v.unenforcedCount, 1); // planted-work only; read-work is read
    assert.equal(v.unenforced[0], "planted-work-RESULTS.md");
    assert.equal(v.enforcedCount, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("suite: a planted new failure name is a deviation", () => {
  const d = diffFailures(["a", "b"], ["a", "b", "planted-new-failure"]);
  assert.equal(d.clean, false);
  assert.deepEqual(d.added, ["planted-new-failure"]);
  assert.deepEqual(d.fixed, []);
});

test("suite: a planted vanished name is a REC candidate, not clean", () => {
  const d = diffFailures(["a", "fixed-now"], ["a"]);
  assert.equal(d.clean, false);
  assert.deepEqual(d.fixed, ["fixed-now"]);
});

test("suite: an identical set is clean even when the count is high", () => {
  const d = diffFailures(["x", "y"], ["y", "x"]);
  assert.equal(d.clean, true);
});

test("record: a planted corrupt row breaks replay", () => {
  const r = checkAppendOnly(['{"seq":1,"event":"heartbeat"}', "not json", '{"seq":2,"event":"heartbeat"}']);
  assert.equal(r.verdict, "replay_failed");
  assert.equal(r.firstBad.line, 2);
});

test("record: a planted seq regression breaks replay", () => {
  const r = checkAppendOnly(['{"seq":2,"event":"heartbeat"}', '{"seq":1,"event":"heartbeat"}']);
  assert.equal(r.verdict, "replay_failed");
  assert.match(r.firstBad.why, /not monotonic/);
});

test("record: a clean append-only log replays, seq monotonic, no seq tolerated", () => {
  assert.equal(checkAppendOnly(['{"seq":1,"event":"a"}', '{"seq":2,"event":"b"}']).verdict, "append_only_holds");
  assert.equal(checkAppendOnly(['{"at":1}', '{"at":2}']).verdict, "append_only_holds");
});

test("heartbeat: a planted stale beat is stale, a fresh one is alive, none is never-alive", () => {
  assert.equal(heartbeatVerdict(null, 100, 10).alive, false);
  assert.equal(heartbeatVerdict(100, 100, 10).alive, true);
  assert.equal(heartbeatVerdict(0, 31, 10).alive, false); // > 3 × interval
});

test("ashby: the primus reads the FILE, so a planted stale watcher is caught", () => {
  const lines = [
    JSON.stringify({ event: "heartbeat", seq: 1, at: 0 }),
    JSON.stringify({ event: "sweep", seq: 2, at: 1, verdicts: { suite: { ok: true } } }),
  ];
  const v = verifyWatcher({
    lines,
    heartbeatIntervalMs: 10,
    nowMs: 100,
    testBodies: [{ name: "solon.test.mjs", body: "PLANTED-CONTROL" }],
    requiredMarkers: ["PLANTED-CONTROL"],
  });
  assert.equal(v.watcher, "watcher_stale");
  assert.equal(v.log.verdict, "append_only_holds");
  assert.equal(v.evidencePresent, true);
  assert.equal(v.controlsPresent, true);
});

test("ashby: a sweep with no verdicts is an evidence failure", () => {
  const lines = [
    JSON.stringify({ event: "heartbeat", seq: 1, at: 100 }),
    JSON.stringify({ event: "sweep", seq: 2, at: 101, verdicts: null }),
  ];
  const v = verifyWatcher({
    lines,
    heartbeatIntervalMs: 10,
    nowMs: 100,
    testBodies: [],
    requiredMarkers: ["PLANTED-CONTROL"],
  });
  assert.equal(v.evidencePresent, false);
  assert.equal(v.evidenceMissing, 1);
});

test("ashby: a missing control marker is a wish, not a wall", () => {
  const v = verifyWatcher({
    lines: [],
    heartbeatIntervalMs: 10,
    nowMs: 100,
    testBodies: [],
    requiredMarkers: ["PLANTED-CONTROL"],
  });
  assert.equal(v.controlsPresent, false);
  assert.deepEqual(v.controlsMissing, ["PLANTED-CONTROL"]);
});

// ── the keeper loop itself, pinned without a clock ────────────────────

function testKeeper({ onSweep, nowMs = 1000 }) {
  const events = [];
  let t = nowMs;
  const k = createKeeper({
    now: () => t,
    append: (line) => events.push(JSON.parse(line)),
    readLog: () => events.map((e) => JSON.stringify(e)),
    heartbeatMs: 10,
    sweepMs: 1000,
    onSweep: onSweep ?? (async () => ({ durationMs: 1 })),
  });
  return { k, events, tick: () => (t += 10) };
}

test("keeper: a beat writes a heartbeat with monotonic seq onto the record", async () => {
  const { k, events } = testKeeper({});
  await k.beat();
  await k.beat();
  const s = await k.status();
  assert.equal(events.length, 2);
  assert.equal(events[0].event, "heartbeat");
  assert.equal(events[0].seq, 1);
  assert.equal(events[1].seq, 2);
  assert.equal(s.ashby.beats, 2);
  assert.equal(s.ashby.watcher, "watcher_alive");
});

test("keeper: a sweep lands verdicts, and the next sweep reads them as its standing", async () => {
  const seen = [];
  const { k, events } = testKeeper({
    onSweep: async (standing) => {
      seen.push(standing);
      return { durationMs: 1, suite: { ok: false, failures: ["planted-failure"] } };
    },
  });
  await k.sweep();
  await k.sweep();
  assert.equal(seen[0], null, "the first sweep establishes the standing");
  assert.equal(seen[1].suite.failures[0], "planted-failure", "the second reads it as standing");
  assert.equal(events.filter((e) => e.event === "sweep").length, 2);
});

test("keeper: a slow sweep is skipped, never stacked (single-flight)", async () => {
  let release;
  const gate = new Promise((r) => {
    release = r;
  });
  const { k, events } = testKeeper({ onSweep: async () => gate.then(() => ({ durationMs: 1 })) });
  const first = k.sweep();
  await k.sweep(); // in flight — must skip, not stack
  release();
  await first;
  const s = await k.status();
  assert.equal(events.filter((e) => e.event === "sweep").length, 1);
  assert.equal(s.heartbeat.sweepSkipped, 1);
});

test("keeper: seq continues across the record, never restarts", async () => {
  const { k, events } = testKeeper({});
  await k.beat(); // seq 1
  await k.sweep(); // seq 2
  await k.beat(); // seq 3
  assert.deepEqual(events.map((e) => e.seq), [1, 2, 3]);
});