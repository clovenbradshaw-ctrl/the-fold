// eval/voice-structure.mjs — the two gates that shape the claim stream BEFORE
// any mouth sees it, measured the way the experiment's own rule demands: a
// difference that makes a difference, against a null, never a mechanic
// dressed as a finding.
//
// PART A — DMD (Dynamic Mode Decomposition, eoreader7 native kernel/): the
// claim stream the spotlight hops over is a trajectory. contextualModes
// measures its OWN grain — the shallowest window at which forgetting older
// claims stops changing the decomposition (the gist size), and how many modes
// the stream excites, and how many of them oscillate (transient vs settled).
// The spotlight hops at the material's own measured grain, never a declared
// RECENCY_WINDOW.
//
// PART B — born-gate feedback: the online verdict stream (the experiment's
// dump) is an EVIDENCE CHANNEL for the Born gate (P40's reviewEntities). A
// subject whose claims are never voiceable — the mouth can only echo its
// fragment — is a case where NO mouth can make a difference; the
// difference-maker is the lapse. Grouped per subject, honestly: which
// subjects are debris, and what lapsing them would change.
//
//   node eval/voice-structure.mjs [--claims N] [--probes N] [--passages N]
import { readFileSync, existsSync } from "node:fs";
import { chunkSource } from "../source.js";
import { makeRelationReader, makeReferentIndex } from "../../eoreader7/native/organs/index.js";
import { expectationFrom } from "../dialogue.js";
import { contextualModes } from "../../eoreader7/native/adapters/text/contextual-dmd.js";

const args = process.argv.slice(2);
const num = (k, d) => { const i = args.indexOf(k); return i === -1 ? d : Number(args[i + 1]) || d; };
const wantClaims = num("--claims", 40);
const nProbes = num("--probes", 10);
const wantPassages = num("--passages", 120);

const organs = {
  splitSentences: (await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/spans.js")).splitSentences,
  extractSurfaces: (await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js")).extractSurfaces,
  discoverReferents: (await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js")).discoverReferents,
  namesCorefer: (await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js")).namesCorefer,
  diaNorm: (await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js")).diaNorm,
  discoverRelationVocab: (await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/relations.js")).discoverRelationVocab,
  extractRelations: (await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/relations.js")).extractRelations,
  tokenize: (await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/material.js")).tokenize,
};
const relationsFor = makeRelationReader(organs);
const indexFor = makeReferentIndex(organs);

const ROOT = new URL("../", import.meta.url).pathname;
const text = readFileSync(`${ROOT}pg2600.txt`, "utf8");
const chunks = chunkSource("pg2600.txt", text).filter((c) => String(c.text).split(/\s+/).length >= 8).slice(0, wantPassages);
const rel = relationsFor(chunks, { pool: chunks });
const index = indexFor(chunks);
const read = (t) => rel.read(t);

// the claim stream, in reading order — the trajectory the spotlight hops.
const referentSurfaces = [];
for (const id of index.referents) { const r = index.represent(id); if (r && /^[A-Z][\p{L}\p{N}' .-]{1,28}$/u.test(r)) referentSurfaces.push(r); }
const probes = referentSurfaces.filter((_, i) => i % Math.max(1, Math.floor(referentSurfaces.length / nProbes)) === 0).slice(0, nProbes);
const claimStream = [];
const seenKeys = new Set();
for (const surface of probes) {
  const q = `what does the book say about ${surface}?`;
  let exp = { claims: [] };
  try { exp = expectationFrom(chunks, q, read, index); } catch { }
  for (const c of exp.claims ?? []) {
    if (!c || !(c.end1 ?? c.subject) || !(c.label ?? c.verb) || !(c.end2 ?? c.object)) continue;
    const k = `${c.end1 ?? c.subject}|${c.label ?? c.verb}|${c.end2 ?? c.object}`.toLowerCase();
    if (seenKeys.has(k)) continue;
    seenKeys.add(k);
    claimStream.push(c);
    if (claimStream.length >= wantClaims) break;
  }
  if (claimStream.length >= wantClaims) break;
}

console.log(`\nvoice-structure — ${claimStream.length} claims over ${chunks.length} passages of pg2600.txt\n`);

// ---- PART A: DMD over the claim stream ----
const STOP = new Set(["the", "and", "for", "with", "that", "this", "from", "under", "through", "after", "during", "was", "were", "are", "is", "had", "has", "have", "by", "to", "of", "in", "on", "at"]);
const content = (s) => String(s ?? "").toLowerCase().split(/[^a-z0-9%]+/).filter((w) => w.length >= 3 && !STOP.has(w));
const observations = claimStream.map((c) => {
  const m = new Map();
  for (const w of content([c.end1 ?? c.subject, c.label ?? c.verb, c.end2 ?? c.object].join(" "))) m.set(w, (m.get(w) ?? 0) + 1);
  return m;
});
const modes = contextualModes(observations);
console.log(`  PART A — DMD over the claim stream (the spotlight's own grain):`);
if (modes.gap) {
  console.log(`    gap: ${modes.gap} — this claim stream cannot support a decomposition (${observations.length} observations).`);
} else {
  console.log(`    measured window: ${modes.window ?? "n/a"} of ${claimStream.length} claims — the depth at which forgetting older claims stops changing the decomposition. The gist the spotlight carries between hops is the material's own answer, not a declared constant.`);
  const evs = (modes.eigenvalues ?? []).filter((l) => Number.isFinite(l?.re) && Number.isFinite(l?.im));
  if (!evs.length) {
    console.log(`    DEGENERATE — no finite eigenvalue: this ${claimStream.length}-claim sparse stream (basis ${modes.dims}) cannot support clean modes. The honest grain is the measured window above; DMD needs a denser/longer stream or the streaming (Hemati) formulation, named not faked.`);
  } else {
    const oscillatory = evs.filter((l) => Math.abs(l.im) > 0).length;
    console.log(`    modes the stream excites: rank ${modes.rank} · oscillatory ${oscillatory} (transient) · basis ${modes.dims} motifs`);
    const ev = evs.map((l) => ({ rho: Math.hypot(l.re, l.im), theta: (Math.atan2(l.im, l.re) * 180) / Math.PI })).sort((a, b) => b.rho - a.rho).slice(0, 5);
    console.log(`    top modes (|λ| growth, ∠θ° frequency): ${ev.map((e) => `ρ${e.rho.toFixed(3)}∠${e.theta.toFixed(1)}°`).join(", ")}`);
    console.log(`    reading: ρ≈1 persistent modes are the settled claims — safe for the fast CPU mouth; |θ|>0 transient modes are where claims change — the escalate-to-the-better-mouth regime.`);
  }
}

// ---- PART B: born-gate feedback from the live verdict stream ----
const dumpPath = new URL("./results/voice-mouth-parallel.json", import.meta.url).pathname;
console.log(`\n  PART B — born-gate feedback (the difference that makes a difference is the LAPSE):`);
if (!existsSync(dumpPath)) {
  console.log(`    no verdict stream found at eval/results/voice-mouth-parallel.json — run eval/voice-mouth-parallel.mjs --dump first.`);
} else {
  const dump = JSON.parse(readFileSync(dumpPath, "utf8"));
  const rows = dump.arms.flatMap((a) => a.rows.map((r) => ({ ...r, arm: a.name })));
  // subject proxy: the leading capitalized run of the stored claim string —
  // a heuristic, disclosed; the born gate's real identity is the index's.
  const subjectOf = (claimStr) => {
    const parts = String(claimStr ?? "").split(/\s+/);
    const out = [];
    for (const p of parts) { if (/^[\p{Lu}]/u.test(p)) out.push(p); else break; }
    return out.join(" ") || parts[0] || "?";
  };
  const bySubject = new Map();
  for (const r of rows) {
    const s = subjectOf(r.claim);
    if (!bySubject.has(s)) bySubject.set(s, { subject: s, n: 0, matched: 0, drift: 0, unvoiced: 0, fragments: 0, arm: new Set() });
    const g = bySubject.get(s);
    g.n += 1; g[r.verdict] = (g[r.verdict] ?? 0) + 1; g.arm.add(r.arm);
    if (String(r.voiced ?? "").split(/\s+/).filter(Boolean).length < 4) g.fragments += 1;
  }
  const list = [...bySubject.values()].sort((a, b) => b.n - a.n);
  // the lapser is the FRAGMENT-ECHO signature, never a bare drift: a subject
  // whose claims the mouth can only echo as fragments (voiced < 4 words) is
  // debris no mouth can voice — that is the difference lapsing makes. A
  // single drift on a real referent (Prince Andrew's one compound claim) is
  // NOT lapse evidence; it is a mouth slip, kept.
  for (const g of list) {
    const lapse = g.matched === 0 && g.fragments >= 1;
    console.log(`    ${lapse ? "LAPSE" : "keep "} ${g.subject.padEnd(28)} n=${g.n} matched=${g.matched} drift=${g.drift} unvoiced=${g.unvoiced} fragments=${g.fragments}`);
  }
  const lapseCandidates = list.filter((g) => g.matched === 0 && g.fragments >= 1);
  const lapseClaims = lapseCandidates.reduce((a, g) => a + g.n, 0);
  if (lapseCandidates.length) {
    console.log(`    lapsing ${lapseCandidates.length} subject(s) removes ${lapseClaims} claim(s) from the voice queue — ${lapseClaims} claims NO mouth could ever voice, because the referent was never cleanly born.`);
    console.log(`    the difference that makes a difference: those ${lapseClaims} claims are the born-gate's to fix (reviewEntities / subject hygiene), never another mouth's and never a better prompt's.`);
  } else {
    console.log(`    no fragment-echo subject in this stream — every subject's claims were voiced at least once or drifted as a real (single) slip.`);
  }
}

process.exit(0);