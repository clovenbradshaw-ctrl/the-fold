// earned-cast-practice.test.mjs — the earned-cast design's walls, as tests.
// PRACTICE/SPEC: nothing here imports the app. Each test pins one law of
// the four ladders (trigger, trust, truth, disclosure) plus the identity ban.
// Run: node --test earned-cast-practice.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifySpeech,
  eligibleAttentions,
  strainOf,
  assembleFacts,
  cueBundle,
  bannedHits,
  enforceBan,
  trajectoryOf,
  currentPhasepost,
  trajectoryShape,
  trajectoryFacts,
  identifyByArc,
} from "./earned-cast-practice.js";

// An eligible entry is either the bare name (cleared to run solo) or
// "name:checked" (on the list but not yet cleared). These helpers read the
// base name and the label, so the tests pin the routing without binding the
// labeling convention's exact spelling everywhere.
const bases = (list) => list.map((e) => e.split(":")[0]);
const has = (list, name) => bases(list).includes(name);
const labels = (list) => list.filter((e) => e.includes(":")).map((e) => e.split(":")[1]);

// ── the trigger ladder: speech-act shape selects the attention ───────────

test("a question routes to Kelsen and Ranke, never to the frame or the map", () => {
  const e = eligibleAttentions({ act: "question", state: {} });
  assert.deepEqual(bases(e).sort(), ["kelsen", "ranke"].sort());
  assert.ok(!has(e, "curtis") && !has(e, "barker") && !has(e, "freinacht"));
});

test("an assertion routes through Freinacht's door — the elenchus, not a fresh check", () => {
  const e = eligibleAttentions({ act: "assertion", state: {} });
  assert.ok(has(e, "freinacht"));
  assert.ok(has(e, "kelsen") && has(e, "ranke"));
});

test("a frame-ask ('so what does it all mean') brings in Curtis only when the claim level holds", () => {
  const settled = eligibleAttentions({ act: "frame-ask", state: { settled: true }, depth: 2 });
  assert.ok(has(settled, "curtis"));
  const unsettled = eligibleAttentions({ act: "frame-ask", state: { settled: false }, depth: 2 });
  assert.ok(!has(unsettled, "curtis"), "the frame is only offered after the claims are exhausted");
});

test("a map-ask brings in Barker (the arch) and the frame it coordinates", () => {
  const e = eligibleAttentions({ act: "map-ask", state: { settled: true }, depth: 2 });
  assert.ok(has(e, "barker") && has(e, "curtis"));
});

test("the person's own prior contradiction re-opens Freinacht's door at any depth above zero", () => {
  const e = eligibleAttentions({ act: "question", state: { contradictions: ["x"] }, depth: 1 });
  assert.ok(has(e, "freinacht"));
});

test("classifySpeech is mechanical and ordered: escalation beats frame beats assertion beats question", () => {
  assert.equal(classifySpeech("prove it."), "escalation");
  assert.equal(classifySpeech("so what does it all mean?"), "frame-ask");
  assert.equal(classifySpeech("I'm pretty sure the economy self-regulates."), "assertion");
  assert.equal(classifySpeech("who was Lincoln's vice president?"), "question");
});

// ── the trust ladder: an attention not yet cleared is labeled, not silent ─

test("a not-yet-cleared faculty is labeled checked on the eligible list, never silently run solo", () => {
  const state = { trust: { curtis: "checked" }, settled: true };
  const e = eligibleAttentions({ act: "frame-ask", state, depth: 2 });
  assert.ok(e.includes("curtis:checked"), "the frame narrator appears labeled, not named by the model");
  const cleared = eligibleAttentions({ act: "frame-ask", state: { trust: { curtis: "cleared" }, settled: true }, depth: 2 });
  assert.ok(cleared.includes("curtis"), "a cleared faculty runs unlabeled");
});

// ── the strain ladder: the strictness the record has earned ──────────────

test("a clean record earns report; a contested one earns standard; a cycle earns strict", () => {
  assert.equal(strainOf({}), "report");
  assert.equal(strainOf({ contested: ["a"] }), "standard");
  assert.equal(strainOf({ contradictions: ["a"] }), "standard");
  assert.equal(strainOf({ expired: ["a"] }), "standard");
  assert.equal(strainOf({ cycles: 1 }), "strict");
  assert.equal(strainOf({ unlicensed: true }), "strict");
});

// ── the truth ladder + disclosure: facts are object-level and earned ─────

test("the worked example: a person asserting the economy self-regulates is handed their own prior claim, the index-only support, and what would settle it", () => {
  const state = {
    personClaims: ["markets crashed in 2008"],
    contradictions: ["self-regulates vs crashed"],
    indexOnly: ["an index page says markets right themselves"],
    gaps: ["a source that states the narrow claim, or one that states its negation"],
    notEstablished: ["markets always right themselves"],
  };
  const { act, strain, facts, mouth } = cueBundle({ act: "assertion", state, depth: 1 });
  assert.equal(act, "assertion");
  assert.equal(strain, "standard");
  assert.ok(facts.some((f) => f.text.includes('you said this earlier: "markets crashed in 2008"')), "the person's own words are restated verbatim");
  assert.ok(facts.some((f) => f.text.includes("the only support for this is a page that points elsewhere")), "Ranke's finding, stated as a fact");
  assert.ok(facts.some((f) => f.text.includes("what would settle this")), "the gap is named with its path — the asymptote, never a defeatist stop");
  assert.ok(facts.some((f) => f.text.includes("the opposite of that, on its face")), "the contradiction between the person's own claims is surfaced");
  assert.ok(mouth.length > 0);
});

test("the mouth-visible bundle never names a cast member and never leaks an apparatus noun — the identity ban", () => {
  for (const act of ["question", "assertion", "frame-ask", "map-ask", "escalation"]) {
    const bundle = cueBundle({
      act,
      state: {
        contested: ["c"],
        indexOnly: ["i"],
        personClaims: ["p"],
        gaps: ["g"],
        frameLines: ["f"],
        mapLines: ["m"],
        settled: true,
        contradictions: ["x"],
        cycles: 0,
      },
      depth: 2,
    });
    const hits = bannedHits(bundle.mouth);
    assert.deepEqual(hits, [], `${act} leaked: ${hits.join(", ")}`);
  }
});

test("the ban catches a cast name and an apparatus noun when they are planted", () => {
  assert.deepEqual(bannedHits("Ranke chased this to the primary source."), ["cast:ranke"]);
  assert.deepEqual(bannedHits("this turn the passage was retrieved."), ["apparatus:passage", "apparatus:retrieved", "apparatus:this turn"]);
  assert.deepEqual(bannedHits(""), []);
});

// ── the instruction set that gets activated as needed, turn by turn ──────

test("a conversation chain activates a different instruction set each turn, escalating the strain as the record contests", () => {
  const chain = [];
  const record = { trust: { curtis: "cleared", barker: "cleared" } };

  // Turn 1 — a plain question: standing + chase, report strain.
  let b = cueBundle({ act: "question", state: { ...record, singleWitness: ["one claim"] }, depth: 1 });
  chain.push(["t1 question", b.act, b.strain, b.eligible, b.facts.map((f) => f.text)]);
  assert.equal(b.strain, "report");
  assert.ok(has(b.eligible, "ranke") && has(b.eligible, "kelsen"));

  // Turn 2 — the person asserts: Freinacht's door opens, the person's own
  // words enter, and their contradiction with the record earns standard.
  const t2 = { ...record, personClaims: ["markets crashed in 2008"], contradictions: ["x"], indexOnly: ["i"], gaps: ["g"] };
  b = cueBundle({ act: "assertion", state: t2, depth: 1 });
  chain.push(["t2 assertion", b.act, b.strain, b.eligible, b.facts.map((f) => f.text)]);
  assert.equal(b.strain, "standard");
  assert.ok(has(b.eligible, "freinacht"));
  assert.ok(b.facts.some((f) => f.text.includes('you said this earlier')));

  // Turn 3 — "so what does it mean?": Curtis enters (claims already
  // settled at depth 2), the frame line is composed, strain stays honest.
  b = cueBundle({ act: "frame-ask", state: { ...t2, settled: true, frameLines: ["a system that is said to right itself, from a person who watched it crash"] }, depth: 2 });
  chain.push(["t3 frame-ask", b.act, b.strain, b.eligible, b.facts.map((f) => f.text)]);
  assert.ok(has(b.eligible, "curtis"));
  assert.ok(b.facts.some((f) => f.text.includes("what they compose is:")));

  // Turn 4 — "how does it all fit together?": Barker's arch coordinates.
  b = cueBundle({ act: "map-ask", state: { ...t2, settled: true, mapLines: ["the crash account, the self-regulation claim, and the frame both sit inside one developmental map"] }, depth: 2 });
  chain.push(["t4 map-ask", b.act, b.strain, b.eligible, b.facts.map((f) => f.text)]);
  assert.ok(has(b.eligible, "barker"));

  // Every bundle stays identity-clean across the whole chain.
  for (const [, , , , texts] of chain) {
    assert.deepEqual(bannedHits(texts.join(" ")), []);
  }
});

test("the same chain, printed as the mouth would receive it — the instruction set, turn by turn", () => {
  const record = { trust: { curtis: "cleared", barker: "cleared" } };
  const t2 = { ...record, personClaims: ["markets crashed in 2008"], contradictions: ["x"], indexOnly: ["i"], gaps: ["a source that states the narrow claim, or one that states its negation"] };

  const q = cueBundle({ act: "question", state: { ...record, singleWitness: ["one claim"] }, depth: 1 });
  const a = cueBundle({ act: "assertion", state: t2, depth: 1 });
  const f = cueBundle({ act: "frame-ask", state: { ...t2, settled: true, frameLines: ["a system said to right itself, from a person who watched it crash"] }, depth: 2 });
  const m = cueBundle({ act: "map-ask", state: { ...t2, settled: true, mapLines: ["both stories inside one developmental map"] }, depth: 2 });

  const lines = [
    `T1 question · ${q.strain}: ${q.mouth}`,
    `T2 assertion · ${a.strain}: ${a.mouth}`,
    `T3 frame-ask · ${f.strain}: ${f.mouth}`,
    `T4 map-ask · ${m.strain}: ${m.mouth}`,
  ];
  console.log("\n— the conversation chain, as the mouth receives it —\n" + lines.join("\n") + "\n");
  for (const l of lines) assert.deepEqual(bannedHits(l), []);
});

// ── the trajectory lens: what a thing IS, read off its arc ───────────────

test("trajectoryOf/currentPhasepost read the arc off the thing's history in order", () => {
  const history = [{ op: "INS" }, { op: "CON" }];
  assert.deepEqual(trajectoryOf(history), [{ op: "INS", grain: "Figure" }, { op: "CON", grain: "Figure" }]);
  assert.equal(currentPhasepost(history), "CON·Figure");
  assert.equal(currentPhasepost([]), null);
});

test("trajectoryShape classifies the arc: unborn, born, contested, established, rezeroed, circling", () => {
  assert.equal(trajectoryShape([]), "unborn");
  assert.equal(trajectoryShape([{ op: "INS" }]), "born");
  assert.equal(trajectoryShape([{ op: "INS" }, { op: "CON" }]), "contested");
  assert.equal(trajectoryShape([{ op: "INS" }, { op: "CON" }, { op: "SYN" }]), "established");
  assert.equal(trajectoryShape([{ op: "INS" }, { op: "REC" }]), "rezeroed");
  assert.equal(trajectoryShape([{ op: "INS" }, { op: "CON" }, { op: "INS" }]), "circling");
});

test("identifyByArc names what the thing is from its arc", () => {
  assert.equal(identifyByArc([]), "nothing, yet");
  assert.equal(identifyByArc([{ op: "INS" }]), "a fresh claim");
  assert.equal(identifyByArc([{ op: "INS" }, { op: "CON" }]), "an unsettled claim");
  assert.equal(identifyByArc([{ op: "INS" }, { op: "CON" }, { op: "SYN" }]), "an established claim");
  assert.equal(identifyByArc([{ op: "INS" }, { op: "REC" }]), "a claim started over");
  assert.equal(identifyByArc([{ op: "INS" }, { op: "CON" }, { op: "INS" }]), "a claim that argues in a loop");
});

test("the trajectory lens fires only when the conversation is about a thing whose arc is on the record", () => {
  const state = { thing: { history: [{ op: "INS" }, { op: "CON" }] } };
  assert.ok(!has(eligibleAttentions({ act: "question", state, depth: 1 }), "trajectory"), "not fired without askArc");
  assert.ok(has(eligibleAttentions({ act: "question", state: { ...state, askArc: true }, depth: 1 }), "trajectory"));
});

test("trajectoryFacts are covert: the arc is plain narration, and the identification is offered, never the machinery named", () => {
  for (const history of [
    [],
    [{ op: "INS" }],
    [{ op: "INS" }, { op: "CON" }],
    [{ op: "INS" }, { op: "CON" }, { op: "SYN" }],
    [{ op: "INS" }, { op: "REC" }],
    [{ op: "INS" }, { op: "CON" }, { op: "INS" }],
  ]) {
    const bundle = cueBundle({
      act: "question",
      state: { thing: { history }, askArc: true, contradictions: [], contested: [] },
      depth: 1,
    });
    assert.deepEqual(bannedHits(bundle.mouth), [], `arc facts leaked for ${trajectoryShape(history)}`);
    assert.ok(bundle.facts.some((f) => f.from === "trajectory"), "the trajectory lens's findings reached the fact set");
  }
});

test("the worked identification: a disputed thing is helped into 'an unsettled claim' — said so, offered, correctable", () => {
  const state = {
    thing: { history: [{ op: "INS" }, { op: "CON" }] },
    askArc: true,
    contested: ["the thing"],
    contradictions: [],
  };
  const bundle = cueBundle({ act: "question", state, depth: 1 });
  assert.equal(bundle.strain, "standard", "a disputed thing earns the standard strain");
  assert.ok(bundle.mouth.includes("it began, was checked against an account, and is now disputed — not settled"));
  assert.ok(bundle.mouth.includes("that is the shape of an unsettled claim"), "the identification is offered to the person");
  assert.ok(bundle.mouth.includes("say so if you see it that way, or correct me"), "a proposal, never a verdict");
  assert.deepEqual(bannedHits(bundle.mouth), []);
});