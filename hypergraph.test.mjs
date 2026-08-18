// node --test hypergraph.test.mjs
//
// Conformance for the relation tier, against the ENGINE'S REAL ORGANS —
// what counts as a surface, a referent, a verb, a triple must be the
// engine's own answer, or the material's graph and the answer's reading
// drift apart and every verdict is a comparison of two different readings.

import { test } from "node:test";
import assert from "node:assert/strict";

import { makeRelationReader, relationFindings, relationsClean, MIN_SURFACES_PER_VERB } from "./hypergraph.js";
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

// A concept-scale material: one named surface ("Darwin") to seed the cast
// ladder and the relation vocabulary, plus a recurring PLAIN-NOUN subject
// ("Butterflies") that cast.js never names — the exact starvation
// host/terrains.js's own recurring-form binding was built to answer,
// applied here to the relation tier's referent gate instead of the graph.
// "Butterflies" recurs across two sentences (FORM_MIN_ARRIVALS); "Moths"
// appears exactly once, on purpose, so the floor's own refusal is pinned
// too, not just its admission.
const FORM_PASSAGES = [
  {
    ref: "insects.txt#0-200",
    text:
      "Naturalists have long studied insects in the field. " +
      "Charles Darwin himself observed specimens for many years, and Darwin wrote about their metamorphosis in his notebooks.",
  },
  {
    ref: "insects.txt#200-400",
    text:
      "Butterflies wrote nothing themselves, but their metamorphosis is well documented. " +
      "Butterflies wrote across the historical record only through patterns naturalists observed. " +
      "Moths crossed the meadow once at dusk.",
  },
];

test("a recurring plain-noun subject resolves as a FORM — the concept-document starvation host/terrains.js already named", async () => {
  const reader = makeRelationReader(await organs())(FORM_PASSAGES);
  const report = reader.read("Butterflies wrote across the historical record.");
  const claim = report.claims.find((c) => c.verb === "wrote" && c.subject === "Butterflies");
  assert.ok(claim, JSON.stringify(report.claims, null, 2));
  assert.equal(claim.verdict, "bound");
  assert.equal(claim.formBased, true, "a subject with no cast referent must disclose it rested on a form");
  assert.ok(claim.refs.includes("insects.txt#200-400"));
});

test("a form is never mistaken for a name — a claim resting on a real referent is never marked formBased", async () => {
  const reader = makeRelationReader(await organs())(FORM_PASSAGES);
  const report = reader.read("Darwin wrote about their metamorphosis.");
  const claim = report.claims.find((c) => c.verb === "wrote" && c.subject === "Darwin");
  assert.ok(claim, JSON.stringify(report.claims, null, 2));
  assert.equal(claim.verdict, "bound");
  assert.equal(claim.formBased, false, "Darwin resolves through the real referent index, not a form");
});

test("a subject that recurs only once is still beyond reach — FORM_MIN_ARRIVALS is a floor, not a courtesy", async () => {
  const reader = makeRelationReader(await organs())(FORM_PASSAGES);
  const report = reader.read("Moths wrote about the meadow.");
  const claim = report.claims.find((c) => c.verb === "wrote" && c.subject === "Moths");
  assert.ok(claim, JSON.stringify(report.claims, null, 2));
  assert.equal(claim.verdict, "beyond-reach");
  assert.equal(relationFindings(report).length, 0, "a limit of the instrument is never a finding against the answer");
});

test("a form-resolved subject with no matching edge is unbound, not silently beyond-reach", async () => {
  const reader = makeRelationReader(await organs())(FORM_PASSAGES);
  const report = reader.read("Butterflies wrote about a treaty.");
  const claim = report.claims.find((c) => c.verb === "wrote" && c.subject === "Butterflies");
  assert.ok(claim, JSON.stringify(report.claims, null, 2));
  assert.equal(claim.verdict, "unbound");
  assert.equal(claim.formBased, true);
  assert.ok(claim.nearest.length > 0, "the nearest-edge disclosure fires here exactly as it does for a named subject");
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

test("the declared number is the declaration, not a tuned knob", () => {
  // Pinned so a future "walk it and see what scores best" cannot happen
  // silently — changing this constant is a policy change, and lands with
  // its justification or not at all.
  assert.equal(MIN_SURFACES_PER_VERB, 1);
});
