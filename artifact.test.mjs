// node --test artifact.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";

import { RENDERABLE, parseSegments, toDocument } from "./artifact.js";

test("plain prose is one segment", () => {
  const segs = parseSegments("The report put the figure at 12 percent.");
  assert.deepEqual(segs, [
    { type: "prose", text: "The report put the figure at 12 percent." },
  ]);
});

test("a pipe table becomes a table", () => {
  const segs = parseSegments(`Figures:

| Year | Figure |
| --- | ---: |
| 1974 | 12% |
| 1981 | 9% |`);
  assert.equal(segs.length, 2);
  assert.equal(segs[1].type, "table");
  assert.deepEqual(segs[1].head, ["Year", "Figure"]);
  assert.deepEqual(segs[1].rows, [
    ["1974", "12%"],
    ["1981", "9%"],
  ]);
});

test("a sentence containing a pipe is not a table", () => {
  // The delimiter row is what makes a table a table.
  const segs = parseSegments("Run `a | b` and see. Also x | y is fine.");
  assert.equal(segs.length, 1);
  assert.equal(segs[0].type, "prose");
});

test("a header with no body rows is not a table", () => {
  const segs = parseSegments("| Year | Figure |\n| --- | --- |");
  assert.equal(segs[0].type, "prose");
});

test("a ragged row is padded to the header", () => {
  const segs = parseSegments("| a | b | c |\n| - | - | - |\n| 1 | 2 |");
  assert.deepEqual(segs[0].rows, [["1", "2", ""]]);
});

test("fenced code keeps its language and its whitespace", () => {
  const segs = parseSegments("```python\ndef f():\n    return 1\n```");
  assert.equal(segs[0].type, "code");
  assert.equal(segs[0].lang, "python");
  assert.equal(segs[0].code, "def f():\n    return 1");
});

test("an unclosed fence is still code", () => {
  // A truncated answer is exactly when you want the code shown as code.
  const segs = parseSegments("```js\nconst x = 1;");
  assert.equal(segs[0].type, "code");
  assert.equal(segs[0].code, "const x = 1;");
});

test("tildes fence too, and a bare fence has no language", () => {
  const segs = parseSegments("~~~\nplain\n~~~");
  assert.equal(segs[0].type, "code");
  assert.equal(segs[0].lang, "");
});

test("html and svg are the renderable ones", () => {
  assert.ok(RENDERABLE.has("html"));
  assert.ok(RENDERABLE.has("svg"));
  assert.ok(!RENDERABLE.has("python"));
});

test("svg is wrapped to fill its frame; html is passed through", () => {
  const svg = toDocument({ lang: "svg", code: "<svg/>" });
  assert.match(svg, /^<!doctype html>/);
  assert.ok(svg.includes("<svg/>"));
  assert.equal(toDocument({ lang: "html", code: "<p>hi</p>" }), "<p>hi</p>");
});

test("prose, table, and code interleave in order", () => {
  const segs = parseSegments(
    "One.\n\n| a |\n| - |\n| 1 |\n\nTwo.\n\n```\nx\n```\n\nThree.",
  );
  assert.deepEqual(
    segs.map((s) => s.type),
    ["prose", "table", "prose", "code", "prose"],
  );
});
