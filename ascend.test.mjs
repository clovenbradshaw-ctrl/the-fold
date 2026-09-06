// ascend.test.mjs — P152/P153. Legal moves generated and recursed; the low
// sets the possibility of the high, the high the probability of the low.
import test from "node:test";
import assert from "node:assert/strict";
import { legalMoves, rezero, reading, groundIsAnchored, descend, descentChanges,
         ascend, nextGrain, GRAIN_CYCLE, EXECUTABLE, LICENSING_IS_NOT_EXPECTATION } from "./ascend.js";

const CHAIN = ["NUL", "SIG", "INS", "SEG", "CON", "SYN", "DEF", "EVA", "REC"];
const span = (src, i) => ({ ref: `${src}#${i}00-${i}99`, text: `sentence ${i} of ${src}` });

test("the walk's ORDER is derived from the algebra, not written down", () => {
  // P149's hand-written walk was SIG -> INS -> CON. This generates exactly
  // that from the chain and the executable set, which is how it was found out
  // that the walk was never a design: it is the only executable path.
  let state = { established: [] };
  const order = [];
  for (let i = 0; i < 4; i++) {
    const legal = legalMoves(state, { chain: CHAIN }).filter((m) => m.legal);
    if (!legal.length) break;
    order.push(legal[0].cell);
    state = { established: [...state.established, { cell: legal[0].cell }] };
  }
  assert.deepEqual(order, ["SIG·Figure", "INS·Figure", "CON·Figure"]);
});

test("UP IS POSSIBILITY: a move whose preconditions are unmet is not legal, and says what blocks it", () => {
  const m = legalMoves({ established: [] }, { chain: CHAIN });
  const con = m.find((x) => x.cell === "CON·Figure");
  assert.equal(con.legal, false);
  assert.deepEqual(con.blockedBy, ["SIG·Figure", "INS·Figure"]);
});

test("an unexecutable precondition may not block forever — that would be a bug wearing a law", () => {
  // NUL and SEG precede CON in the chain but have no executable organ. If they
  // were required, every move would be illegal permanently.
  const m = legalMoves({ established: [{ cell: "SIG·Figure" }, { cell: "INS·Figure" }] }, { chain: CHAIN });
  assert.equal(m.find((x) => x.cell === "CON·Figure").legal, true);
});

test("DOWN IS PROBABILITY: what carried findings upward is expected below", () => {
  const d = descend([{ establishedSpans: [span("a", 1), span("a", 1), span("b", 1)] }]);
  assert.ok(d.weight("a#100-199") > d.weight("b#100-199"));
  assert.equal(d.weight("never-seen"), 0);
  assert.equal(d.informative, true);
});

test("a level where everything carried equally says nothing, and reports that", () => {
  const d = descend([{ establishedSpans: [span("a", 1), span("b", 1), span("c", 1)] }]);
  assert.equal(d.informative, false, "one distinct weight is no expectation at all");
});

test("THE WALL: probability may never become possibility", () => {
  // A descent that made an illegal move legal would be expectation overruling
  // licensing — how a reader talks itself into what it already believed.
  const d = descend([{ establishedSpans: [span("a", 1)] }]);
  const withWeights = legalMoves({ established: [], weight: d.weight }, { chain: CHAIN });
  const without = legalMoves({ established: [] }, { chain: CHAIN });
  assert.deepEqual(withWeights, without, "legalMoves must be blind to weights");
  assert.ok(LICENSING_IS_NOT_EXPECTATION.rule.includes("never reads"));
});

test("THE GRAIN CYCLES — which is how three grains give unbounded height", () => {
  assert.deepEqual(GRAIN_CYCLE, ["Ground", "Figure", "Pattern"]);
  assert.equal(nextGrain("Ground"), "Figure");
  assert.equal(nextGrain("Figure"), "Pattern");
  assert.equal(nextGrain("Pattern"), "Ground", "a Pattern established IS the Ground of the next level");
});

test("RE-ZEROING does not narrow — it re-presents what was established, one grain up", () => {
  const state = { ground: [span("a", 1)], established: [{ spans: [span("a", 1), span("a", 2), span("b", 1)] }] };
  const r = rezero(state, { grain: "Figure" });
  assert.equal(r.ok, true);
  assert.equal(r.grain, "Pattern");
  assert.equal(r.ground.length, 3, "all three survive: re-zeroing is not a funnel");
  assert.ok(r.ground.every((g) => g.from.length), "and every one carries where it came from");
});

test("THE REGRESS: a level whose ground reaches no bytes is refused as self_referential", () => {
  const state = { established: [{ spans: [{ ref: "reading:h0", text: "a note about the reading" }] }] };
  const r = rezero(state, { grain: "Figure" });
  assert.equal(r.ok, false);
  assert.equal(r.gap, "self_referential");
});

test("METACOGNITION accompanies the material, and may never stand alone", () => {
  const rec = reading([{ height: 0, established: 2, blocked: ["CON·Figure"] }]);
  assert.ok(rec.length >= 2 && rec.every((r) => r.aboutTheReading));
  assert.equal(groundIsAnchored(rec).ok, false, "a ground of only the reading's record is the watcher's regress");
  assert.equal(groundIsAnchored(rec).gap, "self_referential");
  assert.equal(groundIsAnchored([...rec, span("a", 1)]).ok, true, "beside material it is legal");
  assert.equal(groundIsAnchored([...rec, span("a", 1)]).material, 1);
});

test("the recursion stops at a real ceiling, and says when it did NOT", async () => {
  const ground = ["a.txt", "b.txt"].flatMap((s) => [span(s, 1), span(s, 2)]);
  const apply = async (m, st) => ({ established: st.ground.map((g) => ({ spans: [g] })) });
  const r = await ascend({ ground, apply, chain: CHAIN, maxHeight: 4 });
  assert.ok(r.levels.length > 0);
  // With every span surviving every level, this walk cannot exhaust itself —
  // so it MUST report that it hit the guard rather than claim a ceiling.
  assert.equal(r.guarded, true);
  assert.match(r.stopped, /did NOT find its own ceiling/);
});

test("a walk that establishes nothing stops at a fixed point, not at the guard", async () => {
  const r = await ascend({ ground: [span("a", 1)], apply: async () => ({ established: [] }), chain: CHAIN, maxHeight: 9 });
  assert.equal(r.guarded, undefined);
  assert.match(r.stopped, /fixed point/);
  assert.equal(r.height, 0);
});

test("THE CONTROL: a descent that changes nothing below is reported as decorative", async () => {
  const ground = [span("a", 1), span("b", 1)];
  // An `apply` that ignores the weight entirely — the descent cannot matter.
  const blind = async (m, st) => ({ established: st.ground.map((g) => ({ spans: [g] })) });
  const d = descend([{ establishedSpans: [span("a", 1)] }]);
  const r = await descentChanges({ ground, apply: blind, chain: CHAIN, prior: d });
  assert.equal(r.changed, false);
  assert.match(r.why, /decorative/);
});

test("and a descent that DOES change what is established below is reported as real", async () => {
  const ground = [span("a", 1), span("b", 1)];
  // An `apply` that attends to weight: it keeps only what the level above expects.
  const attentive = async (m, st) => ({
    established: st.ground.filter((g) => !st.weight || st.weight(g.ref) > 0).map((g) => ({ spans: [g] })),
  });
  const d = descend([{ establishedSpans: [span("a", 1)] }]);
  const r = await descentChanges({ ground, apply: attentive, chain: CHAIN, prior: d });
  assert.equal(r.changed, true);
  assert.ok(r.with < r.without, "the prior narrowed what was attended to");
});

test("the three executable cells are all one grain — the finding this file exists to record", () => {
  assert.deepEqual(EXECUTABLE, ["SIG·Figure", "INS·Figure", "CON·Figure"]);
  assert.equal(new Set(EXECUTABLE.map((c) => c.split("·")[1])).size, 1);
});
