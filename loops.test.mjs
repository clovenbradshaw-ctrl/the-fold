// loops.test.mjs — the loop ledger's walls, against the REAL kernel task log
// and the REAL cube; the brief built by the REAL void-shape.js declaration;
// the record round trip through the REAL record-log.js.
//
// What is pinned: a loop cannot open without a closing condition; it cannot
// close without a witness; the model's say-so is not a witness (no act
// accepts one); reopening keeps the earlier closure and rises the ring;
// reopening is ORDERED by the chain and cascades only to later cells in the
// same group; a replayed record folds to the same cards; and no card carries
// the canon's notation (the cell is on the record, never in the words).

import test from "node:test";
import assert from "node:assert/strict";

import * as taskLog from "../eoreader7/native/kernel/task-log.js";
import { cellOf } from "../eoreader7/native/kernel/cube.js";
import { declareVoid, spaceFrom, fill, voidsOf } from "./void-shape.js";
import { serializeRecord, replayRecord } from "./record-log.js";
import { CHAIN } from "./turn-order.js";
import { declaredForm, declaredGenre } from "./shape.js";
import { namesIn } from "./ground-ladder.js";
import {
  makeLoops, foldLoops, cardsFor, orderLoops, lineFor, stateWord, loopId, voidKey,
  loopsFromBrief, fillLoopIdFor, loopsFromProgress, loopsFromResult, loopsFromObligations, closingsFromFillings,
  subjectOf, loopsFromQuestion, closingsFromDraft,
  BACKSTAGE, BACKSTAGE_WORDS, CELL_ASKS, ACTS, STATES,
} from "./loops.js";

const loops = makeLoops({ taskLog, cellOf });
const fresh = () => loops.createLoopLog();
const ok = (r) => { assert.ok(r.ok, `refused: ${JSON.stringify(r.refused)}`); return r.log; };

const OPEN = (over = {}) => ({ id: "loop:test:a", kind: "test", cell: "SEG", asks: "how wide it is", closesOn: "a span the material states", by: "test", turn: 1, ...over });

// ── the acts ────────────────────────────────────────────────────────────────

test("open refuses under-declaration, a non-cell, and the canon's letters in its words; a good open lands the cube's own cell fields", () => {
  const log = fresh();
  assert.equal(loops.open(log, { id: "x", kind: "k", cell: "SEG", asks: "a", by: "t" }).refused.type, "under_declared");
  assert.equal(loops.open(log, OPEN({ cell: "XYZ" })).refused.type, "not_a_cell");
  assert.equal(loops.open(log, OPEN({ asks: "the SEG cell" })).refused.type, "backstage_leak");
  assert.equal(loops.open(log, OPEN({ closesOn: "Ground·Figure agrees" })).refused.type, "backstage_leak");
  const r = loops.open(log, OPEN());
  assert.ok(r.ok && !r.existing);
  const e = r.log.entries[0];
  assert.equal(e.kind, taskLog.ENTRY_KINDS.PROPOSE);
  assert.equal(e.operator, "SEG");
  assert.equal(e.grain, "Ground");
  const c = cellOf("SEG", "Ground");
  assert.equal(e.terrain, c.terrain, "the terrain is the cube's, read off cellOf, never typed here");
  assert.equal(e.stance, c.stance);
  assert.equal(e.operator_basis, taskLog.OPERATOR_BASIS.DECLARED);
  const m = loops.open(fresh(), OPEN({ authored: "model" }));
  assert.equal(m.log.entries[0].operator_basis, taskLog.OPERATOR_BASIS.PRODUCED, "a model-authored loop says so in its basis");
});

test("close needs a witness; refuse needs a reason; waive needs a reason AND a name; nothing accepts the model's say-so", () => {
  let log = ok(loops.open(fresh(), OPEN()));
  assert.equal(loops.close(log, "loop:test:a", {}).refused.type, "no_witness");
  assert.equal(loops.close(log, "loop:test:a", { witness: {} }).refused.type, "no_witness");
  assert.equal(loops.refuse(log, "loop:test:a", {}).refused.type, "no_reason");
  assert.equal(loops.waive(log, "loop:test:a", { because: "not needed" }).refused.type, "waiver_needs_names");
  assert.equal(loops.waive(log, "loop:test:a", { by: "Michael" }).refused.type, "waiver_needs_names");
  assert.equal(loops.again(log, "loop:test:a", {}).refused.type, "no_trigger");
  assert.equal(loops.reopen(log, "loop:test:a", { trigger: "x" }).refused.type, "not_closed");
  assert.ok(!ACTS.includes("assert") && !ACTS.includes("say"), "there is no act by which a loop closes on words alone");
  log = ok(loops.close(log, "loop:test:a", { witness: { value: "1861 to 1865", source: "the material", count: 11 }, turn: 1 }));
  const l = foldLoops(log)[0];
  assert.equal(l.state, "closed");
  assert.equal(l.closedTurn, 1);
  assert.match(lineFor(l), /1861 to 1865 — from the material \(11 statements\)/);
  assert.equal(loops.evidence(log, "loop:test:a", { note: "late" }).refused.type, "loop_closed");
  assert.equal(loops.close(log, "loop:test:a", { witness: { value: "1861 to 1865", source: "the material", count: 11 } }).noop, true, "closing again on the same witness is a no-op, never a second closure");
  assert.equal(loops.close(log, "loop:test:a", { witness: { value: "other" } }).refused.type, "loop_closed");
});

test("a loop goes round again while open (ring rises, nothing closed) and reopens after closing (the earlier closure kept)", () => {
  let log = ok(loops.open(fresh(), OPEN()));
  log = ok(loops.again(log, "loop:test:a", { trigger: "two claims the material does not hold; rewriting", turn: 1 }));
  let l = foldLoops(log)[0];
  assert.equal(l.state, "open"); assert.equal(l.ring, 2);
  assert.match(lineFor(l), /Going round again \(round 2\): two claims/);
  assert.equal(stateWord(l), "round 2");
  log = ok(loops.close(log, "loop:test:a", { witness: { addresses: ["a.txt#1-9", "a.txt#10-20"] }, turn: 1 }));
  log = ok(loops.reopen(log, "loop:test:a", { trigger: "a later page places it wider", turn: 4 }));
  l = foldLoops(log)[0];
  assert.equal(l.state, "open"); assert.equal(l.ring, 3);
  assert.equal(l.previous.length, 1);
  assert.equal(l.previous[0].state, "closed");
  assert.match(lineFor(l), /Reopened \(round 3\): a later page places it wider\. Before: backed by 2 places in the material\./);
  assert.deepEqual(l.touched, ["1", "4"]);
  assert.equal(l.history.filter((h) => h.act === "reopen").length, 1);
});

test("reopening cascades to CLOSED loops at LATER cells in the same group only, in the chain's order, each with a trigger naming the cause", () => {
  const g = "void:lincoln|vice-president";
  let log = fresh();
  const cells = [["slot", "NUL"], ["anchor", "SIG"], ["extent", "SEG"], ["composition", "SYN"], ["cardinality", "DEF"], ["admission", "EVA"]];
  for (const [f, c] of cells) {
    log = ok(loops.open(log, OPEN({ id: `loop:void:${f}`, cell: c, asks: CELL_ASKS[f], group: g })));
    log = ok(loops.close(log, `loop:void:${f}`, { witness: { value: f }, turn: 1 }));
  }
  log = ok(loops.open(log, OPEN({ id: "loop:other", cell: "EVA", asks: "unrelated", group: "turn:c1t2" })));
  log = ok(loops.close(log, "loop:other", { witness: { value: "z" }, turn: 1 }));
  // admission is left open on purpose: an open loop is not "reopened".
  log = ok(loops.reopen(log, "loop:void:admission", { trigger: "x", turn: 2 }));
  const r = loops.reopen(log, "loop:void:extent", { trigger: "a page states 1861 to 1869", turn: 3 });
  assert.ok(r.ok);
  assert.deepEqual(r.cascaded, ["loop:void:composition", "loop:void:cardinality"], "later cells, closed, same group — admission was already open, the other group is untouched");
  const by = Object.fromEntries(foldLoops(r.log).map((l) => [l.id, l]));
  assert.equal(by["loop:void:slot"].state, "closed");
  assert.equal(by["loop:void:anchor"].state, "closed");
  assert.equal(by["loop:void:extent"].state, "open");
  assert.equal(by["loop:void:composition"].state, "open");
  assert.match(by["loop:void:composition"].trigger, /a page states 1861 to 1869 — following the reopening of "how wide it is"/);
  assert.equal(by["loop:void:composition"].history.at(-1).cascadedFrom, "loop:void:extent");
  assert.equal(by["loop:other"].state, "closed");
  const ordered = orderLoops(foldLoops(r.log)).map((l) => l.cell);
  assert.deepEqual(ordered, ordered.slice().sort((a, b) => CHAIN.indexOf(a) - CHAIN.indexOf(b)), "cards come out in the chain's order");
});

test("opening a loop that stands closed is 'asked again' on a LATER turn and a no-op on the same turn; contested and waived are their own states", () => {
  let log = ok(loops.open(fresh(), OPEN()));
  log = ok(loops.close(log, "loop:test:a", { witness: { value: "v" }, turn: 1 }));
  assert.equal(loops.open(log, OPEN({ turn: 1 })).noop, true);
  const again = loops.open(log, OPEN({ turn: 2 }));
  assert.ok(again.ok);
  const l = foldLoops(again.log)[0];
  assert.equal(l.state, "open"); assert.equal(l.ring, 2); assert.equal(l.trigger, "asked again");
  let log2 = ok(loops.open(fresh(), OPEN()));
  assert.equal(loops.contest(log2, "loop:test:a", { sides: [{ witness: "a.txt", says: "1861" }] }).refused.type, "one_side");
  log2 = ok(loops.contest(log2, "loop:test:a", { sides: [{ witness: "a.txt", says: "1861" }, { witness: "b.txt", says: "1865" }], turn: 1 }));
  assert.equal(foldLoops(log2)[0].state, "contested");
  assert.match(lineFor(foldLoops(log2)[0]), /Two witnesses disagree: a.txt says 1861; b.txt says 1865\. Left standing as contested/);
  log2 = ok(loops.waive(log2, "loop:test:a", { because: "not needed for this question", by: "Michael", turn: 1 }));
  assert.equal(foldLoops(log2)[0].state, "waived");
  assert.equal(stateWord(foldLoops(log2)[0]), "set aside");
  assert.ok(STATES.includes("contested") && STATES.includes("waived"));
});

test("the fold is a function of the entries: a record serialized and replayed through the kernel's own append folds to the same cards", () => {
  let log = ok(loops.open(fresh(), OPEN({ turn: 1 })));
  log = ok(loops.evidence(log, "loop:test:a", { note: "3 passages retrieved", evidence: ["a.txt#0-9"], turn: 1 }));
  log = ok(loops.spend(log, "loop:test:a", { asks: 2, turn: 1 }));
  log = ok(loops.close(log, "loop:test:a", { witness: { addresses: ["a.txt#0-9"] }, turn: 1 }));
  log = ok(loops.reopen(log, "loop:test:a", { trigger: "asked again", turn: 2 }));
  const lines = serializeRecord(log, 0);
  const r = replayRecord(lines, { createTaskLog: taskLog.createTaskLog, append: taskLog.append });
  assert.equal(r.gap, null);
  assert.equal(JSON.stringify(foldLoops(r.log)), JSON.stringify(foldLoops(log)));
  assert.equal(foldLoops(r.log)[0].spent.asks, 2);
});

// ── the cards ───────────────────────────────────────────────────────────────

test("cardsFor: the loops THIS turn touched, in the chain's order, carried when opened earlier; the rest still open are listed apart", () => {
  let log = ok(loops.open(fresh(), OPEN({ id: "loop:a", cell: "EVA", turn: 1 })));
  log = ok(loops.open(log, OPEN({ id: "loop:b", cell: "SIG", turn: 1 })));
  log = ok(loops.open(log, OPEN({ id: "loop:c", cell: "SEG", turn: 2 })));
  log = ok(loops.close(log, "loop:a", { witness: { value: "v" }, turn: 2 }));
  const { cards, standing } = cardsFor(foldLoops(log), { turn: 2 });
  assert.deepEqual(cards.map((c) => c.id), ["loop:c", "loop:a"]);
  assert.equal(cards[1].carried, true);
  assert.equal(cards[0].carried, false);
  assert.deepEqual(standing.map((s) => s.id), ["loop:b"]);
});

test("a turn number repeats across conversations: touches are keyed by conversation and turn, so one conversation's turn 2 never shows another's", () => {
  let log = ok(loops.open(fresh(), OPEN({ id: "loop:a", turn: 2, convo: 1 })));
  log = ok(loops.open(log, OPEN({ id: "loop:b", turn: 2, convo: 2 })));
  log = ok(loops.close(log, "loop:a", { witness: { value: "v" }, turn: 2, convo: 1 }));
  assert.deepEqual(cardsFor(foldLoops(log), { turn: 2, convo: 1 }).cards.map((c) => c.id), ["loop:a"]);
  assert.deepEqual(cardsFor(foldLoops(log), { turn: 2, convo: 2 }).cards.map((c) => c.id), ["loop:b"]);
  // The same loop named again from the OTHER conversation on its turn 2 is a later ask, not the same turn.
  const r = loops.open(log, OPEN({ id: "loop:a", turn: 2, convo: 2 }));
  assert.equal(foldLoops(r.log).find((l) => l.id === "loop:a").ring, 2);
  assert.equal(cardsFor(foldLoops(r.log), { turn: 2, convo: 2 }).cards.find((c) => c.id === "loop:a").carried, true);
});

// ── the adapters, on real organs ────────────────────────────────────────────

/** A brief in briefFor's own shape, its declaration from the REAL declareVoid and its standing from the REAL voidsOf. */
function briefWith({ extent = null, fillers = [], cardinality = null, reopened = false } = {}) {
  const declaration = declareVoid({
    slot: "vice president of Abraham Lincoln", anchor: "Abraham Lincoln", relation: "vice president of",
    extent, dimension: extent ? "years" : null, cardinality: reopened ? "enumerated" : cardinality,
    reopensOn: reopened ? `the material bound ${fillers.length} distinct fillers to this slot, against a question that did not ask for more than one` : null,
  }, { cellOf });
  let space = spaceFrom(declaration);
  for (const f of fillers) space = fill(space, f);
  return { schema: "EOVoidBrief@1", declaration, space, standing: voidsOf(space), evidence: { extent, mentions: extent ? 11 : 0, considered: extent ? 2 : 0 }, fillers, reopened, headPhrase: "vice president", connective: "of", grammaticalNumber: "singular" };
}

test("loopsFromBrief, question phase: nine cells and a fill loop; the declared cells close on the question's own words, the rest stay open", () => {
  const acts = loopsFromBrief(briefWith(), { phase: "question", turn: 1 });
  const { log, turnedAway } = loops.landAll(fresh(), acts);
  assert.deepEqual(turnedAway, []);
  const ls = foldLoops(log);
  assert.equal(ls.filter((l) => l.kind === "void-cell").length, 9);
  const by = Object.fromEntries(ls.map((l) => [l.id, l]));
  const key = voidKey("Abraham Lincoln", "vice president");
  assert.equal(by[loopId("void", key, "anchor")].state, "closed");
  assert.match(lineFor(by[loopId("void", key, "anchor")]), /Abraham Lincoln — from the question's own words/);
  assert.equal(by[loopId("void", key, "relation")].state, "closed");
  assert.equal(by[loopId("void", key, "extent")].state, "open");
  assert.match(lineFor(by[loopId("void", key, "extent")]), /Would close on: a reading of this/);
  assert.equal(by[loopId("void", key, "cardinality")].state, "open", "nothing in the question says how many");
  const fillId = fillLoopIdFor(briefWith());
  assert.equal(by[fillId].kind, "fill");
  assert.equal(by[fillId].cell, "DEF");
  assert.equal(by[fillId].state, "open");
  assert.match(by[fillId].asks, /who or what fills "vice president of Abraham Lincoln"/);
  assert.ok(ls.every((l) => l.group === `void:${key}`));
});

test("loopsFromBrief, material phase: the extent closes from the material with its count; fillers are evidence; a covered space closes the fill loop; an incomplete one leaves it open naming the hole", () => {
  const key = voidKey("Abraham Lincoln", "vice president");
  let log = loops.landAll(fresh(), loopsFromBrief(briefWith(), { phase: "question", turn: 1 })).log;
  const covered = briefWith({ extent: { from: 1861, to: 1865 }, fillers: [{ filler: "Hannibal Hamlin", span: { from: 1861, to: 1865 } }] });
  const r = loops.landAll(log, loopsFromBrief(covered, { phase: "material", turn: 1 }));
  assert.deepEqual(r.turnedAway, [], "re-naming the cells at the material phase is the same turn's same loops, never 'asked again'");
  const by = Object.fromEntries(foldLoops(r.log).map((l) => [l.id, l]));
  assert.equal(by[loopId("void", key, "extent")].state, "closed");
  assert.match(lineFor(by[loopId("void", key, "extent")]), /1861 to 1865 \(years\) — from the material \(11 statements\)/);
  const fillId = fillLoopIdFor(covered);
  assert.equal(by[fillId].state, "closed");
  assert.match(lineFor(by[fillId]), /Hannibal Hamlin/);
  assert.ok(by[fillId].evidence.some((e) => e.note === "Hannibal Hamlin, covering 1861 to 1865"));
  assert.match(by[fillId].evidence.at(-1).note, /every part of it is covered/, "the standing's own reason, verbatim, is the last arrival");
  // Incomplete: the fill loop stays open and names the stretch nothing covers.
  const short = briefWith({ extent: { from: 1861, to: 1869 }, fillers: [{ filler: "Hannibal Hamlin", span: { from: 1861, to: 1865 } }] });
  const r2 = loops.landAll(loops.landAll(fresh(), loopsFromBrief(short, { phase: "question", turn: 1 })).log, loopsFromBrief(short, { phase: "material", turn: 1 }));
  const fill2 = foldLoops(r2.log).find((l) => l.kind === "fill");
  assert.equal(fill2.state, "open");
  assert.match(lineFor(fill2), /So far: .*filled by nothing named so far/);
});

test("loopsFromBrief: the grammar's singular revised by the material is a round on the OPEN cardinality loop, then its close — never a reopen of something that never closed", () => {
  const b = briefWith({ extent: { from: 1861, to: 1865 }, fillers: [{ filler: "Hannibal Hamlin", span: { from: 1861, to: 1865 } }, { filler: "Andrew Johnson", span: { from: 1865, to: 1865 } }], reopened: true });
  const key = voidKey("Abraham Lincoln", "vice president");
  const q = loops.landAll(fresh(), loopsFromBrief(briefWith(), { phase: "question", turn: 1 })).log;
  const r = loops.landAll(q, loopsFromBrief(b, { phase: "material", turn: 1 }));
  assert.deepEqual(r.turnedAway, []);
  const card = foldLoops(r.log).find((l) => l.id === loopId("void", key, "cardinality"));
  assert.equal(card.state, "closed");
  assert.equal(card.ring, 2);
  assert.match(card.trigger, /2 distinct fillers/);
  assert.match(lineFor(card), /enumerated — from the material \(2 statements\)/);
});

test("loopsFromProgress: plan → planned → research → execute → correct → checked lands the plan closed, the part on round 2 then closed with its addresses, and one open loop per unbacked claim", () => {
  const scope = "c1t1";
  const parts = [{ id: "p1", label: "the succession", description: "" }, { id: "p2", label: "the dates", description: "" }];
  let log = fresh();
  const land = (acts) => { const r = loops.landAll(log, acts); assert.deepEqual(r.turnedAway, []); log = r.log; };
  land(loopsFromProgress("plan", null, {}, { scope, turn: 1 }));
  land(loopsFromProgress("planned", null, { parts, degraded: false }, { scope, turn: 1, planned: "model" }));
  land(loopsFromProgress("research", parts[0], { passages: [{ ref: "a.txt#0-9" }, { ref: "a.txt#10-19" }] }, { scope, turn: 1, parts }));
  land(loopsFromProgress("execute", parts[0], { promptChars: 900 }, { scope, turn: 1, parts }));
  land(loopsFromProgress("correct", parts[0], { failures: ["x", "y"] }, { scope, turn: 1, parts }));
  land(loopsFromProgress("checked", parts[0], { refs: ["a.txt#0-9"], unsupported: ["Hamlin was born in Maine in 1809."], open: ["no passage covers the second term"] }, { scope, turn: 1, parts }));
  const by = Object.fromEntries(foldLoops(log).map((l) => [l.id, l]));
  const plan = by[loopId("plan", scope)];
  assert.equal(plan.state, "closed"); assert.equal(plan.authored, "model");
  assert.match(lineFor(plan), /2 parts: the succession and the dates/);
  const p1 = by[loopId("part", scope, "p1")];
  assert.equal(p1.state, "closed"); assert.equal(p1.ring, 2); assert.equal(p1.authored, "model");
  assert.equal(p1.spent.asks, 2);
  assert.match(lineFor(p1), /backed by 1 place in the material/);
  assert.equal(p1.evidence[0].note, "2 passages retrieved");
  const unbacked = foldLoops(log).filter((l) => l.kind === "unbacked");
  assert.equal(unbacked.length, 1); assert.equal(unbacked[0].state, "open"); assert.match(unbacked[0].asks, /what backs "Hamlin was born/);
  const gap = foldLoops(log).filter((l) => l.kind === "gap");
  assert.equal(gap.length, 1);
  assert.equal(by[loopId("part", scope, "p2")].state, "open", "an unrun part stays open");
  // A flat turn's one part is the person's own question, not the model's.
  const flat = loops.landAll(fresh(), loopsFromProgress("planned", null, { parts: [{ id: "p1", label: "who was lincoln's vp?" }], degraded: false }, { scope: "c1t2", turn: 2, planned: "flat" })).log;
  assert.equal(foldLoops(flat).find((l) => l.kind === "part").authored, "instrument");
});

test("loopsFromResult: premise, address, position, witness, absent names and a misquote each land as a loop closed by its own organ, or refused by name", () => {
  const scope = "c1t3";
  const result = {
    sections: [{
      part: { label: "the question" },
      premises: { checked: 3, unverified: 1, contradicted: 0, rows: [{ text: "Hamlin was from Maine", flags: [], contradiction: null }] },
      addressed: { named: ["ref:auto:hamlin"], missing: [], all: true, missingNames: [], reasked: true, bound: [], unresolved: [], resolvedOn: null },
      position: "partly",
      witness: { rows: [{ sentence: "Hamlin served 1861 to 1865.", witness: "states" }, { sentence: "He later farmed.", witness: "refused", why: "no-testimony" }, { sentence: "He was tall.", witness: "skipped", why: "budget of 6 ask(s) spent" }], asks: 6 },
      voidsDeclared: [{ name: "Razumihin", refused: null }],
      misquote: { said: ["1860"], shouldBe: ["1861"], ref: "a.txt#5-40", matched: 0.9 },
    }],
  };
  const r = loops.landAll(fresh(), loopsFromResult(result, { scope, turn: 3 }));
  assert.deepEqual(r.turnedAway, []);
  const ls = foldLoops(r.log);
  const kinds = Object.fromEntries(ls.map((l) => [l.kind, l]));
  assert.equal(kinds.premise.state, "closed"); assert.match(lineFor(kinds.premise), /2 of 3 points in the sources; 1 not/);
  assert.equal(kinds.address.state, "closed"); assert.equal(kinds.address.ring, 2); assert.match(kinds.address.trigger, /asked once more/);
  assert.equal(kinds.position.state, "closed"); assert.match(lineFor(kinds.position), /partly/);
  assert.equal(kinds.witness.state, "closed"); assert.equal(kinds.witness.spent.asks, 6); assert.match(lineFor(kinds.witness), /1 sentence pointed at, 1 refused, 1 not asked \(1 past the budget\)/);
  assert.equal(ls.filter((l) => l.kind === "unbacked").length, 1, "the witness's own refusal opens what-backs-this");
  assert.equal(kinds.absent.state, "open"); assert.match(kinds.absent.asks, /"Razumihin"/);
  assert.equal(kinds.cut.state, "closed"); assert.match(lineFor(kinds.cut), /the sources say 1861, not 1860/);
  // A refused address check is a typed negative closure.
  const miss = loops.landAll(fresh(), loopsFromResult({ sections: [{ part: { label: "q" }, addressed: { named: [], missing: ["ref:auto:x"], all: false, missingNames: ["Razumihin"], reasked: true } }] }, { scope: "c1t4", turn: 4 })).log;
  const a = foldLoops(miss)[0];
  assert.equal(a.state, "refused"); assert.match(lineFor(a), /Could not close: the answer does not name Razumihin/);
  // The door that answered before any model.
  const door = loops.landAll(fresh(), loopsFromResult({ answeredBeforeTheModel: { addresses: ["a.txt#0-9"] }, sections: [] }, { scope: "c1t5", turn: 5 })).log;
  assert.match(lineFor(foldLoops(door)[0]), /answered with no model call; 1 address/);
});

test("loopsFromObligations: each clause is a loop whose state is the ledger's own standing", () => {
  const rows = [
    { id: "ob-1", text: "The header must hold still at every width.", standing: "satisfied", because: "measured at three widths", refs: ["index.html#10-40"] },
    { id: "ob-2", text: "Attachments are copied, never live-linked.", standing: "not-yet-visited" },
    { id: "ob-3", text: "The record is append-only.", standing: "violated", because: "a truncation was found" },
    { id: "ob-4", text: "No non-localhost host.", standing: "waived", because: "the test host", waivedBy: "Michael" },
  ];
  const ls = foldLoops(loops.landAll(fresh(), loopsFromObligations(rows, { turn: 1 })).log);
  assert.deepEqual(ls.map((l) => l.state), ["closed", "open", "refused", "waived"]);
  assert.match(lineFor(ls[0]), /measured at three widths/);
});

test("closingsFromFillings: a void filled on a later turn closes the fill loop that stands on it — carried across turns, on the record", () => {
  const b = briefWith({ extent: { from: 1861, to: 1865 } });
  let log = loops.landAll(fresh(), loopsFromBrief(b, { phase: "question", turn: 3 })).log;
  const fillId = fillLoopIdFor(b);
  log = ok(loops.evidence(log, fillId, { note: "declared as a gap on the record", voidId: "void:abraham lincoln|vice president|*", turn: 3 }));
  const acts = closingsFromFillings(foldLoops(log), [{ void: "void:abraham lincoln|vice president|*", by: "Hannibal Hamlin", witness: "hamlin.txt#12-80", at: 40 }], { turn: 9 });
  assert.equal(acts.length, 1);
  log = loops.landAll(log, acts).log;
  const l = foldLoops(log).find((x) => x.id === fillId);
  assert.equal(l.state, "closed"); assert.equal(l.closedTurn, 9);
  assert.match(lineFor(l), /filled on the record by Hannibal Hamlin \(hamlin.txt#12-80\)/);
  const { cards } = cardsFor(foldLoops(log), { turn: 9 });
  assert.equal(cards.length, 1); assert.equal(cards[0].carried, true);
});

// ── the question's own shape ────────────────────────────────────────────────

// A stand-in for the part-of-speech organ: the engine's own reads "about"
// as an adposition; this one answers only for the words these tests use.
const isAdp = (w) => ["about", "on", "of", "for"].includes(w);

test("the question's own loops: a poem about batman opens its form (verse, in lines), its subject (batman), and closes its ground as the model's own voice", () => {
  const task = "write a poem about batman";
  const acts = loopsFromQuestion(task, { genre: declaredGenre(task), form: declaredForm(task), subject: subjectOf(task, { isAdposition: isAdp }), hasMaterial: false, webOn: false, scope: "c1t1", turn: 1, convo: 1 });
  const r = loops.landAll(fresh(), acts);
  assert.deepEqual(r.turnedAway, []);
  const by = Object.fromEntries(foldLoops(r.log).map((l) => [l.kind, l]));
  assert.equal(by.form.state, "open"); assert.match(by.form.closesOn, /a poem, in lines/);
  assert.equal(by.subject.state, "open"); assert.match(by.subject.closesOn, /names batman/);
  assert.equal(by.ground.state, "closed"); assert.match(lineFor(by.ground), /the model's own voice, marked as such — from nothing attached/);
  // The draft closes them: a poem in lines that names Batman.
  const poem = "The cowl hides a city's fright,\nA shadowed vigil, day and night.\n\nBatman walks the streets, a silent vow,\nTo vanquish evil, fight for the now.";
  const r2 = loops.landAll(r.log, closingsFromDraft(poem, { genre: declaredGenre(task), form: declaredForm(task), subject: subjectOf(task, { isAdposition: isAdp }), scope: "c1t1", turn: 1, convo: 1 }));
  assert.deepEqual(r2.turnedAway, []);
  const after = Object.fromEntries(foldLoops(r2.log).map((l) => [l.kind, l]));
  assert.equal(after.form.state, "closed"); assert.match(lineFor(after.form), /4 lines in 2 stanzas/);
  assert.equal(after.subject.state, "closed"); assert.match(lineFor(after.subject), /batman — from the answer names it/);
  // Prose instead of verse: the form refuses by name. And the subject closes
  // FROM THE DISCOURSE (the real namesIn): the poem never says "batman" but
  // names Gotham and the Joker, and it is the answer to a question about him.
  const r3 = loops.landAll(r.log, closingsFromDraft("The cowl hides a city's fright, a shadowed vigil day and night. He walks the streets of Gotham, and the Joker laughs.", { genre: declaredGenre(task), form: declaredForm(task), subject: subjectOf(task, { isAdposition: isAdp }), scope: "c1t1", turn: 1, convo: 1, namesIn }));
  const bad = Object.fromEntries(foldLoops(r3.log).map((l) => [l.kind, l]));
  assert.equal(bad.form.state, "refused"); assert.match(lineFor(bad.form), /no stanza reads as verse/);
  assert.equal(bad.subject.state, "closed");
  assert.match(lineFor(bad.subject), /from the discourse: the question asked about it.*naming Gotham and Joker; the word itself never appears/);
  assert.match(bad.subject.witness.source, /never says the word/);
  // An answer that carries nothing is not about anything: refused, by name.
  const r4 = loops.landAll(r.log, closingsFromDraft("I can't.", { subject: subjectOf(task, { isAdposition: isAdp }), scope: "c1t1", turn: 1, convo: 1, namesIn }));
  assert.equal(foldLoops(r4.log).find((l) => l.kind === "subject").state, "refused");
});

test("a counted form rides the form loop and is checked by shape.js's own check; a factual question with nothing attached leaves its ground OPEN, and material closes it", () => {
  const task = "write four lines about the sea";
  const q = loopsFromQuestion(task, { genre: null, form: declaredForm(task), subject: subjectOf(task, { isAdposition: isAdp }), hasMaterial: false, webOn: false, scope: "s", turn: 1 });
  const log = loops.landAll(fresh(), q).log;
  const form = foldLoops(log).find((l) => l.kind === "form");
  assert.match(form.closesOn, /4 lines/);
  const ground = foldLoops(log).find((l) => l.kind === "ground");
  assert.equal(ground.state, "open"); assert.match(ground.closesOn, /the web switch turned on/);
  const three = loops.landAll(log, closingsFromDraft("one,\ntwo,\nthree.", { form: declaredForm(task), scope: "s", turn: 1 })).log;
  assert.equal(foldLoops(three).find((l) => l.kind === "form").state, "refused");
  assert.match(lineFor(foldLoops(three).find((l) => l.kind === "form")), /expected 4 lines, got 3/);
  // Material arriving mid-turn closes the ground loop through the research event.
  const withMaterial = loops.landAll(log, loopsFromProgress("research", { id: "p1", label: "the question" }, { passages: [{ ref: "sea.txt#0-9" }] }, { scope: "s", turn: 1, planned: "flat", parts: [{ id: "p1", label: "the question" }], hasMaterial: true, groundState: "open" })).log;
  assert.equal(foldLoops(withMaterial).find((l) => l.kind === "ground").state, "closed");
  // A subject that reads off no adposition is null, and no organ means no subject — never a guess.
  assert.equal(subjectOf("who was lincoln's vice president?", { isAdposition: isAdp }), null);
  assert.equal(subjectOf("write a poem about batman"), null);
  assert.equal(subjectOf("tell me about the observatory's director", { isAdposition: isAdp }).phrase, "the observatory's director");
});

test("a flat turn makes no plan card: its one part is 'the draft', and with nothing attached the check has nothing to check against", () => {
  const scope = "c1t9";
  let log = fresh();
  const land = (acts) => { const r = loops.landAll(log, acts); assert.deepEqual(r.turnedAway, []); log = r.log; };
  const parts = [{ id: "p1", label: "the question" }];
  land(loopsFromProgress("plan", null, {}, { scope, turn: 9, planned: "flat", hasMaterial: false }));
  land(loopsFromProgress("planned", null, { parts, degraded: false }, { scope, turn: 9, planned: "flat", hasMaterial: false }));
  land(loopsFromProgress("research", parts[0], { passages: [] }, { scope, turn: 9, planned: "flat", parts, hasMaterial: false }));
  land(loopsFromProgress("checked", parts[0], { refs: [], unsupported: [], open: ["no material matched: write a poem about batman"] }, { scope, turn: 9, planned: "flat", parts, hasMaterial: false }));
  const ls = foldLoops(log);
  assert.equal(ls.find((l) => l.kind === "plan"), undefined, "no plan was made, so no plan card");
  assert.equal(ls.filter((l) => l.kind === "gap").length, 0, "'no material matched' is not a gap when there is no material");
  const part = ls.find((l) => l.kind === "part");
  assert.equal(part.asks, "the draft");
  assert.equal(part.evidence.length, 0, "nothing-retrieved is not evidence when nothing was attached");
  assert.equal(part.state, "closed"); assert.match(lineFor(part), /nothing attached to check it against/);
});

// ── the wall: canon stays backstage ─────────────────────────────────────────

test("no card authored by this module carries the canon's notation — cells, terrains, stances, operator letters", () => {
  const b = briefWith({ extent: { from: 1861, to: 1869 }, fillers: [{ filler: "Hannibal Hamlin", span: { from: 1861, to: 1865 } }, { filler: "Andrew Johnson" }], reopened: true });
  const acts = [
    ...loopsFromBrief(briefWith(), { phase: "question", turn: 1 }),
    ...loopsFromBrief(b, { phase: "material", turn: 1 }),
    ...loopsFromProgress("planned", null, { parts: [{ id: "p1", label: "the succession" }], degraded: true }, { scope: "s", turn: 1 }),
    ...loopsFromProgress("research", { id: "p1", label: "the succession" }, { passages: [] }, { scope: "s", turn: 1 }),
    ...loopsFromProgress("checked", { id: "p1", label: "the succession" }, { refs: [], unsupported: ["x said y"], open: [] }, { scope: "s", turn: 1 }),
    ...loopsFromResult({ sections: [{ part: { label: "q" }, premises: { checked: 1, unverified: 0, contradicted: 1, rows: [{ text: "a", flags: [], contradiction: { ref: "a#1-2" } }] }, witness: { rows: [{ sentence: "s", witness: "refused" }], asks: 1 } }] }, { scope: "s", turn: 1 }),
  ];
  const ls = foldLoops(loops.landAll(fresh(), acts).log);
  assert.ok(ls.length > 12);
  for (const l of ls) {
    for (const text of [l.asks, l.closesOn, l.reopensOn ?? "", lineFor(l), stateWord(l), ...l.evidence.map((e) => e.note ?? "")]) {
      assert.ok(!BACKSTAGE_WORDS.test(text), `backstage leak in ${l.id}: ${JSON.stringify(text)}`);
      assert.ok(!BACKSTAGE.test(text), `notation leak in ${l.id}: ${JSON.stringify(text)}`);
    }
    assert.ok(CHAIN.includes(l.cell), "…while the cell IS on the record");
  }
  for (const v of Object.values(CELL_ASKS)) assert.ok(!BACKSTAGE_WORDS.test(v));
});
