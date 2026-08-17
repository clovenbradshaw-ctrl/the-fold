// node --test relations-chain.test.mjs
//
// Conformance for the relation handles, against the ENGINE'S REAL ORGANS —
// the relation list and the referent rows are produced by the exact
// composition host/corpus.js::discoveredCast runs (splitSentences ->
// functionWordSet -> extractSurfaces -> discoverRelationVocab ->
// extractRelations; discoverReferents -> projectReferents), so what the
// handles are measured against is what Explore's Link and Entity surfaces
// actually serve. The hypergraph.test.mjs discipline: stub nothing.

import { test } from "node:test";
import assert from "node:assert/strict";

import { chainRelations } from "./relations-chain.js";

const organs = async () => {
  const { splitSentences } = await import("../eoreader6.1/packages/engine/perceiver/text/spans.js");
  const { extractSurfaces, discoverReferents, diaNorm } = await import(
    "../eoreader6.1/packages/engine/perceiver/text/surfaces.js"
  );
  const { discoverRelationVocab, extractRelations } = await import(
    "../eoreader6.1/packages/engine/perceiver/text/relations.js"
  );
  const { tokenize, buildFrequencyTable, functionWordSet } = await import(
    "../eoreader6.1/packages/engine/perceiver/text/material.js"
  );
  const { projectReferents } = await import("../eoreader6.1/packages/engine/referents/index.js");
  return { splitSentences, extractSurfaces, discoverReferents, diaNorm, discoverRelationVocab, extractRelations, tokenize, buildFrequencyTable, functionWordSet, projectReferents };
};

// Ordinary prose at enough scale that the Zipf-derived closed class behaves
// (hypergraph.test.mjs's own FILLER, repeated — at turn scale every recurring
// word crosses material.js's token-share threshold, including the names).
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
  "The letters were kept in a drawer of the desk, and the desk stood by the window. ";

// The narrative carries the measured live shapes: a subordinate-clause
// fragment ("that he would be remembered amongst"), its same-sentence
// continuation ("Russia would never forget him" — a subject the cast never
// admits), a chain across one sentence boundary, a two-sentence wall of
// relation-free prose, and a cast (Kutuzov, Napoleon, Moscow) that recurs
// mid-sentence enough for the engine's own derived admission floor.
const NARRATIVE = [
  "Kutuzov wrote that he would be remembered amongst the most famous commanders, and Russia would never forget him.",
  "In the autumn Napoleon marched toward Moscow, and old Kutuzov waited beyond the city.",
  "The rain fell for a week over the roads.",
  "The carts stood in the mud by the river.",
  "Then Napoleon entered Moscow before the frost.",
  "But Kutuzov answered nothing, and Napoleon retreated in December.",
].join(" ");

const BODY = FILLER.repeat(4) + NARRATIVE;

// The exact composition discoveredCast runs (host/corpus.js:1050), so these
// fixtures are the engine's own answer, not a hand-written stand-in.
async function readBody(body) {
  const o = await organs();
  const sentences = o.splitSentences(body);
  const functionWords = o.functionWordSet(o.buildFrequencyTable(o.tokenize(body)));
  const surfaces = o.extractSurfaces(sentences, { functionWords });
  const { verbs } = o.discoverRelationVocab(body, { surfaces, functionWords, minSurfaces: 1 });
  const relations = o.extractRelations(body, { verbs, functionWords });
  const projected = o.projectReferents(o.discoverReferents(surfaces).events);
  // sessionReferents' display rule: the longest established surface.
  const referents = projected.map((r) => ({
    id: r.id,
    display: [...r.surfaces].sort((a, b) => b.length - a.length)[0],
    surfaces: r.surfaces,
  }));
  return { relations, referents, diaNorm: o.diaNorm };
}

const byVerb = (rows, verb) => rows.find((r) => r.verb === verb);

test("the engine still states the fragment shapes this module exists for", async () => {
  const { relations } = await readBody(BODY);
  // Pinned so a drift in the engine's extraction shows up HERE, as a changed
  // ground, not downstream as a mysteriously failing handle assertion.
  const wrote = relations.find((r) => r.verb === "wrote");
  assert.ok(wrote, JSON.stringify(relations));
  assert.match(wrote.object, /^that he would/, "the subordinate-clause fragment is the measured live shape");
  assert.ok(relations.find((r) => r.verb === "would" && /forget/.test(r.object)), "the second fragment of the same sentence");
});

test("every located relation's span holds its own words — offsets self-verify", async () => {
  const { relations, referents, diaNorm } = await readBody(BODY);
  const rows = chainRelations(relations, { text: BODY, referents, diaNorm });
  assert.equal(rows.length, relations.length);
  let located = 0;
  for (const r of rows) {
    if (!r.where) continue;
    located++;
    const slice = BODY.slice(r.where.start, r.where.end);
    const subjectHead = String(r.subject).split(/\s+/)[0];
    assert.ok(new RegExp(`(?:^|[^\\p{L}])${subjectHead}`, "iu").test(slice), `span must open on the subject: "${slice}"`);
    assert.ok(new RegExp(`\\b${r.verb}\\b`, "iu").test(slice), `span must hold the verb: "${slice}"`);
    // Document order: spans of successive located relations never run backward.
  }
  assert.ok(located >= 5, `most relations locate (${located} of ${rows.length})`);
  const starts = rows.filter((r) => r.where).map((r) => r.where.start);
  assert.deepEqual(starts, [...starts].sort((a, b) => a - b), "located spans are in document order");
});

test("a subordinate-clause fragment points back to the statement it completes", async () => {
  const { relations, referents, diaNorm } = await readBody(BODY);
  const rows = chainRelations(relations, { text: BODY, referents, diaNorm });
  const wrote = byVerb(rows, "wrote"); // Kutuzov wrote that he would be remembered…
  const forget = rows.find((r) => r.verb === "would" && /forget/.test(r.object)); // Russia would never forget him
  assert.ok(wrote && forget);
  // The fragment's back handle is the statement before it, in the same sentence.
  assert.equal(forget.prev.index, wrote.index);
  assert.equal(forget.prev.link, "same-sentence");
  assert.equal(wrote.next.index, forget.index);
  // And the handles are symmetric by construction.
  for (const r of rows) {
    if (r.next) assert.equal(rows[r.next.index].prev.index, r.index);
    if (r.prev) assert.equal(rows[r.prev.index].next.index, r.index);
  }
});

test("the chain crosses one sentence boundary as adjacent clauses, and breaks at a wall of relation-free prose", async () => {
  const { relations, referents, diaNorm } = await readBody(BODY);
  const rows = chainRelations(relations, { text: BODY, referents, diaNorm });
  const forget = rows.find((r) => r.verb === "would" && /forget/.test(r.object));
  const marched = byVerb(rows, "marched"); // next sentence's first clause
  assert.equal(forget.next.index, marched.index);
  assert.equal(forget.next.link, "adjacent-clause");
  // "…and old Kutuzov waited beyond the city." then TWO relation-free
  // sentences (the rain, the carts): the discourse chain does not pretend
  // adjacency across them.
  const waited = byVerb(rows, "waited");
  const entered = byVerb(rows, "entered");
  assert.ok(waited && entered);
  assert.equal(waited.next, null, "no forward handle across two relation-free sentences");
  assert.equal(entered.prev, null, "and none backward");
  // Same sentence, two clauses apart by one comma: answered → retreated.
  const answered = byVerb(rows, "answered");
  const retreated = byVerb(rows, "retreated");
  assert.equal(answered.next.index, retreated.index);
  assert.equal(answered.next.link, "same-sentence");
});

test("shared handles ride the engine's own referents: same cast member, either end", async () => {
  const { relations, referents, diaNorm } = await readBody(BODY);
  assert.ok(referents.some((r) => r.display === "Kutuzov"), "the cast must admit Kutuzov for this test to mean anything");
  const rows = chainRelations(relations, { text: BODY, referents, diaNorm });
  const wrote = byVerb(rows, "wrote");
  const waited = byVerb(rows, "waited");
  const answered = byVerb(rows, "answered");
  // Every statement whose subject resolves to Kutuzov sees the others.
  const viaKutuzov = (r) => r.shared.filter((x) => x.via.includes("Kutuzov")).map((x) => x.index);
  assert.ok(viaKutuzov(wrote).includes(waited.index), JSON.stringify(wrote.shared));
  assert.ok(viaKutuzov(wrote).includes(answered.index));
  assert.ok(viaKutuzov(waited).includes(wrote.index));
  // "Then Napoleon entered Moscow before" shares Napoleon AND Moscow with
  // "…Napoleon marched toward Moscow": one sibling entry, both names on via.
  const marched = byVerb(rows, "marched");
  const entered = byVerb(rows, "entered");
  const sib = entered.shared.find((x) => x.index === marched.index);
  assert.ok(sib, JSON.stringify(entered.shared));
  assert.deepEqual(sib.via, ["Moscow", "Napoleon"]);
  // Sibling lists are in document order.
  for (const r of rows) {
    const idx = r.shared.map((x) => x.index);
    assert.deepEqual(idx, [...idx].sort((a, b) => a - b));
  }
});

test("a subject the cast never admits gets no shared handle — but keeps its chain", async () => {
  const { relations, referents, diaNorm } = await readBody(BODY);
  assert.ok(!referents.some((r) => r.display === "Russia"), "Russia recurs in one sentence only — below the engine's own admission floor");
  const rows = chainRelations(relations, { text: BODY, referents, diaNorm });
  const forget = rows.find((r) => r.verb === "would" && /forget/.test(r.object));
  assert.deepEqual(forget.shared, [], "no referent resolves on either end");
  assert.ok(forget.prev && forget.next, "the discourse chain is exactly what still holds a fragment like this");
});

test("absences degrade to nulls, never guesses, and the input is not mutated", async () => {
  const { relations, referents, diaNorm } = await readBody(BODY);
  const before = JSON.stringify(relations);

  // No text: no spans, no chain — referent handles still stand.
  const noText = chainRelations(relations, { referents, diaNorm });
  assert.ok(noText.every((r) => r.where === null && r.prev === null && r.next === null));
  assert.ok(noText.some((r) => r.shared.length > 0));

  // No referents: no shared handles — the chain still stands.
  const noCast = chainRelations(relations, { text: BODY, diaNorm });
  assert.ok(noCast.every((r) => r.shared.length === 0));
  assert.ok(noCast.some((r) => r.prev || r.next));

  // Empty and junk inputs return empty, not throws.
  assert.deepEqual(chainRelations([], {}), []);
  assert.deepEqual(chainRelations(null, {}), []);

  assert.equal(JSON.stringify(relations), before, "the engine's list is read, never written");
});

test("a relation the locator cannot place is disclosed, and its neighbours chain past it", async () => {
  const { referents, diaNorm } = await readBody(BODY);
  // Two real neighbours with a fabricated relation between them — words that
  // appear nowhere in the text, the honest simulation of a locator miss.
  const real = (await readBody(BODY)).relations;
  const wrote = real.find((r) => r.verb === "wrote");
  const forget = real.find((r) => r.verb === "would" && /forget/.test(r.object));
  const ghost = { subject: "Zzyzx", verb: "quokkaed", object: "nothing anywhere", polarity: "+" };
  const rows = chainRelations([wrote, ghost, forget], { text: BODY, referents, diaNorm });
  assert.equal(rows[1].where, null);
  assert.equal(rows[1].prev, null);
  assert.equal(rows[1].next, null);
  assert.equal(rows[0].next.index, 2, "the located neighbours chain across the unlocatable row");
  assert.equal(rows[2].prev.index, 0);
});
