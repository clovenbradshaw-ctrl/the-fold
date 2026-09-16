// stability-mouth.mjs — invariant 4 (pareto), the one stability invariant that
// needs a real mouth. Node driver; needs Ollama. Writes stability-mouth-results.json.
//
//   node stability-mouth.mjs [--models gemma2:2b,llama3.2:latest] [--seed 7]
//
// For every battery question, under every declared model, the real turn runs at
// the floor (L0-raw) and at the app's own rung (L1c-app), and once more at a
// PLANTED HARMFUL rung that removes every passage carrying a gold fact. Answers
// are scored mechanically (stability.js::scoreAnswer: gold present, no false
// denial of what the material states). Adding a layer may not flip any single
// question from pass to fail; the planted rung must flip at least one, or the
// battery cannot detect a flip and the invariant is reported unmeasured.
//
// Disclosed: a question whose answer the model already knows (Grant's
// birthplace, 1945) can pass with no material at all, which hides a flip on
// that question. The battery carries an invented item (Northgate) for exactly
// this reason.

import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { runTurn, RUNGS } from "./stability-rig.mjs";
import { BATTERY } from "./stability-battery.js";
import { pareto, scoreAnswer } from "./stability.js";
import { falseAbsenceOf } from "./snip-check.js";

const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 && args[i + 1] != null ? args[i + 1] : dflt; };
const MODELS = String(flag("models", "gemma2:2b,llama3.2:latest")).split(",").filter(Boolean);
const SEED = Number(flag("seed", 7));
const OLLAMA = process.env.OLLAMA ?? "http://127.0.0.1:11434";
const HERE = new URL(".", import.meta.url).pathname;

const mouthFor = (model) => async (messages, opts = {}) => {
  const body = { model, stream: false, messages, options: { temperature: 0, seed: SEED, num_predict: opts.maxTokens ?? 512 } };
  if (opts.json) body.format = opts.json === true ? "json" : opts.json;
  if (opts.format) body.format = opts.format;
  const res = await fetch(`${OLLAMA}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(300000) });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  return (await res.json()).message?.content ?? "";
};

const rung = (name) => RUNGS.find((r) => r.name === name);
// The whole material's paragraphs as the snips a false denial is checked against.
const snipsOf = (item) => Object.values(item.material).flatMap((t) => t.split(/\n\s*\n/).map((p) => ({ text: p })));
// The planted harmful layer: every passage carrying a gold fact is withheld.
const withholdGold = (item) => (retrieve) => (chunks, q, limit, folded) => {
  const keep = (p) => !(item.gold ?? []).some((g) => String(p.text ?? "").includes(g));
  const out = retrieve(chunks, q, limit, folded);
  return Array.isArray(out) ? out.filter(keep) : { ...out, passages: (out?.passages ?? []).filter(keep) };
};

const results = { ran: new Date().toISOString(), seed: SEED, temperature: 0, models: MODELS, battery: createHash("sha256").update(JSON.stringify(BATTERY)).digest("hex").slice(0, 16), runs: {}, pareto: {}, control: {} };

for (const model of MODELS) {
  const mouth = mouthFor(model);
  const scores = { "L0-raw": [], "L1c-app": [], "L0-harmful": [] };
  results.runs[model] = [];
  for (const item of BATTERY) {
    for (const [label, opts] of [
      ["L0-raw", { rung: rung("L0-raw") }],
      ["L1c-app", { rung: rung("L1c-app") }],
      ["L0-harmful", { rung: rung("L0-raw"), wrapRetrieve: withholdGold(item) }],
    ]) {
      const t0 = Date.now();
      const obs = await runTurn({ material: item.material, question: item.question, mouth, ...opts });
      const score = obs.error ? { name: item.name, pass: null, error: obs.error } : scoreAnswer(obs.output, item, { falseAbsenceOf, snips: snipsOf(item) });
      scores[label].push(score);
      results.runs[model].push({ item: item.name, rung: label, ms: Date.now() - t0, output: obs.output, error: obs.error, score });
      console.log(`${model.padEnd(18)} ${item.name.padEnd(16)} ${label.padEnd(11)} ${score.pass === true ? "pass" : score.pass === false ? "FAIL" : "error"}  ${String(obs.output ?? obs.error ?? "").replace(/\s+/g, " ").slice(0, 90)}`);
    }
  }
  results.pareto[model] = pareto(scores["L0-raw"], scores["L1c-app"]);
  results.control[model] = pareto(scores["L0-raw"], scores["L0-harmful"]);
}

const controlFailed = MODELS.some((m) => results.control[m].ok === false);
results.verdict = {
  controlCanFail: controlFailed,
  invariant: controlFailed ? (MODELS.every((m) => results.pareto[m].ok === true) ? "holds" : "refuted") : "unmeasured — the planted harmful layer flipped nothing, so this battery cannot detect a flip",
  flips: Object.fromEntries(MODELS.map((m) => [m, results.pareto[m].flips])),
  gains: Object.fromEntries(MODELS.map((m) => [m, results.pareto[m].gains])),
};
writeFileSync(`${HERE}stability-mouth-results.json`, JSON.stringify(results, null, 2));
console.log(`\ncontrol can fail: ${controlFailed}   invariant: ${results.verdict.invariant}`);
console.log(`flips (L0-raw → L1c-app): ${JSON.stringify(results.verdict.flips)}   gains: ${JSON.stringify(results.verdict.gains)}`);
