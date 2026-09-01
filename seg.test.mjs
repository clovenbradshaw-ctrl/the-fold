// seg.test.mjs — against the REAL mathjs package and the REAL succession
// specimen, never a hand-typed stand-in for either. The specimen is
// succession.test.mjs's own (a real running-app capture of real Wikipedia
// text); the finding under test is the one a human first made in prose and
// should never have had to.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as math from "mathjs";

import { coarseYears, fineDays, fitUnit, segIssues, UNIT_LADDER } from "./seg.js";
import { successionFillers } from "./succession.js";

// succession.test.mjs's own specimen, VERBATIM and entire. Trimming it was
// tried first and broke the test rather than the code: `resolveBoxSubjects`
// bootstraps a chain from the prose sentence naming an ordinal and exactly
// one candidate ("Hannibal Hamlin … was the 15th vice president"), so a
// specimen with the boxes but not that sentence resolves NO subjects and
// yields zero fillers — a real property of the reader, caught by running it.
const SPECIMEN = `15th Vice President of the United States
In office
March 4, 1861 – March 4, 1865
President Abraham Lincoln
Preceded by John C. Breckinridge
Succeeded by Andrew Johnson
23rd United States Minister to Spain
In office
December 20, 1881 – October 17, 1882
President Chester A. Arthur
Preceded by Lucius Fairchild
Succeeded by John W. Foster
United States Senator from Maine
In office
March 4, 1869 – March 3, 1881
Preceded by Lot M. Morrill
Succeeded by Eugene Hale

17th President of the United States
In office
April 15, 1865 – March 4, 1869
Vice President Vacant [ a ]
Preceded by Abraham Lincoln
Succeeded by Ulysses S. Grant
16th Vice President of the United States
In office
March 4, 1865 – April 15, 1865
President Abraham Lincoln
Preceded by Hannibal Hamlin
Succeeded by Schuyler Colfax
United States Senator
from Tennessee
In office
March 4, 1875 – July 31, 1875
Preceded by Parson Brownlow
Succeeded by David M. Key

Hannibal Hamlin (August 27, 1809 – July 4, 1891) was an American politician and diplomat who was the 15th vice president of the United States, serving from 1861 to 1865, during President Abraham Lincoln's first term. He was the first Republican vice president.`;

const lincolnFillers = () => successionFillers("Abraham Lincoln", [SPECIMEN]);

test("the finding that was made in prose is made by arithmetic: Johnson's year span collapses to a point", () => {
  const issues = segIssues(lincolnFillers(), { math });
  const collapsed = issues.filter((i) => i.type === "collapsed");
  assert.equal(collapsed.length, 1, "exactly one span collapses — Johnson's, not Hamlin's");
  assert.equal(collapsed[0].filler, "Andrew Johnson");
  assert.equal(collapsed[0].days, 42, "the real extent, computed off the record's own dates");
  assert.match(collapsed[0].detail, /42 days/);
});

test("Hamlin's span is NOT flagged — a real multi-year extent states fine in years", () => {
  const issues = segIssues(lincolnFillers(), { math });
  assert.ok(!issues.some((i) => i.filler === "Hannibal Hamlin"), "no finding against a span the unit genuinely fits");
});

test("fitUnit DERIVES the coarsest unit that works — never picks one", () => {
  // years collapses Johnson (42 days rounds to 0); months keeps both
  // non-zero (48 vs 1) and distinguishable. Months is therefore the
  // coarsest fit, and that is a fact about these two spans.
  assert.equal(fitUnit(lincolnFillers(), { math }), "months");
});

test("fineDays returns null, never 0, when there are no precise dates — unreadable is not collapsed", () => {
  assert.equal(fineDays({ from: 1865, to: 1865 }), null);
  assert.equal(fineDays({ from: 1865, to: 1865, fromText: "March 4, 1865", toText: "March 4, 1865" }), 0);
});

test("a span with no precise dates lands a typed GAP, never silence and never a pass", () => {
  const issues = segIssues([{ filler: "Someone", span: { from: 1865, to: 1865 } }], { math });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].type, "unreadable");
  assert.match(issues[0].detail, /never checked/);
});

test("two spans identical at the coarse grain and different at the fine one are reported as indistinguishable", () => {
  const entries = [
    { filler: "A", span: { from: 1865, to: 1865, fromText: "January 1, 1865", toText: "March 1, 1865" } },
    { filler: "B", span: { from: 1865, to: 1865, fromText: "March 1, 1865", toText: "December 1, 1865" } },
  ];
  const issues = segIssues(entries, { math });
  const pair = issues.find((i) => i.type === "indistinguishable");
  assert.ok(pair, "the year grain cannot separate two spans the dates plainly separate");
  assert.deepEqual(pair.filler, ["A", "B"]);
});

test("a healthy set produces no issues at all", () => {
  const entries = [
    { filler: "A", span: { from: 1861, to: 1865, fromText: "March 4, 1861", toText: "March 4, 1865" } },
    { filler: "B", span: { from: 1869, to: 1877, fromText: "March 4, 1869", toText: "March 4, 1877" } },
  ];
  assert.deepEqual(segIssues(entries, { math }), []);
  assert.equal(fitUnit(entries, { math }), "years");
});

test("the unit algebra is required, not optional — no math, no finding", () => {
  assert.throws(() => segIssues([], {}), TypeError);
  assert.throws(() => fitUnit([], {}), TypeError);
});

test("fitUnit refuses rather than falling through to the finest unit when nothing clears", () => {
  // Two spans whose own dates are identical: no unit on the ladder can
  // separate them, and the honest answer is that none does.
  const same = { fromText: "March 4, 1865", toText: "March 4, 1865", from: 1865, to: 1865 };
  assert.equal(fitUnit([{ filler: "A", span: same }, { filler: "B", span: { ...same } }], { math }), null);
});

test("the unit ladder is declared coarse-to-fine, as a received closed class", () => {
  assert.deepEqual(UNIT_LADDER, ["years", "months", "days"]);
});

test("coarseYears reads the numeric endpoints void-shape.js actually computes over", () => {
  assert.equal(coarseYears({ from: 1861, to: 1865 }), 4);
  assert.equal(coarseYears({ from: 1865, to: 1865 }), 0);
  assert.equal(coarseYears({ fromText: "x", toText: "y" }), null);
});
