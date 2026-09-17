// concede-prior.js — REC·Figure for the mechanical pass: a prior turn's
// close conceded when the CURRENT material contradicts it.
//
// THE LOOP, MADE REAL. The one-shot pass walks forward; the back-and-forth
// is that later turns re-run against the record, and when a later read
// contradicts an earlier established fact, the earlier close is CONCEDED —
// not silently corrected, not kept (REC re-zeros on evidence, grid.js
// concedeEvaluation's own shape: a later evaluate that disagrees with an
// earlier determined verdict concedes it first).
//
// THE RECONCILIATION (2026-09-16): this file no longer re-implements the
// paraphrase/ends seam. The CONTRADICTION VERDICT IS THE READER'S OWN: the
// relation reader (`hypergraph.js::read`) judges a claim `bound`,
// `contradicted`, or `unbound` against the material — and a prior fact
// conceded is exactly a claim the current material judges `contradicted`.
// The reader is the earned judge (P36: "EVA computes, REC concedes"); this
// file only needs to turn the reader's verdict into a concession, byte-
// addressed to the passage that did it.
//
// WHY THE SHADOW IS NOT THE DECIDER: YadaYadaYada's shadow chase
// (`run-dmca.js::paraphraseCandidatesFor`) equates a WRITE against the
// RECORD — the paraphrase direction ("is this grounded-by-meaning FOR
// whom"). This file is the REC direction (the record against new material),
// and the first reconciled cut leaned on the shadow's end-anchoring to find
// candidate sentences — measured WRONG: the shadow's `endsFor` picks the
// two rarest co-occurring words, so "french"/"niemen" anchored the wrong
// sentence ("Kutúzov with his army crossed…"), and act-extraction off a
// single sentence label read "with" as the act. The reader's own
// `contradicted` verdict needs none of that — it compares the fact's claim
// to the material's edges directly, which is exactly the question a
// concession is. The shadow stays the paraphrase door; this file does not
// ask it to judge contradictions it was never built to see.
//
// PURE. read/sameAct injected (the cast.js pattern). The fact's own claim
// is derived from its text (subject/act/object), read through the SAME
// injected reader so both sides of the verdict use one judge.

const norm = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
const ACT_WORDS = new Set(["are", "is", "was", "were", "has", "have", "had", "to", "in", "on", "at", "of", "from", "by", "with", "and", "the", "a", "an"]);

/** Derive the fact's own claim (end1/label/end2) from its close text. The
 *  close is "X —act→ Y" (the pass's own shape); the ends are the first and
 *  last content words, the act the middlemost. This is the FACT'S shape —
 *  used only to hand the reader a claim to judge, never to judge truth. */
const claimOf = (text) => {
  const words = (norm(text).match(/\p{L}{3,}/gu) ?? []).filter((w) => !ACT_WORDS.has(w));
  if (words.length < 3) return null;
  const mid = Math.floor(words.length / 2);
  const end1 = words.slice(0, mid).join(" ");
  const end2 = words.slice(mid + 1).join(" ");
  const label = words[mid];
  if (!end1 || !end2 || !label) return null;
  return { end1, label, end2 };
};

/**
 * concedePriorFacts({ facts, passages, read, sameAct }) → { conceded, checked }
 *
 * `facts` are prior turns' closes (the record: { text, refs }), `passages`
 * the CURRENT material. Each fact's own claim is derived and read through
 * the SAME injected reader that judged it originally; when the current
 * material returns `contradicted`, the fact is CONCEDED with the passage
 * that did it (byte-addressed). Agreement (`bound`) and silence (`unbound`,
 * `beyond-reach`) concede nothing — withhold, never convict.
 *
 * A concession credits the paraphrase archon (YadaYadaYada) as the seam's
 * owner: the record may not be re-zeroed without naming who owns the seam.
 */
export function concedePriorFacts({ facts = [], passages = [], read = null, sameAct = null } = {}) {
  const eq = sameAct ?? ((a, b) => norm(a) === norm(b));
  if (!passages.length || !facts.length) return { conceded: [], checked: facts.length };

  const conceded = [];
  const checked = [];
  for (const f of facts) {
    const text = String(f.text ?? "");
    // The close text may carry a count prefix ("N claim(s) the material
    // states about what was asked: X"); strip it to the actual claim.
    const claimText = (text.match(/: (.*)$/)?.[1] ?? text).trim();
    const claim = claimOf(claimText);
    if (!claim) continue;
    checked.push(f);
    // read the fact's own claim against the CURRENT material, the SAME judge
    // that established it originally
    let verdict = null;
    let contradictingPassage = null;
    let contradictingEdge = null;
    for (const p of passages) {
      let claims = [];
      try { claims = read(String(p?.text ?? ""))?.claims ?? []; } catch { claims = []; }
      const mine = claims.find((c) => {
        const e1 = norm(c.end1 ?? c.subject ?? "");
        const e2 = norm(c.end2 ?? c.object ?? "");
        const l = norm(c.label ?? c.verb ?? "");
        const ends = e1.includes(claim.end1) && e2.includes(claim.end2);
        const sameEndsFolded = eq(l, claim.label);
        return ends && !sameEndsFolded;
      });
      if (mine && mine.verdict === "contradicted") {
        verdict = "contradicted";
        contradictingPassage = p?.ref ?? null;
        contradictingEdge = [mine.end1 ?? mine.subject, mine.label ?? mine.verb, mine.end2 ?? mine.object].filter(Boolean).join(" ");
        break;
      }
    }
    if (verdict === "contradicted") {
      conceded.push({
        ...f,
        contradictedBy: { act: claim.label, passage: contradictingPassage, text: contradictingEdge ?? claimText.slice(0, 160), owner: "yadayadayada" },
      });
    }
  }
  return { conceded, checked };
}