// node --test counting.test.mjs
//
// Conformance against the JS engine alone, PLUS a real, independent Python
// interpreter (python3, genuinely installed in this environment — the
// same real language term.js::runSandboxed("python", …) runs via pyodide
// in the browser; CPython here and pyodide's WASM CPython there share the
// identical string semantics, so this is a faithful stand-in for the
// production cross-check, not a mock of it). If the two engines ever
// disagreed, that would be a real bug in one of them — this file's own
// adversarial cases exist to make sure they don't, on real, tricky
// specimens: case folding, a multi-character needle, Unicode.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

import {
  detectCounting, occurrenceCount, classCount, wordCount,
  pythonSnippetFor, checkCounting, unquoteCounting,
} from "./counting.js";

/** A REAL python3 subprocess, shaped exactly like term.js::runSandboxed's
 * own return value — the identical contract frontier-25.mjs's own
 * `witness(task, answer, {runPython})` already establishes for a "run"
 * task, reused here rather than invented fresh. */
function runPython(code) {
  const r = spawnSync("python3", ["-c", code], { encoding: "utf8", timeout: 15000 });
  if (r.error) return { code: null, stdout: "", stderr: String(r.error.message), timedOut: r.error.code === "ETIMEDOUT" };
  return { code: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "", timedOut: false };
}

test("detectCounting: the canonical specimen, several real phrasings", () => {
  assert.deepEqual(detectCounting("How many times does the letter r appear in strawberry?"), { kind: "occurrence", needle: "r", haystack: "strawberry" });
  assert.deepEqual(detectCounting("how many r's are in strawberry"), { kind: "occurrence", needle: "r", haystack: "strawberry" });
  assert.deepEqual(detectCounting("How many r's does strawberry have?"), { kind: "occurrence", needle: "r", haystack: "strawberry" });
  assert.deepEqual(detectCounting("Count the number of r's in strawberry."), { kind: "occurrence", needle: "r", haystack: "strawberry" });
  assert.deepEqual(detectCounting("count the letter r in strawberry"), { kind: "occurrence", needle: "r", haystack: "strawberry" });
});

test("detectCounting: a casual preamble does not defeat the door (arithmetic.js's own stripCasualPreamble, reused)", () => {
  assert.deepEqual(detectCounting("quick one -- how many r's are in strawberry?"), { kind: "occurrence", needle: "r", haystack: "strawberry" });
});

test("detectCounting: quoted needle and haystack are unquoted", () => {
  assert.deepEqual(detectCounting(`How many times does 'r' appear in "strawberry"?`), { kind: "occurrence", needle: "r", haystack: "strawberry" });
});

test("detectCounting: vowels and consonants, both phrasings", () => {
  assert.deepEqual(detectCounting("How many vowels are in programming?"), { kind: "class", cls: "vowels", haystack: "programming" });
  assert.deepEqual(detectCounting("how many consonants does programming have?"), { kind: "class", cls: "consonants", haystack: "programming" });
});

test("detectCounting: word count, both phrasings", () => {
  assert.deepEqual(detectCounting("How many words are in the quick brown fox?"), { kind: "words", haystack: "the quick brown fox" });
  assert.deepEqual(detectCounting("how many words does the quick brown fox have?"), { kind: "words", haystack: "the quick brown fox" });
});

test("detectCounting: a real question about the world, or the material, is never claimed", () => {
  assert.equal(detectCounting("How many people live in Nashville?"), null);
  assert.equal(detectCounting("What's 17 times 24?"), null);
  assert.equal(detectCounting("How many vice presidents did Lincoln have?"), null);
});

test("occurrenceCount: the canonical strawberry specimen", () => {
  assert.equal(occurrenceCount("r", "strawberry"), 3);
});

test("occurrenceCount: case-insensitive, and a multi-character needle counts non-overlapping (String.split's own convention)", () => {
  assert.equal(occurrenceCount("R", "STRAWBERRY"), 3);
  assert.equal(occurrenceCount("ss", "Mississippi"), 2, "positions 2-3 and 5-6, non-overlapping — 'sss' would double-count the middle s otherwise");
  assert.equal(occurrenceCount("issi", "Mississippi"), 1, "the SECOND 'issi' overlaps the first at its own 's' — a non-overlapping count is 1, not 2");
});

test("occurrenceCount: an empty needle is nothing to count, never zero", () => {
  assert.equal(occurrenceCount("", "strawberry"), null);
});

test("occurrenceCount: a code point, not a UTF-16 code unit — an astral character is one character, not two", () => {
  assert.equal(occurrenceCount("😀", "😀 hello 😀 world"), 2);
});

test("classCount: vowels and consonants exclude digits, spaces and punctuation", () => {
  assert.equal(classCount("vowels", "programming"), 3, "o, a, i");
  assert.equal(classCount("consonants", "programming"), 8, "p, r, g, r, m, m, n, g");
  assert.equal(classCount("vowels", "rhythm 123!"), 0);
});

test("wordCount: whitespace-delimited, a hyphenated compound is one word", () => {
  assert.equal(wordCount("the quick brown fox"), 4);
  assert.equal(wordCount("state-of-the-art design"), 2);
  assert.equal(wordCount(""), 0);
});

test("unquoteCounting: strips a leading/trailing quote of any of the accepted marks", () => {
  assert.equal(unquoteCounting(`"strawberry"`), "strawberry");
  assert.equal(unquoteCounting("“strawberry”"), "strawberry");
  assert.equal(unquoteCounting("'r'"), "r");
});

test("checkCounting: the JS engine alone (no runPython injected) — computed, not generated, byte-identical to before this door existed for every OTHER question", () => {
  return (async () => {
    const found = await checkCounting("How many r's are in strawberry?");
    assert.equal(found.value, 3);
    assert.equal(found.display, "3");
    assert.equal(found.verified, null, "no second engine was offered — never dressed up as confirmed");
    assert.equal(await checkCounting("What's 17 times 24?"), null, "arithmetic.js's own door claims this one, not counting.js");
  })();
});

// ── THE CROSS-CHECK, against a REAL, independent Python interpreter ────────
let pythonAvailable = null;
function havePython() {
  if (pythonAvailable === null) {
    try { pythonAvailable = spawnSync("python3", ["--version"], { encoding: "utf8" }).status === 0; }
    catch { pythonAvailable = false; }
  }
  return pythonAvailable;
}

test("pythonSnippetFor: a real, mechanically-built snippet — never model text — that a real interpreter can run", { skip: !havePython() && "python3 is not installed in this environment" }, () => {
  const found = detectCounting("How many r's are in strawberry?");
  const code = pythonSnippetFor(found);
  const r = runPython(code);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.stdout.trim(), "3");
});

test("checkCounting: JS and a REAL independent python3 agree on the canonical specimen, and the answer discloses it was cross-checked", { skip: !havePython() && "python3 is not installed in this environment" }, () => {
  return (async () => {
    const found = await checkCounting("How many r's are in strawberry?", { runPython });
    assert.equal(found.value, 3);
    assert.deepEqual(found.verified, { ok: true });
  })();
});

test("checkCounting: JS and REAL python3 agree across a real adversarial battery — case folding, a multi-char needle, vowels, word count, Unicode", { skip: !havePython() && "python3 is not installed in this environment" }, () => {
  return (async () => {
    const questions = [
      "How many times does the letter s appear in Mississippi?",
      "How many ss's are in Mississippi?",
      "How many vowels does antidisestablishmentarianism have?",
      "How many consonants are in Nashville?",
      "How many words does the quick brown fox jumps over the lazy dog have?",
      "How many times does the letter é appear in café résumé?",
    ];
    for (const q of questions) {
      const found = await checkCounting(q, { runPython });
      assert.ok(found, `should claim: ${q}`);
      assert.ok(!found.gap, `should not gap on: ${q} (${found.gap})`);
      assert.deepEqual(found.verified, { ok: true }, `JS/python should agree on: ${q}`);
    }
  })();
});

test("checkCounting: a real disagreement between the two engines is a typed gap, never silently resolved (the manufactured-disagreement control)", () => {
  return (async () => {
    // A deliberately WRONG runPython stand-in — proves the disagreement path
    // actually refuses to ship a number, rather than always agreeing because
    // nothing ever tests the branch that disagrees.
    const wrongRunPython = async () => ({ code: 0, stdout: "999", stderr: "", timedOut: false });
    const found = await checkCounting("How many r's are in strawberry?", { runPython: wrongRunPython });
    assert.ok(found.gap, "a disagreement must be a typed gap");
    assert.equal(found.jsValue, 3);
    assert.equal(found.pyValue, 999);
    assert.equal(found.value, undefined, "no value ships when the two engines disagree");
  })();
});

test("checkCounting: a runPython that throws is disclosed as an unverified cross-check, never a crash and never silently dropped", () => {
  return (async () => {
    const throwingRunPython = async () => { throw new Error("worker boot failed"); };
    const found = await checkCounting("How many r's are in strawberry?", { runPython: throwingRunPython });
    assert.equal(found.value, 3, "the JS answer still ships");
    assert.equal(found.verified.ok, false);
    assert.match(found.verified.detail, /worker boot failed/);
  })();
});

test("checkCounting: a timed-out cross-check is disclosed, the JS answer still ships", () => {
  return (async () => {
    const timedOutRunPython = async () => ({ code: null, stdout: "", stderr: "", timedOut: true });
    const found = await checkCounting("How many r's are in strawberry?", { runPython: timedOutRunPython });
    assert.equal(found.value, 3);
    assert.deepEqual(found.verified, { ok: false, detail: "the python cross-check timed out" });
  })();
});
