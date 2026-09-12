// eval/meta-audit.mjs — GFP Pass 38: the pattern acts themselves, scored.
// Correspondence acts (drift/reanchor/correspond) are the shadow's own
// operations; this driver PREQUENTIALLY re-opens them — when an address a
// pattern act repaired is later reopened, does it HOLD? A drift rate per
// source over time; the null is the rate of `apart` on sources never touched.
//
//   node eval/meta-audit.mjs [--passages N] [--probes N]
import { readFileSync } from "node:fs";
import { Field, tokensOf, isWord } from "../relative.js";
import { drift, correspond, fragmentOf } from "../relative-pattern.js";
import { chunkSource } from "../source.js";

const args = process.argv.slice(2);
const want = Number(args[args.indexOf("--passages") + 1]) || 400;
const nProbes = Number(args[args.indexOf("--probes") + 1]) || 60;

const ROOT = new URL("../", import.meta.url).pathname;
// Normalize the newlines FIRST (chunkSource's refs are against its normalized
// copy; the raw Gutenberg file is CRLF — P5.2, offsets must resolve).
const text = readFileSync(`${ROOT}pg2600.txt`, "utf8").replace(/\r\n/g, "\n");
const chunks = chunkSource("pg2600.txt", text).filter((c) => tokensOf(c.text).filter(isWord).length >= 8).slice(0, want);
let s = 7; const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };

const source = { "pg2600.txt": text };
const field = new Field();
for (const c of chunks) field.admit(c.text, { source: "pg2600.txt", at: c.ref });

const sample = chunks.filter((_, i) => i % Math.max(1, Math.floor(chunks.length / nProbes)) === 0).slice(0, nProbes);
// Mint the acts: HALF the probes see a renamed+prefaced source (repaired);
// the other half see the intact source (agree).
const prefaced = { "pg2600_v2.txt": "PREFACE ".repeat(80) + text };
const acts = [];
for (let i = 0; i < sample.length; i++) {
  const g = sample[i];
  const c = correspond(g.ref, g.text, field, i % 2 ? prefaced : source, { draws: 80 });
  acts.push({ at: g.ref, note: g.text, verdict: c.kind, atNow: c.at ?? g.ref, touched: Boolean(i % 2) });
}
// PREQUENTIAL RE-OPEN: drift every act's address against the CURRENT sources
// (the same ones) — did a repaired address HOLD? did an agree stay exact?
let heldRepairs = 0, repairs = 0, apartRepairs = 0, agreed = 0, apartUntouched = 0;
for (const a of acts) {
  if (a.touched) {
    repairs += 1;
    const d = drift(a.atNow, a.note, prefaced);
    if (d.kind === "exact") heldRepairs += 1; else apartRepairs += 1;
  } else {
    const d = drift(a.at, a.note, source);
    if (d.kind === "exact") agreed += 1; else apartUntouched += 1;
  }
}
const pad = (x, n) => String(x).padStart(n);
console.log(`GFP Pass 38 — the pattern acts, scored (${sample.length} acts minted, ${repairs} repaired, ${sample.length - repairs} untouched)\n`);
console.log(`  minted acts: agree ${acts.filter((a) => !a.touched && a.verdict === "agree").length}, repaired ${acts.filter((a) => a.touched && a.verdict === "repaired").length}, apart ${acts.filter((a) => a.verdict === "apart").length}`);
console.log(`  RE-OPENED: repaired acts that HELD (now exact): ${heldRepairs}/${repairs}   apart again: ${apartRepairs}`);
console.log(`  untouched sources: stayed exact ${agreed}, went apart ${apartUntouched} — the NULL (must be ~0: an untouched source does not drift)`);
console.log(`\n  drift rate on touched sources: ${((apartRepairs / Math.max(1, repairs)) * 100).toFixed(1)}% — the pattern acts report on themselves, on the record.`);