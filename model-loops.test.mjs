// model-loops.test.mjs — the one property that must never break: the
// default loop is a no-op over holon.js's own prompt ingredients. Beyond
// that, a loop's enable/override per ingredient, and the canvas graph it
// produces over a captured turn.
import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_MODEL_LOOP, INGREDIENT_KEYS, applyModelLoop, captureLastTurn, getLastCapturedTurn, loopGraphFor, previewFor } from "./model-loops.js";

const INGREDIENTS = Object.freeze({
  comparisonLine: "", declaredLine: "What this material is: a title.", aboutLine: "",
  recalledLine: "", snipPrefix: "verbatim snip", premiseBlock: null, dialogueBlock: null,
  learnedBlock: null, factBlockText: null, ledgerBlock: "the ledger", rawSource: "raw passage text",
  resolutionText: "a resolution", s2Frame: "", flatExecuteSystemPrompt: "FLAT EXECUTE",
  chatSystemPrompt: "CHAT", shapeSuffix: "", notesSuffix: "", priorPassSuffix: "",
  searchedVoidSuffix: "", chatContext: " (context)",
});

test("the default loop is a no-op: every ingredient passes through unchanged", () => {
  const tuned = applyModelLoop(INGREDIENTS, DEFAULT_MODEL_LOOP);
  assert.deepEqual(tuned, INGREDIENTS);
});

test("an empty-nodes loop (equivalent to default) is also a no-op", () => {
  const tuned = applyModelLoop(INGREDIENTS, { id: "x", name: "X", nodes: {} });
  assert.deepEqual(tuned, INGREDIENTS);
});

test("disabling a node nulls exactly that key, others untouched", () => {
  const loop = { id: "x", name: "X", nodes: { ledgerBlock: { enabled: false } } };
  const tuned = applyModelLoop(INGREDIENTS, loop);
  assert.equal(tuned.ledgerBlock, null);
  for (const key of Object.keys(INGREDIENTS)) {
    if (key === "ledgerBlock") continue;
    assert.equal(tuned[key], INGREDIENTS[key], `${key} should be untouched`);
  }
});

test("overriding a node replaces exactly that key's value", () => {
  const loop = { id: "x", name: "X", nodes: { rawSource: { override: "exact text the user typed" } } };
  const tuned = applyModelLoop(INGREDIENTS, loop);
  assert.equal(tuned.rawSource, "exact text the user typed");
  for (const key of Object.keys(INGREDIENTS)) {
    if (key === "rawSource") continue;
    assert.equal(tuned[key], INGREDIENTS[key], `${key} should be untouched`);
  }
});

test("a loop naming an unknown key is inert — nothing to apply it to", () => {
  const loop = { id: "x", name: "X", nodes: { notARealIngredient: { enabled: false } } };
  const tuned = applyModelLoop(INGREDIENTS, loop);
  assert.deepEqual(tuned, INGREDIENTS);
});

test("captureLastTurn/getLastCapturedTurn round-trips the shape and a snapshot of the ingredients", () => {
  captureLastTurn(INGREDIENTS, "chat-history");
  const captured = getLastCapturedTurn();
  assert.equal(captured.shape, "chat-history");
  assert.deepEqual(captured.ingredients, INGREDIENTS);
  // it's a snapshot, not a live reference
  assert.notEqual(captured.ingredients, INGREDIENTS);
});

test("loopGraphFor with no captured turn returns an empty graph", () => {
  assert.deepEqual(loopGraphFor(null), { nodes: [], edges: [] });
});

test("loopGraphFor(chat-bare) produces exactly one node per in-scope ingredient plus the assembled nodes", () => {
  captureLastTurn(INGREDIENTS, "chat-bare");
  const graph = loopGraphFor(getLastCapturedTurn(), DEFAULT_MODEL_LOOP);
  const keys = graph.nodes.map((n) => n.key);
  assert.deepEqual(
    keys,
    ["s2Frame", "chatSystemPrompt", "searchedVoidSuffix", "notesSuffix", "priorPassSuffix", "ledgerBlock", "system", "user", "sent"],
  );
  // chat-bare has no history node (materialless, no prior turns to show)
  assert.ok(!keys.includes("history"));
  // every ingredient node carries both the computed and the (here,
  // untuned-so-identical) tuned value as its row
  const ledger = graph.nodes.find((n) => n.key === "ledgerBlock");
  assert.equal(ledger.row.computed, "the ledger");
  assert.equal(ledger.row.tuned, "the ledger");
  assert.equal(ledger.meta, "10 chars");
});

test("loopGraphFor(chat-history) adds the read-only prior-turns node", () => {
  captureLastTurn(INGREDIENTS, "chat-history");
  const graph = loopGraphFor(getLastCapturedTurn(), DEFAULT_MODEL_LOOP);
  const history = graph.nodes.find((n) => n.key === "history");
  assert.ok(history);
  assert.equal(history.drill, false);
  assert.ok(graph.edges.some((e) => e.from === "history" && e.to === "sent"));
});

test("loopGraphFor tags a disabled node's state as off and an overridden node's state as overridden, and keeps `computed` untouched while `tuned` reflects the loop", () => {
  captureLastTurn(INGREDIENTS, "chat-bare");
  const loop = {
    id: "x", name: "X",
    nodes: { ledgerBlock: { enabled: false }, chatSystemPrompt: { override: "custom system text" } },
  };
  const graph = loopGraphFor(getLastCapturedTurn(), loop);
  const ledger = graph.nodes.find((n) => n.key === "ledgerBlock");
  assert.equal(ledger.state, "off");
  assert.equal(ledger.row.computed, "the ledger"); // the mechanism's real output, never erased
  assert.equal(ledger.row.tuned, null); // what this loop would actually send
  const sys = graph.nodes.find((n) => n.key === "chatSystemPrompt");
  assert.equal(sys.state, "overridden");
  assert.equal(sys.row.computed, "CHAT");
  assert.equal(sys.row.tuned, "custom system text");
  assert.equal(graph.nodes.find((n) => n.key === "s2Frame").state, null);
});

test("loopGraphFor re-tunes against whatever loop is passed NOW, independent of which loop was active when the turn was captured", () => {
  // captured while some other (or no) loop was active — capture stores
  // the raw, pre-tuning ingredients regardless
  captureLastTurn(INGREDIENTS, "chat-bare");
  const laterLoop = { id: "later", name: "Later", nodes: { ledgerBlock: { enabled: false } } };
  const graph = loopGraphFor(getLastCapturedTurn(), laterLoop);
  assert.equal(graph.nodes.find((n) => n.key === "ledgerBlock").row.tuned, null);
  // and switching back to the default loop on the SAME captured turn
  // restores the real computed value, with no new turn required
  const graphDefault = loopGraphFor(getLastCapturedTurn(), DEFAULT_MODEL_LOOP);
  assert.equal(graphDefault.nodes.find((n) => n.key === "ledgerBlock").row.tuned, "the ledger");
});

test("previewFor lists only the non-empty tuned parts, in shape order", () => {
  captureLastTurn(INGREDIENTS, "chat-bare");
  const preview = previewFor(getLastCapturedTurn(), DEFAULT_MODEL_LOOP);
  assert.equal(preview.shape, "chat-bare");
  // chat-bare's keys, in order: s2Frame, chatSystemPrompt, searchedVoidSuffix,
  // notesSuffix, priorPassSuffix, ledgerBlock — only the two non-empty ones survive
  assert.deepEqual(preview.parts.map((p) => p.key), ["chatSystemPrompt", "ledgerBlock"]);
  assert.deepEqual(preview.parts.map((p) => p.value), ["CHAT", "the ledger"]);
});

test("previewFor with no captured turn returns null", () => {
  assert.equal(previewFor(null), null);
});

test("previewFor reflects an override, and drops a disabled ingredient", () => {
  captureLastTurn(INGREDIENTS, "chat-bare");
  const loop = { id: "x", name: "X", nodes: { chatSystemPrompt: { override: "Be terse." }, ledgerBlock: { enabled: false } } };
  const preview = previewFor(getLastCapturedTurn(), loop);
  const bySystem = preview.parts.find((p) => p.key === "chatSystemPrompt");
  assert.equal(bySystem.value, "Be terse.");
  assert.ok(!preview.parts.some((p) => p.key === "ledgerBlock"));
});

test("loopGraphFor(execute-part) exposes only resolutionText — the one ingredient that reaches the decomposed-part branch", () => {
  captureLastTurn(INGREDIENTS, "execute-part");
  const graph = loopGraphFor(getLastCapturedTurn(), DEFAULT_MODEL_LOOP);
  const keys = graph.nodes.map((n) => n.key);
  assert.deepEqual(keys, ["resolutionText", "system", "user", "sent"]);
});

test("an unrecognized shape falls back to the full ingredient list rather than showing nothing", () => {
  captureLastTurn(INGREDIENTS, "some-future-shape");
  const graph = loopGraphFor(getLastCapturedTurn(), DEFAULT_MODEL_LOOP);
  const ingredientKeys = graph.nodes.filter((n) => n.kind === "ingredient").map((n) => n.key);
  assert.deepEqual(ingredientKeys, [...INGREDIENT_KEYS]);
});
