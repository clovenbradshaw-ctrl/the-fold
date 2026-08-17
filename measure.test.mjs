// measure.test.mjs — the walls themselves, against the real engine.
//
// Every test here runs measure.js over eoreader6's actual `nul/index.js` and
// `emergence/binding.js`, imported by relative path the same way the page
// imports them from /nul and /engine. No stub carries these walls: a fake nul
// with a hand-written LICENSED table would pass every test below while proving
// nothing about what the door actually refuses.
//
// What is pinned, in the order the door meets it: that a figure with no nothing
// behind it never returns a number; that an unestablished statistic/perturbation
// pairing is refused BY THE ENGINE'S OWN TABLE and not by a local copy of it;
// that the trial escape hatch is typed as a trial in every phrasing; that no
// rank is ever phrased finer than the draws can carry; that a best-of-n
// question cannot be answered with a one-arrival nothing; that a censored
// placement is a finding rather than an error; and that the same declaration
// twice is the same measurement.

import test from "node:test";
import assert from "node:assert/strict";

import * as nul from "../eoreader6/nul/index.js";
import { bindLinks } from "../eoreader6/packages/engine/emergence/binding.js";
import { delimitedRows } from "./tables.js";
import {
  admit,
  arrivalsFrom,
  licensedPairs,
  measureAcross,
  measurePairs,
  measureSeries,
  parseMeasure,
  phrase,
  runMeasurement,
  seriesFrom,
  toTable,
  usage,
} from "./measure.js";

// ── fixtures ────────────────────────────────────────────────────────────────

/** A bursty column: thirty quiet units, then five loud ones together. */
const BURSTY = {
  head: ["day", "calls"],
  rows: [
    ...Array.from({ length: 30 }, (_, i) => [String(i), "0"]),
    ...Array.from({ length: 5 }, (_, i) => [String(30 + i), "100"]),
  ],
};

/** A flat column: every value identical, so any shuffle-null has zero width. */
const FLAT = { head: ["day", "calls"], rows: Array.from({ length: 20 }, (_, i) => [String(i), "5"]) };

/** Two numeric columns, for the best-of-n door. */
const TWO_COLS = {
  head: ["a", "b"],
  rows: Array.from({ length: 40 }, (_, i) => [String(i % 7), String(i < 35 ? 0 : 50)]),
};

/** Units arriving at ordered positions — the co-arrival shape. */
const ARRIVALS = {
  head: ["unit", "minute", "note"],
  rows: [
    ["alpha", "1", "x"], ["bravo", "1", "x"],
    ["alpha", "2", "x"], ["bravo", "2", "x"],
    ["alpha", "3", "x"], ["bravo", "3", "x"],
    ["alpha", "4", "x"], ["bravo", "4", "x"],
    ["charlie", "20", "x"], ["charlie", "40", "x"],
    ["delta", "60", "x"],
  ],
};

const decl = (text) => {
  const out = parseMeasure(text);
  assert.ok(out?.decl, `expected a declaration from: ${text}`);
  return out.decl;
};

// ── the grammar ─────────────────────────────────────────────────────────────

test("not a measure command at all falls through as null", () => {
  assert.equal(parseMeasure("what do my sources say about drones"), null);
  assert.equal(parseMeasure("/fold 3 fix the spiral"), null);
  assert.equal(parseMeasure(""), null);
});

test("the bare door asks for usage rather than guessing", () => {
  assert.deepEqual(parseMeasure("/measure"), { usage: true });
  const help = usage(nul);
  // Usage names every established pairing, so the reader learns what exists
  // from the refusal instead of from this file.
  for (const { pair } of licensedPairs(nul)) assert.match(help, new RegExp(pair.replace("/", "\\/")));
});

test("declarations are order-free and quoted values survive", () => {
  const a = decl("/measure calls.csv series:calls as:burstiness broken:shuffle draws:200 window:5");
  const b = decl("/measure window=5 broken=shuffle draws=200 as=burstiness series=calls calls.csv");
  for (const k of ["file", "column", "statistic", "perturbation", "draws", "window", "seed"]) assert.equal(a[k], b[k], k);
  assert.equal(decl('/measure f.csv series:"call count" as:burstiness broken:shuffle draws:9 window:3').column, "call count");
});

test("a declaration naming no measurement is refused, not guessed at", () => {
  const out = parseMeasure("/measure calls.csv draws:200 window:5");
  assert.equal(out.refused.type, "no_measurement_named");
});

// ── gate 1: no figure without a nothing ─────────────────────────────────────

test("a statistic with no way of breaking the material is refused as no_ground", () => {
  const r = admit(decl("/measure calls.csv series:calls as:burstiness draws:200 window:5"), nul);
  assert.equal(r.type, "no_ground");
  // The refusal has to teach: it names every way of breaking that exists.
  for (const p of Object.keys(nul.PERTURBATIONS)) assert.match(r.detail, new RegExp(p));
});

test("there is no path from a declaration to a bare figure", () => {
  // The exhaustive form of the test above: strip `broken:` from an otherwise
  // complete, established declaration and NOTHING downstream may produce a
  // number. This is the wall coverage_equity.py walked straight through.
  const d = decl("/measure calls.csv series:calls as:burstiness draws:50 window:5");
  assert.equal(d.perturbation, null);
  assert.equal(admit(d, nul).type, "no_ground");
});

// ── gate 2: the engine's own licensing table, enforced ──────────────────────

test("an unestablished statistic/perturbation pairing is refused by name", () => {
  const r = admit(decl("/measure calls.csv series:calls as:burstiness broken:phase draws:200 window:5"), nul);
  assert.equal(r.type, "unlicensed_pair");
  assert.equal(r.what, "burstiness/phase");
  assert.equal(nul.licensed("burstiness", "phase"), false, "the engine is the authority, not this test");
});

test("the refusal carries the established pairs and the material each was earned on", () => {
  const r = admit(decl("/measure c.csv series:calls as:burstiness broken:resample draws:200 window:5"), nul);
  assert.equal(r.type, "unlicensed_pair");
  const pairs = r.established.map((p) => p.pair).sort();
  assert.deepEqual(pairs, Object.keys(nul.LICENSED).sort(), "the list is the engine's table, never a local copy");
  for (const p of r.established) assert.ok(p.where && p.where.length > 20, `${p.pair} must carry where it was earned`);
});

test("an established pairing is admitted", () => {
  assert.equal(admit(decl("/measure c.csv series:calls as:burstiness broken:shuffle draws:200 window:5"), nul), null);
  assert.equal(admit(decl("/measure c.csv series:calls as:irreversibility broken:phase draws:200 window:5"), nul), null);
});

test("a statistic the engine has no name for is refused before any licensing question", () => {
  const r = admit(decl("/measure c.csv series:calls as:kurtosis broken:shuffle draws:200 window:5"), nul);
  assert.equal(r.type, "unknown_spec");
  assert.equal(r.what, "as");
});

// ── the trial escape hatch, typed as a trial end to end ─────────────────────

test("trying: runs an unestablished pairing, and every phrasing says it is not testimony", () => {
  const d = decl("/measure b.csv series:calls trying:burstiness broken:phase draws:40 window:5");
  assert.equal(d.candidate, true);
  assert.equal(admit(d, nul), null, "a declared trial is admitted where `as:` would be refused");
  const r = measureSeries({ ...d, file: "b.csv" }, BURSTY, nul);
  assert.ok(!r.refused, phrase(r));
  assert.equal(r.candidate, true);
  assert.match(phrase(r), /TRIAL, NOT TESTIMONY/);
  assert.deepEqual(
    toTable(r).rows.find((row) => row[0] === "standing"),
    ["standing", "a trial — this pairing is not established"],
  );
});

test("a trial still has to name a statistic the engine actually has", () => {
  const r = admit(decl("/measure b.csv series:calls trying:vibes broken:shuffle draws:40 window:5"), nul);
  assert.equal(r.type, "unknown_spec");
});

// ── gate 3: the declared numbers ────────────────────────────────────────────

test("a missing number is refused by name, not defaulted", () => {
  const noDraws = admit(decl("/measure c.csv series:calls as:burstiness broken:shuffle window:5"), nul);
  assert.equal(noDraws.type, "undeclared");
  assert.equal(noDraws.what, "draws");
  const noWindow = admit(decl("/measure c.csv series:calls as:burstiness broken:shuffle draws:200"), nul);
  assert.equal(noWindow.type, "undeclared");
  assert.equal(noWindow.what, "window");
});

test("the ordering column is never guessed for a pairs question", () => {
  const r = admit(decl("/measure f.csv pairs:unit draws:199 window:2"), nul);
  assert.equal(r.type, "undeclared");
  assert.equal(r.what, "at");
});

test("a file must be named — the door never invents its material", () => {
  assert.equal(admit(decl("/measure series:calls as:burstiness broken:shuffle draws:9 window:3"), nul).type, "no_file");
});

// ── gate 4: best-of-n cannot borrow a one-arrival nothing ────────────────────

test("placing every column against one nothing requires a declared direction", () => {
  const d = decl("/measure two.csv series:a as:burstiness broken:shuffle draws:200 window:5");
  const r = measureAcross({ ...d, file: "two.csv" }, TWO_COLS, nul);
  assert.equal(r.refused.type, "best_of_n");
  assert.match(r.refused.detail, /manufacturing findings/);
});

test("and that refusal is REACHABLE from a typed declaration, not just from the function", () => {
  // The gap the real-data eval found and the unit tests above could not: the
  // wall was sound and nothing a reader could type would hit it, because the
  // only route into measureAcross was supplying the very direction it refuses.
  // A refusal no declaration can trigger is a comment, not a wall — so this
  // test goes through parseMeasure and the router, the way the app does.
  const d = decl("/measure two.csv across:all as:burstiness broken:shuffle draws:200 window:5");
  assert.equal(d.across, true);
  assert.equal(d.column, null, "across: names no single column, and none is required");
  assert.equal(admit(d, nul), null, "the gate lets it through — the best-of-n question is legitimate");
  const r = runMeasurement({ ...d, file: "two.csv" }, TWO_COLS, { nul, bindLinks });
  assert.equal(r.refused.type, "best_of_n", "and the router is where it lands");
});

test("one router: every declaration shape dispatches the same way it would by hand", () => {
  const cases = [
    ["/measure b.csv series:calls as:burstiness broken:shuffle draws:40 window:5", BURSTY, (d, t) => measureSeries(d, t, nul)],
    ["/measure t.csv across:all as:burstiness broken:shuffle draws:40 window:5 direction:above", TWO_COLS, (d, t) => measureAcross(d, t, nul)],
    ["/measure a.csv pairs:unit at:minute draws:40 window:1", ARRIVALS, (d, t) => measurePairs(d, t, { bindLinks })],
  ];
  for (const [line, table, byHand] of cases) {
    const d = { ...decl(line), file: "x" };
    assert.deepEqual(runMeasurement(d, table, { nul, bindLinks }), byHand(d, table), line);
  }
});

test("the router re-runs the gate, so no path reaches a measurement that skipped it", () => {
  const d = { ...decl("/measure b.csv series:calls as:burstiness broken:phase draws:40 window:5"), file: "b.csv" };
  assert.equal(runMeasurement(d, BURSTY, { nul, bindLinks }).refused.type, "unlicensed_pair");
});

test("with a direction, the nothing is the engine's best-of-n ground and n is counted", () => {
  const d = decl("/measure two.csv series:a as:burstiness broken:shuffle draws:200 window:5 direction:above");
  const r = measureAcross({ ...d, file: "two.csv" }, TWO_COLS, nul);
  assert.ok(!r.refused, phrase(r));
  assert.equal(r.n, 2, "n is the number of measurable columns, counted, never chosen");
  assert.equal(r.spec.n, 2, "and it reached the engine's own spec");
  assert.equal(r.spec.direction, "above");
  assert.equal(r.columns.length, 2);
});

// ── gate 5: no rank finer than the draws can carry ──────────────────────────

test("a pair no broken copy matched reads as 1 in draws, never as zero", () => {
  const d = decl("/measure a.csv pairs:unit at:minute draws:12 window:1");
  const r = measurePairs({ ...d, file: "a.csv" }, ARRIVALS, { bindLinks });
  assert.ok(!r.refused, phrase(r));
  assert.equal(r.floor, 1 / 12);
  for (const l of r.links) assert.ok(l.rank >= r.floor, `${l.a}/${l.b} ranked ${l.rank}, finer than 12 draws can say`);
  // alpha and bravo arrive at the same four positions — the pair the null
  // should place hardest, and the one whose rank must still be floored.
  const ab = r.links.find((l) => (l.a === "alpha" && l.b === "bravo") || (l.a === "bravo" && l.b === "alpha"));
  assert.ok(ab, "the co-arriving pair must be tested");
  assert.equal(ab.rank, r.floor);
  assert.equal(ab.censoredAtFloor, true);
  assert.match(phrase(r), /1 in 12 or rarer/);
});

test("the phrase never says a number finer than the run's own floor", () => {
  const d = decl("/measure b.csv series:calls as:burstiness broken:shuffle draws:12 window:5");
  const r = measureSeries({ ...d, file: "b.csv" }, BURSTY, nul);
  const said = phrase(r);
  assert.match(said, /12 broken copies, so the finest thing sayable is 1 in 12/);
  // The paper's own §6 complaint, made unsayable: at twelve draws there is no
  // phrasing in which a 95th percentile appears.
  assert.doesNotMatch(said, /9[05]th|percentile|significan/i);
});

test("no result anywhere is phrased as significant", () => {
  for (const [d, table] of [
    [decl("/measure b.csv series:calls as:burstiness broken:shuffle draws:60 window:5"), BURSTY],
    [decl("/measure a.csv pairs:unit at:minute draws:60 window:1"), ARRIVALS],
  ]) {
    const r = d.kind === "pairs" ? measurePairs({ ...d, file: "x" }, table, { bindLinks }) : measureSeries({ ...d, file: "x" }, table, nul);
    assert.doesNotMatch(phrase(r), /significan/i, "\"significant\" names a threshold nobody here declared");
  }
});

// ── censored is a finding, not a failure ────────────────────────────────────

test("an observation above the whole support is a finding, phrased as surfeit", () => {
  const d = decl("/measure b.csv series:calls as:burstiness broken:shuffle draws:200 window:5");
  const r = measureSeries({ ...d, file: "b.csv" }, BURSTY, nul);
  assert.ok(!r.refused, "censoring is not a refusal");
  assert.equal(r.censored, "above");
  assert.equal(r.observed, 100);
  const said = phrase(r);
  assert.match(said, /above every one of the 200 broken copies/);
  assert.match(said, /Surfeit/);
  assert.match(toTable(r).rows.map((row) => row.join(" ")).join("\n"), /censored above/);
});

test("a zero-width nothing is refused, and the refusal says it would clear anything", () => {
  const d = decl("/measure flat.csv series:calls as:burstiness broken:shuffle draws:50 window:5");
  const r = measureSeries({ ...d, file: "flat.csv" }, FLAT, nul);
  assert.equal(r.refused.type, "degenerate_ground", "the engine's own type, carried through unrenamed");
  assert.match(r.refused.detail, /clear anything/);
});

// ── the material side ───────────────────────────────────────────────────────

test("a partly-numeric column is refused whole — nothing is quietly dropped", () => {
  const table = { head: ["day", "calls"], rows: [["1", "4"], ["2", "n/a"], ["3", "6"]] };
  const got = seriesFrom(table, "calls");
  assert.equal(got.refused.type, "not_numeric");
  assert.match(got.refused.detail, /1 of 3/);
  assert.match(got.refused.detail, /Nothing was dropped and nothing was measured/);
});

test("a column that is not there names the columns that are", () => {
  const got = seriesFrom(BURSTY, "incidents");
  assert.equal(got.refused.type, "no_such_column");
  assert.match(got.refused.detail, /day, calls/);
});

test("arrivals are positions in the ordering, not the ordering column's raw values", () => {
  const got = arrivalsFrom(ARRIVALS, "unit", "minute");
  assert.equal(got.totalUnits, 7, "seven distinct minutes → seven positions, not sixty");
  const alpha = got.entities.find((e) => e.id === "alpha");
  assert.deepEqual(alpha.arrivals, [0, 1, 2, 3], "ranks, so a pair recorded at the same minute shares a position");
  const charlie = got.entities.find((e) => e.id === "charlie");
  assert.deepEqual(charlie.arrivals, [4, 5]);
});

test("a value that arrives once is not tested, and is counted rather than hidden", () => {
  const got = arrivalsFrom(ARRIVALS, "unit", "minute");
  assert.equal(got.entities.find((e) => e.id === "delta"), undefined, "one arrival has no pattern of arrival to break");
  assert.equal(got.singletons, 1);
  const r = measurePairs({ ...decl("/measure a.csv pairs:unit at:minute draws:20 window:1"), file: "a.csv" }, ARRIVALS, { bindLinks });
  assert.match(phrase(r), /1 arrived once and were not tested/);
});

test("fewer than two recurring values is a typed refusal, never an empty result", () => {
  const table = { head: ["unit", "minute"], rows: [["alpha", "1"], ["bravo", "2"], ["charlie", "3"]] };
  const r = measurePairs({ ...decl("/measure a.csv pairs:unit at:minute draws:20 window:1"), file: "a.csv" }, table, { bindLinks });
  assert.equal(r.refused.type, "empty_material");
});

test("a window wider than the material is refused before any draw is spent", () => {
  const d = decl("/measure b.csv series:calls as:burstiness broken:shuffle draws:200 window:500");
  const r = measureSeries({ ...d, file: "b.csv" }, BURSTY, nul);
  assert.equal(r.refused.type, "undeclared");
  assert.equal(r.refused.what, "window");
});

test("the file seam: a real delimited source reaches the door as a table", () => {
  const text = ["day,calls", "1,3", "2,4", "3,9", "4,2", "5,5", "6,1"].join("\n");
  const table = delimitedRows(text);
  const d = decl("/measure c.csv series:calls as:burstiness broken:shuffle draws:40 window:3");
  const r = measureSeries({ ...d, file: "c.csv" }, table, nul);
  assert.ok(!r.refused, phrase(r));
  assert.equal(r.extent, 6);
  assert.equal(r.rows, 6);
});

// ── the run is a measurement, so it repeats ─────────────────────────────────

test("the same declaration twice is the same measurement", () => {
  const d = decl("/measure b.csv series:calls as:burstiness broken:shuffle draws:37 window:4");
  const one = measureSeries({ ...d, file: "b.csv" }, BURSTY, nul);
  const two = measureSeries({ ...d, file: "b.csv" }, BURSTY, nul);
  assert.deepEqual(one, two);
  assert.equal(phrase(one), phrase(two));
});

test("every declared number reaches the engine's own spec and rides the result", () => {
  const d = decl("/measure b.csv series:calls as:burstiness broken:shuffle draws:31 window:4 seed:7");
  const r = measureSeries({ ...d, file: "b.csv" }, BURSTY, nul);
  assert.equal(r.spec.draws, 31);
  assert.equal(r.spec.window, 4);
  assert.equal(r.spec.seed, 7);
  assert.equal(r.spec.perturbation, "shuffle");
  assert.equal(r.spec.statistic, "burstiness");
  assert.equal(r.spec.via, "the-fold/measure.js", "the ground names its giver");
  const printed = toTable(r).rows.map((row) => row.join("=")).join("\n");
  for (const n of ["31", "4", "7"]) assert.match(printed, new RegExp(`=${n}$`, "m"));
});

test("every refusal this door can produce carries a detail a reader can act on", () => {
  const refusals = [
    admit(decl("/measure series:c as:burstiness broken:shuffle draws:9 window:3"), nul),
    admit(decl("/measure f.csv series:c as:burstiness draws:9 window:3"), nul),
    admit(decl("/measure f.csv series:c as:burstiness broken:phase draws:9 window:3"), nul),
    admit(decl("/measure f.csv series:c as:burstiness broken:shuffle window:3"), nul),
    admit(decl("/measure f.csv series:c as:nope broken:shuffle draws:9 window:3"), nul),
    admit(decl("/measure f.csv pairs:u draws:9 window:3"), nul),
    parseMeasure("/measure f.csv draws:9 window:3").refused,
    measureSeries({ ...decl("/measure f.csv series:calls as:burstiness broken:shuffle draws:50 window:5"), file: "f" }, FLAT, nul).refused,
    measureAcross({ ...decl("/measure f.csv series:a as:burstiness broken:shuffle draws:50 window:5"), file: "f" }, TWO_COLS, nul).refused,
  ];
  for (const r of refusals) {
    assert.ok(r, "each of these declarations must be refused");
    assert.ok(r.type && r.type.length, "a refusal is typed");
    assert.ok(r.detail && r.detail.length > 30, `${r.type} must say what to do about it`);
    assert.equal(phrase({ refused: r }), `refused (${r.type}): ${r.detail}`);
  }
});
