// sameness.test.mjs — the definition, pinned: shared slots make a kind,
// shared slots AND shared values make one thing.

import { test } from "node:test";
import assert from "node:assert/strict";

import { readFileSync } from "node:fs";

import { kindOrSame, slotAgreement, valueAgreement } from "./sameness.js";

const rec = (id, pairs) => ({ id, attributes: pairs.map(([field_id, value]) => ({ field_id, value })) });

test("the case induceKinds called a kind of four is one thing, four times", () => {
  // Run live against the real organ: eight records shaped {P39, PA}×4 and
  // {P39, PB}×4 returned `members: [Q0,Q1,Q2,Q3], cohesion: 1`. Those four
  // agree on every slot AND every value.
  const four = [0, 1, 2, 3].map((i) => rec(`Q${i}`, [["P39", "S"], ["PA", "x"]]));
  const got = kindOrSame(four);
  assert.equal(got.verdict, "identity");
  assert.equal(got.slots, 1);
  assert.equal(got.values, 1);
  assert.match(got.reason, /one thing described more than once/);
});

test("shared slots with differing values IS a kind", () => {
  const holders = [
    rec("Q273546", [["P39", "Q11699"], ["term", "1861-1865"]]),
    rec("Q8612", [["P39", "Q11699"], ["term", "1865"]]),
  ];
  const got = kindOrSame(holders);
  assert.equal(got.verdict, "kind");
  assert.equal(got.slots, 1, "they fill exactly the same slots");
  assert.ok(got.values < 1, "and disagree on at least one value");
  assert.equal(got.values, 0.5, "they agree on the office, differ on the term");
});

test("nothing in common is unrelated, not a weak kind", () => {
  const got = kindOrSame([rec("A", [["P1", 1]]), rec("B", [["P2", 2]])]);
  assert.equal(got.verdict, "unrelated");
  assert.equal(got.slots, 0);
});

test("valueAgreement is null — never 0 — when no slot is shared", () => {
  // 0 would assert they disagree about something; they were never compared.
  assert.equal(valueAgreement(rec("A", [["P1", 1]]), rec("B", [["P2", 1]])), null);
  assert.equal(valueAgreement(rec("A", [["P1", 1]]), rec("B", [["P1", 2]])), 0);
  assert.equal(valueAgreement(rec("A", [["P1", 1]]), rec("B", [["P1", 1]])), 1);
});

test("slotAgreement is Jaccard over presence, blind to values by design", () => {
  assert.equal(slotAgreement(rec("A", [["P1", "x"]]), rec("B", [["P1", "y"]])), 1);
  assert.equal(slotAgreement(rec("A", [["P1", 1], ["P2", 1]]), rec("B", [["P1", 1]])), 0.5);
});

test("the real Lincoln witnesses are identity, and that is the honest read", () => {
  // Both point back via P39 and nothing else — same slot, same value. Two
  // records saying the same thing is not evidence of a kind of two.
  const witnesses = [rec("Q10853588", [["P39", "Q11699"]]), rec("Q28935729", [["P39", "Q11699"]])];
  const got = kindOrSame(witnesses);
  assert.equal(got.verdict, "identity");
});

test("fewer than two records is degenerate, never a verdict", () => {
  assert.equal(kindOrSame([]).verdict, "degenerate");
  assert.equal(kindOrSame([rec("A", [["P1", 1]])]).verdict, "degenerate");
  assert.equal(kindOrSame([{ id: "A", attributes: [] }, { id: "B" }]).verdict, "degenerate");
});

test("no threshold is written anywhere in this file", () => {
  // The verdicts fire only at exact poles; anything else is two reported
  // degrees. A cut here would be the hand-set constant P4/P9 refuses.
  const src = readFileSync("./sameness.js", "utf8");
  assert.doesNotMatch(src.replace(/^\s*\/\/.*$/gm, ""), /[<>]=?\s*0\.\d+/, "a comparison against a fractional cut is a threshold");
});
