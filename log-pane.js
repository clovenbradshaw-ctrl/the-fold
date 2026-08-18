// log-pane.js — the Log tab and the terminal drawer. Standalone on purpose:
// app.js owns the panes' switching and the terminal's own wiring; this file
// only fills #pane-log and toggles how #pane-terminal is SHOWN.
//
// LOG. The record (record/explore-record.jsonl) is the floor under every
// standing — append-only, one line per computed event, no cap, never
// truncated. This pane is its readable face: the same lines, newest first,
// filterable, lazy-loaded in batches, refreshed while you watch. Every line
// is auditable; the full file is exportable from the pane. Reading it is
// display, not computation; nothing here writes.
//
// TERMINAL AS DRAWER. The terminal is not a place, it is a second grammar —
// so it slides up OVER whatever tab you are on (ctrl+`, or the >_ button)
// instead of occupying a tab of its own. Same PTY session either way;
// app.js's command wiring is untouched.

const $id = (x) => document.getElementById(x);

// ── the record's readable face ──────────────────────────────────────────────
// The record lives on the Sources server. Same-origin first (one server can
// serve the whole app); the default explore port as fallback (the chat page
// may be served by plain serve.mjs, which has no API).
//
// Lazy loading: the first fetch gets the most recent BATCH_SIZE lines
// (tail=BATCH_SIZE). "Load older" fetches the next batch via offset.
// Every line in the file is accessible — no cap, full auditability.
const BATCH_SIZE = 100;

/** Fetch a batch of record lines. tail=N returns the last N (newest).
 *  offset=M returns lines starting at M from the start (for older batches).
 *  Returns {path, total, offset, tail: [...lines]} or null. */
async function fetchRecordBatch({ tail, offset } = {}) {
  for (const base of ["", "http://localhost:8812"]) {
    try {
      const params = new URLSearchParams();
      if (offset != null) params.set("offset", String(offset));
      if (tail != null) params.set("tail", String(tail));
      const qs = params.toString();
      const res = await fetch(`${base}/api/record${qs ? "?" + qs : ""}`);
      if (!res.ok) continue;
      return await res.json();
    } catch {
      /* try the next base */
    }
  }
  return null;
}

/** One record line, compacted for a row: every field the event carries,
 *  so no entry appears blank. Skips internal/bookkeeping fields and the
 *  event name itself (already shown in its own column). */
function summarizeEvent(e) {
  const skip = new Set(["event", "at", "ts"]);
  const parts = [];
  for (const [k, v] of Object.entries(e)) {
    if (skip.has(k)) continue;
    if (v === undefined || v === null) continue;
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    const short = s.length > 80 ? s.slice(0, 79) + "…" : s;
    parts.push(`${k}=${short}`);
    if (parts.length >= 6) break;
  }
  return parts.join("  ");
}

// A profile's field table caps its flattening — a pathological line still
// renders, and the raw line underneath always holds the whole of it.
const PROFILE_ROW_CAP = 40;

/** Flatten an event to [dotted.path, verbatim-string] rows: nested objects
 *  descend, arrays index, and every leaf stays String(v) — no reformatting. */
function flattenFields(v, path, rows) {
  if (v === null || typeof v !== "object") {
    rows.push([path, String(v)]);
    return;
  }
  const entries = Array.isArray(v) ? v.map((x, i) => [String(i), x]) : Object.entries(v);
  if (entries.length === 0) {
    rows.push([path, Array.isArray(v) ? "[]" : "{}"]);
    return;
  }
  for (const [k, child] of entries) flattenFields(child, path ? `${path}.${k}` : k, rows);
}

let logTimer = null;
// The profile in focus: {entry, raw} — a clicked row's event, opened whole.
// While one is open the pane shows it alone, with breadcrumbs back; the
// 5s refresh leaves it in peace (a profile being read must not repaint).
let logSel = null;

// Lazy-load state. Every line is in the file; we load batches and remember
// how far back we've gone. On refresh we re-fetch the top only, preserving
// the loaded window — a log you are watching should not lose its place.
let logLoaded = [];      // [{entry, raw}] — all loaded lines, newest first
let logOlderOffset = null; // next offset for "load older" (null = exhausted)
let logTotal = 0;        // total lines in the file
let logFilePath = "";    // the record file path

/** The row list is a fold of the file; the profile is the descent — every
 *  field of the line, and the line itself, verbatim, underneath. */
function renderLogProfile(holder, note) {
  const { entry, raw } = logSel;
  holder.textContent = "";

  const crumbs = document.createElement("div");
  crumbs.className = "log-crumbs";
  const back = document.createElement("button");
  back.type = "button";
  back.className = "linkish";
  back.textContent = "Log";
  back.onclick = () => {
    logSel = null;
    renderLogPane();
  };
  const sep = document.createElement("span");
  sep.textContent = " \u203a ";
  const here = document.createElement("span");
  here.className = "log-crumb-here";
  here.textContent = `${entry.event ?? "?"} \u00b7 ${(entry.at ?? "").replace("T", " ").slice(0, 19)}`;
  crumbs.append(back, sep, here);
  holder.appendChild(crumbs);

  const rows = [];
  flattenFields(entry, "", rows);
  const table = document.createElement("table");
  table.className = "log-tbl";
  const tbody = document.createElement("tbody");
  for (const [path, value] of rows.slice(0, PROFILE_ROW_CAP)) {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = path;
    const td = document.createElement("td");
    td.textContent = value;
    tr.append(th, td);
    tbody.appendChild(tr);
  }
  if (rows.length > PROFILE_ROW_CAP) {
    const tr = document.createElement("tr");
    tr.className = "log-tbl-more";
    const td = document.createElement("td");
    td.colSpan = 2;
    td.textContent = `+${rows.length - PROFILE_ROW_CAP} more fields \u2014 the raw line below holds them all`;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  holder.appendChild(table);

  const actions = document.createElement("div");
  actions.className = "log-actions";
  if (typeof entry.job === "string") {
    const jobBtn = document.createElement("button");
    jobBtn.type = "button";
    jobBtn.textContent = "all events of this job";
    jobBtn.onclick = () => {
      const f = $id("log-filter");
      if (f) f.value = entry.job;
      logSel = null;
      renderLogPane();
    };
    actions.appendChild(jobBtn);
  }
  if (typeof entry.path === "string") {
    const pathBtn = document.createElement("button");
    pathBtn.type = "button";
    pathBtn.textContent = "all events of this path";
    pathBtn.onclick = () => {
      const f = $id("log-filter");
      if (f) f.value = entry.path;
      logSel = null;
      renderLogPane();
    };
    actions.appendChild(pathBtn);
  }
  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.textContent = "copy the line";
  copyBtn.onclick = () => navigator.clipboard?.writeText(raw);
  actions.appendChild(copyBtn);
  holder.appendChild(actions);

  // The table is the face; the bytes are the descent, one click down.
  const det = document.createElement("details");
  det.className = "log-raw-wrap";
  const rawHead = document.createElement("summary");
  rawHead.className = "log-raw-head";
  rawHead.textContent = "the line as it sits in the record \u2014 the fields above are a fold of exactly this";
  const pre = document.createElement("pre");
  pre.className = "log-raw";
  pre.textContent = raw;
  det.append(rawHead, pre);
  holder.appendChild(det);

  note.textContent = "";
}

/** Render one record row into the holder. */
function appendLogRow(holder, { entry: e, raw }) {
  const row = document.createElement("div");
  row.className = "log-row";
  row.tabIndex = 0;
  row.title = "open this event";
  const t = document.createElement("span");
  t.className = "log-time";
  t.textContent = (e.at ?? "").slice(11, 19) || "\u2014";
  const ev = document.createElement("span");
  ev.className = `log-event${/error|gap/.test(e.event ?? "") ? " warn" : ""}`;
  ev.textContent = e.event ?? "?";
  const detail = document.createElement("span");
  detail.className = "log-detail";
  detail.textContent = summarizeEvent(e);
  row.append(t, ev, detail);
  const open = () => {
    logSel = { entry: e, raw };
    renderLogPane();
  };
  row.onclick = open;
  row.onkeydown = (kev) => {
    if (kev.key === "Enter") open();
  };
  holder.appendChild(row);
}

/** Parse raw lines into {entry, raw}, skipping unparseable lines. */
function parseLines(rawLines) {
  const out = [];
  for (const raw of rawLines ?? []) {
    try {
      out.push({ entry: JSON.parse(raw), raw });
    } catch {
      /* unparseable line still in file; this face cannot row it */
    }
  }
  return out;
}

/** Render the loaded rows, newest first, with a "load older" button
 *  and an export-all button at the bottom. */
function renderLogRows(holder, note, filter) {
  holder.textContent = "";
  const filtered = filter
    ? logLoaded.filter((l) => l.raw.toLowerCase().includes(filter))
    : logLoaded;
  for (const pair of filtered) {
    appendLogRow(holder, pair);
  }
  // "Load older" button
  if (logOlderOffset != null && logOlderOffset > 0) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "log-load-older";
    btn.textContent = `load older (${logOlderOffset} lines before the current view)`;
    btn.onclick = async () => {
      const offset = Math.max(logOlderOffset - BATCH_SIZE, 0);
      const body = await fetchRecordBatch({ offset, tail: BATCH_SIZE });
      if (!body) return;
      const older = parseLines(body.tail);
      older.reverse();
      logLoaded = [...logLoaded, ...older];
      logOlderOffset = offset;
      renderLogRows(holder, note, ($id("log-filter")?.value ?? "").trim().toLowerCase());
    };
    holder.appendChild(btn);
  }
  // Export button — downloads the full record as a .jsonl file
  if (logTotal > 0) {
    const exp = document.createElement("button");
    exp.type = "button";
    exp.className = "log-load-older";
    exp.textContent = `export full record (${logTotal} lines)`;
    exp.onclick = async () => {
      exp.textContent = "exporting\u2026";
      exp.disabled = true;
      const body = await fetchRecordBatch({ tail: logTotal });
      if (!body?.tail?.length) { exp.textContent = "export failed"; return; }
      const blob = new Blob([body.tail.join("\n") + "\n"], { type: "application/x-ndjson" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "explore-record.jsonl";
      a.click();
      URL.revokeObjectURL(a.href);
      exp.textContent = `export full record (${logTotal} lines)`;
      exp.disabled = false;
    };
    holder.appendChild(exp);
  }
  const loadedCount = logLoaded.length;
  const remaining = Math.max(logTotal - loadedCount, 0);
  const noteParts = [`${loadedCount} loaded`];
  if (remaining > 0) noteParts.push(`${remaining} older`);
  noteParts.push("newest first \u00b7 click a row for its profile \u00b7 full record exportable below");
  note.textContent = noteParts.join(" \u00b7 ") + (filter ? ` \u00b7 filter: "${filter}"` : "");
}

/** The main render. On first load, fetches the most recent BATCH_SIZE lines.
 *  On refresh (5s timer), re-fetches only the top to pick up new entries
 *  without losing the loaded window or scroll position. Filter changes
 *  re-render from what is already loaded. */
async function renderLogPane() {
  const pane = $id("pane-log");
  if (!pane) return;
  const holder = $id("log-lines");
  const note = $id("log-note");
  if (!holder) return;
  if (logSel) {
    renderLogProfile(holder, note);
    return;
  }

  const filter = ($id("log-filter")?.value ?? "").trim().toLowerCase();

  // Refresh: we already have loaded lines — re-fetch the top only and merge.
  if (logLoaded.length > 0) {
    const top = await fetchRecordBatch({ tail: BATCH_SIZE });
    if (logSel) return;
    if (!top) return;
    logTotal = top.total;
    logFilePath = top.path ?? "";
    const fresh = parseLines(top.tail);
    fresh.reverse();
    const freshRaws = new Set(fresh.map((f) => f.raw));
    const older = logLoaded.filter((l) => !freshRaws.has(l.raw));
    logLoaded = [...fresh, ...older];
    logOlderOffset = top.total - BATCH_SIZE;
    renderLogRows(holder, note, filter);
    return;
  }

  // First load: fetch the most recent batch
  const body = await fetchRecordBatch({ tail: BATCH_SIZE });
  if (logSel) return;
  if (!body) {
    note.textContent = "the record lives on the Sources server \u2014 start explore-server.mjs to read it here";
    holder.textContent = "";
    return;
  }
  logTotal = body.total;
  logFilePath = body.path ?? "";
  logLoaded = parseLines(body.tail);
  logLoaded.reverse();
  logOlderOffset = body.total - BATCH_SIZE;
  renderLogRows(holder, note, filter);
}

function logPaneVisible() {
  return $id("pane-log")?.classList.contains("on") && document.visibilityState === "visible";
}

// refresh when shown, and every 5s while watched — a log you are looking at
// should not need a reload to be current
document.addEventListener("click", (ev) => {
  if (ev.target.closest?.('[role="tab"][data-pane="log"]')) setTimeout(renderLogPane, 50);
});
logTimer = setInterval(() => {
  // !logSel, not just visible — an open profile is being READ; the refresh
  // must not rebuild it under the reader (it would reset scroll and selection)
  if (logPaneVisible() && !logSel) renderLogPane();
}, 5000);
$id("log-filter")?.addEventListener("input", () => renderLogPane());
$id("log-refresh")?.addEventListener("click", () => renderLogPane());
if (logPaneVisible()) renderLogPane();

// ── the terminal drawer ─────────────────────────────────────────────────────
// Open, the pane is MOVED to be a direct child of <body> between main and
// footer, so the flexbox shrinks the app above it — content scoots up,
// nothing is covered. Closed, it goes home to the panel column untouched.
// The PTY session lives in app.js state and the pane's own DOM, both of
// which survive the move.
const termHome = { parent: null, next: null };

function buildTermControls(pane) {
  if (pane.querySelector(".term-controls")) return;
  const bar = document.createElement("div");
  bar.className = "term-controls";
  const full = document.createElement("button");
  full.type = "button";
  full.textContent = "\u2922";
  full.title = "full screen (and back)";
  full.onclick = () => {
    const now = document.body.classList.toggle("term-full");
    full.textContent = now ? "\u2921" : "\u2922";
  };
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "\u2715";
  close.title = "close the terminal (ctrl+`)";
  close.onclick = () => toggleTermDrawer(false);
  bar.append(full, close);
  pane.appendChild(bar);
}

function toggleTermDrawer(open) {
  const pane = $id("pane-terminal");
  if (!pane) return;
  const now = open ?? !document.body.classList.contains("term-drawer");
  if (now && !document.body.classList.contains("term-drawer")) {
    termHome.parent = pane.parentElement;
    termHome.next = pane.nextElementSibling;
    document.querySelector("main")?.after(pane);
    buildTermControls(pane);
  }
  if (!now && document.body.classList.contains("term-drawer")) {
    document.body.classList.remove("term-full");
    const fullBtn = pane.querySelector(".term-controls button");
    if (fullBtn) fullBtn.textContent = "\u2922";
    if (termHome.parent) termHome.parent.insertBefore(pane, termHome.next);
  }
  document.body.classList.toggle("term-drawer", now);
  const btn = $id("term-toggle");
  if (btn) btn.setAttribute("aria-expanded", String(now));
  if (now) $id("term-in")?.focus();
}

document.addEventListener("keydown", (ev) => {
  // ctrl+` — the drawer over any tab. (` is Backquote; ctrl not cmd, so the
  // browser's own cmd+` window-cycling stays untouched.)
  if (ev.ctrlKey && ev.code === "Backquote") {
    ev.preventDefault();
    toggleTermDrawer();
  }
  // Esc closes it when you are typing in it — the fastest way back out
  if (ev.key === "Escape" && document.body.classList.contains("term-drawer") && ev.target.closest?.("#pane-terminal")) {
    toggleTermDrawer(false);
  }
});
$id("term-toggle")?.addEventListener("click", () => toggleTermDrawer());
