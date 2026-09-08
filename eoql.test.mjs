// eoql.test.mjs — the query over the holograph's rows (eoql.js). Pure rows,
// built here to the shape holograph.js emits (key, kind, state, title,
// meta, data, links, depth, parent). What is pinned: a bare word scans;
// every operator reads by keyword or by its received glyph; acts chain by
// `→` or by simply following; SEG reads fields, EVA reads arrows, CON
// follows links and parts, REC groups, SYN counts, DEF orders and cuts; INS
// is refused by name; an empty query selects all; and a quoted argument is
// one word.
import test from "node:test";
import assert from "node:assert/strict";
import { parse, run, say, tokenize, fieldsOf } from "./eoql.js";

const R = (o) => Object.freeze({ meta: null, line: null, at: null, state: null, data: null, links: null, depth: 0, parent: null, drill: null, ...o });
const rows = [
  R({ key: "r:batman", kind: "referent", title: "batman", meta: "? t1 ⇐1", data: { name: "batman", turns: [1], loops: 1, mentions: 3 }, links: ["loop:s1"] }),
  R({ key: "loop:s1", kind: "loop", title: "○ ⇐ batman ⟵ ≡", state: "closed", data: { turn: 1, state: "closed", op: "○", asks: "about whom or what", text: "batman — from the discourse" }, depth: 1, parent: "r:batman" }),
  R({ key: "r:gotham", kind: "referent", title: "Gotham", meta: "≡ t1", data: { name: "Gotham", turns: [1], loops: 0, mentions: 2 } }),
  R({ key: "gap:1", kind: "gap", title: "Gotham —mayor→ ?", meta: "∅ ⟵ ⊞", state: "open", data: { state: "open", subject: "Gotham", label: "mayor" }, depth: 1, parent: "r:gotham" }),
  R({ key: "turn:2", kind: "turn", title: "t2", meta: "3⁝ pick a code name", data: { turn: 2, spans: 3, asked: "pick a code name for our harbour project" } }),
  R({ key: "loop:f2", kind: "loop", title: "⊢ ⇏", state: "refused", data: { turn: 2, state: "refused", op: "⊢", asks: "in what form", text: "could not close" }, depth: 1, parent: "turn:2" }),
  R({ key: "whole", kind: "whole", title: "⊙", meta: "⇒1 ⇐8", data: { loops: 9 }, links: ["loop:f2"] }),
];
const keys = (res) => res.rows.map((r) => r.key);

test("a bare word scans every row's own words, folded; a quoted run is one word; an empty query selects all", () => {
  assert.deepEqual(keys(run("batman", rows)), ["r:batman", "loop:s1"]);
  assert.deepEqual(keys(run("BATMAN", rows)), ["r:batman", "loop:s1"], "case folds");
  assert.deepEqual(keys(run("code name", rows)), ["turn:2"], "every word must be present");
  assert.deepEqual(keys(run('"our harbour"', rows)), ["turn:2"], "a quoted phrase is one word, read in the row's data too");
  assert.equal(run("", rows).rows.length, rows.length);
  assert.deepEqual(tokenize('SEG(state, open) "two words"').map((t) => t.word), ["SEG", "state", "open", "two words"], "the older op(a, b) form reads as words");
});

test("each operator reads by keyword or by its received glyph, and acts chain by → or by following", () => {
  const byWord = parse("NUL batman → SEG state=closed → DEF 1");
  const byGlyph = parse("∅ batman ｜ state=closed ⊢ 1");
  assert.deepEqual(byWord.acts, byGlyph.acts);
  assert.deepEqual(byWord.acts.map((a) => a.op), ["NUL", "SEG", "DEF"]);
  assert.equal(say(byWord), "∅ batman → ｜ state=closed → ⊢ 1");
  assert.deepEqual(keys(run(byGlyph, rows)), ["loop:s1"]);
});

test("SEG partitions on a field (=, !=, <, >), EVA judges by arrow or word, and both read the row's own fields", () => {
  assert.deepEqual(keys(run("｜ kind=loop", rows)), ["loop:s1", "loop:f2"]);
  assert.deepEqual(keys(run("｜ kind=loop state!=closed", rows)), ["loop:f2"]);
  assert.deepEqual(keys(run("｜ turn=2", rows)), ["turn:2", "loop:f2"], "turn reads data.turn or the turn:N key");
  assert.deepEqual(keys(run("｜ t=2", rows)), ["turn:2", "loop:f2"], "t is turn");
  assert.deepEqual(keys(run("｜ mentions>2", rows)), ["r:batman"]);
  assert.deepEqual(keys(run("｜ depth=1", rows)), ["loop:s1", "gap:1", "loop:f2"]);
  assert.deepEqual(keys(run("⊨ ⇐", rows)), ["loop:s1"]);
  assert.deepEqual(keys(run("⊨ ⇏", rows)), ["loop:f2"]);
  assert.deepEqual(keys(run("EVA open", rows)), ["gap:1"], "a word for the arrow reads the same");
  assert.deepEqual(keys(run("⊨ gap", rows)), ["gap:1"], "a gap is judged by its word");
  assert.deepEqual(keys(run("｜ kind=gap", rows)), ["gap:1"], "or by its kind");
  assert.deepEqual(keys(run("⊨ ∅", rows)), rows.map((r) => r.key), "an operator's glyph is always an operator — ⊨ with no argument judges nothing, ∅ with none scans nothing");
  const f = fieldsOf(rows[1]);
  assert.equal(f.turn, 1); assert.equal(f.state, "closed"); assert.equal(f.kind, "loop"); assert.equal(f.depth, 1);
});

test("CON follows links and parts one hop from what matches, marking the seeds; SIG marks without cutting", () => {
  const con = run("⋈ batman", rows);
  assert.deepEqual(keys(con), ["r:batman", "loop:s1"]);
  assert.deepEqual(con.rows.map((r) => r.hit), [true, true], "both carry the word");
  const whole = run("⋈ ⊙", rows);
  assert.deepEqual(keys(whole), ["loop:f2", "whole"], "the whole's links are followed");
  assert.deepEqual(whole.rows.map((r) => r.hit), [false, true]);
  const sig = run("○ gotham", rows);
  assert.equal(sig.rows.length, rows.length, "SIG keeps every row");
  assert.deepEqual(sig.rows.filter((r) => r.hit).map((r) => r.key), ["r:gotham", "gap:1"]);
});

test("REC groups by a field with the members beneath, SYN counts with the arrows, DEF orders and takes the first n", () => {
  const rec = run("⊛ kind", rows);
  assert.deepEqual(rec.rows.map((r) => r.title), ["kind=referent", "kind=loop", "kind=gap", "kind=turn", "kind=whole"]);
  assert.equal(rec.rows[1].meta, "×2");
  assert.deepEqual(rec.rows[1].drill().map((r) => r.key), ["loop:s1", "loop:f2"]);
  const syn = run("｜ kind=loop → △", rows);
  assert.equal(syn.rows.length, 1); assert.equal(syn.rows[0].title, "×2 ⇐1 ⇏1");
  assert.deepEqual(keys(run("⊢ 2", rows)), ["r:batman", "loop:s1"]);
  assert.deepEqual(keys(run("｜ kind=loop → ⊢ -turn", rows)), ["loop:f2", "loop:s1"], "descending by turn");
  assert.deepEqual(keys(run("⊢ turn 1", rows)), ["r:batman"], "ordered, then the first n");
});

test("INS is refused by name: a query never instantiates; the refusal says so and selects nothing", () => {
  const res = run("● batman", rows);
  assert.equal(res.rows.length, 0);
  assert.equal(res.refused.type, "instantiates_nothing");
  assert.equal(run("INS", rows).refused.type, "instantiates_nothing");
  assert.equal(run("batman", rows).refused, null);
});
