import test from "node:test";
import assert from "node:assert/strict";
import { isAboutConversation, quotedAsk, recallTurns, asPassage, isTranscriptPassage, transcriptLine, turnRef, RECALL_TURNS } from "./transcript.js";

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

// ── the workspace: turns from another conversation in the same workspace ─────

test("a turn from another conversation is addressed by that conversation, says so in its own text, and never collides with a turn of ours", () => {
  const mine = asPassage(transcript[1]);
  const theirs = asPassage({ turn: 2, chat: 3, chatTitle: "The harbor survey", question: "What about the tide?", answer: "Two tides a day, per the survey." });
  // The same turn NUMBER in two conversations: one address each, and they differ.
  assert.equal(mine.ref, "turn:2");
  assert.equal(theirs.ref, "turn:3.2");
  assert.notEqual(mine.ref, theirs.ref, "an address that named both would name neither");
  assert.equal(theirs.source, theirs.ref, "the source is the address, as it is for our own turns");
  assert.ok(isTranscriptPassage(theirs), "still a transcript passage, still never material");
  assert.equal(theirs.turn, 2, "the turn number stays the conversation's own");
  assert.equal(theirs.chat, 3);
  // The mouth reads text, not refs: a foreign turn that did not name itself
  // would read as something this conversation said.
  assert.match(theirs.text, /^In "The harbor survey", earlier in this workspace:\nYou were asked: What about the tide\?/);
  assert.doesNotMatch(mine.text, /workspace/, "our own turns are not announced as somebody else's");
  assert.equal(turnRef({ turn: 4 }), "turn:4");
  assert.equal(turnRef({ turn: 4, chat: 2 }), "turn:2.4");
});

test("the line naming the passages names each conversation it reached, and an unnamed one is not given a name", () => {
  const line = transcriptLine([
    asPassage(transcript[0]),
    asPassage({ turn: 5, chat: 2, chatTitle: "The harbor survey", question: "q", answer: "a" }),
    asPassage({ turn: 6, chat: 2, chatTitle: "The harbor survey", question: "q", answer: "a" }),
    asPassage({ turn: 1, chat: 4, question: "q", answer: "a" }),
  ]);
  assert.match(line, /^Turn 1 of this conversation; turns 5, 6 of "The harbor survey", another conversation in this workspace; turn 1 of another conversation in this workspace, quoted from the record\./);
  assert.match(line, /what was said, which is not the same as what the sources establish/);
  // The single-conversation phrasing is untouched: a workspace of one reads
  // exactly as it read before there were workspaces.
  assert.match(transcriptLine([asPassage(transcript[0])]), /^Turn 1 of this conversation, quoted from the record\./);
});

test("recall is unchanged by where a turn came from: relevance decides, and the cap still caps", () => {
  const workspace = [
    ...transcript,
    { turn: 1, chat: 2, chatTitle: "The harbor survey", question: "Who signed off the harbor light survey?", answer: "Ada Rowe signed the harbor light survey." },
  ];
  const got = recallTurns("What did you say about Ada Rowe and the harbor light?", workspace);
  assert.ok(got.some((p) => p.ref === "turn:2.1"), "a relevant turn from another conversation is reachable");
  assert.ok(got.length <= RECALL_TURNS, "the workspace makes more turns reachable, never a bigger handful");
  // The control that matters: a workspace does not lower the bar. A turn
  // sharing nothing with the question is still not handed over, whichever
  // conversation it sits in.
  const off = recallTurns("What did you say about turbines and gearboxes?", workspace);
  assert.equal(off.length, 0, "nothing in common, nothing handed over — from any conversation");
});
