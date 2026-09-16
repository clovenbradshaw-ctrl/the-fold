// logos-ledger-lint.test.mjs — reasoning-lint over the NOTES in the log, the
// way the live turn runs it: the app's own door construction (the shim over
// eoreader7's text face, adaptTaskLog, native projectTasks), the declarations
// register as the one-value authority, and this turn's own fold kept apart.
import test from "node:test";
import assert from "node:assert/strict";
import { ledgerLint, LEDGER_LINT_STRICTNESS } from "./logos.js";
import { answerRecord, answerRecordLine, answerRecordProse, bareLogic } from "./answer-record.js";
import { makeHyperlexicon } from "./hyperlexicon.js";
import { adaptTaskLog } from "./consequence.js";
import * as TL from "../eoreader7/native/kernel/task-log.js";
import { cellOf, GRAINS } from "../eoreader7/native/kernel/cube.js";
import { createDeclarationLog, proposeCandidate, promote, foldDeclarations } from "../eoreader7/native/interpretation/declarations.js";

const hl = makeHyperlexicon({ ...adaptTaskLog({ createTaskLog: TL.createTaskLog, append: TL.append, ENTRY_KINDS: TL.ENTRY_KINDS, OPERATOR_BASIS: TL.OPERATOR_BASIS, GRAINS }), projectTasks: TL.projectTasks, cellOf });
const taskLog = { projectTasks: TL.projectTasks };
const hear = (log, s, v, o, source) => hl.admit(log ?? hl.createHyperlexicon({ frame: { reader: "test", giver: "logos-ledger-lint.test.mjs" } }), [{ subject: s, verb: v, object: o, spans: [{ at: `${source}#0-9`, text: `${s} ${v} ${o}` }] }], { witness: source }).log;

const declared = (kind, rel) => {
  const p = proposeCandidate(createDeclarationLog(), { kind, rel, acquisition: "declared", source: "test" });
  const g = promote(p.log, p.id, { giver: "person:test" });
  const f = foldDeclarations(g.log);
  return { given: f.given, candidates: f.candidates };
};

test("nothing read yet is null, never an empty clean bill", () => {
  assert.equal(ledgerLint(null, { door: hl, taskLog }), null);
});

test("a plain reading with several values at one address convicts nobody, and says how many it did not judge", () => {
  let log = hear(null, "lincoln", "met", "mary owens", "a.txt");
  log = hear(log, "lincoln", "met", "mary todd", "b.txt");
  const r = ledgerLint(log, { door: hl, taskLog });
  assert.equal(r.strictness, LEDGER_LINT_STRICTNESS);
  assert.equal(r.read, 2, "the linter read the notes the log holds");
  assert.equal(r.ok, true, "two true facts are not a contradiction");
  assert.equal(r.unjudged, 1, "the multi-valued address is counted, not judged");
});

test("this turn's own fold: a conflict this turn introduced is reported apart from one already standing", () => {
  const functional = declared("functional", "born-in");
  let log = hear(null, "lincoln", "born-in", "kentucky", "a.txt");
  log = hear(log, "lincoln", "born-in", "illinois", "b.txt"); // standing before the turn
  const fromSeq = log.nextSeq;
  log = hear(log, "grant", "born-in", "ohio", "a.txt");
  log = hear(log, "grant", "born-in", "virginia", "c.txt"); // written by this turn
  const r = ledgerLint(log, { door: hl, taskLog, fromSeq, functional });
  assert.equal(r.counts.standing_contradiction, 2, "the whole ledger carries both conflicts");
  assert.equal(r.ok, false);
  assert.equal(r.thisTurn.appearedCount, 1, "only the conflict this turn wrote appeared this turn");
  assert.ok(r.thisTurn.appeared[0].detail.includes("grant|born-in"));
});

test("a dispute landed on a note is found by reading the log — the notes-level reasoning the answer never shows", () => {
  let log = hear(null, "napoleon", "withdrew-from", "moscow", "a.txt");
  const fromSeq = log.nextSeq;
  const id = hl.assertionId("napoleon", "withdrew-from", "moscow");
  const d = hl.dispute(log, id, { source: "b.txt", because: "b.txt says the army stayed", span: { at: "b.txt#0-9", text: "the army stayed" }, kind: hl.DISPUTE_KINDS.CONTEST });
  assert.equal(d.refused ?? null, null, `the dispute landed: ${JSON.stringify(d.refused)}`);
  log = d.log;
  const r = ledgerLint(log, { door: hl, taskLog, fromSeq });
  assert.ok(r.findings.some((f) => f.kind === "contested_open"), "the open contest on the note is read off the log");
  assert.ok(r.thisTurn.appeared.some((f) => f.kind === "contested_open"), "and it is this turn's");
});

test("the answer record carries it: the one-line view, the plain-language sentence for this turn only, and the bare logic", () => {
  const functional = declared("functional", "born-in");
  let log = hear(null, "grant", "born-in", "ohio", "a.txt");
  const fromSeq = log.nextSeq;
  log = hear(log, "grant", "born-in", "virginia", "c.txt");
  const lint = ledgerLint(log, { door: hl, taskLog, fromSeq, functional });
  const rec = answerRecord({ question: "where was grant born?", answer: "Ohio.", ledgerLint: lint });
  assert.deepEqual(rec.ledgerLint, lint, "the record carries the lint as computed");
  assert.match(answerRecordLine(rec), /notes linted 2: 1 error\(s\), 1 new this turn/);
  assert.match(answerRecordProse(rec), /Reading its own notes back, this turn left two notes give different answers where only one answer is allowed\./);
  const logic = bareLogic(rec).join("\n");
  assert.match(logic, /notes {5}linted 2 @strict — incoherent · 1 standing_contradiction/);
  assert.match(logic, /\+ \[error\] standing_contradiction: .*grant\|born-in/);

  const quiet = answerRecord({ question: "q", answer: "a", ledgerLint: ledgerLint(hear(null, "a", "b", "c", "x.txt"), { door: hl, taskLog }) });
  assert.doesNotMatch(answerRecordProse(quiet), /Reading its own notes back/, "a coherent ledger adds no sentence");
});
