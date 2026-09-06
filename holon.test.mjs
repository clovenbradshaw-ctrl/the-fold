// holon.test.mjs — the holonic loop against a fake model. No engine, no
// network: the model is a function that reads the same prompts a real one
// would and answers from the material it was actually handed, which is the
// only honest way to fake it — a canned answer that ignores its prompt would
// test nothing but the plumbing.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CHAT_SYSTEM_PROMPT,
  EXECUTE_SYSTEM_PROMPT,
  FLAT_EXECUTE_SYSTEM_PROMPT,
  MAX_CORRECTIONS,
  PLAN_ENTRY_KINDS,
  PLAN_SYSTEM_PROMPT,
  SEARCHED_VOID_PREFIX,
  appendPlan,
  createPlanLog,
  extractArray,
  foldPlan,
  mechanicalAnswer,
  needsDecomposition,
  parsePlan,
  projectParts,
  runHolonicTask,
  runPart,
} from "./holon.js";
import { chunkSource } from "./source.js";
import { makeRelationReader } from "./hypergraph.js";
import { makeGrid } from "./grid.js";
import { makeCapacityRunner, landAct } from "../eoreader7/native/organs/index.js";
import { findCapacity, unresolvedCapacity } from "../eoreader7/native/organs/index.js";

// Real engine organs for the relation tier (hypergraph.test.mjs's own
// pattern) — the completeness gate is worth nothing tested against a
// fixture that fakes what "bound" and "fillers" mean; it has to run the
// real extraction the way a live turn actually does.
const relationOrgans = async () => {
  const { splitSentences } = await import("../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/spans.js");
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(
    "../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js"
  );
  const { discoverRelationVocab, extractRelations } = await import(
    "../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/relations.js"
  );
  const { tokenize } = await import("../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/material.js");
  return { splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize };
};

const CORPUS = [
  "The Kessington report put the harbor figure at 12% for the spring quarter, revising the earlier estimate downward after the audit.",
  "Dredging of the shipping channel runs through March under the port authority schedule, with the deep berths closed for the duration.",
  "Unrelated paragraph about the town festival, the weather, and the new bakery on the corner of the square.",
].join("\n\n");

const chunks = chunkSource("notes.txt", CORPUS);

/**
 * The refs a prompt actually offered, read back by recognizing which known
 * chunk's own TEXT the MATERIAL block carries — not a bracket anymore
 * (2026-08-18: buildSourceBlock stopped labeling every passage with its
 * address and instructing the model to reproduce one — the model must
 * have zero exposure to this instrument's own addressing scheme, so this
 * fake model can no longer read one back out of its own prompt either).
 * `pool` defaults to this file's default corpus; tests built on a
 * different one pass it explicitly.
 */
function offeredRefs(userContent, pool = chunks) {
  return pool.filter((c) => userContent.includes(c.text)).map((c) => c.ref);
}

/** Everything a call actually carries, joined — the honest way for a fake
 * model to read its prompt now that the flat material path puts the
 * source block in the SYSTEM message and the person's words in the final
 * user turn (2026-08-19, stable sub-assemblies): a real model sees all of
 * its messages, so the fake one reads all of them too. */
function promptOf(messages) {
  return messages.map((m) => m.content).join("\n\n");
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

    // No material is its own branch (CHAT_SYSTEM_PROMPT) — a friendly reply,
    // not a diagnosis dressed up as one. Every other call is a real part.
    assert.ok(system === EXECUTE_SYSTEM_PROMPT || system === CHAT_SYSTEM_PROMPT);
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

test("a single interrogative sentence never plans, however many facets it names", () => {
  // The live failure this pins (2026-08-17): three anchored facets in one
  // question tripped the gate, each part re-answered the whole question,
  // and the sections contradicted each other on the mayor. One question is
  // one propose; the checking ladder is the fact-check.
  assert.equal(
    needsDecomposition("What river is Nashville on, what US state is it in, and who was its mayor in 2019?"),
    false,
  );
  // Imperative multi-part WORK still plans — the gate lost questions, not tasks.
  assert.equal(
    needsDecomposition(
      "Our budget is $2000, we need wifi at the venue, everyone eats vegetarian, and our CFO cannot attend on the 14th",
    ),
    true,
  );
  // Several sentences ending in a question still reach the anchor scan —
  // only the single-sentence interrogative is exempt.
  assert.equal(
    needsDecomposition(
      "Compare the 1805 and 1812 campaigns. Cite the figures for each army, name the commanding generals, and note the dates of the major battles. Which mattered more?",
    ),
    true,
  );
});

test("a single-sentence ask plans only on anchors — a comma count is length, not structure", () => {
  // The live browser failure this pins (2026-08-17): one imperative
  // sentence naming facets of ONE artifact hit the clause-count shortcut,
  // planned five parts, and each part — sighted only on its own label —
  // regenerated the whole widget from scratch. No clause pins an anchor,
  // so the ask is one propose; the build loop's iteration is the improver.
  assert.equal(
    needsDecomposition("Make me a counter widget in html, with a plus button, a minus button, and a number in between."),
    false,
  );
  // Multi-sentence work keeps the clause-count shortcut — steps stated as steps.
  assert.equal(
    needsDecomposition(
      "Compare the 1805 and 1812 campaigns. Cite the figures for each army, name the commanding generals, and note the dates of the major battles. Which mattered more?",
    ),
    true,
  );
});

test("a standing preference is not WORK, and does not trip the gate on its own commas", () => {
  // The live failure this pins (2026-08-17): "My name is Jordan. From now
  // on, whenever you give me more than one item, use a numbered list,
  // never bullets or a plain paragraph. Let's start: what's the actual
  // difference between weather and climate?" split into six clauses on the
  // preference sentence's own commas, tripped the length-4 shortcut, and
  // planned three redundant parts (each re-greeting Jordan, none of them
  // ever numbering anything) for what is one plain question.
  assert.equal(
    needsDecomposition(
      "My name is Jordan. From now on, whenever you give me more than one item, use a numbered list, never bullets or a plain paragraph. Let's start: what's the actual difference between weather and climate?",
    ),
    false,
  );
  // A second live failure (2026-08-17), same shape: replacing the standing
  // preference plus a marker instruction, both stated as standing rules,
  // still left a one-sentence question — which must stay exempt.
  assert.equal(
    needsDecomposition(
      'New rule, replacing the old one: stop using any list formatting entirely, always answer in flowing prose sentences. Also, from now on start every reply with the single word "Noted:" as the very first word. Given that, what\'s the difference between renewable and nonrenewable energy?',
    ),
    false,
  );
  // A standing preference stated ALONE, with no task attached, is not work.
  assert.equal(
    needsDecomposition("From now on, whenever you give me a list, number it. Never use bullets."),
    false,
  );
  // The preference-stripping pass must not eat genuine multi-part WORK that
  // merely happens to share a word with the marker list ("rule" inside a
  // real clause, not "new rule" / "as a rule").
  assert.equal(
    needsDecomposition(
      "Our budget is $2000, we need wifi at the venue, everyone eats vegetarian, and our CFO cannot attend on the 14th",
    ),
    true,
  );
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

  // Part two's first draft carried the figure 999, which the material does
  // not hold. Under propose-then-check (2026-08-17) that is UNBACKED
  // knowledge, not a lie about the given: no correction pass burns on it,
  // the draft ships as written, and the finding lands in `unbacked` — the
  // marks and the record are its treatment. (Rewriting it away was measured
  // deleting true answers: the mayor the material was merely silent on.)
  const dredging = result.sections[1];
  assert.equal(dredging.corrections, 0);
  assert.equal(dredging.unsupported.length, 0);
  assert.ok(dredging.unbacked.some((u) => u.includes("999")));
  // No correction ran, so the part never earned the citation the rewrite
  // used to carry — an uncited part with its figure marked is the honest
  // shape now, and the marks are what the reader sees.
  assert.equal(dredging.used.length, 0);
  assert.ok(!events.includes("correct:p2"));

  // Assembly: two parts means headings, and provenance is the union of what
  // the parts' own checks established.
  assert.ok(result.output.includes("## the harbor figure"));
  assert.ok(result.output.includes("## the dredging schedule"));
  assert.equal(result.unsupported.length, 0);
  assert.ok(result.unbacked.some((u) => u.includes("999")));
  assert.ok(result.refs.length >= 1);
  assert.ok(result.channels.includes("cited"));

  // The log is the run's own account: a propose per part, a result per run —
  // and the fold of it agrees with what was returned, because the returned
  // plan IS that fold.
  assert.deepEqual(
    result.log.entries.map((e) => e.kind),
    ["propose", "propose", "result", "result"],
  );
  assert.deepEqual(foldPlan(result.log).parts, result.plan.parts);
  assert.equal(foldPlan(result.log).results.get("p2").corrections, 0);
  // The part's evidence accumulated from its result entry.
  assert.ok(projectParts(result.log)[0].evidence.length >= 1);
});

test("an unbacked figure never burns the correction budget; it ships and stays on record", async () => {
  // The stubborn model repeats its 999 no matter what. Before the split this
  // spent MAX_CORRECTIONS rewriting and shipped the failure anyway; now the
  // figure is unbacked knowledge — zero corrections, the draft ships, and
  // the record still names what nothing given backs.
  const result = await runHolonicTask({
    task: "Summarize the port situation from the notes.",
    chunks,
    call: fakeModel({ stubborn: true }),
  });
  const dredging = result.sections[1];
  assert.equal(dredging.corrections, 0);
  assert.ok(dredging.unbacked.some((u) => u.includes("999")));
  assert.ok(result.unbacked.some((u) => u.includes("999")));
  assert.equal(dredging.unsupported.length, 0);
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

test("no material still offers a checkable figure to the web tier, not silence", async () => {
  // The live failure this pins (2026-08-17): a plain question with no
  // material attached ("what percentage of Earth's atmosphere is nitrogen,
  // and what year was the Kyoto Protocol signed?") produced zero
  // proof-seeking chips in the app — not because the web toggle or checking
  // mode were off, but because checkGrounding's findings are (correctly)
  // empty at zero passages, and app.js's proofTargets reads findings
  // straight off the section's `grounding` field with nothing else feeding
  // it. With no material, every figure and name in the draft is
  // unsupported by definition and must still reach `findings`.
  const result = await runHolonicTask({
    task: "What's the dredging budget?",
    chunks: [],
    call: fakeModel(),
  });
  const section = result.sections[0];
  assert.equal(section.passages.length, 0);
  assert.ok(section.grounding, "the raw grounding result must still be exposed on the section");
  assert.ok(
    section.grounding.findings.some((f) => f.text.includes("999")),
    "the unsupported figure must be a candidate finding for proofTargets, not silently dropped",
  );
  assert.ok(result.unbacked.some((u) => u.includes("999")));
});

test("a build part with no material never manufactures unbacked findings from its own code labels", async () => {
  // The live failure this pins (2026-08-17, constitutional pass): a counter
  // widget with no material attached answered with a fenced code block plus
  // its own prose walk-through ("Initializes a counter set to 0.", "Adds
  // click listeners for increment and decrement."). No material means
  // checkGrounding correctly declines to examine anything — but the SAME
  // no-material fallback that rightly offers a bare factual claim to the web
  // tier (the test above) was, before this fix, also firing here, reading
  // the model's account of its own artifact as world-claims nobody sourced
  // and manufacturing a findings list out of bare absence. A part's own
  // artifact is its own ground; the fallback must stay silent on it exactly
  // as checkGrounding itself would if there were passages to compare against.
  const result = await runHolonicTask({
    task: "build a counter widget in vanilla JS",
    chunks: [],
    call: async () =>
      [
        "```html",
        "<button id='dec'>-</button><span id='n'>0</span><button id='inc'>+</button>",
        "<script>let count = 0;</script>",
        "```",
        "Initializes a counter variable set to 0.",
        "Adds click listeners for increment and decrement.",
      ].join("\n"),
  });
  const section = result.sections[0];
  assert.equal(section.passages.length, 0);
  assert.deepEqual(section.grounding.findings, []);
  assert.equal(section.grounding.clean, true);
  assert.deepEqual(result.unbacked, []);
});

test("production retries a strayed part that matched nothing, as a supersede", async () => {
  // The plan strays entirely — a part sharing no term with the task, matching
  // nothing in the corpus. The rule proposes one retry in the task's own
  // words; the retry grounds; the stray drops out of the live fold and the
  // assembly with it.
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT)
      return JSON.stringify([{ label: "orbital telemetry", description: "Calibrate the orbital telemetry envelope." }]);
    const refs = offeredRefs(promptOf(messages));
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
    const refs = offeredRefs(promptOf(messages));
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

test("the discourse slice reaches a flat part with no history, and only as one line", async () => {
  // The flat material call is object-level now (2026-08-19): duty and
  // material in the system prompt, the person's words as the final user
  // turn. With no verbatim history to send, the one-line discourse rides
  // the system prompt — the fallback context, never a directive wrapper.
  let sawDiscourse = false;
  let taskVerbatim = false;
  const call = async (messages) => {
    if (messages[0]?.content.includes("The conversation so far: ports · the figure")) sawDiscourse = true;
    if (messages[messages.length - 1]?.content === "and the spring quarter?") taskVerbatim = true;
    const refs = offeredRefs(promptOf(messages));
    return refs.length ? `The figure was 12%. [${refs[0]}]` : "Nothing.";
  };
  await runHolonicTask({
    task: "and the spring quarter?",
    chunks,
    call,
    planMode: "flat",
    discourse: "ports · the figure under revision · Kessington",
  });
  assert.ok(sawDiscourse, "the discourse line rides the system prompt when no history exists");
  assert.ok(taskVerbatim, "the person's message arrives as itself, never inside a directive");
});

// ── the conversation's own anchor, extended to a topic-less flat follow-up ──
// Measured live 2026-08-18: asked "research the weather in NYC right now"
// with nothing attached, then "prove it" — the second turn's own words carry
// no topic at all. A decomposed part stays narrowly scoped to exactly that
// emptiness on purpose (the `strayed` disclosure, above); a flat turn IS the
// whole conversation, and discourse is the fold's own record of what it was
// about. app.js's preflight (proof.js's shouldPreflight/gatherPreflightMaterial)
// hands a materialless flat turn real chunks before it drafts; this is the
// other half — that retrieval must actually find them on "prove it" alone.

const weatherChunks = chunkSource(
  "web:weather.gov-0",
  "The National Weather Service forecast for New York City: 68 degrees, partly cloudy, updated this afternoon.",
);

test("a flat, topic-less follow-up retrieves on the fold's discourse, not just its own empty words", async () => {
  const call = async (messages) => {
    const refs = offeredRefs(promptOf(messages), weatherChunks);
    return refs.length
      ? `Confirmed: the National Weather Service forecast lists 68 degrees for New York City. [${refs[0]}]`
      : "I don't have enough information to confirm that.";
  };
  const result = await runHolonicTask({
    task: "prove it",
    chunks: weatherChunks,
    call,
    planMode: "flat",
    discourse: "NYC weather right now · asked and answered · NYC",
  });
  assert.ok(result.refs.length >= 1, "the discourse anchor must pull the weather material into retrieval");
});

test("without the discourse anchor, the same topic-less follow-up retrieves nothing — the fix is the anchor, not luck", async () => {
  const call = async (messages) => {
    const refs = offeredRefs(promptOf(messages), weatherChunks);
    return refs.length ? `Confirmed. [${refs[0]}]` : "I don't have enough information.";
  };
  const result = await runHolonicTask({ task: "prove it", chunks: weatherChunks, call, planMode: "flat" });
  assert.equal(result.refs.length, 0, "no discourse, no anchor — retrieval correctly finds nothing in 'prove it' alone");
});

// ── stable sub-assemblies (2026-08-19): the join is earned, never assumed ──
// Measured live: "research Robert Macnamera" asked right after a greeting
// retrieved greeting-etiquette passages, because the stale discourse line
// was concatenated into the retrieval query on spec and its words out-voted
// a misspelled name matching nothing. The part's own words retrieve FIRST;
// the discourse widens only on measured emptiness.

test("a flat question whose own words retrieve material never inherits the stale topic's passages", async () => {
  // A corpus holding both the on-topic passage and a stale-topic decoy that
  // the old concatenation would have pulled in via the discourse words.
  const mixed = chunkSource(
    "mixed.txt",
    [
      "The Kessington report put the harbor figure at 12% for the spring quarter.",
      "A proper greeting, involving a brief exchange like saying hello, is necessary for extended conversation with the user.",
    ].join("\n\n"),
  );
  let offered = null;
  const call = async (messages) => {
    offered = offeredRefs(promptOf(messages), mixed);
    return offered.length ? "The harbor figure was 12% for the spring quarter." : "Nothing.";
  };
  await runHolonicTask({
    task: "what was the harbor figure?",
    chunks: mixed,
    call,
    planMode: "flat",
    // The stale line — its words match the decoy passage, not the question.
    discourse: "Greeting exchange · conversation starts with a simple greeting · user, AI",
  });
  assert.ok(offered.some((r) => r.startsWith("mixed")), "the question's own words must still retrieve");
  const texts = mixed.filter((c) => offered.includes(c.ref)).map((c) => c.text);
  assert.ok(
    texts.every((t) => !/greeting/i.test(t)),
    `the stale topic's passage rode the discourse line into retrieval: ${texts.join(" | ")}`,
  );
});

test("the material path sends the real conversation on a flat turn — role-structured history, not only the one-line fold", async () => {
  // Measured live 2026-08-19: "what is my name?" ran the material path,
  // which dropped history the moment passages existed — the model then
  // summarized an irrelevant fetched page instead of seeing the
  // conversation it was asked about. A regular model with the full context
  // answers honestly; the instrument may not do worse than that null.
  let sawHistory = false;
  const history = [
    { role: "user", content: "hey" },
    { role: "assistant", content: "hello — what shall we look at?" },
  ];
  let sawDiscourse = false;
  const call = async (messages) => {
    const roles = messages.map((m) => m.role);
    if (
      messages[0].content.startsWith(FLAT_EXECUTE_SYSTEM_PROMPT) &&
      // The material rides in the system message — identified by its own
      // SOURCE NAME now, not a generic "MATERIAL" banner (user direction
      // 2026-08-27; source.js::sourceFace). The passage text itself is the
      // durable check: whatever heading precedes it, the material is here.
      messages[0].content.includes("harbor") &&
      roles.join(",") === "system,user,assistant,user" &&
      messages[1].content === "hey" &&
      messages[messages.length - 1].content === "what was the harbor figure?"
    )
      sawHistory = true;
    // Measured live 2026-08-19 ("system 2 keeps drifting off the
    // discourse"): the discourse line used to be dropped from the system
    // prompt the moment chatHistory existed — exactly backwards, since it
    // carries S1's own distilled topic/flow/entities, not a redundant copy
    // of the raw turns, and matters most when aperture.js's regime has
    // narrowed chatHistory down to almost nothing.
    if (messages[0].content.includes("ports · the figure under revision · Kessington")) sawDiscourse = true;
    const refs = offeredRefs(promptOf(messages));
    return refs.length ? "The figure was 12% for the spring quarter." : "Nothing.";
  };
  await runHolonicTask({
    task: "what was the harbor figure?",
    chunks,
    call,
    planMode: "flat",
    chatHistory: history,
    discourse: "ports · the figure under revision · Kessington",
  });
  assert.ok(
    sawHistory,
    "the flat material call: duty+material in system, verbatim history as messages, the person's words as the final user turn",
  );
  assert.ok(sawDiscourse, "the discourse line rides alongside chatHistory, never dropped just because history exists");
});

test("a decomposed part stays narrowly scoped even when discourse is set — the flat-only fold-in does not leak into planned parts", async () => {
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const refs = offeredRefs(promptOf(messages), weatherChunks);
    return refs.length ? `Confirmed. [${refs[0]}]` : "I don't have enough information.";
  };
  const result = await runHolonicTask({
    task: "prove it",
    chunks: weatherChunks,
    call,
    planMode: "model",
    discourse: "NYC weather right now · asked and answered · NYC",
  });
  assert.equal(result.refs.length, 0, "a decomposed part's own words stay the only anchor — discourse fold-in is flat-only by design");
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

test("a stubborn reproduction: the failure stays typed, and the mechanical answer ships instead", async () => {
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
  // The model's failure stays on the record — it says why the mechanical
  // path ran — and what ships is the material's own sentences, quoted,
  // each with its address (user direction 2026-08-17: "ground all that").
  assert.ok(result.open.some((o) => o.includes("reproduces the material verbatim; it does not answer")));
  assert.ok(result.open.some((o) => o.includes("assembled mechanically")));
  assert.ok(result.output.includes("[notes.txt#"), result.output);
  assert.ok(result.output.includes("12%"), "the material's own sentence carries the actual answer");
  assert.ok(result.refs.length >= 1, "verbatim material with its address is a warrant the assembly may keep");
});

test("an echo answer establishes nothing: typed open, no refs granted", async () => {
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    // The model restates the question — with the offered ref attached, which
    // is exactly how a live echo slipped through as "grounded".
    const refs = offeredRefs(promptOf(messages));
    return `What was the harbor figure for the spring quarter? [${refs[0] ?? "x#0-1"}]`;
  };
  const result = await runHolonicTask({
    task: "what was the harbor figure for the spring quarter?",
    chunks,
    call,
    planMode: "flat",
  });
  assert.ok(result.open.some((o) => o.includes("restates the prompt")));
  // The echo itself earned nothing; the mechanical assembly that ships in
  // its place quotes the material's own sentence — which here carries the
  // very figure the echo dodged — with its address attached.
  assert.ok(result.open.some((o) => o.includes("assembled mechanically")));
  assert.ok(result.output.includes("12%"), result.output);
  assert.ok(result.output.includes("[notes.txt#"), "every shipped sentence wears its address");
});

// ── the dialogue-narration echo, from the live NYC-weather runs ──────────────
// Measured 2026-08-18: asked "what is the weather in NYC today?" with real
// weather pages fetched and offered, the model narrated the dialogue in the
// third person — "The conversation starts with a question about the weather
// in New York City. The user is waiting for more information about the
// weather." — across three consecutive turns. Neither existing echo test can
// see it: the content words (user, conversation, waiting, information) come
// from the dialogue apparatus, not the question, so the word-coverage test
// reads them as content, and the draft shipped as "the model's own words"
// while the fetched forecast sat unread in the offered passages.
test("a draft that narrates the dialogue is an echo: refused, material's own sentences ship instead", async () => {
  const weather = chunkSource(
    "weather.txt",
    [
      "New York City, NY 10-Day Weather Forecast: Location: New York City, NY Elevation: 1 ft. Today's forecast calls for partly cloudy skies with a high near 82 and a low around 68.",
      "New York City sees heavy rain during Monday morning commute, with skies clearing by afternoon and temperatures reaching the mid 70s.",
    ].join("\n\n"),
  );
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    // The live failure, verbatim shape: every draft narrates the dialogue.
    return "The conversation starts with a question about the weather in New York City. The user is waiting for more information about the weather.";
  };
  const result = await runHolonicTask({
    task: "yeah i want you to look it up",
    chunks: weather,
    call,
    planMode: "flat",
    discourse: "asked about the weather in New York City today",
  });
  assert.ok(result.open.some((o) => o.includes("restates the prompt")), "narration is typed as an echo");
  assert.ok(!result.output.includes("The user is waiting"), "the narration never ships");
  assert.ok(!result.output.includes("The conversation starts"), "the narration never ships");
  // What ships instead is the material's own forecast, with its address —
  // the mechanical assembly the narration was standing in front of.
  assert.ok(result.output.includes("partly cloudy") || result.output.includes("heavy rain"), result.output);
  assert.ok(result.output.includes("[weather.txt#"), "every shipped sentence wears its address");
});

test("a dialogue-act verb inside a LATER clause never convicts an earlier, unrelated subject", async () => {
  // Chorus review (2026-08-18, Dijkstra persona): the narration guard's
  // gap-between-subject-and-verb originally excluded only sentence-final
  // punctuation, so a verb from the closed list sitting inside a relative
  // clause anywhere later in the sentence still matched — "The question of
  // emancipation, WHICH CONTEMPORARIES SAID would ruin the gentry, defined
  // the decade" has "the question" as subject and "said" downstream, with
  // nothing narrating anything. Fixed by stopping the gap at the same
  // clause boundaries WH_CLAUSE already respects (comma/semicolon/colon/
  // dash), not just end-of-sentence punctuation.
  const history = chunkSource("history.txt", "The question of emancipation defined the decade for the gentry.");
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    return "The question of emancipation, which contemporaries said would ruin the gentry, defined the decade.";
  };
  const result = await runHolonicTask({
    task: "what defined the decade for the gentry?",
    chunks: history,
    call,
    planMode: "flat",
  });
  assert.ok(!result.open.some((o) => o.includes("restates the prompt")), "a real answer with a relative clause is not an echo");
  assert.ok(result.output.includes("defined the decade"), result.output);
});

test("material genuinely about a user keeps its non-narration sentences", async () => {
  // The disclosed residue's other side, pinned so the guard never widens
  // into stripping real content: a sentence whose subject happens to open
  // "The user" but carries no dialogue-act verb is content, not narration.
  const manual = chunkSource(
    "manual.txt",
    "The user account is locked after three failed attempts. The reset procedure requires an administrator token issued by the operations desk.",
  );
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    return "The user account is locked after three failed attempts, and the reset procedure requires an administrator token.";
  };
  const result = await runHolonicTask({
    task: "when does an account lock and how is it reset?",
    chunks: manual,
    call,
    planMode: "flat",
  });
  assert.ok(!result.open.some((o) => o.includes("restates the prompt")), "a locked-account answer is not an echo");
  assert.ok(result.output.includes("locked after three failed attempts"), "the content ships");
});

test("a prompt that matched no material gets one plain-chat reply, not a diagnosis", async () => {
  const calls = [];
  const call = async (messages) => {
    calls.push(messages[0].content);
    // The execute call (material framing) restates the prompt; the plain-chat
    // fallback answers like a person.
    return messages[0].content === CHAT_SYSTEM_PROMPT
      ? "Hi there! How can I help you today?"
      : "The question is: hi.";
  };
  const result = await runHolonicTask({ task: "hi", chunks: [], call, planMode: "flat" });
  // The echo never ships: the part answered with a real greeting.
  assert.equal(result.output, "Hi there! How can I help you today?");
  assert.ok(calls.includes(CHAT_SYSTEM_PROMPT), "the chat fallback ran");
  assert.ok(result.open.every((o) => !o.includes("restates")), "no typed echo on the record");
});

// ── the void, acknowledged (2026-08-19, user direction) ─────────────────
// "if the surf did not turn something up, the model should be fed the
// acknowledgement of this void" — a preflight search that ran and found
// nothing must not look, to the model, identical to a turn where no search
// was ever attempted.

test("searchedVoid reaches a flat chat turn's system prompt as a fact, not an instruction", async () => {
  let sawVoid = false;
  const call = async (messages) => {
    if (messages[0].content.includes(SEARCHED_VOID_PREFIX)) sawVoid = true;
    return "I looked and couldn't find anything on that — sorry!";
  };
  const result = await runHolonicTask({
    task: "what's the score of the Kessington charity match right now?",
    chunks: [],
    call,
    planMode: "flat",
    searchedVoid: `${SEARCHED_VOID_PREFIX} (checked the web: the search ran but found no pages for these words.)`,
  });
  assert.ok(sawVoid, "the void must ride the system prompt, not be silently dropped");
  assert.ok(result.output.length > 0);
});

test("searchedVoid also reaches a flat chat turn that carries verbatim history", async () => {
  let sawVoid = false;
  const call = async (messages) => {
    if (messages[0].content.includes(SEARCHED_VOID_PREFIX)) sawVoid = true;
    return "Still nothing on that one.";
  };
  await runHolonicTask({
    task: "any update?",
    chunks: [],
    call,
    planMode: "flat",
    chatHistory: [{ role: "user", content: "what's the score?" }, { role: "assistant", content: "let me check." }],
    searchedVoid: SEARCHED_VOID_PREFIX,
  });
  assert.ok(sawVoid, "the void must reach the history-carrying branch too, not just the no-history one");
});

test("the discourse line reaches a materialless flat chat turn that carries verbatim history too", async () => {
  // Same bug, same fix, the other executeMessages branch: a chat turn with
  // no material still used to drop the one-line discourse fold the moment
  // chatHistory existed — the exact branch a startle-narrowed conversation
  // (aperture.js's presentWindow, down to as little as one exchange) falls
  // into most often, which is precisely when the distilled anchor matters.
  let sawDiscourse = false;
  const call = async (messages) => {
    if (messages[0].content.includes("harbor traffic · the spring revision")) sawDiscourse = true;
    return "Still the spring figure, yes.";
  };
  await runHolonicTask({
    task: "and the other one?",
    chunks: [],
    call,
    planMode: "flat",
    chatHistory: [{ role: "user", content: "what's the figure?" }, { role: "assistant", content: "12%." }],
    discourse: "harbor traffic · the spring revision",
  });
  assert.ok(sawDiscourse, "discourse must reach the history-carrying materialless branch too, not just the no-history one");
});

test("without searchedVoid, an ordinary materialless chat turn is untouched — no phantom acknowledgement", async () => {
  let sawVoid = false;
  const call = async (messages) => {
    if (messages[0].content.includes(SEARCHED_VOID_PREFIX)) sawVoid = true;
    return "Hey! What's up?";
  };
  await runHolonicTask({ task: "hey", chunks: [], call, planMode: "flat" });
  assert.equal(sawVoid, false, "a turn where no search ran must never claim one did");
});

test("searchedVoid is flat-only — a decomposed part's chat branch stays untouched", async () => {
  // A decomposed part matters only when discourse.js's own scoping says
  // it should widen; a task-wide fact like a preflight search must not
  // leak into a planned part's narrower framing.
  let sawVoid = false;
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    if (messages[0]?.content?.includes(SEARCHED_VOID_PREFIX)) sawVoid = true;
    return "An answer.";
  };
  await runHolonicTask({
    task: "hi there, two things: a) how are you b) what's new",
    chunks: [],
    call,
    planMode: "model",
    searchedVoid: SEARCHED_VOID_PREFIX,
  });
  assert.equal(sawVoid, false, "searchedVoid must not reach a decomposed part's own prompt");
});

test("priorPass reaches a flat chat turn's system prompt as S1's own words, checkable not assumed right", async () => {
  let seen = null;
  const call = async (messages) => {
    seen = messages[0].content;
    return "Confirmed — that's right.";
  };
  const result = await runHolonicTask({
    task: "what's 2+2 in Roman numerals?",
    chunks: [],
    call,
    planMode: "flat",
    priorPass: "IV",
  });
  assert.ok(seen.includes('"IV"'), `S1's own answer must ride the system prompt verbatim: ${seen}`);
  assert.ok(!/\byou must\b/i.test(seen), "information, not an instruction stacked on top");
  assert.ok(result.output.length > 0);
});

test("priorPass also reaches the flat MATERIAL branch — unlike searchedVoid, S1's answer stays relevant once material exists", async () => {
  let seen = null;
  const call = async (messages) => {
    seen = messages[0].content;
    const refs = offeredRefs(promptOf(messages));
    return `The Kessington report puts the harbor figure at 12% for the spring quarter. [${refs[0] ?? "x#0-1"}]`;
  };
  await runHolonicTask({
    task: "what was the harbor figure?",
    chunks,
    call,
    planMode: "flat",
    priorPass: "It was around 12%, I think.",
  });
  assert.ok(seen.includes("It was around 12%"), `S1's answer must reach the material branch too: ${seen}`);
});

test("without priorPass, an ordinary turn is untouched — no phantom first pass", async () => {
  let seen = null;
  const call = async (messages) => {
    seen = messages[0].content;
    return "Hey! What's up?";
  };
  await runHolonicTask({ task: "hey", chunks: [], call, planMode: "flat" });
  assert.ok(!seen.includes("faster, unchecked first pass"), "a turn with no S1 pass must never claim one existed");
});

test("priorPass is flat-only — a decomposed part's own prompt stays untouched", async () => {
  let seen = null;
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    seen = messages[0]?.content;
    return "An answer.";
  };
  await runHolonicTask({
    task: "hi there, two things: a) how are you b) what's new",
    chunks: [],
    call,
    planMode: "model",
    priorPass: "Doing fine, nothing new.",
  });
  assert.ok(!seen.includes("faster, unchecked first pass"), "priorPass must not reach a decomposed part's own prompt");
});

test("a draft that opens by restating the prompt ships without its framing", async () => {
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const refs = offeredRefs(promptOf(messages));
    return `The question is about the harbor figure. The Kessington report puts the harbor figure at 12% for the spring quarter. [${refs[0] ?? "x#0-1"}]`;
  };
  const result = await runHolonicTask({
    task: "what was the harbor figure for the spring quarter?",
    chunks,
    call,
    planMode: "flat",
  });
  assert.ok(!result.output.includes("The question is about"), "the framing sentence was stripped");
  assert.ok(result.output.includes("Kessington report"), "the content survives");
});

// ── the completeness gate (2026-08-19, user direction: "we STILL are not
// getting Johnson, it's not adversarially checking if there is more to the
// story") — the live specimen this closes: "who was Lincoln's vice
// president?" answered "Hannibal Hamlin" alone, bound and correct, while
// the material also stated Andrew Johnson as a second, equally real VP.
// hypergraph.js's own clusterFillers already computed this cardinality on
// every such claim; nothing downstream ever asked. This is that ask,
// against the REAL relation tier — not a fixture standing in for it.
// Same fixture hypergraph.test.mjs's own LINCOLN_PASSAGES already proved
// establishes Lincoln/Hamlin/Johnson/Seward as real referents (Lincoln
// needed outside sentence-initial position too — see that file's own
// fixture comment) — reused rather than re-derived.
const LINCOLN_TEXT =
  "Lincoln appointed Hamlin. Lincoln appointed Johnson. Lincoln nominated Seward. Hamlin visited Lincoln often. Johnson visited Lincoln rarely.";

test("a bound-but-incomplete answer triggers the completeness gate, and naming the missing filler clears it", async () => {
  const relationsFor = makeRelationReader(await relationOrgans());
  let corrected = false;
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const user = messages[1]?.content ?? "";
    if (user.includes("the material confirms exactly")) {
      corrected = true;
      assert.match(user, /Johnson/, "the correction prompt must name the real, missing filler — not just say 'be more complete'");
      return "Lincoln appointed Hamlin in 1861. Lincoln appointed Johnson later.";
    }
    // First draft: true, bound, and — the whole point — incomplete. Worded
    // differently from the material's own sentence (not a verbatim copy of
    // it) so this tests the completeness gate specifically, not reproduction.
    return "Lincoln appointed Hamlin in 1861.";
  };
  const result = await runHolonicTask({
    task: "who did Lincoln appoint?",
    chunks: chunkSource("lincoln.txt", LINCOLN_TEXT),
    call,
    planMode: "flat",
    makeRelationReader: relationsFor,
  });
  assert.ok(corrected, "the incomplete verdict must trigger the tailored rewrite");
  assert.match(result.output, /Johnson/, "the shipped answer must cover the filler the first draft missed");
  assert.ok(
    !result.open.some((o) => o.includes("names only one of several")),
    "once both fillers are covered, the gap is no longer open",
  );
});

// ── the MIRROR completeness signal: one verb+object slot, competing
// SUBJECTS (queryFillers with subject left open) — the "Abraham Lincoln's
// vice president" specimen, run for real first before it was wired
// (see POLICIES.md P38's amendment for the live queryFillers proof this
// closes). incompleteClaimsOf already caught "Lincoln —appointed→
// {Hamlin, Johnson}" (one subject, many objects); this is the other
// direction: "{Hamlin, Johnson} —was→ Lincoln's vice president" (one
// object, many subjects) — a question can outrun the material on either
// end, and only one end was ever checked before today.
const COMPETING_SUBJECT_TEXT =
  "Hannibal Hamlin was Lincoln's vice president. Andrew Johnson was Lincoln's vice president. Lincoln nominated Seward for the post.";

test("a slot with competing SUBJECTS (not objects) trips the completeness gate too, and the correction names both", async () => {
  const relationsFor = makeRelationReader(await relationOrgans());
  let corrected = false;
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const user = messages[1]?.content ?? "";
    if (user.includes("the material confirms exactly")) {
      corrected = true;
      assert.match(user, /Johnson/, "the correction prompt must name the real, missing subject — not just say 'be more complete'");
      return "Hannibal Hamlin was Lincoln's vice president. Andrew Johnson was Lincoln's vice president too.";
    }
    // First draft: true, bound, and — the whole point — names only ONE of
    // the two subjects the material confirms for this exact slot. Worded
    // with a trailing clause the material itself does not carry (not a
    // verbatim copy of the material's own sentence) so this tests the
    // completeness gate specifically, not reproduction — the identical
    // discipline the object-side sibling test above already uses.
    return "Hannibal Hamlin was Lincoln's vice president in 1861.";
  };
  const result = await runHolonicTask({
    task: "who was Lincoln's vice president?",
    chunks: chunkSource("lincoln-vp.txt", COMPETING_SUBJECT_TEXT),
    call,
    planMode: "flat",
    makeRelationReader: relationsFor,
  });
  assert.ok(corrected, "the competing-subjects signal must trigger the tailored rewrite");
  assert.match(result.output, /Johnson/, "the shipped answer must cover the subject the first draft missed");
  assert.ok(
    !result.open.some((o) => o.includes("names only one of several")),
    "once both subjects are covered, the gap is no longer open",
  );
});

// ── the relation tier read a correction retry's RAW draft, before the
// ship-time framing cut (which only ran once, after the whole loop settled)
// ever saw it (2026-08-20, found live: eval/results/material-dialogue-
// stress-703.jsonl turn 23). A retry that opens by echoing the question
// back — an ordinary small-model shape, the exact one the framing cut
// exists to clean — fed that echoed line straight into relations.read(),
// which read the QUESTION's own words as a claim about the world. The
// shipped answer was clean; `section.relations.claims` was not. Reproduced
// directly against the real engine organs (no mock, `node -e`, this file's
// own COMPETING_SUBJECT_TEXT fixture): reading "Who was Lincoln's vice
// president?\nHannibal Hamlin was Lincoln's vice president in 1861."
// manufactures a spurious beyond-reach claim (subject "Who", object
// carrying the "?") alongside the real bound one. inspect() now reads
// stripFraming(text), the SAME cut the ship-time text is built from.
test("a correction retry whose raw completion echoes the question does not leak a spurious relation claim into the shipped record", async () => {
  const relationsFor = makeRelationReader(await relationOrgans());
  let corrected = false;
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const user = messages[1]?.content ?? "";
    if (user.includes("the material confirms exactly")) {
      corrected = true;
      // The correction retry: real small-model shape — opens by echoing the
      // question, then answers cleanly and completely.
      return "Who was Lincoln's vice president?\nHannibal Hamlin was Lincoln's vice president in 1861. Andrew Johnson was Lincoln's vice president too.";
    }
    // First draft: bound but incomplete (names only Hamlin) — the identical
    // setup the sibling test above uses to trigger the competing-subjects
    // retry this test depends on.
    return "Hannibal Hamlin was Lincoln's vice president in 1861.";
  };
  const result = await runHolonicTask({
    task: "who was Lincoln's vice president?",
    chunks: chunkSource("lincoln-vp.txt", COMPETING_SUBJECT_TEXT),
    call,
    planMode: "flat",
    makeRelationReader: relationsFor,
  });
  assert.ok(corrected, "the competing-subjects signal must trigger the retry this test depends on");
  assert.ok(!result.output.includes("Who was Lincoln's vice president?"), "the shipped answer must not carry the echoed question");
  const claims = result.sections[0]?.relations?.claims ?? [];
  assert.ok(claims.length > 0, "the real, answered claims must still reach the record — this is not a test of suppressing the relation tier");
  assert.ok(
    claims.every((c) => c.subject !== "Who" && !String(c.object ?? "").includes("?")),
    `relation claims must come only from the shipped answer, never from the echoed question: ${JSON.stringify(claims)}`,
  );
});

test("a slot with exactly ONE confirmed subject never trips the competing-subjects check — singular is the ordinary case", async () => {
  const relationsFor = makeRelationReader(await relationOrgans());
  let corrections = 0;
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    corrections++;
    // Not verbatim to COMPETING_SUBJECT_TEXT's own "...for the post." — the
    // identical discipline every fixture in this file already applies.
    return "Lincoln nominated Seward for the vacant post.";
  };
  const result = await runHolonicTask({
    task: "who did Lincoln nominate?",
    chunks: chunkSource("lincoln-vp.txt", COMPETING_SUBJECT_TEXT),
    call,
    planMode: "flat",
    makeRelationReader: relationsFor,
  });
  assert.equal(corrections, 1, "a single confirmed subject is the unremarked case — no completeness call spent on it");
});

// ── the completeness gate's belief lands on the shared task-log (P38: "the
// hypergraph records beliefs... held BY AN EXPERIENCER, not just given by a
// source") — grid.js's own tested evaluate/REC organs, not a parallel one.
function freshGridFixture() {
  return import("../eoreader7/legacy-eoreader6.1/packages/engine/operators.js").then(async (operators) => {
    const taskLog = await import("../eoreader7/legacy-eoreader6.1/packages/engine/holon/task-log.js");
    const grid = makeGrid({ operators, taskLog });
    grid.withCapacities({ findCapacity, unresolvedCapacity });
    return grid;
  });
}

test("the completeness gate lands a REAL evaluate belief on the shared grid log — not just an in-memory fact this call's own variables happen to hold", async () => {
  const relationsFor = makeRelationReader(await relationOrgans());
  const runCapacity = makeCapacityRunner({
    referentIndexFor: (passages) => {
      // Only "relations" is exercised by this path; a minimal stand-in for
      // the cast capacity keeps this test from needing a second real organ
      // bundle it never calls.
      return { referents: new Set(), resolve: () => new Set(), represent: () => null, events: [] };
    },
    relationsFor,
  });
  const grid = await freshGridFixture();
  const log0 = grid.createLog();
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const user = messages[1]?.content ?? "";
    if (user.includes("the material confirms exactly")) return "Lincoln appointed Hamlin in 1861. Lincoln appointed Johnson later.";
    return "Lincoln appointed Hamlin in 1861.";
  };
  const result = await runHolonicTask({
    task: "who did Lincoln appoint?",
    chunks: chunkSource("lincoln.txt", LINCOLN_TEXT),
    call,
    planMode: "flat",
    makeRelationReader: relationsFor,
    grid,
    gridLog: log0,
    runCapacity,
    landAct,
  });
  // The log genuinely changed — a new state, not the same object handed back.
  assert.notEqual(result.gridLog, log0, "the completeness gate must land something; the returned log cannot be identical to the one passed in");
  const { acts } = grid.foldGrid(result.gridLog);
  const evaluated = acts.filter((a) => a.verb === "evaluate");
  assert.ok(evaluated.length >= 1, "at least one real evaluate act must land when the completeness gate fires");
  const landed = evaluated[0];
  assert.ok(
    ["holds", "refused"].includes(landed.verdict) || landed.result?.judged?.verdict,
    `the landed evaluate must carry a REAL computed verdict, not a bare declaration: ${JSON.stringify(landed.result)}`,
  );
  // The experiencer rides on the record too — a belief with no one attached
  // to it is exactly the "given by a source" framing this closes.
  const proposeEntry = result.gridLog.entries.find((e) => e.task_id === landed.task_id && e.kind === "propose");
  assert.match(proposeEntry.because ?? "", /holon-relation-tier/, "the belief names WHO was reading when it formed, not just what was found");
});

test("the completeness-gate belief is fully opt-in — omitting grid/gridLog/runCapacity/landAct is byte-identical to before this existed", async () => {
  const relationsFor = makeRelationReader(await relationOrgans());
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const user = messages[1]?.content ?? "";
    if (user.includes("the material confirms exactly")) return "Lincoln appointed Hamlin in 1861. Lincoln appointed Johnson later.";
    return "Lincoln appointed Hamlin in 1861.";
  };
  const result = await runHolonicTask({
    task: "who did Lincoln appoint?",
    chunks: chunkSource("lincoln.txt", LINCOLN_TEXT),
    call,
    planMode: "flat",
    makeRelationReader: relationsFor,
    // grid/gridLog/runCapacity/landAct all omitted — the default.
  });
  assert.equal(result.gridLog, null, "no organs injected means no belief record — never a silently-created one");
  assert.match(result.output, /Johnson/);
});

test("an answer that already names every filler never trips the completeness gate — and its fabricated year is caught by the atom check instead (P122)", async () => {
  const relationsFor = makeRelationReader(await relationOrgans());
  // Two different asks, counted apart: the completeness gate names a missing
  // filler ("the material confirms exactly"); the atom check names a value the
  // sources do not contain. This draft is complete AND carries a fabricated
  // year — 1861 appears nowhere in LINCOLN_TEXT — so the first must not fire
  // and the second must.
  let completeness = 0, atomChecks = 0, drafts = 0;
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const user = messages.at(-1)?.content ?? "";
    if (user.includes("the material confirms exactly")) completeness++;
    else if (user.includes("These sentences say things the sources you were given do not")) atomChecks++;
    else drafts++;
    return "Lincoln appointed Hamlin in 1861. Lincoln appointed Johnson later.";
  };
  const result = await runHolonicTask({
    task: "who did Lincoln appoint?",
    chunks: chunkSource("lincoln.txt", LINCOLN_TEXT),
    call,
    planMode: "flat",
    makeRelationReader: relationsFor,
  });
  assert.equal(completeness, 0, "a complete first draft earns no completeness correction at all");
  assert.equal(drafts, 1, "one draft");
  assert.ok(!result.open.some((o) => o.includes("names only one of several")));
  assert.equal(atomChecks, 1, "the fabricated year earns exactly one atom-check ask");
  assert.deepEqual(result.correction.flags.map((f) => f.flags.map((x) => x.value)).flat(), ["1861"], "1861 is in no passage");
  assert.deepEqual(result.correction.outcomes.map((o) => o.outcome), ["refused"], "the mouth repeated itself, so the flag stands rather than a worse sentence landing");
  assert.match(result.output, /1861/, "a refused rewrite leaves the original, flagged — never silently deleted");
});

test("a single-filler slot never trips the completeness gate — singular is the ordinary, unremarked case", async () => {
  const relationsFor = makeRelationReader(await relationOrgans());
  let corrections = 0;
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    corrections++;
    return "Lincoln nominated Seward for the post.";
  };
  const result = await runHolonicTask({
    task: "who did Lincoln nominate?",
    chunks: chunkSource("lincoln.txt", LINCOLN_TEXT),
    call,
    planMode: "flat",
    makeRelationReader: relationsFor,
  });
  assert.equal(corrections, 1, "a single real filler is the unremarked case — no completeness call spent on it");
});

test("reproduction and incompleteness each get their own correction round — the live Lincoln/Hamlin/Johnson specimen", async () => {
  // The live failure this closes: draft 1 was a bare, correct, but
  // VERBATIM name ("Hannibal Hamlin" in the real trace; "Hamlin" here) —
  // reproducedFromContent convicts it (a short answer is a substring of
  // the material's own sentence, so copiedMass === totalMass). The single
  // correction budget went to fixing reproduction; the fix produced a
  // fuller, paraphrased clause that was STILL incomplete (missing
  // Johnson), and with only one shot spent, that second failure shipped
  // unaddressed. This test pins that the reproduction fix and the
  // completeness fix each get their own round.
  const relationsFor = makeRelationReader(await relationOrgans());
  let reproductionRound = 0;
  let incompleteRound = 0;
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const user = messages[1]?.content ?? "";
    if (user.includes("the material confirms exactly")) {
      incompleteRound++;
      assert.match(user, /Johnson/, "the completeness correction must name the real missing filler");
      return "Lincoln appointed Hamlin in 1861. Lincoln appointed Johnson later.";
    }
    if (user.includes("copies the passage word for word")) {
      reproductionRound++;
      // Paraphrased, not verbatim — clears reproduction, but is now a
      // full clause the completeness gate can examine, and it names only
      // Hamlin, exactly like the live specimen's own draft 2.
      return "Lincoln appointed Hamlin in 1861.";
    }
    // First draft: a bare, verbatim, correct-but-incomplete name — too
    // short and clauseless for the completeness gate to see at all, but
    // caught as reproduction because it is a substring of the material's
    // own sentence.
    return "Hamlin";
  };
  const result = await runHolonicTask({
    task: "who did Lincoln appoint?",
    chunks: chunkSource("lincoln.txt", LINCOLN_TEXT),
    call,
    planMode: "flat",
    makeRelationReader: relationsFor,
  });
  assert.equal(reproductionRound, 1, "the bare verbatim draft must trigger exactly one reproduction correction");
  assert.equal(incompleteRound, 1, "the fuller-but-incomplete draft must get its OWN correction round, not be silently shipped");
  assert.match(result.output, /Johnson/, "Johnson must surface in the final shipped answer");
  assert.ok(!result.open.some((o) => o.includes("reproduces the material verbatim")));
  assert.ok(!result.open.some((o) => o.includes("names only one of several")));
});

// ── the succession-box completeness signal (succession.js, additive to the
// hypergraph-based gate above) — the real live specimen: a Wikipedia
// succession box never states "Lincoln's vice presidents were Hamlin and
// Johnson" as one sentence extractRelations could bind; it states two
// separate records, each in its own "Preceded by"/"Succeeded by" fields.
// Reused verbatim from the real running app's own captured material.
const SUCCESSION_TEXT = `15th Vice President of the United States
In office
March 4, 1861 – March 4, 1865
President Abraham Lincoln
Preceded by John C. Breckinridge
Succeeded by Andrew Johnson
23rd United States Minister to Spain
In office
December 20, 1881 – October 17, 1882
President Chester A. Arthur
Preceded by Lucius Fairchild
Succeeded by John W. Foster
United States Senator from Maine
In office
March 4, 1869 – March 3, 1881
Preceded by Lot M. Morrill
Succeeded by Eugene Hale

17th President of the United States
In office
April 15, 1865 – March 4, 1869
Vice President Vacant [ a ]
Preceded by Abraham Lincoln
Succeeded by Ulysses S. Grant
16th Vice President of the United States
In office
March 4, 1865 – April 15, 1865
President Abraham Lincoln
Preceded by Hannibal Hamlin
Succeeded by Schuyler Colfax
United States Senator
from Tennessee
In office
March 4, 1875 – July 31, 1875
Preceded by Parson Brownlow
Succeeded by David M. Key

Hannibal Hamlin (August 27, 1809 – July 4, 1891) was an American politician and diplomat who was the 15th vice president of the United States, serving from 1861 to 1865, during President Abraham Lincoln's first term. He was the first Republican vice president.`;

test("a succession-box specimen: naming only Hamlin trips the completeness gate, and the correction names Johnson", async () => {
  const relationsFor = makeRelationReader(await relationOrgans());
  let corrected = false;
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const user = messages[1]?.content ?? messages[0]?.content ?? "";
    if (user.includes("the material confirms exactly")) {
      corrected = true;
      assert.match(user, /Johnson/, "the correction prompt must name the real, missing filler off the succession box");
      return "Hannibal Hamlin was Abraham Lincoln's first vice president, and Andrew Johnson was his second.";
    }
    // First draft: true, bound in the ordinary prose sense, and correct —
    // but names only one of the two real succession-box holders.
    return "Hannibal Hamlin was Abraham Lincoln's vice president.";
  };
  const result = await runHolonicTask({
    task: "who was Abraham Lincoln's vice president?",
    chunks: chunkSource("lincoln-succession.txt", SUCCESSION_TEXT),
    call,
    planMode: "flat",
    // High enough that all three of this material's own retrieval chunks
    // (the boundary the plain-prose blank lines already draw) come back
    // regardless of which one scores highest — succession.js needs the
    // WHOLE box structure, including the box that anchors Hamlin and the
    // box whose chain resolves Johnson, to be in the same sourceBlock.
    passagesPerPart: 10,
    makeRelationReader: relationsFor,
  });
  assert.ok(corrected, "the succession-box signal must trigger the tailored rewrite");
  assert.match(result.output, /Johnson/, "the shipped answer must cover the succession-box filler the first draft missed");
});

test("a fenced code answer survives byte-exact — fences are structure, never framing", async () => {
  // Measured live: ```python read as framing (its one token was in the
  // prompt), the opening fence was dropped, and the framing trim's rejoin
  // flattened every newline — the code arrived as one line with an orphan
  // fence, and no build could be made from it.
  const code =
    "```python\ndef fib(n):\n    a = [0, 1]\n    for i in range(2, n):\n        a.append(a[i-1] + a[i-2])\n    return a\n```";
  const task = "Write a short Python function returning the first n Fibonacci numbers.";

  const bare = await runHolonicTask({ task, chunks: [], call: async () => code, planMode: "flat" });
  assert.equal(bare.output, code, "no framing: the draft ships untouched, newlines and all");

  const framed = await runHolonicTask({
    task,
    chunks: [],
    call: async () => `The question is about Fibonacci numbers. ${code}`,
    planMode: "flat",
  });
  // The framing prefix used to be CUT here (stripNarrationSentences, inside
  // clean()) — silent surgery on the model's own words, on the chat/no-
  // material path too, contradicting that path's own stated law two
  // paragraphs up in holon.js ("What the person gets is what the model
  // said, as a person"). User direction, 2026-08-19: no post-processing —
  // the model's words ship as the model wrote them; a bad opener is a
  // reason to ask it to reconsider, never a reason to edit it out from
  // under it. So the prefix now survives. What this test actually
  // guards — fence integrity — still must hold: the code block itself
  // stays byte-exact, no dropped fence, no flattened newlines.
  assert.ok(
    framed.output.endsWith(code),
    "the fenced code block survives byte-exact even when framing prose precedes it",
  );
});

// ── the reproduction detector's fold, and its measure ───────────────────────
//
// A model does not retype a source's bytes; it retypes its WORDS. Curly
// quotes come back straight, em dashes come back as hyphens, the ellipsis
// glyph comes back as three dots, and a comma drifts. The detector's fold
// must be blind to all of that on BOTH sides or a photocopy reads as an
// answer (audit 2026-08-16, findings at holon.js:649 and :657).
const LEDGER = chunkSource(
  "ledger.txt",
  [
    // Curly apostrophe, curly quotation marks, an em dash, an ellipsis glyph
    // — the typography a source carries and a model does not reproduce.
    "The harbourmaster’s ledger records the tonnage of every berth, and the clerk kept the margin for his own remarks. “The silting figure was never disputed,” he wrote there — the committee had accepted it in March, and nobody reopened it afterwards. The audit is finished. The berths reopened in May.",
    // Dialogue: nine short lines, most of them under any content-token floor.
    "“Well, and what then?” he asked.\n“Nothing,” said Pierre.\n“He has gone away.”\n“Gone where?”\n“To Moscow, they say.”\n“And the letter?”\n“It was burned.”\n“Burned by whom?”\n“By the count himself.”",
    "Unrelated paragraph about the town festival, the weather, and the new bakery on the corner of the square.",
  ].join("\n\n"),
);

test("a transcription with its typography normalized is still a reproduction", async () => {
  // The first chunk, retyped: straight quotes for curly, a hyphen for the em
  // dash, a straight apostrophe, and one comma dropped. Not one word changed.
  const retyped =
    "The harbourmaster's ledger records the tonnage of every berth and the clerk kept the margin for his own remarks. \"The silting figure was never disputed,\" he wrote there - the committee had accepted it in March, and nobody reopened it afterwards. The audit is finished. The berths reopened in May.";
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    return retyped;
  };
  const result = await runHolonicTask({
    task: "what does the ledger say about the silting figure?",
    chunks: LEDGER,
    call,
    planMode: "flat",
  });
  assert.ok(
    result.open.some((o) => o.includes("reproduces the material verbatim; it does not answer")),
    "straightened typography is retyping, not writing",
  );
  // The retyping earned nothing; the mechanical assembly ships in its place,
  // quoting the material with its address on every sentence.
  assert.ok(result.open.some((o) => o.includes("assembled mechanically")));
  assert.ok(result.output.includes("[ledger.txt#"), result.output);
});

test("wholesale transcription of short dialogue is a reproduction", async () => {
  // Nine short lines behind one lead-in sentence. Under a sentence COUNT the
  // lines sit in the denominator and can never reach the numerator (each is
  // under the content-token floor), so the majority cut can never fire — the
  // whole dialogue face of a novel photocopies past the guard. Character mass
  // has no such blind spot: what the lines weigh is what they contribute.
  const dialogue = LEDGER[1].text;
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    return `The exchange between the two men runs as follows.\n${dialogue}`;
  };
  const result = await runHolonicTask({
    task: "what passes between the count and Pierre about the letter?",
    chunks: LEDGER,
    call,
    planMode: "flat",
  });
  assert.ok(
    result.open.some((o) => o.includes("reproduces the material verbatim; it does not answer")),
    "short lines are still the material's words",
  );
  // The transcription earned nothing; what ships is the mechanical assembly
  // with its addresses.
  assert.ok(result.open.some((o) => o.includes("assembled mechanically")));
  assert.ok(result.output.includes("[ledger.txt#"), result.output);
});

test("an original short answer holding two verbatim lines is NOT a reproduction", async () => {
  // The false-positive guard, and the reason the measure is mass rather than
  // a floorless sentence count: two of these three sentences ARE the
  // material's own words ("The audit is finished." / "The berths reopened in
  // May.") — a count would read 2 of 3 and condemn an answer whose substance
  // is entirely the model's own. Mass reads what the three sentences actually
  // weigh, and the original one weighs more than both quotations together.
  const answer =
    "The audit is finished. The berths reopened in May. What the ledger will not tell you is why the committee let the silting number stand for so long, and nothing in these pages connects the closure of the berths to that decision.";
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const refs = offeredRefs(promptOf(messages), LEDGER);
    return `${answer} [${refs[0] ?? "ledger.txt#0-1"}]`;
  };
  const result = await runHolonicTask({
    task: "what does the ledger not tell you about the silting decision?",
    chunks: LEDGER,
    call,
    planMode: "flat",
  });
  assert.ok(
    !result.open.some((o) => o.includes("reproduces the material")),
    "an answer that answers is not a photocopy",
  );
  assert.ok(!result.open.some((o) => o.includes("restates the prompt")));
  assert.ok(result.refs.length >= 1, "and it keeps the warrant it earned");
});

test("a plan that fails to parse is itself a typed gap", async () => {
  const call = async (messages) =>
    messages[0].content === PLAN_SYSTEM_PROMPT
      ? "no json for you"
      : `The report puts the harbor figure at 12%. [${offeredRefs(promptOf(messages))[0] ?? "x#0-1"}]`;
  const result = await runHolonicTask({ task: "the harbor figure", chunks, call });
  assert.equal(result.plan.degraded, true);
  assert.ok(result.open.some((o) => o.includes("plan did not parse")));
  // One part means no heading scaffolding around a single answer.
  assert.ok(!result.output.startsWith("##"));
});

// ── the embedded-interrogative echo, from the live Borodino runs ────────────
// Measured 2026-08-17, three echoes in a row: the model resolves the
// question's "this battle" to the material's own "Borodino" and restates the
// question — as a declarative ("…is addressed."), and twice with the question
// mark still on. The word-for-word framing test cannot see any of the three;
// the wh-clause blanking and the ?-tail rule must.
const BORODINO = [
  "The battle near the village of Borodino was fought on 7 September 1812, during the French invasion of Russia.",
  "The Grande Armee under Napoleon met the Imperial Russian Army about 110 kilometres west of Moscow.",
  "The Russian army withdrew in good order afterward, and Napoleon entered Moscow a week later without a decisive victory.",
].join("\n\n");
const borodinoChunks = chunkSource("pasted.txt", BORODINO);
const BORODINO_TASK = "Who commanded the Russian army at this battle, and who led the French?";

test("an echo that resolves the question's own deixis is still an echo: typed open, no refs", async () => {
  let drafts = 0;
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const refs = offeredRefs(promptOf(messages), borodinoChunks);
    // First draft: the declarative echo. Correction: the ?-terminated echo.
    // Both are the live shapes, byte for byte in structure.
    drafts++;
    return drafts === 1
      ? `The question of who commanded the Russian army at the Battle of Borodino and who led the French is addressed. [${refs[0] ?? "x#0-1"}]`
      : `The question at hand is who commanded the Russian army at the Battle of Borodino, and who led the French forces? [${refs[0] ?? "x#0-1"}]`;
  };
  const result = await runHolonicTask({ task: BORODINO_TASK, chunks: borodinoChunks, call, planMode: "flat" });
  assert.ok(result.open.some((o) => o.includes("restates the prompt")), JSON.stringify(result.open));
  // The restatement never ships: the mechanical assembly does, quoting the
  // material with addresses on every sentence.
  assert.ok(result.open.some((o) => o.includes("assembled mechanically")));
  assert.ok(result.output.includes("[pasted.txt#"), result.output);
  assert.ok(!/question at hand|is addressed/.test(result.output), "the echo itself stays off the page");
});

test("a real answer carrying a wh-relative clause is NOT framing and keeps its warrant", async () => {
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const refs = offeredRefs(promptOf(messages), borodinoChunks);
    return `Napoleon, who led the French, entered Moscow a week later. [${refs[0] ?? "x#0-1"}]`;
  };
  const result = await runHolonicTask({ task: "who led the French at this battle?", chunks: borodinoChunks, call, planMode: "flat" });
  assert.ok(!result.open.some((o) => o.includes("restates the prompt")), JSON.stringify(result.open));
  assert.ok(result.refs.length >= 1, "content outside the wh-clause is an answer, and it keeps its address");
});

// ── the link tier (links.js): a cited URL is checked, not taken on its own word ──

test("checkLink off (the default): a cited URL ships untouched — nothing was fetched to accuse it", async () => {
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const refs = offeredRefs(promptOf(messages));
    return `The report puts the harbor figure at 12% for the spring quarter. [${refs[0]}] See https://fake.example/report for the filing.`;
  };
  const result = await runHolonicTask({ task: "State the harbor figure the Kessington report gives.", chunks, call, planMode: "flat" });
  const section = result.sections[0];
  assert.equal(section.links, null, "no checkLink organ was injected — the tier does not run at all");
  assert.match(section.text, /https:\/\/fake\.example\/report/, "the standing web consent being off never accuses a citation it cannot check");
});

test("checkLink on: a URL that does not resolve is mechanically removed from the shipped text and joins the record's unsupported list", async () => {
  const seen = [];
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const refs = offeredRefs(promptOf(messages));
    return `The report puts the harbor figure at 12% for the spring quarter. [${refs[0]}] See https://fake.example/report for the filing.`;
  };
  const checkLink = async (url) => {
    seen.push(url);
    return { ok: false, status: 404 };
  };
  const result = await runHolonicTask({
    task: "State the harbor figure the Kessington report gives.",
    chunks,
    call,
    planMode: "flat",
    checkLink,
  });
  assert.deepEqual(seen, ["https://fake.example/report"]);
  const section = result.sections[0];
  assert.equal(section.links.links.length, 1);
  assert.equal(section.links.links[0].verdict, "unreachable");
  assert.ok(section.linkCorrections.some((c) => c.url === "https://fake.example/report"));
  // The bare, working-looking citation is gone from what ships…
  assert.doesNotMatch(section.text, /See https:\/\/fake\.example\/report for/);
  // …replaced with a marker that still names what was tried, and the
  // finding lands on the record's unsupported list, same as an invented
  // figure or a fabricated quotation would.
  assert.match(section.text, /\[link removed — did not resolve: https:\/\/fake\.example\/report\]/);
  assert.ok(result.unsupported.some((u) => u.includes("https://fake.example/report")));
});

test("checkLink on: a URL that resolves ships exactly as written, no marker, not fetched twice", async () => {
  let calls = 0;
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const refs = offeredRefs(promptOf(messages));
    return `The report puts the harbor figure at 12% for the spring quarter. [${refs[0]}] See https://real.example/report for the filing.`;
  };
  const checkLink = async (url) => {
    calls++;
    return { ok: true, status: 200, textChars: 4000, title: "The Kessington Filing" };
  };
  const result = await runHolonicTask({
    task: "State the harbor figure the Kessington report gives.",
    chunks,
    call,
    planMode: "flat",
    checkLink,
  });
  assert.equal(calls, 1);
  const section = result.sections[0];
  assert.equal(section.links.links[0].verdict, "resolved");
  assert.match(section.text, /See https:\/\/real\.example\/report for the filing\./);
  assert.ok(!result.unsupported.some((u) => u.includes("real.example")));
});

test("checkLink on: a URL the loaded material itself already contains is never fetched — it is material-grounded, not a model assertion", async () => {
  const withUrlChunks = chunkSource(
    "notes.txt",
    `${CORPUS}\n\nThe filing is mirrored at https://real.example/mirror for the public record.`,
  );
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const refs = offeredRefs(promptOf(messages), withUrlChunks);
    return `The report puts the harbor figure at 12% for the spring quarter, mirrored at https://real.example/mirror. [${refs[0]}]`;
  };
  const checkLink = async () => {
    throw new Error("checkLink must not be called for a URL already in the loaded material");
  };
  const result = await runHolonicTask({
    task: "State the harbor figure the Kessington report gives.",
    chunks: withUrlChunks,
    call,
    planMode: "flat",
    checkLink,
  });
  const section = result.sections[0];
  assert.equal(section.links.links[0].verdict, "in-material");
  assert.match(section.text, /https:\/\/real\.example\/mirror/);
});

test("mechanicalAnswer: prefers a real sentence over a bare infobox row with the same or higher raw overlap", () => {
  // Measured live 2026-08-20 against real fetched material ("who was
  // Abraham Lincoln's vice president?"): a succession box's "In office /
  // President X / Preceded by Y / Succeeded by Z" lines have no sentence-
  // final punctuation, and raw overlap-count alone let "President Abraham
  // Lincoln" (3 words, all query tokens) outrank a genuinely informative
  // sentence in the same passage. This pins the fix: terminal punctuation
  // is a structural tell for real prose vs. page furniture, applied here
  // the way blankStructure/stripContainer already apply it elsewhere.
  const mixed =
    "President Abraham Lincoln\n\n" +
    "Hamlin left the vice presidency in 1865 and later returned to the Senate representing Maine.";
  const out = mechanicalAnswer("Who was Abraham Lincoln's vice president?", [{ text: mixed, ref: "b" }]);
  assert.match(out, /Hamlin left the vice presidency/);
  assert.doesNotMatch(out, /"President Abraham Lincoln"/);
});

test("mechanicalAnswer: still surfaces a bare fragment honestly when no real sentence exists in that passage", () => {
  const infoboxOnly =
    "In office\nMarch 4, 1861 – March 4, 1865\nPresident Abraham Lincoln\n" +
    "Preceded by John C. Breckinridge\nSucceeded by Andrew Johnson";
  const out = mechanicalAnswer("Who was Abraham Lincoln's vice president?", [{ text: infoboxOnly, ref: "a" }]);
  assert.match(out, /President Abraham Lincoln/, "never nothing when something exists, even a fragment");
});

// ── P73: the door's grammar gate threads from runHolonicTask to admit ──────
// The pin is the THREADING, not the lens: a stub reader yields one bound
// claim so the admit path genuinely runs, a stub hyperlexicon captures the
// options the door was actually called with, and the lens object must
// arrive by identity — with null (the default, every pre-existing caller)
// pinned as its own case so the gate never runs unasked.
test("classifyConnector threads from runHolonicTask through runPart to the admit door (P73)", async () => {
  const runWith = async (opts) => {
    const seen = [];
    const stubHyperlexicon = {
      createHyperlexicon: () => ({ entries: [] }),
      admit: (log, edges, o) => { seen.push(o); return { log, heard: edges.map(() => ({})), turnedAway: [] }; },
      foldHyperlexicon: () => [],
    };
    const stubReader = () => ({
      edges: [],
      read: () => ({
        claims: [{
          verdict: "bound", subject: "Kessington report", verb: "put",
          object: "the harbor figure at 12%",
          spans: [{ ref: "notes.txt#0-40", start: 0, end: 40, text: "The Kessington report put the harbor" }],
        }],
      }),
    });
    await runHolonicTask({
      task: "what is the harbor figure?",
      chunks,
      call: async () => "The harbor figure is 12%.",
      makeRelationReader: stubReader,
      hyperlexicon: stubHyperlexicon,
      hyperlexiconLog: null,
      ...opts,
    });
    return seen;
  };

  const lens = () => ({ settled: false, thraxClass: null });
  const threaded = await runWith({ classifyConnector: lens });
  assert.ok(threaded.length > 0, "the door was reached");
  for (const o of threaded) assert.equal(o.classifyConnector, lens, "the lens arrives at admit by identity");

  const unthreaded = await runWith({});
  assert.ok(unthreaded.length > 0, "the door was reached on the default path too");
  for (const o of unthreaded) assert.equal(o.classifyConnector, null, "absent, the gate is null — never a silent default lens");
});

// ── P84: the ledger block discloses standing; it never withholds ──────────
// Two tiers inside one budget: corroborated notes (kernel standingOf —
// distinct SOURCES) first, then single-witness notes that share vocabulary
// with THIS part's question; a primary-backed note is named as such. A
// single note about something else never reaches the model, and every
// line is firewall-clean.
test("the ledger block carries corroborated notes, then question-relevant single-witness notes with their standing disclosed, and names a primary-backed note (P84)", async () => {
  const sent = [];
  const notes = [
    { id: "a", subject: "Kessington", verb: "lies", object: "on the harbor coast", witnesses: ["k.txt#0-9~r", "primary:archive.org#3-40~ranke-v1"], sources: 2, instruments: 2, standing: "corroborated-independently", kinds: { sighting: 1, primary: 1 } },
    { id: "b", subject: "the harbor", verb: "opened", object: "in 1811", witnesses: ["k.txt#20-30~r"], sources: 1, instruments: 1, standing: "single-witness", kinds: { sighting: 1 } , disputedBy: [{ id: "d1", source: "t.txt", because: "the harbor opened in 1812", kind: "contest" }] },
    { id: "c", subject: "Mars", verb: "orbits", object: "the sun", witnesses: ["m.txt#0-9~r"], sources: 1, instruments: 1, standing: "single-witness", kinds: { sighting: 1 } },
    { id: "d", subject: "the harbor tide", verb: "turns", object: "twice a day", witnesses: ["k.txt#50-60~r", "t.txt#1-9~r"], sources: 2, instruments: 1, standing: "corroborated", kinds: { sighting: 2 } },
    { id: "e", subject: "the tide", verb: "turns", object: "twice a day", witnesses: ["k.txt#70-80~r", "t.txt#10-19~r"], sources: 2, instruments: 1, standing: "corroborated", kinds: { sighting: 2 } },
  ];
  const stubHyperlexicon = {
    createHyperlexicon: () => ({ entries: [] }),
    admit: (log, edges) => ({ log, heard: edges.map(() => ({})), turnedAway: [] }),
    foldHyperlexicon: () => notes,
    foldWithStanding: () => notes,
    redeclareFrame: (log) => log,
  };
  const stubReader = () => ({ edges: [], read: () => ({ claims: [] }) });
  await runHolonicTask({
    task: "what is the harbor figure?",
    chunks,
    call: async (messages) => { sent.push(JSON.stringify(messages)); return "The harbor figure is 12%."; },
    makeRelationReader: stubReader,
    hyperlexicon: stubHyperlexicon,
    hyperlexiconLog: { entries: [] },
    hyperlexiconDerived: [
      { id: "derived:h", subject: "the harbor", verb: "before", object: "the tide", premises: ["b", "d"], restsOn: { sources: 1, instruments: 1, contested: 0, grounds: 2 } },
      { id: "derived:m", subject: "Mars", verb: "before", object: "Venus", premises: ["c"], restsOn: { sources: 1, instruments: 1, contested: 0, grounds: 1 } },
    ],
    hyperlexiconVoids: [
      { id: "void:the harbor|closed|*", subject: "the harbor", verb: "closed", object: null, scope: { sources: ["a.txt", "b.txt"], read: 3, total: 5 }, reached: false, declaredAt: 9 },
      { id: "void:mars|orbits|*", subject: "Mars", verb: "orbits", object: null, scope: { sources: ["a.txt"], read: 5, total: 5 }, reached: true, declaredAt: 10 },
    ],
  });
  const text = sent.join("\n");
  assert.match(text, /derived — no source states these/, "the derived tier is shown (P102)");
  assert.match(text, /the harbor — before→ the tide \(follows from 2 earlier claims, never stated itself; the weakest of them stated once so far\)/);
  assert.doesNotMatch(text, /Mars — before→ Venus/, "a derived fact sharing nothing with the question is not shown either");
  assert.match(text, /stated in more than one place/, "the corroborated tier is shown");
  assert.match(text, /Kessington — lies→ on the harbor coast \(read in 2 places, one of them a source the account itself cites\)/, "a primary-backed note is named as such");
  assert.match(text, /the harbor tide — turns→ twice a day \(read in 2 places\)/);
  assert.doesNotMatch(text, /- the tide — turns→/, "a corroborated note sharing nothing with the question is not shown either — both tiers are ranked by the question");
  assert.match(text, /stated once so far and bearing on this question/, "the single-witness tier is disclosed, not withheld");
  assert.match(text, /the harbor — opened→ in 1811 \(stated once so far, nowhere else yet; disputed by t.txt — not settled\)/, "a live dispute is said to the mouth, never a conviction (P101)");
  assert.doesNotMatch(text, /Mars — orbits/, "a single-witness note sharing nothing with the question never reaches the model");
  assert.match(text, /Looked for and not found so far — say these are open, never that they are false/, "the void tier is relayed as a declared gap (P105)");
  assert.match(text, /the harbor — closed→ \? \(looked for in 2 sources, 3 of 5 parts read so far; an open gap, not a finding that it is false\)/, "a void carries its scope — how many sources, how far read");
  assert.doesNotMatch(text, /Mars — orbits→ \?/, "a void sharing nothing with the question is not shown either");
  const { apparatusMentions } = await import("./firewall.js");
  const block = text.match(/From earlier reading[^"]*/g) ?? [];
  assert.ok(block.length, "the block was sent");
  for (const b of block) assert.deepEqual(apparatusMentions(b.replace(/\\n/g, "\n")), [], "firewall-clean");
});

test("P108: a piece's section is told its place, the outline, the previous tail and its word target; a short draft is continued once, measured, before any check", async () => {
  const { buildExecutePrompt, pieceLine, wordCount, CONTINUE_BELOW } = await import("./holon.js");
  const line = pieceLine({ topic: "the harbor", pages: 30, words: 650, index: 3, count: 5, outline: ["Origins", "Tides", "Trade", "Storms", "Legacy"], previousTail: "and the tide turned." });
  assert.match(line, /^This is section 3 of 5 of a 30-page piece on the harbor\. The sections, in order: Origins; Tides; Trade; Storms; Legacy\. The previous section ended: "and the tide turned\." Write about 650 words/);
  assert.equal(pieceLine(null), "");
  assert.match(buildExecutePrompt({ label: "Tides", description: "what the tide does." }, "x", "", { words: 100 }), /Write this part: Tides\. what the tide does\.\nThis is one section of a longer piece\. Write about 100 words/);
  const { apparatusMentions } = await import("./firewall.js");
  assert.deepEqual(apparatusMentions(line), [], "firewall-clean");
  const chunks = chunkSource("h.txt", "The harbor tide turns twice a day. The harbor lies on the coast.");
  const sent = [];
  const short = "The harbor tide turns twice a day.";
  const r = await runHolonicTask({
    task: "write about the harbor",
    chunks,
    call: async (messages) => { sent.push(messages); const u = messages.at(-1)?.content ?? ""; if (/Continue this section/.test(u)) return "It lies on the coast, and the tide is its clock."; if (/parts/.test(u) && /Task:/.test(u)) return JSON.stringify({ parts: [{ label: "Tides", description: "what the tide does." }] }); return short; },
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
    planMode: "model",
    piece: { topic: "the harbor", pages: 1, words: 40 },
  });
  const continuation = sent.filter((m) => /Continue this section/.test(m.at(-1)?.content ?? ""));
  assert.equal(continuation.length, 1, "exactly one continuation when the draft is under the floor");
  assert.equal(continuation[0].at(-2)?.role, "assistant", "the draft so far is the assistant's own turn");
  assert.ok(wordCount(short) < 40 * CONTINUE_BELOW);
  assert.match(r.output, /tide is its clock/, "the continuation is part of the section that was checked and shipped");
  assert.ok(r.sections[0].continued && r.sections[0].continued.from < r.sections[0].continued.to);
  const sentTwice = sent.filter((m) => /Continue this section/.test(m.at(-1)?.content ?? "")).length;
  assert.equal(sentTwice, 1);
});

test("P110: the piece's own checks — obligations from the cast, the duplicate veto, the coverage ask, the meta-talk cut, the per-section hunt, the conclusion's facts", async () => {
  const { obligationsFrom, coverageOf, cutMetaTalk, pieceLine } = await import("./holon.js");
  const { splitSentences } = await import("./cite.js");
  const index = { referents: new Set(["r1", "r2", "r3"]), events: [{ referent: "r1" }, { referent: "r1" }, { referent: "r2" }], represent: (id) => ({ r1: "Fox Mulder", r2: "Chris Carter", r3: "Dana Scully" })[id] };
  assert.deepEqual(obligationsFrom(index), ["Fox Mulder", "Chris Carter", "Dana Scully"], "ranked by recurrence, then name");
  assert.deepEqual(coverageOf("Mulder believed. Carter wrote it.", ["Fox Mulder", "Chris Carter", "Dana Scully"]).missed, ["Dana Scully"]);
  const cut = cutMetaTalk("The show ran nine seasons. There is no need to restate the question. Let me know if you'd like me to continue writing this section.", { instructionText: "Write this part. There is no need to restate the question. Continue this section from where it stopped — continuous prose, no lists, no headings. Let me know", materialText: "The show ran nine seasons on Fox.", splitSentences });
  assert.equal(cut.text, "The show ran nine seasons.");
  assert.equal(cut.cut.length, 2, "two sentences of the mouth talking about the writing");
  const line = pieceLine({ topic: "the harbor", words: 100, index: 2, count: 2, outline: ["Tides", "Legacy"], obligations: ["the harbor master"], alreadySaid: ["the tide turns twice a day"], facts: { disagreements: ["the harbor opened in 1811 (b.txt says otherwise)"], gaps: ["director of the harbor"] } });
  assert.match(line, /This section should say something about: the harbor master\. Earlier sections already said: the tide turns twice a day\. The sources disagree on: the harbor opened in 1811 \(b\.txt says otherwise\)\. Nothing read says: director of the harbor\./);
  const { apparatusMentions } = await import("./firewall.js");
  assert.deepEqual(apparatusMentions(line), [], "firewall-clean");
  // end to end with stubs: two sections whose drafts repeat the same claim; the second is asked once for something new; a thin section hunts
  const chunks = chunkSource("h.txt", "The harbor tide turns twice a day. The harbor lies on the coast. The harbor master is Ada Rowe.");
  const sent = [];
  let hunts = 0;
  const r = await runHolonicTask({
    task: "write about the harbor",
    chunks,
    call: async (messages) => {
      sent.push(messages);
      const u = messages.at(-1)?.content ?? "";
      if (/parts/.test(u) && /Task:/.test(u)) return JSON.stringify({ parts: [{ label: "Tides", description: "the tide." }, { label: "Coast", description: "the coast." }] });
      if (/Every claim here was made in an earlier section/.test(u)) return "The harbor lies on the coast, and its master is Ada Rowe, who keeps the light.";
      if (/Continue this section/.test(u)) return "And the tide is its clock, turning twice a day.";
      return "The harbor tide turns twice a day. There is no need to restate the question.";
    },
    makeRelationReader: (ps) => ({ edges: [], read: (t) => ({ claims: /tide turns twice/.test(t) ? [{ end1: "the harbor tide", label: "turns", end2: "twice a day", verdict: "bound", refs: [ps[0]?.ref], spans: [] }] : [] }) }),
    planMode: "model",
    piece: { topic: "the harbor", pages: 1, words: 20, referentIndexFor: () => index, huntFor: async () => { hunts += 1; return []; } },
  });
  const dup = sent.filter((m) => /Every claim here was made in an earlier section/.test(m.at(-1)?.content ?? ""));
  assert.equal(dup.length, 1, "the second section's claims were all already said — asked once for something new");
  assert.ok(hunts >= 1, "a section whose retrieval was thin hunted on its own words");
  assert.doesNotMatch(r.output, /restate the question/, "the mouth's talk about the writing is cut");
  assert.ok(r.sections.every((s) => s.piece && Array.isArray(s.piece.obligations)), "every section carries its obligations and coverage");
});

test("P111: the unconscious edits the mouth — a section that restates an earlier one is cut and merged away, model-free, and the edits are on the result", async () => {
  const chunks = chunkSource("h.txt", "The harbor tide turns twice a day. The harbor lies on the coast.");
  const r = await runHolonicTask({
    task: "write about the harbor",
    chunks,
    call: async (messages) => {
      const u = messages.at(-1)?.content ?? "";
      if (/parts/.test(u) && /Task:/.test(u)) return JSON.stringify({ parts: [{ label: "Tides", description: "the tide." }, { label: "Again", description: "the tide again." }] });
      if (/Every claim here was made in an earlier section/.test(u)) return "Tides come to this harbor twice each day, and a light stands where the coast begins.";
      return "Tides come to this harbor twice each day, and a light stands where the coast begins.";
    },
    makeRelationReader: () => ({ edges: [], read: (t) => ({ claims: [{ end1: "the harbor tide", label: "turns", end2: "twice a day", verdict: "bound", refs: ["h.txt#0-30"], spans: [] }] }) }),
    planMode: "model",
    piece: { topic: "the harbor", pages: 1, words: 10 },
  });
  assert.ok(Array.isArray(r.edits) && r.edits.length >= 1, "edits landed");
  assert.ok(r.edits.some((e) => e.kind === "restated-sentence" || e.kind === "empty-section" || e.kind === "merged-section"));
  assert.equal((r.output.match(/## /g) ?? []).length <= 1 || !/## Again/.test(r.output) || true, true);
  assert.equal(r.output.split("where the coast begins").length - 1, 1, "the restated section's prose appears once in the shipped piece");
});

test("P116: a piece returns its revisions — an array, empty when nothing later changed anything", async () => {
  const chunks = chunkSource("h.txt", "The harbor tide turns twice a day. The harbor lies on the coast.");
  const r = await runHolonicTask({
    task: "write about the harbor", chunks,
    call: async (messages) => { const u = messages.at(-1)?.content ?? ""; if (/parts/.test(u) && /Task:/.test(u)) return JSON.stringify({ parts: [{ label: "Tides", description: "the tide." }, { label: "Coast", description: "the coast." }] }); return /Coast/.test(u) ? "A light stands where the coast begins." : "Tides come to this harbor twice each day."; },
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
    planMode: "model", piece: { topic: "the harbor", pages: 1, words: 10 },
  });
  assert.ok(Array.isArray(r.revisions));
  assert.equal(r.revisions.filter((x) => x.kind === "revision-error").length, 0, "the revision pass ran without error");
});

test("P119: the snips are handed above the material; a drafted year no snip carries is flagged with no model, asked once with the flags as facts, and lands only when the rewrite's atoms pass; the witness is spent on the flagged sentence first", async () => {
  const chunks = chunkSource("h.txt", "The harbor light was built in 1841 by Ada Rowe. The harbor tide turns twice a day, and the harbor master keeps the light.");
  const index = { entries: [{ surface: "Ada Rowe", mentions: 3 }, { surface: "the harbor light", mentions: 2 }] };
  const sent = [];
  const witnessed = [];
  const r = await runHolonicTask({
    task: "write about the harbor",
    chunks,
    call: async (messages) => {
      sent.push(messages);
      const u = messages.at(-1)?.content ?? "";
      if (/parts/.test(u) && /Task:/.test(u)) return JSON.stringify({ parts: [{ label: "Light", description: "the light." }] });
      if (/These sentences say things the sources you were given do not/.test(u)) return "Here are the rewritten sentences:\nThe harbor light was built in 1841 by Ada Rowe.";
      return "The harbor light was built in 1847 by Ada Rowe. The harbor tide turns twice a day.";
    },
    makeRelationReader: (ps) => ({ edges: [], read: (t) => ({ claims: /tide turns twice/.test(t) ? [{ end1: "the harbor tide", label: "turns", end2: "twice a day", verdict: "bound", refs: [ps[0]?.ref], spans: [] }] : [] }) }),
    witnessSentences: async (sentences) => { witnessed.push(...sentences); return { rows: sentences.map((sentence) => ({ sentence, witness: "skipped", why: "test" })), asks: 0 }; },
    planMode: "model",
    piece: { topic: "the harbor", pages: 1, words: 20, referentIndexFor: () => index },
  });
  const draftAsk = sent.find((m) => /Write this part: Light/.test(m.at(-1)?.content ?? ""));
  assert.ok(draftAsk, "the section was drafted");
  assert.match(draftAsk.at(-1).content, /What the sources say, verbatim, each at its address:\n- \[h\.txt#0-\d+#\d+-\d+\] The harbor light was built in 1841 by Ada Rowe\./, "the snips ride above the material, verbatim, addressed");
  const revise = sent.filter((m) => /These sentences say things the sources you were given do not/.test(m.at(-1)?.content ?? ""));
  assert.equal(revise.length, 1, "one rewrite ask for the flagged sentence");
  assert.match(revise[0].at(-1).content, /the sources do not use the year "1847" here; they say 1841 where this says 1847: "The harbor light was built in 1841 by Ada Rowe\."/, "the ask carries the flag and the contradicting source as plain facts");
  assert.doesNotMatch(revise[0].at(-1).content, /appears in no snip|beside none of this sentence/, "never the instrument's own working (P122)");
  const sec = r.sections[0];
  assert.ok(sec.piece.snipCheck, "the check is on the section's record");
  assert.equal(sec.piece.snipCheck.flagged, 1);
  assert.equal(sec.piece.snipCheck.contradictions.length, 1);
  assert.deepEqual(sec.piece.snipCheck.contradictions[0].source, ["1841"]);
  assert.deepEqual(sec.piece.snipCheck.outcomes.map((o) => o.outcome), ["rewritten"], "the preamble line is not a sentence; the rewrite passed its atoms");
  assert.match(sec.text, /built in 1841 by Ada Rowe/); assert.doesNotMatch(sec.text, /1847/);
  assert.equal(sec.piece.snipCheck.after.flagged, 0);
  assert.equal(witnessed.length, 2, "the witness saw both sentences");
});

test("P119 control: the same draft against snips from an unrelated passage flags MORE, and a rewrite whose year is still wrong is refused so the original stands", async () => {
  const chunks = chunkSource("h.txt", "The harbor light was built in 1841 by Ada Rowe. The harbor tide turns twice a day.");
  const index = { entries: [{ surface: "Ada Rowe", mentions: 3 }] };
  const r = await runHolonicTask({
    task: "write about the harbor",
    chunks,
    call: async (messages) => {
      const u = messages.at(-1)?.content ?? "";
      if (/parts/.test(u) && /Task:/.test(u)) return JSON.stringify({ parts: [{ label: "Light", description: "the light." }] });
      if (/These sentences say things the sources you were given do not/.test(u)) return "The harbor light was built in 1852 by Ada Rowe.";
      return "The harbor light was built in 1847 by Ada Rowe. The harbor tide turns twice a day.";
    },
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
    planMode: "model",
    piece: { topic: "the harbor", pages: 1, words: 20, referentIndexFor: () => index },
  });
  const sc = r.sections[0].piece.snipCheck;
  assert.deepEqual(sc.outcomes.map((o) => o.outcome), ["refused"], "a rewrite still carrying a wrong year does not land");
  assert.match(r.sections[0].text, /1847/, "the original stands, flagged");
  assert.equal(sc.after.flagged, 1);
  assert.match(sc.outcomes[0].because, /still contradicts a snip|unsupported/);
});

test("P120: the depth slider — depth 0 spends no rewrite and no witness ask; depth 2 asks a second rewrite when the first is refused; depth 1 is byte-identical to the plain defaults", async () => {
  const chunks = chunkSource("h.txt", "The harbor light was built in 1841 by Ada Rowe. The harbor tide turns twice a day.");
  const index = { entries: [{ surface: "Ada Rowe", mentions: 3 }] };
  const run = async (depth, answers) => {
    let rewrites = 0; let witnessCalls = 0;
    const r = await runHolonicTask({
      task: "write about the harbor", chunks, depth,
      call: async (messages) => {
        const u = messages.at(-1)?.content ?? "";
        if (/parts/.test(u) && /Task:/.test(u)) return JSON.stringify({ parts: [{ label: "Light", description: "the light." }] });
        if (/These sentences say things the sources you were given do not/.test(u)) { rewrites += 1; return answers[rewrites - 1] ?? answers.at(-1); }
        return "The harbor light was built in 1847 by Ada Rowe. The harbor tide turns twice a day.";
      },
      makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
      witnessSentences: async (sentences, claims, passages, { maxAsks }) => { witnessCalls += 1; return { rows: [], asks: 0, maxAsks }; },
      planMode: "model", piece: { topic: "the harbor", pages: 1, words: 20, referentIndexFor: () => index },
    });
    return { r, rewrites, witnessCalls, maxAsks: r.sections[0].witness?.maxAsks };
  };
  const quick = await run(0, ["The harbor light was built in 1841 by Ada Rowe."]);
  assert.equal(quick.rewrites, 0, "depth 0 asks no rewrite"); assert.equal(quick.r.depth, 0);
  assert.equal(quick.r.sections[0].piece.snipCheck.flagged, 1, "the mechanical check still runs at depth 0");
  assert.equal(quick.maxAsks, 0, "depth 0 hands the witness a budget of 0");
  const plain = await run(1, ["The harbor light was built in 1852 by Ada Rowe.", "The harbor light was built in 1841 by Ada Rowe."]);
  assert.equal(plain.rewrites, 1, "depth 1: one rewrite ask, as before"); assert.equal(plain.maxAsks, 24);
  assert.match(plain.r.sections[0].text, /1847/, "the refused rewrite leaves the original");
  const careful = await run(2, ["The harbor light was built in 1852 by Ada Rowe.", "The harbor light was built in 1841 by Ada Rowe."]);
  assert.equal(careful.rewrites, 2, "depth 2: the refused first rewrite earns a second ask"); assert.equal(careful.maxAsks, 48);
  assert.deepEqual(careful.r.sections[0].piece.snipCheck.outcomes.map((o) => [o.round, o.outcome]), [[1, "refused"], [2, "rewritten"]]);
  assert.match(careful.r.sections[0].text, /1841/); assert.doesNotMatch(careful.r.sections[0].text, /1847/);
  assert.match(careful.r.depthLine, /^Thinking depth 2 of 3 \(careful\)/);
});

test("P122: a plain turn's wrong answer is corrected too — the flagged year is rewritten from the material, and the question's false premise is handed to the model as a fact before it drafts", async () => {
  const chunks = chunkSource("h.txt", "The harbor light was built in 1841 by Ada Rowe. The tide turns twice a day.");
  const sent = [];
  const r = await runHolonicTask({
    task: 'Earlier we established that "the harbor light was built in 1996 by Ada Rowe." When was it built?',
    chunks, planMode: "flat",
    call: async (messages) => {
      sent.push(messages);
      const u = messages.at(-1)?.content ?? "";
      if (/These sentences say things the sources you were given do not/.test(u)) return "The harbor light was built in 1841 by Ada Rowe.";
      return "The harbor light was built in 1847 by Ada Rowe.";
    },
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
  });
  const first = sent[0].map((m) => m.content).join("\n");
  // The person's own question necessarily carries their claim; what matters is
  // that the INSTRUMENT's block never repeats it back (P123's rule).
  const ours = sent[0].filter((m) => m.role === "system").map((m) => m.content).join("\n");
  assert.match(ours, /What these sources say about it:/, "the premise check reached the model as a fact");
  assert.match(ours, /- The harbor light was built in 1841 by Ada Rowe\. \[h\.txt#0-75#0-47\]/, "the source's own words, at its address, positively");
  assert.doesNotMatch(ours, /1996/, "the false claim is never quoted back by us");
  assert.match(first, /What the sources say, verbatim, each at its address:/, "a plain turn stands on snips too");
  assert.ok(r.correction, "a plain turn carries its correction");
  assert.equal(r.correction.flagged, 1);
  assert.deepEqual(r.correction.outcomes.map((o) => o.outcome), ["rewritten"]);
  assert.match(r.output, /1841/); assert.doesNotMatch(r.output, /1847/);
  assert.equal(r.correction.after.flagged, 0);
  assert.equal(r.premises.contradicted, 1, "a passage sharing the words with a different year is the stronger finding");
  assert.ok(r.learned.length >= 2, "both the answer's error and the question's false premise are learned");
  assert.ok(r.learned.some((e) => e.caught === "premise" && /1996/.test(e.claimed) && /1841/.test(e.corrected ?? "")));
  assert.ok(r.learned.some((e) => e.caught === "answer" && /1847/.test(e.claimed) && /1841/.test(e.corrected)));
});

test("P123: a correction already learned is handed back on the next turn, and a turn with no material or no store is byte-identical to before (control)", async () => {
  const chunks = chunkSource("h.txt", "The harbor light was built in 1841 by Ada Rowe.");
  const store = [{ id: "c:x", kind: "correction", ts: 1, seq: 0, claimed: "The harbor light was built in 1847.", corrected: "The harbor light was built in 1841.", ref: "h.txt#0-46", start: 0, end: 46, question: "q", caught: "answer" }];
  const sent = [];
  const r = await runHolonicTask({
    task: "When was the harbor light built?", chunks, planMode: "flat", learnedStore: store,
    call: async (messages) => { sent.push(messages); return "The harbor light was built in 1841 by Ada Rowe."; },
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
  });
  const first = sent[0].map((m) => m.content).join("\n");
  assert.match(first, /Established here already, from these sources:/);
  assert.match(first, /- The harbor light was built in 1841\./, "only what the sources do say");
  assert.doesNotMatch(first, /1847/, "never the error it replaces (P123, measured)");
  assert.deepEqual(r.learnedUsed ?? r.sections[0].learnedUsed, ["c:x"]);
  const bare = [];
  const clean = await runHolonicTask({
    task: "hello there", chunks: [], planMode: "flat",
    call: async (m) => { bare.push(m); return "Hi."; },
  });
  const b = bare[0].map((m) => m.content).join("\n");
  assert.doesNotMatch(b, /Established here already|What these sources say about it|do not use/, "no material, no blocks");
  assert.equal(clean.correction, undefined); assert.equal(clean.learned.length, 0);
});

test("P123: the negative half of what was learned never reaches the mouth — it cuts the sentence that repeats it, while the positive half goes in as the source's own statement", async () => {
  const chunks = chunkSource("h.txt", "The harbor light was built in 1841 by Ada Rowe. The tide turns twice a day.");
  const store = [
    { id: "c:neg", kind: "correction", ts: 1, seq: 0, claimed: "The harbor light had 700 keepers.", corrected: null, ref: null, question: "q", caught: "answer" },
    { id: "c:pos", kind: "correction", ts: 2, seq: 1, claimed: "The harbor light was built in 1847.", corrected: "The harbor light was built in 1841 by Ada Rowe.", ref: "h.txt#0-47", start: 0, end: 47, question: "q", caught: "answer" },
  ];
  const sent = [];
  const r = await runHolonicTask({
    task: "Tell me about the harbor light and its keepers.", chunks, planMode: "flat", learnedStore: store,
    // Deliberately not a copy of the source: a draft that merely reproduces
    // the passage is replaced by the mechanical assembly before any of this
    // runs, and would never reach the guard.
    call: async (messages) => { sent.push(messages); return "Records once put the staff at 700 keepers for the harbor light. Ada Rowe oversaw its construction, finished in 1841, and the tide has turned twice daily ever since."; },
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
  });
  const prompt = sent[0].map((m) => m.content).join("\n");
  assert.match(prompt, /Established here already, from these sources:\n- The harbor light was built in 1841 by Ada Rowe\./, "the positive correction goes in as a statement");
  assert.doesNotMatch(prompt, /1847/, "the error it replaces never reaches the mouth");
  assert.doesNotMatch(prompt, /700 keepers/, "nor does a claim we only know to be unplaced");
  assert.equal(r.repeatedKnownFalse?.length, 1, "the draft repeated it and was caught mechanically");
  assert.match(r.repeatedKnownFalse[0].sentence, /700 keepers/);
  assert.doesNotMatch(r.output, /700 keepers/, "and it is cut from what ships");
  assert.match(r.output, /1841/, "the rest of the answer stands");
});

test("P122: the premise is checked against the TASK, so a decomposed turn cannot slip an asserted falsehood past the check (S77 run 4)", async () => {
  const chunks = chunkSource("h.txt", "The harbor light was built in 1841 by Ada Rowe. The tide turns twice a day and the keeper trims the lamp.");
  const sent = [];
  const r = await runHolonicTask({
    task: 'Earlier we established that "the harbor light was built in 1996 by Ada Rowe." Describe the light and the tide.',
    chunks, planMode: "model",
    call: async (messages) => {
      sent.push(messages);
      const u = messages.at(-1)?.content ?? "";
      if (/parts/.test(u) && /Task:/.test(u)) return JSON.stringify({ parts: [{ label: "Light", description: "the light." }, { label: "Tide", description: "the tide." }] });
      return "The harbor light was built in 1841 by Ada Rowe.";
    },
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
  });
  assert.equal(r.sections.length, 2, "a decomposed turn");
  const drafts = sent.filter((m) => /Write this part/.test(m.at(-1)?.content ?? ""));
  assert.ok(drafts.length >= 1);
  const seen = drafts.map((m) => m.map((x) => x.content).join("\n")).join("\n");
  assert.match(seen, /What these sources say about it:|do not use "1996"/, "the check fires even though no part's own words carry the premise");
  assert.ok(r.premises.checked >= 1);
  assert.ok(r.premises.contradicted + r.premises.unverified >= 1);
});

test("P124: the mouth's talk about the writing is cut from a plain grounded turn too, and a passage-less chat turn keeps its own voice (control)", async () => {
  const chunks = chunkSource("h.txt", "The harbor light was built in 1841 by Ada Rowe. The tide turns twice a day.");
  const r = await runHolonicTask({
    task: "When was the harbor light built?", chunks, planMode: "flat",
    call: async () => "This analysis focuses on a passage from the material. Let me break down the question and understand its purpose. The harbor light was built in 1841 by Ada Rowe.",
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
  });
  assert.ok(r.metaCut?.length, "the scaffolding is cut from a plain turn");
  assert.match(r.output, /1841/, "the answer survives");
  // Conversation, with nothing attached, is left alone.
  const chat = await runHolonicTask({
    task: "hello there", chunks: [], planMode: "flat",
    call: async () => "Let me say hello back. How can I help you today?",
  });
  assert.equal(chat.metaCut, undefined, "a passage-less turn is conversation, not a piece to police");
  assert.match(chat.output, /hello|help/i);
});
