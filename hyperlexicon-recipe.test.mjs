// hyperlexicon-recipe.test.mjs — recipeId's own tests, in a SEPARATE file on
// purpose (the hyperlexicon-stance.test.mjs precedent): hyperlexicon.test.mjs
// reaches the engine through ../eoreader7/legacy-eoreader6.1, an
// uninitialised submodule in this checkout, so that whole file cannot load —
// a case appended there would silently never execute. recipeId itself needs
// no engine organ (LP5's identity is over a plain descriptor object), so it
// is tested in complete isolation here instead.
import { test } from "node:test";
import assert from "node:assert/strict";
import { recipeId } from "./hyperlexicon.js";

test("recipeId: deterministic — the same descriptor always yields the same id", async () => {
  const descriptor = { organs: ["relations", "grammar-lens"], priors: ["en/determiners"] };
  const a = await recipeId(descriptor);
  const b = await recipeId(descriptor);
  assert.equal(a, b);
});

test("recipeId: key order in the descriptor does not change the id — canonicalised before hashing", async () => {
  const a = await recipeId({ organs: ["relations"], priors: ["en/negation"], version: 1 });
  const b = await recipeId({ version: 1, priors: ["en/negation"], organs: ["relations"] });
  assert.equal(a, b);
});

test("recipeId: a different descriptor yields a different id", async () => {
  const a = await recipeId({ organs: ["relations"] });
  const b = await recipeId({ organs: ["relations", "grammar-lens"] });
  assert.notEqual(a, b);
});

test("recipeId: nested objects and arrays canonicalise consistently regardless of construction order", async () => {
  const a = await recipeId({ recipe: { organs: ["a", "b"], priors: { en: ["x", "y"] } } });
  const b = await recipeId({ recipe: { priors: { en: ["x", "y"] }, organs: ["a", "b"] } });
  assert.equal(a, b);
});

test("recipeId: array element ORDER still matters — canonicalisation sorts object keys, never array contents", async () => {
  const a = await recipeId({ organs: ["a", "b"] });
  const b = await recipeId({ organs: ["b", "a"] });
  assert.notEqual(a, b, "array order is part of the descriptor's meaning and must not be silently reordered away");
});

test("recipeId: returns a 16-character lowercase hex string (SHA-256 truncated, builds.js/skills.js's own convention)", async () => {
  const id = await recipeId({ organs: ["relations"] });
  assert.equal(typeof id, "string");
  assert.equal(id.length, 16);
  assert.match(id, /^[0-9a-f]{16}$/);
});

test("recipeId: a prose 'description' field participates in the hash like any other key — identity is over the WHOLE descriptor object the caller declares", async () => {
  // LP5's point is that identity should be machine-meaningful rather than
  // resting on prose wording alone — but recipeId itself has no opinion on
  // which keys a caller puts in the descriptor. A caller who wants prose-
  // stability keeps prose out of the descriptor; recipeId just hashes
  // whatever object it is handed, consistently.
  const withProse = await recipeId({ organs: ["relations"], note: "reads SVO edges" });
  const rewordedProse = await recipeId({ organs: ["relations"], note: "extracts subject-verb-object triples" });
  assert.notEqual(withProse, rewordedProse, "recipeId hashes the descriptor verbatim, including any prose keys a caller chooses to put in it");
});

test("recipeId: primitive values (string/number/boolean/null) at the top level are accepted and distinguished", async () => {
  const s = await recipeId("plain-string-descriptor");
  const n = await recipeId(42);
  const bo = await recipeId(true);
  const nu = await recipeId(null);
  const ids = new Set([s, n, bo, nu]);
  assert.equal(ids.size, 4, "four distinct primitive descriptors must hash to four distinct ids");
});
