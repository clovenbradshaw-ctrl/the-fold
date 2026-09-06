import test from "node:test";
import assert from "node:assert/strict";
import { strainOf, recruit, substituted, THIN_PASSAGES, COVERAGE_FLOOR } from "./strain.js";

const P = (t) => ({ text: t });

test("strain 0 when S1 already knows the answer — there is nothing for S2 to be lazy about", () => {
  const r = strainOf({ answeredBeforeTheModel: { kind: "comparison" }, question: "anything" });
  assert.equal(r.level, 0);
  assert.match(r.reasons[0], /known exactly, with an address/);
});

test("what raises strain: nothing on point, poor coverage, a premise that failed, disagreement — and each names itself, strongest first", () => {
  const q = "When was the harbor light built?";
  assert.equal(strainOf({ question: q, passages: [P("The harbor light was built in 1841 by Ada Rowe.")] }).level, 1, "material that answers is not a strain");
  assert.equal(strainOf({ question: q, passages: [P("Turbines and gearboxes, quarterly.")] }).level, 2);
  const disagree = strainOf({ question: q, passages: [P("The harbor light was built in 1841.")], disagreements: 2 });
  assert.equal(disagree.level, 3);
  assert.match(disagree.reasons[0], /2 claim\(s\) the sources disagree on/, "the reason that drove the rung is reported first");
  const contradicted = strainOf({ question: q, passages: [P("The harbor light was built in 1841.")], premiseCheck: { unverified: [], contradicted: [{}] } });
  assert.equal(contradicted.level, 3);
  const learned = strainOf({ question: q, passages: [P("The harbor light was built in 1841.")], learnedInScope: 1 });
  assert.equal(learned.level, 2);
  // A single chunk carrying everything is the EASIEST case, not a thin one.
  const one = strainOf({ question: q, passages: [P("The harbor light was built in 1841 by Ada Rowe, above the coast.")] });
  assert.equal(one.level, 1, JSON.stringify(one.reasons));
  assert.equal(one.coverage, 1);
});

test("the slider is a floor and a ceiling on what strain may recruit; unset, strain decides alone", () => {
  const hard = { level: 3, reasons: ["sources disagree"] };
  const easy = { level: 1, reasons: ["ordinary"] };
  assert.equal(recruit(hard).depth, 3, "no preference: strain decides");
  assert.equal(recruit(hard, { asked: 1 }).depth, 1, "a low ask caps it");
  assert.match(recruit(hard, { asked: 1 }).why, /caps the 3/);
  assert.equal(recruit(easy, { asked: 3 }).depth, 3, "asking for care gets care even when it is easy");
  assert.match(recruit(easy, { asked: 3 }).why, /strain alone would have taken 1/);
  assert.equal(recruit(easy, { asked: 0 }).depth, 0);
});

test("attribute substitution: an answer that shares almost nothing with the question has changed the subject — the live failure, and its control", () => {
  const q = 'In POLICIES.md, one passage reads: "the witness said states six times in ____" What fills the blank?';
  const swap = substituted(q, "This analysis focuses on how a large language model is used to generate and understand text based on rules and prompts, which is fascinating.");
  assert.equal(swap.substituted, true);
  assert.equal(swap.share, 0);
  const real = substituted(q, "The blank in that POLICIES.md passage is filled by 463, where the witness said states six times.");
  assert.equal(real.substituted, false);
  assert.ok(real.share > 0.5);
  // Too little to read is not a judgement.
  assert.equal(substituted(q, "463."), null, "a short answer is not judged");
  assert.equal(substituted("hi", "Hello there, how can I help you today with anything at all?"), null, "a question with no content words is not judged");
  assert.equal(typeof THIN_PASSAGES, "number");
  assert.equal(typeof COVERAGE_FLOOR, "number");
});
