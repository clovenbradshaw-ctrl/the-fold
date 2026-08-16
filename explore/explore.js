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

// ── the rail ────────────────────────────────────────────────────────────────
async function loadTree(container, relPath, depth = 0) {
  const listing = await api(`/api/tree?path=${encodeURIComponent(relPath)}`);
  const frag = document.createDocumentFragment();
  for (const entry of listing.entries) {
    const row = el("button", "tree-entry");
    row.style.paddingLeft = `${8 + depth * 14}px`;
    row.appendChild(el("span", "twist", entry.dir ? "▸" : ""));
    row.appendChild(el("span", "nm", entry.name));
    if (!entry.dir) row.appendChild(el("span", "sz", fmtBytes(entry.size)));
    row.dataset.path = entry.path;
    if (entry.dir) {
      let open = false;
      let sub = null;
      row.onclick = async () => {
        open = !open;
        row.querySelector(".twist").textContent = open ? "▾" : "▸";
        if (open && !sub) {
          sub = el("div");
          row.after(sub);
          await loadTree(sub, entry.path, depth + 1);
        } else if (sub) sub.hidden = !open;
      };
    } else {
      row.onclick = () => openSource(entry.path);
    }
    frag.appendChild(row);
  }
  container.appendChild(frag);
  if (listing.truncated) {
    container.appendChild(el("div", "rail-note", `${listing.shown} of ${listing.total} entries shown — ${listing.total - listing.shown} not listed (page cap)`));
  }
  return listing;
}

function markCurrentInRail() {
  for (const b of document.querySelectorAll(".tree-entry")) b.classList.toggle("current", b.dataset.path === state.path);
}

// ── opening a source ────────────────────────────────────────────────────────
const TEXTUAL = new Set(["text", "code", "markdown", "json", "table", "html"]);

async function openSource(relPath, opts = {}) {
  state.path = relPath;
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

  state.source = await api(`/api/source?path=${encodeURIComponent(relPath)}`);
  renderHeaderline();

  if (TEXTUAL.has(state.source.modality)) {
    const raw = await fetch(`/api/raw?path=${encodeURIComponent(relPath)}`);
    state.text = await raw.text();
    state.bcIndex = byteCharIndex(state.text);
    startRead(); // the read is the point of this instrument; kinds never auto-runs
  }
  renderAll();
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
    box.appendChild(el("span", "muted", state.browseDir ? `browsing ${state.browseDir}` : "no source in focus — browse below, or pick from the rail"));
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
  box.appendChild(el("span", "name", ` ${s.name}`));
  box.appendChild(el("span", "meta", `${fmtBytes(s.bytes)} · ${s.modality}${s.magic ? ` (${s.magic})` : ""} · modified ${new Date(s.mtime).toISOString().slice(0, 10)} · cursor: read at ${new Date().toISOString().slice(11, 19)}Z`));
  // Inside the Converse pane, a source can be handed to the chat as
  // material — the request crosses the frame; the chat side owns what it
  // does with it (and its own mute/unmute strip).
  if (document.body.classList.contains("embed") && TEXTUAL.has(s.modality) && state.text != null) {
    const toChat = el("button", null, "use in chat");
    toChat.style.marginLeft = "10px";
    toChat.onclick = () => {
      parent.postMessage({ type: "fold:material:add", name: s.name, path: state.path, text: state.text }, "*");
      toChat.textContent = "sent to chat ✓";
      toChat.disabled = true;
    };
    box.appendChild(toChat);
  }
}

// ── the views ───────────────────────────────────────────────────────────────
// No map, no grid: each surface reveals itself when it has something to
// show, as a quiet word in a row. The nine-fold canon behind them lives in
// the legend for whoever wants it — it never fronts the instrument.
const VIEW_LABEL = {
  Field: "source",
  Entity: "cast",
  Link: "relations",
  Network: "graph",
  Atmosphere: "trace",
  Kind: "kinds",
  Void: "gaps",
  Lens: "projections",
  Paradigm: "legend",
};

/** The views that have earned a place right now, in reveal order, with counts. */
function visibleViews() {
  const T = state.read?.terrains;
  const out = [];
  if (state.source) out.push({ id: "Field" });
  if (T?.Entity?.referents?.length) out.push({ id: "Entity", n: T.Entity.referents.length });
  if (T?.Link?.total) out.push({ id: "Link", n: T.Link.total });
  if (T?.Network?.nodeCount) out.push({ id: "Network", n: T.Network.nodeCount });
  if (T?.Atmosphere?.frames?.length) out.push({ id: "Atmosphere" });
  if (T?.Kind && TEXTUAL.has(state.source?.modality ?? "")) out.push({ id: "Kind", n: state.kinds?.kinds?.length });
  if (T?.Void?.ledger?.length) out.push({ id: "Void", n: T.Void.ledger.length });
  if (state.source) out.push({ id: "Lens", n: state.lenses.length || undefined });
  if (T?.Paradigm) out.push({ id: "Paradigm" });
  return out;
}

function renderViews() {
  const box = $("views");
  box.textContent = "";
  const views = visibleViews();
  // If the active view lost its ground (new source), fall back to the source itself.
  if (!views.some((v) => v.id === state.terrain)) state.terrain = "Field";
  for (const v of views) {
    const b = el("button", `view${v.id === state.terrain ? " active" : ""}`);
    b.setAttribute("role", "tab");
    b.append(VIEW_LABEL[v.id]);
    if (v.n != null) b.appendChild(el("span", "n", String(v.n)));
    const c = cellOf(v.id);
    if (c?.blindTo) b.title = `blind to ${c.blindTo}`;
    b.onclick = () => {
      state.terrain = v.id;
      renderAll();
    };
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
    chip.append(`${state.sel.label} · ${state.sel.type}`);
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
      relation: ["Field", "Link", "Network"],
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
function note(surface, standing, text) {
  const n = el("div", "surface-note");
  const s = el("span", `standing ${standing}`, standing);
  n.appendChild(s);
  n.append(text);
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
    const line = el("button", "fold-line", l.text.length > 400 ? `${l.text.slice(0, 399)}…` : l.text);
    line.title = `chars ${l.charStart}–${l.charEnd} · ${l.microbits.toFixed(0)} microbits — click to land there in the source`;
    line.onclick = () => {
      state.focus = { c0: l.charStart, c1: l.charEnd, why: "fold line" };
      state.terrain = "Field";
      renderAll();
    };
    card.appendChild(line);
  }
  card.appendChild(el("div", "fold-foot", "verbatim lines in document order, each at its address — a change of resolution, not a paraphrase"));
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

function renderSurface() {
  const surface = $("surface");
  surface.textContent = "";
  // A lens restores the view it was saved FROM — saving while looking at the
  // lens list must not save "the lens list" as the destination.
  if (state.terrain !== "Lens") state.lastContentTerrain = state.terrain;
  if (!state.source) {
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

async function renderBrowse(surface) {
  const dir = state.browseDir ?? "";
  const listing = await api(`/api/tree?path=${encodeURIComponent(dir)}`);
  if ((state.browseDir ?? "") !== dir || state.source) return; // navigated away while fetching

  const crumbs = el("div", "desk-crumbs");
  const rootBtn = el("button", "linkish", "3.0");
  rootBtn.onclick = () => {
    state.browseDir = "";
    renderAll();
  };
  crumbs.appendChild(rootBtn);
  let walked = "";
  for (const part of dir.split("/").filter(Boolean)) {
    walked = walked ? `${walked}/${part}` : part;
    crumbs.appendChild(el("span", "sep", " / "));
    const b = el("button", "linkish", part);
    const target = walked;
    b.onclick = () => {
      state.browseDir = target;
      renderAll();
    };
    crumbs.appendChild(b);
  }
  surface.appendChild(crumbs);

  const grid = el("div", "tiles");
  if (dir) {
    const up = el("button", "tile dir");
    up.appendChild(el("span", "glyph", "↩"));
    up.appendChild(el("span", "nm", ".."));
    up.onclick = () => {
      state.browseDir = dir.split("/").slice(0, -1).join("/");
      renderAll();
    };
    grid.appendChild(up);
  }
  for (const entry of listing.entries) {
    const tile = el("button", `tile${entry.dir ? " dir" : ""}`);
    tile.appendChild(el("span", "glyph", entry.dir ? "▸" : glyphOf(entry.name)));
    tile.appendChild(el("span", "nm", entry.name));
    if (!entry.dir && entry.size != null) tile.appendChild(el("span", "sz", fmtBytes(entry.size)));
    tile.onclick = () => {
      if (entry.dir) {
        state.browseDir = entry.path;
        renderAll();
      } else openSource(entry.path);
    };
    grid.appendChild(tile);
  }
  surface.appendChild(grid);
  if (listing.truncated) {
    surface.appendChild(el("div", "surface-note", `${listing.shown} of ${listing.total} entries shown — ${listing.total - listing.shown} beyond the page cap not drawn`));
  }
}

// ---- Field — Structure·Ground: the raw layout, zero inference -------------
function renderField(surface) {
  const s = state.source;
  if (TEXTUAL.has(s.modality) && state.text != null) {
    note(surface, "shown", `the bytes as they sit on disk, decoded as UTF-8 — nothing interpreted. ${s.bytes.toLocaleString()} bytes.`);
    const foldRow = el("div", "run-row");
    const foldBtn = el("button", null, state.focus ? "fold this range" : "fold the source");
    foldBtn.title = "an extractive summary: the most novel sentences here, verbatim and addressed — no model";
    foldBtn.onclick = () => requestFold(state.focus ? { c0: state.focus.c0, c1: state.focus.c1 } : {});
    foldRow.appendChild(foldBtn);
    surface.appendChild(foldRow);
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
    for (const sec of outline.sections) {
      const b = el("button", null, sec.label || `§${sec.index + 1}`);
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
  main.appendChild(doc);
  wrap.appendChild(main);
  surface.appendChild(wrap);
  doc.querySelector("mark")?.scrollIntoView({ block: "center" });
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
  const toggle = el("button", null, state.mdRaw ? "view rendered" : "view raw");
  toggle.onclick = () => {
    if (state.mdRaw) {
      state.mdRaw = false;
      state.focus = null; // the rendered face cannot hold a byte address
    } else state.mdRaw = true;
    renderAll();
  };
  surface.appendChild(toggle);
  if (state.mdRaw) {
    const doc = el("div", "doc mono");
    fillDocWithMarks(doc, state.text);
    surface.appendChild(doc);
    doc.querySelector("mark")?.scrollIntoView({ block: "center" });
    return;
  }
  const holder = el("div", "md");
  // The selection's surfaces get marked inside the rendered prose — the
  // decorator hook exists for exactly this (the same seam the chat uses for
  // its address chips). Fence content stays verbatim and unmarked.
  const needles = (state.sel?.surfaces ?? []).map((s) => String(s).toLowerCase()).filter((s) => s.length >= 2);
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

  const lines = state.text.split(/\r\n|\n/);
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
  surface.appendChild(holder);
  holder.querySelector("mark")?.scrollIntoView({ block: "center" });
}

function renderTableField(surface) {
  const ROW_CAP = 500; // display cap; the drop is counted next to the table
  const delim = state.source.delimiter ?? ",";
  const rows = [];
  let cur = [""];
  let inQ = false;
  const text = state.text;
  for (let i = 0; i < text.length && rows.length <= ROW_CAP; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur[cur.length - 1] += '"';
          i++;
        } else inQ = false;
      } else cur[cur.length - 1] += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === delim) cur.push("");
    else if (ch === "\n" || (ch === "\r" && text[i + 1] === "\n")) {
      if (ch === "\r") i++;
      rows.push(cur);
      cur = [""];
    } else cur[cur.length - 1] += ch;
  }
  if (cur.length > 1 || cur[0]) rows.push(cur);
  const totalLines = (text.match(/\n/g)?.length ?? 0) + 1;
  const shown = rows.length - 1;
  note(surface, "shown", `rows as delimited on disk · showing ${Math.min(shown, ROW_CAP).toLocaleString()} of ${(totalLines - 1).toLocaleString()} data rows${totalLines - 1 > ROW_CAP ? ` — ${(totalLines - 1 - ROW_CAP).toLocaleString()} beyond the display cap not shown` : ""}`);
  const tbl = el("table", "tbl");
  const [head, ...body] = rows;
  const trh = el("tr");
  for (const h of head ?? []) trh.appendChild(el("th", null, h));
  tbl.appendChild(trh);
  body.slice(0, ROW_CAP).forEach((r, i) => {
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
    const card = el("button", `card${state.sel?.type === "referent" && state.sel.label === r.display ? " sel" : ""}`);
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
function renderLink(surface) {
  const T = readGate(surface, "Link");
  if (!T) return;
  const { relations, total, truncated } = T.Link;
  if (!total) return gapFace(surface, "computed-and-empty", "the relation ladder ran and stated zero (subject, verb, object) triples.");
  let shown = relations;
  let filterNote = "";
  if (state.sel?.type === "referent" || state.sel?.type === "node") {
    const needles = (state.sel.surfaces ?? [state.sel.label]).map((s) => s.toLowerCase());
    shown = relations.filter((t) => needles.some((n) => t.subject?.toLowerCase() === n || t.object?.toLowerCase() === n || t.subject?.toLowerCase().includes(n) || t.object?.toLowerCase().includes(n)));
    filterNote = ` · filtered by ${state.sel.label}: ${shown.length} of ${relations.length} match (rule: side equals or contains a surface, case-folded)`;
  }
  note(surface, "shown", `${total} triples stated (sessionRelations)${truncated ? ` · ${total - relations.length} beyond the response cap not shown` : ""}${filterNote}`);
  const box = el("div", "triples");
  for (const t of shown.slice(0, 400)) {
    const row = el("button", `triple${state.sel?.type === "relation" && state.sel.key === `${t.subject}|${t.verb}|${t.object}` ? " sel" : ""}`);
    row.appendChild(el("span", "s", t.subject));
    row.appendChild(el("span", "v", `—${t.verb}→`));
    row.appendChild(el("span", "o", t.object));
    if (t.polarity === "−" || t.polarity === "-") row.appendChild(el("span", "neg", "negated"));
    row.onclick = () => {
      state.sel = { type: "relation", label: `${t.subject} ${t.verb} ${t.object}`, key: `${t.subject}|${t.verb}|${t.object}`, surfaces: [t.subject, t.object] };
      renderAll();
    };
    box.appendChild(row);
  }
  if (shown.length > 400) box.appendChild(el("div", "surface-note", `${shown.length - 400} more not drawn (display cap)`));
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
      return [s, o].sort().join(" ");
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
    const pk = [s, o].sort().join(" ");
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
  const q = new URLSearchParams(location.search);
  if (q.get("embed")) {
    // Inside the Converse pane: the host page carries the chrome, the rail
    // folds behind a toggle, and picking a source closes it.
    document.body.classList.add("embed");
    const toggle = $("rail-toggle");
    toggle.hidden = false;
    toggle.onclick = () => document.body.classList.toggle("rail-open");
  }
  await loadTree($("tree"), "");
  $("tree-note").textContent = "folders first, then name — a declared rule";
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

// number keys walk the visible views, in their reveal order
document.addEventListener("keydown", (e) => {
  if (e.target.closest("input, textarea, dialog")) return;
  const n = Number(e.key);
  const views = visibleViews();
  if (n >= 1 && n <= views.length) {
    state.terrain = views[n - 1].id;
    renderAll();
  }
});
