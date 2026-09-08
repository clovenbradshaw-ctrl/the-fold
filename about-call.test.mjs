// node --test about-call.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

import { interpretAsk, looksLikeAnAnswer, ABOUT_CALL_MAX_CHARS } from "./about-call.js";
import { materialView, abbreviate } from "./about.js";

const ROWS = materialView({
  sources: { "wp.txt": "x".repeat(3_293_655) },
  chunks: [{ source: "wp.txt", text: "x", identity: { declared: { title: "War and Peace", author: "graf Leo Tolstoy", giver: "the source file's own declared header" } } }],
  reading: { "wp.txt": { cursor: 200, total: 1051 } },
});
const SAMPLE = [
  { text: "The princess bent over the exercise book on the table, and the prince pushed the book away.", ref: "wp.txt#1" },
  { text: "He took the exercise book containing lessons in geometry written by himself and drew a chair.", ref: "wp.txt#2" },
];
const DIGEST = abbreviate(SAMPLE, { chars: 2400, samples: 16, each: 220 });

// looksLikeAnAnswer — the wall.

test("looksLikeAnAnswer refuses a reply past the budget or carrying more than one sentence", () => {
  assert.equal(looksLikeAnAnswer("Asking about the whole gist of it."), false);
  assert.equal(looksLikeAnAnswer("a".repeat(ABOUT_CALL_MAX_CHARS + 1)), true);
  assert.equal(looksLikeAnAnswer("It is one thing. It is also another thing."), true);
  assert.equal(looksLikeAnAnswer(""), true);
  assert.equal(looksLikeAnAnswer(null), true);
});

test("looksLikeAnAnswer refuses a reply that leaks the sample's own vocabulary, even when short", () => {
  // A genuine specimen: the actual failure mode measured live was a mouth
  // narrating the material's content — here the reply names the exercise
  // book and the prince, words the SAMPLE carries and the QUESTION does not.
  const reply = "They want to know about the prince and his exercise book.";
  assert.equal(looksLikeAnAnswer(reply, { question: "what's this book about?", sampleText: DIGEST.text }), true);
});

test("looksLikeAnAnswer admits a reply built from the question's own words plus ordinary meta-vocabulary", () => {
  const reply = "Asking what this book covers overall, not one specific detail.";
  assert.equal(looksLikeAnAnswer(reply, { question: "what's this book about?", sampleText: DIGEST.text }), false);
});

test("looksLikeAnAnswer with no sample text only checks shape", () => {
  assert.equal(looksLikeAnAnswer("Asking for the gist.", { question: "what's this about?", sampleText: "" }), false);
});

// interpretAsk — the call, and its degrade paths.

test("interpretAsk requires an injected call", async () => {
  await assert.rejects(() => interpretAsk("what's this about?", { rows: ROWS }), /call is injected/);
});

test("interpretAsk returns null when there is nothing attached — the view is empty, so nothing is asked", async () => {
  let called = false;
  const call = async () => { called = true; return "anything"; };
  const r = await interpretAsk("what's this about?", { rows: [], call });
  assert.equal(r, null);
  assert.equal(called, false, "no call spent on nothing to describe");
});

test("interpretAsk returns the model's own short reading of the ask, verbatim", async () => {
  const sent = [];
  const call = async (messages) => { sent.push(messages); return "Asking for the whole gist of the book."; };
  const r = await interpretAsk("what's this book about?", { rows: ROWS, digest: DIGEST, call });
  assert.equal(r, "Asking for the whole gist of the book.");
  // The prompt carries the situation, never raw content — and the question,
  // verbatim, so the model can actually read what was asked.
  const sys = sent[0][0].content;
  const user = sent[0][1].content;
  assert.match(sys, /never asked to answer|Not the answer/i);
  assert.match(user, /War and Peace/);
  assert.match(user, /what's this book about\?/);
});

test("interpretAsk degrades to null when the model answers instead of interpreting", async () => {
  const call = async () => "The book is about the prince and his exercise book and the princess.";
  const r = await interpretAsk("what's this book about?", { rows: ROWS, digest: DIGEST, call });
  assert.equal(r, null);
});

test("interpretAsk degrades to null when the call throws — a failed instrument is silence, never a guess", async () => {
  const call = async () => { throw new Error("model unreachable"); };
  const r = await interpretAsk("what's this book about?", { rows: ROWS, digest: DIGEST, call });
  assert.equal(r, null);
});

test("interpretAsk reads only the first line of a reply that wraps", async () => {
  const call = async () => "Asking for the gist.\nHere is a longer explanation that would fail the wall.";
  const r = await interpretAsk("what's this about?", { rows: ROWS, call });
  assert.equal(r, "Asking for the gist.");
});
