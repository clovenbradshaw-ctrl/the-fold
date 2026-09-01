// model-routing.test.mjs — the routing policy pinned: a plain turn and the
// summary refresh never spend the big model; deep work always does; a missing
// rung degrades to the next one loaded, never to an unloaded name.

import test from "node:test";
import assert from "node:assert/strict";

import { MODEL_PICKER, ROUTE_KINDS, routeModel, S1_MODEL, S2_MODEL, resolveNamedModel } from "./model-routing.js";

const OFFERED = [...MODEL_PICKER];
const SELECTED = MODEL_PICKER[MODEL_PICKER.length - 1];

test("the picker is four rungs, fastest first", () => {
  assert.equal(MODEL_PICKER.length, 4);
  assert.equal(MODEL_PICKER[0], "olmo-3:7b");
  assert.equal(MODEL_PICKER[MODEL_PICKER.length - 1], "qwen2.5:14b-instruct-q4_K_M");
});

test("a flat question uses the fastest loaded model, never the selected one", () => {
  assert.equal(routeModel(ROUTE_KINDS.FLAT, { offered: OFFERED, selected: SELECTED }), MODEL_PICKER[0]);
});

test("the summary refresh is always the fastest loaded model", () => {
  assert.equal(routeModel(ROUTE_KINDS.SUMMARY, { offered: OFFERED, selected: SELECTED }), MODEL_PICKER[0]);
  assert.equal(routeModel(ROUTE_KINDS.SUMMARY, { offered: OFFERED, selected: MODEL_PICKER[0] }), MODEL_PICKER[0]);
});

test("deep work uses the model the user chose", () => {
  assert.equal(routeModel(ROUTE_KINDS.DEEP, { offered: OFFERED, selected: SELECTED }), SELECTED);
});

test("a missing fast rung degrades to the next one loaded, never to an unloaded name", () => {
  assert.equal(routeModel(ROUTE_KINDS.FLAT, { offered: OFFERED.slice(1), selected: SELECTED }), OFFERED[1]);
});

test("a single-model machine routes everything to that model", () => {
  const one = [SELECTED];
  assert.equal(routeModel(ROUTE_KINDS.FLAT, { offered: one, selected: SELECTED }), SELECTED);
  assert.equal(routeModel(ROUTE_KINDS.DEEP, { offered: one, selected: SELECTED }), SELECTED);
});

test("deep work with no selection falls back to the fastest rung, never throws", () => {
  assert.equal(routeModel(ROUTE_KINDS.DEEP, { offered: OFFERED }), MODEL_PICKER[0]);
});

test("S1 and S2 are distinct, fixed models — not picker rungs", () => {
  assert.equal(S1_MODEL, "olmo-3:7b");
  assert.equal(S2_MODEL, "hf.co/PleIAs/Pleias-RAG-1B-gguf:latest");
  assert.notEqual(S1_MODEL, S2_MODEL);
  assert.ok(!MODEL_PICKER.includes(S2_MODEL), "S2's model is a specialist, never offered as a picker rung");
});

test("resolveNamedModel returns the named model when Ollama actually has it", () => {
  const available = new Set([S1_MODEL, S2_MODEL, ...MODEL_PICKER]);
  assert.equal(resolveNamedModel(S1_MODEL, { available, offered: OFFERED }), S1_MODEL);
  assert.equal(resolveNamedModel(S2_MODEL, { available, offered: OFFERED }), S2_MODEL);
});

test("resolveNamedModel degrades to the fastest offered rung when the named model isn't pulled, never to an unloaded name", () => {
  const available = new Set(MODEL_PICKER); // S2_MODEL never pulled on this machine
  assert.equal(resolveNamedModel(S2_MODEL, { available, offered: OFFERED }), OFFERED[0]);
});

test("resolveNamedModel with nothing offered either falls back to MODEL_PICKER's own fastest rung, never throws", () => {
  assert.equal(resolveNamedModel(S2_MODEL, { available: new Set(), offered: [] }), MODEL_PICKER[0]);
});
