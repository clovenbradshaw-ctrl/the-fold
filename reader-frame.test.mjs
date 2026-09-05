import test from "node:test";
import assert from "node:assert/strict";
import { readerFrame } from "./reader-frame.js";

function splitSentences() {}
const options = () => ({
  splitSentences,
  extractSurfaces: () => {},
  posPriorFor: () => null,
  verbForms: new Set(["ran", "runs"]),
  nounPhraseSubjects: true,
  phrasalPredicates: true,
  attestedVerbs: true,
  morphologyIndex: {},
  resolvePronouns: null,
});

test("every option the reader was built with is in the frame: organs by name, levers by value, nulls as omissions", () => {
  const f = readerFrame({ options: options(), priors: { posPrior: null }, identity: { ends: "makeCastResolver", noteIdentity: null }, model: "gemma2:2b" });
  assert.equal(f.organs.splitSentences, "splitSentences", "a named function is an organ named by itself");
  assert.equal(f.organs.extractSurfaces, "extractSurfaces", "an arrow assigned to a key takes the key's name");
  assert.equal(f.levers.attestedVerbs, true);
  assert.equal(f.levers.phrasalPredicates, true);
  assert.equal(f.levers.verbForms, "Set(2)");
  assert.equal(f.levers.morphologyIndex, "object");
  assert.deepEqual(f.omitted, ["resolvePronouns", "identity.noteIdentity"]);
  assert.equal(f.identity.ends, "makeCastResolver");
  assert.equal(f.priors.posPrior, null);
  assert.equal(f.model, "gemma2:2b");
});

test("an option added to the reader cannot be left undeclared: the frame moves with the options object", () => {
  const base = readerFrame({ options: options() });
  const widened = readerFrame({ options: { ...options(), objectBoundaryFrom: () => {} } });
  assert.notDeepEqual(base, widened);
  assert.equal(widened.organs.objectBoundaryFrom, "objectBoundaryFrom");
  const flipped = readerFrame({ options: { ...options(), attestedVerbs: false } });
  assert.equal(flipped.levers.attestedVerbs, false);
  assert.notDeepEqual(base.levers, flipped.levers, "a lever flipped is a different frame, hence a different recipe");
});

test("the frame is deterministic in key order, so the recipe id is stable across insertion order", () => {
  const a = options();
  const b = Object.fromEntries(Object.entries(a).reverse());
  assert.deepEqual(readerFrame({ options: a }), readerFrame({ options: b }));
});

test("a frame without an options object is refused as a shape error, never invented", () => {
  assert.throws(() => readerFrame({}), /options/);
});
