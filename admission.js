// admission.js — the discourse-admission gate: should a WHOLE SOURCE even be
// treated as material for THIS question?
//
// The specimen this closes. An old, unrelated attachment (a Sourcewell RFP
// procurement webinar transcript) stayed loaded from an earlier demo; asked
// "write me an essay on the x-files" (the TV show), the turn answered with a
// summary of the RFP transcript instead — dressed with the full citation
// apparatus (badges, a checking-online status line) as if that were
// legitimate grounding for an essay about a television show. Reproduced live
// and with a direct unit test against the real `retrieve()` (source.js):
// the transcript shared exactly one token with the question ("write", a
// common verb any sufficiently long transcript is likely to contain
// somewhere by chance) and `retrieve()` — which has NO relevance floor BY
// DESIGN, P4 — ranked and returned that chunk as this turn's best passage.
//
// P4 is a floor on SCORING (retrieve() must not decline to answer just
// because nothing scored highly — an honest empty result is a real finding,
// never guessed away). It says nothing about ADMISSION: whether a source
// should be offered to retrieve() at all for a question it shares almost
// nothing with. This module answers that earlier, coarser question, so
// retrieve()'s own policy stays exactly as declared — nothing here touches
// source.js, and a caller that never uses this module gets byte-identical
// retrieve() behaviour.
//
// THE FLOOR IS A COUNT, NOT A RATIO, AND IT IS REUSED, NOT INVENTED. A
// proportion of the question's own vocabulary (the shape aletheia.js's
// ADDRESSED gate already uses, 25%) fails on short questions: a 3-content-
// word question ("write", "essay", "x-files") clears 25% on a SINGLE
// coincidental match, which is exactly the failure being closed. What this
// codebase already uses, repeatedly, as "how much recurrence makes a
// pattern rather than noise" is the count 2 — activation.js's cue gate,
// binding.js's arrivals floor, clippy.js's own DMD gate (`n >= 2`),
// asserted.js's WITNESS_FLOOR. Reused here, not re-derived: a source must
// share at least two of the question's own distinct content words (never
// more than the question actually offers — `min(floor, qTerms.length)`, so
// a one-content-word question is not held to an impossible bar) to be
// admitted as material for it. A single shared word is exactly the shape of
// a chance collision (a common verb, a stray "the case_number column"); two
// independent words in common is the same structural minimum this codebase
// already trusts everywhere else to tell a pattern from noise.
//
// DISCOURSE-GATE LOGIC, one level coarser than Clippy's. `clippy.js`'s own
// DISCOURSE gate ("the figure must engage the beings the question is
// about") operates on an extracted CLAIM against referents the READING has
// already established — the right tool once a hypergraph exists, but
// unusable at admission time: on a first-turn question there is no reading
// yet to have established anything, and a whole source is not a claim.
// This module asks the coarser, earlier question a claim-level check
// cannot: does this SOURCE'S OWN VOCABULARY engage the QUESTION'S OWN
// WORDS at all, before any extraction happens? Same posture (a claim/source
// that engages nothing the question is about is refused, never silently
// bound), applied one door earlier.
//
// A FRESH ASK WITH NO CONTENT WORDS IS UNGATEABLE, NEVER REFUSED — the same
// rule Clippy's own DISCOURSE gate states for a claim with no born referent.
// tokenize() already strips stopwords (source.js's own STOPWORDS set), so a
// question that tokenizes to nothing has no vocabulary to gate on; every
// source is admitted, and retrieve()'s own no-relevance-floor scoring is
// exactly as declared for it.
//
// PURE. `tokenize` is the one organ, injected (cast.js pattern) so this
// stays testable without importing the engine shim.

export const ADMISSION_FLOOR = 2;

export function makeAdmission({ tokenize } = {}) {
  if (typeof tokenize !== "function") throw new TypeError("makeAdmission: tokenize is injected");

  function questionTerms(question) {
    return [...new Set(tokenize(String(question ?? "")))];
  }

  /** Does `sourceText` share enough of `question`'s own vocabulary to be
   * admitted as material for it? Returns a typed verdict, never a bare
   * boolean — the reason is what makes a refusal disclosable rather than a
   * silent drop (this codebase's own standing rule: a gap is a result). */
  function sourceAdmits(question, sourceText, { floor = ADMISSION_FLOOR } = {}) {
    const qTerms = questionTerms(question);
    if (!qTerms.length) {
      return { admitted: true, ungateable: true, shared: [], need: 0, qTermsCount: 0, reason: "the question has no content words to gate on" };
    }
    const sTerms = new Set(tokenize(String(sourceText ?? "")));
    const shared = qTerms.filter((t) => sTerms.has(t));
    const need = Math.min(floor, qTerms.length);
    const admitted = shared.length >= need;
    return {
      admitted,
      ungateable: false,
      shared,
      need,
      qTermsCount: qTerms.length,
      reason: admitted
        ? `shares ${shared.length} of the question's own word(s): ${shared.join(", ")}`
        : `shares only ${shared.length} of the question's ${qTerms.length} distinct word(s) (${shared.join(", ") || "none"}) — needs ${need}; refused as discourse-irrelevant to this question`,
    };
  }

  /** `sources`: [{name, text}]. Splits into admitted/refused, each entry
   * carrying its own verdict — never a bare filtered array, so a caller can
   * disclose exactly what was set aside and why. */
  function admitSources(question, sources, opts) {
    const admitted = [];
    const refused = [];
    for (const s of sources ?? []) {
      const v = sourceAdmits(question, s?.text, opts);
      (v.admitted ? admitted : refused).push({ ...s, ...v });
    }
    return { admitted, refused };
  }

  return { questionTerms, sourceAdmits, admitSources };
}
