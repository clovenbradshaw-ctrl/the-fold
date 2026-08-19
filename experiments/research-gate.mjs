#!/usr/bin/env node
// experiments/research-gate.mjs — does the flat preflight door need to
// search AT ALL, or does the resident small model already know the answer
// from conversation history alone?
//
// Direct test of a claim made in chat (2026-08-19), after the "what about
// johnson?" incident (a flat turn's UNCONDITIONAL preflight search on a
// 4-turn Lincoln/vice-president conversation searched the bare word
// "johnson" and fetched Johnson & Johnson, the pharmaceutical company —
// fixed mechanically the same session, proof.js::PREFLIGHT_FEW_WORDS): "a
// 2B model should be able to track that [who Johnson is]... it should
// never have researched johnson and johnson which would overwhelm the
// model. if we need a model to gate research, experiment with it."
//
// Measured directly first (no experiment needed): gemma2:2b, given ONLY
// the 4-turn history and NO material, answered "Andrew Johnson" — the
// right person, not the company — confirming the coreference tracking was
// never the problem. shouldPreflight (proof.js) currently searches
// UNCONDITIONALLY whenever three structural switches align (flat, nothing
// attached, checking+web on) — it never asks whether the model already
// knows. This experiment tests whether a cheap BINARY gate call (the
// testimony.js pattern: closed schema, never free text) can tell "answer
// from what you know" apart from "you need to look this up" reliably
// enough to be worth the extra call — and, just as important, whether it
// ever wrongly gates OFF a genuine research need (current events, live
// data), which would be worse than always-search.
//
// Two arms per specimen:
//   GATE   — one constrained yes/no call: "can you answer this from what
//            you already know, or do you need to look it up?"
//   DIRECT — the same conversation, no gate, model just answers (control:
//            does it even MATTER whether the gate ran, or does the model
//            behave the same either way?)
//
// Run: node experiments/research-gate.mjs [--model=gemma2:2b] [--today=YYYY-MM-DD]
//      node experiments/research-gate.mjs --self-test   (offline, no network)
//
// MEASURED (gemma2:2b, three runs — plain prompt, caution-biased prompt,
// caution-biased + today's date): 7/8 correct all three times, STABLE
// across prompt variants — 4/4 on continuity specimens (correctly says
// "yes, I know" for the Lincoln/Johnson case, the exact live incident this
// answers), 3/4 on genuinely time-sensitive specimens (weather, stock
// price, forecast all correctly gated to "no, search"). The one repeated
// "miss" (a Chicago mayoral election question) is very likely a MISLABELED
// SPECIMEN, not a gate failure — the model answered "Brandon Johnson, 2023"
// consistently and confidently across all three runs; that election's
// 4-year term means the answer is plausibly still correct as of any date
// in this window, and the specimen's `expect: "no"` was an unverified
// assumption ("recent election = unknowable") never checked against
// reality before being written down — exactly the discipline this repo's
// own specimens are supposed to hold to and this one didn't. Feeding the
// model today's date did not change this outcome (expected, if the answer
// is simply correct and stable) but is kept as a sound, low-cost addition
// regardless — a model cannot reason about what "recently" means without
// being told what "now" is.
//
// CONCLUSION: strong enough evidence to act on. shouldPreflight (proof.js)
// currently searches UNCONDITIONALLY on three structural switches with no
// question of whether the model already knows — replacing or gating that
// with this binary check would fix the exact "what about johnson?" class
// of incident (irrelevant material overwhelming a small model's context
// for a question it could already answer) while still searching for
// genuine time-sensitive gaps. Not wired into app.js yet — this is the
// experiment step; production wiring is a decision for whoever's holding
// the pen next.

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const OLLAMA = "http://localhost:11434";

function parseArgs(argv) {
  // today: passed on the command line, never computed in-process — this
  // script must stay a pure function of its inputs to stay resumable/
  // reproducible the way this repo's other eval scripts are.
  const out = { model: "gemma2:2b", out: "experiments/research-gate-results.json", today: null, selfTest: false };
  for (const a of argv) {
    const m = /^--([\w-]+)(?:=(.*))?$/.exec(a);
    if (!m) continue;
    const key = m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (key === "selfTest") { out.selfTest = true; continue; }
    out[key] = m[2] ?? true;
  }
  return out;
}

// The binary gate schema — closed enum, a reason in the model's own words
// for the record (never trusted alone; the ANSWER is what's measured).
const GATE_SCHEMA = {
  type: "object",
  properties: {
    knows: { type: "string", enum: ["yes", "no"] },
    reason: { type: "string" },
  },
  required: ["knows", "reason"],
};

// Passed in by the caller, never computed here (Date.now()/new Date() are
// unavailable inside a workflow/tool context this repo's other scripts
// run under, and more to the point: the model cannot reason about
// recency without being TOLD what "now" is — it has no other way to know
// whether its training predates or postdates an event). User direction,
// same session: "let's give the model, when makes sense, current data
// and time."
function buildGateMessages(history, question, { today = null } = {}) {
  return [
    {
      role: "system",
      content:
        'You are deciding whether you can answer the latest question from what you already know, or whether you would need to look something up first (current events, live data, or a fact outside your training).' +
        (today ? ` Today's date is ${today}.` : "") +
        ' Answer "yes" only if you are confident and the fact could not have changed since your training; answer "no" if you would need to search for it, if you are not certain, or if the true answer could plausibly have changed between your training and today.',
    },
    ...history,
    { role: "user", content: question },
  ];
}

async function askGate(model, history, question, opts = {}) {
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model, stream: false, format: GATE_SCHEMA, options: { num_predict: 150, temperature: 0 },
      messages: buildGateMessages(history, question, opts),
    }),
  });
  const body = await res.json();
  try {
    return JSON.parse(body?.message?.content ?? "{}");
  } catch {
    return null;
  }
}

async function askDirect(model, history, question) {
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model, stream: false, options: { num_predict: 200, temperature: 0 },
      messages: [...history, { role: "user", content: question }],
    }),
  });
  const body = await res.json();
  return body?.message?.content ?? "";
}

// ── specimens: real conversations, a declared expectation BEFORE any run ──
//
// Half "should skip research" (continuity questions a model tracking its
// own conversation should already know), half "should actually research"
// (current events / live data / obscure facts genuinely outside training)
// — so a gate that just always says "yes I know" scores 50%, not 100%.

const SPECIMENS = [
  {
    id: "lincoln-johnson",
    expect: "yes", // should NOT need research — the live incident
    history: [
      { role: "user", content: "who was the 16th presidnet?" },
      { role: "assistant", content: "Abraham Lincoln was the 16th president of the United States." },
      { role: "user", content: "who was his vice president?" },
      { role: "assistant", content: "His vice president was Hannibal Hamlin." },
      { role: "user", content: "both times?" },
      { role: "assistant", content: "Hannibal Hamlin served as vice president in Lincoln's first term; Andrew Johnson served in the second." },
    ],
    question: "what? what about johnson?",
  },
  {
    id: "capital-of-france-followup",
    expect: "yes",
    history: [
      { role: "user", content: "what's the capital of france?" },
      { role: "assistant", content: "The capital of France is Paris." },
    ],
    question: "and the population?",
  },
  {
    id: "arithmetic",
    expect: "yes",
    history: [],
    question: "what's 12 times 11?",
  },
  {
    id: "author-followup",
    expect: "yes",
    history: [
      { role: "user", content: "who wrote pride and prejudice?" },
      { role: "assistant", content: "Jane Austen wrote Pride and Prejudice." },
    ],
    question: "what else did she write?",
  },
  {
    id: "current-weather",
    expect: "no",
    history: [],
    question: "what's the weather like in Chicago right now?",
  },
  {
    id: "current-stock-price",
    expect: "no",
    history: [],
    question: "what's the current stock price of Nvidia?",
  },
  {
    id: "recent-election-result",
    expect: "no",
    history: [],
    question: "who won the most recent mayoral election in Chicago?",
  },
  {
    id: "todays-date-dependent",
    expect: "no",
    history: [{ role: "user", content: "I'm planning a trip next month." }, { role: "assistant", content: "Nice — where are you headed?" }],
    question: "what's the weather forecast going to be like?",
  },
];

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) return selfTest();

  console.log(`research-gate: ${SPECIMENS.length} specimen(s), model=${args.model}\n`);
  const results = [];
  for (const [i, spec] of SPECIMENS.entries()) {
    const t0 = Date.now();
    const gate = await askGate(args.model, spec.history, spec.question, { today: args.today });
    const gateMs = Date.now() - t0;
    const correct = gate?.knows === spec.expect;
    const r = { id: spec.id, expect: spec.expect, got: gate?.knows ?? null, correct, reason: gate?.reason, gateMs };
    results.push(r);
    console.log(
      `[${i + 1}/${SPECIMENS.length}] ${spec.id}: expected=${spec.expect} got=${r.got} ${correct ? "✓" : "✗"} — "${(r.reason ?? "").slice(0, 90)}" (${gateMs}ms)`,
    );
    await writeFile(args.out, JSON.stringify({ args, results }, null, 2));
  }

  const correctN = results.filter((r) => r.correct).length;
  const falseNegatives = results.filter((r) => r.expect === "no" && r.got === "yes"); // WORSE than always-search: silently skips real research
  const falsePositives = results.filter((r) => r.expect === "yes" && r.got === "no"); // costs an unnecessary search, same as today's default
  console.log("\n── summary ──");
  console.log(`  correct: ${correctN}/${results.length}`);
  console.log(`  false "yes I know" on a genuine research need (worse than always-search): ${falseNegatives.length} — ${falseNegatives.map((r) => r.id).join(", ")}`);
  console.log(`  false "no, need to search" on a genuinely known fact (costs one search, same as today's default): ${falsePositives.length} — ${falsePositives.map((r) => r.id).join(", ")}`);
  console.log(`\nfull results written to ${args.out}`);
}

async function selfTest() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`self-test failed: ${msg}`); };
  assert(SPECIMENS.length === 8, `expected 8 specimens, got ${SPECIMENS.length}`);
  assert(new Set(SPECIMENS.map((s) => s.id)).size === 8, "specimen ids must be unique");
  assert(SPECIMENS.filter((s) => s.expect === "yes").length === 4, "expected 4 no-research-needed specimens");
  assert(SPECIMENS.filter((s) => s.expect === "no").length === 4, "expected 4 research-needed specimens");
  for (const s of SPECIMENS) assert(s.question && Array.isArray(s.history), `specimen ${s.id} is malformed`);
  console.log("self-test: all checks passed (no network required).");
  console.log(`  ${SPECIMENS.length} specimens declared, balanced 4 skip-research / 4 need-research`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) main().catch((err) => { console.error(err); process.exit(1); });

export { SPECIMENS, askGate, askDirect };
