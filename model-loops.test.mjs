// model-loops.test.mjs — the one property that must never break: the
// default loop is a no-op over holon.js's own prompt ingredients. Beyond
// that, a loop's enable/override per ingredient, and the canvas graph it
// produces over a captured turn.
import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_MODEL_LOOP, INGREDIENT_KEYS, DRAFT_MATERIAL_KEYS, applyModelLoop, captureLastTurn, getLastCapturedTurn, loopGraphFor, previewFor,
  applyModelLoopOptions, pipelineToggle, pipelineValue, orderedDraftMaterialKeys, joinDraftMaterial, validateOverride, validateModelLoopImport,
} from "./model-loops.js";

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

test("REC — an override with no {…} placeholder replaces the value outright, exactly as before", () => {
  const loop = { id: "x", name: "X", nodes: { rawSource: { override: "no braces here" } } };
  assert.equal(applyModelLoop(INGREDIENTS, loop).rawSource, "no braces here");
});

test("SYN — an override containing {value} composes the node's OWN computed value into a new whole", () => {
  const loop = { id: "x", name: "X", nodes: { rawSource: { override: "IMPORTANT: {value}" } } };
  assert.equal(applyModelLoop(INGREDIENTS, loop).rawSource, "IMPORTANT: raw passage text");
});

test("SYN — {otherKey} pulls in another ingredient's RAW computed value, not its own override — real node-to-node wiring, one hop", () => {
  const loop = { id: "x", name: "X", nodes: { rawSource: { override: "{ledgerBlock} / {value}" } } };
  assert.equal(applyModelLoop(INGREDIENTS, loop).rawSource, "the ledger / raw passage text");
});

test("SYN — {otherKey} resolves to the RAW value even when that other node ALSO carries its own override this loop — no chaining, no cycle possible", () => {
  const loop = {
    id: "x", name: "X",
    nodes: {
      rawSource: { override: "{ledgerBlock}" },
      ledgerBlock: { override: "a completely different override" },
    },
  };
  const tuned = applyModelLoop(INGREDIENTS, loop);
  assert.equal(tuned.rawSource, "the ledger"); // the RAW ledgerBlock, never ledgerBlock's own override
  assert.equal(tuned.ledgerBlock, "a completely different override"); // ledgerBlock's own override still applies to itself
});

test("SYN — a disabled/empty source resolves to empty text within an otherwise-legal composition, never a thrown error", () => {
  const loop = { id: "x", name: "X", nodes: { rawSource: { override: "premise:{premiseBlock}" } } };
  assert.equal(applyModelLoop(INGREDIENTS, loop).rawSource, "premise:"); // premiseBlock is null in INGREDIENTS
});

test("validateOverride: plain text and {value} are always legal; a real ingredient key is legal; an unknown ref or a pipeline-stage key is not", () => {
  assert.equal(validateOverride("plain text, no braces at all").ok, true);
  assert.equal(validateOverride("{value}").ok, true);
  assert.equal(validateOverride("{ledgerBlock} and {rawSource}").ok, true);
  const bad = validateOverride("{notARealKey}");
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.illegal, ["notARealKey"]);
  // a pipeline-stage key is a different data structure entirely — not a
  // legal ingredient reference just because the word is familiar
  assert.equal(validateOverride("{depth}").ok, false);
  assert.equal(validateOverride("{makeRelationReader}").ok, false);
});

test("an illegal reference refuses the WHOLE override, falling back to the plain computed value — never a half-substituted string", () => {
  const loop = { id: "x", name: "X", nodes: { rawSource: { override: "{notARealKey} / {value}" } } };
  assert.equal(applyModelLoop(INGREDIENTS, loop).rawSource, INGREDIENTS.rawSource); // untouched, not "[] / raw passage text"
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

test("loopGraphFor(chat-bare) shows only the safe ingredient (chatSystemPrompt — \"how it speaks\") among its shape's own ingredients, ahead of the fixed pipeline-stage nodes every shape carries, and nothing else — a node with nothing to adjust is not on the canvas at all", () => {
  captureLastTurn(INGREDIENTS, "chat-bare");
  const graph = loopGraphFor(getLastCapturedTurn(), DEFAULT_MODEL_LOOP);
  const keys = graph.nodes.map((n) => n.key);
  // the 9 pipeline-stage nodes (v2) come first, then the shape's own SAFE
  // ingredient(s) only — the other five keys chat-bare would otherwise
  // carry (s2Frame, searchedVoidSuffix, notesSuffix, priorPassSuffix,
  // ledgerBlock) are pruned from the canvas as not meaningful for a user
  // to hand-edit without risking the answer's own correctness
  // (SAFE_INGREDIENT_META) — and the old read-only history/system/user/
  // sent nodes are gone outright, never merely hidden (see loopGraphFor's
  // own comment: "if we can't adjust a parameter, it probably shouldn't
  // be there").
  assert.deepEqual(keys.slice(0, 9), [
    "makeRelationReader", "witnessSentences", "checkLink", "webPreflight",
    "depth", "maxCorrections", "resolutions", "material", "passagesPerPart",
  ]);
  assert.deepEqual(keys.slice(9), ["chatSystemPrompt"]);
  assert.ok(!keys.includes("ledgerBlock"), "ledgerBlock is a checking-apparatus output, pruned from the canvas");
  // the surviving ingredient node carries both the computed and the (here,
  // untuned-so-identical) tuned value as its row
  const sys = graph.nodes.find((n) => n.key === "chatSystemPrompt");
  assert.equal(sys.title, "How it speaks");
  assert.equal(sys.row.computed, "CHAT");
  assert.equal(sys.row.tuned, "CHAT");
  assert.equal(sys.meta, "4 chars");
});

test("no shape ever puts a read-only history/system/user/sent node on the canvas — each had no enable/override field to adjust, and the exact same assembled text is already renderWiringSent's own \"Sent to model\" disclosure", () => {
  for (const shape of ["chat-bare", "chat-history", "flat-material", "execute-part"]) {
    captureLastTurn(INGREDIENTS, shape);
    const graph = loopGraphFor(getLastCapturedTurn(), DEFAULT_MODEL_LOOP);
    const keys = graph.nodes.map((n) => n.key);
    for (const dead of ["history", "system", "user", "sent"]) assert.ok(!keys.includes(dead), `${shape} should not carry a "${dead}" node`);
  }
});

test("loopGraphFor tags a disabled node's state as off and an overridden node's state as overridden, and keeps `computed` untouched while `tuned` reflects the loop", () => {
  captureLastTurn(INGREDIENTS, "chat-bare", { checkLink: true });
  const loop = {
    id: "x", name: "X",
    nodes: { chatSystemPrompt: { override: "custom system text" } },
    pipelineOptions: { checkLink: { enabled: false } },
  };
  const graph = loopGraphFor(getLastCapturedTurn(), loop);
  const link = graph.nodes.find((n) => n.key === "checkLink");
  assert.equal(link.state, "off");
  assert.equal(link.row.computed, true); // the mechanism's real output, never erased
  assert.equal(link.row.tuned, false); // what this loop would actually run next
  const sys = graph.nodes.find((n) => n.key === "chatSystemPrompt");
  assert.equal(sys.state, "overridden");
  assert.equal(sys.row.computed, "CHAT");
  assert.equal(sys.row.tuned, "custom system text");
  assert.equal(graph.nodes.find((n) => n.key === "webPreflight").state, null);
});

test("loopGraphFor re-tunes against whatever loop is passed NOW, independent of which loop was active when the turn was captured", () => {
  // captured while some other (or no) loop was active — capture stores
  // the raw, pre-tuning ingredients regardless
  captureLastTurn(INGREDIENTS, "chat-bare");
  const laterLoop = { id: "later", name: "Later", nodes: { chatSystemPrompt: { enabled: false } } };
  const graph = loopGraphFor(getLastCapturedTurn(), laterLoop);
  assert.equal(graph.nodes.find((n) => n.key === "chatSystemPrompt").row.tuned, null);
  // and switching back to the default loop on the SAME captured turn
  // restores the real computed value, with no new turn required
  const graphDefault = loopGraphFor(getLastCapturedTurn(), DEFAULT_MODEL_LOOP);
  assert.equal(graphDefault.nodes.find((n) => n.key === "chatSystemPrompt").row.tuned, "CHAT");
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

test("loopGraphFor(execute-part) shows no ingredient node at all, and only the 9 pipeline-stage nodes — its one in-scope ingredient, resolutionText, is not in SAFE_INGREDIENT_META (a computed discourse block, never a persona to hand-edit)", () => {
  captureLastTurn(INGREDIENTS, "execute-part");
  const graph = loopGraphFor(getLastCapturedTurn(), DEFAULT_MODEL_LOOP);
  const keys = graph.nodes.filter((n) => n.kind !== "pipeline-toggle" && n.kind !== "pipeline-value").map((n) => n.key);
  assert.deepEqual(keys, []);
});

test("loopGraphFor always carries the 9 pipeline-stage nodes, tagged with pipeline-toggle/pipeline-value kinds and an honest unset meta when the capture has no snapshot", () => {
  captureLastTurn(INGREDIENTS, "chat-bare"); // no third argument — no pipeline snapshot
  const graph = loopGraphFor(getLastCapturedTurn(), DEFAULT_MODEL_LOOP);
  const relTier = graph.nodes.find((n) => n.key === "makeRelationReader");
  assert.equal(relTier.kind, "pipeline-toggle");
  assert.equal(relTier.meta, "not disclosed this turn");
  assert.equal(relTier.row.computed, null);
  const depth = graph.nodes.find((n) => n.key === "depth");
  assert.equal(depth.kind, "pipeline-value");
});

test("loopGraphFor's pipeline-stage nodes read the real captured snapshot as `computed`, and a loop's override changes only `tuned`", () => {
  captureLastTurn(INGREDIENTS, "chat-bare", { makeRelationReader: true, witnessSentences: false, checkLink: false, resolutions: 1, material: "auto", passagesPerPart: 3, maxCorrections: 1 });
  const loop = { id: "x", name: "X", pipelineOptions: { makeRelationReader: { enabled: false }, resolutions: { value: 3 } } };
  const graph = loopGraphFor(getLastCapturedTurn(), loop);
  const relTier = graph.nodes.find((n) => n.key === "makeRelationReader");
  assert.equal(relTier.row.computed, true); // what actually ran
  assert.equal(relTier.row.tuned, false); // what this loop would run next
  assert.equal(relTier.state, "off");
  assert.equal(relTier.meta, "off");
  const witness = graph.nodes.find((n) => n.key === "witnessSentences");
  assert.equal(witness.row.computed, false);
  assert.equal(witness.row.tuned, false); // not mentioned by the loop — inherits the real computed value
  assert.equal(witness.state, null);
  const resolutions = graph.nodes.find((n) => n.key === "resolutions");
  assert.equal(resolutions.row.computed, 1);
  assert.equal(resolutions.row.tuned, 3);
  assert.equal(resolutions.state, "overridden");
});

test("an unrecognized shape falls back to the full ingredient list (then the same safe-ingredient prune applies) rather than showing nothing", () => {
  captureLastTurn(INGREDIENTS, "some-future-shape");
  const graph = loopGraphFor(getLastCapturedTurn(), DEFAULT_MODEL_LOOP);
  const ingredientKeys = graph.nodes.filter((n) => n.kind === "ingredient").map((n) => n.key);
  assert.deepEqual(ingredientKeys, ["flatExecuteSystemPrompt", "chatSystemPrompt"]);
});

// ── pipeline-stage options (v2) ─────────────────────────────────────────────

const RELATIONS_FOR = () => "the real relation reader";
const WITNESS_FOR = () => "the real witness organ";
const CHECK_LINK = () => "the real link checker";
const ORGANS_WHEN_ON = { makeRelationReader: RELATIONS_FOR, witnessSentences: WITNESS_FOR, checkLink: CHECK_LINK };

test("applyModelLoopOptions is a no-op on the default loop (empty pipelineOptions)", () => {
  const options = { makeRelationReader: null, witnessSentences: null, checkLink: "already-on", depth: null, task: "x" };
  const out = applyModelLoopOptions(options, DEFAULT_MODEL_LOOP, { organsWhenOn: ORGANS_WHEN_ON });
  assert.deepEqual(out, options);
});

test("a forced-on organ toggle substitutes the real organ reference from organsWhenOn, even though the caller had it off", () => {
  const options = { makeRelationReader: null, witnessSentences: null, checkLink: null };
  const loop = { id: "x", name: "X", pipelineOptions: { makeRelationReader: { enabled: true } } };
  const out = applyModelLoopOptions(options, loop, { organsWhenOn: ORGANS_WHEN_ON });
  assert.equal(out.makeRelationReader, RELATIONS_FOR);
  assert.equal(out.witnessSentences, null); // untouched — the loop didn't mention it
  assert.equal(out.checkLink, null);
});

test("a forced-off organ toggle nulls it regardless of what the caller already computed", () => {
  const options = { makeRelationReader: RELATIONS_FOR, witnessSentences: WITNESS_FOR, checkLink: CHECK_LINK };
  const loop = { id: "x", name: "X", pipelineOptions: { witnessSentences: { enabled: false } } };
  const out = applyModelLoopOptions(options, loop, { organsWhenOn: ORGANS_WHEN_ON });
  assert.equal(out.makeRelationReader, RELATIONS_FOR); // untouched
  assert.equal(out.witnessSentences, null);
  assert.equal(out.checkLink, CHECK_LINK); // untouched
});

test("a value knob overrides exactly that key and leaves the rest of the options object untouched", () => {
  const options = { depth: null, maxCorrections: null, resolutions: 0, material: "auto", passagesPerPart: 3, task: "x" };
  const loop = { id: "x", name: "X", pipelineOptions: { depth: { value: 2 }, material: { value: "snips" } } };
  const out = applyModelLoopOptions(options, loop, {});
  assert.equal(out.depth, 2);
  assert.equal(out.material, "snips");
  assert.equal(out.maxCorrections, null);
  assert.equal(out.resolutions, 0);
  assert.equal(out.passagesPerPart, 3);
  assert.equal(out.task, "x");
});

test("pipelineToggle: an explicit setting wins, absence inherits the caller's fallback unchanged", () => {
  const loop = { id: "x", name: "X", pipelineOptions: { webPreflight: { enabled: false } } };
  assert.equal(pipelineToggle(loop, "webPreflight", true), false);
  assert.equal(pipelineToggle(loop, "checkLink", true), true); // not mentioned — inherits fallback
  assert.equal(pipelineToggle(DEFAULT_MODEL_LOOP, "webPreflight", true), true);
});

test("pipelineValue: an explicit value wins, absence inherits the caller's fallback unchanged", () => {
  const loop = { id: "x", name: "X", pipelineOptions: { resolutions: { value: 3 } } };
  assert.equal(pipelineValue(loop, "resolutions", 0), 3);
  assert.equal(pipelineValue(loop, "maxCorrections", null), null);
  assert.equal(pipelineValue(DEFAULT_MODEL_LOOP, "resolutions", 0), 0);
});

// ── ingredient order (v2) ───────────────────────────────────────────────────

test("orderedDraftMaterialKeys falls back to the natural order for the default loop, a missing order, and a malformed one", () => {
  assert.deepEqual(orderedDraftMaterialKeys(DEFAULT_MODEL_LOOP), DRAFT_MATERIAL_KEYS);
  assert.deepEqual(orderedDraftMaterialKeys({ id: "x", name: "X" }), DRAFT_MATERIAL_KEYS);
  // too short
  assert.deepEqual(orderedDraftMaterialKeys({ ingredientOrder: ["rawSource"] }), DRAFT_MATERIAL_KEYS);
  // a duplicate standing in for a missing key
  const dup = [...DRAFT_MATERIAL_KEYS.slice(1), DRAFT_MATERIAL_KEYS[1]];
  assert.deepEqual(orderedDraftMaterialKeys({ ingredientOrder: dup }), DRAFT_MATERIAL_KEYS);
  // a foreign key standing in for a real one
  const foreign = [...DRAFT_MATERIAL_KEYS.slice(1), "notARealIngredient"];
  assert.deepEqual(orderedDraftMaterialKeys({ ingredientOrder: foreign }), DRAFT_MATERIAL_KEYS);
});

test("orderedDraftMaterialKeys honours a genuine permutation", () => {
  const reversed = [...DRAFT_MATERIAL_KEYS].reverse();
  assert.deepEqual(orderedDraftMaterialKeys({ ingredientOrder: reversed }), reversed);
});

test("joinDraftMaterial joins in the natural order by default, and in the loop's chosen order when set — same blocks, same filter(Boolean), different sequence", () => {
  const tuned = { ...INGREDIENTS, comparisonLine: "FIRST", rawSource: "LAST" };
  const natural = joinDraftMaterial(tuned, DEFAULT_MODEL_LOOP);
  assert.ok(natural.startsWith("FIRST"));
  assert.ok(natural.endsWith("LAST"));
  const reversedOrder = [...DRAFT_MATERIAL_KEYS].reverse();
  const reordered = joinDraftMaterial(tuned, { ingredientOrder: reversedOrder });
  assert.ok(reordered.startsWith("LAST"));
  assert.ok(reordered.endsWith("FIRST"));
  // same set of non-empty blocks either way, just reordered
  assert.deepEqual([...natural.split("\n\n")].sort(), [...reordered.split("\n\n")].sort());
});

test("a round-tripped export/import (JSON.stringify then parse) produces a byte-identical loop", () => {
  const loop = {
    id: "grumpy-captain", name: "Grumpy captain",
    nodes: { chatSystemPrompt: { override: "You are a grumpy sea captain." } },
    pipelineOptions: { makeRelationReader: { enabled: false }, depth: { value: 2 } },
  };
  const roundTripped = JSON.parse(JSON.stringify(loop));
  assert.deepEqual(roundTripped, loop);
  // and it applies identically to the original
  const options = { makeRelationReader: RELATIONS_FOR, depth: null };
  assert.deepEqual(
    applyModelLoopOptions(options, roundTripped, { organsWhenOn: ORGANS_WHEN_ON }),
    applyModelLoopOptions(options, loop, { organsWhenOn: ORGANS_WHEN_ON }),
  );
});

// ── JSON import validation (v2) ──────────────────────────────────────────────

test("validateModelLoopImport accepts a well-formed export and normalizes it to {name, nodes, pipelineOptions, ingredientOrder}", () => {
  const exported = {
    id: "grumpy-captain", name: "Grumpy captain",
    nodes: { chatSystemPrompt: { override: "You are a grumpy sea captain." } },
    pipelineOptions: { makeRelationReader: { enabled: false }, depth: { value: 2 } },
    ingredientOrder: [...DRAFT_MATERIAL_KEYS].reverse(),
  };
  const check = validateModelLoopImport(exported);
  assert.equal(check.ok, true);
  assert.deepEqual(check.loop, {
    name: "Grumpy captain",
    nodes: exported.nodes,
    pipelineOptions: exported.pipelineOptions,
    ingredientOrder: exported.ingredientOrder,
  });
});

test("validateModelLoopImport tolerates the fields a bare {name} export omits", () => {
  const check = validateModelLoopImport({ name: "Bare" });
  assert.equal(check.ok, true);
  assert.deepEqual(check.loop, { name: "Bare", nodes: {}, pipelineOptions: {}, ingredientOrder: undefined });
});

test("validateModelLoopImport refuses a non-object, a missing name, and a wrong-typed nodes/pipelineOptions", () => {
  assert.equal(validateModelLoopImport(null).ok, false);
  assert.equal(validateModelLoopImport("a string").ok, false);
  assert.equal(validateModelLoopImport([]).ok, false);
  assert.equal(validateModelLoopImport({}).ok, false);
  assert.equal(validateModelLoopImport({ name: "  " }).ok, false);
  assert.equal(validateModelLoopImport({ name: "X", nodes: "not an object" }).ok, false);
  assert.equal(validateModelLoopImport({ name: "X", pipelineOptions: [] }).ok, false);
  assert.equal(validateModelLoopImport({ name: "X", ingredientOrder: "not an array" }).ok, false);
  assert.equal(validateModelLoopImport({ name: "X", ingredientOrder: [1, 2] }).ok, false);
});

test("validateModelLoopImport refuses an unknown ingredient key, an unknown node field, and an unknown pipeline key", () => {
  assert.equal(validateModelLoopImport({ name: "X", nodes: { notARealIngredient: { override: "x" } } }).ok, false);
  assert.equal(validateModelLoopImport({ name: "X", nodes: { chatSystemPrompt: { badField: 1 } } }).ok, false);
  assert.equal(validateModelLoopImport({ name: "X", pipelineOptions: { notARealKey: { value: 1 } } }).ok, false);
});
