// eval/field-of-record.mjs — GFP Pass 33's measure: the §0 table over REAL
// material of six kinds (the long-stream corpus) and over the committed
// records, with the field's own null band per cue length, the cost of
// admission, the store's size, and the rebuild null (a shuffled store must
// recall and navigate identically on every probe).
//
//   node eval/field-of-record.mjs [--passages N] [--probes N]
import { readFileSync, readdirSync } from "node:fs";
import { Field, tokensOf, isWord } from "../relative.js";
import { fragmentOf, correspond } from "../relative-pattern.js";
import { fieldOf, rowsSince, fieldFromRows, admitRecordLines, textOfEntry } from "../field-of-record.js";
import { chunkSource } from "../source.js";

const args = process.argv.slice(2);
const want = Number(args[args.indexOf("--passages") + 1]) || 400;
const nProbes = Number(args[args.indexOf("--probes") + 1]) || 120;
const ROOT = new URL("../../", import.meta.url).pathname;
const NATIVE = `${ROOT}eoreader7/native`;
const KINDS = [
  ["prose", `${ROOT}the-fold/pg2600.txt`],
  ["greek", `${ROOT}eoreader7/legacy-eoreader6.1/odyssey-greek.txt`],
  ["xml", `${ROOT}live_priors/14-holy-texts/sblgnt/Luke.xml`],
  ["code", `${ROOT}eopm/public/vendor/react-dom.js`],
  ["json", `${NATIVE}/eval/the-fold/fixtures/unimorph-eng-verb-forms.json`],
  ["html", `${NATIVE}/eval/the-fold/fixtures/wikipedia-abraham-lincoln.html`],
];
let s = 7; const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
const corrupt = (field, text, share) => { const w = tokensOf(text).filter(isWord); const n = Math.round(w.length * share); const vocab = [...field.vocab.keys()]; const idx = new Set(); while (idx.size < n && idx.size < w.length) idx.add(Math.floor(rng() * w.length)); return w.map((t, i) => (idx.has(i) ? vocab[Math.floor(rng() * vocab.length)] : t)).join(" "); };
const bandsFor = (field) => { const bands = new Map(); return (cue) => { const n = tokensOf(cue).filter(isWord).length; const k = Math.min(60, Math.max(3, Math.round(n / 5) * 5)); if (!bands.has(k)) bands.set(k, field.nullBand(k, { draws: 150, rng })); return bands.get(k); }; };
const pad = (x, n) => String(x).padStart(n);

function table(field, ground, name, sources) {
  const bandFor = bandsFor(field);
  const sample = ground.filter((_, i) => i % Math.max(1, Math.floor(ground.length / nProbes)) === 0).slice(0, nProbes);
  const hit = (cue, truth) => { const r = field.recallAgainstNull(cue, { band: bandFor(cue) }); return { hit: r.kind === "figure" && r.top.node.text === truth.text, kind: r.kind }; };
  const tasks = [["whole passage", (g) => g.text], ["first 30% of the words", (g) => fragmentOf(g.text, 0, 0.3)], ["a middle 30%", (g) => fragmentOf(g.text, 0.4, 0.7)], ["40% of words replaced", (g) => corrupt(field, g.text, 0.4)], ["first 15% of the words", (g) => fragmentOf(g.text, 0, 0.15)]];
  const rows = [];
  for (const [label, cue] of tasks) { let h = 0, amb = 0, none = 0; for (const g of sample) { const r = hit(cue(g), g); if (r.hit) h++; else if (r.kind === "ambiguous") amb++; else if (r.kind === "nothing") none++; } rows.push({ label, hits: h, amb, none, of: sample.length }); }
  // random cues the field calls a figure (must be 0)
  const vocab = [...field.vocab.keys()]; let falseFigures = 0;
  for (let i = 0; i < sample.length; i++) { const cue = Array.from({ length: 20 }, () => vocab[Math.floor(rng() * vocab.length)]).join(" "); if (field.recallAgainstNull(cue, { band: bandFor(cue) }).kind === "figure") falseFigures++; }
  // the ground perturbed: renamed AND prefaced; the pattern repairs
  const prefaced = { [`${name}_v2`]: "PREFACE ".repeat(250) + sources[name] };
  let repaired = 0, apart = 0;
  for (const g of sample) { const c = correspond(g.at, g.text, field, prefaced, { band: bandFor(g.text) }); if (c.kind === "repaired") repaired++; else if (c.kind === "apart") apart++; }
  // the rebuild null: a shuffled store, same figure and same synapse on every probe
  const rows_ = rowsSince(field); const shuffled = [...rows_].sort(() => rng() - 0.5); const g2 = fieldFromRows(shuffled);
  let sameFigure = 0, sameSynapse = 0;
  for (const g of sample) { const a = field.recall(g.text)[0].node, b = g2.recall(g.text)[0].node; if (a.text === b.text) sameFigure++; if ((field.after(a)?.text ?? null) === (g2.after(b)?.text ?? null)) sameSynapse++; }
  const bytes = rows_.reduce((n, r) => n + JSON.stringify(r).length, 0);
  return { rows, falseFigures, repaired, apart, sameFigure, sameSynapse, of: sample.length, bytesPerNode: Math.round(bytes / Math.max(1, field.size)) };
}

console.log(`GFP Pass 33 — the field over real material: ${want} passages per kind, ${nProbes} probes per task, the field's own null band per cue length (150 draws)\n`);
const pooled = { frag30: 0, of: 0 };
for (const [kind, path] of KINDS) {
  let text; try { text = readFileSync(path, "utf8"); } catch { console.log(`  ${kind}: ${path} absent — skipped`); continue; }
  const name = path.split("/").pop();
  const t0 = Date.now();
  const chunks = chunkSource(name, text).filter((c) => tokensOf(c.text).filter(isWord).length >= 8).slice(0, want);
  const tChunk = Date.now() - t0;
  const t1 = Date.now();
  const field = fieldOf({ passages: chunks.map((c) => ({ ...c, source: name })) });
  const msPerAdmit = (Date.now() - t1) / Math.max(1, chunks.length);
  const ground = chunks.map((c) => ({ text: c.text, at: c.ref }));
  const sources = { [name]: text };
  // ground addresses must resolve to their own bytes for the pattern task
  const r = table(field, ground, name, sources);
  console.log(`— ${kind}: ${name} — ${chunks.length} passages (chunked in ${tChunk} ms), field of ${field.size} nodes, vocabulary ${field.vocab.size}, admission ${msPerAdmit.toFixed(2)} ms/passage, store ${r.bytesPerNode} bytes/node`);
  for (const row of r.rows) console.log(`    ${row.label.padEnd(26)} ${pad(row.hits, 3)}/${row.of}  ambiguous ${pad(row.amb, 3)}  nothing ${pad(row.none, 3)}`);
  console.log(`    random 20-word cues called a figure: ${r.falseFigures}/${r.of}   renamed+prefaced ground repaired by the pattern: ${r.repaired}/${r.of}, apart ${r.apart}   shuffled store: same figure ${r.sameFigure}/${r.of}, same synapse ${r.sameSynapse}/${r.of}\n`);
  const f30 = r.rows.find((x) => x.label.startsWith("first 30%")); pooled.frag30 += f30.hits; pooled.of += f30.of;
}
// the records: every committed record line that carries text
const recDir = `${ROOT}the-fold/record/`;
const records = {}; let lines = 0;
for (const f of readdirSync(recDir).filter((f) => f.endsWith(".jsonl"))) { const ls = readFileSync(recDir + f, "utf8").split("\n").filter((l) => l.trim()); records[f] = ls; lines += ls.length; }
const rf = new Field(); let admitted = 0; const texts = new Map();
for (const [name, ls] of Object.entries(records)) { admitted += admitRecordLines(rf, name, ls); for (const l of ls) { try { const t = textOfEntry(JSON.parse(l)); if (t) texts.set(t, (texts.get(t) ?? 0) + 1); } catch {} } }
const dup = [...texts.values()].filter((n) => n > 1).reduce((a, b) => a + b - 1, 0);
console.log(`— the records: ${Object.keys(records).length} files, ${lines} lines, ${admitted} carry text and were admitted; ${dup} repeat a text already admitted (they collapse on rebuild: a signature is the hash of a text)`);
if (rf.size >= 10) {
  const bandFor = bandsFor(rf); let h = 0, of = 0;
  for (const n of rf.nodes) { if (tokensOf(n.text).filter(isWord).length < 4) continue; of++; const cue = fragmentOf(n.text, 0, 0.3); const r = rf.recallAgainstNull(cue, { band: bandFor(cue) }); if (r.kind === "figure" && r.top.node.text === n.text) h++; }
  console.log(`    recall of a record entry from the first 30% of its words: ${h}/${of}`);
}
console.log(`\nEXIT (30% fragment, pooled over the kinds): ${pooled.frag30}/${pooled.of} = ${(100 * pooled.frag30 / Math.max(1, pooled.of)).toFixed(1)}%  — Tolstoy gave 119/120 = 99.2%`);
