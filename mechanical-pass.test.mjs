import test from "node:test";
import assert from "node:assert/strict";
import { runMechanicalPass } from "./mechanical-pass.js";
import { answerBeforeTheModel } from "./answerable.js";
import { createLemmatizer, morphologyFromPrior } from "../eoreader7/native/adapters/text/morphology.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as mathjs from "mathjs";

const HERE = dirname(fileURLToPath(import.meta.url));

// The real morphology prior, loaded exactly as app.js loads it — the same
// `morphologyFromPrior` → `createLemmatizer(...).sameAct` seam (app.js:5523).
const priorRaw = JSON.parse(readFileSync(join(HERE, "../eoreader7/native/priors/morphology-eng.json"), "utf8"));
const prior = morphologyFromPrior(priorRaw);
const sameAct = createLemmatizer(prior.forms, { language: prior.language }).sameAct;

const passages = [{ ref: "pg2600.txt#1637123-1637402", text: "Borís was thus the first to learn the news that the French army had crossed the Niemen and, thanks to this, was able to show certain important personages the attitude of mind to be expected of the heir of a colossal fortune." }];

const read = (t) => ({ claims: [{ end1: "French army", label: "crossed", end2: "the Niemen", verdict: "bound", refs: ["pg2600.txt#1637123-1637402"] }] });

const baseOrgans = { read, sameAct, answerBeforeTheModel };

test("the exact door closes INS·Figure with an address — no model", () => {
  const r = runMechanicalPass({
    question: "Which is earlier, 1805 or 1841, and how many years apart are they?",
    organs: baseOrgans,
    context: { passages, transcript: [], math: mathjs },
  });
  const build = r.cells.find((c) => c.cell === "INS·Figure");
  assert.ok(build.close, "the exact door closed");
  assert.match(build.close.text, /36 years/);
  assert.equal(r.answered, true);
  assert.equal(r.residual, null);
});

test("a prose ask never closes INS·Figure — the turn belongs to the model", () => {
  const r = runMechanicalPass({
    question: "Which is earlier, 1805 or 1841, and why does it matter?",
    organs: baseOrgans,
    context: { passages, transcript: [], math: mathjs },
  });
  const build = r.cells.find((c) => c.cell === "INS·Figure");
  assert.ok(build.refusal, "wantsProse declines the exact door");
  assert.ok(r.residual, "the residual is the mouth's");
  assert.ok(r.residual.boundary, "the residual names a boundary");
  assert.equal(r.answered, false, "a prose ask is never answered by the pass alone");
});

test("the morphology prior closes INFLECTIONAL paraphrase — same lemma, different form", () => {
  // The material states "crossed"; the question asks "did the French army cross the Niemen?"
  // "crossed"/"cross" are the same act through the prior — a mechanical close, no model.
  const r = runMechanicalPass({
    question: "Did the French army cross the Niemen?",
    organs: baseOrgans,
    context: { passages, voids: [] },
  });
  const con = r.cells.find((c) => c.cell === "CON·Figure");
  assert.ok(con.close, "inflectional paraphrase closed mechanically");
  assert.match(con.close.text, /claim\(s\) the material states/);
  assert.ok(con.close.addresses.includes("pg2600.txt#1637123-1637402"), "the close carries the byte address");
  assert.equal(con.close.why, "inflectional paraphrase closed through the morphology prior");
});

test("LEXICAL synonymy stays open — the sameAct wall is real, and the close is a FACT, not the answer", () => {
  // "retreated" vs material's "crossed": not the same act. CON·Figure closes
  // with what the material DOES state (addressed), but that close does not
  // answer "retreat" — the residual stays, and the mouth must compose.
  const r = runMechanicalPass({
    question: "Did the French army retreat from the Niemen?",
    organs: baseOrgans,
    context: { passages, voids: [] },
  });
  const con = r.cells.find((c) => c.cell === "CON·Figure");
  assert.ok(con.close, "the material's bound claim is a fact the mouth receives");
  assert.match(con.close.text, /crossed/, "it states what the material says, not what was asked");
  assert.ok(r.residual, "the residual stays — a different act was never covered");
  assert.ok(r.residual.closes.length >= 1, "the close rides with the residual as the material's own fact");
});

test("a bound claim about the asked-about closes CON·Figure with its address", () => {
  const r = runMechanicalPass({
    question: "What did the French army cross?",
    organs: baseOrgans,
    context: { passages, voids: [] },
  });
  const con = r.cells.find((c) => c.cell === "CON·Figure");
  assert.ok(con.close);
  assert.ok(con.close.addresses.includes("pg2600.txt#1637123-1637402"));
});

test("the residual names the boundary — the first typed refusal — and every close has an address or a reason", () => {
  const r = runMechanicalPass({
    question: "What did the French army cross, and why does it matter?",
    organs: baseOrgans,
    context: { passages, voids: [] },
  });
  assert.ok(r.residual, "a prose tail keeps the turn the mouth's");
  assert.ok(r.residual.why.includes("exhausted"), "the residual says the pass exhausted");
  assert.ok(r.residual.closes.length >= 1, "the closes ride with the residual");
  for (const c of r.cells.filter((x) => x.close)) {
    if (!c.close.addresses.length) assert.ok(c.close.why, "an addressless close must say why");
  }
});

test("every cell is walked in chain order, and a cell never guesses — close or typed refusal", () => {
  const r = runMechanicalPass({
    question: "What did the French army cross?",
    organs: baseOrgans,
    context: { passages, voids: [] },
  });
  const order = r.cells.map((c) => c.cell);
  assert.deepEqual(order, ["NUL·Ground", "SIG·Ground", "SIG·Figure", "INS·Figure", "SEG·Figure", "CON·Figure", "SYN·Figure", "DEF·Figure", "EVA·Figure", "REC·Figure"]);
  for (const c of r.cells) {
    assert.ok(c.close || c.refusal, `${c.cell} must close or refuse, never hang`);
    if (c.close) assert.equal(c.refusal, null);
    if (c.refusal) assert.equal(c.close, null);
  }
});

test("an absent organ is a typed refusal, never a silent skip that looks like a close", () => {
  const r = runMechanicalPass({
    question: "What did the French army cross?",
    organs: { read },
    context: { passages, voids: [] },
  });
  for (const c of r.cells) {
    if (c.refusal) assert.ok(c.refusal.type.startsWith("no_") || c.refusal.type.startsWith("organ_"), c.refusal.type);
  }
});