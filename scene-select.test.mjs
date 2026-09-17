import test from "node:test";
import assert from "node:assert/strict";
import { selectSceneClaims } from "./scene-select.js";

// the material's bound claims — some about Pierre/Natasha (the prompt's
// subjects), some about other characters entirely
const claims = [
  { end1: "Pierre", label: "rode", end2: "to the battle", refs: ["p#1"], offset: 10 },
  { end1: "Natasha", label: "waited", end2: "at home", refs: ["p#1"], offset: 30 },
  { end1: "the Emperor", label: "received", end2: "the report", refs: ["p#2"], offset: 50 },
  { end1: "a soldier", label: "mended", end2: "a fence", refs: ["p#3"], offset: 70 },
];

test("a claim whose end touches the prompt's referents is selected", () => {
  const r = selectSceneClaims({ prompt: "Pierre rode out to the battle, uneasy", claims, sameAct: (a, b) => a === b });
  assert.ok(r.selected.some((c) => c.end1 === "Pierre"), "Pierre's claim selected by word touch");
  assert.ok(r.selected.some((c) => c.end1 === "Natasha") === false, "Natasha not mentioned in this prompt");
});

test("a claim whose ends share NO content word with the prompt is withheld, with the reason", () => {
  const r = selectSceneClaims({ prompt: "Pierre rode out to the battle", claims, sameAct: (a, b) => a === b });
  assert.ok(r.withheld.some((w) => /soldier/.test(w.claim)), "the unrelated soldier claim is withheld");
  assert.ok(r.withheld.every((w) => w.reason), "every withheld claim names its reason");
});

test("selection never touches a stopword-only match", () => {
  const junk = [{ end1: "the", label: "and", end2: "with", refs: ["p#9"], offset: 1 }];
  const r = selectSceneClaims({ prompt: "the and with", claims: junk, sameAct: (a, b) => a === b });
  assert.equal(r.selected.length, 0, "a claim whose ends are all stopwords is never selected");
  assert.equal(r.withheld.length, 1);
});

test("selection sorts by byte offset — document order, never guessed", () => {
  const r = selectSceneClaims({ prompt: "Pierre the soldier Emperor Natasha", claims, sameAct: (a, b) => a === b });
  const offsets = r.selected.map((c) => c.offset);
  assert.deepEqual(offsets, [...offsets].sort((a, b) => a - b), "selected claims stay in document order");
});

test("sameAct folds inflectional paraphrase into the touch test", () => {
  const morphed = [{ end1: "riding", label: "went", end2: "to the field", refs: ["p#1"], offset: 5 }];
  const r = selectSceneClaims({ prompt: "Pierre rode to the battle", claims: morphed, sameAct: (a, b) => a === b || (a === "riding" && b === "rode") || (a === "rode" && b === "riding") });
  assert.ok(r.selected.length >= 1, "an inflectional form of the prompt's word touches");
});