// referent-fold.js — a bare candidate folds into a longer established one
// when every one of its OCCURRENCES sits INSIDE the ADDRESS of an
// occurrence of the longer candidate. Not shape. Not prefix-or-suffix as
// token sequences. ADDRESS CONTAINMENT — the same primitive P5.2 already
// holds everywhere else in this project (an address either resolves in
// the source's own bytes or it doesn't), aimed here at a question about
// identity instead of a question about citation. "Span" was this file's
// own first-draft word for it; "address" is the name the rest of this
// project already uses for exactly this thing, and there is no reason
// for this module to say something different.
//
// THE BUG THIS REPLACES, found live by the user reading the actual output
// (2026-09-01): the first cut of this module compared bare START OFFSETS
// against a compound's own start offset — which can only ever match a
// PREFIX ("Van" starting where "Van Helsing" starts). "Helsing", the
// SUFFIX, starts partway INSIDE "Van Helsing"'s own span, never at its
// start, so it silently never matched and stayed its own referent —
// visible live in the Cast panel, 62 mentions, never folded. The fix is
// not "also check the end" as a second special case; it is the realization
// that PREFIX was already the special case. Containment is the general
// rule prefix, suffix, and infix are all instances of.
//
// WHY THIS IS THE UNIVERSAL FORM, not merely a bigger English fix (user
// direction, verbatim: "find the universal rule that would have caught
// this, a rule that would also work for music and japanese"):
//
//   ENGLISH, prefix.  "Van" ⊂ "Van Helsing"       — address containment.
//   ENGLISH, suffix.  "Helsing" ⊂ "Van Helsing"   — address containment.
//   JAPANESE.  No whitespace delimits words at all, so "prefix/suffix as
//     TOKENS" is not even a coherent question — but a substring's own
//     BYTE SPAN sitting inside a longer compound's byte span is exactly as
//     well-defined as it is in English, because it never depended on
//     tokenization to begin with.
//   MUSIC.  A short recurring motif is the "bare candidate"; a longer
//     phrase that always contains it, at the same relative position, is
//     the "compound" — the ADDRESS space is TIME (or sample offset), not
//     bytes, but "does every occurrence of the short address sit inside
//     an occurrence of the long address" is the identical question,
//     unchanged, the same way `spans.js`'s own byte-offset discipline
//     already generalizes to whatever medium supplies the addresses
//     (S16: "the kernel is omnimodal; the medium's grammar lives in an
//     adapter").
//
// SO THE MODULE IS SPLIT ON THAT LINE. `containmentFraction` takes
// ADDRESSES — {start, end} pairs from ANY addressed source — and knows
// nothing about text, English, or word boundaries; it is the portable
// core. `addressesOf` (text-specific; `spansOf`/`offsetsOf` kept as
// aliases) is the ONE text adapter, exactly analogous to `spans.js`
// itself: a medium supplies its own way of finding where a candidate
// occurs, and hands containmentFraction the addresses, never the other
// way around.

/**
 * What fraction of `bareSpans` is fully CONTAINED inside some span in
 * `compoundSpans`? A bare span [s,e) is covered by a compound span [cs,ce)
 * when cs <= s && e <= ce — full containment, not merely overlap (a
 * candidate that only partially overlaps a longer one is not the same
 * occurrence of it, it is two things that happen to touch).
 *
 * Returns { bareCount, coveredCount, fraction, exact } — `exact` is true
 * only at fraction === 1 (predication.js's own "invariant, not merely
 * likely" bar), the ONLY standing this module ever certifies as decisive
 * on its own.
 */
export function containmentFraction(bareSpans, compoundSpans) {
  const bare = Array.isArray(bareSpans) ? bareSpans : [];
  const compounds = Array.isArray(compoundSpans) ? compoundSpans : [];
  if (!bare.length) return { bareCount: 0, coveredCount: 0, fraction: null, exact: false };
  let covered = 0;
  for (const b of bare) {
    const isCovered = compounds.some((c) => c.start <= b.start && b.end <= c.end);
    if (isCovered) covered += 1;
  }
  const fraction = covered / bare.length;
  return { bareCount: bare.length, coveredCount: covered, fraction, exact: fraction === 1 };
}

/**
 * Every SPAN where `surface` occurs in `text`, as a standalone token or
 * phrase (word-boundary matched, case-sensitive, whitespace-tolerant across
 * a multi-word surface's own words — a hard line wrap is still the same
 * two words the author wrote adjacent). THE ONE TEXT-SPECIFIC ADAPTER in
 * this module — a different medium supplies spans a different way (a
 * musical reading's own onset/offset detector; a Japanese reader's own
 * segmentation, or none at all if it addresses raw byte ranges directly),
 * and containmentFraction above never needs to know which.
 */
export function spansOf(text, surface) {
  const s = String(text ?? "");
  const needle = String(surface ?? "").trim();
  if (!needle) return [];
  const words = needle.split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = words.join("\\s+");
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`, "gu");
  const out = [];
  let m;
  while ((m = re.exec(s))) out.push({ start: m.index, end: m.index + m[0].length });
  return out;
}

/** Back-compat convenience: bare START offsets, for a caller that only needs positions. */
export function offsetsOf(text, surface) {
  return spansOf(text, surface).map((s) => s.start);
}

/**
 * Does `bare` genuinely fold into `compound` — measured by SPAN
 * CONTAINMENT, not string shape, so a prefix, a suffix, or an infix all
 * fold on the identical test. `text` is scanned once for each surface's
 * own real spans; the verdict is `containmentFraction`'s own `exact`.
 */
export function measuredFold(text, bare, compound) {
  const bareSpans = spansOf(text, bare);
  const compoundSpans = spansOf(text, compound);
  const c = containmentFraction(bareSpans, compoundSpans);
  return { bare, compound, ...c, folds: c.exact && c.bareCount > 0 };
}
