// pace.test.mjs — the pace ledger: measured from runtime telemetry, folded
// never stored, typed gaps before measurement, and the window fit disclosed.

import { test } from "node:test";
import assert from "node:assert/strict";

import { emptyPaceLog, recordCall, foldPace, predictCall, fitToWindow } from "./pace.js";

test("pace is measured from telemetry and folded per model", () => {
  let log = emptyPaceLog();
  const before = log;
  // Two calls: 4 chars/token tokenizer, prefill 100 tok/s, decode 50 tok/s.
  log = recordCall(log, { model: "m", promptChars: 4000, promptTokens: 1000, promptNs: 10e9, outTokens: 500, outNs: 10e9 });
  log = recordCall(log, { model: "m", promptChars: 8000, promptTokens: 2000, promptNs: 20e9, outTokens: 1000, outNs: 20e9 });
  assert.equal(before.entries.length, 0, "append-only: the old log is untouched");

  const pace = foldPace(log, "m");
  assert.equal(pace.calls, 2);
  assert.ok(Math.abs(pace.tokensPerChar - 0.25) < 1e-9);
  assert.ok(Math.abs(pace.prefillTps - 100) < 1e-9);
  assert.ok(Math.abs(pace.decodeTps - 50) < 1e-9);

  // Another model's calls do not contaminate the fold.
  assert.equal(foldPace(log, "other").calls, 0);
});

test("prediction carries its basis; before measurement it is a typed gap", () => {
  let log = emptyPaceLog();
  assert.ok(predictCall(foldPace(log, "m"), 4000, 500).gap);

  log = recordCall(log, { model: "m", promptChars: 4000, promptTokens: 1000, promptNs: 10e9, outTokens: 500, outNs: 10e9 });
  const p = predictCall(foldPace(log, "m"), 8000, 500);
  // 8000 chars × 0.25 = 2000 tokens / 100 tps = 20s prefill; 500 / 50 = 10s decode.
  assert.equal(p.ms, 30000);
  assert.equal(p.promptTokens, 2000);
  assert.match(p.basis, /measured over 1/);
});

test("fitToWindow drops least-relevant passages last-first, and says so", () => {
  const pace = { tokensPerChar: 0.25, calls: 1, prefillTps: 1, decodeTps: 1 };
  const passages = [
    { ref: "a#0-1", text: "x".repeat(8000) },  // 2000 tokens
    { ref: "b#0-1", text: "x".repeat(8000) },
    { ref: "c#0-1", text: "x".repeat(8000) },
  ];
  // window 4500, out cap 500 → budget 4000 tokens; fixed 0. Two passages fit.
  const fit = fitToWindow({ pace, contextTokens: 4500, fixedChars: 0, passages, outTokens: 500 });
  assert.deepEqual(fit.passages.map((p) => p.ref), ["a#0-1", "b#0-1"]);
  assert.deepEqual(fit.dropped.map((p) => p.ref), ["c#0-1"]);
  assert.match(fit.note, /trimmed to fit/);
  assert.match(fit.note, /c#0-1/);

  // Unmeasured pace trims nothing — a guess must not act like a fact.
  const raw = fitToWindow({ pace: { calls: 0 }, contextTokens: 4500, fixedChars: 0, passages, outTokens: 500 });
  assert.equal(raw.passages.length, 3);
  assert.equal(raw.note, null);
});
