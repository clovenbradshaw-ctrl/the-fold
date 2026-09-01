// fold-log.test.mjs — the walls themselves, against the real engine.
//
// Every test here runs fold-log.js over eoreader6's actual
// engine/holon/task-log.js (imported by relative path, the same way the
// page imports it from /engine) — no stub carries these walls. What is
// pinned: the EO typing of constitutive entries, that the past is kept,
// that churn is refused, that any cursor position projects back
// byte-identical, that a log rebuilds from its entries alone (P3's
// resumption property), and that a fold thread never runs the engine's
// algebra backward — verified by the engine's own checker, not a local
// re-statement of it.

import test from "node:test";
import assert from "node:assert/strict";

import * as taskLog from "../eoreader7/legacy-eoreader6.1/packages/engine/holon/task-log.js";
import { checkCubeProgression } from "../eoreader7/legacy-eoreader6.1/packages/engine/holon/task-log.js";
import { toDocument } from "./artifact.js";
import { makeFoldLog } from "./fold-log.js";

const foldLog = makeFoldLog(taskLog);

const codeSeg = { type: "code", lang: "python", code: "print(1)" };
const tableSeg = { type: "table", head: ["a", "b"], rows: [["1", "x,y"], ["2", 'say "hi"']] };

function sampleLog() {
  let log = foldLog.proposeFold({ n: 1, turn: 3, seg: codeSeg, caption: "python" });
  log = foldLog.attachRun(log, {
    params: { lang: "python", timeoutMs: 10_000, maxOutput: 65_536 },
    outcome: { ok: true, data: { code: 0, stdout: "1\n", stderr: "", timedOut: false } },
  });
  log = foldLog.reviseFold(log, { code: "print(2)", reason: "edit" });
  log = foldLog.attachRun(log, {
    params: { lang: "python", timeoutMs: 10_000, maxOutput: 65_536 },
    outcome: { ok: true, data: { code: 0, stdout: "2\n", stderr: "", timedOut: false } },
  });
  return log;
}

test("a fold is born as PROPOSE · SEG · Figure · produced — proposeDiscovered's cell, not a new one", () => {
  const log = foldLog.proposeFold({ n: 1, turn: 2, seg: codeSeg, caption: "python" });
  assert.equal(log.entries.length, 1);
  const e = log.entries[0];
  assert.equal(e.kind, taskLog.ENTRY_KINDS.PROPOSE);
  assert.equal(e.operator, "SEG");
  assert.equal(e.grain, "Figure");
  assert.equal(e.operator_basis, taskLog.OPERATOR_BASIS.PRODUCED);
  const b = foldLog.projectFold(log);
  assert.equal(b.code, "print(1)");
  assert.equal(b.version, 1);
  // The projection carries the algebra's own cell for the pair, derived by
  // the engine (SEG at Figure = Link · Dissecting), never hand-listed here.
  assert.equal(b.cell.terrain, "Link");
  assert.equal(b.cell.op, "SEG");
});

test("an edit is SUPERSEDE · SYN · Figure and the past stays on the log", () => {
  let log = foldLog.proposeFold({ n: 1, turn: 1, seg: codeSeg, caption: "python" });
  log = foldLog.reviseFold(log, { code: "print(2)" });
  assert.equal(log.entries.length, 2);
  const e = log.entries[1];
  assert.equal(e.kind, taskLog.ENTRY_KINDS.SUPERSEDE);
  assert.equal(e.operator, "SYN");
  assert.equal(e.grain, "Figure");
  assert.equal(e.supersedes, "f1.v1");
  // The past is not gone: the v1 entry is still there, and the projection at
  // the earlier cursor still answers with it.
  assert.equal(log.entries[0].code, "print(1)");
  assert.equal(foldLog.projectFold(log).version, 2);
  assert.equal(foldLog.projectFold(log, 0).version, 1);
});

test("identical code is churn and appends nothing", () => {
  let log = foldLog.proposeFold({ n: 1, turn: 1, seg: codeSeg, caption: "python" });
  const same = foldLog.reviseFold(log, { code: "print(1)" });
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
  assert.equal(results[0].task_id, "f1.v1");
  assert.equal(results[1].task_id, "f1.v2");
});

test("the cursor projects back every historical state byte-identically", () => {
  const log = sampleLog();
  // seq 0: v1, no run yet. seq 1: v1 with its run. seq 2: v2, no run yet
  // (a new version starts with no result — the old run belonged to v1).
  // seq 3: v2 with its run.
  const at0 = foldLog.projectFold(log, 0);
  assert.equal(at0.code, "print(1)");
  assert.equal(at0.lastRun, null);
  const at1 = foldLog.projectFold(log, 1);
  assert.equal(at1.code, "print(1)");
  assert.equal(at1.lastRun.data.stdout, "1\n");
  const at2 = foldLog.projectFold(log, 2);
  assert.equal(at2.code, "print(2)");
  assert.equal(at2.lastRun, null);
  const at3 = foldLog.projectFold(log, 3);
  assert.equal(at3.code, "print(2)");
  assert.equal(at3.lastRun.data.stdout, "2\n");
  assert.equal(at3.seqMax, 3);
});

test("a fold thread never runs the algebra backward — the engine's own checker stays silent", () => {
  let log = sampleLog();
  log = foldLog.reviseFold(log, { code: "print(3)", reason: "reset" });
  log = foldLog.reviseFold(log, { code: "print(4)", reason: "restore" });
  assert.deepEqual(checkCubeProgression(log), []);
});

test("a log rebuilds from its serialized entries alone (P3's resumption property)", () => {
  const log = sampleLog();
  const stored = JSON.parse(JSON.stringify(log.entries));
  const replayed = foldLog.replayEntries(stored);
  assert.deepEqual(foldLog.projectFold(replayed), foldLog.projectFold(log));
  for (let s = 0; s < log.nextSeq; s++) {
    assert.deepEqual(foldLog.projectFold(replayed, s), foldLog.projectFold(log, s));
  }
});

test("a stored row that violates the vocabulary throws on replay instead of silently loading", () => {
  const bad = [{ kind: "propose", task_id: "f1.v1", operator: "SEG", grain: "Figure" }]; // no operator_basis
  assert.throws(() => foldLog.replayEntries(bad), /operator_basis/);
});

test("retract keeps the entries and empties the live fold", () => {
  let log = sampleLog();
  const before = log.entries.length;
  log = foldLog.retractFold(log);
  assert.equal(log.entries.length, before + 1);
  assert.equal(foldLog.projectFold(log), null);
  // The past is still addressable: the projection before the retraction
  // answers.
  assert.equal(foldLog.projectFold(log, before - 1).code, "print(2)");
});

test("exportAt: code downloads as the version at the cursor, named by its address", () => {
  const log = sampleLog();
  const at0 = foldLog.exportAt(log, 0);
  assert.equal(at0.name, "fold-1@0.py");
  assert.equal(at0.text, "print(1)");
  const live = foldLog.exportAt(log, null);
  assert.equal(live.name, "fold-1@3.py");
  assert.equal(live.text, "print(2)");
});

test("exportAt: a table downloads as CSV with quoting, an html fold as the rendered document", () => {
  const tlog = foldLog.proposeFold({ n: 2, turn: 1, seg: tableSeg, caption: "table · 2 rows" });
  const csv = foldLog.exportAt(tlog, null);
  assert.equal(csv.name, "fold-2@0.csv");
  assert.equal(csv.text, 'a,b\n1,"x,y"\n2,"say ""hi"""\n');

  const hlog = foldLog.proposeFold({ n: 3, turn: 1, seg: { type: "code", lang: "html", code: "<p>hi</p>" }, caption: "html" });
  const doc = foldLog.exportAt(hlog, null, { toDocument });
  assert.equal(doc.mime, "text/html");
  // Whatever framing the preview renders is what downloads — the two cannot
  // drift because the same injected toDocument produces both.
  assert.equal(doc.text, toDocument({ type: "code", lang: "html", code: "<p>hi</p>" }));

  const slog = foldLog.proposeFold({ n: 4, turn: 1, seg: { type: "code", lang: "svg", code: "<svg/>" }, caption: "svg" });
  assert.equal(foldLog.exportAt(slog, null).mime, "image/svg+xml");
});

test("timeline labels are mechanical, one row per entry", () => {
  const log = sampleLog();
  const t = foldLog.timeline(log);
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
  let log = foldLog.proposeFold({ n: 7, turn: 1, seg: codeSeg, caption: "python" });
  const big = "x".repeat(20_000);
  log = foldLog.attachRun(log, {
    params: { lang: "python" },
    outcome: { ok: true, data: { code: 0, stdout: big, stderr: "small" } },
    keepChars: 16_384,
  });
  const run = foldLog.projectFold(log).lastRun;
  assert.equal(run.data.stdout.length, 16_384);
  assert.deepEqual(run.data.kept, { stdout: { kept: 16_384, of: 20_000 } });
  // Under the budget nothing is touched and nothing claims to have been.
  assert.equal(run.data.stderr, "small");
  let small = foldLog.proposeFold({ n: 8, turn: 1, seg: codeSeg, caption: "python" });
  small = foldLog.attachRun(small, { outcome: { ok: true, data: { code: 0, stdout: "1\n", stderr: "" } } });
  assert.equal(foldLog.projectFold(small).lastRun.data.kept, undefined);
});

test("a legacy mutable fold migrates to the honest floor: what was known becomes entries", () => {
  const log = foldLog.fromLegacy({
    n: 5,
    turn: 4,
    seg: codeSeg,
    caption: "python",
    code: "print(9)",
    lastRun: { ok: true, data: { code: 0, stdout: "9\n" } },
  });
  assert.equal(log.entries.length, 3); // propose + one supersede + one result
  const b = foldLog.projectFold(log);
  assert.equal(b.code, "print(9)");
  assert.equal(b.lastRun.data.stdout, "9\n");
  // A legacy fold whose code never diverged migrates without a phantom edit.
  const plain = foldLog.fromLegacy({ n: 6, turn: 1, seg: codeSeg, caption: "python", code: "print(1)", lastRun: null });
  assert.equal(plain.entries.length, 1);
});

test("instruction travels through proposeFold, projectFold, and survives replay", () => {
  const instr = "build a countdown from 10";
  let log = foldLog.proposeFold({ n: 9, turn: 1, seg: codeSeg, caption: "python", instruction: instr });
  const b = foldLog.projectFold(log);
  assert.equal(b.instruction, instr);
  // The instruction lands on the PROPOSE entry itself.
  assert.equal(log.entries[0].instruction, instr);
  // Revise does not disturb the instruction — the projection keeps it.
  log = foldLog.reviseFold(log, { code: "print(3)", reason: "edit" });
  assert.equal(foldLog.projectFold(log).instruction, instr);
  // Replay from serialized entries preserves it.
  const replayed = foldLog.replayEntries(JSON.parse(JSON.stringify(log.entries)));
  assert.equal(foldLog.projectFold(replayed).instruction, instr);
});

test("instruction defaults to null when omitted — legacy and mechanical turns", () => {
  const log = foldLog.proposeFold({ n: 10, turn: 1, seg: codeSeg, caption: "python" });
  assert.equal(foldLog.projectFold(log).instruction, null);
});
