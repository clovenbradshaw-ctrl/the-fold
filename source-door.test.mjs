// source-door.test.mjs — the /source door and the auto-source path, all
// pure walls. The act of saving (sourceTurn/addSource) is browser wiring
// and is not tested here; what is tested is every decision that decides
// what gets saved and under what name.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  SOURCE_AUTO_MIN_CHARS,
  isAutoSourceCandidate,
  parseSourceCommand,
  nextPastedName,
  previewSavedText,
} from "./source-door.js";

test("isAutoSourceCandidate: a block over the floor is material", () => {
  const big = "word ".repeat(Math.ceil(SOURCE_AUTO_MIN_CHARS / 5) + 1);
  assert.ok(big.length > SOURCE_AUTO_MIN_CHARS);
  assert.equal(isAutoSourceCandidate(big), true);
});

test("isAutoSourceCandidate: a short message is a question", () => {
  assert.equal(isAutoSourceCandidate("what river is Nashville on?"), false);
  assert.equal(isAutoSourceCandidate(""), false);
});

test("isAutoSourceCandidate: a slash line is a command, never hijacked", () => {
  const hugeSlash = "/task\n" + "word ".repeat(SOURCE_AUTO_MIN_CHARS);
  assert.equal(isAutoSourceCandidate(hugeSlash), false, "a /task with a long body is still a door");
  assert.equal(isAutoSourceCandidate("/" + "x".repeat(SOURCE_AUTO_MIN_CHARS)), false);
});

test("isAutoSourceCandidate: the floor is the exact declared cut", () => {
  assert.equal(isAutoSourceCandidate("a".repeat(SOURCE_AUTO_MIN_CHARS)), true);
  assert.equal(isAutoSourceCandidate("a".repeat(SOURCE_AUTO_MIN_CHARS - 1)), false);
});

test("parseSourceCommand: not a /source line is null (door falls through)", () => {
  assert.equal(parseSourceCommand("hello world"), null);
  assert.equal(parseSourceCommand(""), null);
  assert.equal(parseSourceCommand("/run python\nprint(1)"), null);
});

test("parseSourceCommand: first line names the source, rest is content", () => {
  const out = parseSourceCommand("/source hamlin.txt\nHannibal Hamlin was Lincoln's vice president.");
  assert.deepEqual(out, { name: "hamlin.txt", text: "Hannibal Hamlin was Lincoln's vice president." });
});

test("parseSourceCommand: a name is optional", () => {
  const out = parseSourceCommand("/source\nThis is the content, no name given.");
  assert.deepEqual(out, { name: null, text: "This is the content, no name given." });
});

test("parseSourceCommand: content keeps its own newlines and blank lines", () => {
  const out = parseSourceCommand("/source a.txt\nline one\n\nline three");
  assert.deepEqual(out, { name: "a.txt", text: "line one\n\nline three" });
});

test("parseSourceCommand: no content at all is a usage ask, never a save", () => {
  assert.deepEqual(parseSourceCommand("/source"), { usage: true });
  assert.deepEqual(parseSourceCommand("/source my-file.txt"), { usage: true });
  assert.deepEqual(parseSourceCommand("/source\n   "), { usage: true });
});

test("parseSourceCommand: the door name is not case-sensitive", () => {
  const out = parseSourceCommand("/Source notes.txt\nContent.");
  assert.deepEqual(out, { name: "notes.txt", text: "Content." });
});

test("nextPastedName: first unnamed source is pasted.txt, then pasted-N", () => {
  assert.equal(nextPastedName([]), "pasted.txt");
  assert.equal(nextPastedName(["pasted.txt"]), "pasted-2.txt");
  assert.equal(nextPastedName(["pasted.txt", "pasted-2.txt", "other.txt"]), "pasted-3.txt");
});

test("previewSavedText: shows the first line, truncated with an ellipsis", () => {
  assert.equal(previewSavedText("a short first line\nmore"), "a short first line");
  const long = "x".repeat(200);
  assert.equal(previewSavedText(long), "x".repeat(140) + "…");
  assert.equal(previewSavedText(""), "(no visible first line)");
});