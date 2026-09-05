import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { admitPassages, readOnArrival, unreadExtent } from "./read-on-arrival.js";
import { recordIdentity } from "./record-log.js";
import { makeHyperlexicon } from "./hyperlexicon.js";
import { makeRelationReader } from "./hypergraph.js";
import { chunkSource, tokenize, blankLabelRows } from "./source.js";
import { adaptTaskLog } from "./consequence.js";
import * as TL from "../eoreader7/native/kernel/task-log.js";
import { cellOf, GRAINS } from "../eoreader7/native/kernel/cube.js";
import { splitSentences } from "../eoreader7/native/adapters/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "../eoreader7/native/adapters/text/surfaces.js";
import { resolvePronouns } from "../eoreader7/native/adapters/text/pronouns.js";
import { discoverRelationVocab, extractRelations } from "../eoreader7/native/adapters/text/relations.js";
import * as P from "../eoreader7/native/adapters/text/priors.js";

// The REAL door and the REAL production reader over a built source (the
// product assay's own corpus, P97), so what is pinned is the app's path.
const FIX = new URL("../eoreader7/native/eval/the-fold/fixtures/", import.meta.url).pathname;
const posPrior = JSON.parse(readFileSync(`${FIX}pos-prior-eng.json`, "utf8"));
const verbForms = new Set(JSON.parse(readFileSync(`${FIX}unimorph-eng-verb-forms.json`, "utf8")));
const relationsFor = makeRelationReader({
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize,
  posPriorFor: () => posPrior, verbForms, oovLexicon: verbForms, nounPhraseSubjects: true, phrasalPredicates: true, attestedVerbs: true,
  determiners: new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]), negationWords: P.NEGATION_WORDS,
  blankFurniture: (t) => blankLabelRows(t, { minRun: 4, maxCell: 60 }), resolvePronouns,
});
const hl = makeHyperlexicon({ ...adaptTaskLog({ createTaskLog: TL.createTaskLog, append: TL.append, ENTRY_KINDS: TL.ENTRY_KINDS, OPERATOR_BASIS: TL.OPERATOR_BASIS, GRAINS }), projectTasks: TL.projectTasks, cellOf });
const TEXT = [
  "Amelia Hartley founded the Northgate Observatory in 1887. Rowan Vale preceded Marta Quill.",
  "The Northgate Observatory opened in 1889. Owen Blythe repaired the great refractor.",
  "Marta Quill preceded Owen Blythe. Owen Blythe repaired the great refractor.",
].join("\n\n");
const passages = () => chunkSource("northgate.txt", TEXT);
const FRAME = { reader: "test", organs: { x: 1 } };
const noYield = async () => {};
const fold = (log) => JSON.stringify(hl.foldWithStanding(log));

test("a source is read on arrival: every passage admitted in order, notes on the ledger before any question, the door's refusals carried", async () => {
  const ps = passages();
  assert.ok(ps.length >= 3, `the fixture chunks to ${ps.length} passages`);
  const seen = [];
  const r = await readOnArrival({ name: "northgate.txt", passages: ps, relationsFor, hyperlexicon: hl, frame: FRAME, recipe: "r1", yieldFn: noYield, onProgress: (p) => seen.push(p.read) });
  assert.equal(r.cursor, ps.length);
  assert.equal(r.read, ps.length);
  assert.deepEqual(seen, ps.map((_, i) => i + 1), "progress is reported per passage, in order");
  const notes = hl.foldWithStanding(r.log);
  assert.ok(notes.length >= 4, `${notes.length} notes`);
  assert.ok(notes.some((n) => /amelia hartley/i.test(n.subject)));
  assert.ok(Array.isArray(r.turnedAway), "refusals are returned, never discarded");
  assert.equal(r.pool.passages, ps.length, "the pool the reader was built over is declared");
  assert.equal(JSON.stringify(hl.frameOf(r.log).declared), JSON.stringify(FRAME), "the ledger is born with the reader's frame");
});

test("resumed from its cursor, a read is byte-identical to a straight read — the cursor is a real bookmark", async () => {
  const ps = passages();
  const straight = await readOnArrival({ name: "n", passages: ps, relationsFor, hyperlexicon: hl, frame: FRAME, recipe: "r1", yieldFn: noYield });
  const head = await readOnArrival({ name: "n", passages: ps.slice(0, 2), relationsFor: () => relationsFor(ps, { pool: ps }), hyperlexicon: hl, frame: FRAME, recipe: "r1", yieldFn: noYield });
  const resumed = await readOnArrival({ name: "n", passages: ps, relationsFor, hyperlexicon: hl, ledger: head.log, frame: FRAME, recipe: "r1", cursor: 2, yieldFn: noYield });
  assert.equal(resumed.resumed, true);
  assert.equal(resumed.read, ps.length - 2);
  assert.equal(fold(resumed.log), fold(straight.log));
  assert.equal(await recordIdentity(resumed.log), await recordIdentity(straight.log));
});

test("a suffix never alters or removes a prefix note's own witnesses and spans; it may only ADD a witness (corroboration), and a control that would remove one fails", async () => {
  const ps = passages();
  const rel = relationsFor(ps, { pool: ps });
  const witnessFor = (p) => `${p.ref}~r1`;
  const prefix = admitPassages(hl, null, ps.slice(0, 2), { read: rel.read, witnessFor, frame: FRAME });
  const whole = admitPassages(hl, null, ps, { read: rel.read, witnessFor, frame: FRAME });
  const before = new Map(hl.foldWithStanding(prefix.log).map((n) => [n.id, n]));
  const after = new Map(hl.foldWithStanding(whole.log).map((n) => [n.id, n]));
  assert.ok(before.size >= 2);
  for (const [id, n] of before) {
    const m = after.get(id);
    assert.ok(m, `prefix note ${id} survives the suffix`);
    for (const w of n.witnesses) assert.ok(m.witnesses.includes(w), `witness ${w} kept`);
    for (const sp of n.spans) assert.ok(m.spans.some((x) => x.ref === sp.ref && x.text === sp.text), `span ${sp.ref} kept`);
  }
  // The suffix restates the repair (passage 3 repeats passage 2's sentence):
  // that note GAINS a witness — corroboration is the one change a suffix may
  // make to a prefix note.
  const repaired = [...after.values()].find((n) => /owen blythe/i.test(n.subject) && n.verb === "repaired");
  assert.ok(repaired && repaired.witnesses.length >= 2, "the restated fact gained a witness from the suffix");
  // The control that must fail: a "suffix" that CONCEDES a prefix note is
  // not a read, and the prefix witnesses do not survive it.
  const conceded = hl.concede(whole.log, [...before.keys()][0], { trigger: "control: a suffix that withdraws is not a suffix" });
  const gone = new Map(hl.foldWithStanding(conceded.refused ? whole.log : conceded.log).map((n) => [n.id, n]));
  assert.ok(!gone.has([...before.keys()][0]), "the control removed a prefix note — the invariant can fail, and this is what failing looks like");
});

test("a second recipe over the same passages is a second instrument, never a re-count of the first", async () => {
  const ps = passages();
  const one = await readOnArrival({ name: "n", passages: ps, relationsFor, hyperlexicon: hl, frame: FRAME, recipe: "r1", yieldFn: noYield });
  const again = await readOnArrival({ name: "n", passages: ps, relationsFor, hyperlexicon: hl, ledger: one.log, frame: FRAME, recipe: "r1", yieldFn: noYield });
  assert.equal(fold(again.log), fold(one.log), "the same recipe re-read changes nothing (hear is idempotent by witness)");
  const two = await readOnArrival({ name: "n", passages: ps, relationsFor, hyperlexicon: hl, ledger: one.log, frame: FRAME, recipe: "r2", yieldFn: noYield });
  const n = hl.foldWithStanding(two.log).find((x) => /amelia hartley/i.test(x.subject));
  assert.equal(n.sources, 1, "one source");
  assert.equal(n.instruments, 2, "two instruments");
});

test("an exhausted cursor reads nothing and says so; the unread extent is typed for a question asked mid-read", async () => {
  const ps = passages();
  const r = await readOnArrival({ name: "n", passages: ps, relationsFor, hyperlexicon: hl, cursor: ps.length, yieldFn: noYield });
  assert.equal(r.read, 0);
  assert.equal(r.log, null);
  assert.equal(unreadExtent({ name: "n", cursor: ps.length, total: ps.length }), null);
  const u = unreadExtent({ name: "n", cursor: 1, total: ps.length });
  assert.equal(u.type, "unread_extent");
  assert.equal(u.unread, ps.length - 1);
  await assert.rejects(() => readOnArrival({ name: "n", passages: null, relationsFor, hyperlexicon: hl }), /passages/);
});
