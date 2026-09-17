// scene-select.js — THE MISSING ORGAN the falsification chase found: the
// pass composes every word-overlap bind ("0 withheld" on every scene), so
// composition never selects. A composer that never withholds is not
// composing, it is concatenating. This organ is the selection.
//
// WHAT IT DOES. Given a PROMPT (a scene beat) and the material's BOUND
// claims (end1 —label→ end2, each byte-addressed), it decides which claims
// BELONG to the story the prompt asks for. Selection is the inverse of the
// answer-shape test the falsification chase built: a claim belongs when its
// ends TOUCH the prompt's referents (referent-resolved, or a shared content
// word through the same fold), AND the claim is not a mere mention —
// the material's claim actually contributes an end the prompt is about.
//
// WHY REFERENTS, NOT WORDS (P11, P135): "Prince Andrew" and "Natasha" are
// candidates; whether they name anything, and what, is the referent index's
// to say. A claim whose ends resolve to the prompt's referents is in the
// story; one that merely shares the word "and" or "the" is not. This is the
// same discipline expectationFrom() uses for "what the material states
// about the asked-about" — selection for a story is that question, asked of
// the material instead of a question.
//
// THE WITHHOLD DISCIPLINE (compose.js's own law): a claim NOT selected is
// NAMED with the reason, never silently dropped. `withheld` is the organ's
// honest report of what the story does not need.
//
// PURE. referentIndex and sameAct injected (the cast.js pattern); fold is
// dialogue.js's own (never a second copy).

import { fold, referentsOf } from "./dialogue.js";

const contentWords = (t) => [...new Set(fold(t).split(/[^\p{L}\p{N}_]+/u))].filter((w) => w.length > 3);
const STOP = new Set(["the", "and", "that", "this", "with", "from", "they", "them", "their", "then", "was", "were", "had", "have", "has", "him", "his", "her", "for", "not", "but", "said", "says", "one", "into", "upon", "over", "down", "across", "about", "after", "before", "which", "when", "where", "what", "who", "whom", "there", "here", "again", "still"]);

/**
 * selectSceneClaims({ prompt, claims, referentIndex, sameAct }) →
 *   { selected, withheld, basis }
 *
 * `claims` is the material's bound claims: [{ end1, label, end2, refs,
 * offset }]. A claim is SELECTED iff at least one of its ends touches the
 * prompt — the end's referents resolve to the prompt's referents, or the
 * end shares a content word with the prompt (folded). A claim whose ends
 * share NO content word with the prompt is WITHHELD with the reason; a
 * claim whose ends touch only via a stopword is never selected.
 *
 * Returns the claims in their own byte order (offset ascending) — document
 * order IS the story's chronology; selection decides WHICH, never WHICH
 * ORDER (compose's own rule: order is declared, never guessed).
 */
export function selectSceneClaims({ prompt = "", claims = [], referentIndex = null, sameAct = null } = {}) {
  const pw = contentWords(prompt);
  const promptRefs = referentIndex ? referentsOf(prompt, referentIndex) : null;
  const pids = promptRefs?.ids ?? new Set();
  const eq = sameAct ?? ((a, b) => fold(a) === fold(b));

  const touches = (end) => {
    const e = String(end ?? "");
    if (!e) return false;
    const ew = contentWords(e).filter((w) => !STOP.has(w));
    if (!ew.length) return false;
    // referent-resolved: an end word resolves to a prompt referent
    if (pids.size && referentIndex) {
      for (const w of ew) {
        const r = referentIndex.resolve ? referentIndex.resolve(w) : null;
        if (r instanceof Set ? [...r].some((id) => pids.has(id)) : Array.isArray(r) ? r.some((id) => pids.has(id)) : false) return true;
      }
    }
    // word-touch through the same fold (inflectional paraphrase counts)
    return ew.some((w) => pw.some((p) => w === p || eq(w, p)));
  };

  const selected = [];
  const withheld = [];
  for (const c of claims ?? []) {
    const e1 = String(c.end1 ?? "").trim();
    const e2 = String(c.end2 ?? "").trim();
    const t1 = touches(e1);
    const t2 = touches(e2);
    if (t1 || t2) {
      selected.push(c);
    } else {
      withheld.push({ claim: [e1, c.label, e2].filter(Boolean).join(" "), reason: "no end touches the prompt's referents or words" });
    }
  }
  selected.sort((a, b) => (a.offset ?? 0) - (b.offset ?? 0));

  return {
    selected,
    withheld,
    basis: promptRefs?.ids?.size
      ? `selection by referent (${promptRefs.ids.size} prompt referent(s)) + word touch`
      : "selection by word touch (no referents resolved)",
  };
}