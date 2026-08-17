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
import { existsSync, readFileSync } from "node:fs";

import * as nul from "../eoreader6/nul/index.js";
import { bindLinks } from "../eoreader6/packages/engine/emergence/binding.js";
import { delimitedRows } from "./tables.js";
import { reduce as audioReduce } from "../eoreader6/packages/engine/perceiver/audio/reduce.js";
import { reduce as viaMaterial } from "../eoreader6/packages/engine/perceiver/audio/material.js";
import {
  admit,
  arrivalsFrom,
  licensedPairs,
  measureAcross,
  measurePairs,
  measureSeries,
  parseMeasure,
  phrase,
  probeMaterial,
  runMeasurement,
  seriesFrom,
  seriesFromMedia,
  sniffContainer,
  wavSamples,
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


// ── binary material: the WAV walk and the bytes path ────────────────────────

/** A real PCM WAV built byte-by-byte: `spec` is [{hz|level, seconds}]. */
function synthWav({ sampleRate = 8000, spans }) {
  const samples = [];
  for (const span of spans) {
    const n = Math.round(span.seconds * sampleRate);
    for (let i = 0; i < n; i++) {
      const t = samples.length / sampleRate;
      samples.push(span.hz ? Math.round(Math.sin(2 * Math.PI * span.hz * t) * (span.amp ?? 12000)) : (span.level ?? 0));
    }
  }
  const dataSize = samples.length * 2;
  const buf = new ArrayBuffer(44 + dataSize);
  const dv = new DataView(buf);
  const ascii = (off, str) => [...str].forEach((c, i) => dv.setUint8(off + i, c.charCodeAt(0)));
  ascii(0, "RIFF"); dv.setUint32(4, 36 + dataSize, true); ascii(8, "WAVE");
  ascii(12, "fmt "); dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, sampleRate, true); dv.setUint32(28, sampleRate * 2, true);
  dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  ascii(36, "data"); dv.setUint32(40, dataSize, true);
  samples.forEach((v, i) => dv.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, v)), true));
  return new Uint8Array(buf);
}

test("the pure audio organ and the engine's own module are the same function", () => {
  // The browser imports reduce.js because material.js's ffmpeg import cannot
  // load in a page; this pins that the split did not fork the organ.
  assert.equal(audioReduce, viaMaterial);
});

test("wavSamples round-trips a synthesized PCM WAV exactly", () => {
  const bytes = synthWav({ spans: [{ level: 100, seconds: 0.01 }, { level: -200, seconds: 0.01 }] });
  const got = wavSamples(bytes);
  assert.ok(!got.refused);
  assert.equal(got.sampleRate, 8000);
  assert.equal(got.samples.length, 160);
  assert.equal(got.samples[0], 100);
  assert.equal(got.samples[159], -200);
});

test("a compressed WAV is refused by codec, never half-decoded", () => {
  const bytes = synthWav({ spans: [{ level: 1, seconds: 0.01 }] });
  const dv = new DataView(bytes.buffer);
  dv.setUint16(20, 85, true); // format tag 85 = MP3-in-WAV
  const got = wavSamples(bytes);
  assert.equal(got.refused.type, "unsupported_codec");
  assert.match(got.refused.detail, /format tag 85/);
});

test("bytes that are not a WAV say so and point at the raw-bytes door", () => {
  const got = wavSamples(new TextEncoder().encode("not audio at all, just text pretending"));
  assert.equal(got.refused.type, "not_wav");
  assert.match(got.refused.detail, /raw bytes/);
});

test("binary material requires channel and frame, each refused by name", () => {
  const media = { kind: "bytes", bytes: new Uint8Array(4096) };
  const base = decl("/measure blob.bin as:burstiness broken:shuffle draws:40 window:5");
  const noChannel = seriesFromMedia(media, { ...base, file: "blob.bin" }, audioReduce);
  assert.equal(noChannel.refused.what, "channel");
  const noFrame = seriesFromMedia(media, { ...base, file: "blob.bin", channel: "rms" }, audioReduce);
  assert.equal(noFrame.refused.what, "frame");
});

test("a declared WAV measurement runs end to end through the router, and finds planted structure", () => {
  // Ten seconds of near-silence with one loud half-second burst — structure
  // planted, not discovered, so this is a control: the burst's energy must sit
  // above every shuffle of the loudness frames.
  const bytes = synthWav({
    spans: [
      { level: 0, seconds: 4 },
      { hz: 440, seconds: 0.5 },
      { level: 0, seconds: 5.5 },
    ],
  });
  const d = decl("/measure tone.wav channel:rms frame:400 as:burstiness broken:shuffle draws:100 window:4");
  const r = runMeasurement({ ...d, file: "tone.wav" }, { kind: "wav", bytes }, { nul, bindLinks, reduce: audioReduce });
  assert.ok(!r.refused, phrase(r));
  assert.equal(r.censored, "above", "the planted burst must exceed every shuffled loudness arrangement");
  assert.match(r.column, /rms per 400-sample frame \(8000 Hz, 10\.0s\)/);
  assert.match(phrase(r), /above every one of the 100 broken copies/);
});

test("the same WAV with the burst shuffled away is the negative control", () => {
  // Constant tone, no burst: every frame carries the same energy, the null
  // has zero width, and the honest answer is the degenerate-ground refusal —
  // never a finding.
  const bytes = synthWav({ spans: [{ hz: 440, seconds: 5 }] });
  const d = decl("/measure flat.wav channel:rms frame:400 as:burstiness broken:shuffle draws:100 window:4");
  const r = runMeasurement({ ...d, file: "flat.wav" }, { kind: "wav", bytes }, { nul, bindLinks, reduce: audioReduce });
  assert.ok(r.refused?.type === "degenerate_ground" || (!r.censored && r.rank > 0.05), phrase(r));
});

test("any binary at all frames as bytes and the gate is identical", () => {
  // Structure planted in raw bytes: a run of 0xFF inside zeros.
  const bytes = new Uint8Array(8192);
  bytes.fill(255, 4000, 4400);
  const d = decl("/measure blob.bin channel:rms frame:64 as:burstiness broken:shuffle draws:100 window:4");
  const r = runMeasurement({ ...d, file: "blob.bin" }, { kind: "bytes", bytes }, { nul, bindLinks, reduce: audioReduce });
  assert.ok(!r.refused, phrase(r));
  assert.equal(r.censored, "above");
  assert.match(r.column, /rms per 64-byte frame/);
  // And the unlicensed pairing is refused for bytes exactly as for columns.
  const bad = runMeasurement(
    { ...decl("/measure blob.bin channel:rms frame:64 as:burstiness broken:phase draws:100 window:4"), file: "blob.bin" },
    { kind: "bytes", bytes },
    { nul, bindLinks, reduce: audioReduce },
  );
  assert.equal(bad.refused.type, "unlicensed_pair");
});

test("pairs: on binary material is a typed refusal, not a crash", () => {
  const d = decl("/measure blob.bin pairs:unit at:minute draws:20 window:1");
  const r = runMeasurement({ ...d, file: "blob.bin" }, { kind: "bytes", bytes: new Uint8Array(64) }, { nul, bindLinks, reduce: audioReduce });
  assert.equal(r.refused.type, "no_measurement_named");
  assert.match(r.refused.detail, /binary/);
});

// ── the probe: a bare file name teaches the declaration ─────────────────────

test("a bare /measure <file> is a probe, not a refusal", () => {
  const out = parseMeasure("/measure quakes.csv");
  assert.equal(out.decl.kind, "probe");
  assert.equal(admit(out.decl, nul), null);
});

test("the probe reads a table's measurable surface off its own bytes", () => {
  const r = probeMaterial({ kind: "probe", file: "a.csv" }, ARRIVALS, nul);
  const text = phrase(r);
  assert.match(text, /11 rows · 3 columns/);
  assert.match(text, /pairs:unit/);
  // The probe's example lines parse back through the door's own grammar.
  const example = r.lines.find((l) => l.startsWith("/measure") && l.includes("pairs:"));
  assert.ok(parseMeasure(example)?.decl, "a probe suggestion must be a valid declaration shape");
  // The suggestion is one that can actually SUCCEED: the pairs column is the
  // one whose values recur (counted off the rows, never guessed), and the
  // ordering column is a different column. The e2e transcript that pinned
  // this suggested `pairs:time at:time` — parseable, degenerate, and doomed.
  assert.match(example, /pairs:unit/, "unit is the recurring column; note has one distinct value and time-like columns do not recur");
  const d = parseMeasure(example).decl;
  assert.notEqual(d.key, d.at, "pairs and at must not be the same column");
  // And it teaches the established pairings from the engine's table.
  for (const { pair } of licensedPairs(nul)) assert.match(text, new RegExp(pair.split("/")[0]));
});

test("the probe describes a WAV in its own units", () => {
  const bytes = synthWav({ spans: [{ hz: 440, seconds: 2 }] });
  const r = probeMaterial({ kind: "probe", file: "tone.wav" }, { kind: "wav", bytes }, nul);
  const text = phrase(r);
  assert.match(text, /8000 Hz, 2\.0s/);
  assert.match(text, /channel:rms frame:/);
});


// ── container sniffing: magic first, text heuristic never consulted ─────────

test("sniffContainer reads real containers off their own first bytes", () => {
  // Real files from this machine, head bytes only — no synthetic magic.
  const head = (path) => new Uint8Array(readFileSync(path).subarray(0, 64));
  const cases = [
    ["/home/user/eoreader6/problem space.zip", "zip"],
    ["/home/user/eoreaderhandbook/sources/web/quine-1948-on-what-there-is.pdf", "pdf"],
    ["/opt/pw-browsers/chromium-1194/chrome-linux/product_logo_48.png", "png"],
    ["/opt/pw-browsers/chromium-1194/chrome-linux/libEGL.so", "elf"],
  ];
  for (const [path, want] of cases) {
    if (!existsSync(path)) continue; // machine-dependent fixtures; skip absent ones silently
    assert.equal(sniffContainer(head(path)), want, path);
  }
});

test("a PDF is a container even though its head is ASCII — the trap this exists for", () => {
  const pdfHead = new TextEncoder().encode("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>");
  assert.equal(sniffContainer(pdfHead), "pdf");
});

test("plain text and CSV sniff as nothing, so they stay on the text path", () => {
  assert.equal(sniffContainer(new TextEncoder().encode("time,latitude,longitude\n2026-08-17,36.0,-117.8\n")), null);
  assert.equal(sniffContainer(new TextEncoder().encode("It was a bright cold day in April")), null);
  assert.equal(sniffContainer(new Uint8Array(4)), null);
});

test("a wav sniffs as wav through the same door the drop handler uses", () => {
  const bytes = synthWav({ spans: [{ level: 3, seconds: 0.01 }] });
  assert.equal(sniffContainer(bytes), "wav");
});
