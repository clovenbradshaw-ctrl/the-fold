// capacity-runner.test.mjs — `cast` executed for real, against the REAL
// engine perceiver organs (the same relative-path pattern grid.test.mjs
// and build-log.test.mjs already use). No stubs, no canned referents.

import { test } from "node:test";
import assert from "node:assert/strict";

import { splitSentences } from "../eoreader6.1/packages/engine/perceiver/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "../eoreader6.1/packages/engine/perceiver/text/surfaces.js";
import { makeReferentIndex } from "./cast.js";
import { makeCapacityRunner } from "./capacity-runner.js";

function freshRunner() {
  const referentIndexFor = makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });
  return makeCapacityRunner({ referentIndexFor });
}

test("runCapacity: any id other than \"cast\" is a typed, disclosed gap — never a silent no-op", () => {
  const runCapacity = freshRunner();
  const out = runCapacity("relations", { text: "whatever" });
  assert.equal(out.gap, "not_yet_executable");
  assert.equal(out.id, "relations");
  assert.match(out.detail, /not yet wired/);
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
