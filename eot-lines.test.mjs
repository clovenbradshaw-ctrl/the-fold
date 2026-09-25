// eot-lines.test.mjs — the reading, its fold, and the addresses, against the
// REAL native organs and the REAL Federalist bytes.
//
// This file exists because the module had none, and the cost was measured
// rather than hypothetical: the extent line's address was composed from a
// TRIMMED head and an UNTRIMMED start, so every extent in every reading was
// shifted left by its own leading whitespace, and nothing failed. Span
// self-verification cannot catch that — the address reads back the text that
// was recorded; what is wrong is that the recorded text is not the head the
// enumeration reported. Only a test that compares the two can see it, and
// that is the first case below.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { foldExtent, foldHypergraph, FOLD_LABELS, readEotLines } from "./eot-lines.js";
import { enumerationsIn } from "./enumeration.js";
import { tokenize } from "./source.js";

const NATIVE = path.resolve(import.meta.dirname, "..", "eoreader7", "native");
const FIXTURE = path.resolve(import.meta.dirname, "eval", "fixtures", "federalist-10-excerpt.txt");

async function organs() {
  const spans = await import(path.join(NATIVE, "adapters/text/spans.js"));
  const priors = await import(path.join(NATIVE, "adapters/text/priors.js"));
  const pronouns = await import(path.join(NATIVE, "adapters/text/pronouns.js"));
  const cube = await import(path.join(NATIVE, "kernel/cube.js"));
  return {
    splitSentences: spans.splitSentences,
    tokenize,
    negationWords: priors.NEGATION_WORDS,
    functionWords: new Set([...priors.DEFINITE_DETERMINERS, ...priors.INDEFINITE_DETERMINERS, ...priors.ANAPHORIC_PRONOUNS]),
    sameClause: pronouns.sameClause,
    cellOf: cube.cellOf,
    // Declared: without it "removing" and "removed" are different words and
    // some eliminations are missed — a disclosed loss of recall, never a
    // wrong finding. The real organ is native's own createLemmatizer.
    lemma: (w) => w.replace(/(ing|ed|es|s)$/, ""),
  };
}

const read = async (text, ref = "t.txt") => readEotLines(text, { ref, organs: await organs(), enumerationsIn });

test("EVERY line's address reads back the text it recorded — including the extent head", async () => {
  const text = fs.readFileSync(FIXTURE, "utf8");
  const lines = await read(text, "federalist-10-excerpt.txt");
  assert.ok(lines.length >= 10, "the fixture yields a real reading");
  for (const l of lines) {
    const [a, b] = l.at.split("#")[1].split("-").map(Number);
    assert.equal(text.slice(a, b).replace(/\s+/g, " "), l.text, `${l.role} ${l.id} must read back from the file`);
  }
});

test("the extent line carries the HEAD, not the head shifted by its own whitespace", async () => {
  // The measured bug: composed from a trimmed head and an untrimmed start,
  // an extent came out as " There are two methods of curing the mischiefs of
  // facti" — right length, wrong start, two characters lost off the tail.
  const lines = await read("  There are two methods of curing faction: the one, by A; the other, by B.");
  const extent = lines.find((l) => l.role === "extent");
  assert.ok(extent);
  assert.equal(extent.text, "There are two methods of curing faction");
  assert.ok(!extent.text.startsWith(" "), "an extent line never begins with the whitespace before it");
});

test("a reading is acts: cells derive from the engine's own cube, never asserted here", async () => {
  const lines = await read("There are two ways: the one, by A; the other, by B.");
  const extent = lines.find((l) => l.role === "extent");
  const filler = lines.find((l) => l.role === "filler");
  assert.equal(extent.cell, "SEG·Figure");
  assert.equal(extent.stance, "Dissecting");
  assert.equal(filler.cell, "INS·Figure");
  assert.equal(filler.stance, "Making");
  assert.equal(filler.terrain, "Entity");
});

test("the specimen: an elimination is read from a negated restatement, and resolution is arithmetic", async () => {
  const text = fs.readFileSync(FIXTURE, "utf8");
  const lines = await read(text, "f10.txt");

  const elim = lines.filter((l) => l.role === "elimination");
  assert.equal(elim.length, 1, "exactly the one the material actually makes");
  assert.match(elim[0].text, /CAUSES of faction cannot be removed/);

  const res = lines.filter((l) => l.role === "resolution");
  assert.equal(res.length, 1);
  const x = foldExtent(lines, res[0].about);
  assert.equal(x.declared, 2);
  assert.equal(x.found, 2);
  assert.equal(x.agrees, true);
  assert.equal(x.standing.length, 1, "one arm eliminated leaves one standing");
  assert.match(x.fillers.find((f) => f.eliminated).text, /removing its causes/);
  assert.match(x.fillers.find((f) => !f.eliminated).text, /controlling its effects/);
});

test("a negation must scope over the restatement, not merely share a sentence with it", async () => {
  // "...cannot be removed, and that relief is only to be sought in ...
  // controlling its EFFECTS" eliminates the FIRST filler only. Sentence-scoped
  // negation eliminated both — including the one that clause endorses.
  const text = fs.readFileSync(FIXTURE, "utf8");
  const lines = await read(text, "f10.txt");
  const eliminated = new Set(lines.filter((l) => l.role === "elimination").map((l) => l.about));
  const controlling = lines.find((l) => l.role === "filler" && /controlling its effects/.test(l.text));
  assert.ok(controlling);
  assert.ok(!eliminated.has(controlling.id), "the endorsed filler is never eliminated by the clause that endorses it");
});

test("foldHypergraph projects edges from lines, each carrying the address that produced it", async () => {
  const text = fs.readFileSync(FIXTURE, "utf8");
  const lines = await read(text, "f10.txt");
  const { edges } = foldHypergraph(lines);
  assert.ok(edges.length > 0);
  for (const e of edges) assert.match(e.at, /#\d+-\d+$/, "an edge with no address is a claim nothing can check");
  assert.ok(edges.some((e) => e.label === "admits"));
  assert.ok(edges.some((e) => e.label === "resolves-to"));
});

test("the cursor scrubs: a fold at an earlier seq holds strictly less", async () => {
  const text = fs.readFileSync(FIXTURE, "utf8");
  const lines = await read(text, "f10.txt");
  const whole = foldHypergraph(lines).edges.length;
  const early = foldHypergraph(lines, { at: 2 }).edges.length;
  assert.ok(early < whole, "belief AS OF a cursor, not the whole reading");
  assert.equal(foldHypergraph(lines, { at: -1 }).edges.length, 0);
});

test("nesting is read from restatement: a sub-extent lands under the filler it re-opens", async () => {
  const text = fs.readFileSync(FIXTURE, "utf8");
  const lines = await read(text, "f10.txt");
  const sub = lines.find((l) => l.role === "extent" && /again two methods of removing the causes/.test(l.text));
  assert.ok(sub, "the second enumeration is read");
  assert.ok(sub.nests_under, "and it nests rather than floating");
  const parent = lines.find((l) => l.id === sub.nests_under);
  assert.match(parent.text, /removing its causes/);
});

test("organs are injected — this module reads no language and imports no engine of its own", async () => {
  await assert.rejects(async () => readEotLines("x", { ref: "t", organs: {}, enumerationsIn }), /is injected/);
});

// ── the fold's own discipline (2026-09-01) ───────────────────────────────

test("every edge carries an IDENTITY as well as a display", async () => {
  const text = fs.readFileSync(FIXTURE, "utf8");
  const { edges } = foldHypergraph(await read(text, "f10.txt"));
  for (const e of edges) {
    assert.ok(e.subjectId && e.objectId, "a node addressed only by its own sentence can never join with anything");
    assert.ok(e.from, "an edge names the line that produced it");
    assert.notEqual(e.subjectId, e.subject, "identity and display are different things");
  }
});

test("a dangling reference is a TYPED GAP, never an edge that quietly fails to appear", () => {
  const lines = [
    { seq: 0, id: "l0", role: "extent", text: "Two ways", at: "t#0-8", cell: "SEG·Figure" },
    { seq: 1, id: "l1", role: "filler", text: "by A", at: "t#9-13", cell: "INS·Figure", fills: "NOPE" },
  ];
  const { edges, gaps, regime } = foldHypergraph(lines);
  assert.equal(edges.length, 0);
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].type, "dangling_reference");
  assert.equal(gaps[0].wanted, "NOPE");
  assert.equal(regime.gapsByType.dangling_reference, 1, "the count is reported, never a bare silence");
});

test("beyond-the-cursor is a DIFFERENT gap from absent altogether", () => {
  const lines = [
    { seq: 0, id: "l0", role: "extent", text: "Two ways", at: "t#0-8" },
    { seq: 5, id: "l5", role: "filler", text: "by A", at: "t#9-13", fills: "l9" },
    { seq: 9, id: "l9", role: "extent", text: "later", at: "t#20-25" },
  ];
  const gapped = foldHypergraph(lines, { at: 5 }).gaps;
  assert.equal(gapped[0].type, "beyond_cursor", "a reader scrubbing a cursor must tell these apart");
  // With the whole reading folded, the same pointer resolves.
  assert.equal(foldHypergraph(lines).gaps.length, 0);
});

test("a resolution with no resolves_to emits NOTHING — it never fabricates a self-edge", () => {
  const lines = [
    { seq: 0, id: "l0", role: "extent", text: "Two ways", at: "t#0-8" },
    { seq: 1, id: "l1", role: "resolution", text: "relief lies in B", at: "t#9-25", about: "l0" },
  ];
  const { edges, gaps } = foldHypergraph(lines);
  assert.equal(edges.length, 0, "an edge here would assert the extent resolves to this sentence, which is a different claim");
  assert.ok(gaps.some((g) => g.type === "missing_reference" && g.field === "resolves_to"));
});

test("an unknown role is reported, not skipped", () => {
  const { gaps } = foldHypergraph([{ seq: 0, id: "l0", role: "speculation", text: "x", at: "t#0-1" }]);
  assert.equal(gaps[0].type, "unknown_role");
  assert.equal(gaps[0].role, "speculation");
});

test("an extent with no parent is a ROOT, not a defect", () => {
  const { gaps } = foldHypergraph([{ seq: 0, id: "l0", role: "extent", text: "Two ways", at: "t#0-8" }]);
  assert.equal(gaps.length, 0, "only a DECLARED but unresolvable pointer is a gap");
});

test("every label this fold emits is declared with its basis", async () => {
  const text = fs.readFileSync(FIXTURE, "utf8");
  const { edges } = foldHypergraph(await read(text, "f10.txt"));
  for (const e of edges) {
    assert.ok(FOLD_LABELS[e.label], `${e.label} is emitted but not declared — an overlay with no basis`);
    assert.ok(FOLD_LABELS[e.label].basis.length > 0);
  }
});

test("the regime reports what was folded, out of what, and at which cursor", async () => {
  const text = fs.readFileSync(FIXTURE, "utf8");
  const lines = await read(text, "f10.txt");
  const whole = foldHypergraph(lines);
  assert.equal(whole.regime.of, lines.length);
  assert.equal(whole.regime.folded, lines.length);
  assert.equal(whole.regime.at, null, "no cursor is null, never a fake number");
  const early = foldHypergraph(lines, { at: 3 });
  assert.equal(early.regime.at, 3);
  assert.ok(early.regime.folded < whole.regime.folded);
  assert.ok(Object.keys(whole.regime.edgesByLabel).length > 0);
});
