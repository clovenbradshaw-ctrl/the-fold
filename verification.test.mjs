// node --test verification.test.mjs
//
// The nine-cell decomposition, offline — canned hypergraph/testimony
// shapes, because what this module owns is COMPOSITION (which cell gets
// which already-computed verdict), never computation. Real end-to-end
// wiring (a live hypergraph report, a live witness) is hypergraph.test.mjs
// and testimony.test.mjs's job; this file proves the taxonomy itself is
// complete and correctly addressed.

import { test } from "node:test";
import assert from "node:assert/strict";

import { VERIFICATION_GRID, verificationTasksFor, verificationSummary } from "./verification.js";

test("the grid is exactly the engine's own nine cells, three domains by three grains", () => {
  assert.equal(VERIFICATION_GRID.length, 9);
  const byDomain = {};
  for (const c of VERIFICATION_GRID) (byDomain[c.domain] ??= []).push(c.grain);
  assert.deepEqual(byDomain.Existence, ["Ground", "Figure", "Pattern"]);
  assert.deepEqual(byDomain.Structure, ["Ground", "Figure", "Pattern"]);
  assert.deepEqual(byDomain.Interpretation, ["Ground", "Figure", "Pattern"]);
  const terrains = VERIFICATION_GRID.map((c) => c.terrain);
  assert.deepEqual(terrains, ["Void", "Entity", "Kind", "Field", "Link", "Network", "Atmosphere", "Lens", "Paradigm"]);
});

test("every call returns exactly nine tasks, one per cell, in grid order", () => {
  const tasks = verificationTasksFor({});
  assert.equal(tasks.length, 9);
  assert.deepEqual(tasks.map((t) => t.terrain), VERIFICATION_GRID.map((c) => c.terrain));
  // With nothing supplied, every cell that needs input is a typed absence —
  // never a guess, never silently skipped.
  assert.ok(tasks.every((t) => ["not_yet_executable", "gap"].includes(t.verdict) || t.terrain === "Void"));
});

test("a bound edge composes as Existence/Entity holding and Structure/Link holding", () => {
  const hgReport = { examined: true, vocabulary: { verbs: 3 } };
  const hgClaim = { verdict: "bound", subject: "Pierre Bezukhov", verb: "married", object: "Helene", refs: ["wp.txt#0-100"] };
  const tasks = verificationTasksFor({ hgReport, hgClaim });
  const byTerrain = Object.fromEntries(tasks.map((t) => [t.terrain, t]));
  assert.equal(byTerrain.Void.verdict, "holds");
  assert.equal(byTerrain.Entity.verdict, "holds");
  assert.equal(byTerrain.Field.verdict, "holds");
  assert.equal(byTerrain.Link.verdict, "holds");
  assert.equal(byTerrain.Kind.verdict, "not_yet_executable");
  assert.equal(byTerrain.Atmosphere.verdict, "not_yet_executable");
  assert.equal(byTerrain.Paradigm.verdict, "not_yet_executable");
});

test("hypergraph.js's own richer evidence (refs, corroboration, opposing edges, nearest, competing) rides the cell — never collapsed to a bare reason string", () => {
  // hypergraph.js's judge() computes far more than a verdict + sentence:
  // the addresses that state it, corroboration counted BOTH as passages
  // and as distinct sources (never averaged into a bit), the opposing
  // edges on a contradiction, and the nearest edges it does bind on an
  // unbound claim. Dropping these to a terse reason was exactly the
  // failure the "stored in the json, thinking affordance" direction
  // exists to prevent.
  const hgReport = { examined: true, vocabulary: { verbs: 4 } };

  const bound = verificationTasksFor({
    hgReport,
    hgClaim: {
      verdict: "bound",
      subject: "Pierre Bezukhov",
      verb: "married",
      object: "Helene",
      refs: ["wp.txt#0-400", "wp.txt#400-800"],
      corroboration: { passages: 2, sources: 1 },
    },
  });
  const link1 = Object.fromEntries(bound.map((t) => [t.terrain, t])).Link;
  assert.deepEqual(link1.refs, ["wp.txt#0-400", "wp.txt#400-800"]);
  assert.deepEqual(link1.corroboration, { passages: 2, sources: 1 });

  const contradicted = verificationTasksFor({
    hgReport,
    hgClaim: {
      verdict: "contradicted",
      subject: "Pierre Bezukhov",
      verb: "loved",
      object: "Helene",
      refs: ["letters.txt#0-300"],
      corroboration: { passages: 1, sources: 1 },
      bound: [{ subject: "Pierre Bezukhov", verb: "loved", object: "Helene", polarity: "-", refs: ["letters.txt#0-300"] }],
    },
  });
  const link2 = Object.fromEntries(contradicted.map((t) => [t.terrain, t])).Link;
  assert.equal(link2.opposing.length, 1);
  assert.equal(link2.opposing[0].polarity, "-");

  const unbound = verificationTasksFor({
    hgReport,
    hgClaim: {
      verdict: "unbound",
      subject: "Dolokhov",
      verb: "married",
      object: "Helene",
      nearest: [{ subject: "Dolokhov", verb: "trusted", object: "Pierre Bezukhov", polarity: "+", refs: ["wp.txt#0-400"] }],
      competing: { subject: "Pierre Bezukhov", verb: "married", object: "Helene", refs: ["wp.txt#0-400"], corroboration: { passages: 1, sources: 1 } },
    },
  });
  const byTerrain = Object.fromEntries(unbound.map((t) => [t.terrain, t]));
  assert.equal(byTerrain.Link.nearest.length, 1);
  assert.deepEqual(byTerrain.Network.competing.subject, "Pierre Bezukhov");
  assert.deepEqual(byTerrain.Network.competing.corroboration, { passages: 1, sources: 1 });
});

test("Void carries the completeness gap — 'have we defined the space correctly' — when a bound claim's slot has more than one real filler", () => {
  // User direction, 2026-08-19, naming the cell directly: "this would be
  // scoping the Void: 'is this a complete answer, have we defined the
  // space correctly?'" — the live specimen: "who was Lincoln's vice
  // president?" answered Hamlin alone, bound and true, while the material
  // also states Johnson. Void's verdict does not change (material IS
  // present either way) — the reason and the real fillers ride the same
  // cell, enriched rather than a second cell invented for it.
  const hgReport = { examined: true, vocabulary: { verbs: 2 } };
  const hgClaim = {
    verdict: "bound",
    subject: "Lincoln",
    verb: "appointed",
    object: "Hamlin",
    fillers: [
      { object: "Hamlin", refs: ["lincoln.txt#0-100"] },
      { object: "Johnson", refs: ["lincoln.txt#100-200"] },
    ],
  };
  const tasks = verificationTasksFor({ hgReport, hgClaim });
  const void_ = Object.fromEntries(tasks.map((t) => [t.terrain, t])).Void;
  assert.equal(void_.verdict, "holds", "the material genuinely is present — completeness is a richer reason, not a different verdict");
  assert.match(void_.reason, /not fully bounded/);
  assert.match(void_.reason, /2 distinct fillers/);
  assert.deepEqual(void_.fillers, hgClaim.fillers);
});

test("Void stays the plain 'material is present' reading when a claim has no more than one real filler", () => {
  const hgReport = { examined: true, vocabulary: { verbs: 2 } };
  const hgClaim = { verdict: "bound", subject: "Lincoln", verb: "nominated", object: "Seward" };
  const tasks = verificationTasksFor({ hgReport, hgClaim });
  const void_ = Object.fromEntries(tasks.map((t) => [t.terrain, t])).Void;
  assert.equal(void_.verdict, "holds");
  assert.equal(void_.reason, "material is present to check against");
  assert.equal(void_.fillers, undefined, "no completeness data fabricated where none applies");
});

test("a contradicted edge composes as Structure/Link failing, never as Existence/Entity failing", () => {
  const hgReport = { examined: true, vocabulary: { verbs: 3 } };
  const hgClaim = { verdict: "contradicted", subject: "Pierre Bezukhov", verb: "loved", object: "Helene" };
  const tasks = verificationTasksFor({ hgReport, hgClaim });
  const byTerrain = Object.fromEntries(tasks.map((t) => [t.terrain, t]));
  assert.equal(byTerrain.Entity.verdict, "holds", "the referents resolved fine — only the relation is disputed");
  assert.equal(byTerrain.Link.verdict, "fails");
});

test("beyond-reach composes as Existence/Entity gapping, and Link never runs on an unresolved endpoint", () => {
  const hgReport = { examined: true, vocabulary: { verbs: 3 } };
  const hgClaim = { verdict: "beyond-reach", subject: "He", verb: "married", object: "Helene", reason: "“He” doesn't resolve to anyone" };
  const tasks = verificationTasksFor({ hgReport, hgClaim });
  const byTerrain = Object.fromEntries(tasks.map((t) => [t.terrain, t]));
  assert.equal(byTerrain.Entity.verdict, "gap");
  assert.match(byTerrain.Entity.reason, /doesn't resolve/);
  assert.equal(byTerrain.Link.verdict, "not_yet_executable", "no edge check can run without a resolved endpoint");
});

test("an unheard verb composes as Structure/Link gapping (claim-specific), distinct from Structure/Field gapping (material-wide)", () => {
  const hgReport = { examined: true, vocabulary: { verbs: 5 } }; // the material DOES have a measurable vocabulary
  const hgClaim = { verdict: "unheard", subject: "Pierre Bezukhov", verb: "betrayed", object: "Helene" };
  const tasks = verificationTasksFor({ hgReport, hgClaim });
  const byTerrain = Object.fromEntries(tasks.map((t) => [t.terrain, t]));
  assert.equal(byTerrain.Field.verdict, "holds", "the material's vocabulary is measurable — only THIS verb is outside it");
  assert.equal(byTerrain.Link.verdict, "gap");
  assert.match(byTerrain.Link.reason, /betrayed/);
});

test("no material at all composes as Existence/Void gapping and Structure/Field gapping together", () => {
  const hgReport = { examined: false, vocabulary: { verbs: 0, gap: "no relation vocabulary could be measured from this material" } };
  const tasks = verificationTasksFor({ hgReport });
  const byTerrain = Object.fromEntries(tasks.map((t) => [t.terrain, t]));
  assert.equal(byTerrain.Void.verdict, "gap");
  assert.equal(byTerrain.Field.verdict, "gap");
});

test("P32's slot-competition finding composes as Structure/Network failing, disclosed as covering one case", () => {
  const hgReport = { examined: true, vocabulary: { verbs: 2 } };
  const hgClaim = {
    verdict: "unbound",
    subject: "Dolokhov",
    verb: "married",
    object: "Helene",
    competing: { subject: "Pierre Bezukhov", verb: "married", object: "Helene", refs: ["wp.txt#0-100"] },
  };
  const tasks = verificationTasksFor({ hgReport, hgClaim });
  const byTerrain = Object.fromEntries(tasks.map((t) => [t.terrain, t]));
  assert.equal(byTerrain.Network.verdict, "fails");
  assert.match(byTerrain.Network.reason, /Pierre Bezukhov/);
  assert.ok(byTerrain.Network.disclosed, "the partial coverage must stay disclosed, not implied general");
  // Ordinary unbound with no competing edge stays a typed absence, not a guess.
  const plain = verificationTasksFor({ hgReport, hgClaim: { verdict: "unbound", subject: "X", verb: "married", object: "Y" } });
  assert.equal(Object.fromEntries(plain.map((t) => [t.terrain, t])).Network.verdict, "not_yet_executable");
});

test("the witness verdict composes into Interpretation/Lens, and only Lens", () => {
  const contradicts = verificationTasksFor({ testimony: { verdict: "contradicts", because: "the Pirates won", host: "en.wikipedia.org", armed: true } });
  const lensC = Object.fromEntries(contradicts.map((t) => [t.terrain, t])).Lens;
  assert.equal(lensC.verdict, "fails");
  assert.equal(lensC.reason, "the Pirates won");
  assert.equal(lensC.armed, true);

  const states = verificationTasksFor({ testimony: { verdict: "states", because: "confirmed", host: "x.com", armed: false } });
  assert.equal(Object.fromEntries(states.map((t) => [t.terrain, t])).Lens.verdict, "holds");

  const refused = verificationTasksFor({ testimony: { refused: "insensitive", host: "x.com" } });
  const lensR = Object.fromEntries(refused.map((t) => [t.terrain, t])).Lens;
  assert.equal(lensR.verdict, "gap");
  assert.match(lensR.reason, /insensitive/);

  // Every other cell stays untouched by a witness-only call — no
  // cross-contamination between cells that were never given input.
  assert.equal(Object.fromEntries(contradicts.map((t) => [t.terrain, t])).Link.verdict, "not_yet_executable");
});

test("verificationSummary counts natural-frequency, never a bare true/false", () => {
  const hgReport = { examined: true, vocabulary: { verbs: 3 } };
  const hgClaim = { verdict: "bound", subject: "Pierre Bezukhov", verb: "married", object: "Helene" };
  const testimony = { verdict: "states", because: "confirmed", host: "x.com", armed: true };
  const tasks = verificationTasksFor({ hgReport, hgClaim, testimony });
  const summary = verificationSummary(tasks);
  assert.match(summary, /^\d+ of 9 cells hold, \d+ fail, \d+ told both ways, \d+ gap, \d+ not yet built$/);
  assert.match(summary, /5 of 9 cells hold/); // Void, Entity, Field, Link, Lens all hold on this fixture
});

// ── amended same day: a reader's own analysis, presupposition failure,
// Belnap's fourth value, giver + dependsOn ──────────────────────────────

test("presupposition failure gates EVERY downstream claim-scoped cell to a typed gap, including Lens — never lets a witness verdict through for a referent that failed to exist", () => {
  // The JNJ incident, inverted, on purpose: a witness result IS supplied
  // (as if a search had run and a model had read some page), but the
  // claim's own entity failed to resolve. Composing Lens from the supplied
  // testimony anyway would be the exact shape of bug that let Johnson &
  // Johnson material get treated as relevant to Andrew Johnson — trusting
  // downstream computation against a referent Existence already refused.
  const hgReport = { examined: true, vocabulary: { verbs: 2 } };
  const hgClaim = { verdict: "beyond-reach", subject: "He", verb: "married", object: "Helene", reason: "“He” doesn't resolve to anyone" };
  const testimony = { verdict: "contradicts", because: "some passage, about someone else entirely", host: "example.com", armed: true };
  const tasks = verificationTasksFor({ hgReport, hgClaim, testimony });
  const byTerrain = Object.fromEntries(tasks.map((t) => [t.terrain, t]));
  assert.equal(byTerrain.Entity.verdict, "gap");
  assert.equal(byTerrain.Link.verdict, "not_yet_executable");
  assert.equal(byTerrain.Network.verdict, "not_yet_executable");
  assert.equal(byTerrain.Lens.verdict, "not_yet_executable", "a witness verdict must never surface for a claim whose referent failed");
  assert.match(byTerrain.Lens.why, /presupposition/i);
  // Field is material-wide and stays independent of this one claim's
  // entity failure — the material itself still has a measurable vocabulary.
  assert.equal(byTerrain.Field.verdict, "holds");
});

test("no material at all gates Entity itself, not just the claim-scoped cells below it", () => {
  const hgReport = { examined: false, vocabulary: { verbs: 0, gap: "no relation vocabulary could be measured from this material" } };
  const tasks = verificationTasksFor({ hgReport, testimony: { verdict: "states", because: "x", host: "y" } });
  const byTerrain = Object.fromEntries(tasks.map((t) => [t.terrain, t]));
  assert.equal(byTerrain.Void.verdict, "gap");
  assert.equal(byTerrain.Entity.verdict, "gap");
  assert.equal(byTerrain.Lens.verdict, "not_yet_executable");
});

test("a bound edge the material ALSO states the opposite polarity for composes as Belnap's fourth value, both — never averaged into holds or fails", () => {
  const hgReport = { examined: true, vocabulary: { verbs: 2 } };
  const hgClaim = {
    verdict: "bound",
    subject: "Pierre Bezukhov",
    verb: "loved",
    object: "Helene",
    contested: ["letters.txt#0-300"],
  };
  const tasks = verificationTasksFor({ hgReport, hgClaim });
  const link = Object.fromEntries(tasks.map((t) => [t.terrain, t])).Link;
  assert.equal(link.verdict, "both");
  assert.match(link.reason, /BOTH polarities/);
  // both is counted in its own bucket, distinct from holds and fails — the
  // fixture's OTHER cells (Void, Entity, Field) legitimately hold, so the
  // check is that Link specifically landed in "both", not folded into
  // either "holds" or "fails".
  const summary = verificationSummary(tasks);
  assert.match(summary, /1 told both ways/);
  assert.equal(tasks.filter((t) => t.verdict === "holds").includes(link), false);
  assert.equal(tasks.filter((t) => t.verdict === "fails").includes(link), false);

  // The ordinary bound case (no contested opposite) still just holds.
  const plain = verificationTasksFor({ hgReport, hgClaim: { ...hgClaim, contested: undefined } });
  assert.equal(Object.fromEntries(plain.map((t) => [t.terrain, t])).Link.verdict, "holds");
});

test("every cell in the grid — including a bare, uncomposed one — carries its own giver and dependsOn", () => {
  for (const c of VERIFICATION_GRID) {
    assert.ok("giver" in c, `${c.terrain} must declare a giver (organ name or null)`);
    assert.ok(Array.isArray(c.dependsOn), `${c.terrain} must declare dependsOn as an array`);
  }
  // The five real cells name a real organ; the four unbuilt cells are
  // honestly null, never a placeholder pretending to be a giver.
  const byTerrain = Object.fromEntries(VERIFICATION_GRID.map((c) => [c.terrain, c]));
  for (const built of ["Void", "Entity", "Field", "Link", "Lens"]) assert.ok(byTerrain[built].giver, `${built} must name its organ`);
  for (const unbuilt of ["Kind", "Atmosphere", "Paradigm"]) assert.equal(byTerrain[unbuilt].giver, null);
  // Link and Lens both depend on Entity — the presupposition edge, walked
  // as data rather than only enforced as control flow, so the record
  // itself says WHY a superseded Entity would invalidate them.
  assert.deepEqual(byTerrain.Link.dependsOn, ["Entity"]);
  assert.deepEqual(byTerrain.Lens.dependsOn, ["Entity"]);
});

test("a cursor, when supplied, rides every task; when omitted, no cursor field is fabricated", () => {
  const withCursor = verificationTasksFor({ hgReport: { examined: true, vocabulary: {} }, cursor: "turn-7" });
  assert.ok(withCursor.every((t) => t.cursor === "turn-7"));
  const without = verificationTasksFor({ hgReport: { examined: true, vocabulary: {} } });
  assert.ok(without.every((t) => !("cursor" in t)));
});

test("the four disclosed-absent cells always say WHY they are absent, never a bare gap", () => {
  const tasks = verificationTasksFor({});
  for (const terrain of ["Kind", "Atmosphere", "Paradigm"]) {
    const t = tasks.find((x) => x.terrain === terrain);
    assert.equal(t.verdict, "not_yet_executable");
    assert.ok(t.why && t.why.length > 10, `${terrain} must name why it is unbuilt, not just say so`);
  }
});
