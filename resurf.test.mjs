// resurf.test.mjs — the re-surf loop's pure half, against the real tokenize
// and real chunkSource chunks. The load-bearing case is the wall: a query
// can never carry a word the question itself does not contain, whatever a
// caller hands in — the P23 lesson (a model's invented sentence polluted a
// search) enforced as a filter, not a convention.

import { test } from "node:test";
import assert from "node:assert/strict";

import { RESURF_MAX_ROUNDS, questionTerms, resurfQuery, uncoveredTerms } from "./resurf.js";
import { PREFLIGHT_QUERY_MAX_TERMS } from "./proof.js";
import { chunkSource } from "./source.js";

const MATERIAL = [
  "Nashville sits on the Cumberland River, in the state of Tennessee.",
  "The harbor report gave the spring figure as 12%, revised after the audit.",
].join("\n\n");
const chunks = chunkSource("notes.txt", MATERIAL);

test("uncoveredTerms finds the question's words the material lacks — and only those", () => {
  const missing = uncoveredTerms("What river is Nashville on, and who was its mayor in 2019?", chunks);
  // "river" and "nashville" are in the material; "mayor" and "2019" are not.
  assert.ok(missing.includes("mayor"));
  assert.ok(missing.includes("2019"));
  assert.ok(!missing.includes("river"));
  assert.ok(!missing.includes("nashville"));
  // Stopwords and short words never surface as uncovered — tokenize already
  // dropped them, so they cannot trigger a crossing.
  assert.ok(!missing.includes("was"));
  assert.ok(!missing.includes("on"));
});

test("uncoveredTerms folds both sides — an accented question word is covered by its plain spelling", () => {
  const c = chunkSource("wp.txt", "Natasha danced at the ball while Pierre watched from the doorway.");
  // The question spells it Natásha; the material spells it Natasha. One fold
  // on both sides (P11) — this is the diacritics lesson applied to re-surf.
  assert.deepEqual(uncoveredTerms("What did Natásha do?", c), []);
});

test("uncoveredTerms with no material is the whole question — and with no question is nothing", () => {
  const all = uncoveredTerms("Who commanded at Borodino?", []);
  assert.ok(all.includes("commanded"));
  assert.ok(all.includes("borodino"));
  assert.deepEqual(uncoveredTerms("", chunks), []);
  assert.deepEqual(uncoveredTerms("the of and", chunks), []);
});

test("resurfQuery round 1 leads with the missing words and keeps the question's context", () => {
  const q = resurfQuery("Who was the mayor of Nashville in 2019?", ["mayor", "2019"], 1);
  const words = q.split(" ");
  assert.equal(words[0], "mayor");
  assert.equal(words[1], "2019");
  assert.ok(words.includes("nashville"));
});

test("resurfQuery round 2 is the missing words alone — a different cast, never a repeat", () => {
  const question = "Who was the mayor of Nashville in 2019?";
  const r1 = resurfQuery(question, ["mayor"], 1);
  const r2 = resurfQuery(question, ["mayor"], 2);
  assert.equal(r2, "mayor");
  assert.notEqual(r1, r2);
});

test("THE WALL: a term the question does not contain never enters a query, whatever the caller offers", () => {
  // A caller hands tokens from a model-drafted finding — "briley" and
  // "sunny" are the model's words, not the asker's. They must be dropped.
  const q = resurfQuery("Who was the mayor of Nashville in 2019?", ["briley", "sunny", "mayor"], 1);
  assert.ok(!q.includes("briley"));
  assert.ok(!q.includes("sunny"));
  assert.ok(q.startsWith("mayor"));
  // Even when EVERYTHING offered is foreign, the query stands on the
  // question's own words rather than the pollution.
  const q2 = resurfQuery("Who was the mayor of Nashville in 2019?", ["briley", "cooper"], 2);
  assert.ok(!q2.includes("briley") && !q2.includes("cooper"));
  assert.ok(q2.includes("mayor"));
});

test("resurfQuery respects the declared cap and degrades to nothing on an empty question", () => {
  const long = Array.from({ length: 40 }, (_, i) => `word${i}alpha`).join(" ");
  const q = resurfQuery(long, [], 1);
  assert.ok(q.split(" ").length <= PREFLIGHT_QUERY_MAX_TERMS);
  assert.equal(resurfQuery("", ["mayor"], 1), "");
});

test("the round budget is declared, small, and at least allows the two differently-shaped casts", () => {
  assert.equal(typeof RESURF_MAX_ROUNDS, "number");
  assert.equal(RESURF_MAX_ROUNDS, 2);
});

test("questionTerms is retrieval's own vocabulary — deduped, in question order", () => {
  assert.deepEqual(questionTerms("Mayor mayor MAYOR of Nashville"), ["mayor", "nashville"]);
});
