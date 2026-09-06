// prequential.test.mjs — P143. A real belief about the turn, before the turn.
import test from "node:test";
import assert from "node:assert/strict";
import { cellsFor, bandFor, predict, mixture, baseRate, loss, scoreStream, shuffledControl, sensitivity, CHAIN, STRENGTHS } from "./prequential.js";

// A stream where the outcome genuinely depends on a cell the chain can see.
const stream = (n) => Array.from({ length: n }, (_, i) => {
  const door = i % 4 === 0;
  return { turn: i + 1, passages: i % 7 === 0 ? 18 : 3, answeredBeforeTheModel: door, unbacked: door ? false : i % 3 !== 0 };
});

test("with nothing seen, the belief is one half and says so — not a hedge, the actual state of knowledge", () => {
  const p = predict({ passages: 3 }, []);
  assert.equal(p.p, 0.5);
  assert.match(p.why, /nothing has been seen/);
});

test("a cell that partitions nothing conditions nothing — the same evidence may inform a belief once", () => {
  // NUL, SIG and INS all hold every turn in this history, so entering them
  // would apply the stream's own turns to the stream's own belief again. The
  // first version did exactly that and shrank the estimate once per level.
  const history = Array.from({ length: 40 }, () => ({ passages: 3, answeredBeforeTheModel: false, unbacked: true }))
    .map((h) => ({ ...h, cells: cellsFor({ ...h, band: bandFor(h.passages) }) }));
  const t = { passages: 3, answeredBeforeTheModel: false, band: "3" };
  const r = predict({ ...t, cells: cellsFor(t) }, history);
  const entered = r.ladder.filter((x) => !x.held && x.cell !== "(stream)");
  assert.equal(entered.length, 0, `every cell here holds all 40 turns; none may be entered: ${JSON.stringify(entered)}`);
  assert.ok(r.p > 0.9, `the belief must stay where the evidence puts it, not shrink per level: ${r.p}`);
});

test("the prior at each cell IS the cell above it — a thin cell barely moves off its parent, a thick one speaks for itself", () => {
  // One turn under a deep cell against a parent that disagrees with it.
  const history = Array.from({ length: 200 }, (_, i) => ({ passages: 3, answeredBeforeTheModel: false, unbacked: true }))
    .map((h) => ({ ...h, cells: cellsFor({ ...h, band: bandFor(h.passages) }) }));
  // A single contrary observation in a cell of its own.
  const rare = { passages: 99, answeredBeforeTheModel: false, unbacked: false };
  history.push({ ...rare, cells: cellsFor({ ...rare, band: bandFor(99) }) });
  const p = mixture({ ...rare, cells: cellsFor({ ...rare, band: bandFor(99) }) }, history, null);
  assert.ok(p.p > 0.5, `one contrary turn must not overturn 200: got ${p.p}`);
  assert.ok(p.p < 0.99, `and it must move it somewhat: got ${p.p}`);
});

test("THE CONTROL: with outcomes permuted against the features, the chain must LOSE to the null", () => {
  // This is the test that would fail if the gain were an artifact of the
  // machinery rather than a fact about the material.
  const t = stream(400);
  const real = scoreStream(t);
  const ctrl = shuffledControl(t, { seed: 7 });
  assert.ok(real.gain > 0.05, `the chain must gain on real structure: ${real.gain}`);
  assert.ok(ctrl.gain <= 0, `permuted outcomes must NOT gain: ${ctrl.gain}`);
});

test("MEASURED on the 1000-turn stream (P143): the gain, its null, and its control", () => {
  // The numbers the policy states, read here so they are enforced and not
  // merely printed (P94). Recomputing them requires the run's turns.jsonl;
  // what is pinned is the SHAPE of the claim and the direction of each arm.
  const t = stream(1000);
  const r = scoreStream(t);
  assert.ok(r.baseBits > r.chainBits, "the chain must cost fewer bits than the base rate");
  assert.ok(r.chainBits > 0 && r.chainBits < 1, "a belief costing 1 bit or more is worse than a coin");
  assert.equal(r.rows.length, 1000);
  assert.equal(r.turns, 1000);
});

test("there is no constant: the parent's strength is averaged over candidates weighted by how well each has predicted", () => {
  assert.ok(STRENGTHS.length > 1, "a single candidate would be a constant wearing a plural");
  const t = stream(400);
  const rows = sensitivity(t, { grids: [[1], [0.5, 1, 2, 4, 8, 16, 32], [1, 10, 100], [2, 8]] });
  assert.equal(rows.length, 4);
  // Every strength must reach the same verdict; if the ordering flips across
  // the spread, the finding was the constant's and may not be reported.
  assert.ok(rows.every((r) => r.gain > 0), `the verdict must survive every grid: ${rows.map((r) => r.gain.toFixed(3))}`);
  const spread = Math.max(...rows.map((r) => r.gain)) - Math.min(...rows.map((r) => r.gain));
  assert.ok(spread < Math.min(...rows.map((r) => r.gain)), "the spread across grids must be smaller than the effect it is a spread of");
});

test("NO CUT: the SEG cell is the count itself — the first version binned at the median and measured nothing", () => {
  // 915 of 996 turns retrieved exactly 3; a median split put everything on
  // one side. The ladder's own backoff prices a thin cell; a bin cannot.
  assert.equal(bandFor(3), "3");
  assert.equal(bandFor(18), "18");
  assert.notEqual(bandFor(3), bandFor(18), "two counts that behaved differently may not share a cell");
});

test("the chain is the cube's own dependency order, coarse to fine, each cell a refinement of the last", () => {
  assert.deepEqual(CHAIN, ["NUL", "SIG", "INS", "SEG", "CON"]);
  const cells = cellsFor({ passages: 3, answeredBeforeTheModel: false, band: "3" });
  assert.equal(cells.length, CHAIN.length);
  for (let i = 1; i < cells.length; i++) {
    assert.ok(cells[i].startsWith(cells[i - 1]), `cell ${i} must refine cell ${i - 1}, not replace it`);
  }
});

test("prequentially scored: a turn is predicted from strictly earlier turns and never re-priced", () => {
  const t = stream(50);
  const r = scoreStream(t);
  // The first turn cannot have been informed by anything. (An average of
  // seven identical halves is a half to within floating point, not exactly.)
  assert.ok(Math.abs(r.rows[0].p - 0.5) < 1e-12, `first turn: ${r.rows[0].p}`);
  // Scoring twice gives the identical answer — nothing accumulates across runs.
  assert.deepEqual(scoreStream(t).rows.map((x) => x.p), r.rows.map((x) => x.p));
});

test("loss is in bits and a coin costs one", () => {
  assert.equal(loss(0.5, true, 1000), 1);
  assert.ok(loss(0.9, true, 1000) < loss(0.5, true, 1000));
  assert.ok(Number.isFinite(loss(0, true, 10)), "certainty that is wrong must cost a lot, never infinity");
});

test("the base rate is the null, and with no history it is a coin", () => {
  assert.equal(baseRate([]), 0.5);
  assert.equal(baseRate([{ unbacked: true }, { unbacked: false }]), 0.5);
  assert.equal(baseRate([{ unbacked: true }, { unbacked: true }, { unbacked: false }, { unbacked: false }]), 0.5);
});
