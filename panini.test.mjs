// panini.test.mjs — the pronunciation archon's rules, BUILT TO FAIL (II.23):
// every control runs in BOTH directions, so a rule that stopped looking fails
// here rather than passing quietly. Against the REAL PronunciationPrior@1
// (live_priors), the REAL comparative layer, and the REAL manifest.
// PLANTED-CONTROL.
//
// The READ/READ/RED class: the manifest's own engine (espeak-ng) renders
// "read" only as /ɹiːd/ (measured), so the HETERONYM sense lives in the
// archon's own injected dictionary — the "dictionary access" the archon
// exists to hold (P11/P38: pronunciation is referent-keyed).
import test from "node:test";
import assert from "node:assert/strict";
import { makePanini, RULES, SEVERITY, CONFUSABLE_DISTANCE, HETERONYM_DISTANCE, phonemesOf, READ_READ_RED } from "../eoreader7/native/organs/panini.js";
import { manifestOf } from "../live_priors/scripts/pronunciation.mjs";
import { wordDistance, phoneDistance } from "../live_priors/scripts/pronunciation-compare.mjs";

const manifest = manifestOf("eng");
const panini = makePanini({ manifestOf: (l) => manifestOf(l), wordDistance, language: "eng" });

test("the rules are a closed, cited table", () => {
  assert.ok(RULES.length >= 3);
  for (const r of RULES) { assert.ok(r.id && r.says && r.cites, `${r.id} names what it is and where it comes from`); assert.ok(Object.values(SEVERITY).includes(r.severity)); }
});

test("homophone: 'one' and 'was' are confusable, and the archon FLAGS them (both directions)", () => {
  const read = panini.check(["one", "was"]);
  const hits = read.findings.filter((f) => f.rule === "homophone-in-view");
  assert.ok(hits.length >= 1, "one/was are measured confusable at distance 0.014 — the archon must flag them");
  assert.equal(hits[0].severity, SEVERITY.FLAG, "a confusable is flagged, never merged, never convicted");
  assert.ok(hits[0].a && hits[0].b, "the finding names both sides");
});

test("homophone: a real pair that is NOT confusable stays quiet (control that must not fire)", () => {
  const read = panini.check(["freedom", "dignity"]);
  assert.ok(!read.findings.some((f) => f.rule === "homophone-in-view"), "freedom/dignity are not confusable — silence is the correct answer");
});

test("homophone: the same referent said twice is NOT a confusable (pronunciation is referent-keyed)", () => {
  // a trivial referent index where "freedom" and "freedoms" are the same being
  const same = { resolve: (s) => new Set(s === "freedom" || s === "freedoms" ? ["f1"] : []) };
  const p = makePanini({ manifestOf: (l) => manifestOf(l), wordDistance, resolve: same.resolve, language: "eng" });
  const read = p.check(["freedom", "freedoms"]);
  assert.ok(!read.findings.some((f) => f.rule === "homophone-in-view"), "two surfaces of one referent are not confusable — referent identity decides");
});

test("heteronym: READ carries two dictionary senses and is REFUSED without a referent binding", () => {
  const dict = { read: ["/ɹiːd/", "/ɹɛd/"], red: ["/ɹɛd/"] };
  const noResolve = makePanini({ manifestOf: (l) => manifestOf(l), dictionary: dict, wordDistance, language: "eng" });
  const read = noResolve.check(["read"], { surfaces: ["read", "red"] });
  const hits = read.findings.filter((f) => f.rule === "heteronym-unsolved");
  assert.ok(hits.length >= 1, "read has two distinct senses (/ɹiːd/ and /ɹɛd/) — the archon must refuse without a referent binding");
  assert.equal(hits[0].severity, SEVERITY.REFUSE, "a heteronym resolved by form alone is refused, never asserted");
  assert.equal(hits[0].pronunciations.length, 2, "the finding names both senses");
  assert.equal(noResolve.hand(["read"], { surfaces: ["read", "red"] }).refused.length, hits.length, "hand reports the refusals");
});

test("heteronym: with a referent binding that names WHICH sense, the same 'read' RESOLVES", () => {
  // the reading has established that "read" here is the READ verb (one
  // referent) — the archon is satisfied; the past-tense homophone with red
  // is the material's own, and the reading has named its referent.
  const dict = { read: ["/ɹiːd/", "/ɹɛd/"], red: ["/ɹɛd/"] };
  const sep = { resolve: (s) => new Set(s === "read" ? ["READ"] : s === "red" ? ["RED"] : []) };
  const p = makePanini({ manifestOf: (l) => manifestOf(l), dictionary: dict, wordDistance, resolve: sep.resolve, language: "eng" });
  const read = p.check(["read"], { surfaces: ["read", "red"] });
  assert.ok(!read.findings.some((f) => f.rule === "heteronym-unsolved"), "a referent binding that names the sense resolves the heteronym — the reading decided which it heard");
});

test("pronunciation is referent-keyed: a surface with no pronunciation is a typed GAP, never an answer", () => {
  const read = panini.check(["xylophone-not-in-any-reading"]);
  assert.ok(read.gaps.some((g) => g.type === "word_gap"), "a surface absent everywhere is a typed gap");
  assert.ok(!read.findings.length, "a gap produces no finding — absence is not a verdict");
});

test("the READ/READ/RED specimen is documented as the archon's reason to exist", () => {
  assert.equal(READ_READ_RED.surfaces.length, 2);
  assert.equal(READ_READ_RED.pronunciations.read.length, 2, "read has two pronunciations (present and past)");
  assert.equal(READ_READ_RED.pronunciations.red[0], "/ɹɛd/", "red is homophonous with past-read");
});

test("phonemesOf segments consistently with the comparative layer (one phone definition)", () => {
  const ps = phonemesOf("ɹˈaɪts");
  assert.deepEqual(ps.map((p) => p.phone), ["ɹ", "a", "ɪ", "t", "s"], "stress marks are prosody, not phones");
  assert.equal(HETERONYM_DISTANCE, CONFUSABLE_DISTANCE, "the same measured floor, asked two directions: below it is the same sound re-rendered, above it is a second sense");
  // sanity on the shared distance organ
  assert.ok(phoneDistance("t", "t") === 0);
});

test("the real eng manifest has no heteronyms in its own word list (disclosed coverage limit)", () => {
  // The UDHR corpus is formal legal prose; espeak-ng renders one sense per
  // surface. This is WHY the archon's heteronym rule reads the injected
  // dictionary, never the manifest alone. The test pins the limit as the
  // honest reason, not a defect.
  const read = panini.check(["rights", "freedom", "dignity"]);
  assert.ok(!read.findings.some((f) => f.rule === "heteronym-unsolved"), "formal legal prose: one sense per word — no false heteronym refusals on the real corpus");
});