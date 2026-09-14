// muninn.test.mjs — the memory watcher's walls pinned (register decision,
// the second raven: muninn is what is recalled into the turn and what earns
// standing). Against the REAL retrieval.js and consequence.js — and through
// them the real eoreader7 native/memory/activation.js and the real task-log
// ground — not a restated table.

import test from "node:test";
import assert from "node:assert/strict";

import { createRetrievalIndex, encodeRecord, recallCandidates, recordCitation } from "./retrieval.js";
import { adaptTaskLog, classifyConsequence, createConsequenceLedger, scoreConsequence, evaluatePromotion } from "./consequence.js";
import { declareBudget, muninnRecall, muninnPromote, muninnDecision } from "./muninn.js";

let organs = null;
try {
  const mod = await import("../eoreader7/native/memory/activation.js");
  organs = { tokens: mod.tokens, codeOf: mod.codeOf, recall: mod.recall, encodeFrame: mod.encodeFrame };
} catch {
  organs = null;
}

let taskLog = null;
try {
  const [tl, cube] = await Promise.all([
    import("../eoreader7/native/kernel/task-log.js"),
    import("../eoreader7/native/kernel/cube.js"),
  ]);
  taskLog = adaptTaskLog({ ...tl, GRAINS: cube.GRAINS });
} catch {
  taskLog = null;
}

const distractor = (n) => `report number ${n} covers topic area ${n} entirely on its own terms today`;
function warmUp(index, n) {
  for (let i = 0; i < n; i++) encodeRecord(index, i, { gist: distractor(i) }, organs);
  return n;
}

// ── the declared budget (P9) ─────────────────────────────────────────────

test("declareBudget: a positive integer or null is declared; anything else is a typed refusal", () => {
  assert.equal(declareBudget(3).ok, true);
  assert.equal(declareBudget(null).ok, true);
  assert.equal(declareBudget(undefined).ok, true);
  for (const bad of [0, -1, 1.5, "3"]) {
    const r = declareBudget(bad);
    assert.equal(r.ok, false, String(bad));
    assert.equal(r.refused.type, "budget_undeclared");
  }
});

// ── the recall cut (P1: dropped is of the present, never the record) ─────

test("muninnRecall cuts the ranked candidates at the declared budget and NAMES what it dropped", () => {
  const fake = () => ({
    candidates: [
      { order: 10, score: 0.9, basis: "declared: ACT-R" },
      { order: 11, score: 0.8, basis: "declared: ACT-R" },
      { order: 12, score: 0.7, basis: "declared: ACT-R" },
    ],
    gap: null,
  });
  const { recalled, dropped, gap } = muninnRecall(fake, null, "q", null, { turnIndex: 5, budget: 2 });
  assert.equal(gap, null);
  assert.deepEqual(recalled.map((c) => c.order), [10, 11]);
  assert.deepEqual(dropped.map((c) => c.order), [12]);
  assert.ok(recalled.every((c) => c.kept === true));
  assert.ok(dropped.every((c) => c.kept === false));
});

test("muninnRecall with a null budget recalls everything and drops nothing", () => {
  const fake = () => ({
    candidates: [{ order: 10, score: 0.9 }, { order: 11, score: 0.8 }],
    gap: null,
  });
  const { recalled, dropped } = muninnRecall(fake, null, "q", null, { turnIndex: 5, budget: null });
  assert.equal(recalled.length, 2);
  assert.equal(dropped.length, 0);
});

test("a gap from the organ is carried typed, never an invented top-k (P41)", () => {
  const fake = () => ({ candidates: [], gap: "retrieval_no_cue", detail: "the question shares no vocabulary" });
  const r = muninnRecall(fake, null, "q", null, { turnIndex: 5, budget: 3 });
  assert.equal(r.gap, "retrieval_no_cue");
  assert.deepEqual(r.recalled, []);
  assert.deepEqual(r.dropped, []);
});

test("an undeclared budget is refused before the organ is even consulted", () => {
  let called = false;
  const fake = () => { called = true; return { candidates: [], gap: null }; };
  const r = muninnRecall(fake, null, "q", null, { turnIndex: 5, budget: 0 });
  assert.equal(r.refused.type, "budget_undeclared");
  assert.equal(called, false);
});

// ── the promotion gate (recurrence AND consequence, never recurrence) ────

test("muninnPromote promotes only on recurrence AND consequence, and names which half failed", () => {
  assert.deepEqual(
    muninnPromote(evaluatePromotion, { order: 3, recurs: true, consequence: { status: "mattered", scores: [{ score: 1 }] } }),
    { order: 3, promoted: true, reason: "recurrence_and_consequence" },
  );
  assert.equal(muninnPromote(evaluatePromotion, { order: 3, recurs: false, consequence: { status: "mattered" } }).reason, "not_yet_recurring");
  assert.equal(muninnPromote(evaluatePromotion, { order: 3, recurs: true, consequence: { status: "consequence_untested" } }).reason, "consequence_untested");
  assert.equal(muninnPromote(evaluatePromotion, { order: 3, recurs: true, consequence: { status: "recurring_no_consequence" } }).reason, "recurring_no_consequence");
});

test("through the REAL consequence ledger: a claim that never moved a verdict stays recalled, never standing", () => {
  if (!taskLog) return;
  const ledger = createConsequenceLedger(taskLog);
  let log = taskLog.createTaskLog();
  log = ledger.proposeGroundVersion(log, { turnIndex: 0, summary: { records: ["r1"] } });
  // one turn's ablation moved the verdict (the claim mattered)
  log = scoreConsequence(ledger, log, { turnId: "t1", turnIndex: 1, verdictWith: "holds", verdictWithout: "unbound" });
  const mattered = classifyConsequence(ledger, log, ledger.latestGroundVersion(log).task_id);
  // a second, separate reference: same recurrence, but its ablation changed nothing
  const noConsequence = { status: "recurring_no_consequence", scores: [{ score: 0, null_score: 0 }] };

  assert.equal(muninnPromote(evaluatePromotion, { order: 1, recurs: true, consequence: mattered }).promoted, true);
  assert.equal(muninnPromote(evaluatePromotion, { order: 2, recurs: true, consequence: noConsequence }).promoted, false);
});

// ── the record line ──────────────────────────────────────────────────────

test("muninnDecision names what entered the present, what was dropped, and why", () => {
  const d = muninnDecision({
    act: "recall",
    cue: "who was lincoln's first vice president",
    recalled: [{ order: 9 }],
    dropped: [{ order: 10 }],
    budget: 1,
  });
  assert.equal(d.act, "muninn-recall");
  assert.deepEqual(d.recalled, [9]);
  assert.deepEqual(d.dropped, [10]);
  assert.equal(d.budget, 1);
  assert.ok(d.cue.includes("lincoln"));
});

// ── composition against the REAL organs ──────────────────────────────────

test("a dormant record the question needs enters the present within the budget, and the dropped are named, not lost", () => {
  if (!organs) return;
  const index = createRetrievalIndex();
  let n = warmUp(index, 16);
  const needed = n; // order 16 — the record the later question actually needs
  encodeRecord(index, needed, { gist: "hannibal hamlin of maine was lincoln's first vice president serving 1861 to 1865" }, organs);
  encodeRecord(index, n + 1, { gist: "hannibal hamlin was a senator from maine before the vice presidency" }, organs);
  encodeRecord(index, n + 2, { gist: distractor(n + 2) }, organs);
  encodeRecord(index, n + 3, { gist: "andrew johnson succeeded lincoln as president after the assassination in 1865" }, organs);
  // a genuinely NEEDED memory has been recalled and used before — that is
  // what separates it on the ranking (ACT-R over citation history), and it
  // is the memory watcher's own training signal (recordCitation, B2).
  recordCitation(index, needed, 18);
  recordCitation(index, needed, 22);

  const r = muninnRecall(recallCandidates, index, "who was lincoln's first vice president", organs, { turnIndex: 25, budget: 1 });
  assert.equal(r.gap, null, "the cue must surface the memory at all — a gap here is the memory failing, reported as such");
  assert.ok(r.recalled.some((c) => c.order === needed), `the needed record (order ${needed}) must be in the present`);
  assert.ok(r.recalled.every((c) => Number.isInteger(c.order)), "recalled records are named by order — the caller joins back to the record's own bytes, never prose (P67)");
  // the cut is of the present: the index is untouched, so the dropped stay recallable
  assert.ok(index.citedAt.has(needed), "the record is still in the index — a cut never removes a record (P1)");
});

test("a question with nothing to recall is a typed gap, never a guess — even with a generous budget", () => {
  if (!organs) return;
  const index = createRetrievalIndex();
  warmUp(index, 8);
  const r = muninnRecall(recallCandidates, index, "recommend a recipe for banana bread", organs, { turnIndex: 20, budget: 5 });
  assert.equal(r.gap, "retrieval_no_cue");
  assert.deepEqual(r.recalled, []);
});