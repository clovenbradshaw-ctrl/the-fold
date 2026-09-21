// language-relation-reader.test.mjs — relationReaderFor against real
// language-typology.js, real fakes for the dispatch logic, and (where the
// sibling fixtures exist) the REAL organs on both branches that have one:
// the native English positional reader and eoreader7's real Latin
// case-marked reader — proving the router hands back a genuinely working
// organ, not merely the right-shaped object.
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { relationReaderFor, STRATEGY_GAPS } from "./language-relation-reader.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.join(HERE, "..", "eoreader7", "native");
const CASE_PRIOR_PATH = path.join(HERE, "..", "live_priors", "derived-priors", "case-priors", "case-marking-lat.json");
const HAS_NATIVE = fs.existsSync(path.join(NATIVE, "adapters", "text", "relations.js"));
const HAS_CASE_PRIOR = fs.existsSync(CASE_PRIOR_PATH);

test("an unregistered language is a typed refusal, never routed to any reader — even one injected under every strategy", () => {
  const readers = { positional: () => ({}), "case-marked": () => ({}), particle: () => ({}), "root-pattern": () => ({}) };
  const r = relationReaderFor("xx", readers);
  assert.equal(r.refused.reason, "no_typology_for_language");
  assert.equal(r.refused.strategy, null);
  assert.equal(r.refused.langCode, "xx");
  assert.match(r.refused.detail, /not in language-typology\.js/);
});

test("a known language with no reader injected for its strategy is a typed refusal naming the real gap, never a silent fallback to a different strategy's reader", () => {
  // English is "positional"; only "case-marked" is injected. Handing back
  // that reader for English would be exactly the misread this module
  // exists to refuse.
  const wrongStrategyReader = () => ({ edges: [] });
  const r = relationReaderFor("en", { "case-marked": wrongStrategyReader });
  assert.equal(r.refused.reason, "no_organ_for_strategy");
  assert.equal(r.refused.strategy, "positional");
  assert.equal(r.refused.detail, STRATEGY_GAPS.positional);
  assert.equal(r.reader, undefined);
});

test("a known language WITH its strategy's reader injected returns that exact function — identity, not a copy or a wrapper", () => {
  const positionalReader = (passages) => ({ edges: passages.length });
  const readers = { positional: positionalReader };
  const r = relationReaderFor("en", readers);
  assert.equal(r.refused, undefined);
  assert.equal(r.strategy, "positional");
  assert.equal(r.langCode, "en");
  assert.equal(r.reader, positionalReader, "the router hands back the caller's own function, not a rebuilt one");
  assert.deepEqual(r.reader([1, 2, 3]), { edges: 3 }, "and it is genuinely callable, not a decoration");
});

test("zh (positional, no case affix) and en (positional) both route to whatever reader is registered under 'positional' — the router does not special-case a language, only its derived strategy", () => {
  const reader = () => "ran";
  assert.equal(relationReaderFor("zh", { positional: reader }).reader, reader);
  assert.equal(relationReaderFor("en", { positional: reader }).reader, reader);
});

test("Hebrew/Arabic (root-pattern) and Japanese (particle) refuse honestly when nothing is registered — each names its own real, disclosed gap, not a generic message", () => {
  for (const lang of ["he", "ar"]) {
    const r = relationReaderFor(lang, {});
    assert.equal(r.refused.strategy, "root-pattern");
    assert.match(r.refused.detail, /Hebrew\/Arabic root-and-pattern organ/);
  }
  const ja = relationReaderFor("ja", {});
  assert.equal(ja.refused.strategy, "particle");
  assert.match(ja.refused.detail, /Japanese particle-role organ/);
});

test("Russian/Korean/Turkish/Finnish (case-marked) refuse honestly by default — the router never assumes the Latin-trained organ applies to a language it was never built or measured against", () => {
  for (const lang of ["ru", "ko", "tr", "fi"]) {
    const r = relationReaderFor(lang, {});
    assert.equal(r.refused.strategy, "case-marked");
    assert.match(r.refused.detail, /Latin only/);
  }
});

test("case-marked routes to whatever the caller registers, even the Latin organ, once the caller has made that choice explicitly — this module never makes it on their behalf", () => {
  const latinReader = () => ({ from: "latin" });
  const r = relationReaderFor("ru", { "case-marked": latinReader });
  assert.equal(r.refused, undefined);
  assert.equal(r.reader, latinReader);
});

// ---------------------------------------------------------------------
// Real organs, both branches that have one. Skip-typed (never silently
// passing) when the sibling fixtures this checkout happens to have are
// absent elsewhere — the same disclosed-skip posture case-marked-
// relations.test.mjs itself already uses for the identical fixture.
// ---------------------------------------------------------------------

test("real organ, positional: routed to the ACTUAL native English relation reader, which genuinely extracts a real edge from real prose", { skip: HAS_NATIVE ? undefined : "eoreader7 is not checked out as a sibling of this repo" }, async () => {
  const { makeRelationReader } = await import("./hypergraph.js");
  const { splitSentences } = await import(path.join(NATIVE, "adapters", "text", "spans.js"));
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(path.join(NATIVE, "adapters", "text", "surfaces.js"));
  const { discoverRelationVocab, extractRelations } = await import(path.join(NATIVE, "adapters", "text", "relations.js"));
  const P = await import(path.join(NATIVE, "adapters", "text", "priors.js"));
  const englishReader = makeRelationReader({
    splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
    discoverRelationVocab, extractRelations,
    determiners: new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]),
    negationWords: P.NEGATION_WORDS,
  });

  const routed = relationReaderFor("en", { positional: englishReader });
  assert.equal(routed.strategy, "positional");
  assert.equal(routed.reader, englishReader);

  const report = routed.reader([{ ref: "a.txt", text: "Abraham Lincoln appointed Hannibal Hamlin." }]);
  assert.ok(report.edges.length >= 1, "the real organ, reached through the router, genuinely extracted at least one edge");
  const edge = report.edges.find((e) => /appointed/i.test(e.label));
  assert.ok(edge, "the appointed relation was found");
});

test("real organ, case-marked: routed to the ACTUAL eoreader7 Latin case-marked reader, which genuinely reads a real VOS Latin sentence with byte-accurate spans", { skip: HAS_NATIVE && HAS_CASE_PRIOR ? undefined : "eoreader7 and/or live_priors' Latin case prior are not checked out as siblings of this repo" }, async () => {
  const { makeCaseMarkedRelationReader } = await import("./hypergraph.js");
  const { splitSentences } = await import(path.join(NATIVE, "adapters", "text", "spans.js"));
  const { extractCaseMarkedRelation } = await import(path.join(NATIVE, "adapters", "text", "relations-case-marked.js"));
  const latinReader = makeCaseMarkedRelationReader({ splitSentences, extractCaseMarkedRelation });

  // The router itself only ever reaches this organ when a caller has
  // explicitly registered it under "case-marked" for a language it has
  // decided to trust it for — this test supplies that explicit decision
  // for "ru" purely to exercise the plumbing end to end (ru genuinely
  // derives "case-marked" from real WALS data); it is NOT a claim that
  // the Latin-trained reader can correctly read Russian text (it cannot —
  // its verb-finding is hardcoded Latin morphology, per its own header).
  const routed = relationReaderFor("ru", { "case-marked": latinReader });
  assert.equal(routed.strategy, "case-marked");
  assert.equal(routed.reader, latinReader);

  const report = routed.reader([{ ref: "ovid.txt", text: "possedit cetera pontus." }]);
  assert.equal(report.edges.length, 1);
  const [e] = report.edges;
  assert.equal(e.end1, "pontus");
  assert.equal(e.label, "possedit");
  assert.equal(e.end2, "cetera");
  const span = e.spans[0];
  assert.equal("possedit cetera pontus.".slice(span.start, span.end), span.text, "the real organ's own byte-address self-verification (P5.2) survives being reached through the router");
});
