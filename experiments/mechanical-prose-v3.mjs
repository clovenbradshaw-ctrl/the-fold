// experiments/mechanical-prose-v3.mjs — v2 found that even a real,
// measured POS prior only cleans the STITCHED-sentence approach so far,
// because relations.js's connector-slot heuristic assumes the verb sits
// immediately after the subject surface (an adverb in between, "Pierre
// now committed...", loses the real verb entirely — no gate downstream
// can recover a candidate that was never extracted) and turning on the
// corpus function-word floor (needed for hypergraph.js's own vocabulary
// filter to activate) makes OBJECT_GROUP's boundary aggressive enough to
// truncate real objects mid-clause ("turned away from.").
//
// Both failures are specific to SYNTHESIZING a new sentence from three
// separately-captured spans. Neither failure touches the one thing this
// codebase already trusts absolutely: the MATERIAL'S OWN SENTENCES are
// grammatical, because they are real prose, unmodified. So this variant
// tests a different move — never stitch. Use the same grounded, POS-gated
// edge as a SELECTOR: which of the passage's own real sentences does this
// edge's subject+verb+object come from? Quote that sentence whole, cited.
// This is the same shape as every citation tier already in this repo
// (primary.js::snipClaim, priors.js): find-and-quote, never manufacture.
//
// REUSES: hypergraph.js::makeRelationReader, wordclass.js's real
// POSPrior@1 gate (identical to v2, same declared minShare), engine
// splitSentences. NEW: only the containment lookup at the bottom.

import { readFileSync } from "node:fs";
import { makeRelationReader } from "../hypergraph.js";

const organs = async () => {
  const { splitSentences } = await import("../../eoreader6.1/packages/engine/perceiver/text/spans.js");
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(
    "../../eoreader6.1/packages/engine/perceiver/text/surfaces.js"
  );
  const { discoverRelationVocab, extractRelations } = await import(
    "../../eoreader6.1/packages/engine/perceiver/text/relations.js"
  );
  const { tokenize } = await import("../../eoreader6.1/packages/engine/perceiver/text/material.js");
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
  "../../eoreader6.1/packages/engine/perceiver/text/wordclass.js"
);
const POS_PRIOR = JSON.parse(readFileSync(new URL("../../eoreader6.1/scripts/corpus/pos-prior-eng.json", import.meta.url), "utf8"));
const WORDCLASS_MIN_SHARE = 0.5;

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
const passageByRef = new Map(passages.map((p) => [p.ref, p]));

function posGate(verb) {
  const classification = classifyWord(verb, { posPrior: POS_PRIOR });
  if (!classification.found) return true;
  const top = dominantClass(classification, { minShare: WORDCLASS_MIN_SHARE });
  if (!top) return true;
  return top.thraxClass === "verb";
}

const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").replace(/[^\p{L}\p{N} ]/gu, "").trim();

// Which of this passage's own sentences contains this edge's verb AND at
// least one content word each from subject and object — a containment
// check, not a span-offset lookup (report.edges has no offsets to give),
// so this is approximate: the first sentence satisfying all three wins.
function quoteFor(e, splitSentences) {
  for (const ref of e.refs) {
    const passage = passageByRef.get(ref);
    if (!passage) continue;
    let sents = [];
    try {
      sents = splitSentences(passage.text).map((s) => (typeof s === "string" ? s : s?.text ?? ""));
    } catch {
      continue;
    }
    const subjWord = norm(e.subject).split(" ").pop();
    const objWord = norm(e.object).split(" ")[0];
    for (const s of sents) {
      const ns = norm(s);
      if (ns.includes(` ${e.verb} `) || ns.startsWith(`${e.verb} `)) {
        if ((!subjWord || ns.includes(subjWord)) && (!objWord || ns.includes(objWord))) {
          return { sentence: s.trim().replace(/\s+/g, " "), ref };
        }
      }
    }
  }
  return null;
}

const main = async () => {
  const eOrgans = await organs();
  const reader = makeRelationReader(eOrgans);
  const report = reader(passages);
  const kept = report.edges.filter((e) => posGate(e.verb));

  console.log(`edges after POS gate: ${kept.length}\n`);
  console.log("── selected (not stitched): the edge's own real source sentence ──\n");

  let found = 0;
  const seen = new Set();
  for (const e of kept) {
    const q = quoteFor(e, eOrgans.splitSentences);
    if (!q) continue;
    const key = q.sentence;
    if (seen.has(key)) continue; // several edges often resolve to the same sentence
    seen.add(key);
    found++;
    console.log(`"${q.sentence}" [${q.ref}] — grounds: ${e.subject} / ${e.verb} / ${e.object.slice(0, 30)}`);
  }
  console.log(`\n${found} distinct sentences recovered from ${kept.length} gated edges (${kept.length - found} matched a sentence already selected, or matched none).`);
};

main();
