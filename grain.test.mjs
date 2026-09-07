// grain.test.mjs — P150. The cube's third face, read off the question.
import test from "node:test";
import assert from "node:assert/strict";
import { grainOf, placeOf, grainNull, GRAINS } from "./grain.js";

// The cube, injected — as everywhere else. A fake with the real shape, so
// this test does not depend on the engine's checkout being present.
const cube = {
  cellOf: (op, grain) => ({ op, grain, mode: "Relate", domain: "Existence",
    terrain: { Ground: "Void", Figure: "Entity", Pattern: "Kind" }[grain],
    stance: { Ground: "Tending", Figure: "Binding", Pattern: "Tracing" }[grain] }),
};

test("the grain is read off the ASKER'S words, never induced (II.12)", () => {
  assert.equal(grainOf("Tell me more about that.").grain, "Ground");
  assert.equal(grainOf("Where does Circe appear in odyssey-greek.txt?").grain, "Figure");
  assert.equal(grainOf("What kinds of arguments does the source make?").grain, "Pattern");
});

test("a question whose words do not settle its grain is PROVISIONAL, never guessed", () => {
  // II.12: a type assigned by the machine and presented as found is refused.
  // 165 of 869 real questions came back unsettled and none was guessed at.
  for (const q of ["Fix the thing", "ok", "", "asdf qwer"]) {
    const r = grainOf(q);
    assert.equal(r.provisional, true, `must not settle: ${JSON.stringify(q)}`);
    assert.equal(r.grain, null, "a provisional reading carries no grain, not a default one");
  }
});

test("a provisional reading yields no terrain and no stance — it may not choose a procedure", () => {
  const p = placeOf(cube, { op: "SIG", grain: grainOf("Fix the thing").grain });
  assert.equal(p.gap, "unsettled_grain");
});

test("a settled reading places the question on the OTHER TWO FACES, from the cube itself", () => {
  const p = placeOf(cube, { op: "SIG", grain: grainOf("Where does Circe appear?").grain });
  assert.equal(p.terrain, "Entity", "Existence x Figure is the Entity terrain");
  assert.equal(p.stance, "Binding", "Relate x Figure is the Binding stance");
  const g = placeOf(cube, { op: "SIG", grain: grainOf("Tell me more about that.").grain });
  assert.equal(g.terrain, "Void", "Existence x Ground is the Void terrain — a different question entirely");
  assert.notEqual(g.stance, p.stance, "and a different stance: the same operator worked at a different grain is different work");
});

test("the cube is INJECTED — this module may not carry its own copy of a table that can drift", () => {
  assert.throws(() => placeOf(null, { op: "SIG", grain: "Figure" }), /injected/);
});

test("THE NULL ARM (II.12): the split must not survive permutation", () => {
  // MEASURED on run 1's 869 model turns: Figure 39% vs Ground 62%, a real
  // spread of 22.4 points against a shuffled spread of 0.8-6.0 across five
  // seeds. This pin rebuilds that shape synthetically and checks both arms.
  const rows = [
    ...Array.from({ length: 200 }, (_, i) => ({ grain: "Figure", high: i % 5 === 0 })),   // 20%
    ...Array.from({ length: 200 }, (_, i) => ({ grain: "Ground", high: i % 5 !== 0 })),   // 80%
  ];
  const n = grainNull(rows, { seed: 3 });
  assert.ok(n.real > 0.5, `the real split must be large: ${n.real}`);
  assert.ok(n.shuffled < 0.2, `permuted labels must not split: ${n.shuffled}`);
  assert.equal(n.separates, true);
});

test("THE CONTROL: a grain that explains nothing must NOT be reported as separating", () => {
  // The arm has to be able to come back negative, or it is not measuring.
  const rows = Array.from({ length: 400 }, (_, i) => ({ grain: i % 2 ? "Figure" : "Ground", high: i % 3 === 0 }));
  const n = grainNull(rows, { seed: 5 });
  assert.equal(n.separates, false, `a split that is not there must be reported as absent: real ${n.real}, shuffled ${n.shuffled}`);
});

test("too few of a grain to speak is not a zero — it is left out of the spread", () => {
  // Run 1 had TWO Pattern questions in 869. Two turns may not set a rate.
  const rows = [
    ...Array.from({ length: 100 }, () => ({ grain: "Figure", high: false })),
    ...Array.from({ length: 100 }, () => ({ grain: "Ground", high: true })),
    { grain: "Pattern", high: true }, { grain: "Pattern", high: true },
  ];
  const n = grainNull(rows, { seed: 1 });
  assert.equal(n.real, 1, "the spread is Figure-to-Ground; Pattern's two turns are not a rate");
});

test("the three grains are the cube's own", () => {
  assert.deepEqual(GRAINS, ["Ground", "Figure", "Pattern"]);
});
