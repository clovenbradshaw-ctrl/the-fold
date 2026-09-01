import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { isTitleQualifier, foldTitleFragments } from "./title-fold.js";

test("isTitleQualifier: a title recurring lowercase elsewhere is recognized", () => {
  const body = "He was once a professor of philosophy. The Professor Van Helsing arrived.";
  assert.equal(isTitleQualifier("Professor", body, new Set()), true);
});

test("isTitleQualifier: a personal first name that never appears lowercase is NOT a title", () => {
  const body = "Abraham Van Helsing arrived at the house.";
  assert.equal(isTitleQualifier("Abraham", body, new Set()), false);
});

test("isTitleQualifier: a known abbreviation is a title even with zero lowercase occurrences", () => {
  const body = "Dr. Seward examined the patient. Dr. Van Helsing agreed.";
  assert.equal(isTitleQualifier("Dr", body, new Set(["Dr"])), true);
});

test("foldTitleFragments: THE REAL SPECIMEN — Professor Van Helsing and Abraham Van Helsing both merge into Van Helsing", () => {
  const body = "He was a professor of medicine. Abraham Van Helsing arrived. Professor Van Helsing spoke.";
  const entries = [
    { name: "Van Helsing" },
    { name: "Professor Van Helsing" },
    { name: "Abraham Van Helsing" },
  ];
  const { merges, refused } = foldTitleFragments(entries, body, new Set());
  assert.equal(refused.length, 0);
  assert.equal(merges.length, 1);
  assert.equal(merges[0].into.name, "Van Helsing");
  assert.deepEqual(merges[0].absorbs.map((e) => e.name).sort(), ["Abraham Van Helsing", "Professor Van Helsing"]);
});

test("foldTitleFragments: THE CONTROL — 'John Smith' and 'Robert Smith', two DIFFERENT people sharing a surname, must NOT merge", () => {
  // Neither "John" nor "Robert" ever recurs lowercase or is an abbreviation
  // — exactly the Kutuzov/Barclay shape: two unrecognised qualifiers on
  // one tail. This is the case that would break a naive "shared tail
  // always merges" rule, and the whole reason the title/name distinction
  // exists rather than a blanket containment fold.
  const body = "John Smith walked in. Later, Robert Smith arrived separately. They had never met.";
  const entries = [
    { name: "Smith" },
    { name: "John Smith" },
    { name: "Robert Smith" },
  ];
  const { merges, refused } = foldTitleFragments(entries, body, new Set());
  assert.equal(merges.length, 0, "John Smith and Robert Smith must not merge — they are different people");
  assert.equal(refused.length, 1);
  assert.deepEqual(refused[0].qualifiers.sort(), ["John", "Robert"]);
});

test("foldTitleFragments: a SINGLE unrecognised qualifier is safe even alongside a recognised title — only TWO OR MORE unrecognised ones refuse", () => {
  const body = "He was a professor of chemistry. Professor Smith taught. Abraham Smith also attended.";
  const entries = [
    { name: "Smith" },
    { name: "Professor Smith" },
    { name: "Abraham Smith" },
  ];
  const { merges, refused } = foldTitleFragments(entries, body, new Set());
  // Only ONE unrecognised qualifier here (Abraham) — Professor is
  // recognised, so this is safe: one person, one title, one first name.
  assert.equal(refused.length, 0);
  assert.equal(merges.length, 1);
  assert.deepEqual(merges[0].absorbs.map((e) => e.name).sort(), ["Abraham Smith", "Professor Smith"]);
});

test("foldTitleFragments: no anchor entry, no merge — a fragment with no bare tail to fold into stays as it is", () => {
  const entries = [{ name: "Professor Van Helsing" }, { name: "Abraham Van Helsing" }];
  const { merges, refused } = foldTitleFragments(entries, "professor of medicine", new Set());
  assert.equal(merges.length, 0);
  assert.equal(refused.length, 0);
});

test("foldTitleFragments: THE REAL FULL-BOOK SPECIMEN — real Dracula text, real cast shape", () => {
  const abs = "/Users/mlacy/Documents/3.0/live_priors/01-literature-books/gutenberg/pg345_Dracula.txt";
  const body = fs.readFileSync(abs, "utf8");
  const entries = [
    { name: "Van Helsing", mentions: 527 },
    { name: "Professor Van Helsing", mentions: 177 },
    { name: "Abraham Van Helsing", mentions: 9 },
  ];
  const { merges, refused } = foldTitleFragments(entries, body, new Set(["Dr", "Mr", "Mrs"]));
  assert.equal(refused.length, 0, "the real book's own Van Helsing entries must not be refused");
  assert.equal(merges.length, 1);
  assert.equal(merges[0].into.name, "Van Helsing");
  assert.equal(merges[0].absorbs.length, 2);
});
