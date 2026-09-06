import test from "node:test";
import assert from "node:assert/strict";
import { quotedSpan, unquoted, quotes } from "./quoting.js";

test("a clean pair is taken as itself; nested or unbalanced quoting is taken WHOLE, first mark to last", () => {
  assert.equal(quotedSpan('He said "the harbor light was built in 1841" yesterday.'), "the harbor light was built in 1841");
  // The live failure: taking the FIRST span returned a two-word fragment.
  const nested = 'Earlier we established from pg2600.txt that: ""Both true and untrue," Lincoln began; but Prince Andrew interrupted him." Remind me.';
  const got = quotedSpan(nested);
  // The inner quote marks belong to the span — it is quoted material verbatim.
  assert.match(got, /Both true and untrue,. Lincoln began; but Prince Andrew interrupted him\.$/);
  assert.ok(got.includes("Lincoln began"), "the whole claim, not the first inner fragment");
  assert.equal(quotedSpan("nothing quoted here at all"), null);
  assert.equal(quotedSpan('a "tiny" one'), null, "too short to be a claim");
});

test("unquoted is the complement — the person's own words, which is what a detector must read", () => {
  const nested = 'Earlier I asked you: "Which of these is earlier, 1805 or 1841, and how far apart?" What did you answer then?';
  const own = unquoted(nested);
  assert.match(own, /^Earlier I asked you:\s+What did you answer then\?$/);
  assert.doesNotMatch(own, /earlier, 1805/, "the quoted comparison is not the person's ask");
  assert.equal(unquoted("no quotes here"), "no quotes here");
  assert.ok(quotes(nested));
  assert.ok(!quotes("no quotes here"));
});
