// activation-retrieval.test.mjs — retrieval as activation over the reading,
// through the REAL index, the REAL sentence splitter and the REAL measurement
// organ, on passages with real byte offsets (chunkSource), and through the
// real turn.
import test from "node:test";
import assert from "node:assert/strict";
import { mentionBook, activate, makeActivationRetrieval } from "./activation-retrieval.js";
import { chunkSource, retrieve } from "./source.js";
import { makeReferentIndex } from "./cast.js";
import { dmdWindow } from "../eoreader7/native/kernel/activation.js";
import { splitSentences } from "../eoreader7/native/adapters/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "../eoreader7/native/adapters/text/surfaces.js";

const indexFor = makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });
const TEXT = [
  "In the morning, Rodion Raskolnikov listened intently but with a sick sensation. By then Raskolnikov had murdered the old woman and her sister. Each day Razumihin came to see Raskolnikov.",
  "That evening Razumihin brought soup and sat with him, clumsy and kind. Later Razumihin told Raskolnikov about Porfiry Petrovich. Twice Porfiry Petrovich questioned Raskolnikov, and each time Porfiry smiled.",
  "The weather turned cold that week. Nobody spoke of the pawnbroker again. A letter arrived from the country.",
].join("\n\n");
const chunks = chunkSource("novel.txt", TEXT).map((c) => ({ ...c, source: "novel.txt", kind: "prose" }));
const index = indexFor(chunks);
const id = (name) => [...index.resolve(name)][0];
const book = mentionBook(chunks, index, { splitSentences });

test("the mention book: one row per sentence carrying an established referent, addresses that read back from the file (P5.2), and an id → sentences map", () => {
  assert.ok(book.sentences.length >= 5, `${book.sentences.length} sentences with a referent`);
  for (const s of book.sentences) assert.equal(TEXT.slice(s.start, s.end), s.text, `reads back: ${s.ref}`);
  assert.deepEqual(book.gaps, []);
  assert.ok(book.byId.get(id("Porfiry")).length >= 2, "Porfiry stands in two sentences");
  assert.ok(book.byId.get(id("Raskolnikov")).length >= 4);
  assert.equal(book.sentences.find((s) => /weather/.test(s.text)), undefined, "a sentence with no referent is not in the book");
});

test("activation: hop 0 is every sentence the asked-about referent stands in; hop 1 is what those sentences co-mention; the cut is measured at the sentence grain; nothing is a string match", () => {
  const r = activate({ question: "What does the book say about Porfiry?", index, book, dmdWindow });
  assert.equal(r.basis, "activation");
  assert.deepEqual(r.active, [id("Porfiry")]);
  assert.ok(r.passages.length >= 1 && r.passages[0].hop === 0);
  assert.match(r.passages[0].text, /Porfiry/);
  assert.ok(r.hop1.includes(id("Raskolnikov")), "Raskolnikov is co-mentioned with Porfiry");
  assert.ok(r.hop1.includes(id("Razumihin")), "Razumihin told him about Porfiry");
  assert.equal(typeof r.window, "number");
  for (const p of r.passages) assert.equal(TEXT.slice(p.start, p.end), p.text);
  const rodion = activate({ question: "What does the book say about Rodion?", index, book, dmdWindow });
  assert.deepEqual(rodion.active, [id("Raskolnikov")], "the other spelling activates the same referent");
});

test("a note on the ledger extends hop 1 to its other end; a question naming nothing binds to the last answer; a question resolving to no referent is a surface fallback, said so", () => {
  const notes = [{ subject: "Porfiry Petrovich", verb: "questioned", object: "Raskolnikov", witnesses: ["novel.txt#0-1~r"] }];
  const r = activate({ question: "Did Porfiry smile?", index, book, notes, dmdWindow });
  assert.ok(r.hop1.includes(id("Raskolnikov")));
  const bound = activate({ question: "And why did he smile?", transcript: [{ turn: 1, question: "q", answer: "Each time Porfiry smiled.", refs: [] }], index, book, dmdWindow });
  assert.deepEqual(bound.active, [id("Porfiry")]); assert.match(bound.activeBasis, /last answer/);
  const none = activate({ question: "What about the weather?", index, book, dmdWindow });
  assert.equal(none.basis, "surface"); assert.equal(none.passages.length, 0); assert.match(none.why, /no referent/);
});

test("makeActivationRetrieval: the turn's retrieveWith — activation when it reaches, the term retriever standing in when it does not, and the array says which", () => {
  const rw = makeActivationRetrieval({ index, book, dmdWindow, fallback: retrieve });
  const a = rw(chunks, "What does the book say about Porfiry?", 3, []);
  assert.equal(a.retrieval.basis, "activation"); assert.ok(a.length >= 1); assert.match(a[0].text, /Porfiry/);
  assert.ok(a.every((p) => p.ref.startsWith("novel.txt#") && TEXT.slice(p.start, p.end) === p.text));
  const s = rw(chunks, "What about the weather that week?", 3, []);
  assert.equal(s.retrieval.basis, "surface"); assert.match(s.retrieval.why, /term retrieval stood in/);
  assert.ok(s.length >= 1 && /weather/.test(s[0].text), "the term retriever found the weather paragraph");
});

test("through the real turn: activated sentences are handed once, verbatim, address-free; no raw passage; retrieval on the record", async () => {
  const { runHolonicTask } = await import("./holon.js");
  const { makeRelationReader } = await import("./hypergraph.js");
  const { discoverRelationVocab, extractRelations } = await import("../eoreader7/native/adapters/text/relations.js");
  const P = await import("../eoreader7/native/adapters/text/priors.js");
  const relationsFor = makeRelationReader({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, determiners: new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]), negationWords: P.NEGATION_WORDS });
  const seen = [];
  const reader = relationsFor(chunks, { pool: chunks });
  const rw = makeActivationRetrieval({ index, book, dmdWindow, fallback: retrieve, read: (t) => reader.read(t) });
  const r = await runHolonicTask({ task: "What does the book say about Porfiry?", chunks, planMode: "flat", retrieveWith: rw, dmdWindow, conversationIndex: index, makeReferentIndexFor: indexFor, makeRelationReader: relationsFor, call: async (m) => { seen.push(m); return "Porfiry Petrovich questioned Raskolnikov twice, and each time Porfiry smiled."; } });
  const sys = seen.map((m) => m.find((x) => x.role === "system")?.content ?? "").join("\n");
  assert.match(sys, /What the sources say, verbatim:\n(?:- [^\n]*\n)*- Twice Porfiry Petrovich questioned Raskolnikov, and each time Porfiry smiled\./, "the sentence carrying the act «questioned» is handed verbatim");
  assert.match(sys, /- Later Razumihin told Raskolnikov about Porfiry Petrovich\./, "and so is the one carrying «told» — two acts about Porfiry, two sentences");
  assert.equal(r.retrieval[0].grain, "act");
  assert.doesNotMatch(sys, /The weather turned cold/, "a sentence with no active referent is not handed");
  assert.doesNotMatch(sys, /novel\.txt#/, "no address reaches the mouth");
  assert.equal(r.retrieval[0].basis, "activation");
  assert.equal(r.resolutions?.[0]?.handed ?? r.sections[0].resolutions?.handed, "activated sentences");
});
