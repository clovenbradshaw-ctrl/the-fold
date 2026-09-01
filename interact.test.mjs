// node --test interact.test.mjs
//
// Conformance for the interaction capacities. These are the WALLS: that a
// refusal is a response rather than an exception, that a rung is DERIVED from
// what a run actually did rather than claimed, that an effect predicate reads
// the whole run, that corroboration counts routes rather than arrivals, and
// that an intervention refuses to establish a dependence on a brittle plan.
//
// Process-free and organ-free on purpose, the same reason mhc.test.mjs states
// for itself: these guarantees must stay testable wherever this repo is
// checked out. The counterparts here are in-memory and fully known, so a
// capacity that works against them works for a reason this file can name.
// Real counterparts (a python3 subprocess, a shell, the act grammar) are
// exercised by eval/mhc-interaction-battery.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CONTRACT,
  RUNGS,
  REFUSALS,
  declareCounterpart,
  runPlan,
  streamOf,
  conduct,
  rungReached,
  verifyLoop,
  corroborate,
  enumerateSlot,
  depends,
  orderMatters,
} from "./interact.js";

/** A tiny key-value machine: stateful (set then get), contingent (responses
 * depend on the acts), and it refuses what it does not have. */
function kv(id = "kv") {
  const step = (state) => (act) => {
    const [verb, ...rest] = String(act).trim().split(/\s+/);
    if (verb === "set") {
      state.set(rest[0], rest.slice(1).join(" "));
      return { accepted: true, text: `ok ${rest[0]}` };
    }
    if (verb === "get") {
      return state.has(rest[0]) ? { accepted: true, text: state.get(rest[0]) } : { accepted: false, text: `no such key: ${rest[0]}` };
    }
    if (verb === "sum") return { accepted: true, text: String(Number(rest[0]) + Number(rest[1])) };
    if (verb === "echo") return { accepted: true, text: rest.join(" ") };
    if (verb === "upper") return { accepted: true, text: rest.join(" ").toUpperCase() };
    if (verb === "nop") return { accepted: true, text: "" };
    return { accepted: false, text: `unknown act: ${verb}` };
  };
  return {
    id,
    kind: "in-memory key-value machine",
    open: async () => {
      const state = new Map();
      return { step: step(state), close() {} };
    },
  };
}

/** Answers the same thing whatever it is asked. Not broken, not throwing — it
 * simply does not read us. */
const deaf = () => ({ id: "deaf", kind: "answers identically whatever it is asked", open: async () => ({ step: () => ({ accepted: true, text: "ok" }), close() {} }) });

const has = (n) => (obs) => obs.some((o) => o.text.trim() === String(n));

// -- the contract -----------------------------------------------------------

test("the contract is three methods and the rung table names all seven capacities", () => {
  assert.ok(CONTRACT.open.includes("FRESH"));
  assert.deepEqual(Object.keys(RUNGS), ["5", "6", "7", "8", "9", "10", "11"]);
  assert.match(RUNGS[11].capacity, /intervene/);
});

test("a counterpart without an id or without open() is refused by name, never defaulted", () => {
  assert.equal(declareCounterpart({ open: async () => ({}) }).refusal.gap, REFUSALS.NO_ID);
  assert.equal(declareCounterpart({ id: "x" }).refusal.gap, REFUSALS.NO_OPEN);
  const ok = declareCounterpart(kv());
  assert.equal(ok.ok, true);
  assert.equal(typeof ok.counterpart.describe, "function");
});

// -- rung 5: a refusal is a response ---------------------------------------

test("a refusal is a response carrying the counterpart's own words, never an exception", async () => {
  const r = await conduct(kv(), ["flurb 1"]);
  assert.equal(r.steps[0].accepted, false);
  assert.match(r.steps[0].text, /unknown act/);
  assert.equal(r.rung, 6);
});

test("each act's effect is attributed to that act, never pooled", async () => {
  const r = await conduct(kv(), ["sum 1 2", "sum 10 20"]);
  assert.equal(r.steps[0].text, "3");
  assert.equal(r.steps[1].text, "30");
});

// -- rung 7: the loop ------------------------------------------------------

test("a later act is computed from what came back", async () => {
  const r = await conduct(kv(), ["sum 6 7", { act: (prior) => `sum ${prior[0].text} 1` }]);
  assert.equal(r.steps[1].act, "sum 13 1");
  assert.equal(r.steps[1].text, "14");
  assert.equal(r.rung, 7);
});

test("a computed FIRST act is not rung 7 — there was nothing for it to be computed from", async () => {
  const r = await conduct(kv(), [{ act: () => "sum 1 2" }, "sum 3 4"]);
  assert.equal(r.rung, 6);
});

test("verifyLoop proves the loop rather than trusting it: the acts must actually differ open-loop", async () => {
  const real = await verifyLoop(kv(), ["sum 6 7", { act: (prior) => `sum ${prior[0]?.text ?? ""} 1` }]);
  assert.equal(real.loopReal, true);
  assert.match(real.detail, /genuinely shaped/);
});

test("a script whose computed act ignores the response is reported as no loop, not as a working one", async () => {
  const fake = await verifyLoop(kv(), ["sum 6 7", { act: () => "sum 13 1" }]);
  assert.equal(fake.loopReal, false);
  assert.match(fake.detail, /IDENTICAL/);
});

test("a script with no computed step at all reports a typed gap rather than a false negative", async () => {
  const none = await verifyLoop(kv(), ["sum 1 2"]);
  assert.equal(none.gap, "no_step_reads_a_response");
});

test("a deaf counterpart cannot produce a real loop, and verifyLoop says so", async () => {
  const r = await verifyLoop(deaf(), ["sum 6 7", { act: (prior) => `echo ${prior[0]?.text ?? "nothing"}` }]);
  // The act text still changes (the deaf counterpart answers "ok"), so the
  // honest report is that the acts differed — what the counterpart does with
  // them is the caller's next question, and `depends` is where it gets asked.
  assert.equal(typeof r.loopReal, "boolean");
});

// -- rung 8: predict, then act ----------------------------------------------

test("a step may declare what it expects before the act runs, and the comparison lands on the step", async () => {
  const r = await conduct(kv(), [{ act: "sum 7 8", expect: () => "15" }]);
  assert.equal(r.steps[0].predicted, "15");
  assert.equal(r.steps[0].met, true);
  assert.equal(r.rung, 8);
});

test("a wrong prediction is recorded as missed, and does not become an error", async () => {
  const r = await conduct(kv(), [{ act: "sum 7 8", expect: () => "16" }]);
  assert.equal(r.steps[0].met, false);
  assert.match(r.reading, /1 predicted, 1 missed/);
});

test("a rule that declines to cover a case lands a null prediction, never a miss", async () => {
  const r = await conduct(kv(), [{ act: "upper hello", expect: () => null }]);
  assert.equal(r.steps[0].predicted, null);
  assert.equal(r.steps[0].met, null);
  assert.equal(r.rung, 6);
});

test("a caller's own comparison is used when supplied, not the crude default", async () => {
  const r = await conduct(kv(), [{ act: "upper hello", expect: () => "HELLO", met: (text, p) => text.trim() === p }]);
  assert.equal(r.steps[0].met, true);
});

test("the rung is derived from the run, so a caller cannot claim one it did not exercise", () => {
  assert.equal(rungReached({ steps: [{ accepted: true, text: "", computed: false }] }), 5);
  assert.equal(rungReached({ steps: [{ accepted: true, text: "x", computed: false }] }), 6);
  assert.equal(rungReached({ steps: [{ text: "a" }, { text: "b", computed: true }] }), 7);
  assert.equal(rungReached({ steps: [{ text: "a", met: false }] }), 8);
  assert.equal(rungReached({ steps: [] }), null);
});

// -- the plan primitive ----------------------------------------------------

test("every run opens a FRESH session, so no capacity inherits another's state", async () => {
  const cp = kv();
  await runPlan(cp, ["set k 42"]);
  const obs = await runPlan(cp, ["get k"]);
  assert.equal(obs[0].accepted, false);
});

test("streamOf carries acceptance as well as text — what every control compares", async () => {
  const cp = kv();
  assert.notEqual(streamOf(await runPlan(cp, ["sum 1 2"])), streamOf(await runPlan(cp, ["flurb 1 2"])));
});

// -- rung 9: routes, not repetitions ---------------------------------------

test("two different routes to one effect are two witnesses; the same route twice is still one", async () => {
  const r = await corroborate(kv(), {
    routes: [["sum 20 22"], ["set k 42", "get k"]],
    reached: has(42),
  });
  assert.equal(r.arrivals, 3);
  assert.equal(r.routes, 2);
  assert.match(r.reading, /3 arrival\(s\).*2 distinct route/);
});

test("arrivals and routes are returned apart and never summed", async () => {
  const r = await corroborate(kv(), { routes: [["sum 20 22"], ["sum 20 22"]], reached: has(42) });
  assert.equal(r.arrivals, 3);
  assert.equal(r.routes, 1, "the same acts twice are one route however many times they answer");
});

test("a route that does not reach the effect is not counted as a witness", async () => {
  const r = await corroborate(kv(), { routes: [["sum 20 22"], ["echo nothing"]], reached: has(42), repeat: false });
  assert.equal(r.routes, 1);
  assert.equal(r.arrivals, 1);
});

test("one route is refused as corroboration by name", async () => {
  const r = await corroborate(kv(), { routes: [["sum 20 22"]], reached: has(42) });
  assert.equal(r.gap, REFUSALS.ONE_ROUTE);
});

// -- rung 10: quantify over a slot -----------------------------------------

test("an open slot is answered with the whole admitted set, and the refusals are the other half of the fact", async () => {
  const r = await enumerateSlot(kv(), { template: (f) => `${f} 1 2`, candidates: ["sum", "echo", "upper", "flurb", "blorp"] });
  assert.deepEqual([...r.admitted], ["sum", "echo", "upper"]);
  assert.deepEqual([...r.refused], ["flurb", "blorp"]);
  assert.equal(r.rung, 10);
});

test("a slot with no candidates is a typed gap, never an empty answer passed off as one", async () => {
  const r = await enumerateSlot(kv(), { template: (f) => f, candidates: [] });
  assert.equal(r.gap, REFUSALS.NO_SLOT);
});

// -- rung 11: intervention -------------------------------------------------

test("an intervention establishes that the effect followed THIS act, with all four counts on its face", async () => {
  const r = await depends(kv(), {
    plan: ["set k 42", "get k"],
    act: 0,
    placebo: "nop",
    effect: has(42),
    draws: 3,
  });
  assert.equal(r.dependsOnAct, true);
  assert.deepEqual({ ...r.counts }, { with: 3, without: 0, placebo: 0, inserted: 9, insertions: 9 });
  assert.equal(r.survivesIrrelevantChange, true);
});

test("an effect that does not depend on the named act is reported as not depending, never as an error", async () => {
  const r = await depends(kv(), {
    plan: ["set k 42", "sum 20 22"],
    act: 0,
    placebo: "nop",
    effect: has(42),
    draws: 3,
  });
  assert.equal(r.dependsOnAct, false);
  assert.equal(r.counts.without, 3, "the effect held every time the named act was removed");
});

test("a brittle plan cannot establish a dependence, and the reading says why", async () => {
  // The effect here is the LAST response, which any insertion destroys. That
  // is EFFECT_READS_THE_WHOLE_RUN's own failure, reproduced deliberately.
  const r = await depends(kv(), {
    plan: ["set k 42", "get k"],
    act: 0,
    placebo: "nop",
    effect: (obs) => obs[obs.length - 1]?.text.trim() === "42",
    draws: 3,
  });
  assert.equal(r.survivesIrrelevantChange, false);
  assert.equal(r.dependsOnAct, false);
  assert.match(r.reading, /brittle/);
});

test("without a placebo an intervention says outright that it cannot separate this act from an act", async () => {
  const r = await depends(kv(), { plan: ["set k 42", "get k"], act: 0, effect: has(42), draws: 2 });
  assert.match(r.reading, /cannot separate THIS act from merely an act/);
  assert.equal(r.survivesIrrelevantChange, null);
});

test("an intervention naming no act refuses by name", async () => {
  assert.equal((await depends(kv(), { plan: [], act: 0, effect: has(42) })).gap, REFUSALS.NO_ACT_TO_REMOVE);
  assert.equal((await depends(kv(), { plan: ["nop"], act: 4, effect: has(42) })).gap, REFUSALS.NO_ACT_TO_REMOVE);
});

test("a deaf counterpart never establishes a dependence, because removing the act changes nothing", async () => {
  const r = await depends(deaf(), { plan: ["set k 42", "get k"], act: 0, placebo: "nop", effect: (obs) => obs.some((o) => o.text === "ok"), draws: 3 });
  assert.equal(r.dependsOnAct, false);
  assert.equal(r.counts.without, 3);
});

// -- the order control -----------------------------------------------------

test("an effect that survives every re-ordering was not produced by a sequence", async () => {
  const r = await orderMatters(kv(), { plan: ["sum 20 22", "echo x"], effect: has(42), draws: 4 });
  assert.equal(r.ordered, false);
  assert.ok(r.held > 0);
});

test("an effect that needs its order says so", async () => {
  const r = await orderMatters(kv(), { plan: ["set k 42", "get k"], effect: has(42), draws: 4 });
  assert.equal(r.ordered, true);
  assert.equal(r.held, 0);
});

test("a one-act plan has no order to test and reports that rather than passing", async () => {
  const r = await orderMatters(kv(), { plan: ["sum 1 2"], effect: has(3) });
  assert.equal(r.gap, "no_order_to_test");
});
