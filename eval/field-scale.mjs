// eval/field-scale.mjs — GFP Pass 36: cost at scale. The posting-list recall
// (relative.js) against fields of 1k / 10k / 100k nodes, built from real text
// (pg2600, passages replicated to reach N — declared: timing and the null band
// are the measures, and replicated real text is still real text). Measures:
// admission ms, recall ms (posting), store bytes per node, the null band's
// width (a bigger field has a wider band — by how much is the number), and the
// 15%-fragment task (the hardest rung of the §0 table) against the field's
// own band.
//
//   node eval/field-scale.mjs [--sizes 1000,10000,100000] [--recalls 100]
import { readFileSync } from "node:fs";
import { Field, tokensOf, isWord, sdrOf } from "../relative.js";
import { fragmentOf } from "../relative-pattern.js";
import { rowsSince } from "../field-of-record.js";
import { chunkSource } from "../source.js";

const args = process.argv.slice(2);
const sizes = (args[args.indexOf("--sizes") + 1] ?? "1000,10000,100000").split(",").map(Number);
const nRecalls = Number(args[args.indexOf("--recalls") + 1]) || 100;

const ROOT = new URL("../", import.meta.url).pathname;
const text = readFileSync(`${ROOT}pg2600.txt`, "utf8");
const base = chunkSource("pg2600.txt", text).filter((c) => tokensOf(c.text).filter(isWord).length >= 8).map((c) => c.text);
let s = 7; const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };

console.log(`GFP Pass 36 — cost at scale (${base.length} distinct real passages, replicated to size, posting-list recall)\n`);
const pad = (x, n) => String(x).padStart(n);
console.log(`  ${pad("size", 8)} ${pad("admit ms", 10)} ${pad("ms/recall", 10)} ${pad("bytes/node", 11)} ${pad("band hi (8w)", 13)} 15% fragment`);

for (const size of sizes) {
  const passages = [];
  while (passages.length < size) { passages.push(base[Math.floor(rng() * base.length)]); }
  const f = new Field();
  const t0 = Date.now();
  for (const p of passages) f.admit(p, { source: "pg2600.txt", at: `pg2600.txt#${passages.indexOf(p)}` });
  const admitMs = Date.now() - t0;
  // recall timing over random fragment cues
  const t1 = Date.now();
  for (let i = 0; i < nRecalls; i++) {
    const p = passages[Math.floor(rng() * passages.length)];
    f.recall(fragmentOf(p, 0, 0.3), { steps: 0 });
  }
  const perRecall = (Date.now() - t1) / nRecalls;
  // the null band at a short cue length (declared draws: 40 — the band's
  // WIDTH is the measure, and a full 150-draw band at 100k costs ~9s)
  const band = f.nullBand(8, { draws: 40, rng });
  // store bytes per node
  const bytes = JSON.stringify(rowsSince(f)).length;
  const bytesPerNode = Math.round(bytes / f.size);
  // the 15% fragment task against the field's own band, cached per cue-length
  // bucket so the eval stays re-runnable at 100k (one band per bucket, never
  // a per-probe 150-draw band).
  const bandByLen = new Map();
  const bandFor = (cue) => {
    const n = tokensOf(cue).filter(isWord).length;
    const k = Math.min(60, Math.max(3, Math.round(n / 5) * 5));
    if (!bandByLen.has(k)) bandByLen.set(k, f.nullBand(k, { draws: 40, rng }));
    return bandByLen.get(k);
  };
  const probes = base.filter((_, i) => i % Math.max(1, Math.floor(base.length / 40)) === 0).slice(0, 40);
  let frag = 0;
  for (const p of probes) {
    const r = f.recallAgainstNull(fragmentOf(p, 0, 0.15), { band: bandFor(fragmentOf(p, 0, 0.15)), steps: 0 });
    if (r.kind === "figure") frag += 1;
  }
  console.log(`  ${pad(size, 8)} ${pad(admitMs, 10)} ${pad(perRecall.toFixed(2), 10)} ${pad(bytesPerNode, 11)} ${pad(band.hi.toFixed(3), 13)} ${frag}/${probes.length}`);
}

console.log(`\n  EXIT: a recall under 50 ms at 100k nodes on this machine, or the size at which it is not — and the 15% task's fall as the band widens.`);