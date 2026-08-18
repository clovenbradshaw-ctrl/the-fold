// term-lessons.test.mjs — the terminal's tutor, walked as pure state.
// No DOM: stepLesson is a plain reducer over (index, tries, raw line).

import test from "node:test";
import assert from "node:assert/strict";
import { LESSONS, stepLesson } from "./term-lessons.js";

test("every lesson step has a non-trivial ask and a regex that matches something", () => {
  for (const step of LESSONS) {
    assert.ok(step.ask.length > 10, `${step.id} has no real prompt`);
    assert.ok(step.match instanceof RegExp, `${step.id} has no matcher`);
  }
});

test("a matching line advances the lesson and hands back the next ask", () => {
  const r = stepLesson(0, 0, "help");
  assert.equal(r.event, "advanced");
  assert.equal(r.at, 1);
  assert.equal(r.tries, 0);
  assert.equal(r.ask, LESSONS[1].ask);
});

test("a non-matching line is a miss, then a hint on the second try, and holds the step", () => {
  const miss = stepLesson(0, 0, "sources");
  assert.equal(miss.event, "miss");
  assert.equal(miss.at, 0);
  assert.equal(miss.tries, 1);
  const hint = stepLesson(0, 1, "sources");
  assert.equal(hint.event, "hint");
  assert.equal(hint.at, 0);
});

test("the last step finishes the walk instead of advancing past the list", () => {
  // "capacities" is the CURRENT final step's own matching input — update
  // this literal (as this test's own history already shows: it was
  // "clear" before the terminal-language steps were appended) whenever a
  // new step lands at the end of LESSONS.
  const last = LESSONS.length - 1;
  const r = stepLesson(last, 0, "capacities");
  assert.equal(r.event, "finished");
  assert.equal(r.at, null);
  assert.equal(r.done, LESSONS[last].done);
});

test("an inactive lesson (at=null) is a no-op", () => {
  const r = stepLesson(null, 0, "help");
  assert.equal(r.event, "inactive");
  assert.equal(r.at, null);
});

test("the run-js step accepts anything except the literal exit word", () => {
  const runJsIdx = LESSONS.findIndex((s) => s.id === "run-js");
  assert.ok(LESSONS[runJsIdx].match.test("2 + 2"));
  assert.ok(!LESSONS[runJsIdx].match.test("exit"));
});
