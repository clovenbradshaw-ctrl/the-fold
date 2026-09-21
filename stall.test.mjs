import { test } from "node:test";
import assert from "node:assert";
import { isStalled, repeatedClaims, keyOf, WITHDRAWAL, operatorPath } from "./stall.js";

const prior = [
  { end1: "tsar", label: "replaced", end2: "barclay" },
  { end1: "lincoin", label: "appointed", end2: "hamlin" },
];

test("exact repeat is a stall", () => {
  const next = [{ end1: "tsar", label: "replaced", end2: "barclay" }];
  const r = isStalled(prior, next);
  assert.equal(r.stalled, true);
  assert.equal(r.repeats, 1);
});

test("paraphrased label (same lemma) is a stall when sameForm folds", () => {
  const sameForm = (a, b) => a === b || (a === "replaced" && b === "replace") || (a === "replaced" && b === "replacing");
  const next = [{ end1: "tsar", label: "replace", end2: "barclay" }];
  const r = isStalled(prior, next, { sameForm });
  assert.equal(r.stalled, true);
});

test("naive string match must NOT catch paraphrase (the II.23 control)", () => {
  // Without a sameForm organ the paraphrase must NOT be flagged — proves the
  // comparator is referent+form keyed, not string keyed.
  const next = [{ end1: "tsar", label: "replace", end2: "barclay" }];
  const r = isStalled(prior, next); // default sameForm = strict equality
  assert.equal(r.stalled, false);
});

test("same label but different object is NOT a stall", () => {
  const next = [{ end1: "tsar", label: "replaced", end2: "kutuzov" }];
  const r = isStalled(prior, next);
  assert.equal(r.stalled, false);
});

test("different subject, same rest, is NOT a stall", () => {
  const next = [{ end1: "boris", label: "replaced", end2: "barclay" }];
  const r = isStalled(prior, next);
  assert.equal(r.stalled, false);
});

test("framing-only turn (no substantive claim) never stalls", () => {
  const next = [{ end1: "", label: "", end2: "" }];
  const r = isStalled(prior, next);
  assert.equal(r.stalled, false);
});

test("WITHDRAWAL names the limit and hands control to the operator (SCOPE-01)", () => {
  assert.ok(WITHDRAWAL.includes("I can't help with this"));
  assert.ok(/you['\u2019]?re the operator/i.test(WITHDRAWAL), "hands control to the operator");
  assert.ok(!/reach a human agent|connect you to someone/i.test(WITHDRAWAL), "no fake handoff to a person who does not exist");
});

test("operatorPath hands control to the operator, never a fake handoff", () => {
  const p = operatorPath("the terminal");
  assert.ok(p.includes("the terminal"));
  assert.ok(p.includes("are the operator"));
  assert.ok(!/reach a human|recap/i.test(p), "no fake human path, no invented recap");
});

test("keyOf normalizes case and whitespace", () => {
  assert.equal(keyOf({ end1: " Tsar ", label: "Replaced", end2: " Barclay" }), keyOf({ end1: "tsar", label: "replaced", end2: "barclay" }));
});

test("normalize accepts legacy subject/verb/object names (P76 arrangement)", () => {
  assert.equal(keyOf({ subject: "tsar", verb: "replaced", object: "barclay" }), keyOf({ end1: "tsar", label: "replaced", end2: "barclay" }));
});