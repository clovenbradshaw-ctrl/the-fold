import test from "node:test";
import assert from "node:assert/strict";
import { snipsFor, snipBlock, atomsOf, checkSentence, checkSection, reviseAsk, applyRewrite, ABSENCE_RE } from "./snip-check.js";

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
  assert.match(snipBlock(snips), /^What the sources say, verbatim:\n- [^\[]/, "handed without addresses — the rows keep theirs for the check");
  assert.ok(snips[0].ref && Number.isFinite(snips[0].start), "the snip rows carry their address for the check");
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

// BUG (found live, 2026-09-08): reviseAsk told the model "the sources do
// not use the name X here" for EVERY flag, whatever its `reason` — true for
// `absent`, but false for `no_company`, where the value is genuinely in a
// snip, just not beside this sentence's own words. Measured on a dialogue
// carrying "#Person1#:" verbatim many times: the false "do not use" line
// still went out, and the model spent a whole extra rewrite round on a name
// that was never missing. The two reasons must say two different, both
// true, things.
test("a name present in a snip but beside none of this sentence's own words is never told to the model as absent (P100/S77-style false positive)", () => {
  const snips = snipsFor(passages, { obligations: ["Chris Carter", "Fox", "Millennium", "Lone Gunmen"], terms: ["x-files"] });
  const sec = checkSection(["Reception was mixed in 2001."], snips);
  assert.equal(sec.flagged.length, 1);
  assert.equal(sec.flagged[0].flags[0].reason, "no_company");
  const ask = reviseAsk(sec.flagged, snips);
  // Never the false claim that the sources lack the value outright.
  assert.doesNotMatch(ask, /the sources do not use the year "2001" here/);
  // The true fact instead: the value is there, just not with this claim.
  // Wording reconciled 2026-09-09: two sessions fixed this identical bug the
  // same day with different phrasing (this test's own original wording,
  // "...only elsewhere, never together with what this sentence says about
  // it", and the one reviseAsk actually ships, below) — a merge conflict
  // kept the later synthesis (its own comment names both specimens: Prince
  // Andrew AND this test's dialogue case), so the test now asserts what the
  // code actually says rather than the wording it was first written against.
  assert.match(ask, /the sources do use the year "2001", but never together with what this says about it/);
  // The new plain-language fact is still apparatus vocabulary, refused if echoed straight back.
  const echoed = applyRewrite("Reception was mixed in 2001.", sec.flagged, "The sources do use the year \"2001\", but never together with what this says about it in 1996.", snips);
  assert.equal(echoed.outcomes[0].outcome, "refused");
  assert.match(echoed.outcomes[0].because, /echoes the instrument's own words/);
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

test("a stated absence is exempt from the company check entirely — the atom it names is the SUBJECT of the silence, not a claim resting on it", () => {
  // Measured live (2026-09-08): War and Peace, wounding scene attached.
  // Asked whether Prince Andrew's wound was fatal, gemma2:2b answered
  // honestly — "The passage doesn't say whether or not Prince Andrew's
  // wound was fatal." — and this check flagged the name "Prince Andrew" in
  // it for having no company, because the sentence's other words never sit
  // beside the name in the one snip retrieved. The name IS in the snip; the
  // sentence is not claiming anything about it that a snip could support —
  // it is reporting silence, and the name is what the silence is about.
  const snip = { ref: "andrei-excerpt.txt#143-214", start: 0, end: 71, text: "The adjutant, having obeyed this instruction, approached Prince Andrew." };
  const draft = "The passage doesn't say whether or not Prince Andrew's wound was fatal.";
  assert.ok(ABSENCE_RE.test(draft));
  const check = checkSentence(draft, [snip]);
  assert.equal(check.flags.length, 0, "no flag at all — not even a corrected one");
  assert.equal(check.atoms.length, 1, "the atom is still found, just never checked");
  assert.equal(check.atoms[0].value, "Prince Andrew");
  // The section as a whole never asks for a rewrite of it.
  const sec = checkSection([draft], [snip]);
  assert.equal(sec.flagged.length, 0);
});

test("reviseAsk states the TRUE reason for each flag, and never claims an absence where the snip block sent alongside it says otherwise", () => {
  // The bug this closes, reproduced directly: a name genuinely present in a
  // snip, just never beside the rest of a POSITIVE claim's own words —
  // `reviseAsk` used to say "the sources do not use the name X here" for
  // this exact case, which is false, and self-contradicts the snip block
  // handed in the very same message. Uses a positive claim (not a stated
  // absence) so the company check still applies and produces the flag.
  const snip = { ref: "s#0-40", start: 0, end: 40, text: "Prince Andrew stood near the battalion." };
  const draft = "Prince Andrew commanded the whole army.";
  const check = checkSentence(draft, [snip]);
  assert.equal(check.flags.length, 1);
  assert.equal(check.flags[0].reason, "no_company");
  const ask = reviseAsk(check.flagged ?? [{ sentence: draft, ...check }], [snip]);
  assert.match(ask, /the sources do use the name "Prince Andrew", but never together with what this says about it/);
  assert.doesNotMatch(ask, /the sources do not use the name "Prince Andrew"/, "never the false claim — the snip block right below names it");
});
