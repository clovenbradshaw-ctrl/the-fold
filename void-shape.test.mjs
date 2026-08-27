// void-shape.test.mjs — the arithmetic that makes a missing filler NECESSARY.
//
// The specimen these cases are built from is real and was reproduced live
// many times on 2026-08-26: "who was lincoln's vp?" answered "Hannibal
// Hamlin" on one draw and "Andrew Johnson" on the next, each a true
// sentence, neither the answer. Nothing in the reading could tell it was
// still short, because completeness was being read off the ANSWER instead
// of off the SPACE.

import test from "node:test";
import assert from "node:assert/strict";

import { zeroSpace, fill, voidsOf, voidLine, yearSpansIn, declareVoid, undeclaredOf, spaceFrom } from "./void-shape.js";
import { cellOf } from "../eoreader7/native/kernel/cube.js";

// The specimen declared across all nine operators, as a caller would.
const LINCOLN_VP = {
  slot: "vice president of Abraham Lincoln",
  anchor: "Abraham Lincoln (16th president)",
  admits: "person",
  extent: { from: 1861, to: 1865 },
  dimension: "years",
  relation: "was vice president of",
  composition: "successive terms partition the extent",
  cardinality: "unknown",
  admission: "the candidate's own term span lies within the extent",
  reopensOn: "an uncovered stretch of the extent",
};

const lincolnTerm = { from: 1861, to: 1865 };

test("THE SPECIMEN: one true filler leaves a real hole, and the hole has edges", () => {
  // Johnson alone. Every wrong answer this question produced looked exactly
  // like this state — a correct name, and no way to know it was partial.
  let space = zeroSpace({ slot: "vice president of Abraham Lincoln", constraint: lincolnTerm, dimension: "years" });
  space = fill(space, { filler: "Andrew Johnson", span: { from: 1865, to: 1865 }, source: "en.wikipedia.org" });

  const v = voidsOf(space);
  assert.equal(v.standing, "incomplete");
  assert.deepEqual([...v.voids], [{ from: 1861, to: 1865 }]);
  // The point: this is not "we found no evidence of another VP". It is
  // "four years of this office are held by someone this reading cannot name".
  assert.match(v.reason, /1861-1865 is filled by nothing named so far/);
});

test("THE SPECIMEN, closed: both fillers cover the term and the space reports complete", () => {
  let space = zeroSpace({ slot: "vice president of Abraham Lincoln", constraint: lincolnTerm, dimension: "years" });
  space = fill(space, { filler: "Hannibal Hamlin", span: { from: 1861, to: 1865 } });
  space = fill(space, { filler: "Andrew Johnson", span: { from: 1865, to: 1865 } });

  const v = voidsOf(space);
  assert.equal(v.standing, "covered");
  assert.equal(v.voids.length, 0);
  assert.deepEqual([...v.covered], [{ from: 1861, to: 1865 }]);
});

test("Hamlin alone leaves the tail open — the mirror of the specimen, so this is not one-sided", () => {
  let space = zeroSpace({ slot: "vice president of Abraham Lincoln", constraint: { from: 1861, to: 1869 }, dimension: "years" });
  space = fill(space, { filler: "Hannibal Hamlin", span: { from: 1861, to: 1865 } });
  const v = voidsOf(space);
  assert.equal(v.standing, "incomplete");
  assert.deepEqual([...v.voids], [{ from: 1865, to: 1869 }]);
});

test("an unplaced filler closes nothing and is disclosed, never silently counted either way", () => {
  // A real witness whose extent is unknown. Counting it as covering
  // everything would close the void by ignorance; counting it as covering
  // nothing would overstate the hole. It is reported separately.
  let space = zeroSpace({ slot: "vice president of Abraham Lincoln", constraint: lincolnTerm });
  space = fill(space, { filler: "Andrew Johnson", span: null });
  const v = voidsOf(space);
  assert.equal(v.standing, "incomplete");
  assert.deepEqual([...v.voids], [{ from: 1861, to: 1865 }]);
  assert.deepEqual([...v.unplaced], ["Andrew Johnson"]);
});

test("no declared extent is its own standing — you cannot see a hole in a shape never declared", () => {
  let space = zeroSpace({ slot: "vice president of Abraham Lincoln", constraint: null });
  space = fill(space, { filler: "Andrew Johnson", span: { from: 1865, to: 1865 } });
  const v = voidsOf(space);
  assert.equal(v.standing, "unbounded");
  assert.equal(v.voids.length, 0);
  assert.match(v.reason, /never declared/);
});

test("two witnesses to the same name at different extents are both kept", () => {
  // Collapsing same-named fillers would erase exactly the structure this
  // file exists to find.
  let space = zeroSpace({ slot: "office", constraint: { from: 1, to: 10 } });
  space = fill(space, { filler: "A", span: { from: 1, to: 3 } });
  space = fill(space, { filler: "A", span: { from: 7, to: 10 } });
  assert.equal(space.fillers.length, 2);
  assert.deepEqual([...voidsOf(space).voids], [{ from: 3, to: 7 }]);
});

test("overlapping fillers merge; a gap between two islands is found", () => {
  let space = zeroSpace({ slot: "office", constraint: { from: 0, to: 100 } });
  space = fill(space, { filler: "A", span: { from: 0, to: 30 } });
  space = fill(space, { filler: "B", span: { from: 20, to: 40 } });
  space = fill(space, { filler: "C", span: { from: 60, to: 100 } });
  const v = voidsOf(space);
  assert.deepEqual([...v.covered], [{ from: 0, to: 40 }, { from: 60, to: 100 }]);
  assert.deepEqual([...v.voids], [{ from: 40, to: 60 }]);
});

test("a filler reaching outside the constraint is clipped, never widening the space", () => {
  let space = zeroSpace({ slot: "office", constraint: { from: 10, to: 20 } });
  space = fill(space, { filler: "A", span: { from: 0, to: 100 } });
  const v = voidsOf(space);
  assert.equal(v.standing, "covered");
  assert.deepEqual([...v.covered], [{ from: 10, to: 20 }]);
});

test("a filler wholly outside the constraint covers nothing", () => {
  let space = zeroSpace({ slot: "office", constraint: { from: 10, to: 20 } });
  space = fill(space, { filler: "A", span: { from: 90, to: 99 } });
  assert.deepEqual([...voidsOf(space).voids], [{ from: 10, to: 20 }]);
});

test("append-only: filling returns a new space and never mutates the old one", () => {
  const zero = zeroSpace({ slot: "office", constraint: { from: 0, to: 5 } });
  const one = fill(zero, { filler: "A", span: { from: 0, to: 5 } });
  assert.equal(zero.fillers.length, 0);
  assert.equal(one.fillers.length, 1);
  assert.equal(voidsOf(zero).standing, "incomplete");
  assert.equal(voidsOf(one).standing, "covered");
});

test("voidLine is the model-facing line: the answer, or the void in its place", () => {
  let space = zeroSpace({ slot: "vice president of Abraham Lincoln", constraint: lincolnTerm, dimension: "years" });
  space = fill(space, { filler: "Andrew Johnson", span: { from: 1865, to: 1865 } });
  const open = voidLine(space);
  assert.match(open, /Andrew Johnson \(1865-1865\)/);
  assert.match(open, /Do not fill this gap from memory/);

  space = fill(space, { filler: "Hannibal Hamlin", span: { from: 1861, to: 1865 } });
  const closed = voidLine(space);
  assert.match(closed, /this set is complete; do not add to it/);
});

test("every number is the caller's — a malformed space or span throws rather than defaulting", () => {
  assert.throws(() => zeroSpace({ slot: "" }), TypeError);
  assert.throws(() => zeroSpace({ slot: "x", constraint: { from: 5, to: 1 } }), TypeError);
  const s = zeroSpace({ slot: "x", constraint: { from: 0, to: 1 } });
  assert.throws(() => fill(s, { filler: "" }), TypeError);
  assert.throws(() => fill(s, { filler: "A", span: { from: 9, to: 2 } }), TypeError);
  assert.throws(() => voidsOf({ schema: "nope" }), TypeError);
});

test("yearSpansIn reads a TERM, and refusing a LIFESPAN is the safety property", () => {
  // The one that matters: Hamlin's actual term, phrased as his own
  // Wikipedia page phrases it. This is the span that belongs to the slot.
  assert.deepEqual(
    yearSpansIn("serving from 1861 to 1865, during President Abraham Lincoln's first term"),
    [{ from: 1861, to: 1865 }],
  );

  // A birth-death parenthetical is NOT read, and that refusal is load-bearing
  // rather than a limitation to apologise for. Written by hand first as an
  // expected match, and the test failing is what surfaced the danger: a
  // lifespan of 1809-1891 clipped to Lincoln's 1861-1865 constraint covers
  // the ENTIRE term, which would report the space complete on Hamlin alone
  // and hide Johnson — the exact bug this file exists to prevent, arriving
  // through the date reader instead of the grammar. A person's dates are not
  // an office's dates, and only spans that belong to the SLOT may fill it.
  assert.deepEqual(yearSpansIn("Hannibal Hamlin (August 27, 1809 - July 4, 1891) was"), []);

  // Out of declared scope, refused rather than guessed.
  assert.deepEqual(yearSpansIn("the 17th president of the United States (1865–69)"), []);
  assert.deepEqual(yearSpansIn("no years here at all"), []);
});

test("the lifespan trap, stated as arithmetic: a wrong span closes a real void", () => {
  // Pinned as a regression because it is subtle and would look like success:
  // fill the slot with Hamlin's LIFESPAN and the space reports covered,
  // Johnson is never sought, and the answer is confidently half right.
  let bad = zeroSpace({ slot: "vice president of Abraham Lincoln", constraint: lincolnTerm, dimension: "years" });
  bad = fill(bad, { filler: "Hannibal Hamlin", span: { from: 1809, to: 1891 } });
  assert.equal(voidsOf(bad).standing, "covered", "a lifespan swallows the whole term — this is what must never be fed in");

  // The same filler with the span that actually belongs to the office still
  // covers this term, but for the right reason and from the right sentence.
  let good = zeroSpace({ slot: "vice president of Abraham Lincoln", constraint: { from: 1861, to: 1869 }, dimension: "years" });
  good = fill(good, { filler: "Hannibal Hamlin", span: { from: 1861, to: 1865 } });
  assert.equal(voidsOf(good).standing, "incomplete");
});

// ── defining the VOID across all nine operators ───────────────────────

test("the nine: a void is declared by every operator, against the engine's own cube", () => {
  const d = declareVoid(LINCOLN_VP, { cellOf });
  assert.equal(d.standing, "specified");
  assert.equal(d.cells.length, 9);
  assert.deepEqual(d.cells.map((c) => c.op), ["NUL", "SIG", "INS", "SEG", "CON", "SYN", "DEF", "EVA", "REC"]);
  // Terrain and stance are the CUBE's, never restated here — if the engine
  // changes the algebra, this fails rather than silently disagreeing.
  const nul = d.cells.find((c) => c.op === "NUL");
  assert.equal(nul.terrain, "Void");
  assert.equal(nul.domain, "Existence");
  assert.equal(nul.grain, "Ground");
  assert.equal(d.cells.find((c) => c.op === "SEG").terrain, "Field");
  assert.equal(d.cells.find((c) => c.op === "REC").terrain, "Paradigm");
});

test("each operator carries the specimen's answer to its own question", () => {
  const d = declareVoid(LINCOLN_VP, { cellOf });
  const by = Object.fromEntries(d.cells.map((c) => [c.op, c.declared]));
  assert.equal(by.SIG, "Abraham Lincoln (16th president)"); // the anchor "lincoln" alone could not disambiguate from a car brand
  assert.equal(by.INS, "person");                            // undeclared, the slot returned "Congress" and "22nd Amendment"
  assert.deepEqual(by.SEG, { from: 1861, to: 1865 });        // the dimension the hole is measured along
  assert.equal(by.DEF, "unknown");                           // read off grammar it said "single", and one filler closed a two-filler space
});

test("an under-specified void names its OWN holes — the recursion is the point", () => {
  // The state the reading was actually in all day: a slot and an extent,
  // and seven silent assumptions.
  const thin = declareVoid({ slot: "vice president of Abraham Lincoln", extent: { from: 1861, to: 1865 } }, { cellOf });
  assert.equal(thin.standing, "under-specified");
  assert.deepEqual(thin.undeclared.map((u) => u.op).sort(), ["CON", "DEF", "EVA", "INS", "REC", "SIG", "SYN"]);
  const line = undeclaredOf(thin);
  assert.match(line, /SIG \(Entity\)/);
  assert.match(line, /INS \(Kind\)/);
  assert.match(line, /under-specified/);
});

test("a fully declared void says so, and every omission is typed rather than defaulted", () => {
  assert.match(undeclaredOf(declareVoid(LINCOLN_VP, { cellOf })), /all nine operators are declared/);
  const none = declareVoid({}, { cellOf });
  assert.equal(none.undeclared.length, 9);
  // Never a default: an unstated field is null with a standing, not a guess.
  assert.equal(none.cells.every((c) => c.declared === null && c.standing === "undeclared"), true);
});

test("the algebra is injected, never carried here in a second copy", () => {
  assert.throws(() => declareVoid(LINCOLN_VP), TypeError);
  assert.throws(() => declareVoid(LINCOLN_VP, { cellOf: "nope" }), TypeError);
  // A cube that rejects a cell is a real error, not something to route around.
  assert.throws(() => declareVoid(LINCOLN_VP, { cellOf: () => ({ gap: "unknown_spec", reason: "x" }) }), TypeError);
});

test("declare once: the arithmetic reads the SAME extent, never a second drifting copy", () => {
  const d = declareVoid(LINCOLN_VP, { cellOf });
  let s = spaceFrom(d);
  assert.deepEqual(s.constraint, { from: 1861, to: 1865 });
  assert.equal(s.dimension, "years");
  s = fill(s, { filler: "Andrew Johnson", span: { from: 1865, to: 1865 } });
  const v = voidsOf(s);
  assert.equal(v.standing, "incomplete");
  assert.deepEqual([...v.voids], [{ from: 1861, to: 1865 }]);
});

test("a void declared with no extent yields a space that honestly cannot see holes", () => {
  const d = declareVoid({ slot: "vice president of Abraham Lincoln", admits: "person" }, { cellOf });
  const s = spaceFrom(d);
  assert.equal(voidsOf(s).standing, "unbounded");
});
