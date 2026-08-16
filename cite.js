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

import { tokenize } from "./source.js";

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

export function overlap(sentenceTerms, chunk) {
  const a = sentenceTerms;
  // Ordered, with duplicates — the Set on a chunk has neither, and a run
  // needs the sequence the words actually appear in.
  const b = chunk.termList ?? (chunk.termList = tokenize(chunk.text));
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
 * The null: the same sentence, scored against material this turn never
 * retrieved. Drawn by striding the pool rather than at random, so the answer
 * is the same every time it is computed — a citation that changes between two
 * runs over identical inputs is not evidence of anything.
 */
function nullBest(sentenceTerms, pool, offered, samples) {
  const skip = new Set(offered.map((c) => c.ref));
  const candidates = pool.filter((c) => !skip.has(c.ref));
  if (!candidates.length) return 0;
  const stride = Math.max(1, Math.floor(candidates.length / samples));
  let best = 0;
  for (let i = 0; i < candidates.length; i += stride) {
    const score = overlap(sentenceTerms, candidates[i]);
    if (score > best) best = score;
  }
  return best;
}

export const NULL_SAMPLES = 60;

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
  return splitSentences(answer).map((text) => {
    const terms = tokenize(text);
    let ref = null;
    let score = 0;
    let best = null;
    for (const c of offered) {
      // A passage that contradicts the sentence's own names cannot be its
      // source, however much phrasing they share.
      if (!namesSupported(text, c)) continue;
      const s = overlap(terms, c);
      if (s > score) {
        score = s;
        ref = c.ref;
        best = c;
      }
    }
    // The floor this sentence has to clear is the best score the same words
    // get from material the turn never saw. Beating it means the passage
    // carried something the corpus at large does not.
    const floor = nullBest(terms, pool.length ? pool : offered, offered, samples);
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
