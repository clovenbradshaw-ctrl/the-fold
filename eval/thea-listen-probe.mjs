// thea-listen-probe.mjs — listening to the only corpus song with bytes.
// Reads live_priors/10-audio-music/downloads/78rpm/.../restored-22050.wav
// through the engine's own ears (wav.js decode → fft magnitudes → chroma12,
// 4096/1024 — reading.js's own field rate) and sediments what it heard as
// Thea's second received prior: chroma profile, voiced pitch-class melody
// (argmax per frame, run-compressed), its bigrams, and the SAME shape floors
// the aria taught (turns/repeats per 12, longest monotone run) — directly
// comparable, blues ground beside Bach ground. Writes
// priors-data/thea-rising-sun-prior.json with givers. Nothing asserted about
// beauty; everything tallied. Run: node eval/thea-listen-probe.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { decodeWav } from "../../eoreader7/native/adapters/audio/wav.js";
import { magnitudeSpectrum } from "../../eoreader7/native/adapters/audio/fft.js";
import { computeChroma } from "../../eoreader7/native/adapters/audio/chroma.js";

const wav = decodeWav(readFileSync(new URL("../../live_priors/10-audio-music/downloads/78rpm/josh-white-house-of-the-rising-sun/restored-22050.wav", import.meta.url)));
const sr = wav.sampleRate;
const ch = wav.channelData[0];
console.log(`decoded: ${sr}Hz, ${ch.length} samples (${(ch.length / sr).toFixed(0)}s), ${wav.channels}ch`);

const N = 4096, HOP = 1024;
const CLASS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const profile = new Float64Array(12);
const frames = [];
for (let s = 0; s + N <= ch.length; s += HOP) {
  const frame = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N); // Hann, disclosed
    frame[i] = ch[s + i] * w;
  }
  const mags = magnitudeSpectrum(frame); // FFT inside — caller sends time samples
  const chroma = computeChroma(mags, sr, N);
  let e = 0;
  for (let i = 0; i < N; i++) e += ch[s + i] * ch[s + i];
  for (let i = 0; i < 12; i++) profile[i] += chroma[i];
  let top = 0;
  for (let i = 1; i < 12; i++) if (chroma[i] > chroma[top]) top = i;
  frames.push({ top, conf: chroma[top], energy: e / N });
}
const energies = frames.map((f) => f.energy).sort((a, b) => a - b);
const floor = energies[Math.floor(energies.length * 0.35)]; // voiced = top 65% energy
const melody = [];
for (const f of frames) {
  if (f.energy < floor || f.conf < 0.45) continue; // unvoiced/unclear: silence, not a guess
  const c = f.top;
  if (!melody.length || melody[melody.length - 1] !== c) melody.push(c);
}
console.log(`frames: ${frames.length}, voiced melody classes: ${melody.length}`);

// Shape floors, same metrics as the aria (class grain).
const wins = [];
for (let i = 0; i + 12 <= melody.length; i += 12) {
  let turns = 0, sames = 0;
  for (let j = i + 1; j < i + 12; j++) if (melody[j] === melody[j - 1]) sames++;
  for (let j = i + 2; j < i + 12; j++) {
    const a = Math.sign(melody[j - 1] - melody[j - 2]), b = Math.sign(melody[j] - melody[j - 1]);
    if (a !== 0 && b !== 0 && a !== b) turns++;
  }
  wins.push({ turns, sames });
}
const big = {};
for (let i = 1; i < melody.length; i++) {
  const k = `${melody[i - 1]}>${melody[i]}`;
  big[k] = (big[k] ?? 0) + 1;
}
const topBig = Object.entries(big).sort((a, b) => b[1] - a[1]).slice(0, 10);
let mono = 1, best = 1, dir = 0;
for (let i = 1; i < melody.length; i++) {
  const d = Math.sign(melody[i] - melody[i - 1]);
  if (d === 0) { mono++; continue; }
  if (dir === 0 || d === dir) { mono++; dir = d; }
  else { best = Math.max(best, mono); mono = 2; dir = d; }
}
best = Math.max(best, mono);

const prof = [...profile].map((v) => +(v / frames.length).toFixed(4));
const top3 = prof.map((v, i) => [CLASS[i], v]).sort((a, b) => b[1] - a[1]).slice(0, 3);
const prior = {
  name: "RisingSunChromaPrior@1",
  givers: [
    "Josh White and his Guitar, House Of The Rising Sun, 1942 — Internet Archive 78rpm digitized by George Blood L.P. / Archive of Contemporary Music (live_priors/10-audio-music/downloads/78rpm/josh-white-house-of-the-rising-sun/restored-22050.wav; source item license unknown — heard as prior, never redistributed)",
    "ears: eoreader7 wav.js decode → fft magnitudes → chroma12 @4096/1024 (reading.js field rate), Hann window; voiced = top-65% frame energy + chroma confidence ≥0.45; melody = argmax class run-compressed",
    "method: same shape metrics as thea-bach-prior.json (turns/repeats per 12, class grain) — directly comparable grounds",
  ],
  sampleRate: sr, seconds: +(ch.length / sr).toFixed(1), frames: frames.length, melodyClasses: melody.length,
  chromaProfile: Object.fromEntries(prof.map((v, i) => [CLASS[i], v])),
  topClasses: top3,
  shape: {
    turnsPer12: { min: Math.min(...wins.map((w) => w.turns)), median: wins.map((w) => w.turns).sort((a, b) => a - b)[Math.floor(wins.length / 2)], max: Math.max(...wins.map((w) => w.turns)) },
    samesPer12: { min: Math.min(...wins.map((w) => w.sames)), max: Math.max(...wins.map((w) => w.sames)) },
    longestMonotoneRun: best,
  },
  topBigrams: Object.fromEntries(topBig),
};
writeFileSync(new URL("../priors-data/thea-rising-sun-prior.json", import.meta.url), JSON.stringify(prior, null, 1) + "\n");
console.log("top classes:", top3.map(([c, v]) => `${c}:${v}`).join(" "));
console.log(`turns/12: min ${prior.shape.turnsPer12.min} med ${prior.shape.turnsPer12.median} max ${prior.shape.turnsPer12.max} | sames/12 max ${prior.shape.samesPer12.max} | longest run ${best}`);
console.log("top bigrams:", topBig.slice(0, 5).map(([k, v]) => `${k}:${v}`).join(" "));
console.log("wrote priors-data/thea-rising-sun-prior.json");
console.log("aria compare: turns min 2 med 6 max 8, sames max 3");
