// huginn.test.mjs — the prioritizer's walls pinned (P-note: register decision,
// "someone besides heimdall in charge of model prioritization, heimdall may be
// its boss"): the job-kind register both surfaces speak, the pinned pick that
// outranks every ladder, the expected-wait ranking that puts a LOCAL rung and
// a ROOM mouth on one measured scale, the typed-failure-only hop, and the
// never-mutating evidence fold. Against the REAL matrix.js/matrix-routing
// modules, not a restated table.

import test from "node:test";
import assert from "node:assert/strict";

import { ROOM_FALLBACK_KINDS } from "./matrix.js";
import { isPinnedModel } from "./model-routing.js";
import {
  JOB_KINDS, CANDIDATE_KINDS, HOP_FAILURE_KINDS, hopEligible, EWMA_ALPHA,
  candidateOf, roomCandidateOf, roomCandidatesFrom,
  emptyEvidence, huginnObserve,
  huginnPrioritize, huginnHopAfter, huginnDecision,
} from "./huginn.js";

const LOCAL = candidateOf("gemma2:2b");
const LOCAL2 = candidateOf("llama3.2:latest");
const ROOM = roomCandidateOf("@bob:fake.test", "gemma2:2b");
const ROOM2 = roomCandidateOf("@carol:fake.test", "llama3.2:latest");

test("the register is the union of the chat and outward surfaces", () => {
  assert.deepEqual(Object.keys(JOB_KINDS).sort(), [
    "DEEP", "FLAT", "MECHANICAL", "MINDS", "S1", "S2", "SUMMARY", "VISION", "WITNESS",
  ].sort());
});

test("candidates carry the shapes the surfaces already speak", () => {
  assert.equal(LOCAL.id, "gemma2:2b");
  assert.equal(LOCAL.kind, CANDIDATE_KINDS.OLLAMA);
  assert.equal(ROOM.id, "room:@bob:fake.test gemma2:2b");
  assert.equal(ROOM.user, "@bob:fake.test");
  // the pinned detector recognises exactly the room candidates Huginn builds
  assert.ok(isPinnedModel(ROOM.id), "a model-carrying room candidate is a pinned-model shape");
  assert.ok(!isPinnedModel(roomCandidateOf("@bob:fake.test").id), "the failover form is never a pinned pick");
  assert.ok(isPinnedModel(roomCandidateOf("@bob:fake.test", "llama3.2:latest").id));
});

test("roomCandidatesFrom flattens offers one candidate per offered model", () => {
  const cs = roomCandidatesFrom([
    { user: "@bob:fake.test", models: ["gemma2:2b", "llama3.2:latest"] },
    { user: "@carol:fake.test", models: [] },
    null,
  ]);
  assert.equal(cs.length, 2);
  assert.equal(cs[0].id, "room:@bob:fake.test gemma2:2b");
  assert.equal(cs[1].id, "room:@bob:fake.test llama3.2:latest");
});

test("a pinned pick is never overridden by the ladder", () => {
  // the room mouth is measured slower and carries a queue — it still wins,
  // because the person picked it (P129 #5).
  const { pick, why, order } = huginnPrioritize(JOB_KINDS.FLAT, {
    candidates: [LOCAL, ROOM],
    pinned: ROOM.id,
    inflight: { [ROOM.id]: 3 },
    meanMs: { [ROOM.id]: 9000, [LOCAL.id]: 300 },
  });
  assert.equal(pick.id, ROOM.id);
  assert.equal(why, "pinned");
  assert.equal(order[0].id, ROOM.id);
  assert.equal(order[1].id, LOCAL.id);
});

test("a pinned pick that is not a candidate is simply absent, never manufactured", () => {
  const { pick, why } = huginnPrioritize(JOB_KINDS.FLAT, {
    candidates: [LOCAL],
    pinned: ROOM.id,
    inflight: {}, meanMs: {},
  });
  assert.equal(pick.id, LOCAL.id);
  assert.equal(why, "shortest_expected_wait");
});

test("expected wait ranks by in-flight x measured latency", () => {
  // LOCAL is faster per call but 3 calls queued; ROOM is idle and unmeasured.
  const { pick, why } = huginnPrioritize(JOB_KINDS.FLAT, {
    candidates: [LOCAL, ROOM],
    inflight: { [LOCAL.id]: 3 },
    meanMs: { [LOCAL.id]: 1000 },
  });
  assert.equal(pick.id, ROOM.id);
  assert.equal(why, "shortest_expected_wait");
});

test("an unmeasured candidate is scored at the measured mean, so it is tried, never starved", () => {
  // one measured candidate (2000ms) and one unmeasured: the unmeasured one is
  // scored at 2000 (the typical), so with no queue either way the earlier
  // offered order holds rather than a made-up favourite.
  const { order } = huginnPrioritize(JOB_KINDS.FLAT, {
    candidates: [LOCAL, ROOM],
    inflight: {},
    meanMs: { [LOCAL.id]: 2000 },
  });
  assert.equal(order[0].id, LOCAL.id);
  assert.equal(order[1].id, ROOM.id);
});

test("a measured fast mouth beats a queued local rung", () => {
  const { pick } = huginnPrioritize(JOB_KINDS.FLAT, {
    candidates: [LOCAL, ROOM],
    inflight: { [LOCAL.id]: 1 },
    meanMs: { [ROOM.id]: 250, [LOCAL.id]: 4000 },
  });
  assert.equal(pick.id, ROOM.id);
});

test("with nothing queued anywhere, the offered order holds — the local rung is tried first", () => {
  // expected wait is in-flight x measured mean (pickMouth's own rule): a lane
  // with nothing waiting is a zero wait, so an idle local rung is never moved
  // across the network for a speed number alone.
  const { pick, why } = huginnPrioritize(JOB_KINDS.FLAT, {
    candidates: [LOCAL, ROOM],
    inflight: {},
    meanMs: { [ROOM.id]: 250, [LOCAL.id]: 4000 },
  });
  assert.equal(pick.id, LOCAL.id);
  assert.equal(why, "shortest_expected_wait");
});

test("the requester's own serving mouth is never a candidate", () => {
  const me = roomCandidateOf("@alice:fake.test", "gemma2:2b");
  const { order, pick } = huginnPrioritize(JOB_KINDS.FLAT, {
    candidates: [me, ROOM],
    inflight: {}, meanMs: {},
    selfServing: "@alice:fake.test",
  });
  assert.equal(pick.id, ROOM.id);
  assert.ok(!order.some((c) => c.id === me.id));
});

test("a wrong answer never hops; only machine-shaped failures do", () => {
  assert.ok(hopEligible("machine"));
  for (const k of ROOM_FALLBACK_KINDS) assert.ok(hopEligible(k), `${k} is hop-eligible`);
  assert.ok(!hopEligible(null), "a null outcome is the caller's");
  assert.ok(!hopEligible("wrong"), "a wrong answer is not a missing machine");
  assert.ok(!hopEligible("http_400"), "a non-2xx response is the model answering badly");
  // HOP_FAILURE_KINDS is exactly machine + the received closed class
  assert.equal(HOP_FAILURE_KINDS[0], "machine");
  for (const k of ROOM_FALLBACK_KINDS) assert.ok(HOP_FAILURE_KINDS.includes(k));
});

test("the hop moves to the next untried candidate and never loops", () => {
  const order = [LOCAL, ROOM, ROOM2];
  const first = huginnHopAfter("machine", { order, tried: [] });
  assert.equal(first.hop.id, LOCAL.id);
  assert.equal(first.refused, null);
  const second = huginnHopAfter("machine", { order, tried: [LOCAL.id] });
  assert.equal(second.hop.id, ROOM.id);
  const third = huginnHopAfter("gpu", { order, tried: [LOCAL.id, ROOM.id] });
  assert.equal(third.hop.id, ROOM2.id);
  const none = huginnHopAfter("machine", { order, tried: [LOCAL.id, ROOM.id, ROOM2.id] });
  assert.equal(none.hop, null);
  assert.equal(none.refused.type, "no_hop");
});

test("a non-eligible failure is a refusal naming its own reason", () => {
  const r = huginnHopAfter("wrong", { order: [LOCAL, ROOM], tried: [] });
  assert.equal(r.hop, null);
  assert.equal(r.refused.type, "not_a_hop");
});

test("the serving requester is skipped by a hop, not hopped onto", () => {
  const me = roomCandidateOf("@alice:fake.test", "gemma2:2b");
  const r = huginnHopAfter("machine", { order: [me, ROOM], tried: [], selfServing: "@alice:fake.test" });
  assert.equal(r.hop.id, ROOM.id);
});

test("the evidence fold lands a measured meanMs (EWMA) and never mutates", () => {
  const e0 = emptyEvidence();
  const e1 = huginnObserve(e0, { candidateId: LOCAL.id, ms: 1000, ok: true });
  assert.equal(e1[LOCAL.id].meanMs, 1000);
  assert.equal(e1[LOCAL.id].n, 1);
  assert.equal(e1[LOCAL.id].ok, 1);
  assert.deepEqual(e0, {}, "observe never mutates the prior fold");
  const e2 = huginnObserve(e1, { candidateId: LOCAL.id, ms: 2000, ok: false, failureKind: "machine" });
  const expected = Math.round((1 - EWMA_ALPHA) * 1000 + EWMA_ALPHA * 2000);
  assert.equal(e2[LOCAL.id].meanMs, expected);
  assert.equal(e2[LOCAL.id].failed, 1);
  assert.equal(e2[LOCAL.id].lastFailure, "machine");
  assert.equal(e1[LOCAL.id].meanMs, 1000, "the prior fold is untouched");
});

test("a failure with no wall time keeps the standing mean", () => {
  const e1 = huginnObserve(emptyEvidence(), { candidateId: LOCAL.id, ms: 1000, ok: true });
  const e2 = huginnObserve(e1, { candidateId: LOCAL.id, ok: false, failureKind: "gpu" });
  assert.equal(e2[LOCAL.id].meanMs, 1000);
  assert.equal(e2[LOCAL.id].n, 2);
  assert.equal(e2[LOCAL.id].failed, 1);
});

test("the decision record names the ladder a hop was made over", () => {
  const d = huginnDecision({ act: "hop", jobKind: JOB_KINDS.FLAT, pick: ROOM, from: LOCAL, order: [LOCAL, ROOM] });
  assert.equal(d.act, "huginn-hop");
  assert.equal(d.jobKind, "flat");
  assert.equal(d.from, LOCAL.id);
  assert.equal(d.pick, ROOM.id);
  assert.deepEqual(d.order, [LOCAL.id, ROOM.id]);
});

test("a failed local call hops onto a room mouth and lands a recorded decision", () => {
  // the composition the app runs: prioritise, try, fail, hop, and the record
  const plan = huginnPrioritize(JOB_KINDS.FLAT, {
    candidates: [LOCAL, ROOM, ROOM2],
    inflight: {}, meanMs: { [LOCAL.id]: 1000 },
  });
  assert.equal(plan.pick.id, LOCAL.id);
  const hop = huginnHopAfter("machine", { order: plan.order, tried: [LOCAL.id] });
  assert.equal(hop.hop.id, ROOM.id);
  const record = huginnDecision({ act: "hop", jobKind: plan.jobKind, pick: hop.hop, from: plan.pick, order: plan.order });
  assert.equal(record.act, "huginn-hop");
  assert.equal(record.from, LOCAL.id);
  assert.equal(record.pick, ROOM.id);
});