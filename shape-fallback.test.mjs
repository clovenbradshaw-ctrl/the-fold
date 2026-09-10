// shape-fallback.test.mjs — proves the tie-triggered shape fallback for
// source.js::retrieve() (see shape-fallback.js's own header for the
// mechanism and the one incident it is built from).
//
// Real material, not fixtures, for the retrieve()-level scenarios: the
// same real pg2600.txt (War and Peace) the whole shape-cue evidence chain
// (eoreader7/native/eval/lavar/shape-null-band.mjs,
// shape-sentence-resemblance.mjs, eval/the-fold/shape-cue-retrieval-
// failures.mjs) was measured against, and the SAME real, documented true-
// source chunk from that failure's own item 8 ("Moscow was burned by its
// inhabitants", true ref pg2600.txt#2421263-2422066).
//
// Two honest findings surfaced while building this suite, both worth
// stating rather than hiding behind a synthetic toy: (1) the real, NATURAL
// 4-way tie for that exact question, run through this fallback unmodified,
// is genuinely ambiguous — a real near-duplicate passage elsewhere in the
// book (Tolstoy restates "Moscow was burned by its own inhabitants" almost
// verbatim) scores nearly as high on the shape cue as the true passage
// itself, so the field's own null-band margin correctly refuses to guess
// between them and falls all the way back to the untouched baseline. That
// is scenario (c) below, on real, undoctored data. (2) To also demonstrate
// scenario (a) — a tie the fallback DOES resolve — the true chunk is tied
// against a real, distant, topically unrelated chunk instead (real prose
// throughout; only the TIE ITSELF, via each chunk's `.terms` Set, is
// engineered, since that Set is a derived index the shape mechanism never
// reads — it only ever reads `.text`).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { retrieve, chunkSource, tokenize } from "./source.js";
import { makeShapeFallback } from "./shape-fallback.js";
import { extractSurfaces, discoverReferents } from "../eoreader7/native/adapters/text/surfaces.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BOOK = path.join(HERE, "..", "pg2600.txt");
const raw = fs.readFileSync(BOOK, "utf8");
const bookChunks = chunkSource("pg2600.txt", raw, {});
const shapeFallback = makeShapeFallback({ extractSurfaces, discoverReferents });

const TRUE_REF = "pg2600.txt#2421263-2422066"; // shape-cue-retrieval-failures.json item 8's own documented true source
const QUESTION = "Moscow was burned by its inhabitants";

// -------------------------------------------------------------------------
// (b) a non-tie case never even engages shapeFallback — byte-identical to
// the untouched baseline. A UNIQUE top score, checked directly (7 hits,
// one chunk) rather than assumed.
test("no tie: shapeFallback is never called, output is byte-identical to the untouched baseline", () => {
  const question = "Kutúzov appointed commander in chief full powers armies";
  let calls = 0;
  const spy = (...args) => {
    calls += 1;
    return shapeFallback(...args);
  };
  const baseline = retrieve(bookChunks, question, 3);
  const withSpy = retrieve(bookChunks, question, 3, [], { shapeFallback: spy });
  assert.equal(calls, 0, "no tie at the top score — the organ must never be consulted");
  assert.deepEqual(withSpy.map((c) => c.ref), baseline.map((c) => c.ref));
  assert.deepEqual(withSpy, baseline);
});

// -------------------------------------------------------------------------
// (a) a real, exact tie the fallback correctly resolves. The true chunk
// (item 8's own documented true source) is tied against a real, distant,
// unrelated chunk — same term-overlap score, verifiably different shape.
// Every other chunk that would ALSO naturally tie at this score (the real
// near-duplicate rivals scenario (c) below is built from) is excluded here
// on purpose, so this test isolates the ONE pairwise case the mechanism was
// designed to resolve, rather than the harder multi-way case.
test("a real exact tie the fallback correctly resolves: the true War and Peace passage over a real, unrelated, equally-scored decoy", () => {
  const qTerms = [...new Set(tokenize(QUESTION))];
  const idxTrue = bookChunks.findIndex((c) => c.ref === TRUE_REF);
  assert.ok(idxTrue >= 0, "the documented true chunk must still exist in this checkout's chunking");
  const trueChunk = bookChunks[idxTrue];

  const idxDecoy = 500; // an arbitrary, real, early chunk — an ordinary dialogue scene, nothing to do with Moscow burning
  const decoyReal = bookChunks[idxDecoy];
  assert.equal(qTerms.filter((t) => decoyReal.terms.has(t)).length, 0, "the decoy must share none of the question's terms naturally");
  // Real text, unchanged; only the derived .terms Set (never read by the
  // shape mechanism, which reads .text alone) is set to tie the score.
  const decoy = { ...decoyReal, terms: new Set(trueChunk.terms) };

  // A real local neighbourhood around each side, so the shape field has
  // genuine surrounding vocabulary and referents to work with — and,
  // deliberately, every OTHER real chunk that would also naturally tie at
  // this score is excluded, isolating this one pairwise tie.
  const pool = new Map();
  for (let i = Math.max(0, idxTrue - 70); i <= Math.min(bookChunks.length - 1, idxTrue + 70); i++) pool.set(bookChunks[i].ref, bookChunks[i]);
  for (let i = Math.max(0, idxDecoy - 70); i <= Math.min(bookChunks.length - 1, idxDecoy + 70); i++) pool.set(bookChunks[i].ref, bookChunks[i]);
  pool.delete(decoyReal.ref);
  for (const [ref, c] of [...pool]) {
    if (ref === TRUE_REF) continue;
    if (qTerms.filter((t) => c.terms.has(t)).length >= 3) pool.delete(ref); // isolate the pairwise tie
  }
  pool.set(decoy.ref, decoy);
  const chunksForTest = [...pool.values()];

  const baseline = retrieve(chunksForTest, QUESTION, 1);
  assert.equal(baseline[0].ref, decoy.ref, "confirms the real incident's shape: the earliest-wins tiebreak picks the wrong, unrelated chunk");

  const withFallback = retrieve(chunksForTest, QUESTION, 1, [], { shapeFallback });
  assert.equal(withFallback[0].ref, TRUE_REF, "the shape-cue fallback correctly promotes the true passage over the unrelated decoy");
});

// -------------------------------------------------------------------------
// (c) a real, exact, NATURAL tie where no candidate clears the field's own
// null band — the fallback declines and falls back to the untouched
// baseline. This is the actual documented incident's real tied group
// (4 real chunks, score 3, item 8's own question), run unmodified: the
// true passage and one of its real rivals turn out to be genuinely close
// in shape (Tolstoy restates the sentence nearly verbatim elsewhere), so
// the field's own margin against the null band correctly refuses to guess.
test("a real exact tie with no candidate clearing the null band: falls back to the original tiebreak, unchanged", () => {
  const baseline = retrieve(bookChunks, QUESTION, 3);
  const withFallback = retrieve(bookChunks, QUESTION, 3, [], { shapeFallback });
  assert.deepEqual(withFallback.map((c) => c.ref), baseline.map((c) => c.ref));
  assert.deepEqual(withFallback, baseline, "byte-identical: declining changes nothing, not even chunk identity");
  assert.notEqual(baseline[0].ref, TRUE_REF, "confirms this really is the documented failure: the baseline still misses the true passage");
});

// -------------------------------------------------------------------------
// makeShapeFallback's own wiring, isolated from the engine organs and the
// real book — a synthetic unit test for the parts a real-material test
// cannot cheaply isolate.
test("makeShapeFallback with no organs injected always declines, never throws", () => {
  const declined = makeShapeFallback({});
  assert.equal(declined([{ ref: "a" }, { ref: "b" }], "anything", []), null);
  assert.equal(makeShapeFallback()([{ ref: "a" }, { ref: "b" }], "x", []), null);
});

test("shapeFallbackRetrieve declines defensively on malformed input rather than guessing", () => {
  const fake = makeShapeFallback({
    extractSurfaces: (sentences) => sentences.map((s, i) => ({ ...s, id: i })),
    discoverReferents: () => ({ events: [] }),
  });
  assert.equal(fake([{ ref: "only-one", source: "s", text: "x" }], "q", [{ ref: "only-one" }]), null, "fewer than 2 tied chunks");
  assert.equal(fake([], "q", []), null);
  assert.equal(
    fake([{ ref: "a", source: "s", text: "x" }, { ref: "b", source: "s", text: "y" }], "", [{ ref: "a" }, { ref: "b" }]),
    null,
    "an empty question",
  );
  assert.equal(
    fake([{ ref: "a", source: "s", text: "x" }, { ref: "b", source: "s", text: "y" }], "q", []),
    null,
    "no allChunks to build a neighbourhood from",
  );
});

// -------------------------------------------------------------------------
// The by-construction "can only help or do nothing" proof, at the
// retrieve() call site — a synthetic, controlled scored group (so the
// tied/non-tied boundary and the group size vs. limit relationship are
// exact and exhaustively checked) with a stub organ standing in for the
// real shape mechanism.
function fakeChunk(ref, start, termList) {
  return { source: "s", ref, start, end: start + 10, text: ref, terms: new Set(termList) };
}

test("retrieve()'s tie handling: promotion only ever reorders within the tied group; every non-tied chunk keeps its exact position", () => {
  // Five chunks tied at the top score (2 terms each — real tokenize() drops
  // anything <=2 characters that isn't a numeral, so real words are used
  // rather than bare letters), one lower-scored chunk (1 term) that must
  // never move regardless of what the fallback does with the tied group
  // above it.
  const tied = [
    fakeChunk("t0", 500, ["alpha", "bravo"]),
    fakeChunk("t1", 400, ["alpha", "bravo"]),
    fakeChunk("t2", 300, ["alpha", "bravo"]),
    fakeChunk("t3", 200, ["alpha", "bravo"]),
    fakeChunk("t4", 100, ["alpha", "bravo"]),
  ];
  const lower = fakeChunk("low", 50, ["alpha"]);
  const chunks = [...tied, lower];
  const question = "alpha bravo";

  // Baseline: earliest-start wins among the tie (t4, start 100), then the
  // rest in start order, then the lower-scored chunk.
  const baseline = retrieve(chunks, question, 10);
  assert.deepEqual(baseline.map((c) => c.ref), ["t4", "t3", "t2", "t1", "t0", "low"]);

  // A fallback that promotes t1 (originally rank 3 of 5 among the ties).
  const promoteT1 = (tiedChunks) => tiedChunks.find((c) => c.ref === "t1");
  const withT1 = retrieve(chunks, question, 10, [], { shapeFallback: promoteT1 });
  assert.deepEqual(withT1.map((c) => c.ref), ["t1", "t4", "t3", "t2", "t0", "low"], "t1 moves to the front of the TIED group only; the rest of the tied group keeps its original relative order; 'low' is untouched at the tail");

  // A fallback that names a chunk OUTSIDE the tied group it was handed —
  // must be ignored completely, never trusted.
  const promoteOutsider = () => lower;
  const withOutsider = retrieve(chunks, question, 10, [], { shapeFallback: promoteOutsider });
  assert.deepEqual(withOutsider, baseline, "a promotion outside the offered tied group is refused; output is the untouched baseline");

  // A fallback that declines (returns null/undefined) — untouched baseline.
  const decline = () => null;
  assert.deepEqual(retrieve(chunks, question, 10, [], { shapeFallback: decline }), baseline);

  // Same tied group, but the limit is SMALLER than the tied group size —
  // promoting a chunk that the baseline would have excluded from the
  // returned set demonstrates the one case where the fallback changes
  // WHICH chunks are returned, not merely their order — and it can only
  // ever ADD the shape-verified pick, never drop or reorder anything the
  // scoring metric ranked strictly higher.
  const baselineLimited = retrieve(chunks, question, 3);
  assert.deepEqual(baselineLimited.map((c) => c.ref), ["t4", "t3", "t2"], "t0/t1 fall outside limit=3 under the plain tiebreak");
  const withT0Limited = retrieve(chunks, question, 3, [], { shapeFallback: (tiedChunks) => tiedChunks.find((c) => c.ref === "t0") });
  assert.deepEqual(withT0Limited.map((c) => c.ref), ["t0", "t4", "t3"], "t0 — same score as every other tied member, so 'worse' has no meaning here — is retained instead of being silently dropped");
});

test("retrieve() is byte-identical to its own baseline when shapeFallback is omitted entirely (the default)", () => {
  const question = "Moscow was burned by its inhabitants";
  const a = retrieve(bookChunks, question, 3);
  const b = retrieve(bookChunks, question, 3);
  assert.deepEqual(a, b);
  const c = retrieve(bookChunks, question, 3, []);
  assert.deepEqual(a, c);
});
