// kairos.test.mjs — the Pattern watcher's walls pinned (register decision,
// the third of the triad: huginn thought · muninn memory · kairos the
// difference that makes a difference). Against the REAL aperture organs —
// and through them the REAL emergence/tiers.js surprise stack — not a
// restated table.

import test from "node:test";
import assert from "node:assert/strict";

import { SIGN, arrivalPattern, kairosSign, kairosCorrespond, kairosDecision } from "./kairos.js";
import { makeApertureMeter, exchangeHeldGround, exchangeSurprise } from "./aperture.js";
import { huntSettled } from "./metacognition.js";

import {
  createTierStack,
  foldThrough,
} from "../eoreader7/legacy-eoreader6.1/packages/engine/emergence/tiers.js";

const meterOrgans = makeApertureMeter({ createTierStack, foldThrough });

const held = (rank) => ({ seq: 0, turn: 1, role: "question", rank, censored: null, gap: null });
const moved = (rank) => ({ seq: 0, turn: 1, role: "answer", rank, censored: null, gap: null });
const shifted = () => ({ seq: 0, turn: 1, role: "answer", rank: null, censored: "above", gap: null });
const settled = () => ({ seq: 0, turn: 1, role: "answer", rank: null, censored: "below", gap: null });
const unmeasured = () => ({ seq: 0, turn: 1, role: "question", rank: null, censored: null, gap: "empty_arrival — nothing tokenizable arrived" });

// ── the sign is three-valued and closed ───────────────────────────────────

test("SIGN is exactly pattern / noise / gap", () => {
  assert.deepEqual(Object.keys(SIGN).sort(), ["GAP", "NOISE", "PATTERN"]);
});

test("arrivalPattern: the cut is the null's own median — rank > 0.5 holds, rank <= 0.5 moves", () => {
  assert.equal(arrivalPattern(held(0.9)).sign, SIGN.NOISE);
  assert.equal(arrivalPattern(held(0.51)).sign, SIGN.NOISE);
  assert.equal(arrivalPattern(moved(0.5)).sign, SIGN.PATTERN);
  assert.equal(arrivalPattern(moved(0.01)).sign, SIGN.PATTERN);
});

test("arrivalPattern: censored readings read their own field; a gap is never a verdict", () => {
  assert.equal(arrivalPattern(shifted()).sign, SIGN.PATTERN);
  assert.equal(arrivalPattern(settled()).sign, SIGN.NOISE);
  assert.equal(arrivalPattern(unmeasured()).sign, SIGN.GAP);
  assert.equal(arrivalPattern(null).sign, SIGN.GAP);
});

test("kairosSign: one pattern arrival makes the exchange a pattern; a gap anywhere refuses the whole exchange", () => {
  assert.equal(kairosSign([held(0.9), moved(0.01)]).sign, SIGN.PATTERN, "the pivot's half moves the exchange");
  assert.equal(kairosSign([held(0.9), unmeasured()]).sign, SIGN.GAP, "a gap refuses the whole exchange — withheld, never 'held'");
  assert.equal(kairosSign([held(0.9), settled()]).sign, SIGN.NOISE);
  assert.equal(kairosSign([]).sign, SIGN.GAP);
});

// ── the walls, pinned against the REAL organs ─────────────────────────────

test("kairosSign agrees with the real aperture organs: held exchanges read noise, surprises read pattern", () => {
  const heldEx = [held(0.9), settled()];
  assert.equal(exchangeHeldGround(heldEx), true, "the real gate says the ground held");
  assert.equal(kairosSign(heldEx).sign, SIGN.NOISE);
  const surpriseEx = [held(0.9), shifted()];
  assert.equal(exchangeSurprise(surpriseEx), 1, "the real surprise reading is at the ceiling");
  assert.equal(kairosSign(surpriseEx).sign, SIGN.PATTERN);
});

test("kairosSign and huntSettled agree per arrival: a settled arrival is noise, never a difference", () => {
  for (const o of [held(0.9), held(0.6), settled()]) assert.equal(huntSettled(o), true, "the hunt's own settle rule");
  for (const o of [held(0.9), held(0.6), settled()]) assert.equal(arrivalPattern(o).sign, SIGN.NOISE);
  for (const o of [moved(0.3), moved(0.01), shifted()]) assert.equal(huntSettled(o), false, "the hunt keeps going on these");
  for (const o of [moved(0.3), moved(0.01), shifted()]) assert.equal(arrivalPattern(o).sign, SIGN.PATTERN);
});

test("through the REAL tier stack: a repeat holds the ground (noise), a genuine pivot moves it (pattern)", () => {
  const meter = meterOrgans.create();
  const warm = "the morning meeting covered the quarterly budget and the hiring plan and we decided to extend the deadline";
  for (const [turn, role, text] of [
    [1, "question", warm],
    [1, "answer", warm],
    [2, "question", `${warm} again for a second look`],
    [2, "answer", warm],
  ]) meterOrgans.observe(meter, { turn, role, text });
  // a genuine repeat of the established ground
  const rq = meterOrgans.observe(meter, { turn: 3, role: "question", text: warm });
  const ra = meterOrgans.observe(meter, { turn: 3, role: "answer", text: warm });
  assert.equal(kairosSign([rq, ra]).sign, SIGN.NOISE, "a repeat's KL sits inside the null's support — the measured lesson");
  // a genuinely foreign topic
  const pq = meterOrgans.observe(meter, { turn: 4, role: "question", text: "now, completely separately, the chemistry of volcanic soil in iceland" });
  const pa = meterOrgans.observe(meter, { turn: 4, role: "answer", text: "now, completely separately, the chemistry of volcanic soil in iceland" });
  assert.equal(kairosSign([pq, pa]).sign, SIGN.PATTERN, "a genuine pivot crosses the null's median — a difference that makes a difference");
});

// ── the address axis: correspond acts read as difference or none ──────────

test("kairosCorrespond: agree and ground-only are no difference; repaired, ground-shifted and apart are real ones", () => {
  assert.equal(kairosCorrespond({ kind: "agree", at: "s#1-2" }).sign, SIGN.NOISE);
  assert.equal(kairosCorrespond({ kind: "ground-only" }).sign, SIGN.NOISE);
  assert.equal(kairosCorrespond({ kind: "repaired", at: "s#4-5" }).sign, SIGN.PATTERN);
  assert.equal(kairosCorrespond({ kind: "ground-shifted", at: "s#4-5" }).sign, SIGN.PATTERN);
  assert.equal(kairosCorrespond({ kind: "apart" }).sign, SIGN.PATTERN);
});

test("kairosCorrespond tells moved from gone: an apart act whose ground is gone says so", () => {
  const r = kairosCorrespond({ kind: "apart", ground: { kind: "gone", was: "s#1-2" } });
  assert.equal(r.sign, SIGN.PATTERN);
  assert.match(r.reason, /gone/);
});

test("kairosCorrespond: an act that was never read is a gap, never a difference", () => {
  assert.equal(kairosCorrespond(null).sign, SIGN.GAP);
  assert.equal(kairosCorrespond({ kind: "??" }).sign, SIGN.GAP);
});

// ── the record line ───────────────────────────────────────────────────────

test("kairosDecision lands the sign and its reason, and never a metric", () => {
  const d = kairosDecision({ act: "sign", turn: 7, role: "answer", sign: SIGN.PATTERN, reason: "unsettled", axis: "attention" });
  assert.equal(d.act, "kairos-sign");
  assert.equal(d.sign, SIGN.PATTERN);
  assert.equal(d.reason, "unsettled");
  assert.equal(d.turn, 7);
  // the wall: the decision line is a typed verdict, never a number rendered
  for (const k of Object.keys(d)) assert.ok(!/(bits|rank|censored|surprise|entropy)/.test(k), `no metric field in the record line (${k})`);
});