// elenchus.test.mjs — Socrates, the archon of the standing question (P244).
// The bank is closed and cited, the picker reads the merge (never
// re-derives it), and the gate refuses a non-AGREE render without its
// verbatim question. Built to fail both ways (II.23): every row fires on
// its own standing AND refuses the wrong one, so a gate that stopped
// looking fails here rather than passing quietly.
// PLANTED-CONTROL.
import test from "node:test";
import assert from "node:assert/strict";
import { ELENCHUS_BANK, elenchusRow, questionFor, gateCrown } from "../eoreader7/native/organs/elenchus.js";
import { renderCrown, assertCrownShippable } from "./crown.js";
import { mergeTestimony } from "../eoreader7/native/organs/index.js";

const hold = (who, read = [`${who}#0-10`]) => ({ verdict: "holds", who, read, edges: [{ subject: "Lincoln", verb: "appointed", object: "Hamlin" }] });
const refuse = (who, read = [`${who}#0-10`]) => ({ verdict: "refused", who, read, edges: [{ subject: "Lincoln", verb: "appointed", object: "Hamlin" }] });
const und = (who) => ({ verdict: "undetermined", who, read: [`${who}#0-10`], edges: [] });

test("the bank is closed, cited, five rows, no sixth", () => {
  assert.equal(ELENCHUS_BANK.length, 5);
  assert.ok(Object.isFrozen(ELENCHUS_BANK));
  for (const row of ELENCHUS_BANK) {
    assert.ok(row.id && row.firesOn && row.cites && row.template, `${row.id} names what it is and where it comes from`);
    assert.equal(elenchusRow(row.id), row);
  }
  assert.equal(elenchusRow("elenchus-flattery"), null, "no sixth row");
});

test("AGREE needs no question; every other standing earns exactly one", () => {
  const agree = mergeTestimony([hold("a.txt"), hold("b.txt")]);
  assert.equal(agree.case, "AGREE");
  assert.equal(questionFor(agree), null);

  const single = mergeTestimony([hold("a.txt")]);
  assert.equal(questionFor(single).id, "elenchus-definition");

  const disagree = mergeTestimony([hold("a.txt"), refuse("b.txt")]);
  const q = questionFor(disagree);
  assert.equal(q.id, "elenchus-counterinstance");
  assert.match(q.text, /b\.txt/, "the disagreeing witness is named verbatim");

  const contradicted = mergeTestimony([refuse("a.txt"), refuse("b.txt")]);
  const qc = questionFor(contradicted);
  assert.equal(qc.id, "elenchus-unanimous-refusal");
  assert.match(qc.text, /a\.txt/, "an addressed refusing witness is named verbatim");

  const none = mergeTestimony([und("a.txt")]);
  assert.equal(questionFor(none).id, "elenchus-aporia");

  const unknown = questionFor({ case: "SOMETHING-ELSE", holds: [], refused: [], undetermined: [] });
  assert.equal(unknown.id, "elenchus-aporia", "the defensive floor fails toward the named gap");
});

test("a cycle takes precedence over the case row", () => {
  const single = mergeTestimony([hold("a.txt")]);
  const q = questionFor(single, { cycle: { cycle: ["dominance", "stability"], detail: "x" } });
  assert.equal(q.id, "elenchus-question-begs-itself");
  assert.match(q.text, /dominance/);
});

test("the addressed witness is preferred; an unaddressed merge still names one", () => {
  const m = mergeTestimony([refuse("self:model", []), refuse("almanac.txt")]);
  assert.equal(m.case, "CONTRADICTED");
  assert.match(questionFor(m).text, /almanac\.txt/, "the addressed refusal is named, not the bare self-assertion");
  const bare = mergeTestimony([refuse("self:model", [])]);
  assert.match(questionFor(bare).text, /self:model/, "with nothing addressed, the witness is still named verbatim — never a paraphrase, never silence");
});

test("the gate: AGREE passes bare; non-AGREE without its verbatim question is REFUSED", () => {
  const agree = mergeTestimony([hold("a.txt"), hold("b.txt")]);
  assert.deepEqual(gateCrown(agree, null), { ok: true, refused: null });

  const single = mergeTestimony([hold("a.txt")]);
  const missing = gateCrown(single, null);
  assert.equal(missing.ok, false);
  assert.equal(missing.refused.rule, "socrates-required");
  assert.equal(missing.refused.severity, "refuse");
  assert.equal(missing.refused.cites, "P244");

  const right = questionFor(single);
  assert.deepEqual(gateCrown(single, right), { ok: true, refused: null });

  const other = questionFor(mergeTestimony([und("a.txt")]));
  const wrong = gateCrown(single, other);
  assert.equal(wrong.ok, false, "the right bank, wrong row, is still refused");

  const reworded = { ...right, text: "So what do you think about this?" };
  assert.equal(gateCrown(single, reworded).ok, false, "a reworded question is refused — the closed set is the load-bearing part");

  assert.equal(gateCrown(single, { id: "elenchus-flattery", text: "x" }).ok, false, "no sixth row");
});

test("crown.js carries the question beside the sentence and refuses to ship without it", () => {
  const single = mergeTestimony([hold("lincoln.txt")]);
  const crowned = renderCrown(single);
  assert.equal(crowned.apparatus.case, "SINGLE");
  assert.ok(crowned.text.includes("According to"), "the sentence is byte-identical to before the gate");
  assert.equal(crowned.socrates.id, "elenchus-definition", "auto-attached: no code path ships non-AGREE without one");
  assert.ok(crowned.socratesText.length > 0);
  assert.equal(crowned.socratesRefused, null);
  assert.doesNotThrow(() => assertCrownShippable(crowned));

  const bare = renderCrown(single, { socrates: null });
  assert.ok(bare.socratesRefused, "explicitly carrying none is an honest refusal, not silent");
  assert.throws(() => assertCrownShippable(bare), /socrates-required/);

  const agree = mergeTestimony([hold("a.txt"), hold("b.txt")]);
  const ac = renderCrown(agree);
  assert.equal(ac.socrates, null);
  assert.equal(ac.socratesText, "");
  assert.equal(ac.socratesRefused, null);
  assert.doesNotThrow(() => assertCrownShippable(ac), "AGREE ships bare");
});
