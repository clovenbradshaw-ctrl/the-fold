// eval/fold-core-assay.mjs — benchmark for dialogue.js, resolutions.js, reading-log.js
//
// Three arms, each exercising pure functions against a defined corpus.
// No model calls. Exercises referent resolution, anaphora, absence detection,
// self-consistency, history windowing, expectation, discourse blocks,
// DMD cuts, resolution assembly, reading-log projection, and index building.
//
//   node eval/fold-core-assay.mjs [--seed N]
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// ── dialogue.js ──
import {
  referentsOf, bindAnaphora, addressedBy, absenceLine, absenceOf,
  ownedRows, ownedLine, restatementOf, positionOn,
  selfContradictions, contradictionLine, historyWindow,
  expectationFrom, errorOf, expectationFacts, refKey
} from "../dialogue.js";
import { premisesOf, checkPremises } from "../correction.js";
import { answerBeforeTheModel, quoteBytes, recordCheck } from "../answerable.js";

// ── resolutions.js ──
import {
  atmosphereBlock, lensBlock, paradigmBlock, resolutionBlocks,
  activeReferents, dmdCut, RECURRENCE_FLOOR, lensCut
} from "../resolutions.js";
import { apparatusMentions } from "../firewall.js";

// ── reading-log.js ──
import { foldReading, readingIndexFromLog, mentionBookFromLog, stepChunks } from "../reading-log.js";
import { activate } from "../activation-retrieval.js";
import { chunkSource } from "../source.js";

// ── shared organs ──
import { makeReferentIndex } from "../cast.js";
import { createRecursiveReader } from "../../eoreader7/kernel.js";
import {
  createCausalTextPerceiver, textEncounters, surfaceIndex, surfacesIn
} from "../../eoreader7/native/adapters/text/recursive.js";
import { reviseTextFold } from "../../eoreader7/native/adapters/text/revision.js";
import {
  namesCorefer, diaNorm, extractSurfaces, discoverReferents
} from "../../eoreader7/native/adapters/text/surfaces.js";
import { splitSentences } from "../../eoreader7/native/adapters/text/spans.js";
import { dmdWindow } from "../../eoreader7/native/kernel/activation.js";
import { reconstruct } from "../../eoreader7/native/kernel/fold.js";

// ═══════════════════════════════════════════════════════════════════════════
// FIXTURES — the Raskolnikov / Razumihin / Porfiry passages and transcript
// from the unit tests, plus notes/voids/records for resolutions.
// ═══════════════════════════════════════════════════════════════════════════

const PASSAGES = [
  { ref: "pg2554.txt#45324-48671", text: "In the morning, Rodion Raskolnikov listened intently but with a sick sensation. By then Raskolnikov had murdered the old woman and her sister. Each day Razumihin came to see Raskolnikov." },
  { ref: "pg2554.txt#48673-52190", text: "That evening Razumihin brought soup and sat with him, clumsy and kind. Later Razumihin told Raskolnikov about Porfiry Petrovich. Twice Porfiry Petrovich questioned Raskolnikov, and each time Porfiry smiled." },
];
const CHUNKS = new Map(PASSAGES.map((p) => [p.ref, p]));

const indexFor = makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });
const index = indexFor(PASSAGES);
const id = (name) => [...index.resolve(name)][0];

const TRANSCRIPT = [
  { turn: 1, question: "What does the book say about Razumihin?", answer: "Each day Razumihin came to see Raskolnikov.", refs: ["pg2554.txt#45324-48671"] },
  { turn: 2, question: "Why did he come?", answer: "That evening Razumihin brought soup and sat with him.", refs: ["pg2554.txt#48673-52190"] },
  { turn: 3, question: "So you're saying Razumihin cared for Raskolnikov \u2014 is that right?", answer: "Yes \u2014 that is what the sources say. Razumihin sat with Raskolnikov.", refs: ["pg2554.txt#48673-52190"] },
  { turn: 4, question: "What does the book say about Porfiry Petrovich?", answer: "Twice Porfiry Petrovich questioned Raskolnikov.", refs: ["pg2554.txt#48673-52190"] },
  { turn: 5, question: "And did Porfiry smile?", answer: "Each time Porfiry smiled.", refs: ["pg2554.txt#48673-52190"] },
];
const LAST = {
  turn: 4,
  question: "Who is Raskolnikov?",
  answer: "Raskolnikov is a former student who murders the old pawnbroker. Razumihin, his friend, brings him soup.",
  refs: [PASSAGES[0].ref, PASSAGES[1].ref],
};

const NOTES = [
  { subject: "Razumihin", verb: "brought", object: "soup", witnesses: ["pg2554.txt#48673-52190~r1"], sources: 1 },
  { subject: "Porfiry Petrovich", verb: "questioned", object: "Raskolnikov", witnesses: ["pg2554.txt#48673-52190~r1", "pg2554.txt#48673-52190~r1", "pg2554.txt#90000-91000~r1"], sources: 1 },
  { subject: "Porfiry", verb: "smiled", object: "", witnesses: ["pg2554.txt#48673-52190~r1"], sources: 1 },
  { subject: "Rodion Raskolnikov", verb: "murdered", object: "the old woman", witnesses: ["pg2554.txt#45324-48671~r1", "other.txt#10-20~r1"], sources: 2, disputedBy: [{ source: "other.txt" }] },
];
const VOIDS = [{ subject: "Porfiry", verb: "arrested", object: "Raskolnikov", scope: { sources: ["pg2554.txt"], read: 2, total: 2 } }];
const RECORDS = [{ turn: 4, gist: "Porfiry Petrovich questioned Raskolnikov twice.", refs: ["pg2554.txt#90000-91000"] }];

// ═══════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const seedArg = args.includes("--seed") ? Number(args[args.indexOf("--seed") + 1]) : 7;
let seed = seedArg || 7;
const rng = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const clean = (text) => apparatusMentions(text).length === 0;
const pad = (x, n) => String(x).padStart(n);

/** Run a named test, catching throws. Returns { name, pass, detail }. */
function run(name, fn) {
  try {
    fn();
    return { name, pass: true, detail: "" };
  } catch (e) {
    return { name, pass: false, detail: String(e.message ?? e).slice(0, 120) };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ARM 1: DIALOGUE
// ═══════════════════════════════════════════════════════════════════════════

function armDialogue() {
  const results = [];
  const add = (name, fn) => results.push(run(name, fn));

  // ── referentsOf ──
  add("referentsOf resolves named referents", () => {
    const r = referentsOf("What did Rodion Raskolnikov say to Sonia about Razumihin?", index);
    assert.ok(r.ids.size >= 2, `resolved ${r.ids.size} referents`);
    assert.deepEqual(r.unresolved, ["Sonia"]);
  });

  // ── bindAnaphora ──
  add("bindAnaphora binds pronouns to last answer", () => {
    const b = bindAnaphora("Why did he do it?", LAST, index);
    assert.ok(b.ids.length >= 2);
    assert.equal(b.ids[0], [...index.resolve("Raskolnikov")][0]);
  });
  add("bindAnaphora binds passage refs", () => {
    const p = bindAnaphora("Did the book actually include those passages?", LAST, index);
    assert.deepEqual(p.refs, LAST.refs);
  });
  add("bindAnaphora own referents: nothing bound", () => {
    assert.deepEqual(
      bindAnaphora("What does the book say about Razumihin?", LAST, index).ids,
      []
    );
  });
  add("bindAnaphora null transcript: nothing bound", () => {
    assert.deepEqual(
      bindAnaphora("Why did he do it?", null, index).ids,
      []
    );
  });

  // ── addressedBy ──
  add("addressedBy detects named referent", () => {
    const q = referentsOf("What does the book say about Raskolnikov?", index);
    assert.equal(
      addressedBy("Rodion Raskolnikov listened with a sick sensation.", q, index).all,
      true
    );
  });
  add("addressedBy detects missing referent", () => {
    const q = referentsOf("What does the book say about Raskolnikov?", index);
    const miss = addressedBy("The novel explores guilt and redemption.", q, index);
    assert.equal(miss.all, false);
  });
  add("addressedBy empty query", () => {
    assert.equal(
      addressedBy("anything", referentsOf("nothing here", index), index),
      null
    );
  });

  // ── absenceLine / absenceOf ──
  add("absenceLine names unestablished referent", () => {
    const abs = referentsOf("What does the book say about Sonia?", index);
    assert.match(absenceLine(abs, PASSAGES), /no referent named "Sonia"/);
  });
  add("absenceLine empty when query resolves", () => {
    const q = referentsOf("What does the book say about Raskolnikov?", index);
    assert.equal(absenceLine(q, PASSAGES), "");
  });
  add("absenceOf reports unestablished, not absent", () => {
    const opener = [{ ref: "x", text: "Marmeladov drank. Marmeladov wept. Marmeladov died in the street." }];
    const un = absenceOf(
      referentsOf("What does the book say about Marmeladov?", indexFor(opener)),
      opener
    );
    assert.deepEqual(un.unestablished, ["Marmeladov"]);
    assert.deepEqual(un.absent, []);
    assert.equal(un.line, "");
  });

  // ── restatementOf ──
  add("restatementOf extracts premise", () => {
    assert.equal(
      restatementOf("So, you're saying Crime and Punishment is about a guy who thinks he can get away with murder?"),
      "Crime and Punishment is about a guy who thinks he can get away with murder"
    );
  });
  add("restatementOf returns null for bare question", () => {
    assert.equal(restatementOf("What does the book say about Razumihin?"), null);
  });

  // ── positionOn ──
  add("positionOn verdict yes for checked premises", () => {
    const yes = checkPremises(
      "So you're saying Razumihin brought soup and sat with him \u2014 is that right?",
      PASSAGES,
      { referentIndexFor: indexFor }
    );
    assert.equal(positionOn(yes).verdict, "yes");
  });
  add("positionOn verdict not-in-sources or no", () => {
    const no = checkPremises(
      "So you're saying Razumihin poisoned the pawnbroker in Moscow \u2014 is that right?",
      PASSAGES,
      { referentIndexFor: indexFor }
    );
    assert.ok(["not-in-sources", "partly", "no"].includes(positionOn(no).verdict));
  });
  add("positionOn null for empty premises", () => {
    assert.equal(positionOn({ premises: [] }), null);
  });

  // ── selfContradictions / contradictionLine ──
  add("selfContradictions detects polarity and contradicted-now", () => {
    const claims = [
      { end1: "Razumihin", label: "brought", end2: "soup", polarity: "+" },
      { end1: "Raskolnikov", label: "confessed", end2: "Sonia", polarity: "+" },
    ];
    const rows = selfContradictions(
      [
        { end1: "Razumihin", label: "brought", end2: "soup", polarity: "-", verdict: "bound" },
        { end1: "Rodion Raskolnikov", label: "confessed", end2: "Sonia", polarity: "+", verdict: "contradicted" },
        { end1: "Porfiry", label: "smiled", end2: "", polarity: "+", verdict: "bound" },
      ],
      [{ turn: 2, claims }],
      index
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[0].kind, "polarity");
    assert.equal(rows[1].kind, "contradicted-now");
    assert.equal(rows[1].basis, "referent");
  });
  add("selfContradictions empty for empty input", () => {
    assert.deepEqual(selfContradictions([], [{ turn: 2, claims: [] }], index), []);
  });
  add("contradictionLine names both sides", () => {
    const claims = [
      { end1: "Razumihin", label: "brought", end2: "soup", polarity: "+" },
    ];
    const rows = selfContradictions(
      [
        { end1: "Razumihin", label: "brought", end2: "soup", polarity: "-", verdict: "bound" },
      ],
      [{ turn: 2, claims }],
      index
    );
    assert.match(contradictionLine(rows), /Both stand\./);
  });

  // ── historyWindow ──
  add("historyWindow measures by dmdWindow", () => {
    const history = [];
    ["Raskolnikov", "Porfiry", "Razumihin", "Raskolnikov", "Porfiry", "Razumihin", "Raskolnikov", "Porfiry"].forEach(
      (n, i) => {
        history.push(
          { role: "user", content: `What about ${n} in chapter ${i + 1}?` },
          { role: "assistant", content: `${n} appears in chapter ${i + 1}.` }
        );
      }
    );
    const recent = historyWindow(history, "And what happens to Porfiry after that?", { dmdWindow, index });
    assert.equal(recent.basis, "referent");
    assert.ok(recent.depth >= 1 && recent.depth <= 2);
  });
  add("historyWindow depth 0 for empty history", () => {
    assert.equal(historyWindow([], "x", { dmdWindow, index }).depth, 0);
  });

  // ── expectationFrom / errorOf ──
  add("expectationFrom resolves claims to question referents", () => {
    const read = (text) => ({
      claims: text.includes("soup")
        ? [
            { end1: "Razumihin", label: "brought", end2: "soup", verdict: "bound" },
            { end1: "Porfiry Petrovich", label: "questioned", end2: "Raskolnikov", verdict: "bound" },
          ]
        : [{ end1: "Rodion Raskolnikov", label: "murdered", end2: "the old woman", verdict: "bound" }],
    });
    const exp = expectationFrom(PASSAGES, "What does the book say about Razumihin?", read, index);
    assert.equal(exp.basis, "referent");
    assert.deepEqual(exp.claims.map((c) => c.label), ["brought"]);
  });
  add("errorOf computes authorship ratio", () => {
    const read = () => ({
      claims: [
        { end1: "Razumihin", label: "brought", end2: "soup", verdict: "bound" },
        { end1: "Porfiry Petrovich", label: "questioned", end2: "Raskolnikov", verdict: "bound" },
      ],
    });
    const exp = expectationFrom(PASSAGES, "What does the book say about Razumihin?", read, index);
    const err = errorOf(
      exp,
      [
        { end1: "Razumihin", label: "brought", end2: "soup", verdict: "bound" },
        { end1: "Razumihin", label: "is", end2: "kind", verdict: "unheard" },
      ],
      index
    );
    assert.equal(err.matched.length, 1);
    assert.equal(err.novel.length, 1);
    assert.equal(err.authorship, 0.5);
  });
  add("errorOf reports why on no expectation", () => {
    const none = errorOf(
      expectationFrom(PASSAGES, "What does the book say about Porfiry?", () => ({ claims: [] }), index),
      [{ end1: "Porfiry", label: "smiled", end2: "", verdict: "unheard" }],
      index
    );
    assert.equal(none.authorship, null);
    assert.equal(none.expected, 0);
    assert.match(none.why, /heard nothing/);
  });

  // ── refKey ──
  add("refKey same key across spellings", () => {
    const a = refKey({ end1: "Rodion Raskolnikov", label: "murdered", end2: "the old woman" }, index);
    const b = refKey({ end1: "Raskolnikov", label: "murdered", end2: "the old woman" }, index);
    assert.equal(a.key, b.key);
    assert.equal(a.basis, "referent");
  });
  add("refKey falls back to surface for unknown", () => {
    const c = refKey({ end1: "the weather", label: "was", end2: "cold" }, index);
    assert.equal(c.basis, "surface");
  });

  // ── firewall: atmosphereBlock text is clean ──
  add("atmosphereBlock text is firewall-clean (dialogue arm)", () => {
    const a = atmosphereBlock({
      question: "And did Porfiry smile?",
      transcript: TRANSCRIPT,
      index,
    });
    assert.ok(clean(a.text), `apparatus found: ${a.text.slice(0, 80)}`);
  });

  // ── ownedRows / ownedLine ──
  add("ownedRows filters by since", () => {
    const t0 = 1_000;
    const rows = [
      { claimed: "The harbor light was built in 1996 by Ada Rowe", corrected: "The harbor light was built in 1841 by Ada Rowe.", ts: t0 + 5 },
      { claimed: "Razumihin brought tea", corrected: "Nastasya brought tea to Raskolnikov.", ts: t0 - 100 },
    ];
    const own = ownedRows(rows, { since: t0 });
    assert.equal(own.length, 1);
  });

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// ARM 2: RESOLUTIONS
// ═══════════════════════════════════════════════════════════════════════════

function armResolutions() {
  const results = [];
  const add = (name, fn) => results.push(run(name, fn));

  // ── activeReferents ──
  add("activeReferents from own question", () => {
    const own = activeReferents("What does the book say about Porfiry?", TRANSCRIPT, index);
    assert.deepEqual([...own.ids], [id("Porfiry")]);
  });
  add("activeReferents from last answer", () => {
    const bound = activeReferents("And why did he smile?", TRANSCRIPT, index);
    assert.ok(bound.ids.has(id("Porfiry")));
  });

  // ── atmosphereBlock ──
  add("atmosphereBlock ground pivots at turn 4", () => {
    const a = atmosphereBlock({
      question: "And did Porfiry smile?",
      transcript: TRANSCRIPT,
      index,
    });
    assert.deepEqual(a.ground.turns, [4, 5]);
    assert.ok(a.ground.ids.includes(id("Porfiry")));
    assert.ok(a.ground.before.includes(id("Razumihin")));
  });
  add("atmosphereBlock text is firewall-clean", () => {
    const a = atmosphereBlock({
      question: "And did Porfiry smile?",
      transcript: TRANSCRIPT,
      index,
    });
    assert.ok(clean(a.text));
  });
  add("atmosphereBlock empty transcript returns empty", () => {
    assert.equal(
      atmosphereBlock({ question: "x", transcript: [], index }).text,
      ""
    );
  });

  // ── lensBlock ──
  add("lensBlock groups notes by active referent", () => {
    const active = new Set([id("Porfiry")]);
    const l = lensBlock({
      question: "What does the book say about Porfiry?",
      active,
      index,
      notes: NOTES,
      voids: VOIDS,
      records: RECORDS,
      transcript: TRANSCRIPT,
      dmdWindow,
    });
    assert.match(l.text, /^What is said about Porfiry Petrovich:/);
    assert.match(l.text, /looked for and not found so far/);
  });
  add("lensBlock text is firewall-clean", () => {
    const active = new Set([id("Porfiry")]);
    const l = lensBlock({
      question: "What does the book say about Porfiry?",
      active,
      index,
      notes: NOTES,
      voids: VOIDS,
      records: RECORDS,
      transcript: TRANSCRIPT,
      dmdWindow,
    });
    assert.ok(clean(l.text));
  });
  add("lensBlock same address = one identity", () => {
    const active = new Set([id("Porfiry")]);
    const same = lensBlock({
      active,
      index,
      notes: NOTES,
      records: [{ turn: 4, gist: "Porfiry Petrovich questioned Raskolnikov twice.", refs: ["pg2554.txt#48673-52190"] }],
      transcript: TRANSCRIPT,
      dmdWindow,
    });
    assert.equal(same.windows.records, 1);
  });
  add("lensBlock empty for empty active set", () => {
    assert.equal(lensBlock({ active: new Set(), index, notes: NOTES }).text, "");
  });

  // ── paradigmBlock ──
  add("paradigmBlock detects recurring acts", () => {
    const active = new Set([id("Porfiry"), id("Raskolnikov")]);
    const p = paradigmBlock({ active, index, notes: NOTES, dmdWindow });
    assert.match(p.text, /^What recurs:/);
    assert.match(p.text, /\u00abquestioned\u00bb recurs between/);
  });
  add("paradigmBlock text is firewall-clean", () => {
    const active = new Set([id("Porfiry"), id("Raskolnikov")]);
    const p = paradigmBlock({ active, index, notes: NOTES, dmdWindow });
    assert.ok(clean(p.text));
  });
  add("paradigmBlock empty when nothing recurs at floor", () => {
    const active = new Set([id("Razumihin")]);
    assert.equal(
      paradigmBlock({ active, index, notes: NOTES, dmdWindow }).text,
      ""
    );
  });

  // ── dmdCut ──
  add("dmdCut measured with organ", () => {
    const rows = [
      { ids: new Set([id("Porfiry")]) },
      { ids: new Set([id("Raskolnikov")]) },
      { ids: new Set([id("Porfiry")]) },
      { ids: new Set([id("Razumihin")]) },
      { ids: new Set([id("Raskolnikov")]) },
      { ids: new Set([id("Porfiry")]) },
      { ids: new Set([id("Porfiry")]) },
    ];
    const active = new Set([id("Porfiry"), id("Raskolnikov")]);
    const measured = dmdCut(rows, active, { dmdWindow });
    assert.equal(measured.window, 2);
    assert.equal(measured.rows.length, 2);
  });
  add("dmdCut declared without organ", () => {
    const rows = [
      { ids: new Set([id("Porfiry")]) },
      { ids: new Set([id("Porfiry")]) },
    ];
    const declared = dmdCut(rows, new Set([id("Porfiry")]), {});
    assert.match(declared.basis, /declared/);
  });
  add("dmdCut on empty rows", () => {
    assert.equal(dmdCut([], new Set([id("Porfiry")]), { dmdWindow }).window, 0);
  });

  // ── lensCut ──
  add("lensCut ceiling on 30 distinct acts", () => {
    const mk = (i, verb) => ({
      subject: "Raskolnikov",
      verb,
      object: `thing ${i}`,
      witnesses: [`novel.txt#${i * 10}-${i * 10 + 9}~r`],
      sources: 1,
    });
    const distinct = Array.from({ length: 30 }, (_, i) => mk(i, `act${i}`));
    const active = index.resolve("Raskolnikov");
    const c1 = lensCut({ active, index, notes: distinct, dmdWindow });
    assert.equal(c1.ceiling, true);
    assert.equal(c1.window, 24);
  });
  add("lensCut converges on 3 repeating acts", () => {
    const mk = (i, verb) => ({
      subject: "Raskolnikov",
      verb,
      object: `thing ${i}`,
      witnesses: [`novel.txt#${i * 10}-${i * 10 + 9}~r`],
      sources: 1,
    });
    const repeats = Array.from({ length: 30 }, (_, i) => mk(i, `act${i % 3}`));
    const active = index.resolve("Raskolnikov");
    const c2 = lensCut({ active, index, notes: repeats, dmdWindow });
    assert.equal(c2.ceiling, false);
    assert.ok(c2.window <= 4 && c2.window >= 3);
  });

  // ── resolutionBlocks ──
  add("resolutionBlocks level 0 = empty", () => {
    const base = {
      question: "What does the book say about Porfiry?",
      transcript: TRANSCRIPT,
      index,
      notes: NOTES,
      voids: VOIDS,
      records: RECORDS,
      dmdWindow,
    };
    assert.equal(resolutionBlocks({ level: 0, ...base }).text, "");
  });
  add("resolutionBlocks level 1 = atmosphere only", () => {
    const base = {
      question: "What does the book say about Porfiry?",
      transcript: TRANSCRIPT,
      index,
      notes: NOTES,
      voids: VOIDS,
      records: RECORDS,
      dmdWindow,
    };
    const one = resolutionBlocks({ level: 1, ...base });
    assert.match(one.text, /^Where the conversation stands:/);
    assert.doesNotMatch(one.text, /What is said about/);
  });
  add("resolutionBlocks level 3 = full stack, firewall-clean", () => {
    const base = {
      question: "What does the book say about Porfiry?",
      transcript: TRANSCRIPT,
      index,
      notes: NOTES,
      voids: VOIDS,
      records: RECORDS,
      dmdWindow,
    };
    const three = resolutionBlocks({ level: 3, ...base });
    assert.match(three.text, /What recurs:/);
    assert.ok(clean(three.text));
  });
  add("resolutionBlocks null index = empty", () => {
    const base = {
      question: "What does the book say about Porfiry?",
      transcript: TRANSCRIPT,
      index: null,
      notes: NOTES,
      voids: VOIDS,
      records: RECORDS,
      dmdWindow,
    };
    assert.equal(resolutionBlocks({ level: 3, ...base }).text, "");
  });

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// ARM 3: READING-LOG  (async — exercises the real reader)
// ═══════════════════════════════════════════════════════════════════════════

async function armReadingLog() {
  const results = [];
  const add = (name, fn) => results.push(run(name, fn));

  // ── setup: real reader with POS priors ──
  let POS;
  try {
    POS = JSON.parse(
      readFileSync(
        new URL("../../eoreader7/legacy-eoreader6.1/bin/priors/pos/en-ud-ewt.json", import.meta.url),
        "utf8"
      )
    );
  } catch {
    // fallback: try the priors-data path
    POS = JSON.parse(
      readFileSync(
        new URL("../../priors-data/pos-prior-eng.json", import.meta.url),
        "utf8"
      )
    );
  }

  const makeReader = () =>
    createRecursiveReader({
      perceivers: [
        createCausalTextPerceiver({
          minRelationSurfaces: 2,
          refreshEvery: 3,
          posPrior: POS,
          descriptorAnchoring: { minActivation: 0.05, minMargin: 0.2 },
        }),
      ],
      adapters: {
        revise: reviseTextFold,
        retrieve: (_fold, evidence) =>
          Object.freeze({
            schema: "EORelevantFold@1",
            witnessed: Object.freeze([...evidence]),
            provisional: Object.freeze([]),
            expectations: Object.freeze([]),
            obligations: Object.freeze([]),
            exclusions: Object.freeze([]),
            unresolvedAlternatives: Object.freeze([]),
            activeFrames: Object.freeze([]),
            receivedPriors: Object.freeze([]),
          }),
      },
    });

  const TEXT = [
    "In the morning, Rodion Raskolnikov listened intently but with a sick sensation. By then Raskolnikov had murdered the old woman and her sister. Each day Razumihin came to see Raskolnikov.",
    "That evening Razumihin brought soup and sat with him, clumsy and kind. Later Razumihin told Raskolnikov about Porfiry Petrovich. Twice Porfiry Petrovich questioned Raskolnikov, and each time Porfiry smiled.",
    "Porfiry Petrovich came again the next day. Razumihin met Porfiry Petrovich on the stairs and Raskolnikov heard them. The weather turned cold that week.",
  ].join("\n\n");

  const chunks = chunkSource("novel.txt", TEXT).map((c) => ({
    ...c,
    source: "novel.txt",
    kind: "prose",
  }));

  const reader = makeReader();
  let stepped;
  try {
    stepped = await stepChunks(reader, chunks, { textEncounters, budgetMs: 0 });
  } catch (e) {
    results.push({
      name: "stepChunks completes without throw",
      pass: false,
      detail: String(e.message ?? e).slice(0, 120),
    });
    return results;
  }

  add("stepChunks advances cursor to end", () => {
    assert.equal(stepped.cursor, chunks.length);
  });

  const log = reader.getLog();
  const ORG = { reconstruct, diaNorm, namesCorefer, surfaceIndex, surfacesIn };

  add("foldReading discovers referents", () => {
    const f = foldReading(log, ORG);
    assert.ok(f.referents.size >= 3, `referents: ${f.referents.size}`);
    assert.ok(f.encounters.length >= 8, `encounters: ${f.encounters.length}`);
    assert.ok(f.mentions.length >= 3, `mentions: ${f.mentions.length}`);
  });

  const logIndex = readingIndexFromLog(log, ORG);
  const book = mentionBookFromLog(log, ORG);
  const logId = (name) => [...logIndex.resolve(name)][0];

  add("readingIndex resolves two spellings to one referent", () => {
    assert.ok(logId("Raskolnikov"));
    assert.equal(logId("Rodion Raskolnikov"), logId("Raskolnikov"));
    assert.ok(logId("Porfiry"));
    assert.equal(logId("Porfiry Petrovich"), logId("Porfiry"));
  });

  add("readingIndex resolveIn is caseless", () => {
    const q1 = logIndex.resolveIn("what does the book say about raskolnikov and porfiry?");
    assert.ok(q1.has(logId("Raskolnikov")));
    assert.ok(q1.has(logId("Porfiry")));
    assert.equal(logIndex.resolveIn("the weather turned cold").size, 0);
  });

  add("mentionBook sentences read back from bytes", () => {
    for (const s of book.sentences) {
      assert.equal(TEXT.slice(s.start, s.end), s.text);
    }
  });

  add("mentionBook has no gaps", () => {
    assert.deepEqual(book.gaps, []);
  });

  add("mentionBook byId maps referent to encounters", () => {
    assert.ok(book.byId.get(logId("Porfiry")).length >= 3);
  });

  add("activate retrieves passages for active referent", () => {
    const r = activate({
      question: "What does the book say about Porfiry?",
      index: logIndex,
      book,
      dmdWindow,
    });
    assert.equal(r.basis, "activation");
    assert.deepEqual(r.active, [logId("Porfiry")]);
    assert.ok(r.passages.some((p) => /Porfiry/.test(p.text)));
    assert.ok(r.hop1.includes(logId("Raskolnikov")));
  });

  add("S24 control: caseless script establishes nothing", async () => {
    const heb = chunkSource(
      "heb.txt",
      "\u05e8\u05e1\u05e7\u05d5\u05dc\u05e0\u05d9\u05e7\u05d5\u05d1 \u05d4\u05dc\u05da \u05dc\u05e8\u05d0\u05d5\u05ea \u05d0\u05ea \u05e4\u05d5\u05e8\u05e4\u05d9\u05e8\u05d9 \u05e4\u05d8\u05e8\u05d5\u05d1\u05d9\u05d6\u05d9\u05d9\u05dd'. \u05e8\u05d6\u05d5\u05de\u05d9\u05d7\u05d9\u05df \u05d4\u05d1\u05d9\u05d0 \u05de\u05e8\u05e7. \u05e4\u05d5\u05e8\u05e4\u05d9\u05e8\u05d9 \u05e4\u05d8\u05e8\u05d5\u05d1\u05d9\u05d6\u05d9\u05d9\u05dd' \u05d7\u05e7\u05e8 \u05d0\u05ea \u05e8\u05e1\u05e7\u05d5\u05dc\u05e0\u05d9\u05e7\u05d5\u05d1 \u05e4\u05e2\u05de\u05d9\u05d9\u05dd."
    ).map((c) => ({ ...c, source: "heb.txt", kind: "prose" }));
    const rd = makeReader();
    await stepChunks(rd, heb, { textEncounters, budgetMs: 0 });
    const hlog = rd.getLog();
    const hindex = readingIndexFromLog(hlog, ORG);
    assert.equal(hindex.referents.size, 0, "Hebrew establishes no referents (S24)");
    const hbook = mentionBookFromLog(hlog, ORG);
    const r = activate({
      question: "\u05de\u05d4 \u05d4\u05e1\u05e4\u05e8 \u05d0\u05d5\u05de\u05e8 \u05e2\u05dc \u05e4\u05d5\u05e8\u05e4\u05d9\u05e8\u05d9?",
      index: hindex,
      book: hbook,
      dmdWindow,
    });
    assert.equal(r.basis, "surface");
    assert.match(r.why, /no referent/);
  });

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

const t0 = Date.now();

console.log("fold-core-assay \u2014 dialogue, resolutions, reading-log\n");

// Arms 1 & 2 are synchronous
const dialogueResults = armDialogue();
const resolutionsResults = armResolutions();

// Arm 3 is async
const readingLogResults = await armReadingLog();

// ── per-arm output ──

function printArm(name, res) {
  const passed = res.filter((r) => r.pass).length;
  const failed = res.filter((r) => !r.pass).length;
  console.log(`\u2014 ${name}: ${passed}/${res.length} passed \u2014`);
  for (const r of res) {
    const mark = r.pass ? "+" : "x";
    console.log(`  [${mark}] ${r.name}${r.detail ? ` \u2014 ${r.detail}` : ""}`);
  }
  console.log();
  return { name, passed, failed, total: res.length };
}

const arms = [
  printArm("dialogue", dialogueResults),
  printArm("resolutions", resolutionsResults),
  printArm("reading-log", readingLogResults),
];

// ── summary ──

const totalPassed = arms.reduce((s, a) => s + a.passed, 0);
const totalFailed = arms.reduce((s, a) => s + a.failed, 0);
const total = arms.reduce((s, a) => s + a.total, 0);

console.log("\u2014 summary \u2014");
console.log(`  ${"arm".padEnd(14)} ${"pass".padStart(5)} ${"fail".padStart(5)} ${"total".padStart(5)}`);
for (const a of arms) {
  console.log(`  ${a.name.padEnd(14)} ${pad(a.passed, 5)} ${pad(a.failed, 5)} ${pad(a.total, 5)}`);
}
console.log(`  ${"".padEnd(14)} ${"-----".padStart(5)} ${"-----".padStart(5)} ${"-----".padStart(5)}`);
console.log(`  ${"TOTAL".padEnd(14)} ${pad(totalPassed, 5)} ${pad(totalFailed, 5)} ${pad(total, 5)}`);

console.log(`\n  seed ${seedArg}, ${((Date.now() - t0) / 1000).toFixed(1)}s`);

if (totalFailed > 0) process.exit(1);
