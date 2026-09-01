// experiments/mechanical-prose.mjs — now that the material's own grammar
// (subject/verb/object/polarity edges, hypergraph.js) is measured and
// grounded with addresses, can that grammar drive the pen too, not just
// the check? Direct answer to the question asked in chat (2026-08-19).
//
// THE STANDING RULE THIS TESTS AGAINST ("the model is just the mouth" —
// never ask a model to mimic a property in language; compute it
// mechanically outside the model and feed back only the result): if the
// hypergraph's edges are real SVO triples with real addresses, a sentence
// built straight from one edge's own fields — no model call, no paraphrase
// — should already read as a legible, source-true claim. This script does
// not try to write GOOD prose; it tries to see whether a template over the
// edge's own bytes reads as prose AT ALL, and whether grouping edges by
// subject produces something a reader would call a paragraph rather than a
// list.
//
// REUSES, NOT REBUILDS: hypergraph.js::makeRelationReader is the real
// grounding-tier organ (unchanged, imported); the engine organs it needs
// (splitSentences, extractSurfaces, discoverReferents, namesCorefer,
// diaNorm, discoverRelationVocab, extractRelations, tokenize) are the
// SAME real ones hypergraph.test.mjs loads, from eoreader6.1 next door —
// no stand-ins, no hand-listed verbs. WHAT IS NEW HERE: only the render
// step at the bottom (edgeToSentence / renderProfile), which is the thing
// under test and does not exist anywhere else in the repo.
//
// Material: a real excerpt of pg2600.txt (War and Peace, already vendored
// at the repo root for the-fold's other experiments) — Anna Pávlovna's
// reception, chapters II-III — not a hand-built fixture, so the edges this
// finds are whatever the real engine actually measures from real prose.

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

// ── material: pg2600.txt lines 1146-1260, chunked into passages the way
// the fold's own retrieval hands passages to this reader (a ref per
// chunk, so every edge below carries a real address). ─────────────────
const RAW = readFileSync(new URL("../../pg2600.txt", import.meta.url), "utf8");
const LINES = RAW.split("\n");
const CHUNK = 30; // lines per passage — arbitrary chunking, same as retrieval would hand in
const START = 1145; // 0-indexed: line 1146
const END = 1260;
const passages = [];
for (let i = START; i < END; i += CHUNK) {
  const end = Math.min(i + CHUNK, END);
  passages.push({
    ref: `pg2600.txt#L${i + 1}-${end}`,
    text: LINES.slice(i, end).join("\n"),
  });
}

// ── mechanical rendering: nothing here reads the object's meaning, only
// its own text and the edge's own polarity/refs. ──────────────────────

const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// Extraction hands back the verb exactly as the source spelled it (already
// tense-inflected — "married", "spoke", "greeted"), so the mechanical
// sentence reuses that spelling verbatim rather than re-conjugating it.
// Negative polarity is disclosed with "never" rather than guessed aux/base
// forms ("did not marry") the edge does not carry — see relations.js's own
// note that polarity is read, never asserted; this keeps the same
// discipline on the output side: nothing added that the edge didn't state.
function edgeToSentence(e) {
  const subject = capitalize(e.subject);
  const object = e.object.replace(/[.,;]$/, "");
  const clause = e.polarity === "-" ? `never ${e.verb}` : e.verb;
  const cite = e.refs.length ? ` [${e.refs.join(", ")}]` : "";
  return `${subject} ${clause} ${object}.${cite}`;
}

// One paragraph per subject referent-surface: every edge sharing that exact
// subject string, in the order the material stated them. This is the
// harder test — a list of sentences reads as a list; the question is
// whether grouping by subject alone (no model asked to "connect" anything)
// starts to read as an account of one person rather than a triple dump.
function renderProfile(edges) {
  const bySubject = new Map();
  for (const e of edges) {
    const key = e.subject;
    if (!bySubject.has(key)) bySubject.set(key, []);
    bySubject.get(key).push(e);
  }
  const paragraphs = [];
  for (const [subject, subjEdges] of bySubject) {
    const sentences = subjEdges.map((e) => {
      const object = e.object.replace(/[.,;]$/, "");
      const clause = e.polarity === "-" ? `never ${e.verb}` : e.verb;
      return `${clause} ${object}`;
    });
    const cites = [...new Set(subjEdges.flatMap((e) => e.refs))];
    paragraphs.push(`${capitalize(subject)} ${sentences.join("; ")}. [${cites.join(", ")}]`);
  }
  return paragraphs;
}

const main = async () => {
  const reader = makeRelationReader(await organs());
  const report = reader(passages);

  console.log(`passages: ${passages.length}, vocabulary: ${report.vocabulary.verbs} verbs, edges: ${report.edges.length}\n`);

  console.log("── per-edge mechanical sentences ──────────────────────────");
  for (const e of report.edges) console.log(edgeToSentence(e));

  console.log("\n── per-subject mechanical paragraphs ──────────────────────");
  for (const p of renderProfile(report.edges)) console.log(p + "\n");
};

main();
