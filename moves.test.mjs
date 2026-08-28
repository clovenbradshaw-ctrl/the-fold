// moves.test.mjs — the move space, against the REAL operators table and the
// REAL capacity registry. No fixture cube, because a cube this file invented
// would agree with itself and prove nothing.

import { test } from "node:test";
import assert from "node:assert/strict";

import { makeMoves } from "./moves.js";
import { CAPACITIES } from "./capacities.js";

const operators = await import("../eoreader7/legacy-eoreader6.1/packages/engine/operators.js");
const moves = makeMoves({ operators });

test("the space is nine operators at three grains, and terrain is DERIVED", () => {
  const all = moves.everyMove();
  assert.equal(all.length, 27);
  assert.equal(new Set(all.map((m) => m.cell)).size, 27, "every cell is distinct");
  for (const m of all) {
    // Never a free label: an operator's domain is fixed by its letter, so the
    // terrain follows from (domain, grain) and cannot be chosen.
    assert.equal(m.terrain, operators.TERRAIN_BY_DOMAIN[m.domain][m.grain]);
    assert.equal(m.domain, operators.operatorOf(m.op).domain);
  }
});

test("a capability naming a terrain its operator cannot reach is ILLEGAL, never coverage", () => {
  // capacities.js's own header records this exact class caught twice by hand
  // while that table was written. SYN is Structure-domain and can never land
  // on Kind, whatever grain is picked.
  const { illegal, covered } = moves.coverage([{ id: "bogus", op: "SYN", terrain: "Kind" }]);
  assert.equal(covered.length, 0, "an illegal row must not be counted as an organ");
  assert.equal(illegal.length, 1);
  assert.match(illegal[0].why, /Structure-domain and can never land on Kind/);
});

test("a compound operator occupies every cell it names", () => {
  // `distinguish` is genuinely two operators in one motion (grid.js), so
  // `cast`'s "SIG+INS" holds two cells; splitting it would report a covered
  // cell as empty.
  const { covered } = moves.coverage([{ id: "cast", op: "SIG+INS", terrain: "Entity" }]);
  assert.deepEqual(covered.map((m) => m.cell).sort(), ["INS·Figure", "SIG·Figure"]);
});

test("an unknown operator is refused rather than admitted as a new cell", () => {
  const { illegal, covered } = moves.coverage([{ id: "x", op: "ZZZ", terrain: "Link" }]);
  assert.equal(covered.length, 0);
  assert.equal(illegal.length, 1);
});

test("THE SPECIMEN: the list failed at a cell this instrument has never occupied", () => {
  // The computed form of the diagnosis. `relations` — the SVO extractor that
  // returned zero edges on a page listing ten prime ministers with their exact
  // terms — sits at CON·Figure. The arrangement it failed to read is
  // CON·Pattern, and that cell is empty.
  const c = moves.coverage(CAPACITIES);
  assert.equal(c.illegal.length, 0, "the shipped registry is domain-legal throughout");

  const link = c.moves.find((m) => m.cell === "CON·Figure");
  assert.equal(link.terrain, "Link");
  assert.deepEqual(link.organs, ["relations"]);

  const network = c.moves.find((m) => m.cell === "CON·Pattern");
  assert.equal(network.terrain, "Network");
  assert.deepEqual(network.organs, [], "binding at Pattern grain has no organ");

  // And the gap is a LEAD, not a shrug: the same act is already performed one
  // grain finer. That is the signature of a grain mismatch — which predicts a
  // floor at zero, not a degradation, and zero is what was measured.
  const n = moves.neighbours("CON·Pattern", c.covered);
  assert.deepEqual(n.sameActOtherGrain, ["CON·Figure"]);
});

test("coverage is honest about how much of the space is empty", () => {
  const c = moves.coverage(CAPACITIES);
  assert.equal(c.covered.length + c.empty.length, 27);
  // Stated rather than implied: this instrument occupies nine of twenty-seven
  // moves. A reading that misses something is far more often an unoccupied
  // cell than a misconfigured organ, and that ratio is why.
  assert.equal(c.covered.length, 9);
  assert.equal(c.empty.length, 18);
});
