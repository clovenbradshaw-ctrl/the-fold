// strain.js — effort is recruited by difficulty, not spent flat (P130).
//
// User direction (2026-09-06): "leverage the power of system 1 and system 2,
// in the thinking fast and slow sense."
//
// This instrument already had the two systems and the watcher between them:
// `runFastPass` drafts (S1), `holonicTurn` checks against real material (S2),
// and `metacognition.js` classifies the gap and learns a precision per cell.
// P129 then gave S1 its strict form — `answerBeforeTheModel` returns in
// milliseconds with no call at all when the answer is exactly known.
//
// What was missing is the dynamic Kahneman's account actually turns on: S2 is
// LAZY, and is recruited by strain. Ours was not lazy; it was uniform. Every
// grounded turn spent the same full budget — the same witness asks, the same
// correction rounds — whether the material answered the question outright or
// three sources disagreed. Measured in the long-stream run: an easy organic
// turn and a hard probe both drew the same machinery, and turns ran 5s to
// 470s with the difference coming from the model's own verbosity rather than
// from any judgement about difficulty.
//
// So difficulty is measured, mechanically, from things the turn already
// computes, and the depth rung (P123) is set from it. The person's slider
// stays: it is a CEILING and a FLOOR on what strain may recruit, never
// overridden silently — a person who asks for depth 3 gets depth 3.
//
// THE SIGNALS ARE ALL ALREADY PAID FOR. Nothing here runs a new pass or
// spends a call; every reading is a by-product of work the turn does anyway.
// A signal that cannot be read is absent, never a zero: an unmeasurable
// difficulty is not an easy one (the same line the grounding ladder holds).
import { CLAIM_STOPWORDS } from "./grounding.js";

const fold = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const words = (t) => new Set(fold(t).split(/[^\p{L}\p{N}_]+/u).filter((w) => w.length > 3 && !CLAIM_STOPWORDS.has(w)));

/** How thin retrieval has to be to count as strain: fewer than this many passages carrying the question's own words. */
export const THIN_PASSAGES = 2;
/**
 * How much of the question's vocabulary the material must carry before its
 * absence counts as strain. Declared, and now placed against a measured
 * distribution rather than left bare: over 264 real turns of the long-stream
 * run, coverage ran min 0.00 · p25 0.43 · median 0.63 · p75 1.00, and this
 * floor catches the bottom 14%. It is a declared cut at roughly the first
 * sixth, not a tuned one — no arm was run to choose it.
 */
export const COVERAGE_FLOOR = 0.34;

/**
 * strainOf(signals) → { level, reasons, coverage }
 *
 * level 0  nothing to deliberate about — the answer is exactly known (S1 alone)
 *       1  ordinary: the material speaks to the question and nothing conflicts
 *       2  something is off: thin retrieval, poor vocabulary coverage, a
 *          premise that did not check out, or a decomposed question
 *       3  conflict: sources disagree, or a claim already known to be wrong is
 *          in scope, or several strains at once
 *
 * Every reason is named, so the rung is never a bare number on the record.
 */
export function strainOf({
  question = "",
  answeredBeforeTheModel = null,
  passages = [],
  premiseCheck = null,
  disagreements = 0,
  learnedInScope = 0,
  parts = 1,
  askedFor = null,
  // A reading from calibration.js placing this turn's coverage against the
  // stream's own null: { strained: true|false|null, why }. Absent, the
  // declared floor decides and says so.
  placement = null,
} = {}) {
  // S1 answered outright. There is nothing for S2 to be lazy about.
  if (answeredBeforeTheModel) return { level: 0, reasons: ["the answer is known exactly, with an address"], coverage: 1 };

  const reasons = [];
  const qw = words(question);
  const carried = new Set();
  for (const p of passages) { const t = fold(p?.text ?? ""); for (const w of qw) if (t.includes(w)) carried.add(w); }
  const coverage = qw.size ? carried.size / qw.size : null;

  // Each strain is recorded with the level it argues for, so the reason
  // reported first is the one that actually drove the rung — a record that
  // says "depth 3" must say why in the same breath.
  const found = [];
  const onPoint = passages.filter((p) => { const t = fold(p?.text ?? ""); return [...qw].some((w) => t.includes(w)); }).length;
  // Nothing on point is a strain. FEW passages is not: a single chunk that
  // carries everything the question asks about is the easiest case there is,
  // and counting it as difficulty measured how the material happened to be
  // cut rather than how hard the question is.
  if (passages.length && onPoint === 0) found.push([2, `none of the ${passages.length} retrieved passage(s) speak to the question`]);
  else if (passages.length > THIN_PASSAGES && onPoint / passages.length < 0.34 && (coverage ?? 1) < 0.75) found.push([2, `only ${onPoint} of ${passages.length} passage(s) speak to the question`]);
  // THE CUT IS MEASURED WHERE IT CAN BE (P131/P132, calibration.js): the
  // caller may hand a placement of this coverage against a null built from
  // the stream's own recent regime. A declared floor cannot be right across
  // corpora — 0.34 is unremarkable on a critical edition and alarming on a
  // novel — so the floor is only the FALLBACK, and the record says which was
  // used. A reading that could not be made never reads as "no strain".
  if (coverage != null) {
    if (placement && placement.strained === true) found.push([2, placement.why]);
    else if (placement && placement.strained === false) { /* measured ordinary — the floor does not get a second vote */ }
    else if (coverage < COVERAGE_FLOOR) found.push([2, `the material carries ${Math.round(coverage * 100)}% of what the question asks about${placement?.why ? ` (no null yet: ${placement.why})` : ""}`]);
  }
  if (premiseCheck && (premiseCheck.unverified?.length || premiseCheck.contradicted?.length)) {
    const n = (premiseCheck.unverified?.length ?? 0) + (premiseCheck.contradicted?.length ?? 0);
    found.push([premiseCheck.contradicted?.length ? 3 : 2, `${n} thing(s) the question takes as settled ${premiseCheck.contradicted?.length ? "the sources contradict" : "are not in the material"}`]);
  }
  if (parts > 1) found.push([2, `the question was read as ${parts} parts`]);
  if (disagreements > 0) found.push([3, `${disagreements} claim(s) the sources disagree on`]);
  // NOT A STRAIN, and measured not to be. Having corrections in scope was
  // read as difficulty in the first draft of this file, and over a real run
  // it fired on 148 of 214 turns — pushing 62% of everything to level 2 and
  // making S2 recruit MORE on most turns, which is the opposite of the point.
  // Prior corrections are information, not difficulty: they say what to avoid,
  // the guard (P126) already enforces them mechanically, and knowing them
  // makes a question easier rather than harder. Kept as a reading on the
  // record, never as a reason to spend.
  const informed = learnedInScope;
  let level = found.reduce((m, [l]) => Math.max(m, l), 1);
  // Several ordinary strains at once are not ordinary.
  if (level === 2 && found.length >= 3) { level = 3; found.push([3, "several at once"]); }
  found.sort((a, b) => b[0] - a[0]);
  reasons.push(...found.map(([, r]) => r));
  if (reasons.length === 0) reasons.push("the material speaks to the question and nothing conflicts");
  return { level, reasons, coverage, informed, cut: placement?.strained == null ? "declared floor" : "measured against this stream's own null" };
}

/**
 * recruit(strain, { asked, floor, ceiling }) → { depth, why }
 * The rung strain recruits, held inside what the person asked for. A slider
 * set deliberately is a FLOOR (ask for care, get at least care) and a
 * ceiling (never spend more than was asked for), so strain moves within it
 * and never over it. `asked` null means the person expressed no preference
 * and strain decides alone.
 */
export function recruit(strain, { asked = null, floor = 0, ceiling = 3 } = {}) {
  const want = Math.max(floor, Math.min(ceiling, strain?.level ?? 1));
  if (asked == null) return { depth: want, why: `recruited by strain: ${strain?.reasons?.[0] ?? "unmeasured"}` };
  // A deliberate ask is honoured: it floors AND caps what strain may do.
  const depth = Math.max(Math.min(asked, ceiling), Math.min(want, asked));
  return {
    depth: asked >= want ? asked : Math.min(want, asked),
    why: asked >= want
      ? `asked for depth ${asked}; strain alone would have taken ${want}`
      : `asked for depth ${asked}, which caps the ${want} that strain would have recruited`,
  };
}

/**
 * substituted(question, answer) → { substituted, asked, answered, shared } | null
 *
 * ATTRIBUTE SUBSTITUTION, the failure S1 is named for: asked a hard question,
 * it answers an easier neighbouring one and the swap goes unnoticed. Here it
 * is visible without a model — the question's own content words against the
 * answer's. An answer sharing almost nothing with what was asked has changed
 * the subject, whatever its fluency. Measured live: asked what filled a blank
 * in a named passage, the mouth returned a general essay on how language
 * models analyse text, and nothing flagged it.
 *
 * A short answer is not judged (there is too little to read), and neither is
 * a question with almost no content words of its own.
 */
export function substituted(question, answer, { floor = 0.2, minWords = 12 } = {}) {
  const qw = words(question);
  const aw = words(answer);
  if (qw.size < 3 || aw.size < 3) return null;
  if (String(answer ?? "").split(/\s+/).filter(Boolean).length < minWords) return null;
  const shared = [...qw].filter((w) => aw.has(w));
  const share = shared.length / qw.size;
  return { substituted: share < floor, share, shared, asked: [...qw], answered: aw.size };
}
