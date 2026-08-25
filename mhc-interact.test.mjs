// node --test mhc-interact.test.mjs
//
// Conformance for the interaction door. These are the WALLS — the counterpart
// contract, the derived-probe rule, each arm's own licensing, and the one
// claim this module is really making: that a counterpart which does not read
// our acts falls out as UNMEASURED rather than passing.
//
// Deliberately organ-free and process-free, for the reason mhc.test.mjs
// already states about itself: the machinery's guarantees must stay testable
// wherever this repo is checked out, including where the sibling engine is
// absent and where no interpreter may be spawned. The counterparts here are
// in-memory stubs whose behaviour is fully known, so an item that passes
// against them passes for a reason this file can name. The ladder bound to
// REAL counterparts is eval/mhc-interaction-battery.mjs, a re-runnable driver.

import { test } from "node:test";
import assert from "node:assert/strict";

import { runBattery, stageFrom, contentIndependence } from "./mhc.js";
import {
  CONTRACT,
  PROBE_SURFACE,
  ENV_REFUSALS,
  declareCounterpart,
  deriveProbes,
  runPlan,
  streamOf,
  blindedArm,
  interactionLadder,
} from "./mhc-interact.js";

// -- a fully known counterpart ---------------------------------------------
//
// A tiny key-value machine. It is stateful (set then get), contingent (its
// responses depend on the acts), and it refuses what it does not have. Eight
// slot candidates on purpose: the order-10 `arbitrary` arm is guessing, and
// its discrimination is a property of the pool.

function kvCounterpart(id = "kv") {
  const step = (state) => (act) => {
    const [verb, ...rest] = String(act).trim().split(/\s+/);
    if (verb === "set") {
      state.set(rest[0], rest.slice(1).join(" "));
      return { accepted: true, text: `ok ${rest[0]}` };
    }
    if (verb === "get") {
      return state.has(rest[0])
        ? { accepted: true, text: state.get(rest[0]) }
        : { accepted: false, text: `no such key: ${rest[0]}` };
    }
    if (verb === "sum") return { accepted: true, text: String(Number(rest[0]) + Number(rest[1])) };
    if (verb === "echo") return { accepted: true, text: rest.join(" ") };
    if (verb === "upper") return { accepted: true, text: rest.join(" ").toUpperCase() };
    if (verb === "len") return { accepted: true, text: String(rest.join(" ").length) };
    if (verb === "first") return { accepted: true, text: rest[0] ?? "" };
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
    describe: () => ({
      accepted: "sum 1 2",
      foreign: "flurb 1 2",
      pair: [
        { act: "sum 1 2", effect: (t) => t.trim() === "3" },
        { act: "sum 10 20", effect: (t) => t.trim() === "30" },
      ],
      chain: {
        probe: "sum 6 7",
        read: (t) => Number(t.trim()),
        use: (v) => `sum ${v} 1`,
        check: (t, v) => t.trim() === String(v + 1),
      },
      rule: {
        seen: [[1, 2], [3, 4]],
        novel: [5, 6],
        uncovered: ["x", 1],
        act: (c) => `sum ${c[0]} ${c[1]}`,
        predict: (c) => (typeof c[0] === "number" && typeof c[1] === "number" ? c[0] + c[1] : null),
        check: (t, p) => t.trim() === String(p),
      },
      routes: {
        routes: [["sum 20 22"], ["set k 42", "get k"]],
        reached: (obs) => obs.some((o) => o.text.trim() === "42"),
      },
      slot: {
        template: (f) => `${f} 1 2`,
        candidates: ["sum", "echo", "upper", "len", "first", "flurb", "blorp", "zzz"],
        empty: "nothinghere",
      },
      intervention: {
        plan: ["set k 42", "get k"],
        omit: 0,
        placebo: "nop",
        // Quantified over the WHOLE list on purpose — see
        // EFFECT_MUST_NOT_READ_ONLY_THE_LAST_RESPONSE in mhc-interact.js.
        effect: (obs) => obs.some((o) => o.text.trim() === "42"),
      },
    }),
  };
}

/** A counterpart with an entirely different vocabulary — every act above is
 * foreign to it. This is the `discrimination` control, and it is a REAL
 * sibling rather than a stub written to fail the task. */
function strangerCounterpart() {
  return {
    id: "stranger",
    kind: "in-memory machine with a disjoint vocabulary",
    open: async () => ({
      step: (act) => (String(act).trim().startsWith("add") ? { accepted: true, text: "ok" } : { accepted: false, text: `unknown act: ${act}` }),
      close() {},
    }),
    describe: () => ({ accepted: "add 1", foreign: "sum 1 2" }),
  };
}

/** THE WALL THIS MODULE EXISTS FOR: a counterpart that answers the same thing
 * whatever it is asked. It is not broken and it does not throw — it simply
 * does not read us. Every arm's perturbation therefore reaches nothing. */
function deafCounterpart() {
  const kv = kvCounterpart("deaf");
  return {
    ...kv,
    id: "deaf",
    kind: "answers identically whatever it is asked",
    open: async () => ({ step: () => ({ accepted: true, text: "ok" }), close() {} }),
  };
}

const ASSEMBLY = "EXPERIMENT — mhc-interact.js's ladder against in-memory stubs; no engine, no process, no model.";

async function battery(counterpart, sibling) {
  const ladder = interactionLadder({ counterpart, sibling, assembly: ASSEMBLY, draws: 5, seed: 0 });
  return runBattery(ladder.items, {}, { assembly: ASSEMBLY, priors: [], material: counterpart.id });
}

// -- the contract -----------------------------------------------------------

test("the contract and the counterpart declaration are interact.js's, re-exported — not a second copy", async () => {
  const organ = await import("./interact.js");
  assert.equal(CONTRACT, organ.CONTRACT);
  assert.equal(declareCounterpart, organ.declareCounterpart);
  assert.equal(runPlan, organ.runPlan);
  assert.equal(streamOf, organ.streamOf);
});

// -- probes are derived, and a missing one is a typed gap -------------------

test("every probe the surface omits is reported as a gap naming what it was for", () => {
  const { probes, gaps } = deriveProbes({ accepted: "a", foreign: "b" });
  assert.deepEqual(Object.keys(probes).sort(), ["accepted", "foreign"]);
  assert.equal(gaps.length, Object.keys(PROBE_SURFACE).length - 2);
  assert.ok(gaps.every((g) => g.gap === ENV_REFUSALS.NO_PROBE));
  assert.ok(gaps.find((g) => g.probe === "intervention").detail.includes("do-operator"));
});

test("a counterpart offering no probe at an order lands unmeasured there, never a fabricated specimen", async () => {
  const report = await battery(strangerCounterpart(), kvCounterpart());
  const six = report.items.find((i) => i.order === 6);
  assert.equal(six.status, "unmeasured");
  assert.match(six.detail, /declares no "pair" probe/);
});

// -- running a plan ---------------------------------------------------------

test("a plan step may be a function of the responses so far — that function is the closed loop", async () => {
  const cp = kvCounterpart();
  const obs = await runPlan(cp, ["sum 6 7", (o) => `sum ${o[0].text} 1`]);
  assert.equal(obs[1].act, "sum 13 1");
  assert.equal(obs[1].text, "14");
});

test("blind replay computes every act from an empty history, so the loop is genuinely open", async () => {
  const cp = kvCounterpart();
  const obs = await runPlan(cp, ["sum 6 7", (o) => `sum ${o[0]?.text ?? ""} 1`], { blind: true });
  assert.equal(obs[1].act, "sum  1");
  assert.notEqual(obs[1].text, "14");
});

test("each run opens a FRESH session, so no arm inherits another's state", async () => {
  const cp = kvCounterpart();
  await runPlan(cp, ["set k 42"]);
  const obs = await runPlan(cp, ["get k"]);
  assert.equal(obs[0].accepted, false);
});

test("streamOf carries acceptance as well as text — the thing every licensing check compares", async () => {
  const cp = kvCounterpart();
  assert.notEqual(streamOf(await runPlan(cp, ["sum 1 2"])), streamOf(await runPlan(cp, ["flurb 1 2"])));
});

// -- the ladder against a known-good counterpart ----------------------------

test("a contingent, stateful counterpart completes the whole ladder, orders 5 through 11", async () => {
  const report = await battery(kvCounterpart(), strangerCounterpart());
  const failures = report.items.filter((i) => i.status !== "passed");
  assert.deepEqual(
    failures.map((f) => `${f.order}:${f.status}:${f.reason ?? ""}:${f.detail ?? ""}`),
    [],
  );
  assert.equal(report.items.length, 7);
});

test("axiom 1 holds across the ladder: every item's constituent is exactly one order down", async () => {
  const report = await battery(kvCounterpart(), strangerCounterpart());
  assert.equal(report.axiom1.held, true);
});

test("the stage is readable and is capped where the ladder stops, not extrapolated past it", async () => {
  const report = await battery(kvCounterpart(), strangerCounterpart());
  const stage = stageFrom(report);
  assert.equal(stage.stage, 11);
});

// -- the wall: a counterpart that does not read us --------------------------

test("a deaf counterpart is UNMEASURED at the floor, never passed — its responses do not move", async () => {
  const report = await battery(deafCounterpart(), strangerCounterpart());
  const five = report.items.find((i) => i.order === 5);
  assert.equal(five.status, "unmeasured");
  assert.equal(five.reason, "unlicensed_perturbation");
  assert.match(five.detail, /did not reach what the task reads/);
});

test("nothing in the deaf report is reported as passed at any order", async () => {
  const report = await battery(deafCounterpart(), strangerCounterpart());
  assert.deepEqual(report.items.filter((i) => i.status === "passed"), []);
});

test("a deaf counterpart yields no stage at all, rather than a low one", async () => {
  const report = await battery(deafCounterpart(), strangerCounterpart());
  const stage = stageFrom(report);
  assert.notEqual(stage.stage, 5);
  assert.ok(stage.stage == null || stage.stage < 5);
});

// -- the arms, each doing its own job ---------------------------------------

test("the order-7 lowerOrder arm is open-loop replay, and blinding is what it reports", async () => {
  const cp = kvCounterpart();
  const ladder = interactionLadder({ counterpart: cp, sibling: strangerCounterpart(), assembly: ASSEMBLY, draws: 5, seed: 0 });
  const seven = ladder.items.find((i) => i.order === 7);
  const arm = await seven.arms.lowerOrder({});
  assert.equal(arm.completed, false);
  assert.equal(arm.perturbed, true);
  assert.match(arm.detail, /open-loop/);
});

test("blinding a plan that reads no response at all is unlicensed, never a quiet pass", async () => {
  // The ONE genuine failure-to-perturb for this arm: not "the acts came out
  // the same" (that is a finding — see the refusal case below) but "there was
  // no loop here to open."
  const arm = await blindedArm({
    counterpart: kvCounterpart(),
    plan: ["sum 1 2", "sum 3 4"],
    goal: () => true,
  })({});
  assert.equal(arm.perturbed, false);
  assert.match(arm.detail, /nothing moved/);
});

test("the discrimination arm runs against a real sibling and is licensed by the sibling's own refusal", async () => {
  const ladder = interactionLadder({ counterpart: kvCounterpart(), sibling: strangerCounterpart(), assembly: ASSEMBLY });
  const arm = await ladder.items.find((i) => i.order === 5).arms.discrimination({});
  assert.equal(arm.completed, false);
  assert.equal(arm.perturbed, true);
  assert.match(arm.detail, /stranger/);
});

test("with no sibling at all the discrimination arm refuses itself rather than passing by default", async () => {
  const ladder = interactionLadder({ counterpart: kvCounterpart(), sibling: null, assembly: ASSEMBLY });
  const arm = await ladder.items.find((i) => i.order === 5).arms.discrimination({});
  assert.equal(arm.perturbed, false);
  assert.match(arm.detail, /nothing to discriminate against/);
});

test("the do-operator reports the three-way contrast, not a bare boolean", async () => {
  const ladder = interactionLadder({ counterpart: kvCounterpart(), sibling: strangerCounterpart(), assembly: ASSEMBLY, draws: 3 });
  const outcome = await ladder.items.find((i) => i.order === 11).task({});
  assert.equal(outcome.completed, true);
  assert.match(outcome.detail, /Without it: 3\/3 broke/);
  assert.match(outcome.detail, /irrelevant act in its place: 3\/3 broke/);
});

test("the do-operator's arbitrary arm inserts an irrelevant act and the effect must survive it", async () => {
  const ladder = interactionLadder({ counterpart: kvCounterpart(), sibling: strangerCounterpart(), assembly: ASSEMBLY, draws: 5 });
  const arm = await ladder.items.find((i) => i.order === 11).arms.arbitrary({});
  assert.equal(arm.completed, false);
  assert.equal(arm.fired, 0);
  assert.equal(arm.perturbed, true);
});

// -- a mis-declared item is refused, and the system is then UNMEASURED ------

test("an order-7 chain whose second act ignores the response is REFUSED — open-loop sufficed", async () => {
  // The item claims a coordination across turns, but its second act is a
  // constant: emitting the same two acts blind accomplishes the task. Axiom 3
  // is exactly this, and mhc.js must call it a mis-declared ITEM (the system
  // UNMEASURED at order 7) rather than a system failure.
  const cp = kvCounterpart();
  const rigged = {
    ...cp,
    id: "kv-openloop",
    describe: () => ({
      ...cp.describe(),
      chain: { probe: "sum 6 7", read: (t) => Number(t.trim()), use: () => "sum 13 1", check: (t) => t.trim() === "14" },
    }),
  };
  const report = await battery(rigged, strangerCounterpart());
  const seven = report.items.find((i) => i.order === 7);
  assert.equal(seven.status, "refused");
  assert.equal(seven.reason, "lower_order_suffices");
  assert.match(seven.detail, /UNMEASURED here, not failing/);
});

test("an order-11 plan whose effect does not depend on the named act is UNMEASURED — the arm could not test the axiom", async () => {
  // The effect comes from an act the item does not name, so removing the named
  // act changes nothing the task reads. That is not "the axiom held" and not
  // "the system failed": it is an arm whose perturbation reached nothing, and
  // A10 says so by name.
  const cp = kvCounterpart();
  const rigged = {
    ...cp,
    id: "kv-rigged",
    describe: () => ({
      ...cp.describe(),
      intervention: {
        plan: ["set k 42", "sum 20 22"],
        omit: 0,
        placebo: "nop",
        effect: (obs) => obs.some((o) => o.text.trim() === "42"),
      },
    }),
  };
  const report = await battery(rigged, strangerCounterpart());
  const eleven = report.items.find((i) => i.order === 11);
  assert.equal(eleven.status, "unmeasured");
  assert.equal(eleven.reason, "unlicensed_perturbation");
  assert.match(eleven.detail, /UNMEASURED, not passed/);
});

// -- environment-independence, with mhc.js's own machinery ------------------

test("environment-independence is askable with contentIndependence and no new machinery", async () => {
  const a = await battery(kvCounterpart("kv-a"), strangerCounterpart());
  const b = await battery(kvCounterpart("kv-b"), strangerCounterpart());
  const check = contentIndependence([
    { material: "kv-a", report: a },
    { material: "kv-b", report: b },
  ]);
  assert.equal(check.held, true);
});

test("a counterpart that offers fewer probes reads as no-probe, never as a violation of the scale", async () => {
  const full = await battery(kvCounterpart(), strangerCounterpart());
  const partial = await battery(strangerCounterpart(), kvCounterpart());
  const check = contentIndependence([
    { material: "kv", report: full },
    { material: "stranger", report: partial },
  ]);
  assert.equal(check.held, true);
});
