// holograph-graph.js — the holograph's VISUAL mode is a graph (user,
// 2026-09-08: "no, visual SHOULD be like a visual graph"), drawn as an ARC
// DIAGRAM: every node keeps its own line, in the order the record already
// puts it in, part-hood is an indent, and every tie is an arc.
//
// IT WAS A FORCE LAYOUT FIRST, AND THAT WAS THE MISTAKE (user, 2026-09-08:
// "we are using gravity essentially for the reading mechanics, so let's just
// represent what is there, with an eye to readability"). A relaxation decides
// where a thing goes by simulating attraction and repulsion — so a row's
// position came out of physics rather than out of the record, and every
// defect it produced had to be answered with another force: two unconnected
// clusters flew apart, a fit crushed them back to a blob, a pull was added to
// bound the flight, and the pull's own strength then had to be derived from
// what the labels needed. None of that is reading. The record already says
// what is there and in what order; the drawing says the same thing in two
// dimensions, and labels never collide because no two nodes share a line.
//
// WHAT DECIDES EACH COORDINATE, so nothing here is a hidden finding:
//   y — the row's ORDER, exactly as the rung handed it over.
//   x — its DEPTH: a part sits one indent right of what it is part of.
//   an arc — a tie the row itself carries (`links`), or a pair row's own two
//            ends; bulging right, reaching out in proportion to the lines it
//            spans, so a long tie reads as a long arc.
// Nothing is inferred, nothing is simulated, and two drawings of the same
// rows are identical.
//
// Pure: `graphOf` and `place` need no document; `draw` takes one
// (`createElementNS("http://www.w3.org/2000/svg", …)` — the namespace, not a
// host; II.13's own allowance, written inline at the call it belongs to).

/** graphOf(rows, { open }) → { nodes, edges }: a node per row, in the rows' own order; an edge per link and per part; a pair row IS an edge between its two ends. */
export function graphOf(rows, { open = new Set() } = {}) {
  const nodes = new Map();
  const edges = [];
  const add = (r) => { if (!nodes.has(r.key)) nodes.set(r.key, { key: r.key, title: r.title, meta: r.meta ?? null, kind: r.kind, state: r.state ?? null, depth: r.depth ?? 0, drill: typeof r.drill === "function", open: open.has(r.key), hit: !!r.hit, row: r }); return nodes.get(r.key); };
  for (const r of rows) {
    if (r.kind === "pair" && Array.isArray(r.links) && r.links.length === 2) {
      // A pair is a tie between two referents: two nodes, one labelled arc.
      const [a, b] = r.links;
      add({ key: a, title: r.data?.a ?? a, kind: "referent", state: null, depth: r.depth ?? 0 });
      add({ key: b, title: r.data?.b ?? b, kind: "referent", state: null, depth: r.depth ?? 0 });
      edges.push({ from: a, to: b, label: r.meta ?? null, key: r.key, row: r });
      continue;
    }
    add(r);
  }
  for (const r of rows) {
    if (r.kind === "pair") continue;
    if (r.parent != null && nodes.has(r.parent)) edges.push({ from: r.parent, to: r.key, label: null, key: `${r.parent}>${r.key}`, part: true });
    for (const k of r.links ?? []) if (nodes.has(k) && k !== r.key) edges.push({ from: r.key, to: k, label: null, key: `${r.key}>${k}` });
  }
  // One edge per unordered pair; a part edge yields to a labelled tie.
  const seen = new Map();
  for (const e of edges) { const id = [e.from, e.to].sort().join("|"); const prev = seen.get(id); if (!prev || (prev.part && !e.part)) seen.set(id, e); }
  return { nodes: [...nodes.values()], edges: [...seen.values()] };
}

/**
 * place(graph, { width, rowHeight, indent, left, top }) → { positions,
 * labelChars, width, height } — one line per node, in order, indented by
 * depth.
 *
 * Every number is a fact about the type, declared once (P9): a line is as
 * tall as a node's two lines of text plus air, an indent is one glyph of the
 * mono face, and a label's room is what the pane has left after that indent.
 * NOTHING IS RESCALED TO FIT: a drawing that shrinks until it fits has
 * stopped being readable, and the honest answer is a taller frame — which a
 * panel can scroll.
 */
export function place({ nodes = [] } = {}, { width = 600, rowHeight = 30, indent = 16, left = 14, top = 18, bottom = 14, charWidth = 6.2, labelGap = 11 } = {}) {
  const positions = new Map();
  nodes.forEach((nd, i) => positions.set(nd.key, { x: left + (nd.depth ?? 0) * indent, y: top + i * rowHeight }));
  const labelChars = new Map();
  for (const nd of nodes) {
    const p = positions.get(nd.key);
    labelChars.set(nd.key, Math.max(8, Math.floor((width - p.x - labelGap - 8) / charWidth)));
  }
  return { positions, labelChars, width, height: top + Math.max(0, nodes.length - 1) * rowHeight + bottom + 14 };
}

/** clipLabel(text, n) — a label is one line; the whole of it rides the node's own title element. */
const clipLabel = (t, n) => { const x = String(t ?? "").trim(); return x.length > n ? `${x.slice(0, Math.max(1, n - 1))}…` : x; };

/**
 * draw(doc, graph, placement, { onPick }) → an <svg>. A node is a mark on
 * its own line with its words to the right; a PART tie is an elbow (down the
 * column of what it belongs to, then across), any other tie an arc bulging
 * right. A node with parts is a button carrying `aria-expanded`; pressing it
 * calls `onPick(row)`.
 */
export function draw(doc, graph, placement, { onPick = null } = {}) {
  const el = (name, attrs = {}) => { const e = doc.createElementNS("http://www.w3.org/2000/svg", name); for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, String(v)); return e; };
  const { positions, labelChars, width, height } = placement;
  const svg = el("svg", { viewBox: `0 0 ${width} ${height}`, class: "hg-graph", role: "img", "aria-label": "the holograph as a graph — every row on its own line, ties drawn between them; press a node to drill it" });
  const edgesG = el("g", { class: "hg-edges" });
  for (const e of graph.edges) {
    const a = positions.get(e.from), b = positions.get(e.to);
    if (!a || !b) continue;
    if (e.part) {
      // An elbow: down the column of what it belongs to, then across to it.
      edgesG.append(el("path", { d: `M ${a.x} ${a.y + 7} V ${b.y} H ${b.x - 5}`, class: "hg-edge hg-edge-part", fill: "none" }));
      continue;
    }
    const reach = Math.min(64, 10 + Math.abs(b.y - a.y) * 0.28);
    const x = Math.max(a.x, b.x);
    edgesG.append(el("path", { d: `M ${a.x} ${a.y} C ${x + reach} ${a.y}, ${x + reach} ${b.y}, ${b.x} ${b.y}`, class: "hg-edge", fill: "none" }));
    if (e.label) { const t = el("text", { x: x + reach - 2, y: (a.y + b.y) / 2, class: "hg-edge-label", "text-anchor": "end", "dominant-baseline": "middle" }); t.textContent = clipLabel(e.label, 18); edgesG.append(t); }
  }
  svg.append(edgesG);
  const nodesG = el("g", { class: "hg-nodes" });
  for (const nd of graph.nodes) {
    const p = positions.get(nd.key);
    if (!p) continue;
    const g = el("g", { class: `hg-node hg-${nd.kind}${nd.state ? ` hg-state-${nd.state}` : ""}${nd.drill ? " drillable" : ""}${nd.open ? " open" : ""}${nd.hit ? " hit" : ""}`, transform: `translate(${p.x},${p.y})`, tabindex: nd.drill ? 0 : null, role: nd.drill ? "button" : null, "aria-expanded": nd.drill ? String(nd.open) : null, "data-key": nd.key });
    const title = el("title"); title.textContent = [nd.title, nd.meta].filter(Boolean).join(" · "); g.append(title);
    g.append(el("circle", { r: nd.depth ? 3.5 : 5 }));
    if (nd.open) g.append(el("circle", { r: nd.depth ? 6.5 : 8, class: "hg-ring" }));
    const room = labelChars.get(nd.key) ?? 28;
    const meta = nd.meta ? clipLabel(nd.meta, room) : "";
    // Words to the right, on the node's own line; a second line beneath for
    // what the row says of itself, when it says anything.
    const label = el("text", { x: 11, y: meta ? -1 : 4, class: "hg-label" });
    label.textContent = clipLabel(nd.title, room);
    g.append(label);
    if (meta) { const m = el("text", { x: 11, y: 11, class: "hg-sub" }); m.textContent = meta; g.append(m); }
    if (nd.drill && typeof onPick === "function") {
      const pick = () => onPick(nd.row);
      g.addEventListener?.("click", pick);
      g.addEventListener?.("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault?.(); pick(); } });
    }
    nodesG.append(g);
  }
  svg.append(nodesG);
  return svg;
}
