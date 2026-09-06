import test from "node:test";
import assert from "node:assert/strict";
import { answerBeforeTheModel, clozeAnswer, priorAnswer, whichPassage, wantsProse } from "./answerable.js";

const passages = [{ ref: "p.md#0-200", text: 'The witness, asked 24 times a section, said "states" six times in 463 — the select protocol is strict by design.' }];
const transcript = [{ turn: 2, question: "What about the tide?", answer: "The tide turns twice a day." }];

test("a blank is filled from the material verbatim, with its address — and ambiguity is declined rather than guessed", async () => {
  const got = clozeAnswer('one passage reads: "said "states" six times in ____ — the select protocol" What fills the blank?', passages);
  assert.equal(got.filler, "463");
  assert.equal(got.ref, "p.md#0-200");
  assert.equal(typeof got.start, "number");
  // Nothing in the material carries both sides.
  assert.equal(clozeAnswer('reads: "the harbour lamp was ____ by Ada Rowe" What fills the blank?', passages), null);
  // Two passages that disagree are not an answer.
  const two = [{ ref: "a#0-40", text: "built in 1841 by Rowe" }, { ref: "b#0-40", text: "built in 1852 by Rowe" }];
  assert.equal(clozeAnswer('reads: "built in ____ by Rowe" What fills the blank?', two), null);
  assert.equal(clozeAnswer("What does the file say?", passages), null, "no blank, not this door's");
});

test("what was said is quoted from the record, and only when the quoted question names one turn", () => {
  const got = priorAnswer('Earlier I asked you: "What about the tide?" What did you answer then?', transcript);
  assert.equal(got.turn, 2);
  assert.match(got.text, /On turn 2 you were asked "What about the tide\?" and the answer given was: The tide turns twice a day\./);
  assert.equal(priorAnswer("What did you say earlier?", transcript), null, "a vague ask is not this door's");
  assert.equal(priorAnswer('Earlier I asked "about turbines" — what did you say?', transcript), null);
});

test("the address is the answer when the address is the question", () => {
  assert.match(whichPassage("Which passage says so?", passages).text, /From this passage: p\.md#0-200\./);
  assert.equal(whichPassage("What does it say about the tide?", passages), null);
});

test("a question that also asks for prose belongs to the model, whatever computable thing it carries", async () => {
  const math = await import("mathjs");
  assert.ok(wantsProse("Which is earlier, 1805 or 1841, and why does it matter?"));
  assert.ok(!wantsProse("Which is earlier, 1805 or 1841, and how many years apart are they?"));
  assert.equal(answerBeforeTheModel({ question: "Which is earlier, 1805 or 1841, and why does it matter?", math }), null);
  const only = answerBeforeTheModel({ question: "Which is earlier, 1805 or 1841, and how many years apart are they?", math });
  assert.equal(only.kind, "comparison");
  assert.match(only.text, /The difference between them is 36 years\./);
  assert.equal(answerBeforeTheModel({ question: "Summarize what the file says about the witness.", passages, math }), null);
});
