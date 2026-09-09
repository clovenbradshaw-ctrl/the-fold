import { readFileSync } from "node:fs";
import { foldReading, readingIndexFromLog, mentionBookFromLog, stepChunks } from "../reading-log.js";
import { activate } from "../activation-retrieval.js";
import { chunkSource } from "../source.js";
import { createRecursiveReader } from "../../eoreader7/kernel.js";
import { createCausalTextPerceiver, textEncounters, surfaceIndex, surfacesIn } from "../../eoreader7/native/adapters/text/recursive.js";
import { reviseTextFold } from "../../eoreader7/native/adapters/text/revision.js";
import { namesCorefer, diaNorm } from "../../eoreader7/native/adapters/text/surfaces.js";
import { dmdWindow } from "../../eoreader7/native/kernel/activation.js";
import { reconstruct } from "../../eoreader7/native/kernel/fold.js";
import { stripContainer } from "../../eoreader7/native/adapters/text/spans.js";
import { dmdCut } from "../resolutions.js";
import { historyWindow } from "../dialogue.js";

const ORG = { reconstruct, diaNorm, namesCorefer, surfaceIndex, surfacesIn };

let POS = null;
try {
  POS = JSON.parse(readFileSync(new URL("../../eoreader7/legacy-eoreader6.1/bin/priors/pos/en-ud-ewt.json", import.meta.url), "utf8"));
} catch {
  try {
    POS = JSON.parse(readFileSync(new URL("../../priors-data/pos-prior-eng.json", import.meta.url), "utf8"));
  } catch {
    POS = null;
  }
}

const retrieve = (_fold, evidence) => Object.freeze({ schema: "EORelevantFold@1", witnessed: Object.freeze([...evidence]), provisional: Object.freeze([]), expectations: Object.freeze([]), obligations: Object.freeze([]), exclusions: Object.freeze([]), unresolvedAlternatives: Object.freeze([]), activeFrames: Object.freeze([]), receivedPriors: Object.freeze([]) });

const feed = async (reader, encounters, seq) => {
  let s = seq;
  for (const e of encounters) await reader.step({ ...e, sequencePosition: s++ });
  return s;
};

const translateOld = (entries) => entries.map((e) => {
  if (e?.schema === "EOReferentReassignment@1") return { schema: "EOReferentMerge@1", id: e.id, kept: e.to, folded: [e.from], witness: e.surface, encounterRef: e.encounterRef };
  if (e?.schema === "Observation@1" && Array.isArray(e.graphEntries)) {
    const graphEntries = e.graphEntries.map((g) => g?.schema === "EOReferentReassignment@1" ? { schema: "EOReferentMerge@1", id: g.id, kept: g.to, folded: [g.from], witness: g.surface, encounterRef: g.encounterRef } : g);
    return { ...e, graphEntries };
  }
  return e;
});

const graphOf = (entries) => entries.flatMap((e) => e?.schema === "Observation@1" ? (e.graphEntries ?? []) : []);
const reassignmentRows = (entries) => graphOf(entries).filter((g) => g?.schema === "EOReferentReassignment@1");
const countOf = (entries, schema) => graphOf(entries).filter((g) => g?.schema === schema).length;

const livesAs = (id, fold) => fold.referents.has(id) || [...fold.referents.values()].some((b) => b?.members?.includes(id));
const hostOf = (id, fold) => {
  if (fold.referents.has(id)) return id;
  for (const [face, rec] of fold.referents) if (rec?.members?.includes(id)) return face;
  return undefined;
};

function run(name, fn) {
  const bag = { passes: 0, total: 0, failures: [] };
  const check = (label, cond, detail = "") => {
    bag.total += 1;
    if (cond) bag.passes += 1;
    else bag.failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
  };
  fn(check);
  return { name, ...bag };
}

async function armA() {
  const stripped = stripContainer(readFileSync(new URL("../../pg2600.txt", import.meta.url), "utf8").slice(0, 60000));
  const reader = createRecursiveReader({
    perceivers: [createCausalTextPerceiver({ minRelationSurfaces: 2, refreshEvery: 25, posPrior: POS, descriptorAnchoring: { minActivation: 0.05, minMargin: 0.2 }, addresses: "founder" })],
    adapters: { revise: reviseTextFold, retrieve },
  });
  await stepChunks(reader, [{ text: stripped.text, source: "file:pg2600", start: stripped.offset }], { textEncounters, budgetMs: 0 });
  const log = reader.getLog();
  const NEW = foldReading(log, ORG);
  const rows = (reconstruct(log)?.graphEntries ?? []).filter((g) => g?.schema === "EOReferentReassignment@1");
  const OLD = foldReading(translateOld(log), ORG);
  const idx = readingIndexFromLog(log, ORG);
  const last = new Map();
  for (const row of rows) last.set(diaNorm(String(row.surface)).toLowerCase().trim(), row);
  return run("Arm A — reassignment separates live beings; a merge unions them (pg2600 founder)", (check) => {
    check("reader established encounters", NEW.encounters.length > 0, `encounters ${NEW.encounters.length}`);
    check("NEW recorded reassignments", NEW.identity.reassignments > 0, `reassignments ${NEW.identity.reassignments}`);
    check("OLD (translated) recorded none", OLD.identity.reassignments === 0, `reassignments ${OLD.identity.reassignments}`);
    check("being count does not shrink", NEW.identity.beings >= OLD.identity.beings, `NEW ${NEW.identity.beings} vs OLD ${OLD.identity.beings}`);
    check("fragment count unchanged", NEW.identity.fragments === OLD.identity.fragments, `NEW ${NEW.identity.fragments} vs OLD ${OLD.identity.fragments}`);
    check("mergedByRecord not inflated", NEW.identity.mergedByRecord <= OLD.identity.mergedByRecord, `NEW ${NEW.identity.mergedByRecord} vs OLD ${OLD.identity.mergedByRecord}`);
    check("conservation: old merges <= new merges + new reassignments", OLD.identity.mergedByRecord <= NEW.identity.mergedByRecord + NEW.identity.reassignments, `OLD ${OLD.identity.mergedByRecord} vs NEW ${NEW.identity.mergedByRecord} + ${NEW.identity.reassignments}`);
    check("reassignment rows counted consistently", rows.length === NEW.identity.reassignments, `rows ${rows.length}`);
    for (const row of rows) check(`both addresses live: ${row.from} -> ${row.to}`, livesAs(row.from, NEW) && livesAs(row.to, NEW));
    for (const row of last.values()) {
      const hits = [...idx.resolve(row.surface)];
      check(`surface routed to newest address: ${row.surface} -> ${row.to}`, hits.length === 1 && hits[0] === hostOf(row.to, NEW), `hits ${JSON.stringify(hits)}`);
    }
  });
}

async function armB() {
  const TEXT = [
    "Rodion Raskolnikov walked home.",
    "Raskolnikov met Razumihin.",
    "Razumihin brought soup.",
    "Raskolnikov thanked Razumihin.",
    "Porfiry Petrovich questioned Raskolnikov.",
    "Porfiry smiled.",
  ].join(" ");
  const encounters = textEncounters(TEXT, { source: "resume.txt", offset: 0 });
  const makeR = (seed = {}) => createRecursiveReader({
    seed,
    perceivers: [createCausalTextPerceiver({ minRelationSurfaces: 1, refreshEvery: 2 })],
    adapters: { revise: reviseTextFold, retrieve },
  });
  const fullR = makeR();
  const fullSeq = await feed(fullR, encounters, 0);
  const fullLog = fullR.getLog();
  const prefixR = makeR();
  const prefixSeq = await feed(prefixR, encounters.slice(0, 3), 0);
  const prefixLog = prefixR.getLog();
  const restR = makeR(reconstruct(prefixLog));
  await restR.restore(prefixLog);
  const restSeq = await feed(restR, encounters.slice(3), prefixSeq);
  const restLog = restR.getLog();
  const fullGraph = (await fullR.read()).fold?.graphEntries ?? [];
  const restGraph = (await restR.read()).fold?.graphEntries ?? [];
  const keyed = (g, schema, keyer) => g.filter((x) => x?.schema === schema).map(keyer).sort();
  const countBySchema = (g, schema) => g.filter((x) => x?.schema === schema).length;
  const mergeKey = (m) => `${m.kept}|${[...(m.folded ?? [])].sort().join("+")}`;
  const reassignKey = (r) => `${r.from}|${r.to}|${r.surface}`;
  return run("Arm B — resumption reproduces the fold, byte-identical", (check) => {
    check("sequence continues across the resume seam", restSeq === encounters.length && prefixSeq === 3, `${prefixSeq} -> ${restSeq}`);
    check("fold graphEntries identical", JSON.stringify(fullGraph) === JSON.stringify(restGraph));
    check("reassignment keys identical", JSON.stringify(keyed(fullGraph, "EOReferentReassignment@1", reassignKey)) === JSON.stringify(keyed(restGraph, "EOReferentReassignment@1", reassignKey)));
    check("merge keys identical", JSON.stringify(keyed(fullGraph, "EOReferentMerge@1", mergeKey)) === JSON.stringify(keyed(restGraph, "EOReferentMerge@1", mergeKey)));
    for (const s of ["EOReferent@1", "EOMention@1", "EOReferentGap@1"]) check(`${s} counts identical`, countBySchema(fullGraph, s) === countBySchema(restGraph, s));
  });
}

function armC() {
  const ref = (id, surfaces) => ({ schema: "EOReferent@1", id, surfaces, provenance: [], fedBy: [] });
  const canonical = [ref("ref:auto:pyotr", ["Pyotr", "Pyotr Petrovitch"]), ref("ref:auto:pyotr_petrovitch:78", ["Pyotr Petrovitch"]), ref("ref:auto:mr_luzhin", ["Pyotr Petrovitch Luzhin", "Mr Luzhin", "Pyotr Petrovitch", "Luzhin"]), ref("ref:auto:luzhin", ["Luzhin"]), ref("ref:auto:porfiry", ["Porfiry", "Porfiry Petrovitch"]), ref("ref:auto:petrovitch", ["Petrovitch"]), ref("ref:auto:raskolnikov", ["Raskolnikov"]), ref("ref:auto:rodion", ["Rodion", "Rodion Romanovitch", "Rodion Romanovitch Raskolnikov"]), { schema: "EOReferentMerge@1", id: "merge:3250:pp78:pyotr", kept: "ref:auto:pyotr_petrovitch:78", folded: ["ref:auto:pyotr"], witness: "Pyotr Petrovitch" }, { schema: "EOReferentMerge@1", id: "merge:11075:luzhin:pyotr", kept: "ref:auto:mr_luzhin", folded: ["ref:auto:pyotr"], witness: "Pyotr Petrovitch Luzhin" }];
  const fCanon = foldReading(canonical, ORG);
  const idxCanon = readingIndexFromLog(canonical, ORG);
  const reentry = [ref("old", ["Sonia"]), ref("new", ["Sofya Semyonovna"]), { schema: "EOReferentReassignment@1", id: "ra", from: "old", to: "new", surface: "Sonia" }];
  const NEW = foldReading(reentry, ORG);
  const OLD = foldReading(translateOld(reentry), ORG);
  const idxNew = readingIndexFromLog(reentry, ORG);
  const idxOld = readingIndexFromLog(translateOld(reentry), ORG);
  const oldSonia = [...idxOld.resolve("Sonia")];
  const oldSofya = [...idxOld.resolve("Sofya Semyonovna")];
  const mergeOnly = [ref("a", ["A"]), ref("b", ["B"]), { schema: "EOReferentMerge@1", id: "m", kept: "a", folded: ["b"], witness: "A and B" }];
  const fMerge = foldReading(mergeOnly, ORG);
  const marm = [ref("ref:auto:marmeladov", ["Marmeladov"])];
  const mNew = foldReading(marm, ORG);
  const mOld = foldReading(translateOld(marm), ORG);
  return run("Arm C — adjudicated identity controls", (check) => {
    check("canonical: fragments = 8", fCanon.identity.fragments === 8, `fragments ${fCanon.identity.fragments}`);
    check("canonical: merges by record = 2", fCanon.identity.mergedByRecord === 2, `mergedByRecord ${fCanon.identity.mergedByRecord}`);
    check("canonical: luzhin group", JSON.stringify([...(fCanon.referents.get("ref:auto:mr_luzhin")?.members ?? [])].sort()) === JSON.stringify(["ref:auto:luzhin", "ref:auto:mr_luzhin", "ref:auto:pyotr", "ref:auto:pyotr_petrovitch:78"]));
    check("canonical: petrovitch is its own being", fCanon.referents.has("ref:auto:petrovitch"), "ambiguous bare form retains its own being");
    check("canonical: partial rodion absorbs raskolnikov by containment", fCanon.referents.has("ref:auto:rodion") && !fCanon.referents.has("ref:auto:raskolnikov"));
    check("canonical: beings = 4", fCanon.referents.size === 4, `beings ${fCanon.referents.size}`);
    check("canonical: resolve climbs to the fullest address", JSON.stringify([...idxCanon.resolve("Pyotr Petrovitch")]) === JSON.stringify(["ref:auto:mr_luzhin"]));
    check("canonical: resolve keeps the ambiguous form apart", JSON.stringify([...idxCanon.resolve("Petrovitch")]) === JSON.stringify(["ref:auto:petrovitch"]));
    check("canonical: maximal munch on the long run", JSON.stringify([...idxCanon.resolve("Rodya Pyotr Petrovitch")]) === JSON.stringify(["ref:auto:mr_luzhin"]));
    check("reassignment NEW: both beings stay live", JSON.stringify([...NEW.referents.keys()].sort()) === JSON.stringify(["new", "old"]));
    check("reassignment NEW: recorded as reassignment, not merge", NEW.identity.reassignments === 1 && NEW.identity.mergedByRecord === 0, `reassignments ${NEW.identity.reassignments}, mergedByRecord ${NEW.identity.mergedByRecord}`);
    check("reassignment NEW: surface routes to the newest address", JSON.stringify([...idxNew.resolve("Sonia")]) === JSON.stringify(["new"]));
    check("reassignment OLD: translation unions into one being", OLD.referents.size === 1 && OLD.identity.mergedByRecord === 1 && OLD.identity.reassignments === 0);
    check("reassignment OLD: fragments preserved", OLD.identity.fragments === NEW.identity.fragments && OLD.identity.beings < NEW.identity.beings, `fragments ${OLD.identity.fragments}, beings ${OLD.identity.beings} vs ${NEW.identity.beings}`);
    check("reassignment OLD: the surface resolves to the kept being", oldSonia.length === 1 && oldSofya.length === 1 && JSON.stringify(oldSonia) === JSON.stringify(oldSofya) && OLD.referents.has(oldSonia[0]));
    check("merge-only: only EOReferentMerge unions", JSON.stringify([...fMerge.referents.keys()]) === JSON.stringify(["a"]) && fMerge.identity.mergedByRecord === 1);
    check("never-merge control: Marmeladov is his own being either way", JSON.stringify([...mNew.referents.keys()]) === JSON.stringify([...mOld.referents.keys()]) && mNew.identity.reassignments === 0 && mOld.identity.reassignments === 0);
  });
}

async function armD() {
  const TEXT = [
    "Rodion Raskolnikov walked home.",
    "Raskolnikov met Razumihin.",
    "Razumihin brought soup.",
    "Raskolnikov thanked Razumihin.",
    "Porfiry Petrovich questioned Raskolnikov.",
    "Porfiry smiled.",
  ].join(" ");
  const encounters = textEncounters(TEXT, { source: "resume.txt", offset: 0 });
  const makeR = (seed = {}) => createRecursiveReader({
    seed,
    perceivers: [createCausalTextPerceiver({ minRelationSurfaces: 1, refreshEvery: 2 })],
    adapters: { revise: reviseTextFold, retrieve },
  });
  const fullR = makeR();
  const prefixSeq = 0;
  await feed(fullR, encounters, prefixSeq);
  const fullLog = fullR.getLog();
  const prefixR = makeR();
  const pSeq = await feed(prefixR, encounters.slice(0, 3), 0);
  const prefixLog = prefixR.getLog();
  const restR = makeR(reconstruct(prefixLog));
  await restR.restore(prefixLog);
  await feed(restR, encounters.slice(3), pSeq);
  const restLog = restR.getLog();
  const rFullLog = [...prefixLog, ...restLog];
  const sIdx = readingIndexFromLog(fullLog, ORG);
  const rIdx = readingIndexFromLog(rFullLog, ORG);
  const sBook = mentionBookFromLog(fullLog, ORG);
  const rBook = mentionBookFromLog(rFullLog, ORG);
  const question = "What does the book say about Porfiry?";
  const sAct = activate({ question, index: sIdx, book: sBook, dmdWindow });
  const rAct = activate({ question, index: rIdx, book: rBook, dmdWindow });
  const history = [
    { role: "user", content: "Raskolnikov got soup from Razumihin." },
    { role: "assistant", content: "Razumihin brought the soup." },
  ];
  const query = "Who brought the soup?";
  const hS = historyWindow(history, query, { dmdWindow, index: sIdx });
  const hR = historyWindow(history, query, { dmdWindow, index: rIdx });
  const sP = [...sIdx.resolve("Porfiry")];
  const rP = [...rIdx.resolve("Porfiry")];
  const dS = dmdCut(sBook.sentences.map((s) => ({ ids: new Set(s.ids) })), new Set(sP), { dmdWindow });
  const dR = dmdCut(rBook.sentences.map((s) => ({ ids: new Set(s.ids) })), new Set(rP), { dmdWindow });
  const sRows = sIdx.referents ? [...sIdx.referents] : [];
  const rRows = rIdx.referents ? [...rIdx.referents] : [];
  const bookFace = (book) => book.sentences.map((s) => `${s.ref}|${s.start}|${s.end}|${s.text}`).join("\n");
  return run("Arm D — history and dmd controls: straight vs resumed", (check) => {
    check("referent face identical", JSON.stringify(sRows) === JSON.stringify(rRows));
    check("name resolution identical", JSON.stringify(sP) === JSON.stringify(rP));
    check("caseless resolveIn identical", JSON.stringify([...sIdx.resolveIn("who brought soup to raskolnikov?")]) === JSON.stringify([...rIdx.resolveIn("who brought soup to raskolnikov?")]));
    check("address book identical", bookFace(sBook) === bookFace(rBook));
    check("activation identical", sAct.basis === rAct.basis && JSON.stringify(sAct.active) === JSON.stringify(rAct.active) && JSON.stringify((sAct.passages ?? []).map((p) => p.ref ?? `${p.start}-${p.end}`)) === JSON.stringify((rAct.passages ?? []).map((p) => p.ref ?? `${p.start}-${p.end}`)));
    check("history window identical", hS.basis === hR.basis && hS.depth === hR.depth, `${hS.basis}/${hS.depth} vs ${hR.basis}/${hR.depth}`);
    check("dmd cut identical", JSON.stringify(dS) === JSON.stringify(dR));
  });
}

async function armS24() {
  const heb = chunkSource("heb.txt", "רסקולניקוב הלך לראות את פורפירי פטרוביץ'. רזומיחין הביא מרק. פורפירי פטרוביץ' חקר את רסקולניקוב פעמיים.").map((c) => ({ ...c, source: "heb.txt", kind: "prose" }));
  const rd = createRecursiveReader({
    perceivers: [createCausalTextPerceiver({ minRelationSurfaces: 2, refreshEvery: 3, posPrior: POS, descriptorAnchoring: { minActivation: 0.05, minMargin: 0.2 } })],
    adapters: { revise: reviseTextFold, retrieve },
  });
  await stepChunks(rd, heb, { textEncounters, budgetMs: 0 });
  const hlog = rd.getLog();
  const hindex = readingIndexFromLog(hlog, ORG);
  const hbook = mentionBookFromLog(hlog, ORG);
  const r = activate({ question: "מה הספר אומר על פורפירי?", index: hindex, book: hbook, dmdWindow });
  return run("S24 control — a caseless script establishes no referent", (check) => {
    check("no referent established", hindex.referents.size === 0, `referents ${hindex.referents.size}`);
    check("activation falls back to surface", r.basis === "surface", `basis ${r.basis}`);
    check("the reason names the absence", /no referent/.test(r.why ?? ""), `why ${r.why}`);
  });
}

console.log("paired-improvement — the driver's claims over the engine unchanged: 5 arms, 56 checks\n");
console.log("breadth — Arm A: pg2600 founder (first 60k chars), reassignment vs merge; Arm B/D: 6-sentence history straight vs resumed; Arm C: adjudicated identity corpus; S24: caseless Hebrew control\n");

const arms = [armA, armB, armC, armD, armS24];
const results = [];
for (const arm of arms) results.push(await arm());
let passes = 0, total = 0;
for (const r of results) {
  console.log(`— ${r.name} — ${r.passes}/${r.total} passed —`);
  for (const f of r.failures) console.log(`  [fail] ${f}`);
  passes += r.passes;
  total += r.total;
}
console.log(`\npaired-improvement assay: ${passes}/${total} passed`);
process.exitCode = passes === total ? 0 : 1;