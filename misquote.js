// misquote.js — a quotation checked as a QUOTATION, not as a bag of atoms (P133).
//
// The universal bug this closes, measured live (S77, turn 15). The probe took
// a real sentence of War and Peace — «"Both true and untrue," Pierre began;
// but Prince Andrew interrupted him.» — swapped ONE name to Lincoln, and
// asserted it as established. Every check passed it:
//
//   premises: { checked: 4, unverified: 0, contradicted: 0 }
//
// because "Lincoln" is unquestionably in the material. It is in the Lincoln
// article. The corpus-wide containment test asks "does this token exist?" and
// the claim is about "does this token belong HERE" — and those are different
// questions. The mouth then answered with a conversation between Lincoln and
// Prince Andrew about a bug in react-dom, which is three sources welded
// together, and nothing flagged it.
//
// So a quoted claim is matched as a SPAN. If the material holds a nearly
// identical run of words differing in a token or two, that is not an absence
// and not a contradiction of dates — it is a MISQUOTATION, and the material
// can say what the right token was. That is strictly more informative than
// "absent": it hands back the truth, at an address, which is what the mouth
// needs and what the guard needs.
//
// SCOPE FOLLOWS THE CITATION. A question that names its source ("from
// pg2600.txt that: …") is checked against THAT source. Searching everything
// is how the Lincoln article got to answer for Tolstoy.
//
// PURE.
import { quotedSpan } from "./quoting.js";

const WORD_RE = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;
const fold = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const tokens = (t) => [...String(t ?? "").matchAll(WORD_RE)].map((m) => ({ raw: m[0], at: m.index, k: fold(m[0]) }));

/** How much of a quoted run must line up before a difference is a misquote rather than a different sentence. Declared. */
export const MATCH_FLOOR = 0.6;
/** A quotation shorter than this is too small to align safely. Declared. */
export const MIN_TOKENS = 5;

/** The source a question names, if it names one: "from pg2600.txt that:", "according to Luke.xml". */
export function citedSource(question) {
  const m = String(question ?? "").match(/\b(?:from|in|according to|per)\s+([\w.\-]+\.(?:txt|md|js|json|xml|html?|csv))/i);
  return m ? m[1] : null;
}

/**
 * findMisquote(quoted, passages, { cited }) →
 *   { misquoted, said, shouldBe, ref, start, end, matched } | null
 *
 * Aligns the quoted run against every passage by sliding a window of the same
 * length and counting tokens that agree in place. The best window above
 * MATCH_FLOOR is the passage being quoted; tokens that disagree there are the
 * misquotation, and the passage's own tokens are what they should have been.
 */
export function findMisquote(quoted, passages = [], { cited = null } = {}) {
  const q = tokens(quoted);
  if (q.length < MIN_TOKENS) return null;
  const pool = cited ? passages.filter((p) => String(p?.ref ?? p?.source ?? "").includes(cited)) : passages;
  const searched = pool.length ? pool : passages;
  let best = null;
  for (const p of searched) {
    const t = tokens(p?.text ?? "");
    if (t.length < q.length) continue;
    for (let i = 0; i + q.length <= t.length; i++) {
      let same = 0;
      const diffs = [];
      for (let j = 0; j < q.length; j++) {
        if (t[i + j].k === q[j].k) same += 1;
        else diffs.push({ said: q[j].raw, shouldBe: t[i + j].raw, at: t[i + j].at });
      }
      const score = same / q.length;
      if (!best || score > best.score) best = { score, diffs, p, from: t[i].at, to: t[i + q.length - 1].at + t[i + q.length - 1].raw.length };
    }
  }
  if (!best || best.score < MATCH_FLOOR) return null;
  if (!best.diffs.length) return { misquoted: false, matched: best.score, ref: best.p.ref ?? null, start: best.from, end: best.to };
  // Only differences that are real words, not punctuation drift or a plural.
  const real = best.diffs.filter((d) => d.said.length > 2 && d.shouldBe.length > 2 && fold(d.said) !== fold(d.shouldBe));
  if (!real.length) return { misquoted: false, matched: best.score, ref: best.p.ref ?? null, start: best.from, end: best.to };
  return {
    misquoted: true,
    matched: best.score,
    said: real.map((d) => d.said),
    shouldBe: real.map((d) => d.shouldBe),
    ref: best.p.ref ?? null,
    start: best.from,
    end: best.to,
    text: String(best.p.text ?? "").slice(best.from, best.to),
  };
}

/** What the sources actually say, positively — never the misquotation repeated back (P126's rule). */
export function misquoteFacts(found) {
  if (!found?.misquoted) return "";
  return `What that passage actually says${found.ref ? ` [${found.ref}, bytes ${found.start}–${found.end}]` : ""}: "${String(found.text).replace(/\s+/g, " ").trim()}"`;
}

/** The claim a question quotes, nesting handled — see quoting.js for why this is not a naive pair-off. */
export const claimQuoted = (question) => quotedSpan(question);

/** The tokens a draft must not assert, kept by the instrument rather than sent to the mouth. */
export const misquoteGuard = (found) => (found?.misquoted ? found.said.map((v) => ({ value: v, fold: fold(v) })) : []);
