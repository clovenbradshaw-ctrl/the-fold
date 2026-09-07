// reading-log.test.mjs — the address book and the identity face as projections
// of the CONSTITUTIONAL READER's own log (READING-SPEC S1), through the real
// reader, the real perceiver and the real adapters; no scan of any text, no
// case anywhere. And the S24 control: on a caseless script the reader
// establishes nothing and the projection says so rather than returning a
// plausible wrong thing.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { foldReading, readingIndexFromLog, mentionBookFromLog, stepChunks } from "./reading-log.js";
import { activate } from "./activation-retrieval.js";
import { referentsOf } from "./dialogue.js";
import { chunkSource } from "./source.js";
import { createRecursiveReader } from "../eoreader7/kernel.js";
import { createCausalTextPerceiver, textEncounters, surfaceIndex, surfacesIn } from "../eoreader7/native/adapters/text/recursive.js";
import { reviseTextFold } from "../eoreader7/native/adapters/text/revision.js";
import { namesCorefer, diaNorm } from "../eoreader7/native/adapters/text/surfaces.js";
import { dmdWindow } from "../eoreader7/native/kernel/activation.js";
import { reconstruct } from "../eoreader7/native/kernel/fold.js";

const POS = JSON.parse(readFileSync(new URL("../eoreader7/legacy-eoreader6.1/bin/priors/pos/en-ud-ewt.json", import.meta.url), "utf8"));
// The reference assembly, as eval/read-cost.mjs builds it (P0: named) — refreshEvery 3 here instead of the reference 25, because a nine-sentence fixture never reaches a refresh and a referent is born at a refresh.
const makeReader = () => createRecursiveReader({
  perceivers: [createCausalTextPerceiver({ minRelationSurfaces: 2, refreshEvery: 3, posPrior: POS, descriptorAnchoring: { minActivation: 0.05, minMargin: 0.2 } })],
  adapters: { revise: reviseTextFold, retrieve: (_fold, evidence) => Object.freeze({ schema: "EORelevantFold@1", witnessed: Object.freeze([...evidence]), provisional: Object.freeze([]), expectations: Object.freeze([]), obligations: Object.freeze([]), exclusions: Object.freeze([]), unresolvedAlternatives: Object.freeze([]), activeFrames: Object.freeze([]), receivedPriors: Object.freeze([]) }) },
});
const TEXT = [
  "In the morning, Rodion Raskolnikov listened intently but with a sick sensation. By then Raskolnikov had murdered the old woman and her sister. Each day Razumihin came to see Raskolnikov.",
  "That evening Razumihin brought soup and sat with him, clumsy and kind. Later Razumihin told Raskolnikov about Porfiry Petrovich. Twice Porfiry Petrovich questioned Raskolnikov, and each time Porfiry smiled.",
  "Porfiry Petrovich came again the next day. Razumihin met Porfiry Petrovich on the stairs and Raskolnikov heard them. The weather turned cold that week.",
].join("\n\n");
const chunks = chunkSource("novel.txt", TEXT).map((c) => ({ ...c, source: "novel.txt", kind: "prose" }));

const reader = makeReader();
const stepped = await stepChunks(reader, chunks, { textEncounters, budgetMs: 0 });
const log = reader.getLog();
const ORG = { reconstruct, diaNorm, namesCorefer, surfaceIndex, surfacesIn };
const index = readingIndexFromLog(log, ORG);
const book = mentionBookFromLog(log, ORG);
const id = (name) => [...index.resolve(name)][0];

test("the reader's log holds encounters, mentions and referents; the projection attaches every mention to its encounter", () => {
  assert.equal(stepped.cursor, chunks.length);
  const f = foldReading(log, ORG);
  assert.ok(f.referents.size >= 3, `referents established: ${[...f.referents.keys()].join(", ")}`);
  assert.ok(f.encounters.length >= 8, `encounters: ${f.encounters.length}`);
  assert.ok(f.mentions.length >= 3, `mentions written by the reader at its refreshes: ${f.mentions.length}`);
  assert.ok(f.occurrences >= 8, `occurrences the reader saw from the first sentence: ${f.occurrences}`);
  const attached = f.encounters.filter((e) => e.ids.size).length;
  assert.ok(attached >= 6, `mentions attached to encounters: ${attached} of ${f.encounters.length} (referents: ${[...f.referents.keys()].join(", ")}; ambiguous ${f.ambiguous}, unresolved ${f.unresolved})`);
});

test("identity is the reading's: two spellings resolve to ONE referent with a birth address; resolveIn is caseless — a lowercase question resolves the same being", () => {
  assert.ok(id("Raskolnikov"), "Raskolnikov is a referent of the reading");
  assert.equal(id("Rodion Raskolnikov"), id("Raskolnikov"), "the two spellings are one being");
  assert.ok(id("Porfiry"), "Porfiry is a referent"); assert.equal(id("Porfiry Petrovich"), id("Porfiry"));
  assert.ok(index.resolveIn("what does the book say about raskolnikov and porfiry?").has(id("Raskolnikov")), "no case anywhere");
  assert.ok(index.resolveIn("what does the book say about raskolnikov and porfiry?").has(id("Porfiry")));
  assert.equal(index.resolveIn("the weather turned cold").size, 0);
  assert.ok(index.vocabulary.has("weather") && index.vocabulary.has("razumihin"), "the vocabulary is the material's own tokens");
  assert.equal(index.caseless, true);
  const r = referentsOf("So what about RASKOLNIKOV?", index);
  assert.ok(r.ids.has(id("Raskolnikov")), "dialogue.referentsOf goes through resolveIn when the index offers it");
});

test("the address book is a projection of the log: rows read back from the file, byId maps a referent to its encounters, and activation hands the Porfiry sentences from it", () => {
  for (const s of book.sentences) assert.equal(TEXT.slice(s.start, s.end), s.text, `reads back: ${s.ref}`);
  assert.deepEqual(book.gaps, []);
  assert.ok(book.byId.get(id("Porfiry")).length >= 3, "Porfiry stands in three encounters");
  const r = activate({ question: "What does the book say about Porfiry?", index, book, dmdWindow });
  assert.equal(r.basis, "activation"); assert.deepEqual(r.active, [id("Porfiry")]);
  assert.ok(r.passages.every((p) => TEXT.slice(p.start, p.end) === p.text));
  assert.ok(r.passages.some((p) => /Porfiry/.test(p.text)));
  assert.ok(r.hop1.includes(id("Raskolnikov")));
});

test("S24 control — a caseless script: the reader establishes no referent and the projection says so; activation falls back to surface with the reason, never a plausible wrong thing", async () => {
  const heb = chunkSource("heb.txt", "רסקולניקוב הלך לראות את פורפירי פטרוביץ'. רזומיחין הביא מרק. פורפירי פטרוביץ' חקר את רסקולניקוב פעמיים.").map((c) => ({ ...c, source: "heb.txt", kind: "prose" }));
  const rd = makeReader(); await stepChunks(rd, heb, { textEncounters, budgetMs: 0 });
  const hlog = rd.getLog();
  const hindex = readingIndexFromLog(hlog, ORG); const hbook = mentionBookFromLog(hlog, ORG);
  assert.equal(hindex.referents.size, 0, "a case-based surface organ cannot fire on Hebrew and establishes nothing (S24/S36)");
  const r = activate({ question: "מה הספר אומר על פורפירי?", index: hindex, book: hbook, dmdWindow });
  assert.equal(r.basis, "surface"); assert.match(r.why, /no referent/);
});
