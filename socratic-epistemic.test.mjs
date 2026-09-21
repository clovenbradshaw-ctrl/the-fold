import { test } from "node:test";
import assert from "node:assert";
import {
  carriesClaim, newDialogue, isAnswer, isActionableRequest, assignAnswer,
  nextCell, detectAporia, composeAporia, composeCellQuestion,
  composeConsumptionAndAsk, VOID_CELLS, STAGES,
} from "./socratic-epistemic.js";

const Q = "what's the best way to convince someone that gun safety legislation is important?";

test("carriesClaim detects persuasion/normative/best-way shapes", () => {
  assert.ok(carriesClaim(Q));
  assert.ok(carriesClaim("How do I prove that the earth is round?"));
  assert.ok(carriesClaim("Should we raise taxes?"));
  assert.ok(carriesClaim("What's the most effective way to persuade my boss?"));
  assert.equal(carriesClaim("What is the capital of France?"), null);
  assert.equal(carriesClaim("Help me write an email to my landlord."), null);
});

test("newDialogue builds the nine cells and extracts claim/subject", () => {
  const d = newDialogue(Q);
  assert.ok(d);
  assert.equal(d.subject, "gun safety legislation");
  assert.ok(d.claim.includes("gun safety legislation is important"));
  assert.deepEqual(Object.keys(d.cells), VOID_CELLS);
  assert.equal(d.stage, STAGES.EXAMINING);
  for (const c of VOID_CELLS) {
    assert.equal(d.cells[c].asked, null);
    assert.equal(d.cells[c].answered, null);
  }
  assert.equal(newDialogue("What is the capital of France?"), null);
});

test("isAnswer: statements are answers, questions are not", () => {
  assert.ok(isAnswer("I think lives are at stake."));
  assert.ok(isAnswer("maybe"));
  assert.ok(!isAnswer("What's the best way to convince someone?"));
  assert.ok(!isAnswer("Why should they listen?"));
  assert.ok(!isAnswer(""));
});

test("isActionableRequest: pivots are detected, questions are not", () => {
  assert.ok(isActionableRequest("Help me write an email to my landlord"));
  assert.ok(isActionableRequest("Can you draft a response for me?"));
  assert.ok(!isActionableRequest("What's the best way to convince someone?"));
  assert.ok(!isActionableRequest("I think lives are at stake."));
});

test("assignAnswer fills the last-asked cell with disclosed assignment", () => {
  let d = newDialogue(Q);
  // simulate the router: anchor asked at turn 1
  d.cells.anchor.asked = 1;
  const { cells, assigned } = assignAnswer(d.cells, "lives are at stake", 2);
  assert.equal(assigned, "anchor");
  assert.equal(cells.anchor.answered.text, "lives are at stake");
  assert.equal(cells.anchor.answered.at, 2);
  assert.equal(cells.anchor.assignedBy, "last-asked");
});

test("assignAnswer returns assigned:null when nothing is pending", () => {
  const d = newDialogue(Q);
  const { cells, assigned } = assignAnswer(d.cells, "anything", 1);
  assert.equal(assigned, null);
  assert.deepEqual(cells, d.cells);
});

test("nextCell follows load-bearing priority (anchor first)", () => {
  const d = newDialogue(Q);
  assert.equal(nextCell(d.cells), "anchor");
  d.cells.anchor.asked = 1;
  assert.equal(nextCell(d.cells), "admits");
  d.cells.admits.asked = 2;
  assert.equal(nextCell(d.cells), "admission");
  // exhaust everything
  for (const c of VOID_CELLS) d.cells[c].asked = 99;
  assert.equal(nextCell(d.cells), null);
});

test("aporia: reopensOn answered as nothing fires (positive control)", () => {
  const d = newDialogue(Q);
  const r = detectAporia(d, "Nothing. I can't think of anything that would change my mind.", "reopensOn");
  assert.ok(r && r.fired);
  assert.equal(r.kind, "reopensOn-nothing");
});

test("aporia: reopensOn answered with a real thing does NOT fire (negative control)", () => {
  const d = newDialogue(Q);
  const r = detectAporia(d, "If the data showed gun violence actually went down without them.", "reopensOn");
  assert.equal(r, null);
});

test("aporia: surrender fires (the arrival, not the defeat)", () => {
  const d = newDialogue(Q);
  const r = detectAporia(d, "I don't know. I can't think of anything.");
  assert.ok(r && r.fired);
  assert.equal(r.kind, "surrender");
});

test("aporia: a normal answer to a normal cell does not fire", () => {
  const d = newDialogue(Q);
  const r = detectAporia(d, "Lives are at stake — that's what matters most.", "anchor");
  assert.equal(r, null);
});

test("composeAporia names the conviction honestly and includes the anti-helplessness line", () => {
  const d = newDialogue(Q);
  const a = composeAporia(d, "reopensOn-nothing");
  assert.ok(a.includes("conviction"));
  assert.ok(a.includes("not a criticism of you"));
  assert.ok(/the (truth about the )?claim/.test(a), "the gap is located in the claim, not the person");
  assert.ok(a.endsWith("?"), "ends on the renewed question");
});

test("composeAporia: surrender reads as opening, not defeat", () => {
  const d = newDialogue(Q);
  const a = composeAporia(d, "surrender");
  assert.ok(a.includes("Not knowing is where knowing starts"));
  assert.ok(a.includes("in you") === false || a.includes("the gap is in the claim"));
});

test("composeCellQuestion: every cell has its own real question", () => {
  const d = newDialogue(Q);
  for (const c of VOID_CELLS) {
    const q = composeCellQuestion(d, c);
    assert.ok(q.endsWith("?"), `${c} must end in a question: ${q}`);
    assert.ok(q.length > 20, `${c} must be substantive`);
  }
});

test("composeConsumptionAndAsk restates the operator's words, then builds", () => {
  const d = newDialogue(Q);
  const out = composeConsumptionAndAsk(d, "I think lives are at stake.", "admission");
  assert.ok(/you said: "\w+ think lives are at stake"/.test(out));
  assert.ok(out.includes("build on that"));
  assert.ok(out.endsWith("?"));
});

// ── THE NON-REACTIVITY CONTROL (spec §11.4, built to fail) ──
// A turn that only validates — no push — FAILS. The Noone correction pinned:
// warmth without push is the learned-helplessness ally.
test("non-reactivity control: every composed turn ends in a push", () => {
  const d = newDialogue(Q);
  const turns = [
    composeConsumptionAndAsk(d, "I think lives are at stake.", "admission"),
    composeCellQuestion(d, "reopensOn"),
    composeAporia(d, "surrender"),
  ];
  for (const t of turns) {
    assert.ok(t.trim().endsWith("?") || t.trim().endsWith("..."), `turn must end in a push (question or open): ${t.slice(0, 80)}`);
  }
  // a bare validation would fail this control:
  const validationOnly = "That's a really thoughtful perspective.";
  assert.ok(!validationOnly.endsWith("?"), "the control itself must be able to fail");
});
// ── PHASE B ROUTER CONTROLS ──
// The conviction trigger is cell-INDEPENDENT: a volunteered "nothing would
// change my mind" fires the aporia regardless of which cell was asked.
test("volunteered conviction fires aporia on any cell (early arrival)", () => {
  const d = newDialogue(Q);
  const r = detectAporia(d, "Honestly? Nothing. I dont think anything would change my mind.", "admission");
  assert.ok(r && r.fired);
  assert.equal(r.kind, "reopensOn-nothing");
});

test("negative control: 'nothing' without change-mind intent does not fire", () => {
  const d = newDialogue(Q);
  const r = detectAporia(d, "Nothing specific yet, still thinking about what counts as evidence.", "admits");
  assert.equal(r, null);
});

test("rhetorical mid-sentence question is still an answer", () => {
  assert.ok(isAnswer("Honestly? Nothing. I dont think anything would change my mind."));
  assert.ok(!isAnswer("What would count as evidence?"));
});

// ── DYNAMIC STEERING (answer classification → move) ──
import {
  classifyAnswer, nextMove, composeMove, ANSWER_CLASSES,
} from "./socratic-epistemic.js";

const CLASS_CASES = [
  ["I think lives are at stake.", ANSWER_CLASSES.CONFIDENT],
  ["I guess it depends on the person.", ANSWER_CLASSES.UNCERTAIN],
  ["Honestly? Nothing would change my mind.", ANSWER_CLASSES.CONVICTION],
  ["I dont know, honestly.", ANSWER_CLASSES.NOT_KNOWING],
  ["Yes, exactly.", ANSWER_CLASSES.AGREEING],
  ["It is important because it just is.", ANSWER_CLASSES.CIRCULAR],
  ["Probably depends.", ANSWER_CLASSES.UNCERTAIN],
  ["That's right.", ANSWER_CLASSES.AGREEING],
  ["Okay, sure.", ANSWER_CLASSES.AGREEING],
  ["I think so, maybe.", ANSWER_CLASSES.UNCERTAIN],
];

test("classifyAnswer: the full answer-class matrix", () => {
  for (const [ans, expect] of CLASS_CASES) {
    assert.equal(classifyAnswer(ans), expect, `"${ans}" should be ${expect}`);
  }
});

test("classifyAnswer: 'I think X' is confident, not uncertain", () => {
  assert.equal(classifyAnswer("I think lives are at stake."), ANSWER_CLASSES.CONFIDENT);
});

test("nextMove: conviction → aporia; not-knowing → midwifery; agreeing → probe", () => {
  const d = newDialogue(Q);
  assert.equal(nextMove(d, ANSWER_CLASSES.CONVICTION), "aporia");
  assert.equal(nextMove(d, ANSWER_CLASSES.NOT_KNOWING), "midwifery");
  assert.equal(nextMove(d, ANSWER_CLASSES.AGREEING), "probe");
  assert.equal(nextMove(d, ANSWER_CLASSES.UNCERTAIN), "question");
  assert.equal(nextMove(d, ANSWER_CLASSES.CIRCULAR), "refutation");
  assert.equal(nextMove(d, ANSWER_CLASSES.CONFIDENT), "probe");
  d.stage = "aporia";
  assert.equal(nextMove(d, ANSWER_CLASSES.CONFIDENT), "renew");
});

test("composeMove: every move ends in a push (the non-reactivity control)", () => {
  const d = newDialogue(Q);
  for (const move of ["probe", "question", "refutation", "midwifery", "aporia", "renew"]) {
    const t = composeMove(d, "I think lives are at stake.", move, d.subject);
    assert.ok(t.trim().endsWith("?"), `${move} must end in a push: ${t.slice(0, 60)}`);
  }
});

test("composeMove varies its wording (not one fixed script)", () => {
  const d = newDialogue(Q);
  const seen = new Set();
  for (let i = 0; i < 20; i++) seen.add(composeMove(d, "I think lives are at stake.", "probe", d.subject));
  assert.ok(seen.size > 1, "the probe move should have variation, not one template");
});
