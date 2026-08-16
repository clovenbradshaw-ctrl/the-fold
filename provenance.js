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
// The tier above this — relation-level reading, the hypergraph: an edge
// like "Pierre married Dolokhov" whose every token is present but which the
// text never bound — is WIRED (hypergraph.js, on the engine's own organs;
// the P12 amendment says so). Its verdicts arrive here as `relationClaims`
// and ride each sentence as `edges`, read off the report exactly as
// `absent` is read off checkGrounding — classified, never re-measured.

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
/**
 * A model's brackets mean ONE thing in this app: `[name#start-end]`, a
 * citation. Anything else wrapped in brackets is not content the model was
 * ever authorized to produce that way — it is the model narrating its own
 * act of answering ("[Answering the prompt, I have searched the text and
 * have not found...]"), the same leak as a `<placeholder>` slot echoed back
 * (eo-holonic-plan.ts's containsPromptScaffold) or the reconcile-scaffold
 * echo caught there by KL divergence. This is the structural cousin: no
 * word list, no "don't narrate" instruction planted in the prompt (that is
 * the exact trap the model-is-the-mouth discipline exists to refuse) — a
 * STRUCTURAL tell instead. A stage direction quoted from real prose is a
 * short aside, a few words, never more than one sentence. Narration about
 * the act of answering is prose about prose: it has its own sentences.  A
 * bracketed span that is not a valid address AND itself contains more than
 * one sentence is therefore scaffold, not content, and is mechanically
 * removed before any check runs or anything renders — hidden, not merely
 * dimmed, because it was never an answer to begin with.
 */
const ADDRESS_ONLY_RE = /^\[[^\s\]]+#\d+-\d+\]$/;

/** Top-level [...] spans, walked by bracket depth — the same discipline
 * holon.js::extractArray uses for JSON arrays, applied here to prose. */
function bracketSpans(text) {
  const spans = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "[") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "]" && depth > 0) {
      depth--;
      if (depth === 0 && start !== -1) {
        spans.push({ start, end: i + 1, text: text.slice(start, i + 1) });
        start = -1;
      }
    }
  }
  return spans;
}

/**
 * Strip narration spans from `text`. Returns the cleaned text and the
 * removed spans, so a caller can disclose what was hidden without showing
 * it — the model's own act of narrating its process is itself a fact worth
 * a typed note, even though the narration's content is not.
 */
export function stripScaffoldNarration(text) {
  const raw = String(text ?? "");
  const narration = bracketSpans(raw).filter(
    (span) => !ADDRESS_ONLY_RE.test(span.text) && splitSentences(span.text.slice(1, -1)).length >= 2,
  );
  if (!narration.length) return { text: raw, removed: [] };
  let out = "";
  let last = 0;
  const removed = [];
  for (const span of narration) {
    out += raw.slice(last, span.start);
    removed.push(span.text);
    last = span.end;
  }
  out += raw.slice(last);
  // Collapse the gap the removal leaves rather than showing a blank stretch.
  return { text: out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim(), removed };
}

export function classifySentences(answer, attributions = [], findings = [], relationClaims = []) {
  const byText = new Map(attributions.map((a) => [a.text, a]));
  // A relation claim anchors to the sentence that carries its subject AND
  // its verb — the relation reader splits sentences with the engine's own
  // splitter, which need not agree with cite.js's, so the words are the
  // identity, never the split (the findSentence lesson, at claim scale).
  const norm = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, " ");
  const carries = (text, c) => {
    const t = norm(text);
    return t.includes(norm(c.subject)) && t.includes(norm(c.verb));
  };
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
      // The edge verdicts standing in this sentence (hypergraph.js) — read
      // off the relation report, measured nowhere here, same discipline as
      // every other field.
      edges: relationClaims.filter((c) => carries(text, c)),
    };
  });
}
