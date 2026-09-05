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
  assert.match(ask, /"The X-Files series first aired on Fox in 1997\." — the sources do not use the year "1997" here; they say 1993 and 2002 where this says 1997: "The original television series aired from September 10, 1993/, "the ask states the fact, in plain words");
  assert.match(ask, /What the sources say, verbatim/);
  const good = applyRewrite(text, sec.flagged, "The X-Files series first aired on Fox in 1993.\n(dropped)", snips);
  assert.match(good.text, /aired on Fox in 1993\./); assert.doesNotMatch(good.text, /Annabeth Gish/);
  assert.deepEqual(good.outcomes.map((o) => o.outcome), ["rewritten", "dropped"]);
  const bad = applyRewrite(text, sec.flagged, "The X-Files series first aired on Fox in 1998.\nIt starred Gillian Anderson.", snips);
  assert.deepEqual(bad.outcomes.map((o) => o.outcome), ["refused", "refused"]);
  assert.match(bad.text, /in 1997\./, "the original stands when the rewrite does not pass");
});

test("a rewrite must be about the same thing: a sentence whose atoms sit in a snip but whose subject is different is refused, and the original stands", () => {
  const snips = snipsFor(passages, { obligations: ["Chris Carter", "Fox", "Millennium"], terms: ["x-files"] });
  const text = "The X-Files series first aired on Fox in 1997.";
  const sec = checkSection([text], snips);
  assert.equal(sec.flagged.length, 1);
  // The live failure (S77 run 2): a rewrite that is a different sentence
  // entirely, carrying atoms that happen to appear in the material.
  const away = applyRewrite(text, sec.flagged, "Millennium was created by Chris Carter.", snips);
  assert.equal(away.outcomes[0].outcome, "refused");
  assert.match(away.outcomes[0].because, /about something else/);
  assert.equal(away.text, text, "the original stands, flagged");
  // A real correction keeps the subject and passes.
  const good = applyRewrite(text, sec.flagged, "The X-Files series first aired on Fox in 1993.", snips);
  assert.equal(good.outcomes[0].outcome, "rewritten");
});

test("the instrument's own words never reach the answer, and the ask that caused it now speaks plainly (S77 run 3)", () => {
  const snips = snipsFor(passages, { obligations: ["Chris Carter", "Fox"], terms: ["x-files"] });
  const text = "The X-Files series first aired on Fox in 1997.";
  const sec = checkSection([text], snips);
  // The ask carries facts, not this module's vocabulary.
  const ask = reviseAsk(sec.flagged, snips);
  assert.match(ask, /the sources do not use the year "1997" here/);
  assert.doesNotMatch(ask, /appears in no snip|beside none of this sentence/, "the flag's human-facing detail never goes to the model");
  // The exact leak measured live: the model echoing a flag phrase back.
  const leaked = applyRewrite(text, sec.flagged, "Function appears in a snip but beside none of this sentence's own words in 1993.", snips);
  assert.equal(leaked.outcomes[0].outcome, "refused");
  assert.match(leaked.outcomes[0].because, /echoes the instrument's own words/);
  assert.equal(leaked.text, text);
});
