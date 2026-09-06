// reading-trace.test.mjs — P142. What the reading did with each passage.
import test from "node:test";
import assert from "node:assert/strict";
import { traceReading, traceLine, actsFor, looked, VERDICT } from "./reading-trace.js";

const Q = "Remind me what that passage says about Pierre and Prince Andrew and why it matters.";
const P = [
  { ref: "pg2600.txt#1602906-1602979", text: '"Both true and untrue," Pierre began; but Prince Andrew interrupted him.' },
  { ref: "pg2600.txt#249072-250193", text: "The two princesses embraced while Prince Andrew stood by, uncomfortable and silent." },
  { ref: "react-dom.js#0-90", text: "var RootDidNotComplete = 6; function commitRoot(root){ return null; }" },
];

test("a retrieved passage leaves the turn with a verdict — all three kinds, on the run's own material", () => {
  const t = traceReading({ passages: P, question: Q, used: ["pg2600.txt#1602906-1602979"] });
  assert.deepEqual(t.map((x) => x.verdict), [VERDICT.BORE, VERDICT.CHECKED_SILENT, VERDICT.CHECKED_APART]);
});

test("THE CONTROL: nothing may be reported as excluded when nothing was read", () => {
  // The failure this organ exists to prevent is the opposite of a false
  // exclusion — it is an empty search reported as an exhaustive one.
  const t = traceReading({ passages: [], question: Q, used: [] });
  assert.equal(looked(t), false, "an empty trace is 'nothing was read', never 'nothing bore'");
  assert.equal(traceLine(t), "", "a turn that read nothing says nothing about what it excluded");
});

test("a passage that bore is never reported as excluded, however it is addressed", () => {
  // The answer cites the chunk with a span suffix; the passage is the chunk.
  const t = traceReading({ passages: P, question: Q, used: ["pg2600.txt#1602906-1602979~12-40"] });
  assert.equal(t[0].verdict, VERDICT.BORE);
  assert.ok(!traceLine(t).includes("1602906"), "the passage the answer stands on is not in the excluded line");
});

test("the line names the addresses and says which kind of nothing each one was", () => {
  const line = traceLine(traceReading({ passages: P, question: Q, used: [P[0].ref] }));
  assert.match(line, /^Also looked at:/);
  assert.ok(line.includes("pg2600.txt#249072-250193") && line.includes("react-dom.js#0-90"));
  assert.match(line, /without answering this/);
  assert.match(line, /about something else/);
});

test("the line is silent when every passage bore — nothing was excluded, so there is nothing to report", () => {
  assert.equal(traceLine(traceReading({ passages: P, question: Q, used: P.map((p) => p.ref) })), "");
});

test("each verdict lands as one CON·Figure act, keyed to the question and the address", () => {
  const acts = actsFor(Q, traceReading({ passages: P, question: Q, used: [P[0].ref] }));
  assert.equal(acts.length, 3);
  assert.ok(acts.every((a) => a.operator === "CON" && a.grain === "figure" && a.kind === "reading"));
  assert.deepEqual(acts.map((a) => a.end2), P.map((p) => p.ref));
  assert.deepEqual(acts.map((a) => a.label), [VERDICT.BORE, VERDICT.CHECKED_SILENT, VERDICT.CHECKED_APART]);
  assert.ok(acts.every((a) => a.because), "an act with no reason is not a finding");
});
