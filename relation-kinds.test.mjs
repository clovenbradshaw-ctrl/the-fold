// relation-kinds.test.mjs — kindOf(connector) → one of the 27 cells (2026-09-15,
// user direction: "the metastructure is the meaning; all the slots and word
// order is just means to an end; if we keep our eyes on the metastructure, we
// can be omnilingual"). Pure.
import test from "node:test";
import assert from "node:assert/strict";
import { kindOf, setSameAct } from "./relation-kinds.js";

test("a relationship's KIND is which of the 27 cells its label is — the closed lattice, never an open verb list", () => {
  assert.equal(kindOf("is").cell, "SIG·Figure", "a copula is identity — Existence·Figure");
  assert.equal(kindOf("wrote").cell, "CON·Figure", "an action is a link — Structure·Figure");
  assert.equal(kindOf("replaced").cell, "REC·Pattern", "a succession is a re-ground — Interpretation·Pattern");
  assert.equal(kindOf("greater than").cell, "EVA·Figure", "a comparison is an evaluation — Interpretation·Figure");
  assert.equal(kindOf("made of").cell, "SYN·Pattern", "composition — Structure·Pattern");
  assert.equal(kindOf("has").cell, "CON·Figure", "possession is a link — Structure·Figure");
  assert.equal(kindOf("not").cell, "SEG·Ground", "a negation is a cut — Structure·Ground");
  assert.equal(kindOf("of").cell, "SEG·Ground", "a partitive is a cut — Structure·Ground");
  assert.equal(kindOf("located in").cell, "CON·Ground", "spatial is a field — Structure·Ground");
});

test("OMNILINGUAL (user: 'if we keep our eyes on the metastructure, we can be omnilingual'): the same KIND lands on the same CELL across scripts — the cell is the meaning, never the string", () => {
  const copulas = ["is", "היא", "является", "был", "была", "are"];
  for (const c of copulas) assert.equal(kindOf(c).cell, "SIG·Figure", `${c} is a copula -> SIG·Figure`);
  const possessives = ["has", "יש ל", "имеет"];
  for (const p of possessives) assert.equal(kindOf(p).cell, "CON·Figure", `${p} is possession -> CON·Figure`);
});

test("a connector no closed kind admits is a TYPED GAP, never a guess — an unclassed relation is a fact about the taxonomy, not a fabricated cell", () => {
  const g = kindOf("gibberish_qzx");
  assert.equal(g.gap, "unclassed");
  assert.match(g.detail, /no closed kind admits/);
  assert.equal(kindOf("").gap, "no_label");
});

test("the cell carries cube.js's own derived fields (terrain, stance, domain) — one authority, never a second table", () => {
  const k = kindOf("replaced");
  assert.equal(k.cell, "REC·Pattern");
  assert.equal(k.terrain, "Paradigm");
  assert.equal(k.stance, "Composing");
  assert.equal(k.domain, "Interpretation");
  assert.equal(k.op, "REC");
  assert.equal(k.grain, "Pattern");
});

test("sameAct folds inflections onto their lemma's cell when injected — with the organ, 'replaces' and 'replaced' are the same kind", () => {
  setSameAct((a, b) => ({ a, b, verdict: a.toLowerCase() === "replace" && b.toLowerCase() === "replaced" ? "same" : a === b ? "same" : "other" }));
  assert.equal(kindOf("replaced").cell, "REC·Pattern", "with the morphology organ, the inflection lands on the lemma's cell");
  setSameAct(null);
  // Without the organ, the explicit list still covers the common inflections.
  assert.equal(kindOf("replaced").cell, "REC·Pattern");
});