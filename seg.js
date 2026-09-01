// seg.js — is the unit a span is stated in fit to state it? Pure; the
// unit algebra is injected (`math`, mathjs — the cast.js organ-injection
// pattern this repo already holds `verbForms`/`createLemmatizer`/
// `resolvePronouns` to), so this module stays node-testable against the
// real package and the page keeps loading `window.math` it already
// vendors for arithmetic.js.
//
// WHY THIS EXISTS, from the incident that produced it. Building the
// precise-date reader in succession.js, the finding was written up in
// prose as: "Johnson proves the point — his year span is the useless
// 1865-1865." That sentence is a real SEG judgment (an extent is being
// called unfit for what it has to cover) arrived at the one way this repo
// says a judgment must never be arrived at: a reader looked at it and
// thought so. User direction, verbatim: "use math.js or similar to
// mechanically find SEG issues with things like this."
//
// So the judgment is arithmetic here, and no one is asked to notice it.
// The three findings below are each a COMPARISON BETWEEN TWO GRAINS of
// the same material, never a threshold on one:
//
//   collapsed          the coarse reading is a POINT (zero extent) while
//                      the fine reading is a real duration. The unit is
//                      not merely imprecise — at this grain the span has
//                      no extent at all, so `void-shape.js`'s own
//                      coverage arithmetic (`from <= last.to`, the
//                      subtraction that finds a hole) is operating on a
//                      degenerate interval and cannot report anything
//                      true about it.
//   indistinguishable  two spans read IDENTICALLY at the coarse grain and
//                      differently at the fine one. The unit cannot
//                      separate two things the material does separate —
//                      which is the same defect `checkObjectSpecificity`
//                      already closes for objects ("president" matching
//                      "vice president"), one axis over.
//   unreadable         no fine reading is available, so neither check
//                      ran. Reported as a GAP, never as a pass — P41's
//                      own rule: a check may report what it checked, or
//                      say it did not check; it may never report a check
//                      it never ran as though it had.
//
// Nothing here sets a cut. "Is this span long enough" is not asked and
// has no non-arbitrary answer; "does this unit distinguish what the
// material distinguishes" is asked, and is decided by comparison alone.

// The unit ladder, RECEIVED (giver: the Gregorian calendar's own named
// divisions, as mathjs implements them) and declared here rather than
// derived — the same standing `priors.js`'s DEFINITE_DETERMINERS carries.
// Ordered coarse to fine, because `fitUnit` below returns the FIRST that
// works and "coarsest that actually separates" is the rule: a finer unit
// than the material needs states precision the material never had.
export const UNIT_LADDER = ["years", "months", "days"];

const MS_PER_DAY = 86400000;

/**
 * A span's own fine reading, in days, off the precise dates
 * `succession.js::officeSpanOf` attaches when the record states them.
 * `null` — never 0 — when there is nothing precise to read: a missing
 * reading and a zero-length one are different facts, and collapsing them
 * is exactly what makes `unreadable` indistinguishable from `collapsed`.
 *
 * Both endpoints are parsed with the SAME parser, so a pre-1900 date's
 * local-mean-time offset (real: "March 4, 1865" parses at 05:32:11 in a
 * historical LMT zone) appears identically on both sides and subtracts
 * out. That is why this returns a DIFFERENCE and never an absolute
 * instant — an absolute instant here would carry a timezone artifact into
 * a claim about the world.
 */
export function fineDays(span) {
  if (!span?.fromText || !span?.toText) return null;
  const a = Date.parse(span.fromText);
  const b = Date.parse(span.toText);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const days = (b - a) / MS_PER_DAY;
  return days >= 0 ? days : null;
}

/**
 * The coarse reading: the span as its own stated numeric endpoints give
 * it, in whole years. This is what `void-shape.js` actually computes
 * coverage over (its `hasSpan` requires `Number.isFinite` on both ends),
 * so it is the reading whose fitness is in question.
 */
export const coarseYears = (span) =>
  Number.isFinite(span?.from) && Number.isFinite(span?.to) ? span.to - span.from : null;

const sameCoarse = (a, b) => coarseYears(a) === coarseYears(b) && a?.from === b?.from && a?.to === b?.to;

/**
 * segIssues — every way the coarse unit fails the spans it is stating.
 *
 * `spans` is an array of `{filler?, span}` (successionFillers's own shape
 * passes straight in) or of bare span objects. `math` is mathjs; it does
 * the unit conversion so the reported fine extent is a real
 * `math.unit` reading rather than a number this file divided by a
 * hardcoded 365.
 */
export function segIssues(entries, { math, unit = "years" } = {}) {
  if (!math) throw new TypeError("segIssues needs mathjs injected as `math` — no unit algebra, no finding");
  const items = (entries ?? []).map((e) => (e && "span" in e ? e : { filler: null, span: e }));
  const issues = [];

  for (const { filler, span } of items) {
    const coarse = coarseYears(span);
    const days = fineDays(span);
    if (coarse === null) continue; // not a span this reader can speak about at all
    if (days === null) {
      issues.push({
        type: "unreadable",
        filler,
        span,
        detail: `no precise dates on this record, so whether "${unit}" can state it was never checked`,
      });
      continue;
    }
    if (coarse === 0 && days > 0) {
      const fine = math.unit(days, "days");
      issues.push({
        type: "collapsed",
        filler,
        span,
        days,
        detail:
          `stated in ${unit} this spans ${coarse} — a point, not an extent — ` +
          `while the record's own dates give ${fine.toString()} ` +
          `(${fine.to(unit).toString()})`,
      });
    }
  }

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (!sameCoarse(a.span, b.span)) continue;
      const da = fineDays(a.span);
      const db = fineDays(b.span);
      if (da === null || db === null || da === db) continue;
      issues.push({
        type: "indistinguishable",
        filler: [a.filler, b.filler],
        span: [a.span, b.span],
        detail:
          `${a.filler ?? "one"} and ${b.filler ?? "the other"} both read ` +
          `${a.span.from}-${a.span.to} in ${unit}, but their own dates give ` +
          `${math.unit(da, "days").toString()} and ${math.unit(db, "days").toString()}`,
      });
    }
  }
  return issues;
}

/**
 * fitUnit — the COARSEST unit on the received ladder at which no span
 * collapses to a point and no two spans stop being distinguishable.
 *
 * Derived, not chosen: it walks the ladder and returns the first unit
 * that clears, so the answer is a fact about these spans rather than a
 * preference about units. `null` when no unit on the ladder clears (the
 * honest outcome for spans whose own dates are identical, or absent —
 * never a silent fall through to the finest unit, which would state a
 * precision that was never earned).
 */
export function fitUnit(entries, { math, ladder = UNIT_LADDER } = {}) {
  if (!math) throw new TypeError("fitUnit needs mathjs injected as `math`");
  const items = (entries ?? []).map((e) => (e && "span" in e ? e : { filler: null, span: e }));
  const readable = items.filter((it) => fineDays(it.span) !== null);
  if (!readable.length) return null;
  for (const unit of ladder) {
    const extents = readable.map((it) => math.unit(fineDays(it.span), "days").toNumber(unit));
    // A unit states a span as a point when the span rounds to zero in it.
    if (extents.some((x) => Math.round(x) === 0)) continue;
    // ...and fails to separate when two DIFFERENT real extents round the same.
    const rounded = extents.map((x) => Math.round(x));
    const collides = rounded.some((x, i) => rounded.some((y, j) => i !== j && x === y && extents[i] !== extents[j]));
    if (collides) continue;
    return unit;
  }
  return null;
}
