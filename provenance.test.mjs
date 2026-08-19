// provenance.test.mjs — every sentence stands on a named ground, and the
// classification is read off the checks the turn already ran, never measured
// fresh. The real organs feed it: attribute() for the per-sentence verdicts,
// checkGrounding() for the atom findings.

import { test } from "node:test";
import assert from "node:assert/strict";

import { classifySentences, stripNarrationSentences, stripScaffoldNarration } from "./provenance.js";
import { chunkSource } from "./source.js";
import { attribute } from "./cite.js";
import { checkGrounding } from "./grounding.js";

const TEXT =
  "The Kessington report put the harbor figure at 12% for the spring quarter.\n\n" +
  "Dredging of the shipping channel runs through March under the port authority schedule.";
const chunks = chunkSource("notes.txt", TEXT);

test("sentences are classified onto material or model ground, with claims striped", () => {
  const answer =
    "The Kessington report put the harbor figure at 12% for the spring quarter. " +
    "That seems like a sensible revision overall. " +
    "The Marlborough audit said the figure was 47%.";
  const attributions = attribute(answer, chunks, chunks);
  const grounding = checkGrounding(answer, chunks, { question: "harbor figure?" });
  const classified = classifySentences(answer, attributions, grounding.findings);

  assert.equal(classified.length, 3);

  // Sentence 1: verbatim from the material — attribution attached an address.
  assert.equal(classified[0].ground, "material");
  assert.equal(classified[0].ref, chunks[0].ref);
  assert.deepEqual(classified[0].absent, []);

  // Sentence 2: the model's own voice, no claims — model ground, no stripe.
  assert.equal(classified[1].ground, "model");
  assert.equal(classified[1].ref, null);
  assert.deepEqual(classified[1].absent, []);

  // Sentence 3: model ground AND claims of fact the material does not hold —
  // the invented auditor and the invented figure are both on the stripe.
  assert.equal(classified[2].ground, "model");
  assert.ok(classified[2].absent.some((t) => /Marlborough/i.test(t)));
  assert.ok(classified[2].absent.some((t) => t.includes("47")));
});

test("a model-cited sentence is material ground even before attribution", () => {
  const answer = `Dredging runs through March. [${chunks[1].ref}]`;
  const attributions = attribute(answer, chunks, chunks);
  const classified = classifySentences(answer, attributions, []);
  assert.equal(classified[0].ground, "material");
});

test("a cited sentence can still carry an absent claim — the stripe is orthogonal to the ground", () => {
  const answer = `The report gave the figure as 47% for the spring quarter. [${chunks[0].ref}]`;
  const grounding = checkGrounding(answer, chunks, { question: "" });
  const attributions = attribute(answer, chunks, chunks);
  const classified = classifySentences(answer, attributions, grounding.findings);
  assert.equal(classified[0].ground, "material", "it cited an offered address");
  assert.ok(classified[0].absent.some((t) => t.includes("47")), "and drifted from it — both facts shown");
});

test("meta-narration in brackets is stripped, hidden, and disclosed by count", () => {
  // The exact live leak: a real citation address alongside a multi-sentence
  // narration about the act of answering.
  const answer =
    "What event led to their meeting? " +
    "[Answering the prompt, I have searched through the provided text and have not found the event. The text only describes them interacting at a reception. ]";
  const { text, removed } = stripScaffoldNarration(answer);
  assert.equal(removed.length, 1);
  assert.ok(!text.includes("Answering the prompt"));
  assert.ok(!text.includes("I have searched"));
  assert.equal(text, "What event led to their meeting?");
});

test("a real citation address survives untouched", () => {
  const answer = "The figure was 12%. [notes.txt#0-74]";
  const { text, removed } = stripScaffoldNarration(answer);
  assert.equal(removed.length, 0);
  assert.equal(text, answer);
});

test("a short bracketed aside is content, not narration — one sentence, left alone", () => {
  // A stage direction or editorial insertion inside quoted prose is a
  // phrase, never a full extra sentence — the structural line this test
  // must not cross.
  const answer = 'He said, "we are wrong to fight [said ironically] for the king."';
  const { text, removed } = stripScaffoldNarration(answer);
  assert.equal(removed.length, 0);
  assert.equal(text, answer);
});

test("multiple narration spans are all removed; the gap they leave collapses cleanly", () => {
  const answer =
    "[Let me think about this. I will search the text now.] The figure was 12%. [notes.txt#0-74] " +
    "[In conclusion, I have reviewed everything. There is nothing more to add.]";
  const { text, removed } = stripScaffoldNarration(answer);
  assert.equal(removed.length, 2);
  assert.equal(text, "The figure was 12%. [notes.txt#0-74]");
});

test("relation verdicts ride the sentence that carries subject and verb, read off, never re-measured", async () => {
  const { classifySentences } = await import("./provenance.js");
  const answer = "Pierre Bezukhov married Dolokhov. The winter was long.";
  const claims = [
    {
      sentence: "Pierre Bezukhov married Dolokhov.",
      subject: "Pierre Bezukhov",
      verb: "married",
      object: "Dolokhov",
      polarity: "+",
      verdict: "unbound",
      nearest: [],
    },
  ];
  const entries = classifySentences(answer, [], [], claims);
  const first = entries.find((e) => /married/.test(e.text));
  assert.equal(first.edges.length, 1);
  assert.equal(first.edges[0].verdict, "unbound");
  const second = entries.find((e) => /winter/.test(e.text));
  assert.equal(second.edges.length, 0);
  // Backward compatible: the fourth argument omitted means no edges, never a throw.
  const bare = classifySentences(answer, [], []);
  assert.ok(bare.every((e) => Array.isArray(e.edges) && e.edges.length === 0));
});

test("the narration register is stripped: cut, deflate, echo, false refusal", () => {
  // DEFLATE — the complement is content, the wrapper is the register.
  const d = stripNarrationSentences("This passage indicates that Nashville is located on the Cumberland River.");
  assert.equal(d.text, "Nashville is located on the Cumberland River.");
  assert.equal(d.removed.length, 1);

  // CUT — no complement, nothing carried: the live turn-8 opener verbatim.
  const c = stripNarrationSentences(
    "This prompt aims to calculate a population growth scenario. It asks the user to compute it. The answer is 724,000.",
  );
  assert.equal(c.text, "The answer is 724,000.");
  assert.equal(c.removed.length, 2);

  // ECHO of the discourse block — the live turn-2 opener.
  const e = stripNarrationSentences(
    "The conversation so far in one line: Nashville River location. The population was 689,447 in 2020.",
    { discourse: "Nashville River location · Conversation focused on the river" },
  );
  assert.ok(!/conversation so far/i.test(e.text));
  assert.ok(/689,447/.test(e.text));

  // FALSE REFUSAL on the material path — the live turn-6 answer. In plain
  // chat (no material) the same sentence is odd but not provably false, so
  // it survives there.
  const f = stripNarrationSentences("I can't access or provide a table of the content in nashville.md.", { hasMaterial: true });
  assert.equal(f.text, "");
  const g = stripNarrationSentences("I can't access your calendar.", { hasMaterial: false });
  assert.equal(g.removed.length, 0);

  // Real prose about a passage IN THE MATERIAL'S OWN SUBJECT survives — the
  // register needs the narration verb, not just the noun.
  const h = stripNarrationSentences("The document was signed in 1779 by James Robertson.");
  assert.equal(h.removed.length, 0);
});

test("stripNarrationSentences never touches a fenced code block, even when a cut happens elsewhere", () => {
  // The exact bug measured live in this session: a blanket whitespace-
  // collapse regex ran over the WHOLE output whenever anything was cut,
  // destroying 4-space Python indentation in a fence the cut never came
  // near. Both strip functions share the fence-splice fix; this pins it at
  // the narration-sentence layer, where the live trial actually hit it.
  const draft =
    "This prompt aims to calculate a population script.\n\n" +
    "```python\n" +
    "def fib(n):\n" +
    "    a = [0, 1]\n" +
    "    for i in range(2, n):\n" +
    "        a.append(a[i-1] + a[i-2])\n" +
    "    return a\n" +
    "```";
  const { text, removed } = stripNarrationSentences(draft);
  assert.equal(removed.length, 1);
  assert.ok(text.includes("```python\ndef fib(n):\n    a = [0, 1]\n    for i in range(2, n):\n        a.append(a[i-1] + a[i-2])\n    return a\n```"));
});

test("the modifier-gap narration with an appositive quote is cut; a content subject behind modifiers survives", () => {
  // Measured live 2026-08-19 ("who won the 1960 world series?", gemma2:2b):
  // the whole shipped answer was one narration sentence whose subject noun
  // sat three modifiers from its determiner, with the quoted question as an
  // appositive between subject and verb — outside both the adjacent-noun
  // subject pattern and the narrow verb gap. Extended together with
  // holon.js's DIALOGUE_NARRATION_RE (one register, two files).
  const specimen =
    'The 1960 World Series question, "who won the 1960 World Series?", is directly related to baseball playoffs, specifically the 1960 World Series. The Pirates took the title in seven games.';
  const { text, removed } = stripNarrationSentences(specimen, { hasMaterial: true });
  assert.equal(removed.length, 1);
  assert.ok(/is directly related/.test(removed[0]));
  assert.equal(text, "The Pirates took the title in seven games.");
  // The widening's guard, pinned from the other direction: a real content
  // subject that happens to wear a register noun behind modifiers ships.
  const guard = stripNarrationSentences(
    "The user account is locked after three failed attempts, and the reset procedure requires an administrator token.",
    { hasMaterial: true },
  );
  assert.equal(guard.removed.length, 0);
});
