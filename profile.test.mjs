// profile.test.mjs — the "about you" ledger, held to its words.
import test from "node:test";
import assert from "node:assert/strict";

import { createLog, propose, addKept, keep, dismiss, edit, remove, pending, kept, merge, entryId, CATEGORIES, looksSelfReferential } from "./profile.js";

test("looksSelfReferential passes genuine first-person statements", () => {
  assert.ok(looksSelfReferential("By the way, I'm a nurse and I love gardening on weekends."));
  assert.ok(looksSelfReferential("hey, I'm Alex, nice to meet you"));
  assert.ok(looksSelfReferential("I prefer dark mode in every app I use."));
  assert.ok(looksSelfReferential("My name is Jordan."));
  assert.ok(looksSelfReferential("I work as a nurse."));
  assert.ok(looksSelfReferential("I'm building a game in Godot."));
});

test("looksSelfReferential refuses ordinary questions and requests — the exact live failure this gate exists to prevent", () => {
  // Measured live (2026-09-09): asked to freely judge this message,
  // gemma2:2b answered the question ("Paris") instead of judging it. The
  // gate must keep a message like this from ever reaching the model.
  assert.equal(looksSelfReferential("What's the capital of France?"), false);
  assert.equal(looksSelfReferential("can you help me debug this function?"), false);
  assert.equal(looksSelfReferential("write a python function that adds two numbers"), false);
});

test("propose refuses blank text and an unlisted category", async () => {
  await assert.rejects(() => propose(createLog(), { text: "  ", category: "fact" }));
  await assert.rejects(() => propose(createLog(), { text: "likes tea", category: "vibe" }));
});

test("propose lands a pending entry; the same content proposed twice is a no-op", async () => {
  let log = await propose(createLog(), { text: "works on the-fold", category: "project" });
  assert.equal(pending(log).length, 1);
  assert.equal(pending(log)[0].status, "pending");
  const before = log;
  log = await propose(log, { text: "works on the-fold", category: "project" });
  assert.equal(log, before); // literally the same object — a true no-op
});

test("propose treats the same text under a different category as a different entry", async () => {
  let log = await propose(createLog(), { text: "loves hiking", category: "preference" });
  log = await propose(log, { text: "loves hiking", category: "fact" });
  assert.equal(log.entries.length, 2);
});

test("keep/dismiss/edit/remove move exactly one entry, by id", async () => {
  let log = await propose(createLog(), { text: "prefers dark mode", category: "preference" });
  const id = log.entries[0].id;
  log = keep(log, id);
  assert.equal(kept(log).length, 1);
  assert.equal(pending(log).length, 0);

  log = dismiss(log, id);
  assert.equal(kept(log).length, 0);
  assert.equal(log.entries[0].status, "dismissed");

  log = edit(log, id, "  prefers light mode  ");
  assert.equal(log.entries[0].text, "prefers light mode");
  assert.equal(log.entries[0].status, "kept"); // editing revives a dismissed entry

  log = remove(log, id);
  assert.equal(log.entries.length, 0);
});

test("addKept lands directly as kept, and is idempotent against a prior pending/kept entry", async () => {
  let log = await addKept(createLog(), { text: "goes by Mo", category: "identity" });
  assert.equal(kept(log).length, 1);
  const again = await addKept(log, { text: "goes by Mo", category: "identity" });
  assert.equal(again, log); // already known — never resets a dismissed entry back to kept silently
});

test("entryId is stable for the same content and differs on category or text", async () => {
  const a = await entryId({ text: "likes coffee", category: "preference" });
  const b = await entryId({ text: "likes coffee", category: "preference" });
  const c = await entryId({ text: "likes coffee", category: "fact" });
  const d = await entryId({ text: "likes tea", category: "preference" });
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.notEqual(a, d);
});

test("merge is a last-write-wins union by id — the whole cross-device sync mechanism", async () => {
  let local = await propose(createLog(), { text: "based in Chicago", category: "fact" });
  const id = local.entries[0].id;
  local = keep(local, id);

  // The remote copy dismissed the same fact, LATER than the local keep.
  let remote = { entries: [{ ...local.entries[0], status: "dismissed", updatedAt: local.entries[0].updatedAt + 1000 }] };

  const merged = merge(local, remote);
  assert.equal(merged.entries.length, 1);
  assert.equal(merged.entries[0].status, "dismissed"); // the later write wins

  // A fact known only locally and one known only remotely both survive.
  const onlyLocal = await propose(createLog(), { text: "only here", category: "fact" });
  const onlyRemote = await propose(createLog(), { text: "only there", category: "fact" });
  const both = merge(onlyLocal, onlyRemote);
  assert.equal(both.entries.length, 2);
});

test("CATEGORIES is the closed set propose/edit are checked against", () => {
  assert.ok(CATEGORIES.includes("preference"));
  assert.ok(CATEGORIES.includes("fact"));
});
