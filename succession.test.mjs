// succession.test.mjs — succession.js against the REAL live specimen (a
// real running-app capture of real Wikipedia text, not a hand-typed
// simplification of one). This exact text was used to validate the
// algorithm succession.js implements: Hamlin and Johnson both resolve as
// true VP-under-Lincoln fillers; Breckinridge, Colfax, and Grant — all
// present in the same material, all sitting in a "Preceded by"/"Succeeded
// by" field — correctly refuse to resolve.

import { test } from "node:test";
import assert from "node:assert/strict";

import { officeHolderGroups, parseSuccessionBoxes, resolveBoxSubjects, successionFillers } from "./succession.js";

const SPECIMEN = `15th Vice President of the United States
In office
March 4, 1861 – March 4, 1865
President Abraham Lincoln
Preceded by John C. Breckinridge
Succeeded by Andrew Johnson
23rd United States Minister to Spain
In office
December 20, 1881 – October 17, 1882
President Chester A. Arthur
Preceded by Lucius Fairchild
Succeeded by John W. Foster
United States Senator from Maine
In office
March 4, 1869 – March 3, 1881
Preceded by Lot M. Morrill
Succeeded by Eugene Hale

17th President of the United States
In office
April 15, 1865 – March 4, 1869
Vice President Vacant [ a ]
Preceded by Abraham Lincoln
Succeeded by Ulysses S. Grant
16th Vice President of the United States
In office
March 4, 1865 – April 15, 1865
President Abraham Lincoln
Preceded by Hannibal Hamlin
Succeeded by Schuyler Colfax
United States Senator
from Tennessee
In office
March 4, 1875 – July 31, 1875
Preceded by Parson Brownlow
Succeeded by David M. Key

Hannibal Hamlin (August 27, 1809 – July 4, 1891) was an American politician and diplomat who was the 15th vice president of the United States, serving from 1861 to 1865, during President Abraham Lincoln's first term. He was the first Republican vice president.`;

test("parseSuccessionBoxes finds the right number of boxes", () => {
  const boxes = parseSuccessionBoxes(SPECIMEN);
  // Four blank-line-delimited groups: the 15th VP record (which absorbs the
  // Minister-to-Spain and Senator-from-Maine text that follows it with no
  // blank line between them), the 17th President record (which absorbs the
  // 16th VP record the same way), the 16th VP record's own merged group is
  // actually the SAME group as 17 — re-derive from the blank lines: group 1
  // (15th VP + Minister + Senator-Maine), group 2 (17th President + 16th VP
  // + Senator-Tennessee), group 3 (the trailing Hamlin biography prose).
  // parseSuccessionBoxes further splits group 2 in two at its own internal
  // title line (16th Vice President...), which a blank line alone would not
  // have done — so four records total, one of them (the trailing prose)
  // carrying no ordinal/office at all.
  assert.equal(boxes.length, 4);
  assert.deepEqual(
    boxes.map((b) => b.ordinal),
    [15, 17, 16, null],
  );
});

test("box fields read the record's own FIRST occurrence, ignoring later merged noise", () => {
  const [box15, box17, box16] = parseSuccessionBoxes(SPECIMEN);
  assert.equal(box15.office, "Vice President");
  assert.equal(box15.presidentName, "Abraham Lincoln");
  assert.equal(box15.precededBy, "John C. Breckinridge");
  assert.equal(box15.succeededBy, "Andrew Johnson");

  assert.equal(box17.office, "President");
  assert.equal(box17.precededBy, "Abraham Lincoln");
  assert.equal(box17.succeededBy, "Ulysses S. Grant");

  assert.equal(box16.office, "Vice President");
  assert.equal(box16.presidentName, "Abraham Lincoln");
  assert.equal(box16.precededBy, "Hannibal Hamlin");
  assert.equal(box16.succeededBy, "Schuyler Colfax");
});

test("resolveBoxSubjects resolves Hamlin by direct anchor and Johnson by the cross-checked chain", () => {
  const boxes = parseSuccessionBoxes(SPECIMEN);
  const resolved = resolveBoxSubjects(boxes, SPECIMEN);
  const byOrdinal = Object.fromEntries(resolved.filter((b) => b.ordinal != null).map((b) => [b.ordinal, b]));

  assert.equal(byOrdinal[15].subject, "Hannibal Hamlin", "the prose sentence anchors the 15th VP directly");
  assert.equal(
    byOrdinal[16].subject,
    "Andrew Johnson",
    "box 16's own precededBy (Hamlin) matches box 15's already-resolved subject, so box 16's subject is box 15's succeededBy",
  );
});

test("Breckinridge, Colfax, and Grant never resolve as VP-under-Lincoln subjects", () => {
  const boxes = parseSuccessionBoxes(SPECIMEN);
  const resolved = resolveBoxSubjects(boxes, SPECIMEN);
  const subjects = resolved.map((b) => b.subject).filter(Boolean);

  // Breckinridge and Colfax appear only in a precededBy/succeededBy field —
  // neither is ever a box's own resolved subject.
  assert.ok(!subjects.some((s) => s.includes("Breckinridge")));
  assert.ok(!subjects.some((s) => s.includes("Colfax")));

  // Grant is the 17th President box's succeededBy — a different OFFICE
  // entirely (President, not Vice President), and its own box (ordinal 18,
  // President office) is not present in this material to resolve him as
  // anyone's subject either.
  assert.ok(!subjects.some((s) => s.includes("Grant")));

  // The 17th President box itself resolves to no subject at all (no direct
  // anchor for a "17th president" phrase exists in this material, and there
  // is no ordinal-16 President box to chain from).
  const box17 = resolved.find((b) => b.ordinal === 17);
  assert.equal(box17.subject, null);
});

test("officeHolderGroups finds exactly one multi-holder group: Vice President under Abraham Lincoln", () => {
  const boxes = parseSuccessionBoxes(SPECIMEN);
  const resolved = resolveBoxSubjects(boxes, SPECIMEN);
  const groups = officeHolderGroups(resolved);

  assert.equal(groups.length, 1);
  const [group] = groups;
  assert.equal(group.office, "Vice President");
  assert.equal(group.president, "Abraham Lincoln");
  assert.equal(group.holders.length, 2);
  assert.ok(group.holders.includes("Hannibal Hamlin"));
  assert.ok(group.holders.includes("Andrew Johnson"));
  // Never counted as holders: named only in a precededBy/succeededBy field.
  assert.ok(!group.holders.some((h) => h.includes("Breckinridge")));
  assert.ok(!group.holders.some((h) => h.includes("Colfax")));
});

test("a box with no title-line match (no ordinal) never contributes a holder", () => {
  // The trailing Hamlin biography paragraph is itself parsed as a box
  // (ordinal/office null, per the blank-line boundary rule) — it must never
  // land in officeHolderGroups, which requires both an office and a
  // president on the box itself.
  const boxes = parseSuccessionBoxes(SPECIMEN);
  const resolved = resolveBoxSubjects(boxes, SPECIMEN);
  const proseBox = resolved.find((b) => b.ordinal == null);
  assert.ok(proseBox, "the trailing prose paragraph parses as its own ordinal-less box");
  assert.equal(proseBox.subject, null);
});

test("a text with no succession-box shape at all parses to zero usable groups", () => {
  const plainProse = "Hamlin was Lincoln's vice president. Johnson later held the office too.";
  const boxes = parseSuccessionBoxes(plainProse);
  const resolved = resolveBoxSubjects(boxes, plainProse);
  const groups = officeHolderGroups(resolved);
  assert.equal(groups.length, 0);
});

// ── successionFillers: the void's own fillers, spans included ───────────

test("successionFillers reads real {from,to} spans off the real specimen's own en-dash date lines — not the bare-year regex void-shape.js's yearSpansIn is scoped to", () => {
  const fillers = successionFillers("Abraham Lincoln", [SPECIMEN]);
  assert.equal(fillers.length, 2);
  const hamlin = fillers.find((f) => f.filler === "Hannibal Hamlin");
  const johnson = fillers.find((f) => f.filler === "Andrew Johnson");
  // Years AND the line's own precise dates (2026-08-27). The years are what
  // void-shape.js can order and subtract; the dates are what a reader can
  // actually be told. Johnson is the case that argues for carrying both:
  // his year span is the degenerate "1865 to 1865", which states nothing —
  // the real extent (March 4 to April 15, 1865) lives only in the dates.
  assert.deepEqual(hamlin.span, { from: 1861, to: 1865, fromText: "March 4, 1861", toText: "March 4, 1865" });
  assert.deepEqual(johnson.span, { from: 1865, to: 1865, fromText: "March 4, 1865", toText: "April 15, 1865" });
  // `source` is chains.js's own real closure phrase now — the ACTUAL
  // chain bounds (Breckinridge before, Colfax after, both the boxes' own
  // pointers), not a hand-typed office/president label. Both fillers share
  // one giver: one confirmed set, one closure, same as chains.test.mjs's
  // own "one confirmed set, one giver" case.
  assert.match(hamlin.source, /Breckinridge/);
  assert.match(hamlin.source, /Colfax/);
  assert.equal(hamlin.source, johnson.source, "one confirmed set, one giver, shared by every member");
});

test("successionFillers is anchor-scoped: a different anchor on the same material finds nothing", () => {
  assert.deepEqual(successionFillers("Someone Else", [SPECIMEN]), []);
});

test("successionFillers: distractor boxes (a different office, a different president) never contribute a filler", () => {
  const fillers = successionFillers("Abraham Lincoln", [SPECIMEN]);
  for (const f of fillers) assert.ok(["Hannibal Hamlin", "Andrew Johnson"].includes(f.filler));
});

test("successionFillers: a text with no succession-box shape at all yields zero fillers, never a guess", () => {
  const plainProse = "Hamlin was Lincoln's vice president. Johnson later held the office too.";
  assert.deepEqual(successionFillers("Abraham Lincoln", [plainProse]), []);
});
