// thea.test.mjs — SYN arranger: Figure writes one part from its own passages,
// Pattern weaves checked parts into a whole. Gaps stay disclosed; the swarm's
// jobs (CON/SEG/REC) and Ground framing are refused, never absorbed.
import test from "node:test";
import assert from "node:assert/strict";
import {
  composeFigure, composePattern, refuseSwarm, composeGround, tryInvents,
  MUSES, museOrder, museHead, museGap, museTransit, museFlow,
  museBridge, museWithhold, museCover, museAssemble, TRANSIT_FALLBACK,
  museKnit, museArc, museShapeOrder, museUnity, eotOf, MUSE_GRAIN,
  CELL_FIGURE, CELL_PATTERN, CELL_GROUND, THEA_REFUSALS,
} from "./thea.js";

const P = [
  { ref: "lincoln.txt#0-40", text: "Lincoln appointed Hamlin his vice president in 1860." },
  { ref: "almanac.txt#0-30", text: "Hamlin chaired the Senate before the vice presidency." },
];

test("cells: SYN Structure Generate — Link/Making, Network/Composing, Field/Cultivating-unbuilt", () => {
  assert.equal(`${CELL_FIGURE.op}·${CELL_FIGURE.grain}`, "SYN·Figure");
  assert.equal(CELL_FIGURE.terrain, "Link");
  assert.equal(CELL_FIGURE.stance, "Making");
  assert.equal(`${CELL_PATTERN.op}·${CELL_PATTERN.grain}`, "SYN·Pattern");
  assert.equal(CELL_PATTERN.terrain, "Network");
  assert.equal(CELL_PATTERN.stance, "Composing");
  assert.equal(CELL_GROUND.built, false);
});

test("figure: a backed line lands, an unbacked line becomes a named gap, needs ride along", () => {
  const r = composeFigure({
    part: "the vice presidency",
    passages: P,
    lines: [
      { text: "Lincoln appointed Hamlin vice president.", backs: ["lincoln.txt#0-40"] },
      { text: "Hamlin invented the telegraph.", backs: ["almanac.txt#0-30"] },
    ],
    needs: [{ name: "term_dates", detail: "passages give no term dates for Hamlin" }],
  });
  assert.equal(r.sentences.length, 1);
  assert.match(r.text, /Lincoln appointed Hamlin/);
  assert.doesNotMatch(r.text, /telegraph/);
  const names = r.gaps.map((g) => g.name);
  assert.ok(names.includes(THEA_REFUSALS.UNSUPPORTED_LINE));
  assert.ok(names.includes("term_dates"));
});

test("figure: a back ref naming no handed passage is its own gap, not a silent drop", () => {
  const r = composeFigure({
    passages: P,
    lines: [{ text: "Lincoln appointed Hamlin.", backs: ["elsewhere.txt#0-9"] }],
  });
  assert.equal(r.sentences.length, 0);
  assert.equal(r.gaps[0].name, THEA_REFUSALS.UNKNOWN_BACK_REF);
});

test("figure: no passages is a refusal carrying the declared needs", () => {
  const r = composeFigure({ passages: [], lines: [], needs: [{ name: "n", detail: "d" }] });
  assert.equal(r.refused.type, THEA_REFUSALS.NO_PASSAGES);
  assert.equal(r.gaps.length, 1);
});

test("pattern: weaves handed parts under headings, keeps every gap, adds no claim", () => {
  const a = composeFigure({
    part: "a", passages: P,
    lines: [{ text: "Lincoln appointed Hamlin vice president.", backs: ["lincoln.txt#0-40"] }],
    needs: [{ name: "term_dates", detail: "no dates handed" }],
  });
  const b = composeFigure({
    part: "b", passages: P,
    lines: [{ text: "Hamlin chaired the Senate.", backs: ["almanac.txt#0-30"] }],
  });
  const w = composePattern({
    parts: [
      { id: "a", heading: "Appointment", text: a.text, gaps: a.gaps },
      { id: "b", heading: "Before", text: b.text, gaps: b.gaps },
    ],
  });
  assert.match(w.text, /## Appointment/);
  assert.match(w.text, /## Before/);
  assert.match(w.text, /Lincoln appointed Hamlin/);
  assert.match(w.text, /Hamlin chaired the Senate/);
  assert.match(w.text, /term_dates/);
  assert.ok(!w.text.includes("telegraph"));
  assert.equal(w.gaps.length, 1);
  assert.equal(w.gaps[0].part, "a");
});

test("pattern: declared order resolves sequence without touching claims or gaps", () => {
  const mk = (id, text) => ({ id, heading: id, text, gaps: [] });
  const w = composePattern({ parts: [mk("a", "Alpha holds."), mk("b", "Beta holds.")], order: ["b", "a"] });
  assert.ok(w.text.indexOf("Beta holds.") < w.text.indexOf("Alpha holds."));
  assert.equal(w.orderNote, "declared order: b, a");
});

test("pattern: no parts is a refusal, never an empty whole presented as one", () => {
  const w = composePattern({ parts: [] });
  assert.equal(w.refused.type, THEA_REFUSALS.NO_PARTS);
});

test("swarm jobs refused with the owner named: keep (CON), split (SEG), reground (REC)", () => {
  assert.match(refuseSwarm("keep").owner, /CON/);
  assert.match(refuseSwarm("split").owner, /SEG/);
  assert.match(refuseSwarm("reground").owner, /REC/);
});

test("ground framing is a new-kind refusal declaring what was given, never a free frame", () => {
  const r = composeGround({ question: "what holds this together?" });
  assert.equal(r.refused.type, THEA_REFUSALS.GROUND_UNBUILT);
  assert.equal(r.refused.given.question, "what holds this together?");
  assert.equal(r.text, "");
});

const CLEAR = () => [];
const CYCLE = () => [{ kind: "cycle" }];

test("invention without logos is a gap, never prose — both grains", () => {
  const f = composeFigure({
    passages: P,
    lines: [{ text: "Lincoln appointed Hamlin vice president.", backs: ["lincoln.txt#0-40"] }],
    invents: [{ text: "The two men trusted each other.", edges: [{ end1: "two men", label: "trusted", end2: "each other" }], restsOn: ["lincoln.txt#0-40"] }],
  });
  assert.equal(f.invented.length, 0);
  assert.ok(f.gaps.some((g) => g.name === THEA_REFUSALS.NO_LOGOS));
  assert.doesNotMatch(f.text, /trusted each other/);
  const w = composePattern({
    parts: [{ id: "a", heading: "A", text: "Alpha holds.", gaps: [] }],
    invents: [{ text: "So the ticket was balanced.", edges: [{ end1: "ticket", label: "was", end2: "balanced" }], restsOn: ["a"] }],
  });
  assert.equal(w.invented.length, 0);
  assert.ok(w.gaps.some((g) => g.name === THEA_REFUSALS.NO_LOGOS));
});

test("logos-clear invention lands marked invented; a cycle is a LOGOS_REFUSAL gap", () => {
  const f = composeFigure({
    passages: P,
    lines: [{ text: "Lincoln appointed Hamlin vice president.", backs: ["lincoln.txt#0-40"] }],
    invents: [{ text: "The ticket paired Illinois with Maine.", edges: [{ end1: "ticket", label: "paired", end2: "Illinois Maine" }], restsOn: ["lincoln.txt#0-40"] }],
    soundCheck: CLEAR,
  });
  assert.equal(f.invented.length, 1);
  assert.equal(f.invented[0].standpoint, "arranger");
  assert.match(f.text, /\[invented — arranger — logos-clear\]/);
  const bad = composeFigure({
    passages: P,
    lines: [{ text: "Lincoln appointed Hamlin vice president.", backs: ["lincoln.txt#0-40"] }],
    invents: [{ text: "Hamlin never held the vice presidency.", edges: [{ end1: "Hamlin", label: "never held", end2: "vice presidency" }], restsOn: ["lincoln.txt#0-40"] }],
    soundCheck: CYCLE,
  });
  assert.equal(bad.invented.length, 0);
  assert.ok(bad.gaps.some((g) => g.name === THEA_REFUSALS.LOGOS_REFUSAL));
  assert.doesNotMatch(bad.text, /never held/);
});

test("invention stating what its edges never declare is an UNDECLARED_CONTENT gap — even under a clear checker", () => {
  const r = composeFigure({
    passages: P,
    lines: [{ text: "Lincoln appointed Hamlin vice president.", backs: ["lincoln.txt#0-40"] }],
    invents: [{ text: "Hamlin never held the vice presidency.", edges: [] }],
    soundCheck: CLEAR,
  });
  assert.equal(r.invented.length, 0);
  assert.ok(r.gaps.some((g) => g.name === THEA_REFUSALS.UNDECLARED_CONTENT));
  assert.doesNotMatch(r.text, /never held/);
});

test("a failing checker fails closed: LOGOS_ERROR gap, nothing lands", () => {
  const r = composeFigure({
    passages: P,
    lines: [{ text: "Lincoln appointed Hamlin vice president.", backs: ["lincoln.txt#0-40"] }],
    invents: [{ text: "Anything at all.", edges: [{ end1: "anything", label: "stands", end2: "all" }], restsOn: ["lincoln.txt#0-40"] }],
    soundCheck: () => { throw new Error("down"); },
  });
  assert.equal(r.invented.length, 0);
  assert.ok(r.gaps.some((g) => g.name === THEA_REFUSALS.LOGOS_ERROR));
  assert.doesNotMatch(r.text, /Anything at all/);
});

test("inventions compose in dependency order: later rests on earlier, the free and the early are ungrounded", () => {  const seen = [];
  const r = tryInvents({
    standing: [{ end1: "lincoln", label: "appointed", end2: "hamlin" }],
    given: ["lincoln.txt#0-40"],
    soundCheck: (notes) => { seen.push(notes.length); return []; },
    invents: [
      { text: "First bridge.", edges: [{ end1: "first", label: "spans", end2: "bridge" }], restsOn: ["e0"] },
      { text: "Second bridge.", edges: [{ end1: "second", label: "spans", end2: "bridge" }], restsOn: ["i0"] },
      { text: "Free bridge.", edges: [{ end1: "free", label: "spans", end2: "bridge" }] },
      { text: "Early bridge.", edges: [{ end1: "early", label: "spans", end2: "bridge" }], restsOn: ["i9"] },
    ],
  });
  assert.equal(r.landed.length, 2);
  assert.deepEqual(r.landed.map((l) => l.id), ["i0", "i1"]);
  assert.equal(r.gaps.filter((g) => g.name === THEA_REFUSALS.UNGROUNDED).length, 2);
  assert.deepEqual(seen, [2, 3]);
});

test("Mahavira's seat: every invention speaks from a standpoint, never an unattributed voice", () => {
  const r = composeFigure({
    passages: P,
    lines: [{ text: "Lincoln appointed Hamlin vice president.", backs: ["lincoln.txt#0-40"] }],
    invents: [{ text: "Ticket paired Illinois Maine.", edges: [{ end1: "ticket", label: "paired", end2: "Illinois Maine" }], restsOn: ["lincoln.txt#0-40"], standpoint: "chronicler" }],
    soundCheck: CLEAR,
  });
  assert.equal(r.invented.length, 1);
  assert.equal(r.invented[0].standpoint, "chronicler");
  assert.match(r.text, /\[invented — chronicler — logos-clear\]/);
});

test("contentless tissue derives nothing and needs no premises", () => {
  const r = composeFigure({
    passages: P,
    lines: [{ text: "Lincoln appointed Hamlin vice president.", backs: ["lincoln.txt#0-40"] }],
    invents: [{ text: "And so.", edges: [] }],
    soundCheck: CLEAR,
  });
  assert.equal(r.invented.length, 1);
});

test("muses: nine hands, each task named once, Urania last", () => {
  assert.equal(MUSES.length, 9);
  assert.deepEqual(MUSES.map((m) => m.name),
    ["Calliope", "Clio", "Polyhymnia", "Euterpe", "Terpsichore", "Erato", "Melpomene", "Thalia", "Urania"]);
  assert.equal(MUSES.at(-1).task, "assemble");
  assert.equal(new Set(MUSES.map((m) => m.task)).size, 9);
});

test("muses: Calliope orders, Clio heads, Polyhymnia carries gaps", () => {
  const parts = [
    { id: "a", heading: "Appointment", text: "Alpha.", gaps: [{ name: "n", detail: "d" }] },
    { id: "b", heading: "Before", text: "Beta.", gaps: [] },
  ];
  const { seq, orderNote } = museOrder(parts, ["b", "a"]);
  assert.deepEqual(seq.map((p) => p.id), ["b", "a"]);
  assert.match(orderNote, /declared order/);
  assert.deepEqual(museHead(seq), ["Before", "Appointment"]);
  const gaps = museGap(seq);
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].part, "a");
});

test("muses: Euterpe transits on structure, Terpsichore flows untouched", () => {
  assert.equal(museTransit(null, { claim: { end1: "x" } }), "open");
  assert.equal(museTransit({ merged: { case: "AGREE" } }, { merged: { case: "DISAGREE" } }), "intoContested");
  assert.equal(museTransit(
    { claim: { end1: "Lincoln" } }, { claim: { end1: "Lincoln" } }), "sameSubject");
  assert.deepEqual(museFlow({ sentences: [{ text: "One." }, { text: "Two." }] }), ["One.", "Two."]);
});

test("muses: Melpomene withholds the unbacked, Thalia counts honestly", () => {
  const { kept, withheld } = museWithhold(
    [{ text: "Lincoln appointed Hamlin vice president.", backs: ["lincoln.txt#0-40"] },
     { text: "Hamlin invented the telegraph.", backs: ["almanac.txt#0-30"] }],
    undefined, P);
  assert.equal(kept.length, 1);
  assert.equal(withheld.length, 1);
  assert.match(museCover({ given: 2, composed: 1, withheld }), /composed 1 of 2.*1 withheld/);
});

test("muses: Erato bridges only under logos; Urania assembles the whole dance", () => {
  const noLogos = museBridge({
    standing: [{ end1: "Bridge", label: "holds", end2: "Bridge" }],
    invents: [{ text: "Bridge holds.", edges: [{ end1: "Bridge", label: "holds", end2: "Bridge" }], restsOn: ["e0"] }],
  });
  assert.equal(noLogos.landed.length, 0);
  assert.equal(noLogos.gaps[0].name, THEA_REFUSALS.NO_LOGOS);
  const undeclared = museBridge({ invents: [{ text: "Bridge.", edges: [] }] });
  assert.equal(undeclared.gaps[0].name, THEA_REFUSALS.UNDECLARED_CONTENT);
  const w = museAssemble({
    parts: [
      { id: "a", heading: "Appointment", text: "Alpha holds.", gaps: [] },
      { id: "b", heading: "Before", text: "Beta holds.", gaps: [{ name: "n", detail: "d" }] },
    ],
    order: ["b", "a"],
  });
  assert.ok(w.text.indexOf("Beta holds.") < w.text.indexOf("Alpha holds."));
  assert.match(w.text, /## Before/);
  assert.match(w.text, /\[gap \(b\): n — d\]/);
  assert.match(w.coverage, /composed 2 of 2/);
});

test("aristotle: peripeteia — same end whose standing falls is a reversal", () => {
  const t = museTransit(
    { claim: { end1: "Oedipus" }, merged: { case: "AGREE", standing: "corroborated" } },
    { claim: { end1: "Oedipus" }, merged: { case: "AGREE", standing: "single" } });
  assert.equal(t, "reversal");
  assert.equal(TRANSIT_FALLBACK[t], "intoContested");
});

test("aristotle: anagnorisis — a part taking up the previous gap is a recognition", () => {
  const t = museTransit(
    { claim: { end1: "Hamlin" }, text: "Hamlin held office.", gaps: [{ name: "term_dates", detail: "hamlin terms unrecorded", line: "hamlin terms unknown" }] },
    { claim: { end1: "Senate" }, text: "Hamlin served two full terms in office.", gaps: [] });
  assert.equal(t, "recognition");
  assert.equal(TRANSIT_FALLBACK[t], "outOfContested");
});

test("vonnegut rule 4, structurally: knit reports loners, never refuses", () => {
  const k = museKnit(["Lincoln appointed Hamlin vice president.", "Hamlin chaired the Senate.", "Telegraphs hummed over silent prairies."]);
  assert.equal(k.pairs, 2);
  assert.deepEqual(k.loners, [2]);
});

test("vonnegut shapes: climb reads rags-to-riches, a repeat adds nothing, one section is flatline", () => {
  const rise = museArc(["Alpha holds.", "Alpha holds and Beta follows.", "Alpha Beta Gamma hold together."]);
  assert.equal(rise.shape, "rags-to-riches");
  const rep = museArc(["Same words here.", "Same words here."]);
  assert.equal(rep.fresh[1], 0, "restatement is flat — a section that adds nothing argues nothing");
  const flat = museArc(["Same words here."]);
  assert.equal(flat.shape, "flatline");
});

test("calliope by declared arc; flat diet refuses no_arc and keeps given order", () => {
  const parts = [{ id: "a", text: "Zebra quills." }, { id: "b", text: "Zebra quills and xylophones yodel." }];
  const r = museShapeOrder(parts, "rags-to-riches");
  assert.equal(r.refused, null);
  assert.match(r.orderNote, /declared arc: rags-to-riches/);
  const flat = museShapeOrder([{ id: "a", text: "" }, { id: "b", text: "" }], "rags-to-riches");
  assert.equal(flat.refused.type, "no_arc");
  assert.deepEqual(flat.seq.map((p) => p.id), ["a", "b"], "no arc imposed on a flat diet");
});

test("aristotle unity: a part touching nothing is apart, carried not dropped", () => {
  const gaps = museUnity([
    { id: "a", text: "Lincoln appointed Hamlin." },
    { id: "b", text: "Telegraphs hummed over silent prairies." },
  ]);
  assert.equal(gaps.length, 2, "apartness is symmetric — each part names its own separation");
  assert.ok(gaps.every((g) => g.name === "apart"));
});

test("EOT: every hand projects SYN tuples with declared grain; muses feed muses", () => {
  const seq = [{ id: "a", text: "Alpha holds.", gaps: [] }, { id: "b", text: "Beta holds.", gaps: [] }];
  const asm = museAssemble({ parts: seq });
  assert.ok(asm.eot.length > 0);
  for (const t of asm.eot) {
    assert.equal(t.op, "SYN");
    assert.ok(["Figure", "Pattern"].includes(t.grain));
    assert.ok(t.subject !== undefined && t.predicate !== undefined);
    assert.ok(t.meta.muse);
  }
  // The loop closed: Urania's tuples as standing for Erato's bridge.
  const standing = asm.eot.map((t) => ({ end1: t.subject, label: t.predicate, end2: t.object }));
  const br = museBridge({
    standing,
    given: ["whole"],
    invents: [{ text: "Whole weaves a.", edges: [{ end1: "Whole", label: "weaves", end2: "a" }], restsOn: ["whole"] }],
    soundCheck: () => [],
  });
  assert.equal(br.landed.length, 1);
});

test("tokensOf: pitch text arcs and unites under a pitch tokenizer, flat under words", () => {
  const pitchToks = (t) => String(t ?? "").split(/\s+/).filter(Boolean);
  const arcWords = museArc(["C D E F G", "G A B C5"]);
  assert.equal(arcWords.shape, "flatline", "word-tokens cannot see pitches — disclosed, not smoothed");
  const arcPitch = museArc(["C D E F G", "G A B C5"], { tokensOf: pitchToks });
  assert.equal(arcPitch.shape, "rags-to-riches");
  const apart = museUnity([{ id: "a", text: "C D E" }, { id: "b", text: "F# C#" }], { tokensOf: pitchToks });
  assert.equal(apart.length, 2);
  const one = museUnity([{ id: "a", text: "C D E" }, { id: "b", text: "E F G" }], { tokensOf: pitchToks });
  assert.equal(one.length, 0, "shared E unites them");
});
