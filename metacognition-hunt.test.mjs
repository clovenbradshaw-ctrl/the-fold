// node --test metacognition-hunt.test.mjs
//
// The hunt gate (metacognition.js::makeHuntMeter/huntSettled) against the
// ENGINE'S REAL ORGAN — emergence/tiers.js's createTierStack/foldThrough,
// imported by relative path exactly the way hypergraph.test.mjs imports
// its engine organs. A SEPARATE file from metacognition.test.mjs on
// purpose (the hyperlexicon-stance.test.mjs precedent, in reverse): that
// file imports only eoreader7's native kernel and must keep running in a
// checkout where `legacy-eoreader6.1` is an uninitialized submodule; this
// file needs the legacy engine's tiers.js and honestly fails to load
// where it is absent, exactly like the rest of the engine-path suite.
//
// Every number asserted below was MEASURED against the real organ before
// being pinned (probe run 2026-09-01, this session), not predicted: the
// convergent stream's ranks (0.97, 0.98), the divergent page's censored:
// "above", the thin-seed first page's unplaceable read. The fixtures are
// declared invented (no recallable fact — the falsification-probe
// posture) so nothing here tests memorized world knowledge.

import { test } from "node:test";
import assert from "node:assert/strict";

import { makeHuntMeter, huntSettled } from "./metacognition.js";
import { createTierStack, foldThrough } from "../eoreader7/legacy-eoreader6.1/packages/engine/emergence/tiers.js";

const hm = makeHuntMeter({ createTierStack, foldThrough });

const QUESTION = "who founded the Ostrel Works, and when did Mara Voss take over the Delling Yard?";
const SNIPPETS = "Ostrel Works history founding | Kessler and Voss industrial partnership | Delling Yard 1898 founding Voss";
const PAGE_A =
  "The Ostrel Works began operation under a disputed founding. Renn Kessler never founded the Ostrel Works; " +
  "the Ostrel Works stayed with Mara Voss for years while Kessler only advised. Mara Voss founded the Delling " +
  "Yard in 1898 and ran the Delling Yard alone until the merger.";
const PAGE_B =
  "Contrary to popular belief, Renn Kessler never founded the Ostrel Works. Records show the Ostrel Works " +
  "remained with Mara Voss, Kessler serving as an advisor. Voss founded the Delling Yard in 1898, running the " +
  "Delling Yard by herself for decades.";
const PAGE_ALIEN =
  "Migratory songbirds navigate by starlight and magnetic fields. Ornithologists tracking warblers across the " +
  "hemisphere found juveniles inherit compass bearings, while adults correct for drift using landmark memory " +
  "and celestial rotation.";

test("a convergent stream settles: pages that only restate what is already held stop the hunt", () => {
  const m = hm.create([QUESTION, SNIPPETS]);
  const a = hm.arrive(m, PAGE_A);
  const b = hm.arrive(m, PAGE_B);
  assert.equal(a.settled, true, `page A should settle against a seed it heavily overlaps (got rank=${a.rank}, censored=${a.censored})`);
  assert.equal(b.settled, true, "a near-paraphrase of what is already held settles");
  assert.ok(a.rank > 0.5 && b.rank > 0.5, "both placed on the unsurprising side of the null's own median");
});

test("a genuinely novel page does NOT settle — the hunt continues while belief is still moving", () => {
  const m = hm.create([QUESTION, SNIPPETS]);
  hm.arrive(m, PAGE_A);
  const c = hm.arrive(m, PAGE_ALIEN);
  assert.equal(c.censored, "above", "an alien-topic page beats every one of the null's own continuations");
  assert.equal(c.settled, false);
});

test("an empty page can never stop the hunt — a gap is withheld, not 'nothing moved'", () => {
  const m = hm.create([QUESTION, SNIPPETS]);
  hm.arrive(m, PAGE_A);
  const e = hm.arrive(m, "   ");
  assert.ok(e.gap, "an untokenizable arrival is a typed gap");
  assert.equal(e.settled, false);
});

test("a first page against a thin seed cannot settle — an unplaceable arrival continues the hunt, never ends it", () => {
  const m = hm.create([QUESTION]);
  const c = hm.arrive(m, PAGE_ALIEN);
  assert.equal(c.settled, false, `unplaceable or surprising either way, the safe side is 'keep hunting' (rank=${c.rank}, censored=${c.censored})`);
});

test("seed arrivals build the ground but never carry a stop verdict", () => {
  const m = hm.create([QUESTION, SNIPPETS]);
  assert.equal(m.arrivals.length, 2);
  for (const s of m.arrivals) {
    assert.equal(s.role, "seed");
    assert.equal(s.settled, null, "a seed is what the hunt starts FROM — the stop rule never reads it");
  }
});

test("deterministic: the same stream gives byte-identical observations — the null is drawn on a declared seed", () => {
  const run = () => {
    const m = hm.create([QUESTION, SNIPPETS]);
    return [hm.arrive(m, PAGE_A), hm.arrive(m, PAGE_B)].map((o) => ({ ...o }));
  };
  assert.deepEqual(run(), run());
});

test("huntSettled's cut is aperture's own, exactly: gap refuses, above refuses, below holds, placed holds past the median", () => {
  assert.equal(huntSettled(null), false);
  assert.equal(huntSettled({ gap: "x" }), false);
  assert.equal(huntSettled({ censored: "above" }), false);
  assert.equal(huntSettled({ censored: "below" }), true);
  assert.equal(huntSettled({ rank: 0.51 }), true);
  assert.equal(huntSettled({ rank: 0.5 }), false);
  assert.equal(huntSettled({ rank: 0.01 }), false, "the live topic-pivot case aperture measured — 99th percentile of surprise must not read as settled");
});
