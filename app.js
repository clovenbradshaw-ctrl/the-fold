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

const KEY_STORAGE = "the-fold.anthropic-key";
const OLLAMA = "http://localhost:11434";
const MAX_TOKENS = 4096;

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
  summary: emptySummary(),
  /** The raw transcript. Kept only so the page can show what it is NOT sending. */
  history: [],
  /** Per-turn folds, for display next to the message that produced them. */
  turnFolds: [],
  /** name → full text. A ref is only re-openable while its source is here. */
  sources: {},
  chunks: [],
  lastMessages: [],
  lastMaterialChars: 0,
};

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
  $("input").focus();
}

/**
 * One request. `messages` arrives in the shape fold.js assembles — a single
 * system message at index 0, then the turns. Ollama takes that array as-is;
 * the Messages API carries the system prompt in its own field, so it is split
 * out there. The fold's own invariant (exactly one system block, everything
 * older folded into it) is untouched either way.
 */
async function complete(messages, { onDelta, effort } = {}) {
  return state.provider === "claude"
    ? completeClaude(messages, { onDelta, effort })
    : completeOllama(messages, { onDelta });
}

async function completeClaude(messages, { onDelta, effort }) {
  const system = messages[0]?.role === "system" ? messages[0].content : undefined;
  const turns = messages.filter((m) => m.role !== "system");

  const stream = state.claude.messages.stream({
    model: state.model,
    max_tokens: MAX_TOKENS,
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

async function completeOllama(messages, { onDelta }) {
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: state.model, messages, stream: true }),
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

async function send(question) {
  state.busy = true;
  $("send").disabled = true;

  const foldedRefs = (state.summary.records || []).flatMap((r) => r.refs);
  const passages = state.chunks.length
    ? retrieve(state.chunks, question, 3, foldedRefs)
    : [];

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
  renderPrompt();

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
      // lines that are already written. Spending the answer's effort on it
      // would double the turn's latency for nothing.
      { effort: "low" },
    );
    state.summary = updateSummaryWithFold(state.summary, fold, raw);
  } catch {
    state.summary = updateSummaryWithFold(state.summary, fold);
  }

  node.querySelector(".fold").textContent = `fold ▸ ${fold}`;
  $("status").textContent = `ready · ${state.model}`;
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

  // The comparison that means something is conversation against conversation:
  // everything the transcript holds, against what stands in for it this turn.
  // Retrieved material and the base prompt are the same size on turn 1 and
  // turn 400, so counting them here would flatter the fold on a short
  // conversation and tell you nothing about a long one.
  const transcript = charCount(state.history);
  const prompt = charCount(state.lastMessages);
  const carried = Math.max(
    prompt - state.lastMaterialChars - BASE_PROMPT.length - lastQuestionChars(),
    0,
  );
  const max = Math.max(transcript, carried, 1);
  $("m-transcript").textContent = `${transcript.toLocaleString()} chars`;
  $("m-prompt").textContent = `${carried.toLocaleString()} chars`;
  $("bar-transcript").style.width = `${(transcript / max) * 100}%`;
  $("bar-prompt").style.width = `${(carried / max) * 100}%`;
  $("m-ratio").textContent = transcript
    ? `${state.history.length} messages exist; ${Math.min(state.history.length, RECENCY_WINDOW)} sent raw, the rest folded` +
      (state.lastMaterialChars
        ? ` · plus ${state.lastMaterialChars.toLocaleString()} chars of material retrieved for this question`
        : "") +
      // Said out loud rather than hidden, because the first few turns look
      // like the fold losing: its two framing blocks are a fixed cost, paid in
      // full on turn one. What is flat is what happens after — the transcript
      // climbs without limit and this number does not.
      (carried > transcript
        ? " — the fold's framing is a fixed cost, and the transcript hasn't outgrown it yet"
        : "")
    : "";
}

function lastQuestionChars() {
  const last = state.lastMessages[state.lastMessages.length - 1];
  return last && last.role === "user" ? last.content.length : 0;
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
    box.append(el);
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
    .concat(chunkSource(name, text));
  renderSources();
}

function removeSource(name) {
  // The text goes, the addresses stay. A record's refs still name this file,
  // and re-opening one now says so rather than quietly returning nothing —
  // which is the honest failure for an address whose material is gone.
  delete state.sources[name];
  state.chunks = state.chunks.filter((c) => c.source !== name);
  renderSources();
}

function countFor(name) {
  return state.chunks.filter((c) => c.source === name).length;
}

function renderSources() {
  const names = Object.keys(state.sources);
  const strip = $("sources-strip");
  strip.textContent = "";
  strip.hidden = !names.length;
  for (const name of names) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.append(document.createTextNode(name));
    const count = document.createElement("span");
    count.className = "count";
    count.textContent = `${countFor(name)} passages`;
    const x = document.createElement("button");
    x.type = "button";
    x.title = `Remove ${name}`;
    x.textContent = "×";
    x.onclick = () => removeSource(name);
    chip.append(count, x);
    strip.append(chip);
  }

  const list = $("source-list");
  list.textContent = "";
  if (!names.length) {
    list.innerHTML =
      '<p class="empty">Nothing loaded. Drop a text file anywhere on the page.</p>';
    return;
  }
  for (const name of names) {
    const row = document.createElement("div");
    row.className = "source-row";
    const n = document.createElement("span");
    n.className = "name";
    n.textContent = name;
    const c = document.createElement("span");
    c.className = "count";
    c.textContent = `${countFor(name)} passages · ${state.sources[name].length.toLocaleString()} chars`;
    const x = document.createElement("button");
    x.type = "button";
    x.textContent = "remove";
    x.onclick = () => removeSource(name);
    row.append(n, c, x);
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

renderState();
renderPrompt();
renderSources();
fillModels();

$("key").value = localStorage.getItem(KEY_STORAGE) || "";
$("connect").onclick = connect;
$("provider").onchange = () => {
  state.provider = $("provider").value;
  state.ready = false;
  $("key").hidden = state.provider !== "claude";
  $("send").disabled = true;
  $("status").textContent = "idle";
  fillModels();
};
$("model").onchange = () => {
  state.model = $("model").value;
  if (state.ready) $("status").textContent = `ready · ${state.model}`;
};

$("attach").onclick = () => $("file").click();
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
