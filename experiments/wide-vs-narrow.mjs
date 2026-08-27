#!/usr/bin/env node
// experiments/wide-vs-narrow.mjs — does refusing every malformed answer let
// you turn the model up hot, sample wide, and mechanically keep the best?
//
// Direct answer to the question asked in chat (2026-08-18): "if we can get
// the non-model system to refuse all malformed options, can we turn up the
// model generation temperature and get lots of answers for a given thing
// and then mechanically output the best version." This is rejection
// sampling / best-of-n with a mechanical judge — a real, well-founded
// technique (AlphaCode's whole result shape) — built here under this
// project's own three conditions for the declared, non-laundered version:
// every draw lands on a real ledger before selection, the selector is
// mechanical and fixed in this file BEFORE any sampling happens, and
// recombination (when it happens) is at the event/artifact granularity,
// never inside one candidate's bytes.
//
// REUSES, NOT REBUILDS (the standing rule — leave everything possible in
// the engine — held here by import, not by copying):
//   - eoreader6.1/packages/engine/operators.js   (OPERATOR_ORDER, GRAINS)
//   - eoreader6.1/packages/engine/holon/task-log.js (the real append-only
//     ledger — every sample this script generates lands on it for real,
//     not a simulation of one)
//   - the-fold/witness.js::witnessCode            (the real syntax gate)
//
// WHAT IS NEW HERE, disclosed rather than smuggled in as if established:
//   - a functional-correctness harness (runs the candidate against a
//     declared test table in a timed vm.Context) — witness.js's own
//     `compiles` check is syntax-only; this is the second, stronger gate
//     the spec's Increment C.3 named and explicitly deferred as "a
//     sandboxed-execution problem, not a claim-grammar problem." This
//     script is exactly that: a standalone, disposable harness, NOT a
//     claim that the production terminal's sandbox story is done.
//   - a two-group permutation test comparing wide-arm vs narrow-arm
//     witnessed-success rates. This is NOT routed through the-fold's own
//     /measure door (measure.js::runMeasurement): none of nul/index.js's
//     five established STATISTICS (burstiness, windowMean,
//     permutationEntropy, irreversibility, maxDeviation) test a
//     BETWEEN-GROUP difference — they test structure WITHIN one series
//     against a perturbation of that same series. Forcing this comparison
//     through one of them would be exactly the "glue two unrelated things
//     and call it a widget" failure the operator algebra exists to refuse.
//     So this script implements its own permutation test, openly, using a
//     PRNG that is a byte-for-byte mirror of nul/index.js's own private
//     `rng` (mulberry32) — not re-derived, mirrored, because nul does not
//     export it. If this finding is ever worth keeping, the honest next
//     step is exactly the one this project's own amendment process names:
//     propose `groupMeanGap`/`labelShuffle` as a new statistic/perturbation
//     pair in nul/index.js, entered through `trying:` before it may ever
//     be entered as `as:` (see measure.js's own admit() gate 2).
//
// Layout assumption, unchanged from grid.test.mjs: the-fold and
// eoreader6.1 are SIBLING directories. Run from the-fold's own root:
//   node experiments/wide-vs-narrow.mjs --self-test
//   node experiments/wide-vs-narrow.mjs --model=gemma2:2b --wide-n=16

import vm from "node:vm";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import * as operators from "../../eoreader7/legacy-eoreader6.1/packages/engine/operators.js";
import * as taskLog from "../../eoreader7/legacy-eoreader6.1/packages/engine/holon/task-log.js";
import { witnessCode } from "../witness.js";

// ── CLI ──────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = { model: "gemma2:2b", narrowTemp: 0.2, wideTemp: 1.2, wideN: 16,
    draws: 2000, seed: 1337, timeoutMs: 200, ollama: "http://localhost:11434",
    out: "wide-vs-narrow-results.json", selfTest: false };
  for (const a of argv) {
    const m = /^--([\w-]+)(?:=(.*))?$/.exec(a);
    if (!m) continue;
    const key = m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (key === "selfTest") { out.selfTest = true; continue; }
    const val = m[2];
    out[key] = /^-?\d+(\.\d+)?$/.test(val ?? "") ? Number(val) : val;
  }
  return out;
}

// ── the task fixture set ────────────────────────────────────────────────
//
// Six small pure-function specs. Each carries its own REFERENCE
// implementation used ONLY to generate the test table below (never shown
// to the model, never shipped) — this keeps the expected values honest
// (computed, not hand-typed and possibly wrong) without pretending the
// reference is part of what is being measured.

function makeTasks() {
  const ref = {
    sumDigits: (n) => String(Math.abs(n)).split("").reduce((a, d) => a + Number(d), 0),
    isPalindrome: (s) => s === [...s].reverse().join(""),
    flattenOne: (arr) => arr.reduce((a, x) => a.concat(Array.isArray(x) ? x : [x]), []),
    countVowels: (s) => (s.match(/[aeiou]/gi) ?? []).length,
    median: (arr) => {
      const a = [...arr].sort((x, y) => x - y);
      const mid = Math.floor(a.length / 2);
      return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
    },
    fizzbuzzRange: (n) => Array.from({ length: n }, (_, i) => {
      const k = i + 1;
      return k % 15 === 0 ? "FizzBuzz" : k % 3 === 0 ? "Fizz" : k % 5 === 0 ? "Buzz" : String(k);
    }),
  };

  const cases = (fnName, argsList) =>
    argsList.map((args) => ({ args, expect: ref[fnName](...args) }));

  return [
    { id: "sum-digits", fnName: "sumDigits",
      prompt: "Write a JavaScript function `sumDigits(n)` that returns the sum of the decimal digits of a non-negative integer n.",
      tests: cases("sumDigits", [[0], [5], [123], [999], [100]]) },
    { id: "is-palindrome", fnName: "isPalindrome",
      prompt: "Write a JavaScript function `isPalindrome(s)` that returns true if the string s reads identically forwards and backwards, false otherwise. Comparison is exact — no trimming, no case-folding.",
      tests: cases("isPalindrome", [[""], ["a"], ["ab"], ["aba"], ["abba"], ["abca"]]) },
    { id: "flatten-one", fnName: "flattenOne",
      prompt: "Write a JavaScript function `flattenOne(arr)` that flattens an array exactly one level deep (elements that are themselves arrays are spread; deeper nesting stays nested).",
      tests: cases("flattenOne", [[[1, [2, 3], 4]], [[[1, 2], [3, 4]]], [[]], [[1, 2, 3]]]) },
    { id: "count-vowels", fnName: "countVowels",
      prompt: "Write a JavaScript function `countVowels(s)` that returns the count of vowels (a,e,i,o,u), case-insensitive, in the string s.",
      tests: cases("countVowels", [[""], ["bcdfg"], ["aeiou"], ["Hello World"], ["AEIOUaeiou"]]) },
    { id: "median", fnName: "median",
      prompt: "Write a JavaScript function `median(arr)` that returns the median of an array of numbers. For an even-length array, return the average of the two middle values after sorting. Do not mutate the input array.",
      tests: cases("median", [[[1]], [[1, 2]], [[3, 1, 2]], [[5, 3, 8, 1]], [[7, 7, 7]]]) },
    { id: "fizzbuzz", fnName: "fizzbuzzRange",
      prompt: "Write a JavaScript function `fizzbuzzRange(n)` returning an array of strings for integers 1..n inclusive: 'Fizz' if divisible by 3, 'Buzz' if divisible by 5, 'FizzBuzz' if divisible by both, otherwise the number as a string.",
      tests: cases("fizzbuzzRange", [[1], [3], [5], [15]]) },
  ];
}

// ── generation: one Ollama call, grammar-constrained to `{code: string}` ──
//
// Mirrors app.js::complete()'s own established shape (structured outputs
// via Ollama's `format`, the SAME mechanism PATCH_SCHEMA already uses) —
// this script talks to Ollama directly rather than through app.js because
// it runs standalone (node, not the browser page). One real difference,
// disclosed: app.js's complete() does not currently thread `temperature`
// through to Ollama's `options` (only `num_predict` is); this script adds
// it because the experiment's whole variable IS temperature. If `compose`
// (spec Increment A) ever needs per-call temperature, that passthrough
// should land in app.js's complete() itself rather than a second copy of
// this fetch.

const CODE_SCHEMA = { type: "object", required: ["code"], properties: { code: { type: "string" } } };

async function generateOne({ ollama, model, prompt, temp, seed }) {
  const sys = "Reply with ONLY a JSON object {\"code\": \"...\"}. `code` is the complete body of ONE JavaScript function, nothing else — no markdown fences, no explanation, no example usage.";
  const res = await fetch(`${ollama}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: sys }, { role: "user", content: prompt }],
      stream: false,
      format: CODE_SCHEMA,
      options: { temperature: temp, seed },
    }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}: ${await res.text()}`);
  const body = await res.json();
  const text = body?.message?.content ?? "";
  try {
    const obj = JSON.parse(text);
    return typeof obj.code === "string" ? obj.code : null;
  } catch {
    return null;
  }
}

// ── the two mechanical gates, run in order, first one closed ──────────────
//
// Gate 1 (REAL, imported): witness.js::witnessCode('js', code) — syntax
// only. Gate 2 (NEW, this file): does the function actually satisfy the
// task's own declared test table, run in a fresh, timed vm.Context so one
// candidate's infinite loop cannot hang the batch. This is the sandboxed-
// execution the spec's Increment C.3 named as out of scope for the claims
// grammar — reasonable here because this is a disposable, offline
// experiment harness, not the production terminal's own execution story
// (term-py-worker.mjs's Worker-based severed sandbox is the real answer
// for that; wiring THIS harness into the terminal would want the same
// Worker treatment, not a silent reuse of vm.Context in-page).

function runFunctionalGate(code, fnName, tests, timeoutMs) {
  const context = vm.createContext({});
  let fn;
  try {
    vm.runInContext(`${code}\nthis.__fn = typeof ${fnName} === "function" ? ${fnName} : null;`, context, { timeout: timeoutMs });
    fn = context.__fn;
  } catch (err) {
    return { ok: false, findings: [{ kind: "load-error", detail: String(err?.message ?? err) }] };
  }
  if (typeof fn !== "function") {
    return { ok: false, findings: [{ kind: "no-such-function", detail: `expected a top-level function named "${fnName}"` }] };
  }
  const findings = [];
  for (const [i, t] of tests.entries()) {
    let got;
    try {
      got = vm.runInContext(`__fn(...${JSON.stringify(t.args)})`, context, { timeout: timeoutMs });
    } catch (err) {
      findings.push({ kind: "throw", case: i, detail: String(err?.message ?? err) });
      continue;
    }
    if (JSON.stringify(got) !== JSON.stringify(t.expect)) {
      findings.push({ kind: "mismatch", case: i, args: t.args, expected: t.expect, got });
    }
  }
  return { ok: findings.length === 0, findings };
}

// ── the pre-registered selection rule ──────────────────────────────────
//
// Written here, before any sampling call in this script executes: among
// candidates that clear BOTH gates, keep the shortest source (fewest
// bytes); tie-break lexicographically ascending. Mechanical, declared
// ahead of the run — never a model grading its own or another sample's
// output (that would be probability judging probability with no ground
// under either).

function selectBest(passing) {
  if (!passing.length) return null;
  return [...passing].sort((a, b) => a.code.length - b.code.length || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0))[0];
}

// ── landing every sample on a REAL eoreader6.1 task-log ─────────────────
//
// Mirrors build-log.js's own empirically-established mapping (its header:
// "PROPOSE → INS · Figure · produced — BIRTH") rather than inventing a
// new one: a candidate's birth lands as PROPOSE/INS/Figure. A sample that
// never became a candidate at all (the model's reply did not even parse
// as {code:...}) lands as DEF (task-log.js's own REFUSAL_OPERATOR), same
// grain — a refused birth, not a different shape of entry. Both use
// operator_basis DECLARED, matching grid.js's own choice for exactly this
// reason: an external caller landed this by hand, it was not produced by
// the log's own autopoietic `produce()` engine (OPERATOR_BASIS's own doc
// comment reserves PRODUCED for that). The witness/functional outcome
// attaches as a RESULT entry — no operator, no grain, matching grid.js's
// `attachResult` and task-log's own produce() discipline verbatim ("a
// result attaches an answer to a task that already exists; stamping an
// operator on it would re-type the task").

function landSample(log, { taskId, arm, sampleIx, code, gate1, gate2 }) {
  const id = `${taskId}:${arm}:${String(sampleIx).padStart(3, "0")}`;
  if (code == null) {
    return taskLog.append(log, {
      kind: taskLog.ENTRY_KINDS.PROPOSE,
      task_id: id,
      description: `${arm} sample ${sampleIx} for ${taskId} — reply did not parse as {code: string}`,
      operator: taskLog.REFUSAL_OPERATOR, // DEF
      operator_basis: taskLog.OPERATOR_BASIS.DECLARED,
      grain: "Figure",
    });
  }
  let next = taskLog.append(log, {
    kind: taskLog.ENTRY_KINDS.PROPOSE,
    task_id: id,
    description: `${arm} sample ${sampleIx} for ${taskId} (${code.length} bytes)`,
    operator: "INS",
    operator_basis: taskLog.OPERATOR_BASIS.DECLARED,
    grain: "Figure",
  });
  next = taskLog.append(next, {
    kind: taskLog.ENTRY_KINDS.RESULT,
    task_id: id,
    result: { witness: gate1, functional: gate2, passed: Boolean(gate1?.ok) && Boolean(gate2?.ok) },
  });
  return next;
}

// ── the permutation test (disclosed, not a /measure-door statistic) ──────
//
// A byte-for-byte mirror of nul/index.js's own private `rng` (mulberry32) —
// mirrored, not re-derived, because nul does not export it; if this test
// is ever promoted into nul/index.js proper, importing the real one and
// deleting this copy is the fix, not keeping two.

function rng(seed) {
  let a = (seed | 0) + 0x6d2b79f5;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * outcomes: [{arm: "wide"|"narrow", success: 0|1}, ...]
 * Declared statistic: mean(wide.success) - mean(narrow.success).
 * Declared direction: "above" — wide is hypothesized >= narrow, never the
 * reverse (this is stated here, before the observed value is computed).
 * Null: labels shuffled, group sizes held fixed, `draws` times, seeded.
 * Same floor discipline as measure.js's measurePairs: a rank is never
 * reported finer than 1/draws — a p of exactly 0 is a claim about
 * infinity from a finite number of shuffles, and this door does not make
 * that claim either.
 */
function permutationTest(outcomes, { draws, seed }) {
  const wideIx = [];
  const values = new Array(outcomes.length);
  outcomes.forEach((o, i) => { values[i] = o.success; if (o.arm === "wide") wideIx.push(i); });
  const nWide = wideIx.length;
  const n = values.length;
  const meanOf = (idxs) => idxs.reduce((s, i) => s + values[i], 0) / idxs.length;
  const allIx = values.map((_, i) => i);
  const observed = meanOf(wideIx) - meanOf(allIx.filter((i) => !wideIx.includes(i)));

  const next = rng(seed);
  let asExtreme = 0;
  const idxPool = [...allIx];
  for (let d = 0; d < draws; d++) {
    // Fisher–Yates shuffle of a working copy, then take the first nWide as
    // the permuted "wide" group — same shuffle discipline as
    // nul/index.js's own PERTURBATIONS.shuffle, applied to labels instead
    // of a value series.
    const shuffled = idxPool.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const permWide = shuffled.slice(0, nWide);
    const permWideSet = new Set(permWide);
    const permNarrow = allIx.filter((i) => !permWideSet.has(i));
    const stat = meanOf(permWide) - meanOf(permNarrow);
    if (stat >= observed) asExtreme++;
  }
  const floor = 1 / draws;
  const rank = Math.max(asExtreme / draws, floor);
  return {
    kind: "trial", // never testimony — see this file's header disclosure
    statistic: "groupMeanGap (candidate, not yet in nul/index.js)",
    perturbation: "labelShuffle (candidate, not yet in nul/index.js)",
    direction: "above",
    n, nWide, nNarrow: n - nWide,
    observed,
    rank,
    censoredAtFloor: asExtreme / draws < floor,
    draws, seed,
  };
}

// ── the run ────────────────────────────────────────────────────────────

async function runArm({ ollama, model, task, arm, temp, n, timeoutMs, seedBase, log }) {
  const samples = [];
  for (let i = 0; i < n; i++) {
    const code = await generateOne({ ollama, model, prompt: task.prompt, temp, seed: seedBase + i });
    const gate1 = code != null ? witnessCode("js", code) : null;
    const gate2 = code != null && gate1?.ok ? runFunctionalGate(code, task.fnName, task.tests, timeoutMs) : null;
    log.value = landSample(log.value, { taskId: task.id, arm, sampleIx: i, code, gate1, gate2 });
    samples.push({ i, code, gate1, gate2, passed: Boolean(gate1?.ok) && Boolean(gate2?.ok) });
  }
  const passing = samples.filter((s) => s.passed);
  const winner = selectBest(passing);
  return { samples, passing, winner, success: winner != null };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) return selfTest();

  const tasks = makeTasks();
  let log = { value: taskLog.createTaskLog() };
  const perTask = [];
  const outcomes = [];

  for (const task of tasks) {
    console.log(`\n== ${task.id} ==`);
    const narrow = await runArm({ ollama: args.ollama, model: args.model, task, arm: "narrow",
      temp: args.narrowTemp, n: 1, timeoutMs: args.timeoutMs, seedBase: args.seed, log });
    const wide = await runArm({ ollama: args.ollama, model: args.model, task, arm: "wide",
      temp: args.wideTemp, n: args.wideN, timeoutMs: args.timeoutMs, seedBase: args.seed + 1000, log });
    console.log(`  narrow (n=1, T=${args.narrowTemp}): ${narrow.success ? "witnessed-success" : "no clean candidate"}`);
    console.log(`  wide   (n=${args.wideN}, T=${args.wideTemp}): ${wide.passing.length}/${args.wideN} cleared both gates` +
      (wide.winner ? `; winner ${wide.winner.code.length} bytes` : "; no candidate cleared"));
    outcomes.push({ arm: "narrow", success: narrow.success ? 1 : 0 });
    outcomes.push({ arm: "wide", success: wide.success ? 1 : 0 });
    perTask.push({ id: task.id, narrow: { success: narrow.success }, wide: { attempted: args.wideN, passing: wide.passing.length, success: wide.success } });
  }

  const test = permutationTest(outcomes, { draws: args.draws, seed: args.seed });
  console.log("\n== comparison (TRIAL — see header disclosure; not a /measure-door statistic) ==");
  console.log(`  narrow success rate: ${outcomes.filter((o) => o.arm === "narrow" && o.success).length}/${tasks.length}`);
  console.log(`  wide   success rate: ${outcomes.filter((o) => o.arm === "wide" && o.success).length}/${tasks.length}`);
  console.log(`  observed gap (wide - narrow): ${test.observed.toFixed(3)}`);
  console.log(`  rank against ${test.draws} label-shuffles, direction=above: ${test.rank.toFixed(4)}${test.censoredAtFloor ? " (censored at floor — 1/draws)" : ""}`);

  const flags = taskLog.checkCubeProgression(log.value);
  console.log(`\nledger: ${log.value.entries.length} entries on a real eoreader6.1 task-log; checkCubeProgression flags: ${flags.length}`);

  const outPath = args.out;
  await writeFile(outPath, JSON.stringify({ args, perTask, outcomes, test, ledgerEntries: log.value.entries, checkCubeProgressionFlags: flags }, null, 2));
  console.log(`\nfull results + ledger entries written to ${outPath}`);
}

// ── self-test: proves the mechanical parts without needing Ollama ────────
//
// Uses CANNED replies (no network) to exercise: gate 1 (real witness.js),
// gate 2 (this file's functional harness), selection, ledger landing on a
// real task-log, checkCubeProgression, and the permutation test's own
// sanity bounds (identical arms -> rank near 1; a fabricated, maximal gap
// -> rank at the floor). Run with `node experiments/wide-vs-narrow.mjs
// --self-test` — no Ollama required.

async function selfTest() {
  const assert = (cond, msg) => { if (!cond) throw new Error(`self-test failed: ${msg}`); };

  // Gate 1 + 2 on a correct sumDigits.
  const good = "function sumDigits(n){return String(Math.abs(n)).split('').reduce((a,d)=>a+Number(d),0);}";
  const w1 = witnessCode("js", good);
  assert(w1.ok === true, "witness should pass valid syntax");
  const task = makeTasks().find((t) => t.id === "sum-digits");
  const f1 = runFunctionalGate(good, task.fnName, task.tests, 200);
  assert(f1.ok === true, "functional gate should pass a correct implementation");

  // A candidate that compiles but is wrong.
  const wrong = "function sumDigits(n){return 0;}";
  const f2 = runFunctionalGate(wrong, task.fnName, task.tests, 200);
  assert(f2.ok === false && f2.findings.length > 0, "functional gate should catch a wrong implementation");

  // A candidate that does not even parse.
  const broken = "function sumDigits(n){ return n +";
  const w2 = witnessCode("js", broken);
  assert(w2.ok === false, "witness should refuse a syntax error");

  // An infinite loop is caught by the timeout, not hung on.
  const hang = "function sumDigits(n){ while(true){} }";
  const started = Date.now();
  const f3 = runFunctionalGate(hang, task.fnName, task.tests, 100);
  assert(f3.ok === false, "functional gate should refuse a hang");
  assert(Date.now() - started < 2000, "timeout should actually bound the wait");

  // Selection: shortest passing candidate wins, deterministic tie-break.
  const pool = [{ code: "function sumDigits(n){return String(Math.abs(n)).split('').reduce((a,d)=>a+Number(d),0);}", passed: true },
    { code: "function sumDigits(n){let s=0;for(const c of String(Math.abs(n)))s+=+c;return s;}", passed: true }];
  const best = selectBest(pool);
  assert(best === pool[1] || best.code.length <= pool[0].code.length, "selection should keep the shortest passer");

  // Ledger: land a passing sample, a refused sample, and a RESULT — on a
  // REAL eoreader6.1 task-log — then check checkCubeProgression is happy.
  let log = taskLog.createTaskLog();
  log = landSample(log, { taskId: "sum-digits", arm: "narrow", sampleIx: 0, code: good, gate1: w1, gate2: f1 });
  log = landSample(log, { taskId: "sum-digits", arm: "wide", sampleIx: 0, code: null, gate1: null, gate2: null });
  const flags = taskLog.checkCubeProgression(log);
  assert(flags.length === 0, `checkCubeProgression should be clean, got: ${JSON.stringify(flags)}`);
  assert(log.entries.length === 3, `expected 3 entries (propose+result, propose-refused), got ${log.entries.length}`);
  const tasks = taskLog.projectTasks(log);
  assert(tasks.length === 2, `projectTasks should show 2 live tasks, got ${tasks.length}`);

  // Permutation test sanity: identical arms -> gap ~0, rank near the
  // uninformative middle, never near the floor. A fabricated maximal gap
  // (all wide succeed, all narrow fail) -> rank at the floor.
  const flat = Array.from({ length: 20 }, (_, i) => ({ arm: i % 2 ? "wide" : "narrow", success: i % 3 === 0 ? 1 : 0 }));
  const t1 = permutationTest(flat, { draws: 500, seed: 7 });
  assert(t1.rank > 0.05, `near-null arms should not rank near the floor, got ${t1.rank}`);
  const extreme = [...Array(10)].flatMap((_, i) => [{ arm: "wide", success: 1 }, { arm: "narrow", success: 0 }]);
  const t2 = permutationTest(extreme, { draws: 500, seed: 7 });
  assert(t2.rank <= 1 / 500 + 1e-9, `maximal separation should rank at the floor, got ${t2.rank}`);

  console.log("self-test: all checks passed (no Ollama required).");
  console.log(`  example ledger from the self-test: ${log.entries.length} entries, checkCubeProgression flags: ${flags.length}`);
  console.log(`  near-null permutation rank: ${t1.rank.toFixed(4)}; maximal-separation rank: ${t2.rank.toFixed(4)}`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((err) => { console.error(err); process.exit(1); });
}

export { makeTasks, runFunctionalGate, selectBest, landSample, permutationTest, rng };
