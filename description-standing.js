// description-standing.js — a definite description ("the door", "the
// Count's room") is a REFERENT when the material treats it as one, and the
// material is what decides.
//
// WHY THIS EXISTS. `discoverReferents` admits NAMED individuals only —
// capitalized runs, L2's own discipline. That is correct for what it does
// and it leaves most of a book unindividuated: measured on Dracula, of
// 5,753 propositions whose first end resolved to no being, 98.8% had NO
// known being anywhere in their clause. "belief may stand forth as simple
// fact", "a horse could go", "the door had been shut" are real
// propositions with real subjects that the cast can never see. The face
// rate's ceiling is therefore not 100% but the share of propositions about
// NAMED characters — which is why anchor surgery could not move it and
// this can (anchor-refutation-finding.md carries both refutations).
//
// The seam this closes is one the cube predicted: HL already treats
// definite descriptions as presupposition-bearing at the JUDGMENT tier
// (`the r(s,o)` reads CONTESTED when a functional relation carries several
// bindings) while the INDIVIDUATION tier cannot produce one. Machinery at
// the top of the building, missing at the bottom.
//
// ── WHAT DECIDES, AND THE CONTROL IT SHIPS WITH ─────────────────────────
//
// The risk, stated before any code: "the door" in one room is not "the
// door" in another. A description earns referent standing only if the
// material uses it CONSISTENTLY — so the test is SELF-CONSISTENCY OF
// COMPANY across the material's own two halves (Firth again, and the same
// count-vector organ kind-standing.js already proved), placed against the
// POPULATION of descriptions as the null.
//
// That null is deliberately the one of three that survived at Station 6
// (kind-standing.js's own header carries the other two and why they died):
// nothing is redealt; the question "is THIS description more self-
// consistent than descriptions in general" is answered by measuring
// descriptions in general. Redealing would run backwards here for exactly
// the reason it ran backwards there.
//
// Measured on Dracula before this module existed, with named beings as the
// yardstick and cross-term similarity as the control built to fail:
//   named beings (yardstick)   median self-consistency 0.522
//   definite descriptions      median self-consistency 0.464
//   CONTROL, different terms   median cross-term       0.284
// Descriptions separate — about 78% as referent-like as named beings on
// the same instrument. The control is the HARD one (every term noun-headed
// and therefore mutually similar); against a mixed control it sits at
// 0.067, which would have flattered the result.
//
// PURE, ORGANS INJECTED (the cast.js pattern): determiners and the
// noun-head test arrive as arguments, so this module reads no engine and
// carries no word list. The head test is a RECEIVED treebank prior with a
// named giver — without it the harvest fills with "that he" (complementizer
// + pronoun) and "the same" (no nominal head at all), neither of which
// describes anything.

const HALF_MIN_MENTIONS = 4; // per half, so a "consistency" is measured twice from real evidence

/**
 * Every definite description the material actually repeats.
 * `isNounHead(word)` is the received POS gate; `minOccurrences` is declared
 * by the caller (P4 — never defaulted here).
 */
export function harvestDescriptions(sentences, { definiteDeterminers, isNounHead, minOccurrences, maxWords = 2 } = {}) {
  if (!definiteDeterminers || typeof isNounHead !== "function")
    throw new TypeError("harvestDescriptions: determiners and isNounHead are injected organs — required, never defaulted");
  if (!Number.isFinite(minOccurrences))
    throw new TypeError("harvestDescriptions: minOccurrences is declared by the caller (P4)");
  const counts = new Map();
  for (const sent of sentences) {
    const w = String(sent?.text ?? sent).split(/\s+/).map((t) => t.replace(/^[^\p{L}]+|[^\p{L}'’]+$/gu, ""));
    for (let i = 0; i < w.length - 1; i++) {
      if (!definiteDeterminers.has(w[i].toLowerCase())) continue;
      for (let len = 1; len <= maxWords; len++) {
        const parts = w.slice(i + 1, i + 1 + len);
        if (parts.length < len || parts.some((x) => !x || !/^[a-z][a-z'’-]*$/.test(x))) break;
        // The HEAD carries the nominal; a phrase whose head is not a noun
        // is not a description of anything.
        if (!isNounHead(parts[parts.length - 1].toLowerCase())) break;
        const key = `${w[i].toLowerCase()} ${parts.join(" ").toLowerCase()}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }
  return new Map([...counts].filter(([, n]) => n >= minOccurrences).sort((a, b) => b[1] - a[1]));
}

/** Company across the material's own two halves, as raw count vectors. */
export function halfVectors(sentences, term, { contextVectors }) {
  const mid = Math.floor(sentences.length / 2);
  const a = contextVectors(sentences.slice(0, mid), [term]).get(term);
  const b = contextVectors(sentences.slice(mid), [term]).get(term);
  if (!a || !b) return null;
  const total = (m) => [...m.values()].reduce((x, y) => x + y, 0);
  if (total(a) < HALF_MIN_MENTIONS || total(b) < HALF_MIN_MENTIONS) return null;
  return { a, b };
}

/**
 * Does the material use this description consistently enough to be treating
 * it as one thing? The null is the POPULATION of descriptions — nothing
 * redealt (kind-standing.js's own licensed pairing).
 *
 * Typed verdicts, never a bare boolean: `unknown` when the description has
 * too few mentions in either half to measure at all — a fact about the
 * reader, which a consumer must not read as "not a referent".
 */
export function descriptionStanding(term, sentences, population, { contextVectors, cosine, alpha }) {
  if (!Number.isFinite(alpha)) throw new TypeError("descriptionStanding: alpha must be declared");
  const halves = halfVectors(sentences, term, { contextVectors });
  if (!halves) return { verdict: "unknown", reason: "too_few_mentions", selfConsistency: null, p: null };
  const self = cosine(halves.a, halves.b);
  // The null: how alike are DIFFERENT descriptions, measured, not simulated.
  const others = population.filter((t) => t !== term);
  if (others.length < 2) return { verdict: "unknown", reason: "no_population", selfConsistency: self, p: null };
  const vecs = contextVectors(sentences, [term, ...others]);
  const mine = vecs.get(term);
  if (!mine) return { verdict: "unknown", reason: "no_profile", selfConsistency: self, p: null };
  const cross = others.map((t) => vecs.get(t)).filter(Boolean).map((v) => cosine(mine, v));
  if (cross.length < 2) return { verdict: "unknown", reason: "no_population", selfConsistency: self, p: null };
  const above = cross.filter((v) => v >= self).length;
  const p = above / cross.length;
  return { verdict: p < alpha ? "referent" : "not_referent", selfConsistency: self, p, populationSize: cross.length };
}
