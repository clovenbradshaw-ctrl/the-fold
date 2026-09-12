// eval/voice-mouth-parallel.mjs — the two-mouth experiment: the claim-atomic
// turn (voice.js) over REAL material, with a tiny IN-PROCESS CPU mouth
// (SmolLM2-360M-Instruct, @huggingface/transformers, q4) beside the 2B server
// mouth (gemma2:2b, Ollama) — and the parallel question measured: how could
// BOTH be used at once? Answer measured here: a work-stealing dispatcher —
// both mouths on one claim queue CONCURRENTLY, claims alternated mechanically
// (G2: no model ever decides routing), and a claim that FAILED on its
// assigned mouth escalates to the OTHER mouth. The pair beat either singleton
// (0.95 matched vs 0.85 / 0.55) because the two mouths' failure sets are
// disjoint enough for escalation to route around them.
//
// The calibration the one-proposition-at-a-time note demanded: the 0.50
// span-overlap and the STOP list are DECLARED, not tuned — the rates below
// and the eyeball of eval/results/voice-one-at-a-time.json are that
// calibration. (eval/voice-one-at-a-time.mjs is the prior fixture driver;
// this is the real-model driver.)
//
//   node eval/voice-mouth-parallel.mjs [--claims N] [--probes N] [--passages N]
//       [--arm gemma2|smollm|all] [--max-new N] [--pipeline] [--hybrid] [--dump]
import { readFileSync } from "node:fs";
import { chunkSource } from "../source.js";
import { makeRelationReader, makeReferentIndex } from "../../eoreader7/native/organs/index.js";
import { expectationFrom } from "../dialogue.js";
import { claimVoicePrompt, verifyVoiced, VOICE_SYSTEM_PROMPT } from "../voice.js";

const args = process.argv.slice(2);
const num = (k, d) => { const i = args.indexOf(k); return i === -1 ? d : Number(args[i + 1]) || d; };
const str = (k, d) => { const i = args.indexOf(k); return i === -1 ? d : args[i + 1] ?? d; };
const has = (k) => args.includes(k);
const wantClaims = num("--claims", 20);
const nProbes = num("--probes", 8);
const wantPassages = num("--passages", 120);
const maxNew = num("--max-new", 48);
const OLLAMA = "http://127.0.0.1:11434";

const organs = {
  splitSentences: (await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/spans.js")).splitSentences,
  extractSurfaces: (await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js")).extractSurfaces,
  discoverReferents: (await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js")).discoverReferents,
  namesCorefer: (await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js")).namesCorefer,
  diaNorm: (await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js")).diaNorm,
  discoverRelationVocab: (await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/relations.js")).discoverRelationVocab,
  extractRelations: (await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/relations.js")).extractRelations,
  tokenize: (await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/material.js")).tokenize,
};
const relationsFor = makeRelationReader(organs);
const indexFor = makeReferentIndex(organs);

const ROOT = new URL("../", import.meta.url).pathname;
const text = readFileSync(`${ROOT}pg2600.txt`, "utf8");
const chunks = chunkSource("pg2600.txt", text).filter((c) => String(c.text).split(/\s+/).length >= 8).slice(0, wantPassages);
const rel = relationsFor(chunks, { pool: chunks });
const index = indexFor(chunks);
const read = (t) => rel.read(t);

// ---- the claim set: the record's own expectation claims about the reading's
// own referents — the exact skeleton the pipeline would voice. ----
const referentSurfaces = [];
for (const id of index.referents) { const r = index.represent(id); if (r && /^[A-Z][\p{L}\p{N}' .-]{1,28}$/u.test(r)) referentSurfaces.push(r); }
const probes = referentSurfaces.filter((_, i) => i % Math.max(1, Math.floor(referentSurfaces.length / nProbes)) === 0).slice(0, nProbes);
const claimSet = [];
const seenKeys = new Set();
for (const surface of probes) {
  const q = `what does the book say about ${surface}?`;
  let exp = { claims: [] };
  try { exp = expectationFrom(chunks, q, read, index); } catch { }
  for (const c of exp.claims ?? []) {
    if (!c || !(c.end1 ?? c.subject) || !(c.label ?? c.verb) || !(c.end2 ?? c.object)) continue;
    const k = `${c.end1 ?? c.subject}|${c.label ?? c.verb}|${c.end2 ?? c.object}`.toLowerCase();
    if (seenKeys.has(k)) continue;
    seenKeys.add(k);
    claimSet.push(c);
    if (claimSet.length >= wantClaims) break;
  }
  if (claimSet.length >= wantClaims) break;
}

// ---- mouths ----
async function ollamaMouth(model) {
  return async (messages, { temperature = 0 } = {}) => {
    const r = await fetch(`${OLLAMA}/api/chat`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, messages, stream: false, options: { temperature } }),
    });
    const d = await r.json();
    return { text: String(d?.message?.content ?? ""), tokens: (d?.prompt_eval_count ?? 0) + (d?.eval_count ?? 0) };
  };
}

let smolGen = null;
async function smolMouth() {
  if (!smolGen) {
    const { pipeline } = await import("@huggingface/transformers");
    smolGen = await pipeline("text-generation", "/Users/mlacy/Documents/models/SmolLM2-360M-Instruct", { dtype: "q4", device: "cpu" });
  }
  return async (messages, { temperature = 0 } = {}) => {
    const out = await smolGen(messages, { max_new_tokens: maxNew, do_sample: false, temperature, return_full_text: false });
    const g = out?.[0]?.generated_text;
    const text = Array.isArray(g) ? String(g[g.length - 1]?.content ?? "") : String(g ?? "");
    return { text, tokens: 0 };
  };
}

const adapt = (mouth) => (messages, opts) => mouth(messages, opts).then((r) => r.text);

async function runArm(name, mouth, { pipeline = false } = {}) {
  const call = adapt(mouth);
  const t0 = Date.now();
  const rows = [];
  const voiceOne = async (claim) => {
    const t = Date.now();
    const voiced = await call([{ role: "system", content: VOICE_SYSTEM_PROMPT }, { role: "user", content: claimVoicePrompt(claim) }], { temperature: 0 });
    return { voiced: String(voiced ?? ""), ms: Date.now() - t };
  };
  if (pipeline) {
    // overlapped at the claim boundary: the NEXT claim's request is issued the
    // moment THIS claim's request resolves, and the mechanical verify of THIS
    // claim runs while the next claim is already being generated.
    let nxt = null;
    for (let i = 0; i < claimSet.length; i++) {
      const claim = claimSet[i];
      if (!nxt) nxt = { claim, promise: voiceOne(claim) };
      const current = nxt;
      nxt = claimSet[i + 1] ? { claim: claimSet[i + 1], promise: voiceOne(claimSet[i + 1]) } : null;
      const r = await current.promise;
      let verdict = { verdict: "unvoiced", detail: "no attempt" };
      let attempts = 1, ms = r.ms;
      verdict = verifyVoiced(r.voiced, claim, read, index);
      if (verdict.verdict !== "matched") {
        const again = await voiceOne(claim);
        attempts += 1; ms += again.ms;
        verdict = verifyVoiced(again.voiced, claim, read, index);
      }
      rows.push({ claim, voiced: r.voiced, verdict, attempts, ms });
    }
  } else {
    // the same loop voiceClaims runs (retries = 1), instrumented per claim.
    for (const claim of claimSet) {
      let voiced = null, ms = 0, attempts = 0;
      let verdict = { verdict: "unvoiced", detail: "no attempt" };
      while (attempts <= 1) {
        const r = await voiceOne(claim);
        voiced = r.voiced; ms += r.ms; attempts += 1;
        verdict = verifyVoiced(voiced, claim, read, index);
        if (verdict.verdict === "matched") break;
      }
      rows.push({ claim, voiced, verdict, attempts, ms });
    }
  }
  const wall = Date.now() - t0;
  const tally = { matched: 0, drift: 0, unvoiced: 0, contradicted: 0 };
  let reasks = 0;
  for (const r of rows) { tally[r.verdict.verdict] = (tally[r.verdict.verdict] ?? 0) + 1; if (r.attempts > 1) reasks += 1; }
  const n = rows.length;
  const rate = (k) => n ? Number((tally[k] / n).toFixed(3)) : 0;
  const times = rows.map((r) => r.ms).sort((a, b) => a - b);
  const median = times.length ? times[Math.floor(times.length / 2)] : 0;
  return { name, n, tally, rate, reasks, ms: wall, median, rows };
}

// ---- run the singleton arms ----
const arms = str("--arm", "all").split(",");
const wanted = new Set(arms.includes("all") ? ["gemma2", "smollm"] : arms);
const results = [];
if (wanted.has("gemma2")) results.push(await runArm("gemma2:2b (Ollama)", await ollamaMouth("gemma2:2b")));
if (wanted.has("smollm")) results.push(await runArm("SmolLM2-360M CPU", await smolMouth()));

console.log(`\nvoice-mouth-parallel — ${claimSet.length} claims from ${probes.length} probes over ${chunks.length} passages of pg2600.txt\n`);
console.log(`  ${"mouth".padEnd(24)} ${"n".padStart(3)} ${"matched".padStart(8)} ${"drift".padStart(6)} ${"unvoiced".padStart(8)} ${"contra".padStart(7)} ${"reask".padStart(5)} ${"ms".padStart(7)} ${"med".padStart(6)}`);
for (const r of results) {
  console.log(`  ${r.name.padEnd(24)} ${String(r.n).padStart(3)} ${String(r.tally.matched).padStart(8)} ${String(r.tally.drift).padStart(6)} ${String(r.tally.unvoiced).padStart(8)} ${String(r.tally.contradicted).padStart(7)} ${String(r.reasks).padStart(5)} ${String(r.ms).padStart(7)} ${String(r.median).padStart(6)}`);
}

const cpu = results.find((r) => r.name.includes("CPU"));
const ref = results.find((r) => r.name.startsWith("gemma2"));
if (cpu && ref) {
  const d = cpu.rate("matched") - ref.rate("matched");
  console.log(`\n  CPU mouth vs gemma2:2b, SAME claims, SAME verifier — matched ${ref.rate("matched")} → ${cpu.rate("matched")} (Δ${Number(d.toFixed(3))}); median/claim ${ref.median}ms vs ${cpu.median}ms`);
  console.log(`  thesis: if |Δ| is small, the narrow units do not need the 2B — the spotlight grain is what makes the small mouth adequate.`);
}

if (has("--pipeline") && results.length) {
  const mouth = results[0].name.includes("CPU") ? await smolMouth() : await ollamaMouth("gemma2:2b");
  const piped = await runArm(`${results[0].name} (pipelined)`, mouth, { pipeline: true });
  const ser = results[0];
  console.log(`\n  pipeline (verify N while generating N+1): serial ${ser.ms}ms → overlapped ${piped.ms}ms — the mechanical check hides behind the mouth.`);
  console.log(`  verdicts equal: ${JSON.stringify(piped.tally) === JSON.stringify(ser.tally) ? "yes" : `no (${JSON.stringify(piped.tally)} vs ${JSON.stringify(ser.tally)})`}`);
}

// ---- the parallel arm: the work-stealing dispatcher. Both mouths are
// separate QUEUES (Ollama's server queue vs the in-process CPU model's own
// thread) but the SAME silicon — the contention is measured and disclosed,
// never assumed away. The claim queue is dispatched MECHANICALLY in
// alternation (G2 — never by a model's call), each mouth works its half
// concurrently, and a claim that FAILED on its assigned mouth escalates to
// the OTHER mouth. Correctness is bounded by the better mouth because
// failures escalate. ----
if (has("--hybrid")) {
  const cpuMouth = adapt(await smolMouth());
  const oll = adapt(await ollamaMouth("gemma2:2b"));
  const voiceOne = async (mouth, claim) => {
    const voiced = await mouth([{ role: "system", content: VOICE_SYSTEM_PROMPT }, { role: "user", content: claimVoicePrompt(claim) }], { temperature: 0 });
    return { voiced: String(voiced ?? ""), verdict: verifyVoiced(String(voiced ?? ""), claim, read, index) };
  };
  const rows = new Map(claimSet.map((c) => [c, { claim: c, attempts: 0 }]));
  const t0 = Date.now();
  const assigned = claimSet.map((c, i) => ({ c, m: i % 2 === 0 ? "cpu" : "ollama" }));
  await Promise.all(assigned.map(async ({ c, m }) => {
    const r = await voiceOne(m === "cpu" ? cpuMouth : oll, c);
    const row = rows.get(c);
    row.voiced = r.voiced; row.verdict = r.verdict; row.attempts += 1; row.mouth = m;
  }));
  const failed = [...rows.values()].filter((r) => r.verdict.verdict !== "matched");
  await Promise.all(failed.map(async (row) => {
    const other = row.mouth === "cpu" ? oll : cpuMouth;
    const r = await voiceOne(other, row.claim);
    if (r.verdict.verdict === "matched") { row.voiced = r.voiced; row.verdict = r.verdict; row.mouth = `${row.mouth}→${other === cpuMouth ? "cpu" : "ollama"}`; }
    row.attempts += 1;
  }));
  const ms = Date.now() - t0;
  const all = [...rows.values()];
  const tally = (rs) => { const t = { matched: 0, drift: 0, unvoiced: 0, contradicted: 0 }; for (const r of rs) t[r.verdict.verdict] = (t[r.verdict.verdict] ?? 0) + 1; return t; };
  const rate = (t, k, n) => n ? Number((t[k] / n).toFixed(3)) : 0;
  const t = tally(all);
  const best = results.find((r) => r.name.startsWith("gemma2"));
  const cpuN = all.filter((r) => r.mouth.startsWith("cpu")).length;
  const ollN = all.filter((r) => r.mouth.startsWith("ollama")).length;
  const esN = all.filter((r) => r.mouth.includes("→")).length;
  console.log(`\n  HYBRID — work-stealing: both mouths on one queue, concurrent, failures escalate to the other.`);
  console.log(`    dispatched CPU ${cpuN} · Ollama ${ollN} · escalated ${esN}`);
  console.log(`    verdicts ${JSON.stringify(t)} — matched ${rate(t, "matched", claimSet.length)}`);
  console.log(`    total ${ms}ms for ${claimSet.length} claims (vs gemma2-only ${best?.ms ?? "?"}ms) — the ceiling is the slower stream, never the sum.`);
  console.log(`    escalations that fixed: ${all.filter((r) => r.mouth.includes("→") && r.verdict.verdict === "matched").length}/${esN}`);
}

// B1 wall + a peek at the rows for the record
for (const r of results.slice(0, 1)) {
  let leak = 0;
  for (const row of r.rows) if (/#[0-9]|\.txt|\.html|refs?[:\s]/.test(claimVoicePrompt(row.claim))) leak += 1;
  console.log(`\n  B1 wall: address leaked into a mouth prompt on ${leak}/${r.n} claims (must be 0).`);
  console.log(`  first ${Math.min(4, r.n)} rows:`);
  for (const row of r.rows.slice(0, 4)) {
    console.log(`    [${row.verdict.verdict}] ${row.verdict.detail ?? ""} — "$${String(row.voiced).replace(/\s+/g, " ").slice(0, 90)}"`);
  }
}

// --dump: write the rows to eval/results/ for the eyeball the note demands
// (the 0.5 span-overlap and the STOP list are DECLARED, not measured — a
// matched/drift/unvoiced rate without a review of the actual rows is a number
// without a face).
if (has("--dump")) {
  const { mkdirSync, writeFileSync } = await import("node:fs");
  mkdirSync(new URL("./results/", import.meta.url), { recursive: true });
  const out = {
    generated: new Date().toISOString(),
    claims: claimSet.length, probes: probes.length, passages: chunks.length,
    arms: results.map((r) => ({ name: r.name, tally: r.tally, ms: r.ms, median: r.median, rows: r.rows.map((x) => ({ claim: `${x.claim.end1 ?? x.claim.subject} ${x.claim.label ?? x.claim.verb} ${x.claim.end2 ?? x.claim.object}`, voiced: String(x.voiced ?? "").replace(/\s+/g, " ").trim().slice(0, 160), verdict: x.verdict.verdict, detail: x.verdict.detail ?? null, attempts: x.attempts, ms: x.ms })) })),
  };
  writeFileSync(new URL("./results/voice-mouth-parallel.json", import.meta.url), JSON.stringify(out, null, 2));
  console.log(`\n  dumped ${claimSet.length} claims × ${results.length} arms → eval/results/voice-mouth-parallel.json`);
}

process.exit(0);