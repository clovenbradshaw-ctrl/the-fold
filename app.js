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

import * as webllm from "https://esm.run/@mlc-ai/web-llm@0.2.84";

import {
  RECENCY_WINDOW,
  FOLD_SYSTEM_PROMPT,
  addWarrantRecord,
  buildSummaryUpdatePrompt,
  buildTurnMessages,
  buildWarrantRecord,
  charCount,
  emptySummary,
  mechanicalFoldLine,
  updateSummaryWithFold,
} from "./fold.js";

import {
  buildSourceBlock,
  checkCitations,
  chunkSource,
  openQuestions,
  readRange,
  retrieve,
} from "./source.js";

const BASE_PROMPT =
  "You are a careful assistant. Answer the question you were asked, in plain prose. When material is supplied, answer from it and cite the address in square brackets exactly as it appears. When it does not cover the question, say so plainly instead of filling the gap.";

const $ = (id) => document.getElementById(id);

const state = {
  engine: null,
  busy: false,
  summary: emptySummary(),
  /** The raw transcript. Kept only so the page can show what it is NOT sending. */
  history: [],
  /** Per-turn folds, for display next to the message that produced them. */
  turnFolds: [],
  sources: {},
  chunks: [],
  lastMessages: [],
};

// ── model ────────────────────────────────────────────────────────────────────

function smallModels() {
  const all = webllm.prebuiltAppConfig.model_list.map((m) => m.model_id);
  // Small on purpose. The fold's whole argument is that a modest model with a
  // bounded context beats a large one drowning in transcript; a 1B that stays
  // coherent over forty turns is the demonstration.
  const wanted = all.filter((id) => /-(0\.5B|1B|1\.5B|1_5B|2B|3B)-/i.test(id));
  const preferred = "Llama-3.2-1B-Instruct-q4f32_1-MLC";
  const list = wanted.includes(preferred)
    ? [preferred, ...wanted.filter((id) => id !== preferred)]
    : wanted;
  return list.length ? list : all;
}

function fillModels() {
  const sel = $("model");
  for (const id of smallModels()) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = id.replace(/-MLC$/, "");
    sel.append(opt);
  }
}

async function loadModel() {
  const id = $("model").value;
  $("load").disabled = true;
  $("model").disabled = true;
  try {
    state.engine = await webllm.CreateMLCEngine(id, {
      initProgressCallback: (p) => {
        $("status").textContent = p.text;
      },
    });
    $("status").textContent = "ready";
    $("send").disabled = false;
    $("input").focus();
  } catch (err) {
    $("status").textContent = `load failed: ${err.message || err}`;
    $("load").disabled = false;
    $("model").disabled = false;
  }
}

async function complete(messages, onDelta) {
  const stream = await state.engine.chat.completions.create({
    messages,
    stream: true,
    temperature: 0.6,
  });
  let out = "";
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content || "";
    if (!delta) continue;
    out += delta;
    onDelta?.(out);
  }
  return out;
}

// ── the turn ─────────────────────────────────────────────────────────────────

async function send(question) {
  state.busy = true;
  $("send").disabled = true;

  const foldedRefs = (state.summary.records || []).flatMap((r) => r.refs);
  const passages = state.chunks.length
    ? retrieve(state.chunks, question, 3, foldedRefs)
    : [];

  const messages = buildTurnMessages({
    basePrompt: BASE_PROMPT,
    summary: state.summary,
    history: state.history,
    question,
    sourceBlock: buildSourceBlock(passages),
  });
  state.lastMessages = messages;

  addMessage("user", question);
  const node = addMessage("assistant", "");
  renderPrompt();

  let answer = "";
  try {
    $("status").textContent = "answering…";
    answer = await complete(messages, (partial) => {
      node.querySelector(".body").textContent = partial;
      node.scrollIntoView({ block: "end" });
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
  const turn = state.summary.turnCount + 1;
  const fold = mechanicalFoldLine(question, answer);
  if (passages.length) {
    state.summary = addWarrantRecord(
      state.summary,
      buildWarrantRecord({
        turn,
        gist: fold,
        channels: used.length ? ["source"] : [],
        refs: used,
        unsupported,
        open: openQuestions(question, passages, used),
      }),
    );
  }

  // System 1: the one model call the fold spends.
  state.turnFolds.push(fold);
  try {
    $("status").textContent = "folding…";
    const raw = await complete([
      { role: "system", content: FOLD_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildSummaryUpdatePrompt(state.summary, [
          ...(state.summary.folds || []),
          fold,
        ]),
      },
    ]);
    state.summary = updateSummaryWithFold(state.summary, fold, raw);
  } catch {
    state.summary = updateSummaryWithFold(state.summary, fold);
  }

  node.querySelector(".fold").textContent = `fold ▸ ${fold}`;
  $("status").textContent = "ready";
  renderState();
  renderPrompt();
  state.busy = false;
  $("send").disabled = false;
  $("input").focus();
}

// ── rendering ────────────────────────────────────────────────────────────────

function addMessage(role, text) {
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  el.innerHTML = `<div class="who"></div><div class="body"></div>${
    role === "assistant" ? '<div class="fold"></div>' : ""
  }`;
  el.querySelector(".who").textContent = role === "user" ? "you" : "model";
  el.querySelector(".body").textContent = text;
  $("chat").append(el);
  el.scrollIntoView({ block: "end" });
  return el;
}

function renderPrompt() {
  const dump = $("prompt-dump");
  dump.textContent = "";
  for (const m of state.lastMessages) {
    const pre = document.createElement("pre");
    pre.className = "block";
    const role = document.createElement("span");
    role.className = "role";
    role.textContent = `${m.role} · ${m.content.length} chars`;
    pre.append(role, document.createTextNode(m.content));
    dump.append(pre);
  }
  if (!state.lastMessages.length)
    dump.innerHTML = '<p class="empty">Nothing sent yet.</p>';

  const transcript = charCount(state.history);
  const prompt = charCount(state.lastMessages);
  const max = Math.max(transcript, prompt, 1);
  $("m-transcript").textContent = `${transcript.toLocaleString()} chars`;
  $("m-prompt").textContent = `${prompt.toLocaleString()} chars`;
  $("bar-transcript").style.width = `${(transcript / max) * 100}%`;
  $("bar-prompt").style.width = `${(prompt / max) * 100}%`;
  $("m-ratio").textContent = transcript
    ? `the prompt is ${((prompt / transcript) * 100).toFixed(0)}% of the transcript · ${
        state.history.length
      } messages exist, ${Math.min(state.history.length, RECENCY_WINDOW)} sent raw`
    : "";
}

function renderState() {
  const s = state.summary;
  const dl = $("summary");
  dl.textContent = "";
  const rows = [
    ["topic", s.topic],
    ["flow", s.flow],
    ["entities", s.entities?.join(", ")],
    ["carried context", s.context],
    ["language", s.language],
    ["turns", String(s.turnCount)],
  ];
  for (const [k, v] of rows) {
    if (!v) continue;
    const dt = document.createElement("dt");
    dt.textContent = k;
    const dd = document.createElement("dd");
    dd.textContent = v;
    dl.append(dt, dd);
  }
  if (!dl.children.length)
    dl.innerHTML = '<p class="empty">No turns folded yet.</p>';

  const ol = $("folds");
  ol.textContent = "";
  for (const f of s.folds || []) {
    const li = document.createElement("li");
    li.textContent = f;
    ol.append(li);
  }
  $("fold-count").textContent = s.folds?.length
    ? `${s.folds.length} kept of ${state.turnFolds.length} turns`
    : "";

  const box = $("records");
  box.textContent = "";
  if (!s.records?.length) {
    box.innerHTML = '<p class="empty">No checked turns yet.</p>';
    return;
  }
  for (const r of s.records) {
    const el = document.createElement("div");
    el.className = "record";
    const turn = document.createElement("div");
    turn.className = "turn";
    turn.textContent = `turn ${r.turn}${r.channels.length ? ` · carried by ${r.channels.join(", ")}` : ""}`;
    const gist = document.createElement("div");
    gist.textContent = r.gist;
    el.append(turn, gist);
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
  }
}

function reopen(ref) {
  const body = readRange(state.sources, ref);
  $("reopen-ref").textContent = ref;
  $("reopen-body").textContent =
    body ?? "That material is no longer loaded — the address outlived it.";
  $("reopen").showModal();
}

// ── material ─────────────────────────────────────────────────────────────────

function ingest() {
  const text = $("material").value;
  if (!text.trim()) {
    state.sources = {};
    state.chunks = [];
    $("material-status").textContent = "cleared";
    return;
  }
  state.sources = { "pasted.txt": text };
  state.chunks = chunkSource("pasted.txt", text);
  $("material-status").textContent = `${state.chunks.length} addressable passages`;
}

// ── boot ─────────────────────────────────────────────────────────────────────

fillModels();
renderState();
renderPrompt();

$("load").onclick = loadModel;
$("ingest").onclick = ingest;

for (const tab of document.querySelectorAll('[role="tab"]')) {
  tab.onclick = () => {
    for (const t of document.querySelectorAll('[role="tab"]'))
      t.setAttribute("aria-selected", String(t === tab));
    for (const p of document.querySelectorAll(".pane"))
      p.classList.toggle("on", p.id === `pane-${tab.dataset.pane}`);
  };
}

$("composer").onsubmit = (e) => {
  e.preventDefault();
  const q = $("input").value.trim();
  if (!q || state.busy || !state.engine) return;
  $("input").value = "";
  send(q);
};

$("input").onkeydown = (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    $("composer").requestSubmit();
  }
};
