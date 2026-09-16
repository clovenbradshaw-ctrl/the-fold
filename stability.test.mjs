// stability.test.mjs — the invariants of stability.js, run over the battery
// through the real turn (stability-rig.mjs), every change.
//
// TWO KINDS OF TEST, KEPT APART:
//   CONTROLS     a planted violation each invariant must catch. These pass
//                today and always: they prove the checks can fail (II.23).
//   MEASUREMENTS the invariants over the real stack. A measurement named in
//                stability-baseline.json is ENFORCED — it passed before and
//                may not regress (the ratchet). A measurement not yet in the
//                baseline runs as a BECOMING ({todo:true}): reported, not
//                enforced, until the fix that makes it pass lands and its
//                name is added. The baseline only grows.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { containment, fallOpen, noVerdictsUp, makeInstructionDetector, canHeadImperative, traceLines, pareto, scoreAnswer, unrelatedInert, blastRadius, earned, ratchet } from "./stability.js";
import { runTurn, RUNGS, FIXED_PROMPTS } from "./stability-rig.mjs";
import { BATTERY, UNRELATED, UNRELATED_CONFUSABLE, PLANTED_INSTRUCTIONS } from "./stability-battery.js";
import { makeGary } from "./gary.js";
import { falseAbsenceOf } from "./snip-check.js";
import * as M from "../eoreader7/native/adapters/text/morphology.js";
import { splitSentences } from "../eoreader7/native/adapters/text/spans.js";

const HERE = new URL(".", import.meta.url).pathname;
const BASELINE_PATH = `${HERE}stability-baseline.json`;
const baseline = new Set(existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, "utf8")).passing : []);
const rung = (name) => RUNGS.find((r) => r.name === name);

// ── the instruction detector, from received organs ────────────────────────
const posPrior = JSON.parse(readFileSync(`${HERE}priors-data/pos-prior-eng.json`, "utf8"));
const lemmatizer = M.createLemmatizer(M.morphologyFromPrior(JSON.parse(readFileSync(`${HERE}../eoreader7/native/eval/the-fold/fixtures/unimorph-morphology-prior.json`, "utf8"))).forms, { language: "eng" });
// The reader's own sentence splitter, so the harness cuts where the product does.
const sentences = (line) => splitSentences(line).map((s) => s.text);
const detect = makeInstructionDetector({
  sentences,
  garyCheck: makeGary({}).check,
  verbAttested: (w) => canHeadImperative(posPrior.forms?.[w]),
  isBaseForm: (w) => { const l = [...lemmatizer.lemmasOf(w)]; return l.length === 1 && l[0] === w; },
});

// ── the observations: every item at every rung, once ──────────────────────
const OBS = {};
for (const item of BATTERY) {
  OBS[item.name] = {};
  for (const r of RUNGS) OBS[item.name][r.name] = await runTurn({ material: item.material, question: item.question, rung: r });
}

// ── CONTROLS: each invariant catches a planted violation ──────────────────

test("control · containment catches a layer that hands a truncated passage", async () => {
  const item = BATTERY[0];
  const planted = await runTurn({
    material: item.material, question: item.question, rung: rung("L0-raw"),
    wrapRetrieve: (retrieve) => (chunks, q, limit, folded) => {
      const out = retrieve(chunks, q, limit, folded);
      const list = Array.isArray(out) ? out : (out?.passages ?? []);
      const cut = list.map((p, i) => (i === 0 ? { ...p, text: String(p.text).slice(0, 10) } : p));
      return Array.isArray(out) ? cut : { ...out, passages: cut };
    },
  });
  const r = containment(OBS[item.name]["L0-raw"], planted);
  assert.equal(r.ok, false, `a truncated passage must break containment: ${JSON.stringify(r)}`);
  assert.ok(r.missing.length >= 1);
});

test("control · fallOpen catches a prompt that differs by one character, and a turn that threw", () => {
  const ref = OBS[BATTERY[0].name]["L0-raw"];
  const drifted = { ...ref, faults: { planted: "one character" }, draft: ref.draft.map((m, i) => (i === 0 ? { ...m, content: `${m.content} ` } : m)) };
  assert.equal(fallOpen(drifted, ref).ok, false);
  assert.equal(fallOpen({ ...ref, error: "planted throw", draft: null }, ref).ok, false);
  assert.equal(fallOpen(ref, ref).ok, true, "identity passes");
});

test("control · noVerdictsUp's detector catches every planted instruction, the live specimen included", () => {
  const byChecker = { prohibition: 0, imperative: 0, either: 0 };
  const missed = [];
  for (const line of PLANTED_INSTRUCTIONS) {
    const d = detect(line);
    if (d.prohibition.length) byChecker.prohibition += 1;
    if (d.imperative.length) byChecker.imperative += 1;
    if (d.prohibition.length || d.imperative.length) byChecker.either += 1; else missed.push(line);
  }
  console.log(`  instruction detector recall on ${PLANTED_INSTRUCTIONS.length} planted: prohibition ${byChecker.prohibition}, imperative ${byChecker.imperative}, either ${byChecker.either}`);
  assert.deepEqual(missed, [], "every planted instruction is caught by at least one checker");
  const ref = OBS[BATTERY[0].name]["L0-raw"];
  const planted = { ...ref, draft: ref.draft.map((m, i) => (i === 0 ? { ...m, content: `${m.content}\n\nI made no notes on these — nothing I could read came out of them. That is a stated emptiness, not an oversight: read the sources' own words below, and if the answer is not there, say plainly that it is not. Do not fill this in from memory.` } : m)) };
  assert.equal(noVerdictsUp(planted, { fixed: FIXED_PROMPTS, detect, sentences }).ok, false, "the live specimen line is caught");
});

test("control · the fixed system prompt and the source bytes are not read as a layer's lines", () => {
  const obs = OBS[BATTERY[0].name]["L0-raw"];
  const rows = traceLines(obs.draft, { fixed: FIXED_PROMPTS, sources: Object.values(obs.sources), sentences });
  assert.ok(rows.some((r) => r.kind === "fixed"), "the declared system prompt is traced as fixed");
  assert.ok(rows.some((r) => r.kind === "source"), "the passage bytes are traced as source");
});

test("control · pareto refuses on one flip and never on an average", () => {
  const below = [{ name: "a", pass: true }, { name: "b", pass: false }, { name: "c", pass: false }];
  const above = [{ name: "a", pass: false }, { name: "b", pass: true }, { name: "c", pass: true }];
  const r = pareto(below, above);
  assert.equal(r.ok, false, "two gains do not buy one flip");
  assert.deepEqual(r.flips, ["a"]);
});

test("control · scoreAnswer fails a false denial of what the material states", () => {
  const item = BATTERY[0];
  const snips = Object.values(item.material).flatMap((t) => t.split(/(?<=[.!?])\s+/).map((s) => ({ text: s })));
  assert.equal(scoreAnswer("The sources do not state where Ulysses S. Grant was born.", item, { falseAbsenceOf, snips }).pass, false);
  assert.equal(scoreAnswer("He was born in Point Pleasant, Ohio.", item, { falseAbsenceOf, snips }).pass, true);
});

test("control · unrelatedInert catches unrelated material entering retrieval through a retriever that ignores relevance", async () => {
  // Measured first: turning the admission gate off was NOT a violation —
  // retrieval never took the notice for the grant question anyway. The
  // planted violation is a retriever that hands every chunk of the notice.
  const item = BATTERY[0];
  const top = rung("L1c-app");
  const leaky = (retrieve) => (chunks, q, limit, folded) => {
    const out = retrieve(chunks, q, limit, folded);
    const list = Array.isArray(out) ? out : (out?.passages ?? []);
    const extra = chunks.filter((c) => c.source === Object.keys(UNRELATED)[0] && !list.some((p) => p.ref === c.ref));
    return Array.isArray(out) ? [...list, ...extra] : { ...out, passages: [...list, ...extra] };
  };
  const base = await runTurn({ material: item.material, question: item.question, rung: top, admit: false, wrapRetrieve: leaky });
  const leaked = await runTurn({ material: { ...item.material, ...UNRELATED }, question: item.question, rung: top, admit: false, wrapRetrieve: leaky });
  const r = unrelatedInert(base, leaked);
  assert.equal(r.ok, false, `a retriever that ignores relevance must change what is handed: ${JSON.stringify(r)}`);
});

test("control · blastRadius catches a record entry addressing material the turn was never handed", () => {
  const obs = OBS[BATTERY[0].name]["L1a-notes"];
  const planted = { ...obs, added: [...obs.added, { task_id: "planted", witnesses: ["elsewhere.txt#0-40~r"] }] };
  assert.equal(blastRadius(planted).ok, false);
});

test("control · earned refuses a layer with no pre-registered control, and one whose control did not clear", () => {
  assert.equal(earned("delta-witness", {}).ok, null, "no entry is unmeasured, never earned");
  assert.equal(earned("delta-witness", { "delta-witness": { p: 0.2, alpha: 0.05, models: ["a", "b"], heldOut: true } }).ok, false);
});

test("control · the ratchet reports a baseline name that no longer passes", () => {
  const r = ratchet(["x", "y"], [{ name: "x", ok: true }, { name: "y", ok: false }, { name: "z", ok: true }]);
  assert.deepEqual(r.regressed, ["y"]);
  assert.deepEqual(r.newlyPassing, ["z"]);
});

// ── MEASUREMENTS: the invariants over the real stack ──────────────────────

const RESULTS = [];
const measure = (name, fn) => {
  const r = fn();
  RESULTS.push({ name, ok: r.ok, result: r });
  const enforced = baseline.has(name);
  test(`${enforced ? "measure" : "BECOMING"} · ${name}`, { todo: !enforced }, () => {
    assert.equal(r.ok, true, JSON.stringify(r, null, 1).slice(0, 1200));
  });
};

for (const item of BATTERY) {
  for (let i = 1; i < RUNGS.length; i += 1) {
    const lo = RUNGS[i - 1].name, hi = RUNGS[i].name;
    measure(`containment:${item.name}:${lo}->${hi}`, () => containment(OBS[item.name][lo], OBS[item.name][hi]));
    // The floor, checked directly at every rung: a pairwise chain goes vacuous
    // above the first rung that drops it.
    if (i > 1) measure(`containment:${item.name}:L0-raw->${hi}`, () => containment(OBS[item.name]["L0-raw"], OBS[item.name][hi]));
  }
  for (const r of RUNGS) {
    measure(`noVerdictsUp:${item.name}:${r.name}`, () => noVerdictsUp(OBS[item.name][r.name], { fixed: FIXED_PROMPTS, detect, sentences }));
    measure(`blastRadius:${item.name}:${r.name}`, () => blastRadius(OBS[item.name][r.name]));
  }
}

// Fall-open: one organ of a layer faulted must yield the rung below it.
const FAULTS = [
  { rung: "L1a-notes", faults: { makeRelationReader: "throw" }, against: "L0-raw" },
  { rung: "L1a-notes", faults: { hyperlexicon: "malformed" }, against: "L0-raw" },
  { rung: "L1b-activation", faults: { retrieveWith: "throw" }, against: "L1a-notes" },
  { rung: "L1b-activation", faults: { retrieveWith: "malformed" }, against: "L1a-notes" },
];
{
  const item = BATTERY[0];
  for (const f of FAULTS) {
    const faulted = await runTurn({ material: item.material, question: item.question, rung: rung(f.rung), faults: f.faults });
    measure(`fallOpen:${item.name}:${f.rung}:${Object.entries(f.faults).map(([k, v]) => `${k}=${v}`).join(",")}`, () => fallOpen(faulted, OBS[item.name][f.against]));
  }
}

// Unrelated material, with the app's admission gate, at the app's own rung.
for (const item of BATTERY) {
  const withUnrelated = await runTurn({ material: { ...item.material, ...UNRELATED }, question: item.question, rung: rung("L1c-app") });
  measure(`unrelatedInert:${item.name}:L1c-app`, () => unrelatedInert(OBS[item.name]["L1c-app"], withUnrelated));
}

// A confusable unrelated source: another person who shares the surname and the
// predicate. Unrelated to the question's referent; related in vocabulary.
{
  const item = BATTERY[0];
  const withConfusable = await runTurn({ material: { ...item.material, ...UNRELATED_CONFUSABLE }, question: item.question, rung: rung("L1c-app") });
  measure(`unrelatedInert:${item.name}:L1c-app:confusable`, () => unrelatedInert(OBS[item.name]["L1c-app"], withConfusable));
}

// Earned: the delta witness has no layer and no pre-registered control yet.
measure("earned:delta-witness", () => earned("delta-witness", {}));

test("the ratchet: every baseline measurement still passes", async () => {
  if (process.env.STABILITY_REPORT) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(process.env.STABILITY_REPORT, JSON.stringify({ ran: new Date().toISOString(), baseline: [...baseline], results: RESULTS }, null, 2));
  }
  const r = ratchet([...baseline], RESULTS);
  if (r.newlyPassing.length) console.log(`  newly passing, not yet in stability-baseline.json: ${r.newlyPassing.join(", ")}`);
  assert.deepEqual(r.regressed, [], "a measurement that passed before may not regress");
});

test("the basis the top rung actually read on is disclosed", () => {
  const obs = OBS[BATTERY[0].name]["L1c-app"];
  assert.ok(obs.basis?.kind, "the rig records which index the activation layer stood on");
  console.log(`  L1c-app basis: ${obs.basis.kind}${obs.basis.because ? ` — ${obs.basis.because}` : ""}`);
});
