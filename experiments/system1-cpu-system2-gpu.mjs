#!/usr/bin/env node
// experiments/system1-cpu-system2-gpu.mjs — does splitting the fold's own
// two representations across two differently-placed models change what
// comes back?
//
// Direct answer to the question asked in chat (2026-08-19): run a CPU model
// on System 1 (the running summary — fold.js's paraphrase, no address) in
// parallel with a GPU model on System 2 (the addressed record) and look at
// both answers side by side. fold.js's own header already names this split
// ("Two folds, not one fold at two resolutions... System 1 is... associative
// and lossy... System 2... keeps the address"); this script is the first
// live instance of putting a DIFFERENT model on each side rather than
// merging both into one system message for one model, which is what
// buildTurnMessages does today for every production turn.
//
// Second topic added same day, direct answer to a live example of the
// production app doing this badly: "can you give a dog trazodone after
// getting vaccines?" got a poorly-grounded, off-topic answer from the app
// (screenshot in chat — cited a source about PRE-vet-visit timing, then on
// the follow-up produced a record with zero supporting sentences). The
// `trazodone` fixture below is built from REAL fetched veterinary sources
// (WebFetch, quoted close to verbatim, real URLs as refs) rather than
// authored facts — SEE THE DISCLOSURE at FIXTURES.trazodone: three
// independent real sources were checked and NONE of them address giving
// trazodone specifically AFTER (rather than before) a vaccine, which is
// itself the honest finding this fixture is built to expose, not paper over.
//
// REUSES, NOT REBUILDS (the standing rule — leave everything possible in the
// engine/fold, held here by import, not by copying):
//   - fold.js — buildTurnMessages, buildSummarySystemMessage,
//     buildRecordSystemMessage, updateSummaryWithFold, buildWarrantRecord,
//     addWarrantRecord, mechanicalFoldLine, emptySummary — ALL real, none
//     re-implemented. The isolation between arms is done by shaping the
//     SUMMARY OBJECT handed to the real functions (records: [] hides System
//     2 from buildRecordSystemMessage's own `if (!records.length) return
//     null` gate; topic: null hides System 1 from buildSummarySystemMessage's
//     own `if (!summary?.topic) return null` gate) — never by re-deriving
//     what those functions already decide.
//   - eoreader6.1/packages/engine/holon/task-log.js — the real append-only
//     ledger, same as wide-vs-narrow.mjs's own usage.
//
// WHAT IS NEW HERE, disclosed rather than smuggled in as if established:
//   - two Ollama calls dispatched with Promise.all (genuinely concurrent,
//     not sequential-then-compared) rather than the single `state.model`
//     completeOnce() every production turn uses.
//   - `options.num_ctx` and `options.num_gpu`, which app.js's completeOnce()
//     does not currently thread through (only num_predict is) — this
//     script's whole variable IS placement and context size, the same
//     disclosed-addition posture wide-vs-narrow.mjs took for temperature.
//   - a post-hoc placement check against Ollama's own `/api/ps` (size vs
//     size_vram) so "CPU model" / "GPU model" are MEASURED after the call,
//     never assumed from the `num_gpu` option having been sent — the same
//     posture explore-server.mjs's `verifySnapshot` takes toward a claim
//     about where something actually ran (P20's generalization: the far
//     side's own claim about itself is data, not ground, until read — here
//     the "far side" is Ollama's own placement decision, not a webpage).
//   - a small set of PRE-DECLARED, per-fixture factual checks (never a
//     formal statistic, never a hand-set pass/fail threshold on model
//     behavior — see nearby wide-vs-narrow.mjs for that kind of claim; this
//     script only checks whether specific, independently-known facts and
//     specific overclaims appear in each arm's own text).
//
// P2 (POLICIES.md — "the model is the mouth"): neither arm is ever told to
// "be fast" or "be intuitive" or "be careful" in a way that asks it to
// PERFORM a cognitive style in language. The only thing that differs
// between arms is what data each one is handed and which model answers —
// structural, not instructional. Both arms share the exact same neutral
// system framing (NEUTRAL_BASE below).
//
// Layout assumption, unchanged from grid.test.mjs / wide-vs-narrow.mjs: the
// -fold and eoreader6.1 are SIBLING directories. Run from the-fold's own
// root:
//   node experiments/system1-cpu-system2-gpu.mjs --self-test
//   node experiments/system1-cpu-system2-gpu.mjs --topic=cumberland
//   node experiments/system1-cpu-system2-gpu.mjs --topic=trazodone

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import * as taskLog from "../../eoreader6.1/packages/engine/holon/task-log.js";
import {
  emptySummary,
  mechanicalFoldLine,
  updateSummaryWithFold,
  buildWarrantRecord,
  addWarrantRecord,
  buildTurnMessages,
  buildSummarySystemMessage,
  buildRecordSystemMessage,
} from "../fold.js";
import { checkGrounding, corroborateAtoms, buildUnionIndex, tokenSupported } from "../grounding.js";

// ── CLI ──────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = {
    topic: "cumberland",
    cpuModel: "gemma2:2b",
    gpuModel: "qwen2.5:14b-instruct-q4_K_M",
    ollama: "http://localhost:11434",
    cpuCtx: 8192, // gemma2:2b's own trained context length — "full", not padded past what the model has
    gpuCtx: 4096,
    probe: null, // null = use the fixture's own defaultProbe
    out: "system1-cpu-system2-gpu-results.json",
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

// ── fixtures: a source set plus the scripted turns that fold over it ─────
//
// Byte offsets for every warrant ref are computed with indexOf against the
// fixture's OWN source text, never hand-counted — the same P5.2 discipline
// the real chunkers hold themselves to, at fixture scale. A turn with no
// `sentence` (trazodone's 4th turn) gets no ref at all — an honest empty
// list, never a fabricated one — and its `open` items say what was checked
// and not found, the same shape buildWarrantRecord already gives production
// turns that come up short.

function refFor(source, sentence) {
  const start = source.text.indexOf(sentence);
  if (start < 0) throw new Error(`fixture drift in ${source.id}: sentence not found verbatim — "${sentence}"`);
  return `${source.id}#${start}-${start + sentence.length}`;
}

const CUMBERLAND_SOURCE = {
  id: "fixture:cumberland-notes",
  text:
    "The Cumberland River flows through Nashville, Tennessee. It is 688 miles " +
    "long and joins the Ohio River at Smithland, Kentucky. The city's flood " +
    "wall was completed in 1953, after the catastrophic flood of 1937. " +
    "Nashville's mayor for most of 2019 was David Briley, who lost a special " +
    "election that August; John Cooper was sworn in that September and was " +
    "mayor for the remainder of the year.",
};

// Two real sources, fetched live (2026-08-19) rather than authored from
// memory — this whole fixture exists to test the split honestly, and
// hand-writing "facts" about a real medication would be exactly the
// fabricated-grounding failure the rest of this repo's grounding ladder
// exists to catch. Quotes are close to verbatim off each page; VCA
// Hospitals is written/reviewed veterinary content, VetMedGuide is cited
// for the serotonin-syndrome symptom list and its 1-12h onset window.
const VCA_SOURCE = {
  id: "web:vcahospitals.com/know-your-pet/trazodone",
  text:
    "Trazodone is used to treat behavioral disorders, especially anxiety- or " +
    "phobia-related in dogs, including separation anxiety, noise phobia such " +
    "as fireworks or thunderstorms, veterinary visits, hospitalization, and " +
    "travel. Several medications should be used with caution when given with " +
    "trazodone, including SSRIs, MAO inhibitors, and CNS depressants. " +
    "Trazodone should not be used in pets who are using MAO inhibitors or " +
    "have angle-closure glaucoma.",
};

const VETMEDGUIDE_SOURCE = {
  id: "web:vetmedguide.com/blog/trazodone-for-dogs",
  text:
    "Signs of serotonin syndrome in dogs include vomiting, diarrhea, seizures, " +
    "elevated body temperature, increased skin sensitivity, depression, " +
    "dilated pupils, vocalization, blindness, excessive drooling, difficulty " +
    "breathing, incoordination, disorientation, and in severe cases coma or " +
    "death. Signs typically develop within 1 to 12 hours of dosing.",
};

/**
 * `turns` are folded through the REAL fold.js functions exactly as
 * fold.test.mjs's own fixtures do — a hand-authored JSON string standing in
 * for a summary-refresh model reply. The refresh mechanism itself is
 * already tested elsewhere (fold.test.mjs); what this script is about is
 * the FINAL, live probe turn, not re-proving the refresh works.
 */
const FIXTURES = {
  cumberland: {
    sources: [CUMBERLAND_SOURCE],
    defaultProbe: "How long is the Cumberland River, and who was Nashville's mayor in 2019?",
    turns: [
      {
        q: "What river runs through Nashville, and where does it go?",
        gist: "Cumberland River runs through Nashville and joins the Ohio at Smithland, KY",
        source: CUMBERLAND_SOURCE,
        sentence: "The Cumberland River flows through Nashville, Tennessee.",
        open: [],
        refreshJson: {
          topic: "the Cumberland River",
          flow: "started with what river runs through Nashville",
          entities: ["Cumberland River", "Nashville", "Ohio River", "Smithland"],
          context: "discussing the Cumberland River's path",
          language: "en",
        },
      },
      {
        q: "How was flooding there handled historically?",
        gist: "Nashville's flood wall (1953) followed the 1937 flood",
        source: CUMBERLAND_SOURCE,
        sentence: "The city's flood wall was completed in 1953, after the catastrophic flood of 1937.",
        open: [],
        refreshJson: {
          topic: "the Cumberland River and Nashville flood history",
          flow: "moved from the river's geography to the city's 1937 flood and 1953 flood wall",
          entities: ["Cumberland River", "Nashville", "Ohio River", "Smithland"],
          context: "discussing the river and the flood wall built after 1937",
          language: "en",
        },
      },
      {
        q: "Who was mayor of Nashville in 2019?",
        gist: "two mayors in 2019: Briley through August, Cooper from September",
        source: CUMBERLAND_SOURCE,
        sentence: "Nashville's mayor for most of 2019 was David Briley, who lost a special election that August; John Cooper was sworn in that September and was mayor for the remainder of the year.",
        open: [],
        refreshJson: {
          topic: "the Cumberland River, Nashville flood history, and its 2019 mayors",
          flow: "moved from the river's geography, to the 1937/1953 flood history, to who was mayor in 2019",
          entities: ["Cumberland River", "Nashville", "Ohio River", "Smithland", "David Briley", "John Cooper"],
          context: "2019 had two Nashville mayors: Briley then Cooper",
          language: "en",
        },
      },
    ],
  },

  trazodone: {
    sources: [VCA_SOURCE, VETMEDGUIDE_SOURCE],
    defaultProbe: "Can you give a dog trazodone after getting vaccines?",
    turns: [
      {
        q: "What is trazodone used for in dogs?",
        gist: "trazodone treats situational anxiety in dogs, including for vet visits",
        source: VCA_SOURCE,
        sentence: "Trazodone is used to treat behavioral disorders, especially anxiety- or phobia-related in dogs, including separation anxiety, noise phobia such as fireworks or thunderstorms, veterinary visits, hospitalization, and travel.",
        open: [],
        refreshJson: {
          topic: "trazodone for dogs",
          flow: "started with what trazodone is used for",
          entities: ["trazodone"],
          context: "discussing trazodone's approved behavioral uses in dogs",
          language: "en",
        },
      },
      {
        q: "What drug interactions or cautions apply?",
        gist: "caution combining with SSRIs/MAOIs/CNS depressants; contraindicated with MAOIs or angle-closure glaucoma",
        source: VCA_SOURCE,
        sentence: "Several medications should be used with caution when given with trazodone, including SSRIs, MAO inhibitors, and CNS depressants.",
        open: [],
        refreshJson: {
          topic: "trazodone for dogs, including interaction cautions",
          flow: "moved from what trazodone treats to which drugs it should not be combined with",
          entities: ["trazodone", "SSRIs", "MAO inhibitors"],
          context: "trazodone interacts with SSRIs/MAOIs/CNS depressants; contraindicated with MAOIs or glaucoma",
          language: "en",
        },
      },
      {
        q: "What does serotonin syndrome look like and when does it show up?",
        gist: "serotonin syndrome signs (vomiting, fever, seizures, etc.) typically appear 1-12 hours after dosing",
        source: VETMEDGUIDE_SOURCE,
        sentence: "Signs typically develop within 1 to 12 hours of dosing.",
        open: [],
        refreshJson: {
          topic: "trazodone for dogs: uses, drug interactions, and serotonin syndrome timing",
          flow: "moved from interaction cautions to what serotonin syndrome looks like and when it shows up",
          entities: ["trazodone", "serotonin syndrome"],
          context: "serotonin syndrome signs typically appear 1-12 hours after a trazodone dose",
          language: "en",
        },
      },
      {
        // The turn this whole fixture exists to test honestly: the actual
        // probe question, checked against three independent real veterinary
        // sources (VCA Hospitals, AKC, VetMedGuide — WebFetch, 2026-08-19),
        // and NONE of the three say anything about giving trazodone
        // specifically after a vaccine. refs stays empty — not a weak ref,
        // an HONEST one — and `open` names exactly what was checked and not
        // found, the same discipline buildWarrantRecord already gives any
        // production turn that comes up short.
        q: "Is there specific guidance about giving trazodone right after a vaccine?",
        gist: "no source checked addresses trazodone timing specifically relative to vaccination",
        source: null,
        sentence: null,
        open: [
          "trazodone timing relative to vaccination specifically: not addressed by VCA Hospitals, AKC, or VetMedGuide (three sources checked 2026-08-19)",
        ],
        refreshJson: {
          topic: "trazodone for dogs: uses, interactions, serotonin syndrome, and vaccine timing (unanswered)",
          flow: "moved from serotonin syndrome timing to whether any source addresses trazodone right after a vaccine — none do",
          entities: ["trazodone", "serotonin syndrome"],
          context: "no source checked says anything about combining trazodone with a same-day vaccine",
          language: "en",
        },
      },
    ],
  },
};

// ── grounding checks: real referent/atom resolution, never string-matching ─
//
// First version of this script checked each arm's answer with hand-rolled
// regexes (`/\bBriley\b/`, `/serotonin syndrome/i`, a home-grown
// vet-consult pattern). Caught live, same session (2026-08-19): the
// vet-consult regex required the literal word "consult" and silently missed
// the GPU arm's real answer, which said "consulting" — a false negative
// found by re-checking, not by design. That is not a typo to patch harder;
// deciding "does this span of the answer name the same thing the material
// names" by literal string occurrence is exactly the failure this project
// already has a name for and a real fix for (grounding.js's own header:
// names are references to REFERENTS, not byte sequences — "Bezukhov" and
// "Pierre Bezúkhov" point at the same being, and a raw string test cannot
// see that). `checkGrounding` / `corroborateAtoms` already do this: extract
// the answer's own atoms (numbers via NUMBER_RE, names via PROPER_RE), fold
// diacritics, stem words ≥4 chars, expand office-role abbreviations, and
// test containment against a real union index built from the passages —
// not re-derived here, reused. Both are pure (no engine organs to inject),
// so this stays as offline-testable as the regex version was.
//
// One frame, not the frame (the point raised in chat: a referent is always
// FOR someone, relative to whatever universe is doing the checking — think
// Leibniz's monads, each with its own complete point of view, never a
// God's-eye absolute). `checkGrounding`'s own signature already says this
// structurally: it takes `passages` as an explicit argument and reports
// `examined` separately from `clean` — "supported" is never claimed in the
// abstract, only "supported BY THESE PASSAGES". Both arms here are checked
// against the SAME passages (passagesFor(fixture), the real fixture
// sources) even though only the GPU arm was ever SHOWN them directly — a
// deliberate, disclosed choice: the question this script asks is "is what
// each arm said actually true of the real material," not "did the model
// successfully echo what it was given," and those are different questions.
// A checking organ may say "I have nothing to compare this against"; it may
// never manufacture a measurement out of a regex standing in for one — so
// the earlier "did it recommend seeing a vet" / "did it disclose the gap"
// checks are gone rather than kept as a weaker stand-in: those are
// speech-act judgments (no number, no proper name — not an atom at all),
// and this repo has no mechanical instrument for that. Reported as findings
// below, in a human's own reading, not as another invented boolean.

function passagesFor(fixture) {
  return fixture.sources.map((s) => ({ ref: s.id, text: s.text }));
}

/**
 * The tally line's own two counts (app.js ~line 2727: "standing on the
 * material: N sentence(s) ... claiming things nothing given backs: N"),
 * computed here from the same real functions that line reads, against the
 * fixture's own passages — one shared frame for both arms, named as such.
 *
 * A second cut is applied to `findings` before anything is called "claiming
 * things nothing given backs" — caught live (2026-08-19): the GPU arm's real
 * answer named "VCA Hospitals", "AKC", and "VetMedGuide", and all three
 * failed the material check (those exact strings are not IN the passage
 * bytes — the passages hold the sources' quoted content, not their names).
 * But `armMessages`'s own record block had just told this arm, in Turn 4's
 * `open` line, "not addressed by VCA Hospitals, AKC, or VetMedGuide" — the
 * model was repeating something it was JUST HANDED, not inventing anything.
 * Bateson's definition of information is "a difference that makes a
 * difference"; a claim identical to something already in the receiver's own
 * context carries zero bits relative to that receiver (P(x | x was just
 * stated to you) = 1, so -log2(1) = 0) — the same accounting
 * emergence/surprise.js already uses for novelty elsewhere in this project.
 * So a finding is only "novel" — the thing worth a human's eye, the thing
 * that should ever move a hypergraph edge or a prior — if it is ALSO absent
 * from `givenText`, the exact system-message content this arm was handed
 * (armMessages' own output, not re-derived). An `echoed` finding still
 * fails the material check (still worth carrying, since a rephrase of a
 * disclosed gap is not the same as new evidence closing it) but is counted
 * and reported separately, never folded into `claimingNothingBacks`.
 */
function groundingReport(text, fixture, question, givenText = "") {
  const passages = passagesFor(fixture);
  const grounding = checkGrounding(text, passages, { question });
  const corro = corroborateAtoms(text, passages);
  const givenIndex = buildUnionIndex([{ text: givenText }]);
  const classified = grounding.findings.map((f) => {
    const isNumber = f.atomKind === "number";
    const tokens = f.text.split(/\s+/).map((t) => t.replace(/[^\p{L}\p{N}]/gu, "")).filter(Boolean);
    const echoed = tokens.length > 0 && tokens.every((t) => tokenSupported(givenIndex, isNumber, t));
    return { text: f.text, kind: f.atomKind, sentence: f.sentence, echoed };
  });
  const novel = classified.filter((f) => !f.echoed);
  const echoed = classified.filter((f) => f.echoed);
  return {
    examined: grounding.examined,
    clean: grounding.clean,
    sentences: grounding.sentences,
    atomsChecked: grounding.atomsChecked,
    standingOnMaterial: corro.atoms.filter((a) => a.refs.length > 0).length,
    claimingNothingBacks: novel.length,
    findings: novel,
    echoed,
    supportedAtoms: corro.atoms.filter((a) => a.refs.length > 0).map((a) => ({ text: a.text, refs: a.refs })),
  };
}

function buildFold(fixture) {
  let s = emptySummary();
  fixture.turns.forEach((t, i) => {
    const fold = mechanicalFoldLine(t.q, t.gist);
    s = updateSummaryWithFold(s, fold, JSON.stringify(t.refreshJson));
    s = addWarrantRecord(
      s,
      buildWarrantRecord({
        turn: i + 1,
        plane: "world",
        gist: t.gist,
        channels: t.source ? ["source"] : [],
        refs: t.source && t.sentence ? [refFor(t.source, t.sentence)] : [],
        unsupported: [],
        open: t.open ?? [],
      }),
    );
  });
  return s;
}

// ── the arm split: shape the SAME summary object two ways ────────────────
//
// Neither of these is a new representation — both are the real `summary`
// fold.js already built, with one branch blinded by the same gates
// buildSummarySystemMessage / buildRecordSystemMessage already check on
// their own input (see header). `history: []` on both calls is deliberate:
// System 1's whole argument is that it REPLACES the raw transcript, so
// handing the CPU arm raw recency turns on top of the summary would blur
// exactly the isolation this experiment exists to look at.

function armMessages(summary, probe, basePrompt) {
  const system1Only = { ...summary, records: [] };
  const system2Only = { ...summary, topic: null };
  return {
    cpu: buildTurnMessages({ basePrompt, summary: system1Only, history: [], question: probe }),
    gpu: buildTurnMessages({ basePrompt, summary: system2Only, history: [], question: probe }),
  };
}

const NEUTRAL_BASE =
  "Answer the user's question. State only what you can support; if something is uncertain, contested, or you are not sure, say so plainly rather than guessing.";

// ── one Ollama call, plus a post-hoc placement check ──────────────────────
//
// Mirrors wide-vs-narrow.mjs's generateOne() shape (a standalone script
// talks to Ollama directly, not through app.js, because it runs under node
// rather than the browser page) with two additions disclosed in the header:
// num_ctx / num_gpu threaded through, and a `/api/ps` read afterward so
// "ran on the CPU" / "ran on the GPU" is a measured fact about this call,
// not the caller's assumption that num_gpu did what it was asked.

async function callOllama({ ollama, model, messages, numCtx, numGpu }) {
  const startedAt = Date.now();
  const res = await fetch(`${ollama}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: {
        num_ctx: numCtx,
        ...(numGpu !== undefined ? { num_gpu: numGpu } : {}),
      },
    }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}: ${await res.text()}`);
  const body = await res.json();
  const wallMs = Date.now() - startedAt;
  const placement = await checkPlacement({ ollama, model }).catch((err) => ({ error: String(err?.message ?? err) }));
  return {
    text: body?.message?.content ?? "",
    promptTokens: body?.prompt_eval_count ?? null,
    outTokens: body?.eval_count ?? null,
    promptNs: body?.prompt_eval_duration ?? null,
    outNs: body?.eval_duration ?? null,
    wallMs,
    placement,
  };
}

/**
 * Reads Ollama's own `/api/ps` for the named model and reports the measured
 * split: `size_vram / size` is the fraction of the loaded weights actually
 * resident on the GPU right now — 0 is CPU-only, ~1 is GPU-resident,
 * anything between is a real split Ollama chose on its own. Absent from the
 * list entirely (the model already unloaded before this read landed) is
 * reported as `unknown`, never guessed at.
 */
async function checkPlacement({ ollama, model }) {
  const res = await fetch(`${ollama}/api/ps`);
  if (!res.ok) return { status: "unknown", detail: `ps ${res.status}` };
  const body = await res.json();
  const entry = (body?.models ?? []).find((m) => m.name === model || m.model === model);
  if (!entry) return { status: "unknown", detail: "model not in /api/ps by the time this read landed" };
  const size = entry.size ?? null;
  const vram = entry.size_vram ?? 0;
  const fraction = size ? vram / size : null;
  return { status: fraction === null ? "unknown" : fraction === 0 ? "cpu" : fraction >= 0.999 ? "gpu" : "split", fraction, size, size_vram: vram };
}

// ── landing both arms on a real task-log ledger ───────────────────────────
//
// Same grain choice as wide-vs-narrow.mjs's landSample: PROPOSE (birth,
// operator_basis DECLARED because this script lands it by hand, not the
// log's own produce() autopoiesis) then a RESULT attaching the measured
// outcome. The full answer text is NOT put on the ledger — build-log.js's
// own established discipline is that result entries keep run output to a
// declared budget; here the budget is zero, because the full text already
// has a home in the JSON results file this script writes, and the ledger's
// job is the typed event trail, not a second copy of the prose.

function landArm(log, { armId, place, model, question, result, checks }) {
  const id = `probe:${armId}`;
  let next = taskLog.append(log, {
    kind: taskLog.ENTRY_KINDS.PROPOSE,
    task_id: id,
    description: `${armId} (${place}, ${model}) answered the probe (${result.text.length} chars)`,
    operator: "INS",
    operator_basis: taskLog.OPERATOR_BASIS.DECLARED,
    grain: "Figure",
  });
  next = taskLog.append(next, {
    kind: taskLog.ENTRY_KINDS.RESULT,
    task_id: id,
    result: {
      model,
      place,
      question,
      wallMs: result.wallMs,
      promptTokens: result.promptTokens,
      outTokens: result.outTokens,
      placement: result.placement,
      checks,
    },
  });
  return next;
}

// ── the run ────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) return selfTest();

  const fixture = FIXTURES[args.topic];
  if (!fixture) throw new Error(`unknown --topic=${args.topic}; known topics: ${Object.keys(FIXTURES).join(", ")}`);
  const probe = args.probe ?? fixture.defaultProbe;

  const summary = buildFold(fixture);
  const { cpu: cpuMessages, gpu: gpuMessages } = armMessages(summary, probe, NEUTRAL_BASE);

  console.log(`topic: ${args.topic} (sources: ${fixture.sources.map((s) => s.id).join(", ")})`);
  console.log(`probe: ${probe}\n`);
  console.log(`CPU arm (${args.cpuModel}) sees System 1 only:\n${buildSummarySystemMessage({ ...summary, records: [] })}\n`);
  console.log(`GPU arm (${args.gpuModel}) sees System 2 only:\n${buildRecordSystemMessage({ ...summary, topic: null })}\n`);
  console.log("dispatching both arms concurrently...\n");

  const [cpu, gpu] = await Promise.all([
    callOllama({ ollama: args.ollama, model: args.cpuModel, messages: cpuMessages, numCtx: args.cpuCtx, numGpu: 0 }),
    callOllama({ ollama: args.ollama, model: args.gpuModel, messages: gpuMessages, numCtx: args.gpuCtx }),
  ]);

  // Both arms checked against the SAME passages — the real fixture sources,
  // one shared frame — even though only the GPU arm was ever shown them
  // directly (see the disclosure above groundingReport's definition). Each
  // arm's `givenText` is its OWN system message, so "echoed" is judged
  // against what THAT arm actually received, never the other arm's.
  const cpuChecks = groundingReport(cpu.text, fixture, probe, cpuMessages[0]?.content ?? "");
  const gpuChecks = groundingReport(gpu.text, fixture, probe, gpuMessages[0]?.content ?? "");

  let log = taskLog.createTaskLog();
  log = landArm(log, { armId: "cpu-system1", place: "cpu", model: args.cpuModel, question: probe, result: cpu, checks: cpuChecks });
  log = landArm(log, { armId: "gpu-system2", place: "gpu", model: args.gpuModel, question: probe, result: gpu, checks: gpuChecks });

  const report = (label, r, checks) => {
    console.log(`── ${label} ──`);
    console.log(r.text.trim());
    console.log(`  measured placement: ${r.placement.status}${r.placement.fraction != null ? ` (vram fraction ${r.placement.fraction.toFixed(2)})` : ""}`);
    console.log(`  wall ${r.wallMs}ms · prompt ${r.promptTokens ?? "?"} tok · out ${r.outTokens ?? "?"} tok`);
    console.log(`  standing on the material: ${checks.standingOnMaterial} atom(s)` +
      (checks.claimingNothingBacks ? ` · claiming things nothing given backs: ${checks.claimingNothingBacks}` : ""));
    if (checks.supportedAtoms.length) console.log(`  supported: ${checks.supportedAtoms.map((a) => `"${a.text}"→${a.refs.join(",")}`).join("; ")}`);
    if (checks.findings.length) console.log(`  novel + unsupported: ${checks.findings.map((f) => `"${f.text}"`).join("; ")}`);
    if (checks.echoed.length) console.log(`  echoed from its own context (zero new info, not counted against it): ${checks.echoed.map((f) => `"${f.text}"`).join("; ")}`);
    console.log("");
  };
  report(`CPU / System 1 — ${args.cpuModel}`, cpu, cpuChecks);
  report(`GPU / System 2 — ${args.gpuModel}`, gpu, gpuChecks);

  const flags = taskLog.checkCubeProgression(log);
  console.log(`ledger: ${log.entries.length} entries on a real eoreader6.1 task-log; checkCubeProgression flags: ${flags.length}`);

  await writeFile(
    args.out,
    JSON.stringify({ args, topic: args.topic, sources: fixture.sources, probe, cpu, gpu, cpuChecks, gpuChecks, ledgerEntries: log.entries }, null, 2),
  );
  console.log(`\nfull results + ledger entries written to ${args.out}`);
}

// ── self-test: proves the mechanical parts without needing Ollama ────────
//
// Canned arm text stands in for a model reply (no network) so the fold
// construction (for BOTH fixtures, including trazodone's honest empty-ref
// open-gap turn), the arm-isolation gates, the placement-status classifier,
// the checks, and the ledger landing are all exercised for real.

async function selfTest() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`self-test failed: ${msg}`); };

  // ── cumberland: unchanged behavior from the first version of this script
  const summary = buildFold(FIXTURES.cumberland);
  assert(summary.turnCount === 3, `expected 3 folded turns, got ${summary.turnCount}`);
  assert(summary.records.length === 3, `expected 3 warrant records, got ${summary.records.length}`);
  assert(summary.records.every((r) => /^fixture:cumberland-notes#\d+-\d+$/.test(r.refs[0])),
    "every warrant record should carry a real fixture ref");

  const { cpu: cpuMessages, gpu: gpuMessages } = armMessages(summary, "who was mayor in 2019?", NEUTRAL_BASE);
  const cpuSys = cpuMessages[0].content;
  const gpuSys = gpuMessages[0].content;
  // "PAST DISCOURSE" is not a clean marker on its own: buildRecordSystemMessage's
  // OWN text references it defensively ("Unlike PAST DISCOURSE, these can be
  // re-opened"), so a naive substring check reads GPU's block as containing
  // CPU's. "Topic:" only ever appears inside buildSummarySystemMessage's output.
  assert(cpuSys.includes("Topic:"), "CPU arm should carry the System 1 paraphrase block");
  assert(!cpuSys.includes("ON RECORD"), "CPU arm must NOT see the System 2 record block");
  assert(gpuSys.includes("ON RECORD"), "GPU arm should carry the System 2 record block");
  assert(!gpuSys.includes("Topic:"), "GPU arm must NOT see the System 1 paraphrase block");
  assert(cpuMessages.length === 2 && gpuMessages.length === 2,
    "history:[] means each arm's messages are exactly [system, user]");

  const placementCpu = { status: "cpu", fraction: 0, size: 1000, size_vram: 0 };
  const placementGpu = { status: "gpu", fraction: 1, size: 1000, size_vram: 1000 };
  const frac = (vram, size) => (size ? vram / size : null);
  const classify = (fraction) => (fraction === null ? "unknown" : fraction === 0 ? "cpu" : fraction >= 0.999 ? "gpu" : "split");
  assert(classify(frac(0, 1000)) === "cpu", "0 vram bytes classifies as cpu");
  assert(classify(frac(1000, 1000)) === "gpu", "full vram residency classifies as gpu");
  assert(classify(frac(400, 1000)) === "split", "partial vram residency classifies as split, never rounded to cpu or gpu");

  // A fabricated number (1,000 vs the material's real 688) vs an answer
  // built entirely from real fixture facts — checkGrounding/corroborateAtoms
  // against CUMBERLAND_SOURCE, not a regex on either string.
  const cpuText = "The Cumberland River is about 1,000 miles long. Its mayor in 2019 was David Briley.";
  const gpuText = "David Briley was mayor for part of 2019, and John Cooper became mayor that September.";
  const cpuChecks = groundingReport(cpuText, FIXTURES.cumberland, "who was mayor in 2019?");
  const gpuChecks = groundingReport(gpuText, FIXTURES.cumberland, "who was mayor in 2019?");
  assert(cpuChecks.claimingNothingBacks >= 1,
    "a fabricated mileage figure (1,000 vs the real 688) should be flagged as an atom nothing given backs");
  assert(gpuChecks.claimingNothingBacks === 0,
    "an answer built entirely from real fixture facts should have zero unsupported atoms");
  assert(gpuChecks.standingOnMaterial >= 2,
    "David Briley, Cooper, and the September detail should resolve as atoms the real material actually supports");

  let log = taskLog.createTaskLog();
  log = landArm(log, { armId: "cpu-system1", place: "cpu", model: "gemma2:2b", question: "who was mayor in 2019?",
    result: { text: cpuText, wallMs: 400, promptTokens: 120, outTokens: 12, placement: placementCpu }, checks: cpuChecks });
  log = landArm(log, { armId: "gpu-system2", place: "gpu", model: "qwen2.5:14b-instruct-q4_K_M", question: "who was mayor in 2019?",
    result: { text: gpuText, wallMs: 1800, promptTokens: 180, outTokens: 34, placement: placementGpu }, checks: gpuChecks });
  const flags = taskLog.checkCubeProgression(log);
  assert(flags.length === 0, `checkCubeProgression should be clean, got: ${JSON.stringify(flags)}`);
  assert(log.entries.length === 4, `expected 4 entries (propose+result per arm), got ${log.entries.length}`);
  const tasks = taskLog.projectTasks(log);
  assert(tasks.length === 2, `projectTasks should show 2 live tasks (one per arm), got ${tasks.length}`);
  assert(!JSON.stringify(log.entries).includes(cpuText) && !JSON.stringify(log.entries).includes(gpuText),
    "the ledger must never carry the full answer text — that lives in the results JSON, not a second copy on the log");

  // ── trazodone: new fixture, including the honest empty-ref open-gap turn
  const trazSummary = buildFold(FIXTURES.trazodone);
  assert(trazSummary.turnCount === 4, `expected 4 folded turns, got ${trazSummary.turnCount}`);
  assert(trazSummary.records.length === 4, `expected 4 warrant records, got ${trazSummary.records.length}`);
  const [r1, r2, r3, r4] = trazSummary.records;
  assert(r1.refs[0]?.startsWith("web:vcahospitals.com") && r2.refs[0]?.startsWith("web:vcahospitals.com"),
    "turns 1-2 should carry real VCA Hospitals refs");
  assert(r3.refs[0]?.startsWith("web:vetmedguide.com"), "turn 3 should carry a real VetMedGuide ref");
  assert(r4.refs.length === 0, "turn 4 (the actual probe topic) must carry NO ref — honestly nothing was found, never a fabricated one");
  assert(r4.open.length === 1 && /not addressed/.test(r4.open[0]),
    "turn 4 must disclose the gap in `open`, the same shape a production turn that came up short would use");

  const { gpu: trazGpuMessages } = armMessages(trazSummary, FIXTURES.trazodone.defaultProbe, NEUTRAL_BASE);
  const trazGpuSys = trazGpuMessages[0].content;
  assert(trazGpuSys.includes("left open:") && /not addressed/.test(trazGpuSys),
    "the GPU arm's record block should surface the disclosed gap, not silently drop it");

  // The exact live case this echo/novel split was built to fix (2026-08-19):
  // the real GPU arm answered "...VCA Hospitals, AKC, and VetMedGuide..." —
  // AKC is not in either passage's bytes, so checkGrounding alone flags it
  // as unsupported, but it IS in this arm's own record block (turn 4's open
  // line, asserted above) — a rephrase of what it was just handed, not an
  // invention. Pinned here as a regression, against the real trazGpuSys.
  const echoAnswer = "The information from VCA Hospitals, AKC, and VetMedGuide does not cover this.";
  const echoReport = groundingReport(echoAnswer, FIXTURES.trazodone, FIXTURES.trazodone.defaultProbe, trazGpuSys);
  assert(echoReport.claimingNothingBacks === 0,
    `"AKC" etc. are absent from the material but present in the arm's own given context, so none should count as novel — got ${echoReport.claimingNothingBacks}`);
  assert(echoReport.echoed.some((f) => f.text === "AKC"),
    `"AKC" should be classified as echoed, not silently dropped — got ${JSON.stringify(echoReport.echoed)}`);

  // A specific claim NONE of the three real sources make, and absent from
  // what the arm was given too (empty givenText here) — a genuine novelty,
  // not an echo — vs an answer built from what the sources actually say.
  const fabricated = groundingReport(
    "Trazodone should be given 3 hours before a vaccine appointment for best results.",
    FIXTURES.trazodone, FIXTURES.trazodone.defaultProbe,
  );
  const sourced = groundingReport(
    "Trazodone is used for anxiety around veterinary visits; it should be used with caution alongside SSRIs or MAO inhibitors.",
    FIXTURES.trazodone, FIXTURES.trazodone.defaultProbe,
  );
  assert(fabricated.claimingNothingBacks >= 1,
    "a specific dosing-interval claim no source makes, and not given to the model either, should count as novel and unsupported");
  assert(sourced.standingOnMaterial >= 1 && sourced.claimingNothingBacks === 0,
    "an answer built from what VCA Hospitals actually says should read as supported, not fabricated");

  console.log("self-test: all checks passed (no Ollama required).");
  console.log(`  cumberland fold: ${summary.turnCount} turns, ${summary.records.length} warrant records with real fixture refs`);
  console.log(`  trazodone fold: ${trazSummary.turnCount} turns, ${trazSummary.records.length} warrant records (3 real refs + 1 honest open gap)`);
  console.log(`  arm isolation confirmed on both fixtures: CPU sees System 1 only, GPU sees System 2 only`);
  console.log(`  placement classifier: cpu/gpu/split all exercised`);
  console.log(`  ledger: ${log.entries.length} entries, checkCubeProgression flags: ${flags.length}`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((err) => { console.error(err); process.exit(1); });
}

export { FIXTURES, buildFold, armMessages, checkPlacement, landArm, groundingReport };
