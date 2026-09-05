import test from "node:test";
import assert from "node:assert/strict";
import { snipsFor, snipBlock, atomsOf, checkSentence, checkSection, reviseAsk, applyRewrite } from "./snip-check.js";

const passages = [
  { ref: "web:en.wikipedia.org-0#100-400", text: "The X-Files is an American science fiction drama television series created by Chris Carter. The original television series aired from September 10, 1993, to May 19, 2002, on Fox. The show was a hit for the network. Unrelated filler sentence about weather patterns in the region here." },
  { ref: "web:en.wikipedia.org-2#0-200", text: "The Lone Gunmen was a spin-off that aired in 2001. Millennium ran from 1996 to 1999 on Fox." },
];

test("snips: the passages' sentences that carry an obligation or a topic term, addressed, most hits first, capped", () => {
  const snips = snipsFor(passages, { obligations: ["Chris Carter", "Fox"], terms: ["x-files"] });
  assert.ok(snips.length >= 3);
  assert.equal(snips[0].ref, "web:en.wikipedia.org-0#100-400");
  assert.match(snips[0].text, /created by Chris Carter/);
  assert.ok(snips.every((s) => Number.isInteger(s.start) && s.end > s.start));
  assert.ok(!snips.some((s) => /weather patterns/.test(s.text)), "a sentence carrying nothing asked for is not a snip");
  assert.match(snipBlock(snips), /^What the sources say, verbatim, each at its address:\n- \[web:en\.wikipedia\.org-0#100-400#\d+-\d+\] /);
  assert.equal(snipsFor(passages, { obligations: ["Fox"], max: 1 }).length, 1, "the cap holds");
});

test("atoms against snips, no model: a year in a snip beside the sentence's own words is supported; one in no snip is flagged; a contradiction names the source's year", () => {
  const snips = snipsFor(passages, { obligations: ["Chris Carter", "Fox", "Millennium", "Lone Gunmen"], terms: ["x-files"] });
  const ok = checkSentence("The series aired on Fox from 1993 to 2002.", snips);
  assert.deepEqual(ok.flags, []); assert.equal(ok.supported.length, 3); assert.equal(ok.contradiction, null);
  const wrong = checkSentence("The X-Files series first aired on Fox in 1997.", snips);
  assert.equal(wrong.flags.length, 1); assert.equal(wrong.flags[0].value, "1997"); assert.equal(wrong.flags[0].reason, "absent");
  assert.ok(wrong.contradiction, "a snip sharing the sentence's words carries a different year"); assert.deepEqual(wrong.contradiction.sentenceYears, ["1997"]); assert.ok(wrong.contradiction.snipYears.includes("1993"));
  const name = checkSentence("Annabeth Gish created the X-Files series.", snips);
  assert.ok(name.flags.some((f) => f.kind === "name" && f.value === "Annabeth Gish" && f.reason === "absent"));
  const noCompany = checkSentence("Reception was mixed in 2001.", snips);
  assert.ok(noCompany.flags.some((f) => f.value === "2001" && f.reason === "no_company"), "a year that appears only beside none of the sentence's own words is not support");
  assert.equal(atomsOf("Nothing here.").length, 0);
});

test("the section's rewrite: flagged sentences asked once with their flags as facts; a rewrite lands only when its atoms pass; (dropped) removes; a bad rewrite keeps the original", () => {
  const snips = snipsFor(passages, { obligations: ["Chris Carter", "Fox"], terms: ["x-files"] });
  const text = "The X-Files was created by Chris Carter. The X-Files series first aired on Fox in 1997. It starred Annabeth Gish as the lead.";
  const sec = checkSection(text.split(/(?<=\.)\s+/), snips);
  assert.equal(sec.flagged.length, 2);
  const ask = reviseAsk(sec.flagged, snips);
  assert.match(ask, /"The X-Files series first aired on Fox in 1997\." — year "1997" appears in no snip this section stood on; the year 1997 is not what the source says here: "The original television series aired from September 10, 1993/);
  assert.match(ask, /What the sources say, verbatim/);
  const good = applyRewrite(text, sec.flagged, "The X-Files series first aired on Fox in 1993.\n(dropped)", snips);
  assert.match(good.text, /aired on Fox in 1993\./); assert.doesNotMatch(good.text, /Annabeth Gish/);
  assert.deepEqual(good.outcomes.map((o) => o.outcome), ["rewritten", "dropped"]);
  const bad = applyRewrite(text, sec.flagged, "The X-Files series first aired on Fox in 1998.\nIt starred Gillian Anderson.", snips);
  assert.deepEqual(bad.outcomes.map((o) => o.outcome), ["refused", "refused"]);
  assert.match(bad.text, /in 1997\./, "the original stands when the rewrite does not pass");
});
