// pattern.test.mjs — P154. CON·Pattern, the first move at a second grain.
import test from "node:test";
import assert from "node:assert/strict";
import { conPattern, convergence, recurrenceNull, loops, LEVELS, OWED_LEVELS, ARRANGEMENTS } from "./pattern.js";

const split = (t) => String(t).split(/(?<=[.!?])\s+/).filter(Boolean).map((text, order) => ({ text, offset: 0, order }));
const list = (n) => Array.from({ length: n }, (_, i) => ({ end1: `person${i}`, label: "served under", end2: "Queen Victoria", ref: `pm.txt#${i}0-${i}9`, verdict: "bound" }));
const noise = (n) => Array.from({ length: n }, (_, i) => ({ end1: `s${i}`, label: `l${i}`, end2: `o${i}`, ref: `n.txt#${i}`, verdict: "bound" }));

test("CONVERGENCE is the statistic — many DIFFERENT subjects on one relation to one object", () => {
  const c = convergence(list(10));
  assert.equal(c.length, 1);
  assert.equal(c[0].count, 10, "ten distinct subjects, not ten edges");
  // The same subject twice is ONE subject: a list of ten repetitions of one
  // person is not ten people, and counting EDGES would have said it was.
  const dup = [...list(1), ...list(1)];
  assert.equal(convergence(dup).length, 0, "one subject repeated is not a convergence, whatever the edge count");
});

test("the corrected statistic fires on a planted list", () => {
  const r = conPattern([...list(10), ...noise(6)], { draws: 400, seed: 2 });
  assert.equal(r.established.length, 1);
  assert.equal(r.established[0].count, 10);
  assert.equal(r.cell, "CON·Pattern");
  assert.equal(r.terrain, "Network");
  assert.equal(r.stance, "Tracing");
  assert.ok(r.established[0].spans.every((s) => s.ref), "every member carries its address — a level above stands on this without leaving the material");
});

test("THE CONTROL: no convergence, nothing established, and it is a typed gap not a false negative", () => {
  const r = conPattern(noise(16), { draws: 400, seed: 2 });
  assert.equal(r.established.length, 0);
  assert.equal(r.gap, "degenerate_ground");
});

test("THE DEFECT THIS REPLACES: a statistic a null can never move is not a check (II.10)", () => {
  // The first version tested "the largest number of edges sharing a label"
  // against a margin-preserving rewiring. Max-label-multiplicity is a
  // property of the label multiset ALONE, so every label-preserving shuffle
  // returns the observed value exactly — it reported "a rewiring reached 10
  // in 400 of 400 draws" on a PLANTED list and established nothing. The
  // corrected statistic must be movable by its own null, and this asserts it.
  const n = recurrenceNull(list(10).concat(noise(6)), { draws: 400, seed: 2 });
  assert.equal(n.atLeastAsBig, 0, "a re-dealing must be able to fail to reach the observed convergence");
  assert.equal(n.established, true);
});

test("a beyond-reach edge is not a fact about the material and may not build a pattern in it", () => {
  const unbound = list(10).map((e) => ({ ...e, verdict: "beyond-reach" }));
  assert.equal(convergence(unbound).length, 0);
  assert.equal(conPattern(unbound, { draws: 100 }).established.length, 0);
});

test("THE LOOPS run at several scales, each against its OWN null", () => {
  const passages = [
    { ref: "a#1", text: "The council met in Moscow. The council met in Moscow." },
    { ref: "a#2", text: "Pierre spoke at length about the council and about Moscow." },
    { ref: "a#3", text: "Moscow was quiet that winter, and the council said nothing." },
  ];
  // The list sits among other material, as a real list does — the null needs
  // more than one object to deal, and a corpus of nothing but the list is a
  // degenerate ground (pinned separately below).
  const L = loops({ passages, edges: [...list(10), ...noise(6)], splitSentences: split, draws: 200, seed: 1 });
  assert.ok(L.fired.includes("convergence"), "the planted list must fire at the convergence level");
  assert.ok(L.fired.includes("sentence"), "a verbatim repeat must fire at the sentence level");
  assert.equal(L.levels.proposition.established, false, "no proposition is stated twice here");
});

test("a level that COULD NOT RUN is never counted as 'no pattern'", () => {
  const L = loops({ passages: [{ ref: "a#1", text: "one passage only" }], edges: [], splitSentences: split, draws: 50 });
  assert.ok(L.couldNotRun.length > 0);
  assert.ok(L.couldNotRun.every((k) => L.levels[k].gap), "each carries a typed gap, not a false verdict");
  assert.ok(!L.fired.includes(L.couldNotRun[0]));
});

test("the surface level says it is about SPELLING, not about referents", () => {
  // "prince" in 14 of 14 passages conflates Prince Andrew with Prince Vasili.
  // A recurrence of surfaces is a fact about spelling; only a recurrence of
  // referents is a fact about what the material is about.
  const passages = Array.from({ length: 5 }, (_, i) => ({ ref: `p#${i}`, text: `prince andrew rode ${i} and prince vasili waited` }));
  const L = loops({ passages, edges: [], splitSentences: split, draws: 100 });
  assert.equal(L.levels.surface.aboutSurfacesNotReferents, true);
  assert.ok(!LEVELS.includes("word"), "the level is not called 'word' — it does not read words, it reads spellings");
});

test("the levels that are OWED are named, and say nothing either way", () => {
  // `fold` left this list when cursor.js built it (P156); `referent` — the
  // cheap per-turn version, via the cast index — is still owed.
  assert.deepEqual(OWED_LEVELS, ["referent"]);
  const L = loops({ passages: [], edges: list(4), draws: 50 });
  assert.deepEqual(L.notYetRun, ["referent"]);
  assert.match(L.why, /are not built and say nothing either way/);
  for (const owed of OWED_LEVELS) assert.ok(!L.fired.includes(owed), "an unbuilt level may never be reported as having fired");
});

test("A GROUND WITH ONE OBJECT cannot be tested, and says so rather than reporting absence", () => {
  // Every edge naming the same object leaves the null nothing to deal. This
  // is the first statistic's degeneracy surviving into the second in a new
  // place — found by this suite, not in production.
  const r = conPattern(list(10), { draws: 200, seed: 4 });
  assert.equal(r.established.length, 0);
  assert.equal(r.gap, "degenerate_ground");
  assert.match(r.why, /re-dealing objects changes nothing/);
});

test("the arrangement is named from the cube's own address, not chosen", () => {
  const r = conPattern([...list(8), ...noise(5)], { draws: 200, seed: 4 });
  assert.equal(r.established[0].what, ARRANGEMENTS.OBJECT);
});
