// capacity-runner.test.mjs — `cast` executed for real, against the REAL
// engine perceiver organs (the same relative-path pattern grid.test.mjs
// and build-log.test.mjs already use). No stubs, no canned referents.

import { test } from "node:test";
import assert from "node:assert/strict";

import * as operators from "../eoreader6.1/packages/engine/operators.js";
import * as taskLog from "../eoreader6.1/packages/engine/holon/task-log.js";
import { splitSentences } from "../eoreader6.1/packages/engine/perceiver/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "../eoreader6.1/packages/engine/perceiver/text/surfaces.js";
import { discoverRelationVocab, extractRelations } from "../eoreader6.1/packages/engine/perceiver/text/relations.js";
import { tokenize } from "../eoreader6.1/packages/engine/perceiver/text/material.js";
import { makeReferentIndex } from "./cast.js";
import { makeRelationReader } from "./hypergraph.js";
import { makeCapacityRunner, landAct } from "./capacity-runner.js";
import { makeGrid } from "./grid.js";
import { findCapacity, unresolvedCapacity } from "./capacities.js";

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
