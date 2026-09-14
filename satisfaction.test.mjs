// satisfaction.test.mjs — the COMPOSED satisfaction read: one verdict from
// four gates (Nāgārjuna's slot, Clippy's context, the figure-binding's
// truth, Aletheia's honesty), each disclosed, never blended.

import { test } from "node:test";
import assert from "node:assert/strict";
import { makeSatisfaction, GATES } from "./satisfaction.js";

const slotOf = (q) => ({ slot: "the thing", kind: "thing" });
const inContext = (a, q) => ({ verdict: "bound", act: "executed", born: ["b:king"], active: true });
const onGround = (a, g) => ({ verdict: "bound" });
const honestOf = (s) => /doesn'?t state|nothing/i.test(String(s ?? ""));

const S = makeSatisfaction({ slotOf, inContext, onGround, honestOf, groundFigures: [] });

test("a true, in-context, on-ground answer SATISFIES with all four gates disclosed", () => {
  const r = S.read("Who was the king?", "King Louis XVI was executed.");
  assert.equal(r.satisfied, true);
  assert.equal(r.disclosed.length, 4);
  assert.ok(r.disclosed.every((g) => g.ok));
});

test("a false figure (not on the ground) is UNSATISFIED at the figure gate, never blended away", () => {
  const S2 = makeSatisfaction({ slotOf, inContext, onGround: () => ({ verdict: "refused", reason: "new actor" }), honestOf });
  const r = S2.read("Who stormed it?", "The Prussian army did.");
  assert.equal(r.satisfied, false);
  const fig = r.disclosed.find((g) => g.at === "figure");
  assert.equal(fig.ok, false);
  assert.match(fig.note, /new actor/);
});

test("an honest decline SATISFIES, with the figure/context gates EXCUSED and disclosed, never hidden", () => {
  const r = S.read("How many died?", "The text doesn't state how many died.");
  assert.equal(r.satisfied, true);
  const ctx = r.disclosed.find((g) => g.at === "context");
  const fig = r.disclosed.find((g) => g.at === "figure");
  assert.equal(ctx.ok, true);
  assert.match(ctx.note, /excused/);
  assert.equal(fig.ok, true);
});

test("a missing slot is UNSATISFIED at the slot gate", () => {
  const S3 = makeSatisfaction({ slotOf: () => ({ slot: null }), inContext, onGround, honestOf });
  const r = S3.read("How many died?", "The text doesn't state how many died.");
  assert.equal(r.satisfied, false);
  assert.equal(r.disclosed.find((g) => g.at === "slot").ok, false);
});

test("an unjudgeable context organ is disclosed, never a silent pass", () => {
  const S4 = makeSatisfaction({ slotOf, inContext: () => null, onGround, honestOf });
  const r = S4.read("Who was the king?", "King Louis XVI was executed.");
  assert.equal(r.satisfied, false);
  assert.equal(r.disclosed.find((g) => g.at === "context").ok, false);
});