import test from "node:test";
import assert from "node:assert/strict";
import { detectLongForm, longFormTask, WORDS_PER_PAGE } from "./longform.js";

test("a writing ask with a stated length is long-form; the size comes from the number, the topic from the ask's own 'on'/'about'", () => {
  const lf = detectLongForm("write me a 30 page essay on the x files");
  assert.deepEqual(lf, { pages: 30, words: 15000, sections: 23, kind: "essay", topic: "the x files" });
  assert.equal(detectLongForm("Write a 30-page essay on The X-Files.").topic, "The X-Files");
  assert.equal(detectLongForm("draft a 2,000 word report about the harbor").sections, 4);
  assert.equal(detectLongForm("draft a 2,000 word report about the harbor").pages, Math.round(2000 / WORDS_PER_PAGE));
  assert.equal(detectLongForm("write a 5 page memo on tides https://example.org/tides").topic, "tides", "a page address is the named-source path's, not the topic");
});

test("no length, no writing verb, or a typed door → not long-form", () => {
  assert.equal(detectLongForm("write me an essay on the x files"), null, "no counted property");
  assert.equal(detectLongForm("what happened on page 30 of the report?"), null, "no writing verb");
  assert.equal(detectLongForm("/essay 30 the x files"), null, "a door is a door");
  assert.equal(detectLongForm("summarize these 30 pages"), null);
});

test("the task restates the size as a number the planner is bound by", () => {
  const t = longFormTask(detectLongForm("write me a 30 page essay on the x files"));
  assert.match(t, /^Write a 30-page essay on the x files\. Plan it as exactly 23 sections/);
});
