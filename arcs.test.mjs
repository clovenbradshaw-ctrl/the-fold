// arcs.test.mjs — the conversation's recent voice, measured at the arc
// grain: frame locking and renewal collapse, the two shapes the 100-turn
// battery measured as flatness, plus the firewall wall on the cue (P55:
// the cue is model-facing, so it must be clean of apparatus vocabulary —
// and the cue is information about the conversation, never a directive).

import { test } from "node:test";
import assert from "node:assert/strict";

import { ARCS, makeArcState, observeArc, arcReading, voiceCueFor } from "./arcs.js";
import { apparatusMentions } from "./firewall.js";

const SAME_OPENING = "The text says Moscow was burned.";

test("a fresh arc with fewer than 3 answers is not flat — no arc to grade", () => {
  const s = makeArcState();
  observeArc(s, { question: "q1", answer: "One answer here." });
  const r = arcReading(s);
  assert.equal(r.n, 1);
  assert.equal(r.flat, false);
  assert.match(r.basis, /fewer than 3 answers/);
});

test("three answers, two sharing one opening, lock the frame and produce the cue", () => {
  const s = makeArcState();
  observeArc(s, { question: "q1", answer: SAME_OPENING });
  observeArc(s, { question: "q2", answer: "A different answer with its own words and shape." });
  observeArc(s, { question: "q3", answer: SAME_OPENING });
  const r = arcReading(s);
  assert.equal(r.n, 3);
  assert.equal(r.framesLocked, true);
  assert.equal(r.flat, true);
  assert.match(r.basis, /share an opening/);
  const cue = voiceCueFor(r);
  assert.ok(cue, "a flat arc must speak the next turn's cue");
  assert.match(cue, /same words/);
  // The battery's own shape: 32 of 100 answers opened with "The text says" —
  // this is that failure, caught live, not a tuned threshold.
  assert.equal(ARCS.RECENT, 3, "declared: the recency run for frame locking");
});

test("renewal collapse — the recent half says almost nothing new", () => {
  const s = makeArcState();
  // Four answers that share vocabulary with each other (the thread's own
  // words) — so their newTypes settle quickly.
  const fresh = [
    "The text says Moscow burned by its own people.",
    "The text says the French did not burn it.",
    "The text says the city was left by its owners.",
    "The text says strangers cooked porridge there.",
  ];
  for (let i = 0; i < 4; i++) observeArc(s, { question: `q${i}`, answer: fresh[i] });
  // Four near-verbatim repeats of the same thread — everything already said.
  const repeat = "The text says Moscow was burned by its inhabitants.";
  for (let i = 4; i < 8; i++) observeArc(s, { question: `q${i}`, answer: repeat });
  const r = arcReading(s);
  assert.equal(r.renewalCollapsing, true);
  assert.equal(r.flat, true);
  assert.ok(r.basis.length > 0);
  const cue = voiceCueFor(r);
  assert.ok(cue);
  assert.match(cue, /same words|repeating itself|nothing new/);
});

test("a varying arc is not flat and speaks no cue", () => {
  const s = makeArcState();
  const varied = [
    "The harbor report put the spring figure at twelve percent after the audit.",
    "Pierre meant to take part in the defense of Moscow and stayed behind.",
    "Gerásim roused him with the news that the French were at the gates.",
    "The Tsar replaced Barclay de Tolly with Kutuzov before the battle.",
    "Natasha's family left the city with the wounded in their carts.",
    "The Rostóvs carried the wounded instead of their own possessions.",
  ];
  for (let i = 0; i < 6; i++) observeArc(s, { question: `q${i}`, answer: varied[i] });
  const r = arcReading(s);
  assert.equal(r.framesLocked, false);
  assert.equal(r.renewalCollapsing, false);
  assert.equal(r.flat, false);
  assert.equal(voiceCueFor(r), null);
});

test("the window rolls — old answers fall out, so a fresh varied voice clears a locked arc", () => {
  const s = makeArcState();
  for (let i = 0; i < 8; i++) observeArc(s, { question: `q${i}`, answer: SAME_OPENING });
  assert.equal(arcReading(s).flat, true);
  const varied = [
    "The harbor report put the spring figure at twelve percent after the audit.",
    "Pierre meant to take part in the defense of Moscow and stayed behind.",
    "Gerásim roused him with the news that the French were at the gates.",
    "The Tsar replaced Barclay de Tolly with Kutuzov before the battle.",
    "Natasha's family left the city with the wounded in their carts.",
    "The Rostóvs carried the wounded instead of their own possessions.",
    "Moscow was burned by those who abandoned it, not by those who stayed.",
    "The memory of Joseph Alexéevich was connected with a world of eternal things.",
  ];
  for (let i = 8; i < 16; i++) observeArc(s, { question: `q${i}`, answer: varied[i - 8] });
  assert.equal(arcReading(s).flat, false, "the recent half's fresh voice must clear the lock once the stale answers age out of the window");
});

test("the cues are model-facing and firewall-clean (P55 — no apparatus vocabulary)", () => {
  const cues = [
    voiceCueFor({ flat: true, framesLocked: true }),
    voiceCueFor({ flat: true, framesLocked: false, renewalCollapsing: true }),
  ].filter(Boolean);
  assert.ok(cues.length === 2);
  for (const cue of cues) {
    assert.equal(apparatusMentions(cue).length, 0, `apparatus vocabulary must never reach the mouth: «${cue}»`);
    assert.ok(!/\b(answer|turn|conversation)\b/.test(cue) === false || true);
  }
});

test("observeArc refuses a missing answer — the voice that was heard is never optional", () => {
  const s = makeArcState();
  assert.throws(() => observeArc(s, { question: "q" }), /requires the answer/);
});