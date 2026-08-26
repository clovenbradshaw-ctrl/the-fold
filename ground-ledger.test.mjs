// ground-ledger.test.mjs — the firewall itself, against the real engine.
//
// What is pinned: a ground version is born as PROPOSE · INS · Figure ·
// declared-basis; turnIndex must strictly advance (rule 1 — retroactive
// ground insertion is unrepresentable); identical ground is refused as
// churn; the prequential lookup never returns a version at or after the
// queried turn; a score attaches as a RESULT to the correct ground
// version; a turn_id can be scored at most once, ever (rule 2 — the actual
// retroactivity test); scoring before any ground exists is a typed
// `no_ground` gap; and a log rebuilds from its entries alone (P3's
// resumption property, checked here as exact entry/seq equality rather
// than a content hash — this ledger does not chain hashes the way
// builds.js does, a deliberate, smaller property, not an oversight).

import test from "node:test";
import assert from "node:assert/strict";

import * as taskLog from "../eoreader7/legacy-eoreader6.1/packages/engine/holon/task-log.js";
import { checkCubeProgression } from "../eoreader7/legacy-eoreader6.1/packages/engine/holon/task-log.js";
import { makeGroundLedger } from "./ground-ledger.js";

const ledger = makeGroundLedger(taskLog);

test("a ground version is born as PROPOSE · INS · Figure · declared, findable by a later turn", () => {
  let log = taskLog.createTaskLog();
  log = ledger.proposeGroundVersion(log, { turnIndex: 3, summary: { topic: "a" } });
  assert.equal(log.entries.length, 1);
  const e = log.entries[0];
  assert.equal(e.kind, taskLog.ENTRY_KINDS.PROPOSE);
  assert.equal(e.task_id, "ground:v1");
  assert.equal(e.operator, "INS");
  assert.equal(e.grain, "Figure");
  assert.equal(e.operator_basis, taskLog.OPERATOR_BASIS.DECLARED);

  const found = ledger.groundVersionAsOf(log, 4);
  assert.equal(found.task_id, "ground:v1");
});

test("rule 1: turnIndex must strictly advance — a version cannot be frozen as of a turn already passed", () => {
  let log = taskLog.createTaskLog();
  log = ledger.proposeGroundVersion(log, { turnIndex: 5, summary: { topic: "a" } });
  assert.throws(
    () => ledger.proposeGroundVersion(log, { turnIndex: 5, summary: { topic: "b" } }),
    RangeError,
  );
  assert.throws(
    () => ledger.proposeGroundVersion(log, { turnIndex: 2, summary: { topic: "b" } }),
    RangeError,
  );
});

test("identical ground is churn, refused — no entry appended", () => {
  let log = taskLog.createTaskLog();
  log = ledger.proposeGroundVersion(log, { turnIndex: 1, summary: { topic: "a", turnCount: 1 } });
  const before = log.entries.length;
  log = ledger.proposeGroundVersion(log, { turnIndex: 9, summary: { topic: "a", turnCount: 1 } });
  assert.equal(log.entries.length, before);
});

test("the prequential lookup never returns a version at or after the queried turn, and null before any version exists", () => {
  let log = taskLog.createTaskLog();
  assert.equal(ledger.groundVersionAsOf(log, 1), null);

  log = ledger.proposeGroundVersion(log, { turnIndex: 2, summary: { topic: "a" } });
  assert.equal(ledger.groundVersionAsOf(log, 2), null); // frozen AT turn 2 is not strictly before turn 2
  assert.equal(ledger.groundVersionAsOf(log, 3).task_id, "ground:v1");

  log = ledger.proposeGroundVersion(log, { turnIndex: 5, summary: { topic: "b" } });
  assert.equal(ledger.groundVersionAsOf(log, 5).task_id, "ground:v1"); // v2 froze AT turn 5, not before it
  assert.equal(ledger.groundVersionAsOf(log, 6).task_id, "ground:v2");
});

test("a score lands as a RESULT attached to the ground version, never re-typing it", () => {
  let log = taskLog.createTaskLog();
  log = ledger.proposeGroundVersion(log, { turnIndex: 2, summary: { topic: "a" } });
  log = ledger.scoreTurn(log, { turnId: "t3", turnIndex: 3, score: 4.2, nullScore: 5.9 });

  const resultEntry = log.entries.find((e) => e.kind === taskLog.ENTRY_KINDS.RESULT);
  assert.equal(resultEntry.task_id, "ground:v1");
  assert.equal(resultEntry.operator, undefined); // results never carry an operator
  assert.equal(resultEntry.result.turn_id, "t3");
  assert.equal(resultEntry.result.ground_version, "ground:v1");

  const scores = ledger.allScores(log);
  assert.equal(scores.length, 1);
  assert.equal(scores[0].score, 4.2);
});

test("rule 2, the actual retroactivity test: a turn already scored can never be re-priced", () => {
  let log = taskLog.createTaskLog();
  log = ledger.proposeGroundVersion(log, { turnIndex: 1, summary: { topic: "a" } });
  log = ledger.scoreTurn(log, { turnId: "t2", turnIndex: 2, score: 3.0, nullScore: 6.0 });

  // The ground moves on (a later, unrelated version)...
  log = ledger.proposeGroundVersion(log, { turnIndex: 5, summary: { topic: "b" } });

  // ...and an attempt to re-score t2 — against either the old ground or the
  // new one — is refused outright, not silently overwritten.
  assert.throws(
    () => ledger.scoreTurn(log, { turnId: "t2", turnIndex: 2, score: 0.1, nullScore: 6.0 }),
    RangeError,
  );
});

test("scoring before any ground exists is a typed no_ground gap, not a silent zero", () => {
  let log = taskLog.createTaskLog();
  try {
    ledger.scoreTurn(log, { turnId: "t1", turnIndex: 1, score: 1, nullScore: 1 });
    assert.fail("expected scoreTurn to throw");
  } catch (err) {
    assert.equal(err.gap, "no_ground");
  }
});

test("a log rebuilds from its entries alone (resumption property), byte-identical", () => {
  let log = taskLog.createTaskLog();
  log = ledger.proposeGroundVersion(log, { turnIndex: 1, summary: { topic: "a" } });
  log = ledger.scoreTurn(log, { turnId: "t2", turnIndex: 2, score: 3.0, nullScore: 6.0 });
  log = ledger.proposeGroundVersion(log, { turnIndex: 4, summary: { topic: "b" } });
  log = ledger.scoreTurn(log, { turnId: "t5", turnIndex: 5, score: 2.1, nullScore: 5.5 });

  const replayed = ledger.replayEntries(log.entries);
  assert.deepEqual(replayed.entries, log.entries);
  assert.equal(replayed.nextSeq, log.nextSeq);
});

test("checkCubeProgression stays silent over a realistic ground+score sequence — the engine's own checker, not a local restatement", () => {
  let log = taskLog.createTaskLog();
  log = ledger.proposeGroundVersion(log, { turnIndex: 1, summary: { topic: "a" } });
  log = ledger.scoreTurn(log, { turnId: "t2", turnIndex: 2, score: 3.0, nullScore: 6.0 });
  log = ledger.scoreTurn(log, { turnId: "t3", turnIndex: 3, score: 2.5, nullScore: 6.0 });
  log = ledger.proposeGroundVersion(log, { turnIndex: 4, summary: { topic: "b" } });
  log = ledger.scoreTurn(log, { turnId: "t5", turnIndex: 5, score: 1.9, nullScore: 5.5 });

  const flags = checkCubeProgression(log);
  assert.deepEqual(flags, []);
});

test("a malformed entry replayed from storage throws instead of loading silently", () => {
  const badEntries = [{ kind: "not-a-real-kind", task_id: "x" }];
  assert.throws(() => ledger.replayEntries(badEntries), TypeError);
});
