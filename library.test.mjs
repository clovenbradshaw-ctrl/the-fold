// library.test.mjs — the library organ's pure half: what a folded ledger of
// adds and removes settles to. No filesystem, no server; explore-server.mjs
// exercises the write side (add-ref / upload / remove) by hand.

import { test } from "node:test";
import assert from "node:assert/strict";
import { foldLibrary, sanitizeFileName, LIBRARY_UPLOAD_MAX_BYTES } from "./library.js";

test("foldLibrary: an add appears, a later remove excludes it, order is newest-added-first", () => {
  const jsonl = [
    JSON.stringify({ id: "a", event: "add", name: "one.txt", addedAt: "2026-01-01T00:00:00Z" }),
    JSON.stringify({ id: "b", event: "add", name: "two.txt", addedAt: "2026-01-02T00:00:00Z" }),
    JSON.stringify({ id: "b", event: "remove" }),
  ].join("\n");
  const { entries, skipped } = foldLibrary(jsonl);
  assert.equal(skipped, 0);
  assert.deepEqual(entries.map((e) => e.name), ["one.txt"]);
});

test("foldLibrary: last write wins per id — a second add for the same id replaces the first", () => {
  const jsonl = [
    JSON.stringify({ id: "a", event: "add", name: "draft.txt", addedAt: "2026-01-01T00:00:00Z" }),
    JSON.stringify({ id: "a", event: "add", name: "renamed.txt", addedAt: "2026-01-03T00:00:00Z" }),
  ].join("\n");
  const { entries } = foldLibrary(jsonl);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].name, "renamed.txt");
});

test("foldLibrary: unparseable lines and lines with no id or unknown event are counted, never silently dropped", () => {
  const jsonl = ["not json", JSON.stringify({ name: "no id here" }), JSON.stringify({ id: "x", event: "mystery" }), JSON.stringify({ id: "a", event: "add", name: "real.txt", addedAt: "2026-01-01T00:00:00Z" })].join("\n");
  const { entries, skipped } = foldLibrary(jsonl);
  assert.equal(skipped, 3);
  assert.equal(entries.length, 1);
});

test("foldLibrary: an empty or absent ledger folds to an empty library — the starting state", () => {
  assert.deepEqual(foldLibrary(""), { entries: [], skipped: 0 });
  assert.deepEqual(foldLibrary(undefined), { entries: [], skipped: 0 });
});

test("foldLibrary: newest addedAt sorts first", () => {
  const jsonl = [
    JSON.stringify({ id: "a", event: "add", name: "older.txt", addedAt: "2026-01-01T00:00:00Z" }),
    JSON.stringify({ id: "b", event: "add", name: "newer.txt", addedAt: "2026-06-01T00:00:00Z" }),
  ].join("\n");
  const { entries } = foldLibrary(jsonl);
  assert.deepEqual(entries.map((e) => e.name), ["newer.txt", "older.txt"]);
});

// ── sanitizeFileName ─────────────────────────────────────────────────────────
test("sanitizeFileName: a path separator in a NAME is an attempted route, not a label — it is replaced, not honored", () => {
  assert.equal(sanitizeFileName("../../etc/passwd"), ".._.._etc_passwd");
  assert.equal(sanitizeFileName("a\\b\\c.txt"), "a_b_c.txt");
});

test("sanitizeFileName: control characters are stripped; ordinary punctuation, spaces, and hyphens survive", () => {
  assert.equal(sanitizeFileName("my report - final (v2).pdf"), "my report - final (v2).pdf");
  assert.equal(sanitizeFileName("bad\x00name\x1f.txt"), "badname.txt");
});

test("sanitizeFileName: empty or all-control input never returns empty", () => {
  assert.equal(sanitizeFileName(""), "upload");
  assert.equal(sanitizeFileName("\x00\x01\x02"), "upload");
  assert.equal(sanitizeFileName(null), "upload");
});

test("sanitizeFileName: caps length", () => {
  const long = "a".repeat(500) + ".txt";
  assert.ok(sanitizeFileName(long).length <= 180);
});

test("LIBRARY_UPLOAD_MAX_BYTES is declared and generous enough for real media", () => {
  assert.ok(LIBRARY_UPLOAD_MAX_BYTES > 50_000_000);
});
