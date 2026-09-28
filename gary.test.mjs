// gary.test.mjs — the prompting archon's rules, BUILT TO FAIL (II.23): every
// control runs in BOTH directions, so a rule that stopped looking fails here
// rather than passing quietly. Against the REAL firewall organs, the REAL
// prompt constants this repo ships, and the REAL Kondo.
// PLANTED-CONTROL.
import test from "node:test";
import assert from "node:assert/strict";
import { makeGary, assertPromptsBuildable, garyDecision, RULES, SEVERITY, checkOracleMode, hasCheckableClaim, oracleContentWords, oracleRefusalText, ORACLE_MIN_CONTENT_WORDS } from "../eoreader7/native/organs/gary.js";
import { makeKondo, TIDY_PAIRS, TIDY_NOTES_PAIR, wordsOf } from "../eoreader7/native/organs/kondo.js";
import { makeParmenides } from "../eoreader7/native/organs/parmenides.js";
import { strikeAddresses, apparatusMentions } from "../eoreader7/native/organs/firewall.js";
import { buildWitnessMessages, buildSelectMessages } from "../eoreader7/native/organs/testimony.js";
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
  // apparatusMentions returns [{term,...}] rows, not strings — a caller that
  // joins the rows themselves prints "[object Object]" and names nothing.
  // Found live 2026-09-16, checking the witness's own prompts against Gary
  // for the first time.
  const finding = named.findings.find((f) => f.rule === "no-apparatus");
  assert.match(finding.detail, /passage/, `the finding names the term, not the row: ${finding.detail}`);
  assert.doesNotMatch(finding.detail, /object Object/);

  for (const [name, text] of Object.entries({ FLAT_EXECUTE_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT, S1_SYSTEM_PROMPT })) {
    assert.ok(!rules(gary.check([sys(text)])).includes("no-apparatus"), `${name} is firewall-clean`);
  }
});

test("the witness/select mouth's own prompts (testimony.js, Wigmore) are read too — a mouth is a mouth, and no test had ever checked them before this (2026-09-16)", () => {
  // Live specimen: OLMo-2-1B was asked "You are checking one sentence
  // against one passage... Passage: ..." — buildWitnessMessages' own
  // prompt named an apparatus part on every call, unnoticed because
  // assertPromptsBuildable only ever covered the four DRAFT prompts.
  // Fixed at the source (testimony.js: "passage" -> "text"); pinned here so
  // it cannot silently return.
  const witness = gary.check(buildWitnessMessages("A claim.", "Some source text."), { arm: "generate" });
  assert.ok(!rules(witness).includes("no-apparatus"), `witness prompt names apparatus: ${JSON.stringify(witness.findings)}`);
  const select = gary.check(buildSelectMessages("A claim.", ["A candidate sentence."]), { arm: "select" });
  assert.ok(!rules(select).includes("no-apparatus"), `select prompt names apparatus: ${JSON.stringify(select.findings)}`);
  // "Do not invent; only choose from the list." still flags — reviewed, not
  // fixed: it is closed-set index selection under a JSON schema with no
  // enforced range (SELECT_SCHEMA's own `sentence` is a bare integer), so
  // the prohibition is doing real, checked work, not free-text priming —
  // the measured harm this rule guards against (P32) is for open generation.
  assert.ok(rules(select).includes("information-not-prohibition"), "the reviewed flag still fires, so this decision is re-checked if the prompt ever changes");
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

test("no-oracle-mode is a closed, REFUSE-severity rule", () => {
  const rule = RULES.find((r) => r.id === "no-oracle-mode");
  assert.ok(rule, "the rule is in the closed table");
  assert.equal(rule.severity, SEVERITY.REFUSE);
  assert.equal(rule.cites, "P244");
});

test("REFUSED: nothing in view and nothing checkable in the person's own words", () => {
  assert.equal(ORACLE_MIN_CONTENT_WORDS, 2, "the floor is admission.js's own structural 2, never a fresh number");
  assert.deepEqual(oracleContentWords("hi"), [], "a greeting carries no content");
  assert.ok(!hasCheckableClaim("hi"));
  assert.ok(!hasCheckableClaim("prove it"), "one content word is not a claim");
  assert.ok(hasCheckableClaim("What's the capital of France?"), "two content words are");
  assert.ok(hasCheckableClaim("who is the chairman"), "a WH-definite description with the article");
  assert.ok(hasCheckableClaim("who is chairman"), "the identical shape with the article dropped — idiomatic for a unique office, found live 2026-09-22");
  assert.ok(hasCheckableClaim("who is president"), "another unique-office title, article-less");
  assert.ok(hasCheckableClaim("what's chairman"), "the contracted copula, article-less, still a definite description");
  assert.equal(checkOracleMode({ materialEmpty: true, text: "who is chairman" }), null, "an article-less definite description in view never fires REFUSE");

  const hit = checkOracleMode({ materialEmpty: true, text: "hi" });
  assert.ok(hit, "fires");
  assert.equal(hit.rule, "no-oracle-mode");
  assert.equal(hit.severity, SEVERITY.REFUSE);

  assert.equal(checkOracleMode({ materialEmpty: false, text: "hi" }), null, "material in view never fires");
  assert.equal(checkOracleMode({ materialEmpty: true, text: "What's the capital of France?" }), null, "a checkable claim in view never fires");
  assert.equal(checkOracleMode({ materialEmpty: true, text: "hi", questionCycle: { cycle: ["a"] } }), null, "a cycle result is a claim in view");
  assert.ok(checkOracleMode({ materialEmpty: true, text: "hi", questionCycle: null }), "checked-and-nothing still refuses");
  assert.equal(checkOracleMode({ text: "hi" }), null, "unknown material is a gap, never a conviction");
  assert.equal(checkOracleMode({ materialEmpty: null, text: "hi" }), null);

  const via = gary.check([sys("material"), user("hi")], { material: [] });
  assert.ok(rules(via).includes("no-oracle-mode"), "Gary's own check reads it over the person's last turn");
  assert.ok(via.findings.some((f) => f.rule === "no-oracle-mode" && f.severity === SEVERITY.REFUSE));
  assert.ok(!rules(gary.check([sys("material"), user("hi")], { material: ["notes.txt"] })).includes("no-oracle-mode"));
  assert.ok(!rules(gary.check([sys("material"), user("What's the capital of France?")], { material: [] })).includes("no-oracle-mode"));
  const unknown = gary.check([sys("material"), user("hi")]);
  assert.ok(!rules(unknown).includes("no-oracle-mode"), "no material count handed over: not checked");
  assert.ok(unknown.gaps.some((g) => g.type === "no_material_view"));
  const refused = gary.hand([sys("material"), user("hi")], { material: [] }).refused;
  assert.ok(refused.some((f) => f.rule === "no-oracle-mode"), "a REFUSE rides `refused` so the caller decides");
});

test("the oracle refusal routes to the fixed reply — last document, or what to read", () => {
  assert.match(oracleRefusalText({ lastRef: "notes.txt" }), /notes\.txt/, "points back at the last live document");
  assert.match(oracleRefusalText({}), /What should I read\?/, "otherwise asks what to read");
  assert.equal(oracleRefusalText({ lastRef: "a" }) === oracleRefusalText({ lastRef: "b" }), false, "two shapes, closed set — never free association");
});
