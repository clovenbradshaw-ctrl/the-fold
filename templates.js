// templates.js — the nine ways to show data, and the familiar forms that are
// instances of them.
//
// eoreader6's `12-nine-terrains-as-representation-standard.md` (RATIFIED
// 2026-08-14) makes a claim this module takes literally: every representation
// has ONE native terrain — the Site-face cell its structure is built to hold —
// and the catalog is closed at nine. A spreadsheet, a graph, a legend and an
// EKG strip are not four UI choices; they are four terrains wearing pixels.
// Real surfaces are composites; the atoms are nine.
//
// So this is not a chart library with a taxonomy bolted on. Each builder below
// IS one terrain, named for what it shows rather than for the canon (the
// standing UI rule: EO stays backstage — plain names front, the grid lives in
// the legend, which is itself the Paradigm template). What each surface is
// BLIND to travels with it, because the standard carries that column and a
// reader switching surfaces deserves to know what the new one cannot see.
//
// Every builder is mechanical: rows in, markup out, no model call, no figure
// typed by anything but the data's own bytes — the same discipline as
// artifact.js's `tableFrom`/`chartFrom`, which are two of these nine wearing
// their common names. Output is an artifact.js segment, so everything here
// rides publishBuild, toDocument's no-network wall, and the fold log unchanged.
//
// Pure: no DOM, no IO, no model.

import { MONO, PALETTE, esc, themeCss } from "./artifact.js";

export { PALETTE, esc };

export const TERRAINS = Object.freeze({
  void: { terrain: "Void", cell: "Existence · Ground", plain: "empty frame", blindTo: "everything particular" },
  entity: { terrain: "Entity", cell: "Existence · Figure", plain: "record", blindTo: "relation & type" },
  kind: { terrain: "Kind", cell: "Existence · Pattern", plain: "taxonomy", blindTo: "the individual" },
  field: { terrain: "Field", cell: "Structure · Ground", plain: "raw layout", blindTo: "named relations" },
  link: { terrain: "Link", cell: "Structure · Figure", plain: "cross-reference", blindTo: "the whole" },
  network: { terrain: "Network", cell: "Structure · Pattern", plain: "graph", blindTo: "the moment & individual salience" },
  atmosphere: { terrain: "Atmosphere", cell: "Significance · Ground", plain: "trace", blindTo: "fixed reference (it re-zeros)" },
  lens: { terrain: "Lens", cell: "Significance · Figure", plain: "saved view", blindTo: "its own contingency" },
  paradigm: { terrain: "Paradigm", cell: "Significance · Pattern", plain: "legend", blindTo: "what it excludes" },
});

/**
 * The familiar forms, each declared onto its ONE native terrain (§4's first
 * corollary: one native terrain per atom; composites declare the union).
 * Two entries here are deliberately counter-intuitive and worth the argument:
 * a dated timeline is NOT Atmosphere — Atmosphere is blind to fixed reference
 * because it re-zeros, so an absolute-time axis makes it a Field with Entity
 * marks; and a bar chart of categories is Kind, becoming a Lens only when it
 * is drawn to make an argument (a title that asserts, a filter that selects).
 */
export const FORMS = Object.freeze([
  { form: "empty state / schema with no rows", native: "void" },
  { form: "detail card, log line, form response", native: "entity" },
  { form: "table (a stack of records)", native: "entity", composite: "kind (its header is a schema)" },
  { form: "histogram, facet list, category tree, dendrogram", native: "kind" },
  { form: "bar chart of categories", native: "kind", note: "becomes a saved view when the title asserts something" },
  { form: "document viewer, page scan, hex dump, map tile", native: "field" },
  { form: "dated timeline", native: "field", note: "NOT a trace: a fixed reference is what a trace is blind to" },
  { form: "citation, hyperlink, foreign key, related-to chip", native: "link" },
  { form: "node-link graph, sankey, chord, adjacency matrix", native: "network" },
  { form: "sparkline, EKG strip, ticker, running feed", native: "atmosphere" },
  { form: "dashboard panel, pinned report, annotated figure", native: "lens" },
  { form: "legend, style guide, controlled vocabulary, a constitution", native: "paradigm" },
]);

/** Every segment leaves here the same shape, carrying its own provenance. */
function segment(kind, code, extra = {}) {
  const t = TERRAINS[kind];
  return {
    type: "code",
    lang: extra.lang ?? "svg",
    code,
    terrain: t.terrain,
    cell: t.cell,
    plain: t.plain,
    blindTo: t.blindTo,
    ...extra,
  };
}

const W = 720;

function svgOpen(h, title, css = "") {
  return (
    `<svg viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" xmlns="http://www.w3.org/2000/svg" ` +
    `role="img" aria-label="${esc(title)}">` +
    `<style>${themeCss(css)}</style>` +
    `<rect width="${W}" height="${h}" fill="var(--bg)"/>`
  );
}

function heading(text, y = 24) {
  return `<text x="${W / 2}" y="${y}" text-anchor="middle" font-size="15" font-weight="600" fill="var(--ink)">${esc(text)}</text>`;
}

// ── 1 · Void — the empty frame ──────────────────────────────────────────────
/**
 * The schema with no rows: the frame a result WOULD have filled. Most apps
 * answer an empty result with the words "no results", which throws away the
 * one thing the reader needs — the shape of what was looked for. Void is a
 * service, not a product (the standard's own build law): every other terrain
 * calls it fresh when its data is empty.
 */
export function emptyFrame(columns = [], { title = "nothing here yet", asked = "" } = {}) {
  const h = 220;
  const cols = columns.length ? columns : ["(no columns declared)"];
  const slot = (W - 80) / cols.length;
  const heads = cols
    .map((c, i) => {
      const x = 40 + i * slot + slot / 2;
      return (
        `<text x="${x.toFixed(1)}" y="86" text-anchor="middle" font-size="12" fill="var(--muted)" ` +
        `font-family="${MONO}">${esc(c)}</text>` +
        `<line x1="${(40 + i * slot).toFixed(1)}" y1="96" x2="${(40 + (i + 1) * slot - 8).toFixed(1)}" y2="96" stroke="var(--line)"/>`
      );
    })
    .join("");
  // Three ghost rows: the frame says how tall a row is, not that rows exist.
  const ghosts = [0, 1, 2]
    .map((r) =>
      cols
        .map((_, i) => {
          const x = 40 + i * slot + 8;
          return `<rect x="${x.toFixed(1)}" y="${112 + r * 26}" width="${(slot - 24).toFixed(1)}" height="9" rx="4.5" fill="var(--line)" opacity="${0.5 - r * 0.14}"/>`;
        })
        .join(""),
    )
    .join("");
  return segment(
    "void",
    svgOpen(h, title) +
      heading(title) +
      (asked ? `<text x="${W / 2}" y="46" text-anchor="middle" font-size="11.5" fill="var(--muted)">${esc(asked)}</text>` : "") +
      heads +
      ghosts +
      `<text x="${W / 2}" y="200" text-anchor="middle" font-size="11.5" fill="var(--muted)">the frame is real; no row cleared the null</text>` +
      `</svg>`,
    { columns: cols.length },
  );
}

// ── 2 · Entity — the record ─────────────────────────────────────────────────
/**
 * One individuated thing, with its fields and its address. An Entity is born
 * from recurring consequence, never from appearance (build law) — so the
 * address is not decoration here, it is the evidence the record exists in
 * some bytes rather than in a summary of them.
 */
export function recordCard(item, fields, { title = "", address = "" } = {}) {
  const rows = fields
    .map((f) => {
      const v = f.get(item);
      return (
        `<div class="row"><span class="k">${esc(f.label)}</span>` +
        `<span class="v">${v == null || v === "" ? '<span class="empty">—</span>' : esc(v)}</span></div>`
      );
    })
    .join("");
  const code =
    `<style>${themeCss()}` +
    `body{margin:0;font-family:var(--sans);background:var(--bg);color:var(--ink)}` +
    `.card{border:1px solid var(--line);border-radius:12px;padding:16px 18px;background:var(--panel);max-width:${W}px}` +
    `.title{font-weight:650;font-size:15px;margin:0 0 2px}` +
    `.addr{font-family:var(--mono);font-size:11px;color:var(--accent);margin-bottom:12px}` +
    `.row{display:grid;grid-template-columns:minmax(90px,28%) 1fr;gap:12px;padding:6px 0;border-top:1px solid var(--line)}` +
    `.row:first-of-type{border-top:0}` +
    `.k{font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);padding-top:2px}` +
    `.v{font-size:13.5px}` +
    `.empty{color:var(--muted)}` +
    `</style>` +
    `<div class="card">${title ? `<p class="title">${esc(title)}</p>` : ""}` +
    `${address ? `<div class="addr">${esc(address)}</div>` : ""}${rows}</div>`;
  return segment("entity", code, { lang: "html", fields: fields.length });
}

// ── 3 · Kind — the taxonomy ─────────────────────────────────────────────────
/**
 * Categories with their counts: the legend/facet/histogram family. Kind
 * clusters over relation terms with height DISCOVERED, not assigned — so
 * this builder never invents a grouping; it draws groups it was handed and
 * states how many members each holds.
 */
export function taxonomy(groups, { title = "taxonomy", label = "group", of = "" } = {}) {
  const rows = [...groups].map((g) => ({ name: String(g.name ?? ""), n: Number(g.n) || 0 }));
  if (!rows.length) return emptyFrame([label, "count"], { title });
  const total = rows.reduce((s, r) => s + r.n, 0);
  const max = Math.max(...rows.map((r) => r.n), 1);
  const h = 60 + rows.length * 30 + 24;
  const bars = rows
    .map((r, i) => {
      const y = 60 + i * 30;
      const w = (r.n / max) * (W - 260);
      return (
        `<text x="24" y="${y + 14}" font-size="12.5" fill="var(--ink)">${esc(r.name)}</text>` +
        `<rect x="200" y="${y + 3}" width="${w.toFixed(1)}" height="14" rx="3" fill="var(--accent)" opacity="0.85"/>` +
        `<text x="${(206 + w).toFixed(1)}" y="${y + 14}" font-size="11.5" fill="var(--muted)" font-family="${MONO}">${r.n}</text>`
      );
    })
    .join("");
  return segment(
    "kind",
    svgOpen(h, title) +
      heading(title) +
      `<text x="${W / 2}" y="44" text-anchor="middle" font-size="11.5" fill="var(--muted)">${rows.length} ${esc(label)}(s) over ${total} ${esc(of || "member")}(s)</text>` +
      bars +
      `</svg>`,
    { groups: rows.length, total },
  );
}

/** Histogram — Kind's other face: bins are discovered categories over a
 *  continuum. Bin count is the caller's declaration, stated on the segment. */
export function histogram(values, { bins = 10, title = "distribution" } = {}) {
  const nums = [...values].map(Number).filter(Number.isFinite);
  if (!nums.length) return emptyFrame(["bin", "count"], { title });
  const lo = Math.min(...nums), hi = Math.max(...nums);
  const span = hi - lo || 1;
  const counts = new Array(bins).fill(0);
  for (const v of nums) counts[Math.min(bins - 1, Math.floor(((v - lo) / span) * bins))]++;
  const groups = counts.map((n, i) => ({
    name: `${(lo + (span / bins) * i).toFixed(1)}–${(lo + (span / bins) * (i + 1)).toFixed(1)}`,
    n,
  }));
  const seg = taxonomy(groups, { title, label: "bin", of: "value" });
  return { ...seg, bins, dropped: [...values].length - nums.length };
}

// ── 4 · Field — the raw layout ──────────────────────────────────────────────
/**
 * Byte-contiguity reassembly with zero statistics — the one terrain
 * representable with no inference at all (build law). This is the material
 * shown as itself, with addressed spans marked in place. Nothing here reads
 * the text; it only slices it at offsets it was given.
 */
export function rawLayout(text, marks = [], { title = "the bytes themselves", name = "" } = {}) {
  const src = String(text ?? "");
  const ordered = [...marks].filter((m) => m.start < m.end).sort((a, b) => a.start - b.start);
  let out = "";
  let at = 0;
  for (const m of ordered) {
    if (m.start > at) out += esc(src.slice(at, m.start));
    out += `<mark title="${esc(m.label ?? `${m.start}-${m.end}`)}">${esc(src.slice(m.start, m.end))}</mark>`;
    at = Math.max(at, m.end);
  }
  out += esc(src.slice(at));
  const code =
    `<style>${themeCss()}` +
    `body{margin:0;font-family:var(--sans);background:var(--bg);color:var(--ink)}` +
    `.wrap{border:1px solid var(--line);border-radius:12px;background:var(--panel);overflow:hidden}` +
    `.bar{display:flex;justify-content:space-between;gap:12px;padding:8px 12px;border-bottom:1px solid var(--line);font-size:11px;color:var(--muted);font-family:var(--mono)}` +
    `pre{margin:0;padding:14px 16px;white-space:pre-wrap;word-break:break-word;font-family:var(--mono);font-size:12.5px;line-height:1.55}` +
    `mark{background:var(--accent-soft);color:var(--accent);border-radius:3px}` +
    `</style>` +
    `<div class="wrap"><div class="bar"><span>${esc(name || title)}</span>` +
    `<span>${src.length} chars · ${ordered.length} marked</span></div><pre>${out}</pre></div>`;
  return segment("field", code, { lang: "html", chars: src.length, marks: ordered.length });
}

// ── 5 · Link — the edge ─────────────────────────────────────────────────────
/**
 * One relation, drawn as one thing: subject, verb, object, and the address
 * that binds it. A Link needs its endpoint Entities to exist first (§3's
 * Type B), so an edge whose endpoints are unnamed is drawn as unbound rather
 * than quietly asserted.
 */
export function edgeChips(edges, { title = "what binds to what" } = {}) {
  const rows = [...edges];
  if (!rows.length) return emptyFrame(["from", "relation", "to"], { title });
  const items = rows
    .map((e) => {
      const bound = e.ref ? "bound" : "unbound";
      return (
        `<div class="edge ${bound}">` +
        `<span class="end">${esc(e.from)}</span>` +
        `<span class="verb">${esc(e.verb ?? "relates to")}</span>` +
        `<span class="end">${esc(e.to)}</span>` +
        (e.ref ? `<span class="ref">${esc(e.ref)}</span>` : `<span class="ref none">never bound in the material</span>`) +
        `</div>`
      );
    })
    .join("");
  const code =
    `<style>${themeCss()}` +
    `body{margin:0;font-family:var(--sans);background:var(--bg);color:var(--ink)}` +
    `.edge{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:9px 12px;border:1px solid var(--line);border-radius:999px;margin:0 0 8px;background:var(--panel)}` +
    `.end{font-weight:600;font-size:13px}` +
    `.verb{font-size:12px;color:var(--muted);font-style:italic}` +
    `.ref{margin-left:auto;font-family:var(--mono);font-size:10.5px;color:var(--accent)}` +
    `.ref.none{color:var(--warn)}` +
    `.unbound{border-style:dashed;border-color:var(--warn)}` +
    `</style>${items}`;
  return segment("link", code, {
    lang: "html",
    edges: rows.length,
    unbound: rows.filter((e) => !e.ref).length,
  });
}

// ── 6 · Network — the node-link graph ───────────────────────────────────────
/**
 * The whole shape at once. Layout is deterministic by construction — nodes
 * ride a circle in the order given, so the same data always draws the same
 * picture and a diff between two readings is a diff in the DATA, never in a
 * random seed. Network is a decaying belief graph (it forgets), which is why
 * an edge may carry a weight and why the caption says what the cursor is.
 */
export function networkGraph(nodes, edges, { title = "the graph", asOf = "" } = {}) {
  const ns = [...nodes].map((n) => (typeof n === "string" ? { id: n } : n));
  if (!ns.length) return emptyFrame(["node", "edges"], { title });
  const h = 460;
  const cx = W / 2, cy = 250, R = 165;
  const at = new Map();
  ns.forEach((n, i) => {
    const a = (i / ns.length) * Math.PI * 2 - Math.PI / 2;
    at.set(n.id, { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), a });
  });
  const lines = [...edges]
    .filter((e) => at.has(e.from) && at.has(e.to))
    .map((e) => {
      const a = at.get(e.from), b = at.get(e.to);
      const w = Number.isFinite(Number(e.weight)) ? Math.max(0.6, Math.min(4, Number(e.weight))) : 1.2;
      // Curved toward the centre: straight chords over a circle collapse into
      // an unreadable star at any real edge count.
      return `<path d="M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${cx} ${cy} ${b.x.toFixed(1)} ${b.y.toFixed(1)}" fill="none" stroke="var(--accent)" stroke-width="${w}" opacity="0.32"/>`;
    })
    .join("");
  const dots = ns
    .map((n) => {
      const p = at.get(n.id);
      const deg = [...edges].filter((e) => e.from === n.id || e.to === n.id).length;
      const r = 4 + Math.min(7, deg);
      const flip = Math.cos(p.a) < 0;
      const lx = p.x + Math.cos(p.a) * (r + 7);
      const ly = p.y + Math.sin(p.a) * (r + 7);
      return (
        `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" fill="var(--accent)"/>` +
        `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="${flip ? "end" : "start"}" font-size="11.5" fill="var(--ink)">${esc(n.id)}</text>`
      );
    })
    .join("");
  return segment(
    "network",
    svgOpen(h, title) +
      heading(title) +
      (asOf ? `<text x="${W / 2}" y="46" text-anchor="middle" font-size="11.5" fill="var(--muted)">belief as of ${esc(asOf)}</text>` : "") +
      lines +
      dots +
      `</svg>`,
    { nodes: ns.length, edges: [...edges].length },
  );
}

// ── 7 · Atmosphere — the trace ──────────────────────────────────────────────
/**
 * The span between two re-zero events. A trace has no fixed reference — that
 * is precisely what it is blind to — so this builder draws a moving baseline
 * and marks each re-zero, rather than pretending to an absolute axis. A
 * series with real dates belongs in a Field, and FORMS says so.
 */
export function trace(values, { title = "the trace", rezero = [], baselineWindow = 5 } = {}) {
  const ys = [...values].map(Number).filter(Number.isFinite);
  if (ys.length < 2) return emptyFrame(["t", "value"], { title });
  const h = 260, padX = 28, padTop = 56, plotH = h - padTop - 40;
  const lo = Math.min(...ys), hi = Math.max(...ys), span = hi - lo || 1;
  const x = (i) => padX + (i / (ys.length - 1)) * (W - padX * 2);
  const y = (v) => padTop + plotH - ((v - lo) / span) * plotH;
  const line = ys.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  // The moving baseline: a trailing mean, which is the thing a fixed axis
  // cannot show and the reason this terrain exists.
  const base = ys.map((_, i) => {
    const from = Math.max(0, i - baselineWindow + 1);
    const w = ys.slice(from, i + 1);
    return w.reduce((s, v) => s + v, 0) / w.length;
  });
  const baseLine = base.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const marks = [...rezero]
    .filter((i) => i >= 0 && i < ys.length)
    .map(
      (i) =>
        `<line x1="${x(i).toFixed(1)}" y1="${padTop}" x2="${x(i).toFixed(1)}" y2="${padTop + plotH}" stroke="var(--warn)" stroke-dasharray="3 3" opacity="0.75"/>`,
    )
    .join("");
  return segment(
    "atmosphere",
    svgOpen(h, title) +
      heading(title) +
      `<text x="${W / 2}" y="44" text-anchor="middle" font-size="11.5" fill="var(--muted)">${ys.length} arrivals · baseline over ${baselineWindow} · ${[...rezero].length} re-zero(s)</text>` +
      marks +
      `<path d="${baseLine}" fill="none" stroke="var(--muted)" stroke-width="1" stroke-dasharray="4 4"/>` +
      `<path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2"/>` +
      `</svg>`,
    { points: ys.length, rezeros: [...rezero].length },
  );
}

// ── 8 · Lens — the saved view ───────────────────────────────────────────────
/**
 * A chart made into an argument: the figure plus the selection that produced
 * it and the claim it is offered for. A Lens is blind to its own contingency,
 * so this builder REFUSES to hide the filter — the whole point is that the
 * view is a choice, shown next to what it chose. A Lens with nothing under it
 * is a Lens over Void (§4), so an empty inner segment yields the empty frame.
 */
export function savedView(inner, { claim = "", filter = "", source = "" } = {}) {
  if (!inner || !inner.code) return emptyFrame(["view"], { title: claim || "a view of nothing" });
  const isSvg = (inner.lang ?? "svg") === "svg";
  const body = isSvg
    ? `<div class="fig">${inner.code}</div>`
    : `<div class="fig">${inner.code}</div>`;
  const code =
    `<style>${themeCss()}` +
    `body{margin:0;font-family:var(--sans);background:var(--bg);color:var(--ink)}` +
    `.lens{border:1px solid var(--line);border-radius:12px;background:var(--panel);overflow:hidden}` +
    `.claim{padding:12px 16px 6px;font-size:14.5px;font-weight:650}` +
    `.meta{padding:0 16px 10px;font-size:11.5px;color:var(--muted);font-family:var(--mono)}` +
    `.fig{padding:4px 8px 10px}.fig svg{max-width:100%;height:auto;display:block;margin:0 auto}` +
    `.foot{padding:8px 16px;border-top:1px solid var(--line);font-size:11px;color:var(--muted)}` +
    `</style>` +
    `<div class="lens">` +
    (claim ? `<p class="claim">${esc(claim)}</p>` : "") +
    `<div class="meta">${filter ? `selection: ${esc(filter)}` : "selection: everything offered"}${source ? ` · ${esc(source)}` : ""}</div>` +
    body +
    `<div class="foot">a view is a choice — this one is blind to its own contingency</div></div>`;
  return segment("lens", code, { lang: "html", over: inner.terrain ?? null });
}

// ── 9 · Paradigm — the legend ───────────────────────────────────────────────
/**
 * The governing frame itself: legend, controlled vocabulary, style guide, a
 * constitution. Paradigm is blind to what it excludes, which is why this
 * builder always renders the exclusion line rather than leaving the frame
 * looking total. This is also where the canon lives: EO never fronts a
 * surface, but a reader who wants the grid can find it here.
 */
export function legend(entries, { title = "legend", excludes = "" } = {}) {
  const rows = [...entries]
    .map(
      (e) =>
        `<div class="row"><span class="swatch" style="background:${esc(e.color ?? "var(--accent)")}"></span>` +
        `<span class="name">${esc(e.name)}</span><span class="what">${esc(e.means ?? "")}</span></div>`,
    )
    .join("");
  const code =
    `<style>${themeCss()}` +
    `body{margin:0;font-family:var(--sans);background:var(--bg);color:var(--ink)}` +
    `.frame{border:1px solid var(--line);border-radius:12px;background:var(--panel);padding:14px 16px}` +
    `h3{margin:0 0 10px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}` +
    `.row{display:flex;align-items:baseline;gap:10px;padding:5px 0}` +
    `.swatch{width:11px;height:11px;border-radius:3px;flex:none;transform:translateY(1px)}` +
    `.name{font-weight:600;font-size:13px;min-width:120px}` +
    `.what{font-size:12.5px;color:var(--muted)}` +
    `.ex{margin-top:10px;padding-top:9px;border-top:1px solid var(--line);font-size:11.5px;color:var(--warn)}` +
    `</style>` +
    `<div class="frame"><h3>${esc(title)}</h3>${rows}` +
    `<div class="ex">excludes: ${esc(excludes || "nothing stated — a frame that names no exclusion is hiding one")}</div></div>`;
  return segment("paradigm", code, { lang: "html", entries: [...entries].length });
}

/** The nine, as their own legend — the canon, backstage, on request. */
export function terrainLegend() {
  return legend(
    Object.values(TERRAINS).map((t) => ({ name: t.plain, means: `${t.cell} · blind to ${t.blindTo}` })),
    { title: "the nine surfaces", excludes: "composites — every real screen is several of these at once" },
  );
}

/** Which surfaces a set of built segments used, and which nine were never
 *  reached. A dashboard that only ever draws records and charts is a reading
 *  with whole domains missing, and this is how that becomes visible. */
export function coverage(segments) {
  const used = new Set([...segments].filter(Boolean).map((s) => s.terrain));
  const all = Object.values(TERRAINS);
  return {
    used: all.filter((t) => used.has(t.terrain)).map((t) => t.plain),
    missing: all.filter((t) => !used.has(t.terrain)).map((t) => t.plain),
  };
}
