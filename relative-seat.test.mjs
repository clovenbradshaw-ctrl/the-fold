// relative-seat.test.mjs — Pass 32 of GROUND-FIGURE-PATTERN-SPEC.md: the two
// organs are seated in the registry, each row's cell CONFIRMED by cellOf
// (never proposed), and each row resolves to a real export of the module it
// names — a capacity reference is a place, never a promise.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAPACITIES } from "../eoreader7/native/organs/capacities.js";
import { cellOf } from "../eoreader7/native/kernel/cube.js";

// The spec's §3 table, as the grain each act is made at.
const SEATS = { recall: { op: "SIG", grain: "Figure" }, drift: { op: "EVA", grain: "Ground" }, correspond: { op: "SYN", grain: "Pattern" } };

test("the three rows exist, and each row's terrain is what cellOf derives from its operator and grain — confirmed, not proposed", () => {
  for (const [id, seat] of Object.entries(SEATS)) {
    const row = CAPACITIES.find((r) => r.id === id);
    assert.ok(row, `registry row ${id}`);
    assert.equal(row.op, seat.op);
    const cell = cellOf(seat.op, seat.grain);
    assert.equal(cell.gap, undefined, `cellOf(${seat.op}, ${seat.grain}) is a cell`);
    assert.equal(row.terrain, cell.terrain, `${id}: ${seat.op}·${seat.grain} lands on ${cell.terrain}`);
  }
});

test("each row resolves to a real export of the module it names, in this tree", async () => {
  for (const id of Object.keys(SEATS)) {
    const row = CAPACITIES.find((r) => r.id === id);
    const mod = await import(`./${row.module}`);
    assert.equal(typeof mod[row.fn], "function", `${row.module} exports ${row.fn}`);
  }
});

test("the confirmed cells are the spec's: Entity for the recall, Atmosphere for the drift check, Network for the correspondence act", () => {
  assert.equal(cellOf("SIG", "Figure").terrain, "Entity");
  assert.equal(cellOf("EVA", "Ground").terrain, "Atmosphere");
  assert.equal(cellOf("SYN", "Pattern").terrain, "Network");
});
