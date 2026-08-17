/**
 * buildlog.js — the append-only build log in EO notation.
 *
 * Format mirrors NPJ's EO event schema (app/record/articles.js, app/core
 * data.js §2.2): {v, op, target, ts, seq, operand}. Three ops over builds:
 *
 *   SIG(target, {instruction, basis})  — the model's instruction (set the subject)
 *   INS(target, {lang, code, caption}) — the genesis projection (first code)
 *   REC(target, {code})               — an edit or reset (new projection)
 *   EVA(target, {ok, ...})            — a run result (rides in events, doesn't
 *                                        disturb the fold)
 *
 * Seq not clock, sealed entries, append-only in operation. The model's
 * instructions are the plan log's own PROPOSE entries — mechanically
 * carried here by renderAnswer, never left to instruction-following (L5).
 * The code is projected from the log: INS seeds, REC patches, the editor
 * shows the latest projection.
 */

const SCHEMA = "fold-build-eo/1";
const FOLD_FIELDS = ["code", "lang", "caption"];
const SIG_OPS = new Set(["SIG"]);
const INS_OPS = new Set(["INS"]);
const REC_OPS = new Set(["REC"]);

export function createBuildLog() {
  return Object.freeze({ entries: Object.freeze([]), nextSeq: 0 });
}

export function appendBuildLog(log, entry) {
  if (!entry || typeof entry !== "object") throw new TypeError("appendBuildLog: entry required");
  if (!["SIG", "INS", "REC", "EVA"].includes(entry.op))
    throw new TypeError(`appendBuildLog: unknown op ${entry.op}`);
  if (typeof entry.target !== "string" || !entry.target)
    throw new TypeError("appendBuildLog: target required");
  const e = Object.freeze({
    v: SCHEMA,
    op: entry.op,
    seq: log.nextSeq,
    target: entry.target,
    ts: new Date().toISOString(),
    actor: entry.actor || null,
    operand: Object.freeze({ ...(entry.operand || {}) }),
    ...(entry.note ? { note: entry.note } : {}),
  });
  return Object.freeze({
    entries: Object.freeze([...log.entries, e]),
    nextSeq: log.nextSeq + 1,
  });
}

/**
 * Fold the log to the current state per target. INS seeds/re-seeds the
 * projection state (replacing all FOLD_FIELDS wholesale); REC replaces
 * only the fields it carries; SIG sets the instruction (latest wins).
 * EVA and unknown ops ride in entries without disturbing the fold — the
 * door is open for deposits, just like NPJ's foldLog.
 */
export function foldBuildLog(log) {
  const byTarget = new Map();
  for (const e of log.entries) {
    const prev = byTarget.get(e.target) || {};
    if (SIG_OPS.has(e.op)) {
      byTarget.set(e.target, { ...prev, instruction: e.operand });
    } else if (INS_OPS.has(e.op)) {
      const state = {};
      FOLD_FIELDS.forEach((k) => {
        if (e.operand[k] != null) state[k] = e.operand[k];
      });
      byTarget.set(e.target, { ...prev, ...state, insSeq: e.seq });
    } else if (REC_OPS.has(e.op)) {
      const state = {};
      FOLD_FIELDS.forEach((k) => {
        if (e.operand[k] != null) state[k] = e.operand[k];
      });
      byTarget.set(e.target, { ...prev, ...state, recSeq: e.seq });
    }
  }
  return byTarget;
}

export function projectCode(log, buildN) {
  const state = foldBuildLog(log).get(`build/${buildN}`);
  return state
    ? {
        code: state.code ?? null,
        lang: state.lang ?? null,
        caption: state.caption ?? null,
        instruction: state.instruction ?? null,
      }
    : null;
}
