// provenance.js — every sentence stands on a named ground. Pure.
//
// There is no "ungrounded content" in a rendered answer — that framing was
// the mistake. There are two grounds: THE MATERIAL (the sentence carries or
// earned an address into the bytes) and THE MODEL (the sentence stands on
// what the model is, said in its own voice). Both are legitimate; what is
// not legitimate is their rendering alike (FOLD-CONSTITUTION IV.4: measured
// and shown never render alike). And orthogonal to the ground is the
// stripe: a sentence — on either ground — that commits to FIGURES or NAMES
// the material does not contain is carrying claims of fact on the model's
// authority, and those claims are drawn as what they are.
//
// Nothing here is measured fresh: every field is read off work the turn
// already did — attribute()'s per-sentence verdicts and checkGrounding's
// atom findings — so this classification cannot disagree with the record
// built from the same checks. It is the same evidence at sentence
// resolution, for drawing on the prose itself.
//
// The tier above this is relation-level reading — the hypergraph: an edge
// like "Pierre married Dolokhov" whose every token is present but which the
// text never bound. The engine owns those organs (extractRelations, the
// binding nulls); wiring them here is named future work in POLICIES.md,
// not quietly implied by the word "grounded".

import { splitSentences } from "./cite.js";

/**
 * Classify every sentence of an answer onto its ground.
 *
 * Returns one entry per sentence:
 *   { text, ground: "material" | "model", ref, absent: [...] }
 *
 * ground "material" — the sentence cited an offered address, or attribution
 *   attached one it earned against the null. `ref` carries the address when
 *   attribution attached it (a model-cited sentence keeps its inline ref).
 * ground "model"    — no address; the sentence stands on the model's own
 *   voice, typed as such. A summary, a hedge, connective tissue — or a
 *   claim, which is what `absent` distinguishes.
 * absent            — figures/names in this sentence that checkGrounding
 *   found nowhere in the material: claims of fact on model authority,
 *   whatever the sentence's ground.
 */
export function classifySentences(answer, attributions = [], findings = []) {
  const byText = new Map(attributions.map((a) => [a.text, a]));
  return splitSentences(answer).map((text) => {
    const a = byText.get(text);
    const absent = findings
      .filter((f) => f.text && text.includes(f.text))
      .map((f) => f.text);
    return {
      text,
      ground: a && (a.cited || a.ref) ? "material" : "model",
      ref: a?.ref ?? null,
      absent: [...new Set(absent)],
    };
  });
}
