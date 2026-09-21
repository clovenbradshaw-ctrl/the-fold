import test from "node:test";
import assert from "node:assert/strict";
import {
  parseSpeakers,
  parseStatement,
  evaluateStatement,
  solveDiscrete,
  detectDiscreteConstraints,
  checkDiscreteConstraints,
  detectTypeWords,
  detectLinearRelations,
  checkLinearRelations,
  checkMechanicalReasoning,
} from "./aristotle.js";

// ── the discrete solver (Knights-and-Knaves is one instance of this, not a
// module of its own) ────────────────────────────────────────────────────────

test("parseSpeakers: splits unknown marks and their quoted statements", () => {
  const q = `A: "E is a Knight." / "Exactly two of us are Knights." B: "None of us is a Knight." / "A and D are the same type."`;
  const { unknowns, statements } = parseSpeakers(q);
  assert.deepEqual(unknowns, ["A", "B"]);
  assert.deepEqual(statements.A, ["E is a Knight.", "Exactly two of us are Knights."]);
  assert.deepEqual(statements.B, ["None of us is a Knight.", "A and D are the same type."]);
  assert.equal(parseSpeakers(`A: "I am a Knight."`), null);
  assert.equal(parseSpeakers("no speaker marks here at all"), null);
});

test("parseStatement: the closed grammar this puzzle family actually uses", () => {
  const unknowns = ["A", "B", "C"];
  assert.deepEqual(parseStatement("A is a Knight.", unknowns), { type: "isValue", who: "A", kind: "truth" });
  assert.deepEqual(parseStatement("B is a Knave.", unknowns), { type: "isValue", who: "B", kind: "lie" });
  assert.deepEqual(parseStatement("None of us is a Knight.", unknowns), { type: "none", kind: "truth" });
  assert.deepEqual(parseStatement("Exactly two of us are Knights.", unknowns), { type: "count", n: 2, kind: "truth" });
  assert.deepEqual(parseStatement("A and B are the same type.", unknowns), { type: "sameValue", a: "A", b: "B" });
  assert.deepEqual(parseStatement("A and B are different types.", unknowns), { type: "diffValue", a: "A", b: "B" });
  assert.equal(parseStatement("Z is a Knight.", unknowns).type, "unparsed");
  assert.equal(parseStatement("The ledger is guarded by a Knave.", unknowns).type, "unparsed");
});

test("evaluateStatement: each shape's truth under a candidate assignment", () => {
  const assignment = { A: true, B: false, C: true }; // A,C truth-tellers; B liar
  assert.equal(evaluateStatement({ type: "isValue", who: "A", kind: "truth" }, assignment), true);
  assert.equal(evaluateStatement({ type: "isValue", who: "B", kind: "truth" }, assignment), false);
  assert.equal(evaluateStatement({ type: "none", kind: "truth" }, assignment), false);
  assert.equal(evaluateStatement({ type: "count", n: 2, kind: "truth" }, assignment), true);
  assert.equal(evaluateStatement({ type: "sameValue", a: "A", b: "C" }, assignment), true);
  assert.equal(evaluateStatement({ type: "diffValue", a: "A", b: "B" }, assignment), true);
  assert.equal(evaluateStatement({ type: "unparsed", raw: "x" }, assignment), null);
});

// The live specimen this module was built to close — a 5-archivist puzzle
// that broke both the-fold's chat (needsDecomposition fragmenting it into
// invented sections) and eoreader7's TUI (free-narrated deduction that
// misapplied Knight/Knave polarity mid-puzzle).
const SPECIMEN = `statements: A: "E is a Knight." / "Exactly two of us are Knights." B: "None of us is a Knight." / "A and D are the same type." C: "The ledger is guarded by a Knave." / "None of us is a Knight." D: "B is a Knave." / "B and C are the same type." E: "The Spy's box is right next to the ledger's box." / "A is a Knight." Which box holds the ledger, and what is each archivist?`;

test("checkDiscreteConstraints: the live 5-archivist specimen resolves to exactly one consistent assignment", () => {
  const found = checkDiscreteConstraints(SPECIMEN);
  assert.ok(found);
  assert.equal(found.totalTried, 32);
  assert.equal(found.valid.length, 1);
  assert.deepEqual(found.valid[0], { A: false, B: false, C: false, D: true, E: false });
  assert.equal(found.external.length, 2);
  assert.ok(found.external.some((e) => e.speaker === "C" && /ledger is guarded/.test(e.raw)));
  assert.ok(found.external.some((e) => e.speaker === "E" && /Spy's box/.test(e.raw)));
  assert.match(found.display, /Checked all 32 possible Knight\/Knave assignments/);
  assert.match(found.display, /A: Knave · B: Knave · C: Knave · D: Knight · E: Knave/);
  assert.match(found.display, /2 statement\(s\) refer to something outside/);
});

test("solveDiscrete: a classic two-speaker puzzle that isn't in the closed grammar refuses rather than guesses", () => {
  const found = checkDiscreteConstraints(`A: "We are both Knaves." B: "A is a Knave."`);
  assert.equal(found, null);
});

test("solveDiscrete: an unsolvable (contradictory) puzzle is reported, not forced", () => {
  const q = `A: "A is a Knight." / "A is a Knave." B: "B is a Knave."`;
  const found = checkDiscreteConstraints(q);
  assert.ok(found);
  assert.equal(found.valid.length, 0);
  assert.match(found.display, /none is self-consistent/);
});

test("solveDiscrete: a determined 3-speaker puzzle reports its one consistent option, computed not guessed", () => {
  const q = `A: "B is a Knight." B: "A and B are different types." / "C is a Knave." C: "A is a Knave."`;
  const found = checkDiscreteConstraints(q);
  assert.ok(found);
  assert.equal(found.external.length, 0);
  assert.equal(found.valid.length, 1);
  assert.deepEqual(found.valid[0], { A: false, B: false, C: true });
});

test("detectDiscreteConstraints: refuses ordinary text with no type vocabulary, and single-speaker text", () => {
  assert.equal(detectDiscreteConstraints("What is the capital of France?"), null);
  assert.equal(detectDiscreteConstraints("A: \"the weather is nice\" B: \"I agree\""), null);
  assert.equal(detectDiscreteConstraints("Section A: intro. Section B: methods."), null);
});

test("count phrased 'is a Knight' is parsed, and this puzzle has no solution", () => {
  const found = checkDiscreteConstraints(`Every inhabitant is a Knight or a Knave. P: "Q is a Knave." Q: "P and R are the same type." R: "Exactly one of us is a Knight."`);
  assert.ok(found);
  assert.equal(found.external.length, 0);
  assert.equal(found.valid.length, 0);
});

test("plural 'Knights'/'Knaves' in the prose still claims the puzzle; underdetermined answers list every option", () => {
  const found = checkDiscreteConstraints(`Knights always tell the truth and Knaves always lie. X: "Y is a Knave." Y: "X and Z are different types." Z: "Exactly two of us are Knights."`);
  assert.ok(found);
  assert.deepEqual(found.valid, [{ X: true, Y: false, Z: true }, { X: false, Y: true, Z: true }]);
});

// Generality check (P71): a puzzle that renames the two types entirely, with
// no "Knight"/"Knave" anywhere.
test("detectTypeWords: a puzzle renaming Knight/Knave to Truth-teller/Liar is solved by the SAME engine", () => {
  const q = `On this island, Truth-tellers always tell the truth, and Liars always lie. X: "Y is a Liar." Y: "X and Z are different types." Z: "Exactly two of us are Truth-tellers."`;
  const words = detectTypeWords(q);
  assert.deepEqual(words, { truthWord: "Truth-teller", lieWord: "Liar" });
  const found = checkDiscreteConstraints(q);
  assert.ok(found);
  assert.deepEqual(found.types, words);
  assert.deepEqual(found.valid, [{ X: true, Y: false, Z: true }, { X: false, Y: true, Z: true }]);
  assert.match(found.display, /Truth-teller\/Liar assignments/);
  assert.match(found.display, /X:T Y:l Z:T {2}\| {2}X:l Y:T Z:T/);
});

test("detectTypeWords: a third naming (Sage/Fool) with a contradictory puzzle reports no solution, not a crash", () => {
  const q = `Sages always tell the truth and Fools always lie. A: "A is a Sage." / "A is a Fool." B: "B is a Fool."`;
  const found = checkDiscreteConstraints(q);
  assert.ok(found);
  assert.equal(found.valid.length, 0);
  assert.match(found.display, /Sage\/Fool assignments/);
});

test("detectTypeWords: text with no type-pair rule and no Knight/Knave is refused, not guessed", () => {
  assert.equal(detectTypeWords("A: \"B is happy.\" B: \"A is sad.\""), null);
  assert.equal(checkDiscreteConstraints("A: \"B is happy.\" B: \"A is sad.\""), null);
});

// ── the continuous solver: bat-and-ball, the SAME shape, a different value
// space ──────────────────────────────────────────────────────────────────

test("detectLinearRelations: the classic bat-and-ball specimen", () => {
  const q = "A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?";
  const found = detectLinearRelations(q);
  assert.deepEqual(found, { itemA: "bat", itemB: "ball", total: 1.10, difference: 1.00 });
});

test("checkLinearRelations: solves the exact system — NOT the classic wrong intuition of $0.10", () => {
  const q = "A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?";
  const found = checkLinearRelations(q);
  assert.ok(found);
  assert.equal(found.priceB, 0.05); // the ball
  assert.equal(found.priceA, 1.05); // the bat
  assert.equal(found.askedFor, "ball");
  assert.match(found.display, /\$0\.05/);
  assert.match(found.display, /computed by solving the stated relations exactly, not estimated/);
});

test("checkLinearRelations: asking for the other item highlights the other value", () => {
  const q = "A pen and a notebook cost $5.50 together. The notebook costs $3.50 more than the pen. What does the notebook cost?";
  const found = checkLinearRelations(q);
  assert.ok(found);
  assert.equal(found.askedFor, "notebook");
  assert.equal(found.priceA, 4.50); // notebook, the pricier one
  assert.equal(found.priceB, 1.00); // pen
  assert.match(found.display, /The question asks for the notebook: \$4\.50/);
});

test("checkLinearRelations: an impossible relation (difference exceeds total) is refused, never forced", () => {
  const q = "A widget and a gadget cost $1.00 together. The widget costs $5.00 more than the gadget. How much is the gadget?";
  assert.equal(checkLinearRelations(q), null);
});

test("checkLinearRelations: text with no relation shape at all is refused", () => {
  assert.equal(checkLinearRelations("What is the capital of France?"), null);
  assert.equal(checkLinearRelations("A bat and a ball are both round."), null); // no total, no difference stated
});

// ── the one dispatcher ─────────────────────────────────────────────────────

test("checkMechanicalReasoning: routes a discrete puzzle and a continuous puzzle through ONE call, and refuses ordinary text", () => {
  const puzzle = checkMechanicalReasoning(`A: "B is a Knave." B: "A and B are different types."`);
  assert.ok(puzzle);
  assert.equal(puzzle.kind, "discrete-constraints");
  const batBall = checkMechanicalReasoning("A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?");
  assert.ok(batBall);
  assert.equal(batBall.kind, "linear-relations");
  assert.equal(checkMechanicalReasoning("What is the capital of France?"), null);
});
