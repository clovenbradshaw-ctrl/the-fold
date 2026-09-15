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
//
// A DENIED TERM IS NOT ASSERTED TERM (added 2026-09-15; Generality:
// universal — a correction is the opposite of an endorsement, and this
// floor cannot tell them apart without being told). Found live, twice
// independently, chasing a report of a fabrication coming back "confirmed"
// — the highest grounding badge — AFTER the person corrected it: a
// fabricated coffee-shop/oat-milk aside was named back to REFUTE it
// ("there's no coffee shop or oat milk anywhere in what I sent you, that's
// a garden report") and the very act of naming the hallucinated terms gave
// this gate exactly the vocabulary overlap it needed to legitimately admit
// the stale, unrelated coffee-shop source the fabrication had leaked from
// in the first place — which then genuinely DOES contain "coffee shop" and
// "oat milk" together in one sentence, so COMPANY (above) cleared too, and
// the ground ladder correctly, honestly marked it "confirmed": the sentence
// really is in that (utterly wrong-context) source. The gate was not wrong
// about the bytes; it was answering a question it was never asked — a
// human denying "there's no X here" is not offering X as this turn's own
// topic, and treating every word in a message as equally positive evidence
// cannot tell "the reader is asserting this" from "the reader is quoting
// something back to reject it." Closed one level below `questionTerms`,
// not by editing `hasCompany` or the floor: a word is excluded from the
// question's OWN vocabulary when every occurrence of it in the message sits
// inside a negation's scope (a received `negationWords` closed class,
// optional — see `deniedTerms`, below) — never when it is ALSO asserted
// somewhere else in the same message, so a genuinely mixed message ("I like
// coffee, but there's no oat milk here") still offers "coffee" as real
// vocabulary and only withholds "oat"/"milk". Scope runs from the negation
// trigger to the end of its own sentence (the same `splitSentences` organ
// this file already takes for COMPANY, reused rather than a second
// sentence notion) — deliberately coarse in the safer direction: losing a
// stray un-negated word inside the scope costs this turn one weak vote
// toward admitting a source it probably should not have leaned on alone
// anyway, while a scope too narrow lets a denied term keep legitimizing the
// exact source it was named specifically to refute. `negationWords` is
// optional and defaults to undefined, so a caller that never injects it
// gets the exact prior behaviour, byte for byte — every existing test and
// caller of this module is untouched until a caller opts in.

// Derived, not hand-picked: the same structural minimum clippy.js's own DMD
// gate (`n >= 2`) and binding.js's arrivals floor already use for "how much
// recurrence makes a pattern rather than noise" — reused here by construction,
// never re-derived. See this file's own header, above, for the full reasoning.
export const ADMISSION_FLOOR = 2;

export function makeAdmission({ tokenize, splitSentences, negationWords } = {}) {
  if (typeof tokenize !== "function") throw new TypeError("makeAdmission: tokenize is injected");

  /** A raw word scan (case-preserved, position-tracked) — separate from
   * `tokenize`, which already strips stopwords/short words and cannot tell
   * where in the ORIGINAL text a match sat. Mirrors the character class
   * `tokenize` itself splits on (source.js's own header). */
  function rawWords(text) {
    return [...String(text ?? "").matchAll(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)];
  }

  /** Words that occur ONLY inside a negation's scope somewhere in `text` —
   * "there's no coffee shop" DENIES "coffee" and "shop", it does not assert
   * them, and a denial is not positive evidence a source is relevant to
   * this question (see this file's own header, "A DENIED TERM IS NOT AN
   * ASSERTED TERM"). A term that is ALSO asserted outside any negation's
   * scope elsewhere in the same text is never excluded — this only ever
   * strips a term that the message never actually asserts anywhere.
   * `negationWords` is the caller-injected closed class (optional); a
   * caller that omits it gets an empty exclusion set unconditionally. */
  function deniedTerms(text) {
    if (!negationWords || typeof negationWords.has !== "function") return new Set();
    const s = String(text ?? "");
    const sentences = typeof splitSentences === "function" ? (splitSentences(s) ?? []) : [{ text: s, offset: 0 }];
    const denied = new Set();
    const asserted = new Set();
    for (const sent of sentences) {
      const t = typeof sent === "string" ? sent : (sent?.text ?? "");
      const words = rawWords(t);
      const cut = words.find((w) => negationWords.has(w[0].toLowerCase()))?.index;
      if (cut === undefined) {
        for (const term of tokenize(t)) asserted.add(term);
        continue;
      }
      for (const term of tokenize(t.slice(0, cut))) asserted.add(term);
      for (const term of tokenize(t.slice(cut))) denied.add(term);
    }
    const onlyDenied = new Set();
    for (const term of denied) if (!asserted.has(term)) onlyDenied.add(term);
    return onlyDenied;
  }

  function questionTerms(question) {
    const q = String(question ?? "");
    const all = [...new Set(tokenize(q))];
    const denied = deniedTerms(q);
    return denied.size ? all.filter((t) => !denied.has(t)) : all;
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
