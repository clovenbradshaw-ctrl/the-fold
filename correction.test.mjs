import test from "node:test";
import assert from "node:assert/strict";
import { premisesOf, checkPremises, premiseFacts, correctTurn, turnSnipBlock } from "./correction.js";
import { splitSentences } from "./cite.js";

const passages = [
  { ref: "p.md#0-300", text: "The EFFECT_READS_THE_WHOLE_RUN constant is the named export that states it. It was declared in 1841 by Ada Rowe." },
  { ref: "p.md#300-500", text: "Millennium ran from 1996 to 1999 on Fox and was created by Chris Carter." },
];

test("a question that asserts something as established yields its premise; a plain question yields none", () => {
  const q = 'Earlier we established from POLICIES.md that: "EFFECT_READS_THE_Sherman_RUN is the named export that states it." Remind me what that passage says.';
  const p = premisesOf(q);
  assert.equal(p.length, 1);
  assert.match(p[0].text, /EFFECT_READS_THE_Sherman_RUN/);
  assert.deepEqual(premisesOf("What does the file say about Ada Rowe?"), []);
  assert.equal(premisesOf('You said "Millennium ran from 1996 to 1999 on Fox" — is that right?').length, 1);
});

test("the premise check finds the planted value in no passage and hands the source's own words back as a fact", () => {
  const q = 'Earlier we established from POLICIES.md that: "EFFECT_READS_THE_Sherman_RUN is the named export that states it." Remind me what that passage says.';
  const c = checkPremises(q, passages);
  assert.equal(c.premises.length, 1);
  assert.ok(c.unverified.length + c.contradicted.length === 1, "the premise did not check out");
  const facts = premiseFacts(c);
  assert.match(facts, /^About what the question takes as already settled:/);
  assert.match(facts, /Sherman|do not say/);
  assert.doesNotMatch(facts, /skeptic|careful|be wary|the user/i, "facts about the sources, never an instruction about posture");
});

test("a premise the material does establish passes clean and produces no facts block (control)", () => {
  const q = 'Earlier we established that "Millennium ran from 1996 to 1999 on Fox." What else does it say?';
  const c = checkPremises(q, passages);
  assert.equal(c.contradicted.length, 0);
  assert.equal(c.unverified.length, 0, JSON.stringify(c.premises[0]?.flags));
  assert.equal(premiseFacts(c), "");
});

test("a wrong answer is corrected at a plain turn: the flagged year is rewritten when the rewrite clears, and left standing when it does not", async () => {
  const draft = "The constant was declared in 1847 by Ada Rowe.";
  const good = await correctTurn({ text: draft, passages, question: "When was the constant declared?", splitSentences, rounds: 1, call: async () => "The constant was declared in 1841 by Ada Rowe." });
  assert.equal(good.asked, 1);
  assert.match(good.text, /1841/); assert.doesNotMatch(good.text, /1847/);
  assert.deepEqual(good.outcomes.map((o) => o.outcome), ["rewritten"]);
  assert.equal(good.check.after.flagged, 0);
  const bad = await correctTurn({ text: draft, passages, question: "When was the constant declared?", splitSentences, rounds: 1, call: async () => "The constant was declared in 1852 by Ada Rowe." });
  assert.deepEqual(bad.outcomes.map((o) => o.outcome), ["refused"]);
  assert.match(bad.text, /1847/, "the original stands, flagged");
  assert.equal(bad.check.after.flagged, 1);
});

test("no passages, no snips or no call is a no-op — every caller without material is byte-identical (control)", async () => {
  const t = "The constant was declared in 1847.";
  assert.equal((await correctTurn({ text: t, passages: [], splitSentences })).text, t);
  assert.equal((await correctTurn({ text: t, passages, question: "zzz qqq", splitSentences })).asked, 0);
  assert.equal((await correctTurn({ text: "", passages, splitSentences })).text, "");
  assert.equal(turnSnipBlock([], "anything"), "");
  assert.match(turnSnipBlock(passages, "what does it say about Ada Rowe"), /^What the sources say, verbatim/);
});
