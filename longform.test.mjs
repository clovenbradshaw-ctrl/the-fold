import test from "node:test";
import assert from "node:assert/strict";
import { detectLongForm, longFormTask, WORDS_PER_PAGE, detectCodePiece, isCodeSource, inScope, headingsOf, topicTerms } from "./longform.js";

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

test("a program asked for by its shape: a building verb, a runtime the registry names, and the features the ask enumerates", () => {
  const cp = detectCodePiece("write me a python program that simulates 100 dice rolls, counts each face, and prints a histogram", { runtimes: ["fold", "js", "python", "sql"] });
  assert.equal(cp.lang, "python");
  assert.deepEqual(cp.features, ["simulates 100 dice rolls", "counts each face", "prints a histogram"]);
  assert.equal(cp.parts, 3);
  assert.equal(detectCodePiece("build a javascript widget that shows a clock", { runtimes: ["js"] }).lang, "js", "an alias resolves to the registry's name");
  assert.equal(detectCodePiece("write me a 30 page essay on the x files", { runtimes: ["js", "python"] }), null, "no runtime named → not a program");
  assert.equal(detectCodePiece("what does the python program print?", { runtimes: ["python"] }), null, "no spec → not a build");
  assert.equal(detectCodePiece("/run python\nprint(1)", { runtimes: ["python"] }), null);
});

test("a code source is known by its name, never read as prose (P113)", () => {
  assert.equal(isCodeSource("holon.js"), true);
  assert.equal(isCodeSource("notes.js#0-400"), true);
  assert.equal(isCodeSource("THE-NULL-STATES.md"), false);
  assert.equal(isCodeSource("web:en.wikipedia.org-0"), false);
});

test("scope (P114): a source is in a piece's scope only when it carries every content word of the topic; the sources' own headings are read as an outline", () => {
  assert.deepEqual(topicTerms("the Battle of Borodino"), ["battle", "borodino"]);
  assert.equal(inScope("the Battle of Borodino", "Tolstoy wrote of the battle at Borodino."), true);
  assert.equal(inScope("the Battle of Borodino", "The X-Files aired on Fox."), false);
  assert.equal(inScope("the x files", "The X-Files is a series."), true, "a hyphenated name folds to its words");
  const para = "It was filmed in Vancouver for its first five seasons before moving to Los Angeles, a change the producers made for the leads and the studio noted at the time in press.";
  const h = headingsOf(`The X-Files\n\n${para}\n\nProduction\n\n${para}\n\nSee also\n\n- Michael W. Watkins\n\nLowry 1995 , p. 257\n\nMain article: List of episodes\n\nCasting and characters\n\n${para}\n\nInfobox row\n\nShort next line.\n`);
  assert.deepEqual(h, ["The X-Files", "Production", "Casting and characters"], "a heading heads a paragraph; list items, citations and infobox rows are not headings");
});

test("P136: a passage is prose or code by what it IS, not what it is called — a rendered article is not source code", () => {
  // The live bug: `.html` was in the code list, so every passage of a rendered
  // encyclopaedia article was dropped from prosePassages — the pool that feeds
  // the snips, the obligations, the cast and the referent check. In one run
  // the Lincoln article was retrieved 439 times and was invisible to all of them.
  assert.equal(isCodeSource("wikipedia-abraham-lincoln.html#0-500", "On April 14, 1865, Lincoln was fatally shot by John Wilkes Booth at Ford Theatre."), false);
  assert.equal(isCodeSource("lincoln.html#0-128", "Abraham Lincoln signed the Yosemite Grant in 1864."), false);
  // Raw markup that was never rendered is still code-like, decided by the text.
  assert.equal(isCodeSource("raw.html#0-90", '<div class="a"><span><p><b>x</b></p></span></div><ul><li><a href="#">y</a></li></ul>'), true);
  // Real code is unchanged, and prose in any container is prose.
  assert.equal(isCodeSource("react-dom.js#0-50", "var RootDidNotComplete = 6;"), true);
  assert.equal(isCodeSource("pg2600.txt#0-100", "Well, Prince, so Genoa and Lucca are now just family estates."), false);
  assert.equal(isCodeSource("Luke.xml#0-90", "Herod was king of Judea when Zacharias served in the temple."), false);
  // Called without text, the extension still decides — every existing caller.
  assert.equal(isCodeSource("react-dom.js"), true);
  assert.equal(isCodeSource("pg2600.txt"), false);
});
