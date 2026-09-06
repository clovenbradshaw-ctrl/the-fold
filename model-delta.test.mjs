import test from "node:test";
import assert from "node:assert/strict";
import { workOf, routeForWork, delta, WORK, DELTA } from "./model-delta.js";

test("the work a question asks for decides the model, and the instrument answering means none runs", () => {
  assert.equal(workOf("anything at all", { answered: { kind: "cloze" } }), WORK.NONE);
  assert.equal(workOf('Earlier I asked you: "what about the tide?" What did you answer then?'), WORK.HOLD);
  assert.equal(workOf("What fills the blank in that passage?"), WORK.HOLD);
  assert.equal(workOf("Why does the harbour matter to the town?"), WORK.COMPOSE);
  assert.equal(workOf("Summarize what the file says about Ada Rowe."), WORK.COMPOSE);
  // The small model stays the default; a second reading is asked only where
  // the measurement said it drifts, and only when one is offered.
  assert.deepEqual(routeForWork(WORK.NONE, { small: "s", second: "b" }).models, []);
  assert.deepEqual(routeForWork(WORK.COMPOSE, { small: "s", second: "b" }).models, ["s"]);
  assert.deepEqual(routeForWork(WORK.HOLD, { small: "s", second: "b" }).models, ["s", "b"]);
  assert.deepEqual(routeForWork(WORK.HOLD, { small: "s" }).models, ["s"], "no second offered, the drift stands disclosed");
  assert.match(routeForWork(WORK.COMPOSE, { small: "s" }).why, /composition is where the small model holds/);
});

test("a disagreement is TYPED, and nothing here picks a winner", () => {
  const q = "When was the harbor light built and by whom?";
  const d = (a, b) => delta(q, [{ model: "small", text: a }, { model: "second", text: b }]);
  assert.equal(d("The harbor light was built in 1841 by Ada Rowe.", "It was built in 1841 by Ada Rowe.").kind, DELTA.AGREE);
  assert.equal(d("The light was built in 1841 by Ada Rowe.", "The light was built in 1847 by Ada Rowe.").kind, DELTA.CONFLICT);
  assert.equal(d("The light was built in 1841 by Ada Rowe.", "I could not say.").kind, DELTA.ONE_SILENT);
  assert.equal(d("The harbor light was built in 1841 by Ada Rowe above the coast.",
    "This analysis focuses on how large language models are trained on corpora of text and what that means downstream.").kind, DELTA.DRIFTED);
  assert.equal(d("It was built in 1841.", "It was built in 1841 by Ada Rowe.").kind, DELTA.EXTRA);
  // A conflict names itself as one and hands the decision back to the material.
  assert.match(d("Built in 1841.", "Built in 1847.").detail, /the material decides, not the models/);
  assert.equal(delta(q, [{ model: "a", text: "x" }]).kind, null, "a delta needs two readings");
});
