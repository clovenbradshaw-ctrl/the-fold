// language-relation-reader.js — which relation reader answers which
// language. Pure, browser-safe, organs injected (the cast.js pattern).
//
// P227's own "named, not built" disclosure said the gap plainly:
// language-typology.js's `roleStrategyFor` derives which slot-organ
// strategy a language needs from real WALS typology, but nothing called
// it. This is that caller — a router from a language code to a REAL,
// caller-injected relation-reader organ, never a hardcoded import of one
// language's reader standing in for all of them.
//
// AN UNBUILT STRATEGY IS A TYPED REFUSAL, NEVER A SILENT FALLBACK.
// Falling back to, say, the English positional reader for a case-marked
// language would not degrade gracefully — it would misread the language
// with confidence (the positional reader's own `relations.js` header:
// slot-finding is "the token immediately FOLLOWING a candidate referent
// surface," a fact about analytic word order that is simply WRONG for a
// free-constituent-order language). So an unregistered strategy, or a
// language `roleStrategyFor` does not recognize at all, returns a typed
// `{ refused: {...} }` naming exactly what is missing, never a reader.
//
// WHAT ACTUALLY EXISTS TODAY, checked rather than assumed, so this
// module's own disclosure stays honest as the registry grows:
//   - "positional" has one real, wired-in-production organ: this repo's
//     own English `makeRelationReader` (hypergraph.js).
//   - "case-marked" has exactly one real organ in the whole project —
//     eoreader7's `makeCaseMarkedRelationReader`, built and measured
//     against Latin (READING-SPEC.md S40) — but Latin has NO entry in
//     language-typology.js's own WALS-sourced table: checked live
//     against the real fetched 81A/49A/51A data, WALS's "lat" code names
//     Latvian, not Latin (there is no Classical Latin row in WALS at
//     all). So no language this table actually calls "case-marked"
//     (ru/ko/tr/fi) can reach that organ without a caller explicitly
//     declaring "yes, use the Latin-trained reader for this language
//     too" — a decision this module refuses to make silently on a
//     caller's behalf. A caller that DOES inject a reader under
//     "case-marked" is trusted; this module never second-guesses which
//     organ was handed to it, only whether one was handed at all.
//   - "particle" (Japanese) and "root-pattern" (Hebrew, Arabic) have no
//     organ anywhere yet.
import { roleStrategyFor } from "./language-typology.js";

/** What is missing for a strategy with no reader injected — read by the
 * refusal's own `detail` field, kept here once so it cannot drift from
 * strategy to strategy as this registry grows. */
export const STRATEGY_GAPS = Object.freeze({
  positional: "no reader injected under readers.positional — this repo's own English makeRelationReader (hypergraph.js) is the real organ for this strategy",
  "case-marked": "no reader injected under readers[\"case-marked\"] — eoreader7's makeCaseMarkedRelationReader exists for Latin only, and Latin has no WALS entry so this table cannot route to it on its own; ru/ko/tr/fi have no per-language case-ending prior built yet (P227)",
  particle: "no reader injected under readers.particle — no Japanese particle-role organ has been built yet (P227)",
  "root-pattern": "no reader injected under readers[\"root-pattern\"] — no Hebrew/Arabic root-and-pattern organ has been built yet (P227)",
});

/**
 * relationReaderFor(langCode, readers) ->
 *   { reader, strategy, langCode } |
 *   { refused: { reason, strategy, langCode, detail } }
 *
 * `readers` maps a `roleStrategyFor()` strategy name to a REAL relation-
 * reader function the caller has already built (the makeRelationReader /
 * makeCaseMarkedRelationReader call shape: `(passages) -> report`). This
 * module never imports or constructs a reader itself — it only routes —
 * so it stays testable with fakes and usable from either side of the
 * fold/eoreader7 boundary without pulling either engine in as a
 * dependency.
 *
 * `reason` is one of:
 *   "no_typology_for_language" — `langCode` is not in language-typology.js's
 *     received table at all (roleStrategyFor returned null); a genuinely
 *     unregistered language, never guessed at.
 *   "no_organ_for_strategy" — the language's own typology is known, but
 *     the caller did not inject a reader for the strategy it names.
 */
export function relationReaderFor(langCode, readers = {}) {
  const strategy = roleStrategyFor(langCode);
  if (!strategy) {
    return {
      refused: {
        reason: "no_typology_for_language",
        strategy: null,
        langCode,
        detail: `"${langCode}" is not in language-typology.js's WALS-sourced table`,
      },
    };
  }
  const reader = readers[strategy];
  if (typeof reader !== "function") {
    return {
      refused: {
        reason: "no_organ_for_strategy",
        strategy,
        langCode,
        detail: STRATEGY_GAPS[strategy] ?? `no reader was injected for strategy "${strategy}"`,
      },
    };
  }
  return { reader, strategy, langCode };
}
