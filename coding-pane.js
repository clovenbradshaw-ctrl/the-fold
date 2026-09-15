// coding-pane.js — the Coding tab. Standalone, github-pane.js/log-pane.js's
// exact pattern: this file owns #pane-coding alone and never imports
// app.js — cross-module signaling is the SAME custom-event shape
// github-pane.js already established (fold:attachments-changed): this
// pane dispatches "fold:coding-submit"/"fold:coding-iterate", and reads
// the pipeline's own disclosure back as "fold:coding-step" events app.js
// re-dispatches from codePieceTurn's/foldTurn's onEvent.
//
// The pipeline itself — codePieceTurn's spec → skeleton → per-function
// fill → run+witness → repair, and foldTurn's patch-based iteration — is
// entirely app.js's/code-piece.js's; nothing here decides what to build or
// how. This file is the disclosure layer alone: every event it receives
// becomes one card (coding-cards.js), live, in order — the way Claude
// Code's own CLI shows one card per tool call rather than a paragraph of
// prose after the fact.
//
// SCOPE. A task or an iteration submitted here is ALSO an ordinary turn in
// Chat (codePieceTurn/foldTurn are unchanged — they still addMessage the
// same way, still mirror to the record) — nothing is hidden from the one
// shared record; this pane is a richer, live VIEW of it, not a second
// pipeline. Execution stays exactly where it already was: the browser's
// own severed Worker sandbox (term.js) — never a real file, never a real
// shell, even were eoreader7 or a model ever reached as an API.
//
// A task typed straight into the ordinary Chat composer (code-piece's own
// existing detectCodePiece door) still works exactly as before and is NOT
// disclosed here — this pane only sees what it itself submitted. Named
// scope, not an oversight: watching arbitrary chat activity would mean
// reading chat's own DOM, which is app.js's to own.

import { CODE_RUNTIMES } from "./code-piece.js";
import { cardFor } from "./coding-cards.js";

const $id = (x) => document.getElementById(x);

// Every event that ends a run (successfully, refused, or thrown) — the
// composer's buttons stay disabled from submit until one of these arrives,
// so a second overlapping submit can't race the first (app.js's own
// state.busy already refuses it either way; this just keeps the button
// honest about whether that would happen).
const TERMINAL_EVENTS = new Set(["done_summary", "unsupported_language", "no_features", "busy", "error", "iterate_outcome"]);

// The fold this session most recently produced — "ask for a change" needs
// to know which fold to patch. Session-only (a reload starts a fresh
// coding session; the fold itself is durable, in the Folds panel, like
// any other).
let lastFold = null;

function fillLangPicker() {
  const sel = $id("coding-lang");
  if (!sel || sel.options.length) return;
  for (const lang of CODE_RUNTIMES) {
    const o = document.createElement("option");
    o.value = lang;
    o.textContent = lang;
    sel.append(o);
  }
}

function appendCard(type, payload) {
  const feed = $id("coding-feed");
  if (!feed) return;
  feed.append(cardFor(type, payload));
  feed.scrollTop = feed.scrollHeight;
}

function setBusy(isBusy) {
  const submit = $id("coding-submit");
  const iterate = $id("coding-iterate-submit");
  if (submit) submit.disabled = isBusy;
  if (iterate) iterate.disabled = isBusy;
}

function showIterate(fold) {
  if (fold == null) return;
  lastFold = fold;
  const box = $id("coding-iterate");
  if (!box) return;
  box.hidden = false;
  const label = $id("coding-iterate-fold");
  if (label) label.textContent = `fold ${fold}`;
}

window.addEventListener("fold:coding-step", (e) => {
  const { type, payload } = e.detail ?? {};
  appendCard(type, payload ?? {});
  if (type === "skeleton_born" || type === "done_summary" || type === "iterate_outcome") showIterate(payload?.fold);
  if (TERMINAL_EVENTS.has(type)) setBusy(false);
});

$id("coding-submit")?.addEventListener("click", () => {
  const task = $id("coding-task")?.value.trim();
  const lang = $id("coding-lang")?.value;
  if (!task || !lang) return;
  const feed = $id("coding-feed");
  if (feed) feed.replaceChildren();
  lastFold = null;
  const box = $id("coding-iterate");
  if (box) box.hidden = true;
  setBusy(true);
  window.dispatchEvent(new CustomEvent("fold:coding-submit", { detail: { lang, task } }));
});

$id("coding-iterate-submit")?.addEventListener("click", () => {
  const instruction = $id("coding-iterate-input")?.value.trim();
  if (!instruction || lastFold == null) return;
  setBusy(true);
  window.dispatchEvent(new CustomEvent("fold:coding-iterate", { detail: { n: lastFold, instruction } }));
  $id("coding-iterate-input").value = "";
});

document.addEventListener("click", (ev) => {
  if (ev.target.closest?.('[role="tab"][data-pane="coding"]')) fillLangPicker();
});
fillLangPicker();
