// absent-ask.test.mjs — real organs (UD POS prior, UniMorph, grounding atoms), no stand-ins.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { absentAsk } from "./absent-ask.js";
import { classifyWord } from "../eoreader7/native/adapters/text/wordclass.js";
import { createLemmatizer, morphologyFromPrior } from "../eoreader7/native/adapters/text/morphology.js";
import * as P from "../eoreader7/native/adapters/text/priors.js";
import { CLAIM_STOPWORDS, splitSentences, extractAtoms } from "../eoreader7/native/organs/grounding.js";

const FIX = new URL("../eoreader7/native/eval/the-fold/fixtures/", import.meta.url).pathname;
const posPrior = JSON.parse(readFileSync(`${FIX}pos-prior-eng.json`, "utf8"));
const raw = JSON.parse(readFileSync(`${FIX}unimorph-morphology-prior.json`, "utf8"));
const organs = {
  closed: new Set([...CLAIM_STOPWORDS, ...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS, ...P.INTERROGATIVE_PRONOUNS.keys(), ...P.MANNER_REASON_PRONOUNS, ...P.ANAPHORIC_PRONOUNS]),
  classesOf: (w) => classifyWord(w, { posPrior }).candidates,
  sameForm: createLemmatizer(morphologyFromPrior(raw).forms, { language: raw.language }).sameAct,
  verbForms: new Set(JSON.parse(readFileSync(`${FIX}unimorph-eng-verb-forms.json`, "utf8"))),
  interrogatives: P.INTERROGATIVE_PRONOUNS,
  sentencesOf: (t) => splitSentences(t).map((x) => x.text ?? x),
  atomsIn: (s) => extractAtoms(s),
};
const DOC = [
  "The Vellmar bridge reopened to traffic on 4 March 2031 after a two-year closure. The reopening ceremony was led by the harbour master, Ines Okafor.",
  "The bridge carries 12,000 vehicles a day. The older Karst tunnel, two kilometres upstream, carries 9,500 vehicles a day.",
  "Construction was funded by a regional grant. The contractor, Halden Works, finished the steel deck in November 2030, four months behind schedule.",
  "A separate project, the Ostrin footbridge, opened in June 2029 and is managed by the parks department. Its opening was led by councillor Pavel Draga.",
];
const fires = (q) => absentAsk(q, DOC, organs);

test("declares the relation the material never states (and only that)", () => {
  assert.deepEqual(fires("How much did the Vellmar bridge cost to build?").absent, ["cost", "build"]);
  assert.deepEqual(fires("Who designed the Vellmar bridge?").absent, ["designed"]);
});
test("the false-fire null: answerable questions stay quiet", () => {
  for (const q of ["When did the Vellmar bridge reopen?", "Who led the Vellmar bridge reopening, and what is that person's role?", "Who led the opening of the Ostrin footbridge?", "Which carries more vehicles a day, the Vellmar bridge or the Karst tunnel, and by how many?", "How many months behind schedule was the steel deck, and who was the contractor?", "And who led that ceremony?", "Who headed the Vellmar bridge reopening ceremony?"])
    assert.equal(fires(q), null, q);
});
test("a question about nothing the material holds is not this void", () => assert.equal(fires("Who designed the Eiffel tower?"), null));
test("the line is a plain fact, no prohibition and no apparatus talk", () => {
  const l = fires("Who designed the Vellmar bridge?").line;
  assert.doesNotMatch(l, /\b(don't|do not|never|must|document|retriev|passage|search)/i);
});
test("missing organs mean no declaration, never a wrong one", () => assert.equal(absentAsk("Who designed the Vellmar bridge?", DOC, {}), null));
