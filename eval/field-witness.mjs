// eval/field-witness.mjs — GFP Pass 35's measure and null: THE SHADOW's
// seat in retrieval (the keyless field, relative.js / field-of-record.js),
// scored over a real stream. For each probe, the LEXICAL arm
// (source.js::retrieve) and the RELATIVE arm (field-of-record.js::
// recallForTurn) each nominate a passage set; "bound" is the set containing
// the probe's own ground-truth passage. Counted:
//   gained  — the field nominated the truth the lexical path missed (the
//             measure's "turns where the field found a passage lexical
//             missed and the answer was then bound to it")
//   lost    — the reverse (lexical bound, the field did not)
// and the NULL (the spec's own arm): the same recalls run against a field
// rebuilt from a SHUFFLED store — random adjacency. If steps=1 (spreading)
// does not beat the shuffled null, spreading is off for this use.
//
//   node eval/field-witness.mjs [--passages N] [--probes N]
import { readFileSync } from "node:fs";
import { Field, tokensOf, isWord } from "../relative.js";
import { fragmentOf } from "../relative-pattern.js";
import { fieldOf, fieldFromRows, rowsSince, recallForTurn } from "../field-of-record.js";
import { chunkSource, retrieve } from "../source.js";

const args = process.argv.slice(2);
const want = Number(args[args.indexOf("--passages") + 1]) || 500;
const nProbes = Number(args[args.indexOf("--probes") + 1]) || 120;
const ROOT = new URL("../../", import.meta.url).pathname;
const text = readFileSync(`${ROOT}the-fold/pg2600.txt`, "utf8");
const name = "pg2600.txt";
const chunks = chunkSource(name, text).filter((c) => tokensOf(c.text).filter(isWord).length >= 8).slice(0, want);

let s = 7; const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };

// The field, its rows, and a SHUFFLED rebuild — the spec's null (random
// adjacency). Same texts, same everything except the synapses.
const field = fieldOf({ passages: chunks.map((c) => ({ ...c, source: name })) });
const rows = rowsSince(field);
const shuffled = [...rows].sort(() => rng() - 0.5);
const nullField = fieldFromRows(shuffled);

const bandCache = new Map();
const bandFor = (f) => {
  const byLen = new Map();
  return (cue) => {
    const n = tokensOf(cue).filter(isWord).length;
    const k = Math.min(60, Math.max(3, Math.round(n / 5) * 5));
    if (!byLen.has(k)) byLen.set(k, f.nullBand(k, { draws: 150, rng }));
    return byLen.get(k);
  };
};
const bandReal = bandFor(field);
const bandNull = bandFor(nullField);

// The probes: real passages, remembered from fragments — the shape real
// retrieval fails on (first 30%, a middle 30%, a topical restatement).
const sample = chunks.filter((_, i) => i % Math.max(1, Math.floor(chunks.length / nProbes)) === 0).slice(0, nProbes);
const cues = [];
for (const c of sample) {
  cues.push({ truth: c.ref, cue: fragmentOf(c.text, 0, 0.3), label: "first 30%" });
  cues.push({ truth: c.ref, cue: fragmentOf(c.text, 0.4, 0.7), label: "middle 30%" });
}

const lexical = (q, limit = 3) => retrieve(chunks, q, limit, []).map((p) => p.ref);
const relative = (f, band, q, steps = 1) => {
  const r = recallForTurn(f, q, { draws: 150, steps });
  if (!r || (r.kind !== "figure" && r.kind !== "ambiguous")) return [];
  return r.passages.map((p) => p.ref);
};

const arms = {
  "lexical (source.js retrieve)": null,
  "relative, real field, steps=1": (q) => relative(field, bandReal, q, 1),
  "relative, real field, steps=0": (q) => relative(field, bandReal, q, 0),
  "relative, SHUFFLED field, steps=1 (null)": (q) => relative(nullField, bandNull, q, 1),
};

const counts = Object.fromEntries(Object.keys(arms).map((k) => [k, { bound: 0, gainedVsLexical: 0, lostVsLexical: 0, promotedInPool: 0, falseFigure: 0 }]));

// random-cue false figures per arm (the band must still refuse chance)
const vocab = [...field.vocab.keys()];
for (const [k, fn] of Object.entries(arms)) {
  if (!fn) continue;
  for (let i = 0; i < 60; i++) {
    const q = Array.from({ length: 12 }, () => vocab[Math.floor(rng() * vocab.length)]).join(" ");
    if (fn(q).length) counts[k].falseFigure += 1;
  }
}

let trueLexical = 0;
for (const { truth, cue, label } of cues) {
  const lex = lexical(cue);
  const lexHit = lex.includes(truth);
  if (lexHit) trueLexical += 1;
  for (const [k, fn] of Object.entries(arms)) {
    if (!fn) continue;
    const set = fn(cue);
    const hit = set.includes(truth);
    if (hit) counts[k].bound += 1;
    if (hit && !lexHit) counts[k].gainedVsLexical += 1;
    if (!hit && lexHit) counts[k].lostVsLexical += 1;
    if (hit && chunks.some((c) => c.ref === truth)) counts[k].promotedInPool += 1;
  }
}

const pad = (x, n) => String(x).padStart(n);
console.log(`GFP Pass 35 — the figure as one witness in retrieval (${chunks.length} passages, ${cues.length} probes of 2 kinds, band 150 draws)\n`);
console.log(`  lexical alone bound the truth on ${trueLexical}/${cues.length} probes — the baseline the field is measured against`);
for (const [k, c] of Object.entries(counts)) {
  if (k === "lexical (source.js retrieve)") continue;
  console.log(`  ${k.padEnd(44)} bound ${pad(c.bound, 3)}/${cues.length}  gained ${pad(c.gainedVsLexical, 3)}  lost ${pad(c.lostVsLexical, 3)}  false-figures ${pad(c.falseFigure, 2)}/60`);
}
console.log(`\n  EXIT: a measured, dated difference — positive or not. Spreading (steps=1) must beat the SHUFFLED null or it is turned off for this use.`);
console.log(`  real steps=1 vs shuffled steps=1 bound: ${counts["relative, real field, steps=1"].bound} vs ${counts["relative, SHUFFLED field, steps=1 (null)"].bound}`);
console.log(`  real steps=1 vs steps=0 bound: ${counts["relative, real field, steps=1"].bound} vs ${counts["relative, real field, steps=0"].bound}`);