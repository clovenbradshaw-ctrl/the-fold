// passage-comparison.test.mjs — a comparison whose figures live in the passages, on the REAL organs
// (grounding.js's fold, arithmetic.js's checkComparison over real mathjs); refusals are results, not misses.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as math from "mathjs";
import { makePassageComparison } from "../eoreader7/native/organs/passage-comparison.js";
import { COMPARATIVE_WORDS, checkComparison } from "./arithmetic.js";
import { unquoted } from "./quoting.js";

// The organ imports no surface: this file binds it to the real arithmetic door
// and quote-stripper, exactly as holon.js does.
const { checkPassageComparison, referentsOf } = makePassageComparison({ COMPARATIVE_WORDS, checkComparison, unquoted });

const P = [
  { text: "The Vellmar bridge reopened to traffic on 4 March 2031 after a two-year closure." },
  { text: "The bridge carries 12,000 vehicles a day. The older Karst tunnel, two kilometres upstream, carries 9,500 vehicles a day." },
];

test("two referents, one shared unit in the passages: the engine takes the difference", () => {
  const r = checkPassageComparison("Which carries more vehicles a day, the Vellmar bridge or the Karst tunnel, and by how many?", P, { math });
  assert.equal(r.difference, 2500);
  assert.equal(r.first, 0);
  assert.match(r.sentence, /^The Vellmar bridge has more: 12,000 vehicles against 9,500 for the Karst tunnel, a difference of 2,500 vehicles\.$/);
});

test("the comparative picks the side: fewer names the other referent", () => {
  const r = checkPassageComparison("Which carries fewer vehicles, the Vellmar bridge or the Karst tunnel?", P, { math });
  assert.match(r.sentence, /^The Karst tunnel has fewer: 9,500/);
});

test("refused when the evidence is not there (control: the scorer must fail these)", () => {
  // no figure for the second referent
  assert.equal(checkPassageComparison("Which carries more vehicles, the Vellmar bridge or the Ostrin footbridge?", P, { math }), null);
  // not a comparison
  assert.equal(checkPassageComparison("When did the Vellmar bridge reopen?", P, { math }), null);
  // no engine
  assert.equal(checkPassageComparison("Which carries more vehicles, the Vellmar bridge or the Karst tunnel?", P, {}), null);
  // one sentence naming both referents is evidence for neither
  const both = [{ text: "The Vellmar bridge carries 12,000 vehicles a day, the Karst tunnel 9,500 vehicles a day." }];
  assert.equal(checkPassageComparison("Which carries more vehicles, the Vellmar bridge or the Karst tunnel?", both, { math }), null);
  // two different figures for one referent: ambiguous, never guessed
  const two = [...P, { text: "The Karst tunnel carries 7,000 vehicles a day at night." }];
  assert.equal(checkPassageComparison("Which carries more vehicles, the Vellmar bridge or the Karst tunnel?", two, { math }), null);
  // equal figures: no difference to state
  const eq = [{ text: "The bridge carries 5 vehicles a day. The Karst tunnel carries 5 vehicles a day." }];
  assert.equal(checkPassageComparison("Which carries more vehicles, the Vellmar bridge or the Karst tunnel?", eq, { math }), null);
});

test("referents are the noun phrases either side of the coordinator", () => {
  assert.deepEqual(referentsOf("Which is larger, the Vellmar bridge or the Karst tunnel?").map((r) => r.surface), ["the Vellmar bridge", "the Karst tunnel"]);
  assert.equal(referentsOf("When did the Vellmar bridge reopen?"), null);
});
