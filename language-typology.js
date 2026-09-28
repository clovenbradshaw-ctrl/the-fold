// SUPERSEDED / HISTORICAL (2026-09-28, POLICIES.md P229's amendment): the
// per-language dispatch this router was built to seed was implemented
// directly in app.js (2026-09-20, `relationExtractorsFor`) without ever
// calling this file, and it is currently gated OFF (`SVO_DECLARED = false`)
// because English's own measured RoleConfig@1 failed a live-prose BECOMING
// test. This file has no production caller. See eoreader7's
// `relations-language.js` + `native/the-fold/reader-bundle.js` for the live
// dispatch instead.
//
// language-typology.js — a received, giver-named per-language declaration of
// which SLOT ORGAN a relation reader needs (2026-09-15).
//
// P76's own header (relation-kinds.js/grounding-gfp.js) named this as the
// missing piece: "a word-order typology declaration: the registry saying
// Russian = case-marked (order-free), Chinese = position (order-matter),
// Hebrew = root-pattern, Japanese = particle... the per-language eigenvalue
// index — what englishSlots/wordOrderFree gesture at but don't formalize."
// This is that registry, built from WALS Online (Dryer 2013, feature 81A —
// dominant word order; Iggesen 2013, feature 49A — number of morphological
// cases; Dryer 2013, feature 51A — position of case affixes), fetched live
// and committed as `eval/fixtures/wals-typology.json` (the giver's own real
// rows, never hand-typed values standing in for a citation — this repo's
// own standing rule, caught wrong more than once elsewhere in this
// project's history).
//
// THE DERIVATION, NOT A TABLE OF GUESSES. `roleStrategyFor` computes a
// language's slot-organ family from RECEIVED facts (never a private
// per-language lookup a future language would have no way to extend):
//
//   genus === "Semitic"          → "root-pattern" (root-and-pattern
//                                   morphology; case marking is not the
//                                   relevant signal for this family —
//                                   Hebrew reads "prepositional clitics" on
//                                   51A, Arabic reads no case marking at
//                                   all, and both are obviously not
//                                   positional the way English is)
//   51A: clitic (pre/post-)      → "particle" (Japanese's own mechanism —
//                                   a postpositional CLITIC is not an
//                                   inflectional case ending; this is the
//                                   fourth category the opencode session's
//                                   own "go get it" thread named and never
//                                   built: "Japanese = particle")
//   51A: case (pre/suf/in-)fixes → "case-marked" (a real, general,
//                                   AFFIXAL case system — Russian's
//                                   suffixes, Turkish's, Finnish's, Korean's)
//   otherwise                    → "positional" (no affixal or clitic case
//                                   marking, not Semitic — role is read off
//                                   word order, as English's own
//                                   `englishSlots` already does)
//
// 49A ALONE IS NOT ENOUGH, MEASURED: WALS records English at "2 cases" —
// its closed pronoun class (he/him, who/whom) — which a naive "cases > 0 →
// case-marked" rule reads as case-marked, indistinguishable from Russian's
// 6-7. 51A ("does the language mark case as an affix or clitic AT ALL,
// on ordinary nouns") is the feature that actually answers the question
// this module needs, and it correctly excludes English's vestigial
// pronoun-only system: "No case affixes or adpositional clitics".
//
// `needsSegmentation` is a SEPARATE, orthogonal fact — a script convention,
// not a WALS feature — disclosed as exactly that: Han and Kana scripts
// carry no orthographic word-space, so a caller reading Chinese or Japanese
// needs a segmenter (Unicode UAX #29's own dictionary-based break) before
// any slot organ runs, REGARDLESS of that language's role-assignment
// strategy (Japanese is both segmented AND case-marked — particles are
// case markers glued onto unsegmented text).
//
// PURE. No egress here, and no runtime environment branching either — the
// fixture is a plain ES module object literal (eval/fixtures/
// wals-typology-data.js), imported like any other, so this module loads
// identically in Node and in a real browser tab. It did NOT start this
// way: the first cut read eval/fixtures/wals-typology.json with node:fs's
// `readFileSync` at module top level, which is Node-only and breaks a
// browser's module graph immediately on import — found live, 2026-09-15,
// trying to run language-relation-reader.js (P229) in a real browser tab.
// wals-typology.json itself stays the canonical, diffable PROVENANCE
// artifact (what a future re-fetch would regenerate); the .js module's
// own header explains the split and a test pins the two byte-for-byte
// equal so they cannot silently drift apart.

import { WALS_TYPOLOGY_FIXTURE as FIXTURE } from "./eval/fixtures/wals-typology-data.js";

export const TYPOLOGY_GIVER = FIXTURE.giver;

/** iso639_1 → the received row (walsCode, genus, family, dominantOrder81A, case49A). */
export const LANGUAGE_TYPOLOGY = Object.freeze(
  Object.fromEntries(FIXTURE.languages.map((l) => [l.iso639_1, Object.freeze(l)])),
);

// Han (Chinese) and Kana (Japanese) scripts carry no orthographic
// word-space — an orthographic fact, not a WALS feature, disclosed apart
// from the received table above so a reader never mistakes it for one.
const NO_SPACE_SCRIPT = Object.freeze(new Set(["zh", "ja"]));

/**
 * roleStrategyFor(langCode) → "root-pattern" | "particle" | "case-marked" |
 * "positional" | null. `null` is a typed gap (the language is not in the
 * registry), never a guessed default — a caller with no declaration should
 * fall back to its own default slot organ explicitly, not have one
 * silently assumed here.
 */
export function roleStrategyFor(langCode) {
  const row = LANGUAGE_TYPOLOGY[langCode];
  if (!row) return null;
  if (row.genus === "Semitic") return "root-pattern";
  const affix = String(row.caseAffix51A ?? "");
  // WALS 51A's own closed vocabulary (fetched, not guessed — see the
  // fixture's own distinct values): the negative category's OWN text
  // contains the substring "clitics" ("No case affixes or adpositional
  // clitics"), so it must be checked by EXACT match before any substring
  // test for "clitic" runs, or Mandarin's negative reads as "particle"
  // (caught by this module's own test suite, not shipped).
  if (affix === "No case affixes or adpositional clitics") return "positional";
  if (/clitic/i.test(affix)) return "particle";
  if (/^Case /i.test(affix)) return "case-marked";
  return "positional";
}

/** Whether langCode's script conventionally carries no word-space — a
 * segmenter is needed before any slot organ can run. `null` for a language
 * not in the registry (a typed gap, not an assumed "false"). */
export function needsSegmentation(langCode) {
  if (!LANGUAGE_TYPOLOGY[langCode]) return null;
  return NO_SPACE_SCRIPT.has(langCode);
}

/** The full declaration for a language, in one call — what a caller
 * deciding which slot organ to inject actually wants. */
export function typologyFor(langCode) {
  const row = LANGUAGE_TYPOLOGY[langCode];
  if (!row) return { langCode, declared: false };
  return {
    langCode, declared: true,
    roleStrategy: roleStrategyFor(langCode),
    needsSegmentation: needsSegmentation(langCode),
    genus: row.genus, family: row.family,
    dominantOrder: row.dominantOrder81A, caseSystem: row.case49A, caseAffix: row.caseAffix51A,
  };
}
