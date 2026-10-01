// identity-routes-wiring.test.mjs — P263's two decisions about the page, enforced.
//
// DECIDED YES: the enclitic route (a name asked with the possessive mark reaches what the bare name reaches) is wired into the two cast-based
// indexes app.js builds — the boolean resolver `castFor` and the turn's identity index `referentIndexFor` — for the language app.js DECLARES.
// The organ's own walls (declared language, last token only, recovery only, a one-letter stem is never folded) are in
// ../eoreader7/native/organs/identity-routes.test.mjs; its measured joins are in eval/the-fold/results/possessive-audit-RESULTS.md.
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

test("the enclitic route is built from a DECLARED language, through the organs seam, with the engine's own per-token strip", () => {
  assert.match(app, /import \{ terminalEncliticFold \} from "\.\.\/eoreader7\/native\/organs\/index\.js";/, "the organ comes through the one seam");
  assert.match(app, /const MATERIAL_LANGUAGE = "eng";/);
  assert.match(app, /terminalEncliticFold\(\{ language: MATERIAL_LANGUAGE, stripEnclitic: stripPossessive, isNumeral: isRomanNumeral \}\)/);
  assert.match(app, /stripPossessive, isRomanNumeral \} from "\/engine-v7\/adapters\/text\/surfaces\.js"/, "the strip and the numeral test are the engine's own, not restated here");
  assert.match(app, /if \(encliticRoute\.gap\) console\.warn\(/, "a declined route is said, not silent");
});

test("both cast-based indexes carry the route; neither is handed it under a mode that folds always", () => {
  for (const name of ["castFor", "referentIndexFor"]) {
    const b = block(name);
    assert.match(b, /surfaceFold: encliticRoute\.fold,/, `${name} carries the route`);
    assert.doesNotMatch(b, /surfaceFoldMode/, `${name} takes the default (recovery) mode: folding always joined referents the index kept apart, 8.2% of them different beings`);
  }
});

test("the alias route is not folded into any index (identity by declaration alone is 18.0% right; the walled layer 43.5% on 23 admits)", () => {
  for (const sym of ["declaredAliases", "licenseAliases", "aliasClasses", "aliasClassMap", "aliasIndex"]) {
    assert.doesNotMatch(app, new RegExp(`\\b${sym}\\b`), `app.js uses ${sym}: re-run eval/the-fold/alias-precision.mjs against the bar in alias-precision-RESULTS.md, then change this test in the same commit`);
  }
});
