// word-meaning.test.mjs — the omnilingual mechanical word-meaning organ:
// composed received priors (morphology + WordNet synsets + values), each
// language-declared and vendored. No model call anywhere.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeWordMeaning } from "./word-meaning.js";

const table = JSON.parse(readFileSync(new URL("../fold-stress-session/wordnet-synsets.en.json", import.meta.url).pathname, "utf8")).entries;
const synFn = (w) => {
  for (const [word, entries] of Object.entries(table)) if (word.includes(w) || w.includes(word)) return entries;
  return table[w] ?? null;
};
// a morphology stub (the real UniMorph is injected at the seam; here a small
// closed set pins the LAYER, not the lexicon)
const LEM = { burned: "burn", burns: "burn", stormed: "storm", storming: "storm" };
const morph = (a, b) => LEM[a] !== undefined && LEM[b] !== undefined && LEM[a] === LEM[b] && a !== b;

test("morphology bridges an inflection pair (stormed ≡ storming)", () => {
  const wm = makeWordMeaning({ morphology: morph });
  assert.equal(wm.sameMeaning("stormed", "storming").same, true);
  assert.equal(wm.sameMeaning("stormed", "storming").via, "morphology");
});

test("the WordNet synset closes the P74 synonymy wall (withdraw ≡ retreat)", () => {
  const wm = makeWordMeaning({ synsets: synFn });
  assert.equal(wm.sameMeaning("withdraw", "retreat").same, true);
});

test("the composed prior bridges destiny ≡ destined through the shared synset — the wall no single layer closed", () => {
  const wm = makeWordMeaning({ morphology: morph, synsets: synFn });
  const r = wm.sameMeaning("destiny", "destined");
  assert.equal(r.same, true);
  assert.equal(r.via, "synset (fate)");
});

test("an unrelated pair is the typed gap, never a guess", () => {
  const wm = makeWordMeaning({ morphology: morph, synsets: synFn });
  assert.deepEqual(wm.sameMeaning("saw", "wrote"), { same: false, via: "no_layer" });
});

test("identical folded surfaces are same via 'folded', cheapest layer first", () => {
  const wm = makeWordMeaning({});
  assert.equal(wm.sameMeaning("Rostopchín", "Rostopchin").via, "folded");
});