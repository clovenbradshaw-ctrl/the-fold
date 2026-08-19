// node --test arithmetic.test.mjs
//
// Conformance against the REAL mathjs — the injected engine, not a stub, so
// a version bump that changes parse or evaluate behavior fails here first.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as math from "mathjs";

import { checkArithmetic, claimedValue, detectArithmetic, normalizeArithmeticPhrase } from "./arithmetic.js";

test("normalizeArithmeticPhrase: English operator words become symbols, longest phrase first", () => {
  assert.equal(normalizeArithmeticPhrase("17 times 24"), "17 * 24");
  assert.equal(normalizeArithmeticPhrase("17 multiplied by 24"), "17 * 24");
  assert.equal(normalizeArithmeticPhrase("100 divided by 4"), "100 / 4");
  assert.equal(normalizeArithmeticPhrase("100 over 4"), "100 / 4");
  assert.equal(normalizeArithmeticPhrase("17 plus 24"), "17 + 24");
  assert.equal(normalizeArithmeticPhrase("17 added to 24"), "17 + 24");
  assert.equal(normalizeArithmeticPhrase("17 minus 24"), "17 - 24");
  assert.equal(normalizeArithmeticPhrase("square root of 144"), "sqrt(144)");
  assert.equal(normalizeArithmeticPhrase("12 squared"), "(12)^2");
  assert.equal(normalizeArithmeticPhrase("3 cubed"), "(3)^3");
  assert.equal(normalizeArithmeticPhrase("20% of 50"), "((50)*(20)/100)");
  assert.equal(normalizeArithmeticPhrase("20 percent of 50"), "((50)*(20)/100)");
});

test("normalizeArithmeticPhrase: order-reversing phrasing bails rather than guesses", () => {
  // "5 subtracted from 12" means 12 - 5, not 5 - 12 — a wrong mechanical
  // answer is worse than none, so this phrasing is refused outright.
  assert.equal(normalizeArithmeticPhrase("5 subtracted from 12"), null);
  assert.equal(normalizeArithmeticPhrase("3 less than 10"), null);
});

test("normalizeArithmeticPhrase: thousands separators are stripped only digit-to-digit", () => {
  assert.equal(normalizeArithmeticPhrase("1,000 plus 250"), "1000 + 250");
});

test("detectArithmetic: a pure numeric expression with an operator is found, with zero free symbols", () => {
  const found = detectArithmetic("What's 17 times 24?", { math });
  assert.ok(found);
  assert.equal(found.expression, "17 * 24");
});

test("detectArithmetic: a bare number is not arithmetic — no operator, nothing to check", () => {
  assert.equal(detectArithmetic("What is 42?", { math }), null);
});

test("detectArithmetic: a real question with a free symbol never reaches evaluation", () => {
  assert.equal(detectArithmetic("What year was Nashville founded?", { math }), null);
  assert.equal(detectArithmetic("What is x plus 2?", { math }), null);
  assert.equal(detectArithmetic("Is Broadway known for anything in particular?", { math }), null);
  assert.equal(detectArithmetic("What's the capital of Japan?", { math }), null);
});

test("detectArithmetic: order-reversing phrasing never reaches evaluation, even with digits present", () => {
  assert.equal(detectArithmetic("What is 5 subtracted from 12?", { math }), null);
});

test("checkArithmetic: the live measured failure — 17 times 24 is 408, not 372", () => {
  const out = checkArithmetic("What's 17 times 24?", { math });
  assert.ok(out);
  assert.equal(out.expression, "17 * 24");
  assert.equal(out.value, 408);
  assert.equal(out.display, "408");
});

test("checkArithmetic: tex is mathjs's own LaTeX rendering of the expression, not a hand-typed template", () => {
  const out = checkArithmetic("What's 17 times 24?", { math });
  assert.equal(out.tex, "17\\cdot24 = 408");
  assert.equal(checkArithmetic("square root of 144", { math }).tex, "\\sqrt{144} = 12");
});

test("checkArithmetic: percentage, square root, exponent — each against mathjs's own answer, not a hand-rolled one", () => {
  assert.equal(checkArithmetic("20 percent of 50", { math }).value, 10);
  assert.equal(checkArithmetic("square root of 144", { math }).value, 12);
  assert.equal(checkArithmetic("12 squared", { math }).value, 144);
});

test("checkArithmetic: a non-arithmetic question returns null, not a false zero", () => {
  assert.equal(checkArithmetic("Who founded the city?", { math }), null);
});

test("checkArithmetic: without an injected engine, a typed gap — never a silent miss", () => {
  const found = detectArithmetic("17 times 24", { math });
  assert.ok(found);
  const out = checkArithmetic("17 times 24", {});
  assert.ok(out.gap);
});

test("checkArithmetic: a function name is never mistaken for a strippable wrapper word", () => {
  // Measured live while building this module: the wrapper-strip once ate
  // the letters of "sqrt(144)" the same way it ate "what's " off a real
  // question, because both were just "a run of non-digit characters" to a
  // blind strip. The fix named an explicit wrapper whitelist; this pins it.
  assert.equal(checkArithmetic("square root of 144", { math }).value, 12);
  assert.equal(checkArithmetic("What is the square root of 81?", { math }).value, 9);
});

test("claimedValue: the LAST bare number in a draft is read as the answer, not the first operand", () => {
  assert.equal(claimedValue("17 times 24 is 408."), 408);
  assert.equal(claimedValue("372"), 372);
  assert.equal(claimedValue("no numbers here"), null);
});
