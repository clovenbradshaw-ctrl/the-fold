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
  // Corrections in scope are INFORMATION, not difficulty — measured: read as
  // strain, this fired on 148 of 214 real turns and pushed 62% of everything
  // to level 2, recruiting more work on most turns rather than targeting it.
  const learned = strainOf({ question: q, passages: [P("The harbor light was built in 1841.")], learnedInScope: 3 });
  assert.equal(learned.level, 1, "knowing what was wrong before does not make the question harder");
  assert.equal(learned.informed, 3, "but it is still on the record");
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

// ── P145: the stream's own belief decides, where there is one ───────────────

test("P145: with no belief supplied, nothing changes — the coverage floor decides exactly as before", () => {
  const args = { question: "what did lincoln sign in eighteen sixty two", passages: [{ text: "a passage about something else entirely" }] };
  const before = strainOf(args);
  const after = strainOf({ ...args, expect: null });
  assert.deepEqual(after, before, "an absent belief must leave the reading byte-identical");
});

test("P145: a turn the stream expects to go worse than usual is strained, and the reason says so", () => {
  const s = strainOf({
    question: "what did lincoln sign in eighteen sixty two",
    passages: [{ text: "lincoln signed it in eighteen sixty two, and the grant followed" }],
    expect: { p: 0.8, base: 0.5, why: "236 earlier turns of this shape" },
  });
  assert.ok(s.level >= 2, `expected strain, got ${s.level}`);
  assert.match(s.reasons.join(" "), /unbacked more often than this stream's usual/);
  assert.match(s.reasons.join(" "), /236 earlier turns/, "the reason must carry its evidence");
});

test("P145: a turn the stream expects to go BETTER than usual is not strained by the belief", () => {
  const s = strainOf({
    question: "what did lincoln sign in eighteen sixty two",
    passages: [{ text: "lincoln signed it in eighteen sixty two, and the grant followed" }],
    expect: { p: 0.2, base: 0.5 },
  });
  assert.ok(!s.reasons.join(" ").includes("unbacked more often"), "a better-than-usual turn may not be strained for it");
});

test("P145: the stream's own null, when it places the belief as an outlier, takes the top rung", () => {
  const s = strainOf({
    question: "what did lincoln sign in eighteen sixty two",
    passages: [{ text: "lincoln signed it in eighteen sixty two" }],
    expect: { p: 0.99, base: 0.5, placement: { strained: true }, why: "beyond anything resampling produced" },
  });
  assert.equal(s.level, 3);
  assert.match(s.reasons[0], /outlier/);
});

test("P145 CONTROL: the belief must not be able to strain a turn merely by existing", () => {
  // A belief exactly at the stream's base rate says nothing about this turn.
  // If this ever strains, the arm is measuring its own presence, not the turn.
  const s = strainOf({
    question: "what did lincoln sign in eighteen sixty two",
    passages: [{ text: "lincoln signed it in eighteen sixty two" }],
    expect: { p: 0.5, base: 0.5 },
  });
  assert.ok(!s.reasons.join(" ").includes("unbacked more often"), `a belief at the base rate must strain nothing: ${JSON.stringify(s.reasons)}`);
});

test("P145: a malformed belief is ignored rather than guessed at — the coverage rules resume", () => {
  const args = { question: "what did lincoln sign in eighteen sixty two", passages: [{ text: "unrelated" }] };
  for (const bad of [{ p: 0.9 }, { base: 0.5 }, { p: NaN, base: 0.5 }, {}]) {
    assert.deepEqual(strainOf({ ...args, expect: bad }), strainOf(args), `malformed belief ${JSON.stringify(bad)} must change nothing`);
  }
});
