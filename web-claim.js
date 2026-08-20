// web-claim.js — the DEF-shape proxy for an open web-ground slot.
//
// This file used to also carry a web-specific filler-discovery mechanism
// (`bestStatement`/`discoverFillers`/`foldWebClaim`) — deleted, not merely
// unused, per direct user redirect: DEF, EVA, and REC are each already ONE
// reusable organ in this repo, and that mechanism was a second, parallel
// EVA reinventing what the first one already does correctly.
//
//   DEF  — grid.js's `define`/`land`, unchanged, reused as-is.
//   EVA  — capacity-runner.js's real `relations` capacity: `judge()`
//          (hypergraph.js) already computes `cardinality: {fillers}` on
//          ANY ground's edges the moment more than one object binds the
//          same subject+verb (P32's `clusterFillers`), and the SAME
//          capacity's `query` mode already exposes open-slot discovery
//          directly (`reader.queryReferents({subject, verb, object})`,
//          referent-aware — resolves "Lincoln"/"President Lincoln" as one
//          subject via cast.js, which a hand-rolled string-fold match
//          cannot). Neither of these cares whether its ground's chunks
//          came from a loaded local file or a fetched web page — the only
//          genuinely new plumbing a web ground needs is turning search
//          results into chunks (`chunkSource`, already this app's one
//          chunker) and handing them to the SAME, unmodified reader. See
//          `eval/web-snip-eval.mjs` for that plumbing and the real,
//          live-driven Lincoln/Johnson/Washington specimens.
//   REC  — grid.js's real `concedeEvaluation(log, priorTaskId, {trigger})`,
//          unchanged, called directly against the DEF's own task_id when
//          the EVA's discovery disagrees with the DEF's declared shape.
//
// What's left here, genuinely new and narrow: the DEF's OWN declared-shape
// annotation — does the question's grammar presuppose a single answer, a
// plural one, or say nothing either way — from the engine's received
// closed classes, no new word list, no ground needed. It rides on the DEF
// as a disclosed annotation (`grid.attachResult(log, defTaskId,
// {declaredShape: ...})`) so a later REC's `trigger` can say the shape
// changed FROM something, not just TO something.

import { CLAIM_STOPWORDS } from "./grounding.js";

// A head phrase capped at two tokens ("vice president", "cabinet
// secretaries", "prime minister") — not a tuned number, a scope cut,
// disclosed: this repo has no NP-chunker and has repeatedly declined to
// build one (widget.js's own rewrite away from hand-typed word lists;
// MECHANICAL-COVERAGE-INVESTIGATION.md's succession-answer.js sketch,
// scoped narrow on the identical "who was PERSON's OFFICE" shape and never
// widened). Two tokens covers the compounds this repo's own specimens use
// without reaching for a parser this repo does not have.
const SLOT_HEAD_MAX_TOKENS = 2;

const tokenize = (s) =>
  String(s ?? "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}'’]+/u)
    .filter(Boolean);

/**
 * Does the question's OWN grammar presuppose a single answer, a plural
 * one, or say nothing either way? Not a cardinality MEASUREMENT — this
 * repo has no organ that measures cardinality without a ground already
 * read — a defeasible PROXY, from the engine's own received closed
 * classes, no new word list:
 *
 *   - a DEFINITE determiner ("the", "this", …) or a possessive marker
 *     ("Lincoln's") immediately before the answer's noun phrase presupposes
 *     the noun is already uniquely identifiable (Russell/Strawson — the
 *     same clause hypergraph.js's own P32 comment names for `clusterFillers`,
 *     applied here to the QUESTION's grammar instead of a ground's edges).
 *   - the noun phrase's own LAST token (English NPs are right-headed:
 *     "vice PRESIDENT", "cabinet SECRETARIES", "prime MINISTER" — the head
 *     is the final word, not the first, so a plural check must not read
 *     the compound's first token) carrying a bare inflectional "-s" not
 *     itself part of a possessive reads as the question naming a PLURAL
 *     slot outright — `declared: "enumerated"`.
 *   - otherwise, and whenever no determiner/possessive marker is found at
 *     all (e.g. "what number was Andrew Johnson" — a wh-number question
 *     with no determined noun phrase at the answer slot), `declared:
 *     "unknown"`. Absence of the marker is NOT evidence of plurality —
 *     "unknown" is the honest default, never "not single".
 *
 * `definiteDeterminers`/`inflectionalSuffixes` arrive injected from the
 * engine's prior register (perceiver/text/priors.js, the SAME classes
 * widget.js/seed.js already route on — checked directly before reuse:
 * seed.js's own `archetypeOf` was the first candidate tried for this and
 * refused on the merits — it is CRISPR code-scrubbing's "build me a widget
 * like X" archetype extractor, requires a NON-interrogative sentence by
 * construction, and has nothing to do with a factual question's cardinality
 * at all).
 *
 * This expectation MUST be revised by what the EVA's own hunt finds. It
 * never gates a search; it only states what the search can go on to
 * confirm or refute.
 */
export function declaredSlotShape(question, { definiteDeterminers, inflectionalSuffixes } = {}) {
  if (!(definiteDeterminers instanceof Set) || !definiteDeterminers.size) {
    throw new TypeError("declaredSlotShape: definiteDeterminers must come from the engine's prior register");
  }
  if (!(inflectionalSuffixes instanceof Set) || !inflectionalSuffixes.size) {
    throw new TypeError("declaredSlotShape: inflectionalSuffixes must come from the engine's prior register");
  }
  const tokens = tokenize(question);
  let markerAt = -1;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    if (definiteDeterminers.has(t) || /['’]s$/.test(t)) {
      markerAt = i;
      break;
    }
  }
  if (markerAt === -1) return { declared: "unknown", marker: null, headPhrase: null };

  const head = [];
  for (const t of tokens.slice(markerAt + 1)) {
    if (CLAIM_STOPWORDS.has(t)) break;
    head.push(t);
    if (head.length >= SLOT_HEAD_MAX_TOKENS) break;
  }
  if (!head.length) return { declared: "unknown", marker: tokens[markerAt], headPhrase: null };

  const last = head[head.length - 1];
  const bareS = last.length > 3 && /s$/.test(last) && !/ss$/.test(last) && !/['’]s$/.test(last) && inflectionalSuffixes.has("s");
  return {
    declared: bareS ? "enumerated" : "single",
    marker: tokens[markerAt],
    headPhrase: head.join(" "),
  };
}
