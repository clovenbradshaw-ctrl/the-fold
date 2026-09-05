import test from "node:test";
import assert from "node:assert/strict";
import { answerRecord, claimKey, claimSets, diffRecords, answerRecordLine, ANSWER_RECORD_SCHEMA, voidInScope, absencesOf } from "./answer-record.js";

const section = (claims, refs = ["a.txt#0-10"]) => ({ passages: refs.map((ref) => ({ ref, text: "x" })), relations: { claims } });

test("a record carries what was handed, what was said with its verdict and address, and what nothing backs", () => {
  const r = answerRecord({
    question: "Who founded it?", answer: "Amelia Hartley founded it.", model: "m", recipe: "r1", frame: { organs: {} },
    sections: [section([
      { end1: "Amelia Hartley", label: "founded", end2: "the Northgate Observatory", verdict: "bound", refs: ["a.txt#0-10"], spans: [{ ref: "a.txt#0-10", start: 0, end: 10, text: "…" }] },
      { end1: "Amelia Hartley", label: "founded", end2: "a bakery", verdict: "unbound", reason: "object_unspecific" },
    ])],
    unsupported: [{ sentence: "She founded a bakery." }], unbacked: ["Nothing here."], unread: [{ name: "b.txt", read: 2, total: 44, unread: 42 }],
    sources: [{ name: "a.txt", sha256: "abc" }], constitution: { sha256: "def" }, cursor: 7,
  });
  assert.equal(r.schema, ANSWER_RECORD_SCHEMA);
  assert.deepEqual(r.retrieved, ["a.txt#0-10"]);
  assert.equal(r.claims.length, 2);
  assert.equal(r.claims[0].key, "amelia hartley|founded|the northgate observatory");
  assert.deepEqual(r.claims[0].spans, [{ ref: "a.txt#0-10", start: 0, end: 10 }]);
  assert.equal(r.claims[1].reason, "object_unspecific");
  assert.deepEqual(r.tally, { bound: 1, unbound: 1 });
  assert.deepEqual(r.unsupported, ["She founded a bakery."]);
  assert.deepEqual(r.unread, [{ name: "b.txt", read: 2, total: 44 }]);
  assert.equal(r.answer.chars, 26);
  assert.match(answerRecordLine(r), /2 claim\(s\) \(1 bound, 1 unbound\) · 1 unsupported · 1 unbacked · absences 0 \(0 cite a declared gap, 0 cite none\) · retrieved 1 · recipe r1 · still reading b.txt 2\/44/);
});

test("claimKey folds the SVO and neutral vocabularies onto one identity", () => {
  assert.equal(claimKey({ subject: " Amelia Hartley", verb: "Founded", object: "it " }), claimKey({ end1: "amelia hartley", label: "founded", end2: "it" }));
});

test("the model-swap diff: same record-backed set → alike; a fabrication on one side is counted, never averaged away", () => {
  const A = answerRecord({ sections: [section([{ end1: "a", label: "b", end2: "c", verdict: "bound" }, { end1: "d", label: "e", end2: "f", verdict: "unheard" }])] });
  const B = answerRecord({ sections: [section([{ end1: "A", label: "B", end2: "C", verdict: "bound" }])], unbacked: ["The moon is cheese."] });
  const d = diffRecords(A, B);
  assert.equal(d.sameRecordBackedSet, true);
  assert.deepEqual(d.shared, ["a|b|c"]);
  assert.deepEqual(d.nothingBacks, { a: 0, b: 1 });
  const C = answerRecord({ sections: [section([{ end1: "x", label: "y", end2: "z", verdict: "bound" }])] });
  const d2 = diffRecords(A, C);
  assert.equal(d2.sameRecordBackedSet, false);
  assert.deepEqual(d2.onlyA, ["a|b|c"]);
  assert.deepEqual(d2.onlyB, ["x|y|z"]);
  assert.deepEqual(claimSets(C).bound, new Set(["x|y|z"]));
});

test("every ∅ cites its void (P106): an absence with a declared void in scope cites it; one with none is counted as a leak, never absorbed", () => {
  const voids = [{ id: "void:northgate observatory|director|*", subject: "Northgate Observatory", verb: "director", object: null, scope: { sources: ["a.txt", "b.txt"], read: 5, total: 5 } }];
  assert.equal(voidInScope("The Northgate Observatory's director is not named.", voids)?.id, voids[0].id);
  assert.equal(voidInScope("The Northgate Observatory opened in 1889.", voids), null, "the void's label is not in the sentence");
  assert.equal(voidInScope("There is no mention of anything else.", voids), null, "P54's leak cites nothing");
  assert.equal(voidInScope("The sources don't say who the director was.", voids), null, "without the question, the anchor is unnamed");
  assert.equal(voidInScope("The sources don't say who the director was.", voids, { question: "Who was the Northgate Observatory's director?" })?.id, voids[0].id, "the question names the anchor the sentence points at");
  assert.equal(voidInScope("There is no mention of anything else.", voids, { question: "Who was the Northgate Observatory's director?" }), null, "the label must be in the sentence itself");
  const abs = absencesOf({ witness: [{ sentence: "The Northgate Observatory's director is not named.", witness: "refused", why: "x" }, { sentence: "It opened in 1889.", witness: "stated" }, { sentence: "There is no mention of anything else.", witness: "refused", why: "y" }, { sentence: "The Northgate Observatory's director is not named.", witness: "refused" }], voids });
  assert.deepEqual(abs.map((a) => [a.how, a.void]), [["witness-refused", voids[0].id], ["witness-refused", null]], "deduplicated by sentence; a stated sentence is no absence; the leak carries no void");
  assert.deepEqual(abs[0].scope, { sources: 2, read: 5, total: 5 });
  const r = answerRecord({ unbacked: ["Carl Keeler directed it."], witness: [{ sentence: "There is no mention of anything else.", witness: "refused" }, { sentence: "The Northgate Observatory's director is not named.", witness: "refused" }], voids });
  assert.deepEqual(r.absenceTally, { citingVoid: 1, citingNone: 1 });
  assert.equal(r.unbacked.length, 1, "an unbacked claim is counted apart — content nothing backs is not an absence");
  assert.equal(r.voidsOpen, 1);
  assert.match(answerRecordLine(r), /1 unbacked · absences 2 \(1 cite a declared gap, 1 cite none\)/);
  const none = answerRecord({ witness: [{ sentence: "The Northgate Observatory's director is not named.", witness: "refused" }], voids: [] });
  assert.deepEqual(none.absenceTally, { citingVoid: 0, citingNone: 1 }, "a planted absence with no void declared is a leak — the control fails as built");
});
