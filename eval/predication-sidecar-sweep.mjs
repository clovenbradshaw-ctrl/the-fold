#!/usr/bin/env node
// predication-sidecar-sweep.mjs — run the composite/predication split over
// live_priors' OWN stored readings, and report what it finds.
//
// NEVER A COLD RE-READ (user direction, 2026-09-01: "we should not be reading
// anything cold"; LP2's own frame: "a reading of a source is a record of an
// encounter with it by a named reader... accumulating rather than
// overwriting"). This driver opens no source file and runs no extractor. It
// reads the `.eot.json` sidecars that already sit beside the corpus — every
// arrangement in them was extracted once, span-self-verified against the
// source's own raw bytes at that time, and admitted through
// hyperlexicon.js's own gate. Asking this question by re-extracting would be
// slower AND would be a different reading than the one on record.
//
// A re-runnable eval driver, not a committed regression test — the same
// posture P19/P27 hold for their own drivers.
//
//   node eval/predication-sidecar-sweep.mjs [--alpha 0.05] [--min 2] [--limit N]

import fs from "node:fs";
import path from "node:path";
import { typeArrangements, compositeSurface, occurrencesOf } from "../predication.js";

const LP_ROOT = path.resolve(import.meta.dirname, "..", "..", "live_priors");

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
}
const ALPHA = arg("--alpha", 0.05);
const MIN_OCCURRENCES = arg("--min", 2);
const LIMIT = arg("--limit", Infinity);

function walkSidecars(root) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (["node_modules", ".git", "scripts"].includes(e.name)) continue;
        stack.push(abs);
      } else if (e.name.endsWith(".eot.json")) {
        out.push(abs);
      }
    }
  }
  return out.sort();
}

const files = walkSidecars(LP_ROOT);
if (!files.length) {
  console.error(`no sidecars found under ${LP_ROOT} — nothing to sweep, and this driver will not invent a reading`);
  process.exit(1);
}
console.log(`sweeping ${files.length} stored readings under ${LP_ROOT}`);
console.log(`declared: minOccurrences=${MIN_OCCURRENCES}, alpha=${ALPHA}  (no source file is opened; no extractor runs)\n`);

let readings = 0;
let arrangementsSeen = 0;
let convicted = 0;
let belowFloor = 0;
let corrupt = 0;
let noFolded = 0;
const examples = [];
const pRange = { min: null, max: null };
const perSourceTop = [];
// Sidecar-quality observations worth reporting back to live_priors, gathered
// while we are already reading every one of them.
let spanVerifyImperfect = 0;
let gatedEmpty = 0;
const gates = new Map();

for (const f of files.slice(0, LIMIT)) {
  let d;
  try {
    d = JSON.parse(fs.readFileSync(f, "utf8"));
  } catch {
    corrupt += 1;
    continue;
  }
  const gate = d?.admission?.gate ?? "?";
  gates.set(gate, (gates.get(gate) ?? 0) + 1);

  const sv = d?.spanSelfVerification;
  if (sv && Number.isFinite(sv.rawChecked) && sv.rawChecked > 0 && sv.rawOk !== sv.rawChecked) spanVerifyImperfect += 1;

  const folded = Array.isArray(d?.folded) ? d.folded : null;
  if (!folded) {
    noFolded += 1;
    continue;
  }
  if (!folded.length) {
    gatedEmpty += 1;
    continue;
  }

  readings += 1;
  arrangementsSeen += folded.length;

  const typed = typeArrangements(folded, { minOccurrences: MIN_OCCURRENCES, alpha: ALPHA });
  convicted += typed.invariant.length;
  belowFloor += typed.regime.belowFloor;

  if (typed.invariant.length) {
    const best = [...typed.invariant].sort((a, b) => b.occurrences - a.occurrences)[0];
    perSourceTop.push({
      source: path.relative(LP_ROOT, f).replace(/\.eot\.json$/, ""),
      surface: best.surface,
      occurrences: best.occurrences,
      p: best.p,
      of: folded.length,
      convicted: typed.invariant.length,
    });
    for (const c of typed.invariant) {
      pRange.min = pRange.min === null ? c.p : Math.min(pRange.min, c.p);
      pRange.max = pRange.max === null ? c.p : Math.max(pRange.max, c.p);
      if (examples.length < 25) examples.push({ node: c.surface, n: c.occurrences, p: c.p, src: path.basename(f, ".eot.json") });
    }
  }
}

console.log("=== WHAT THE STORED READINGS HOLD ===");
console.log(`  sidecars parsed          ${readings + gatedEmpty + noFolded + corrupt}`);
console.log(`  with arrangements        ${readings}`);
console.log(`  empty (nothing admitted) ${gatedEmpty}`);
console.log(`  no folded[] at all       ${noFolded}`);
console.log(`  unparseable              ${corrupt}`);
console.log(`  arrangements examined    ${arrangementsSeen}`);
console.log(`  admission gates          ${JSON.stringify(Object.fromEntries(gates))}`);

console.log("\n=== WHAT THIS ORGAN FOUND ===");
console.log(`  invariant convicted      ${convicted}  (${((100 * convicted) / Math.max(1, arrangementsSeen)).toFixed(2)}% of arrangements)`);
if (pRange.min !== null)
  console.log(`  p across ALL convicted   ${pRange.min.toExponential(1)} .. ${pRange.max.toExponential(1)}  (declared alpha ${ALPHA})`);
console.log(`  below recurrence floor   ${belowFloor}  (${((100 * belowFloor) / Math.max(1, arrangementsSeen)).toFixed(2)}%)`);
console.log(`  predications detected    none — this organ convicts composition only, and never reads`);
console.log(`                           "varying ends" as evidence of anything`);

if (examples.length) {
  // The superseded headline said "these are NAMES, and should be NODES".
  // The measurement retracted it: convictions are dominated by the UDHR's
  // "Everyone has the right to..." frame across dozens of languages and the
  // Quran's Surah 55 refrain (25x). A refrain is not a referent. The finding
  // is INVARIANT RECURRENCE, and whether an invariant is a thing is a further
  // question this sweep does not settle.
  console.log("\n=== INVARIANT (arrangements that recur unchanged — refrain / formula / name, undistinguished) ===");
  for (const e of examples) console.log(`  ${String(e.n).padStart(3)}x  p=${e.p.toExponential(1).padStart(8)}  "${e.node.slice(0, 72)}"   [${e.src.slice(0, 28)}]`);
}

if (perSourceTop.length) {
  console.log("\n=== SOURCES WITH THE MOST-RECURRING INVARIANT ===");
  for (const r of perSourceTop.sort((a, b) => b.occurrences - a.occurrences).slice(0, 12))
    console.log(`  ${String(r.occurrences).padStart(3)}x  ${r.convicted}/${r.of} convicted  "${r.surface.slice(0, 52)}"  — ${r.source.slice(0, 46)}`);
}

// ── Reporting back to live_priors, per the same direction ────────────────
console.log("\n=== SIDECAR QUALITY, OBSERVED WHILE SWEEPING (report back to live_priors) ===");
console.log(`  sidecars whose spans did not fully self-verify: ${spanVerifyImperfect}`);
console.log(`  sidecars carrying no folded[] array:            ${noFolded}`);
console.log(`  unparseable sidecars:                           ${corrupt}`);
if (!spanVerifyImperfect && !corrupt) {
  console.log("  → nothing wrong found in the stored readings themselves on these axes.");
}
