// field-of-record.test.mjs — GFP Pass 33: the field derived from the record
// and the sources; rows without positions; the rebuild null.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Field } from "./relative.js";
import { textOfEntry, admitPassage, admitEntry, admitRecordLines, rowsSince, fieldFromRows, fieldOf, recallForTurn, FIELD_OFFER_MAX, shadowOf, echoOf, THE_HOLOGRAPH, THE_SHADOW, THE_ECHO } from "./field-of-record.js";
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

test("THE SHADOW (2026-09-11): the second tier — a node with a state and a pointer, NO words, that still recalls the same figure on every probe", () => {
  const ps = passages();
  const full = fieldOf({ passages: ps.map((p) => ({ ...p, source: "borodino.txt" })) });
  const sh = new Field();
  for (const p of ps) sh.admit(p.text, { source: "borodino.txt", at: p.ref }, { tier: THE_SHADOW });
  assert.equal(sh.nodes.filter((n) => n.text != null).length, 0, "no text retained — a lien on content, never the content");
  assert.ok(sh.nodes.every((n) => n.tier === THE_SHADOW), "each is a shadow");
  assert.ok(sh.nodes.every((n) => n.sdr && n.sdr.length), "each keeps its state (recall needs it)");
  for (const n of full.nodes) {
    const a = full.recall(n.text)[0].node, b = sh.recall(n.text)[0].node;
    assert.equal(b.payload.at, a.payload.at, `recall parity for "${n.text.slice(0, 30)}…"`);
  }
  // the vocabulary still exists (admit saw the words), so the null band still measures
  const band = sh.nullBand(8, { draws: 60 });
  assert.ok(band.hi > 0, "a shadow field can still measure its own chance");
});

test("THE ECHO (2026-09-11): the third tier, the coarse minimum — a low-resolution state and a pointer, no words, recalling at its own resolution", () => {
  const ps = passages();
  const ec = new Field();
  for (const p of ps) ec.admit(p.text, { source: "borodino.txt", at: p.ref }, { tier: THE_ECHO });
  assert.equal(ec.nodes.filter((n) => n.text != null).length, 0, "no words — never read back into full EOT");
  assert.ok(ec.nodes.every((n) => n.tier === THE_ECHO && n.sdr && n.sdr.length), "each keeps a coarse state");
  const coarse = echoOf(ps[0].text);
  assert.equal(coarse.tier, THE_ECHO);
  assert.ok(coarse.bits < 4096, "the echo is at a coarser resolution than the holograph's");
  // a whole passage as its own cue still echoes back to its own figure
  const r = ec.recall(ps[0].text);
  assert.equal(r[0].node.payload.at, ps[0].ref, "the echo settles on the thing it echoes");
});

test("THE SHADOW round-trips: a mixed store (holograph + shadow + echo rows) rebuilds with recall intact and the shadow/echo still wordless", () => {
  const ps = passages();
  const m = new Field();
  m.admit(ps[0].text, { source: "borodino.txt", at: ps[0].ref }, { tier: THE_HOLOGRAPH });
  m.admit(ps[1].text, { source: "borodino.txt", at: ps[1].ref }, { tier: THE_SHADOW });
  m.admit(ps[2].text, { source: "borodino.txt", at: ps[2].ref }, { tier: THE_ECHO });
  const rows = rowsSince(m);
  assert.equal(rows[1].text, null, "the shadow row carries no text");
  assert.ok(rows[1].sdr && rows[1].sdr.length, "it carries its state instead");
  assert.equal(rows[1].tier, THE_SHADOW);
  assert.equal(rows[2].tier, THE_ECHO);
  assert.equal(rows[0].sdr, undefined, "a holograph row still rebuilds its state from its words");
  const rebuilt = fieldFromRows(rows);
  assert.equal(rebuilt.nodes[1].text, null, "rebuilt shadow is still wordless");
  assert.equal(rebuilt.nodes[2].tier, THE_ECHO);
  assert.equal(rebuilt.recall(ps[1].text)[0].node.payload.at, ps[1].ref, "rebuild recalls the same shadow figure");
  assert.equal(rebuilt.recall(ps[0].text)[0].node.payload.at, ps[0].ref, "the holograph too");
});

test("shadowOf / echoOf return the tier itself — a state and a state-signature, no words; admitEntry with a tier is the same form", () => {
  const sh = shadowOf("the battery on the mound fired without pause");
  assert.ok(sh.sdr && sh.sdr.length && sh.tier === THE_SHADOW);
  assert.ok(typeof sh.signature === "string" && sh.signature.length >= 6);
  const ec = echoOf("the battery on the mound fired without pause");
  assert.equal(ec.tier, THE_ECHO);
  assert.ok(ec.sdr.length > 0 && ec.sdr.length <= sh.sdr.length, "the echo's state is no larger than the shadow's");
  const f = new Field();
  const n = admitEntry(f, { description: "the battery on the mound fired", seq: 0 }, { record: "g", tier: THE_ECHO });
  assert.equal(n.text, null, "an echo entry keeps no words");
  assert.equal(n.payload.record, "g");
  assert.ok(n.sdr.length, "but it keeps the coarse state");
  assert.equal(f.recall("the battery on the mound fired")[0].node.signature, n.signature, "recall reaches it by content, not by key");
});

test("significance rides the shadow — the deidentified residue of the calculus (DEF/EVA/REC), never the content (2026-09-11)", () => {
  const ps = passages();
  const f = new Field();
  const sig = { standing: "figure", band: { lo: 0.05, hi: 0.2, margin: 0.04, draws: 150 }, surprise: 0.71 };
  const n = admitPassage(f, { ...ps[0], source: "borodino.txt" }, { tier: THE_SHADOW, significance: sig });
  assert.equal(n.text, null);
  assert.deepEqual(n.payload.significance, sig, "the residue is carried — it reveals how the reading found this meaningful, never what it said");
  // the holograph is the significance itself — it carries no residue
  const h = new Field();
  const hn = admitPassage(h, { ...ps[0], source: "borodino.txt" }, { tier: THE_HOLOGRAPH, significance: sig });
  assert.equal(hn.payload.significance, undefined, "the holograph is the reading — nothing left behind to carry");
  // recall returns the residue with the fingerprint
  const hit = f.recall(ps[0].text)[0].node;
  assert.deepEqual(hit.payload.significance, sig);
});

test("THE BROKEN BASE (2026-09-11): the symbol cannot touch the referent except through the thought — a shadow or echo is never offered to a turn, only a holograph", () => {
  const ps = passages();
  // recall still happens over a shadow-only field — the shadow recognizes
  const sh = new Field();
  for (const p of ps) sh.admit(p.text, { source: "borodino.txt", at: p.ref }, { tier: THE_SHADOW });
  const offer = recallForTurn(sh, ps[0].text, { draws: 60 });
  assert.ok(["figure", "ambiguous", "nothing"].includes(offer.kind), "recall happens — the shadow recognizes");
  assert.equal(offer.passages.length, 0, "but nothing is offered to the mouth — the base is broken");
  assert.equal(offer.top, null, "and no passage-shaped top is ever handed over");
  // the echo is the same wall at coarse grain
  const ec = new Field();
  for (const p of ps) ec.admit(p.text, { source: "borodino.txt", at: p.ref }, { tier: THE_ECHO });
  assert.equal(recallForTurn(ec, ps[0].text, { draws: 60 }).passages.length, 0, "an echo offers nothing either");
  // contrast: only the holograph has words to give
  const hol = new Field();
  for (const p of ps) hol.admit(p.text, { source: "borodino.txt", at: p.ref }, { tier: THE_HOLOGRAPH });
  assert.ok(recallForTurn(hol, ps[0].text, { draws: 60 }).passages.length > 0, "only the holograph can reach the mouth");
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
