// thea-goldberg-probe.mjs — a Goldberg-variation-type set in THREE voices.
// The file hands two real voices (aria track 1 upper A3–B5, track 2 lower
// D2–G4); the third (inner) is the upper's own suspension — each bar carries
// the upper's PREVIOUS note against its present one, a received Baroque
// figure built only from handed notes. Harmony is LEARNED, not tasted: every
// pitch-class pair co-sounding at one onset tick in the file is a heard
// verticality (110 multi-note onsets); a bar whose pairs all rang in the
// file lands, any other is an `unheard_verticality` gap and the bar rests —
// silence disclosed, never faked. Figures over the same ground: Aria (two
// voices as handed), Treble (inner joins), Diminution (halved bars),
// Sparse (every 2nd bar), Reordered (Calliope declared arc), Da capo.
// Run: node eval/thea-goldberg-probe.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { parseMidi, noteName } from "../../eoreader7/native/adapters/midi/midi.js";
import { composeFigure, museAssemble } from "../thea.js";

const { notes } = parseMidi(readFileSync(new URL("../../eoreader7/native/eval/the-fold/fixtures/midi/bwv-988-aria.mid", import.meta.url)));
const pc = (p) => noteName(p).toUpperCase();
const UP = notes.filter((n) => n.track === 1);
const LO = notes.filter((n) => n.track === 2);
const ALPHA = new Set(notes.map((n) => pc(n.pitch)));

// Learned verticalities: pitch-class PAIRS ever co-sounding at one onset —
// plus pairs ever SOUNDING IN SUCCESSION anywhere in the file. The second
// half is the suspension's whole license (received, measured): a delayed
// resolution verticalizes a step the file sang horizontally (the aria moves
// 29.5% stepwise — giver: thea-bach-prior.json). A pair neither struck nor
// sung together is unheard, and bars on it rest.
const HEARD_VERT = new Set();
{
  const onsets = {};
  for (const n of notes) (onsets[n.tick] ??= []).push(pc(n.pitch));
  for (const g of Object.values(onsets)) {
    const u = [...new Set(g)];
    for (let i = 0; i < u.length; i++) for (let j = i; j < u.length; j++) {
      HEARD_VERT.add([u[i], u[j]].sort().join("|"));
    }
  }
  const seq = notes.map((n) => pc(n.pitch));
  for (let i = 1; i < seq.length; i++) HEARD_VERT.add([seq[i - 1], seq[i]].sort().join("|"));
}
const pairsHeard = (classes) => {
  for (let i = 0; i < classes.length; i++) for (let j = i + 1; j < classes.length; j++) {
    if (!HEARD_VERT.has([classes[i], classes[j]].sort().join("|"))) return false;
  }
  return true;
};

// Ground: the first 48 ONSETS march in time — voices aligned by onset tick,
// never by index (index-aligned voices pair unrelated moments; the file's
// own simultaneities are the only honest verticals). Each bar keeps its
// onset's tick address.
const byOnset = {};
for (const n of notes) (byOnset[n.tick] ??= []).push(n);
const MARCH = Object.entries(byOnset).sort((a, b) => +a[0] - +b[0]).slice(0, 48)
  .map(([tick, ns]) => {
    const ps = [...ns].sort((a, b) => b.pitch - a.pitch);
    return {
      tick: +tick, at: ps[0].at,
      upper: pc(ps[0].pitch),
      bass: ps.length > 1 ? pc(ps[ps.length - 1].pitch) : null,
      mid: ps.length > 2 ? pc(ps[1].pitch) : null,
    };
  });
// Cells cover the whole march in four contiguous 12-onset chunks, so the
// hearing backs every bar it marches (union presence = each voice heard).
const cells = [0, 1, 2, 3].map((k) => {
  const chunk = MARCH.slice(k * 12, k * 12 + 12);
  return {
    ref: `aria#tick-${chunk[0].tick}`,
    text: [...new Set(chunk.flatMap((b) => [b.upper, b.mid, b.bass].filter(Boolean)))].join(" "),
  };
});
const UNION = new Set(cells.flatMap((c) => c.text.split(" ")));
// Voice grain: a bar carries one note per voice, so the word-floor of 2
// shared tokens can never apply — instead every voice's note must be handed
// SOMEWHERE in the hearing (union presence). Backs still name real cells
// (unknown refs fail upstream); which note sings which voice is the bar
// construction's own disclosed assignment.
const supportsClass = (line) => line.split(" ").every((t) => UNION.has(t));

// Bars over the march: inner suspends (previous bar's upper held against the
// present one); sparse steps by 2; reordered marches it backward by declared
// arc. Every bar carries its onset tick.
const buildBars = ({ step = 1, inner = false, reverse = false } = {}) => {
  let march = MARCH.filter((_, i) => i % step === 0);
  if (reverse) march = [...march].reverse();
  return march.map((m, i) => {
    const b = { tick: m.tick, upper: m.upper, inner: inner ? (march[Math.max(0, i - 1)].upper) : m.mid, bass: m.bass };
    const classes = [b.upper, b.bass, ...(b.inner ? [b.inner] : [])].filter(Boolean);
    b.heard = pairsHeard(classes);
    return b;
  });
};
const barLine = (b) => [b.upper, b.inner, b.bass].filter(Boolean).join(" ");

// Melpomene vertical: Figure lands the lines; unheard bars become gaps here.
const landVoices = (partId, bars, cellRefs) => {
  const lines = bars.map((b) => ({ text: barLine(b), backs: cellRefs }));
  const r = composeFigure({ part: partId, passages: cells, lines, supportsLine: supportsClass });
  const kept = [], gaps = [...r.gaps];
  const landedTexts = new Set(r.sentences.map((s) => s.text));
  bars.forEach((b) => {
    if (!landedTexts.has(barLine(b))) return; // Melpomene: unsupported, named above
    if (!b.heard) { gaps.push({ name: "unheard_verticality", detail: `this trio never rang together in the file: ${barLine(b)}`, line: barLine(b) }); return; }
    kept.push(b);
  });
  return { kept, gaps };
};

const VARIATIONS = [
  { id: "aria", name: "Aria · as handed", bars: () => buildBars({ inner: false }), beat: 1 },
  { id: "treble", name: "Var 1 · inner joins (suspension)", bars: () => buildBars({ inner: true }), beat: 1 },
  { id: "diminution", name: "Var 2 · diminution", bars: () => buildBars({ inner: true }), beat: 0.5 },
  { id: "sparse", name: "Var 3 · sparse", bars: () => buildBars({ step: 2, inner: true }), beat: 1 },
  { id: "reordered", name: "Var 4 · reordered by declared arc", bars: () => buildBars({ inner: true, reverse: true }), beat: 1 },
  { id: "dacapo", name: "Aria da capo", bars: () => buildBars({ inner: false }), beat: 1 },
];
const refs = cells.map((c) => c.ref);
const movements = VARIATIONS.map((v) => {
  const bars = v.bars();
  const { kept, gaps } = landVoices(v.id, bars, refs);
  return {
    id: v.id, heading: v.name, beat: v.beat,
    text: kept.map(barLine).join(" / "),
    gaps, edges: [], claim: { end1: "G" }, bars: kept,
  };
});
const whole = museAssemble({ parts: movements, order: movements.map((p) => p.id) });
// Bars ride caller-side: Urania's sections carry text/gaps/transits; the bars
// themselves stay with the movements by id (she never reads them).
const byId = new Map(movements.map((m) => [m.id, m]));
for (const s of whole.sections) s.bars = byId.get(s.id)?.bars ?? [];

// ── trace check: every sounded class handed ──
const sounded = whole.sections.flatMap((s) => s.text.split(/[\s/]+/).filter(Boolean));
const leaked = sounded.filter((t) => !ALPHA.has(t));

// ── render three sine voices ──
const SEMI = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
const freqOf = (t) => {
  const m = /^([A-G])(#)?(\d)$/.exec(t);
  if (!m) return null;
  return 440 * Math.pow(2, (SEMI[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) - 4) * 12) / 12);
};
const SR = 22050, BEAT = 0.24;
const events = [];
let t = 0;
for (const s of whole.sections) {
  const beat = (VARIATIONS.find((v) => v.id === s.id)?.beat ?? 1) * BEAT;
  const bars = s.bars ?? [];
  for (const b of bars) {
    events.push({ freq: freqOf(b.upper), start: t, dur: beat * 0.92, vel: 0.5 });
    if (b.inner) events.push({ freq: freqOf(b.inner), start: t, dur: beat * 0.92, vel: 0.3 });
    events.push({ freq: freqOf(b.bass), start: t, dur: beat * 0.92, vel: 0.4 });
    t += beat;
  }
  t += BEAT * 2;
}
const total = t;
const data = Buffer.alloc(Math.ceil(total * SR) * 2);
for (const e of events) {
  if (!e.freq) continue;
  const n0 = Math.floor(e.start * SR), n1 = Math.min(data.length / 2, Math.floor((e.start + e.dur) * SR));
  for (let s = n0; s < n1; s++) {
    const tt = (s - n0) / SR;
    const env = Math.min(1, tt / 0.015, (n1 - s) / SR / 0.06);
    const v = Math.floor(11000 * e.vel * env * (Math.sin(2 * Math.PI * e.freq * tt) + 0.3 * Math.sin(4 * Math.PI * e.freq * tt)));
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
const OUT = "/tmp/thea-goldberg.wav";
writeFileSync(OUT, Buffer.concat([head, data]));

const kept = whole.sections.reduce((a, s) => a + (s.bars?.length ?? 0), 0);
const vGaps = whole.gaps.filter((g) => g.name === "unheard_verticality").length;
console.log("variations:", whole.sections.map((s) => `${s.id}(${(s.bars ?? []).length} bars)`).join(" → "));
console.log("sounded classes:", sounded.length, "| leaked:", leaked.length, leaked.join(",") || "none");
console.log("vertical gaps (never rang together):", vGaps, "| other gaps:", whole.gaps.length - vGaps);
console.log(`WAV: ${OUT} (${total.toFixed(0)}s, 3 voices)`);
if (leaked.length) { console.error("FAIL: unhanded pitch classes sounded"); process.exitCode = 1; }
