// cursor.test.mjs — P156. The fold level: what cursor movement actually shows.
import test from "node:test";
import assert from "node:assert/strict";
import { trace, supersessions, foldLevel, STATES } from "./cursor.js";

const node = (id, surfaces, arrivals) => ({ id, surfaces, arrivals });
const proj = (nodes) => ({ schema: "EOHypergraph@1", nodes, links: [] });

test("THE VACUITY, measured not assumed: on an upsert-only fold nothing is lost, so persistence says nothing", () => {
  // War and Peace's first 120 KB at four cursors: 32 of 32 nodes present at
  // 50% are still present at 100%, lost set EMPTY at every step. "A pattern
  // is what survives cursor movement" is the obvious design and it is void.
  const early = proj([node("a", ["A"], [1]), node("b", ["B"], [2])]);
  const late = proj([node("a", ["A"], [1, 5]), node("b", ["B"], [2]), node("c", ["C"], [9])]);
  const t = trace([early, late]);
  assert.equal(t.monotone, true);
  assert.deepEqual(t.lost, []);
  assert.equal(t.persistenceIsVacuous, true);
  assert.match(t.why, /persistence distinguishes nothing/);
});

test("what a node DOES separates: live keeps arriving, dormant stops", () => {
  const c1 = proj([node("a", ["A"], [1]), node("b", ["B"], [2])]);
  const c2 = proj([node("a", ["A"], [1, 4]), node("b", ["B"], [2])]);
  const c3 = proj([node("a", ["A"], [1, 4, 7]), node("b", ["B"], [2])]);
  const t = trace([c1, c2, c3]);
  const by = Object.fromEntries(t.nodes.map((n) => [n.id, n.state]));
  assert.equal(by.a, STATES.LIVE, "a is still arriving");
  assert.equal(by.b, STATES.DORMANT, "b stopped arriving and the reading moved on");
});

test("A MERGE IS RECOVERED from dormancy plus surface capture — and marked INFERRED", () => {
  // The real case, from War and Peace: ref:auto:vasili goes dormant while
  // ref:auto:prince_vasili_kuragin gains its surface. Three ids, one being.
  const c1 = proj([node("ref:auto:vasili", ["Vasili"], [1, 2]), node("ref:auto:prince_vasili_kuragin", ["Prince Vasili Kuragin"], [3])]);
  const c2 = proj([node("ref:auto:vasili", ["Vasili"], [1, 2]),
                   node("ref:auto:prince_vasili_kuragin", ["Prince Vasili Kuragin", "Vasili"], [3, 8, 9])]);
  const s = supersessions(trace([c1, c2]), c1);
  assert.equal(s.supersessions.length, 1);
  assert.equal(s.supersessions[0].folded, "ref:auto:vasili");
  assert.equal(s.supersessions[0].kept, "ref:auto:prince_vasili_kuragin");
  assert.equal(s.supersessions[0].inferred, true, "a reconstruction must never be mistaken for the record it replaces");
  // This once asserted /discarded/ — that the upstream merge record was thrown
  // away. P165 landed it, so that sentence is no longer true and the test was
  // asserting a defect it should have been glad to lose. With no record on
  // the projection, the reading is still inference, and says so.
  assert.match(s.why, /reconstructed from dormancy plus surface capture/);
  assert.match(s.why, /marked inferred/);
});

test("THE CONTROL: dormancy alone is not a merge", () => {
  // A node that stops arriving while nothing captures its surface has simply
  // been left behind. Calling that a merge would invent identity.
  const c1 = proj([node("a", ["Alpha"], [1]), node("b", ["Beta"], [2])]);
  const c2 = proj([node("a", ["Alpha"], [1]), node("b", ["Beta"], [2, 5])]);
  const s = supersessions(trace([c1, c2]), c1);
  assert.deepEqual(s.supersessions, []);
});

test("the unit is a REFERENT the reading resolved, never a string that recurred", () => {
  // Two princes with the same word in their surfaces stay two nodes. A
  // surface counter would have made them one and called it a pattern.
  const c1 = proj([node("ref:auto:prince_andrew", ["Prince Andrew"], [1]), node("ref:auto:prince_vasili", ["Prince Vasili"], [2])]);
  const c2 = proj([node("ref:auto:prince_andrew", ["Prince Andrew"], [1, 3]), node("ref:auto:prince_vasili", ["Prince Vasili"], [2, 4])]);
  const f = foldLevel([c1, c2]);
  assert.equal(f.nodes, 2, "two princes are two beings");
  assert.equal(f.superseded, 0, "and sharing the word 'prince' does not merge them");
});

test("AN ARBITRARY NUMBER OF CURSORS — two is the minimum, there is no maximum, spacing is the caller's", () => {
  const mk = (k) => proj(Array.from({ length: 3 }, (_, i) => node(`n${i}`, [`S${i}`], Array.from({ length: k + (i === 0 ? k : 0) }, (_, j) => j))));
  for (const n of [2, 3, 7, 20]) {
    const f = foldLevel(Array.from({ length: n }, (_, k) => mk(k + 1)));
    assert.equal(f.cursors, n, `${n} cursors must be read as ${n}`);
    assert.ok(!f.gap);
  }
});

test("one cursor is not a trace, and says so rather than returning an empty finding", () => {
  const f = foldLevel([proj([node("a", ["A"], [1])])]);
  assert.equal(f.gap, "empty_material");
  assert.match(f.why, /at least two/);
});

test("MATERIAL-AGNOSTIC: nothing here reads text — a projection of any perceiver's log traces the same way", () => {
  // Nodes carrying no text at all, from a hypothetical non-text perceiver.
  const c1 = proj([node("ref:audio:speaker_1", ["spk1"], [0, 1]), node("ref:audio:speaker_2", ["spk2"], [2])]);
  const c2 = proj([node("ref:audio:speaker_1", ["spk1"], [0, 1, 9]), node("ref:audio:speaker_2", ["spk2"], [2])]);
  const f = foldLevel([c1, c2]);
  assert.equal(f.live, 1);
  assert.equal(f.dormant, 1);
});

test("the fold level reports its own vacuity every time, so no caller can present survival as a finding", () => {
  const c1 = proj([node("a", ["A"], [1])]);
  const c2 = proj([node("a", ["A"], [1, 2]), node("b", ["B"], [3])]);
  const f = foldLevel([c1, c2]);
  assert.equal(f.persistenceIsVacuous, true);
  assert.match(f.why, /persistence itself distinguishes nothing/);
});

// ── P165: the record first, inference only where it is silent ──────────────

test("P165: a supersession ON THE RECORD is testimony — inferred:false, with its witness", () => {
  const c1 = proj([node("ref:auto:vasili", ["Vasili"], [1, 2]), node("ref:auto:prince_vasili", ["Prince Vasili"], [3])]);
  const c2 = { ...proj([node("ref:auto:vasili", ["Vasili"], [1, 2]), node("ref:auto:prince_vasili", ["Prince Vasili", "Vasili"], [3, 8])]),
    merges: [{ id: "merge:575:x", kept: "ref:auto:prince_vasili", folded: ["ref:auto:vasili"], witness: "Vasíli", encounterRef: "encounter:575" }] };
  const s = supersessions(trace([c1, c2]), c1, c2);
  const row = s.supersessions.find((x) => x.folded === "ref:auto:vasili");
  assert.ok(row, "the recorded fold is reported");
  assert.equal(row.inferred, false, "G14: a record is never reported as a reconstruction");
  assert.equal(row.witness, "Vasíli");
  assert.equal(s.fromRecord, 1);
  assert.equal(s.inferredRows, 0, "the record covered it, so nothing was inferred for it");
  assert.equal(s.inferred, false);
});

test("P165: where the record is SILENT, inference still fills in — and stays marked inferred", () => {
  // The record names one fold; a second dormant node with captured surfaces
  // is not on it. Inference covers that one only, and says so.
  const c1 = proj([node("a", ["A"], [1]), node("b", ["B"], [2]), node("k", ["K"], [3])]);
  const c2 = { ...proj([node("a", ["A"], [1]), node("b", ["B"], [2]), node("k", ["K", "A", "B"], [3, 9, 10])]),
    merges: [{ id: "merge:1:x", kept: "k", folded: ["a"], witness: "A", encounterRef: "encounter:9" }] };
  const s = supersessions(trace([c1, c2]), c1, c2);
  const byFolded = Object.fromEntries(s.supersessions.map((x) => [x.folded, x]));
  assert.equal(byFolded.a.inferred, false, "a is on the record");
  assert.equal(byFolded.b?.inferred, true, "b was reconstructed, and says so");
  assert.equal(s.fromRecord, 1);
  assert.equal(s.inferredRows, 1);
  assert.equal(s.inferred, true, "any inferred row makes the whole reading partly inferred");
});

test("P165: with no record on the projection, behaviour is byte-identical to before — inference alone", () => {
  const c1 = proj([node("ref:auto:vasili", ["Vasili"], [1, 2]), node("ref:auto:prince_vasili_kuragin", ["Prince Vasili Kuragin"], [3])]);
  const c2 = proj([node("ref:auto:vasili", ["Vasili"], [1, 2]), node("ref:auto:prince_vasili_kuragin", ["Prince Vasili Kuragin", "Vasili"], [3, 8, 9])]);
  const s = supersessions(trace([c1, c2]), c1, c2);
  assert.equal(s.fromRecord, 0);
  assert.equal(s.supersessions.length, 1);
  assert.equal(s.supersessions[0].inferred, true);
});
