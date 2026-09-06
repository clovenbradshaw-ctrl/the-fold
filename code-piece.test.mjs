import test from "node:test";
import assert from "node:assert/strict";
import { namesFor, skeletonFor, snipFor, spliceFunction, failingFunction, modelShare, stepWitnesses, stubMissing, modelRegions, didYouMean, renameCalls, qualifyCalls, moduleProbe, importedModules } from "./code-piece.js";

const features = ["simulates 100 dice rolls", "counts each face", "prints a histogram"];

test("SIG: names off the clauses, verb first, unique; INS/CON/SYN: a runnable skeleton with a pipeline main, no model", () => {
  assert.deepEqual(namesFor(features), ["simulates_dice_rolls", "counts_face", "prints_histogram"]);
  const sk = skeletonFor("python", "simulate dice", features);
  assert.match(sk.code, /def simulates_dice_rolls\(\):\n    """simulates 100 dice rolls"""\n    raise NotImplementedError/);
  assert.match(sk.code, /def counts_face\(previous\):/);
  assert.match(sk.code, /r1 = simulates_dice_rolls\(\)\n[^\n]*\n    r2 = counts_face\(r1\)\n[^\n]*\n    r3 = prints_histogram\(r2\)/, "the pipeline, one witness line between steps");
  assert.match(sk.code, /if __name__ == "__main__":\n    main\(\)/);
  const js = skeletonFor("js", "clock", ["shows the time", "ticks every second"]);
  assert.match(js.code, /const r2 = ticks_second\(r1\);/);
});

test("SEG: the snip shows one function only; the splice replaces that function alone and refuses a reply that is not it", () => {
  const sk = skeletonFor("python", "simulate dice", features);
  const snip = snipFor("python", sk.code, "counts_face", features[1]);
  assert.match(snip.region, /^def counts_face\(previous\):/);
  assert.doesNotMatch(snip.region, /simulates_100_dice_rolls|prints_histogram/);
  assert.match(snip.ask, /Write the body of counts_face/);
  const reply = "Sure:\n```python\ndef counts_face(previous):\n    counts = {}\n    for r in previous:\n        counts[r] = counts.get(r, 0) + 1\n    return counts\n```\nDone.";
  const sp = spliceFunction("python", sk.code, "counts_face", reply);
  assert.equal(sp.refused, null);
  assert.match(sp.code, /def counts_face\(previous\):\n    counts = \{\}/);
  assert.doesNotMatch(sp.code, /NotImplementedError\("counts_face"\)/);
  assert.match(sp.code, /NotImplementedError\("simulates_dice_rolls"\)/, "the other stubs are untouched");
  assert.match(sp.code, /def main\(\):/);
  const bad = spliceFunction("python", sk.code, "counts_face", "```python\ndef something_else():\n    pass\n```");
  assert.equal(bad.refused.type, "not_the_function");
  assert.ok(modelShare(sp.modelChars, sp.code.length) < 0.5, "the model wrote less than half");
});

test("REC: the failing function is read off the traceback", () => {
  const names = ["simulates_dice_rolls", "counts_face", "prints_histogram"];
  assert.equal(failingFunction("python", 'Traceback (most recent call last):\n  File "<exec>", line 20, in <module>\n  File "<exec>", line 17, in main\n  File "<exec>", line 9, in counts_face\nTypeError: bad', names), "counts_face");
  assert.equal(failingFunction("python", 'NotImplementedError: prints_histogram', names), "prints_histogram");
  assert.equal(failingFunction("python", "SyntaxError: invalid syntax", names), null);
});

test("EVA per step and INS in dependency order: main witnesses each step's value; a name the run says is undefined becomes a stub before main; the model's share is measured off the final code", () => {
  const sk = skeletonFor("python", "dice", features);
  assert.match(sk.code, /print\(f"\[step 2 counts_face\] \{type\(r2\).__name__\}: \{repr\(r2\)\[:120\]\}"\)/, "the witness rides stdout — stderr is the sandbox's failure channel");
  const w = stepWitnesses("[step 1 simulates_dice_rolls] list: [3, 5, 1]\n[step 2 counts_face] dict: {3: 1}\nTraceback…");
  assert.deepEqual(w, { simulates_dice_rolls: "list: [3, 5, 1]", counts_face: "dict: {3: 1}" });
  const snip = snipFor("python", sk.code, "counts_face", features[1], { previousClause: features[0], previousValue: w.simulates_dice_rolls, nextClause: features[2] });
  assert.match(snip.ask, /`previous` is the result of the step before, which simulates 100 dice rolls — when run it was list: \[3, 5, 1\]\. Return what the next step needs; the next step prints a histogram\./);
  const st = stubMissing("python", sk.code, "NameError: name 'calculate_histogram' is not defined");
  assert.equal(st.name, "calculate_histogram");
  assert.match(st.code, /def calculate_histogram\(\*args, \*\*kwargs\):[\s\S]*\ndef main\(\):/);
  assert.equal(stubMissing("python", st.code, "NameError: name 'calculate_histogram' is not defined").name, null, "already stubbed");
  assert.equal(stubMissing("python", sk.code, "TypeError: bad").name, null);
  const filled = spliceFunction("python", sk.code, "counts_face", "```python\ndef counts_face(previous):\n    return {r: previous.count(r) for r in set(previous)}\n```").code;
  const regions = modelRegions("python", filled, ["counts_face"]);
  assert.ok(regions > 40 && regions < filled.length / 3);
});

test("mechanical name repairs from the runtime's own witness: the traceback's did-you-mean renames call sites; a probe-found module qualifies them", () => {
  const dym = didYouMean("NameError: name 'simulate_dice_rolls' is not defined. Did you mean: 'simulates_dice_rolls'?");
  assert.deepEqual(dym, { wrong: "simulate_dice_rolls", right: "simulates_dice_rolls" });
  const code = "def a():\n    return simulate_dice_rolls(3) + randint(1, 6) + x.randint(2)\n";
  const r1 = renameCalls(code, "simulate_dice_rolls", "simulates_dice_rolls");
  assert.equal(r1.count, 1); assert.match(r1.code, /simulates_dice_rolls\(3\)/);
  const r2 = qualifyCalls(r1.code, "randint", "random");
  assert.equal(r2.count, 1, "an already-qualified call is left alone"); assert.match(r2.code, /random\.randint\(1, 6\) \+ x\.randint\(2\)/);
  assert.deepEqual(importedModules("python", '"""x"""\nimport random\nimport sys\n\ndef f(): pass\n'), ["random", "sys"]);
  assert.match(moduleProbe("python", "randint", ["random", "sys"]), /hasattr\(__import__\(m\), "randint"\)/);
  assert.equal(didYouMean("TypeError: bad"), null);
});
