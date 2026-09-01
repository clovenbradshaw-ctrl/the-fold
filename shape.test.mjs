// shape.test.mjs — the answer's form, known before its content.
//
// The walls, not the phrasing: that no content field exists to leak into,
// that an off-vocabulary reply refuses rather than half-fills, and above all
// that a PROPOSAL never overwrites a MEASUREMENT. The wording of the shape
// prompt is meant to be edited; these properties are not.

import { test } from "node:test";
import assert from "node:assert/strict";

import { SHAPE_SCHEMA, buildShapeMessages, readShape, cardinalityOf, mergeShape, askShape, KIND_MAX_CHARS } from "./shape.js";

const shapeOf = (howMany, kind = "a person", composition = "a single item") =>
  readShape({ how_many: howMany, kind_of_thing: kind, composition });

// ── the wall: there is nowhere for content to go ────────────────────────

test("the schema has no content field at all — the leak is prevented by shape, not by instruction", () => {
  const fields = Object.keys(SHAPE_SCHEMA.properties);
  assert.deepEqual(fields.sort(), ["composition", "how_many", "kind_of_thing"]);
  // Measured 2026-08-27: an earlier schema carrying an `anchor` field was
  // contaminated with the known ANSWER on every single case. Remove the
  // field and there is nowhere for a fact to land.
  for (const banned of ["anchor", "answer", "value", "filler", "entity", "subject"]) {
    assert.ok(!(banned in SHAPE_SCHEMA.properties), `a content-shaped field (${banned}) is exactly what leaked before`);
  }
});

test("the prompt asks about form and nothing about the subject", () => {
  const msgs = buildShapeMessages("Who was Abraham Lincoln's vice president?");
  assert.equal(msgs.length, 2);
  assert.match(msgs[0].content, /SHAPE/);
  assert.match(msgs[0].content, /Do not answer the question/);
  // The question rides as the user turn, verbatim — never wrapped in a
  // directive about itself (this repo's own prompt-format-matches-output
  // lesson, stated in holon.js's FLAT_EXECUTE_SYSTEM_PROMPT).
  assert.equal(msgs[1].content, "Who was Abraham Lincoln's vice president?");
});

// ── reading a reply: validated, never trusted ──────────────────────────

test("a well-formed reply reads as a PROPOSAL with a named giver, never as a finding", () => {
  const s = shapeOf("exactly one", "a city");
  assert.equal(s.schema, "EOAnswerShape@1");
  assert.equal(s.standing, "proposed", "a shape arrives before any material — it cannot be evidence about the world");
  assert.match(s.giver, /before any material was read/);
  assert.equal(s.refused, null);
});

test("an off-vocabulary or unparseable reply refuses typed, never half-fills a shape", () => {
  assert.equal(readShape("not json").refused.type, "unparseable");
  assert.equal(readShape(null).refused.type, "unparseable");
  assert.equal(readShape({ how_many: "three-ish", kind_of_thing: "a person", composition: "a single item" }).refused.type, "off_vocabulary");
  assert.equal(readShape({ how_many: "exactly one", kind_of_thing: "a city", composition: "a vibe" }).refused.type, "off_vocabulary");
});

test("an over-long kind is dropped rather than rendered — a cap bounds damage without pretending to know every language's nouns", () => {
  const long = "x".repeat(KIND_MAX_CHARS + 1);
  assert.equal(readShape({ how_many: "exactly one", kind_of_thing: long, composition: "a single item" }).kind, null);
  assert.equal(readShape({ how_many: "exactly one", kind_of_thing: "  a city  ", composition: "a single item" }).kind, "a city");
});

// ── cardinality: "single" returns, from a different source than grammar ──

test("'single' is earned by a proposal about the world, never by grammar", () => {
  assert.equal(cardinalityOf(shapeOf("exactly one")), "single");
  assert.equal(cardinalityOf(shapeOf("more than one")), "enumerated");
  // The honest zero: a refusal declares nothing at all.
  assert.equal(cardinalityOf(shapeOf("unknown without checking")), null);
  assert.equal(cardinalityOf(null), null);
});

// ── THE LOAD-BEARING RULE: a proposal fills a refusal, never overwrites ──

test("a proposal fills where mechanism REFUSED — 'unknown' is an absence of evidence, not a finding", () => {
  // The measured France case: declaredSlotShape says "unknown" (singular
  // grammar is not evidence of world-cardinality); the model says exactly
  // one. Mechanism has nothing here, so the proposal is strictly more.
  const merged = mergeShape({ cardinality: "unknown" }, shapeOf("exactly one", "a city"));
  assert.equal(merged.cardinality, "single");
  assert.ok(merged.proposed.includes("cardinality"), "and it is marked as proposed, never as measured");
});

test("a proposal NEVER overwrites a real mechanical determination", () => {
  // "enumerated" comes from a real plural marker in the question's own
  // words — positive evidence. A proposal must lose to it.
  const merged = mergeShape({ cardinality: "enumerated" }, shapeOf("exactly one", "a city"));
  assert.equal(merged.cardinality, "enumerated");
  assert.ok(!merged.proposed.includes("cardinality"));
});

test("a refusing shape leaves the refusal standing — it does not manufacture a cardinality", () => {
  const merged = mergeShape({ cardinality: "unknown" }, shapeOf("unknown without checking"));
  assert.equal(merged.cardinality, "unknown");
  assert.ok(!merged.proposed.includes("cardinality"));
});

test("INS — the cell that has been undeclared on every turn — is what a shape actually buys", () => {
  // Its absence is what let "Congress", "Though he" and "After" through as
  // candidate vice presidents. Nothing mechanical produces it.
  const merged = mergeShape({ cardinality: "unknown" }, shapeOf("unknown without checking", "a person"));
  assert.equal(merged.admits, "a person");
  assert.ok(merged.proposed.includes("admits"));
});

test("a merge with no shape at all is byte-identical to the mechanical determination", () => {
  for (const c of ["unknown", "enumerated", null]) {
    const merged = mergeShape({ cardinality: c }, null);
    assert.equal(merged.cardinality, c ?? null);
    assert.equal(merged.admits, null);
    assert.deepEqual(merged.proposed, [], "nothing is proposed when nothing proposed anything");
  }
});

// ── the organ end to end, against a stub (no transport of its own) ──────

test("askShape asks with the schema, at temperature 0, and reads the reply", async () => {
  let seen = null;
  const call = async (messages, opts) => {
    seen = { messages, opts };
    return JSON.stringify({ how_many: "more than one", kind_of_thing: "a person", composition: "a list of independent items" });
  };
  const s = await askShape("Who has served as UN Secretary-General?", call, { model: "gemma2:2b" });
  assert.equal(s.howMany, "more than one");
  assert.equal(seen.opts.json, SHAPE_SCHEMA, "the schema IS the wall — constrained decoding, not a polite request");
  assert.equal(seen.opts.temperature, 0, "a shape that flips between runs is not a shape");
  assert.equal(seen.opts.model, "gemma2:2b");
  assert.match(s.giver, /gemma2:2b/);
});

test("a failing call refuses typed and never breaks the turn", async () => {
  const s = await askShape("q", async () => { throw new Error("ollama down"); });
  assert.equal(s.refused.type, "call_failed");
  assert.match(s.refused.detail, /ollama down/);
  // And a refusal merges to exactly the mechanical determination.
  assert.equal(mergeShape({ cardinality: "unknown" }, s).cardinality, "unknown");
});

test("askShape owns no transport — it refuses a caller that hands it none", async () => {
  await assert.rejects(() => askShape("q", null), TypeError);
});
