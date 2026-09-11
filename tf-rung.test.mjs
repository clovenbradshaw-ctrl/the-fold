// tf-rung.test.mjs — the on-device CPU rung's conformance. The roster is
// data; the walls are that it names a real model id (the one this repo has
// measured on CPU through transformers.js), that a non-roster id is never a
// tf rung, and that the pure decisions (label, dtype, window, disclosure) are
// stable. No network, no worker — the client and worker are the crossing.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  TF_MODELS,
  TF_MODEL_ID,
  isTfModel,
  tfModelOf,
  tfLabelFor,
  tfDtypeFor,
  tfContextWindowFor,
  TF_DISCLOSURE,
} from "./tf-rung.js";

test("the roster is one proven CPU rung, never a catalog", () => {
  assert.equal(TF_MODELS.length, 1, "one rung — the smallest instruct model this repo has measured on CPU");
  const [m] = TF_MODELS;
  assert.equal(m.id, "onnx-community/Qwen2.5-0.5B-Instruct");
  assert.ok(m.label.includes("CPU"), "the label says it runs on the device");
  assert.ok(m.dtype && m.origin && m.license && m.publisher, "every rung states its dtype, origin, licence and publisher");
  assert.equal(TF_MODEL_ID, m.id);
});

test("isTfModel is exact: the roster id is a tf rung, nothing else is", () => {
  assert.equal(isTfModel(TF_MODEL_ID), true);
  assert.equal(isTfModel("gemma2:2b"), false);
  assert.equal(isTfModel("OLMo-2-0425-1B-Instruct-q4f16_1-MLC"), false);
  assert.equal(isTfModel("room:@who:server gemma2:2b"), false);
  assert.equal(isTfModel(""), false);
});

test("the pure decisions are stable and the disclosure is a string, not a host", () => {
  const m = tfModelOf(TF_MODEL_ID);
  assert.equal(tfLabelFor(TF_MODEL_ID), m.label);
  assert.equal(tfLabelFor("nope"), "nope");
  assert.equal(tfDtypeFor(TF_MODEL_ID), m.dtype);
  assert.equal(tfContextWindowFor(TF_MODEL_ID), m.contextWindow);
  assert.equal(tfContextWindowFor("nope"), null);
  const d = TF_DISCLOSURE(TF_MODEL_ID);
  assert.ok(d.includes(TF_MODEL_ID) && d.includes("never leaves this device"), "the disclosure names the model and the boundary");
  // the disclosure says the publisher in words — the worker's model id is a
  // bare id, resolved by the library, never a host literal in this repo
  assert.ok(!/^https?:/.test(TF_MODEL_ID), "the model id carries no scheme");
});