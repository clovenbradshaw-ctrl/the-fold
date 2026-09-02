// node --test web-hunt.test.mjs
//
// Offline-only cases (refusal paths — no network, no explore-server
// needed). The real, live, end-to-end web-hunt verification (a real search,
// real fetched pages, a real REC firing on a real multi-cardinality case)
// is a separate re-runnable driver, not a committed test — the same
// posture eval/web-snip-eval.mjs already holds for exactly this reason
// (P19/P27: a network-dependent run is a measurement, not a CI gate).

import { test } from "node:test";
import assert from "node:assert/strict";

import * as operators from "../eoreader7/legacy-eoreader6.1/packages/engine/operators.js";
import * as taskLog from "../eoreader7/legacy-eoreader6.1/packages/engine/holon/task-log.js";
import { DEFINITE_DETERMINERS, INFLECTIONAL_SUFFIXES, INTERROGATIVE_PRONOUNS, MANNER_REASON_PRONOUNS } from "../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/priors.js";
import { makeGrid } from "./grid.js";
import { findCapacity, unresolvedCapacity } from "../eoreader7/native/organs/index.js";
import { huntUndetermined } from "./web-hunt.js";

function freshGrid() {
  const grid = makeGrid({ operators, taskLog });
  grid.withCapacities({ findCapacity, unresolvedCapacity });
  return grid;
}

test("huntUndetermined refuses when the target task isn't on the log at all", async () => {
  const grid = freshGrid();
  const log = grid.createLog();
  const out = await huntUndetermined(grid, null, log, "act-999", { question: "who was X" });
  assert.equal(out.ok, false);
  assert.equal(out.refusal.type, "target_not_found");
});

test("huntUndetermined refuses to hunt for an ALREADY-DETERMINED claim — never a wasted, unconsented crossing", async () => {
  const grid = freshGrid();
  const log = grid.createLog();
  const parsed = grid.parseAct('evaluate "Lincoln appointed Hamlin" at Link from differentiate ground lincoln.txt broken:rotation verdict:holds', { log });
  assert.equal(parsed.ok, true);
  const landed = grid.land(log, parsed.event);
  const out = await huntUndetermined(grid, null, landed.log, landed.ids[0], { question: "who did Lincoln appoint" });
  assert.equal(out.ok, false);
  assert.equal(out.refusal.type, "already_determined");
});

test("huntUndetermined proceeds (parses OK, would attempt a real hunt) for a genuinely undetermined evaluate", async () => {
  const grid = freshGrid();
  const log = grid.createLog();
  const parsed = grid.parseAct('evaluate "Schuyler Colfax was vice president under Abraham Lincoln" at Link from differentiate ground colfax.txt broken:rotation', { log });
  assert.equal(parsed.ok, true);
  const landed = grid.land(log, parsed.event);
  // No network available/desired in this offline test — point `explore`
  // at a real port nothing is listening on, so gatherPages' own search()
  // fails fast via a real connection-refused rather than hanging, and we
  // only assert the REFUSAL PATHS above did NOT fire (the function got
  // past both, meaning it correctly identified this as a genuine,
  // undetermined, huntable target) — not the network result itself.
  const out = await huntUndetermined(grid, () => ({ examined: true, queryReferents: () => [] }), landed.log, landed.ids[0], {
    question: "who was vice president under",
    explore: "http://127.0.0.1:19999",
    definiteDeterminers: DEFINITE_DETERMINERS,
    inflectionalSuffixes: INFLECTIONAL_SUFFIXES,
    interrogativePronouns: INTERROGATIVE_PRONOUNS,
    mannerReasonPronouns: MANNER_REASON_PRONOUNS,
  });
  // Either the fetch genuinely fails (network-level) or it "succeeds" with
  // zero pages — both are real, honest outcomes distinct from the two
  // refusal types already covered above.
  assert.equal(out.ok, true);
  assert.notEqual(out.verdict, undefined);
});
