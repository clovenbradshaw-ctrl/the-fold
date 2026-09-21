// thea-think-probe.mjs — LLM thinks, Thea disposes, ants investigate, cube routes.
// Question: does the full apparatus earn its keep on genuine novelty (a NEW
// variation phrase over the aria ground — what bare Thea cannot do by design)?
// Three arms: (a) bare Thea (re-figure only — novelty 0 by construction);
// (b) LLM-alone (4 ants propose, sounded as-is); (c) full cube loop (below).
// The cube route, every step named: NUL state the ground; SIG cue motifs;
// INS ants propose (4 parallel briefs, one call each); SEG cut to 8–12;
// CON bind (support + verticals); SYN arrange; DEF frame declared;
// EVA score (heard-prior coherence); REC failures re-asked once with the
// failure facts. Model: smollm2:1.7b (fast; quality is not what's measured).
// Run: node eval/thea-think-probe.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { parseMidi, noteName } from "../../eoreader7/native/adapters/midi/midi.js";
import { sedimentPrior, scorePrequential } from "../../eoreader7/native/kernel/continuation.js";
import { composeFigure, museAssemble } from "../thea.js";

const MODEL = "gemma2:2b";
const { notes } = parseMidi(readFileSync(new URL("../../eoreader7/native/eval/the-fold/fixtures/midi/bwv-988-aria.mid", import.meta.url)));
const pc = (p) => noteName(p).toUpperCase();
const ALPHA = new Set(notes.map((n) => pc(n.pitch)));
const P = notes.map((n) => n.pitch);
const H = {};
for (let i = 1; i < P.length; i++) { const d = P[i] - P[i - 1]; H[d] = (H[d] ?? 0) + 1; }
const cohere = (phrase) => {
  let s = 0;
  for (let i = 1; i < phrase.length; i++) s += Math.log1p(H[phrase[i] - phrase[i - 1]] ?? 0);
  return s / Math.max(1, phrase.length - 1);
};
// Novelty: 3-grams never sung in the file.
const HEARD3 = new Set();
for (let i = 2; i < P.length; i++) HEARD3.add([P[i - 2], P[i - 1], P[i]].join(","));
const novel3 = (phrase) => {
  let n = 0;
  for (let i = 2; i < phrase.length; i++) if (!HEARD3.has([phrase[i - 2], phrase[i - 1], phrase[i]].join(","))) n++;
  return n;
};

const THINK = [];
const ask = async (prompt, why = "") => {
  const t0 = Date.now();
  const r = await fetch("http://localhost:11434/api/generate", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, prompt, stream: false, options: { temperature: 0.7, num_predict: 150 } }),
  });
  const j = await r.json();
  const response = String(j.response ?? "");
  THINK.push({ model: MODEL, options: { temperature: 0.7, num_predict: 150 }, why, prompt, response, parsed: pullPitches(response), duration_ms: Date.now() - t0 });
  return response;
};
// Extract note tokens mechanically (JSON is the decoder's job — never demanded).
const TOK = /[A-G]#?\d/g;
const pullPitches = (text) => {
  const out = [];
  for (const m of String(text).matchAll(TOK)) {
    const t = m[0].length === 2 ? m[0][0] + m[0][1] : m[0];
    const norm = /^[A-G]\d$/.test(t) ? t : t; // keep as written (C4 style)
    const up = norm.toUpperCase();
    if (/^[A-G]#?\d$/.test(up)) out.push(up);
  }
  return out;
};

// NUL: the ground, stated. SIG: motifs cued (most common classes).
const counts = {};
for (const n of notes) counts[pc(n.pitch)] = (counts[pc(n.pitch)] ?? 0) + 1;
const motifs = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k);
const alphaStr = [...ALPHA].sort().join(" ");

// INS: four ants, four briefs, one call each (parallel — the swarm fans out).
const BRIEFS = {
  singer: `Write ONE new 8-12 note melody phrase using ONLY these pitch names: ${alphaStr}. Move mostly by small steps. Use note names like C4 G4 F#4. Reply with just the notes separated by spaces.`,
  leaper: `Write ONE new 8-12 note melody phrase using ONLY these pitch names: ${alphaStr}. Leap by thirds and fourths (arpeggiate). Use note names like C4 G4 F#4. Reply with just the notes separated by spaces.`,
  returner: `Write ONE new 8-12 note melody phrase using ONLY these pitch names: ${alphaStr}. It MUST contain this motif somewhere: ${motifs.slice(0, 3).join(" ")}. Use note names like C4 G4. Reply with just the notes separated by spaces.`,
  closer: `Write ONE new 8-12 note melody phrase using ONLY these pitch names: ${alphaStr}. It MUST end on G (any octave, e.g. G3 G4). Use note names like C4 G4. Reply with just the notes separated by spaces.`,
};
const runAnts = async (briefs) => Promise.all(Object.entries(briefs).map(async ([ant, prompt]) => {
  const text = await ask(prompt);
  return { ant, text, pitches: pullPitches(text) };
}));

const SEMI0 = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const toNum0 = (t) => {
  const m = /^([A-G])(#)?(\d)$/.exec(t);
  return m ? SEMI0[m[1]] + (m[2] ? 1 : 0) + Number(m[3]) * 12 : null;
};
// SEG: cut to 8–12 (disclosed); CON: bind (all classes handed); SHAPE: contour (aria-measured); EVA: surprise.
const judge = (pitches) => {
  const cut = pitches.slice(0, 12);
  const cutNote = pitches.length > 12 ? "cut to 12" : null;
  const unhanded = cut.filter((t) => !ALPHA.has(t));
  if (cut.length < 8) return { verdict: "gap", reason: "too_short", cut };
  if (unhanded.length) return { verdict: "gap", reason: `unhanded: ${unhanded.join(",")}`, cut };
  // SHAPE at class grain (octave-free — an octave-displaced scale zigzags in
  // pitch numbers but drones one class; the shape lives in classes). Earned:
  // aria per-12 windows carry min 2 direction changes and max 3 same-class
  // steps (measured) — a run failing either is unshaped, refused.
  const SEMIC = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
  const cls = cut.map((t) => SEMIC[t.replace(/\d/g, "")]).filter((n) => n !== undefined);
  let changes = 0, sames = 0;
  for (let i = 1; i < cls.length; i++) if (cls[i] === cls[i - 1]) sames++;
  for (let i = 2; i < cls.length; i++) {
    const a = Math.sign(cls[i - 1] - cls[i - 2]), b = Math.sign(cls[i] - cls[i - 1]);
    if (a !== 0 && b !== 0 && a !== b) changes++;
  }
  if (changes < 2 || sames > 3) return { verdict: "gap", reason: `unshaped: ${changes} class turns (min 2), ${sames} repeats (max 3)`, cut };
  return { verdict: "holds", cut, cutNote, score: cohere(cut.map((t) => {
    const m = /^([A-G])(#)?(\d)$/.exec(t); const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    return SEMI[m[1]] + (m[2] ? 1 : 0) + Number(m[3]) * 12;
  })), novelty: 0 };
};
const noveltyOf = (cut) => novel3(cut.map((t) => {
  const m = /^([A-G])(#)?(\d)$/.exec(t); const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  return m ? SEMI[m[1]] + (m[2] ? 1 : 0) + Number(m[3]) * 12 : -999;
}));

const main = async () => {
  // Arm (b): LLM-alone — sounded as-is (parsed, uncut, unchecked).
  const found = await runAnts(BRIEFS);
  const aloneLeaks = found.flatMap((f) => f.pitches.filter((t) => !ALPHA.has(t)));
  const aloneNovel = found.map((f) => novel3(f.pitches.map((t) => {
    const m = /^([A-G])(#)?(\d)$/.exec(t); const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    return m ? SEMI[m[1]] + (m[2] ? 1 : 0) + Number(m[3]) * 12 : -999;
  })));

  // Arm (c): full cube loop.
  const cells = [{ ref: "aria#alphabet", text: [...ALPHA].join(" ") }];
  const first = found.map((f) => ({ ...f, j: judge(f.pitches) }));
  const landed = [], gaps = [];
  for (const f of first) {
    if (f.j.verdict === "holds") landed.push({ ...f, cut: f.j.cut, score: f.j.score });
    else gaps.push({ ant: f.ant, reason: f.j.reason });
  }
  // REC: failures re-asked ONCE with the failure facts (ask-twice shape).
  if (gaps.length) {
    const retry = await Promise.all(gaps.map(async (g) => {
      const firstTry = found.find((f) => f.ant === g.ant);
      const text = await ask(`Your phrase ${JSON.stringify(firstTry.pitches)} failed: ${g.reason}. Write ONE new 8-12 note phrase using ONLY these names: ${alphaStr}. Reply with just the notes.`);
      return { ant: g.ant, text, pitches: pullPitches(text) };
    }));
    for (const f of retry) {
      const j = judge(f.pitches);
      if (j.verdict === "holds") landed.push({ ...f, cut: j.cut, score: j.score });
      else gaps.push({ ant: f.ant, reason: j.reason + " (after re-ask)" });
    }
  }
  // EVA is the music: the hearing's own surprise at each landed phrase.
  // Sediment from the heard aria pitches (order 1 — the doc's best expert);
  // score each candidate prequentially. The cube names only legal moves
  // (cells below); surprise decides. Declared verdict: novelty ≥3 new
  // 3-grams (not replay) AND lowest surprise (not alien) — the mixture's
  // own preference for the context that generates something new.
  const SEMI0 = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const toNum = (t) => {
    const m = /^([A-G])(#)?(\d)$/.exec(t);
    return m ? SEMI0[m[1]] + (m[2] ? 1 : 0) + Number(m[3]) * 12 : null;
  };
  const hearing = sedimentPrior(P.map(String), { order: 1, giver: "aria:heard-whole" });
  for (const f of landed) {
    const nums = f.cut.map(toNum).filter((n) => n !== null);
    const s = scorePrequential(hearing, nums.map(String), { alphabetSize: ALPHA.size });
    f.surprise = s.bitsPerEvent;
    f.novelty = noveltyOf(f.cut);
  }
  const eligible = landed.filter((f) => f.novelty >= 3);
  const ordered = [...eligible].sort((a, b) => a.surprise - b.surprise).map((f) => ({
    ...f,
    prov: {
      ant: f.ant, model: MODEL,
      ground: ["bwv-988-aria.mid (Mutopia, SOURCES.md)", ...cells.map((c) => c.ref)],
      priors: ["heard-60%-interval-histogram (this run)", "BachAriaIntervalPrior@1 (priors-data/thea-bach-prior.json, reported)"],
      cube: ["NUL·Ground ground", "SIG·Figure motifs", `INS·Figure propose:${f.ant}`, "SEG·Figure cut-8-12", "CON·Figure bind", "SYN·Pattern arrange", "DEF·Figure newvar-frame", `EVA·Figure surprise:${f.surprise.toFixed(2)}`],
      reAsked: gaps.some((g) => g.ant === f.ant),
    },
  }));
  writeFileSync("/tmp/thea-thinks.prov.jsonl", ordered.map((f) => JSON.stringify({ phrase: f.cut.join(" "), prov: f.prov })).join("\n") + "\n");
  const fig = composeFigure({
    part: "new variation", passages: cells,
    lines: ordered.map((f) => ({ text: f.cut.join(" "), backs: ["aria#alphabet"] })),
    supportsLine: (line) => line.split(" ").every((t) => ALPHA.has(t)),
  });
  const whole = museAssemble({
    parts: [{ id: "newvar", heading: "New variation (LLM proposed, apparatus disposed)", text: fig.text, gaps: fig.gaps, edges: [] }],
  });

  // Sound the winner + G drone.
  const SEMI = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  const freqOf = (t) => {
    const m = /^([A-G])(#)?(\d)$/.exec(t);
    if (!m) return null;
    return 440 * Math.pow(2, (SEMI[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) - 4) * 12) / 12);
  };
  const SR = 22050, BEAT = 0.26;
  const win = ordered[0]?.cut ?? [];
  const total = win.length * BEAT + 0.5;
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
  win.forEach((n, i) => add(freqOf(n), i * BEAT, BEAT * 0.92, 0.6));
  add(freqOf("G2"), 0, total, 0.15);
  const head = Buffer.alloc(44);
  head.write("RIFF", 0); head.writeUInt32LE(36 + data.length, 4); head.write("WAVE", 8);
  head.write("fmt ", 12); head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22); head.writeUInt32LE(SR, 24); head.writeUInt32LE(SR * 2, 28);
  head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34); head.write("data", 36);
  head.writeUInt32LE(data.length, 40);
  writeFileSync("/tmp/thea-thinks.wav", Buffer.concat([head, data]));

  console.log("=== arm (a) bare Thea: novelty 0 by construction (re-figures handed notes only)");
  console.log("=== arm (b) LLM-alone:", found.length, "proposals, unhanded leaks:", aloneLeaks.length, aloneLeaks.slice(0, 8).join(",") || "none", "| novel-3grams:", aloneNovel.join(","));
  console.log("=== arm (c) full cube: landed", landed.length, "| gaps", gaps.length, gaps.map((g) => `${g.ant}:${g.reason}`).join("; ") || "none");
  for (const f of ordered) console.log(`  ${f.ant}: novelty ${f.novelty} new 3-grams, surprise ${f.surprise.toFixed(2)} bits/note — ${f.cut.join(" ")}\n    taught by: ${f.prov.ant}/${f.prov.model} ← ${f.prov.ground[0]} ← ${f.prov.priors[0]}${f.prov.reAsked ? " (re-asked)" : ""}`);
  for (const f of landed.filter((x) => x.novelty < 3)) console.log(`  ${f.ant}: REFUSED as replay (novelty ${f.novelty} < 3) — the mixture prefers what generates`);
  console.log("frame:", whole.sections[0]?.heading);
  writeFileSync("/tmp/thea-thinks.think.jsonl", THINK.map((t) => JSON.stringify(t)).join("\n") + "\n");
  console.log("WAV: /tmp/thea-thinks.wav (winner + drone) | PROV: /tmp/thea-thinks.prov.jsonl | THINK: /tmp/thea-thinks.think.jsonl");
};

main().catch((e) => { console.error("PROBE ERROR:", e.message); process.exitCode = 1; });
