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
// ── nameForPaste: a pasted source named from what it is, with its giver ────
import { nameForPaste } from "./source-door.js";

test("nameForPaste: a title the person gives is the name, and the giver is the person", () => {
  const r = nameForPaste("Ulysses S. Grant was born in Point Pleasant, Ohio, in 1822.", { title: "Grant birthplace notes" });
  assert.equal(r.name, "grant-birthplace-notes.txt");
  assert.equal(r.giver.kind, "person");
  assert.equal(r.title, "Grant birthplace notes");
});

test("nameForPaste: with no title, the text's own title page, then its heading line, then its first sentence names it — each says which", () => {
  const book = "The Project Gutenberg eBook of Dracula\n\nTitle: Dracula\nAuthor: Bram Stoker\n\n*** START OF THE PROJECT GUTENBERG EBOOK DRACULA ***\n\nCHAPTER I\n\nJonathan Harker's Journal.";
  const t = nameForPaste(book);
  assert.equal(t.name, "dracula.txt"); assert.equal(t.giver.rule, "title-page");
  const md = nameForPaste("# Quarterly Budget Review\n\nThe committee met on Tuesday and approved the spending plan.");
  assert.equal(md.name, "quarterly-budget-review.txt"); assert.equal(md.giver.rule, "heading");
  const bare = nameForPaste("Library hours\nThe branch opens at nine on weekdays and closes at six.");
  assert.equal(bare.name, "library-hours.txt"); assert.equal(bare.giver.rule, "heading");
  const prose = nameForPaste("Ulysses S. Grant was born in Point Pleasant, Ohio, in 1822. Grant led the Union armies to victory in the Civil War.");
  assert.equal(prose.giver.rule, "first-sentence");
  assert.match(prose.name, /^ulysses-s-grant-was-born-in-point-pleasant/, "the initial stays inside the first sentence");
  assert.ok(prose.name.length <= "".padEnd(48).length + ".txt".length, prose.name);
  assert.equal(prose.giver.kind, "text");
});

test("nameForPaste: a sentence-shaped first line is not a heading; names never collide; nothing nameable falls back to pasted.txt", () => {
  const two = nameForPaste("The observatory opened in 1889.\nIt closed in 1932.");
  assert.equal(two.giver.rule, "first-sentence", "a first line ending in a full stop is a sentence, not a heading");
  const taken = nameForPaste("# Budget\n\nNumbers follow.", { existingNames: ["budget.txt", "budget-2.txt"] });
  assert.equal(taken.name, "budget-3.txt");
  const empty = nameForPaste("... !!! ...", { existingNames: [] });
  assert.equal(empty.name, "pasted.txt"); assert.equal(empty.giver.rule, "fallback");
  const nonLatin = nameForPaste("# Война и мир\n\nТекст.");
  assert.equal(nonLatin.name, "война-и-мир.txt", "letters of any script survive the slug");
});
