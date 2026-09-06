import test from "node:test";
import assert from "node:assert/strict";
import { isAboutConversation, quotedAsk, recallTurns, asPassage, isTranscriptPassage, transcriptLine, RECALL_TURNS } from "./transcript.js";

const transcript = [
  { turn: 1, question: "What does the file say about Ada Rowe?", answer: "The harbor light was built in 1841 by Ada Rowe." },
  { turn: 2, question: "What about the tide?", answer: "The tide turns twice a day." },
  { turn: 3, question: "Tell me about Lisbon.", answer: "Ships came from Lisbon each spring." },
];

test("a question pointing back at what was said is recognised; a question about the material is not (control)", () => {
  assert.ok(isAboutConversation('Earlier in this conversation I asked you: "What does the file say about Ada Rowe?" What did you answer then?'));
  assert.ok(isAboutConversation("What did you say about the tide?"));
  assert.ok(isAboutConversation("You said the light was built in 1841 — is that right?"));
  assert.ok(isAboutConversation("Repeat the numbers you gave."));
  assert.equal(isAboutConversation("What does the file say about Ada Rowe?"), false);
  assert.equal(isAboutConversation("When was the harbor light built?"), false);
  assert.equal(quotedAsk('Earlier I asked: "What about the tide?" — what did you answer?'), "What about the tide?");
  assert.equal(quotedAsk("What did you say?"), null);
});

test("the quoted question wins outright, and a turn with nothing in common is not handed over (an absent history is a finding)", () => {
  const got = recallTurns('Earlier I asked you: "What about the tide?" What did you answer then?', transcript);
  assert.equal(got[0].turn, 2, "the quoted turn is first");
  assert.match(got[0].text, /You were asked: What about the tide\?\nYou answered: The tide turns twice a day\./);
  assert.equal(recallTurns("What did you say about turbines and gearboxes?", transcript).length, 0, "nothing in common, nothing handed over");
  assert.equal(recallTurns("What did you say?", []).length, 0);
  const many = Array.from({ length: 8 }, (_, i) => ({ turn: i + 1, question: "What about Ada Rowe and the harbor light?", answer: `Answer ${i} about Ada Rowe and the harbor light.` }));
  assert.equal(recallTurns("What did you say about Ada Rowe and the harbor light?", many).length, RECALL_TURNS, "capped");
});

test("a prior turn is addressed by its turn, marked as transcript, and labelled as what was said rather than what is true", () => {
  const p = asPassage(transcript[0]);
  assert.equal(p.ref, "turn:1"); assert.equal(p.kind, "transcript");
  assert.ok(isTranscriptPassage(p));
  assert.ok(!isTranscriptPassage({ ref: "h.txt#0-40" }));
  const line = transcriptLine([asPassage(transcript[0]), asPassage(transcript[1])]);
  assert.match(line, /^Turns 1, 2 of this conversation, quoted from the record\./);
  assert.match(line, /what was said, which is not the same as what the sources establish/);
  assert.equal(transcriptLine([{ ref: "h.txt#0-40" }]), "");
});
