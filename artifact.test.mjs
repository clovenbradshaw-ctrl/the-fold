// node --test artifact.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";

import { RENDERABLE, chartFrom, parseSegments, tableFrom, toDocument } from "./artifact.js";

test("a table can be built from rows, without a model", () => {
  const seg = tableFrom(
    [
      { ref: "a.txt#0-10", hits: 2 },
      { ref: "a.txt#11-40", hits: 1 },
    ],
    [
      { label: "address", get: (p) => p.ref },
      { label: "matched", get: (p) => p.hits },
      { label: "n", get: (_, i) => i + 1 },
    ],
  );
  assert.deepEqual(seg.head, ["address", "matched", "n"]);
  assert.deepEqual(seg.rows, [
    ["a.txt#0-10", "2", "1"],
    ["a.txt#11-40", "1", "2"],
  ]);
});

test("a built table is the same shape a parsed one is", () => {
  // Both paths reach one renderer; if these ever diverge it breaks silently.
  const built = tableFrom([{ a: 1 }], [{ label: "a", get: (r) => r.a }]);
  const parsed = parseSegments("| a |\n| - |\n| 1 |")[0];
  assert.deepEqual(Object.keys(built).sort(), Object.keys(parsed).sort());
  assert.deepEqual(built, parsed);
});

test("null and undefined cells become empty strings, not 'null'", () => {
  const seg = tableFrom([{}], [
    { label: "x", get: (r) => r.missing },
    { label: "y", get: () => null },
    { label: "z", get: () => 0 },
  ]);
  assert.deepEqual(seg.rows, [["", "", "0"]]);
});

test("an empty row set still yields a table with its header", () => {
  const seg = tableFrom([], [{ label: "address", get: (p) => p.ref }]);
  assert.deepEqual(seg, { type: "table", head: ["address"], rows: [] });
});

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

test("every rendered document carries the no-network wall; the content survives intact", () => {
  // Scripts may be granted by run-consent, but the network never is: every
  // document toDocument produces opens with a CSP that has no connect-src,
  // no external anything — local-only by physics, not trust.
  const svg = toDocument({ lang: "svg", code: "<svg/>" });
  assert.match(svg, /^<!doctype html>/);
  assert.ok(svg.includes("Content-Security-Policy"));
  assert.ok(svg.includes("default-src 'none'"));
  assert.ok(svg.includes("<svg/>"));
  const html = toDocument({ lang: "html", code: "<p>hi</p>" });
  assert.ok(html.includes("Content-Security-Policy"));
  assert.ok(html.endsWith("<p>hi</p>"), "the model's markup is appended after the wall, unmodified");
});

test("a chart is built from rows without a model, and every figure is the row's own", () => {
  const seg = chartFrom(
    [
      { month: "January", filings: 1144 },
      { month: "April", filings: 108 },
    ],
    {
      x: { label: "month", get: (r) => r.month },
      y: { label: "filings", get: (r) => r.filings },
      title: "Nashville eviction filings, 2020",
    },
  );
  assert.equal(seg.type, "code");
  assert.equal(seg.lang, "svg");
  assert.equal(seg.rows, 2);
  assert.equal(seg.dropped, 0);
  // Intrinsic size, not just a viewBox: without it the render wrapper's
  // max-constraints have nothing to hold and the frame draws nothing.
  assert.match(seg.code, /<svg [^>]*width="\d+" height="\d+"/);
  // The figures in the markup are the input rows' bytes, nothing invented.
  assert.ok(seg.code.includes(">1144<"));
  assert.ok(seg.code.includes(">108<"));
  assert.ok(seg.code.includes("January"));
  assert.ok(seg.code.includes("Nashville eviction filings, 2020"));
});

test("chart bar heights are proportional to the values", () => {
  const seg = chartFrom(
    [{ x: "a", y: 100 }, { x: "b", y: 50 }],
    { x: { label: "x", get: (r) => r.x }, y: { label: "y", get: (r) => r.y } },
  );
  // Bars only — the background rect carries a height too, but not the bar fill.
  const heights = [...seg.code.matchAll(/<rect [^>]*height="([\d.]+)" fill="var\(--accent\)"/g)].map((m) => Number(m[1]));
  assert.equal(heights.length, 2);
  assert.ok(Math.abs(heights[0] - 2 * heights[1]) < 0.2, `expected 2:1, got ${heights}`);
});

test("a non-numeric row is dropped and counted, never drawn as NaN", () => {
  const seg = chartFrom(
    [{ x: "a", y: 10 }, { x: "b", y: "not a number" }],
    { x: { label: "x", get: (r) => r.x }, y: { label: "y", get: (r) => r.y } },
  );
  assert.equal(seg.rows, 1);
  assert.equal(seg.dropped, 1);
  assert.ok(!seg.code.includes("NaN"));
});

test("an all-zero series draws baselines, not NaN geometry", () => {
  const seg = chartFrom(
    [{ x: "a", y: 0 }, { x: "b", y: 0 }],
    { x: { label: "x", get: (r) => r.x }, y: { label: "y", get: (r) => r.y } },
  );
  assert.ok(!seg.code.includes("NaN"));
  assert.ok(seg.code.includes('height="0.0"'));
});

test("no rows yields an empty chart segment, and markup in labels is escaped", () => {
  const empty = chartFrom([], { x: { label: "x", get: (r) => r.x }, y: { label: "y", get: (r) => r.y } });
  assert.equal(empty.rows, 0);
  assert.equal(empty.code, "");
  const seg = chartFrom(
    [{ x: '<script>"hi"</script>', y: 5 }],
    { x: { label: "x", get: (r) => r.x }, y: { label: "y", get: (r) => r.y }, title: "a & b" },
  );
  assert.ok(!seg.code.includes("<script>"));
  assert.ok(seg.code.includes("&lt;script&gt;"));
  assert.ok(seg.code.includes("a &amp; b"));
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

test("a built chart carries its own three-state theme, not the page's variables", () => {
  // A sandboxed frame cannot read index.html's custom properties, and a
  // downloaded .svg has no page at all — so the palette rides along.
  const seg = chartFrom([{ x: "a", y: 1 }], {
    x: { label: "x", get: (r) => r.x },
    y: { label: "y", get: (r) => r.y },
  });
  assert.ok(seg.code.includes("prefers-color-scheme"));
  assert.ok(seg.code.includes('[data-theme="dark"]'));
  assert.ok(seg.code.includes("var(--bg)"), "it paints its own ground");
});
