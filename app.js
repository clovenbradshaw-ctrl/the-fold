// app.js — the page. Everything here is wiring; the fold itself is fold.js and
// the addresses are source.js, both pure and both testable in node.
//
// The turn loop, in full:
//   1. retrieve material mechanically from the question's own terms
//   2. assemble ONE system message (base + PAST DISCOURSE + ON RECORD +
//      MATERIAL) plus the last two exchanges plus the question
//   3. stream the answer
//   4. check the answer's citations against the addresses it was actually
//      given, mechanically
//   5. fold the turn (System 1, mechanical) and record it (System 2, also
//      mechanical — every field is read off work step 4 already did)
//   6. one model call to refresh the running summary
//
// Two model calls per turn, both bounded, and neither one ever sees the
// transcript.
//
// The model lives in one place: Ollama on this machine. No credential, no
// hosted API, no request that leaves localhost — for the corpora this app is
// for, that is not a convenience but the arrangement. The network tab is the
// proof: everything the page loads and every call it makes names localhost.

import {
  MAX_FOLDS_IN_PROMPT,
  RECENCY_WINDOW,
  RECORD_OPEN_MAX,
  RECORD_REFS_MAX,
  FOLD_SCHEMA,
  FOLD_SYSTEM_PROMPT,
  addWarrantRecord,
  advanceSummaryFold,
  buildSummarySystemMessage,
  buildSummaryUpdatePrompt,
  buildWarrantRecord,
  emptySummary,
  extractSummaryFindings,
  mechanicalFoldLine,
  projectFolds,
  projectRecords,
  updateSummaryWithFold,
} from "./fold.js";

import { RENDERABLE, mergeHtmlScript, parseSegments, toDocument } from "./artifact.js";
// skills.js's balanced-object walk, reused as the one mechanical reading of
// "the JSON an ollama reply carried" (the delta grammar's extractor).
import { extractObject, createSkillLog, appendSkill, SKILL_ENTRY_KINDS, projectLibrary, skillDigest, claimSkill, fillSlots, checkSkillShape, scanBody } from "./skills.js";

// The Folds panel's pure half: search, the declared orderings, the compact
// list face, and the /fold door's mechanics — all testable in node, all
// walls; this file only draws what they return.
import { FOLD_SORTS, filterFolds, parseFoldCommand, pickRevisionSegment, sortFolds } from "./folds-pane.js";

import {
  ensureEditor,
  editorGet,
  editorSet,
  editorLanguage,
  editorLayout,
  editorFocus,
  editorOnChange,
  editorRunShortcut,
  colorizeCode,
} from "./editor.js";

import { NOTHING, buildTable, chartOf, detectChart, detectTable, toMarkdown } from "./tables.js";

// Arithmetic is computed, never generated — L5 at its smallest scale
// (measured live: qwen2.5:14b answered "17 times 24" as 372, not 408, and
// nothing caught it because nothing checked it). checkArithmetic takes the
// engine injected (the cast.js pattern) so this module stays pure; the page
// hands it window.math, the vendored mathjs UMD bundle (index.html — must
// load before monaco's loader.js, see that file's comment).
// checkQuantity (P115): the pure door first, byte-identical, then the shaped
// questions (units, choose, statistics, derivative, an equation) and the
// calendar — each computed by the engine's own operation, never restated.
import { checkQuantity } from "./arithmetic.js";

// KaTeX, vendored per P1 (index.html links its CSS), renders arithmetic's
// computed expression as typeset math — mathjs's own toTex(), not a second,
// hand-typed notion of how the expression looks.
import katex from "/node_modules/katex/dist/katex.mjs";

import { checkGrounding, unsupportedClaims, extractCheckableAtoms } from "./grounding.js";

import { attribute, attributedRefs, stripSelfCitations } from "./cite.js";

import { MAX_CORRECTIONS, needsDecomposition, PASSAGES_PER_PART, runHolonicTask, SEARCHED_VOID_PREFIX, S1_SYSTEM_PROMPT, buildPlanPrompt, parsePlan, PLAN_SCHEMA, PLAN_MAX_TOKENS, PLAN_SYSTEM_PROMPT, depthBudgets } from "./holon.js";

import { MODEL_PICKER, ROUTE_KINDS, routeModel, S1_MODEL, S2_MODEL, resolveNamedModel, isPinnedModel } from "./model-routing.js";

import { renderBlocksInto } from "./render.js";

import { autoRunnable, initTerminal, KEEP_PER_EXEC, parseRunCommand, ROSTER, runSandboxed } from "./term.js";
// The in-tab rung (P21's WebLLM rung, wired into the page 2026-09-05 — its
// modules and tests had shipped unwired). The decisions are webllm-rung.js's;
// webllm-client.js is the worker + the streaming call; the roster is three
// models chosen for what their publishers disclose about the training data.
import { WEBLLM_MODELS, isWebLLMModel, webllmModelOf, webllmLabelFor, mergeOffered, webgpuBlocker } from "./webllm-rung.js";
import { webllmClient } from "./webllm-client.js";
// The three homes (P118): where the page is and what it can reach are probed
// at boot and said once; /routes prints the table. routes.js decides and
// phrases; the probes below are the only calls, every one localhost or
// same-origin.
import { whereAmI, describeRoutes } from "./routes.js";
// The room (P119): preserve a chat, share it, and borrow a mouth on another
// machine through a Matrix homeserver the person names — every byte that
// leaves this page for it sealed under a key the homeserver never holds.
import { FoldMatrix, localStorageStorage, MatrixError } from "./matrix-client.js";
import { parseShareLink, stripShareFragment, SERVER_SEES, MAGIC_KEY_WARNING, deviceContent, deviceLine } from "./matrix.js";

import { makeGrid } from "./grid.js";
import { findCapacity, listCapacities, unresolvedCapacity } from "../eoreader7/native/organs/index.js";
import { makeCapacityRunner, landAct, perSourceReadings, mergeTestimony, landContest, makeDerivation } from "../eoreader7/native/organs/index.js";
// The measuring door (P19), routed from the chat since 2026-09-05: the organ
// is eoreader7's measure.js (the-fold/measure.js is its shim); the null is
// the engine's own /nul mount; the audio reduce is the crossed pure half.
import { parseMeasure, runMeasurement, sniffContainer, MEASURE_phrase as measurePhrase, usage as measureUsage } from "../eoreader7/native/organs/index.js";
import * as nul from "/nul/index.js";
import { reduce as audioReduce } from "../eoreader7/native/adapters/audio/reduce.js";
// The declarations register (Pass 21, P102): what a person has DECLARED
// about a relation — transitive, or composing into a named product — each
// with its giver. Chemistry comes from this register and nowhere else
// (derivation.js), so a derived fact always names who licensed it.
import { createDeclarationLog, proposeCandidate as proposeDeclaration, promote as promoteDeclaration, foldDeclarations } from "/engine-v7/interpretation/declarations.js";
import { renderCrown } from "./crown.js";

import { transcribeBlob, fetchAudioFromUrl, WHISPER_DISCLOSURE } from "./transcribe.js";
import { logTranscriptionLayer } from "./transcribe-log.js";

import { openInExplore, refContext } from "./explore-bridge.js";

import { classifySentences } from "./provenance.js";

import { emptyPaceLog, recordCall, foldPace, predictCall } from "./pace.js";

import { persistSource, unpersistSource, loadSources } from "./sources-store.js";
// One durable reading record (Pass 17, P98): the three kernel logs this app
// holds persist to OPFS as append-only JSONL and replay on boot through the
// kernel's own `append`, so the accumulated reading no longer ends at reload.
import { serializeRecord, replayRecord } from "./record-log.js";
import { appendRecord, loadRecord } from "./record-store.js";
import { mergeAppendOnly } from "./record-log.js";
import { updateSourceMeta } from "./sources-store.js";
// Read when material arrives (Pass 18, P99): the reader loop and the typed
// unread extent a question asked mid-read is told about.
import { readOnArrival, unreadExtent } from "./read-on-arrival.js";
// The AnswerRecord (Pass 19, P100): one per turn, persisted append-only,
// shown first in the thinking panel — what was handed, what was said, what
// nothing backs, and the reader's identity.
import { detectLongForm, longFormTask, PART_TOKENS as LONGFORM_PART_TOKENS, WORDS_PER_SECTION as LONGFORM_WORDS_PER_SECTION, detectCodePiece, isCodeSource, inScope, headingsOf } from "./longform.js";
import { declaredReferents } from "./code-scout.js";
import { CODE_RUNTIMES, skeletonFor, snipFor, spliceFunction, failingFunction, modelShare, stepWitnesses, stubMissing, modelRegions, didYouMean, renameCalls, qualifyCalls, moduleProbe, importedModules } from "./code-piece.js";
import { editLine } from "./piece-edit.js";
import { revisionLine } from "./piece-revise.js";
import { exportPiece } from "./piece-export.js";
import { groundOf, groundLine } from "./ground-ladder.js";
import { answerRecord, answerRecordLine, voidInScope } from "./answer-record.js";

// The self plane: the instrument's own acts as an append-only, addressed
// ledger, and its measured surprise — held apart from the material at the
// namespace, the store, the prompt block, and the record (reflex.js says
// how). The surprise meter is the engine's own tier stack, injected below.
import {
  buildSelfBlock,
  detectReflex,
  emptyReflexLog,
  isReservedSourceName,
  isSelfRef,
  ledgerChunks,
  makeReflexMeter,
  normalizeSelfLevel,
  recallTable,
  recordAct,
  resolveOrdinalRecall,
  selfOverview,
  selfRefContext,
} from "./reflex.js";

// S1's own ground, measured — the same tier-stack organ above, pointed at
// the conversation's own discourse instead of the instrument's acts. A
// second meter, never a second plane: aperture.js's header says why this
// cannot share reflexMeter's instance. exchangeHeldGround is the summary
// refresh's gate — the engine's own "the ground did not change" verdict.
// regimeAfter/presentWindow are the startle posture: surprise consumed as
// a contraction of the raw present, registered on the ledger, drawn
// nowhere (aperture.js's regime block says why).
import { exchangeHeldGround, makeApertureMeter, presentWindow, regimeAfter } from "./aperture.js";

// The reading engine's own segment organ, served from /engine (see serve.mjs).
// Boundaries are found by form there and received here — this app does not
// know what a chapter is and must not learn.
import { lineIndex, outlineOfIndex } from "/engine-v7/adapters/text/segments.js";

// The engine's referent organs, same mount: names in a check resolve against
// the cast the material itself establishes — a name is a reference to a
// referent, not a byte sequence, and the engine owns what "the same name"
// means. cast.js injects these so it stays pure and node-testable.
import { splitSentences as engineSentences } from "/engine-v7/adapters/text/spans.js";
import { createLemmatizer as nativeLemmatizer, morphologyFromPrior } from "/engine-v7/adapters/text/morphology.js";
// blankLabelRows never existed on this path (or anywhere in the frozen
// provider — it was a link-time error waiting to happen). It is now
// source.js's own blankLabelRows, a the-fold concern (Wikipedia infobox
// furniture, never an engine notion) — imported below alongside this
// file's other source.js symbols and bound with declared numbers at the
// hypergraph.js injection site.
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "/engine-v7/adapters/text/surfaces.js";
import { resolvePronouns } from "/engine-v7/adapters/text/pronouns.js";
import { makeCastResolver, makeCastHandles, makeReferentIndex } from "./cast.js";

// The relation tier — the answer read against the edges the material itself
// binds (hypergraph.js; the P12 amendment). Same mount, same injection
// pattern: the engine's relation organs arrive as arguments and the module
// stays pure and node-testable.
// NOT material.js: it imports "fs" at top level (Node-only load()), and this
// page has no bundler to stub it — the tokenizer the reader needs is this
// repo's own folded one (source.js), which is also the fold retrieval and
// commonTerms already share, so the closed-class measure and the corpus's
// own term sets stay one alphabet.
import { discoverRelationVocab, extractRelations } from "/engine-v7/adapters/text/relations.js";
import { makeRelationReader } from "./hypergraph.js";
import { corroborateAtoms, CLAIM_STOPWORDS } from "./grounding.js";

// Proof-seeking: a flagged claim taken to the world through the one
// sanctioned egress (P13, explore-server's /api/web/*). proof.js is the
// pure half — queries from the claim's own words, verdicts as counted
// perspectives; this page only carries bytes between the two.
import {
  PROOF_PAGES_CONSULTED,
  PROOF_TARGETS_PER_TURN,
  PREFLIGHT_PAGES_CONSULTED,
  assessPage,
  foldProof,
  preflightQuery,
  proofQuery,
  proofTargets,
  rankResults,
  shouldPreflight,
} from "./proof.js";
import { extractUrls, hostOf, pageFaceUrl } from "./web.js";
import { snipClaim } from "./primary.js";
import { dayOf, renderHolders } from "./wikidata.js";

// WHAT WE HAVE READ, AS A SECOND GIVER (P57/P58/P59). `seek.js` is
// source-independent and `wikidata.js` was its only adapter, so a question the
// published record cannot answer went unanswered even when a page stating the
// answer plainly was already fetched and already saved. `network.js` binds the
// record blocks a Link-grain extractor structurally cannot see; `read-source.js`
// presents them through the same four questions the Wikidata walk uses.
import { makeNetworkBinder, extentShape, surfaceShape } from "./network.js";
import { makeReadSource } from "./read-source.js";
import { seekBindings } from "./seek.js";
import { createClaimLedger, claimKey, composedSentence } from "./claims.js";
import { WITNESS_SCHEMA, SELECT_SCHEMA, buildWitnessMessages, buildSelectMessages, foldSelect, foldTestimony, readTestimony, siblingSwap, witnessSlice, witnessSentences } from "../eoreader7/native/organs/index.js";
import { corroborateLedger, witnessNote } from "../eoreader7/native/organs/index.js";
import { corroborationLines } from "./corroboration-report.js";
import { readerFrame as frameOfReader } from "./reader-frame.js";
import { admitObligations, mark as markObligation, coverage as obligationCoverage, standings as obligationStandings } from "../eoreader7/native/organs/index.js";
import { lastOpened, restoreFor, renderDoor } from "./reopen.js";
import { EXPLORE_BASE } from "./explore-bridge.js";
// Zeroing the space (void-shape.js / void-brief.js): what shape does this
// question's answer have to fill, and what part of it is still empty. Both
// take their organs injected — the cube's algebra and web-claim.js's slot
// reader — so neither carries a second copy of either.
import { briefFor, observedFillers } from "./void-brief.js";
// The same declaration, said out loud while it is being made rather than
// filed as a receipt afterward (void-narration.js's own header carries the
// full account of what was wrong with the receipt).
import { narrateVoid, noSlotLine } from "./void-narration.js";
import { declaredSlotShape } from "./web-claim.js";
import { cellOf, GRAINS, TERRAIN_BY_DOMAIN, isCurrentOperator } from "/engine-v7/kernel/cube.js";
// The typed-note ledger (hyperlexicon.js, P57): the notes a turn's own
// relation reading admits, corroborated across turns by the same cell the
// cube derives. `adaptTaskLog` reconciles native's ordinal GRAINS with the
// GRAIN_RANK shape hyperlexicon.js reads — the same adapter this repo's own
// hyperlexicon-stance.test.mjs already exercises, reused rather than a
// second reconciliation.
import * as nativeTaskLog from "/engine-v7/kernel/task-log.js";
import { adaptTaskLog } from "./consequence.js";
import { makeHyperlexicon } from "./hyperlexicon.js";
import { depthLine, DEPTH_NAMES } from "./depth.js";
// The watcher over the gap between S1 (runFastPass) and S2 (holonicTurn) —
// metacognition.js, P72. Same taskLog bundle as buildLog/store/grid below,
// same "one implementation, injected everywhere" posture.
import { assessAgreement, escalationFor, forcesFoldRefresh, makeHuntMeter, makeMetacognition } from "./metacognition.js";
// The completeness gate's own confirmed set (succession.js), re-shaped as
// real fillers void-brief.js's `fillersFor` can `fill()` a space with — see
// the `briefFor` call site below. One confirmed set, two consumers: this is
// NOT a second discovery pass alongside holon.js's own.
import { successionFillers } from "./succession.js";

// The engine's surprise ladder — the measured answer to "what is most
// surprising", and the only licensed one. Same mount, plus /nul for the
// null module tiers.js stands on (serve.mjs carries both). Deliberately
// NOT crossed to /engine-v7 in the ratchet pass that moved everything else
// below off this mount (2026-08-29): tiers.js stands on emergence/surprise.js
// stands on nul/index.js — 1,306 lines of the engine's whole statistics/
// perturbation subsystem (the LICENSED table, ~20 typed gap types) — and
// native has no equivalent. dynamics.js::deriveSurprise is not a substitute;
// it is a structurally different mechanism (delta/operation-based, not the
// Bayesian tier-stack the self plane, reflex.js/aperture.js, is built on).
// Porting that faithfully is its own measured pass, not a rider on this one.
// This is the one remaining legacy crossing on this page, disclosed rather
// than silently ported shallow or silently left unexplained.
import { createTierStack, foldThrough } from "/engine/emergence/tiers.js";

// The task log — build-log.js, store.js and grid.js (the terminal language,
// P22) all thread onto ONE log, with EO notation on the constitutive
// entries. Crossed to eoreader7's native kernel in the same ratchet pass
// (2026-08-29) that ported checkCubeProgression/isCurrentOperator into
// kernel/task-log.js and kernel/cube.js — nativeTaskLog (imported above,
// for hyperlexiconFor) is now the ONE task-log implementation this page
// carries, where it used to carry two (this file's own CLAUDE.md, "The
// terminal language" section, already named the drift class this was:
// P22's Array.find/String.includes, P24's runtime ternary). TERRAIN_BY_DOMAIN
// and isCurrentOperator (imported above, alongside cellOf/GRAINS) are the
// two symbols grid.js needs from the operator algebra; both now live on
// native's own cube.js rather than a second operators.js import.
import { makeBuildLog } from "./build-log.js";
// The database fold (P25): store.js's event-sourced row store, the SAME
// task log injected the SAME way buildLog is above — a database fold's log
// is not a second kind of log, it is this module's kind, used for a
// different domain (rows, not code revisions).
import { makeStore } from "./store.js";

const buildLog = makeBuildLog(nativeTaskLog);
const store = makeStore(nativeTaskLog);
const grid = makeGrid({ operators: { TERRAIN_BY_DOMAIN, isCurrentOperator }, taskLog: nativeTaskLog });
grid.withCapacities({ findCapacity, unresolvedCapacity });
const metaLedger = makeMetacognition(nativeTaskLog);

// ── the durable record: three logs, one mechanism ─────────────────────────
// `syncRecords()` appends to OPFS every entry whose seq is beyond what was
// last persisted, per log — O(new entries), never a rewrite (record-store.js
// seeks to the end). Called after every site that assigns one of the three
// logs; fire-and-forget, a failure is a console line, never a broken turn.
// Boot replays the three files through `replayRecord` (record-log.js) into
// the SAME kernel shape the live code appends to, and a hole or a bad line is
// a typed gap logged by name, never a silently shorter reading.
const RECORDS = { hyperlexicon: 0, grid: 0, meta: 0, declarations: 0 };
let recordSyncChain = Promise.resolve();
function syncRecords() {
  // The range to append is computed WHEN THE JOB RUNS, after the previous
  // job has advanced the cursor — not when syncRecords is called. The first
  // cut serialized at call time, so two calls issued before the first append
  // finished both captured the same seqs and the file held a duplicated
  // stretch; replay reported it as a typed `record_gap` at line 703, which
  // is how it was found (P99). The log itself is read at run time too, so a
  // job appends whatever the app holds by then, never a stale snapshot.
  const job = async () => {
    for (const [name, get] of [["hyperlexicon", () => state.hyperlexiconLog], ["grid", () => state.gridLog], ["meta", () => state.metaLedger], ["declarations", () => state.declarations]]) {
      const log = get();
      if (!log || !Array.isArray(log.entries)) continue;
      const lines = serializeRecord(log, RECORDS[name]);
      if (!lines.length) continue;
      const upto = log.nextSeq;
      const r = await appendRecord(name, lines);
      if (r.appended === lines.length) RECORDS[name] = upto;
    }
  };
  recordSyncChain = recordSyncChain.then(job).catch((e) => console.warn("record sync:", e?.message ?? e));
  return recordSyncChain;
}
// ── read when material arrives (Pass 18, P99) ────────────────────────────
// One read per source, ordered, resumable, one passage per macrotask so a
// long book never freezes the page. The reader is the production one
// (`relationsFor`, its pool the source's own passages); the door, frame and
// recipe are the same a turn uses; each passage builds on the ledger OF THE
// MOMENT (`ledgerRef`) so a turn landing mid-read is never overwritten. The
// cursor (passages admitted under this recipe) persists in the source's own
// index row; a reload resumes from it, and a reader whose recipe changed
// reads again under its own witness string (a second instrument, P68).
const READING = new Map(); // name → { cursor, total, recipe, running }
const yieldMacrotask = (() => {
  if (typeof MessageChannel === "undefined") return () => new Promise((r) => setTimeout(r));
  const ch = new MessageChannel();
  const waiters = [];
  ch.port1.onmessage = () => { const w = waiters.shift(); if (w) w(); };
  return () => new Promise((r) => { waiters.push(r); ch.port2.postMessage(null); });
})();
let readQueue = Promise.resolve();
function unreadNow() {
  return [...READING.entries()].filter(([, r]) => !r.skipped).map(([name, r]) => unreadExtent({ name, cursor: r.cursor, total: r.total })).filter(Boolean);
}
function readSourceOnArrival(name, { savedCursor = 0, savedRecipe = null } = {}) {
  readQueue = readQueue.then(async () => {
    await priorsSettled();
    const passages = state.chunks.filter((c) => c.source === name);
    if (!passages.length || !state.sources[name]) return;
    // A code file is not prose (P113): retrievable, runnable, scouted for
    // its declarations — never read into the ledger as English. The skip is
    // typed on the reading map, not silent, and it is not an unread extent.
    if (isCodeSource(name)) { READING.set(name, { cursor: 0, total: passages.length, recipe: null, running: false, skipped: "code" }); return; }
    const frame = readerFrame();
    const recipe = await readerRecipe(frame);
    const cursor = savedRecipe === recipe ? savedCursor : 0;
    if (savedRecipe && savedRecipe !== recipe && savedCursor > 0) console.info(`read on arrival: ${name} was read under recipe ${String(savedRecipe).slice(0, 12)}; the reader's recipe is now ${recipe.slice(0, 12)} — reading again as a second instrument`);
    READING.set(name, { cursor, total: passages.length, recipe, running: true });
    let lastSync = 0;
    const r = await readOnArrival({
      name, passages, relationsFor, hyperlexicon: hyperlexiconFor,
      ledgerRef: { get: () => state.hyperlexiconLog, set: (log) => { state.hyperlexiconLog = log; } },
      frame, recipe, classifyConnector: state.grounded ? connectorLens : null, cursor,
      // A MessageChannel macrotask, not setTimeout: a hidden tab clamps
      // timers to ~1/s (and to 1/min after five minutes), which turned a
      // 44-passage read into a crawl the first time this ran live. Message
      // events are not clamped, and the page still repaints between them.
      yieldFn: yieldMacrotask,
      onProgress: (p) => {
        READING.set(name, { cursor: p.read, total: p.total, recipe, running: p.read < p.total });
        if (p.read - lastSync >= 25 || p.read === p.total) { lastSync = p.read; syncRecords(); updateSourceMeta(name, { readCursor: p.read, readRecipe: recipe }); }
        if (p.read % 10 === 0 || p.read === p.total) $("status").textContent = `reading ${name} · ${p.read}/${p.total}`;
      },
    });
    READING.set(name, { cursor: r.cursor, total: passages.length, recipe, running: false });
    if (r.read) {
      syncRecords();
      updateSourceMeta(name, { readCursor: r.cursor, readRecipe: recipe, readMs: r.ms, readHeard: r.heard, readTurnedAway: r.turnedAway.length });
      console.info(`read on arrival: ${name} — ${r.read} passage(s) in ${r.ms} ms, ${r.heard} note(s) heard, ${r.turnedAway.length} turned away${r.resumed ? " (resumed)" : ""}`);
    }
    if (state.ready) $("status").textContent = readyLine();
  }).catch((e) => console.warn(`read on arrival: ${name}:`, e?.message ?? e));
  return readQueue;
}

async function restoreRecords() {
  const bundle = { createTaskLog: nativeTaskLog.createTaskLog, append: nativeTaskLog.append };
  const restored = {};
  for (const [name, admits] of [["hyperlexicon", null], ["grid", state.gridLog?.admits ?? null], ["meta", state.metaLedger?.admits ?? null], ["declarations", state.declarations?.admits ?? null]]) {
    const lines = await loadRecord(name);
    if (!lines.length) continue;
    const r = replayRecord(lines, { ...bundle, admits });
    if (r.gap) console.warn(`record ${name}: ${r.gap.type} — ${r.gap.detail} (${r.replayed} replayed, the rest not read)`);
    if (r.replayed) { restored[name] = r.log; RECORDS[name] = r.log.nextSeq; }
  }
  return restored;
}

// The widget router (widget.js): does a code-bearing turn point at a build
// that already exists, or introduce a new one? Decided from the operator's
// own words and the engine's closed classes (perceiver/text/priors.js) —
// same injection pattern as buildLog above, so this stays node-testable
// against the real register (widget.test.mjs).
import * as enginePriors from "/engine-v7/adapters/text/priors.js";
// classifyWord/dominantClass over the SAME real UD-treebank POS prior
// hypergraph.js's own posPriorFor() already loads (posPriorCache, below) —
// used here for exactly one question, "is this token an adposition"
// (of/in/for/at/…), so declaredSlotShape's anchor recovery generalizes past
// a single hardcoded preposition without a second word list.
import { classifyWord, dominantClass, POS_PRIOR_META, THRAX_META } from "/engine-v7/adapters/text/wordclass.js";
// The connector lens (grammar-lens.js) the hyperlexicon door's own
// classifyConnector gate consumes — built below, data-gated on the same
// posPriorCache fetch, threaded through runHolonicTask (P73).
import { makeGrammarLens } from "./grammar-lens.js";
import { literalSwap, makeWidgetRouter, scoutSpan } from "./widget.js";
import { witnessCode, witnessRegressed } from "./witness.js";
import { buildAsk, archetypeOf, parseIngestCommand, INGEST_EXTS } from "./seed.js";

const widgetRouter = makeWidgetRouter(enginePriors);

// The languages a seed scrub or an ingest can keep as folds — seed.js's own
// technical vocabulary (extension map), read as a token set. Not a word
// list: these are fence-tag/extension names, the same closed set the
// download namer writes with.
const SEED_LANGS = new Set([...Object.keys(INGEST_EXTS), ...Object.values(INGEST_EXTS)]);

import {
  BOUND_SYSTEM_PROMPT,
  buildBoundPrompt,
  buildBoundSchema,
  extractCells,
  flattenBound,
  parseBound,
} from "./bound.js";

// blankFurniture, here too (2026-09-04): cast.js reads a passage's
// page-scoped `.blanked` copy ONLY when this caller opts in by passing the
// organ — the SAME "reader's own organ is authoritative" rule
// hypergraph.js's `readSentenceText` already enforces (source-page-
// blanking.test.mjs: "a reader that never asked for blanking does not get
// it from the chunker"). Declared identically to `relationsFor`'s own
// blankFurniture further down, so the two never silently disagree about
// what counts as furniture.
const castBlankFurniture = (text) => blankLabelRows(text, { minRun: 4, maxCell: 60 });

const castFor = makeCastResolver({
  splitSentences: engineSentences,
  extractSurfaces,
  discoverReferents,
  namesCorefer,
  diaNorm,
  blankFurniture: castBlankFurniture,
});

// Same organ bundle as castFor above, one level less collapsed — the
// referent INDEX itself (identities, not a boolean), which is what
// capacity-runner.js's one wired capacity (`cast`) needs. One
// implementation of "the same name" either way; no second discovery pass.
const referentIndexFor = makeReferentIndex({
  splitSentences: engineSentences,
  extractSurfaces,
  discoverReferents,
  namesCorefer,
  diaNorm,
  blankFurniture: castBlankFurniture,
});
// `skillLibrary`/`callModel`/`relationsFor` are live accessors, not values
// captured now — `state`, `complete`, and `relationsFor` itself are all
// declared LATER in this module (`state` a plain const, `complete` a
// hoisted function declaration, `relationsFor` a `const` further down),
// safe to close over here because none of these arrows run until an
// actual capacity call, well after module evaluation finishes (B.3, SPEC
// v2) — the same TDZ-avoidance this object already relied on for
// `callModel`/`skillLibrary`, extended to `relations` (2026-08-19, the
// second capacity to actually execute).
const runCapacity = makeCapacityRunner({
  referentIndexFor,
  relationsFor: (...args) => relationsFor(...args),
  witnessCode,
  claimSkill,
  fillSlots,
  skillLibrary: () => projectLibrary(state.skillLog),
  callModel: (messages, opts) => complete(messages, opts),
});

const handlesFor = makeCastHandles({
  splitSentences: engineSentences,
  extractSurfaces,
  discoverReferents,
  blankFurniture: castBlankFurniture,
});

// POSPrior@1 — real Universal Dependencies treebank evidence
// (eoreader6.1/scripts/build-pos-prior.mjs's own output, served live off
// its own gitignored, locally-reproducible build directory via serve.mjs/
// explore-server.mjs's /priors-data/ mount — never vendored into this
// repo, so a rebuilt prior is picked up with no stale copy). Fetched once,
// NON-BLOCKING: the feature it enables (hypergraph.js's per-edge `grammar`
// disclosure) is purely additive and degrades to today's behavior when
// this hasn't resolved yet, or the file was never built locally on this
// machine — so nothing here may delay boot on it. Read through a zero-arg
// accessor, the same lazy pattern this file already uses for
// relationsFor/skillLibrary/callModel below, because the value is not
// stable at construction time the way a synchronous organ is.
let posPriorCache = null;

// UniMorph verb surface forms (UniMorph/eng, a RECEIVED lexicon with its own
// giver — eval/fixtures/unimorph-eng-verb-forms.json, 103,318 forms). Wired
// live 2026-09-01; the open question CLAUDE.md left standing for this organ
// ("whether the live app should load either prior by default remains a real,
// undecided question") is answered here for verbForms ALONE, on a live
// measurement rather than on MINE-1's corpus result:
//
//   Asked "what are the two methods of curing the mischiefs of faction"
//   against the real Federalist Papers, through this page's OWN organ bundle
//   (POS prior included), the relation reader bound exactly ONE edge — "the
//   American —constitutions→ on the popular models", junk — so the notes
//   block the model is shown carried one useless line and the hypergraph
//   contributed nothing to the answer at all. With this Set injected and
//   nothing else changed: 40 edges, including "are two —methods→ of curing
//   the mischiefs of faction" and "by —removing→ its causes" — the
//   enumeration that actually answers the question.
//
// WHY IT IS THE ORGAN THAT MATTERS HERE, stated so the next pass does not
// re-derive it: `discoverRelationVocab` nominates candidate verbs anchored on
// capitalised surfaces, and a concept essay has almost none — the same
// "concept documents starve the cast ladder" failure host/terrains.js already
// records for SEED-SPEAKER.md, one tier over. A received lexicon needs no
// anchor: it answers a direct per-word question instead of nominating
// candidates near one.
//
// THE DISCLOSED COST, not smoothed over: MINE-1's own hand spot-check found
// roughly half of recovered triples carry a subject/verb boundary error
// (English noun-verb conversion means "feed"/"play"/"serve" are tagged both),
// and this specimen shows the same ("a factious —spirit→ has tainted our").
// Shipped anyway because the alternative measured here is not "cleaner
// edges", it is ONE junk edge — a boundary-imperfect reading of the right
// sentence beats a clean reading of nothing.
//
// A MUTATED Set, not a re-assigned one: `makeRelationReader` destructures
// `verbForms` at factory time (hypergraph.js:783) but only ever reads it
// through `.has()` at extraction time (hypergraph.js:1088), so filling this
// same object after the fetch resolves is picked up with no re-construction.
// Empty until then — and an empty Set adds no words, which is byte-identical
// to today's behaviour, so nothing here may delay boot either.
// The received priors arrive after boot. A read on arrival waits for them
// (`priorsSettled`) so the recipe it reads under is the reader's settled
// configuration, not a boot-time frame that would differ on the next load.
const PRIOR_LOADS = [];
const priorsSettled = () => Promise.allSettled(PRIOR_LOADS);
const unimorphVerbForms = new Set();
PRIOR_LOADS.push(fetch("/eoreader7/native/eval/the-fold/fixtures/unimorph-eng-verb-forms.json") // moved with eval/ (Phase 2); the old path 404ed silently and the widening below had been dead since
  .then((r) => (r.ok ? r.json() : null))
  .then((forms) => { if (Array.isArray(forms)) for (const f of forms) unimorphVerbForms.add(f); })
  .catch(() => {}));

// The door's grammar gate is DATA-GATED, never code-gated (P73): the lens
// exists only once the POS prior actually loads, so a checkout without
// priors-data/ runs byte-identically to before the gate existed — a check
// whose data layer is absent never runs, and never reports a pass (P41).
// The prior itself ships in the repo now (priors-data/pos-prior-eng.json —
// UD_English-EWT, CC BY-SA 4.0, built by the engine's own
// scripts/build-pos-prior.mjs; givers ride every classification via
// POS_PRIOR_META/THRAX_META).
let connectorLens = null;
PRIOR_LOADS.push(fetch("/priors-data/pos-prior-eng.json")
  .then((r) => (r.ok ? r.json() : null))
  .then((j) => {
    posPriorCache = j;
    if (j) connectorLens = makeGrammarLens({ classifyWord, dominantClass, posPrior: j, posPriorMeta: POS_PRIOR_META, thraxMeta: THRAX_META });
    // S50 (eoreader7): the POS prior's verb-dominant forms join the verb
    // vocabulary beside UniMorph's — UniMorph English is a 10k-form sample
    // that lacks "placed", "retrieved", "launched"; UD English-EWT attests
    // them. The share floor is the app's own consumer contract
    // (dominantClass, minShare 0.5 — the same floor connectorLens uses),
    // never a second number. Same MUTATED Set as below, same reason.
    if (j?.forms) for (const w of Object.keys(j.forms)) { const d = dominantClass(classifyWord(w, { posPrior: j }), { minShare: 0.5 }); if (d && (d.upos === "VERB" || d.upos === "AUX")) unimorphVerbForms.add(w.toLowerCase()); }
  })
  .catch(() => {}));

// The relation reader's factory — one per passage set, pool = the live
// corpus (the closed-class measure needs the corpus's scale, not the
// turn's; hypergraph.js says why).
// The options object is NAMED so the reader's frame (reader-frame.js, P90)
// is derived from the very object the reader was built with — every key here
// reaches the ledger's frame and its recipe id without a second declaration.
const RELATION_READER_OPTIONS = {
  splitSentences: engineSentences,
  extractSurfaces,
  discoverReferents,
  namesCorefer,
  diaNorm,
  discoverRelationVocab,
  extractRelations,
  tokenize,
  // TWO POS MECHANISMS, ONE FIXTURE — KEPT APART DELIBERATELY. This one is
  // the TYPE-level vocabulary gate (hypergraph.js:1010/:1035 →
  // `discoverRelationVocab`'s own `posPrior`): a majority vote over the real
  // UD treebank on whether a word FORM is ever a verb, with unattested forms
  // explicitly not refused ("a witness cannot refuse what it never saw").
  // The per-OCCURRENCE mechanism is `classifyConnector` (passed in where the
  // reader is built per turn), which stays disclosure-only and convicts
  // nothing — P56's asymmetric rule governs THAT one, not this one. Same
  // distinction live_priors' own `scripts/eot-digest.mjs::loadOrgans` draws
  // at length, in the sidecar pipeline that reads the whole corpus.
  //
  // THIS WAS REMOVED AND PUT BACK THE SAME DAY, so the next pass does not
  // remove it again on the same reasoning. It was dropped on the measurement
  // that the live reader bound ONE edge on a real Federalist question — but
  // that collapse was VOCABULARY STARVATION, not the gate: a concept essay
  // has almost no capitalised surfaces, so `discoverRelationVocab` nominates
  // almost nothing and the gate then removes the prepositions that were all
  // that remained. `unimorphVerbForms` above fixes the starvation at its
  // source, and with it in place the gate is purely beneficial. Measured on
  // the same three retrieved passages, both arms carrying UniMorph:
  //
  //   gate OFF — 118 edges, 103 of them (87%) with a pure function-word
  //              connector (of/the/to/and), 15 real
  //   gate ON  —  40 edges,   0 (0%) function-word connectors, 40 real,
  //              and still carrying the two the answer needs
  //              ("are two —methods→ of curing the mischiefs of faction",
  //               "by —removing→ its causes")
  //
  // Removing it re-admits exactly the junk this session started by
  // complaining about. P5.5, in this repo's own words: when a result
  // surprises you, check the driver before the theory.
  posPriorFor: () => posPriorCache,
  // See `unimorphVerbForms`' own block above for the live measurement that
  // decided this (1 edge → 40 on the specimen), and for the disclosed
  // boundary-quality cost it is shipped in spite of.
  verbForms: unimorphVerbForms,
  // The SAME received set as the gate on an out-of-vocabulary connector
  // (hypergraph.js `oovLexicon`): measured 2026-09-02 on the real two-page
  // ledger, junk labels 12 → 3 ('nobility', 'aristocratic', Cyrillic 'и'
  // refused; 'left'/'redoubt' survive because UniMorph lists them as verb
  // forms). Kept apart from the widening above in hypergraph.js because
  // as a WIDENER the set added 98 noun-verb-conversion notes.
  oovLexicon: unimorphVerbForms,
  // DR4: a subject expands left through its own determiner and genitive
  // chain ("The Battle of Moscow", not "of Moscow"). Measured on the same
  // ledger: preposition-led subjects 6 → 1. The extractor's own option,
  // forwarded on every read (material and answer side) since 9ea3c30.
  nounPhraseSubjects: true,
  // S50 (eoreader7): "the hypergraph should be this rich ALWAYS" (user,
  // 2026-09-02). The auxiliary chain rides in the act (DR5), a form a
  // received prior attests as a verb is an act on its first arrival, and
  // acts compare by lemma. The lemmatizer organ is the same one
  // sameFormOrgan below loads; hypergraph.js builds sameAct once at
  // factory time, so this wrapper defers to whatever is loaded when a
  // comparison is actually made — exact match until the prior arrives,
  // byte-identical to before, no boot delay.
  phrasalPredicates: true,
  attestedVerbs: true,
  // P36's object-specificity rule, at the reader (Pass 19, P100): a draft
  // claim binds only to an edge that states EVERY content token of its
  // object — the product assay's wall 6 ("the Royal Society in 1887" bound
  // on `in 1887` alone) closed where every consumer of this reader inherits
  // it: the draft checker, the arrival read, the assay.
  objectSpecificity: true,
  createLemmatizer: () => ({ sameAct: (a, b) => (sameFormOrgan ? sameFormOrgan(a, b) : String(a).toLowerCase() === String(b).toLowerCase()) }),
  morphologyIndex: {},
  // Two RECEIVED closed classes, both from the engine's own prior register
  // (perceiver/text/priors.js, giver "lang/en" — the same `enginePriors`
  // namespace this file already imports), turned ON here rather than left
  // opt-in, because each closes a measured FALSE BINDING in the live app
  // rather than merely widening what the reader hears (POLICIES.md P41/P42):
  //
  //   determiners   — without it, `endpointsMatch`'s `tokensShare` fallback
  //                   binds on a shared definite article alone whenever the
  //                   corpus sits under commonTerms' own CORPUS_MINIMUM
  //                   floor, which a turn's retrieved passages routinely do.
  //                   Measured: "Seward negotiated the Suez canal" bound
  //                   against material stating only "…the Alaska purchase";
  //                   the same claim without "the" did not.
  //   negationWords — without it, a negation the extractor put inside the
  //                   OBJECT span (rather than before the verb, its own
  //                   `negationBeforeVerbFor` gate) leaves polarity unread on
  //                   both sides. Measured: "Lincoln did dismiss Seward"
  //                   bound, cited to the passage that says he did NOT.
  //
  // Both are strictly conservative — they only ever turn a binding into a
  // typed `beyond-reach`/`unbound`, never the reverse — and neither can
  // manufacture a finding against an answer (beyond-reach stays off the
  // unsupported list by relationFindings' own standing rule).
  determiners: new Set([...enginePriors.DEFINITE_DETERMINERS, ...enginePriors.INDEFINITE_DETERMINERS]),
  negationWords: enginePriors.NEGATION_WORDS,
  // Scoped to the extractor alone (hypergraph.js's own header says exactly
  // where) — succession.js's completeness gate, retrieval, and what the
  // model is shown all still read the real bytes.
  // Declared per blankLabelRows' own contract (P4/P9 — how many
  // consecutive short lines make a table, and how long a line can be and
  // still be a cell, are facts about the material, never defaults). These
  // are the numbers measured against the real fetched Hannibal Hamlin
  // infobox this pass validated the organ against: minRun=4 is one more
  // than the smallest real box row-count seen (label/value/label/value);
  // maxCell=60 clears every real box cell measured and rejects an ordinary
  // short SENTENCE, which is what the terminator check is actually for.
  blankFurniture: (text) => blankLabelRows(text, { minRun: 4, maxCell: 60 }),
  // A pronoun subject/object resolved to its referent, per passage, before
  // extraction — resolvePronounSubjects's own header in hypergraph.js has
  // the full reasoning (READING-POLICY P7.2) and the corpus.js-sourced
  // operating point.
  resolvePronouns,
  // NOT wired here, on purpose, disclosed rather than silently absent: the
  // referent-bar mechanism (hypergraph.js's own "the referent bar" section
  // — a sentence-initial-only name provisionally admitted, then CONFIRMED
  // by a real pronoun binding) needs two more organs,
  // `extractLeadingSurfaces` (surfaces.js) and `thirdPersonSingular`
  // (priors.js's own THIRD_PERSON_SINGULAR) — both cheap, local, no
  // corpus to ship. Proven correct on real specimens (hypergraph.test.mjs:
  // a genuine confirmation, a control proving no false positive, the
  // exact originally-reported specimen still honestly undetermined) and
  // proven SAFE (the control case), but new enough — and its own disclosed
  // cold-start limit real enough (activation.js's own IDF formula cannot
  // yet recall a passage's own first several sentences, so the single most
  // common shape of this problem, a name opening a passage's very first
  // sentence, is not yet reached by it) — that turning it on for real user
  // traffic is a separate, deliberate decision this pass does not make,
  // mirroring the identical posture `classifyConnector`/`minShare`
  // (grammar-lens.js, two organs up in this file's own history) already
  // holds for the same reason.
};
const relationsFor = makeRelationReader(RELATION_READER_OPTIONS);

// The typed-note ledger (hyperlexicon.js, P57), built once — the SAME
// native cube.js `cellOf` two lines above already gives this file, plus
// the ordinal task-log the engine-v7 mount serves, reconciled through
// `consequence.js::adaptTaskLog` (the exact wiring
// hyperlexicon-stance.test.mjs already proves against the real organ).
// `hyperlexiconFor` is the organ passed to `runHolonicTask`; the mutable
// log itself lives on `state.hyperlexiconLog`, right beside `state.gridLog`:
// app-wide, never per-conversation, and — since Pass 17 (P98) — PERSISTED
// to OPFS as an append-only record and replayed on boot (`restoreRecords`),
// so the accumulated reading no longer ends at reload.
const hyperlexiconFor = makeHyperlexicon({
  ...adaptTaskLog({
    createTaskLog: nativeTaskLog.createTaskLog,
    append: nativeTaskLog.append,
    ENTRY_KINDS: nativeTaskLog.ENTRY_KINDS,
    OPERATOR_BASIS: nativeTaskLog.OPERATOR_BASIS,
    GRAINS,
  }),
  projectTasks: nativeTaskLog.projectTasks,
  cellOf,
});

// Derivation over the same ledger (derivation.js, P89/P102): products land
// on the SAME log as SYN·Pattern·derived with no witnesses of their own —
// premises carry them, `restsOn` is the min across their grounds, and
// `concedePremise` withdraws every product resting on a conceded premise.
const derivationFor = makeDerivation({
  hl: hyperlexiconFor,
  taskLog: { append: nativeTaskLog.append, projectTasks: nativeTaskLog.projectTasks, ENTRY_KINDS: nativeTaskLog.ENTRY_KINDS, OPERATOR_BASIS: nativeTaskLog.OPERATOR_BASIS, GRAIN_RANK: nativeTaskLog.GRAIN_RANK, cellOf },
});
const derivedNow = () => { try { return state.hyperlexiconLog ? derivationFor.foldDerived(state.hyperlexiconLog) : []; } catch { return []; } };
// The voids the reader has declared and no arrival has yet filled (Pass 23 /
// P105; kernel/notes.js S70) — read off the ledger, never off a turn's memory.
const voidsNow = () => { try { return state.hyperlexiconLog && hyperlexiconFor.foldVoids ? hyperlexiconFor.foldVoids(state.hyperlexiconLog) : []; } catch { return []; } };
// declareVoidOnLedger — the void-brief's finding, landed on the record as a
// DEF·Ground event WITH its scope (which sources, how far read, the ledger's
// cursor), so the next arrival that fills it re-zeros it at the door and
// `voidTimeline` reads both. Refusals are the kernel's own (`no_scope`,
// `not_empty`) and are disclosed in the thinking panel, never swallowed.
function declareVoidOnLedger(brief, { because = null } = {}) {
  if (!state.hyperlexiconLog || !hyperlexiconFor.declareVoid || !brief) return null;
  const anchor = brief.declaration?.cells?.find((c) => c.field === "anchor")?.declared ?? null;
  const label = brief.headPhrase ?? null;
  if (!anchor || !label) return null;
  const sources = liveSources().map((s) => s.name);
  let read = 0, total = 0;
  for (const [name, r] of READING.entries()) { if (!sources.includes(name)) continue; read += Number(r.cursor ?? 0); total += Number(r.total ?? 0); }
  const scope = { sources, read, total, cursor: state.hyperlexiconLog.nextSeq };
  const r = hyperlexiconFor.declareVoid(state.hyperlexiconLog, { end1: anchor, label, end2: null, scope, because });
  if (r.refused) return { refused: r.refused, anchor, label };
  state.hyperlexiconLog = r.log;
  syncRecords();
  return { id: r.id, anchor, label, scope, redeclared: Boolean(r.redeclared) };
}

// NO VIEW FROM NOWHERE (eoreader7 kernel/notes.js; POLICIES.md P80). The
// ledger is born on the first grounded turn, and its first entry declares
// what the reader feeding it actually stood on at that moment — the organs
// `relationsFor` was built from, the priors that had LOADED by then (the
// POS prior, UniMorph's verb forms, the morphology prior are all fetched
// after boot, so a ledger born before they land says so — a true statement
// about that reading, never a promise about a later one), and what is
// deliberately absent. Read back with `hyperlexiconFor.frameOf(log)`; a
// ledger with no frame reports `no_frame` rather than an invented one.
// DERIVED, not restated (reader-frame.js): organs and levers come from
// RELATION_READER_OPTIONS itself, so attestedVerbs, phrasalPredicates (DR5),
// the vocabulary gate and every future option are on the record the moment
// they are handed to the reader. What the options object cannot know is
// passed in: the LOADED state of the received priors at this moment, and the
// identity organ (castFor, built from cast.js) that resolves ends — with
// noteIdentity named as the deliberate omission it still is.
const readerFrame = () => frameOfReader({
  options: RELATION_READER_OPTIONS,
  priors: {
    posPrior: posPriorCache ? "POSPrior@1" : null,
    posGate: posPriorCache ? "on (type-level vocabulary gate over POSPrior@1)" : "off (prior not loaded)",
    verbForms: unimorphVerbForms.size ? `UniMorph eng verb forms (${unimorphVerbForms.size})` : null,
    morphology: sameFormOrgan ? "UniMorph morphology prior (sameAct)" : null,
    connectorLens: connectorLens ? "grammar-lens over POSPrior@1 (asymmetric, P56)" : null,
  },
  identity: { ends: "makeCastResolver (cast.js)", noteIdentity: null },
  model: state.model ?? null,
});

// The frame's RECIPE ID — minted once per distinct frame (SHA-256 over the
// canonical descriptor, kernel/notes.js::recipeId, P68) and carried on every
// witness the ledger lands as `<ref>~<recipe>`. corroboration.js counts
// (source, recipe) pairs: two pages read by this one reader are two sources
// and ONE instrument, and cannot disagree about anything the reader gets
// wrong. Until now every live witness was bare, and every reading counted
// as its own undeclared instrument.
let readerRecipeCache = { key: null, id: null };
async function readerRecipe(frame) {
  const key = JSON.stringify(frame);
  if (readerRecipeCache.key !== key) readerRecipeCache = { key, id: await hyperlexiconFor.recipeId(frame) };
  return readerRecipeCache.id;
}

// One meter per conversation, built on the engine's own tiers. reflex.js
// declares the numbers (window from the fold's own present, draws and alpha
// from read-frankenstein) — nothing here picks any.
const reflexMeter = makeReflexMeter({ createTierStack, foldThrough });

// S1's own meter — the same organ, the same declared numbers (aperture.js
// re-exports them from reflex.js rather than picking a second set), a
// separate instance so the world plane's belief never shares state with
// the self plane's.
const apertureMeter = makeApertureMeter({ createTierStack, foldThrough });
// The hunt gate (metacognition.js, P72's third amendment): the SAME
// tier-stack physiology as the two meters above, pointed at the
// preflight's own page stream — surprise deciding when the hunt stops,
// instead of a fixed page count spent blind. Per-hunt instances are
// created inside gatherPreflightMaterial; this is the factory, built once
// on the same injected organs.
const huntMeter = makeHuntMeter({ createTierStack, foldThrough });

import {
  blankLabelRows,
  buildSourceBlock,
  checkCitations,
  chunkSource,
  identifyMaterial,
  retrieve,
  tokenize,
} from "./source.js";

// The base prompt is the constitution's fold — the one bounded paragraph of
// it a mouth can honor. Everything else in that document binds this app's
// code, not the model; constitution.js carries the article→organ map and the
// assay walks it.
import { CONSTITUTION_PROMPT as BASE_PROMPT } from "./constitution.js";
// The folded constitution's content identity, carried on every answer
// record (P100) so a record says which constitution was in force.
const CONSTITUTION_SHA = (async () => {
  try {
    const buf = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(BASE_PROMPT));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch { return null; }
})();
let ANSWER_CURSOR = 0;
import { parseHandbookIndex, findChapter } from "./handbook.js";

const OLLAMA = "http://localhost:11434";
// ── the room (P119) ────────────────────────────────────────────────────────
// One FoldMatrix for the page: its session, this browser's identity pair and
// each room's chat key live in localStorage (the person's own browser, like
// the reading record); every act it records passes matrix.js's forRecord
// first, so the record holds pointers and never a key, a token or a turn.
const foldMatrix = new FoldMatrix({ storage: localStorageStorage(), record: (kind, fields) => { logAct(kind, fields); mirrorTermRecord(kind, fields); } });
// A room member's mouth is a rung like any other: `room:@who:server model`.
const ROOM_MODEL_PREFIX = "room:";
const isRoomModel = (name) => typeof name === "string" && name.startsWith(ROOM_MODEL_PREFIX);
const roomModelParts = (name) => { const m = /^room:(\S+) (.+)$/.exec(name ?? ""); return m ? { user: m[1], model: m[2] } : null; };
const roomModelName = (user, model) => `${ROOM_MODEL_PREFIX}${user} ${model}`;
/** How a model reads when it is cited: a room mouth names its machine. */
function modelLabel(name) {
  const p = roomModelParts(name);
  return p ? `${p.model} on ${p.user}` : name;
}
let roomServing = null; // { room, controller, models, served } while this page serves the room
let inviteWatch = null; // { room, controller } while this page grants bound invites it issued
// Which model, on which machine, did each call of the turn being written. A
// turn is several calls, and once a room's machines can answer them they need
// not all be the same mouth — so the turn says, under its own answer, what
// actually spoke. Appended at the call boundary in `completeOnce`, drawn by
// `renderFold`, cleared when a turn starts.
let turnMouths = [];
// Which turn a call belongs to, stamped when the call is MADE. A background
// call of the previous turn (the summary refresh is fire-and-forget) can land
// after the next turn has begun, and without this it was drawn under the wrong
// answer — measured 2026-09-06, a local 1.5s call appearing beneath a turn
// answered entirely on another machine.
let turnSeq = 0;
const noteMouth = (where, model, ms, seq) => {
  const last = turnMouths.at(-1);
  if (last && last.seq === seq && last.where === where && last.model === model) { last.calls++; last.ms += ms ?? 0; return; }
  turnMouths.push({ seq, where, model, calls: 1, ms: ms ?? 0 });
  if (turnMouths.length > 64) turnMouths.splice(0, turnMouths.length - 64);
};
function mouthsLine(seq) {
  const list = turnMouths.filter((m) => m.seq === seq);
  if (!list.length) return null;
  return list.map((m) => `${m.calls > 1 ? `${m.calls}× ` : ""}${m.model} ${m.where}${m.ms ? ` (${(m.ms / 1000).toFixed(1)}s)` : ""}`).join(" · ");
}
const MAX_TOKENS = 4096;
/**
 * The summary refresh returns one short JSON object. Left uncapped, a small
 * model will happily spend a thousand tokens explaining it — which on a local
 * 3B is a minute of wall clock per turn, spent on the cheapest part of the
 * design. The cap is the bound the fold already claims to have.
 */
const FOLD_MAX_TOKENS = 300;

const $ = (id) => document.getElementById(id);

const state = {
  model: null,
  /** The picker rungs Ollama actually has, fastest first — what routing may name. */
  offeredModels: [],
  matrixRoom: null, // the room this chat is preserved to / read from
  matrixPendingLink: null, // a share link opened before sign-in
  /** Every model name Ollama actually reports (not just MODEL_PICKER's four rungs) — what resolveNamedModel checks S1_MODEL/S2_MODEL against. */
  availableModels: new Set(),
  ready: false,
  busy: false,
  queue: [],

  /**
   * Proof-seeking consent (P13's amendment, re-amended 2026-08-17): when on,
   * a turn's flagged claims are taken to the web automatically, up to the
   * declared budget (PROOF_TARGETS_PER_TURN), through the explore server's
   * recorded egress. DEFAULT ON, by user direction — the consent it stands
   * for is still explicit, but it is now given by a switch sitting on the
   * composer in plain sight rather than by finding a checkbox in a modal.
   * Off is one click from every question, and the switch's own state is the
   * disclosure. The per-claim button works either way: a click is its own
   * authorization.
   */
  webProof: localStorage.getItem("fold-web-proof") !== "off",
  /**
   * Ranke — the primary-source chase (eoreader7 native/organs/ranke.js).
   * OFF by default and a switch, not a standing consent: every run is
   * fetches and searches against the world (user, 2026-09-03: "perhaps we
   * toggle this one as this could be very burdensome"). On, a grounded turn
   * that read a citing page chases its new notes under RANKE_AUTO_* budgets;
   * off, only the explicit door (/ranke <maxFetches> [maxSearches]) runs it.
   */
  ranke: localStorage.getItem("fold-ranke") === "on",
  /** web source name → { url, host, rawPath, textPath }: the saved faces a chase can start from (the organ needs the page's own HTML for its links). */
  pageFaces: {},

  /**
   * The master switch over everything attached. Silencing one attachment is
   * `muted`; this is the same act over all of them at once — "answer this
   * one without my documents" — and it is a retrieval concept only: nothing
   * is unloaded, every address still re-opens, and the switch comes back on
   * with nothing lost. DEFAULT ON: material you took the trouble to attach
   * is in play unless you say otherwise.
   */
  useAttachments: localStorage.getItem("fold-use-attachments") !== "off",

  /**
   * Whether answers are checked at all. On (the default) is what this
   * instrument is for. Off is a plain chatbot — no relation tier asked for,
   * nothing drawn into the prose, no tally, no evidence or grounding panel,
   * no claim taken to the web. Set from the header toggle; read per turn.
   */
  grounded: localStorage.getItem("fold-marks") !== "off",

  /**
   * The thinking-depth slider (P123, depth.js): 0 quick · 1 plain (today's
   * budgets) · 2 careful · 3 deep. Deeper is more bounded passes over the
   * same material — never more context. Set in the model menu; read per
   * turn; carried on the record and the export.
   */
  depth: (() => { const n = Number(localStorage.getItem("fold-depth")); return Number.isInteger(n) && n >= 0 && n <= 3 ? n : 1; })(),

  /**
   * The pace ledger and the model's declared window. The ledger is fed by
   * Ollama's own telemetry (real tokens, real durations) on every completed
   * call; the window comes from /api/show at connect. Both are the ground
   * for latency awareness — predictions in the thinking block, and the
   * disclosed trim when a prompt would not fit.
   */
  paceLog: emptyPaceLog(),
  contextTokens: null,

  /**
   * Conversations. The fold is per conversation — its own summary, its own
   * folds, its own record — because a running summary of two subjects at once
   * is a summary of neither. Material is deliberately NOT per conversation:
   * the corpus is a thing you loaded, and asking about it from two angles at
   * once is the normal case, not a reason to load it twice.
   *
   * The active conversation's fields are held directly on `state` and written
   * back on every switch, so the turn loop never has to reach through an
   * index to find out whose conversation it is in.
   */
  convos: [],
  active: 0,

  summary: emptySummary(),
  /** The raw transcript. Kept only so the page can show what it is NOT sending. */
  history: [],
  /** Per-turn folds, for display next to the message that produced them. */
  turnFolds: [],
  /** name → full text. A ref is only re-openable while its source is here. */
  sources: {},
  /**
   * name → full text, for TURN-SCOPED material the instrument cited and then
   * unloaded (preflight-fetched pages). Never an attachment: no pill, and
   * retrieval never reads it (liveChunks walks state.chunks alone). It
   * exists because an address the instrument SHIPPED must stay readable —
   * a reader who clicks a preflight citation's chip and gets "the address
   * outlived it" is looking at a real mechanical citation that has become
   * indistinguishable from a fabricated one, which defeats the whole
   * visible-effort posture the chips exist for. Same lifetime as sources
   * (this conversation, in memory).
   */
  citedMaterial: {},
  /**
   * name → the source's papers, for sources that arrived as priors: the
   * publisher's own frontmatter ({line, fields, path}), read mechanically by
   * the explore server from the document itself — never model-authored. A
   * ref on such a source re-opens WITH its papers, and the attachment pill
   * carries them: a prior referenced in the surf answers "says who?" with
   * the institution that published it, not with a file path.
   */
  provenance: {},
  /**
   * Sources switched off. They stay loaded — their text is still here, so a
   * record's refs still re-open — but retrieval does not see them. Removing a
   * source and silencing it are different acts and this is the second one.
   */
  muted: new Set(),
  chunks: [],
  /**
   * Everything a turn produced that wasn't prose, oldest first. One list
   * app-wide — a build belongs to the instrument, not to one conversation
   * (persisted under whichever conversation is active, but rendered for all).
   */
  builds: [],
  lastMessages: [],
  lastMaterialChars: 0,

  /**
   * The terminal language's own append-only log (grid.js, P22). App-wide,
   * NOT per conversation — the same reasoning `builds` above already
   * states ("a build belongs to the instrument, not to one conversation"):
   * an act composed from the chat's `/act` door or from the sandboxed
   * terminal is one instrument's log either way, so it must read the same
   * from both places and from any conversation. Never persisted (a fresh
   * page load is a fresh log — acts still mirror onto the durable record
   * one-way, via actTurn/term.js's mirrorTerm, but the log itself is not
   * restored from it).
   */
  gridLog: grid.createLog(),

  /**
   * The typed-note ledger's own state (hyperlexicon.js, P57) — same
   * app-wide, never-per-conversation, never-persisted posture as
   * `gridLog` immediately above, for the identical reason: a fresh page
   * load is a fresh reading. `null` until the first turn admits something.
   */
  hyperlexiconLog: null,
  huntUrls: {},
  lastPiece: null,
  obligations: null, // the obligation ledger (obligation.js) — per conversation, see PER_CONVO

  /**
   * The metacognition ledger (metacognition.js, P72) — same app-wide,
   * never-per-conversation, never-persisted posture as `gridLog`/
   * `hyperlexiconLog` immediately above: what this instrument has learned
   * about trusting S1's own draft is a fact about the instrument, not
   * about one conversation, and a fresh page load is a fresh reading.
   */
  metaLedger: metaLedger.createLedger(),

  /**
   * The declarations register (Pass 21, P102) — app-wide, persisted with the
   * other logs: what the person declared about relations, each with its
   * giver. Derivation reads its GIVEN tier and nothing else.
   */
  declarations: createDeclarationLog(),

  /**
   * The self plane, per conversation: the act ledger (append-only — what
   * this conversation's turns retrieved, checked, folded, recorded) and the
   * surprise meter (the engine's tier stack observing every message the
   * conversation hears). Held here, never in `sources` or `chunks`:
   * material retrieval must not see the instrument's own cognition, and the
   * instrument's cognition must not wear a material address.
   */
  reflexLog: emptyReflexLog(),
  meter: reflexMeter.create(),
  /** The world plane's own meter (aperture.js) — S1's ground, measured. Not
   * a ledger: nothing here is written to `reflexLog`, which is the self
   * plane's alone. */
  aperture: apertureMeter.create(),
  /** Consecutive summary refreshes skipped because the exchange held the
   * ground (refreshSummary's gate). Bounded by MAX_FOLDS_IN_PROMPT so a
   * held fold line never falls out of the refresh prompt's window unseen. */
  heldFolds: 0,
  /** The standing startle posture (aperture.js's regime, 0..1): raised by
   * an exchange's own measured surprise, released at the discourse tier's
   * own gamma, consumed as a contraction of the raw present. State the
   * reader is IN — no surface renders it. */
  regime: 0,

  /**
   * The browser-side skill library (B.3, SPEC v2) — an append-only log in
   * skills.js's own plan-log discipline, folded on read. Starts seeded
   * with the one demo skill this repo already carries in skills-demo/
   * (greet-visitor) so the terminal's `skill` capacity has something real
   * to claim against; there is no admission UI yet, so this is the whole
   * library until one is built. A real admission pipeline (the model
   * authoring a candidate, gated through skill-runner.mjs's Node-side
   * admitSkill) is unbuilt — named future work, not implied here.
   */
  skillLog: createSkillLog(),
  /**
   * Binary material (audio, video, images, PDFs). Not chunked, not
   * retrieved — the mute is a retrieval concept and bytes are never
   * retrieved. The one consumer is /measure. Stored as {blob, kind, url}
   * where url is a revoke-able Object URL.
   */
  media: {},

  /** Which view the Reading pane shows: "files" | "held" | "priors". */
  exploreView: "files",
  /** Last GET /api/priors response, or null before the first fetch resolves
   *  — the GIVEN count stays a typed gap ("—"), never a false 0, until then. */
};

// ── conversations ────────────────────────────────────────────────────────────

/** The fields that belong to a conversation rather than to the app. */
const PER_CONVO = [
  "summary",
  "history",
  "turnFolds",
  "lastMessages",
  "lastMaterialChars",
  "reflexLog",
  "obligations",
  "meter",
  "aperture",
  "heldFolds",
  "regime",
];

function newConvo() {
  const el = document.createElement("div");
  el.className = "thread";
  $("chat").append(el);
  return {
    id: state.convos.length + 1,
    el,
    summary: emptySummary(),
    history: [],
    turnFolds: [],
    lastMessages: [],
    lastMaterialChars: 0,
    reflexLog: emptyReflexLog(),
    meter: reflexMeter.create(),
    aperture: apertureMeter.create(),
    heldFolds: 0,
    regime: 0,
  };
}

/** A conversation is named by what it turned out to be about. */
function convoTitle(c) {
  if (c.summary.topic) return c.summary.topic;
  const first = c.history.find((m) => m.role === "user");
  return first ? first.content : `Conversation ${c.id}`;
}

function switchConvo(index) {
  // A turn in flight writes its fold, record, and history into whichever
  // conversation is active when its awaits resolve. Switching mid-turn would
  // file a task's record into the wrong conversation — so the switch waits,
  // exactly as the composer does.
  if (state.busy) return;
  const from = state.convos[state.active];
  if (from) {
    for (const k of PER_CONVO) from[k] = state[k];
    from.el.classList.remove("on");
  }
  state.active = index;
  const to = state.convos[index];
  for (const k of PER_CONVO) state[k] = to[k];
  to.el.classList.add("on");
  renderThreads();
  renderBuilds();
  showView("chat");
  $("input").focus();
}

function addConvo() {
  if (state.busy) return; // same reasoning as switchConvo
  // Write the current one back before the new element steals the pointer.
  const from = state.convos[state.active];
  if (from) for (const k of PER_CONVO) from[k] = state[k];
  state.convos.push(newConvo());
  switchConvo(state.convos.length - 1);
}

function closeConvo(index) {
  // Closing is a switch with the destination deleted: the same guard, and
  // never the last conversation — the strip keeps one at all times.
  if (state.busy || state.convos.length < 2) return;
  const wasActive = index === state.active;
  state.convos[index].el.remove();
  state.convos.splice(index, 1);
  if (wasActive) {
    // The active conversation is gone. Its per-convo fields leave with it —
    // no write-back, that is the point — and the neighbour becomes active:
    // the one just before if any, else the one that slid into its place.
    state.active = Math.min(index, state.convos.length - 1);
    const to = state.convos[state.active];
    for (const k of PER_CONVO) state[k] = to[k];
    to.el.classList.add("on");
    renderBuilds();
    showView("chat");
    $("input").focus();
  } else if (index < state.active) {
    // A conversation before the active one went; everything after shifted.
    state.active -= 1;
  }
  renderThreads();
}

function renderThreads() {
  // The turn counter is gone by user direction (2026-08-17) — the count
  // still lives in the fold's own bookkeeping; the header chrome doesn't
  // need it.
  const total = $("turn-total");
  if (total) total.hidden = true;
  const bar = $("threads");
  bar.textContent = "";
  state.convos.forEach((c, i) => {
    const tab = document.createElement("div");
    tab.className = "thread-tab";
    tab.setAttribute("aria-current", String(i === state.active));
    const b = document.createElement("button");
    b.type = "button";
    b.className = "thread-title";
    b.textContent = convoTitle(c);
    b.title = convoTitle(c);
    b.onclick = () => switchConvo(i);
    tab.append(b);
    // One conversation may be closed, never the last one — and never while a
    // turn is in flight, which would file its record into a conversation that
    // is about to not exist.
    const close = document.createElement("button");
    close.type = "button";
    close.className = "thread-close";
    close.textContent = "✕";
    close.title = "Close this conversation";
    close.disabled = state.convos.length < 2 || state.busy;
    close.onclick = () => closeConvo(i);
    tab.append(close);
    bar.append(tab);
  });
  const add = document.createElement("button");
  add.type = "button";
  add.className = "new";
  add.textContent = "＋";
  add.title = "New conversation — same material, its own fold";
  add.onclick = addConvo;
  bar.append(add);
}

// ── model ────────────────────────────────────────────────────────────────────

// The picker and the routing ladder live in model-routing.js (the same file
// the eval harness imports). Here the page just tracks which picker rungs
// Ollama actually has, so routing never names a model that would fail on use.

async function fillModels() {
  const sel = $("model");
  sel.textContent = "";
  try {
    const res = await fetch(`${OLLAMA}/api/tags`);
    const { models } = await res.json();
    const byName = new Map(models.map((m) => [m.name, m]));
    // The full raw set, unfiltered — S1_MODEL/S2_MODEL are specialists,
    // never picker rungs, so they would never survive the MODEL_PICKER
    // filter below.
    state.availableModels = new Set(byName.keys());
    const offered = MODEL_PICKER.map((name) => byName.get(name)).filter(Boolean);
    state.offeredModels = offered.map((m) => m.name);
    for (const m of offered) {
      const opt = document.createElement("option");
      opt.value = m.name;
      opt.textContent = `${m.name} · ${(m.size / 1e9).toFixed(1)}GB`;
      sel.append(opt);
    }
    // Default to the smallest offered rung, not the largest — the fastest
    // model is what most turns actually run on (routeModel only reaches for
    // `selected` on DEEP turns), and it is what a first connection should
    // cost. Degrades to the next offered rung if the smallest isn't pulled,
    // the same graceful-degradation model-routing.js already documents.
    sel.value = state.offeredModels[0] ?? MODEL_PICKER[0];
    if (!offered.length) $("status").textContent = "ollama has no models pulled";
  } catch {
    state.availableModels = state.availableModels ?? new Set();
    state.offeredModels = [];
    $("status").textContent = "ollama not reachable on :11434";
  }
  // The in-tab rungs, appended LAST (mergeOffered's own order: a native rung
  // is the faster summary rung where Ollama answers; where it does not, the
  // in-tab rung is offered[0] and every kind routes there). Offered only
  // where WebGPU can actually run them — the blocker names its own fix in
  // the status line, never a picker entry that would fail on use.
  const blocker = webgpuBlocker({ gpu: navigator.gpu, secureContext: window.isSecureContext });
  if (!blocker) {
    state.offeredModels = mergeOffered(state.offeredModels, true);
    for (const m of WEBLLM_MODELS) {
      state.availableModels.add(m.id);
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = `${m.label} · ${m.publisher}, ${m.license}`;
      opt.title = m.origin;
      sel.append(opt);
    }
    if (!sel.value || !state.offeredModels.includes(sel.value)) sel.value = state.offeredModels[0];
    if (!state.offeredModels.some((n) => !isWebLLMModel(n))) $("status").textContent = `no Ollama here — the in-tab models are offered (weights from ${webllmClient.weights})`;
  } else if (!state.offeredModels.length) {
    $("status").textContent = `${$("status").textContent} · in-tab models unavailable: ${blocker}`;
  }
}

async function connect() {
  state.model = $("model").value;
  state.ready = true;
  // No pre-warm of the Whisper weights here (removed 2026-09-05): a page load
  // must not reach huggingface.co on its own. The weights are fetched on the
  // FIRST /transcribe, and that turn says so before it starts — the one
  // egress this page causes that is not a localhost call, disclosed at the
  // moment it happens, never in the background.
  // The model's declared window, from the runtime's own mouth. The one
  // non-arbitrary meaning of "this prompt is too long" is this number.
  state.contextTokens = null;
  if (isWebLLMModel(state.model)) {
    // The window is the library's own declared context for this rung; the
    // bytes' origin is decided by where this page is served from (P1).
    state.contextTokens = webllmClient.contextWindowFor(state.model);
    const m = webllmModelOf(state.model);
    $("status").textContent = `ready · ${webllmLabelFor(state.model)} · weights from ${webllmClient.weights} · ${m?.origin ?? ""}${state.routes ? ` · routes: ${state.routes.summary}` : ""}`;
    $("send").disabled = false;
    openSettings(false);
    showView("chat");
    $("input").focus();
    return;
  }
  try {
    const res = await fetch(`${OLLAMA}/api/show`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: state.model }),
    });
    const info = (await res.json())?.model_info ?? {};
    for (const [k, v] of Object.entries(info))
      if (k.endsWith(".context_length") && Number.isFinite(v)) state.contextTokens = v;
  } catch {
    // No window declared is a gap, not a default — nothing will be trimmed.
  }
  $("status").textContent = readyLine();
  $("send").disabled = false;
  // Connected is the moment the controls stop earning their space, and the
  // moment the chat is what you want to be looking at.
  openSettings(false);
  showView("chat");
  $("input").focus();
}

/**
 * One request, to the one place a model lives. `messages` arrives in the
 * shape fold.js assembles — a single system message at index 0, then the
 * turns — and Ollama takes that array as-is. Callers may pass options this
 * endpoint has no use for (holon.js passes `effort`); they are ignored here
 * rather than policed, because the seam's shape is the contract, not the
 * host behind it. Returns `{text, doneReason}` — Ollama's own
 * `done_reason` ("stop" a natural end, "length" the token cap arrived
 * first, absent when the caller cancelled via `onDelta`) — never just a
 * bare string, so a caller can tell "the model finished" from "the cap
 * cut it off" without re-deriving that fact by guessing at the text.
 */
async function completeOnce(messages, { onDelta, onThinking, maxTokens, json, model, temperature } = {}) {
  const callSeq = turnSeq;
  // One request, to the one place a model lives. `model` is routed: plain
  // turns and the summary refresh spend the fastest rung; deep work (task,
  // bound, reflect) spends the model the user chose. Whatever it is, the
  // request, the pace ledger, and the status line all name the SAME model.
  const modelName = model ?? state.model;
  if (isRoomModel(modelName)) {
    // The same contract as the two local branches below, through the room:
    // the prompt sealed under the chat key to ONE member who offered this
    // model, their sealed answer read back. The homeserver saw an address,
    // an id, a seal and a size; the status line names who answered.
    const { user, model: remote } = roomModelParts(modelName);
    if (!state.matrixRoom) throw new Error("no room is open — /join a share link or /preserve first");
    $("status").textContent = `asking ${user} for ${remote} through the room…`;
    const a = await foldMatrix.ask(state.matrixRoom, { messages, model: remote, to: user, options: { maxTokens: maxTokens ?? MAX_TOKENS, temperature, json: json ?? null } }, { onWait: ({ ms }) => { $("status").textContent = `waiting on ${user} · ${Math.round(ms / 1000)}s`; } });
    noteMouth(`on ${user}'s ${a.device?.home ?? "machine"}, through the room`, a.model ?? remote, a.ms, callSeq);
    tokensSeen.calls += 1; tokensSeen.in += a.usage?.promptTokens ?? 0; tokensSeen.out += a.usage?.outTokens ?? 0;
    onDelta?.(a.text);
    $("status").textContent = `ready · ${modelName} · answered by ${a.by} in ${Math.round(a.ms / 1000)}s`;
    return { text: a.text, thinking: "", doneReason: "stop", via: { room: state.matrixRoom, by: a.by, model: a.model, ms: a.ms } };
  }
  if (isWebLLMModel(modelName)) {
    // Same contract as the Ollama branch below — {text, thinking, doneReason},
    // the pace ledger fed from the engine's own telemetry, the status line
    // naming the same model — through the worker engine, one model at a
    // time. A load's progress (a first download, cache reads, shader
    // compilation) narrates into the status line; a typed failure is thrown
    // to the caller like any Ollama error.
    let cancelled = false;
    const text = await webllmClient.stream(messages, {
      maxTokens: maxTokens ?? MAX_TOKENS,
      json,
      temperature,
      model: modelName,
      onProgress: (line, pct) => { $("status").textContent = `${webllmLabelFor(modelName)} · ${line}${pct ? ` ${pct}%` : ""}`; },
      onUsage: (rec) => {
        state.paceLog = recordCall(state.paceLog, rec);
        tokensSeen.in += rec.promptTokens ?? 0;
        tokensSeen.out += rec.outTokens ?? 0;
        tokensSeen.calls += 1;
        const pace = foldPace(state.paceLog, modelName);
        $("status").textContent = `ready · ${webllmLabelFor(modelName)}${pace.decodeTps ? ` · ${Math.round(pace.decodeTps)} tok/s` : ""}`;
      },
      onDelta: (out) => {
        if (onDelta?.(out) === true) { cancelled = true; return true; }
        return false;
      },
    });
    noteMouth("in this tab", webllmLabelFor(modelName), null, callSeq);
    return { text, thinking: "", doneReason: cancelled ? "cancelled" : "stop" };
  }
  const ollamaStarted = Date.now();
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: modelName,
      messages,
      stream: true,
      // A token cap bounds the damage; constrained decoding removes it. Asked
      // for JSON in prose, a small model writes the object and then keeps
      // talking until the cap — 300 tokens at 6/s is fifty seconds of a turn
      // spent on nothing. Told the grammar, it closes the brace and stops.
      // `json` may be `true` (plain JSON mode) or a JSON schema — Ollama's
      // structured outputs constrain decoding to the schema, which is how a
      // caller gets a SHAPE by physics instead of by asking the model nicely.
      ...(json ? { format: json === true ? "json" : json } : {}),
      // Undefined (the default) leaves Ollama's own sampling untouched —
      // every ordinary generative turn keeps its diversity. A caller doing
      // binary CLASSIFICATION (testimony.js's witness reads) may pass 0:
      // measured live 2026-08-19, the identical witness prompt flipped its
      // yes/no answer between two runs with no code change, purely from
      // sampling — a fact-check whose verdict depends on the dice is not a
      // check. temperature is the argmax knob, not a behavior instruction.
      options: { num_predict: maxTokens ?? MAX_TOKENS, ...(temperature !== undefined ? { temperature } : {}) },
    }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}: ${await res.text()}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let out = "";
  let thinking = "";
  let doneReason = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // Newline-delimited JSON, one object per chunk; a chunk can straddle a
    // read, so the trailing partial line stays in the buffer.
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const chunk = JSON.parse(line);
      // The final chunk carries the runtime's own telemetry: real tokens,
      // real durations. That is the pace ledger's only source — the system's
      // sense of its own speed is measured, never assumed.
      if (chunk.done) {
        doneReason = chunk.done_reason ?? null;
        state.paceLog = recordCall(state.paceLog, {
          model: modelName,
          promptChars: messages.reduce((n, m) => n + m.content.length, 0),
          promptTokens: chunk.prompt_eval_count,
          promptNs: chunk.prompt_eval_duration,
          outTokens: chunk.eval_count,
          outNs: chunk.eval_duration,
        });
        // A running total of real tokens, from the runtime's own telemetry.
        // A turn is many calls (plan, each part, the corrections, the fold),
        // so a message's cost is the DELTA across this counter between the
        // moment its node was made and the moment its fold was drawn — which
        // is the only way to count it without instrumenting every path.
        tokensSeen.in += chunk.prompt_eval_count ?? 0;
        tokensSeen.out += chunk.eval_count ?? 0;
        tokensSeen.calls += 1;
        const pace = foldPace(state.paceLog, modelName);
        if (pace.decodeTps) $("status").textContent = `ready · ${modelName} · ${Math.round(pace.decodeTps)} tok/s`;
      }
      // A reasoning-capable model (qwen3, deepseek-r1) streams its own
      // deliberation as a SEPARATE field, `message.thinking` — measured live
      // against this app's own real Ollama (2026-08-27): every chunk during
      // the thinking phase carries `content: ""` and the real text under
      // `thinking`, then the reverse once the model starts its answer. Ollama
      // does this split itself; nothing here needs to parse a `<think>` tag
      // out of prose. Before this, nothing read `.thinking` at all, so a
      // reasoning model's own deliberation was silently discarded — not
      // wrong, just invisible, every token of it. `onThinking` is the SAME
      // shape as `onDelta` (fired with the accumulated text so far) so an
      // existing caller pattern extends here rather than inventing a second
      // one; omitted, this costs nothing extra — the field is simply never
      // read.
      const thinkDelta = chunk.message?.thinking || "";
      if (thinkDelta) {
        thinking += thinkDelta;
        onThinking?.(thinking);
      }
      const delta = chunk.message?.content || "";
      if (!delta) continue;
      out += delta;
      // A caller's onDelta may return `true` to cancel the generation early
      // — predictive error correction: holon.js's runPart checks the
      // completed sentences so far against the offered passages, and a
      // draft already provably heading toward pure reproduction is stopped
      // before it burns the rest of its decode budget confirming what is
      // already known. The socket is cancelled, not just abandoned, so
      // Ollama stops computing tokens nobody will read. Cancellation is its
      // own reason, distinct from "stop" and "length": the caller chose to
      // stop this, so it must never be read as eligible for continuation.
      if (onDelta?.(out) === true) {
        try {
          await reader.cancel();
        } catch {
          // already closed — nothing to do
        }
        noteMouth("on this machine", modelName, Date.now() - ollamaStarted, callSeq);
        return { text: out, thinking, doneReason: "cancelled" };
      }
    }
  }
  noteMouth("on this machine", modelName, Date.now() - ollamaStarted, callSeq);
  return { text: out, thinking, doneReason };
}

// A continuation asks the model to keep writing, never to restate what it
// already wrote — measured live, the failure mode a naive "continue" nudge
// invites (2026-08-18, this session's own diagnosis of gemma2:2b's essay
// getting cut off mid-sentence at the token cap).
const CONTINUE_NUDGE =
  "Continue exactly where you left off. Do not repeat anything you already wrote, do not restate the question, and do not add a new introduction — pick up mid-thought if that is where you stopped.";

// A chained continuation is still bounded (P9): seven calls at MAX_TOKENS
// each is a generous ceiling for one answer, not an unlimited one — a
// model that cannot converge in that budget is a separate problem this
// cap turns into a visible, finite cost rather than a runaway one.
const MAX_AUTO_CONTINUATIONS = 6;

/**
 * `complete()`, transparent to every existing caller (same signature, same
 * plain-string return) — with one addition, opted into per call:
 * `autoContinue: true` chains a follow-up request whenever Ollama's own
 * `done_reason` says the token cap cut the model off mid-thought, rather
 * than the model choosing to stop, and stitches the result into ONE
 * seamless answer. Measured live (2026-08-18): asked to write an essay
 * from a real, full-length fetched source, gemma2:2b's draft stopped
 * mid-sentence at MAX_TOKENS ("**Expand on the connection between") —
 * the cap, not the model, decided the essay was finished. Never chained
 * for `json`-mode calls (a truncated schema-constrained object has no
 * sane "continue" — Ollama's own grammar keeps those short by
 * construction, per this function's own comment above) and bounded by
 * `MAX_AUTO_CONTINUATIONS` so a model that never naturally stops costs a
 * finite, disclosed number of calls rather than an unbounded one.
 */
async function complete(messages, { onDelta, onThinking, maxTokens, json, model, temperature, autoContinue = false } = {}) {
  let fullText = "";
  let convo = messages;
  for (let i = 0; ; i++) {
    const { text, doneReason } = await completeOnce(convo, {
      onDelta: onDelta ? (partial) => onDelta(fullText + partial) : undefined,
      // Only the FIRST call's thinking is meaningful to stream live — a
      // continuation nudge asks the model to keep writing prose, not to
      // deliberate again, so accumulating a second call's thinking onto the
      // first's would suggest an ongoing thought that in fact restarted.
      onThinking: onThinking && i === 0 ? onThinking : undefined,
      maxTokens,
      json,
      model,
      temperature,
    });
    fullText += text;
    if (!autoContinue || json || doneReason !== "length" || i >= MAX_AUTO_CONTINUATIONS) break;
    convo = [...convo, { role: "assistant", content: text }, { role: "user", content: CONTINUE_NUDGE }];
  }
  return fullText;
}

// ── the turn ─────────────────────────────────────────────────────────────────

/**
 * A turn with no model in it. The rows already exist; the only work is drawing
 * them and folding the turn like any other, so the conversation's own history
 * records that the question was asked and answered.
 */
/** Append one act to this conversation's ledger, stamped with the turn it
 * belongs to. The ledger is the self plane's record; writing it is itself
 * mechanical — no model ever authors an entry. */
function logAct(act, detail = {}) {
  state.reflexLog = recordAct(state.reflexLog, {
    turn: state.summary.turnCount + 1,
    act,
    ...detail,
  });
}

/**
 * The meter observes every exchange the conversation hears, both roles —
 * the caller passes what the turn actually contributed (for a computed
 * table, its caption: the same line the fold keeps, because rows restated
 * from state are not an arrival). Each observation is also an act on the
 * ledger, so a reflective turn can retrieve and cite what the meter
 * measured.
 *
 * The SAME two arrivals also feed `state.aperture` — S1's own ground,
 * measured (aperture.js). Never the ledger: an aperture observation is not
 * an act the instrument performed, it is a reading of what the CONVERSATION
 * now holds, so it stays off `reflexLog` the same way material stays out of
 * it in the other direction (reflex.js's four walls). Not yet drawn
 * anywhere — see CLAUDE.md, "System 1's own ground".
 */
function observeExchange(turn, question, answer) {
  const arrivals = [];
  for (const [role, text] of [["user", question], ["assistant", answer]]) {
    const o = reflexMeter.observe(state.meter, { turn, role, text });
    state.reflexLog = recordAct(state.reflexLog, {
      turn,
      act: "surprise",
      role,
      ...(o.gap
        ? { gap: o.gap }
        : { bits: o.bits, standing: o.standing ?? "unplaced", reach: o.top }),
    });
    arrivals.push(apertureMeter.observe(state.aperture, { turn, role, text }));
  }
  // The startle posture advances on the exchange's own measured surprise
  // and releases at the discourse tier's own gamma — one clock, belief's
  // own. Consumed at the next turn's raw-history slice; drawn nowhere.
  state.regime = regimeAfter(state.regime, arrivals, state.aperture.tiers[0]);
  return arrivals;
}

/**
 * "— computed, not generated" (arithmetic.js, grid.js's evaluate outcome,
 * tables.js/reflex.js's own self-doors) is a house mark meaning "code
 * produced this fact, not a language model" — it must certify something
 * true or it certifies nothing. Measured live: state.history is replayed
 * to the model verbatim as its own past turns (P23's "REAL role-structured
 * history"), so a caption left in it is not a record, it is a STYLE the
 * model can copy — a later question the arithmetic door correctly refused
 * (order-reversing phrasing) fell through to the model, which drafted its
 * own ungrounded "…is 7 — computed, not generated", borrowing the phrase
 * verbatim from an earlier turn's own history entry. The caption stays
 * everywhere a human reads it (the rendered turn, the fold-line, the
 * record); only the copy replayed to the model is stripped.
 */
const COMPUTED_CAPTION_RE = / — computed, not generated/g;
function stripComputedCaption(text) {
  return text.replace(COMPUTED_CAPTION_RE, "");
}

/** A command that arrived without its argument gets its usage line back — a
 * turn with no model in it, folded like any other so the exchange is on the
 * conversation's own record. */
function usageTurn(question, usage, { what = "usage" } = {}) {
  addMessage("user", question);
  const node = addMessage("assistant", usage);
  state.history.push(
    { role: "user", content: question },
    { role: "assistant", content: stripComputedCaption(usage) },
  );
  const turn = state.summary.turnCount + 1;
  logAct("answered-from-state", { what });
  observeExchange(turn, question, usage);
  const fold = mechanicalFoldLine(question, usage);
  state.turnFolds.push(fold);
  state.summary = advanceSummaryFold(state.summary, fold);
  renderFold(node, { fold });
  renderThreads();
  $("status").textContent = readyLine();
  releaseBusy();
}

/**
 * The measuring door (P19), from the chat: `/measure` teaches the
 * declaration; `/measure <media>` probes the file's own measurable surface;
 * `/measure <media> channel:… frame:… as:… broken:… draws:… window:…` places
 * one statistic against a Born-constructed null and phrases the placement.
 * Mechanical from end to end — no model call — and every media pill has
 * advertised this door since the materials panel was folded into the pills;
 * until 2026-09-05 nothing routed it, so the words went to the model.
 * Decoded image/video measurement (S76) is node-side today; in the page a
 * png or mp4 frames as bytes and the probe says so.
 */
async function measureTurn(question) {
  const parsed = parseMeasure(question);
  if (!parsed || parsed.usage) return usageTurn(question, `${measureUsage(nul)}\n— the door's own usage, computed`, { what: "measure" });
  if (parsed.refused) return usageTurn(question, `refused (${parsed.refused.type}): ${parsed.refused.detail}`, { what: "measure" });
  const decl = parsed.decl;
  const names = Object.keys(state.media);
  const m = decl.file ? state.media[decl.file] : null;
  if (!m) return usageTurn(question, `no media named "${decl.file ?? ""}" is attached — /measure reads the media pills${names.length ? `: ${names.join(", ")}` : " (none attached; drop an audio, image or video file first)"}.`, { what: "measure" });
  const bytes = new Uint8Array(await m.blob.arrayBuffer());
  const kind = sniffContainer(bytes) ?? "bytes";
  let result;
  try {
    // bindLinks is the pairs: door over a TABLE's columns; a media file has no
    // columns and the organ refuses pairs: on binary material by name, so no
    // /engine module is widened onto the page for a branch it cannot reach.
    result = runMeasurement(decl, { kind, bytes }, { nul, bindLinks: null, reduce: audioReduce });
  } catch (e) {
    return usageTurn(question, `the measuring door threw: ${e.message}`, { what: "measure" });
  }
  const text = result.kind === "probe" ? result.lines.join("\n") : result.refused ? `refused (${result.refused.type}): ${result.refused.detail}` : measurePhrase(result);
  return usageTurn(question, `${text}\n— computed, not generated`, { what: "measure" });
}

/** `/routes` — where the page is and what it can reach, probed now. */
async function routesTurn(question) {
  try {
    const r = await probeRoutes();
    return usageTurn(question, `${r.lines.map((l) => `  ${l}`).join("\n")}\n— probed now, not assumed`, { what: "routes" });
  } catch (e) {
    return usageTurn(question, `/routes: ${e.message}`, { what: "routes" });
  }
}

// ── the room's doors (P119) ─────────────────────────────────────────────────
const matrixUsage = [
  "/matrix — where this page stands with its homeserver, and what that server can see",
  "/matrix login [homeserver] — sign in (a sheet; the password never touches the composer)",
  "/matrix logout · rooms · open <room id> · request <room id> · members · fingerprint · forget",
  "/matrix lock · unlock · unlock off — seal what this browser keeps under a passphrase (a sheet)",
  "/matrix rotate · remove @who:server — a new key epoch; removal takes the seat and rotates",
  "/preserve [name] — seal this chat's turns into blocks on the homeserver (new turns only, each time)",
  "/share @who:server — a link that works for that account alone (no key in it; one use; 7 days)",
  "/share open — the magic key: whoever holds the link reads the chat · /share words <three or more words> — the key sealed under words you say aloud",
  "/share grant @who:server — trust an unverified key after comparing fingerprints · /share pending",
  "/join <link> [words] — open a shared chat: join, publish your key, read every block back here",
  "/serve [stop] — answer sealed prompts for the room with this machine's models",
  "/pool — the devices offering a mouth, what each machine is, and what it has answered",
  "/pool want @who:server <model> — ask a machine to take up a model it has spare · /pool drop @who [model]",
].join("\n");
const roomLabel = (id) => { const r = foldMatrix.status().rooms.find((x) => x.id === id); return r?.name ? `${r.name} (${id})` : id; };
const matrixGap = (e) => (e instanceof MatrixError ? e.message : e?.message ?? String(e));

/** Every entry this chat holds, as the block codec wants it: turns in order,
 * an id carried over for turns that came from a room. */
function chatEntries() {
  const now = Date.now();
  return state.history.map((h, i) => ({ kind: "turn", role: h.role, content: h.content, seq: i, ts: h.ts ?? now, ...(h.matrixId ? { id: h.matrixId } : {}) }));
}
/** Turns read back from a room, drawn into the pane and carried in history
 * with their ids so a later /preserve never pushes them twice. */
function replayEntries(entries, from) {
  let n = 0;
  for (const e of entries) {
    if (e.kind !== "turn" || !e.content) continue;
    if (state.history.some((h) => h.matrixId === e.id)) continue;
    addMessage(e.role === "assistant" ? "assistant" : "user", e.content);
    state.history.push({ role: e.role === "assistant" ? "assistant" : "user", content: e.content, matrixId: e.id, ts: e.ts });
    n++;
  }
  if (n) logAct("matrix-replayed", { from, turns: n });
  return n;
}
function roomStatusLines() {
  const st = foldMatrix.status();
  const lines = [];
  if (st.locked) lines.push("LOCKED — what this browser keeps (session, identity, keys) is sealed under your passphrase: /matrix unlock");
  else if (st.vaulted) lines.push("unlocked for this page load; sealed again at rest");
  lines.push(st.signedIn ? `signed in as ${st.user} on ${st.hs}` : st.locked ? "signed in? unknown until unlocked" : "not signed in — /matrix login <homeserver>");
  lines.push(state.matrixRoom ? `this chat's room: ${roomLabel(state.matrixRoom)}` : "this chat has no room yet — /preserve makes one, /join opens a shared one");
  if (st.rooms.length) { lines.push("rooms this browser holds a key for:"); for (const r of st.rooms) lines.push(`  ${r.name ?? "(unnamed)"} · ${r.id} · ${r.blocks} block(s), ${r.entries} entr${r.entries === 1 ? "y" : "ies"} · epoch ${r.epoch}${r.invites ? ` · ${r.invites} bound invite(s) outstanding` : ""}${r.pending ? " · waiting for a grant" : ""}`); }
  if (inviteWatch) lines.push(`granting bound invites for ${roomLabel(inviteWatch.room)} while this page is open`);
  lines.push(roomServing ? `serving the room from this machine: ${roomServing.models.join(", ")} · ${roomServing.served} answered` : "not serving");
  lines.push(`traffic this page sent it: ${st.traffic.requests} request(s), ${st.traffic.bytesOut.toLocaleString()} bytes`);
  lines.push("what the homeserver can see:"); for (const l of SERVER_SEES) lines.push(`  ${l}`);
  return lines;
}
/** The one sheet, in one of four modes: sign in (homeserver, user, password),
 * set a vault passphrase, unlock the vault, or the words for a passphrase
 * link. Whatever mode, the secret field is read once by the submit handler
 * and cleared; nothing typed here ever reaches the composer or the transcript. */
let sheetMode = "login";
function openMatrixSheet(mode, { hs = "", user = "" } = {}) {
  sheetMode = mode;
  const login = mode === "login";
  $("mx-hs").closest("label").hidden = !login; $("mx-user").closest("label").hidden = !login;
  $("mx-hs").required = login; $("mx-user").required = login;
  if (login) { $("mx-hs").value = hs || $("mx-hs").value || ""; if (user) $("mx-user").value = user; }
  $("mx-pass").value = "";
  $("mx-pass").closest("label").firstChild.textContent = mode === "words" ? "the words" : "passphrase";
  $("matrix-login-title").textContent = { login: "Sign in to a homeserver", lock: "Seal what this browser keeps", unlock: "Unlock", words: "The words this link needs" }[mode];
  $("matrix-login-sub").textContent = {
    login: `${state.matrixPendingLink ? "sign in, and the shared chat opens. " : ""}${$("matrix-login-sub").dataset.base}`,
    lock: "Your session, identity pair and chat keys are sealed under this passphrase at rest, and asked for on every page load. Nothing recovers a forgotten one.",
    unlock: "The passphrase you sealed this browser's keys with.",
    words: "Said aloud by whoever shared the link; the link alone does not open the chat.",
  }[mode];
  $("matrix-login-note").hidden = !login;
  $("matrix-login-submit").textContent = { login: "Sign in", lock: "Seal", unlock: "Unlock", words: "Open" }[mode];
  $("matrix-login").showModal();
  (login && !$("mx-hs").value ? $("mx-hs") : login && !$("mx-user").value ? $("mx-user") : $("mx-pass")).focus();
}
const openMatrixLogin = (hs = "", user = "") => openMatrixSheet("login", { hs, user });
async function matrixTurn(arg, question) {
  const [verb, ...rest] = arg.split(/\s+/); const tail = rest.join(" ").trim();
  try {
    if (!verb) return usageTurn(question, `${roomStatusLines().join("\n")}\n\n${matrixUsage}`, { what: "matrix" });
    if (foldMatrix.locked && !["unlock", "forget"].includes(verb)) { openMatrixSheet("unlock"); return usageTurn(question, "locked — the unlock sheet is open; nothing this browser keeps is readable until then", { what: "matrix" }); }
    if (verb === "login") {
      if (foldMatrix.status().signedIn && !tail) return usageTurn(question, `already signed in as ${foldMatrix.status().user} — /matrix logout first to change`, { what: "matrix" });
      openMatrixLogin(tail);
      return usageTurn(question, "the sign-in sheet is open — nothing leaves this page until you press Sign in, and then only to the homeserver you named", { what: "matrix" });
    }
    if (verb === "lock") { if (foldMatrix.status().vaulted) return usageTurn(question, "already sealed — /matrix unlock off returns to plain storage", { what: "matrix" }); openMatrixSheet("lock"); return usageTurn(question, "the seal sheet is open — choose a passphrase you will not lose; it is asked for on every page load", { what: "matrix" }); }
    if (verb === "unlock") { if (tail === "off") { if (!foldMatrix.status().vaulted) return usageTurn(question, "nothing is sealed", { what: "matrix" }); sheetMode = "unlock-off"; openMatrixSheet("unlock"); $("matrix-login-title").textContent = "Unseal for good"; return usageTurn(question, "the sheet is open — the passphrase, once more, returns this browser to plain storage", { what: "matrix" }); } if (!foldMatrix.locked) return usageTurn(question, "not locked", { what: "matrix" }); openMatrixSheet("unlock"); return usageTurn(question, "the unlock sheet is open", { what: "matrix" }); }
    if (verb === "fingerprint") return usageTurn(question, `this browser's key: ${await foldMatrix.myFingerprint()} — read it aloud to a member who is deciding whether to /share grant you`, { what: "matrix" });
    if (verb === "members") {
      if (!state.matrixRoom) return usageTurn(question, "no room is open", { what: "matrix" });
      const list = await foldMatrix.members(state.matrixRoom);
      return usageTurn(question, [`members of ${roomLabel(state.matrixRoom)}:`, ...list.map((m) => `  ${m.user} · ${m.membership}${m.fingerprint ? ` · key ${m.fingerprint}${m.proof === "proof" ? " (proved by a bound link)" : " (no proof — compare aloud before /share grant)"}` : " · no key published"} · ${m.hasKey ? "holds the chat key" : "no chat key"}`), "— from the room's state, not guessed"].join("\n"), { what: "matrix" });
    }
    if (verb === "rotate") { if (!state.matrixRoom) return usageTurn(question, "no room is open", { what: "matrix" }); const r = await foldMatrix.rotate(state.matrixRoom); return usageTurn(question, `new key epoch ${r.epoch} for ${roomLabel(state.matrixRoom)}: everything from now on is sealed under a key ${r.regranted.length} member(s) were re-granted (${r.regranted.join(", ") || "nobody else"}); what was read before stays read`, { what: "matrix" }); }
    if (verb === "remove") {
      if (!state.matrixRoom) return usageTurn(question, "no room is open", { what: "matrix" });
      if (!/^@[^:]+:.+$/.test(tail)) return usageTurn(question, "/matrix remove @who:server", { what: "matrix" });
      const r = await foldMatrix.remove(state.matrixRoom, tail);
      return usageTurn(question, `${tail} is out of ${roomLabel(state.matrixRoom)}, and the key rotated to epoch ${r.epoch} — nothing sealed from now on reaches them; what they already read, they keep (no key un-reads a block). Re-granted: ${r.regranted.join(", ") || "nobody"}`, { what: "matrix" });
    }
    if (verb === "logout") { await foldMatrix.logout(); if (roomServing) { roomServing.controller.abort(); roomServing = null; } return usageTurn(question, "signed out; the token was invalidated on the homeserver and forgotten here. Chat keys stay in this browser — /matrix forget drops them too.", { what: "matrix" }); }
    if (verb === "forget") { localStorageStorage().clear(); state.matrixRoom = null; return usageTurn(question, "forgotten: the session, this browser's identity pair, every chat key. Reload to start clean. (Rooms and blocks stay on the homeserver, unreadable without the keys.)", { what: "matrix" }); }
    if (verb === "rooms") {
      const st = foldMatrix.status(); if (!st.signedIn) return usageTurn(question, "not signed in — /matrix login <homeserver>", { what: "matrix" });
      const joined = await foldMatrix.http().joinedRooms();
      const lines = [`joined on ${st.hs}: ${joined.length} room(s)`];
      for (const id of joined) { const known = st.rooms.find((r) => r.id === id); lines.push(`  ${id} · ${known ? `${known.name ?? "(unnamed)"} · key held · ${known.blocks} block(s)` : "no key here — /matrix open to try a grant, or ask for its link"}`); }
      return usageTurn(question, lines.join("\n"), { what: "matrix" });
    }
    if (verb === "open") {
      if (!/^!/.test(tail)) return usageTurn(question, "/matrix open <room id> — a room id starts with !", { what: "matrix" });
      const r = await foldMatrix.load(tail);
      if (!r.entries.length && r.partial) return usageTurn(question, `${tail}: ${r.gaps.join("; ")}`, { what: "matrix" });
      state.matrixRoom = tail; localStorage.setItem("fold-matrix-room", tail);
      const n = replayEntries(r.entries, tail);
      return usageTurn(question, `opened ${roomLabel(tail)}: ${r.chains} chain(s), ${r.blocks} block(s), ${r.entries.length} entr${r.entries.length === 1 ? "y" : "ies"} read back and decrypted here — ${n} drawn above${r.gaps.length ? `\ngaps: ${r.gaps.join("; ")}` : ""}`, { what: "matrix" });
    }
    if (verb === "request") { if (!/^!/.test(tail)) return usageTurn(question, "/matrix request <room id>", { what: "matrix" }); await foldMatrix.requestKey(tail); return usageTurn(question, `your public key is published in ${tail}; when a member runs /share there, the chat key is wrapped to it — then /matrix open ${tail}`, { what: "matrix" }); }
    return usageTurn(question, matrixUsage, { what: "matrix" });
  } catch (e) { return usageTurn(question, `/matrix ${verb}: ${matrixGap(e)}`, { what: "matrix" }); }
}
async function preserveTurn(arg, question) {
  try {
    if (foldMatrix.locked) { openMatrixSheet("unlock"); return usageTurn(question, "locked — the unlock sheet is open", { what: "preserve" }); }
    if (!foldMatrix.status().signedIn) return usageTurn(question, "not signed in — /matrix login <homeserver> first", { what: "preserve" });
    const firstAsk = state.history.find((h) => h.role === "user")?.content ?? "";
    const name = arg || firstAsk.replace(/\s+/g, " ").slice(0, 60) || "a fold chat";
    const made = !state.matrixRoom;
    const room = await foldMatrix.ensureRoom({ roomId: state.matrixRoom, name });
    state.matrixRoom = room; localStorage.setItem("fold-matrix-room", room);
    const r = await foldMatrix.preserve(room, chatEntries());
    const sources = liveSources().length;
    const lines = [
      made ? `made a private room, ${roomLabel(room)}, with a fresh chat key held in this browser` : `room: ${roomLabel(room)}`,
      r.pushed ? `preserved ${r.pushed} turn(s) as block ${r.idx} (key epoch ${r.epoch}) — ${r.bytes.toLocaleString()} bytes of ciphertext at ${r.mxc}, sha256 ${r.sha256.slice(0, 12)}…` : "nothing new to preserve",
      r.skipped ? `${r.skipped} turn(s) were already there` : null,
      sources ? `${sources} attached source(s) are not preserved — the room holds turns; sources stay on this machine` : null,
      "the homeserver holds the sealed block, its size and its time; /share hands the key on",
    ].filter(Boolean);
    return usageTurn(question, lines.join("\n"), { what: "preserve" });
  } catch (e) { return usageTurn(question, `/preserve: ${matrixGap(e)}`, { what: "preserve" }); }
}
/** What the grant pass found, phrased once for every share-shaped door. */
function grantLines(r) {
  const lines = [];
  if (r.granted?.length) lines.push(`granted: ${r.granted.map((g) => `${g.user} (key ${g.fingerprint})`).join(", ")}`);
  if (r.unverified?.length) lines.push(`waiting on you: ${r.unverified.map((u) => `${u.user} published key ${u.fingerprint} with no link proof — have them read it aloud, then /share grant ${u.user}`).join("; ")}`);
  if (r.refused?.length) lines.push(`refused: ${r.refused.map((x) => `${x.user} — ${x.why}`).join("; ")}`);
  return lines;
}
async function shareTurn(arg, question) {
  try {
    if (foldMatrix.locked) { openMatrixSheet("unlock"); return usageTurn(question, "locked — the unlock sheet is open", { what: "share" }); }
    if (!foldMatrix.status().signedIn) return usageTurn(question, "not signed in — /matrix login <homeserver> first", { what: "share" });
    const [verb, ...rest] = arg.split(/\s+/); const tail = rest.join(" ").trim();
    if (!state.matrixRoom) { const firstAsk = state.history.find((h) => h.role === "user")?.content ?? ""; state.matrixRoom = await foldMatrix.ensureRoom({ name: firstAsk.replace(/\s+/g, " ").slice(0, 60) || "a fold chat" }); localStorage.setItem("fold-matrix-room", state.matrixRoom); await foldMatrix.preserve(state.matrixRoom, chatEntries()); }
    const room = state.matrixRoom; const pageHref = stripShareFragment(location.href);
    if (verb === "pending") { const r = await foldMatrix.grantPending(room); return usageTurn(question, [`bound invites outstanding: ${foldMatrix.pendingInvites(room).join(", ") || "none"}`, ...grantLines(r), grantLines(r).length ? "" : "nothing waiting"].join("\n"), { what: "share" }); }
    if (verb === "grant") { if (!/^@[^:]+:.+$/.test(tail)) return usageTurn(question, "/share grant @who:server — after comparing their fingerprint aloud (/matrix members)", { what: "share" }); const r = await foldMatrix.share(room, { grant: tail }); return usageTurn(question, [`${tail} now holds the chat key (every epoch), wrapped to key ${r.granted[0].fingerprint}`, "you trusted that key by comparing it out of band; a homeserver cannot have swapped what you read aloud"].join("\n"), { what: "share" }); }
    if (verb === "open" || verb === "") {
      const r = await foldMatrix.share(room, { mode: "open", pageHref });
      return usageTurn(question, [`room: ${roomLabel(room)}`, ...grantLines(r), `open link — the key is after the #, which browsers never send to any server:`, `  ${r.link}`, MAGIC_KEY_WARNING].join("\n"), { what: "share" });
    }
    if (verb === "words") {
      if (tail.split(/\s+/).filter(Boolean).length < 3) return usageTurn(question, "/share words <three or more words> — the words you will say aloud", { what: "share" });
      const r = await foldMatrix.share(room, { mode: "passphrase", passphrase: tail, pageHref });
      return usageTurn(question, [`room: ${roomLabel(room)}`, ...grantLines(r), `link — the key is sealed under your words; the link alone opens nothing, the words alone open nothing:`, `  ${r.link}`, "say the words to the person over a different channel than the link; whoever has both reads the whole chat"].join("\n"), { what: "share" });
    }
    if (/^@[^:]+:.+$/.test(verb)) {
      const r = await foldMatrix.share(room, { invite: verb, mode: "bound", pageHref });
      startInviteWatch(room);
      return usageTurn(question, [`invited ${verb} to ${roomLabel(room)} (private: only the invited can join)`, ...grantLines(r), `bound link — no key in it; it works only for ${verb}, signed in as themselves, once, until ${new Date(r.expiresAt).toLocaleString()}:`, `  ${r.link}`, "when they open it, their page publishes a key with this link's proof; this page (while open) or your worker grants that key and no other — a homeserver cannot swap one in", "if this page is closed when they open it, they see 'waiting for a grant'; reopening this chat later grants it"].join("\n"), { what: "share" });
    }
    return usageTurn(question, "/share @who:server (bound to that account) · /share open (the magic key) · /share words <words> · /share grant @who:server · /share pending", { what: "share" });
  } catch (e) { return usageTurn(question, `/share: ${matrixGap(e)}`, { what: "share" }); }
}
/** While this page is open and holds outstanding bound invites for the
 * room, grant every proof that verifies, and say so. */
function startInviteWatch(room) {
  if (inviteWatch?.room === room) return;
  inviteWatch?.controller.abort();
  const controller = new AbortController();
  inviteWatch = { room, controller };
  foldMatrix.watchInvites(room, { signal: controller.signal, onGrant: (g) => { for (const x of g.granted) addMessage("assistant", `granted the chat key to ${x.user} (key ${x.fingerprint}) — their bound link's proof verified`); renderPool(); } })
    .catch(() => {}).finally(() => { if (inviteWatch?.controller === controller) inviteWatch = null; });
}
/** Join from a link: the flow /join, the boot path and the sheet share. */
async function joinInto(link, { passphrase = null } = {}) {
  const p = parseShareLink(link);
  const r = await foldMatrix.joinFromLink(link, { passphrase, onWait: ({ ms }) => { $("status").textContent = `waiting for a member to grant your key · ${Math.round(ms / 1000)}s`; } });
  if (r.needs === "unlock") { state.matrixPendingLink = link; openMatrixSheet("unlock"); return "unlock this browser's keys first — the sheet is open; the shared chat opens after"; }
  if (r.needs === "login") { state.matrixPendingLink = link; openMatrixLogin(r.hs, r.to ? r.to.replace(/^@/, "").replace(/:.*$/, "") : ""); return `sign in to your homeserver first${r.to ? ` as ${r.to}` : ""} — the sheet is open; the shared chat "${r.name ?? r.room}" opens after`; }
  if (r.needs === "passphrase") { state.matrixPendingLink = link; openMatrixSheet("words"); return `this link needs the words that were said to you — the sheet is open`; }
  if (!r.joined) return `${r.room}: ${r.gap}`;
  state.matrixPendingLink = null;
  state.matrixRoom = r.room; localStorage.setItem("fold-matrix-room", r.room);
  $("status").textContent = `ready · ${state.model}`;
  if (r.awaiting) return `joined ${r.name ? `"${r.name}" ` : ""}${r.room}, and published this browser's key (${r.fingerprint}) with the link's proof — ${r.gaps.join("; ")}`;
  const n = replayEntries(r.entries, r.room);
  renderModelMenu();
  const how = p?.kind === "bound" ? `the chat key was granted to this browser's key (${r.fingerprint}) — it opens only here` : p?.kind === "passphrase" ? "the key was opened with the words and is held in this browser" : "the key from the link is held in this browser; the address bar no longer carries it";
  return `joined ${r.name ? `"${r.name}" ` : ""}${r.room}: ${r.chains} chain(s), ${r.blocks} block(s), ${r.entries.length} entr${r.entries.length === 1 ? "y" : "ies"} read back and decrypted here — ${n} drawn above${r.partial ? `\ngaps: ${r.gaps.join("; ")}` : ""}\n${how}`;
}
async function joinTurn(arg, question) {
  try {
    const m = /^(\S+)\s*(.*)$/s.exec(arg ?? "");
    const link = m?.[1] || state.matrixPendingLink; const words = m?.[2]?.trim() || null;
    if (!link || !parseShareLink(link)) return usageTurn(question, "/join <link> [the words] — a link printed by /share", { what: "join" });
    return usageTurn(question, await joinInto(link, { passphrase: words }), { what: "join" });
  } catch (e) { return usageTurn(question, `/join: ${matrixGap(e)}`, { what: "join" }); }
}
/** This machine's mouth, for the room: the same completeOnce a turn uses,
 * with what it measured — tokens from the counter, the device's own label. */
async function serveComplete({ model, messages, options }) {
  const before = { in: tokensSeen.in, out: tokensSeen.out };
  const r = await completeOnce(messages, { model, json: options?.json ?? undefined, maxTokens: options?.maxTokens, temperature: options?.temperature });
  return { text: r.text, model, usage: { promptTokens: tokensSeen.in - before.in, outTokens: tokensSeen.out - before.out }, device: thisMachine() };
}
/** What this browser's machine is, from what the browser will actually say:
 * the runtime that answers, its cores and memory where the browser reports
 * them, and whether a GPU is there for the in-tab rung. Unknown stays null. */
function thisMachine() {
  const local = localModels();
  const inTab = local.length && local.every((m) => isWebLLMModel(m));
  return deviceContent({
    runtime: inTab ? "in-tab (WebLLM)" : local.some((m) => isWebLLMModel(m)) ? "Ollama + in-tab" : "Ollama",
    os: navigator.platform || null, arch: null,
    cores: navigator.hardwareConcurrency ?? null,
    memGB: navigator.deviceMemory ?? null,
    gpu: navigator.gpu ? true : inTab ? false : null,
    note: state.routes?.summary?.split(" · ")[0] ?? null,
  });
}
function localModels() { return state.offeredModels.filter((n) => !isRoomModel(n)); }
async function startServing(room) {
  if (roomServing) return roomServing;
  const models = localModels();
  if (!models.length) throw new Error("this machine offers no model — Ollama is not answering and the in-tab rung is unavailable");
  const controller = new AbortController();
  roomServing = { room, controller, models, served: 0 };
  foldMatrix.serve(room, {
    complete: serveComplete, models, available: [], device: thisMachine(), home: state.routes?.summary?.split(" · ")[0] ?? null, signal: controller.signal,
    onJob: ({ from, model }) => { roomServing.served++; $("status").textContent = `serving ${from} with ${model} through the room…`; renderPool(); },
    onTakeUp: ({ model, by }) => { addMessage("assistant", `taking up ${model} for the room, asked by ${by} — this machine now serves it too`); renderPool(); },
  })
    .catch((e) => { addMessage("assistant", `serving stopped: ${matrixGap(e)}`); })
    .finally(() => { if (roomServing?.controller === controller) roomServing = null; renderPool(); });
  renderPool();
  return roomServing;
}
async function serveTurn(arg, question) {
  try {
    if (/^stop\b/.test(arg)) { if (!roomServing) return usageTurn(question, "not serving", { what: "serve" }); roomServing.controller.abort(); const n = roomServing.served; roomServing = null; return usageTurn(question, `stopped serving — ${n} answered; the offer is withdrawn from the room`, { what: "serve" }); }
    if (!foldMatrix.status().signedIn) return usageTurn(question, "not signed in — /matrix login <homeserver> first", { what: "serve" });
    if (!state.matrixRoom) return usageTurn(question, "no room is open — /preserve makes one, /join opens a shared one", { what: "serve" });
    const s = await startServing(state.matrixRoom);
    return usageTurn(question, `serving ${roomLabel(state.matrixRoom)} from this machine: ${s.models.join(", ")}\nany member can pick one of these as their model (the picker lists it as room:${foldMatrix.status().user} <model>); their prompts arrive sealed, are answered here, and go back sealed\n/serve stop withdraws the offer`, { what: "serve" });
  } catch (e) { return usageTurn(question, `/serve: ${matrixGap(e)}`, { what: "serve" }); }
}
function poolLines(pool) {
  if (!pool.workers.length) return ["nobody offers a mouth in this room yet — /serve on a machine that has one"];
  return pool.workers.flatMap((w) => [
    `  ${w.user}${w.withdrawn ? " (withdrawn)" : ""} · ${deviceLine(w.device)} · serving ${w.models.join(", ") || "nothing"}`,
    `    sent ${w.sent}, answered ${w.answered}, failed ${w.failed}, in flight ${w.inflight}${w.meanMs != null ? ` · mean ${(w.meanMs / 1000).toFixed(1)}s` : ""}${w.tokPerSec != null ? ` · ${w.tokPerSec} tok/s` : ""}`,
    w.available?.length ? `    spare, ask with /pool want ${w.user} <model>: ${w.available.join(", ")}` : null,
    ...(w.refused ?? []).map((r) => `    refused ${r.model}: ${r.why}`),
  ].filter(Boolean));
}
async function poolTurn(question, arg = "") {
  try {
    if (!state.matrixRoom) return usageTurn(question, "no room is open — /preserve makes one, /join opens a shared one", { what: "pool" });
    const want = arg.match(/^(want|drop)\s+(@[^:\s]+:\S+)\s*(\S*)$/);
    if (want) {
      const [, verb, who, model] = want;
      if (verb === "want") {
        if (!model) return usageTurn(question, "/pool want @who:server <model> — ask that machine to take up a model it has spare", { what: "pool" });
        const r = await foldMatrix.want(state.matrixRoom, who, model);
        renderPool();
        return usageTurn(question, [`asked ${who} to take up ${model}`, r.serving ? "it already serves that one" : r.available ? "it says it has that one spare — it will be offered within a few seconds, and the picker will list it" : `it does not list ${model} as available; it will answer with a reason, shown in /pool`, r.device ? `that machine: ${r.device}` : null].filter(Boolean).join("\n"), { what: "pool" });
      }
      const r = await foldMatrix.unwant(state.matrixRoom, who, model || null);
      return usageTurn(question, `withdrew the ask${model ? ` for ${model}` : ""} of ${who}; ${r.left} ask(s) left standing`, { what: "pool" });
    }
    await foldMatrix.mouths(state.matrixRoom);
    const pool = foldMatrix.pool(state.matrixRoom);
    renderPool(); $("pool").showModal();
    return usageTurn(question, `pooled devices in ${roomLabel(state.matrixRoom)} — ${pool.offers} offering:\n${poolLines(pool).join("\n")}\n/pool want @who:server <model> asks a machine to take up a model it has spare\n— from the room's state and this page's own jobs, not guessed`, { what: "pool" });
  } catch (e) { return usageTurn(question, `/pool: ${matrixGap(e)}`, { what: "pool" }); }
}
/** The pool sheet: the same facts as /pool, as a table, live while serving. */
function renderPool() {
  const table = $("pool-table"); if (!table) return;
  const room = state.matrixRoom;
  const pool = room ? foldMatrix.pool(room) : { workers: [], offers: 0 };
  $("pool-sub").textContent = room ? `${roomLabel(room)} — ${pool.offers} device(s) offering` : "no room is open — /preserve makes one, /join opens a shared one";
  table.textContent = "";
  if (pool.workers.length) {
    const head = table.createTHead().insertRow();
    for (const h of ["member", "machine", "serving", "spare", "sent", "answered", "failed", "in flight", "mean", "tok/s"]) { const th = document.createElement("th"); th.textContent = h; head.append(th); }
    const body = table.createTBody();
    for (const w of pool.workers) {
      const tr = body.insertRow(); if (w.withdrawn) tr.className = "withdrawn";
      const cells = [w.user + (w.withdrawn ? " (withdrawn)" : ""), deviceLine(w.device), w.models.join(", ") || "—", w.available?.length ? w.available.join(", ") : "—", w.sent, w.answered, w.failed, w.inflight, w.meanMs != null ? `${(w.meanMs / 1000).toFixed(1)}s` : "—", w.tokPerSec ?? "—"];
      cells.forEach((c, i) => { const td = tr.insertCell(); td.textContent = String(c); if (i >= 4) td.className = "num"; });
      if (w.available?.length && !w.withdrawn) { tr.cells[3].title = `ask this machine to take one up: /pool want ${w.user} <model>`; }
      for (const r of w.refused ?? []) { const note = body.insertRow(); note.className = "withdrawn"; const td = note.insertCell(); td.colSpan = 10; td.textContent = `${w.user} refused ${r.model}: ${r.why}`; }
    }
  }
  $("pool-this").textContent = `this machine (${deviceLine(thisMachine())}) ${roomServing ? `is serving ${roomServing.models.join(", ")} · ${roomServing.served} answered so far` : localModels().length ? `is not serving — it could offer ${localModels().join(", ")}` : "has no model to offer"}`;
  const btn = $("pool-serve"); btn.textContent = roomServing ? "Stop serving" : "Serve from this machine"; btn.classList.toggle("on", !!roomServing); btn.disabled = !room || !foldMatrix.status().signedIn;
}

/**
 * `/gateways` — which public gateways this instrument has found open, off
 * its own record (P117); `/gateways probe [url]` tries each one, recorded.
 * A gateway is a third party the reader reaches only when a direct fetch
 * was refused and the web toggle is on; the table says what each one sees.
 */
async function gatewaysTurn(arg, question) {
  const probe = /^probe\b/.test(arg);
  const target = probe ? arg.replace(/^probe\s*/, "").trim() : "";
  try {
    const res = probe
      ? await fetch(`${EXPLORE_BASE}/api/web/gateways`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(target ? { url: target } : {}) })
      : await fetch(`${EXPLORE_BASE}/api/web/gateways`);
    if (!res.ok) return usageTurn(question, `the explore server answered ${res.status} — /gateways needs explore-server.mjs on ${EXPLORE_BASE}`, { what: "gateways" });
    const got = await res.json();
    const head = probe
      ? `probed ${got.results.length} public gateways with ${got.target} — ${got.results.filter((r) => r.ok).length} answered (each try is on the record):`
      : `public gateways, as this instrument has found them (off the record; a direct fetch that is refused tries them in this order):`;
    const rows = probe
      ? [
          ...got.results.map((r) => `  ${r.ok ? "open  " : "closed"} ${r.gateway} · ${r.status ?? "no answer"} · ${r.ms} ms${r.ok ? ` · ${r.chars.toLocaleString()} chars` : ` · ${r.detail}`}`),
          `what each relay or reader forwards about you${got.ownIpKnown ? "" : " (your own address could not be read, so nothing is decided)"}:`,
          ...(got.leaks ?? []).map((l) => `  ${l.gateway} · ${l.forwardsAddress === true ? `forwards your address (${l.carriers.map((c) => c.name).join(", ")})` : l.forwardsAddress === false ? "does not forward your address" : l.echoed ? "unreadable" : "not measurable while closed"}`),
        ]
      : got.lines.map((l) => `  ${l}`);
    const tail = probe ? `\nlearned order now: ${got.order.join(" → ")}` : `\norder: ${got.order.join(" → ")}\n/gateways probe [url] — try each one now, recorded`;
    return usageTurn(question, `${head}\n${rows.join("\n")}${tail}\n— computed from the record, not generated`, { what: "gateways" });
  } catch (e) {
    return usageTurn(question, `/gateways: ${e.message} — is explore-server.mjs running on ${EXPLORE_BASE}?`, { what: "gateways" });
  }
}

/**
 * Fire-and-forget mirror onto the SAME durable record every terminal-typed
 * act already lands on (explore-server.mjs's `POST /api/term-record` →
 * its one `record(event, fields)` function, `record/explore-record.jsonl`)
 * — reused rather than a second file or a second reader, the same
 * discipline `mirrorBuild` above already holds for build records. `via:
 * "chat"` is the one thing this door adds to the event shape term.js's own
 * `mirrorTerm` already writes, so the record can tell which door an act
 * came through without a second event vocabulary. A miss (no explore
 * server reachable at EXPLORE_BASE) is silent — the terminal's own
 * long-standing default, not a mid-turn error over a best-effort crossing.
 */
function mirrorTermRecord(event, fields) {
  fetch(`${EXPLORE_BASE}/api/term-record`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ event, ...fields }),
  }).catch(() => {});
}

/**
 * /act — the terminal language's chat door (P22's grid.js, opened to chat).
 * EXPLICIT-TRIGGER ONLY: the model never decides to compose an act, and
 * never sees this door at all — only a person typing `/act …` reaches it,
 * the same posture every other slash door in this dispatcher already has.
 * Mechanical end to end, no model call: `landAct` (capacity-runner.js) is
 * the SAME parse→land→maybe-execute orchestration the terminal's own `act`
 * fold command calls, so a line means the same thing composed from either
 * surface. Acts land on `state.gridLog` — app-wide, not per conversation,
 * shared with the terminal via the `gridLog`/`setGridLog` bridge accessors
 * `initTerminal` receives below — so an act composed here shows up in the
 * terminal's `grid`/`capacities`, and vice versa. Refusals stay refusals:
 * grid.js's own grammar is what gates a malformed or unwarranted act, not
 * anything added here.
 */
/**
 * The F5-at-scale door (NEXT-PASSES Pass 4b). corroborateLedger is the
 * eval-proven settling walk (corroboration.js — SPRT-shaped unit steps,
 * per-end feasibility prefilter, the armed generate protocol, contests
 * reported never landed); this function only SUPPLIES it the app's own
 * organs and prints its report:
 *  - the log is state.hyperlexiconLog — the same ledger every grounded
 *    turn's admit() has been feeding (P57/P74);
 *  - the door is hyperlexiconFor — attest() lands earned testimony
 *    witnesses on the same append-only log, witnesses UNIONED;
 *  - sources cross like the sandbox's mount, ALL loaded sources — the
 *    mute toggle silences RETRIEVAL, not what material may witness
 *    (term.js's sourcesPayload states the same rule for the same reason);
 *  - the ask is witnessProof's own, verbatim: buildWitnessMessages at
 *    temperature 0 with the WITNESS_SCHEMA grammar (P32's measured
 *    posture — a classification ask, not a generative one).
 * The walk's outcome lands back on state.hyperlexiconLog (append-only —
 * attest never rewrites), the report renders mechanically, and the run
 * mirrors onto the record via the same term-record route /act uses.
 */
/**
 * /must — the obligation ledger as a chat door (Tier 4 #13's consumer).
 *   /must <enumerated instructions>      admit (numbered/lettered/bulleted lines)
 *   /must                                coverage — every clause, its standing, the unvisited NAMED
 *   /must done <id> <because> [ref ...]  mark satisfied
 *   /must broke <id> <because>           mark violated
 *   /must waive <id> <because> by <who>  waive — reason AND name required
 * Mechanical throughout (usageTurn, no model call): the ledger is
 * append-only, standings project from it, and coverage is complete only
 * when nothing is unvisited and nothing stands violated. Mirrors every
 * change onto the record via the same term-record route the other doors use.
 */
/**
 * /reopen [source|fold|door] — the record is the only ground. The pick is
 * reopen.js's `lastOpened` over the record's tail (explore-server's own
 * rows, read back exactly as term.js's `record` command reads them); the
 * address is the row's own field, carried; nothing here searches the chat,
 * asks a model, or admits bytes. A source the record names but this
 * conversation never attached is SAID, not fetched — reopen restores what
 * is held, it does not re-admit what is not.
 */
async function reopenTurn(argstr, typed) {
  const arg = String(argstr ?? "").trim().toLowerCase();
  if (arg && !["source", "fold", "door"].includes(arg)) return usageTurn(typed, "/reopen [source|fold|door] — restore the last thing you had open, from the record's own rows. Nothing is re-read, re-run, or re-admitted.");
  let rows = [];
  try {
    // The whole record, not a tail: web-fetch rows are ~60% of it, so a
    // 500-row tail routinely holds no open at all (measured live: "nothing
    // source on the record's tail" against a record with 81 source-opens).
    const res = await fetch(`${EXPLORE_BASE}/api/record?tail=100000`);
    if (res.ok) rows = ((await res.json()).tail ?? []).map((raw) => { try { return typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return null; } }).filter(Boolean);
  } catch { /* unreachable record — said below, never guessed around */ }
  if (!rows.length) return usageTurn(typed, `the record is not reachable (no explore server at ${EXPLORE_BASE}) — /reopen restores only from the record, never from the chat's own memory.`);
  const pick = lastOpened(rows, { kinds: arg ? [arg] : null });
  const plan = restoreFor(pick);
  if (plan.action === "none") return usageTurn(typed, `nothing ${arg || "open"} on the record to reopen.`);
  if (plan.action === "open-source") {
    if (state.sources[plan.name] != null) {
      openSourceViewer(plan.name);
      if (!matchMedia("(max-width: 900px)").matches) showView("explore");
      return usageTurn(typed, `reopened source "${plan.name}" (${pick.event}, recorded ${pick.at})`);
    }
    return usageTurn(typed, `the last open on the record is "${plan.name}" (${pick.event}, recorded ${pick.at}) — not attached to this conversation, so it is not re-admitted here; attach it, or open it in Explore.`);
  }
  if (plan.action === "open-fold") {
    const entry = state.builds.find((b) => b.n === Number(plan.n));
    if (!entry) return usageTurn(typed, `the last fold open on the record is build ${plan.n} (recorded ${pick.at}) — not held in this page's folds, so nothing is restored.`);
    await openBuild(entry);
    return usageTurn(typed, `reopened fold ${plan.n} (recorded ${pick.at})`);
  }
  return usageTurn(typed, renderDoor(plan.fields));
}

function mustTurn(argstr, typed) {
  const arg = String(argstr ?? "").trim();
  const led = state.obligations;
  const render = (ledger) => {
    const cov = obligationCoverage(ledger);
    const rows = obligationStandings(ledger).map((s) => `  ${s.standing === "satisfied" ? "✓" : s.standing === "violated" ? "✗" : s.standing === "waived" ? "–" : "·"} ${s.id}  [${s.standing}]  ${s.text}${s.because && s.standing !== "not-yet-visited" ? `  — ${s.because}` : ""}`);
    return [`obligations: ${cov.total} clause(s) · satisfied ${cov.counts.satisfied} · violated ${cov.counts.violated} · waived ${cov.counts.waived} · not yet visited ${cov.counts["not-yet-visited"]} · ${cov.complete ? "COMPLETE" : "incomplete"}`, ...rows].join("\n");
  };
  if (!arg) {
    if (!led) return usageTurn(typed, "/must <enumerated instructions> — admit a numbered, lettered, or bulleted instruction set as clauses each owed a visit. Then: /must (coverage), /must done <id> <because>, /must broke <id> <because>, /must waive <id> <because> by <who>. Coverage is ENUMERATION: the unvisited are named, and it is complete only when nothing is unvisited and nothing stands violated.");
    return usageTurn(typed, render(led));
  }
  const verb = arg.match(/^(done|broke|waive)\s+(ob-\d+)\s+([\s\S]*)$/);
  if (verb) {
    if (!led) return usageTurn(typed, "no obligations admitted yet — /must <enumerated instructions> first.");
    const [, kind, id, rest] = verb;
    let r;
    if (kind === "waive") {
      const m = rest.match(/^([\s\S]*?)\s+by\s+(.+)$/);
      if (!m) return usageTurn(typed, "a waiver needs a reason AND a name: /must waive <id> <because> by <who>");
      r = markObligation(led, id, "waived", { because: m[1].trim(), waivedBy: m[2].trim() });
    } else {
      const refs = [...rest.matchAll(/\S+#\d+-\d+/g)].map((x) => x[0]);
      r = markObligation(led, id, kind === "done" ? "satisfied" : "violated", { because: rest.trim(), refs });
    }
    if (r.refused) return usageTurn(typed, `refused (${r.refused}): ${r.detail}`);
    state.obligations = r.ledger;
    mirrorTermRecord("obligation-mark", { id, standing: kind, via: "chat" });
    return usageTurn(typed, render(r.ledger));
  }
  const admitted = admitObligations(arg);
  if (admitted.refused) return usageTurn(typed, `refused (${admitted.refused}): ${admitted.detail}`);
  state.obligations = admitted.ledger;
  mirrorTermRecord("obligation-admit", { clauses: admitted.ledger.clauses.length, via: "chat" });
  return usageTurn(typed, render(admitted.ledger));
}

// The sentence witness for a checked turn (holon.js's `witnessSentences`
// option): the same ask organs /corroborate uses — generate as the
// fallback, SELECT as the protocol — bound here so holon.js owns no model.
// Measured live 2026-09-02 before this existed: on one gemma2:2b answer the
// TRUE sentence ("Kutuzov replaced Barclay de Tolly") wore the ∅ badge
// because the material arranges it as "the Tsar replaced Barclay with
// Kutuzov", and the FALSE sentence ("the Russian army continued to fight")
// wore nothing because "continued" is a verb the material never uses. The
// witness answers the question the relation tier cannot: does any passage
// STATE this sentence?
// The morphology prior (UniMorph, giver named in the file) for the witness's
// company wall: "prepared" and "prepare" are one act. Fetched once, the
// lemmatizer built by the engine's own organ; until it resolves, exact
// match — byte-identical to before this existed (the fetch is data-gated,
// never code-gated, P73's posture).
let sameFormOrgan = null;
PRIOR_LOADS.push(fetch("/eoreader7/native/eval/the-fold/fixtures/unimorph-morphology-prior.json")
  .then((r) => (r.ok ? r.json() : null))
  .then((raw) => { if (raw) { const prior = morphologyFromPrior(raw); sameFormOrgan = nativeLemmatizer(prior.forms, { language: prior.language }).sameAct; } })
  .catch(() => {}));
const witnessTestimony = () => ({ witnessSlice, siblingSwap, foldTestimony, buildSelectMessages, foldSelect, ...(sameFormOrgan ? { sameForm: sameFormOrgan } : {}) });

const witnessAskOrgan = async (s, slice) =>
  readTestimony(await complete(buildWitnessMessages(s, slice), { json: WITNESS_SCHEMA, maxTokens: 200, temperature: 0 }));
const witnessSelectOrgan = async (messages) => {
  try { return JSON.parse(await complete(messages, { json: SELECT_SCHEMA, maxTokens: 120, temperature: 0 })); } catch { return {}; }
};
const witnessSentencesFor = (sentences, claims, passages, { maxAsks }) =>
  witnessSentences(sentences, claims, passages, {
    ask: witnessAskOrgan, selectAsk: witnessSelectOrgan, splitSentences: engineSentences,
    testimony: witnessTestimony(),
    maxAsks,
  });


/** A fetched page kept as a source: remember its saved faces so Ranke can chase from it (the organ reads the page's own HTML for links; the text face for quotes). */
function rememberPageFace(name, url, entry) {
  if (!entry?.rawPath) return;
  state.pageFaces[name] = { url, host: hostOf(url), rawPath: entry.rawPath, textPath: entry.textPath ?? null };
}

// ── /ranke — the primary-source chase, on request ────────────────────────
// Budgets declared per run (P9). RANKE_AUTO_* are the standing budgets the
// switch spends per grounded turn: three faces (giver: primary.js
// PRIMARY_SOURCES_CONSULTED — one perspective is anecdote, three is the
// smallest count where 2-of-3 can disagree with 3-of-3) and one quote
// search (a search is the costlier crossing; one per turn keeps the switch
// from becoming a crawler).
const RANKE_AUTO_FETCHES = 3;
const RANKE_AUTO_SEARCHES = 1;
async function rankeChase({ maxFetches, maxSearches, consult = 3, show = null }) {
  const log = state.hyperlexiconLog;
  if (!log) return { refused: "the hyperlexicon is empty — nothing has been heard yet, so there is nothing to chase." };
  const notes = hyperlexiconFor.foldWithStanding ? hyperlexiconFor.foldWithStanding(log) : hyperlexiconFor.foldHyperlexicon(log);
  const pages = Object.entries(state.pageFaces).map(([ref, f]) => ({ ref, ...f })).filter((p) => p.rawPath);
  if (!pages.length) return { refused: "no fetched page is loaded — Ranke chases from a page's own citations, and none of the loaded sources came from the web." };
  const r = await webApi("/api/ranke", { pages, notes, maxFetches, maxSearches, consult });
  if (r?.error) return { refused: r.error };
  let next = log;
  let landedCount = 0;
  // THE WITNESS reads each lead. The server owns the network and returns
  // LEADS — a primary face at an address carrying the note's words —
  // never a landing: containment is not a vote (measured, ranke.js's own
  // header). The model is the browser's, so the read happens here: the
  // same witness protocol /corroborate uses, over the lead's face, and
  // only the model's own "states" lands a primary: witness. Reads are
  // capped by the SAME declared fetch budget — one lead, one read.
  const ask = async (sen, sl) => readTestimony(await complete(buildWitnessMessages(sen, sl), { json: WITNESS_SCHEMA, maxTokens: 200, temperature: 0 }));
  const selectAsk = async (messages) => { try { return JSON.parse(await complete(messages, { json: SELECT_SCHEMA, maxTokens: 120, temperature: 0 })); } catch { return {}; } };
  const byId = new Map(notes.map((n) => [n.id, n]));
  let reads = 0;
  const verdicts = { states: 0, refused: 0, other: 0 };
  for (const c of r.chased ?? []) {
    const note = byId.get(c.noteId);
    if (!note) continue;
    for (const lead of (c.consulted ?? []).filter((x) => x.snipsFound > 0 && x.unwitnessed)) {
      if (reads >= maxFetches) break;
      reads += 1;
      let text = "";
      try { const res = await fetch(pageFaceUrl(EXPLORE_BASE, lead.snips?.[0]?.facePath ?? "")); if (res.ok) text = await res.text(); } catch { text = ""; }
      if (!text) { verdicts.other += 1; continue; }
      const w = await witnessNote(`${note.subject} ${note.verb} ${note.object}`, { ref: lead.host, text }, { ask, selectAsk, testimony: witnessTestimony(), splitSentences: engineSentences, ends: { end1: note.subject, end2: note.object }, slice: lead.snips[0].text });
      if (w.refused) { verdicts.refused += 1; continue; }
      if (w.verdict !== "states") { verdicts.other += 1; continue; }
      verdicts.states += 1;
      const at = w.because ? text.indexOf(w.because) : -1;
      const span = at >= 0 ? { start: at, end: at + w.because.length, text: w.because } : lead.snips[0];
      const a = hyperlexiconFor.attest(next, note.id, { witness: `primary:${lead.host}#${span.start}-${span.end}~ranke-v1`, span: { ref: lead.host, at: `${lead.host}#${span.start}-${span.end}`, text: span.text }, because: span.text });
      if (!a.refused) { next = a.log; landedCount += 1; c.attested.push(a); }
    }
  }
  r.notesAttested = (r.chased ?? []).filter((c) => c.attested.length).length;
  r.witness = { reads, ...verdicts };
  state.hyperlexiconLog = mergeAppendOnly(state.hyperlexiconLog, next, log, { append: nativeTaskLog.append });
  syncRecords();
  mirrorTermRecord("ranke", { notes: notes.length, pages: pages.length, considered: r.notesConsidered, attested: r.notesAttested, landed: landedCount, fetches: r.fetches, searches: r.searches, refusedPages: (r.pagesRefused ?? []).length, budget: { maxFetches, maxSearches }, via: "chat" });
  logAct("checked", { text: `ranke: ${r.notesAttested} of ${r.notesConsidered} chased notes attested by a primary (${r.fetches} fetches, ${r.searches} searches)` });
  if (show) show(r);
  return { report: r, landedCount, notes: notes.length, pages: pages.length };
}

async function rankeTurn(argstr, typed) {
  const parts = (argstr ?? "").trim().split(/\s+/).filter(Boolean).map(Number);
  const maxFetches = parts[0];
  const maxSearches = Number.isInteger(parts[1]) ? parts[1] : 0;
  if (!Number.isInteger(maxFetches) || maxFetches < 1 || maxSearches < 0)
    return usageTurn(typed, "/ranke <maxFetches> [maxSearches] — chase this conversation's notes from the fetched pages they were read on to the sources those pages cite (any outbound link) or quote without a source (searched, then read). Every source that states a note lands as a primary: witness with a byte address; a page that cites nothing chases nothing. Budgets are YOURS to declare (P9) — e.g. /ranke 6 2. The switch beside 'web' runs a small chase after each grounded turn.");
  addMessage("user", typed);
  const node = addMessage("assistant", "");
  const body = node.querySelector(".body");
  body.textContent = `Ranke: chasing to primary sources — up to ${maxFetches} fetch(es), ${maxSearches} search(es)…`;
  logAct("asked", { text: typed });
  let out;
  try { out = await rankeChase({ maxFetches, maxSearches }); } catch (err) { body.textContent = `the chase failed: ${err?.message ?? err}`; return; }
  if (out.refused) { body.textContent = out.refused; renderFold(node, {}); return; }
  const r = out.report;
  const lines = [
    `Ranke: ${r.notesConsidered} note(s) standing on citing pages alone were chased; ${r.leads ?? 0} lead(s) found (a primary face carrying a note's words); the witness read ${r.witness?.reads ?? 0} and said "states" for ${r.witness?.states ?? 0}; ${r.notesAttested} note(s) now carry a primary witness (${out.landedCount} landed). Spent: ${r.fetches} fetch(es), ${r.searches} search(es) of ${maxFetches}/${maxSearches}.`,
  ];
  if ((r.pagesRefused ?? []).length) lines.push(`pages that cite nothing (not chased from): ${r.pagesRefused.map((p) => p.ref).join(", ")}`);
  for (const c of (r.chased ?? []).slice(0, 8)) {
    const hits = (c.consulted ?? []).filter((x) => x.snipsFound > 0);
    const gaps = (c.consulted ?? []).filter((x) => x.gap);
    lines.push(`  ${c.attested.length ? "✓" : "·"} ${c.note} — ${c.leads.links} link lead(s), ${c.leads.quotes} unsourced quote(s); read ${(c.consulted ?? []).length - gaps.length}, stated by ${hits.length}${gaps.length ? `, ${gaps.length} could not be read` : ""}${hits.length ? ` — ${hits.map((h) => h.host).join(", ")}` : ""}`);
  }
  body.textContent = lines.join("\n");
  renderFold(node, {});
}


// ── /declare · /derive · /concede — derivation and recourse (Pass 21, P102) ─
const DECLARE_USAGE = "/declare <relation> transitive — or — /declare <relation> composes <product>: declare, as yourself, what a relation does, so the record may derive what follows. Nothing is derived from an undeclared relation, and every derived fact names its giver. Bare /declare lists the register.";
function declareTurn(argstr, typed) {
  const arg = (argstr ?? "").trim();
  const fold = foldDeclarations(state.declarations);
  if (!arg) {
    const lines = [
      `declared (given): ${fold.given.length ? fold.given.map((g) => `${g.rel} ${g.declKind}${g.yields ? ` → ${g.yields}` : ""} — giver ${g.giver}`).join("; ") : "none"}`,
      `conceded: ${fold.conceded.length}`,
    ];
    return usageTurn(typed, lines.join("\n"));
  }
  const m = arg.match(/^(\S+)\s+(transitive|composes)(?:\s+(\S+))?$/i);
  if (!m) return usageTurn(typed, DECLARE_USAGE);
  const [, rel, kindRaw, yields] = m;
  const kind = kindRaw.toLowerCase();
  if (kind === "composes" && !yields) return usageTurn(typed, DECLARE_USAGE);
  const giver = `person:chat (declared in this conversation, ${new Date().toISOString().slice(0, 10)})`;
  try {
    if (fold.given.some((g) => g.rel === rel && g.declKind === kind)) return usageTurn(typed, `already declared: ${rel} ${kind}.`);
    const proposed = proposeDeclaration(state.declarations, { kind, rel, ...(yields ? { yields } : {}), acquisition: "declared", source: "chat: the person's own declaration" });
    const promoted = promoteDeclaration(proposed.log, proposed.id, { giver });
    if (!promoted.ok) return usageTurn(typed, `refused: ${JSON.stringify(promoted.refusal)}`);
    state.declarations = promoted.log;
    syncRecords();
    mirrorTermRecord("declare", { rel, kind, yields: yields ?? null, giver, via: "chat" });
    return usageTurn(typed, `declared: ${rel} is ${kind}${yields ? ` (composing into ${yields})` : ""} — giver: ${giver}. /derive to see what follows.`);
  } catch (e) { return usageTurn(typed, `refused: ${e?.message ?? e}`); }
}

// /void — the voids the reader declared, each with its scope and its
// timeline (declared / filled / conceded, at its seq); `/void! <id>` takes
// one back with a recorded trigger (REC), the same act `/concede!` performs
// on a premise. A void is never deleted: a conceded void stays in the
// timeline with its concession after it.
function voidTurn(argstr, typed, { perform = false } = {}) {
  const log = state.hyperlexiconLog;
  if (!log || !hyperlexiconFor.foldVoids) return usageTurn(typed, "the hyperlexicon is empty — nothing has been read yet, so no gap has been declared over it.");
  const id = (argstr ?? "").trim();
  if (id) {
    const t = hyperlexiconFor.voidTimeline(log, id);
    if (t.standing === "undeclared") return usageTurn(typed, `no such gap on the record: ${id}`);
    if (perform) {
      const r = hyperlexiconFor.concede(log, id, { trigger: `withdrawn in this conversation: ${typed}` });
      if (r.refused) return usageTurn(typed, `not withdrawn: ${r.refused.type} — ${r.refused.detail ?? ""}`);
      state.hyperlexiconLog = mergeAppendOnly(state.hyperlexiconLog, r.log, log, { append: nativeTaskLog.append });
      syncRecords();
      mirrorTermRecord("void-concede", { id, via: "chat" });
      return usageTurn(typed, `withdrawn: ${id} · timeline ${hyperlexiconFor.voidTimeline(state.hyperlexiconLog, id).events.map((e) => `${e.act}@${e.at}`).join(" → ")}`);
    }
    return usageTurn(typed, `${id} · standing ${t.standing} · timeline ${t.events.map((e) => `${e.act}@${e.at}${e.by ? ` by ${e.by}` : ""}`).join(" → ")}`);
  }
  const rows = voidsNow();
  if (!rows.length) return usageTurn(typed, "no open gap on the record — every declared void has been filled or withdrawn, or none was declared.");
  const lines = [`${rows.length} open gap(s) on the record — declared by the reader with its scope, cancelled by the first arrival that fills one:`];
  for (const v of rows.slice(0, 20)) lines.push(`  ${v.id} · ${v.subject} —${v.verb}→ ? · looked for in ${v.scope?.sources?.length ?? "?"} source(s), ${v.scope?.read ?? "?"} of ${v.scope?.total ?? "?"} parts read · reached ${v.reached} · declared@${v.declaredAt}`);
  lines.push("`/void <id>` shows one gap's timeline; `/void! <id>` withdraws it with a recorded trigger.");
  return usageTurn(typed, lines.join("\n"));
}

// /essay <pages> <topic> [url …] — long-form (P108). The same holonic turn
// every checked answer runs — plan, then one part at a time, each part
// retrieving over the attached material and checked by the same ladder —
// with the two numbers a PIECE needs declared here instead of defaulted:
// the section count (from the page count, at ESSAY_WORDS_PER_PAGE words a
// page and ESSAY_WORDS_PER_SECTION a section) and the per-part draft
// budget. A URL in the ask is fetched and attached by the named-source path
// (P23) before the plan, so the essay stands on read bytes where it can;
// what it says that nothing backs is marked and counted like any turn.
const ESSAY_WORDS_PER_PAGE = 500;      // a manuscript page, double-spaced (giver: the common editorial convention)
const ESSAY_WORDS_PER_SECTION = 650;   // what a 1,100-token draft budget yields at ~0.6 words/token on the small mouths (measured 2026-09-05: gemma2:2b 18 tok/s)
const ESSAY_PART_TOKENS = 1100;
const ESSAY_MAX_SECTIONS = 40;
function essayTurn(argstr, typed) {
  const m = String(argstr ?? "").trim().match(/^(\d+)\s+(.+)$/s);
  if (!m) return usageTurn(typed, "`/essay <pages> <topic> [url …]` — a long-form piece, planned into sections sized to the page count, each section retrieved and checked like any answer. The plain ask works too: \"write me a 30-page essay on …\".");
  const lf = detectLongForm(`write a ${m[1]}-page essay on ${m[2].trim()}`);
  if (!lf) return usageTurn(typed, "could not read a length and a topic from that.");
  return longFormTurn(lf, typed);
}
// ── A PROGRAM asked for by its shape (Pass 30 / P112) ─────────────────────
// The piece machinery pointed at code. One build, born from the first
// feature; every later feature lands as a PATCH through the same door a
// complaint uses (`foldTurn` — scout, smallest edit, witness gate, record);
// after every landing the sandbox runs the whole and the OUTCOME is the
// witness (never the model's say-so); a failed run is said back once as a
// fact with the run's own last line; coverage is measured against the
// spec's own features by the code's declared names; the editor's finding
// (a name declared twice) is one more instruction. Every step is on the
// record.
async function runBuildOnce(entry) {
  const fold = buildFold(entry, null);
  const lang = fold?.seg?.lang;
  if (!autoRunnable(lang)) return { skipped: `no sandbox runtime for ${lang ?? "this"}` };
  const before = entry.log.entries.length;
  const outcome = await runSandboxed(lang, fold.code ?? "");
  entry.log = buildLog.attachRun(entry.log, { params: { lang, timeoutMs: null, maxOutput: KEEP_PER_EXEC, sandboxed: true }, outcome: { ok: outcome.code === 0 && !outcome.timedOut, data: outcome } });
  entry.cursor = null;
  mirrorBuild(entry, before);
  persistBuilds();
  renderBuilds(entry.n);
  return { ok: outcome.code === 0 && !outcome.timedOut, outcome, summary: autoRunSummary(outcome) };
}
const CODE_PIECE_BODY_TOKENS = 700;   // one function body per ask (P117)
const CODE_PIECE_FIXES = 1;           // one fix per failing function, named by the traceback
async function codePieceTurn(cp, typed) {
  addMessage("user", typed);
  const node = addMessage("assistant", "");
  node.querySelector(".who").textContent = "program";
  const body = node.querySelector(".body");
  const lines = [];
  const say = (l) => { lines.push(l); body.textContent = lines.join("\n"); };
  const sentCalls = [];
  const call = async (messages, opts = {}) => { sentCalls.push({ n: sentCalls.length + 1, messages }); return complete(messages, { ...opts, model: state.model }); };
  if (!CODE_RUNTIMES.includes(cp.lang)) { say(`no skeleton for ${cp.lang} yet — the code piece builds ${CODE_RUNTIMES.join(" and ")} programs; the ordinary /run and /fold doors still take ${cp.lang}.`); releaseBusy(); return; }
  // NUL → SIG → INS → CON → SYN, all mechanical: the spec's clauses in their own order are the dependency order; names off the clauses; the skeleton born as a build with a pipeline main.
  const sk = skeletonFor(cp.lang, cp.spec, cp.features);
  publishBuild({ type: "code", lang: cp.lang, code: sk.code }, `${cp.lang}: ${cp.spec.slice(0, 60)}`, typed);
  const entry = state.builds.at(-1);
  const n = entry.n;
  say(`fold ${n} born as a skeleton, no model: ${sk.names.length} function(s) — ${sk.names.join(" → ")} — wired in order into main (${sk.code.length} chars, the instrument's)`);
  mirrorTermRecord("codepiece-plan", { lang: cp.lang, spec: cp.spec, parts: sk.names, via: "chat" });
  let r0 = await runBuildOnce(entry);
  say(`skeleton run: ${r0.summary ?? r0.skipped} (the first stub refusing is the expected witness)`);
  // SEG → EVA → REC, one function at a time: the snip is all the model sees; the run is the witness; the traceback names what to fix.
  let refusals = 0, fixes = 0, okRuns = 0, helpers = 0;
  const filledNames = [];
  let witnessed = {};
  const clauseOf = new Map(sk.names.map((nm, i) => [nm, cp.features[i]]));
  const land = (code, reason) => { entry.log = buildLog.reviseBuild(entry.log, { code, reason }); entry.cursor = null; mirrorBuild(entry, entry.log.entries.length - 1); persistBuilds(); renderBuilds(entry.n); };
  const fillOne = async (name, clause, { note = "", prev = null, next = null } = {}) => {
    const cur = buildFold(entry, null)?.code ?? "";
    const snip = snipFor(cp.lang, cur, name, clause, { previousClause: prev ? clauseOf.get(prev) ?? null : null, previousValue: prev ? witnessed[prev] ?? null : null, nextClause: next ? clauseOf.get(next) ?? null : null });
    if (!snip) return { refused: { type: "no_region" } };
    const reply = await call([{ role: "user", content: snip.ask + note }], { maxTokens: CODE_PIECE_BODY_TOKENS });
    const sp = spliceFunction(cp.lang, cur, name, reply);
    if (sp.refused) return { refused: sp.refused };
    land(sp.code, `${name}: ${note ? "fix" : "body"} from the model, spliced by the instrument`);
    if (!filledNames.includes(name)) filledNames.push(name);
    return { refused: null, chars: sp.modelChars };
  };
  const runAndWitness = async () => { const r = await runBuildOnce(entry); witnessed = { ...witnessed, ...stepWitnesses(`${r.outcome?.stdout ?? ""}\n${r.outcome?.stderr ?? ""}`) }; return r; };
  // REC in dependency order: a run naming a function that fails is asked once for that function; a run naming an UNDEFINED name gets a stub for it (INS) and that stub is filled next (SEG) — the program grows the dependency the model reached for, bounded.
  const CODE_PIECE_HELPERS = 2;
  const repair = async (name, r) => {
    let fixed = false;
    // Mechanical repairs first, the runtime's own witness deciding, no model:
    // a near-miss name the traceback itself corrects; an undefined name an
    // imported module carries (the sandbox is asked which). Each is landed
    // as its own version with its reason.
    for (let m = 0; m < 2 && r.ok === false; m += 1) {
      const stderr = r.outcome?.stderr ?? "";
      const cur = buildFold(entry, null)?.code ?? "";
      const dym = didYouMean(stderr);
      if (dym) { const rn = renameCalls(cur, dym.wrong, dym.right); if (rn.count) { land(rn.code, `${dym.wrong} → ${dym.right}: the traceback's own correction, ${rn.count} call site(s), no model`); say(`${name} called ${dym.wrong}; the run said it meant ${dym.right} — renamed ${rn.count} call(s), no model`); r = await runAndWitness(); continue; } }
      const missingName = (stderr.match(/NameError: name '([A-Za-z_]\w*)' is not defined/) ?? [])[1] ?? null;
      if (missingName && cp.lang === "python") {
        const mods = importedModules(cp.lang, cur);
        let found = null;
        try { const probe = await runSandboxed("python", moduleProbe(cp.lang, missingName, mods)); found = (probe.stdout ?? "").trim().split(",").filter(Boolean)[0] ?? null; } catch { found = null; }
        if (found) { const q = qualifyCalls(cur, missingName, found); if (q.count) { land(q.code, `${missingName} → ${found}.${missingName}: the sandbox found it on an imported module, ${q.count} call site(s), no model`); say(`${name} called ${missingName} bare; the sandbox found it on ${found} — qualified ${q.count} call(s), no model`); r = await runAndWitness(); continue; } }
      }
      break;
    }
    for (let k = 0; k < CODE_PIECE_FIXES && r.ok === false; k += 1) {
      const stderr = r.outcome?.stderr ?? "";
      const missing = stubMissing(cp.lang, buildFold(entry, null)?.code ?? "", stderr);
      if (missing.name && helpers < CODE_PIECE_HELPERS) {
        helpers += 1;
        land(missing.code, `${missing.name}: stub added — the run named it as undefined (dependency, INS)`);
        clauseOf.set(missing.name, `is the helper that ${name} calls as ${missing.name}`);
        say(`${name} reached for ${missing.name}, which did not exist — stubbed it in dependency order and asking for its body`);
        const f = await fillOne(missing.name, clauseOf.get(missing.name), { prev: null, next: null });
        if (f.refused) break;
        fixes += 1;
        r = await runAndWitness();
        continue;
      }
      if (failingFunction(cp.lang, stderr, [...sk.names, ...filledNames]) !== name) break;
      const last = stderr.trim().split("\n").filter(Boolean).pop() ?? "it failed";
      const f = await fillOne(name, clauseOf.get(name), { note: `\n\nWhen run, it failed with: ${last.slice(0, 160)}` });
      if (f.refused) break;
      fixes += 1;
      r = await runAndWitness();
    }
    if (r.ok !== false) fixed = true;
    return { r, fixed };
  };
  for (const [i, name] of sk.names.entries()) {
    const clause = cp.features[i];
    const filled = await fillOne(name, clause, { prev: sk.names[i - 1] ?? null, next: sk.names[i + 1] ?? null });
    if (filled.refused) { refusals += 1; say(`${name}: the reply was not that function (${filled.refused.type}) — stub kept`); mirrorTermRecord("codepiece-part", { fold: n, part: name, refused: filled.refused.type, via: "chat" }); continue; }
    let r = await runAndWitness();
    let fixed = false;
    // DEF, witnessed: a step that returned nothing when a next step consumes
    // `previous` broke the pipeline's contract — the run's own witness says
    // so ("NoneType: None"), and the mouth is told that fact once.
    if (i < sk.names.length - 1 && /^NoneType: None$/.test(witnessed[name] ?? "")) {
      const f = await fillOne(name, clause, { prev: sk.names[i - 1] ?? null, next: sk.names[i + 1], note: `\n\nWhen run, ${name} returned None, but the next step needs its result as \`previous\`. Return the value instead of only printing it.` });
      if (!f.refused) { fixes += 1; r = await runAndWitness(); say(`${name} returned nothing; told so, asked once — now ${witnessed[name] ?? "unwitnessed"}`); }
    }
    const stubNext = r.ok === false && i < sk.names.length - 1 && new RegExp(`NotImplementedError[^\\n]*${sk.names[i + 1]}|not implemented: ${sk.names[i + 1]}`).test(r.outcome?.stderr ?? "");
    if (r.ok === false && !stubNext) ({ r, fixed } = await repair(name, r));
    if (r.ok) okRuns += 1;
    const w = witnessed[name] ? ` · witnessed: ${witnessed[name].slice(0, 80)}` : "";
    say(`${name} (${filled.chars} chars from the model) — ${r.summary ?? r.skipped}${fixed ? " (after repair)" : ""}${stubNext ? " — the next stub refusing, as expected" : ""}${w}`);
    mirrorTermRecord("codepiece-part", { fold: n, part: name, ok: r.ok ?? null, fixed, chars: filled.chars, witnessed: witnessed[name] ?? null, via: "chat" });
  }
  const final = await runAndWitness();
  const code = buildFold(entry, null)?.code ?? "";
  const modelChars = modelRegions(cp.lang, code, filledNames);
  const share = modelShare(modelChars, code.length);
  say(`done: fold ${n} · ${sk.names.length} function(s) + ${helpers} helper(s) the model reached for, ${refusals} refused · final run ${final.summary ?? final.skipped} · the model wrote ${modelChars} of ${code.length} chars (${Math.round((share ?? 0) * 100)}%); the instrument wrote the rest · ${fixes} fix(es)`);
  mirrorTermRecord("codepiece-done", { fold: n, lang: cp.lang, parts: sk.names.length, helpers, refusals, fixes, finalOk: final.ok ?? null, modelChars, totalChars: code.length, modelShare: share, witnessed, via: "chat" });
  state.history.push({ role: "user", content: typed }, { role: "assistant", content: lines.join("\n") });
  renderFold(node, { sent: sentCalls });
  renderThreads();
  $("status").textContent = readyLine();
  releaseBusy();
}

// exportLastPiece — the two faces of the last piece (P121), built from the
// kept sections: every sentence placed again by the ladder, its verbatim
// spans sliced from the passages, the markdown with footnotes and text-
// fragment links, the html with data-anchors, the json sidecar — handed to
// the explore server to keep under record/pieces/, the links shown.
async function exportLastPiece(node = null) {
  const piece = state.lastPiece;
  if (!piece) return null;
  const passages = new Map();
  for (const s of piece.sections) for (const p of s.passages ?? []) if (p?.ref) passages.set(p.ref, { text: p.text ?? "" });
  for (const [name, text] of Object.entries(state.sources)) if (!passages.has(name)) passages.set(name, { text });
  const fold = (t) => String(t ?? "").toLowerCase();
  const sections = piece.sections.map((s) => {
    // The engine's splitter returns { text, offset } rows; the strings are what the ladder and the export read.
    const sents = engineSentences(String(s.text ?? "")).map((x) => String(x?.text ?? x ?? "").trim()).filter(Boolean);
    const claims = (s.relations?.claims ?? []).map((c) => ({ ...c, sentence: c.sentence ?? sents.find((x) => fold(x).includes(fold(c.end1 ?? c.subject).split(" ")[0] ?? "") && fold(x).includes(fold(c.label ?? c.verb))) ?? null }));
    return { label: s.part?.label ?? s.label ?? "", snipCheck: s.piece?.snipCheck ?? null, sentences: sents.map((text) => {
      const own = claims.filter((c) => c.sentence === text);
      const wrow = (s.witness?.rows ?? []).find((r) => r.sentence === text) ?? null;
      const g = piece.ground ? groundOf(text, { ...piece.ground, claims: own, witness: wrow, model: piece.model }) : { tier: "self", cell: "self:model", addresses: [], phrase: piece.model ?? "the model" };
      return { text, ground: { ...g, claims: own, decider: wrow?.decider ?? null } };
    }) };
  });
  const out = exportPiece({ title: piece.title, ask: piece.ask, model: piece.model, sections, passages, urls: piece.urls, prompts: piece.prompts, generatedAt: piece.generatedAt, stats: `${piece.depthLine ? `${piece.depthLine} ` : ""}Tally: ${Object.entries(out0Tally(sections)).map(([k, v]) => `${v} ${k}`).join(", ")}.` });
  const slug = String(piece.title).slice(0, 40);
  let files = null;
  try {
    const r = await fetch(`${EXPLORE_BASE}/api/piece-export`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, md: out.md, html: out.html, json: out.json }) });
    if (r.ok) files = (await r.json()).files;
  } catch {}
  const line = files ? `exported — markdown ${pageFaceUrl(EXPLORE_BASE, files.md)} · html ${pageFaceUrl(EXPLORE_BASE, files.html)} · json ${pageFaceUrl(EXPLORE_BASE, files.json)} · ${out.notes} note(s), ${JSON.stringify(out.tally)}` : `export built (${out.md.length} chars md) — the explore server is not reachable, nothing kept`;
  if (node) { const p = document.createElement("p"); p.className = "piece-links"; if (files) { for (const [k, v] of Object.entries(files)) { const a = document.createElement("a"); a.href = pageFaceUrl(EXPLORE_BASE, v); a.target = "_blank"; a.rel = "noopener"; a.textContent = `⬇ ${k}`; a.style.marginRight = "0.8em"; p.append(a); } } else p.textContent = line; node.querySelector(".body")?.append(p); }
  mirrorTermRecord("piece-export-built", { title: piece.title, files, tally: out.tally, notes: out.notes, via: "chat" });
  return { files, out, line };
}
const out0Tally = (sections) => { const t = {}; for (const s of sections) for (const x of s.sentences) t[x.ground?.tier ?? "?"] = (t[x.ground?.tier ?? "?"] ?? 0) + 1; return t; };
function exportTurn(typed) {
  if (!state.lastPiece) return usageTurn(typed, "no piece to export yet — ask for one (\"write me a 20 page essay on …\") and it is exported when it lands; `/export` writes the last one again.");
  addMessage("user", typed);
  const node = addMessage("assistant", "");
  node.querySelector(".who").textContent = "export";
  node.querySelector(".body").textContent = "exporting the last piece…";
  exportLastPiece(node).then((r) => { node.querySelector(".body").textContent = r?.line ?? "export failed"; }).catch((e) => { node.querySelector(".body").textContent = `export failed: ${e?.message ?? e}`; });
  return Promise.resolve();
}

// longFormTurn — the same holonic turn every checked answer runs (plan,
// then one part at a time, each part retrieving over the material and
// checked by the same ladder), with the numbers a PIECE needs declared:
// the section count from the stated length, the per-part draft budget, and
// a topic-anchored search for material before the plan (P23's preflight,
// forced here and unioned with whatever is attached — a 30-page piece on a
// subject nothing attached covers must find its ground first).
function longFormTurn(lf, typed) {
  return holonicTurn(longFormTask(lf), typed, "model", {
    label: lf.kind ?? "piece",
    longForm: lf,
    piece: {
      topic: lf.topic, pages: lf.pages, words: LONGFORM_WORDS_PER_SECTION,
      register: "Written for a university reader: an argument with specifics drawn from the sources, not a summary of them.",
      // Entities: the cast the section's own passages establish (P110).
      referentIndexFor,
      // The per-section hunt (P110): the section's own words as the query,
      // through the same crossing the preflight uses, under the same
      // standing consent; a small leash per section.
      huntFor: state.webProof ? async (q) => { const r = await gatherPreflightMaterial(q, "", null, { pagesConsulted: LONGFORM_SECTION_PAGES, query: q }); return r.chunks ?? []; } : null,
    },
    maxParts: lf.sections,
    executeMaxTokens: LONGFORM_PART_TOKENS,
    planMaxTokens: 60 * lf.sections + 120,
    passagesPerPart: 4,
  });
}

function deriveTurn(argstr, typed) {
  const maxSteps = Math.max(1, Math.min(25, Number((argstr ?? "").trim()) || 6));
  const log = state.hyperlexiconLog;
  if (!log) return usageTurn(typed, "the hyperlexicon is empty — nothing has been read yet, so there is nothing to derive from.");
  const fold = foldDeclarations(state.declarations);
  if (!fold.given.length) return usageTurn(typed, "nothing is declared — a derivation needs a giver. " + DECLARE_USAGE);
  let dv;
  try {
    // carry: true — a single-source premise is ADMITTED and its fragility
    // carried (P89); the floor is the honest one for a chat ledger (P89's own
    // note: live witnesses carry recipes now, so instruments 0 is declared,
    // never inferred).
    dv = derivationFor.derive(log, { declarations: state.declarations, floor: { sources: 1, instruments: 0 }, carry: true, maxSteps });
  } catch (e) { return usageTurn(typed, `derivation refused: ${e?.message ?? e}`); }
  state.hyperlexiconLog = mergeAppendOnly(state.hyperlexiconLog, dv.log, log, { append: nativeTaskLog.append });
  syncRecords();
  const rows = derivedNow();
  const lines = [
    `derived: ${dv.derived.length} this run (${dv.derived.filter((d) => d.landed === "new").length} new) · ${rows.length} live on the record · premises ${dv.premises.length} (${(dv.carried ?? []).length} below the floor, carried) · withheld ${dv.withheld?.length ?? 0} · vetoed ${dv.vetoed?.length ?? 0} · steps ${dv.quiescent ? "quiescent" : "capped"}`,
  ];
  for (const d of rows.slice(0, 12)) lines.push(`  ${d.subject} —${d.verb}→ ${d.object} · depth ${d.depth} · rests on ${d.premises.length} claim(s), weakest at ${d.restsOn?.sources ?? "?"} source(s)${d.restsOn?.contested ? `, ${d.restsOn.contested} disputed` : ""} · giver ${String(d.giver ?? "").slice(0, 40)} · premises: ${d.premises.join(" ; ")}`);
  if (rows.length > 12) lines.push(`  … ${rows.length - 12} more`);
  mirrorTermRecord("derive", { derived: dv.derived.length, live: rows.length, premises: dv.premises.length, via: "chat" });
  return usageTurn(typed, lines.join("\n"));
}

function concedeTurn(argstr, typed, { perform = false } = {}) {
  const id = (argstr ?? "").trim();
  const log = state.hyperlexiconLog;
  if (!id) return usageTurn(typed, "/concede <note id> shows what would fall if that claim were withdrawn; /concede! <note id> withdraws it, and every derived fact resting on it, on the record — never deleted, always recorded with its reason. Note ids are the ones /derive prints as premises.");
  if (!log) return usageTurn(typed, "the hyperlexicon is empty — nothing to concede.");
  const exposure = derivationFor.exposure(log, id);
  if (!perform) {
    const lines = [`conceding ${id} would withdraw ${exposure.withdrawn.length} derived fact(s)${exposure.depth ? ` (cascade depth ${exposure.depth})` : ""}:`];
    for (const w of exposure.withdrawn) lines.push(`  ${w.subject} —${w.verb}→ ${w.object} (via ${w.cascadedFrom}, depth ${w.cascadeDepth})`);
    lines.push(`to do it: /concede! ${id}`);
    return usageTurn(typed, lines.join("\n"));
  }
  const r = derivationFor.concedePremise(log, id, { trigger: `conceded by the person in chat (${new Date().toISOString().slice(0, 10)})` });
  if (r.refused) return usageTurn(typed, `refused: ${JSON.stringify(r.refused)}`);
  state.hyperlexiconLog = mergeAppendOnly(state.hyperlexiconLog, r.log, log, { append: nativeTaskLog.append });
  syncRecords();
  mirrorTermRecord("concede", { id, withdrawn: r.withdrawn.length, via: "chat" });
  return usageTurn(typed, `conceded ${id}; withdrawn ${r.withdrawn.length} derived fact(s): ${r.withdrawn.map((w) => `${w.subject} —${w.verb}→ ${w.object}`).join("; ") || "none"}. The record kept every entry; the fold no longer carries them.`);
}

async function corroborateTurn(argstr, typed) {
  const maxAsks = Number((argstr ?? "").trim());
  if (!Number.isInteger(maxAsks) || maxAsks < 1)
    return usageTurn(typed, "/corroborate <maxAsks> — walk this conversation's own hyperlexicon against the loaded sources with the witness protocol, so accumulated notes can earn second, independent votes, and so a source that denies a note lands that denial as a typed dispute. <maxAsks> is the model-call budget and is YOURS to declare (P9) — e.g. /corroborate 20. Every note already reaches the ledger block the model sees, ranked by relevance with its standing disclosed (P84); this walk changes what that standing says.");
  if (!state.ready) return usageTurn(typed, "no model connected — corroboration asks a witness, and there is nobody to ask.");
  const log = state.hyperlexiconLog;
  const notes = log ? hyperlexiconFor.foldHyperlexicon(log) : [];
  if (!notes.length) return usageTurn(typed, "the hyperlexicon is empty — nothing has been heard yet this session, so there is nothing to corroborate.");
  const sources = Object.entries(state.sources ?? {}).map(([name, text]) => ({ ref: name, text })).filter((s) => s.text);
  if (!sources.length) return usageTurn(typed, "no sources loaded — a witness reads a source, and there is nothing to read.");

  addMessage("user", typed);
  const node = addMessage("assistant", "");
  const body = node.querySelector(".body");
  body.textContent = `corroborating: ${notes.length} note(s) against ${sources.length} source(s), budget ${maxAsks} ask(s)…`;
  logAct("asked", { text: typed });

  const ask = async (s, slice) =>
    readTestimony(await complete(buildWitnessMessages(s, slice), { json: WITNESS_SCHEMA, maxTokens: 200, temperature: 0 }));
  // SELECT is the default protocol: the model POINTS at a mechanically
  // gathered stating sentence by index and never writes a because. Measured
  // at full budget on one real two-page ledger (2026-09-02): select attested
  // 33 of 103 asks, generate 13 of 119, both at zero attests on planted
  // fabrications — the same walk, the same budget, 2.5x the recall. The
  // generate path stays as witnessNote's own fallback when no co-present
  // candidate can be offered.
  const selectAsk = async (messages) => {
    try { return JSON.parse(await complete(messages, { json: SELECT_SCHEMA, maxTokens: 120, temperature: 0 })); } catch { return {}; }
  };
  let report;
  try {
    report = await corroborateLedger(log, hyperlexiconFor, sources, {
      ask, selectAsk, splitSentences: engineSentences,
      testimony: witnessTestimony(),
      maxAsks,
    });
  } catch (err) {
    body.textContent = `corroboration failed: ${err?.message ?? err}`;
    return;
  }
  state.hyperlexiconLog = mergeAppendOnly(state.hyperlexiconLog, report.log ?? log, log, { append: nativeTaskLog.append });
  syncRecords();

  // The render is corroboration-report.js (pure, tested against the organ's
  // real return shape): `standings` is KEYED, and a contradiction has been a
  // LANDED dispute since P88 — the previous render filtered a keyed object and
  // threw right after the ledger was written back (Pass 15).
  const shown = corroborationLines(report, { maxAsks, sourceCount: sources.length });
  body.textContent = shown.lines.join("\n");
  renderFold(node, {});
  mirrorTermRecord("corroborate", {
    asks: report.asks, budget: maxAsks, attested: report.attested.length,
    contradicted: report.contradicted.length, landed: shown.landed, refused: shown.refused,
    skipped: report.skippedNoCopresence,
    settled: shown.settled, notes: notes.length, sources: sources.length, via: "chat",
  });
  logAct("checked", { text: `corroborate: ${report.attested.length} attested of ${report.asks} asks` });
}

async function actTurn(argstr, typed) {
  const actLine = argstr.trim();
  if (!actLine) {
    return usageTurn(
      typed,
      "/act <verb> [<object>] at <terrain> from <stance> [ground <g> broken:<p>] [because <t>] [supersedes <id>] [warrant:<giver>] — the same composition law the terminal's `act` command reads (open the terminal and type `grid legend` for the verbs, terrains, and stances). Acts land on the SAME log the terminal's `grid`/`capacities` commands read — compose from either surface, see it from both.",
    );
  }
  const landed = landAct(grid, state.gridLog, actLine, { sources: state.sources, runCapacity });
  if (!landed.ok) {
    mirrorTermRecord("term-act-refused", { line: actLine.slice(0, 2000), refusal: landed.refusal.type, detail: landed.refusal.detail, via: "chat" });
    return usageTurn(typed, `refused (${landed.refusal.type}): ${landed.refusal.detail}`);
  }
  state.gridLog = landed.log; syncRecords();
  mirrorTermRecord("term-act", {
    verb: landed.event.verb,
    ops: landed.event.ops,
    object: landed.event.object,
    terrain: landed.event.terrain,
    stance: landed.event.stance.cell,
    ids: landed.ids,
    via: "chat",
  });
  const objectPart = landed.event.object ? `${landed.event.object} ` : "";
  const lines = [`${landed.event.verb} ${objectPart}[${landed.event.ops.join("+")}] at ${landed.event.terrain} from ${landed.event.stance.cell} → ${landed.ids.join(", ")}`];
  if (landed.capacity) {
    const { result } = landed.capacity;
    if (result.gap === "no_material") {
      lines.push(result.detail);
    } else if (landed.event.verb === "distinguish") {
      mirrorTermRecord("term-capacity-run", { id: "cast", source: landed.event.ground, count: result.count, referents: result.referents.map((r) => r.surface), via: "chat" });
      lines.push(`cast · ${result.count} referent${result.count === 1 ? "" : "s"} found in "${landed.event.ground}": ${result.referents.map((r) => r.surface).join(", ") || "(none)"}`);
    } else if (landed.event.verb === "evaluate") {
      lines.push(formatEvaluateOutcome(grid, landed));
    }
  }
  return usageTurn(typed, lines.join("\n"));
}

/**
 * The plain-language account of a computed evaluate — "EVA the
 * hypergraph, with provenance" rendered for a reader, not the raw RESULT
 * payload. `grid.foldGrid` is re-read here rather than trusting a locally
 * recomputed verdict, so this always shows exactly what the record itself
 * will show on a later `grid`/`/self` read — one source of truth, not two
 * that could drift. `computed, not generated`, tables.js's own house
 * phrase, reused rather than invented for this door.
 */
function formatEvaluateOutcome(grid, landed) {
  const evaId = landed.ids[landed.ids.length - 1];
  const { acts } = grid.foldGrid(landed.log);
  const act = acts.find((a) => a.task_id === evaId);
  const claim = act?.result?.claim ?? landed.event.object;
  if (act?.verdict === "holds" || act?.verdict === "refused") {
    const squaring = act.result?.squaring;
    const squaredNote = squaring?.trusted
      ? `squared against its own negation — confirmed`
      : `squared against its own negation — no confirmation`;
    return `evaluate · "${claim}" ${act.verdict} against "${landed.event.ground}" (${squaredNote}) — computed, not generated`;
  }
  const raw = act?.result?.judged?.verdict ?? act?.result?.rawVerdict ?? "unbound";
  const reason =
    act?.result?.rawVerdict === "holds" && act?.result?.objectCheck?.trusted === false
      ? `a real edge shares some of the claim's own words but not all of them (checked: ${act.result.objectCheck.claimTokens.join(", ")}) — the material does not state this specific claim, only something that resembles it`
      : act?.result?.rawVerdict && act?.result?.squaring?.trusted === false
        ? `the claim's own negation, checked the same way, could not be told apart from the claim itself — this sentence shape's own polarity reading cannot be trusted`
        : `the material does not settle this (raw reading: ${raw})`;
  return `evaluate · "${claim}" is undetermined against "${landed.event.ground}" (${reason})`;
}

/**
 * The plain-language account of a sandboxed run — `/run`'s own version of
 * autoRunAndDisclose's `autoRunSummary`, unabridged. That one truncates
 * to fit inline in a build chip's own text; here the run's captured
 * output IS the turn's answer, so the full stdout/stderr ships (already
 * bounded by the sandbox worker's own output, exactly as any other
 * terminal command's is). Plain text, not a markdown fence: `.body`/
 * `.prose` both render `white-space: pre-wrap` (index.html), so a python
 * body's own indentation and a sql table's column alignment already read
 * correctly without one.
 */
function formatRunOutcome(outcome) {
  const head = outcome.timedOut
    ? `timed out after ${outcome.durationMs.toLocaleString()}ms — nothing more ran within this runtime's own budget`
    : `finished in ${outcome.durationMs.toLocaleString()}ms`;
  const out = (outcome.stdout ?? "").trim();
  const err = (outcome.stderr ?? "").trim();
  const parts = [head];
  if (out) parts.push(out);
  if (err) parts.push(outcome.code === 0 && !outcome.timedOut ? `stderr:\n${err}` : err);
  if (!out && !err && !outcome.timedOut) parts.push("(no output)");
  return parts.join("\n\n");
}

/**
 * /run <runtime>\n<code> — the chat's own door onto the SAME sandboxed
 * Workers the terminal's own runtimes and the model's own auto-run
 * (autoRunAndDisclose, above) already execute inside: `runSandboxed`
 * (term.js), the identical function, called the identical way. No new
 * machine-execution path exists anywhere in this repo for this door to
 * add — P18 stands exactly as written: nothing typed here reaches the
 * machine, every run still terminates in the js/python/sql Workers with
 * their egress severed at boot.
 *
 * What this door actually closes: auto-run only ever sees a code segment
 * the MODEL just produced inside this turn's own fold, fire-and-forget,
 * no click needed — it already covers "the model's own code runs
 * safely." A person typing or pasting code straight into the composer had
 * no door at all until this one; that is the gap `/run` fills, and it is
 * deliberately a typed command rather than a ▶-style button drawn onto a
 * rendered segment, which would sit on the identical segments auto-run
 * already runs and add nothing.
 *
 * EXPLICIT-TRIGGER ONLY, matching /act/self/priors/learn — checked among
 * the other typed doors in send(), before any automatic detector or the
 * widget router gets a look at the question. `parseRunCommand` only
 * claims a turn typed as `/run <runtime>\n<code>` this exact turn; the
 * model never decides to run anything and never sees this door. There is
 * no standing switch either: every `/run` is its own one-shot action,
 * exactly like the Folds panel's own ▶ run — never a toggle that
 * authorizes a future turn to run something on its own.
 *
 * `runSandboxed` is a real worker boot + exec (measured: pyodide alone is
 * ~9s before a line of user code runs), so this follows `ingestTurn`'s
 * async shape — addMessage first, fill in the result once the sandbox
 * settles — rather than `actTurn`'s fully synchronous one (landAct never
 * awaits anything).
 *
 * Material: `state.sources` UNFILTERED, matching `actTurn`/`landAct`'s own
 * precedent above (the mute toggle silences retrieval, not what crosses
 * into a sandbox — term.js's own `sourcesPayload()` mounts every loaded
 * source, muted or not, for the identical reason). A `.load <source>`
 * pre-step inside sql code (runSandboxed's own new handling) can only ever
 * reach a name in this same unfiltered set.
 */
async function runTurn(runCmd, typed) {
  if (runCmd.refused) {
    mirrorTermRecord("term-run-refused", { line: typed.slice(0, 2000), refusal: runCmd.refused.type, detail: runCmd.refused.detail, via: "chat" });
    return usageTurn(typed, `refused (${runCmd.refused.type}): ${runCmd.refused.detail}`);
  }
  const { runtime, code } = runCmd;
  addMessage("user", typed);
  const node = addMessage("assistant", "");
  const body = node.querySelector(".body");
  body.textContent = `running ${runtime} in the sandbox…`;
  $("status").textContent = `running ${runtime}…`;
  logAct("asked", { text: typed });

  const outcome = await runSandboxed(runtime, code, { sources: state.sources });
  body.textContent = "";

  const ok = outcome.code === 0 && !outcome.timedOut;
  // The database fold (P25): the SAME landing the terminal's own sql
  // runtime uses, applied to whatever runSandboxed diffed off this /run.
  // A run in js/python (dbOps always []) costs nothing extra here.
  const landed = applyStoreOps(outcome.dbOps);
  let note = formatRunOutcome(outcome);
  if (landed.applied) {
    note += `\n\ndatabase fold ${landed.n}: ${landed.applied} row-level change${landed.applied === 1 ? "" : "s"} recorded.`;
  }
  if (landed.failed.length) {
    note += `\n\n${landed.failed.length} row-level change${landed.failed.length === 1 ? "" : "s"} could NOT be recorded to the database fold (the live sql session already applied ${landed.failed.length === 1 ? "it" : "them"} — only the log's own account of it is incomplete): ${landed.failed[0].reason}`;
  }
  mirrorTermRecord("term-run", { runtime, code: code.slice(0, 2000), ok, timedOut: outcome.timedOut, durationMs: outcome.durationMs, via: "chat" });
  logAct(ok ? "recorded" : "errored", { where: "run", runtime, timedOut: outcome.timedOut });

  const p = document.createElement("p");
  p.className = "prose";
  p.textContent = note;
  body.append(p);

  state.history.push({ role: "user", content: typed }, { role: "assistant", content: note });
  const turn = state.summary.turnCount + 1;
  observeExchange(turn, typed, note);
  const fold = mechanicalFoldLine(typed, note);
  state.turnFolds.push(fold);
  state.summary = advanceSummaryFold(state.summary, fold);
  renderFold(node, { fold });
  renderThreads();
  $("status").textContent = readyLine();
  releaseBusy();
}

/**
 * /transcribe — Whisper-based transcription via in-browser ASR. Two paths:
 *   /transcribe <youtube-url> — fetches audio server-side (yt-dlp), transcribes
 *                                in-browser, result lands as addressable material.
 *   /transcribe (bare)        — opens a file picker for a local audio file,
 *                                transcribes in-browser, result lands as material.
 * The Whisper model downloads once and caches in the browser. Nothing leaves the
 * machine: the server only fetches the YouTube audio bytes (P13 web egress),
 * and the transcription itself runs entirely in the browser sandbox.
 */
// Layer 2: priors-coref — extract surfaces from transcription, search enabled
// priors docs for those surfaces, use namesCorefer to confirm identity, and
// return an enriched surface→referent map Layer 3 can use for pronoun binding.
async function priorsCoref(text) {
  const surfaces = extractSurfaces(engineSentences(text));
  const surfaceNames = surfaces.map((s) => s.surface).filter(Boolean);
  if (!surfaceNames.length) return { text, surfaceMap: new Map(), note: "no surfaces extracted" };
  let matches;
  try {
    const resp = await fetch("/api/priors/surfaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ surfaces: surfaceNames }),
    });
    if (!resp.ok) return { text, surfaceMap: new Map(), note: `priors search failed ${resp.status}` };
    ({ matches } = await resp.json());
  } catch { return { text, surfaceMap: new Map(), note: "priors search failed (network)" }; }
  if (!matches?.length) return { text, surfaceMap: new Map(), note: "no priors matches" };

  // Build a referent index from priors passages and confirm identity with
  // namesCorefer — the engine's own containment/surname matching.
  const allPriorsSurfaces = [];
  for (const m of matches) {
    for (const p of m.passages) {
      const ps = extractSurfaces(engineSentences(p.passage));
      allPriorsSurfaces.push(...ps);
    }
  }
  const priorsReferents = discoverReferents(allPriorsSurfaces);
  const surfaceMap = new Map();
  let confirmed = 0;
  for (const m of matches) {
    const transcriptionSurface = m.surface;
    const matchingReferent = surfaces.find((s) => s.surface === transcriptionSurface);
    if (!matchingReferent) continue;
    for (const p of m.passages) {
      const ps = extractSurfaces(engineSentences(p.passage));
      for (const pp of ps) {
        if (namesCorefer(matchingReferent, pp)) {
          if (!surfaceMap.has(transcriptionSurface)) surfaceMap.set(transcriptionSurface, []);
          surfaceMap.get(transcriptionSurface).push({ surface: pp.surface, passage: p.passage, path: p.path });
          confirmed++;
        }
      }
    }
  }
  return { text, surfaceMap, note: `${confirmed} priors corefs from ${matches.length} surface matches`, matches, confirmed };
}

// Layer 3: self-coref with priors enrichment. Mirrors resolvePronounSubjects
// but merges priors-discovered surfaces into the referent map so pronouns
// have more entities to bind against.
function resolvePronounsWithPriors(text, priorsSurfaceMap) {
  if (!text?.trim()) return text;
  let sentences, discovery;
  try {
    sentences = engineSentences(text);
    const surfaces = extractSurfaces(sentences, {});
    discovery = discoverReferents(surfaces, {});
  } catch { return text; }
  if (!sentences.length || !discovery?.events?.length) return text;
  const surfaceToReferent = new Map(discovery.events.map((e) => [e.surface, e.referent_id]));
  // Merge priors surfaces: for each transcription surface that matched in
  // priors, add the priors surface as an alias for the same referent.
  if (priorsSurfaceMap?.size) {
    for (const [txSurface, priorsEntries] of priorsSurfaceMap) {
      const referentId = surfaceToReferent.get(txSurface);
      if (!referentId) continue;
      for (const entry of priorsEntries) {
        if (!surfaceToReferent.has(entry.surface)) surfaceToReferent.set(entry.surface, referentId);
      }
    }
  }
  const bestSurface = new Map();
  for (const [surface, referentId] of surfaceToReferent) {
    const prev = bestSurface.get(referentId);
    if (!prev || surface.length > prev.length) bestSurface.set(referentId, surface);
  }
  let resolved;
  try {
    resolved = resolvePronouns(sentences, surfaceToReferent, {
      minActivation: 0.05,
      minMargin: 0.2,
    });
  } catch { return text; }
  if (!resolved?.bindings?.length) return text;
  const ordered = [...resolved.bindings].sort((a, b) => b.offset - a.offset);
  let out = text;
  for (const b of ordered) {
    const name = bestSurface.get(b.referentId);
    if (!name) continue;
    const end = b.offset + b.pronoun.length;
    if (out.slice(b.offset, end).toLowerCase() !== b.pronoun.toLowerCase()) continue;
    out = out.slice(0, b.offset) + name + out.slice(end);
  }
  return out;
}

async function transcribeTurn(typed) {
  const arg = typed.replace(/^\/transcribe\s*/, "").trim();
  addMessage("user", typed);
  const node = addMessage("assistant", "");
  const body = node.querySelector(".body");
  logAct("asked", { text: typed });

  // Build the streaming fold UI — three layers, each a collapsible section.
  body.innerHTML = "";
  const statusP = document.createElement("p");
  statusP.className = "prose";
  statusP.textContent = "initializing transcription…";
  body.append(statusP);
  // `foldP` used to be the turn's own "thinking" box, so a reader could
  // expand it and watch the three layers populate live — it no longer is
  // (2026-08-28, renderFold's own header carries the reason). A detached
  // scratch element instead: the layers below still build and populate
  // exactly as before, there is simply nothing left to attach them to.
  const foldP = document.createElement("p");
  const layerRaw = document.createElement("details");
  layerRaw.className = "fold";
  layerRaw.innerHTML = `<summary>layer 1 · raw whisper</summary><p class="t-layer-text"></p>`;
  const layerPriors = document.createElement("details");
  layerPriors.className = "fold";
  layerPriors.innerHTML = `<summary>layer 2 · priors-coref <span class="t-layer-status"></span></summary><p class="t-layer-text"></p>`;
  const layerSelf = document.createElement("details");
  layerSelf.className = "fold";
  layerSelf.innerHTML = `<summary>layer 3 · self-coref <span class="t-layer-status"></span></summary><p class="t-layer-text"></p>`;
  foldP.append(layerRaw, layerPriors, layerSelf);
  const rawText = foldP.querySelector("details:nth-child(1) .t-layer-text");
  const priorsText = foldP.querySelector("details:nth-child(2) .t-layer-text");
  const priorsStatus = foldP.querySelector("details:nth-child(2) .t-layer-status");
  const selfText = foldP.querySelector("details:nth-child(3) .t-layer-text");
  const selfStatus = foldP.querySelector("details:nth-child(3) .t-layer-status");

function setLayerText(el, text) { if (el) el.textContent = text; }
function setLayerStatus(el, s) { if (el) el.textContent = s; }

  // ── file picker path ──────────────────────────────────────────────────
  if (!arg) {
    statusP.textContent = "opening file picker for audio…";
    $("status").textContent = "waiting for audio file…";

    try {
      const blob = await pickAudioFile();
      if (!blob) {
        body.textContent = "no file selected.";
        $("status").textContent = readyLine();
        releaseBusy();
        return;
      }
      statusP.textContent = `transcribing with Whisper… ${WHISPER_DISCLOSURE}`;
      $("status").textContent = "transcribing…";
      const { text, duration } = await transcribeBlob(blob, {
        onProgress: (f) => { $("status").textContent = `transcribing… ${(f * 100).toFixed(0)}%`; },
        onChunk: (partial) => { setLayerText(rawText, partial); },
      });

      // Layer 1 done — log raw.
      setLayerText(rawText, text);
      await logTranscriptionLayer("raw", text, { source: "file", duration });

      // Layer 2: priors-coref — connect entities to the priors corpus first.
      setLayerStatus(priorsStatus, "resolving…");
      const priorsResult = await priorsCoref(text);
      setLayerText(priorsText, priorsResult.note);
      setLayerStatus(priorsStatus, priorsResult.confirmed ? `confirmed ${priorsResult.confirmed}` : priorsResult.note);
      await logTranscriptionLayer("priors", priorsResult.note, { source: "file", duration, matches: priorsResult.matches?.length ?? 0, confirmed: priorsResult.confirmed ?? 0 });

      // Layer 3: self-coref — resolve pronouns against enriched entity set.
      setLayerStatus(selfStatus, "resolving…");
      const selfResolved = resolvePronounsWithPriors(priorsResult.text, priorsResult.surfaceMap);
      setLayerText(selfText, selfResolved);
      setLayerStatus(selfStatus, selfResolved !== priorsResult.text ? "resolved" : "no bindings");
      await logTranscriptionLayer("self", selfResolved, { source: "file", duration, changed: selfResolved !== priorsResult.text });

      // Attach as material and finish.
      const name = `transcription-${Date.now()}.txt`;
      addSource(name, text);
      const mins = Math.floor(duration / 60);
      const secs = Math.floor(duration % 60);
      statusP.textContent = `transcribed ${mins}:${String(secs).padStart(2, "0")} → attached as "${name}" (${text.length.toLocaleString()} chars) · 3 layers logged`;
      mirrorTermRecord("transcribe", { source: "file", name, duration, chars: text.length, via: "chat" });
      logAct("recorded", { where: "transcribe", source: "file", layers: 3 });
      const historyNote = `transcribed audio file (${mins}:${String(secs).padStart(2, "0")}) → attached as "${name}"`;
      state.history.push({ role: "user", content: typed }, { role: "assistant", content: historyNote });
      const turn = state.summary.turnCount + 1;
      observeExchange(turn, typed, historyNote);
      const fold = mechanicalFoldLine(typed, historyNote);
      state.turnFolds.push(fold);
      state.summary = advanceSummaryFold(state.summary, fold);
      renderFold(node, { fold });
      renderThreads();
    } catch (e) {
      body.textContent = `transcription failed: ${e.message}`;
    }
    $("status").textContent = readyLine();
    releaseBusy();
    return;
  }

  // ── URL path ──────────────────────────────────────────────────────────
  statusP.textContent = `fetching audio from ${arg.slice(0, 80)}…`;
  $("status").textContent = "fetching audio…";

  try {
    const { blob, title } = await fetchAudioFromUrl(arg);
    statusP.textContent = `transcribing with Whisper… ${WHISPER_DISCLOSURE}`;
    $("status").textContent = "transcribing…";
    const { text, duration } = await transcribeBlob(blob, {
      onProgress: (f) => { $("status").textContent = `transcribing… ${(f * 100).toFixed(0)}%`; },
      onChunk: (partial) => { setLayerText(rawText, partial); },
    });

    // Layer 1 done — log raw.
    setLayerText(rawText, text);
    await logTranscriptionLayer("raw", text, { source: "youtube", url: arg, title, duration });

    // Layer 2: priors-coref — connect entities to the priors corpus first.
    setLayerStatus(priorsStatus, "resolving…");
    const priorsResult = await priorsCoref(text);
    setLayerText(priorsText, priorsResult.note);
    setLayerStatus(priorsStatus, priorsResult.confirmed ? `confirmed ${priorsResult.confirmed}` : priorsResult.note);
    await logTranscriptionLayer("priors", priorsResult.note, { source: "youtube", title, duration, matches: priorsResult.matches?.length ?? 0, confirmed: priorsResult.confirmed ?? 0 });

    // Layer 3: self-coref — resolve pronouns against enriched entity set.
    setLayerStatus(selfStatus, "resolving…");
    const selfResolved = resolvePronounsWithPriors(priorsResult.text, priorsResult.surfaceMap);
    setLayerText(selfText, selfResolved);
    setLayerStatus(selfStatus, selfResolved !== priorsResult.text ? "resolved" : "no bindings");
    await logTranscriptionLayer("self", selfResolved, { source: "youtube", title, duration, changed: selfResolved !== priorsResult.text });

    // Attach as material and finish.
    const name = `${title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60)}-transcript.txt`;
    addSource(name, text);
    const mins = Math.floor(duration / 60);
    const secs = Math.floor(duration % 60);
    statusP.textContent = `transcribed "${title}" (${mins}:${String(secs).padStart(2, "0")}) → attached as "${name}" (${text.length.toLocaleString()} chars) · 3 layers logged`;
    mirrorTermRecord("transcribe", { source: "youtube", name, url: arg, title, duration, chars: text.length, via: "chat" });
    logAct("recorded", { where: "transcribe", source: "youtube", layers: 3 });
    const historyNote = `transcribed "${title}" (${mins}:${String(secs).padStart(2, "0")}) → attached as "${name}"`;
    state.history.push({ role: "user", content: typed }, { role: "assistant", content: historyNote });
    const turn = state.summary.turnCount + 1;
    observeExchange(turn, typed, historyNote);
    const fold = mechanicalFoldLine(typed, historyNote);
    state.turnFolds.push(fold);
    state.summary = advanceSummaryFold(state.summary, fold);
    renderFold(node, { fold });
    renderThreads();
  } catch (e) {
    body.textContent = `transcription failed: ${e.message}`;
  }
  $("status").textContent = readyLine();
  releaseBusy();
}

/**
 * Transcribe an audio Blob directly (for dropped files, no file picker).
 * Runs the full 3-layer pipeline: raw whisper → priors-coref → self-coref.
 */
async function transcribeAudioBlob(blob, fileName) {
  const node = addMessage("assistant", "");
  const body = node.querySelector(".body");
  body.innerHTML = `<p class="prose">uploading ${fileName} for server-side transcription…</p>`;
  try {
    console.log("[transcribe] uploading", fileName, "size:", blob.size);
    body.querySelector(".prose").textContent = "transcribing on server…";
    const resp = await fetch("/api/transcribe-upload", {
      method: "POST",
      headers: { "content-type": "application/octet-stream", "x-file-name": fileName, "x-file-mime": blob.type || "audio/mpeg" },
      body: blob,
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: resp.statusText }));
      throw new Error(err.error || "transcription failed");
    }
    const { text, duration } = await resp.json();
    console.log("[transcribe] done, length:", text.length, "duration:", duration);
    if (!text) { body.querySelector(".prose").textContent = "(no speech detected)"; return; }
    body.querySelector(".prose").textContent = text;
    const priors = await priorsCoref(text);
    const resolved = resolvePronounsWithPriors(text, priors.surfaceMap);
    logTranscriptionLayer("raw", { text, duration });
    logTranscriptionLayer("priors-coref", { text, ...priors });
    logTranscriptionLayer("self-coref", { text: resolved });
    const name = fileName.replace(/\.[^.]+$/, "") + ".txt";
    addSource(name, resolved);
    $("status").textContent = `transcribed ${fileName} → attached as "${name}"`;
  } catch (e) {
    console.error("[transcribe] error:", e);
    body.querySelector(".prose").textContent = `transcription failed: ${e.message}`;
  }
  releaseBusy();
}

/**
 * Open a file picker for audio files and return the selected Blob.
 */
function pickAudioFile() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/*,.mp3,.wav,.ogg,.m4a,.webm,.flac,.aac";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      resolve(file);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

/**
 * /priors — the toggle ledger's chat door. One ledger, three doors (the
 * Priors tab, the terminal's `priors` command, this one) all reading and
 * writing the same explore-server.mjs routes, so a flip made anywhere is
 * seen everywhere. Bare /priors lists the corpus's genres and how many
 * documents in each are in play; `/priors on|off <path>` flips a document,
 * a folder, or the whole corpus (blank path). Computed from a server
 * fetch, never generated — a toggle is a fact about a file on disk.
 */
async function priorsTurn(argstr, typed) {
  const [sub, ...rest] = argstr.trim().split(/\s+/).filter(Boolean);
  try {
    if (sub === "on" || sub === "off") {
      const p = rest.join(" ");
      const body = await (
        await fetch(`${EXPLORE_BASE}/api/priors/toggle`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ path: p, on: sub === "on" }),
        })
      ).json();
      if (body.error) return usageTurn(typed, body.error);
      // The one thing worth saying plainly: this reaches the surf, not
      // just the offer surface. explore-server.mjs's /api/priors/check
      // gates its candidate list on this same ledger — a document
      // switched off is not consulted at answer time, not just hidden
      // from the attach picker.
      return usageTurn(
        typed,
        `${p || "the whole corpus"} → ${sub.toUpperCase()}. This reaches the surf directly: the reference-library check that runs during a turn only reads documents the ledger says are on — switching one off means it is not consulted, not just hidden from the picker.`,
      );
    }
    const data = await (await fetch(`${EXPLORE_BASE}/api/priors`)).json();
    if (data.gap) return usageTurn(typed, data.gap.detail);
    const lines = [
      `live_priors: ${data.files.toLocaleString()} documents, ${data.enabledCount.toLocaleString()} in play — every document starts off.`,
      ...data.categories.map((c) => `  ${c.name}: ${c.enabled}/${c.files} in play`),
      "`/priors on <path>` or `/priors off <path>` flips a document, a folder, or the whole corpus (bare path = root). A flip here is the same ledger the Priors tab and the terminal's `priors` command read.",
    ];
    return usageTurn(typed, lines.join("\n"));
  } catch {
    return usageTurn(typed, "the priors organ needs explore-server.mjs running on :8812 to answer this from chat.");
  }
}

/**
 * /learn — points at where each half of "learn this instrument" actually
 * lives, rather than duplicating either. The terminal's `learn` walk grades
 * real keystrokes against real commands, which chat has no mechanism to do
 * honestly; the vendored handbook (handbook/, the eoreaderhandbook repo
 * copied whole, P1: local) is prose chat CAN open directly. Bare /learn is
 * the menu; `/learn <n>` opens a chapter, quoted from the vendored file,
 * never paraphrased.
 */
async function learnTurn(argstr, typed) {
  let idx;
  try {
    idx = parseHandbookIndex(await (await fetch("handbook/000-index.md")).text());
  } catch {
    return usageTurn(typed, "the handbook isn't reachable from here (handbook/000-index.md) — it ships vendored beside this page.");
  }
  const want = argstr.trim();
  if (!want) {
    const lines = [
      "two doors, not one:",
      "  the terminal's `learn` — a graded walk through this terminal's own commands, real keystrokes checked against real ones. Open the terminal (›) and type `learn`.",
      "  `/learn <n>` here — a chapter of the eoreaderhandbook, the theory this instrument is built on, vendored whole.",
      "",
      ...idx.map((c) => `  ${c.n.padEnd(5)} ${c.title}`),
    ];
    return usageTurn(typed, lines.join("\n"));
  }
  const ch = findChapter(idx, want);
  if (!ch) return usageTurn(typed, `no chapter “${want}” — bare \`/learn\` lists them all`);
  const text = await (await fetch(`handbook/${ch.file}`)).text();
  return usageTurn(typed, `${text}\n\n— chapter ${ch.n}, ${ch.title} (handbook/${ch.file})`);
}

async function mechanicalTurn(question, kind) {
  addMessage("user", question);
  const node = addMessage("assistant", "");
  const body = node.querySelector(".body");

  const built = buildTable(kind, state);
  const answer = built ? toMarkdown(built.table) : NOTHING[kind];
  body.textContent = "";
  if (built) body.append(publishBuild(built.table, built.caption, question));
  else {
    const p = document.createElement("p");
    p.className = "prose";
    p.textContent = answer;
    body.append(p);
  }

  state.history.push(
    { role: "user", content: question },
    { role: "assistant", content: answer },
  );
  const turn = state.summary.turnCount + 1;
  logAct("answered-from-state", { what: kind });
  // The meter hears the caption, not the table: rows restated from state are
  // not an arrival, but that the question was answered this way is.
  observeExchange(turn, question, built ? built.caption : answer);
  // Fold on what the turn produced, not on its markup. Folding the table's
  // own text spends the whole hundred characters on pipes and dashes and says
  // nothing about the turn — and this line is what a later turn reads.
  const fold = mechanicalFoldLine(question, built ? built.caption : answer);
  state.turnFolds.push(fold);
  // No summary refresh either: this turn spent no tokens and there is no
  // reason for the bookkeeping to cost more than the answer did.
  state.summary = advanceSummaryFold(state.summary, fold);

  renderFold(node, { fold });
  renderThreads();
  $("status").textContent = readyLine();
  releaseBusy();
}

/**
 * "What was the third thing you told me?" — an ordinal pointed at
 * `state.turnFolds`, the app's own unbounded, one-line-per-turn archive
 * (reflex.js's own header explains why that array and not fold.js's
 * bounded `summary.folds`: this app already folds every turn to a "Q: …
 * A: …" recap and never trims that specific array, unlike the summary's
 * own bounded window). Same shape as `mechanicalTurn` — a computed answer,
 * no model call — kept as its own function rather than folded into
 * `mechanicalTurn`/`buildTable` because a pinpoint ordinal ask can fail in
 * a way a table listing cannot ("there is no 5th turn yet"), and that gap
 * needs to say WHICH turn and HOW MANY exist, not the same static string
 * every other empty table falls back to (`NOTHING[kind]`).
 */
async function recallTurn(question) {
  addMessage("user", question);
  const node = addMessage("assistant", "");
  const body = node.querySelector(".body");

  const built = recallTable(state.turnFolds, question);
  const verdict = resolveOrdinalRecall(state.turnFolds, question);
  const answer = built ? toMarkdown(built.table) : verdict.detail;
  body.textContent = "";
  if (built) body.append(publishBuild(built.table, built.caption, question));
  else {
    const p = document.createElement("p");
    p.className = "prose";
    p.textContent = answer;
    body.append(p);
  }

  state.history.push(
    { role: "user", content: question },
    { role: "assistant", content: answer },
  );
  const turn = state.summary.turnCount + 1;
  logAct("answered-from-state", { what: "recall", ...(built ? { n: verdict.n, of: verdict.of } : { gap: verdict.gap }) });
  observeExchange(turn, question, built ? built.caption : answer);
  const fold = mechanicalFoldLine(question, built ? built.caption : answer);
  state.turnFolds.push(fold);
  state.summary = advanceSummaryFold(state.summary, fold);

  renderFold(node, { fold });
  renderThreads();
  $("status").textContent = readyLine();
  releaseBusy();
}

/**
 * A chart of a loaded source is drawn, never generated — tables.js's rule
 * one rung up. The rows are bytes the app can already address, so a model
 * asked to produce this chart could only retype figures (measured live:
 * twelve figures at 2 tok/s, cut off by its own decode budget). chartOf
 * finds the source by its name in the question (P11), reads the columns
 * off the file's own header, and the segment deposits through the same
 * fold door a model's code would — downloadable, addressable, revisable.
 */
async function chartTurn(question) {
  addMessage("user", question);
  const node = addMessage("assistant", "");
  const body = node.querySelector(".body");

  const sources = liveSources();
  const out = chartOf(question, sources);
  body.textContent = "";
  let answer;
  if (out.seg && out.seg.rows) {
    body.append(publishBuild(out.seg, out.caption, question));
    answer = out.caption;
  } else {
    // A typed gap: the door was walked and the missing leg is named.
    const p = document.createElement("p");
    p.className = "prose";
    p.textContent = out.gap ?? out.caption;
    body.append(p);
    answer = out.gap ?? out.caption;
  }

  state.history.push(
    { role: "user", content: question },
    { role: "assistant", content: answer },
  );
  const turn = state.summary.turnCount + 1;
  logAct("answered-from-state", { what: "chart" });
  observeExchange(turn, question, answer);
  const fold = mechanicalFoldLine(question, answer);
  state.turnFolds.push(fold);
  state.summary = advanceSummaryFold(state.summary, fold);

  renderFold(node, { fold });
  renderThreads();
  $("status").textContent = readyLine();
  state.busy = false;
  $("send").disabled = false;
  $("input").focus();
  drainQueue();
}

/**
 * Arithmetic is computed, never generated — L5 at its smallest scale.
 * Measured live in this repo: asked "What's 17 times 24?", qwen2.5:14b
 * answered 372; the product is 408, and nothing caught it because nothing
 * checked it. `checkArithmetic` (arithmetic.js) already decided this claims
 * the turn — it normalizes English operator words to symbols and only
 * claims a question that reduces to a PURE numeric expression with zero
 * free symbols, so a real question never reaches here. The model is never
 * sent the question at all: window.math (mathjs, vendored per P1, loaded
 * in index.html) already did the work, and `found.tex` — that SAME
 * engine's own LaTeX rendering of the expression — is typeset with KaTeX
 * (also vendored) rather than shown as a bare expression string. The plain
 * `answer` string carried into the fold and the record stays untyped text
 * regardless — never markup, only KaTeX's on-screen presentation of it is.
 * `state.history` carries `stripComputedCaption(answer)` instead of
 * `answer` itself: the "computed, not generated" mark is a certification
 * this specific engine earned, and a model must never be able to read its
 * own past turn back and learn to forge that certification onto something
 * it merely generated (see `stripComputedCaption`'s own header).
 */
async function arithmeticTurn(question, found) {
  addMessage("user", question);
  const node = addMessage("assistant", "");
  const body = node.querySelector(".body");

  // A typed gap (P4) when the engine did not load, never a silent fall
  // through to the model — a wrong mechanical answer is worse than none,
  // and a model-guessed one is exactly the failure this door exists to stop.
  const answer = found.gap
    ? `${found.expression} — ${found.gap}`
    : `${found.expression} = ${found.display} — computed, not generated`;
  body.textContent = "";
  if (!found.gap && found.tex) {
    const wrap = document.createElement("div");
    wrap.className = "arithmetic-result";
    try {
      wrap.innerHTML = katex.renderToString(found.tex, { displayMode: true, throwOnError: false });
    } catch {
      wrap.textContent = `${found.expression} = ${found.display}`;
    }
    const note = document.createElement("p");
    note.className = "note";
    note.textContent = "computed, not generated";
    body.append(wrap, note);
  } else {
    const p = document.createElement("p");
    p.className = "prose";
    p.textContent = answer;
    body.append(p);
  }

  state.history.push(
    { role: "user", content: question },
    { role: "assistant", content: stripComputedCaption(answer) },
  );
  const turn = state.summary.turnCount + 1;
  logAct("answered-from-state", {
    what: "arithmetic",
    expression: found.expression,
    ...(found.gap ? { gap: found.gap } : { value: found.value }),
  });
  observeExchange(turn, question, answer);
  const fold = mechanicalFoldLine(question, answer);
  state.turnFolds.push(fold);
  state.summary = advanceSummaryFold(state.summary, fold);

  renderFold(node, { fold });
  renderThreads();
  $("status").textContent = readyLine();
  releaseBusy();
}

function drainQueue() {
  if (state.busy || !state.queue.length) return;
  const next = state.queue.shift();
  // Remove the queued placeholder message from chat — send() will add the
  // real one through the turn function's own addMessage.
  const placeholder = document.querySelector(".msg.queued");
  if (placeholder) placeholder.remove();
  guardedSend(next);
}

function releaseBusy() {
  state.busy = false;
  $("send").disabled = false;
  $("input").focus();
  drainQueue();
}

/**
 * A door that throws must never leave the composer busy (2026-09-05, found
 * live: an exception inside a mechanical door left `state.busy` set, so
 * every later message silently queued behind a turn that would never end).
 * The throw becomes a typed assistant line — the promise the page makes is
 * that it shows its work, and "this door threw, nothing was answered" is
 * work shown; a dead composer is not.
 */
function guardedSend(question) {
  let p;
  try { p = send(question); } catch (e) { p = Promise.reject(e); }
  return Promise.resolve(p).catch((e) => {
    const node = addMessage("assistant", `this turn threw before answering: ${e?.message ?? e} — nothing was recorded as an answer; the composer is free.`);
    node.classList.add("door-failed");
    console.error("turn failed", e);
    $("status").textContent = `ready · ${state.model}`;
    releaseBusy();
  });
}

async function send(question) {
  state.busy = true;
  turnSeq += 1;
  $("send").disabled = true;

  // A task rather than a question. Two doors, per the canon in eochatX's
  // eo-holonic-plan.ts: `/task` is the explicit one, and the mechanical gate
  // is the SHAPE of the request — several substantive clauses each pinning
  // its own anchor — decided from the question's own words, never by a model
  // and never by whether a corpus happens to be loaded. The explicit door is
  // checked FIRST: a typed command must never be hijacked by a heuristic
  // that happens to match its wording.
  // The fold door first: `/fold <n> <instruction>` names its target by
  // number, mechanically — the door carries the address, so whatever code
  // the model returns lands as a revision on THAT fold's log, never as a
  // new fold and never where the model's prose points. Checked before
  // /task for the same reason /task is checked before the heuristics: a
  // typed command must never be hijacked by anything downstream of it.
  const foldCmd = parseFoldCommand(question);
  if (foldCmd) return foldTurn(foldCmd.n, foldCmd.instruction, question);
  if (/^\/fold\b/.test(question))
    return usageTurn(question, "/fold <n> <instruction> — asks the model to revise fold n. Whatever code comes back lands as a new version on that fold's own append-only log — the door carries the target, so the model's prose cannot re-route it.");

  // The ingest door: /ingest <owner/name or github url> — a repo becomes
  // folds, every file with the SAME provenance riding its birth, budgets
  // declared and counted, and NO model call anywhere: ingestion is
  // mechanical from end to end (the intelligence outside the model).
  const ingestCmd = parseIngestCommand(question);
  if (ingestCmd) return ingestTurn(ingestCmd.repo, question);
  if (/^\/ingest\b/.test(question))
    return usageTurn(question, "/ingest <owner/name or github url> — fetches the repo's admissible files through the recorded egress and lands each as a fold carrying its provenance (source, license, retrieval date) forever.");

  // The measuring door (P19): typed, mechanical, no model — see measureTurn.
  if (/^\/measure\b/.test(question)) return measureTurn(question);

  const task = question.match(/^\/task\s+(\S[\s\S]*)/)?.[1];
  if (task) return holonicTurn(task, question, "model");
  if (/^\/task\s*$/.test(question)) return usageTurn(question, "/task <what to produce> — plans the task into parts and runs each one against the material.");

  // The bound experiment: the same question answered twice — once free and
  // audited, once with the decoding grammar holding every name to the cast
  // and every figure to the material's own cells — side by side, measured.
  const boundQ = question.match(/^\/bound\s+(\S[\s\S]*)/)?.[1];
  if (boundQ) return boundTurn(boundQ, question);
  if (/^\/bound\s*$/.test(question)) return usageTurn(question, "/bound <question> — answers twice: a free audited draft, and one where the grammar binds names to the cast and figures to the material's cells.");

  // The self plane's doors. /self is the ladder — the instrument's own
  // cognition by level, each answered from state (computed, not generated).
  // /reflect is the model turn over that plane: it retrieves from the act
  // ledger, answers with the usual checks, and its record is typed `self`.
  const selfLevel = question.match(/^\/self\s+(\S[\s\S]*)/)?.[1];
  if (selfLevel) {
    const kind = normalizeSelfLevel(selfLevel);
    if (kind) return mechanicalTurn(question, kind);
    return usageTurn(question, "/self <acts|surprise|pace|folds|records|sources|passages> — one level of the instrument's own cognition, computed from state. Bare /self shows the whole ladder.");
  }
  if (/^\/self\s*$/.test(question)) {
    return usageTurn(question, selfOverview({ ...state, pace: foldPace(state.paceLog, state.model) }));
  }
  const reflectQ = question.match(/^\/reflect\s+(\S[\s\S]*)/)?.[1];
  if (reflectQ) return reflectTurn(reflectQ, question);
  if (/^\/reflect\s*$/.test(question)) return usageTurn(question, "/reflect <question> — answers about how this instrument has been working, retrieving from its own act ledger instead of the material. The record such a turn earns is typed as self-knowledge, never as a check against the world.");

  // The priors organ's door: browse and flip the live_priors toggle ledger
  // from the chat, the same ledger the Priors tab and the terminal's
  // `priors` command read and write (one ledger, three doors). Computed
  // from a server fetch, never generated — a toggle is a fact about a file
  // on disk, not a thing to phrase.
  const priorsCmd = question.match(/^\/priors\b\s*(.*)$/s);
  if (priorsCmd) return priorsTurn(priorsCmd[1] ?? "", question);

  // The public gateways (P117): bare, the learned table off the record — no
  // egress; `probe`, one recorded fetch of a canonical page through each
  // gateway so the table has something to learn from. Mechanical either way.
  const gatewaysCmd = question.match(/^\/gateways\b\s*(.*)$/s);
  if (gatewaysCmd) return gatewaysTurn(gatewaysCmd[1]?.trim() ?? "", question);

  // The routes (P118): where this page is and what it found reachable at
  // boot, re-probed on request. Mechanical, localhost / same-origin only.
  if (/^\/routes\b/.test(question)) return routesTurn(question);

  // The room (P119): sign in to a homeserver the person names; preserve this
  // chat there sealed; share it; join a shared one; serve a mouth from this
  // machine; see the pool. Mechanical, every act on the record as pointers.
  const matrixCmd = question.match(/^\/matrix\b\s*(.*)$/s);
  if (matrixCmd) return matrixTurn(matrixCmd[1]?.trim() ?? "", question);
  const preserveCmd = question.match(/^\/preserve\b\s*(.*)$/s);
  if (preserveCmd) return preserveTurn(preserveCmd[1]?.trim() ?? "", question);
  const shareCmd = question.match(/^\/share\b\s*(.*)$/s);
  if (shareCmd) return shareTurn(shareCmd[1]?.trim() ?? "", question);
  const joinCmd = question.match(/^\/join\b\s*(.*)$/s);
  if (joinCmd) return joinTurn(joinCmd[1]?.trim() ?? "", question);
  const serveCmd = question.match(/^\/serve\b\s*(.*)$/s);
  if (serveCmd) return serveTurn(serveCmd[1]?.trim() ?? "", question);
  const poolCmd = question.match(/^\/pool\b\s*(.*)$/s);
  if (poolCmd) return poolTurn(question, poolCmd[1]?.trim() ?? "");

  // The terminal language's chat door (P22's grid.js, opened to chat):
  // compose one act of the nine-operator composition law directly from the
  // composer, landing on the SAME log the sandboxed terminal's own `act`/
  // `grid`/`capacities` commands read and write. Explicit-trigger only —
  // checked here among the other typed doors, before any automatic
  // detector or the widget router gets a look at the question, so nothing
  // the model decides on its own can reach this grammar.
  // /corroborate <maxAsks> — the memory floor's mouth, wired into the app
  // (NEXT-PASSES Pass 4b, the F5-at-scale item): walk the conversation's
  // OWN accumulated hyperlexicon against the loaded sources with the
  // witness protocol, so notes the turns have been hearing can earn their
  // second, independent votes. Explicit-trigger only, checked among the
  // typed doors like /act and /run — corroboration spends model calls, and
  // the SPEND IS THE PERSON'S OWN DECLARATION (P9): the required <maxAsks>
  // argument is the budget, never defaulted, which is also why this is a
  // door rather than something that runs silently after every turn.
  // /must — the obligation ledger (obligation.js), the ENUMERATION spoke's
  // door: a long instruction set admitted as declared clauses, each owed a
  // visit, coverage reported as enumeration (the unvisited NAMED) rather
  // than relevance. Explicit-trigger only, like every typed door; every
  // standing change carries its because, and a waiver names who waived.
  const mustCmd = question.match(/^\/must\b\s*([\s\S]*)$/);
  if (mustCmd) return mustTurn(mustCmd[1] ?? "", question);

  // /reopen — restore the last open from the record's own rows (reopen.js).
  // Mechanical, no model, and RESTORE never RE-ADMIT: a source is opened by
  // the name the row carries, a fold by its n, a door result re-rendered
  // from its recorded fields — never re-read, re-run, or re-attached.
  const reopenCmd = question.match(/^\/reopen\b\s*(.*)$/s);
  if (reopenCmd) return reopenTurn(reopenCmd[1] ?? "", question);

  const corrCmd = question.match(/^\/corroborate\b\s*(.*)$/s);
  if (corrCmd) return corroborateTurn(corrCmd[1] ?? "", question);

  // Derivation and recourse (Pass 21, P102): a person declares what a
  // relation does, the record derives what follows, and a premise can be
  // conceded — with what would fall shown first.
  const declCmd = question.match(/^\/declare\b\s*(.*)$/s);
  if (declCmd) return declareTurn(declCmd[1] ?? "", question);
  const deriveCmd = question.match(/^\/derive\b\s*(.*)$/s);
  if (deriveCmd) return deriveTurn(deriveCmd[1] ?? "", question);
  const concedeCmd = question.match(/^\/concede(!?)(?:\s+|$)(.*)$/s);
  if (concedeCmd) return concedeTurn(concedeCmd[2] ?? "", question, { perform: concedeCmd[1] === "!" });
  const voidCmd = question.match(/^\/void(!?)(?:\s+|$)(.*)$/s);
  if (voidCmd) return voidTurn(voidCmd[2] ?? "", question, { perform: voidCmd[1] === "!" });
  const essayCmd = question.match(/^\/essay\b\s*(.*)$/s);
  if (essayCmd) return essayTurn(essayCmd[1] ?? "", question);
  if (/^\/export\b/.test(question)) return exportTurn(question);

  const rankeCmd = question.match(/^\/ranke\b\s*(.*)$/s);
  if (rankeCmd) return rankeTurn(rankeCmd[1] ?? "", question);

  const actCmd = question.match(/^\/act\b\s*(.*)$/s);
  if (actCmd) return actTurn(actCmd[1] ?? "", question);

  // /run <runtime>\n<code> — code a PERSON just typed or pasted, run in
  // the same sandboxed Workers the model's own auto-run already executes
  // inside (term.js's runSandboxed — no new execution path). Checked right
  // after /act, for the identical reason: an explicit typed door must
  // never be hijacked by anything downstream of it, and the model must
  // never be the one deciding whether this line runs. `parseRunCommand`
  // returns null for anything that isn't the whole `/run <runtime>\n<code>`
  // shape (parseFoldCommand/parseMeasure's own convention) — including a
  // bare `/run` or a `/run <runtime>` with nothing after it — so the
  // `/^\/run\b/` fallback below is what actually renders that usage line,
  // the same two-step shape /fold and /ingest already use above.
  const runCmd = parseRunCommand(question);
  if (runCmd) return runTurn(runCmd, question);
  if (/^\/run\b/.test(question))
    return usageTurn(
      question,
      "/run <runtime>\\n<code> — runs code YOU typed or pasted, in the same sandboxed, network-severed Worker the model's own code already runs inside (python, js/javascript, or sql — put the runtime as the first line's second word, then the code starting on the next line). One-shot: each /run is its own action, never a standing switch. Code the MODEL writes in this turn's own fold already runs automatically — this door is for code you wrote yourself.",
    );

  // /transcribe <url or nothing> — YouTube or audio file transcription via
  // in-browser Whisper. A URL fetches audio server-side (yt-dlp) then
  // transcribes in-browser; bare /transcribe with no URL opens a file picker
  // for a local audio file. The result lands as addressable material.
  if (/^\/transcribe\b/.test(question) || /^\/transcribe\s*$/.test(question)) {
    return transcribeTurn(question);
  }

  // /learn's door: the terminal's own `learn` walk is graded on real
  // keystrokes there, which chat cannot offer — so here it points to
  // where that walk lives, and lists the vendored handbook's chapters
  // (theory this instrument is built on) as things chat CAN open directly.
  if (/^\/learn\s*$/.test(question) || /^\/learn\b/.test(question)) return learnTurn(question.replace(/^\/learn\s*/, ""), question);

  // A question about the app's own state is answered from that state. Nothing
  // is gained by handing a model rows it would have to paraphrase, and a
  // paraphrase of a data structure drops a row, rounds a number, or invents a
  // file — the three failures the rest of this design exists to refuse.
  // A PIECE asked for by its length (P108): "write me a 30-page essay on
  // …" is work with a declared size, not a question — routed before every
  // material detector so the size, not appetite, plans it.
  // A PROGRAM asked for by its shape (Pass 30 / P112): a runtime the
  // terminal's own registry names and an enumerated spec — one build, one
  // feature per part, the sandbox run as the witness after every landing.
  const codePiece = detectCodePiece(question, { runtimes: Object.keys(ROSTER) });
  if (codePiece) return codePieceTurn(codePiece, question);
  const longForm = detectLongForm(question);
  if (longForm) return longFormTurn(longForm, question);
  const wanted = detectTable(question);
  if (wanted) return mechanicalTurn(question, wanted);

  // A chart word claims the turn only when the question also NAMES a loaded
  // source — that pairing is the tell that the ask is about loaded rows.
  // "Visualize the themes" names nothing and falls through to the model,
  // whose answer is prose under the usual checks, never invented figures.
  if (detectChart(question)) {
    const sources = liveSources();
    const drawn = chartOf(question, sources);
    if (drawn.seg || drawn.source !== undefined) return chartTurn(question);
  }

  // Arithmetic: computed, never generated (L5's smallest scale). Checked
  // alongside the other mechanical detectors above — a pure numeric
  // expression needs no material and no model — and before the reflex/
  // widget doors below. checkArithmetic itself refuses to claim anything
  // with a free symbol left after normalizing, so a real question about
  // the world (or the material) always falls through untouched.
  const arithmetic = checkQuantity(question, { math: window.math });
  if (arithmetic) return arithmeticTurn(question, arithmetic);

  // Self questions asked in words ("what surprised you most", "how do you
  // think"). Checked AFTER detectTable so a question the app can answer
  // about its material state keeps winning, and gated on the second-person
  // tell inside detectReflex so a question about the material — which must
  // always win — is never hijacked into introspection.
  const reflex = detectReflex(question);
  if (reflex === "reflect") return reflectTurn(question, question);
  if (reflex === "recall") return recallTurn(question);
  if (reflex) return mechanicalTurn(question, reflex);

  // A complaint at something already built ("I don't like the colors",
  // "it's broken", "make the buttons bigger") points at a fold, and the
  // pointing is decided HERE — mechanically, from the operator's own words
  // and the folds' own bytes, BEFORE any model call. This is what makes
  // iteration reliable rather than probabilistic: the downstream router
  // (routeSegment) can only route code the model happened to emit, and
  // measured live on gemma2:2b a bare complaint comes back as prose about
  // as often as not, so the complaint routed nowhere and the log forked.
  // Deciding first lets the turn run the SIGHTED revision instead — the
  // /fold door's own machine, handed the target's current code.
  //
  // Checked LAST among the doors, after every typed command and every
  // material detector, so nothing typed and nothing about the material can
  // be hijacked by it: a widget's bytes hold no "report".
  const pointed = widgetRouter.routeMessage(
    question,
    state.builds.map((b) => ({ n: b.n, ...kindOf(b), text: buildWords(b) })),
  );
  if (pointed) {
    return foldTurn(pointed.n, question, question, {
      rezero: true,
      trigger: pointed.trigger,
      tell: pointed.tell,
      matchedOn: pointed.matchedOn,
    });
  }

  // THE SEED SCRUB (CRISPR rung, user-directed): before the model builds
  // an artifact from a blank page, look for existing open work. Mechanical
  // end to end — closed-class demand detection, grammar-extracted
  // archetype, the server's license-graded GitHub search — and only a
  // known-permissive license with an unambiguous single file splices
  // automatically; anything else is candidates on the record. Gated behind
  // the standing web consent like every automatic crossing.
  if (state.web) {
    const seeded = await maybeSeedBuild(question);
    if (seeded) return;
  }

  // Every remaining turn runs as a task — 100% of the time. The one big
  // prompt that carried summary + records + material together is gone; a
  // turn is a plan log whose fold projects into small part-scoped calls,
  // and the log is the thought: what the turn believed the work was, how
  // the belief was amended, what each part established — appended, folded,
  // never mutated. A flat question is a one-part thought that spends no
  // plan call; a many-anchored question plans under grammar. Recall is
  // retrieval: parts carry a one-line discourse slice and re-retrieve what
  // they need, never the whole carried block.
  // A many-anchored question plans and runs deep directly (the explicit
  // /task shape, in spirit) — S1/S2 is for the common little question,
  // which is exactly where a naked fast pass either already answers it or
  // visibly earns the deeper, checked pass that follows.
  // A slash that no door above claimed is a typed refusal, never a model
  // prompt: until 2026-09-05 an unknown /word reached the model (and, with
  // the web toggle on, a search) as if it were a question.
  if (/^\/[a-z][a-z-]*\b/i.test(question))
    return usageTurn(question, `no door named ${question.split(/\s+/)[0]} — the doors: ${DOORS.join(" ")}`, { what: "no-such-door" });
  if (needsDecomposition(question)) return holonicTurn(question, question, "model");
  return twoPassTurn(question);
}

/** Every door the composer routes, read off the dispatch above — kept as one
 * list so the refusal for an unknown slash names all of them. */
const DOORS = Object.freeze(["/act", "/bound", "/concede", "/corroborate", "/declare", "/derive", "/essay", "/fold", "/gateways", "/ingest", "/join", "/learn", "/matrix", "/measure", "/must", "/pool", "/preserve", "/priors", "/ranke", "/reflect", "/reopen", "/routes", "/run", "/self", "/serve", "/share", "/task", "/transcribe", "/void"]);

/**
 * /ingest — a repo becomes folds, mechanically. Every admissible file (the
 * server applies seed.js's declared budgets and skips machinery) lands as
 * its own build whose birth carries the SHARED provenance: repo, path,
 * license as GitHub states it (or null, said as unknown), retrieval date.
 * The provenance is forever — re-carried across re-zeros, stamped into
 * exports — so an ingested file can be edited in place by the whole
 * iteration ladder without its ancestry ever washing out.
 */
async function ingestTurn(repo, typed) {
  addMessage("user", typed);
  const node = addMessage("assistant", "");
  const body = node.querySelector(".body");
  body.textContent = `ingesting github.com/${repo}…`;
  $("status").textContent = `ingesting ${repo}…`;
  logAct("asked", { text: typed });

  let r = null;
  try {
    r = await (await fetch(`${EXPLORE_BASE}/api/seed/ingest`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repo }),
    })).json();
  } catch (err) {
    r = { gap: { silence: "unreachable", detail: String(err.message || err) } };
  }
  body.textContent = "";

  let note;
  if (r.gap) {
    note = `nothing ingested — ${r.gap.silence}: ${r.gap.detail}`;
    logAct("errored", { where: "ingest", message: r.gap.detail });
  } else {
    let landed = 0;
    for (const f of r.files ?? []) {
      if (!f.code) continue;
      publishBuild({ type: "code", lang: f.lang, code: f.code }, f.path, `ingested from github.com/${repo}`, f.provenance);
      landed++;
    }
    const gaps = (r.files ?? []).filter((f) => f.gap).length;
    note =
      `ingested ${landed} file${landed === 1 ? "" : "s"} from github.com/${repo}` +
      ` · license ${r.license ?? "unknown"}` +
      ` · ${r.admitted.kept} admissible of ${r.admitted.of}${r.admitted.dropped ? ` (${r.admitted.dropped} past the declared cap)` : ""}` +
      (gaps ? ` · ${gaps} failed to fetch` : "");
    logAct("recorded", { ingest: repo, landed, license: r.license ?? null });
  }

  const p = document.createElement("p");
  p.className = "prose";
  p.textContent = note;
  body.append(p);

  state.history.push({ role: "user", content: typed }, { role: "assistant", content: note });
  const turn = state.summary.turnCount + 1;
  observeExchange(turn, typed, note);
  const fold = mechanicalFoldLine(typed, note);
  state.turnFolds.push(fold);
  state.summary = advanceSummaryFold(state.summary, fold);
  renderFold(node, { fold });
  renderThreads();
  $("status").textContent = readyLine();
  releaseBusy();
}

/**
 * The seed scrub: a demand for a new artifact of a known kind looks for
 * existing open work FIRST. A permissive-licensed, single-file hit is
 * spliced as the build's birth — the model writes nothing — with
 * provenance riding the entry forever. Anything less definitive returns
 * falsy and the model path proceeds; found candidates are already on the
 * server's record either way. Returns true only when the turn is fully
 * answered here.
 */
async function maybeSeedBuild(question) {
  const ask = buildAsk(question, { langs: SEED_LANGS, indefinites: enginePriors.INDEFINITE_DETERMINERS });
  if (!ask) return false;
  const archetype = archetypeOf(question, { indefinites: enginePriors.INDEFINITE_DETERMINERS, lang: ask.lang });
  if (!archetype) return false;
  $("status").textContent = `scrubbing for existing open ${archetype}…`;
  let r = null;
  try {
    r = await (await fetch(`${EXPLORE_BASE}/api/seed/search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: `${archetype} ${ask.lang}`, lang: ask.lang }),
    })).json();
  } catch {
    return false; // the scrub is best-effort; the model path is the floor
  }
  let seed = r?.seed ?? null;

  // THE LOCAL MODEL NAVIGATES, UNDER PHYSICS (user direction: "we need the
  // local model to be doing all the navigating with physics"). When no
  // candidate auto-splices (the zero-model rung: known-permissive license +
  // unambiguous file), the choice of which found repo to reuse is a
  // NAVIGATION decision — the model's kind of call — made under the
  // decoder's wall: the schema's enum IS the candidate list plus "none",
  // so a repo outside the found set is unrepresentable, and everything
  // after the pick (fetch, file admission, provenance) stays mechanical.
  // The thinking affordance's whole content, now: every messages array this
  // turn actually sent to the model, verbatim (renderFold, below).
  const sentCalls = [];
  if (!seed && r?.candidates?.length) {
    logAct("checked", { seedScrub: archetype, candidates: r.candidates.length, spliced: false });
    $("status").textContent = `asking ${state.model} to navigate ${r.candidates.length} candidates…`;
    try {
      const names = r.candidates.map((c) => c.repo);
      const pickPrompt =
        `You are choosing which existing repository to reuse for this request: ${question}\n\n` +
        `Candidates:\n` +
        r.candidates.map((c) => `- ${c.repo} — ${c.description ?? "no description"} (license ${c.license ?? "unknown"}, ${c.stars}★)`).join("\n") +
        `\n\nPick the one whose description best matches the request, or none if none of them is it.`;
      const pickMessages = [{ role: "user", content: pickPrompt }];
      sentCalls.push({ n: sentCalls.length + 1, messages: pickMessages });
      const reply = await complete(pickMessages, {
        model: state.model,
        json: { type: "object", properties: { pick: { type: "string", enum: [...names, "none"] } }, required: ["pick"] },
      });
      const pick = extractObject(reply)?.pick;
      if (pick && pick !== "none") {
        logAct("planned", { navigated: pick, from: names.length, physics: "enum" });
        const ing = await (await fetch(`${EXPLORE_BASE}/api/seed/ingest`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ repo: pick }),
        })).json();
        const ofLang = (ing.files ?? []).filter((f) => f.code && f.lang === ask.lang);
        let file = ofLang.length === 1 ? ofLang[0] : ofLang.find((f) => /(?:^|\/)index\./i.test(f.path)) ?? null;
        if (!file && ofLang.length > 1) {
          // The file choice is navigation too — same physics, paths as enum.
          const fileMessages = [{ role: "user", content: `Which file is the ${archetype} itself?\n${ofLang.map((f) => `- ${f.path}`).join("\n")}` }];
          sentCalls.push({ n: sentCalls.length + 1, messages: fileMessages });
          const fReply = await complete(
            fileMessages,
            { model: state.model, json: { type: "object", properties: { pick: { type: "string", enum: ofLang.map((f) => f.path) } }, required: ["pick"] } },
          );
          file = ofLang.find((f) => f.path === extractObject(fReply)?.pick) ?? null;
        }
        if (file) seed = { code: file.code, lang: file.lang, provenance: file.provenance };
      }
    } catch (err) {
      logAct("errored", { where: "seed-navigation", message: String(err.message || err) });
    }
  }

  if (!seed) {
    $("status").textContent = readyLine();
    return false;
  }

  addMessage("user", question);
  const node = addMessage("assistant", "");
  const body = node.querySelector(".body");
  logAct("asked", { text: question });

  publishBuild({ type: "code", lang: seed.lang, code: seed.code }, archetype, question, seed.provenance);
  const made = state.builds[state.builds.length - 1];
  const prov = seed.provenance;
  const note =
    `found an existing ${archetype} and seeded fold ${made.n} from it — ` +
    `${prov.repo} (${prov.license ?? "license unknown"}, ${prov.stars ?? 0}★) · ` +
    `the model wrote nothing; iterate on it by complaint as ever, and its provenance rides every version and export.`;
  const p = document.createElement("p");
  p.className = "prose";
  p.textContent = note;
  body.append(p);
  body.append(buildChip(made, archetype));

  state.history.push({ role: "user", content: question }, { role: "assistant", content: note });
  const turn = state.summary.turnCount + 1;
  observeExchange(turn, question, note);
  const fold = mechanicalFoldLine(question, note);
  state.turnFolds.push(fold);
  state.summary = advanceSummaryFold(state.summary, fold);
  renderFold(node, { sent: sentCalls });
  renderThreads();
  $("status").textContent = readyLine();
  releaseBusy();
  return true;
}

/**
 * The delta grammar. Ollama's `format` is the decoder's wall, not a request
 * (P2: structure is obtained by grammar or extracted mechanically, never by
 * asking the model harder).
 *
 * TWO FIELDS, ONE EDIT — both shapes measured live (2026-08-17), neither
 * reasoned about. (1) Under an ARRAY-OF-OBJECTS schema gemma2:2b emits an
 * empty array — whitespace, then close — the same grammar-death P2 already
 * records for the plan array, one nesting level in; a flat parallel-array
 * shape was tried next and is worse (qwen2.5-coder misaligned the lists,
 * a correspondence nothing can enforce). One flat object per call is the
 * shape a 2B decoder physically walks, and iterating one edit at a time is
 * what the append-only log is FOR: the log does the remembering, so each
 * call only has to be right about the next small thing.
 * (2) `op` is deliberately NOT asked for. Both models answered "INS" while
 * supplying an `add` that replaced `find`, which applied at its word puts
 * two buttons in the widget — so the act is DERIVED from the bytes by
 * `readOps` (L5: never leave a compliance-critical fact to the model's own
 * instruction-following; the mouth supplies bytes, the instrument types
 * the act).
 */
const PATCH_SCHEMA = {
  type: "object",
  properties: {
    find: { type: "string" },
    add: { type: "string" },
  },
  required: ["find", "add"],
};

/** The delta a reply carried, read mechanically — skills.js's own balanced
 * walk (`extractObject`, the object twin of holon.js's extractArray),
 * REUSED rather than re-derived: a third reading of "the JSON in a reply"
 * is exactly the drift eoreader6's reconcile-don't-dedupe rule forbids.
 * The operator typing is build-log.js's `readOps`, off the bytes. A miss is
 * `null` and the caller types it as a gap. */
function parseOps(text) {
  const obj = extractObject(text);
  if (!obj) return null;
  // One edit is the asked shape; a list is still read if a larger model
  // volunteers one, because widening the extractor is P2's own remedy.
  return buildLog.readOps(Array.isArray(obj.ops) ? obj.ops : [obj]);
}

/**
 * The /fold turn: a model revision routed onto an existing fold's log by the
 * door's own number.
 *
 * THE DELTA IS ASKED FOR FIRST, and this is the point of the whole pass
 * (user direction, 2026-08-17): a small model can reliably say "change
 * #4CAF50 to #2196F3"; it cannot reliably retype an entire html file
 * byte-for-byte without introducing a new mistake somewhere it was never
 * asked to touch. So the first call is grammar-constrained to ops, the ops
 * are applied MECHANICALLY by the log (build-log.js::applyOps — exact bytes,
 * exactly once, atomic), and the new whole is compiled by the fold. The
 * model only has to be right about the change.
 *
 * The ladder, every descent typed and said out loud: ops that apply land as
 * a patch SUPERSEDE; ops that do not apply (unlocated / ambiguous /
 * malformed, or no ops at all) descend to the FULL-code path this door has
 * always had, which is itself the same mechanical extraction
 * (pickRevisionSegment) it always was. A reply with neither is a typed gap.
 * Identical code, either way, is churn the log refuses.
 *
 * `rezero` lands the result as a re-zero (REC, the operator's words as its
 * trigger) rather than a revision — a judgment concedes a ground, an
 * instruction compiles a new whole. Same machine, two landings.
 */
async function foldTurn(n, instruction, typed, { rezero = false, trigger = null, tell = null, matchedOn = null, quiet = false, autoRun = true } = {}) {
  const entry = state.builds.find((b) => b.n === n);
  if (!entry) {
    const have = state.builds.length
      ? `this conversation holds fold${state.builds.length === 1 ? "" : "s"} ${state.builds.map((b) => b.n).join(", ")}`
      : "this conversation holds no folds yet";
    return usageTurn(typed, `fold ${n} does not exist — ${have}.`);
  }
  // A database fold (P25) is not text revision's to touch — its log is
  // populated by real SQL execution (the terminal, or /run sql), never by
  // a model rewriting a fence. This door's whole machinery below (scoutSpan,
  // the patch ladder, buildFold) assumes entry.log, which a database fold
  // does not carry (it carries entry.storeLog instead) — refused here,
  // named, rather than left to throw further down.
  if (entry.kind === "database") {
    return usageTurn(typed, `fold ${n} is a database fold — it is populated by SQL execution (the terminal's sql runtime, or chat's \`/run sql\` door), not by \`/fold\`'s text revision. Its current projection is in the Folds panel.`);
  }

  if (!quiet) addMessage("user", typed);
  const node = addMessage("assistant", "");
  const body = node.querySelector(".body");

  const cur = buildFold(entry, null);
  const lang = cur.seg?.lang ?? "";
  logAct("asked", { text: typed });

  // SIG FIRST: resolve the operator's own words to the region of the code
  // they name, mechanically, before any model call. A hit shrinks the
  // arena — the model is shown the scouted region, the edit only has to be
  // unique inside it, and the landing records what attention scoped.
  const scout = typeof cur.code === "string" ? scoutSpan(instruction, cur.code, enginePriors.INFLECTIONAL_SUFFIXES) : null;
  const arena = scout ? cur.code.slice(scout.span[0], scout.span[1]) : cur.code ?? "";

  // What the log already knows, said to the model: dead ends are not
  // re-walked (DEF entries) and known defects aim the ask (the last EVA
  // witness). Both are the log's own entries, quoted — never a model's
  // memory of itself. A regression refusal is quoted as a CONSTRAINT, not
  // just a dead end: the refusal's own findings are the shape of the
  // acceptable next attempt ("last patch would have broken script syntax —
  // leave that region alone"), which is the difference between trying
  // harder and trying elsewhere.
  const refusals = entry.log.entries.filter((e) => e.operator === "DEF").slice(-2);
  const lastWitness = entry.log.entries.filter((e) => e.operator === "EVA").at(-1);
  const known =
    (refusals.length
      ? `\nEdits already tried and refused (do not repeat): ${refusals
          .map((e) => {
            const g = e.refusal?.gap;
            const base = `find ${JSON.stringify(String(e.refusal?.ops?.[0]?.find ?? "").slice(0, 48))} — ${g?.kind}`;
            const broke = g?.kind === "regressed" && g.findings?.length
              ? ` (it would have introduced: ${g.findings.map((f) => (f.id ? `${f.kind} "${f.id}"` : `${f.kind}: ${String(f.detail ?? "").slice(0, 50)}`)).join("; ")} — change something else)`
              : "";
            return base + broke;
          })
          .join("; ")}.`
      : "") +
    (lastWitness && lastWitness.witness?.ok === false
      ? `\nKnown defects in the current code: ${lastWitness.witness.findings.map((f) => f.detail).join("; ")}.`
      : "");

  // THE SMALLEST CHANGE FIRST. The model is asked for the delta, not the
  // file — the ask is plain prose (a small model reads prose better than
  // bracket scaffolding), and the SHAPE is held by the decoder's grammar,
  // never by the asking. `find` must be the code's own bytes because that
  // is what makes application mechanical; the model is told so plainly, and
  // if it gets it wrong the gap is typed rather than absorbed.
  const opsPrompt =
    (scout
      ? `Here is the part of fold ${n}${lang ? ` (${lang})` : ""} your request points at ("${scout.term}"):\n\n`
      : `Here is the working code of fold ${n}${lang ? ` (${lang})` : ""}:\n\n`) +
    `\`\`\`${lang}\n${arena}\n\`\`\`\n\n` +
    `Change it as follows: ${instruction}\n${known}\n` +
    `Reply with ONE edit, the smallest that does it — never the whole file. ` +
    `find is a short piece of the code above, copied exactly, that appears only once. ` +
    `add is what that piece becomes. To delete something, leave add empty.`;

  $("status").textContent = `revising fold ${n}…`;
  body.textContent = `asking for the smallest change to fold ${n}…`;
  let answer = "";
  let landedPatch = null;
  let opsGap = null;
  // The thinking affordance's whole content, now: every messages array this
  // turn actually sent to the model, verbatim (renderFold, below).
  const sentCalls = [];

  // THE MECHANICAL RUNG FIRST (widget.js::literalSwap): an ask that names
  // both ends of a value change — "from 30 to 60", "#4CAF50 to #2196F3" —
  // is an edit computed from the operator's own words and the projection's
  // own bytes, no model call at all. Zero tokens, milliseconds, and immune
  // to the measured failure class where the model rewrites an unrelated
  // listener to change one attribute. Direction is decided by OCCURRENCE
  // (the value the code holds is what changes), never by English. The
  // landing is an ordinary SYN patch — same stack, same witness gate, same
  // record — its reason says no model was asked.
  // The arena is a hint, never a cage: the scout can resolve an
  // instruction VERB against code bytes ("change the max…" scoping to the
  // addEventListener('change') line — measured live, and it is also why a
  // model handed that arena rewrote the wrong listener). The swap's own
  // uniqueness walls hold globally, so an arena that starves it falls back
  // to the whole projection rather than to the model.
  const swap =
    typeof cur.code === "string"
      ? literalSwap(instruction, cur.code, { within: scout?.span ?? null }) ??
        (scout ? literalSwap(instruction, cur.code, {}) : null)
      : null;
  if (swap) {
    const applied = buildLog.applyOps(cur.code ?? "", swap.ops, {});
    if (applied.ok) {
      landedPatch = { ops: swap.ops, code: applied.code, every: false, touched: applied.touched, within: null, mechanical: true };
      answer = "";
      logAct("revised", { fold: n, mechanical: true, from: swap.from, to: swap.to });
    }
  }

  if (!landedPatch) try {
    const opsMessages = [{ role: "user", content: opsPrompt }];
    sentCalls.push({ n: sentCalls.length + 1, messages: opsMessages });
    const reply = await complete(opsMessages, {
      model: state.model,
      json: PATCH_SCHEMA,
    });
    answer = reply;
    const ops = parseOps(reply);
    if (!ops) {
      opsGap = "the reply carried no edits";
    } else {
      // The log is the gate: applyOps runs against the live projection and
      // a patch that does not apply never lands. Nothing here decides
      // whether the change was RIGHT — only whether it is a change this
      // projection can mechanically take. The ladder: WITHIN the scouted
      // arena when attention resolved one (uniqueness judged inside it,
      // bytes outside it untouchable), strict first, and `every` only as
      // the disclosed rescue of an `ambiguous` gap — the landing says how
      // many places moved, because an every-landing can also be the bad
      // case (a token living in markup AND script), and the reader's next
      // complaint is the repair.
      const within = scout?.span ?? null;
      const strict = buildLog.applyOps(cur.code ?? "", ops, { within });
      const trial = strict.ok ? strict : strict.gap.kind === "ambiguous" ? buildLog.applyOps(cur.code ?? "", ops, { every: true, within }) : strict;
      if (!trial.ok) {
        opsGap = `${trial.gap.kind}${trial.gap.find ? `: ${trial.gap.find.slice(0, 60)}` : ""}`;
        // The dead end joins the log — DEF · Figure, evidence the next ask
        // is shown, never a vanished return value.
        const b0 = entry.log.entries.length;
        entry.log = buildLog.refuseBuild(entry.log, { ops, gap: trial.gap });
        if (entry.log.entries.length > b0) {
          mirrorBuild(entry, b0);
          persistBuilds();
        }
      } else landedPatch = { ops, code: trial.code, every: !strict.ok, touched: trial.touched, within };
    }
  } catch (err) {
    opsGap = `engine error: ${err.message || err}`;
    logAct("errored", { where: "fold-patch", message: String(err.message || err) });
  }

  // The descent, typed and disclosed: the delta did not apply, so the door
  // falls back to the full-code path it has always had. One call each, both
  // mechanically read — never a retry-harder loop on the same ask.
  let seg = null;
  if (!landedPatch) {
    body.textContent = `the edits did not apply (${opsGap}) — asking for the whole file…`;
    logAct("revised", { fold: n, patch: false, gap: opsGap });
    const prompt =
      `${instruction}\n\n` +
      `The working code of fold ${n}${lang ? ` (${lang})` : ""} is below. ` +
      `Reply with the complete revised code in one fenced block.\n\n` +
      `\`\`\`${lang}\n${cur.code ?? ""}\n\`\`\``;
    try {
      const wholeMessages = [{ role: "user", content: prompt }];
      sentCalls.push({ n: sentCalls.length + 1, messages: wholeMessages });
      answer = await complete(wholeMessages, {
        model: state.model,
        onDelta: (out) => {
          body.textContent = out;
        },
      });
    } catch (err) {
      answer = `[engine error: ${err.message || err}]`;
      logAct("errored", { where: "fold-revision", message: String(err.message || err) });
    }
    seg = pickRevisionSegment(parseSegments(answer), lang);
  }
  body.textContent = "";

  // The model's prose, kept visible as its own voice — but never a router.
  for (const s of parseSegments(answer)) {
    if (s.type !== "prose") continue;
    const p = document.createElement("p");
    p.className = "prose";
    p.textContent = s.text;
    body.append(p);
  }

  let note;
  const before = entry.log.entries.length;
  const code = landedPatch ? landedPatch.code : seg?.code ?? null;
  // The candidate's witness, computed ONCE, before anything lands — the
  // gate below and the EVA entry after landing both read this one reading.
  const candidateWitness = code == null ? null : witnessCode(lang, code);

  if (code == null) {
    // Typed gap: the door was walked, the target named, and nothing landed.
    note = `the reply carried no code — nothing landed on fold ${n}.`;
    logAct("revised", { fold: n, landed: false, gap: opsGap ?? "no code in reply" });
  } else if (witnessRegressed(lastWitness?.witness ?? null, candidateWitness)) {
    // THE WITNESS GATES THE LANDING, not just the disclosure — measured
    // live (2026-08-17, gemma2:2b on a canvas drawing app): three complaints
    // in a row each landed a witnessed-dirty patch, because witnessCode ran
    // only AFTER commit and never compared against what came before. Every
    // attempt passed the one wall that existed (does it apply?) while the
    // artifact steadily lost its clear button's listener, then its id, then
    // its identifying tag entirely. Witnessing the CANDIDATE before it joins
    // the log — against the last EVA this ground already carries — is P5
    // (production closes on the fold) read onto a patch: a repair that
    // REGRESSES on a check the ground already had an answer for is refused,
    // not promoted. This is the metacognitive seat of the parliament (user
    // direction, 2026-08-17: several small witnesses, disagreements landing
    // typed on the record — "the pursuit loop needs a parliament, not a
    // supreme court"): the witness that watches whether the attempts are
    // getting better or worse. The refusal is DEF evidence the next ask is
    // shown, exactly like an unlocated patch — tried-and-refused teaches.
    // GROUND FRESHNESS, typed rather than assumed: the gate judges against
    // the last EVA, and if landings have happened since (a write path that
    // skipped the witness — the measured editor-commit gap), the ground is
    // stale by that many and the refusal SAYS so. "Refused against the
    // current state" and "refused against a witness three landings behind"
    // are different disclosures, and only one of them is fully trusted —
    // distance from the last witness widens the noise floor on this gate
    // the way distance from a re-zero widens it on activation.
    const staleBy = lastWitness
      ? entry.log.entries.filter((e) => e.seq > lastWitness.seq && e.version != null).length
      : 0;
    entry.log = buildLog.refuseBuild(entry.log, {
      ops: landedPatch?.ops ?? null,
      gap: {
        kind: "regressed",
        reason: "this change would introduce a defect the current version does not have",
        findings: candidateWitness.findings,
        ...(staleBy > 0 ? { staleBy } : {}),
      },
      reason: "witness",
    });
    mirrorBuild(entry, before);
    persistBuilds();
    // The refusal NAMES what it saw — a count with no finding reads as a
    // mystery, and a reader who cannot see why a change was refused cannot
    // judge whether the refusal was right (measured live: the first thing
    // the operator asked was "why does it think it's adding defects?").
    const named = candidateWitness.findings
      .map((f) => (f.id ? `${f.kind} "${f.id}"` : `${f.kind} (${String(f.detail ?? "").slice(0, 60)})`))
      .join("; ");
    note =
      `fold ${n} · refused · the change would introduce: ${named} — the current version does not have this defect` +
      (staleBy > 0 ? ` · judged against a witness ${staleBy} landing(s) old` : "");
    logAct("revised", { fold: n, landed: false, regressed: true, findings: candidateWitness.findings.length, ...(staleBy ? { staleBy } : {}) });
  } else {
    // Three landings, one machine. A judgment concedes a ground (REC,
    // carrying the operator's own words); an instruction supersedes — as a
    // PATCH when the delta applied (the entry carries the ops, the fold
    // compiles the whole) and as FULL code when the door had to descend.
    // Attention that resolved lands first — SIG, the arena the patch that
    // follows applied within, in the operator's own term.
    if (landedPatch && scout) {
      entry.log = buildLog.scoutBuild(entry.log, { term: scout.term, span: scout.span });
    }
    if (rezero) {
      entry.log = buildLog.rezeroBuild(entry.log, {
        code,
        seg: { ...(cur.seg ?? {}), code },
        trigger: trigger ?? instruction,
        tell,
        matchedOn,
        patch: landedPatch ? { ops: landedPatch.ops, ...(landedPatch.within ? { within: landedPatch.within } : {}) } : null,
      });
    } else if (landedPatch) {
      const r = buildLog.patchBuild(entry.log, { ops: landedPatch.ops, reason: "revision", tell, every: landedPatch.every, within: landedPatch.within });
      entry.log = r.log;
    } else {
      entry.log = buildLog.reviseBuild(entry.log, { code, reason: "revision" });
    }
    const landed = entry.log.entries.length > before;
    if (landed) {
      // The witness closes the loop — what the landing actually did, read
      // mechanically (witness.js), landed as EVA and fed to the NEXT ask.
      // Unexamined languages attach nothing: a gap is not a clean bill.
      // Computed BEFORE landing (the gate above already needed it) and
      // reused rather than re-run against the same bytes.
      if (candidateWitness.ok !== null) entry.log = buildLog.attachWitness(entry.log, { witness: candidateWitness });
      entry.cursor = null;
      entry.draft = null;
      mirrorBuild(entry, before);
      persistBuilds();
      renderBuilds(n);
      const now = buildFold(entry, null);
      const places = landedPatch?.touched?.reduce((a, b) => a + b, 0) ?? 0;
      const lastW = entry.log.entries.filter((e) => e.operator === "EVA").at(-1)?.witness;
      const how =
        (landedPatch
          ? `${landedPatch.ops.length} edit${landedPatch.ops.length === 1 ? "" : "s"} (${landedPatch.ops.map((o) => o.op).join(" ")})` +
            (landedPatch.mechanical ? ` · computed from your words — no model call` : "") +
            (scout && landedPatch.within ? ` · within "${scout.term}"` : "") +
            (landedPatch.every ? ` · changed in ${places} places` : "")
          : "whole file") +
        (lastW ? (lastW.ok ? " · witness clean" : ` · witness: ${lastW.findings.length} finding(s)`) : "");
      note = rezero
        ? `fold ${n} · ground ${now.ground} · re-zeroed from your words · ${how}` +
          (matchedOn && matchedOn.length ? ` · matched on: ${matchedOn.join(", ")}` : "")
        : `fold ${n} · v${now.version} · revision landed · ${how}`;
      logAct("revised", { fold: n, landed: true, version: now.version, patch: !!landedPatch, ops: landedPatch?.ops.length ?? 0 });
    } else {
      // The log's own churn refusal: identical code appends nothing, and
      // that is a result worth saying, not a silence.
      note = `the model returned identical code — fold ${n} is unchanged (churn refused by the log).`;
      logAct("revised", { fold: n, landed: false, churn: true });
    }
  }

  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "build-chip";
  chip.innerHTML = `<span aria-hidden="true">▤</span> `;
  chip.append(document.createTextNode(note));
  chip.onclick = () => {
    showView("builds");
    renderBuilds(n);
    document.getElementById(`build-${n}`)?.scrollIntoView({ block: "start" });
  };
  body.append(chip);
  if (autoRun) autoRunAndDisclose(entry, chip);

  // The turn on the conversation's own record. The fold line is mechanical —
  // the landing note says everything later turns need — so the summary
  // advances without spending a second model call on restating it.
  state.history.push({ role: "user", content: typed }, { role: "assistant", content: answer });
  const turn = state.summary.turnCount + 1;
  observeExchange(turn, typed, answer);
  const fold = mechanicalFoldLine(typed, note);
  state.turnFolds.push(fold);
  state.summary = advanceSummaryFold(state.summary, fold);
  logAct("folded", { line: fold });

  renderFold(node, { sent: sentCalls });
  renderThreads();
  $("status").textContent = readyLine();
  releaseBusy();
}

/**
 * The bound experiment, live: the same question answered twice against the
 * same passages. A — a free draft, audited and drawn with its grounds
 * (P12). B — bound generation: the answer's name field can only decode to a
 * cast handle, its figure field only to a cell the material states, each
 * with the empty escape; the model points at facts and phrases around
 * them. The prose field is still audited — the grammar cannot yet forbid a
 * leak there, so leaks render striped and the comparison line counts them.
 * The record is built from the BOUND answer: it is the candidate
 * instrument; A is its control.
 */
async function boundTurn(question, typed) {
  addMessage("user", typed);
  const node = addMessage("assistant", "");
  const body = node.querySelector(".body");

  const live = liveChunks();
  const foldedRefs = (state.summary.records || []).flatMap((r) => r.refs);
  const passages = live.length ? retrieve(live, question, 3, foldedRefs) : [];
  const sourceBlock = buildSourceBlock(passages);
  const handles = handlesFor(passages);
  const cells = extractCells(passages);
  const resolveName = castFor(passages);

  logAct("asked", { text: question });
  logAct("bound", { names: handles.length, figures: cells.length });

  const prep = `offer: ${handles.length} name(s), ${cells.length} figure(s), from ${passages.length} passage(s)`;
  body.textContent = `${prep}\nA · free draft…`;

  // The thinking affordance's whole content, now: every messages array this
  // turn actually sent to the model, verbatim (renderFold, below).
  const sentCalls = [];
  let free = "";
  try {
    $("status").textContent = "free draft…";
    const freeMessages = [
      { role: "system", content: BASE_PROMPT },
      { role: "user", content: sourceBlock ? `${question}\n\n${sourceBlock}` : question },
    ];
    sentCalls.push({ n: sentCalls.length + 1, messages: freeMessages });
    free = await complete(freeMessages, { model: state.model, autoContinue: true });
  } catch (err) {
    free = `[engine error: ${err.message || err}]`;
  }
  // Scrubbed before anything downstream reads it — same discipline as
  // holonicTurn's own `call` wrapper (2026-08-18): the model is never
  // shown this instrument's address format, so any bracket surviving into
  // its output is neutralized rather than measured or rendered as one.
  free = stripSelfCitations(free).text;
  const freeGrounding = checkGrounding(free, passages, { question, resolveName });
  const freeAttr = attribute(free, passages, live);

  body.textContent = `${prep}\nA · done\nB · bound…`;
  let boundRaw = "";
  try {
    $("status").textContent = "bound…";
    const boundMessages = [
      { role: "system", content: BOUND_SYSTEM_PROMPT },
      { role: "user", content: buildBoundPrompt(question, sourceBlock) },
    ];
    sentCalls.push({ n: sentCalls.length + 1, messages: boundMessages });
    boundRaw = await complete(boundMessages, { json: buildBoundSchema({ handles, cells }), model: state.model });
  } catch (err) {
    boundRaw = "";
  }
  const parsed = parseBound(boundRaw);
  const flat = stripSelfCitations(
    parsed.degraded ? boundRaw || "(bound reply unusable — typed degradation)" : flattenBound(parsed),
  ).text;
  const boundGrounding = checkGrounding(flat, passages, { question, resolveName });
  const boundAttr = attribute(flat, passages, live);

  // Render both, same organs drawing both.
  body.textContent = "";
  const sec = (label) => {
    const h = document.createElement("p");
    h.className = "fold-section";
    h.textContent = label;
    return h;
  };
  const divA = document.createElement("div");
  divA.className = "prose";
  renderBlocksInto(divA, free, (chunk) =>
    taggedProse(chunk, passages, classifySentences(free, freeAttr, freeGrounding.findings).filter((e) => findSentence(chunk, e.text))),
  );

  const divB = document.createElement("div");
  divB.className = "prose";
  if (parsed.degraded) divB.textContent = flat;
  else
    for (const s of parsed.sentences) {
      const p = document.createElement("p");
      p.className = "para";
      p.append(
        ...taggedProse(s.prose, passages, classifySentences(s.prose, boundAttr, boundGrounding.findings).filter((e) => findSentence(s.prose, e.text))),
      );
      for (const [val, kind] of [[s.name, "name"], [s.figure, "figure"]]) {
        if (!val) continue;
        const chip = document.createElement("button");
        chip.className = "ref attached";
        chip.textContent = val;
        const ref =
          kind === "figure"
            ? cells.find((c) => c.value === val)?.ref
            : passages.find((pp) => diaNorm(pp.text).includes(diaNorm(val)))?.ref;
        chip.title =
          kind === "figure"
            ? "Bound figure — decodable only from the material's own cells. Press to read the bytes."
            : "Bound name — decodable only from the material's cast. Press to read the bytes.";
        if (ref) chip.onclick = () => reopen(ref);
        p.append(document.createTextNode(" "), chip);
      }
      divB.append(p);
    }

  const compare = document.createElement("p");
  compare.className = "fold-note";
  compare.textContent =
    `free: ${unsupportedClaims(freeGrounding).length} claim(s) not in the material · ` +
    `bound: ${unsupportedClaims(boundGrounding).length} leak(s) in prose` +
    (parsed.degraded ? " · bound reply degraded" : "") +
    ` · offer: ${handles.length} names, ${cells.length} figures`;

  body.append(sec("A · free draft, audited"), divA, sec(`B · bound by grammar${parsed.degraded ? " (degraded)" : ""}`), divB, compare);

  // One turn on the conversation's record — the bound answer is the turn's
  // content; the free draft was its control.
  state.history.push({ role: "user", content: typed }, { role: "assistant", content: flat });
  const turn = state.summary.turnCount + 1;
  const fold = mechanicalFoldLine(question, flat);
  const boundUsed = checkCitations(flat, passages).used;
  const record = passages.length
    ? buildWarrantRecord({
        turn,
        gist: fold,
        channels: [
          ...(boundUsed.length ? ["cited"] : []),
          ...(attributedRefs(boundAttr).length ? ["attributed"] : []),
          ...(parsed.degraded ? [] : ["bound"]),
        ],
        refs: [...new Set([...boundUsed, ...attributedRefs(boundAttr), ...(parsed.degraded ? [] : cells.filter((c) => parsed.sentences.some((s) => s.figure === c.value)).map((c) => c.ref))])],
        unsupported: unsupportedClaims(boundGrounding),
        open: [...(parsed.degraded ? ["bound reply did not parse; raw shown as the model's own voice"] : [])],
      })
    : null;
  if (record) state.summary = addWarrantRecord(state.summary, record);
  if (record)
    logAct("recorded", {
      plane: record.plane,
      refs: record.refs,
      unsupported: record.unsupported.length,
      open: record.open.length,
    });
  logAct("folded", { line: fold });
  const arrivals = observeExchange(turn, question, flat);

  await refreshSummary(fold, arrivals, sentCalls);
  renderFold(node, { sent: sentCalls });
  renderThreads();
  $("status").textContent = readyLine();
  releaseBusy();
}

/**
 * The reflective turn: the same shape as any turn — retrieve, answer, check,
 * fold, record — run entirely on the self plane. The material this turn
 * reads is the conversation's own act ledger; the model is still only the
 * mouth (it phrases; every fact it may state is a ledger line with an
 * address, and the same organs that audit a material answer audit this
 * one). What comes out is typed end to end: the prompt block says SELF, the
 * refs say `self:`, and the record says `plane: "self"` — introspection
 * never wears the authority of a check that ran against the world.
 */
async function reflectTurn(question, typed) {
  addMessage("user", typed);
  const node = addMessage("assistant", "");
  const body = node.querySelector(".body");

  logAct("asked", { text: question });

  const all = ledgerChunks(state.reflexLog);
  // The offer: the reach of the present on this plane, plus what the
  // question's own words retrieve. A ledger paragraph is one turn — two
  // messages — so the recency slice is RECENCY_WINDOW/2 paragraphs: the
  // same declared present the fold sends raw, converted, not a new number.
  const recent = all.slice(-Math.floor(RECENCY_WINDOW / 2));
  const matched = retrieve(all, question, 3);
  const offered = [...new Map([...recent, ...matched].map((p) => [p.ref, p])).values()]
    .sort((a, b) => a.start - b.start);

  const past = buildSummarySystemMessage(state.summary);
  const sys = [BASE_PROMPT, ...(past ? [past] : []), buildSelfBlock(offered)]
    .filter(Boolean)
    .join("\n\n");

  // The thinking affordance's whole content, now: every messages array this
  // turn actually sent to the model, verbatim (renderFold, below).
  const sentCalls = [];
  let answer = "";
  try {
    $("status").textContent = "reflecting…";
    const messages = [
      { role: "system", content: sys },
      { role: "user", content: question },
    ];
    sentCalls.push({ n: sentCalls.length + 1, messages });
    answer = await complete(messages, { onDelta: (out) => { body.textContent = out; }, model: state.model, autoContinue: true });
  } catch (err) {
    answer = `[engine error: ${err.message || err}]`;
  }
  // Same scrub as the material plane's turns (2026-08-18): whatever the
  // model wrote is neutralized of any bracket shaped like this
  // instrument's own address before anything measures or renders it. The
  // self plane still shows the model its OWN address format in `sys`
  // above (buildSelfBlock, unlike buildSourceBlock, unchanged, scoped out
  // of this pass) — this scrub is what stands between that and the
  // rendered answer regardless.
  answer = stripSelfCitations(answer).text;

  const resolveName = castFor(offered);
  const grounding = checkGrounding(answer, offered, { question, resolveName });
  const attributions = attribute(answer, offered, all);
  const { used } = checkCitations(answer, offered);

  // Material addresses quoted inside the offered ledger lines are real,
  // re-openable refs on the world plane — the answer repeating one must not
  // be drawn as invented. They join the known set, nothing more: the self
  // plane may point INTO the world's record; it never absorbs it.
  const quoted = offered.flatMap((p) =>
    [...p.text.matchAll(REF_IN_TEXT)].map((m) => m[1]),
  );
  renderAnswer(body, answer, [...offered, ...quoted], attributions, grounding.findings, undefined, question);

  state.history.push(
    { role: "user", content: typed },
    { role: "assistant", content: answer },
  );
  const turn = state.summary.turnCount + 1;
  const fold = mechanicalFoldLine(question, answer);
  const refs = [...new Set([...used, ...attributedRefs(attributions)])];
  // A record exists only where a check ran (P6) — here, only when the
  // ledger had something to offer. An empty ledger is a typed open, and the
  // turn stays paraphrase-tier.
  const record = offered.length
    ? buildWarrantRecord({
        turn,
        gist: fold,
        plane: "self",
        channels: [
          "self",
          ...(used.length ? ["cited"] : []),
          ...(attributedRefs(attributions).length ? ["attributed"] : []),
        ],
        refs,
        unsupported: unsupportedClaims(grounding),
        // The same typed gap openQuestions gives a material turn, in this
        // plane's own words: an offer nothing cited is an open, not a pass.
        open: used.length || attributedRefs(attributions).length
          ? []
          : [`ledger lines offered but none cited: ${question.slice(0, 120)}`],
      })
    : null;
  if (record) state.summary = addWarrantRecord(state.summary, record);
  if (record)
    logAct("recorded", {
      plane: "self",
      refs: record.refs,
      unsupported: record.unsupported.length,
      open: record.open.length,
    });
  logAct("reflected", { refs: offered.map((p) => p.ref) });
  logAct("folded", { line: fold });
  const arrivals = observeExchange(turn, question, answer);

  await refreshSummary(fold, arrivals, sentCalls);
  renderFold(node, { sent: sentCalls });
  renderThreads();
  $("status").textContent = readyLine();
  releaseBusy();
}

/**
 * The summary refresh, shared by every kind of turn that spends tokens.
 *
 * The fold is bookkeeping, not reasoning: a short JSON object read off lines
 * that are already written. Spending the answer's effort — or the answer's
 * token headroom — on it would double the turn's latency for nothing, which
 * is exactly what a local 3B did until it was capped. It routes to the
 * fastest rung for the same reason.
 *
 * GATED on the aperture meter's own verdict (2026-08-17): when every
 * arrival of the exchange was measured and none exceeded its continuation
 * null — tiers.js's own "nothing to say upward: the ground did not change"
 * — the summary is CARRIED forward mechanically instead of rewritten by a
 * model call. The refresh is S1's state transition; a turn measured to
 * have moved nothing has nothing for it to record, and letting a small
 * model rewrite topic/flow/entities anyway is a per-turn chance for the
 * ground to drift under a conversation that is holding still. Measured
 * before wiring (aperture.js::exchangeHeldGround's own header): on a
 * settled eight-exchange stream the gate holds six, and refreshes exactly
 * where it must — the first turn (gaps refuse the hold) and a topic pivot
 * (the swerve arrived censored above). The fold LINE still lands either
 * way; a deferred refresh reads every held line when the ground next
 * moves. The one bound: a hold may not outlast the refresh prompt's own
 * fold window (MAX_FOLDS_IN_PROMPT — fold.js's declared constant, not a
 * number picked here), or a held line would fall out of the window
 * unseen by any refresh. The skip is on the ledger as a `carried` act —
 * a decision the instrument made is never silent.
 *
 * `forceRefresh` (metacognition.js::forcesFoldRefresh, P72) ORs onto this
 * gate rather than replacing it — the module's own stated design ("a
 * natural OR onto refreshSummary's existing gate, not a replacement for
 * it"). A real, positive S1/S2 contradiction on THIS turn means the
 * running summary may itself carry the error S2 just found, which is
 * grounds to refresh regardless of what the discourse-drift meter alone
 * decided: `exchangeHeldGround` watches whether the GROUND moved, this
 * watches whether S1's OWN account of it was found wrong — different
 * axes, so one holding still is never evidence the other should too.
 */
// `sentCalls`: the caller's own capture of every messages array sent to the
// model this turn (renderFold's whole content, now) — this refresh is one
// more call in that same turn when it fires, so it is appended to the same
// array rather than left to vanish as a call the turn's own disclosure never
// knew happened.
async function refreshSummary(fold, arrivals = null, sentCalls = null, { forceRefresh = false, because = null } = {}) {
  state.turnFolds.push(fold);
  const heldGround = Boolean(arrivals) && exchangeHeldGround(arrivals);
  if (heldGround && forceRefresh) {
    // The override is itself an act, never silent — the same discipline
    // the ordinary `carried` skip below already holds for the opposite
    // decision. The reason is the caller's (P109: a filled void is a
    // second reason beside the S1/S2 disagreement).
    logAct("forcedRefresh", { because: because ?? "S1/S2 disagreement (metacognition.js)" });
  }
  if (heldGround && !forceRefresh && state.heldFolds < MAX_FOLDS_IN_PROMPT - 1) {
    logAct("carried", { streak: state.heldFolds + 1 });
    state.heldFolds += 1;
    state.summary = advanceSummaryFold(state.summary, fold);
    return;
  }
  state.heldFolds = 0;
  try {
    $("status").textContent = "folding…";
    const messages = [
      { role: "system", content: FOLD_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildSummaryUpdatePrompt(state.summary, [
          ...(state.summary.folds || []),
          fold,
        ]),
      },
    ];
    sentCalls?.push({ n: sentCalls.length + 1, messages });
    const raw = await complete(messages, {
      effort: "low", maxTokens: FOLD_MAX_TOKENS, json: FOLD_SCHEMA, model: routeModel(ROUTE_KINDS.SUMMARY, { offered: state.offeredModels, selected: state.model }),
    });
    // WITNESSED (spec: wiring-the-measured-memory-v2, F1). The refresh is a
    // consolidation step chained on its own prior output — this project's
    // own NELL lesson, applied to the gist: check the LEAVES (the live
    // records/folds this refresh could actually see), never fold-to-prior-
    // fold, so drift that looks clean turn over turn cannot hide behind an
    // ever-updating baseline. A refresh that drops a still-cited name or
    // invents an unbacked one is refused; the prior summary is CARRIED
    // (advanceSummaryFold) instead, and the refusal lands on the ledger —
    // a decision the instrument made is never silent.
    const prevSummary = state.summary;
    const next = updateSummaryWithFold(prevSummary, fold, raw);
    const consolidationCheck = extractSummaryFindings(prevSummary.entities, next.entities, {
      records: projectRecords(prevSummary),
      folds: projectFolds(prevSummary),
    });
    if (witnessRegressed({ ok: true, findings: [] }, consolidationCheck)) {
      logAct("consolidation_regressed", { findings: consolidationCheck.findings });
      state.summary = advanceSummaryFold(prevSummary, fold);
    } else {
      state.summary = next;
    }
  } catch {
    state.summary = updateSummaryWithFold(state.summary, fold);
  }
}

/**
 * A task rather than a question: plan into parts, run each part as its own
 * turn-sized cycle, assemble with provenance. All of it in holon.js, which is
 * pure — this function is only the page around it: progress lines while it
 * runs, the same renderers as any turn when it lands, and ONE fold and ONE
 * record for the whole task, built from work the parts already did. Nothing
 * is re-checked at fold time; a holonic turn that re-measured its own output
 * could disagree with itself, and then one of the two answers would be lying.
 *
 * The model in the loop is whatever complete() points at. On Ollama the whole
 * task — plan, every part, every correction — runs on the machine.
 */
// An explicit ask rarely names more than a couple of sources at once, and
// each is a real fetch (plus, now, a real archive request) — giver: this
// file, engineering starting point (P9).
const NAMED_URL_MAX = 3;

// ── System 1 / System 2 (2026-08-19, user direction: "lets test the
// experience of if we have 2 models respond. one is just the raw
// transcript that gets summarized for size and responds fast, the next is
// the system 2 response, which also has access to the fast response. and
// there's a gating on system 2") ────────────────────────────────────────
//
// S1 is the naked base layer this evening's whole thread of fixes was
// aimed at: S1_SYSTEM_PROMPT (CHAT_SYSTEM_PROMPT plus one minimal, no-
// canned-phrase clause asking S1 to let its own uncertainty show when
// what it's saying is worth checking — holon.js says why), the recent
// transcript (state.history, the
// SAME regime-narrowed present() slice the checked path already uses —
// "summarized for size" is the fold/regime machinery this app already
// has, not a second summarizer invented here), and the person's own
// words. No retrieval, no material, no checking, no correction budget —
// it answers or it doesn't, on the fastest routed rung, and renders
// immediately so the reader is never staring at nothing.
//
// The gate is mechanical, never a second model call spent deciding
// whether to spend a third: extractCheckableAtoms (grounding.js) already
// exists for exactly this question — "does this text assert something a
// reader could check" — built originally for holon.js's own no-material
// fallback. An empty S1 reply, or one with no checkable claim in it at
// all (a greeting, an opinion, a poem, small talk), never earns S2; a
// reply naming something a reader could verify does. This is NOT the
// P23 preflight decision (shouldPreflight) — that one fires on the
// TOGGLES alone (checking+web+no material) regardless of what the
// question even asks, which would make S2 run on every turn whenever
// those are on and defeat the entire point of a selective gate.
//
// THE DODGE, found live 2026-08-26 and the reason for the third clause
// below. The gate above reads S1's REPLY and infers the QUESTION's nature
// from it — and that inference inverts the moment S1 answers a factual
// question socially. Real transcript, verbatim: "who was lincoln's vp?" →
// "Shhh... I was just about to ask the same thing! 😄". Zero checkable
// atoms in that reply, so the gate read "small talk", skipped S2, and the
// turn ended with no search, no material, and no checking of a question
// that is entirely checkable. A model declining to answer is the case that
// most needs the real pass, and it was the one case guaranteed to skip it.
//
// The signal for "the question itself asked something" is composed from two
// organs already here rather than a new hand-typed list of interrogatives
// (the engine's own prior register carries no such class, and this repo
// does not mint closed classes locally): an interrogative TERMINATOR (the
// engine's SENTENCE_TERMINATORS registers "?" with giver "script/latn"),
// plus preflightQuery finding real content words in the question after its
// own stopwording. Both are needed — "how are you?" has the terminator but
// reduces to nothing, and "good morning" has content but is not a question.
//
// This clause only ever ADDS a pass, never suppresses one, so it cannot
// make the gate quieter than it was. Disclosed limit: a factual question
// typed without a question mark ("tell me lincoln's vp") that S1 also
// dodges still slips through. That case is strictly rarer than the one
// this closes, and closing it properly needs an interrogative class earned
// in the engine rather than guessed at here.
function dodgedASubstantiveQuestion(question) {
  const q = String(question ?? "").trim();
  return q.endsWith("?") && preflightQuery(q, "").length > 0;
}

/**
 * TRULY TRIVIAL — the only thing System 1 answers alone (user direction
 * 2026-08-26: "only respond to truly trivial things with system 1").
 *
 * Three structural facts about the utterance itself, no word list: at most
 * two words, no question mark, no digit. That is the shape of chitchat —
 * "hi", "ok", "yes", "thanks", "good morning", "lol nice" — and nothing
 * else reaches System 1 alone.
 *
 * preflightQuery is deliberately NOT the test here, though it was the first
 * thing tried. It answers "what would I look up", which is a different
 * question from "is this worth looking up", and after the length floor
 * dropped to > 1 (see proof.js) it splits exactly wrong at both ends:
 * "hi" and "ok" survive stopwording and would take the full grounded path,
 * while "what is 2+2" reduces to nothing — every token either a stopword or
 * a single character — and would be answered by S1 with no checking at all.
 * Measured, not reasoned about: that split was run over these same cases
 * before this function was written.
 *
 * ERRS TOWARD GROUNDING, on purpose. "how are you?" carries a question mark
 * and so takes the full path — one wasted search for a pleasantry. That is
 * the safe direction, and the same asymmetry proof.js's own preflight
 * comment already argues for: a false positive costs one search, a false
 * negative is a checkable question answered from the model's memory with
 * nothing behind it — the failure this whole line of work exists to close
 * ("who was lincoln's vp?" answered "William R. Hargis", a person who does
 * not exist). Loosen only with a measurement showing the wasted searches
 * cost more than the misses they would reintroduce.
 */
function triviallyChatty(question) {
  const q = String(question ?? "").trim();
  if (!q) return true;
  if (q.includes("?") || /\d/.test(q)) return false;
  return q.split(/\s+/).filter(Boolean).length <= 2;
}

function needsSystem2(question, s1Text) {
  if (!String(s1Text ?? "").trim()) return true; // S1 said nothing — worth a real pass
  if (extractCheckableAtoms(s1Text, { question }).length > 0) return true;
  return dodgedASubstantiveQuestion(question);
}

// `model` was originally the SAME rung for both passes (user direction,
// 2026-08-19: "let's use the same model for each, what's different is
// behind the scenes, the surf and fold and stuff") — isolating the ONE
// variable that experience was actually testing (does the apparatus —
// retrieval, checking, correction — earn its cost) from a confound (a
// bigger model would also improve the answer on its own, with or without
// any of that). Amended 2026-09-01, user direction: that question is
// settled by now; S1 and S2 each spend the model-routing.js constant
// suited to their own job (S1_MODEL/S2_MODEL — see that file's header
// for why), not the picker's single choice.
/**
 * The conversation so far, distilled to one line — topic, flow, entities.
 *
 * ONE reading of "the conversation so far", shared by both passes. It was
 * computed inline in `holonicTurn` alone, which meant S1 — the pass that
 * answers FIRST — never saw it at all, and this is the SECOND time tonight
 * that exact omission has been found: P34's own amendment fixed it in
 * holon.js's `executeMessages`, where the fold was included only when raw
 * history was EMPTY, backwards, because the two carry different
 * information (verbatim turns vs. a distilled synthesis) and are not
 * substitutes for one another.
 *
 * Worse here for the reason that amendment already named: `presentWindow`
 * narrows the raw history under startle, down to a single exchange at the
 * floor — so S1 could be reduced to one exchange with no fold at all,
 * exactly when the wider view is the only thing that could keep the
 * conversation in view.
 */
function discourseLineNow() {
  const s = state.summary;
  return [s.topic, s.flow, (s.entities || []).join(", ")].filter(Boolean).join(" · ").slice(0, 300);
}

async function runFastPass(question, model) {
  const node = addMessage("assistant", "");
  node.querySelector(".who").textContent = `model`;
  const body = node.querySelector(".body");
  body.textContent = "…";
  const present = presentWindow(state.regime, RECENCY_WINDOW);
  const history = state.history.slice(-present).map((m) => ({ role: m.role, content: m.content }));
  // Unconditionally, never gated on whether raw history happens to be
  // present — see discourseLineNow's own header for the measured reason.
  const discourse = discourseLineNow();
  const messages = [
    { role: "system", content: discourse ? `${S1_SYSTEM_PROMPT}\n\nThe conversation so far, in one line: ${discourse}` : S1_SYSTEM_PROMPT },
    ...history,
    { role: "user", content: question },
  ];
  // The thinking affordance's whole content, now: every messages array this
  // turn actually sent to the model, verbatim (renderFold, below).
  const sent = [{ n: 1, messages }];
  let text = "";
  try {
    const raw = await complete(messages, { model, onDelta: (partial) => { body.textContent = partial; } });
    text = stripSelfCitations(raw).text;
  } catch (e) {
    text = "";
    body.textContent = `(fast pass failed: ${e?.message ?? e})`;
    return { node, text: "", sent };
  }
  // Classified like every other turn (P100): nothing was handed to S1, so
  // every sentence is model-ground and wears the dotted underline — a
  // fast-pass answer no longer ships unclassified.
  if (text) {
    try { body.replaceChildren(...taggedProse(text, [], classifySentences(text, [], []))); }
    catch { body.textContent = text; }
  } else body.textContent = "(no reply)";
  return { node, text, sent };
}

// The orchestrator: S1 renders first and fast; S2 (the FULL existing
// holonicTurn pipeline — retrieval, verification, correction, all of it,
// unchanged) runs only when the gate fires, and is handed S1's own words
// so it can confirm, extend, or correct them rather than starting cold.
async function twoPassTurn(question) {
  addMessage("user", question);
  logAct("asked", { text: question });
  // Fixed, task-fit models (model-routing.js), each falling back to the
  // fastest offered picker rung if not actually pulled — never routeModel's
  // ordinary FLAT/DEEP split, which routes on TURN KIND (plain vs. deep
  // work) and has no notion of "which pass" at all.
  // The two passes are fitted to their jobs from what is on THIS machine —
  // unless the person has picked a machine in the room, which says where the
  // work runs. A pin outranks the specialist ladder: choosing another member's
  // mouth and then watching the turn run locally is exactly the confusion this
  // avoids (measured 2026-09-06, the pinned turn's own attribution line and
  // its self-citation disagreed about which model spoke).
  const pinned = isPinnedModel(state.model) ? state.model : null;
  const s1Model = pinned ?? resolveNamedModel(S1_MODEL, { available: state.availableModels, offered: state.offeredModels });
  const s2Model = pinned ?? resolveNamedModel(S2_MODEL, { available: state.availableModels, offered: state.offeredModels });

  // SEARCH BEFORE ANSWERING (user direction 2026-08-26: "let's have it do
  // the searching before it answers, and only respond to truly trivial
  // things with system 1"). The decision is made on the QUESTION, before a
  // single token is generated — not on S1's reply afterwards, which is the
  // inversion that let a dodge disable all checking (see needsSystem2's own
  // note above). Anything that is not trivially chatty goes straight to the
  // grounded pass, which preflights material FIRST and answers from it.
  //
  // S1 is not consulted for these turns at all. That costs the instant
  // first paint on a real question, which was S1's whole purpose — the
  // trade the direction above makes deliberately, because a fast wrong
  // answer that then gets quietly corrected underneath is worse than a
  // slower answer that was grounded to begin with.
  if (!triviallyChatty(question)) {
    return holonicTurn(question, question, "flat", {
      skipUserMessage: true,
      forceModel: s2Model,
      label: `model`,
    });
  }

  const { node, text: s1Text, sent } = await runFastPass(question, s1Model);
  // Even on the trivial path, S1 is never trusted to be unfalsifiable: if
  // it volunteers something checkable while answering "hi", the grounded
  // pass still runs. The gate only ever adds a pass here.
  if (needsSystem2(question, s1Text)) {
    return holonicTurn(question, question, "flat", {
      skipUserMessage: true,
      priorPass: s1Text,
      forceModel: s2Model,
      label: `model`,
    });
  }
  // Gate stayed off: S1 stands as the whole turn. holonicTurn's own
  // success path is the template here (mechanicalTurn's, further up, is
  // the same shape again) — a turn's bookkeeping (history, the ledger, the
  // fold, the record, releasing busy) is not optional just because no
  // deep pass ran; every turn gets one, per FOLD-CONSTITUTION I.5.
  state.history.push({ role: "user", content: question }, { role: "assistant", content: s1Text });
  const turn = state.summary.turnCount + 1;
  logAct("answered-from-state", { what: "fast-pass-only", gate: "no checkable claim" });
  observeExchange(turn, question, s1Text);
  const fold = mechanicalFoldLine(question, s1Text);
  state.turnFolds.push(fold);
  state.summary = advanceSummaryFold(state.summary, fold);
  renderFold(node, { sent });
  renderThreads();
  $("status").textContent = readyLine();
  releaseBusy();
}

/**
 * Blank-line-separated prose as real paragraph elements.
 *
 * Not `white-space: pre-wrap` over one blob — that is what the run log does,
 * correctly, because a log IS lines. Reasoning is paragraphs, and a reader
 * skimming for where a thought turns needs the turns to be visible as
 * spacing rather than as newlines inside an undifferentiated block.
 */
function paragraphsOf(text) {
  return String(text ?? "")
    .split(/\n{2,}/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => {
      const p = document.createElement("p");
      p.textContent = t;
      return p;
    });
}

/**
 * The turn's void, declared. One call site's worth of injection, hoisted
 * here so the three moments a turn declares it — from the question alone,
 * from the material it is about to read, and from the passages it actually
 * read — cannot drift into three subtly different declarations. That drift
 * is the exact failure this repo's own postmortems have caught twice
 * (P22's `Array.find`, P24's `name === "sql"` ternary); one function is
 * the fix both times.
 *
 * `texts` empty is legitimate and means exactly what it says: declare the
 * shape from the question alone. `extentFor` finds nothing, SEG stays
 * undeclared, and `undeclaredOf` reports that honestly — which is the
 * first thing a reader should see, before any material has been consulted.
 *
 * Returns null when the question names no slot ("how does photosynthesis
 * work?") — not every question has a filler-shaped answer, and a zeroed
 * space with nine empty operators would read as an under-specified void
 * rather than an inapplicable one.
 */
// "Is this token an adposition (of/in/for/at/…)?" over the received UD
// POS prior — mechanical, no model call, no hand-typed preposition list.
// `null` (not `false`) when the prior has not finished its async load yet,
// so `declaredSlotShape` reads it as "no predicate injected" and simply
// recovers no anchor by this path — never a wrong guess from an empty
// prior. A tiny cache: this runs per-token on every void declaration and
// the prior itself never changes mid-session.
const adpCache = new Map();
function isAdposition(word) {
  if (!posPriorCache) return null;
  if (adpCache.has(word)) return adpCache.get(word);
  const r = dominantClass(classifyWord(word, { posPrior: posPriorCache }), { minShare: 0.5 })?.upos === "ADP";
  adpCache.set(word, r);
  return r;
}

function voidBriefFor(task, texts, observed = []) {
  return briefFor(task, texts, {
    observed,
    slotShapeOf: (q) =>
      declaredSlotShape(q, {
        definiteDeterminers: enginePriors.DEFINITE_DETERMINERS,
        inflectionalSuffixes: enginePriors.INFLECTIONAL_SUFFIXES,
        interrogativePronouns: enginePriors.INTERROGATIVE_PRONOUNS,
        mannerReasonPronouns: enginePriors.MANNER_REASON_PRONOUNS,
        isAdposition,
      }),
    cellOf,
    // The completeness gate's own confirmed set, re-shaped as real fillers —
    // see void-brief.js's own header on `fillersFor`. This is what turns an
    // eternally-empty space into "covered": without it, `fill()` is never
    // called and the void panel can only ever report the whole constraint
    // uncovered, however good the extent read is.
    fillersFor: (anc, txts) => successionFillers(anc, txts),
  });
}

/**
 * seekWhatWeRead — the same walk as `/api/entity/seek`, over this turn's own
 * passages instead of a publisher's API.
 *
 * Runs entirely in the page: `network.js` binds the recurring arrangements a
 * Link-grain extractor returns zero on, `read-source.js` presents them as a
 * source, and `seek.js` navigates it exactly as it navigates Wikidata. The
 * shape of the result is the SAME `{perTerm}` the route returns, so every
 * consumer below — ranking by coverage, `renderHolders`, the fillers handed to
 * the model — works unchanged and no second rendering path exists.
 */
async function seekWhatWeRead(anchorTerm, slotTerm, chunks) {
  try {
    const binder = makeNetworkBinder({ shapes: [extentShape, surfaceShape({ extractSurfaces })] });
    const passages = (chunks ?? [])
      .map((c) => ({ ref: c.ref ?? c.address ?? null, text: c.text ?? "", title: c.title ?? c.sourceName ?? null }))
      .filter((p) => p.text.trim());
    if (!passages.length) return null;
    const source = makeReadSource({ binder, passages, extractSurfaces });
    if (!source.systems().length) {
      // A TYPED ABSENCE, not a silent one: nothing in this turn's material is
      // arranged as a record block, which is a fact about the material and not
      // a failure of the walk.
      return { gap: { type: "no_arrangement", detail: "nothing we have read is laid out as a list with extents" } };
    }
    const got = await seekBindings({ anchor: anchorTerm, slot: slotTerm }, source);
    if (got?.gap) return got;
    // Re-shaped to the route's own vocabulary so the consumers below cannot
    // tell which giver answered — which is the point of one interface.
    return {
      perTerm: (got.perScope ?? []).map((p) => ({
        coverage: p.coverage,
        bound: (p.bound ?? []).map((b) => ({
          label: b.label,
          start: b.scope?.from ?? null,
          end: b.scope?.to ?? null,
          giver: "read",
          qid: null,
          address: b.span?.ref ?? null,
        })),
      })),
    };
  } catch (err) {
    // A walk that throws is a walk that did not run — never an empty answer.
    return { gap: { type: "walk_failed", detail: String(err?.message ?? err) } };
  }
}

// `opts.skipUserMessage`: the S1/S2 pass (below) already rendered the
// person's own message bubble before running S1; S2 answers the SAME
// message and must not add a second "you" bubble for it.
// `opts.priorPass`: S1's own answer text, threaded to runHolonicTask
// (holon.js's priorPassFor) so S2 can confirm, extend, or correct it.
// `opts.forceModel`: overrides the ordinary flat/deep routing — the S1/S2
// split holds ONE model constant across both passes (the picker's own
// choice, twoPassTurn's own `model`), which the ordinary single-pass
// routing below would otherwise answer with the fast rung regardless of
// what's selected. Every existing caller passes no opts and is byte-
// identical to before this existed.
async function holonicTurn(task, typed = task, planMode = "model", opts = {}) {
  // Where the ledger stood when this turn began (Pass 29 / P109): a void
  // filled at or after this seq is a re-zero of the ground THIS turn moved.
  const turnStartSeq = state.hyperlexiconLog?.nextSeq ?? 0;
  if (!opts.skipUserMessage) addMessage("user", typed);
  const node = addMessage("assistant", "");
  if (opts.label) node.querySelector(".who").textContent = opts.label;
  const body = node.querySelector(".body");

  // Already logged once by twoPassTurn's own S1 leg when this is S2 — the
  // "asked" act is one event per question, not one per pass over it.
  if (!opts.skipUserMessage) logAct("asked", { text: task });

  // The model this turn spends. A flat turn (the common little question) is
  // the fastest rung; a decomposed task is the model the user chose. The
  // same name feeds the call, the ticker's pace, and the status line.
  const turnModel = opts.forceModel ?? routeModel(planMode === "model" ? ROUTE_KINDS.DEEP : ROUTE_KINDS.FLAT, {
    offered: state.offeredModels,
    selected: state.model,
  });

  const foldedRefs = (state.summary.records || []).flatMap((r) => r.refs);
  let live = liveChunks();
  // A PIECE stands only on material in its scope (P114): sources whose text
  // carries every content word of the topic, plus what its own hunt finds.
  // Attached-for-something-else never reaches it, and what it stands on is
  // said. The sources' own headings become the planner's facts.
  let planFacts = null;
  let scopeNote = null;
  let inScopeNames = null;
  if (opts.longForm) {
    const topic = opts.longForm.topic;
    inScopeNames = new Set(Object.entries(state.sources).filter(([name, text]) => !isCodeSource(name) && inScope(topic, text)).map(([name]) => name));
    const before = live.length;
    live = live.filter((c) => inScopeNames.has(c.source));
    // `show` is declared further down this function; the scope line is
    // kept and said once the ticker exists.
    scopeNote = "standing on " + inScopeNames.size + " attached source(s) in scope of \u201c" + topic + "\u201d" + (inScopeNames.size ? ": " + [...inScopeNames].join(", ") : "") + (before - live.length ? " \u2014 " + (before - live.length) + " passage(s) of other material set aside" : "");
    const heads = [...new Set([...inScopeNames].flatMap((name) => headingsOf(state.sources[name] ?? "")))].slice(0, 30);
    if (heads.length) planFacts = "The sources are organized under these headings of their own: " + heads.join("; ") + ". Plan the piece's sections as an argument that draws on them, not as a copy of them.";
  }

  // The run narrates itself while it works — the thinking, live, in three
  // layers: the log lines (what the turn decided and found), a ticker (what
  // phase it is in and for how long, against the measured pace), and the
  // draft streaming in as the model writes it. All three are LIVE-ONLY now
  // (2026-08-28: the persisted "thinking" disclosure was vastly simplified
  // to just the prompt history — renderFold's own header carries the
  // reason) — the log and reasoning are still kept, for the acts they
  // trigger along the way (an entity-seek lookup, a void declaration), but
  // nothing here re-draws them once the turn lands; the draft area is
  // simply replaced by the checked rendering. Defined early — before the
  // named-URL fetch below — because that step narrates through the same
  // `show`.
  const log = [];
  const reasoning = [];
  const tickEl = document.createElement("div");
  tickEl.className = "thinking";
  const draftEl = document.createElement("div");
  draftEl.className = "prose";
  // ONE TRACE, TWO VOICES, IN THE ORDER THEY HAPPENED.
  //
  // The run log is a log — mono, one fact per line, "3 passage(s) retrieved"
  // — and reads correctly as one. The reasoning is prose about the question,
  // and sharing the log's element made it read as more log: a grey monospace
  // wall a reader parses rather than reads (user, 2026-08-27: "our current
  // affordance is too structured").
  //
  // But splitting them into two stacked lanes broke chronology, which is
  // worse and was visible immediately on the first live run: "The material
  // puts it at 1861 to 1865" sat ABOVE "found 3 page(s)", the step that went
  // and got the material. A thought printed before the act that caused it
  // reads as the instrument having known it all along.
  //
  // So: one container, blocks appended in real order, each in its own voice.
  // A thought closes the current run of log lines and opens prose; the next
  // log line opens a fresh run. The log lines end up reading as stage
  // directions between thoughts, which is what they are.
  const traceEl = document.createElement("div");
  // ONE THINKING AFFORDANCE, NOT TWO. A `<details class="fold">` was built
  // here to hold the trace — but `addMessage` already gives every assistant
  // turn one (the turn-meta disclosure), and `renderFold` already takes a
  // `reasoning` argument that puts exactly this narration at the top of it.
  // Two affordances both labelled "thinking" is worse than either: a reader
  // has to open both to find out which one has the work in it. The trace
  // streams into the body while the turn runs and moves into the existing
  // disclosure when it lands.
  body.replaceChildren(traceEl, tickEl, draftEl);

  let logBlock = null;
  const show = (line) => {
    log.push(line);
    if (!logBlock) {
      logBlock = document.createElement("div");
      logBlock.className = "thinking";
      traceEl.append(logBlock);
    }
    logBlock.textContent += (logBlock.textContent ? "\n" : "") + line;
    node.scrollIntoView({ block: "end" });
  };
  if (scopeNote) show(scopeNote);

  /** One passage of thinking. Split on blank lines so each paragraph is its
   * own element — a single pre-wrap blob is exactly the undifferentiated
   * wall this replaces. */
  // A READABLE PACE. Thoughts used to land the instant they were computed,
  // so a whole chain appeared at once and read as a dump rather than as
  // thinking. Each paragraph is revealed on its own short beat — the work is
  // already done, this only spaces out its ARRIVAL so it can be followed.
  // Purely presentational: `reasoning` (the record) is appended immediately
  // and synchronously, so nothing downstream waits on a timer and a turn that
  // ends early loses none of its trace.
  const THOUGHT_BEAT_MS = 420;
  let beat = 0;
  const think = (text) => {
    reasoning.push(text);
    logBlock = null; // a thought closes the current run of log lines
    const w = document.createElement("div");
    w.className = "reasoning";
    w.append(...paragraphsOf(text));
    w.style.opacity = "0";
    w.style.transition = "opacity 240ms ease";
    traceEl.append(w);
    const at = beat++;
    setTimeout(() => {
      w.style.opacity = "1";
      node.scrollIntoView({ block: "end" });
    }, at * THOUGHT_BEAT_MS);
  };

  // A FOURTH — no, third-and-separate — voice: the MODEL'S OWN deliberation,
  // when it has one. A reasoning-capable model (qwen3, deepseek-r1) streams
  // real thinking through Ollama's own `message.thinking` field; before this
  // it was silently discarded, every token of it. User direction, verbatim
  // (2026-08-27): "we dont hate that deliberation, we need to think of how
  // to use it for [max] benefit in our system" — the answer is disclosure,
  // not suppression, and NOT the void's own `.reasoning` voice: that prose
  // is this instrument's own mechanical narration, true by construction; the
  // model's thinking is the model's own unchecked first-pass reasoning, the
  // same epistemic footing PAST DISCOURSE already holds elsewhere in this
  // app ("real, visible, never treated as settled"). Kept visually distinct
  // (`.model-thinking`, its own label) so the two can never be mistaken for
  // one another, and kept — not wiped like `draftEl` — because disclosed
  // deliberation is exactly the kind of thing this trace exists to hold.
  // Born lazily on the first real delta, so a model with nothing to say
  // here (gemma2:2b, this app's default) never adds an empty box.
  let modelThinkBody = null;
  let modelThinkText = null;
  const showModelThinking = (text) => {
    modelThinkText = text;
    if (!modelThinkBody) {
      logBlock = null; // this too closes the current run of log lines
      const w = document.createElement("div");
      w.className = "model-thinking";
      const label = document.createElement("div");
      label.className = "model-thinking-label";
      label.textContent = "the model, thinking";
      modelThinkBody = document.createElement("div");
      modelThinkBody.className = "model-thinking-body";
      w.append(label, modelThinkBody);
      traceEl.append(w);
    }
    // Split into paragraphs, not one pre-wrap blob — the same lesson the
    // void's own `.reasoning` redesign already paid for this same day (a
    // single undifferentiated wall reads as log, not as thought). Cheap
    // enough to re-run every paint: `renderBlocksInto` already re-splits the
    // live draft on the same 200ms cadence.
    modelThinkBody.replaceChildren(...paragraphsOf(text));
    node.scrollIntoView({ block: "end" });
  };

  // THE SHAPE OF AN ANSWER THAT WOULD SATISFY, worked out in the open.
  //
  // User direction, verbatim (2026-08-27): "i want the 'thinking' reasoning
  // to show in real time its work figuring out the shape of an answer that
  // would satisfy." Until now the void was declared ONCE, after the model
  // had already answered, and rendered as a receipt in the collapsed panel —
  // so the one thing the apparatus exists to establish (what would COUNT as
  // a satisfying answer, decided before the answer exists) was the one thing
  // a reader could never watch happen.
  //
  // Three moments, in the order the turn actually learns them, all through
  // the SAME `voidBriefFor` so they cannot drift:
  //
  //   1. HERE — the question by itself, before any model call: what is being
  //      asked for, what it hangs on, and everything about the shape that is
  //      still open. No material has been read, so nothing is said about
  //      extent or fillers — claiming "nothing states a span" before anything
  //      has been consulted would report a reading that never happened.
  //   2. Below, once material is in hand and STILL before the model drafts —
  //      the extent, what is named, what is still empty, and the concession
  //      where the material contradicts the question's own grammar.
  //   3. After the run, over everything the turn held. Says nothing unless
  //      something was genuinely learned: `narrateVoid` compares digests,
  //      not rendered text, so a pass that repeats itself stays quiet.
  //
  // Gated on `state.grounded` for the same reason every other tier is: with
  // checking off this is a plain chatbot and there is no space to zero.
  // Never allowed to break a turn — a declaration that throws is disclosed
  // and the turn continues, exactly as the post-hoc block already did.
  let voidBrief = null;
  let voidDigest = null;
  let voidDeclaredThisTurn = false;
  const narrateTheVoid = (texts, phase, observed = []) => {
    if (!state.grounded) return;
    // A long-form ask is WORK with a declared size, not a question with a
    // slot: read as one, the brief zeroed "distinct movements of label" and
    // declared a void over the planning sentence (measured live 2026-09-05,
    // the first plain 30-page run). The piece's own gaps are the parts'
    // business; no void is declared over the task text.
    if (opts.longForm) return;
    try {
      const b = voidBriefFor(task, texts, observed);
      if (!b) {
        // Said ONCE — a question that opens no slot has nothing further to
        // report as material arrives, and repeating it would be the
        // instrument insisting on its own inapplicability.
        if (voidDigest === null) {
          voidDigest = "no-slot";
          think(noSlotLine());
        }
        return;
      }
      voidBrief = b;
      const said = narrateVoid(b, { phase, previous: voidDigest });
      // Once material is in hand and the slot is still empty, the void is
      // an EVENT on the record (Pass 23 / P105): declared with its scope,
      // before the model drafts, cancelled by the first arrival that fills
      // it. A `not_empty` refusal is the ledger saying it already holds
      // the filling — said, not hidden.
      if (phase === "material" && !voidDeclaredThisTurn) {
        // Only a DECLARED extent with a hole in it is a void. "unbounded"
        // is the space refusing to be declared (SEG·Ground — no extent),
        // which THE-NULL-STATES keeps apart from a measured emptiness: a
        // nothing with no denominator is not landed. And a head phrase
        // that collapsed onto the anchor names no slot at all.
        const anchor = b.declaration?.cells?.find((c) => c.field === "anchor")?.declared ?? null;
        const headIsAnchor = anchor && b.headPhrase && String(b.headPhrase).toLowerCase() === String(anchor).toLowerCase();
        // A void's SCOPE is what was read (sources, how far) — that is the
        // denominator THE-NULL-STATES requires, and it is always in hand
        // here. The brief's year-extent is a second dimension: with it, a
        // hole in it is the void; without it ("unbounded"), the void is the
        // whole read — still a measured emptiness, over a declared scope.
        const empty = !(b.fillers?.length) && !headIsAnchor && ((b.standing?.voids?.length ?? 0) > 0 || b.standing?.standing === "unbounded");
        // The other direction (Pass 23): the brief's own filler organ found
        // what an OPEN void on the record was empty of — that is the one
        // arrival that re-zeros it, landed by name with the filler's witness.
        if (b.fillers?.length && anchor && b.headPhrase && !headIsAnchor && state.hyperlexiconLog && hyperlexiconFor.rezeroVoid) {
          const open = voidsNow().find((v) => String(v.subject).toLowerCase() === String(anchor).toLowerCase() && String(v.verb).toLowerCase() === String(b.headPhrase).toLowerCase());
          if (open) {
            const f = b.fillers[0];
            const by = String(f?.filler ?? f?.name ?? f ?? "").trim();
            const rz = hyperlexiconFor.rezeroVoid(state.hyperlexiconLog, open.id, { by: by || "a filler the reader found", witness: f?.ref ?? f?.witness ?? null });
            if (!rz.refused) { state.hyperlexiconLog = rz.log; syncRecords(); think(`Filled: "${open.verb}" of ${open.subject} — ${by || "a filler"} arrived; the gap declared earlier is cancelled on the record.`); }
          }
        }
        if (empty) {
          voidDeclaredThisTurn = true;
          const v = declareVoidOnLedger(b, { because: b.standing?.reason ?? null });
          if (v?.id) think(`On the record: nothing read so far fills "${v.label}" of ${v.anchor} — looked for in ${v.scope.sources.length} source(s), ${v.scope.read} of ${v.scope.total} parts read${v.redeclared ? " (declared again)" : ""}. The first arrival that fills it will cancel this.`);
          else if (v?.refused) think(`Not declared as a gap: ${v.refused.type === "not_empty" ? `the record already holds something for "${v.label}" of ${v.anchor}` : v.refused.detail ?? v.refused.type}.`);
        }
      }
      if (!said) return;
      voidDigest = said.digest;
      think(said.text);
    } catch (e) {
      voidBrief = { error: String(e?.message ?? e) };
      think(`I could not work out what shape an answer here would need: ${e?.message ?? e}`);
    }
  };
  narrateTheVoid([], "question");

  // A message can point at an address as directly as at a build's own
  // bytes (widget.js's own lesson, applied here): an explicit http(s) URL
  // in the operator's own words is a POINTER, not a bag of search terms,
  // and treating it as the latter is the category error routeMessage was
  // rewritten away from. Measured live (2026-08-18): an essay request
  // naming an explicit substack feed address reached
  // gatherPreflightMaterial's own search path, which reduces to letters
  // and numbers and keeps every word as ordinary search material — the
  // feed's own distinctive term survived the stopword filter but lost
  // DuckDuckGo's own ranking to generic pages merely sharing the request's
  // other words, and the named source was never fetched at all. Fetched
  // DIRECTLY here and
  // gated on the SAME standing web consent every other automatic crossing
  // already uses (state.webProof, P13) — never on state.grounded, because
  // pointing the instrument at a source is a material question, the same
  // way attaching a file needs no checking-mode toggle, not a checking-
  // ladder one. Persisted as a REAL source (addSource) rather than
  // turn-scoped, unlike gatherPreflightMaterial's own speculative search
  // picks: an EXPLICITLY named source is worth keeping and reopening, and
  // doing so closes THIS case of the residue that function's own docstring
  // discloses ("open in Explore fails... not a working link") — search-
  // guessed pages stay exactly as turn-scoped and disclosed as before.
  // Archived on request (archive: true) so a citation into it survives the
  // live page changing or disappearing; the permanent address lands later
  // via the deferred archive patch, the same posture every archived fetch
  // already has — never awaited inline, since Save Page Now can take a
  // minute the turn must not block on.
  if (state.webProof) {
    for (const [i, url] of extractUrls(task).slice(0, NAMED_URL_MAX).entries()) {
      const name = `web:${hostOf(url)}-${i}`;
      if (state.sources[name]) continue; // already attached, this turn or a prior one
      try {
        const f = await webApi("/api/web/fetch", { url, archive: true });
        if (f.gap || !f.entry?.textPath) {
          show(`named source ${hostOf(url)}: ${f.gap?.detail ?? "no readable text"}`);
          continue;
        }
        let faceRes;
        try {
          faceRes = await fetch(pageFaceUrl(EXPLORE_BASE, f.entry.textPath));
        } catch {
          faceRes = await fetch(pageFaceUrl(location.origin, f.entry.textPath));
        }
        if (!faceRes.ok) continue;
        const text = await faceRes.text();
        if (!text.trim()) {
          show(`named source ${hostOf(url)}: fetched, but no readable text`);
          continue;
        }
        addSource(name, text);
        rememberPageFace(name, url, f.entry);
        state.provenance[name] = {
          line: f.entry.title ? `${f.entry.title} — ${hostOf(url)}` : hostOf(url),
          fields: { url: f.entry.finalUrl ?? url },
        };
        show(`named source: fetched ${hostOf(url)} — ${text.length.toLocaleString()} chars, archiving requested${f.entry.via ? ` — via ${f.entry.via.gateway} (the direct fetch was ${f.entry.via.why}; ${f.entry.via.sees})` : ""}`);
      } catch (e) {
        show(`named source ${hostOf(url)}: could not fetch — ${e.message}`);
      }
    }
    live = liveChunks();
    // The named-source block re-reads the WHOLE pool (a page just attached
    // must join it), which silently undid a piece's scope — measured, run
    // 8: seven `holon.js` passages and two of the plan of record reached
    // sections about a television series. The scope is re-applied here,
    // and a page this very ask named is in scope by construction.
    if (inScopeNames) {
      for (const name of Object.keys(state.sources)) if (name.startsWith("web:") && !inScopeNames.has(name) && !isCodeSource(name) && inScope(opts.longForm.topic, state.sources[name] ?? "")) inScopeNames.add(name);
      live = live.filter((c) => inScopeNames.has(c.source));
    }
  }

  // Every messages array actually sent to the model this turn, verbatim —
  // wired to renderFold's `sent` disclosure below. That parameter existed
  // and rendered nothing (no caller ever passed it — the same documented-
  // but-never-called shape this file's own CLAUDE.md names for
  // routeMessage): built for exactly this, never connected. Captured at
  // the `call` boundary rather than inside holon.js, which this repo's own
  // CLAUDE.md marks as another session's contract — this needs no edit
  // there at all.
  const sentCalls = [];

  let phaseLabel = "planning";
  let phaseStart = performance.now();
  let phasePromptChars = 0;
  const setPhase = (label, promptChars = 0) => {
    phaseLabel = label;
    phaseStart = performance.now();
    phasePromptChars = promptChars;
  };
  const ticker = setInterval(() => {
    const secs = Math.round((performance.now() - phaseStart) / 1000);
    const pace = foldPace(state.paceLog, turnModel);
    // Expected duration from the measured pace: prefill for what this call
    // carries, decode for what this conversation's calls have averaged.
    // Unmeasured pace says so instead of inventing a number.
    let expect = "";
    if (phasePromptChars && pace.calls) {
      const p = predictCall(pace, phasePromptChars, pace.meanOutTokens ?? 0);
      if (p.ms) expect = ` / ~${Math.round(p.ms / 1000)}s expected (${p.basis})`;
    }
    tickEl.textContent =
      `⋯ ${phaseLabel} · ${secs}s${expect}` +
      (pace.decodeTps ? ` · ${Math.round(pace.decodeTps)} tok/s` : " · pace unmeasured");
  }, 1000);

  let lastDraftPaint = 0;
  let lastThinkPaint = 0;

  // The reach of the present, under the standing regime: calm is fold.js's
  // declared RECENCY_WINDOW untouched; a startled reader's present
  // contracts toward the exchange that startled it (aperture.js's regime
  // block — posture consumed as behavior, not displayed). The contraction
  // is an act the instrument performs, so when it is actually in effect it
  // goes on the ledger like any other act — registered to itself, drawn
  // nowhere.
  const present = presentWindow(state.regime, RECENCY_WINDOW);
  if (present < RECENCY_WINDOW && state.history.length > present)
    logAct("narrowed", { window: present, of: RECENCY_WINDOW });

  let result;
  try {
    $("status").textContent = "planning…";
    const s = state.summary;
    // The discourse slice: one line, not the carried block. Topic, flow,
    // entities — what a part needs to resolve "he" and "the report";
    // anything more it retrieves. Computed once, here, because the
    // preflight search below needs the identical anchor runHolonicTask's
    // own `discourse:` field carries — one line, not two independently
    // drifting copies of "the conversation so far."
    // The SAME line S1 was given (discourseLineNow) — one reading of "the
    // conversation so far", never two independently drifting copies.
    const discourseLine = discourseLineNow();
    // Set below only when the preflight search below actually ran AND came
    // back empty — SEARCHED_VOID_PREFIX (holon.js) says why this is a fact
    // fed forward, not narration left to die in the ticker.
    let searchedVoid = null;

    // Predictive processing, not post-hoc labeling: a flat chat question
    // with nothing attached, checking mode on, and standing web consent on
    // gets ONE search BEFORE the model drafts anything, keyed on the turn's
    // own words plus discourseLine (never model output — none exists yet).
    // Measured live (2026-08-18): asked for NYC's current weather with
    // nothing attached, the model invented "70 degrees, sunny" —
    // checkGrounding correctly declined to examine it (examined: false, no
    // material exists), and extractCheckableAtoms then manufactured
    // proof-seeking candidates FROM the invented sentence, so the search
    // that followed looked for "70" and read an RV blog, never NYC weather.
    // A materialless follow-up ("prove it") made it worse: the model
    // fabricated a second sentence, and the search ran on THAT. Handing the
    // existing checking ladder real material before the draft exists fixes
    // both at once — checkGrounding runs for real instead of the
    // no-material fallback inventing candidates, and any figure the model
    // still gets wrong is checked against actual fetched bytes, the same
    // way an invented figure on top of a real attachment already is.
    // shouldPreflight/gatherPreflightMaterial: proof.js §"the preflight
    // gate" names the tradeoff this buys — a materialless grounded+web-on
    // question now spends one search before its first token, unconditional
    // within those two standing toggles, never a guess at which questions
    // "need" it. Turn-scoped: these chunks join `live` for this call only
    // and are never written to state.sources, so no attachment pill
    // appears and nothing persists.
    // Flow #2 — suspicion widens the search (metacognition.js, P72's own
    // second amendment). Read ONCE per turn, from the same cell `observe`
    // writes and on the same channel it measures (opts.priorPass — an
    // S1/S2 turn; every other turn passes null and gets the plain
    // constants back untouched). The budgets handed in are ALWAYS the
    // declared constants — holon.js's own MAX_CORRECTIONS/
    // PASSAGES_PER_PART, proof.js's own PREFLIGHT_PAGES_CONSULTED — never
    // a prior escalated value, so the factor can never compound across
    // turns. Asymmetric by construction: escalationFor only ever raises
    // budgets on `contested`; `established` and `unproven` alike come
    // back byte-identical to the constants, so a good record never
    // quietly removes checking. The engagement lands on the reflex
    // ledger (reflex.js's designed unknown-act fallback, the same door
    // `measured`/`carried`/`narrowed` already entered through) — a
    // decision the instrument made is never silent.
    const escalation = escalationFor(
      opts.priorPass ? metaLedger.standingOf(state.metaLedger, "s1-draft") : null,
      { maxCorrections: MAX_CORRECTIONS, passagesPerPart: PASSAGES_PER_PART, pagesConsulted: PREFLIGHT_PAGES_CONSULTED },
    );
    if (escalation.escalated) {
      logAct("escalated", {
        cell: "s1-draft",
        corrections: escalation.maxCorrections,
        passages: escalation.passagesPerPart,
        pages: escalation.pagesConsulted,
      });
    }
    const longFormHunt = Boolean(opts.longForm) && state.grounded && state.webProof;
    if (longFormHunt || shouldPreflight({ live, grounded: state.grounded, webProof: state.webProof, planMode })) {
      setPhase("checking for material");
      show(longFormHunt ? `finding material on “${opts.longForm.topic}” before planning…` : "nothing attached — checking the web before answering…");
      // Two assemblies handed over separately, never pre-mixed: the query
      // builder joins them only when the task's own words cannot anchor a
      // search (anaphoric or content-empty — proof.js::preflightQuery).
      // Each step rides the turn ticker (user direction 2026-08-19): a
      // search plus up to three page fetches is seconds of real waiting,
      // and a reader watching "checking for material · 9s" with no motion
      // reads it as hung, not working.
      const preflight = await gatherPreflightMaterial(task, discourseLine, (step) => setPhase(step), {
        pagesConsulted: longFormHunt ? LONGFORM_PAGES_CONSULTED : escalation.pagesConsulted,
        // The topic verbatim as the search anchor: the query builder folds
        // "The X-Files" to "Files" (a hyphenated one-letter name is lost),
        // and the long-form task text carries planning words no search
        // should carry. Measured 2026-09-05, proof.js::preflightQuery.
        ...(longFormHunt ? { query: opts.longForm.topic } : {}),
      });
      // The hunt's outcome on the ledger, whichever way it ended — a
      // reading the instrument cut short (or ran to its leash's end) is a
      // decision, and a decision the instrument made is never silent.
      if (preflight.hunt?.pages) {
        logAct("hunted", {
          pages: preflight.hunt.pages,
          ceiling: preflight.hunt.ceiling,
          stop: preflight.hunt.stop,
        });
      }
      for (const pg of preflight.pages ?? []) if (pg?.name && pg.url) state.huntUrls[pg.name] = pg.url;
      if (preflight.chunks.length) {
        // Long-form UNIONS what was found with what is attached; an ordinary
        // preflight only ever runs with nothing attached, so `live` is empty
        // there and the union is the same assignment.
        live = longFormHunt ? [...live, ...preflight.chunks] : preflight.chunks;
        // The hunted pages' own headings join the planner's facts (P114):
        // they are the material the piece stands on, and their sections are
        // the outline the subject already has.
        if (longFormHunt) {
          const bySource = new Map();
          for (const c of preflight.chunks) if (!String(c.ref ?? "").startsWith("web:search-results")) bySource.set(c.source, (bySource.get(c.source) ?? "") + "\n\n" + (c.text ?? ""));
          const heads = [...new Set([...bySource.values()].flatMap((t) => headingsOf(t)))].slice(0, 30);
          if (heads.length) planFacts = "The sources are organized under these headings of their own: " + heads.join("; ") + ". Plan the piece's sections as an argument that draws on them, not as a copy of them.";
        }
        show(`found ${preflight.pages.length} page(s) · ${preflight.chunks.length} passage(s) to answer from`);
      } else {
        const voidDetail = preflight.gap?.detail ? `checked the web: ${preflight.gap.detail}` : "checked the web — nothing usable came back";
        show(voidDetail);
        // Fed forward as a fact, not just narrated to the reader (user
        // direction, 2026-08-19: "if the surf did not turn something up,
        // the model should be fed the acknowledgement of this void") — a
        // search that ran and came back empty must not look, to the
        // model, identical to a turn where no search was ever attempted.
        searchedVoid = `${SEARCHED_VOID_PREFIX} (${voidDetail}.)`;
      }
    }

    // MOMENT 2: the material is in hand and the model has not drafted a
    // word yet. This is the pass that makes the void predictive rather than
    // forensic — the extent is measured, what is already named is named,
    // what is still empty is stated, and a singular reading the material
    // contradicts is conceded HERE, where it could still change how the
    // answer is read, rather than in a panel opened afterward.
    //
    // `live` is the turn's own chunks (attachments, or the preflight's
    // fetched pages) — the same array handed to runHolonicTask on the very
    // next line, so this reads exactly the material the answer will be
    // built from, never a second set gathered separately.
    narrateTheVoid(live.map((c) => c.text).filter(Boolean), "material");

    // ── the identity seek (P56) ──────────────────────────────────────────
    // The void has just declared what the question hangs on (SIG's anchor)
    // and what kind of thing fills it (the head phrase). Those two strings
    // are exactly what `/api/entity/seek` needs, so the seek runs HERE:
    // after the shape is known, before the model drafts.
    //
    // What comes back are BINDINGS — referents with qids, real extents, and
    // a fetchable address each — and they enter through `observed`, the same
    // door the relation tier's own findings already use. The model is never
    // told a qid, a coverage ratio, or that a giver was consulted (P55): it
    // receives the fillers as content, and the custody stays on the record.
    let seekFillers = [];
    if (state.grounded && state.webProof && voidBrief?.declaration) {
      let anchorTerm = voidBrief.declaration.cells?.find((c) => c.op === "SIG")?.declared ?? null;
      let slotTerm = voidBrief.headPhrase ?? null;
      // THE MODEL AS THE EAR, NOT THE MOUTH — one standalone call whose
      // only job is to say what the question is ABOUT, in the words a public
      // record would file it under. It never sees the record and never
      // states the answer; what it produces is a QUERY, and the query is
      // then put to the source, which either resolves it to a real referent
      // with real dated relations or does not. A bad rewrite fails at the
      // next step instead of becoming an answer.
      //
      // WHY IT IS NEEDED, measured: asked "who was lincoln's vp?", the shape
      // reader gives anchor "lincoln" and slot "vp". "vp" is fine — the
      // source ranks the vice-presidency second for it. "lincoln" is not:
      // across fifteen candidates the source offers a city in Nebraska, a
      // cathedral city, a district, a given name, a Spielberg film, two
      // universities and a Brazilian footballer, and never the president.
      // No amount of widening finds him, because the surface genuinely does
      // not name him. Only the question's own sense does.
      //
      // IT IS DISCOURSE-AWARE for the same reason: "and who was his vice
      // president?" carries the anchor in the conversation, not the sentence.
      //
      // WORKED EXAMPLES, NOT A SPECIFICATION. The first version described
      // the task in the abstract ("`anchor` is the person, place or thing
      // the question hangs on") and gemma2:2b returned
      // {"anchor":"Lincoln's Vice President","slot":"Political Office
      // Holder"} — the two swapped and a category invented. Shown two
      // worked examples instead, the same model returns {"who":"Abraham
      // Lincoln","what":"Vice President"}. A small model follows a pattern
      // it can see; it does not follow a definition.
      let askedAs = { anchor: anchorTerm, slot: slotTerm, rewritten: false };
      try {
        const said = discourseLine ? `The conversation so far: ${discourseLine}\n\n` : "";
        const out = await completeOnce(
          [
            {
              role: "system",
              content:
                // The PURPOSE, not a list of transformations. Told to
                // "rewrite using full names and no abbreviations" a model
                // does that and only that; told what the restatement is FOR,
                // it also resolves what the question refers back to, picks
                // the name a reference source actually files under, and
                // leaves alone what is already fine. Measured on the same
                // 2B: "who was lincoln's vp?" → "Who was Abraham Lincoln's
                // Vice President?", and — a case never tested for —
                // "who was FDR's AG?" → "Who was Franklin D. Roosevelt's
                // Attorney General?".
                "Restate the question in the terms best for querying a reference source. " +
                "Reply with the restated question and nothing else.",
            },
            { role: "user", content: `${said}${task}` },
          ],
          { temperature: 0, maxTokens: 60, model: turnModel },
        );
        // completeOnce resolves {text, doneReason} — reading it as a string
        // was a real bug that made this step throw on every turn and report
        // itself as a refusal, so it had never once run.
        const rewritten = String(out?.text ?? "").trim().split("\n")[0].trim();
        // THE MODEL TALKS; WE PARSE. No JSON, no schema, no protocol the
        // model has to honour — it writes one ordinary sentence and this
        // instrument's OWN shape reader, the same `voidBriefFor` that read
        // the original question, reads the rewrite. A structured interface
        // is the thing P22 says never to architect around; widening the
        // extractor is the sanctioned repair, and here the extractor already
        // exists and is already trusted.
        //
        // Asked for JSON with a worked example the same 2B model returned
        // two swapped fields and an invented category. Asked for a sentence
        // it returns "Who was Abraham Lincoln's Vice President?" — which our
        // own reader then turns into anchor "Abraham Lincoln", slot "vice
        // president" using code that never had to trust anything.
        const reread = rewritten && rewritten !== task ? voidBriefFor(rewritten, []) : null;
        const who = reread?.declaration?.cells?.find((c) => c.op === "SIG")?.declared ?? null;
        const what = reread?.headPhrase ?? null;
        if (who && what) {
          // NULL-SAFE ON PURPOSE, and this was a real bug, not a tidy-up.
          // `anchorTerm.toLowerCase()` threw whenever the question's own
          // words named nothing to hang on — which is EXACTLY the question
          // that most needs a restatement. The throw landed in the catch
          // below, so the one turn the rewrite existed for was the one turn
          // it never ran on: "who was the 23rd president?" has no possessive
          // and reached the ordinary pipeline ungrounded every time.
          const changed = who.toLowerCase() !== String(anchorTerm ?? "").toLowerCase() ||
            what.toLowerCase() !== String(slotTerm ?? "").toLowerCase();
          think(changed ? `Read as: "${what}" of "${who}". Looking there.` : `Looking for "${what}" of "${who}".`);
          askedAs = { anchor: who, slot: what, rewritten: changed };
        } else if (anchorTerm && slotTerm) {
          think(`I could not put the question into fuller words, so I am looking with its own: "${slotTerm}" of "${anchorTerm}".`);
        }
      } catch {
        if (anchorTerm && slotTerm) {
          think(`I could not put the question into fuller words, so I am looking with its own: "${slotTerm}" of "${anchorTerm}".`);
        }
      }
      const askedFallback = { anchor: anchorTerm, slot: slotTerm };
      anchorTerm = askedAs.anchor;
      slotTerm = askedAs.slot;

      if (!anchorTerm || !slotTerm) {
        // A SKIPPED CHECK SAYS SO (P41) — and it says so HERE, after the
        // restatement has had its turn, not before. Announcing the skip up
        // front described a state the rewrite was about to change.
        think(
          `I did not check the public record here: ` +
            `${anchorTerm ? "" : "nothing in the question resolved to a thing to hang it on"}` +
            `${!anchorTerm && !slotTerm ? ", and " : ""}` +
            `${slotTerm ? "" : "no kind of thing was named to look for"}.`,
        );
      }

      if (anchorTerm && slotTerm) {
        try {
          think(`Checking who is on record as ${slotTerm} for ${anchorTerm}.`);
          let seek = await webApi("/api/entity/seek", { anchor: anchorTerm, slot: slotTerm, question: task });
          // A REWRITE THAT FINDS NOTHING IS NOT A REASON TO STOP LOOKING.
          // The rewrite is a proposal; if the source cannot resolve it, the
          // question's own words get their turn before anything is refused.
          // The retry has the same wall as the first ask: an anchor or slot
          // the question's own words never supplied is a skip SAID, never a
          // request. Measured live 2026-09-02: "battle" of "null" went to the
          // route and answered 400 — a fabricated lookup, not a refusal.
          if (seek?.gap && askedAs.rewritten && askedFallback.anchor && askedFallback.slot) {
            think(`Nothing on record under those words — trying the question's own: "${askedFallback.slot}" of "${askedFallback.anchor}".`);
            const retry = await webApi("/api/entity/seek", { anchor: askedFallback.anchor, slot: askedFallback.slot, question: task });
            if (!retry?.gap) seek = retry;
          } else if (seek?.gap && askedAs.rewritten) {
            think(`Nothing on record under those words, and the question's own words name no ${askedFallback.anchor ? "kind of thing" : "thing"} to try instead.`);
          }
          if (seek?.gap) {
            // THE PUBLISHED RECORD IS NOT THE ONLY RECORD. Measured live:
            // "who was Queen Victoria's prime minister?" gaps on Wikidata with
            // `no_relating_property` — the generic role holds no members, and
            // the country-specific office is reached by a property the
            // specialize step does not walk — while the page that lists all
            // ten with their exact terms was already fetched and saved. So the
            // gap is not the end of the walk; it is the point at which the
            // SAME four questions get asked of what this instrument has read.
            think(`Nobody is on the published record that way — ${seek.gap.detail}. Reading what we have instead.`);
            const readSeek = await seekWhatWeRead(anchorTerm, slotTerm, live);
            if (readSeek && !readSeek.gap) {
              seek = readSeek;
            } else if (readSeek?.gap) {
              // WITHHOLD, NEVER CONVICT. This line used to read "Nothing in
              // what we have read answers it either" — a claim about the
              // MATERIAL, manufactured out of a fact about this instrument's
              // own REPRESENTATION of it. `seekWhatWeRead`'s gaps are all of
              // the second kind: `no_arrangement` is literally "nothing we
              // have read is laid out as a list with extents", which is a
              // statement about what the relation extractor could build, not
              // about what the source says.
              //
              // The distinction is this repo's own constitutional rule, in
              // its own words: "a checking organ may say 'I have nothing to
              // compare this against' (withhold), or 'I compared it and it
              // failed' (convict). It may never manufacture the second out
              // of the first — treating absence-of-material as presence-of-
              // fabrication is not a check, it is an accusation with no
              // evidence, dressed as one."
              //
              // Measured live, the specimen that closes this: asked "what are
              // the two methods of curing the mischiefs of faction" against
              // the real Federalist Papers, this line printed "Nothing in what
              // we have read answers it" — and the very next thing the turn
              // did was answer it correctly ("by removing its causes; by
              // controlling its effects") from a sentence sitting at retrieval
              // rank 1. The material answered it outright; only the
              // arrangement-reader came up empty, because the answering
              // sentence enumerates after a colon and the extractor keeps the
              // subject fragment and drops the list. A reader watching that
              // sequence is told the source is silent about the thing it is
              // about to be told, which is worse than saying nothing.
              think(`I could not read it as an arrangement — ${readSeek.gap.detail}. That is a limit of this reading, not a finding about the source; the answer may still be in the material.`);
            }
          }
          if (seek?.gap) {
            // nothing further to say; the two attempts have each reported.
          } else if (!seek?.perTerm?.length) {
            think(`The public record had nothing to say about that.`);
          } else if (seek?.perTerm?.length) {
            // Rank by coverage, never by which term came first — the seek
            // itself refuses to choose, and tiling is what tells the real
            // answer from a true-but-unmeant one (wikidata.js::coverageOf).
            const best = [...seek.perTerm].sort((a, b) => (b.coverage?.ratio ?? 0) - (a.coverage?.ratio ?? 0))[0];
            if (!best?.bound?.length) {
              think(`Nobody is on record holding that during any period ${anchorTerm} is recorded for.`);
            } else if (!(best.coverage?.ratio > 0)) {
              // Bound, but the terms do not account for the span — so the set
              // is not closed and must not be stated as though it were.
              think(
                `Found ${best.bound.length} on record, but their terms do not account for the whole span, ` +
                  `so I cannot say that is all of them.`,
              );
            }
            if (best?.bound?.length && (best.coverage?.ratio ?? 0) > 0) {
              // Both grains, the same shape succession.js's own reader
              // produces: NUMERIC years because void-shape.js's coverage
              // arithmetic requires `Number.isFinite` on both ends, and the
              // giver's precise dates beside them because a year span alone
              // states nothing for a six-week vice presidency (seg.js's
              // `collapsed` finding, on this exact specimen).
              const yearOf = (t) => Number(String(t ?? "").replace(/^\+/, "").slice(0, 4));
              seekFillers = best.bound
                .map((b) => {
                  const from = yearOf(b.start);
                  const to = yearOf(b.end);
                  const dated = Number.isFinite(from) && Number.isFinite(to) && from <= to;
                  return {
                    filler: b.label,
                    // The SAME formatter renderHolders uses, not a second
                    // slice of the giver's storage format: these strings go
                    // to the model as content, and a 2B model handed
                    // "1861-03-04" writes "1861-03-04" back.
                    span: dated ? { from, to, fromText: dayOf(b.start), toText: dayOf(b.end) } : null,
                    source: `${b.giver} ${b.qid}`,
                    address: b.address,
                  };
                })
                .filter((f) => f.filler);
              const named = seekFillers.map((f) => f.filler).join(" and ");
              think(`On record: ${named}. Their terms account for the whole span, end to end.`);
              logAct("entity-seek", { anchor: anchorTerm, slot: slotTerm, bound: seekFillers.length, coverage: best.coverage?.ratio ?? null });

              // COMPUTED, NOT GENERATED — arithmetic.js's own precedent, and
              // the same caption, for the same reason. Wiring these bindings
              // into the prompt as content was built first and measured live
              // three times: handed the exact closed set with dates, gemma2:2b
              // still answered "Andrew Johnson became president and served as
              // vice president", then dropped him twice. A set a model must
              // not drop from is not protected by telling it so (L5). When
              // the set is CLOSED — coverage.tiles, every gap accounted for —
              // the answer is determined, so it is rendered and the model is
              // not asked. An unclosed set renders nothing and the ordinary
              // pipeline runs untouched.
              const rendered = renderHolders({ anchor: anchorTerm, slot: slotTerm, bound: best.bound, coverage: best.coverage });
              if (rendered) {
                // KEEP THE REASONING. `body.textContent = ""` was here, and
                // it destroyed the live `.reasoning` element along with the
                // draft — the exact defect P54 records in renderAnswer ("the
                // ticker was cleared and the live log element destroyed by
                // renderAnswer's own body.textContent = ''"), reproduced.
                // Everything the walk narrated — what it went looking for,
                // what the record said — was being erased at the moment it
                // was about to matter most.
                //
                // And the answer goes AFTER the reasoning, not before it.
                // The work genuinely preceded the conclusion here: the
                // record was consulted, the holders were found, and only
                // then was the sentence assembled. Printing the conclusion
                // above the work reads as the instrument having known it all
                // along — P54's own complaint about chronology, in the other
                // direction.
                // `think()` appends into `traceEl`, so the `.reasoning`
                // divs are its CHILDREN, not the body's — a first attempt
                // filtered `body.children` for `.reasoning`, found nothing,
                // and wiped the trace anyway. Keep the trace element itself.
                //
                // OPEN WHILE IT WORKS, CLOSED ONCE IT HAS ANSWERED. The
                // trace streams live so a reader can watch the question get
                // taken apart; the moment there is an answer, the work stops
                // being the thing on screen and becomes the thing available.
                // It stays ABOVE the answer either way — the reasoning
                // genuinely preceded the conclusion, and printing the
                // conclusion first would read as having known it all along.
                body.replaceChildren();
                // EACH NAME CARRIES ITS OWN SOURCE, inline. The addresses
                // used to sit in a row under the answer — "wikidata.org
                // Q273546 wikidata.org Q8612" — which is a bibliography, not
                // an attribution: a reader had to work out for themselves
                // which id belonged to which person. The rendered sentence is
                // re-read here and every filler's own name is linked to the
                // record it came from.
                //
                // SAFE BY CONSTRUCTION, and only here: the sentence was
                // assembled from the fillers' own labels moments ago
                // (renderHolders), so matching those exact labels back
                // against it is not fuzzy — and the addresses are the
                // giver's, never the model's. P20's rule (a model must not
                // be shown this instrument's address format, because it
                // invents them) is untouched: this runs after the answer
                // exists and nothing here reaches a prompt.
                const p = document.createElement("p");
                const linkable = seekFillers
                  .filter((f) => f.filler && f.address)
                  // longest first, so one name that contains another is
                  // matched whole rather than half-wrapped
                  .sort((a, b) => b.filler.length - a.filler.length);
                if (!linkable.length) {
                  p.textContent = rendered;
                } else {
                  const escape = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                  const parts = rendered.split(new RegExp(`(${linkable.map((f) => escape(f.filler)).join("|")})`, "g"));
                  for (const part of parts) {
                    const hit = linkable.find((f) => f.filler === part);
                    if (!hit) {
                      p.appendChild(document.createTextNode(part));
                      continue;
                    }
                    const a = document.createElement("a");
                    a.href = hit.address;
                    a.target = "_blank";
                    a.rel = "noreferrer";
                    a.title = hit.source;
                    a.textContent = part;
                    p.appendChild(a);
                  }
                }
                body.appendChild(p);
                // No caption. It read "on the public record — 2 holder(s),
                // computed, not generated" — a label about the machinery,
                // which is the firewall's own rule (P55) applied to what a
                // READER sees rather than what a model does. The names carry
                // their sources as links; that is the attribution, and it
                // needs no announcement.
                // The same turn bookkeeping every other path does — a turn is
                // not exempt from the fold or the record because no model ran
                // (FOLD-CONSTITUTION I.5, twoPassTurn's own gate-off path).
                state.history.push({ role: "user", content: task }, { role: "assistant", content: rendered });
                const turnN = state.summary.turnCount + 1;
                logAct("answered-mechanically", { what: "entity-seek", holders: seekFillers.length });
                observeExchange(turnN, task, rendered);
                const foldLine = mechanicalFoldLine(task, rendered);
                state.turnFolds.push(foldLine);
                state.summary = advanceSummaryFold(state.summary, foldLine);
                renderFold(node, { fold: foldLine, reasoning });
                renderThreads();
                $("status").textContent = readyLine();
                releaseBusy();
                return;
              }
            }
          }
        } catch (e) {
          think(`I could not check the public record for that: ${e?.message ?? e}`);
        }
      }
    }
    // Re-declare with the bindings in hand so the panel and the fold both
    // show what was actually established, not the state before the seek.
    if (seekFillers.length) narrateTheVoid(live.map((c) => c.text).filter(Boolean), "material", seekFillers);

    // The ledger's frame in force for THIS turn, and its recipe id — read
    // off the reader as it stands now, so a prior that loaded since the
    // ledger's birth is redeclared (holon.js) rather than frozen out.
    const ledgerFrame = state.grounded ? readerFrame() : null;
    const ledgerRecipe = ledgerFrame ? await readerRecipe(ledgerFrame) : null;

    const ledgerBase = state.hyperlexiconLog;
    result = await runHolonicTask({
      depth: state.depth,
      // The fillers as CONTENT, never as apparatus talk (P55): a stated
      // fact the draft must account for, with no mention of where it came
      // from. Empty unless the seek actually bound something, so a turn
      // without bindings sends byte-identical bytes to before.
      answerShape: seekFillers.length
        ? `Known to be true, and the answer must account for all of them: ${seekFillers
            .map((f) => (f.span ? `${f.filler} (${f.span.fromText} to ${f.span.toText})` : f.filler))
            .join("; ")}. There are no others.`
        : undefined,
      task,
      chunks: live,
      // Wrapped, never holon.js itself (another session's contract, per
      // CLAUDE.md — this needs no edit there): every messages array is
      // captured verbatim for the "what was sent" disclosure, and every
      // completion is scrubbed of any bracket shaped like this
      // instrument's own address (stripSelfCitations, cite.js) before
      // holon.js's own inspect/attribute/render pipeline ever sees it —
      // the model is never shown the address format (source.js's
      // buildSourceBlock no longer carries one) and now cannot ship one
      // even by coincidence (a training habit, or text copied verbatim
      // from retrieved material that happens to carry bracket notation).
      call: async (messages, opts) => {
        sentCalls.push({ n: sentCalls.length + 1, messages });
        // autoContinue is safe to pass unconditionally — complete()'s own
        // guard skips it for any json-mode call (the plan ask, notably),
        // so this needs no per-call-kind branching here.
        const out = await complete(messages, { ...opts, model: turnModel, autoContinue: true });
        return stripSelfCitations(out).text;
      },
      foldedRefs,
      makeNameResolver: castFor,
      // The relation tier is the expensive check and the one with a whole
      // verdict vocabulary behind it. Plain mode does not ask for it, so it
      // is never computed — off means not run, not run-and-hidden.
      makeRelationReader: state.grounded ? relationsFor : null,
      witnessSentences: state.grounded ? witnessSentencesFor : null,
      // The link tier (links.js): a cited URL is fetched through the SAME
      // standing web consent proof-seeking already asks for — an automatic
      // crossing the instrument decided to make, not a click the reader
      // made, so it lives behind the same switch. Off means every cited URL
      // ships `unexamined`, never silently treated as checked.
      checkLink: state.webProof ? checkLinkCitation : null,
      // The completeness gate's own belief, landed on the SAME app-wide
      // log `/act`/the terminal already write to (P38: "the hypergraph
      // records beliefs... held BY AN EXPERIENCER, not just given by a
      // source") — gated on `state.grounded` for the identical reason
      // `makeRelationReader` two lines up already is: with checking off,
      // `check.relations` is never computed, so `incompleteClaimsOf` has
      // nothing to find and this would be dead weight to pass regardless.
      grid: state.grounded ? grid : null,
      gridLog: state.grounded ? state.gridLog : null,
      runCapacity: state.grounded ? runCapacity : null,
      landAct: state.grounded ? landAct : null,
      // Same gate, same reason: the ledger only ever admits from `relations`
      // reading, which is itself null with checking off — see two lines up.
      hyperlexicon: state.grounded ? hyperlexiconFor : null,
      hyperlexiconLog: state.grounded ? state.hyperlexiconLog : null,
      // The frame a FRESH ledger is born under (holon.js creates one only
      // when hyperlexiconLog is null) — declared here, where the reader was built.
      hyperlexiconFrame: ledgerFrame,
      hyperlexiconRecipe: ledgerRecipe,
      hyperlexiconUnread: unreadNow(),
      hyperlexiconDerived: state.grounded ? derivedNow() : [],
      hyperlexiconVoids: state.grounded ? voidsNow() : [],
      // The door's grammar gate, data-gated (null until the POS prior
      // loads — see connectorLens's own construction comment) and mode-
      // gated with the ledger it guards.
      classifyConnector: state.grounded ? connectorLens : null,
      planMode,
      // Verbatim recent history for the chat path (no material). The
      // discourse slice is the folded fallback when this window is empty.
      // Sliced at the regime's present, not the constant: a startled
      // reader narrows onto now; the turns that fall out are already in
      // the fold.
      chatHistory: state.history.slice(-present),
      discourse: discourseLine,
      searchedVoid,
      priorPass: opts.priorPass ?? null,
      // Flow #2's other two knobs (escalation, computed above): identical
      // to holon.js's own defaults whenever the standing did not read
      // `contested`, so passing them unconditionally changes nothing on
      // an ordinary turn — and one more correction pass plus two more
      // passages per part exactly when S1's record says the fast layer
      // has been getting corrected.
      maxCorrections: escalation.maxCorrections,
      passagesPerPart: opts.passagesPerPart ?? escalation.passagesPerPart,
      // Long-form (P108): an essay door declares its section count and its
      // per-part draft budget; an ordinary turn passes nothing and gets the
      // standing defaults.
      ...(opts.maxParts ? { maxParts: opts.maxParts } : {}),
      ...(opts.executeMaxTokens ? { executeMaxTokens: opts.executeMaxTokens } : {}),
      ...(opts.planMaxTokens ? { planMaxTokens: opts.planMaxTokens } : {}),
      ...(opts.piece ? { piece: { ...opts.piece, model: turnModel } } : {}),
      ...(planFacts ? { planFacts } : {}),
      onProgress: (phase, part, info) => {
        if (phase === "plan") {
          setPhase("planning");
          show("planning…");
        } else if (phase === "planned") {
          show(
            `plan: ${info.parts.length} part(s)` +
              (info.degraded ? " — plan did not parse, running the task flat" : "") +
              ` · ${info.parts.map((p) => p.label).join(" · ")}`,
          );
          logAct("planned", {
            parts: info.parts.map((p) => p.label),
            degraded: Boolean(info.degraded),
          });
        } else if (phase === "research") {
          setPhase(`reading for ${part.label}`);
          show(`${part.label}: ${info.passages.length} passage(s) retrieved`);
          logAct("retrieved", {
            part: part.label,
            refs: info.passages.map((p) => p.ref),
          });
        } else if (phase === "execute") {
          setPhase(`writing ${part.label}`, info.promptChars ?? 0);
          $("status").textContent = `writing: ${part.label}…`;
          if (opts.longForm) mirrorTermRecord("longform-part", { topic: opts.longForm.topic, part: part.label, via: "chat" });
        } else if (phase === "draft") {
          // The part being written, streamed as blocks — display-only until
          // the checks run on the whole.
          const now = performance.now();
          if (now - lastDraftPaint > 200) {
            lastDraftPaint = now;
            const d = document.createElement("div");
            renderBlocksInto(d, info.partial, (chunk) => [document.createTextNode(chunk)]);
            draftEl.replaceChildren(...d.childNodes);
            node.scrollIntoView({ block: "end" });
          }
        } else if (phase === "thinking") {
          // The model's OWN deliberation, live — see `showModelThinking`'s
          // own header for why this is a separate voice from the void's
          // `.reasoning`. Same paint throttle as the draft (200ms): a
          // reasoning model emits many small tokens and repainting on every
          // one is wasted work a reader cannot perceive anyway.
          const now = performance.now();
          if (now - lastThinkPaint > 200) {
            lastThinkPaint = now;
            showModelThinking(info.partial);
          }
        } else if (phase === "correct") {
          setPhase(`rewriting ${part.label}`, info.promptChars ?? 0);
          show(`${part.label}: ${info.failures.length} unsupported claim(s), rewriting`);
          logAct("corrected", { part: part.label, failures: info.failures.length });
        } else if (phase === "checked") {
          draftEl.replaceChildren();
          show(
            `${part.label}: ${info.refs.length} address(es)` +
              (info.unsupported.length ? `, ${info.unsupported.length} unsupported` : "") +
              (info.open.length ? `, ${info.open.length} open` : ""),
          );
          // The material's own edges, read against this part's answer — a
          // real per-part tally, not a fabricated live per-edge stream: the
          // relation tier reads in one batch (hypergraph.js's `read()`), so
          // this is exactly as fine-grained as the check actually is, no
          // finer. Silent when relations are off (info.relations is null,
          // checking mode not asking for the tier at all) or when the
          // material was too small to measure a vocabulary from — both
          // typed facts, not "zero relations found."
          if (info.relations?.examined && !info.relations.vocabulary?.gap) {
            const tally = {};
            for (const c of info.relations.claims) tally[c.verdict] = (tally[c.verdict] ?? 0) + 1;
            const bits = Object.entries(tally).map(([v, n]) => `${n} ${v}`);
            if (bits.length) show(`${part.label}: relations — ${bits.join(", ")}`);
          } else if (info.relations?.vocabulary?.gap) {
            show(`${part.label}: relations — ${info.relations.vocabulary.gap}`);
          }
          logAct("checked", {
            part: part.label,
            refs: info.refs.length,
            unsupported: info.unsupported.length,
            open: info.open.length,
          });
        } else if (phase === "production") {
          show(`production: ${info.halted_by} after ${info.steps} step(s)`);
          logAct("production", { halted_by: info.halted_by, steps: info.steps });
        }
      },
    });
    // Persist whatever the completeness gate landed — `result.gridLog` is
    // `null` when checking was off (nothing was passed in to land against)
    // and otherwise the SAME log object handed in, updated or not; only
    // overwrite when a real state came back, so a turn that landed nothing
    // never clobbers what `/act`/the terminal already hold.
    if (result.gridLog) state.gridLog = result.gridLog;
    // Same discipline: only a real, updated ledger overwrites — a checking-
    // off turn (`result.hyperlexiconLog` null) never clobbers what an
    // earlier checked turn already admitted.
    // MERGED, never overwritten (P99): a read on arrival may have admitted
    // passages while this turn ran; both chains started from `ledgerBase`.
    if (result.hyperlexiconLog) state.hyperlexiconLog = mergeAppendOnly(state.hyperlexiconLog, result.hyperlexiconLog, ledgerBase, { append: nativeTaskLog.append });
    syncRecords();
    // Ranke's switch: chase what this turn heard off citing pages, under
    // the standing budgets, never awaited — the answer is already on screen
    // and the primary witnesses land on the ledger for the NEXT turn's
    // ledger block. Fire-and-forget like crownTestimony; a failure is a
    // console line, never a broken turn.
    if (state.ranke && state.grounded && result.hyperlexiconLog && Object.keys(state.pageFaces).length) {
      rankeChase({ maxFetches: RANKE_AUTO_FETCHES, maxSearches: RANKE_AUTO_SEARCHES }).catch((e) => console.warn("ranke:", e?.message ?? e));
    }
    clearInterval(ticker);
  } catch (err) {
    clearInterval(ticker);
    const answer = `[engine error: ${err.message || err}]`;
    body.textContent = answer;
    state.history.push(
      { role: "user", content: typed },
      { role: "assistant", content: answer },
    );
    // An errored turn is still a turn: folded mechanically, no model call —
    // the same accounting mechanicalTurn does — so history and the summary's
    // turn count cannot silently diverge. And an error is an act: the
    // ledger records it, the meter hears it.
    const turn = state.summary.turnCount + 1;
    logAct("errored", { message: String(err.message || err) });
    observeExchange(turn, task, answer);
    const fold = mechanicalFoldLine(task, answer);
    state.turnFolds.push(fold);
    state.summary = advanceSummaryFold(state.summary, fold);
    renderFold(node, { sent: sentCalls });
    renderThreads();
    $("status").textContent = readyLine();
    state.busy = false;
    $("send").disabled = false;
    drainQueue();
    return;
  }

  state.history.push(
    { role: "user", content: typed },
    { role: "assistant", content: result.output },
  );

  // The record is the union of what each part's own check established —
  // read off, never re-derived — and it exists only when something WAS
  // checked: a task that retrieved nothing anywhere had no check run, and an
  // unchecked turn must not acquire ON RECORD authority. Same guard send()
  // holds (`passages.length ? buildWarrantRecord(...) : null`), one level up.
  const offered = [...new Map(result.sections.flatMap((s) => s.passages).map((p) => [p.ref, p])).values()];
  const attributions = result.sections.flatMap((s) => s.attributions);
  const turn = state.summary.turnCount + 1;
  const fold = mechanicalFoldLine(task, result.output);
  // The record is turn-sized and a task is not: overflow past the record's
  // own caps is compressed into a visible count, never dropped silently —
  // the full detail stays in the run log disclosure. P4: a capped list says
  // it was capped.
  const capped = (list, max, where) =>
    list.length > max
      ? [...list.slice(0, max - 1), `+${list.length - (max - 1)} more — see ${where}`]
      : list;
  const record = offered.length
    ? buildWarrantRecord({
        turn,
        gist: fold,
        channels: result.channels,
        refs: result.refs,
        // Lies and unbacked knowledge are corrected differently upstream
        // (only the first drives a rewrite) but the record names both — a
        // claim the material does not hold is on the record either way.
        unsupported: capped([...result.unsupported, ...(result.unbacked ?? [])], RECORD_REFS_MAX, "the run log"),
        open: capped(result.open, RECORD_OPEN_MAX, "the run log"),
      })
    : null;
  if (record && result.refs.length > record.refs.length)
    record.open = capped(
      [...record.open, `+${result.refs.length - record.refs.length} more address(es) in the run log`],
      RECORD_OPEN_MAX,
      "the run log",
    );
  if (record) state.summary = addWarrantRecord(state.summary, record);
  if (record)
    logAct("recorded", {
      plane: record.plane,
      refs: record.refs,
      unsupported: record.unsupported.length,
      open: record.open.length,
    });
  logAct("folded", { line: fold });
  const arrivals = observeExchange(turn, task, result.output);
  // The meter counts material against the task's parts, not the fold: what
  // was retrieved here was retrieved for the parts and does not grow with
  // the conversation.
  state.lastMaterialChars = result.sections.reduce(
    (n, s) => n + (buildSourceBlock(s.passages)?.length ?? 0),
    0,
  );

  // The answer renders before the summary refresh so an artifact built from
  // it is stamped with THIS turn's number, not the next one's.
  const findings = result.sections.flatMap((s) => s.grounding?.findings ?? []);
  const relationClaims = result.sections.flatMap((s) => s.relations?.claims ?? []);
  // the sentence witness's rows, read by renderAnswer's badge pass by sentence text
  state.lastAsked = typeof task === "string" ? task : (state.lastAsked ?? "");
  state.lastWitness = result.sections.flatMap((s) => s.witness?.rows ?? []);
  // The whole cube, for the ground ladder (P115): every section's claims,
  // passages and witness rows, the ledger's notes, the derived facts and the
  // live disputes, plus the turn's model — so each sentence is placed on
  // its highest rung when it is drawn.
  state.lastGround = (() => {
    try {
      const claims = result.sections.flatMap((s) => s.relations?.claims ?? []);
      const passages = result.sections.flatMap((s) => s.passages ?? []);
      const notes = state.hyperlexiconLog && hyperlexiconFor.foldWithStanding ? hyperlexiconFor.foldWithStanding(state.hyperlexiconLog) : [];
      const disputes = state.hyperlexiconLog && hyperlexiconFor.disputesOf ? hyperlexiconFor.disputesOf(state.hyperlexiconLog) : null;
      const index = passages.length ? referentIndexFor(passages) : null;
      return { claims, passages, notes, derived: derivedNow(), disputes, resolveName: index ? (n) => index.resolve(n) : null, model: modelLabel(turnModel), turnSeq };
    } catch (e) { console.warn("ground ladder:", e?.message ?? e); return null; }
  })();
  // The instruction is the model's own plan — task + plan parts, mechanically
  // assembled. It goes into the build log's PROPOSE entries (build-log.js)
  // so the code is always projected from the instruction that produced it.
  const instruction = result.plan?.parts?.length
    ? `${task} ${result.plan.parts.map((p) => `${p.label}: ${p.description}`).join("; ")}`
    : task;
  // Plain mode draws prose and nothing else: no address chips, no ground
  // underlines, no relation badges, no tally. The classification is what
  // produces every one of those, so it is not run rather than run and hidden.
  // `task` still threads through either way — publishSegment's widget router
  // (REC/ground routing on a complaint) reads the operator's own words
  // regardless of whether checking marks are drawn this turn.
  if (state.grounded) {
    renderAnswer(body, result.output, offered, attributions, findings, relationClaims, instruction, task);
  } else {
    renderAnswer(body, result.output, offered, [], [], [], instruction, task);
  }
  // The metacognition watcher (metacognition.js, P72) — moved here, ahead
  // of `refreshSummary`'s own call, so `forcesFoldRefresh` can actually OR
  // onto its gate (metacognition-integration-note.md's own disclosed open
  // question — this pass traced it: every input this needs, `result.
  // sections`, `relationClaims`, `opts.priorPass`, is already computed by
  // this point, so nothing needed threading through holon.js). Also ahead
  // of the `!state.grounded` early return a few lines down: the watcher is
  // bookkeeping, not drawing — the same "the fold and the record stay ON
  // either way" rule the checking-mode section (CLAUDE.md) already states
  // for exactly this kind of state, applied here so a plain-mode S1/S2
  // disagreement is still heard rather than silently skipped because
  // nothing about it is painted. Fires only on an S1/S2 turn (`opts.
  // priorPass` is set only by twoPassTurn's own gated call, `priorPassFor`'s
  // own "a caller with no S1 pass simply never calls it" convention).
  let forceRefresh = false;
  if (opts.priorPass) {
    const s2Passages = result.sections.flatMap((s) => s.passages ?? []);
    const agreement = assessAgreement(opts.priorPass, { question: task, s2Passages, relationEdges: relationClaims });
    state.metaLedger = metaLedger.observe(state.metaLedger, { cell: "s1-draft", delta: agreement.counts });
    syncRecords();
    forceRefresh = forcesFoldRefresh(agreement);
  }
  // RE-ZERO AS A SURPRISE TO THE FOLD (Pass 29 / P109): a void filled this
  // turn — by the arrival read, by a filler the brief found, by the door —
  // is REC·Ground: the ground moved. The running summary refreshes on it
  // rather than being carried, and the override is an act on the ledger.
  // Whether this refreshes exactly where the summary would have gone stale
  // is the named, unrun measurement; the wire is what makes it measurable.
  let forceBecause = forceRefresh ? "S1/S2 disagreement (metacognition.js)" : null;
  const filledThisTurn = state.grounded && state.hyperlexiconLog && hyperlexiconFor.fillingsSince ? hyperlexiconFor.fillingsSince(state.hyperlexiconLog, turnStartSeq) : [];
  if (filledThisTurn.length) {
    logAct("rezeroed", { voids: filledThisTurn.map((f) => f.void), by: filledThisTurn.map((f) => f.by) });
    forceRefresh = true;
    forceBecause = `${filledThisTurn.length} void(s) filled this turn (REC·Ground)`;
  }
  await refreshSummary(fold, arrivals, sentCalls, { forceRefresh, because: forceBecause });
  // MOMENT 3: everything the turn held, retrieved passages INCLUDED.
  //
  // THE UNION IS LOAD-BEARING AND WAS FOUND LIVE. This pass used to declare
  // over `result.sections`'s retrieved passages ALONE — correct when it was
  // the only pass, since the void then described the material the answer was
  // actually built from. With moment 2 above it, that reading became a
  // regression: retrieval keeps the top few passages, so the final
  // declaration was built from LESS material than the one already narrated
  // and silently replaced it with a weaker one. Measured on the live
  // specimen: moment 2 read the extent from 1,999 passages and stated it
  // twice; moment 3 re-read it from 3 and stated it once, and the panel
  // showed the weaker number.
  //
  // The void is a claim about the QUESTION's own space, not about which
  // passages the model happened to be shown, so it is declared over the most
  // material the turn ever held. Retrieved passages stay in the union rather
  // than being dropped for `live`: on a decomposed task a part can retrieve
  // material this flat `live` array does not contain, and losing that would
  // be the same mistake in the other direction.
  //
  // Still DISPLAYED, never fed to the model: the filler side is not
  // trustworthy at page scale (measured again this session — the slot query
  // over these very pages returns "Though he", "Congress", "as" and "After"
  // as candidate vice presidents), so this reports the shape and leaves the
  // fillers visibly open rather than handing over junk candidates. This is
  // the LAST narration the void gets to make (2026-08-28: the persisted
  // "thinking" disclosure no longer re-draws it at all) — the live element
  // is gone by now, so whatever this call says only ever reached the reader
  // in the moment it streamed.
  // AND THE MATERIAL'S OWN CARDINALITY FINDING, which only exists now.
  // `clusterFillers` (hypergraph.js) rides every claim as `claim.fillers`
  // and has done since 2026-08-19 — holon.js's completeness gate reads it,
  // and the void, the one organ whose whole subject is "how many does this
  // slot hold", never asked. So a question with two real answers could be
  // declared, measured and reported on without the void noticing there were
  // two. `observedFillers` picks the slot that is actually this void's, by
  // shared content words, and refuses a tie rather than guessing.
  narrateTheVoid(
    [...live.map((c) => c.text), ...result.sections.flatMap((s) => (s.passages ?? []).map((p) => p.text))].filter(Boolean),
    "material",
    observedFillers(voidBrief?.declaration?.slot, voidBrief?.declaration?.cells?.find((c) => c.op === "SIG")?.declared, relationClaims),
  );
  // The AnswerRecord (P100): built from the turn's own sections — what was
  // retrieved, every claim the answer made with the verdict the material
  // gave it, what nothing backs — with the reader's identity; appended to
  // the durable record (`records/answers.jsonl`) and shown first.
  let answerRec = null;
  try {
    // The frame and recipe are re-derived here (the turn's own `ledgerFrame`
    // is scoped to the call above); the reader has not changed since.
    const recFrame = state.grounded ? readerFrame() : null;
    const recRecipe = recFrame ? await readerRecipe(recFrame) : null;
    answerRec = answerRecord({
      question: task, answer: result.output ?? "", model: turnModel, frame: recFrame, recipe: recRecipe,
      sections: result.sections ?? [], unsupported: result.unsupported ?? [], unbacked: result.unbacked ?? [],
      unread: unreadNow(), cursor: ANSWER_CURSOR++,
      // Every ∅ cites its void (P106): the open voids at the moment of the
      // record, and the sentence witness's rows, so each absence is either
      // an honest citation of a declared gap or a counted leak.
      voids: state.grounded ? voidsNow() : [], witness: state.lastWitness ?? [], sameForm: sameFormOrgan,
      sources: Object.keys(state.sources).map((name) => ({ name, bytes: state.sources[name]?.length ?? null })),
      constitution: { prompt: "constitution.js::CONSTITUTION_PROMPT", sha256: await CONSTITUTION_SHA },
    });
    appendRecord("answers", [JSON.stringify(answerRec)]).catch(() => {});
  } catch (e) { console.warn("answer record:", e?.message ?? e); }
  renderFold(node, { sent: sentCalls, record: answerRec });
  if (opts.longForm) {
    const bodyText = node.querySelector(".body")?.innerText ?? "";
    const secs = (result.sections ?? []).map((s) => s.piece ?? null).filter(Boolean);
    for (const e of result.edits ?? []) show(`edited — ${editLine(e)}`);
    for (const r of result.revisions ?? []) show(r.kind === "revision-error" ? `revision pass failed: ${r.because}` : revisionLine(r));
    const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
    // THE PIECE, KEPT AND EXPORTED (P121): the sections with their claims,
    // passages and witness rows, the addresses' urls, the prompts — enough
    // to place every sentence again and write the two faces.
    try {
      const prompts = {};
      for (const c of sentCalls) { const u = (c.messages ?? []).find((x) => x.role === "user")?.content ?? ""; const lab = u.match(/^Write this part: ([^.]+)\./); if (lab && !prompts[lab[1]]) prompts[lab[1]] = (c.messages ?? []).map((x) => `[${x.role}]\n${x.content}`).join("\n\n"); }
      const urls = {};
      for (const [name, prov] of Object.entries(state.provenance ?? {})) if (prov?.fields?.url) urls[name] = prov.fields.url;
      Object.assign(urls, state.huntUrls ?? {});
      state.lastPiece = { title: `${opts.longForm.topic} — ${opts.longForm.pages}-page ${opts.longForm.kind ?? "piece"} asked of The Fold`, ask: typed, model: turnModel, sections: result.sections ?? [], urls, prompts, ground: state.lastGround, depth: result.depth ?? state.depth, depthLine: result.depthLine ?? null, generatedAt: new Date().toISOString() };
      exportLastPiece(node).catch((e) => console.warn("piece export:", e?.message ?? e));
    } catch (e) { console.warn("piece keep:", e?.message ?? e); }
    mirrorTermRecord("longform-done", {
      depth: result.depth ?? state.depth,
      topic: opts.longForm.topic, pages: opts.longForm.pages, sections: (result.sections ?? []).length, chars: bodyText.length, words: bodyText.split(/\s+/).filter(Boolean).length,
      unbacked: (result.unbacked ?? []).length, unsupported: (result.unsupported ?? []).length,
      // P110's own numbers: words per section, obligation coverage, re-asks, meta-talk cut, hunts.
      revisions: Object.fromEntries((result.revisions ?? []).map((r) => r.kind).reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map())),
      edits: (result.edits ?? []).length, editKinds: Object.fromEntries((result.edits ?? []).map((e) => e.kind).reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map())),
      sectionWords: secs.map((x) => x.words), coverage: avg(secs.map((x) => x.coverage?.share).filter((x) => x != null)), reasked: secs.flatMap((x) => x.reasked ?? []).length, metaCut: secs.reduce((a, x) => a + (x.metaCut?.length ?? 0), 0), hunts: secs.filter((x) => x.hunted?.chunks).length,
      // P122's own numbers: atoms checked against the snips, flagged before and after the one rewrite, rewrite outcomes, contradiction candidates.
      snipCheck: (() => { const sc = secs.map((x) => x.snipCheck).filter(Boolean); const sum = (f) => sc.reduce((a, x) => a + (f(x) ?? 0), 0); const oc = {}; for (const x of sc) for (const o of x.outcomes ?? []) oc[o.outcome] = (oc[o.outcome] ?? 0) + 1; return { sections: sc.length, snips: sum((x) => x.snips), atoms: sum((x) => x.atoms), supported: sum((x) => x.supported), flagged: sum((x) => x.flagged), flaggedAfter: sum((x) => x.after?.flagged), asked: sum((x) => (x.asked === true ? 1 : Number(x.asked) || 0)), outcomes: oc, contradictions: sum((x) => x.contradictions?.length) }; })(),
      via: "chat",
    });
  }
  renderThreads();
  if (!state.grounded) {
    $("status").textContent = readyLine();
    releaseBusy();
    return;
  }
  // The grounding inspector: every claim with its typed verdict, its
  // corroboration counted across passages and sources, its click-through
  // addresses, and its door to the world (proof-seeking). Read off the
  // checks the parts already ran — drawn, never re-measured.
  renderGrounding(node, {
    answer: result.output,
    offered,
    findings,
    relations: result.sections.map((s) => s.relations).filter(Boolean),
    quotes: result.sections.map((s) => s.quotes).filter(Boolean),
    quoteCorrections: result.sections.flatMap((s) => s.quoteCorrections ?? []),
    question: task,
  });
  // The testimony spine, after the pooled render — deliberately not awaited:
  // the answer is already on screen and the composer must not be held
  // hostage to a per-source walk over large material. Its own status
  // narration replaces the ticker while it runs (the same posture the
  // proof-seeking walk above already holds).
  crownTestimony(node, relationClaims).catch((e) => {
    $("status").textContent = `testimony pass failed: ${e?.message ?? e}`;
  });
  $("status").textContent = readyLine();
  releaseBusy();
}

// ── rendering ────────────────────────────────────────────────────────────────

/** Real tokens, cumulative, straight from Ollama's own `done` chunks. */
const tokensSeen = { in: 0, out: 0, calls: 0 };

function addMessage(role, text) {
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  // The counter's reading when this message was born. Its cost is the delta.
  el.dataset.tokIn = String(tokensSeen.in);
  el.dataset.tokOut = String(tokensSeen.out);
  el.dataset.tokCalls = String(tokensSeen.calls);
  el.dataset.turnSeq = String(turnSeq);
  // The disclosure is kept behind a one-word affordance, there the moment
  // you want to ask "what did this turn actually see?"
  //
  // That word is "thinking" (user, 2026-08-17). It used to be the resting
  // place of everything a turn produced — the live narration, the model's
  // own deliberation, the running summary, the append-only record, a run
  // log, the void's own declaration, a nine-cell verification breakdown —
  // eight things behind one word. Vastly simplified (2026-08-28, user
  // direction): now it holds exactly one thing, the full prompt history —
  // every messages array this turn actually sent to a model, verbatim
  // (renderFold, below, carries the reason). Everything that used to be
  // drawn here still runs and still lands on the append-only record
  // (FOLD-CONSTITUTION I.5); it is simply no longer drawn here. The `.fold`
  // CLASS below is left alone deliberately: it is the disclosure's shared
  // styling and renaming it would buy nothing a reader ever sees.
  el.innerHTML =
    `<div class="who"></div><div class="body"></div>` +
    (role === "assistant"
      ? `<div class="turn-meta">` +
        `<details class="fold"><summary>thinking</summary><p></p></details>` +
        `</div>`
      : "");
  el.querySelector(".who").textContent = role === "user" ? "you" : "model";
  if (role === "user" && /^\//.test(text)) {
    const body = el.querySelector(".body");
    const span = document.createElement("span");
    span.className = "command";
    span.textContent = text;
    body.append(span);
  } else {
    el.querySelector(".body").textContent = text;
  }
  state.convos[state.active].el.append(el);
  el.scrollIntoView({ block: "end" });
  return el;
}

/**
 * Render a finished answer as what it is. Prose stays prose; a table becomes a
 * table; code becomes code; an HTML or SVG block becomes the page it describes,
 * inside a sandboxed frame with scripts and same-origin access withheld —
 * model output is content, not code this app has agreed to run.
 */
function renderAnswer(body, answer, offered = [], attributions = [], findings = [], relationClaims = [], instruction = null, task = null) {
  // The operator's own words for this turn — what the widget router reads.
  // Flat (single-part) turns pass only `instruction`; holonic turns pass a
  // separate `task` (the plan's own words differ from the operator's), so
  // this falls back rather than routing on the model's plan text.
  const routingTask = task ?? instruction;
  // Every sentence of the whole answer classified onto its ground once;
  // each rendered chunk then draws the sentences it contains.
  const classified = classifySentences(answer, attributions, findings, relationClaims);
  // One chip per RUN of sentences standing on the same address — a verbatim
  // stretch attributed sentence-by-sentence to one passage drew fourteen
  // identical chips through the prose (measured live; the reader called it
  // obstruction, and it was). The first sentence of a run carries the chip;
  // the underline carries the ground for the rest; the chip reappears only
  // when the address changes.
  let lastRef = null;
  for (const e of classified) {
    if (e.ref) {
      e.showChip = e.ref !== lastRef;
      lastRef = e.ref;
    } else if (e.ground === "material") {
      // A model-cited sentence has its own inline address; it also resets
      // the run so a following attributed sentence names its source again.
      lastRef = null;
    }
  }
  // A same-turn html fence with its own trailing javascript fence is one
  // artifact wearing two segments (artifact.js::mergeHtmlScript) — merged
  // before routing so the widget lands as one build, wired, not two forked
  // builds where the script half auto-runs with no DOM and throws.
  const segments = mergeHtmlScript(parseSegments(answer));
  body.textContent = "";
  // One turn is one act (widget.js): a later block of the same kind in this
  // SAME turn is a version of the first, never a sibling — tracked here so
  // routeSegment sees what already landed before this segment, not just
  // what existed before the turn began.
  const landedThisTurn = [];
  for (const seg of segments) {
    if (seg.type === "prose") {
      // A flow container, not a <p>: render.js emits headings and lists, and
      // a browser silently relocates those out of a paragraph. Every inline
      // run comes back through taggedProse, so the address chips, attribution
      // tags, and provenance grounds survive the markdown structure.
      const d = document.createElement("div");
      d.className = "prose";
      renderBlocksInto(d, seg.text, (chunk) =>
        taggedProse(chunk, offered, classified.filter((e) => findSentence(chunk, e.text))),
      );
      body.append(d);
      continue;
    }
    const { chip, entry } = routeAndPublish(seg, routingTask, instruction, landedThisTurn);
    body.append(chip);
    // The chip is the conversation handle; the widget itself also appears
    // inline — no click required, for every non-prose segment (code and
    // table alike). Renderable artifacts (html, svg) get a sandboxed frame;
    // every other language falls through to artifactNode's plain-text
    // branch, so code reads as code in the transcript itself. This is the
    // segment's OWN code, so a revision's preview is the revision's, not
    // stale bytes left over from the build's first version.
    //
    // scripts reflects the SAME consent buildFold's lastRun already gates
    // in the Folds panel (`shown.lastRun` there) — a just-landed html/svg
    // segment has not been run yet, so it renders inert here exactly as it
    // does there, and entry (when real) wires this artifact's own ▶ run so
    // that consent can be earned right in the chat feed, never assumed
    // just because the segment is visible (this file's own standing rule).
    const live = entry ? buildFold(entry, null) : null;
    body.append(artifactNode(seg, undefined, seg.code, { scripts: !!live?.lastRun, entry }));
  }

  // Fold membership decides the register (user direction, 2026-08-17: "just
  // the fact that it is content in the FOLD item means it's not relevant
  // there, it's code"). On a turn that landed a code build, the answer's
  // prose is the model walking through its own artifact — "**Counter
  // Initialization:** let count = 0 sets…" — content whose subject IS the
  // turn's own fold, not claims about the world. A build turn's ground is
  // the artifact and its witness (the run result attached to the version
  // that ran), never web corroboration of the model's own labels for its
  // own code. So the chat surface's claim apparatus stands down for this
  // turn: the tally below is skipped and renderGrounding reads the class to
  // withhold its chip strip and automatic proof-seeking. The marks
  // toggle's own discipline, keyed per turn: the checks still ran, the
  // findings still land on the append-only record (the thinking disclosure
  // itself no longer draws them either, since 2026-08-28 — renderFold's own
  // header) — what is withheld is the drawing, never the finding.
  const buildTurn = landedThisTurn.some((b) => b.type === "code");
  if (buildTurn) body.closest(".msg")?.classList.add("build-turn");
  // A tally of the turn's epistemic state — how much of what was just said
  // stands on the material, how much on the model, how much stands on
  // nothing — used to be drawn into the "thinking" box here (one reading of
  // the same `classified` array the answer's own marks are drawn from).
  // Removed, not relocated (2026-08-28: renderFold's own header carries the
  // fuller account) — every turn that reaches this point still calls
  // renderFold immediately after, which clears that same box, so the tally
  // was already being built and thrown away unseen before this cleanup.
}

/**
 * The Per-Source Testimony spine, live (POLICIES P39; BUILD-0..4 of the
 * spec): every claim this turn asserted that the pooled check left
 * unresolved is taken back to EACH loaded source separately — one minted
 * claim_id (grid.mintClaimId), one `evaluate` act landed per source through
 * the SAME squared-and-checked path capacity-runner's own tests pin — then
 * the per-source readings merge (mergeTestimony) and the crown renders the
 * merged verdict as a plain sentence (renderCrown: template-only, no model
 * call, every token traced to a claim field, a witness name, or one
 * declared connective).
 *
 * Only a DETERMINED verdict speaks on the chat surface — the reader asked a
 * question, and a determined crown IS the grounded answer to it, in prose,
 * its source named by the sentence itself ("According to pasted.txt, …").
 * An UNDETERMINED merge stays off the surface: the sentence's own unbacked
 * mark and the fold already carry that news, and a second inline line would
 * be apparatus, not answer (user direction, 2026-08-20: "THIS SHOULD FEEL
 * LIKE CHATTING WITH CLAUDE"). Every crown — spoken or not — lands in the
 * turn's fold with its case, standing, and witness list, self:model
 * included verbatim (a self-assertion landed by holon's own path shares the
 * claim_id when it shares the triple, so it merges here with no extra
 * wiring).
 *
 * Cost, disclosed rather than capped: each act is a full-source hypergraph
 * read (plus squaring's negation read), synchronous by construction. The
 * yield between sources is what keeps the page breathing — the same reason
 * the ingestion path admits chapters progressively. Nothing is dropped
 * silently; a source name the act grammar cannot carry verbatim is skipped
 * WITH a fold line saying so.
 */
async function crownTestimony(node, relationClaims) {
  if (!state.grounded || !Array.isArray(relationClaims) || !relationClaims.length) return;
  const names = Object.keys(state.sources);
  if (!names.length) return;
  const body = node.querySelector(".body");
  // `disclose` used to narrate this walk into the "thinking" box — it no
  // longer does (2026-08-28, renderFold's own header carries the reason),
  // and this runs fire-and-forget AFTER renderFold has already drawn that
  // turn's box, so an untouched `foldBox` here would still get testimony
  // lines appended onto it after the fact. `disclose` writes into a detached
  // scratch element instead: every real effect below it (minting the claim
  // id, landing each source's `evaluate` act on `state.gridLog`, and — the
  // part a reader actually sees — appending the determined crown sentence
  // onto the answer's own `body`) runs exactly as before.
  const foldBox = document.createElement("div");
  const disclose = (text) => {
    const line = document.createElement("div");
    line.className = "fold-note";
    line.textContent = text;
    foldBox.append(line);
  };
  // Unresolved claims are the news: a bound claim already stands on the
  // pooled material, and re-litigating it per source would spend full-source
  // reads confirming what the marks already show. Deduped on the exact
  // triple — the same identity mintClaimId hashes — so a claim asserted
  // twice in one turn never crowns twice.
  const seen = new Set();
  const candidates = relationClaims.filter((c) => {
    if (!c?.end1 || !c?.label || !c?.end2) return false;
    if (c.verdict === "bound") return false;
    // A stray pair of literal null bytes here (in place of the two
    // spaces) predates this edit and is fixed as a byproduct of
    // rewriting this exact line for the field migration -- see the
    // migration commit message for how it was found and confirmed
    // isolated to this one line.
    const key = `${c.end1} ${c.label} ${c.end2}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!candidates.length) return;
  const total = candidates.length * names.length;
  let step = 0;
  for (const claim of candidates) {
    // mintClaimId's own required parameter names (grid.js); the values
    // read off the claim's neutral arrangement (P72), the keys stay theirs.
    const claimId = await grid.mintClaimId({ subject: claim.end1, verb: claim.label, object: claim.end2 });
    // One quoted token: grid's tokenizer keeps a quoted object whole, so a
    // claim containing a bare clause keyword ("from", "ground") cannot
    // shred the act line. An interior double quote would end the token
    // early — swapped for an apostrophe before the line is built, and the
    // round-trip check below compares against the swapped text.
    const claimText = `${claim.end1} ${claim.label} ${claim.end2}`.replace(/"/g, "'");
    for (const name of names) {
      step += 1;
      $("status").textContent = `checking against each source · ${step}/${total}`;
      const line = `evaluate "${claimText}" at Link from differentiate ground "${String(name).replace(/"/g, "'")}" broken:rotation`;
      const landed = landAct(grid, state.gridLog, line, { sources: state.sources, runCapacity, claimId });
      // Round-trip, not trust: a name or claim the act grammar mangled
      // would land an evaluate against nothing. Landed junk is worse than
      // a skipped source, so the log keeps this landing only when the
      // parsed event names exactly what was meant.
      if (landed.ok && landed.event.ground === name && landed.event.object === claimText) {
        state.gridLog = landed.log; syncRecords();
      } else {
        disclose(`testimony: ${name} skipped — the act grammar could not carry this claim/source pair verbatim`);
      }
      await new Promise((r) => setTimeout(r));
    }
    const readings = perSourceReadings(grid, state.gridLog, claimId);
    const merged = mergeTestimony(readings);
    // THE WIRE (P91 named it, Pass 20 / P101 lands it): a DISAGREE or a
    // CONTRADICTED merge is written to the record as CON·Figure·CONTESTED
    // — the refusing source, its own bytes as decider, kind `contest` by
    // construction — and never convicts. The decider is the passage the
    // refusing source read, sliced from the source's own bytes.
    let contested = null;
    if (merged.case === "DISAGREE" || merged.case === "CONTRADICTED") {
      try {
        const textAt = (at) => { const m = String(at).match(/^(.+?)#(\d+)-(\d+)$/); return m && typeof state.sources[m[1]] === "string" ? state.sources[m[1]].slice(Number(m[2]), Number(m[3])) : null; };
        const base = state.hyperlexiconLog ?? hyperlexiconFor.createHyperlexicon();
        const landed = landContest(base, hyperlexiconFor, merged, { textAt });
        if (landed.landed.length) { state.hyperlexiconLog = landed.log; syncRecords(); }
        contested = landed;
      } catch (e) { console.warn("contest:", e?.message ?? e); }
    }
    const crown = renderCrown(merged);
    disclose(
      `testimony · ${merged.case}${merged.standing ? ` (${merged.standing})` : ""} · ${claimId.slice(0, 11)} · ` +
        `witnesses: ${crown.apparatus.sources.length ? crown.apparatus.sources.join(", ") : "none"} · “${crown.text}”` +
        (crown.verified ? "" : " · render withheld: trace-coverage violation") +
        (contested ? ` · contest: ${contested.landed.length} landed on the record${contested.unanimous ? " (unanimous refusal, still only disputed)" : ""}${Object.entries(contested.refusals).filter(([, n]) => n).map(([k, n]) => `, ${n} ${k}`).join("")}` : ""),
    );
    // Only through the verified render — an unverifiable crown already
    // substituted its own withholding sentence, which is exactly what
    // should be shown in that case.
    if (merged.case !== "UNDETERMINED" && body) {
      const p = document.createElement("p");
      p.className = `crown-line${merged.case === "DISAGREE" || merged.case === "CONTRADICTED" ? " bad" : ""}`;
      p.textContent = crown.text + (contested?.landed?.length ? ` (recorded as a contest, not settled)` : "");
      body.append(p);
    }
  }
  $("status").textContent = readyLine();
}

/** An address, exactly as source.js writes and checkCitations reads it. */
const REF_IN_TEXT = /\[([^\]\s]+#\d+-\d+)\]/g;

/**
 * Turn every bracketed address in an answer into the thing it names.
 *
 * The model writes `[kessington.txt#80-174]` because it was told to, and a
 * reader looking at that has a byte range and no way to check it. It is a
 * mechanical fact — the same pattern the citation check already parses — so
 * it is rendered as a control that reads those bytes back.
 *
 * A tag naming material the turn was never given is drawn differently and
 * does not open. That is not a rendering nicety: the mechanical check already
 * calls it unsupported, and a citation the model invented should not look
 * identical to one it was handed.
 */
/** Locate a sentence inside a rendered run, whitespace-flexibly: render.js
 * splits paragraphs into per-line runs, so a sentence that wraps a line
 * never matches by strict inclusion — measured live as most sentences
 * rendering unclassified. The words are the identity; the whitespace is the
 * renderer's. */
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function findSentence(hay, sentence) {
  const words = String(sentence).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const m = hay.match(new RegExp(words.map(escapeRe).join("\\s+")));
  return m ? { at: m.index, len: m[0].length } : null;
}

/**
 * The mark as an instrument: press an unaddressed sentence and the app
 * searches the material on that sentence's own words, opening the best
 * passage in context — or saying plainly that nothing matches. The reader
 * verifies with one click instead of taking either the model's word or
 * this app's.
 */
function groundHunt(text) {
  const live = liveChunks();
  const hits = live.length ? retrieve(live, text, 1) : [];
  if (!hits.length) {
    $("status").textContent = "no material matches that sentence's words";
    return;
  }
  reopen(hits[0].ref);
}

/**
 * A ref's label, when the document's own structure gave it one. Boundaries
 * discovered by form (segments.js — a short line, blank after, substance
 * beneath) carry through `chunkSource` into every chunk's `.label`
 * (source.js::makeChunk), so a chapter is addressed by the name the
 * document itself gave that stretch. Falls back to the byte address for a
 * source with no discovered structure, or a ref this app never chunked
 * (a self-ref, or a citation the model invented) — never invented here.
 */
function refLabel(ref) {
  const chunk = state.chunks.find((c) => c.ref === ref);
  if (!chunk?.label) return null;
  // Composed from CONTAINMENT, never from typography — the engine's own
  // outlineOfIndex is deliberately flat ("no nesting is inferred from
  // typography, ever," segments.js's own law), so this app must not guess a
  // book/chapter hierarchy from heading text. What it CAN do honestly: a
  // container heading with genuine substance under it before the first
  // heading beneath it (a "BOOK TWO" divider with real text, not just a
  // chapter number) survives as its OWN boundary, and its byte range then
  // literally contains every chapter under it — a geometric fact already
  // sitting in state.chunks, not an inference. Where no such container
  // survived, the chapter's own label stands alone, which is the honest
  // answer for a document with one level of discovered structure.
  const ancestors = state.chunks
    .filter((c) => c.source === chunk.source && c.label && c.label !== chunk.label)
    .filter((c) => c.start <= chunk.start && c.end >= chunk.end)
    // Smallest containing range first — the immediate parent, then its own
    // parent, outward.
    .sort((a, b) => a.end - a.start - (b.end - b.start));
  const path = [];
  const seen = new Set();
  for (const c of [...ancestors, chunk]) {
    if (seen.has(c.label)) continue;
    seen.add(c.label);
    path.push(c.label);
  }
  let text = path.join(" · ");
  // A chapter longer than the segment limit is split into several chunks
  // that all carry the SAME label (source.js::chunkByBoundaries — "every
  // piece keeps the segment's label so a reader can still tell which
  // chapter a fragment came from"). Two genuinely different addresses then
  // read identically, which is worse than the byte range they replaced:
  // the whole point of an address is that a reader can tell one citation
  // from another, and a label that cannot is a regression dressed as an
  // improvement. Disambiguated by the piece's own position among its
  // same-label siblings — a structural fact read off state.chunks, not an
  // invented number.
  const siblings = state.chunks
    .filter((c) => c.source === chunk.source && c.label === chunk.label)
    .sort((a, b) => a.start - b.start);
  if (siblings.length > 1) {
    const index = siblings.findIndex((c) => c.ref === chunk.ref);
    text += ` · ${index + 1}/${siblings.length}`;
  }
  return text;
}

/** What a ref shows: structure over bytes, bytes when there is no structure. */
function chipText(ref) {
  return refLabel(ref) ?? ref;
}

/** Bold, italic, and inline code in a run of prose, nothing more. The model
 * writes markdown because it was told to; the reader should see bold as bold.
 * Refs were already split out before this runs (refNodes splits first), and a
 * code span is taken literally — its content is shown as written, `**` inside
 * it included. */
const INLINE_MD = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g;
function inlineMarkdown(text) {
  const out = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_MD)) {
    if (m.index > last) out.push(document.createTextNode(text.slice(last, m.index)));
    const tok = m[0];
    if (tok[0] === "`") {
      const code = document.createElement("code");
      code.textContent = tok.slice(1, -1);
      out.push(code);
    } else if (tok.startsWith("**")) {
      const strong = document.createElement("strong");
      strong.textContent = tok.slice(2, -2);
      out.push(strong);
    } else {
      const em = document.createElement("em");
      em.textContent = tok.slice(1, -1);
      out.push(em);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(document.createTextNode(text.slice(last)));
  return out;
}

/** Bracketed addresses in a run of text become controls; everything else
 * stays text. The mechanical half of taggedProse, shared by the
 * sentence-provenance wrapper below. */
function refNodes(text, known) {
  const out = [];
  let last = 0;
  for (const m of String(text).matchAll(REF_IN_TEXT)) {
    if (m.index > last) out.push(...inlineMarkdown(text.slice(last, m.index)));
    const ref = m[1];
    if (known.has(ref)) {
      const b = document.createElement("button");
      b.className = "ref";
      const label = refLabel(ref);
      b.textContent = chipText(ref);
      b.title = label ? `${ref} — read these bytes back out of the material` : "Read these bytes back out of the material";
      b.onclick = () => reopen(ref);
      out.push(b);
    } else {
      const s = document.createElement("span");
      s.className = "ref bad";
      s.textContent = chipText(ref);
      s.title = `${ref} — not among the passages retrieved for this turn`;
      out.push(s);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(...inlineMarkdown(text.slice(last)));
  return out;
}

/**
 * Prose with every sentence standing on its named ground (provenance.js):
 * material-ground sentences read plain and carry their address; model-ground
 * sentences carry a quiet dotted underline — the model's own voice, typed as
 * such, never blocked (IV.4) and never dressed as measurement; a sentence
 * whose figures or names the material does not hold carries the warning
 * stripe, whichever ground it stands on. All of it read off checks the turn
 * already ran — this function draws, it does not measure.
 */
function taggedProse(text, offered, classified = []) {
  const known = new Set(offered.map((p) => p.ref ?? p));
  const out = [];
  let rest = String(text);

  for (const entry of classified) {
    const hit = findSentence(rest, entry.text);
    if (!hit) continue;
    const { at, len } = hit;
    if (at > 0) out.push(...refNodes(rest.slice(0, at), known));
    const matched = rest.slice(at, at + len);

    const sent = document.createElement("span");
    sent.className = `sent${entry.absent.length ? " claims" : ""}`;
    sent.dataset.ground = entry.ground;
    if (entry.absent.length) {
      sent.title = `States facts the material does not back: ${entry.absent.join("; ")}. You are trusting the model here. Click to search the material yourself.`;
      sent.onclick = () => groundHunt(entry.absent.join(" ") || entry.text);
    } else if (entry.ground === "model") {
      sent.title =
        "The model's own voice — no address stands behind this sentence. Click to search the material for ground.";
      sent.onclick = () => groundHunt(entry.text);
    }
    sent.append(...refNodes(matched, known));
    // THE GROUND, off the whole cube (P115): one chip per sentence naming
    // the highest rung that placed it and its addresses — or, at the bottom,
    // the model by name: a sentence nothing read places is the mouth's own
    // testimony, and a witness is cited by its name.
    // The ground context belongs to the turn that measured it. Citing a
    // previous turn's would name the wrong mouth as the sentence's own
    // testimony — measured 2026-09-06, an answer from another machine
    // captioned with the local model of the turn before it.
    if (state.lastGround && state.lastGround.turnSeq === turnSeq) {
      const wrow = (state.lastWitness ?? []).find((r) => r.sentence === entry.text) ?? null;
      // The sentence's own edges (classifySentences rides each relation claim
      // onto the sentence that carries its subject and verb) are the claims
      // the ladder reads — a claim knows its sentence only there.
      const own = (entry.edges ?? []).map((c) => ({ ...c, sentence: entry.text }));
      const g = groundOf(entry.text, { ...state.lastGround, claims: [...own, ...(state.lastGround.claims ?? []).filter((c) => c.sentence === entry.text)], witness: wrow });
      sent.dataset.groundTier = g.tier;
      const gc = document.createElement("button");
      gc.className = `ground-chip tier-${g.tier}`;
      gc.textContent = `◎ ${groundLine(g)}`;
      gc.title = `${g.detail}${g.addresses?.length ? ` — ${g.addresses.join(", ")}` : ""}. Press to search the material.`;
      gc.onclick = () => groundHunt(entry.text);
      sent.append(gc);
    }

    // Where this app attached the address itself, say so in the tag. A
    // citation the model wrote and one this app measured are different
    // kinds of claim, and drawing them identically would hide which is which.
    // Runs of same-address sentences carry ONE chip (showChip; undefined
    // means show, for callers that never set it).
    if (entry.ref && entry.showChip !== false) {
      const b = document.createElement("button");
      b.className = "ref attached";
      const label = refLabel(entry.ref);
      b.textContent = chipText(entry.ref);
      b.title = label
        ? `${entry.ref} — attached by this app against a measured null. Press to read the bytes.`
        : "Attached by this app against a measured null. Press to read the bytes.";
      b.onclick = () => reopen(entry.ref);
      sent.append(b);
    }

    // The relation tier's verdicts, in-line: a contradicted or unbound edge
    // gets a badge on the sentence that states it — the verdict must be
    // readable WITHOUT clicking anything (measured in the field: ~1% of
    // readers ever click a citation, so a flag that lives behind a click
    // does not exist). Bound edges stay quiet here — support is the normal
    // case, counted in the tally and detailed in the grounding disclosure.
    // The sentence witness (holon.js → witness-sentences.js) speaks first:
    // a sentence a passage STATES keeps no ∅ badge from the relation tier
    // (the paraphrase wall, answered); a sentence the witness was asked
    // about and REFUSED gets its own badge, whether or not the relation
    // tier ever extracted a claim from it.
    const wit = (state.lastWitness ?? []).find((r) => r.sentence === entry.text) ?? null;
    if (wit?.witness === "refused") {
      const badge = document.createElement("button");
      badge.className = "edge-badge unbound witness-refused";
      // Every ∅ cites its void (P106): when a gap the reader DECLARED is in
      // scope for this sentence, the mark names it — with its scope — so an
      // honest absence reads differently from the mouth's own "no mention".
      const gap = voidInScope(entry.text, voidsNow(), { question: state.lastAsked ?? "", sameForm: sameFormOrgan });
      if (gap) {
        badge.classList.add("cites-void");
        badge.textContent = `∅ open gap on the record: ${gap.subject} —${gap.verb}→ ?`;
        badge.title = `${gap.id} — declared by the reader over ${gap.scope?.sources?.length ?? "?"} source(s), ${gap.scope?.read ?? "?"} of ${gap.scope?.total ?? "?"} parts read; cancelled by the first arrival that fills it. Press to search the material.`;
      } else {
        badge.textContent = "∅ no passage states this";
        badge.title = `Asked the witness whether any retrieved passage states this sentence (${wit.why}); none was pointed at. Silence from the material, not a contradiction — and no declared gap is in scope for it. Press to search the material.`;
      }
      badge.onclick = () => groundHunt(entry.text);
      sent.append(badge);
    }
    // One verdict per sentence: once the witness has spoken (stated or
    // refused), the relation tier's own ∅ is redundant — measured live, a
    // sentence wore both "no passage states this" and "not in the
    // material", the same silence said twice. A contradiction still draws:
    // that is a different fact, and a stronger one.
    for (const c of (entry.edges ?? []).filter((c) => c.verdict === "contradicted" || (c.verdict === "unbound" && !wit))) {
      const badge = document.createElement("button");
      badge.className = `edge-badge ${c.verdict}`;
      // The badge names the exact words it means — a blanket "never says
      // this" on the sentence tars its backed halves too (measured live:
      // the model's gloss "significant battle" flagged a sentence whose
      // 70,000 stood perfectly on the material).
      const disputed = `${c.label} ${c.end2}`.trim();
      const disputedShort = disputed.length > 32 ? `${disputed.slice(0, 29)}…` : disputed;
      badge.textContent =
        c.verdict === "contradicted"
          ? `⇄ material says otherwise: “${disputedShort}”`
          : `∅ not in the material: “${disputedShort}”`;
      // The same key proofTargets dedupes on, so a finished web check can
      // find this badge and COMPOSE with it — "not in the material" and
      // "stated by 2 of 3 web pages" are one epistemic state, not two
      // verdicts that never meet (measured live: the web corroborated the
      // very assertion the badge was still flagging).
      badge.dataset.proofKey = [c.end1, c.label, c.end2]
        .flatMap((s) => String(s).split(/\s+/))
        .filter((w) => w.length > 2)
        .join(" ")
        .toLowerCase();
      // c.bound / c.nearest are hypergraph.js's own edgeFace() arrays, so
      // near carries the same neutral arrangement fields as c does.
      const near = c.verdict === "contradicted" ? c.bound?.[0] : c.nearest?.[0];
      badge.title =
        `${c.end1} —${c.label}${c.polarity === "-" ? " (negated)" : ""}→ ${c.end2}: ` +
        (c.verdict === "contradicted"
          ? `the material binds this edge with the OPPOSITE polarity.`
          : `every word is in the material, but the text never binds this edge.`) +
        (near ? ` It binds: ${near.end1} —${near.label}→ ${near.end2}. Press to read that passage.` : " Press to search the material.");
      badge.onclick = () => {
        const ref = near?.refs?.[0];
        if (ref) reopen(ref);
        else groundHunt(`${c.end1} ${c.label} ${c.end2}`);
      };
      sent.append(badge);
    }
    out.push(sent);
    rest = rest.slice(at + len);
  }

  if (rest) out.push(...refNodes(rest, known));
  return out;
}

/** A build's own words, for the router's definite-phrase check: its caption
 * and its current projected code — the same pairing widget.test.mjs's own
 * textOf() uses, so the two stay reading the same thing. */
function buildWords(entry) {
  const f = buildFold(entry, null);
  return `${f?.caption ?? ""}\n${f?.code ?? ""}`;
}

/** A chip pointing at an existing build — the same handle publishBuild's own
 * chip is, factored out so revise/rezero land the identical affordance a
 * brand-new build gets. */
function buildChip(entry, cap) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "build-chip";
  chip.innerHTML = `<span aria-hidden="true">▤</span> `;
  chip.append(document.createTextNode(cap));
  chip.onclick = () => {
    showView("builds");
    renderBuilds(entry.n);
    document
      .getElementById(`build-${entry.n}`)
      ?.scrollIntoView({ block: "start" });
  };
  autoRunAndDisclose(entry, chip);
  return chip;
}

/**
 * Auto-run a fold's just-landed code in the browser sandbox (term.js's
 * pyodide/js workers — network severed, P18), right after a chat turn
 * creates or revises it. A DIFFERENT door than the Folds panel's own ▶ run,
 * which is a REAL machine process via /api/run (P16) and stays manual —
 * this one never leaves the sandbox, so it runs without waiting for a
 * click. Fire-and-forget on purpose: pyodide's own boot cost (measured:
 * 10-20s) must never hold up the turn the chip already rendered for: this
 * patches the chip's own text with the outcome, plainly, when the sandbox
 * finishes — the audit trail a layperson reads is the chip itself, not a
 * log only a developer would open.
 */
function autoRunAndDisclose(entry, chip) {
  const fold = buildFold(entry, null);
  const lang = fold?.seg?.lang;
  if (!autoRunnable(lang)) return;
  const before = entry.log.entries.length;
  runSandboxed(lang, fold.code ?? "")
    .then((outcome) => {
      entry.log = buildLog.attachRun(entry.log, {
        params: { lang, timeoutMs: null, maxOutput: KEEP_PER_EXEC, sandboxed: true },
        outcome: { ok: outcome.code === 0 && !outcome.timedOut, data: outcome },
      });
      entry.cursor = null;
      mirrorBuild(entry, before);
      persistBuilds();
      renderBuilds(entry.n);
      if (chip?.isConnected) chip.append(document.createTextNode(` · ${autoRunSummary(outcome)}`));
    })
    .catch((e) => {
      if (chip?.isConnected) chip.append(document.createTextNode(` · ran automatically — could not start: ${e.message}`));
    });
}

/** The chip's own plain-language line — a layperson's whole audit trail,
 * so this names what happened rather than a status code. */
function autoRunSummary(outcome) {
  if (outcome.timedOut) return "ran automatically — took too long and was stopped";
  if (outcome.code !== 0) {
    const last = (outcome.stderr || "an error").trim().split("\n").filter(Boolean).pop() ?? "an error";
    return `ran automatically — failed: ${last.slice(0, 100)}`;
  }
  const out = (outcome.stdout || "").trim();
  return out ? `ran automatically — printed: ${out.slice(0, 100)}${out.length > 100 ? "…" : ""}` : "ran automatically — no output";
}

/**
 * Does this code segment open a new build, or land on one that already
 * exists? Decided by widget.js's routeSegment, from the operator's own
 * words and the standing builds' own bytes — never a guess and never left
 * to whether the model happened to restate itself in prose.
 *
 * A judgment ("I don't like the colors") re-zeros the target build: a new
 * ground on ITS log, never a new build. A later block of the SAME kind in
 * this turn (measured live: gemma2:2b answering one request with five html
 * fences) versions the one just landed. Only a turn whose words introduce
 * something new — or that names nothing existing at all — opens a build.
 *
 * Returns `{chip, entry}` — the conversation handle and the build the
 * landing produced, so the chat message's own artifact (renderAnswer) can
 * wire a run control to the SAME entry the Folds panel's own ▶ run acts
 * on, rather than a second notion of "which build is this." `entry` is
 * null when nothing landed (a refused witness): there is nothing to run
 * that the refusal chip does not already name as declined.
 */
function routeAndPublish(seg, task, instruction, landedThisTurn) {
  if (seg.type !== "code" && seg.type !== "table") {
    const chip = publishBuild(seg, undefined, instruction);
    return { chip, entry: state.builds[state.builds.length - 1] };
  }
  const known = state.builds.map((b) => ({ n: b.n, ...kindOf(b), text: buildWords(b) }));
  const route = widgetRouter.routeSegment(seg, task ?? "", known, { landedThisTurn });

  if (route.kind === "new") {
    const chip = publishBuild(seg, undefined, instruction);
    const made = state.builds[state.builds.length - 1];
    landedThisTurn.push({ n: made.n, type: seg.type, lang: seg.lang });
    return { chip, entry: made };
  }

  const entry = state.builds.find((b) => b.n === route.n);
  const landed = { ...seg, lang: route.lang && route.lang !== seg.lang ? route.lang : seg.lang };
  const before = entry.log.entries.length;

  // THE SAME GATE foldTurn HAS, on the path that had none (2026-08-18).
  // This landing takes the model's FULL code — it never passes through
  // applyOps, so until now it landed with zero checks of any kind: a
  // rezero here stamped whatever the model emitted as a fresh, valid
  // ground (the laundering the diagnosis named). The candidate is
  // witnessed BEFORE the branch decides rezero vs revise — both landings,
  // one reading — and judged against the log's last EVA, which foldBuild's
  // cross-ground entries array already carries across a re-zero.
  const candidateWitness = landed.type === "code" ? witnessCode(landed.lang, landed.code) : null;
  const prevWitness = entry.log.entries.filter((e) => e.operator === "EVA").at(-1)?.witness ?? null;
  if (candidateWitness && witnessRegressed(prevWitness, candidateWitness)) {
    entry.log = buildLog.refuseBuild(entry.log, {
      gap: {
        kind: "regressed",
        reason: "this change would introduce a defect the current version does not have",
        findings: candidateWitness.findings,
      },
      reason: "witness",
    });
    mirrorBuild(entry, before);
    persistBuilds();
    renderBuilds(entry.n);
    // The refusal NAMES what it saw — foldTurn's own lesson ("why does it
    // think it's adding defects?"). A plain chip, not buildChip: refused
    // code must not reach the auto-run door.
    const named = candidateWitness.findings
      .map((f) => (f.id ? `${f.kind} "${f.id}"` : `${f.kind} (${String(f.detail ?? "").slice(0, 60)})`))
      .join("; ");
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "build-chip";
    chip.append(document.createTextNode(`fold ${entry.n} · refused · the change would introduce: ${named} — the current version does not have this defect`));
    chip.onclick = () => {
      showView("builds");
      renderBuilds(entry.n);
      document.getElementById(`build-${entry.n}`)?.scrollIntoView({ block: "start" });
    };
    // No entry: the refused candidate never landed, so there is nothing this
    // turn's own artifact could run that the chip does not already say is
    // refused — a run button here would offer to execute code the log
    // itself just declined to keep.
    return { chip, entry: null };
  }

  entry.log =
    route.kind === "rezero"
      ? buildLog.rezeroBuild(entry.log, {
          code: landed.code,
          seg: landed,
          caption: defaultCaption(landed),
          trigger: route.trigger,
          tell: route.tell,
          matchedOn: route.matchedOn,
        })
      : buildLog.reviseBuild(entry.log, { code: landed.code, reason: "restated" });
  if (entry.log.entries.length > before) {
    entry.cursor = null;
    entry.draft = null;
    // The witness closes the loop here exactly as it does in foldTurn —
    // the landing's EVA is what gives the NEXT candidate a prev to be
    // judged against, on this path as on that one.
    if (candidateWitness && candidateWitness.ok !== null) {
      entry.log = buildLog.attachWitness(entry.log, { witness: candidateWitness });
    }
    mirrorBuild(entry, before);
  }
  persistBuilds();
  renderBuilds(entry.n);
  landedThisTurn.push({ n: entry.n, type: seg.type, lang: landed.lang });
  return { chip: buildChip(entry, buildFold(entry, null)?.caption ?? defaultCaption(landed)), entry };
}

/** A build's kind, for the router's same-kind matching — the projected
 * segment's own type and language, never a guess from the caption. */
function kindOf(entry) {
  const f = buildFold(entry, null);
  return { type: f?.seg?.type, lang: f?.seg?.lang };
}

/**
 * An artifact goes to the panel, and the message keeps a handle to it.
 *
 * A table wide enough to be worth drawing does not fit the column a
 * conversation is read in, and squeezing it there costs both — the table gets
 * a scrollbar and the conversation gets a wall. The panel is the width the
 * output wants; the chip is the sentence the conversation wants.
 */
function publishBuild(seg, caption, instruction = null, received = null) {
  const n = state.builds.length + 1;
  const turn = state.summary.turnCount + 1;
  const cap = caption ?? defaultCaption(seg);
  const entry = {
    n,
    turn,
    // The build IS its log — an append-only thread on the engine's task log
    // (build-log.js). Nothing here mutates: the working code, the last run,
    // the caption are all answers to "fold the entries", at whatever cursor
    // the reader has scrubbed to. `cursor: null` means live head.
    log: buildLog.proposeBuild({ n, turn, seg, caption: cap, instruction, received }),
    cursor: null,
    // Editor keystrokes not yet committed by a run. A draft is not an act —
    // it becomes a SUPERSEDE entry when it runs, not per keypress.
    draft: null,
  };
  // THE BIRTH IS WITNESSED (2026-08-18). Turn 1 was witnessRegressed's
  // structural blind spot: no EVA existed until the first revision, so
  // `prev` was null and the gate waved everything through — a build born
  // broken (measured: a SEG op deleting `<input id="what">` passed every
  // wall and left getElementById pointing at nothing) seeded a log whose
  // gate could never see the defect as NEW, because it was there from
  // entry one, unwitnessed. An EVA on the PROPOSE gives every later
  // landing a real `prev` without redefining regression: corruption can
  // now only ENTER at a landing where it is new — and is refused there —
  // while a defect the birth already carried stays visible (named on this
  // EVA, fed to every ask) but non-blocking, repair being the next
  // iteration's job by design.
  if (seg?.type === "code") {
    const w = witnessCode(seg.lang, seg.code);
    if (w.ok !== null) entry.log = buildLog.attachWitness(entry.log, { witness: w });
  }
  state.builds.push(entry);
  mirrorBuild(entry, 0);
  persistBuilds();
  renderBuilds(entry.n);
  // Wide, the panel is already on screen and switching it to the thing just
  // made costs nothing. Narrow, the panel IS the screen, and yanking someone
  // out of the conversation to show them a table they can reach with one tap
  // is the wrong trade — the chip is enough.
  if (!matchMedia("(max-width: 900px)").matches) showView("builds");

  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "build-chip";
  chip.innerHTML = `<span aria-hidden="true">▤</span> `;
  chip.append(document.createTextNode(cap));
  chip.onclick = () => {
    showView("builds");
    renderBuilds(entry.n);
    document
      .getElementById(`build-${entry.n}`)
      ?.scrollIntoView({ block: "start" });
  };
  autoRunAndDisclose(entry, chip);
  return chip;
}

function defaultCaption(seg) {
  return seg.type === "table"
    ? `table · ${seg.rows.length} row${seg.rows.length === 1 ? "" : "s"}`
    : seg.lang || "code";
}

/** Languages the fold server will actually run — the same map serve.mjs owns.
 * A code build without a runner here is shown, never run. */
const RUNNERS = new Set(["python", "javascript", "js", "node", "shell", "bash"]);

/** The projected build: the fold over the entry's log, at the reader's
 * cursor by default, at the live head with `at = null`. A database fold
 * (P25) carries no `entry.log` at all (its log is `entry.storeLog`, a
 * store.js log, folded by `databaseProjection` below, never by
 * build-log.js's foldBuild) — `null` here, not a throw, is what makes
 * every OTHER reader of `buildFold` (kindOf, buildWords, buildChip's own
 * autoRunAndDisclose) already safe on a database entry without each of
 * them needing its own guard: a null fold reads as "nothing to show",
 * which is exactly true from build-log.js's point of view. */
const buildFold = (entry, at = entry.cursor) => (entry.kind === "database" ? null : buildLog.foldBuild(entry.log, at ?? Infinity));
const buildCode = (entry) => buildFold(entry, null)?.code;
const buildRunnable = (entry) => {
  const seg = buildFold(entry, null)?.seg;
  return seg?.type === "code" && (RUNNERS.has(seg.lang) || RENDERABLE.has(seg.lang));
};

/** The run's declared caps — serve.mjs's own numbers, named here so the
 * result entry states what bounds it ran under. */
const RUN_PARAMS = (lang) => ({ lang, timeoutMs: 10_000, maxOutput: 64 * 1024 });

// ── the database fold (P25) ──────────────────────────────────────────────
//
// Wiring store.js's event-sourced row store into the terminal's REAL sql
// runtime (term-sql-worker.js) and chat's `/run sql` door, so a database
// populated either way is stored AS A FOLD: it appears in this panel,
// persists the same way code/table/html builds already do, and can be
// reopened later. The load-bearing invariant, the user's own words,
// verbatim, and already honored in store.js's own header: "the reality of
// the database should be the EOT event stream, the current state always
// projected." What is persisted is store.js's own task-log — a plain,
// JSON-serializable tree of entries — never a `db.export()` blob; what is
// DISPLAYED is `store.foldStore(entry.storeLog)`, recomputed fresh on every
// render call, never cached. This is Choreo's own "snapshot ingest
// generates operations" pattern one register over (store-sql.js's own
// header says so at the point the diffing actually happens); this section
// is only the landing: one shared fold, one place ops become log entries.
//
// SCOPE, decided and stated rather than silently assumed: this pass keeps
// exactly ONE database fold app-wide (the same "belongs to the instrument,
// not one conversation" reasoning `state.gridLog`/`state.builds` already
// state elsewhere) — the first row-level mutation from EITHER door lazily
// creates it, and every later mutation from either door lands on the same
// log. A "new database" affordance (multiple simultaneous database folds)
// is real, named future work, not attempted here — nothing in the task
// that motivated this pass asked for more than one.
//
// It is deliberately its own TOP-LEVEL `state.builds` entry kind
// (`entry.kind === "database"`) rather than routed through build-log.js's
// PROPOSE/SUPERSEDE-per-edit versioning chain: that model fits a code
// revision (one version at a time, edited by a person or a model), not a
// stream of many small granular row operations. What IS reused from
// build-log.js: nothing directly — a database fold's "version" display is
// simply `entry.storeLog.entries.length` ("N operations recorded"), read
// straight off the log the same way build-log.js's own `timeline` reads a
// code build's addenda count. What is reused from the REST of the Folds
// panel machinery: `state.builds` itself (one array, one numbering scheme,
// one persistence key), `renderBuilds`/`foldRow`'s search-and-sort
// pipeline (folds-pane.js never learns a database fold's shape — it only
// ever sees the same `{n, caption, lang, type, address, code, addenda}` row
// every other kind already produces), and `artifactNode`'s table renderer
// (factored into `tableWrap` below so there is exactly one table-drawing
// implementation, not two).

/** The one app-wide database fold, or null if no mutation has landed yet.
 * Lazily created — a `sql` session that only ever SELECTs never gets one. */
function findDatabaseFold() {
  return state.builds.find((b) => b.kind === "database") ?? null;
}

function createDatabaseFold() {
  const entry = {
    n: state.builds.length + 1,
    turn: state.summary.turnCount + 1,
    kind: "database",
    storeLog: store.createStoreLog(),
    // Unused by a database fold (no cursor scrubbing, no editor draft — the
    // Folds panel always shows the live projection), kept present so any
    // code that destructures `{n, turn, cursor, draft}` off `state.builds`
    // wholesale (persistBuilds' own map, github-pane.js's read-through)
    // sees the same shape it already expects rather than a hole.
    cursor: null,
    draft: null,
  };
  state.builds.push(entry);
  return entry;
}

/**
 * Land a batch of store-sql.js-derived ops onto the (lazily created)
 * database fold, persist, and re-render — the ONE place either sql runtime
 * (the interactive terminal, via `bridge.applyStoreOps`; chat's `/run sql`
 * door, via `runTurn`) turns a diffed batch into real store.js calls. A
 * single failing op (most likely: a column name colliding with store.js's
 * own reserved fields — `table`/`row`/`because`/`id`, or task-log's own
 * reserved entry keys like `operator`/`grain` — a real landmine for
 * ordinary SQL, where a column literally named "id" is common) is caught
 * and reported rather than left to crash the whole batch or the caller
 * that invoked it: whatever ops applied before the failure stay applied
 * (the live sql session's own db already has the full change regardless —
 * the store log's job is to describe it, and a partial description is more
 * honest than none), and the failure is returned so the caller can print
 * it plainly.
 */
function applyStoreOps(ops) {
  if (!ops?.length) return { applied: 0, failed: [] };
  const entry = findDatabaseFold() ?? createDatabaseFold();
  const failed = [];
  let applied = 0;
  for (const op of ops) {
    try {
      if (op.type === "insert") {
        entry.storeLog = store.insertRow(entry.storeLog, { table: op.table, rowId: op.rowId, columns: op.columns });
      } else if (op.type === "update") {
        entry.storeLog = store.updateRow(entry.storeLog, { table: op.table, rowId: op.rowId, columns: op.columns });
      } else if (op.type === "delete") {
        entry.storeLog = store.deleteRow(entry.storeLog, { table: op.table, rowId: op.rowId });
      } else {
        continue;
      }
      applied++;
    } catch (e) {
      failed.push({ op, reason: e.message });
    }
  }
  persistBuilds();
  renderBuilds(entry.n);
  return { applied, failed, n: entry.n };
}

/** The current projection, fresh — never cached, never read from a stored
 * blob. Called at render time only (foldRow, buildCard's database branch),
 * exactly the discipline store.js's own header requires of every caller. */
const databaseProjection = (entry) => store.foldStore(entry.storeLog);

/**
 * Mirror every entry appended since `fromLen` to the durable record
 * (record/build-record.jsonl, via serve.mjs — validated there through the
 * engine's own append). One batch per append-set, chained per build, so rows
 * land in the record in log order — an append-only record that could
 * interleave out of seq order would not be one. The in-page log is primary;
 * a mirror miss is reported to the console, never a crash.
 */
function mirrorBuild(entry, fromLen) {
  const batch = entry.log.entries.slice(fromLen);
  if (!batch.length) return;
  const conv = state.convos[state.active]?.id ?? null;
  const post = () =>
    fetch("/api/build-record", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conv, build: entry.n, entries: batch }),
    }).catch((err) => console.warn(`build record not reachable (is serve.mjs running?): ${err.message}`));
  entry.mirror = (entry.mirror ?? Promise.resolve()).then(post);
}

/** A download is a crossing — the fold leaving for the user's disk — and
 * crossings are recorded (the same posture Explore's record holds). */
function recordExport(entry, file, atSeq) {
  const conv = state.convos[state.active]?.id ?? null;
  fetch("/api/build-record", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ conv, build: entry.n, export: { name: file.name, atSeq } }),
  }).catch(() => {
    /* the download itself already succeeded; the record miss is the loss */
  });
}

/**
 * Commit the editor's draft: leaving the editor is an act, and an edit the
 * log never saw would be a second, hidden truth — the builds panel and the
 * download would show older bytes than the newest work. Keystrokes stay a
 * draft only while the editor is the live pane; identical code just clears
 * the draft (churn is refused one level down).
 */
function commitDraft(entry) {
  if (!entry || entry.draft == null) return;
  const draft = entry.draft;
  entry.draft = null;
  const before = entry.log.entries.length;
  entry.log = buildLog.reviseBuild(entry.log, { code: draft, reason: "edit" });
  if (entry.log.entries.length > before) {
    // EVERY landing path attaches a witness — measured gap (2026-08-17):
    // an editor commit landed with no EVA, so the regression gate's ground
    // stayed three landings behind the code it was defending, and a later
    // patch was judged against defects the operator had already fixed by
    // hand. The gate reads the last EVA; a write path that skips the
    // witness makes the ground drift under the gate's feet. The operator
    // is not exempt from the witness — the witness is not a judgment of
    // the operator, it is the ground's freshness.
    const now = buildFold(entry, null);
    const w = witnessCode(now?.seg?.lang, now?.code);
    if (w.ok !== null) entry.log = buildLog.attachWitness(entry.log, { witness: w });
    entry.cursor = null;
    mirrorBuild(entry, before);
    renderBuilds(entry.n);
  }
  persistBuilds();
}

async function runBuild(entry) {
  entry.running = true;
  renderBuilds(entry.n);
  // A run always runs the LIVE code — scrubbing the cursor is viewing, and
  // running snaps back to the head so the result attaches to what ran.
  const fold = buildFold(entry, null);
  const lang = fold.seg.lang;
  const before = entry.log.entries.length;
  let outcome;
  try {
    if (RENDERABLE.has(lang)) {
      outcome = { ok: true, data: { rendered: true } };
    } else {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lang, code: fold.code }),
      });
      const data = await res.json().catch(() => null);
      outcome = { ok: res.ok, data };
    }
  } catch (e) {
    outcome = { ok: false, error: e.message };
  } finally {
    entry.log = buildLog.attachRun(entry.log, { params: RUN_PARAMS(lang), outcome });
    entry.cursor = null;
    entry.running = false;
    mirrorBuild(entry, before);
    persistBuilds();
    renderBuilds(entry.n);
  }
}

// The Folds panel's rendering state: the search, the declared ordering, the
// face (cards or the compact list), and which list row stands opened. All of
// it is a view over the logs — nothing here changes an entry, and what the
// search hides is counted beside the pane's own heading (III.3: filtered-out
// is rendered, not merely removed).
let foldsQuery = "";
let foldsSort = "newest"; // the panel's declared default: recency
let foldsView = "cards";
let foldsOpen = null;

/** One fold, summarized off its own log for the search and the orderings —
 * derived at render time, never stored. A database fold produces the
 * IDENTICAL row shape folds-pane.js's filterFolds/sortFolds already read
 * (that module never learns a database fold exists) — `code` is left ""
 * (there is no single "code" for a fold whose whole point is many rows;
 * a reader searching finds it by caption/table name instead), `addenda` is
 * the store log's own entries.length ("N operations recorded" — the
 * display P25 calls for, read straight off the log), and `version` is left
 * undefined on purpose, guarded where it is printed (renderBuilds' list
 * face, below) rather than faked as a number that means nothing here. */
function foldRow(entry) {
  if (entry.kind === "database") {
    const projection = databaseProjection(entry);
    const tables = Object.keys(projection);
    const rows = tables.reduce((n, t) => n + projection[t].rows.length, 0);
    return {
      entry,
      n: entry.n,
      caption: `database · ${tables.length} table${tables.length === 1 ? "" : "s"} · ${rows} live row${rows === 1 ? "" : "s"}`,
      lang: "sql",
      type: "database",
      address: "",
      code: tables.join(" "), // searchable by table name, not by rows
      addenda: entry.storeLog.entries.length,
      version: undefined,
      lastRun: null,
    };
  }
  const live = buildFold(entry, null);
  if (!live) return null;
  const file = buildLog.exportAt(entry.log, entry.cursor, { toDocument });
  return {
    entry,
    n: entry.n,
    caption: live.caption ?? "",
    lang: live.seg?.lang ?? "",
    type: live.seg?.type ?? "",
    address: file?.name ?? "",
    code: live.code ?? "",
    addenda: entry.log.entries.length,
    version: live.version,
    lastRun: live.lastRun,
  };
}

/** Newest first — the thing just produced is the thing being looked at. */
function renderBuilds(highlight) {
  const list = $("builds-list");
  list.textContent = "";
  const all = state.builds.map(foldRow).filter(Boolean);
  const rows = sortFolds(filterFolds(all, foldsQuery), foldsSort);
  // The count says what the filter did, where it did it: "2 of 3" is the
  // exclusion counted at the same weight as the result.
  $("builds-count").textContent = all.length
    ? rows.length === all.length
      ? `${all.length}`
      : `${rows.length} of ${all.length}`
    : "";
  if (!all.length) {
    list.innerHTML = '<p class="empty">Nothing but prose so far.</p>';
    return;
  }
  if (!rows.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = `No fold matches “${foldsQuery}” — ${all.length} hidden by the search.`;
    list.append(p);
    return;
  }
  // The operation that asked for this render targeted one fold; on the list
  // face that fold opens, so the thing just acted on is the thing shown.
  if (highlight != null && foldsView === "list") foldsOpen = highlight;
  for (const r of rows) {
    if (foldsView === "list") {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "fold-row";
      row.setAttribute("aria-expanded", String(foldsOpen === r.n));
      const addr = document.createElement("span");
      addr.className = "addr";
      addr.textContent = `fold ${r.n}`;
      const cap = document.createElement("span");
      cap.className = "cap";
      cap.textContent = r.caption;
      const meta = document.createElement("span");
      meta.className = `meta${r.lastRun && r.lastRun.ok === false ? " bad" : ""}`;
      // A database fold has no single "version" (P25) — its own count IS
      // the addenda count, so the two would otherwise say the same number
      // twice under two different words.
      meta.textContent =
        r.type === "database"
          ? `${r.addenda} operation${r.addenda === 1 ? "" : "s"} recorded`
          : `v${r.version} · ${r.lang || r.type} · ${r.addenda} addend${r.addenda === 1 ? "um" : "a"}` +
            (r.lastRun ? (r.lastRun.ok === false ? " · run failed" : " · ran") : "");
      row.append(addr, cap, meta);
      row.onclick = () => {
        foldsOpen = foldsOpen === r.n ? null : r.n;
        renderBuilds();
      };
      list.append(row);
      if (foldsOpen === r.n) {
        const card = buildCard(r.entry, highlight);
        if (card) list.append(card);
      }
      continue;
    }
    const card = buildCard(r.entry, highlight);
    if (card) list.append(card);
  }
}

/**
 * A database fold's card (P25) — deliberately NOT buildCard: no cursor
 * scrubber (a database fold has no versioned "as of" cursor to scrub — the
 * store log's own entries ARE its history, always shown at the live head),
 * no edit/run/restore/download controls (none of build-log.js's machinery
 * applies to a store.js log), and no `entry.log` reads anywhere (a database
 * fold does not carry one). What it DOES share with buildCard: the same
 * address line shape, and — via `artifactNode`'s own "database" branch,
 * below — the exact `tableWrap` table renderer every other fold's table
 * segment already uses. This is the one user-facing proof of the core
 * invariant: a reader can see "N operations recorded, currently M live
 * rows" rather than an opaque blob.
 */
function databaseFoldCard(entry, highlight) {
  const projection = databaseProjection(entry);
  const opCount = entry.storeLog.entries.length;
  const wrap = document.createElement("div");
  wrap.id = `build-${entry.n}`;
  wrap.className = `build-entry${entry.n === highlight ? " current" : ""}`;
  const addrLine = document.createElement("p");
  addrLine.className = "build-addr";
  const addrB = document.createElement("b");
  addrB.textContent = `fold ${entry.n}`;
  addrLine.append(addrB);
  wrap.append(addrLine);
  const from = document.createElement("p");
  from.className = "build-from";
  from.textContent = `turn ${entry.turn} · database fold`;
  wrap.append(from);
  wrap.append(
    artifactNode(
      { type: "database", tables: projection, opCount },
      `database · ${opCount} operation${opCount === 1 ? "" : "s"} recorded`,
      null,
      {},
    ),
  );
  return wrap;
}

/** One fold's full card: address, controls, cursor, and the artifact — every
 * line of it a fold of the entry's log at the reader's cursor. */
function buildCard(entry, highlight) {
  if (entry.kind === "database") return databaseFoldCard(entry, highlight);
  // Everything drawn below is a FOLD of the entry's log — at the reader's
  // cursor. The live head is the default; a scrubbed cursor shows the
  // build as it stood at that point, downloadable there.
  const live = buildFold(entry, null);
  const shown = buildFold(entry) ?? live;
  if (!shown) return null;
  const seqMax = entry.log.nextSeq - 1;
  const atLive = entry.cursor == null || entry.cursor >= seqMax;

  const wrap = document.createElement("div");
  wrap.id = `build-${entry.n}`;
  wrap.className = `build-entry${entry.n === highlight ? " current" : ""}`;
  // Where this fold lives: its chat address (what /fold <n> targets) and
  // the file the ⬇ control would write at this cursor — the address IS the
  // download's name, so the two can never disagree.
  const addrLine = document.createElement("p");
  addrLine.className = "build-addr";
  const addrB = document.createElement("b");
  addrB.textContent = `fold ${entry.n}`;
  addrLine.append(addrB);
  const file = buildLog.exportAt(entry.log, entry.cursor, { toDocument });
  if (file) addrLine.append(document.createTextNode(` · ${file.name}`));
  wrap.append(addrLine);
  const from = document.createElement("p");
  from.className = "build-from";
  from.textContent = `turn ${entry.turn} · v${shown.version}`;
  wrap.append(from);
  if (shown.seg.type === "code" && atLive) {
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "build-run";
    edit.textContent = "✎ edit";
    edit.onclick = () => openBuild(entry);
    from.append(edit);
    if (buildRunnable(entry)) {
      const run = document.createElement("button");
      run.type = "button";
      run.className = "build-run";
      run.textContent = entry.running ? "running…" : "▶ run";
      run.onclick = () => runBuild(entry);
      from.append(run);
    }
  }
  // Scrubbed back to a version whose code differs from the head: offer to
  // restore it — a SUPERSEDE carrying the old bytes forward, never a
  // rewind. The log only ever grows.
  if (!atLive && shown.seg.type === "code" && live && shown.code !== live.code) {
    const restore = document.createElement("button");
    restore.type = "button";
    restore.className = "build-run";
    restore.textContent = "↩ restore";
    restore.title = `Bring v${shown.version}'s code forward as a new version — the log keeps everything between.`;
    restore.onclick = () => {
      const before = entry.log.entries.length;
      entry.log = buildLog.reviseBuild(entry.log, { code: shown.code, reason: "restore" });
      entry.cursor = null;
      mirrorBuild(entry, before);
      persistBuilds();
      renderBuilds(entry.n);
    };
    from.append(restore);
  }
  // Downloadable at any cursor: the file is the fold at this position,
  // named by its address (build-N@seq).
  const dl = document.createElement("button");
  dl.type = "button";
  dl.className = "build-run icon";
  dl.textContent = "⬇";
  dl.title = `Download this fold as of log position ${entry.cursor ?? seqMax}.`;
  dl.onclick = () => {
    const dlFile = buildLog.exportAt(entry.log, entry.cursor, { toDocument });
    if (!dlFile) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([dlFile.text], { type: dlFile.mime }));
    a.download = dlFile.name;
    a.click();
    URL.revokeObjectURL(a.href);
    recordExport(entry, dlFile, entry.cursor ?? seqMax);
  };
  from.append(dl);
  // The whole window for this artifact — a view, not a state change: the
  // dialog shows the same fold at the same cursor under the same consent.
  const wide = document.createElement("button");
  wide.type = "button";
  wide.className = "build-run icon";
  wide.textContent = "⛶";
  wide.title = "Open this fold full screen.";
  wide.onclick = () => openFoldViewer(entry);
  from.append(wide);

  // The cursor: one position per log entry, labelled mechanically from the
  // entry itself. Same semantics as the graph's reading cursor — scrubbing
  // shows the build AS OF that point; nothing is recomputed or invented.
  if (seqMax > 0) {
    const tl = buildLog.timeline(entry.log);
    const row = document.createElement("div");
    row.className = "build-cursor";
    const scrub = document.createElement("input");
    scrub.type = "range";
    scrub.min = "0";
    scrub.max = String(seqMax);
    scrub.step = "1";
    scrub.value = String(entry.cursor ?? seqMax);
    const label = document.createElement("span");
    label.className = "cursor-label";
    const labelAt = (s) => `${s}/${seqMax} · ${tl[s].label}${s < seqMax ? " · as of" : ""}`;
    label.textContent = labelAt(Number(scrub.value));
    scrub.setAttribute("aria-label", "log position");
    scrub.oninput = () => {
      label.textContent = labelAt(Number(scrub.value));
    };
    scrub.onchange = () => {
      const v = Number(scrub.value);
      entry.cursor = v >= seqMax ? null : v;
      renderBuilds(entry.n);
    };
    row.append(scrub, label);
    wrap.append(row);
  }

  wrap.append(
    artifactNode(shown.seg, shown.caption, shown.code, {
      // Consent at the SHOWN cursor: scrub the slider to a version from
      // before the run and the frame locks again — the projection of the
      // log at that point had no consent in it yet.
      scripts: !!shown.lastRun,
    }),
  );
  const lastRun = shown.lastRun;
  if (entry.running || lastRun) {
    const data = lastRun?.data ?? {};
    if (entry.running) {
      const out = document.createElement("pre");
      out.className = "run-console";
      out.textContent = "running…";
      wrap.append(out);
    } else if (!data.rendered) {
      const out = document.createElement("pre");
      out.className = "run-console";
      if (!lastRun.ok) {
        out.classList.add("bad");
        out.textContent = lastRun.error
          ? `could not reach the fold server (is serve.mjs running?): ${lastRun.error}`
          : `the fold server refused: ${lastRun.data?.error ?? ""}`;
      } else {
        const parts = [];
        if (data.stdout) parts.push(data.stdout.replace(/\n$/, ""));
        if (data.stderr) parts.push(data.stderr.replace(/\n$/, ""));
        if (!parts.length) parts.push(data.timedOut ? "(timed out — killed after 10s)" : "(no output)");
        out.textContent = parts.join("\n");
        out.classList.toggle("bad", !!data.stderr);
        out.title = `exit ${data.code} · ${data.durationMs}ms${data.timedOut ? " · timed out" : ""}`;
      }
      wrap.append(out);
    }
  }
  return wrap;
}

/**
 * The full-screen fold viewer: the same artifactNode the card draws, at the
 * same cursor, with the same run-consent — reused, not rebuilt, so the two
 * renderings can never disagree. Escape and the backdrop both close it (the
 * dialog-close list below).
 */
function openFoldViewer(entry) {
  const shown = buildFold(entry) ?? buildFold(entry, null);
  if (!shown) return;
  $("fold-view-title").textContent = `fold ${entry.n} · v${shown.version} · turn ${entry.turn}`;
  const file = buildLog.exportAt(entry.log, entry.cursor, { toDocument });
  $("fold-view-address").textContent = file?.name ?? "";
  const body = $("fold-view-body");
  body.textContent = "";
  body.append(artifactNode(shown.seg, shown.caption, shown.code, { scripts: !!shown.lastRun }));
  $("fold-view").showModal();
}

// ── the editor ──────────────────────────────────────────────────────────────
//
// A code build opened at working width. The gutter is line numbers over the
// same monospace grid as the textarea; scrolling one moves the other. Run
// sends the CURRENT text, so a build is worked on iteratively: edit, run,
// read the console, edit again. html/svg builds render live instead.

let editorBuild = null;

async function openBuild(entry) {
  // Switching builds while another's draft is uncommitted: that draft is
  // committed first — the same leaving-is-an-act rule showView enforces.
  if (editorBuild && editorBuild !== entry) commitDraft(editorBuild);
  editorBuild = entry;
  mirrorTermRecord("fold-open", { n: entry.n, via: "chat" }); // an open is a record event, so /reopen can carry it back
  await ensureEditor($("editor-host"));
  const fold = buildFold(entry, null);
  // An uncommitted draft survives leaving and re-entering the editor (and a
  // reload); the committed code is the fold's answer.
  editorSet(entry.draft ?? fold.code);
  editorLanguage(fold.seg.lang ?? "code");
  $("editor-title").textContent = `fold ${entry.n} · v${fold.version} · turn ${entry.turn}`;
  $("editor-lang").textContent = fold.seg.lang ?? "code";
  const renderable = RENDERABLE.has(fold.seg.lang);
  $("editor-run").textContent = renderable ? "▶ render" : "▶ run";
  $("editor-run").disabled = false;
  $("editor-preview").hidden = true;
  $("editor-preview").srcdoc = "";
  $("editor-console").hidden = true;
  $("editor-console").textContent = "";
  $("editor-console").classList.remove("bad");
  showView("editor");
  editorLayout();
  editorFocus();
}

async function runFromEditor() {
  if (!editorBuild) return;
  const code = editorGet();
  // Running commits the draft: if the code changed, a SUPERSEDE lands (the
  // prior version stays on the log); identical code appends nothing. The
  // run's outcome then attaches to the version that actually ran.
  const before = editorBuild.log.entries.length;
  editorBuild.log = buildLog.reviseBuild(editorBuild.log, { code, reason: "edit" });
  editorBuild.draft = null;
  editorBuild.cursor = null;
  const fold = buildFold(editorBuild, null);
  const lang = fold.seg.lang;
  const renderable = RENDERABLE.has(lang);
  const console = $("editor-console");
  const preview = $("editor-preview");
  $("editor-run").disabled = true;
  let outcome = null;
  try {
    if (renderable) {
      preview.srcdoc = toDocument({ ...fold.seg, code });
      preview.hidden = false;
      console.hidden = true;
      outcome = { ok: true, data: { rendered: true } };
    } else {
      preview.hidden = true;
      console.hidden = false;
      console.classList.remove("bad");
      console.textContent = "running…";
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lang, code }),
      });
      const data = await res.json().catch(() => null);
      outcome = { ok: res.ok, data };
      if (!outcome.ok) {
        console.classList.add("bad");
        console.textContent = `the fold server refused: ${data?.error ?? ""}`;
      } else {
        const parts = [];
        if (data.stdout) parts.push(data.stdout.replace(/\n$/, ""));
        if (data.stderr) parts.push(data.stderr.replace(/\n$/, ""));
        if (!parts.length) parts.push(data.timedOut ? "(timed out — killed after 10s)" : "(no output)");
        console.textContent = parts.join("\n");
        console.classList.toggle("bad", !!data.stderr);
        console.title = `exit ${data.code} · ${data.durationMs}ms`;
      }
    }
  } catch (e) {
    outcome = { ok: false, error: e.message };
    console.hidden = false;
    console.classList.add("bad");
    console.textContent = `could not reach the fold server (is serve.mjs running?): ${e.message}`;
  } finally {
    editorBuild.log = buildLog.attachRun(editorBuild.log, { params: RUN_PARAMS(lang), outcome });
    mirrorBuild(editorBuild, before);
    persistBuilds();
    $("editor-run").disabled = false;
    renderBuilds(editorBuild.n);
  }
}

function resetBuild() {
  if (!editorBuild) return;
  // Reset is not an erasure: it appends a SUPERSEDE carrying the original
  // code — every intermediate version stays on the log, reachable at its
  // cursor position.
  const fold = buildFold(editorBuild, null);
  const before = editorBuild.log.entries.length;
  editorBuild.log = buildLog.reviseBuild(editorBuild.log, { code: fold.seg.code, reason: "reset" });
  editorBuild.draft = null;
  editorBuild.cursor = null;
  editorSet(fold.seg.code);
  $("editor-console").hidden = true;
  $("editor-preview").hidden = true;
  $("editor-preview").srcdoc = "";
  mirrorBuild(editorBuild, before);
  persistBuilds();
  renderBuilds(editorBuild.n);
}

// The demo skill this repo already carries (skills-demo/…json — "demo
// only" per its own description), admitted into the browser-side library
// so the terminal's `skill` capacity (B.3) has something real to claim
// against. Inlined rather than fetched: one small, static object needs no
// boot-time network round trip, and its digest is computed for real
// (skillDigest, the exact identity skill-runner.mjs's own admission would
// compute), never hand-typed.
const GREET_VISITOR_SKILL = Object.freeze({
  name: "greet-visitor",
  description: "builds a one-line greeting for a named visitor — demo only",
  anchors: Object.freeze(["greet", "visitor", "demo"]),
  slots: Object.freeze([Object.freeze({ name: "visitorName", type: "string", required: true })]),
  needs: Object.freeze([]),
  body: "(slots) => `Hello, ${slots.visitorName}, thanks for trying the skills demo.`",
  check: "async (run, organs, assert) => { const out = await run({ visitorName: 'Test Visitor' }); assert(out.includes('Test Visitor'), 'greeting must include the name'); }",
});
// Runs the same shape/forbidden-token checks skill-runner.mjs's real
// admitSkill gate would (both pure, both exported from skills.js) —
// code review found the first version of this seed skipped the gate
// entirely and admitted unconditionally. What it still cannot do in the
// browser is admitSkill's THIRD check: compiling the body/check and
// running the check against the body in a real vm sandbox (Node-only,
// same disclosed boundary as capacity-runner.js's "execution_not_wired").
// Disclosed residue, not fixed here: this seed races `state.skillLog`
// against the very first `skill` capacity call — `skillDigest` awaits a
// real `crypto.subtle.digest`, a microtask that resolves long before a
// human could type into the terminal, but nothing STRUCTURALLY prevents
// an automated caller from winning that race.
const demoSkillDefects = [...checkSkillShape(GREET_VISITOR_SKILL), ...scanBody(GREET_VISITOR_SKILL.body), ...scanBody(GREET_VISITOR_SKILL.check)];
if (demoSkillDefects.length) {
  console.error("demo skill failed its own admission gate — not seeded", demoSkillDefects);
} else {
  skillDigest(GREET_VISITOR_SKILL).then((digest) => {
    state.skillLog = appendSkill(state.skillLog, {
      kind: SKILL_ENTRY_KINDS.ADMIT,
      name: GREET_VISITOR_SKILL.name,
      skill: GREET_VISITOR_SKILL,
      digest,
      provenance: { giver: "skills-demo/", note: "seeded at boot — demo only, no real admission pipeline exists yet" },
    });
  });
}

// ── the terminal ────────────────────────────────────────────────────────────
//
// Sandboxed (P18): every runtime the terminal offers lives in this page —
// term.js owns the wiring, the registry (fold commands, a severed JS
// worker, vendored pyodide and sql.js), the grammar, and the typed
// refusals. The PTY path is gone from serve.mjs entirely; nothing typed
// here reaches the machine. app.js only hands over the accessors the fold
// runtime reads — the same injection pattern cast.js set.

initTerminal({
  sources: () => state.sources,
  chunks: () => state.chunks,
  muted: () => state.muted,
  folds: () => state.builds,
  tokenize,
  // The terminal language (P22, grid.js): a single grid instance.
  // `capacities` is the plain registry array so the `capacities` fold
  // command needs no round trip through the grid instance for a simple
  // listing. `runCapacity` is the one capacity actually wired to execute
  // (`cast`, capacity-runner.js) — everything else in the registry stays
  // reference-only, and asking to run one is a typed gap the runner itself
  // returns, not a silent no-op. `gridLog`/`setGridLog` share the SAME
  // log the chat's own `/act` door reads and writes (state.gridLog,
  // app-wide) — the same accessor-pair shape as sources/chunks/muted/
  // folds above, so an act composed in either place is visible from the
  // other: type `/act …` in chat, then open the terminal and type `grid`.
  grid,
  capacities: listCapacities(),
  runCapacity,
  // The compose door (A.2, SPEC v2): a model distributes over the SAME act
  // space the grammar defines — never a second one. `completeJSON` is the
  // one crossing term.js needs to author an event: app.js's own
  // `complete(messages, { json })` already passes a JSON Schema through
  // Ollama's `format` parameter (grammar-constrained decoding, see its own
  // comment), so no new model-calling mechanism is built here — this is a
  // thin passthrough plus the same defensive `extractObject` every other
  // structured call in this file already reads its answer through.
  completeJSON: async (messages, schema) => extractObject(await complete(messages, { json: schema })),
  modelName: () => state.model,
  gridLog: () => state.gridLog,
  setGridLog: (log) => {
    state.gridLog = log;
    syncRecords();
  },
  // The database fold (P25): term.js diffs a mutating sql statement's real
  // effect (store-sql.js, over term-sql-worker.js's before/after
  // snapshots) into typed ops and hands them here — the ONE place they
  // become real store.js calls, exactly the same function chat's own
  // `/run sql` door calls (runTurn, below) after a throwaway `runSandboxed`
  // resolves. Composed at the terminal or via chat, a mutation lands on
  // the identical fold, the same "one shared log, two doors" shape
  // gridLog/setGridLog just above already established for the terminal
  // language.
  applyStoreOps,
});

// ── builds persist across reloads ───────────────────────────────────────────
// What persists is the LOG — the entries alone, replayed through the
// engine's own append on restore, so a stored row that violates the
// vocabulary fails loudly instead of loading as state (the same resumption
// property P3 pins for plans). The uncommitted editor draft rides alongside,
// so an iteration is not lost to a refresh; it is not an entry because it is
// not yet an act.
const BUILDS_KEY = "fold-builds";

function persistBuilds() {
  // The cube as a RUNTIME conformance wall (user direction: "leverage the
  // cube for automated conformance — no X before Y"): every persisted log
  // is walked by the engine's own referee, and a flag is a typed defect
  // said on the ledger and the console — never a silent save. This cannot
  // fire through build-log.js's own doors (each is pinned conformant), so
  // a flag here means a foreign writer or a corrupted store.
  for (const b of state.builds) {
    // A database fold's log is store.js's own (the SAME engine task-log
    // structure, a different domain) — checked directly against the
    // engine's referee rather than through buildLog.conform, which expects
    // build-log.js's own PROPOSE/SUPERSEDE vocabulary on `b.log`, a field a
    // database fold does not carry.
    const flags = b.kind === "database"
      ? (engineTaskLog.checkCubeProgression?.(b.storeLog) ?? [])
      : buildLog.conform(b.log);
    if (flags.length) {
      console.error(`fold ${b.n}: production order violated`, flags);
      logAct("errored", { where: "cube-conformance", fold: b.n, flags: flags.map((f) => `${f.kind}${f.from ? ` ${f.from}→${f.to}` : ""}`) });
    }
  }
  try {
    const conv = state.convos[state.active];
    const data = state.builds.map((b) =>
      b.kind === "database"
        ? { n: b.n, turn: b.turn, kind: "database", entries: b.storeLog.entries }
        : { n: b.n, turn: b.turn, entries: b.log.entries, draft: b.draft ?? null },
    );
    localStorage.setItem(BUILDS_KEY, JSON.stringify({ id: conv?.id, builds: data }));
  } catch (e) {
    // Not worth a crash, but never silent either: from here on a reload
    // would lose builds, and that has to be visible somewhere.
    console.warn(`builds not persisted (storage full or blocked): ${e.message}`);
  }
}

function restoreBuilds() {
  try {
    const raw = localStorage.getItem(BUILDS_KEY);
    if (!raw) return;
    const { builds } = JSON.parse(raw);
    if (!Array.isArray(builds)) return;
    for (const b of builds) {
      try {
        if (b.kind === "database") {
          // THE PROOF OF THE INVARIANT, at the one moment it actually
          // matters: what was saved is `entries` (an ordinary JSON array of
          // task-log entries), and what is rebuilt here is a live log
          // replayed through the engine's own `append` — never a stored
          // sql.js export read back in. A row that violates the
          // vocabulary throws and this ONE fold is skipped, the rest of
          // state.builds still loads (the same per-build isolation the
          // legacy-migration branch below already holds).
          let storeLog = engineTaskLog.createTaskLog();
          for (const e of b.entries ?? []) storeLog = engineTaskLog.append(storeLog, e);
          state.builds.push({ n: b.n, turn: b.turn ?? 0, kind: "database", storeLog, cursor: null, draft: null });
          continue;
        }
        // Pre-log builds ({seg, code, lastRun} — the mutable shape this
        // replaced) migrate to the honest floor: what was known becomes
        // entries; history that was never kept is not invented.
        const log = Array.isArray(b.entries)
          ? buildLog.replayEntries(b.entries)
          : buildLog.fromLegacy({
              n: b.n,
              turn: b.turn ?? 0,
              seg: b.seg,
              caption: b.caption ?? defaultCaption(b.seg),
              code: b.code,
              lastRun: b.lastRun,
            });
        state.builds.push({ n: b.n, turn: b.turn ?? 0, log, cursor: null, draft: b.draft ?? null });
      } catch {
        /* a row that violates the vocabulary does not load silently — this
           build is skipped, the rest are kept */
      }
    }
  } catch {
    /* corrupted storage — start clean */
  }
}

// ── the grounding inspector, and the door to the world ──────────────────────

/** One POST to the explore server's recorded egress (P13). The page carries
 * bytes; the server owns the network and the record. */
async function webApi(path, payload) {
  const res = await fetch(`${EXPLORE_BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`${path} answered ${res.status}`);
  return res.json();
}

/**
 * The link tier's fetch (links.js, holon.js's `checkLink` injection point):
 * does a URL the model cited actually resolve? Reuses the SAME recorded
 * fetch every other page read goes through (`/api/web/fetch` — the P13
 * egress, one page, never a crawl) rather than a second, unrecorded path —
 * a model-cited URL lands in web history exactly like any page the reader
 * asked to read, because from the record's point of view that is what
 * happened: the instrument decided to look. logAct records the attempt
 * regardless of the verdict, the same posture `seekProof` already takes.
 */
async function checkLinkCitation(url) {
  const f = await webApi("/api/web/fetch", { url });
  if (f.gap) {
    logAct("link-checked", { url, verdict: "unreachable", detail: f.gap.detail ?? f.gap.silence });
    return { gap: f.gap };
  }
  const ok = f.entry?.status >= 200 && f.entry.status < 300;
  const out = { ok, status: f.entry?.status, textChars: f.entry?.textChars ?? 0, title: f.entry?.title ?? null, challenge: !!f.entry?.challenge };
  logAct("link-checked", { url, verdict: !ok ? "unreachable" : out.challenge ? "challenge" : out.textChars > 0 ? "resolved" : "unreachable" });
  return out;
}

/**
 * The preflight's one crossing: search on the turn's own words (never the
 * model's — none has been drafted yet), read what comes back through the
 * same recorded fetch every other page read goes through, and hand back
 * ordinary retrievable chunks — the SAME chunkSource (source.js) every
 * attachment is chunked with, so what follows (retrieve, checkGrounding,
 * attribute, corroborateAtoms, resolveName, the relation tier) is the
 * existing ladder doing real work, not a second checking mechanism. Nothing
 * here is written to state.sources: no attachment pill appears, nothing
 * persists past this turn's `chunks:` array — the same turn-scoped posture
 * `faces` already has for pages read mid-turn proof-seeking. The raw pages
 * themselves are still durably saved server-side by the same P13 fetch
 * every read goes through (web/pages/, web/history.jsonl); a reader who
 * wants this specific page as a standing attachment still opens it from
 * web history, same as any other saved page.
 *
 * The read-back residue is CLOSED: every page chunked here also lands in
 * state.citedMaterial, so a citation into it re-opens for the life of the
 * conversation instead of reading "the address outlived it" for material
 * that is, in fact, real and was actually read. What remains withheld,
 * typed rather than broken: "open in Explore" on such a chip, since the
 * page was never deposited as a library source — reopen() hides that
 * door for archived material instead of offering a dead one.
 */
// `pagesConsulted` (flow #2, metacognition.js's escalationFor): how many of
// the search's results get their full page fetched. Defaults to the same
// declared constant the slice below always used, so every caller that
// passes nothing is byte-identical to before this parameter existed.
const LONGFORM_PAGES_CONSULTED = 8; // the leash for a piece's hunt (P9): the settling rule decides the spend, this is its ceiling
const LONGFORM_SECTION_PAGES = 2;   // the leash for one section's own hunt (P110)
async function gatherPreflightMaterial(task, discourse = "", onStep = null, { pagesConsulted = PREFLIGHT_PAGES_CONSULTED, query: queryOverride = null } = {}) {
  // The anaphor door is the engine's own received closed class (Amendment
  // IV register), injected here the same way widget.js takes it — never a
  // hand-typed intent list. A caller may hand the anchor verbatim (long-form:
  // the topic itself) when the builder would lose it.
  const query = queryOverride ?? preflightQuery(task, discourse, { anaphors: enginePriors.ANAPHORIC_PRONOUNS });
  if (!query) return { chunks: [], pages: [], gap: { silence: "not-present", detail: "nothing in the question to search on" } };
  // Mirrors seekProof's own onStep shape (proof-seeking's per-claim "prove
  // it" walk, further down this file) — same pattern, applied to the search
  // that runs BEFORE a draft exists instead of after one is flagged. A
  // caller that passes nothing gets exactly the old, silent behavior.
  onStep?.(`searching the web: “${query}”`);
  let search;
  try {
    search = await webApi("/api/web/search", { query });
  } catch (e) {
    return {
      chunks: [],
      pages: [],
      gap: { silence: "not-present", detail: `the local server that does the fetching didn't answer (${e.message})` },
    };
  }
  if (search.gap) return { chunks: [], pages: [], gap: search.gap };
  const picks = (search.results ?? []).slice(0, pagesConsulted);
  if (!picks.length) return { chunks: [], pages: [], gap: { silence: "not-present", detail: "the search ran but found no pages for these words" } };
  onStep?.(`${picks.length} result(s) for “${query}” — reading ${picks.map((r) => hostOf(r.url)).join(", ")}`);
  const chunks = [];
  const pages = [];
  // The search engine's own snippets are real, already-fetched material —
  // no extra egress, computed the moment /api/web/search ran — and they
  // were discarded here entirely: only `r.url` (to fetch the full page) and
  // `r.title` (a fallback label) were ever read off a result. Measured live
  // 2026-08-20 ("who was Abraham Lincoln's vice president?"): a full
  // fetched Wikipedia page runs 50-160K characters and carries
  // succession-box furniture that glued into garbage relations and
  // confused a small model's reading even after that was fixed, while
  // several of DuckDuckGo's own top snippets for this exact query state
  // both vice presidents in one clean sentence — the kind of pre-snipped,
  // high-relevance material this repo's own P4/P23 philosophy already asks
  // for, sitting unused.
  //
  // Tried first, and measured to fail live: one chunk PER result. All nine
  // real snippets for this query score identically on retrieve()'s raw
  // keyword-overlap (every one repeats "abraham"/"lincoln"/"vice"/
  // "president"), so which THREE of nine happened to fill the turn's
  // retrieval slots was an accident of DuckDuckGo's own result order and
  // retrieve()'s tie-break — one real draw won two Hamlin-only snippets and
  // a Johnson-only one, none of which alone states both names, even though
  // three of the nine DID (one flatly: "Learn about Hannibal Hamlin and
  // Andrew Johnson, the two men who served as vice presidents..."). Nine
  // near-identical-scoring candidates competing for three slots is a
  // coin flip on which FACTS survive, not a relevance signal.
  //
  // Fixed by combining every result's title+snippet into ONE chunk instead
  // of nine competing ones — the complete-picture snippet is no longer
  // racing partial ones for a scarce slot; whatever any single result
  // states, correct or not, arrives together, in one place, exactly the
  // way a person skimming a results page reads all of them, not just
  // whichever one a length-blind scorer happened to rank first. Still tiny
  // (a page of snippets, not a page of prose) and still honestly addressed
  // as search-result text, distinct from `web:<host>-i` full-page chunks —
  // a citation into one is never confused for the other. If this single
  // digest turns out wrong or too thin, the exact same grounding ladder
  // every other passage answers to still catches it; this adds one cheap,
  // clean, COMPLETE candidate, it does not remove the fuller pages.
  // Snippets only — a search result's TITLE is metadata, not prose, and
  // measured live 2026-08-20 folding it into the same text referent
  // discovery reads was its own real bug, not a fixed cost: web titles use
  // "Topic | Section | Site" and "Topic - Site" conventions that book prose
  // (this organ's original proving ground) essentially never does, and each
  // one glued adjacent names into a spurious combined surface
  // (extractSurfaces's own run-breaking punctuation set, fixed for `|` at
  // the source the same day — eoreader6.1's surfaces.js — but a title's OWN
  // separator vocabulary is open-ended by web convention: chasing every
  // site's own title-punctuation style one character at a time is the exact
  // "cannot be formatted to specific sites" trap this repo already refused
  // for succession-box parsing, now aimed at a different kind of furniture.
  // Dropping titles from the joined MATERIAL sidesteps the whole open class
  // at once rather than enumerating it — the snippets alone already carry
  // the facts this digest exists for.
  const digest = (search.results ?? [])
    .map((r) => r?.snippet?.trim())
    .filter(Boolean)
    .join("\n");
  if (digest) chunks.push(...chunkSource("web:search-results", digest));
  // The digest is turn-scoped and was never kept, so a copy-check after the
  // fact could not compare against it (measured 2026-09-05, the essay's
  // plagiarism check covered the three fetched pages and not the snippets).
  // It lands on the record beside the search it came from — bytes, not a
  // summary — so any later comparison has what the mouth was handed.
  if (digest) mirrorTermRecord("web-digest", { query, chars: digest.length, text: digest.slice(0, 6000) });
  // The hunt's own stopping rule (P72's third amendment, user direction:
  // "hunt until what we experienced would not be surprising to a degree
  // that is a distinction that makes a difference"). The meter is seeded
  // with what is ALREADY held before any page is fetched — the question,
  // the discourse line, the snippets digest — so the first page is
  // measured against a real ground. After each KEPT page, the arrival is
  // placed against the material's own continuation null: a page that
  // landed where noise alone would put it (aperture.js's own measured
  // cut) means the material has stopped moving belief, and the hunt stops
  // EARLY rather than spending the remaining fetches restating it. A page
  // that genuinely moved belief (censored above, or inside the surprising
  // half) keeps the hunt alive to the declared ceiling. The floor is
  // structural: the first kept page always lands before the rule can
  // speak, so a hunt never returns page-less because its own seed was
  // already rich. A gap (unreadable, empty, unplaceable) NEVER stops the
  // hunt — withheld is not "nothing moved".
  const hunt = huntMeter.create([task, discourse, digest]);
  let huntStop = null;
  for (const [i, r] of picks.entries()) {
    try {
      onStep?.(`reading ${hostOf(r.url)} (${i + 1} of ${picks.length})`);
      const f = await webApi("/api/web/fetch", { url: r.url });
      if (f.gap || !f.entry?.textPath) {
        onStep?.(`${hostOf(r.url)}: ${f.gap?.detail ?? "no readable text"}`);
        continue;
      }
      const url = f.entry.finalUrl ?? r.url;
      let faceRes;
      try {
        faceRes = await fetch(pageFaceUrl(EXPLORE_BASE, f.entry.textPath));
      } catch {
        faceRes = await fetch(pageFaceUrl(location.origin, f.entry.textPath));
      }
      if (!faceRes.ok) continue;
      const text = await faceRes.text();
      if (!text.trim()) continue;
      // Indexed, not just host-named: two picks from the same host (two
      // Wikipedia articles, say) must not chunk under one source name and
      // silently merge their addresses.
      const sourceName = `web:${hostOf(url)}-${i}`;
      // The fetch record's OWN retrieval date, carried onto the chunk so
      // `buildSourceBlock` can say "en.wikipedia.org, retrieved 2026-08-27"
      // instead of "MATERIAL". Read off `f.entry` (explore-server stamps it
      // at fetch time), never computed here — a date this app made up would
      // be exactly the fabricated provenance the naming exists to avoid, and
      // an absent one correctly prints no date at all.
      chunks.push(
        ...chunkSource(sourceName, text, {
          identity: { ...identifyMaterial(url, text), retrievedAt: f.entry.retrievedAt ?? null },
          // Same fix, same reason as addSource — a fetched page's cast
          // deserves the identical furniture wall a pasted one now gets.
          blankFurniture: (t) => blankLabelRows(t, { minRun: 4, maxCell: 60 }),
        }),
      );
      // Kept for audit, not for retrieval: any address cited into this page
      // must re-open for the life of the conversation, or a real mechanical
      // citation reads exactly like a fabricated one the moment the turn ends.
      state.citedMaterial[sourceName] = text;
      rememberPageFace(sourceName, url, f.entry);
      pages.push({ url, host: hostOf(url), title: f.entry.title ?? r.title ?? null, name: sourceName, ...(f.entry.via ? { via: f.entry.via.gateway } : {}) });
      onStep?.(`${hostOf(url)}: ${text.length.toLocaleString()} chars kept${f.entry.via ? ` — via ${f.entry.via.gateway} (direct fetch ${f.entry.via.why}; ${f.entry.via.sees})` : ""}`);
      const arrived = huntMeter.arrive(hunt, text);
      if (arrived.settled) {
        huntStop = "settled";
        onStep?.(
          `settled after ${pages.length} page(s) — the last one moved nothing the material's own noise wouldn't` +
            (i + 1 < picks.length ? `; ${picks.length - i - 1} fetch(es) not spent` : ""),
        );
        break;
      }
    } catch (e) {
      // One page failing to fetch is not the search failing — the other
      // picks still get their chance, the same posture seekProof takes.
      onStep?.(`${hostOf(r.url)}: could not read — ${e.message}`);
      continue;
    }
  }
  if (!huntStop && pages.length) huntStop = "ceiling";
  return {
    chunks,
    pages,
    // The hunt's own record, for the caller's ledger: how many pages were
    // actually read, against what ceiling, and WHY the reading stopped —
    // "settled" (the material converged and said so) or "ceiling" (belief
    // was still moving when the declared budget ran out; a longer leash —
    // escalation's own knob — is what would have let it continue).
    hunt: {
      pages: pages.length,
      ceiling: pagesConsulted,
      stop: huntStop,
      arrivals: hunt.arrivals
        .filter((a) => a.role === "page")
        .map(({ bits, rank, censored, settled, gap }) => ({ bits, rank, censored, settled, ...(gap ? { gap } : {}) })),
    },
    gap: chunks.length ? null : { silence: "not-present", detail: "pages were found but none had readable text" },
  };
}

/**
 * Take one flagged claim to the world: search on the claim's own words,
 * read the top pages through the recorded fetch, judge each saved text
 * face by the same containment rule the claim failed locally, and fold
 * the result into counted perspectives. Every step that fails arrives as
 * a typed gap; nothing is dropped.
 */
async function seekProof(target, faces = null, onStep = null) {
  const query = proofQuery(target);
  onStep?.(`searching: “${query}”`);
  // The turn's evidence pool first: every page ANY chip already read is a
  // perspective this claim gets for free — measured twice (Borodino's
  // "much debate", then 1906/M7.9 on a net-new domain): the proof of one
  // claim sat inside a sibling chip's already-fetched pages while the
  // claim's own narrower search missed it. Cached faces cost no egress;
  // fresh fetches below still add up to PROOF_PAGES_CONSULTED new reads.
  const pooled = [];
  if (faces) {
    for (const [url, f] of faces) {
      pooled.push({
        url,
        host: f.host,
        title: f.title ?? null,
        textPath: f.textPath,
        assessment: assessPage(target, f.text),
        snips: snipClaim(target, f.text).slice(0, 2),
      });
    }
  }
  let search;
  try {
    search = await webApi("/api/web/search", { query });
  } catch (e) {
    if (pooled.length) return foldProof(target, { query, pages: pooled });
    return foldProof(target, {
      query,
      gap: { silence: "not-present", detail: `the local server that does the fetching didn't answer (${e.message})` },
    });
  }
  if (search.gap) return foldProof(target, { query, pages: pooled, gap: pooled.length ? null : search.gap });
  // Read the most claim-relevant results, not the engine's raw top — a bare
  // figure's top hits can be about a different figure entirely (proof.js
  // rankResults carries the measured case).
  onStep?.(`searching: “${query}” · ${search.found ?? 0} result(s)${pooled.length ? ` · ${pooled.length} page(s) from this turn's pool` : ""}`);
  const picks = rankResults(target, search.results ?? [])
    .filter((r) => !faces?.has(r.url))
    .slice(0, PROOF_PAGES_CONSULTED);
  if (!picks.length && !pooled.length)
    return foldProof(target, { query, gap: { silence: "not-present", detail: "the search ran but found no pages for these words" } });
  const pages = [...pooled];
  for (const r of picks) {
    try {
      onStep?.(`reading ${hostOf(r.url)}…`);
      const f = await webApi("/api/web/fetch", { url: r.url });
      if (f.gap || !f.entry?.textPath) {
        pages.push({ url: r.url, gap: f.gap ?? { silence: "not-present", detail: "the page has no text face" } });
        continue;
      }
      const url = f.entry.finalUrl ?? r.url;
      // The saved face is content-addressed (sha-named), so any local
      // server serving that name serves those exact bytes — when the
      // explore server's static CORS blocks a cross-origin read (an older
      // running instance), the page's own origin serves the same file.
      let faceRes;
      try {
        faceRes = await fetch(pageFaceUrl(EXPLORE_BASE, f.entry.textPath));
      } catch {
        faceRes = await fetch(pageFaceUrl(location.origin, f.entry.textPath));
      }
      if (!faceRes.ok) {
        pages.push({ url: r.url, gap: { silence: "not-present", detail: `the saved text face answered ${faceRes.status}` } });
        continue;
      }
      const text = await faceRes.text();
      // Joins the turn's evidence pool: later claims consult it for free.
      faces?.set(url, { host: hostOf(url), title: f.entry.title ?? r.title ?? null, textPath: f.entry.textPath, text });
      pages.push({
        url,
        host: hostOf(url),
        title: f.entry.title ?? r.title ?? null,
        textPath: f.entry.textPath,
        ...(f.entry.challenge ? { challenge: true } : {}),
        assessment: assessPage(target, text),
        // The audit: the page's own sentence(s) stating the claim, verbatim
        // with offsets (primary.js's snip organ) — a verdict the reader can
        // read, not just count.
        snips: snipClaim(target, text).slice(0, 2),
      });
    } catch (e) {
      pages.push({ url: r.url, gap: { silence: "not-present", detail: e.message } });
    }
  }
  const out = foldProof(target, { query, pages });
  logAct("proofed", {
    claim: target.text,
    verdict: out.verdict,
    consulted: out.consulted,
    hosts: out.independence?.hosts ?? 0,
  });
  return out;
}

/**
 * The witness crossing (testimony.js owns the discipline; this owns the two
 * model calls): a reader over ONE fetched page's bytes, the page drawn from
 * the walk seekProof just did — first stating page, else first read page
 * whose text this turn already holds. No new egress: the witness reads
 * bytes a recorded fetch already landed, so it runs under the same standing
 * consent as the walk that fetched them (state.webProof gates the caller).
 * Two short constrained calls per claim — the real read and the
 * sibling-swapped arm — on the resident model; the arm is what makes the
 * testimony evidence rather than vibes (a verdict that survives swapping
 * the subject for the page's own sibling referent is about the vocabulary,
 * not the claim, and is refused as insensitive).
 */
async function witnessProof(target, out, faces, onStep = null) {
  try {
    const read = [...(out.stating ?? []), ...(out.read ?? [])];
    const page = read.find((p) => faces?.get(p.url)?.text);
    if (!page) return null;
    const face = faces.get(page.url);
    const sentence = target.sentence ?? target.text;
    const slice = witnessSlice(target, face.text);
    if (!slice) return { refused: "no-anchor", host: page.host, url: page.url };
    onStep?.(`a reader over ${page.host}…`);
    // temperature: 0 — a classification task ("does the passage say this is
    // true"), not a generative one; measured live 2026-08-19, the identical
    // prompt flipped its own yes/no answer run to run under default
    // sampling, which is not a defect this instrument's checking ladder
    // should tolerate on its own witness.
    const ask = async (s) =>
      readTestimony(await complete(buildWitnessMessages(s, slice), { json: WITNESS_SCHEMA, maxTokens: 200, temperature: 0 }));
    const real = await ask(sentence);
    // The swap is half the measurement, not an optional calibration: a
    // contradiction is only ever DERIVED from the page affirming the
    // sibling in the claim's own slot (foldTestimony), so it runs whenever
    // the first read landed and the page offers a sibling at all. The
    // witness's own `because` rides along as a hint (siblingSwap tries it
    // first) — measured live, it already named the right filler more often
    // than the independent slot-scoring heuristic did.
    const swap = real ? siblingSwap(sentence, slice, { hint: real.because }) : null;
    if (swap) onStep?.(`arming the reader: ${swap.from} ⇄ ${swap.to}…`);
    const arm = swap ? await ask(swap.swapped) : null;
    const t = foldTestimony({
      real,
      arm,
      armed: Boolean(swap),
      host: page.host,
      url: page.url,
      slice,
      claim: sentence,
      swapped: swap?.swapped ?? "",
    });
    logAct("witnessed", {
      claim: sentence,
      host: page.host,
      verdict: t.verdict ?? null,
      refused: t.refused ?? null,
      armed: t.armed ?? false,
    });
    return t;
  } catch (e) {
    // A witness that could not be reached is a typed gap on the audit,
    // never a silent absence and never a failed chip.
    return { refused: "unreachable", detail: e.message };
  }
}

/**
 * One fact-check chip: a quiet claim-sized summary that carries its whole
 * audit behind a click (user direction 2026-08-17: chips, not a wall — the
 * check's evidence is the page's own snipped sentence, auditable). The chip
 * shows the claim and, once checked, the count (✓ 3/3 · ∅ 0/3); opening it
 * shows the verdict sentence, each stating page's verbatim snip, and the
 * saved copy. Opening an unchecked chip runs the check — the click is the
 * authorization; autorun (the standing toggle) calls the same run.
 */
function proofCheckNode(labelText, title, target, { onVerdict = null, ledger = null, faces = null, panel = null } = {}) {
  // A button chip and ONE shared panel below the strip — opening an audit
  // must not reflow the chips or jump the page (user, 2026-08-17: clicking
  // jumped content around). The panel swaps which chip's detail it shows;
  // the chips never move.
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "proof-check";
  const status = document.createElement("span");
  status.className = "proof-status";
  chip.append(`${labelText} `, status);
  if (title) chip.title = title;
  const slot = document.createElement("span");
  slot.className = "proof-detail";
  const key = claimKey(target);
  let started = false;
  const run = async () => {
    if (started) return;
    started = true;
    status.textContent = "…";
    // The walk, live: what it's searching and which page it's on, written
    // into the slot as it happens — visible immediately when the panel is
    // open on this chip, and replaced by the full audit when done.
    const live = document.createElement("em");
    live.className = "proof-query";
    slot.textContent = "";
    slot.append(live);
    const out = await seekProof(target, faces, (step) => {
      live.textContent = step;
    });
    // The semantic witness (testimony.js, P32): a reader over the best
    // fetched page's own bytes, asked one question — states, contradicts,
    // or neither. Runs AFTER the byte walk (its pages are what the witness
    // reads) and BEFORE the render, so the audit ships composed. Measured
    // need (2026-08-19): "The New York Yankees won the 1960 World Series"
    // — false — drew ✓ 3/3 from string containment, because the loser's
    // name saturates every page about the series; a reader over the same
    // bytes answers "contradicts — the Pirates won" in one short call.
    const testimony = await witnessProof(target, out, faces, (step) => {
      live.textContent = step;
    });
    renderProofResult(slot, out);
    status.textContent =
      out.verdict === "web-corroborated"
        ? `✓ ${out.stating?.length ?? 0}/${out.consulted}`
        : out.verdict === "web-uncorroborated"
          ? `∅ 0/${out.consulted}`
          : "·";
    chip.classList.add(out.verdict);
    if (testimony?.verdict) {
      // Testimony outranks co-occurrence in what the chip SAYS, because a
      // reader binds subject to predicate and a counter cannot: a witnessed
      // contradiction re-labels a ✓ count that was testifying about
      // vocabulary. The counts stay visible in the audit — composition,
      // never erasure.
      const tLine = document.createElement("em");
      tLine.className = "fold-note";
      tLine.textContent =
        testimony.verdict === "contradicts"
          ? `⇄ a reader over ${testimony.host} says otherwise — “${testimony.because}”${testimony.armed ? "" : " · unarmed: no sibling to swap"}`
          : `a reader over ${testimony.host} confirms it — “${testimony.because}”${testimony.armed ? "" : " · unarmed: no sibling to swap"}`;
      slot.prepend(tLine);
      if (testimony.verdict === "contradicts") {
        status.textContent = `⇄ ${out.stating?.length ?? 0}/${out.consulted}`;
        chip.classList.add("witness-contradicted");
      }
    } else if (testimony?.refused && testimony.refused !== "no-testimony") {
      // A refusal is a result (P4): the audit says a reader was asked and
      // why its answer earned nothing — insensitive to the swap, pointing
      // at words the page never wrote, or unreadable.
      const rLine = document.createElement("em");
      rLine.className = "proof-query";
      rLine.textContent = `a reader over ${testimony.host ?? "the page"} was asked; testimony refused: ${testimony.refused}`;
      slot.append(rLine);
    }
    // The ledger is the one record; the chip's tooltip and the detail's
    // first line are projections of it — every tier's verdict composed.
    if (ledger) {
      ledger.note(target, "web", out);
      if (testimony) ledger.note(target, "witness", testimony);
      const line = composedSentence(ledger.state(key));
      if (line) {
        chip.title = line;
        const lp = document.createElement("em");
        lp.className = "fold-note";
        lp.textContent = line;
        slot.prepend(lp);
      }
    }
    onVerdict?.(out, testimony);
  };
  chip.addEventListener("click", () => {
    run();
    if (!panel) return;
    if (panel.dataset.for === key && !panel.hidden) {
      panel.hidden = true;
      chip.classList.remove("selected");
      return;
    }
    panel.textContent = "";
    panel.append(slot);
    panel.dataset.for = key;
    panel.hidden = false;
    for (const b of chip.closest(".grounding-strip")?.querySelectorAll(".proof-check.selected") ?? []) b.classList.remove("selected");
    chip.classList.add("selected");
  });
  return { det: chip, run };
}

/** Draw a proof verdict into its slot: the counted sentence, then one line
 * per stating page — the live address as a user-followed anchor, the saved
 * text face beside it (the bytes this verdict was actually judged on). */
function renderProofResult(slot, out) {
  slot.textContent = "";
  const line = document.createElement("span");
  line.className = `proof-verdict ${out.verdict}`;
  line.textContent = out.sentence;
  slot.append(line);
  // The crossing's own provenance (user, 2026-08-17: "I want to see what
  // it searched"): the exact query, verbatim — the reader can re-run it
  // themselves, which is what makes the verdict auditable rather than
  // merely counted.
  if (out.query) {
    const q = document.createElement("em");
    q.className = "proof-query";
    q.textContent = `searched: “${out.query}”`;
    slot.append(q);
  }
  // The whole walk: every page read, agreeing or not — the ∅ rows are as
  // much of the audit as the ✓ rows.
  const statingUrls = new Set((out.stating ?? []).map((p) => p.url));
  const silent = (out.read ?? []).filter((p) => !statingUrls.has(p.url));
  if (silent.length) {
    const also = document.createElement("em");
    also.className = "proof-query";
    also.textContent = `also read, not stating it: ${silent.map((p) => p.host).join(", ")}`;
    slot.append(also);
  }
  for (const p of out.stating ?? []) {
    const row = document.createElement("span");
    row.className = "proof-page";
    const a = document.createElement("a");
    a.href = p.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = p.host + (p.title ? ` — ${p.title}` : "");
    row.append(a);
    if (p.textPath) {
      const saved = document.createElement("a");
      saved.href = pageFaceUrl(EXPLORE_BASE, p.textPath);
      saved.target = "_blank";
      saved.rel = "noopener";
      saved.textContent = "saved copy";
      saved.title = "The saved text of this page — the exact words this verdict was judged on.";
      row.append(saved);
    }
    // The audit: the page's own sentence, verbatim. The relevance count
    // rides as a tooltip — legible on demand, never a wall.
    if (p.context) row.title = `this page shares ${p.context.shared} of the ${p.context.of} key words in the answer's sentence`;
    for (const s of p.snips ?? []) {
      const q = document.createElement("span");
      q.className = "snip";
      q.textContent = `“${s.text}”`;
      row.append(q);
    }
    slot.append(row);
  }
}

/**
 * The grounding CHECKS for a finished turn: the relation tier's verdicts,
 * the corroboration count for every checkable atom (support graded by
 * independent perspectives, never a bit), and — for what the material does
 * not back — the door to the world: proof-seeking per claim, automatic up
 * to the declared budget when the consent toggle is on.
 *
 * Used to draw all of this into the "thinking" disclosure as a fourth
 * affordance-sized panel; it no longer draws anything there (2026-08-28,
 * user direction: "vastly simplify the thinking affordance to just... the
 * full prompt history" — renderFold's own header carries the fuller
 * account). `box` below is a SCRATCH element, never attached to the page,
 * so every line under it keeps running exactly as before — the ledger
 * notes, the proof-seeking `run()` calls this function hands to the
 * automatic background walk at the bottom, and that walk's own `onVerdict`
 * callback (which updates the `.edge-badge` marks live in the ANSWER's own
 * prose, not in this panel) — with nothing left to append it to. This is
 * the same "hidden drawing, never a hidden finding" posture the build-turn
 * gate below already uses, generalized to the whole panel: the checks still
 * run and still land on the append-only record: only the drawing stopped.
 */
function renderGrounding(node, { answer, offered, findings = [], relations = [], quotes = [], quoteCorrections = [], question = "" }) {
  const box = document.createElement("div");
  // Fold membership (renderAnswer sets the class): this turn landed a code
  // build, so the prose being checked is the model's explanation of its own
  // artifact — content that belongs to the fold, not to the chat's claim
  // ledger. The chip strip and the automatic proof-seeking are withheld
  // from the chat surface (as they now are for every turn, drawing-wise —
  // see this function's own header); the record keeps every finding either
  // way.
  const buildTurn = node.classList.contains("build-turn");
  const parts = [];
  // The confirmations live ON the answer, not in the drawer (user,
  // 2026-08-17: "still not seeing it ground the statement" — every verdict
  // was landing inside the collapsed fold, so the chat read as a bare
  // answer while the checking happened out of sight). The strip holds the
  // per-claim checks and their live verdicts; the fold keeps the analytic
  // summaries. The strip's lines are assembled from the checks that
  // actually ran — never a style the model was asked to perform.
  const strip = document.createElement("div");
  strip.className = "grounding-strip";
  const stripAdd = (row) => strip.append(row);
  // One shared audit panel under the chips — see proofCheckNode.
  const panel = document.createElement("div");
  panel.className = "proof-panel";
  panel.hidden = true;
  // The turn's claim ledger (claims.js): one epistemic state per claim,
  // every tier noting into it, every surface a projection of it.
  const ledger = createClaimLedger();
  // The turn's evidence pool: every page any chip reads joins it, and
  // later chips consult it before spending a fresh crossing.
  const faces = new Map();

  // Quotations, followed to the bytes (quotes.js): what was verbatim, what
  // was corrected to the source's own bytes before rendering, what quoted
  // past the offer, and what was quoted from nothing. The correction rows
  // show the drift the reader never saw, because hiding the repair would
  // hide that the model drifted at all.
  const quoteList = quotes.flatMap((r) => r?.quotes ?? []);
  if (quoteList.length) {
    const n = (s) => quoteList.filter((q) => q.status === s).length;
    parts.push(
      section(
        `quotations · ${n("verbatim")} match the source word-for-word` +
          (quoteCorrections.length ? ` · ${quoteCorrections.length} corrected to the source's own words` : "") +
          (n("outside-offer") ? ` · ${n("outside-offer")} quote material this turn wasn't given` : "") +
          (n("unlocated") ? ` · ${n("unlocated")} found nowhere` : ""),
      ),
    );
    for (const c of quoteCorrections) {
      const row = document.createElement("p");
      row.className = "fold-note claim-row";
      row.textContent = `✎ “${c.from}” → “${c.to}” — corrected to what the source actually says`;
      if (c.anchor) {
        const b = document.createElement("button");
        b.className = "ref";
        b.textContent = c.anchor;
        b.title = `${c.anchor} — read the bytes this quotation was corrected to`;
        b.onclick = () => reopen(c.anchor);
        row.append(b);
      }
      parts.push(row);
    }
    for (const q of quoteList.filter((x) => x.status === "outside-offer" || x.status === "unlocated")) {
      const row = document.createElement("p");
      row.className = `fold-note claim-row${q.status === "unlocated" ? " bad" : ""}`;
      row.textContent =
        q.status === "unlocated"
          ? `✗ “${q.text}” — presented as a quote, but these words are nowhere in the material`
          : `… “${q.text}” — real words, but from material this turn wasn't given`;
      const anchor = q.segments?.find((s) => s.anchor)?.anchor;
      if (anchor) {
        const b = document.createElement("button");
        b.className = "ref attached";
        b.textContent = anchor;
        b.title = `${anchor} — where those words actually live`;
        b.onclick = () => reopen(anchor);
        row.append(b);
      }
      parts.push(row);
    }
  }

  // The relation tier's own state, disclosed either way: what it measured,
  // or that it could not run — an omitted tier must stay visible.
  const reports = relations.filter((r) => r?.examined);
  const claims = reports.flatMap((r) => r.claims ?? []);
  const measured = reports.filter((r) => !r.vocabulary?.gap);
  if (reports.length) {
    const edgeCount = new Set(measured.flatMap((r) => (r.edges ?? []).map((e) => `${e.end1}|${e.label}|${e.end2}`))).size;
    parts.push(
      section(
        measured.length
          ? `statements · the answer makes ${claims.length}, checked against ${edgeCount} the material makes`
          : `statements · ${reports[0].vocabulary.gap}`,
      ),
    );
  }
  const verdictOrder = { contradicted: 0, unbound: 1, bound: 2, unheard: 3, "beyond-reach": 4 };
  for (const c of [...claims].sort((a, b) => (verdictOrder[a.verdict] ?? 9) - (verdictOrder[b.verdict] ?? 9))) {
    const row = document.createElement("p");
    row.className = `fold-note claim-row ${c.verdict}${c.verdict === "contradicted" || c.verdict === "unbound" ? " bad" : ""}`;
    const mark = { bound: "✓", contradicted: "⇄", unbound: "∅", unheard: "…", "beyond-reach": "…" }[c.verdict] ?? "·";
    // The verdict leads in plain words; the parsed statement follows in
    // quotes, arrow kept — it shows exactly what was read as subject, verb,
    // and object, which is the honest disclosure when the parse is wrong.
    const plainVerdict = {
      bound: "the material says this too",
      contradicted: "the material says otherwise",
      unbound: "the material never says this",
      unheard: "couldn't check",
      "beyond-reach": "couldn't check",
    }[c.verdict] ?? c.verdict;
    const head = document.createElement("span");
    head.textContent = `${mark} ${plainVerdict}: “${c.end1} —${c.label}${c.polarity === "-" ? " (negated)" : ""}→ ${c.end2}”`;
    row.append(head);
    if (c.verdict === "bound") {
      const cor = document.createElement("em");
      cor.textContent = ` — in ${c.corroboration.passages} passage(s) across ${c.corroboration.sources} source(s)`;
      row.append(cor);
    }
    if (c.reason) {
      const why = document.createElement("em");
      why.textContent = ` — ${c.reason}`;
      row.append(why);
    }
    for (const ref of c.refs ?? []) {
      const b = document.createElement("button");
      b.className = "ref";
      b.textContent = chipText(ref);
      b.title = `${ref} — read the passage this verdict stands on`;
      b.onclick = () => reopen(ref);
      row.append(b);
    }
    const near = c.verdict === "contradicted" ? c.bound : c.nearest;
    for (const n of near ?? []) {
      const nb = document.createElement("button");
      nb.className = "ref attached";
      nb.textContent = `it says: ${n.end1} —${n.label}→ ${n.end2}`;
      nb.title = n.refs?.[0] ? `${n.refs[0]} — read what the material says instead` : "what the material says instead";
      if (n.refs?.[0]) nb.onclick = () => reopen(n.refs[0]);
      row.append(nb);
    }
    parts.push(row);
  }

  // Atom corroboration: support as counted perspectives. The summary line
  // carries the distribution; the strongest and the unsupported are named.
  const singleRuns = [];
  const cor = corroborateAtoms(answer, offered);
  if (cor.examined && cor.atoms.length) {
    const multi = cor.atoms.filter((a) => a.sources.length >= 2).length;
    const single = cor.atoms.filter((a) => a.refs.length >= 1 && a.sources.length < 2).length;
    const none = cor.atoms.filter((a) => !a.refs.length).length;
    parts.push(
      section(
        `names & figures · ${cor.atoms.length} checked against your material: ` +
          `${multi} backed by more than one source · ${single} by exactly one · ${none} by none` +
          (single
            ? ` — one source is one perspective${state.webProof && !buildTurn ? "; checking against the web automatically (bounded per turn)" : ""}`
            : ""),
      ),
    );
    // A multi-source atom gets no PROOF chip — nothing to check, it already
    // has a second perspective — but it must not therefore get NO mark at
    // all. Measured live 2026-08-19: a reader watching "Andrew Johnson"
    // (single-source, chip, then web-corroborated ✓3/3) sit right next to
    // "Hannibal Hamlin" (multi-source, silent) read the silence as "this one
    // was never checked" — exactly backwards, since multi-source is the
    // STRONGER state. This is the same failure shape checkGrounding's own
    // header already names for a different pair of facts ("examined is not
    // the same as clean... those are different facts that must not read
    // alike") — here, "cleared the bar so no chip needed" and "never
    // evaluated" were reading alike because only one of them drew anything.
    // A quiet, non-interactive mark (never a button — there is nothing to
    // click into, no audit panel, no web crossing) closes the gap without
    // manufacturing a false equivalence with the single-source door: no
    // web-corroborated/uncorroborated state exists for it, only the
    // material's own already-plural count.
    const seenMulti = new Set();
    for (const a of cor.atoms.filter((x) => x.sources.length >= 2)) {
      const tokens =
        a.kind === "number"
          ? [String(a.text).replace(/[,%]/g, "")]
          : a.text
              .split(/[\s-]+/)
              .map((w) => w.replace(/['’]s$/, ""))
              .filter((w) => w.length > 2 && !CLAIM_STOPWORDS.has(w.toLowerCase()));
      if (!tokens.length) continue;
      const key = tokens.join(" ").toLowerCase();
      if (seenMulti.has(key)) continue;
      seenMulti.add(key);
      const mark = document.createElement("span");
      mark.className = "proof-check settled";
      mark.textContent = `“${a.text}” ✓✓`;
      mark.title = `${a.kind === "number" ? "figure" : "name"} backed by ${a.sources.length} distinct sources in your material — already more than one perspective, no web check needed`;
      stripAdd(mark);
    }
    // The material is not ground truth — it is one perspective (user,
    // 2026-08-17: "we shouldn't trust just the pasted text"). Every atom the
    // material backs from a SINGLE source keeps its own door to a second
    // perspective: the same recorded web check the unbacked claims get.
    // With the standing web switch on these run on their own (the user's
    // direction: "it needs to validate it by search the web on its own"),
    // AFTER the unbacked claims, inside the same declared per-turn budget,
    // sequentially. The click remains for everything past the budget.
    const seenSingle = new Set();
    for (const a of cor.atoms.filter((x) => x.refs.length >= 1 && x.sources.length < 2)) {
      const tokens =
        a.kind === "number"
          ? [String(a.text).replace(/[,%]/g, "")]
          : a.text
              .split(/[\s-]+/)
              .map((w) => w.replace(/['’]s$/, ""))
              .filter((w) => w.length > 2 && !CLAIM_STOPWORDS.has(w.toLowerCase()));
      if (!tokens.length) continue;
      const key = tokens.join(" ").toLowerCase();
      if (seenSingle.has(key)) continue;
      seenSingle.add(key);
      // The claim travels with the question's own words, not just its
      // sentence: measured live, the casualties sentence never named the
      // battle (its "it" pointed a sentence back), so the query left
      // "Borodino" behind and the search read a page about a different
      // 70,000. The question is the conversation's own anchor.
      const target = {
        kind: a.kind,
        text: a.text,
        tokens,
        sentence: [a.sentence, question].filter(Boolean).join(" "),
        why: "single-source",
      };
      ledger.note(target, "corroboration", { refs: a.refs.length, sources: a.sources.length });
      const { det, run } = proofCheckNode(
        `“${a.text}”`,
        `${a.kind === "number" ? "figure" : "name"} backed by one source (${a.refs[0]}) — open to check the web`,
        target,
        { ledger, faces, panel },
      );
      stripAdd(det);
      singleRuns.push(run);
    }
  }

  // The door to the world, one row per flagged claim. A click is its own
  // authorization; the toggle (default off) authorizes the automatic pass,
  // bounded by PROOF_TARGETS_PER_TURN with the bound visible.
  const targets = proofTargets({ findings, relationReport: { claims } });
  if (targets.length) {
    // The disclosure says what will actually happen — on a build turn the
    // chips are withheld and no automatic crossing is spent, and a line
    // promising either would be a description of checks nobody will run.
    parts.push(
      section(
        `check online · ${targets.length} thing(s) your material doesn't back` +
          (buildTurn
            ? " · withheld: this turn built an artifact, and its ground is its run, not web corroboration of its own labels"
            : state.webProof
              ? ` · looking up the first ${Math.min(targets.length, PROOF_TARGETS_PER_TURN)} automatically`
              : " · the web switch is off — press “search the web” on a row to look one up anyway"),
      ),
    );
  }
  const autorun = [];
  targets.forEach((t, i) => {
    const kindWord = t.kind === "number" ? "figure" : t.kind === "edge" ? "statement" : "name";
    const whyWord = {
      unsupported: "not in your material",
      contradicted: "your material says otherwise",
      unbound: "your material never says this",
    }[t.why] ?? t.why;
    const short = t.text.length > 42 ? `${t.text.slice(0, 39)}…` : t.text;
    const key = claimKey(t);
    // Seed the material tier's standing — the why IS its verdict.
    ledger.note(t, "material", { verdict: t.why });
    const { det, run } = proofCheckNode(`“${short}”`, composedSentence(ledger.state(key)) || `${kindWord} — ${whyWord}; open to check the web`, t, {
      ledger,
      faces,
      panel,
      // Compose with the in-line badge for the same claim: the material's
      // verdict stays true, and the web's counted result rides beside it.
      // The badge is the ALWAYS-VISIBLE surface (the chip's fuller detail
      // needs a click — "~1% of readers ever click a citation," this
      // file's own measured line elsewhere) — so a witness contradiction
      // MUST override the byte count's phrasing here, not only inside the
      // chip. Measured live 2026-08-19: a reader who never clicked saw "web:
      // stated by 2 of 2 page(s)" on a claim the SAME two pages actually
      // refuted — technically true (co-occurrence) and actively misleading
      // (it reads as confirmation) once a witness has actually read them.
      onVerdict: (out, testimony) => {
        if (out.verdict !== "web-corroborated" && out.verdict !== "web-uncorroborated") return;
        for (const b of node.querySelectorAll(".edge-badge")) {
          if (b.dataset.proofKey !== key) continue;
          const webBit =
            testimony?.verdict === "contradicts"
              ? ` · a reader over ${testimony.host} says otherwise`
              : out.verdict === "web-corroborated"
                ? ` · web: stated by ${out.stating.length} of ${out.consulted} page(s)`
                : ` · web: 0 of ${out.consulted} page(s)`;
          b.textContent = b.textContent.replace(/ · (web:|a reader over).*$/, "") + webBit;
          b.classList.toggle("web-backed", out.verdict === "web-corroborated" && testimony?.verdict !== "contradicts");
          b.classList.toggle("witness-contradicted", testimony?.verdict === "contradicts");
          b.title +=
            testimony?.verdict === "contradicts"
              ? ` A reader over ${testimony.host} says otherwise: "${testimony.because}"`
              : ` Web check: ${out.sentence}.`;
        }
      },
    });
    det.classList.add("unbacked");
    stripAdd(det);
    if (state.webProof && i < PROOF_TARGETS_PER_TURN) autorun.push(run);
  });

  // Single-source checks fill whatever the per-turn budget has left after
  // the unbacked claims — the news outranks the audit, and one declared
  // bound covers all automatic seeking.
  if (state.webProof) {
    for (const run of singleRuns) {
      if (autorun.length >= PROOF_TARGETS_PER_TURN) break;
      autorun.push(run);
    }
  }
  box.append(...parts);
  // The chips live in the fold now, not above it. The 2026-08-17 direction
  // ("still not seeing it ground the statement") put verdicts on the
  // surface because the checking was invisible; the 2026-08-20 direction
  // ("THIS SHOULD FEEL LIKE CHATTING WITH CLAUDE") moves the METER back
  // into the disclosure now that the crown line (crownTestimony) grounds
  // the answer visibly in prose. Both directions hold: grounding stays on
  // the answer — as a sentence — and the instrument panel is one click
  // away. Never on a build turn: the chips would be web-check doors on the
  // model's own section labels.
  if (strip.childElementCount && !buildTurn) box.append(strip, panel);
  // Sequential, not parallel: the egress is one server doing recorded
  // crossings, and a turn must not fan out a burst of them. A build turn
  // spends none: corroborating "Event Listeners" against the web is a
  // crossing in service of nothing — the artifact's ground is its run.
  // Narrated globally while it runs (user direction 2026-08-19: "if it's
  // going to take a while, have it show that it's processing") — the answer
  // is already on screen by now and the turn's own ticker is gone, so the
  // chips filling in were the only sign anything was still happening, and
  // up to PROOF_TARGETS_PER_TURN sequential fetches is the turn's longest
  // quiet stretch. The status line is work-in-flight semantics (it never
  // auto-clears), so it holds until the walk ends and then hands back.
  if (autorun.length && !buildTurn)
    (async () => {
      for (const [i, run] of autorun.entries()) {
        $("status").textContent = `checking claims online · ${i + 1}/${autorun.length}`;
        await run();
      }
      $("status").textContent = readyLine();
    })();
}

/**
 * One renderer for both kinds of artifact — the ones read out of an answer and
 * the ones this app builds from its own rows. A table assembled mechanically
 * and a table the model happened to write arrive here in the same shape, and
 * there is no reason for them to look different.
 */
/**
 * A code <pre>, syntax-highlighted in place by monaco's own tokenizer
 * (editor.js's colorizeCode — the SAME highlighting the build editor
 * already uses, never a second library) once it resolves. Plain text is
 * the honest floor shown immediately: colorizing is async and this
 * function is not, and a repo opened off the disk or mid-boot still gets
 * readable, correctly-escaped code rather than nothing. One call site for
 * "what a code block looks like," so the two artifactNode branches below
 * never drift into two different renderings of the same thing.
 */
function codeBlock(text, lang) {
  const pre = document.createElement("pre");
  pre.className = "code-highlight";
  pre.textContent = text;
  colorizeCode(text, lang).then((html) => {
    if (html) pre.innerHTML = html;
  });
  return pre;
}

/** One `<table>`, wrapped for horizontal scroll — factored out of
 * artifactNode's own `seg.type === "table"` branch so a database fold
 * (P25), which may need to draw several tables in one card, reuses the
 * EXACT SAME renderer rather than a second one built for it. `head` is an
 * array of column labels, `rows` an array of arrays of already-stringified
 * cells — the identical shape parseSegments' own table segments carry. */
function tableWrap(head, rows) {
  const table = document.createElement("table");
  const thead = table.createTHead().insertRow();
  for (const h of head) {
    const th = document.createElement("th");
    th.textContent = h;
    thead.append(th);
  }
  const tbody = table.createTBody();
  for (const row of rows) {
    const tr = tbody.insertRow();
    for (const cell of row) tr.insertCell().textContent = cell;
  }
  const wrap = document.createElement("div");
  wrap.className = "table-wrap";
  wrap.append(table);
  return wrap;
}

function artifactNode(seg, caption, code, { scripts = false, entry = null } = {}) {
  const art = document.createElement("figure");
  art.className = "artifact";
  const cap = document.createElement("figcaption");
  const capLabel = document.createElement("span");
  capLabel.textContent =
    caption ??
    (seg.type === "table"
      ? `table · ${seg.rows.length} row${seg.rows.length === 1 ? "" : "s"}`
      : seg.type === "database"
        ? `database · ${seg.opCount} operation${seg.opCount === 1 ? "" : "s"} recorded`
        : seg.lang || "code");
  cap.append(capLabel);
  art.append(cap);

  if (seg.type === "table") {
    art.append(tableWrap(seg.head, seg.rows));
  } else if (seg.type === "database") {
    // The ONE user-facing proof of store.js's core invariant (P25): a
    // reader can tell this is a live projection replayed from a log, not a
    // saved snapshot. `seg.tables` is store.foldStore's own output,
    // computed fresh by the caller (databaseFoldCard) on every render —
    // never cached here or anywhere upstream of it.
    const tableNames = Object.keys(seg.tables);
    const liveRows = tableNames.reduce((n, t) => n + seg.tables[t].rows.length, 0);
    const note = document.createElement("p");
    note.className = "build-from";
    note.textContent =
      `${seg.opCount} operation${seg.opCount === 1 ? "" : "s"} recorded — currently ${liveRows} live row${liveRows === 1 ? "" : "s"}` +
      ` across ${tableNames.length} table${tableNames.length === 1 ? "" : "s"} · this is a projection, replayed from the log fresh on every render, never a saved snapshot`;
    art.append(note);
    if (!tableNames.length) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "no live rows yet";
      art.append(empty);
    }
    for (const t of tableNames) {
      const { columns, rows } = seg.tables[t];
      const label = document.createElement("p");
      label.className = "build-from";
      label.textContent = `${t} · ${rows.length} row${rows.length === 1 ? "" : "s"}`;
      art.append(label);
      const head = ["id", ...columns];
      const displayRows = rows.map((r) => head.map((c) => (r[c] === undefined || r[c] === null ? "" : String(r[c]))));
      art.append(tableWrap(head, displayRows));
    }
  } else if (RENDERABLE.has(seg.lang)) {
    const frame = document.createElement("iframe");
    // Scripts are CONSENT, and consent is a log entry: a build's frame gains
    // allow-scripts only when the version shown carries a run result — the
    // operator pressed run, and that press is on the record. Until then the
    // page renders inert (markup and styles, no execution). Same-origin is
    // never granted either way, and toDocument's injected CSP keeps even a
    // script-enabled page off the network — the consent buys compute, not
    // reach. Model output is content until the operator agrees it is code.
    frame.sandbox = scripts ? "allow-scripts" : "";
    if (!scripts && seg.lang === "html")
      frame.title = "Rendered without scripts — press run to let this page execute";
    frame.srcdoc = toDocument({ ...seg, code: code ?? seg.code });
    frame.loading = "lazy";
    // The chat feed's own door onto the SAME consent the Folds panel's ▶
    // run earns — runBuild, unchanged, so there is no second execution
    // path for the identical question "has this been run." entry is only
    // ever passed from the chat-rendering call site (renderAnswer); the
    // Folds panel builds this button itself, right next to its own copy of
    // this artifact, so this never doubles up there.
    if (entry) {
      const run = document.createElement("button");
      run.type = "button";
      run.className = "build-run";
      run.textContent = scripts ? "✓ ran" : "▶ run";
      run.disabled = !!entry.running;
      run.onclick = async () => {
        run.disabled = true;
        run.textContent = "running…";
        await runBuild(entry);
        const ranScripts = !!buildFold(entry, null)?.lastRun;
        frame.sandbox = ranScripts ? "allow-scripts" : "";
        frame.title = ranScripts ? "" : "Rendered without scripts — press run to let this page execute";
        // sandbox alone does not retroactively apply to already-loaded
        // content — the frame has to reload for the new flags to take
        // effect, so the exact same document is handed to it again.
        frame.srcdoc = toDocument({ ...seg, code: code ?? seg.code });
        run.textContent = ranScripts ? "✓ ran" : "▶ run";
        run.disabled = false;
      };
      cap.append(run);
    }
    art.append(frame);
    const src = document.createElement("details");
    src.innerHTML = "<summary>source</summary>";
    src.append(codeBlock(code ?? seg.code, seg.lang));
    art.append(src);
  } else {
    art.append(codeBlock(code ?? seg.code, seg.lang));
  }
  return art;
}

/**
 * The whole "thinking" disclosure for one turn, under that turn.
 *
 * Vastly simplified (user direction, 2026-08-28): this used to carry the
 * turn's live narration, the model's own deliberation, the running summary's
 * bookkeeping, the append-only record, a run log, a void declaration, and a
 * nine-cell verification breakdown — eight things stacked under one word.
 * None of that stopped running or landing on the record (FOLD-CONSTITUTION
 * I.5); it stopped being DRAWN here, because the one question this box exists
 * to answer is simpler than all of it: what did the model actually see this
 * turn? `sent` is every messages array this turn actually sent to a model,
 * captured verbatim at the call boundary — this is the whole of it now.
 */
function renderFold(node, { sent, record = null } = {}) {
  // Scoped to the turn-meta: the body can contain anything an answer wants,
  // including things that happen to share a class name, and the fold box must
  // not be findable through it.
  const box = node.querySelector(".turn-meta > .fold");
  if (!box) return;
  // What this turn actually cost, in the runtime's own tokens — beside the
  // disclosure, not inside it, because it is the one number worth seeing
  // without opening anything. Checking is what makes a turn expensive (a
  // plan, a call per part, the corrections), so the count is shown in the
  // mode that incurs it.
  const meta = node.querySelector(".turn-meta");
  meta.querySelector(".turn-tokens")?.remove();
  if (state.grounded) {
    const din = tokensSeen.in - Number(node.dataset.tokIn ?? 0);
    const dout = tokensSeen.out - Number(node.dataset.tokOut ?? 0);
    const calls = tokensSeen.calls - Number(node.dataset.tokCalls ?? 0);
    if (din + dout > 0) {
      const t = document.createElement("span");
      t.className = "turn-tokens";
      t.textContent = `${(din + dout).toLocaleString()} tokens`;
      t.title = `${din.toLocaleString()} in · ${dout.toLocaleString()} out, over ${calls} model call(s) — measured from the runtime's own telemetry, not estimated`;
      meta.append(t);
    }
  }
  // What spoke for this turn: every call's model and the machine it ran on,
  // beside the token count, so an answer never hides which mouth made it.
  meta.querySelector(".turn-mouths")?.remove();
  const spoke = mouthsLine(Number(node.dataset.turnSeq ?? -1));
  if (spoke) {
    const m = document.createElement("span");
    m.className = "turn-mouths";
    m.textContent = spoke;
    m.title = "which model answered each call of this turn, and on whose machine — measured at the call, not inferred";
    meta.append(m);
  }
  const out = box.querySelector("p");
  out.textContent = "";

  // The AnswerRecord first (P100): the claims before the prose, verbatim.
  if (record) {
    const pre = document.createElement("pre");
    pre.className = "block";
    const role = document.createElement("span");
    role.className = "role";
    role.textContent = answerRecordLine(record);
    pre.append(role, document.createTextNode("\n" + JSON.stringify(record, null, 2)));
    out.append(pre);
  }

  if (!sent?.length) {
    // Honest absence, not a blank box: a turn can genuinely spend no model
    // call (arithmetic, a chart, a public-record lookup, /run's sandbox) —
    // stating that plainly beats a disclosure that opens onto nothing.
    const p = document.createElement("p");
    p.className = "fold-note";
    p.textContent = "no model call this turn — answered mechanically, so there is no prompt to show.";
    out.append(p);
    return;
  }

  // Rendered as raw JSON.stringify, not this app's own pretty-printed
  // role/content style, because "verbatim" is the whole point — a reader
  // asking to see the actual wire payload should see exactly that, not a
  // second-hand restatement of it.
  for (const call of sent) {
    const pre = document.createElement("pre");
    pre.className = "block";
    const role = document.createElement("span");
    role.className = "role";
    role.textContent = `call ${call.n} · ${call.messages.length} message(s)`;
    pre.append(role, document.createTextNode("\n" + JSON.stringify(call.messages, null, 2)));
    out.append(pre);
  }
}

function section(text) {
  const h = document.createElement("p");
  h.className = "fold-section";
  h.textContent = text;
  return h;
}

/** Context shown on each side of the cited span. A bounded window, with the
 * withheld counts NAMED — a dialog rendering a 3 MB novel whole would jank,
 * and a silent truncation would claim completeness it doesn't have. */
const REOPEN_CONTEXT_CHARS = 1500;

function reopen(ref) {
  // The structural name carries the heading; the byte address stays
  // visible underneath — the one place both belong together, since this
  // dialog exists to show exactly which bytes back a claim.
  const label = refLabel(ref);
  $("reopen-ref").textContent = label ?? ref;
  $("reopen-address").textContent = label
    ? `${ref} — read back from the material, live`
    : "read back from the material, live — the cited span, inside its source";
  // A prior's papers ride the re-open: the publisher's own frontmatter,
  // under the address — so the dialog answers "says who?" as well as
  // "which bytes?". Set on both paths (found and outlived): the papers
  // belong to the source, not to whether its text is still loaded.
  const papers = $("reopen-papers");
  if (papers) {
    const prov = state.provenance[String(ref).split("#")[0]];
    papers.hidden = !prov;
    papers.textContent = "";
    if (prov) {
      papers.append(`papers: ${prov.line}`);
      if (prov.fields?.url) {
        papers.append(" ");
        const a = document.createElement("a");
        a.href = prov.fields.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = "↗";
        a.title = "the publisher's official copy — opens in your own browser, leaves this instrument";
        papers.append(a);
      }
    }
  }
  const pre = $("reopen-body");
  pre.textContent = "";
  // A self ref re-opens from the ledger, rebuilt from the entries alone —
  // the same act of reading bytes back, on the other plane. Explore has no
  // deposit for it: the ledger is this conversation's, not a file's.
  // Turn-scoped material the instrument cited (preflight pages) re-opens
  // from the citation archive when it is no longer loaded as a source —
  // the bytes the citation was actually judged on, kept exactly so this
  // dialog never has to say "outlived" about an address the instrument
  // itself shipped.
  const fromSources = isSelfRef(ref) ? null : refContext(state.sources, ref);
  const archived = !isSelfRef(ref) && !fromSources ? refContext(state.citedMaterial, ref) : null;
  const ctx = isSelfRef(ref) ? selfRefContext(state.reflexLog, ref) : (fromSources ?? archived);
  if (archived) {
    $("reopen-address").textContent +=
      " — turn-scoped page kept for audit; cited this conversation, never attached";
  }
  if (!ctx) {
    pre.textContent = isSelfRef(ref)
      ? "That address does not resolve on this conversation's ledger."
      : "That material is no longer loaded — the address outlived it.";
    $("reopen-explore").hidden = true;
    $("reopen").showModal();
    return;
  }

  // The cited span inside its source: before / mark / after, windowed.
  const beforeCut = Math.max(0, ctx.before.length - REOPEN_CONTEXT_CHARS);
  const afterKeep = Math.min(ctx.after.length, REOPEN_CONTEXT_CHARS);
  if (beforeCut) {
    const note = document.createElement("span");
    note.className = "muted";
    note.textContent = `… ${beforeCut.toLocaleString()} chars above …\n`;
    pre.append(note);
  }
  pre.append(document.createTextNode(ctx.before.slice(beforeCut)));
  const mark = document.createElement("mark");
  mark.textContent = ctx.cited;
  pre.append(mark);
  pre.append(document.createTextNode(ctx.after.slice(0, afterKeep)));
  if (afterKeep < ctx.after.length) {
    const note = document.createElement("span");
    note.className = "muted";
    note.textContent = `\n… ${(ctx.after.length - afterKeep).toLocaleString()} chars below …`;
    pre.append(note);
  }

  const explore = $("reopen-explore");
  // Archived turn-scoped material has no Explore deposit — the button would
  // be a dead door, so it is withheld, a typed absence rather than a caught
  // failure.
  explore.hidden = isSelfRef(ref) || !!archived;
  explore.onclick = () =>
    openInExplore(state.sources, ref).catch((err) => {
      $("status").textContent = `explore: ${err.message || err}`;
    });

  $("reopen").showModal();
  mark.scrollIntoView({ block: "center" });
}

// ── attachments ──────────────────────────────────────────────────────────────
//
// Attaching is the one thing a first-time reader has to discover, so it has
// four doors — drop a file anywhere, ＋ Attach beside the composer (upload /
// already here / paste), and paste — and no confirm step behind any of them.
// Text is addressable the moment it lands.
//
// What retrieval may see is decided in exactly two places and nowhere else:
// the per-attachment mute, and the master switch. Both are retrieval-only —
// the text stays loaded and every address still re-opens either way — so
// these two readers are the single seam, and no caller filters `muted` on
// its own again.

/** The chunks retrieval is allowed to see this turn. */
function liveChunks() {
  if (!state.useAttachments) return [];
  return state.chunks.filter((c) => !state.muted.has(c.source));
}

/** The same rule over whole sources, for the organs that read files not
 * passages (the chart door, which needs a source's full text). */
function liveSources() {
  if (!state.useAttachments) return [];
  return Object.entries(state.sources)
    .filter(([name]) => !state.muted.has(name))
    .map(([name, text]) => ({ name, text }));
}

function addSource(name, text, { fromBoot = false } = {}) {
  if (!text.trim()) return;
  // The `self:` namespace is the instrument's own plane. A file wearing it
  // would make a self address ambiguous about which plane it names — the
  // one ambiguity the whole design exists to refuse.
  if (isReservedSourceName(name)) {
    $("status").textContent = `"${name}" is reserved for the instrument's own plane — rename it and add it again`;
    return;
  }
  state.sources[name] = text;
  // WHAT KIND OF THING this is, computed once and carried on every chunk —
  // the ONE choke-point every attachment/paste/upload/library pull already
  // passes through, so this needs no per-caller change to reach any of
  // them (identifyMaterial, source.js).
  const identity = identifyMaterial(name, text);
  // blankFurniture was already wired into `relationsFor` (above) on the
  // belief that it protected every reader of this text — measured
  // 2026-09-04 (rashomon-contrast-RESULTS.md) that it did not protect the
  // CAST: `chunk.blanked` (source.js's own page-aware furniture field) was
  // simply never produced here, because this the real choke-point every
  // source passes through never asked chunkSource for it. Wired now, same
  // declared numbers as `relationsFor`'s own blankFurniture two screens up.
  state.chunks = state.chunks
    .filter((c) => c.source !== name)
    .concat(chunkSource(name, text, {
      boundaries: discoverBoundaries(text), identity,
      blankFurniture: (t) => blankLabelRows(t, { minRun: 4, maxCell: 60 }),
    }));
  renderSources();
  // Persist to OPFS so the source survives a reload — not on boot, where
  // it came FROM OPFS and a rewrite would race the reading cursor's own row.
  if (!fromBoot) persistSource(name, text, { passages: countFor(name) });
  // Read it now (Pass 18, P99) — a book attached is a book read, before any
  // question. Boot resumes from the saved cursor instead (below).
  if (!fromBoot) readSourceOnArrival(name);
}

/**
 * The document's own structure, or nothing.
 *
 * A gap is a result: fewer than two boundaries is `no_structural_boundaries_
 * detected`, and the honest response is to fall back to paragraphs rather than
 * to lower the bar until something is found. A spreadsheet has no headings and
 * is not asked.
 */
function discoverBoundaries(text) {
  try {
    const out = outlineOfIndex(lineIndex(text), { max: 5000 });
    if (out.gap || out.headings.length < 2) return null;
    return out.headings.map((h) => ({ start: h.start, end: h.end, label: h.label }));
  } catch {
    return null;
  }
}

function removeSource(name) {
  // The text goes, the addresses stay. A record's refs still name this file,
  // and re-opening one now says so rather than quietly returning nothing —
  // which is the honest failure for an address whose material is gone.
  delete state.sources[name];
  delete state.provenance[name];
  state.muted.delete(name);
  state.chunks = state.chunks.filter((c) => c.source !== name);
  renderSources();
  // Remove from OPFS.
  unpersistSource(name);
}

function countFor(name) {
  return state.chunks.filter((c) => c.source === name).length;
}

/**
 * The attachment pills on the composer: what the next question will be asked
 * with. Two controls per pill, because they are two different acts — the name
 * silences and restores (retrieval stops seeing it; the text and its
 * addresses stay), the × drops it. Silenced is struck through, never hidden:
 * silenced and gone must not look alike.
 *
 * The master switch does not restyle the pills — a pill would then be lying
 * about its own state — it greys the whole strip, and its own label carries
 * the count that is out of play.
 */
function renderAttachStrip() {
  const strip = $("attach-strip");
  if (!strip) return;
  const names = Object.keys(state.sources);
  strip.textContent = "";
  strip.style.opacity = state.useAttachments ? "" : "0.45";
  for (const name of names) {
    const on = !state.muted.has(name);
    const pill = document.createElement("span");
    pill.className = on ? "pill" : "pill off";

    const label = document.createElement("button");
    label.type = "button";
    label.className = "name";
    const labelText = document.createElement("span");
    labelText.className = "txt";
    labelText.textContent = `${name} · ${countFor(name).toLocaleString()}`;
    label.append(labelText);
    // The pill opens the sheet (user, 2026-08-17) — choosing what the chat
    // reads is a considered act over the whole set, and a click that
    // silently silenced one file was a state change wearing a label's
    // clothes. The ✕ stays immediate; everything else lives in the sheet.
    // a prior's pill wears its papers — the publisher line above the control hint
    const prov = state.provenance[name];
    label.title = `${prov ? `${prov.line}\n` : ""}${name}${on ? "" : " — silenced"} · click to see and choose what's read`;
    label.onclick = () => openAttachSheet(name);

    const drop = document.createElement("button");
    drop.type = "button";
    drop.className = "drop";
    drop.textContent = "✕";
    drop.title = `Remove ${name} — its addresses stop resolving`;
    drop.onclick = () => removeSource(name);

    pill.append(label, drop);
    strip.append(pill);
  }

  // The add button and the switch are one control, so the button carries the
  // count and the switch simply is not there until there is something for it
  // to govern — a lever over an empty set is furniture that teaches nothing.
  const label = $("attach-label");
  const sw = $("attach-switch");
  if (label) label.textContent = names.length ? `${names.length} attached` : "Attach";
  if (sw) sw.hidden = !names.length;
}

/**
 * The attached sheet: every attachment as a row — in play (the same mute
 * state the pills and master switch share), name (click for a peek at the
 * text itself), size, remove. `focus` pre-opens one row's peek so clicking a
 * specific pill lands on that file, not just on the list.
 */
function openAttachSheet(focus = null) {
  const list = $("attach-sheet-list");
  list.textContent = "";
  const names = Object.keys(state.sources);
  const mediaNames = Object.keys(state.media);
  if (!names.length && !mediaNames.length) {
    list.innerHTML = '<p class="empty">Nothing attached. Add files with ＋, drop one anywhere, or paste.</p>';
  }
  for (const name of names) {
    const on = !state.muted.has(name);
    const row = document.createElement("div");
    row.className = `att-row${on ? "" : " off"}`;

    const line = document.createElement("div");
    line.className = "att-line";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = on;
    box.title = "read this file when answering";
    box.onchange = () => {
      if (box.checked) state.muted.delete(name);
      else state.muted.add(name);
      row.classList.toggle("off", !box.checked);
      renderSources();
    };
    const n = document.createElement("span");
    n.className = "name";
    n.textContent = name;
    n.title = "peek at the text";
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = `${countFor(name).toLocaleString()} passages · ${fmtBytes(state.sources[name].length)}`;
    const x = document.createElement("button");
    x.type = "button";
    x.textContent = "remove";
    x.title = `Remove ${name} — its addresses stop resolving`;
    x.onclick = () => {
      removeSource(name);
      openAttachSheet();
    };
    line.append(box, n, meta, x);
    row.append(line);

    // The peek: the file's own opening bytes, enough to know which file this
    // is — the full text lives one click away in Sources.
    let peek = null;
    n.onclick = () => {
      if (peek) {
        peek.remove();
        peek = null;
        return;
      }
      peek = document.createElement("pre");
      peek.className = "att-peek";
      const text = state.sources[name] ?? "";
      peek.textContent = text.length > 900 ? `${text.slice(0, 900)}\n… ${(text.length - 900).toLocaleString()} more chars — open it in Sources for the whole file` : text;
      row.append(peek);
    };
    if (name === focus) n.onclick();
    list.append(row);
  }

  // Binary material rides below the text attachments in the same sheet: no
  // checkbox, because the mute is a retrieval concept and bytes are never
  // retrieved — the row just says what it is and how to open it (the one
  // door is /measure). Merged here from the old materials panel (deleted —
  // "the pills are the whole interface") so the /measure feature keeps its
  // one place to be seen.
  for (const name of mediaNames) {
    const m = state.media[name];
    const row = document.createElement("div");
    row.className = "att-row";
    const line = document.createElement("div");
    line.className = "att-line";
    const label = document.createElement("span");
    label.className = "name";
    label.textContent = `${name} · ${fmtBytes(m.blob.size)} ${m.kind} · /measure ${name}`;
    line.append(label);
    row.append(line);
    list.append(row);
  }
  $("attach-sheet").showModal();
}

/**
 * One place attachments are drawn, because there is now one place they live.
 * The second list — a panel of rows with its own checkbox and its own remove
 * button — was a duplicate control surface for the same state, in a pane with
 * no tab to reach it: two ways to silence the same file, only one of them
 * findable. It is gone; the pills are the whole interface.
 */
function renderSources() {
  renderAttachStrip();
  renderSourcesPanel();
}

/**
 * Reading-workbench spec, Increment C. Switches which view the Reading pane
 * shows — "files" (every loaded source, READ's own destination), "held"
 * (the same list, filtered to what is actually live right now — muted
 * sources drop out, media never does), or "priors" (GIVEN's destination,
 * the toggle ledger). Search/sort/add belong to the file list alone; the
 * priors view has its own toggles instead, so the toolbar's action group
 * hides with it rather than sitting there disabled.
 */
function setExploreView(view) {
  state.exploreView = view;
  for (const btn of document.querySelectorAll("#explore-subnav .seg"))
    btn.classList.toggle("active", btn.dataset.view === view);
  const onPriors = view === "priors";
  $("sources-list").hidden = onPriors;
  $("sources-actions").hidden = onPriors;
  $("priors-panel").hidden = !onPriors;
  $("explore-heading").textContent = { files: "Sources", held: "Held now", priors: "Given" }[view] ?? "Sources";
  if (onPriors) renderPriorsPanel();
  else renderSourcesPanel();
}

function renderSourcesPanel() {
  const list = $("sources-list");
  if (!list) return;
  const heldOnly = state.exploreView === "held";
  const names = (heldOnly ? Object.keys(state.sources).filter((n) => !state.muted.has(n)) : Object.keys(state.sources));
  const mediaNames = Object.keys(state.media); // media is never muted — always held once loaded
  if (!names.length && !mediaNames.length) {
    list.innerHTML = heldOnly
      ? `<div class="sources-empty"><p>Nothing is held right now.</p><p class="sources-empty-sub">Every loaded source is muted — nothing is contributing to retrieval this turn.</p></div>`
      : `<div class="sources-empty"><p>No sources yet.</p><p class="sources-empty-sub">Drop a file anywhere, paste text, or click ＋ Add to bring documents into this project.</p><p class="sources-empty-sub">Sources persist across sessions via the browser's private file system.</p></div>`;
    return;
  }
  const search = $("sources-search")?.value?.toLowerCase() ?? "";
  const sortKey = $("sources-sort")?.value ?? "newest";
  const entries = names.map((name) => {
    const text = state.sources[name] ?? "";
    return { name, text, size: text.length, passages: countFor(name) };
  });
  const sortCmp = {
    newest: (a, b) => (b.meta?.addedAt ?? 0) - (a.meta?.addedAt ?? 0),
    oldest: (a, b) => (a.meta?.addedAt ?? 0) - (b.meta?.addedAt ?? 0),
    name: (a, b) => a.name.localeCompare(b.name),
    largest: (a, b) => b.size - a.size || a.name.localeCompare(b.name),
    smallest: (a, b) => a.size - b.size || a.name.localeCompare(b.name),
  }[sortKey] ?? ((a, b) => b.name.localeCompare(a.name));
  const filtered = search ? entries.filter((e) => e.name.toLowerCase().includes(search)) : entries;
  filtered.sort(sortCmp);
  list.textContent = "";
  for (const { name, text } of filtered) {
    const on = !state.muted.has(name);
    const prov = state.provenance[name];
    const ext = name.split(".").pop().toLowerCase();
    const icon = ({ md: "M", txt: "T", csv: ",", json: "{", html: "<", js: "JS", py: "PY", sql: "S", pdf: "PDF" })[ext]
      ?? name.charAt(0).toUpperCase();
    const row = document.createElement("div");
    row.className = `sources-file${on ? "" : " sources-file-muted"}`;
    row.innerHTML = `
      <div class="sources-file-icon">${icon}</div>
      <div class="sources-file-info">
        <div class="sources-file-name">${esc(name)}</div>
        <div class="sources-file-meta">${countFor(name).toLocaleString()} passages · ${fmtBytes(text.length)}</div>
        ${prov?.line ? `<div class="sources-file-prov">${esc(prov.line)}</div>` : ""}
      </div>
      <div class="sources-file-actions">
        <button type="button" data-action="mute" title="${on ? "silence" : "unsilence"} this source">${on ? "mute" : "unmute"}</button>
        <button type="button" data-action="remove" title="remove — its addresses stop resolving">✕</button>
      </div>`;
    row.querySelector('[data-action="mute"]').onclick = (e) => {
      e.stopPropagation();
      if (on) state.muted.add(name); else state.muted.delete(name);
      renderSources();
    };
    row.querySelector('[data-action="remove"]').onclick = (e) => {
      e.stopPropagation();
      removeSource(name);
    };
    row.onclick = () => openSourceViewer(name);
    list.append(row);
  }
  for (const name of mediaNames) {
    const m = state.media[name];
    const row = document.createElement("div");
    row.className = "sources-file";
    const icon = ({ video: "▶", audio: "♫", image: "🖼", pdf: "PDF" })[m.kind] ?? "📁";
    row.innerHTML = `
      <div class="sources-file-icon">${icon}</div>
      <div class="sources-file-info">
        <div class="sources-file-name">${esc(name)}</div>
        <div class="sources-file-meta">${m.kind} · ${fmtBytes(m.blob.size)}</div>
      </div>
      <div class="sources-file-actions">
        <button type="button" data-action="remove" title="remove">✕</button>
      </div>`;
    row.querySelector('[data-action="remove"]').onclick = (e) => {
      e.stopPropagation();
      URL.revokeObjectURL(m.url);
      delete state.media[name];
      renderSources();
    };
    row.onclick = () => openMediaViewer(name);
    list.append(row);
  }
}

/**
 * GIVEN's destination. Reads GET /api/priors — the SAME route `/priors`
 * (priorsTurn, above) and the terminal's `priors` command already read —
 * and writes through the SAME POST /api/priors/toggle. One ledger, now
 * four doors instead of three; a flip made here is seen everywhere else,
 * because nothing here keeps its own copy of the toggle state.
 */
async function renderPriorsPanel() {
  const panel = $("priors-panel");
  if (!panel) return;
  panel.innerHTML = `<p class="priors-empty">reading the priors ledger…</p>`;
  let data;
  try {
    data = await (await fetch(`${EXPLORE_BASE}/api/priors`)).json();
  } catch {
    panel.innerHTML = `<p class="priors-empty">the priors organ needs explore-server.mjs running on :8812 to answer this.</p>`;
    return;
  }
  if (data?.gap) {
    panel.innerHTML = `<p class="priors-empty">${esc(data.gap.detail ?? "no priors corpus found")}</p>`;
    return;
  }
  if (!data?.categories?.length) {
    panel.innerHTML = `<p class="priors-empty">no priors corpus found.</p>`;
    return;
  }
  panel.innerHTML = "";
  const summary = document.createElement("p");
  summary.className = "priors-empty";
  summary.textContent = `${data.files.toLocaleString()} documents, ${data.enabledCount.toLocaleString()} in play — every document starts off.`;
  panel.append(summary);
  for (const c of data.categories) {
    const row = document.createElement("div");
    row.className = "priors-genre";
    const allOn = c.enabled === c.files && c.files > 0;
    row.innerHTML = `
      <span class="priors-genre-name">${esc(c.name)}</span>
      <span class="priors-genre-count">${c.enabled}/${c.files}</span>
      <button type="button" class="seg${allOn ? " active" : ""}" data-genre="${esc(c.name)}">${allOn ? "on" : "off"}</button>`;
    row.querySelector("button").onclick = async (e) => {
      e.stopPropagation();
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        await fetch(`${EXPLORE_BASE}/api/priors/toggle`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ path: c.name, on: !allOn }),
        });
      } catch {}
      renderPriorsPanel();
    };
    panel.append(row);
  }
}

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function openMediaViewer(name) {
  const m = state.media[name];
  if (!m) return;
  $("source-viewer-name").textContent = name;
  $("source-viewer-meta").textContent = `${m.kind} · ${fmtBytes(m.blob.size)}`;
  $("source-viewer-mode").style.display = "none";
  const body = $("source-viewer-body");
  body.textContent = "";
  if (m.kind === "video") {
    const v = document.createElement("video");
    v.src = m.url;
    v.controls = true;
    v.preload = "metadata";
    body.append(v);
  } else if (m.kind === "audio") {
    const a = document.createElement("audio");
    a.src = m.url;
    a.controls = true;
    a.preload = "metadata";
    body.append(a);
  } else if (m.kind === "image") {
    const img = document.createElement("img");
    img.src = m.url;
    body.append(img);
  } else {
    const p = document.createElement("p");
    p.textContent = "PDF viewer not yet supported. Use /measure to analyze.";
    p.style.color = "var(--muted)";
    body.append(p);
  }
  $("source-viewer").showModal();
}

function openSourceViewer(name) {
  const text = state.sources[name] ?? "";
  mirrorTermRecord("source-open", { path: name, bytes: text.length, via: "chat" }); // the chat's own opens land on the same record Explore's do
  const prov = state.provenance[name];
  $("source-viewer-name").textContent = name;
  $("source-viewer-meta").textContent = `${countFor(name).toLocaleString()} passages · ${fmtBytes(text.length)}${prov?.line ? ` · ${prov.line}` : ""}`;
  $("source-viewer-mode").style.display = "";
  const ext = name.split(".").pop().toLowerCase();
  // Store current file info for toggle
  const info = { name, text, ext };
  renderSourceViewerMode("read", info);
  // Wire mode toggle
  const modeEl = $("source-viewer-mode");
  modeEl.onclick = (e) => {
    const btn = e.target.closest("[data-mode]");
    if (!btn) return;
    modeEl.querySelectorAll(".seg").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderSourceViewerMode(btn.dataset.mode, info);
  };
  $("source-viewer").showModal();
}

function renderSourceViewerMode(mode, info) {
  const { name, text, ext } = info;
  const body = $("source-viewer-body");
  body.textContent = "";
  if (mode === "raw") {
    body.append(codeBlock(text, "plaintext"));
    return;
  }
  // read mode — render the file as-is
  if (ext === "md" || ext === "markdown") {
    renderBlocksInto(body, text, (chunk) => [document.createTextNode(chunk)]);
  } else if (ext === "html" || ext === "htm") {
    const frame = document.createElement("iframe");
    frame.sandbox = "";
    frame.srcdoc = toDocument({ lang: "html", code: text });
    frame.loading = "lazy";
    body.append(frame);
    const src = document.createElement("details");
    src.innerHTML = "<summary>source</summary>";
    src.append(codeBlock(text, "html"));
    body.append(src);
  } else if (ext === "csv" || ext === "tsv") {
    renderCsvTable(body, text, ext === "tsv" ? "\t" : ",");
  } else if (ext === "json") {
    try {
      const formatted = JSON.stringify(JSON.parse(text), null, 2);
      body.append(codeBlock(formatted, "json"));
    } catch {
      body.append(codeBlock(text, "json"));
    }
  } else if (CODE_EXTS.has(ext)) {
    body.append(codeBlock(text, ext));
  } else {
    renderPlainTextInto(body, text);
  }
}

// A plain-text source (pasted notes, an unrecognized extension) reads as
// prose, not as a horizontally-scrolling code dump: paragraphs wrap at the
// pane's width and stay literal — unlike .md sources, nothing here is
// interpreted as markdown syntax. "raw" mode keeps codeBlock's monospace,
// unwrapped rendering on purpose, so the exact bytes stay inspectable.
function renderPlainTextInto(container, text) {
  for (const para of text.split(/\n{2,}/)) {
    if (!para) continue;
    const p = document.createElement("p");
    p.className = "para";
    p.textContent = para;
    container.append(p);
  }
}

const CODE_EXTS = new Set([
  "js", "ts", "jsx", "tsx", "mjs", "cjs",
  "py", "rb", "php", "r", "rs", "go", "java", "c", "cpp", "h", "hpp",
  "sql", "sh", "bash", "zsh", "fish",
  "css", "scss", "less",
  "yaml", "yml", "toml", "ini", "cfg", "conf",
  "xml", "svg",
  "swift", "kt", "scala", "lua", "pl", "ex", "exs", "erl", "hs",
  "vue", "svelte",
]);

function renderCsvTable(container, text, delimiter) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) { container.textContent = text; return; }
  const parseRow = (line) => {
    const cells = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
        else cur += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === delimiter) { cells.push(cur); cur = ""; }
        else cur += ch;
      }
    }
    cells.push(cur);
    return cells;
  };
  const wrap = document.createElement("div");
  wrap.className = "table-wrap";
  const table = document.createElement("table");
  const thead = table.createTHead().insertRow();
  const headerCells = parseRow(lines[0]);
  for (const h of headerCells) { const th = document.createElement("th"); th.textContent = h; thead.append(th); }
  const tbody = table.createTBody();
  for (let i = 1; i < lines.length; i++) {
    const tr = tbody.insertRow();
    for (const cell of parseRow(lines[i])) tr.insertCell().textContent = cell;
  }
  wrap.append(table);
  container.append(wrap);
}

const MEDIA_EXTS = new Set([
  "mp4", "webm", "ogv", "mov", "m4v",
  "mp3", "wav", "ogg", "oga", "flac", "m4a",
  "png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico",
  "pdf",
]);

function mediaKindFor(ext) {
  if (["mp4","webm","ogv","mov","m4v"].includes(ext)) return "video";
  if (["mp3","wav","ogg","oga","flac","m4a"].includes(ext)) return "audio";
  if (["png","jpg","jpeg","gif","webp","svg","bmp","ico"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  return "binary";
}

async function addFiles(fileList) {
  const files = [...fileList];
  for (const file of files) {
    try {
      $("status").textContent = `reading ${file.name} (${fmtBytes(file.size)})…`;
      await new Promise((r) => setTimeout(r, 0));
      const ext = file.name.split(".").pop().toLowerCase();
      if (MEDIA_EXTS.has(ext)) {
        const blob = file;
        const url = URL.createObjectURL(blob);
        state.media[file.name] = { blob, kind: mediaKindFor(ext), url };
        renderSources();
        if (mediaKindFor(ext) === "audio") {
          await transcribeAudioBlob(blob, file.name);
          continue;
        }
        $("status").textContent = `${file.name} · ${mediaKindFor(ext)} loaded`;
        continue;
      }
      const text = await file.text();
      if (looksBinary(text)) {
        $("status").textContent = `${file.name} isn't text — skipped`;
        continue;
      }
      addSource(file.name, text);
      $("status").textContent = `${file.name} · ${countFor(file.name).toLocaleString()} passages`;
    } catch (err) {
      $("status").textContent = `could not read ${file.name}: ${err.message}`;
    }
  }
}

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}

/**
 * A dropped PDF or image decodes to mojibake rather than failing, and mojibake
 * chunks cleanly into thousands of passages that can never match a question.
 * Cheaper to refuse it than to let it sit in the corpus looking loaded.
 */
function looksBinary(text) {
  const sample = text.slice(0, 4096);
  if (!sample) return false;
  let odd = 0;
  for (const ch of sample) {
    const c = ch.codePointAt(0);
    if (c === 0 || (c < 9) || (c > 13 && c < 32) || ch === "�") odd++;
  }
  return odd / sample.length > 0.05;
}

// ── boot ─────────────────────────────────────────────────────────────────────

// This module reached its own boot, so the page is served and its scripts
// resolved — which is exactly the claim the not-served banner makes the
// opposite of. Removing it here rather than on a timer means the notice is
// governed by the one fact that matters: did this file run.
$("not-served")?.remove();

// Sources persist across sessions via OPFS. Load them before the first
// render so the panel is populated immediately.
(async () => {
  try {
    const saved = await loadSources();
    for (const { name, text } of saved) {
      if (!state.sources[name]) addSource(name, text, { fromBoot: true });
    }
    // The record first, then the reads resume from their saved cursors on
    // top of it (a read that started before the restore would fork the log).
    try {
      const restored = await restoreRecords();
      if (restored.hyperlexicon) state.hyperlexiconLog = restored.hyperlexicon;
      if (restored.grid) state.gridLog = restored.grid;
      if (restored.meta) state.metaLedger = restored.meta;
      if (restored.declarations) state.declarations = restored.declarations;
      const n = Object.keys(restored).length;
      if (n) console.info(`record restored: ${Object.entries(restored).map(([k, l]) => `${k} ${l.entries.length}`).join(", ")}`);
    } catch (e) { console.warn("record restore:", e?.message ?? e); }
    for (const { name, meta } of saved) {
      if (state.sources[name]) readSourceOnArrival(name, { savedCursor: meta?.readCursor ?? 0, savedRecipe: meta?.readRecipe ?? null });
    }
  } catch {}
  renderSources();
})();

// Sources panel: search filters the list live.
$("sources-search")?.addEventListener("input", () => renderSourcesPanel());

// Sources panel: sort reorders the list.
$("sources-sort")?.addEventListener("change", () => renderSourcesPanel());

// Sources panel: ＋ Add opens the same attach picker the composer uses.
$("sources-add")?.addEventListener("click", () => {
  $("attach-menu")?.showModal();
});

// The Reading pane's own sub-nav: files / held / priors.
for (const btn of document.querySelectorAll("#explore-subnav .seg"))
  btn.onclick = () => setExploreView(btn.dataset.view);

renderSources();

// One conversation to start; more on demand, each with its own fold.
state.convos.push(newConvo());
switchConvo(0);

// Builds from a previous session come back — with the code that was being
// worked on — so an iteration survives a reload.
restoreBuilds();
renderBuilds();

// No Connect button any more: choosing a model in the picker IS connecting,
// and the boot path connects on its own when a model is reachable.
$("model").onchange = () => {
  state.model = $("model").value;
  if (state.ready) $("status").textContent = readyLine();
};

/** The status line: the model, and the depth when it is not the plain rung. */
function readyLine() { return `ready · ${state.model}${state.depth !== 1 ? ` · depth ${state.depth}` : ""}${state.routes ? ` · routes: ${state.routes.summary}` : ""}`; }
/** The slider's legend, in plain words, from the budgets the rung would spend. */
function renderDepth() {
  const b = depthBudgets(state.depth);
  const name = $("depth-name"); if (name) name.textContent = DEPTH_NAMES[b.level] ?? String(b.level);
  const line = $("depth-line"); if (line) line.textContent = depthLine(b, { piece: true });
}
if ($("depth")) {
  $("depth").value = String(state.depth);
  renderDepth();
  $("depth").oninput = () => {
    state.depth = Number($("depth").value);
    localStorage.setItem("fold-depth", String(state.depth));
    renderDepth();
    if (state.ready) $("status").textContent = readyLine();
  };
}

// Material sent over from the Explore pane. The origin check is the whole
// security model of a message listener — inbound "*" is never trusted, and
// anything not from the explore server's own origin is ignored unread.
window.addEventListener("message", (e) => {
  if (e.origin !== "http://localhost:8812") return;
  const d = e.data;
  if (d?.type !== "fold:material:add") return;
  if (typeof d.name !== "string" || typeof d.text !== "string") return;
  addSource(d.name, d.text);
  // A prior handed over from Explore carries its papers; they are kept only
  // when the source actually landed (a reserved name is refused above).
  if (state.sources[d.name] && d.provenance && typeof d.provenance.line === "string") {
    state.provenance[d.name] = {
      line: d.provenance.line,
      fields: typeof d.provenance.fields === "object" && d.provenance.fields ? { ...d.provenance.fields } : {},
      path: String(d.provenance.path ?? ""),
    };
    renderSources(); // the pill was drawn before its papers landed
  }
  $("status").textContent = `${d.name} · from Explore`;
});

// ＋ Attach opens the three doors rather than going straight to the OS file
// picker. Going straight there was the older, shorter path, and it hid the
// fact that this machine already holds material — the library and every page
// the web organ has saved — behind a browse-and-deposit trip through Explore
// that nobody would guess was there.
for (const b of document.querySelectorAll(".attach"))
  b.onclick = () => $("attach-menu").showModal();
// The sheet's own add door closes the sheet first — two stacked modals would
// leave the reader closing dialogs like nested parentheses.
$("attach-sheet-add").onclick = () => {
  $("attach-sheet").close();
  $("attach-menu").showModal();
};
$("file").onchange = (e) => {
  addFiles(e.target.files);
  e.target.value = "";
};
$("attach-upload").onclick = () => {
  $("attach-menu").close();
  $("file").click();
};
$("attach-paste").onclick = () => {
  $("attach-menu").close();
  $("material").value = "";
  pasteHandled = false;
  $("paste").showModal();
  $("material").focus();
};
$("attach-existing").onclick = () => {
  $("attach-menu").close();
  openPicker();
};

// ── already here ─────────────────────────────────────────────────────────────
//
// Two stores, one list: the Explore library (files uploaded or referenced on
// this disk) and `web/history.jsonl` (every page the web organ fetched, kept
// whole). Attaching from either is a copy of the text into this conversation,
// exactly what a drop or a paste does — never a live link, because a source
// whose bytes could change under a record's addresses would make those
// addresses lie.
//
// The page still owns no network: both reads are same-origin-by-policy calls
// to the local explore server, the same seam proof-seeking already uses.

/** Rows the picker can offer, newest first within each store. */
async function existingItems() {
  const out = [];
  try {
    const lib = await (await fetch(`${EXPLORE_BASE}/api/library`)).json();
    for (const e of lib.entries ?? []) {
      if (e.dir) continue; // a folder is a place to browse, not a thing to attach
      out.push({
        name: e.name,
        meta: e.size == null ? "file" : fmtBytes(e.size),
        from: "your files",
        url: `${EXPLORE_BASE}/api/raw?path=${encodeURIComponent(e.path)}`,
      });
    }
  } catch (e) {
    out.push({ gap: `your files: ${e.message}` });
  }
  try {
    const hist = await (await fetch(`${EXPLORE_BASE}/api/web/history`)).json();
    const seen = new Set();
    for (const e of hist.entries ?? []) {
      if (!e.textPath || seen.has(e.textPath)) continue;
      seen.add(e.textPath);
      out.push({
        name: e.title || hostOf(e.finalUrl ?? e.url),
        meta: `${hostOf(e.finalUrl ?? e.url)} · ${(e.textChars ?? 0).toLocaleString()} chars`,
        from: "saved pages",
        url: pageFaceUrl(EXPLORE_BASE, e.textPath),
      });
    }
  } catch (e) {
    out.push({ gap: `saved pages: ${e.message}` });
  }
  // The third store: priors the reader has switched ON in Sources → priors.
  // Only what is in play is offered — the toggle ledger is the gate — and
  // attaching goes through the doc endpoint so the papers ride along and
  // the open lands on the record with the publisher's own source URL.
  try {
    const pri = await (await fetch(`${EXPLORE_BASE}/api/priors/enabled`)).json();
    if (pri.gap) out.push({ gap: `priors: ${pri.gap.detail}` });
    for (const e of pri.entries ?? []) {
      out.push({
        name: e.name,
        meta: `${e.category} · ${fmtBytes(e.size)}`,
        from: "priors in play",
        prior: e.path,
      });
    }
  } catch (e) {
    out.push({ gap: `priors: ${e.message}` });
  }
  return out;
}

async function openPicker() {
  const list = $("picker-list");
  const filter = $("picker-filter");
  filter.value = "";
  list.textContent = "";
  list.innerHTML = '<p class="empty">looking…</p>';
  $("picker").showModal();

  const items = await existingItems();
  const draw = () => {
    const q = filter.value.trim().toLowerCase();
    const shown = items.filter(
      (i) => i.gap || !q || `${i.name} ${i.meta} ${i.from}`.toLowerCase().includes(q),
    );
    list.textContent = "";
    if (!shown.length) {
      list.innerHTML = '<p class="empty">Nothing here matches. Upload a file, read a page in Sources → web, or switch priors on in Sources → priors.</p>';
      return;
    }
    for (const item of shown) {
      if (item.gap) {
        // A store that did not answer is named, never silently dropped — an
        // empty list and an unreachable server must not look alike.
        const p = document.createElement("p");
        p.className = "empty";
        p.textContent = `couldn't read ${item.gap}`;
        list.append(p);
        continue;
      }
      const row = document.createElement("button");
      row.type = "button";
      row.className = "pick-row";
      const n = document.createElement("span");
      n.className = "name";
      n.textContent = item.name;
      const m = document.createElement("span");
      m.className = "meta";
      m.textContent = `${item.from} · ${item.meta}`;
      row.append(n, m);
      row.onclick = async () => {
        row.disabled = true;
        try {
          let text;
          let name = item.name;
          let prov = null;
          if (item.prior) {
            // one crossing: text + papers together, the open recorded with
            // the publisher's own source URL
            const doc = await (await fetch(`${EXPLORE_BASE}/api/priors/doc?path=${encodeURIComponent(item.prior)}&text=1`)).json();
            if (doc.error) throw new Error(doc.error);
            if (doc.gap) throw new Error(doc.gap.detail);
            text = doc.text;
            if (doc.provenance) prov = { line: doc.provenanceLine, fields: doc.provenance, path: doc.path };
            // two corpora can hold a file by the same name — the genre
            // disambiguates rather than silently replacing the other one
            if (state.sources[name] && state.provenance[name]?.path !== doc.path) name = `${doc.path.split("/")[0]}-${name}`;
          } else {
            const res = await fetch(item.url);
            if (!res.ok) throw new Error(`answered ${res.status}`);
            text = await res.text();
          }
          if (looksBinary(text)) {
            $("status").textContent = `${item.name} isn't text — skipped`;
            return;
          }
          addSource(name, text);
          if (prov && state.sources[name]) {
            state.provenance[name] = prov;
            renderSources(); // the pill was drawn before its papers landed
          }
          $("status").textContent = `${name} · attached from ${item.from}`;
          $("picker").close();
        } catch (e) {
          $("status").textContent = `couldn't attach ${item.name}: ${e.message}`;
          row.disabled = false;
        }
      };
      list.append(row);
    }
  };
  filter.oninput = draw;
  draw();
}

// Drop anywhere. The counter tracks nested enter/leave pairs so dragging over a
// child element doesn't flicker the overlay off.
let dragDepth = 0;
document.addEventListener("dragenter", (e) => {
  e.preventDefault();
  if (++dragDepth === 1) $("dropzone").hidden = false;
});
document.addEventListener("dragover", (e) => e.preventDefault());
document.addEventListener("dragleave", () => {
  if (--dragDepth <= 0) {
    dragDepth = 0;
    $("dropzone").hidden = true;
  }
});
document.addEventListener("drop", (e) => {
  e.preventDefault();
  dragDepth = 0;
  $("dropzone").hidden = true;
  if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
});

// Paste is its own door. It used to add on the paste event itself, in a
// textarea in a pane with no tab — so the one confirmation you got was the
// box emptying, in a place you could not navigate to. In a dialog it needs
// its own commit, and Attach is it.
function addPasted() {
  const text = $("material").value;
  if (!text.trim()) return;
  const n = Object.keys(state.sources).filter((k) => k.startsWith("pasted")).length;
  addSource(n ? `pasted-${n + 1}.txt` : "pasted.txt", text);
  $("material").value = "";
  $("status").textContent = "pasted text attached";
}
// The paste sheet is handled on its form's SUBMIT as well as the dialog's
// close: in Chromium 148 (measured in the browser pane, 2026-09-05, P119) a
// <dialog> fires `toggle` but never `close`, so a handler on close alone
// never ran there and pasted material silently went nowhere. The flag keeps
// a browser that fires both from attaching twice.
let pasteHandled = false;
$("paste").querySelector("form").addEventListener("submit", (e) => {
  if (e.submitter?.id !== "paste-add") return;
  pasteHandled = true;
  queueMicrotask(addPasted);
});
$("paste").addEventListener("close", () => {
  if (pasteHandled) return;
  if ($("paste").returnValue === "add") addPasted();
});

// ── what the next question is asked with ─────────────────────────────────────
//
// Two switches, both default ON, both persisted, both retrieval-only: the
// first decides whether attachments are read, the second whether a claim they
// do not back is looked up online. They sit on the composer because that is
// where the decision is actually made — per question, not per session — and
// because a standing authorization the user cannot see is not one.
function bindSwitch(id, key, read, write) {
  const box = $(id);
  if (!box) return;
  box.checked = read();
  box.onchange = () => {
    write(box.checked);
    localStorage.setItem(key, box.checked ? "on" : "off");
    renderSources();
  };
}
bindSwitch("use-attachments", "fold-use-attachments", () => state.useAttachments, (v) => {
  state.useAttachments = v;
  $("status").textContent = v ? "attachments on" : "attachments off";
});
bindSwitch("use-web", "fold-web-proof", () => state.webProof, (v) => {
  state.webProof = v;
  $("status").textContent = v ? "web lookups on" : "web lookups off";
});
bindSwitch("use-ranke", "fold-ranke", () => state.ranke, (v) => {
  state.ranke = v;
  $("status").textContent = v ? "primary-source chase on (Ranke)" : "primary-source chase off";
});

// Checking, on or off. This is a MODE, not a paint setting: off, the relation
// tier is never asked for, nothing is drawn into the prose, no tally is
// counted, no evidence or grounding panel is built, and no claim is taken to
// the web. What is left is a model answering a question — a plain chatbot.
//
// Two things stay on in either mode, because they are the instrument and not
// the apparatus: the fold (the running summary IS how the conversation
// works), and the record (FOLD-CONSTITUTION I.5 — append-only, and not the
// UI's to switch off). Both are disclosed under the turn either way.
//
// THE MODE AND THE DRAWING ARE NOW SEPARATE, and this control owns only the
// mode. User direction, verbatim (2026-08-27): "hide the 'grounding' badges
// for now, and i want the 'thinking' reasoning to show in real time its work
// figuring out the shape of an answer that would satisfy." Those are one
// request, not two: the apparatus is to keep RUNNING (the void narration
// below is gated on `state.grounded` and is exactly the reasoning being
// asked for) while it stops being PAINTED over the answer. This one control
// had collapsed the two — `state.grounded` and `body.marks-off` moved in
// lockstep, so `marks-off` could never hide anything on a newly rendered
// turn (with checking off, nothing was drawn to hide) and there was no way
// to ask for checked-but-unpainted at all.
//
// `marks-off` is therefore a STANDING suppression now, applied once and not
// toggled: the answer surface stays clean and every finding still lists in
// the thinking drawer, which the CSS above enforces by scoping every hiding
// rule to `.msg .body`. "For now" is the user's own word for it — this is a
// deliberately blunt switch to be handed back to a control when there is one
// worth designing, not a claim that per-turn painting was wrong.
// Amended 2026-09-05 (Pass 19, P100): the standing suppression is lifted.
// The marks — an address chip, a ground underline, a relation badge, the
// witness's ∅ — are the product bar's own item (1), and a checked turn
// paints them unless the person turned marks off. `fold-marks=off` still
// hides them; nothing else does.
if (localStorage.getItem("fold-marks") === "off") document.body.classList.add("marks-off");
{
  const btn = $("marks-toggle");
  const apply = (on) => {
    state.grounded = on;
    btn.setAttribute("aria-pressed", String(on));
  };
  apply(localStorage.getItem("fold-marks") !== "off");
  btn.onclick = () => {
    const on = btn.getAttribute("aria-pressed") !== "true";
    apply(on);
    localStorage.setItem("fold-marks", on ? "on" : "off");
    $("status").textContent = on ? "checking on" : "checking off — plain answers";
  };
}

// ── views ────────────────────────────────────────────────────────────────────
//
// Wide, the chat and the panels sit side by side and the tabs switch only the
// panels. Narrow, there is room for one at a time, so Chat joins the tab bar
// and the same click does both jobs. The editor and the terminal are panes
// with no tab of their own — they open from a build or from its control.

function showView(name) {
  // Leaving the editor is an act: an uncommitted draft becomes a SUPERSEDE
  // on the way out, so the builds panel and the download never show older
  // bytes than the newest work (commitDraft is a no-op when there is none).
  if (name !== "editor") commitDraft(editorBuild);
  document.body.dataset.view = name;
  for (const t of document.querySelectorAll('[role="tab"]'))
    t.setAttribute("aria-selected", String(t.dataset.pane === name));
  if (name === "chat") return; // the panels keep whichever pane they had
  for (const p of document.querySelectorAll(".pane"))
    p.classList.toggle("on", p.id === `pane-${name}`);
  if (name === "terminal") $("term-in").focus();
  if (name === "editor") editorLayout();
}

for (const tab of document.querySelectorAll('[role="tab"]'))
  tab.onclick = () => showView(tab.dataset.pane);

// Narrow, the first thing to see is the conversation and the composer; wide,
// the panels are already beside it, so start on the reading itself
// (reading-workbench spec, Increment B) — the reading is what the app is
// about, and asking is one tool inside it, not the other way around.
showView(matchMedia("(max-width: 900px)").matches ? "chat" : "explore");

// ── the Folds panel's controls ───────────────────────────────────────────────
//
// Search, order, and the cards/list switch — rendering state only; the logs
// beneath never change under any of it. The sort options come from the pure
// module's own declared list, so the select can never offer a key the sorter
// would refuse.

for (const { key, label } of FOLD_SORTS) {
  const opt = document.createElement("option");
  opt.value = key;
  opt.textContent = label;
  $("folds-sort").append(opt);
}
$("folds-search").oninput = () => {
  foldsQuery = $("folds-search").value;
  renderBuilds();
};
$("folds-sort").onchange = () => {
  foldsSort = $("folds-sort").value;
  renderBuilds();
};
$("folds-view").onclick = () => {
  foldsView = foldsView === "cards" ? "list" : "cards";
  $("folds-view").textContent = foldsView === "cards" ? "≡ list" : "▤ cards";
  renderBuilds();
};

// ── the theme toggle ─────────────────────────────────────────────────────────
//
// Three states, cycled: system (no stamp — the media query rules), light,
// dark. The choice lives in localStorage under "the-fold.theme" and is
// stamped on <html> — pre-paint by the inline script in <head>, and here on
// every click after. The CSS carries the palette three ways already; this
// button only moves the stamp.

{
  const THEME_KEY = "the-fold.theme";
  const themeBtn = $("theme-toggle");
  // Icon, not a word: the theme control sits in the same group as the marks
  // toggle, and a growing/shrinking word beside a fixed icon made that group
  // change width every time it was pressed. The state is the title.
  const THEME_ICON = {
    system: '<path d="M128,24a104,104,0,1,0,104,104A104.11,104.11,0,0,0,128,24Zm0,192V40a88,88,0,0,1,0,176Z"/>',
    light: '<path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z"/>',
    dark: '<path d="M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z"/>',
  };
  const themeLabel = (t) => {
    const key = t ?? "system";
    themeBtn.innerHTML = `<svg class="ph ph-lg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">${THEME_ICON[key]}</svg>`;
    themeBtn.title = `Appearance: ${key}. Click to cycle system → light → dark.`;
    return "";
  };
  const storedTheme = () => {
    try {
      const t = localStorage.getItem(THEME_KEY);
      return t === "light" || t === "dark" ? t : null;
    } catch {
      return null;
    }
  };
  const applyTheme = (t) => {
    if (t) document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
    themeLabel(t);
  };
  themeBtn.onclick = () => {
    const next = { system: "light", light: "dark", dark: "system" }[storedTheme() ?? "system"];
    try {
      if (next === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next);
    } catch {
      /* storage blocked — the stamp below still applies for this page */
    }
    applyTheme(next === "system" ? null : next);
  };
  applyTheme(storedTheme());
}

// ── the editor's controls ────────────────────────────────────────────────────
//
// A build's code is edited in the browser's own editor — VS Code's Monaco,
// vendored locally in node_modules and loaded same-origin (no CDN). Tab
// indents and Cmd/Ctrl+Enter runs the current text natively; ← builds leaves
// the editor without losing the edit.

$("editor-back").onclick = () => showView("builds");
$("editor-reset").onclick = resetBuild;
$("editor-run").onclick = runFromEditor;
editorOnChange((value) => {
  if (editorBuild) {
    // Keystrokes are a draft, not an act — the SUPERSEDE entry lands when
    // the draft runs, never per keypress. The draft still persists so a
    // refresh loses nothing.
    editorBuild.draft = value === buildCode(editorBuild) ? null : value;
    persistBuilds();
  }
});
editorRunShortcut(runFromEditor);

// ── the terminal's controls live in term.js (P18) ───────────────────────────

// ── the model picker ─────────────────────────────────────────────────────────
//
// What is answering belongs beside what is being asked. It used to be a chip
// in the far corner of the header opening a dialog with a <select> and a
// Connect button — two decisions, in two places, for the one setting a person
// actually reconsiders per question. Picking a model IS connecting to it, so
// the menu has no second step: one press, and the next turn runs there.

const settingsDialog = $("model-menu");

function openSettings(open) {
  if (!open) return settingsDialog.close();
  renderModelMenu();
  settingsDialog.showModal();
  // The room's offers are re-read each time the menu opens, so a mouth that
  // came or went since the last look is drawn; the rows re-render in place.
  if (state.matrixRoom && foldMatrix.status().signedIn) foldMatrix.mouths(state.matrixRoom).then(() => { if (settingsDialog.open) renderModelMenu(); }).catch(() => {});
}

/** The models this machine has, current one marked. Built from the same
 * `#model` select the connect path reads, so there is one source of truth
 * about what is on offer and no way for the menu to name a model routing
 * would then fail on. */
function renderModelMenu() {
  const list = $("model-list");
  const sel = $("model");
  list.textContent = "";
  if (!sel.options.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.style.padding = "14px 16px";
    p.textContent =
      $("status").textContent === "ollama has no models pulled"
        ? "Ollama is running but has no models pulled. `ollama pull qwen2.5:14b-instruct-q4_K_M` gives this one something to answer with."
        : "Ollama isn’t answering on :11434. Start it, then reopen this.";
    list.append(p);
    return;
  }
  for (const opt of sel.options) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = `model-row${opt.value === state.model ? " on" : ""}`;
    const n = document.createElement("span");
    n.className = "nm";
    n.textContent = opt.textContent;
    row.append(n);
    if (opt.value === state.model) {
      const tick = document.createElement("span");
      tick.className = "tick";
      tick.textContent = "✓";
      row.append(tick);
    }
    row.onclick = () => {
      sel.value = opt.value;
      settingsDialog.close();
      // One press does the whole act: choose, connect, and re-read the
      // window. `connect` already closes this dialog and lands on the chat.
      connect();
    };
    list.append(row);
  }
  // The room's mouths (P119): every model a member offers through the open
  // room, as rungs. Choosing one routes each turn to that member sealed;
  // there is nothing to connect to here — the room is already open.
  if (state.matrixRoom) {
    for (const w of foldMatrix.pool(state.matrixRoom).workers.filter((x) => !x.withdrawn)) for (const m of w.models) {
      const name = roomModelName(w.user, m);
      const row = document.createElement("button");
      row.type = "button";
      row.className = `model-row${name === state.model ? " on" : ""}`;
      const n = document.createElement("span"); n.className = "nm"; n.textContent = `${m} · on ${w.user}${w.home ? `'s ${w.home}` : ""}, through the room`;
      row.append(n);
      if (name === state.model) { const tick = document.createElement("span"); tick.className = "tick"; tick.textContent = "✓"; row.append(tick); }
      row.onclick = () => {
        state.model = name; state.ready = true; state.contextTokens = null;
        // The room's mouths belong in what this page considers offered, so
        // every routing decision can see them and the picker's own checks
        // do not treat the choice as unknown.
        if (!state.offeredModels.includes(name)) state.offeredModels = [...state.offeredModels, name];
        settingsDialog.close(); syncModelPick(); $("send").disabled = false;
        $("status").textContent = `ready · ${name} · every call of a turn goes there, sealed through the room`;
        showView("chat"); $("input").focus();
      };
      list.append(row);
    }
  }
}

/** The composer's model button: the name, or the reason there isn't one. */
function syncModelPick() {
  const name = $("model-name");
  if (!name) return;
  name.textContent = state.ready ? state.model : "no model";
  $("model-pick").title = state.ready
    ? `Answering with ${state.model} — press to change`
    : $("status").textContent || "No model connected — press to choose";
}

// A dialog closes the way it opened — from anywhere around it. Click the
// backdrop (or press Escape, which <dialog> gives natively) and it goes. The
// ✕ in each sheet's head is the third way, and the only one that is visible:
// Escape is not discoverable and a backdrop click is a guess.
for (const id of ["reopen", "model-menu", "fold-view", "attach-menu", "picker", "paste", "attach-sheet", "source-viewer", "matrix-login", "pool"]) {
  const dlg = $(id);
  dlg?.addEventListener("click", (e) => {
    if (e.target === dlg) dlg.close();
  });
}
for (const [btn, dlg] of [
  ["model-menu-x", "model-menu"],
  ["matrix-login-x", "matrix-login"],
  ["pool-x", "pool"],
  ["attach-menu-x", "attach-menu"],
  ["picker-x", "picker"],
  ["paste-x", "paste"],
  ["reopen-x", "reopen"],
  ["attach-sheet-x", "attach-sheet"],
  ["source-viewer-x", "source-viewer"],
])
  $(btn).onclick = () => $(dlg).close();

$("model-pick").onclick = () => openSettings(true);

// Proof-seeking consent is still the switch's own state (P13's amendment) —
// it just lives on the composer now, next to the question it governs, rather
// than in this dialog. Wired with the other switch, above. The state it
// writes is read per turn, never mid-crossing.
// Nothing is connected yet. When a model is actually there, connecting is not
// a decision anyone is making — it is the only outcome of the only dialog on
// offer — so the page does it and lands on the conversation. The dialog opens
// only when there is a real choice to make: nothing reachable, or nothing
// pulled. The picker stays in the chip for anyone who wants a different rung.
fillModels().then(() => {
  if (!state.ready) {
    if (state.offeredModels.length) connect();
    else openSettings(true);
  }
  // The routes are probed once the model picker has settled, so Ollama's
  // answer is what fillModels actually found, not a race with it.
  probeRoutes().catch(() => {});
  // The room (P119): a share link opened in the address bar, and the room
  // this browser last preserved to. The key is read off the fragment and the
  // fragment is dropped from the bar at once; nothing is joined until the
  // person is signed in, and the sheet says the chat opens after.
  const shared = parseShareLink(location.href);
  if (shared) {
    const link = location.href;
    history.replaceState(null, "", stripShareFragment(location.href));
    joinInto(link).then((line) => addMessage("assistant", line)).catch((e) => addMessage("assistant", `the shared link could not be opened: ${matrixGap(e)}`));
  } else if (foldMatrix.locked) {
    state.matrixRoom = localStorage.getItem("fold-matrix-room") || null;
    addMessage("assistant", "this browser's room keys are sealed — the unlock sheet is open (/matrix unlock)");
    openMatrixSheet("unlock");
  } else {
    state.matrixRoom = localStorage.getItem("fold-matrix-room") || null;
    if (state.matrixRoom && !foldMatrix.status().rooms.some((r) => r.id === state.matrixRoom)) state.matrixRoom = null;
    if (state.matrixRoom && foldMatrix.pendingInvites(state.matrixRoom).length) startInviteWatch(state.matrixRoom);
  }
});
// The sign-in sheet: the password is read once, cleared, sent in Matrix's own
// login call to the homeserver named — and the outcome is drawn as a message,
// never as a turn, so the sheet's fields are never in the transcript.
$("matrix-login-sub").dataset.base = $("matrix-login-sub").textContent;
$("matrix-login-cancel").onclick = () => $("matrix-login").close("cancel");
// The sheet is handled on its form's SUBMIT (a button, Enter in a field, or
// requestSubmit all raise it) — not on the dialog's close event, which the
// embedded browser this was rehearsed in never fired for a method=dialog
// submission. The password is read once, the field cleared, the dialog
// closed, and the login call made; the outcome is drawn as a message, never
// as a turn, so the sheet's fields are never in the transcript.
for (const id of ["mx-hs", "mx-user", "mx-pass"]) $(id).addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); $("matrix-login-form").requestSubmit($("matrix-login-form").querySelector("button[value=login]")); } });
async function signInFromSheet(hs, user, pass) {
  if (!hs || !user || !pass) { addMessage("assistant", "sign-in needs a homeserver, a user name and a password — nothing was sent"); return; }
  try {
    const st = await foldMatrix.login(hs, user, pass);
    addMessage("assistant", `signed in as ${st.user} on ${st.hs} — this browser now holds a session and an identity pair for it`);
    // A different account on the same browser cannot reach the room the last
    // one pointed at; stop pointing at it rather than failing every door.
    if (state.matrixRoom && !st.rooms.some((x) => x.id === state.matrixRoom)) { const was = forgetRoom(`signed in as ${st.user}, which holds no key for it`); addMessage("assistant", `this chat no longer points at ${was} — ${st.user} holds no key for it; /preserve makes a room this account owns`); }
    if (state.matrixPendingLink) { const line = await joinInto(state.matrixPendingLink); addMessage("assistant", line); }
    renderPool();
  } catch (e) { addMessage("assistant", `sign-in failed: ${matrixGap(e)} — nothing but the login call went to ${hs}`); }
}
async function sheetAct(mode, hs, user, secret) {
  try {
    if (mode === "login") return signInFromSheet(hs, user, secret);
    if (!secret) { addMessage("assistant", "nothing was typed — nothing changed"); return; }
    if (mode === "lock") { await foldMatrix.lock(secret); addMessage("assistant", "sealed: what this browser keeps for the room is now readable only with your passphrase; it is asked for on every page load"); return; }
    if (mode === "unlock-off") { await foldMatrix.clearLock(secret); addMessage("assistant", "unsealed for good: this browser keeps its session and keys in plain storage again"); return; }
    if (mode === "unlock") {
      const st = await foldMatrix.unlock(secret);
      addMessage("assistant", `unlocked${st.user ? ` — signed in as ${st.user}` : ""}`);
      if (state.matrixRoom && !st.rooms.some((r) => r.id === state.matrixRoom)) state.matrixRoom = null;
      if (state.matrixPendingLink) addMessage("assistant", await joinInto(state.matrixPendingLink));
      renderPool(); return;
    }
    if (mode === "words") { if (!state.matrixPendingLink) return; addMessage("assistant", await joinInto(state.matrixPendingLink, { passphrase: secret })); return; }
  } catch (e) { addMessage("assistant", `${mode}: ${matrixGap(e)}`); }
}
$("matrix-login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const hs = $("mx-hs").value.trim(), user = $("mx-user").value.trim(), secret = $("mx-pass").value;
  $("mx-pass").value = "";
  $("matrix-login").close("login");
  const mode = sheetMode; sheetMode = "login";
  void sheetAct(mode, hs, user, secret);
});
$("model-menu-pool").onclick = () => { settingsDialog.close(); renderPool(); $("pool").showModal(); if (state.matrixRoom) foldMatrix.mouths(state.matrixRoom).then(renderPool).catch(() => {}); };
$("pool-refresh").onclick = () => { if (state.matrixRoom) foldMatrix.mouths(state.matrixRoom).then(renderPool).catch((e) => { $("pool-sub").textContent = matrixGap(e); }); };
$("pool-serve").onclick = async () => {
  try { if (roomServing) { roomServing.controller.abort(); roomServing = null; } else await startServing(state.matrixRoom); }
  catch (e) { $("pool-this").textContent = matrixGap(e); }
  renderPool();
};

/**
 * The routes, probed. Ollama's answer is what fillModels already found;
 * WebGPU is the rung's own blocker; the explore server is one light GET on
 * its lightest route; serve.mjs's API is reachable exactly when the page's
 * own origin serves serve.mjs itself (a static home never does — the build
 * carries only what the page loads). The result is said once beside the
 * status and kept for /routes.
 */
state.routes = null;
async function probeRoutes() {
  const where = whereAmI(location.href);
  const probes = {};
  probes.ollama = state.availableModels?.size ? { ok: true, models: state.availableModels.size - WEBLLM_MODELS.filter((m) => state.availableModels.has(m.id)).length } : { ok: false, detail: "no answer on :11434" };
  probes.webgpu = webgpuBlocker({ gpu: navigator.gpu, secureContext: window.isSecureContext });
  try {
    const r = await fetch(`${EXPLORE_BASE}/api/skills`, { cache: "no-store" });
    probes.explore = r.ok ? { ok: true, base: EXPLORE_BASE } : { ok: false, base: EXPLORE_BASE, detail: `answered ${r.status}` };
  } catch (e) {
    probes.explore = { ok: false, base: EXPLORE_BASE, detail: e.message };
  }
  try {
    const r = await fetch(new URL("serve.mjs", location.href), { method: "HEAD", cache: "no-store" });
    probes.api = r.ok ? { ok: true, base: location.origin } : { ok: false, base: location.origin, detail: `answered ${r.status}` };
  } catch (e) {
    probes.api = { ok: false, base: location.origin, detail: e.message };
  }
  probes.weights = webllmClient.weightsRoute ? { route: webllmClient.weightsRoute.route, base: webllmClient.weightsRoute.base } : null;
  state.routes = describeRoutes({ where, probes });
  // Said once, on the status chip the page already keeps (the composer's
  // status line is the turn loop's and is hidden between turns); the full
  // table is /routes.
  const st = $("status");
  if (st && /^ready · /.test(st.textContent) && !/ · routes: /.test(st.textContent)) st.textContent = `${st.textContent} · routes: ${state.routes.summary}`;
  return state.routes;
}


// The chip mirrors whatever the status line says, so every existing status
// update reaches it without threading a setter through the turn loop.
const statusEl = $("status");
/**
 * The chip says what is answering, and nothing else.
 *
 * It used to mirror the whole status line, so a model identity carried
 * "marks shown" or "attachments on" — messages about the reader's own
 * settings, which have nothing to do with what is answering — and the header
 * re-measured on every one of them. What a turn is DOING is worth showing;
 * where it shows is the status line by the composer, which is allowed to
 * change without moving anything else.
 */
const TRANSIENT = /^(marks |attachments |web lookups |pasted text|.* · (attached|from Explore))/;
const syncChip = () => {
  const s = statusEl.textContent;
  syncModelPick();
  // Working is a fact about the model, so it shows on the model's own control.
  const working = state.ready && s && !TRANSIENT.test(s) && !s.startsWith(readyLine());
  $("model-pick").dataset.working = working ? "yes" : "no";
  const line = $("status-line");
  if (line) {
    line.textContent = s && !s.startsWith("ready · ") ? s : "";
    line.hidden = !line.textContent;
    // A settings acknowledgement is worth saying once, not keeping. Work in
    // flight stays until the work does — clearing that would hide the fact
    // that something is still running.
    clearTimeout(line._fade);
    if (TRANSIENT.test(s)) line._fade = setTimeout(() => { line.textContent = ""; line.hidden = true; }, 2600);
  }
};
new MutationObserver(syncChip).observe(statusEl, {
  childList: true,
  characterData: true,
  subtree: true,
});
syncChip();

// Keep the layout's height math honest when the header wraps to two rows.
// --header-h must cover EVERY fixed row above <main>: main's height is
// calc(100dvh - var(--header-h)), so any such row this misses is height
// main claims and the composer loses off the bottom of the screen. Today
// <header> is the only one — a bar added between it and <main> has to be
// summed in here too, which is a mistake this file has already made once.
const aboveMain = [document.querySelector("header")].filter(Boolean);
const trackHeader = () =>
  document.documentElement.style.setProperty(
    "--header-h",
    `${aboveMain.reduce((h, el) => h + el.offsetHeight, 0)}px`,
  );
const headerObserver = new ResizeObserver(trackHeader);
for (const el of aboveMain) headerObserver.observe(el);
trackHeader();

$("composer").onsubmit = (e) => {
  e.preventDefault();
  const q = $("input").value.trim();
  if (!q || !state.ready) return;
  $("input").value = "";
  if (state.busy) {
    state.queue.push(q);
    const el = addMessage("user", q);
    el.classList.add("queued");
    el.querySelector(".body").append(Object.assign(document.createElement("span"), { className: "queue-tag", textContent: "queued" }));
    return;
  }
  guardedSend(q);
};

$("input").onkeydown = (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    $("composer").requestSubmit();
  }
};
