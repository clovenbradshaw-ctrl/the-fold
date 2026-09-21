// Run the ungrounded-fact predicate over the battery, on the local model's own answers.
//   node eval/scope-battery.mjs <answers.json>
import fs from "node:fs";
import { BATTERY } from "./scope-battery-questions.mjs";
import { loadScopePriors } from "../scope-priors.mjs";
import { ungroundedFact, scopeOf } from "../scope.js";
const priors = loadScopePriors();
const answers = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const now = new Date("2026-09-19T12:00:00Z");
const split = (t) => String(t).split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
const groups = { open: BATTERY.open.map((x) => x[1]), timeless: BATTERY.timeless, past: BATTERY.past, chat: BATTERY.chat };

const turnFires = (q, a, opts = {}) => split(a).some((s) => ungroundedFact({ question: opts.noQuestion ? "" : q, sentence: s, grounds: opts.grounds ?? [], now, priors }).fires) ;
const rate = (xs) => xs.filter(Boolean).length;
const wilson = (k, n, z = 1.96) => { const p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [Math.max(0, (c - m) / d), Math.min(1, (c + m) / d)]; };
const rows = [];
const res = {};
for (const [g, qs] of Object.entries(groups)) {
  res[g] = qs.map((q) => { const a = answers[q] ?? ""; const paired = turnFires(q, a); const qOnly = ungroundedFact({ question: q, sentence: "", now, priors }).fires; rows.push({ g, q, paired, qOnly, ans: a.replace(/\s+/g, " ").slice(0, 90) }); return { paired, qOnly }; });
}
const silentN = res.timeless.length + res.past.length + res.chat.length;
const silentFires = [...res.timeless, ...res.past, ...res.chat].filter((r) => r.paired).length;
for (const r of rows) console.log(`${r.g.padEnd(8)} ${r.paired ? "FIRE  " : "silent"} ${r.qOnly ? "q:FIRE  " : "q:silent"} ${r.q}  <= ${r.ans}`);
console.log("\nfire rate  open %d/%d | timeless %d/%d | past %d/%d | chat %d/%d", rate(res.open.map((r) => r.paired)), res.open.length, rate(res.timeless.map((r) => r.paired)), res.timeless.length, rate(res.past.map((r) => r.paired)), res.past.length, rate(res.chat.map((r) => r.paired)), res.chat.length);
const w = wilson(silentFires, silentN);
console.log("FALSE-FLAG RATE on silent groups (the null): %d/%d = %s  [Wilson95 %s..%s]", silentFires, silentN, (silentFires / silentN).toFixed(3), w[0].toFixed(3), w[1].toFixed(3));
// CONTROL A: a predicate that must fail the null — "flag every question". It must show a false-flag rate far above the real one.
const naive = (q) => /\?\s*$/.test(q);
const nf = [...groups.timeless, ...groups.past, ...groups.chat].filter(naive).length;
console.log("CONTROL A (naive: flag any question mark) false-flag: %d/%d = %s  -> must be rejected", nf, silentN, (nf / silentN).toFixed(3));
// CONTROL B: give every open-now turn a DATED ground; the predicate must go silent (grounded is not ungrounded).
const dated = [{ ref: "web:example#0-80", date: "2026-09-18" }];
const cb = groups.open.filter((q) => turnFires(q, answers[q] ?? "", { grounds: dated })).length;
console.log("CONTROL B (open-now + dated ground) still fires: %d/%d -> must be 0", cb, groups.open.length);
const undated = [{ ref: "web:example#0-80" }];
console.log("CONTROL B2 (open-now + UNdated ground) fires: %d/%d -> must be %d", groups.open.filter((q) => turnFires(q, answers[q] ?? "", { grounds: undated })).length, groups.open.length, groups.open.length);
// CONTROL D (tense/anchor flip): the same open questions moved into the past with a dated anchor must go silent.
const flip = (q) => q.replace(/\bis\b/, "was").replace(/\?$/, " in 1990?");
const fd = groups.open.filter((q) => ungroundedFact({ question: flip(q), now, priors }).fires).length;
console.log("CONTROL D (open questions flipped to past + dated) still fire: %d/8 -> must be 0", fd);
// NULL C: shuffle each open question's words (seeded); structure should be needed, so the fire rate should fall.
let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
let sh = 0, tot = 0;
for (const q of groups.open) for (let k = 0; k < 20; k++) { const ws = q.replace(/\?$/, "").split(" "); for (let i = ws.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ws[i], ws[j]] = [ws[j], ws[i]]; } tot++; if (ungroundedFact({ question: ws.join(" ") + "?", sentence: "", now, priors }).fires) sh++; }
console.log("NULL C (word-shuffled open questions, 8x20; WEAK: fire signals are bag-of-features) fire rate: %d/%d = %s (real: %s)", sh, tot, (sh / tot).toFixed(3), (rate(res.open.map((r) => r.qOnly)) / res.open.length).toFixed(3));
// ABLATION: sentence only, no question context.
const so = (qs) => qs.filter((q) => turnFires(q, answers[q] ?? "", { noQuestion: true })).length;
console.log("ABLATION sentence-only (no question): open %d/8 | timeless %d/8 | past %d/5 | chat %d/5", so(groups.open), so(groups.timeless), so(groups.past), so(groups.chat));
console.log("PROBE (declared miss)", BATTERY.probe[0], "->", ungroundedFact({ question: BATTERY.probe[0], now, priors }).fires ? "FIRE" : "silent");
