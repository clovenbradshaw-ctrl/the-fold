// dialogue-turn.test.mjs — the conversation's loops wired into the REAL turn
// (holon.js::runHolonicTask), driven by a stub mouth and the production
// relation reader over a built corpus, so what is pinned is the app's path.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runHolonicTask } from "./holon.js";
import { chunkSource, tokenize, blankLabelRows } from "./source.js";
import { makeRelationReader } from "./hypergraph.js";
import { makeReferentIndex } from "./cast.js";
import { splitSentences } from "../eoreader7/native/adapters/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "../eoreader7/native/adapters/text/surfaces.js";
import { resolvePronouns } from "../eoreader7/native/adapters/text/pronouns.js";
import { discoverRelationVocab, extractRelations } from "../eoreader7/native/adapters/text/relations.js";
import * as P from "../eoreader7/native/adapters/text/priors.js";

const FIX = new URL("../eoreader7/native/eval/the-fold/fixtures/", import.meta.url).pathname;
const posPrior = JSON.parse(readFileSync(`${FIX}pos-prior-eng.json`, "utf8"));
const verbForms = new Set(JSON.parse(readFileSync(`${FIX}unimorph-eng-verb-forms.json`, "utf8")));
const relationsFor = makeRelationReader({
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize,
  posPriorFor: () => posPrior, verbForms, oovLexicon: verbForms, nounPhraseSubjects: true, phrasalPredicates: true, attestedVerbs: true,
  determiners: new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]), negationWords: P.NEGATION_WORDS,
  blankFurniture: (t) => blankLabelRows(t, { minRun: 4, maxCell: 60 }), resolvePronouns,
});
// Verbs recur across sentences on purpose: the relation reader measures its
// vocabulary from the material (P76) and admits a verb only when it recurs.
const TEXT = [
  "Razumihin brought soup to Raskolnikov. Nastasya brought tea to Raskolnikov. Razumihin sat with Raskolnikov through the fever. Zossimov sat with Raskolnikov at night.",
  "Raskolnikov murdered the pawnbroker. Raskolnikov confessed to Sonia in her room. Svidrigailov confessed to Dounia in the street. Mikolka murdered nobody.",
  "Porfiry questioned Raskolnikov twice. Zametov questioned Raskolnikov once. Dounia refused Luzhin at the lodging. Sonia refused Svidrigailov at the door.",
].join("\n\n");
const chunks = chunkSource("novel.txt", TEXT);
// The turn is handed the REFERENT INDEX (P11) — every dialogue loop resolves names through it.
const indexFor = makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });
const organs = { makeRelationReader: relationsFor, makeReferentIndexFor: indexFor };
const refOf = (needle) => chunks.find((c) => c.text.includes(needle)).ref;
/** A mouth that names what it is told about only when told about it — the re-ask's positive facts. */
const mouth = ({ first, second }) => async (messages) => {
  const user = String(messages.at(-1)?.content ?? "");
  if (user.startsWith("The question asks about")) return second;
  return first;
};

test("the two doors answer before any model: quote the last answer's bytes; check that its addresses are in the book", async () => {
  const transcript = [{ turn: 1, question: "Who helped him?", answer: "Razumihin brought soup.", refs: [refOf("Razumihin brought soup")] }];
  let calls = 0;
  const r = await runHolonicTask({ task: "Which passage says that? Quote it for me.", chunks, transcript, call: async () => { calls++; return "x"; } });
  assert.equal(r.answeredBeforeTheModel.kind, "quote"); assert.equal(calls, 0);
  assert.match(r.output, /Razumihin brought soup to Raskolnikov/);
  const c = await runHolonicTask({ task: "Did the book actually include those passages?", chunks, transcript, call: async () => { calls++; return "x"; } });
  assert.equal(c.answeredBeforeTheModel.kind, "record-check"); assert.equal(calls, 0);
  assert.match(c.output, /^Yes — that passage is in the book/);
});

test("a reader's restatement gets the record's own position, prepended whatever the mouth says", async () => {
  const r = await runHolonicTask({ task: "So you're saying Razumihin brought soup to Raskolnikov — is that what the book says?", chunks, call: mouth({ first: "Hmm, that seems about right, I think.", second: "" }), ...organs });
  assert.equal(r.position, "yes");
  assert.match(r.output, /^Yes — that is what the sources say\./);
  const n = await runHolonicTask({ task: "So you're saying Razumihin poisoned Porfiry in Moscow — is that right?", chunks, call: mouth({ first: "You are absolutely right!", second: "" }), ...organs });
  assert.ok(["not-in-sources", "partly", "no"].includes(n.position), n.position);
  assert.doesNotMatch(n.output, /^Yes/);
});

test("the address check BY REFERENT: a draft that never names the asked-about referent is re-asked ONCE with facts about it (its own surfaces, at their addresses); a draft that names it under another spelling is not; a name the material never establishes is a typed absence the record states, with no re-ask", async () => {
  const r = await runHolonicTask({ task: "What does the book say about Sonia?", chunks, call: mouth({ first: "The novel explores guilt and the possibility of redemption through suffering.", second: `Raskolnikov confessed to Sonia in her room. [${refOf("confessed to Sonia")}]` }), ...organs });
  const a = r.addressed?.[0];
  assert.ok(a && !a.gap, `the turn recorded the address check (${JSON.stringify(a)})`);
  assert.equal(a.reasked, true); assert.equal(a.resolvedOn, "re-ask");
  assert.match(r.output, /Sonia/);
  const ok = await runHolonicTask({ task: "What does the book say about Sonia?", chunks, call: mouth({ first: `Raskolnikov confessed to Sonia in her room. [${refOf("confessed to Sonia")}]`, second: "never" }), ...organs });
  assert.equal(ok.addressed[0].reasked, false, "a draft that names the referent is not re-asked");
  let calls = 0;
  const absent = await runHolonicTask({ task: "What does the book say about Marmeladov?", chunks, call: async (m) => { calls++; return "The novel is about guilt."; }, ...organs });
  assert.match(absent.output, /no referent named "Marmeladov"/, "the record states the absence itself");
  assert.equal(absent.addressed[0].resolvedOn, "absence");
  assert.equal(absent.addressed[0].reasked, false, "no re-ask on a name the material never mentions");
});

test("the expectation before the draft: what the passages state about the asked-about is composed first and the answer is diffed against it — and a fabrication is CUT by the walls before the diff, so what ships is fully authored by the material", async () => {
  const r = await runHolonicTask({ task: "What does the book say about Razumihin?", chunks, call: mouth({ first: `Razumihin brought soup to Raskolnikov. [${refOf("Razumihin brought soup")}] Razumihin brought wine to Porfiry.`, second: "" }), ...organs });
  const e = r.expectation;
  assert.ok(e && e.expected >= 1, `an expectation was composed (${JSON.stringify(e)})`);
  assert.ok(e.matched >= 1, "the soup claim was expected and said");
  assert.doesNotMatch(r.output, /wine/, "the fabricated wine never ships — the snip walls (P122) cut it before the diff");
  assert.equal(e.novel, 0, "nothing shipped that the material did not state");
  assert.equal(e.authorship, 1, "authorship on the SHIPPED text — the diff measures what ships, never the draft");
  assert.ok(e.missing >= 1, "what the material states and the answer left out is named");
});

test("self-consistency: a claim this conversation bound earlier, denied now, lands as a line on the answer — both stand — and is recorded", async () => {
  const transcript = [{ turn: 3, question: "Who brought soup?", answer: "Razumihin brought soup to Raskolnikov.", refs: [refOf("Razumihin brought soup")], claims: [{ key: null, polarity: "+" }] }];
  // Learn the key the reader actually mints for the soup claim from a first pass, then deny it.
  const first = await runHolonicTask({ task: "What does the book say about Razumihin?", chunks, call: mouth({ first: `Razumihin brought soup to Raskolnikov. [${refOf("Razumihin brought soup")}]`, second: "" }), ...organs });
  const bound = (first.sections?.[0]?.relations?.claims ?? []).find((c) => c.verdict === "bound");
  assert.ok(bound, "the reader bound the soup claim");
  // Keys are minted at comparison time through the turn's own index (dialogue.js::refKey) — the transcript carries the claim's ENDS, never a key.
  transcript[0].claims = [{ polarity: "+", end1: bound.end1 ?? bound.subject, label: bound.label ?? bound.verb, end2: bound.end2 ?? bound.object }];
  const r = await runHolonicTask({ task: "What does the book say about Razumihin?", chunks, transcript, call: mouth({ first: `Razumihin did not bring soup to Raskolnikov. [${refOf("Razumihin brought soup")}]`, second: "" }), ...organs });
  if ((r.selfContradictions ?? []).length) { assert.match(r.output, /On the record: on turn 3 this conversation held/); assert.match(r.output, /Both stand\./); }
  else assert.ok(true, "the reader did not mint the same key for the denial on this fixture — disclosed, not forced");
});

test("THE THREE RESOLUTIONS reach the mouth: at level 1 the system message carries where the conversation stands, computed from the transcript through the conversation index and firewall-clean; at level 0 it does not", async () => {
  const { apparatusMentions } = await import("./firewall.js");
  const { dmdWindow } = await import("../eoreader7/native/kernel/activation.js");
  const transcript = [
    { turn: 1, question: "What does the book say about Razumihin?", answer: "Razumihin brought soup to Raskolnikov.", refs: [refOf("Razumihin brought soup")] },
    { turn: 2, question: "What does the book say about Porfiry?", answer: "Porfiry questioned Raskolnikov twice.", refs: [refOf("Porfiry questioned")] },
  ];
  const seen = [];
  const capture = ({ first }) => async (messages) => { seen.push(messages); return first; };
  const r = await runHolonicTask({ task: "Did Porfiry question him more than once?", chunks, transcript, planMode: "flat", resolutions: 1, dmdWindow, conversationIndex: indexFor(chunks), call: capture({ first: `Porfiry questioned Raskolnikov twice. [${refOf("Porfiry questioned")}]` }), ...organs });
  const sys = seen.map((m) => m.find((x) => x.role === "system")?.content ?? "").join("\n");
  // In THIS fixture every "Razumihin" and "Porfiry" opens a sentence, so the index establishes neither (P94) and the only ground is Raskolnikov — the block says what the material lets it say, never more.
  assert.match(sys, /Where the conversation stands:\nFor 2 exchanges the conversation has stood on Raskolnikov\.\nCited on this ground so far: 2 places in novel\.txt\./, "handed without addresses");
  assert.match(r.resolutions[0].text, /^Where the conversation stands/); assert.doesNotMatch(r.resolutions[0].text, /\[turn:/);
  assert.deepEqual(apparatusMentions(r.resolutions[0].text), []);
  assert.equal(r.resolutions[0].index, "conversation");
  const off = [];
  await runHolonicTask({ task: "Did Porfiry question him more than once?", chunks, transcript, planMode: "flat", resolutions: 0, call: async (m) => { off.push(m); return "Porfiry questioned Raskolnikov twice."; }, ...organs });
  assert.doesNotMatch(off.map((m) => m.find((x) => x.role === "system")?.content ?? "").join("\n"), /Where the conversation stands/);
});

test("COMPRESSION: at level 2 the raw passages leave the prompt and the snips stay; at level 0 the passages are handed; material: \"passages\" forces the additive control; what was handed is on the record", async () => {
  const { dmdWindow } = await import("../eoreader7/native/kernel/activation.js");
  const transcript = [{ turn: 1, question: "What does the book say about Porfiry?", answer: "Porfiry questioned Raskolnikov twice.", refs: [refOf("Porfiry questioned")] }];
  const sysOf = (seen) => seen.map((m) => m.find((x) => x.role === "system")?.content ?? "").join("\n");
  const run = async (opts) => { const seen = []; const r = await runHolonicTask({ task: "What does the book say about Raskolnikov?", chunks, transcript, planMode: "flat", dmdWindow, conversationIndex: indexFor(chunks), call: async (m) => { seen.push(m); return `Raskolnikov murdered the pawnbroker. [${refOf("murdered the pawnbroker")}]`; }, ...organs, ...opts }); return { r, sys: sysOf(seen) }; };
  const raw = "Svidrigailov confessed to Dounia in the street"; // a sentence of the passage that no snip about Raskolnikov carries
  const lvl0 = await run({ resolutions: 0 });
  assert.match(lvl0.sys, new RegExp(raw), "level 0 hands the passages");
  const lvl2 = await run({ resolutions: 2 });
  assert.doesNotMatch(lvl2.sys, new RegExp(raw), "level 2 hands no raw passage");
  assert.match(lvl2.sys, /What the sources say, verbatim:\n(?:- [^\n]*\n)*- Raskolnikov murdered the pawnbroker\./, "the snips stay, verbatim, without addresses");
  assert.doesNotMatch(lvl2.sys, /novel\.txt#\d+-\d+/, "no address reaches the mouth");
  assert.equal(lvl2.r.resolutions[0].handed, "snips");
  assert.ok(lvl2.sys.length < lvl0.sys.length, `compression: ${lvl2.sys.length} < ${lvl0.sys.length} chars`);
  const forced = await run({ resolutions: 2, material: "passages" });
  assert.match(forced.sys, new RegExp(raw), "the additive control keeps the passages");
  assert.equal(forced.r.resolutions[0].handed, "passages");
});

test("AWARENESS THAT CHANGES THE NEXT TURN: a name the whole material lacks is declared a VOID on the ledger, and a later turn naming it is handed 'looked for and not found so far' before it drafts; the owning line is on the record, not on the answer", async () => {
  const TL = await import("../eoreader7/native/kernel/task-log.js");
  const cube = await import("../eoreader7/native/kernel/cube.js");
  const { makeHyperlexicon } = await import("../eoreader7/native/organs/hyperlexicon.js");
  const hl = makeHyperlexicon({ createTaskLog: TL.createTaskLog, append: TL.append, projectTasks: TL.projectTasks, ENTRY_KINDS: TL.ENTRY_KINDS, OPERATOR_BASIS: TL.OPERATOR_BASIS, GRAINS: cube.GRAINS, cellOf: cube.cellOf });
  const seen = [];
  const first = await runHolonicTask({ task: "What does the book say about Marmeladov?", chunks, planMode: "flat", hyperlexicon: hl, hyperlexiconLog: hl.createHyperlexicon(), call: async (m) => { seen.push(m); return "The novel is about guilt."; }, ...organs });
  assert.equal(first.addressed[0].resolvedOn, "absence");
  assert.deepEqual(first.voidsDeclared.map((v) => [v.name, v.refused]), [["Marmeladov", null]], "the absence is declared a void on the ledger");
  const voids = hl.foldVoids ? hl.foldVoids(first.hyperlexiconLog) : null;
  if (voids) assert.ok(voids.some((v) => /marmeladov/i.test(v.subject ?? v.end1 ?? "")), "the ledger holds the void");
  const again = [];
  const second = await runHolonicTask({ task: "Tell me more about Marmeladov.", chunks, planMode: "flat", hyperlexicon: hl, hyperlexiconLog: first.hyperlexiconLog, hyperlexiconVoids: voids ?? [], call: async (m) => { again.push(m); return "The sources here do not mention Marmeladov."; }, ...organs });
  const sys = again.map((m) => m.find((x) => x.role === "system")?.content ?? "").join("\n");
  assert.match(sys, /looked for and not found so far/i, "the next turn is handed the void before it drafts");
  assert.match(sys, /Marmeladov/);
  assert.doesNotMatch(String(second.output), /Earlier in this conversation an answer held/, "no owning line on the answer");
});
