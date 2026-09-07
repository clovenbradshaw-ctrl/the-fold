import test from "node:test";
import assert from "node:assert/strict";
import { plan, finding, admissible, CHAIN } from "./turn-order.js";
import { splitSentences } from "./cite.js";

test("the order is derived from the chain, not written by hand", () => {
  const p = plan([
    { name: "correct", cell: "EVA", needs: ["draft", "cut"], gives: ["corrected"] },
    { name: "retrieve", cell: "SIG", gives: ["passages", "quoted"] },
    { name: "draft", cell: "SYN", needs: ["passages"], gives: ["draft"] },
    { name: "misquote", cell: "SEG", needs: ["passages", "quoted"], gives: ["cut"] },
  ]);
  assert.deepEqual(p.order.map((s) => s.name), ["retrieve", "misquote", "draft", "correct"]);
  assert.deepEqual(CHAIN, ["NUL", "SIG", "INS", "SEG", "CON", "SYN", "DEF", "EVA", "REC"]);
});

test("a stage needing a later cell's product is a dependency inversion, refused at construction", () => {
  assert.throws(() => plan([
    { name: "draft", cell: "SYN", gives: ["draft"] },
    { name: "correct", cell: "EVA", needs: ["draft"], gives: ["corrected"] },
    { name: "guard", cell: "CON", needs: ["corrected"], gives: ["guarded"] },
  ]), /dependency inversion, refused at the gate/);
  assert.throws(() => plan([{ name: "x", cell: "NOPE" }]), /not a cell of the chain/);
  assert.throws(() => plan([{ name: "a", cell: "SIG", needs: ["nothing"] }]), /which no stage establishes/);
  assert.throws(() => plan([{ name: "a", cell: "SIG", gives: ["x"] }, { name: "b", cell: "EVA", gives: ["x"] }]), /established at two different cells/);
});

test("a finding at an earlier cell binds every later one — the live failure, dissolved rather than patched", () => {
  // SEG cut the name; EVA's rewrite tried to reinstate it (P133, measured).
  const cut = finding("SEG", "the sources say Pierre, not Lincoln", {
    forbids: ["Lincoln"],
    says: 'What that passage actually says: "Both true and untrue," Pierre began.',
  });
  const out = admissible("Lincoln began the exchange and Prince Andrew interrupted him.", [cut], { splitSentences });
  assert.equal(out.refused.length, 1);
  assert.equal(out.refused[0].cell, "SEG");
  assert.doesNotMatch(out.text, /Lincoln/);
  assert.match(out.text, /Pierre began/, "the earlier cell's own statement stands where the later cell wrote nothing admissible");
  // A sentence the finding does not forbid is untouched, and so is the rest.
  const mixed = admissible("Prince Andrew interrupted him. Lincoln began the exchange.", [cut], { splitSentences });
  assert.equal(mixed.text, "Prince Andrew interrupted him.");
  assert.equal(mixed.refused.length, 1);
  // A finding from a LATER cell does not bind an earlier one.
  const late = finding("REC", "learned afterwards", { forbids: ["Prince"] });
  assert.equal(admissible("Prince Andrew interrupted him.", [late], { splitSentences, from: "SYN" }).refused.length, 0);
  assert.equal(admissible("anything", [], { splitSentences }).refused.length, 0);
});
