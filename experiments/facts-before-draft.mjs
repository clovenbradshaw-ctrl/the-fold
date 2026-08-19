#!/usr/bin/env node
// experiments/facts-before-draft.mjs — A/B/C: does handing the model
// mechanically-extracted facts (never raw prose alone) fix a disambiguation
// failure that raw prose reading gets wrong?
//
// Direct answer to the question asked in chat (2026-08-19), continuing the
// same session's real incident: "who was Abraham Lincoln's vice president?"
// against real retrieved material (Wikipedia + a Civil War encyclopedia)
// answered "John C. Breckinridge" — real, cited, and WRONG (Breckinridge
// was Buchanan's vice president and Lincoln's 1860 opponent; the real
// answer is Hannibal Hamlin, then Andrew Johnson). `checkGrounding` caught
// it as unsupported after the fact ("no material matches that sentence's
// words"), but nothing helped the model get it RIGHT before drafting.
//
// The follow-up question this script answers: run `hypergraph.js`'s own
// extraction (perceiver/text/relations.js::extractRelations, the SAME
// function, not a copy) on the material BEFORE the draft, and see whether
// handing the model the extracted, addressed facts — instead of, or
// alongside, raw prose — changes the outcome. Three arms, same question,
// same material, same model, differing ONLY in what the user message
// contains:
//   A — MATERIAL only (today's real shape, verbatim system prompt).
//   B — FACTS only (the extracted triples, no raw prose at all).
//   C — FACTS + MATERIAL (the facts as a disambiguating header, prose kept
//       for whatever the facts don't cover — the proposed design).
//
// REUSES, NOT REBUILDS:
//   - eoreader6.1/packages/engine/perceiver/text/relations.js —
//     discoverRelationVocab, extractRelations. The exact functions
//     hypergraph.js already calls; not re-implemented here.
//   - grounding.js — wordSet, hasWord (question-anchored triple filtering,
//     the same "retrieval is a function of the question's own words"
//     discipline READING-POLICY P4 states); checkGrounding, corroborateAtoms
//     for the secondary (not primary) grounding-cleanliness read.
//   - eoreader6.1/packages/engine/holon/task-log.js — the real ledger.
//   - The REAL production system prompt, copied verbatim from the actual
//     sent-prompt disclosure pasted into chat during the live incident,
//     not reconstructed from memory — see EXECUTE_SYSTEM_PROMPT below.
//
// WHAT IS NEW, disclosed:
//   - `surfacesOf`: a hand-declared list of the fixture's own candidate
//     person-names, standing in for the full referent-index machinery
//     (cast.js::makeReferentIndex, which needs discoverReferents/
//     splitSentences/namesCorefer/diaNorm all injected — real engine
//     organs, a heavier lift than one standalone script needs to prove the
//     point). Disclosed simplification, not a threshold tuned to the
//     outcome: it is exactly the material's own named entities, readable
//     off the fixture text by anyone, not chosen by checking what it does
//     to the result (the eoreader6.1 CLAUDE.md's own standing rule against
//     exactly that move).
//   - `buildFactsBlock`: filters extracted triples to the ones whose
//     OBJECT shares a content word with the question (here, "vice
//     president") — the same question-anchoring discipline P4 already
//     requires of retrieval, applied to triples instead of passages.
//
// The material below is CONSTRUCTED from verified real facts (WebFetch,
// en.wikipedia.org/wiki/Abraham_Lincoln, 2026-08-19: Hamlin 1861-1865,
// Johnson Mar-Apr 1865; Breckinridge/Buchanan and the 1860 rivalry are
// standard public record), not fabricated — same posture as the
// cumberland/trazodone fixtures earlier this session. Addresses are
// fixture-shaped (fixture:lincoln-notes#...), not claims about a live URL.
//
// Run from the-fold's own root:
//   node experiments/facts-before-draft.mjs --self-test
//   node experiments/facts-before-draft.mjs --trials=4

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import * as taskLog from "../../eoreader6.1/packages/engine/holon/task-log.js";
import { discoverRelationVocab, extractRelations } from "../../eoreader6.1/packages/engine/perceiver/text/relations.js";
import { wordSet, hasWord, checkGrounding, corroborateAtoms } from "../grounding.js";

// ── CLI ──────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = {
    model: "gemma2:2b",
    ollama: "http://localhost:11434",
    trials: 4,
    question: "who was Abraham Lincoln's vice president?",
    out: "facts-before-draft-results.json",
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

// ── the fixture material: realistic noise, not a clean 3-sentence toy ────
//
// Ten passages: Lincoln's real VPs (Hamlin, Johnson), the real confusable
// (Breckinridge, VP under Buchanan, Lincoln's 1860 rival — the two men
// share a sentence more than once, on purpose, since that is exactly the
// shape that produces the confusion), a modern decoy VP for unrelated
// noise, and Lincoln biographical filler. This is what makes the test
// honest: the clean 3-sentence version from the chat design pass already
// worked trivially.

const PASSAGES = [
  {
    ref: "fixture:lincoln-notes#0-118",
    text: "Abraham Lincoln served as the 16th president of the United States, from March 1861 until his assassination in April 1865.",
  },
  {
    ref: "fixture:lincoln-notes#119-241",
    text: "Hannibal Hamlin served as vice president under Lincoln from 1861 to 1865, having been nominated at the 1860 Republican convention.",
  },
  {
    // A plain declarative, not a relative clause ("...Johnson, who served
    // as...") — extractRelations does surface SVO extraction with no
    // coreference resolution, so a relative clause's subject extracts as
    // the literal word "who", not the antecedent it points at. Real,
    // disclosed limitation (this file's own header), sidestepped in the
    // fixture rather than silently producing a garbled "who served..."
    // fact that would unfairly handicap arms B/C on the Johnson half of
    // the answer.
    ref: "fixture:lincoln-notes#242-372",
    text: "For his second term, Lincoln replaced Hamlin on the ticket with Andrew Johnson, a Southern Unionist. Andrew Johnson served as vice president from March to April 1865.",
  },
  {
    ref: "fixture:lincoln-notes#373-486",
    text: "Johnson was sworn in as president immediately after Lincoln's assassination on April 15, 1865, completing Lincoln's term.",
  },
  {
    ref: "fixture:lincoln-notes#487-625",
    text: "John C. Breckinridge served as vice president under James Buchanan, Lincoln's predecessor, from 1857 to 1861 — at 36, the youngest vice president in American history.",
  },
  {
    ref: "fixture:lincoln-notes#626-760",
    text: "In the 1860 presidential election, Breckinridge ran as the Southern Democratic candidate against Lincoln, splitting the Democratic vote and losing to him.",
  },
  {
    ref: "fixture:lincoln-notes#761-889",
    text: "Breckinridge later served as a Confederate general and, briefly in 1865, as the Confederacy's secretary of war, opposing Lincoln's Union directly.",
  },
  {
    ref: "fixture:lincoln-notes#890-1005",
    text: "Kamala Harris served as vice president of the United States under Joe Biden from 2021 to 2025, the first woman to hold the office.",
  },
  {
    ref: "fixture:lincoln-notes#1006-1140",
    text: "Lincoln is generally ranked by historians as one of the greatest American presidents, for his leadership through the Civil War and the abolition of slavery.",
  },
  {
    ref: "fixture:lincoln-notes#1141-1260",
    text: "Hamlin, a former senator from Maine, was largely excluded from Lincoln's inner circle during his term and did not seek renomination in 1864.",
  },
  // Scaled up after the first live run (2026-08-19): the original ten
  // passages produced ZERO Breckinridge confusion in any arm, including
  // raw MATERIAL — the fixture never actually stressed the failure it was
  // built to test. This is a real, disclosed limitation, not tuned away by
  // checking what raises the error rate: the additions below are decided
  // from what the real incident's own conditions were (real material
  // volume, real decoy VPs sharing the "vice president" surface form) and
  // added ONCE, before this version was ever run — not iterated against
  // the result. More real, verified decoy VPs (increasing surface-level
  // "vice president" noise, the same shape Kamala Harris already added)
  // and unrelated Lincoln-era bulk (increasing raw MATERIAL's token cost,
  // which arm A pays and arms B/C mostly don't, since the FACTS block
  // stays the same size regardless of how much surrounding prose exists).
  {
    ref: "fixture:lincoln-notes#1261-1380",
    text: "Mike Pence served as vice president of the United States under Donald Trump from 2017 to 2021.",
  },
  {
    ref: "fixture:lincoln-notes#1381-1495",
    text: "Al Gore served as vice president of the United States under Bill Clinton from 1993 to 2001, after representing Tennessee in the Senate.",
  },
  {
    ref: "fixture:lincoln-notes#1496-1610",
    text: "Dick Cheney served as vice president of the United States under George W. Bush from 2001 to 2009, previously having served as Secretary of Defense.",
  },
  {
    ref: "fixture:lincoln-notes#1611-1720",
    text: "Walter Mondale served as vice president of the United States under Jimmy Carter from 1977 to 1981, later running for president himself in 1984.",
  },
  {
    // The hard case, deliberately: Lincoln and Breckinridge named together
    // in one sentence, in prose shaped like a real encyclopedia entry
    // rather than the earlier passage's cleaner separation.
    ref: "fixture:lincoln-notes#1721-1860",
    text: "The 1860 presidential election was a four-way contest: Abraham Lincoln for the Republicans, John C. Breckinridge for the Southern Democrats, Stephen Douglas for the Northern Democrats, and John Bell for the Constitutional Union party.",
  },
  {
    ref: "fixture:lincoln-notes#1861-1975",
    text: "James Buchanan, the 15th president, served one term from 1857 to 1861 and was succeeded by Lincoln; historians generally rank Buchanan's presidency poorly for failing to prevent the Southern states' secession.",
  },
  {
    ref: "fixture:lincoln-notes#1976-2090",
    text: "William H. Seward served as Lincoln's Secretary of State throughout his presidency, having previously been a rival candidate for the 1860 Republican nomination.",
  },
  {
    ref: "fixture:lincoln-notes#2091-2210",
    text: "Lincoln delivered the Gettysburg Address in November 1863, a brief speech dedicating a portion of the Gettysburg battlefield as a military cemetery.",
  },
  {
    ref: "fixture:lincoln-notes#2211-2330",
    text: "Lincoln was shot by John Wilkes Booth at Ford's Theatre on April 14, 1865, and died the following morning, the first American president to be assassinated.",
  },
  {
    ref: "fixture:lincoln-notes#2331-2450",
    text: "The Emancipation Proclamation, issued by Lincoln on January 1, 1863, declared enslaved people in Confederate-held territory to be free.",
  },
];

// ── the real production system prompt, copied verbatim ───────────────────
//
// From the actual sent-prompt disclosure, pasted into chat during the live
// incident this experiment answers — not reconstructed from memory or
// from app.js's own source (EXECUTE_SYSTEM_PROMPT lives in holon.js,
// another session's contract this pass does not open).

const EXECUTE_SYSTEM_PROMPT =
  "You are writing one part of a larger piece. Write plain prose for the part you are given, and only that part, in your own words. Say what the material establishes about the prompt — do not copy sentences from it, and do not just restate the prompt back. When material is supplied, write from it and cite the address in square brackets exactly as it appears. Where the material does not cover the part, say so plainly instead of filling the gap.";

// One addition, disclosed: arms B/C need the model told what a FACTS line
// is (an extracted claim, not a paraphrase) and that it is exactly as
// citable as a MATERIAL passage — otherwise a model that has never seen
// this block shape has no way to know its epistemic status.
//
// Second sentence added after the first live run (2026-08-19): the initial
// wording said only "cite its address the same way," and gemma2:2b
// sometimes read that as license to answer WITH JUST an address and
// nothing else — e.g. "The question is, who was Abraham Lincoln's vice
// president? \n\n[fixture:lincoln-notes#119-241]" and stopped, a failure
// mode raw MATERIAL never produced. Not a fixture change (the fixture
// wasn't touched to chase this) — a real prompt bug, fixed by saying
// explicitly what the base prompt already implies for prose but a terse
// FACTS block apparently doesn't reinforce on its own.
const FACTS_ADDENDUM =
  " Some material below may appear as a FACTS block instead of prose passages: each line there is a fact extracted mechanically from the real material, not a summary or a guess, and is exactly as citable as an ordinary passage — cite its address the same way. A citation is never the whole answer: write the actual sentence stating what the facts establish, with its citation, not a bare address on its own.";

// ── the extraction step: hypergraph's own function, run BEFORE the draft ─
//
// surfacesOf: the fixture's own named entities, hand-declared (see header
// disclosure) rather than run through the full referent-index machinery.
// Read directly off PASSAGES, not tuned to the question or the outcome.

const SURFACES = ["Abraham Lincoln", "Hannibal Hamlin", "Andrew Johnson", "John C. Breckinridge", "James Buchanan", "Kamala Harris", "Joe Biden"];

/**
 * Every SVO triple `extractRelations` finds in the material, addressed to
 * the passage it came from — the real engine function, called once per
 * passage exactly the way hypergraph.js's own `read()` does (see this
 * file's header for the exact call-site parallel).
 */
function extractFacts(passages) {
  const combined = passages.map((p) => p.text).join(" ");
  const verbs = discoverRelationVocab(combined, { surfaces: SURFACES, minSurfaces: 1 }).verbs;
  const facts = [];
  for (const p of passages) {
    let triples = [];
    try {
      triples = verbs.size ? extractRelations(p.text, { verbs }) : [];
    } catch {
      triples = [];
    }
    for (const t of triples) facts.push({ ...t, ref: p.ref });
  }
  return facts;
}

/**
 * Question-anchored filter (P4/READING-POLICY: retrieval is a function of
 * the question's own words) — a fact's OBJECT must share a content word
 * with the question, the same discipline `retrieve()` already applies to
 * whole passages, applied here to individual triples instead.
 */
function factsRelevantTo(facts, question) {
  const qWords = wordSet(question);
  return facts.filter((f) => [...wordSet(f.object)].some((w) => hasWord(qWords, w)));
}

function factsBlockText(facts) {
  if (!facts.length) return null;
  const lines = facts.map((f) => `- ${f.subject} ${f.verb} ${f.object}. [${f.ref}]`);
  return `FACTS THE MATERIAL ESTABLISHES — extracted mechanically, not generated. Each is a subject-verb-object the material actually states; anything not listed here is not established by this extraction, even if it appears in the passages below.\n${lines.join("\n")}`;
}

function materialBlockText(passages) {
  return `MATERIAL — passages retrieved for this turn. Answer from these when they cover the question; if they do not, say so rather than filling the gap.\n\n${passages.map((p) => `${p.text} [${p.ref}]`).join("\n\n")}`;
}

// ── the three arms: same system prompt, same question, different user body

function buildArm(kind, passages, question) {
  const facts = kind === "B" || kind === "C" ? factsRelevantTo(extractFacts(passages), question) : [];
  const parts = [`Write this part: the question. ${question}`];
  if (kind === "A") parts.push(materialBlockText(passages));
  if (kind === "B") parts.push(factsBlockText(facts) ?? "FACTS THE MATERIAL ESTABLISHES — none extracted.");
  if (kind === "C") {
    const fb = factsBlockText(facts);
    if (fb) parts.push(fb);
    parts.push(materialBlockText(passages));
  }
  const sys = kind === "A" ? EXECUTE_SYSTEM_PROMPT : EXECUTE_SYSTEM_PROMPT + FACTS_ADDENDUM;
  return {
    messages: [
      { role: "system", content: sys },
      { role: "user", content: parts.join("\n\n") },
    ],
    facts,
  };
}

// ── pre-declared checks (never a threshold, never a style grade) ─────────
//
// Two independently-known facts, declared before any model runs: the real
// answer names Hamlin or Johnson; the real wrong answer is Breckinridge
// alone, unqualified. An answer that names Breckinridge WHILE ALSO saying
// he served under Buchanan (not Lincoln) is read as correct — it used the
// confusable name accurately, which is a different, better thing than the
// original incident's unqualified error.

function checkAnswer(text) {
  const t = String(text ?? "");
  const namesRealVP = /\bHamlin\b/i.test(t) || /\bJohnson\b/i.test(t);
  const namesBreckinridge = /\bBreckinridge\b/i.test(t);
  const disclaimsBreckinridge = namesBreckinridge && /(Buchanan|not Lincoln|predecessor|1860)/i.test(t);
  const wrongUnqualified = namesBreckinridge && !disclaimsBreckinridge && !namesRealVP;
  return {
    namesRealVP,
    namesBreckinridge,
    disclaimsBreckinridge,
    correct: namesRealVP || (namesBreckinridge && disclaimsBreckinridge),
    wrongUnqualified,
  };
}

// ── grounding read (secondary metric): real functions, real passages ─────

function groundingRead(text, question) {
  const g = checkGrounding(text, PASSAGES, { question });
  const c = corroborateAtoms(text, PASSAGES);
  return {
    standingOnMaterial: c.atoms.filter((a) => a.refs.length > 0).length,
    claimingNothingBacks: g.findings.length,
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

function landTrial(log, { arm, trial, model, result, checks, grounding }) {
  const id = `facts-before-draft:${arm}:${String(trial).padStart(2, "0")}`;
  let next = taskLog.append(log, {
    kind: taskLog.ENTRY_KINDS.PROPOSE,
    task_id: id,
    description: `arm ${arm} trial ${trial} (${model}) answered (${result.text.length} chars)`,
    operator: "INS",
    operator_basis: taskLog.OPERATOR_BASIS.DECLARED,
    grain: "Figure",
  });
  next = taskLog.append(next, {
    kind: taskLog.ENTRY_KINDS.RESULT,
    task_id: id,
    result: { arm, model, wallMs: result.wallMs, promptTokens: result.promptTokens, outTokens: result.outTokens, checks, grounding },
  });
  return next;
}

// ── the run ────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) return selfTest();

  const facts = extractFacts(PASSAGES);
  const relevant = factsRelevantTo(facts, args.question);
  console.log(`extracted ${facts.length} fact(s) total, ${relevant.length} relevant to the question:`);
  for (const f of relevant) console.log(`  - ${f.subject} ${f.verb} ${f.object} [${f.ref}]`);
  console.log("");

  let log = taskLog.createTaskLog();
  const results = { A: [], B: [], C: [] };

  for (const arm of ["A", "B", "C"]) {
    console.log(`── arm ${arm} ──`);
    const { messages } = buildArm(arm, PASSAGES, args.question);
    for (let trial = 0; trial < args.trials; trial++) {
      const r = await callOllama({ ollama: args.ollama, model: args.model, messages, seed: 1000 + trial });
      const checks = checkAnswer(r.text);
      const grounding = groundingRead(r.text, args.question);
      log = landTrial(log, { arm, trial, model: args.model, result: r, checks, grounding });
      results[arm].push({ trial, text: r.text, checks, grounding, wallMs: r.wallMs });
      console.log(`  trial ${trial}: correct=${checks.correct} wrongUnqualified=${checks.wrongUnqualified} — "${r.text.trim().slice(0, 100).replace(/\n/g, " ")}${r.text.length > 100 ? "…" : ""}"`);
    }
    const correctN = results[arm].filter((x) => x.checks.correct).length;
    console.log(`  arm ${arm}: ${correctN}/${args.trials} correct\n`);
  }

  console.log("── summary ──");
  for (const arm of ["A", "B", "C"]) {
    const correctN = results[arm].filter((x) => x.checks.correct).length;
    const wrongN = results[arm].filter((x) => x.checks.wrongUnqualified).length;
    console.log(`  ${arm}: ${correctN}/${args.trials} correct, ${wrongN}/${args.trials} wrong-unqualified-Breckinridge`);
  }

  const flags = taskLog.checkCubeProgression(log);
  console.log(`\nledger: ${log.entries.length} entries; checkCubeProgression flags: ${flags.length}`);

  await writeFile(args.out, JSON.stringify({ args, extractedFacts: facts, relevantFacts: relevant, results, ledgerEntries: log.entries }, null, 2));
  console.log(`full results written to ${args.out}`);
}

// ── self-test: proves the mechanical parts without needing Ollama ────────

async function selfTest() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`self-test failed: ${msg}`); };

  const facts = extractFacts(PASSAGES);
  assert(facts.length >= 5, `expected several extracted facts, got ${facts.length}`);
  const hamlinFact = facts.find((f) => f.subject === "Hannibal Hamlin");
  assert(hamlinFact && /vice president/i.test(hamlinFact.object), "Hamlin's own VP fact should be extracted with 'vice president' in its object");
  const breckFact = facts.find((f) => f.subject.includes("Breckinridge") && /Buchanan/i.test(f.object));
  assert(breckFact, "Breckinridge's fact should be extracted and correctly attribute Buchanan, not Lincoln, in its own object");
  assert(!facts.some((f) => f.subject.includes("Breckinridge") && /\bLincoln\b/i.test(f.object) && !/Buchanan/i.test(f.object)),
    "no extracted fact should misattribute Breckinridge's VP role to Lincoln");

  const relevant = factsRelevantTo(facts, "who was Abraham Lincoln's vice president?");
  // The filter shares its whole discipline (P4: retrieval is a function of
  // the question's own words) with `retrieve()` elsewhere in this repo —
  // ANY shared content word earns inclusion, not just the phrase "vice
  // president" verbatim, so a fact merely mentioning "Lincoln" or
  // "president" is legitimately included too (broader recall, not a bug —
  // under-inclusion, not over-inclusion, is the danger this filter guards
  // against). What matters is that the load-bearing facts survive and
  // nothing about them is dropped.
  assert(relevant.length >= 3 && relevant.length < facts.length,
    `question-anchoring should narrow the set, not empty it or keep everything — got ${relevant.length} of ${facts.length}`);
  const hamlinRelevant = relevant.find((f) => f.subject === "Hannibal Hamlin");
  const breckRelevant = relevant.find((f) => f.subject.includes("Breckinridge") && /Buchanan/i.test(f.object));
  assert(hamlinRelevant, "Hamlin's own fact must survive question-anchoring — this is the whole point of the FACTS block");
  assert(breckRelevant, "Breckinridge's correctly-attributed fact must survive too — the disambiguator the model needs most");

  const armA = buildArm("A", PASSAGES, "who was Abraham Lincoln's vice president?");
  const armB = buildArm("B", PASSAGES, "who was Abraham Lincoln's vice president?");
  const armC = buildArm("C", PASSAGES, "who was Abraham Lincoln's vice president?");
  assert(armA.messages[1].content.includes("MATERIAL —") && !armA.messages[1].content.includes("FACTS THE MATERIAL"), "arm A must be MATERIAL only");
  assert(armB.messages[1].content.includes("FACTS THE MATERIAL") && !armB.messages[1].content.includes("MATERIAL —"), "arm B must be FACTS only");
  assert(armC.messages[1].content.includes("FACTS THE MATERIAL") && armC.messages[1].content.includes("MATERIAL —"), "arm C must carry both");
  assert(armA.messages[0].content === EXECUTE_SYSTEM_PROMPT, "arm A's system prompt must be the real production text, byte for byte, unmodified");
  assert(armB.messages[0].content.startsWith(EXECUTE_SYSTEM_PROMPT), "arms B/C extend the real prompt, never replace it");

  const correctText = "Abraham Lincoln's vice presidents were Hannibal Hamlin (1861-1865) and Andrew Johnson (1865). [fixture:lincoln-notes#119-241]";
  const wrongText = "Abraham Lincoln's vice president was John C. Breckinridge.";
  const qualifiedText = "John C. Breckinridge was a vice president of the era, but under Buchanan, Lincoln's predecessor — Lincoln's own vice presidents were Hamlin, then Johnson.";
  assert(checkAnswer(correctText).correct === true, "naming Hamlin/Johnson should read as correct");
  assert(checkAnswer(wrongText).wrongUnqualified === true && checkAnswer(wrongText).correct === false,
    "naming only Breckinridge with no Buchanan/1860 qualifier should read as the original incident's exact error");
  assert(checkAnswer(qualifiedText).correct === true, "naming Breckinridge WHILE correctly attributing him to Buchanan should read as correct, not penalized for the confusable name appearing");

  let log = taskLog.createTaskLog();
  log = landTrial(log, { arm: "A", trial: 0, model: "gemma2:2b",
    result: { text: wrongText, wallMs: 500, promptTokens: 100, outTokens: 10 },
    checks: checkAnswer(wrongText), grounding: { standingOnMaterial: 0, claimingNothingBacks: 1 } });
  log = landTrial(log, { arm: "C", trial: 0, model: "gemma2:2b",
    result: { text: correctText, wallMs: 500, promptTokens: 120, outTokens: 20 },
    checks: checkAnswer(correctText), grounding: { standingOnMaterial: 2, claimingNothingBacks: 0 } });
  const flags = taskLog.checkCubeProgression(log);
  assert(flags.length === 0, `checkCubeProgression should be clean, got: ${JSON.stringify(flags)}`);
  assert(log.entries.length === 4, `expected 4 entries (propose+result x2), got ${log.entries.length}`);

  console.log("self-test: all checks passed (no Ollama required).");
  console.log(`  ${facts.length} facts extracted from the fixture, ${relevant.length} question-relevant`);
  console.log(`  Breckinridge's own extracted fact correctly names Buchanan, never Lincoln`);
  console.log(`  arm shapes confirmed: A=material-only, B=facts-only, C=both; real system prompt byte-for-byte in A`);
  console.log(`  checkAnswer confirmed on all three canned cases (correct / wrong-unqualified / qualified-mention)`);
  console.log(`  ledger: ${log.entries.length} entries, checkCubeProgression flags: ${flags.length}`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((err) => { console.error(err); process.exit(1); });
}

export { PASSAGES, extractFacts, factsRelevantTo, buildArm, checkAnswer, groundingRead };
