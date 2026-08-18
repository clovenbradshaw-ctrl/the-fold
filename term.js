// term.js — the terminal, sandboxed. Standalone on purpose: app.js hands
// this module the accessors the fold runtime reads (the cast.js injection
// pattern) and owns nothing else about it; log-pane.js goes on owning how
// the drawer is SHOWN.
//
// THE ONE RULE (P18). Nothing typed here reaches the machine. The old
// terminal was a real zsh under a server PTY — the opposite of a sandbox —
// and that path is gone from serve.mjs entirely, not just unused. What runs
// instead is a registry of runtimes that live in this page:
//
//   fold     commands over the instrument itself — mechanical, no model
//   js       javascript in a dedicated Worker whose egress APIs are severed
//   python   pyodide, vendored in node_modules, served from localhost —
//            stdlib plus numpy/matplotlib/pandas, also vendored
//            (scripts/fetch-pyodide-packages.sh; no PyPI: the page loads
//            nothing remote, P1). `pip install <name>` (below, a fold
//            command) fetches any of pyodide's own ~350 wasm-built
//            packages the same way (P21, the wheel organ) — never
//            arbitrary PyPI, and only the local SERVER ever crosses out.
//   sql      sqlite via sql.js, vendored the same way; loaded CSV material
//            imports as tables
//
// Anything else — a shell, node, npm, a remote box — is refused with its
// reason, never half-simulated. The registry takes any runtime a localhost-
// served module can boot; the refusals name why the famous ones cannot.
//
// The sandbox is an authority wall by construction (severed globals in the
// workers, a page that loads nothing remote), not a hardened security
// boundary — the same posture skills.js discloses, with P1 as the outer
// wall. term.test.mjs is the assay: the seam scan (no non-local host and
// no exec route anywhere in these files), the severed-list agreement
// across workers, and the grammar below.

// ── declared budgets (P9: named, with a duty, never a quality threshold) ────
import { delimitedTable } from "./source.js";
import { LESSONS, stepLesson } from "./term-lessons.js";
import { parseHandbookIndex, findChapter } from "./handbook.js";
import { landAct } from "./capacity-runner.js";
import { looksMutating, detectTables, deriveStoreOps, sanitizeTableName, opsFromCsvTable } from "./store-sql.js";

export const KEEP_PER_EXEC = 256 * 1024; // display keep per command; overflow is dropped with the drop stated
export const SEARCH_SHOWN = 8; // fold search rows shown; the total is always stated
export const RECORD_SHOWN = 20; // record tail rows shown
export const SNIPPET_CHARS = 100; // one search row's excerpt
export const HINT_AFTER_MS = 10_000; // a long-running command earns one "✕ interrupts" hint
export const TERM_RECORD_LINE_CAP = 2_000; // a mirrored line's own keep budget — unbounded text is not a record, it's a leak

// ── mirroring every submitted line onto the durable record ─────────────────
//
// "Terminal acts are not on the record" was a deliberate posture, not an
// oversight (CLAUDE.md's terminal section names it, and names the mirror as
// future work) — closed here by reusing explore-server.mjs's own `record()`
// and its one file (record/explore-record.jsonl), the SAME record every
// other event in this instrument already lands on, rather than a second
// file or a second reader. `record`/`priors`/`pip` above already try both
// bases for a READ; this is the identical shape for a WRITE — sequential
// with fallback, never both at once, silent when neither base has the
// route (no fold server running is this terminal's long-standing default,
// not a mid-command error).
const RECORD_BASES = ["", "http://localhost:8812"];
async function mirrorTerm(event, fields) {
  for (const base of RECORD_BASES) {
    try {
      const res = await fetch(`${base}/api/term-record`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event, ...fields }),
      });
      if (res.ok) return;
    } catch {
      /* try the next base */
    }
  }
}
const capped = (s) => (s.length > TERM_RECORD_LINE_CAP ? s.slice(0, TERM_RECORD_LINE_CAP) + `…(${s.length - TERM_RECORD_LINE_CAP} more, dropped)` : s);

// ── the registry ────────────────────────────────────────────────────────────
//
// `type` names the Worker constructor's own `type` option this runtime's
// file needs to load correctly — held here once rather than re-derived by a
// sql-vs-everything-else ternary wherever a worker is spawned (spawn()
// below and runSandboxed both used to hardcode that same three-way check
// separately, and two copies of one fact is exactly the drift class this
// repo's postmortems keep naming). "module" for js/python (both ship ESM
// `export`, per their own file headers); "classic" for sql (sql.js is UMD
// and importScripts is the one loader that hands it a global scope — its
// own header says so).
export const ROSTER = {
  fold: { kind: "builtin", blurb: "commands over the instrument itself — mechanical, no model" },
  js: { kind: "worker", type: "module", src: "./term-js-worker.mjs", blurb: "javascript in a Worker with its network severed" },
  python: { kind: "worker", type: "module", src: "./term-py-worker.mjs", blurb: "pyodide (vendored, ~30MB first boot) — stdlib plus numpy, matplotlib, pandas (vendored); `pip install <name>` (fold command) fetches any of ~350 others; material mounts at /material" },
  sql: { kind: "worker", type: "classic", src: "./term-sql-worker.js", blurb: "sqlite via sql.js (vendored) — .load <source> imports a loaded CSV as a table" },
};

// Refused runtimes, each with its reason — a typed refusal, never a shrug.
// These are the routes a browser terminal famously offers; the ones that
// need the machine, the network, or a licence are named so the next reader
// does not re-derive why they are absent.
export const REFUSED = {
  bash: "the machine's shell is out of reach by design — this terminal runs in the browser sandbox only (P18)",
  zsh: "the machine's shell is out of reach by design — this terminal runs in the browser sandbox only (P18)",
  sh: "the machine's shell is out of reach by design — this terminal runs in the browser sandbox only (P18)",
  node: "node runs on the machine — `js` is the sandboxed runtime here",
  npm: "package installs need the machine's own node — P1 allows neither; `pip install <name>` is the one sanctioned install, closed to pyodide's own vetted set (P21)",
  webcontainers: "needs a remote CDN and a commercial licence — P1 refuses the first, the licence refuses the second",
  webvm: "boots a full Debian over an external network proxy — P1 refuses the proxy",
  ssh: "a page has no raw sockets; an ssh relay would be egress — P1 refuses it",
};

// The severed egress list — the canonical copy. Each worker carries its own
// (a worker file stays standalone); term.test.mjs asserts the copies agree,
// so drift is a failing test, not a quiet hole.
export const SEVERED = ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "WebTransport", "importScripts", "Worker", "SharedWorker", "caches"];

// ── the grammar: when does a line continue instead of run ───────────────────
//
// One rule per runtime, all mechanical, all familiar from the real REPLs:
// a trailing backslash continues anywhere; python buffers after a line
// ending in ":" until an empty line (the "..." prompt); sql buffers until a
// trailing ";" — except dot-commands, and an empty line always flushes, so
// a missing semicolon is one keystroke from running, never a trap.
/** A control word on its own line never joins a statement buffer: `exit`
 * must leave sql even though the line lacks a semicolon — measured live:
 * the semicolon rule swallowed it and the prompt wedged at "…". Checked
 * before `continues`, always. */
export const isControl = (line, buffer) => !buffer && ["exit", "clear", "mount"].includes(line.trim());

export function continues(runtime, line, buffer) {
  if (line.endsWith("\\")) return true;
  if (runtime === "python") {
    if (buffer) return line.trim() !== "";
    return line.trimEnd().endsWith(":");
  }
  if (runtime === "sql") {
    const t = line.trim();
    if (buffer) return t !== "" && !t.endsWith(";");
    if (t === "" || t.startsWith(".")) return false;
    return !t.endsWith(";");
  }
  return false;
}

// ── CSV → table, for the sql runtime ────────────────────────────────────────
//
// The parse walks quotes (a field legally holds commas, newlines, and ""
// escapes — the web organ already paid for forgetting that attribute values
// hold ">"); the typing is all-or-nothing per column — INTEGER if every
// non-empty value is one, REAL if every one is numeric, TEXT otherwise —
// never a sampled guess. Empty fields load as NULL.
export function csvTable(text) {
  // The walk is source.js::delimitedTable — the one quote-aware scanner every
  // reader of delimited bytes shares (measure.js's door and the chart both
  // split with it too). Reconciling widened this side rather than narrowing
  // it: this copy already walked quotes across newlines, and now it also
  // speaks tab and semicolon, because the shared walker sniffs the delimiter
  // off the bytes — a TSV loaded into the sql runtime used to burst into one
  // column per row and load as garbage without a word said.
  const parsed = delimitedTable(text);
  if (!parsed) return null;
  const header = parsed.head;
  const body = parsed.rows;
  const width = header.length;
  const columns = header.map((h, i) => {
    let name = h.trim().replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
    // CREATE TABLE gets these bare — a name that is empty or starts with a
    // digit would not survive it.
    if (!name || /^\d/.test(name)) name = `c${name || i + 1}`;
    let type = "INTEGER";
    let any = false;
    for (const r of body) {
      const v = (r[i] ?? "").trim();
      if (v === "") continue;
      any = true;
      if (type === "INTEGER" && !/^-?\d+$/.test(v)) type = "REAL";
      if (type === "REAL" && !/^-?\d*\.?\d+(e-?\d+)?$/i.test(v)) {
        type = "TEXT";
        break;
      }
    }
    return { name, type: any ? type : "TEXT" };
  });
  const data = body.map((r) => columns.map((c, i) => {
    const v = r[i] ?? "";
    if (v.trim() === "") return null;
    if (c.type === "INTEGER") return parseInt(v, 10);
    if (c.type === "REAL") return parseFloat(v);
    return v;
  }));
  return { columns, rows: data, ragged: body.some((r) => r.length !== width) };
}

/** Column-aligned text for result rows — the terminal is a <pre>; alignment
 * is the whole table affordance it has. */
export function formatCells(columns, rows) {
  const all = [columns, ...rows.map((r) => r.map((v) => (v === null || v === undefined ? "" : String(v))))];
  const widths = columns.map((_, i) => Math.max(...all.map((r) => (r[i] ?? "").length)));
  const line = (r) => r.map((v, i) => (v ?? "").padEnd(widths[i])).join("  ").trimEnd();
  return [line(all[0]), line(widths.map((w) => "─".repeat(w))), ...all.slice(1).map(line)].join("\n");
}

const fmtBytes = (n) => (n < 1024 ? `${n} B` : n < 1024 ** 2 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 ** 2).toFixed(1)} MB`);

// ── sandboxed auto-run ───────────────────────────────────────────────────────
//
// A second door onto the same two workers the terminal drives, for code a
// chat turn just wrote as a fold — never for the Folds panel's own ▶ run,
// which is a REAL machine process via /api/run (P16's runner amendment) and
// a different risk class entirely. This door never leaves the sandbox: same
// worker files, same SEVERED egress list, no exception. Throwaway by
// design — one boot, one exec, terminated after, exactly the "throwaway
// process" framing /api/run already uses, just backed by WASM instead of
// the machine.
const AUTO_RUN_LANGS = { python: "python", javascript: "js", js: "js", sql: "sql" };
// python pays pyodide's own boot cost (measured: ~9s in Node for the
// runtime alone, before a single user line runs) on top of whatever the
// code itself takes — js has no such tax (a plain Worker boots near-
// instantly), so each runtime's budget is its own rather than one shared
// guess. sql pays sql.js's own wasm boot over importScripts — lighter than
// pyodide's, heavier than a bare js Worker's — so its budget sits between
// the two rather than reusing either.
const AUTO_RUN_TIMEOUT_MS = { python: 45_000, js: 10_000, sql: 15_000 };

/** True if `lang` is one this door can actually run. Read by the caller
 * before it decides to run anything, so a caption never promises a run
 * that was never going to happen. */
export function autoRunnable(lang) {
  return Object.hasOwn(AUTO_RUN_LANGS, String(lang ?? "").toLowerCase());
}

/** The extra field a sql `exec` worker message carries so term-sql-worker.js
 * knows which table(s) to snapshot before and after (P25, the database
 * fold) — module-level and pure (no bridge, no DOM) so both the interactive
 * terminal (inside `initTerminal`, below) and the standalone `runSandboxed`
 * call the SAME implementation rather than two copies that could drift, the
 * exact class of bug this repo's own postmortems keep finding (ROSTER's
 * `type` field, above, exists for the identical reason). Every runtime
 * other than sql — and every sql statement store-sql.js::looksMutating does
 * not claim — gets no extra field at all, so the worker never bothers
 * snapshotting a bare SELECT or a dot-command. */
const sqlSnapshotFields = (runtime, code) =>
  runtime === "sql" && looksMutating(code) ? { snapshotTables: detectTables(code) } : {};

/**
 * The chat's own door onto this same sandbox: `/run <runtime>\n<code>`.
 * Code the auto-run above never sees — that one only ever runs a segment
 * the MODEL just produced inside this turn's own fold, fire-and-forget, no
 * click needed; it already covers "the model's own code runs safely."
 * What has no door at all is code a PERSON just typed or pasted straight
 * into the composer. `/run` fills exactly that gap, and deliberately as a
 * typed command rather than a button drawn onto a rendered segment: a
 * button there would sit on the identical segments auto-run already runs
 * automatically, which is redundant with a mechanism that already exists;
 * a typed door is also the shape every other explicit trigger in this
 * repo already takes (/act, /self, /priors, /learn — and, one register
 * over, the Folds panel's own ▶ run), so nothing new is invented to read
 * "did a person, this exact turn, ask for this to run."
 *
 * Shape: the FIRST LINE's second token names the runtime; everything
 * after the first newline is the code, byte-for-byte (no trimming — a
 * python body's own indentation and blank lines are the author's, not
 * this parser's to touch). Three outcomes, matching this codebase's own
 * "a parse function returns null to let the caller's door fall through"
 * convention (parseMeasure in measure.js, parseFoldCommand in
 * folds-pane.js — both return null on a shape mismatch rather than a
 * refusal, so a caller can print its OWN usage line only when the text
 * was clearly meant for this door at all):
 *
 *   - `null` — not this command's shape at all: no leading `/run`, or a
 *     `/run <runtime>` with no code (no second line, or a second line
 *     that is blank). The caller falls through rather than refusing.
 *   - `{ refused: { type: "unsupported_runtime", detail } }` — the shape
 *     is whole but the named runtime is not one `autoRunnable` accepts.
 *     `/run` only ever reaches the sandboxed runtimes auto-run already
 *     trusts (python, js/javascript, sql) — never `fold` (composing a
 *     terminal-language act or reading a source is not "running code")
 *     and never a runtime this repo refuses outright (REFUSED, above).
 *   - `{ runtime, code }` — a whole, runnable command.
 */
export function parseRunCommand(text) {
  const raw = String(text ?? "");
  const nl = raw.indexOf("\n");
  if (nl === -1) return null; // no second line at all — nothing to run
  const firstLine = raw.slice(0, nl);
  const code = raw.slice(nl + 1);
  const tokens = firstLine.trim().split(/\s+/);
  if ((tokens[0] ?? "").toLowerCase() !== "/run") return null;
  const runtime = (tokens[1] ?? "").toLowerCase();
  if (!runtime || !code.trim()) return null;
  if (!autoRunnable(runtime)) {
    return {
      refused: {
        type: "unsupported_runtime",
        detail: `"${runtime}" cannot be run from chat — /run only reaches the sandboxed runtimes this door already trusts (${[...new Set(Object.keys(AUTO_RUN_LANGS))].join(", ")}). The terminal (›_) has more runtimes at its own prompt (fold, sql included) but they are not all reachable from this door — only actual code execution is.`,
      },
    };
  }
  return { runtime, code };
}

/**
 * Runs `code` in a fresh, throwaway sandbox worker and resolves the SAME
 * shape /api/run's JSON does ({code, stdout, stderr, timedOut, durationMs})
 * — so attachRun and the Folds panel's own rendering need no branch for
 * where a result came from. `sources` mounts material the same way the
 * terminal's own `mount` command does; auto-run gets none by default; a
 * caller wanting the fold to see loaded material passes them explicitly.
 *
 * sql gets three extras the interactive prompt already has and this door
 * needs too, since it only gets one shot rather than a REPL: (1) `result`-
 * type worker messages — runSql (term-sql-worker.js) emits these for every
 * statement that returns rows, the SAME message the terminal's own
 * spawn() handler already formats with formatCells; auto-run used to only
 * listen for out/err/done because python/js never emit `result`. (2) a
 * `.load <source>` PRE-STEP, when it is the code's own first line — the
 * identical csvTable walk exec()'s own sql `.load` handling (below) uses,
 * so `/run sql\n.load orders\nselect …` can prime a table from already-
 * attached material before the query runs, without a second parser. (3)
 * `dbOps` on the resolved object (P25): every row-level change a mutating
 * statement — or a `.load` — made, as store-sql.js's own typed ops, so the
 * caller (app.js's `/run` door, `runTurn`) can apply them to the SAME
 * database fold the interactive terminal writes, without this function
 * ever calling store.js itself (it has no bridge to inject one through —
 * `runSandboxed` is a bare function, not `initTerminal`'s closure).
 */
export function runSandboxed(lang, code, { sources = {} } = {}) {
  const key = AUTO_RUN_LANGS[String(lang ?? "").toLowerCase()];
  if (!key) return Promise.resolve({ code: null, stdout: "", stderr: `no sandboxed runner for "${lang}"`, timedOut: false, durationMs: 0, dbOps: [] });
  const started = Date.now();
  return new Promise((resolve) => {
    const worker = new Worker(new URL(ROSTER[key].src, import.meta.url), { type: ROSTER[key].type });
    let out = "";
    let err = "";
    let settled = false;
    const dbOps = [];
    const finish = (patch) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      resolve({ code: patch.timedOut || err ? 1 : 0, stdout: out, stderr: err, timedOut: !!patch.timedOut, durationMs: Date.now() - started, dbOps });
    };
    const timer = setTimeout(() => finish({ timedOut: true }), AUTO_RUN_TIMEOUT_MS[key] ?? 10_000);

    // The `.load` pre-step: only the code's own FIRST line is checked, the
    // same one-dot-command-per-statement grammar the interactive prompt
    // holds. A name that isn't loaded, or doesn't parse as a CSV, ends the
    // run right there with a typed stderr line rather than running the
    // query against a table that was never created.
    let queryCode = code;
    let pendingLoad = null;
    if (key === "sql") {
      const firstNL = code.indexOf("\n");
      const firstLine = firstNL === -1 ? code : code.slice(0, firstNL);
      const m = firstLine.match(/^\s*\.load\s+(\S+)/);
      if (m) {
        const srcName = m[1];
        queryCode = firstNL === -1 ? "" : code.slice(firstNL + 1);
        if (sources[srcName] === undefined) {
          err += `no source named "${srcName}" — nothing to .load\n`;
          queryCode = null;
        } else {
          const table = csvTable(sources[srcName]);
          if (!table) {
            err += `${srcName} parsed to nothing — is it a CSV?\n`;
            queryCode = null;
          } else {
            pendingLoad = { name: srcName, table };
            // Same reasoning as the interactive `.load` (exec(), above): a
            // fresh load is always a birth, derived directly from the
            // already-parsed table — no diffing, no worker round trip.
            dbOps.push(...opsFromCsvTable(sanitizeTableName(srcName), table));
          }
        }
      }
    }

    worker.onmessage = (ev) => {
      const m = ev.data ?? {};
      if (m.type === "ready") {
        if (queryCode === null) finish({});
        else if (pendingLoad) worker.postMessage({ type: "load", name: pendingLoad.name, table: pendingLoad.table });
        else worker.postMessage({ type: "exec", code: queryCode, ...sqlSnapshotFields(key, queryCode) });
      } else if (m.type === "out") out += m.text.endsWith("\n") ? m.text : m.text + "\n";
      else if (m.type === "err") err += m.text.endsWith("\n") ? m.text : m.text + "\n";
      else if (m.type === "result") {
        out += formatCells(m.columns, m.values) + "\n";
        if (m.of > m.values.length) out += `…${m.values.length} of ${m.of.toLocaleString()} rows kept\n`;
      } else if (m.type === "snapshots") {
        dbOps.push(...deriveStoreOps(m.before, m.after));
      } else if (m.type === "done") {
        if (pendingLoad) {
          // That "done" was the load step's, not the query's — the load
          // itself already reported its own out/err line above.
          pendingLoad = null;
          if (!queryCode || !queryCode.trim()) finish({});
          else worker.postMessage({ type: "exec", code: queryCode, ...sqlSnapshotFields(key, queryCode) });
        } else finish({});
      }
    };
    worker.onerror = (ev) => {
      err += `${ev.message ?? "worker error"}\n`;
      finish({});
    };
    worker.postMessage({ type: "boot", sources });
  });
}

// ── the terminal itself ─────────────────────────────────────────────────────

export function initTerminal(bridge) {
  const $ = (id) => document.getElementById(id);
  const out = $("term-out");
  const input = $("term-in");
  const promptEl = $("term-prompt");
  const kill = $("term-kill");
  if (!out || !input) return null;

  const term = {
    runtime: "fold", // the prompt's runtime
    buffer: "", // continuation lines not yet run
    busy: false,
    kept: 0, // display bytes kept this exec (KEEP_PER_EXEC)
    dropped: false,
    hintTimer: null,
    history: [],
    histAt: null,
    workers: {}, // name → { worker, ready }
    learnAt: null, // lesson index, or null when no lesson is running
    learnTries: 0,
    // The terminal language's own append-only log (grid.js). A page-local
    // fallback — used only when the bridge does not share one (below) —
    // never persisted, same posture term.js already has for "terminal acts
    // are not on the record" (their mirroring onto the durable record,
    // below, is a one-way copy, not a restore source). `bridge.grid` is
    // optional: a caller that has not wired it (or a Node test importing
    // this module for its pure functions alone) still boots a working
    // terminal, with `act`/`grid`/`capacities` refusing gracefully instead
    // of throwing.
    gridLog: bridge.grid ? bridge.grid.createLog() : null,
  };

  // Chat grew its own `/act` door onto the SAME composition law (P22 →
  // the chat-door amendment) — an act composed from either surface should
  // be visible from the other, the way sources/chunks/muted/folds already
  // are (all bridge accessors over app.js's own `state`). `gridLog`/
  // `setGridLog` are that same shape, optional like the rest: when the
  // bridge wires them, the terminal reads and writes app.js's
  // `state.gridLog` directly and `term.gridLog` above sits unused; when it
  // doesn't (a bare bridge, a Node test), the terminal falls back to its
  // own local log so it still boots and works standalone.
  const readGridLog = () => (bridge.gridLog ? bridge.gridLog() : term.gridLog);
  const writeGridLog = (log) => {
    if (bridge.setGridLog) bridge.setGridLog(log);
    else term.gridLog = log;
  };

  const line = (text, cls) => {
    const span = document.createElement("span");
    if (cls) span.className = cls;
    span.textContent = text;
    out.append(span, document.createTextNode("\n"));
    out.scrollTop = out.scrollHeight;
  };
  const stream = (text, cls) => {
    // The keep budget: a looping print costs the page its heap through the
    // DOM long before it costs the worker anything. Overflow is dropped
    // with the drop stated once, per exec.
    if (term.kept >= KEEP_PER_EXEC) {
      if (!term.dropped) {
        term.dropped = true;
        line(`…output over the keep budget (${fmtBytes(KEEP_PER_EXEC)}) — the rest of this command's stream is dropped`, "term-mute");
      }
      return;
    }
    const room = KEEP_PER_EXEC - term.kept;
    const s = text.length > room ? text.slice(0, room) : text;
    term.kept += s.length;
    const span = document.createElement("span");
    if (cls) span.className = cls;
    span.textContent = s.endsWith("\n") ? s : s + "\n";
    out.append(span);
    out.scrollTop = out.scrollHeight;
  };

  const promptFor = () => (term.buffer ? "…" : { fold: "fold ›", js: "js ›", python: "py ›", sql: "sql ›" }[term.runtime]);
  const drawPrompt = () => {
    if (promptEl) promptEl.textContent = promptFor();
  };

  const setBusy = (on) => {
    term.busy = on;
    kill.disabled = !on;
    if (on) {
      term.kept = 0;
      term.dropped = false;
      term.hintTimer = setTimeout(() => line("…still running — ✕ interrupts (the runtime restarts fresh)", "term-mute"), HINT_AFTER_MS);
    } else {
      clearTimeout(term.hintTimer);
      input.focus();
    }
  };

  // What crosses into a sandbox: every loaded source, muted or not — the
  // mute silences retrieval, not the operator. The crossing is said out
  // loud here, where it happens.
  const sourcesPayload = () => {
    const src = bridge.sources();
    const payload = {};
    let bytes = 0;
    for (const name of Object.keys(src)) {
      payload[name] = src[name];
      bytes += src[name].length;
    }
    return { payload, count: Object.keys(payload).length, bytes };
  };

  // ── database-fold wiring (store.js / store-sql.js) ─────────────────────────
  //
  // A mutating sql statement's real effect — never SQL text this file would
  // have to parse — is what becomes a store.js event. term-sql-worker.js
  // snapshots the affected table(s) before and after (told which ones by the
  // module-level `sqlSnapshotFields`, above — shared with `runSandboxed` so
  // the two never carry two copies of the same check); store-sql.js's
  // `deriveStoreOps` diffs the two raw snapshots into typed `{type, table,
  // rowId, columns}` ops; `bridge.applyStoreOps` (app.js) is the ONE place
  // that turns those into real `store.insertRow`/`updateRow`/`deleteRow`
  // calls against the database fold's own log — this file never imports
  // store.js itself, the same injection boundary every other bridge
  // accessor here already holds (sources/chunks/muted/folds/gridLog).
  const applyDbOps = (ops) => {
    if (!ops.length || !bridge.applyStoreOps) return;
    bridge.applyStoreOps(ops);
    const n = (t) => ops.filter((o) => o.type === t).length;
    line(`database fold: ${ops.length} row-level change${ops.length === 1 ? "" : "s"} recorded (${n("insert")} insert, ${n("update")} update, ${n("delete")} delete)`, "term-mute");
  };

  // ── worker runtimes ───────────────────────────────────────────────────────

  const spawn = (name) => {
    const worker = new Worker(new URL(ROSTER[name].src, import.meta.url), { type: ROSTER[name].type });
    const entry = { worker, ready: false };
    term.workers[name] = entry;
    worker.onmessage = (ev) => {
      const m = ev.data ?? {};
      if (m.type === "ready") {
        entry.ready = true;
        if (m.note) line(m.note, "term-mute");
        setBusy(false);
      } else if (m.type === "out") stream(m.text);
      else if (m.type === "err") stream(m.text, "term-exit bad");
      else if (m.type === "result") {
        stream(formatCells(m.columns, m.values));
        if (m.of > m.values.length) line(`…${m.values.length} of ${m.of.toLocaleString()} rows carried back (the worker's declared keep)`, "term-mute");
      } else if (m.type === "snapshots") applyDbOps(deriveStoreOps(m.before, m.after));
      else if (m.type === "done") setBusy(false);
    };
    worker.onerror = (ev) => {
      line(`the ${name} runtime failed: ${ev.message ?? "worker error"}`, "term-exit bad");
      worker.terminate();
      delete term.workers[name];
      setBusy(false);
    };
    return entry;
  };

  const enterRuntime = (name) => {
    term.runtime = name;
    term.buffer = "";
    if (!term.workers[name]) {
      const { payload, count, bytes } = sourcesPayload();
      line(`booting the ${name} runtime — ${ROSTER[name].blurb}`, "term-mute");
      if (count) line(`material crossing into the sandbox: ${count} source${count === 1 ? "" : "s"}, ${fmtBytes(bytes)}`, "term-mute");
      setBusy(true);
      spawn(name).worker.postMessage({ type: "boot", sources: payload });
    } else if (!term.workers[name].ready) setBusy(true);
    drawPrompt();
  };

  const interrupt = () => {
    if (!term.busy) return;
    const name = term.runtime;
    const entry = term.workers[name];
    if (entry) {
      entry.worker.terminate();
      delete term.workers[name];
      line(`interrupted — the ${name} runtime is gone; the next command boots it fresh (its state with it)`, "term-exit bad");
    }
    setBusy(false);
  };

  // ── the fold runtime: the instrument, as commands ─────────────────────────

  const foldCommands = {
    help() {
      line(
        [
          "the fold terminal — everything runs in this page's sandbox; the machine is out of reach.",
          "",
          "fold commands",
          "  sources              what is loaded (name · passages · bytes · muted)",
          "  search <words>       passages sharing terms with <words> (top " + SEARCH_SHOWN + " shown)",
          "  read <name#a-b>      a source's characters a–b (the chat refs' own space)",
          "  folds                the folds pane's logs (n · turn · entries)",
          "  record [words]       the append-only record's tail (needs a fold server)",
          "  priors [on|off <p>]  live_priors' toggle state · flip a document, folder, or the whole corpus",
          "  handbook [n]         the eoreaderhandbook, vendored whole — chapter list, or one chapter's text",
          "  pip install <name>   fetch a wheel from pyodide's own ~350-package build (P21) — never arbitrary PyPI",
          "  act <line>           compose one act of the terminal language — verb at terrain from stance (P22)",
          "  grid [legend]        this session's landed acts and define/evaluate landings · the 9×9×9 reference table",
          "  capacities [id]      the small, disclosed capacity registry `synthesize` checks its parts against",
          "  runtimes             what can run here — and what is refused, with reasons",
          "  learn · learn stop   walk this terminal's own commands, one step at a time · leave the lesson early",
          "  clear · exit         wipe the screen · close the drawer",
          "",
          "runtimes — enter by name, leave with `exit` (the runtime stays warm; ✕ ends it)",
          ...Object.keys(ROSTER)
            .filter((r) => r !== "fold")
            .map((r) => `  ${r.padEnd(8)} ${ROSTER[r].blurb}`),
        ].join("\n"),
        "term-mute",
      );
    },
    runtimes() {
      const rows = Object.keys(ROSTER).map((r) => `  ${r.padEnd(8)} ${ROSTER[r].blurb}`);
      const refusals = Object.keys(REFUSED).map((r) => `  ${r.padEnd(14)} ${REFUSED[r]}`);
      line(["runs here, in the page", ...rows, "", "refused, with reasons", ...refusals].join("\n"), "term-mute");
    },
    sources() {
      const src = bridge.sources();
      const names = Object.keys(src);
      if (!names.length) return line("nothing loaded — add material in the chat (drop a file anywhere)", "term-mute");
      const chunks = bridge.chunks();
      const muted = bridge.muted();
      for (const name of names) {
        const n = chunks.filter((c) => c.source === name).length;
        line(`${name} · ${n.toLocaleString()} passages · ${fmtBytes(src[name].length)}${muted.has(name) ? " · muted" : ""}`);
      }
    },
    search(arg) {
      if (!arg) return line("search <words> — what should the passages share terms with?", "term-mute");
      const terms = [...new Set(bridge.tokenize(arg))];
      if (!terms.length) return line("no searchable terms in that", "term-mute");
      const scored = [];
      for (const c of bridge.chunks()) {
        const has = c.terms?.has ? (t) => c.terms.has(t) : (t) => c.terms?.includes?.(t);
        const matched = terms.filter(has);
        if (matched.length) scored.push({ c, matched });
      }
      scored.sort((a, b) => b.matched.length - a.matched.length);
      if (!scored.length) return line(`nothing shares a term with “${arg}”`, "term-mute");
      for (const { c, matched } of scored.slice(0, SEARCH_SHOWN)) {
        line(`${c.ref}  (${matched.join(", ")})`);
        line(`  ${c.text.slice(0, SNIPPET_CHARS).replace(/\s+/g, " ")}…`, "term-mute");
      }
      line(`${Math.min(SEARCH_SHOWN, scored.length)} of ${scored.length} shown — the same term overlap the chat's evidence table counts`, "term-mute");
    },
    read(arg) {
      const m = (arg ?? "").match(/^(.+?)#(\d+)-(\d+)$/) ?? (arg ?? "").match(/^(.+?)\s+(\d+)\s+(\d+)$/);
      if (!m) return line("read <name#a-b> — characters a–b of a loaded source", "term-mute");
      const src = bridge.sources();
      const text = src[m[1]];
      if (text === undefined) return line(`no source named “${m[1]}” — \`sources\` lists what is loaded`, "term-exit bad");
      const [a, b] = [Number(m[2]), Number(m[3])];
      stream(text.slice(a, b));
      line(`${m[1]} · chars ${a}–${Math.min(b, text.length)} of ${text.length.toLocaleString()}`, "term-mute");
    },
    folds() {
      const folds = bridge.folds();
      if (!folds.length) return line("nothing but prose so far", "term-mute");
      // A database fold (P25) carries entries on `storeLog`, not `log` —
      // read either, whichever this fold actually has.
      for (const f of folds) line(`fold ${f.n} · turn ${f.turn} · ${f.kind === "database" ? "database · " : ""}${(f.log ?? f.storeLog)?.entries?.length ?? 0} entries`);
    },
    async record(arg) {
      for (const base of ["", "http://localhost:8812"]) {
        try {
          const res = await fetch(`${base}/api/record?tail=200`);
          if (!res.ok) continue;
          const body = await res.json();
          const rows = (body.tail ?? []).filter((raw) => !arg || raw.toLowerCase().includes(arg.toLowerCase())).slice(-RECORD_SHOWN);
          if (!rows.length) return line(arg ? `nothing in the tail matches “${arg}”` : "the record's tail is empty", "term-mute");
          for (const raw of rows) {
            try {
              const e = JSON.parse(raw);
              line(`${(e.at ?? "").slice(11, 19)}  ${e.event ?? "?"}  ${raw.length > 120 ? raw.slice(0, 119) + "…" : raw}`, "term-mute");
            } catch {
              line(raw.slice(0, 120), "term-mute");
            }
          }
          return line(`${rows.length} of the last ${body.tail?.length ?? 0} events — the Log tab is the full face`, "term-mute");
        } catch {
          /* try the next base */
        }
      }
      line("the record lives on a fold server — start explore-server.mjs (or serve.mjs) to read it here", "term-exit bad");
    },
    async priors(arg) {
      const [sub, ...rest] = (arg ?? "").trim().split(/\s+/).filter(Boolean);
      const bases = ["", "http://localhost:8812"];
      const hit = async (path, opts) => {
        for (const base of bases) {
          try {
            const res = await fetch(`${base}${path}`, opts);
            if (res.ok) return await res.json();
          } catch {
            /* try the next base */
          }
        }
        return null;
      };
      if (sub === "on" || sub === "off") {
        const p = rest.join(" ");
        const body = await hit("/api/priors/toggle", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ path: p, on: sub === "on" }),
        });
        if (!body) return line("the priors ledger lives on a fold server — start explore-server.mjs (port 8812) to toggle it here", "term-exit bad");
        if (body.error) return line(body.error, "term-exit bad");
        line(`${p || "the whole corpus"} → ${sub.toUpperCase()}`, "term-mute");
        // The one thing worth saying plainly: what this actually changes.
        // The toggle now gates BOTH the offer surface (the picker, `priors
        // sources`) and the check itself (/api/priors/check only consults
        // documents the ledger says are on) — a document switched off here
        // is not read at answer time, not just hidden from a list.
        line("this reaches the surf directly: the reference-library check that runs during a turn now only reads documents on — a document switched off is not consulted, not just hidden from the picker.", "term-mute");
        return;
      }
      const data = await hit("/api/priors");
      if (!data) return line("the priors organ lives on a fold server — start explore-server.mjs (port 8812) to read it here", "term-exit bad");
      if (data.gap) return line(data.gap.detail, "term-mute");
      line(`live_priors: ${data.files.toLocaleString()} documents · ${data.enabledCount.toLocaleString()} in play — every document starts off`, "term-mute");
      for (const c of data.categories) line(`  ${c.name.padEnd(28)} ${String(c.enabled).padStart(5)}/${c.files} in play`);
      line("`priors on <path>` / `priors off <path>` — a document, a folder, or the whole corpus (\"\", or just `priors on`). Path is corpus-relative, e.g. `02-encyclopedic`.", "term-mute");
    },
    async handbook(arg) {
      // The whole handbook is vendored under handbook/ (P1: local, same
      // fetch pattern as any other same-origin static file this page
      // already serves — never a remote crossing). The chapter list is
      // parsed from the index's own table of contents, never re-typed here.
      let idx;
      try {
        idx = parseHandbookIndex(await (await fetch("handbook/000-index.md")).text());
      } catch {
        return line("the handbook isn't reachable from here — served from the same origin as this page (handbook/000-index.md)", "term-exit bad");
      }
      const want = (arg ?? "").trim();
      if (!want) {
        line("the eoreaderhandbook — theory this instrument is built on, vendored whole:", "term-mute");
        for (const c of idx) line(`  ${c.n.padEnd(5)} ${c.title}`);
        line("`handbook <n>` reads a chapter, e.g. `handbook 1.1`", "term-mute");
        return;
      }
      const ch = findChapter(idx, want);
      if (!ch) return line(`no chapter “${want}” — \`handbook\` lists them all`, "term-exit bad");
      const text = await (await fetch(`handbook/${ch.file}`)).text();
      stream(text);
      line(`— chapter ${ch.n}, ${ch.title} (handbook/${ch.file})`, "term-mute");
    },
    // pip: the wheel organ (P21), closed to pyodide's own ~350-package wasm
    // build — never arbitrary PyPI. This command does the one crossing
    // (the local server fetches, sha256-verifies, and vendors the wheel);
    // the python worker's OWN loadPackagesFromImports mechanism (untouched)
    // picks it up on a FRESH session's first line, same as it already does
    // for numpy/matplotlib/pandas. A name not in that set is a typed
    // refusal, never a silent miss.
    async pip(arg) {
      const [sub, ...rest] = (arg ?? "").trim().split(/\s+/).filter(Boolean);
      const bases = ["", "http://localhost:8812"];
      const hit = async (path, opts) => {
        for (const base of bases) {
          try {
            const res = await fetch(`${base}${path}`, opts);
            if (res.ok) return await res.json();
          } catch {
            /* try the next base */
          }
        }
        return null;
      };
      if (sub !== "install" || !rest.length) {
        let count = "pyodide's own vetted set";
        try {
          const lock = await (await fetch("node_modules/pyodide/pyodide-lock.json")).json();
          count = `${Object.keys(lock.packages).length} packages`;
        } catch {
          /* the count is a nicety; the usage line stands without it */
        }
        return line(`pip install <name> — fetches a wheel from ${count} pyodide itself already builds for wasm (numpy, scipy, pandas, scikit-learn, networkx, requests, and hundreds more — never arbitrary PyPI). \`import <name>\` on a FRESH python session's first line loads it.`, "term-mute");
      }
      const name = rest.join(" ");
      line(`fetching ${name} — checking pyodide's own vetted set, sha256-verified against its lock file…`, "term-mute");
      const body = await hit("/api/wheels/install", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!body) return line("the wheel organ lives on a fold server — start explore-server.mjs (port 8812) to install packages here", "term-exit bad");
      if (body.gap) return line(body.gap.detail, "term-exit bad");
      const fresh = body.fetchedNow?.length ? `${body.fetchedNow.length} new wheel${body.fetchedNow.length === 1 ? "" : "s"} fetched` : "already vendored";
      line(`${body.name} v${body.version} ready (${fresh}) — sha256-pinned against pyodide's own lock.`, "term-mute");
      line(`this session's python runtime won't see it — its network already severed. \`exit\` then \`python\` starts fresh; \`import ${body.name}\` as that session's FIRST line loads it, same as numpy/pandas/matplotlib always have.`, "term-mute");
    },
    // act / grid / capacities — the terminal language (grid.js): the nine
    // operators, nine terrains, nine postures, one composition law. `act`
    // parses and lands one line on the shared log (readGridLog/writeGridLog
    // above — this session's own local log when the bridge hasn't wired
    // sharing with chat, `state.gridLog` when it has); `grid` folds that
    // log into what currently stands, or shows the fixed 9×9×9 reference
    // table on request (`grid legend`) — kept one command away rather than
    // fronting the page, the same posture Explore's own legend view
    // already holds for the nine terrains. `capacities` lists the small,
    // disclosed capacity registry `synthesize` checks its parts against.
    // One capacity actually EXECUTES: a landed `distinguish` whose `ground`
    // names an already-loaded source runs `cast` for real and attaches the
    // referents found as a RESULT — every other capacity stays
    // reference-only, and `runCapacity` says so itself (a typed
    // `not_yet_executable` gap), never a silent no-op. The parse→land→
    // maybe-execute orchestration itself is `landAct` (capacity-runner.js)
    // — the SAME function the chat's own `/act` door calls, so the two
    // doors can never silently diverge on what a line means.
    act(arg) {
      if (!bridge.grid) return line("the terminal language lives behind `bridge.grid` — this page has not wired it in yet", "term-exit bad");
      if (!arg) return line("act <verb> [<object>] at <terrain> from <stance> [ground <g> broken:<p>] [because <t>] [supersedes <id>] [warrant:<giver>] — `grid legend` lists the verbs, terrains, and stances", "term-mute");
      const landed = landAct(bridge.grid, readGridLog(), arg, { sources: bridge.sources(), runCapacity: bridge.runCapacity });
      if (!landed.ok) {
        mirrorTerm("term-act-refused", { line: capped(arg), refusal: landed.refusal.type, detail: landed.refusal.detail });
        return line(`refused (${landed.refusal.type}): ${landed.refusal.detail}`, "term-exit bad");
      }
      writeGridLog(landed.log);
      mirrorTerm("term-act", { verb: landed.event.verb, ops: landed.event.ops, object: landed.event.object, terrain: landed.event.terrain, stance: landed.event.stance.cell, ids: landed.ids });
      const objectPart = landed.event.object ? `${landed.event.object} ` : "";
      line(`${landed.event.verb} ${objectPart}[${landed.event.ops.join("+")}] at ${landed.event.terrain} from ${landed.event.stance.cell} → ${landed.ids.join(", ")}`, "term-mute");
      if (landed.capacity) {
        const { result } = landed.capacity;
        if (result.gap === "no_material") {
          line(result.detail, "term-exit bad");
        } else {
          mirrorTerm("term-capacity-run", { id: "cast", source: landed.event.ground, count: result.count, referents: result.referents.map((r) => r.surface) });
          line(`cast · ${result.count} referent${result.count === 1 ? "" : "s"} found in "${landed.event.ground}": ${result.referents.map((r) => r.surface).join(", ") || "(none)"}`, "term-mute");
        }
      }
    },
    grid(arg) {
      if ((arg ?? "").trim().toLowerCase() === "legend") {
        const verbs = Object.entries(bridge.grid ? bridge.grid.VERBS : {}).map(([v, { ops }]) => `  ${v.padEnd(12)} ${ops.join("+")}`);
        const shorthands = Object.entries(bridge.grid ? bridge.grid.STANCE_SHORTHANDS : {}).map(([s, { mode, grain }]) => `  ${s.padEnd(12)} ${mode}${grain ? "·" + grain : " (any grain)"}`);
        return line(
          [
            "nine operators, eight surface verbs (`distinguish` carries two):",
            ...verbs,
            "",
            "nine terrains — Void Entity Kind (Existence) · Field Link Network (Structure) · Atmosphere Lens Paradigm (Interpretation)",
            "",
            "stance = a mode (differentiate/relate/generate) crossed with the terrain's own grain; four named shorthands:",
            ...shorthands,
          ].join("\n"),
          "term-mute",
        );
      }
      if (!bridge.grid) return line("the terminal language lives behind `bridge.grid` — this page has not wired it in yet", "term-exit bad");
      const { acts, landings } = bridge.grid.foldGrid(readGridLog());
      if (!acts.length) return line("nothing landed yet — `act <line>` composes one; `grid legend` lists the verbs, terrains, and stances", "term-mute");
      for (const a of acts) {
        line(`${a.task_id}  ${a.operator}·${a.grain}  ${a.verb} ${a.object ?? ""}`.trim());
        if (a.result?.count !== undefined) line(`  → ${a.result.count} referent${a.result.count === 1 ? "" : "s"}: ${a.result.referents?.map((r) => r.surface).join(", ") || "(none)"}`, "term-mute");
      }
      if (landings.length) {
        line("", "term-mute");
        line("define landings (testimony only if a companion evaluate cleared):", "term-mute");
        for (const l of landings) line(`  ${l.task_id}  ${l.object ?? ""}  ${l.status}${l.reason ? " — " + l.reason : ""}`, "term-mute");
      }
    },
    capacities(arg) {
      const list = bridge.capacities ?? [];
      if (!list.length) return line("no capacities registered", "term-mute");
      const want = (arg ?? "").trim().toLowerCase();
      if (want) {
        const hit = list.find((c) => c.id === want);
        if (!hit) return line(`no capacity named "${want}" — \`capacities\` lists them`, "term-exit bad");
        return line(`${hit.id} · ${hit.terrain} · ${hit.op}\n  ${hit.module}::${hit.fn}\n  ${hit.what}`, "term-mute");
      }
      for (const c of list) line(`  ${c.id.padEnd(12)} ${c.terrain.padEnd(10)} ${c.what}`, "term-mute");
    },
    clear() {
      out.textContent = "";
    },
    learn(arg) {
      if ((arg ?? "").trim().toLowerCase() === "stop") {
        if (term.learnAt == null) return line("no lesson is running", "term-mute");
        term.learnAt = null;
        term.learnTries = 0;
        return line("lesson stopped — the runtimes you visited are still warm", "term-mute");
      }
      term.learnAt = 0;
      term.learnTries = 0;
      line(`a walk through this terminal's own commands, ${LESSONS.length} steps — \`learn stop\` leaves early, any time; \`handbook\` is the theory this walk doesn't cover`, "term-mute");
      line(LESSONS[0].ask, "term-mute");
    },
  };

  // The lesson never grades a line itself — it only compares what you typed
  // against the current step's pattern, after that line already ran for
  // real through the normal dispatch below. It is quizzing you on this
  // terminal, mechanically; no model is in the loop (P18's posture, applied
  // to teaching it).
  const checkLesson = (raw) => {
    if (term.learnAt == null) return;
    const r = stepLesson(term.learnAt, term.learnTries, raw);
    term.learnAt = r.at;
    term.learnTries = r.tries;
    if (r.event === "advanced") {
      line(r.done, "term-mute");
      line(r.ask, "term-mute");
    } else if (r.event === "finished") {
      line(r.done, "term-mute");
      line("lesson complete — `learn` runs it again any time", "term-mute");
    } else if (r.event === "hint") {
      line(`still looking for: ${r.ask}`, "term-mute");
    }
  };

  const runFold = async (text) => {
    const [word, ...rest] = text.trim().split(/\s+/);
    const arg = rest.join(" ");
    // A leading "/" is accepted as the same command — chat's own door
    // convention, so `/learn` works here exactly as it does there.
    const cmd = word.toLowerCase().replace(/^\//, "");
    if (cmd === "exit") return document.body.classList.contains("term-drawer") && $("term-toggle")?.click();
    if (ROSTER[cmd] && cmd !== "fold") return enterRuntime(cmd);
    if (REFUSED[cmd]) return line(REFUSED[cmd], "term-exit bad");
    if (foldCommands[cmd]) return foldCommands[cmd](arg);
    line(`not a fold command: “${cmd}” — the machine's shell is out of reach by design (P18). \`help\` lists what runs here.`, "term-exit bad");
  };

  // ── dispatch ──────────────────────────────────────────────────────────────

  const exec = (text) => {
    const name = term.runtime;
    const entry = term.workers[name];
    if (!entry?.ready) return line(`the ${name} runtime is not up — enter \`${name}\` again`, "term-exit bad");
    setBusy(true);
    if (name === "sql" && /^\s*\.load\b/.test(text)) {
      const srcName = text.trim().split(/\s+/)[1];
      const src = bridge.sources()[srcName];
      if (src === undefined) {
        setBusy(false);
        return line(`no source named “${srcName}” — \`exit\` then \`sources\` lists what is loaded`, "term-exit bad");
      }
      const table = csvTable(src);
      if (!table) {
        setBusy(false);
        return line(`${srcName} parsed to nothing — is it a CSV?`, "term-exit bad");
      }
      // For a DATABASE FOLD specifically (P25): every loaded row becomes its
      // own real insertRow call — never a raw table dump — walking the
      // SAME already-parsed {columns, rows} this session's own CREATE
      // TABLE + batch INSERT below is about to use, so the fold and the
      // live query session never disagree about what a row is.
      // sanitizeTableName mirrors term-sql-worker.js's own tableName()
      // (store-sql.js's own header discloses why) so the fold's table name
      // matches what `.tables`/`.schema` will show in this same session.
      applyDbOps(opsFromCsvTable(sanitizeTableName(srcName), table));
      entry.worker.postMessage({ type: "load", name: srcName, table });
      return;
    }
    entry.worker.postMessage({ type: "exec", code: text, ...sqlSnapshotFields(name, text) });
  };

  const submit = () => {
    const raw = input.value;
    if (!raw.trim() && !term.buffer) return;
    input.value = "";
    if (term.busy) {
      line("…still running — ✕ interrupts; there is no stdin in the sandbox", "term-mute");
      return;
    }
    line(`${promptFor()} ${raw}`, "term-cmd");
    if (raw.trim()) {
      term.history.push(raw);
      term.histAt = null;
    }
    if (!isControl(raw, term.buffer) && continues(term.runtime, raw, term.buffer)) {
      term.buffer += (term.buffer ? "\n" : "") + raw.replace(/\\$/, "");
      drawPrompt();
      return;
    }
    const text = term.buffer ? term.buffer + "\n" + raw : raw;
    term.buffer = "";
    drawPrompt();
    if (!text.trim()) return;
    // Every line that actually runs mirrors onto the durable record —
    // "everything gets logged" applies here the same way it already does
    // to every other act this instrument performs. Fire-and-forget: never
    // awaited, never blocks the command it is describing.
    mirrorTerm("term-exec", { runtime: term.runtime, line: capped(text) });
    if (term.runtime === "fold") runFold(text);
    else if (text.trim() === "exit") {
      term.runtime = "fold";
      line("back in fold — the runtime stays warm; ✕ would have ended it", "term-mute");
      drawPrompt();
    } else if (text.trim() === "clear") foldCommands.clear();
    else if (text.trim() === "mount") {
      const { payload, count, bytes } = sourcesPayload();
      line(`material crossing into the sandbox: ${count} source${count === 1 ? "" : "s"}, ${fmtBytes(bytes)}`, "term-mute");
      term.workers[term.runtime]?.worker.postMessage({ type: "sources", sources: payload });
    } else exec(text);
    checkLesson(text);
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "ArrowUp" && !input.value) {
      if (!term.history.length) return;
      term.histAt = term.histAt === null ? term.history.length - 1 : Math.max(0, term.histAt - 1);
      input.value = term.history[term.histAt];
      e.preventDefault();
    } else if (e.key === "ArrowDown" && term.histAt !== null) {
      term.histAt = Math.min(term.history.length, term.histAt + 1);
      input.value = term.history[term.histAt] ?? "";
      if (term.histAt >= term.history.length) term.histAt = null;
      e.preventDefault();
    } else if (e.key === "c" && e.ctrlKey) {
      interrupt();
    }
  });
  kill.addEventListener("click", interrupt);

  drawPrompt();
  return term;
}
