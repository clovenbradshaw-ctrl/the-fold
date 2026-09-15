// holon-firewall.test.mjs — checks the-fold's OWN system prompts (holon.js)
// against the firewall organ (now eoreader7/native/organs/firewall.js,
// reached here through the shim). Split out of firewall.test.mjs on
// 2026-09-14 (Phase 4 organ migration): firewall.js itself is pure and
// moved whole, but this check is inherently a the-fold concern — holon.js
// is the surface's own prompt-assembly file and does not cross the seam.
//
// This is the same shape as constitution.test.mjs's II.13 host scan: the
// invariant is checked against what the app actually loads, never against
// a list someone has to remember to update.

import { test } from "node:test";
import assert from "node:assert/strict";

import { assertModelFacing } from "./firewall.js";
import * as holon from "./holon.js";

// Every string this repo sends a model as standing framing. Named
// explicitly rather than swept from exports, because "is this string
// model-facing" is a fact about intent that only a person knows —
// PLAN_SYSTEM_PROMPT is model-facing, MAX_CORRECTIONS is not.
const MODEL_FACING = {
  CHAT_SYSTEM_PROMPT: holon.CHAT_SYSTEM_PROMPT,
  S1_SYSTEM_PROMPT: holon.S1_SYSTEM_PROMPT,
  EXECUTE_SYSTEM_PROMPT: holon.EXECUTE_SYSTEM_PROMPT,
  FLAT_EXECUTE_SYSTEM_PROMPT: holon.FLAT_EXECUTE_SYSTEM_PROMPT,
  PLAN_SYSTEM_PROMPT: holon.PLAN_SYSTEM_PROMPT,
  SEARCHED_VOID_PREFIX: holon.SEARCHED_VOID_PREFIX,
  UNRETRIEVED_MATERIAL_PREFIX: holon.UNRETRIEVED_MATERIAL_PREFIX,
  WEB_OFF_PREFIX: holon.WEB_OFF_PREFIX,
  priorPassFor: holon.priorPassFor("a first take"),
};

test("no standing system prompt hands the model a word for one of our own parts", () => {
  assert.deepEqual(assertModelFacing(MODEL_FACING).sort(), Object.keys(MODEL_FACING).sort());
});

test("the specific words the live leak was built from are gone", () => {
  // Each of these was really present in the string named, and each was
  // really echoed back by gemma2:2b in a shipped answer on 2026-08-27.
  assert.doesNotMatch(holon.EXECUTE_SYSTEM_PROMPT, /\bprompt\b/i, "contained 'the prompt' twice");
  assert.doesNotMatch(holon.FLAT_EXECUTE_SYSTEM_PROMPT, /\bpassages?\b/i, "contained 'the passages' three times");
  assert.doesNotMatch(holon.CHAT_SYSTEM_PROMPT, /\bdocument\b|\bsource material\b/i, "reported a retrieval outcome");
});
