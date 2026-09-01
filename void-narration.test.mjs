// void-narration.test.mjs — the reasoning against REAL briefs, built by the
// real void-brief.js/void-shape.js chain over the real engine cube. No
// hand-typed brief objects anywhere: a narrator that could disagree with the
// arithmetic it reports is the one failure this file exists to catch, and a
// fixture brief would make that failure untestable by construction.
//
// Several cases below assert on SHAPE rather than on wording — that the text
// is prose and not a structured list, that a number is spelled, that a
// paragraph exists at all. Wording is meant to be edited freely; the
// properties that made the first version unreadable are not.

import { test } from "node:test";
import assert from "node:assert/strict";

import { narrateVoid, noSlotLine, VOID_PHASES } from "./void-narration.js";
import { briefFor, observedFillers, possessorIn, ofObjectIn, extentFor } from "./void-brief.js";
import { declaredSlotShape } from "./web-claim.js";
import { successionFillers } from "./succession.js";
import { cellOf } from "../eoreader7/native/kernel/cube.js";
import * as priors from "../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/priors.js";

const shapeOf = (q) =>
  declaredSlotShape(q, {
    definiteDeterminers: priors.DEFINITE_DETERMINERS,
    inflectionalSuffixes: priors.INFLECTIONAL_SUFFIXES,
    interrogativePronouns: priors.INTERROGATIVE_PRONOUNS,
    mannerReasonPronouns: priors.MANNER_REASON_PRONOUNS,
  });

const brief = (q, texts, opts = {}) => briefFor(q, texts, { slotShapeOf: shapeOf, cellOf, ...opts });

// The real specimen succession.test.mjs already validates against — a real
// running-app capture of real Wikipedia text.
const SPECIMEN = `15th Vice President of the United States
In office
March 4, 1861 – March 4, 1865
President Abraham Lincoln
Preceded by John C. Breckinridge
Succeeded by Andrew Johnson

17th President of the United States
In office
April 15, 1865 – March 4, 1869
Preceded by Abraham Lincoln
Succeeded by Ulysses S. Grant
16th Vice President of the United States
In office
March 4, 1865 – April 15, 1865
President Abraham Lincoln
Preceded by Hannibal Hamlin
Succeeded by Schuyler Colfax

Hannibal Hamlin was the 15th vice president of the United States, serving from 1861 to 1865, during President Abraham Lincoln's first term.`;

const VP = "Who was Abraham Lincoln's vice president?";
const withFillers = { anchor: "Abraham Lincoln", fillersFor: (a, t) => successionFillers(a, t) };

const ask = (b, opts) => narrateVoid(b, opts);

// ── GENERALIZATION, found by driving a deliberately net-new question ────
//
// Everything above and below was written against "Who was Abraham Lincoln's
// vice president?" — one question, one shape. Driving "Who was the lead
// singer of Van Halen?" live on 2026-08-27 exposed two failures that had
// been invisible because the possessive shape happened to be the only one
// anyone ran.

// FOUND LIVE, 2026-08-27, driving "who was in van halen?" through the real
// app for the first time after wiring `declaredSlotShape`'s new
// interrogative-pronoun path. Two bugs surfaced only by actually running it.
//
// Bug 1: the narration's own opening paragraph tried to recover the head
// phrase by string-matching `slot.endsWith(" of " + anchor)` — the exact
// hardcoded-"of" mistake `connective` was built to fix, in a SECOND place.
// On "person in Van Halen" that match failed (does not end in " of Van
// Halen"), so the paragraph fell back to the WHOLE slot as the head and
// then appended " of {anchor}" unconditionally anyway — the anchor stated
// twice, with two different connectives, in one sentence.
test("the real production path — isAdposition injected — states 'person in Van Halen' exactly once", () => {
  const shapeOf2 = (q) =>
    declaredSlotShape(q, {
      definiteDeterminers: priors.DEFINITE_DETERMINERS,
      inflectionalSuffixes: priors.INFLECTIONAL_SUFFIXES,
      interrogativePronouns: priors.INTERROGATIVE_PRONOUNS,
      mannerReasonPronouns: priors.MANNER_REASON_PRONOUNS,
      isAdposition: (w) => new Set(["of", "in", "for", "at", "with", "from", "under", "on"]).has(w),
    });
  const b = briefFor("who was in van halen?", [], { slotShapeOf: shapeOf2, cellOf });
  assert.equal(b.declaration.slot, "person in van halen");
  assert.equal(b.headPhrase, "person");
  assert.equal(b.connective, "in", 'the real relation — never a hardcoded "of"');
  // "van halen" legitimately appears twice in ordinary prose — once
  // introducing the anchor, once restating the full slot ("the person in
  // van halen"). The actual bug was the anchor stated with TWO DIFFERENT
  // connectives back to back ("van halen of van halen"), not the anchor
  // word appearing more than once across separate sentences.
  const { text } = ask(b, { phase: "question" });
  assert.doesNotMatch(text, /van halen\s+of\s+van halen/i);
  assert.match(text, /\bin van halen\b/i, "the real connective must appear, not just the anchor");
});

// Bug 2: with NO `isAdposition` reaching an anchor at all, the fallback
// chain fell through to `shape.marker` — which for an interrogative-
// pronoun-led shape IS the pronoun itself ("who"). The pre-existing
// `namesSomething` exclusion (the/a/an/this/that/these/those) predates
// Path 2 and never anticipated this new class of non-name marker, so
// "who" passed every check and became the "anchor" — the void's own slot
// read "person of who".
test("an interrogative pronoun never becomes its own anchor when no preposition is found", () => {
  const b = brief("who was in van halen?", []); // no isAdposition injected — anchorHint is null
  const anchorCell = b.declaration.cells.find((c) => c.op === "SIG");
  assert.equal(anchorCell.declared, null, '"who" must never stand in for a real anchor');
  assert.equal(b.declaration.slot, "person", "never \"person of who\"");
});

test("an 'of X' question anchors on X — a determiner is never an anchor", () => {
  const b = brief("Who was the lead singer of Van Halen?", []);
  const cells = Object.fromEntries(b.declaration.cells.map((c) => [c.op, c]));
  // Live, before the fix: slot "lead singer of the", anchor "the". Every
  // reader downstream — the extent read, the filler matcher, the reasoning a
  // person actually sees — then worked off that.
  assert.equal(cells.SIG.declared, "Van Halen");
  assert.equal(cells.NUL.declared, "lead singer of Van Halen");
});

test("possessive and 'of' shapes both resolve, and a question with neither takes no anchor rather than a determiner", () => {
  assert.equal(ofObjectIn("Who is the chief executive of Apple?"), "Apple");
  assert.equal(ofObjectIn("What is the capital of Brazil?"), "Brazil");
  assert.equal(possessorIn("Who was Abraham Lincoln's vice president?"), "Abraham Lincoln");
  // A lowercase "of" object is not a name and is not guessed at.
  assert.equal(ofObjectIn("who was the lead singer of the band"), null);
});

test("the extent gate is the question's own head phrase, not a political vocabulary", () => {
  // Before the fix `extentFor` gated on president|presidency|term|served|
  // office|administration, so every one of these read NO extent while the
  // Lincoln shape read fine — the succession.js disease, one file over.
  const cases = [
    ["Van Halen", "lead singer", "Van Halen is a band. The lead singer served from 1974 to 2020."],
    ["Apple", "chief executive", "Apple Inc. is a company. The chief executive served from 2011 to 2025."],
    ["James Bond", "actor", "James Bond is a character. The actor played him from 1962 to 1967."],
  ];
  for (const [anchor, head, text] of cases) {
    const e = extentFor(anchor, [text], { headPhrase: head });
    assert.ok(e.extent, `${anchor}: no extent read`);
  }
});

test("the anchor scopes the DOCUMENT; the head phrase matches the SENTENCE", () => {
  // A page names its subject once and says "the band" thereafter. Requiring
  // the anchor per sentence threw away the very sentence carrying the span.
  const page = "Van Halen was formed in 1974. The band had a lead singer from 1974 to 2020.";
  assert.deepEqual(extentFor("Van Halen", [page], { headPhrase: "lead singer" }).extent, { from: 1974, to: 2020 });
  // But a document that is about someone else does not donate its span.
  const other = "Queen had a lead singer from 1970 to 1991.";
  assert.equal(extentFor("Van Halen", [other], { headPhrase: "lead singer" }).extent, null);
});

// FOUND BY THE CONTROL, 2026-08-27. Every question driven until now had
// genuinely multiple fillers, so the apparatus had never been asked to stay
// QUIET. "What is the capital of Brazil?" — one clean answer, no hole — read
// its extent as 1572-1578 (an arbitrary window of colonial history) on ONE
// mention against FIVE rivals, and declared a hole across it. A false hole
// on a question that has none is the apparatus manufacturing the very thing
// it exists to detect.
test("a tie is not an extent: a span that does not lead the rest is refused, not taken", () => {
  const brazil =
    "Brazil. Salvador was capital from 1549 to 1763. Rio was capital from 1763 to 1960. Brasilia has been capital from 1960 to 2025. A colonial capital sat from 1572 to 1578.";
  const e = extentFor("Brazil", [brazil], { headPhrase: "capital" });
  assert.equal(e.extent, null, "no span led the rest");
  assert.equal(e.refused?.type, "no_dominant_span");
  assert.ok(e.considered > 1);
  // Refused is REPORTED, never silent — the reader is told the material was
  // ambiguous, which is a different fact from it being quiet.
  assert.ok(Array.isArray(e.refused.candidates) && e.refused.candidates.length > 1);
});

test("the same structural rule kills the Van Halen false hole, unfitted to either specimen", () => {
  const vh = "Van Halen. The lead singer served from 1974 to 2020. Roth was lead singer from 1974 to 1985.";
  assert.equal(extentFor("Van Halen", [vh], { headPhrase: "lead singer" }).extent, null);
});

test("and it keeps every true positive measured across unrelated domains", () => {
  const cases = [
    ["Abraham Lincoln", "vice president", "Abraham Lincoln served as president from 1861 to 1865. He had a vice president from 1861 to 1865.", { from: 1861, to: 1865 }],
    ["Apple", "chief executive", "Apple Inc. is a company. The chief executive served from 2011 to 2025.", { from: 2011, to: 2025 }],
    ["James Bond", "actor", "James Bond is a character. The actor played him from 1962 to 1967.", { from: 1962, to: 1967 }],
  ];
  for (const [anchor, head, text, want] of cases) {
    assert.deepEqual(extentFor(anchor, [text], { headPhrase: head }).extent, want, `${anchor} lost its extent`);
  }
});

test("a refused tie reads as ambiguity, never as silence, and never declares a hole", () => {
  const brazil = "Brazil. Salvador was capital from 1549 to 1763. Rio was capital from 1763 to 1960. Brasilia has been capital from 1960 to 2025.";
  const b = brief("What is the capital of Brazil?", [brazil]);
  const cells = Object.fromEntries(b.declaration.cells.map((c) => [c.op, c]));
  assert.equal(cells.SEG.standing, "undeclared", "a refused extent must not be declared as one");
  assert.equal(b.standing.standing, "unbounded", "and with no shape there is no hole to report");
  const { text } = ask(b, { phase: "material" });
  assert.match(text, /none of them leads the rest/);
  assert.doesNotMatch(text, /there is a hole in it/, "the false hole this control exists to catch");
});

test("counts agree with what they count — 'One statements' was live output", () => {
  const t = "Somewhere. The capital sat from 1900 to 1950. The capital moved from 1950 to 1960. The capital held from 1900 to 1950.";
  const e = extentFor("Somewhere", [t], { headPhrase: "capital" });
  const b = { schema: "EOVoidBrief@1", evidence: e, declaration: { dimension: "years", cells: [] }, standing: null, fillers: [] };
  const said = narrateVoid(b, { phase: "material" });
  assert.match(said.text, /Two statements put it there/);
  assert.doesNotMatch(said.text, /One statements|Two statement\b/);
});

test("the LIFE trap still holds — a lifespan must never become the slot's extent", () => {
  const t = "Hannibal Hamlin was born in 1809 and died in 1891. He was vice president from 1861 to 1865.";
  assert.deepEqual(extentFor("Hannibal Hamlin", [t], { headPhrase: "vice president" }).extent, { from: 1861, to: 1865 });
});

// ── it must read as prose, which is the whole correction ────────────────

test("the opening takes the question apart in sentences — never a label/value list", () => {
  const { text } = ask(brief(VP, []), { phase: "question" });
  assert.match(text, /vice president/);
  assert.match(text, /Abraham Lincoln/);
  // The shapes that made the first cut unreadable, refused explicitly.
  assert.doesNotMatch(text, /·/, "middot-separated lists are data, not thinking");
  assert.doesNotMatch(text, /\b(NUL|SIG|INS|SEG|CON|SYN|DEF|EVA|REC)\b/, "operator letters are notation for the record, not for a reader");
  assert.doesNotMatch(text, /^\s*[-*]\s/m, "no bullets");
  assert.doesNotMatch(text, /\w+\s*=\s*/, "no field = value pairs");
  // Real sentences: it ends in a full stop and has several of them.
  assert.match(text.trim(), /\.$/);
  assert.ok(text.split(/\.\s/).length >= 4, "several sentences, not one dense line");
});

test("the question pass says nothing about extent or fillers — nothing has been read yet", () => {
  const { text } = ask(brief(VP, []), { phase: "question" });
  assert.doesNotMatch(text, /1861/);
  assert.doesNotMatch(text, /Hamlin/);
});

test("the singular reading is disclosed as a reading, never as a declared cardinality", () => {
  const { text } = ask(brief(VP, []), { phase: "question" });
  assert.match(text, /singular/);
  assert.match(text, /fact about English and not about the world/);
  assert.doesNotMatch(text, /\bdeclared: ?single\b/);
});

test("a genuinely plural question is told it cannot be closed by one name", () => {
  const { text } = ask(brief("What are the largest cities in Tennessee?", []), { phase: "question" });
  assert.match(text, /more than one/);
  assert.doesNotMatch(text, /fact about English/);
});

test("the open questions are asked as questions a person would ask, not as field names", () => {
  const { text } = ask(brief(VP, []), { phase: "question" });
  assert.match(text, /what kind of thing belongs in it/);
  assert.match(text, /how wide it is/);
  // `declareVoid`'s own record-facing phrasing must NOT leak through.
  assert.doesNotMatch(text, /the extent to be covered, and its units/);
});

// ── the material pass ───────────────────────────────────────────────────

test("the extent arrives with its own evidence, and small counts are spelled", () => {
  const { text } = ask(brief(VP, [SPECIMEN], withFillers), { phase: "material" });
  assert.match(text, /1861 to 1865/);
  assert.match(text, /\bOne statement\b|\b(two|three|four|five|six) statements\b/, "counts read as words, never '1 statement'");
  assert.doesNotMatch(text, /^\d/m, "no paragraph opens on a digit");
});

test("named fillers carry their own extents, at the grain the record actually stated", () => {
  // REVISED 2026-08-27. This case used to assert that a same-year span
  // renders as the bare point "1865" — a workaround for the fact that the
  // year grain collapses Johnson's whole vice presidency to nothing, which
  // hid the defect instead of reporting it. `officeSpanOf` now reads the
  // record's own dates and `seg.js` detects the collapse mechanically, so
  // the honest rendering is the real extent. The old assertion's own
  // invariant survives, and for a better reason: "1865 to 1865" still never
  // appears, because the dates are used rather than a degenerate range.
  const { text } = ask(brief(VP, [SPECIMEN], withFillers), { phase: "material" });
  assert.match(text, /Hannibal Hamlin, covering March 4, 1861 to March 4, 1865/);
  assert.match(text, /Andrew Johnson, covering March 4, 1865 to April 15, 1865/);
  assert.doesNotMatch(text, /1865 to 1865/, "a term inside one year is stated by its dates, never as a null range");
});

test("items carrying their own commas are joined with semicolons, so the list stays readable", () => {
  const { text } = ask(brief(VP, [SPECIMEN], withFillers), { phase: "material" });
  const named = text.split("\n\n").find((p) => p.includes("Hamlin"));
  assert.match(named, /;\s*and\b/, "comma-joined would make one unreadable run");
});

test("a closed space says so and forbids adding to it", () => {
  const { text } = ask(brief(VP, [SPECIMEN], withFillers), { phase: "material" });
  assert.match(text, /closes it/);
  assert.match(text, /Nothing should be added/);
});

test("a hole is stated as a hole, and as making the answer SHORT rather than smaller", () => {
  // No fillersFor — the real live case, where the structural reader finds none.
  const { text } = ask(brief(VP, [SPECIMEN]), { phase: "material" });
  assert.match(text, /there is a hole in it/);
  assert.match(text, /short of the answer, not a smaller version of it/);
});

// ── THE REC: the declaration revises itself, not just a sentence ────────

test("two fillers against a question that did not ask for many REVISES the declaration itself", () => {
  const b = brief(VP, [SPECIMEN], withFillers);
  assert.equal(b.declaredBefore, "unknown", "the question itself declared nothing about how many");
  assert.equal(b.reopened, true);
  const cells = Object.fromEntries(b.declaration.cells.map((c) => [c.op, c]));
  assert.equal(cells.DEF.declared, "enumerated", "cardinality is re-declared, not merely narrated");
  assert.equal(cells.REC.standing, "declared", "REC's own cell finally has an answer");
  assert.match(cells.REC.declared, /bound 2 distinct fillers/);
  // And the void's own report of its holes shrinks accordingly.
  assert.ok(!b.declaration.undeclared.some((u) => u.op === "REC"));
});

test("the REC is spoken as a revision of the shape it started with", () => {
  const { text } = ask(brief(VP, [SPECIMEN], withFillers), { phase: "material" });
  assert.match(text, /revising the shape I started with/);
  assert.match(text, /bind two to it/, "spelled, not '2'");
  assert.match(text, /the wrong shape/);
});

test("no REC when only one filler is named — it is earned, never printed by default", () => {
  const b = brief(VP, [SPECIMEN], { anchor: "Abraham Lincoln", fillersFor: () => [{ filler: "Solo", span: { from: 1861, to: 1865 }, source: "x" }] });
  assert.equal(b.reopened, false);
  const cells = Object.fromEntries(b.declaration.cells.map((c) => [c.op, c]));
  assert.equal(cells.REC.standing, "undeclared", "nothing forced a revision, so REC stays honestly open");
  assert.doesNotMatch(ask(b, { phase: "material" }).text, /revising the shape/);
});

test("a question that ALREADY asked for many is not 'revised' by getting many — nothing was conceded", () => {
  const q = "What are the largest cities in Tennessee?";
  const b = briefFor(q, ["Memphis and Nashville are the largest cities in Tennessee."], {
    slotShapeOf: shapeOf,
    cellOf,
    anchor: "Tennessee",
    fillersFor: () => [
      { filler: "Memphis", span: null, source: "x" },
      { filler: "Nashville", span: null, source: "x" },
    ],
  });
  assert.equal(b.declaredBefore, "enumerated");
  assert.equal(b.reopened, false, "the declaration was right the first time");
  assert.doesNotMatch(ask(b, { phase: "material" }).text ?? "", /revising the shape/);
});

// ── observedFillers: the relation tier's cardinality finding, read ──────

test("observedFillers reads the slot clusterFillers already computed, and picks the one that is this void's", () => {
  const claims = [
    { subject: "Abraham Lincoln", verb: "appointed", fillers: [{ object: "Hannibal Hamlin" }, { object: "Andrew Johnson" }] },
    { subject: "Congress", verb: "passed", fillers: [{ object: "the act" }, { object: "the bill" }] },
  ];
  const got = observedFillers("vice president of Abraham Lincoln", "Abraham Lincoln", claims);
  assert.deepEqual(got.map((f) => f.filler), ["Hannibal Hamlin", "Andrew Johnson"]);
  assert.ok(got.every((f) => f.span === null), "the relation tier reads WHO, never for how long");
  assert.match(got[0].source, /binds .* to 2 distinct things/);
});

test("observedFillers takes nothing from a slot that shares no words with this void", () => {
  const claims = [{ subject: "Congress", verb: "passed", fillers: [{ object: "the act" }, { object: "the bill" }] }];
  assert.deepEqual(observedFillers("vice president of Abraham Lincoln", "Abraham Lincoln", claims), []);
});

test("observedFillers REFUSES a tie rather than flipping a coin between two equally-matching slots", () => {
  const claims = [
    { subject: "Abraham Lincoln", verb: "appointed", fillers: [{ object: "A" }, { object: "B" }] },
    { subject: "Abraham Lincoln", verb: "named", fillers: [{ object: "C" }, { object: "D" }] },
  ];
  assert.deepEqual(observedFillers("vice president of Abraham Lincoln", "Abraham Lincoln", claims), []);
});

test("observedFillers ignores a single-filler slot — one filler is not a cardinality finding", () => {
  const claims = [{ subject: "Abraham Lincoln", verb: "appointed", fillers: [{ object: "Hannibal Hamlin" }] }];
  assert.deepEqual(observedFillers("vice president of Abraham Lincoln", "Abraham Lincoln", claims), []);
});

test("the two readers pool by name, and the one carrying a span wins", () => {
  const b = brief(VP, [SPECIMEN], {
    ...withFillers,
    observed: [
      { filler: "Hannibal Hamlin", span: null, source: "relations" }, // already known WITH a span
      { filler: "Andrew Johnson", span: null, source: "relations" },
    ],
  });
  assert.equal(b.fillers.length, 2, "named twice is one filler, not two");
  const hamlin = b.fillers.find((f) => /Hamlin/.test(f.filler));
  assert.deepEqual(
    hamlin.span,
    { from: 1861, to: 1865, fromText: "March 4, 1861", toText: "March 4, 1865" },
    "the span-carrying reading survives the pooling — precise dates and all",
  );
});

test("a filler the relation tier found but the structural reader did not still REC-s, with its extent disclosed as unread", () => {
  // The real live case: no succession boxes in the page text, so
  // `successionFillers` finds nothing — and the relation tier finds both.
  const b = brief(VP, [SPECIMEN], {
    anchor: "Abraham Lincoln",
    observed: [
      { filler: "Hannibal Hamlin", span: null, source: "relations" },
      { filler: "Andrew Johnson", span: null, source: "relations" },
    ],
  });
  assert.equal(b.reopened, true, "the REC does not depend on the structural reader at all");
  const { text } = ask(b, { phase: "material" });
  assert.match(text, /revising the shape I started with/);
  assert.match(text, /nothing I have read says how long/, "a filler with no span says so rather than being dropped or assumed");
  assert.match(text, /not a contradiction of what I just named/, "naming people and then saying nothing fills it must be reconciled, not left jarring");
  assert.match(text, /Hannibal Hamlin/);
  assert.match(text, /Andrew Johnson/);
});

test("an unread extent is said as an inability to judge completeness, not as completeness", () => {
  const { text } = ask(brief(VP, ["Lincoln was a lawyer before entering politics."]), { phase: "material" });
  assert.match(text, /Nothing I have read says how wide/);
  assert.match(text, /cannot tell whether an answer is complete/);
  assert.doesNotMatch(text, /closes it/);
});

// ── the digest rule ─────────────────────────────────────────────────────

test("a pass that learned nothing says nothing — the digest, not the rendered text, decides", () => {
  const b = brief(VP, [SPECIMEN], withFillers);
  const first = ask(b, { phase: "material" });
  assert.ok(first);
  assert.equal(ask(b, { phase: "material", previous: first.digest }), null);
});

// FOUND LIVE, 2026-08-27, and the reason `mentions` is not in the digest.
// The third pass reads more material than the second, so the SAME span comes
// back with a higher corroboration count — and the narration re-printed both
// material paragraphs whole to change one word from "Two" to "Three". The
// reader learned nothing and read it twice.
test("a stronger count for the SAME span, fillers and standing is not news and is not re-said", () => {
  const thin = brief(VP, [SPECIMEN], withFillers);
  const first = ask(thin, { phase: "material" });
  // One more sentence restating the SAME span. Deliberately not the specimen
  // twice — that would duplicate its box subjects, which `verifyChain`
  // rightly refuses as `duplicate_id`, so the fillers would change too and
  // the test would be measuring something else entirely (caught exactly that
  // way on the first attempt).
  const thicker = brief(VP, [SPECIMEN + "\n\nLincoln served as president from 1861 to 1865."], withFillers);
  assert.ok(thicker.evidence.mentions > thin.evidence.mentions, "the count really did rise");
  assert.deepEqual(thicker.evidence.extent, thin.evidence.extent, "and the span really is the same");
  assert.equal(ask(thicker, { phase: "material", previous: first.digest }), null);
});

test("a genuinely different span DOES speak — the digest is not simply insensitive", () => {
  const first = ask(brief(VP, [SPECIMEN], withFillers), { phase: "material" });
  const other = brief("Who was Chester A. Arthur's minister?", ["Lucius Fairchild served as minister from 1881 to 1882 during President Chester A. Arthur's term."]);
  const said = ask(other, { phase: "material", previous: first.digest });
  assert.ok(said, "a different span is real news");
});

test("a pass that learned something speaks, even having spoken before", () => {
  const first = ask(brief(VP, []), { phase: "question" });
  const second = ask(brief(VP, [SPECIMEN], withFillers), { phase: "material", previous: first.digest });
  assert.ok(second, "the material is genuinely new");
  assert.match(second.text, /1861 to 1865/);
  assert.notEqual(second.digest, first.digest);
});

// ── edges ───────────────────────────────────────────────────────────────

test("a question naming no slot gets a typed thought, never a zeroed space with nine empty operators", () => {
  assert.equal(brief("How does photosynthesis work?", []), null, "briefFor itself declines — there is no slot here");
  assert.match(noSlotLine(), /does not open a slot to fill/);
  assert.match(noSlotLine(), /nothing below is measuring completeness/);
});

test("narrateVoid refuses anything that is not a real brief rather than narrating a shape it never read", () => {
  assert.equal(narrateVoid(null), null);
  assert.equal(narrateVoid({ standing: { standing: "covered" } }), null);
});

test("the standing sentence carries the arithmetic's OWN reason verbatim — no second opinion is ever formed", () => {
  const b = brief(VP, [SPECIMEN], withFillers);
  const { text } = ask(b, { phase: "material" });
  assert.ok(text.includes(b.standing.reason), "the reason travels verbatim, never paraphrased");
});

test("both declared phases produce prose, and every paragraph is separated by a blank line", () => {
  for (const phase of VOID_PHASES) {
    const said = ask(brief(VP, phase === "question" ? [] : [SPECIMEN], withFillers), { phase });
    assert.ok(said?.text, `${phase} produced nothing`);
    for (const para of said.text.split("\n\n")) {
      assert.ok(para.trim().length > 0, "no empty paragraphs");
      assert.doesNotMatch(para, /\n/, "a paragraph is one run — line breaks inside it are the log's shape, not prose's");
    }
  }
});
