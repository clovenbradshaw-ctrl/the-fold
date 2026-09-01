// web-claim.test.mjs — zeroing the space.
//
// `declaredSlotShape` names the SHAPE a question's own grammar declares
// before any material is read: how many fillers the asker's phrasing
// presupposes, and what the slot is actually called. That declaration is
// the void the answer has to fill, so getting it wrong mis-sizes every
// check downstream of it.
//
// The bug the first block pins (2026-08-26, from a real failing question):
// grammatical number was being read as cardinality. A singular head phrase
// returned `declared: "single"` — an assertion about how many vice
// presidents the WORLD holds, derived from English morphology alone.
//
// The second block (2026-08-27) is a NET-NEW generalization pass, driven by
// a real screenshot: "who was in van halen?" opened NO slot at all, because
// every existing path required either a written determiner/possessive NOUN
// or a capitalised anchor — neither exists in that question's own text. Per
// direct user instruction, the fix carries NO model call anywhere in this
// path ("any model call should be about creating surf query content, not
// structure the slots") and NO private word list — every new fact traced to
// a closed, giver-cited class in the engine's shared register (the same
// standing DEFINITE_DETERMINERS already has) or to the received POS prior.

import test from "node:test";
import assert from "node:assert/strict";

import { declaredSlotShape } from "./web-claim.js";
import {
  DEFINITE_DETERMINERS,
  INFLECTIONAL_SUFFIXES,
  INTERROGATIVE_PRONOUNS,
  MANNER_REASON_PRONOUNS,
} from "../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/priors.js";

const classes = {
  definiteDeterminers: DEFINITE_DETERMINERS,
  inflectionalSuffixes: INFLECTIONAL_SUFFIXES,
  interrogativePronouns: INTERROGATIVE_PRONOUNS,
  mannerReasonPronouns: MANNER_REASON_PRONOUNS,
};

// A real ADP predicate for the anchor-recovery tests — NOT the received POS
// prior (that stays an app.js-only crossing; this file tests the MECHANISM
// against a small, exact, hand-verified truth table rather than depending on
// a large external JSON asset loading correctly in every test environment).
const isAdposition = (w) => new Set(["of", "in", "for", "at", "with", "from", "under", "on"]).has(w);

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

test("the closed classes come from the engine's register, never from this repo", () => {
  // The same wall declaredSlotShape already enforced, pinned so a later
  // caller cannot quietly hand it a hand-typed list.
  assert.throws(() => declaredSlotShape("Who was Lincoln's vice president?", {}), TypeError);
  assert.throws(
    () => declaredSlotShape("Who was Lincoln's vice president?", { definiteDeterminers: new Set(["the"]) }),
    TypeError,
  );
  assert.throws(
    () => declaredSlotShape("Who was Lincoln's vice president?", { ...classes, interrogativePronouns: new Set(["who"]) }),
    TypeError,
    "interrogativePronouns must be the received Map, not a caller's own Set",
  );
  assert.throws(
    () => declaredSlotShape("Who was Lincoln's vice president?", { ...classes, mannerReasonPronouns: undefined }),
    TypeError,
  );
});

// ── generalization: an interrogative pronoun with an ELIDED head noun ────
//
// Found live, 2026-08-27, driving "who was in van halen?" — this question
// has NO determiner, NO possessive, and NO capitalised token at all. Every
// path that existed before this pass returned `headPhrase: null` — the
// SAME return this file's own prior test named "no definite marker at all
// is unknown, with no head phrase to stand on" and asserted as CORRECT.
// It was the bug, not a fact about English: "who" seeks a person as surely
// as "the lead singer" names one, it just never writes the noun down.

test("an interrogative pronoun with no written noun opens a slot from its OWN gloss", () => {
  const shape = declaredSlotShape("who was in van halen?", classes);
  assert.equal(shape.headPhrase, "person", 'the received gloss for "who" — a lexicographic fact, not an invented ontology');
  assert.equal(shape.marker, "who");
  assert.equal(shape.declared, "unknown");
});

test("the same case with an ADP predicate injected also recovers the anchor and its real preposition", () => {
  const shape = declaredSlotShape("who was in van halen?", { ...classes, isAdposition });
  assert.equal(shape.anchorHint, "van halen");
  assert.equal(shape.anchorPreposition, "in", 'the RELATION actually written — "in", never a hardcoded "of"');
});

test("case is never required to extract — a fully lowercase question resolves identically", () => {
  const lower = declaredSlotShape("what was the capital of brazil", { ...classes, isAdposition });
  assert.equal(lower.headPhrase, "capital");
  assert.equal(lower.anchorHint, "brazil");
  const upper = declaredSlotShape("What was the Capital of Brazil?", { ...classes, isAdposition });
  assert.equal(upper.headPhrase, "capital");
  assert.equal(upper.anchorHint, "brazil");
});

test("without isAdposition injected, no anchor is recovered by this path — never a guess from an absent predicate", () => {
  const shape = declaredSlotShape("who was in van halen?", classes);
  assert.equal(shape.anchorHint, null);
  assert.equal(shape.anchorPreposition, null);
});

test("this is REVISING a prior expectation, not adding beside it — 'who served under him' now opens correctly", () => {
  // The file's own prior test asserted headPhrase: null for exactly this
  // sentence, under the title "no definite marker at all is unknown, with
  // no head phrase to stand on" — that was the defect this pass closes, not
  // a fact worth preserving. The anchor recovered ("him") is an unresolved
  // pronoun, a disclosed, separate limitation (anaphora resolution is out
  // of scope here) — it fails harmlessly downstream since no real material
  // states "him" as an entity, never a false positive.
  const shape = declaredSlotShape("who served under him", { ...classes, isAdposition });
  assert.equal(shape.headPhrase, "person");
  assert.equal(shape.declared, "unknown");
});

// ── generalization: manner/reason pronouns refuse OUTRIGHT ───────────────
//
// Found live: lumping "how"/"why" into the same class as who/what/which
// wrongly opened a slot for "How does photosynthesis work?" — there is
// nothing to zero a void against for a manner or a reason. And checking
// this only inside the interrogative path was itself a second bug: "Why
// did the war start?" still opened on "the war" through the determiner
// path, since that path runs independently of which word opened the
// sentence — the refusal must be checked FIRST, before either path.

test("how/why refuse outright — there is nothing to zero a void against for a manner or a reason", () => {
  const how = declaredSlotShape("How does photosynthesis work?", { ...classes, isAdposition });
  assert.equal(how.headPhrase, null);
  const why = declaredSlotShape("Why did the war start?", { ...classes, isAdposition });
  assert.equal(why.headPhrase, null, 'the determiner path ("the war") must not fire once a manner/reason question has already refused');
});

// ── generalization: a genitive 's is never a bare pronoun contraction ────
//
// Found live: the shipped possessive check read ANY token ending in 's as a
// possessive marker, so "Thanks, that's helpful." (that's = that IS, a
// contraction) opened a slot with headPhrase "helpful" — a plain statement
// misread as a question. English pronouns never take genitive 's at all
// (their possessive forms are distinct words — "its", "his", "whose" —
// never "it's"/"he's"/"who's" as a possessive), so an 's-marked token whose
// base is already a pronoun is a contraction, never a genitive.

test("a contraction of a pronoun's copula is never mistaken for a possessive marker", () => {
  // Each sentence is chosen to isolate JUST the contraction property — none
  // contains an independent determiner elsewhere that would legitimately
  // open a slot on its own (declaredSlotShape has never gated on
  // question-hood; it reads a determiner-marked noun phrase wherever one
  // appears, which is a real, pre-existing, and separate characteristic of
  // this function, not something this pass changes).
  for (const q of ["Thanks, that's helpful.", "It's nice.", "He's tired.", "She's late."]) {
    const shape = declaredSlotShape(q, { ...classes, isAdposition });
    assert.equal(shape.headPhrase, null, `${JSON.stringify(q)} is a statement, not a question with a slot`);
  }
});

test("a real genitive on a name still opens its slot exactly as before", () => {
  const shape = declaredSlotShape("Who was Lincoln's vice president?", { ...classes, isAdposition });
  assert.equal(shape.headPhrase, "vice president");
  assert.equal(shape.marker, "lincoln's");
});
