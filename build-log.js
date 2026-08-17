// build-log.js — anything built is an append-only log with EO notation.
//
// A build (a code artifact, a table, an html/svg render — anything the
// conversation produces and keeps) is never a mutable object. It is a thread
// on the engine's own task log (eoreader6 engine/holon/task-log.js): its
// birth is a PROPOSE, every edit is a SUPERSEDE that keeps the past, every
// run attaches a RESULT, and what the app shows is a FOLD over the entries —
// the projected build, at whatever cursor position the reader has scrubbed
// to, downloadable there. "The code" is not a field that gets overwritten;
// it is the answer to "fold the log up to here."
//
// The EO typing is mechanical, from the ACT, never from the content (the
// cube is not a content classifier — POLICIES/CLAUDE.md both carry the
// refuted measurement). The constitutive entries carry it:
//
//   PROPOSE   → SEG · Figure · produced — the artifact was snipped out of
//               the turn's own answer and individually named; this is
//               task-log.js::proposeDiscovered's exact cell, reused, not a
//               new invention.
//   SUPERSEDE → SYN · Figure · produced — a new whole compiled from the
//               prior version and the edit. SEG → SYN … SYN never runs the
//               algebra backward (checkCubeProgression stays silent on a
//               build thread; the conformance test pins this against the
//               engine's own checker).
//   RESULT    → no operator. A result attaches an answer to a task that
//               already exists; stamping an operator on it would re-type the
//               task in the fold — task-log.js::produce()'s own discipline,
//               carried rather than re-derived.
//
// This module is the disclosed amendment to "this repo is not a cube
// consumer" (CLAUDE.md, holonic layer): for BUILDS, and builds only, the
// operator half of the task-log vocabulary is now carried, by user direction
// (2026-08-16). holon.js's plan log is unchanged.
//
// Pure, organs injected: the engine module arrives as an argument because
// this file is imported by both the page (which loads task-log.js from
// /engine) and the node tests (which load it by relative path) — the same
// pattern cast.js already carries, for the same reason. Used, never copied.

/**
 * Bind the build-log operations to the engine's task-log module.
 *
 * `taskLog` is the namespace of engine/holon/task-log.js. Everything below
 * goes through its own `append` — so the vocabulary walls (kind, operator,
 * basis, grain) are the engine's walls, enforced at the moment an entry
 * comes to exist, never re-implemented here.
 */
export function makeBuildLog(taskLog) {
  const { createTaskLog, append, projectTasks, ENTRY_KINDS, OPERATOR_BASIS, STRUCTURE_OPERATORS, GRAIN_RANK } = taskLog;

  // The Figure grain, read from the engine's own rank table rather than
  // restated — the name has one source of truth.
  const FIGURE = Object.keys(GRAIN_RANK).find((g) => GRAIN_RANK[g] === 1);

  const vid = (n, k) => `b${n}.v${k}`;

  /** Fold the log up to (and including) `atSeq` — the projected build as of
   * that point. Omit `atSeq` for the live build. `null` means the thread has
   * no live version there (nothing yet, or retracted). */
  function foldBuild(log, atSeq = Infinity) {
    const entries = atSeq === Infinity ? log.entries : log.entries.filter((e) => e.seq <= atSeq);
    const tasks = projectTasks({ entries });
    if (!tasks.length) return null;
    // One build per log: a single live version at any fold point.
    const t = tasks[tasks.length - 1];
    // The instruction is a build-log field, not engine vocabulary —
    // projectTasks does not carry it. Read it from the PROPOSE entry
    // that birthed this thread (the one matching this build's n).
    const propose = entries.find(
      (e) => e.kind === ENTRY_KINDS.PROPOSE && e.n === t.n,
    );
    return {
      n: t.n,
      turn: t.turn,
      seg: t.seg,
      caption: t.caption,
      instruction: propose?.instruction ?? null,
      version: t.version,
      code: t.code,
      reason: t.reason ?? null,
      lastRun: t.result ?? null,
      runParams: t.params ?? null,
      cell: t.cell,
      task_id: t.task_id,
      seqMax: log.nextSeq - 1,
    };
  }

  /** A build is born: the artifact the turn produced, snipped and named.
   *  `instruction` is the model's own plan for what this code is —
   *  mechanically derived from the plan log's task, never left to
   *  instruction-following (L5). It lands in the PROPOSE entry and
   *  travels through the fold. */
  function proposeBuild({ n, turn, seg, caption, instruction = null }) {
    const log = createTaskLog();
    return append(log, {
      kind: ENTRY_KINDS.PROPOSE,
      task_id: vid(n, 1),
      description: caption,
      operator: STRUCTURE_OPERATORS.SEG,
      operator_basis: OPERATOR_BASIS.PRODUCED,
      grain: FIGURE,
      n,
      turn,
      seg,
      caption,
      instruction,
      version: 1,
      code: seg?.type === "code" ? seg.code : null,
    });
  }

  /**
   * A new version of the working code. The prior version stays on the log —
   * supersession keeps the past. Identical code appends nothing: an entry
   * that changes no state is churn, refused here rather than recorded as
   * work. `reason` says which act this was ("edit", "reset", "restore").
   */
  function reviseBuild(log, { code, reason = "edit" } = {}) {
    const cur = foldBuild(log);
    if (!cur || cur.code === code) return log;
    const k = cur.version + 1;
    return append(log, {
      kind: ENTRY_KINDS.SUPERSEDE,
      task_id: vid(cur.n, k),
      supersedes: vid(cur.n, cur.version),
      description: cur.caption,
      operator: STRUCTURE_OPERATORS.SYN,
      operator_basis: OPERATOR_BASIS.PRODUCED,
      grain: FIGURE,
      n: cur.n,
      turn: cur.turn,
      seg: cur.seg,
      caption: cur.caption,
      version: k,
      code,
      reason,
    });
  }

  // What a result entry keeps of each output stream. The runner's own cap is
  // 64KB per stream; a log that kept all of every run would grow past the
  // browser store's quota in a few dozen runs and persistence would fail
  // SILENTLY — the worst failure this design has. So the entry keeps a
  // declared budget and states what it dropped (`kept: {stdout: {kept, of}}`)
  // — P4's discipline: the number is declared, the gap is a result, never a
  // silent shrink. Units are string length, the same measure the runner's
  // own cap uses.
  const KEEP_STREAM_CHARS = 16 * 1024;

  const keepStreams = (outcome, keep) => {
    const data = outcome?.data;
    if (!data || typeof data !== "object") return outcome;
    const out = { ...outcome, data: { ...data } };
    for (const k of ["stdout", "stderr"]) {
      const s = data[k];
      if (typeof s === "string" && s.length > keep) {
        out.data[k] = s.slice(0, keep);
        out.data.kept = { ...(out.data.kept ?? {}), [k]: { kept: keep, of: s.length } };
      }
    }
    return out;
  };

  /**
   * A run's outcome, attached to the version that ran. `params` are the
   * run's declared numbers (lang, caps); `outcome` is what actually happened
   * (exit code, output, timedOut — or the typed failure to reach the
   * runner), its streams held to the declared keep budget. No operator:
   * results attach, they never re-type.
   */
  function attachRun(log, { params = null, outcome, keepChars = KEEP_STREAM_CHARS } = {}) {
    const cur = foldBuild(log);
    if (!cur) return log;
    return append(log, {
      kind: ENTRY_KINDS.RESULT,
      task_id: cur.task_id,
      result: keepStreams(outcome, keepChars),
      params,
    });
  }

  /** The build leaves the live set. Its entries remain — a retraction is an
   * entry too, never an erasure. */
  function retractBuild(log) {
    const cur = foldBuild(log);
    if (!cur) return log;
    return append(log, { kind: ENTRY_KINDS.RETRACT, task_id: cur.task_id });
  }

  /** One row per entry, for the cursor's own labelling — mechanical, from
   * the entry's kind and payload, never a model's phrasing. */
  function timeline(log) {
    return log.entries.map((e) => ({
      seq: e.seq,
      kind: e.kind,
      version: e.version ?? null,
      operator: e.operator ?? null,
      grain: e.grain ?? null,
      label:
        e.kind === ENTRY_KINDS.PROPOSE
          ? `v1 · built`
          : e.kind === ENTRY_KINDS.SUPERSEDE
            ? `v${e.version} · ${e.reason ?? "revised"}`
            : e.kind === ENTRY_KINDS.RESULT
              ? `ran${e.result?.data?.rendered ? " (rendered)" : e.result?.ok === false ? " (failed)" : ""}`
              : e.kind,
    }));
  }

  const EXT = {
    python: "py",
    javascript: "js",
    js: "js",
    node: "js",
    shell: "sh",
    bash: "sh",
    html: "html",
    svg: "svg",
    json: "json",
    css: "css",
    markdown: "md",
    md: "md",
  };

  const csvCell = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  /**
   * The build as a downloadable file, at any cursor position. The seq is in
   * the name because it IS the address: `build-3@5.py` says exactly which
   * fold of the log these bytes are. `toDocument` is injected (artifact.js
   * owns it) so an html build downloads as the same complete document the
   * preview renders.
   */
  function exportAt(log, atSeq, { toDocument = null } = {}) {
    const b = foldBuild(log, atSeq ?? Infinity);
    if (!b) return null;
    const seq = atSeq ?? b.seqMax;
    const seg = b.seg ?? {};
    if (seg.type === "table") {
      const rows = [seg.head ?? [], ...(seg.rows ?? [])];
      return {
        name: `build-${b.n}@${seq}.csv`,
        mime: "text/csv",
        text: rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n",
      };
    }
    const lang = String(seg.lang ?? "").toLowerCase();
    const code = b.code ?? seg.code ?? "";
    if (lang === "html") {
      return {
        name: `build-${b.n}@${seq}.html`,
        mime: "text/html",
        text: toDocument ? toDocument({ ...seg, code }) : code,
      };
    }
    if (lang === "svg") {
      return { name: `build-${b.n}@${seq}.svg`, mime: "image/svg+xml", text: code };
    }
    return {
      name: `build-${b.n}@${seq}.${EXT[lang] ?? "txt"}`,
      mime: "text/plain",
      text: code,
    };
  }

  /**
   * Rebuild a log from its serialized entries alone — the resumption
   * property P3 already demands of plans, held here too. Every entry goes
   * back through the engine's own `append`, so a stored row that violates
   * the vocabulary throws instead of silently loading.
   */
  function replayEntries(entries) {
    let log = createTaskLog();
    for (const e of entries ?? []) log = append(log, e);
    return log;
  }

  /**
   * Migrate a pre-log build ({seg, code, lastRun} — the mutable shape this
   * module replaces). What was known becomes entries: the original as the
   * propose, the working code (if it differed) as one supersede, the last
   * run (if any) as a result. History that was never kept cannot be
   * invented; this is the honest floor, not a reconstruction.
   */
  function fromLegacy({ n, turn, seg, caption, code, lastRun }) {
    let log = proposeBuild({ n, turn, seg, caption });
    if (seg?.type === "code" && typeof code === "string" && code !== seg.code) {
      log = reviseBuild(log, { code, reason: "edit" });
    }
    if (lastRun) log = attachRun(log, { outcome: lastRun });
    return log;
  }

  return Object.freeze({
    proposeBuild,
    reviseBuild,
    attachRun,
    retractBuild,
    foldBuild,
    timeline,
    exportAt,
    replayEntries,
    fromLegacy,
  });
}
