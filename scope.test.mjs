import test from "node:test";
import assert from "node:assert/strict";
import { loadScopePriors } from "./scope-priors.mjs";
import { scopeOf, ungroundedFact, standingGround, anchorsOf, resolveJurisdiction, uncheckedLine, tenseOf } from "./scope.js";
import { answerRecord } from "./answer-record.js";

const priors = loadScopePriors();
const T = (s) => scopeOf(s, { priors }).type;
const now = new Date("2026-09-19T00:00:00Z");

test("scope types come from structure: open-now, timeless, interval, instant, none", () => {
  assert.equal(T("Who is the president?"), "open-now");
  assert.equal(T("What is the price of Bitcoin?"), "open-now");
  assert.equal(T("What is the latest version of Python?"), "open-now");
  assert.equal(T("What year is it?"), "open-now");
  assert.equal(T("What is the boiling point of water?"), "timeless");
  assert.equal(T("What is the square root of 144?"), "timeless");
  assert.equal(T("Who wrote Hamlet?"), "interval");
  assert.equal(T("What happened in 1969?"), "instant");
  assert.equal(T("Napoleon ruled France from 1804-1814."), "interval");
  assert.equal(T("Hi there!"), "none");
  assert.equal(T("How are you today?"), "none");
});

test("tense is read from morphology and the declared auxiliary paradigm, not a word list of subjects", () => {
  assert.equal(tenseOf("Who painted it", priors), "past");
  assert.equal(tenseOf("Who won", priors), "past");
  assert.equal(tenseOf("Who is it", priors), "present");
});

test("a calendar anchor is anything the platform parses as a date, not a month list", () => {
  assert.equal(anchorsOf("on March 4 the bridge reopened").length, 1);
  assert.equal(anchorsOf("in 2019").length, 1);
  assert.equal(anchorsOf("the 100m sprint").length, 0);
});

test("the predicate fires on an open-now claim with no ground and on an UNDATED ground, not on a dated one", () => {
  const a = { question: "Who is the president?", sentence: "Joe Biden.", now, priors };
  assert.equal(ungroundedFact(a).fires, true);
  assert.equal(ungroundedFact({ ...a, grounds: [{ ref: "x#0-5" }] }).fires, true);
  assert.equal(ungroundedFact({ ...a, grounds: [{ ref: "x#0-5", date: "2026-09-18" }] }).fires, false);
});

test("a dated answer to an open-now question is stale, and still ungrounded", () => {
  const r = ungroundedFact({ question: "Who is the president?", sentence: "As of 2023, Joe Biden is the president.", now, priors });
  assert.equal(r.fires, true); assert.equal(r.stale, true);
});

test("timeless, dated-past and chit-chat stay silent", () => {
  for (const [q, s] of [["What is the speed of light?", "The speed of light is about 300,000 km/s."], ["Who wrote Hamlet?", "William Shakespeare wrote Hamlet."], ["Hi there!", "Hello! How can I help you?"]]) {
    assert.equal(ungroundedFact({ question: q, sentence: s, now, priors }).fires, false, q);
  }
});

test("CONTROL: a naive 'any question' predicate would fire on timeless and past questions; this one must not", () => {
  const naive = (q) => /\?$/.test(q);
  assert.equal(naive("Who wrote Hamlet?"), true);
  assert.equal(ungroundedFact({ question: "Who wrote Hamlet?", now, priors }).fires, false);
});

test("Kelsen: the later dated ground prevails; an undated one never outranks", () => {
  const g = standingGround([{ ref: "a", date: "2020-01-01" }, { ref: "b", date: "2025-06-01" }, { ref: "c" }]);
  assert.equal(g.ref, "b");
  assert.equal(standingGround([{ ref: "c" }]), null);
});

test("jurisdiction: named in the question resolves firmly; otherwise the heaviest referent, declared as assumed", () => {
  const present = { referents: [{ name: "Nashville", weight: 6 }, { name: "Ford", weight: 3 }, { name: "France", weight: 2 }] };
  const isJ = (n) => n === "Nashville" || n === "France";
  assert.deepEqual(resolveJurisdiction("Who is the mayor of France?", present, { isJurisdiction: isJ }), { jurisdiction: "France", confidence: 1, assumed: false });
  const r = resolveJurisdiction("Who is the mayor?", present, { isJurisdiction: isJ });
  assert.equal(r.jurisdiction, "Nashville"); assert.equal(r.assumed, true); assert.ok(Math.abs(r.confidence - 0.75) < 1e-9);
  assert.deepEqual(resolveJurisdiction("Who is the mayor?", { referents: [] }), { jurisdiction: null, confidence: 0, assumed: true });
  assert.match(uncheckedLine({ now, jurisdiction: r }), /^Taking this to mean Nashville, as of 2026-09-19: nothing I found backed this up, so treat it as unchecked\.$/);
});

test("the answer record carries scope + ground on a claim and an ungrounded list only when given", () => {
  const base = answerRecord({ question: "q", answer: "a" });
  assert.equal("ungrounded" in base, false);
  const r = answerRecord({ question: "q", answer: "a", ungrounded: [{ sentence: "Joe Biden.", scope: "open-now" }], sections: [{ passages: [], relations: { claims: [{ end1: "x", label: "is", end2: "y", scope: { type: "open-now" }, ground: { ref: "w#0-9", date: "2026-09-18" } }] } }] });
  assert.equal(r.ungrounded.length, 1);
  assert.equal(r.claims[0].scope.type, "open-now"); assert.equal(r.claims[0].ground.date, "2026-09-18");
});

import { intentPair, intentNotes } from "./scope.js";
test("intent pair: the gate is decided before the draw, from the question", () => {
  const g = intentPair("Who is the president?", { priors, now, locale: "the United States" });
  assert.equal(g.person, "ask"); assert.equal(g.system, "assert"); assert.equal(g.tier, "S2"); assert.equal(g.action, "ground-first");
  assert.equal(g.jurisdiction.assumed, true); assert.equal(g.jurisdiction.jurisdiction, "the United States");
  for (const q of ["Hi there!", "Thanks a lot!"]) { const h = intentPair(q, { priors, now }); assert.equal(h.tier, "S1"); assert.equal(h.system, "acknowledge"); }
  assert.equal(intentPair("What is the speed of light?", { priors, now }).tier, "S1");
  assert.equal(intentNotes(3, g).length, 5);
});
