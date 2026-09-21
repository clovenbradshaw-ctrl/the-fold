import { test } from "node:test";
import assert from "node:assert";
import { needsConfirmation, confirmationTemplate, splitSentences } from "./confirm.js";

test("chatty greeting never confirms", () => {
  const r = needsConfirmation("Hi! What can you help me with?", { chatty: () => true });
  assert.equal(r.confirm, false);
  assert.equal(r.reason, "chatty");
});

test("multipart with two anchored sentences confirms (UX-03 shape)", () => {
  const r = needsConfirmation("Tell me about speed, accuracy, and problem resolution in chatbots. Also, what is your name?");
  assert.equal(r.confirm, true);
  assert.equal(r.reason, "multipart");
  assert.ok(r.clauses.length >= 2);
});

test("underspecified with vague noun and no admission confirms (UX-02 shape)", () => {
  const r = needsConfirmation("My thing is broken. What do I do?");
  assert.equal(r.confirm, true);
  assert.equal(r.reason, "underspecified");
  assert.ok(r.vague.includes("thing"));
});

test("underspecified is overridden when an anchor resolves", () => {
  const organs = { resolveAnchors: () => true };
  const r = needsConfirmation("My thing is broken. What do I do?", organs);
  assert.equal(r.confirm, false);
});

test("underspecified is overridden when admission admits material", () => {
  const organs = { hasAdmission: () => true };
  const r = needsConfirmation("My thing is broken. What do I do?", organs);
  assert.equal(r.confirm, false);
});

test("clear single question with resolved anchor never confirms", () => {
  const organs = { resolveAnchors: () => true };
  const r = needsConfirmation("What is the capital of France?", organs);
  assert.equal(r.confirm, false);
});

test("confirmation template ships zero answer sentences (judge() safe)", () => {
  for (const t of [confirmationTemplate("multipart", { clauses: ["a", "b"] }), confirmationTemplate("underspecified", { vague: ["thing"] })]) {
    assert.ok(t.includes("?"));
    assert.ok(!/[0-9]+\s*(=|is)\s*[0-9]+/.test(t));
  }
});

test("splitSentences handles ordinary prose", () => {
  assert.equal(splitSentences("One. Two! Three?").length, 3);
});

test("needsConfirmation returns a typed reason always", () => {
  const r = needsConfirmation("What is the capital of France?");
  assert.equal(r.confirm, false);
  assert.ok(["clear", "chatty"].includes(r.reason));
});