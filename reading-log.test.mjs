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
  assert.ok(id("Porfiry")); assert.equal(id("Porfiry Petrovich"), id("Porfiry"));
  assert.ok(index.resolveIn("what does the book say about raskolnikov and porfiry?").has(id("Raskolnikov")));
  assert.ok(index.resolveIn("what does the book say about raskolnikov and porfiry?").has(id("Porfiry")));
  assert.equal(index.resolveIn("the weather turned cold").size, 0);
  assert.ok(index.vocabulary.has("weather") && index.vocabulary.has("razumihin")); assert.equal(index.caseless, true);
  assert.ok(referentsOf("So what about RASKOLNIKOV?", index).ids.has(id("Raskolnikov")));
});

test("the address book is a projection of the log: rows read back from the file, byId maps a referent to its encounters, and activation hands the Porfiry sentences from it", () => {
  for (const s of book.sentences) assert.equal(TEXT.slice(s.start, s.end), s.text, `reads back: ${s.ref}`);
  assert.deepEqual(book.gaps, []); assert.ok(book.byId.get(id("Porfiry")).length >= 3);
  const r = activate({ question: "What does the book say about Porfiry?", index, book, dmdWindow });
  assert.equal(r.basis, "activation"); assert.deepEqual(r.active, [id("Porfiry")]);
  assert.ok(r.passages.every((p) => TEXT.slice(p.start, p.end) === p.text)); assert.ok(r.passages.some((p) => /Porfiry/.test(p.text))); assert.ok(r.hop1.includes(id("Raskolnikov")));
});

test("S24 control — a caseless script: the reader establishes no referent and the projection says so; activation falls back to surface with the reason, never a plausible wrong thing", async () => {
  const heb = chunkSource("heb.txt", "רסקולניקוב הלך לראות את פורפירי פטרוביץ'. רזומיחין הביא מרק. פורפירי פטרוביץ' חקר את רסקולניקוב פעמיים.").map((c) => ({ ...c, source: "heb.txt", kind: "prose" }));
  const rd = makeReader(); await stepChunks(rd, heb, { textEncounters, budgetMs: 0 });
  const hlog = rd.getLog(); const hindex = readingIndexFromLog(hlog, ORG); const hbook = mentionBookFromLog(hlog, ORG);
  assert.equal(hindex.referents.size, 0, "a case-based surface organ cannot fire on Hebrew and establishes nothing (S24/S36)");
  const r = activate({ question: "מה הספר אומר על פורפירי?", index: hindex, book: hbook, dmdWindow });
  assert.equal(r.basis, "surface"); assert.match(r.why, /no referent/);
});

test("one being, many addresses: the reader's recorded merges fold its fragments; a partial form joins the ONE fuller being its own coreference organ places it in; a form inside two beings stays its own (S17's ambiguous bare form)", () => {
  const ref = (id, surfaces) => ({ schema: "EOReferent@1", id, surfaces, provenance: [], fedBy: [] });
  const log = [ref("ref:auto:pyotr", ["Pyotr", "Pyotr Petrovitch"]), ref("ref:auto:pyotr_petrovitch:78", ["Pyotr Petrovitch"]), ref("ref:auto:mr_luzhin", ["Pyotr Petrovitch Luzhin", "Mr Luzhin", "Pyotr Petrovitch", "Luzhin"]), ref("ref:auto:luzhin", ["Luzhin"]), ref("ref:auto:porfiry", ["Porfiry", "Porfiry Petrovitch"]), ref("ref:auto:petrovitch", ["Petrovitch"]), ref("ref:auto:raskolnikov", ["Raskolnikov"]), ref("ref:auto:rodion", ["Rodion", "Rodion Romanovitch", "Rodion Romanovitch Raskolnikov"]), { schema: "EOReferentMerge@1", id: "merge:3250:pp78:pyotr", kept: "ref:auto:pyotr_petrovitch:78", folded: ["ref:auto:pyotr"], witness: "Pyotr Petrovitch" }, { schema: "EOReferentMerge@1", id: "merge:11075:luzhin:pyotr", kept: "ref:auto:mr_luzhin", folded: ["ref:auto:pyotr"], witness: "Pyotr Petrovitch Luzhin" }];
  const f = foldReading(log, { diaNorm, namesCorefer }); assert.equal(f.identity.fragments, 8); assert.equal(f.identity.mergedByRecord, 2);
  const luzhin = f.referents.get("ref:auto:mr_luzhin"); assert.ok(luzhin); assert.deepEqual([...luzhin.members].sort(), ["ref:auto:luzhin", "ref:auto:mr_luzhin", "ref:auto:pyotr", "ref:auto:pyotr_petrovitch:78"]);
  assert.ok(f.referents.has("ref:auto:petrovitch")); assert.ok(f.identity.ambiguousForms >= 1); assert.ok(f.referents.has("ref:auto:rodion") && !f.referents.has("ref:auto:raskolnikov")); assert.equal(f.referents.size, 4);
  const idx = readingIndexFromLog(log, { diaNorm, namesCorefer }); assert.deepEqual([...idx.resolve("Pyotr Petrovitch")], ["ref:auto:mr_luzhin"]); assert.deepEqual([...idx.resolve("Petrovitch")], ["ref:auto:petrovitch"]); assert.deepEqual([...idx.resolve("Rodya Pyotr Petrovitch")], ["ref:auto:mr_luzhin"]);
});

test("a refresh reassignment changes surface routing without unioning live beings", () => {
  const entries = [{ schema: "EOReferent@1", id: "old", surfaces: ["Sonia"] }, { schema: "EOReferent@1", id: "new", surfaces: ["Sofya Semyonovna"] }, { schema: "EOReferentReassignment@1", id: "ra", from: "old", to: "new", surface: "Sonia" }];
  const folded = foldReading(entries, { diaNorm: (s) => s }); assert.deepEqual([...folded.referents.keys()].sort(), ["new", "old"]); assert.equal(folded.identity.reassignments, 1); assert.deepEqual([...readingIndexFromLog(entries, { diaNorm: (s) => s }).resolve("Sonia")], ["new"]);
});

test("only EOReferentMerge unions identities", () => {
  const entries = [{ schema: "EOReferent@1", id: "a", surfaces: ["A"] }, { schema: "EOReferent@1", id: "b", surfaces: ["B"] }, { schema: "EOReferentMerge@1", id: "m", kept: "a", folded: ["b"], witness: "A and B" }];
  const folded = foldReading(entries, { diaNorm: (s) => s }); assert.deepEqual([...folded.referents.keys()], ["a"]); assert.equal(folded.identity.mergedByRecord, 1);
});

test("EFFICIENCY: readingIndexFromLog and mentionBookFromLog over the SAME entries array fold once, not twice — counted, not assumed to have a hit rate (P157's rule); a distinct array (the log's own growth) is never served a stale memo", () => {
  let ncCalls = 0;
  const countingCorefer = (a, b) => { ncCalls += 1; return namesCorefer(a, b); };
  const freshLog = reader.getLog(); // getLog() spreads a NEW array every call — this one has never been folded
  ncCalls = 0;
  const idx1 = readingIndexFromLog(freshLog, { diaNorm, namesCorefer: countingCorefer });
  const afterFirst = ncCalls;
  ncCalls = 0;
  const book1 = mentionBookFromLog(freshLog, { diaNorm, namesCorefer: countingCorefer });
  assert.ok(afterFirst > 0, "the first face actually did coreference work");
  assert.equal(ncCalls, 0, "the second face over the identical array read the memoized fold — zero further coreference calls");
  assert.equal(idx1.referents.size, book1.referents, "both faces agree — the memo did not change the answer");
  // A second, content-equal but IDENTITY-DISTINCT array (another getLog() spread — the same shape a grown, concat'd log has) is a cache MISS, not a stale hit.
  const secondSpread = reader.getLog();
  assert.notEqual(secondSpread, freshLog, "getLog() never hands back the same array twice");
  ncCalls = 0;
  readingIndexFromLog(secondSpread, { diaNorm, namesCorefer: countingCorefer });
  assert.ok(ncCalls > 0, "a distinct array, even with identical content, is never served a stale memo");
});

test("EFFICIENCY: resolve() is memoized per index — a name that falls all the way to the coreference scan (no exact surface, no munch) pays that scan once, never on repeat", () => {
  let ncCalls = 0;
  const countingCorefer = (a, b) => { ncCalls += 1; return namesCorefer(a, b); };
  const idx = readingIndexFromLog(reader.getLog(), { diaNorm, namesCorefer: countingCorefer });
  const NAME = "Nobody This Material Ever Named";
  ncCalls = 0;
  const first = idx.resolve(NAME);
  const costOfFirst = ncCalls;
  assert.ok(costOfFirst > 0, "an unregistered name with no munch falls to the full coreference scan — real work on the first ask");
  assert.equal(first.size, 0, "and correctly resolves to nothing");
  ncCalls = 0;
  for (let i = 0; i < 50; i++) idx.resolve(NAME);
  assert.equal(ncCalls, 0, "fifty repeats of the same failed resolve() cost nothing further — the memo caches the miss too");
  assert.deepEqual([...idx.resolve(NAME)], [...first]);
});
