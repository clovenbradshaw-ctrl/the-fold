// socrates.test.mjs — the standing-question archon, tested against real
// mergeTestimony-shaped verdicts and a real-shaped questionCycle result.

import test from "node:test";
import assert from "node:assert/strict";
import { BANK, socraticQuestion } from "./socrates.js";

const agree = { case: "AGREE", standing: "corroborated", holds: [{ who: "a" }, { who: "b" }], refused: [], undetermined: [] };
const single = { case: "SINGLE", standing: "single", holds: [{ who: "lincoln" }], refused: [], undetermined: [] };
const disagree = { case: "DISAGREE", standing: null, holds: [{ who: "lincoln" }], refused: [{ who: "lincolnNeg" }], undetermined: [] };
const contradictedSingle = { case: "CONTRADICTED", standing: "single", holds: [], refused: [{ who: "lincolnNeg" }], undetermined: [] };
const contradictedCorroborated = { case: "CONTRADICTED", standing: "corroborated", holds: [], refused: [{ who: "neg1" }, { who: "neg2" }], undetermined: [] };
const undetermined = { case: "UNDETERMINED", standing: null, holds: [], refused: [], undetermined: [] };

test("the bank is a closed, cited table — every row names a real Platonic passage", () => {
  assert.equal(BANK.length, 5);
  for (const row of BANK) {
    assert.ok(row.id, "every row is named");
    assert.match(row.cites, /^Plato, /, `${row.id} cites its source`);
    assert.equal(typeof row.question, "function");
  }
});

test("AGREE with no cycle asks nothing — two real witnesses agreeing is the honest resting point, not a place for forced doubt", () => {
  assert.equal(socraticQuestion(agree), null);
  assert.equal(socraticQuestion(agree, null), null);
});

test("SINGLE asks for the case FOR the claim (Euthyphro), never supplying it", () => {
  const q = socraticQuestion(single);
  assert.equal(q.id, "elenchus-definition");
  assert.equal(q.cites, "Plato, Euthyphro 6d–11b");
  assert.match(q.text, /what's the case for this/i);
  // never hands over a replacement belief — no witness name, no verdict word
  assert.doesNotMatch(q.text, /\blincoln\b/i);
});

test("DISAGREE names the actual disagreeing witness (Republic I) — a real counter-instance, not a generic one", () => {
  const q = socraticQuestion(disagree);
  assert.equal(q.id, "elenchus-counterinstance");
  assert.match(q.text, /lincolnNeg/);
});

test("UNDETERMINED names the stuck state honestly (Meno) and asks what would settle it, never what the answer is", () => {
  const q = socraticQuestion(undetermined);
  assert.equal(q.id, "elenchus-aporia");
  assert.match(q.text, /nothing here settles it yet/i);
});

test("CONTRADICTED (single) names the one refusing witness without claiming unanimity it doesn't have", () => {
  const q = socraticQuestion(contradictedSingle);
  assert.equal(q.id, "elenchus-unanimous-refusal");
  assert.match(q.text, /lincolnNeg refuses this/);
  assert.doesNotMatch(q.text, /every witness/i);
});

test("CONTRADICTED (corroborated) names the unanimous refusal and one of its witnesses (Apology)", () => {
  const q = socraticQuestion(contradictedCorroborated);
  assert.equal(q.id, "elenchus-unanimous-refusal");
  assert.match(q.text, /every witness here refuses this/i);
  assert.match(q.text, /neg1/);
});

test("a real questionCycle result always wins, regardless of merged.case — the question begging itself outranks any standing", () => {
  const cycle = { cycle: ["X causes Y", "Y causes X"], detail: "A support cycle..." };
  for (const merged of [agree, single, disagree, undetermined, contradictedCorroborated]) {
    const q = socraticQuestion(merged, cycle);
    assert.equal(q.id, "elenchus-question-begs-itself");
    assert.equal(q.cites, "Plato, Republic I, 336e–338b");
    assert.match(q.text, /X causes Y/);
  }
});

test("nothing here ever returns a severity, a refusal, or a blocked/verified field — disclosure only", () => {
  for (const merged of [agree, single, disagree, undetermined, contradictedSingle, contradictedCorroborated]) {
    const q = socraticQuestion(merged);
    if (q) {
      assert.ok(!("severity" in q));
      assert.ok(!("refused" in q));
      assert.ok(!("blocked" in q));
    }
  }
});
