// void-hl.test.mjs — admission judged by the REAL engine HL.
//
// No stubs: `void-hl.js` re-exports eoreader7's own
// `native/interpretation/hl.js` through this repo's `hl.js` adapter, so
// every verdict here is one the real R1/R2 produce.
//
// The specimen is the one that forced this tier into existence. Calvin
// Coolidge is a real vice president whose own page states the relation and
// whose kind is a person — he passes every surface test that can be
// written — and he is not Roosevelt's. Under rules, excluding him needed a
// surname match in the right sentence, which the sentence splitter then
// hid inside "Franklin D.". Under HL he is CONTRADICTED by one declared
// rule with a named giver, and no reader has to be clever.

import test from "node:test";
import assert from "node:assert/strict";

import { stageFromReadings, admissionOf, declarationsOf, readingIsWellFormed, foldAnchor } from "./void-hl.js";
import { BOUND, CONTRADICTED, CONTESTED, UNBOUND, BEYOND_REACH } from "../eoreader7/native/organs/index.js";

const LINCOLN = "Abraham Lincoln";
const REL = "vicePresidentOf";
const FUNCTIONAL = {
  kind: "functional", rel: REL,
  giver: "the office's own structure: a vice president serves under exactly one president at a time",
};

const r = (candidate, anchor, span, extra = {}) => ({
  candidate, statesRelation: anchor != null, anchor, span, source: `wp:${candidate}`, ...extra,
});

const HAMLIN = r("Hannibal Hamlin", LINCOLN, { from: 1861, to: 1865 });
const JOHNSON = r("Andrew Johnson", LINCOLN, null);                       // relation stated, no span
const COOLIDGE = r("Calvin Coolidge", "Warren G. Harding", { from: 1921, to: 1923 });
const SILENT = { candidate: "War Democrat", statesRelation: false, anchor: null, span: null, source: "wp:WarDemocrat" };

const build = (readings, declarations = [FUNCTIONAL]) =>
  stageFromReadings({ anchor: LINCOLN, relation: REL, readings, declarations });

const judge = (built, candidate, opts = {}) =>
  admissionOf(built.stage, { relation: REL, candidate, anchor: LINCOLN, display: built.display, ...opts });

// ── the specimen ─────────────────────────────────────────────────────────────

test("THE SPECIMEN: two fillers bind, a real vice president of someone ELSE is contradicted", () => {
  const built = build([HAMLIN, JOHNSON, COOLIDGE, SILENT]);
  assert.equal(built.ok, true, JSON.stringify(built.refusal));

  assert.deepEqual(
    [HAMLIN, JOHNSON, COOLIDGE, SILENT].map((x) => {
      const a = judge(built, x.candidate);
      return [x.candidate, a.hl, a.verdict];
    }),
    [
      ["Hannibal Hamlin", BOUND, "holds"],
      ["Andrew Johnson", BOUND, "holds"],           // no span — placement, not membership
      ["Calvin Coolidge", CONTRADICTED, "refused"], // R2, not a regex
      ["War Democrat", UNBOUND, null],              // silence settles nothing
    ],
  );
});

test("the refusal names the edge that produced it — a verdict a reader can argue with", () => {
  const a = judge(build([HAMLIN, COOLIDGE]), "Calvin Coolidge");
  assert.match(a.because, /declared functional/);
  assert.match(a.because, /Warren G\. Harding/);
});

test("R2 IS THE DECLARATION: without it, the same stage cannot exclude Coolidge", () => {
  // The load-bearing case. Everything else about the stage is identical;
  // only the declared rule and its giver differ, and the verdict moves
  // from `contradicted` to `unbound`. That is the whole argument for
  // carrying declarations with givers instead of writing more rules.
  const withRule = judge(build([HAMLIN, COOLIDGE], [FUNCTIONAL]), "Calvin Coolidge");
  const without = judge(build([HAMLIN, COOLIDGE], []), "Calvin Coolidge");
  assert.equal(withRule.hl, CONTRADICTED);
  assert.equal(without.hl, UNBOUND);
  assert.equal(without.verdict, null);   // and an undeclared rule convicts nobody
});

// ── the giver discipline ─────────────────────────────────────────────────────

test("a declaration with no giver is refused, not quietly accepted", () => {
  const built = build([HAMLIN], [{ kind: "functional", rel: REL }]);
  assert.equal(built.ok, false);
  assert.equal(built.refusal.type, "no_giver");
});

test("every declaration is auditable with its giver", () => {
  const built = build([HAMLIN]);
  assert.deepEqual(declarationsOf(built.stage), [{ kind: "functional", rel: REL, giver: FUNCTIONAL.giver }]);
});

test("an unknown declaration kind is refused by name", () => {
  const built = build([HAMLIN], [{ kind: "symmetric", rel: REL, giver: "someone" }]);
  assert.equal(built.ok, false);
  assert.equal(built.refusal.type, "unknown_declaration");
});

// ── silence, provenance and reach ────────────────────────────────────────────

test("silence is not evidence against — a source that never states the relation lands no edge", () => {
  const built = build([SILENT]);
  assert.equal(built.edges.length, 0);
  assert.equal(judge(built, "War Democrat").hl, UNBOUND);
});

test("a reading that states the relation and names nobody is UNBOUND, never a bind", () => {
  const built = build([r("Someone", null, null, { statesRelation: true })]);
  assert.equal(built.edges.length, 0);
  assert.equal(judge(built, "Someone").verdict, null);
});

test("a reading with no source is reported malformed — HL refuses an edge with no provenance", () => {
  const built = build([{ candidate: "X", statesRelation: true, anchor: LINCOLN, span: null }]);
  assert.equal(built.ok, true);
  assert.deepEqual(built.malformed.map((m) => m.candidate), ["X"]);
  assert.match(built.malformed[0].defects.join(" "), /carries its own source/);
});

test("R2'S PRECONDITION: a functional relation makes anchor identity load-bearing, and an ALIAS convicts", () => {
  // An earlier draft of void-hl.js claimed a reader's blind spot always
  // degrades to a gap. The real engine refuted it: with a functional
  // declaration, a reading that says «FDR» where the slot says «Franklin
  // D. Roosevelt» is not silence — R2 reads it as bound to a DIFFERENT
  // object and REFUSES a true candidate. Pinned so the corrected claim
  // cannot quietly revert.
  const built = stageFromReadings({
    anchor: "Franklin D. Roosevelt", relation: REL,
    readings: [r("Henry A. Wallace", "FDR", { from: 1941, to: 1945 })],
    declarations: [FUNCTIONAL],
  });
  const a = admissionOf(built.stage, { relation: REL, candidate: "Henry A. Wallace", anchor: "Franklin D. Roosevelt", display: built.display });
  assert.equal(a.hl, CONTRADICTED);
  assert.equal(a.verdict, "refused");
  assert.match(a.because, /«FDR»/);                       // and it says so in the material's own words
  assert.equal(built.anchorIdentity, "folded-strings");   // the precondition, reported
});

test("with NO declaration the same alias is only a gap — the degradation claim holds exactly there", () => {
  const built = stageFromReadings({
    anchor: "Franklin D. Roosevelt", relation: REL,
    readings: [r("Henry A. Wallace", "FDR", { from: 1941, to: 1945 })],
    declarations: [],
  });
  const a = admissionOf(built.stage, { relation: REL, candidate: "Henry A. Wallace", anchor: "Franklin D. Roosevelt" });
  assert.equal(a.hl, UNBOUND);
  assert.equal(a.verdict, null);
});

test("an endpoint genuinely absent from the stage is beyond-reach, never a finding about the candidate", () => {
  const built = build([HAMLIN]);
  const a = judge(built, "Someone Never Read");
  assert.equal(a.hl, BEYOND_REACH);
  assert.equal(a.verdict, null);
  assert.match(a.because, /the instrument's reach, not a finding about the candidate/);
});

test("anchors fold case and combining marks, and nothing further", () => {
  assert.equal(foldAnchor("  Abraham   LINCOLN "), "abraham lincoln");
  assert.equal(foldAnchor("Natásha"), "natasha");
  assert.notEqual(foldAnchor("FDR"), foldAnchor("Franklin D. Roosevelt"));   // two anchors, honestly
});

// ── contested, and why it is not a refusal ───────────────────────────────────

test("contested settles nothing and convicts nobody", () => {
  const built = build([
    r("Hannibal Hamlin", LINCOLN, { from: 1861, to: 1865 }),
    { ...r("Hannibal Hamlin", LINCOLN, null), polarity: "-", source: "wp:contra" },
  ]);
  const a = judge(built, "Hannibal Hamlin");
  assert.equal(a.hl, CONTESTED);
  assert.equal(a.verdict, null);   // an unsettled question, not a finding of guilt
  assert.match(a.because, /says both/);
});

test("THE QUESTION'S OWN SINGULAR IS A FUNCTIONAL DECLARATION, and the material refutes it", () => {
  // The deepest thing the real engine taught this pass. "Who was Lincoln's
  // vice president?" is a DEFINITE DESCRIPTION — Russell's clause — and
  // its singular phrasing asserts `functional(hasVicePresident)`. Read in
  // that direction (anchor as subject), HL returns CONTESTED: the
  // presupposition failed. The honest answer to the question is not one
  // filler, it is "the question presumed one and the material has two."
  //
  // This is also why direction matters and both are useful:
  // `vicePresidentOf(vp, president)` IS functional and excludes Coolidge;
  // `hasVicePresident(president, vp)` is NOT, and asserting it is what
  // the question does.
  const INVERSE = "hasVicePresident";
  const built = stageFromReadings({
    anchor: LINCOLN, relation: INVERSE,
    readings: [
      { candidate: LINCOLN, statesRelation: true, anchor: "Hannibal Hamlin", span: null, source: "wp:Hamlin" },
      { candidate: LINCOLN, statesRelation: true, anchor: "Andrew Johnson", span: null, source: "wp:Johnson" },
    ],
    declarations: [{ kind: "functional", rel: INVERSE, giver: "the question's own singular phrasing — «who WAS Lincoln's vice president»" }],
  });
  const a = admissionOf(built.stage, { relation: INVERSE, candidate: LINCOLN, anchor: "Hannibal Hamlin", definite: true, display: built.display });
  assert.equal(a.hl, CONTESTED);
  assert.equal(a.verdict, null);   // and it picks neither
});

// ── shape ────────────────────────────────────────────────────────────────────

test("stageFromReadings refuses without a relation or an anchor", () => {
  assert.equal(stageFromReadings({ anchor: LINCOLN, readings: [] }).refusal.type, "no_relation");
  assert.equal(stageFromReadings({ relation: REL, readings: [] }).refusal.type, "no_anchor");
});

test("readingIsWellFormed names every defect at once", () => {
  const d = readingIsWellFormed({ candidate: "", statesRelation: "yes", span: { from: 1 } });
  assert.ok(d.length >= 3);
});
