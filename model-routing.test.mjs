// model-routing.test.mjs — the routing policy pinned: a plain turn and the
// summary refresh never spend the big model; deep work always does; a missing
// rung degrades to the next one loaded, never to an unloaded name.

import test from "node:test";
import assert from "node:assert/strict";

import { MODEL_PICKER, ROUTE_KINDS, routeModel } from "./model-routing.js";

const OFFERED = [...MODEL_PICKER];
const SELECTED = MODEL_PICKER[MODEL_PICKER.length - 1];

test("the picker is three rungs, fastest first", () => {
  assert.equal(MODEL_PICKER.length, 3);
  assert.equal(MODEL_PICKER[0], "gemma2:2b");
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
