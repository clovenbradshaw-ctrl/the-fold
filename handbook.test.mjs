// handbook.test.mjs — the vendored handbook's index parse, against the
// REAL file this repo ships (no fixture copy to drift from it).

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseHandbookIndex, findChapter } from "./handbook.js";

const indexMd = readFileSync(new URL("./handbook/000-index.md", import.meta.url), "utf8");

test("the real index yields every vendored chapter, in order, each file present on disk", () => {
  const index = parseHandbookIndex(indexMd);
  assert.ok(index.length >= 38, `expected the full handbook, got ${index.length} chapters`);
  assert.deepEqual(index[0], { n: "0.1", title: "What this book is and isn't", file: "001-what-this-book-is-and-isnt.md" });
  for (const c of index) {
    assert.ok(/^\d+\.\d+$/.test(c.n), `${c.n} is not a chapter number`);
    assert.ok(existsInHandbook(c.file), `${c.file} is listed but not vendored`);
  }
});

function existsInHandbook(file) {
  try {
    readFileSync(new URL(`./handbook/${file}`, import.meta.url));
    return true;
  } catch {
    return false;
  }
}

test("findChapter matches by number or by filename, and misses honestly", () => {
  const index = parseHandbookIndex(indexMd);
  assert.equal(findChapter(index, "1.1").file, "101-noticing.md");
  assert.equal(findChapter(index, "101-noticing.md").n, "1.1");
  assert.equal(findChapter(index, "101-noticing").n, "1.1");
  assert.equal(findChapter(index, "9.9"), null);
});

// REGRESSION: /help's own documented /learn example ("/learn constitution")
// named a chapter by a title word, not a number or filename — typed exactly
// as shown, findChapter used to find nothing (the sibling of task_23bbb378,
// found the same day).
test("findChapter falls back to a single distinctive title word, but only when it names exactly one chapter", () => {
  const index = parseHandbookIndex(indexMd);
  // The documented example, verbatim: names 4.3 "A constitution that edits itself".
  const ch = findChapter(index, "constitution");
  assert.ok(ch, "the /learn constitution example must resolve to a real chapter");
  assert.equal(ch.n, "4.3");
  assert.equal(ch.file, "403-a-constitution-that-edits-itself.md");
  // Case-insensitive, whitespace-tolerant same as the number/file match.
  assert.equal(findChapter(index, "  Constitution  ").n, "4.3");
  // A word that names MORE than one chapter refuses rather than guessing —
  // "nine" opens 2.1 "Nine verbs", 2.3 "Nine kinds of where", and 2.4 "Nine
  // kinds of how".
  assert.equal(findChapter(index, "nine"), null, "ambiguous across three real chapters — must not guess");
  // A short, common word never reaches the title fallback at all, even
  // where it happens to be unique to one title's own wording.
  assert.equal(findChapter(index, "the"), null, "too common to mean one chapter, and would be ambiguous anyway");
  // Number/file matching still wins outright — the fallback only runs when
  // neither of those found anything.
  assert.equal(findChapter(index, "1.1").file, "101-noticing.md");
});

test("a non-TOC line (prose, a heading) is simply not a match", () => {
  const index = parseHandbookIndex("# The Handbook\n\nSome prose about status.\n\n## Part 0\n");
  assert.deepEqual(index, []);
});
