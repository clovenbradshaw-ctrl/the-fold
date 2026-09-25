// enumeration.test.mjs — the list reader, against the REAL Gutenberg bytes it
// was built for, with every span checked to read back from the file on disk.
//
// The specimen is the sentence that defeated every tier above this one for a
// whole session (2026-09-01): the relation extractor kept its SUBJECT — "two
// methods —of→ curing the mischiefs of faction", which merely restates the
// question — and dropped both items, because a colon ends the clause its
// matcher reads.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { answeringEnumeration, checkDeclaredCount, enumerationsIn, enumerationsInChunk } from "./enumeration.js";
import { chunkSource, retrieve, tokenize } from "./source.js";

const FIXTURE = path.resolve(import.meta.dirname, "eval", "fixtures", "federalist-10-excerpt.txt");
const SENTENCE =
  "There are two methods of curing the mischiefs of faction: the one, by removing its causes; the other, by controlling its effects.";

test("the specimen: both items are read, in the material's own words", () => {
  const { enumerations } = enumerationsIn(SENTENCE);
  assert.equal(enumerations.length, 1);
  const e = enumerations[0];
  assert.equal(e.count, 2);
  assert.equal(e.items[0].text, "the one, by removing its causes");
  assert.equal(e.items[1].text, "the other, by controlling its effects");
  assert.match(e.head, /two methods of curing the mischiefs of faction$/);
});

test("every item span reads back from the string it was read out of", () => {
  const { enumerations } = enumerationsIn(SENTENCE);
  for (const it of enumerations[0].items) {
    assert.equal(SENTENCE.slice(it.start, it.end), it.text, "P5.2: a span that does not read back is not an address");
  }
});

test("a declared count is checked against what was found, and agreement is reported", () => {
  const { enumerations } = enumerationsIn(SENTENCE);
  const check = checkDeclaredCount(enumerations[0], { cardinals: { two: 2, three: 3 } });
  assert.equal(check.declared, 2);
  assert.equal(check.found, 2);
  assert.equal(check.agrees, true);
});

test("a disagreement is REPORTED, never silently reconciled", () => {
  const { enumerations } = enumerationsIn("There are three ways: by one; by two.");
  const check = checkDeclaredCount(enumerations[0], { cardinals: { three: 3 } });
  assert.equal(check.declared, 3);
  assert.equal(check.found, 2);
  assert.equal(check.agrees, false);
  assert.equal(check.reason, "unbalanced");
});

test("no cardinal prior injected is a disclosed absence, never a guess", () => {
  const { enumerations } = enumerationsIn(SENTENCE);
  const check = checkDeclaredCount(enumerations[0]);
  assert.equal(check.declared, null);
  assert.equal(check.reason, "no_cardinal_prior_injected");
});

test("an apposition is not an enumeration — one item is a typed gap", () => {
  const { enumerations, gaps } = enumerationsIn("There is one remedy: liberty.");
  assert.equal(enumerations.length, 0);
  assert.equal(gaps[0].type, "single_item");
});

test("no colon at all is a typed gap, never silence", () => {
  const { enumerations, gaps } = enumerationsIn("Liberty is to faction what air is to fire.");
  assert.equal(enumerations.length, 0);
  assert.equal(gaps[0].type, "no_colon");
});

test("a mark inside a parenthetical belongs to the aside, not to the sentence", () => {
  // The semicolon inside the bracket must not split the list.
  const { enumerations } = enumerationsIn("Two causes: the first (a; b) here; the second there.");
  assert.equal(enumerations.length, 1);
  assert.equal(enumerations[0].count, 2);
  assert.equal(enumerations[0].items[0].text, "the first (a; b) here");
});

test("structure, not vocabulary: a non-Latin colon and semicolon read identically", () => {
  const { enumerations } = enumerationsIn("二つの方法：一つは原因の除去；もう一つは効果の制御。");
  assert.equal(enumerations.length, 1, "the marks are read by identity, not by script");
  assert.equal(enumerations[0].count, 2);
});

test("answeringEnumeration refuses a list that shares nothing with the question", () => {
  const { enumerations } = enumerationsIn("Two colours: red here; blue there.");
  assert.equal(answeringEnumeration(enumerations, "what are the methods of curing faction", { tokenize }), null);
});

test("answeringEnumeration picks the list whose head answers the question", () => {
  const many = [
    ...enumerationsIn("Two colours: red here; blue there.").enumerations,
    ...enumerationsIn(SENTENCE).enumerations,
  ];
  const best = answeringEnumeration(many, "the two methods of curing the mischiefs of faction", { tokenize });
  assert.ok(best);
  assert.match(best.enumeration.head, /methods of curing/);
});

test("answeringEnumeration will not read a language of its own", () => {
  assert.throws(() => answeringEnumeration([], "x", {}), /tokenize is injected/);
});

// ── against the real file, end to end ────────────────────────────────────
test("REAL BYTES: the answer is assembled from a retrieved chunk and every span reads back from the file", (t) => {
  if (!fs.existsSync(FIXTURE)) {
    t.skip(`fixture absent (${path.basename(FIXTURE)}) — this case reads real bytes or it does not run`);
    return;
  }
  const source = fs.readFileSync(FIXTURE, "utf8");
  const chunks = chunkSource("federalist-10-excerpt.txt", source, {});
  const q = "According to Federalist No. 10, what are the two methods of curing the mischiefs of faction?";
  const passages = retrieve(chunks, q, 3);

  const found = [];
  for (const p of passages) found.push(...enumerationsInChunk(p, source).enumerations);

  const best = answeringEnumeration(found, q, { tokenize });
  assert.ok(best, "the answering enumeration is found in the retrieved passages");
  const e = best.enumeration;
  assert.equal(e.count, 2);
  assert.match(e.items[0].text.replace(/\s+/g, " "), /removing its causes/);
  assert.match(e.items[1].text.replace(/\s+/g, " "), /controlling its effects/);

  // The whole point: these are addresses, not paraphrases.
  for (const it of e.items) {
    assert.equal(source.slice(it.start, it.end), it.text, `span ${it.start}-${it.end} must read back from the file`);
  }
});

test("enumerationsInChunk computes the base a caller would get wrong by hand", () => {
  // A chunk whose body is preceded by whitespace: `start` points at the
  // untrimmed body, `text` is trimmed. Passing `start` as the base directly
  // is the trap this helper exists to remove.
  const source = `\n\n   Two methods: the one, by A; the other, by B.\n`;
  const chunks = chunkSource("t.txt", source, {});
  const chunk = chunks.find((c) => /Two methods/.test(c.text));
  assert.ok(chunk);
  const { enumerations } = enumerationsInChunk(chunk, source);
  assert.equal(enumerations.length, 1);
  for (const it of enumerations[0].items) {
    assert.equal(source.slice(it.start, it.end), it.text, "the helper's base makes every span read back");
  }
});

test("a single shared word is a coincidence, not a question about the list", () => {
  // The live hijack this floor closes: "faction" appears in both, and with a
  // floor of one the reader answered a definition question with a list.
  const { enumerations } = enumerationsIn(SENTENCE);
  assert.equal(answeringEnumeration(enumerations, "What is a faction?", { tokenize }), null);
  // The real question still resolves.
  assert.ok(answeringEnumeration(enumerations, "what are the two methods of curing the mischiefs of faction", { tokenize }));
});
