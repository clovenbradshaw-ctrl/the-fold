// proxy-api.test.mjs — the model-proxy wire shapes, offline. No fetch, no
// server: proxy-runner.mjs's engine/network half is exercised live (the
// same posture wheels.test.mjs takes toward the real pyodide lock).

import test from "node:test";
import assert from "node:assert/strict";
import {
  MODEL_PREFIX,
  prefixModel,
  stripModelPrefix,
  turnFromMessages,
  parseProxyRequest,
  toOpenAIModelList,
  reprefixOllamaTags,
  openAIResponse,
  openAIStreamLines,
  ollamaChatResponse,
  ollamaChatStreamLines,
} from "./proxy-api.js";

test("prefixModel/stripModelPrefix round-trip", () => {
  assert.equal(prefixModel("gemma2:2b"), "fold:gemma2:2b");
  assert.equal(stripModelPrefix("fold:gemma2:2b"), "gemma2:2b");
});

test("a bare, unprefixed model id refuses rather than silently resolving", () => {
  assert.equal(stripModelPrefix("gemma2:2b"), null);
  assert.equal(stripModelPrefix(undefined), null);
  assert.equal(stripModelPrefix(""), null);
});

test("MODEL_PREFIX is the literal prefix both helpers agree on", () => {
  assert.equal(MODEL_PREFIX, "fold:");
});

test("turnFromMessages: last message must be the user's question", () => {
  const r = turnFromMessages([{ role: "assistant", content: "hi" }]);
  assert.match(r.error, /last message must have role "user"/);
});

test("turnFromMessages: empty array refuses", () => {
  assert.match(turnFromMessages([]).error, /non-empty array/);
});

test("turnFromMessages: empty last-user content refuses", () => {
  assert.match(turnFromMessages([{ role: "user", content: "  " }]).error, /no content/);
});

test("turnFromMessages: prior user/assistant turns become verbatim chatHistory", () => {
  const r = turnFromMessages([
    { role: "user", content: "Who was Pierre?" },
    { role: "assistant", content: "A count." },
    { role: "user", content: "And Natasha?" },
  ]);
  assert.equal(r.task, "And Natasha?");
  assert.deepEqual(r.chatHistory, [
    { role: "user", content: "Who was Pierre?" },
    { role: "assistant", content: "A count." },
  ]);
});

test("turnFromMessages: system content folds into discourse, capped", () => {
  const long = "x".repeat(1000);
  const r = turnFromMessages([
    { role: "system", content: long },
    { role: "user", content: "go" },
  ]);
  assert.equal(r.discourse.length, 300);
});

test("turnFromMessages: a role this shape has no place for is dropped and named, not silently absorbed", () => {
  const r = turnFromMessages([
    { role: "tool", content: "{}" },
    { role: "user", content: "go" },
  ]);
  assert.deepEqual(r.droppedRoles, ["tool"]);
  assert.deepEqual(r.chatHistory, []);
});

test("parseProxyRequest: unprefixed model refuses with a typed, actionable message", () => {
  const r = parseProxyRequest({ model: "gemma2:2b", messages: [{ role: "user", content: "hi" }] });
  assert.match(r.error, /fold-prefixed id/);
  assert.match(r.error, /"gemma2:2b"/);
});

test("parseProxyRequest: fold-prefixed model, plain messages, defaults to grounded+non-stream", () => {
  const r = parseProxyRequest({ model: "fold:gemma2:2b", messages: [{ role: "user", content: "hi" }] });
  assert.equal(r.model, "gemma2:2b");
  assert.equal(r.task, "hi");
  assert.equal(r.stream, false);
  assert.equal(r.grounded, true);
});

test("parseProxyRequest: fold_grounded:false is the one disclosed escape hatch from the full pipeline", () => {
  const r = parseProxyRequest({ model: "fold:gemma2:2b", messages: [{ role: "user", content: "hi" }], fold_grounded: false, stream: true });
  assert.equal(r.grounded, false);
  assert.equal(r.stream, true);
});

test("parseProxyRequest surfaces the messages-shape error under the same key", () => {
  const r = parseProxyRequest({ model: "fold:gemma2:2b", messages: [] });
  assert.match(r.error, /non-empty array/);
});

test("toOpenAIModelList reprefixes every real Ollama name, nothing invented", () => {
  const list = toOpenAIModelList(["gemma2:2b", "qwen3:8b"], { createdAt: 42 });
  assert.equal(list.object, "list");
  assert.deepEqual(
    list.data.map((m) => m.id),
    ["fold:gemma2:2b", "fold:qwen3:8b"],
  );
  assert.equal(list.data[0].created, 42);
  assert.equal(list.data[0].owned_by, "the-fold");
});

test("reprefixOllamaTags renames name+model, carries size/digest/details through unchanged", () => {
  const real = {
    models: [{ name: "gemma2:2b", model: "gemma2:2b", size: 123, digest: "abc", modified_at: "t", details: { family: "gemma2" } }],
  };
  const out = reprefixOllamaTags(real);
  assert.equal(out.models[0].name, "fold:gemma2:2b");
  assert.equal(out.models[0].model, "fold:gemma2:2b");
  assert.equal(out.models[0].size, 123);
  assert.equal(out.models[0].digest, "abc");
  assert.deepEqual(out.models[0].details, { family: "gemma2" });
});

test("reprefixOllamaTags on a malformed/empty body degrades to an empty list, never throws", () => {
  assert.deepEqual(reprefixOllamaTags({}), { models: [] });
  assert.deepEqual(reprefixOllamaTags(null), { models: [] });
});

test("openAIResponse carries the fold's own findings as a non-standard extra field, usage summed from real counters", () => {
  const r = openAIResponse({
    id: "chatcmpl-1",
    model: "fold:gemma2:2b",
    text: "Pierre is a count.",
    created: 1000,
    usage: { promptTokens: 10, completionTokens: 5 },
    fold: { refs: ["wp:chunk-0#0-10"], unsupported: [], open: [] },
  });
  assert.equal(r.object, "chat.completion");
  assert.equal(r.choices[0].message.content, "Pierre is a count.");
  assert.equal(r.choices[0].finish_reason, "stop");
  assert.equal(r.usage.total_tokens, 15);
  assert.deepEqual(r.fold.refs, ["wp:chunk-0#0-10"]);
});

test("openAIStreamLines: one content chunk, one stop chunk carrying fold, then [DONE] last", () => {
  const lines = openAIStreamLines({ id: "x", model: "fold:m", text: "hi", created: 1, fold: { refs: [] } });
  assert.equal(lines.length, 3);
  assert.equal(lines[2], "data: [DONE]\n\n");
  const first = JSON.parse(lines[0].slice("data: ".length));
  assert.equal(first.choices[0].delta.content, "hi");
  assert.equal(first.choices[0].finish_reason, null);
  const second = JSON.parse(lines[1].slice("data: ".length));
  assert.equal(second.choices[0].finish_reason, "stop");
  assert.deepEqual(second.fold, { refs: [] });
});

test("ollamaChatResponse mirrors Ollama's own /api/chat shape with real counters", () => {
  const r = ollamaChatResponse({
    model: "fold:gemma2:2b",
    text: "hi",
    createdAt: "2026-08-18T00:00:00Z",
    usage: { promptTokens: 3, completionTokens: 2 },
    fold: { refs: [] },
  });
  assert.equal(r.done, true);
  assert.equal(r.message.content, "hi");
  assert.equal(r.prompt_eval_count, 3);
  assert.equal(r.eval_count, 2);
});

test("ollamaChatStreamLines: two NDJSON lines, first not-done, second done with counters", () => {
  const lines = ollamaChatStreamLines({
    model: "fold:m",
    text: "hi",
    createdAt: "t",
    usage: { promptTokens: 1, completionTokens: 1 },
    fold: null,
  });
  assert.equal(lines.length, 2);
  const first = JSON.parse(lines[0]);
  assert.equal(first.done, false);
  assert.equal(first.message.content, "hi");
  const second = JSON.parse(lines[1]);
  assert.equal(second.done, true);
  assert.equal(second.eval_count, 1);
});
