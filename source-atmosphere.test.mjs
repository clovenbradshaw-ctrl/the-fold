// source-atmosphere.test.mjs — chunk boundaries decided by a licensed
// noise/signal test, not a structural rule.
//
// chunkSource's default split (chunkProse) has always been a hardcoded
// blank-line regex — every paragraph break is treated as a passage
// boundary, whether or not it corresponds to any real shift in the
// material. This closes that gap the same way the rest of this repo closes
// every gap of this shape: search for the organ before hand-rolling one.
// packages/host/terrains.js already reuses loops/atmosphere.js's
// readAtmosphere to find real topic/scene regime boundaries across a
// document's own chunks, built on nul/index.js's licensed ground/
// difference/isGap apparatus — a boundary is only real when the
// accumulated ground actually FAILS a declared, null-corrected test.
// atmosphereBoundaries (source.js) reuses that SAME organ, one register
// down: chunkProse's blank-line split becomes the CANDIDATE set, and only
// the candidates atmosphere finds real become the final chunk boundaries.
//
// Declared numbers, reused rather than re-derived: window=5, draws=256,
// tolerance=3, hop=5 — packages/host/terrains.js's own ATMOSPHERE_REGIME,
// unchanged. hop=5 (=window) per this repo's own "Atmosphere runs at
// hop = window" finding (loops/reading-regime.js's calibration: 55-90%
// false alarms at stride 1 vs 0-3% at window).

import { test } from "node:test";
import assert from "node:assert/strict";

import { chunkSource, atmosphereBoundaries } from "./source.js";

const ENGINE = new URL("../eoreader7/legacy-eoreader6.1/packages/engine/", import.meta.url);

async function organs() {
  const { causalSurprisalSeries } = await import(new URL("perceiver/text/material.js", ENGINE));
  const { readAtmosphere } = await import(new URL("loops/atmosphere.js", ENGINE));
  return { causalSurprisalSeries, readAtmosphere, regime: REGIME };
}

const REGIME = { window: 5, draws: 256, tolerance: 3, hop: 5 };

// A deterministic two-topic fixture — no Math.random, no external corpus
// file (eval/corpus/ is gitignored and must not be a test dependency).
// Each topic's own closed vocabulary is rotated per paragraph so the
// surprisal series carries real, repeatable variation rather than
// identical text (which would carry no signal at all).
function rotatingParas(words, n, seedOffset) {
  const paras = [];
  for (let i = 0; i < n; i++) {
    const rot = (i + seedOffset) % words.length;
    const rotated = [...words.slice(rot), ...words.slice(0, rot)];
    paras.push(rotated.slice(0, 12).join(" ") + ".");
  }
  return paras;
}
const TOPIC_A = "harbor traffic spring vessel dock crane cargo tide wharf sailor rope anchor".split(" ");
const TOPIC_B = "volcanic soil crop yield ash mineral farmer terrace irrigation seed harvest furrow".split(" ");
const TWO_TOPIC_TEXT = [...rotatingParas(TOPIC_A, 60, 0), ...rotatingParas(TOPIC_B, 60, 3)].join("\n\n");
const ONE_TOPIC_TEXT = rotatingParas(TOPIC_A, 60, 0).join("\n\n");

function shortText(n) {
  const paras = [];
  for (let i = 0; i < n; i++) paras.push(`This is paragraph number ${i}, containing enough words to clear the twenty character floor easily.`);
  return paras.join("\n\n");
}

test("chunkSource with no `atmosphere` option is byte-identical to before this seam existed", () => {
  const withoutKey = chunkSource("x.txt", TWO_TOPIC_TEXT);
  const withEmptyOpts = chunkSource("x.txt", TWO_TOPIC_TEXT, {});
  assert.deepEqual(withEmptyOpts, withoutKey, "an omitted `atmosphere` option must change nothing about the default split");
});

test("insufficient material (well under the 10*window ground floor) falls back to the ordinary blank-line split, byte-identical", async () => {
  const small = shortText(8);
  const plain = chunkSource("small.txt", small);
  const withAtmosphere = chunkSource("small.txt", small, { atmosphere: await organs() });
  assert.equal(plain.length, 8, "sanity: 8 real paragraphs split normally");
  assert.deepEqual(withAtmosphere, plain, "8 candidates is far under MIN_GROUND(5)=50 — readAtmosphere never builds a ground, and the fallback must be byte-identical to the default split, not a silent merge-everything");
});

test("readAtmosphere's own 'one region, ground never built' result is NOT mistaken for a real merge-everything finding", async () => {
  // The exact live bug this file's own header would otherwise re-introduce:
  // with too little material, readAtmosphere returns ONE region spanning
  // everything with apertureOpen/apertureClose/opened all null (not a typed
  // gap) — treating that as a genuine finding would silently collapse 8
  // separate paragraphs into a single chunk on zero actual evidence.
  const bounds = await atmosphereBoundaries("small.txt", shortText(8), 0, await organs());
  assert.equal(bounds, null, "no region here was ever judged against a built ground — this must decline (null), not return a spanning boundary");
});

test("a real topic shift is found as a real regime boundary — two topics, one boundary between them", async () => {
  const bounds = await atmosphereBoundaries("mix.txt", TWO_TOPIC_TEXT, 0, await organs());
  assert.ok(bounds, "120 paragraphs clears the ground floor many times over — this must not decline");
  assert.equal(bounds.length, 2, `expected exactly 2 real regime regions (one per topic), got: ${JSON.stringify(bounds)}`);
  // The boundary must fall somewhere in topic A's own territory, allowing
  // for the detector's real, by-design lag: readAtmosphere concedes only
  // after `tolerance` (3) CONSECUTIVE clearings accumulate, each itself
  // compared against a `window`-wide (5) forward observation — so a found
  // boundary trailing the true seam by several paragraphs is the detector
  // working correctly, not imprecision. What would be wrong is the
  // boundary landing absurdly early (before topic A has said anything) or
  // deep into topic B's own territory (missing the shift almost entirely).
  const topicABytes = rotatingParas(TOPIC_A, 60, 0).join("\n\n").length;
  assert.ok(
    bounds[0].end > topicABytes * 0.5 && bounds[0].end < TWO_TOPIC_TEXT.length * 0.75,
    `the found boundary (${bounds[0].end}) should land in topic A's territory with reasonable detection lag, not before it meaningfully started (${topicABytes * 0.5}) or deep into topic B (${TWO_TOPIC_TEXT.length * 0.75})`,
  );
});

test("a genuinely single-topic document is read as ONE real region, not declined and not artificially split", async () => {
  const bounds = await atmosphereBoundaries("single.txt", ONE_TOPIC_TEXT, 0, await organs());
  assert.ok(bounds, "60 coherent paragraphs clears the ground floor — this must not decline");
  assert.equal(bounds.length, 1, `a document that never re-zeros must read as one region, got: ${JSON.stringify(bounds)}`);
});

test("chunkSource end to end: a real topic shift collapses far below the raw blank-line paragraph count", async () => {
  const plain = chunkSource("mix.txt", TWO_TOPIC_TEXT);
  const withAtmosphere = chunkSource("mix.txt", TWO_TOPIC_TEXT, { atmosphere: await organs() });
  assert.equal(plain.length, 120, "sanity: 120 raw paragraphs");
  assert.ok(
    withAtmosphere.length < plain.length,
    `atmosphere-filtered chunking must produce fewer, larger passages than the raw blank-line split on real regime-coherent material: got ${withAtmosphere.length} vs ${plain.length}`,
  );
  // Every produced chunk still carries a self-verifying byte address
  // (P5.2) — the SAME discipline every other chunker in this repo is held
  // to, not relaxed because the boundary came from a statistical test.
  for (const c of withAtmosphere) {
    assert.equal(TWO_TOPIC_TEXT.slice(c.start, c.end).trim(), c.text, `chunk ref ${c.ref} must read back exactly the bytes its own address names`);
  }
});

test("atmosphereBoundaries declines (null) when the organ bundle is incomplete", async () => {
  assert.equal(await atmosphereBoundaries("x.txt", TWO_TOPIC_TEXT, 0, {}), null);
  assert.equal(await atmosphereBoundaries("x.txt", TWO_TOPIC_TEXT, 0, { causalSurprisalSeries: () => [] }), null, "readAtmosphere missing");
  const { causalSurprisalSeries, readAtmosphere } = await organs();
  assert.equal(
    await atmosphereBoundaries("x.txt", TWO_TOPIC_TEXT, 0, { causalSurprisalSeries, readAtmosphere }),
    null,
    "regime (window/draws/tolerance/hop) is declared, never defaulted — omitted, this organ must refuse rather than invent numbers",
  );
});

test("atmosphereBoundaries declines (null) on fewer than 2 candidate paragraphs — nothing to test", async () => {
  assert.equal(await atmosphereBoundaries("x.txt", "One paragraph only, no blank-line break anywhere in it at all.", 0, await organs()), null);
});
