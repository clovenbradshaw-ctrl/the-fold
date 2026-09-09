import test from "node:test";
import assert from "node:assert/strict";
import { functionsIn, mergeCode, MERGE_LANGS } from "./merge-code.js";
import { skeletonFor, spliceFunction } from "./code-piece.js";

const dice = `"""simulates 100 dice rolls"""
import random


def simulates_dice_rolls():
    """simulates 100 dice rolls"""
    rolls = [0 for _ in range(100)]
    for _ in range(100):
        rolls[random.randint(0, 5)] += 1
    return rolls


def counts_face(previous):
    """counts each face"""
    return previous


def main():
    r1 = simulates_dice_rolls()
    print(f"[step 1 simulates_dice_rolls] {type(r1).__name__}: {repr(r1)[:120]}")
    r2 = counts_face(r1)
    print(f"[step 2 counts_face] {type(r2).__name__}: {repr(r2)[:120]}")
    return r2


if __name__ == "__main__":
    main()
`;

const coins = `"""simulates 20 coin flips"""
import random


def simulates_coin_flips():
    """simulates 20 coin flips"""
    return [random.choice([0, 1]) for _ in range(20)]


def counts_heads_vs_tails(previous):
    """counts heads vs tails"""
    return {"heads": previous.count(1), "tails": previous.count(0)}


def main():
    r1 = simulates_coin_flips()
    print(f"[step 1 simulates_coin_flips] {type(r1).__name__}: {repr(r1)[:120]}")
    r2 = counts_heads_vs_tails(r1)
    print(f"[step 2 counts_heads_vs_tails] {type(r2).__name__}: {repr(r2)[:120]}")
    return r2


if __name__ == "__main__":
    main()
`;

test("functionsIn: every top-level python def, in source order, with its own body", () => {
  const fns = functionsIn("python", dice);
  assert.deepEqual(fns.map((f) => f.name), ["simulates_dice_rolls", "counts_face", "main"]);
  assert.match(fns[0].body, /^def simulates_dice_rolls\(\):/);
  assert.doesNotMatch(fns[0].body, /counts_face/);
});

test("functionsIn: js, brace-counted so a nested function inside another does not end the outer body early", () => {
  const js = `function outer() {\n  function inner() {\n    return 1;\n  }\n  return inner();\n}\n\nfunction other() {\n  return 2;\n}\n`;
  const fns = functionsIn("js", js);
  assert.deepEqual(fns.map((f) => f.name), ["outer", "other"]);
  assert.match(fns[0].body, /function inner\(\)/, "the nested function stays inside outer's own body");
  assert.doesNotMatch(fns[0].body, /function other/);
});

test("functionsIn: an unsupported language or non-string code returns empty, never a guess", () => {
  assert.deepEqual(functionsIn("ruby", "def x\nend"), []);
  assert.deepEqual(functionsIn("python", null), []);
  assert.deepEqual(MERGE_LANGS, ["python", "js"]);
});

test("mergeCode: brings the source's non-colliding functions in before target's own main, target's pipeline untouched", () => {
  const r = mergeCode("python", dice, coins);
  assert.equal(r.ok, true);
  assert.deepEqual(r.brought, ["simulates_coin_flips", "counts_heads_vs_tails"]);
  // Both programs' own functions are present.
  assert.match(r.code, /def simulates_dice_rolls\(\):/);
  assert.match(r.code, /def counts_face\(previous\):/);
  assert.match(r.code, /def simulates_coin_flips\(\):/);
  assert.match(r.code, /def counts_heads_vs_tails\(previous\):/);
  // Target's own main is still the pipeline it always was — nothing rewired.
  assert.match(r.code, /def main\(\):\n    r1 = simulates_dice_rolls\(\)/);
  // The brought functions land before main, not after it.
  assert.ok(r.code.indexOf("def simulates_coin_flips") < r.code.indexOf("def main():"));
  // The result is real python: no dangling reference, both mains never collide (only one `def main`).
  assert.equal((r.code.match(/^def main\(\):/gm) ?? []).length, 1);
});

test("mergeCode: a name both programs define refuses the WHOLE merge, atomic, naming the collision", () => {
  const target = "def helper():\n    return 1\n\n\ndef main():\n    return helper()\n";
  const source = "def helper():\n    return 2\n\n\ndef other():\n    return 3\n\n\ndef main():\n    return other()\n";
  const r = mergeCode("python", target, source);
  assert.equal(r.ok, false);
  assert.equal(r.gap.kind, "name_collision");
  // main() collides too (both define it) — named, not silently dropped.
  assert.deepEqual(r.gap.names.sort(), ["helper", "main"]);
});

test("mergeCode: nothing to bring when every source function is already named in target", () => {
  const r = mergeCode("python", dice, dice);
  assert.equal(r.ok, false);
  assert.equal(r.gap.kind, "nothing_to_bring");
});

test("mergeCode: an unsupported language refuses by name, never silently merges as text", () => {
  const r = mergeCode("ruby", "def x\nend", "def y\nend");
  assert.equal(r.ok, false);
  assert.equal(r.gap.kind, "unsupported_lang");
});

test("mergeCode: js merge lands past the brace-counted body correctly, target's own main() untouched", () => {
  const target = `function greet() {\n  return "hi";\n}\n\nfunction main() {\n  console.log(greet());\n}\n\nmain();\n`;
  const source = `function farewell() {\n  if (true) {\n    return "bye";\n  }\n  return "";\n}\n\nfunction main() {\n  console.log(farewell());\n}\n\nmain();\n`;
  const r = mergeCode("js", target, source);
  assert.equal(r.ok, true);
  assert.deepEqual(r.brought, ["farewell"]);
  assert.match(r.code, /function farewell\(\) \{\n  if \(true\) \{\n    return "bye";\n  \}\n  return "";\n\}/);
  assert.match(r.code, /function main\(\) \{\n  console\.log\(greet\(\)\);\n\}/, "target's own main is unchanged");
});

test("real code-piece.js output merges cleanly — the shape codePieceTurn actually produces, not a hand-typed fixture", () => {
  const skA = skeletonFor("python", "adds two numbers", ["adds two numbers"]);
  const filledA = spliceFunction("python", skA.code, skA.names[0], "```python\ndef adds_two_numbers():\n    return 2 + 2\n```").code;
  const skB = skeletonFor("python", "multiplies two numbers", ["multiplies two numbers"]);
  const filledB = spliceFunction("python", skB.code, skB.names[0], "```python\ndef multiplies_two_numbers():\n    return 3 * 3\n```").code;
  const r = mergeCode("python", filledA, filledB);
  assert.equal(r.ok, true);
  assert.deepEqual(r.brought, ["multiplies_two_numbers"]);
  assert.match(r.code, /def adds_two_numbers\(\):\n    return 2 \+ 2/);
  assert.match(r.code, /def multiplies_two_numbers\(\):\n    return 3 \* 3/);
  assert.equal((r.code.match(/^def main\(\):/gm) ?? []).length, 1);
});
