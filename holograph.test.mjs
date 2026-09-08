// holograph.test.mjs — the conversation drawn as the record holds it,
// against the REAL loop ledger (loops.js on the kernel task log), the REAL
// names organ (ground-ladder.js::namesIn), and a stub document with
// createElementNS. What is pinned: a referent the question asked about is a
// node even when no answer says its word; the answer's own names are nodes;
// a loop attaches to the referent its words hold and otherwise to the whole;
// a reopened loop is drawn with rings; a referent re-expands to what holds
// it; and nothing is dropped silently — past the cap is counted.
import test from "node:test";
import assert from "node:assert/strict";

import * as taskLog from "../eoreader7/native/kernel/task-log.js";
import { cellOf } from "../eoreader7/native/kernel/cube.js";
import { namesIn } from "./ground-ladder.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "../eoreader7/native/adapters/text/surfaces.js";
import { splitSentences } from "../eoreader7/native/adapters/text/spans.js";
import { declaredForm, declaredGenre } from "./shape.js";
import { makeLoops, foldLoops, subjectOf, loopsFromQuestion, closingsFromDraft } from "./loops.js";
import { holographOf, rowsFor, flattenRows, expandReferent, turnsOf, LEVELS } from "./holograph.js";

const loops = makeLoops({ taskLog, cellOf });
const isAdp = (w) => ["about", "on", "of", "for"].includes(w);
const POEM = "He walks the streets of Gotham, a silent vow,\nThe Joker laughs, a twisted grin.\n\nA cape of black, a beacon bright,\nFor Gotham's hope, forever free.";

function fixture() {
  const task = "write a poem about batman";
  const history = [{ role: "user", content: task }, { role: "assistant", content: POEM }, { role: "user", content: "now one about Gotham at night" }, { role: "assistant", content: "At night Gotham sleeps; the Bat-signal burns." }];
  const opts = { genre: declaredGenre(task), form: declaredForm(task), subject: subjectOf(task, { isAdposition: isAdp }), scope: "c1t1", convoScope: "c1", turn: 1, convo: "k1" };
  let log = loops.landAll(loops.createLoopLog(), loopsFromQuestion(task, { ...opts, hasMaterial: false })).log;
  log = loops.landAll(log, closingsFromDraft(POEM, { ...opts, namesIn })).log;
  // the reader reopens the form loop with a note — the spiral
  const form = foldLoops(log).find((l) => l.kind === "form");
  log = loops.landAll(log, [{ act: "reopen", id: form.id, trigger: "the reader adds: make it rhyme", turn: 2, convo: "k1", by: "person" }, { act: "evidence", id: form.id, note: "make it rhyme", prompt: true, by: "person", turn: 2, convo: "k1" }]).log;
  return { history, loops: foldLoops(log), voids: [{ id: "void:gotham|mayor|*", subject: "Gotham", verb: "mayor", object: null, scope: { sources: [], read: 0, total: 0 } }] };
}

/** The holograph's own index over some passages, the way app.js builds it: the organ's DERIVED recurrence floor, cast.js's resolve. */
function indexOver(passages) {
  const text = passages.map((p) => p.text).join("\n\n");
  const events = discoverReferents(extractSurfaces(splitSentences(text), {}), {}).events ?? [];
  const best = new Map();
  for (const e of events) { const prev = best.get(e.referent_id); if (!prev || e.surface.length > prev.length) best.set(e.referent_id, e.surface); }
  const covers = (a, b) => a === b || (Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a)));
  const resolve = (name) => { const ids = new Set(); const parts = diaNorm(name).split(/\s+/).filter((x) => x.length > 2); if (!parts.length) return ids; for (const e of events) { if (!namesCorefer(name, e.surface)) continue; const st = diaNorm(e.surface).split(/\s+/); if (parts.every((p) => st.some((x) => covers(x, p)))) ids.add(e.referent_id); } return ids; };
  return { events, referents: new Set(best.keys()), resolve, represent: (id) => best.get(id) ?? null };
}
const indexOf = (f) => indexOver(f.history.map((h, i) => ({ ref: `h${i}`, text: h.content })));


test("turnsOf pairs each question with the answer that followed", () => {
  const t = turnsOf(fixture().history);
  assert.equal(t.length, 2);
  assert.equal(t[0].n, 1); assert.match(t[0].asked, /batman/); assert.match(t[0].answer, /Gotham/);
});

test("the model stands on the concept level: a referent is a being the index established (recurrence, identity) or an end a question declared — a capitalised run alone is not one", () => {
  const f = fixture();
  const index = indexOf(f);
  const m = holographOf({ ...f, namesIn, index, convo: "k1" });
  const names = m.referents.map((r) => r.name);
  assert.ok(names.includes("batman"), `batman is a referent from the question's own words, declared: ${names}`);
  assert.ok(names.some((n) => /gotham/i.test(n)), `Gotham, met on two turns, is a being the index established: ${names}`);
  assert.ok(!names.includes("Fighting") && !names.includes("Haunted"), "a verse line's first capital is a candidate the index vetoes, never a being");
  const batman = expandReferent(m, "batman");
  assert.equal(batman.declared, true, "declared by the question, not yet established by any reading");
  assert.deepEqual(batman.asked, [1]);
  assert.deepEqual(batman.said, [], "no answer says the word — and it is still on the record, from the question");
  assert.ok(batman.loops.some((l) => l.kind === "subject"), "the subject loop stands on it");
  const gotham = expandReferent(m, "gotham");
  assert.equal(gotham.declared, false);
  assert.deepEqual(gotham.said, [1, 2]); assert.deepEqual(gotham.asked, [2]);
  assert.ok(gotham.mentions >= 1, "the reading met it");
  assert.equal(gotham.voids.length, 1, "the gap declared on Gotham hangs on Gotham");
  assert.ok(m.whole.loops.some((l) => l.kind === "ground"), "a loop naming no referent hangs on the whole");
  assert.match(m.referents[0].name, /gotham/i, "weight order: asked on one turn, said on two, a gap and loops — never 'most interesting'");
  assert.equal(expandReferent(m, "nobody"), null);
  // Without an index nothing is a referent but the DECLARED ends: the
  // question's subject, and the end a gap on the record was declared over.
  const bare = holographOf({ ...f, namesIn, convo: "k1" });
  assert.deepEqual(bare.referents.map((r) => r.name).sort(), ["Gotham", "batman"]);
  assert.ok(bare.referents.every((r) => r.declared));
});

test("the rungs: nine, bottom to top; each rung's rows are plain words that drill into their parts, down to a span or a place in the material", () => {
  assert.deepEqual(LEVELS.map((l) => l.key), ["void", "entity", "kind", "field", "link", "network", "atmosphere", "lens", "paradigm"], "the nine terrains, domain-major, grain within");
  const f0 = fixture();
  const m = holographOf({ ...f0, namesIn, index: indexOf(f0), convo: "k1", records: [{ turn: 1, refs: ["a.txt#0-9"] }], sources: [{ name: "a.txt", bytes: 1000, read: 5, total: 10 }] });
  const places = (r) => (/gotham/i.test(r.name) ? [{ ref: "a.txt#0-9", text: "Gotham stands." }] : []);
  // entity: one row per referent, drilling to loops, turns and places
  const entity = rowsFor(m, "entity", { placesOf: places });
  const gotham = entity.find((r) => /gotham/i.test(r.title));
  assert.ok(gotham && gotham.drill, "a referent row drills");
  const parts = gotham.drill();
  assert.ok(parts.some((r) => r.kind === "turn") && parts.some((r) => r.kind === "gap") && parts.some((r) => r.kind === "place" && r.at === "a.txt#0-9"), `turns, the gap and a place: ${parts.map((r) => r.kind)}`);
  const turnPart = parts.find((r) => r.kind === "turn");
  assert.ok(turnPart.drill().some((r) => r.kind === "span" && r.at === "turn:1#1"), "a turn drills to its spans, each addressed");
  const batman = entity.find((r) => /batman/i.test(r.title));
  assert.match(batman.meta, /declared by a question/);
  assert.ok(batman.drill().some((r) => r.kind === "loop" && /about whom/.test(r.title)), "the subject loop is a part of batman");
  // field: the sources first, each drilling to the addresses cited into it; then the turns
  const field = rowsFor(m, "field");
  assert.equal(field[0].kind, "source"); assert.match(field[0].meta, /1,000 bytes · 5 of 10 parts read/);
  assert.ok(field[0].drill().some((r) => r.kind === "place" && r.at === "a.txt#0-9"));
  assert.equal(field.filter((r) => r.kind === "turn").length, 2);
  // link: loops under their referents, and the whole; a loop drills to its trail
  const link = rowsFor(m, "link");
  const b = link.find((r) => /batman/i.test(r.title));
  const loop = b.drill().find((r) => r.kind === "loop");
  assert.ok(loop && loop.drill().every((r) => r.kind === "step" && /^Turn 1: |^Opened|^Closed|^Spent|^Went|^Reopened|^You added/.test(r.title)), `a loop's trail reads as sentences: ${loop?.drill().map((r) => r.title)}`);
  // void: per turn, what is still open; the declared gap
  const voidRows = rowsFor(m, "void");
  assert.ok(voidRows.some((r) => r.kind === "turn") && voidRows.some((r) => r.kind === "gap"));
  // network: pairs that share a turn
  const net = rowsFor(m, "network");
  assert.ok(net.some((r) => r.kind === "pair" && /gotham/i.test(r.title) && /batman/i.test(r.title)), `Gotham and batman share turn 1: ${net.map((r) => r.title)}`);
  // atmosphere / lens / paradigm: the whole first; the latest closed line; what recurs
  assert.equal(rowsFor(m, "atmosphere")[0].title, "this conversation");
  assert.match(rowsFor(m, "lens").find((r) => /batman/i.test(r.title)).meta, /about whom or what/);
  const para = rowsFor(m, "paradigm");
  assert.ok(para.some((r) => /gotham/i.test(r.title) && /on 2 turns/.test(r.meta)) && para.some((r) => /went round 2 times/.test(r.meta ?? "")), `what recurs: ${para.map((r) => `${r.title} ${r.meta}`)}`);
  // no canon in the rows' own words but the rung names; nothing in a row is a cell or a stance
  for (const level of LEVELS.map((l) => l.key)) for (const r of rowsFor(m, level, { placesOf: places })) for (const text of [r.title, r.meta ?? "", r.line ?? ""]) assert.ok(!/\b(NUL|SIG|INS|SEG|CON|SYN|DEF|EVA|REC)\b|·[A-Z]/.test(text), `notation in ${level}: ${text}`);
  // the eot mode: the same rows in the notation — no sentence, the cell and glyph on every loop, the counts as glyphs
  for (const level of LEVELS.map((l) => l.key)) {
    const rows = rowsFor(m, level, { placesOf: places, mode: "eot" });
    for (const r of rows) { assert.equal(r.line, null, `${level}: no second line in the notation (${r.title})`); assert.ok(!/ — from the discourse: /.test(r.title + (r.meta ?? "")), `${level}: no sentence in the notation`); }
  }
  const eotLink = rowsFor(m, "link", { mode: "eot" });
  const eb = eotLink.find((r) => /batman/i.test(r.title));
  assert.match(eb.meta, /⇐\d/, "a referent's loops as arrow counts");
  const el = eb.drill().find((r) => r.kind === "loop");
  assert.equal(el.title, "○ ⇐ batman ⟵ ≡");
  assert.ok(el.drill().every((r) => /^t\d+ (∅|○|●|｜|⋈|△|⊢|⊨|⊛)/.test(r.title)), `the trail by the operators' glyphs: ${el.drill().map((r) => r.title)}`);
  assert.equal(rowsFor(m, "lens", { mode: "eot" }).find((r) => /batman/i.test(r.title)).meta, "○ ⇐ batman ⟵ ≡");
  assert.match(rowsFor(m, "field", { mode: "eot" })[0].meta, /^1,000B 5\/10$/);
  // THE WALL, in the notation: no row says "record", "unread", "cited", "nothing" — a glyph or a value, only.
  const PLAIN = /\b(record|unread|cited|nothing|declared|Figure|Ground|Pattern)\b/;
  for (const level of LEVELS.map((l) => l.key)) for (const r of rowsFor(m, level, { placesOf: places, mode: "eot" })) for (const text of [r.title, r.meta ?? ""]) assert.ok(!PLAIN.test(text), `plain text in the notation at ${level}: ${text}`);
  // Every rung has a plain name beside its terrain, and the name is not the terrain.
  for (const l of LEVELS) assert.ok(l.name && l.name !== l.key && !/\b(void|entity|kind|field|link|network|atmosphere|lens|paradigm)\b/i.test(l.name), `${l.key} needs a plain name: ${l.name}`);
  // Rows carry the fields a query reads and the keys a graph ties; the rung flattens with its parts.
  assert.equal(eb.data.name, "batman"); assert.ok(eb.data.loops >= 1);
  assert.ok(Array.isArray(eb.links) && eb.links.includes(el.key), "a referent's row is tied to its loops by key");
  const flat = flattenRows(eotLink, { depth: 2 });
  assert.ok(flat.some((r) => r.key === el.key && r.depth === 1 && r.parent === eb.key), "a loop under a referent knows its depth and parent");
  const pairs = rowsFor(m, "network", { mode: "eot" });
  assert.ok(pairs.every((r) => r.kind !== "pair" || (r.links.length === 2 && r.data.a && r.data.b)), "a pair row ties its two referents");
  // and in text mode the lens rung no longer repeats a sentence under itself
  const lensText = rowsFor(m, "lens").find((r) => /batman/i.test(r.title));
  assert.equal(lensText.line, null); assert.match(lensText.meta, /^about whom or what: batman — from the discourse/, "the text mode keeps sentences; the glyphs belong to the notation");
  // an empty conversation says so at every rung
  const empty = holographOf({ history: [], loops: [], convo: "k9" });
  for (const level of LEVELS.map((l) => l.key)) { const rows = rowsFor(empty, level); assert.ok(rows.length >= 1 && rows.every((r) => r.title), `${level} says something on an empty conversation`); assert.ok(rowsFor(empty, level, { mode: "eot" }).every((r) => r.title === "∅" || r.kind !== "empty"), `${level}: an empty rung is ∅ in the notation`); }
});
