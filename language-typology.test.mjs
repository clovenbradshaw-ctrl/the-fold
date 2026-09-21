import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LANGUAGE_TYPOLOGY, TYPOLOGY_GIVER, roleStrategyFor, needsSegmentation, typologyFor } from "./language-typology.js";
import { WALS_TYPOLOGY_FIXTURE } from "./eval/fixtures/wals-typology-data.js";

test("the two fixture copies (the diffable provenance .json and the browser-loadable .js data module) never silently drift apart", () => {
  const json = JSON.parse(readFileSync(new URL("./eval/fixtures/wals-typology.json", import.meta.url), "utf8"));
  assert.deepEqual(WALS_TYPOLOGY_FIXTURE, json, "the .js module's content must be a byte-for-byte-equivalent copy of the .json provenance record");
});

test("the giver is named, and every row is a real WALS value, not a hand-typed stand-in", () => {
  assert.equal(TYPOLOGY_GIVER.resource, "WALS Online");
  assert.match(TYPOLOGY_GIVER.features["81A"], /Dryer/);
  assert.match(TYPOLOGY_GIVER.features["49A"], /Iggesen/);
  // Every registered language carries the two received WALS fields this
  // module's derivation reads — a row with either missing would silently
  // fall through roleStrategyFor's own logic in a way nothing would catch.
  for (const [code, row] of Object.entries(LANGUAGE_TYPOLOGY)) {
    assert.ok(row.dominantOrder81A, `${code} is missing its received 81A value`);
    assert.ok(typeof row.case49A === "string", `${code} is missing its received 49A value`);
    assert.ok(row.genus, `${code} is missing its received genus`);
  }
});

test("Semitic languages read root-pattern regardless of case-marking — Hebrew and Arabic both show 'no case-marking' in WALS 49A and are still not positional", () => {
  assert.equal(roleStrategyFor("he"), "root-pattern");
  assert.equal(roleStrategyFor("ar"), "root-pattern");
  assert.equal(LANGUAGE_TYPOLOGY.he.case49A, "No morphological case-marking");
  assert.equal(LANGUAGE_TYPOLOGY.ar.case49A, "No morphological case-marking");
});

test("a language with real morphological CASE AFFIXES (WALS 51A) reads case-marked — Russian, Korean, Turkish, Finnish", () => {
  for (const code of ["ru", "ko", "tr", "fi"]) {
    assert.equal(roleStrategyFor(code), "case-marked", `${code} reads "${LANGUAGE_TYPOLOGY[code].caseAffix51A}" on 51A and must read case-marked`);
  }
});

test("a CLITIC case system (not an affix) reads particle, not case-marked — Japanese's postpositional clitics (the fourth strategy the opencode session's own 'go get it' thread named and never built)", () => {
  assert.equal(roleStrategyFor("ja"), "particle");
  assert.equal(LANGUAGE_TYPOLOGY.ja.caseAffix51A, "Postpositional clitics");
});

test("49A ALONE IS NOT ENOUGH (measured, the reason 51A was added): English reads '2 cases' on 49A — its closed pronoun class, he/him — which a naive rule would call case-marked; 51A correctly excludes it, since English has no case AFFIX on ordinary nouns", () => {
  assert.equal(LANGUAGE_TYPOLOGY.en.case49A, "2 cases", "English genuinely has SOME case marking by 49A's count — the naive signal that would mislead");
  assert.equal(roleStrategyFor("en"), "positional", "51A ('No case affixes or adpositional clitics') is what correctly keeps English positional despite 49A's '2 cases'");
});

test("no case affix, not Semitic, reads positional — English and Mandarin", () => {
  assert.equal(roleStrategyFor("en"), "positional");
  assert.equal(roleStrategyFor("zh"), "positional");
});

test("the negative WALS 51A category's own text contains the substring 'clitics' — a bare /clitic/ regex misreads Mandarin's 'No case affixes or adpositional clitics' as particle; the exact-match check must run first (caught by this suite, not shipped)", () => {
  assert.equal(LANGUAGE_TYPOLOGY.zh.caseAffix51A, "No case affixes or adpositional clitics");
  assert.ok(/clitic/i.test(LANGUAGE_TYPOLOGY.zh.caseAffix51A), "the trap: this negative value really does contain the substring");
  assert.equal(roleStrategyFor("zh"), "positional", "and must still read positional despite that substring");
});

test("segmentation is an orthogonal, script-level fact, disclosed apart from the WALS-derived role strategy — Japanese needs BOTH a segmenter and particle role reading; Korean needs case-marked reading but no segmenter; Mandarin needs a segmenter despite being positional", () => {
  assert.equal(needsSegmentation("ja"), true);
  assert.equal(roleStrategyFor("ja"), "particle", "Japanese's postpositional clitics ride unsegmented text — both facts apply at once");
  assert.equal(needsSegmentation("ko"), false, "Korean is conventionally space-delimited, unlike Japanese");
  assert.equal(needsSegmentation("zh"), true);
  assert.equal(needsSegmentation("en"), false);
  assert.equal(needsSegmentation("he"), false);
});

test("an unregistered language is a typed gap, never a guessed default", () => {
  assert.equal(roleStrategyFor("xx"), null);
  assert.equal(needsSegmentation("xx"), null);
  assert.deepEqual(typologyFor("xx"), { langCode: "xx", declared: false });
});

test("typologyFor composes the full declaration a caller actually wants, in one call", () => {
  const t = typologyFor("ru");
  assert.equal(t.declared, true);
  assert.equal(t.roleStrategy, "case-marked");
  assert.equal(t.needsSegmentation, false);
  assert.equal(t.genus, "Slavic");
  assert.equal(t.dominantOrder, "SVO");
  assert.equal(t.caseSystem, "6-7 cases");
  assert.equal(t.caseAffix, "Case suffixes");
});
