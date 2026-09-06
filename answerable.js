// answerable.js — what the instrument can answer BEFORE the model (P129).
//
// User, 2026-09-06, looking at a reasoning probe the mouth kept getting
// wrong even after the engine handed it the worked-out number: "why is the
// model even doing the generation? how much of this can we do before it gets
// to the model?"
//
// The honest answer is: for a whole class of questions, all of it. The
// instrument already knows the answer exactly, at an address, and passing it
// through a 2B model can only degrade it. Measured, on one comparison:
//
//   the engine computed          1805, 36 years apart
//   the mouth, told that fact    "There are 46 years between them."
//   the mouth, told nothing      "There are 41 years between them."
//
// Handing a small model the answer does not make it say the answer. So this
// module answers, and the model is not asked. `arithmetic.js`'s own door has
// said the law since August: a wrong mechanical answer is worse than none,
// and a model-guessed one is exactly the failure the door exists to stop.
//
// WHAT MAY BE ANSWERED HERE. Only what is recoverable EXACTLY, with an
// address: a computation over values the question names; a blank whose
// filling sits verbatim in the material; a question about what was said,
// whose answer is verbatim in the record. Anything needing prose — a
// summary, an explanation, a judgement — is not this module's, returns null,
// and the turn proceeds to the model as before. When in doubt this module
// declines: silence here costs a model call, a wrong answer costs the truth.
//
// PURE: no model, no I/O, no engine of its own (the arithmetic engine and the
// sentence splitter are injected, this repo's standing pattern).
import { checkComparison } from "./arithmetic.js";
import { quotedAsk } from "./transcript.js";

/** A blank as the probes and people write one: three or more underscores, or a bracketed ellipsis. */
const BLANK_RE = /_{3,}|\[\s*\.\.\.\s*\]|\.\.\.\.+/;
const CLOZE_ASK_RE = /\b(?:what|which)\b[^?]{0,40}\b(?:fills?|goes in|belongs in|is missing from|completes?)\b[^?]{0,20}\bblank\b|\bfill in the blank\b/i;
const WHICH_PASSAGE_RE = /\b(?:which|what)\s+(?:passage|source|file|document|line)\b[^?]{0,30}\b(?:says?|states?|shows?|has|contains?)\b/i;

const squash = (t) => String(t ?? "").replace(/\s+/g, " ").trim();
const foldc = (t) => squash(t).toLowerCase();

/**
 * clozeAnswer(question, passages) → { text, filler, ref, start, end } | null
 * A question quoting a passage with a blank in it. The filling is whatever
 * the material has between the quoted prefix and suffix — recovered by
 * alignment, never guessed. Ambiguity (no passage carries both sides, or two
 * passages disagree) returns null: the model can have it.
 */
export function clozeAnswer(question, passages = []) {
  const q = String(question ?? "");
  if (!BLANK_RE.test(q)) return null;
  const quoted = quotedAsk(q) ?? q;
  const m = quoted.match(BLANK_RE);
  if (!m) return null;
  const cut = quoted.indexOf(m[0]);
  // Enough of each side to be unambiguous, but not so much that ordinary
  // requoting drift breaks the match.
  const prefix = squash(quoted.slice(0, cut)).split(" ").slice(-8).join(" ");
  const suffix = squash(quoted.slice(cut + m[0].length)).split(" ").slice(0, 8).join(" ");
  if (prefix.length < 6 && suffix.length < 6) return null;
  const hits = [];
  for (const p of passages) {
    const text = String(p?.text ?? "");
    const hay = foldc(text);
    const i = prefix ? hay.indexOf(foldc(prefix)) : 0;
    if (prefix && i < 0) continue;
    const from = prefix ? i + foldc(prefix).length : 0;
    const j = suffix ? hay.indexOf(foldc(suffix), from) : hay.length;
    if (suffix && j < 0) continue;
    // Map back to the passage's own bytes by walking the squashed offsets.
    const raw = squash(text);
    const fillerRaw = raw.slice(from, suffix ? j : Math.min(raw.length, from + 60)).trim();
    if (!fillerRaw || fillerRaw.length > 80) continue;
    const at = text.indexOf(fillerRaw);
    hits.push({ filler: fillerRaw, ref: p.ref ?? null, start: at >= 0 ? at : null, end: at >= 0 ? at + fillerRaw.length : null });
  }
  const distinct = [...new Set(hits.map((h) => foldc(h.filler)))];
  if (hits.length !== 1 && distinct.length !== 1) return null;   // nothing, or the material disagrees with itself
  const hit = hits[0];
  return { ...hit, text: `${hit.filler}${hit.ref ? ` — ${hit.ref}${hit.start != null ? `, bytes ${hit.start}–${hit.end}` : ""}` : ""}` };
}

/**
 * priorAnswer(question, transcript) → { text, turn } | null
 * "Earlier I asked X — what did you answer?" The record holds it verbatim.
 * Only when the quoted question matches ONE earlier turn; a vague "what did
 * you say" is not this module's to answer.
 */
export function priorAnswer(question, transcript = []) {
  const quoted = quotedAsk(question);
  if (!quoted) return null;
  const want = foldc(quoted);
  const hits = transcript.filter((t) => t?.question && foldc(t.question).includes(want.slice(0, 60)));
  if (hits.length !== 1) return null;
  const t = hits[0];
  const said = squash(t.answer);
  if (!said) return null;
  return { turn: t.turn, text: `On turn ${t.turn} you were asked "${squash(t.question)}" and the answer given was: ${said}` };
}

/** whichPassage(question, passages) → the addresses actually retrieved, when that IS the question. */
export function whichPassage(question, passages = []) {
  if (!WHICH_PASSAGE_RE.test(String(question ?? ""))) return null;
  const refs = [...new Set(passages.map((p) => p?.ref).filter(Boolean))];
  if (!refs.length) return null;
  return { refs, text: `From ${refs.length === 1 ? "this passage" : "these passages"}: ${refs.join(", ")}.` };
}

/**
 * answerBeforeTheModel({ question, passages, transcript, math, splitSentences })
 *   → { kind, text, addresses, why } | null
 *
 * The one door. Ordered by how exactly the answer is known: a computation
 * over the question's own numbers, then a blank the material fills verbatim,
 * then what the record says was said, then the addresses themselves.
 */
/**
 * wantsProse(question) → true when the person asked for more than the fact:
 * a reason, a meaning, a description, a summary. Such a question may CONTAIN
 * something computable, and the computation is still handed over as a fact —
 * but the turn belongs to the model, because the rest of the ask does.
 * Without this, "which is earlier, and why does it matter?" would be answered
 * with a subtraction and the person's actual question dropped.
 */
const PROSE_ASK_RE = /\b(?:why|how come|explain|describe|summari[sz]e|elaborate|tell me about|what does (?:that|this|it) (?:mean|tell|suggest|imply)|what do you (?:think|make)|significan(?:ce|t)|matters?|implications?|context|discuss|compare and contrast)\b/i;
export const wantsProse = (question) => PROSE_ASK_RE.test(String(question ?? ""));

export function answerBeforeTheModel({ question, passages = [], transcript = [], math = null } = {}) {
  // A question that also asks for prose is the model's, whatever else it carries.
  if (wantsProse(question)) return null;
  const comparison = math ? checkComparison(question, { math }) : null;
  if (comparison && !comparison.gap) {
    return { kind: "comparison", text: comparison.sentence, addresses: [], why: "the values are in the question and the engine took the difference", comparison };
  }
  const cloze = clozeAnswer(question, passages);
  if (cloze) return { kind: "cloze", text: cloze.text, addresses: [cloze.ref].filter(Boolean), why: "the material carries the filling verbatim between the quoted words" };
  const prior = priorAnswer(question, transcript);
  if (prior) return { kind: "prior-answer", text: prior.text, addresses: [`turn:${prior.turn}`], why: "the record holds what was said" };
  const which = whichPassage(question, passages);
  if (which) return { kind: "which-passage", text: which.text, addresses: which.refs, why: "the question asks for the address, which retrieval already knows" };
  return null;
}
