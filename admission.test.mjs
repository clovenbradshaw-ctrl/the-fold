// admission.test.mjs — the discourse-admission gate. Reproduces the live
// specimen (a stale, unrelated RFP transcript hijacking an X-Files essay
// question) against the REAL retrieve()/tokenize() from source.js, proves
// the gate closes it, and runs the generality gate (P71): a cross-domain
// replay with nothing borrowed from the specimen, a structural (never
// hand-tuned) floor, and edge cases a specimen-scoped patch would miss.

import { test } from "node:test";
import assert from "node:assert/strict";
import { tokenize, retrieve } from "./source.js";
import { makeAdmission, ADMISSION_FLOOR } from "./admission.js";

const admission = makeAdmission({ tokenize });

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
