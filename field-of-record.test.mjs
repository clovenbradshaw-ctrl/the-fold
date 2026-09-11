// field-of-record.test.mjs — GFP Pass 33: the field derived from the record
// and the sources; rows without positions; the rebuild null.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Field } from "./relative.js";
import { textOfEntry, admitPassage, admitEntry, admitRecordLines, rowsSince, fieldFromRows, fieldOf, recallForTurn, FIELD_OFFER_MAX } from "./field-of-record.js";
import { readOnArrival } from "./read-on-arrival.js";
import { chunkSource } from "./source.js";

const TEXT = ["Prince Andrew rode along the line of the troops, looking at the faces of the men he was to lead.", "The battery on the mound fired without pause, and the smoke lay over the field like a fog.", "Pierre, in his white hat, wandered between the guns, and the soldiers laughed at him kindly.", "Kutuzov sat on the bench with his head bowed, and said nothing when the adjutants reported.", "By evening the redoubt had changed hands three times, and no one could say who held it.", "The wounded were carried back past the reserves, who stood in ranks and did not look."].join("\n\n");
const passages = () => chunkSource("borodino.txt", TEXT);
const LINES = [
  JSON.stringify({ kind: "propose", task_id: "t1", description: "the battery on the mound fired without pause", seq: 0 }),
  JSON.stringify({ kind: "result", task_id: "t1", result: "the redoubt changed hands three times by evening", seq: 1 }),
  JSON.stringify({ kind: "evidence", task_id: "t1", evidence: ["x"], seq: 2 }),
  JSON.stringify({ question: "who sat on the bench?", answer: "Kutuzov sat on the bench with his head bowed", model: "m" }),
  "not json at all",
];

test("an entry's text is what it carries, in a fixed field order; an entry with none is not admitted; a line that is not JSON is skipped", () => {
  assert.equal(textOfEntry({ description: "a", result: "b" }), "a\nb");
  assert.equal(textOfEntry({ evidence: ["x"] }), null);
  assert.equal(textOfEntry({ text: "   " }), null);
  const f = new Field();
  assert.equal(admitRecordLines(f, "grid", LINES), 3);
  assert.equal(f.size, 3);
  assert.deepEqual(f.nodes.map((n) => n.payload.at), ["grid@0", "grid@1", null], "addressed by the record and its seq where the line carries one");
});

test("recallForTurn (GFP Pass 35): a cue that settles is shaped for a turn — passages with their ground addresses, the band, a bounded count; a cue that does not settle is a verdict, never a guess", () => {
  const f = new Field();
  for (const [i, p] of passages().entries()) f.admit(p.text, { source: "borodino.txt", at: p.ref });
  // A whole passage as its own cue settles as a figure on itself.
  const whole = recallForTurn(f, f.nodes[0].text, { draws: 60 });
  assert.equal(whole.kind, "figure");
  assert.equal(whole.top.ref, passages()[0].ref, "the top recall is addressed by its ground");
  assert.equal(whole.passages.length, FIELD_OFFER_MAX, "the offer is bounded by the field's own cap");
  assert.ok(whole.passages[0].ref && whole.passages[0].source === "borodino.txt");
  assert.ok(whole.band && Number.isFinite(whole.band.hi) && whole.band.hi > 0);
  // A cue from the field's vocabulary with nothing to say settles on nothing.
  const none = recallForTurn(f, "the the the the the", { draws: 60 });
  assert.equal(none.kind, "nothing");
  assert.deepEqual(none.passages, []);
  // No field / no words is a null, never an empty offer.
  assert.equal(recallForTurn(null, "anything"), null);
  assert.equal(recallForTurn(f, "   "), null);
});

test("the reader loop admits every passage it reads into the field, in order, with its ground address as payload — one door, injected", async () => {
  const ps = passages();
  const field = new Field();
  const stubReader = () => ({ read: () => ({ claims: [] }) });
  const r = await readOnArrival({ name: "borodino.txt", passages: ps, relationsFor: stubReader, hyperlexicon: {}, yieldFn: async () => {}, field });
  assert.equal(r.cursor, ps.length);
  assert.equal(field.size, ps.length);
  assert.deepEqual(field.nodes.map((n) => n.payload.at), ps.map((p) => p.ref));
  assert.ok(ps[0].ref.startsWith("borodino.txt#"), "the ref is a ground address");
  assert.equal(field.after(field.nodes[0]), field.nodes[1], "temporal adjacency is the synapse");
  // resumed from a cursor: only the unread passages are admitted
  const f2 = new Field();
  await readOnArrival({ name: "borodino.txt", passages: ps, relationsFor: stubReader, hyperlexicon: {}, yieldFn: async () => {}, field: f2, cursor: 2 });
  assert.equal(f2.size, ps.length - 2);
});

test("ROWS CARRY NO POSITIONS AND NO `next`; the rebuild derives the links, and a SHUFFLED store rebuilds the same field: same recall, same synapse, on every probe (the rebuild null)", () => {
  const f = fieldOf({ passages: passages().map((p) => ({ ...p, source: "borodino.txt" })), records: { grid: LINES } });
  const rows = rowsSince(f);
  assert.equal(rows.length, f.size);
  for (const r of rows) { assert.ok(!("index" in r) && !("seq" in r) && !("next" in r), "no positions, no next"); assert.ok(Array.isArray(r.prev)); }
  const shuffled = [...rows].sort(() => (Math.sin(rows.indexOf(rows[0]) + 1) > 0 ? 1 : -1)).reverse();
  const g = fieldFromRows(shuffled);
  assert.equal(g.size, f.size);
  for (const n of f.nodes) {
    const cue = n.text;
    const a = f.recall(cue)[0].node, b = g.recall(cue)[0].node;
    assert.equal(b.text, a.text, `the same figure for "${cue.slice(0, 30)}…"`);
    assert.equal(g.after(b)?.text ?? null, f.after(a)?.text ?? null, "the same next by synapse");
    assert.equal(g.before(b)?.text ?? null, f.before(a)?.text ?? null, "the same previous by synapse");
  }
  assert.equal(g.last.text, f.last.text, "the chain end is where the next admission links");
});

test("APPEND-ONLY: a second sync writes only the rows admitted since, and the field rebuilt from the two appends equals a straight build", () => {
  const ps = passages();
  const f = new Field();
  for (const p of ps.slice(0, 3)) admitPassage(f, p, { source: "borodino.txt" });
  const first = rowsSince(f, 0);
  for (const p of ps.slice(3)) admitPassage(f, p, { source: "borodino.txt" });
  const second = rowsSince(f, first.length);
  assert.equal(second.length, ps.length - 3);
  assert.ok(second.every((r) => !first.some((q) => q.signature === r.signature)), "only the new rows");
  const g = fieldFromRows([...first, ...second]);
  const straight = fieldOf({ passages: ps.map((p) => ({ ...p, source: "borodino.txt" })) });
  for (const n of straight.nodes) assert.equal(g.recall(n.text)[0].node.text, n.text);
  assert.equal(g.after(g.recall(ps[2].text)[0].node).text, ps[3].text, "the link across the two appends is derived on rebuild");
});

test("the OPFS half round-trips through a fake navigator.storage and never rewrites: the second append leaves the first bytes in place", async () => {
  const files = new Map();
  const dir = (path) => ({
    getDirectoryHandle: async (name) => dir(`${path}/${name}`),
    getFileHandle: async (name, { create } = {}) => { const key = `${path}/${name}`; if (!files.has(key)) { if (!create) throw new Error("NotFound"); files.set(key, ""); } return { getFile: async () => ({ size: files.get(key).length, text: async () => files.get(key) }), createWritable: async ({ keepExistingData } = {}) => { let buf = keepExistingData ? files.get(key) : ""; let pos = buf.length; return { seek: async (n) => { pos = n; }, write: async (s) => { buf = buf.slice(0, pos) + s; pos += s.length; }, close: async () => { files.set(key, buf); } }; } }; },
    removeEntry: async () => {},
  });
  Object.defineProperty(globalThis, "navigator", { value: { storage: { getDirectory: async () => dir("opfs") } }, configurable: true, writable: true });
  const { appendFieldRows, loadFieldRows, bootField, syncField, getField, admitAppended } = await import("./field-store.js");
  const f = fieldOf({ passages: passages().slice(0, 2).map((p) => ({ ...p, source: "b" })) });
  await appendFieldRows(rowsSince(f));
  const before = files.get("opfs/field/field.jsonl");
  const booted = await bootField();
  assert.equal(booted.size, 2);
  assert.equal(getField(), booted);
  assert.equal(admitAppended("answers", [JSON.stringify({ question: "q", answer: "the smoke lay over the field like a fog" })]), 1);
  const r = await syncField();
  assert.equal(r.appended, 1);
  const after = files.get("opfs/field/field.jsonl");
  assert.ok(after.startsWith(before), "the earlier bytes are untouched — appended, never rewritten");
  assert.equal(after.split("\n").filter(Boolean).length, 3);
  assert.deepEqual(await syncField(), { appended: 0 }, "nothing new, nothing written");
});
