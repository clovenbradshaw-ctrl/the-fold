// web-claim.test.mjs — zeroing the space.
//
// `declaredSlotShape` names the SHAPE a question's own grammar declares
// before any material is read: how many fillers the asker's phrasing
// presupposes. That declaration is the void the answer has to fill, so
// getting it wrong mis-sizes every check downstream of it.
//
// The bug these cases pin (2026-08-26, from a real failing question):
// grammatical number was being read as cardinality. A singular head phrase
// returned `declared: "single"` — an assertion about how many vice
// presidents the WORLD holds, derived from English morphology alone.

import test from "node:test";
import assert from "node:assert/strict";

import { declaredSlotShape } from "./web-claim.js";
import { DEFINITE_DETERMINERS, INFLECTIONAL_SUFFIXES } from "../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/priors.js";

const classes = { definiteDeterminers: DEFINITE_DETERMINERS, inflectionalSuffixes: INFLECTIONAL_SUFFIXES };

test("a singular head phrase zeroes the space as UNKNOWN, never as single", () => {
  // The specimen. Grammatically singular, factually two-valued: Hannibal
  // Hamlin (1861-65) and Andrew Johnson (1865). Every wrong answer this
  // question produced named exactly one man, and the space had already been
  // declared one-filler before any page was fetched.
  const shape = declaredSlotShape("Who was Lincoln's vice president?", classes);
  assert.equal(shape.declared, "unknown", "a one-noun question is not a one-filler world");
  assert.equal(shape.headPhrase, "vice president");
  assert.equal(shape.marker, "lincoln's");
});

test("the grammatical reading is kept as a disclosure, not thrown away", () => {
  // Demoted, not deleted: the morphology is real evidence about the NOUN and
  // stays readable — it simply no longer decides the cardinality of the world.
  const singular = declaredSlotShape("Who was Lincoln's vice president?", classes);
  assert.equal(singular.grammaticalNumber, "singular");
  const plural = declaredSlotShape("Who were the vice presidents?", classes);
  assert.equal(plural.grammaticalNumber, "plural");
});

test("a plural marker still earns 'enumerated' — that IS positive evidence of many", () => {
  // The asymmetry is the point. Absence of a plural marker is not evidence
  // of oneness, but presence of one IS evidence the asker expects several,
  // and web-hunt.js's REC trigger still reads it that way.
  const shape = declaredSlotShape("Who were the vice presidents?", classes);
  assert.equal(shape.declared, "enumerated");
});

test("no definite marker at all is unknown, with no head phrase to stand on", () => {
  const shape = declaredSlotShape("who served under him", classes);
  assert.equal(shape.declared, "unknown");
  assert.equal(shape.headPhrase, null);
});

test("the closed classes come from the engine's register, never from this repo", () => {
  // The same wall declaredSlotShape already enforced, pinned so a later
  // caller cannot quietly hand it a hand-typed list.
  assert.throws(() => declaredSlotShape("Who was Lincoln's vice president?", {}), TypeError);
  assert.throws(
    () => declaredSlotShape("Who was Lincoln's vice president?", { definiteDeterminers: new Set(["the"]) }),
    TypeError,
  );
});
