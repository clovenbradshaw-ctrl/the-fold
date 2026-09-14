# Muninn-memory experiment (2026-09-13)

Does the memory watcher's decision discriminate, or only look like it does?
Draws: 199 seeded (LCG seed 7) · recall budget: 2 · warm-up: 24 distractor records · 6 story records · questions at turn 40

## Leg 1 — recall: Muninn's ranking vs a shuffled judge

| question | needed record | surfaced | muninn rank | in budget | shuffled in-budget (chance) |
|---|---|---|---|---|---|
| who was lincoln's first vice president | 24 | 6 | 1 | yes | 92/199 (0.333) |
| who succeeded lincoln as president | 26 | 6 | 2 | yes | 67/199 (0.333) |
| who was the seventeenth vice president of the  | 28 | 6 | 3 | no | 55/199 (0.333) |

Muninn placed the needed record in the present in 2 of 3 questions.
The shuffled judge (same surfaced set, ranking redealt, 199 draws each) placed it in-budget at 0.36 overall (max 92/199 in a single question) — chance is budget/surfaced = 2/6 ≈ 0.333.
**Verdict: directionally above the shuffled judge (0.67 vs 0.36), not established at 3 questions.**
All three needed records SURFACED (ranks 1, 2, 3) — the cue finds what this reader has read. The third question's miss is the mechanism, not a failure to find: Q3's needed record (order 28) is outranked by a MORE-RECENTLY-USED related record, because ACT-R ranks recency-of-use, never topical fit — a re-cited memory about a nearby subject beats the one the question actually needs. The recalled-and-used-before signal (recordCitation) is what separates the first two.

## Leg 2 — promotion: Muninn's gate vs the naive recurrence-only arm

Reference 1 (ablation moved a verdict → mattered): promoted = true (recurrence_and_consequence).
Reference 2 (recurred, never moved a verdict → recurring_no_consequence): promoted = false (recurring_no_consequence).
Naive recurrence-only arm: promotes both (true/true).
**The gate keeps the never-moved claim out of standing; the control — recurrence alone — would have admitted it.**

The record lines Muninn would land: `muninn-recall` (what entered the present, what was dropped, and why) and `muninn-promote` (what earned standing, and which half of the AND refused when it did not).
