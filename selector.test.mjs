// selector.test.mjs — Increment 1 of the Corpus Mouth: the Selector proposes,
// never phrases. Against the REAL lensCut and the REAL mergeTestimony —
// nothing about ranking or verdicts is stubbed, so a change that let an
// ungrounded claim through either organ fails here too.
import test from "node:test";
import assert from "node:assert/strict";
import { selectContent, scoreSelection, redealWitnesses, nullScores, VERDICT_ORDER } from "./selector.js";
import { lensCut } from "./resolutions.js";
import { mergeTestimony } from "../eoreader7/native/organs/index.js";

// The conversation's own index, stubbed at its two-method seam
// (resolve/represent — the only surface resolutions.js reads through
// referentsOf/noteIds). Real cut, real merge; only identity is stubbed.
const index = {
  resolve: (name) => {
    const n = String(name ?? "").toLowerCase();
    if (n.includes("lincoln")) return new Set(["lincoln"]);
    if (n.includes("hamlin")) return new Set(["hamlin"]);
    if (n.includes("seward")) return new Set(["seward"]);
    if (n.includes("grant")) return new Set(["grant"]);
    return new Set();
  },
  represent: (id) => id,
};

const reading = (who, verdict, [subject, verb, object], read = [`${who}#0-10`]) => ({ who, verdict, read, edges: [{ subject, verb, object }] });

const NOTES = [
  {
    subject: "Lincoln", verb: "appointed", object: "Hamlin",
    witnesses: ["lincoln.txt#0-10", "almanac.txt#20-30"],
    readings: [
      reading("lincoln.txt", "holds", ["Lincoln", "appointed", "Hamlin"]),
      reading("almanac.txt", "holds", ["Lincoln", "appointed", "Hamlin"]),
    ],
  },
  {
    subject: "Hamlin", verb: "chaired", object: "the Senate",
    witnesses: ["almanac.txt#40-50"],
    readings: [reading("almanac.txt", "holds", ["Hamlin", "chaired", "the Senate"])],
  },
  {
    subject: "Grant", verb: "commanded", object: "the army",
    witnesses: ["lincoln.txt#60-70"],
    readings: [reading("lincoln.txt", "undetermined", ["Grant", "commanded", "the army"])],
  },
];

const QUESTION = "What did Lincoln appoint?";

test("the merges the Selector types are the REAL ones — mergeTestimony's own cases", () => {
  assert.equal(mergeTestimony(NOTES[0].readings).case, "AGREE");
  assert.equal(mergeTestimony(NOTES[1].readings).case, "SINGLE");
  assert.equal(mergeTestimony(NOTES[2].readings).case, "UNDETERMINED");
});

test("Selector proposes a stable, non-empty, addressed list — no prose anywhere", () => {
  const a = selectContent({ question: QUESTION, notes: NOTES, index, merge: mergeTestimony, cut: lensCut });
  const b = selectContent({ question: QUESTION, notes: NOTES, index, merge: mergeTestimony, cut: lensCut });
  assert.equal(a.refused, null);
  // Gate-before-generation: "What did Lincoln appoint?" carries only {lincoln},
  // so Hamlin-only and Grant-only notes are correctly out of scope — the cut
  // narrows, it does not decorate. Non-empty + AGREE on top is the bar here;
  // the multi-referent question below pins the multi-candidate path.
  assert.ok(a.candidates.length >= 1, `expected non-empty candidates, got ${a.candidates.length}`);
  assert.deepEqual(a.candidates.map((c) => c.verdict), b.candidates.map((c) => c.verdict), "stable across runs");
  assert.equal(a.candidates[0].verdict, "AGREE", "corroborated claim ranks first");
  assert.equal(a.candidates[0].claim.end1, "Lincoln");
  for (const c of a.candidates) {
    assert.ok(c.claim && typeof c.claim.end1 === "string", "typed claim, not prose");
    assert.ok(Array.isArray(c.addresses), "address-nested list");
    assert.ok(!("text" in c) && !("sentence" in c) && !("prose" in c), "no prose field on a candidate");
  }
});

test("a question carrying two referents proposes both — the gate widens honestly", () => {
  const { candidates, refused } = selectContent({ question: "What did Lincoln and Hamlin do?", notes: NOTES, index, merge: mergeTestimony, cut: lensCut });
  assert.equal(refused, null);
  assert.ok(candidates.length >= 2, `expected Lincoln + Hamlin candidates, got ${candidates.length}`);
  assert.equal(candidates[0].verdict, "AGREE");
});

test("mouthFacing integrity: every non-UNDETERMINED candidate resolves to a real address", () => {
  const { candidates } = selectContent({ question: QUESTION, notes: NOTES, index, merge: mergeTestimony, cut: lensCut });
  for (const c of candidates) {
    if (c.verdict === "UNDETERMINED") continue;
    assert.ok(c.addresses.length > 0, `one orphaned claim fails the whole output: ${c.claim.end1} ${c.claim.label} ${c.claim.end2}`);
    for (const a of c.addresses) assert.match(a, /#\d+-\d+$/, `address names real bytes: ${a}`);
  }
});

test("SHUFFLE-NULL (FOLD-CONSTITUTION II.4): the real ledger beats the redealt distribution", () => {
  // Witness-count path (no readings): the ranking must come from REAL
  // co-occurrence, not from note order. Strip readings so only witnesses count.
  // Compared against EVERY rotation 1..n-1 (nullScores), read at the median —
  // one draw is a null drawn zero times: a single rotation can tie on uniform
  // bags or favor whichever kept note gains a bigger donor bag.
  const bare = NOTES.map(({ readings, ...n }) => ({ ...n }));
  const scoreOf = (ns) => scoreSelection(selectContent({ question: QUESTION, notes: ns, index, merge: mergeTestimony, cut: lensCut }).candidates);
  const real = scoreOf(bare);
  const nulls = nullScores(bare, scoreOf);
  assert.ok(nulls.length > 0, "the null draws");
  const median = [...nulls].sort((x, y) => x - y)[Math.floor(nulls.length / 2)];
  assert.ok(real > median, `real must beat the redealt median: real=${real} nulls=[${nulls.join(", ")}]`);
  // The null this article requires: same pipeline re-run, marginals preserved.
  assert.deepEqual(
    bare.map((n) => n.witnesses.length).sort(),
    redealWitnesses(bare).map((n) => n.witnesses.length).sort(),
    "marginals preserved",
  );
});

test("SHUFFLE-NULL DISCLOSED LIMIT: uniform corroboration is an unlicensed null, not a pass", () => {
  // Every note with the same bag size: rotation preserves every verdict, so
  // the statistic cannot move (FOLD-CONSTITUTION II.4 Licence). The control
  // reports zero width rather than passing or failing on it.
  const uniform = [0, 1, 2].map((i) => ({
    subject: ["Lincoln", "Hamlin", "Grant"][i], verb: "named", object: `note-${i}`,
    witnesses: [`src${i}.txt#0-10`],
  }));
  const scoreOf = (ns) => scoreSelection(selectContent({ question: "What did Lincoln and Hamlin and Grant do?", notes: ns, index, merge: mergeTestimony, cut: lensCut }).candidates);
  const nulls = nullScores(uniform, scoreOf);
  assert.ok(nulls.length > 0 && nulls.every((s) => s === nulls[0]), `uniform material ties throughout: [${nulls.join(", ")}] — unlicensed, honestly reported`);
});

test("a merge that throws withholds as UNDETERMINED — never inverts into corroboration", () => {
  const throwing = () => { throw new Error("boom"); };
  const { candidates } = selectContent({ question: QUESTION, notes: NOTES, index, merge: throwing, cut: lensCut });
  for (const c of candidates) assert.equal(c.verdict, "UNDETERMINED", "a thrown check is a gap, not evidence");
});

test("ORPHAN DEMOTION (mouthFacing, falsified 2026-09-19): a holds verdict with no address anywhere demotes to UNDETERMINED, disclosed", () => {
  const orphan = [{
    subject: "Lincoln", verb: "appointed", object: "Hamlin",
    witnesses: [], spans: [],
    readings: [
      { who: "lincoln.txt", verdict: "holds", read: [], edges: [{ subject: "Lincoln", verb: "appointed", object: "Hamlin" }] },
      { who: "almanac.txt", verdict: "holds", read: [], edges: [{ subject: "Lincoln", verb: "appointed", object: "Hamlin" }] },
    ],
  }];
  const { candidates } = selectContent({ question: QUESTION, notes: orphan, index, merge: mergeTestimony, cut: lensCut });
  assert.equal(candidates[0].verdict, "UNDETERMINED", "an orphan is unassertable, whatever its verdict was");
  assert.equal(candidates[0].demoted, "orphan_no_address", "the demotion is disclosed, not silent");
});

test("reading-carried addresses rescue: refs living only on readings still ground the candidate", () => {
  const rescued = [{
    subject: "Lincoln", verb: "appointed", object: "Hamlin",
    witnesses: [], spans: [],
    readings: [
      { who: "lincoln.txt", verdict: "holds", read: ["lincoln.txt#0-10"], edges: [{ subject: "Lincoln", verb: "appointed", object: "Hamlin" }] },
    ],
  }];
  const { candidates } = selectContent({ question: QUESTION, notes: rescued, index, merge: mergeTestimony, cut: lensCut });
  assert.equal(candidates[0].demoted, null, "a real address anywhere holds the verdict");
  assert.ok(candidates[0].addresses.includes("lincoln.txt#0-10"));
});

test("CONTROL BUILT TO FAIL: verdict order is corroboration, never ledger order", () => {
  const reversed = [...NOTES].reverse();
  const { candidates } = selectContent({ question: QUESTION, notes: reversed, index, merge: mergeTestimony, cut: lensCut });
  const orders = candidates.map((c) => VERDICT_ORDER[c.verdict]);
  assert.deepEqual([...orders].sort((x, y) => x - y), orders, "sorted by corroboration strength regardless of input order");
});

test("empty input is a typed refusal, never a silent empty list", () => {
  const r = selectContent({ question: QUESTION, notes: [], index });
  assert.equal(r.candidates.length, 0);
  assert.equal(r.refused?.type, "no_notes");
});
