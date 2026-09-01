// pass-delta.js — what the checking actually changed.
//
// USER DIRECTION, 2026-08-27: "we should also use the delta between system 1
// and 2 as information."
//
// S1 answers instantly from what the model already carries; S2 answers after
// retrieval, grounding and correction. Both are computed on every gated turn
// and until now the FIRST was simply overwritten by the second — the fast
// answer rendered, then replaced, and whatever the difference between them
// was went in the bin. That difference is the single most direct measurement
// this instrument can make of its own apparatus: it is the answer to "did
// the checking earn its keep on this turn", available for free, every turn,
// with no extra model call.
//
// MECHANICAL, and it has to be. Asking a model "did your second answer
// differ from your first" would be the exact self-report this repo refuses
// everywhere else (testimony.js's "the model is only the mouth", the whole
// verdict-derived-not-declared discipline). What is compared here is what
// each pass NAMED — a set difference over the surfaces each one carries —
// and the verdict falls out of the arithmetic.
//
// THE ORGAN IS `extractSurfaces`, and the first choice was wrong. `cite.js`'s
// `namesIn` was tried and refused on the merits: it admits only multi-word
// capitalised runs and acronyms, because a false positive THERE vetoes a
// citation, so it is deliberately conservative — and it returns nothing at
// all for "Paris". The cost profile here is the opposite (a missed name is a
// missed signal, not a wrongly-vetoed claim), so the general surface reader
// is the right one: the same organ `cast.js` already builds its referent
// index from.
//
// THE FOUR OUTCOMES, and why the boring one matters most:
//
//   confirmed  S2 named what S1 named. The instant answer survived contact
//              with the material. Worth recording precisely BECAUSE it is
//              boring: a long run of these is the evidence that a cheaper
//              path exists for a whole class of question, and nothing else
//              in this instrument measures that.
//   extended   S2 named everything S1 did, and more. The Lincoln shape: S1
//              says Hamlin, the material adds Johnson. This is the
//              completeness gate's own success, seen from the other side.
//   corrected  S2 dropped something S1 named. The instant answer asserted
//              something the material did not support — the case the whole
//              grounding ladder exists for.
//   diverged   Both dropped and added. Not a stronger "corrected": a turn
//              where the two passes are about different things is a
//              different fact, and collapsing it into "corrected" would
//              overstate what was measured.
//
// A DELTA IS NOT A VERDICT ON EITHER PASS. S2 dropping a name is not proof
// S1 was wrong — S2 answers from retrieved material and can be narrower for
// good reasons (a passage that never mentioned someone real). This measures
// what CHANGED, which is a fact; who was right is a separate question this
// module does not answer and must not appear to.
//
// PURE. The reading organ is injected (the cast.js discipline) so this
// module carries no regexes and no sentence splitter of its own.

/** Fold a name for comparison: case and surrounding punctuation only. NOT a
 * referent index — "Hamlin" and "Hannibal Hamlin" are different strings here
 * and this module knows it (see `foldedBy` on the result). Using the real
 * referent index (cast.js::makeReferentIndex) would make this a genuine
 * identity comparison rather than a string one, and is the honest upgrade
 * path; it needs material to build an index FROM, which a delta between two
 * answers does not have on its own. */
const foldName = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[.,;:!?'"“”‘’()]/g, "")
    .trim();

const NOT_NAMES = new Set(["i", "it", "he", "she", "they", "we", "you", "the", "a", "an", "this", "that"]);

/**
 * The delta between the two passes, as a fact about what changed.
 *
 * `surfacesOf(text) -> string[]` is injected — the engine's own
 * `extractSurfaces` over `splitSentences`, composed by the caller, so this
 * module carries no reading organ and no sentence splitter of its own.
 * Returns null when there is nothing to compare (no S1 pass ran, or a pass
 * produced no text at all): a delta against an absent pass is not "confirmed",
 * it is not a measurement, and saying so is the point.
 */
export function passDelta(s1Text, s2Text, { surfacesOf } = {}) {
  if (typeof surfacesOf !== "function") throw new TypeError("passDelta: surfacesOf is injected — this module carries no reading organ of its own");
  const a = String(s1Text ?? "").trim();
  const b = String(s2Text ?? "").trim();
  if (!a || !b) return null;

  // THE CANDIDATE SET IS THE UNION; PRESENCE IS CONTAINMENT. Found by
  // running it: `extractSurfaces` correctly declines a SENTENCE-INITIAL
  // capital as evidence of a name (L2 — capitalisation is a differentiator,
  // never the primary signal), so "Paris is the capital of France." yields
  // only ["France"], while "The capital of France is Paris." yields both.
  // Comparing the two readings directly would have reported a name DROPPED
  // when both answers plainly said it — a false "corrected" on nothing more
  // than word order, which is exactly the kind of manufactured finding this
  // repo refuses everywhere else.
  //
  // So the reader is used for the question it is good at — which tokens are
  // names at all — pooled across both passes, and whether a given name is
  // PRESENT in a pass is then a word-boundary containment check against that
  // pass's own raw text. The conservative organ still decides what counts as
  // a name; it is simply no longer required to find every occurrence of one.
  const candidates = new Set();
  for (const t of [a, b]) {
    for (const n of surfacesOf(t)) {
      const f = foldName(n);
      if (f && !NOT_NAMES.has(f)) candidates.add(f);
    }
  }
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const present = (text, name) => new RegExp(`(^|[^\\p{L}\\p{N}])${escape(name)}([^\\p{L}\\p{N}]|$)`, "iu").test(text);
  const first = new Set([...candidates].filter((n) => present(a, n)));
  const second = new Set([...candidates].filter((n) => present(b, n)));
  const dropped = [...first].filter((n) => !second.has(n));
  const added = [...second].filter((n) => !first.has(n));
  const kept = [...first].filter((n) => second.has(n));

  const verdict =
    dropped.length && added.length ? "diverged" : added.length ? "extended" : dropped.length ? "corrected" : "confirmed";

  return {
    schema: "EOPassDelta@1",
    verdict,
    kept,
    added,
    dropped,
    // Said out loud rather than left for a reader to assume: this is a
    // string comparison, so "Hamlin" and "Hannibal Hamlin" read as two
    // different names. A real referent index would fold them; see foldName.
    foldedBy: "case and punctuation only — not a referent index",
  };
}

/**
 * One line, for the ledger and the reader. Names what changed and nothing
 * about who was right — see the module header on why that separation is
 * load-bearing.
 */
export function deltaLine(delta) {
  if (!delta) return null;
  const list = (xs) => xs.slice(0, 4).join(", ") + (xs.length > 4 ? `, and ${xs.length - 4} more` : "");
  if (delta.verdict === "confirmed") return "checking confirmed the first answer — nothing named changed";
  if (delta.verdict === "extended") return `checking added ${list(delta.added)}`;
  if (delta.verdict === "corrected") return `checking dropped ${list(delta.dropped)}`;
  return `checking added ${list(delta.added)} and dropped ${list(delta.dropped)}`;
}
