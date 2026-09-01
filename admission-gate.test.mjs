// admission-gate.test.mjs — the EVA station at the hyperlexicon door,
// threaded through the REAL runPart (P72). hyperlexicon.test.mjs already
// proves the door itself (admit + classifyConnector, asymmetric); nothing
// anywhere invoked runPart with a hyperlexicon before this file, so the
// wiring holon.js gained — classifyConnector accepted, forwarded to admit,
// turnedAway accumulated and RETURNED (P57: not optional at any boundary) —
// had no pin. The lens here is the real grammar-lens.js over live_priors'
// real committed POSPrior@1 (the shipped ground the /priors-data/ mount
// falls back to), never a stub classifier: the junk connector below ("of")
// is one of the exact 18/32 measured live in eval/admission-gate.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { runPart } from "./holon.js";
import { makeHyperlexicon } from "./hyperlexicon.js";
import { makeGrammarLens } from "./grammar-lens.js";
import { adaptTaskLog } from "./consequence.js";
import { chunkSource } from "./source.js";
import { classifyWord, dominantClass } from "../eoreader7/native/adapters/text/wordclass.js";
import * as nativeTaskLog from "../eoreader7/native/kernel/task-log.js";
import * as cube from "../eoreader7/native/kernel/cube.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const posPrior = JSON.parse(readFileSync(
  join(HERE, "..", "live_priors", "derived-priors", "pos-priors", "pos-prior-en.json"), "utf8"));

const hyperlexicon = makeHyperlexicon({
  ...adaptTaskLog({
    createTaskLog: nativeTaskLog.createTaskLog, append: nativeTaskLog.append,
    ENTRY_KINDS: nativeTaskLog.ENTRY_KINDS, OPERATOR_BASIS: nativeTaskLog.OPERATOR_BASIS,
    GRAINS: cube.GRAINS,
  }),
  projectTasks: nativeTaskLog.projectTasks,
  cellOf: cube.cellOf,
});

const classifyConnector = makeGrammarLens({ classifyWord, dominantClass, posPrior });

// One passage whose text retrieval can find from the part's own words; a
// stub relation reader handing the door exactly two bound edges — one
// junk-labeled (a slot filled by a preposition, P56's own specimen shape),
// one genuinely verb-labeled — each with a byte-addressed span so the
// door's UNADDRESSED wall stays out of the way of what this file tests.
const TEXT = "The battle of Borodino was fought near Moscow. Napoleon commanded the army.";
const chunks = chunkSource("t:page", TEXT);
const span = { ref: "t:page", start: 0, end: 40, text: "The battle of Borodino was fought" };
const stubRelations = () => ({
  read: (text) => text.includes("Borodino")
    ? { claims: [
        { verdict: "bound", subject: "The Battle", verb: "of", object: "Borodino", spans: [span] },
        { verdict: "bound", subject: "the army", verb: "fought", object: "near Moscow", spans: [span] },
      ] }
    : { claims: [] },
});

const runWith = (opts) => runPart({
  part: { label: "read", description: "battle of Borodino fought" },
  task: "battle of Borodino fought",
  discourse: "",
  chatHistory: [],
  chunks,
  call: async () => "The battle was fought near Moscow.",
  makeRelationReader: stubRelations,
  hyperlexicon,
  hyperlexiconLog: null,
  ...opts,
});

test("with the lens: the junk-labeled edge is refused at the door, the verb edge admits, and turnedAway comes back out", async () => {
  const r = await runWith({ classifyConnector });
  const notes = hyperlexicon.foldHyperlexicon(r.hyperlexiconLog);
  assert.deepEqual(notes.map((n) => n.verb), ["fought"], "only the verb-labeled edge may land");
  assert.equal(r.hyperlexiconTurnedAway.length, 1, "the refusal must come back out, never be read and discarded");
  const t = r.hyperlexiconTurnedAway[0];
  assert.equal(t.verb, "of");
  assert.match(t.detail, /preposition/, "the refusal carries the lens's own finding");
  assert.equal(t.witness, chunks[0].ref, "the refusal names the passage it happened at");
});

test("without the lens (every existing caller): the door is byte-identical to before — both edges admit, nothing refused", async () => {
  const r = await runWith({ classifyConnector: null });
  const notes = hyperlexicon.foldHyperlexicon(r.hyperlexiconLog);
  assert.deepEqual(new Set(notes.map((n) => n.verb)), new Set(["of", "fought"]),
    "a check that cannot run must not refuse (P41)");
  assert.equal(r.hyperlexiconTurnedAway.length, 0);
});

test("out-of-vocabulary connector admits — the gate is asymmetric, absence convicts nothing", async () => {
  const oov = () => ({
    read: (text) => text.includes("Borodino")
      ? { claims: [{ verdict: "bound", subject: "x", verb: "zzyqx", object: "y", spans: [span] }] }
      : { claims: [] },
  });
  const r = await runWith({ classifyConnector, makeRelationReader: oov });
  const notes = hyperlexicon.foldHyperlexicon(r.hyperlexiconLog);
  assert.deepEqual(notes.map((n) => n.verb), ["zzyqx"], "a gap in the prior is never a fact about the connector");
  assert.equal(r.hyperlexiconTurnedAway.length, 0);
});
