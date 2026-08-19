// node --test adversarial-dialogue.test.mjs
//
// Conformance for dialogue-graph.js — the one genuinely new instrument this
// repo gained for two-speaker dialogue: not relation extraction
// (hypergraph.js already does that, untouched here) but comparing two
// independently-extracted, evolving belief graphs and typing what one
// speaker's graph did in response to something the other asserted.
//
// Two kinds of test, on purpose. The first runs the REAL engine end to end
// (real extraction feeding real classification) so the pipeline is proven
// to actually plumb together, the same reason hypergraph.test.mjs never
// hand-fabricates a triple. The rest hand-author edge objects — legitimate
// here because classifyCrossGraphEdges's job starts AFTER extraction (it
// takes hypergraph.js's own edgeFace shape and never re-derives a triple
// from text) — but still route every comparison through a REAL
// makeReferentIndex built from real engine organs over real text, so the
// "same name" resolution this instrument depends on is never faked. This
// keeps the five verdicts decisive and unflaky while still exercising the
// real identity oracle, not a mock of it.

import { test } from "node:test";
import assert from "node:assert/strict";

import { makeRelationReader } from "./hypergraph.js";
import {
  classifyCrossGraphEdges,
  edgesMatch,
  endpointsMatch,
  activeWindow,
  oppositePolarity,
  makeReferentIndex,
} from "./dialogue-graph.js";

const organs = async () => {
  const { splitSentences } = await import("../eoreader6.1/packages/engine/perceiver/text/spans.js");
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(
    "../eoreader6.1/packages/engine/perceiver/text/surfaces.js"
  );
  const { discoverRelationVocab, extractRelations } = await import(
    "../eoreader6.1/packages/engine/perceiver/text/relations.js"
  );
  const { tokenize } = await import("../eoreader6.1/packages/engine/perceiver/text/material.js");
  return { splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize };
};

// ── the shared identity oracle both directions of the check must share ─────

const SHARED_CORPUS = [
  {
    text:
      "Kutuzov distrusted Barclay before the retreat began. " +
      "Napoleon crossed the Niemen in June with the largest army Europe had seen. " +
      "Barclay retreated from Smolensk without orders from the Tsar. " +
      "Kutuzov met Napoleon's army at Borodino in September. " +
      "Barclay warned Kutuzov about the exposed flank near the redoubt. " +
      "Napoleon waited outside Moscow for peace terms that never came.",
  },
];

test("the shared referent index resolves the same names both timelines will use", async () => {
  const indexFor = makeReferentIndex(await organs());
  const index = indexFor(SHARED_CORPUS);
  assert.ok(index.resolve("Kutuzov").size > 0, "Kutuzov must be an established referent");
  assert.ok(index.resolve("Barclay").size > 0, "Barclay must be an established referent");
  assert.ok(index.resolve("Napoleon").size > 0, "Napoleon must be an established referent");
});

// ── integration: real extraction feeding real classification ───────────────

test("real per-speaker extraction plumbs into real classification without crashing", async () => {
  const readerFor = makeRelationReader(await organs());

  const bPassagesTurn1 = [
    { ref: "b#1", text: "Barclay delayed Napoleon at every river crossing. Barclay trusted no one at headquarters." },
  ];
  const bPool = [...SHARED_CORPUS, ...bPassagesTurn1];
  const bSnap1 = readerFor(bPassagesTurn1, { pool: bPool });

  const aPassagesTurn2 = [
    { ref: "a#2", text: "Barclay delayed Napoleon at every river crossing, Kutuzov said so himself." },
  ];
  const aPool = [...SHARED_CORPUS, ...aPassagesTurn2];
  const aSnap2 = readerFor(aPassagesTurn2, { pool: aPool });

  const indexFor = makeReferentIndex(await organs());
  const sharedIndex = indexFor([...SHARED_CORPUS, ...bPassagesTurn1, ...aPassagesTurn2]);
  const { diaNorm } = await organs();

  const { findings, finalResponderTurn } = classifyCrossGraphEdges({
    assertorTimeline: [{ turn: 1, edges: bSnap1.edges }],
    responderTimeline: [{ turn: 2, edges: aSnap2.edges }],
    sharedIndex,
    diaNorm,
  });

  assert.equal(finalResponderTurn, 2);
  assert.ok(Array.isArray(findings));
  const VALID = new Set(["adopted", "contested", "echoed-not-retained", "untouched", "preexisting-or-independent"]);
  for (const f of findings) {
    assert.ok(VALID.has(f.verdict), `unexpected verdict: ${f.verdict}`);
    assert.ok(typeof f.reason === "string" && f.reason.length > 0, "every verdict carries a stated reason");
    assert.ok(f.assertedAt === 1, "every finding traces back to B's turn 1");
    assert.ok(Array.isArray(f.assertedRefs), "every finding carries the address that states it");
  }
});

// ── decisive, hand-authored: the five verdicts, distinguished ──────────────
//
// One combined scenario, the same way hypergraph.test.mjs's one PASSAGES
// set exercises bound/unbound/contradicted together: B asserts five edges
// across two turns, A's graph does something different with each one, and
// a single classifyCrossGraphEdges call must sort all five correctly.

async function sharedIndexAndDiaNorm() {
  const o = await organs();
  return { sharedIndex: makeReferentIndex(o)(SHARED_CORPUS), diaNorm: o.diaNorm };
}

const E = (subject, verb, object, polarity, refs) => ({ subject, verb, object, polarity, refs });

test("five verdicts, distinguished in one classification pass", async () => {
  const { sharedIndex, diaNorm } = await sharedIndexAndDiaNorm();

  const assertorTimeline = [
    {
      turn: 1,
      edges: [
        E("Barclay", "delayed", "Napoleon", "+", ["b#1a"]), // → adopted
        E("Kutuzov", "trusted", "Barclay", "+", ["b#1b"]), // → contested
        E("Napoleon", "blamed", "Kutuzov", "+", ["b#1c"]), // → echoed-not-retained
        E("Barclay", "praised", "Napoleon", "+", ["b#1d"]), // → untouched
      ],
    },
    {
      turn: 3,
      edges: [E("Kutuzov", "outmaneuvered", "Napoleon", "+", ["b#3a"])], // → preexisting-or-independent
    },
  ];

  const responderTimeline = [
    {
      turn: 2, // A's turn right after B's turn 1
      edges: [
        E("Barclay", "delayed", "Napoleon", "+", ["a#2a"]), // echoes the adopted edge
        E("Kutuzov", "trusted", "Barclay", "-", ["a#2b"]), // holds the OPPOSITE from the start
        E("Napoleon", "blamed", "Kutuzov", "+", ["a#2c"]), // echoes immediately...
        E("Kutuzov", "outmaneuvered", "Napoleon", "+", ["a#2d"]), // ...already believed BEFORE B's turn 3
        // Barclay praised Napoleon: A never mentions it here or anywhere.
      ],
    },
    {
      turn: 4,
      edges: [
        E("Barclay", "delayed", "Napoleon", "+", ["a#4a"]), // still holds
        E("Kutuzov", "trusted", "Barclay", "-", ["a#4b"]), // still holds the opposite
        // Napoleon blamed Kutuzov: dropped — not restated (the echo did not last)
        E("Kutuzov", "outmaneuvered", "Napoleon", "+", ["a#4d"]), // still holds
      ],
    },
    {
      turn: 6, // final
      edges: [
        E("Barclay", "delayed", "Napoleon", "+", ["a#6a"]),
        E("Barclay", "delayed", "Napoleon", "-", ["a#6a-opp"]), // self-contradiction, disclosed via alsoContested
        E("Kutuzov", "trusted", "Barclay", "-", ["a#6b"]),
        E("Kutuzov", "outmaneuvered", "Napoleon", "+", ["a#6d"]),
      ],
    },
  ];

  const { findings, finalResponderTurn } = classifyCrossGraphEdges({
    assertorTimeline,
    responderTimeline,
    sharedIndex,
    diaNorm,
  });
  assert.equal(finalResponderTurn, 6);

  const byVerb = (v) => findings.find((f) => f.edge.verb === v);

  const adopted = byVerb("delayed");
  assert.equal(adopted.verdict, "adopted");
  assert.equal(adopted.evidence.presentBeforeAssertion, false);
  assert.equal(adopted.evidence.presentAtFinalTurn, true);
  assert.equal(adopted.alsoContested, true, "the self-contradiction at the final turn must not be hidden");

  const contested = byVerb("trusted");
  assert.equal(contested.verdict, "contested");
  assert.equal(contested.evidence.oppositeSurvivesToFinal, true);

  const echoed = byVerb("blamed");
  assert.equal(echoed.verdict, "echoed-not-retained");
  assert.equal(echoed.evidence.presentAtNextResponderTurn, true);
  assert.equal(echoed.evidence.presentAtFinalTurn, false);

  const untouched = byVerb("praised");
  assert.equal(untouched.verdict, "untouched");
  assert.equal(untouched.evidence.presentBeforeAssertion, false);
  assert.equal(untouched.evidence.presentAtAnyLaterTurn, false);

  const preexisting = byVerb("outmaneuvered");
  assert.equal(preexisting.verdict, "preexisting-or-independent");
  assert.equal(preexisting.evidence.presentBeforeAssertion, true);
  assert.equal(preexisting.evidence.presentAtFinalTurn, true);

  // Every finding is typed, none is a bare boolean, and every one names the
  // address it traces to.
  for (const f of findings) {
    assert.ok(f.reason.length > 0);
    assert.ok(f.assertedAt === 1 || f.assertedAt === 3);
  }
});

test("an edge run symmetrically the other direction reads independently", async () => {
  // The brief: "run it symmetrically (B's graph against A's edges) for the
  // reverse direction." Swapping assertor/responder must not reuse any
  // state from the first direction — a fresh call, same shared index.
  const { sharedIndex, diaNorm } = await sharedIndexAndDiaNorm();
  const aTimeline = [{ turn: 2, edges: [E("Napoleon", "underestimated", "Kutuzov", "+", ["a#2"])] }];
  const bTimeline = [
    { turn: 1, edges: [] },
    { turn: 3, edges: [] }, // B never picks it up
  ];
  const { findings } = classifyCrossGraphEdges({
    assertorTimeline: aTimeline,
    responderTimeline: bTimeline,
    sharedIndex,
    diaNorm,
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].verdict, "untouched");
});

// ── the matching primitives, directly ───────────────────────────────────────

test("endpointsMatch resolves through the shared referent index, not string equality", async () => {
  const { sharedIndex, diaNorm } = await sharedIndexAndDiaNorm();
  assert.equal(endpointsMatch(sharedIndex, diaNorm, "Kutuzov", "Kutuzov"), true);
  assert.equal(endpointsMatch(sharedIndex, diaNorm, "Kutuzov", "Barclay"), false);
});

test("edgesMatch requires the same verb and, by default, the same polarity", async () => {
  const { sharedIndex, diaNorm } = await sharedIndexAndDiaNorm();
  const a = E("Kutuzov", "trusted", "Barclay", "+", []);
  const bSame = E("Kutuzov", "trusted", "Barclay", "+", []);
  const bOpp = E("Kutuzov", "trusted", "Barclay", "-", []);
  const bDiffVerb = E("Kutuzov", "distrusted", "Barclay", "+", []);
  assert.equal(edgesMatch(sharedIndex, diaNorm, a, bSame), true);
  assert.equal(edgesMatch(sharedIndex, diaNorm, a, bOpp), false);
  assert.equal(edgesMatch(sharedIndex, diaNorm, a, bOpp, { requireSamePolarity: false }), true);
  assert.equal(edgesMatch(sharedIndex, diaNorm, a, bDiffVerb), false);
});

test("oppositePolarity flips exactly the two symbols the engine emits", () => {
  assert.equal(oppositePolarity("+"), "-");
  assert.equal(oppositePolarity("-"), "+");
});

test("activeWindow is a generic slice, not a new number — callers supply the window", () => {
  const utterances = [1, 2, 3, 4, 5];
  assert.deepEqual(activeWindow(utterances, 2), [4, 5]);
  assert.deepEqual(activeWindow(utterances, 0), [1, 2, 3, 4, 5]);
  assert.deepEqual(activeWindow(utterances, 100), [1, 2, 3, 4, 5]);
});
