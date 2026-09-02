// predication.test.mjs — the invariance/predication split, against REAL
// stored readings and REAL engine organs, never a hand-built fixture standing
// in for either.
//
// The specimen every case here is built around was measured live on
// 2026-09-01: the strongest non-chance arrangement in Gutenberg's Federalist
// Papers is the book's OWN repeated essay subtitle ("The Same Subject
// Continued (Concerning Dangers From Foreign Force and Influence)"), which is
// a licensed, genuinely non-random arrangement that asserts nothing. That is
// the thing this module has to be able to tell apart from "by removing its
// causes", and these tests pin exactly that boundary.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  chanceOfInvariance,
  compositeSurface,
  invariantSurfaces,
  endsKey,
  fillerKey,
  occurrencesOf,
  typeArrangements,
} from "./predication.js";

const ALPHA = 0.05; // this repo's standing bar (network-standing.js's convention)

test("fillerKey: case and internal spacing are not identity", () => {
  assert.equal(fillerKey("  The   Same  Subject "), "the same subject");
  assert.equal(fillerKey("the same subject"), fillerKey("The Same Subject"));
});

test("occurrencesOf reads the UNION a sidecar stores, never the entry count", () => {
  // hyperlexicon.js::hear unions witnesses/spans onto an existing entry rather
  // than appending a second one — so a re-sighting shows up as a longer spans
  // array on ONE entry. Reading entry count would report every arrangement as
  // occurring once and this module would convict nothing, ever.
  assert.equal(occurrencesOf({ spans: [1, 2, 3], witnesses: ["a"] }), 3);
  assert.equal(occurrencesOf({ witnesses: ["a", "b"], spans: [] }), 2);
  assert.equal(occurrencesOf({}), 1, "an arrangement with neither still occurred once");
});

test("chanceOfInvariance is exact, and refuses to be surprised with no alternatives", () => {
  // 4 sightings, 100 pairs of ends available: 100^-3
  assert.ok(Math.abs(chanceOfInvariance(4, 100) - 1e-6) < 1e-12);
  assert.equal(chanceOfInvariance(1, 100), 1, "one sighting has no recurrence to test");
  assert.equal(chanceOfInvariance(5, 1), 1, "a material offering one pair of ends cannot make sameness surprising");
  assert.equal(chanceOfInvariance(5, 0), 1);
});

test("declared parameters are refused when absent — never silently defaulted", () => {
  assert.throws(() => typeArrangements([], { alpha: ALPHA }), /minOccurrences is declared/);
  assert.throws(() => typeArrangements([], { minOccurrences: 1, alpha: ALPHA }), /at least 2/);
  assert.throws(() => typeArrangements([], { minOccurrences: 2 }), /alpha is declared/);
  assert.throws(() => typeArrangements([], { minOccurrences: 2, alpha: 1 }), /alpha is declared/);
});

test("the real specimen: a repeated subtitle is convicted invariant, a varying predicate is not", () => {
  // Shaped exactly as a sidecar's `folded[]` entries are.
  const arrangements = [
    // The book's own subtitle, met on many essays, ends never varying.
    { subject: "The Same", verb: "Subject", object: "Continued", spans: [1, 2, 3, 4, 5, 6], witnesses: ["fed"] },
    // A real predicate: same connector, different ends each time.
    { subject: "by", verb: "removing", object: "its causes", spans: [1], witnesses: ["fed"] },
    { subject: "by", verb: "removing", object: "the liberty", spans: [1], witnesses: ["fed"] },
    { subject: "by", verb: "controlling", object: "its effects", spans: [1], witnesses: ["fed"] },
    { subject: "a landed", verb: "interest", object: "a manufacturing interest", spans: [1], witnesses: ["fed"] },
    { subject: "the latent causes", verb: "of", object: "faction", spans: [1], witnesses: ["fed"] },
  ];

  const typed = typeArrangements(arrangements, { minOccurrences: 2, alpha: ALPHA });

  assert.equal(typed.invariant.length, 1, "exactly the subtitle is convicted");
  assert.equal(typed.invariant[0].surface, "The Same Subject Continued");
  assert.ok(typed.invariant[0].p < ALPHA);

  // The predicate arms are NOT convicted, and are not silently relabelled
  // "predication" either — they are undetermined, which is the honest word.
  const removing = typed.undetermined.find((u) => u.arrangement.object === "its causes");
  assert.ok(removing, "the real predicate stays in undetermined");
  assert.equal(removing.reason, "below_recurrence_floor");
  assert.equal(typed.regime.predicationsDetected, null, "this organ never claims to have detected a predication");
});

test("invariance is convicted; predication is never manufactured from its absence", () => {
  // Everything varies — nothing recurs. The honest output is zero findings,
  // not "all of these are predications".
  const arrangements = [
    { subject: "a", verb: "v", object: "1", spans: [1] },
    { subject: "b", verb: "v", object: "2", spans: [1] },
    { subject: "c", verb: "v", object: "3", spans: [1] },
  ];
  const typed = typeArrangements(arrangements, { minOccurrences: 2, alpha: ALPHA });
  assert.equal(typed.invariant.length, 0);
  assert.equal(typed.regime.convicted, 0);
  assert.equal(typed.regime.predicationsDetected, null);
  assert.equal(typed.regime.belowFloor, 3, "the denominator is reported, never a bare zero");
});

test("a material offering no alternative cannot convict — the null knows what it is reading", () => {
  // One arrangement, met ten times, and it is the ONLY arrangement there is.
  // pool = 1, so "the same ends every time" is not a finding about anything.
  const typed = typeArrangements(
    [{ subject: "x", verb: "y", object: "z", spans: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }],
    { minOccurrences: 2, alpha: ALPHA },
  );
  assert.equal(typed.invariant.length, 0, "invariance against no alternative is not surprise");
  assert.equal(typed.regime.pool, 1);
});

test("the recurrence floor is a real wall, and its refusals are typed and counted", () => {
  const arrangements = [
    { subject: "The Same", verb: "Subject", object: "Continued", spans: [1, 2] },
    { subject: "a", verb: "b", object: "c", spans: [1] },
  ];
  const strict = typeArrangements(arrangements, { minOccurrences: 5, alpha: ALPHA });
  assert.equal(strict.invariant.length, 0, "two sightings do not clear a floor of five");
  assert.equal(strict.regime.belowFloor, 2);
  assert.ok(strict.undetermined.every((u) => u.reason === "below_recurrence_floor"));
});

test("invariantSurfaces returns the fixed arrangement as a plain surface — not as a referent", () => {
  const typed = typeArrangements(
    [
      { subject: "The Same", verb: "Subject", object: "Continued", spans: [1, 2, 3, 4] },
      { subject: "other", verb: "thing", object: "here", spans: [1] },
      { subject: "third", verb: "thing", object: "there", spans: [1] },
    ],
    { minOccurrences: 2, alpha: ALPHA },
  );
  const surfaces = invariantSurfaces(typed);
  assert.ok(surfaces.has("The Same Subject Continued"));
  assert.equal(surfaces.size, 1);
});

test("compositeSurface joins in the material's own order and drops nothing but blanks", () => {
  assert.equal(compositeSurface({ subject: "two methods", verb: "of", object: "curing faction" }), "two methods of curing faction");
  assert.equal(compositeSurface({ subject: "  a  ", verb: "", object: "b" }), "a b");
});

test("endsKey identifies an arrangement by its ENDS, so one connector's variety is visible", () => {
  assert.equal(endsKey({ subject: "A", object: "B" }), endsKey({ subject: "a", object: "  b " }));
  assert.notEqual(endsKey({ subject: "A", object: "B" }), endsKey({ subject: "A", object: "C" }));
});
