// capacity-runner.test.mjs — `cast` executed for real, against the REAL
// engine perceiver organs (the same relative-path pattern grid.test.mjs
// and build-log.test.mjs already use). No stubs, no canned referents.

import { test } from "node:test";
import assert from "node:assert/strict";

import * as operators from "../eoreader7/legacy-eoreader6.1/packages/engine/operators.js";
import * as taskLog from "../eoreader7/legacy-eoreader6.1/packages/engine/holon/task-log.js";
import { splitSentences } from "../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js";
import { discoverRelationVocab, extractRelations } from "../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/relations.js";
import { tokenize } from "../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/material.js";
import { classifyWord, dominantClass } from "../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/wordclass.js";
import { makeReferentIndex } from "./cast.js";
import { makeRelationReader } from "./hypergraph.js";
import { makeCapacityRunner, landAct, negationCandidates, perSourceReadings, mergeTestimony, SELF_WITNESS, isSelfWitness, landSelfAssertion } from "./capacity-runner.js";
import { makeGrid } from "./grid.js";
import { findCapacity, unresolvedCapacity } from "./capacities.js";
import { makeGrammarLens } from "./grammar-lens.js";

function freshRunner() {
  const referentIndexFor = makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });
  return makeCapacityRunner({ referentIndexFor });
}

// `relations`, the second capacity that executes (2026-08-19) — its own
// runner with relationsFor REALLY injected, over the REAL engine organs,
// the same pattern cast's own tests hold to. makeRelationReader reuses the
// WHOLE organs object for its own internal makeReferentIndex call
// (hypergraph.js's own doc comment says so), so this needs every organ
// cast's bundle needs PLUS the relation-specific ones — a subset silently
// zeroes the measured vocabulary rather than erroring, which is exactly
// how the first cut of these tests got it wrong.
function freshRelationsRunner() {
  const referentIndexFor = makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });
  const relationsFor = makeRelationReader({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize });
  return makeCapacityRunner({ referentIndexFor, relationsFor });
}

// "Lincoln" must appear OUTSIDE sentence-initial position at least once —
// a lone capitalized word that ONLY ever opens a sentence reads as
// position, not namehood (the engine's own L2 discipline), and never gets
// admitted as an established referent; every triple with it as subject
// then has nothing to resolve against and the vocabulary measure stays
// empty. The trailing two sentences put it in object position, exactly
// matching the working fixture in hypergraph.test.mjs.
const LINCOLN_TEXT =
  "Lincoln appointed Hamlin. Lincoln appointed Johnson. Lincoln nominated Seward. Hamlin visited Lincoln often. Johnson visited Lincoln rarely.";

function freshGrid() {
  const grid = makeGrid({ operators, taskLog });
  grid.withCapacities({ findCapacity, unresolvedCapacity });
  return grid;
}

test("runCapacity: an id neither \"cast\" nor \"relations\" is a typed, disclosed gap — never a silent no-op", () => {
  const runCapacity = freshRunner();
  const out = runCapacity("graph", { text: "whatever" });
  assert.equal(out.gap, "not_yet_executable");
  assert.equal(out.id, "graph");
  assert.match(out.detail, /not yet wired/);
});

test("runCapacity: \"relations\" IS one of the two that execute, but still a typed gap — never a fabricated result — when this page's own runner has no relationsFor injected", () => {
  const runCapacity = freshRunner(); // freshRunner() deliberately omits relationsFor
  const out = runCapacity("relations", { text: "Lincoln appointed Hamlin." });
  assert.equal(out.gap, "not_yet_executable");
  assert.equal(out.id, "relations");
  assert.match(out.detail, /relationsFor/);
});

test("runCapacity: \"relations\" with no query dumps the whole edge graph — real triples, not a fabricated list", () => {
  const runCapacity = freshRelationsRunner();
  const out = runCapacity("relations", { text: LINCOLN_TEXT, name: "lincoln.txt" });
  assert.equal(out.gap, undefined, JSON.stringify(out));
  assert.equal(out.id, "relations");
  assert.ok(out.count >= 3, `expected at least 3 edges, got ${out.count}`);
  assert.ok(out.edges.some((e) => e.subject === "Lincoln" && e.verb === "appointed" && e.object === "Hamlin"));
  assert.ok(out.edges.some((e) => e.subject === "Lincoln" && e.verb === "appointed" && e.object === "Johnson"));
});

test("runCapacity: \"relations\" with subject+verb given answers the exact cardinality question — who did Lincoln appoint", () => {
  const runCapacity = freshRelationsRunner();
  const out = runCapacity("relations", { text: LINCOLN_TEXT, name: "lincoln.txt", query: { subject: "Lincoln", verb: "appointed" } });
  assert.equal(out.gap, undefined, JSON.stringify(out));
  assert.equal(out.count, 2);
  assert.deepEqual(out.fillers.map((f) => f.object).sort(), ["Hamlin", "Johnson"]);
  // A referent-aware query, not a surface-string guess: it ran the real
  // engine's endpointsMatch, not a substring test on report.edges.
  assert.ok(out.fillers.every((f) => Array.isArray(f.refs) && f.refs.length));
});

test("runCapacity: \"relations\" refuses a malformed query (both open, or both pinned) with a typed gap, never a guess", () => {
  const runCapacity = freshRelationsRunner();
  const bothOpen = runCapacity("relations", { text: LINCOLN_TEXT, name: "lincoln.txt", query: { verb: "appointed" } });
  assert.equal(bothOpen.gap, "bad_query");
  const bothPinned = runCapacity("relations", {
    text: LINCOLN_TEXT,
    name: "lincoln.txt",
    query: { subject: "Lincoln", verb: "appointed", object: "Hamlin" },
  });
  assert.equal(bothPinned.gap, "bad_query");
});

test("runCapacity: \"relations\" with no text is a typed no_material gap, matching cast's own posture", () => {
  const runCapacity = freshRelationsRunner();
  const out = runCapacity("relations", { name: "empty.txt" });
  assert.equal(out.gap, "no_material");
  assert.match(out.detail, /empty\.txt/);
});

test("runCapacity: \"cast\" with no text is a typed no_material gap, not a crash or an empty success", () => {
  const runCapacity = freshRunner();
  const out = runCapacity("cast", { name: "empty.txt" });
  assert.equal(out.gap, "no_material");
  assert.match(out.detail, /empty\.txt/);
});

test("runCapacity: \"cast\" over real prose lands real referents, not a fabricated list", () => {
  const runCapacity = freshRunner();
  const text = [
    "Pierre Bezukhov walked slowly through the hall.",
    "Pierre Bezukhov had not slept in two days.",
    "Natasha Rostova watched him from the doorway.",
    "Natasha Rostova said nothing.",
  ].join(" ");
  const out = runCapacity("cast", { text, name: "excerpt.txt" });
  assert.equal(out.gap, undefined);
  assert.equal(out.id, "cast");
  assert.equal(out.name, "excerpt.txt");
  assert.ok(out.count >= 2, `expected at least two referents, got ${out.count}`);
  const surfaces = out.referents.map((r) => r.surface);
  assert.ok(surfaces.some((s) => s.includes("Bezukhov")), JSON.stringify(surfaces));
  assert.ok(surfaces.some((s) => s.includes("Rostova")), JSON.stringify(surfaces));
});

test("runCapacity: output tracks the ACTUAL input text — swapping the names in swaps the referents out, proving this isn't two hardcoded strings", () => {
  // A stub that always returned {surface: "Bezukhov"}/{surface: "Rostova"}
  // would pass the test above outright. This one is differential: two
  // DIFFERENT passages, with DIFFERENT names, must produce DIFFERENT,
  // non-overlapping referent sets that each match their own passage only.
  const runCapacity = freshRunner();
  const first = runCapacity("cast", {
    text: "Pierre Bezukhov walked through the hall. Pierre Bezukhov said nothing.",
    name: "a.txt",
  });
  const second = runCapacity("cast", {
    text: "Miriam Okonkwo inspected the harbor. Miriam Okonkwo left at dusk.",
    name: "b.txt",
  });
  const firstSurfaces = first.referents.map((r) => r.surface).join(" | ");
  const secondSurfaces = second.referents.map((r) => r.surface).join(" | ");
  assert.match(firstSurfaces, /Bezukhov/);
  assert.doesNotMatch(firstSurfaces, /Okonkwo/);
  assert.match(secondSurfaces, /Okonkwo/);
  assert.doesNotMatch(secondSurfaces, /Bezukhov/);
});

test("runCapacity: text with no discoverable referents lands a real, empty result — not a gap", () => {
  const runCapacity = freshRunner();
  const out = runCapacity("cast", { text: "it rained. then it stopped.", name: "weather.txt" });
  assert.equal(out.gap, undefined);
  assert.equal(out.count, 0);
  assert.deepEqual(out.referents, []);
});

// ── landAct: the ONE shared "parse → land → maybe-execute" orchestration
// term.js's `act` fold command and app.js's `/act` chat door both call —
// see this module's own header for why it moved here instead of living
// twice. Exercised against the REAL grid (freshGrid) and the REAL cast
// runner (freshRunner), the same no-stub discipline grid.test.mjs and the
// tests above already hold.

test("landAct: a parse refusal lands nothing and runs no capacity", () => {
  const grid = freshGrid();
  const runCapacity = freshRunner();
  const log = grid.createLog();
  const out = landAct(grid, log, "distinguish zone-3 at Network from encounter", { sources: {}, runCapacity });
  assert.equal(out.ok, false);
  assert.equal(out.refusal.type, "no_ground");
});

test("landAct: an ordinary act (no distinguish/ground) lands with capacity: null", () => {
  const grid = freshGrid();
  const runCapacity = freshRunner();
  const log = grid.createLog();
  const out = landAct(grid, log, "void at Void from encounter ground x broken:rotation", { sources: {}, runCapacity });
  assert.equal(out.ok, true);
  assert.equal(out.capacity, null);
  assert.equal(out.log.entries.length, 1);
});

test("landAct: distinguish's ground naming NOTHING loaded stays a silent ordinary act — capacity: null, no gap", () => {
  const grid = freshGrid();
  const runCapacity = freshRunner();
  const log = grid.createLog();
  const out = landAct(grid, log, "distinguish who-is-here at Entity from encounter ground nonexistent.txt broken:rotation", {
    sources: { "loaded.txt": "Pierre Bezukhov walked through the hall." },
    runCapacity,
  });
  assert.equal(out.ok, true);
  assert.equal(out.capacity, null, "a ground candidate naming nothing loaded must not trigger a gap or a run");
});

test("landAct: distinguish's ground naming a LOADED-BUT-EMPTY source runs the capacity and reports no_material, without attaching a result", () => {
  const grid = freshGrid();
  const runCapacity = freshRunner();
  const log = grid.createLog();
  const out = landAct(grid, log, "distinguish who-is-here at Entity from encounter ground empty.txt broken:rotation", {
    sources: { "empty.txt": "" },
    runCapacity,
  });
  assert.equal(out.ok, true);
  assert.equal(out.capacity.result.gap, "no_material");
  const insEntry = out.log.entries.find((e) => e.task_id === out.ids[out.ids.length - 1]);
  assert.equal(insEntry.result, undefined, "no_material must not attach a result entry");
});

test("landAct: distinguish's ground naming a real loaded source runs cast for real and attaches the result to the INS entry", () => {
  const grid = freshGrid();
  const runCapacity = freshRunner();
  const log = grid.createLog();
  const out = landAct(grid, log, "distinguish who-is-here at Entity from encounter ground excerpt.txt broken:rotation", {
    sources: { "excerpt.txt": "Pierre Bezukhov walked through the hall. Natasha Rostova watched him from the doorway." },
    runCapacity,
  });
  assert.equal(out.ok, true);
  assert.equal(out.event.ops.join("+"), "SIG+INS");
  assert.equal(out.ids.length, 2);
  assert.ok(out.capacity.result.count >= 2);
  const surfaces = out.capacity.result.referents.map((r) => r.surface).join(" | ");
  assert.match(surfaces, /Bezukhov/);
  assert.match(surfaces, /Rostova/);
  // The result rides the log, re-discoverable by folding it — not just on
  // the return value — the same "attached, not merely returned" property
  // grid.test.mjs's own attachResult cases already pin.
  const { acts } = grid.foldGrid(out.log);
  const insAct = acts.find((a) => a.task_id === out.ids[out.ids.length - 1]);
  assert.equal(insAct.result.count, out.capacity.result.count);
});

test("landAct: two calls compose — a second landAct call sees the first call's acts on the log", () => {
  const grid = freshGrid();
  const runCapacity = freshRunner();
  let log = grid.createLog();
  const first = landAct(grid, log, "distinguish zone-1 at Entity from encounter ground x broken:rotation", { sources: {}, runCapacity });
  assert.equal(first.ok, true);
  log = first.log;
  const second = landAct(grid, log, "relate zone-1 to zone-2 at Link from cultivation", { sources: {}, runCapacity });
  // zone-1 is established (landed above); zone-2 is not, and no warrant was
  // given — this must refuse, proving the second call really did fold
  // against the first call's own log rather than a fresh one.
  assert.equal(second.ok, false);
  assert.equal(second.refusal.type, "referent_unresolved");
});

// ── landAct: `evaluate` — EVA the hypergraph for real, with provenance,
// REC on contradiction. Same no-stub discipline: the REAL engine relation
// organs, over LINCOLN_TEXT (already the file's own shared fixture).

test("landAct: an evaluate with no verdict: clause, grounded on a real loaded source, COMPUTES holds from a real bound claim, with real provenance attached", () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner();
  const log = grid.createLog();
  const out = landAct(
    grid,
    log,
    "evaluate Lincoln appointed Hamlin at Link from differentiate ground lincoln.txt broken:rotation",
    { sources: { "lincoln.txt": LINCOLN_TEXT }, runCapacity },
  );
  assert.equal(out.ok, true);
  const evaId = out.ids[out.ids.length - 1];
  const evaEntry = out.log.entries.find((e) => e.task_id === evaId && e.kind === "propose");
  assert.equal(evaEntry.verdict, null, "the PROPOSE entry itself carries no verdict — nothing was declared");
  const { acts } = grid.foldGrid(out.log);
  const landed = acts.find((a) => a.task_id === evaId);
  assert.equal(landed.verdict, "holds", "the RESULT's payload merge must surface the COMPUTED verdict exactly as a declared one would read");
  assert.equal(landed.result.judged.verdict, "bound", "the raw hypergraph verdict is kept on the result, not just the collapsed holds/refused");
  assert.ok(Array.isArray(landed.result.judged.refs) && landed.result.judged.refs.length, "provenance: the real material refs backing the bound claim");
});

test("landAct: an evaluate COMPUTES refused from a real contradicted (opposite-polarity) claim", () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner();
  const log = grid.createLog();
  // "never" is the real, engine-recognized negation the extractor's own
  // polarity flip actually catches ("did not" was tried first and turned
  // out to land the OTHER honest gap this design already respects: the
  // extractor anchors on "did" as the verb rather than "appoint" and the
  // claim reads unheard, not contradicted — a real, disclosed limitation
  // of extractRelations, not something this test should paper over by
  // picking a different phrasing until one happens to "work").
  const out = landAct(
    grid,
    log,
    "evaluate Lincoln never appointed Hamlin at Link from differentiate ground lincoln.txt broken:rotation",
    { sources: { "lincoln.txt": LINCOLN_TEXT }, runCapacity },
  );
  assert.equal(out.ok, true);
  const { acts } = grid.foldGrid(out.log);
  const landed = acts.find((a) => a.task_id === out.ids[out.ids.length - 1]);
  assert.equal(landed.verdict, "refused");
  assert.equal(landed.result.judged.verdict, "contradicted");
  assert.ok(landed.result.judged.refs.length, "provenance: the real material refs the contradiction was found against");
});

test("landAct: an evaluate on a claim the material never settles stays UNDETERMINED — never guesses holds/refused off unbound/beyond-reach/competing", () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner();
  const log = grid.createLog();
  // LINCOLN_TEXT never says who Hamlin appointed — the reversed-subject
  // shape is exactly the "the material does not settle this" case, not a
  // material contradiction (see the investigation's own military-governor
  // specimen for the real-world analogue: a reversed actor reads unbound
  // + competing, not contradicted).
  const out = landAct(
    grid,
    log,
    "evaluate Hamlin appointed Lincoln at Link from differentiate ground lincoln.txt broken:rotation",
    { sources: { "lincoln.txt": LINCOLN_TEXT }, runCapacity },
  );
  assert.equal(out.ok, true);
  const { landings, acts } = grid.foldGrid(out.log);
  const landed = acts.find((a) => a.task_id === out.ids[out.ids.length - 1]);
  // The PROPOSE entry's own `verdict` field is `null` (tokenizeAct's own
  // `fields.verdict ?? null`) whether or not a RESULT ever lands — the
  // honest check is that it's neither "holds" nor "refused", exactly the
  // two values foldGrid's own companion-match treats as determined.
  assert.notEqual(landed.verdict, "holds");
  assert.notEqual(landed.verdict, "refused");
  assert.ok(["unbound", "beyond-reach", "unheard"].includes(landed.result.judged.verdict), landed.result.judged.verdict);
  // A companion define, if there were one, would honestly read this as an
  // unresolved wish — proving foldGrid needed zero changes for this case.
  const defOut = landAct(grid, out.log, "define hamlin-appointment at Link from generate", { sources: {}, runCapacity });
  const refolded = grid.foldGrid(defOut.log);
  const wish = refolded.landings.find((l) => l.object === "hamlin-appointment");
  assert.equal(wish.status, "wish");
});

test("landAct: a SECOND evaluate on the SAME object that computes a DIFFERENT verdict lands a REC conceding the first — never a silent overwrite", () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner();
  let log = grid.createLog();
  // First evaluate: real material says Lincoln appointed Hamlin — holds.
  const first = landAct(
    grid,
    log,
    "evaluate Lincoln appointed Hamlin at Link from differentiate ground lincoln.txt broken:rotation",
    { sources: { "lincoln.txt": LINCOLN_TEXT }, runCapacity },
  );
  assert.equal(first.ok, true);
  log = first.log;
  const firstEvaId = first.ids[first.ids.length - 1];
  // Second evaluate, SAME object text, checked against a DIFFERENT
  // ground that states the opposite — this must concede the first
  // verdict via REC before landing the second. Four sentences, not one:
  // verified live that a single bare sentence is too thin for this real
  // engine to measure a vocabulary from at all (extractSurfaces/
  // discoverReferents need a name to recur to admit a referent) — the
  // SAME "beyond-reach on a single mention" floor this whole session's
  // own investigation already measured elsewhere, not a new gap.
  const second = landAct(
    grid,
    log,
    "evaluate Lincoln appointed Hamlin at Link from differentiate ground correction.txt broken:rotation",
    {
      sources: {
        "correction.txt":
          "Lincoln never appointed Hamlin. Hamlin never worked for Lincoln. Lincoln appointed Johnson instead. Johnson served under Lincoln loyally.",
      },
      runCapacity,
    },
  );
  assert.equal(second.ok, true);
  const recEntry = second.log.entries.find((e) => e.operator === "REC");
  assert.ok(recEntry, "a REC entry must land when the recomputed verdict disagrees with the prior one");
  assert.equal(recEntry.kind, "evidence");
  assert.equal(recEntry.concedes, firstEvaId);
  assert.match(recEntry.trigger, /was "holds"/);
  const { acts } = grid.foldGrid(second.log);
  const secondEvaId = second.ids[second.ids.length - 1];
  const landedSecond = acts.find((a) => a.task_id === secondEvaId);
  assert.equal(landedSecond.verdict, "refused");
  // The FIRST evaluate is still on the raw log (append-only — nothing
  // erased) even though it's no longer the live verdict for this object.
  assert.ok(second.log.entries.some((e) => e.task_id === firstEvaId));
});

test("landAct: a REPEATED evaluate that computes the SAME verdict again lands no REC — agreement is not a contradiction", () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner();
  let log = grid.createLog();
  const first = landAct(
    grid,
    log,
    "evaluate Lincoln appointed Hamlin at Link from differentiate ground lincoln.txt broken:rotation",
    { sources: { "lincoln.txt": LINCOLN_TEXT }, runCapacity },
  );
  log = first.log;
  const second = landAct(
    grid,
    log,
    "evaluate Lincoln appointed Hamlin at Link from differentiate ground lincoln.txt broken:seed",
    { sources: { "lincoln.txt": LINCOLN_TEXT }, runCapacity },
  );
  assert.equal(second.ok, true);
  assert.ok(!second.log.entries.some((e) => e.operator === "REC"), "re-confirming the same verdict must never land a concession");
});

test("landAct: an evaluate WITH a human-declared verdict: clause is left completely untouched — no capacity runs, matching the pre-existing declared path exactly", () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner();
  const log = grid.createLog();
  const out = landAct(
    grid,
    log,
    "evaluate Lincoln appointed Hamlin at Link from differentiate ground lincoln.txt broken:rotation verdict:refused",
    { sources: { "lincoln.txt": LINCOLN_TEXT }, runCapacity },
  );
  assert.equal(out.ok, true);
  assert.equal(out.capacity, null, "a declared verdict must never be recomputed or overridden");
  const { acts } = grid.foldGrid(out.log);
  const landed = acts.find((a) => a.task_id === out.ids[out.ids.length - 1]);
  assert.equal(landed.verdict, "refused", "the human's own declared verdict stands, even though the real material would have computed holds");
});

test("landAct: an evaluate whose ground names nothing loaded stays a silent ordinary act, exactly like distinguish's own precedent", () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner();
  const log = grid.createLog();
  const out = landAct(
    grid,
    log,
    "evaluate Lincoln appointed Hamlin at Link from differentiate ground nonexistent.txt broken:rotation",
    { sources: { "lincoln.txt": LINCOLN_TEXT }, runCapacity },
  );
  assert.equal(out.ok, true);
  assert.equal(out.capacity, null);
});

// ── squaring polarity — a caller-side check that never trusts a single
// negation reading. Real root cause (found live, this session's own
// diagnostic): extractRelations's negation window only tests text through
// the end of the SUBJECT capture, so "Lincoln never appointed Hamlin"
// only negates correctly by ACCIDENT (the subject's own greedy 2-token
// capture slot happens to swallow "never" when the subject is one word),
// while a full 2-token subject leaves no free slot and the negation
// silently fails to register.

test("negationCandidates: copula sentence tries BOTH insertion points, matching the real bug's own known specimens verbatim", () => {
  const johnson = negationCandidates("Andrew Johnson was the 17th president");
  assert.ok(johnson.includes("Andrew Johnson was never the 17th president"), JSON.stringify(johnson));
  assert.ok(johnson.includes("Andrew Johnson never was the 17th president"), JSON.stringify(johnson));
  const grca = negationCandidates("Grand Canyon is one of the most studied geologic landscapes in the world");
  assert.ok(grca.includes("Grand Canyon is never one of the most studied geologic landscapes in the world"), JSON.stringify(grca));
});

test("negationCandidates: no copula tries after the first AND second token; an already-negated claim gets its negation REMOVED, not doubled", () => {
  const lincoln = negationCandidates("Lincoln appointed Hamlin");
  assert.ok(lincoln.includes("Lincoln never appointed Hamlin"), JSON.stringify(lincoln));
  assert.equal(lincoln.length, 2);
  const negated = negationCandidates("Lincoln never appointed Hamlin");
  assert.deepEqual(negated, ["Lincoln appointed Hamlin"]);
  assert.deepEqual(negationCandidates("Lincoln"), []);
  assert.deepEqual(negationCandidates(""), []);
});

test("landAct: a copula claim (the exact real-world bug shape) still computes a squared, trusted verdict — the AFTER-copula reading silently fails exactly as diagnosed, but the BEFORE-copula candidate catches the disagreement", () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner();
  const log = grid.createLog();
  const CURIE_TEXT = "Marie Curie was a physicist and chemist. Marie Curie was born in Warsaw. Marie Curie conducted pioneering research on radioactivity.";
  const out = landAct(
    grid,
    log,
    "evaluate Marie Curie was a physicist and chemist at Link from differentiate ground curie.txt broken:rotation",
    { sources: { "curie.txt": CURIE_TEXT }, runCapacity },
  );
  assert.equal(out.ok, true);
  const { acts } = grid.foldGrid(out.log);
  const landed = acts.find((a) => a.task_id === out.ids[out.ids.length - 1]);
  assert.equal(landed.verdict, "holds");
  assert.equal(landed.result.squaring.trusted, true);
  const afterCopula = landed.result.squaring.checked.find((c) => c.candidate.includes("was never"));
  assert.equal(afterCopula.verdict, "holds", "the disclosed bug: AFTER-copula negation silently fails to flip, exactly as diagnosed");
  const beforeCopula = landed.result.squaring.checked.find((c) => c.candidate.includes("never was"));
  assert.equal(beforeCopula.verdict, "refused", "the BEFORE-copula candidate is what actually earns trust here");
});

test("squarePolarity (via a mocked runCapacity): when EVERY negation candidate agrees with the primary verdict, the pair is untrusted — the direct unit test of the downgrade branch", () => {
  const grid = freshGrid();
  const log = grid.createLog();
  const alwaysBound = (id, { claim }) => ({ id, claims: [{ verdict: "bound", refs: ["fake.txt#0-10"] }] });
  const out = landAct(grid, log, "evaluate X was Y at Link from differentiate ground fake.txt broken:rotation", {
    sources: { "fake.txt": "irrelevant — runCapacity is mocked" },
    runCapacity: alwaysBound,
  });
  assert.equal(out.ok, true);
  const { acts } = grid.foldGrid(out.log);
  const landed = acts.find((a) => a.task_id === out.ids[out.ids.length - 1]);
  assert.notEqual(landed.verdict, "holds");
  assert.notEqual(landed.verdict, "refused");
  assert.equal(landed.result.rawVerdict, "holds", "the raw, UNTRUSTED verdict is still disclosed on the record — never hidden, just not shipped as the final verdict");
  assert.equal(landed.result.squaring.trusted, false);
  assert.ok(landed.result.squaring.checked.every((c) => c.verdict === "holds"), JSON.stringify(landed.result.squaring.checked));
});

// ── object specificity — squaring confirms POLARITY only; a "holds" that
// squares clean can still be a wrong number/office wearing a real edge's
// OTHER words. Found live, testing this exact wiring against the real
// specimen this whole investigation started from: "Andrew Johnson was
// the 22nd president" (false — the material says 17th) and "Andrew
// Johnson was the 17th vice president" (false — 17th is his separate
// PRESIDENT ordinal; he was the 16th VP) both computed holds, squared
// and confirmed, because hypergraph.js's own tokensShare object fallback
// needs only ONE shared word ("president") to call two objects the same.

const JOHNSON_TEXT =
  "Andrew Johnson was the 17th president of the United States, serving from 1865 to 1869. The 16th vice president, he assumed the presidency following the assassination of Abraham Lincoln.";

test("landAct: a genuinely true, cleanly-extractable claim still holds, object-checked against the real backing edge", () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner();
  const log = grid.createLog();
  const out = landAct(
    grid,
    log,
    "evaluate Andrew Johnson was the 17th president at Link from differentiate ground johnson.txt broken:rotation",
    { sources: { "johnson.txt": JOHNSON_TEXT }, runCapacity },
  );
  assert.equal(out.ok, true);
  const { acts } = grid.foldGrid(out.log);
  const landed = acts.find((a) => a.task_id === out.ids[out.ids.length - 1]);
  assert.equal(landed.verdict, "holds");
  assert.equal(landed.result.objectCheck.trusted, true);
  assert.ok(landed.result.objectCheck.claimTokens.includes("17th"));
});

test("landAct: a wrong ordinal wearing the SAME role word ('president') downgrades to undetermined — squaring alone would have wrongly trusted this", () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner();
  const log = grid.createLog();
  const out = landAct(
    grid,
    log,
    "evaluate Andrew Johnson was the 22nd president at Link from differentiate ground johnson.txt broken:rotation",
    { sources: { "johnson.txt": JOHNSON_TEXT }, runCapacity },
  );
  assert.equal(out.ok, true);
  const { acts } = grid.foldGrid(out.log);
  const landed = acts.find((a) => a.task_id === out.ids[out.ids.length - 1]);
  assert.equal(landed.result.rawVerdict, "holds", "raw judge() still wrongly binds this via the shared word 'president' — confirming the bug this check exists to catch");
  assert.notEqual(landed.verdict, "holds");
  assert.equal(landed.result.objectCheck.trusted, false);
  assert.ok(landed.result.objectCheck.claimTokens.includes("22nd"));
  assert.ok(!landed.result.objectCheck.matchedTokens.includes("22nd"));
});

test("landAct: the EXACT original conflation this investigation was built to catch — 'Andrew Johnson was the 17th vice president' (his real ordinals are 16th VP, 17th president, never combined) — downgrades to undetermined, not a confident wrong answer", () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner();
  const log = grid.createLog();
  const out = landAct(
    grid,
    log,
    "evaluate Andrew Johnson was the 17th vice president at Link from differentiate ground johnson.txt broken:rotation",
    { sources: { "johnson.txt": JOHNSON_TEXT }, runCapacity },
  );
  assert.equal(out.ok, true);
  const { acts } = grid.foldGrid(out.log);
  const landed = acts.find((a) => a.task_id === out.ids[out.ids.length - 1]);
  assert.notEqual(landed.verdict, "holds");
  assert.equal(landed.result.objectCheck.trusted, false);
  assert.ok(landed.result.objectCheck.claimTokens.includes("vice"), "the claim's own role word 'vice' is checked");
  assert.ok(!landed.result.objectCheck.matchedTokens.includes("vice"), "the real backing edge never states 'vice' — it's the president edge, not a vice-president one");
});

// ── experiencer — every computed belief names who is believing it ─────────
// (experiencer.js, user direction: "everything isn't just given by a source
// it is believed BY an experiencer"). Wired into this one seam tonight —
// see experiencer.js's own header for the honestly-scoped rest.

test("landAct: a computed EVA verdict's RESULT names its own experiencer — who read what, real and present, never a default", () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner();
  const log = grid.createLog();
  const out = landAct(
    grid,
    log,
    "evaluate Lincoln appointed Hamlin at Link from differentiate ground lincoln.txt broken:rotation",
    { sources: { "lincoln.txt": LINCOLN_TEXT }, runCapacity },
  );
  assert.equal(out.ok, true);
  const { acts } = grid.foldGrid(out.log);
  const landed = acts.find((a) => a.task_id === out.ids[out.ids.length - 1]);
  assert.equal(landed.result.experiencer.who, "the-fold:hypergraph.js:judge()");
  assert.equal(landed.result.experiencer.read, "lincoln.txt");
  assert.equal(landed.result.experiencer.revision, null, "no stable revision for a plain attached source — disclosed, not guessed");
});

// ── connector class — grammar-lens.js wired into the evaluate path,
// optionally, additively (see checkConnectorClass's own header in
// capacity-runner.js for the investigation this closes). Real material,
// real extraction, real classification: "Pierre Bezukhov always spoke
// softly to Natasha" is the Bezukhov-idiom twin of a REAL edge this
// investigation found live in pg2600.txt's own Chapter I ("Prince Vasíli
// always spoke languidly") — the connector "always" is a genuine adverb
// (102/102 ADV in the real UD_English-EWT treebank, VERB share 0), never
// a verb, and neither squaring nor checkObjectSpecificity catches it.

const CONNECTOR_POS_PRIOR = {
  schema: "POSPrior@1",
  forms: {
    // Real counts, copied verbatim from eoreader6.1/scripts/corpus/
    // pos-prior-eng.json (the real UD_English-EWT-built prior), the same
    // way grammar-lens.test.mjs's own POS_PRIOR fixture is sourced.
    always: { ADV: 102 },
    spoke: { VERB: 14 },
    noticed: { VERB: 3 },
  },
};

// The same "ordinary majority, chosen before any example is checked"
// declared floor grammar-lens.test.mjs's own MIN_SHARE already uses.
const CONNECTOR_MIN_SHARE = 0.5;

function freshConnectorClassifier() {
  return makeGrammarLens({ classifyWord, dominantClass, posPrior: CONNECTOR_POS_PRIOR });
}

test("landAct: an evaluate whose connector reads as a genuine non-verb under the injected grammar lens downgrades holds to undetermined, never ships it", () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner();
  const log = grid.createLog();
  const text =
    "Pierre Bezukhov always spoke softly to Natasha. Pierre Bezukhov always spoke softly to Marya. " +
    "Natasha noticed that Pierre Bezukhov always spoke softly.";
  const classifyConnector = freshConnectorClassifier();
  const out = landAct(
    grid,
    log,
    "evaluate Pierre Bezukhov always spoke softly to Natasha at Link from differentiate ground p.txt broken:rotation",
    { sources: { "p.txt": text }, runCapacity, classifyConnector, minShare: CONNECTOR_MIN_SHARE },
  );
  assert.equal(out.ok, true);
  const { acts } = grid.foldGrid(out.log);
  const landed = acts.find((a) => a.task_id === out.ids[out.ids.length - 1]);
  // Confirm the defect is real BEFORE confirming the fix: the raw material
  // read genuinely binds this claim (bound, not some other verdict) — the
  // connector-class check is what pulls it back, not a coincidence of some
  // other gap.
  assert.equal(landed.result.judged.verdict, "bound", "the claim must genuinely bind for this to be a real regression, not an accident of some other gap");
  assert.equal(landed.result.rawVerdict, "holds");
  assert.equal(landed.result.squaring.trusted, true, "squaring alone does not catch this — the defect this check closes");
  assert.equal(landed.result.connectorCheck.trusted, false);
  assert.equal(landed.result.connectorCheck.thraxClass, "adverb");
  assert.equal(landed.result.connectorCheck.surface, "always");
  // Never shipped: the RESULT's own merged verdict must be neither holds
  // nor refused, exactly the "undetermined" reading foldGrid's DEF/EVA
  // companion match already renders honestly for every other unconvicted
  // case in this file.
  assert.notEqual(landed.verdict, "holds");
  assert.notEqual(landed.verdict, "refused");
});

test("landAct: the SAME real mismatched-connector claim, with classifyConnector OMITTED, still ships holds — every pre-existing caller's behavior is unchanged", () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner();
  const log = grid.createLog();
  const text =
    "Pierre Bezukhov always spoke softly to Natasha. Pierre Bezukhov always spoke softly to Marya. " +
    "Natasha noticed that Pierre Bezukhov always spoke softly.";
  const out = landAct(
    grid,
    log,
    "evaluate Pierre Bezukhov always spoke softly to Natasha at Link from differentiate ground p.txt broken:rotation",
    { sources: { "p.txt": text }, runCapacity }, // no classifyConnector — the default, pre-existing shape
  );
  assert.equal(out.ok, true);
  const { acts } = grid.foldGrid(out.log);
  const landed = acts.find((a) => a.task_id === out.ids[out.ids.length - 1]);
  assert.equal(landed.verdict, "holds", "byte-identical to before this pass: the connector-class check never runs without an injected organ");
  assert.equal(landed.result.connectorCheck.trusted, true);
  assert.equal(landed.result.connectorCheck.skipped, "no classifyConnector organ injected");
});

test("landAct: a genuine verb connector clears the injected grammar lens and still ships holds — the check convicts a real defect, not every edge", () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner();
  const log = grid.createLog();
  const classifyConnector = freshConnectorClassifier();
  const out = landAct(
    grid,
    log,
    "evaluate Natasha noticed that Pierre Bezukhov always spoke softly at Link from differentiate ground p.txt broken:rotation",
    {
      sources: {
        "p.txt":
          "Pierre Bezukhov always spoke softly to Natasha. Pierre Bezukhov always spoke softly to Marya. " +
          "Natasha noticed that Pierre Bezukhov always spoke softly.",
      },
      runCapacity,
      classifyConnector,
      minShare: CONNECTOR_MIN_SHARE,
    },
  );
  assert.equal(out.ok, true);
  const { acts } = grid.foldGrid(out.log);
  const landed = acts.find((a) => a.task_id === out.ids[out.ids.length - 1]);
  assert.equal(landed.verdict, "holds", "\"noticed\" is a genuine verb — the injected lens must not convict a clean edge");
  assert.equal(landed.result.connectorCheck.trusted, true);
});

// ── connectorClass at EXTRACTION TIME (Per-Source Testimony spec, BUILD-3)
// — the same real "always" defect above, this time caught with NOTHING
// passed to landAct directly: relationsFor's own new classifyConnector/
// minShare organs tag the edge before landAct ever sees it, and
// checkConnectorClass reads that tag instead of calling classifyConnector
// itself. Reuses freshConnectorClassifier/CONNECTOR_MIN_SHARE/CONNECTOR_POS_PRIOR,
// all declared above, unchanged — one lens, one declared floor, two call
// shapes proven to agree.

function freshRelationsRunnerWithGrammar(classifyConnector, minShare) {
  const referentIndexFor = makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });
  const relationsFor = makeRelationReader({
    splitSentences,
    extractSurfaces,
    discoverReferents,
    namesCorefer,
    diaNorm,
    discoverRelationVocab,
    extractRelations,
    tokenize,
    classifyConnector,
    minShare,
  });
  return makeCapacityRunner({ referentIndexFor, relationsFor });
}

test("landAct: relationsFor's own classifyConnector organ tags the edge at extraction time, and checkConnectorClass downgrades holds to undetermined from THAT tag alone — nothing passed to landAct directly", () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunnerWithGrammar(freshConnectorClassifier(), CONNECTOR_MIN_SHARE);
  const log = grid.createLog();
  const text =
    "Pierre Bezukhov always spoke softly to Natasha. Pierre Bezukhov always spoke softly to Marya. " +
    "Natasha noticed that Pierre Bezukhov always spoke softly.";
  const out = landAct(
    grid,
    log,
    "evaluate Pierre Bezukhov always spoke softly to Natasha at Link from differentiate ground p.txt broken:rotation",
    { sources: { "p.txt": text }, runCapacity }, // landAct itself gets no classifyConnector/minShare at all
  );
  assert.equal(out.ok, true);
  const { acts } = grid.foldGrid(out.log);
  const landed = acts.find((a) => a.task_id === out.ids[out.ids.length - 1]);
  assert.equal(landed.result.judged.verdict, "bound", "the claim must genuinely bind for this to be a real regression, not an accident of some other gap");
  assert.equal(landed.result.rawVerdict, "holds");
  assert.equal(landed.result.connectorCheck.trusted, false);
  assert.equal(landed.result.connectorCheck.thraxClass, "adverb");
  assert.equal(landed.result.connectorCheck.surface, "always");
  assert.notEqual(landed.verdict, "holds");
  assert.notEqual(landed.verdict, "refused");
});

test("landAct: when the backing edge already carries a connectorClass tag, checkConnectorClass reads it and never calls classifyConnector again — proven with a poison-pill function as landAct's OWN direct parameter", () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunnerWithGrammar(freshConnectorClassifier(), CONNECTOR_MIN_SHARE);
  const log = grid.createLog();
  const text =
    "Pierre Bezukhov always spoke softly to Natasha. Pierre Bezukhov always spoke softly to Marya. " +
    "Natasha noticed that Pierre Bezukhov always spoke softly.";
  const poison = () => {
    throw new Error("classifyConnector must not be called directly once the backing edge already carries a connectorClass tag");
  };
  const out = landAct(
    grid,
    log,
    "evaluate Pierre Bezukhov always spoke softly to Natasha at Link from differentiate ground p.txt broken:rotation",
    { sources: { "p.txt": text }, runCapacity, classifyConnector: poison, minShare: CONNECTOR_MIN_SHARE },
  );
  assert.equal(out.ok, true, "the poison pill must never fire — reaching here at all is the proof");
  const { acts } = grid.foldGrid(out.log);
  const landed = acts.find((a) => a.task_id === out.ids[out.ids.length - 1]);
  assert.equal(landed.result.connectorCheck.trusted, false);
  assert.equal(landed.result.connectorCheck.thraxClass, "adverb");
});

test("landAct: a genuine verb connector, tagged at extraction time, still ships holds — the extraction-time path convicts a real defect, not every edge", () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunnerWithGrammar(freshConnectorClassifier(), CONNECTOR_MIN_SHARE);
  const log = grid.createLog();
  const out = landAct(
    grid,
    log,
    "evaluate Natasha noticed that Pierre Bezukhov always spoke softly at Link from differentiate ground p.txt broken:rotation",
    {
      sources: {
        "p.txt":
          "Pierre Bezukhov always spoke softly to Natasha. Pierre Bezukhov always spoke softly to Marya. " +
          "Natasha noticed that Pierre Bezukhov always spoke softly.",
      },
      runCapacity,
    },
  );
  assert.equal(out.ok, true);
  const { acts } = grid.foldGrid(out.log);
  const landed = acts.find((a) => a.task_id === out.ids[out.ids.length - 1]);
  assert.equal(landed.verdict, "holds", "\"noticed\" is a genuine verb — the extraction-time tag must not convict a clean edge");
  assert.equal(landed.result.connectorCheck.trusted, true);
});

test("landAct: both classifyConnector organs omitted (relationsFor AND landAct) still ships holds — every pre-existing caller's behavior is unchanged", () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner(); // no grammar organ anywhere
  const log = grid.createLog();
  const text =
    "Pierre Bezukhov always spoke softly to Natasha. Pierre Bezukhov always spoke softly to Marya. " +
    "Natasha noticed that Pierre Bezukhov always spoke softly.";
  const out = landAct(
    grid,
    log,
    "evaluate Pierre Bezukhov always spoke softly to Natasha at Link from differentiate ground p.txt broken:rotation",
    { sources: { "p.txt": text }, runCapacity },
  );
  assert.equal(out.ok, true);
  const { acts } = grid.foldGrid(out.log);
  const landed = acts.find((a) => a.task_id === out.ids[out.ids.length - 1]);
  assert.equal(landed.verdict, "holds", "byte-identical to before BUILD-3: no organ anywhere means no check anywhere");
  assert.equal(landed.result.connectorCheck.trusted, true);
  assert.equal(landed.result.connectorCheck.skipped, "no classifyConnector organ injected");
});

// ── landAct + the claim-id spine (Per-Source Testimony spec, BUILD-0) ───────
// End to end against real material and the real hypergraph — proves the ONE
// real caller wired this pass: a claimId minted the way a future
// orchestrator would (await grid.mintClaimId first, necessarily async —
// landAct itself stays synchronous, both real production callers, term.js's
// `act` command and app.js's `actTurn`, call it from a DOM handler), passed
// into landAct, lands on the SAME RESULT attachResult already produced —
// not a second entry, per the design correction in grid.js's own header
// (an earlier `landCell` was built and deleted the same day: every field it
// needed already existed on `land`/`attachResult`).

test("landAct: with a claimId supplied, it threads onto BOTH the initial act and its computed result — the spec's own \"mint at PROPOSE, carry through EVA\" — with every existing field unchanged", async () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner();
  const sources = { lincoln: LINCOLN_TEXT };
  const claimId = await grid.mintClaimId({ subject: "Lincoln", verb: "appointed", object: "Hamlin" });
  const line = "evaluate Lincoln appointed Hamlin at Link from differentiate ground lincoln broken:rotation";

  const without = landAct(grid, grid.createLog(), line, { sources, runCapacity });
  const withId = landAct(grid, grid.createLog(), line, { sources, runCapacity, claimId });
  assert.equal(without.ok, true);
  assert.equal(withId.ok, true);

  const { acts: actsWithout } = grid.foldGrid(without.log);
  const { acts: actsWithId } = grid.foldGrid(withId.log);
  const evaWithout = actsWithout.find((a) => a.task_id === without.ids[without.ids.length - 1]);
  const evaWithId = actsWithId.find((a) => a.task_id === withId.ids[withId.ids.length - 1]);

  // identical verdict either way — supplying a claimId changes nothing about the computation itself
  assert.equal(evaWithId.verdict, evaWithout.verdict);
  assert.deepEqual(evaWithId.result.judged, evaWithout.result.judged);
  // the only difference: claim_id is present when supplied, absent when not
  assert.equal(evaWithout.claim_id, undefined);
  assert.equal(evaWithId.claim_id, claimId);

  const folded = grid.foldClaim(withId.log, claimId);
  assert.equal(folded.cells.length, 2); // the PROPOSE (the attempt, threaded via land()) and the RESULT (the verdict, threaded via attachResult's extra)
  assert.deepEqual(folded.cells.map((c) => c.kind).sort(), ["propose", "result"]);
});

test("landAct: two separate claims about the same subject mint two different claim_ids, and foldClaim never conflates them", async () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner();
  const sources = { lincoln: LINCOLN_TEXT };
  const claimA = await grid.mintClaimId({ subject: "Lincoln", verb: "appointed", object: "Hamlin" });
  const claimB = await grid.mintClaimId({ subject: "Lincoln", verb: "appointed", object: "Johnson" });
  assert.notEqual(claimA, claimB);

  let log = grid.createLog();
  const out1 = landAct(grid, log, "evaluate Lincoln appointed Hamlin at Link from differentiate ground lincoln broken:rotation", {
    sources,
    runCapacity,
    claimId: claimA,
  });
  log = out1.log;
  const out2 = landAct(grid, log, "evaluate Lincoln appointed Johnson at Link from differentiate ground lincoln broken:rotation", {
    sources,
    runCapacity,
    claimId: claimB,
  });
  log = out2.log;

  assert.equal(grid.foldClaim(log, claimA).cells.length, 2); // PROPOSE + RESULT, per claim
  assert.equal(grid.foldClaim(log, claimB).cells.length, 2);
  const taskIdsA = new Set(grid.foldClaim(log, claimA).cells.map((c) => c.task_id));
  const taskIdsB = new Set(grid.foldClaim(log, claimB).cells.map((c) => c.task_id));
  assert.equal([...taskIdsA].some((id) => taskIdsB.has(id)), false, "claim A and claim B must never share a task_id");
});

// ── perSourceReadings (Per-Source Testimony spec, BUILD-1) ──────────────────

const LINCOLN_TEXT_2 = "Lincoln appointed Hamlin. It was Lincoln's first major decision as president.";

test("perSourceReadings: N sources checked against the SAME claim_id return N per-source records — the spec's own BUILD-1 set-down", async () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner();
  const sources = { lincoln: LINCOLN_TEXT, lincoln2: LINCOLN_TEXT_2 };
  const claimId = await grid.mintClaimId({ subject: "Lincoln", verb: "appointed", object: "Hamlin" });

  let log = grid.createLog();
  ({ log } = landAct(grid, log, "evaluate Lincoln appointed Hamlin at Link from differentiate ground lincoln broken:rotation", {
    sources,
    runCapacity,
    claimId,
  }));
  ({ log } = landAct(grid, log, "evaluate Lincoln appointed Hamlin at Link from differentiate ground lincoln2 broken:rotation", {
    sources,
    runCapacity,
    claimId,
  }));

  const readings = perSourceReadings(grid, log, claimId);
  assert.equal(readings.length, 2);
  assert.deepEqual(readings.map((r) => r.who).sort(), ["lincoln", "lincoln2"]);
  for (const r of readings) {
    assert.equal(r.claim_id, claimId);
    assert.equal(r.verdict, "holds");
    assert.equal(r.polarity, "+");
    assert.equal(r.emitted_by, "the-fold:hypergraph.js:judge()");
    assert.ok(Array.isArray(r.read) && r.read.length > 0, "read must name at least one real passage address");
    // the richer {passages, sources} shape, not a collapsed bare int (see capacity-runner.js's own disclosed deviation)
    assert.equal(typeof r.corroboration.passages, "number");
    assert.equal(typeof r.corroboration.sources, "number");
    assert.ok(r.corroboration.sources >= 1);
  }
});

test("perSourceReadings: an undetermined claim still returns a record — silence is never the answer — with corroboration honestly null, not a fake zero", async () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner();
  const sources = { lincoln: LINCOLN_TEXT };
  const claimId = await grid.mintClaimId({ subject: "Lincoln", verb: "appointed", object: "Nobody" });
  let log = grid.createLog();
  ({ log } = landAct(grid, log, "evaluate Lincoln appointed Nobody at Link from differentiate ground lincoln broken:rotation", {
    sources,
    runCapacity,
    claimId,
  }));

  const readings = perSourceReadings(grid, log, claimId);
  assert.equal(readings.length, 1);
  assert.equal(readings[0].verdict, "undetermined");
  assert.equal(readings[0].corroboration, null);
  assert.equal(readings[0].who, "lincoln"); // the source is still named even when the claim doesn't bind
});

test("perSourceReadings: an unknown claim_id returns an empty array, never a throw", () => {
  const grid = freshGrid();
  const log = grid.createLog();
  assert.deepEqual(perSourceReadings(grid, log, "@nothing-landed-here"), []);
});

// ── mergeTestimony (Per-Source Testimony spec, BUILD-2) ─────────────────────
// Every case produced by a REAL testimony set, through the real pipeline —
// not synthesized reading objects. "never" is the proven, engine-recognized
// negation token (see the existing contradicted-claim test above, whose own
// comment records that "did not" was tried first and hits a different,
// disclosed extractor gap — reused rather than re-discovered).

// "Lincoln" must appear OUTSIDE sentence-initial position at least once,
// exactly like LINCOLN_TEXT's own header comment already requires — a
// first cut of this fixture ("Lincoln never appointed Hamlin. Someone
// else got the job.") put Lincoln sentence-initial-only, so it never
// cleared the referent bar and the claim came back undetermined (L2's own
// rule, not a negation-detection failure) — measured live, not guessed.
const LINCOLN_TEXT_NEGATED = "Lincoln never appointed Hamlin. Lincoln appointed Johnson instead. Hamlin visited Lincoln often afterward.";

test("mergeTestimony: AGREE — two sources both hold, standing corroborated", async () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner();
  const sources = { lincoln: LINCOLN_TEXT, lincoln2: LINCOLN_TEXT_2 };
  const claimId = await grid.mintClaimId({ subject: "Lincoln", verb: "appointed", object: "Hamlin" });
  let log = grid.createLog();
  ({ log } = landAct(grid, log, "evaluate Lincoln appointed Hamlin at Link from differentiate ground lincoln broken:rotation", { sources, runCapacity, claimId }));
  ({ log } = landAct(grid, log, "evaluate Lincoln appointed Hamlin at Link from differentiate ground lincoln2 broken:rotation", { sources, runCapacity, claimId }));

  const merged = mergeTestimony(perSourceReadings(grid, log, claimId));
  assert.equal(merged.case, "AGREE");
  assert.equal(merged.verdict, "bound");
  assert.equal(merged.standing, "corroborated");
  assert.equal(merged.holds.length, 2);
  assert.equal(merged.refused.length, 0);
});

test("mergeTestimony: SINGLE — exactly one source holds, standing single", async () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner();
  const sources = { lincoln: LINCOLN_TEXT };
  const claimId = await grid.mintClaimId({ subject: "Lincoln", verb: "appointed", object: "Hamlin" });
  let log = grid.createLog();
  ({ log } = landAct(grid, log, "evaluate Lincoln appointed Hamlin at Link from differentiate ground lincoln broken:rotation", { sources, runCapacity, claimId }));

  const merged = mergeTestimony(perSourceReadings(grid, log, claimId));
  assert.equal(merged.case, "SINGLE");
  assert.equal(merged.verdict, "bound");
  assert.equal(merged.standing, "single");
  assert.equal(merged.holds.length, 1);
});

test("mergeTestimony: DISAGREE (multiply-bound) — fires on a REAL opposed-polarity pair across two sources, mouth forbidden to resolve it", async () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner();
  const sources = { lincoln: LINCOLN_TEXT, lincolnNeg: LINCOLN_TEXT_NEGATED };
  const claimId = await grid.mintClaimId({ subject: "Lincoln", verb: "appointed", object: "Hamlin" });
  let log = grid.createLog();
  ({ log } = landAct(grid, log, "evaluate Lincoln appointed Hamlin at Link from differentiate ground lincoln broken:rotation", { sources, runCapacity, claimId }));
  ({ log } = landAct(grid, log, "evaluate Lincoln appointed Hamlin at Link from differentiate ground lincolnNeg broken:rotation", { sources, runCapacity, claimId }));

  const readings = perSourceReadings(grid, log, claimId);
  assert.deepEqual(readings.map((r) => r.verdict).sort(), ["holds", "refused"]); // confirm the real pair before merging

  const merged = mergeTestimony(readings);
  assert.equal(merged.case, "DISAGREE");
  assert.equal(merged.verdict, "multiply-bound");
  assert.equal(merged.standing, null);
  assert.equal(merged.holds.length, 1);
  assert.equal(merged.refused.length, 1);
});

test("mergeTestimony: CONTRADICTED — the disclosed fifth case, unanimous refusal, never named in the spec's own four", async () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner();
  const sources = { lincolnNeg: LINCOLN_TEXT_NEGATED };
  const claimId = await grid.mintClaimId({ subject: "Lincoln", verb: "appointed", object: "Hamlin" });
  let log = grid.createLog();
  ({ log } = landAct(grid, log, "evaluate Lincoln appointed Hamlin at Link from differentiate ground lincolnNeg broken:rotation", { sources, runCapacity, claimId }));

  const merged = mergeTestimony(perSourceReadings(grid, log, claimId));
  assert.equal(merged.case, "CONTRADICTED");
  assert.equal(merged.verdict, "contradicted");
  assert.equal(merged.standing, "single");
  assert.equal(merged.refused.length, 1);
  assert.equal(merged.holds.length, 0);
});

test("mergeTestimony: UNDETERMINED — no source holds or refuses, escalation-worthy", async () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner();
  const sources = { lincoln: LINCOLN_TEXT };
  const claimId = await grid.mintClaimId({ subject: "Lincoln", verb: "appointed", object: "Nobody" });
  let log = grid.createLog();
  ({ log } = landAct(grid, log, "evaluate Lincoln appointed Nobody at Link from differentiate ground lincoln broken:rotation", { sources, runCapacity, claimId }));

  const merged = mergeTestimony(perSourceReadings(grid, log, claimId));
  assert.equal(merged.case, "UNDETERMINED");
  assert.equal(merged.verdict, "unbound");
  assert.equal(merged.holds.length, 0);
  assert.equal(merged.refused.length, 0);
});

test("mergeTestimony: an empty reading set (nothing checked yet) is UNDETERMINED, never a throw", () => {
  assert.equal(mergeTestimony([]).case, "UNDETERMINED");
});

// ── mergeTestimony: self-witness discipline (BUILD-4, direct user
// instruction — see mergeTestimony's own AMENDED doc comment for the full
// account) — a self-witness ("self:model", the model's own bare,
// unwitnessed assertion) is TESTIMONY, not a special ungrounded exception,
// and flows through this SAME function; it just never co-signs AGREE's
// corroboration count alone. No real pipeline in this repo produces a
// self:model reading today (perSourceReadings only ever projects a
// judge()-computed RESULT cell, inherently material-grounded), so these
// are hand-built, realistically-shaped reading objects — the identical
// precedent this file's own "squarePolarity (via a mocked runCapacity)"
// test above already sets for unit-testing a real, reachable branch the
// live pipeline can't yet drive end to end.

function selfModelReading({ verdict, subject = "Lincoln", verb = "appointed", object = "Hamlin" }) {
  return {
    claim_id: "@self-witness-fixture",
    who: SELF_WITNESS,
    read: [],
    revision: null,
    verdict,
    polarity: verdict === "holds" ? "+" : verdict === "refused" ? "-" : null,
    edges: verdict === "holds" || verdict === "refused" ? [{ subject, verb, object, refs: [] }] : [],
    grammar: [],
    corroboration: verdict === "undetermined" ? null : { passages: 0, sources: 0 },
    emitted_by: "the-fold:app.js:selfAssertion",
  };
}

function realHoldReading(who) {
  return {
    claim_id: "@self-witness-fixture",
    who,
    read: ["fake.txt#0-10"],
    revision: null,
    verdict: "holds",
    polarity: "+",
    edges: [{ subject: "Lincoln", verb: "appointed", object: "Hamlin", refs: ["fake.txt#0-10"] }],
    grammar: [],
    corroboration: { passages: 1, sources: 1 },
    emitted_by: "the-fold:hypergraph.js:judge()",
  };
}

test("isSelfWitness: true only for the declared self:model marker, never for a real source name", () => {
  assert.equal(isSelfWitness({ who: SELF_WITNESS }), true);
  assert.equal(isSelfWitness({ who: "lincoln.txt" }), false);
  assert.equal(isSelfWitness({ who: "self:ledger" }), false, "the self-plane's OWN reserved name (reflex.js) is a different thing and must not match");
  assert.equal(isSelfWitness({}), false);
  assert.equal(isSelfWitness(null), false);
});

test("mergeTestimony: a self-witness never co-signs AGREE alone — one real hold + one self:model hold is SINGLE, both disclosed on the merge object", () => {
  const merged = mergeTestimony([realHoldReading("lincoln.txt"), selfModelReading({ verdict: "holds" })]);
  assert.equal(merged.case, "SINGLE", "not AGREE — a self-witness supplies no independent corroboration");
  assert.equal(merged.standing, "single");
  assert.equal(merged.holds.length, 2, "both readings stay on the merge object — disclosed, never dropped");
  assert.ok(merged.holds.some((r) => r.who === SELF_WITNESS));
  assert.ok(merged.holds.some((r) => r.who === "lincoln.txt"));
});

test("mergeTestimony: TWO self:model holds with ZERO real holds does not manufacture AGREE — copies of the same non-independent witness are not corroboration", () => {
  const merged = mergeTestimony([selfModelReading({ verdict: "holds" }), selfModelReading({ verdict: "holds" })]);
  assert.equal(merged.case, "SINGLE");
  assert.equal(merged.standing, "single");
  assert.equal(merged.holds.length, 2, "both still disclosed, not discarded");
});

test("mergeTestimony: TWO real holds plus a self:model hold still reaches AGREE — the self-witness rides along without blocking a genuine corroboration", () => {
  const merged = mergeTestimony([realHoldReading("a.txt"), realHoldReading("b.txt"), selfModelReading({ verdict: "holds" })]);
  assert.equal(merged.case, "AGREE");
  assert.equal(merged.standing, "corroborated");
  assert.equal(merged.holds.length, 3, "the self-witness is disclosed alongside the two real ones, not filtered out of the array");
});

test("mergeTestimony: DISAGREE's own condition is untouched by the self-witness amendment — a self:model hold genuinely opposed by a real refusal is still DISAGREE, never silently resolved toward CONTRADICTED", () => {
  const merged = mergeTestimony([selfModelReading({ verdict: "holds" }), { ...realHoldReading("lincolnNeg.txt"), verdict: "refused", polarity: "-" }]);
  assert.equal(merged.case, "DISAGREE", "mergeTestimony never adjudicates which witness to trust — that judgment call is exactly what this ladder exists to avoid making by hand");
  assert.equal(merged.holds.length, 1);
  assert.equal(merged.refused.length, 1);
});

test("mergeTestimony: with no self-witness present anywhere, every case boundary is byte-identical to before this amendment (real material, real pipeline)", async () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner();
  const sources = { lincoln: LINCOLN_TEXT, lincoln2: LINCOLN_TEXT_2 };
  const claimId = await grid.mintClaimId({ subject: "Lincoln", verb: "appointed", object: "Hamlin" });
  let log = grid.createLog();
  ({ log } = landAct(grid, log, "evaluate Lincoln appointed Hamlin at Link from differentiate ground lincoln broken:rotation", { sources, runCapacity, claimId }));
  ({ log } = landAct(grid, log, "evaluate Lincoln appointed Hamlin at Link from differentiate ground lincoln2 broken:rotation", { sources, runCapacity, claimId }));
  const merged = mergeTestimony(perSourceReadings(grid, log, claimId));
  assert.equal(merged.case, "AGREE");
  assert.equal(merged.standing, "corroborated");
  assert.equal(merged.holds.length, 2);
});

// ── landSelfAssertion: the real construction (BUILD-4's own named gap,
// closed) — proves perSourceReadings/mergeTestimony are reachable for a
// self:model reading with NO hand-built object anywhere in the chain.
// `selfModelReading()`, above, stays as-is: these tests check the REAL
// function's output AGAINST that fixture's own shape, field by field,
// rather than replacing it — the fixture is still what crown.test.mjs's
// own hand-built readings mirror, and this is the proof the two shapes
// actually agree.

function assertMatchesFixtureShape(real, fixture) {
  assert.equal(real.who, fixture.who);
  assert.deepEqual(real.read, fixture.read);
  assert.equal(real.revision, fixture.revision);
  assert.equal(real.verdict, fixture.verdict);
  assert.equal(real.polarity, fixture.polarity);
  assert.deepEqual(real.edges, fixture.edges);
  assert.deepEqual(real.grammar, fixture.grammar);
  assert.deepEqual(real.corroboration, fixture.corroboration);
  assert.equal(real.emitted_by, fixture.emitted_by);
}

test("landSelfAssertion: a real \"holds\" landing projects through perSourceReadings into exactly this file's own selfModelReading() fixture shape, field for field", async () => {
  const grid = freshGrid();
  const claimId = await grid.mintClaimId({ subject: "Lincoln", verb: "appointed", object: "Hamlin" });
  const log = grid.createLog();
  const landed = landSelfAssertion(grid, log, { subject: "Lincoln", verb: "appointed", object: "Hamlin", verdict: "holds", claimId });
  assert.equal(landed.ok, true);
  const readings = perSourceReadings(grid, landed.log, claimId);
  assert.equal(readings.length, 1, "one RESULT cell, one testimony — no extra or missing cells");
  assert.equal(readings[0].claim_id, claimId, "the REAL minted id, not the fixture's hardcoded placeholder");
  assertMatchesFixtureShape(readings[0], selfModelReading({ verdict: "holds" }));
});

test("landSelfAssertion: \"refused\" carries negative polarity and a refused edge through, same fixture agreement", async () => {
  const grid = freshGrid();
  const claimId = await grid.mintClaimId({ subject: "Lincoln", verb: "appointed", object: "Hamlin" });
  const log = grid.createLog();
  const landed = landSelfAssertion(grid, log, { subject: "Lincoln", verb: "appointed", object: "Hamlin", verdict: "refused", claimId });
  assert.equal(landed.ok, true);
  const readings = perSourceReadings(grid, landed.log, claimId);
  assertMatchesFixtureShape(readings[0], selfModelReading({ verdict: "refused" }));
});

test("landSelfAssertion: \"undetermined\" carries no edge, no polarity, no corroboration — same fixture agreement", async () => {
  const grid = freshGrid();
  const claimId = await grid.mintClaimId({ subject: "Lincoln", verb: "appointed", object: "Hamlin" });
  const log = grid.createLog();
  const landed = landSelfAssertion(grid, log, { subject: "Lincoln", verb: "appointed", object: "Hamlin", verdict: "undetermined", claimId });
  assert.equal(landed.ok, true);
  const readings = perSourceReadings(grid, landed.log, claimId);
  assertMatchesFixtureShape(readings[0], selfModelReading({ verdict: "undetermined" }));
});

test("landSelfAssertion: an incomplete claim (subject, verb, or object missing) is a typed no_claim refusal, never a silent no-op", async () => {
  const grid = freshGrid();
  const claimId = await grid.mintClaimId({ subject: "Lincoln", verb: "appointed", object: "Hamlin" });
  const log = grid.createLog();
  const out = landSelfAssertion(grid, log, { subject: "Lincoln", verb: "", object: "Hamlin", verdict: "holds", claimId });
  assert.equal(out.ok, false);
  assert.equal(out.refusal.type, "no_claim");
});

test("landSelfAssertion: an unrecognized verdict is a typed unknown_verdict refusal, naming what was stated", async () => {
  const grid = freshGrid();
  const claimId = await grid.mintClaimId({ subject: "Lincoln", verb: "appointed", object: "Hamlin" });
  const log = grid.createLog();
  const out = landSelfAssertion(grid, log, { subject: "Lincoln", verb: "appointed", object: "Hamlin", verdict: "maybe", claimId });
  assert.equal(out.ok, false);
  assert.equal(out.refusal.type, "unknown_verdict");
  assert.equal(out.refusal.stated, "maybe");
});

test("landSelfAssertion: no claimId is a typed no_claim_id refusal — a self-assertion nothing downstream could ever find is refused, not landed silently", () => {
  const grid = freshGrid();
  const log = grid.createLog();
  const out = landSelfAssertion(grid, log, { subject: "Lincoln", verb: "appointed", object: "Hamlin", verdict: "holds" });
  assert.equal(out.ok, false);
  assert.equal(out.refusal.type, "no_claim_id");
});

test("landSelfAssertion + mergeTestimony, end to end on one real log: a real material hold plus a REAL landed self:model hold is SINGLE, not AGREE — reachable live, not only through the hand-built fixture", async () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner();
  const sources = { lincoln: LINCOLN_TEXT };
  const claimId = await grid.mintClaimId({ subject: "Lincoln", verb: "appointed", object: "Hamlin" });
  let log = grid.createLog();
  ({ log } = landAct(grid, log, "evaluate Lincoln appointed Hamlin at Link from differentiate ground lincoln broken:rotation", { sources, runCapacity, claimId }));
  const landed = landSelfAssertion(grid, log, { subject: "Lincoln", verb: "appointed", object: "Hamlin", verdict: "holds", claimId });
  assert.equal(landed.ok, true);
  const merged = mergeTestimony(perSourceReadings(grid, landed.log, claimId));
  assert.equal(merged.case, "SINGLE", "not AGREE — a self-witness supplies no independent corroboration, exactly as mergeTestimony's own AMENDED doc comment says");
  assert.equal(merged.standing, "single");
  assert.equal(merged.holds.length, 2);
  assert.ok(merged.holds.some((r) => r.who === SELF_WITNESS));
  assert.ok(merged.holds.some((r) => r.who === "lincoln"));
});

test("landSelfAssertion: landing under one claim_id does not disturb a DIFFERENT claim_id already on the same shared log", async () => {
  const grid = freshGrid();
  const runCapacity = freshRelationsRunner();
  const sources = { lincoln: LINCOLN_TEXT };
  const realClaimId = await grid.mintClaimId({ subject: "Lincoln", verb: "appointed", object: "Hamlin" });
  const selfClaimId = await grid.mintClaimId({ subject: "Seward", verb: "opposed", object: "emancipation" });
  let log = grid.createLog();
  ({ log } = landAct(grid, log, "evaluate Lincoln appointed Hamlin at Link from differentiate ground lincoln broken:rotation", { sources, runCapacity, claimId: realClaimId }));
  const landed = landSelfAssertion(grid, log, { subject: "Seward", verb: "opposed", object: "emancipation", verdict: "holds", claimId: selfClaimId });
  assert.equal(landed.ok, true);
  const realReadings = perSourceReadings(grid, landed.log, realClaimId);
  const selfReadings = perSourceReadings(grid, landed.log, selfClaimId);
  assert.equal(realReadings.length, 1);
  assert.equal(realReadings[0].who, "lincoln");
  assert.equal(selfReadings.length, 1);
  assert.equal(selfReadings[0].who, SELF_WITNESS);
});
