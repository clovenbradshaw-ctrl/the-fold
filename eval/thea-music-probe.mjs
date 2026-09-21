// thea-music-probe.mjs — Thea composes music as arrangement, nothing else.
// Handed: note-cells as passages (refs + pitches). Pitches are the words;
// rhythm per movement is caller-declared movement character (time is hers
// to shape — arrangement, not a claim about the world); dynamics follow the
// arc's own freshness (Vonnegut made audible: the new sounds louder); a G
// drone weaves under all three movements (simultaneous Pattern, not just
// sequence); the close returns m1's phrase (re-sighting = refrain) and
// lands home on C (lysis — Aristotle's denouement, declared). Every sounded
// pitch traces to a handed cell or the probe fails. Run: node eval/thea-music-probe.mjs
import { writeFileSync } from "node:fs";
import { composeFigure, museAssemble, TRANSIT_FALLBACK } from "../thea.js";

const CELLS = [
  { ref: "cell#low", text: "C D E F G" },
  { ref: "cell#high", text: "G A B C5 D5" },
  { ref: "cell#home", text: "E G C5 E5" },
];
const HANDED = new Set(CELLS.flatMap((c) => c.text.split(" ")));
const pitchToks = (t) => String(t ?? "").split(/\s+/).filter(Boolean);
const supportsNote = (line, cell) => {
  const inCell = new Set(pitchToks(cell));
  return pitchToks(line).filter((p) => inCell.has(p)).length >= 2;
};
const pitchFortune = (text, seen) => {
  let n = 0;
  for (const p of pitchToks(text)) if (!seen.has(p)) { seen.add(p); n++; }
  return n;
};

const PHRASES = {
  "cell#low": ["C D E F G"],
  "cell#high": ["G A B C5 D5"],
  "cell#home": ["E G C5 E5", "C D E F G"], // home closes with low's phrase: refrain by re-sighting
  _gap: { text: "F# C# G# D# A#", backs: ["cell#low"] },
};
// Rhythm per movement, caller-declared (quarters / eighths / halves home).
const RHYTHM = { m1: [1, 1, 1, 1, 1], m2: [0.5, 0.5, 0.5, 0.5, 1], m3: [1, 1, 1, 2, 2, 2, 2, 2, 2] };

const movements = CELLS.map((cell, i) => {
  const id = `m${i + 1}`;
  const lines = PHRASES[cell.ref].map((text) => ({ text, backs: [cell.ref] }));
  if (i === 0) lines.push(PHRASES._gap); // the reach-beyond, once: must gap
  const r = composeFigure({ part: `movement ${i + 1}`, passages: [cell], lines, supportsLine: supportsNote });
  return { id, heading: `Movement ${i + 1}`, text: r.sentences.map((s) => s.text).join(" "), gaps: r.gaps, edges: [], claim: { end1: "G" } };
});

const whole = museAssemble({
  parts: movements, order: movements.map((p) => p.id),
  tokensOf: pitchToks, fortuneOf: pitchFortune,
});

// ── trace check ──
const sounded = whole.sections.flatMap((s) => pitchToks(s.text));
const leaked = sounded.filter((p) => !HANDED.has(p));

// ── render: melody (rhythm per movement) + G drone beneath ──
const SEMI = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
const freqOf = (n) => {
  const m = /^([A-G])(#|b)?(\d)?$/.exec(n);
  if (!m) return null;
  const s = SEMI[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + ((m[3] ? Number(m[3]) : 4) - 4) * 12;
  return 440 * Math.pow(2, s / 12);
};
const SR = 22050, BEAT = 0.32;
const fresh = whole.arc.fresh;
const events = []; // {freq, start, dur, vel}
let t = 0;
whole.sections.forEach((s, i) => {
  const notes = pitchToks(s.text);
  const durs = RHYTHM[s.id] ?? notes.map(() => 1);
  notes.forEach((note, j) => {
    const dur = (durs[j] ?? 1) * BEAT;
    const vel = 0.45 + 0.4 * (fresh[i] / Math.max(1, ...fresh)); // the new sounds louder
    events.push({ freq: freqOf(note), start: t, dur, vel });
    t += dur;
  });
  t += BEAT * 0.5; // breath between movements
});
const droneF = freqOf("G");
const total = t;
events.push({ freq: droneF / 2, start: 0, dur: total, vel: 0.18 }); // the drone beneath
const data = Buffer.alloc(Math.ceil(total * SR) * 2);
for (const e of events) {
  if (!e.freq) continue;
  const n0 = Math.floor(e.start * SR), n1 = Math.min(data.length / 2, Math.floor((e.start + e.dur) * SR));
  for (let s = n0; s < n1; s++) {
    const tt = (s - n0) / SR;
    const env = Math.min(1, tt / 0.02, (n1 - s) / SR / 0.06);
    const v = Math.floor(14000 * e.vel * env * (Math.sin(2 * Math.PI * e.freq * tt) + 0.3 * Math.sin(4 * Math.PI * e.freq * tt)));
    const k = s * 2;
    data.writeInt16LE(Math.max(-32768, Math.min(32767, data.readInt16LE(k) + v)), k);
  }
}
const head = Buffer.alloc(44);
head.write("RIFF", 0); head.writeUInt32LE(36 + data.length, 4); head.write("WAVE", 8);
head.write("fmt ", 12); head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20);
head.writeUInt16LE(1, 22); head.writeUInt32LE(SR, 24); head.writeUInt32LE(SR * 2, 28);
head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34); head.write("data", 36);
head.writeUInt32LE(data.length, 40);
const OUT = "/tmp/thea-three-movements.wav";
writeFileSync(OUT, Buffer.concat([head, data]));

const abc = `X:1\nT:Thea — three movements (arranged, not invented)\nM:4/4\nL:1/4\nK:C\nV:1\n${whole.sections.map((s) => s.text).join(" | ")} |]\nV:2\n${`G, `.repeat(sounded.length).trim()} (drone)`;
console.log("movements:", whole.sections.map((s) => s.id).join(","));
console.log("order:", whole.orderNote);
console.log("transits:", whole.sections.map((s) => `${s.transition}(${TRANSIT_FALLBACK[s.transition] ?? s.transition})`).join(", "));
console.log("arc:", whole.arc.shape, "| freshness:", whole.arc.fresh.join(","));
console.log("sounded:", sounded.length, "melody + drone | leaked:", leaked.length, leaked.join(",") || "none");
console.log("gaps:", whole.gaps.length, "| closes on:", sounded.at(-1));
console.log("ABC:\n" + abc);
console.log(`WAV: ${OUT} (${total.toFixed(1)}s)`);
if (leaked.length) { console.error("FAIL: unhanded pitches sounded"); process.exitCode = 1; }
if (!whole.gaps.length) { console.error("FAIL: the F# phrase should be a gap"); process.exitCode = 1; }
if (sounded.at(-1) !== "G") { console.error("FAIL: no home cadence"); process.exitCode = 1; }
