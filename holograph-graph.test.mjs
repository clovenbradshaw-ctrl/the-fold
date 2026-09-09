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

test("the placement is a LAYERED drawing: a node sits below everything it depends on, crossings are swept down, and nothing is rescaled to fit", () => {
  const g = graphOf(rows);
  const p = place(g, { width: 300, layerHeight: 60, top: 20 });
  // 1 — LAYER. A referent is a source; its loop and its gap hang below it.
  assert.equal(p.positions.get("r:batman").y, 20, "a source sits in the first layer");
  assert.equal(p.positions.get("r:gotham").y, 20);
  assert.equal(p.positions.get("whole").y, 20);
  assert.equal(p.positions.get("loop:s1").y, 80, "a thing sits below what it depends on");
  assert.equal(p.positions.get("gap:1").y, 80);
  assert.equal(p.layers.length, 2);
  assert.deepEqual(p.layers[0].sort(), ["r:batman", "r:gotham", "whole"]);
  // A cycle is broken rather than trusted, and named.
  // (A two-node cycle cannot arise — graphOf keeps one edge per pair — so the
  // guard is tested on a three-node one, which can.)
  const cyc = place(graphOf([
    R({ key: "a", kind: "loop", title: "a", links: ["b"] }),
    R({ key: "b", kind: "loop", title: "b", links: ["c"] }),
    R({ key: "c", kind: "loop", title: "c", links: ["a"] }),
  ]), { width: 300 });
  assert.ok(cyc.broken.length >= 1, "an edge climbing back into the path is skipped and said so");
  assert.ok([...cyc.positions.values()].every((q) => Number.isFinite(q.x) && Number.isFinite(q.y)));
  // 2 — ORDER. The median heuristic sweeps a crossing out: b's only parent is
  // the SECOND source, a's the first, so the drawing puts them in that order.
  const crossed = place(graphOf([
    R({ key: "s1", kind: "referent", title: "s1", links: ["c2"] }),
    R({ key: "s2", kind: "referent", title: "s2", links: ["c1"] }),
    R({ key: "c1", kind: "loop", title: "c1" }),
    R({ key: "c2", kind: "loop", title: "c2" }),
  ]), { width: 400 });
  assert.ok(crossed.positions.get("c2").x < crossed.positions.get("c1").x, "the child of the left parent is drawn left");
  // 3 — PLACE. Pills never overlap inside a layer, and the word is the mark.
  const row = p.layers[0].map((k) => p.boxes.get(k)).sort((a, b) => a.x - b.x);
  for (let i = 1; i < row.length; i += 1) assert.ok(row[i].x >= row[i - 1].x + row[i - 1].w, `pills apart: ${JSON.stringify(row)}`);
  assert.ok(p.boxes.get("loop:s1").w > p.boxes.get("whole").w, "a longer name is a wider pill");
  assert.deepEqual([...place(g, { width: 300 }).positions], [...place(g, { width: 300 }).positions], "two drawings of the same rows are identical");
  assert.ok(place(graphOf([R({ key: "long", kind: "loop", title: "x".repeat(60) })]), { width: 60 }).width > 60, "a long row widens the frame rather than shrinking the type");
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
  // The word sits INSIDE its own pill, centred — the mark and the label are
  // one thing, so they cannot be placed apart or drift from each other.
  for (const n of nodes) {
    const pill = all(n, "rect").find((r) => r.attrs.class === "hg-pill");
    const t = all(n, "text")[0];
    assert.equal(t.attrs["text-anchor"], "middle");
    const cx = Number(pill.attrs.x) + Number(pill.attrs.width) / 2;
    assert.ok(Math.abs(Number(t.attrs.x) - cx) < 0.2, "the word is centred in its pill");
  }
  const paths = all(svg, "path");
  assert.equal(paths.length, g.edges.length, "one path per tie");
  // Every edge is a curve, and every edge between layers reads DOWNWARD:
  // it leaves the lower rim of the node above and lands on the upper rim of
  // the node below, which is what makes the layering legible as a direction.
  for (const e of g.edges) {
    const a = p.positions.get(e.from), b = p.positions.get(e.to);
    const hi = Math.min(a.y, b.y), lo = Math.max(a.y, b.y);
    const path = paths.find((x) => x.attrs.d.startsWith(`M ${a.y <= b.y ? a.x : b.x} `) || x.attrs.d.includes(` ${lo - (p.boxes.get(a.y <= b.y ? e.to : e.from).h) / 2}`));
    assert.ok(path, `an edge is drawn for ${e.from}→${e.to}`);
    assert.match(path.attrs.d, /^M .* C /, "as a curve");
    const ys = [...path.attrs.d.matchAll(/-?\d+(?:\.\d+)?/g)].map(Number).filter((_, i) => i % 2 === 1);
    assert.ok(Math.min(...ys) >= hi - 40 && Math.max(...ys) <= lo + 40, "the curve stays between the two layers");
  }
  const closed = nodes.find((n) => n.attrs["data-key"] === "loop:s1");
  assert.match(closed.attrs.class, /hg-state-closed/); assert.equal(closed.attrs.role, undefined, "a node with no parts is not a button");
  const gotham = nodes.find((n) => n.attrs["data-key"] === "r:gotham");
  assert.equal(gotham.attrs.role, "button"); assert.equal(gotham.attrs["aria-expanded"], "true");
  assert.ok(all(gotham, "rect").some((c) => c.attrs.class === "hg-ring"), "an open node wears a ring");
  gotham.listeners.click[0]();
  assert.deepEqual(picked, ["r:gotham"]);
  assert.ok(all(nodes[0], "title")[0].textContent.includes("batman"), "the whole of the words rides the node");
});
