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

import { NOTHING, buildTable, detectTable, toMarkdown } from "./tables.js";

import { checkGrounding, unsupportedClaims } from "./grounding.js";

import { attribute, attributedRefs } from "./cite.js";

import { needsDecomposition, runHolonicTask } from "./holon.js";

import { renderBlocksInto } from "./render.js";

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

// The engine's surprise ladder — the measured answer to "what is most
// surprising", and the only licensed one. Same mount, plus /nul for the
// null module tiers.js stands on (serve.mjs carries both).
import { createTierStack, foldThrough } from "/engine/emergence/tiers.js";

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

// One meter per conversation, built on the engine's own tiers. reflex.js
// declares the numbers (window from the fold's own present, draws and alpha
// from read-frankenstein) — nothing here picks any.
const reflexMeter = makeReflexMeter({ createTierStack, foldThrough });

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
  ready: false,
  busy: false,

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
   * Sources switched off. They stay loaded — their text is still here, so a
   * record's refs still re-open — but retrieval does not see them. Removing a
   * source and silencing it are different acts and this is the second one.
   */
  muted: new Set(),
  chunks: [],
  /** Everything a turn produced that wasn't prose, oldest first. */
  artifacts: [],
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
};

// ── conversations ────────────────────────────────────────────────────────────

/** The fields that belong to a conversation rather than to the app. */
const PER_CONVO = [
  "summary",
  "history",
  "turnFolds",
  "artifacts",
  "lastMessages",
  "lastMaterialChars",
  "reflexLog",
  "meter",
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
    artifacts: [],
    lastMessages: [],
    lastMaterialChars: 0,
    reflexLog: emptyReflexLog(),
    meter: reflexMeter.create(),
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
  renderArtifacts();
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

function renderThreads() {
  const bar = $("threads");
  bar.textContent = "";
  state.convos.forEach((c, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = convoTitle(c);
    b.title = convoTitle(c);
    b.setAttribute("aria-current", String(i === state.active));
    b.onclick = () => switchConvo(i);
    bar.append(b);
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

async function fillModels() {
  const sel = $("model");
  sel.textContent = "";
  try {
    const res = await fetch(`${OLLAMA}/api/tags`);
    const { models } = await res.json();
    // Small first. The fold's argument is that a modest model with a bounded
    // context beats a large one drowning in transcript, so the default should
    // be the one that makes that argument.
    const sorted = models
      // An embedding model has no chat endpoint to speak of; listing one is
      // just an option that fails on first use.
      .filter((m) => !/embed/i.test(m.name))
      // Small first, but a general instruct model ahead of a same-size coder
      // or vision model — the default should be able to hold a conversation.
      .sort(
        (a, b) =>
          Number(/coder|vision|moondream/i.test(a.name)) -
            Number(/coder|vision|moondream/i.test(b.name)) ||
          a.size - b.size,
      );
    for (const m of sorted) {
      const opt = document.createElement("option");
      opt.value = m.name;
      opt.textContent = `${m.name} · ${(m.size / 1e9).toFixed(1)}GB`;
      sel.append(opt);
    }
    if (!sorted.length) $("status").textContent = "ollama has no models pulled";
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
async function complete(messages, { onDelta, maxTokens, json } = {}) {
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: state.model,
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
          model: state.model,
          promptChars: messages.reduce((n, m) => n + m.content.length, 0),
          promptTokens: chunk.prompt_eval_count,
          promptNs: chunk.prompt_eval_duration,
          outTokens: chunk.eval_count,
          outNs: chunk.eval_duration,
        });
        const pace = foldPace(state.paceLog, state.model);
        if (pace.decodeTps) $("status").textContent = `ready · ${state.model} · ${Math.round(pace.decodeTps)} tok/s`;
      }
      const delta = chunk.message?.content || "";
      if (!delta) continue;
      out += delta;
      onDelta?.(out);
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
 */
function observeExchange(turn, question, answer) {
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
  }
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
  state.busy = false;
  $("send").disabled = false;
  $("input").focus();
}

async function mechanicalTurn(question, kind) {
  addMessage("user", question);
  const node = addMessage("assistant", "");
  const body = node.querySelector(".body");

  const built = buildTable(kind, state);
  const answer = built ? toMarkdown(built.table) : NOTHING[kind];
  body.textContent = "";
  if (built) body.append(publishArtifact(built.table, built.caption));
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
  state.busy = false;
  $("send").disabled = false;
  $("input").focus();
}

async function send(question) {
  state.busy = true;
  $("send").disabled = true;
  // The intro has done its job the moment there is a conversation, and on a
  // phone it is otherwise a screenful sitting above the first message.
  $("intro")?.remove();

  // A task rather than a question. Two doors, per the canon in eochatX's
  // eo-holonic-plan.ts: `/task` is the explicit one, and the mechanical gate
  // is the SHAPE of the request — several substantive clauses each pinning
  // its own anchor — decided from the question's own words, never by a model
  // and never by whether a corpus happens to be loaded. The explicit door is
  // checked FIRST: a typed command must never be hijacked by a heuristic
  // that happens to match its wording.
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

  // A question about the app's own state is answered from that state. Nothing
  // is gained by handing a model rows it would have to paraphrase, and a
  // paraphrase of a data structure drops a row, rounds a number, or invents a
  // file — the three failures the rest of this design exists to refuse.
  const wanted = detectTable(question);
  if (wanted) return mechanicalTurn(question, wanted);

  // Self questions asked in words ("what surprised you most", "how do you
  // think"). Checked AFTER detectTable so a question the app can answer
  // about its material state keeps winning, and gated on the second-person
  // tell inside detectReflex so a question about the material — which must
  // always win — is never hijacked into introspection.
  const reflex = detectReflex(question);
  if (reflex === "reflect") return reflectTurn(question, question);
  if (reflex) return mechanicalTurn(question, reflex);

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

  const live = state.chunks.filter((c) => !state.muted.has(c.source));
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
      {},
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
      { json: buildBoundSchema({ handles, cells }) },
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
  observeExchange(turn, question, flat);

  await refreshSummary(fold);
  renderFold(node, { fold, record });
  renderThreads();
  $("status").textContent = `ready · ${state.model}`;
  state.busy = false;
  $("send").disabled = false;
  $("input").focus();
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
      { onDelta: (out) => { body.textContent = out; } },
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
  renderAnswer(body, answer, [...offered, ...quoted], attributions, grounding.findings);

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
  observeExchange(turn, question, answer);

  await refreshSummary(fold);
  renderFold(node, { fold, record });
  renderThreads();
  renderEvidence(node, question, offered, used, grounding, "self ledger");
  $("status").textContent = `ready · ${state.model}`;
  state.busy = false;
  $("send").disabled = false;
  $("input").focus();
}

/**
 * The summary refresh, shared by every kind of turn that spends tokens.
 *
 * The fold is bookkeeping, not reasoning: a short JSON object read off lines
 * that are already written. Spending the answer's effort — or the answer's
 * token headroom — on it would double the turn's latency for nothing, which
 * is exactly what a local 3B did until it was capped.
 */
async function refreshSummary(fold) {
  state.turnFolds.push(fold);
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
      { effort: "low", maxTokens: FOLD_MAX_TOKENS, json: FOLD_SCHEMA },
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

  const foldedRefs = (state.summary.records || []).flatMap((r) => r.refs);
  const live = state.chunks.filter((c) => !state.muted.has(c.source));

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
    const pace = foldPace(state.paceLog, state.model);
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

  let result;
  try {
    $("status").textContent = "planning…";
    const s = state.summary;
    result = await runHolonicTask({
      task,
      chunks: live,
      call: complete,
      foldedRefs,
      makeNameResolver: castFor,
      planMode,
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
        unsupported: capped(result.unsupported, RECORD_REFS_MAX, "the run log"),
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
  observeExchange(turn, task, result.output);
  // The meter counts material against the task's parts, not the fold: what
  // was retrieved here was retrieved for the parts and does not grow with
  // the conversation.
  state.lastMaterialChars = result.sections.reduce(
    (n, s) => n + (buildSourceBlock(s.passages)?.length ?? 0),
    0,
  );

  // The answer renders before the summary refresh so an artifact built from
  // it is stamped with THIS turn's number, not the next one's.
  renderAnswer(body, result.output, offered, attributions, result.sections.flatMap((s) => s.grounding?.findings ?? []));
  await refreshSummary(fold);
  renderFold(node, { fold, record, ran: log });
  renderThreads();
  // Evidence terms are the plan's own words — each part retrieved on its own
  // description, so the task's terms alone would call honest matches misses.
  const evidenceQuestion = `${task} ${result.plan.parts.map((p) => `${p.label} ${p.description}`).join(" ")}`;
  renderEvidence(node, evidenceQuestion, offered, result.refs, null);
  $("status").textContent = `ready · ${state.model}`;
  state.busy = false;
  $("send").disabled = false;
  $("input").focus();
}

// ── rendering ────────────────────────────────────────────────────────────────

function addMessage(role, text) {
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  // The fold is disclosed, not displayed. Printed under every turn it just
  // repeated the exchange you had already read; kept behind a one-word
  // affordance, it is there the moment you want to ask "what did this turn
  // actually leave behind?" — which is the question the fold answers.
  el.innerHTML =
    `<div class="who"></div><div class="body"></div>` +
    (role === "assistant"
      ? `<div class="turn-meta">` +
        `<details class="fold"><summary>fold</summary><p></p></details>` +
        `<details class="fold evidence" hidden><summary>material</summary><div></div></details>` +
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
function renderAnswer(body, answer, offered = [], attributions = [], findings = []) {
  // Every sentence of the whole answer classified onto its ground once;
  // each rendered chunk then draws the sentences it contains.
  const classified = classifySentences(answer, attributions, findings);
  const segments = parseSegments(answer);
  body.textContent = "";
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
    body.append(publishArtifact(seg));
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

/** Bracketed addresses in a run of text become controls; everything else
 * stays text. The mechanical half of taggedProse, shared by the
 * sentence-provenance wrapper below. */
function refNodes(text, known) {
  const out = [];
  let last = 0;
  for (const m of String(text).matchAll(REF_IN_TEXT)) {
    if (m.index > last) out.push(document.createTextNode(text.slice(last, m.index)));
    const ref = m[1];
    if (known.has(ref)) {
      const b = document.createElement("button");
      b.className = "ref";
      b.textContent = ref;
      b.title = "Read these bytes back out of the material";
      b.onclick = () => reopen(ref);
      out.push(b);
    } else {
      const s = document.createElement("span");
      s.className = "ref bad";
      s.textContent = ref;
      s.title = "Not among the passages retrieved for this turn";
      out.push(s);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(document.createTextNode(text.slice(last)));
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
    if (entry.absent.length)
      sent.title = `Not in the material: ${entry.absent.join("; ")} — this stands on the model, said as fact.`;
    else if (entry.ground === "model")
      sent.title = "No address — this stands on the model's own voice, not the material.";
    sent.append(...refNodes(matched, known));

    // Where this app attached the address itself, say so in the tag. A
    // citation the model wrote and one this app measured are different
    // kinds of claim, and drawing them identically would hide which is which.
    if (entry.ref) {
      const b = document.createElement("button");
      b.className = "ref attached";
      b.textContent = entry.ref;
      b.title = "Attached by this app against a measured null. Press to read the bytes.";
      b.onclick = () => reopen(entry.ref);
      sent.append(b);
    }
    out.push(sent);
    rest = rest.slice(at + len);
  }

  if (rest) out.push(...refNodes(rest, known));
  return out;
}

/**
 * An artifact goes to the panel, and the message keeps a handle to it.
 *
 * A table wide enough to be worth drawing does not fit the column a
 * conversation is read in, and squeezing it there costs both — the table gets
 * a scrollbar and the conversation gets a wall. The panel is the width the
 * output wants; the chip is the sentence the conversation wants.
 */
function publishArtifact(seg, caption) {
  const entry = {
    n: state.artifacts.length + 1,
    turn: state.summary.turnCount + 1,
    seg,
    caption: caption ?? defaultCaption(seg),
  };
  state.artifacts.push(entry);
  renderArtifacts(entry.n);
  // Wide, the panel is already on screen and switching it to the thing just
  // made costs nothing. Narrow, the panel IS the screen, and yanking someone
  // out of the conversation to show them a table they can reach with one tap
  // is the wrong trade — the chip is enough.
  if (!matchMedia("(max-width: 900px)").matches) showView("views");

  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "artifact-chip";
  chip.innerHTML = `<span aria-hidden="true">▤</span> `;
  chip.append(document.createTextNode(entry.caption));
  chip.onclick = () => {
    showView("views");
    renderArtifacts(entry.n);
    document
      .getElementById(`artifact-${entry.n}`)
      ?.scrollIntoView({ block: "start" });
  };
  return chip;
}

function defaultCaption(seg) {
  return seg.type === "table"
    ? `table · ${seg.rows.length} row${seg.rows.length === 1 ? "" : "s"}`
    : seg.lang || "code";
}

/** Newest first — the thing just produced is the thing being looked at. */
function renderArtifacts(highlight) {
  const list = $("artifact-list");
  list.textContent = "";
  $("artifact-count").textContent = state.artifacts.length
    ? `${state.artifacts.length}`
    : "";
  if (!state.artifacts.length) {
    list.innerHTML = '<p class="empty">Nothing but prose so far.</p>';
    return;
  }
  for (const entry of [...state.artifacts].reverse()) {
    const wrap = document.createElement("div");
    wrap.id = `artifact-${entry.n}`;
    wrap.className = `artifact-entry${entry.n === highlight ? " current" : ""}`;
    const from = document.createElement("p");
    from.className = "artifact-from";
    from.textContent = `turn ${entry.turn}`;
    wrap.append(from, artifactNode(entry.seg, entry.caption));
    list.append(wrap);
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
  const box = node.querySelector(".evidence");
  if (!box || !passages.length) return;
  const terms = [...new Set(tokenize(question))];
  const cited = new Set(used);

  const seg = tableFrom(passages, [
    { label: "address", get: (p) => p.ref },
    {
      label: "matched",
      get: (p) => terms.filter((t) => p.terms.has(t)).join(", "),
    },
    { label: "chars", get: (p) => p.text.length.toLocaleString() },
    { label: "cited", get: (p) => (cited.has(p.ref) ? "yes" : "—") },
  ]);

  box.hidden = false;
  const parts = [
    artifactNode(seg, `${label} · ${passages.length} retrieved, ${cited.size} cited`),
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
  box.querySelector("div").replaceChildren(...parts);
}

/**
 * One renderer for both kinds of artifact — the ones read out of an answer and
 * the ones this app builds from its own rows. A table assembled mechanically
 * and a table the model happened to write arrive here in the same shape, and
 * there is no reason for them to look different.
 */
function artifactNode(seg, caption) {
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
    frame.sandbox = "";
    frame.srcdoc = toDocument(seg);
    frame.loading = "lazy";
    art.append(frame);
    const src = document.createElement("details");
    src.innerHTML = "<summary>source</summary>";
    const pre = document.createElement("pre");
    pre.textContent = seg.code;
    src.append(pre);
    art.append(src);
  } else {
    const pre = document.createElement("pre");
    pre.textContent = seg.code;
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
    out.append(section("system 1 · the running summary after this turn"), dl);
  }

  if (record) {
    out.append(section("system 2 · on record"), recordNode(record));
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
      b.textContent = ref;
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
  $("reopen-ref").textContent = ref;
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

// ── material ─────────────────────────────────────────────────────────────────
//
// Adding material is the one thing a first-time reader has to discover, so it
// has three doors — drop a file anywhere, click Material next to the composer,
// or paste — and no confirm step behind any of them. Text is addressable the
// moment it lands.

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
  state.muted.delete(name);
  state.chunks = state.chunks.filter((c) => c.source !== name);
  renderSources();
}

function countFor(name) {
  return state.chunks.filter((c) => c.source === name).length;
}

/** The chip strip above the conversation: what the answers stand on, always
 * in view. Click silences or restores; silenced is struck through, never
 * hidden — silenced and gone must not look alike. */
function renderSourceStrip() {
  const strip = $("source-strip");
  if (!strip) return;
  const names = Object.keys(state.sources);
  strip.hidden = !names.length;
  strip.textContent = "";
  for (const name of names) {
    const on = !state.muted.has(name);
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = on ? "" : "off";
    chip.textContent = `${name} · ${countFor(name).toLocaleString()}`;
    chip.title = on
      ? "In play — click to silence (the text stays loaded; retrieval stops seeing it)"
      : "Silenced — click to restore";
    chip.onclick = () => {
      if (on) state.muted.add(name);
      else state.muted.delete(name);
      renderSources();
    };
    strip.append(chip);
  }
}

function renderSources() {
  renderSourceStrip();
  const names = Object.keys(state.sources);
  const list = $("source-list");
  if (!list) return;
  list.textContent = "";
  if (!names.length) {
    list.innerHTML =
      '<p class="empty">Nothing loaded yet — add files above, drop one anywhere on the page, or paste below.</p>';
    return;
  }
  for (const name of names) {
    const on = !state.muted.has(name);
    const row = document.createElement("label");
    row.className = `source-row${on ? "" : " off"}`;

    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = on;
    box.onchange = () => {
      if (box.checked) state.muted.delete(name);
      else state.muted.add(name);
      renderSources();
    };

    const n = document.createElement("span");
    n.className = "name";
    n.textContent = name;

    const c = document.createElement("span");
    c.className = "count";
    c.textContent = on
      ? `${countFor(name).toLocaleString()} passages · ${fmtBytes(state.sources[name].length)}`
      : "off";

    const x = document.createElement("button");
    x.type = "button";
    x.textContent = "remove";
    x.onclick = (e) => {
      e.preventDefault();
      removeSource(name);
    };

    row.append(box, n, c, x);
    list.append(row);
  }
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

renderSources();
fillModels();

// One conversation to start; more on demand, each with its own fold.
state.convos.push(newConvo());
switchConvo(0);

$("connect").onclick = connect;
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
  $("status").textContent = `${d.name} · from Explore`;
});

// Both add buttons are the same door: the one beside the composer, and the one
// in the Material panel — which is where you end up when you already have
// material and want more of it.
for (const b of document.querySelectorAll(".attach"))
  b.onclick = () => $("file").click();
$("file").onchange = (e) => {
  addFiles(e.target.files);
  e.target.value = "";
};

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

// Paste is its own door: added on paste, no button to find. Typing gets the
// same treatment on blur, so someone who types instead of pasting isn't left
// looking for the button that isn't there.
function addPasted() {
  const text = $("material").value;
  if (!text.trim()) return;
  const n = Object.keys(state.sources).filter((k) => k.startsWith("pasted")).length;
  addSource(n ? `pasted-${n + 1}.txt` : "pasted.txt", text);
  $("material").value = "";
  $("status").textContent = "material added";
}
$("material").addEventListener("paste", (e) => {
  const text = e.clipboardData?.getData("text");
  if (!text?.trim()) return;
  e.preventDefault();
  $("material").value = text;
  addPasted();
});
$("material").addEventListener("change", addPasted);

// ── views ────────────────────────────────────────────────────────────────────
//
// Wide, the chat and the panels sit side by side and the tabs switch only the
// panels. Narrow, there is room for one at a time, so Chat joins the tab bar
// and the same click does both jobs.

function showView(name) {
  document.body.dataset.view = name;
  for (const t of document.querySelectorAll('[role="tab"]'))
    t.setAttribute("aria-selected", String(t.dataset.pane === name));
  if (name === "chat") return; // the panels keep whichever pane they had
  for (const p of document.querySelectorAll(".pane"))
    p.classList.toggle("on", p.id === `pane-${name}`);
}

for (const tab of document.querySelectorAll('[role="tab"]'))
  tab.onclick = () => showView(tab.dataset.pane);

// Narrow, the first thing to see is the conversation and the composer; wide,
// the panels are already beside it, so start them on the prompt.
showView(matchMedia("(max-width: 900px)").matches ? "chat" : "views");

// ── the settings chip ────────────────────────────────────────────────────────
//
// Model and Connect are a first-run affordance that then sits at the
// top of a phone screen forever. Once connected they fold into one chip and
// give the space back; tapping it brings them out again.

const settingsDialog = $("settings");

function openSettings(open) {
  if (open) settingsDialog.showModal();
  else settingsDialog.close();
}

$("settings-toggle").onclick = () => openSettings(true);
$("settings-close").onclick = () => openSettings(false);
// Nothing is connected yet, so the first thing to do is the only thing on
// offer — open it rather than making the chip a scavenger hunt.
if (!state.ready) openSettings(true);

// The chip mirrors whatever the status line says, so every existing status
// update reaches it without threading a setter through the turn loop.
const statusEl = $("status");
const syncChip = () => {
  $("settings-label").textContent = state.ready
    ? `${state.model} · ${statusEl.textContent.replace(`ready · ${state.model}`, "ready")}`
    : statusEl.textContent;
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
  if (!q || state.busy || !state.ready) return;
  $("input").value = "";
  send(q);
};

$("input").onkeydown = (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    $("composer").requestSubmit();
  }
};
