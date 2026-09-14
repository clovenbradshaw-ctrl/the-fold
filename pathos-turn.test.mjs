// pathos-turn.test.mjs — the PATHOS SYSTEM, NOT OPTIONAL: the live turn's
// composition of eoreader7's pathos organ (native/organs/pathos.js), run
// against the REAL organs by relative path — the same pattern
// hyperlexicon-stance.test.mjs uses. The walls this file exists to hold:
//   1. A flatline arc IS read stale and the concession LANDS (a recorded
//      act, never a report).
//   2. The same kind is not conceded twice in a row — the same act twice
//      on the same ground is refused by the organ's own bound.
//   3. A holding reading never concedes, and re-founds the ground so the
//      next failure can land again.
//   4. The curve is a declared gap on this pipeline — collapse cannot fire
//      (no reader fold over the conversation), and the read says so.
//   5. The cue is information about the conversation, firewall-clean (P55).

import { test } from "node:test";
import assert from "node:assert/strict";

import { pathosOf, reGroundCondition, reGround, landReGround } from "../eoreader7/native/organs/index.js";
import { pathosTurn, pathosCueFor } from "./pathos-turn.js";
import { apparatusMentions } from "./firewall.js";

const ORGANS = { pathosOf, reGroundCondition, reGround, landReGround };
const EXPERIENCER = { who: "the-fold:reader", read: "conversation:test" };
const Q = "Why was Moscow burned?";

// The battery's Pierre thread, the measured flatline (ratio 0.297, zero
// blinks — Murch's boredom): uniform-length sentences, nothing varying.
const FLATLINE_ARC = [
  "The text says Moscow was burned by its inhabitants.",
  "The text says the French did not burn the city.",
  "The text says the inhabitants abandoned the city.",
  "The text says Moscow had to burn like a village.",
  "The text says the owners left the houses empty.",
  "The text says the strangers came and cooked porridge.",
].join("\n\n");

test("a flatline arc reads stale, and the concession LANDS on the ledger", () => {
  const out = pathosTurn({
    organs: ORGANS,
    text: FLATLINE_ARC,
    experiencer: EXPERIENCER,
    turn: 7,
  });
  assert.equal(out.condition.kind, "stale", "Murch's boredom is the live stale register");
  assert.ok(out.act, "a failing ground must be conceded, never merely reported");
  assert.equal(out.act.witness, "reader:pathos@stale:turn:7", "the concession names its giver");
  assert.equal(out.ledger.length, 1, "the act lands on the append-only ledger");
  assert.equal(out.ledger[0].schema, "EOPathosReGround@1");
  assert.equal(out.ledger[0].record.at, 0, "the act is addressable");
  assert.ok(out.cue, "the next turn hears the fact");
  assert.equal(out.cue, pathosCueFor({ kind: "stale" }));
  // The read's curve is a typed gap — surprise/tension/release are
  // unmeasured on this pipeline, never a verdict.
  assert.equal(out.read.curve.measured, false);
  assert.match(out.read.curve.unmeasured, /gap/);
});

test("the same kind is not conceded twice in a row — the same act twice is refused", () => {
  const first = pathosTurn({ organs: ORGANS, text: FLATLINE_ARC, experiencer: EXPERIENCER, turn: 7 });
  const second = pathosTurn({
    organs: ORGANS,
    text: FLATLINE_ARC,
    experiencer: EXPERIENCER,
    ledger: first.ledger,
    lastKind: first.lastKind,
    heldSinceLast: first.heldSinceLast,
    turn: 8,
  });
  assert.equal(second.act, null, "a second stale concession on the same still-stale ground is the same act twice");
  assert.equal(second.ledger.length, 1);
  assert.equal(second.lastKind, "stale");
  assert.equal(second.heldSinceLast, false);
});

test("a holding reading never concedes and re-founds the ground", () => {
  const stale = pathosTurn({ organs: ORGANS, text: FLATLINE_ARC, experiencer: EXPERIENCER, turn: 7 });
  const varying = "The Kessington report put the harbor figure at twelve percent, revising the earlier estimate downward after the audit found discrepancies in the spring data.";
  const holds = pathosTurn({
    organs: ORGANS,
    text: varying,
    experiencer: EXPERIENCER,
    ledger: stale.ledger,
    lastKind: stale.lastKind,
    heldSinceLast: stale.heldSinceLast,
    turn: 8,
  });
  assert.equal(holds.condition.kind, "ground_holds");
  assert.equal(holds.act, null, "a ground that holds is never conceded — a concession is a recorded act, never an idle one");
  assert.equal(holds.cue, null);
  assert.equal(holds.heldSinceLast, true, "the holding reading re-founds the ground");
  // The same flatline again after a holding reading is a NEW failure — it lands.
  const again = pathosTurn({
    organs: ORGANS,
    text: FLATLINE_ARC,
    experiencer: EXPERIENCER,
    ledger: holds.ledger,
    lastKind: holds.lastKind,
    heldSinceLast: holds.heldSinceLast,
    turn: 9,
  });
  assert.ok(again.act, "a ground that failed again after being re-founded is a fresh concession, not the same act twice");
  assert.equal(again.ledger.length, 2);
});

test("contested strain (the record's own premises at strict) is the second live register", () => {
  const out = pathosTurn({
    organs: ORGANS,
    text: FLATLINE_ARC,
    experiencer: EXPERIENCER,
    state: { contested: ["loop:ground:c1t1"], contradictions: [], cycles: 1, expired: [], unlicensed: true },
    turn: 10,
  });
  assert.equal(out.condition.kind, "contested");
  assert.ok(out.act);
  assert.equal(out.cue, pathosCueFor({ kind: "contested" }));
});

test("collapse cannot fire — the curve is a gap on this pipeline, and the refusal is said, not hidden", () => {
  // A text full of surprise operations and zero release WOULD read collapse
  // through a reader fold; without one the organ's own law refuses: an
  // unmeasured curve is unmeasurable, never a verdict.
  const burst = "The city burned! The French came. The people fled. Everything changed. Nothing was the same afterward.";
  const out = pathosTurn({ organs: ORGANS, text: burst, experiencer: EXPERIENCER, turn: 11 });
  assert.notEqual(out.condition.kind, "collapse");
  assert.equal(out.read.curve.measured, false);
  assert.equal(out.cue, null);
});

test("an unspecified experiencer is refused — pathos for no one is kitsch (the anti-kitsch wall)", () => {
  assert.throws(() => pathosTurn({ organs: ORGANS, text: FLATLINE_ARC, experiencer: null }), /experiencer/);
});

test("the cues are model-facing and firewall-clean (P55)", () => {
  for (const kind of ["stale", "contested", "collapse"]) {
    const cue = pathosCueFor({ kind });
    assert.ok(cue, `a cue exists for ${kind}`);
    assert.equal(apparatusMentions(cue).length, 0, `apparatus vocabulary must never reach the mouth: «${cue}»`);
  }
  assert.equal(pathosCueFor({ kind: "ground_holds" }), null, "a holding ground speaks nothing");
});