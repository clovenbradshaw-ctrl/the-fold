// node experiments/mechanical-first-hamlin-johnson.mjs
//
// CANDIDATE MECHANISM: "mechanical-first". Before any free-form model call,
// try to answer "who were Lincoln's vice presidents?" MECHANICALLY, using
// this repo's real relation-tier organs (hypergraph.js + the eoreader6.1
// engine's perceiver/text organs) — the SAME construction pattern
// hypergraph.test.mjs uses, no model call in this path at all. Only if that
// mechanical path yields nothing real do we fall back to ONE real gemma2:2b
// call over Ollama (localhost:11434) to phrase the specific finding.
//
// Real engine organs, real material, no fabrication: if the mechanical path
// fails, this script says so honestly rather than pretending it worked.

import { makeRelationReader, queryEdges, queryFillers } from "../hypergraph.js";

const organs = async () => {
  const { splitSentences } = await import("../../eoreader6.1/packages/engine/perceiver/text/spans.js");
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(
    "../../eoreader6.1/packages/engine/perceiver/text/surfaces.js"
  );
  const { discoverRelationVocab, extractRelations } = await import(
    "../../eoreader6.1/packages/engine/perceiver/text/relations.js"
  );
  const { tokenize, buildFrequencyTable, functionWordSet } = await import(
    "../../eoreader6.1/packages/engine/perceiver/text/material.js"
  );
  return {
    splitSentences,
    extractSurfaces,
    discoverReferents,
    namesCorefer,
    diaNorm,
    discoverRelationVocab,
    extractRelations,
    tokenize,
    buildFrequencyTable,
    functionWordSet,
  };
};

// ── the material, exactly as given, as ONE passage ──────────────────────
const MATERIAL_TEXT = `Johnson hoped that he would be a compromise candidate for the presidential nomination as the Democratic Party tore itself apart over the slavery question. Busy with the Homestead Bill during the 1860 Democratic National Convention in Charleston, South Carolina, he sent two of his sons and his chief political adviser to represent his interests in the backroom deal-making. The convention deadlocked, with no candidate able to gain the required two-thirds vote, but the sides were too far apart to consider Johnson as a compromise. The party split, with Northerners backing Illinois Senator Stephen Douglas while Southerners, including Johnson, supported Vice President Breckinridge for president. With former Tennessee senator John Bell running a fourth-party candidacy and further dividing the vote, the Republican Party elected its first president, former Illinois representative Abraham Lincoln. The election of Lincoln, known to be against the spread of slavery, was unacceptable to many in the South.

Hannibal Hamlin (August 27, 1809 - July 4, 1891) was an American politician and diplomat who was the 15th vice president of the United States, serving from 1861 to 1865, during President Abraham Lincoln's first term. He was the first Republican vice president.

15th Vice President of the United States
In office
March 4, 1861 - March 4, 1865
President Abraham Lincoln
Preceded by John C. Breckinridge
Succeeded by Andrew Johnson

17th President of the United States
In office
April 15, 1865 - March 4, 1869
Vice President Vacant
Preceded by Abraham Lincoln
Succeeded by Ulysses S. Grant
16th Vice President of the United States
In office
March 4, 1865 - April 15, 1865
President Abraham Lincoln
Preceded by Hannibal Hamlin
Succeeded by Schuyler Colfax`;

const PASSAGES = [{ ref: "material#0", text: MATERIAL_TEXT }];

// A pool >= CORPUS_MINIMUM (10) is needed for hypergraph.js's commonTerms
// function-word measure to actually run at corpus scale rather than
// degenerate on the excerpt (this file's own header comment says why, and
// hypergraph.test.mjs's own FILLER block is the reused pattern below).
const FILLER =
  "The house stood at the end of the road, and the road ran down to the river. " +
  "In the morning the light came over the water, and the birds rose from the reeds. " +
  "It was quiet in the garden, and the gate hung open on its hinge. " +
  "The old man walked to the market in the town, and the town was full of voices. " +
  "By the evening the lamps were lit in the windows, and the smoke stood over the roofs. " +
  "The children ran along the wall by the church, and the bell rang the hour. " +
  "A cart came up the road from the fields, and the horse was tired of the load. " +
  "The rain fell on the square for a day and a night, and the river rose under the bridge. " +
  "In the winter the snow lay on the hills, and the paths were lost until the thaw. " +
  "The letters were kept in a drawer of the desk, and the desk stood by the window.";

const POOL = [
  ...PASSAGES,
  ...FILLER.split(". ").map((s, i) => ({ ref: `filler.txt#${i * 100}-${i * 100 + 99}`, text: s + "." })),
];

function section(title) {
  console.log("\n" + "=".repeat(78));
  console.log(title);
  console.log("=".repeat(78));
}

async function callGemma(prompt) {
  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: "gemma2:2b", prompt, stream: false, options: { temperature: 0 } }),
  });
  if (!res.ok) throw new Error(`ollama http ${res.status}`);
  const json = await res.json();
  return json.response;
}

async function main() {
  const report = {
    mechanism: "mechanical-first-hypergraph",
    steps: [],
  };

  section("STEP 1 — build the relation reader over the real engine organs");
  const organBundle = await organs();
  const reader = makeRelationReader(organBundle)(PASSAGES, { pool: POOL });
  console.log("vocabulary:", JSON.stringify(reader.vocabulary, null, 2));
  console.log(`edges found: ${reader.edges.length}`);
  for (const e of reader.edges) {
    console.log(`  [${e.polarity === "+" ? "+" : e.polarity}] "${e.subject}" —${e.verb}→ "${e.object}"  refs=${JSON.stringify(e.refs)}`);
  }
  report.vocabulary = reader.vocabulary;
  report.edgeCount = reader.edges.length;
  report.edges = reader.edges.map((e) => ({ subject: e.subject, verb: e.verb, object: e.object, polarity: e.polarity }));

  section("STEP 2 — mechanical query: queryReferents for Lincoln's vice-president-related edges");
  // First, be honest about what verbs the vocabulary actually discovered —
  // "vice president" is infobox prose (Preceded by / Succeeded by), not
  // clean SVO ("X appointed Y"), so we check for real discovered verbs
  // rather than assuming one exists.
  console.log("discovered verbs:", [...(reader.edges.length ? new Set(reader.edges.map((e) => e.verb)) : [])]);

  // Try the reader's own referent-aware query with the actual subject
  // surface as it appears in the material, on every discovered verb, to see
  // if ANY of them mechanically connects "Lincoln" to "Hamlin" or "Johnson".
  const discoveredVerbs = [...new Set(reader.edges.map((e) => e.verb))];
  const lincolnQueries = [];
  for (const verb of discoveredVerbs) {
    const forward = reader.queryReferents({ subject: "Abraham Lincoln", verb });
    const backward = reader.queryReferents({ object: "Abraham Lincoln", verb });
    if (forward?.length) lincolnQueries.push({ verb, direction: "Lincoln -> ?", result: forward });
    if (backward?.length) lincolnQueries.push({ verb, direction: "? -> Lincoln", result: backward });
  }
  console.log(`queries with a real Lincoln-linked result on a discovered verb: ${lincolnQueries.length}`);
  for (const q of lincolnQueries) {
    console.log(`  verb="${q.verb}" ${q.direction}:`, JSON.stringify(q.result));
  }
  report.lincolnQueries = lincolnQueries;

  section("STEP 3 — does read() bind a hand-asked claim ('Lincoln appointed/had Hamlin as VP')?");
  // Try feeding candidate claim sentences through read() to see whether the
  // reader's own claim judge finds anything bound, for a few natural
  // phrasings a caller might actually try.
  const candidateSentences = [
    "Lincoln's vice president was Hannibal Hamlin.",
    "Hannibal Hamlin was Lincoln's vice president.",
    "Andrew Johnson was Lincoln's vice president.",
    "Hannibal Hamlin succeeded John C. Breckinridge.",
    "Andrew Johnson succeeded Hannibal Hamlin.",
  ];
  const claimResults = [];
  for (const s of candidateSentences) {
    const rep = reader.read(s);
    claimResults.push({ sentence: s, claims: rep.claims });
    console.log(`\n  "${s}"`);
    if (!rep.claims.length) {
      console.log("    -> no claim extracted at all (extractRelations found no SVO triple in this sentence)");
    }
    for (const c of rep.claims) {
      console.log(`    -> verdict=${c.verdict} verb="${c.verb}" subj="${c.subject}" obj="${c.object}" reason=${c.reason ?? ""}`);
    }
  }
  report.claimResults = claimResults;

  section("STEP 4 — standalone queryEdges/queryFillers over reader.edges (post-hoc, plain strings)");
  const edgesFlat = reader.edges;
  const anyLincolnEdge = queryEdges(edgesFlat, { subject: "Abraham Lincoln" });
  console.log(`queryEdges({subject:"Abraham Lincoln"}) -> ${anyLincolnEdge.length} edges`);
  console.log(JSON.stringify(anyLincolnEdge, null, 2));
  report.anyLincolnEdge = anyLincolnEdge;

  const mechanicalSucceeded =
    lincolnQueries.length > 0 ||
    claimResults.some((r) => r.claims.some((c) => c.verdict === "bound")) ||
    anyLincolnEdge.length > 0;

  report.mechanicalSucceeded = mechanicalSucceeded;

  section(`STEP 5 — verdict: mechanical path ${mechanicalSucceeded ? "SUCCEEDED" : "FAILED"}`);

  let finalAnswer;
  let modelCallMade = false;

  if (mechanicalSucceeded) {
    // Render a plain templated sentence from the real mechanical result —
    // "computed, not generated", no model call.
    const names = new Set();
    for (const q of lincolnQueries) for (const r of q.result) names.add(r.subject ?? r.object);
    finalAnswer = names.size
      ? `Abraham Lincoln's vice presidents, per the material: ${[...names].join(", ")}.`
      : "(mechanical path produced a match but no clean filler names to template — see raw results above)";
    console.log(finalAnswer);
  } else {
    console.log(
      "The mechanical relation tier found NO edge connecting Lincoln to Hamlin or Johnson as vice " +
        "president. This is honest and explainable: the source material states the VP relationship as " +
        "infobox-style fields (\"15th Vice President of the United States\", \"Preceded by\", \"Succeeded " +
        "by\") and title-position headers, not as a subject-verb-object sentence like \"Lincoln appointed " +
        "Hamlin\" or \"Hamlin served as Lincoln's vice president.\" extractRelations() works off a discovered " +
        "verb vocabulary built from words that FOLLOW an established surface; the infobox lines have no verb " +
        "there at all (\"Hannibal Hamlin — was — the 15th vice president\" is the one sentence that DOES have " +
        "SVO shape, but its object is a title, not a subject-Lincoln edge). Falling back to ONE real gemma2:2b " +
        "call, asked to phrase only this specific finding from the material's own bytes.",
    );

    const prompt =
      "Read ONLY the material below. Answer this exact question in one sentence, using only names that literally appear in the material: Who were Abraham Lincoln's vice presidents?\n\n" +
      "MATERIAL:\n" +
      MATERIAL_TEXT +
      "\n\nANSWER (one sentence, name(s) only, no extra commentary):";

    console.log("\n--- calling gemma2:2b (localhost:11434) ---");
    const t0 = Date.now();
    finalAnswer = (await callGemma(prompt)).trim();
    const ms = Date.now() - t0;
    modelCallMade = true;
    console.log(`(gemma2:2b responded in ${ms}ms)`);
    console.log(finalAnswer);
    report.modelLatencyMs = ms;
  }

  report.modelCallMade = modelCallMade;
  report.finalAnswer = finalAnswer;

  section("SUMMARY");
  console.log(JSON.stringify(report, null, 2));

  return report;
}

main().then((r) => {
  process.exit(0);
}).catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
