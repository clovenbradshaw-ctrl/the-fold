// grounding-gfp.test.mjs — the GFP-base relational grounding (2026-09-15).
// Pure, organs injected: the hyperlexicon seam, Parmenides, and the slot
// organ (the language's eigenvalue). Tests the English role organ against
// the user's Yoda principle: word order is a convention that can be turned
// OFF while structure (definiteness, genitive) stays ON.
import test from "node:test";
import assert from "node:assert/strict";
import * as nativeTaskLog from "../eoreader7/native/kernel/task-log.js";
import { cellOf, GRAINS } from "../eoreader7/native/kernel/cube.js";
import { makeHyperlexicon } from "./hyperlexicon.js";
import { makeGfpGround, englishSlots, positionalSlots } from "./grounding-gfp.js";
import { makeParmenides } from "./parmenides.js";
import { groundOf } from "./ground-ladder.js";

const TASKLOG = { createTaskLog: nativeTaskLog.createTaskLog, append: nativeTaskLog.append, projectTasks: nativeTaskLog.projectTasks, ENTRY_KINDS: nativeTaskLog.ENTRY_KINDS, OPERATOR_BASIS: nativeTaskLog.OPERATOR_BASIS, GRAINS, cellOf };
const fold = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const parmenides = makeParmenides({ fold, sameAct: () => null });
const makeGround = (slotsOf) => {
  const gfp = makeGfpGround({ makeNotes: makeHyperlexicon, taskLog: TASKLOG, parmenides, slotsOf });
  return (mat, ans) => {
    const passages = [{ ref: "m.txt", text: mat }];
    const { notes, claimsFor } = gfp({ passages });
    const claims = claimsFor(ans);
    return groundOf(ans, { claims, witness: null, notes, derived: [], disputes: null, passages, resolveName: () => new Set(), model: "probe", groundingFindings: [], leadingNames: true });
  };
};

test("YODA, WORD ORDER AS A TOGGLE (2026-09-15, user: 'to understand yoda, we actually turn OFF some conventions'): a genuine restatement grounds via the recorded rung whether it comes in canonical SVO or Yoda order, and a role-FLIP is refused — the definite description is the distinction that makes a difference, never the position", () => {
  const ground = makeGround(englishSlots);
  const mat = "The capital of France is Paris.";
  // Canonical SVO reorder of the same proposition.
  const svo = ground(mat, "Paris is the capital of France.");
  assert.equal(svo.tier, "recorded", "a canonical reorder shares the material's resolved relation");
  // YODA: word order turned off, same relation.
  const yoda = ground(mat, "The capital of France, Paris is.");
  assert.equal(yoda.tier, "recorded", "Yoda order resolves to the SAME relation — word order is grammar, not meaning");
  // Role-flip: a different definite description, OTHER.
  const flip = ground(mat, "France is the capital of Paris.");
  assert.equal(flip.tier, "self", "the flipped claim has 'capital of Paris' as its description — OTHER, refused");
  // A bare Yoda fragment has no structure to resolve — honestly ungrounded,
  // the witness (LLM) is the last resort.
  const bare = ground(mat, "france, capital is");
  assert.equal(bare.tier, "self", "bare Yoda without the genitive is ambiguous — not invented, the witness judges");
  // Unrelated.
  const unrelated = ground(mat, "The chemical symbol for gold is Au.");
  assert.equal(unrelated.tier, "self", "an unrelated sentence shares no relation");
});

test("the English role organ resolves structure, not position: 'capital of France' is one end, and the copula-identity is canonicalized (X is Y == Y is X)", () => {
  const slots = englishSlots("The capital of France is Paris.");
  assert.deepEqual(slots, [{ end1: "capital of France", label: "is", end2: "Paris" }], "the genitive phrase is one end, the copula the label");
  const yoda = englishSlots("The capital of France, Paris is.");
  assert.deepEqual(yoda, [{ end1: "capital of France", label: "is", end2: "Paris" }], "Yoda order gives the same role assignment");
  const flip = englishSlots("France is the capital of Paris.");
  assert.deepEqual(flip, [{ end1: "France", label: "is", end2: "capital of Paris" }], "the role-flip has a different description");
});

test("the typo wall, via Parmenides (user: 'a sameness resting only on appearance is not identity'): a typo's token is OTHER under every form, so it is withheld and the verbatim rung's own byte-refusal stands", () => {
  const ground = makeGround(englishSlots);
  const typo = ground("The chemical symbol for gold is Au.", "The chemical symobl for gold is Au.");
  assert.equal(typo.tier, "self", "the typo token (symobl) participates in no shared form — not a restatement");
});

test("the slot organ is the language's eigenvalue — injectable: an order-free language supplies its own slot organ (role by case, not position), and a reorder is then the same arrangement", () => {
  // An order-free slot organ that folds word order into the arrangement
  // itself — e.g. a case-marked language whose slot organ emits the SAME
  // key whether the words come one order or the other. Here it canonicalizes
  // each pair by sorting, so a pure reorder of adjacent content is the same
  // arrangement (the inflectional eigenvalue: case carries the roles).
  const orderFreeSlots = (text) => {
    const w = String(text ?? "").split(/\s+/).filter(Boolean).map((t) => t.replace(/[.,;:!?]+$/u, ""));
    const out = [];
    for (let i = 0; i + 1 < w.length; i++) { const p = [w[i], w[i + 1]].sort(); out.push({ end1: p[0], label: "rel", end2: p[1] }); }
    return out;
  };
  const groundFree = makeGround(orderFreeSlots);
  // A PURE REORDER of adjacent content ("is the capital" -> "the capital is")
  // — under the order-free organ the sorted pairs are identical.
  const g = groundFree("The capital is Paris.", "Paris is the capital.");
  assert.equal(g.tier, "recorded", "an order-free language's slot organ (sorted adjacent pairs) admits a reorder as the same arrangement");
  // And the SAME reorder under the POSITIONAL default is refused — word order
  // matters in order-matter languages, declared by the slot organ.
  const groundPos = makeGround(positionalSlots);
  const gpos = groundPos("The capital is Paris.", "Paris is the capital.");
  assert.equal(gpos.tier, "self", "the positional eigenvalue (default) refuses the reorder — the slot organ IS the language's word-order convention");
});

test("the default positional eigenvalue uses ordered trigrams — a shared slot is distinctive, a pair is not enough (the user's 'distinctions that make a difference')", () => {
  const slots = positionalSlots("The capital of France is Paris.");
  assert.deepEqual(slots[0], { end1: "The", label: "capital", end2: "of" });
  assert.ok(slots.some((s) => s.end1 === "capital" && s.end2 === "France"), "the claim-bearing ordered slot is captured");
});