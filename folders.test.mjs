// folders.test.mjs — the Folds panel's bucket, held to its words.
import test from "node:test";
import assert from "node:assert/strict";

import { UNFILED, addFolder, removeFolder, filterByFolder, folderCounts } from "./folders.js";

const rows = (folder) => folder;
const row = (n, folder) => ({ n, entry: { folder: folder ?? null } });

test("addFolder appends a new name and refuses a blank or duplicate one", () => {
  assert.deepEqual(addFolder([], "Research"), ["Research"]);
  assert.deepEqual(addFolder(["Research"], "Drafts"), ["Research", "Drafts"]);
  assert.deepEqual(addFolder(["Research"], "Research"), ["Research"]);
  assert.deepEqual(addFolder(["Research"], "  "), ["Research"]);
  assert.deepEqual(addFolder(["Research"], ""), ["Research"]);
});

test("addFolder trims the name it adds", () => {
  assert.deepEqual(addFolder([], "  Drafts  "), ["Drafts"]);
});

test("removeFolder drops exactly the named folder", () => {
  assert.deepEqual(removeFolder(["Research", "Drafts"], "Research"), ["Drafts"]);
  assert.deepEqual(removeFolder(["Research"], "Nope"), ["Research"]);
});

test("filterByFolder with no folder given returns every row, untouched", () => {
  const all = [row(1, "Research"), row(2, null)];
  assert.deepEqual(filterByFolder(all, null, ["Research"]), all);
  assert.deepEqual(filterByFolder(all, "all", ["Research"]), all);
});

test("filterByFolder by name keeps only that folder's rows", () => {
  const all = [row(1, "Research"), row(2, "Drafts"), row(3, "Research")];
  assert.deepEqual(filterByFolder(all, "Research", ["Research", "Drafts"]).map((r) => r.n), [1, 3]);
});

test("filterByFolder UNFILED keeps rows with no folder AND rows whose folder was deleted", () => {
  const all = [row(1, null), row(2, "Research"), row(3, "Ghost")];
  // "Ghost" was removed from the live list but a fold still names it —
  // dangling references count as unfiled, never as invisible.
  assert.deepEqual(filterByFolder(all, UNFILED, ["Research"]).map((r) => r.n), [1, 3]);
});

test("folderCounts tallies live folders and unfiled together, dangling names included", () => {
  const all = [row(1, null), row(2, "Research"), row(3, "Research"), row(4, "Ghost")];
  const { byFolder, unfiled } = folderCounts(all, ["Research", "Drafts"]);
  assert.equal(byFolder.get("Research"), 2);
  assert.equal(byFolder.get("Drafts"), 0);
  assert.equal(unfiled, 2); // row 1 (no folder) and row 4 (dangling "Ghost")
});
