// holograph-graph.test.mjs — the holograph's graph (holograph-graph.js) as
// an ARC DIAGRAM. What is pinned: rows become nodes in the order they were
// handed over and their ties become edges; a pair row IS an edge; every node
// keeps its own line, indented by depth, so no two labels can collide; the
// placement is decided by the record's order and never by a simulation
// (there is no force term left to test, and that is the point — the module's
// own header carries the measured reason the relaxation was removed); and
// the drawing labels every node, marks its state, and makes a node with
// parts a button that hands its row back.
import test from "node:test";
import assert from "node:assert/strict";
import { graphOf, place, draw } from "./holograph-graph.js";

const R = (o) => ({ meta: null, line: null, at: null, state: null, data: null, links: null, depth: 0, parent: null, drill: null, ...o });
const rows = [
  R({ key: "r:batman", kind: "referent", title: "batman", meta: "⇐1", links: ["loop:s1"], drill: () => [] }),
  R({ key: "loop:s1", kind: "loop", title: "○ ⇐ batman ⟵ ≡", state: "closed", depth: 1, parent: "r:batman" }),
  R({ key: "r:gotham", kind: "referent", title: "Gotham", meta: "∅1", drill: () => [] }),
  R({ key: "gap:1", kind: "gap", title: "Gotham —mayor→ ?", state: "open", depth: 1, parent: "r:gotham" }),
  R({ key: "whole", kind: "whole", title: "⊙", links: ["loop:s1"] }),
];

test("rows become nodes in their own order and their ties edges — one edge per pair, a part edge yielding to a labelled tie; a pair row is an edge between its two ends", () => {
  const g = graphOf(rows, { open: new Set(["r:batman"]) });
  assert.deepEqual(g.nodes.map((n) => n.key), ["r:batman", "loop:s1", "r:gotham", "gap:1", "whole"]);
  assert.equal(g.nodes[0].open, true); assert.equal(g.nodes[0].drill, true); assert.equal(g.nodes[1].drill, false);
  const ties = g.edges.map((e) => [e.from, e.to].sort().join("|")).sort();
  assert.deepEqual(ties, ["gap:1|r:gotham", "loop:s1|r:batman", "loop:s1|whole"]);
  assert.equal(g.edges.find((e) => e.from === "r:batman" || e.to === "r:batman").part, undefined, "the referent's own link, not the part edge, stands");
  const pairs = graphOf([R({ key: "a&b", kind: "pair", title: "batman ⇄ Gotham", meta: "t1", links: ["r:batman", "r:gotham"], data: { a: "batman", b: "Gotham", shared: 1 } })]);
  assert.deepEqual(pairs.nodes.map((n) => [n.key, n.title]), [["r:batman", "batman"], ["r:gotham", "Gotham"]]);
  assert.equal(pairs.edges.length, 1); assert.equal(pairs.edges[0].label, "t1");
});

test("the placement is the record's own order and depth — one line each, never a simulation, never rescaled to fit", () => {
  const g = graphOf(rows);
  const p = place(g, { width: 300, rowHeight: 30, indent: 16, left: 14, top: 18 });
  assert.deepEqual([...p.positions.values()].map((q) => q.y), [18, 48, 78, 108, 138], "y is the row's order, nothing else");
  assert.deepEqual([...p.positions.values()].map((q) => q.x), [14, 30, 14, 30, 14], "x is the row's depth, nothing else");
  // No two nodes share a line, so no two labels can collide — the property
  // the force layout could not hold (measured live, 2026-09-08: six nodes,
  // two clusters 323px apart, 13px between neighbours, labels overlapping).
  const ys = [...p.positions.values()].map((q) => q.y);
  assert.equal(new Set(ys).size, ys.length);
  assert.deepEqual([...place(g, { width: 300 }).positions], [...place(g, { width: 300 }).positions], "two drawings of the same rows are identical");
  // The frame grows with the rows rather than the rows shrinking to the frame.
  assert.ok(place(g, { width: 300, rowHeight: 30 }).height < place(graphOf([...rows, R({ key: "x", kind: "loop", title: "x" })]), { width: 300, rowHeight: 30 }).height);
  // A label's room is what the pane has left after the node's own indent.
  assert.ok(p.labelChars.get("r:batman") > p.labelChars.get("loop:s1"), "an indented node has less room, and is told so");
  assert.ok(place(g, { width: 900 }).labelChars.get("r:batman") > p.labelChars.get("r:batman"), "a wider pane is more room");
});

/** A stub document: enough of the DOM for the drawing to be inspected. */
function stubDocument() {
  const make = (ns, name) => ({ ns, name, attrs: {}, children: [], textContent: "", listeners: {}, setAttribute(k, v) { this.attrs[k] = v; }, append(...kids) { this.children.push(...kids); }, addEventListener(t, f) { (this.listeners[t] ??= []).push(f); } });
  return { createElementNS: (ns, name) => make(ns, name) };
}
const all = (el, name, out = []) => { for (const c of el.children) { if (c.name === name) out.push(c); all(c, name, out); } return out; };

test("the drawing puts every node's words on its own line, marks its state, draws a part as an elbow and any other tie as an arc, and hands a pressed row back", () => {
  const doc = stubDocument();
  const g = graphOf(rows, { open: new Set(["r:gotham"]) });
  const p = place(g, { width: 300 });
  const picked = [];
  const svg = draw(doc, g, p, { onPick: (row) => picked.push(row.key) });
  assert.equal(svg.ns, "http://www.w3.org/2000/svg");
  assert.equal(svg.attrs.viewBox, `0 0 ${p.width} ${p.height}`, "the frame is the placement's own, not a fit");
  const nodes = all(svg, "g").filter((x) => /\bhg-node\b/.test(x.attrs.class));
  assert.deepEqual(nodes.map((n) => all(n, "text")[0].textContent), ["batman", "○ ⇐ batman ⟵ ≡", "Gotham", "Gotham —mayor→ ?", "⊙"]);
  for (const n of nodes) assert.ok(Number(all(n, "text")[0].attrs.x) > 0, "words to the right of the mark, always — no other node shares this line to run into");
  const paths = all(svg, "path");
  assert.equal(paths.length, g.edges.length, "one path per tie");
  // One elbow: the gap under its referent. The loop's own part edge yielded
  // to the referent's labelled tie in graphOf, as the dedupe rule says.
  assert.equal(paths.filter((x) => /hg-edge-part/.test(x.attrs.class)).length, 1, "a part is an elbow");
  assert.match(paths.find((x) => !/hg-edge-part/.test(x.attrs.class)).attrs.d, /^M .* C /, "any other tie is an arc");
  const closed = nodes.find((n) => n.attrs["data-key"] === "loop:s1");
  assert.match(closed.attrs.class, /hg-state-closed/); assert.equal(closed.attrs.role, undefined, "a node with no parts is not a button");
  const gotham = nodes.find((n) => n.attrs["data-key"] === "r:gotham");
  assert.equal(gotham.attrs.role, "button"); assert.equal(gotham.attrs["aria-expanded"], "true");
  assert.ok(all(gotham, "circle").some((c) => c.attrs.class === "hg-ring"), "an open node wears a ring");
  gotham.listeners.click[0]();
  assert.deepEqual(picked, ["r:gotham"]);
  assert.ok(all(nodes[0], "title")[0].textContent.includes("batman"), "the whole of the words rides the node");
});
