// bound.test.mjs — the bound offer, its grammar, and the defensive parse.

import { test } from "node:test";
import assert from "node:assert/strict";

import { extractCells, buildBoundSchema, parseBound, flattenBound } from "./bound.js";
import { makeCastHandles } from "./cast.js";
import { chunkSource } from "./source.js";

const TEXT =
  "The Kessington report put the harbor figure at 12% for the spring quarter. Pierre Bezúkhov disputed it before the committee. Later Pierre Bezúkhov withdrew the dispute.\n\n" +
  "Dredging removed 4,800 tons from the channel through March.";
const chunks = chunkSource("notes.txt", TEXT);

test("cells are every figure the passages state, each with its address", () => {
  const cells = extractCells(chunks);
  const values = cells.map((c) => c.value);
  assert.ok(values.includes("12"), "NUMBER_RE yields bare figures — the checks strip % the same way");
  assert.ok(values.includes("4,800"));
  for (const c of cells) assert.match(c.ref, /^notes\.txt#\d+-\d+$/);
  // Dedup: a figure stated twice is one cell, first address wins.
  assert.equal(new Set(values).size, values.length);
});

test("the schema enumerates the offer, with the empty escape in every enum", async () => {
  const { splitSentences } = await import("../eoreader6.1/packages/engine/perceiver/text/spans.js");
  const { extractSurfaces, discoverReferents } = await import(
    "../eoreader6.1/packages/engine/perceiver/text/surfaces.js"
  );
  const handlesFor = makeCastHandles({ splitSentences, extractSurfaces, discoverReferents });
  const handles = handlesFor(chunks);
  assert.ok(handles.some((h) => /Bez[uú]khov/i.test(h)), JSON.stringify(handles));

  const schema = buildBoundSchema({ handles, cells: extractCells(chunks) });
  const nameEnum = schema.properties.sentences.items.properties.name.enum;
  const figureEnum = schema.properties.sentences.items.properties.figure.enum;
  assert.equal(nameEnum[0], "", "a sentence must be able to carry no name — a grammar without the escape forces invention");
  assert.equal(figureEnum[0], "");
  assert.ok(figureEnum.includes("12"));
});

test("parseBound is defensive and flattenBound is what the checks read", () => {
  const good = parseBound(JSON.stringify({ sentences: [
    { prose: "The report set the harbor figure.", name: "Kessington", figure: "12%" },
    { prose: "The committee heard a dispute.", name: "", figure: "" },
  ]}));
  assert.equal(good.degraded, false);
  assert.equal(good.sentences.length, 2);
  const flat = flattenBound(good);
  assert.ok(flat.includes("Kessington"));
  assert.ok(flat.includes("12%"));
  assert.ok(flat.split("\n").length === 2);

  assert.equal(parseBound("not json").degraded, true);
  assert.equal(parseBound(JSON.stringify({ sentences: [] })).degraded, true);
});
