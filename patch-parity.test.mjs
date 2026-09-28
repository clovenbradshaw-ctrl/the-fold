// patch-parity.test.mjs — build-log.js's patch physics (PATCH_OPS, deriveOp,
// readOps, applyOps) and eoreader7's native/the-fold/patch.js are the same
// mechanism, ported verbatim (patch.js's own header says so) and never yet
// mechanically held together — CLAUDE.md's own postmortems (P22, P24, P39)
// keep finding exactly this class of drift, twice-typed physics that quietly
// diverge. This is the wall: run BOTH modules against one shared battery of
// representative inputs and assert the two sides land on byte-identical
// output, for every branch each file's own JSDoc names.
//
// Deliberately behavioral parity (assert.deepStrictEqual on outputs), never
// a source-text diff — the two files' surrounding comments are intentionally
// different (patch.js trims build-log.js's longer narrative prose), so a
// literal text-equality check would need comment-stripping logic of its own
// and would be more fragile than just running both against real inputs.

import test from "node:test";
import assert from "node:assert/strict";

import {
  PATCH_OPS as PATCH_OPS_A,
  deriveOp as deriveOp_A,
  readOps as readOps_A,
  applyOps as applyOps_A,
} from "./build-log.js";

import {
  PATCH_OPS as PATCH_OPS_B,
  deriveOp as deriveOp_B,
  readOps as readOps_B,
  applyOps as applyOps_B,
} from "../eoreader7/native/the-fold/patch.js";

test("PATCH_OPS is the identical closed vocabulary on both sides", () => {
  assert.deepStrictEqual([...PATCH_OPS_A], [...PATCH_OPS_B]);
});

// --- deriveOp: every branch its own JSDoc names -----------------------

const DERIVE_OP_CASES = [
  ["add is the empty string", { find: "old", add: "" }],
  ["add is not a string at all", { find: "old", add: undefined }],
  ["add equals find exactly (the add !== find guard keeps this off INS)", { find: "abc", add: "abc" }],
  ["add contains find with only bytes after it", { find: "abc", add: "abcXYZ" }],
  ["add contains find with bytes before AND after (recompilation, not two acts)", { find: "abc", add: "XYZabcQRS" }],
  ["add does not contain find at all", { find: "abc", add: "xyz" }],
];

for (const [name, input] of DERIVE_OP_CASES) {
  test(`deriveOp parity: ${name}`, () => {
    assert.deepStrictEqual(deriveOp_A(input), deriveOp_B(input));
  });
}

// --- readOps: the raw model-shaped deltas, normalized ------------------

const READ_OPS_CASES = [
  ["raw is not an array", "not-an-array"],
  ["raw is an empty array", []],
  ["entries missing a usable find are dropped", [{ add: "x" }, { find: "", add: "y" }]],
  [
    "a mixed batch exercising SEG/INS/SYN derivation together",
    [
      { find: "old", add: "" },
      { find: "abc", add: "abc" },
      { find: "abc", add: "abcXYZ" },
      { find: "abc", add: "XYZabcQRS" },
      { find: "abc", add: "xyz" },
    ],
  ],
];

for (const [name, input] of READ_OPS_CASES) {
  test(`readOps parity: ${name}`, () => {
    assert.deepStrictEqual(readOps_A(input), readOps_B(input));
  });
}

// --- applyOps: the mechanical apply, every branch its own JSDoc names --

const SAMPLE_CODE = "function greet(name) {\n  return 'Hello, ' + name;\n}\n";
const AMBIG_CODE = "// TODO: fix this\nfunction f(){}\n// TODO: fix that\n";

// within's in-range slice: exactly the anchor text "function greet(name) {"
const WITHIN_START = SAMPLE_CODE.indexOf("function");
const WITHIN_END = WITHIN_START + "function greet(name) {".length;

const APPLY_OPS_CASES = [
  ["a clean SEG landing once", SAMPLE_CODE, [{ op: "SEG", find: "'Hello, '" }], {}],
  [
    "a clean INS landing once",
    SAMPLE_CODE,
    [{ op: "INS", find: "function greet(name) {", add: "\n  console.log('called');" }],
    {},
  ],
  ["a clean SYN landing once", SAMPLE_CODE, [{ op: "SYN", find: "Hello, ", add: "Hi, " }], {}],
  ["find absent -> unlocated gap", SAMPLE_CODE, [{ op: "SEG", find: "totallyNotPresent" }], {}],
  ["find ambiguous, every:false -> ambiguous gap", AMBIG_CODE, [{ op: "SEG", find: "// TODO:" }], { every: false }],
  [
    "find ambiguous, every:true -> the multi-site rescue, touched count included",
    AMBIG_CODE,
    [{ op: "SYN", find: "// TODO:", add: "// DONE:" }],
    { every: true },
  ],
  ["malformed: op outside PATCH_OPS", SAMPLE_CODE, [{ op: "XXX", find: "function" }], {}],
  ["malformed: SEG with no find", SAMPLE_CODE, [{ op: "SEG" }], {}],
  ["malformed: INS with add not a string", SAMPLE_CODE, [{ op: "INS", find: "function", add: 123 }], {}],
  ["malformed: SYN with add not a string", SAMPLE_CODE, [{ op: "SYN", find: "function", add: null }], {}],
  [
    "within: an in-range [a, b) slice",
    SAMPLE_CODE,
    [{ op: "SEG", find: "greet" }],
    { within: [WITHIN_START, WITHIN_END] },
  ],
  [
    "within: an out-of-range [a, b) slice (b past code.length)",
    SAMPLE_CODE,
    [{ op: "SEG", find: "greet" }],
    { within: [0, SAMPLE_CODE.length + 100] },
  ],
];

for (const [name, code, ops, opts] of APPLY_OPS_CASES) {
  test(`applyOps parity: ${name}`, () => {
    assert.deepStrictEqual(applyOps_A(code, ops, opts), applyOps_B(code, ops, opts));
  });
}
