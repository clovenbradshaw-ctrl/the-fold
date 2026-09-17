import test from "node:test";
import assert from "node:assert/strict";
import { concedePriorFacts } from "./concede-prior.js";
import { runMechanicalPass } from "./mechanical-pass.js";

// The reader's own semantics, stubbed to mirror hypergraph.js::read: a
// passage's claims carry a verdict — bound (agreement), contradicted (the
// material denies the act), or unbound/beyond-reach (silence).
const read = (t) => {
  const s = String(t ?? "");
  const claims = [];
  if (s.includes("did not cross")) claims.push({ end1: "the French army", label: "did not cross", end2: "the Niemen", verdict: "contradicted" });
  if (s.includes("never crossed")) claims.push({ end1: "the French army", label: "never crossed", end2: "the Niemen", verdict: "contradicted" });
  if (s.includes("crossed the Niemen")) claims.push({ end1: "the French army", label: "crossed", end2: "the Niemen", verdict: "bound" });
  return { claims };
};
const sameAct = (a, b) => {
  const fold = (w) => String(w).toLowerCase().replace(/\s+/g, " ").trim();
  const x = fold(a), y = fold(b);
  if (x === y) return true;
  // auxiliaries fold to the act they carry — "did not cross" is the act
  // "cross" denied; the reader's contradicted verdict already carries it
  return ["did not", "never", "had", "has", "have"].includes(x) && y === "crossed";
};

test("a reader CONTRADICTED verdict concedes the earlier fact, with the passage that did it", () => {
  const prior = [{ text: "the French army crossed the Niemen", refs: ["old#1"] }];
  const later = [{ ref: "pg2600.txt#1637123", text: "the French army did not cross the Niemen" }];
  const r = concedePriorFacts({ facts: prior, passages: later, read, sameAct });
  assert.equal(r.checked.length, 1);
  assert.equal(r.conceded.length, 1);
  assert.match(r.conceded[0].contradictedBy.text, /cross/);
  assert.equal(r.conceded[0].contradictedBy.passage, "pg2600.txt#1637123");
  assert.equal(r.conceded[0].contradictedBy.owner, "yadayadayada", "the concession names the paraphrase archon as the seam's owner");
});

test("a passage silent on the fact concedes NOTHING — withhold, never convict", () => {
  const prior = [{ text: "the French army crossed the Niemen", refs: ["old#1"] }];
  const later = [{ ref: "pg2600.txt#9", text: "the moon rose over the field" }];
  const r = concedePriorFacts({ facts: prior, passages: later, read });
  assert.equal(r.conceded.length, 0, "silence is not a contradiction");
});

test("an AGREED restatement (bound) never concedes — agreement is not a contradiction", () => {
  const prior = [{ text: "the French army crossed the Niemen", refs: ["old#1"] }];
  const later = [{ ref: "pg2600.txt#1637123", text: "the French army crossed the Niemen" }];
  const r = concedePriorFacts({ facts: prior, passages: later, read });
  assert.equal(r.conceded.length, 0);
});

test("a DIFFERENT act the material never denies is NOT a concession — crossing does not refute retreating", () => {
  // The book states "crossed"; a prior "retreated" fact reads unbound
  // against it (the material is silent on retreat) — a withhold, never a
  // conviction. This is the paraphrase wall's conservative side.
  const prior = [{ text: "the French army retreated from the Niemen", refs: ["old#1"] }];
  const later = [{ ref: "pg2600.txt#1637123", text: "the French army crossed the Niemen" }];
  const r = concedePriorFacts({ facts: prior, passages: later, read, sameAct });
  assert.equal(r.conceded.length, 0, "crossing is not a denial of retreating");
});

test("wired into the pass, a contradicted prior close lands REC·Figure as a rezero", () => {
  const priorAnswers = [{ text: "the French army crossed the Niemen", ref: "turn:1" }];
  const passages = [{ ref: "pg2600.txt#1637123", text: "the French army did not cross the Niemen" }];
  const priorConceded = (facts, q) => {
    const { conceded } = concedePriorFacts({ facts, passages, read, sameAct });
    return conceded.map((c) => ({ ref: c.ref, text: c.text, contradictedBy: c.contradictedBy.text }));
  };
  const r = runMechanicalPass({
    question: "Did the French army cross the Niemen?",
    organs: { read, priorConceded, sameAct },
    context: { passages, priorAnswers, voids: [] },
  });
  const rec = r.cells.find((c) => c.cell === "REC·Figure");
  assert.ok(rec.close, "the prior close was conceded — REC·Figure closed");
  assert.match(rec.close.text, /conceded/);
});

test("the reader's own verdict is the judge — the concede derives the fact's claim and asks the SAME reader", () => {
  // The fact's close may carry the pass's count prefix; the concede strips it
  // to the actual claim before asking the reader.
  const prior = [{ text: "2 claim(s) the material states about what was asked: the French army crossed the Niemen", refs: ["old#1"] }];
  const later = [{ ref: "pg2600.txt#1637123", text: "the French army never crossed the Niemen" }];
  const r = concedePriorFacts({ facts: prior, passages: later, read, sameAct });
  assert.equal(r.conceded.length, 1);
});