// admission.test.mjs — the discourse-admission gate. Reproduces the live
// specimen (a stale, unrelated RFP transcript hijacking an X-Files essay
// question) against the REAL retrieve()/tokenize() from source.js, proves
// the gate closes it, and runs the generality gate (P71): a cross-domain
// replay with nothing borrowed from the specimen, a structural (never
// hand-tuned) floor, and edge cases a specimen-scoped patch would miss.

import { test } from "node:test";
import assert from "node:assert/strict";
import { tokenize, retrieve } from "./source.js";
import { splitSentences } from "../eoreader7/native/adapters/text/spans.js";
import { NEGATION_WORDS } from "../eoreader7/native/adapters/text/priors.js";
import { makeAdmission, ADMISSION_FLOOR } from "./admission.js";

const admission = makeAdmission({ tokenize });
// The company-checking configuration (splitSentences injected) — see
// admission.js's own header, "COMPANY, NOT BARE OCCURRENCE". The app wires
// this same real sentence-splitter in; the tests above deliberately use the
// bare `admission` instance so the base floor's own behaviour stays pinned
// unperturbed by the narrower, opt-in check.
const admissionWithCompany = makeAdmission({ tokenize, splitSentences });

// A stand-in for the real Sourcewell RFP procurement webinar transcript —
// entirely unrelated to the question, but long enough (as any real
// transcript would be) to collide on at least one ordinary word by chance.
const RFP_TRANSCRIPT = `
Moderator: Good afternoon everyone, and thank you for joining today's webinar
on the Sourcewell cooperative purchasing process. If you have questions along
the way, please write them in the chat box and our team will get to them at
the end.

Cooperative purchasing allows a single competitively solicited contract to be
used by thousands of government entities, school districts, and nonprofit
agencies across the country. Every vendor's submission files are organized by
category for the review committee. Committee members score independently
before convening to discuss, and each reviewer is asked to write brief notes
justifying their score on every line item.
`;

const QUESTION = "write me an essay on the x-files";

test("the live specimen: retrieve() alone has no relevance floor and admits the irrelevant transcript on one coincidental word", () => {
  const paras = RFP_TRANSCRIPT.split(/\n\n+/).filter((p) => p.trim());
  let start = 0;
  const chunks = paras.map((p) => {
    const c = { ref: `rfp.txt#${start}-${start + p.length}`, source: "rfp.txt", start, end: start + p.length, text: p, terms: new Set(tokenize(p)) };
    start += p.length + 2;
    return c;
  });
  const hits = retrieve(chunks, QUESTION, 3);
  assert.ok(hits.length > 0, "retrieve() pulls in a chunk despite zero topical relevance — this is the bug, and it is P4's declared, intentional design for retrieve() itself");
});

test("the fix: the RFP transcript is refused admission as material for the X-Files question", () => {
  const v = admission.sourceAdmits(QUESTION, RFP_TRANSCRIPT);
  assert.equal(v.admitted, false);
  assert.deepEqual(v.shared, ["write"]);
  assert.equal(v.need, 2);
});

test("a genuinely relevant source (shares 2+ content words) is admitted", () => {
  const material = "The X-Files essay contest asked entrants to write about Mulder and Scully.";
  const v = admission.sourceAdmits(QUESTION, material);
  assert.equal(v.admitted, true);
  assert.ok(v.shared.length >= 2);
});

test("zero shared vocabulary is refused outright", () => {
  const material = "The quarterly financial results exceeded analyst expectations by a wide margin.";
  const v = admission.sourceAdmits(QUESTION, material);
  assert.equal(v.admitted, false);
  assert.deepEqual(v.shared, []);
});

// ── the generality gate (P71): cross-domain replay ──────────────────────────
// A structurally identical shape (one coincidental shared word, otherwise
// unrelated), in a completely different domain than the specimen — cooking
// material answering an astronomy question — proves this is not a patch
// fitted to "x-files"/"essay"/"RFP" specifically.
test("P71 cross-domain replay: a cooking recipe does not ground an astronomy question on one coincidental word", () => {
  const recipe = `
To make a simple tomato sauce, first heat olive oil in a heavy pan over
medium heat. Add finely chopped onion and cook until soft and translucent,
about five minutes. Stir in crushed garlic and cook for one more minute,
watching carefully so it does not burn. Add canned crushed tomatoes, a pinch
of sugar, and salt to taste. Simmer uncovered for twenty minutes, stirring
occasionally, until the sauce has thickened and the raw tomato taste has
mellowed into something deeper.
`;
  const q = "what causes the orbit of a comet to change over time";
  // "time" is the coincidental collision this recipe offers by chance
  // ("... over medium heat", no — check the real shared vocabulary below).
  const v = admission.sourceAdmits(q, recipe);
  assert.equal(v.admitted, false, `expected refusal; got shared=${JSON.stringify(v.shared)}`);
});

test("P71 cross-domain replay, positive control: real astronomy material IS admitted for the same question", () => {
  const material = "A comet's orbit can change over time due to gravitational perturbations from planets and outgassing forces as it nears the sun.";
  const q = "what causes the orbit of a comet to change over time";
  const v = admission.sourceAdmits(q, material);
  assert.equal(v.admitted, true);
  assert.ok(v.shared.length >= 2);
});

// ── edge cases a specimen-scoped patch would miss ───────────────────────────

test("a question with only one content word cannot be held to an impossible floor of 2 — the need caps at what the question offers", () => {
  const v = admission.sourceAdmits("photosynthesis", "Photosynthesis converts light energy into chemical energy in plants.");
  assert.equal(v.need, 1);
  assert.equal(v.admitted, true);
});

test("a question with no content words at all (pure stopwords) is ungateable, never refused — matches Clippy's own DISCOURSE-gate posture for a fresh ask with nothing to gate on", () => {
  const v = admission.sourceAdmits("is it or was it", "Completely unrelated material about shipbuilding in the 19th century.");
  assert.equal(v.ungateable, true);
  assert.equal(v.admitted, true);
});

test("the floor is a genuine structural minimum, not tunable per call beyond what's declared — ADMISSION_FLOOR is exported and reused, never re-derived per caller", () => {
  assert.equal(ADMISSION_FLOOR, 2);
});

test("admitSources splits a pool of sources into admitted/refused, each carrying its own disclosed verdict", () => {
  const sources = [
    { name: "rfp.txt", text: RFP_TRANSCRIPT },
    { name: "trivia.txt", text: "The X-Files first aired in 1993 and asked viewers to write in with their own theories about the essay-worthy mysteries of the show." },
  ];
  const { admitted, refused } = admission.admitSources(QUESTION, sources);
  assert.equal(admitted.length, 1);
  assert.equal(admitted[0].name, "trivia.txt");
  assert.equal(refused.length, 1);
  assert.equal(refused[0].name, "rfp.txt");
  assert.match(refused[0].reason, /discourse-irrelevant/);
});

// ── company, not bare occurrence (P31, one level up) ────────────────────────
// A second live specimen (2026-09-15), on the SAME stale Sourcewell
// transcript, against a genuinely unrelated question: "what's today's date,
// and can you check the web for one real current headline?" The transcript
// shares two distinct content words with the question — "today" (its own
// opening line) and "date" (a different paragraph, "keep their reference
// files up to date") — clearing ADMISSION_FLOOR on the bare word-count
// check, admitted, and the turn answered from the transcript again. Neither
// word is a stopword (both are real content words), but they never occur
// TOGETHER anywhere in the source — each is independently, coincidentally
// present, the identical bag-of-words blind spot P31 already closed for a
// number matched anywhere in a passage rather than in the sentence that
// actually states it.
const DATE_QUESTION = "what's today's date, and can you check the web for one real current headline?";
const RFP_TRANSCRIPT_WITH_DATE = `${RFP_TRANSCRIPT}
We strongly recommend vendors build a submission checklist well in advance of the deadline and keep their reference files up to date.
`;

test("company: the bare floor alone still admits the transcript on two words that never appear together (the pre-fix behaviour, pinned so the next case is legible as a fix)", () => {
  const v = admission.sourceAdmits(DATE_QUESTION, RFP_TRANSCRIPT_WITH_DATE);
  assert.equal(v.admitted, true);
  assert.ok(v.shared.includes("today") && v.shared.includes("date"), `expected today+date in ${JSON.stringify(v.shared)}`);
});

test("company: with a sentence-splitter injected, the SAME transcript is refused for the SAME question — 'today' and 'date' are never in one sentence together", () => {
  const v = admissionWithCompany.sourceAdmits(DATE_QUESTION, RFP_TRANSCRIPT_WITH_DATE);
  assert.equal(v.admitted, false, `expected refusal; got shared=${JSON.stringify(v.shared)}`);
  assert.match(v.reason, /never .* together in one sentence/);
});

test("company: a source that actually states two of the question's words in the SAME sentence is still admitted", () => {
  const material = "Today's date is confirmed as the 15th, and the headline desk is already checking the wire for something current.";
  const v = admissionWithCompany.sourceAdmits(DATE_QUESTION, material);
  assert.equal(v.admitted, true);
});

test("company: the existing positive-admission specimens (X-Files, astronomy) are unaffected — their shared words already sit in one sentence", () => {
  const xfiles = admissionWithCompany.sourceAdmits(QUESTION, "The X-Files essay contest asked entrants to write about Mulder and Scully.");
  assert.equal(xfiles.admitted, true);
  const astro = admissionWithCompany.sourceAdmits(
    "what causes the orbit of a comet to change over time",
    "A comet's orbit can change over time due to gravitational perturbations from planets and outgassing forces as it nears the sun.",
  );
  assert.equal(astro.admitted, true);
});

test("company: admitSources end to end — the transcript is set aside for the date/headline question even though it clears the bare word-count floor", () => {
  const sources = [{ name: "pasted.txt", text: RFP_TRANSCRIPT_WITH_DATE }];
  const { admitted, refused } = admissionWithCompany.admitSources(DATE_QUESTION, sources);
  assert.equal(admitted.length, 0);
  assert.equal(refused.length, 1);
  assert.equal(refused[0].name, "pasted.txt");
});

// ── crownTestimony's own re-use of this gate (app.js, 2026-09-15) ──────────
// The Per-Source Testimony spine (P39, capacity-runner.js::landAct/
// mergeTestimony, crownTestimony in app.js) used to spend a full per-source
// hypergraph "evaluate" act against `Object.keys(state.sources)` — EVERY
// source ever pasted into the WORKSPACE, across every conversation,
// unconditionally, for every claim a grounded turn's own answer made that
// the pooled read left unresolved — with no relevance gate of its own. That
// is the same "should this whole source even be treated as material for
// this question" gap admission.js was built to close for retrieve(), one
// door later and previously unguarded: a workspace holding an unrelated
// stale attachment (this file's own RFP transcript) had it consulted, in
// full, for a claim from a wholly unrelated conversation's turn — found
// live chasing a reported "confirmed" mislabeling. app.js now filters the
// workspace's source names through this SAME organ before spending any
// evaluate act, keyed on the CLAIM's own subject/verb/object text (the
// exact string crownTestimony already builds to mint the claim id and land
// the act) rather than the turn's question — never a second relevance
// notion. These tests exercise that exact call shape directly, over a
// workspace-shaped source list spanning what would be several
// conversations' worth of attachments, since a single-source unit test
// cannot show a WORKSPACE-scoped leak (the class of bug this closes).
test("crownTestimony's call shape: a claim from one conversation's unresolved answer, checked against a workspace holding several OTHER conversations' sources, is only tested against the one that actually shares its words", () => {
  // Shaped exactly like app.js's own `${claim.end1} ${claim.label} ${claim.end2}`.
  const claimText = "Gustave Eiffel designed Eiffel Tower";
  const workspace = {
    // Left behind by a conversation about the tower itself — genuinely on topic.
    "eiffel.txt": "The Eiffel Tower is a wrought-iron lattice tower on the Champ de Mars in Paris, France. Gustave Eiffel's company designed and built it for the 1889 World's Fair.",
    // Left behind by an entirely different conversation (this file's own live specimen).
    "pasted.txt": RFP_TRANSCRIPT,
    // A third conversation's own leftover attachment, also unrelated.
    "recipe.txt": "Preheat the oven to 375F. Whisk the eggs and sugar until pale, then fold in the flour and butter before baking for twenty-five minutes.",
  };
  const { admitted, refused } = admissionWithCompany.admitSources(claimText, Object.entries(workspace).map(([name, text]) => ({ name, text })));
  assert.deepEqual(admitted.map((a) => a.name), ["eiffel.txt"], `expected only the on-topic source admitted; got ${JSON.stringify(admitted.map((a) => a.name))}`);
  assert.deepEqual(refused.map((r) => r.name).sort(), ["pasted.txt", "recipe.txt"]);
});

test("crownTestimony's call shape: a claim with nothing genuinely relevant anywhere in the workspace tests against ZERO sources — not the old unconditional Object.keys(state.sources) sweep", () => {
  const claimText = "the tower stands at 330 meters";
  const workspace = { "pasted.txt": RFP_TRANSCRIPT, "recipe.txt": "Bake the cake for forty minutes at 350 degrees and let it cool before frosting." };
  const { admitted, refused } = admissionWithCompany.admitSources(claimText, Object.entries(workspace).map(([name, text]) => ({ name, text })));
  assert.equal(admitted.length, 0);
  assert.equal(refused.length, 2);
});

// ── a denied term is not an asserted term (2026-09-15) ──────────────────────
// The live specimen, reproduced twice independently on 2026-09-15: a stale,
// unrelated coffee-shop/oat-milk source, leaked once into a fabricated
// answer, hijacked the CORRECTION too — the person naming the hallucinated
// terms back to refute them ("there's no coffee shop or oat milk anywhere
// in what I sent you") handed the bare floor + company check exactly the
// vocabulary overlap they needed to legitimately re-admit the same stale
// source, which the ground ladder then correctly, honestly marked
// "confirmed" (the sentence really is in that source — the gate was
// answering a question it was never asked). See admission.js's own header,
// "A DENIED TERM IS NOT AN ASSERTED TERM," for the full account.
// The exact composition app.js wires in — see app.js's own admissionGate
// construction comment for why "no" is added locally here rather than to
// the shared, cross-repo NEGATION_WORDS closed class.
const NEGATION_WORDS_PLUS_NO = new Set([...NEGATION_WORDS, "no"]);
const admissionWithNegation = makeAdmission({ tokenize, splitSentences, negationWords: NEGATION_WORDS_PLUS_NO });

// Real specimen text (paraphrased from the shared turn-log, same wording
// shape): a stale source that genuinely contains the leaked fabrication...
const COFFEE_SHOP_SOURCE = "On Saturday, the company ran out of oat milk around 2pm and had to turn away several latte orders at the coffee shop.";
// ...and the correction message that names those exact terms to deny them,
// then asks the REAL question (about a garden, not a coffee shop at all).
const GARDEN_CORRECTION = "that's not right at all - there's no coffee shop or oat milk anywhere in what I sent you, that's a garden report. can you just tell me straight: how many total plots does the garden have, and how much was collected in plot fees?";
const GARDEN_SOURCE = "Maple Street Community Garden - End of Season Report. There are 24 plots across 19 households. The season fee was $35, and total plot fees collected came to $840.";

test("specimen 1 (coffee shop): a correction naming and denying a leaked fabrication's terms no longer re-admits the stale source that leaked them", () => {
  const v = admissionWithNegation.sourceAdmits(GARDEN_CORRECTION, COFFEE_SHOP_SOURCE);
  assert.equal(v.admitted, false, `expected refusal; got shared=${JSON.stringify(v.shared)}`);
  assert.deepEqual(v.shared, []);
});

test("specimen 1, negative control: WITHOUT negationWords injected, the same correction still (wrongly) re-admits the stale source — pins the pre-fix behaviour so the fix above is legible as a fix, not a coincidence", () => {
  const v = admissionWithCompany.sourceAdmits(GARDEN_CORRECTION, COFFEE_SHOP_SOURCE);
  assert.equal(v.admitted, true, `expected the OLD bug to reproduce without negationWords; got ${JSON.stringify(v)}`);
});

test("specimen 1: the correction's own REAL question still admits the genuinely on-topic garden source — denial only ever removes vocabulary, it never manufactures a false refusal of real material", () => {
  const v = admissionWithNegation.sourceAdmits(GARDEN_CORRECTION, GARDEN_SOURCE);
  assert.equal(v.admitted, true);
  assert.ok(v.shared.includes("garden") && v.shared.includes("plots"), `expected garden/plots in ${JSON.stringify(v.shared)}`);
});

// Specimen 2 (Meridian Analytics/Austin/Denver) — an independent, second
// reproduction of the exact same failure shape on different content, the
// same day: naming "Austin"/"Denver" to deny them re-admitted a corporate-
// relocation source that genuinely states both words together.
const MERIDIAN_SOURCE = "Priya Desai led the relocation of the engineering team from Austin to Denver, after their lease in Texas expired in March 2019.";
const TOOL_LIBRARY_CORRECTION = "that's completely wrong - there's no Priya Desai, no coffee shop, no oat milk, no Austin or Denver anywhere in what I sent you. this is a tool library report. just tell me straight: how many registered members do we have now, and how much did membership dues bring in?";

test("specimen 2 (Meridian Analytics): an independent second reproduction of the same failure shape — denying 'Austin'/'Denver' no longer re-admits the source that states them together", () => {
  const v = admissionWithNegation.sourceAdmits(TOOL_LIBRARY_CORRECTION, MERIDIAN_SOURCE);
  assert.equal(v.admitted, false, `expected refusal; got shared=${JSON.stringify(v.shared)}`);
});

// ── the required multi-turn simulation ──────────────────────────────────────
// A single-turn unit test cannot catch this bug (P200's own crownTestimony
// tests already prove the gate refuses an unrelated source on ONE turn) —
// the defect is specifically that turn N+1's OWN WORDS (the correction)
// change what turn N+1 admits, relative to what a plain restatement of the
// same underlying question would. This walks two turns against one
// workspace holding both a stale leaked source and the genuinely on-topic
// one, exactly the shape admitSources sees across a real conversation.
test("multi-turn: turn 1 (the original, un-contaminated question) admits only the on-topic source from a workspace also holding the stale leak", () => {
  const workspace = [
    { name: "pasted-2.txt", text: COFFEE_SHOP_SOURCE },
    { name: "garden-report.txt", text: GARDEN_SOURCE },
  ];
  const turn1Question = "here's a quarterly report I'm pasting - how many total plots does the garden have, and how much was collected in plot fees?";
  const { admitted, refused } = admissionWithNegation.admitSources(turn1Question, workspace);
  assert.deepEqual(admitted.map((a) => a.name), ["garden-report.txt"]);
  assert.deepEqual(refused.map((r) => r.name), ["pasted-2.txt"]);
});

test("multi-turn: turn 2, the CORRECTION after a fabrication leaked pasted-2.txt's content into the answer, still admits only the on-topic source — the correction's own denial does not resurrect the leak", () => {
  const workspace = [
    { name: "pasted-2.txt", text: COFFEE_SHOP_SOURCE },
    { name: "garden-report.txt", text: GARDEN_SOURCE },
  ];
  const { admitted, refused } = admissionWithNegation.admitSources(GARDEN_CORRECTION, workspace);
  assert.deepEqual(admitted.map((a) => a.name), ["garden-report.txt"], `expected only the real source admitted on the correction turn; got ${JSON.stringify(admitted.map((a) => a.name))}`);
  assert.deepEqual(refused.map((r) => r.name), ["pasted-2.txt"]);
});

test("multi-turn negative control: WITHOUT the negation fix, turn 2's correction wrongly re-admits BOTH sources — the leak resurfaces, alongside the real one — pinning what turn 2 looked like before this fix", () => {
  const workspace = [
    { name: "pasted-2.txt", text: COFFEE_SHOP_SOURCE },
    { name: "garden-report.txt", text: GARDEN_SOURCE },
  ];
  const { admitted } = admissionWithCompany.admitSources(GARDEN_CORRECTION, workspace);
  assert.deepEqual(admitted.map((a) => a.name).sort(), ["garden-report.txt", "pasted-2.txt"]);
});

// ── controls: denial only ever removes evidence, never invents a finer one ──
test("a term denied in one clause but genuinely asserted elsewhere in the same message still counts as real vocabulary", () => {
  const mixed = "I like coffee, but there's no oat milk here.";
  const v = admissionWithNegation.sourceAdmits(mixed, "The shop sells great coffee every morning.");
  assert.equal(v.admitted, true);
  assert.deepEqual(v.shared, ["coffee"]);
});

test("a plain, non-corrective mention of the same words admits exactly as before — the fix only fires on an actual negation, never on ordinary positive vocabulary", () => {
  const plain = "tell me about the coffee shop and oat milk sales";
  const v = admissionWithNegation.sourceAdmits(plain, COFFEE_SHOP_SOURCE);
  assert.equal(v.admitted, true);
  assert.deepEqual(v.shared.sort(), ["coffee", "milk", "oat", "shop"]);
});

test("negationWords is optional and additive: a caller that omits it (every existing caller of this module before this date) gets byte-identical behaviour", () => {
  const v = admissionWithCompany.sourceAdmits(GARDEN_CORRECTION, COFFEE_SHOP_SOURCE);
  assert.equal(v.admitted, true, "byte-identical to the pre-fix gate when negationWords is not injected");
});

// ── P71 generality gate: cross-domain replay, nothing borrowed from either
// specimen's own vocabulary (coffee/oat-milk/gardens/tool-libraries) ────────
test("P71 cross-domain replay: denying a fabricated astronomy claim does not re-admit the unrelated cooking source it leaked from", () => {
  const cookingSource = "To make a simple tomato sauce, first heat olive oil in a heavy pan over medium heat, then add finely chopped onion and crushed garlic.";
  const correction = "that's wrong, there's no olive oil or garlic anywhere in what I sent you - that's about comet orbits. just tell me plainly what causes a comet's orbit to change over time.";
  const v = admissionWithNegation.sourceAdmits(correction, cookingSource);
  assert.equal(v.admitted, false, `expected refusal; got shared=${JSON.stringify(v.shared)}`);
});
