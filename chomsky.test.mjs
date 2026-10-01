// chomsky.test.mjs — the language-universality pin. Chomsky, the archon of
// the universal grammar (solon.js's register; archon-compendium.js's
// "chomsky" entry), is in charge of ONE law: the arrangement is universal
// and medium-blind; a language's role grammar — English-SVO or any other
// positional grammar — is DECLARED via a measured RoleConfig@1, never the
// default. All cognition reads GFP-shaped (end1-label-end2, typed by cell);
// English-SVO comes online only where a caller declares it.
//
// The pin is mechanical and scans the PRODUCTION wiring, not a fixture:
//   - the fold's page reader must route through the language dispatch
//     (relationExtractorsFor) — never import the legacy English SVO
//     extractor directly;
//   - the dispatch call must declare a roleConfig (SVO is earned, never
//     implicit);
//   - the verb-attestation gates must check the prior's DECLARED language
//     before reading its forms (an English table is no oracle for a Russian
//     page — measured, the-fold POLICIES.md P74);
//   - the verb-share threshold is ONE constant (GRAMMAR_MIN_SHARE), never
//     three spellings of the same 0.5.
//
// RED UNTIL THE WIRING LANDS: minted 2026-09-20 with app.js still importing
// /engine-v7/adapters/text/relations.js. The archon's first act is to fail
// the build.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : null);
const appSrc = read(path.join(HERE, "app.js")) ?? "";
const assaySrc = read(path.join(HERE, "..", "eoreader7", "native", "eval", "the-fold", "lib", "product-assay.mjs")) ?? "";
const hypergraphSrc = read(path.join(HERE, "..", "eoreader7", "native", "organs", "hypergraph.js")) ?? "";
const recursiveSrc = read(path.join(HERE, "..", "eoreader7", "native", "adapters", "text", "recursive.js")) ?? "";

test("the fold's page reader routes through the language dispatch — never the legacy English-SVO extractor directly", () => {
  // Chomsky's law, wired: app.js (and the rig's mirror, product-assay.mjs)
  // must select the relation reader through relationExtractorsFor. The
  // legacy the legacy engine SVO extractor (adapters/text/relations.js) is the
  // universal-by-default this pin exists to retire.
  for (const [name, src] of [["app.js", appSrc], ["product-assay.mjs", assaySrc]]) {
    assert.match(src, /relationExtractorsFor/, `${name} must route the relation reader through the language dispatch`);
    assert.doesNotMatch(src, /adapters\/text\/relations\.js["']/, `${name} must not import the legacy English-SVO extractor directly`);
  }
});

test("English-SVO comes online only when a RoleConfig is DECLARED — never implied", () => {
  // The dispatch call must carry an explicit roleConfig (a measured
  // RoleConfig@1 with provenance, II.23-licensed) and a posPrior. A bare
  // language name must never be enough.
  for (const [name, src] of [["app.js", appSrc], ["product-assay.mjs", assaySrc]]) {
    const call = src.match(/relationExtractorsFor\(\{[\s\S]{0,400}?\}\)/);
    assert.ok(call, `${name}: a relationExtractorsFor call exists`);
    assert.match(call[0], /roleConfig/, `${name}: the dispatch call declares a roleConfig`);
    assert.match(call[0], /posPrior/, `${name}: the dispatch call carries the posPrior (a RoleConfig without one is refused by the dispatch itself)`);
  }
});

test("the verb-attestation gates check the prior's DECLARED language before reading its forms", () => {
  // The POS gates (hypergraph's verbAttested/vocabulary gate, recursive.js's
  // admittedRelationVerbs) read `posPrior.forms` as a verb oracle. An
  // English treebank's table is "honestly no gate" on a Russian page
  // (P74) — so the gates must consult the prior's declared language, never
  // assume eng. Each gate either (a) reads a `language` field off the prior
  // or a caller-declared language, or (b) is scoped to the dispatch, which
  // already gates by language.
  assert.match(recursiveSrc, /\.language\b/, "recursive.js's received-prior tier must read the prior's declared language");
  assert.match(hypergraphSrc, /GRAMMAR_MIN_SHARE/, "hypergraph.js's vocabulary gate uses the declared share constant");
});

test("the verb-share threshold is ONE constant, not N spellings of 0.5", () => {
  // The same share was spelled `> 0.5` (relations.js), `<= 0.5`
  // (hypergraph.js nonverbDominant), `>= 0.5` (hypergraph.js verbAttested),
  // `classShare = 0.5` (relations-positional.js) and
  // `>= GRAMMAR_MIN_SHARE` (hypergraph.js vocabulary gate) — the drift
  // class this project's postmortems keep naming (P22/P24). The scan is
  // STRUCTURAL, not a list of the spellings found once (falsified
  // 2026-09-20: the first regex missed four spellings): a bare `0.5` in
  // share position in any reading-stack file fails.
  const readingStack = [
    ["relations.js", read(path.join(HERE, "..", "eoreader7", "native", "adapters", "text", "relations.js")) ?? ""],
    ["relations-positional.js", read(path.join(HERE, "..", "eoreader7", "native", "adapters", "text", "relations-positional.js")) ?? ""],
    ["relations-gfp.js", read(path.join(HERE, "..", "eoreader7", "native", "adapters", "text", "relations-gfp.js")) ?? ""],
    ["relations-language.js", read(path.join(HERE, "..", "eoreader7", "native", "adapters", "text", "relations-language.js")) ?? ""],
    ["recursive.js", recursiveSrc],
    ["hypergraph.js", hypergraphSrc],
    // The 0.5 boundary's full family (2026-09-20): the class-dominance
    // floor is ONE constant — the verb side, the NOUN side, the identity
    // evidence path, the heard-surfaces path, the LaVar spiral's verb
    // confirmation, and every dominantClass minShare call.
    ["identity-evidence.js", read(path.join(HERE, "..", "eoreader7", "native", "adapters", "text", "identity-evidence.js")) ?? ""],
    ["heard-surfaces.js", read(path.join(HERE, "..", "eoreader7", "native", "organs", "heard-surfaces.js")) ?? ""],
    ["greek.mjs", read(path.join(HERE, "..", "eoreader7", "native", "eval", "lavar", "greek.mjs")) ?? ""],
    ["english.mjs", read(path.join(HERE, "..", "eoreader7", "native", "eval", "lavar", "english.mjs")) ?? ""],
    ["sanskrit.mjs", read(path.join(HERE, "..", "eoreader7", "native", "eval", "lavar", "sanskrit.mjs")) ?? ""],
    ["ranke-backwards.mjs", read(path.join(HERE, "..", "eoreader7", "native", "eval", "the-fold", "ranke-backwards.mjs")) ?? ""],
  ];
  const shareish = /(verbShare|verbish|classShare|shareOf|\/ total|minShare)[^;\n]*0\.5/;
  for (const [name, src] of readingStack) {
    const hits = [...src.matchAll(new RegExp(shareish.source, "g"))].map((m) => m[0].trim().slice(0, 80));
    assert.deepEqual(hits, [], `${name}: no bare 0.5 in share position — use GRAMMAR_MIN_SHARE (${hits.join("; ")})`);
  }
});

// ── THE DECLARATION GATE ──────────────────────────────────────────────────
// English-SVO is declared only when the measured eng RoleConfig@1 is
// demonstrated on the fold's OWN material. The config exists and is
// II.23-licensed, but its positional reader was measured on Hebrew/Arabic
// (S121/S122) — measured 2026-09-20 against the fold's battery material
// ("Ulysses S. Grant was born in Point Pleasant, Ohio, in 1822" →
// `ambiguous_verb`, zero edges), so the fold runs GFP today and the
// SVO_DECLARED gate in app.js stays closed. This BECOMING is the gate:
// when the eng config's reader clears the battery material, remove
// {todo:true}, flip SVO_DECLARED, and re-baseline the stability battery.
test("BECOMING · chomsky-eng-svo-demonstrated: the measured eng RoleConfig@1 produces edges on the fold's own battery material", { todo: true }, async () => {
  const fs = await import("node:fs");
  const { relationExtractorsFor } = await import("../eoreader7/native/adapters/text/relations-language.js");
  const { classifyWord, dominantClass } = await import("../eoreader7/native/adapters/text/wordclass.js");
  const posPrior = JSON.parse(fs.readFileSync(path.join(HERE, "priors-data/pos-prior-eng.json"), "utf8"));
  const roleConfig = JSON.parse(fs.readFileSync(path.join(HERE, "..", "eoreader7", "native", "priors", "role-config-eng.json"), "utf8"));
  const d = relationExtractorsFor({ language: "eng", roleConfig, posPrior, classifyWord, dominantClass });
  assert.equal(d.mode, "svo");
  const battery = [
    "Ulysses S. Grant was born in Point Pleasant, Ohio, in 1822. Grant led the Union armies to victory in the Civil War.",
    "Harry S. Truman became president in April 1945, after the death of Franklin D. Roosevelt. Truman had served as vice president for only 82 days.",
    "The Northgate Observatory was founded by Amelia Hartley in 1887. Its great refractor was repaired by Owen Blythe in 1921.",
  ];
  const total = battery.reduce((n, text) => n + d.extractRelations(text, {}).length, 0);
  assert.ok(total >= 1, `the eng RoleConfig's reader must produce edges on the battery material — measured 2026-09-20: ${total}`);
});