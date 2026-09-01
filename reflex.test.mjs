// reflex.test.mjs — the self plane's assay (P15).
//
// What must hold: the ledger is append-only and rebuilds byte-identically
// from its entries alone; every self address self-verifies and lives on the
// reserved namespace; the two planes never read alike in the prompt or on
// the record; the surprise meter's numbers are the declared ones with their
// givers, its first ground is a typed gap, and its ranking is deterministic
// and mechanical. The meter runs against the ENGINE'S REAL ORGANS
// (eoreader6 emergence/tiers.js), not a stub — the same discipline
// grounding.test.mjs set.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  SELF_SOURCE,
  SELF_TIERS,
  SURPRISE_DRAWS,
  SURPRISE_WINDOW,
  actLine,
  actsTable,
  buildSelfBlock,
  detectReflex,
  emptyReflexLog,
  isReservedSourceName,
  isSelfRef,
  ledgerChunks,
  ledgerText,
  makeReflexMeter,
  mostSurprising,
  normalizeSelfLevel,
  paceTable,
  parseOrdinal,
  recallTable,
  recordAct,
  resolveOrdinalRecall,
  selfRefContext,
  surpriseTable,
} from "./reflex.js";

import {
  RECENCY_WINDOW,
  addWarrantRecord,
  buildRecordSystemMessage,
  buildWarrantRecord,
  emptySummary,
  updateSummaryWithFold,
} from "./fold.js";

import { buildSourceBlock, retrieve } from "./source.js";
import { NOTHING, buildTable, detectTable } from "./tables.js";

import {
  createTierStack,
  foldThrough,
  gammaFor,
} from "../eoreader7/legacy-eoreader6.1/packages/engine/emergence/tiers.js";

const meterOrgans = makeReflexMeter({ createTierStack, foldThrough });

function sampleLog() {
  let log = emptyReflexLog();
  log = recordAct(log, { turn: 1, act: "asked", text: "what does the report say about the harbor" });
  log = recordAct(log, { turn: 1, act: "retrieved", part: "part 1", refs: ["kessington.txt#0-74", "notes.txt#10-90"] });
  log = recordAct(log, { turn: 1, act: "checked", part: "part 1", refs: 2, unsupported: 0, open: 1 });
  log = recordAct(log, { turn: 1, act: "folded", line: "Q: harbor A: 12% in spring" });
  log = recordAct(log, { turn: 2, act: "asked", text: "and the winter figure?" });
  log = recordAct(log, { turn: 2, act: "surprise", role: "user", bits: 2.41, standing: "14 of 200 continuations moved belief at least this far", reach: "discourse" });
  return log;
}

// ── the ledger: append-only, seq not clock ──────────────────────────────────

test("the ledger is append-only and frozen; recording never mutates the past", () => {
  const empty = emptyReflexLog();
  const one = recordAct(empty, { turn: 1, act: "asked", text: "q" });
  assert.equal(empty.entries.length, 0, "the prior log is untouched");
  assert.equal(one.entries.length, 1);
  assert.equal(one.entries[0].seq, 0);
  assert.ok(Object.isFrozen(one));
  assert.ok(Object.isFrozen(one.entries));
  assert.ok(Object.isFrozen(one.entries[0]));
  const two = recordAct(one, { turn: 1, act: "folded", line: "f" });
  assert.equal(two.entries[1].seq, 1, "seq counts, no clock anywhere");
  assert.throws(() => {
    "use strict";
    one.entries[0].text = "rewritten";
  });
});

test("an act's array payload is frozen too — evidence cannot be edited in place", () => {
  const log = recordAct(emptyReflexLog(), { turn: 1, act: "retrieved", part: "p", refs: ["a.txt#0-9"] });
  assert.ok(Object.isFrozen(log.entries[0].refs));
});

// ── the ledger as an addressed text: determinism and self-verification ──────

test("the ledger text rebuilds byte-identically from the entries alone", () => {
  const a = ledgerText(sampleLog());
  const b = ledgerText(sampleLog());
  assert.equal(a, b);
  assert.ok(a.includes("turn 1\n"), "one paragraph per turn");
  assert.ok(a.includes("[kessington.txt#0-74]"), "material refs quoted inside act lines stay addresses");
});

test("every ledger chunk self-verifies: the text at the ref's offsets IS the chunk's text (P5.2)", () => {
  const log = sampleLog();
  const text = ledgerText(log);
  const chunks = ledgerChunks(log);
  assert.ok(chunks.length >= 2, "one chunk per turn");
  for (const c of chunks) {
    assert.equal(text.slice(c.start, c.end), c.text);
    assert.equal(c.ref, `${SELF_SOURCE}#${c.start}-${c.end}`);
    assert.equal(c.source, SELF_SOURCE);
  }
});

test("a self ref re-opens from the ledger, same shape as a material ref's context", () => {
  const log = sampleLog();
  const c = ledgerChunks(log)[1];
  const ctx = selfRefContext(log, c.ref);
  assert.equal(ctx.cited, c.text);
  assert.equal(ctx.before.length, c.start);
  assert.equal(selfRefContext(log, "other.txt#0-9"), null, "a world address does not resolve on this plane");
});

// ── the plane walls ─────────────────────────────────────────────────────────

test("the self namespace is reserved: a loaded source may not claim it", () => {
  assert.ok(isReservedSourceName("self:ledger"));
  assert.ok(isReservedSourceName("self:notes.txt"));
  assert.ok(isReservedSourceName("SELF:anything"));
  assert.ok(!isReservedSourceName("notes.txt"));
  assert.ok(!isReservedSourceName("myself.txt"));
  assert.ok(isSelfRef(`${SELF_SOURCE}#0-10`));
  assert.ok(!isSelfRef("kessington.txt#0-74"));
});

test("the SELF block and the MATERIAL block never read alike (IV.5, on this plane)", () => {
  const chunks = ledgerChunks(sampleLog());
  const self = buildSelfBlock(chunks);
  const material = buildSourceBlock(chunks);
  assert.ok(self.startsWith("SELF"));
  assert.ok(material.startsWith("MATERIAL"));
  assert.ok(/not material about the world/i.test(self), "the block declares what it cannot support");
  assert.ok(self.includes(`[${chunks[0].ref}]`), "self passages carry their addresses");
  assert.equal(buildSelfBlock([]), null);
});

test("the same retrieval organ reads the self plane — no second implementation", () => {
  const chunks = ledgerChunks(sampleLog());
  const hits = retrieve(chunks, "what was retrieved for the harbor question", 3);
  assert.ok(hits.length > 0);
  assert.ok(hits.every((h) => isSelfRef(h.ref)));
  assert.deepEqual(retrieve(chunks, "zeppelin", 3), [], "no overlap is absence, not invention");
});

// ── the record: plane typed end to end ──────────────────────────────────────

test("a record is born with its plane, and ON RECORD marks self without dressing it as material", () => {
  const world = buildWarrantRecord({ turn: 1, gist: "g", channels: ["cited"], refs: ["notes.txt#0-74"], unsupported: [], open: [] });
  assert.equal(world.plane, "world", "the default plane is the world");
  const self = buildWarrantRecord({ turn: 2, gist: "reflected", plane: "self", channels: ["self"], refs: [`${SELF_SOURCE}#0-40`], unsupported: [], open: [] });
  assert.equal(self.plane, "self");

  let summary = addWarrantRecord(emptySummary(), world);
  const worldOnly = buildRecordSystemMessage(summary);
  assert.ok(!/instrument's own act ledger/.test(worldOnly), "no self note when no self record");

  summary = addWarrantRecord(summary, self);
  const both = buildRecordSystemMessage(summary);
  assert.ok(/Turn 2 · self:/.test(both), "the self record is marked on its own line");
  assert.ok(/never claims about the world/.test(both), "the plane note appears with it");
  assert.ok(!/Turn 1 · self/.test(both), "the world record is not");
});

test("the summary-refresh firewall carries self records untouched (II.5 holds across planes)", () => {
  const self = buildWarrantRecord({ turn: 1, gist: "reflected", plane: "self", channels: ["self"], refs: [`${SELF_SOURCE}#0-40`], unsupported: [], open: [] });
  let summary = addWarrantRecord(emptySummary(), self);
  const hostile = JSON.stringify({ topic: "t", flow: "f", entities: [], context: "c", records: [{ turn: 1, gist: "REWRITTEN", plane: "world" }] });
  summary = updateSummaryWithFold(summary, "Q: q A: a", hostile);
  assert.equal(summary.records[0].plane, "self");
  assert.equal(summary.records[0].gist, "reflected");
});

// ── the meter: declared numbers, typed first ground, mechanical ranking ─────

test("the meter's numbers are the declared ones, givers named: window is the fold's present, gamma is the engine's own law, draws is read-frankenstein's resolution", () => {
  assert.equal(SURPRISE_WINDOW, RECENCY_WINDOW, "one declaration of the present, not a second knob");
  assert.equal(SURPRISE_DRAWS, 200);
  const meter = meterOrgans.create();
  assert.equal(meter.tiers.length, SELF_TIERS.length);
  assert.equal(meter.tiers[0].gamma, gammaFor(RECENCY_WINDOW), "gamma derived, never declared beside the window");
  assert.equal(meter.tiers[0].draws, SURPRISE_DRAWS);
});

test("the first arrival seeds belief and is a typed gap, never a number (SEED.md #1)", () => {
  const meter = meterOrgans.create();
  const o = meterOrgans.observe(meter, { turn: 1, role: "user", text: "the harbor figures held steady across the spring quarter" });
  assert.equal(o.bits, null);
  assert.ok(o.gap, "the gap is typed, not silent");
  assert.ok(/no_ground/.test(o.gap));
});

test("an arrival nothing tokenizable rides in is its own typed gap", () => {
  const meter = meterOrgans.create();
  const o = meterOrgans.observe(meter, { turn: 1, role: "user", text: "of the and to" });
  assert.ok(/empty_arrival/.test(o.gap));
});

test("measurement is deterministic: the same conversation measures identically twice", () => {
  const feed = [
    "the harbor figures held steady across the spring quarter",
    "the harbor figures held steady across the spring quarter",
    "suddenly zeppelins burned violet over midnight skies",
  ];
  const run = () => {
    const meter = meterOrgans.create();
    feed.forEach((text, i) => meterOrgans.observe(meter, { turn: i + 1, role: "user", text }));
    return meter.observations.map((o) => [o.bits, o.rank, o.censored, o.gap]);
  };
  assert.deepEqual(run(), run());
});

test("what surprised it most is measured and ranked mechanically: the foreign arrival outranks the repeats", () => {
  const meter = meterOrgans.create();
  const repeat = "the harbor figures held steady across the spring quarter";
  meterOrgans.observe(meter, { turn: 1, role: "user", text: repeat });
  meterOrgans.observe(meter, { turn: 1, role: "assistant", text: repeat });
  meterOrgans.observe(meter, { turn: 2, role: "user", text: repeat });
  const novel = meterOrgans.observe(meter, {
    turn: 3,
    role: "user",
    text: "suddenly zeppelins burned violet over midnight skies beyond the estuary",
  });
  assert.ok(novel.bits > 0, "the foreign arrival moved belief");
  const ranked = mostSurprising(meter);
  assert.ok(ranked.length >= 2);
  assert.equal(ranked[0].seq, novel.seq, "the novel arrival ranks first");
  assert.ok(ranked[0].standing, "its place against the continuation null is said, natural-frequency style");
  assert.deepEqual(mostSurprising({ observations: [] }), []);
});

// ── the levels, answered from state ─────────────────────────────────────────

test("the acts and surprise levels are computed tables, and honest emptiness is typed", () => {
  const log = sampleLog();
  const acts = actsTable(log);
  assert.equal(acts.table.rows.length, log.entries.length);
  assert.ok(/computed, not generated/.test(acts.caption));
  assert.equal(actsTable(emptyReflexLog()), null);
  assert.ok(NOTHING.acts && NOTHING.surprise && NOTHING.pace, "every empty level has its sentence");

  const meter = meterOrgans.create();
  assert.equal(surpriseTable(meter), null);
  meterOrgans.observe(meter, { turn: 1, role: "user", text: "the harbor figures held steady" });
  const seeded = surpriseTable(meter);
  assert.ok(/none measurable yet/.test(seeded.caption), "a seeded-only meter says so instead of ranking nothing");
  meterOrgans.observe(meter, { turn: 2, role: "user", text: "suddenly zeppelins burned violet" });
  const measured = surpriseTable(meter);
  assert.ok(/declared with their givers/.test(measured.caption));
  assert.ok(measured.table.rows.length >= 1);
});

test("the pace level renders the measured fold and refuses to invent an unmeasured one", () => {
  assert.equal(paceTable(null), null);
  assert.equal(paceTable({ calls: 0 }), null);
  const t = paceTable({ calls: 3, tokensPerChar: 0.25, prefillTps: 120.4, decodeTps: 9.6, meanOutTokens: 42 });
  assert.equal(t.table.rows.length, 5);
  assert.ok(/measured from the runtime's own telemetry/.test(t.caption));
});

test("buildTable serves the self levels from state like any other computed answer", () => {
  const state = { reflexLog: sampleLog(), meter: meterOrgans.create(), paceLog: { entries: [] }, model: "m" };
  assert.ok(buildTable("acts", state));
  assert.equal(buildTable("surprise", state), null, "empty meter is empty, not invented");
  assert.equal(buildTable("pace", state), null, "unmeasured pace is a gap, not a guess");
});

// ── the doors ───────────────────────────────────────────────────────────────

test("normalizeSelfLevel maps the ladder's words and refuses the rest", () => {
  assert.equal(normalizeSelfLevel("acts"), "acts");
  assert.equal(normalizeSelfLevel("ledger"), "acts");
  assert.equal(normalizeSelfLevel("surprise"), "surprise");
  assert.equal(normalizeSelfLevel("pace"), "pace");
  assert.equal(normalizeSelfLevel("folds"), "folds");
  assert.equal(normalizeSelfLevel("records"), "records");
  assert.equal(normalizeSelfLevel("harbor"), null);
});

test("detectReflex requires the second-person tell, so the material always wins", () => {
  assert.equal(detectReflex("what surprised you most"), "surprise");
  assert.equal(detectReflex("did that surprise you?"), "surprise");
  assert.equal(detectReflex("show your acts"), "acts");
  assert.equal(detectReflex("what is your pace"), "pace");
  assert.equal(detectReflex("how do you think about the material"), "reflect");
  assert.equal(detectReflex("how did you decide what to retrieve"), "reflect");
  // Questions about the world, even ones that mention surprise:
  assert.equal(detectReflex("what is the most surprising figure in the report"), null);
  assert.equal(detectReflex("list the sources"), null);
  assert.equal(detectReflex("what do you think the report says"), null, "an opinion request is an ordinary turn, not introspection");
});

// ── ordinal content recall ──────────────────────────────────────────────

test("parseOrdinal reads a word, a digit form, or the deictic last/latest — and nothing else", () => {
  assert.deepEqual(parseOrdinal("what was the third thing you told me"), { n: 3 });
  assert.deepEqual(parseOrdinal("what was the 3rd thing you told me"), { n: 3 });
  assert.deepEqual(parseOrdinal("the 21st thing you said"), { n: 21 });
  assert.deepEqual(parseOrdinal("what was the last thing you told me"), { last: true });
  assert.deepEqual(parseOrdinal("what's the most recent thing you said"), { last: true });
  assert.equal(parseOrdinal("what's the capital of France"), null);
  assert.equal(parseOrdinal(""), null);
});

test("parseOrdinal takes whichever ordinal token appears first, when a question names more than one", () => {
  assert.deepEqual(parseOrdinal("was the third thing you said before the fifth thing"), { n: 3 });
});

test("detectReflex recognizes ordinal recall only with all three tells present: an ordinal, a recall noun, and a told/said verb", () => {
  assert.equal(detectReflex("what was the third thing you told me again?"), "recall");
  assert.equal(detectReflex("what was the first time you mentioned that?"), "recall");
  assert.equal(detectReflex("what's the second thing you said?"), "recall");
  assert.equal(detectReflex("what was the last thing you told me?"), "recall");
  assert.equal(detectReflex("remind me what the 4th thing you told me was"), "recall");
  // An ordinary material question that happens to carry a number: no
  // recall verb naming something the INSTRUMENT said, so it stays material.
  assert.equal(detectReflex("what's the third law of thermodynamics"), null);
  assert.equal(detectReflex("what was the first thing on the agenda"), null);
  // Anaphoric/relative recall is a disclosed, different, harder problem —
  // not attempted, and it must not silently misfire as an ordinal either.
  assert.equal(detectReflex("what did I ask before that?"), null);
});

test("resolveOrdinalRecall reads turnFolds by position, 1-based, from the conversation's own start", () => {
  const folds = ["Q: a A: 1", "Q: b A: 2", "Q: c A: 3"];
  assert.deepEqual(resolveOrdinalRecall(folds, "what was the first thing you told me"), { ok: true, n: 1, of: 3, fold: "Q: a A: 1" });
  assert.deepEqual(resolveOrdinalRecall(folds, "what was the third thing you told me"), { ok: true, n: 3, of: 3, fold: "Q: c A: 3" });
  assert.deepEqual(resolveOrdinalRecall(folds, "what was the last thing you told me"), { ok: true, n: 3, of: 3, fold: "Q: c A: 3" });
});

test("resolveOrdinalRecall types the gap when the turn asked for hasn't happened, naming how many actually have", () => {
  const folds = ["Q: a A: 1", "Q: b A: 2"];
  const r = resolveOrdinalRecall(folds, "what was the fifth thing you told me");
  assert.equal(r.ok, false);
  assert.equal(r.gap, "no_such_turn");
  assert.equal(r.n, 5);
  assert.equal(r.of, 2);
  assert.match(r.detail, /only 2 turns/);
});

test("resolveOrdinalRecall types the gap on an empty conversation rather than crashing on turnFolds[-1]", () => {
  const r = resolveOrdinalRecall([], "what was the first thing you told me");
  assert.equal(r.ok, false);
  assert.equal(r.gap, "no_such_turn");
  assert.equal(r.of, 0);
});

test("recallTable renders one row — the resolved turn, not a listing — and is null on a gap (tables.js's own NOTHING convention)", () => {
  const folds = ["Q: a A: 1", "Q: b A: 2", "Q: c A: 3"];
  const built = recallTable(folds, "what was the second thing you told me");
  assert.equal(built.table.rows.length, 1);
  assert.equal(built.table.rows[0][1], "Q: b A: 2");
  assert.match(built.caption, /turn 2 of 3/);
  assert.equal(recallTable(folds, "what was the ninth thing you told me"), null);
});

test("detectTable and detectReflex do not fight over a question", () => {
  const q = "list the sources";
  assert.equal(detectTable(q), "sources");
  assert.equal(detectReflex(q), null);
  const r = "what surprised you most";
  assert.equal(detectTable(r), null);
  assert.equal(detectReflex(r), "surprise");
});

// ── act lines: deterministic at the resolution the ledger is read at ────────

test("act lines render deterministically, including acts this module was never taught", () => {
  const known = recordAct(emptyReflexLog(), { turn: 1, act: "retrieved", part: "part 1", refs: ["a.txt#0-9"] });
  assert.equal(actLine(known.entries[0]), "retrieved 1 passage(s) for part 1: [a.txt#0-9]");
  const alien = recordAct(emptyReflexLog(), { turn: 1, act: "future-act", zeta: "z", alpha: ["x", "y"] });
  assert.equal(actLine(alien.entries[0]), "future-act: alpha x, y · zeta z", "payload keys render sorted — no iteration-order drift");
});
