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
//   EVIDENCE  → REC · Figure · produced — a RE-ZERO. The operator judged the
//               projection ("I don't like the colours", "it's broken") and
//               the ground it was built on is conceded; the entry records the
//               trigger verbatim and names the version it concedes.
//               operators.js: REC is "rezero" — Generate · Interpretation,
//               "a new ambient ground begins".
//   RESULT    → no operator. A result attaches an answer to a task that
//               already exists; stamping an operator on it would re-type the
//               task in the fold — task-log.js::produce()'s own discipline,
//               carried rather than re-derived.
//
// WHY A RE-ZERO IS TWO ENTRIES, AND WHY IT OPENS A GROUND. The engine's
// production order is NUL SEG SIG CON EVA DEF INS SYN REC, and it is one-way:
// isProductionOrder("SYN","REC") is true, isProductionOrder("REC","SYN") is
// FALSE. So a thread that re-zeroes can never be edited again without running
// the algebra backward — which would be a real defect, not a formality, since
// editing a widget after complaining about it is the normal case. The fix is
// to take REC at its word: a re-zero begins a NEW AMBIENT GROUND. The
// concession is its own single-entry thread (EVIDENCE · REC), and the new
// ground is born the way any production is born, as a PROPOSE · SEG, with no
// `supersedes` link back — a re-zero concedes a ground, it does not compile a
// new whole out of the old one. Threads read [SEG SYN SYN…] [REC] [SEG SYN…]
// and the engine's own checker stays silent across all of them, forever, for
// any number of grounds. Nothing is rewound: every ground's entries stay on
// the log and every cursor position still folds back byte-identically.
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

  // Ground 1 keeps the plain `b<n>.v<k>` address it has always had — a
  // re-zero is the only thing that ever introduces a ground segment, so a log
  // that never re-zeroed is addressed today exactly as it was yesterday, and
  // a stored one replays unchanged.
  const vid = (n, k, ground = 1) => (ground > 1 ? `b${n}.g${ground}.v${k}` : `b${n}.v${k}`);
  const rezeroId = (n, ground) => `b${n}.rezero.${ground}`;

  /** Fold the log up to (and including) `atSeq` — the projected build as of
   * that point. Omit `atSeq` for the live build. `null` means the thread has
   * no live version there (nothing yet, or retracted). */
  function foldBuild(log, atSeq = Infinity) {
    const entries = atSeq === Infinity ? log.entries : log.entries.filter((e) => e.seq <= atSeq);
    // The live VERSIONS — re-zero markers are live tasks too (they are
    // evidence about the build, never superseded), and they carry no code.
    // Folding to one would blank the projection at exactly the cursor
    // position where the reader most wants to see what was conceded.
    const tasks = projectTasks({ entries }).filter((t) => t.version != null);
    if (!tasks.length) return null;
    // One live version per ground; the last is the newest ground's — which
    // is the build as it now stands. projectTasks sorts by first_seq, so
    // "last" is "most recently born", not an accident of Map order.
    const t = tasks[tasks.length - 1];
    return {
      n: t.n,
      turn: t.turn,
      seg: t.seg,
      caption: t.caption,
      version: t.version,
      ground: t.ground ?? 1,
      code: t.code,
      reason: t.reason ?? null,
      lastRun: t.result ?? null,
      runParams: t.params ?? null,
      cell: t.cell,
      task_id: t.task_id,
      seqMax: log.nextSeq - 1,
    };
  }

  /** How many grounds this log has had — 1 until the first re-zero. */
  function groundCount(log) {
    return log.entries.reduce((n, e) => Math.max(n, e.ground ?? 1), 1);
  }

  /** A build is born: the artifact the turn produced, snipped and named. */
  function proposeBuild({ n, turn, seg, caption }) {
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
      version: 1,
      ground: 1,
      code: seg?.type === "code" ? seg.code : null,
    });
  }

  /**
   * The operator judged the projection, and the ground it was built on is
   * conceded. Two entries, for the reason the header states: the concession
   * (EVIDENCE · REC · Figure · produced, its own thread, carrying the
   * operator's words verbatim and the version it concedes) and the birth of
   * the next ground (PROPOSE · SEG · Figure · produced, no `supersedes` —
   * a re-zero does not compile a new whole out of the old one).
   *
   * `trigger` is the operator's own words. It is REQUIRED: a re-zero with no
   * recorded reason is a version bump wearing an operator's name, and the
   * whole point of typing this act REC rather than SYN is that the reason is
   * what makes it one. `seg` is the artifact the new ground is born with —
   * the model's actual output, so a widget that comes back as a different
   * language says so on the log rather than inheriting the old one's.
   */
  function rezeroBuild(log, { code, seg = null, caption = null, trigger, tell = null } = {}) {
    const cur = foldBuild(log);
    if (!cur) return log;
    if (typeof trigger !== "string" || !trigger.trim())
      throw new TypeError("rezeroBuild: a re-zero records the operator's own words as its trigger");
    const ground = groundCount(log) + 1;
    const nextSeg = seg ?? cur.seg;
    const nextCode = code ?? (nextSeg?.type === "code" ? nextSeg.code : null);
    // Churn is refused here exactly as it is in reviseBuild: an identical
    // projection changes no state, and a ground that concedes nothing is not
    // a concession. The complaint is still real — it just did not land.
    if (nextCode === cur.code && (seg ?? cur.seg) === cur.seg) return log;

    const conceded = append(log, {
      kind: ENTRY_KINDS.EVIDENCE,
      task_id: rezeroId(cur.n, ground),
      description: `re-zero: ${trigger}`,
      operator: "REC",
      operator_basis: OPERATOR_BASIS.PRODUCED,
      grain: FIGURE,
      n: cur.n,
      turn: cur.turn,
      ground,
      trigger,
      tell,
      concedes: cur.task_id,
      concededVersion: cur.version,
      concededGround: cur.ground,
    });

    return append(conceded, {
      kind: ENTRY_KINDS.PROPOSE,
      task_id: vid(cur.n, 1, ground),
      description: caption ?? cur.caption,
      operator: STRUCTURE_OPERATORS.SEG,
      operator_basis: OPERATOR_BASIS.PRODUCED,
      grain: FIGURE,
      n: cur.n,
      turn: cur.turn,
      seg: nextSeg,
      caption: caption ?? cur.caption,
      version: 1,
      ground,
      code: nextCode,
      trigger,
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
      task_id: vid(cur.n, k, cur.ground),
      supersedes: vid(cur.n, cur.version, cur.ground),
      description: cur.caption,
      operator: STRUCTURE_OPERATORS.SYN,
      operator_basis: OPERATOR_BASIS.PRODUCED,
      grain: FIGURE,
      n: cur.n,
      turn: cur.turn,
      seg: cur.seg,
      caption: cur.caption,
      version: k,
      ground: cur.ground,
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
      ground: e.ground ?? 1,
      operator: e.operator ?? null,
      grain: e.grain ?? null,
      // The trigger rides on the row so the cursor can say WHY the ground
      // moved, in the operator's own words — the one thing a version number
      // cannot carry.
      trigger: e.trigger ?? null,
      label:
        e.operator === "REC"
          ? `re-zero · ground ${e.ground} · ${e.trigger}`
          : e.kind === ENTRY_KINDS.PROPOSE
            ? (e.ground ?? 1) > 1
              ? `g${e.ground} v1 · rebuilt`
              : `v1 · built`
            : e.kind === ENTRY_KINDS.SUPERSEDE
              ? `${(e.ground ?? 1) > 1 ? `g${e.ground} ` : ""}v${e.version} · ${e.reason ?? "revised"}`
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
    rezeroBuild,
    attachRun,
    retractBuild,
    foldBuild,
    groundCount,
    timeline,
    exportAt,
    replayEntries,
    fromLegacy,
  });
}
