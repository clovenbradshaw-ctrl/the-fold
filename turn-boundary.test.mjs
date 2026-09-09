// turn-boundary.test.mjs — the wall at turn-boundary.js's own door, plus a
// regression pinned to the exact live incident (see that file's header).

import { test } from "node:test";
import assert from "node:assert/strict";

import { CHAT_ROLE_MARKERS, turnBoundaryIndex, stripPastTurnBoundary } from "./turn-boundary.js";

test("a clean answer is untouched", () => {
  const text = "Not much here either! Just here to chat. What's on your mind?";
  assert.equal(turnBoundaryIndex(text), -1);
  assert.equal(stripPastTurnBoundary(text), text);
});

test("the exact live incident: a fabricated user turn and the model's own reply to it", () => {
  // Measured live, 2026-09-08: the tester typed "ok"; the visible reply
  // carried this shape verbatim, in one Ollama response.
  const leaked =
    "Sounds good!<|user|>\nnot really<|assistant|>\nAh, not really. Sounds like we're both in a reflective mood, huh?";
  const cut = stripPastTurnBoundary(leaked);
  assert.equal(cut, "Sounds good!");
  assert.equal(turnBoundaryIndex(leaked), "Sounds good!".length);
});

test("every named marker is caught, one per chat template family", () => {
  for (const marker of CHAT_ROLE_MARKERS) {
    const text = `Fine so far.${marker}\nwhatever comes next`;
    assert.equal(stripPastTurnBoundary(text), "Fine so far.", `did not cut at ${marker}`);
  }
});

test("the generic huggingface special-token shape is caught even for a marker not named above", () => {
  const text = "All set.<|end_of_text|>\nsome continuation";
  assert.equal(stripPastTurnBoundary(text), "All set.");
});

test("a marker split across two stream chunks is still caught once the buffer is whole", () => {
  // completeOnce checks the FULL accumulated text on every chunk, not just
  // the latest delta — this is why that matters: Ollama's own chunking can
  // split "<|user|>" as "<|us" + "er|>" across two reads.
  const firstChunk = "Sounds good!<|us";
  const wholeSoFar = firstChunk + "er|>\nnot really";
  assert.equal(turnBoundaryIndex(firstChunk), -1, "a dangling partial marker is not itself a false positive");
  assert.equal(stripPastTurnBoundary(wholeSoFar), "Sounds good!");
});

test("ordinary prose using a bare pipe or angle bracket is never mistaken for a marker", () => {
  const text = "Use `a | b` for a pipe, and `x < y` or `x > y` for comparisons.";
  assert.equal(turnBoundaryIndex(text), -1);
});

test("an answer whose very first token is a marker truncates to empty, not undefined", () => {
  assert.equal(stripPastTurnBoundary("<|user|>\nfabricated"), "");
});

test("non-string and nullish input do not throw", () => {
  assert.equal(stripPastTurnBoundary(null), "");
  assert.equal(stripPastTurnBoundary(undefined), "");
  assert.equal(turnBoundaryIndex(undefined), -1);
});
