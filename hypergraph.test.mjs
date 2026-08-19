// node --test hypergraph.test.mjs
//
// Conformance for the relation tier, against the ENGINE'S REAL ORGANS —
// what counts as a surface, a referent, a verb, a triple must be the
// engine's own answer, or the material's graph and the answer's reading
// drift apart and every verdict is a comparison of two different readings.

import { test } from "node:test";
import assert from "node:assert/strict";

import { makeRelationReader, relationFindings, relationsClean, MIN_SURFACES_PER_VERB, queryEdges, queryFillers } from "./hypergraph.js";
import { corroborateAtoms } from "./grounding.js";

const organs = async () => {
  const { splitSentences } = await import("../eoreader6.1/packages/engine/perceiver/text/spans.js");
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(
    "../eoreader6.1/packages/engine/perceiver/text/surfaces.js"
  );
  const { discoverRelationVocab, extractRelations } = await import(
    "../eoreader6.1/packages/engine/perceiver/text/relations.js"
  );
  const { tokenize, buildFrequencyTable, functionWordSet } = await import(
    "../eoreader6.1/packages/engine/perceiver/text/material.js"
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

// The material used throughout: three passages from two sources, with
// enough recurrence for the engine's own gates to establish the cast, a
// stated edge, a negated edge, and a second passage restating the first
// edge so corroboration has something to count.
const PASSAGES = [
  {
    ref: "wp.txt#0-400",
    text:
      "Pierre Bezukhov married Helene that winter in Petersburg. " +
      "Pierre Bezukhov trusted Dolokhov entirely, and Dolokhov repaid nothing. " +
      "Later Pierre Bezukhov spoke of the wedding to anyone who listened.",
  },
  {
    ref: "wp.txt#400-800",
    text:
      "Pierre Bezukhov married Helene before the spring, people said again. " +
      "Dolokhov mocked Pierre Bezukhov at cards, and Helene watched in silence.",
  },
  {
    ref: "letters.txt#0-300",
    text:
      "Pierre Bezukhov never loved Helene, Marya wrote plainly in her letter. " +
      // "loved" must be MEASURABLE as a verb for the negated edge to be
      // readable at all: the vocabulary candidate slot after "Pierre
      // Bezukhov" holds "never", so the verb enters the vocabulary only
      // through an affirmative use elsewhere — exactly how a real corpus
      // supplies it.
      "Old Marya loved the garden at the estate. " +
      "Marya admired Pierre Bezukhov all the same, and Helene knew it.",
  },
];

// The pool stands in for the live corpus the passages were retrieved from:
// the closed class is measured HERE, not from the turn's few passages —
// material.js's threshold is a share of all tokens, and on an excerpt the
// measure degenerates (every word crosses it). Ordinary prose, long enough
// that the genuinely closed words recur and the content words stay rare.
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

// ── cardinality: the mirror of P27's slot competition (added 2026-08-19,
// user direction after a live conversation) ─────────────────────────────
// P27 counts distinct SUBJECTS filling one verb+object slot; this counts
// distinct OBJECTS one subject+verb binds — the Russellian uniqueness
// clause: "the F is G" presupposes not just that an F exists (Strawson's
// clause, the presupposition-failure gate already covers) but that there
// is EXACTLY ONE F. "Who was HIS vice president?" presupposes a single
// filler; Lincoln had two. The answer isn't wrong — the question's own
// presupposition was never checked.

const LINCOLN_PASSAGES = [
  {
    ref: "lincoln.txt#0-200",
    text: "Lincoln appointed Hamlin. Lincoln appointed Johnson. Lincoln nominated Seward. Hamlin visited Lincoln often. Johnson visited Lincoln rarely.",
  },
];
const LINCOLN_POOL = [
  ...LINCOLN_PASSAGES,
  ...FILLER.split(". ").map((s, i) => ({ ref: `filler4.txt#${i * 100}-${i * 100 + 99}`, text: s + "." })),
];

test("a subject+verb binding two distinct objects surfaces both as `fillers` on a bound claim", async () => {
  const reader = makeRelationReader(await organs())(LINCOLN_PASSAGES, { pool: LINCOLN_POOL });
  // The claim matches ONE of the two real fillers exactly — bound, but the
  // material shows a second, equally real filler this question's own
  // singular phrasing never asked about.
  const report = reader.read("Lincoln appointed Hamlin.");
  const claim = report.claims.find((c) => c.verb === "appointed" && /Hamlin/i.test(c.object));
  assert.ok(claim, JSON.stringify(report.claims, null, 2));
  assert.equal(claim.verdict, "bound");
  assert.ok(claim.fillers, "two distinct objects must surface as fillers");
  assert.equal(claim.fillers.length, 2);
  assert.ok(claim.fillers.some((f) => /Hamlin/i.test(f.object)));
  assert.ok(claim.fillers.some((f) => /Johnson/i.test(f.object)));

  // A DIFFERENT subject+verb with only one real filler (Lincoln nominated
  // Seward — a distinct verb, so it never clusters with the appointed
  // group) carries no fillers annotation at all — singular is the
  // ordinary, unremarked case.
  const seward = reader.read("Lincoln nominated Seward.");
  const single = seward.claims.find((c) => c.verb === "nominated");
  assert.ok(single, JSON.stringify(seward.claims, null, 2));
  assert.equal(single.fillers, undefined);
});

test("fillers surfaces even on an UNBOUND claim — a wrong answer to a multi-filler question shows what the real answers actually are", async () => {
  const reader = makeRelationReader(await organs())(LINCOLN_PASSAGES, { pool: LINCOLN_POOL });
  const report = reader.read("Lincoln appointed Breckinridge.");
  const claim = report.claims.find((c) => c.verb === "appointed" && /Breckinridge/i.test(c.object));
  assert.ok(claim, JSON.stringify(report.claims, null, 2));
  assert.equal(claim.verdict, "unbound");
  assert.ok(claim.fillers, "the real fillers must surface even though THIS claim doesn't match either");
  assert.equal(claim.fillers.length, 2);
  const names = claim.fillers.map((f) => f.object).join(" ");
  assert.match(names, /Hamlin/i);
  assert.match(names, /Johnson/i);
});

// ── SLOT is not CLASS: posPriorFor's grammar cross-check (2026-08-19, user
// direction: "we now have an infinitely richer hypergraph with parts of
// speech") — the exact live specimen this closes: "the Democratic —party→
// ultimately contributed…" was admitted as a verb candidate on slot
// position alone; the real UD_English-EWT treebank counts below (copied
// verbatim, wordclass.test.mjs's own discipline) say that form is 68.75%
// noun, 3% verb. "visited" is the genuine-verb control, same fixture shape
// LINCOLN_PASSAGES already establishes Lincoln/Hamlin/Johnson through.
const GRAMMAR_PRIOR = {
  schema: "POSPrior@1",
  forms: {
    party: { PROPN: 9, NOUN: 22, VERB: 1 },
    visited: { VERB: 17 },
  },
};
const GRAMMAR_PASSAGES = [
  {
    ref: "grammar.txt#0-200",
    text: "Lincoln party favored union. Johnson party opposed union. Hamlin visited Lincoln often. Johnson visited Lincoln rarely.",
  },
];
const GRAMMAR_POOL = [
  ...GRAMMAR_PASSAGES,
  ...FILLER.split(". ").map((s, i) => ({ ref: `filler5.txt#${i * 100}-${i * 100 + 99}`, text: s + "." })),
];

test("posPriorFor omitted: edges and claims carry grammar: null — byte-identical to before this existed", async () => {
  const reader = makeRelationReader(await organs())(GRAMMAR_PASSAGES, { pool: GRAMMAR_POOL });
  assert.equal(reader.vocabulary.grammarPrior, false);
  const partyEdge = reader.edges.find((e) => e.verb === "party");
  assert.ok(partyEdge, JSON.stringify(reader.edges, null, 2));
  assert.equal(partyEdge.grammar, null);
});

test("a connector the treebank says is overwhelmingly a noun is disclosed on the material's own edges — without being dropped", async () => {
  const withGrammar = { ...(await organs()), posPriorFor: () => GRAMMAR_PRIOR };
  const reader = makeRelationReader(withGrammar)(GRAMMAR_PASSAGES, { pool: GRAMMAR_POOL });
  assert.equal(reader.vocabulary.grammarPrior, true);

  // The material's own belief graph is never filtered by grammar — a wider
  // vocabulary can only widen what extractRelations hears (this file's own
  // standing rule), and that holds regardless of whether a candidate reads
  // as grammatically plausible. The edge stays, disclosed.
  const partyEdge = reader.edges.find((e) => e.verb === "party");
  assert.ok(partyEdge, "the edge still exists — disclosure never filters");
  assert.equal(partyEdge.grammar.dominant.thraxClass, "noun");
  assert.equal(partyEdge.grammar.plausibleAsVerb, false);

  // The genuine verb, same reader, same material: confirmed, not merely
  // admitted on slot position.
  const visitedEdge = reader.edges.find((e) => e.verb === "visited");
  assert.equal(visitedEdge.grammar.dominant.thraxClass, "verb");
  assert.equal(visitedEdge.grammar.plausibleAsVerb, true);
});

test("a claim read from an ANSWER whose connector is not grammatically a verb is beyond-reach, not a false 'unbound' — the live badge bug this closes", async () => {
  // Measured live 2026-08-19: "Abraham Lincoln's vice president was
  // Hannibal Hamlin" put "vice" in the verb slot (the token right after
  // the possessive-marked surface "Lincoln's"), and the resulting claim —
  // "vice president was Hannibal Hamlin" — correctly found no matching
  // edge and shipped a confident "∅ not in the material" badge on an
  // answer that was, in fact, fully grounded. This fixture reproduces the
  // same SHAPE with "party": a claim built on a word the treebank says is
  // 68.75% noun must never be judged bound/unbound/contradicted at all.
  const withGrammar = { ...(await organs()), posPriorFor: () => GRAMMAR_PRIOR };
  const reader = makeRelationReader(withGrammar)(GRAMMAR_PASSAGES, { pool: GRAMMAR_POOL });
  const report = reader.read("Lincoln party favored union.");
  const claim = report.claims.find((c) => c.verb === "party");
  assert.ok(claim, JSON.stringify(report.claims, null, 2));
  assert.equal(claim.grammar.plausibleAsVerb, false);
  assert.equal(claim.verdict, "beyond-reach", "a claim on a non-verb connector is a limit of the check, never a mark against the answer");
  assert.match(claim.reason, /not grammatically a verb/);
  // app.js only ever badges contradicted/unbound (renderAnswer's own
  // filter) — beyond-reach is exactly how this stops rendering as a false
  // red flag, with no change needed on the app.js side.
  assert.notEqual(claim.verdict, "unbound");
  assert.notEqual(claim.verdict, "contradicted");

  // The genuine verb, same reader, same sentence shape: judged normally,
  // grammar never gates a claim it has no objection to.
  const visitedReport = reader.read("Hamlin visited Lincoln.");
  const visitedClaim = visitedReport.claims.find((c) => c.verb === "visited");
  assert.equal(visitedClaim.grammar.plausibleAsVerb, true);
  assert.notEqual(visitedClaim.verdict, "beyond-reach");
});

// ── querying the whole graph directly (added 2026-08-19, user direction:
// "can we now mechanically query the entire hypergraph") — pure, offline,
// no engine organs: report.edges is already plain data by the time it
// leaves read(), so these run on a fixture edge list with no live model.

const LINCOLN_EDGES = [
  { subject: "Lincoln", verb: "appointed", object: "Hamlin", polarity: "+", refs: ["a.txt#0-10"] },
  { subject: "Lincoln", verb: "appointed", object: "Johnson", polarity: "+", refs: ["a.txt#10-20"] },
  { subject: "Lincoln", verb: "nominated", object: "Seward", polarity: "+", refs: ["a.txt#20-30"] },
  { subject: "Hamlin", verb: "visited", object: "Lincoln", polarity: "+", refs: ["a.txt#30-40"] },
  { subject: "Booth", verb: "shot", object: "Lincoln", polarity: "+", refs: ["a.txt#40-50"] },
];

test("queryEdges: a fully-pinned query returns exactly the matching edges, folded and substring-tolerant", () => {
  const appointed = queryEdges(LINCOLN_EDGES, { subject: "Lincoln", verb: "appointed" });
  assert.equal(appointed.length, 2);
  assert.deepEqual(appointed.map((e) => e.object).sort(), ["Hamlin", "Johnson"]);

  // Substring/diacritic-folded matching on subject and object — never on verb,
  // since the material's own measured vocabulary is already a closed set.
  const byPartialName = queryEdges(LINCOLN_EDGES, { object: "Hamlin" });
  assert.equal(byPartialName.length, 1);
  assert.equal(byPartialName[0].subject, "Lincoln");

  // verb is exact (fold-cased), never a substring — "appoint" must not match "appointed".
  assert.equal(queryEdges(LINCOLN_EDGES, { verb: "appoint" }).length, 0);
  assert.equal(queryEdges(LINCOLN_EDGES, { verb: "Appointed" }).length, 2);

  // No filters at all returns everything — a wildcard query, not an error.
  assert.equal(queryEdges(LINCOLN_EDGES, {}).length, LINCOLN_EDGES.length);
  assert.equal(queryEdges(LINCOLN_EDGES).length, LINCOLN_EDGES.length);
});

test("queryFillers: one open field returns every distinct value the graph binds there, each with its own refs", () => {
  // Object open: "who did Lincoln appoint" — the exact fillers/cardinality
  // question, asked directly of the graph instead of round-tripped through
  // a judged claim.
  const whoAppointed = queryFillers(LINCOLN_EDGES, { subject: "Lincoln", verb: "appointed" });
  assert.equal(whoAppointed.length, 2);
  assert.deepEqual(whoAppointed.map((f) => f.object).sort(), ["Hamlin", "Johnson"]);
  assert.deepEqual(whoAppointed.find((f) => f.object === "Hamlin").refs, ["a.txt#0-10"]);

  // Subject open: "who visited Lincoln" — the mirror direction.
  const whoVisited = queryFillers(LINCOLN_EDGES, { verb: "visited", object: "Lincoln" });
  assert.equal(whoVisited.length, 1);
  assert.equal(whoVisited[0].subject, "Hamlin");

  // Both open, or neither open, is a typed refusal — not a guess about
  // which side the caller meant.
  assert.equal(queryFillers(LINCOLN_EDGES, { verb: "appointed" }), null);
  assert.equal(queryFillers(LINCOLN_EDGES, { subject: "Lincoln", verb: "appointed", object: "Hamlin" }), null);
});

test("queryReferents: the reader's own referent-aware query agrees with judge()'s fillers, and is not fooled by an unestablished lookalike", async () => {
  const reader = makeRelationReader(await organs())(LINCOLN_PASSAGES, { pool: LINCOLN_POOL });
  const whoAppointed = reader.queryReferents({ subject: "Lincoln", verb: "appointed" });
  assert.ok(whoAppointed, JSON.stringify(whoAppointed));
  assert.equal(whoAppointed.length, 2);
  assert.deepEqual(whoAppointed.map((f) => f.object).sort(), ["Hamlin", "Johnson"]);

  // The mirror direction: who visited Lincoln.
  const whoVisited = reader.queryReferents({ verb: "visited", object: "Lincoln" });
  assert.ok(whoVisited);
  assert.deepEqual(whoVisited.map((f) => f.subject).sort(), ["Hamlin", "Johnson"]);

  // Same refusal contract as the standalone queryFillers: both open or
  // neither open is not a well-formed question.
  assert.equal(reader.queryReferents({ verb: "appointed" }), null);
  assert.equal(reader.queryReferents({ subject: "Lincoln", verb: "appointed", object: "Hamlin" }), null);

  // A name this material never establishes resolves to nothing — the
  // referent gate refuses rather than falling back to a string match.
  const nobody = reader.queryReferents({ subject: "Nobody At All", verb: "appointed" });
  assert.deepEqual(nobody, []);
});

test("a stated edge is bound, with its addresses and its corroboration counted across sources", async () => {
  const reader = makeRelationReader(await organs())(PASSAGES, { pool: POOL });
  assert.equal(reader.examined, true);
  assert.ok(reader.vocabulary.verbs > 0, "the material's own vocabulary must be measurable");
  const report = reader.read("Pierre Bezukhov married Helene.");
  const bound = report.claims.find((c) => c.verb === "married" && c.verdict === "bound");
  assert.ok(bound, JSON.stringify(report.claims, null, 2));
  // Both passages that state the marriage carry it, and both are addresses.
  assert.ok(bound.refs.includes("wp.txt#0-400"));
  assert.ok(bound.refs.includes("wp.txt#400-800"));
  assert.equal(bound.corroboration.passages, 2);
  // Distinct sources are the independence test: two chunks of one file are
  // one perspective, not two.
  assert.equal(bound.corroboration.sources, 1);
});

test("the flagship case: every token present, edge never bound", async () => {
  const reader = makeRelationReader(await organs())(PASSAGES, { pool: POOL });
  // "Pierre married Dolokhov" — Pierre is established, "married" is in the
  // measured vocabulary, Dolokhov is established. The byte tier passes it
  // whole. The relation tier refuses it, and shows what the text binds.
  const report = reader.read("Pierre Bezukhov married Dolokhov.");
  const claim = report.claims.find((c) => c.verb === "married");
  assert.ok(claim, JSON.stringify(report.claims));
  assert.equal(claim.verdict, "unbound");
  assert.ok(claim.nearest.length > 0, "the nearest-edge disclosure is the affordance");
  assert.ok(
    claim.nearest.some((e) => /Helene/i.test(e.object)),
    `nearest should show the marriage the text does bind: ${JSON.stringify(claim.nearest)}`,
  );
  // And it lands on the record's unsupported list, with the explanation.
  const lines = relationFindings(report);
  assert.ok(lines.some((l) => /never says/.test(l) && /married/.test(l)));
  assert.equal(relationsClean(report), false);
});

test("polarity is read, and a contradiction is its own verdict", async () => {
  const reader = makeRelationReader(await organs())(PASSAGES, { pool: POOL });
  // The material states "Pierre Bezukhov never loved Helene". The answer
  // asserts the affirmative. Every token is present; the polarity is not.
  const report = reader.read("Pierre Bezukhov loved Helene.");
  const claim = report.claims.find((c) => c.verb === "loved");
  assert.ok(claim, JSON.stringify(report.claims));
  assert.equal(claim.verdict, "contradicted");
  assert.ok(claim.refs.includes("letters.txt#0-300"));
  assert.ok(relationFindings(report).some((l) => /says otherwise/.test(l)));

  // And the same edge WITH the material's polarity is bound.
  const agreeing = reader.read("Pierre Bezukhov never loved Helene.");
  const boundClaim = agreeing.claims.find((c) => c.verb === "loved");
  assert.equal(boundClaim.verdict, "bound");
  assert.equal(boundClaim.polarity, "-");
});

test("a pronoun subject is beyond reach — disclosed, never judged", async () => {
  const reader = makeRelationReader(await organs())(PASSAGES, { pool: POOL });
  const report = reader.read("He married Helene.");
  const claim = report.claims.find((c) => c.verb === "married");
  assert.ok(claim);
  assert.equal(claim.verdict, "beyond-reach");
  // Limits of the instrument never land on the record as unsupported.
  assert.equal(relationFindings(report).length, 0);
  assert.equal(relationsClean(report), true);
});

test("a verb the material never measures is unheard — the reach ends visibly", async () => {
  const reader = makeRelationReader(await organs())(PASSAGES, { pool: POOL });
  const report = reader.read("Pierre Bezukhov betrayed Helene.");
  const claim = report.claims.find((c) => c.verb === "betrayed");
  assert.ok(claim, JSON.stringify(report.claims));
  assert.equal(claim.verdict, "unheard");
  // Beyond-reach, not a finding: it stays off the unsupported list.
  assert.equal(relationFindings(report).length, 0);
});

test("no material means not examined; nameless material means a typed vocabulary gap", async () => {
  const make = makeRelationReader(await organs());
  const empty = make([]);
  assert.equal(empty.examined, false);
  assert.equal(empty.read("Anything.").examined, false);

  const nameless = make([{ ref: "n.txt#0-60", text: "it rained. it rained again. nothing else happened at all." }]);
  const report = nameless.read("Pierre married Helene.");
  assert.equal(report.examined, true);
  assert.ok(report.vocabulary.gap, "a tier that did not run must say so, never imply clean");
  assert.equal(report.claims.length, 0);
});

test("headings and addresses are furniture to this tier too", async () => {
  const reader = makeRelationReader(await organs())(PASSAGES, { pool: POOL });
  const report = reader.read("## Pierre married Dolokhov\n\nPierre Bezukhov spoke of the wedding. [wp.txt#0-400]");
  assert.ok(
    !report.claims.some((c) => c.verb === "married"),
    `a heading must not be read as a claim: ${JSON.stringify(report.claims)}`,
  );
});

test("corroborateAtoms counts support per passage and per distinct source", async () => {
  // "Marya" sits mid-sentence on purpose: a lone capitalized word OPENING a
  // sentence is position, not namehood (extractAtoms skips it by design).
  const answer = "Pierre Bezukhov married Helene. The letter Marya wrote reached him.";
  const { examined, atoms } = corroborateAtoms(answer, PASSAGES);
  assert.equal(examined, true);
  const pierre = atoms.find((a) => /Pierre/.test(a.text));
  assert.ok(pierre);
  // Pierre appears in all three passages, across both source files.
  assert.equal(pierre.refs.length, 3);
  assert.equal(pierre.sources.length, 2);
  const marya = atoms.find((a) => /Marya/.test(a.text));
  assert.ok(marya);
  assert.deepEqual(marya.sources, ["letters.txt"]);
  // Nothing to check against stays distinct from checked-and-supported.
  assert.equal(corroborateAtoms(answer, []).examined, false);
});

// ── slot competition (P27's named follow-up, added 2026-08-19) ─────────────
// The Yankees/Pirates shape, structurally: a byte check passes every word,
// and the plain subject+verb match above finds nothing (the claimed subject
// never did this verb at all) — but the material binds this EXACT verb and
// object to someone else, and only to someone else, which is stronger
// evidence than an ordinary nearest-edge neighbour.

test("a slot the material fills with exactly one other subject is named, not just flagged unbound", async () => {
  const reader = makeRelationReader(await organs())(PASSAGES, { pool: POOL });
  // Dolokhov never married anyone in this material; Pierre Bezukhov married
  // Helene, twice, consistently. The claim's own subject+verb match is
  // empty (Dolokhov+married binds nothing), so this reaches the unbound
  // branch — and the verb+object slot (married, Helene) is bound to exactly
  // one other subject across both mentions.
  const report = reader.read("Dolokhov married Helene.");
  const claim = report.claims.find((c) => c.verb === "married" && /Dolokhov/i.test(c.subject));
  assert.ok(claim, JSON.stringify(report.claims, null, 2));
  assert.equal(claim.verdict, "unbound");
  assert.ok(claim.competing, "the single consistent filler must be surfaced");
  assert.match(claim.competing.subject, /Pierre Bezukhov/i);
  assert.equal(claim.competing.verb, "married");
  assert.ok(claim.competing.refs.includes("wp.txt#0-400"));
  assert.ok(claim.competing.refs.includes("wp.txt#400-800"));
  // Two passages, one source: the same independence discipline `bound`
  // corroboration already carries.
  assert.equal(claim.competing.corroboration.passages, 2);
  assert.equal(claim.competing.corroboration.sources, 1);
  // The competing edge leads `nearest` — every existing UI reader
  // (app.js's badge and grounding panel both read nearest[0]/nearest)
  // inherits the stronger evidence with no further change.
  assert.equal(claim.nearest[0].subject, claim.competing.subject);
  // And the record's phrasing names the actual filler, not just an absence.
  const lines = relationFindings(report);
  assert.ok(
    lines.some((l) => /fills this differently/.test(l) && /Pierre Bezukhov/.test(l) && /married/.test(l)),
    JSON.stringify(lines),
  );
  assert.equal(relationsClean(report), false);
});

test("a slot the material fills with two DIFFERENT subjects stays plain unbound — competing is never guessed", async () => {
  // A verb+object pair bound to two distinct real subjects across the
  // material: the mechanism must not pick one arbitrarily and must not
  // infer "exclusive winner" from what "acquired" merely SOUNDS like.
  const RIVAL_PASSAGES = [
    {
      ref: "acq.txt#0-200",
      text:
        "Kessington Group acquired Bramwell Textiles in the spring, the filing showed. " +
        "Kessington Group later restructured its own board after the acquisition. " +
        "Vantage Mills sold linens across three counties that same spring, the ledger noted.",
    },
    {
      ref: "acq.txt#200-400",
      text:
        "Harrow Partners acquired Bramwell Textiles again that autumn, after the first deal collapsed. " +
        "Harrow Partners kept the Bramwell Textiles name for another year. " +
        "Vantage Mills kept its own ledgers separate from the acquisition entirely, the notes said.",
    },
  ];
  const RIVAL_POOL = [
    ...RIVAL_PASSAGES,
    ...FILLER.split(". ").map((s, i) => ({ ref: `filler2.txt#${i * 100}-${i * 100 + 99}`, text: s + "." })),
  ];
  const reader = makeRelationReader(await organs())(RIVAL_PASSAGES, { pool: RIVAL_POOL });
  const report = reader.read("Vantage Mills acquired Bramwell Textiles.");
  const claim = report.claims.find((c) => c.verb === "acquired" && /Vantage Mills/i.test(c.subject));
  assert.ok(claim, JSON.stringify(report.claims, null, 2));
  assert.equal(claim.verdict, "unbound");
  assert.equal(claim.competing, undefined, "two different real fillers must never collapse into one guess");
  // The record still says what it can — never says this — without the
  // stronger, unearned "it says X instead" phrasing.
  const lines = relationFindings(report);
  assert.ok(lines.some((l) => /never says/.test(l) && /acquired/.test(l)));
  assert.ok(!lines.some((l) => /fills this differently/.test(l)));
});

test("a competing filler must agree with the claim's own number when both carry one — a different year vetoes the match", async () => {
  // The exact shape found running this live against real fetched web
  // material (2026-08-19): a recurring object phrase ("the World Series")
  // resolved to ONE referent across every mention regardless of year, so a
  // claim about the 1960 series competed against a bound "…won the World
  // Series in 1971" edge — sourced, but answering a different question.
  const YEAR_PASSAGES = [
    {
      ref: "series.txt#0-300",
      text:
        "The Pittsburgh Pirates won the 1960 World Series, defeating the New York Yankees. " +
        "The Pittsburgh Pirates also won the World Series in 1971, defeating the Baltimore Orioles. " +
        "The Pittsburgh Pirates play their home games at PNC Park.",
    },
  ];
  const YEAR_POOL = [
    ...YEAR_PASSAGES,
    ...FILLER.split(". ").map((s, i) => ({ ref: `filler3.txt#${i * 100}-${i * 100 + 99}`, text: s + "." })),
  ];
  const reader = makeRelationReader(await organs())(YEAR_PASSAGES, { pool: YEAR_POOL });
  const report = reader.read("The New York Yankees won the 1960 World Series.");
  const claim = report.claims.find((c) => c.verb === "won" && /Yankees/i.test(c.subject));
  assert.ok(claim, JSON.stringify(report.claims, null, 2));
  assert.equal(claim.verdict, "unbound");
  assert.ok(claim.competing, "the year-agreeing edge must still be found");
  assert.match(claim.competing.object, /1960/);
  assert.doesNotMatch(claim.competing.object, /1971/, "the 1971 edge must never be chosen for a 1960 claim");
});

test("the declared number is the declaration, not a tuned knob", () => {
  // Pinned so a future "walk it and see what scores best" cannot happen
  // silently — changing this constant is a policy change, and lands with
  // its justification or not at all.
  assert.equal(MIN_SURFACES_PER_VERB, 1);
});
