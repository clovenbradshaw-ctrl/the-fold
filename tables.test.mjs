// node --test tables.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";

import { NOTHING, buildTable, detectTable, toMarkdown } from "./tables.js";
import { parseSegments } from "./artifact.js";
import { emptySummary, addWarrantRecord, buildWarrantRecord, advanceSummaryFold } from "./fold.js";
import { chunkSource } from "./source.js";

const stateWith = (over = {}) => ({
  summary: emptySummary(),
  sources: {},
  chunks: [],
  muted: new Set(),
  passages: [],
  ...over,
});

test("a question about the app's own things asks for a table", () => {
  assert.equal(detectTable("list my sources"), "sources");
  assert.equal(detectTable("show me the records"), "records");
  assert.equal(detectTable("what are the folds so far?"), "folds");
  assert.equal(detectTable("table of the passages retrieved"), "passages");
  assert.equal(detectTable("list the loaded files"), "sources");
});

test("a question about the material is never hijacked", () => {
  // Each of these contains a subject word and an asking word, and every one of
  // them is a question about the corpus. Answering with a file listing would
  // be worse than answering badly.
  assert.equal(detectTable("what did the report say about sources of funding"), null);
  assert.equal(detectTable("show me what the annex records about tariffs"), null);
  assert.equal(detectTable("list the ships mentioned in the document"), null);
  assert.equal(detectTable("who disputed the figure?"), null);
  assert.equal(detectTable(""), null);
});

test("the sources table is the state, not a description of it", () => {
  const sources = { "a.txt": "x".repeat(120), "b.txt": "y".repeat(30) };
  const chunks = [
    ...chunkSource("a.txt", "a paragraph long enough to survive chunking here"),
    ...chunkSource("b.txt", "another paragraph long enough to survive chunking"),
  ];
  const { table, caption } = buildTable(
    "sources",
    stateWith({ sources, chunks, muted: new Set(["b.txt"]) }),
  );
  assert.deepEqual(table.head, ["Source", "Passages", "Characters", "Read from"]);
  assert.deepEqual(table.rows, [
    ["a.txt", "1", "120", "yes"],
    ["b.txt", "1", "30", "no"],
  ]);
  assert.match(caption, /2 sources/);
  assert.match(caption, /computed, not generated/);
});

test("the records table carries the addresses verbatim", () => {
  let summary = addWarrantRecord(
    emptySummary(),
    buildWarrantRecord({
      turn: 1,
      gist: "what the turn established",
      channels: ["source"],
      refs: ["kess.txt#0-40", "kess.txt#41-90"],
      unsupported: [],
      open: ["not settled"],
    }),
  );
  const { table } = buildTable("records", stateWith({ summary }));
  assert.deepEqual(table.rows, [
    ["1", "what the turn established", "kess.txt#0-40\nkess.txt#41-90", "not settled"],
  ]);
});

test("the folds table numbers turns correctly once the list is bounded", () => {
  let s = emptySummary();
  for (let i = 0; i < 20; i++) s = advanceSummaryFold(s, `fold ${i + 1}`);
  const { table, caption } = buildTable("folds", stateWith({ summary: s }));
  // 12 kept of 20 turns: the first row shown is turn 9, not turn 1.
  assert.equal(table.rows.length, 12);
  assert.deepEqual(table.rows[0], ["9", "fold 9"]);
  assert.deepEqual(table.rows.at(-1), ["20", "fold 20"]);
  assert.match(caption, /12 folds kept of 20 turns/);
});

test("empty state yields null, and a sentence to say instead", () => {
  for (const kind of ["records", "sources", "folds", "passages"]) {
    assert.equal(buildTable(kind, stateWith()), null);
    assert.equal(typeof NOTHING[kind], "string");
  }
});

test("a built table round-trips through the transcript as a table", () => {
  // The turn's text form lands in history, and a later turn's recency window
  // may show it to the model — so it has to parse back as the same rows.
  const { table } = buildTable(
    "sources",
    stateWith({
      sources: { "a.txt": "x" },
      chunks: chunkSource("a.txt", "a paragraph long enough to survive chunking"),
    }),
  );
  const round = parseSegments(toMarkdown(table))[0];
  assert.equal(round.type, "table");
  assert.deepEqual(round.head, table.head);
  assert.deepEqual(round.rows, table.rows);
});

test("a cell containing a pipe cannot forge a column", () => {
  const summary = addWarrantRecord(
    emptySummary(),
    buildWarrantRecord({
      turn: 1,
      gist: "a | b | c",
      channels: [],
      refs: [],
      unsupported: [],
      open: [],
    }),
  );
  const { table } = buildTable("records", stateWith({ summary }));
  const round = parseSegments(toMarkdown(table))[0];
  assert.equal(round.head.length, round.rows[0].length);
  // Escaped on the way out, unescaped on the way back: the cell survives whole
  // rather than shifting every column after it.
  assert.equal(round.rows[0][1], "a | b | c");
});
