// cite.js — attaching addresses without asking for them.
//
// The model was told to write `[source#start-end]` after any claim it took
// from the material. Two models four times apart in size both ignored that on
// tabular material — zero addresses across six turns — so every record read
// "material retrieved but uncited" and nothing was warranted. The instruction
// is the weak link, and an instruction is the wrong tool: the app already
// knows which passages it handed over and what the answer says. The address
// can be attached rather than requested.
//
// What that must not become is decoration. A sentence that happens to share
// the word "search" with a passage has not been sourced by it, and stamping an
// address on it would manufacture exactly the false warrant the rest of this
// design exists to refuse. So attribution is measured against a null built
// from the same corpus: a sentence is attributed to a passage only when its
// overlap with that passage beats the best overlap the same sentence gets
// against material the turn never touched.
//
// Pure: no DOM, no IO, no model. `attribute` is the whole surface.

import { retrieve, tokenize } from "./source.js";

/**
 * Sentence-ish. Splits on terminal punctuation and on newlines, because a
 * model writing a list puts one claim per line and never a full stop.
 */
export function splitSentences(text) {
  return String(text ?? "")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * The longest run of terms the sentence and the passage share in order.
 *
 * Shared *words* are the wrong signal: a sentence and a passage both about
 * searches both contain "search", and counting that as evidence would stamp an
 * address on a coincidence. A shared run of consecutive terms is a phrase, and
 * a phrase is the smallest thing that can be said to have come from somewhere.
 *
 * A run of one is a word, not a phrase — that is what the word means, not a
 * tuned cutoff — so `MIN_RUN` is 2, and the null still has to be beaten on top
 * of it.
 */
export const MIN_RUN = 2;

/**
 * Tokens that appear in most of the corpus, which therefore cannot tell you
 * which passage a claim came from.
 *
 * Measured, not listed. On prose this catches almost nothing. On a spreadsheet
 * it catches the format — the agency name repeated on every row, the word
 * "lookup", the shape of a timestamp — and that matters, because rows are
 * mostly boilerplate and a run of shared boilerplate is not a quotation.
 *
 * The cutoff is "present more often than absent". That is not a tuned knob: a
 * term in more than half the passages is, on balance, telling you about the
 * corpus rather than about a passage.
 */
/** Below this, a frequency is not a frequency and nothing counts as common. */
export const CORPUS_MINIMUM = 10;

export function commonTerms(pool) {
  if (pool.length < CORPUS_MINIMUM) return new Set();
  const df = new Map();
  for (const c of pool) for (const t of c.terms) df.set(t, (df.get(t) ?? 0) + 1);
  const cut = pool.length / 2;
  const common = new Set();
  for (const [t, n] of df) if (n > cut) common.add(t);
  return common;
}

export function overlap(sentenceTerms, chunk, common) {
  const a = common?.size ? sentenceTerms.filter((t) => !common.has(t)) : sentenceTerms;
  // Ordered, with duplicates — the Set on a chunk has neither, and a run
  // needs the sequence the words actually appear in.
  const all = chunk.termList ?? (chunk.termList = tokenize(chunk.text));
  const b = common?.size ? all.filter((t) => !common.has(t)) : all;
  // Standard longest-common-substring DP over token arrays, one row at a time.
  let prev = new Uint16Array(b.length + 1);
  let best = 0;
  for (let i = 1; i <= a.length; i++) {
    const row = new Uint16Array(b.length + 1);
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        row[j] = prev[j - 1] + 1;
        if (row[j] > best) best = row[j];
      }
    }
    prev = row;
  }
  return best;
}

/**
 * The null: the best score this sentence gets from a passage the turn did not
 * offer it.
 *
 * The first version of this strided the corpus at random, and it was the wrong
 * comparison. Measured on 16MB of search records, a row scored against its own
 * immediate neighbours was falsely warranted 35% of the time: adjacent rows
 * share dates, formats and repeated values, so both the score and the random
 * null were large and the margin between them survived.
 *
 * The question is not "does this passage beat an unrelated one" — nearly
 * anything does. It is "does this passage beat the best *other* passage in the
 * corpus", and answering it means looking where a competitor would actually
 * be. So the null is drawn by retrieval on the sentence itself: the hardest
 * available comparison rather than an easy one. When the true source is not
 * among the offered passages it turns up here instead, outscores them, and the
 * claim is refused — which is the behaviour that was missing.
 */
function nullBest(sentence, sentenceTerms, pool, offered, samples, common) {
  const skip = new Set(offered.map((c) => c.ref));
  const rivals = retrieve(pool, sentence, samples).filter((c) => !skip.has(c.ref));
  let best = 0;
  for (const c of rivals) {
    const score = overlap(sentenceTerms, c, common);
    if (score > best) best = score;
  }
  return best;
}

export const NULL_SAMPLES = 12;

/** An address the model wrote for itself, in the shape source.js emits. */
const ALREADY_CITED = /\[[^\]\s]+#\d+-\d+\]/;

/**
 * The names a sentence commits to: runs of two or more capitalised words, and
 * bare acronyms. "Kansas Highway Patrol", "Bryan TX PD", "MNPD", "TBI".
 *
 * A single leading capital is not a name — every sentence starts with one —
 * so a run of two is the smallest thing that can be one, the same reasoning
 * that makes MIN_RUN 2.
 */
export function namesIn(text) {
  const s = String(text ?? "");
  const names = new Set();
  for (const m of s.matchAll(/\b([A-Z][\w.'-]*(?:\s+[A-Z][\w.'-]*)+)\b/g)) names.add(m[1]);
  for (const m of s.matchAll(/\b([A-Z]{2,})\b/g)) names.add(m[1]);
  return [...names];
}

/**
 * Every name the sentence uses has to appear in the passage.
 *
 * This is the rule that stops a shared phrase from warranting a claim the
 * passage does not make. Observed live: a model wrote "Bryan TX PD: the reason
 * was MNPD BOLO", and the phrase "MNPD BOLO" really was in the material — in
 * Hendersonville TN PD's row. Bryan TX PD had run no searches at all. The
 * phrase matched, the subject was invented, and an address on that sentence
 * would have been a warrant for a thing that never happened.
 */
function namesSupported(text, chunk) {
  const hay = chunk.text.toLowerCase();
  return namesIn(text).every((n) => {
    // A multi-word name counts as present if its distinctive parts are — the
    // material writes "Kansas Highway Patrol", a sentence may write "the
    // Kansas Highway Patrol's search" — but every part must be there.
    const parts = n.toLowerCase().split(/\s+/).filter((p) => p.length > 1);
    return parts.every((p) => hay.includes(p));
  });
}

/**
 * Attribute each sentence of an answer to one of the passages the turn was
 * given, or to nothing.
 *
 * Returns one entry per sentence: `{text, ref, score, floor}`. `ref` is null
 * when the sentence's best offered passage did not beat the null — which is
 * the common case for a sentence that summarizes, hedges, or answers from the
 * model's own knowledge, and those should not carry an address.
 */
export function attribute(answer, offered, pool = [], { samples = NULL_SAMPLES } = {}) {
  if (!offered?.length) return [];
  // What the corpus says everywhere cannot say where anything came from.
  const common = commonTerms(pool.length ? pool : offered);
  return splitSentences(answer).map((text) => {
    // A sentence that already carries an address is not attributed. Measuring
    // it again would put two tags on one claim — the model's and this app's,
    // saying the same thing twice — and attribution exists to fill the gap
    // where the model said nothing, not to sign its work.
    if (ALREADY_CITED.test(text)) return { text, ref: null, score: 0, floor: 0, cited: true };
    const terms = tokenize(text);
    let ref = null;
    let score = 0;
    let best = null;
    for (const c of offered) {
      // A passage that contradicts the sentence's own names cannot be its
      // source, however much phrasing they share.
      if (!namesSupported(text, c)) continue;
      const s = overlap(terms, c, common);
      if (s > score) {
        score = s;
        ref = c.ref;
        best = c;
      }
    }
    // The floor this sentence has to clear is the best score the same words
    // get from material the turn never saw. Beating it means the passage
    // carried something the corpus at large does not.
    const floor = nullBest(text, terms, pool.length ? pool : offered, offered, samples, common);
    // Both tests: a phrase rather than a word, and better than the corpus
    // at large gives the same words for free.
    const attributed = score >= MIN_RUN && score > floor;
    return { text, ref: attributed ? ref : null, score, floor };
  });
}

/** The distinct addresses an attribution run actually attached. */
export function attributedRefs(entries) {
  return [...new Set(entries.filter((e) => e.ref).map((e) => e.ref))];
}
