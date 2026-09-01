// seek.test.mjs — the reasoner, exercised against a source that is not
// Wikidata and has nothing to do with people, offices, or dates.
//
// This file is the claim's own proof. seek.js was extracted from a walk that
// was, honestly, a Wikidata parser with reasoning-shaped comments on it. The
// test of whether the extraction was real is whether the SAME functions answer
// the same shape of question over a completely different source — so the
// fixture below is a software release history: versions maintained by
// maintainers, with extents in semantic-version order rather than dates.
//
// If anything Wikidata-shaped had survived into seek.js, none of this would run.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { chainCloses, coverage, learnRelation, seekBindings } from "./seek.js";

// ── a source that knows nothing about people or dates ──────────────────────
// A project, its release lines, and who maintained each. Extents are semantic
// versions compared as strings; `maintains` is the relation, and the reasoner
// is never told so — it has to learn it from the examples.
const ENTITIES = {
  "proj:acme": {
    id: "proj:acme",
    label: "Acme",
    kinds: ["kind:project"],
    relations: [{ relation: "release-line", value: "line:1.x", scope: { from: "1.0.0", to: "2.0.0" } }],
  },
  "line:1.x": {
    id: "line:1.x",
    label: "the 1.x line",
    kinds: ["kind:release-line"],
    // the line points at some things; only some of them are maintainers
    relations: [
      { relation: "documented-in", value: "doc:changelog" },
      { relation: "current-maintainer", value: "person:mo" },
      { relation: "current-maintainer", value: "person:kit" },
    ],
  },
  "doc:changelog": { id: "doc:changelog", label: "CHANGELOG", kinds: ["kind:document"], relations: [{ relation: "describes", value: "line:1.x" }] },
  "person:mo": { id: "person:mo", label: "Mo", kinds: ["kind:person"], relations: [{ relation: "maintains", value: "line:1.x", scope: { from: "1.0.0", to: "1.4.0" }, next: "person:kit" }] },
  "person:kit": { id: "person:kit", label: "Kit", kinds: ["kind:person"], relations: [{ relation: "maintains", value: "line:1.x", scope: { from: "1.4.0", to: "2.0.0" }, prev: "person:mo" }] },
  "person:ash": { id: "person:ash", label: "Ash", kinds: ["kind:person"], relations: [{ relation: "maintains", value: "line:2.x", scope: { from: "2.0.0", to: "3.0.0" } }] },
};

const source = {
  name: "release-history",
  async resolve(surface) {
    const s = String(surface).toLowerCase();
    return Object.values(ENTITIES).filter((e) => e.label.toLowerCase().includes(s) || e.id.includes(s)).map((e) => ({ id: e.id, label: e.label }));
  },
  async entity(id) { return ENTITIES[id] ?? null; },
  async entities(ids) { return (ids ?? []).map((i) => ENTITIES[i]).filter(Boolean); },
  async neighbours(id) { return (ENTITIES[id]?.relations ?? []).map((r) => r.value); },
  async membersOf(relation, valueId) {
    return Object.values(ENTITIES).filter((e) => (e.relations ?? []).some((r) => r.relation === relation && r.value === valueId)).map((e) => e.id);
  },
};

test("the reasoner learns the relating relation from examples, never told it", async () => {
  const got = await learnRelation("line:1.x", source, { kind: "kind:person" });
  assert.equal(got.candidates[0]?.relation, "maintains", "learned from who points back, not from a name in code");
  assert.deepEqual(got.candidates[0].witnesses.sort(), ["person:kit", "person:mo"]);
});

test("a witness of the wrong kind cannot witness — the housekeeping-relation trap", async () => {
  // `doc:changelog` points back at the line via `describes`, exactly as a
  // maintainer points back via `maintains`. Counting alone would admit it.
  const unguarded = await learnRelation("line:1.x", source, { kind: null });
  assert.ok(unguarded.candidates.some((c) => c.relation === "describes"), "unguarded, the document really does witness");
  const guarded = await learnRelation("line:1.x", source, { kind: "kind:person" });
  assert.ok(!guarded.candidates.some((c) => c.relation === "describes"), "asking for a person excludes the document");
});

test("the whole walk answers over a non-Wikidata source, with extents that are versions", async () => {
  const got = await seekBindings({ anchor: "Acme", slot: "the 1.x line", kind: "kind:person" }, source);
  assert.ok(!got.gap, `expected bindings, got ${JSON.stringify(got.gap)}`);
  assert.equal(got.relation, "maintains");
  const scope = got.perScope.find((p) => p.bound.length);
  assert.deepEqual(scope.bound.map((b) => b.label), ["Mo", "Kit"], "in extent order, earliest first");
  assert.equal(scope.coverage.tiles, true, "1.0.0→1.4.0→2.0.0 covers the line with no gap");
});

test("extents are ORDERED, never parsed — a ratio needs a measure the source supplies", () => {
  const bound = [{ scope: { from: "1.0.0", to: "1.4.0" } }, { scope: { from: "1.4.0", to: "2.0.0" } }];
  const ordinal = coverage({ from: "1.0.0", to: "2.0.0" }, bound);
  assert.equal(ordinal.tiles, true, "tiling is a purely ordinal fact and is still reported");
  assert.equal(ordinal.ratio, null, "a RATIO is refused without a span measure, never guessed");
  // give it a measure and the ratio appears
  // a real measure on this scale: major*100 + minor
  const v = (x) => Number(x.split(".")[0]) * 100 + Number(x.split(".")[1]);
  const measured = coverage({ from: "1.0.0", to: "2.0.0" }, bound, { span: (a, b) => v(b) - v(a) });
  assert.equal(measured.ratio, 1);
});

test("TILING IS A GAP DETECTOR, and that is what earns it as a gate", () => {
  // Measured, 223/223: on a contiguous succession, removing any one member
  // always opens a gap. That — not "is this scope special" — is the claim
  // the gate rests on. An earlier displacement null asked the wrong question
  // and put tiling at rank 0.318, which would have condemned a check that is
  // in fact perfectly sensitive to the thing it exists to catch.
  const full = [
    { scope: { from: "1.0.0", to: "1.4.0" } },
    { scope: { from: "1.4.0", to: "1.8.0" } },
    { scope: { from: "1.8.0", to: "2.0.0" } },
  ];
  const scope = { from: "1.0.0", to: "2.0.0" };
  assert.equal(coverage(scope, full).tiles, true);
  for (let drop = 0; drop < full.length; drop++) {
    const holed = full.filter((_, i) => i !== drop);
    assert.equal(coverage(scope, holed).tiles, false, `removing member ${drop} must open a gap`);
    assert.ok(coverage(scope, holed).gaps > 0);
  }
});

test("the chain closes by identity, and names where the set ends", () => {
  const bound = [
    { id: "person:mo", next: "person:kit", prev: null },
    { id: "person:kit", next: null, prev: "person:mo" },
  ];
  const got = chainCloses(bound);
  assert.equal(got.mutual, true, "each pointer names the other, by id");
  assert.deepEqual(got.links, [{ from: "person:mo", to: "person:kit", mutual: true }]);
});

test("A SINK IS STILL LEARNABLE — the relation is learned from what points AT the slot", async () => {
  // The source shape that broke this: a slot built from a list read out of a
  // document. Every member points at it; it points at nothing. `neighbours`
  // returns [] and the members sit there unread, so `examined` came back 0
  // with the answer fully present in the source.
  const sink = {
    ...source,
    async neighbours() { return []; },
    async inbound(id) {
      return Object.values(ENTITIES).filter((e) => (e.relations ?? []).some((r) => r.value === id)).map((e) => e.id);
    },
  };
  const blind = await learnRelation("line:1.x", { ...source, async neighbours() { return []; } }, { kind: "kind:person" });
  assert.equal(blind.examined, 0, "without the inbound question a sink teaches nothing");

  const got = await learnRelation("line:1.x", sink, { kind: "kind:person" });
  assert.equal(got.candidates[0]?.relation, "maintains");
  assert.equal(got.via, "inbound", "which direction the evidence came from is reported, never inferred");
  assert.deepEqual(got.candidates[0].witnesses.sort(), ["person:kit", "person:mo"]);
});

test("inbound is OPTIONAL — a source without it behaves exactly as before", async () => {
  const got = await learnRelation("line:1.x", source, { kind: "kind:person" });
  assert.equal(got.via, "outbound");
  assert.equal(got.candidates[0]?.relation, "maintains");
});

test("a refused inbound read is a refusal, never an exhausted source", async () => {
  const refusing = { ...source, async neighbours() { return []; }, async inbound() { return null; } };
  const got = await learnRelation("line:1.x", refusing, { kind: "kind:person" });
  assert.equal(got.refused, true);
  assert.equal(got.settled, false);
});

test("a surface that names nothing is a typed gap, not an empty answer", async () => {
  const got = await seekBindings({ anchor: "nobody-here", slot: "the 1.x line" }, source);
  assert.equal(got.gap.type, "unbound_surface");
});

test("a refused read is never reported as exhausted evidence", async () => {
  const refusing = { ...source, async entities() { return null; } };
  const got = await learnRelation("line:1.x", refusing, { kind: "kind:person" });
  assert.equal(got.refused, true);
  assert.equal(got.settled, false);
});

test("seek.js contains no vocabulary from any particular publisher", () => {
  // Comments may NAME the vocabulary that was removed — that history is why
  // the file exists. The invariant is about code, so the scan strips comment
  // lines and block comments first, then insists the rest is clean.
  const src = readFileSync("./seek.js", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  for (const leak of [/\bQ\d{2,}\b/, /\bP\d{2,}\b/, /wikidata/i, /wikipedia/i, /haswbstatement/i, /Special:EntityData/i, /https?:\/\//]) {
    assert.doesNotMatch(src, leak, `seek.js must carry no source-specific vocabulary: ${leak}`);
  }
});
