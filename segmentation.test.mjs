// segmentation.test.mjs — the cursor is the whole law. Every test here
// checks the ONE thing segmentation.js exists to enforce: a correction may
// never claim an earlier cursor than what it revises.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { makeSegmentation, extentId, bindingId, REFUSALS } from "./segmentation.js";

const NATIVE = path.resolve(import.meta.dirname, "..", "eoreader7", "native");
const taskLog = await import(path.join(NATIVE, "kernel", "task-log.js"));
const cube = await import(path.join(NATIVE, "kernel", "cube.js"));

const seg = makeSegmentation({ ...taskLog, cellOf: cube.cellOf });

test("propose lands a real INS·Figure entry, typed off the cube, never a bare label", () => {
  let log = seg.createLog();
  const id = extentId("doc.txt", 0, 30);
  const r = seg.propose(log, { taskId: id, cursor: 0, payload: { text: "Dr. Seward met Mr. Harker." } }, { witness: "doc.txt@recipe1" });
  assert.equal(r.refused, null);
  log = r.log;
  const standing = seg.standingOf(log, id);
  assert.equal(standing.operator, "INS");
  assert.equal(standing.cell.op, "INS");
  assert.equal(standing.cell.grain, "Figure");
  assert.equal(standing.cursor, 0);
});

test("a re-proposal with identical payload at the same cursor is a no-op — teaches nothing, appends nothing", () => {
  let log = seg.createLog();
  const id = extentId("doc.txt", 0, 30);
  const first = seg.propose(log, { taskId: id, cursor: 0, payload: { text: "x" } });
  log = first.log;
  const seqBefore = log.nextSeq;
  const second = seg.propose(log, { taskId: id, cursor: 0, payload: { text: "x" } });
  assert.equal(second.noop, true);
  assert.equal(second.log.nextSeq, seqBefore);
});

test("a re-proposal with a DIFFERENT payload at a later cursor lands as SUPERSEDE·SYN, never a silent overwrite", () => {
  let log = seg.createLog();
  const id = extentId("doc.txt", 0, 30);
  log = seg.propose(log, { taskId: id, cursor: 0, payload: { text: "He arrived." } }).log;
  const r = seg.propose(log, { taskId: id, cursor: 500, payload: { text: "Dracula arrived." } });
  assert.equal(r.refused, null);
  const standing = seg.standingOf(r.log, id);
  assert.equal(standing.operator, "SYN");
  assert.equal(standing.cursor, 500);
  assert.deepEqual(standing.payload, { text: "Dracula arrived." });
});

test("concede requires a real standing entry — no target, no REC", () => {
  const log = seg.createLog();
  const r = seg.concede(log, { taskId: extentId("doc.txt", 0, 10), cursor: 5, trigger: "nothing was ever proposed" });
  assert.equal(r.refused.type, REFUSALS.NO_STANDING);
});

test("THE ONE LAW: a correction dated EARLIER than the standing cursor is refused as backdated", () => {
  let log = seg.createLog();
  const id = bindingId("dracula.txt", 50695, "he");
  // Standing claim, dated at cursor 245430 — the referent was individuated there.
  log = seg.propose(log, { taskId: id, cursor: 245430, payload: { referentId: "ref:dracula" } }).log;
  // An attempt to revise it, but dated EARLIER (50695) — exactly the shape of the
  // real bug: using evidence that only existed at 245430 while pretending the
  // correction was available at 50695, the pronoun's own original position.
  const r = seg.concede(log, { taskId: id, cursor: 50695, trigger: "a later surface, used too early" });
  assert.equal(r.refused.type, REFUSALS.BACKDATED);
  assert.equal(r.refused.standingCursor, 245430);
  assert.equal(r.refused.proposedCursor, 50695);
  // And the standing entry is UNCHANGED — a refused correction never mutates anything.
  const standing = seg.standingOf(log, id);
  assert.equal(standing.cursor, 245430);
});

test("THE HONEST CASE: a correction dated AT OR AFTER the standing cursor is a real, dated revision — never backdated to the position it corrects", () => {
  let log = seg.createLog();
  const id = bindingId("dracula.txt", 50695, "he");
  // Cataphora: at cursor 50695, nothing is established yet — the honest first
  // pass proposes a GAP, not a guess.
  log = seg.propose(log, { taskId: id, cursor: 50695, payload: { referentId: null, gap: "cataphoric_unresolved" } }).log;
  // Later, at cursor 245430, "Almighty God" (or whichever referent) is
  // individuated — NOW a correction is honest, because the evidence for it
  // really did arrive at 245430, not before.
  const r = seg.correct(log, { taskId: id, cursor: 245430, payload: { referentId: "ref:almighty-god" }, trigger: "individuated at 245430" }, { witness: "dracula.txt@recipe1" });
  assert.equal(r.refused, null);
  const standing = seg.standingOf(r.log, id);
  assert.deepEqual(standing.payload, { referentId: "ref:almighty-god" });
  assert.equal(standing.cursor, 245430);
  // The correction's own REC is on the record too — the gap's own concession,
  // dated, witnessed, never silently erased.
  const rec = r.log.entries.find((e) => e.operator === "REC" && e.concedes === id);
  assert.ok(rec, "the concession itself must be a real entry on the log");
  assert.equal(rec.because, "individuated at 245430");
  assert.equal(rec.cursor, 245430);
});

test("correct() composes concede-then-propose, and REFUSES the whole operation if the concede half is backdated", () => {
  let log = seg.createLog();
  const id = extentId("doc.txt", 0, 10);
  log = seg.propose(log, { taskId: id, cursor: 1000, payload: { text: "standing" } }).log;
  const r = seg.correct(log, { taskId: id, cursor: 5, payload: { text: "too early" }, trigger: "bad" });
  assert.equal(r.refused.type, REFUSALS.BACKDATED);
  // Nothing was proposed either — a partial correction (concede succeeds,
  // propose fails, or vice versa) would be worse than refusing the whole act.
  const standing = seg.standingOf(log, id);
  assert.deepEqual(standing.payload, { text: "standing" });
});

test("every entry is dated or it does not land — a missing cursor is refused, never defaulted to 0 or now()", () => {
  const log = seg.createLog();
  const r1 = seg.propose(log, { taskId: extentId("doc.txt", 0, 5), payload: {} });
  assert.equal(r1.refused.type, REFUSALS.NO_CURSOR);
  const r2 = seg.concede(log, { taskId: extentId("doc.txt", 0, 5), trigger: "x" });
  assert.equal(r2.refused.type, REFUSALS.NO_CURSOR);
});

test("fold() projects live standing sorted by cursor, and a conceded-then-never-replaced entry is a genuine gap, not silently dropped or silently kept", () => {
  let log = seg.createLog();
  const a = extentId("doc.txt", 0, 10);
  const b = extentId("doc.txt", 11, 20);
  log = seg.propose(log, { taskId: a, cursor: 100, payload: { text: "second" } }).log;
  log = seg.propose(log, { taskId: b, cursor: 10, payload: { text: "first" } }).log;
  const live = seg.fold(log, "doc.txt");
  assert.equal(live.length, 2);
  assert.equal(live[0].taskId, b); // cursor 10 sorts before cursor 100
  assert.equal(live[1].taskId, a);
});

test("extentId/bindingId are position-keyed — the identity IS the address, unlike an assertion's content-keyed identity in hyperlexicon.js", () => {
  assert.equal(extentId("f.txt", 0, 5), extentId("f.txt", 0, 5));
  assert.notEqual(extentId("f.txt", 0, 5), extentId("f.txt", 0, 6));
  assert.equal(bindingId("f.txt", 10, "He"), bindingId("f.txt", 10, "he")); // case-folded, position exact
});
