import test from "node:test";
import assert from "node:assert/strict";
import { strainOf, recruit, substituted, identitySwapped, THIN_PASSAGES, COVERAGE_FLOOR } from "./strain.js";
import { makeReferentIndex } from "./cast.js";
import { splitSentences } from "../eoreader7/native/adapters/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "../eoreader7/native/adapters/text/surfaces.js";

const P = (t) => ({ text: t });

test("strain 0 when S1 already knows the answer — there is nothing for S2 to be lazy about", () => {
  const r = strainOf({ answeredBeforeTheModel: { kind: "comparison" }, question: "anything" });
  assert.equal(r.level, 0);
  assert.match(r.reasons[0], /known exactly, with an address/);
});

test("what raises strain: nothing on point, poor coverage, a premise that failed, disagreement — and each names itself, strongest first", () => {
  const q = "When was the harbor light built?";
  assert.equal(strainOf({ question: q, passages: [P("The harbor light was built in 1841 by Ada Rowe.")] }).level, 1, "material that answers is not a strain");
  assert.equal(strainOf({ question: q, passages: [P("Turbines and gearboxes, quarterly.")] }).level, 2);
  const disagree = strainOf({ question: q, passages: [P("The harbor light was built in 1841.")], disagreements: 2 });
  assert.equal(disagree.level, 3);
  assert.match(disagree.reasons[0], /2 claim\(s\) the sources disagree on/, "the reason that drove the rung is reported first");
  const contradicted = strainOf({ question: q, passages: [P("The harbor light was built in 1841.")], premiseCheck: { unverified: [], contradicted: [{}] } });
  assert.equal(contradicted.level, 3);
  // Corrections in scope are INFORMATION, not difficulty — measured: read as
  // strain, this fired on 148 of 214 real turns and pushed 62% of everything
  // to level 2, recruiting more work on most turns rather than targeting it.
  const learned = strainOf({ question: q, passages: [P("The harbor light was built in 1841.")], learnedInScope: 3 });
  assert.equal(learned.level, 1, "knowing what was wrong before does not make the question harder");
  assert.equal(learned.informed, 3, "but it is still on the record");
  // A single chunk carrying everything is the EASIEST case, not a thin one.
  const one = strainOf({ question: q, passages: [P("The harbor light was built in 1841 by Ada Rowe, above the coast.")] });
  assert.equal(one.level, 1, JSON.stringify(one.reasons));
  assert.equal(one.coverage, 1);
});

test("the slider is a floor and a ceiling on what strain may recruit; unset, strain decides alone", () => {
  const hard = { level: 3, reasons: ["sources disagree"] };
  const easy = { level: 1, reasons: ["ordinary"] };
  assert.equal(recruit(hard).depth, 3, "no preference: strain decides");
  assert.equal(recruit(hard, { asked: 1 }).depth, 1, "a low ask caps it");
  assert.match(recruit(hard, { asked: 1 }).why, /caps the 3/);
  assert.equal(recruit(easy, { asked: 3 }).depth, 3, "asking for care gets care even when it is easy");
  assert.match(recruit(easy, { asked: 3 }).why, /strain alone would have taken 1/);
  assert.equal(recruit(easy, { asked: 0 }).depth, 0);
});

test("attribute substitution: an answer that shares almost nothing with the question has changed the subject — the live failure, and its control", () => {
  const q = 'In POLICIES.md, one passage reads: "the witness said states six times in ____" What fills the blank?';
  const swap = substituted(q, "This analysis focuses on how a large language model is used to generate and understand text based on rules and prompts, which is fascinating.");
  assert.equal(swap.substituted, true);
  assert.equal(swap.share, 0);
  const real = substituted(q, "The blank in that POLICIES.md passage is filled by 463, where the witness said states six times.");
  assert.equal(real.substituted, false);
  assert.ok(real.share > 0.5);
  // Too little to read is not a judgement.
  assert.equal(substituted(q, "463."), null, "a short answer is not judged");
  assert.equal(substituted("hi", "Hello there, how can I help you today with anything at all?"), null, "a question with no content words is not judged");
  assert.equal(typeof THIN_PASSAGES, "number");
  assert.equal(typeof COVERAGE_FLOOR, "number");
});

// ── P219's own residual: entity substitution, checked without a model ───────

const DYER_PASSAGES = [{ ref: "web:dyer.vanderbilt.edu-0#616-683", text: "The Dyer Observatory, also known as the Arthur J. Dyer Observatory, is an astronomical observatory owned and operated by Vanderbilt University. Jessica Ingram is the Observatory's Director." }];
const indexFor = makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });
const observatoryIndex = indexFor(DYER_PASSAGES);
// A minimal stand-in for the real UD-treebank prior app.js's own
// isCommonNoun reads (wordclass.js) — this fixture needs no network fetch.
const commonNoun = (w) => w === "observatory";

test("THE LIVE SPECIMEN, reproduced without a model: a draft that never says 'Northgate' but confidently names Dyer Observatory's real director is an entity swap", () => {
  const r = identitySwapped(["Northgate Observatory"], observatoryIndex, "The sources say that the director of Arthur J. Dyer Observatory is Jessica Ingram.", { commonNoun });
  assert.ok(r?.swapped, JSON.stringify(r));
  assert.deepEqual(r.absent, ["Northgate Observatory"]);
  assert.ok(r.claimed.length > 0, "names what the draft claimed instead");
});

test("an honest draft that names the absent thing is never flagged, whatever it goes on to say", () => {
  const r = identitySwapped(["Northgate Observatory"], observatoryIndex, "Northgate Observatory is not mentioned in the sources. They do discuss a different one, Dyer Observatory, whose director is Jessica Ingram.", { commonNoun });
  assert.equal(r.swapped, false);
});

test("the generic head noun alone does not count as an echo — 'Observatory' is common to both names by construction, only 'Northgate' tells them apart — and this needs no commonNoun prior at all", () => {
  // Found live, 2026-09-15, chasing this exact specimen against the real
  // running app: "observatory" is OOV in the UD-treebank prior isCommonNoun
  // reads (found: false), so commonNoun("observatory") is ALWAYS false in
  // production — the prior's own designed fall-open ("never refuse a bare
  // name like 'Pierre', which is OOV too") silently defeated a commonNoun-
  // only filter for exactly the word this check exists to catch. Fixed by
  // checking what the draft actually CLAIMED first: a word shared with the
  // claimed referent's own surface ("Arthur J. Dyer Observatory") is never
  // distinctive of the absent name, whatever any external prior says about
  // it — no vocabulary coverage required. So this now holds with NO
  // commonNoun supplied at all, not only once the prior is wired in.
  const bare = identitySwapped(["Northgate Observatory"], observatoryIndex, "The sources say that the director of Arthur J. Dyer Observatory is Jessica Ingram.");
  assert.ok(bare?.swapped, JSON.stringify(bare));
});

test("the SAME specimen, with a commonNoun that (like the real UD-treebank prior) never classifies 'observatory' at all — the claimed-referent check alone still catches it", () => {
  const alwaysOov = () => false; // the real isCommonNoun's own behavior for this word: found: false, so never NOUN
  const r = identitySwapped(["Northgate Observatory"], observatoryIndex, "The sources say that the director of Arthur J. Dyer Observatory is Jessica Ingram.", { commonNoun: alwaysOov });
  assert.ok(r?.swapped, JSON.stringify(r));
});

test("a wrong answer that only refers to the real institution GENERICALLY — never restating its own name — is still caught, distinctiveness is checked against the whole material's established surfaces, not only what one sentence happens to claim", () => {
  // Found by cross-lingual testing (2026-09-15, six languages, Workflow):
  // the first cut of this gate filtered a word's distinctiveness only
  // against the referents THIS sentence's own referentsOf() resolved —
  // "The director of the observatory is Jessica Ingram" never restates
  // "Dyer" or "Arthur J Dyer" by name, so claimedWords never contained
  // "observatory" and the shared generic word slipped through as if it
  // told the two institutions apart. Reproduces in plain English with no
  // exotic construction — a model narrating anaphorically ("the
  // observatory", "the institute", "there") rather than by full name is
  // an entirely ordinary thing for a small model to do.
  const r = identitySwapped(["Northgate Observatory"], observatoryIndex, "The director of the observatory is Jessica Ingram.", { commonNoun });
  assert.ok(r?.swapped, JSON.stringify(r));
  assert.deepEqual(r.absent, ["Northgate Observatory"]);
});

test("a plain, honest refusal that claims nothing real is never flagged — there is nothing to substitute", () => {
  const r = identitySwapped(["Northgate Observatory"], observatoryIndex, "The sources do not say who the director was.", { commonNoun });
  assert.equal(r, null, "no real referent claimed, so this is ordinary hedging, not a swap");
});

test("a genuinely caseless-script answer returns a TYPED GAP, not an ambiguous null — found cross-lingual testing, 2026-09-15 (Workflow, three languages): claimed.size===0 for a caseless draft is bytewise identical to ordinary hedging, so a dangerous entity substitution in Hebrew/Arabic/Chinese/… looked exactly like an honest 'nothing to substitute' refusal", () => {
  const r = identitySwapped(["Northgate Observatory"], observatoryIndex, "מצפה הכוכבים הרודיון הוא מפעל מחקר גדול.");
  assert.equal(r.swapped, null);
  assert.equal(r.gap?.reason, "script_without_case");
});

test("...but an ordinary short, honest, CASED sentence with no mid-sentence capital must NOT trip the same gap — scriptCoverage's other two boundaries are calibrated for a whole document's worth of sentences, not one answer, and were found live to fire on plain English hedging with no proper noun in it", () => {
  const r = identitySwapped(["Northgate Observatory"], observatoryIndex, "There is nothing here about that.");
  assert.equal(r, null, "an ordinary cased sentence with no capitalised evidence is ordinary hedging, not a caseless script");
});

test("no absent names, or no index, or an empty draft — refuses to judge rather than guessing", () => {
  assert.equal(identitySwapped([], observatoryIndex, "anything"), null);
  assert.equal(identitySwapped(["Northgate Observatory"], null, "anything"), null);
  assert.equal(identitySwapped(["Northgate Observatory"], observatoryIndex, ""), null);
});

// ── P145: the stream's own belief decides, where there is one ───────────────

test("P145: with no belief supplied, nothing changes — the coverage floor decides exactly as before", () => {
  const args = { question: "what did lincoln sign in eighteen sixty two", passages: [{ text: "a passage about something else entirely" }] };
  const before = strainOf(args);
  const after = strainOf({ ...args, expect: null });
  assert.deepEqual(after, before, "an absent belief must leave the reading byte-identical");
});

test("P145: a turn the stream expects to go worse than usual is strained, and the reason says so", () => {
  const s = strainOf({
    question: "what did lincoln sign in eighteen sixty two",
    passages: [{ text: "lincoln signed it in eighteen sixty two, and the grant followed" }],
    expect: { p: 0.8, base: 0.5, median: 0.5, why: "236 earlier turns of this shape" },
  });
  assert.ok(s.level >= 2, `expected strain, got ${s.level}`);
  assert.match(s.reasons.join(" "), /unbacked more often than this stream's usual/);
  assert.match(s.reasons.join(" "), /236 earlier turns/, "the reason must carry its evidence");
});

test("P145: a turn the stream expects to go BETTER than usual is not strained by the belief", () => {
  const s = strainOf({
    question: "what did lincoln sign in eighteen sixty two",
    passages: [{ text: "lincoln signed it in eighteen sixty two, and the grant followed" }],
    expect: { p: 0.2, base: 0.5, median: 0.5 },
  });
  assert.ok(!s.reasons.join(" ").includes("unbacked more often"), "a better-than-usual turn may not be strained for it");
});

test("P145: the stream's own null, when it places the belief as an outlier, takes the top rung", () => {
  const s = strainOf({
    question: "what did lincoln sign in eighteen sixty two",
    passages: [{ text: "lincoln signed it in eighteen sixty two" }],
    expect: { p: 0.99, base: 0.5, median: 0.5, placement: { strained: true }, why: "beyond anything resampling produced" },
  });
  assert.equal(s.level, 3);
  assert.match(s.reasons[0], /outlier/);
});

test("P145 CONTROL: the belief must not be able to strain a turn merely by existing", () => {
  // A belief exactly at the stream's base rate says nothing about this turn.
  // If this ever strains, the arm is measuring its own presence, not the turn.
  const s = strainOf({
    question: "what did lincoln sign in eighteen sixty two",
    passages: [{ text: "lincoln signed it in eighteen sixty two" }],
    expect: { p: 0.5, base: 0.5, median: 0.5 },
  });
  assert.ok(!s.reasons.join(" ").includes("unbacked more often"), `a belief at the base rate must strain nothing: ${JSON.stringify(s.reasons)}`);
});

test("P145: a malformed belief is ignored rather than guessed at — the coverage rules resume", () => {
  const args = { question: "what did lincoln sign in eighteen sixty two", passages: [{ text: "unrelated" }] };
  for (const bad of [{ base: 0.5 }, { p: NaN, base: 0.5 }, {}]) {
    assert.deepEqual(strainOf({ ...args, expect: bad }), strainOf(args), `malformed belief ${JSON.stringify(bad)} must change nothing`);
  }
});

test("P148: the belief is asked with COVERAGE in hand — the cell that makes it worth anything", () => {
  // Measured over 861 model turns: the chain WITHOUT coverage was worth
  // 0.0100 bits and strained 809 of 861 turns to catch a 60% bad rate
  // against a 59% base — no selection at all. WITH coverage: 0.0638 bits,
  // 404 turns, 71%. This pin fails if the call ever stops carrying it.
  let got = null;
  strainOf({
    question: "what did lincoln sign in eighteen sixty two",
    passages: [{ text: "lincoln signed it in eighteen sixty two and the grant followed" }],
    expect: (facts) => { got = facts; return null; },
  });
  assert.ok(got, "the belief must be asked at all");
  assert.ok(Number.isFinite(got.coverage), `coverage must reach the belief: ${JSON.stringify(got)}`);
  assert.ok(got.coverage > 0, "and it must be the reading's real coverage, not a placeholder");
  assert.ok(Number.isFinite(got.passages) && Number.isFinite(got.onPoint));
});

test("P148: the belief is compared to the stream's MEDIAN belief where there is one, not its base rate", () => {
  // Against the base rate the arm strained 645 of 861 and caught 64% (base
  // 59%). Against the stream's own median belief: 404 turns, 71%. Where both
  // are present the median governs.
  const strained = strainOf({
    question: "what did lincoln sign in eighteen sixty two",
    passages: [{ text: "lincoln signed it in eighteen sixty two" }],
    // Above the median, BELOW the base rate: only the median rule can strain this.
    expect: { p: 0.45, base: 0.9, median: 0.3 },
  });
  assert.ok(strained.reasons.join(" ").includes("more often than this stream's usual"), "the median must govern where it is present");

  const calm = strainOf({
    question: "what did lincoln sign in eighteen sixty two",
    passages: [{ text: "lincoln signed it in eighteen sixty two" }],
    // Below the median, ABOVE the base rate: the median must keep it calm.
    expect: { p: 0.5, base: 0.2, median: 0.8 },
  });
  assert.ok(!calm.reasons.join(" ").includes("more often than this stream's usual"), "and it must be able to keep a turn calm, not only strain one");
});

test("P148: a belief that fails to form leaves the floor deciding, and says nothing", () => {
  const args = { question: "what did lincoln sign", passages: [{ text: "unrelated material entirely" }] };
  const thrown = strainOf({ ...args, expect: () => { throw new Error("no ground"); } });
  const nulled = strainOf({ ...args, expect: () => null });
  assert.deepEqual(thrown, strainOf(args), "a throwing belief must change nothing");
  assert.deepEqual(nulled, strainOf(args), "a null belief must change nothing");
  assert.ok(!("expect" in thrown), "and the reading must not claim a belief it does not have");
});
