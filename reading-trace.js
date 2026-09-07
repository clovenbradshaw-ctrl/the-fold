// reading-trace.js — what the reading DID with each passage, as typed acts on
// the graph (P142). Pure.
//
// User, 2026-09-06: "what is a frontier model doing? let's put that reasoning
// into the hyper/meta graph."
//
// So it was read off twelve answers a frontier model gave to this run's own
// probes, on the same material the fold had. The moves it made:
//
//   10/12  cites an address                      the fold does this
//    6/12  corrects the premise                  the fold does this (P133/P135)
//    5/12  NAMES WHAT IT CHECKED AND EXCLUDED    the fold does NOT
//    4/12  declares a void WITH ITS REASON       partly
//    1/12  reasons about whether the extent suffices
//    1/12  diagnoses where the error came from
//
// The gap that matters is the third. Asked about a line, it wrote: "The only
// other material available is two unrelated Prince Andrew scenes … neither
// touches this exchange, so nothing here establishes its significance." The
// fold retrieves three passages, uses whichever bear, and silently drops the
// rest — so a reader cannot tell an answer that searched and found nothing
// from one that never looked. That distinction is this project's oldest law
// (a measured absence is a finding; a failure to look is a fact about the
// reader) and the turn was not recording which one it had.
//
// A retrieved passage therefore leaves the turn with a VERDICT, and those
// verdicts are relations over the material — the meta-graph the hypergraph
// was missing. It holds what the material says; this holds what the reading
// did with it.
import { CLAIM_STOPWORDS } from "./grounding.js";
import { atomsOf } from "./snip-check.js";

const fold = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const contentWords = (t) => [...new Set(fold(t).split(/[^\p{L}\p{N}]+/u))].filter((w) => w.length > 3 && !CLAIM_STOPWORDS.has(w));

/** What became of a passage this turn. Each is a different fact about the reading. */
export const VERDICT = Object.freeze({
  BORE: "bore",                    // something in the answer stands on it
  CHECKED_SILENT: "checked-silent", // read, shares the question's words, said nothing that answered
  CHECKED_APART: "checked-apart",   // read, and it is about something else
});

/**
 * traceReading({ passages, question, used }) → [{ ref, verdict, why }]
 * `used`: the refs the answer actually stands on (from the ground ladder's
 * addresses, the snips that were cited, the claims' spans).
 *
 * A passage that was retrieved and did NOT bear is not noise to be dropped —
 * it is the difference between "nothing says this" and "I did not look".
 */
export function traceReading({ passages = [], question = "", used = [] } = {}) {
  const bore = new Set(used.map((u) => String(u).split("~")[0]));
  const qw = contentWords(question);
  return passages.map((p) => {
    const ref = String(p?.ref ?? "");
    if (bore.has(ref) || [...bore].some((b) => ref.includes(b) || b.includes(ref))) {
      return { ref, verdict: VERDICT.BORE, why: "the answer stands on it" };
    }
    const text = fold(p?.text ?? "");
    const shared = qw.filter((w) => text.includes(w));
    if (shared.length >= 2) return { ref, verdict: VERDICT.CHECKED_SILENT, why: `read, and it speaks of ${shared.slice(0, 3).join(", ")} — but says nothing that answers this`, shared };
    return { ref, verdict: VERDICT.CHECKED_APART, why: "read, and it is about something else", shared };
  });
}

/**
 * traceLine(trace) → the sentence a person needs and the fold never wrote:
 * what else was looked at, and that it did not bear. Said only when something
 * WAS excluded, and never as apparatus — it is a fact about the search.
 */
export function traceLine(trace = []) {
  const apart = trace.filter((t) => t.verdict !== VERDICT.BORE);
  if (!apart.length) return "";
  const silent = apart.filter((t) => t.verdict === VERDICT.CHECKED_SILENT);
  const parts = [];
  if (silent.length) parts.push(`${silent.map((t) => t.ref).join(", ")} ${silent.length === 1 ? "was" : "were"} read and ${silent.length === 1 ? "speaks" : "speak"} of the same things without answering this`);
  const away = apart.filter((t) => t.verdict === VERDICT.CHECKED_APART);
  if (away.length) parts.push(`${away.map((t) => t.ref).join(", ")} ${away.length === 1 ? "was" : "were"} read and ${away.length === 1 ? "is" : "are"} about something else`);
  return `Also looked at: ${parts.join("; ")}.`;
}

/**
 * The acts, in the shape the ledger takes (kernel/notes.js entries): a
 * relation between this question and each passage, so the reading itself
 * accumulates on the record instead of being thrown away at the end of a turn.
 *
 * CON·Figure, because what is being landed is an INCIDENCE — whether this
 * passage and this question meet. `bore` is the positive; the other two are
 * this instrument's ordinary honest negative, and they are landed rather than
 * left silent precisely so that "nothing bore" can be told apart from
 * "nothing was read".
 */
export function actsFor(question, trace = [], { at = null } = {}) {
  return trace.map((t) => ({
    kind: "reading",
    operator: "CON",
    grain: "figure",
    end1: String(question).slice(0, 160),
    label: t.verdict,
    end2: t.ref,
    because: t.why,
    ...(at ? { at } : {}),
  }));
}

/** Did this turn look at anything at all? An empty trace is not "nothing bore" — it is "nothing was read", and they may never share a word. */
export const looked = (trace = []) => trace.length > 0;
