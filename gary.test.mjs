// gary.test.mjs — the prompting archon's rules, BUILT TO FAIL (II.23): every
// control runs in BOTH directions, so a rule that stopped looking fails here
// rather than passing quietly. Against the REAL firewall organs, the REAL
// prompt constants this repo ships, and the REAL Kondo.
// PLANTED-CONTROL.
import test from "node:test";
import assert from "node:assert/strict";
import { makeGary, assertPromptsBuildable, garyDecision, RULES, SEVERITY } from "./gary.js";
import { makeKondo, TIDY_PAIRS, TIDY_NOTES_PAIR, wordsOf } from "./kondo.js";
import { makeParmenides } from "./parmenides.js";
import { strikeAddresses, apparatusMentions } from "../eoreader7/native/organs/firewall.js";
import { EXECUTE_SYSTEM_PROMPT, FLAT_EXECUTE_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT, S1_SYSTEM_PROMPT, SEARCHED_VOID_PREFIX } from "./holon.js";

const parmenides = makeParmenides({ fold: (s) => wordsOf(s).join(" ") });
const kondo = makeKondo({ same: parmenides.same });
const gary = makeGary({ strikeAddresses, apparatusMentions, kondo });
const sys = (c) => ({ role: "system", content: c });
const user = (c) => ({ role: "user", content: c });
const rules = (r) => r.findings.map((f) => f.rule);

test("the rules are a closed, cited table", () => {
  assert.ok(RULES.length >= 7);
  for (const r of RULES) { assert.ok(r.id && r.says && r.cites, `${r.id} names what it is and where it comes from`); assert.ok(Object.values(SEVERITY).includes(r.severity)); }
});

test("an address is STRUCK at the door, and a prompt with none is handed over untouched", () => {
  const withRef = gary.hand([sys('The note rests on lincoln.txt#0-84 and [pg2600.txt#12-40].'), user("who?")]);
  assert.ok(!/#\d+-\d+/.test(withRef.messages[0].content), "no address survives the door");
  assert.ok(withRef.struck > 0, "and the strike is counted");

  const clean = gary.hand([sys("Lincoln was raised on the frontier."), user("who?")]);
  assert.equal(clean.struck, 0, "a prompt with no address loses nothing");
});

test("naming this instrument's own parts is found; the real prompts this repo ships do not", () => {
  const named = gary.check([sys("The passages retrieved for this turn follow. Do not describe the prompt.")]);
  assert.ok(rules(named).includes("no-apparatus"), "apparatus vocabulary is found");

  for (const [name, text] of Object.entries({ FLAT_EXECUTE_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT, S1_SYSTEM_PROMPT })) {
    assert.ok(!rules(gary.check([sys(text)])).includes("no-apparatus"), `${name} is firewall-clean`);
  }
});

test("asking for JSON is REFUSED, and the shipped prompts never ask", () => {
  const asks = gary.check([sys("Reply with a JSON object only."), user("go")]);
  assert.ok(asks.findings.some((f) => f.rule === "no-json-ask" && f.severity === SEVERITY.REFUSE));

  assert.deepEqual(rules(gary.check([sys('The schema has a "json" field name in it.')])).filter((r) => r === "no-json-ask"), [], "merely naming json is not an ask");
  assert.doesNotThrow(() => assertPromptsBuildable({ EXECUTE_SYSTEM_PROMPT, FLAT_EXECUTE_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT, S1_SYSTEM_PROMPT }, gary));
  assert.throws(() => assertPromptsBuildable({ BAD: "Answer in JSON format." }, gary), /no-json-ask/);
});

test("a prohibition aimed at the mouth is flagged; a stated absence is not", () => {
  const told = gary.check([sys("Do not invent a name. Never guess.")]);
  assert.ok(rules(told).includes("information-not-prohibition"));

  // the void prefix states a FACT and asks for plainness — the posture the
  // measured prompts already hold
  assert.ok(!rules(gary.check([sys(SEARCHED_VOID_PREFIX)])).includes("information-not-prohibition"), "a fact about the world is not a prohibition");
  // and the finding is real on a prompt this repo still ships, which is why it
  // is a FLAG with the clause rather than a refusal
  const real = gary.check([sys(EXECUTE_SYSTEM_PROMPT)]);
  const f = real.findings.find((x) => x.rule === "information-not-prohibition");
  assert.ok(f && f.clauses.length, "EXECUTE_SYSTEM_PROMPT's own prohibitions are named, with the clause");
});

test("a prompt that will not fit the loaded window is flagged; an unknown window is a gap, never a verdict", () => {
  const big = [sys("x ".repeat(12000)), user("go")];
  const heimdallSays = makeGary({ strikeAddresses, apparatusMentions, windowOf: () => 4096 });
  assert.ok(rules(heimdallSays.check(big, { model: "gemma2:2b", options: { num_predict: 512 } })).includes("fits-the-window"));

  const roomy = makeGary({ strikeAddresses, apparatusMentions, windowOf: () => 131072 });
  assert.ok(!rules(roomy.check(big, { model: "gemma2:2b", options: { num_predict: 512 } })).includes("fits-the-window"));

  const blind = gary.check(big, { model: "gemma2:2b" });
  assert.ok(!rules(blind).includes("fits-the-window"));
  assert.ok(blind.gaps.some((g) => g.type === "no_window"), "unmeasured is a gap");
});

test("the person's own message is the last turn", () => {
  assert.ok(!rules(gary.check([sys("material"), user("what happened?")])).includes("question-last"));
  assert.ok(rules(gary.check([sys("material"), user("what happened?"), { role: "assistant", content: "…" }])).includes("question-last"));
});

test("Kondo rides along: what the prompt carries twice is named with its owner", () => {
  const twice = gary.check([sys(`What the sources say, verbatim:
- Lincoln was raised on the frontier.

What the sources state about this:
- Lincoln was raised on the frontier.`), user("where?")]);
  const f = twice.findings.find((x) => x.rule === "nothing-twice");
  assert.ok(f, "the repeat is found");
  assert.ok(f.owners.length, "and its owner named");
  assert.ok(!rules(gary.check([sys("What the sources say, verbatim:\n- Lincoln was raised on the frontier."), user("where?")])).includes("nothing-twice"));
});

test("REFUSED: a note is not cut because a snip carries it, unless the arm is declared", () => {
  const asked = [...TIDY_PAIRS, TIDY_NOTES_PAIR];
  const claims = gary.permitCut(asked, { notesPair: TIDY_NOTES_PAIR });
  assert.equal(claims.pairs.length, TIDY_PAIRS.length, "the notes cut is taken out of the bag");
  assert.equal(claims.refused.rule, "notes-are-not-cut-for-a-snip");
  assert.match(claims.refused.detail, /3-4 fabrications in 10/);

  const full = gary.permitCut(asked, { arm: "full", notesPair: TIDY_NOTES_PAIR });
  assert.equal(full.pairs.length, asked.length, "declared, it is permitted");
  assert.equal(full.refused, null);

  assert.equal(gary.permitCut(TIDY_PAIRS, { notesPair: TIDY_NOTES_PAIR }).refused, null, "the claims cut needs no arm");
});

test("the record carries rules and severities — never the prompt's own words", () => {
  const read = gary.hand([sys("Do not invent. The passages say Hodgenville."), user("where?")], { model: "gemma2:2b", options: { num_ctx: 8192 } });
  const entry = garyDecision({ turn: 2, model: "gemma2:2b", read });
  assert.equal(entry.act, "gary-hand");
  assert.ok(entry.findings.length >= 1);
  assert.ok(!JSON.stringify(entry).includes("Hodgenville"), "the record holds rules, not material");
});
