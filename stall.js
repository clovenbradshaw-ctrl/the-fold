// stall.js — referent-keyed answer-vs-prior-answer comparator (M-03: termination)
//
// Sibling of dialogue.js's selfContradictions: that organ compares a claim against
// what the conversation bound earlier; this one detects REPETITION at the same
// grain. Referent-keyed, not string-keyed — the aperture.js measured lesson is that
// paraphrased repeats defeat naive string matching, so the comparator keys on
// (end1, label, end2) with a same-form (lemma) fold on the label.
//
// Pure. Organs injected (cast.js pattern):
//   claimsOf(text)  -> [ { end1, label, end2 } ]   (relations.read shape, neutral names)
//   sameForm(a, b)  -> bool                        (createLemmatizer's sameAct / morphology fold)
//   grainOf(c)      -> string                      (contextual granularity key, optional)

export function normalize(c) {
  return {
    end1: String(c?.end1 ?? c?.subject ?? "").toLowerCase().trim(),
    label: String(c?.label ?? c?.verb ?? "").toLowerCase().trim(),
    end2: String(c?.end2 ?? c?.object ?? "").toLowerCase().trim(),
  };
}

export function keyOf(c) {
  return `${normalize(c).end1} | ${normalize(c).label} | ${normalize(c).end2}`;
}

// Does `next` repeat any claim already in `prior` (same end1/label/end2, labels
// matched via sameForm)? Returns the repeating claims. Empty = no stall.
export function repeatedClaims(prior, next, organs = {}) {
  const { sameForm = (a, b) => a === b } = organs;
  const priorKeys = prior.map(normalize);
  const out = [];
  for (const c of next) {
    const n = normalize(c);
    if (!n.label || (!n.end1 && !n.end2)) continue; // framing, no substance
    const repeat = priorKeys.some((p) => {
      if (p.end1 !== n.end1 || p.end2 !== n.end2) return false;
      return sameForm(p.label, n.label);
    });
    if (repeat) out.push(c);
  }
  return out;
}

// Stall signal: any repeating claim in this turn against the accumulated prior.
export function isStalled(priorClaims, turnClaims, organs = {}) {
  const reps = repeatedClaims(priorClaims, turnClaims, organs);
  return reps.length > 0 ? { stalled: true, repeats: reps.length, claims: reps } : { stalled: false, repeats: 0, claims: [] };
}

// The honest withdrawal (SCOPE-01): this is a single-operator instrument — the
// operator IS the human. No fake handoff to a person who does not exist; instead,
// state the limit and hand control back to the operator explicitly. Fixed string, L5.
export const WITHDRAWAL =
  "I can't help with this — I've hit my limit. You're the operator: you can switch models, attach or change material, or type /help for the doors.";

// The operator is the person using this instrument; there is no second human to
// hand off to. This names the real exits instead of promising a handoff.
export const operatorPath = (who) =>
  `${who || "You"} are the operator — nothing is trapped. Stop, switch the model, or type /help to hand back the controls yourself.`;