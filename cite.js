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

import { foldDiacritics, retrieve, tokenize } from "./source.js";

/**
 * Sentence-ish. Splits on terminal punctuation and on newlines, because a
 * model writing a list puts one claim per line and never a full stop.
 */
export function splitSentences(text) {
  const pieces = String(text ?? "")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  // An address written after the full stop still belongs to the sentence it
  // follows. Observed live: a model ended with "...per decade. [kess#80-174]",
  // the address split off as its own piece, the sentence before it looked
  // uncited, and attribution attached a second tag saying the same thing.
  const out = [];
  for (const piece of pieces) {
    if (out.length && /^\[[^\]\s]+#\d+-\d+\]/.test(piece)) out[out.length - 1] += " " + piece;
    else out.push(piece);
  }
  return out;
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
 * The alphabet these patterns read is the whole one, not ASCII.
 *
 * The first version wrote `[A-Z]` and `\w` with no /u flag, and JS means
 * exactly [A-Za-z0-9_] by both. On a corpus that writes Pávlovna, Bezúkhov
 * and Hélène that is not a small inaccuracy, it is the veto switching off:
 * "Anna Pávlovna" extracted as "Anna P" (the name broke at the accent) and
 * "Éloise Dupré" extracted as nothing at all, because É is not [A-Z] and
 * "Dupré" alone cannot make the required run of two. A sentence attributing
 * a real phrase to an INVENTED accented subject then took the address the
 * identical ASCII sentence is refused — the exact false warrant the veto
 * below exists to prevent, resurrected for every non-ASCII name.
 *
 * The fold at the comparison site cannot rescue this: `namesSupported` folds
 * both sides, but it folds what extraction handed it, and extraction had
 * already dropped the name. Reading the right alphabet has to happen here.
 *
 * So: `\p{Lu}` for a capital and `[\p{L}\p{N}_]` for a word character, under
 * /u — the same character classes `grounding.js::PROPER_RE` already uses, so
 * the two organs agree about what a name is. `\b` cannot come along: it is
 * defined on ASCII \w even under /u, so `\bÉ` never matches. Its two duties
 * are carried explicitly instead — a lookbehind so a capital inside a word
 * does not start a name ("iPhone Pro" is still not a name), and a lookbehind
 * on the end so a run never closes on the "." or "'" the class carries
 * inside it ("MNPD BOLO." still yields "MNPD BOLO").
 *
 * Differential against the old patterns over War and Peace: identical on all
 * 30,502 ASCII-only lines, and 1,994 accented lines where a name that had
 * been truncated or lost now arrives whole.
 */
const NAME_RUN_RE =
  /(?<![\p{L}\p{N}_])(\p{Lu}[\p{L}\p{N}_.'-]*(?:\s+\p{Lu}[\p{L}\p{N}_.'-]*)+)(?<=[\p{L}\p{N}_])/gu;
const ACRONYM_RE = /(?<![\p{L}\p{N}_])(\p{Lu}{2,})(?![\p{L}\p{N}_])/gu;

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
  for (const m of s.matchAll(NAME_RUN_RE)) names.add(m[1]);
  for (const m of s.matchAll(ACRONYM_RE)) names.add(m[1]);
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
  // Folded on both sides — the veto must not refuse "Helene" against a
  // passage that writes "Hélène" (measured live on War and Peace; same fold
  // retrieval already applies).
  const hay = foldDiacritics(chunk.text.toLowerCase());
  return namesIn(text).every((n) => {
    // A multi-word name counts as present if its distinctive parts are — the
    // material writes "Kansas Highway Patrol", a sentence may write "the
    // Kansas Highway Patrol's search" — but every part must be there.
    const parts = foldDiacritics(n.toLowerCase()).split(/\s+/).filter((p) => p.length > 1);
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
      const s = overlap(terms, c, common);
      if (s > score) {
        score = s;
        ref = c.ref;
        best = c;
      }
    }
    // The names check vetoes the winner; it does not choose one.
    //
    // As a filter it inverted a live attribution: a claim about a figure was
    // attached to the paragraph naming the report rather than the paragraph
    // stating the figure, because only the first said "Kessington" — the
    // second says "The report". Screening candidates by name let a passage
    // that merely mentions the subject beat the one the claim came from.
    // Judging by evidence and then refusing on a name mismatch cannot do
    // that: the worst it does is decline.
    if (best && !namesSupported(text, best)) return { text, ref: null, score, floor: 0, vetoed: true };
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
