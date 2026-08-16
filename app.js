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
// Two places the model can live. Ollama on localhost needs no credential and
// keeps the whole thing on the machine. Claude is called straight from the page
// with the official SDK; the key is held in this browser's local storage and
// sent to no host but api.anthropic.com — which is why
// `dangerouslyAllowBrowser` is honest here rather than reckless: there is no
// server in this design to hide it behind.

import Anthropic from "https://esm.run/@anthropic-ai/sdk";

import {
  RECENCY_WINDOW,
  FOLD_SYSTEM_PROMPT,
  addWarrantRecord,
  advanceSummaryFold,
  buildRecordSystemMessage,
  buildSummarySystemMessage,
  buildSummaryUpdatePrompt,
  buildTurnMessages,
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

// The reading engine's own segment organ, served from /engine (see serve.mjs).
// Boundaries are found by form there and received here — this app does not
// know what a chapter is and must not learn.
import { lineIndex, outlineOfIndex } from "/engine/perceiver/text/segments.js";

import {
  buildSourceBlock,
  checkCitations,
  chunkSource,
  openQuestions,
  readRange,
  retrieve,
  tokenize,
} from "./source.js";

const BASE_PROMPT =
  "You are a careful assistant. Answer the question you were asked, in plain prose. When material is supplied, answer from it and cite the address in square brackets exactly as it appears. When it does not cover the question, say so plainly instead of filling the gap.";

const KEY_STORAGE = "the-fold.anthropic-key";
const OLLAMA = "http://localhost:11434";
const MAX_TOKENS = 4096;
/**
 * The summary refresh returns one short JSON object. Left uncapped, a small
 * model will happily spend a thousand tokens explaining it — which on a local
 * 3B is a minute of wall clock per turn, spent on the cheapest part of the
 * design. The cap is the bound the fold already claims to have.
 */
const FOLD_MAX_TOKENS = 300;

const CLAUDE_MODELS = [
  ["claude-opus-5", "Opus 5"],
  ["claude-sonnet-5", "Sonnet 5"],
  ["claude-haiku-4-5", "Haiku 4.5"],
];

const $ = (id) => document.getElementById(id);

const state = {
  provider: "ollama",
  model: null,
  claude: null,
  ready: false,
  busy: false,

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
  };
}

/** A conversation is named by what it turned out to be about. */
function convoTitle(c) {
  if (c.summary.topic) return c.summary.topic;
  const first = c.history.find((m) => m.role === "user");
  return first ? first.content : `Conversation ${c.id}`;
}

function switchConvo(index) {
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
  if (state.provider === "claude") {
    for (const [id, label] of CLAUDE_MODELS) {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = label;
      sel.append(opt);
    }
    return;
  }
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
  state.provider = $("provider").value;
  state.model = $("model").value;
  if (state.provider === "claude") {
    const key = $("key").value.trim();
    if (!key) {
      $("status").textContent = "paste a key first";
      $("key").focus();
      return;
    }
    localStorage.setItem(KEY_STORAGE, key);
    state.claude = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
  }
  state.ready = true;
  $("status").textContent = `ready · ${state.model}`;
  $("send").disabled = false;
  // Connected is the moment the controls stop earning their space, and the
  // moment the chat is what you want to be looking at.
  openSettings(false);
  showView("chat");
  $("input").focus();
}

/**
 * One request. `messages` arrives in the shape fold.js assembles — a single
 * system message at index 0, then the turns. Ollama takes that array as-is;
 * the Messages API carries the system prompt in its own field, so it is split
 * out there. The fold's own invariant (exactly one system block, everything
 * older folded into it) is untouched either way.
 */
async function complete(messages, { onDelta, effort, maxTokens, json } = {}) {
  return state.provider === "claude"
    ? completeClaude(messages, { onDelta, effort, maxTokens })
    : completeOllama(messages, { onDelta, maxTokens, json });
}

async function completeClaude(messages, { onDelta, effort, maxTokens }) {
  const system = messages[0]?.role === "system" ? messages[0].content : undefined;
  const turns = messages.filter((m) => m.role !== "system");

  const stream = state.claude.messages.stream({
    model: state.model,
    max_tokens: maxTokens ?? MAX_TOKENS,
    ...(system ? { system } : {}),
    ...(effort ? { output_config: { effort } } : {}),
    messages: turns,
  });

  let out = "";
  stream.on("text", (delta) => {
    out += delta;
    onDelta?.(out);
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") throw new Error("the model declined");
  return message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
}

async function completeOllama(messages, { onDelta, maxTokens, json }) {
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
      ...(json ? { format: "json" } : {}),
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

  // A question about the app's own state is answered from that state. Nothing
  // is gained by handing a model rows it would have to paraphrase, and a
  // paraphrase of a data structure drops a row, rounds a number, or invents a
  // file — the three failures the rest of this design exists to refuse.
  const wanted = detectTable(question);
  if (wanted) return mechanicalTurn(question, wanted);

  const foldedRefs = (state.summary.records || []).flatMap((r) => r.refs);
  const live = state.chunks.filter((c) => !state.muted.has(c.source));
  const passages = live.length ? retrieve(live, question, 3, foldedRefs) : [];

  const sourceBlock = buildSourceBlock(passages);
  const messages = buildTurnMessages({
    basePrompt: BASE_PROMPT,
    summary: state.summary,
    history: state.history,
    question,
    sourceBlock,
  });
  state.lastMessages = messages;
  // Material is retrieved fresh for the question and has nothing to do with
  // how long the conversation is. Tracked separately so the meter measures the
  // fold's actual claim rather than crediting it with the corpus.
  state.lastMaterialChars = sourceBlock?.length ?? 0;

  addMessage("user", question);
  const node = addMessage("assistant", "");

  let answer = "";
  try {
    $("status").textContent = "answering…";
    answer = await complete(messages, {
      onDelta: (partial) => {
        node.querySelector(".body").textContent = partial;
        node.scrollIntoView({ block: "end" });
      },
    });
  } catch (err) {
    answer = `[engine error: ${err.message || err}]`;
    node.querySelector(".body").textContent = answer;
  }

  state.history.push(
    { role: "user", content: question },
    { role: "assistant", content: answer },
  );

  // System 2 first: the record is built from this turn's own mechanical check,
  // so it cannot disagree with what the check found.
  const { used, unsupported } = checkCitations(answer, passages);
  // Three different questions, asked mechanically. checkCitations: did it cite
  // an address it was handed. attribute: where does an uncited sentence come
  // from. checkGrounding: are the figures and names in the sentence in the
  // bytes at all — the one that catches an invented number.
  const grounding = checkGrounding(answer, passages, { question });
  // What the model wrote is one channel; what the answer demonstrably took
  // from the material is another, and the second does not depend on the model
  // having cooperated. Both are mechanical: one parses the brackets, one
  // measures shared phrases against a null.
  const attributions = attribute(answer, passages, live);
  const attributed = attributedRefs(attributions);
  const carriedBy = [
    ...(used.length ? ["cited"] : []),
    ...(attributed.length ? ["attributed"] : []),
  ];
  const grounded = [...new Set([...used, ...attributed])];

  const turn = state.summary.turnCount + 1;
  const fold = mechanicalFoldLine(question, answer);
  const record = passages.length
    ? buildWarrantRecord({
        turn,
        gist: fold,
        channels: carriedBy,
        refs: grounded,
        unsupported: [...unsupported, ...unsupportedClaims(grounding)],
        open: openQuestions(question, passages, grounded),
      })
    : null;
  if (record) state.summary = addWarrantRecord(state.summary, record);

  // System 1: the one model call the fold spends.
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
      // The fold is bookkeeping, not reasoning: a short JSON object read off
      // lines that are already written. Spending the answer's effort — or the
      // answer's token headroom — on it would double the turn's latency for
      // nothing, which is exactly what a local 3B did until it was capped.
      { effort: "low", maxTokens: FOLD_MAX_TOKENS, json: true },
    );
    state.summary = updateSummaryWithFold(state.summary, fold, raw);
  } catch {
    state.summary = updateSummaryWithFold(state.summary, fold);
  }

  // Streaming shows raw text as it arrives; the artifact is built once the
  // answer is whole, because a half-written table is not a table yet.
  renderAnswer(node.querySelector(".body"), answer, passages, attributions);
  renderFold(node, { fold, record, sent: messages });
  renderThreads();
  renderEvidence(node, question, passages, grounded, grounding);
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
function renderAnswer(body, answer, offered = [], attributions = []) {
  // Sentence → the address this app attached to it, if it attached one.
  const attached = new Map(
    attributions.filter((a) => a.ref).map((a) => [a.text, a]),
  );
  const segments = parseSegments(answer);
  body.textContent = "";
  for (const seg of segments) {
    if (seg.type === "prose") {
      const p = document.createElement("p");
      p.className = "prose";
      p.append(...taggedProse(seg.text, offered, attached));
      body.append(p);
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
function taggedProse(text, offered, attached = new Map()) {
  const known = new Set(offered.map((p) => p.ref ?? p));
  const out = [];
  // Where this app attached the address itself, say so in the tag. A citation
  // the model wrote and one this app measured are different kinds of claim,
  // and drawing them identically would hide which is which.
  for (const [sentence, a] of attached) {
    if (!text.includes(sentence)) continue;
    const i = text.indexOf(sentence) + sentence.length;
    const b = document.createElement("button");
    b.className = "ref attached";
    b.textContent = a.ref;
    b.title = `Attached by this app: ${a.score} consecutive terms shared with these bytes, against a corpus best of ${a.floor}. Press to read them.`;
    b.onclick = () => reopen(a.ref);
    out.push(document.createTextNode(text.slice(0, i)), b);
    text = text.slice(i);
    break;
  }
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
function renderEvidence(node, question, passages, used, grounding) {
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
    artifactNode(seg, `material · ${passages.length} retrieved, ${cited.size} cited`),
  ];
  // What the answer said that the material does not: the check that catches an
  // invented figure, which neither the address check nor attribution can see.
  if (grounding?.examined) {
    const note = document.createElement("p");
    note.className = grounding.clean ? "fold-note" : "fold-note bad";
    note.textContent = grounding.clean
      ? `every figure and name in the answer appears in the material (${grounding.atomsChecked} checked)`
      : `not in the material: ${unsupportedClaims(grounding).join("; ")}`;
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
function renderFold(node, { fold, record, sent }) {
  const box = node.querySelector(".fold");
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


function reopen(ref) {
  const body = readRange(state.sources, ref);
  $("reopen-ref").textContent = ref;
  $("reopen-body").textContent =
    body ?? "That material is no longer loaded — the address outlived it.";
  $("reopen").showModal();
}

// ── material ─────────────────────────────────────────────────────────────────
//
// Adding material is the one thing a first-time reader has to discover, so it
// has three doors — drop a file anywhere, click Material next to the composer,
// or paste — and no confirm step behind any of them. Text is addressable the
// moment it lands.

function addSource(name, text) {
  if (!text.trim()) return;
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

function renderSources() {
  const names = Object.keys(state.sources);
  const list = $("source-list");
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

$("key").value = localStorage.getItem(KEY_STORAGE) || "";
$("connect").onclick = connect;
$("provider").onchange = () => {
  state.provider = $("provider").value;
  state.ready = false;
  $("key-row").hidden = state.provider !== "claude";
  $("send").disabled = true;
  $("status").textContent = "idle";
  fillModels();
};
$("model").onchange = () => {
  state.model = $("model").value;
  if (state.ready) $("status").textContent = `ready · ${state.model}`;
};

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
// Provider, model, and Connect are a first-run affordance that then sits at the
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
