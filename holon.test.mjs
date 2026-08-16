// holon.test.mjs — the holonic loop against a fake model. No engine, no
// network: the model is a function that reads the same prompts a real one
// would and answers from the material it was actually handed, which is the
// only honest way to fake it — a canned answer that ignores its prompt would
// test nothing but the plumbing.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  EXECUTE_SYSTEM_PROMPT,
  MAX_CORRECTIONS,
  PLAN_ENTRY_KINDS,
  PLAN_SYSTEM_PROMPT,
  appendPlan,
  createPlanLog,
  extractArray,
  foldPlan,
  needsDecomposition,
  parsePlan,
  projectParts,
  runHolonicTask,
} from "./holon.js";
import { chunkSource } from "./source.js";

const CORPUS = [
  "The Kessington report put the harbor figure at 12% for the spring quarter, revising the earlier estimate downward after the audit.",
  "Dredging of the shipping channel runs through March under the port authority schedule, with the deep berths closed for the duration.",
  "Unrelated paragraph about the town festival, the weather, and the new bakery on the corner of the square.",
].join("\n\n");

const chunks = chunkSource("notes.txt", CORPUS);

/** The refs a prompt actually offered, read back out of its MATERIAL block. */
function offeredRefs(userContent) {
  return [...userContent.matchAll(/\[([^\]\s]+#\d+-\d+)\]/g)].map((m) => m[1]);
}

/**
 * A fake model that behaves like a competent small model: plans on request,
 * writes each part from the passages in its prompt citing the first address,
 * and — for the part about dredging — invents a figure on the first draft and
 * fixes it when the correction prompt names the failure.
 */
function fakeModel({ stubborn = false } = {}) {
  return async (messages) => {
    const system = messages[0]?.content ?? "";
    const user = messages[1]?.content ?? "";

    if (system === PLAN_SYSTEM_PROMPT) {
      return JSON.stringify([
        { label: "the harbor figure", description: "State the harbor figure the Kessington report gives." },
        { label: "the dredging schedule", description: "Describe the dredging schedule for the shipping channel." },
      ]);
    }

    assert.equal(system, EXECUTE_SYSTEM_PROMPT);
    const refs = offeredRefs(user);
    const isCorrection = user.startsWith("Your draft");

    if (user.includes("harbor figure")) {
      return `The report puts the harbor figure at 12% for the spring quarter. [${refs[0]}]`;
    }
    if (isCorrection && !stubborn) {
      return `Dredging of the shipping channel runs through March. [${refs[0]}]`;
    }
    return "The dredging budget is 999 tons.";
  };
}

test("the plan is inserts on an append-only log, and the plan is its fold", () => {
  let log = createPlanLog("the task");
  const before = log;
  log = appendPlan(log, { kind: PLAN_ENTRY_KINDS.PROPOSE, part_id: "p1", label: "first", description: "one", basis: "plan" });
  // Append-only: the old log is untouched; seq is the log's own counter.
  assert.equal(before.entries.length, 0);
  assert.deepEqual(log.entries.map((e) => e.seq), [0]);
  assert.ok(Object.isFrozen(log.entries[0]));

  // A later entry for the same part wins field by field at the fold; the
  // earlier entry stays in the log — that is the descent.
  log = appendPlan(log, { kind: PLAN_ENTRY_KINDS.PROPOSE, part_id: "p1", label: "first, revised", description: "one, better" });
  log = appendPlan(log, {
    kind: PLAN_ENTRY_KINDS.RESULT, part_id: "p1", evidence: ["n.txt#0-9"],
    result: { refs: ["n.txt#0-9"], channels: ["cited"], unsupported: [], open: [], corrections: 0 },
  });
  const plan = foldPlan(log);
  assert.equal(plan.parts.length, 1);
  assert.equal(plan.parts[0].label, "first, revised");
  assert.equal(plan.results.get("p1").refs[0], "n.txt#0-9");
  assert.equal(log.entries.length, 3, "revised entries stay in the log");

  // Evidence accumulates from ANY entry that carries it (the eochat scar).
  assert.deepEqual(projectParts(log)[0].evidence, ["n.txt#0-9"]);

  // Supersession and retraction remove from the live set, never from the log.
  let l2 = appendPlan(log, { kind: PLAN_ENTRY_KINDS.PROPOSE, part_id: "p2", description: "replacement", supersedes: "p1" });
  assert.deepEqual(projectParts(l2).map((t) => t.part_id), ["p2"]);
  l2 = appendPlan(l2, { kind: PLAN_ENTRY_KINDS.RETRACT, part_id: "p2" });
  assert.deepEqual(projectParts(l2), []);
  assert.equal(l2.entries.length, 5);

  // Degradation is a basis on the part's own propose entry, derived at the fold.
  const dl = appendPlan(createPlanLog("t"), { kind: PLAN_ENTRY_KINDS.PROPOSE, part_id: "p1", description: "t", basis: "degraded", reason: "plan did not parse" });
  assert.equal(foldPlan(dl).degraded, true);
  assert.equal(plan.degraded, false);

  // A typed gap, never a default: a part proposed without a description says so.
  const gap = appendPlan(createPlanLog("t"), { kind: PLAN_ENTRY_KINDS.PROPOSE, part_id: "p1" });
  assert.ok(projectParts(gap)[0].description_gap);

  // No silent coercion: an unknown kind or a missing part_id refuses loudly.
  assert.throws(() => appendPlan(log, { kind: "mutate", part_id: "p1" }));
  assert.throws(() => appendPlan(log, { kind: PLAN_ENTRY_KINDS.PROPOSE }));
});

test("the gate fires on several separately-anchored parts, not on length", () => {
  // The canonical shape: several clauses, each pinning its own concrete fact.
  assert.equal(
    needsDecomposition(
      "Our budget is $2000, we need wifi at the venue, everyone eats vegetarian, and our CFO cannot attend on the 14th",
    ),
    true,
  );
  // Long and comma-heavy, but one elaborated ask — no anchors past grammar.
  assert.equal(
    needsDecomposition(
      "tell me more about the general mood of the meeting, how people seemed to feel about it, and whether anyone appeared unhappy with how things were going overall",
    ),
    false,
  );
  // A greeting never reaches the anchor scan.
  assert.equal(needsDecomposition("hello there"), false);
  assert.equal(needsDecomposition(""), false);
});

test("extractArray finds a balanced array inside talk", () => {
  const arr = extractArray('Sure! Here is the plan:\n[{"label":"a [b]","description":"c"}]\nHope that helps.');
  assert.equal(arr.length, 1);
  assert.equal(arr[0].label, "a [b]");
});

test("extractArray refuses what does not parse", () => {
  assert.equal(extractArray("[{broken"), null);
  assert.equal(extractArray("no array here"), null);
  assert.equal(extractArray('{"an":"object"}'), null);
});

test("parsePlan unwraps an object-wrapped plan — the shape gemma2:2b actually returns", () => {
  const raw = JSON.stringify({
    parts: [{ label: "a", description: "first thing" }, { label: "b", description: "second thing" }],
  });
  const plan = parsePlan(raw, "the task");
  assert.equal(plan.degraded, false);
  assert.equal(plan.parts.length, 2);
  assert.equal(plan.parts[1].description, "second thing");
});

test("parsePlan degrades to the task itself, and says so", () => {
  const plan = parsePlan("I could not possibly decompose that.", "compare the reports");
  assert.equal(plan.degraded, true);
  assert.equal(plan.parts.length, 1);
  assert.equal(plan.parts[0].description, "compare the reports");
});

test("the loop plans, grounds each part, and corrects an invented figure", async () => {
  const events = [];
  const result = await runHolonicTask({
    task: "Summarize the port situation from the notes.",
    chunks,
    call: fakeModel(),
    onProgress: (phase, part) => events.push(phase + (part ? `:${part.id}` : "")),
  });

  assert.equal(result.plan.degraded, false);
  assert.equal(result.sections.length, 2);

  // Part one cited the address it was handed and the figure is in the bytes.
  const harbor = result.sections[0];
  assert.equal(harbor.used.length, 1);
  assert.equal(harbor.unsupported.length, 0);
  assert.equal(harbor.corrections, 0);

  // Part two's first draft invented 999; the check caught it, one correction
  // ran, and the last draft stands clean with its own citation.
  const dredging = result.sections[1];
  assert.equal(dredging.corrections, 1);
  assert.equal(dredging.unsupported.length, 0);
  assert.ok(dredging.used.length >= 1);
  assert.ok(events.includes("correct:p2"));

  // Assembly: two parts means headings, and provenance is the union of what
  // the parts' own checks established.
  assert.ok(result.output.includes("## the harbor figure"));
  assert.ok(result.output.includes("## the dredging schedule"));
  assert.equal(result.unsupported.length, 0);
  assert.ok(result.refs.length >= 2);
  assert.ok(result.channels.includes("cited"));

  // The log is the run's own account: a propose per part, a result per run —
  // and the fold of it agrees with what was returned, because the returned
  // plan IS that fold.
  assert.deepEqual(
    result.log.entries.map((e) => e.kind),
    ["propose", "propose", "result", "result"],
  );
  assert.deepEqual(foldPlan(result.log).parts, result.plan.parts);
  assert.equal(foldPlan(result.log).results.get("p2").corrections, 1);
  // The part's evidence accumulated from its result entry.
  assert.ok(projectParts(result.log)[0].evidence.length >= 1);
});

test("the correction pass is a budget: a stubborn model's failure stays on record", async () => {
  const result = await runHolonicTask({
    task: "Summarize the port situation from the notes.",
    chunks,
    call: fakeModel({ stubborn: true }),
  });
  const dredging = result.sections[1];
  assert.equal(dredging.corrections, MAX_CORRECTIONS);
  assert.ok(dredging.unsupported.some((u) => u.includes("999")));
  assert.ok(result.unsupported.some((u) => u.includes("999")));
});

test("no material is a typed gap on every part, never a guess", async () => {
  const result = await runHolonicTask({
    task: "Summarize the port situation.",
    chunks: [],
    call: fakeModel(),
  });
  assert.equal(result.refs.length, 0);
  assert.ok(result.open.length >= result.sections.length);
  assert.ok(result.open.every((o) => typeof o === "string"));
  assert.ok(result.open.some((o) => o.startsWith("no material matched")));
});

test("production retries a strayed part that matched nothing, as a supersede", async () => {
  // The plan strays entirely — a part sharing no term with the task, matching
  // nothing in the corpus. The rule proposes one retry in the task's own
  // words; the retry grounds; the stray drops out of the live fold and the
  // assembly with it.
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT)
      return JSON.stringify([{ label: "orbital telemetry", description: "Calibrate the orbital telemetry envelope." }]);
    const refs = offeredRefs(messages[1].content);
    return refs.length
      ? `The report puts the harbor figure at 12% for the spring quarter. [${refs[0]}]`
      : "There is nothing here about that.";
  };
  const result = await runHolonicTask({ task: "summarize the harbor figure notes", chunks, call });

  assert.equal(result.production.halted_by, "operational-closure");
  assert.ok(result.production.steps >= 2);
  // The live fold holds only the retry; the log holds both, forever.
  assert.deepEqual(result.plan.parts.map((p) => p.id), ["p1r"]);
  const kinds = result.log.entries.map((e) => e.kind);
  assert.deepEqual(kinds, ["propose", "result", "propose", "result"]);
  assert.equal(result.log.entries[2].supersedes, "p1");
  assert.equal(result.log.entries[2].basis, "retry");
  // One section, grounded — the stray's ungrounded text is not in the output.
  assert.equal(result.sections.length, 1);
  assert.ok(result.refs.length >= 1);
  assert.ok(!result.output.includes("nothing here about that"));
});

test("resumption: the fold rebuilds from the serialized entries alone", async () => {
  const result = await runHolonicTask({
    task: "Summarize the port situation from the notes.",
    chunks,
    call: fakeModel(),
  });
  // Through JSON and back — no derivation state may live outside the entries.
  const revived = {
    task: result.log.task,
    entries: JSON.parse(JSON.stringify(result.log.entries)),
    nextSeq: result.log.nextSeq,
  };
  assert.deepEqual(projectParts(revived), projectParts(result.log));
  assert.deepEqual(foldPlan(revived).parts, result.plan.parts);
  assert.deepEqual([...foldPlan(revived).results.keys()], [...result.plan.results.keys()]);
});

test("flat mode: a one-part thought that spends no plan call", async () => {
  const call = async (messages, opts) => {
    // The whole point: planning was decided mechanically, so asking the
    // model to plan would be a spent call deciding what was already decided.
    assert.notEqual(messages[0].content, PLAN_SYSTEM_PROMPT, "flat mode must not spend a plan call");
    const refs = offeredRefs(messages[1].content);
    return refs.length
      ? `The report puts the harbor figure at 12% for the spring quarter. [${refs[0]}]`
      : "Nothing matched.";
  };
  const result = await runHolonicTask({
    task: "what was the harbor figure?",
    chunks,
    call,
    planMode: "flat",
    discourse: "ports · the figure under revision · Kessington",
  });
  assert.equal(result.plan.parts.length, 1);
  assert.equal(result.plan.degraded, false);
  assert.equal(result.log.entries[0].basis, "flat");
  assert.ok(!result.output.startsWith("##"), "one part, no heading scaffolding");
  assert.ok(result.refs.length >= 1);
});

test("the discourse slice reaches the part prompt, and only as one line", async () => {
  let sawDiscourse = false;
  const call = async (messages) => {
    if (messages[1]?.content.includes("The conversation so far, in one line: ports · the figure")) sawDiscourse = true;
    const refs = offeredRefs(messages[1].content);
    return refs.length ? `The figure was 12%. [${refs[0]}]` : "Nothing.";
  };
  await runHolonicTask({
    task: "and the spring quarter?",
    chunks,
    call,
    planMode: "flat",
    discourse: "ports · the figure under revision · Kessington",
  });
  assert.ok(sawDiscourse);
});

test("a verbatim reproduction fails as not-answering, and the correction can save it", async () => {
  let corrected = false;
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const user = messages[1].content;
    const refs = offeredRefs(user);
    if (user.includes("copies the passage word for word")) {
      corrected = true;
      return `The report gives the harbor figure as 12% for the spring quarter. [${refs[0]}]`;
    }
    // First draft: the passage, photocopied — grounded to perfection and
    // answering nothing.
    return "The Kessington report put the harbor figure at 12% for the spring quarter, revising the earlier estimate downward after the audit.";
  };
  const result = await runHolonicTask({
    task: "what was the harbor figure?",
    chunks,
    call,
    planMode: "flat",
  });
  assert.ok(corrected, "the reproduction must trigger the tailored rewrite");
  assert.ok(!result.open.some((o) => o.includes("reproduces the material")), "the corrected draft answers");
  assert.ok(result.refs.length >= 1);
});

test("a stubborn reproduction fails the part: typed open, no refs", async () => {
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    return "The Kessington report put the harbor figure at 12% for the spring quarter, revising the earlier estimate downward after the audit.";
  };
  const result = await runHolonicTask({
    task: "what was the harbor figure?",
    chunks,
    call,
    planMode: "flat",
  });
  assert.ok(result.open.some((o) => o.includes("reproduces the material verbatim; it does not answer")));
  assert.deepEqual(result.refs, [], "a photocopy earns nothing, however grounded");
  assert.deepEqual(result.channels, []);
});

test("an echo answer establishes nothing: typed open, no refs granted", async () => {
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    // The model restates the question — with the offered ref attached, which
    // is exactly how a live echo slipped through as "grounded".
    const refs = offeredRefs(messages[1].content);
    return `What was the harbor figure for the spring quarter? [${refs[0] ?? "x#0-1"}]`;
  };
  const result = await runHolonicTask({
    task: "what was the harbor figure for the spring quarter?",
    chunks,
    call,
    planMode: "flat",
  });
  assert.ok(result.open.some((o) => o.includes("restates the question")));
  assert.deepEqual(result.refs, [], "circular support is not support");
  assert.deepEqual(result.channels, []);
});

test("a plan that fails to parse is itself a typed gap", async () => {
  const call = async (messages) =>
    messages[0].content === PLAN_SYSTEM_PROMPT
      ? "no json for you"
      : `The report puts the harbor figure at 12%. [${offeredRefs(messages[1].content)[0] ?? "x#0-1"}]`;
  const result = await runHolonicTask({ task: "the harbor figure", chunks, call });
  assert.equal(result.plan.degraded, true);
  assert.ok(result.open.some((o) => o.includes("plan did not parse")));
  // One part means no heading scaffolding around a single answer.
  assert.ok(!result.output.startsWith("##"));
});
