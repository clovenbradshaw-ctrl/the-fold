import test from "node:test";
import assert from "node:assert/strict";
import { corpusPrior, rank, activated, scoreAgainstPrior, ACTIVATION_BONUS, CITATION_BONUS } from "./retrieval-prior.js";

const mk = (ref, text) => ({ ref, source: ref.split("#")[0], text, start: 0, terms: new Set(text.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean)) });
const corpus = [
  mk("tolstoy.txt#0", "pierre spoke to andrew about the war"),
  mk("tolstoy.txt#1", "pierre walked through moscow in the snow"),
  mk("tolstoy.txt#2", "pierre and natasha met at the ball"),
  mk("lincoln.html#0", "lincoln signed the yosemite grant in 1864"),
];

test("a term's weight is its own surprise in THIS material — a form in every passage separates nothing", () => {
  const p = corpusPrior(corpus);
  // "pierre" is in three of four passages; "yosemite" in one. Term counting
  // treats them identically, which is why a planted name from the wrong book
  // could outrank the cited source (P133/P135).
  assert.ok(p.weight("yosemite") > p.weight("pierre"), "the rarer term carries more");
  assert.equal(p.weight("the"), 0, "a form in every passage is the medium, not evidence");
  assert.equal(p.weight("nonexistent"), 0, "never seen cannot separate");
});

test("retrieval ranks by informativeness, not by how many words happened to match", () => {
  const p = corpusPrior(corpus);
  // A question about the grant: "the" matches everywhere and must not carry it.
  const got = rank(corpus, "which grant did lincoln sign", { prior: p, limit: 1 });
  assert.equal(got[0].ref, "lincoln.html#0");
  // Naming the source outranks not naming it, and says so in the score.
  const cited = scoreAgainstPrior(corpus[3], ["grant"], { prior: p, cited: "lincoln.html" });
  const plain = scoreAgainstPrior(corpus[3], ["grant"], { prior: p });
  assert.equal(Number((cited - plain).toFixed(6)), CITATION_BONUS);
});

test("what the conversation is currently about weighs more — activation is a nudge, never a verdict", () => {
  const live = activated([{ question: "tell me about Natasha", answer: "Natasha met Pierre at the ball." }], { namesOf: () => ["Natasha"] });
  assert.ok(live.has("natasha"));
  const p = corpusPrior(corpus);
  const withLive = scoreAgainstPrior(corpus[2], ["pierre"], { prior: p, live });
  const without = scoreAgainstPrior(corpus[2], ["pierre"], { prior: p });
  assert.equal(Number((withLive - without).toFixed(6)), ACTIVATION_BONUS);
  assert.ok(ACTIVATION_BONUS < CITATION_BONUS, "being talked about counts for less than being named");
  assert.equal(activated([], {}).size, 0);
});
