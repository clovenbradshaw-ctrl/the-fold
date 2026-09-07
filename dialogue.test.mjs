// dialogue.test.mjs — the conversation's loops, each pinned on the failure
// that named it (a reader's seven turns about Crime and Punishment,
// 2026-09-07), and every decision about identity made by the REFERENT INDEX
// — the same organ the reading uses (cast.js makeReferentIndex) — never by a
// string. The fixture spells one being two ways ("Rodion Raskolnikov",
// "Raskolnikov") so that substring thinking and referent thinking give
// different answers, and the tests want the referent's.
import test from "node:test";
import assert from "node:assert/strict";
import { referentsOf, bindAnaphora, addressedBy, absenceLine, absenceOf, restatementOf, positionOn, selfContradictions, contradictionLine, historyWindow, expectationFrom, errorOf, expectationFacts, refKey } from "./dialogue.js";
import { premisesOf, checkPremises } from "./correction.js";
import { answerBeforeTheModel, quoteBytes, recordCheck } from "./answerable.js";
import { makeReferentIndex } from "./cast.js";
import { dmdWindow } from "../eoreader7/native/kernel/activation.js";
import { splitSentences } from "../eoreader7/native/adapters/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "../eoreader7/native/adapters/text/surfaces.js";

const indexFor = makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });
const PASSAGES = [
  // Names sit MID-sentence on purpose: the engine refuses a sentence-initial capital as evidence of a name (P94), as it should — a fixture that opens every sentence with the name has no referents at all.
  { ref: "pg2554.txt#45324-48671", text: "In the morning, Rodion Raskolnikov listened intently but with a sick sensation. By then Raskolnikov had murdered the old woman and her sister. Each day Razumihin came to see Raskolnikov." },
  { ref: "pg2554.txt#48673-52190", text: "That evening Razumihin brought soup and sat with him, clumsy and kind. Later Razumihin told Raskolnikov about Porfiry Petrovich. Twice Porfiry Petrovich questioned Raskolnikov, and each time Porfiry smiled." },
];
const CHUNKS = new Map(PASSAGES.map((p) => [p.ref, p]));
const index = indexFor(PASSAGES);
const LAST = { turn: 4, question: "Who is Raskolnikov?", answer: "Raskolnikov is a former student who murders the old pawnbroker. Razumihin, his friend, brings him soup.", refs: [PASSAGES[0].ref, PASSAGES[1].ref] };

test("the fixture establishes referents, and one being under two spellings resolves to ONE id — the thing a substring cannot know", () => {
  assert.ok(index.referents.size >= 2, `referents established: ${index.referents.size}`);
  const a = index.resolve("Raskolnikov"), b = index.resolve("Rodion Raskolnikov");
  assert.ok(a.size === 1 && b.size === 1 && [...a][0] === [...b][0], "two spellings, one referent");
  assert.equal(index.resolve("Sonia").size, 0, "a name the material never establishes resolves to nothing");
});

test("referentsOf: candidate names go through the index; the unresolved are named, never guessed", () => {
  const r = referentsOf("What did Rodion Raskolnikov say to Sonia about Razumihin?", index);
  assert.ok(r.ids.size >= 2, "Raskolnikov and Razumihin resolve");
  assert.deepEqual(r.unresolved, ["Sonia"]);
  assert.equal(referentsOf("nothing capitalised here", index).ids.size, 0);
});

test("anaphora across turns: a pronoun binds to the last answer's REFERENT IDS in mention order; 'those passages' to its addresses; a question naming its own referents binds nothing", () => {
  const b = bindAnaphora("Why did he do it?", LAST, index);
  assert.ok(b.ids.length >= 2);
  assert.equal(b.ids[0], [...index.resolve("Raskolnikov")][0], "the last answer's first referent binds first");
  const p = bindAnaphora("Did the book actually include those passages?", LAST, index);
  assert.deepEqual(p.refs, LAST.refs);
  assert.deepEqual(bindAnaphora("What does the book say about Razumihin?", LAST, index).ids, [], "own referents: nothing bound");
  assert.deepEqual(bindAnaphora("Why did he do it?", null, index).ids, []);
});

test("addressed BY IDENTITY: an answer that says 'Rodion' has named Raskolnikov; one that never names the asked-about has not — and an unestablished name is a typed absence the record states", () => {
  const q = referentsOf("What does the book say about Raskolnikov?", index);
  assert.equal(addressedBy("Rodion Raskolnikov listened with a sick sensation.", q, index).all, true, "another spelling of the same referent counts");
  const miss = addressedBy("The novel explores guilt and redemption.", q, index);
  assert.equal(miss.all, false); assert.deepEqual(miss.missingNames, [index.represent([...q.ids][0])]);
  assert.equal(addressedBy("anything", referentsOf("nothing here", index), index), null);
  const abs = referentsOf("What does the book say about Sonia?", index);
  assert.equal(abs.ids.size, 0);
  assert.match(absenceLine(abs, PASSAGES), /no referent named "Sonia"/);
  assert.equal(absenceLine(q, PASSAGES), "");
  // The second bar: a name the bytes carry but the index never established is UNESTABLISHED, and earns no absence line — the record must not call a named being absent.
  const opener = [{ ref: "x", text: "Marmeladov drank. Marmeladov wept. Marmeladov died in the street." }];
  const un = absenceOf(referentsOf("What does the book say about Marmeladov?", indexFor(opener)), opener);
  assert.deepEqual(un.unestablished, ["Marmeladov"]); assert.deepEqual(un.absent, []); assert.equal(un.line, "");
});

test("a reader's restatement is a premise: graded by the same check, and the record's own position comes back", () => {
  assert.equal(restatementOf("So, you're saying Crime and Punishment is about a guy who thinks he can get away with murder?"), "Crime and Punishment is about a guy who thinks he can get away with murder");
  assert.equal(restatementOf("If I follow you, Razumihin brings him soup and sits with him — is that what the book says?"), "Razumihin brings him soup and sits with him");
  assert.equal(restatementOf("What does the book say about Razumihin?"), null);
  assert.equal(restatementOf("Sonia has had no education and is deeply loving. Is that really what the book says?"), "Sonia has had no education and is deeply loving", "a trailing check restates BEFORE the trigger");
  assert.equal(restatementOf("I took from that that Razumihin cared for him more than anyone. Is that right?"), "I took from that that Razumihin cared for him more than anyone");
  assert.equal(restatementOf("Is that right?"), null, "a bare check restates nothing");
  assert.equal(restatementOf("I take it Sonia is deeply loving. Is that really what the book says?"), "Sonia is deeply loving", "the reader's uptake words are not part of the claim");
  assert.equal(restatementOf("Which is right?"), null);
  // The wired run's own reflect phrasings (2026-09-07), each of which missed the first triggers by a word:
  assert.equal(restatementOf("The Ministry is a place of power dynamics and social hierarchy, where characters navigate their roles. Do you agree with this interpretation?"), "The Ministry is a place of power dynamics and social hierarchy, where characters navigate their roles");
  assert.equal(restatementOf("It sounds like Sonia is prepared for a journey to Siberia, but also has some doubts. Is this what the book says?"), "Sonia is prepared for a journey to Siberia, but also has some doubts");
  assert.equal(restatementOf("Sonia seems very upset and frustrated, Sonia's anger is palpable. Did the book say that Sonia was angry?"), "Sonia was angry");
  const ps = premisesOf("So you're saying Razumihin brought soup to Raskolnikov — is that right?");
  assert.equal(ps.length, 1); assert.equal(ps[0].how, "restated by the reader");
  const yes = checkPremises("So you're saying Razumihin brought soup and sat with him — is that right?", PASSAGES, { referentIndexFor: indexFor });
  assert.equal(positionOn(yes).verdict, "yes");
  const no = checkPremises("So you're saying Razumihin poisoned the pawnbroker in Moscow — is that right?", PASSAGES, { referentIndexFor: indexFor });
  assert.ok(["not-in-sources", "partly", "no"].includes(positionOn(no).verdict), positionOn(no).text);
  assert.equal(positionOn({ premises: [] }), null);
});

test("claim keys ride on referent ids where the index resolves an end — so a claim about 'Rodion' and one about 'Raskolnikov' are the same claim — and say when they had to fall back to the surface", () => {
  const a = refKey({ end1: "Rodion Raskolnikov", label: "murdered", end2: "the old woman" }, index);
  const b = refKey({ end1: "Raskolnikov", label: "murdered", end2: "the old woman" }, index);
  assert.equal(a.key, b.key); assert.equal(a.basis, "referent");
  const c = refKey({ end1: "the weather", label: "was", end2: "cold" }, index);
  assert.equal(c.basis, "surface");
});

test("self-consistency: the same claim key with the opposite polarity, or a claim bound earlier and contradicted now, is a typed row and a line that lets both stand", () => {
  const transcript = [{ turn: 2, claims: [{ end1: "Razumihin", label: "brought", end2: "soup", polarity: "+" }, { end1: "Raskolnikov", label: "confessed", end2: "Sonia", polarity: "+" }] }];
  const rows = selfContradictions([{ end1: "Razumihin", label: "brought", end2: "soup", polarity: "-", verdict: "bound" }, { end1: "Rodion Raskolnikov", label: "confessed", end2: "Sonia", polarity: "+", verdict: "contradicted" }, { end1: "Porfiry", label: "smiled", end2: "", polarity: "+", verdict: "bound" }], transcript, index);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].kind, "polarity"); assert.equal(rows[1].kind, "contradicted-now");
  assert.equal(rows[1].basis, "referent", "matched across spellings through the index");
  assert.match(contradictionLine(rows), /on turn 2 this conversation held .* affirmed, and this answer denies it/);
  assert.match(contradictionLine(rows), /Both stand\./);
  assert.deepEqual(selfContradictions([], transcript, index), []);
});

test("the history window is measured by dmdWindow on what the question's REFERENTS reach — never a fixed count", () => {
  const history = [];
  const names = ["Raskolnikov", "Porfiry", "Razumihin", "Raskolnikov", "Porfiry", "Razumihin", "Raskolnikov", "Porfiry"];
  names.forEach((n, i) => history.push({ role: "user", content: `What about ${n} in chapter ${i + 1}?` }, { role: "assistant", content: `${n} appears in chapter ${i + 1}.` }));
  const recent = historyWindow(history, "And what happens to Porfiry after that?", { dmdWindow, index });
  assert.equal(recent.basis, "referent");
  assert.ok(recent.depth >= 1 && recent.depth <= 2, `a question reaching the last exchange needs a shallow window (${recent.depth})`);
  const far = historyWindow(history, "Earlier you mentioned Razumihin — how does he meet Porfiry?", { dmdWindow, index });
  assert.ok(far.depth >= 2 && far.depth <= 3, `Razumihin was last two exchanges back (${far.depth})`);
  assert.equal(historyWindow([], "x", { dmdWindow, index }).depth, 0);
});

test("the expectation before the draft: the reader's bound claims whose ends resolve to the question's referents; the diff names matched, novel, missing, contradicted, and the authorship ratio", () => {
  const read = (text) => ({ claims: text.includes("soup") ? [{ end1: "Razumihin", label: "brought", end2: "soup", verdict: "bound" }, { end1: "Porfiry Petrovich", label: "questioned", end2: "Raskolnikov", verdict: "bound" }] : [{ end1: "Rodion Raskolnikov", label: "murdered", end2: "the old woman", verdict: "bound" }] });
  const exp = expectationFrom(PASSAGES, "What does the book say about Razumihin?", read, index);
  assert.equal(exp.basis, "referent");
  assert.deepEqual(exp.claims.map((c) => c.label), ["brought"], "only the claim whose end resolves to Razumihin");
  assert.match(expectationFacts(exp), /Razumihin brought soup \[pg2554\.txt#48673-52190\]/);
  const err = errorOf(exp, [{ end1: "Razumihin", label: "brought", end2: "soup", verdict: "bound" }, { end1: "Razumihin", label: "is", end2: "kind", verdict: "unheard" }, { end1: "her bed more from the", label: "hurt", end2: "to her feelings than from the blows", verdict: "unbound" }], index);
  assert.equal(err.matched.length, 1); assert.equal(err.novel.length, 1); assert.equal(err.missing.length, 0);
  assert.equal(err.authorship, 0.5);
  assert.equal(err.offTopic, 1, "a garbage extraction that resolves to none of the question's referents is off-topic to the diff, never novel");
  const none = errorOf(expectationFrom(PASSAGES, "What does the book say about Porfiry?", () => ({ claims: [] }), index), [{ end1: "Porfiry", label: "smiled", end2: "", verdict: "unheard" }], index);
  assert.equal(none.authorship, null, "no expectation, no authorship — withheld with its reason, never 0"); assert.equal(none.expected, 0); assert.match(none.why, /heard nothing/);
  const byRef = expectationFrom(PASSAGES, "What does the book say about Rodion?", read, index);
  assert.deepEqual(byRef.claims.map((c) => c.label).sort(), ["murdered", "questioned"], "the Rodion spelling reaches every claim with Raskolnikov at EITHER end, through the index");
  assert.equal(expectationFrom([], "x", read, index).claims.length, 0);
});

test("THE TWO DOORS: 'quote it for me' returns the bytes at the last answer's addresses; 'did the book include those passages' checks the record — no model in either", () => {
  const q = quoteBytes("Which passage says that? Quote it for me.", { transcript: [LAST], chunksByRef: CHUNKS });
  assert.deepEqual(q.refs, LAST.refs);
  assert.match(q.text, /pg2554\.txt#45324-48671:\n"In the morning, Rodion Raskolnikov listened intently/);
  const c = recordCheck("You mentioned three passages. Did the book actually include those passages?", { transcript: [LAST], chunksByRef: CHUNKS });
  assert.equal(c.ok, 2); assert.equal(c.bad, 0); assert.match(c.text, /^Yes — those passages are in the book/);
  const bad = recordCheck("Are those real?", { transcript: [{ ...LAST, refs: ["pg2554.txt#1-2", ...LAST.refs] }], chunksByRef: CHUNKS });
  assert.equal(bad.bad, 1); assert.match(bad.text, /But pg2554\.txt#1-2 does not resolve/);
  assert.equal(answerBeforeTheModel({ question: "I'd like to see the words themselves. Which passage says so?", transcript: [LAST], chunksByRef: CHUNKS }).kind, "quote");
  assert.equal(answerBeforeTheModel({ question: "Quote it for me.", transcript: [{ turn: 1, question: "q", answer: "a" }], chunksByRef: CHUNKS }), null, "no addresses to quote: not this door's");
  assert.equal(answerBeforeTheModel({ question: "Why does that matter?", transcript: [LAST], chunksByRef: CHUNKS }), null, "prose is the mouth's");
  assert.equal(answerBeforeTheModel({ question: "Sonia seems very upset. Did the book say that Sonia was angry?", transcript: [LAST], chunksByRef: CHUNKS }), null, "a question about CONTENT is not the record door's — it is the restatement loop's (wired run, turn 10)");
  assert.equal(answerBeforeTheModel({ question: "Did the book actually include them?", transcript: [LAST], chunksByRef: CHUNKS })?.kind, "record-check");
});
