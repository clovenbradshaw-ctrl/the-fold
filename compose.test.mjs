// compose.test.mjs — the long-form composer, against the REAL crown.js
// renderer and the REAL mergeTestimony. Nothing about rendering or merging
// is stubbed: a composed passage here is assembled from sentences crown.js
// actually produced, so a change that let fabrication through either organ
// fails here too.
import test from "node:test";
import assert from "node:assert/strict";
import { renderCrown } from "./crown.js";
import { mergeTestimony } from "../eoreader7/native/organs/capacity-runner.js";
import { compose, coverageLine, transitionFor, TRANSITIONS, COMPOSE_REFUSALS } from "./compose.js";

const reading = (who, verdict, [subject, verb, object], read = [`${who}#0-10`]) => ({ who, verdict, read, edges: [{ subject, verb, object }] });
const render = (merged) => renderCrown(merged);

/** three real merges over real reading shapes — corroborated, single, and contested */
const AGREE = mergeTestimony([
  reading("lincoln.txt", "holds", ["Lincoln", "appointed", "Hamlin"]),
  reading("almanac.txt", "holds", ["Lincoln", "appointed", "Hamlin"]),
]);
const SINGLE = mergeTestimony([reading("almanac.txt", "holds", ["Hamlin", "chaired", "the Senate"])]);
const DISAGREE = mergeTestimony([
  reading("lincoln.txt", "holds", ["Lincoln", "dismissed", "Seward"]),
  reading("almanac.txt", "refused", ["Lincoln", "dismissed", "Seward"]),
]);
const UNDET = mergeTestimony([reading("lincoln.txt", "undetermined", ["Grant", "commanded", "the army"])]);

const item = (merged, claim) => ({ merged, claim });
const byGiven = () => 0; // a declared comparator that keeps given order — the CALLER's declaration, not a default

test("the merges this file composes over are the REAL ones — mergeTestimony's own cases", () => {
  assert.equal(AGREE.case, "AGREE");
  assert.equal(SINGLE.case, "SINGLE");
  assert.equal(DISAGREE.case, "DISAGREE");
  assert.equal(UNDET.case, "UNDETERMINED");
});

test("NO DECLARED ORDER IS A REFUSAL, never a quiet fallback to the order it was handed", () => {
  const r = compose([item(AGREE, { end1: "Lincoln" }), item(SINGLE, { end1: "Hamlin" })], { renderClaim: render });
  assert.equal(r.text, "", "a passage is not emitted at all without a declared order");
  assert.equal(r.refused.type, COMPOSE_REFUSALS.NO_DECLARED_ORDER);
  assert.equal(r.withheld.length, 2, "and every claim is named as withheld, not dropped");
  assert.equal(r.coverage.composed, 0);
});

test("end to end: real merges through the real crown render, joined into one passage", () => {
  const r = compose(
    [item(AGREE, { end1: "Lincoln" }), item(SINGLE, { end1: "Hamlin" })],
    { renderClaim: render, orderBy: byGiven },
  );
  assert.equal(r.sentences.length, 2);
  assert.equal(r.coverage, r.coverage); // shape sanity
  assert.equal(r.coverage.composed, 2);
  assert.equal(r.coverage.withheld, 0);
  // each sentence IS what crown produced for that merge
  assert.equal(r.sentences[0].text, renderCrown(AGREE).text);
  assert.ok(r.text.includes(renderCrown(AGREE).text), "the passage carries the corroborated sentence verbatim");
  assert.ok(r.sentences[1].text.toLowerCase().includes("almanac.txt"), "a single-witness sentence still names its lone witness");
});

test("AN UNDETERMINED CLAIM IS NEVER ASSERTED, and never silently dropped — it is withheld BY NAME", () => {
  const r = compose(
    [item(AGREE, { end1: "Lincoln" }), item(UNDET, { end1: "Grant" })],
    { renderClaim: render, orderBy: byGiven },
  );
  assert.equal(r.sentences.length, 1);
  assert.equal(r.withheld.length, 1);
  assert.equal(r.withheld[0].reason, COMPOSE_REFUSALS.UNDETERMINED);
  assert.ok(!r.text.toLowerCase().includes("grant"), "nothing about the undetermined claim reaches the passage");
  assert.match(coverageLine(r), /composed 1 of 2 claim\(s\); 1 withheld \(1 undetermined\)/);
});

test("CONTROL BUILT TO FAIL: a renderer that returns text marked UNVERIFIED must not reach the passage", () => {
  // crown.js's own trace veto produces exactly this shape when it fires.
  const unverifiable = () => ({ text: "Lincoln appointed Seward.", verified: false, violations: [{ token: "Seward" }] });
  const r = compose([item(AGREE, { end1: "Lincoln" })], { renderClaim: unverifiable, orderBy: byGiven });
  assert.equal(r.text, "", "an unverifiable fallback is not an assertion a passage may carry");
  assert.equal(r.withheld[0].reason, COMPOSE_REFUSALS.UNVERIFIED);
});

test("a renderer that refuses outright is reported, not skipped", () => {
  const r = compose([item(AGREE, { end1: "Lincoln" })], { renderClaim: () => null, orderBy: byGiven });
  assert.equal(r.coverage.composed, 0);
  assert.equal(r.withheld[0].reason, COMPOSE_REFUSALS.RENDERER_REFUSED);
});

test("a renderer that throws is a withhold, never an exception out of compose", () => {
  const r = compose([item(AGREE, { end1: "Lincoln" })], { renderClaim: () => { throw new Error("boom"); }, orderBy: byGiven });
  assert.equal(r.withheld[0].reason, COMPOSE_REFUSALS.RENDERER_REFUSED);
});

test("transitionFor reads STRUCTURE only — the shared end, the contested case — never meaning", () => {
  const a = { claim: { end1: "Lincoln" }, merged: AGREE };
  const sameSubj = { claim: { end1: "Lincoln" }, merged: SINGLE };
  const contested = { claim: { end1: "Lincoln" }, merged: DISAGREE };
  const other = { claim: { end1: "Grant" }, merged: AGREE };
  assert.equal(transitionFor(null, a), "open");
  assert.equal(transitionFor(a, sameSubj), "sameSubject");
  assert.equal(transitionFor(a, contested), "intoContested");
  assert.equal(transitionFor(contested, a), "outOfContested");
  assert.equal(transitionFor(a, other), "newSubject");
});

test("EVERY word compose adds comes from the closed table — the passage is its sentences plus declared connectives, nothing else", () => {
  const items = [item(AGREE, { end1: "Lincoln" }), item(DISAGREE, { end1: "Lincoln" }), item(SINGLE, { end1: "Hamlin" })];
  const r = compose(items, { renderClaim: render, orderBy: byGiven });
  for (const s of r.sentences) {
    assert.ok(Object.prototype.hasOwnProperty.call(TRANSITIONS, s.transition), `transition "${s.transition}" is not in the declared table`);
    const join = TRANSITIONS[s.transition];
    // the sentence is exactly the declared connective plus the renderer's own
    // text (first letter lowered only when a connective actually precedes it)
    const body = renderCrown(s === r.sentences[0] ? AGREE : s.transition === "intoContested" ? DISAGREE : SINGLE).text;
    const expected = join ? `${join}${body.charAt(0).toLowerCase()}${body.slice(1)}` : body;
    assert.equal(s.text, expected, "compose wrote a word that is neither the renderer's nor a declared connective");
  }
});

test("an empty set composes to an empty passage and says so, rather than throwing", () => {
  const r = compose([], { renderClaim: render, orderBy: byGiven });
  assert.equal(r.text, "");
  assert.equal(coverageLine(r), "nothing was given to compose.");
});

test("renderClaim is injected — compose holds no template of its own", () => {
  assert.throws(() => compose([item(AGREE, {})], { orderBy: byGiven }), /renderClaim is injected/);
});
