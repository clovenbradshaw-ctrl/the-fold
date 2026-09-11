// tf-rung.test.mjs — the on-device CPU rungs' conformance. The roster is a
// ladder, not a catalog; the walls are that every rung names a real model id
// (the Qwen family, verified present with a q4 ONNX and a chat template on
// the publisher), that a non-roster id is never a tf rung, and that the pure
// decisions (label, short label, dtype, window, size, disclosure) are stable.
// No network, no worker — the client and worker are the crossing.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  TF_MODELS,
  TF_MODEL_ID,
  isTfModel,
  tfModelOf,
  tfLabelFor,
  tfShortFor,
  tfDtypeFor,
  tfContextWindowFor,
  TF_DISCLOSURE,
} from "./tf-rung.js";

test("the roster is a ladder: smallest first, every rung a real Qwen2.5 q4 that answers directly", () => {
  assert.equal(TF_MODELS.length, 2, "two rungs — fast and best, not a catalog");
  for (const m of TF_MODELS) {
    assert.ok(m.id.startsWith("onnx-community/"), `${m.id} is an onnx-community id`);
    assert.ok(/Qwen2\.5/.test(m.id), `${m.id} is the Qwen2.5 family — deliberately NO model with its own thinking mode`);
    assert.ok(m.label.includes("CPU") && m.label.includes("on this device"), `${m.id} says it runs on the device`);
    assert.ok(m.short && m.short.length < m.label.length, `${m.id} has a short chip label`);
    assert.ok(m.dtype && m.origin && m.license === "Apache-2.0" && m.publisher, `${m.id} states dtype, origin, licence, publisher`);
    assert.ok(m.sizeMB >= 100 && m.sizeMB <= 2000, `${m.id} has a sane q4 download size`);
    assert.ok(Number.isFinite(m.contextWindow) && m.contextWindow > 0, `${m.id} declares a window`);
  }
  // sizes ascend — the ladder reads fast → best
  for (let i = 1; i < TF_MODELS.length; i++) assert.ok(TF_MODELS[i].sizeMB > TF_MODELS[i - 1].sizeMB, "the ladder is ordered by size");
  assert.equal(TF_MODEL_ID, TF_MODELS[0].id, "the default is the smallest/fastest");
});

test("isTfModel is exact: roster ids are tf rungs, nothing else is", () => {
  for (const m of TF_MODELS) assert.equal(isTfModel(m.id), true);
  assert.equal(isTfModel("gemma2:2b"), false);
  assert.equal(isTfModel("OLMo-2-0425-1B-Instruct-q4f16_1-MLC"), false);
  assert.equal(isTfModel("room:@who:server gemma2:2b"), false);
  assert.equal(isTfModel(""), false);
});

test("the pure decisions are stable and the disclosure is a string with a size, never a host", () => {
  const [fast, best] = TF_MODELS;
  assert.equal(tfLabelFor(fast.id), fast.label);
  assert.equal(tfShortFor(fast.id), fast.short);
  assert.equal(tfShortFor("nope"), "nope");
  assert.equal(tfDtypeFor(fast.id), fast.dtype);
  assert.equal(tfContextWindowFor(best.id), best.contextWindow);
  assert.equal(tfContextWindowFor("nope"), null);
  assert.equal(tfModelOf("nope"), null);
  // every disclosure names the model, the size, the boundary, and carries no scheme
  for (const m of TF_MODELS) {
    const d = TF_DISCLOSURE(m.id);
    assert.ok(d.includes(m.short) && d.includes(String(m.sizeMB)) && d.includes("never leaves this device"), `${m.id} disclosure is specific`);
    assert.ok(!/^https?:/.test(m.id), `${m.id} carries no scheme`);
  }
});