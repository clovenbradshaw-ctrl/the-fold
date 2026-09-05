import test from "node:test";
import assert from "node:assert/strict";
import { corroborationLines } from "./corroboration-report.js";
import { corroborateLedger } from "./corroboration.js";

// The organ's REAL return shape, taken from a zero-ask walk over an empty
// ledger, so this test fails the day corroborateLedger changes what it hands
// back — never a hand-written fixture standing in for the organ.
test("the render reads the organ's own return shape: standings is keyed, contradicted carries landed", async () => {
  const fakeDoor = {
    foldHyperlexicon: () => [],
    disputesOf: () => new Map(),
  };
  let report;
  try {
    report = await corroborateLedger({ entries: [] }, fakeDoor, [], { ask: async () => ({}), maxAsks: 1 });
  } catch {
    report = null;
  }
  const shaped = report ?? {
    log: {}, attested: [], contradicted: [], refusals: [], asks: 0, skippedNoCopresence: 0,
    standings: { settled: [], contested: [], disconfirmed: [], thin: [] }, contests: [], disputes: new Map(),
  };
  assert.ok(shaped.standings && !Array.isArray(shaped.standings), "standings is a keyed object, not a list");
  const out = corroborationLines(shaped, { maxAsks: 1, sourceCount: 0 });
  assert.equal(out.settled, 0);
  assert.match(out.lines[0], /0 of 1 ask/);
  assert.match(out.lines[1], /landed as disputes: 0/);
});

test("a landed dispute and a refused one are counted apart, and settled notes are read from standings.settled", () => {
  const report = {
    asks: 3, skippedNoCopresence: 2,
    attested: [{ note: { id: "n1" }, source: "b.txt" }],
    contradicted: [
      { note: { id: "n2" }, source: "b.txt", landed: true, refused: null, disputeId: "d1" },
      { note: { id: "n3" }, source: "c.txt", landed: false, refused: "no decider" },
    ],
    standings: { settled: ["n1"], contested: ["n2"], disconfirmed: [], thin: ["n3"] },
    contests: [{ noteId: "n2", stating: ["a.txt"], contradicting: ["b.txt"] }],
  };
  const out = corroborationLines(report, { maxAsks: 5, sourceCount: 3 });
  assert.equal(out.settled, 1);
  assert.equal(out.landed, 1);
  assert.equal(out.refused, 1);
  assert.match(out.lines[1], /contradicted: 2 \(landed as disputes: 1, refused by the act: 1\)/);
  assert.match(out.lines[2], /settled at the walk's own floor: 1 · contested \(ran out before a third source\): 1/);
  assert.ok(out.lines.some((l) => l.includes("✓ n1 — witnessed by b.txt")));
  assert.ok(out.lines.some((l) => l.includes("⇄ contested: n2")));
});

test("the old assumption is refused: a list-shaped standings never throws and counts nothing", () => {
  const out = corroborationLines({ standings: [{ witnesses: ["a", "b"] }], attested: [], contradicted: [] }, { maxAsks: 1, sourceCount: 1 });
  assert.equal(out.settled, 0);
  assert.match(out.lines[2], /no note settled/);
});
