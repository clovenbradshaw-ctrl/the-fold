// node --test arithmetic.test.mjs
//
// Conformance against the REAL mathjs — the injected engine, not a stub, so
// a version bump that changes parse or evaluate behavior fails here first.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as math from "mathjs";

import { checkArithmetic, claimedValue, detectArithmetic, normalizeArithmeticPhrase, checkComparison } from "./arithmetic.js";

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

test("normalizeArithmeticPhrase: order-reversing phrasing reads with the operands in the order the phrase means", () => {
  // "5 subtracted from 12" means 12 - 5, not 5 - 12 — each of these three
  // has exactly one standard reading (arithmetic.js's own header explains
  // why "divided into", just below, is treated differently).
  assert.equal(normalizeArithmeticPhrase("5 subtracted from 12"), "((12)-(5))");
  assert.equal(normalizeArithmeticPhrase("3 less than 10"), "((10)-(3))");
  assert.equal(normalizeArithmeticPhrase("3 fewer than 10"), "((10)-(3))");
});

test("normalizeArithmeticPhrase: \"divided into\" still bails — real usage splits on which side is the divisor", () => {
  assert.equal(normalizeArithmeticPhrase("5 divided into 20"), null);
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

test("detectArithmetic: order-reversing phrasing is found and reads with the operands reversed", () => {
  const found = detectArithmetic("What is 5 subtracted from 12?", { math });
  assert.ok(found);
  assert.equal(found.expression, "((12)-(5))");
});

test("detectArithmetic: \"divided into\" still never reaches evaluation, even with digits present", () => {
  assert.equal(detectArithmetic("What is 5 divided into 20?", { math }), null);
});

test("detectArithmetic: a genuine yes/no comparison is never read as the arithmetic reversal", () => {
  // "Is 3 less than 10?" asks a question, not for 10 − 3 — safe not
  // because "less than" is excluded (it isn't, above) but because "Is"
  // sits outside WRAPPER_RE's stripped set: it survives normalization as
  // a stray word and fails PURE_EXPRESSION_RE regardless of what the
  // reversal computes underneath it.
  assert.equal(detectArithmetic("Is 3 less than 10?", { math }), null);
  assert.equal(detectArithmetic("Is 5 subtracted from 12 correct?", { math }), null);
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

test("checkArithmetic: order-reversing phrasing computes against mathjs's own answer, operands in the order the phrase means", () => {
  assert.equal(checkArithmetic("5 subtracted from 12", { math }).value, 7);
  assert.equal(checkArithmetic("3 less than 10", { math }).value, 7);
  assert.equal(checkArithmetic("3 fewer than 10", { math }).value, 7);
  assert.equal(checkArithmetic("5 divided into 20", { math }), null);
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

// ── the shaped questions and the calendar (added 2026-09-05) ────────────────
import { checkShaped, checkCalendar, checkQuantity, detectShaped, readDate } from "./arithmetic.js";

test("shaped: unit conversion is the engine's own unit arithmetic, spelled the engine's way", () => {
  const r = checkShaped("Convert 5 miles to km", { math });
  assert.equal(r.kind, "units");
  assert.equal(r.value, 8.04672);
  assert.equal(checkShaped("How many kilometers are in 5 miles?", { math }).value, 8.04672);
  assert.equal(Math.round(checkShaped("What is 72 fahrenheit in celsius?", { math }).value * 100) / 100, 22.22);
});

test("shaped: choose, factorial, statistics, derivative-at, linear and quadratic equations", () => {
  assert.equal(checkShaped("What is 10 choose 3?", { math }).value, 120);
  assert.equal(checkShaped("What is 12 factorial?", { math }).value, 479001600);
  assert.equal(checkShaped("What is the median of 3, 9, 1, 7, 5?", { math }).value, 5);
  assert.equal(checkShaped("mean of 2, 4, 9", { math }).value, 5);
  assert.equal(Math.round(checkShaped("standard deviation of 2, 4, 4, 4, 5, 5, 7, 9", { math }).value * 1000) / 1000, 2.138);
  assert.equal(checkShaped("What is the derivative of x^3 + 2x at x = 2?", { math }).value, 14);
  assert.equal(checkShaped("Solve 3x + 5 = 20", { math }).value, 5);
  assert.deepEqual(checkShaped("solve x^2 - 5x + 6 = 0", { math }).value, [2, 3]);
});

test("shaped: a question about the world, and a pure expression, are never this door's", () => {
  assert.equal(detectShaped("Who is the mayor of Nashville?", { math }), null);
  assert.equal(detectShaped("What is 17 times 24?", { math }), null);
  assert.equal(checkShaped("Solve x + y = 3", { math }), null); // two unknowns
});

test("calendar: days between, weekday, offset; an impossible date is null, a relative date bails", () => {
  assert.equal(checkCalendar("How many days are there between 2026-01-01 and 2026-09-05?").value, 247);
  assert.equal(checkCalendar("How many days between January 1, 2026 and September 5, 2026 inclusive?").value, 248);
  assert.equal(checkCalendar("What day of the week was July 4, 1776?").value, "Thursday");
  assert.equal(checkCalendar("What day of the week is 2026-09-05?").value, "Saturday");
  assert.equal(checkCalendar("What date is 100 days after 2026-09-05?").value, "2026-12-14");
  assert.equal(readDate("2026-02-30"), null);
  assert.equal(checkCalendar("What day is next Tuesday?"), null);
});

test("checkQuantity: the pure door first, byte-identical, then the shapes, then the calendar", () => {
  assert.equal(checkQuantity("What is 17 times 24?", { math }).value, 408);
  assert.equal(checkQuantity("What is 10 choose 3?", { math }).value, 120);
  assert.equal(checkQuantity("What day of the week is 2026-09-05?", { math }).value, "Saturday");
  assert.equal(checkQuantity("Who founded the observatory?", { math }), null);
});

test("P129: ordering and distance are computed, not asked of the mouth — and a question that names no two comparable values is refused", async () => {
  const math = await import("mathjs");
  // The exact probe shapes the long-stream run got right zero times out of ten.
  const years = checkComparison("Which of the two years mentioned is earlier, 1841 or 1996, and how many years apart are they? Give the number.", { math });
  assert.equal(years.first, 1841); assert.equal(years.difference, 155); assert.equal(years.unit, "years");
  assert.match(years.sentence, /Of the two, 1841 is the one asked for \(1841 is the smaller, 1996 the larger\)\. The difference between them is 155 years\./);
  const counts = checkComparison("Which is larger, 740 or 463, and by exactly how much? Give the number.", { math });
  assert.equal(counts.first, 740); assert.equal(counts.difference, 277); assert.equal(counts.unit, null);
  // "later" picks the other end; distance alone needs no ordering word.
  assert.equal(checkComparison("Which of these years is later, 1841 or 1996?", { math }).first, 1996);
  assert.equal(checkComparison("How many years apart are 1841 and 1996?", { math }).first, null);
  assert.equal(checkComparison("How many years apart are 1841 and 1996?", { math }).difference, 155);
  // Refused: not a comparison, only one value, or too many to be a two-way ask.
  assert.equal(checkComparison("What does the file say about Ada Rowe?", { math }), null);
  assert.equal(checkComparison("Which is larger, the harbor or the light?", { math }), null);
  assert.equal(checkComparison("Which year is earlier, 1841?", { math }), null);
  assert.equal(checkComparison("Which of these is bigger: 3, 7, 11, 19, 23, 40?", { math }), null, "an ambiguous ask is refused, never guessed at");
  // THE ASK IS THE PERSON'S WORDS, NOT THE MATERIAL THEY QUOTE (2026-09-06):
  // a memory question quoting a comparison is not making one. Seven such
  // probes in a live run would otherwise have been answered with a subtraction.
  assert.equal(checkComparison('Earlier in this conversation I asked you: "Which of these years is earlier, 1805 or 1841, and how far apart?" What did you answer then?', { math }), null);
  assert.equal(checkComparison('Earlier I asked: "one passage reads <note>20 ... RP</note> ... 4 ..." What did you answer? Repeat the numbers you gave.', { math }), null);
  // Nested quoting — a memory probe quoting a memory probe quoting a
  // comparison — must not leak the inner ask back out (two such survived the
  // first fix in a live run).
  assert.equal(checkComparison('Earlier I asked you: "Earlier I asked you: "According to Luke.xml: "<note>20 x RP</note>" According to react-dom.js: "Android 4." Which is larger, 20 or 4, and by how much?"" What did you answer then?', { math }), null);
  // A real comparison that quotes its sources still fires — the values may be
  // inside the quotes, only the ASK must be outside them.
  const cited = checkComparison('According to a.txt: "the war began in 1805." According to b.txt: "the light was built in 1841." Which of the two years is earlier, and how many years apart are they?', { math });
  assert.equal(cited.first, 1805); assert.equal(cited.difference, 36);
  // No engine is a typed gap, never a hand-rolled subtraction.
  assert.match(checkComparison("Which is earlier, 1841 or 1996?", {}).gap, /engine is not available/);
});
