// resolutions.test.mjs — the discourse at three resolutions, computed from the
// record through the REAL referent index and the REAL measurement organ,
// rendered by template, and firewall-clean. The fixture spells one being two
// ways so identity is the index's; the transcript pivots at turn 4 so the
// atmosphere has a real cut to find.
import test from "node:test";
import assert from "node:assert/strict";
import { atmosphereBlock, lensBlock, paradigmBlock, resolutionBlocks, activeReferents, dmdCut, RECURRENCE_FLOOR, lensCut } from "./resolutions.js";
import { apparatusMentions } from "./firewall.js";
import { makeReferentIndex } from "./cast.js";
import { dmdWindow } from "../eoreader7/native/kernel/activation.js";
import { splitSentences } from "../eoreader7/native/adapters/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "../eoreader7/native/adapters/text/surfaces.js";

const indexFor = makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });
const PASSAGES = [
  { ref: "pg2554.txt#45324-48671", text: "In the morning, Rodion Raskolnikov listened intently but with a sick sensation. By then Raskolnikov had murdered the old woman and her sister. Each day Razumihin came to see Raskolnikov." },
  { ref: "pg2554.txt#48673-52190", text: "That evening Razumihin brought soup and sat with him, clumsy and kind. Later Razumihin told Raskolnikov about Porfiry Petrovich. Twice Porfiry Petrovich questioned Raskolnikov, and each time Porfiry smiled." },
];
const index = indexFor(PASSAGES);
const id = (name) => [...index.resolve(name)][0];
const TRANSCRIPT = [
  { turn: 1, question: "What does the book say about Razumihin?", answer: "Each day Razumihin came to see Raskolnikov.", refs: ["pg2554.txt#45324-48671"] },
  { turn: 2, question: "Why did he come?", answer: "That evening Razumihin brought soup and sat with him.", refs: ["pg2554.txt#48673-52190"] },
  { turn: 3, question: "So you're saying Razumihin cared for Raskolnikov — is that right?", answer: "Yes — that is what the sources say. Razumihin sat with Raskolnikov.", refs: ["pg2554.txt#48673-52190"] },
  { turn: 4, question: "What does the book say about Porfiry Petrovich?", answer: "Twice Porfiry Petrovich questioned Raskolnikov.", refs: ["pg2554.txt#48673-52190"] },
  { turn: 5, question: "And did Porfiry smile?", answer: "Each time Porfiry smiled.", refs: ["pg2554.txt#48673-52190"] },
];
const NOTES = [
  { subject: "Razumihin", verb: "brought", object: "soup", witnesses: ["pg2554.txt#48673-52190~r1"], sources: 1 },
  { subject: "Porfiry Petrovich", verb: "questioned", object: "Raskolnikov", witnesses: ["pg2554.txt#48673-52190~r1", "pg2554.txt#48673-52190~r1", "pg2554.txt#90000-91000~r1"], sources: 1 },
  { subject: "Porfiry", verb: "smiled", object: "", witnesses: ["pg2554.txt#48673-52190~r1"], sources: 1 },
  { subject: "Rodion Raskolnikov", verb: "murdered", object: "the old woman", witnesses: ["pg2554.txt#45324-48671~r1", "other.txt#10-20~r1"], sources: 2, disputedBy: [{ source: "other.txt" }] },
];
const VOIDS = [{ subject: "Porfiry", verb: "arrested", object: "Raskolnikov", scope: { sources: ["pg2554.txt"], read: 2, total: 2 } }];
const RECORDS = [{ turn: 4, gist: "Porfiry Petrovich questioned Raskolnikov twice.", refs: ["pg2554.txt#90000-91000"] }]; // a different address from turn 5's, so it is a different identity to the record cut (P45)
const clean = (text) => assert.deepEqual(apparatusMentions(text), [], `firewall: ${text.slice(0, 80)}`);

test("the fixture resolves the two spellings to one referent, and the active referents are the question's own, or the last answer's when it names none", () => {
  assert.equal(id("Rodion Raskolnikov"), id("Raskolnikov"));
  const own = activeReferents("What does the book say about Porfiry?", TRANSCRIPT, index);
  assert.deepEqual([...own.ids], [id("Porfiry")]); assert.match(own.basis, /question's own/);
  const bound = activeReferents("And why did he smile?", TRANSCRIPT, index);
  assert.ok(bound.ids.has(id("Porfiry"))); assert.match(bound.basis, /last answer/);
});

test("ATMOSPHERE: the ground is the run of exchanges sharing a referent, the cut is the first that shares nothing, and the last exchange is read as held or moved", () => {
  const a = atmosphereBlock({ question: "And did Porfiry smile?", transcript: TRANSCRIPT, index });
  assert.deepEqual(a.ground.turns, [4, 5], "the pivot at turn 4 is the cut");
  assert.ok(a.ground.ids.includes(id("Porfiry")));
  assert.ok(a.ground.before.includes(id("Razumihin")), "the previous ground is named");
  assert.match(a.lines[0], /^For 2 exchanges the conversation has stood on .*\[turn:4–5\]; it turned there at turn 4 from/);
  assert.doesNotMatch(a.text, /\[turn:|#\d+-\d+\]/, "the mouth-facing text carries no address; the lines keep theirs for the record");
  assert.match(a.lines[1], /^Cited on this ground so far: 1 place in pg2554\.txt\./);
  assert.match(a.lines[2], /brought nothing the ground had not already held/);
  clean(a.text);
  const moved = atmosphereBlock({ question: "x", transcript: [...TRANSCRIPT, { turn: 6, question: "Did he say anything to Raskolnikov?", answer: "Razumihin told Raskolnikov about Porfiry.", refs: [] }], index });
  assert.deepEqual(moved.ground.turns, [4, 6], "a question naming a referent the ground holds continues it");
  assert.match(moved.lines[2], /The last exchange brought Razumihin onto this ground/);
  const opened = atmosphereBlock({ question: "x", transcript: [...TRANSCRIPT, { turn: 6, question: "What about Razumihin now?", answer: "Razumihin told Raskolnikov about Porfiry.", refs: [] }], index });
  assert.deepEqual(opened.ground.turns, [6, 6], "a question naming only what the ground never held opens a new one");
  assert.equal(opened.ground.grounds, 3);
  assert.equal(atmosphereBlock({ question: "x", transcript: [], index }).text, "");
});

test("LENS: notes, voids and checked turns whose ends resolve to the active referents — grouped by referent, standing phrased from the ledger's own table, a dispute named, addresses carried", () => {
  const active = new Set([id("Porfiry")]);
  const l = lensBlock({ question: "What does the book say about Porfiry?", active, index, notes: NOTES, voids: VOIDS, records: RECORDS, transcript: TRANSCRIPT, dmdWindow });
  assert.match(l.text, /^What is said about Porfiry Petrovich:/);
  assert.match(l.lines.join("\n"), /Porfiry Petrovich — questioned→ Raskolnikov \[pg2554\.txt#48673-52190, pg2554\.txt#90000-91000\] \(stated once so far\)/, "the record line carries the addresses");
  assert.match(l.text, /Porfiry Petrovich — questioned→ Raskolnikov \(stated once so far\)/, "the handed text does not");
  assert.match(l.text, /looked for and not found so far: Porfiry — arrested→ Raskolnikov \(looked for in 1 source; an open gap, not a finding that it is false\)/);
  assert.match(l.lines.join("\n"), /earlier in this conversation \[turn:4\]: Porfiry Petrovich questioned Raskolnikov twice\./);
  assert.doesNotMatch(l.text, /Razumihin — brought/, "a note about another referent is not shown");
  assert.match(l.lines.join("\n"), /earlier in this conversation \[turn:5\]: Each time Porfiry smiled\./, "two checked turns citing two addresses are two identities");
  assert.equal(typeof l.windows.notes, "number");
  const same = lensBlock({ active, index, notes: NOTES, records: [{ turn: 4, gist: "Porfiry Petrovich questioned Raskolnikov twice.", refs: ["pg2554.txt#48673-52190"] }], transcript: TRANSCRIPT, dmdWindow });
  assert.equal(same.windows.records, 1, "a checked turn citing the same address as the later one adds no identity — the cut holds at one");
  clean(l.text);
  const r = lensBlock({ active: new Set([id("Raskolnikov")]), index, notes: NOTES, dmdWindow });
  assert.match(r.lines.join("\n"), /Rodion Raskolnikov — murdered→ the old woman \[pg2554\.txt#45324-48671, other\.txt#10-20\] \(read in 2 places; disputed by other\.txt — not settled\)/, "a note under dispute says so, and 'Rodion' resolves to the same referent");
  assert.doesNotMatch(r.text, /pg2554\.txt#|other\.txt#/);
  clean(r.text);
  assert.equal(lensBlock({ active: new Set(), index, notes: NOTES }).text, "");
});

test("PARADIGM: an act recurring between the same two referents at binding's floor, and what a referent most often stands in — from the ledger's own witness counts", () => {
  const active = new Set([id("Porfiry"), id("Raskolnikov")]);
  const p = paradigmBlock({ active, index, notes: NOTES, dmdWindow });
  assert.match(p.text, /^What recurs:/);
  assert.match(p.text, /«questioned» recurs between Porfiry Petrovich and .*Raskolnikov \(3 places\)\./);
  assert.match(p.text, /Porfiry Petrovich most often stands in «questioned»/);
  assert.doesNotMatch(p.text, /«brought»/, `a single witness is below the floor of ${RECURRENCE_FLOOR}`);
  clean(p.text);
  assert.equal(paradigmBlock({ active: new Set([id("Razumihin")]), index, notes: NOTES, dmdWindow }).text, "", "nothing recurs for Razumihin at the floor");
});

test("THE CUT is measured, never a count: with the organ the window is the shallowest depth reproducing the reach; without it the cut is declared and says so", () => {
  const rows = [
    { ids: new Set([id("Porfiry")]) }, { ids: new Set([id("Raskolnikov")]) }, { ids: new Set([id("Porfiry")]) }, { ids: new Set([id("Razumihin")]) },
    { ids: new Set([id("Raskolnikov")]) }, { ids: new Set([id("Porfiry")]) }, { ids: new Set([id("Porfiry")]) },
  ];
  const active = new Set([id("Porfiry"), id("Raskolnikov")]);
  const measured = dmdCut(rows, active, { dmdWindow });
  assert.equal(measured.window, 2, "two rows already carry both active referents; deeper changes nothing");
  assert.equal(measured.rows.length, 2);
  const declared = dmdCut(rows, active, {});
  assert.match(declared.basis, /declared/); assert.equal(declared.window, 5);
  assert.equal(dmdCut(rows, new Set([id("Razumihin")]), { dmdWindow }).window, 1, "one row carries the only active referent");
  assert.equal(dmdCut([{ ids: new Set(["nobody"]) }], active, { dmdWindow }).window, 0);
});

test("a measurement organ that throws is an unmeasured declared cut, never a ceiling", () => {
  const rows = Array.from({ length: 30 }, (_, i) => ({ ids: new Set([id("Porfiry")]), n: i }));
  const out = dmdCut(rows, new Set([id("Porfiry")]), { dmdWindow: () => { throw new Error("organ unavailable"); } });
  assert.equal(out.ceiling, false);
  assert.equal(out.gap, "measurement_threw");
  assert.match(out.basis, /organ threw/);
});

test("resolutionBlocks: level 0 is nothing, 1 the atmosphere, 2 adds the lens, 3 adds the paradigm; the whole text is firewall-clean and carries no apparatus word", () => {
  const base = { question: "What does the book say about Porfiry?", transcript: TRANSCRIPT, index, notes: NOTES, voids: VOIDS, records: RECORDS, dmdWindow };
  assert.equal(resolutionBlocks({ level: 0, ...base }).text, "");
  const one = resolutionBlocks({ level: 1, ...base }); assert.match(one.text, /^Where the conversation stands:/); assert.doesNotMatch(one.text, /What is said about/);
  const two = resolutionBlocks({ level: 2, ...base }); assert.match(two.text, /What is said about Porfiry Petrovich:/); assert.doesNotMatch(two.text, /What recurs:/);
  const three = resolutionBlocks({ level: 3, ...base }); assert.match(three.text, /What recurs:/);
  clean(three.text);
  assert.deepEqual(three.active.ids, [id("Porfiry")]);
  assert.equal(resolutionBlocks({ level: 3, ...base, index: null }).text, "", "no conversation index, no blocks — said in the basis");
});

test("the whole set is never a candidate: 30 notes with 30 distinct acts hand the ladder's top as a CEILING, said so; 30 notes carrying 3 acts converge below it, measured", () => {
  const mk = (i, verb) => ({ subject: "Raskolnikov", verb, object: `thing ${i}`, witnesses: [`novel.txt#${i * 10}-${i * 10 + 9}~r`], sources: 1 });
  const distinct = Array.from({ length: 30 }, (_, i) => mk(i, `act${i}`));
  const active = index.resolve("Raskolnikov");
  const c1 = lensCut({ active, index, notes: distinct, dmdWindow });
  assert.equal(c1.ceiling, true, "no rung reproduces 30 distinct acts");
  assert.equal(c1.window, 24, "the ladder's top is handed as the declared budget");
  assert.match(c1.basis, /^ceiling: no depth up to 24 reproduced the reach of all 30 rows/);
  assert.equal(c1.of, 30);
  const repeats = Array.from({ length: 30 }, (_, i) => mk(i, `act${i % 3}`));
  const c2 = lensCut({ active, index, notes: repeats, dmdWindow });
  assert.equal(c2.ceiling, false);
  assert.ok(c2.window <= 4 && c2.window >= 3, `converges where the three acts are all shown: ${c2.window}`);
  assert.match(c2.basis, /difference-that-makes-a-difference/);
  const few = Array.from({ length: 4 }, (_, i) => mk(i, `act${i}`));
  const c3 = lensCut({ active, index, notes: few, dmdWindow });
  assert.equal(c3.window, 4, "a set within the declared lines with no rung below it is handed whole");
  assert.equal(c3.ceiling, false);
});
