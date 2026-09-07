import test from "node:test";
import assert from "node:assert/strict";
import { findMisquote, misquoteFacts, misquoteGuard, citedSource, MATCH_FLOOR, MIN_TOKENS, MAX_DIFFS } from "./misquote.js";

const passages = [
  { ref: "pg2600.txt#100-400", source: "pg2600.txt", text: '"Both true and untrue," Pierre began; but Prince Andrew interrupted him. He laughed disagreeably.' },
  { ref: "wikipedia-abraham-lincoln.html#0-300", source: "wikipedia-abraham-lincoln.html", text: "On April 14, 1865, Lincoln was fatally shot by John Wilkes Booth at Ford Theatre." },
];

test("the live failure: one name swapped in a quotation is caught, and the material says what it should have been", () => {
  const f = findMisquote('"Both true and untrue," Lincoln began; but Prince Andrew interrupted him.', passages, { cited: "pg2600.txt" });
  assert.equal(f.misquoted, true);
  assert.deepEqual(f.said, ["Lincoln"]);
  assert.deepEqual(f.shouldBe, ["Pierre"]);
  assert.equal(f.ref, "pg2600.txt#100-400");
  assert.ok(f.matched > 0.85);
  // The facts handed over are POSITIVE — the misquotation is never repeated back (P126).
  const facts = misquoteFacts(f);
  assert.match(facts, /What that passage actually says \[pg2600\.txt#100-400, bytes \d+–\d+\]: "Both true and untrue," Pierre began/);
  assert.doesNotMatch(facts, /Lincoln/);
  // The false token is kept by the instrument, to keep it out of the answer.
  assert.deepEqual(misquoteGuard(f).map((g) => g.value), ["Lincoln"]);
});

test("an accurate quotation is not a misquote, and an unrelated one is not matched at all (controls)", () => {
  const exact = findMisquote('"Both true and untrue," Pierre began; but Prince Andrew interrupted him.', passages, { cited: "pg2600.txt" });
  assert.equal(exact.misquoted, false);
  assert.equal(exact.matched, 1);
  assert.equal(findMisquote("The turbines were serviced quarterly by the contractor here", passages, {}), null);
  assert.equal(findMisquote("too short", passages, {}), null, `under ${MIN_TOKENS} tokens is not aligned`);
  assert.ok(MATCH_FLOOR > 0 && MATCH_FLOOR < 1);
});

test("scope follows the citation — searching everything is how one source answers for another", () => {
  assert.equal(citedSource('Earlier we established from pg2600.txt that: "..."'), "pg2600.txt");
  assert.equal(citedSource("According to Luke.xml: something"), "Luke.xml");
  assert.equal(citedSource("What does it say?"), null);
  // Uncited, the same quotation still finds its passage; cited, it cannot be answered by the wrong file.
  const uncited = findMisquote('"Both true and untrue," Lincoln began; but Prince Andrew interrupted him.', passages, {});
  assert.equal(uncited.misquoted, true);
  assert.deepEqual(uncited.shouldBe, ["Pierre"]);
});

test("the alignment cannot be carried by function words, by a shift, or by a different passage entirely — every one measured on real turns (2026-09-06)", () => {
  const odyssey = [{ ref: "odyssey-greek.txt#0-200", source: "odyssey-greek.txt", text: "Literally the ways of the night and of the day are near, and the paths run close together by the sea." }];
  const lincoln = [{ ref: "wikipedia-abraham-lincoln.html#0-200", source: "wikipedia-abraham-lincoln.html", text: "In January 1862, after complaints of inefficiency and profiteering in the War Department, Lincoln replaced Simon Cameron." }];
  // A wholly different passage must not be reported as a misquotation of this one.
  const cross = findMisquote("Literally the ways of the night and of the day are near", lincoln, {});
  assert.ok(!cross || cross.misquoted === false, "function words agreeing is not evidence of the same passage");
  // A shift caused by one insertion is not a substitution.
  const shifted = findMisquote("the Turk beside him spoke of the paths", [{ ref: "a#0-90", text: "the tall Turk beside him spoke of the paths" }], {});
  assert.ok(!shifted || shifted.misquoted === false, "an inserted word shifts the window; that is not a misquote");
  // The genuine article still lands: exactly one content word swapped.
  const real = findMisquote("Literally the ways of the night and of the day are far", odyssey, {});
  assert.equal(real.misquoted, true);
  assert.deepEqual(real.said, ["far"]);
  assert.deepEqual(real.shouldBe, ["near"]);
  assert.ok(MAX_DIFFS <= 3, "a misquotation is a small perturbation, not a different text");
});
