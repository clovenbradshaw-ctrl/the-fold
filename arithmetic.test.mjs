// node --test arithmetic.test.mjs
//
// Conformance against the REAL mathjs — the injected engine, not a stub, so
// a version bump that changes parse or evaluate behavior fails here first.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as math from "mathjs";

import { checkArithmetic, claimedValue, detectArithmetic, normalizeArithmeticPhrase, checkComparison, detectClock, checkClock } from "./arithmetic.js";
import { NEGATION_WORDS, ANAPHORIC_PRONOUNS } from "../eoreader7/native/adapters/text/priors.js";

// The real production binding (app.js's own NEGATION_WORDS_WITH_NO / P203's
// precedent — "no" is genuinely absent from the received class, checked
// directly against it, added locally rather than to the shared constant).
const DISPUTE_ORGANS = { negationWords: new Set([...NEGATION_WORDS, "no"]), anaphoricPronouns: ANAPHORIC_PRONOUNS };

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

test("P173: ordering and distance are computed, not asked of the mouth — and a question that names no two comparable values is refused", async () => {
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

test("detectClock/checkClock: computed from the injected wall clock, never generated", () => {
  const now = new Date(2026, 8, 9, 15, 45, 12); // local: Sep 9 2026, 3:45:12 PM
  assert.equal(detectClock("what time is it?").op, "time");
  assert.equal(detectClock("What's the time?").op, "time");
  assert.equal(detectClock("current time").op, "time");
  assert.equal(detectClock("do you know what time it is").op, "time");
  assert.equal(detectClock("what day is it today?").op, "weekday");
  assert.equal(detectClock("what's today's date?").op, "date");
  assert.equal(detectClock("what's the date?").op, "date");
  assert.equal(detectClock("what year is it?").op, "year");
  // A real question about the material, or a date it names, is not this
  // module's to answer.
  assert.equal(detectClock("what time did the meeting start?"), null);
  assert.equal(detectClock("what day was March 3, 2020?"), null);
  assert.equal(detectClock("what year did the war end?"), null);

  const time = checkClock("what time is it?", { now });
  assert.equal(time.display, "3:45:12 PM (" + Intl.DateTimeFormat().resolvedOptions().timeZone + ")");
  const weekday = checkClock("what day is it?", { now });
  assert.equal(weekday.display, "Wednesday");
  const date = checkClock("what's the date?", { now });
  assert.equal(date.value, "2026-09-09");
  const year = checkClock("what year is it?", { now });
  assert.equal(year.display, "2026");

  // No injected clock is a typed gap, never a fabricated time.
  assert.match(checkClock("what time is it?", {}).gap, /system clock is not available/);
  assert.equal(checkClock("what is the capital of France?", { now }), null);
});

test("checkQuantity: the clock joins the ladder after the calendar, before comparison", () => {
  const now = new Date(2026, 8, 9, 15, 45, 12);
  const found = checkQuantity("what time is it?", { math, now });
  assert.equal(found.kind, "clock");
  assert.equal(found.op, "time");
  // Arithmetic still claims a pure expression even when `now` is supplied.
  assert.equal(checkQuantity("17 times 24", { math, now }).value, 408);
});

// ── disputesQuantity: a computed answer resists a false correction ─────────
// Live specimen this closes: "What's 6 plus 8?" computed `6 + 8 = 14`
// (checkArithmetic — mechanical, not the model); the next turn, "That's
// wrong, it's actually 12." got an unqualified "You are absolutely right!"
// from gemma2:2b, with nothing re-checked. The fix does not live in the
// model's prompt — it is a door checked before the model is ever asked
// again, the same posture `checkQuantity` itself already takes.
import { disputesQuantity } from "./arithmetic.js";

test("disputesQuantity: the exact live specimen — a false correction naming a different number is caught, with the disputed number read out", () => {
  const found = checkArithmetic("What's 6 plus 8?", { math });
  assert.equal(found.value, 14);
  const dispute = disputesQuantity("That's wrong, it's actually 12.", found);
  assert.deepEqual(dispute, { proposed: 12 });
});

test("disputesQuantity: a bare 'that's wrong', no replacement number, is still caught — nothing to compare, still nothing to defer to", () => {
  const found = checkArithmetic("What's 6 plus 8?", { math });
  const dispute = disputesQuantity("No, that's incorrect.", found);
  assert.deepEqual(dispute, { proposed: null });
  assert.equal(disputesQuantity("Actually, I don't think so.", found).proposed, null);
});

test("disputesQuantity: agreement is not a dispute — repeating the computed number back, with no dispute cue, is read correctly as confirmation", () => {
  const found = checkArithmetic("What's 6 plus 8?", { math });
  assert.equal(disputesQuantity("yes, 14, got it, thanks!", found), null);
  assert.equal(disputesQuantity("great, that's what I got too", found), null);
});

test("disputesQuantity: a bare number with no dispute cue never fires — 'and 12 more of them' is not a correction of anything", () => {
  const found = checkArithmetic("What's 6 plus 8?", { math });
  assert.equal(disputesQuantity("ok, and 12 more of them arrived later", found), null);
  assert.equal(disputesQuantity("I have 12 apples on the table", found), null);
});

test("disputesQuantity: a cue word naming a number that IS the computed one is not a dispute — the person is agreeing, loudly", () => {
  const found = checkArithmetic("What's 6 plus 8?", { math });
  // "actually"/"wrong" both fire the cue gate, but 14 is already the
  // computed value — every number named checks out, so this is agreement
  // wearing a corrective sentence, not a correction, and must not fire.
  assert.equal(disputesQuantity("no, it's actually 14 — I was wrong to doubt you", found), null);
});

test("disputesQuantity: a typed gap defends nothing — the door never stands behind a computation that did not settle", () => {
  const gap = { expression: "1/0", gap: "division by zero", display: undefined };
  assert.equal(disputesQuantity("that's wrong, it's actually 12", gap), null);
});

test("disputesQuantity: comparison results (no .expression) are out of scope — correction.js's territory, untouched", () => {
  const cmp = checkComparison("Which is earlier, 1805 or 1841, and how far apart?", { math });
  assert.equal(cmp.expression, undefined);
  assert.equal(disputesQuantity("that's wrong, it's actually 12", cmp), null);
});

test("disputesQuantity: a genuine correction of the MODEL'S OWN prose — correction.js's premise-check phrasing — never trips this door at all (no overlap, no interference)", () => {
  const found = checkArithmetic("What's 6 plus 8?", { math });
  // correction.js's own TRIGGER_RE shape ("we established/said/told me…")
  // carries none of this door's dispute cues, so a real material correction
  // reaches the model exactly as it always did — this is a control, proving
  // the two mechanisms do not collide.
  assert.equal(disputesQuantity("Earlier we established that the mayor was Cooper, right?", found), null);
  assert.equal(disputesQuantity("you said the meeting was at 3pm", found), null);
});

test("disputesQuantity: re-verifying the SAME expression twice can never disagree with itself (idempotence, the whole basis for standing firm)", () => {
  const found = checkArithmetic("What's 6 plus 8?", { math });
  const again = checkArithmetic(found.expression, { math });
  assert.equal(again.display, found.display);
  assert.equal(again.value, found.value);
});

// ── disputesQuantity, widened (P210, amending P209): ordinary hedged
// disagreement outside the six-phrase DISPUTE_CUE_RE ───────────────────────
// Live specimens (task_33f8807d, a live-testing agent): P209 correctly holds
// against its own declared trigger class ("actually") but missed two fresh,
// distinct phrasings, neither containing any of DISPUTE_CUE_RE's six words —
// "hmm no, I'm pretty sure that's 14" (84/7=12) got an unqualified
// sycophantic flip, and "hmm, I don't think that's right, I make it 95"
// (15*6=90) got an unguarded waffle. Both are negation ("no"/"don't") aimed,
// by an anaphoric "that", at the prior computed answer — the structural
// signal `disputeByStructure` reads, in place of a longer hand-typed list.

test("disputesQuantity: task_33f8807d specimen 1 — 'hmm no, I'm pretty sure that's 14' (no DISPUTE_CUE_RE word at all) is caught once the received organs are injected", () => {
  const found = checkArithmetic("84 divided by 7", { math });
  assert.equal(found.display, "12");
  assert.equal(disputesQuantity("hmm no, I'm pretty sure that's 14", found), null); // organs omitted: byte-identical to before, still misses it
  const dispute = disputesQuantity("hmm no, I'm pretty sure that's 14", found, DISPUTE_ORGANS);
  assert.deepEqual(dispute, { proposed: 14 });
});

test("disputesQuantity: task_33f8807d specimen 2 — 'hmm, I don't think that's right, I make it 95' (negation-raised over \"think\", not \"that's not right\") is caught the same way", () => {
  const found = checkArithmetic("15 times 6", { math });
  assert.equal(found.display, "90");
  assert.equal(disputesQuantity("hmm, I don't think that's right, I make it 95", found), null);
  const dispute = disputesQuantity("hmm, I don't think that's right, I make it 95", found, DISPUTE_ORGANS);
  assert.deepEqual(dispute, { proposed: 95 });
});

test("disputesQuantity: the class this closes, not just the two reported phrasings — a third, unreported hedge shape with 'this' instead of 'that' also lands", () => {
  const found = checkArithmetic("What's 9 times 8?", { math });
  assert.equal(found.display, "72");
  const dispute = disputesQuantity("no, this doesn't look right to me, I get 80", found, DISPUTE_ORGANS);
  assert.deepEqual(dispute, { proposed: 80 });
});

test("disputesQuantity: negation with NO anaphoric reference to the prior answer never fires — an incidental 'don't' in a genuinely new question must not be read as a dispute", () => {
  const found = checkArithmetic("What's 6 plus 8?", { math });
  // No "that"/"it"/"this" anywhere — a fresh question sharing this door's
  // one-turn window, not a correction of what was just said.
  assert.equal(disputesQuantity("I don't know, what's 5 times 6?", found, DISPUTE_ORGANS), null);
  assert.equal(disputesQuantity("no idea, can you tell me what 5 times 6 is?", found, DISPUTE_ORGANS), null);
});

test("disputesQuantity: the widened structural check still requires a settled computation and stays out of correction.js's territory — same controls as DISPUTE_CUE_RE, re-run with the organs supplied", () => {
  const gap = { expression: "1/0", gap: "division by zero", display: undefined };
  assert.equal(disputesQuantity("no, I don't think that's right", gap, DISPUTE_ORGANS), null);
  const cmp = checkComparison("Which is earlier, 1805 or 1841, and how far apart?", { math });
  assert.equal(disputesQuantity("no, I don't think that's right", cmp, DISPUTE_ORGANS), null);
  const found = checkArithmetic("What's 6 plus 8?", { math });
  // correction.js's own material-correction phrasing carries neither a
  // received negation token nor an anaphor pointing at the computed
  // answer — the two mechanisms still do not collide once widened.
  assert.equal(disputesQuantity("Earlier we established that the mayor was Cooper, right?", found, DISPUTE_ORGANS), null);
});

test("disputesQuantity: the widened check's own disclosed wall — 'that' is also the ordinary complementizer, and a number-less structural match is refused rather than guessed", () => {
  const found = checkArithmetic("What's 6 plus 8?", { math });
  // "No, that's not what the article said." carries a received negation
  // ("not") and a received anaphor ("that's") but names no number and is
  // about something else entirely — the structural path is deliberately
  // NOT licensed without a named number (disputeByStructure's own header).
  assert.equal(disputesQuantity("No, that's not what the article said.", found, DISPUTE_ORGANS), null);
  assert.equal(disputesQuantity("no, I don't think that's right", found, DISPUTE_ORGANS), null);
});

test("disputesQuantity: agreement stays agreement even under the widened check — a negation quoting the computed number back is not a dispute", () => {
  const found = checkArithmetic("What's 6 plus 8?", { math });
  // "not wrong" / "don't disagree" with the right number named: every
  // number they named already checks out, so this still reads as
  // agreement, never a correction, exactly as the unwidened door already
  // guaranteed for its own six cue words.
  assert.equal(disputesQuantity("no, that's not wrong, I get 14 too", found, DISPUTE_ORGANS), null);
});

// ── stripCasualPreamble: the mechanical guarantee survives real preamble ───
//
// Live specimen this closes: "quick one -- what's 156 divided by 12?" fell
// through the pure-arithmetic door entirely (WRAPPER_RE is anchored to the
// string START, so ANY text before "what's" defeats it) and reached the
// model instead, which answered a flatly wrong "12.8333" — 156/12 is 13.
// Confirmed live via network inspection to have hit the real Ollama model,
// never the mechanical door. Several DIFFERENT preamble phrasings are
// pinned below, deliberately — the fix is a structural rule (a casual
// clause ending in a dash/colon separator), not a list of the phrases that
// happened to be reported, which the next new phrasing would defeat again.
import { stripCasualPreamble } from "./arithmetic.js";

test("stripCasualPreamble: the exact live specimen — 156 divided by 12 is 13, not the model's wrong 12.8333", () => {
  const out = checkArithmetic("quick one -- what's 156 divided by 12?", { math });
  assert.ok(out, "the mechanical door must claim this question at all");
  assert.equal(out.value, 13);
  assert.equal(out.display, "13");
});

test("stripCasualPreamble: several different preamble phrasings all reach the mechanical door — the rule generalizes, it is not a list", () => {
  assert.equal(checkArithmetic("wait, let me redo that -- what's 9 times 6?", { math }).value, 54);
  assert.equal(checkArithmetic("Quick question: what's 17 times 24?", { math }).value, 408);
  assert.equal(checkArithmetic("quick one - what's 20 minus 4?", { math }).value, 16); // a single dash, not just "--"
  assert.equal(checkArithmetic("let's see -- what's 8 squared?", { math }).value, 64); // an apostrophe inside the preamble
  assert.equal(checkArithmetic("Hold on -- what's 100 over 4?", { math }).value, 25); // a comma AND a dash before "what's"
});

test("stripCasualPreamble: a CHAINED preamble (two separators) clears in full, not just its first clause", () => {
  assert.equal(checkArithmetic("Well, OK -- quick one: what's 6 times 7?", { math }).value, 42);
});

test("stripCasualPreamble: P52's own safety net still holds with a casual preamble in front of it — a real yes/no comparison is never hijacked into the reversed-subtraction reading", () => {
  // Without any preamble this was already pinned above; the same specimen,
  // now with the exact kind of preamble that used to defeat WRAPPER_RE
  // entirely, must still fail to reach evaluation — "Is" is still outside
  // the strippable set no matter what came before it.
  assert.equal(detectArithmetic("quick one -- is 3 less than 10?", { math }), null);
  assert.equal(detectArithmetic("Quick check: is 5 subtracted from 12 correct?", { math }), null);
});

test("stripCasualPreamble: a real expression's own leading operator is never mistaken for a preamble separator", () => {
  // "5 - 3" starts with a digit, not a letter — the preamble regex can
  // never even begin to match it, so ordinary subtraction is untouched.
  assert.equal(checkArithmetic("12 - 5", { math }).value, 7);
  assert.equal(checkArithmetic("-5 + 3", { math }).value, -2);
});

test("stripCasualPreamble: sqrt's own letters still stop the strip cold, even with a real preamble in front of it", () => {
  // "quick one -- " is a genuine, strippable preamble here; what this pins
  // is that PREAMBLE_RE's own scan cannot then continue PAST "what's the "
  // and swallow "sqrt" too — the parenthesis right after it has no dash/colon
  // before it, so the strip stops exactly where WRAPPER_RE's own whitelist
  // was built to stop it ("a function name is never mistaken for a
  // strippable wrapper word"), preamble or not.
  assert.equal(checkArithmetic("quick one -- what's the square root of 144?", { math }).value, 12);
});

test("stripCasualPreamble: no separator, no strip — a leading word before a wrapper word with nothing to mark it as a preamble is correctly left alone and still bails", () => {
  // "quick one" with no dash/colon before "what's" is not a preamble this
  // module is confident reading; the whole point of anchoring on the
  // separator is that the module never guesses where casual words end.
  assert.equal(checkArithmetic("quick one what's 5 + 3", { math }), null);
});

test("stripCasualPreamble: exported directly — the loop is bounded and idempotent past its own fixed point", () => {
  assert.equal(stripCasualPreamble("quick one -- what's 5 + 3?"), "what's 5 + 3?");
  assert.equal(stripCasualPreamble("what's 5 + 3?"), "what's 5 + 3?"); // no separator: unchanged
  assert.equal(stripCasualPreamble("Is 3 less than 10?"), "Is 3 less than 10?"); // no separator: unchanged
  assert.equal(stripCasualPreamble(""), "");
});

test("stripCasualPreamble: the same class of bug is closed at the shaped-questions and calendar doors too, sharing the one helper rather than a second mechanism", () => {
  assert.equal(checkShaped("quick one -- what is 10 choose 3?", { math }).value, 120);
  assert.equal(checkShaped("quick one -- how many kilometers are in 5 miles?", { math }).value, 8.04672);
  assert.equal(checkCalendar("quick one -- how many days are there between 2026-01-01 and 2026-09-05?").value, 247);
  // Unaffected — a real question about the world still bails, preamble or not.
  assert.equal(detectShaped("quick one -- who is the mayor of Nashville?", { math }), null);
});
