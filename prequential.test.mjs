// prequential.test.mjs — P143. A real belief about the turn, before the turn.
import test from "node:test";
import assert from "node:assert/strict";
import { cellsFor, bandFor, predict, mixture, baseRate, loss, scoreStream, shuffledControl, sensitivity, rateOutcome, usableGround, CHAIN, STRENGTHS } from "./prequential.js";
import { strainOf } from "./strain.js";

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

test("P144: whether an answer has ANY defect is mostly a fact about its length — the outcome must be a rate", () => {
  // Two answers with the identical defect RATE and very different lengths.
  // Presence calls the long one worse; the rate correctly calls them equal.
  const rows = [
    ...Array.from({ length: 40 }, () => ({ unbacked: 1, words: 40 })),   // rate 0.025
    ...Array.from({ length: 40 }, () => ({ unbacked: 6, words: 240 })),  // rate 0.025 — the same
  ];
  const presence = rows.map((r) => r.unbacked > 0);
  assert.ok(presence.every(Boolean), "presence cannot tell these apart at all — every one is 'defective'");
  const scored = rateOutcome(rows);
  const short = scored.filter((r) => r.words === 40 && !r.provisional);
  const long = scored.filter((r) => r.words === 240 && !r.provisional);
  assert.ok(short.length && long.length);
  assert.equal(short[0].rate.toFixed(4), long[0].rate.toFixed(4), "equal rates must be equal");
  const pShort = short.filter((r) => r.high).length / short.length;
  const pLong = long.filter((r) => r.high).length / long.length;
  assert.equal(pShort, pLong, `the same rate must not be called worse for being longer: ${pShort} vs ${pLong}`);
});

test("P144: the outcome's own median is taken prequentially — a turn's label never sees that turn", () => {
  const rows = Array.from({ length: 30 }, (_, i) => ({ unbacked: i, words: 100 }));
  const a = rateOutcome(rows);
  // Labelling the same stream twice is identical, and truncating it does not
  // change the labels of the turns that remain — which is what "strictly
  // earlier" means operationally.
  assert.deepEqual(rateOutcome(rows).map((r) => r.high), a.map((r) => r.high));
  assert.deepEqual(rateOutcome(rows.slice(0, 20)).map((r) => r.high), a.slice(0, 20).map((r) => r.high));
});

test("P144: before there is a median there is no median, and the row says so", () => {
  const r = rateOutcome([{ unbacked: 0, words: 10 }, { unbacked: 3, words: 10 }], { minHistory: 8 });
  assert.ok(r.every((x) => x.provisional), "with two turns seen, no median may be claimed");
});

test("P145 INTEGRATION: the belief prequential.js forms is one strainOf can spend", () => {
  // The two organs are wired through a caller that holds the stream, so this
  // is the seam nothing else covers: a real history, a real belief, a real
  // strain reading. A short live run cannot reach it — the belief defers
  // until twelve turns have been seen, which is the correct behaviour and
  // also the reason this pin exists.
  const history = Array.from({ length: 40 }, (_, i) => ({
    passages: i % 5 === 0 ? 18 : 3,
    answeredBeforeTheModel: false,
    premiseUnverified: false,
    // The 18-passage turns go badly; the 3-passage turns do not.
    unbacked: i % 5 === 0 ? 9 : 0,
    words: 100,
  }));
  const labelled = rateOutcome(history, { count: "unbacked", size: "words" }).map((x) => ({ ...x, hot: x.high }));
  const withCells = labelled.map((x) => ({ ...x, cells: cellsFor({ ...x, band: bandFor(x.passages) }) }));

  const beliefFor = (passages) => {
    const turn = { passages, answeredBeforeTheModel: false, premiseUnverified: false, band: bandFor(passages) };
    const m = mixture({ ...turn, cells: cellsFor(turn) }, withCells, null, { key: "hot" });
    return { p: m.p, base: baseRate(labelled, { key: "hot" }), why: m.why };
  };

  const bad = beliefFor(18), good = beliefFor(3);
  assert.ok(bad.p > bad.base, `the shape that went badly must be expected to: ${bad.p} vs base ${bad.base}`);
  assert.ok(good.p < good.base, `the shape that went well must not be: ${good.p} vs base ${good.base}`);
  assert.match(bad.why, /earlier turns? of this shape/, "the belief must carry its own evidence into the reason");
});

test("P145 INTEGRATION: and strain actually recruits on it, with the reason carrying the evidence", () => {
  const s = strainOf({
    question: "what does the passage say about the grant lincoln signed",
    passages: [{ text: "the grant lincoln signed in eighteen sixty two" }],
    expect: { p: 0.82, base: 0.5, why: "8 earlier turns of this shape" },
  });
  assert.ok(s.level >= 2, `a turn expected to go badly must be strained: ${s.level}`);
  assert.match(s.reasons.join(" "), /8 earlier turns of this shape/);
});

test("P147: a history where nothing has been distinguished yields no belief, not a confident zero", () => {
  const allCold = Array.from({ length: 20 }, () => ({ rate: 0, hot: false }));
  const allHot = Array.from({ length: 20 }, () => ({ rate: 1, hot: true }));
  assert.equal(usableGround(allCold).usable, false);
  assert.equal(usableGround(allCold).why, "degenerate_ground");
  assert.equal(usableGround(allHot).why, "degenerate_ground", "a ground that is entirely one class is degenerate either way");
});

test("P147: an unreadable rate is refused rather than coerced — the defect that shipped two vacuous beliefs", () => {
  // A caller stored an array where a count belonged. Number([1,2]) is NaN,
  // NaN > median is false, nothing was ever labelled, and the belief read
  // 0.0000 on live turns as though it were certain.
  const rows = [{ rate: 0.1, hot: true }, { rate: NaN, hot: false }, { rate: 0.2, hot: true }];
  const g = usableGround(rows);
  assert.equal(g.usable, false);
  assert.equal(g.why, "unreadable_rate");
});

test("P147: a real ground is usable and says how it was distinguished", () => {
  const rows = [...Array.from({ length: 12 }, () => ({ rate: 0.01, hot: false })), ...Array.from({ length: 8 }, () => ({ rate: 0.9, hot: true }))];
  const g = usableGround(rows);
  assert.equal(g.usable, true);
  assert.match(g.why, /8 of 20/);
});
