import test from "node:test";
import assert from "node:assert/strict";
import { premisesOf, checkPremises, premiseFacts, premiseGuard, premiseReferents, repeatsAbsentPremise, correctTurn, cutProcessTalk, turnSnipBlock } from "./correction.js";
import { splitSentences } from "./cite.js";

const passages = [
  { ref: "p.md#0-300", text: "The EFFECT_READS_THE_WHOLE_RUN constant is the named export that states it. It was declared in 1841 by Ada Rowe." },
  { ref: "p.md#300-500", text: "Millennium ran from 1996 to 1999 on Fox and was created by Chris Carter." },
];

test("a question that asserts something as established yields its premise; a plain question yields none", () => {
  const q = 'Earlier we established from POLICIES.md that: "EFFECT_READS_THE_Sherman_RUN is the named export that states it." Remind me what that passage says.';
  const p = premisesOf(q);
  assert.equal(p.length, 1);
  assert.match(p[0].text, /EFFECT_READS_THE_Sherman_RUN/);
  assert.deepEqual(premisesOf("What does the file say about Ada Rowe?"), []);
  assert.equal(premisesOf('You said "Millennium ran from 1996 to 1999 on Fox" — is that right?').length, 1);
});

test("the premise check names ONLY what the sources do say, never the false claim, and keeps the absent value as a guard (S77 run 5)", () => {
  const q = 'Earlier we established from POLICIES.md that: "EFFECT_READS_THE_Sherman_RUN is the named export that states it." Remind me what that passage says.';
  const c = checkPremises(q, passages);
  assert.equal(c.premises.length, 1);
  assert.ok(c.unverified.length + c.contradicted.length === 1, "the premise did not check out");
  const facts = premiseFacts(c);
  assert.match(facts, /These sources do not use "Sherman" anywhere\. There is nothing here to describe under that name\./);
  assert.doesNotMatch(facts, /EFFECT_READS_THE_Sherman_RUN is the named export/, "the false claim is never quoted back to the mouth (P126's rule)");
  assert.doesNotMatch(facts, /skeptic|careful|be wary|the user/i, "facts about the sources, never an instruction about posture");
  // The enforcement is mechanical, not advisory.
  const g = premiseGuard(c);
  assert.deepEqual(g.map((x) => x.value), ["Sherman"]);
  assert.ok(repeatsAbsentPremise("The Sherman investigation matters because it weighs the evidence.", g), "a draft asserting the absent token is caught");
  assert.equal(repeatsAbsentPremise("The constant was declared in 1841.", g), null);
});

test("a contradicted premise hands back the source's own sentence, positively, with its address", () => {
  const q = 'Earlier we established that "Millennium ran from 1996 to 2005 on Fox." What else does it say?';
  const c = checkPremises(q, passages);
  const facts = premiseFacts(c);
  if (c.contradicted.length) {
    assert.match(facts, /^What these sources say about it:\n- Millennium ran from 1996 to 1999 on Fox/);
    assert.doesNotMatch(facts, /2005/, "the wrong year is never repeated");
  } else {
    assert.match(facts, /do not use "2005"/);
  }
});

test("a premise the material does establish passes clean and produces no facts block (control)", () => {
  const q = 'Earlier we established that "Millennium ran from 1996 to 1999 on Fox." What else does it say?';
  const c = checkPremises(q, passages);
  assert.equal(c.contradicted.length, 0);
  assert.equal(c.unverified.length, 0, JSON.stringify(c.premises[0]?.flags));
  assert.equal(premiseFacts(c), "");
});

test("a wrong answer is corrected at a plain turn: the flagged year is rewritten when the rewrite clears, and left standing when it does not", async () => {
  const draft = "The constant was declared in 1847 by Ada Rowe.";
  const good = await correctTurn({ text: draft, passages, question: "When was the constant declared?", splitSentences, rounds: 1, call: async () => "The constant was declared in 1841 by Ada Rowe." });
  assert.equal(good.asked, 1);
  assert.match(good.text, /1841/); assert.doesNotMatch(good.text, /1847/);
  assert.deepEqual(good.outcomes.map((o) => o.outcome), ["rewritten"]);
  assert.equal(good.check.after.flagged, 0);
  const bad = await correctTurn({ text: draft, passages, question: "When was the constant declared?", splitSentences, rounds: 1, call: async () => "The constant was declared in 1852 by Ada Rowe." });
  assert.deepEqual(bad.outcomes.map((o) => o.outcome), ["refused"]);
  assert.match(bad.text, /1847/, "the original stands, flagged");
  assert.equal(bad.check.after.flagged, 1);
});

test("no passages, no snips or no call is a no-op — every caller without material is byte-identical (control)", async () => {
  const t = "The constant was declared in 1847.";
  assert.equal((await correctTurn({ text: t, passages: [], splitSentences })).text, t);
  assert.equal((await correctTurn({ text: t, passages, question: "zzz qqq", splitSentences })).asked, 0);
  assert.equal((await correctTurn({ text: "", passages, splitSentences })).text, "");
  assert.equal(turnSnipBlock([], "anything"), "");
  assert.match(turnSnipBlock(passages, "what does it say about Ada Rowe"), /^What the sources say, verbatim/);
});

test("process narration is cut, but a stated absence and anything carrying the material's own words are kept (P127)", () => {
  const material = "The harbor light was built in 1841 by Ada Rowe. The tide turns twice a day.";
  const run = (t) => cutProcessTalk(t, { materialText: material, splitSentences });
  const r = run("This analysis focuses on a passage from the material. Let me break down the question and understand its purpose. The harbor light was built in 1841 by Ada Rowe.");
  assert.equal(r.cut.length, 2);
  assert.equal(r.text, "The harbor light was built in 1841 by Ada Rowe.");
  // The two things the cut must never touch.
  assert.equal(run("The sources do not contain a passage about Scheria.").cut.length, 0, "a stated absence is a finding, not scaffolding");
  assert.equal(run("Let me explain the tide, which turns twice a day.").cut.length, 0, "it speaks the material's own words");
  assert.equal(run("I count 1841 as the year given.").cut.length, 0, "it carries an atom");
  // An answer that is nothing but scaffolding is left whole for the marks to carry.
  const all = run("Let me break this down. Here's a summary of the approach.");
  assert.equal(all.text, "Let me break this down. Here's a summary of the approach.");
});

test("P135: a token is scoped to the source it is claimed OF — another source answering for it is how a planted name passed every check (2026-09-06)", () => {
  const passages = [
    { ref: "lincoln.html#0-200", source: "lincoln.html", text: "Lincoln signed the Yosemite Grant, protecting the area now known as the Natural History Guide region for the public." },
    // The other source genuinely carries the planted token AND shares the
    // premise's own words, so corpus-wide company is satisfied by the wrong file.
    { ref: "pg2600.txt#0-200", source: "pg2600.txt", text: "Kutúzov protecting the area of the region signed nothing for the public, said the Emperor." },
  ];
  const q = 'Earlier we established from lincoln.html that: "Lincoln signed the Yosemite Grant, protecting the area now known as the Kutúzov region for the public." Remind me what that passage says.';
  const wide = checkPremises(q, passages);
  assert.equal(wide.unverified.length + wide.contradicted.length, 0, "corpus-wide, the wrong source answers for it — the live failure");
  const scoped = checkPremises(q, passages, { cited: "lincoln.html" });
  assert.ok(scoped.unverified.length + scoped.contradicted.length >= 1, "scoped to what the question cites, it is caught");
  // A question naming no source still checks against everything it was given.
  const uncited = checkPremises('Earlier we established that "the light was built in 1996." What else?', [{ ref: "h.txt#0-40", text: "The light was built in 1841." }]);
  assert.ok(uncited.premises.length >= 1);
});

test("P135: the check is about REFERENTS, not spans — a name the cited passage's cast does not establish is beyond-reach", async () => {
  const { makeReferentIndex } = await import("../eoreader7/native/organs/cast.js");
  const { splitSentences: split } = await import("../eoreader7/native/adapters/text/spans.js");
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import("../eoreader7/native/adapters/text/surfaces.js");
  const referentIndexFor = makeReferentIndex({ splitSentences: split, extractSurfaces, discoverReferents, namesCorefer, diaNorm });
  const lincoln = [{ ref: "lincoln.html#0-140", source: "lincoln.html", text: "Abraham Lincoln signed the Yosemite Grant in 1864. Lincoln addressed Congress about the measure, and Lincoln praised the region." }];
  const tolstoy = [{ ref: "pg2600.txt#0-140", source: "pg2600.txt", text: "The Emperor displeasure with Kutúzov was increased at Vílna. Kutúzov could not act, and Kutúzov wrote to the Emperor." }];
  const premise = "Lincoln signed the Yosemite Grant protecting the Kutúzov region";
  // The planted name is a real name of the CORPUS but names nobody this passage introduces.
  const here = premiseReferents(premise, lincoln, { referentIndexFor });
  assert.ok(here.reached);
  assert.deepEqual(here.unresolved, ["Kutúzov"], "beyond-reach in the cited passage");
  assert.deepEqual(here.resolved, ["Yosemite Grant"]);
  // In the source it really belongs to, the reading is exactly reversed.
  const there = premiseReferents(premise, tolstoy, { referentIndexFor });
  assert.deepEqual(there.resolved, ["Kutúzov"]);
  assert.ok(there.unresolved.includes("Yosemite Grant"));
  // A cast that cannot be read reaches nothing, and an unreached search is never a finding.
  assert.equal(premiseReferents(premise, lincoln, {}).reached, false);
  assert.deepEqual(premiseReferents(premise, lincoln, {}).unresolved, []);
});
