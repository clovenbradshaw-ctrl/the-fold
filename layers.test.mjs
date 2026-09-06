import test from "node:test";
import assert from "node:assert/strict";
import { makeTower, climb, discriminating, GROUND } from "./layers.js";

test("the watcher's regress is refused at the gate, at construction — a self-watch and a cycle alike", () => {
  assert.throws(() => makeTower([{ name: "a", watches: "a", read: () => ({}) }]), /watches itself — the watcher's regress/);
  assert.throws(() => makeTower([
    { name: "a", watches: "b", read: () => ({}) },
    { name: "b", watches: "a", read: () => ({}) },
  ]), /watches a cycle through/);
  assert.throws(() => makeTower([{ name: "a", watches: "missing", read: () => ({}) }]), /not in the tower/);
  assert.throws(() => makeTower([{ name: "a", watches: GROUND, read: () => ({}) }, { name: "a", watches: GROUND, read: () => ({}) }]), /two layers named/);
});

test("a tower climbs base-first, each layer reading only the record BELOW it", () => {
  const seen = [];
  const tower = makeTower([
    { name: "auditing", watches: "calibrating", read: (r) => { seen.push(["auditing", r]); return { reading: "audited" }; } },
    { name: "deliberate", watches: GROUND, read: (r) => { seen.push(["deliberate", r]); return { reading: { n: r.n } }; } },
    { name: "calibrating", watches: "deliberate", read: (r) => { seen.push(["calibrating", r]); return { reading: { fires: 2, n: r.n }, adjust: { cut: 0.3 } }; } },
  ]);
  assert.deepEqual(tower.order.map((l) => l.name), ["deliberate", "calibrating", "auditing"]);
  const out = climb(tower, { deliberate: { n: 10 } });
  assert.equal(out.readings.auditing.reading, "audited");
  assert.deepEqual(out.adjustments.calibrating, { cut: 0.3 });
  assert.deepEqual(seen.map((s) => s[0]), ["deliberate", "calibrating", "auditing"]);
  assert.deepEqual(seen[2][1], { fires: 2, n: 10 }, "the auditor read the calibrator's reading, not the ground");
});

test("the climb stops where there is nothing left to measure, and a gap is never an all-clear", () => {
  const tower = makeTower([
    { name: "deliberate", watches: GROUND, read: () => ({ reading: { covs: [0.6] } }) },
    { name: "calibrating", watches: "deliberate", read: (r) => (r.covs.length < 3 ? { gap: "empty_material", why: "too little history" } : { reading: {} }) },
    { name: "auditing", watches: "calibrating", read: () => ({ reading: "should not run" }) },
  ]);
  const out = climb(tower, {});
  assert.equal(out.stoppedAt.layer, "calibrating");
  assert.equal(out.stoppedAt.gap, "empty_material");
  assert.equal(out.readings.auditing, undefined, "a layer above a gap never reads a reading that was not made");
  // A layer that throws is a typed gap, not a crash.
  const boom = makeTower([{ name: "a", watches: GROUND, read: () => { throw new Error("nope"); } }]);
  assert.equal(climb(boom, { a: {} }).stoppedAt.gap, "read_threw");
});

test("the audit layer: a cut that fires on all or none is a constant wearing a measurement's clothes", () => {
  assert.equal(discriminating(40, 274).discriminating, true);
  assert.equal(discriminating(0, 262).discriminating, false);
  assert.equal(discriminating(0, 262).suspect, "never");
  assert.equal(discriminating(262, 262).suspect, "always");
  assert.equal(discriminating(5, 0).gap, "empty_material");
});
