// identity-routes-wiring.test.mjs — P263's two decisions about the page, enforced.
//
// DECIDED YES: the enclitic route (a name asked with the possessive mark reaches what the bare name reaches) is wired into the two cast-based
// indexes app.js builds — the boolean resolver `castFor` and the turn's identity index `referentIndexFor` — for the language app.js DECLARES.
// The organ's own walls (declared language, last word's end and first word's beginning only, recovery only, a one-letter stem is never folded) are in
// ../eoreader7/native/organs/identity-routes.test.mjs; its measured joins are in eval/the-fold/results/possessive-audit-RESULTS.md.
//
// DECIDED, P265: the route is LEARNED, not typed. The page holds no rule of any language: it declares the language, fetches the NameFormPrior@1 a
// treebank taught (eoreader7 priors/name-forms-eng.json, READING-SPEC S139), and builds the fold with `learnedNameFold`, data-gated like the POS prior
// (P73). The learned route answers 21,880 of 21,886 audited queries as the typed one did
// (eval/the-fold/results/possessive-audit-learned-RESULTS.md, read by the eoreader7 test tests/possessive-audit-learned-results.test.js).
//
// DECIDED NO: the alias route is NOT folded into an index. Measured out of sample, a declared "X (Y)" is an alias 18.0% of the time; with the
// distinctness walls 43.5% on 23 admits (eval/the-fold/results/alias-precision-RESULTS.md, read by tests/alias-precision-results.test.js).
// If a later pass clears the bar that document states (>= 90% precision on >= 30 decided admits, out of sample, labels fixed first), it changes
// THIS test in the same commit — the point of a negative wall is that lifting it is a deliberate act with a number attached.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const block = (name) => {
  const i = app.indexOf(`const ${name} = `);
  assert.ok(i >= 0, `${name} is defined in app.js`);
  return app.slice(i, app.indexOf("\n});", i) + 4);
};

test("the enclitic route is LEARNED: built through the organs seam from a declared language and a prior the page fetches, and the page holds no typed rule", () => {
  assert.match(app, /import \{ learnedNameFold \} from "\.\.\/eoreader7\/native\/organs\/index\.js";/, "the organ comes through the one seam");
  assert.match(app, /const MATERIAL_LANGUAGE = "eng";/);
  assert.match(app, /learnedNameFold\(\{ language: MATERIAL_LANGUAGE, prior: j, isNumeral: isRomanNumeral \}\)/);
  assert.match(app, /isNearMissSpelling, isRomanNumeral \} from "\/engine-v7\/adapters\/text\/surfaces\.js"/, "the numeral test is the engine's own, not restated here");
  assert.match(app, /PRIOR_LOADS\.push\(fetch\(`\/engine-v7\/priors\/name-forms-\$\{MATERIAL_LANGUAGE\}\.json`\)/, "the prior is fetched through the engine mount, so the static build rewrites the path like any other");
  assert.ok((app.match(/console\.warn\("name-form route off:"/g) ?? []).length >= 3, "a missing, refused or unreachable prior is said, not silent");
  assert.match(app, /const encliticFold = \(name\) => \(nameFormRoute\.fold \? nameFormRoute\.fold\(name\) : name\);/, "until the prior arrives the fold is the identity: the index is what it was before the route existed");
  // the negative wall: the typed English rule is not in the page, and neither is the engine's per-token strip it was built on
  for (const sym of ["terminalEncliticFold", "ENCLITIC_PRIORS", "lastTokenFold", "stripPossessive", "encliticRoute"]) {
    assert.doesNotMatch(app, new RegExp(`\\b${sym}\\b`), `app.js uses ${sym}: the page declares a language and loads a prior; a rule typed into the page is the one-off the learned route replaced (P265)`);
  }
});

test("both cast-based indexes carry the route; neither is handed it under a mode that folds always", () => {
  for (const name of ["castFor", "referentIndexFor"]) {
    const b = block(name);
    assert.match(b, /surfaceFold: encliticFold,/, `${name} carries the route`);
    assert.doesNotMatch(b, /surfaceFoldMode/, `${name} takes the default (recovery) mode: folding always joined referents the index kept apart, 8.2% of them different beings`);
  }
});

test("the prior the page fetches is the audited one: it is for the declared language, names its giver, clears the bar it was held to, and folds the way the page needs", async () => {
  const { learnedNameFold } = await import("../eoreader7/native/organs/index.js");
  const { isRomanNumeral } = await import("../eoreader7/native/adapters/text/surfaces.js");
  const prior = JSON.parse(readFileSync(new URL("../eoreader7/native/priors/name-forms-eng.json", import.meta.url), "utf8"));
  assert.equal(prior.schema, "NameFormPrior@1");
  const route = learnedNameFold({ language: "eng", prior, isNumeral: isRomanNumeral });
  assert.equal(route.gap, null, "the declared language has a prior and it loads");
  assert.ok(prior.provenance.giver.value && prior.provenance.source.value.includes("sha256"), "it names its giver and the bytes it learned from");
  const t = prior.operatingPoint.heldOut.test;
  assert.ok(t.A >= 0.9 && t.issued >= 30, "it carries the held-out score that licensed it: precision at least 0.90 on at least 30 issued types");
  for (const [name, want] of [["Anna's", "Anna"], ["Anna’s", "Anna"], ["Jones'", "Jones"], ["Elizabeth Hart's", "Elizabeth Hart"], ["Dante's Inferno", "Dante's Inferno"], ["Seven P's", "Seven P's"], ["Charles I's", "Charles I"]]) assert.equal(route.fold(name), want, name);
  assert.equal(learnedNameFold({ language: "deu", prior, isNumeral: isRomanNumeral }).fold, null, "a language the page has not declared gets no fold from this prior");
});

test("the alias route is not folded into any index (identity by declaration alone is 18.0% right; the walled layer 43.5% on 23 admits)", () => {
  for (const sym of ["declaredAliases", "licenseAliases", "aliasClasses", "aliasClassMap", "aliasIndex"]) {
    assert.doesNotMatch(app, new RegExp(`\\b${sym}\\b`), `app.js uses ${sym}: re-run eval/the-fold/alias-precision.mjs against the bar in alias-precision-RESULTS.md, then change this test in the same commit`);
  }
});
