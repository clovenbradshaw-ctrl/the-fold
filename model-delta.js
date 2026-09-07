// model-delta.js — which model a question needs, and what two models
// disagreeing about it MEANS (P139). Pure.
//
// User, 2026-09-06: "see about modifying which model runs based on the task
// and consider multiple models and checking the Delta."
//
// ROUTING IS AN EVIDENCE QUESTION, and run 1 answered it. Over 909 turns of
// one live stream, on the same probes, scored the same way:
//
//   probe        the instrument answered   the 2B model answered
//   recall             33 / 33  (100%)          2 / 13  (15%)
//   reasoning          20 / 26   (77%)          1 / 2
//   memory              7 / 7   (100%)         26 / 38  (68%)
//
// And the ANSWER CHANGED THE SUBJECT — shared under a fifth of the question's
// own content words — on 82% of memory turns and 73% of injection turns,
// against 4% of ordinary conversation. The small model is not uniformly weak;
// it is weak in a shape. It carries conversation and fails at holding a
// specific question steady while reading closely.
//
// So the ladder is not "big model for hard things". It is:
//
//   1. If the instrument knows the answer exactly, no model runs at all
//      (P173 — measured 100% right where it fires).
//   2. If the work is composition — prose, explanation, continuation — the
//      SMALL model does it, because that is where it does not drift (4%).
//   3. If the work is holding one question steady over close reading — a
//      quoted claim, an earlier answer, a premise to be affirmed or denied —
//      that is where it drifts, and where a second reading is worth its cost.
//
// AND A DISAGREEMENT IS A FINDING, NEVER AN AVERAGE. Two models answering
// differently is exactly the situation this instrument already refuses to
// resolve by vote elsewhere: the parliament's disagreements land TYPED. A
// delta says what KIND of difference it is, and the caller decides — it is
// not a score and there is no winner.
import { atomsOf } from "./snip-check.js";
import { substituted } from "./strain.js";

/** What a question asks the model to DO — the thing routing is actually about. */
export const WORK = Object.freeze({
  NONE: "none",          // the instrument answers; no model runs
  COMPOSE: "compose",    // prose, explanation, continuation — the small model's strength
  HOLD: "hold",          // hold one question steady over close reading — where it drifts
});

/** Questions that ask the mouth to keep hold of a specific thing while reading. */
const HOLD_RE = /\b(?:what (?:did|do) you (?:say|answer|tell)|earlier (?:you|i|we)|we established|you said|which passage|what fills|fill in the blank|exact(?:ly)? (?:value|word|number)|quote|verbatim|remind me what)\b/i;
/** Questions that ask for made prose. */
const COMPOSE_RE = /\b(?:why|explain|describe|summari[sz]e|tell me about|what do you (?:think|make)|discuss|elaborate|significance|matters?|write|essay)\b/i;

/**
 * workOf(question, { answered }) → WORK
 * `answered` is a truthy answer from the mechanical doors (P173).
 */
export function workOf(question, { answered = null } = {}) {
  if (answered) return WORK.NONE;
  const q = String(question ?? "");
  if (HOLD_RE.test(q)) return WORK.HOLD;
  if (COMPOSE_RE.test(q)) return WORK.COMPOSE;
  return WORK.COMPOSE;
}

/**
 * routeForWork(work, { small, second }) → { models, why }
 * The small model is the default and stays the default (the standing rule:
 * keep the local model small). A second reading is asked for only where the
 * measurement says the first one drifts, and only when one is offered.
 */
export function routeForWork(work, { small = null, second = null } = {}) {
  if (work === WORK.NONE) return { models: [], why: "the instrument knows this exactly; no model runs" };
  if (work === WORK.HOLD && second) return { models: [small, second].filter(Boolean), why: "holding one question steady over close reading is where the small model drifts (82% of memory turns changed the subject in run 1), so a second reading is taken" };
  if (work === WORK.HOLD) return { models: [small].filter(Boolean), why: "close reading, but no second model is offered — the drift stands disclosed" };
  return { models: [small].filter(Boolean), why: "composition is where the small model holds (4% drift), so it answers alone" };
}

const fold = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const atomSet = (t) => new Set(atomsOf(String(t ?? "")).map((a) => `${a.kind}:${fold(a.value)}`));

/** The kinds a difference between two readings can be. Each wants a different remedy, so they are never one number. */
export const DELTA = Object.freeze({
  AGREE: "agree",                 // the same atoms asserted
  ONE_SILENT: "one-silent",       // one answered, one said nothing it could place
  DRIFTED: "drifted",             // one of them changed the subject
  EXTRA: "extra",                 // one asserts everything the other does, and more
  CONFLICT: "conflict",           // each asserts an atom of the same kind the other denies
});

/**
 * delta(question, readings) → { kind, shared, only, drifted, detail }
 * `readings`: [{ model, text }]. Two readings only — a third is a different
 * question (which of three is right) and this file does not answer it.
 *
 * NOTHING HERE PICKS A WINNER. A conflict is reported as a conflict, and the
 * instrument's own checks — the atoms against the snips, the referents
 * against the cited passage's cast — are what decide, as they do for one
 * model. A second reading buys a DISAGREEMENT SIGNAL, not a vote.
 */
export function delta(question, readings = []) {
  const [a, b] = readings;
  if (!a || !b) return { kind: null, why: "a delta needs two readings" };
  const da = substituted(question, a.text);
  const db = substituted(question, b.text);
  const drifted = [da?.substituted ? a.model : null, db?.substituted ? b.model : null].filter(Boolean);
  const sa = atomSet(a.text);
  const sb = atomSet(b.text);
  const shared = [...sa].filter((x) => sb.has(x));
  const onlyA = [...sa].filter((x) => !sb.has(x));
  const onlyB = [...sb].filter((x) => !sa.has(x));
  const kindOf = (x) => x.split(":")[0];
  const conflict = onlyA.some((x) => onlyB.some((y) => kindOf(x) === kindOf(y) && kindOf(x) !== "name"));
  let kind = DELTA.AGREE;
  if (drifted.length) kind = DELTA.DRIFTED;
  else if (!sa.size || !sb.size) kind = DELTA.ONE_SILENT;
  else if (conflict) kind = DELTA.CONFLICT;
  else if (onlyA.length || onlyB.length) kind = DELTA.EXTRA;
  return {
    kind,
    shared,
    only: { [a.model]: onlyA, [b.model]: onlyB },
    drifted,
    detail: kind === DELTA.CONFLICT
      ? `the readings assert different values of the same kind; the material decides, not the models`
      : kind === DELTA.DRIFTED ? `${drifted.join(" and ")} answered a different question`
      : kind === DELTA.EXTRA ? `one reading asserts more than the other; the extra is unwitnessed until checked`
      : kind === DELTA.ONE_SILENT ? `one reading placed nothing`
      : `both readings assert the same values`,
  };
}
