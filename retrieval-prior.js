// retrieval-prior.js — retrieval decided against a prior and against what is
// activated, instead of by counting words (P141). Pure.
//
// User, 2026-09-06: "it's more about using that universe of priors in our
// activation, surprises, retrieval etc."
//
// `source.js::retrieve` scores a passage by RAW TERM HITS:
//
//   const hits = qTerms.filter((t) => c.terms.has(t)).length;
//
// A passage sharing "the" and "and" with the question scores exactly like one
// sharing "Kutúzov". Nothing in that expression knows which words carry the
// question and which are furniture, and this instrument has had the apparatus
// to know for a long time — priors, a surprise ladder, a cast of activated
// referents — none of which retrieval consults. Almost every failure this
// session chased runs back to that line:
//
//   * the source a question CITED was not retrieved, because a planted name
//     from another book out-hit it (P135);
//   * the Lincoln article and War and Peace were confused, because term
//     overlap cannot tell which source a claim is ABOUT (P133);
//   * 82% of memory answers changed the subject, because the passages handed
//     over shared words with the question and not its subject.
//
// THE THREE READINGS, each taken against something rather than counted:
//
//   PRIOR       a term's weight is its own surprise in THIS corpus. A form in
//               every passage separates nothing and is worth nothing; a form
//               in one passage all but names it. Derived from the material at
//               hand — the corpus is its own best prior and needs no general
//               one (the same move calibration.js makes for a threshold).
//   ACTIVATION  referents live in the recent discourse weigh more. What a
//               conversation is currently ABOUT is a fact the instrument
//               already holds and retrieval never asked for.
//   CITATION    a source the question names outranks one it does not, because
//               a claim is made OF a source (P135).
//
// PURE: no I/O. The corpus prior is built once from the chunks the caller
// already has.
const fold = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * corpusPrior(chunks) → { df, n, weight(term) }
 * How surprising each form is in this material. `weight` is the self-
 * information of meeting the term in a passage drawn at random: log(N/df).
 * A term in every passage weighs 0 — it is not evidence, it is the medium.
 */
export function corpusPrior(chunks = []) {
  const df = new Map();
  for (const c of chunks) {
    const seen = c.terms instanceof Set ? c.terms : new Set(fold(c?.text ?? "").split(/[^\p{L}\p{N}]+/u).filter(Boolean));
    for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const n = Math.max(1, chunks.length);
  return {
    df, n,
    weight: (term) => {
      const d = df.get(term) ?? 0;
      if (!d) return 0;                       // never seen: it cannot separate
      return Math.log(n / d);                 // in every passage → 0
    },
  };
}

/**
 * activated(transcript, { turns, max }) → Set of surfaces the conversation is
 * currently about. Names carried by the last few turns, folded. What is on the
 * table weighs more than what is merely mentioned in the corpus.
 */
export function activated(transcript = [], { turns = 4, namesOf = null } = {}) {
  const out = new Set();
  const recent = transcript.slice(-turns);
  for (const t of recent) {
    const text = `${t?.question ?? ""} ${t?.answer ?? ""}`;
    const names = typeof namesOf === "function" ? namesOf(text) : [];
    for (const n of names) out.add(fold(n));
  }
  return out;
}

/** How much a passage's score is raised for being about something live. Declared, and small: activation is a nudge, not a verdict. */
export const ACTIVATION_BONUS = 0.5;
/** How much a source the question names outranks one it does not. Declared. */
export const CITATION_BONUS = 2.0;

/**
 * scoreAgainstPrior(chunk, qTerms, { prior, live, cited }) → number
 * The reading, in one place, so a caller can explain any ranking it produced.
 */
export function scoreAgainstPrior(chunk, qTerms = [], { prior, live = new Set(), cited = null } = {}) {
  const terms = chunk.terms instanceof Set ? chunk.terms : new Set();
  let score = 0;
  for (const t of qTerms) if (terms.has(t)) score += prior ? prior.weight(t) : 1;
  if (live.size) {
    const text = fold(chunk?.text ?? "");
    for (const name of live) if (name.length > 3 && text.includes(name)) { score += ACTIVATION_BONUS; break; }
  }
  if (cited && String(chunk?.ref ?? chunk?.source ?? "").includes(cited)) score += CITATION_BONUS;
  return score;
}

/**
 * rank(chunks, question, { prior, live, cited, limit, tokenize, foldedRefs })
 *   → the passages, most informative first, each with why it ranked.
 * A drop-in for `retrieve` that can say what it did.
 */
export function rank(chunks = [], question = "", { prior = null, live = new Set(), cited = null, limit = 3, tokenize, foldedRefs = [] } = {}) {
  const qTerms = [...new Set(typeof tokenize === "function" ? tokenize(question) : fold(question).split(/[^\p{L}\p{N}]+/u).filter(Boolean))];
  if (!qTerms.length) return [];
  const folded = new Set(foldedRefs);
  const scored = chunks
    .map((c) => {
      const raw = scoreAgainstPrior(c, qTerms, { prior, live, cited });
      return { chunk: c, score: folded.has(c.ref) ? raw / 2 : raw };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || (a.chunk.start ?? 0) - (b.chunk.start ?? 0));
  return scored.slice(0, limit).map((s) => s.chunk);
}
