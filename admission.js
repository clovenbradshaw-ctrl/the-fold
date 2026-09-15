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
// stays testable without importing the engine shim. `splitSentences` is a
// second, OPTIONAL injected organ — see COMPANY, below.
//
// COMPANY, NOT BARE OCCURRENCE (added 2026-09-15; Generality: universal —
// P71's own gate, reused rather than re-argued). Found live, on the real
// running page, asking a genuinely unrelated question ("what's today's
// date, and can you check the web for one real current headline?") against
// the SAME stale Sourcewell transcript this file's own specimen names: the
// transcript shares "today" (its own opening line, "thank you for joining
// today's webinar") and "date" (a different paragraph, "keep their
// reference files up to date") with the question — two DISTINCT content
// words, clearing ADMISSION_FLOOR, admitted, and the turn answered from the
// transcript again. Both words are real content words (correctly not
// stopwords — tokenize() is right to keep them), but they never appear
// TOGETHER anywhere in the source; each is independently, coincidentally
// present. A bare word-count floor cannot tell "these two words are here
// because this document is actually about what was asked" from "a long
// enough document contains almost any two common words somewhere," and
// longer sources make the coincidence more likely, not less — the same
// bag-of-words blind spot P31 ("Number grounding: company, not bare
// occurrence") already named and fixed one level down, for a single number
// matching anywhere in a passage rather than in the SENTENCE that actually
// states it. Applied here one level up: admission's own floor, once
// cleared, now asks whether `need` of the shared words are attested
// TOGETHER in at least one sentence of the source — not merely each
// somewhere in it. `splitSentences` is optional and defaults to undefined,
// so a caller that never injects it (this module's own existing tests, any
// caller built before this date) gets the exact prior behaviour, byte for
// byte — this is a strictly narrower admission, applied only where the
// caller has opted in by supplying a sentence-splitter.

// Derived, not hand-picked: the same structural minimum clippy.js's own DMD
// gate (`n >= 2`) and binding.js's arrivals floor already use for "how much
// recurrence makes a pattern rather than noise" — reused here by construction,
// never re-derived. See this file's own header, above, for the full reasoning.
export const ADMISSION_FLOOR = 2;

export function makeAdmission({ tokenize, splitSentences } = {}) {
  if (typeof tokenize !== "function") throw new TypeError("makeAdmission: tokenize is injected");

  function questionTerms(question) {
    return [...new Set(tokenize(String(question ?? "")))];
  }

  /** Do at least `need` of `shared`'s words appear together in one sentence
   * of `sourceText`? The company check (see this file's own header) — only
   * run when a sentence-splitter was injected; a caller that omitted one
   * gets `true` unconditionally, i.e. no narrowing beyond the base floor. */
  function hasCompany(sourceText, shared, need) {
    if (typeof splitSentences !== "function" || need < 2) return true;
    const sentences = splitSentences(String(sourceText ?? "")) ?? [];
    return sentences.some((sent) => {
      const text = typeof sent === "string" ? sent : sent?.text ?? "";
      const terms = new Set(tokenize(text));
      return shared.filter((t) => terms.has(t)).length >= need;
    });
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
    if (shared.length < need) {
      return {
        admitted: false,
        ungateable: false,
        shared,
        need,
        qTermsCount: qTerms.length,
        reason: `shares only ${shared.length} of the question's ${qTerms.length} distinct word(s) (${shared.join(", ") || "none"}) — needs ${need}; refused as discourse-irrelevant to this question`,
      };
    }
    const admitted = hasCompany(sourceText, shared, need);
    return {
      admitted,
      ungateable: false,
      shared,
      need,
      qTermsCount: qTerms.length,
      reason: admitted
        ? `shares ${shared.length} of the question's own word(s): ${shared.join(", ")}`
        : `shares ${shared.length} of the question's own word(s) (${shared.join(", ")}) but never ${need} of them together in one sentence — refused as coincidental, not company (P31)`,
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
