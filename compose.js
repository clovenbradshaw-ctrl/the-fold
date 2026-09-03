// compose.js — a long-form passage assembled from checked claims, with no
// free generation anywhere.
//
// WHAT THIS IS FOR. `crown.js` turns ONE merged testimony into ONE sentence
// by template, with a trace rule that makes fabrication structurally
// impossible: every token of a rendered sentence traces to exactly one
// origin — a claim's own words, a named witness, or one declared
// connective. That has been the whole of this instrument's model-free
// rendering: a sentence at a time. Anything longer has always been a model
// drafting prose and the apparatus checking it afterward.
//
// This composes MANY such sentences into one passage. The claims are
// already checked before they arrive; nothing here re-judges one, and
// nothing here writes a word that is not either a claim's own or a member
// of this file's own closed connective table.
//
// THE THREE THINGS IT ADDS, and they are the only three:
//
//  1. AN ORDER, DECLARED BY THE CALLER, NEVER INVENTED. `compose` does not
//     know what order claims belong in and refuses to guess — a guessed
//     order is an argument nobody made. `orderBy` is the caller's own
//     comparator, and the caller is expected to have one for a reason:
//     succession-shaped material orders itself (the relation IS the
//     order — P61's sequence type), a chronology orders by its own dates,
//     a document's claims order by their own spans. Where no order can be
//     declared, this refuses `no_declared_order` rather than emitting the
//     ledger's arbitrary fold order as if it were a narrative.
//
//  2. A CLOSED TRANSITION VOCABULARY, addressed by the STRUCTURAL relation
//     between adjacent claims and never by their meaning. `TRANSITIONS`
//     below is the whole of it. This is crown.js's own `KNOWN_CONNECTIVES`
//     move one level up: a small declared vocabulary is a legitimate token
//     origin, and anything outside it is fabrication. What decides which
//     transition is used is computable — do the two claims share a
//     subject, does the second's standing differ, did the second come back
//     contested — never what they are about.
//
//  3. A COVERAGE REPORT, because a passage that silently omits what it
//     could not say is the confabulation this whole instrument exists to
//     refuse. Every claim handed in is either composed or NAMED in
//     `withheld` with the reason. An UNDETERMINED merge is never rendered
//     as an assertion and never quietly dropped.
//
// WHAT IT DOES NOT DO, said here so it is not claimed later. It does not
// decide what a passage should be ABOUT (the caller selects the claims);
// it does not order them; it does not check them; and it cannot make a
// thinly-corroborated ledger read as a confident account — a passage over
// single-witness claims renders as a passage of "according to X" sentences,
// which is what those claims are. Its reach is bounded by the corroboration
// the ledger actually holds (P86: ~2% on real prose), and that bound is a
// fact about the reading, not something a renderer can style away.
//
// PURE. `renderClaim` is injected (crown.js's `renderCrown` in production),
// so this file holds no template of its own and can be pointed at any
// renderer with the same contract.

/**
 * The closed transition vocabulary. Keyed by the structural relation
 * between the PREVIOUS composed claim and the NEXT one — every key
 * computable from the claims themselves, none from what they mean.
 * A transition is a token origin exactly as crown.js's KNOWN_CONNECTIVES
 * is: declared here, or it is not written.
 */
export const TRANSITIONS = Object.freeze({
  /** first sentence of the passage — nothing precedes it */
  open: "",
  /** the next claim shares the previous one's first end: the account continues about the same thing */
  sameSubject: "",
  /** a different subject: a new thing is taken up */
  newSubject: "",
  /** the next claim's sources disagree where the previous one's agreed */
  intoContested: "But ",
  /** the previous claim was contested and this one is not */
  outOfContested: "Still, ",
  /** the next claim rests on one witness where the previous was corroborated — the drop is disclosed in words, not only in the sentence's own hedge */
  intoSingle: "",
});

/** Why a claim was not composed into the passage. Every one of these is REPORTED, never silent. */
export const COMPOSE_REFUSALS = Object.freeze({
  /** its merge came back UNDETERMINED — nothing bound it, so there is no assertion to make */
  UNDETERMINED: "undetermined",
  /** the injected renderer refused it (a case it does not render) */
  RENDERER_REFUSED: "renderer_refused",
  /** the renderer produced text but marked it UNVERIFIED — crown.js's own trace
   * veto fired and it fell back. A fallback is an honest thing for one
   * sentence to be; it is not an assertion a passage may carry as if it
   * were one, so it is withheld here and named. */
  UNVERIFIED: "unverified",
  /** no order could be declared over the claims, so no passage is emitted at all */
  NO_DECLARED_ORDER: "no_declared_order",
});

const firstEnd = (item) => String(item?.claim?.end1 ?? item?.claim?.subject ?? "").trim().toLowerCase();
const caseOf = (item) => String(item?.merged?.case ?? "").toUpperCase();

/**
 * transitionFor(prev, next) — which declared transition joins two composed
 * claims. Structural only: the shared subject, the standing, the contested
 * flag. Returns a KEY into TRANSITIONS, never a string of its own.
 */
export function transitionFor(prev, next) {
  if (!prev) return "open";
  const wasContested = caseOf(prev) === "DISAGREE";
  const isContested = caseOf(next) === "DISAGREE";
  if (isContested && !wasContested) return "intoContested";
  if (wasContested && !isContested) return "outOfContested";
  if (firstEnd(prev) && firstEnd(prev) === firstEnd(next)) return "sameSubject";
  const droppedToSingle = prev?.merged?.standing === "corroborated" && next?.merged?.standing === "single";
  if (droppedToSingle) return "intoSingle";
  return "newSubject";
}

/**
 * compose(items, { renderClaim, orderBy, transitions }) — the passage.
 *
 *   items       [{ claim, merged }] — a claim's own fields and its merged
 *               testimony (capacity-runner.js::mergeTestimony's shape).
 *               Already checked; nothing here re-judges one.
 *   renderClaim (merged, claim) -> string | null — crown.js's renderCrown in
 *               production. A null is a refusal and is reported, not skipped.
 *   orderBy     (a, b) -> number — the caller's declared comparator. Its
 *               ABSENCE is a refusal, never a fallback to input order: a
 *               ledger's fold order is not a narrative order, and emitting
 *               it as one would be this file asserting a sequence nobody
 *               declared.
 *
 * Returns { text, sentences, composed, withheld, coverage, refused }.
 */
export function compose(items, { renderClaim, orderBy = null, transitions = TRANSITIONS } = {}) {
  if (typeof renderClaim !== "function") throw new TypeError("compose: renderClaim is injected — this file holds no template of its own");
  const all = [...(items ?? [])];
  if (!all.length) return { text: "", sentences: [], composed: [], withheld: [], coverage: { given: 0, composed: 0, withheld: 0 }, refused: null };
  if (typeof orderBy !== "function") {
    return {
      text: "", sentences: [], composed: [], withheld: all.map((it) => ({ claim: it.claim, reason: COMPOSE_REFUSALS.NO_DECLARED_ORDER })),
      coverage: { given: all.length, composed: 0, withheld: all.length },
      refused: { type: COMPOSE_REFUSALS.NO_DECLARED_ORDER, detail: "compose orders nothing it was not told how to order — a guessed order is an argument nobody made" },
    };
  }

  const ordered = all.slice().sort(orderBy);
  const sentences = [];
  const composed = [];
  const withheld = [];
  let prev = null;
  for (const item of ordered) {
    if (caseOf(item) === "UNDETERMINED") { withheld.push({ claim: item.claim, reason: COMPOSE_REFUSALS.UNDETERMINED }); continue; }
    let out = null;
    try { out = renderClaim(item.merged, item.claim); } catch { out = null; }
    // A renderer may answer with a bare string or with the shape crown.js
    // actually returns ({ text, verified, ... }). An explicit `verified:
    // false` is crown.js's own trace veto having fired: it produced a
    // fallback rather than an assertion, and a passage may not carry that
    // as one.
    const body = String((out && typeof out === "object" ? out.text : out) ?? "").trim();
    if (!body) { withheld.push({ claim: item.claim, reason: COMPOSE_REFUSALS.RENDERER_REFUSED }); continue; }
    if (out && typeof out === "object" && out.verified === false) { withheld.push({ claim: item.claim, reason: COMPOSE_REFUSALS.UNVERIFIED }); continue; }
    const key = transitionFor(prev, item);
    const join = transitions[key] ?? "";
    // The transition is a PREFIX on the sentence it introduces, and when it
    // carries words the sentence's own first letter is lowered into it —
    // otherwise "But According to X" reads as two openings. Only ever the
    // first character, and only when the transition is non-empty, so a
    // sentence that stands alone is byte-identical to what the renderer
    // produced.
    const text = join ? `${join}${body.charAt(0).toLowerCase()}${body.slice(1)}` : body;
    sentences.push({ text, transition: key, claim: item.claim, case: caseOf(item), standing: item.merged?.standing ?? null });
    composed.push(item.claim);
    prev = item;
  }

  return {
    text: sentences.map((s) => s.text).join(" "),
    sentences, composed, withheld,
    coverage: { given: all.length, composed: composed.length, withheld: withheld.length },
    refused: null,
  };
}

/**
 * coverageLine(result) — the passage's own completeness, in words, for a
 * reader who should never have to infer what was left out. Natural
 * frequencies, never a bare percentage, and the withheld reasons named.
 */
export function coverageLine(result) {
  const { given = 0, composed = 0, withheld = 0 } = result?.coverage ?? {};
  if (!given) return "nothing was given to compose.";
  const byReason = {};
  for (const w of result?.withheld ?? []) byReason[w.reason] = (byReason[w.reason] ?? 0) + 1;
  const reasons = Object.entries(byReason).map(([r, n]) => `${n} ${r}`).join(", ");
  return `composed ${composed} of ${given} claim(s)` + (withheld ? `; ${withheld} withheld (${reasons})` : "; none withheld");
}
