// explore-bridge.test.mjs — the reopen modal's data layer, across source
// types. What the modal draws is refContext's slices; if these are right for
// every chunk shape the app produces, a clicked ref renders right.

import { test } from "node:test";
import assert from "node:assert/strict";

import { parseRef, refContext } from "./explore-bridge.js";
import { chunkSource } from "./source.js";

test("prose refs slice exactly, ends included", () => {
  const text = "First paragraph here.\n\nSecond paragraph, the one cited.\n\nThird.";
  const chunks = chunkSource("prose.txt", text);
  for (const c of chunks) {
    const ctx = refContext({ "prose.txt": text }, c.ref);
    assert.equal(ctx.cited, text.slice(c.start, c.end), c.ref);
    assert.equal(ctx.before + ctx.cited + ctx.after, text, "the three slices reassemble the source");
  }
});

test("row-chunk (CSV) refs render the rows the address names", () => {
  const csv =
    "agency,searches,date\n" +
    "MNPD,412,2025-03-01\n" +
    "Hendersonville TN PD,38,2025-03-02\n" +
    "Bryan TX PD,0,2025-03-03";
  const chunks = chunkSource("probe.csv", csv);
  assert.ok(chunks.length >= 1);
  for (const c of chunks) {
    const ctx = refContext({ "probe.csv": csv }, c.ref);
    assert.ok(ctx, `ref ${c.ref} must resolve`);
    assert.equal(ctx.cited, csv.slice(c.start, c.end));
    assert.ok(ctx.cited.includes("MNPD") || ctx.cited.includes("PD"), "the cited slice carries actual rows");
  }
});

test("a container-stripped source still reopens at the address on disk", () => {
  // stripContainer shifts offsets; the ref must still name the ORIGINAL file
  // bytes, which is what state.sources holds.
  const licensed = "*** START OF THE PROJECT GUTENBERG EBOOK X ***\n\nThe actual text begins here and continues.\n\nAnother paragraph of it.";
  const chunks = chunkSource("g.txt", licensed);
  for (const c of chunks) {
    const ctx = refContext({ "g.txt": licensed }, c.ref);
    assert.equal(ctx.cited, licensed.slice(c.start, c.end), "offsets survive the container strip");
  }
});

test("bad refs and missing sources refuse typed, never render garbage", () => {
  assert.equal(parseRef("no-hash-here"), null);
  assert.equal(refContext({}, "gone.txt#0-10"), null);
  assert.equal(refContext({ "a.txt": "short" }, "a.txt#not-a-range"), null);
  // Out-of-range clamps rather than throwing — the modal shows what exists.
  const ctx = refContext({ "a.txt": "short" }, "a.txt#2-9999");
  assert.equal(ctx.cited, "ort");
});
