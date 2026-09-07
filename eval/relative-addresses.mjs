// eval/relative-addresses.mjs — the experiment: Ground vs Figure vs Pattern
// over one real text, with a null.
//
//   node eval/relative-addresses.mjs [path-to-text] [--passages N]
//
// The Ground: passages of the text, each with an absolute address
// `name#start-end`. The Figure: the same passages admitted to a keyless
// field. Then, for cues that are whole, partial, or corrupted, and for a
// ground that is shifted, renamed, or partly gone: what each way of
// addressing gets right, and what the Pattern between them gets right that
// neither does alone. Every hit is counted only above the null band the
// field measured for a cue of that length.
import { readFileSync } from "node:fs";
import { Field, tokensOf, isWord } from "../relative.js";
import { resolveAddress } from "../record-log.js";
import { drift, reanchor, correspond, fragmentOf } from "../relative-pattern.js";

const args = process.argv.slice(2);
const path = args.find((a) => !a.startsWith("--")) ?? new URL("../../eoreader7/native/eval/the-fold/fixtures/tolstoy-borodino.txt", import.meta.url).pathname;
const want = Number(args[args.indexOf("--passages") + 1]) || 400;
const seed = Number(args[args.indexOf("--seed") + 1]) || 7;
let s = seed; const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };

const raw = readFileSync(path, "utf8");
const NAME = "borodino";
// passages: paragraphs of at least eight words, up to `want`
const paras = raw.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter((p) => tokensOf(p).filter(isWord).length >= 8).slice(0, want);
let source = paras.join("\n\n");
const sources = { [NAME]: source };
const ground = []; let cursor = 0;
for (const p of paras) { const start = source.indexOf(p, cursor); ground.push({ text: p, at: `${NAME}#${start}-${start + p.length}` }); cursor = start + p.length; }

const field = new Field();
for (const g of ground) field.admit(g.text, { source: NAME, at: g.at });
const vocab = [...field.vocab.keys()];
const corrupt = (text, share) => { const w = tokensOf(text).filter(isWord); const n = Math.round(w.length * share); const idx = new Set(); while (idx.size < n && idx.size < w.length) idx.add(Math.floor(rng() * w.length)); return w.map((x, i) => (idx.has(i) ? vocab[Math.floor(rng() * vocab.length)] : x)).join(" "); };

const t0 = Date.now();
const sample = ground.filter((_, i) => i % Math.max(1, Math.floor(ground.length / 120)) === 0).slice(0, 120);
console.log(`corpus: ${paras.length} passages from ${path.split("/").pop()}, ${source.length.toLocaleString()} bytes; field of ${field.size} nodes, vocabulary ${vocab.length}; ${sample.length} probes per task`);

// null bands, one per cue length used below (measured once each)
const bands = new Map();
const bandFor = (cue) => { const n = tokensOf(cue).filter(isWord).length; const k = Math.min(60, Math.max(3, Math.round(n / 5) * 5)); if (!bands.has(k)) bands.set(k, field.nullBand(k, { draws: 150, rng })); return bands.get(k); };

function figureHit(cue, truth) {
  const r = field.recallAgainstNull(cue, { band: bandFor(cue) });
  return { hit: r.kind === "figure" && r.top.node.text === truth.text, kind: r.kind, top: r.top?.activation ?? 0, band: r.band.hi };
}
function keyHit(cue, truth) { return ground.find((g) => g.text === cue)?.at === truth.at; }

const tasks = [
  ["whole passage", (g) => g.text],
  ["first 30% of the words", (g) => fragmentOf(g.text, 0, 0.3)],
  ["a middle 30%", (g) => fragmentOf(g.text, 0.4, 0.7)],
  ["20% of words replaced", (g) => corrupt(g.text, 0.2)],
  ["40% of words replaced", (g) => corrupt(g.text, 0.4)],
  ["first 15% of the words", (g) => fragmentOf(g.text, 0, 0.15)],
];
console.log("\n— recall from a cue: exact key (the graph) vs the field (the state), hits above the null band —");
console.log("  cue                        key   field   ambiguous  nothing   band.hi");
for (const [label, make] of tasks) {
  let key = 0, fig = 0, amb = 0, none = 0, bandHi = 0;
  for (const g of sample) { const cue = make(g); if (keyHit(cue, g)) key++; const r = figureHit(cue, g); if (r.hit) fig++; else if (r.kind === "ambiguous") amb++; else if (r.kind === "nothing") none++; bandHi = r.band; }
  console.log(`  ${label.padEnd(27)}${String(key).padStart(3)}/${sample.length}  ${String(fig).padStart(3)}/${sample.length}   ${String(amb).padStart(3)}        ${String(none).padStart(3)}     ${bandHi.toFixed(3)}`);
}

console.log("\n— the null: random cues of the same lengths —");
for (const [k, b] of [...bands.entries()].sort((a, b) => a[0] - b[0])) console.log(`  ${String(k).padStart(2)} words: top activation by chance in [${b.lo.toFixed(3)}, ${b.hi.toFixed(3)}], widest lead by chance ${b.margin.toFixed(3)} (${b.draws} draws)`);
let randomHits = 0;
for (let i = 0; i < sample.length; i++) { const cue = Array.from({ length: 20 }, () => vocab[Math.floor(rng() * vocab.length)]).join(" "); if (field.recallAgainstNull(cue, { band: bandFor(cue) }).kind === "figure") randomHits++; }
console.log(`  random 20-word cues that the field calls a figure: ${randomHits}/${sample.length}`);

console.log("\n— navigation by synapse: after(node) from the recalled passage is the next passage —");
let nav = 0, navTried = 0;
for (let i = 0; i < ground.length - 1; i += Math.max(1, Math.floor(ground.length / 100))) { const r = field.recall(ground[i].text); const n = field.after(r[0].node); navTried++; if (n && n.text === ground[i + 1].text) nav++; }
console.log(`  ${nav}/${navTried}`);

console.log("\n— the ground perturbed: what each way of addressing still gets right, and what the pattern repairs —");
const perturbations = [
  ["a 2,000-byte preface inserted (every offset shifts)", () => ({ [NAME]: "PREFACE. ".repeat(250) + source })],
  ["the source renamed", () => ({ borodino_v2: source })],
  ["renamed AND prefaced", () => ({ borodino_v2: "NOTE: ".repeat(300) + source })],
  ["one passage in five deleted", () => ({ [NAME]: paras.filter((_, i) => i % 5 !== 0).join("\n\n") })],
];
console.log("  perturbation                                          ground   figure   pattern   apart  (of probes)");
for (const [label, make] of perturbations) {
  const src2 = make();
  let groundOk = 0, figureOk = 0, patternOk = 0, apart = 0, tried = 0;
  for (const g of sample) {
    tried++;
    const r = resolveAddress(g.at, src2); if (r.ok && r.text === g.text) groundOk++;
    const f = reanchor(fragmentOf(g.text, 0, 0.3), field, src2, { band: bandFor(fragmentOf(g.text, 0, 0.3)) }); if (f.ok && resolveAddress(f.at, src2).text === g.text) figureOk++;
    const c = correspond(g.at, g.text, field, src2, { band: bandFor(g.text) });
    if ((c.kind === "agree" || c.kind === "repaired") && resolveAddress(c.at, src2).text === g.text) patternOk++; else if (c.kind === "apart") apart++;
  }
  console.log(`  ${label.padEnd(54)}${String(groundOk).padStart(4)}/${tried}  ${String(figureOk).padStart(4)}/${tried}   ${String(patternOk).padStart(4)}/${tried}   ${String(apart).padStart(4)}`);
}

console.log("\n— a re-ordered store: the field rebuilt from a serialization with its rows shuffled —");
const rows = field.serialize(); for (let i = rows.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [rows[i], rows[j]] = [rows[j], rows[i]]; }
const rebuilt = Field.deserialize(rows);
let same = 0, navSame = 0;
for (const g of sample) { const a = field.recall(fragmentOf(g.text, 0, 0.3))[0].node.text; const b = rebuilt.recall(fragmentOf(g.text, 0, 0.3))[0].node.text; if (a === b) same++; const n1 = field.after(field.recall(g.text)[0].node)?.text, n2 = rebuilt.after(rebuilt.recall(g.text)[0].node)?.text; if (n1 === n2) navSame++; }
console.log(`  same figure recalled ${same}/${sample.length}; same neighbour by synapse ${navSame}/${sample.length} — positions changed, addresses did not`);

console.log(`\n— cost: ${((Date.now() - t0) / 1000).toFixed(1)}s for everything above; one recall over ${field.size} nodes ≈ ${(() => { const t = Date.now(); for (let i = 0; i < 20; i++) field.recall(sample[i % sample.length].text); return ((Date.now() - t) / 20).toFixed(1); })()} ms —`);
