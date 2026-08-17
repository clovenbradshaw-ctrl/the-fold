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
//            nothing remote, P1)
//   sql      sqlite via sql.js, vendored the same way; loaded CSV material
//            imports as tables
//
// Anything else — a shell, node, pip, a remote box — is refused with its
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

export const KEEP_PER_EXEC = 256 * 1024; // display keep per command; overflow is dropped with the drop stated
export const SEARCH_SHOWN = 8; // fold search rows shown; the total is always stated
export const RECORD_SHOWN = 20; // record tail rows shown
export const SNIPPET_CHARS = 100; // one search row's excerpt
export const HINT_AFTER_MS = 10_000; // a long-running command earns one "✕ interrupts" hint

// ── the registry ────────────────────────────────────────────────────────────
export const ROSTER = {
  fold: { kind: "builtin", blurb: "commands over the instrument itself — mechanical, no model" },
  js: { kind: "worker", src: "./term-js-worker.mjs", blurb: "javascript in a Worker with its network severed" },
  python: { kind: "worker", src: "./term-py-worker.mjs", blurb: "pyodide (vendored, ~30MB first boot) — stdlib plus numpy, matplotlib, pandas (vendored); material mounts at /material" },
  sql: { kind: "worker", src: "./term-sql-worker.js", blurb: "sqlite via sql.js (vendored) — .load <source> imports a loaded CSV as a table" },
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
  pip: "package installs need the network and the machine — P1 allows neither; stdlib plus numpy/matplotlib/pandas (vendored) is all there is",
  npm: "package installs need the network and the machine — P1 allows neither",
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
const AUTO_RUN_LANGS = { python: "python", javascript: "js", js: "js" };
// python pays pyodide's own boot cost (measured: ~9s in Node for the
// runtime alone, before a single user line runs) on top of whatever the
// code itself takes — js has no such tax (a plain Worker boots near-
// instantly), so each runtime's budget is its own rather than one shared
// guess.
const AUTO_RUN_TIMEOUT_MS = { python: 45_000, js: 10_000 };

/** True if `lang` is one this door can actually run. Read by the caller
 * before it decides to run anything, so a caption never promises a run
 * that was never going to happen. */
export function autoRunnable(lang) {
  return Object.hasOwn(AUTO_RUN_LANGS, String(lang ?? "").toLowerCase());
}

/**
 * Runs `code` in a fresh, throwaway sandbox worker and resolves the SAME
 * shape /api/run's JSON does ({code, stdout, stderr, timedOut, durationMs})
 * — so attachRun and the Folds panel's own rendering need no branch for
 * where a result came from. `sources` mounts material the same way the
 * terminal's own `mount` command does; auto-run gets none by default; a
 * caller wanting the fold to see loaded material passes them explicitly.
 */
export function runSandboxed(lang, code, { sources = {} } = {}) {
  const key = AUTO_RUN_LANGS[String(lang ?? "").toLowerCase()];
  if (!key) return Promise.resolve({ code: null, stdout: "", stderr: `no sandboxed runner for "${lang}"`, timedOut: false, durationMs: 0 });
  const started = Date.now();
  return new Promise((resolve) => {
    const worker = new Worker(new URL(ROSTER[key].src, import.meta.url), { type: "module" });
    let out = "";
    let err = "";
    let settled = false;
    const finish = (patch) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      resolve({ code: patch.timedOut || err ? 1 : 0, stdout: out, stderr: err, timedOut: !!patch.timedOut, durationMs: Date.now() - started });
    };
    const timer = setTimeout(() => finish({ timedOut: true }), AUTO_RUN_TIMEOUT_MS[key] ?? 10_000);
    worker.onmessage = (ev) => {
      const m = ev.data ?? {};
      if (m.type === "ready") worker.postMessage({ type: "exec", code });
      else if (m.type === "out") out += m.text.endsWith("\n") ? m.text : m.text + "\n";
      else if (m.type === "err") err += m.text.endsWith("\n") ? m.text : m.text + "\n";
      else if (m.type === "done") finish({});
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

  // ── worker runtimes ───────────────────────────────────────────────────────

  const spawn = (name) => {
    const worker = new Worker(new URL(ROSTER[name].src, import.meta.url), { type: name === "sql" ? "classic" : "module" });
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
      } else if (m.type === "done") setBusy(false);
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
      for (const f of folds) line(`fold ${f.n} · turn ${f.turn} · ${f.log?.entries?.length ?? 0} entries`);
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
      entry.worker.postMessage({ type: "load", name: srcName, table });
      return;
    }
    entry.worker.postMessage({ type: "exec", code: text });
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
