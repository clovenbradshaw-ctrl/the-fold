import test from "node:test";
import assert from "node:assert/strict";
import { budgetsFor, depthLine, DEPTH_MAX, DEPTH_NAMES } from "./depth.js";

const base = { corrections: 1, witnessAsks: 6, pieceWitnessAsks: 24, snipRounds: 1, revisionRounds: 2, revisionAsks: 12, continuations: 1, hunts: 1, linkChecks: 2 };
const KEYS = Object.keys(base);

test("depth 1 is the base itself — the plain rung spends exactly today's declared budgets", () => {
  const b = budgetsFor(1, base);
  for (const k of KEYS) assert.equal(b[k], base[k], k);
  assert.equal(b.name, "plain");
});

test("every budget is non-decreasing up the slider; 0 spends nothing on recursion; asks double per rung, rounds add one", () => {
  const rungs = [0, 1, 2, 3].map((d) => budgetsFor(d, base));
  for (const k of KEYS) for (let i = 1; i < rungs.length; i++) assert.ok(rungs[i][k] >= rungs[i - 1][k], `${k} at ${i}`);
  for (const k of KEYS) assert.equal(rungs[0][k], 0, k);
  assert.equal(rungs[2].witnessAsks, 12); assert.equal(rungs[3].witnessAsks, 24);
  assert.equal(rungs[2].snipRounds, 2); assert.equal(rungs[3].revisionRounds, 4);
  assert.equal(budgetsFor(9, base).level, DEPTH_MAX, "clamped above"); assert.equal(budgetsFor(-2, base).level, 0, "clamped below");
  assert.equal(budgetsFor("2.7", base).level, 2, "floored"); assert.equal(budgetsFor(undefined, base).level, 1, "absent → plain");
  assert.deepEqual(DEPTH_NAMES.length, DEPTH_MAX + 1);
});

test("the legend says what is done more, in plain words, with the rung's own numbers", () => {
  assert.match(depthLine(budgetsFor(2, base), { piece: true }), /^Thinking depth 2 of 3 \(careful\): each section is read against its sources and rewritten up to 2 times/);
  assert.match(depthLine(budgetsFor(3, base)), /corrected up to 3 times; up to 24 sentences are put to the witness \(each ask up to two model calls\); up to 8 cited links are opened/);
  assert.match(depthLine(budgetsFor(0, base)), /depth 0 of 3 \(quick\)/);
  assert.doesNotMatch(depthLine(budgetsFor(2, base)), /SEG|EVA|REC|cube|organ/, "canon stays backstage");
});

// The Bug-2 investigation's own finding (POLICIES.md P213): a "budget of N
// asks" is really up to 2N model calls, and that was nowhere disclosed to a
// reader of the depth legend before this. Pinned so the disclosure survives
// future wording passes over this file.
test("the legend discloses the witness tier's own up-to-two-calls-per-ask cost, at both piece and flat shape", () => {
  assert.match(depthLine(budgetsFor(3, base)), /witness \(each ask up to two model calls\)/);
  assert.match(depthLine(budgetsFor(3, base), { piece: true }), /witness \(each ask up to two model calls\)/);
  assert.match(depthLine(budgetsFor(3, base)), /the real spend can run well past the sentence count named above/);
});
