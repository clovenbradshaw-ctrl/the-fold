import test from "node:test";
import assert from "node:assert/strict";
import { serializeRecord, replayRecord, recordIdentity, resolveAddress } from "./record-log.js";
import { makeHyperlexicon } from "./hyperlexicon.js";
import { adaptTaskLog } from "./consequence.js";
import * as TL from "../eoreader7/native/kernel/task-log.js";
import { cellOf, GRAINS } from "../eoreader7/native/kernel/cube.js";

// The REAL ledger organ over the REAL kernel log — a replay is only proven
// on the thing the app persists, never on a toy log.
const hl = makeHyperlexicon({ ...adaptTaskLog({ createTaskLog: TL.createTaskLog, append: TL.append, ENTRY_KINDS: TL.ENTRY_KINDS, OPERATOR_BASIS: TL.OPERATOR_BASIS, GRAINS }), projectTasks: TL.projectTasks, cellOf });
const SOURCES = { "a.txt": "Amelia Hartley founded the observatory. Rowan Vale preceded Marta Quill.", "b.txt": "Rowan Vale preceded Marta Quill." };
function liveLedger() {
  let log = hl.createHyperlexicon({ frame: { reader: "test", organs: { x: "y" } } });
  log = hl.hear(log, { subject: "Amelia Hartley", verb: "founded", object: "the observatory", witness: "a.txt#0-38~r1", spans: [{ ref: "a.txt#0-38", start: 0, end: 38, text: "Amelia Hartley founded the observatory" }] });
  log = hl.hear(log, { subject: "Rowan Vale", verb: "preceded", object: "Marta Quill", witness: "a.txt#40-71~r1", spans: [{ ref: "a.txt#40-71", start: 40, end: 71, text: "Rowan Vale preceded Marta Quill" }] });
  log = hl.hear(log, { subject: "Rowan Vale", verb: "preceded", object: "Marta Quill", witness: "b.txt#0-31~r1", spans: [{ ref: "b.txt#0-31", start: 0, end: 31, text: "Rowan Vale preceded Marta Quill" }] });
  const d = hl.dispute(log, hl.foldHyperlexicon(log)[0].id, { source: "b.txt", because: "no such founding", span: { at: "b.txt#0-31", ref: "b.txt", text: "Rowan Vale preceded Marta Quill" }, kind: hl.DISPUTE_KINDS.CONTEST });
  return d.refused ? log : d.log;
}
const fold = (log) => JSON.stringify(hl.foldWithStanding(log));

test("a reload reproduces the record byte for byte: fold(replay(serialize(log))) === fold(log), and the identity matches", async () => {
  const live = liveLedger();
  const lines = serializeRecord(live, 0);
  assert.equal(lines.length, live.entries.length);
  const r = replayRecord(lines, { createTaskLog: TL.createTaskLog, append: TL.append });
  assert.equal(r.gap, null);
  assert.equal(r.replayed, live.entries.length);
  assert.equal(fold(r.log), fold(live), "the fold after reload is the fold before it");
  assert.equal(await recordIdentity(r.log), await recordIdentity(live));
  assert.equal(hl.disputesOf(r.log).size, hl.disputesOf(live).size, "the contest survives the reload");
  assert.equal(JSON.stringify(hl.frameOf(r.log)), JSON.stringify(hl.frameOf(live)), "the frame survives the reload");
});

test("a control that can fail, and does: one mutated entry is a different record and a different fold", async () => {
  const live = liveLedger();
  const lines = serializeRecord(live, 0);
  const i = lines.findIndex((l) => l.includes("Amelia Hartley"));
  const mutated = [...lines];
  mutated[i] = mutated[i].replaceAll("Amelia Hartley", "Amelia Hartly");
  const r = replayRecord(mutated, { createTaskLog: TL.createTaskLog, append: TL.append });
  assert.equal(r.gap, null);
  assert.notEqual(await recordIdentity(r.log), await recordIdentity(live));
  assert.notEqual(fold(r.log), fold(live));
});

test("a hole in the sequence is a typed gap, never a silently shorter record; a bad line likewise", () => {
  const lines = serializeRecord(liveLedger(), 0);
  const holed = [lines[0], ...lines.slice(2)];
  const r = replayRecord(holed, { createTaskLog: TL.createTaskLog, append: TL.append });
  assert.equal(r.gap?.type, "record_gap");
  assert.equal(r.gap.expected, 1);
  assert.equal(r.gap.found, 2);
  assert.equal(r.replayed, 1);
  const bad = [lines[0], "{not json"];
  assert.equal(replayRecord(bad, { createTaskLog: TL.createTaskLog, append: TL.append }).gap?.type, "record_unparseable");
});

test("incremental: serializing from a seq appends only what is new, and replaying the concatenation is the whole", () => {
  const a = liveLedger();
  const head = serializeRecord(a, 0).slice(0, 2);
  const tail = serializeRecord(a, 2);
  assert.equal(head.length + tail.length, a.entries.length);
  const r = replayRecord([...head, ...tail], { createTaskLog: TL.createTaskLog, append: TL.append });
  assert.equal(r.gap, null);
  assert.equal(fold(r.log), fold(a));
});

test("removing a source removes bytes, never history: the address resolves to a typed gap", () => {
  const ok = resolveAddress("a.txt#0-38", SOURCES);
  assert.equal(ok.ok, true);
  assert.equal(ok.text, "Amelia Hartley founded the observatory");
  const { "a.txt": _gone, ...rest } = SOURCES;
  const gap = resolveAddress("a.txt#0-38", rest);
  assert.equal(gap.ok, false);
  assert.equal(gap.gap.type, "source_absent");
  assert.equal(resolveAddress("a.txt#0-9999", SOURCES).gap?.type, "address_beyond_source");
  assert.equal(resolveAddress("nonsense", SOURCES).gap?.type, "address_malformed");
});

test("the grid's admitted operator set survives a replay when it is passed in", () => {
  const admits = ["NUL", "SIG"];
  const empty = TL.createTaskLog({ admits });
  const r = replayRecord([], { createTaskLog: TL.createTaskLog, append: TL.append, admits });
  assert.deepEqual([...r.log.admits], [...empty.admits]);
});
