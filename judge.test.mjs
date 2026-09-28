import test from "node:test";
import assert from "node:assert/strict";
import { sectionAround, judgeCandidates, buildJudgeMessages, judgeTurn, judgeLine, refOfHolon, JUDGE_ASKS_PER_TURN, JUDGE_RUNG } from "./judge.js";
import { ingestionOf, ESCALATION_RUNGS } from "./answer-record.js";
import { apparatusMentions } from "./firewall.js";
import { ladderFor } from "../eoreader7/native/kernel/escalation.js";

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
  assert.deepEqual([...ESCALATION_RUNGS], ["mechanical", "witness", JUDGE_RUNG]);
  const ing = ingestion();
  assert.equal(judgeCandidates(ing).length, 1);
  const settled = ingestionOf({ claims, unread: [{ name: "wp.txt", read: 4, total: 900 }], witness: [{ sentence: "Pierre received the whole estate.", witness: "states" }], sources: [{ name: "wp.txt" }], trails: {} });
  assert.equal(settled.byClaim[0].judged, true);
  assert.equal(judgeCandidates(settled).length, 0);
});

test("the judge's messages carry no address and no apparatus noun (P55) — plain words, the question, the claim, the text", () => {
  const ing = ingestion();
  const req = { forWhom: { question: "Who received the estate?" }, text: sectionAround(chunks, ing.byClaim[0].holon).text };
  const msgs = buildJudgeMessages(req, claims[0]);
  for (const m of msgs) { assert.deepEqual(apparatusMentions(m.content), [], m.content); assert.ok(!/#\d+-\d+/.test(m.content), "no address reaches the judge"); }
  assert.match(msgs[1].content, /Claim: Pierre received the whole estate/);
});

test("prose that quotes the section lands CHOSEN on the row, deposits on the judge rung, and the answer is untouched; prose pointing past the bytes lands CONTESTED and deposits a failure", async () => {
  const ing = ingestion();
  const seen = [];
  const good = await judgeTurn({ ingestion: ing, claims, question: "Who received the estate?", forWhomId: "turn:1", chunks, recipe: "test@judge-v1",
    ask: async (msgs) => { seen.push(msgs); return 'The text says "received the whole estate", so the claim holds.'; } });
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
    ask: async () => "The claim is refused: the estate went to Anatole after a duel in Moscow." });
  const b = bad.ingestion.byClaim[0].judgment;
  assert.equal(b.landed, "contested"); assert.equal(b.verdict, "refused"); assert.equal(b.anchored, false);
  assert.match(judgeLine(b, claims[0]), /said refused but pointed at nothing/);
  assert.deepEqual((bad.trails[shape] ?? []).filter((t) => t.route === JUDGE_RUNG).map((t) => t.ok), [false], "a contested judgment is a failure deposit — the judge asserted past the bytes");
});

test("the budget holds and a failed ask is a typed refusal on its row, never a thrown turn", async () => {
  const many = Array.from({ length: 4 }, (_, k) => ({ ...claims[0], key: `k${k}` }));
  const ing = ingestionOf({ claims: many, unread: [{ name: "wp.txt", read: 4, total: 900 }], witness: [], sources: [{ name: "wp.txt" }], trails: {} });
  let calls = 0;
  const r = await judgeTurn({ ingestion: ing, claims: many, question: "q", chunks, recipe: "t", ask: async () => { calls += 1; if (calls === 1) throw new Error("boom"); return "undetermined."; } });
  assert.equal(calls, JUDGE_ASKS_PER_TURN);
  assert.equal(r.ingestion.byClaim[0].judgment.refused, "ask_failed");
  assert.equal(r.ingestion.byClaim[1].judgment.verdict, "undetermined");
  assert.equal(r.ingestion.byClaim[2].judgment, undefined, "past the budget nothing is asked");
  await assert.rejects(() => judgeTurn({ ingestion: ing, claims: many, question: "q", chunks, recipe: "t" }), /ask\(messages\)/);
});
