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
//
// A TWO-WORD FLOOR HAS A STRUCTURAL BLIND SPOT: LONG ORDINARY PROSE WILL
// EVENTUALLY CONTAIN TWO COMMON WORDS IN ONE SENTENCE BY CHANCE (added
// 2026-09-15; Generality: universal — the fix is a permutation test over
// the source's own real occurrence pattern, reused from this codebase's
// own standing null-arm conventions, never a threshold fitted to one
// specimen; see the cross-domain replay and the exact P204 reproduction
// in admission.test.mjs). Disclosed and left open in P204's own text:
// a stale, unrelated multi-paragraph source whose one middle paragraph
// happens to read "...the engineering team...cost of living..." clears
// BOTH the floor and COMPANY (above) against an ordinary message that
// separately, coincidentally, also contains "team" and "cost" — "Team
// Falcon" and "Team Comet" in one clause, "snacks cost $30" in another.
// Neither word is rare; both are exactly as at-home in the real,
// on-topic reading of either message as they are in this coincidence.
// RARITY-WEIGHTING WAS TRIED FIRST, ON PAPER, AND REFUTED BEFORE
// BUILDING ANYTHING: this codebase already has a genuine, giver-named
// English word-frequency table (`priors-data/pos-prior-eng.json`,
// UD_English-EWT, P73/P74) and a real IDF gate built on exactly this
// kind of table (`activation.js`'s `IDF_FLOOR`) — but "team" and "cost"
// are ordinary, MID-frequency content words (~50-60 attestations each in
// a 254,820-token treebank), not stopwords and not rare either, and a
// word's rarity is the SAME whether it is used on-topic or coincidentally
// — rarity can filter out true function words (which `tokenize`'s own
// STOPWORDS list already does) but cannot distinguish a coincidental
// company of two ordinary content words from a genuine one, because the
// words themselves carry no signal either way. This is a structural
// limit of word-identity evidence alone, not a tuning problem.
// A CLOSED-FORM INDEPENDENCE MODEL WAS ALSO TRIED AND REFUTED: estimating
// "how likely would these two words land in one sentence by pure chance"
// from their raw English base rates (treebank frequency / total tokens)
// badly UNDERESTIMATES real coincidence, because ordinary prose is
// locally coherent by topic — once a sentence is about a relocation, the
// chance it also mentions a cost is far higher than the product of the
// two words' marginal frequencies, precisely because sentences are not
// bags of independently-drawn words. The only trustworthy null is one
// built from the SOURCE'S OWN observed occurrence pattern, redealt.
// WHAT SHIPPED IS A SEARCH-AWARE PERMUTATION NULL, `signal.js`'s own
// rule applied here rather than re-argued ("trying more raises the bar"
// — THE-CORE-MECHANISM.md): once floor+COMPANY finds `need` of the
// question's shared words together in exactly ONE sentence (or,
// failing that, exactly one paragraph) of the source, that single hit is
// checked against a redeal of the SOURCE'S OWN observed pattern — every
// shared word keeps its own real count of which units (sentences, or
// paragraphs) it actually appears in, but WHICH units get reassigned at
// random (`DRAWS` = 200 redeals, this repo's own standing null-arm draw
// count — the measuring door, the priors organ, and the self-plane's own
// surprise meter all already declare it; never invented for this
// specimen). Every one of `shared`'s words is redealt AT ONCE, not just
// the one pair that happened to match, so a coincidence anywhere among
// `shared`'s own possible combinations counts against the null — this is
// what makes it search-aware rather than a single re-tested pair, and it
// is why a LONGER source with MORE shared vocabulary is held to a HARDER
// bar, never an easier one. If a redeal reproduces a same-unit match of
// `need` words at or above `NULL_ALPHA` (= 0.05, this repo's own standing
// alpha — reused from `network-standing.js`'s convention and P70's own
// exact-hypergeometric fix, never invented here), the real hit is not
// distinguishable from a chance collision this source's own length and
// vocabulary would produce anyway, and admission is refused on that
// ground rather than granted on a coincidence wearing company's clothes.
// COMPANY RECURRING IN TWO OR MORE INDEPENDENT UNITS SKIPS THE NULL
// ENTIRELY AND IS TRUSTED OUTRIGHT — the same "recurrence >= 2 tells a
// pattern from noise" structural minimum this file's own base floor
// already reuses (clippy.js, binding.js, asserted.js), applied one level
// up: two independent sentences (or paragraphs) each showing company is
// real corroboration a single lucky one is not.
// A SOURCE WITH ONLY ONE UNIT AT THE GRAIN IN QUESTION IS EXEMPT BY
// CONSTRUCTION, NEVER PUT TO THE NULL — the coincidence this closes is
// inherently a multi-region phenomenon (many independent (unit, pair)
// trials is what makes a chance collision likely); a single paragraph has
// nowhere else the company could have been, so testing it against a
// redeal would be degenerate (every redeal reproduces the same one slot)
// and would wrongly refuse the overwhelming majority of real, short,
// single-paragraph pastes this gate is not built to doubt — including
// every one of this file's own genuinely-relevant fixtures (the cider,
// observatory, garden and coffee-shop specimens are all one paragraph).
// DISCLOSED RESIDUAL LIMIT, NOT PAPERED OVER: when `shared` truly has
// only the MINIMUM two words the floor requires and the stale source is
// long enough that even a search-aware redeal cannot call two singleton
// occurrences landing in the same one of many units "surprising," this
// null will not close the gap either — the same honest limit P203/P204
// already name for any two-word floor. What it closes is the common
// case this specimen actually is: a source sharing genuinely little with
// the question, where the ONE place company was found is not otherwise
// corroborated and is no more special than any other unit the redeal
// could have landed it in.
//
// COMPANY WIDENED FROM SENTENCE TO SENTENCE-OR-PARAGRAPH (added 2026-09-15;
// Generality: universal — the paragraph unit is reused from source.js's own
// `chunkProse` convention, never hand-picked, and only ever ADMITS more than
// the sentence-only check did, so it cannot reopen either of this file's own
// two founding refusal specimens). This is the OPPOSITE failure mode from
// the coincidental-overlap gap named above and in `deniedTerms`'s own
// header (too much getting in): COMPANY, exactly as it shipped, could
// refuse a source that is genuinely, entirely about the question asked.
// Found live: a freshly pasted, single-paragraph original source
// ("Ridgeline Cider Works opened its taproom... [830 characters later]
// ...800 gallons in year one to... their fifth year") named its subject
// ("cider") in the opening sentence and stated the two asked-about numbers
// ("year", "five") three sentences later — ordinary prose, naming a subject
// once and then discussing it, not a special case — and COMPANY refused the
// source because "cider" never shared a SENTENCE with "year" or "five"
// anywhere in it, so the turn fabricated an answer with zero grounding
// disclosure despite this being the ONLY, entirely on-topic source in the
// conversation. `hasCompany` now checks SENTENCE first (the tighter,
// original signal, and still the one reported in a passing `reason`), and
// only when that fails falls back to PARAGRAPH — the same "cut at a blank
// line" unit `source.js::chunkProse` already treats as meaningful, split on
// the identical `\n\s*\n` boundary, reused rather than a fresh hand-picked
// sentence-window. A paragraph is a strict superset of every sentence
// inside it, so this can only WIDEN admission relative to the old check,
// never narrow it — and it does not reopen the two specimens COMPANY was
// built to close: the Sourcewell transcript's "today" and "date" sit in
// separate paragraphs (a blank line apart) exactly as they sit in separate
// sentences, so that refusal is unchanged.

// Derived, not hand-picked: the same structural minimum clippy.js's own DMD
// gate (`n >= 2`) and binding.js's arrivals floor already use for "how much
// recurrence makes a pattern rather than noise" — reused here by construction,
// never re-derived. See this file's own header, above, for the full reasoning.
export const ADMISSION_FLOOR = 2;

// Reused, not invented — see this file's own header, "A TWO-WORD FLOOR HAS A
// STRUCTURAL BLIND SPOT," for both citations.
export const NULL_DRAWS = 200;
export const NULL_ALPHA = 0.05;

/** Deterministic, dependency-free PRNG (mulberry32) — a redeal must be
 * reproducible for tests, and this file stays PURE (no engine import for
 * something this small). */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A uniform random `count`-sized subset of `{0, ..., n-1}`, as a Set —
 * Fisher-Yates over an index array; `n` here is always small (sentences or
 * paragraphs of one attached source), so clarity wins over Floyd's-style
 * micro-optimization. */
function randomSubset(n, count, rng) {
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return new Set(idx.slice(0, count));
}

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

  /** Does some run of `terms` in `text` carry `need` of `shared`'s words
   * together? Shared by both tiers of `hasCompany`, below — the counting
   * rule is identical at either grain, only the unit of text changes. */
  function sharesEnough(text, shared, need) {
    const terms = new Set(tokenize(text));
    return shared.filter((t) => terms.has(t)).length >= need;
  }

  /** How often would a redeal of `shared`'s own real per-unit occurrence
   * pattern — same words, same total spread, different unit assignment —
   * STILL land `need` of them together in one unit, purely by chance? Every
   * word in `shared` is redealt AT ONCE (search-aware, `signal.js`'s own
   * rule), so a coincidence among any combination of `shared`'s words
   * counts, not only the specific pair that happened to be found. See this
   * file's own header, "A TWO-WORD FLOOR HAS A STRUCTURAL BLIND SPOT." */
  function coincidenceRate(unitTokenSets, shared, need, { draws = NULL_DRAWS, seed = 0 } = {}) {
    const n = unitTokenSets.length;
    const counts = shared.map((w) => unitTokenSets.reduce((c, set) => c + (set.has(w) ? 1 : 0), 0));
    const rng = mulberry32(seed);
    let hits = 0;
    for (let d = 0; d < draws; d++) {
      const perUnit = new Uint16Array(n);
      for (const count of counts) {
        if (count === 0) continue;
        for (const i of randomSubset(n, count, rng)) perUnit[i]++;
      }
      if (perUnit.some((c) => c >= need)) hits++;
    }
    return hits / draws;
  }

  /** Does `need` of `shared` hold together in one of `units` — and if only
   * ONE unit shows it, does that single hit survive a search-aware chance
   * null, or is it exactly the shape of a coincidence a source this length
   * would produce anyway? Two or more independent qualifying units are
   * trusted outright (real recurrence, the same `>= 2` structural minimum
   * this file's own base floor already reuses); a source with fewer than
   * two units at this grain is exempt from the null by construction — there
   * is nowhere else the company could have been, so testing it would be
   * degenerate. */
  function unitsCompany(units, shared, need, opts) {
    const tokenSets = units.map((u) => new Set(tokenize(u)));
    const qualifying = tokenSets.filter((set) => shared.filter((t) => set.has(t)).length >= need).length;
    if (qualifying === 0) return { ok: false };
    if (qualifying >= 2) return { ok: true, corroborated: true, count: qualifying };
    if (units.length < 2) return { ok: true, corroborated: false, count: 1 };
    const rate = coincidenceRate(tokenSets, shared, need, opts);
    return { ok: rate < NULL_ALPHA, corroborated: false, count: 1, coincidenceRate: rate };
  }

  /** Do at least `need` of `shared`'s words appear together in one SENTENCE
   * of `sourceText` — or, failing that, in one PARAGRAPH? The company check
   * (see this file's own header) — only run when a sentence-splitter was
   * injected; a caller that omitted one gets `true` unconditionally, i.e.
   * no narrowing beyond the base floor.
   *
   * WIDENED FROM SENTENCE-ONLY TO SENTENCE-OR-PARAGRAPH (2026-09-15). A
   * single flowing paragraph typically NAMES its subject once — often in
   * an early sentence — and states further details about that subject in
   * LATER sentences without repeating the subject noun every time: this is
   * ordinary prose, not a special case. Requiring exact same-SENTENCE
   * co-occurrence refused a freshly pasted, single-paragraph, genuinely
   * on-topic source for exactly that reason — a real, live specimen:
   * "Ridgeline Cider Works opened its taproom..." names the subject
   * ("cider") in sentence one; "...800 gallons in year one to... their
   * fifth year" states the two asked-about numbers three sentences later;
   * "cider" and "year"/"five" never share one sentence anywhere in the
   * source, so the source was refused for a question genuinely, entirely
   * about it, with zero grounding disclosure on the fabricated answer that
   * followed.
   *
   * The paragraph is not an invented window: it is the SAME unit
   * source.js's own `chunkProse` already treats as meaningful ("a passage
   * cut at a blank line is a paragraph and nothing more") — reused here,
   * not re-derived, split on the identical `\n\s*\n` blank-line boundary.
   * A paragraph is a strict WIDENING of a sentence (every sentence sits
   * inside exactly one paragraph), so checking it can only ADMIT more than
   * the sentence-only check did, never less — and it still refuses the
   * original specimen this whole gate exists for: the stale Sourcewell
   * transcript's "today" (paragraph one, the moderator's own greeting) and
   * "date" (a separate, later paragraph about reference files) sit in
   * DIFFERENT paragraphs, so they still never qualify as company. Sentence
   * is checked FIRST and remains the tighter, more specific signal (its own
   * disclosed reason when it fires); paragraph is the fallback that widens
   * admission only when sentence-level company genuinely is not there. */
  function hasCompany(sourceText, shared, need, opts) {
    if (typeof splitSentences !== "function" || need < 2) return { ok: true };
    const text = String(sourceText ?? "");
    const sentences = (splitSentences(text) ?? []).map((s) => (typeof s === "string" ? s : s?.text ?? ""));
    const bySentence = unitsCompany(sentences, shared, need, opts);
    if (bySentence.ok) return { ...bySentence, grain: "sentence" };
    const paragraphs = text.split(/\n\s*\n/);
    const byParagraph = unitsCompany(paragraphs, shared, need, opts);
    if (byParagraph.ok) return { ...byParagraph, grain: "paragraph" };
    return { ok: false, bySentence, byParagraph };
  }

  /** Does `sourceText` share enough of `question`'s own vocabulary to be
   * admitted as material for it? Returns a typed verdict, never a bare
   * boolean — the reason is what makes a refusal disclosable rather than a
   * silent drop (this codebase's own standing rule: a gap is a result). */
  function sourceAdmits(question, sourceText, { floor = ADMISSION_FLOOR, draws, seed } = {}) {
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
    const company = hasCompany(sourceText, shared, need, { draws, seed });
    const admitted = company.ok;
    const coincidenceRate = company.bySentence?.coincidenceRate ?? company.byParagraph?.coincidenceRate;
    return {
      admitted,
      ungateable: false,
      shared,
      need,
      qTermsCount: qTerms.length,
      reason: admitted
        ? `shares ${shared.length} of the question's own word(s): ${shared.join(", ")}`
        : coincidenceRate !== undefined
          ? `shares ${shared.length} of the question's own word(s) (${shared.join(", ")}) together in only one place in the source, and a redeal of that source's own occurrence pattern reproduces the same match ${(coincidenceRate * 100).toFixed(0)}% of the time (>= ${(NULL_ALPHA * 100).toFixed(0)}%) — refused as indistinguishable from a chance collision, not company (P31/search-aware null)`
          : `shares ${shared.length} of the question's own word(s) (${shared.join(", ")}) but never ${need} of them together in one sentence or even one paragraph — refused as coincidental, not company (P31)`,
    };
  }

  /**
   * `sources`: [{name, text}]. Splits into admitted/refused, each entry
   * carrying its own verdict — never a bare filtered array, so a caller can
   * disclose exactly what was set aside and why.
   *
   * `exempt` (optional, a `Set`-like with `.has(name)`): names admitted
   * unconditionally, never run through the vocabulary floor at all. This is
   * NOT a wider floor or a bonus score — it is a different question
   * entirely, and this file's own header already draws the line: admission
   * exists to catch STALE, cross-conversation material ("an old, unrelated
   * attachment... stayed loaded from an earlier demo"), never to filter out
   * what the person handling THIS conversation just handed it. A caller
   * (app.js) names which sources belong to which bucket by tracking WHO
   * attached a source and WHEN — this module has no notion of a
   * conversation and never will; it only ever compares text to text.
   * Reused live (2026-09-15): a freshly pasted, single-conversation source
   * phrased with different words than a generic follow-up ("pull out the
   * action items and who owns each one" against notes that never say
   * "action" or "items") was refused by the SAME floor an unrelated,
   * years-old workspace-pool document cleared by coincidence — the
   * obviously-relevant fresh material lost to accumulated noise. Omitted,
   * this function is byte-identical to its prior behaviour.
   */
  function admitSources(question, sources, { exempt, ...opts } = {}) {
    const admitted = [];
    const refused = [];
    for (const s of sources ?? []) {
      if (exempt?.has?.(s?.name)) {
        admitted.push({ ...s, admitted: true, ungateable: false, exempt: true, shared: [], need: 0, qTermsCount: null, reason: "attached to this conversation — never gated on vocabulary overlap the way a workspace-pool source is" });
        continue;
      }
      const v = sourceAdmits(question, s?.text, opts);
      (v.admitted ? admitted : refused).push({ ...s, ...v });
    }
    return { admitted, refused };
  }

  return { questionTerms, sourceAdmits, admitSources };
}
