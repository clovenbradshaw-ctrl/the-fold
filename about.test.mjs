// node --test about.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  asksAboutMaterial,
  materialView,
  abbreviate,
  aboutBlock,
  ABOUT_DIGEST_CHARS,
  ABOUT_SAMPLES,
  ABOUT_SAMPLE_CHARS,
} from "./about.js";

// The door. TRUE means this question is answered from the SITUATION view,
// never from retrieval.
test("asksAboutMaterial claims the about questions", () => {
  const trues = [
    "what is this?",
    "what is this about?",
    "what did i attach?",
    "what am i reading?",
    "what kind of book is this?",
    "what kind of document is this?",
    "what's this book about?",
    "tell me about this book",
    "describe this file",
    "what are my sources?",
    "what do you have?",
    "what's this?",
    "is this a book?",
    "is this a novel?",
    "is it a document?",
    "is that the file?",
    "is this a paper?",
    "is this the material?",
    "what is it?",
  ];
  for (const q of trues) {
    assert.equal(asksAboutMaterial(q), true, `should claim: ${q}`);
  }
});

test("asksAboutMaterial falls through to retrieval", () => {
  const falses = [
    "what is this", // no question mark
    "what is this about napoleon?", // trailing detail breaks the end-anchored branch
    "what does this book say about Napoleon?",
    "is this a good book?", // adjective between article and noun
    "was this a book?", // "was" is not in the furniture
    "was it a novel?",
    "is this a book about napoleon?", // end-anchored after the noun
    "who was prince andrei's father?",
    "what happened at the battle of borodino?",
    "who is napoleon?",
    "can you tell me about this book?", // "can" is not in the furniture
    "whats this?", // no apostrophe, no " is"
    "whats this about napoleon?",
    "borodino",
  ];
  for (const q of falses) {
    assert.equal(asksAboutMaterial(q), false, `should fall through: ${q}`);
  }
});

// abbreviate.

test("abbreviate returns the empty shape on nothing to abbreviate", () => {
  assert.deepEqual(abbreviate([]), { text: "", of: 0, kept: 0, places: [] });
  assert.deepEqual(abbreviate(undefined), { text: "", of: 0, kept: 0, places: [] });
});

test("abbreviate samples at even intervals across the whole", () => {
  const chunks = Array.from({ length: 24 }, (_, i) => ({ text: `t${i}`, ref: `#${i}` }));
  const r = abbreviate(chunks, { chars: 2400, samples: 16, each: 220 });
  assert.equal(r.of, 24);
  assert.equal(r.kept, 16);
  assert.deepEqual(r.places, [
    "#0", "#1", "#3", "#4", "#6", "#7", "#9", "#10",
    "#12", "#13", "#15", "#16", "#18", "#19", "#21", "#22",
  ]);
  assert.equal(
    r.text,
    "t0 … t1 … t3 … t4 … t6 … t7 … t9 … t10 … t12 … t13 … t15 … t16 … t18 … t19 … t21 … t22"
  );
});

test("abbreviate clips a single long piece to the per-piece budget", () => {
  const r = abbreviate([{ text: "a".repeat(500), ref: "#long" }], { chars: 500, samples: 1, each: 20 });
  assert.equal(r.of, 1);
  assert.equal(r.kept, 1);
  assert.equal(r.text, `${"a".repeat(19)}…`);
  assert.deepEqual(r.places, ["#long"]);
});

test("abbreviate spends only the character budget, keeping whole pieces", () => {
  const chunks = Array.from({ length: 16 }, (_, i) => ({ text: "a".repeat(200), ref: `#${i}` }));
  const r = abbreviate(chunks, { chars: 2400, samples: 16, each: 220 });
  assert.equal(r.of, 16);
  assert.equal(r.kept, 12); // 12 * 200 = 2400; the 13th would exceed the budget
  assert.equal(r.text.length, 12 * 200 + 3 * (12 - 1));
});

test("abbreviate uses the exported default budgets when options are omitted", () => {
  assert.equal(ABOUT_DIGEST_CHARS, 2400);
  assert.equal(ABOUT_SAMPLES, 16);
  assert.equal(ABOUT_SAMPLE_CHARS, 220);
  const chunks = Array.from({ length: 24 }, (_, i) => ({ text: "b".repeat(400), ref: `#${i}` }));
  const r = abbreviate(chunks);
  assert.equal(r.of, 24);
  assert.equal(r.kept, 10); // ABOUT_DIGEST_CHARS / ABOUT_SAMPLE_CHARS, whole pieces only
  assert.ok(r.places.every((p, i) => p === r.places[i]));
});

test("abbreviate carries refs, and null when a chunk has none", () => {
  const r = abbreviate([{ text: "hello world" }, { text: "second" }]);
  assert.equal(r.of, 2);
  assert.equal(r.kept, 2);
  assert.equal(r.text, "hello world … second");
  assert.deepEqual(r.places, [null, null]);
});

test("abbreviate skips empty, null and falsy-text chunks without inventing places", () => {
  const r = abbreviate([{ text: "  " }, { text: "x", ref: "#x" }, null, undefined, { text: 0, ref: "#zero" }]);
  assert.equal(r.of, 2);
  assert.equal(r.kept, 2);
  assert.equal(r.text, "x … 0");
  assert.deepEqual(r.places, ["#x", "#zero"]);
});

// materialView — the SITUATION view rows.

const DECLARED = { title: "Countdown", author: "P. M.", giver: "the reader" };
const CHUNKS = [
  { source: "r1", text: "first", identity: { declared: DECLARED, kind: "book", guess: "an essay about counting" } },
  { source: "r1", text: "second" },
  { source: "r2", text: "third" },
];

test("materialView builds one row per source from chunks, reading and bytes", () => {
  const row = materialView({
    sources: { r1: "Some text", r2: "" },
    chunks: CHUNKS,
    reading: { r1: { cursor: 3, total: 10 } },
  }).find((r) => r.name === "r1");
  assert.deepEqual(row, {
    name: "r1",
    title: "Countdown",
    author: "P. M.",
    titleGiver: "the reader",
    kind: "book",
    looksLike: "an essay about counting",
    characters: "Some text".length,
    passages: 2,
    read: 3,
    total: 10,
  });
});

test("materialView reads a Map or a plain object the same way", () => {
  const opts = {
    sources: { r1: "Some text" },
    chunks: CHUNKS,
    media: {},
  };
  const plain = materialView({ ...opts, reading: { r1: { cursor: 3, total: 10 } } });
  const mapped = materialView({ ...opts, reading: new Map([["r1", { cursor: 3, total: 10 }]]) });
  assert.deepEqual(mapped, plain);
});

test("materialView falls back to the chunk count when the reading row is missing or total-less", () => {
  const opts = { sources: { r1: "x" }, chunks: CHUNKS, media: {} };
  const noRow = materialView(opts).find((r) => r.name === "r1");
  assert.equal(noRow.read, null);
  assert.equal(noRow.total, 2);
  const noTotal = materialView({ ...opts, reading: new Map([["r1", { cursor: 1 }]]) }).find((r) => r.name === "r1");
  assert.equal(noTotal.read, 1);
  assert.equal(noTotal.total, 2);
});

test("materialView adds media rows with their declared kind", () => {
  const rows = materialView({
    sources: {},
    chunks: [],
    media: { clip: { kind: "video" }, note: {} },
  });
  assert.deepEqual(rows.find((r) => r.name === "clip"), {
    name: "clip", title: null, author: null, titleGiver: null, kind: "video",
    looksLike: null, characters: null, passages: 0, read: null, total: null,
  });
  assert.equal(rows.find((r) => r.name === "note").kind, "media");
});

test("materialView returns no rows when nothing is attached", () => {
  assert.deepEqual(materialView(), []);
});

test("materialView builds a row from CHUNKS ALONE, with no sources dict — the engine side's own situation, which never has state.sources", () => {
  // holon.js has `chunks` and never `state.sources` (an app.js-level dict);
  // the character count is the exact sum of that source's own chunk text,
  // never estimated — chunking always covers the whole file.
  const rows = materialView({ chunks: CHUNKS });
  const r1 = rows.find((r) => r.name === "r1");
  assert.equal(r1.title, "Countdown");
  assert.equal(r1.characters, "first".length + "second".length);
  assert.equal(r1.passages, 2);
  const r2 = rows.find((r) => r.name === "r2");
  assert.equal(r2.characters, "third".length);
  assert.equal(rows.length, 2);
});

test("materialView: a name sources omits but chunks mention still gets a row", () => {
  const rows = materialView({ sources: { r1: "Some text" }, chunks: CHUNKS });
  assert.equal(rows.length, 2, "r2 is not in sources, but it is in chunks");
  assert.ok(rows.find((r) => r.name === "r2"));
  // r1 IS in sources, so its declared full text wins over the chunk sum.
  assert.equal(rows.find((r) => r.name === "r1").characters, "Some text".length);
});

// aboutBlock — the block the about turn is handed.

test("aboutBlock returns empty when there are no rows", () => {
  assert.equal(aboutBlock([]), "");
});

test("aboutBlock says what an attached named source says it is, and where reading stands", () => {
  const rows = [{
    name: "wp",
    title: "War and Peace",
    author: "Leo Tolstoy",
    titleGiver: null,
    looksLike: null,
    characters: 3359610,
    passages: 120,
    read: 1000,
    total: 3359610,
  }];
  assert.equal(
    aboutBlock(rows),
    "What is attached, and what it says it is:\n" +
      "- wp: says on its own title page that it is “War and Peace”, by Leo Tolstoy, " +
      "3,359,610 characters long, cut into 120 passages, read as far as 1,000 of 3,359,610 so far"
  );
});

test("aboutBlock reads through when the cursor has reached the total", () => {
  const rows = [{ name: "x", title: "T", author: null, titleGiver: null, looksLike: null, characters: null, passages: 1, read: 1, total: 1 }];
  assert.ok(aboutBlock(rows).endsWith("- x: says on its own title page that it is “T”, cut into 1 passage, read through"));
});

test("aboutBlock names a source that only looks like something", () => {
  const rows = [{ name: "r2", title: null, author: null, titleGiver: null, looksLike: "an essay", characters: 5, passages: 0, read: null, total: 0 }];
  assert.ok(aboutBlock(rows).includes("- r2: looks like an essay, 5 characters long"));
});

test("aboutBlock labels the sample and keeps its text verbatim at the end", () => {
  const rows = [{ name: "x", title: null, author: null, titleGiver: null, looksLike: null, characters: null, passages: 0, read: null, total: null }];
  const digest = { text: "one … two … three", of: 3, kept: 2 };
  const block = aboutBlock(rows, digest);
  assert.ok(block.startsWith("What is attached, and what it says it is:\n- x"));
  assert.ok(block.includes("\n\nA sample of the text itself — 2 pieces taken at even intervals from 3, each cut short, the gaps marked with an ellipsis:\n"));
  assert.ok(block.endsWith(digest.text));
});

test("aboutBlock is head-only without a digest, and pluralises a single piece", () => {
  const rows = [{ name: "x", title: null, author: null, titleGiver: null, looksLike: null, characters: null, passages: 0, read: null, total: null }];
  assert.equal(aboutBlock(rows), "What is attached, and what it says it is:\n- x");
  const block = aboutBlock(rows, { text: "only", of: 1, kept: 1 });
  assert.ok(block.includes("A sample of the text itself — 1 piece taken at even intervals from 1"));
});