// resurf.js — the pure half of the re-surf loop: "keep looking until it got
// it." The instrument already searches ONCE before a materialless draft
// (P23's preflight) and already detects a non-answer after the draft (the
// echo/narration judge, the grounding findings, the typed opens) — but
// nothing ever went BACK to search when those detections said the answer
// was not in the material. The findings were recorded and never re-entered
// retrieval. This module is the missing decision: given the question's own
// words and the material actually held, is the answer even ABLE to be in
// the material — and if not, what is the next bounded search?
//
// THIS MODULE OWNS NO NETWORK — proof.js's discipline exactly: everything
// here is a function from words and chunks to words. The crossing lives
// where P13 put it (app.js hands holon.js an injected `resurf` function the
// same way it hands `checkLink`); the loop that calls it lives in
// holon.js's runPart, mechanically — a model never decides to search.
//
// THE QUERY WALL (the P23 lesson, enforced by construction): every term a
// re-surf query carries comes from the question's own words — the task, and
// for a flat turn the fold's discourse line, the same anchor retrieval and
// the grounding question already use. Never the model's draft: P23's
// measured failure was a search built from an invented sentence ("70
// degrees, sunny") that went looking for evidence of the hallucination.
// `resurfQuery` therefore filters everything it is handed through the
// question's own token set — a caller CAN offer it tokens from a draft-
// derived finding, and any token the question itself does not contain is
// dropped before it can reach a search engine. The wall is a filter, not a
// convention, so it cannot be forgotten at a call site.

import { tokenize } from "./source.js";
import { PREFLIGHT_QUERY_MAX_TERMS } from "./proof.js";

// ── declared numbers, each with its giver ───────────────────────────────────
// A budget with a name and a stated duty (P9) — runaway backstop on an
// automatic egress, not a quality threshold. Two, because the two rounds are
// two different questions: round one searches the missing words WITH the
// question's remaining context (the broad cast); round two searches the
// still-missing words ALONE (the narrow cast — a different query by
// construction, so a failed first search is not simply repeated). A third
// round would be one of those two shapes again with the same words, and a
// question the world has not answered in two differently-shaped searches is
// a gap to report (P4: gaps are results), not a reason to keep crossing.
export const RESURF_MAX_ROUNDS = 2;

/**
 * The question's own searchable words, in the question's own order.
 * tokenize (source.js) is the ONE fold retrieval itself uses — diacritics
 * folded, stopwords and short tokens dropped, numerals kept — so what this
 * returns is exactly the vocabulary `retrieve` would match on (P11: the
 * same fold on both sides of every comparison, or a found word fails the
 * very check that should confirm it).
 */
export function questionTerms(question) {
  return [...new Set(tokenize(String(question ?? "")))];
}

/**
 * The question's words the held material does not contain anywhere — the
 * mechanical, draft-free reading of "the answer isn't in the material."
 * Compared against every chunk's own term set (chunkSource builds it with
 * the same tokenize), so both sides of the containment share one fold. A
 * term the pool holds ANYWHERE counts as covered even if retrieval's top
 * slice missed it — re-retrieval, not the web, is the fix for that — which
 * is why the caller hands the whole pool here and the retrieved slice only
 * to the post-draft variant.
 *
 * Deliberately not a semantic judgment of whether the material ANSWERS the
 * question — words can be present with the answer absent. This is the
 * cheapest true signal available before any draft exists, and the cost
 * asymmetry is P23's own: a false positive spends one bounded search a
 * turn didn't need; a false negative leaves the model to invent.
 */
export function uncoveredTerms(question, chunks = []) {
  const terms = questionTerms(question);
  if (!terms.length) return [];
  return terms.filter((t) => !chunks.some((c) => c?.terms?.has?.(t)));
}

/**
 * The round's search query, built ONLY from the question's own words.
 * `missing` is whatever the caller's detection produced — uncovered terms,
 * or the question-side tokens of a typed finding — and is filtered through
 * the question's own token set before a single term is admitted (the wall,
 * see the module header). Round 1 leads with the missing words and fills
 * the remaining room with the question's other words (context so a bare
 * figure like "2019" is not searched naked); round 2+ is the missing words
 * alone — a narrower, differently-shaped cast, so the second crossing is
 * never a repeat of the first. With nothing missing, both rounds degrade
 * to the question's own words; the caller's trail-dedup refuses an
 * identical repeat. The cap is PREFLIGHT_QUERY_MAX_TERMS (proof.js): this
 * is the same kind of query — a topic anchor handed to a search engine,
 * not a claim — and the number's giver stays that declaration.
 */
export function resurfQuery(question, missing = [], round = 1) {
  const base = questionTerms(question);
  if (!base.length) return "";
  const own = new Set(base);
  const safe = [
    ...new Set(missing.map((m) => String(m ?? "").toLowerCase()).filter((m) => own.has(m))),
  ];
  const rest = base.filter((t) => !safe.includes(t));
  const terms =
    round >= 2 && safe.length ? safe : [...safe, ...rest];
  return terms.slice(0, PREFLIGHT_QUERY_MAX_TERMS).join(" ").trim();
}
