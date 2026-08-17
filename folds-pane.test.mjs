// folds-pane.test.mjs — the Folds panel's pure half, held to its words.
import test from "node:test";
import assert from "node:assert/strict";

import {
  FOLD_SORTS,
  filterFolds,
  parseFoldCommand,
  pickRevisionSegment,
  sortFolds,
} from "./folds-pane.js";

const rows = [
  { n: 1, caption: "countdown timer", lang: "python", type: "code", address: "build-1@3.py", code: "print('tick')", addenda: 4 },
  { n: 2, caption: "colorful spiral", lang: "html", type: "code", address: "build-2@3.html", code: "ctx.arc(x, y, radius)", addenda: 4 },
  { n: 3, caption: "table · 5 rows", lang: null, type: "table", address: "build-3@0.csv", code: null, addenda: 1 },
];

// ── the door ────────────────────────────────────────────────────────────────

test("parseFoldCommand reads the number and the instruction, nothing else", () => {
  assert.deepEqual(parseFoldCommand("/fold 2 make the radius grow"), {
    n: 2,
    instruction: "make the radius grow",
  });
  assert.deepEqual(parseFoldCommand("/fold #7 fix it"), { n: 7, instruction: "fix it" });
});

test("parseFoldCommand carries a multiline instruction whole", () => {
  const got = parseFoldCommand("/fold 2 first line\nsecond line");
  assert.equal(got.n, 2);
  assert.equal(got.instruction, "first line\nsecond line");
});

test("parseFoldCommand refuses a bare door, a missing number, and lookalikes", () => {
  assert.equal(parseFoldCommand("/fold"), null);
  assert.equal(parseFoldCommand("/fold 2"), null); // number but no instruction
  assert.equal(parseFoldCommand("/fold fix it"), null); // instruction but no number
  assert.equal(parseFoldCommand("/folder 2 rename it"), null);
  assert.equal(parseFoldCommand("tell me about /fold 2 things"), null); // door is a prefix
});

// ── search ──────────────────────────────────────────────────────────────────

test("an empty query hides nothing and returns a copy", () => {
  const got = filterFolds(rows, "");
  assert.deepEqual(got, rows);
  assert.notEqual(got, rows);
});

test("every term must land somewhere in the fold's own words", () => {
  assert.deepEqual(filterFolds(rows, "spiral").map((r) => r.n), [2]);
  assert.deepEqual(filterFolds(rows, "SPIRAL html").map((r) => r.n), [2]); // case folds, AND
  assert.deepEqual(filterFolds(rows, "spiral python").map((r) => r.n), []); // no fold has both
});

test("the address is searchable: 'fold 2', 'build 2', and the file name all find it", () => {
  assert.deepEqual(filterFolds(rows, "fold 2").map((r) => r.n), [2]);
  assert.deepEqual(filterFolds(rows, "build 2").map((r) => r.n), [2]);
  assert.deepEqual(filterFolds(rows, "build-1@3").map((r) => r.n), [1]);
});

test("the code itself is searchable — a fold is findable by what it does", () => {
  assert.deepEqual(filterFolds(rows, "radius").map((r) => r.n), [2]);
  assert.deepEqual(filterFolds(rows, "tick").map((r) => r.n), [1]);
});

test("a row with no code or caption still filters without throwing", () => {
  assert.deepEqual(filterFolds(rows, "table").map((r) => r.n), [3]);
});

// ── order ───────────────────────────────────────────────────────────────────

test("every declared sort key sorts, and the input is never mutated", () => {
  const before = rows.map((r) => r.n);
  for (const { key } of FOLD_SORTS) sortFolds(rows, key);
  assert.deepEqual(rows.map((r) => r.n), before);
});

test("newest and oldest are recency by fold number, both directions", () => {
  assert.deepEqual(sortFolds(rows, "newest").map((r) => r.n), [3, 2, 1]);
  assert.deepEqual(sortFolds(rows, "oldest").map((r) => r.n), [1, 2, 3]);
});

test("name orders by caption, ties broken by number", () => {
  assert.deepEqual(sortFolds(rows, "name").map((r) => r.n), [2, 1, 3]);
});

test("addenda orders by log length, ties broken newest-first", () => {
  assert.deepEqual(sortFolds(rows, "addenda").map((r) => r.n), [2, 1, 3]);
});

test("an unknown sort key throws — no silent default nobody chose", () => {
  assert.throws(() => sortFolds(rows, "best"), TypeError);
});

// ── the revision's landing segment ──────────────────────────────────────────

test("pickRevisionSegment prefers the fold's own language", () => {
  const segs = [
    { type: "code", lang: "bash", code: "python spiral.py" },
    { type: "code", lang: "html", code: "<canvas></canvas>" },
  ];
  assert.equal(pickRevisionSegment(segs, "html").lang, "html");
});

test("a bare fence counts as the fold's language — models drop the tag", () => {
  const segs = [
    { type: "prose", text: "here you go" },
    { type: "code", lang: "", code: "<svg></svg>" },
  ];
  assert.equal(pickRevisionSegment(segs, "html").code, "<svg></svg>");
});

test("no language match still lands the first code block, and prose-only replies land nothing", () => {
  const segs = [{ type: "code", lang: "python", code: "print(1)" }];
  assert.equal(pickRevisionSegment(segs, "html").code, "print(1)");
  assert.equal(pickRevisionSegment([{ type: "prose", text: "sorry" }], "html"), null);
  assert.equal(pickRevisionSegment([{ type: "code", lang: "html", code: "   " }], "html"), null);
});
