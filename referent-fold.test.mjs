import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { containmentFraction, offsetsOf, spansOf, measuredFold } from "./referent-fold.js";

const span = (start, end) => ({ start, end });

test("containmentFraction: a PREFIX span (bare span starts where the compound starts) is covered", () => {
  const r = containmentFraction([span(10, 13)], [span(10, 20)]);
  assert.equal(r.fraction, 1);
  assert.equal(r.exact, true);
});

test("containmentFraction: a SUFFIX span (bare span ends where the compound ends, starts INSIDE it) is ALSO covered — the exact bug this rewrite closes", () => {
  const r = containmentFraction([span(14, 20)], [span(10, 20)]);
  assert.equal(r.fraction, 1, "a suffix span must be covered by full containment, not by matching the compound's own START offset");
  assert.equal(r.exact, true);
});

test("containmentFraction: an INFIX span (fully inside, touching neither edge) is covered too — containment generalizes past prefix/suffix entirely", () => {
  const r = containmentFraction([span(12, 15)], [span(10, 20)]);
  assert.equal(r.exact, true);
});

test("containmentFraction: a span that only PARTIALLY overlaps (crosses the compound's own boundary) is NOT covered — touching is not containment", () => {
  const r = containmentFraction([span(18, 25)], [span(10, 20)]);
  assert.equal(r.exact, false, "18-25 is not fully inside 10-20 — this must refuse, not round a partial overlap up to a fold");
});

test("containmentFraction: multiple bare occurrences, all covered by DIFFERENT compound occurrences, is still exact", () => {
  const r = containmentFraction([span(10, 13), span(50, 53)], [span(10, 20), span(50, 60)]);
  assert.equal(r.exact, true);
  assert.equal(r.coveredCount, 2);
});

test("containmentFraction: a single uncovered span breaks exactness — never rounds up", () => {
  const r = containmentFraction([span(10, 13), span(90, 93)], [span(10, 20)]);
  assert.equal(r.fraction, 0.5);
  assert.equal(r.exact, false);
});

test("containmentFraction: empty bare spans report null fraction, never 0 or 1 by convention", () => {
  const r = containmentFraction([], [span(10, 20)]);
  assert.equal(r.fraction, null);
  assert.equal(r.exact, false);
});

test("offsetsOf: word-boundary matched, case-sensitive, no false hits inside a longer word", () => {
  const text = "Ivan went to Van Helsing's house. Vantage point was clear.";
  const offs = offsetsOf(text, "Van");
  // Must match the real "Van" in "Van Helsing" only — not "Ivan" or "Vantage"
  assert.equal(offs.length, 1);
  assert.equal(text.slice(offs[0], offs[0] + 3), "Van");
});

test("measuredFold: THE REAL SPECIMEN — bare 'Van' folds into 'Van Helsing' on real Dracula text, exact — every occurrence accounted for, including wrapped lines", () => {
  const abs = "/Users/mlacy/Documents/3.0/live_priors/01-literature-books/gutenberg/pg345_Dracula.txt";
  const text = fs.readFileSync(abs, "utf8");
  const r = measuredFold(text, "Van", "Van Helsing");
  assert.equal(r.folds, true, `expected an exact fold; got fraction ${r.fraction} (${r.coveredCount}/${r.bareCount})`);
  assert.equal(r.coveredCount, r.bareCount, "every single bare occurrence must be covered — that is what 'folds' means");
  assert.ok(r.bareCount > 300, `sanity: this module's own regex-based scan (no sentence-initial/ALL-CAPS exclusion, unlike the engine's own count of 176) should find well over 300 real occurrences; got ${r.bareCount}`);
});

test("offsetsOf: a hard-wrapped compound (CRLF splitting the two words) still counts as one occurrence", () => {
  const wrapped = "He said Van\r\nHelsing arrived.";
  const offs = offsetsOf(wrapped, "Van Helsing");
  assert.equal(offs.length, 1);
});

test("measuredFold: THE SUFFIX SPECIMEN, real and live-observed — bare 'Helsing' folds into 'Van Helsing', which the prefix-only version of this module silently missed (screenshotted by the user, 62 mentions never folded)", () => {
  const abs = "/Users/mlacy/Documents/3.0/live_priors/01-literature-books/gutenberg/pg345_Dracula.txt";
  const text = fs.readFileSync(abs, "utf8");
  const r = measuredFold(text, "Helsing", "Van Helsing");
  assert.equal(r.folds, true, `expected an exact fold; got fraction ${r.fraction} (${r.coveredCount}/${r.bareCount})`);
  assert.equal(r.coveredCount, r.bareCount);
});

test("spansOf: a suffix candidate's own span starts INSIDE the compound's span, not at the compound's own start — the geometry the old start-offset-only comparison could never see", () => {
  const text = "My old master, Van Helsing, said nothing.";
  const [helsingSpan] = spansOf(text, "Helsing");
  const [compoundSpan] = spansOf(text, "Van Helsing");
  assert.ok(helsingSpan.start > compoundSpan.start, "the suffix must start AFTER the compound starts");
  assert.equal(helsingSpan.end, compoundSpan.end, "and end exactly where the compound ends");
});

test("measuredFold: a bare surface with GENUINE independent existence does NOT fold — refuses, never guesses", () => {
  const abs = "/Users/mlacy/Documents/3.0/live_priors/01-literature-books/gutenberg/pg345_Dracula.txt";
  const text = fs.readFileSync(abs, "utf8");
  // "Mina" stands alone constantly in this book, independent of "Mina Murray"/
  // "Madam Mina" — the control case proving this organ does not fold everything.
  const r = measuredFold(text, "Mina", "Mina Murray");
  assert.equal(r.folds, false, `"Mina" genuinely has independent standing and must not fold; got fraction ${r.fraction}`);
  assert.ok(r.bareCount > r.coveredCount, "Mina must have real, uncovered independent occurrences");
});
