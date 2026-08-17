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

test("a non-TOC line (prose, a heading) is simply not a match", () => {
  const index = parseHandbookIndex("# The Handbook\n\nSome prose about status.\n\n## Part 0\n");
  assert.deepEqual(index, []);
});
