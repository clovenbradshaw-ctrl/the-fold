// source.test.mjs — this repo had no dedicated test file for source.js
// before this pass. Scoped to what this pass actually touched
// (declaredIdentity, and stripContainer/identifyMaterial/buildSourceBlock's
// new use of it) rather than backfilling the whole file's coverage.
//
// Built alongside the fix it tests: S1 named the wrong book and author for
// Pierre Bezukhov ("The Brothers Karamazov" by Dostoevsky — this corpus is
// Tolstoy's War and Peace, addressed pg2600.txt), and a correction pass
// that still failed shipped the wrong claim uncorrected because nothing
// had ever told the model what book this actually is. declaredIdentity
// reads what the source itself already says (Gutenberg's own Title:/
// Author: header, real bytes, byte-addressed) rather than the model
// guessing — verified live against the real pipeline (runHolonicTask) in
// eval/results/, not just here.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import {
  declaredIdentity,
  stripContainer,
  identifyMaterial,
  buildSourceBlock,
} from "./source.js";

const REAL_FIXTURE = new URL("./pg2600.txt", import.meta.url);

const GUTENBERG_HEADER = `﻿The Project Gutenberg eBook of War and Peace, by Leo Tolstoy

This eBook is for the use of anyone anywhere in the United States and
most other parts of the world at no cost and with almost no restrictions
whatsoever.

Title: War and Peace

Author: Leo Tolstoy

Translators: Louise and Aylmer Maude

Release Date: April, 2001 [eBook #2600]

Language: English

*** START OF THE PROJECT GUTENBERG EBOOK WAR AND PEACE ***

WAR AND PEACE

By Leo Tolstoy

CHAPTER I

"Well, Prince, so Genoa and Lucca are now just family estates..."
`;

test("declaredIdentity reads the source's own real Title:/Author: header, addressed to its own byte span", () => {
  const d = declaredIdentity("pg2600.txt", GUTENBERG_HEADER);
  assert.equal(d.title, "War and Peace");
  assert.equal(d.author, "Leo Tolstoy");
  assert.equal(d.giver, "the source file's own declared header");
  // The address names the header span (up to where the START banner
  // begins) — NOT stripContainer's own `offset`, which is where the BODY
  // begins (after the banner). The banner itself belongs to neither the
  // declared header nor the body.
  const markerStart = GUTENBERG_HEADER.indexOf("*** START OF");
  assert.equal(d.ref, `pg2600.txt#0-${markerStart}`);
});

test("declaredIdentity refuses rather than guesses when there is no Gutenberg header — the control case", () => {
  assert.equal(declaredIdentity("note.txt", "Just some ordinary notes about a meeting."), null);
  assert.equal(declaredIdentity("empty.txt", ""), null);
});

test("declaredIdentity refuses on a Gutenberg header with no Title/Author lines present", () => {
  const noBibliographic = `Some preamble text.\n\n*** START OF THE PROJECT GUTENBERG EBOOK X ***\n\nBody.`;
  assert.equal(declaredIdentity("x.txt", noBibliographic), null);
});

test("declaredIdentity and stripContainer agree on the SAME header boundary — one regex, not two", () => {
  // A real risk this repo's own postmortems have caught before (DEF/EVA's
  // Array.find, synthesize's String.includes): two copies of "where does
  // the header end" drifting apart. Constructing the marker text once and
  // checking both functions against it pins that they cannot silently
  // diverge.
  const marker = "*** START OF THIS PROJECT GUTENBERG EBOOK SOMETHING ***";
  const text = `Title: Something\n\nAuthor: Someone\n\n${marker}\n\nBody text here.`;
  const { offset } = stripContainer(text);
  const d = declaredIdentity("x.txt", text);
  assert.equal(offset, text.indexOf(marker) + marker.length);
  assert.equal(d.ref, `x.txt#0-${text.indexOf(marker)}`);
});

test("identifyMaterial merges declared identity into the prose branch only", () => {
  const withHeader = identifyMaterial("pg2600.txt", GUTENBERG_HEADER);
  assert.equal(withHeader.kind, "prose");
  assert.deepEqual(withHeader.declared, declaredIdentity("pg2600.txt", GUTENBERG_HEADER));

  // Ordinary prose with no Gutenberg header carries no declared field at
  // all — not declared: null padded in, an absent key, matching this
  // file's own guess: null-only-when-there-is-something-to-say discipline.
  const plain = identifyMaterial("notes.txt", "Just some ordinary notes.");
  assert.equal(plain.kind, "prose");
  assert.equal("declared" in plain, false);

  // A structured kind (CSV, JSON, HTML, code) never runs the Gutenberg
  // check at all — declaredIdentity is scoped to the prose fallback only.
  const csv = identifyMaterial("data.csv", "a,b,c\n1,2,3\n4,5,6\n");
  assert.equal(csv.kind, "table");
  assert.equal("declared" in csv, false);
});

test("buildSourceBlock surfaces the declared header, labeled as the source's own claim, addressed", () => {
  const chunks = [
    {
      text: "One of the next arrivals was a stout, heavily built young man...",
      identity: {
        kind: "prose",
        guess: null,
        certainty: "default",
        declared: {
          title: "War and Peace",
          author: "Leo Tolstoy",
          giver: "the source file's own declared header",
          ref: "pg2600.txt#0-797",
        },
      },
    },
  ];
  const block = buildSourceBlock(chunks);
  assert.match(block, /the source file's own declared header — Title: War and Peace, Author: Leo Tolstoy — pg2600\.txt#0-797/);
  assert.match(block, /One of the next arrivals/);
});

test("buildSourceBlock is byte-identical to before this pass when no chunk carries a declared identity", () => {
  const chunks = [{ text: "plain passage text", identity: { kind: "prose", guess: null, certainty: "default" } }];
  assert.equal(buildSourceBlock(chunks), "MATERIAL — passages retrieved for this turn. Answer from these when they cover the question; if they do not, say so rather than filling the gap.\n\nplain passage text");
});

test("buildSourceBlock still draws the existing structural guess line when declared is absent", () => {
  const chunks = [{ text: "a,b\n1,2\n", identity: { kind: "table", guess: "a delimited table — rows and columns, not prose", certainty: "structure" } }];
  const block = buildSourceBlock(chunks);
  assert.match(block, /\(this looks like: a delimited table/);
});

test("buildSourceBlock draws BOTH lines when a chunk somehow carries both — declared first, disclosure not a choice between them", () => {
  const chunks = [
    {
      text: "body",
      identity: {
        kind: "table",
        guess: "a delimited table — rows and columns, not prose",
        certainty: "structure",
        declared: { title: "T", author: "A", giver: "g", ref: "x#0-1" },
      },
    },
  ];
  const block = buildSourceBlock(chunks);
  const declaredLine = block.indexOf("g — Title: T");
  const guessLine = block.indexOf("this looks like:");
  assert.ok(declaredLine >= 0 && guessLine >= 0 && declaredLine < guessLine);
});

test("declaredIdentity on the real pg2600.txt file on disk", () => {
  if (!existsSync(REAL_FIXTURE)) return; // the fixture may not be present in every checkout
  const text = readFileSync(REAL_FIXTURE, "utf8");
  const d = declaredIdentity("pg2600.txt", text);
  assert.equal(d.title, "War and Peace");
  assert.equal(d.author, "Leo Tolstoy");
});
