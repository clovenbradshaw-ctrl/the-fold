// experiments/mechanical-prose-v2.mjs — does the real, measured grammar
// (wordclass.js's POSPrior@1, a treebank prior, plus enough passages to
// activate the material's own function-word floor) fix what
// mechanical-prose.mjs found broken?
//
// Direct follow-up to mechanical-prose.mjs's own finding, and to the
// question asked in chat (2026-08-19): "load up all our priors, read them
// properly, and try to generate from it." Two real priors are loaded here,
// not simulated:
//   1. POSPrior@1 (eoreader6.1/scripts/corpus/pos-prior-eng.json) — every
//      English word form's attested part-of-speech tags, real counts, from
//      Universal Dependencies UD_English-EWT (CC BY-SA 4.0), read through
//      wordclass.js::classifyWord/dominantClass exactly as hyperlexicon.js
//      reads it (same declared minShare, 0.5 — reused, not reinvented).
//   2. cite.js::commonTerms, the-fold's own corpus-measured function-word
//      floor — already wired into hypergraph.js, but gated on
//      CORPUS_MINIMUM (10 chunks); mechanical-prose.mjs fed it only 4 and
//      the gate silently never ran. This script feeds it enough passages
//      to actually fire.
//
// THE GATE UNDER TEST: hypergraph.js's edges are anchored on
// discoverRelationVocab's "not a function word" test, which is necessary
// but not sufficient — a token can be excluded from the corpus's own
// common-word list and still not be a verb ("time", "Mortemart"). Filtering
// the resulting edges again by the TREEBANK'S measured class — keep an edge
// only when its verb's dominant Thrax class is "verb" (VERB or AUX,
// wordclass.js's own declared collapse) — is a second, independent
// measurement, not a stronger version of the first. wordclass.js's own
// header is explicit that this only fixes CLASS, never SLOT: a subject
// fragment like "time who" pairs a genuine pronoun (real PRON class) with
// a bad slot capture, and no CLASS filter can catch that — named here as a
// predicted, not discovered, limit, and reported honestly if it holds.
//
// REUSES, NOT REBUILDS: hypergraph.js::makeRelationReader (unchanged),
// wordclass.js::classifyWord/dominantClass (unchanged, the real treebank
// prior), the same engine organs mechanical-prose.mjs already loaded. NEW:
// only the gate itself (posGate) and the larger passage chunking.

import { readFileSync } from "node:fs";
import { makeRelationReader } from "../hypergraph.js";

const organs = async () => {
  const { splitSentences } = await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/spans.js");
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(
    "../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js"
  );
  const { discoverRelationVocab, extractRelations } = await import(
    "../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/relations.js"
  );
  const { tokenize } = await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/material.js");
  return {
    splitSentences,
    extractSurfaces,
    discoverReferents,
    namesCorefer,
    diaNorm,
    discoverRelationVocab,
    extractRelations,
    tokenize,
  };
};

const { classifyWord, dominantClass } = await import(
  "../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/wordclass.js"
);
const POS_PRIOR = JSON.parse(readFileSync(new URL("../../eoreader7/legacy-eoreader6.1/scripts/corpus/pos-prior-eng.json", import.meta.url), "utf8"));
const WORDCLASS_MIN_SHARE = 0.5; // hyperlexicon.js's own declared floor, reused verbatim — not a new number.

// ── material: same source, wider slice so the passage count clears
// cite.js's CORPUS_MINIMUM (10) and the-fold's own function-word floor
// actually fires (mechanical-prose.mjs's 4 passages never reached it). ──
const RAW = readFileSync(new URL("../../pg2600.txt", import.meta.url), "utf8");
const LINES = RAW.split("\n");
const CHUNK = 15;
const START = 1145;
const END = 1450;
const passages = [];
for (let i = START; i < END; i += CHUNK) {
  const end = Math.min(i + CHUNK, END);
  passages.push({ ref: `pg2600.txt#L${i + 1}-${end}`, text: LINES.slice(i, end).join("\n") });
}

// ── the gate: does the treebank consider this verb a verb? ──────────────
// Absence of evidence is not evidence of absence: a form the treebank
// never attested (common for names, and UD_English-EWT is a ~200k-token
// newswire/web corpus, not exhaustive) or one whose top tag doesn't clear
// the declared majority share stays UNDECIDED and is admitted rather than
// rejected — the same "disclosed abstention, never fabricate a verdict"
// posture as the rest of this ladder (hypergraph.js's own beyond-reach).
// Only a CONFIDENT non-verb reading is grounds to drop the edge.
function posGate(verb) {
  const classification = classifyWord(verb, { posPrior: POS_PRIOR });
  if (!classification.found) return { keep: true, why: "not attested in the treebank — undecided, admitted" };
  const top = dominantClass(classification, { minShare: WORDCLASS_MIN_SHARE });
  if (!top) return { keep: true, why: `ambiguous (no reading clears ${WORDCLASS_MIN_SHARE} share) — undecided, admitted` };
  if (top.thraxClass === "verb") return { keep: true, why: `${top.upos} ${(top.share * 100).toFixed(0)}%` };
  return { keep: false, why: `${top.upos} ${(top.share * 100).toFixed(0)}% → "${top.thraxClass}", not verb` };
}

// ── mechanical rendering, unchanged from mechanical-prose.mjs ───────────
const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
function edgeToSentence(e) {
  const subject = capitalize(e.subject);
  const object = e.object.replace(/[.,;]$/, "");
  const clause = e.polarity === "-" ? `never ${e.verb}` : e.verb;
  const cite = e.refs.length ? ` [${e.refs.join(", ")}]` : "";
  return `${subject} ${clause} ${object}.${cite}`;
}

const main = async () => {
  const reader = makeRelationReader(await organs());
  const report = reader(passages);

  const gated = report.edges.map((e) => ({ e, gate: posGate(e.verb) }));
  const kept = gated.filter((g) => g.gate.keep).map((g) => g.e);
  const dropped = gated.filter((g) => !g.gate.keep);

  console.log(`passages: ${passages.length}, vocabulary: ${report.vocabulary.verbs} verbs`);
  console.log(`edges before gate: ${report.edges.length}`);
  console.log(`edges after gate:  ${kept.length}  (${dropped.length} dropped)\n`);

  console.log("── dropped, with the treebank's own reason ─────────────────");
  for (const { e, gate } of dropped) console.log(`✗ [${e.subject} | ${e.verb} | ${e.object.slice(0, 30)}] — ${gate.why}`);

  console.log("\n── kept: mechanical sentences ──────────────────────────────");
  for (const e of kept) console.log(edgeToSentence(e));

  // Still-broken cases named up front rather than discovered by the reader:
  // subject fragments that survive because CLASS is not SLOT.
  const stillBadSubjects = kept.filter((e) => /^(where|as|of|but|know|say|ready|set|about|round|which|do|his|said|before|too|other|first|little|always|an|the|very|seen|served)\b/i.test(e.subject));
  console.log(`\n── subject-fragment noise the verb gate does NOT fix (predicted) ──`);
  console.log(`${stillBadSubjects.length} of ${kept.length} kept edges still have a fragment-shaped subject.`);
  for (const e of stillBadSubjects.slice(0, 8)) console.log(`  "${e.subject}" | ${e.verb} | ${e.object.slice(0, 40)}`);
};

main();
