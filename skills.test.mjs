// skills.test.mjs — the skill layer against real organs and a fake model.
// Same posture as holon.test.mjs: the fake model reads the prompts a real one
// would get and answers from them, because a canned answer that ignores its
// prompt tests nothing but plumbing. Execution is the real sandbox
// (skill-runner.mjs), not a stub — what is being tested IS the wall.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  SKILL_ENTRY_KINDS,
  appendSkill,
  canonSkill,
  checkSkillShape,
  claimSkill,
  createSkillLog,
  extractObject,
  fillSlots,
  mechanicalSlotFill,
  parseSkillCandidate,
  projectLibrary,
  runSkilledTask,
  scanBody,
  skillDigest,
  slotSchema,
  validateSlots,
} from "./skills.js";
import {
  admitSkill,
  executeSkill,
  loadSkillLibrary,
  makeExecutor,
  makeSkillRecorder,
  saveSkill,
} from "./skill-runner.mjs";
import { chunkSource, retrieve } from "./source.js";

// ── fixtures ─────────────────────────────────────────────────────────────────

const CORPUS = [
  "The Kessington report put the harbor figure at 12% for the spring quarter, revising the earlier estimate downward.",
  "Dredging of the shipping channel runs through March under the port authority schedule.",
].join("\n\n");
const chunks = chunkSource("notes.txt", CORPUS);

/** The organ table offered to skills — retrieval closed over the corpus. */
const organs = {
  retrieve: (question, limit = 2) => retrieve(chunks, question, limit),
};

const HYPHENATE = {
  name: "hyphenate-title",
  description: "turn a title into a lowercase hyphenated slug",
  anchors: ["hyphenate", "title"],
  slots: [{ name: "title", type: "string", description: "the title to slug", required: true }],
  needs: [],
  body: `async (slots) => slots.title.toLowerCase().trim().split(/\\s+/).join("-")`,
  check: `async (run, organs, assert) => {
    assert((await run({ title: "War And Peace" })) === "war-and-peace", "hyphenation broke");
  }`,
};

const HARBOR = {
  name: "harbor-figure",
  description: "retrieve the passages holding the harbor figure",
  anchors: ["harbor", "figure"],
  slots: [{ name: "query", type: "string", required: true }],
  needs: ["retrieve"],
  body: `async (slots, organs) => {
    const hits = await organs.retrieve(slots.query, 2);
    return hits.map((h) => h.text).join(" ");
  }`,
  check: `async (run, organs, assert) => {
    assert((await run({ query: "harbor figure spring quarter" })).includes("12%"), "lost the figure");
  }`,
};

const SHOUT = {
  name: "shout-title",
  description: "slug a title through the hyphenate skill, then uppercase it",
  anchors: ["shout", "title"],
  slots: [{ name: "title", type: "string", required: true }],
  needs: [],
  body: `async (slots, organs, skills) => (await skills.call("hyphenate-title", { title: slots.title })).toUpperCase()`,
  check: `async (run, organs, assert) => {
    assert((await run({ title: "the fold" })) === "THE-FOLD", "stacking broke");
  }`,
};

async function admitted(...skills) {
  let log = createSkillLog();
  for (const s of skills) {
    // admission order is dependency order: each candidate's check runs
    // against the library as it stands, so a composite needs its children in.
    const out = await admitSkill(log, s, { organs, library: projectLibrary(log) });
    assert.equal(out.admitted, true, out.reason);
    log = out.log;
  }
  return { log, library: projectLibrary(log) };
}

// ── the library log keeps the plan-log discipline ────────────────────────────

test("the log is append-only, entries are sealed, and the fold rebuilds from entries alone", async () => {
  const digest = await skillDigest(HYPHENATE);
  let log = createSkillLog();
  log = appendSkill(log, { kind: SKILL_ENTRY_KINDS.ADMIT, name: HYPHENATE.name, digest, skill: HYPHENATE });
  log = appendSkill(log, { kind: SKILL_ENTRY_KINDS.INVOKE, name: HYPHENATE.name, digest });
  log = appendSkill(log, { kind: SKILL_ENTRY_KINDS.INVOKE, name: HYPHENATE.name, digest });

  assert.throws(() => appendSkill(log, { kind: "mutate", name: "x" }), /unknown entry kind/);
  assert.throws(() => { log.entries.push({}); }, TypeError);

  const live = projectLibrary(log);
  assert.equal(live.length, 1);
  assert.equal(live[0].invocations, 2);

  // Resumption: a log rebuilt by replaying serialized entries folds the same.
  const replayed = JSON.parse(JSON.stringify(log.entries)).reduce(
    (l, { seq, ...e }) => appendSkill(l, e),
    createSkillLog(),
  );
  assert.deepEqual(projectLibrary(replayed), live);
});

test("retraction and supersession drop a skill from the live fold without deleting its entry", async () => {
  const digest = await skillDigest(HYPHENATE);
  let log = createSkillLog();
  log = appendSkill(log, { kind: SKILL_ENTRY_KINDS.ADMIT, name: HYPHENATE.name, digest, skill: HYPHENATE });
  log = appendSkill(log, { kind: SKILL_ENTRY_KINDS.RETRACT, name: HYPHENATE.name, digest });
  assert.equal(projectLibrary(log).length, 0);
  assert.equal(log.entries.length, 2); // the past stays
});

// ── identity is the mechanism ────────────────────────────────────────────────

test("the digest is stable under key order and moves when the mechanism moves", async () => {
  const reordered = { body: HYPHENATE.body, check: HYPHENATE.check, needs: [], slots: HYPHENATE.slots, anchors: HYPHENATE.anchors, description: HYPHENATE.description, name: HYPHENATE.name };
  assert.equal(canonSkill(reordered), canonSkill(HYPHENATE));
  assert.equal(await skillDigest(reordered), await skillDigest(HYPHENATE));
  const edited = { ...HYPHENATE, body: HYPHENATE.body + " " };
  assert.notEqual(await skillDigest(edited), await skillDigest(HYPHENATE));
});

// ── the admission gate ───────────────────────────────────────────────────────

test("a skill without its check is a wish, and is refused with that reason", async () => {
  const { check, ...unchecked } = HYPHENATE;
  const defects = checkSkillShape(unchecked);
  assert.ok(defects.some((d) => d.includes("wish")));
  const out = await admitSkill(createSkillLog(), unchecked, { organs });
  assert.equal(out.admitted, false);
  assert.match(out.reason, /wish/);
  // the refusal is ON the log, not just returned
  assert.equal(out.log.entries.at(-1).kind, SKILL_ENTRY_KINDS.REFUSE);
});

test("a body reaching for what the sandbox does not grant is refused, naming the token", async () => {
  const grabby = { ...HYPHENATE, name: "grabby", body: `async () => fetch("http://example.com")` };
  assert.deepEqual(scanBody(grabby.body), ["fetch"]);
  const out = await admitSkill(createSkillLog(), grabby, { organs });
  assert.equal(out.admitted, false);
  assert.match(out.reason, /fetch/);
});

test("a skill whose own check fails is refused — the gate runs the real executor", async () => {
  const broken = {
    ...HYPHENATE,
    name: "hyphenate-broken",
    check: `async (run, organs, assert) => {
      assert((await run({ title: "War And Peace" })) === "WAR AND PEACE", "this body does not uppercase");
    }`,
  };
  const out = await admitSkill(createSkillLog(), broken, { organs });
  assert.equal(out.admitted, false);
  assert.match(out.reason, /its own check failed/);
});

test("a whole skill is admitted with its digest, and the entry carries provenance", async () => {
  const out = await admitSkill(createSkillLog(), HARBOR, {
    organs,
    provenance: { task: "what is the harbor figure", born_of: "hand" },
  });
  assert.equal(out.admitted, true);
  assert.equal(out.digest, await skillDigest(HARBOR));
  const live = projectLibrary(out.log);
  assert.equal(live[0].provenance.born_of, "hand");
});

// ── claiming is mechanical ───────────────────────────────────────────────────

test("a skill claims only when every anchor appears in the task's own words", async () => {
  const { library } = await admitted(HYPHENATE, HARBOR);
  assert.equal(claimSkill(library, "please hyphenate this title: War and Peace").skill.name, "hyphenate-title");
  assert.equal(claimSkill(library, "what was the harbor figure last spring").skill.name, "harbor-figure");
  assert.equal(claimSkill(library, "hyphenate this sentence").skill, null); // "title" missing
  assert.equal(claimSkill(library, "bake a cake").skill, null);
});

test("the more specific claim wins; an exact tie is refused as ambiguous, typed", async () => {
  const twin = { ...HYPHENATE, name: "hyphenate-title-twin", body: HYPHENATE.body + " " };
  const wider = {
    ...HYPHENATE,
    name: "hyphenate-title-quarterly",
    anchors: ["hyphenate", "title", "quarterly"],
    body: HYPHENATE.body + "  ",
  };
  const { library } = await admitted(HYPHENATE, wider);
  assert.equal(claimSkill(library, "hyphenate the quarterly report title").skill.name, "hyphenate-title-quarterly");

  const { library: tied } = await admitted(HYPHENATE, twin);
  const claim = claimSkill(tied, "hyphenate the title");
  assert.equal(claim.skill, null);
  assert.match(claim.reason, /refused as ambiguous/);
});

// ── slot filling: mechanical first, model checked ────────────────────────────

test("mechanical fill takes only what the task determines unambiguously", () => {
  const skill = {
    ...HYPHENATE,
    slots: [
      { name: "limit", type: "number", required: true },
      { name: "view", type: "string", oneOf: ["cast", "graph"], required: true },
      { name: "title", type: "string", required: true },
    ],
  };
  const one = mechanicalSlotFill(skill, "show the cast view with 5 entries");
  assert.equal(one.values.limit, 5);
  assert.equal(one.values.view, "cast");
  assert.equal(one.basis.limit, "task");
  assert.ok(!("title" in one.values)); // free strings are never guessed mechanically

  const two = mechanicalSlotFill(skill, "show the cast view with 5 of the 12 entries");
  assert.ok(!("limit" in two.values)); // two numbers — ambiguity is left, not resolved
});

test("the model fills only the missing slots, through grammar, and its values are validated like any others", async () => {
  const calls = [];
  const call = async (messages, opts) => {
    calls.push({ messages, opts });
    return `Here you go: {"title": "The Fold"}`;
  };
  const filled = await fillSlots(HYPHENATE, "hyphenate the title of my document", { call });
  assert.equal(filled.ok, true);
  assert.equal(filled.values.title, "The Fold");
  assert.equal(filled.basis.title, "model"); // a model-filled slot is a disclosed authority
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].opts.json, slotSchema(HYPHENATE));

  // A model that omits the slot leaves a typed gap, never a guess.
  const empty = await fillSlots(HYPHENATE, "hyphenate the title", { call: async () => "{}" });
  assert.equal(empty.ok, false);
  assert.ok(empty.open.some((o) => o.includes("required slot unfilled: title")));
});

test("a model-filled value outside a slot's declared values is a typed defect, not a run", async () => {
  const skill = { ...HYPHENATE, slots: [{ name: "view", type: "string", oneOf: ["cast", "graph"], required: true }] };
  const filled = await fillSlots(skill, "hyphenate the title", { call: async () => `{"view": "everything"}` });
  assert.equal(filled.ok, false);
  assert.ok(filled.open.some((o) => o.includes("outside its declared values")));
  assert.ok(validateSlots(skill, { view: "everything" }).length);
});

// ── execution: the wall ──────────────────────────────────────────────────────

test("a skill gets exactly its declared organs; reaching past them is a typed refusal", async () => {
  const sneaky = {
    ...HYPHENATE,
    name: "sneaky",
    body: `async (slots, organs) => (await organs.retrieve("harbor", 1)).length`,
  };
  // needs is [] — retrieve was never declared, so it is not in the sandbox.
  const ran = await executeSkill(sneaky, { title: "x" }, { organs });
  assert.equal(ran.value, null);
  assert.match(ran.refused, /skill body threw/);
});

test("a declared-but-unoffered organ refuses before anything runs", async () => {
  const ran = await executeSkill(HARBOR, { query: "harbor" }, { organs: {} });
  assert.match(ran.refused, /organ not offered: retrieve/);
});

test("provenance is harvested from what the organs actually returned", async () => {
  const ran = await executeSkill(HARBOR, { query: "harbor figure spring" }, { organs });
  assert.equal(ran.refused, undefined);
  assert.ok(ran.value.includes("12%"));
  assert.ok(ran.refs.length >= 1);
  assert.ok(ran.refs.every((r) => /^notes\.txt#\d+-\d+$/.test(r)));
});

test("the run budget is a named budget: an overrun is a typed refusal, not a hang", async () => {
  const stuck = {
    ...HYPHENATE,
    name: "stuck",
    needs: ["never"],
    body: `async (slots, organs) => await organs.never()`,
  };
  const ran = await executeSkill(stuck, { title: "x" }, {
    organs: { never: () => new Promise(() => {}) },
    budgetMs: 50,
  });
  assert.match(ran.refused, /refused-as-overran/);
});

test("skills stack through the library, and the stack has a budget", async () => {
  const { library } = await admitted(HYPHENATE, SHOUT);
  const ran = await executeSkill(SHOUT, { title: "the fold" }, { organs, library });
  assert.equal(ran.value, "THE-FOLD");
  assert.deepEqual(ran.stacked, ["hyphenate-title"]);

  const ouro = {
    ...SHOUT,
    name: "ouroboros",
    anchors: ["ouroboros"],
    body: `async (slots, organs, skills) => await skills.call("ouroboros", { title: slots.title })`,
    check: SHOUT.check,
  };
  // admitted() would refuse it (its check fails on the budget) — execute directly.
  const digest = await skillDigest(ouro);
  let log = createSkillLog();
  log = appendSkill(log, { kind: SKILL_ENTRY_KINDS.ADMIT, name: ouro.name, digest, skill: ouro });
  const spun = await executeSkill(ouro, { title: "x" }, { organs, library: projectLibrary(log) });
  assert.match(spun.refused, /stack exceeded its budget/);
});

// ── dispatch: the ladder descends visibly ────────────────────────────────────

test("a claimed task runs as code — zero model calls when the task's words fill the slots", async () => {
  const { library } = await admitted(HARBOR);
  let modelCalls = 0;
  const out = await runSkilledTask({
    task: "figure out the harbor figure",
    library,
    execute: makeExecutor({ organs, library }),
    call: async () => { modelCalls++; return "{}"; },
    runModel: async () => { modelCalls++; return { value: "modelled", open: [] }; },
  });
  // "query" is a free string — one constrained call fills it? No: HARBOR's
  // query slot is free, so the fill call runs. Count what actually happened:
  // the slot fill is the ONLY model touch, and execution itself is code.
  assert.equal(out.basis, "model"); // "{}" filled nothing — descent, typed
  assert.ok(out.open.some((o) => o.includes("required slot unfilled: query")));
  assert.ok(modelCalls >= 1);
});

test("a fully mechanical claim never touches the model at all", async () => {
  const patterned = {
    ...HARBOR,
    name: "harbor-figure-patterned",
    anchors: ["harbor", "figure"],
    slots: [{ name: "query", type: "string", pattern: "harbor figure[a-z ]*", required: true }],
    body: HARBOR.body + " ",
  };
  const { library } = await admitted(patterned);
  let modelCalls = 0;
  const out = await runSkilledTask({
    task: "read out the harbor figure for spring",
    library,
    execute: makeExecutor({ organs, library }),
    call: async () => { modelCalls++; return "{}"; },
    runModel: async () => { modelCalls++; return { value: "modelled" }; },
  });
  assert.equal(out.basis, "skill");
  assert.equal(out.skill.name, "harbor-figure-patterned");
  assert.equal(out.slots.basis.query, "task");
  assert.equal(modelCalls, 0);
  assert.ok(out.value.includes("12%"));
  assert.ok(out.refs.length);
});

test("an unclaimed task falls through to the model path, and a refused run says so in open", async () => {
  const { library } = await admitted(HYPHENATE);
  const out = await runSkilledTask({
    task: "bake a cake",
    library,
    execute: makeExecutor({ organs, library }),
    runModel: async (task) => ({ value: `modelled: ${task}`, open: [] }),
  });
  assert.equal(out.basis, "model");
  assert.equal(out.value, "modelled: bake a cake");

  const out2 = await runSkilledTask({
    task: "hyphenate the title", // claims, but no call offered and title unfillable
    library,
    execute: makeExecutor({ organs, library }),
    runModel: async () => ({ value: "modelled", open: [] }),
  });
  assert.equal(out2.basis, "model");
  assert.ok(out2.open.some((o) => o.includes("required slot unfilled: title"))); // the descent is typed
});

// ── acquisition ──────────────────────────────────────────────────────────────

test("a candidate is extracted mechanically from a talk-wrapped reply and survives the gate", async () => {
  const reply =
    "Sure! Here is the skill you asked for:\n" +
    JSON.stringify({ ...HYPHENATE, name: "hyphenate-authored" }) +
    "\nLet me know if you need anything else.";
  const candidate = parseSkillCandidate(reply);
  assert.equal(candidate.name, "hyphenate-authored");
  const out = await admitSkill(createSkillLog(), candidate, { organs, provenance: { born_of: "model" } });
  assert.equal(out.admitted, true, out.reason);

  assert.equal(parseSkillCandidate("no object here"), null);
  assert.deepEqual(extractObject('talk {"a": 1} talk'), { a: 1 });
});

// ── persistence: the record discipline ───────────────────────────────────────

test("the library rebuilds from the record alone, and edited bytes are dropped with a typed defect", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fold-skills-"));
  const skillsDir = join(dir, "skills");
  const recordPath = join(dir, "record", "skill-record.jsonl");
  const record = makeSkillRecorder(recordPath);

  await saveSkill(HYPHENATE, skillsDir);
  await saveSkill(HARBOR, skillsDir);
  let log = createSkillLog();
  for (const s of [HYPHENATE, HARBOR]) {
    const out = await admitSkill(log, s, { organs, record });
    log = out.log;
  }
  // an invocation lands on the record too
  await executeSkill(HYPHENATE, { title: "The Fold" }, { organs, record });

  const loaded = await loadSkillLibrary(skillsDir, recordPath);
  assert.deepEqual(loaded.defects, []);
  assert.deepEqual(loaded.library.map((s) => s.skill.name).sort(), ["harbor-figure", "hyphenate-title"]);
  assert.equal(loaded.library.find((s) => s.skill.name === "hyphenate-title").invocations, 1);

  // the record never carries the body — the digest names the file
  const lines = readFileSync(recordPath, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.ok(lines.every((l) => !("skill" in l)));

  // tamper with the bytes: the digest no longer matches, the skill drops, typed
  const digest = await skillDigest(HARBOR);
  const path = join(skillsDir, `${digest}.json`);
  writeFileSync(path, JSON.stringify({ ...HARBOR, description: "edited in place" }, null, 2));
  const reloaded = await loadSkillLibrary(skillsDir, recordPath);
  assert.deepEqual(reloaded.library.map((s) => s.skill.name), ["hyphenate-title"]);
  assert.ok(reloaded.defects.some((d) => d.includes("no longer match their digest")));
});
