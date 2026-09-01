// code-scout.test.mjs — conformance for the referent scout and the
// byte-derived delta. Run against the REAL eoreader6.1 nul/index.js (house
// style: real modules, no stubs) — the exact file whose measured failures
// (eval/results/local-llm-nul-index-improve-RESULTS.md) this organ exists
// to close: scoutSpan anchoring on incidental words instead of the named
// identifier, a not-found control returning a wrong span instead of
// refusing, and model-authored {find} strings corrupting arenas under the
// every:true rescue.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import * as enginePriors from "../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/priors.js";
import * as taskLog from "../eoreader7/legacy-eoreader6.1/packages/engine/holon/task-log.js";
import { declaredReferents, scoutDefinition, deltaOps, extractDeclaration } from "./code-scout.js";
import { makeBuildLog } from "./build-log.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const NUL = readFileSync(join(HERE, "..", "eoreader7", "legacy-eoreader6.1", "nul", "index.js"), "utf8");
const SUFFIXES = enginePriors.INFLECTIONAL_SUFFIXES;
const buildLog = makeBuildLog(taskLog);

// The three instructions are the MEASURED run's own, verbatim — the
// comparability anchor: same asks, better instrument.
const GROUND_ASK =
  "ground validates that draws and window are integers >= 2 with a typed gap, but it never validates seed at all even though seed is used arithmetically (seed + d) in the sampling loop right below. Add a check that seed is an integer, returning a typed gap (using the same gap(...) helper already used for draws and window) if it is not.";
const DIFFERENCE_ASK =
  "In difference, censoredAt is computed unconditionally at the top (const censoredAt = 1 / s.length) even though it is only ever used inside the two exceeds_witness gap branches below it. Move the censoredAt computation so it is only computed inside those two branches that actually use it, instead of on every call.";
const WITNESS_ASK =
  'In witness, the check `if (!p || typeof p.moved !== "boolean") return gap("made_no_difference", { reason: "pattern not established" });` also fires when p is itself a gap object returned by pattern() for a real reason (like incommensurate_extent or unreceived_origin), silently relabeling that real failure as made_no_difference and losing its actual detail. Add a check so that if p is already a gap (isGap(p) is true), witness returns p directly instead of relabeling it.';

test("declaredReferents finds nul's real top-level declarations with whole-statement spans", () => {
  const decls = declaredReferents(NUL);
  const names = new Set(decls.map((d) => d.name));
  for (const expected of ["ground", "difference", "witness", "pattern", "isGap", "gap", "LICENSED", "extremeGround"])
    assert.ok(names.has(expected), `missing declaration: ${expected}`);
  const ground = decls.find((d) => d.name === "ground");
  const slice = NUL.slice(ground.start, ground.end);
  assert.ok(slice.startsWith("export const ground = ({ material"), "span starts at the declaration");
  assert.ok(slice.trimEnd().endsWith("};"), "span ends at the statement's own close");
  // Brace balance of the span itself — the walker's whole claim.
  const opens = (slice.match(/{/g) ?? []).length;
  const closes = (slice.match(/}/g) ?? []).length;
  assert.equal(opens, closes, "the snipped definition is brace-balanced");
});

test("an inner const is not a top-level referent — censoredAt is defined contextually within difference", () => {
  const decls = declaredReferents(NUL);
  assert.ok(!decls.some((d) => d.name === "censoredAt"));
});

test("the ground instruction resolves to ground's own definition, not a frequency arena", () => {
  const r = scoutDefinition(GROUND_ASK, NUL, SUFFIXES);
  assert.equal(r.name, "ground");
  assert.ok(NUL.slice(r.span[0], r.span[1]).startsWith("export const ground ="));
});

test("the difference instruction resolves to difference — exceeds_witness never leaks a witness match", () => {
  const r = scoutDefinition(DIFFERENCE_ASK, NUL, SUFFIXES);
  assert.equal(r.name, "difference");
  assert.ok(NUL.slice(r.span[0], r.span[1]).startsWith("export const difference ="));
});

test("the witness instruction resolves to witness by quotation among four real candidates", () => {
  const r = scoutDefinition(WITNESS_ASK, NUL, SUFFIXES);
  assert.equal(r.name, "witness", `resolved ${JSON.stringify(r)}`);
  assert.ok(NUL.slice(r.span[0], r.span[1]).startsWith("export const witness ="));
  // The instruction names witness, pattern, isGap AND gap — all genuinely
  // declared. Two refuted scorers (distinct-word containment: pattern 28 vs
  // witness 11; exclusive-word voting: pattern 14 vs witness 3 — both
  // length/comment-prose biases, kept in code-scout.js's own header) lost
  // this case; the quotation run wins it because the instruction carries a
  // verbatim quote of witness's own guard line, and the winning run must be
  // decisively longer than the runner-up's.
  assert.ok(r.candidates.length >= 3, "the disambiguation was real, not a single-candidate walkover");
  assert.ok(r.candidates[0].score > r.candidates[1].score, "strict max, not a coin flip");
});

test("an instruction naming nothing declared refuses — the frobnicate hole is closed", () => {
  const r = scoutDefinition("fix the frobnicate function", NUL, SUFFIXES);
  assert.equal(r.gap, "no_referent_named");
});

test('"make it better" refuses — an underspecified instruction reaches zero model calls', () => {
  const r = scoutDefinition("make it better", NUL, SUFFIXES);
  assert.equal(r.gap, "no_referent_named");
});

test("deltaOps round-trips an insertion through applyOps's strict wall", () => {
  const decls = declaredReferents(NUL);
  const w = decls.find((d) => d.name === "witness");
  const before = NUL.slice(w.start, w.end);
  // The correct isGap fix, as a whole-function regeneration would carry it:
  const after = before.replace(
    'if (!p || typeof p.moved !== "boolean")',
    'if (isGap(p)) return p;\n  if (!p || typeof p.moved !== "boolean")',
  );
  const op = deltaOps(before, after);
  assert.ok(op, "a real change derives an op");
  // Unique by construction — the strict wall lands it, no rescue.
  const applied = buildLog.applyOps(before, [{ op: "SYN", find: op.find, add: op.add }], {});
  assert.ok(applied.ok, `strict apply landed: ${JSON.stringify(applied.gap ?? null)}`);
  assert.equal(applied.code, after, "the landing reproduces the model's own text byte-for-byte");
});

test("deltaOps grows its anchor past a repeated line until unique", () => {
  const before = "const a = 1;\ncall(x);\nmid();\ncall(x);\nconst z = 9;\n";
  const after = "const a = 1;\ncall(x);\nmid();\ncall(y);\nconst z = 9;\n";
  const op = deltaOps(before, after);
  assert.ok(op);
  assert.equal(before.split(op.find).length - 1, 1, "find occurs exactly once in before");
  const applied = buildLog.applyOps(before, [{ op: "SYN", find: op.find, add: op.add }], {});
  assert.ok(applied.ok);
  assert.equal(applied.code, after);
});

test("deltaOps on identical text is churn — null, the log's own refusal decides", () => {
  assert.equal(deltaOps("same", "same"), null);
});

test("extractDeclaration reads a fenced regeneration and restores a dropped export with disclosure", () => {
  const reply =
    "Here is the corrected function:\n```js\nconst witness = ({ ground: g, figure, pattern: p }) => {\n  return null;\n};\n```\nThis adds the check.";
  const r = extractDeclaration(reply, "witness", { exported: true });
  assert.ok(r);
  assert.ok(r.text.startsWith("export const witness ="));
  assert.equal(r.exportRestored, true);
  const bare = extractDeclaration(reply, "nothingHere", { exported: true });
  assert.equal(bare, null);
});

test("the walker is not fooled by braces inside strings or comments", () => {
  const code = 'export const f = () => {\n  const s = "not a { brace";\n  // } not a close\n  return s;\n};\nexport const g = 1;\n';
  const decls = declaredReferents(code);
  const f = decls.find((d) => d.name === "f");
  assert.ok(code.slice(f.start, f.end).trimEnd().endsWith("};"));
  assert.ok(decls.some((d) => d.name === "g"));
});
