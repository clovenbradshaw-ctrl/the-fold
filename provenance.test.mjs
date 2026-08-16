// provenance.test.mjs — every sentence stands on a named ground, and the
// classification is read off the checks the turn already ran, never measured
// fresh. The real organs feed it: attribute() for the per-sentence verdicts,
// checkGrounding() for the atom findings.

import { test } from "node:test";
import assert from "node:assert/strict";

import { classifySentences } from "./provenance.js";
import { chunkSource } from "./source.js";
import { attribute } from "./cite.js";
import { checkGrounding } from "./grounding.js";

const TEXT =
  "The Kessington report put the harbor figure at 12% for the spring quarter.\n\n" +
  "Dredging of the shipping channel runs through March under the port authority schedule.";
const chunks = chunkSource("notes.txt", TEXT);

test("sentences are classified onto material or model ground, with claims striped", () => {
  const answer =
    "The Kessington report put the harbor figure at 12% for the spring quarter. " +
    "That seems like a sensible revision overall. " +
    "The Marlborough audit said the figure was 47%.";
  const attributions = attribute(answer, chunks, chunks);
  const grounding = checkGrounding(answer, chunks, { question: "harbor figure?" });
  const classified = classifySentences(answer, attributions, grounding.findings);

  assert.equal(classified.length, 3);

  // Sentence 1: verbatim from the material — attribution attached an address.
  assert.equal(classified[0].ground, "material");
  assert.equal(classified[0].ref, chunks[0].ref);
  assert.deepEqual(classified[0].absent, []);

  // Sentence 2: the model's own voice, no claims — model ground, no stripe.
  assert.equal(classified[1].ground, "model");
  assert.equal(classified[1].ref, null);
  assert.deepEqual(classified[1].absent, []);

  // Sentence 3: model ground AND claims of fact the material does not hold —
  // the invented auditor and the invented figure are both on the stripe.
  assert.equal(classified[2].ground, "model");
  assert.ok(classified[2].absent.some((t) => /Marlborough/i.test(t)));
  assert.ok(classified[2].absent.some((t) => t.includes("47")));
});

test("a model-cited sentence is material ground even before attribution", () => {
  const answer = `Dredging runs through March. [${chunks[1].ref}]`;
  const attributions = attribute(answer, chunks, chunks);
  const classified = classifySentences(answer, attributions, []);
  assert.equal(classified[0].ground, "material");
});

test("a cited sentence can still carry an absent claim — the stripe is orthogonal to the ground", () => {
  const answer = `The report gave the figure as 47% for the spring quarter. [${chunks[0].ref}]`;
  const grounding = checkGrounding(answer, chunks, { question: "" });
  const attributions = attribute(answer, chunks, chunks);
  const classified = classifySentences(answer, attributions, grounding.findings);
  assert.equal(classified[0].ground, "material", "it cited an offered address");
  assert.ok(classified[0].absent.some((t) => t.includes("47")), "and drifted from it — both facts shown");
});
