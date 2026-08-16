// node --test grounding.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildUnionIndex,
  checkGrounding,
  extractAtoms,
  hasWord,
  splitSentences,
  tokenSupported,
  unsupportedClaims,
  wordSet,
} from "./grounding.js";
import { chunkSource } from "./source.js";

const DOC = `The Kessington Report was commissioned by the Marrowfen Harbour Board in 1974.

The report put the silting figure at 12 percent per decade, a number the harbour committee disputed at length.`;
const passages = chunkSource("kess.txt", DOC);

test("an answer that stays inside the material is clean", () => {
  const r = checkGrounding(
    "The report put the silting figure at 12 percent per decade.",
    passages,
  );
  assert.ok(r.examined);
  assert.ok(r.clean);
  assert.ok(r.atomsChecked > 0, "it has to have actually checked something");
});

test("an invented figure, agency and year are each caught", () => {
  const r = checkGrounding(
    "The Kessington Report gave a figure of 21 percent, and Bryan TX PD disputed it in 1982.",
    passages,
  );
  assert.equal(r.clean, false);
  const said = unsupportedClaims(r).join(" | ");
  assert.match(said, /21/);
  assert.match(said, /Bryan/);
  assert.match(said, /1982/);
  // And it does not flag what IS there.
  assert.ok(!said.includes("Kessington"));
});

test("clean and examined are different facts", () => {
  // Nothing to check against is not a clean bill of health.
  const r = checkGrounding("Anything at all, with a figure of 99.", []);
  assert.equal(r.examined, false);
  assert.equal(r.clean, true);
  assert.equal(r.findings.length, 0);
});

test("a stem counts as the word", () => {
  const words = wordSet("the committee disputed several investigations");
  assert.ok(hasWord(words, "investigation"), "a shorter stem of a longer word");
  assert.ok(hasWord(words, "dispute"), "and the other direction");
  // Prefix stemming, not lemmatisation: "disputes" and "disputed" diverge at
  // the last character, so neither contains the other and neither counts.
  assert.ok(!hasWord(words, "disputes"));
  assert.ok(!hasWord(words, "adopted"));
});

test("an abbreviation is supported by its expansion, both directions", () => {
  const spelled = buildUnionIndex([{ text: "The chief executive signed it." }]);
  assert.ok(tokenSupported(spelled, false, "CEO"));
  const abbreviated = buildUnionIndex([{ text: "The CEO signed it." }]);
  assert.ok(tokenSupported(abbreviated, false, "executive"));
});

test("a list marker is not a claim about a quantity", () => {
  const atoms = extractAtoms("1. The committee met.");
  assert.ok(!atoms.some((a) => a.kind === "number" && a.text === "1"));
});

test("a discourse adverb is not a proper name", () => {
  // "Unfortunately, the report..." — capitalised, but grammar, not a claim.
  const r = checkGrounding("Unfortunately, the report was late.", passages);
  assert.ok(r.clean, unsupportedClaims(r).join("; "));
});

test("an abbreviation ending a clause does not split the sentence", () => {
  const s = splitSentences("Dr. Smith wrote it. Then it was filed.");
  assert.equal(s.length, 2);
  assert.match(s[0].text, /^Dr\. Smith/);
});

test("a name the question supplied is marked as echoing it", () => {
  const r = checkGrounding("Bryan TX PD ran the search.", passages, {
    question: "did Bryan TX PD run a search?",
  });
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].echoesQuestion, true);
});

test("a capped report says it was capped", () => {
  const many = Array.from({ length: 60 }, (_, i) => `Agency${i} filed 90${i}.`).join(" ");
  const r = checkGrounding(many, passages);
  assert.ok(r.truncated, "a truncated report that looks complete is a lie of omission");
  assert.equal(r.findings.length, 40);
  assert.ok(r.truncated.total > 40);
});

test("row-group column names count as material", () => {
  const csv = "agency,reason,case_number\nGary IN PD,stolen vehicle,24-0011\n";
  const rows = chunkSource("a.csv", csv);
  const r = checkGrounding("The case_number column lists 24-0011 for Gary IN PD.", rows);
  assert.ok(r.clean, unsupportedClaims(r).join("; "));
});

test("an address is not a claim about quantities", () => {
  // Live bug: the byte offsets in `kess.txt#80-174` were read as figures and
  // flagged as unsupported — the check accusing the answer of inventing the
  // very citation it was asked to write.
  const r = checkGrounding(
    "The report put the silting figure at 12 percent per decade. [kess.txt#80-174]",
    passages,
  );
  assert.ok(r.clean, unsupportedClaims(r).join("; "));
  const bare = checkGrounding("Per kess.txt#80-174, the figure was 12 percent.", passages);
  assert.ok(bare.clean, unsupportedClaims(bare).join("; "));
});
