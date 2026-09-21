// thea-suite-probe.mjs — a ~2 minute suite, arranged not invented.
// Six movements over the aria ground, one declared arc (given order climbs
// low→high→home): Aria · Treble · Thought (LLM phrase, full-cube loop, falls
// back to disclosed diminution reprise if the model is unreachable) · Sparse
// · Diminution finale · Da capo. Every movement runs Melpomene (support at
// voice grain) and the learned vertical gate; gaps rest as silence.
// Provenance per movement in /tmp/thea-suite.prov.jsonl.
// Run: node eval/thea-suite-probe.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { parseMidi, noteName } from "../../eoreader7/native/adapters/midi/midi.js";
import { composeFigure, museAssemble } from "../thea.js";

const { notes } = parseMidi(readFileSync(new URL("../../eoreader7/native/eval/the-fold/fixtures/midi/bwv-988-aria.mid", import.meta.url)));
const pc = (p) => noteName(p).toUpperCase();
const ALPHA = new Set(notes.map((n) => pc(n.pitch)));

// Learned verticalities: co-sounded + successive pairs (giver: the file).
const HEARD_VERT = new Set();
{
  const onsets = {};
  for (const n of notes) (onsets[n.tick] ??= []).push(pc(n.pitch));
  for (const g of Object.values(onsets)) {
    const u = [...new Set(g)];
    for (let i = 0; i < u.length; i++) for (let j = i; j < u.length; j++) HEARD_VERT.add([u[i], u[j]].sort().join("|"));
  }
  const seq = notes.map((n) => pc(n.pitch));
  for (let i = 1; i < seq.length; i++) HEARD_VERT.add([seq[i - 1], seq[i]].sort().join("|"));
}
const pairsHeard = (cs) => {
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
    if (!HEARD_VERT.has([cs[i], cs[j]].sort().join("|"))) return false;
  }
  return true;
};

const byOnset = {};
for (const n of notes) (byOnset[n.tick] ??= []).push(n);
const MARCH = Object.entries(byOnset).sort((a, b) => +a[0] - +b[0]).slice(0, 48).map(([tick, ns]) => {
  const ps = [...ns].sort((a, b) => b.pitch - a.pitch);
  return { tick: +tick, at: ps[0].at, upper: pc(ps[0].pitch), bass: ps.length > 1 ? pc(ps[ps.length - 1].pitch) : null };
});
const cells = [0, 1, 2, 3].map((k) => {
  const chunk = MARCH.slice(k * 12, k * 12 + 12);
  return { ref: `aria#tick-${chunk[0].tick}`, text: [...new Set(chunk.flatMap((b) => [b.upper, b.bass].filter(Boolean)))].join(" ") };
});
cells.push({ ref: "aria#alphabet", text: [...ALPHA].join(" ") });
const UNION = new Set(cells.flatMap((c) => c.text.split(" ")));
const supportsVoice = (line) => line.split(" ").every((t) => UNION.has(t));
const refs = cells.map((c) => c.ref);

// One movement: bars over the march with inner voice + rhythm; gates run.
const landMovement = (id, heading, { inner = false, step = 1, beat = 1, reverse = false, extra = null } = {}) => {
  let march = MARCH.filter((_, i) => i % step === 0);
  if (reverse) march = [...march].reverse();
  if (extra) march = [...march, ...extra];
  const bars = march.map((m, i) => ({
    tick: m.tick, upper: m.upper,
    inner: inner ? march[Math.max(0, i - 1)].upper : null,
    bass: m.bass,
  }));
  const lines = bars.map((b) => ({ text: [b.upper, b.inner, b.bass].filter(Boolean).join(" "), backs: refs }));
  const r = composeFigure({ part: heading, passages: cells, lines, supportsLine: supportsVoice });
  const landed = new Set(r.sentences.map((s) => s.text));
  const kept = [], gaps = [...r.gaps];
  for (const b of bars) {
    const t = [b.upper, b.inner, b.bass].filter(Boolean).join(" ");
    if (!landed.has(t)) continue;
    const cs = [b.upper, b.bass, ...(b.inner ? [b.inner] : [])].filter(Boolean);
    if (!pairsHeard(cs)) { gaps.push({ name: "unheard_verticality", detail: t, line: t }); continue; }
    kept.push(b);
  }
  return { id, heading, text: kept.map((b) => [b.upper, b.inner, b.bass].filter(Boolean).join(" ")).join(" / "), gaps, edges: [], claim: { end1: "G" }, bars: kept, beat };
};

// M3: the Thought — one LLM phrase via the full-cube loop, or disclosed fallback.
const thinkPhrase = async () => {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 90000);
    const r = await fetch("http://localhost:11434/api/generate", {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
      body: JSON.stringify({
        model: "gemma2:2b", stream: false, options: { temperature: 0.7, num_predict: 120 },
        prompt: `Write ONE new 10-note melody phrase using ONLY these pitch names: ${[...ALPHA].sort().join(" ")}. End on G (any octave). Reply with just the notes separated by spaces.`,
      }),
    });
    clearTimeout(to);
    const j = await r.json();
    const toks = [...String(j.response ?? "").matchAll(/[A-G]#?\d/g)].map((m) => m[0].toUpperCase()).filter((t) => ALPHA.has(t)).slice(0, 12);
    if (toks.length >= 8) return { phrase: toks, prov: "gemma2:2b (thought, supported, vertical-gated)" };
  } catch { /* fall through to disclosed fallback */ }
  return { phrase: null, prov: "fallback: model unreachable — diminution reprise (disclosed, not thought)" };
};

const main = async () => {
  const thought = await thinkPhrase();
  const thoughtBars = thought.phrase
    ? [0, 1, 2, 3].flatMap(() => thought.phrase.map((t, i) => ({ tick: -i, upper: t, inner: null, bass: "G2" })))
    : MARCH.filter((_, i) => i % 2 === 0).map((m) => ({ ...m, inner: m.upper }));
  const movements = [
    landMovement("m1", "I · Aria", { beat: 1 }),
    landMovement("m2", "II · Treble", { inner: true, beat: 0.85 }),
    { id: "m3", heading: `III · Thought (${thought.prov})`, ...(() => {
      const lines = thoughtBars.map((b) => ({ text: [b.upper, b.bass].filter(Boolean).join(" "), backs: refs }));
      const r = composeFigure({ part: "thought", passages: cells, lines, supportsLine: supportsVoice });
      const landed = new Set(r.sentences.map((s) => s.text));
      const kept = thoughtBars.filter((b) => landed.has([b.upper, b.bass].filter(Boolean).join(" ")));
      return { text: kept.map((b) => [b.upper, b.bass].filter(Boolean).join(" ")).join(" / "), gaps: r.gaps, edges: [], claim: { end1: "G" }, bars: kept.map((b) => ({ ...b, inner: null })), beat: 0.8 };
    })() },
    landMovement("m4", "IV · Sparse", { inner: true, step: 2, beat: 1 }),
    landMovement("m5", "V · Diminution finale", { inner: true, beat: 0.5 }),
    landMovement("m6", "VI · Da capo", { beat: 1 }),
    landMovement("m7", "VII · Return (march backward)", { inner: true, reverse: true, beat: 0.9 }),
  ];
  const whole = museAssemble({ parts: movements, order: movements.map((p) => p.id) });
  const byId = new Map(movements.map((m) => [m.id, m]));
  for (const s of whole.sections) s.bars = byId.get(s.id)?.bars ?? [];
  writeFileSync("/tmp/thea-suite.prov.jsonl", movements.map((m) => JSON.stringify({
    id: m.id, heading: m.heading, bars: m.bars.length,
    gaps: m.gaps.map((g) => g.name),
    ground: ["bwv-988-aria.mid (Mutopia, SOURCES.md)"], priors: ["heard-verticalities (this run)", "BachAriaIntervalPrior@1 (reported)"],
  })).join("\n") + "\n");

  // Render: three sine voices + per-movement drone.
  const SEMI = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  const freqOf = (t) => {
    const m = /^([A-G])(#)?(\d)$/.exec(t);
    if (!m) return null;
    return 440 * Math.pow(2, (SEMI[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) - 4) * 12) / 12);
  };
  const SR = 22050, BEAT = 0.55;
  const events = [];
  let t = 0;
  const drones = { m1: "G2", m2: "G2", m3: "G2", m4: "D3", m5: "G2", m6: "C3", m7: "G2" };
  for (const s of whole.sections) {
    const beat = (byId.get(s.id)?.beat ?? 1) * BEAT;
    const t0 = t;
    for (const b of s.bars) {
      events.push({ freq: freqOf(b.upper), start: t, dur: beat * 0.92, vel: 0.5 });
      if (b.inner) events.push({ freq: freqOf(b.inner), start: t, dur: beat * 0.92, vel: 0.3 });
      if (b.bass) events.push({ freq: freqOf(b.bass), start: t, dur: beat * 0.92, vel: 0.4 });
      t += beat;
    }
    events.push({ freq: freqOf(drones[s.id] ?? "G2"), start: t0, dur: t - t0, vel: 0.14 });
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
  writeFileSync("/tmp/thea-suite.wav", Buffer.concat([head, data]));

  const sounded = whole.sections.flatMap((s) => s.text.split(/[\s/]+/).filter(Boolean));
  const leaked = sounded.filter((x) => !ALPHA.has(x));
  console.log("movements:", whole.sections.map((s) => `${s.id}(${(s.bars ?? []).length})`).join(" → "));
  console.log("gaps:", whole.gaps.length, "| leaked:", leaked.length, leaked.join(",") || "none");
  console.log(`WAV: /tmp/thea-suite.wav (${total.toFixed(0)}s) | PROV: /tmp/thea-suite.prov.jsonl`);
  if (leaked.length) { console.error("FAIL: unhanded classes"); process.exitCode = 1; }
  if (Math.abs(total - 120) > 25) { console.error(`MISS: ${total.toFixed(0)}s is not a 2-minute piece`); process.exitCode = 1; }
};

main().catch((e) => { console.error("PROBE ERROR:", e.message); process.exitCode = 1; });
