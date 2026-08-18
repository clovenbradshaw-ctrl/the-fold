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
  buildRecordSystemMessage,
  buildSummarySystemMessage,
  buildSummaryUpdatePrompt,
  buildWarrantRecord,
  charCount,
  emptySummary,
  mechanicalFoldLine,
  updateSummaryWithFold,
} from "./fold.js";

import { RENDERABLE, parseSegments, tableFrom, toDocument } from "./artifact.js";
// skills.js's balanced-object walk, reused as the one mechanical reading of
// "the JSON an ollama reply carried" (the delta grammar's extractor).
import { extractObject } from "./skills.js";

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
} from "./editor.js";

import { NOTHING, buildTable, chartOf, detectChart, detectTable, toMarkdown } from "./tables.js";

import { checkGrounding, unsupportedClaims } from "./grounding.js";

import { attribute, attributedRefs } from "./cite.js";

import { needsDecomposition, runHolonicTask } from "./holon.js";

import { MODEL_PICKER, ROUTE_KINDS, routeModel } from "./model-routing.js";

import { renderBlocksInto } from "./render.js";

import { autoRunnable, initTerminal, KEEP_PER_EXEC, runSandboxed } from "./term.js";

import { openInExplore, refContext } from "./explore-bridge.js";

import { classifySentences } from "./provenance.js";

import { emptyPaceLog, recordCall, foldPace, predictCall } from "./pace.js";

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
  recordAct,
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
import { lineIndex, outlineOfIndex } from "/engine/perceiver/text/segments.js";

// The engine's referent organs, same mount: names in a check resolve against
// the cast the material itself establishes — a name is a reference to a
// referent, not a byte sequence, and the engine owns what "the same name"
// means. cast.js injects these so it stays pure and node-testable.
import { splitSentences as engineSentences } from "/engine/perceiver/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "/engine/perceiver/text/surfaces.js";
import { makeCastResolver, makeCastHandles } from "./cast.js";

// The relation tier — the answer read against the edges the material itself
// binds (hypergraph.js; the P12 amendment). Same mount, same injection
// pattern: the engine's relation organs arrive as arguments and the module
// stays pure and node-testable.
// NOT material.js: it imports "fs" at top level (Node-only load()), and this
// page has no bundler to stub it — the tokenizer the reader needs is this
// repo's own folded one (source.js), which is also the fold retrieval and
// commonTerms already share, so the closed-class measure and the corpus's
// own term sets stay one alphabet.
import { discoverRelationVocab, extractRelations } from "/engine/perceiver/text/relations.js";
import { makeRelationReader } from "./hypergraph.js";
import { corroborateAtoms, CLAIM_STOPWORDS } from "./grounding.js";

// Proof-seeking: a flagged claim taken to the world through the one
// sanctioned egress (P13, explore-server's /api/web/*). proof.js is the
// pure half — queries from the claim's own words, verdicts as counted
// perspectives; this page only carries bytes between the two.
import {
  PROOF_PAGES_CONSULTED,
  PROOF_TARGETS_PER_TURN,
  assessPage,
  foldProof,
  proofQuery,
  proofTargets,
  rankResults,
} from "./proof.js";
import { hostOf, pageFaceUrl } from "./web.js";
import { snipClaim } from "./primary.js";
import { createClaimLedger, claimKey, composedSentence } from "./claims.js";
import { EXPLORE_BASE } from "./explore-bridge.js";

// The engine's surprise ladder — the measured answer to "what is most
// surprising", and the only licensed one. Same mount, plus /nul for the
// null module tiers.js stands on (serve.mjs carries both).
import { createTierStack, foldThrough } from "/engine/emergence/tiers.js";

// The engine's own append-only task log, same mount — anything built here is
// a thread on it, with EO notation on the constitutive entries. build-log.js
// injects it (cast.js pattern) so the mapping stays pure and node-testable.
import * as engineTaskLog from "/engine/holon/task-log.js";
import { makeBuildLog } from "./build-log.js";

const buildLog = makeBuildLog(engineTaskLog);

// The widget router (widget.js): does a code-bearing turn point at a build
// that already exists, or introduce a new one? Decided from the operator's
// own words and the engine's closed classes (perceiver/text/priors.js) —
// same injection pattern as buildLog above, so this stays node-testable
// against the real register (widget.test.mjs).
import * as enginePriors from "/engine/perceiver/text/priors.js";
import { makeWidgetRouter, scoutSpan } from "./widget.js";
import { witnessCode } from "./witness.js";
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

const castFor = makeCastResolver({
  splitSentences: engineSentences,
  extractSurfaces,
  discoverReferents,
  namesCorefer,
  diaNorm,
});

const handlesFor = makeCastHandles({
  splitSentences: engineSentences,
  extractSurfaces,
  discoverReferents,
});

// The relation reader's factory — one per passage set, pool = the live
// corpus (the closed-class measure needs the corpus's scale, not the
// turn's; hypergraph.js says why).
const relationsFor = makeRelationReader({
  splitSentences: engineSentences,
  extractSurfaces,
  discoverReferents,
  namesCorefer,
  diaNorm,
  discoverRelationVocab,
  extractRelations,
  tokenize,
});

// One meter per conversation, built on the engine's own tiers. reflex.js
// declares the numbers (window from the fold's own present, draws and alpha
// from read-frankenstein) — nothing here picks any.
const reflexMeter = makeReflexMeter({ createTierStack, foldThrough });

// S1's own meter — the same organ, the same declared numbers (aperture.js
// re-exports them from reflex.js rather than picking a second set), a
// separate instance so the world plane's belief never shares state with
// the self plane's.
const apertureMeter = makeApertureMeter({ createTierStack, foldThrough });

import {
  buildSourceBlock,
  checkCitations,
  chunkSource,
  retrieve,
  tokenize,
} from "./source.js";

// The base prompt is the constitution's fold — the one bounded paragraph of
// it a mouth can honor. Everything else in that document binds this app's
// code, not the model; constitution.js carries the article→organ map and the
// assay walks it.
import { CONSTITUTION_PROMPT as BASE_PROMPT } from "./constitution.js";
import { parseHandbookIndex, findChapter } from "./handbook.js";

const OLLAMA = "http://localhost:11434";
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
    const offered = MODEL_PICKER.map((name) => byName.get(name)).filter(Boolean);
    state.offeredModels = offered.map((m) => m.name);
    for (const m of offered) {
      const opt = document.createElement("option");
      opt.value = m.name;
      opt.textContent = `${m.name} · ${(m.size / 1e9).toFixed(1)}GB`;
      sel.append(opt);
    }
    sel.value = MODEL_PICKER[MODEL_PICKER.length - 1];
    if (!offered.length) $("status").textContent = "ollama has no models pulled";
  } catch {
    $("status").textContent = "ollama not reachable on :11434";
  }
}

async function connect() {
  state.model = $("model").value;
  state.ready = true;
  // The model's declared window, from the runtime's own mouth. The one
  // non-arbitrary meaning of "this prompt is too long" is this number.
  state.contextTokens = null;
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
  $("status").textContent = `ready · ${state.model}`;
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
 * host behind it.
 */
async function complete(messages, { onDelta, maxTokens, json, model } = {}) {
  // One request, to the one place a model lives. `model` is routed: plain
  // turns and the summary refresh spend the fastest rung; deep work (task,
  // bound, reflect) spends the model the user chose. Whatever it is, the
  // request, the pace ledger, and the status line all name the SAME model.
  const modelName = model ?? state.model;
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
      options: { num_predict: maxTokens ?? MAX_TOKENS },
    }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}: ${await res.text()}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let out = "";
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
      const delta = chunk.message?.content || "";
      if (!delta) continue;
      out += delta;
      // A caller's onDelta may return `true` to cancel the generation early
      // — predictive error correction: holon.js's runPart checks the
      // completed sentences so far against the offered passages, and a
      // draft already provably heading toward pure reproduction is stopped
      // before it burns the rest of its decode budget confirming what is
      // already known. The socket is cancelled, not just abandoned, so
      // Ollama stops computing tokens nobody will read.
      if (onDelta?.(out) === true) {
        try {
          await reader.cancel();
        } catch {
          // already closed — nothing to do
        }
        return out;
      }
    }
  }
  return out;
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

/** A command that arrived without its argument gets its usage line back — a
 * turn with no model in it, folded like any other so the exchange is on the
 * conversation's own record. */
function usageTurn(question, usage) {
  addMessage("user", question);
  const node = addMessage("assistant", usage);
  state.history.push(
    { role: "user", content: question },
    { role: "assistant", content: usage },
  );
  const turn = state.summary.turnCount + 1;
  logAct("answered-from-state", { what: "usage" });
  observeExchange(turn, question, usage);
  const fold = mechanicalFoldLine(question, usage);
  state.turnFolds.push(fold);
  state.summary = advanceSummaryFold(state.summary, fold);
  renderFold(node, { fold });
  renderThreads();
  $("status").textContent = `ready · ${state.model}`;
  releaseBusy();
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
  $("status").textContent = `ready · ${state.model}`;
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
  $("status").textContent = `ready · ${state.model}`;
  state.busy = false;
  $("send").disabled = false;
  $("input").focus();
  drainQueue();
}

function drainQueue() {
  if (state.busy || !state.queue.length) return;
  const next = state.queue.shift();
  // Remove the queued placeholder message from chat — send() will add the
  // real one through the turn function's own addMessage.
  const placeholder = document.querySelector(".msg.queued");
  if (placeholder) placeholder.remove();
  send(next);
}

function releaseBusy() {
  state.busy = false;
  $("send").disabled = false;
  $("input").focus();
  drainQueue();
}

async function send(question) {
  state.busy = true;
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

  // /learn's door: the terminal's own `learn` walk is graded on real
  // keystrokes there, which chat cannot offer — so here it points to
  // where that walk lives, and lists the vendored handbook's chapters
  // (theory this instrument is built on) as things chat CAN open directly.
  if (/^\/learn\s*$/.test(question) || /^\/learn\b/.test(question)) return learnTurn(question.replace(/^\/learn\s*/, ""), question);

  // A question about the app's own state is answered from that state. Nothing
  // is gained by handing a model rows it would have to paraphrase, and a
  // paraphrase of a data structure drops a row, rounds a number, or invents a
  // file — the three failures the rest of this design exists to refuse.
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

  // Self questions asked in words ("what surprised you most", "how do you
  // think"). Checked AFTER detectTable so a question the app can answer
  // about its material state keeps winning, and gated on the second-person
  // tell inside detectReflex so a question about the material — which must
  // always win — is never hijacked into introspection.
  const reflex = detectReflex(question);
  if (reflex === "reflect") return reflectTurn(question, question);
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
  return holonicTurn(question, question, needsDecomposition(question) ? "model" : "flat");
}

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
  $("status").textContent = `ready · ${state.model}`;
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
      const reply = await complete([{ role: "user", content: pickPrompt }], {
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
          const fReply = await complete(
            [{ role: "user", content: `Which file is the ${archetype} itself?\n${ofLang.map((f) => `- ${f.path}`).join("\n")}` }],
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
    $("status").textContent = `ready · ${state.model}`;
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
  renderFold(node, { fold });
  renderThreads();
  $("status").textContent = `ready · ${state.model}`;
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
async function foldTurn(n, instruction, typed, { rezero = false, trigger = null, tell = null } = {}) {
  const entry = state.builds.find((b) => b.n === n);
  if (!entry) {
    const have = state.builds.length
      ? `this conversation holds fold${state.builds.length === 1 ? "" : "s"} ${state.builds.map((b) => b.n).join(", ")}`
      : "this conversation holds no folds yet";
    return usageTurn(typed, `fold ${n} does not exist — ${have}.`);
  }

  addMessage("user", typed);
  const node = addMessage("assistant", "");
  const body = node.querySelector(".body");

  const cur = buildFold(entry, null);
  const lang = cur.seg?.lang ?? "";
  logAct("asked", { text: typed });

  // SIG FIRST: resolve the operator's own words to the region of the code
  // they name, mechanically, before any model call. A hit shrinks the
  // arena — the model is shown the scouted region, the edit only has to be
  // unique inside it, and the landing records what attention scoped.
  const scout = typeof cur.code === "string" ? scoutSpan(instruction, cur.code) : null;
  const arena = scout ? cur.code.slice(scout.span[0], scout.span[1]) : cur.code ?? "";

  // What the log already knows, said to the model: dead ends are not
  // re-walked (DEF entries) and known defects aim the ask (the last EVA
  // witness). Both are the log's own entries, quoted — never a model's
  // memory of itself.
  const refusals = entry.log.entries.filter((e) => e.operator === "DEF").slice(-2);
  const lastWitness = entry.log.entries.filter((e) => e.operator === "EVA").at(-1);
  const known =
    (refusals.length
      ? `\nEdits already tried and refused (do not repeat): ${refusals
          .map((e) => `find ${JSON.stringify(String(e.refusal?.ops?.[0]?.find ?? "").slice(0, 48))} — ${e.refusal?.gap?.kind}`)
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
  try {
    const reply = await complete([{ role: "user", content: opsPrompt }], {
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
      answer = await complete([{ role: "user", content: prompt }], {
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

  if (code == null) {
    // Typed gap: the door was walked, the target named, and nothing landed.
    note = `the reply carried no code — nothing landed on fold ${n}.`;
    logAct("revised", { fold: n, landed: false, gap: opsGap ?? "no code in reply" });
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
      const wNow = buildFold(entry, null);
      const w = witnessCode(wNow?.seg?.lang, wNow?.code);
      if (w.ok !== null) entry.log = buildLog.attachWitness(entry.log, { witness: w });
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
            (scout && landedPatch.within ? ` · within "${scout.term}"` : "") +
            (landedPatch.every ? ` · changed in ${places} places` : "")
          : "whole file") +
        (lastW ? (lastW.ok ? " · witness clean" : ` · witness: ${lastW.findings.length} finding(s)`) : "");
      note = rezero
        ? `fold ${n} · ground ${now.ground} · re-zeroed from your words · ${how}`
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
  autoRunAndDisclose(entry, chip);

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

  renderFold(node, { fold });
  renderThreads();
  $("status").textContent = `ready · ${state.model}`;
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

  let free = "";
  try {
    $("status").textContent = "free draft…";
    free = await complete(
      [
        { role: "system", content: BASE_PROMPT },
        { role: "user", content: sourceBlock ? `${question}\n\n${sourceBlock}` : question },
      ],
      { model: state.model },
    );
  } catch (err) {
    free = `[engine error: ${err.message || err}]`;
  }
  const freeGrounding = checkGrounding(free, passages, { question, resolveName });
  const freeAttr = attribute(free, passages, live);

  body.textContent = `${prep}\nA · done\nB · bound…`;
  let boundRaw = "";
  try {
    $("status").textContent = "bound…";
    boundRaw = await complete(
      [
        { role: "system", content: BOUND_SYSTEM_PROMPT },
        { role: "user", content: buildBoundPrompt(question, sourceBlock) },
      ],
      { json: buildBoundSchema({ handles, cells }), model: state.model },
    );
  } catch (err) {
    boundRaw = "";
  }
  const parsed = parseBound(boundRaw);
  const flat = parsed.degraded ? boundRaw || "(bound reply unusable — typed degradation)" : flattenBound(parsed);
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

  await refreshSummary(fold, arrivals);
  renderFold(node, { fold, record });
  renderThreads();
  $("status").textContent = `ready · ${state.model}`;
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

  let answer = "";
  try {
    $("status").textContent = "reflecting…";
    answer = await complete(
      [
        { role: "system", content: sys },
        { role: "user", content: question },
      ],
      { onDelta: (out) => { body.textContent = out; }, model: state.model },
    );
  } catch (err) {
    answer = `[engine error: ${err.message || err}]`;
  }

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

  await refreshSummary(fold, arrivals);
  renderFold(node, { fold, record });
  renderThreads();
  renderEvidence(node, question, offered, used, grounding, "self ledger");
  $("status").textContent = `ready · ${state.model}`;
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
 */
async function refreshSummary(fold, arrivals = null) {
  state.turnFolds.push(fold);
  if (
    arrivals &&
    exchangeHeldGround(arrivals) &&
    state.heldFolds < MAX_FOLDS_IN_PROMPT - 1
  ) {
    logAct("carried", { streak: state.heldFolds + 1 });
    state.heldFolds += 1;
    state.summary = advanceSummaryFold(state.summary, fold);
    return;
  }
  state.heldFolds = 0;
  try {
    $("status").textContent = "folding…";
    const raw = await complete(
      [
        { role: "system", content: FOLD_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildSummaryUpdatePrompt(state.summary, [
            ...(state.summary.folds || []),
            fold,
          ]),
        },
      ],
      { effort: "low", maxTokens: FOLD_MAX_TOKENS, json: FOLD_SCHEMA, model: routeModel(ROUTE_KINDS.SUMMARY, { offered: state.offeredModels, selected: state.model }) },
    );
    state.summary = updateSummaryWithFold(state.summary, fold, raw);
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
async function holonicTurn(task, typed = task, planMode = "model") {
  addMessage("user", typed);
  const node = addMessage("assistant", "");
  const body = node.querySelector(".body");

  logAct("asked", { text: task });

  // The model this turn spends. A flat turn (the common little question) is
  // the fastest rung; a decomposed task is the model the user chose. The
  // same name feeds the call, the ticker's pace, and the status line.
  const turnModel = routeModel(planMode === "model" ? ROUTE_KINDS.DEEP : ROUTE_KINDS.FLAT, {
    offered: state.offeredModels,
    selected: state.model,
  });

  const foldedRefs = (state.summary.records || []).flatMap((r) => r.refs);
  const live = liveChunks();

  // The run narrates itself while it works — the thinking, live, in three
  // layers: the log lines (what the turn decided and found), a ticker (what
  // phase it is in and for how long, against the measured pace), and the
  // draft streaming in as the model writes it. The log is kept and
  // disclosed under the answer afterward; the draft area is display-only
  // and is replaced by the checked rendering when the turn lands.
  const log = [];
  const logEl = document.createElement("div");
  logEl.className = "thinking";
  const tickEl = document.createElement("div");
  tickEl.className = "thinking";
  const draftEl = document.createElement("div");
  draftEl.className = "prose";
  body.replaceChildren(logEl, tickEl, draftEl);

  const show = (line) => {
    log.push(line);
    logEl.textContent = log.join("\n");
    node.scrollIntoView({ block: "end" });
  };

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
    result = await runHolonicTask({
      task,
      chunks: live,
      call: (messages, opts) => complete(messages, { ...opts, model: turnModel }),
      foldedRefs,
      makeNameResolver: castFor,
      // The relation tier is the expensive check and the one with a whole
      // verdict vocabulary behind it. Plain mode does not ask for it, so it
      // is never computed — off means not run, not run-and-hidden.
      makeRelationReader: state.grounded ? relationsFor : null,
      // The link tier (links.js): a cited URL is fetched through the SAME
      // standing web consent proof-seeking already asks for — an automatic
      // crossing the instrument decided to make, not a click the reader
      // made, so it lives behind the same switch. Off means every cited URL
      // ships `unexamined`, never silently treated as checked.
      checkLink: state.webProof ? checkLinkCitation : null,
      planMode,
      // Verbatim recent history for the chat path (no material). The
      // discourse slice is the folded fallback when this window is empty.
      // Sliced at the regime's present, not the constant: a startled
      // reader narrows onto now; the turns that fall out are already in
      // the fold.
      chatHistory: state.history.slice(-present),
      // The discourse slice: one line, not the carried block. Topic, flow,
      // entities — what a part needs to resolve "he" and "the report";
      // anything more it retrieves.
      discourse: [s.topic, s.flow, (s.entities || []).join(", ")]
        .filter(Boolean)
        .join(" · ")
        .slice(0, 300),
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
    renderFold(node, { fold, ran: log });
    renderThreads();
    $("status").textContent = `ready · ${state.model}`;
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
  await refreshSummary(fold, arrivals);
  renderFold(node, { fold, record, ran: log });
  renderThreads();
  if (!state.grounded) {
    $("status").textContent = `ready · ${state.model}`;
    releaseBusy();
    return;
  }
  // Evidence terms are the plan's own words — each part retrieved on its own
  // description, so the task's terms alone would call honest matches misses.
  const evidenceQuestion = `${task} ${result.plan.parts.map((p) => `${p.label} ${p.description}`).join(" ")}`;
  renderEvidence(node, evidenceQuestion, offered, result.refs, null);
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
  $("status").textContent = `ready · ${state.model}`;
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
  // The fold is disclosed, not displayed. Printed under every turn it just
  // repeated the exchange you had already read; kept behind a one-word
  // affordance, it is there the moment you want to ask "what did this turn
  // actually leave behind?" — which is the question the fold answers.
  //
  // That word is "thinking" (user, 2026-08-17): the box is the resting place
  // of the same narration the turn streams live while it works — `.thinking`
  // is already that element's class — plus what the narration produced. The
  // word "fold" is spent on the artifact type in the Folds pane and may not
  // mean two things. The `.fold` CLASS below is left alone deliberately: it
  // is the disclosure's shared styling, nested boxes included, and renaming
  // it would buy nothing a reader ever sees.
  el.innerHTML =
    `<div class="who"></div><div class="body"></div>` +
    (role === "assistant"
      ? `<div class="turn-meta">` +
        // ONE affordance per turn. Everything the turn left behind — the
        // fold line, the summary, the record, the material it was checked
        // against, how a task ran — opens from the same word. Two
        // disclosures asked the reader to know the taxonomy before opening;
        // one asks only curiosity.
        `<details class="fold"><summary>thinking</summary><p></p></details>` +
        `</div>`
      : "");
  el.querySelector(".who").textContent = role === "user" ? "you" : "model";
  el.querySelector(".body").textContent = text;
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
  const segments = parseSegments(answer);
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
    const chip = routeAndPublish(seg, routingTask, instruction, landedThisTurn);
    body.append(chip);
    // The chip is the conversation handle; for renderable artifacts (html,
    // svg), the widget itself also appears inline — no click required. This
    // is the segment's OWN code, so a revision's preview is the revision's,
    // not stale bytes left over from the build's first version.
    if (RENDERABLE.has(seg.lang)) {
      body.append(artifactNode(seg, undefined, seg.code, { scripts: true }));
    }
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
  // findings still land on the record and in the thinking disclosure —
  // what is withheld is the drawing, never the finding.
  const buildTurn = landedThisTurn.some((b) => b.type === "code");
  if (buildTurn) body.closest(".msg")?.classList.add("build-turn");

  // The turn's epistemic state, at a glance: how much of what was just said
  // stands on the material, how much on the model, and how much states
  // facts nothing backs. Counted from the same classification the marks
  // were drawn from — one measurement, two renderings.
  // The tally is a reading of the checks. With checking off there are no
  // checks to read, and "0 sentences stand on the material" would be a
  // measurement nobody took dressed as one that was.
  if (classified.length && state.grounded && !buildTurn) {
    // A cited-but-drifted sentence counts under claims — the drift is the
    // salient fact — so the three buckets partition cleanly.
    const claims = classified.filter((e) => e.absent.length).length;
    const m = classified.filter((e) => e.ground === "material" && !e.absent.length).length;
    const voice = classified.filter((e) => e.ground === "model" && !e.absent.length).length;
    // The relation tier's counts, from the same classification. Bound edges
    // are quiet support; contradicted and unbound are the news.
    const edges = classified.flatMap((e) => e.edges ?? []);
    const bound = edges.filter((c) => c.verdict === "bound").length;
    const broken = edges.filter((c) => c.verdict === "contradicted" || c.verdict === "unbound").length;
    const tally = document.createElement("p");
    tally.className = `fold-note grounds${claims || broken ? " bad" : ""}`;
    tally.textContent =
      `standing on the material: ${m} sentence(s)` +
      (voice > 0 ? ` · the model's own words: ${voice}` : "") +
      (claims ? ` · claiming things nothing given backs: ${claims}` : "") +
      (bound ? ` · statements the material also makes: ${bound}` : "") +
      (broken ? ` · statements it never makes: ${broken}` : "");
    body.append(tally);
  }
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
    for (const c of (entry.edges ?? []).filter((c) => c.verdict === "contradicted" || c.verdict === "unbound")) {
      const badge = document.createElement("button");
      badge.className = `edge-badge ${c.verdict}`;
      // The badge names the exact words it means — a blanket "never says
      // this" on the sentence tars its backed halves too (measured live:
      // the model's gloss "significant battle" flagged a sentence whose
      // 70,000 stood perfectly on the material).
      const disputed = `${c.verb} ${c.object}`.trim();
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
      badge.dataset.proofKey = [c.subject, c.verb, c.object]
        .flatMap((s) => String(s).split(/\s+/))
        .filter((w) => w.length > 2)
        .join(" ")
        .toLowerCase();
      const near = c.verdict === "contradicted" ? c.bound?.[0] : c.nearest?.[0];
      badge.title =
        `${c.subject} —${c.verb}${c.polarity === "-" ? " (negated)" : ""}→ ${c.object}: ` +
        (c.verdict === "contradicted"
          ? `the material binds this edge with the OPPOSITE polarity.`
          : `every word is in the material, but the text never binds this edge.`) +
        (near ? ` It binds: ${near.subject} —${near.verb}→ ${near.object}. Press to read that passage.` : " Press to search the material.");
      badge.onclick = () => {
        const ref = near?.refs?.[0];
        if (ref) reopen(ref);
        else groundHunt(`${c.subject} ${c.verb} ${c.object}`);
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
 */
function routeAndPublish(seg, task, instruction, landedThisTurn) {
  if (seg.type !== "code" && seg.type !== "table") {
    return publishBuild(seg, undefined, instruction);
  }
  const known = state.builds.map((b) => ({ n: b.n, ...kindOf(b), text: buildWords(b) }));
  const route = widgetRouter.routeSegment(seg, task ?? "", known, { landedThisTurn });

  if (route.kind === "new") {
    const chip = publishBuild(seg, undefined, instruction);
    const made = state.builds[state.builds.length - 1];
    landedThisTurn.push({ n: made.n, type: seg.type, lang: seg.lang });
    return chip;
  }

  const entry = state.builds.find((b) => b.n === route.n);
  const landed = { ...seg, lang: route.lang && route.lang !== seg.lang ? route.lang : seg.lang };
  const before = entry.log.entries.length;
  entry.log =
    route.kind === "rezero"
      ? buildLog.rezeroBuild(entry.log, {
          code: landed.code,
          seg: landed,
          caption: defaultCaption(landed),
          trigger: route.trigger,
          tell: route.tell,
        })
      : buildLog.reviseBuild(entry.log, { code: landed.code, reason: "restated" });
  if (entry.log.entries.length > before) {
    entry.cursor = null;
    entry.draft = null;
    mirrorBuild(entry, before);
  }
  persistBuilds();
  renderBuilds(entry.n);
  landedThisTurn.push({ n: entry.n, type: seg.type, lang: landed.lang });
  return buildChip(entry, buildFold(entry, null)?.caption ?? defaultCaption(landed));
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
 * cursor by default, at the live head with `at = null`. */
const buildFold = (entry, at = entry.cursor) => buildLog.foldBuild(entry.log, at ?? Infinity);
const buildCode = (entry) => buildFold(entry, null)?.code;
const buildRunnable = (entry) => {
  const seg = buildFold(entry, null)?.seg;
  return seg?.type === "code" && (RUNNERS.has(seg.lang) || RENDERABLE.has(seg.lang));
};

/** The run's declared caps — serve.mjs's own numbers, named here so the
 * result entry states what bounds it ran under. */
const RUN_PARAMS = (lang) => ({ lang, timeoutMs: 10_000, maxOutput: 64 * 1024 });

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
 * derived at render time, never stored. */
function foldRow(entry) {
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
      meta.textContent =
        `v${r.version} · ${r.lang || r.type} · ${r.addenda} addend${r.addenda === 1 ? "um" : "a"}` +
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

/** One fold's full card: address, controls, cursor, and the artifact — every
 * line of it a fold of the entry's log at the reader's cursor. */
function buildCard(entry, highlight) {
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
    const flags = buildLog.conform(b.log);
    if (flags.length) {
      console.error(`fold ${b.n}: production order violated`, flags);
      logAct("errored", { where: "cube-conformance", fold: b.n, flags: flags.map((f) => `${f.kind}${f.from ? ` ${f.from}→${f.to}` : ""}`) });
    }
  }
  try {
    const conv = state.convos[state.active];
    const data = state.builds.map(({ n, turn, log, draft }) => ({
      n,
      turn,
      entries: log.entries,
      draft: draft ?? null,
    }));
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

/**
 * The evidence for a turn, as a table, built from the retrieval result itself.
 *
 * This is the case the artifact parser cannot cover: the rows exist before the
 * model says anything, so there is nothing to read them out of. Which passages
 * were handed over, which of the question's terms each one matched, and
 * whether the answer actually cited it — all of it is known mechanically, and
 * a turn's evidence should not depend on the model having chosen to tabulate
 * it.
 */
function renderEvidence(node, question, passages, used, grounding, label = "material") {
  // Into the turn's ONE disclosure, as its section — the same affordance
  // everything else the turn left behind opens from.
  const box = node.querySelector(".turn-meta > .fold p");
  if (!box || !passages.length) return;
  const terms = [...new Set(tokenize(question))];
  const cited = new Set(used);

  const seg = tableFrom(passages, [
    { label: "address", get: (p) => chipText(p.ref) },
    {
      label: "matched",
      get: (p) => terms.filter((t) => p.terms.has(t)).join(", "),
    },
    { label: "chars", get: (p) => p.text.length.toLocaleString() },
    { label: "cited", get: (p) => (cited.has(p.ref) ? "yes" : "—") },
  ]);

  const parts = [
    section(`${label} · ${passages.length} retrieved, ${cited.size} cited`),
    artifactNode(seg, null),
  ];
  // What the answer said that the material does not: the check that catches an
  // invented figure, which neither the address check nor attribution can see.
  if (grounding?.examined) {
    const note = document.createElement("p");
    note.className = grounding.clean ? "fold-note" : "fold-note bad";
    note.textContent = grounding.clean
      ? `every figure and name in the answer appears in the ${label} (${grounding.atomsChecked} checked)`
      : `not in the ${label}: ${unsupportedClaims(grounding).join("; ")}`;
    parts.push(note);
  }
  box.append(...parts);
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
    renderProofResult(slot, out);
    status.textContent =
      out.verdict === "web-corroborated"
        ? `✓ ${out.stating?.length ?? 0}/${out.consulted}`
        : out.verdict === "web-uncorroborated"
          ? `∅ 0/${out.consulted}`
          : "·";
    chip.classList.add(out.verdict);
    // The ledger is the one record; the chip's tooltip and the detail's
    // first line are projections of it — every tier's verdict composed.
    if (ledger) {
      ledger.note(target, "web", out);
      const line = composedSentence(ledger.state(key));
      if (line) {
        chip.title = line;
        const lp = document.createElement("em");
        lp.className = "fold-note";
        lp.textContent = line;
        slot.prepend(lp);
      }
    }
    onVerdict?.(out);
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
 * The grounding disclosure for a finished turn — the same single fold
 * affordance everything else opens from. Three parts, all read off checks
 * the turn already ran: the relation tier's verdicts (with click-through
 * to the addresses that bind or contradict each edge), the corroboration
 * count for every checkable atom (support graded by independent
 * perspectives, never a bit), and — for what the material does not back —
 * the door to the world: proof-seeking per claim, automatic up to the
 * declared budget when the consent toggle is on.
 */
function renderGrounding(node, { answer, offered, findings = [], relations = [], quotes = [], quoteCorrections = [], question = "" }) {
  const box = node.querySelector(".turn-meta > .fold p");
  if (!box) return;
  // Fold membership (renderAnswer sets the class): this turn landed a code
  // build, so the prose being checked is the model's explanation of its own
  // artifact — content that belongs to the fold, not to the chat's claim
  // ledger. The chip strip and the automatic proof-seeking are withheld
  // from the chat surface; the analytic parts still land inside the
  // thinking disclosure below, and the record keeps every finding.
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
    const edgeCount = new Set(measured.flatMap((r) => (r.edges ?? []).map((e) => `${e.subject}|${e.verb}|${e.object}`))).size;
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
    head.textContent = `${mark} ${plainVerdict}: “${c.subject} —${c.verb}${c.polarity === "-" ? " (negated)" : ""}→ ${c.object}”`;
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
      nb.textContent = `it says: ${n.subject} —${n.verb}→ ${n.object}`;
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
      onVerdict: (out) => {
        if (out.verdict !== "web-corroborated" && out.verdict !== "web-uncorroborated") return;
        for (const b of node.querySelectorAll(".edge-badge")) {
          if (b.dataset.proofKey !== key) continue;
          const webBit =
            out.verdict === "web-corroborated"
              ? ` · web: stated by ${out.stating.length} of ${out.consulted} page(s)`
              : ` · web: 0 of ${out.consulted} page(s)`;
          b.textContent = b.textContent.replace(/ · web:.*$/, "") + webBit;
          b.classList.toggle("web-backed", out.verdict === "web-corroborated");
          b.title += ` Web check: ${out.sentence}.`;
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
  // Mount the chips on the turn itself, above the fold — quiet until they
  // have counts, the audit one click away. Never on a build turn: the
  // chips would be web-check doors on the model's own section labels.
  if (strip.childElementCount && !buildTurn) {
    const meta = node.querySelector(".turn-meta");
    const foldEl = node.querySelector(".turn-meta > .fold");
    if (meta && foldEl) {
      meta.insertBefore(strip, foldEl);
      meta.insertBefore(panel, foldEl);
    } else box.append(strip, panel);
  }
  // Sequential, not parallel: the egress is one server doing recorded
  // crossings, and a turn must not fan out a burst of them. A build turn
  // spends none: corroborating "Event Listeners" against the web is a
  // crossing in service of nothing — the artifact's ground is its run.
  if (autorun.length && !buildTurn) (async () => { for (const run of autorun) await run(); })();
}

/**
 * One renderer for both kinds of artifact — the ones read out of an answer and
 * the ones this app builds from its own rows. A table assembled mechanically
 * and a table the model happened to write arrive here in the same shape, and
 * there is no reason for them to look different.
 */
function artifactNode(seg, caption, code, { scripts = false } = {}) {
  const art = document.createElement("figure");
  art.className = "artifact";
  const cap = document.createElement("figcaption");
  cap.textContent =
    caption ??
    (seg.type === "table"
      ? `table · ${seg.rows.length} row${seg.rows.length === 1 ? "" : "s"}`
      : seg.lang || "code");
  art.append(cap);

  if (seg.type === "table") {
    const table = document.createElement("table");
    const thead = table.createTHead().insertRow();
    for (const h of seg.head) {
      const th = document.createElement("th");
      th.textContent = h;
      thead.append(th);
    }
    const tbody = table.createTBody();
    for (const row of seg.rows) {
      const tr = tbody.insertRow();
      for (const cell of row) tr.insertCell().textContent = cell;
    }
    const wrap = document.createElement("div");
    wrap.className = "table-wrap";
    wrap.append(table);
    art.append(wrap);
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
    art.append(frame);
    const src = document.createElement("details");
    src.innerHTML = "<summary>source</summary>";
    const pre = document.createElement("pre");
    pre.textContent = code ?? seg.code;
    src.append(pre);
    art.append(src);
  } else {
    const pre = document.createElement("pre");
    pre.textContent = code ?? seg.code;
    art.append(pre);
  }
  return art;
}

/**
 * The comparison that means something is conversation against conversation:
 * everything the transcript holds, against what stood in for it this turn.
 * Retrieved material and the base prompt are the same size on turn 1 and turn
 * 400, so counting them here would flatter the fold on a short conversation
 * and tell you nothing about a long one.
 */
function measure() {
  return {
    transcript: charCount(state.history),
    carried:
      (buildSummarySystemMessage(state.summary)?.length ?? 0) +
      (buildRecordSystemMessage(state.summary)?.length ?? 0) +
      charCount(state.history.slice(-RECENCY_WINDOW)),
    material: state.lastMaterialChars,
    messages: state.history.length,
    raw: Math.min(state.history.length, RECENCY_WINDOW),
  };
}

/**
 * The whole fold for one turn, under that turn.
 *
 * A panel showing the fold's current state can only ever show the latest one,
 * which is the wrong shape for a thing that happens per turn: the question you
 * actually have is "what did THIS turn leave behind, and what was it given?"
 * — and that question is asked while looking at the turn. So the disclosure
 * carries all of it, and the fold is not a tab.
 */
function renderFold(node, { fold, record, sent, ran }) {
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
  const out = box.querySelector("p");
  out.textContent = "";

  const line = document.createElement("div");
  line.className = "fold-line";
  line.textContent = fold;
  out.append(line, foldNote(measure()));

  const s = state.summary;
  const fields = [
    ["topic", s.topic],
    ["flow", s.flow],
    ["entities", s.entities?.join(", ")],
    ["carried context", s.context],
  ].filter(([, v]) => v);
  // The running summary is the app's own bookkeeping (what it will carry
  // into the next turn), not part of this answer's grounding — showing it
  // open here read as if the summary were being grounded (user, 2026-08-17).
  // Collapsed by default, same affordance as "how the task ran".
  if (fields.length) {
    const dl = document.createElement("dl");
    dl.className = "fields";
    for (const [k, v] of fields) {
      const dt = document.createElement("dt");
      dt.textContent = k;
      const dd = document.createElement("dd");
      dd.textContent = v;
      dl.append(dt, dd);
    }
    const det = document.createElement("details");
    det.className = "fold";
    det.innerHTML = "<summary>what the app carries forward — its own bookkeeping, not the answer's grounding</summary>";
    det.append(dl);
    out.append(det);
  }

  if (record) {
    out.append(section("on record · what this turn established"), recordNode(record));
  }

  // A holonic turn's run log — which part retrieved what, what failed its
  // check — disclosed alongside the fold, because it is the same kind of
  // answer to the same question: what did this turn actually do?
  if (ran?.length) {
    const det = document.createElement("details");
    det.className = "fold";
    det.innerHTML = "<summary>how the task ran</summary>";
    const pre = document.createElement("pre");
    pre.className = "block";
    pre.textContent = ran.join("\n");
    det.append(pre);
    out.append(det);
  }

  if (sent?.length) {
    const det = document.createElement("details");
    det.className = "fold";
    det.innerHTML = "<summary>what was sent</summary>";
    const wrap = document.createElement("div");
    for (const m of sent) {
      const pre = document.createElement("pre");
      pre.className = "block";
      const role = document.createElement("span");
      role.className = "role";
      role.textContent = `${m.role} · ${m.content.length} chars`;
      pre.append(role, document.createTextNode(m.content));
      wrap.append(pre);
    }
    det.append(wrap);
    out.append(det);
  }
}

function section(text) {
  const h = document.createElement("p");
  h.className = "fold-section";
  h.textContent = text;
  return h;
}

function foldNote({ transcript, carried, material, messages, raw }) {
  const p = document.createElement("p");
  p.className = "fold-note";
  p.textContent =
    `${carried.toLocaleString()} chars of conversation carried, standing in for a ${transcript.toLocaleString()}-char transcript` +
    ` · ${messages} messages exist, ${raw} sent raw` +
    (material ? ` · plus ${material.toLocaleString()} chars of material` : "") +
    // Said out loud rather than hidden, because the first few turns look like
    // the fold losing: its framing is a fixed cost, paid in full on turn one.
    // What is flat is what happens after.
    (carried > transcript ? " — the framing is a fixed cost, not yet outgrown" : "");
  return p;
}

function recordNode(r) {
  const el = document.createElement("div");
  el.className = "record";
  const turn = document.createElement("div");
  turn.className = "turn";
  turn.textContent = `turn ${r.turn}${r.channels.length ? ` · carried by ${r.channels.join(", ")}` : ""}`;
  // The plane, said where the record is read. A self record supports claims
  // about how the instrument worked; drawn the same as a material record,
  // it would borrow an authority it does not have.
  if (r.plane === "self")
    turn.textContent += " · plane: self — checked against the instrument's own ledger, not the material";
  el.append(turn);
  if (r.refs.length) {
    const line = document.createElement("div");
    line.className = "line";
    line.innerHTML = '<span class="label">checked against </span>';
    for (const ref of r.refs) {
      const b = document.createElement("button");
      b.className = "ref";
      const label = refLabel(ref);
      b.textContent = chipText(ref);
      if (label) b.title = ref;
      b.onclick = () => reopen(ref);
      line.append(b);
    }
    el.append(line);
  }
  for (const [label, list, bad] of [
    ["not supported by that material", r.unsupported, true],
    ["left open", r.open, false],
  ]) {
    if (!list.length) continue;
    const line = document.createElement("div");
    line.className = `line${bad ? " bad" : ""}`;
    line.innerHTML = `<span class="label">${label} </span>`;
    line.append(document.createTextNode(list.join("; ")));
    el.append(line);
  }
  return el;
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
  const ctx = isSelfRef(ref)
    ? selfRefContext(state.reflexLog, ref)
    : refContext(state.sources, ref);
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
  explore.hidden = isSelfRef(ref);
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

function addSource(name, text) {
  if (!text.trim()) return;
  // The `self:` namespace is the instrument's own plane. A file wearing it
  // would make a self address ambiguous about which plane it names — the
  // one ambiguity the whole design exists to refuse.
  if (isReservedSourceName(name)) {
    $("status").textContent = `"${name}" is reserved for the instrument's own plane — rename it and add it again`;
    return;
  }
  state.sources[name] = text;
  state.chunks = state.chunks
    .filter((c) => c.source !== name)
    .concat(chunkSource(name, text, { boundaries: discoverBoundaries(text) }));
  renderSources();
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
    label.textContent = `${name} · ${countFor(name).toLocaleString()}`;
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
    label.textContent = `${name} · ${fmtBytes(m.bytes.length)} ${m.kind === "wav" ? "audio" : "binary"} · /measure ${name}`;
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
}

async function addFiles(fileList) {
  const files = [...fileList];
  for (const file of files) {
    try {
      $("status").textContent = `reading ${file.name} (${fmtBytes(file.size)})…`;
      // Yield once before the read so the status actually paints; a multi-
      // megabyte file otherwise goes from click to done with no sign anything
      // happened.
      await new Promise((r) => setTimeout(r, 0));
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
  if (state.ready) $("status").textContent = `ready · ${state.model}`;
};

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
$("paste").addEventListener("close", () => {
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

// The grounding marks, on or off, for every turn at once — a reading
// preference, not a measurement, so it lives on the body class and touches no
// state a turn is built from. Persisted, because someone who turned the
// apparatus off meant it past this reload.
// Checking, on or off. This is a MODE, not a paint setting: off, the relation
// tier is never asked for, nothing is drawn into the prose, no tally is
// counted, no evidence or grounding panel is built, and no claim is taken to
// the web. What is left is a model answering a question — a plain chatbot.
//
// Two things stay on in either mode, because they are the instrument and not
// the apparatus: the fold (the running summary IS how the conversation
// works), and the record (FOLD-CONSTITUTION I.5 — append-only, and not the
// UI's to switch off). Both are disclosed under the turn either way.
{
  const btn = $("marks-toggle");
  const apply = (on) => {
    state.grounded = on;
    document.body.classList.toggle("marks-off", !on);
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
// the panels are already beside it, so start them on the prompt.
showView(matchMedia("(max-width: 900px)").matches ? "chat" : "builds");

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
for (const id of ["reopen", "model-menu", "fold-view", "attach-menu", "picker", "paste", "attach-sheet"]) {
  const dlg = $(id);
  dlg?.addEventListener("click", (e) => {
    if (e.target === dlg) dlg.close();
  });
}
for (const [btn, dlg] of [
  ["model-menu-x", "model-menu"],
  ["attach-menu-x", "attach-menu"],
  ["picker-x", "picker"],
  ["paste-x", "paste"],
  ["reopen-x", "reopen"],
  ["attach-sheet-x", "attach-sheet"],
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
  if (state.ready) return;
  if (state.offeredModels.length) connect();
  else openSettings(true);
});

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
  const working = state.ready && s && !TRANSIENT.test(s) && !s.startsWith(`ready · ${state.model}`);
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
const header = document.querySelector("header");
const trackHeader = () =>
  document.documentElement.style.setProperty(
    "--header-h",
    `${header.offsetHeight}px`,
  );
new ResizeObserver(trackHeader).observe(header);
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
  send(q);
};

$("input").onkeydown = (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    $("composer").requestSubmit();
  }
};
