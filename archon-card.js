// archon-card.js — the chat's empty state: one archon, in its own words.
//
// Draws one entry of archon-canon.js onto #archon: the namesake's canonical
// line in the language it was written in, the English under it, the citation,
// and — demoted to a footnote — the sentence this codebase wrote about the
// archon. Then it asks the explore server whether the works quoted are loaded
// in the priors corpus (GET /api/priors/has: a stat and the toggle ledger, never
// a read, so nothing lands on the record for merely opening a new tab).
//
// The citation and the translator are doors: each opens its work in the
// Reading pane at the quoted passage (app.js answers `fold:open-prior`). If
// nothing answers — app.js not loaded — the card says where to look instead of
// looking done. A work that is not in the corpus is said to be missing, with
// the fetcher that loads it; a server that does not answer leaves the status
// unsaid rather than guessed.

import { ARCHON_CANON, archonKey, pickArchon, quoteLines } from "./archon-canon.js";
import { EXPLORE_BASE } from "./explore-bridge.js";

const LAST_KEY = "fold.archon";
const FETCHER = "live_priors/scripts/fetch-archon-canon.mjs";

const $ = (id) => document.getElementById(id);

function lastShown() {
  try { return localStorage.getItem(LAST_KEY); } catch { return null; }
}
function remember(key) {
  try { localStorage.setItem(LAST_KEY, key); } catch { /* private window: a repeat is harmless */ }
}

/**
 * A quote's verse dividers are the file's line breaks: one span per line, so
 * the stylesheet sets a stanza as a stanza where there is room and runs it on
 * with " / " where there is not.
 */
function setQuote(el, text, lang) {
  el.textContent = "";
  el.lang = lang;
  const lines = quoteLines(text);
  el.classList.toggle("archon-verse", lines.length > 1);
  for (const line of lines) {
    const span = document.createElement("span");
    span.className = "archon-line";
    span.textContent = line;
    el.append(span);
  }
  el.hidden = false;
}

function openPrior(path, find, status) {
  let answered = false;
  const ack = () => { answered = true; };
  window.addEventListener("fold:prior-opened", ack, { once: true });
  window.dispatchEvent(new CustomEvent("fold:open-prior", { detail: { path, find } }));
  setTimeout(() => {
    window.removeEventListener("fold:prior-opened", ack);
    if (!answered && status) {
      status.dataset.held = "note";
      status.textContent = "open Reading → Given to read it";
      status.title = path;
    }
  }, 300);
}

async function checkHeld(paths, status) {
  const qs = paths.map((p) => `path=${encodeURIComponent(p)}`).join("&");
  let body;
  try {
    const res = await fetch(`${EXPLORE_BASE}/api/priors/has?${qs}`);
    if (!res.ok) return; // a server that predates the route: unsaid, not guessed
    body = await res.json();
  } catch {
    return; // no priors server answering: unsaid, not guessed
  }
  const entries = Array.isArray(body?.entries) ? body.entries : [];
  if (entries.length !== paths.length) return;
  const missing = entries.filter((e) => !e.present);
  const off = entries.filter((e) => e.present && e.on === false);
  if (missing.length) {
    status.dataset.held = "missing";
    status.textContent = "not in your priors yet";
    status.title = `Missing from live_priors: ${missing.map((e) => e.path).join(", ")} — ${FETCHER} loads ${missing.length === 1 ? "it" : "them"}.`;
  } else if (off.length) {
    status.dataset.held = "off";
    status.textContent = "in your priors · turned off";
    status.title = off.map((e) => `${e.path} — off, decided ${e.decidedBy == null ? "by the default" : `at ${e.decidedBy || "the corpus root"}`}`).join("\n");
  } else {
    status.dataset.held = "on";
    status.textContent = "in your priors";
    status.title = `Loaded and in play:\n${entries.map((e) => e.path).join("\n")}`;
  }
}

function draw(a) {
  const card = $("archon");
  if (!card) return;
  const c = a.canon;
  $("archon-who").textContent = a.who;
  $("archon-term").textContent = a.term ?? "";
  $("archon-gloss").textContent = a.gloss ?? "";

  const orig = $("archon-orig");
  const en = $("archon-en");
  const gif = $("chat-motto-gif");
  const src = $("archon-src");
  const tr = $("archon-tr");
  const held = $("archon-held");
  const note = $("archon-note");
  const mod = $("archon-module");

  orig.hidden = en.hidden = src.hidden = tr.hidden = note.hidden = true;
  held.textContent = "";
  held.dataset.held = "unknown";
  if (gif) gif.hidden = !a.gif;

  if (c) {
    setQuote(orig, c.text, c.lang);
    card.dataset.lang = c.lang;
    if (c.en && c.lang !== "en") setQuote(en, c.en, "en");

    src.textContent = c.loc;
    src.hidden = false;
    if (c.prior) {
      src.disabled = false;
      src.title = `Open it in your priors, at this passage — ${c.prior}`;
      src.onclick = () => openPrior(c.prior, c.text, held);
    } else {
      src.disabled = true;
      src.title = c.charter ? `This project's own charter — ${c.charter}` : "";
      src.onclick = null;
    }
    if (c.tr) {
      tr.textContent = `tr. ${c.tr}`;
      tr.hidden = false;
      tr.disabled = !c.enPrior;
      tr.title = c.enPrior ? `Open the translation in your priors, at this passage — ${c.enPrior}` : "";
      tr.onclick = c.enPrior ? () => openPrior(c.enPrior, c.en, held) : null;
    }
    if (c.note) {
      note.textContent = c.note;
      note.hidden = false;
    }
    const paths = [c.prior, c.enPrior].filter(Boolean);
    if (paths.length) checkHeld(paths, held);
    else if (c.charter) {
      held.dataset.held = "own";
      held.textContent = "this project's own charter";
    }
  } else {
    card.dataset.lang = "";
  }

  mod.textContent = "";
  const k = document.createElement("span");
  k.className = "archon-module-k";
  k.textContent = "in this app";
  const cite = document.createElement("code");
  cite.textContent = a.module.cite;
  mod.append(k, " ", cite, ` “${a.module.line}”`);
  card.hidden = false;
}

const pick = pickArchon(ARCHON_CANON, lastShown());
draw(pick);
remember(archonKey(pick));
