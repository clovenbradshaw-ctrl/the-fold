import test from "node:test";
import assert from "node:assert/strict";
import { placeCoverage, rememberCoverage, chooseCut, MIN_HISTORY } from "./calibration.js";
import { discriminating } from "./layers.js";
const nul = await import("../eoreader7/legacy-eoreader6.1/nul/index.js");

const ordinary = [0.6, 0.55, 0.7, 0.63, 0.58, 0.72, 0.61, 0.66, 0.59, 0.68, 0.64, 0.57];

test("a coverage is placed against the stream's own regime; a low outlier is strain, a high one is not, and direction is read because maxDeviation is blind to sign", () => {
  assert.equal(placeCoverage(0.62, ordinary, { nul }).strained, false);
  assert.equal(placeCoverage(0.10, ordinary, { nul }).strained, true);
  assert.match(placeCoverage(0.10, ordinary, { nul }).why, /further from this stream's own regime than resampling it ever gets/);
  assert.equal(placeCoverage(0.98, ordinary, { nul }).strained, false, "better covered than usual is not a strain");
  assert.match(placeCoverage(0.98, ordinary, { nul }).why, /outlier the other way/);
});

test("every null the apparatus can return is typed, and NONE of them reads as no-strain", () => {
  assert.equal(placeCoverage(0.5, [0.6, 0.5], { nul }).strained, null);
  assert.match(placeCoverage(0.5, [0.6, 0.5], { nul }).why, new RegExp(`a null needs ${MIN_HISTORY}`));
  const flat = placeCoverage(0.5, Array(20).fill(0.6), { nul });
  assert.equal(flat.strained, null);
  assert.equal(flat.gap, "degenerate_ground", "a null of zero width would clear anything");
  assert.equal(placeCoverage(0.5, ordinary, {}).strained, null, "no apparatus is a gap, never a pass");
  assert.equal(placeCoverage(NaN, ordinary, { nul }).strained, null);
});

test("the tower decides which cut to trust: a measured cut that never fires is refused in favour of the declared floor (the live result)", () => {
  // Measured over 274 real turns: the floor fired on 40, the null on 0.
  const floorAudit = discriminating(40, 274);
  const nullAudit = discriminating(0, 262);
  assert.equal(floorAudit.discriminating, true);
  assert.equal(nullAudit.discriminating, false);
  assert.equal(nullAudit.suspect, "never");
  assert.equal(chooseCut(null, 0.34, nullAudit).use, "declared");
  assert.match(chooseCut(null, 0.34, nullAudit).why, /never fires, so the declared floor stands/);
  assert.equal(chooseCut(null, 0.34, floorAudit).use, "measured");
  assert.equal(chooseCut(null, 0.34, null).use, "declared", "an unaudited cut is not trusted either");
});

test("the history is rolling, so calibration tracks a corpus rather than averaging over several", () => {
  let h = [];
  for (let i = 0; i < 200; i++) h = rememberCoverage(h, i / 200);
  assert.ok(h.length <= 120);
  assert.equal(rememberCoverage(h, NaN).length, h.length, "an unreadable coverage is not remembered as a number");
});
