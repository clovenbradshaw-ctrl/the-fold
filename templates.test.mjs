// node --test templates.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  FORMS,
  PALETTE,
  TERRAINS,
  composite,
  coverage,
  edgeChips,
  emptyFrame,
  histogram,
  legend,
  negativeClaim,
  networkGraph,
  rankedNetwork,
  rawLayout,
  recordCard,
  savedView,
  taxonomy,
  terrainLegend,
  timeline,
  trace,
} from "./templates.js";

const every = () => [
  emptyFrame(["a", "b"]),
  recordCard({ n: 1 }, [{ label: "n", get: (r) => r.n }]),
  taxonomy([{ name: "x", n: 2 }]),
  rawLayout("some bytes", [{ start: 0, end: 4 }]),
  edgeChips([{ from: "a", to: "b", verb: "cites", ref: "f.txt#0-9" }]),
  networkGraph(["a", "b"], [{ from: "a", to: "b" }]),
  trace([1, 2, 3, 2]),
  savedView(taxonomy([{ name: "x", n: 2 }]), { claim: "x dominates" }),
  legend([{ name: "purple", means: "the material" }]),
  timeline([{ at: "2021-01-01", label: "x" }, { at: "2021-06-01", label: "y" }]),
  rankedNetwork(["a", "b"], [{ from: "a", to: "b" }], () => 1, { rankLabel: "x" }),
  negativeClaim("a", "relates to", "b", { scope: "1 passage" }),
  composite([networkGraph(["a"], []), legend([{ name: "x", means: "y" }])]),
];

test("the catalog is closed at nine, and every terrain names what it cannot see", () => {
  const keys = Object.keys(TERRAINS);
  assert.equal(keys.length, 9);
  const cells = new Set(Object.values(TERRAINS).map((t) => t.cell));
  assert.equal(cells.size, 9, "no two terrains occupy one cell");
  for (const t of Object.values(TERRAINS)) {
    assert.ok(t.blindTo.length > 3, `${t.terrain} must declare its blindness`);
    assert.ok(t.plain && t.plain !== t.terrain, `${t.terrain} needs a plain name — canon stays backstage`);
  }
});

test("every builder returns a segment carrying its terrain and its blindness", () => {
  for (const seg of every()) {
    assert.equal(seg.type, "code");
    assert.ok(["svg", "html"].includes(seg.lang));
    assert.ok(seg.terrain, "a surface without its terrain is unplaced");
    assert.ok(seg.blindTo, "a surface that cannot say what it misses invites being mistaken for the whole");
    assert.ok(seg.code.length > 0);
  }
});

test("all nine surfaces are reachable, and coverage names the ones that were not reached", () => {
  const all = coverage(every());
  assert.equal(all.missing.length, 0, `unreachable: ${all.missing.join(", ")}`);
  assert.equal(all.used.length, 9);
  const thin = coverage([recordCard({ n: 1 }, [{ label: "n", get: (r) => r.n }])]);
  assert.deepEqual(thin.used, ["record"]);
  assert.equal(thin.missing.length, 8);
  assert.ok(thin.missing.includes("trace"));
});

test("every form declares exactly one native terrain, and all nine are claimed by some form", () => {
  const claimed = new Set();
  for (const f of FORMS) {
    assert.ok(TERRAINS[f.native], `${f.form} names an unknown terrain`);
    assert.equal(typeof f.native, "string", "one native terrain per atom");
    claimed.add(f.native);
  }
  assert.equal(claimed.size, 9, "a terrain no familiar form reaches is a hole in the catalog");
});

test("a dated timeline is not a trace — the standard's own blindness decides it", () => {
  // Atmosphere is blind to fixed reference because it re-zeros; an absolute
  // time axis therefore cannot be its native home. This is the one mapping
  // most likely to be "corrected" by a future reader, so it is pinned.
  const timeline = FORMS.find((f) => f.form.includes("dated timeline"));
  assert.equal(timeline.native, "field");
  const spark = FORMS.find((f) => f.form.includes("sparkline"));
  assert.equal(spark.native, "atmosphere");
});

test("emptiness is a frame with a shape, never the words 'no results'", () => {
  const seg = emptyFrame(["month", "filings"], { title: "nothing matched", asked: "filings after 2030" });
  assert.equal(seg.terrain, "Void");
  assert.ok(seg.code.includes("month"), "the frame keeps the schema it would have filled");
  assert.ok(seg.code.includes("filings"));
  assert.ok(seg.code.includes("filings after 2030"));
  assert.ok(!/no results/i.test(seg.code));
});

test("every empty-input builder falls back to the frame — Void is a service, not a product", () => {
  for (const seg of [
    taxonomy([]),
    histogram([]),
    edgeChips([]),
    networkGraph([], []),
    trace([1]),
    savedView(null, { claim: "nothing under it" }),
  ]) {
    assert.equal(seg.terrain, "Void", "an empty surface must call the null, not draw a lie");
  }
});

test("figures come from the data's own bytes", () => {
  const seg = taxonomy([{ name: "White", n: 24108 }, { name: "Black", n: 13174 }], { title: "filings" });
  assert.ok(seg.code.includes(">24108<"));
  assert.ok(seg.code.includes(">13174<"));
  assert.ok(seg.code.includes("White"));
  assert.equal(seg.total, 37282);
});

test("a histogram bins mechanically and counts what it dropped", () => {
  const seg = histogram([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, "n/a"], { bins: 2 });
  assert.equal(seg.bins, 2);
  assert.equal(seg.dropped, 1);
  assert.equal(seg.total, 10, "every finite value lands in exactly one bin");
});

test("the raw layout marks spans in place without reading them", () => {
  const seg = rawLayout("Well, Prince, so Genoa and Lucca are now just family estates.", [
    { start: 17, end: 22, label: "place" },
  ]);
  assert.equal(seg.terrain, "Field");
  assert.ok(seg.code.includes("<mark title=\"place\">Genoa</mark>"));
  assert.equal(seg.chars, 61);
});

test("an unbound edge is drawn as unbound, never quietly asserted", () => {
  const seg = edgeChips([
    { from: "Pierre", to: "Hélène", verb: "married", ref: "wp.txt#10-40" },
    { from: "Pierre", to: "Dolokhov", verb: "married" },
  ]);
  assert.equal(seg.unbound, 1);
  assert.ok(seg.code.includes("never bound in the material"));
});

test("the graph layout is deterministic — the same data draws the same picture", () => {
  const a = networkGraph(["a", "b", "c"], [{ from: "a", to: "b" }]);
  const b = networkGraph(["a", "b", "c"], [{ from: "a", to: "b" }]);
  assert.equal(a.code, b.code, "a diff between two readings must be a diff in the data");
  assert.equal(a.nodes, 3);
});

test("the trace draws a moving baseline and its re-zeros", () => {
  const seg = trace([5, 7, 6, 9, 2, 3], { rezero: [4], baselineWindow: 3 });
  assert.equal(seg.terrain, "Atmosphere");
  assert.equal(seg.rezeros, 1);
  assert.ok(seg.code.includes("stroke-dasharray"), "the baseline and the re-zero are both drawn");
  assert.ok(seg.code.includes("baseline over 3"));
});

test("a saved view states the selection that produced it", () => {
  const inner = taxonomy([{ name: "x", n: 1 }]);
  const seg = savedView(inner, { claim: "x is the whole story", filter: "2020 only", source: "a.csv" });
  assert.equal(seg.terrain, "Lens");
  assert.ok(seg.code.includes("2020 only"), "a lens may not hide its own contingency");
  assert.ok(seg.code.includes("x is the whole story"));
  assert.equal(seg.over, "Kind");
  const bare = savedView(inner, { claim: "unfiltered" });
  assert.ok(bare.code.includes("selection: everything offered"));
});

test("a legend always names what it excludes", () => {
  const seg = legend([{ name: "purple", means: "the material" }]);
  assert.ok(seg.code.includes("excludes:"));
  assert.ok(/hiding one/.test(seg.code), "silence about exclusion is itself disclosed");
  const nine = terrainLegend();
  assert.equal(nine.entries, 9);
  assert.ok(nine.code.includes("blind to"));
});

test("every artifact carries its own three-state theme, not the page's variables", () => {
  // A sandboxed frame cannot read index.html's custom properties, so an
  // artifact that borrowed them would render invisible on its own.
  for (const seg of every()) {
    assert.ok(seg.code.includes("prefers-color-scheme"), "system dark must be honoured");
    assert.ok(seg.code.includes('[data-theme="dark"]'), "an explicit choice must win");
    assert.ok(seg.code.includes(PALETTE.light.accent) || seg.code.includes("var(--accent)"));
  }
});

test("markup in the data cannot become markup in the surface", () => {
  const evil = '<script>alert(1)</script>';
  const segs = [
    taxonomy([{ name: evil, n: 1 }]),
    recordCard({ x: evil }, [{ label: evil, get: (r) => r.x }]),
    rawLayout(evil),
    edgeChips([{ from: evil, to: "b", ref: "a#0-1" }]),
    networkGraph([evil], []),
    legend([{ name: evil, means: evil }]),
  ];
  for (const seg of segs) {
    assert.ok(!seg.code.includes("<script>"), `${seg.terrain} let markup through`);
    assert.ok(seg.code.includes("&lt;script&gt;"));
  }
});

// ── composites — every real screen is several of these at once ────────────

test("a composite declares its union rather than flattening into one atom", () => {
  const graph = networkGraph(["a", "b"], [{ from: "a", to: "b" }]);
  const note = legend([{ name: "x", means: "y" }]);
  const seg = composite([graph, note], { title: "a graph plus its legend" });
  assert.equal(seg.terrain, "Network", "the head declares the native terrain");
  assert.deepEqual(seg.union, ["Network", "Paradigm"]);
  assert.ok(seg.code.includes("Network"));
  assert.ok(seg.code.includes("Paradigm"));
  assert.ok(seg.code.includes("native"), "the head part is marked native, the rest are not");
});

test("an empty composite is the empty frame, not a blank union", () => {
  const seg = composite([], { title: "nothing to stand on" });
  assert.equal(seg.terrain, "Void");
});

test("composite() drops falsy parts rather than choking on them", () => {
  const graph = networkGraph(["a"], []);
  const seg = composite([null, graph, undefined]);
  assert.equal(seg.terrain, "Network");
  assert.deepEqual(seg.union, ["Network"]);
});

// ── Field · timeline — the FORMS entry, now built ──────────────────────────

test("a timeline is Field, never Atmosphere — FORMS's own counter-intuitive call", () => {
  const seg = timeline([
    { at: "2020-04-01", label: "filings collapse" },
    { at: "2020-01-01", label: "baseline" },
  ]);
  assert.equal(seg.terrain, "Field");
  assert.equal(seg.blindTo, TERRAINS.field.blindTo);
  assert.equal(seg.events, 2);
  // Sorted by date regardless of input order.
  const firstLabelIdx = seg.code.indexOf("baseline");
  const secondLabelIdx = seg.code.indexOf("filings collapse");
  assert.ok(firstLabelIdx < secondLabelIdx);
});

test("a timeline drops entries with an unparseable date, and empties to Void", () => {
  const seg = timeline([{ at: "not a date", label: "x" }]);
  assert.equal(seg.terrain, "Void");
  const withOne = timeline([{ at: "not a date", label: "x" }, { at: "2021-01-01", label: "y" }]);
  assert.equal(withOne.events, 1);
});

// ── Network ⊗ Lens — a chosen ranking must say so ──────────────────────────

test("a ranked network is a declared composite, never a bare Network", () => {
  const seg = rankedNetwork(["a", "b", "c"], [{ from: "a", to: "b" }], (n) => (n.id === "a" ? 100 : 1), {
    rankLabel: "revenue",
  });
  assert.equal(seg.terrain, "Network", "the graph is still the native surface");
  assert.deepEqual(seg.union, ["Network", "Lens"]);
  assert.ok(seg.code.includes("revenue"), "the ranking's own name is stated, not hidden");
  assert.ok(seg.code.includes("exogenous"));
});

test("an empty ranked network is the empty frame", () => {
  const seg = rankedNetwork([], [], () => 1);
  assert.equal(seg.terrain, "Void");
});

// ── Lens over Void — a negative that must say its own scope ───────────────

test("a negative claim is Lens over Void, and refuses a silent scope", () => {
  const scoped = negativeClaim("Pierre", "married", "Dolokhov", { scope: "2 passages, verb vocabulary of 14" });
  assert.equal(scoped.terrain, "Lens");
  assert.equal(scoped.scopeDeclared, true);
  assert.ok(scoped.code.includes("searched: 2 passages"));

  const bare = negativeClaim("Pierre", "married", "Dolokhov");
  assert.equal(bare.scopeDeclared, false);
  assert.ok(bare.code.includes("no scope declared"), "an undeclared scope is drawn as a visible gap, not hidden");
});

test("a negative claim's terms cannot inject markup", () => {
  const seg = negativeClaim('<script>x</script>', "y", "z");
  assert.ok(!seg.code.includes("<script>"));
  assert.ok(seg.code.includes("&lt;script&gt;"));
});
