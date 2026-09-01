// experiments/mechanical-prose-about.mjs — the missing piece named at the
// end of mechanical-prose-v3.mjs: a QUERY, not a seed. Given a subject name,
// return whichever of its grounded, POS-gated edges exist, preferring a
// real quoted source sentence (v3 — reads well, always grammatical) and
// falling back to a stitched sentence (v2 — reads unevenly, disclosed as
// such) only when no source sentence could be matched for that edge.
//
// REUSES: hypergraph.js::makeRelationReader, wordclass.js's real POSPrior@1
// gate, engine diaNorm/splitSentences — all identical to v2/v3. NEW: only
// the subject-match filter (aboutSubject) and the mode label on output.

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

const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
function stitch(e) {
  const object = e.object.replace(/[.,;]$/, "");
  const clause = e.polarity === "-" ? `never ${e.verb}` : e.verb;
  return `${capitalize(e.subject)} ${clause} ${object}.`;
}

function quoteFor(e, splitSentences, norm) {
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

/**
 * The query. Not a seed — a filter into material already read. Subject
 * match is diacritic-folded substring identity (the engine's own diaNorm),
 * not full referent resolution — report.edges (the reader's PUBLIC face)
 * doesn't carry the referent sets that judge()'s internal endpoint() does,
 * so "he"/pronoun coreference to a name is a disclosed miss here, not a
 * silent one. A name matches its longer form and vice versa ("Andrew"
 * matches "Prince Andrew"), which covers most of what a person actually
 * asks for.
 */
function about(subjectQuery, { edges, splitSentences, diaNorm }) {
  const q = diaNorm(subjectQuery).toLowerCase();
  const norm = (s) => diaNorm(s).toLowerCase().replace(/\s+/g, " ").replace(/[^\p{L}\p{N} ]/gu, "").trim();
  const matches = edges.filter((e) => {
    const subj = diaNorm(e.subject).toLowerCase();
    return subj.includes(q) || q.includes(subj);
  });
  const gated = matches.filter((e) => posGate(e.verb));
  const seen = new Set();
  const results = [];
  for (const e of gated) {
    const q2 = quoteFor(e, splitSentences, norm);
    if (q2) {
      if (seen.has(q2.sentence)) continue;
      seen.add(q2.sentence);
      results.push({ mode: "quoted", text: q2.sentence, ref: q2.ref, grounds: e });
    } else {
      const stitched = stitch(e);
      if (seen.has(stitched)) continue;
      seen.add(stitched);
      results.push({ mode: "stitched", text: stitched, ref: e.refs[0], grounds: e });
    }
  }
  return results;
}

const main = async () => {
  const eOrgans = await organs();
  const reader = makeRelationReader(eOrgans);
  const report = reader(passages);

  for (const name of ["Prince Andrew", "Anna Pavlovna", "Pierre"]) {
    console.log(`\n=== about("${name}") ===`);
    const results = about(name, { edges: report.edges, splitSentences: eOrgans.splitSentences, diaNorm: eOrgans.diaNorm });
    if (!results.length) {
      console.log("(nothing grounded and gated for this subject in this excerpt)");
      continue;
    }
    for (const r of results) {
      console.log(`[${r.mode}] ${r.text} [${r.ref}]`);
    }
  }
};

main();
