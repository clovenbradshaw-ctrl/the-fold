// Does the GFP `recorded` rung actually HELP? Controlled, mechanical, no witness.
// For every case: run the ladder WITH and WITHOUT the GFP notes+claims, and
// tabulate what `recorded` newly grounds (recall gained) and whether any
// adversarial negative (flip/typo/unrelated) is wrongly grounded (precision lost).
import { readFileSync } from "node:fs";
import { makeRelationReader } from "../hypergraph.js";
import { makeReferentIndex } from "../cast.js";
import { tokenize } from "../source.js";
import { splitSentences as engineSentences } from "../../eoreader7/native/adapters/text/spans.js";
import { splitSentences } from "../cite.js";
import { extractSurfaces, extractLeadingSurfaces, discoverReferents, namesCorefer, diaNorm } from "../../eoreader7/native/adapters/text/surfaces.js";
import { discoverRelationVocab, extractRelations } from "../../eoreader7/native/adapters/text/relations.js";
import * as enginePriors from "../../eoreader7/native/adapters/text/priors.js";
import { createLemmatizer, morphologyFromPrior } from "../../eoreader7/native/adapters/text/morphology.js";
import * as nativeTaskLog from "../../eoreader7/native/kernel/task-log.js";
import { cellOf, GRAINS } from "../../eoreader7/native/kernel/cube.js";
import { makeHyperlexicon } from "../hyperlexicon.js";
import { makeGfpGround, englishSlots, positionalSlots } from "../grounding-gfp.js";
import { groundOf } from "../ground-ladder.js";
const unimorphVerbForms = new Set(JSON.parse(readFileSync(new URL("../../eoreader7/native/eval/the-fold/fixtures/unimorph-eng-verb-forms.json", import.meta.url), "utf8")).filter((f) => typeof f === "string"));
const posPrior = JSON.parse(readFileSync(new URL("../priors-data/pos-prior-eng.json", import.meta.url), "utf8"));
const morphRaw = JSON.parse(readFileSync(new URL("../../eoreader7/native/eval/the-fold/fixtures/unimorph-morphology-prior.json", import.meta.url), "utf8"));
const mp = morphologyFromPrior(morphRaw);
const sameFormOrgan = createLemmatizer(mp.forms, { language: mp.language }).sameAct;
const READER_OPTS = { splitSentences: engineSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize, posPriorFor: () => posPrior, verbForms: unimorphVerbForms, oovLexicon: unimorphVerbForms, nounPhraseSubjects: true, phrasalPredicates: true, attestedVerbs: true, objectSpecificity: true, createLemmatizer: () => ({ sameAct: (a, b) => (sameFormOrgan ? sameFormOrgan(a, b) : String(a).toLowerCase() === String(b).toLowerCase()) }), morphologyIndex: {}, determiners: new Set([...enginePriors.DEFINITE_DETERMINERS, ...enginePriors.INDEFINITE_DETERMINERS]), negationWords: enginePriors.NEGATION_WORDS, firstPerson: enginePriors.FIRST_PERSON, leadingSurfaces: extractLeadingSurfaces };
const relationsFor = makeRelationReader(READER_OPTS);
const indexFor = makeReferentIndex(READER_OPTS);
const gfp = makeGfpGround({ makeNotes: makeHyperlexicon, slotsOf: englishSlots, taskLog: { createTaskLog: nativeTaskLog.createTaskLog, append: nativeTaskLog.append, projectTasks: nativeTaskLog.projectTasks, ENTRY_KINDS: nativeTaskLog.ENTRY_KINDS, OPERATOR_BASIS: nativeTaskLog.OPERATOR_BASIS, GRAINS, cellOf } });
const chunk = (m) => [{ start: 0, end: m.length, text: m.trim(), ref: "m.txt", terms: new Set(tokenize(m)) }];
const sentenceFor = (text, claim) => { const sents = splitSentences(String(text ?? "")).map((x) => x.trim()).filter(Boolean); const f = (t) => String(t ?? "").toLowerCase(); const firstWord = f(claim?.end1 ?? claim?.subject).split(" ")[0] ?? ""; if (!firstWord) return null; const label = f(claim?.label ?? claim?.verb); return sents.find((x) => f(x).includes(firstWord) && f(x).includes(label)) ?? null; };
function evaluate(mat, ans, { gfpOn }) {
  const passages = chunk(mat);
  const claims = (relationsFor(passages, { pool: passages }).read(ans)?.claims ?? []).map((k) => ({ ...k, sentence: sentenceFor(ans, k) }));
  const index = indexFor(passages);
  let notes = [], gfpClaims = [];
  if (gfpOn) { const { notes: n, claimsFor } = gfp({ passages }); notes = n; gfpClaims = claimsFor(ans); }
  const g = groundOf(ans, { claims: [...gfpClaims, ...claims], witness: null, notes, derived: [], disputes: null, passages, resolveName: (n) => index.resolve(n), model: "probe", groundingFindings: [], leadingNames: true });
  return { tier: g.tier, gfp: gfpOn ? gfpClaims.length : 0, notes: notes.length };
}
// TRUE restatements (should ground) and ADVERSARIAL negatives (must not).
const CASES = [
  { id: "EN-canonical", mat: "The capital of France is Paris.", ans: "Paris is the capital of France.", want: true },
  { id: "EN-yoda", mat: "The capital of France is Paris.", ans: "The capital of France, Paris is.", want: true },
  { id: "EN-passive", mat: "George Washington commanded the Continental Army during the American Revolution.", ans: "The Continental Army was commanded by George Washington during the American Revolution.", want: true },
  { id: "H2", mat: "ירושלים היא עיר הבירה של ישראל.", ans: "ירושלים היא בירת ישראל.", want: true },
  { id: "R2", mat: "Пушкин написал «Евгения Онегина» в 1830-х годах.", ans: "«Евгений Онегин» был написан Пушкиным в 1830-х годах.", want: true },
  { id: "EN-flip", mat: "The capital of France is Paris.", ans: "France is the capital of Paris.", want: false },
  { id: "T1-typo", mat: "המים רותחים במאה מעלות צלזיוס.", ans: "המים רוחים במאה מעלות צלזיוס.", want: false },
  { id: "EN-unrelated", mat: "The chemical symbol for gold is Au.", ans: "Paris is the capital of France.", want: false },
];
console.log("id            | without-GFP | with-GFP   | GFP claims | want");
let recGained = 0, wrongGained = 0, recBefore = 0;
for (const c of CASES) {
  const off = evaluate(c.mat, c.ans, { gfpOn: false });
  const on = evaluate(c.mat, c.ans, { gfpOn: true });
  const offG = off.tier !== "self", onG = on.tier !== "self";
  const gained = !offG && onG;
  const lost = offG && !onG;
  if (c.want && on.tier === "recorded" && off.tier !== "recorded") recGained++;
  if (!c.want && onG) wrongGained++;
  if (c.want && offG) recBefore++;
  const flag = (!c.want && onG) ? "  <-- WRONG" : (gained ? "  <-- gained" : (lost ? "  <-- LOST" : ""));
  console.log(`${c.id.padEnd(12)} | ${(off.tier+" "+offG).padEnd(11)} | ${(on.tier+" "+onG).padEnd(10)} | ${on.gfp}          | ${c.want}${flag}`);
}
console.log(`\nrecall: cases grounding before GFP=${recBefore}, newly via recorded=${recGained}, wrong new grounds=${wrongGained}`);
