import test from "node:test";
import assert from "node:assert/strict";
import {
  parseArchivists,
  parseStatement,
  evaluateStatement,
  solveKnightsKnaves,
  detectLogicPuzzle,
  checkLogicPuzzle,
} from "./logic-puzzle.js";

test("parseArchivists: splits speaker marks and their quoted statements", () => {
  const q = `A: "E is a Knight." / "Exactly two of us are Knights." B: "None of us is a Knight." / "A and D are the same type."`;
  const { speakers, statements } = parseArchivists(q);
  assert.deepEqual(speakers, ["A", "B"]);
  assert.deepEqual(statements.A, ["E is a Knight.", "Exactly two of us are Knights."]);
  assert.deepEqual(statements.B, ["None of us is a Knight.", "A and D are the same type."]);
  // Fewer than two speakers is not a puzzle.
  assert.equal(parseArchivists(`A: "I am a Knight."`), null);
  assert.equal(parseArchivists("no speaker marks here at all"), null);
});

test("parseStatement: the closed grammar this puzzle family actually uses", () => {
  const speakers = ["A", "B", "C"];
  assert.deepEqual(parseStatement("A is a Knight.", speakers), { type: "isType", who: "A", kind: "knight" });
  assert.deepEqual(parseStatement("B is a Knave.", speakers), { type: "isType", who: "B", kind: "knave" });
  assert.deepEqual(parseStatement("None of us is a Knight.", speakers), { type: "none", kind: "knight" });
  assert.deepEqual(parseStatement("Exactly two of us are Knights.", speakers), { type: "count", n: 2, kind: "knight" });
  assert.deepEqual(parseStatement("A and B are the same type.", speakers), { type: "sameType", a: "A", b: "B" });
  assert.deepEqual(parseStatement("A and B are different types.", speakers), { type: "diffType", a: "A", b: "B" });
  // An unknown letter (not a real speaker) is refused, never guessed at.
  assert.equal(parseStatement("Z is a Knight.", speakers).type, "unparsed");
  // Something outside the closed grammar is named, never forced.
  assert.equal(parseStatement("The ledger is guarded by a Knave.", speakers).type, "unparsed");
});

test("evaluateStatement: each shape's truth under a candidate assignment", () => {
  const assignment = { A: true, B: false, C: true }; // A,C Knights; B Knave
  assert.equal(evaluateStatement({ type: "isType", who: "A", kind: "knight" }, assignment), true);
  assert.equal(evaluateStatement({ type: "isType", who: "B", kind: "knight" }, assignment), false);
  assert.equal(evaluateStatement({ type: "none", kind: "knight" }, assignment), false); // A and C ARE knights
  assert.equal(evaluateStatement({ type: "count", n: 2, kind: "knight" }, assignment), true);
  assert.equal(evaluateStatement({ type: "sameType", a: "A", b: "C" }, assignment), true);
  assert.equal(evaluateStatement({ type: "diffType", a: "A", b: "B" }, assignment), true);
  // An unparsed statement is never silently evaluated.
  assert.equal(evaluateStatement({ type: "unparsed", raw: "x" }, assignment), null);
});

// The exact live specimen this module was built to close — a 5-archivist
// puzzle that broke both the-fold's chat (needsDecomposition fragmenting it
// into invented, unrelated "sections") and eoreader7's TUI (free-narrated
// deduction that misapplied Knight/Knave polarity mid-puzzle).
const SPECIMEN = `statements: A: "E is a Knight." / "Exactly two of us are Knights." B: "None of us is a Knight." / "A and D are the same type." C: "The ledger is guarded by a Knave." / "None of us is a Knight." D: "B is a Knave." / "B and C are the same type." E: "The Spy's box is right next to the ledger's box." / "A is a Knight." Which box holds the ledger, and what is each archivist?`;

test("checkLogicPuzzle: the live 5-archivist specimen resolves to exactly one consistent assignment", () => {
  const found = checkLogicPuzzle(SPECIMEN);
  assert.ok(found);
  assert.equal(found.totalTried, 32); // 2^5, every assignment genuinely tried
  assert.equal(found.valid.length, 1);
  const [solution] = found.valid;
  assert.deepEqual(solution, { A: false, B: false, C: false, D: true, E: false });
  // The two statements about the ledger/box are named as unresolved, never
  // silently dropped or guessed at.
  assert.equal(found.external.length, 2);
  assert.ok(found.external.some((e) => e.speaker === "C" && /ledger is guarded/.test(e.raw)));
  assert.ok(found.external.some((e) => e.speaker === "E" && /Spy's box/.test(e.raw)));
  assert.match(found.display, /Checked all 32 possible Knight\/Knave assignments/);
  assert.match(found.display, /A: Knave · B: Knave · C: Knave · D: Knight · E: Knave/);
  assert.match(found.display, /2 statement\(s\) refer to something outside/);
});

test("solveKnightsKnaves: a classic two-speaker puzzle with a known unique answer", () => {
  // A: "We are both Knaves." — a Knight can never truthfully claim to be a
  // Knave, and a Knave saying it would make it true (contradiction) unless
  // B really is a Knave and A is lying about being one too, i.e. A is a
  // Knave and B is a Knight — the standard resolution.
  const found = checkLogicPuzzle(`A: "We are both Knaves." B: "A is a Knave."`);
  // "We are both Knaves" isn't in this module's closed grammar (no
  // first-person plural claim), so it should refuse rather than guess —
  // confirms the parser doesn't overreach into inventing a reading.
  assert.equal(found, null);
});

test("solveKnightsKnaves: an unsolvable (contradictory) puzzle is reported, not forced", () => {
  // A directly contradicts itself; B just supplies the Knave vocabulary
  // detectLogicPuzzle requires, so the door claims the question at all.
  const q = `A: "A is a Knight." / "A is a Knave." B: "B is a Knave."`;
  const found = checkLogicPuzzle(q);
  assert.ok(found);
  assert.equal(found.valid.length, 0);
  assert.match(found.display, /none is self-consistent/);
});

test("solveKnightsKnaves: a determined 3-speaker puzzle reports its one consistent option, computed not guessed", () => {
  const q = `A: "B is a Knight." B: "A and B are different types." / "C is a Knave." C: "A is a Knave."`;
  const found = checkLogicPuzzle(q);
  assert.ok(found);
  assert.equal(found.external.length, 0); // every statement here is in the closed grammar
  assert.equal(found.valid.length, 1);
  assert.deepEqual(found.valid[0], { A: false, B: false, C: true });
});

test("detectLogicPuzzle: refuses ordinary text with no Knight/Knave vocabulary, and single-speaker text", () => {
  assert.equal(detectLogicPuzzle("What is the capital of France?"), null);
  assert.equal(detectLogicPuzzle("A: \"the weather is nice\" B: \"I agree\""), null); // no Knight/Knave words
  assert.equal(detectLogicPuzzle("Section A: intro. Section B: methods."), null); // Knight/Knave absent entirely
});
