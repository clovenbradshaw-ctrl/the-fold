import test from "node:test";
import assert from "node:assert/strict";
import { diffLines, diffLinesBounded, DIFF_MAX_CELLS } from "./line-diff.js";

test("identical texts diff to all-same lines", () => {
  const t = "a\nb\nc";
  assert.deepEqual(diffLines(t, t), [
    { type: "same", line: "a" },
    { type: "same", line: "b" },
    { type: "same", line: "c" },
  ]);
});

test("a pure addition is same lines plus one add, in place", () => {
  assert.deepEqual(diffLines("a\nb", "a\nb\nc"), [
    { type: "same", line: "a" },
    { type: "same", line: "b" },
    { type: "add", line: "c" },
  ]);
});

test("a pure removal is same lines plus one remove", () => {
  assert.deepEqual(diffLines("a\nb\nc", "a\nc"), [
    { type: "same", line: "a" },
    { type: "remove", line: "b" },
    { type: "same", line: "c" },
  ]);
});

test("a changed line is a remove and an add, with unaffected context kept same", () => {
  assert.deepEqual(diffLines("def f():\n    return 1\n", "def f():\n    return 2\n"), [
    { type: "same", line: "def f():" },
    { type: "remove", line: "    return 1" },
    { type: "add", line: "    return 2" },
    { type: "same", line: "" },
  ]);
});

test("empty old text is all additions; empty new text is all removals", () => {
  assert.deepEqual(diffLines("", "x\ny"), [
    { type: "remove", line: "" },
    { type: "add", line: "x" },
    { type: "add", line: "y" },
  ]);
  assert.deepEqual(diffLines("x\ny", ""), [
    { type: "remove", line: "x" },
    { type: "remove", line: "y" },
    { type: "add", line: "" },
  ]);
});

test("diffLinesBounded matches diffLines under the cap, and refuses (null) over it", () => {
  assert.deepEqual(diffLinesBounded("a\nb", "a\nb\nc"), diffLines("a\nb", "a\nb\nc"));
  const big = Array.from({ length: 2100 }, (_, i) => `line ${i}`).join("\n");
  assert.equal(2100 * 2100 > DIFF_MAX_CELLS, true, "the fixture actually crosses the declared cap");
  assert.equal(diffLinesBounded(big, big), null);
});
