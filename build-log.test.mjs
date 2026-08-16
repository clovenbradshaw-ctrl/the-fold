// build-log.test.mjs — the walls themselves, against the real engine.
//
// Every test here runs build-log.js over eoreader6's actual
// engine/holon/task-log.js (imported by relative path, the same way the
// page imports it from /engine) — no stub carries these walls. What is
// pinned: the EO typing of constitutive entries, that the past is kept,
// that churn is refused, that any cursor position folds back byte-identical,
// that a log rebuilds from its entries alone (P3's resumption property), and
// that a build thread never runs the engine's algebra backward — verified by
// the engine's own checker, not a local re-statement of it.

import test from "node:test";
import assert from "node:assert/strict";

import * as taskLog from "../eoreader6/packages/engine/holon/task-log.js";
import { checkCubeProgression } from "../eoreader6/packages/engine/holon/task-log.js";
import { toDocument } from "./artifact.js";
import { makeBuildLog } from "./build-log.js";

const buildLog = makeBuildLog(taskLog);

const codeSeg = { type: "code", lang: "python", code: "print(1)" };
const tableSeg = { type: "table", head: ["a", "b"], rows: [["1", "x,y"], ["2", 'say "hi"']] };

function sampleLog() {
  let log = buildLog.proposeBuild({ n: 1, turn: 3, seg: codeSeg, caption: "python" });
  log = buildLog.attachRun(log, {
    params: { lang: "python", timeoutMs: 10_000, maxOutput: 65_536 },
    outcome: { ok: true, data: { code: 0, stdout: "1\n", stderr: "", timedOut: false } },
  });
  log = buildLog.reviseBuild(log, { code: "print(2)", reason: "edit" });
  log = buildLog.attachRun(log, {
    params: { lang: "python", timeoutMs: 10_000, maxOutput: 65_536 },
    outcome: { ok: true, data: { code: 0, stdout: "2\n", stderr: "", timedOut: false } },
  });
  return log;
}

test("a build is born as PROPOSE · SEG · Figure · produced — proposeDiscovered's cell, not a new one", () => {
  const log = buildLog.proposeBuild({ n: 1, turn: 2, seg: codeSeg, caption: "python" });
  assert.equal(log.entries.length, 1);
  const e = log.entries[0];
  assert.equal(e.kind, taskLog.ENTRY_KINDS.PROPOSE);
  assert.equal(e.operator, "SEG");
  assert.equal(e.grain, "Figure");
  assert.equal(e.operator_basis, taskLog.OPERATOR_BASIS.PRODUCED);
  const b = buildLog.foldBuild(log);
  assert.equal(b.code, "print(1)");
  assert.equal(b.version, 1);
  // The fold carries the algebra's own cell for the pair, derived by the
  // engine (SEG at Figure = Link · Dissecting), never hand-listed here.
  assert.equal(b.cell.terrain, "Link");
  assert.equal(b.cell.op, "SEG");
});

test("an edit is SUPERSEDE · SYN · Figure and the past stays on the log", () => {
  let log = buildLog.proposeBuild({ n: 1, turn: 1, seg: codeSeg, caption: "python" });
  log = buildLog.reviseBuild(log, { code: "print(2)" });
  assert.equal(log.entries.length, 2);
  const e = log.entries[1];
  assert.equal(e.kind, taskLog.ENTRY_KINDS.SUPERSEDE);
  assert.equal(e.operator, "SYN");
  assert.equal(e.grain, "Figure");
  assert.equal(e.supersedes, "b1.v1");
  // The past is not gone: the v1 entry is still there, and the fold at the
  // earlier cursor still answers with it.
  assert.equal(log.entries[0].code, "print(1)");
  assert.equal(buildLog.foldBuild(log).version, 2);
  assert.equal(buildLog.foldBuild(log, 0).version, 1);
});

test("identical code is churn and appends nothing", () => {
  let log = buildLog.proposeBuild({ n: 1, turn: 1, seg: codeSeg, caption: "python" });
  const same = buildLog.reviseBuild(log, { code: "print(1)" });
  assert.equal(same, log);
  assert.equal(same.entries.length, 1);
});

test("a run is a RESULT with no operator — results attach, they never re-type", () => {
  const log = sampleLog();
  const results = log.entries.filter((e) => e.kind === taskLog.ENTRY_KINDS.RESULT);
  assert.equal(results.length, 2);
  for (const r of results) {
    assert.equal(r.operator, undefined);
    assert.ok(r.params.lang === "python");
  }
  // Each result attached to the version that actually ran.
  assert.equal(results[0].task_id, "b1.v1");
  assert.equal(results[1].task_id, "b1.v2");
});

test("the cursor folds back every historical state byte-identically", () => {
  const log = sampleLog();
  // seq 0: v1, no run yet. seq 1: v1 with its run. seq 2: v2, no run yet
  // (a new version starts with no result — the old run belonged to v1).
  // seq 3: v2 with its run.
  const at0 = buildLog.foldBuild(log, 0);
  assert.equal(at0.code, "print(1)");
  assert.equal(at0.lastRun, null);
  const at1 = buildLog.foldBuild(log, 1);
  assert.equal(at1.code, "print(1)");
  assert.equal(at1.lastRun.data.stdout, "1\n");
  const at2 = buildLog.foldBuild(log, 2);
  assert.equal(at2.code, "print(2)");
  assert.equal(at2.lastRun, null);
  const at3 = buildLog.foldBuild(log, 3);
  assert.equal(at3.code, "print(2)");
  assert.equal(at3.lastRun.data.stdout, "2\n");
  assert.equal(at3.seqMax, 3);
});

test("a build thread never runs the algebra backward — the engine's own checker stays silent", () => {
  let log = sampleLog();
  log = buildLog.reviseBuild(log, { code: "print(3)", reason: "reset" });
  log = buildLog.reviseBuild(log, { code: "print(4)", reason: "restore" });
  assert.deepEqual(checkCubeProgression(log), []);
});

test("a log rebuilds from its serialized entries alone (P3's resumption property)", () => {
  const log = sampleLog();
  const stored = JSON.parse(JSON.stringify(log.entries));
  const replayed = buildLog.replayEntries(stored);
  assert.deepEqual(buildLog.foldBuild(replayed), buildLog.foldBuild(log));
  for (let s = 0; s < log.nextSeq; s++) {
    assert.deepEqual(buildLog.foldBuild(replayed, s), buildLog.foldBuild(log, s));
  }
});

test("a stored row that violates the vocabulary throws on replay instead of silently loading", () => {
  const bad = [{ kind: "propose", task_id: "b1.v1", operator: "SEG", grain: "Figure" }]; // no operator_basis
  assert.throws(() => buildLog.replayEntries(bad), /operator_basis/);
});

test("retract keeps the entries and empties the live fold", () => {
  let log = sampleLog();
  const before = log.entries.length;
  log = buildLog.retractBuild(log);
  assert.equal(log.entries.length, before + 1);
  assert.equal(buildLog.foldBuild(log), null);
  // The past is still addressable: the fold before the retraction answers.
  assert.equal(buildLog.foldBuild(log, before - 1).code, "print(2)");
});

test("exportAt: code downloads as the version at the cursor, named by its address", () => {
  const log = sampleLog();
  const at0 = buildLog.exportAt(log, 0);
  assert.equal(at0.name, "build-1@0.py");
  assert.equal(at0.text, "print(1)");
  const live = buildLog.exportAt(log, null);
  assert.equal(live.name, "build-1@3.py");
  assert.equal(live.text, "print(2)");
});

test("exportAt: a table downloads as CSV with quoting, an html build as the rendered document", () => {
  const tlog = buildLog.proposeBuild({ n: 2, turn: 1, seg: tableSeg, caption: "table · 2 rows" });
  const csv = buildLog.exportAt(tlog, null);
  assert.equal(csv.name, "build-2@0.csv");
  assert.equal(csv.text, 'a,b\n1,"x,y"\n2,"say ""hi"""\n');

  const hlog = buildLog.proposeBuild({ n: 3, turn: 1, seg: { type: "code", lang: "html", code: "<p>hi</p>" }, caption: "html" });
  const doc = buildLog.exportAt(hlog, null, { toDocument });
  assert.equal(doc.mime, "text/html");
  // Whatever framing the preview renders is what downloads — the two cannot
  // drift because the same injected toDocument produces both.
  assert.equal(doc.text, toDocument({ type: "code", lang: "html", code: "<p>hi</p>" }));

  const slog = buildLog.proposeBuild({ n: 4, turn: 1, seg: { type: "code", lang: "svg", code: "<svg/>" }, caption: "svg" });
  assert.equal(buildLog.exportAt(slog, null).mime, "image/svg+xml");
});

test("timeline labels are mechanical, one row per entry", () => {
  const log = sampleLog();
  const t = buildLog.timeline(log);
  assert.deepEqual(
    t.map((r) => r.label),
    ["v1 · built", "ran", "v2 · edit", "ran"],
  );
  assert.deepEqual(
    t.map((r) => r.operator),
    ["SEG", null, "SYN", null],
  );
});

test("run output is kept to a declared budget, the drop stated on the entry, never silent", () => {
  let log = buildLog.proposeBuild({ n: 7, turn: 1, seg: codeSeg, caption: "python" });
  const big = "x".repeat(20_000);
  log = buildLog.attachRun(log, {
    params: { lang: "python" },
    outcome: { ok: true, data: { code: 0, stdout: big, stderr: "small" } },
    keepChars: 16_384,
  });
  const run = buildLog.foldBuild(log).lastRun;
  assert.equal(run.data.stdout.length, 16_384);
  assert.deepEqual(run.data.kept, { stdout: { kept: 16_384, of: 20_000 } });
  // Under the budget nothing is touched and nothing claims to have been.
  assert.equal(run.data.stderr, "small");
  let small = buildLog.proposeBuild({ n: 8, turn: 1, seg: codeSeg, caption: "python" });
  small = buildLog.attachRun(small, { outcome: { ok: true, data: { code: 0, stdout: "1\n", stderr: "" } } });
  assert.equal(buildLog.foldBuild(small).lastRun.data.kept, undefined);
});

test("a legacy mutable build migrates to the honest floor: what was known becomes entries", () => {
  const log = buildLog.fromLegacy({
    n: 5,
    turn: 4,
    seg: codeSeg,
    caption: "python",
    code: "print(9)",
    lastRun: { ok: true, data: { code: 0, stdout: "9\n" } },
  });
  assert.equal(log.entries.length, 3); // propose + one supersede + one result
  const b = buildLog.foldBuild(log);
  assert.equal(b.code, "print(9)");
  assert.equal(b.lastRun.data.stdout, "9\n");
  // A legacy build whose code never diverged migrates without a phantom edit.
  const plain = buildLog.fromLegacy({ n: 6, turn: 1, seg: codeSeg, caption: "python", code: "print(1)", lastRun: null });
  assert.equal(plain.entries.length, 1);
});
