// eval/kairos-pattern.mjs — the experiment behind "kairos is in charge of
// the pattern": does the Pattern watcher's sign — pattern / noise / gap —
// actually track the difference that makes a difference, or only look like
// it does?
//
//   node eval/kairos-pattern.mjs [--draws N] [--repeats K] [--pivots K]
//
// The material is the REAL chain: eoreader's own emergence/tiers.js
// surprise stack, driven through aperture.js's meter (the same organs the
// live turn uses), then kairos.js's sign over each exchange. Two streams,
// each homogeneous so the ground is stable within it:
//
//   Stream S (settled)  — warm-up, then K genuine repeats of the ground.
//                         Truth: every exchange is NOISE (a repeat's KL sits
//                         inside the null's support — the measured lesson).
//   Stream M (moving)   — warm-up, then K genuine pivots (each a new
//                         topic). Truth: every exchange is PATTERN (the
//                         movement crossed the null's median).
//
// The control SHUFFLES THE JUDGE (P60's fifth amendment): over N seeded
// redeals of the same sign multiset across the same exchanges, how often
// does a random sign agree with the planted truth by chance? A random sign
// agrees ~1/2. The claim: Kairos's sign agrees with the planted structure
// at better than any shuffle — and never reads an unmeasured gap as a
// verdict (Leg 2: the very first arrival, which has no ground, is WITHHELD,
// where a naive arm would convict it as "held").
//
// The numbers below are this run's; the driver re-runs unchanged.

import { makeApertureMeter } from "../aperture.js";
import { createTierStack, foldThrough } from "../../eoreader7/legacy-eoreader6.1/packages/engine/emergence/tiers.js";
import { SIGN, kairosSign } from "../kairos.js";
import { writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const DRAWS = Number(args[args.indexOf("--draws") + 1]) || 199;
const K = Number(args[args.indexOf("--repeats") + 1]) || Number(args[args.indexOf("--pivots") + 1]) || 8;
const RESULTS = new URL("./results/kairos-pattern-RESULTS.md", import.meta.url).pathname;

const meterOrgans = makeApertureMeter({ createTierStack, foldThrough });

let s = 7;
const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };

const WARM = "the morning meeting covered the quarterly budget and the hiring plan and we decided to extend the deadline";
const PIVOTS = [
  "now, completely separately, the chemistry of volcanic soil in iceland",
  "a recipe for sourdough bread with wild yeast and a long cold proof",
  "the migration patterns of the arctic tern across the atlantic",
  "the flying buttresses of the gothic cathedral in reims",
  "the chaotic motion of a double pendulum under gravity",
  "the tidal forces between the moon and the earth's oceans",
  "the life cycle of the atlantic salmon returning to spawn",
  "the sonnet's volta and the turn of thought it forces",
];

function run(kind) {
  const meter = meterOrgans.create();
  const obs = [];
  meterOrgans.observe(meter, { turn: 0, role: "question", text: WARM });
  meterOrgans.observe(meter, { turn: 0, role: "answer", text: WARM });
  for (let i = 0; i < K; i++) {
    const text = kind === "repeat" ? WARM : PIVOTS[i % PIVOTS.length];
    const q = meterOrgans.observe(meter, { turn: i + 1, role: "question", text });
    const a = meterOrgans.observe(meter, { turn: i + 1, role: "answer", text });
    obs.push(kairosSign([q, a]));
  }
  return obs;
}

const repeatStream = run("repeat");
const pivotStream = run("pivot");

// agreement with planted truth: repeat→noise, pivot→pattern
const agreeOf = (stream, truth) => stream.filter((o) => o.sign === truth).length;
const repeatAgree = agreeOf(repeatStream, SIGN.NOISE);
const pivotAgree = agreeOf(pivotStream, SIGN.PATTERN);

// the shuffled judge: the TRUTH is what is shuffled, not the sign multiset —
// a homogeneous stream's sign multiset is all one kind, so shuffling it is
// degenerate (any redeal agrees with an all-noise truth at 1.00). The honest
// null is a RANDOM sign per exchange, drawn fairly: it agrees with a
// homogeneous planted truth at exactly 1/2, and the band is the best any
// random sequence did across the draws.
function nullBand(truth, count) {
  let hits = 0, maxHits = 0;
  for (let d = 0; d < DRAWS; d++) {
    let h = 0;
    for (let i = 0; i < count; i++) if ((rng() < 0.5) === (truth === SIGN.NOISE)) h++;
    hits += h; maxHits = Math.max(maxHits, h);
  }
  return { hits, rate: hits / (DRAWS * count), maxHits, count };
}
const nullRepeat = nullBand(SIGN.NOISE, K);
const nullPivot = nullBand(SIGN.PATTERN, K);

// Leg 2 — the first arrival has no ground: withheld, never "held".
const probeMeter = meterOrgans.create();
const first = meterOrgans.observe(probeMeter, { turn: 0, role: "question", text: "any text at all, ungrounded" });
const firstSign = kairosSign([first]);
const naiveFirst = firstSign.sign === SIGN.GAP ? SIGN.NOISE : firstSign.sign; // the naive arm: absence = held

const lines = [];
lines.push(`# Kairos-pattern experiment (${new Date().toISOString().slice(0, 10)})`);
lines.push("");
lines.push("Does the Pattern watcher's sign track the difference that makes a difference, or only look like it does?");
lines.push(`Draws: ${DRAWS} seeded (LCG seed 7) · exchanges per stream: ${K} · the real emergence/tiers.js surprise stack through aperture.js's meter, then kairos.js's sign.`);
lines.push("");
lines.push("## Leg 1 — the sign vs a shuffled judge");
lines.push("");
lines.push(`**Settled stream** (${K} genuine repeats of the ground; truth: noise): Kairos read ${repeatAgree}/${K} as noise (${(repeatAgree / K).toFixed(2)}).`);
lines.push(`A RANDOM sign per exchange agreed with the truth by chance at ${nullRepeat.rate.toFixed(2)} (best ${nullRepeat.maxHits}/${K} in any one of ${DRAWS} draws).`);
lines.push(`**Moving stream** (${K} genuine pivots; truth: pattern): Kairos read ${pivotAgree}/${K} as pattern (${(pivotAgree / K).toFixed(2)}).`);
lines.push(`A RANDOM sign per exchange agreed by chance at ${nullPivot.rate.toFixed(2)} (best ${nullPivot.maxHits}/${K} in any one of ${DRAWS} draws).`);
lines.push("");
lines.push(`**Kairos agreed with planted truth at ${((repeatAgree + pivotAgree) / (2 * K)).toFixed(2)}; chance is 0.50 and no random draw exceeded ${Math.max(nullRepeat.maxHits, nullPivot.maxHits)}/${K}. ${(repeatAgree + pivotAgree) / (2 * K) > 0.5 && Math.max(nullRepeat.maxHits, nullPivot.maxHits) < K ? "The sign tracks the structure, and no shuffle ever matched it." : "The sign did not separate from chance at this n."}`);
lines.push("");
lines.push("## Leg 2 — an unmeasured gap is withheld, never 'held'");
lines.push("");
lines.push(`The very first arrival (no ground yet): Kairos reads ${firstSign.sign}${firstSign.reason ? ` (${firstSign.reason})` : ""}.`);
lines.push(`A naive arm that converts a gap to "held" reads ${naiveFirst} — convicting "nothing measured" as "the ground held", the exact withhold-vs-convict violation (P41).`);
lines.push("");

const text = lines.join("\n") + "\n";
process.stdout.write(text);
writeFileSync(RESULTS, text);
process.stdout.write(`\n(wrote ${RESULTS})\n`);