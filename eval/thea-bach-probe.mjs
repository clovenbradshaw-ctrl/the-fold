// thea-bach-probe.mjs — Thea learns from Bach, honestly controlled.
// Heard: prelude BWV 846 notes 1..329 (60%) as cells, refs are the notes'
// own tick addresses (midi.js floor 0). Candidates: the REAL next 16 notes
// vs 20 SEEDED shuffles of the same 16 (identical support — Melpomene passes
// all 21; support cannot separate them, arrangement must). Coherence: mean
// log(1+count) of each melodic interval under the HEARD-60% histogram — the
// doc's own best expert (hearing@1, 3.39 bits/note beats shuffled 5.44).
// The committed aria prior rides as cross-work second opinion, reported not
// gated (the doc: cross-work HURT the prelude — stated before this run).
// Declared before running: the real continuation ranks #1 of 21 under the
// heard prior. Thea then orders all 21 by declared coherence and sounds the
// top 3. Run: node eval/thea-bach-probe.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { parseMidi, noteName } from "../../eoreader7/native/adapters/midi/midi.js";
import { composeFigure, museAssemble } from "../thea.js";
import prior from "../priors-data/thea-bach-prior.json" with { type: "json" };

const N = (name) => ({ c: 0, "c#": 1, d: 2, "d#": 3, e: 4, f: 5, "f#": 6, g: 7, "g#": 8, a: 9, "a#": 10, b: 11 }[name.slice(0, 2).replace(/[0-9]/, "")] ?? 0);
const nm = (p) => noteName(p).toUpperCase().replace(/(\d)$/, "$1");

const { notes } = parseMidi(readFileSync(new URL("../../eoreader7/native/eval/the-fold/fixtures/midi/wtk1-prelude1.mid", import.meta.url)));
const P = notes.map((n) => n.pitch);
const cut = Math.floor(P.length * 0.6);
const heard = P.slice(0, cut);
const real = P.slice(cut, cut + 16);

// Heard prior: interval histogram of the heard 60% (giver: the heard bytes).
const H = {};
for (let i = 1; i < heard.length; i++) { const d = heard[i] - heard[i - 1]; H[d] = (H[d] ?? 0) + 1; }
const heardAlphabet = new Set(heard);
const cohere = (hist) => (phrase) => {
  let s = 0;
  for (let i = 1; i < phrase.length; i++) s += Math.log1p(hist[phrase[i] - phrase[i - 1]] ?? 0);
  return s / Math.max(1, phrase.length - 1);
};
const heardScore = cohere(H);
const ariaScore = cohere(Object.fromEntries(Object.entries(prior.intervalCounts).map(([k, v]) => [Number(k), v])));

// Seeded shuffles (mulberry32, seeds 1..20) — the control built to fail.
const shuffled = (arr, seed) => {
  const a = [...arr]; let s = seed;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const cands = [{ id: "real", phrase: real }, ...Array.from({ length: 20 }, (_, i) => ({ id: `shuf${i + 1}`, phrase: shuffled(real, i + 1) }))];
for (const c of cands) { c.heard = heardScore(c.phrase); c.aria = ariaScore(c.phrase); }
const ranked = [...cands].sort((a, b) => b.heard - a.heard);
const realRank = ranked.findIndex((c) => c.id === "real") + 1;
const ariaRank = [...cands].sort((a, b) => b.aria - a.aria).findIndex((c) => c.id === "real") + 1;

// Thea arranges all 21 by the DECLARED coherence order (caller-declared, named).
const cells = [];
for (let i = 0; i < heard.length; i += 16) {
  cells.push({ ref: notes[i].at, text: heard.slice(i, i + 16).map(nm).join(" ") });
}
const fig = composeFigure({
  part: "prelude hearing", passages: cells,
  lines: ranked.map((c) => ({ text: c.phrase.map(nm).join(" "), backs: cells.map((x) => x.ref).slice(0, 3) })),
  supportsLine: (line, cell) => {
    const inCell = new Set(cell.split(" "));
    return line.split(" ").filter((p) => inCell.has(p)).length >= 2;
  },
});
const parts = ranked.slice(0, 3).map((c, i) => ({
  id: c.id, heading: `Rank ${i + 1} (${c.id})`, text: c.phrase.map(nm).join(" "),
  gaps: [], edges: [], claim: { end1: nm(c.phrase[0]) },
}));
const whole = museAssemble({ parts, order: parts.map((p) => p.id) });

// Sound the top 3 with a C drone (C is the prelude's home — giver: the key signature both fixtures share).
const SEMI = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
const freqOf = (n) => {
  const m = /^([A-G])(#)?(\d)$/.exec(n);
  if (!m) return null;
  return 440 * Math.pow(2, (SEMI[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) - 4) * 12) / 12);
};
const SR = 22050, BEAT = 0.22;
const seq = parts.flatMap((p) => p.text.split(" "));
const total = seq.length * BEAT + 0.5;
const data = Buffer.alloc(Math.ceil(total * SR) * 2);
const add = (f, start, dur, vel) => {
  if (!f) return;
  const n0 = Math.floor(start * SR), n1 = Math.min(data.length / 2, Math.floor((start + dur) * SR));
  for (let s = n0; s < n1; s++) {
    const tt = (s - n0) / SR;
    const env = Math.min(1, tt / 0.015, (n1 - s) / SR / 0.05);
    const v = Math.floor(13000 * vel * env * Math.sin(2 * Math.PI * f * tt));
    const k = s * 2;
    data.writeInt16LE(Math.max(-32768, Math.min(32767, data.readInt16LE(k) + v)), k);
  }
};
seq.forEach((n, i) => add(freqOf(n), i * BEAT, BEAT * 0.95, 0.6));
add(freqOf("C3"), 0, total, 0.15);
const head = Buffer.alloc(44);
head.write("RIFF", 0); head.writeUInt32LE(36 + data.length, 4); head.write("WAVE", 8);
head.write("fmt ", 12); head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20);
head.writeUInt16LE(1, 22); head.writeUInt32LE(SR, 24); head.writeUInt32LE(SR * 2, 28);
head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34); head.write("data", 36);
head.writeUInt32LE(data.length, 40);
const OUT = "/tmp/thea-bach-top3.wav";
writeFileSync(OUT, Buffer.concat([head, data]));

console.log(`heard prior: real ranks #${realRank} of 21 (declared: #1)`);
console.log(`aria cross-work prior: real ranks #${ariaRank} of 21 (reported, ungated)`);
console.log("figure:", fig.sentences.length, "landed,", fig.gaps.length, "gaps");
console.log("order:", whole.orderNote);
console.log("top3:", parts.map((p) => p.id).join(","));
console.log("WAV:", OUT);
if (realRank !== 1) { console.error("MISS: real continuation did not rank #1"); process.exitCode = 1; }
