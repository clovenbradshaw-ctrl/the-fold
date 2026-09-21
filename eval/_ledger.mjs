import { readFileSync } from "node:fs";
import { makeRelationReader } from "../hypergraph.js";
import { tokenize } from "../source.js";
import { splitSentences as engineSentences } from "../../eoreader7/native/adapters/text/spans.js";
import { splitSentences } from "../cite.js";
import { extractSurfaces, extractLeadingSurfaces, discoverReferents, namesCorefer, diaNorm } from "../../eoreader7/native/adapters/text/surfaces.js";
import { discoverRelationVocab, extractRelations } from "../../eoreader7/native/adapters/text/relations.js";
import * as enginePriors from "../../eoreader7/native/adapters/text/priors.js";
import { createLemmatizer, morphologyFromPrior } from "../../eoreader7/native/adapters/text/morphology.js";
import { makeHyperlexicon } from "../../eoreader7/native/organs/hyperlexicon.js";
import { groundOf } from "../ground-ladder.js";
const unimorphVerbForms = new Set(JSON.parse(readFileSync(new URL("../../eoreader7/native/eval/the-fold/fixtures/unimorph-eng-verb-forms.json", import.meta.url), "utf8")).filter((f) => typeof f === "string"));
const posPrior = JSON.parse(readFileSync(new URL("../priors-data/pos-prior-eng.json", import.meta.url), "utf8"));
const morphRaw = JSON.parse(readFileSync(new URL("../../eoreader7/native/eval/the-fold/fixtures/unimorph-morphology-prior.json", import.meta.url), "utf8"));
const mp = morphologyFromPrior(morphRaw);
const sameFormOrgan = createLemmatizer(mp.forms, { language: mp.language }).sameAct;
const READER_OPTS = { splitSentences: engineSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize, posPriorFor: () => posPrior, verbForms: unimorphVerbForms, oovLexicon: unimorphVerbForms, nounPhraseSubjects: true, phrasalPredicates: true, attestedVerbs: true, objectSpecificity: true, createLemmatizer: () => ({ sameAct: (a, b) => (sameFormOrgan ? sameFormOrgan(a, b) : String(a).toLowerCase() === String(b).toLowerCase()) }), morphologyIndex: {}, determiners: new Set([...enginePriors.DEFINITE_DETERMINERS, ...enginePriors.INDEFINITE_DETERMINERS]), negationWords: enginePriors.NEGATION_WORDS, firstPerson: enginePriors.FIRST_PERSON, leadingSurfaces: extractLeadingSurfaces };
const relationsFor = makeRelationReader(READER_OPTS);
const hy = makeHyperlexicon({ append: () => {}, fold: () => [] });
const cases = [
  { id: "H2", mat: "ירושלים היא עיר הבירה של ישראל.", ans: "ירושלים היא בירת ישראל." },
  { id: "C2", mat: "北京是中国的首都。", ans: "北京是中华人民共和国的首都。" },
  { id: "R2", mat: "Пушкин написал «Евгения Онегина» в 1830-х годах.", ans: "«Евгений Онегин» был написан Пушкиным в 1830-х годах." },
  { id: "EN4", mat: "The capital of France is Paris. Paris is the largest city in France.", ans: "Paris is the capital of France." },
];
for (const c of cases) {
  const passages = [{ start: 0, end: c.mat.length, text: c.mat.trim(), ref: "m.txt#0", terms: new Set(tokenize(c.mat)) }];
  const reader = relationsFor(passages, { pool: passages });
  // READ THE MATERIAL's OWN edges — hear them into a ledger.
  const matReport = reader.read(c.mat);
  const matClaims = (matReport?.claims ?? []).map((k) => ({ end1: k.end1 ?? k.subject, label: k.label ?? k.verb, end2: k.end2 ?? k.object, verdict: k.verdict }));
  let log = hy.createHyperlexicon({ frame: "probe" });
  const admitted = hy.admit(log, matClaims, { witness: "m.txt" });
  log = admitted.log;
  const notes = hy.foldHyperlexicon(log);
  console.log(`\n#${c.id} material edges heard: ${matClaims.length}, admitted: ${admitted.heard.length}, notes: ${notes.length}`);
  console.log("  notes:", JSON.stringify(notes.map((n) => `${n.subject} ${n.verb} ${n.object}`)));
  // Now ground the ANSWER against the ledger (rung 3 = recorded)
  const ansReport = reader.read(c.ans);
  const ansClaims = (ansReport?.claims ?? []).map((k) => ({ ...k, sentence: c.ans, end1: k.end1 ?? k.subject, label: k.label ?? k.verb, end2: k.end2 ?? k.object }));
  const g = groundOf(c.ans, { claims: ansClaims, witness: null, notes, derived: [], disputes: null, passages, resolveName: () => new Set(), model: "probe", groundingFindings: [], leadingNames: true });
  console.log(`  answer tier with ledger: ${g.tier} grounded=${g.tier !== "self"}`);
}
