import test from "node:test";
import assert from "node:assert/strict";
import { sectionAround, judgeCandidates, buildJudgeMessages, judgeTurn, judgeLine, refOfHolon, defaultGary, habitKeyOf, negatedNearby, witnessClaim, JUDGE_ASKS_PER_TURN, JUDGE_RUNG, HABIT_RUNG, WITNESS_RUNG, WITNESS_ASKS_PER_TURN } from "./judge.js";
import { createHabits, recallHabit, habitCensus } from "../eoreader7/native/kernel/habit.js";
import { ingestionOf, ESCALATION_RUNGS } from "./answer-record.js";
import { apparatusMentions } from "./firewall.js";
import { ladderFor } from "../eoreader7/native/kernel/escalation.js";
import { witnessSlice, siblingSwap, foldTestimony, buildSelectMessages, foldSelect } from "../eoreader7/native/organs/testimony.js";

const chunks = [
  { source: "wp.txt", start: 0, end: 60, text: "Pierre arrived at the count's house late in the evening.", ref: "wp.txt#0-60" },
  { source: "wp.txt", start: 62, end: 140, text: "The old count had died the week before, and the will named Pierre alone.", ref: "wp.txt#62-140" },
  { source: "wp.txt", start: 142, end: 210, text: "Pierre, on unexpectedly becoming Count Bezúkhov, received the whole estate.", ref: "wp.txt#142-210" },
  { source: "wp.txt", start: 212, end: 260, text: "Anatole left for Moscow the same night.", ref: "wp.txt#212-260" },
  { source: "other.txt", start: 0, end: 30, text: "Unrelated text about a bakery.", ref: "other.txt#0-30" },
];
const claims = [{ key: "pierre|received|the whole estate", end1: "Pierre", label: "received", end2: "the whole estate", verdict: "unheard", refs: ["wp.txt#142-210"], spans: [] }];
const ingestion = () => ingestionOf({ claims, unread: [{ name: "wp.txt", read: 4, total: 900 }], witness: [], sources: [{ name: "wp.txt" }, { name: "other.txt" }], trails: {} });

test("the section is the cited chunk and its same-source neighbours in reading order, within the declared width; another source never joins it", () => {
  const s = sectionAround(chunks, "/wp.txt/142-210", { chars: 200 });
  assert.deepEqual(s.refs, ["wp.txt#62-140", "wp.txt#142-210", "wp.txt#212-260"]);
  assert.equal(s.source, "wp.txt"); assert.equal(s.start, 62); assert.equal(s.end, 260);
  assert.ok(!s.text.includes("bakery"));
  assert.equal(sectionAround(chunks, "/wp.txt/142-210", { chars: 80 }).refs.length, 1, "a width that fits only the cited chunk hands over the cited chunk");
  assert.equal(sectionAround(chunks, "/nowhere.txt/0-9"), null);
  assert.equal(refOfHolon("/wp.txt/142-210"), "wp.txt#142-210"); assert.equal(refOfHolon("/wp.txt"), "wp.txt");
});

test("the judge is the LAST rung — a claim the witness settled is never asked; the rung is on the ladder", () => {
  assert.deepEqual([...ESCALATION_RUNGS], ["mechanical", HABIT_RUNG, "witness", JUDGE_RUNG]);
  const ing = ingestion();
  assert.equal(judgeCandidates(ing).length, 1);
  const settled = ingestionOf({ claims, unread: [{ name: "wp.txt", read: 4, total: 900 }], witness: [{ sentence: "Pierre received the whole estate.", witness: "states" }], sources: [{ name: "wp.txt" }], trails: {} });
  assert.equal(settled.byClaim[0].judged, true);
  assert.equal(judgeCandidates(settled).length, 0);
});

test("Gary keeps the judge's door: over the real firewall organs his check finds nothing — no apparatus noun, no JSON ask, no prohibition, the question last; an address in the section is struck", () => {
  const ing = ingestion();
  const req = { forWhom: { question: "Who received the estate?" }, text: sectionAround(chunks, ing.byClaim[0].holon).text + " (see wp.txt#62-140)" };
  const msgs = buildJudgeMessages(req, claims[0]);
  const bag = defaultGary().hand(msgs, { material: 1, options: { num_predict: 220 } });
  assert.deepEqual(bag.findings, [], JSON.stringify(bag.findings));
  assert.ok(bag.struck > 0, "the address was struck before the judge saw it");
  assert.ok(!/#\d+-\d+/.test(bag.messages[1].content));
  assert.equal(bag.messages.at(-1).role, "user"); assert.match(bag.messages[1].content, /Who received the estate\?$/, "the question is last");
  assert.deepEqual(bag.gaps.map((g) => g.type), ["no_window"], "no window declared is a gap he reports, never a verdict");
  assert.match(msgs[1].content, /Claim: Pierre received the whole estate/);
});

test("prose that quotes the section lands CHOSEN on the row, deposits on the judge rung, and the answer is untouched; prose pointing past the bytes lands CONTESTED and deposits a failure", async () => {
  const ing = ingestion();
  const seen = [];
  const good = await judgeTurn({ ingestion: ing, claims, question: "Who received the estate?", forWhomId: "turn:1", chunks, recipe: "test@judge-v1",
    protocol: "prose", ask: async (msgs) => { seen.push(msgs); return 'The text says "received the whole estate", so the claim holds.'; } });
  const j = good.ingestion.byClaim[0].judgment;
  assert.equal(j.landed, "chosen"); assert.equal(j.verdict, "holds"); assert.equal(j.anchored, true); assert.equal(j.decider, "received the whole estate");
  assert.equal(good.ingestion.byClaim[0].standing, "partial", "the standing is untouched — a judgment sits beside the gap, never over it");
  assert.equal(good.ingestion.judged, 1); assert.equal(seen.length, 1);
  const shape = ing.byClaim[0].shape;
  const judgeDeposits = (good.trails[shape] ?? []).filter((t) => t.route === JUDGE_RUNG);
  assert.deepEqual(judgeDeposits.map((t) => t.ok), [true], "one success deposited on the judge rung");
  const order = ladderFor(good.trails, shape, { rungs: [...ESCALATION_RUNGS], rng: () => 1 }).order;
  assert.ok(order.includes(JUDGE_RUNG));
  assert.match(judgeLine(j, claims[0]), /judge · Pierre received the whole estate · holds — read wp.txt 0-260, deciding on «received the whole estate»/);

  const bad = await judgeTurn({ ingestion: ing, claims, question: "Who received the estate?", chunks, recipe: "test@judge-v1",
    protocol: "prose", ask: async () => "The claim is refused: the estate went to Anatole after a duel in Moscow." });
  const b = bad.ingestion.byClaim[0].judgment;
  assert.equal(b.landed, "contested"); assert.equal(b.verdict, "refused"); assert.equal(b.anchored, false);
  assert.match(judgeLine(b, claims[0]), /said refused but pointed at nothing/);
  assert.deepEqual((bad.trails[shape] ?? []).filter((t) => t.route === JUDGE_RUNG).map((t) => t.ok), [false], "a contested judgment is a failure deposit — the judge asserted past the bytes");
});

test("the budget holds and a failed ask is a typed refusal on its row, never a thrown turn", async () => {
  const many = Array.from({ length: 4 }, (_, k) => ({ ...claims[0], key: `k${k}` }));
  const ing = ingestionOf({ claims: many, unread: [{ name: "wp.txt", read: 4, total: 900 }], witness: [], sources: [{ name: "wp.txt" }], trails: {} });
  let calls = 0;
  const r = await judgeTurn({ ingestion: ing, claims: many, question: "q", chunks, recipe: "t", protocol: "prose", ask: async () => { calls += 1; if (calls === 1) throw new Error("boom"); return "undetermined."; } });
  assert.equal(calls, JUDGE_ASKS_PER_TURN);
  assert.equal(r.ingestion.byClaim[0].judgment.refused, "ask_failed");
  assert.equal(r.ingestion.byClaim[1].judgment.verdict, "undetermined");
  assert.equal(r.ingestion.byClaim[2].judgment, undefined, "past the budget nothing is asked");
  await assert.rejects(() => judgeTurn({ ingestion: ing, claims: many, question: "q", chunks, recipe: "t" }), /ask\(messages\)/);
});

test("a model call leaves a habit: the same claim again is answered by the habit rung with no model call, deposited on the trails; a decider absent from the new section falls through to the judge", async () => {
  const ing = ingestion();
  let calls = 0;
  const first = await judgeTurn({ ingestion: ing, claims, question: "Who received the estate?", chunks, recipe: "test@judge-v1", habits: createHabits(), protocol: "prose",
    ask: async () => { calls += 1; return 'The text says "received the whole estate", so it holds.'; } });
  assert.equal(calls, 1); assert.equal(first.ingestion.byClaim[0].judgment.learned.verdict, "holds");
  assert.equal(recallHabit(first.habits, habitKeyOf(claims[0])).decider, "received the whole estate");
  assert.match(judgeLine(first.ingestion.byClaim[0].judgment, claims[0]), /learned as a habit/);
  const again = await judgeTurn({ ingestion: ingestion(), claims, question: "Who received the estate?", chunks, recipe: "test@judge-v1", habits: first.habits,
    ask: async () => { calls += 1; return "never called"; } });
  assert.equal(calls, 1, "no model call");
  const j = again.ingestion.byClaim[0].judgment;
  assert.equal(j.rung, HABIT_RUNG); assert.equal(j.noModel, true); assert.equal(j.verdict, "holds"); assert.equal(again.ingestion.byHabit, 1); assert.equal(again.ingestion.judgeAsks, 0);
  assert.match(judgeLine(j, claims[0]), /^habit · Pierre received the whole estate · holds — no model asked/);
  const shape = ing.byClaim[0].shape;
  // this turn's trails: ingestionOf's own mechanical deposit (the gap it left), then the habit's success — the judge's deposit lives on the first turn's trails
  assert.deepEqual((again.trails[shape] ?? []).map((t) => [t.route, t.ok]), [["mechanical", false], [HABIT_RUNG, true]]);
  assert.deepEqual((first.trails[shape] ?? []).map((t) => [t.route, t.ok]), [["mechanical", false], [JUDGE_RUNG, true]]);
  // a section that no longer carries the decider: the habit is not applicable and the judge is asked
  const other = chunks.map((c) => (c.ref === "wp.txt#142-210" ? { ...c, text: "Pierre received a letter from Moscow." } : c));
  const fall = await judgeTurn({ ingestion: ingestion(), claims, question: "q", chunks: other, recipe: "test@judge-v1", habits: first.habits, protocol: "prose", ask: async () => { calls += 1; return "Undetermined."; } });
  assert.equal(calls, 2); assert.equal(fall.ingestion.byClaim[0].judgment.rung, JUDGE_RUNG);
});

test("a habit is revisable: the material contradicting it concedes it (REC, trigger quoted) before it answers anything, and the next judgment learns anew", async () => {
  const ing = ingestion();
  const first = await judgeTurn({ ingestion: ing, claims, question: "q", chunks, recipe: "test@judge-v1", habits: createHabits(), protocol: "prose", ask: async () => 'The text says "received the whole estate", so it holds.' });
  const contradicting = [{ ...claims[0], verdict: "contradicted", refs: ["wp.txt#142-210"] }];
  const ingC = ingestionOf({ claims: contradicting, unread: [{ name: "wp.txt", read: 4, total: 900 }], witness: [], sources: [{ name: "wp.txt" }], trails: first.trails });
  const r = await judgeTurn({ ingestion: ingC, claims: contradicting, question: "q", chunks, recipe: "test@judge-v1", habits: first.habits, ask: async () => "never" });
  assert.equal(r.conceded.length, 1); assert.match(r.conceded[0].trigger, /read the claim contradicted at wp.txt#142-210 while the habit held/);
  assert.equal(recallHabit(r.habits, habitKeyOf(claims[0])), null);
  assert.deepEqual(habitCensus(r.habits), { learned: 1, live: 0, conceded: 1 });
  assert.equal(r.ingestion.byClaim[0].habitConceded.verdict, "holds");
  // the witness refusing the sentence the habit held concedes it too
  const again = await judgeTurn({ ingestion: ing, claims, question: "q", chunks, recipe: "test@judge-v1", habits: createHabits(), protocol: "prose", ask: async () => 'The text says "received the whole estate", so it holds.' });
  const w = await judgeTurn({ ingestion: ingestion(), claims, question: "q", chunks, recipe: "t", habits: again.habits, witness: [{ sentence: "Pierre received the whole estate.", witness: "refused" }], protocol: "prose", ask: async () => "Undetermined." });
  assert.equal(w.conceded.length, 1); assert.match(w.conceded[0].trigger, /witness refused/);
  assert.equal(w.ingestion.byClaim[0].judgment.rung, JUDGE_RUNG, "with the habit conceded the judge is asked again");
});

test("a judge that points instead of quoting lands CHOSEN through the numbered sentences — and a lazy point at a sentence without the claim's words stays contested", async () => {
  const ing = ingestion();
  const pointed = await judgeTurn({ ingestion: ing, claims, question: "q", chunks, recipe: "t", habits: createHabits(), protocol: "prose", ask: async (msgs) => { assert.match(msgs[1].content, /\[1\] /); return "[3] holds"; } });
  const j = pointed.ingestion.byClaim[0].judgment;
  assert.equal(j.landed, "chosen"); assert.equal(j.verdict, "holds"); assert.match(j.decider, /received the whole estate/);
  assert.equal(pointed.ingestion.judged, 1); assert.ok(recallHabit(pointed.habits, habitKeyOf(claims[0])), "a pointed, anchored judgment is learned as a habit");
  const lazy = await judgeTurn({ ingestion: ingestion(), claims, question: "q", chunks, recipe: "t", habits: createHabits(), protocol: "prose", ask: async () => "[4] holds" });
  assert.equal(lazy.ingestion.byClaim[0].judgment.landed, "contested");
});

test("point-then-word (the default): the first ask is only for a number, the second only for a word over the pointed sentence, the question last; a point the company wall refuses spends one call and lands contested", async () => {
  const ing = ingestion();
  const seen = [];
  const r = await judgeTurn({ ingestion: ing, claims, question: "Who received the estate?", chunks, recipe: "t", habits: createHabits(), ask: async (msgs) => { seen.push(msgs); return seen.length === 1 ? "[3]" : "holds"; } });
  const j = r.ingestion.byClaim[0].judgment;
  assert.equal(seen.length, 2); assert.equal(j.calls, 2); assert.equal(j.landed, "chosen"); assert.equal(j.verdict, "holds"); assert.match(j.decider, /received the whole estate/);
  assert.ok(!/\[\d\]/.test(seen[0][0].content), "no example number in the point ask"); assert.match(seen[1][1].content, /Who received the estate\?$/);
  for (const bag of seen) assert.deepEqual(defaultGary().hand(bag, { material: 1 }).findings, []);
  const lazy = await judgeTurn({ ingestion: ingestion(), claims, question: "q", chunks, recipe: "t", habits: createHabits(), ask: async () => "[4]" });
  // no word was ever asked for, so nothing was committed to: NONE, one call spent — never a verdict manufactured from a bad point
  assert.equal(lazy.ingestion.byClaim[0].judgment.calls, 1); assert.equal(lazy.ingestion.byClaim[0].judgment.landed, "none");
  await assert.rejects(() => judgeTurn({ ingestion: ingestion(), claims, question: "q", chunks, recipe: "t", protocol: "chat", ask: async () => "" }), /protocol/);
});

test("the counter-decider wall: a habit whose decider is still in the section stands down when a negated restatement of its own company sits beside it, and the judge is asked instead", async () => {
  const section = chunks.map((c) => c.text).join("\n\n");
  assert.equal(negatedNearby("Pierre received the whole estate", section), false);
  assert.equal(negatedNearby("Pierre received the whole estate", section + "\n\nPierre never received the whole estate."), true);
  assert.equal(negatedNearby("Pierre received the whole estate", section + "\n\nAnatole never received a letter."), false, "a negation elsewhere, sharing no company, is not a counter-decider");
  // v5: a decider that opens with a clause the claim is not about ("We tried to be cheerful..., and Mina was the brightest") — the claim's own words are the company
  const mina = "We tried to be cheerful and encourage each other, and Mina was the brightest and most cheerful of us.";
  assert.equal(negatedNearby(mina, mina + "\n\nMina never was the brightest and most cheerful of us."), false, "read against the decider's opening clause the counter is missed");
  assert.equal(negatedNearby(mina, mina + "\n\nMina never was the brightest and most cheerful of us.", "Mina was the brightest and most cheerful of us"), true, "read against the claim's own words it is found");
  const ing = ingestion();
  const first = await judgeTurn({ ingestion: ing, claims, question: "q", chunks, recipe: "t", habits: createHabits(), protocol: "prose", ask: async () => 'The text says "received the whole estate", so it holds.' });
  const negated = chunks.map((c) => (c.ref === "wp.txt#212-260" ? { ...c, text: "Pierre never received the whole estate; Anatole did." } : c));
  let calls = 0;
  const r = await judgeTurn({ ingestion: ingestion(), claims, question: "q", chunks: negated, recipe: "t", habits: first.habits, protocol: "prose", ask: async () => { calls += 1; return "Undetermined."; } });
  assert.equal(r.ingestion.byClaim[0].judgment.rung, JUDGE_RUNG, "the judge was asked, not the habit");
  assert.deepEqual(r.ingestion.byClaim[0].habitStoodDown, { verdict: "holds", because: "a negated restatement of the decider's own company is in the section" });
  assert.equal(calls, 1);
});

// ── THE WITNESS RUNG (2026-09-28) ─────────────────────────────────────────
// Not the passive check `ingestionOf` already made against this turn's
// witnessed ANSWER sentences (the earlier tests' own `witness: []` — that
// one never reaches a model and is already exercised above via
// `judgeCandidates`/`ingestion`). These test the ACTIVE ask: the claim's
// own arrangement, put to the real eoreader7 witness-sentences.js/
// testimony.js organs (imported, not reimplemented — only `selectAsk` and
// the generate fallback are scripted, matching every other test in this
// file). The testimony bundle is the REAL one app.js's own
// `witnessTestimony()` builds.
const testimony = { witnessSlice, siblingSwap, foldTestimony, buildSelectMessages, foldSelect };
// A scripted, sequenced selectAsk: the first pick is the caller's, the
// second is the sibling-swapped arm's — the same "seen.length === 1 ? … :
// …" shape the point-then-word test above already uses for two sequential
// asks of one kind.
const scriptedSelect = (picks) => { let n = 0; return async () => { const p = picks[Math.min(n, picks.length - 1)]; n += 1; return p; }; };
const neverAsk = async () => { throw new Error("should not be called — the witness settled this claim without it"); };

test("(a) a states verdict from the witness lands the claim holds, anchored, and is learned as a habit through the SAME path the judge rung uses — no judge ask spent", async () => {
  const ing = ingestion();
  let judgeAsks = 0;
  const r = await judgeTurn({
    ingestion: ing, claims, question: "Who received the estate?", chunks, recipe: "test@judge-v1", habits: createHabits(),
    ask: async () => { judgeAsks += 1; return "never — the witness settles this claim first"; },
    witnessAsk: neverAsk, // the generate fallback is never reached: the select protocol finds a real candidate and a real arm
    selectAsk: scriptedSelect([{ stated: "yes", sentence: 1 }, { stated: "no", sentence: 0 }]),
    testimony,
  });
  const j = r.ingestion.byClaim[0].judgment;
  assert.equal(j.rung, WITNESS_RUNG);
  assert.equal(j.verdict, "holds");
  assert.equal(j.anchored, true);
  assert.equal(j.landed, "chosen");
  assert.match(j.decider, /received the whole estate/);
  assert.deepEqual(j.learned, { key: habitKeyOf(claims[0]), verdict: "holds" });
  assert.equal(judgeAsks, 0, "the judge is the LAST rung — settled by the witness, it is never asked");
  assert.equal(r.ingestion.judgeAsks, 0);
  assert.equal(r.ingestion.byWitness, 1);
  assert.ok(recallHabit(r.habits, habitKeyOf(claims[0])), "a states verdict earned by the witness is learned as a habit, exactly as a chosen judgment would be");
  assert.equal(recallHabit(r.habits, habitKeyOf(claims[0])).decider, j.decider);
  assert.match(judgeLine(j, claims[0]), /^witness · Pierre received the whole estate · holds — settled before the judge was asked, deciding on/);
  assert.match(judgeLine(j, claims[0]), /learned as a habit/);
});

test("(b) a refused verdict from the witness — armed with the section's own candidates and saying no to all of them — lands the claim refused, settled, with no judge ask spent", async () => {
  const ing = ingestion();
  let judgeAsks = 0;
  const r = await judgeTurn({
    ingestion: ing, claims, question: "q", chunks, recipe: "test@judge-v1", habits: createHabits(),
    ask: async () => { judgeAsks += 1; return "never"; },
    witnessAsk: neverAsk,
    selectAsk: async () => ({ stated: "no", sentence: 0 }), // a clean, armed "no" to the very first ask — witnessNote returns before ever building an arm
    testimony,
  });
  const j = r.ingestion.byClaim[0].judgment;
  assert.equal(j.rung, WITNESS_RUNG);
  assert.equal(j.verdict, "refused");
  assert.equal(j.landed, "chosen", "a settled negative — the same landed value a judge's own anchored refusal would take");
  assert.equal(j.decider, null, "nothing states the claim, so there is nothing to point at — a fact, not a missing field");
  assert.equal(j.learned, null, "a refused verdict has no decider to find again, so nothing is learned — learnFromDecider's own guard, shared with the judge rung");
  assert.equal(judgeAsks, 0);
  assert.equal(r.ingestion.byWitness, 1);
  assert.equal(recallHabit(r.habits, habitKeyOf(claims[0])), null);
});

test("(c) a skipped verdict (no content to anchor a candidate on) spends nothing and falls through to the judge exactly as before — the judge is asked and its own budget is spent", async () => {
  // a claim thin enough that witnessSentences.js's own endsFor/words check
  // refuses it outright (< 2 content words) — witnessClaim never even
  // reaches selectAsk/witnessAsk, which is the assertion: both throw if called.
  const thinClaims = [{ key: "thin", end1: "Pierre", label: null, end2: null, verdict: "unheard", refs: ["wp.txt#142-210"], spans: [] }];
  const thinIngestion = ingestionOf({ claims: thinClaims, unread: [{ name: "wp.txt", read: 4, total: 900 }], witness: [], sources: [{ name: "wp.txt" }], trails: {} });
  assert.equal(judgeCandidates(thinIngestion).length, 1, "the claim still reaches the loop — nothing about it is pre-settled");
  let judgeAsks = 0;
  const r = await judgeTurn({
    ingestion: thinIngestion, claims: thinClaims, question: "q", chunks, recipe: "test@judge-v1", habits: createHabits(), protocol: "prose",
    ask: async () => { judgeAsks += 1; return 'The text says "Pierre, on unexpectedly becoming Count Bezúkhov, received the whole estate.", so it holds.'; },
    witnessAsk: neverAsk, selectAsk: neverAsk, testimony,
  });
  const j = r.ingestion.byClaim[0].judgment;
  assert.equal(j.rung, JUDGE_RUNG, "the witness never settled it, so the judge rung landed the judgment");
  assert.equal(j.landed, "chosen");
  assert.equal(judgeAsks, 1, "a judge ask was spent — the witness's skip cost the judge nothing of its own budget");
  assert.equal(r.ingestion.byWitness, 0);
  assert.equal(r.ingestion.judgeAsks, 1);
});

test("(d) omitting witnessAsk/selectAsk/testimony reproduces the pre-existing, byte-identical behaviour — the witness rung is never even attempted", async () => {
  const ing = ingestion();
  let calls = 0;
  const r = await judgeTurn({
    ingestion: ing, claims, question: "Who received the estate?", chunks, recipe: "test@judge-v1", habits: createHabits(), protocol: "prose",
    ask: async (msgs) => { calls += 1; return 'The text says "received the whole estate", so the claim holds.'; },
    // no witnessAsk, no selectAsk, no testimony — the exact call shape the
    // very first "prose that quotes the section…" test above already uses
  });
  const j = r.ingestion.byClaim[0].judgment;
  assert.equal(j.rung, JUDGE_RUNG);
  assert.equal(j.landed, "chosen");
  assert.equal(j.verdict, "holds");
  assert.equal(j.anchored, true);
  assert.equal(j.decider, "received the whole estate");
  assert.equal(calls, 1, "one judge call, exactly as before the witness rung existed");
  assert.equal(r.ingestion.judged, 1);
  assert.equal(r.ingestion.byWitness, 0, "the new counter exists and correctly reports zero — the rung never ran");
  assert.equal(r.ingestion.judgeAsks, 1);
  // maxWitnessAsks defaults to WITNESS_ASKS_PER_TURN even when unused — a
  // declared default (P9), never a silent one
  assert.equal(WITNESS_ASKS_PER_TURN, 2);
});

test("witnessClaim is the file's own adapter: null on a claim with no arrangement to ask about, and it spends nothing when it never reaches a model", async () => {
  const noArrangement = await witnessClaim({ end1: null, label: null, end2: null }, [{ ref: "wp.txt", text: "anything" }], { witnessAsk: neverAsk, selectAsk: neverAsk, testimony, maxAsks: 1 });
  assert.deepEqual(noArrangement, { row: null, asks: 0 });
  const section = sectionAround(chunks, "/wp.txt/142-210");
  const thin = await witnessClaim({ end1: "Pierre", label: null, end2: null }, [{ ref: section.source, text: section.text }], { witnessAsk: neverAsk, selectAsk: neverAsk, testimony, maxAsks: 1 });
  assert.equal(thin.row.witness, "skipped");
  assert.equal(thin.asks, 0);
});

test("the witness rung's own budget (maxWitnessAsks) is declared apart from the judge's — spent it never asks the witness again, and a later judgeCandidates row still reaches the judge under the judge's own, untouched budget", async () => {
  // two claims with genuinely DIFFERENT arrangements — habitKeyOf reads
  // end1/label/end2, not `.key`, so two rows sharing an arrangement would
  // let the first's judge-learned habit silently settle the second before
  // its own witness/judge budget was ever in question. Kept apart here so
  // the thing under test (the WITNESS budget, not the habit rung) is what
  // decides the second claim's fate.
  const many = [claims[0], { ...claims[0], key: "k1", end2: "an estate" }];
  const ing = ingestionOf({ claims: many, unread: [{ name: "wp.txt", read: 4, total: 900 }], witness: [], sources: [{ name: "wp.txt" }], trails: {} });
  assert.notEqual(habitKeyOf(many[0]), habitKeyOf(many[1]));
  let selectCalls = 0, judgeCalls = 0;
  const script = scriptedSelect([{ stated: "yes", sentence: 1 }, { stated: "no", sentence: 0 }]);
  const r = await judgeTurn({
    ingestion: ing, claims: many, question: "q", chunks, recipe: "t", habits: createHabits(), protocol: "prose",
    maxWitnessAsks: 1, maxAsks: 4,
    ask: async () => { judgeCalls += 1; return 'The text says "Pierre, on unexpectedly becoming Count Bezúkhov, received the whole estate.", so it holds.'; },
    witnessAsk: neverAsk,
    selectAsk: async (msgs) => { selectCalls += 1; return script(msgs); },
    testimony,
  });
  assert.equal(selectCalls, 2, "one witness ask unit (the pick, plus its sibling-swapped arm) spent the whole declared budget of 1, so the second claim's witness step is never even attempted");
  assert.equal(r.ingestion.byWitness, 1);
  assert.equal(r.ingestion.byClaim[0].judgment.rung, WITNESS_RUNG);
  assert.equal(r.ingestion.byClaim[1].judgment.rung, JUDGE_RUNG, "the second claim's witness budget was already spent, so it falls to the judge — whose own budget is untouched by the witness's");
  assert.equal(judgeCalls, 1, "the judge's own budget (maxAsks: 4) was never touched by the witness rung");
});

