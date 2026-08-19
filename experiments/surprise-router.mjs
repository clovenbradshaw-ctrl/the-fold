#!/usr/bin/env node
// experiments/surprise-router.mjs — does a question's own SHAPE predict
// which kind of thinking answers it best, and can "meaningful surprise"
// (novel AND grounded — Bateson intersected with truth) measure that?
//
// Direct test of the hypothesis raised in chat (2026-08-19): "different
// kinds of fact-checking would benefit from different types of thinking...
// chase meaningful surprise, trying different routines, learning what
// types of routines work for what kinds of research."
//
// TWO TYPES, both already real fixtures from this same session, not
// invented for this script:
//   lincoln    — a closed-form relation. One subject, one verb, one
//                object, a single settled fact with a name attached
//                (facts-before-draft.mjs's PASSAGES/checkAnswer, reused).
//   trazodone  — synthesis over absence. No single sentence answers it;
//                the real content is what ISN'T covered, plus caveats
//                that need weighing (system1-cpu-system2-gpu.mjs's
//                FIXTURES.trazodone/groundingReport, reused).
//
// FOUR ROUTINES ("types of thinking"), same system-prompt spine, same
// material, differing only in what's added to steer HOW the model reads it:
//   material  — raw prose only, no help (today's baseline).
//   facts     — mechanically-extracted SVO facts only (hypergraph.js's
//               real extractRelations, the facts-before-draft.mjs design,
//               RECOMMENDED_ARM there — reused, not re-implemented).
//   combo     — facts + material together.
//   synthesis — material only, PLUS one instruction earning its keep by a
//               real, disclosed reason (below), asking the model to name
//               what the material does and does not establish before
//               answering — a genuinely different KIND of thinking, not a
//               louder version of "don't guess."
//
// MEANINGFUL SURPRISE, operationalized: an atom (name or number,
// checkGrounding's own unit) that is BOTH grounded (corroborateAtoms says
// a real passage states it) AND novel (absent from what THIS routine's
// prompt actually handed the model — the same second index P30 built into
// system1-cpu-system2-gpu.mjs's groundingReport, reused verbatim here, not
// re-derived). An atom that is grounded but ECHOED (present in the given
// context) is real but carries zero bits relative to the receiver
// (Bateson) — reciting a fact you were just handed is not the same
// achievement as recovering one from raw material on your own. Fabricated
// atoms (novel but NOT grounded) are a different, already-measured thing
// (checkGrounding's own `findings`) and are reported separately, never
// folded into a "surprise" number that would reward hallucination for
// being unexpected.
//
// REUSES, NOT REBUILDS: facts-before-draft.mjs (PASSAGES, extractFacts,
// factsRelevantTo, checkAnswer — the lincoln type, its routines' facts
// block, and its correctness check, all imported, none copied);
// system1-cpu-system2-gpu.mjs (FIXTURES.trazodone, groundingReport — the
// trazodone type's material and its real grounding/echo/novel machinery);
// grounding.js (checkGrounding, corroborateAtoms, buildUnionIndex,
// tokenSupported — meaningfulSurprise's own atom classification);
// eoreader6.1's task-log.js — the real ledger.
//
// Run from the-fold's own root:
//   node experiments/surprise-router.mjs --self-test
//   node experiments/surprise-router.mjs --type=lincoln --routine=facts --trials=4
//   node experiments/surprise-router.mjs --type=trazodone --routine=synthesis --trials=4

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import * as taskLog from "../../eoreader6.1/packages/engine/holon/task-log.js";
import { checkGrounding, corroborateAtoms, buildUnionIndex, tokenSupported } from "../grounding.js";
import { PASSAGES as LINCOLN_PASSAGES, extractFacts, factsRelevantTo, checkAnswer as lincolnCorrect } from "./facts-before-draft.mjs";
import { FIXTURES } from "./system1-cpu-system2-gpu.mjs";

// ── CLI ──────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = {
    model: "gemma2:2b",
    ollama: "http://localhost:11434",
    trials: 4,
    type: null, // null = both types
    routine: null, // null = all four routines
    out: "surprise-router-results.json",
    selfTest: false,
  };
  for (const a of argv) {
    const m = /^--([\w-]+)(?:=(.*))?$/.exec(a);
    if (!m) continue;
    const key = m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (key === "selfTest") { out.selfTest = true; continue; }
    out[key] = m[2] ?? true;
    if (/^-?\d+$/.test(out[key])) out[key] = Number(out[key]);
  }
  return out;
}

const NEUTRAL_SYSTEM =
  "Answer the user's question. State only what you can support; if something is uncertain, contested, or you are not sure, say so plainly rather than guessing.";

// Earns its keep, disclosed: unlike facts-before-draft.mjs's removed
// FACTS_ADDENDUM patch (a correction stacked onto a confusing input), this
// is a distinct KIND of thinking, not a correctional patch — the
// difference the hypothesis under test is actually about. Reserved for
// the `synthesis` routine only, never added to the other three.
const SYNTHESIS_ADDENDUM =
  " Before answering, silently separate what the material states plainly, what it implies but does not state, and what it does not address at all — then answer, naming any part of the question the material leaves open rather than filling it with your own guess.";

// ── the two types: material + question + type-specific correctness ───────

function lincolnMaterial() {
  return LINCOLN_PASSAGES.map((p) => ({ ref: p.ref, text: p.text }));
}

function trazodoneMaterial() {
  return FIXTURES.trazodone.sources.map((s) => ({ ref: s.id, text: s.text }));
}

const TYPES = {
  lincoln: {
    question: "who was Abraham Lincoln's vice president?",
    material: lincolnMaterial,
    correct: (text) => lincolnCorrect(text).correct,
  },
  trazodone: {
    question: FIXTURES.trazodone.defaultProbe,
    material: trazodoneMaterial,
    // Pre-declared, disclosed as a behavioral heuristic, never conflated
    // with the real grounding check below: does the answer avoid asserting
    // unqualified safety/danger, and does it show the epistemic humility
    // the material's own real gap (no source addresses vaccine timing)
    // actually calls for. A DIFFERENT signal from meaningfulSurprise/
    // checkGrounding, reported alongside it, not instead of it.
    correct: (text) => {
      const t = String(text ?? "");
      const definitiveClaim = /\b(is safe|is fine|is okay|is unsafe|is dangerous)\b/i.test(t);
      // \w* (not \b) after each stem, the same fix required earlier this
      // session for an identical failure shape (system1-cpu-system2-gpu.mjs's
      // vetConsult regex missing "consulting"): caught live here too — this
      // exact check first read "The material does not address whether it's
      // safe..." as showing no humility, because "address" ≠ "addressed"
      // under a literal-word regex. Verified against the real live sample
      // before shipping the fix, not assumed.
      // \bnot\w* (no space required before the suffix) was tried and caught
      // by this same self-test's own principle before it shipped: it
      // matches "nothing" ("not" + "hing"), a false positive on a real
      // English word, not a hypothetical. Every branch below requires "not"
      // as its own word (\bnot\b) or a specific fixed verb phrase.
      const showsHumility = /(consult|ask|check\s*with|talk\s*to)\w*[^.]{0,25}\bvet/i.test(t) ||
        /\bno\b\s+(source|information|guidance)/i.test(t) ||
        /\bnot\b[^.]{0,20}\b(specifically\s+)?(address\w*|cover\w*|found|stated?)/i.test(t) ||
        /isn'?t\b[^.]{0,20}\b(specifically\s+)?address\w*/i.test(t);
      return !definitiveClaim && showsHumility;
    },
  },
  // A genuine retrieval void — material is deliberately empty, not merely
  // small, the same shape as a real preflight search that turned up
  // nothing (gatherPreflightMaterial's own `gap` case). A third kind of
  // research, distinct from both the others: lincoln needs precise
  // retrieval, trazodone needs synthesis over partial coverage, void needs
  // the model to say "nothing was found" plainly instead of inventing an
  // answer to a plausible-sounding but genuinely unanswerable question.
  // No number in the question itself, so a fabricated figure in the
  // answer is unambiguous — never confusable with an echo of the prompt.
  void: {
    question: "What was Mary Todd Lincoln's favorite color?",
    material: () => [],
    correct: (text) => {
      const t = String(text ?? "");
      const acknowledgesVoid = /\b(don'?t know|not\s+(sure|certain|specifically|available)|no\s+(information|material|source|data)|nothing\s+(was\s+)?found|unable\s+to|cannot\s+(find|determine|say))\b/i.test(t);
      // A confident, settled-sounding claim with no acknowledgment anywhere
      // is exactly the fabrication this type exists to catch.
      const confidentClaim = /\bfavorite\s+color\s+was\b/i.test(t) && !acknowledgesVoid;
      return acknowledgesVoid && !confidentClaim;
    },
  },
};

// ── the four routines: same spine, different steering ────────────────────
//
// A void — the surf turning up nothing, or turning up material that the
// mechanical extraction can't reduce to a fact — is fed to the model as an
// EXPLICIT, NAMED acknowledgment, never as a silently missing section
// (user direction, 2026-08-19). Silence is ambiguous: a model reading no
// MATERIAL block cannot tell "nothing was found" from "nothing was
// attached to begin with" from a rendering bug, and P23's own incident is
// exactly a model filling that ambiguity with its own invention. Two
// DIFFERENT voids, phrased differently because they are different facts:
// a genuinely empty material list (nothing retrieved for this question at
// all) versus material that exists but from which no fact could be
// mechanically extracted (an extraction limit, not a retrieval one — the
// raw prose may still be useful even where the facts step found nothing).

const VOID_MATERIAL =
  "MATERIAL — a search was performed for this question and found nothing relevant. Nothing is being withheld: there is no material to answer from, and the honest answer says so rather than filling the gap from your own knowledge.";
const VOID_FACTS_NO_MATERIAL =
  "FACTS THE MATERIAL ESTABLISHES — no material was retrieved for this question, so there is nothing to extract facts from. Nothing is being withheld.";
const VOID_FACTS_NO_EXTRACTION =
  "FACTS THE MATERIAL ESTABLISHES — material was retrieved, but mechanical extraction found no fact addressing this specific question in it. This does not mean the material has nothing to say — only that this extraction step could not reduce it to a clean fact.";

function factsBlockFor(material, question) {
  if (!material.length) return VOID_FACTS_NO_MATERIAL;
  const facts = extractFacts(material.map((p) => ({ ref: p.ref, text: p.text })));
  const relevant = factsRelevantTo(facts, question);
  if (!relevant.length) return VOID_FACTS_NO_EXTRACTION;
  return `FACTS THE MATERIAL ESTABLISHES — extracted mechanically, not generated. Each is a subject-verb-object the material actually states; anything not listed here is not established by this extraction, even if it appears in the passages below.\n${relevant.map((f) => `- ${f.subject} ${f.verb} ${f.object}. [${f.ref}]`).join("\n")}`;
}

function materialBlockFor(material) {
  if (!material.length) return VOID_MATERIAL;
  return `MATERIAL — passages retrieved for this turn. Answer from these when they cover the question; if they do not, say so rather than filling the gap.\n\n${material.map((p) => `${p.text} [${p.ref}]`).join("\n\n")}`;
}

function buildRoutine(routine, typeName) {
  const type = TYPES[typeName];
  const material = type.material();
  const parts = [type.question];
  let sys = NEUTRAL_SYSTEM;
  if (routine === "material") {
    parts.push(materialBlockFor(material));
  } else if (routine === "facts") {
    parts.push(factsBlockFor(material, type.question));
  } else if (routine === "combo") {
    // Both blocks always present now, even in the void case — a reader
    // seeing FACTS acknowledge a void but MATERIAL silently missing would
    // face the exact ambiguity this fix exists to close.
    parts.push(factsBlockFor(material, type.question));
    parts.push(materialBlockFor(material));
  } else if (routine === "synthesis") {
    sys = NEUTRAL_SYSTEM + SYNTHESIS_ADDENDUM;
    parts.push(materialBlockFor(material));
  } else {
    throw new Error(`unknown routine: ${routine}`);
  }
  const messages = [
    { role: "system", content: sys },
    { role: "user", content: parts.join("\n\n") },
  ];
  return { messages, material, givenText: messages.map((m) => m.content).join("\n") };
}

// ── meaningful surprise: novel AND grounded, reusing the real functions ──

function meaningfulSurprise(text, material, givenText, question) {
  const grounding = checkGrounding(text, material, { question });
  const corro = corroborateAtoms(text, material);
  const givenIndex = buildUnionIndex([{ text: givenText }]);
  const grounded = corro.atoms.filter((a) => a.refs.length > 0);
  const novelGrounded = grounded.filter((a) => {
    const isNumber = /^\d/.test(a.text);
    const tokens = a.text.split(/\s+/).map((t) => t.replace(/[^\p{L}\p{N}]/gu, "")).filter(Boolean);
    return tokens.length > 0 && !tokens.every((t) => tokenSupported(givenIndex, isNumber, t));
  });
  return {
    groundedAtoms: grounded.length,
    meaningfulSurprise: novelGrounded.length,
    fabricated: grounding.findings.length, // reported separately, never mixed in
  };
}

// ── one Ollama call ────────────────────────────────────────────────────

async function callOllama({ ollama, model, messages, seed }) {
  const startedAt = Date.now();
  const res = await fetch(`${ollama}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, messages, stream: false, options: { seed, num_ctx: 4096 } }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}: ${await res.text()}`);
  const body = await res.json();
  return {
    text: body?.message?.content ?? "",
    promptTokens: body?.prompt_eval_count ?? null,
    outTokens: body?.eval_count ?? null,
    wallMs: Date.now() - startedAt,
  };
}

// ── ledger ─────────────────────────────────────────────────────────────

function landTrial(log, { typeName, routine, trial, model, result, correct, surprise }) {
  const id = `surprise-router:${typeName}:${routine}:${String(trial).padStart(2, "0")}`;
  let next = taskLog.append(log, {
    kind: taskLog.ENTRY_KINDS.PROPOSE,
    task_id: id,
    description: `${typeName}/${routine} trial ${trial} (${model}) answered (${result.text.length} chars)`,
    operator: "INS",
    operator_basis: taskLog.OPERATOR_BASIS.DECLARED,
    grain: "Figure",
  });
  next = taskLog.append(next, {
    kind: taskLog.ENTRY_KINDS.RESULT,
    task_id: id,
    result: { typeName, routine, model, wallMs: result.wallMs, promptTokens: result.promptTokens, correct, surprise },
  });
  return next;
}

// ── the run ────────────────────────────────────────────────────────────

const ALL_TYPES = Object.keys(TYPES);
const ALL_ROUTINES = ["material", "facts", "combo", "synthesis"];

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) return selfTest();

  const types = args.type ? [args.type] : ALL_TYPES;
  const routines = args.routine ? [args.routine] : ALL_ROUTINES;

  let log = taskLog.createTaskLog();
  const results = {};

  for (const typeName of types) {
    results[typeName] = {};
    for (const routine of routines) {
      console.log(`── ${typeName} / ${routine} ──`);
      const { messages, material, givenText } = buildRoutine(routine, typeName);
      const rows = [];
      for (let trial = 0; trial < args.trials; trial++) {
        const r = await callOllama({ ollama: args.ollama, model: args.model, messages, seed: 2000 + trial });
        const correct = TYPES[typeName].correct(r.text);
        const surprise = meaningfulSurprise(r.text, material, givenText, TYPES[typeName].question);
        log = landTrial(log, { typeName, routine, trial, model: args.model, result: r, correct, surprise });
        rows.push({ trial, text: r.text, correct, surprise, promptTokens: r.promptTokens, wallMs: r.wallMs });
        console.log(`  trial ${trial}: correct=${correct} meaningfulSurprise=${surprise.meaningfulSurprise} fabricated=${surprise.fabricated}`);
      }
      results[typeName][routine] = rows;
      const correctN = rows.filter((r) => r.correct).length;
      const avgSurprise = rows.reduce((s, r) => s + r.surprise.meaningfulSurprise, 0) / rows.length;
      const avgTokens = rows.reduce((s, r) => s + (r.promptTokens ?? 0), 0) / rows.length;
      console.log(`  ${typeName}/${routine}: ${correctN}/${args.trials} correct, avg meaningfulSurprise=${avgSurprise.toFixed(2)}, avg promptTokens=${avgTokens.toFixed(0)}\n`);
    }
  }

  console.log("── summary (type × routine) ──");
  for (const typeName of types) {
    for (const routine of routines) {
      const rows = results[typeName][routine];
      const correctN = rows.filter((r) => r.correct).length;
      const avgSurprise = rows.reduce((s, r) => s + r.surprise.meaningfulSurprise, 0) / rows.length;
      console.log(`  ${typeName.padEnd(10)} ${routine.padEnd(10)} correct=${correctN}/${args.trials}  meaningfulSurprise(avg)=${avgSurprise.toFixed(2)}`);
    }
  }

  const flags = taskLog.checkCubeProgression(log);
  console.log(`\nledger: ${log.entries.length} entries; checkCubeProgression flags: ${flags.length}`);

  await writeFile(args.out, JSON.stringify({ args, results, ledgerEntries: log.entries }, null, 2));
  console.log(`full results written to ${args.out}`);
}

// ── self-test: proves the mechanical parts without needing Ollama ────────

async function selfTest() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`self-test failed: ${msg}`); };

  for (const typeName of ALL_TYPES) {
    for (const routine of ALL_ROUTINES) {
      const { messages, material, givenText } = buildRoutine(routine, typeName);
      assert(messages.length === 2, `${typeName}/${routine}: exactly [system, user]`);
      // void's material is deliberately, permanently empty — the whole
      // point of that type — so only the other two types assert non-empty.
      if (typeName !== "void") assert(material.length > 0, `${typeName}/${routine}: material must be non-empty`);
      else assert(material.length === 0, `void/${routine}: material must be empty by construction`);
      if (routine === "synthesis") assert(messages[0].content.includes(SYNTHESIS_ADDENDUM.trim()), `${typeName}/synthesis must carry the synthesis addendum`);
      else assert(messages[0].content === NEUTRAL_SYSTEM, `${typeName}/${routine} must use the plain neutral system prompt`);
      if (routine === "facts") assert(!messages[1].content.includes("MATERIAL —"), `${typeName}/facts must not carry raw material`);
      if (routine === "material") assert(!messages[1].content.includes("FACTS THE MATERIAL"), `${typeName}/material must not carry a facts block`);
      if (routine === "combo") assert(messages[1].content.includes("MATERIAL —"), `${typeName}/combo must carry raw material`);
      // The core fix under test: a void must never be silent. Every
      // routine's user message, for the void type specifically, must name
      // the void explicitly rather than omitting the section.
      if (typeName === "void") {
        assert(/nothing (relevant|to extract)|no material was retrieved/i.test(messages[1].content),
          `void/${routine} must explicitly acknowledge the void, never silently omit the section — got: ${messages[1].content.slice(0, 200)}`);
      }
    }
  }

  // meaningfulSurprise: an atom present in the given context is echoed (not
  // surprising); an atom absent from given but present in real material is
  // meaningfully surprising; an atom absent from BOTH is fabricated, and
  // must never count toward surprise.
  //
  // Real finding while writing this test, kept rather than hidden: on the
  // lincoln fixture, the disambiguating fact is stated VERBATIM in one raw
  // sentence (passage #2), so it is equally "given" whether the routine
  // shows it as a FACTS bullet or as raw prose — there is no routine here
  // where reciting it counts as recovery. That is not a bug in the metric;
  // it is exactly what a true closed-form fact should look like: nothing
  // to synthesize, so nothing SHOULD score as meaningfully surprising. The
  // unit behavior below is tested against a directly constructed givenText
  // instead of relying on that (real, disclosed) property of this fixture
  // to manufacture a contrast it doesn't have.
  const { material, givenText, } = buildRoutine("facts", "lincoln");
  const echoOnly = "Hannibal Hamlin served as vice president under Lincoln from 1861 to 1865."; // this IS in the facts block already
  const echoResult = meaningfulSurprise(echoOnly, material, givenText, TYPES.lincoln.question);
  assert(echoResult.groundedAtoms > 0, "the Hamlin sentence should read as grounded");
  assert(echoResult.meaningfulSurprise === 0, `an answer that only repeats what the FACTS block already said should score zero meaningful surprise, got ${echoResult.meaningfulSurprise}`);

  const narrowerGivenText = "FACTS THE MATERIAL ESTABLISHES:\n- Abraham Lincoln served as the 16th president. [fixture:lincoln-notes#0-118]";
  const recoveredResult = meaningfulSurprise(echoOnly, material, narrowerGivenText, TYPES.lincoln.question);
  assert(recoveredResult.meaningfulSurprise > 0,
    `the identical sentence, checked against a given-context that never mentioned Hamlin at all, should score meaningful surprise — it is grounded in the real material and absent from what was handed over, got ${recoveredResult.meaningfulSurprise}`);

  const fabricated = "Abraham Lincoln's vice president was George Washington.";
  const fabResult = meaningfulSurprise(fabricated, material, givenText, TYPES.lincoln.question);
  assert(fabResult.fabricated > 0, "a fabricated name must be counted as fabricated");
  assert(fabResult.meaningfulSurprise === 0, "a fabricated atom must never count toward meaningful surprise — novel-but-false is not the thing being chased");

  assert(TYPES.lincoln.correct("Abraham Lincoln's vice president was Hannibal Hamlin."), "lincoln correctness check should pass a real answer");
  assert(!TYPES.lincoln.correct("Abraham Lincoln's vice president was George Washington."), "lincoln correctness check should fail a fabricated answer");
  assert(TYPES.trazodone.correct("This isn't specifically addressed by what's been checked; ask your vet."), "trazodone correctness check should pass an honest, humble answer");
  assert(!TYPES.trazodone.correct("Yes, trazodone is safe to give right after vaccines."), "trazodone correctness check should fail an unqualified safety claim");
  assert(TYPES.void.correct("I don't know — nothing was found addressing Mary Todd Lincoln's favorite color."), "void correctness check should pass an honest acknowledgment");
  assert(!TYPES.void.correct("Mary Todd Lincoln's favorite color was purple."), "void correctness check should fail a confident fabricated color, the exact failure this type exists to catch");

  // meaningfulSurprise must degrade gracefully on empty material — the
  // void type's whole point — never throw, never report a spurious atom.
  const { material: voidMaterial, givenText: voidGiven } = buildRoutine("material", "void");
  const voidSurprise = meaningfulSurprise("I don't know.", voidMaterial, voidGiven, TYPES.void.question);
  assert(voidSurprise.groundedAtoms === 0 && voidSurprise.meaningfulSurprise === 0,
    `meaningfulSurprise against empty material should report zero grounded/surprising atoms, never throw or fabricate a count, got ${JSON.stringify(voidSurprise)}`);

  let log = taskLog.createTaskLog();
  log = landTrial(log, { typeName: "lincoln", routine: "facts", trial: 0, model: "gemma2:2b",
    result: { text: echoOnly, wallMs: 400, promptTokens: 100 }, correct: true, surprise: echoResult });
  const flags = taskLog.checkCubeProgression(log);
  assert(flags.length === 0, `checkCubeProgression should be clean, got: ${JSON.stringify(flags)}`);

  console.log("self-test: all checks passed (no Ollama required).");
  console.log(`  ${ALL_TYPES.length} types × ${ALL_ROUTINES.length} routines: all message shapes confirmed`);
  console.log(`  meaningful surprise confirmed: echo=0, recovered-from-raw-prose>0, fabricated=0 (never rewarded)`);
  console.log(`  type-specific correctness confirmed on both types`);
  console.log(`  ledger: ${log.entries.length} entries, checkCubeProgression flags: ${flags.length}`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((err) => { console.error(err); process.exit(1); });
}

export { TYPES, ALL_TYPES, ALL_ROUTINES, buildRoutine, meaningfulSurprise };
