// mechanical-confidence-recall.mjs — real, live evaluation of the
// "mechanical confidence" prompt-trim (holon.js, P230, 2026-09-15): does
// dropping the raw verbatim digest whenever `factBlock` covers every
// content word of the question cost RECALL on a multi-fact question, with
// real attached material and a real local model (gemma2:2b) — no fixtures
// standing in for either. Re-run this file directly to reproduce the
// numbers in `results/mechanical-confidence-recall-RESULTS.md`; pass an
// integer to change trials-per-scenario (default 25 — 4 scenarios x 25 =
// 100, the run this file's own results doc reports).
import { writeFileSync } from "node:fs";
import { runHolonicTask } from "../holon.js";
import { chunkSource } from "../source.js";
import { makeRelationReader } from "../hypergraph.js";
import { splitSentences } from "../../eoreader7/native/adapters/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "../../eoreader7/native/adapters/text/surfaces.js";
import { discoverRelationVocab, extractRelations } from "../../eoreader7/native/adapters/text/relations.js";
import { tokenize } from "../../eoreader7/native/adapters/text/material.js";

const MODEL = "gemma2:2b";

async function callOllama(messages) {
  const res = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, stream: false, options: { temperature: 0 } }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const json = await res.json();
  return json.message?.content ?? "";
}

const relationOrgans = { splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize };

// Scenarios: attached "sources" (real pasted-text path — chunkSource is the
// exact function addSource() calls in the live app), a task, and a checker
// over the FINAL shipped text. `minFacts` counts how many of several
// required facts a multi-fact scenario must ALL be present for — this is
// the actual RECALL test the user asked for: did trimming the raw digest
// down to the mechanical fact-block cost any of several distinct facts a
// question needs.
const SCENARIOS = [
  {
    name: "single-fact",
    corpus: "France is a country in Western Europe. Paris is the capital of France. Paris sits on the Seine river.",
    task: "What is the capital of France?",
    checks: [(t) => /paris/i.test(t)],
  },
  {
    name: "two-fact recall",
    corpus: "The Riverside Museum opens at 9am and closes at 5pm on weekdays. Admission costs $12 for adults and $6 for children. The museum is closed on Mondays. It is located on Elm Street.",
    task: "What time does the Riverside Museum open, and how much does admission cost for adults?",
    checks: [(t) => /9\s*am|9:00/i.test(t), (t) => /\$?\s?12\b/.test(t)],
  },
  {
    name: "three-fact recall",
    corpus: "The Willowbrook Public Library was founded in 1932. It holds over 80,000 books. The head librarian is Dana Ferris. The library is open seven days a week.",
    task: "When was the Willowbrook Public Library founded, how many books does it hold, and who is the head librarian?",
    checks: [(t) => /1932/.test(t), (t) => /80,?000/.test(t), (t) => /dana\s+ferris/i.test(t)],
  },
  {
    name: "genuine-absence (no fabrication)",
    corpus: "The Cobalt Bridge was completed in 1998 and spans the Miro River. It carries four lanes of traffic.",
    task: "Who designed the Cobalt Bridge?",
    // Nothing in the material names a designer — the honest answer says so;
    // a fabricated name is the failure this scenario exists to catch.
    checks: [(t) => /don'?t know|not (?:stated|mentioned|say|specif)|no (?:mention|information)|isn'?t (?:stated|mentioned)|does not (?:say|state|mention)|not (?:in|given)|unclear|unknown/i.test(t)],
  },
];

const TRIALS_PER_SCENARIO = Number(process.argv[2] ?? 25);

const relationsFor = makeRelationReader(relationOrgans);

const results = [];
let total = 0;

for (const scenario of SCENARIOS) {
  const chunks = chunkSource("attachment.txt", scenario.corpus);
  let scenarioPass = 0;
  for (let i = 0; i < TRIALS_PER_SCENARIO; i++) {
    total++;
    let output = "";
    let error = null;
    let trimmed = null;
    try {
      const result = await runHolonicTask({
        task: scenario.task,
        chunks,
        call: callOllama,
        planMode: "flat",
        makeRelationReader: relationsFor,
      });
      output = String(result.output ?? "");
    } catch (e) {
      error = e?.message ?? String(e);
    }
    const passedChecks = error ? [] : scenario.checks.map((c) => { try { return Boolean(c(output)); } catch { return false; } });
    const ok = !error && passedChecks.every(Boolean);
    if (ok) scenarioPass++;
    results.push({ scenario: scenario.name, trial: i + 1, ok, output, error, checks: passedChecks });
    process.stdout.write(`${scenario.name} #${i + 1}/${TRIALS_PER_SCENARIO}: ${error ? `ERROR ${error}` : ok ? "PASS" : "FAIL"}${ok ? "" : ` — "${output.slice(0, 160).replace(/\n/g, " ")}"`}\n`);
  }
  console.log(`  -> ${scenario.name}: ${scenarioPass}/${TRIALS_PER_SCENARIO}`);
}

const pass = results.filter((r) => r.ok).length;
console.log(`\nTOTAL: ${pass}/${total} passed (${((pass / total) * 100).toFixed(1)}%)`);

writeFileSync(
  new URL("./results/mechanical-confidence-recall-run.json", import.meta.url),
  JSON.stringify({ total, pass, results }, null, 2),
);
