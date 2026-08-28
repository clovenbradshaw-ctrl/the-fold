// pass-delta.test.mjs — what the checking changed, against the REAL name
// organ cite.js uses in production. No stub: a delta computed over a
// hand-written name-finder would be measuring this test's own regex, not
// the thing that actually runs.

import { test } from "node:test";
import assert from "node:assert/strict";

import { passDelta, deltaLine } from "./pass-delta.js";
import { splitSentences } from "./cite.js";
import { extractSurfaces } from "../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js";

// The organ bundle app.js composes in production: the engine's real surface
// reader over the real sentence splitter. Not a stub — a delta computed over
// a hand-written name-finder would measure this test's own regex.
const surfacesOf = (t) =>
  extractSurfaces(splitSentences(t).map((text, index) => ({ text, start: 0, index }))).map((s) => s.surface).filter(Boolean);

const delta = (a, b) => passDelta(a, b, { surfacesOf });

test("confirmed — the instant answer survived contact with the material", () => {
  // The boring outcome, and the one worth recording precisely because it is
  // boring: a run of these is the only evidence this instrument produces
  // that a cheaper path exists for a class of question.
  const d = delta("The capital of France is Paris.", "Paris is the capital of France.");
  assert.equal(d.verdict, "confirmed");
  assert.deepEqual(d.added, []);
  assert.deepEqual(d.dropped, []);
  assert.ok(d.kept.includes("paris"));
});

test("extended — the Lincoln shape: S1 names one, the material adds the other", () => {
  const d = delta(
    "Abraham Lincoln's vice president was Hannibal Hamlin.",
    "Abraham Lincoln had two vice presidents: Hannibal Hamlin and Andrew Johnson.",
  );
  assert.equal(d.verdict, "extended");
  assert.ok(d.added.some((n) => n.includes("johnson")), `expected Johnson in ${JSON.stringify(d.added)}`);
  assert.deepEqual(d.dropped, []);
});

test("corrected — S1 asserted a name the checked answer does not carry", () => {
  const d = delta("The mayor in 2019 was David Briley.", "The material does not name a mayor for that year.");
  assert.equal(d.verdict, "corrected");
  assert.ok(d.dropped.some((n) => n.includes("briley")));
});

test("diverged — both dropped and added is its own fact, never a stronger 'corrected'", () => {
  const d = delta("The mayor was David Briley.", "The mayor was John Cooper.");
  assert.equal(d.verdict, "diverged");
  assert.ok(d.dropped.length && d.added.length);
});

test("no delta against an absent pass — that is not 'confirmed', it is not a measurement", () => {
  assert.equal(delta("", "Paris is the capital."), null);
  assert.equal(delta("Paris is the capital.", ""), null);
  assert.equal(delta(null, null), null);
});

test("pronouns and articles are not names — they would make every turn look changed", () => {
  const d = delta("It is Paris.", "The answer is Paris.");
  assert.equal(d.verdict, "confirmed", `pronoun/article noise leaked: ${JSON.stringify(d)}`);
});

test("the string-comparison limit is DISCLOSED on the result, never left for a reader to assume", () => {
  const d = delta("The office went to Hamlin.", "The office went to Hannibal Hamlin.");
  assert.match(d.foldedBy, /not a referent index/);
  // The limit's real shape, pinned so it stays visible rather than quietly
  // becoming a silent wrong answer: a FULLER FORM of the same being reads as
  // an addition, because nothing here resolves "Hamlin" and "Hannibal
  // Hamlin" to one referent. The shared token is correctly kept, so this is
  // "extended" rather than the far worse "diverged" — but a reader should
  // know that "extended" here means "named more fully", not "named someone
  // new". A real referent index (cast.js::makeReferentIndex) is the honest
  // upgrade; it needs material to build an index FROM, which a delta between
  // two answers does not have on its own.
  assert.equal(d.verdict, "extended");
  assert.ok(d.kept.includes("hamlin"), "the shared surface is correctly held, not double-counted as change");
  assert.ok(d.added.some((n) => n.includes("hannibal")));
});

test("the module owns no name organ of its own", () => {
  assert.throws(() => passDelta("a", "b"), TypeError);
  assert.throws(() => passDelta("a", "b", { surfacesOf: null }), TypeError);
});

test("deltaLine says what changed and nothing about who was right", () => {
  assert.match(deltaLine(delta("Paris.", "Paris.")), /confirmed/);
  assert.match(
    deltaLine(delta("Lincoln's vice president was Hannibal Hamlin.", "Hannibal Hamlin and Andrew Johnson served.")),
    /added/,
  );
  assert.equal(deltaLine(null), null);
  // "wrong", "error", "mistake" are verdicts on a PASS, which this module
  // deliberately does not issue — S2 can be narrower than S1 for good
  // reasons, and a delta measures change, not correctness.
  for (const t of [delta("A. Briley.", "B. Cooper."), delta("Paris.", "Paris.")]) {
    assert.doesNotMatch(deltaLine(t), /wrong|error|mistake|incorrect/i);
  }
});
