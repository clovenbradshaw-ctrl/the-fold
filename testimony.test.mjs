// node --test testimony.test.mjs
//
// The witness tier's walls, offline — no model, no network: the witness's
// replies are scripted, because what this module owns is not the reading
// but the DISCIPLINE around it (pointer containment, the sibling arm,
// typed refusals), and every wall is testable with canned testimony.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  WITNESS_SCHEMA,
  WITNESS_SLICE_MAX,
  becauseContained,
  buildWitnessMessages,
  foldTestimony,
  readTestimony,
  siblingSwap,
  witnessSlice,
} from "./testimony.js";

// The measured specimen, in miniature: a page about the 1960 World Series
// where the claim's vocabulary saturates the bytes but the fact runs the
// other way.
const PAGE = [
  "The 1960 World Series was played between the New York Yankees and the Pittsburgh Pirates.",
  "The Pittsburgh Pirates defeated the New York Yankees in seven games to win the 1960 World Series.",
  "Bill Mazeroski ended game seven with a walk-off home run at Forbes Field.",
  "The town festival was unrelated to baseball, and the bakery on the square sold out by noon.",
].join(" ");

const CLAIM = {
  kind: "name",
  text: "New York Yankees won the 1960 World Series",
  tokens: ["Yankees", "won", "1960"],
  sentence: "The New York Yankees won the 1960 World Series.",
};

test("witnessSlice anchors on the claim's vocabulary and carries the neighbours where the contradiction lives", () => {
  const slice = witnessSlice(CLAIM, PAGE);
  assert.ok(slice, "the claim's tokens anchor in this page");
  assert.ok(slice.includes("Pirates defeated the New York Yankees"), slice);
  assert.ok(!slice.includes("bakery"), "an unanchored sentence far from the claim stays out");
  assert.ok(slice.length <= WITNESS_SLICE_MAX);
});

test("witnessSlice returns null when nothing anchors — a typed absence, never the top of the page", () => {
  assert.equal(witnessSlice(CLAIM, "The festival ran all weekend. The bakery sold out."), null);
  assert.equal(witnessSlice(CLAIM, ""), null);
});

test("readTestimony parses the constrained object, tolerates prose wrapping, refuses anything off the enum", () => {
  assert.deepEqual(readTestimony('{"answer":"no","because":"the Pirates defeated the Yankees"}'), {
    answer: "no",
    because: "the Pirates defeated the Yankees",
  });
  assert.deepEqual(readTestimony('Sure! {"answer":"yes","because":"quoted words"} hope that helps'), {
    answer: "yes",
    because: "quoted words",
  });
  assert.equal(readTestimony('{"answer":"maybe","because":"x"}'), null);
  assert.equal(readTestimony("no object here"), null);
  // The schema the caller hands Ollama is the same closed enum — binary on
  // purpose: the verdict is derived in foldTestimony, never asked as a
  // label (measured 2026-08-19: the three-way form drew the right
  // `because` and the wrong label out of gemma2:2b).
  assert.deepEqual(WITNESS_SCHEMA.properties.answer.enum, ["yes", "no"]);
});

test("becauseContained: the decider must be in the bytes the witness read", () => {
  const slice = "The Pittsburgh Pirates defeated the New York Yankees in seven games.";
  assert.ok(becauseContained("the Pittsburgh Pirates defeated the New York Yankees", slice), "verbatim, case-folded");
  assert.ok(becauseContained("Pirates defeated Yankees", slice), "word-level: every content word present");
  assert.ok(!becauseContained("the Pirates lost the series", slice), "a word the slice never carries refuses");
  assert.ok(!becauseContained("", slice), "an empty decider is no pointer at all");
});

test("siblingSwap draws the sibling from the page's own universe, never the world at large", () => {
  const slice = "The Pittsburgh Pirates defeated the New York Yankees to win the series.";
  const swap = siblingSwap(CLAIM.sentence, slice);
  assert.ok(swap, "both sides offer a name");
  // namesIn keeps a leading capitalized "The" as part of the run — the swap
  // stays well-formed either way; what matters is WHICH referent moved.
  assert.ok(swap.from.includes("New York Yankees"), swap.from);
  assert.ok(swap.to.includes("Pittsburgh Pirates"), swap.to);
  assert.ok(swap.swapped.includes("Pittsburgh Pirates won the 1960 World Series"), swap.swapped);
  assert.ok(!swap.swapped.includes("Yankees won"), swap.swapped);
  // A page offering no name the claim lacks cannot arm the witness.
  assert.equal(siblingSwap(CLAIM.sentence, "the new york yankees appear here uncapitalized only"), null);
  // A claim with no name cannot be swapped either.
  assert.equal(siblingSwap("it rained on tuesday.", slice), null);
});

test("foldTestimony derives the verdict from the pair — never asked as a label; every refusal typed", () => {
  const slice = "The Pittsburgh Pirates defeated the New York Yankees to win the 1960 World Series.";
  const decider = "the Pittsburgh Pirates defeated the New York Yankees to win the 1960 World Series";

  // The Yankees shape end to end: the page does NOT say the claim is true,
  // and DOES say the Pirates-swapped twin is — contradiction DERIVED from
  // slot competition, carrying the page's own words for the sibling.
  const kept = foldTestimony({
    real: { answer: "no", because: "" },
    arm: { answer: "yes", because: decider },
    armed: true,
    host: "en.wikipedia.org",
    slice,
  });
  assert.equal(kept.verdict, "contradicts");
  assert.equal(kept.armed, true);
  assert.equal(kept.because, decider);
  assert.equal(kept.refused, undefined);

  // Claim affirmed, sibling refused: states, armed.
  const states = foldTestimony({
    real: { answer: "yes", because: decider },
    arm: { answer: "no", because: "" },
    armed: true,
    slice,
  });
  assert.equal(states.verdict, "states");
  assert.equal(states.armed, true);

  // A witness that affirms BOTH fillers of one slot testifies about the
  // vocabulary, not the claim — a distinction without a difference, refused.
  const flat = foldTestimony({
    real: { answer: "yes", because: decider },
    arm: { answer: "yes", because: decider },
    armed: true,
    slice,
  });
  assert.equal(flat.refused, "insensitive");

  // Claim affirmed, no sibling on the page to arm with: ships, disclosed unarmed.
  const unarmed = foldTestimony({ real: { answer: "yes", because: decider }, armed: false, slice });
  assert.equal(unarmed.verdict, "states");
  assert.equal(unarmed.armed, false);

  // "No" alone is silence, not contradiction — the page states neither, and
  // the ∅ count already says that; no testimony to show.
  assert.equal(foldTestimony({ real: { answer: "no", because: "" }, armed: false, slice }).refused, "no-testimony");
  assert.equal(
    foldTestimony({ real: { answer: "no", because: "" }, arm: { answer: "no", because: "" }, armed: true, slice })
      .refused,
    "no-testimony",
  );

  // A decider not in the bytes is no testimony, whichever read supplied it.
  assert.equal(
    foldTestimony({ real: { answer: "yes", because: "the Yankees were disqualified" }, armed: false, slice }).refused,
    "uncontained",
  );
  assert.equal(
    foldTestimony({
      real: { answer: "no", because: "" },
      arm: { answer: "yes", because: "the Pirates were awarded the title by forfeit" },
      armed: true,
      slice,
    }).refused,
    "uncontained",
  );

  assert.equal(foldTestimony({ real: null, slice }).refused, "unreadable");
});

test("buildWitnessMessages: material first, one question, prose — no bracket scaffolding", () => {
  const msgs = buildWitnessMessages(CLAIM.sentence, "some passage");
  assert.equal(msgs.length, 2);
  assert.ok(msgs[1].content.startsWith("Passage:"), "the passage precedes the sentence so the claim cannot prime the read");
  assert.ok(msgs[1].content.includes(CLAIM.sentence));
});
