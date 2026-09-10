// shape-fallback.js — a tie-triggered re-rank for
// eoreader7/native/organs/source.js::retrieve(), built on relative.js's
// Field/nullBand mechanism.
//
// THE ONE REAL INCIDENT THIS IS BUILT FROM
// (eoreader7/native/eval/the-fold/shape-cue-retrieval-failures.mjs +
// results/shape-cue-retrieval-failures.json). On the real, declared
// witness-paraphrase-corpus.mjs battery run over the real, full War and
// Peace text (pg2600.txt, 11,132 chunks), retrieve() surfaces the true
// source passage 7 times out of 9. The 2 genuine failures are EXACT
// term-overlap score ties between the true passage and one-or-more wrong
// passages elsewhere in a repetitive stretch of the book, where
// retrieve()'s own tiebreak (earliest chunk wins) happens to pick wrong.
// A shape-anonymized-sentence Field, built over a bounded local
// neighbourhood (±60 chunks around the tied group) and cued with the
// item's own anonymized question text, correctly recovered the true
// passage in BOTH cases, clearing the field's own matched-random-cue null
// band both times (activation 0.3115 vs band.hi 0.2537, and 0.6025 vs
// 0.3015 — see that results file for the full numbers).
//
// The two earlier steps that established WHY sentences, and not bare
// words: eval/lavar/shape-null-band.mjs found bare single-word shape
// tokens (Lens/Paradigm/Atmosphere vocabularies, one AIW chapter) NOT
// separable from a random same-vocabulary cue under this same Field/
// nullBand mechanism. eval/lavar/shape-sentence-resemblance.mjs then found
// that referent-anonymized WHOLE SENTENCES, over the whole book (1,079
// sentences), ARE separable — 37.3% recovered by the real shape cue vs
// 12.8% expected by a matched random-sentence control, with 23.6%
// clearing the null band outright. This module is the third step: the
// same sentence-level mechanism, aimed at retrieve()'s own tiebreak
// instead of a standalone recall test.
//
// PURE ORGAN, cast.js pattern. Nothing here imports eoreader7's own
// referent-discovery organs directly — `extractSurfaces`/`discoverReferents`
// are injected (the same way hypergraph.js's `makeRelationReader` takes
// `blankFurniture`/`determiners`/`negationWords`, and source.js's own
// `chunkSource` takes an `atmosphere` organ bundle), so this file is
// testable with a fake pair and boots nothing. `relative.js`'s `Field` IS
// imported directly — it lives in this same directory by design (the-fold's
// CLAUDE.md: relative.js is "an experiment kept apart from eoreader7's
// organs," so this fallback is built on top of it here rather than in
// eoreader7).
//
// TIE DETECTION NEEDS NO HAND-PICKED THRESHOLD — that decision is made in
// source.js::retrieve() itself, not here (see this file's sibling doc
// comment there): retrieve()'s score is an integer term-overlap count, or
// that count divided by the power-of-two 2, both exactly representable in
// IEEE-754 double precision, so "tied" is `===`, never an epsilon. This
// module receives an already-identified tied group; it never re-decides
// what counts as a tie.
//
// THIS CAN ONLY HELP OR DO NOTHING (see source.js::retrieve()'s own doc
// comment for the by-construction argument, and shape-fallback.test.mjs
// for the proof): every reachable outcome here is either "decline" (return
// a falsy value) or "name one member of the group I was actually handed."
// retrieve() is the only thing that ever touches the result either way.

import { Field } from "./relative.js";

// Reused UNMODIFIED from eval/the-fold/shape-cue-retrieval-failures.mjs —
// "declared before any Field was built," never re-tuned against this
// module's own numbers.
const NEIGHBOURHOOD_CHUNKS = 60;
const NULLBAND_DRAWS = 100;

// Reused UNMODIFIED from eval/lavar/shape-sentence-resemblance.mjs's own
// verdict rule ("field.size < 50 => UNDERPOWERED", chosen there before any
// recall number existed) — not re-derived here, and not a fresh hand-pick:
// a field this small has too little vocabulary for its own null band to
// mean anything, so this module declines rather than guess with one.
const FIELD_UNDERPOWERED_BELOW = 50;

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Reused verbatim (in spirit) from shape-sentence-resemblance.mjs and
 * shape-cue-retrieval-failures.mjs's own sentence splitter: flatten
 * whitespace, split on a sentence-ending mark followed by space. No byte
 * offsets are tracked here — unlike those eval drivers, this module never
 * needs to cite a sentence's own address, only which CHUNK it came from. */
function splitSentences(text) {
  return String(text ?? "")
    .split(/\s+/)
    .join(" ")
    .trim()
    .split(/(?<=[.!?”])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4);
}

/** Every occurrence of a discovered referent surface replaced with the
 * fixed placeholder SOMEONE — the "argument slots emptied" move, done as
 * text, exactly as both eval scripts' own `anonymize` does it. */
function anonymize(text, surfaces) {
  if (!surfaces.length) return text;
  const re = new RegExp(`\\b(?:${surfaces.map(escapeRe).join("|")})\\b`, "g");
  return String(text ?? "").replace(re, "SOMEONE");
}

/**
 * `organs` — REQUIRED to get a real fallback; `extractSurfaces` and
 * `discoverReferents` are eoreader7's own referent-discovery pair
 * (native/adapters/text/surfaces.js), injected rather than imported here.
 * Without both, this factory returns a function that always declines
 * (never throws) — a shape fallback nobody configured behaves exactly like
 * one nobody built, which keeps `retrieve()`'s own call site unconditional.
 *
 * `neighbourhoodChunks`/`nullBandDraws`/`underpoweredBelow` are declared,
 * overridable knobs defaulting to the evidence chain's own already-settled
 * numbers (see the constants above) — never re-tuned against this module's
 * own results, matching this codebase's "never tune a parameter by
 * checking what it does to a golden's own score" rule.
 */
export function makeShapeFallback({
  extractSurfaces,
  discoverReferents,
  neighbourhoodChunks = NEIGHBOURHOOD_CHUNKS,
  nullBandDraws = NULLBAND_DRAWS,
  underpoweredBelow = FIELD_UNDERPOWERED_BELOW,
} = {}) {
  if (typeof extractSurfaces !== "function" || typeof discoverReferents !== "function") {
    return function shapeFallbackUnconfigured() {
      return null;
    };
  }

  function localEntitySurfaces(sentenceTexts) {
    const surfaceEntries = extractSurfaces(sentenceTexts.map((text) => ({ text })), {});
    const { events } = discoverReferents(surfaceEntries, {});
    return [...new Set(events.map((e) => e.surface))].sort((a, b) => b.length - a.length);
  }

  /**
   * `tiedChunks` — the group `retrieve()` found sharing the top score
   * (>=2 members, guaranteed by the caller). `question` — the query text,
   * verbatim. `allChunks` — every chunk `retrieve()` was scoring, used only
   * to build each tied chunk's own bounded local neighbourhood (never to
   * discover new candidates).
   *
   * Returns one member of `tiedChunks` (by reference) to promote, or a
   * falsy value to decline. Declines whenever: fewer than 2 tied chunks;
   * no neighbourhood can be built; the resulting field is underpowered;
   * no candidate's own activation clears the field's null band; or two
   * candidates are themselves ambiguous (their activations are within the
   * band's own margin of each other) — never a guess.
   */
  return function shapeFallbackRetrieve(tiedChunks, question, allChunks) {
    if (!Array.isArray(tiedChunks) || tiedChunks.length < 2) return null;
    if (!Array.isArray(allChunks) || !allChunks.length) return null;
    if (!String(question ?? "").trim()) return null;

    const indexByRef = new Map(allChunks.map((c, i) => [c.ref, i]));
    const tiedRefs = new Set(tiedChunks.map((c) => c.ref));

    // One bounded local neighbourhood per tied chunk, unioned and
    // deduplicated by ref — never crossing a source boundary, since a
    // neighbourhood only means "nearby in this same file's own chunk
    // sequence."
    const neighbourhood = [];
    const seen = new Set();
    for (const t of tiedChunks) {
      const idx = indexByRef.get(t.ref);
      if (idx == null) continue;
      const lo = Math.max(0, idx - neighbourhoodChunks);
      const hi = Math.min(allChunks.length - 1, idx + neighbourhoodChunks);
      for (let i = lo; i <= hi; i++) {
        const c = allChunks[i];
        if (c.source !== t.source) continue;
        if (seen.has(c.ref)) continue;
        seen.add(c.ref);
        neighbourhood.push(c);
      }
    }
    if (!neighbourhood.length) return null;

    // Every proposition-bearing unit here is a SENTENCE, tagged with the
    // chunk it came from — the field's nodes are finer-grained than the
    // chunks being ranked, matching the mechanism the evidence chain
    // actually measured as separable.
    const sentences = [];
    for (const c of neighbourhood) {
      for (const s of splitSentences(c.text)) sentences.push({ ref: c.ref, text: s });
    }
    if (sentences.length < underpoweredBelow) return null;

    const surfaces = localEntitySurfaces(sentences.map((s) => s.text));

    const field = new Field();
    for (const s of sentences) {
      field.admit(anonymize(s.text, surfaces), { ref: s.ref, tied: tiedRefs.has(s.ref) });
    }

    const anonQuestion = anonymize(String(question), surfaces);
    // recallAgainstNull's own band (measured with random cues drawn from
    // this field's real vocabulary — never a chosen threshold) and its own
    // full ranking, in one call. What is NEW here, and does not reuse
    // recallAgainstNull's verdict directly, is WHICH node the verdict is
    // read against: recallAgainstNull's own figure/ambiguous/nothing is
    // about the field's global top-1/top-2, which may be a distractor
    // neighbourhood sentence rather than one of the tied candidates. The
    // same band and the same ranking are reused; the figure/ambiguous/
    // nothing READING is re-applied here, restricted to nodes belonging to
    // a tied chunk — reusing the mechanism's own numbers, not inventing new
    // ones.
    const against = field.recallAgainstNull(anonQuestion, { draws: nullBandDraws });
    const tiedRanked = against.ranked.filter((r) => r.node.payload.tied);
    const top = tiedRanked[0];
    if (!top || top.activation <= against.band.hi) return null; // "nothing", scoped to the tied group
    const second = tiedRanked[1];
    if (second && top.activation - second.activation <= against.band.margin) return null; // "ambiguous", scoped to the tied group

    return tiedChunks.find((c) => c.ref === top.node.payload.ref) ?? null;
  };
}
