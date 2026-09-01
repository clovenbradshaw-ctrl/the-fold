// sameness.js — a kind, or the same thing twice? Pure.
//
// THE DEFINITION THIS IMPLEMENTS, user's own words (2026-08-28): "things are
// KINDS to the degree that they share all parameter slots but they cannot
// share all parameters or they are the same thing."
//
// Two clauses, and the second is the one already-built machinery misses.
// `emergence/kinds.js`'s `parameterProfiles` builds PRESENCE vectors —
// `keys.map(k => has.has(k) ? 1 : 0)` — so its cohesion measures which slots
// are filled and is structurally blind to what fills them. Run live on eight
// records shaped `{P39, PA}×4` and `{P39, PB}×4`, `induceKinds` returned a
// kind of Q0-Q3 at cohesion 1 — four records agreeing on every slot AND
// every value, which under the definition above is one thing described four
// times, not a kind of four. The module is not unaware of the distinction
// (`valuedSimilarity`, and `def`'s own `{scales, valued}`), but the plain
// induction path does not use it.
//
// So this file measures the CONJUNCTION the definition actually names:
// agreement on slots, and DISagreement on the values in them.
//
// NO THRESHOLD LIVES HERE, and that is why the verdicts are only at the
// exact poles. "How much shared is shared enough" has no non-arbitrary
// answer and this repo's own law (P4/P9) refuses to invent one — so
// `identity` fires only at exact total agreement, `unrelated` only at exact
// zero overlap, and everything in between is returned as two degrees for a
// caller to read. A number is stated; nothing is adjudicated.

const attrsOf = (rec) => (rec?.attributes ?? []).filter((a) => a && a.field_id != null);
const slotsOf = (rec) => new Set(attrsOf(rec).map((a) => String(a.field_id)));
const valuesOf = (rec) => {
  const m = new Map();
  for (const a of attrsOf(rec)) m.set(String(a.field_id), a.value === undefined ? null : a.value);
  return m;
};
const stable = (v) => (typeof v === "string" ? v : JSON.stringify(v ?? null));

/** Jaccard over which slots are filled — kinds.js's own presence measure,
 *  reused rather than re-derived so the two files cannot drift apart. */
export function slotAgreement(a, b) {
  const A = slotsOf(a);
  const B = slotsOf(b);
  if (!A.size && !B.size) return 0;
  let common = 0;
  for (const k of A) if (B.has(k)) common++;
  return common / (A.size + B.size - common);
}

/**
 * valueAgreement(a, b) — of the slots BOTH fill, how many hold the same
 * value. `null` when they share no slot at all: two records with nothing in
 * common have no value agreement to report, and returning 0 would say they
 * disagree about something, which is a claim about a comparison that never
 * happened (P41).
 */
export function valueAgreement(a, b) {
  const va = valuesOf(a);
  const vb = valuesOf(b);
  let shared = 0;
  let same = 0;
  for (const [k, v] of va) {
    if (!vb.has(k)) continue;
    shared++;
    if (stable(v) === stable(vb.get(k))) same++;
  }
  return shared ? same / shared : null;
}

const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

/**
 * kindOrSame(records) — the two degrees, and a verdict only where the answer
 * is exact.
 *
 *   identity   every pair fills the same slots AND agrees on every value —
 *              one thing described N times, which the definition excludes
 *   unrelated  no pair shares a single slot; there is no kind to be had
 *   kind       slots agree and values do not, to the degrees reported
 *   degenerate fewer than two records, or nothing to compare
 *
 * `slots` and `values` are mean pairwise degrees, both in 0..1. `values` is
 * null when no pair shares a slot, and a caller must not read that as 0.
 */
export function kindOrSame(records) {
  const recs = (records ?? []).filter((r) => attrsOf(r).length);
  if (recs.length < 2) {
    return { verdict: "degenerate", slots: null, values: null, pairs: 0, reason: "fewer than two records carry any slot" };
  }
  const slotPairs = [];
  const valuePairs = [];
  for (let i = 0; i < recs.length; i++) {
    for (let j = i + 1; j < recs.length; j++) {
      slotPairs.push(slotAgreement(recs[i], recs[j]));
      const v = valueAgreement(recs[i], recs[j]);
      if (v !== null) valuePairs.push(v);
    }
  }
  const slots = mean(slotPairs);
  const values = mean(valuePairs);
  const pairs = slotPairs.length;

  // The exact poles, and nothing else is adjudicated here.
  if (slots === 0) {
    return { verdict: "unrelated", slots, values, pairs, reason: "no pair fills a slot in common" };
  }
  if (slots === 1 && values === 1) {
    return {
      verdict: "identity",
      slots,
      values,
      pairs,
      reason: "every pair fills the same slots and agrees on every value — one thing described more than once, not a kind of several",
    };
  }
  return { verdict: "kind", slots, values, pairs, reason: null };
}
