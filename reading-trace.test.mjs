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

test("the line names the sources in plain words and says which kind of nothing each one was", () => {
  const line = traceLine(traceReading({ passages: P, question: Q, used: [P[0].ref] }));
  assert.match(line, /^Also looked at:/);
  // Named by source, not by this instrument's own address — a byte range
  // is apparatus a person never asked to see (2026-09-09 fix, this file's
  // own header: "never as apparatus"). "pg2600.txt" and "react-dom.js" are
  // the plain names; their byte ranges must not survive into the sentence.
  assert.ok(line.includes("pg2600.txt") && line.includes("react-dom.js"), "the source is named");
  assert.ok(!line.includes("#249072-250193") && !line.includes("#0-90"), "no byte range reaches the chat text");
  assert.match(line, /without answering this/);
  assert.match(line, /about something else/);
});

test("a fetched web page is named by its site, never by this app's own ref format", () => {
  // "web:usinsider.com-1#36-98" is source.js's own address for the second
  // page read from usinsider.com this turn (the `-1` disambiguates a repeat
  // host, the `#36-98` is a byte range) — none of that is a name a chat
  // reader recognizes. Measured live 2026-09-09: this exact ref rendered
  // raw into the answer bubble on a subjective question with no material
  // attached, next to "brecks.com-2#68-392" for the same reason.
  const web = [
    { ref: "web:usinsider.com-1#36-98", text: "Fall brings cooler air and colorful leaves across the region." },
    { ref: "web:brecks.com-2#68-392", text: "Plant bulbs in fall for spring color; cooler soil helps roots establish." },
  ];
  const q = "What's your favorite season and why?";
  const line = traceLine(traceReading({ passages: web, question: q, used: [] }));
  assert.ok(line.includes("usinsider.com") && line.includes("brecks.com"), "the site name stands in for the ref");
  assert.ok(!line.includes("web:") && !/#\d+-\d+/.test(line), "no internal address token reaches the visible sentence");
});

test("two pages of the same host collapse to one name, and the count said matches what is shown", () => {
  const sameHost = [
    { ref: "web:example.com-0#0-40", text: "Nothing about the asked topic here at all." },
    { ref: "web:example.com-1#0-40", text: "Also nothing about the asked topic here." },
  ];
  const line = traceLine(traceReading({ passages: sameHost, question: "irrelevant words entirely", used: [] }));
  const occurrences = (line.match(/example\.com/g) ?? []).length;
  assert.equal(occurrences, 1, "the same site read twice is named once, not repeated");
  assert.match(line, /example\.com was read/, "singular verb agrees with the single name actually shown");
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
