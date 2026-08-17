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
    const refs = offeredRefs(messages[1].content);
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

test("a draft that opens by restating the prompt ships without its framing", async () => {
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const refs = offeredRefs(messages[1].content);
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
  assert.equal(framed.output, code, "framing prefix is CUT from the raw text; the code after it is byte-exact");
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
    const refs = offeredRefs(messages[1].content);
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
      : `The report puts the harbor figure at 12%. [${offeredRefs(messages[1].content)[0] ?? "x#0-1"}]`;
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
    const refs = offeredRefs(messages[1].content);
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
    const refs = offeredRefs(messages[1].content);
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
    const refs = offeredRefs(messages[1].content);
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
    const refs = offeredRefs(messages[1].content);
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
    const refs = offeredRefs(messages[1].content);
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
    const refs = offeredRefs(messages[1].content);
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
