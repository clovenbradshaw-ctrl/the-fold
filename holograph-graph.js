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
//   y — the node's LAYER: its longest path from something nothing depends on,
//       so a thing always sits below everything it depends on.
//   x — its place in that layer after the median heuristic has swept the
//       crossings down, nudged toward a single parent but never past a
//       neighbour.
//   an edge — a tie the row itself carries (`links`), a part-of, or a pair
//       row's own two ends; between layers it leaves the lower edge above and
//       arrives at the upper edge below, so every edge reads downward.
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
 * place(graph, { width, … }) → { positions, boxes, layers, width, height } —
 * a LAYERED DRAWING of the graph (user, 2026-09-08: "no, I mean like a real
 * DAG graph"). Sugiyama's three steps, in the order he put them:
 *
 *   1. LAYER — every node's row is its longest path from a source, so a
 *      thing always sits below everything it depends on. A cycle cannot
 *      happen on this record (a part is a part), but one is broken rather
 *      than trusted: an edge that would climb back into a node already on
 *      the path is skipped and named on the result.
 *   2. ORDER — within a layer, the median heuristic (Sugiyama, Tagawa &
 *      Toda; d3-dag and dagre both still use it): a node goes where the
 *      median of its neighbours in the layer above sits, swept down then up
 *      a declared number of times. It reduces crossings; it does not claim
 *      to minimise them, which is NP-hard.
 *   3. PLACE — pills packed along the layer with a declared gap, the layer
 *      centred; a node with one parent is nudged toward it, which is the
 *      cheap half of Brandes-Köpf and enough at this size.
 *
 * THE WORD IS THE MARK (explore.js's Network surface, this project's own
 * mature graph): a pill carries its own text, so a label can never be
 * separated from its node. NOTHING IS RESCALED TO FIT — the type stays the
 * size it was chosen to be and the frame grows; the reader pans and zooms.
 * Deterministic: no random draw anywhere, so the same rows draw the same way.
 */
export function place({ nodes = [], edges = [] } = {}, { width = 600, layerHeight = 62, gap = 14, left = 14, top = 22, bottom = 18, fontSize = 11, charWidth = 6.3, padX = 9, maxChars = 34, sweeps = 4 } = {}) {
  const index = new Map(nodes.map((nd, i) => [nd.key, i]));
  const sizeOf = (nd) => {
    const chars = Math.min(maxChars, String(nd.title ?? "").length);
    return { w: Math.max(22, chars * charWidth + 2 * padX), h: fontSize + 10 };
  };
  // 1 — LAYER. Only edges that point somewhere (a part edge, a tie a row
  // carries) can lower a node; a same-layer tie (a pair) never does.
  const down = new Map(nodes.map((nd) => [nd.key, []]));
  const up = new Map(nodes.map((nd) => [nd.key, []]));
  const broken = [];
  for (const e of edges) {
    if (!index.has(e.from) || !index.has(e.to) || e.from === e.to) continue;
    down.get(e.from).push(e.to);
    up.get(e.to).push(e.from);
  }
  const layer = new Map();
  const mark = new Map();
  const depth = (key) => {
    if (layer.has(key)) return layer.get(key);
    if (mark.get(key) === 1) { broken.push(key); return 0; }
    mark.set(key, 1);
    let d = 0;
    for (const u of up.get(key) ?? []) d = Math.max(d, depth(u) + 1);
    mark.set(key, 2);
    layer.set(key, d);
    return d;
  };
  for (const nd of nodes) depth(nd.key);
  const layers = [];
  for (const nd of nodes) { const d = layer.get(nd.key) ?? 0; (layers[d] ??= []).push(nd); }
  for (let i = 0; i < layers.length; i += 1) layers[i] ??= [];
  // 2 — ORDER. The median of a node's neighbours in the layer it is being
  // swept against; a node with no neighbour there keeps its place.
  const order = layers.map((row) => row.map((nd) => nd.key));
  const posIn = (row) => new Map(row.map((k, i) => [k, i]));
  const sweep = (from, to, neighbours) => {
    const at = posIn(order[from]);
    const keyed = order[to].map((k, i) => {
      const ns = (neighbours.get(k) ?? []).map((n) => at.get(n)).filter((x) => x != null).sort((a, b) => a - b);
      const med = ns.length ? (ns.length % 2 ? ns[(ns.length - 1) / 2] : (ns[ns.length / 2 - 1] + ns[ns.length / 2]) / 2) : null;
      return { k, i, med };
    });
    keyed.sort((a, b) => (a.med == null || b.med == null ? a.i - b.i : a.med - b.med || a.i - b.i));
    order[to] = keyed.map((x) => x.k);
  };
  for (let s = 0; s < sweeps; s += 1) {
    for (let d = 1; d < order.length; d += 1) sweep(d - 1, d, up);
    for (let d = order.length - 2; d >= 0; d -= 1) sweep(d + 1, d, down);
  }
  // 3 — PLACE. Pack each layer, centre it, then nudge a node with exactly one
  // parent toward that parent — never past its neighbours.
  const boxes = new Map(nodes.map((nd) => [nd.key, sizeOf(nd)]));
  const positions = new Map();
  const byKey = new Map(nodes.map((nd) => [nd.key, nd]));
  let frame = width;
  order.forEach((row, d) => {
    const total = row.reduce((n, k) => n + boxes.get(k).w, 0) + Math.max(0, row.length - 1) * gap;
    frame = Math.max(frame, total + 2 * left);
    let x = left + Math.max(0, (Math.max(width, total + 2 * left) - 2 * left - total) / 2);
    for (const k of row) {
      const b = boxes.get(k);
      positions.set(k, { x: x + b.w / 2, y: top + d * layerHeight });
      x += b.w + gap;
    }
  });
  for (let d = 1; d < order.length; d += 1) {
    for (const k of order[d]) {
      const parents = (up.get(k) ?? []).filter((u) => layer.get(u) === d - 1);
      if (parents.length !== 1) continue;
      const p = positions.get(parents[0]), me = positions.get(k);
      if (!p || !me) continue;
      const row = order[d], i = row.indexOf(k);
      const bw = boxes.get(k).w;
      const leftEdge = i > 0 ? positions.get(row[i - 1]).x + boxes.get(row[i - 1]).w / 2 + gap + bw / 2 : -Infinity;
      const rightEdge = i < row.length - 1 ? positions.get(row[i + 1]).x - boxes.get(row[i + 1]).w / 2 - gap - bw / 2 : Infinity;
      me.x = Math.min(rightEdge, Math.max(leftEdge, p.x));
    }
  }
  const boxAt = new Map();
  for (const [k, b] of boxes) { const p = positions.get(k); boxAt.set(k, { x: p.x - b.w / 2, y: p.y - b.h / 2, w: b.w, h: b.h }); }
  return { positions, boxes: boxAt, layers: order, broken, fontSize, maxChars, byKey, width: frame, height: top + Math.max(0, order.length - 1) * layerHeight + bottom + fontSize };
}

/** clipLabel(text, n) — a pill is one line; the whole of it rides the node's own title element. */
const clipLabel = (t, n) => { const x = String(t ?? "").trim(); return x.length > n ? `${x.slice(0, Math.max(1, n - 1))}…` : x; };

/**
 * draw(doc, graph, placement, { onPick }) → an <svg>. Each node is a PILL
 * carrying its own words, on its own line; a PART tie is an elbow (down the
 * column of what it belongs to, then across), any other tie an arc bulging
 * right, drawn from pill edge to pill edge. A node with parts is a button
 * carrying `aria-expanded`; pressing it calls `onPick(row)`.
 *
 * Wheel-zoom about the pointer, drag-pan, and double-click to fit — lifted
 * whole from explore.js's Network surface, which has carried them since
 * 2026-08-16. A drawing taller than its pane needs a way to be moved through
 * that is not the scrollbar alone.
 */
export function draw(doc, graph, placement, { onPick = null } = {}) {
  const el = (name, attrs = {}) => { const e = doc.createElementNS("http://www.w3.org/2000/svg", name); for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, String(v)); return e; };
  const { positions, boxes, width, height, fontSize = 11, maxChars = 46 } = placement;
  const vb = { x: 0, y: 0, w: width, h: height };
  const svg = el("svg", { viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: "xMidYMid meet", class: "hg-graph", role: "img", "aria-label": "the holograph as a graph — every row on its own line, ties drawn between them; press a node to drill it, drag to pan, double-click to fit" });
  const applyVB = () => svg.setAttribute("viewBox", `${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}`);
  const anyHit = graph.nodes.some((n) => n.hit);
  const edgesG = el("g", { class: "hg-edges" });
  for (const e of graph.edges) {
    const a = positions.get(e.from), b = positions.get(e.to);
    const ba = boxes.get(e.from), bb = boxes.get(e.to);
    if (!a || !b || !ba || !bb) continue;
    if (Math.abs(a.y - b.y) < 1) {
      // A tie inside one layer arcs over it rather than cutting across.
      const [l, r] = a.x <= b.x ? [a, b] : [b, a];
      const lift = Math.min(34, 10 + (r.x - l.x) * 0.16);
      edgesG.append(el("path", { d: `M ${l.x} ${l.y - ba.h / 2} C ${l.x} ${l.y - ba.h / 2 - lift}, ${r.x} ${r.y - bb.h / 2 - lift}, ${r.x} ${r.y - bb.h / 2}`, class: `hg-edge${e.part ? " hg-edge-part" : ""}`, fill: "none" }));
      if (e.label) { const t = el("text", { x: (l.x + r.x) / 2, y: l.y - ba.h / 2 - lift * 0.75, class: "hg-edge-label", "text-anchor": "middle" }); t.textContent = clipLabel(e.label, 18); edgesG.append(t); }
      continue;
    }
    // Between layers: a curve leaving the lower edge of the one above and
    // arriving at the upper edge of the one below, so an edge always reads
    // downward — which is what makes the layering legible as a direction.
    const [top, bot] = a.y <= b.y ? [{ p: a, b: ba }, { p: b, b: bb }] : [{ p: b, b: bb }, { p: a, b: ba }];
    const y0 = top.p.y + top.b.h / 2, y1 = bot.p.y - bot.b.h / 2;
    const mid = (y0 + y1) / 2;
    edgesG.append(el("path", { d: `M ${top.p.x} ${y0} C ${top.p.x} ${mid}, ${bot.p.x} ${mid}, ${bot.p.x} ${y1}`, class: `hg-edge${e.part ? " hg-edge-part" : ""}`, fill: "none" }));
    if (e.label) { const t = el("text", { x: (top.p.x + bot.p.x) / 2, y: mid, class: "hg-edge-label", "text-anchor": "middle", "dominant-baseline": "middle" }); t.textContent = clipLabel(e.label, 18); edgesG.append(t); }
  }
  svg.append(edgesG);
  const nodesG = el("g", { class: "hg-nodes" });
  for (const nd of graph.nodes) {
    const p = positions.get(nd.key), box = boxes.get(nd.key);
    if (!p || !box) continue;
    // A query that marks its hits lights them and dims the rest — explore.js's
    // own focus grammar (`lit` / `far`), not a second costume for one idea.
    const lit = anyHit ? (nd.hit ? " lit" : " far") : "";
    const g = el("g", { class: `hg-node hg-${nd.kind}${nd.state ? ` hg-state-${nd.state}` : ""}${nd.drill ? " drillable" : ""}${nd.open ? " open" : ""}${lit}`, tabindex: nd.drill ? 0 : null, role: nd.drill ? "button" : null, "aria-expanded": nd.drill ? String(nd.open) : null, "data-key": nd.key });
    const title = el("title"); title.textContent = [nd.title, nd.meta].filter(Boolean).join(" · "); g.append(title);
    g.append(el("rect", { x: box.x.toFixed(1), y: box.y.toFixed(1), width: box.w.toFixed(1), height: box.h.toFixed(1), rx: (box.h / 2).toFixed(1), class: "hg-pill" }));
    const label = el("text", { x: (box.x + box.w / 2).toFixed(1), y: (p.y + fontSize * 0.34).toFixed(1), "text-anchor": "middle", "font-size": fontSize, class: "hg-label" });
    label.textContent = clipLabel(nd.title, maxChars);
    g.append(label);
    // What the row says of itself rides beside the pill, never inside it: a
    // pill is the thing, its counts are about the thing.
    // What the row says of itself rides UNDER its pill, centred: a layered
    // drawing has neighbours to the right, and no room there.
    if (nd.meta) { const m = el("text", { x: (box.x + box.w / 2).toFixed(1), y: (box.y + box.h + 10).toFixed(1), "text-anchor": "middle", class: "hg-sub" }); m.textContent = clipLabel(nd.meta, maxChars); g.append(m); }
    if (nd.open) g.append(el("rect", { x: (box.x - 3).toFixed(1), y: (box.y - 3).toFixed(1), width: (box.w + 6).toFixed(1), height: (box.h + 6).toFixed(1), rx: ((box.h + 6) / 2).toFixed(1), class: "hg-ring", fill: "none" }));
    if (nd.drill && typeof onPick === "function") {
      const pick = (ev) => { ev?.stopPropagation?.(); onPick(nd.row); };
      g.addEventListener?.("click", pick);
      g.addEventListener?.("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault?.(); pick(ev); } });
    }
    nodesG.append(g);
  }
  svg.append(nodesG);
  // Wheel-zoom about the pointer, drag-pan, double-click to fit.
  if (typeof svg.addEventListener === "function") {
    svg.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      const rect = svg.getBoundingClientRect();
      const mx = vb.x + ((ev.clientX - rect.left) / rect.width) * vb.w;
      const my = vb.y + ((ev.clientY - rect.top) / rect.height) * vb.h;
      const scale = ev.deltaY > 0 ? 1.15 : 1 / 1.15;
      const fx = (mx - vb.x) / vb.w, fy = (my - vb.y) / vb.h;
      vb.w = Math.max(120, Math.min(width * 3, vb.w * scale));
      vb.h = Math.max(80, Math.min(height * 3, vb.h * scale));
      vb.x = mx - fx * vb.w; vb.y = my - fy * vb.h;
      applyVB();
    }, { passive: false });
    let drag = null;
    svg.addEventListener("pointerdown", (ev) => { drag = { x: ev.clientX, y: ev.clientY, vx: vb.x, vy: vb.y }; svg.setPointerCapture?.(ev.pointerId); });
    svg.addEventListener("pointermove", (ev) => {
      if (!drag) return;
      const rect = svg.getBoundingClientRect();
      vb.x = drag.vx - ((ev.clientX - drag.x) / rect.width) * vb.w;
      vb.y = drag.vy - ((ev.clientY - drag.y) / rect.height) * vb.h;
      applyVB();
    });
    svg.addEventListener("pointerup", () => { drag = null; });
    svg.addEventListener("dblclick", () => { Object.assign(vb, { x: 0, y: 0, w: width, h: height }); applyVB(); });
  }
  return svg;
}
