// explore.js — the Explore tab: one source in focus at a time, the nine
// terrains as toggleable interfaces onto it, pivoting (a selection carries
// across surfaces) and zooming (Pattern → Figure → Ground → bytes — the
// descent test made navigable).
//
// WHAT THIS FILE NEVER DOES: derive a terrain from content (the cube is
// refuted as a content classifier — terrains are surfaces of the reading,
// never labels of the source); originate a number (every figure shown is a
// computed cell from the server/engine — II.9); phrase a null-arm claim
// finer than its finestRank; hide a truncation (what a cap dropped is
// counted next to what it kept); or load anything from a host that is not
// this one.
//
// Coordinate spaces, kept apart by name: b0/b1 are UTF-8 BYTE offsets (the
// engine's space), c0/c1 are JS-string CHAR offsets (the chat's ref space).
// byteCharIndex() converts, built once per source, measured not guessed.

import { renderBlocksInto, parseInline } from "../render.js";
// Viselect (MIT, vendored — the page loads nothing remote): the rubber-band
// selection engine that makes the files view feel like a desktop, not a list.
import SelectionArea from "./vendor/viselect.mjs";
// The file's own face — the preview overlay's renderers, pure enough to test
// under node (preview.test.mjs) because they build DOM through ownerDocument.
import { buildPreview, previewFace, FACE_NOTE, parseDelimited } from "./preview.js";
// Handles on the relation list (pure; conformance in relations-chain.test.mjs)
// — the discourse chain and the referent siblings that make a clause fragment
// readable. diaNorm is the engine's own fold, injected the cast.js way.
import { chainRelations } from "../relations-chain.js";
// The priors organ's gate — the same module the server folds the ledger
// with, so "what decides this document" is ONE implementation on both sides.
import { effectivePrior, declarationsFrom } from "../priors-toggles.js";
import { diaNorm } from "/engine/perceiver/text/surfaces.js";

const $ = (id) => document.getElementById(id);
const api = async (path, init) => {
  const res = await fetch(path, init);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `${res.status}`);
  return body;
};
const fmtBytes = (n) => (n == null ? "" : n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

// ── state ───────────────────────────────────────────────────────────────────
const state = {
  path: null, // rel path of the source in focus
  opening: null, // rel path of a source whose stat is still in flight
  openError: null, // {path, detail} — an open that failed, said out loud
  // The preview overlay, deliberately its own little world: it holds a
  // SECOND source (the one being looked at) so that peeking at a file does
  // not disturb — or start a read of — the one in the reader behind it.
  pv: null, // {path, name, list, i, source, text, raw, loading, error}
  source: null, // /api/source result
  text: null, // decoded text (textual modalities)
  terrain: "Field", // the active interface — Field is the declared default
  read: null, // sessionTerrains result (read.terrains) or {gap}
  readPhase: null, // job phase while a read runs
  kinds: null, // kinds job visible result
  kindsArm: null, // null arm result once landed
  kindsPhase: null,
  kindsOpts: null,
  sel: null, // pivot selection {type, label, ...}
  focus: null, // Field char-range focus {c0, c1, why}
  expandedKind: null,
  hexOffset: 0,
  grid: null, // TERRAIN_GRID from the read's Paradigm surface
  bcIndex: null, // Uint32Array: byte offset of each char index
  lenses: JSON.parse(localStorage.getItem("fold-explore-lenses") ?? "[]"),
  // "My files" starts empty. browseDir === "" && libraryOrigin === null IS
  // the library root (library.js's flat added-index); libraryOrigin, once
  // set, names the added folder a browseDir descends from — the boundary
  // "up" may not climb past, back to real-filesystem browsing at large.
  libraryOrigin: null,
  deskQuery: "", // initialized, not left undefined — read unguarded in several places
  // the web view's own state — q survives view switches; history/settings
  // are server truth, reloaded whenever set back to null
  web: { q: "", settings: null, results: null, busy: null, fetched: null, history: null, historyLoading: false },
  // the priors view's own state — data is server truth (/api/priors),
  // reloaded whenever set back to null; expanded/children survive view
  // switches; focus is one document's papers in hand
  priors: { data: null, loading: false, error: null, expanded: new Set(), children: new Map(), focus: null, busy: null },
};

// The nine, in canon order, so the cube renders before any read has run.
// Names only — everything richer (blindTo, dependsOn) arrives with the read
// from the engine's own TERRAIN_GRID and replaces this.
const FALLBACK_GRID = [
  { terrain: "Void", domain: "Existence", grain: "Ground" },
  { terrain: "Entity", domain: "Existence", grain: "Figure" },
  { terrain: "Kind", domain: "Existence", grain: "Pattern" },
  { terrain: "Field", domain: "Structure", grain: "Ground" },
  { terrain: "Link", domain: "Structure", grain: "Figure" },
  { terrain: "Network", domain: "Structure", grain: "Pattern" },
  { terrain: "Atmosphere", domain: "Interpretation", grain: "Ground" },
  { terrain: "Lens", domain: "Interpretation", grain: "Figure" },
  { terrain: "Paradigm", domain: "Interpretation", grain: "Pattern" },
];
const grid = () => state.grid ?? FALLBACK_GRID;
const cellOf = (t) => grid().find((c) => c.terrain === t);

// ── byte/char index ─────────────────────────────────────────────────────────
function byteCharIndex(text) {
  const idx = new Uint32Array(text.length + 1);
  let bytes = 0;
  let i = 0;
  while (i < text.length) {
    idx[i] = bytes;
    const code = text.codePointAt(i);
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
    if (code > 0xffff) {
      idx[i + 1] = idx[i]; // low surrogate maps to the same byte start
      i += 2;
    } else i += 1;
  }
  idx[text.length] = bytes;
  return idx;
}
function charOfByte(b) {
  if (!state.bcIndex) return null;
  const idx = state.bcIndex;
  let lo = 0;
  let hi = idx.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (idx[mid] < b) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
const byteRangeToChars = (b0, b1) => (state.bcIndex ? { c0: charOfByte(b0), c1: charOfByte(b1) } : null);

// Word-bounded occurrence scan, shared by every mark path — "exact surface
// match, case-folded" must mean the surface as a word, not as a substring
// ("Void" may not light up inside "unavoidable").
const isLetter = (ch) => ch != null && /\p{L}|\p{N}/u.test(ch);
function* wordOccurrences(lowerHaystack, lowerNeedle) {
  let at = lowerHaystack.indexOf(lowerNeedle);
  while (at !== -1) {
    const before = lowerHaystack[at - 1];
    const after = lowerHaystack[at + lowerNeedle.length];
    if (!isLetter(before) && !isLetter(after)) yield at;
    at = lowerHaystack.indexOf(lowerNeedle, at + lowerNeedle.length);
  }
}

/**
 * Field only ever received pivots (marking occurrences of a selection made
 * elsewhere); it never made one. A name in the prose is the most natural
 * place to START a hop — this is the other direction, matched against the
 * SAME cast the Entity surface already found, through the SAME fold
 * (diaNorm) the rest of this file's containment already shares (CLAUDE.md's
 * diacritics lesson). No new discovery — a lookup against a landed read.
 */
function referentForSurface(text) {
  const referents = state.read?.terrains?.Entity?.referents ?? [];
  const needle = diaNorm(text);
  if (!needle || needle.length < 2) return null;
  for (const r of referents) {
    if (diaNorm(r.display) === needle) return r;
    for (const s of r.surfaces ?? []) {
      if (diaNorm(typeof s === "string" ? s : s.surface) === needle) return r;
    }
  }
  return null;
}

/**
 * Selecting a word in Field's own text is the tap-out: if it names a
 * referent the read already found, the pivot chip opens on it, exactly as
 * if the same referent had been clicked as a cast card. An ordinary
 * selection that matches nothing is left alone — copy/paste is unaffected.
 */
function wireSelectToPivot(container) {
  container.addEventListener("mouseup", () => {
    const picked = String(window.getSelection?.().toString() ?? "").trim();
    if (!picked || picked.length > 80 || /\n/.test(picked)) return;
    const r = referentForSurface(picked);
    if (!r) return;
    if (state.sel?.type === "referent" && state.sel.label === r.display) return;
    state.sel = { type: "referent", label: r.display, surfaces: (r.surfaces ?? []).map((s) => (typeof s === "string" ? s : s.surface)).filter(Boolean) };
    renderAll();
  });
}

/** The one hint that Field's prose can be tapped, wherever a doc/holder earns it. */
function noteSelectToPivot(surface) {
  const known = state.read?.terrains?.Entity?.referents?.length ?? 0;
  if (known) {
    note(
      surface,
      "shown",
      `select a name to open its cast · relations · graph entry — ${known} known`,
      "matches the same cast (sessionReferents) the Entity surface already found; an ordinary selection that matches nothing is left alone",
    );
  }
}

/**
 * Whether the standing selection points at this referent — not only when it
 * WAS the referent card clicked (state.sel.type === "referent"), but also
 * when it arrived as a relation or graph node whose subject/object surfaces
 * name the same cast member. Without this, a hop from Link or Network into
 * Entity landed on an unhighlighted list — present, but not answering "why
 * am I here."
 */
function selMatchesReferent(r) {
  if (!state.sel) return false;
  if (state.sel.type === "referent" && state.sel.label === r.display) return true;
  if (!state.sel.surfaces?.length) return false;
  const names = new Set(
    [r.display, ...(r.surfaces ?? []).map((s) => (typeof s === "string" ? s : s.surface))].filter(Boolean).map((s) => diaNorm(s)),
  );
  return state.sel.surfaces.some((s) => names.has(diaNorm(s)));
}

// ── the sidebar ─────────────────────────────────────────────────────────────
// Not a filesystem tree. "My files" is the one destination, and it holds
// nothing until a reader adds something — library.js's own header. Recents
// come from the record — real history, never invented.

/** The one nav target the sidebar has, besides Recent. */
function renderFilesNav() {
  const box = $("tree");
  box.textContent = "";
  const b = el("button", "tree-entry");
  b.id = "my-files-nav";
  b.appendChild(el("span", "twist", "▤"));
  b.appendChild(el("span", "nm", "My files"));
  b.onclick = () => goToLibraryRoot();
  box.appendChild(b);
}

/** Recents, from the append-only record — what was actually opened, in order. */
async function renderRecents() {
  const box = $("recents");
  if (!box) return;
  box.textContent = "";
  let tail = [];
  try {
    tail = (await api("/api/record?tail=200")).tail ?? [];
  } catch {
    return;
  }
  const seen = new Set();
  const recents = [];
  for (let i = tail.length - 1; i >= 0 && recents.length < 6; i--) {
    try {
      const e = JSON.parse(tail[i]);
      if (e.event !== "source-open" || seen.has(e.path)) continue;
      seen.add(e.path);
      recents.push(e);
    } catch {
      /* a line we cannot parse is not a recent */
    }
  }
  if (!recents.length) return;
  box.appendChild(el("div", "rail-hd", "Recent"));
  for (const r of recents) {
    const b = el("button", "tree-entry recent");
    b.appendChild(el("span", "twist", ""));
    // deposits are content-addressed (name.<hash>.ext) — the hash is
    // machinery, not a name; it stays in the tooltip
    const base = r.path.split("/").pop().replace(/\.[0-9a-f]{8,}(\.[^.]+)$/, "$1");
    b.appendChild(el("span", "nm", base));
    b.title = r.path;
    b.onclick = () => openSource(r.path);
    box.appendChild(b);
  }
}

function markCurrentInRail() {
  const atRoot = !(state.browseDir ?? "") && !state.libraryOrigin;
  const myFilesBtn = document.getElementById("my-files-nav");
  if (myFilesBtn) myFilesBtn.classList.toggle("current", atRoot && state.terrain === "Desk" && !state.source);
  for (const b of document.querySelectorAll(".tree-entry.recent")) {
    b.classList.toggle("current", b.dataset.path === state.path);
  }
}

/** The one way back to an empty-if-you-haven't-added-anything start. */
function goToLibraryRoot() {
  state.path = null;
  state.source = null;
  state.read = null;
  state.readPhase = null;
  state.sel = null;
  state.focus = null;
  state.browseDir = "";
  state.libraryOrigin = null;
  state.deskSel = new Set();
  state.terrain = "Desk";
  renderAll();
  markCurrentInRail();
}

// ── opening a source ────────────────────────────────────────────────────────
const TEXTUAL = new Set(["text", "code", "markdown", "json", "table", "html"]);

async function openSource(relPath, opts = {}) {
  state.path = relPath;
  // A saved page knows its own title, and the index that holds it may not
  // have been fetched yet — opening one straight from a deep link or the
  // rail would otherwise be titled by its content hash forever, since
  // nothing else on this path ever asks for the history.
  if (relPath?.includes("/web/pages/") && !state.web.history) loadWebHistory();
  // The stat is a round trip, and until it lands there is no modality and no
  // Field surface. Saying WHICH file is opening is what keeps the stage from
  // falling back to the file grid the reader just left (visibleViews reads
  // this) — the old code re-rendered with `source === null`, Field was not
  // among the views, and the active view was silently reset to "files", so
  // every open appeared to do nothing at all.
  state.opening = relPath;
  state.openError = null;
  state.source = null;
  state.text = null;
  state.read = null;
  state.readPhase = null;
  state.kinds = null;
  state.kindsArm = null;
  state.kindsPhase = null;
  state.sel = null;
  state.focus = opts.focus ?? null;
  state.expandedKind = null;
  state.hexOffset = 0;
  state.bcIndex = null;
  state.mdRaw = false;
  state.netStage = null;
  state.netFocus = null;
  state.netLayout = null;
  state.netVB = null;
  state.netSearch = "";
  state.sentCache = null;
  state.fold = null;
  state.wordFold = null;
  if (!opts.keepTerrain) state.terrain = "Field";
  document.body.classList.remove("rail-open"); // in embed, picking a source closes the rail
  markCurrentInRail();
  renderAll();

  // An open that fails must SAY so. A library entry can name a file that has
  // since moved or been deleted (the ledger keeps the ref; the bytes are the
  // disk's business), and the old code let the rejection escape into an
  // unhandled promise — the reader clicked, nothing happened, and the only
  // trace was a line in the console nobody was reading.
  try {
    state.source = await api(`/api/source?path=${encodeURIComponent(relPath)}`);
  } catch (e) {
    if (state.opening !== relPath) return; // the reader moved on while this failed
    state.opening = null;
    state.path = null;
    state.openError = { path: relPath, detail: e.message };
    state.terrain = "Desk";
    renderAll();
    return;
  }
  if (state.opening !== relPath) return; // a later open won the race
  state.opening = null;
  renderHeaderline();

  if (TEXTUAL.has(state.source.modality)) {
    const raw = await fetch(`/api/raw?path=${encodeURIComponent(relPath)}`);
    const text = await raw.text();
    if (state.path !== relPath) return;
    state.text = text;
    state.bcIndex = byteCharIndex(state.text);
    startRead(); // the read is the point of this instrument; kinds never auto-runs
  }
  renderAll();
}

// ── the preview overlay: the file in whatever format it is ──────────────────
// Drive's own gesture, and the one this instrument was missing: you look at
// the thing before you interrogate it. Double-click (or Enter, or Space) over
// the grid lifts a full-bleed preview; ‹ › walk the folder without going back
// for it; Esc drops you where you were. The reading surfaces stay behind it —
// the preview never starts a read, so peeking at a 3MB book costs a stat and
// a decode, not ninety seconds of organs.

async function openPreview(entry, list = []) {
  const files = list.filter((e) => !e.dir);
  const i = Math.max(0, files.findIndex((e) => e.path === entry.path));
  state.pv = { path: entry.path, name: entry.name, list: files, i, source: null, text: null, raw: false, loading: true, error: null };
  renderPreview();
  await loadPreview();
}

async function loadPreview() {
  const asked = state.pv?.path;
  if (!asked) return;
  try {
    const src = await api(`/api/source?path=${encodeURIComponent(asked)}`);
    if (state.pv?.path !== asked) return; // ‹ › moved on while this was in flight
    state.pv.source = src;
    renderPreview();
    if (TEXTUAL.has(src.modality)) {
      const r = await fetch(`/api/raw?path=${encodeURIComponent(asked)}`);
      const t = await r.text();
      if (state.pv?.path !== asked) return;
      state.pv.text = t;
    }
  } catch (e) {
    if (state.pv?.path !== asked) return;
    state.pv.error = e.message;
  }
  if (state.pv?.path !== asked) return;
  state.pv.loading = false;
  renderPreview();
}

/** Walk the folder from inside the preview, the way an image viewer does. */
function pvStep(d) {
  const pv = state.pv;
  if (!pv?.list?.length) return;
  const next = pv.i + d;
  if (next < 0 || next >= pv.list.length) return;
  const e = pv.list[next];
  state.pv = { ...pv, i: next, path: e.path, name: e.name, source: null, text: null, raw: false, loading: true, error: null };
  renderPreview();
  loadPreview();
}

function closePreview() {
  state.pv = null;
  renderPreview();
}

function renderPreview() {
  const box = $("preview");
  if (!box) return;
  box.textContent = "";
  const pv = state.pv;
  document.body.classList.toggle("pv-open", !!pv);
  if (!pv) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  const rawUrl = `/api/raw?path=${encodeURIComponent(pv.path)}`;

  // ── the bar: where you are in the folder, and what you can do with this file
  const bar = el("div", "pv-bar");
  const back = el("button", "pv-nav", "‹");
  back.title = "the file before this one in this folder";
  back.disabled = pv.i <= 0;
  back.onclick = () => pvStep(-1);
  const fwd = el("button", "pv-nav", "›");
  fwd.title = "the file after this one in this folder";
  fwd.disabled = pv.i >= pv.list.length - 1;
  fwd.onclick = () => pvStep(1);
  bar.appendChild(back);
  bar.appendChild(fwd);

  const title = el("div", "pv-title");
  title.appendChild(el("span", "pv-name", pv.name));
  const s = pv.source;
  if (s) title.appendChild(el("span", "pv-meta", `${fmtBytes(s.bytes)} · ${s.modality}${s.magic ? ` (${s.magic})` : ""}`));
  if (pv.list.length > 1) title.appendChild(el("span", "pv-meta", `${pv.i + 1} of ${pv.list.length}`));
  bar.appendChild(title);

  // The rendered/raw pivot exists only where there are two honest faces of
  // the same bytes; for a PNG there is no "raw" but the hex dump, which the
  // reader's own source view already owns.
  const face = s ? previewFace(s) : null;
  if (s && (face === "markdown" || face === "html")) {
    const toggle = el("button", null, pv.raw ? "view rendered" : "view raw");
    toggle.onclick = () => {
      state.pv.raw = !state.pv.raw;
      renderPreview();
    };
    bar.appendChild(toggle);
  }

  const dl = document.createElement("a");
  dl.className = "pv-act";
  dl.href = rawUrl;
  dl.download = pv.name;
  dl.title = "download the bytes as they are on disk";
  dl.textContent = "⤓";
  bar.appendChild(dl);

  const tab = document.createElement("a");
  tab.className = "pv-act";
  tab.href = rawUrl;
  tab.target = "_blank";
  tab.rel = "noopener";
  tab.title = "open the bytes in a tab of their own";
  tab.textContent = "⧉";
  bar.appendChild(tab);

  if (s) {
    const read = el("button", "pv-read", "Read this →");
    read.title = "open it in the reader: the cast, the relations, the graph, the trace";
    read.onclick = () => {
      const path = pv.path;
      closePreview();
      openSource(path);
    };
    bar.appendChild(read);
  }

  const x = el("button", "pv-act", "✕");
  x.title = "close (Esc)";
  x.onclick = () => closePreview();
  bar.appendChild(x);
  box.appendChild(bar);

  // ── the body: the file's own face
  const body = el("div", "pv-body");
  if (pv.error) {
    body.appendChild(el("div", "pv-none-glyph", "⃠"));
    body.appendChild(el("div", "pv-none-hd", "This file could not be opened"));
    body.appendChild(el("div", "pv-none-sub", `${pv.path} — ${pv.error}`));
  } else if (!s || (TEXTUAL.has(s.modality) && pv.text == null)) {
    // A textual file has two round trips (the stat, then the bytes). Drawing a
    // face after the first one would flash the "no viewer" refusal at every
    // .js file on the way to rendering it — so the face waits for its material.
    body.appendChild(el("div", "pv-said", "opening…"));
  } else {
    const drawn = buildPreview(body, {
      source: s,
      text: pv.text,
      rawUrl,
      raw: pv.raw,
      markdown: (holder, text) => mdInto(holder, text),
      hex: () => api(`/api/hex?path=${encodeURIComponent(pv.path)}&offset=0`),
    });
    body.appendChild(el("div", "pv-said", FACE_NOTE[drawn === "raw" ? "code" : drawn] ?? ""));
  }
  box.appendChild(body);

  // Clicking the ground behind the sheet closes it, the way every previewer
  // does — but only the ground itself, never a click that started inside.
  box.onpointerdown = (ev) => {
    if (ev.target === box) closePreview();
  };
}

async function startRead() {
  state.readPhase = "queued";
  renderViews();
  const startedFor = state.path; // a poll landing after the reader moved on must not speak for the new source
  const { jobId } = await api("/api/read", { method: "POST", body: JSON.stringify({ path: state.path }) });
  let revealed = 0;
  const tick = async () => {
    if (state.path !== startedFor) return;
    const job = await api(`/api/jobs/${jobId}`);
    if (state.path !== startedFor) return;
    state.readPhase = job.phase;
    if (job.phase === "done") {
      state.read = job.result;
      state.grid = job.result?.terrains?.Paradigm?.grid ?? state.grid;
      state.readPhase = null;
      renderAll();
      applyPendingFocus();
      // Kinds induce themselves, at the quick draw, as soon as the read is
      // in (user, 2026-08-17). Every other surface arrives on its own; this
      // one asked the reader to press a button before it would say anything,
      // which made "are there kinds here?" a question you had to know to ask.
      // The escalation stays explicit — `thorough` is a stricter, much longer
      // run, and it is still the reader's to call — and the quick draw is
      // armed exactly as before: its null arm lands after, the kinds render
      // `provisional` until it does, and the renderer still may not phrase
      // finer than the arm's finestRank. Automatic is the trigger, not the
      // standard of evidence.
      if (TEXTUAL.has(state.source?.modality ?? "") && !state.kinds && !state.kindsPhase) startKinds(true);
      return;
    }
    if (job.phase === "error") {
      state.readPhase = null;
      state.read = { gap: { reason: "read_failed", detail: job.error?.message } };
      renderAll();
      return;
    }
    // Surfaces stream in cheapest-first; each new one reveals its view now
    // rather than when the slowest organ lands.
    if (job.partial) {
      state.read = { terrains: job.partial };
      state.grid = job.partial.Paradigm?.grid ?? state.grid;
      const n = Object.keys(job.partial).length;
      if (n !== revealed) {
        revealed = n;
        renderAll();
      } else renderViews();
    } else renderViews();
    setTimeout(tick, 500);
  };
  tick();
}

function applyPendingFocus() {
  const q = state.pendingFocus;
  if (!q) return;
  state.pendingFocus = null;
  if (q.b0 != null && state.bcIndex) {
    const r = byteRangeToChars(q.b0, q.b1 ?? q.b0);
    if (r) state.focus = { ...r, why: `bytes ${q.b0}–${q.b1}` };
  } else if (q.c0 != null) {
    state.focus = { c0: q.c0, c1: q.c1 ?? q.c0, why: `chars ${q.c0}–${q.c1}` };
  }
  state.terrain = "Field";
  renderAll();
}

// ── header / footer lines ───────────────────────────────────────────────────
function renderHeaderline() {
  const box = $("source-line");
  box.textContent = "";
  if (!state.source) {
    if (state.openError) {
      // A failed open is a fact about this instrument's world, so it is shown
      // where the open would have been, not swallowed.
      const warn = el("span", "open-error", `could not open ${state.openError.path.split("/").pop()} — ${state.openError.detail}`);
      warn.title = state.openError.path;
      box.appendChild(warn);
      return;
    }
    if (state.opening) {
      box.appendChild(el("span", "muted", `opening ${state.opening.split("/").pop()}…`));
      return;
    }
    box.appendChild(el("span", "muted", state.browseDir ? `browsing ${state.browseDir}` : "nothing open — pick something from My files"));
    return;
  }
  const s = state.source;
  const close = el("button", "linkish", "✕");
  close.style.textDecoration = "none";
  close.title = "back to the folder";
  close.onclick = () => {
    state.path = null;
    state.source = null;
    state.read = null;
    state.readPhase = null;
    state.sel = null;
    state.focus = null;
    markCurrentInRail();
    renderAll();
  };
  box.appendChild(close);
  // What is open, said plainly and in this order: the kind of file, its name,
  // then everything else quiet behind it. It used to be one mono run-on that
  // put the name between a ✕ and a size, and ended on `cursor: read at
  // 15:27:23Z` — a wall-clock stamp of the current render, which told the
  // reader nothing and changed every time the view redrew.
  const saved = savedPageFor(state.path);
  const kind = el("span", "ftype", saved ? "PAGE" : fileKind(s));
  kind.title = saved
    ? `a page this instrument fetched and kept whole — read as ${s.modality}`
    : `${s.modality}${s.magic ? ` · ${s.magic}` : ""} — how this file is being read`;
  box.appendChild(kind);
  const name = el("span", "name", saved?.title || s.name);
  name.title = saved ? `${saved.finalUrl ?? saved.url}\n${state.path}` : state.path;
  box.appendChild(name);
  const dir = state.path?.includes("/") ? state.path.slice(0, state.path.lastIndexOf("/")) : null;
  if (saved) box.appendChild(el("span", "where", `${hostOfUrl(saved.finalUrl ?? saved.url)} · retrieved ${String(saved.retrievedAt).slice(0, 10)}`));
  else if (dir) box.appendChild(el("span", "where", `in ${dir}`));
  box.appendChild(
    el("span", "meta", `${fmtBytes(s.bytes)} · modified ${new Date(s.mtime).toISOString().slice(0, 10)}`),
  );
  // The one control that is always here, whatever is open: see the file
  // itself. Everything else on this page is a READING of the file — a
  // reader who just wants the thing as it is should never have to work out
  // which surface is least interpreted.
  const see = el("button", "see-file", "⛶ view the file");
  see.title = "the file in its own format — the image, the page, the document, the bytes (Esc closes)";
  see.onclick = () => openPreview({ path: state.path, name: s.name }, []);
  box.appendChild(see);
  // Inside the Converse pane, a source can be handed to the chat as
  // material — the request crosses the frame; the chat side owns what it
  // does with it (and its own mute/unmute strip).
  if (document.body.classList.contains("embed") && TEXTUAL.has(s.modality) && state.text != null) {
    const toChat = el("button", null, "use in chat");
    toChat.style.marginLeft = "10px";
    toChat.onclick = async () => {
      toChat.disabled = true;
      // A prior crosses WITH its papers. The prefix is the corpus mount the
      // server resolves (PRIORS_ROOT = ../live_priors, browse-root-relative
      // "live_priors/…"); papers unavailable never blocks the text crossing.
      let provenance = null;
      if (state.path?.startsWith("live_priors/")) {
        try {
          const doc = await api(`/api/priors/doc?path=${encodeURIComponent(state.path.slice("live_priors/".length))}`);
          if (doc.provenance) provenance = { line: doc.provenanceLine, fields: doc.provenance, path: doc.path };
        } catch {
          /* the text still crosses; the tab can be asked for papers again */
        }
      }
      parent.postMessage({ type: "fold:material:add", name: s.name, path: state.path, text: state.text, ...(provenance ? { provenance } : {}) }, "*");
      toChat.textContent = "sent to chat ✓";
    };
    box.appendChild(toChat);
  }
}

// ── the views ───────────────────────────────────────────────────────────────
// No map, no grid: each surface reveals itself when it has something to
// show, as a quiet word in a row. The nine-fold canon behind them lives in
// the legend for whoever wants it — it never fronts the instrument.
const VIEW_LABEL = {
  Desk: "files",
  Web: "web",
  Priors: "priors",
  Field: "source",
  Entity: "cast",
  Link: "relations",
  Network: "graph",
  Atmosphere: "trace",
  Kind: "kinds",
  Void: "gaps",
  Lens: "folds",
  Paradigm: "legend",
};

/**
 * The canonical order of the row, once and in one place. Nothing may reorder
 * it: the row's whole job while a read streams is to stay still.
 */
const VIEW_ORDER = [
  "Desk", "Web", "Priors", "Field", "Entity", "Link",
  "Network", "Atmosphere", "Kind", "Void", "Lens", "Paradigm",
];
/** Views whose label carries a number, so the slot can be reserved before the
 * number exists — a count arriving must not push its neighbours sideways. */
const COUNTED = new Set(["Web", "Priors", "Entity", "Link", "Network", "Kind", "Void", "Lens"]);

/**
 * The views of this source: the ones that have landed, and — while a read is
 * still running — the ones it is going to produce, held in place as pending.
 *
 * A read streams its surfaces cheapest-first over a minute and a half, and
 * the row used to be built from what had ALREADY landed. So it grew a tab at
 * a time, each arrival reflowing the row and moving every label to its right
 * out from under the pointer. A surface that has not arrived yet is not the
 * same as a surface that is not coming, and the honest rendering of the first
 * is a tab you can see and cannot yet press — which is also the stable one.
 */
function visibleViews() {
  const T = state.read?.terrains;
  const reading = state.readPhase != null;
  const textual = TEXTUAL.has(state.source?.modality ?? "");
  const landed = new Map();
  // files, web and priors are always places to stand; web carries its
  // history count, priors how many documents are in play
  landed.set("Desk", {});
  landed.set("Web", { n: state.web.history?.entries?.length || undefined });
  landed.set("Priors", { n: state.priors.data?.enabledCount || undefined });
  // A file whose stat is still in flight already has a place to stand — see
  // openSource: without this the active view is reset to "files" mid-open and
  // the file never appears.
  if (state.source || state.opening) landed.set("Field", {});
  if (T?.Entity?.referents?.length) landed.set("Entity", { n: T.Entity.referents.length });
  if (T?.Link?.total) landed.set("Link", { n: T.Link.total });
  if (T?.Network?.nodeCount) landed.set("Network", { n: T.Network.nodeCount });
  if (T?.Atmosphere?.frames?.length) landed.set("Atmosphere", {});
  if (T?.Kind && textual) landed.set("Kind", { n: state.kinds?.kinds?.length });
  if (T?.Void?.ledger?.length) landed.set("Void", { n: T.Void.ledger.length });
  if (state.source) landed.set("Lens", { n: state.lenses.length || undefined });
  if (T?.Paradigm) landed.set("Paradigm", {});

  // What this read is still expected to bring. Kind is the one surface a
  // source can be genuinely without, so it is only promised for material the
  // induction actually runs on; the rest every read produces.
  const promised = reading
    ? VIEW_ORDER.filter((id) => id !== "Kind" || textual)
    : [];

  return VIEW_ORDER.filter((id) => landed.has(id) || promised.includes(id)).map((id) =>
    landed.has(id) ? { id, ...landed.get(id) } : { id, pending: true },
  );
}

function renderViews() {
  const box = $("views");
  box.textContent = "";
  const views = visibleViews();
  // If the active view lost its ground (new source), fall back to the source itself.
  // If the active view lost its ground (a new source, or none), fall back
  // to the first view that IS available — "Field" is not a safe default
  // when no source is open, since Field is not among the views then.
  if (!views.some((v) => v.id === state.terrain)) state.terrain = views[0]?.id ?? "Field";
  // Two levels, one row, and they were reading as one list. `files` and `web`
  // are PLACES TO STAND — where material comes from, present whether or not
  // anything is open. Everything after them is a SURFACE OF THE OPEN SOURCE.
  // A rule between them says so without adding a word.
  const PLACES = new Set(["Desk", "Web", "Priors"]);
  let sepDrawn = false;
  for (const v of views) {
    if (!sepDrawn && !PLACES.has(v.id)) {
      sepDrawn = true;
      if (box.childElementCount) box.appendChild(el("span", "view-sep"));
    }
    const b = el("button", `view${v.id === state.terrain ? " active" : ""}${v.pending ? " pending" : ""}`);
    b.setAttribute("role", "tab");
    b.append(VIEW_LABEL[v.id]);
    // The count slot exists from the first frame for every view that will
    // ever carry a number, so the number landing changes a glyph, not a
    // layout. Reserved width lives in the stylesheet, not in a space here.
    if (COUNTED.has(v.id)) b.appendChild(el("span", "n", v.n == null ? "" : String(v.n)));
    if (v.pending) {
      b.disabled = true;
      b.title = "still reading — this surface hasn't landed yet";
    } else {
      const c = cellOf(v.id);
      if (c?.blindTo) b.title = `blind to ${c.blindTo}`;
      b.onclick = () => {
        state.terrain = v.id;
        renderAll();
      };
    }
    box.appendChild(b);
  }
  if (state.readPhase != null || state.kindsPhase != null) {
    const dot = el("span", "reading-dot");
    dot.title = state.readPhase != null ? `reading… (${state.readPhase})` : `inducing… (${state.kindsPhase})`;
    box.appendChild(dot);
  }
}

function renderMeta() {
  const crumbs = $("crumbs");
  crumbs.textContent = "";
  const drilled = (state.expandedKind != null && state.terrain === "Kind") || (state.focus && state.terrain === "Field");
  if (drilled) {
    const root = el("button", null, VIEW_LABEL[state.terrain]);
    root.onclick = () => {
      state.focus = null;
      state.expandedKind = null;
      renderAll();
    };
    crumbs.appendChild(root);
    if (state.expandedKind != null && state.terrain === "Kind") {
      crumbs.appendChild(el("span", "sep", "▸"));
      crumbs.appendChild(el("span", null, state.expandedKind));
    }
    if (state.focus && state.terrain === "Field") {
      crumbs.appendChild(el("span", "sep", "▸"));
      crumbs.appendChild(el("span", null, state.focus.why ?? `chars ${state.focus.c0}–${state.focus.c1}`));
    }
  }

  const chipBox = $("pivot-chip");
  chipBox.textContent = "";
  if (state.sel) {
    const chip = el("span", "chip");
    // The label goes in its own element so the ellipsis has something to cut:
    // a bare text node beside the ✕ cannot be truncated without taking the
    // close button with it.
    chip.appendChild(el("span", null, `${state.sel.label} · ${state.sel.type}`));
    chip.title = `${state.sel.label} · ${state.sel.type}`;
    const x = el("button", null, "✕");
    x.onclick = () => {
      state.sel = null;
      renderAll();
    };
    chip.appendChild(x);
    chipBox.appendChild(chip);
    // The hop cluster: wherever this selection can land, one word each.
    // The same selection, seen from another surface — that is the pivot.
    const HOPS = {
      referent: ["Field", "Link", "Network", "Entity"],
      node: ["Field", "Link", "Network", "Entity"],
      relation: ["Field", "Link", "Network", "Entity"],
      member: ["Field", "Kind"],
      frame: ["Field", "Atmosphere"],
    };
    const available = new Set(visibleViews().map((v) => v.id));
    for (const dest of HOPS[state.sel.type] ?? ["Field"]) {
      if (dest === state.terrain || !available.has(dest)) continue;
      const b = el("button", null, `→ ${VIEW_LABEL[dest]}`);
      b.onclick = () => {
        state.terrain = dest;
        renderAll();
      };
      chipBox.appendChild(b);
    }
  }
}

// ── surfaces ────────────────────────────────────────────────────────────────
/**
 * The standing of what a view shows, and — behind it — why.
 *
 * Every view opened on a paragraph explaining its own epistemics, above the
 * thing the reader came for. The standing still has to be declared (that is
 * not negotiable), but a declaration nobody needs twice belongs on the chip
 * as a tooltip, not in the reader's way. `text` is what stays visible and
 * should be facts — counts, sizes, what was capped; `why` is the sentence.
 */
function note(surface, standing, text, why) {
  const n = el("div", "surface-note");
  const s = el("span", `standing ${standing}`, standing);
  if (why) {
    s.title = why;
    s.classList.add("asks");
  }
  n.appendChild(s);
  if (text) n.append(text);
  surface.appendChild(n);
  return n;
}

function gapFace(surface, kind, text) {
  const g = el("div", "gapface");
  g.appendChild(el("span", "kind", kind));
  g.append(text);
  surface.appendChild(g);
}

// ── the fold: an extractive summary of wherever you are looking ─────────────
// The house's one operation, without a mouth: the scope's most novel
// sentences (engine surprisal against the document's own table), verbatim
// and addressed. Server-computed; the result states kept-of-N.
async function requestFold(scope, into = "fold") {
  const body = { path: state.path, ...scope };
  state[into] = { busy: true };
  renderAll();
  try {
    const out = await api("/api/fold", { method: "POST", body: JSON.stringify(body) });
    state[into] = { ...out, scopeAsked: scope };
  } catch (e) {
    state[into] = { gap: { reason: "fold_failed", detail: e.message } };
  }
  renderAll();
}

function foldCard(holderState, into) {
  const card = el("div", "fold-card");
  const head = el("div", "fold-head");
  const chip = el("span", "standing shown", "shown");
  head.appendChild(chip);
  if (holderState.busy) {
    head.append(" folding…");
    card.appendChild(head);
    return card;
  }
  if (holderState.gap) {
    head.append(` ${holderState.gap.silence ?? holderState.gap.reason}: ${holderState.gap.detail ?? ""}`);
    card.appendChild(head);
    return card;
  }
  const scopeWord = holderState.scope?.word ? `"${holderState.scope.word}" — its arrival sentences` : holderState.scope?.whole ? "the whole source" : `chars ${holderState.scope?.charStart?.toLocaleString()}–${holderState.scope?.charEnd?.toLocaleString()}`;
  head.append(` a fold of ${scopeWord} · kept ${holderState.kept} of ${holderState.of} sentences`);
  head.title = holderState.method ?? "";
  const x = el("button", "fold-x", "✕");
  x.onclick = () => {
    state[into] = null;
    renderAll();
  };
  head.appendChild(x);
  card.appendChild(head);
  for (const l of holderState.lines ?? []) {
    const line = el("button", "fold-line");
    // display face: leading list markers trimmed, inline marks rendered —
    // the ADDRESS stays the verbatim source; only the clothes change here.
    const shown = (l.text.length > 400 ? `${l.text.slice(0, 399)}…` : l.text).replace(/^\s*[-*•]\s+/, "");
    for (const part of parseInline(shown)) {
      if (!part.marks.length) line.append(part.text);
      else {
        let outer = null;
        let inner = null;
        for (const mk of part.marks) {
          const e = el({ strong: "strong", em: "em", code: "code" }[mk]);
          if (inner) inner.appendChild(e);
          else outer = e;
          inner = e;
        }
        inner.append(part.text);
        line.appendChild(outer);
      }
    }
    line.title = `chars ${l.charStart}–${l.charEnd} · carries: ${(l.covers ?? []).join(", ")} — click to land there in the source`;
    line.onclick = () => {
      state.focus = { c0: l.charStart, c1: l.charEnd, why: "fold line" };
      state.terrain = "Field";
      renderAll();
    };
    card.appendChild(line);
  }
  if (holderState.forms) {
    card.appendChild(el("div", "fold-foot", `together these carry ${holderState.forms.covered} of the scope's ${holderState.forms.of} recurring words — verbatim lines in document order, each at its address; a change of resolution, not a paraphrase`));
  }
  return card;
}

const surfaceRenderers = {
  Field: renderField,
  Entity: renderEntity,
  Link: renderLink,
  Network: renderNetwork,
  Atmosphere: renderAtmosphere,
  Kind: renderKind,
  Void: renderVoid,
  Lens: renderLens,
  Paradigm: renderParadigm,
};

/** Is the files view what the stage is currently showing? The desk shows
 *  whenever no source is open, whatever `terrain` happens to say — so an
 *  "is the desk visible" question must ask this, not `terrain === "Desk"`. */
const showingDesk = () => !state.source || state.terrain === "Desk";

function renderSurface() {
  const surface = $("surface");
  surface.textContent = "";
  // A lens restores the view it was saved FROM — saving while looking at the
  // lens list must not save "the lens list" as the destination.
  if (state.terrain !== "Lens") state.lastContentTerrain = state.terrain;
  if (state.terrain === "Web") {
    renderWeb(surface);
    return;
  }
  if (state.terrain === "Priors") {
    renderPriors(surface);
    return;
  }
  if (!state.source && state.opening && state.terrain === "Field") {
    gapFace(surface, "opening", `reading ${state.opening.split("/").pop()} off the disk…`);
    return;
  }
  if (!state.source || state.terrain === "Desk") {
    renderBrowse(surface);
    return;
  }
  surfaceRenderers[state.terrain]?.(surface);
}

// ── the desk: no source in focus, so the folder itself is the surface ──────
// The rail's tree and this grid are the same listing, same declared order —
// two faces of one directory, not two claims.
const TILE_GLYPH = [
  [/\.(png|jpe?g|gif|webp|avif|bmp|ico|tiff?|svg)$/i, "▣", "image"],
  [/\.(mp3|wav|ogg|oga|m4a|flac)$/i, "♫", "audio"],
  [/\.(mp4|m4v|webm|mov)$/i, "▶", "video"],
  [/\.pdf$/i, "⎘", "pdf"],
  [/\.(md|markdown)$/i, "¶", "markdown"],
  [/\.(csv|tsv)$/i, "▤", "table"],
  [/\.(json|jsonl)$/i, "{}", "json"],
  [/\.(js|mjs|cjs|ts|tsx|jsx|py|rb|go|rs|c|h|cpp|java|sh|sql|css|ya?ml|toml|xml)$/i, "‹›", "code"],
  [/\.(zip|gz|tgz|dmg)$/i, "⬡", "archive"],
];
const glyphOf = (name) => TILE_GLYPH.find(([re]) => re.test(name))?.[1] ?? "≡";
const kindOf = (name) => TILE_GLYPH.find(([re]) => re.test(name))?.[2] ?? "file";
/** A directory's glyph stays accent-colored inline (no chip square — the
 * folder tile has its own row layout); a file's gets its kind's chip. */
const chipClassOf = (entry) => `glyph${entry.dir ? "" : ` chip-${kindOf(entry.name)}`}`;

// A single hidden native file input, reused across renders — the browser's
// own picker, which reaches anywhere on the reader's OS and is never
// confined to the browse root the way /api/tree is.
const FILE_INPUT = (() => {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.style.display = "none";
  document.body.appendChild(input);
  return input;
})();

/** One file per request (no multipart parser this server carries), named via X-File-Name. */
async function uploadFiles(fileList) {
  for (const file of fileList) {
    const buf = await file.arrayBuffer();
    await fetch("/api/library/upload", {
      method: "POST",
      headers: { "content-type": file.type || "application/octet-stream", "x-file-name": encodeURIComponent(file.name) },
      body: buf,
    });
  }
}

/** The "+ New" dropdown: upload, or reference something already on disk. */
function openNewMenu(ev, anchor) {
  ev.stopPropagation();
  document.querySelector(".new-menu")?.remove();
  const menu = el("div", "ctx new-menu");
  const uploadItem = el("button", "ctx-item", "Upload files");
  uploadItem.onclick = () => {
    menu.remove();
    FILE_INPUT.click();
  };
  const addRefItem = el("button", "ctx-item", "Add from this computer…");
  addRefItem.onclick = () => {
    menu.remove();
    openPickerDialog();
  };
  menu.appendChild(uploadItem);
  menu.appendChild(addRefItem);
  const rect = anchor.getBoundingClientRect();
  menu.style.left = `${rect.left}px`;
  menu.style.top = `${rect.bottom + 4}px`;
  document.body.appendChild(menu);
  const away = (e2) => {
    if (!menu.contains(e2.target) && e2.target !== anchor) {
      menu.remove();
      document.removeEventListener("pointerdown", away, true);
    }
  };
  setTimeout(() => document.addEventListener("pointerdown", away, true), 0);
}

/**
 * "Add from this computer…" — a small, self-contained browser over the
 * confined tree (the OS-native picker above is what actually reaches the
 * whole machine; this one references what this instrument can already
 * see, without copying it). Its own local state, not the app's — closing
 * without adding leaves nothing behind.
 */
function openPickerDialog() {
  let pDir = "";
  const picked = new Map();
  const dlg = document.createElement("dialog");
  dlg.className = "picker-dialog";
  document.body.appendChild(dlg);
  dlg.addEventListener("close", () => dlg.remove());

  const renderPicker = async () => {
    const listing = await api(`/api/tree?path=${encodeURIComponent(pDir)}`);
    if (!dlg.isConnected) return; // closed while the fetch was in flight
    dlg.textContent = "";
    const head = el("div", "picker-head");
    head.appendChild(el("h2", null, "Add from this computer"));
    const closeBtn = el("button", "linkish", "✕");
    closeBtn.onclick = () => dlg.close();
    head.appendChild(closeBtn);
    dlg.appendChild(head);

    const crumbs = el("div", "picker-crumbs");
    const rootBtn = el("button", "linkish", "Everything this instrument can see");
    rootBtn.onclick = () => {
      pDir = "";
      renderPicker();
    };
    crumbs.appendChild(rootBtn);
    let walked = "";
    for (const part of pDir.split("/").filter(Boolean)) {
      walked = walked ? `${walked}/${part}` : part;
      crumbs.appendChild(el("span", "sep", "›"));
      const target = walked;
      const b = el("button", "linkish", part);
      b.onclick = () => {
        pDir = target;
        renderPicker();
      };
      crumbs.appendChild(b);
    }
    dlg.appendChild(crumbs);

    const list = el("div", "picker-list");
    if (pDir) {
      const up = el("div", "picker-row");
      const upBtn = el("button", "linkish", "↩ ..");
      upBtn.onclick = () => {
        pDir = pDir.split("/").slice(0, -1).join("/");
        renderPicker();
      };
      up.appendChild(upBtn);
      list.appendChild(up);
    }
    for (const entry of listing.entries) {
      const row = el("div", `picker-row${picked.has(entry.path) ? " picked" : ""}`);
      const check = el("button", "picker-check", picked.has(entry.path) ? "☑" : "☐");
      check.title = entry.dir ? "add this whole folder as a reference" : "add this file";
      check.onclick = () => {
        if (picked.has(entry.path)) picked.delete(entry.path);
        else picked.set(entry.path, entry);
        renderPicker();
      };
      row.appendChild(check);
      row.appendChild(el("span", chipClassOf(entry), entry.dir ? "▸" : glyphOf(entry.name)));
      const nameBtn = el("button", "linkish picker-name", entry.name);
      nameBtn.onclick = entry.dir ? () => { pDir = entry.path; renderPicker(); } : () => check.click();
      row.appendChild(nameBtn);
      if (!entry.dir) row.appendChild(el("span", "sz", fmtBytes(entry.size)));
      list.appendChild(row);
    }
    if (!listing.entries.length) list.appendChild(el("div", "surface-note", "this folder is empty"));
    dlg.appendChild(list);

    const foot = el("div", "picker-foot");
    const cancel = el("button", null, "Cancel");
    cancel.onclick = () => dlg.close();
    const addBtn = el("button", "primary", picked.size ? `Add ${picked.size}` : "Add");
    addBtn.disabled = picked.size === 0;
    addBtn.onclick = async () => {
      addBtn.disabled = true;
      addBtn.textContent = "Adding…";
      for (const path of picked.keys()) {
        try {
          await api("/api/library/add-ref", { method: "POST", body: JSON.stringify({ path }) });
        } catch {
          /* one failed add should not block the rest */
        }
      }
      dlg.close();
      if (showingDesk()) renderAll();
    };
    foot.appendChild(cancel);
    foot.appendChild(addBtn);
    dlg.appendChild(foot);
  };

  renderPicker();
  dlg.showModal();
}

async function renderBrowse(surface) {
  const dir = state.browseDir ?? "";
  const origin = state.libraryOrigin; // captured — must not shift under an in-flight fetch
  const atLibraryRoot = !dir && !origin;
  const searching = (state.deskQuery ?? "").trim().length >= 2;
  const listing = atLibraryRoot
    ? await api("/api/library").then((r) => {
        const q = state.deskQuery.trim().toLowerCase();
        const entries = searching ? r.entries.filter((e) => e.name.toLowerCase().includes(q)) : r.entries;
        return {
          entries,
          total: entries.length,
          shown: entries.length,
          truncated: false,
          order: searching ? "matching what you added, most recently added first" : "most recently added first",
        };
      })
    : searching
      ? await api(`/api/find?q=${encodeURIComponent(state.deskQuery.trim())}&path=${encodeURIComponent(dir)}`).then((r) => ({
          entries: r.results,
          total: r.results.length,
          shown: r.results.length,
          truncated: r.truncated,
          order: "best guess: name match, in walk order",
          find: r,
        }))
      : await api(`/api/tree?path=${encodeURIComponent(dir)}`);
  if ((state.browseDir ?? "") !== dir || state.libraryOrigin !== origin || (state.source && state.terrain !== "Desk")) return; // navigated away while fetching

  state.deskSel ??= new Set();
  const entriesByPath = new Map(listing.entries.map((e) => [e.path, e]));
  const closeCtx = () => document.querySelector(".ctx")?.remove();

  const open = (entry) => {
    closeCtx();
    if (entry.dir) {
      state.browseDir = entry.path;
      // Entering a folder from the library root means you are now inside
      // something you ADDED — libraryOrigin is that boundary; "up" may
      // walk back through its real subfolders but never past it.
      if (atLibraryRoot) state.libraryOrigin = entry.path;
      state.deskSel = new Set();
      state.deskQuery = "";
      renderAll();
      markCurrentInRail();
    } else openSource(entry.path);
  };
  // Drive's own division of labour: opening a FILE shows you the file (the
  // preview, in its own format, costing nothing); opening a FOLDER walks into
  // it. The reader is one button further in, from inside the preview — the
  // reading organs are not what anyone wants from a double-click.
  const preview = (entry) => {
    closeCtx();
    if (entry.dir) open(entry);
    else openPreview(entry, entries);
  };
  // A double-click has to survive the layout moving under it. The first click
  // selects, which fills the details panel, which used to reflow the grid —
  // so the second click landed on a different tile and the file never opened.
  // Tracking the last-clicked PATH rather than the last-clicked node makes the
  // gesture immune to any re-render between the two clicks. (The details
  // column is now fixed-width and always present, so it should not move at
  // all; this is the belt to that suspenders, and it is what actually failed.)
  const DOUBLE_CLICK_MS = 450;
  const secondClick = (path) => {
    const last = state._lastClick;
    state._lastClick = { path, t: performance.now() };
    return last?.path === path && state._lastClick.t - last.t < DOUBLE_CLICK_MS;
  };
  const goUp = () => {
    state.browseDir = dir === state.libraryOrigin ? "" : dir.split("/").slice(0, -1).join("/");
    if (dir === state.libraryOrigin) state.libraryOrigin = null;
    state.deskSel = new Set();
    renderAll();
    markCurrentInRail();
  };

  // ── row 1: search across everything under here ───────────────────────────
  const searchRow = el("div", "desk-search");
  const q = el("input");
  q.type = "search";
  q.placeholder = atLibraryRoot ? "Search My files" : `Search in ${dir.split("/").pop()}`;
  q.value = state.deskQuery ?? "";
  q.oninput = () => {
    state.deskQuery = q.value;
    clearTimeout(state._deskDebounce);
    state._deskDebounce = setTimeout(() => {
      renderSurface();
      const again = surface.querySelector(".desk-search input");
      if (again) {
        again.focus();
        again.setSelectionRange(again.value.length, again.value.length);
      }
    }, 260);
  };
  searchRow.appendChild(q);
  if (searching) {
    const clear = el("button", null, "clear");
    clear.onclick = () => {
      state.deskQuery = "";
      renderAll();
    };
    searchRow.appendChild(clear);
  }
  surface.appendChild(searchRow);

  // ── row 2: breadcrumb + view pivot, or contextual actions on a selection ──
  const bar = el("div", "desk-bar");
  const sel = () => [...state.deskSel].map((x) => entriesByPath.get(x)).filter(Boolean);
  const looksTextual = (name) => !/\.(png|jpe?g|gif|webp|avif|bmp|ico|tiff?|pdf|mp3|wav|ogg|oga|m4a|flac|mp4|m4v|webm|mov|zip|gz|tgz|dmg)$/i.test(name);
  const isImage = (name) => /\.(png|jpe?g|gif|webp|avif|bmp|ico|svg)$/i.test(name);

  const rebuildBar = () => {
    bar.textContent = "";
    const chosen = sel();
    if (chosen.length) {
      bar.appendChild(el("span", "desk-count", `${chosen.length} selected`));
      const act = (label, fn, on = true) => {
        const b = el("button", null, label);
        if (on) b.onclick = fn;
        else b.disabled = true;
        bar.appendChild(b);
      };
      act(chosen[0].dir ? "Open" : "View the file", () => preview(chosen[0]));
      if (!chosen[0].dir) act("Read", () => open(chosen[0]));
      const textual = chosen.filter((e) => !e.dir && looksTextual(e.name));
      if (document.body.classList.contains("embed")) {
        act(`Use in chat${textual.length > 1 ? ` (${textual.length})` : ""}`, async () => {
          for (const e of textual) {
            const r = await fetch(`/api/raw?path=${encodeURIComponent(e.path)}`);
            parent.postMessage({ type: "fold:material:add", name: e.name, path: e.path, text: await r.text() }, "*");
          }
        }, textual.length > 0);
      }
      act("Copy path", () => navigator.clipboard?.writeText(chosen.map((e) => e.path).join("\n")));
      if (atLibraryRoot) {
        act("Remove", async () => {
          const ids = chosen.map((e) => e.id).filter(Boolean);
          for (const id of ids) {
            try {
              await api("/api/library/remove", { method: "POST", body: JSON.stringify({ id }) });
            } catch {
              /* the next render will show it still there if this failed */
            }
          }
          state.deskSel = new Set();
          renderAll();
        });
      }
      act("Clear", () => {
        state.deskSel = new Set();
        paintSelection();
      });
      return;
    }
    if (atLibraryRoot) {
      const newBtn = el("button", "new-btn", "Add");
      newBtn.onclick = (ev) => openNewMenu(ev, newBtn);
      bar.appendChild(newBtn);
    }
    // The same segmented control the source view uses for rendered/raw. Two
    // faces of one thing is the same question here as it is there, and it had
    // been answered with two separate glyph toggles that looked like nothing
    // else on the page — this desk was built to a different reference than
    // the instrument around it, and reusing the control is how that stops.
    const seg = el("div", "seg");
    for (const [mode, label] of [["icons", "grid"], ["table", "list"]]) {
      const btn = el("button", (state.deskMode ?? "icons") === mode ? "on" : "", label);
      btn.onclick = () => {
        state.deskMode = mode;
        renderAll();
      };
      seg.appendChild(btn);
    }
    bar.appendChild(seg);
    const crumbs = el("span", "desk-crumbs");
    const rootBtn = el("button", "linkish", "My files");
    rootBtn.onclick = () => goToLibraryRoot();
    crumbs.appendChild(rootBtn);
    // Crumbs walk from libraryOrigin onward, never above it — there is no
    // path back to unrestricted browsing from inside something you added.
    // (origin === null falls back to the full real path, which cannot
    // happen by construction but costs nothing to leave safe.)
    const originParts = origin ? origin.split("/").filter(Boolean) : [];
    const allParts = dir.split("/").filter(Boolean);
    const startAt = origin ? originParts.length - 1 : 0;
    let walked = origin ? originParts.slice(0, -1).join("/") : "";
    for (let i = startAt; i < allParts.length; i++) {
      const part = allParts[i];
      walked = walked ? `${walked}/${part}` : part;
      crumbs.appendChild(el("span", "sep", "›"));
      const target = walked;
      const isLast = i === allParts.length - 1;
      const b = el(isLast ? "span" : "button", isLast ? "crumb-here" : "linkish", part);
      if (!isLast) {
        b.onclick = () => {
          state.browseDir = target;
          state.deskSel = new Set();
          renderAll();
          markCurrentInRail();
        };
      }
      crumbs.appendChild(b);
    }
    if (searching) {
      crumbs.appendChild(el("span", "sep", "›"));
      crumbs.appendChild(el("span", null, `“${state.deskQuery.trim()}”`));
    }
    bar.appendChild(crumbs);
  };
  surface.appendChild(bar);

  // ── ordering ─────────────────────────────────────────────────────────────
  const sort = state.deskSort;
  let entries = listing.entries;
  let orderNote = listing.order ?? (searching ? "matches by name, in the order the walk found them" : "folders first, then name");
  if (sort) {
    entries = [...entries].sort((a, b) => {
      if (a.dir !== b.dir) return b.dir - a.dir;
      const va = a[sort.key] ?? (sort.key === "name" ? a.name : 0);
      const vb = b[sort.key] ?? (sort.key === "name" ? b.name : 0);
      return (typeof va === "string" ? va.localeCompare(vb) : va - vb) * sort.dir;
    });
    orderNote = `folders first, then ${sort.key} ${sort.dir > 0 ? "A→Z" : "Z→A"}`;
  }
  const folders = entries.filter((e) => e.dir);
  const files = entries.filter((e) => !e.dir);

  const statusLine = () =>
    `${entries.length.toLocaleString()} item${entries.length === 1 ? "" : "s"}` +
    `${state.deskSel.size ? ` · ${state.deskSel.size} selected` : ""} · sorted ${orderNote}` +
    `${listing.truncated ? ` · showing the first ${listing.shown ?? entries.length}${searching ? " matches" : ""} — more exist` : ""}`;

  const paintSelection = () => {
    for (const n of surface.querySelectorAll("[data-path]")) n.classList.toggle("sel", state.deskSel.has(n.dataset.path));
    const st = surface.querySelector(".desk-status");
    if (st) st.textContent = statusLine();
    rebuildBar();
    renderDetails();
  };

  // ── the details panel: one thing selected, everything known about it ─────
  const details = el("aside", "desk-details");
  const renderDetails = () => {
    details.textContent = "";
    const chosen = sel();
    // The panel is ALWAYS in the layout, empty or not. It used to appear and
    // disappear with the selection, which moved the grid under the reader's
    // second click — the reason double-click never opened anything.
    details.classList.toggle("quiet", chosen.length !== 1);
    if (chosen.length !== 1) {
      details.appendChild(el("div", "dt-hint", chosen.length ? `${chosen.length} items selected` : "Select a file to see its details. Double-click it to see the file itself."));
      return;
    }
    const e = chosen[0];
    details.appendChild(el("div", "dt-name", e.name));
    if (!e.dir && isImage(e.name)) {
      const img = el("img", "dt-thumb");
      img.src = `/api/raw?path=${encodeURIComponent(e.path)}`;
      details.appendChild(img);
    }
    const meta = el("dl", "dt-meta");
    const row = (k, v) => {
      meta.appendChild(el("dt", null, k));
      meta.appendChild(el("dd", null, v));
    };
    row("Kind", e.dir ? "Folder" : (e.name.split(".").pop() || "file").toUpperCase() + " file");
    if (!e.dir) row("Size", fmtBytes(e.size));
    if (e.mtime) row("Modified", new Date(e.mtime).toLocaleString());
    row("Where", e.path.split("/").slice(0, -1).join("/") || "My files");
    details.appendChild(meta);
    if (!e.dir && looksTextual(e.name)) {
      const peekBox = el("div", "dt-peek", "…");
      details.appendChild(peekBox);
      api(`/api/peek?path=${encodeURIComponent(e.path)}`)
        .then((r) => {
          peekBox.textContent = r.peek ? r.peek : "no text preview — these bytes are not UTF-8";
        })
        .catch(() => peekBox.remove());
    }
    // Every file gets the same three, whatever its format: see it, read it,
    // take it. A .docx has no reading pipeline here and no preview renderer,
    // but it still has bytes — so "Download" is never missing.
    const acts = el("div", "dt-acts");
    if (!e.dir) {
      const pvBtn = el("button", "primary", "View the file");
      pvBtn.title = "the file in its own format, whatever that format is";
      pvBtn.onclick = () => preview(e);
      acts.appendChild(pvBtn);
    }
    const openBtn = el("button", null, e.dir ? "Open folder" : "Read");
    openBtn.onclick = () => open(e);
    acts.appendChild(openBtn);
    if (!e.dir) {
      const dl = document.createElement("a");
      dl.className = "dt-dl";
      dl.href = `/api/raw?path=${encodeURIComponent(e.path)}`;
      dl.download = e.name;
      dl.textContent = "Download";
      acts.appendChild(dl);
    }
    details.appendChild(acts);
  };

  // ── the context menu ─────────────────────────────────────────────────────
  const showCtx = (ev, entry) => {
    ev.preventDefault();
    ev.stopPropagation();
    closeCtx();
    if (!state.deskSel.has(entry.path)) {
      state.deskSel = new Set([entry.path]);
      paintSelection();
    }
    const chosen = sel();
    const menu = el("div", "ctx");
    const item = (label, fn, enabled = true) => {
      const it = el("button", `ctx-item${enabled ? "" : " off"}`, label);
      if (enabled)
        it.onclick = () => {
          closeCtx();
          fn();
        };
      menu.appendChild(it);
    };
    if (chosen.length === 1) {
      if (!chosen[0].dir) item("View the file", () => preview(chosen[0]));
      item(chosen[0].dir ? "Open" : "Read in the reader", () => open(chosen[0]));
      const dl = document.createElement("a");
      dl.className = "ctx-item";
      dl.href = `/api/raw?path=${encodeURIComponent(chosen[0].path)}`;
      dl.download = chosen[0].name;
      dl.textContent = "Download";
      if (!chosen[0].dir) {
        dl.onclick = () => closeCtx();
        menu.appendChild(dl);
      }
      if (!chosen[0].dir && looksTextual(chosen[0].name)) {
        item("Open and summarize", async () => {
          await openSource(chosen[0].path);
          requestFold({});
        });
      }
    } else item(`Open the first of ${chosen.length}`, () => open(chosen[0]));
    if (document.body.classList.contains("embed")) {
      const textual = chosen.filter((e) => !e.dir && looksTextual(e.name));
      item(`Use in chat${textual.length > 1 ? ` (${textual.length})` : ""}`, async () => {
        for (const e of textual) {
          const r = await fetch(`/api/raw?path=${encodeURIComponent(e.path)}`);
          parent.postMessage({ type: "fold:material:add", name: e.name, path: e.path, text: await r.text() }, "*");
        }
      }, textual.length > 0);
    }
    item(chosen.length > 1 ? `Copy ${chosen.length} paths` : "Copy path", () => navigator.clipboard?.writeText(chosen.map((e) => e.path).join("\n")));
    if (atLibraryRoot) {
      item(chosen.length > 1 ? `Remove ${chosen.length}` : "Remove", async () => {
        for (const id of chosen.map((e) => e.id).filter(Boolean)) {
          try {
            await api("/api/library/remove", { method: "POST", body: JSON.stringify({ id }) });
          } catch {
            /* the next render shows it still there if this failed */
          }
        }
        state.deskSel = new Set();
        renderAll();
      });
    }
    menu.style.left = `${ev.clientX}px`;
    menu.style.top = `${ev.clientY}px`;
    document.body.appendChild(menu);
    const away = (e2) => {
      if (!menu.contains(e2.target)) {
        closeCtx();
        document.removeEventListener("pointerdown", away, true);
      }
    };
    document.addEventListener("pointerdown", away, true);
  };

  // ── the listing, in two faces ────────────────────────────────────────────
  const body = el("div", "desk-body");
  const main = el("div", "desk-main");
  let selectablesSel;
  const tileFor = (entry) => {
    const tile = el("button", `tile${entry.dir ? " dir" : ""}`);
    tile.dataset.path = entry.path;
    if (!entry.dir && isImage(entry.name)) {
      const img = el("img", "thumb");
      img.loading = "lazy";
      img.src = `/api/raw?path=${encodeURIComponent(entry.path)}`;
      tile.appendChild(img);
    } else if (!entry.dir && looksTextual(entry.name)) {
      const card = el("div", "thumb card");
      api(`/api/peek?path=${encodeURIComponent(entry.path)}`)
        .then((r) => {
          if (r.peek && r.peek.trim()) {
            card.textContent = r.peek.slice(0, 220);
          } else {
            // not text after all — the file's own face, not a blank card
            const g = el("span", chipClassOf(entry), glyphOf(entry.name));
            card.replaceWith(g);
          }
        })
        .catch(() => card.replaceWith(el("span", chipClassOf(entry), glyphOf(entry.name))));
      tile.appendChild(card);
    } else {
      tile.appendChild(el("span", chipClassOf(entry), entry.dir ? "▸" : glyphOf(entry.name)));
    }
    tile.appendChild(el("span", "nm", entry.name));
    if (!entry.dir && entry.size != null) tile.appendChild(el("span", "sz", fmtBytes(entry.size)));
    // One handler, not onclick + ondblclick: the tracker already fires exactly
    // once, on the second click, and a native dblclick beside it would open
    // the same file twice.
    tile.onclick = () => {
      if (secondClick(entry.path)) preview(entry);
    };
    tile.oncontextmenu = (ev) => showCtx(ev, entry);
    return tile;
  };

  if ((state.deskMode ?? "icons") === "table") {
    selectablesSel = ".desk-tbl tr[data-path]";
    const tbl = el("table", "tbl desk-tbl");
    const trh = el("tr");
    for (const [key, label] of [["name", "Name"], ["size", "Size"], ["mtime", "Modified"]]) {
      const th = el("th", null, label + (sort?.key === key ? (sort.dir > 0 ? " ↑" : " ↓") : ""));
      th.style.cursor = "pointer";
      th.onclick = () => {
        state.deskSort = sort?.key === key ? { key, dir: -sort.dir } : { key, dir: 1 };
        renderAll();
      };
      trh.appendChild(th);
    }
    tbl.appendChild(trh);
    if (dir && !searching) {
      const tr = el("tr");
      const td = el("td", null, "↩ ..");
      td.colSpan = 3;
      td.style.cursor = "pointer";
      td.onclick = goUp;
      tr.appendChild(td);
      tbl.appendChild(tr);
    }
    for (const entry of entries) {
      const tr = el("tr");
      tr.dataset.path = entry.path;
      const nameTd = el("td");
      nameTd.append(`${entry.dir ? "▸ " : glyphOf(entry.name) + " "}${searching ? entry.path : entry.name}`);
      tr.appendChild(nameTd);
      tr.appendChild(el("td", null, entry.dir ? "—" : fmtBytes(entry.size)));
      tr.appendChild(el("td", null, entry.mtime ? new Date(entry.mtime).toLocaleDateString() : "—"));
      tr.onclick = () => {
        if (secondClick(entry.path)) preview(entry);
      };
      tr.oncontextmenu = (ev) => showCtx(ev, entry);
      tbl.appendChild(tr);
    }
    main.appendChild(tbl);
  } else {
    selectablesSel = ".tiles .tile[data-path]";
    if (dir && !searching) {
      const upRow = el("div", "tiles");
      const up = el("button", "tile dir");
      up.appendChild(el("span", "glyph", "↩"));
      up.appendChild(el("span", "nm", ".."));
      up.onclick = goUp;
      upRow.appendChild(up);
      main.appendChild(upRow);
    }
    if (folders.length) {
      main.appendChild(el("div", "desk-section", "Folders"));
      const g = el("div", "tiles");
      for (const entry of folders) g.appendChild(tileFor(entry));
      main.appendChild(g);
    }
    if (files.length) {
      main.appendChild(el("div", "desk-section", "Files"));
      const g = el("div", "tiles");
      for (const entry of files) g.appendChild(tileFor(entry));
      main.appendChild(g);
    }
    if (!entries.length) main.appendChild(el("div", "surface-note", searching ? "nothing here matches that name" : "this folder is empty"));
  }

  // My files starts empty (library.js's own header) — nothing to browse
  // until a reader adds something, so the empty case gets its own face
  // instead of a "0 items" table nobody asked to see.
  if (atLibraryRoot && !searching && !entries.length) {
    main.textContent = "";
    const empty = el("div", "desk-empty");
    empty.appendChild(el("div", "desk-empty-glyph", "▤"));
    empty.appendChild(el("h2", null, "Nothing here yet"));
    empty.appendChild(el("p", null, "Files and folders you add appear here. Drag them in, or use the buttons below."));
    const row = el("div", "desk-empty-actions");
    const up = el("button", "primary", "Upload files");
    up.onclick = () => FILE_INPUT.click();
    const add = el("button", null, "Add from this computer…");
    add.onclick = () => openPickerDialog();
    row.appendChild(up);
    row.appendChild(add);
    empty.appendChild(row);
    main.appendChild(empty);
  } else {
    main.appendChild(el("div", "desk-status", statusLine()));
  }
  body.appendChild(main);
  body.appendChild(details);
  surface.appendChild(body);

  rebuildBar();
  renderDetails();

  // The keyboard's handle on this listing: the global keydown handler is
  // outside this closure, so what it needs to act on — the entries in view and
  // the two verbs — is left here for it. Rebuilt every render, so it can never
  // name a listing that is no longer on screen.
  state._desk = {
    entries: () => entries,
    byPath: entriesByPath,
    preview,
    open,
    paint: paintSelection,
  };

  // Uploading: the native file picker (X-File-Name per request; no
  // multipart parser this server has declared it will not carry) and
  // drag-and-drop, both landing in the library at root only — writing into
  // a folder you merely REFERENCE would mean writing into your own real
  // project files, which this instrument never does uninvited.
  FILE_INPUT.onchange = async () => {
    if (!FILE_INPUT.files?.length) return;
    await uploadFiles(FILE_INPUT.files);
    FILE_INPUT.value = "";
    if (showingDesk()) renderAll();
  };
  if (atLibraryRoot) {
    let dragDepth = 0;
    main.addEventListener("dragenter", (ev) => {
      ev.preventDefault();
      dragDepth++;
      main.classList.add("drag-over");
    });
    main.addEventListener("dragover", (ev) => ev.preventDefault());
    main.addEventListener("dragleave", () => {
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) main.classList.remove("drag-over");
    });
    main.addEventListener("drop", async (ev) => {
      ev.preventDefault();
      dragDepth = 0;
      main.classList.remove("drag-over");
      if (ev.dataTransfer?.files?.length) {
        await uploadFiles(ev.dataTransfer.files);
        if (showingDesk()) renderAll();
      }
    });
  }

  // Viselect: rubber-band drag, click-select, ctrl/cmd-toggle
  state._selArea?.destroy();
  state._selArea = new SelectionArea({
    selectables: [selectablesSel],
    boundaries: [".desk-main"],
    features: { touch: true, range: true, singleTap: { allow: true, intersect: "native" } },
  })
    .on("beforestart", ({ event }) => !event?.target?.closest(".ctx, .desk-bar, .desk-search, .desk-details, th"))
    .on("start", ({ event }) => {
      if (!event?.ctrlKey && !event?.metaKey) state.deskSel = new Set();
    })
    .on("move", ({ store }) => {
      for (const n of store.changed.added) state.deskSel.add(n.dataset.path);
      for (const n of store.changed.removed) state.deskSel.delete(n.dataset.path);
      paintSelection();
    })
    .on("stop", () => paintSelection());
  paintSelection();
}

// ── the web view: the web organ's face ──────────────────────────────────────
// Search, read, and a page history that is NOT the materials strip: it looks
// like browser history (a visit per row, grouped by day) but each row HOLDS
// the page — full content saved at its retrieval date, openable as an
// ordinary source with the whole reading pipeline, until the user clears it.
// This page itself still fetches nothing remote (web.test.mjs pins that):
// every crossing happens in the local server and lands in the record. The
// only external references rendered are LINKS the user may choose to follow
// in their own browser — navigation by hand, never a load by this page.

async function loadWebHistory() {
  const W = state.web;
  if (W.historyLoading) return;
  W.historyLoading = true;
  try {
    const h = await api("/api/web/history");
    W.history = h;
    W.settings = h.settings;
  } catch (e) {
    W.history = { entries: [], total: 0, gap: e.message };
  }
  W.historyLoading = false;
  renderAll();
  // an archive submission lands as a later patch line — poll while one is pending
  if (W.history?.entries?.some((en) => en.archive?.status === "pending")) {
    clearTimeout(W._pollTimer);
    W._pollTimer = setTimeout(() => {
      if (state.terrain === "Web") {
        W.history = null;
        renderAll();
      }
    }, 15000);
  }
}

async function doWebSearch(query) {
  const W = state.web;
  W.busy = `searching for "${query}"…`;
  W.results = null;
  W.fetched = null;
  renderAll();
  try {
    W.results = await api("/api/web/search", { method: "POST", body: JSON.stringify({ query }) });
  } catch (e) {
    W.results = { gap: { silence: "not-present", detail: e.message } };
  }
  W.busy = null;
  renderAll();
}

async function doWebFetch(url) {
  const W = state.web;
  W.busy = `reading ${url} — full content will be kept in history…`;
  W.fetched = null;
  renderAll();
  try {
    W.fetched = await api("/api/web/fetch", { method: "POST", body: JSON.stringify({ url }) });
  } catch (e) {
    W.fetched = { gap: { silence: "not-present", detail: e.message } };
  }
  W.busy = null;
  W.history = null; // the visit just landed — refold from the server
  renderAll();
}

const openHistoryEntry = (e) => {
  const p = e.textPath ?? e.rawPath;
  if (p) openSource(p);
};

// ── the priors view: the corpus, its papers, and what is in play ────────────
// live_priors beside this repo, browsed genre → collection → document, with a
// toggle at every level. A document starts OFF (the corpus arrived wholesale;
// enabling is the explicit act); the most specific declaration on its path
// decides it, and the chip says whether that decision was made here,
// inherited, or is the default — inherited state never dresses as chosen
// state. Every flip is one ledger line and one record event; reading a
// document's papers is a recorded open. The resolution code is priors.js —
// the same module the server folds with, one implementation of "what decides
// this document" on both sides of the wire.

async function loadPriors() {
  const P = state.priors;
  if (P.loading) return;
  P.loading = true;
  P.error = null;
  try {
    P.data = await api("/api/priors");
  } catch (e) {
    P.error = e.message;
  }
  P.loading = false;
  renderAll();
}

async function togglePrior(rel, on) {
  const P = state.priors;
  P.busy = rel || "(everything)";
  renderAll();
  try {
    await api("/api/priors/toggle", { method: "POST", body: JSON.stringify({ path: rel, on }) });
    P.data = null; // counts and declarations are server truth — refold
    await loadPriors();
    if (P.focus?.path != null) {
      // the focused document's own state may just have moved — re-read it so
      // the card never shows a stale decision
      try {
        P.focus = await api(`/api/priors/doc?path=${encodeURIComponent(P.focus.path)}`);
      } catch {
        /* the card keeps its last truth; the tree is already fresh */
      }
    }
  } catch (e) {
    P.error = e.message;
  }
  P.busy = null;
  renderAll();
}

async function openPriorDoc(rel) {
  const P = state.priors;
  P.busy = rel;
  renderAll();
  try {
    P.focus = await api(`/api/priors/doc?path=${encodeURIComponent(rel)}`);
  } catch (e) {
    P.error = e.message;
  }
  P.busy = null;
  renderAll();
}

async function expandPrior(rel) {
  const P = state.priors;
  if (P.expanded.has(rel)) {
    P.expanded.delete(rel);
    renderAll();
    return;
  }
  P.expanded.add(rel);
  if (!P.children.has(rel)) {
    try {
      const t = await api(`/api/tree?path=${encodeURIComponent(`${P.data.root}/${rel}`)}`);
      P.children.set(rel, t);
    } catch (e) {
      P.children.set(rel, { error: e.message, entries: [] });
    }
  }
  renderAll();
}

/** The toggle chip: effective state, and where it came from — set here (a
 * dot), inherited (named), or default. Click writes a declaration AT THIS
 * LEVEL, whatever an ancestor says. */
function priorToggleChip(rel, byPath) {
  const eff = effectivePrior(byPath, rel);
  const setHere = eff.decidedBy === rel;
  const where = eff.decidedBy == null ? "the default — nothing on the ledger decides it" : setHere ? "set at this level" : `inherited from ${eff.decidedBy === "" ? "the everything toggle" : eff.decidedBy}`;
  const b = el("button", `pr-toggle${eff.on ? " on" : ""}${setHere ? " declared" : ""}`, eff.on ? "in play" : "off");
  b.title = `${eff.on ? "in play" : "off"} — ${where}. Click to turn ${eff.on ? "off" : "on"} at this level: one line on the append-only ledger, one event on the record.`;
  b.disabled = state.priors.busy != null;
  b.onclick = (e) => {
    e.stopPropagation();
    togglePrior(rel, !eff.on);
  };
  return b;
}

function renderPriors(surface) {
  const P = state.priors;
  if (!P.data && !P.error && !P.loading) loadPriors();
  note(
    surface,
    "received",
    P.data && !P.data.gap ? `${P.data.files.toLocaleString()} documents · ${P.data.enabledCount.toLocaleString()} in play · every document starts off` : "the live_priors corpus",
    "The corpus arrived wholesale, so nothing in it is in play until you say so — at any level: everything, a genre, one collection, one document. The most specific declaration on a document's path decides it. Every flip is one line on an append-only ledger and one event on the record, and a document's papers — its publisher's own frontmatter — ride every crossing it makes into chat.",
  );
  if (P.error) {
    gapFace(surface, "unreachable", ` ${P.error}`);
    return;
  }
  if (!P.data) {
    surface.appendChild(el("div", "web-busy", "reading the corpus off the disk…"));
    return;
  }
  if (P.data.gap) {
    gapFace(surface, P.data.gap.silence, ` ${P.data.gap.detail}`);
    return;
  }
  const byPath = declarationsFrom(P.data.declarations);
  if (P.data.ledgerSkipped) {
    gapFace(surface, "ledger", ` ${P.data.ledgerSkipped} unreadable ledger line${P.data.ledgerSkipped === 1 ? "" : "s"} — counted, not folded`);
  }
  if (P.data.truncated) {
    gapFace(surface, "censored-above", ` the corpus walk stopped at its declared cap of ${P.data.walkCap.toLocaleString()} entries — counts below are a floor, not a total`);
  }
  if (P.busy) surface.appendChild(el("div", "web-busy", `writing the ledger… (${P.busy})`));

  // ── the focused document's papers, when one is in hand ────────────────────
  if (P.focus) {
    const f = P.focus;
    const card = el("div", "pr-card");
    const head = el("div", "pr-card-head");
    head.appendChild(el("span", "ftype", "PRIOR"));
    head.appendChild(el("span", "name", f.provenance?.title || f.name));
    const x = el("button", "fold-x", "✕");
    x.onclick = () => {
      P.focus = null;
      renderAll();
    };
    head.appendChild(x);
    card.appendChild(head);
    if (f.gap) {
      card.appendChild(el("div", "pr-gap", `${f.gap.silence}: ${f.gap.detail}`));
    } else {
      // the papers, every field the document carries, as the document
      // carries them — parsed mechanically, never composed
      if (f.provenance) {
        const table = el("div", "pr-papers");
        for (const [k, v] of Object.entries(f.provenance)) {
          // priors.js fills canonical aliases (url/publisher/date) so every
          // consumer can rely on them; the card shows the header's own keys
          // and hides an alias that merely repeats one
          if (["url", "publisher", "date", "title"].includes(k) && Object.entries(f.provenance).some(([k2, v2]) => k2 !== k && v2 === v)) continue;
          const row = el("div", "pr-paper-row");
          row.appendChild(el("span", "k", k));
          if (/^https?:\/\//.test(v)) {
            const a = el("a", "v", v);
            a.href = v;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.title = "the publisher's official copy — opens in your own browser, leaves this instrument";
            row.appendChild(a);
          } else row.appendChild(el("span", "v", v));
          table.appendChild(row);
        }
        card.appendChild(table);
      } else {
        card.appendChild(el("div", "pr-gap", "no papers — this document carries no frontmatter; its path and the corpus's SOURCES.md are what vouch for it"));
      }
      const foot = el("div", "pr-card-foot");
      foot.appendChild(priorToggleChip(f.path, byPath));
      const read = el("button", "primary", "Read this →");
      read.title = "open in the reader — admission, cast, relations, the full pipeline";
      read.onclick = () => openSource(f.browsePath);
      foot.appendChild(read);
      const see = el("button", null, "⛶ view the file");
      see.onclick = () => openPreview({ path: f.browsePath, name: f.name }, []);
      foot.appendChild(see);
      foot.appendChild(el("span", "meta", `${fmtBytes(f.bytes)} · ${f.path}`));
      card.appendChild(foot);
    }
    surface.appendChild(card);
  }

  // ── everything: the root toggle ───────────────────────────────────────────
  const rootRow = el("div", "pr-row pr-root");
  rootRow.appendChild(el("span", "pr-name", "everything"));
  rootRow.appendChild(el("span", "pr-meta", `${P.data.files.toLocaleString()} documents in ${P.data.categories.length} genres`));
  rootRow.appendChild(priorToggleChip("", byPath));
  surface.appendChild(rootRow);

  // ── the genres, each expandable down to its documents ─────────────────────
  const list = el("div", "pr-tree");
  for (const c of P.data.categories) {
    list.appendChild(priorFolderRow(c.name, byPath, { files: c.files, bytes: c.bytes, enabled: c.enabled }, 0));
    if (P.expanded.has(c.name)) priorChildren(list, c.name, byPath, 1);
  }
  surface.appendChild(list);
}

function priorFolderRow(rel, byPath, counts, depth) {
  const P = state.priors;
  const row = el("div", "pr-row");
  row.style.paddingLeft = `${depth * 22}px`;
  const open = P.expanded.has(rel);
  const arrow = el("button", "pr-arrow", open ? "▾" : "▸");
  arrow.onclick = () => expandPrior(rel);
  row.appendChild(arrow);
  const name = el("button", "pr-name", rel.split("/").pop());
  name.onclick = () => expandPrior(rel);
  row.appendChild(name);
  if (counts) {
    row.appendChild(
      el("span", "pr-meta", `${counts.files.toLocaleString()} docs · ${fmtBytes(counts.bytes)}${counts.enabled ? ` · ${counts.enabled.toLocaleString()} in play` : ""}`),
    );
  }
  row.appendChild(priorToggleChip(rel, byPath));
  return row;
}

function priorChildren(list, rel, byPath, depth) {
  const P = state.priors;
  const t = P.children.get(rel);
  if (!t) {
    const r = el("div", "pr-row");
    r.style.paddingLeft = `${depth * 22}px`;
    r.appendChild(el("span", "pr-meta", "listing…"));
    list.appendChild(r);
    return;
  }
  if (t.error) {
    const r = el("div", "pr-row");
    r.style.paddingLeft = `${depth * 22}px`;
    r.appendChild(el("span", "pr-gap", t.error));
    list.appendChild(r);
    return;
  }
  for (const entry of t.entries) {
    // the walk's own rule, applied to the listing too: dotfiles are
    // machinery, not documents — a row the counts refuse to count would
    // otherwise still be offered a toggle
    if (entry.name.startsWith(".")) continue;
    const childRel = `${rel}/${entry.name}`;
    if (entry.dir) {
      list.appendChild(priorFolderRow(childRel, byPath, null, depth));
      if (P.expanded.has(childRel)) priorChildren(list, childRel, byPath, depth + 1);
    } else {
      const row = el("div", "pr-row pr-doc");
      row.style.paddingLeft = `${depth * 22 + 20}px`;
      const name = el("button", "pr-name", entry.name);
      name.title = "the document's papers — its publisher's own frontmatter (a recorded open)";
      name.onclick = () => openPriorDoc(childRel);
      row.appendChild(name);
      row.appendChild(el("span", "pr-meta", fmtBytes(entry.size)));
      row.appendChild(priorToggleChip(childRel, byPath));
      list.appendChild(row);
    }
  }
  if (t.truncated) {
    const r = el("div", "pr-row");
    r.style.paddingLeft = `${depth * 22}px`;
    r.appendChild(el("span", "pr-gap", `showing ${t.shown} of ${t.total} — the rest beyond the page cap`));
    list.appendChild(r);
  }
}

function renderWeb(surface) {
  const W = state.web;
  note(
    surface,
    "shown",
    "one request per ask, from the local server, recorded",
    "requests leave this machine only from the local server, one per explicit ask, each recorded — and every page read is kept whole below, at its retrieval date, until you clear it",
  );

  // ── the omnibox: an address reads a page, anything else searches ────────
  const bar = el("div", "web-bar");
  const box = el("input", "web-omni");
  box.type = "text";
  box.placeholder = "search the web, or paste an address to read a page";
  box.value = W.q;
  box.oninput = () => {
    W.q = box.value;
  };
  const submit = () => {
    const q = box.value.trim();
    if (!q || W.busy) return;
    W.q = q;
    if (/^https?:\/\//i.test(q) || /^[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/.test(q)) doWebFetch(q);
    else doWebSearch(q);
  };
  box.onkeydown = (e) => {
    if (e.key === "Enter") submit();
  };
  const go = el("button", "web-go", "go");
  go.onclick = submit;
  bar.appendChild(box);
  bar.appendChild(go);
  surface.appendChild(bar);

  // ── the archive switch — the one setting, server truth ──────────────────
  const sw = el("label", "web-setting");
  const cb = el("input");
  cb.type = "checkbox";
  cb.checked = !!W.settings?.archiveOrg;
  cb.disabled = W.settings === null;
  cb.onchange = async () => {
    W.settings = await api("/api/web/settings", { method: "POST", body: JSON.stringify({ archiveOrg: cb.checked }) });
    renderAll();
  };
  sw.appendChild(cb);
  sw.append(" also submit each page to archive.org (Wayback Machine) — a stable public snapshot linked from history. Off means a read stays between this machine and the site.");
  surface.appendChild(sw);

  if (W.busy) surface.appendChild(el("div", "web-busy", W.busy));

  // ── search results ───────────────────────────────────────────────────────
  const R = W.results;
  if (R?.gap) {
    gapFace(surface, R.gap.silence ?? "gap", ` ${R.gap.detail ?? ""}`);
  } else if (R) {
    const list = el("div", "web-results");
    list.appendChild(el("div", "web-results-head", `${R.shown} of ${R.found} results · ${R.engine}${R.truncated ? " · the rest beyond the declared cap" : ""}`));
    for (const r of R.results) {
      const row = el("div", "web-result");
      const t = el("button", "web-result-title", r.title || r.url);
      t.title = "read this page here — its full content is saved to history";
      t.onclick = () => doWebFetch(r.url);
      row.appendChild(t);
      const meta = el("div", "web-result-url");
      meta.append(r.url + " ");
      const ext = el("a", "web-ext", "↗");
      ext.href = r.url;
      ext.target = "_blank";
      ext.rel = "noopener noreferrer";
      ext.title = "open in your own browser — leaves this instrument";
      meta.appendChild(ext);
      row.appendChild(meta);
      if (r.snippet) row.appendChild(el("div", "web-result-snip", r.snippet));
      list.appendChild(row);
    }
    surface.appendChild(list);
  }

  // ── the page just read: salience up front, the whole page behind it ─────
  const F = W.fetched;
  if (F?.gap) {
    gapFace(surface, F.gap.silence ?? "gap", ` ${F.gap.detail ?? ""}`);
  } else if (F?.entry) {
    const e = F.entry;
    const card = el("div", "web-fetched");
    const head = el("div", "web-fetched-head");
    const t = el("button", "web-fetched-title", e.title || e.finalUrl);
    t.title = "open the saved page — the full reading pipeline runs on it";
    t.onclick = () => openHistoryEntry(e);
    head.appendChild(t);
    head.appendChild(el("span", "muted", ` ${hostOfUrl(e.finalUrl)} · ${fmtBytes(e.bytes)} saved · retrieved ${e.retrievedAt.slice(0, 16).replace("T", " ")}Z`));
    card.appendChild(head);
    if (e.challenge) {
      card.appendChild(el("div", "web-warn", "this host answered with a bot-challenge page, not the article — the bytes are saved as they arrived"));
    }
    if (F.fold?.lines?.length) {
      card.appendChild(el("div", "web-salient-head", `what's salient — a fold of the whole page, kept ${F.fold.kept} of ${F.fold.of} sentences (verbatim, addressed; the whole page is what history keeps)`));
      for (const l of F.fold.lines) {
        const line = el("button", "web-salient-line", l.text.length > 300 ? `${l.text.slice(0, 299)}…` : l.text);
        line.title = `chars ${l.charStart}–${l.charEnd} of the saved page — click to land there`;
        line.onclick = () => openSource(e.textPath, { focus: { c0: l.charStart, c1: l.charEnd, why: "salient line" } });
        card.appendChild(line);
      }
    } else if (F.fold?.gap) {
      card.appendChild(el("div", "muted", `no fold: ${F.fold.gap.silence ?? F.fold.gap.reason} — ${F.fold.gap.detail ?? ""}`));
    }
    surface.appendChild(card);
  }

  // ── page history: browser-shaped, but it holds the pages ────────────────
  const H = W.history;
  const hist = el("div", "web-history");
  const hh = el("div", "web-history-head");
  hh.appendChild(el("h3", null, "page history"));
  if (H?.entries?.length) {
    const refresh = el("button", "linkish", "refresh");
    refresh.style.textDecoration = "none";
    refresh.onclick = () => {
      W.history = null;
      renderAll();
    };
    hh.appendChild(refresh);
    const clear = el("button", "web-clear", "clear history");
    clear.title = "removes every saved page and its history row; the append-only record keeps the fact that reads happened";
    clear.onclick = async () => {
      if (!confirm(`Clear ${H.entries.length} entr${H.entries.length === 1 ? "y" : "ies"} and delete the saved pages?`)) return;
      await api("/api/web/clear", { method: "POST", body: JSON.stringify({}) });
      W.history = null;
      W.fetched = null;
      renderAll();
    };
    hh.appendChild(clear);
  }
  hist.appendChild(hh);

  if (H === null) {
    loadWebHistory();
    hist.appendChild(el("div", "muted", "loading history…"));
  } else if (H.gap) {
    hist.appendChild(el("div", "muted", `history unavailable: ${H.gap}`));
  } else if (!H.entries.length) {
    hist.appendChild(el("div", "muted", "no pages read yet — each read lands here with its retrieval date and its full content, until you clear it"));
  } else {
    const today = new Date().toISOString().slice(0, 10);
    let day = "";
    for (const e of H.entries) {
      const d = String(e.retrievedAt ?? "").slice(0, 10);
      if (d !== day) {
        day = d;
        hist.appendChild(el("div", "wh-day", d === today ? `today — ${d}` : d));
      }
      const row = el("div", "wh-row");
      row.appendChild(el("span", "wh-time", String(e.retrievedAt ?? "").slice(11, 16)));
      row.appendChild(el("span", `wh-dot${e.challenge ? " warn" : ""}`, e.challenge ? "⚠" : "◍"));
      const t = el("button", "wh-title", e.title || e.finalUrl || e.url);
      t.title = `open the saved page (retrieved ${e.retrievedAt}) — the full content, not a bookmark`;
      t.onclick = () => openHistoryEntry(e);
      row.appendChild(t);
      row.appendChild(el("span", "wh-host", hostOfUrl(e.finalUrl ?? e.url)));
      row.appendChild(el("span", "wh-size", `${fmtBytes(e.bytes)} kept`));
      if (e.archive?.status === "saved") {
        const a = el("a", "wh-arch", "archived ↗");
        a.href = e.archive.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.title = `stable snapshot: ${e.archive.url}`;
        row.appendChild(a);
      } else if (e.archive?.status === "pending") {
        row.appendChild(el("span", "wh-arch pending", "archiving…"));
      } else if (e.archive?.status === "failed") {
        const s = el("span", "wh-arch failed", "archive failed");
        s.title = e.archive.detail ?? "";
        row.appendChild(s);
      }
      if (e.rawPath && e.rawPath !== e.textPath) {
        const raw = el("button", "linkish wh-raw", "html");
        raw.style.textDecoration = "none";
        raw.title = "the bytes as they arrived, before extraction";
        raw.onclick = () => openSource(e.rawPath);
        row.appendChild(raw);
      }
      const x = el("button", "wh-x", "✕");
      x.title = "clear this entry and its saved page";
      x.onclick = async () => {
        await api("/api/web/clear", { method: "POST", body: JSON.stringify({ id: e.id }) });
        W.history = null;
        renderAll();
      };
      row.appendChild(x);
      hist.appendChild(row);
    }
    if (H.skipped) hist.appendChild(el("div", "muted", `${H.skipped} unreadable line${H.skipped === 1 ? "" : "s"} in the index — counted, not hidden`));
    hist.appendChild(el("div", "web-history-foot", `the index is ${H.path} — saved pages open as ordinary sources with the whole reading pipeline; clearing deletes them, while the append-only record keeps that the reads happened`));
  }
  surface.appendChild(hist);
}

/**
 * The badge on the title: the file's own extension when it has one, else the
 * modality the sniffer decided. The extension is what the reader typed and
 * what the folder shows, so it is the one that goes in the badge; the
 * modality — which is a READING, and can disagree — rides the tooltip.
 */
function fileKind(s) {
  const dot = String(s?.name ?? "").lastIndexOf(".");
  const ext = dot > 0 ? s.name.slice(dot + 1) : "";
  return (ext && ext.length <= 5 ? ext : s?.modality ?? "file").toUpperCase();
}

/**
 * A saved page, identified by what it IS rather than by where it landed.
 *
 * Pages the web organ keeps are content-addressed, so the file on disk is
 * called `108c4b618934090b.txt` — an identity that is true, stable, and
 * completely unreadable as a title. The history index already holds the
 * page's own title and host for exactly this file, so when the open source is
 * one of those, that is what the title bar says; the hash keeps its place as
 * the path, one hover away. Nothing is renamed on disk and no address moves.
 */
function savedPageFor(path) {
  if (!path || !path.includes("/web/pages/")) return null;
  return (state.web.history?.entries ?? []).find((e) => e.textPath === path || e.rawPath === path) ?? null;
}

// hostOf, duplicated tiny from web.js — that module is the server's half;
// the page keeps its own three lines rather than importing across the seam.
const hostOfUrl = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url ?? "";
  }
};

// ---- Field — Structure·Ground: the raw layout, zero inference -------------
function renderField(surface) {
  const s = state.source;
  if (TEXTUAL.has(s.modality) && state.text != null) {
    note(
      surface,
      "shown",
      `${s.bytes.toLocaleString()} bytes · UTF-8`,
      "the bytes as they sit on disk, decoded as UTF-8 — nothing interpreted",
    );
    // One toolbar, not a column of loose buttons. Everything that acts on the
    // document in view sits in this row, in a fixed order — how it is shown
    // on the left, what can be done to it on the right — so the controls stop
    // moving as the modality changes which of them exist.
    const bar = el("div", "field-bar");
    surface.appendChild(bar);
    state._fieldBar = bar;
    const foldBtn = el("button", "field-act", state.focus ? "fold this range" : "fold the source");
    foldBtn.title = "an extractive summary: the most novel sentences here, verbatim and addressed — no model";
    foldBtn.onclick = () => requestFold(state.focus ? { c0: state.focus.c0, c1: state.focus.c1 } : {});
    bar.appendChild(el("span", "bar-gap"));
    bar.appendChild(foldBtn);
    if (state.fold) surface.appendChild(foldCard(state.fold, "fold"));
    if (s.modality === "markdown") return renderMarkdownField(surface);
    if (s.modality === "table") return renderTableField(surface);
    if (s.modality === "html") return renderHtmlField(surface);
    return renderTextField(surface);
  }
  if (s.modality === "image") {
    note(surface, "shown", "the image, as the browser decodes it.");
    const wrap = el("div", "media-wrap");
    const img = el("img");
    img.src = `/api/raw?path=${encodeURIComponent(state.path)}`;
    img.onload = () => meta.append(` · ${img.naturalWidth}×${img.naturalHeight}px`);
    const meta = el("div", "media-meta", `${s.name} · ${fmtBytes(s.bytes)}`);
    wrap.appendChild(img);
    wrap.appendChild(meta);
    surface.appendChild(wrap);
    return;
  }
  if (s.modality === "audio" || s.modality === "video") {
    note(surface, "shown", `the ${s.modality} stream, as the browser plays it.`);
    const wrap = el("div", "media-wrap");
    const m = el(s.modality);
    m.controls = true;
    m.src = `/api/raw?path=${encodeURIComponent(state.path)}`;
    wrap.appendChild(m);
    wrap.appendChild(el("div", "media-meta", `${s.name} · ${fmtBytes(s.bytes)}`));
    surface.appendChild(wrap);
    return;
  }
  if (s.modality === "pdf") {
    note(surface, "shown", "the PDF, in the browser's own viewer.");
    const wrap = el("div", "media-wrap");
    const f = el("iframe");
    f.src = `/api/raw?path=${encodeURIComponent(state.path)}`;
    wrap.appendChild(f);
    surface.appendChild(wrap);
    return;
  }
  renderHexField(surface); // binary: the hex dump IS Field's native face
}

function renderTextField(surface) {
  const wrap = el("div", "field-wrap");
  const outline = state.read?.terrains?.Field?.outline;
  if (outline?.sections?.length) {
    const box = el("div", "outline");
    box.appendChild(el("div", "hd", `outline · ${outline.sections.length} sections`));
    // The document's own nesting, kept. A flat column of equal-weight lines
    // is a list of strings; the same lines indented by their level are a
    // shape, and the shape is what tells you where you are.
    const levels = [...new Set(outline.sections.map((s) => s.level).filter((n) => Number.isFinite(n)))].sort((a, b) => a - b);
    for (const sec of outline.sections) {
      const depth = Math.max(0, Math.min(3, levels.indexOf(sec.level)));
      const b = el("button", `lvl-${depth}`, sec.label || `§${sec.index + 1}`);
      b.title = sec.label || "";
      b.onclick = () => {
        const r = byteRangeToChars(sec.byteStart, sec.byteEnd);
        if (r) {
          state.focus = { ...r, why: sec.label || `§${sec.index + 1}` };
          renderAll();
        }
      };
      box.appendChild(b);
    }
    wrap.appendChild(box);
  }
  const main = el("div", "field-main");
  const doc = el("div", `doc${state.source.modality === "code" || state.source.modality === "json" ? " code" : ""}`);
  fillDocWithMarks(doc, state.text);
  wireSelectToPivot(doc);
  main.appendChild(doc);
  wrap.appendChild(main);
  surface.appendChild(wrap);
  doc.querySelector("mark")?.scrollIntoView({ block: "center" });
  noteSelectToPivot(surface);
}

/** The document text with focus + selection occurrences marked. Marks are drawn, counted, and capped out loud. */
function fillDocWithMarks(doc, text) {
  const MARK_CAP = 2000; // response cap, not a data cap — the count of what it dropped is drawn below
  const ranges = [];
  if (state.focus) ranges.push([state.focus.c0, state.focus.c1, "focus"]);
  let dropped = 0;
  if (state.sel?.surfaces?.length) {
    const lower = text.toLowerCase();
    for (const surf of state.sel.surfaces) {
      const needle = String(surf).toLowerCase();
      if (needle.length < 2) continue;
      for (const at of wordOccurrences(lower, needle)) {
        if (ranges.length >= MARK_CAP) dropped++;
        else ranges.push([at, at + needle.length, "occ"]);
      }
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  // merge overlaps so the DOM stays sane
  const merged = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] < last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  let cursor = 0;
  for (const [a, b] of merged) {
    if (a > cursor) doc.appendChild(document.createTextNode(text.slice(cursor, a)));
    const m = el("mark", null, text.slice(a, b));
    doc.appendChild(m);
    cursor = b;
  }
  doc.appendChild(document.createTextNode(text.slice(cursor)));
  if (merged.length || dropped) {
    const info = el("div", "surface-note", `${merged.length.toLocaleString()} marks drawn${dropped ? ` · ${dropped.toLocaleString()} occurrences beyond the ${MARK_CAP.toLocaleString()}-mark cap not drawn` : ""}${state.sel ? ` · rule: exact surface match, case-folded, for ${state.sel.label}` : ""}`);
    doc.before(info);
  }
}

function renderMarkdownField(surface) {
  // A byte/char focus is an address into the raw text; the rendered face
  // cannot carry it without lying about offsets, so descent shows the bytes.
  if (state.focus && !state.mdRaw) {
    state.mdRaw = true;
  }
  // Two faces of one document, so: a segmented control that shows both and
  // marks which you are on — not a button whose label names the other one,
  // which made the reader work out the state from the verb.
  const seg = el("div", "seg");
  for (const [raw, label] of [[false, "rendered"], [true, "raw"]]) {
    const b = el("button", raw === state.mdRaw ? "on" : null, label);
    b.title = raw
      ? "the bytes themselves — the only face that can carry an address"
      : "the document as markdown describes it";
    b.onclick = () => {
      if (raw === state.mdRaw) return;
      // The rendered face cannot hold a byte address, so leaving raw drops
      // the focus rather than pointing it at something that isn't there.
      if (!raw) state.focus = null;
      state.mdRaw = raw;
      renderAll();
    };
    seg.appendChild(b);
  }
  (state._fieldBar ?? surface).prepend(seg);
  if (state.mdRaw) {
    const doc = el("div", "doc mono");
    fillDocWithMarks(doc, state.text);
    wireSelectToPivot(doc);
    surface.appendChild(doc);
    doc.querySelector("mark")?.scrollIntoView({ block: "center" });
    noteSelectToPivot(surface);
    return;
  }
  const holder = el("div", "md");
  mdInto(holder, state.text, state.sel?.surfaces ?? []);
  wireSelectToPivot(holder);
  surface.appendChild(holder);
  holder.querySelector("mark")?.scrollIntoView({ block: "center" });
  noteSelectToPivot(surface);
}

/**
 * The markdown face, into any holder: the reader's Field view and the preview
 * overlay draw the same rendered document from the same code. `marked` are
 * the selection's surfaces to light up — empty from the preview, which has no
 * pivot to carry.
 */
function mdInto(holder, text, marked = []) {
  // The selection's surfaces get marked inside the rendered prose — the
  // decorator hook exists for exactly this (the same seam the chat uses for
  // its address chips). Fence content stays verbatim and unmarked.
  const needles = marked.map((s) => String(s).toLowerCase()).filter((s) => s.length >= 2);
  const decorate = (chunk) => {
    if (!needles.length) return [document.createTextNode(chunk)];
    const lower = chunk.toLowerCase();
    const hits = [];
    for (const n of needles) for (const at of wordOccurrences(lower, n)) hits.push([at, at + n.length]);
    hits.sort((a, b) => a[0] - b[0]);
    const nodes = [];
    let at = 0;
    for (const [a, b] of hits) {
      if (a < at) continue; // overlapping surfaces: first one wins
      if (a > at) nodes.push(document.createTextNode(chunk.slice(at, a)));
      nodes.push(el("mark", null, chunk.slice(a, b)));
      at = b;
    }
    nodes.push(document.createTextNode(chunk.slice(at)));
    return nodes;
  };
  // Fenced code and pipe tables are split off here (render.js deliberately
  // owns neither — in the chat, artifact.js extracts them before prose ever
  // reaches the block renderer; this page has no artifact layer, so its
  // markdown face carries its own passes). Fence content goes verbatim into
  // <pre><code>; a table block becomes a real <table>, cells still
  // decorated; everything else goes through the same block renderer the
  // chat uses.
  const inlineInto = (parent, text) => {
    for (const part of parseInline(text)) {
      const nodes = decorate(part.text);
      if (!part.marks.length) {
        for (const n of nodes) parent.appendChild(n);
        continue;
      }
      let outer = null;
      let inner = null;
      for (const mark of part.marks) {
        const e = el({ strong: "strong", em: "em", code: "code" }[mark]);
        if (inner) inner.appendChild(e);
        else outer = e;
        inner = e;
      }
      for (const n of nodes) inner.appendChild(n);
      parent.appendChild(outer);
    }
  };
  const tableCells = (line) =>
    line
      .replace(/^\s*\|/, "")
      .replace(/\|\s*$/, "")
      .split("|")
      .map((c) => c.trim());
  const isTableRow = (line) => /^\s*\|.*\|\s*$/.test(line);
  const isTableRule = (line) => /^\s*\|[\s:|-]+\|\s*$/.test(line) && line.includes("-");

  const lines = String(text ?? "").split(/\r\n|\n/);
  let prose = [];
  let fence = null;
  const flushProse = () => {
    if (prose.length) renderBlocksInto(holder, prose.join("\n"), decorate);
    prose = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (fence === null && /^```/.test(line)) {
      flushProse();
      fence = [];
    } else if (fence !== null && /^```/.test(line)) {
      const pre = el("pre");
      pre.appendChild(el("code", null, fence.join("\n")));
      holder.appendChild(pre);
      fence = null;
    } else if (fence !== null) fence.push(line);
    else if (isTableRow(line) && isTableRule(lines[i + 1] ?? "")) {
      flushProse();
      const tbl = el("table", "tbl md-tbl");
      const trh = el("tr");
      for (const cell of tableCells(line)) {
        const th = el("th");
        inlineInto(th, cell);
        trh.appendChild(th);
      }
      tbl.appendChild(trh);
      i += 2; // past the rule
      while (i < lines.length && isTableRow(lines[i]) && !isTableRule(lines[i])) {
        const tr = el("tr");
        for (const cell of tableCells(lines[i])) {
          const td = el("td");
          inlineInto(td, cell);
          tr.appendChild(td);
        }
        tbl.appendChild(tr);
        i++;
      }
      i--; // the for-loop's own increment takes the next line
      holder.appendChild(tbl);
    } else prose.push(line);
  }
  if (fence !== null) {
    prose.push("```", ...fence); // unclosed fence stays prose
  }
  flushProse();
}

function renderTableField(surface) {
  // One CSV reader for the whole page (preview.js's), so the desk's preview
  // and the reader's table face can never disagree about where a row ends.
  const { head, body, totalDataRows, dropped } = parseDelimited(state.text, state.source.delimiter ?? ",");
  note(surface, "shown", `rows as delimited on disk · showing ${(totalDataRows - dropped).toLocaleString()} of ${totalDataRows.toLocaleString()} data rows${dropped ? ` — ${dropped.toLocaleString()} beyond the display cap not shown` : ""}`);
  const tbl = el("table", "tbl");
  const trh = el("tr");
  for (const h of head ?? []) trh.appendChild(el("th", null, h));
  tbl.appendChild(trh);
  body.forEach((r, i) => {
    const tr = el("tr");
    if (state.sel?.type === "member" && state.sel.row === i) tr.className = "hl";
    for (const c of r) tr.appendChild(el("td", null, c));
    tbl.appendChild(tr);
  });
  surface.appendChild(tbl);
  surface.querySelector("tr.hl")?.scrollIntoView({ block: "center" });
}

function renderHtmlField(surface) {
  note(surface, "shown", "rendered inert — no scripts run (sandbox). Toggle to source to see the bytes.");
  const wrap = el("div", "media-wrap");
  const f = el("iframe");
  f.setAttribute("sandbox", ""); // no scripts, no same-origin — a picture of the page
  f.srcdoc = state.text;
  wrap.appendChild(f);
  const toggle = el("button", null, "view source");
  let src = false;
  toggle.onclick = () => {
    src = !src;
    toggle.textContent = src ? "view rendered" : "view source";
    wrap.replaceChildren(toggle);
    if (src) {
      const doc = el("div", "doc code");
      fillDocWithMarks(doc, state.text);
      wrap.appendChild(doc);
    } else {
      wrap.appendChild(f);
    }
  };
  wrap.prepend(toggle);
  surface.appendChild(wrap);
}

async function renderHexField(surface) {
  note(surface, "shown", `not valid UTF-8 — the hex dump is Field's native face for binary. ${state.source.bytes.toLocaleString()} bytes total.`);
  const page = await api(`/api/hex?path=${encodeURIComponent(state.path)}&offset=${state.hexOffset}`);
  const nav = el("div", "hex-nav");
  const prev = el("button", null, "◂ prev");
  const next = el("button", null, "next ▸");
  prev.disabled = page.offset === 0;
  next.disabled = page.offset + page.length >= page.total;
  prev.onclick = () => {
    state.hexOffset = Math.max(0, state.hexOffset - 1024);
    renderAll();
  };
  next.onclick = () => {
    state.hexOffset += 1024;
    renderAll();
  };
  nav.appendChild(prev);
  nav.appendChild(el("span", "muted", `bytes ${page.offset.toLocaleString()}–${(page.offset + page.length).toLocaleString()} of ${page.total.toLocaleString()}`));
  nav.appendChild(next);
  surface.appendChild(nav);
  const hex = el("div", "hex");
  const tbl = el("table");
  for (const row of page.rows) {
    const tr = el("tr");
    tr.appendChild(el("td", "off", row.off.toString(16).padStart(8, "0")));
    tr.appendChild(el("td", null, row.hex.join(" ")));
    tr.appendChild(el("td", "asc", row.ascii));
    tbl.appendChild(tr);
  }
  hex.appendChild(tbl);
  surface.appendChild(hex);
}

// ---- Entity — Existence·Figure: the discovered cast -----------------------
function readGate(surface, key) {
  if (state.read?.gap) {
    gapFace(surface, state.read.gap.silence ?? state.read.gap.reason, state.read.gap.detail ?? "");
    return null;
  }
  const T = state.read?.terrains;
  if (T?.[key]) return T; // this surface has landed, even if the read is still going
  if (state.readPhase != null) {
    gapFace(surface, "reading", `this surface fills in when its organ finishes (${state.readPhase}).`);
    return null;
  }
  gapFace(surface, "not-computed", "no read has run for this source — open a textual source and the read starts on its own.");
  return null;
}

function renderEntity(surface) {
  const T = readGate(surface, "Entity");
  if (!T) return;
  const { referents, gaps } = T.Entity;
  if (!referents.length) return gapFace(surface, "computed-and-empty", "the cast discovery ran and found no recurring named referent — an empty result, not an unrun one.");
  note(surface, "shown", `${referents.length} referents discovered by recurrence (sessionReferents) · ordered by mentions, apparatus demoted — the engine's own rule${gaps.length ? ` · ${gaps.length} typed gap${gaps.length > 1 ? "s" : ""} in Void` : ""}`);
  const cards = el("div", "cards");
  for (const r of referents) {
    const card = el("button", `card${selMatchesReferent(r) ? " sel" : ""}`);
    const nm = el("div", "nm", r.display);
    if (r.individuation) nm.appendChild(el("span", "ind", r.individuation));
    card.appendChild(nm);
    card.appendChild(el("div", "counts", `${r.mentions} mentions · ${r.frames ?? "—"} frames${r.pronounMentions ? ` · ${r.pronounMentions} pronoun-bound` : ""}${r.fromPrior ? " · from prior" : ""}`));
    card.appendChild(el("div", "surfaces", (r.surfaces ?? []).map((s) => (typeof s === "string" ? s : s.surface)).join(" · ")));
    card.onclick = () => {
      state.sel = { type: "referent", label: r.display, surfaces: (r.surfaces ?? []).map((s) => (typeof s === "string" ? s : s.surface)).filter(Boolean) };
      renderAll();
    };
    cards.appendChild(card);
  }
  surface.appendChild(cards);
}

// ---- Link — Structure·Figure: the triples ---------------------------------
// Each statement carries handles (relations-chain.js, computed once per
// landed Link surface and remembered): the statement before/after it in the
// discourse — same sentence or the clause next door — and the other
// statements naming the same cast member. A clause fragment ("and —that→
// Russia would never forget") is unreadable alone; its handles are where its
// meaning lives.
let linkChain = { src: null, cast: null, rows: [] };
function chainedLink(T) {
  const rels = T.Link?.relations ?? [];
  const referents = T.Entity?.referents ?? [];
  // Keyed on the arrays themselves: a new read lands new objects, so
  // reference identity can never serve a stale chain the way a count could.
  if (linkChain.src !== rels || linkChain.cast !== referents) {
    linkChain = { src: rels, cast: referents, rows: chainRelations(rels, { text: state.text ?? "", referents, diaNorm }) };
  }
  return linkChain.rows;
}

const LINK_WORDS = {
  "same-clause": "same clause",
  "same-sentence": "same sentence",
  "adjacent-clause": "the clause next door",
};

/**
 * ONE drawing of a link, everywhere a link is drawn.
 *
 * A statement was appearing three ways on one screen: as styled subject /
 * verb / object spans in its own row, as a flat truncated string inside the
 * neighbour pills, and as a spaceless label with no arrow at all in the
 * selection. The same edge in three costumes reads as three kinds of thing,
 * and the reader has to work out each time whether they are looking at the
 * same claim. They are always the same claim, so they get one shape:
 *
 *     subject  —verb→  object   [negated]
 *
 * Subject and object are the material's own words and stay in the reading
 * face; the verb is the instrument's finding and stays mono, so which half
 * came from where is legible without a legend. Truncation is per-side, on the
 * side that is long, rather than a cut through the middle of the arrow.
 */
const LINK_SIDE_MAX = 42;
function linkNode(t, { compact = false } = {}) {
  const wrap = el("span", `link${compact ? " compact" : ""}`);
  const side = (cls, text) => {
    const s = el("span", cls, clip(String(text ?? ""), LINK_SIDE_MAX));
    if (String(text ?? "").length > LINK_SIDE_MAX) s.title = text;
    return s;
  };
  wrap.appendChild(side("s", t.subject));
  wrap.appendChild(el("span", "v", `—${t.verb}→`));
  wrap.appendChild(side("o", t.object));
  if (t.polarity === "−" || t.polarity === "-") wrap.appendChild(el("span", "neg", "negated"));
  return wrap;
}

/** The same link as a string, for titles and labels — one spelling there too. */
function linkText(t) {
  return `${t.subject} —${t.verb}→ ${t.object}${t.polarity === "−" || t.polarity === "-" ? " (negated)" : ""}`;
}

const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const RELATION_ROWS_DRAWN = 400; // display cap, stated where it drops
const SHARED_SHOWN = 8; // display cap on the sibling list, stated where it drops

function renderLink(surface) {
  const T = readGate(surface, "Link");
  if (!T) return;
  const { relations, total, truncated } = T.Link;
  if (!total) return gapFace(surface, "computed-and-empty", "the relation ladder ran and stated zero (subject, verb, object) triples.");
  const rows = chainedLink(T);
  let shown = rows;
  let filterNote = "";
  if (state.sel?.type === "referent" || state.sel?.type === "node") {
    const needles = (state.sel.surfaces ?? [state.sel.label]).map((s) => s.toLowerCase());
    shown = rows.filter((t) => needles.some((n) => t.subject?.toLowerCase() === n || t.object?.toLowerCase() === n || t.subject?.toLowerCase().includes(n) || t.object?.toLowerCase().includes(n)));
    filterNote = ` · filtered by ${state.sel.label}: ${shown.length} of ${rows.length} match (rule: side equals or contains a surface, case-folded)`;
  }
  note(surface, "shown", `${total} triples stated (sessionRelations), in the order the material states them${truncated ? ` · ${total - relations.length} beyond the response cap not shown` : ""}${filterNote} · click a statement for what links to it`);

  const keyOf = (t) => `${t.subject}|${t.verb}|${t.object}`;
  const jump = (t) => {
    state.sel = { type: "relation", label: linkText(t), key: keyOf(t), index: t.index, surfaces: [t.subject, t.object] };
    renderAll();
    const row = document.getElementById(`rel-row-${t.index}`);
    if (row) {
      row.scrollIntoView({ block: "center", behavior: "smooth" });
      row.classList.add("flash");
      setTimeout(() => row.classList.remove("flash"), 1300);
    }
  };
  const buildRow = (t) => {
    const row = el("button", `triple${state.sel?.type === "relation" && state.sel.key === keyOf(t) ? " sel" : ""}`);
    row.id = `rel-row-${t.index}`;
    row.appendChild(el("span", "ord", String(t.index + 1))); // its place in the material, not a rank
    row.appendChild(linkNode(t));
    row.onclick = () => jump(t);
    return row;
  };

  /**
   * One shape for every hop out of the selected statement, whichever kind of
   * neighbour it is. The relation to the selection goes in a fixed slot on
   * the LEFT — always the same place, always the same width — and the link
   * itself follows in its one standard drawing.
   *
   * Before this, `before` wore a leading `‹`, `after` wore a trailing `›`,
   * and a shared-cast sibling wore neither and used an em dash instead: three
   * layouts for one gesture, and the two chevrons on opposite edges meant the
   * eye could not scan the column that told it what kind of hop each was.
   */
  const hop = (relation, t, title) => {
    const b = el("button", "rel-hop");
    b.appendChild(el("span", "rel-kind", relation));
    b.appendChild(linkNode(t, { compact: true }));
    b.title = title ?? linkText(t);
    b.onclick = () => jump(t);
    return b;
  };
  // The selected statement's handles, under its own row: where its meaning
  // continues (a fragment completes the statement before it), and who else
  // the material says something about.
  const buildHandles = (t) => {
    const strip = el("div", "rel-handles");
    if (t.prev)
      strip.appendChild(
        hop(`↑ before · ${LINK_WORDS[t.prev.link]}`, rows[t.prev.index], `statement ${t.prev.index + 1} in the material's order`),
      );
    if (t.next)
      strip.appendChild(
        hop(`↓ after · ${LINK_WORDS[t.next.link]}`, rows[t.next.index], `statement ${t.next.index + 1} in the material's order`),
      );
    if (!t.prev && !t.next && t.where) strip.appendChild(el("div", "rel-note", "no statement sits next to this one in its sentence or the clauses beside it"));
    if (!t.where) strip.appendChild(el("div", "rel-note", "this statement couldn't be placed back in the material, so before/after are unknown for it"));
    if (t.shared.length) {
      strip.appendChild(el("div", "rel-note", `other statements naming ${[...new Set(t.shared.flatMap((x) => x.via))].join(", ")}:`));
      for (const x of t.shared.slice(0, SHARED_SHOWN))
        strip.appendChild(
          hop(`⇢ ${x.via.join(" · ")}`, rows[x.index], `statement ${x.index + 1} in the material's order`),
        );
      if (t.shared.length > SHARED_SHOWN) strip.appendChild(el("div", "rel-note", `${t.shared.length - SHARED_SHOWN} more not drawn (display cap)`));
    } else {
      strip.appendChild(el("div", "rel-note", "no other statement names the same cast member on either side"));
    }
    return strip;
  };

  const box = el("div", "triples");
  const selKey = state.sel?.type === "relation" ? state.sel.key : null;
  let selDrawn = false;
  for (const t of shown.slice(0, RELATION_ROWS_DRAWN)) {
    box.appendChild(buildRow(t));
    if (selKey && keyOf(t) === selKey) {
      box.appendChild(buildHandles(t));
      selDrawn = true;
    }
  }
  if (shown.length > RELATION_ROWS_DRAWN) box.appendChild(el("div", "surface-note", `${shown.length - RELATION_ROWS_DRAWN} more not drawn (display cap)`));
  // A jump must never land nowhere: a selected statement beyond the drawn
  // window (or outside the current filter) is drawn out of place, and says so.
  if (selKey && !selDrawn) {
    const t = rows.find((r) => keyOf(r) === selKey);
    if (t) {
      box.appendChild(el("div", "surface-note", `the selected statement sits at place ${t.index + 1}, beyond what is drawn above — shown here so it stays followable`));
      box.appendChild(buildRow(t));
      box.appendChild(buildHandles(t));
    }
  }
  surface.appendChild(box);
}

// ---- Network — Structure·Pattern: the belief graph ------------------------
// A real node-link graph: seeded force layout (deterministic — the same
// source lays out the same way on every render, so a view can be revisited),
// node area by mentions, edge weight by belief, wheel-zoom and drag-pan.
// The LAYOUT is presentation, not measurement: positions carry no claim.
function layoutGraph(nodes, edges, seed) {
  let a = (seed | 0) + 0x6d2b79f5;
  const rnd = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const W = 1000;
  const H = 620;
  const pos = new Map(nodes.map((n) => [n.id, { x: W / 2 + (rnd() - 0.5) * W * 0.8, y: H / 2 + (rnd() - 0.5) * H * 0.8, dx: 0, dy: 0 }]));
  const springs = edges
    .map((e) => {
      const [s, , o] = e.edge.split("|");
      return pos.has(s) && pos.has(o) && s !== o ? { s, o, w: e.weight } : null;
    })
    .filter(Boolean);
  const maxW = Math.max(...springs.map((s) => s.w), 1e-9);
  const k = Math.sqrt((W * H) / Math.max(1, nodes.length)); // FR ideal distance
  const ids = [...pos.keys()];
  for (let iter = 0; iter < 260; iter++) {
    const heat = 0.9 * (1 - iter / 260) ** 1.5 * k;
    for (const p of pos.values()) {
      p.dx = 0;
      p.dy = 0;
    }
    // repulsion, all pairs
    for (let i = 0; i < ids.length; i++) {
      const pi = pos.get(ids[i]);
      for (let j = i + 1; j < ids.length; j++) {
        const pj = pos.get(ids[j]);
        let vx = pi.x - pj.x;
        let vy = pi.y - pj.y;
        let d2 = vx * vx + vy * vy;
        if (d2 < 0.01) {
          vx = rnd() - 0.5;
          vy = rnd() - 0.5;
          d2 = 0.25;
        }
        const f = (k * k) / d2;
        pi.dx += vx * f * 0.06;
        pi.dy += vy * f * 0.06;
        pj.dx -= vx * f * 0.06;
        pj.dy -= vy * f * 0.06;
      }
    }
    // attraction along edges, weight-scaled
    for (const { s, o, w } of springs) {
      const ps = pos.get(s);
      const po = pos.get(o);
      const vx = ps.x - po.x;
      const vy = ps.y - po.y;
      const d = Math.sqrt(vx * vx + vy * vy) || 0.1;
      const f = (d / k) * (0.35 + 0.65 * (w / maxW)) * 0.08;
      ps.dx -= vx * f;
      ps.dy -= vy * f;
      po.dx += vx * f;
      po.dy += vy * f;
    }
    // gravity to center + cooled step. No wall-clamp during layout — a hard
    // boundary turns repulsion into a queue along the walls; the drawing is
    // fitted to the box once, after convergence.
    for (const p of pos.values()) {
      p.dx += (W / 2 - p.x) * 0.03;
      p.dy += (H / 2 - p.y) * 0.03;
      const d = Math.sqrt(p.dx * p.dx + p.dy * p.dy) || 1;
      const step = Math.min(d, heat);
      p.x += (p.dx / d) * step;
      p.y += (p.dy / d) * step;
    }
  }
  // fit to the box, aspect preserved
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pos.values()) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const fit = Math.min((W - 120) / spanX, (H - 70) / spanY);
  for (const p of pos.values()) {
    p.x = 60 + (p.x - minX) * fit + ((W - 120) - spanX * fit) / 2;
    p.y = 35 + (p.y - minY) * fit + ((H - 70) - spanY * fit) / 2;
  }
  return { pos, W, H, maxW };
}

// The words are the marks, so the marks must not sit on each other: a short
// relaxation pass pushes overlapping label boxes apart. Presentation only.
function relaxLabels(nodes, pos, sizeOf) {
  for (let pass = 0; pass < 30; pass++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      const a = pos.get(nodes[i].id);
      const [aw, ah] = sizeOf(nodes[i]);
      for (let j = i + 1; j < nodes.length; j++) {
        const b = pos.get(nodes[j].id);
        const [bw, bh] = sizeOf(nodes[j]);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const ox = (aw + bw) / 2 + 8 - Math.abs(dx);
        const oy = (ah + bh) / 2 + 6 - Math.abs(dy);
        if (ox > 0 && oy > 0) {
          moved = true;
          if (ox < oy) {
            const push = (ox / 2) * Math.sign(dx || 1);
            a.x -= push;
            b.x += push;
          } else {
            const push = (oy / 2) * Math.sign(dy || 1);
            a.y -= push;
            b.y += push;
          }
        }
      }
    }
    if (!moved) break;
  }
}

// Sentences of the source, split client-side with char offsets — the
// evidence face of a graph edge ("where do these two arrive together?").
// A string scan, labeled as such where shown; never a claim of the engine's.
function clientSentences() {
  if (state.sentCache?.path === state.path) return state.sentCache.list;
  const list = [];
  if (state.text) {
    const re = /[^.!?\n]+[.!?]*/g;
    let m;
    while ((m = re.exec(state.text)) !== null) {
      const t = m[0].trim();
      if (t.length > 1) list.push({ text: t, start: m.index });
    }
  }
  state.sentCache = { path: state.path, list };
  return list;
}
function sentencesWithBoth(a, b, cap = 4) {
  const la = String(a).toLowerCase();
  const lb = String(b).toLowerCase();
  const out = [];
  let total = 0;
  for (const s of clientSentences()) {
    const low = s.text.toLowerCase();
    const hasA = !wordOccurrences(low, la).next().done;
    const hasB = !wordOccurrences(low, lb).next().done;
    if (hasA && hasB) {
      total++;
      if (out.length < cap) out.push(s);
    }
  }
  return { out, total };
}

function renderNetwork(surface) {
  const T = readGate(surface, "Network");
  if (!T) return;
  const net = T.Network;
  if (!net.nodeCount) return gapFace(surface, "computed-and-empty", "no triples survived into the belief graph.");

  const stages = net.stages?.length ? net.stages : null;
  const stageIdx = Math.min(state.netStage ?? (stages ? stages.length - 1 : 0), (stages?.length ?? 1) - 1);
  const view = stages ? stages[stageIdx] : net;

  const b = net.binding;
  const fb = net.formBinding;
  const sources = [
    view.of ? `${view.of.toLocaleString()} statements` : null,
    b?.witnessed ? `${b.witnessed} name co-arrival${b.witnessed === 1 ? "" : "s"}` : null,
    fb?.witnessed ? `${fb.witnessed} recurring-form co-arrival${fb.witnessed === 1 ? "" : "s"}` : null,
  ].filter(Boolean);
  const tiesDrawn = new Set(
    view.edges.map((e) => {
      const [s, , o] = e.edge.split("|");
      return [s, o].sort().join("\u0000");
    }),
  ).size;
  const compact = `${view.nodeCount.toLocaleString()} words · ${tiesDrawn.toLocaleString()} ties — from ${sources.length ? sources.join(", ") : "nothing that survived"} · strongest ${view.nodes.length} words drawn`;
  const n = note(surface, "shown", compact);
  n.title =
    "A decaying belief graph — it forgets by design. Ties come from three organs, each carrying its own null: (subject, verb, object) statements from the clause ladder; co-arrivals of cast names; co-arrivals of the document's recurring vocabulary (Zipf function-words excluded, arrivals ≥ 2 — the structural minimum). Layout is seeded force-direction — presentation, not a claim.";

  // Layout once per source over the FINAL stage's population, cached — the
  // cursor scrubs belief, not geography. Words are the marks: font size
  // carries mentions, and labels are relaxed apart so every word is legible.
  const finalPop = stages ? stages[stages.length - 1] : net;
  const maxMentionsAll = Math.max(...finalPop.nodes.map((x) => x.mentions), 1);
  const fontOf = (nd) => 12 + 15 * Math.sqrt(nd.mentions / maxMentionsAll);
  const boxOf = (nd) => {
    const f = fontOf(nd);
    return [Math.min(30, nd.id.length) * f * 0.58 + 18, f + 14];
  };
  const layoutKey = `${state.path}·${finalPop.nodes.length}·v2`;
  if (state.netLayout?.key !== layoutKey) {
    const seed = [...(state.path ?? "")].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7);
    const laid = layoutGraph(finalPop.nodes, finalPop.edges, seed);
    relaxLabels(finalPop.nodes, laid.pos, boxOf);
    state.netLayout = { key: layoutKey, ...laid };
  }
  const { pos, W, H } = state.netLayout;
  const maxW = Math.max(...view.edges.map((e) => e.weight), 1e-9);

  // The organ keeps two keys per tie (verb-inclusive and structural — its
  // own design); a READER wants one tie per pair. Merged for display only:
  // strongest weight carries the line, every verb stays listed on the pair.
  const pairs = new Map();
  for (const e of view.edges) {
    const [s, verb, o] = e.edge.split("|");
    const pk = [s, o].sort().join("\u0000");
    if (!pairs.has(pk)) pairs.set(pk, { s, o, w: 0, verbs: [] });
    const pr = pairs.get(pk);
    pr.w = Math.max(pr.w, e.weight);
    const negated = verb.startsWith("!");
    const bare = verb.replace(/^!/, "");
    pr.verbs.push({ verb: bare || "co-occurs", negated, w: e.weight, key: e.edge, structural: bare === "" });
  }
  const pairList = [...pairs.values()].map((pr) => {
    pr.verbs.sort((a, b) => (a.structural - b.structural) || (b.w - a.w));
    return pr;
  });

  // one-hop adjacency at this cursor, for the neighborhood and the panel
  const adjacency = new Map();
  for (const pr of pairList) {
    if (!adjacency.has(pr.s)) adjacency.set(pr.s, new Set());
    if (!adjacency.has(pr.o)) adjacency.set(pr.o, new Set());
    adjacency.get(pr.s).add(pr.o);
    adjacency.get(pr.o).add(pr.s);
  }

  const drawn = view.nodes.filter((nd) => pos.has(nd.id));
  const focus = state.netFocus;
  const nearFocus = (id) => id === focus || adjacency.get(focus)?.has(id);

  // The view opens ON the words, not on an empty canvas: content bbox, or
  // the focused neighborhood's bbox when a word is held.
  const bboxOf = (ids) => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const nd of drawn) {
      if (ids && !ids.has(nd.id)) continue;
      const p = pos.get(nd.id);
      const [w, h] = boxOf(nd);
      x0 = Math.min(x0, p.x - w / 2 - 26);
      x1 = Math.max(x1, p.x + w / 2 + 26);
      y0 = Math.min(y0, p.y - h / 2 - 26);
      y1 = Math.max(y1, p.y + h / 2 + 26);
    }
    if (!Number.isFinite(x0)) return { x: 0, y: 0, w: W, h: H };
    return { x: x0, y: y0, w: Math.max(220, x1 - x0), h: Math.max(140, y1 - y0) };
  };
  const contentBox = bboxOf(null);
  const focusBox = focus ? bboxOf(new Set([focus, ...(adjacency.get(focus) ?? [])])) : null;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  const wanted = focusBox ?? contentBox;
  if (!state.netVB || state.netVB.key !== layoutKey || state.netVB.want !== JSON.stringify(wanted)) {
    state.netVB = { key: layoutKey, want: JSON.stringify(wanted), x: wanted.x, y: wanted.y, w: wanted.w, h: wanted.h };
  }
  const vb = state.netVB;
  const applyVB = () => svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  applyVB();

  const focusWord = (id) => {
    state.netFocus = state.netFocus === id ? null : id;
    state.sel = state.netFocus ? { type: "node", label: id, surfaces: [id] } : null;
    renderAll();
  };

  // ties beneath, words above — one line per pair. A binding tie's polarity
  // is the coupling sign of a DIRECTED co-arrival (transfer entropy: the
  // subject leads; negative = the leader's arrival makes the follower less
  // likely) — "excites"/"inhibits", never a negation of co-occurrence.
  const verbWord = (v) => {
    if (/^co-occurs?$/.test(v.verb)) return v.negated ? "inhibits" : "excites";
    return v.negated ? `not ${v.verb}` : v.verb;
  };
  const verbLine = (pr) =>
    pr.verbs
      .filter((v) => !v.structural)
      .map(verbWord)
      .join(" · ") || "co-arrives";
  for (const pr of pairList) {
    const ps = pos.get(pr.s);
    const po = pos.get(pr.o);
    if (!ps || !po) continue;
    const onFocus = focus && (pr.s === focus || pr.o === focus);
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", ps.x.toFixed(1));
    line.setAttribute("y1", ps.y.toFixed(1));
    line.setAttribute("x2", po.x.toFixed(1));
    line.setAttribute("y2", po.y.toFixed(1));
    line.setAttribute("class", `nedge${focus ? (onFocus ? " sel" : " dim") : ""}`);
    line.setAttribute("stroke-width", (1.4 + 3.6 * (pr.w / maxW)).toFixed(2));
    const tip = document.createElementNS(svgNS, "title");
    tip.textContent = `${pr.s} — ${verbLine(pr)} — ${pr.o} · weight ${pr.w.toFixed(3)}`;
    line.appendChild(tip);
    line.addEventListener("click", (ev) => {
      ev.stopPropagation();
      state.netFocus = null;
      state.sel = { type: "relation", label: `${pr.s} ${verbLine(pr)} ${pr.o}`, key: pr.verbs[0].key, surfaces: [pr.s, pr.o] };
      renderAll();
    });
    svg.appendChild(line);
    // The verb rides the tie when a word is held — that is how the
    // relationship is actually read.
    if (onFocus) {
      const lbl = document.createElementNS(svgNS, "text");
      lbl.setAttribute("x", ((ps.x + po.x) / 2).toFixed(1));
      lbl.setAttribute("y", ((ps.y + po.y) / 2 - 4).toFixed(1));
      lbl.setAttribute("text-anchor", "middle");
      lbl.setAttribute("class", "elabel");
      lbl.textContent = verbLine(pr);
      svg.appendChild(lbl);
    }
  }
  for (const nd of drawn) {
    const p = pos.get(nd.id);
    const f = fontOf(nd);
    const [w, h] = boxOf(nd);
    const g = document.createElementNS(svgNS, "g");
    const lit = focus ? nearFocus(nd.id) : state.sel?.surfaces?.some((s) => s.toLowerCase() === nd.id);
    g.setAttribute("class", `gnode${nd.id === focus ? " focus" : lit ? " lit" : focus ? " far" : ""}`);
    const pill = document.createElementNS(svgNS, "rect");
    pill.setAttribute("x", (p.x - w / 2).toFixed(1));
    pill.setAttribute("y", (p.y - h / 2).toFixed(1));
    pill.setAttribute("width", w.toFixed(1));
    pill.setAttribute("height", h.toFixed(1));
    pill.setAttribute("rx", (h / 2).toFixed(1));
    g.appendChild(pill);
    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", p.x.toFixed(1));
    label.setAttribute("y", (p.y + f * 0.34).toFixed(1));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("font-size", f.toFixed(1));
    label.textContent = nd.id.length > 30 ? `${nd.id.slice(0, 29)}…` : nd.id;
    g.appendChild(label);
    const tip = document.createElementNS(svgNS, "title");
    tip.textContent = `${nd.id} · ${nd.mentions} mention${nd.mentions === 1 ? "" : "s"}${nd.fromPrior ? " · from a prior" : ""}`;
    g.appendChild(tip);
    g.addEventListener("click", (ev) => {
      ev.stopPropagation();
      focusWord(nd.id);
    });
    svg.appendChild(g);
  }

  // wheel-zoom about the cursor, drag-pan; double-click fits the content
  const zoomBy = (scale, cx, cy) => {
    const mx = cx ?? vb.x + vb.w / 2;
    const my = cy ?? vb.y + vb.h / 2;
    const fx = (mx - vb.x) / vb.w;
    const fy = (my - vb.y) / vb.h;
    vb.w = Math.max(120, Math.min(W * 3, vb.w * scale));
    vb.h = Math.max(80, Math.min(H * 3, vb.h * scale));
    vb.x = mx - fx * vb.w;
    vb.y = my - fy * vb.h;
    applyVB();
  };
  svg.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    const rect = svg.getBoundingClientRect();
    zoomBy(ev.deltaY > 0 ? 1.15 : 1 / 1.15, vb.x + ((ev.clientX - rect.left) / rect.width) * vb.w, vb.y + ((ev.clientY - rect.top) / rect.height) * vb.h);
  }, { passive: false });
  let drag = null;
  svg.addEventListener("pointerdown", (ev) => {
    drag = { x: ev.clientX, y: ev.clientY, vx: vb.x, vy: vb.y };
    svg.setPointerCapture(ev.pointerId);
  });
  svg.addEventListener("pointermove", (ev) => {
    if (!drag) return;
    const rect = svg.getBoundingClientRect();
    vb.x = drag.vx - ((ev.clientX - drag.x) / rect.width) * vb.w;
    vb.y = drag.vy - ((ev.clientY - drag.y) / rect.height) * vb.h;
    applyVB();
  });
  svg.addEventListener("pointerup", () => {
    drag = null;
  });
  const fitContent = () => {
    Object.assign(vb, { x: contentBox.x, y: contentBox.y, w: contentBox.w, h: contentBox.h });
    applyVB();
  };
  svg.addEventListener("dblclick", fitContent);
  svg.addEventListener("click", () => {
    if (state.netFocus) {
      state.netFocus = null;
      state.sel = null;
      renderAll();
    }
  });

  // the toolbar: find a word, fit, zoom — visible controls, not secrets
  const bar = el("div", "net-bar");
  const search = el("input");
  search.placeholder = "find a word…";
  search.value = state.netSearch ?? "";
  search.oninput = () => {
    state.netSearch = search.value;
    const q = search.value.trim().toLowerCase();
    if (!q) return;
    const hit = drawn.find((nd) => nd.id.startsWith(q)) ?? drawn.find((nd) => nd.id.includes(q));
    if (hit) {
      state.netFocus = hit.id;
      state.sel = { type: "node", label: hit.id, surfaces: [hit.id] };
      renderAll();
      const again = $("surface").querySelector(".net-bar input");
      if (again) {
        again.focus();
        again.setSelectionRange(again.value.length, again.value.length);
      }
    }
  };
  bar.appendChild(search);
  const fitBtn = el("button", null, "fit");
  fitBtn.onclick = fitContent;
  const zin = el("button", null, "+");
  zin.onclick = () => zoomBy(1 / 1.35);
  const zout = el("button", null, "−");
  zout.onclick = () => zoomBy(1.35);
  bar.appendChild(zin);
  bar.appendChild(zout);
  bar.appendChild(fitBtn);
  if (stages && stages.length > 1) {
    const hist = el("details", "net-history");
    const sum = el("summary", null, `reading history · stage ${stageIdx + 1}/${stages.length}`);
    hist.appendChild(sum);
    const slider = el("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = String(stages.length - 1);
    slider.value = String(stageIdx);
    slider.oninput = () => {
      state.netStage = Number(slider.value);
      renderAll();
    };
    hist.appendChild(slider);
    hist.appendChild(el("div", "muted", `belief after ${view.upTo.toLocaleString()} of ${view.of.toLocaleString()} ${view.label ?? "stated relations"} · tick ${view.tick} — earlier stages show belief mid-read; decay per stage is the organ's own semantics`));
    if (state.netHistoryOpen) hist.open = true;
    hist.ontoggle = () => (state.netHistoryOpen = hist.open);
    bar.appendChild(hist);
  }
  surface.appendChild(bar);

  const wrap = el("div", "net-wrap");
  const box = el("div", "net");
  box.appendChild(svg);
  wrap.appendChild(box);

  // The word panel: what it ties to, and the sentences that say so — the
  // road back to the source is the whole point of the graph.
  if (focus) {
    const aside = el("div", "net-inspector");
    const focusData = view.nodes.find((nd) => nd.id === focus);
    aside.appendChild(el("div", "nm", focus));
    aside.appendChild(el("div", "muted", focusData ? `${focusData.mentions} mention${focusData.mentions === 1 ? "" : "s"} in the read${focusData.fromPrior ? " · from a prior" : ""}` : "held below this cursor's drawing cap"));
    const inSource = el("button", null, "show in source");
    inSource.onclick = () => {
      state.terrain = "Field";
      renderAll();
    };
    aside.appendChild(inSource);
    const foldWordBtn = el("button", null, "fold its sentences");
    foldWordBtn.title = "an extractive summary of every sentence this word arrives in — verbatim, no model";
    foldWordBtn.onclick = () => requestFold({ word: focus }, "wordFold");
    aside.appendChild(foldWordBtn);
    if (state.wordFold) aside.appendChild(foldCard(state.wordFold, "wordFold"));
    const mine = pairList
      .filter((pr) => pr.s === focus || pr.o === focus)
      .map((pr) => ({ ...pr, other: pr.s === focus ? pr.o : pr.s }))
      .sort((x, y) => y.w - x.w);
    aside.appendChild(el("div", "hd", `${mine.length} tie${mine.length === 1 ? "" : "s"}`));
    for (const m of mine.slice(0, 24)) {
      const row = el("div", "iedge-block");
      const head = el("button", "iedge");
      head.appendChild(el("span", "o", m.other.length > 30 ? `${m.other.slice(0, 29)}…` : m.other));
      head.appendChild(el("span", "v", verbLine(m)));
      head.appendChild(el("span", "w", m.w.toFixed(2)));
      head.title = `walk to ${m.other}`;
      head.onclick = () => focusWord(m.other);
      row.appendChild(head);
      const ev = el("button", "iev", "¶");
      ev.title = "the sentences where both arrive (string scan)";
      ev.onclick = (evd) => {
        evd.stopPropagation(); // the ¶ opens evidence; it must not also walk
        const open = row.querySelector(".isents");
        if (open) return open.remove();
        const { out, total } = sentencesWithBoth(focus, m.other);
        const sents = el("div", "isents");
        if (!total) sents.appendChild(el("div", "muted", "no single sentence holds both — the tie is a within-window co-arrival"));
        for (const s of out) {
          const sb = el("button", "isent", s.text.length > 160 ? `${s.text.slice(0, 159)}…` : s.text);
          sb.onclick = () => {
            state.focus = { c0: s.start, c1: s.start + s.text.length, why: `${focus} + ${m.other}` };
            state.terrain = "Field";
            renderAll();
          };
          sents.appendChild(sb);
        }
        if (total > out.length) sents.appendChild(el("div", "muted", `${total - out.length} more sentence${total - out.length === 1 ? "" : "s"} not shown`));
        row.appendChild(sents);
      };
      head.appendChild(ev);
      aside.appendChild(row);
    }
    if (mine.length > 24) aside.appendChild(el("div", "muted", `${mine.length - 24} more ties not listed`));
    wrap.appendChild(aside);
  }

  surface.appendChild(wrap);
}

// ---- Atmosphere — Interpretation·Ground: the trace ------------------------
function renderAtmosphere(surface) {
  const T = readGate(surface, "Atmosphere");
  if (!T) return;
  const atmo = T.Atmosphere;
  if (atmo.gap) return gapFace(surface, atmo.gap.silence ?? "gap", atmo.gap.detail ?? "");
  const frames = atmo.frames;
  const regime = atmo.regime?.gap ? null : atmo.regime;
  note(
    surface,
    "shown",
    `causal surprisal, microbits per ${atmo.chunkWords}-word chunk — the baseline is the reader's own table so far, so it moves. ${frames.length} frames.` +
      (regime ? ` Regime: ${regime.regions?.length ?? 0} regions, ${regime.rezeroCount} re-zeros, ${regime.clearingCount} clearings (window ${atmo.regimeParams.window}, draws ${atmo.regimeParams.draws}, tolerance ${atmo.regimeParams.tolerance}).` : ` Regime: ${atmo.regime?.gap?.gap ?? "gap"} — ${atmo.regime?.gap?.why ?? "not judged"}.`),
  );
  const W = 1000;
  const H = 220;
  const pad = 30;
  const max = Math.max(...frames.map((f) => f.microbits));
  const min = Math.min(...frames.map((f) => f.microbits));
  const x = (i) => pad + (i * (W - 2 * pad)) / Math.max(1, frames.length - 1);
  const y = (v) => H - 30 - ((v - min) * (H - 60)) / Math.max(1e-9, max - min);
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  if (regime?.regions) {
    for (const r of regime.regions) {
      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", x(r.start));
      rect.setAttribute("y", 10);
      rect.setAttribute("width", Math.max(1, x(r.end ?? frames.length - 1) - x(r.start)));
      rect.setAttribute("height", H - 40);
      rect.setAttribute("class", "region");
      svg.appendChild(rect);
    }
  }
  const area = document.createElementNS(svgNS, "path");
  area.setAttribute("class", "basefill");
  area.setAttribute("d", `M ${x(0)} ${H - 30} ` + frames.map((f, i) => `L ${x(i)} ${y(f.microbits)}`).join(" ") + ` L ${x(frames.length - 1)} ${H - 30} Z`);
  svg.appendChild(area);
  const line = document.createElementNS(svgNS, "path");
  line.setAttribute("class", "trace");
  line.setAttribute("d", frames.map((f, i) => `${i ? "L" : "M"} ${x(i)} ${y(f.microbits)}`).join(" "));
  svg.appendChild(line);
  if (regime?.events) {
    for (const ev of regime.events) {
      if (ev.op === "REC") {
        const l = document.createElementNS(svgNS, "line");
        l.setAttribute("x1", x(ev.at));
        l.setAttribute("x2", x(ev.at));
        l.setAttribute("y1", 10);
        l.setAttribute("y2", H - 30);
        l.setAttribute("class", "rezero");
        const t = document.createElementNS(svgNS, "title");
        t.textContent = `REC · re-zero at frame ${ev.at} — ${ev.reason ?? "ground conceded"}`;
        l.appendChild(t);
        svg.appendChild(l);
      } else if (ev.op === "DEF") {
        const c = document.createElementNS(svgNS, "circle");
        c.setAttribute("cx", x(ev.at));
        c.setAttribute("cy", y(frames[ev.at]?.microbits ?? min));
        c.setAttribute("r", 3);
        c.setAttribute("class", "clearing");
        const t = document.createElementNS(svgNS, "title");
        t.textContent = `DEF · clearing at frame ${ev.at} (${ev.direction})`;
        c.appendChild(t);
        svg.appendChild(c);
      }
    }
  }
  const axis = document.createElementNS(svgNS, "text");
  axis.setAttribute("x", pad);
  axis.setAttribute("y", 20);
  axis.setAttribute("class", "axis");
  axis.textContent = `${max.toFixed(0)} microbits`;
  svg.appendChild(axis);
  const axis2 = document.createElementNS(svgNS, "text");
  axis2.setAttribute("x", pad);
  axis2.setAttribute("y", H - 12);
  axis2.setAttribute("class", "axis");
  axis2.textContent = `${min.toFixed(0)}`;
  svg.appendChild(axis2);
  svg.addEventListener("click", (evd) => {
    const rect = svg.getBoundingClientRect();
    const px = ((evd.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - pad) / (W - 2 * pad)) * (frames.length - 1));
    const f = frames[Math.max(0, Math.min(frames.length - 1, i))];
    if (!f || f.byteStart == null) return;
    const r = byteRangeToChars(f.byteStart, f.byteEnd);
    if (r) {
      state.sel = null;
      state.focus = { ...r, why: `frame ${f.i} · bytes ${f.byteStart}–${f.byteEnd}` };
      state.terrain = "Field";
      renderAll();
    }
  });
  const box = el("div", "atmo");
  box.appendChild(svg);
  box.appendChild(el("div", "surface-note", "click the trace to descend to that frame's bytes in Field — every altitude reaches the rows beneath it"));
  surface.appendChild(box);
}

// ---- Kind — Existence·Pattern: induced structure, armed -------------------
function renderKind(surface) {
  if (!TEXTUAL.has(state.source?.modality ?? "")) {
    return gapFace(surface, "not-present", "kinds are induced over admitted records; a binary source admits none.");
  }
  if (!state.kinds && !state.kindsPhase) {
    // The plain register first; the formal numbers descend from it behind a
    // disclosure (IV.5 — the register is the reader's).
    const records = state.read?.terrains?.Field?.unitsTotal;
    const what = el("div", "kind-intro");
    what.appendChild(el("h3", null, "Are there kinds in here?"));
    what.appendChild(
      el(
        "div",
        "para",
        `This looks for groups that keep keeping company — ${records ? `across the ${records.toLocaleString()} pieces this source was admitted as` : "across this source's pieces (or a table's rows)"}, pieces that share unusually many of the same words get gathered into a "kind". ` +
          "It is pure statistics: no model, no labels, and it can be wrong in one specific way — it sometimes conjures a group out of nothing. " +
          "So after the search, the same search runs again on a scrambled copy of this same material, where no real groups can exist. Whatever it “finds” there is what a false kind looks like here, and it is shown next to the real result.",
      ),
    );
    surface.appendChild(what);
    const row = el("div", "run-row");
    const quick = el("button", null, "look · quick");
    quick.title = "seconds to minutes";
    const thorough = el("button", null, "look · thorough");
    thorough.title = "much longer — stricter gates, five scrambles instead of one";
    quick.onclick = () => startKinds(true);
    thorough.onclick = () => startKinds(false);
    row.appendChild(quick);
    row.appendChild(thorough);
    surface.appendChild(row);

    const details = el("details", "kind-declared");
    const summary = el("summary", null, "the declared numbers behind those two buttons");
    details.appendChild(summary);
    const tbl = el("table", "ledger");
    const head = el("tr");
    for (const h of ["setting", "quick", "thorough", "what it means"]) head.appendChild(el("th", null, h));
    tbl.appendChild(head);
    const rows = [
      ["a word counts if it appears in…", "3 in 100 pieces", "2 in 100 pieces", "rarer words are noise at this population size (minPrevalence)"],
      ["smallest group callable a kind", "5 pieces", "8 pieces", "below this, no claim is made (minKindSize)"],
      ["shuffles behind each internal check", "20", "50", "how a candidate group earns its “key” mark (permutations)"],
      ["independent search restarts", "2", "2", "the engine's own floor — one lucky start proves nothing (reseeds)"],
      ["scrambled full re-runs afterwards", "1", "5", "the false-kind demonstration above; with 1 the result can only be said as “the scramble found kinds or it didn't”, with 5 as a count out of 5 (null arm draws)"],
    ];
    for (const r of rows) {
      const tr = el("tr");
      for (const c of r) tr.appendChild(el("td", null, c));
      tbl.appendChild(tr);
    }
    details.appendChild(tbl);
    details.appendChild(
      el("div", "surface-note", "these are declared starting points, not measured constants — their givers are named in the legend"),
    );
    surface.appendChild(details);
    return;
  }
  if (state.kindsPhase && !state.kinds) {
    gapFace(surface, "running", `the induction is running (${state.kindsPhase}) — kinds appear as soon as the pipeline returns; the null arm lands after.`);
    return;
  }

  const K = state.kinds;
  if (K.gap) {
    gapFace(surface, K.gap.silence ?? K.gap.reason ?? "gap", K.gap.detail ?? "");
    const again = el("button", null, "clear and choose another setting");
    again.onclick = () => {
      state.kinds = null;
      state.kindsArm = null;
      renderAll();
    };
    surface.appendChild(again);
    return;
  }
  // The quick draw now runs itself, so the stricter one needs a door that is
  // always here rather than only on the pre-run screen nobody sees any more.
  if (state.kindsOpts?.quick !== false) {
    const bar = el("div", "field-bar");
    bar.appendChild(el("span", "bar-gap"));
    const thorough = el("button", "field-act", "look again · thorough");
    thorough.title = "stricter gates and five scrambles instead of one — much longer";
    thorough.onclick = () => {
      state.kinds = null;
      state.kindsArm = null;
      startKinds(false);
    };
    bar.appendChild(thorough);
    surface.appendChild(bar);
  }

  const arm = state.kindsArm;
  // The arm banner: its sentence is BUILT from draws/drawsWithKinds —
  // natural frequencies, never a probability the draw count cannot support.
  const banner = el("div", `arm-banner ${arm ? (arm.drawsWithKinds === 0 ? "clean" : "") : "pending"}`);
  if (!arm) {
    banner.append("Null arm pending — the same pipeline is re-running on redealt copies of this population. Until it lands, every kind below is ");
    banner.appendChild(el("span", "standing provisional", "provisional"));
    banner.append(" (FOLD-CONSTITUTION II.12).");
  } else if (arm.ran) {
    banner.append(`The same pipeline ran on ${arm.draws} redealt cop${arm.draws === 1 ? "y" : "ies"} of this population (marginals preserved, co-occurrence destroyed); ${arm.drawsWithKinds} of ${arm.draws} produced kinds. `);
    banner.appendChild(el("span", "rank", `finest rank sayable: ${arm.finestRank}`));
    if (arm.drawsWithKinds > 0) {
      banner.append(" — that is what fabrication looks like on this population; read the kinds below accordingly. They remain ");
      banner.appendChild(el("span", "standing provisional", "provisional"));
      banner.append(".");
    }
  } else {
    banner.append(`Null arm did not run: ${arm.reason} — every kind below is `);
    banner.appendChild(el("span", "standing provisional", "provisional"));
    banner.append(".");
  }
  surface.appendChild(banner);

  const pieces = K.segmentation === "chunks" ? "pieces of this source" : `${K.segmentation} rows`;
  note(
    surface,
    arm && arm.ran && arm.drawsWithKinds === 0 ? "shown" : "provisional",
    `${K.kinds.length === 0 ? "no kind" : K.kinds.length === 1 ? "1 kind" : `${K.kinds.length} kinds`} found among ${K.recordCount.toLocaleString()} ${pieces}` +
      (K.formFloor ? ` · ${K.formFloor.admittedForms.toLocaleString()} of ${K.formFloor.candidateForms.toLocaleString()} distinct words cleared the appearance floor` : ""),
  );
  if (K.kinds.length === 0) {
    gapFace(surface, "computed-and-empty", "the search ran and gathered no group that cleared the declared gates. An empty result is a result — nothing kept enough company here to call a kind.");
  }

  const box = el("div", "kinds");
  const maxSize = Math.max(...K.kinds.map((k) => k.size), 1);
  for (const k of K.kinds) {
    const row = el("div", "kind-row");
    const head = el("button", "kind-head");
    head.appendChild(el("span", "lbl", k.label));
    const bar = el("span", "bar");
    const fill = el("i");
    fill.style.width = `${(100 * k.size) / maxSize}%`;
    fill.style.opacity = String(0.35 + 0.65 * (k.cohesion ?? 0));
    bar.appendChild(fill);
    head.appendChild(bar);
    head.appendChild(el("span", "n", `${k.size} · coh ${k.cohesion?.toFixed(2) ?? "—"}`));
    if (k.ground) head.appendChild(el("span", `grd${k.ground === "key" ? " key" : ""}`, k.ground));
    head.onclick = () => {
      state.expandedKind = state.expandedKind === k.label ? null : k.label;
      renderAll();
    };
    row.appendChild(head);
    if (state.expandedKind === k.label) {
      const body = el("div", "kind-body");
      body.appendChild(el("div", null, `core: ${(k.core ?? []).join(", ") || "—"}`));
      if (k.existence_p != null || k.constraint_p != null) {
        body.appendChild(el("div", "muted", `internal gates — existence p ${k.existence_p ?? "—"}, constraint p ${k.constraint_p ?? "—"} (the arm above is the outer, per-population null)`));
      }
      const members = el("div", "members");
      for (const m of k.members.slice(0, 200)) {
        const b = el("button", null, m);
        b.onclick = () => {
          const i = Number(String(m).replace(/^u/, ""));
          if (K.segmentation === "chunks") {
            const unit = state.read?.terrains?.Field?.units?.[i];
            if (unit) {
              const r = byteRangeToChars(unit.byteStart, unit.byteEnd);
              state.sel = null;
              state.focus = r ? { ...r, why: `${k.label} ▸ ${m}` } : null;
              state.terrain = "Field";
              renderAll();
              return;
            }
          }
          state.sel = { type: "member", label: `${k.label} ▸ ${m}`, row: i };
          state.terrain = "Field";
          renderAll();
        };
        members.appendChild(b);
      }
      if (k.members.length > 200) members.appendChild(el("span", "muted", `+${k.members.length - 200} more not drawn`));
      body.appendChild(members);
      row.appendChild(body);
    }
    box.appendChild(row);
  }
  surface.appendChild(box);
  if (state.kindsPhase && !arm) surface.appendChild(el("div", "phase-line", `null arm: ${state.kindsPhase}…`));
}

async function startKinds(quick) {
  state.kindsPhase = "queued";
  renderAll();
  const startedFor = state.path;
  const { jobId, opts } = await api("/api/kinds", { method: "POST", body: JSON.stringify({ path: state.path, quick }) });
  state.kindsOpts = opts;
  const tick = async () => {
    if (state.path !== startedFor) return;
    const job = await api(`/api/jobs/${jobId}`);
    if (state.path !== startedFor) return;
    state.kindsPhase = job.phase;
    if (job.result && !state.kinds) state.kinds = job.result;
    if (job.nullArm) state.kindsArm = job.nullArm;
    if (job.phase === "done") {
      state.kindsPhase = null;
      if (job.result?.gap) state.kinds = job.result;
      renderAll();
      return;
    }
    if (job.phase === "error") {
      state.kindsPhase = null;
      state.kinds = { gap: { reason: "kinds_failed", detail: job.error?.message }, kinds: [] };
      renderAll();
      return;
    }
    renderAll();
    setTimeout(tick, 900);
  };
  tick();
}

// ---- Void — Existence·Ground: the gap ledger ------------------------------
function renderVoid(surface) {
  const T = readGate(surface, "Void");
  if (!T) return;
  const ledger = T.Void.ledger;
  note(surface, "shown", `every typed gap this read produced, organ-tagged — what is absent, drawn rather than omitted. An empty result and an unrun computation are different marks and stay different here.`);
  if (!ledger.length) return gapFace(surface, "computed-and-empty", "the organs reported no gaps on this read.");
  const tbl = el("table", "ledger");
  const head = el("tr");
  for (const h of ["terrain", "silence / reason", "organ", "detail"]) head.appendChild(el("th", null, h));
  tbl.appendChild(head);
  for (const g of ledger) {
    const tr = el("tr");
    tr.appendChild(el("td", "terrain", g.terrain));
    tr.appendChild(el("td", "silence", g.silence ?? g.reason ?? g.gap ?? "—"));
    tr.appendChild(el("td", "organ", g.organ ?? ""));
    tr.appendChild(el("td", null, g.detail ?? g.why ?? ""));
    tbl.appendChild(tr);
  }
  surface.appendChild(tbl);
}

// ---- Lens — Interpretation·Figure: saved views ----------------------------
function renderLens(surface) {
  note(surface, "received", "a projection is spun up by a reader — a way of looking, saved: this source, through this surface, filtered thus, as of then. Never extracted from content; each names its giver, its cursor (asOf), and what it excludes.");
  const row = el("div", "run-row");
  const nameInput = el("input");
  nameInput.placeholder = "name this projection — you are its giver";
  nameInput.disabled = !state.source;
  const save = el("button", null, "save the current view");
  save.disabled = !state.source;
  save.onclick = () => {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return;
    }
    state.lenses.push({
      name,
      giver: "you",
      asOf: new Date().toISOString(),
      state: { path: state.path, terrain: state.lastContentTerrain ?? "Field", sel: state.sel, focus: state.focus, expandedKind: state.expandedKind },
      excludes: state.sel ? `filtered to ${state.sel.label}` : "nothing — unfiltered",
    });
    localStorage.setItem("fold-explore-lenses", JSON.stringify(state.lenses));
    renderAll();
  };
  row.appendChild(nameInput);
  row.appendChild(save);
  surface.appendChild(row);
  if (!state.lenses.length) return gapFace(surface, "not-present", "no projection has been spun up yet. This surface is blind to its own contingency — so is an empty one.");
  const box = el("div", "lenses");
  for (const [i, lens] of state.lenses.entries()) {
    const r = el("div", "lens-row");
    const open = el("button", "linkish", lens.name);
    open.style.fontSize = "13px";
    open.onclick = async () => {
      await openSource(lens.state.path, { keepTerrain: true });
      state.terrain = lens.state.terrain;
      state.sel = lens.state.sel;
      state.focus = lens.state.focus;
      state.expandedKind = lens.state.expandedKind;
      renderAll();
    };
    r.appendChild(open);
    r.appendChild(el("span", "giver", `giver: ${lens.giver} · asOf ${lens.asOf.slice(0, 16)}Z · excludes: ${lens.excludes}`));
    r.appendChild(el("span", "spacer"));
    const del = el("button", null, "forget");
    del.onclick = () => {
      state.lenses.splice(i, 1);
      localStorage.setItem("fold-explore-lenses", JSON.stringify(state.lenses));
      renderAll();
    };
    r.appendChild(del);
    box.appendChild(r);
  }
  surface.appendChild(box);
}

// ---- Paradigm — Interpretation·Pattern: the frame itself ------------------
function renderParadigm(surface) {
  const T = readGate(surface, "Paradigm");
  if (!T) return;
  const P = T.Paradigm;
  note(surface, "received", `the frame that says how to read everything else — ${P.received.giver}`);
  const box = el("div", "paradigm");
  box.appendChild(el("h3", null, "The nine terrains"));
  const tbl = el("table");
  const head = el("tr");
  for (const h of ["terrain", "cell", "blind to", "depends on"]) head.appendChild(el("th", null, h));
  tbl.appendChild(head);
  for (const c of P.grid) {
    const tr = el("tr");
    tr.appendChild(el("td", "t", c.terrain));
    tr.appendChild(el("td", "mono", `${c.domain} · ${c.grain}`));
    tr.appendChild(el("td", null, c.blindTo ?? ""));
    tr.appendChild(el("td", "mono", (c.dependsOn ?? []).join(" + ") || "—"));
    tbl.appendChild(tr);
  }
  box.appendChild(tbl);
  box.appendChild(el("h3", null, "Declared numbers, with their givers"));
  const tbl2 = el("table");
  const head2 = el("tr");
  for (const h of ["name", "value", "giver"]) head2.appendChild(el("th", null, h));
  tbl2.appendChild(head2);
  for (const d of P.declared) {
    const tr = el("tr");
    tr.appendChild(el("td", "mono", d.name));
    tr.appendChild(el("td", "mono", String(d.value)));
    tr.appendChild(el("td", null, d.giver));
    tbl2.appendChild(tr);
  }
  if (state.kindsOpts) {
    for (const [k, v] of Object.entries(state.kindsOpts)) {
      const tr = el("tr");
      tr.appendChild(el("td", "mono", `kinds.${k}`));
      tr.appendChild(el("td", "mono", String(v)));
      tr.appendChild(el("td", null, "this run's declared induction setting (see Kind)"));
      tbl2.appendChild(tr);
    }
  }
  box.appendChild(tbl2);
  box.appendChild(el("h3", null, "What this instrument refuses"));
  const refuse = el("div", "surface-note");
  refuse.textContent = P.received.note;
  box.appendChild(refuse);
  surface.appendChild(box);
  $("engine-line").textContent = `engine: corpus API ${P.engine.corpusApiVersion}`;
}

// ── appearance: follow the system, or say ───────────────────────────────────
const THEMES = [
  ["system", "◐ system"],
  ["light", "☀ light"],
  ["dark", "☾ dark"],
];
function applyTheme() {
  const mode = localStorage.getItem("fold-theme") ?? "system";
  if (mode === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", mode);
  const btn = $("theme-toggle");
  if (btn) btn.textContent = THEMES.find(([m]) => m === mode)[1];
  return mode;
}
$("theme-toggle").onclick = () => {
  const mode = localStorage.getItem("fold-theme") ?? "system";
  const next = THEMES[(THEMES.findIndex(([m]) => m === mode) + 1) % THEMES.length][0];
  localStorage.setItem("fold-theme", next);
  applyTheme();
};
applyTheme();

// ── the record dialog ───────────────────────────────────────────────────────
$("record-toggle").onclick = async () => {
  const tail = await api("/api/record?tail=80");
  $("record-tail").textContent = tail.tail.join("\n") || "(empty)";
  $("open-record-file").onclick = () => {
    $("record-dialog").close();
    openSource(tail.path);
  };
  $("record-dialog").showModal();
};

// ── render root ─────────────────────────────────────────────────────────────
function renderAll() {
  renderHeaderline();
  renderViews();
  renderMeta();
  renderSurface();
}

// ── boot ────────────────────────────────────────────────────────────────────
(async function boot() {
  // This module reached its own boot, so the page is served and its scripts
  // resolved — which is exactly what the not-served banner claims did not
  // happen. It is governed by the one fact that matters: did this file run.
  document.getElementById("not-served")?.remove();
  const q = new URLSearchParams(location.search);
  if (q.get("embed")) {
    // Inside the Converse pane: the host page carries the chrome.
    document.body.classList.add("embed");
  }
  // The sidebar collapses everywhere, not just in the pane — and the
  // choice is remembered, because a reader who hid it once meant it.
  // Narrow viewports start collapsed (the rail would eat the stage), but
  // an explicit choice still wins over that default.
  const railToggle = $("rail-toggle");
  const narrowQuery = matchMedia("(max-width: 820px)");
  const markNarrow = () => document.body.classList.toggle("narrow-rail", narrowQuery.matches);
  markNarrow();
  narrowQuery.addEventListener("change", markNarrow); // a resized window is a new answer
  const narrow = narrowQuery.matches;
  const savedRail = localStorage.getItem("fold-explore-rail");
  const applyRail = (open) => {
    document.body.classList.toggle("rail-collapsed", !open);
    railToggle.setAttribute("aria-expanded", String(open));
    railToggle.title = open ? "hide the sidebar" : "show the sidebar";
  };
  applyRail(savedRail === null ? !narrow : savedRail === "open");
  railToggle.onclick = () => {
    const nowOpen = document.body.classList.contains("rail-collapsed");
    applyRail(nowOpen);
    localStorage.setItem("fold-explore-rail", nowOpen ? "open" : "closed");
  };
  await renderRecents();
  renderFilesNav();
  markCurrentInRail();
  const src = q.get("src");
  if (src) {
    state.pendingFocus = {
      b0: q.get("b0") != null ? Number(q.get("b0")) : null,
      b1: q.get("b1") != null ? Number(q.get("b1")) : null,
      c0: q.get("c0") != null ? Number(q.get("c0")) : null,
      c1: q.get("c1") != null ? Number(q.get("c1")) : null,
    };
    await openSource(src);
    // For char refs the text is enough — apply before the read lands too.
    if (state.pendingFocus?.c0 != null && state.text != null) applyPendingFocus();
  } else {
    renderAll();
  }
})();

document.addEventListener("keydown", (e) => {
  if (e.target.closest("input, textarea, dialog")) return;

  // The preview owns the keyboard while it is up — Esc out, arrows through the
  // folder. Nothing behind it hears these keys, so a number cannot switch the
  // view out from under a file you are looking at.
  if (state.pv) {
    if (e.key === "Escape") {
      e.preventDefault();
      closePreview();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      pvStep(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      pvStep(1);
    }
    return;
  }

  // On the files view: Enter/Space open what is selected (the desk's own
  // gesture, and the one every file manager has), Esc drops the selection.
  if (showingDesk() && state._desk) {
    const chosen = [...state.deskSel].map((p) => state._desk.byPath.get(p)).filter(Boolean);
    if ((e.key === "Enter" || e.key === " ") && chosen.length === 1) {
      e.preventDefault();
      state._desk.preview(chosen[0]);
      return;
    }
    if (e.key === "Escape" && state.deskSel.size) {
      e.preventDefault();
      state.deskSel = new Set();
      state._desk.paint();
      return;
    }
    // Arrows walk the listing, wrapping at neither end — a selection is a
    // place, and there is nothing past the last file.
    if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "ArrowDown" || e.key === "ArrowUp") {
      const list = state._desk.entries();
      if (!list.length) return;
      e.preventDefault();
      const at = list.findIndex((x) => state.deskSel.has(x.path));
      const per = surfaceTilesPerRow();
      const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : e.key === "ArrowDown" ? per : -per;
      const next = at < 0 ? 0 : Math.min(list.length - 1, Math.max(0, at + step));
      state.deskSel = new Set([list[next].path]);
      state._desk.paint();
      document.querySelector(`[data-path="${CSS.escape(list[next].path)}"]`)?.scrollIntoView({ block: "nearest" });
      return;
    }
  }

  // Number keys walk the row as it is drawn, so a key names the same view
  // whether or not the read has finished — the row's stability is the point.
  // A key on a surface that hasn't landed does nothing rather than jumping
  // the reader somewhere they did not aim for.
  const n = Number(e.key);
  const views = visibleViews();
  if (n >= 1 && n <= views.length && !views[n - 1].pending) {
    state.terrain = views[n - 1].id;
    renderAll();
  }
});

/** How many tiles a row actually holds right now — measured off the grid, not
 *  assumed, so ↓ lands one row down at every window width (and in list view,
 *  where a "row" is one entry). */
function surfaceTilesPerRow() {
  const grid = document.querySelector(".tiles");
  if (!grid) return 1;
  const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length;
  return Math.max(1, cols);
}
