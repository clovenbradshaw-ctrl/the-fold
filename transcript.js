// transcript.js — the conversation's own record, made retrievable (P128).
//
// The fold's standing claim is that the transcript grows without limit while
// the carried context does not, because the RECORD holds what the window
// drops. For sources that was true. For the conversation itself it was not:
// asked "earlier I asked you X — what did you answer?", the instrument passed
// only the last few turns of chat history, so beyond that window the mouth
// was asked to remember something it could not see, and answered from
// nothing. Measured (S77): the memory probe scored 0.00, 0.00, 0.25, 0.00.
//
// The fix is the one the architecture already implies: a question ABOUT the
// conversation retrieves from the conversation, exactly as a question about
// the material retrieves from the material. A prior turn comes back as a
// passage with an address (`turn:12`), joins the pool, and every organ
// downstream — snips, atoms, the witness, the ground ladder — works on it
// unchanged.
//
// WHAT A PRIOR TURN IS EVIDENCE OF. Only of what was said. An answer the
// mouth gave is testimony, not material: it grounds "you said X", never "X is
// true". So its ref is marked `turn:` and its `kind` is "transcript", and the
// ladder places it on the record (SYN·Figure) rather than in the material
// (CON·Figure). This file never lets a prior answer stand as a source for a
// claim about the world.
//
// PURE: no I/O, no model.
import { CLAIM_STOPWORDS } from "./grounding.js";

const fold = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const words = (t) => new Set(fold(t).split(/[^\p{L}\p{N}_]+/u).filter((w) => w.length > 3 && !CLAIM_STOPWORDS.has(w)));
/** How many prior turns a question about the conversation is handed. Declared (P9). */
export const RECALL_TURNS = 3;

/** The ways a person points back at what was said, rather than at the material. */
const ABOUT_RE = /\b(?:earlier|previously|before|a moment ago|last time|already)\b[^.?]{0,60}\b(?:asked|said|told|answered|mentioned|replied)\b|\b(?:what|which)\b[^.?]{0,30}\b(?:did|do)\s+(?:you|i|we)\b[^.?]{0,30}\b(?:say|said|answer|answered|tell|told|ask|asked|call)\b|\byou (?:said|answered|told me|mentioned|replied|called)\b|\bi asked\b|\bwe (?:discussed|talked about|covered)\b|\byour (?:earlier|previous|last|first) (?:answer|reply|response)\b|\brepeat (?:what|the)\b/i;

/** Is this question about the conversation itself? */
export const isAboutConversation = (question) => ABOUT_RE.test(String(question ?? ""));

/** The question a person quoted back at us, if they quoted one. */
export function quotedAsk(question) {
  const m = String(question ?? "").match(/["“]([^"”]{8,300})["”]/);
  return m ? m[1].trim() : null;
}

/**
 * recallTurns(question, transcript, { max }) → [{ ref, source, kind, text, turn, start, end }]
 * The prior turns a question about the conversation is asking after, most
 * relevant first, as passages the rest of the instrument can read.
 *
 * `transcript`: [{ turn, question, answer }] in order, oldest first.
 * Relevance: the quoted question wins outright (it names the turn exactly);
 * otherwise the overlap of content words between the question and the prior
 * turn's own question and answer. A turn with nothing in common is not
 * returned — an absence of relevant history is a finding, not a reason to
 * hand over the three most recent turns regardless.
 */
export function recallTurns(question, transcript = [], { max = RECALL_TURNS } = {}) {
  if (!Array.isArray(transcript) || !transcript.length) return [];
  const q = String(question ?? "");
  const quoted = quotedAsk(q);
  const qw = words(quoted ? `${q} ${quoted}` : q);
  const scored = [];
  for (const t of transcript) {
    if (!t || t.answer == null) continue;
    const asked = String(t.question ?? "");
    const exact = quoted && fold(asked).includes(fold(quoted).slice(0, 60));
    const hay = words(`${asked} ${t.answer}`);
    let shared = 0;
    for (const w of qw) if (hay.has(w)) shared += 1;
    if (!exact && shared < 2) continue;
    scored.push({ t, score: exact ? 1e6 + shared : shared });
  }
  return scored
    .sort((a, b) => b.score - a.score || b.t.turn - a.t.turn)
    .slice(0, max)
    .map(({ t }) => asPassage(t));
}

/** A prior turn as an addressed passage. The address is the turn, not a byte range in a file. */
export function asPassage(t) {
  const text = `You were asked: ${String(t.question ?? "").trim()}\nYou answered: ${String(t.answer ?? "").trim()}`;
  return {
    ref: `turn:${t.turn}`,
    source: `turn:${t.turn}`,
    kind: "transcript",
    turn: t.turn,
    start: 0,
    end: text.length,
    text,
  };
}

/** True for a passage this module produced — the one place anything downstream needs to ask. */
export const isTranscriptPassage = (p) => String(p?.ref ?? "").startsWith("turn:") || p?.kind === "transcript";

/**
 * The line that says what these passages are, so the mouth reads them as the
 * record of what was said and not as material about the world.
 */
export function transcriptLine(passages = []) {
  const turns = passages.filter(isTranscriptPassage).map((p) => p.turn).filter((n) => Number.isFinite(n));
  if (!turns.length) return "";
  return `Turn${turns.length === 1 ? "" : "s"} ${turns.sort((a, b) => a - b).join(", ")} of this conversation, quoted from the record. This is what was said, which is not the same as what the sources establish.`;
}
