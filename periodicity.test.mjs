// periodicity.test.mjs — an arrangement found without being told what its
// lines look like, against the REAL saved page and its own prose.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { signature, alike, meanAtLag, periodOf } from "./periodicity.js";

const PAGE = new URL("./web/pages/31a113281ca5cffa.txt", import.meta.url);
const have = existsSync(PAGE);
const linesOf = () => readFileSync(PAGE, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);

test("a signature is characters by class, with runs collapsed — no vocabulary", () => {
  assert.equal(signature("Sir Robert Peel"), "Aa Aa Aa");
  assert.equal(signature("20 June 1837 – 30 August 1841"), "9 Aa 9 . 9 Aa 9");
  // The same shapes arise in any script with the same Unicode categories.
  assert.equal(signature("Πέτρος Παύλος"), signature("Robert Peel"));
});

test("similarity separates a name line from a date line, and joins names of different lengths", () => {
  const name = signature("Sir Robert Peel");
  const longer = signature("William Lamb The Viscount Melbourne");
  const date = signature("20 June 1837 – 30 August 1841");
  assert.equal(alike(name, longer), 1, "same kind of line, different length");
  assert.ok(alike(name, date) < 1);
});

test("a run of ONE repeated shape has no period — the statistic refuses it by construction", () => {
  const flat = Array.from({ length: 20 }, () => "Aa Aa Aa");
  const got = periodOf(flat);
  assert.ok(!got || got.lift <= 0, `a constant run cannot be arranged: ${JSON.stringify(got)}`);
});

test("too few lines is null, never a guess", () => {
  assert.equal(periodOf(["Aa", "9"]), null);
});

test("THE NULL DESTROYS ORDER AND NOTHING ELSE", { skip: !have }, () => {
  const lines = linesOf();
  const sigs = lines.map(signature);
  const at = lines.findIndex((l) => /^William Lamb The Viscount/.test(l));
  const block = sigs.slice(at, at + 20);

  const real = periodOf(block, { draws: 400 });
  assert.equal(real.period, 2, "a name line and an extent line, alternating");
  assert.ok(real.z > 3, `expected a strong z, got ${real.z}`);
  assert.ok(real.beatenBy <= 5, `the null should rarely reach it, got ${real.beatenBy}/${real.draws}`);

  // Shuffle the SAME lines and the period dies. Same shapes, same counts, same
  // vocabulary — only the arrangement is gone, which is the whole claim.
  const scrambled = block.slice().sort((a, b) => (a < b ? -1 : 1));
  const dead = periodOf(scrambled, { draws: 400 });
  assert.ok(!dead || dead.z < real.z, "sorted-away order must not score like the real arrangement");
});

test("PROSE ON THE SAME PAGE does not read as an arrangement", { skip: !have }, () => {
  const lines = linesOf();
  const sigs = lines.map(signature);
  const prose = lines.findIndex((l) => /^From Wikipedia/.test(l));
  const got = periodOf(sigs.slice(prose, prose + 20), { draws: 400 });
  // Measured: real blocks land z 3.5-4.0 and 3/400; this prose lands z 0.96
  // and 62/400. Pinned as the separation the induction rests on.
  assert.ok(!got || got.z < 2, `prose must not look arranged, got z=${got?.z}`);
  assert.ok(!got || got.beatenBy > 20, `and the null must reach it often, got ${got?.beatenBy}`);
});

test("no threshold lives in the module — it reports the null and refuses to judge", () => {
  const sigs = ["Aa Aa", "9 . 9", "Aa Aa Aa", "9 . 9", "Aa Aa", "9 . 9", "Aa Aa Aa Aa", "9 . 9"];
  const got = periodOf(sigs, { draws: 100 });
  for (const k of ["beatenBy", "draws", "z", "censored", "nullMean"]) assert.ok(k in got, `missing ${k}`);
  assert.equal(typeof got.censored, "boolean");
  assert.ok(!("verdict" in got) && !("admitted" in got), "the caller declares what it admits, not this module");
});
