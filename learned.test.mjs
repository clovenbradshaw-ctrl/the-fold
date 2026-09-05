import test from "node:test";
import assert from "node:assert/strict";
import { learnable, correctionEntry, learn, recallFor, learnedFacts, fromOutcomes, fromPremises, correctionsIn, ENTRY_KIND, RECALL_MAX } from "./learned.js";

const mk = (claimed, corrected, ref) => correctionEntry({ claimed, corrected, ref, question: "q", ts: 1 });

test("a correction is an entry in the chain's own shape, and its id is content identity so two machines dedup without knowing of each other", () => {
  const a = mk("The light was built in 1847.", "The light was built in 1841.", "p.md#0-99");
  assert.equal(a.kind, ENTRY_KIND);
  for (const k of ["id", "kind", "ts", "seq"]) assert.ok(k in a, `chain entries carry ${k}`);
  assert.equal(a.id, mk("The light was built in 1847.", "The light was built in 1841.", "p.md#0-99").id, "same content, same id");
  assert.notEqual(a.id, mk("Something else.", "x", "p.md#0-99").id);
  assert.equal(correctionEntry({ claimed: "  " }), null);
  const store = learn(learn([], a), a);
  assert.equal(store.length, 1, "learned twice, kept once");
});

test("what is recalled for a question is what shares its atoms or its words; unrelated corrections stay out (control)", () => {
  const store = [mk("Ada Rowe built it in 1847.", "Ada Rowe built it in 1841.", "p.md#0-99"), mk("Millennium ran until 2001.", "Millennium ran from 1996 to 1999.", "p.md#100-200"), mk("Something wholly unrelated about turbines.", null, null)];
  const rows = recallFor("When did Ada Rowe build the harbour light?", store);
  assert.equal(rows.length, 1); assert.match(rows[0].claimed, /Ada Rowe/);
  assert.equal(recallFor("What colour is the sky?", store).length, 0, "nothing in scope, nothing handed");
  const many = Array.from({ length: 10 }, (_, i) => mk(`Ada Rowe did thing ${i} in 18${40 + i}.`, `Ada Rowe did other thing ${i}.`, "p.md#0-99"));
  assert.equal(recallFor("Ada Rowe", many).length, RECALL_MAX, "capped");
});

test("the facts block says what was wrong and what the sources say, with the address, and never instructs about care", () => {
  const f = learnedFacts([mk("The light was built in 1847.", "The light was built in 1841.", "p.md#0-99"), mk("It had 700 keepers.", null, null)]);
  assert.match(f, /^Already found to be wrong on this material, so do not say it again:/);
  assert.match(f, /"The light was built in 1847\." was said here before and is not what the sources say; they say: "The light was built in 1841\." \[p\.md#0-99\]/);
  assert.match(f, /nothing read supports it/);
  assert.doesNotMatch(f, /careful|skeptic|hallucinat|be sure/i);
  assert.equal(learnedFacts([]), "");
});

test("a rewritten sentence and a standing flag are learned; a refused rewrite is not (the instrument does not know the right answer)", () => {
  const got = fromOutcomes({
    outcomes: [
      { outcome: "rewritten", sentence: "Built in 1847.", candidate: "Built in 1841." },
      { outcome: "refused", sentence: "Built in 1852.", candidate: "Built in 1853." },
      { outcome: "dropped", sentence: "It had 700 keepers." },
    ],
    flags: [{ sentence: "Ran until 2001.", flags: [], contradiction: { ref: "p.md#1-9", start: 1, end: 9 } }],
    question: "q",
  });
  assert.equal(got.length, 3);
  assert.ok(!got.some((e) => /1852/.test(e.claimed)), "a refused rewrite teaches nothing");
  assert.equal(got.find((e) => /1847/.test(e.claimed)).corrected, "Built in 1841.");
  assert.equal(got.find((e) => /2001/.test(e.claimed)).ref, "p.md#1-9");
});

test("the premise check's findings are learned too, marked as caught in the question", () => {
  const got = fromPremises({ contradicted: [{ text: "X ran until 2001.", contradiction: { text: "X ran until 1999.", ref: "p.md#5-9", start: 5, end: 9 } }], unverified: [{ text: "EFFECT_READS_THE_Sherman_RUN is the export." }] }, { question: "q" });
  assert.equal(got.length, 2);
  assert.ok(got.every((e) => e.caught === "premise"));
  assert.equal(got[0].corrected, "X ran until 1999.");
  assert.equal(got[1].corrected, null);
  assert.deepEqual(correctionsIn([...got, { kind: "turn", role: "user", content: "hi" }]).length, 2, "corrections are picked out of a mixed chain");
});

test("the learnability wall: an honest refusal is never learned (it would teach fabrication), nor is scaffolding, apparatus, or a sentence with nothing in it to be wrong about", () => {
  // Every one of these was actually recorded by the first learning run (S77 run 2).
  assert.match(learnable("The provided text snippets don't contain a passage about Scheria."), /stated absence/);
  assert.match(learnable("There is no mention of the harbour in these passages."), /stated absence/);
  assert.match(learnable("The date is not stated in the material."), /stated absence/);
  assert.match(learnable("* **What is the trigger's claim?**"), /scaffolding/);
  assert.match(learnable("## Context"), /scaffolding/);
  assert.match(learnable("The material confirms exactly: The void, system 2 (nothing else)."), /own words, echoed back/);
  assert.match(learnable("It matters a great deal to everyone involved."), /no name, number or date/);
  assert.match(learnable("Too short."), /too short/);
  assert.equal(learnable("The harbor light was built in 1847 by Ada Rowe."), null, "a real claim with an atom is learnable");
  const got = fromOutcomes({
    outcomes: [
      { outcome: "rewritten", sentence: "The provided text does not contain a date for Ada Rowe.", candidate: "x" },
      { outcome: "rewritten", sentence: "The harbor light was built in 1847.", candidate: "The harbor light was built in 1841." },
    ], flags: [{ sentence: "## Heading", flags: [], contradiction: null }], question: "q",
  });
  assert.equal(got.length, 1, "only the real claim is carried forward");
  assert.match(got[0].claimed, /1847/);
  assert.equal(fromPremises({ unverified: [{ text: "Nothing in the passages mentions Sherman." }], contradicted: [] }, {}).length, 0);
});
