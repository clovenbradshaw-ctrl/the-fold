import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { harvestDescriptions, halfVectors, descriptionStanding } from "./description-standing.js";
import { contextVectors, cosine } from "./kind-standing.js";

const ALPHA = 0.05;          // declared once for every case; never defaulted in the module
const MIN_OCCURRENCES = 5;   // declared by the caller, per P4
const sent = (t, i) => ({ text: t, order: i });
const corpus = (lines) => lines.map(sent);
const NOUNS = new Set(["door", "room", "window", "house", "cat", "ship", "lamp"]);
const isNounHead = (w) => NOUNS.has(w);
const DET = new Set(["the", "this", "that"]);

test("the injected organs are required — never a silent default (P3)", () => {
  assert.throws(() => harvestDescriptions([], { definiteDeterminers: DET, minOccurrences: 2 }), /injected organs/);
  assert.throws(() => harvestDescriptions([], { definiteDeterminers: DET, isNounHead }), /declared by the caller/);
  assert.throws(
    () => descriptionStanding("the door", corpus(["the door"]), [], { contextVectors, cosine }),
    /alpha must be declared/,
  );
});

test("the head must be a NOUN — a complementizer + pronoun is not a description of anything", () => {
  const lines = Array.from({ length: 6 }, () => "He said that he opened the door quietly.");
  const got = harvestDescriptions(corpus(lines), { definiteDeterminers: DET, isNounHead, minOccurrences: 2 });
  assert.ok(got.has("the door"), `expected "the door", got ${[...got.keys()]}`);
  assert.equal([...got.keys()].some((k) => /\bhe$/.test(k)), false, `pronoun-headed phrase admitted: ${[...got.keys()]}`);
});

test("a description below the declared floor is not harvested at all", () => {
  const lines = ["The door was shut.", "A cat sat by the lamp.", "The room was cold."];
  const got = harvestDescriptions(corpus(lines), { definiteDeterminers: DET, isNounHead, minOccurrences: MIN_OCCURRENCES });
  assert.equal(got.size, 0, `nothing occurs ${MIN_OCCURRENCES}x here, got ${[...got.keys()]}`);
});

test("too few mentions in a half is UNKNOWN, never 'not a referent'", () => {
  const lines = [...Array.from({ length: 8 }, () => "The door was shut again."), ...Array.from({ length: 8 }, () => "A cat sat still.")];
  const r = descriptionStanding("the door", corpus(lines), ["the cat"], { contextVectors, cosine, alpha: ALPHA });
  assert.equal(r.verdict, "unknown");
  assert.equal(r.reason, "too_few_mentions", "all mentions sit in the first half — the reader cannot measure consistency");
});

test("no population to compare against is UNKNOWN — absence of a null is not a verdict", () => {
  const lines = Array.from({ length: 12 }, (_, i) => (i % 2 ? "He opened the door slowly." : "She shut the door again."));
  const r = descriptionStanding("the door", corpus(lines), [], { contextVectors, cosine, alpha: ALPHA });
  assert.equal(r.verdict, "unknown");
  assert.equal(r.reason, "no_population");
});

// ── against the real book, real organs, no fixtures ─────────────────────
const LP = "/Users/mlacy/Documents/3.0/live_priors";
const BOOK = `${LP}/01-literature-books/gutenberg/pg345_Dracula.txt`;
const haveBook = fs.existsSync(BOOK);

async function realSetup() {
  const { loadOrgans } = await import(`${LP}/scripts/eot-digest.mjs`);
  const organs = await loadOrgans();
  const { stripContainer, stripItalicsMarkup } = await import("./source.js");
  const body = stripItalicsMarkup(stripContainer(fs.readFileSync(BOOK, "utf8")).text);
  const sentences = organs.spans.splitSentences(body);
  const nounHead = (w) => {
    const c = organs.classifyConnector?.({ verb: w }, { minShare: 0.5 });
    return Boolean(c?.found && c.thraxClass === "noun");
  };
  return { organs, sentences, nounHead };
}

test("THE REAL HARVEST: real descriptions, and the POS gate keeps non-nominals out", { skip: !haveBook }, async () => {
  const { organs, sentences, nounHead } = await realSetup();
  const got = harvestDescriptions(sentences, {
    definiteDeterminers: organs.priors.DEFINITE_DETERMINERS,
    isNounHead: nounHead,
    minOccurrences: MIN_OCCURRENCES,
  });
  const keys = [...got.keys()];
  assert.ok(got.has("the door"), `expected "the door" among ${keys.length} descriptions`);
  assert.ok(got.has("the room"), "expected \"the room\"");
  // the contaminants the gate exists to exclude
  for (const bad of ["that he", "that we", "that it", "the same", "the first"]) {
    assert.equal(got.has(bad), false, `POS gate let "${bad}" through`);
  }
});

test("THE SPECIMEN: a recurring description earns referent standing on the material's own consistency", { skip: !haveBook }, async () => {
  const { organs, sentences, nounHead } = await realSetup();
  const got = harvestDescriptions(sentences, {
    definiteDeterminers: organs.priors.DEFINITE_DETERMINERS,
    isNounHead: nounHead,
    minOccurrences: MIN_OCCURRENCES,
  });
  const population = [...got.keys()].slice(0, 40);
  const r = descriptionStanding("the door", sentences, population, { contextVectors, cosine, alpha: ALPHA });
  assert.equal(r.verdict, "referent", `"the door" p=${r.p} self=${r.selfConsistency}`);
  assert.ok(r.selfConsistency > 0, "a real self-consistency was measured");
});

test("CONTROL, built to fail: the verdict must NOT be unanimous — some descriptions are refused", { skip: !haveBook }, async () => {
  const { organs, sentences, nounHead } = await realSetup();
  const got = harvestDescriptions(sentences, {
    definiteDeterminers: organs.priors.DEFINITE_DETERMINERS,
    isNounHead: nounHead,
    minOccurrences: MIN_OCCURRENCES,
  });
  const population = [...got.keys()].slice(0, 40);
  const verdicts = population.slice(0, 25).map((t) => descriptionStanding(t, sentences, population, { contextVectors, cosine, alpha: ALPHA }).verdict);
  const referents = verdicts.filter((v) => v === "referent").length;
  // A test that admits everything has measured nothing — this is the control
  // this module ships with, per eo-constitution II.23.
  assert.ok(referents > 0, "nothing earned standing — the mechanism is inert");
  assert.ok(referents < verdicts.length, `EVERY description earned standing (${referents}/${verdicts.length}) — the statistic cannot resolve the question`);
});
