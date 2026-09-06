// chain-reason.test.mjs — P149. The model ideates; the chain does the logic.
import test from "node:test";
import assert from "node:assert/strict";
import { walk, nul, checkSubject, checkQuotes, checkSelection, ideatingOnly, ASKS, composeAsk, CELLS, endingFor } from "./chain-reason.js";

const split = (t) => String(t).split(/(?<=[.!?])\s+/).filter(Boolean).map((text, order) => ({ text, offset: 0, order }));
const P = [
  { ref: "wp#1", text: 'The two princesses embraced while Prince Andrew stood by, uncomfortable and silent.' },
  { ref: "wp#2", text: '"Both true and untrue," Pierre began; but Prince Andrew interrupted him.' },
];

test("THE WALL: the model may be asked to name, quote or choose — never to infer", () => {
  for (const ok of ["What person does this ask about? Reply with the name only.",
                    "Copy out any sentence that mentions Pierre.",
                    "Which of these numbers are about the question?"]) {
    assert.doesNotThrow(() => ideatingOnly(ok), `must allow ideation: ${ok}`);
  }
  for (const bad of ["Given the passage, what therefore follows?", "Explain why the sources disagree.",
                     "Do you think this is correct?", "Which conclusion can you deduce?",
                     "Is this true?", "Prove that Pierre spoke first."]) {
    assert.throws(() => ideatingOnly(bad), /ideates/, `must refuse inference: ${bad}`);
  }
});

test("THE WALL holds over the cells' own asks — none of them smuggles logic to the model", () => {
  assert.doesNotThrow(() => ASKS.SIG("what did Pierre say"));
  assert.doesNotThrow(() => ASKS.INS("Pierre", P));
  assert.doesNotThrow(() => ASKS.CON("what did Pierre say", [{ text: "x" }]));
  assert.doesNotThrow(() => composeAsk("what did Pierre say", [{ text: "x", ref: "wp#2" }]));
});

test("SIG: a subject the material never mentions ends the walk, before any prose exists", () => {
  const r = checkSubject("Buddha", P);
  assert.equal(r.ok, false);
  assert.equal(r.verdict, "beyond-reach");
  assert.match(r.detail, /nothing read mentions Buddha/);
});

test("SIG: a subject the material does mention resolves, and carries its address", () => {
  const r = checkSubject("Prince Andrew", P);
  assert.equal(r.ok, true);
  assert.ok(r.subjects.some((s) => s.ref === "wp#1" || s.ref === "wp#2"));
});

test("INS: a quotation that is not in the material verbatim does not pass, and the near miss carries what IS there", () => {
  const r = checkQuotes(['"Both true and untrue," Pierre began; but Prince Andrew interrupted him.',
                         // A near-paraphrase of the FIRST passage: most of its
                         // words, none of its exactness. This is the drift a
                         // one-shot draft ships as a quotation.
                         "The two princesses embraced and Prince Andrew stood by, uncomfortable and quiet."].join("\n"), P, { splitSentences: split });
  assert.equal(r.established.length, 1, "only the verbatim one passes");
  assert.equal(r.refused.length, 1);
  assert.ok(r.refused[0].material, "a near miss reports what the material actually says");
});

test("CON: the model may only choose by number, so it cannot introduce anything", () => {
  const est = [{ text: "a", ref: "r1" }, { text: "b", ref: "r2" }, { text: "c", ref: "r3" }];
  const r = checkSelection("2, 3, and also Napoleon at Austerlitz", est);
  assert.deepEqual(r.chosen.map((c) => c.ref), ["r2", "r3"], "prose in the reply is ignored; only indices count");
  assert.deepEqual(r.dropped.map((c) => c.ref), ["r1"], "what was set aside is recorded, not discarded");
});

test("CON: an out-of-range choice cannot conjure a span", () => {
  const r = checkSelection("7, 9, 400", [{ text: "a", ref: "r1" }]);
  assert.equal(r.ok, false);
  assert.equal(r.verdict, "no_incidence");
});

test("MEASURED (P149): the walk turns confident falsehoods into stated absences", async () => {
  // The mechanism, end to end: a model that names something absent produces a
  // typed null, not an answer built around the absent thing. Measured on 12
  // real probes — one-shot 7 confident falsehoods and 0 stated absences; the
  // walk 1 and 7.
  const liar = async (prompt) => (/ask about/.test(prompt) ? "Buddha" : "some sentence");
  const r = await walk({ question: "what did Buddha say to Pierre", passages: P, ask: liar, splitSentences: split });
  assert.equal(r.ended, "SIG");
  assert.match(r.text, /Nothing in the sources mentions/);
  assert.equal(r.calls, 1, "and it costs ONE call to find out, not a whole draft");
});

test("the walk completes when every cell is established, and carries what it stood on", async () => {
  const honest = async (prompt) => {
    if (/ask about/.test(prompt)) return "Prince Andrew";
    if (/Copy out/.test(prompt)) return P[1].text;
    if (/Which of these numbers/.test(prompt)) return "1";
    return "Pierre began and Prince Andrew interrupted him (wp#2).";
  };
  const r = await walk({ question: "what happened between Pierre and Prince Andrew", passages: P, ask: honest, splitSentences: split });
  assert.equal(r.ended, null);
  assert.equal(r.steps.map((s) => s.cell).join(">"), "NUL>SIG>INS>CON>DEF");
  assert.equal(r.established.length, 1);
  assert.equal(r.established[0].ref, "wp#2", "the answer stands on an address, not on restated text");
});

test("NUL: no material means no walk, and one call is never spent finding that out", async () => {
  let calls = 0;
  const r = await walk({ question: "anything", passages: [], ask: async () => { calls++; return "x"; }, splitSentences: split });
  assert.equal(calls, 0, "nothing may be asked of the model about nothing");
  assert.equal(r.ended, "NUL");
  assert.match(r.text, /Nothing was retrieved/);
});

test("every ending is a typed finding with its reason, never a blank", () => {
  for (const v of ["empty_material", "beyond-reach", "unverified", "no_incidence"]) {
    const t = endingFor([{ verdict: v, detail: "what was checked" }]);
    assert.ok(t.length > 20 && t.includes("what was checked"), `${v} must state itself and its evidence`);
  }
});

test("the cells are the cube's own order", () => {
  assert.deepEqual(CELLS, ["NUL", "SIG", "INS", "CON", "DEF"]);
});
