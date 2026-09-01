// arrangement.test.mjs — end1/label/end2, added alongside subject/verb/object.
// A SEPARATE file on purpose, the same precedent hyperlexicon-stance.test.mjs
// and hypergraph-vocabulary-candidates.test.mjs already established:
// hypergraph.test.mjs reaches the engine through ../eoreader7/legacy-eoreader6.1,
// an uninitialised submodule in this checkout, so a case appended there would
// silently never execute. This tests against eoreader7's real NATIVE organs.
//
// WHY THIS EXISTS. The grammar-lens work already said the arrangement itself
// is earned as "an ordered first end, a label, an ordered second end," and
// that `subject`/`verb`/`object` are the SAE-grammar READING of it — a
// declared overlay, not the ground truth. But the STORED shape never held
// that distinction: every edge and claim in this file is keyed literally
// `.subject`/`.verb`/`.object`, at four separate construction sites
// (the primary edge loop, `judge()`, `edgeFace()`, and the `unheard`-verdict
// claim). `arrangementOf(t)` is the one place that maps a triple onto its
// earned names; used at all four sites so the mapping cannot drift the way
// four independent literals eventually would (this file's own history:
// DEF/EVA's `Array.find`, `synthesize`'s `String.includes`).
//
// ADDITIVE, NOT A RENAME. `subject`/`verb`/`object` are untouched at every
// site; `end1`/`label`/`end2` are added beside them. Migrating a consumer
// off the SAE names is real, scoped, future work (221 call sites across 22
// files, at last count) — not attempted here.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeRelationReader, arrangementOf } from "./hypergraph.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.join(HERE, "..", "eoreader7", "native");

async function loadOrgans() {
  const spans = await import(path.join(NATIVE, "adapters/text/spans.js"));
  const surfaces = await import(path.join(NATIVE, "adapters/text/surfaces.js"));
  const relations = await import(path.join(NATIVE, "adapters/text/relations.js"));
  const material = await import(path.join(NATIVE, "adapters/text/material.js"));
  const priors = await import(path.join(NATIVE, "adapters/text/priors.js"));
  const determiners = new Set([...priors.DEFINITE_DETERMINERS, ...priors.INDEFINITE_DETERMINERS]);
  const relationsFor = makeRelationReader({
    splitSentences: spans.splitSentences,
    extractSurfaces: surfaces.extractSurfaces,
    discoverReferents: surfaces.discoverReferents,
    namesCorefer: surfaces.namesCorefer,
    diaNorm: surfaces.diaNorm,
    discoverRelationVocab: relations.discoverRelationVocab,
    extractRelations: relations.extractRelations,
    tokenize: material.tokenize,
    determiners,
    negationWords: priors.NEGATION_WORDS,
  });
  return { relationsFor };
}

test("arrangementOf: a pure mapping from the SAE names to the earned ones, nothing else", () => {
  assert.deepEqual(
    arrangementOf({ subject: "Pierre", verb: "walked", object: "the market", polarity: false }),
    { end1: "Pierre", label: "walked", end2: "the market" },
  );
});

test("arrangementOf: undefined fields map through as undefined, never guessed", () => {
  assert.deepEqual(arrangementOf({}), { end1: undefined, label: undefined, end2: undefined });
});

test("real edges (the primary edge loop) carry end1/label/end2 matching subject/verb/object", async () => {
  const { relationsFor } = await loadOrgans();
  const p = { ref: "prose", text: "Pierre Bezukhov walked to the market. Pierre Bezukhov bought bread. Natasha Rostova sang a song. Natasha Rostova danced with joy." };
  const report = relationsFor([p], { pool: [p] });
  assert.ok(report.edges.length > 0, "real prose must produce real edges to test against");
  for (const e of report.edges) {
    assert.equal(e.end1, e.subject, `end1 must equal subject for edge ${JSON.stringify(e.verb)}`);
    assert.equal(e.label, e.verb, `label must equal verb for edge ${JSON.stringify(e.verb)}`);
    assert.equal(e.end2, e.object, `end2 must equal object for edge ${JSON.stringify(e.verb)}`);
    // Nothing existing is removed — both readings coexist on the same edge.
    assert.ok("subject" in e && "verb" in e && "object" in e, "the SAE fields are untouched, not replaced");
  }
});

test("edgeFace's projection (nearest/competing) carries end1/label/end2 too, not just the raw edge", async () => {
  const { relationsFor } = await loadOrgans();
  // Two-word proper names, matching the pattern the vocabulary/candidates
  // fixture above already proved works: a bare single capitalized word
  // sitting sentence-initially every time ("Lincoln appointed...") is the
  // genuinely ambiguous case extractSurfaces refuses (indistinguishable
  // from ordinary sentence-initial capitalization) — checked directly
  // against the real organs before writing this fixture, not assumed.
  const p1 = { ref: "a.txt", text: "Abraham Lincoln appointed Hannibal Hamlin. Abraham Lincoln appointed Andrew Johnson." };
  const report = relationsFor([p1], { pool: [p1] });
  const { claims } = report.read("Abraham Lincoln appointed William Seward.");
  const withNearest = claims.find((c) => Array.isArray(c.nearest) && c.nearest.length > 0);
  assert.ok(withNearest, "a claim contesting an existing subject+verb bucket must surface `nearest` (edgeFace's own projection) to test against");
  for (const n of withNearest.nearest) {
    assert.equal(n.end1, n.subject);
    assert.equal(n.label, n.verb);
    assert.equal(n.end2, n.object);
  }
});

test("judge()'s claim (via read()) carries end1/label/end2 matching subject/verb/object", async () => {
  const { relationsFor } = await loadOrgans();
  const p = { ref: "prose", text: "Pierre Bezukhov walked to the market." };
  const report = relationsFor([p], { pool: [p] });
  const { claims } = report.read("Pierre Bezukhov walked to the market.");
  assert.ok(claims.length > 0, "a restated sentence must produce a claim to test against");
  for (const c of claims) {
    assert.equal(c.end1, c.subject);
    assert.equal(c.label, c.verb);
    assert.equal(c.end2, c.object);
  }
});

test("an 'unheard' claim (the fourth construction site) carries end1/label/end2 too", async () => {
  const { relationsFor } = await loadOrgans();
  // Material that never uses "orchestrated" at all, so the answer's own use
  // of it lands on the unheard path (hypergraph.js's own disclosed-gap arm),
  // not the ordinary judge() path.
  const p = { ref: "prose", text: "Pierre Bezukhov walked to the market and bought bread." };
  const report = relationsFor([p], { pool: [p] });
  const { claims } = report.read("Pierre Bezukhov orchestrated the market.");
  const unheard = claims.find((c) => c.verdict === "unheard");
  assert.ok(unheard, "the material never uses 'orchestrated' — this must land on the unheard arm to test it");
  assert.equal(unheard.end1, unheard.subject);
  assert.equal(unheard.label, unheard.verb);
  assert.equal(unheard.end2, unheard.object);
});
