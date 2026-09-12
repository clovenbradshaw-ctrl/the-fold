// eval/authorship-null.mjs — GFP Pass 42's measure and null: the expectation
// as author, scored over real material. For each probe question the reading
// itself answers, a FAITHFUL mouth (the reading's own claims about the
// asked-about) and a DRIFTING mouth (random claims from the record) are
// diffed (errorOf) against the TRUE expectation and a RANDOM expectation of
// the same size carrying the same touch test.
//
//   The diff must resolve (II.23): on the faithful mouth, the true
//   expectation must yield FEWER NOVEL and MORE MATCHED claims than the
//   random one — or the expectation is noise and Pass 41's witness-steering
//   is not justified. The drifting-mouth arm shows the ratio measures the
//   MOUTH's fidelity, not the expectation's size: the same true expectation
//   authors almost nothing when the mouth does not voice the record.
//
//   node eval/authorship-null.mjs [--passages N] [--probes N]
import { readFileSync } from "node:fs";
import { chunkSource } from "../source.js";
import { makeRelationReader, makeReferentIndex } from "../../eoreader7/native/organs/index.js";
import { expectationFrom, errorOf } from "../dialogue.js";

const args = process.argv.slice(2);
const want = Number(args[args.indexOf("--passages") + 1]) || 250;
const nProbes = Number(args[args.indexOf("--probes") + 1]) || 30;

// The organs exactly as holon.test.mjs builds them (the real constitutional
// reader's extraction bundle) — nothing hand-rolled, nothing faked.
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
const chunks = chunkSource("pg2600.txt", text).filter((c) => String(c.text).split(/\s+/).length >= 8).slice(0, want);
const rel = relationsFor(chunks, { pool: chunks });
const index = indexFor(chunks);

// The claim pool of the whole record, for the drifting mouth and the random expectation.
const pool = [];
for (const c of chunks) {
  try { for (const cl of rel.read(String(c.text ?? "")).claims ?? []) if (cl?.verdict === "bound") pool.push(cl); } catch { }
}
let s = 7; const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
const sampleClaims = (n) => { const out = []; const used = new Set(); while (out.length < n && used.size < pool.length) { const i = Math.floor(rng() * pool.length); if (used.has(i)) continue; used.add(i); out.push(pool[i]); } return out; };

// Probes: the index's own beings, asked about in the reading's own words.
const referentSurfaces = [];
for (const id of index.referents) { const r = index.represent(id); if (r && /^[A-Z][\p{L}\p{N}' .-]{1,28}$/u.test(r)) referentSurfaces.push(r); }
const probes = referentSurfaces.filter((_, i) => i % Math.max(1, Math.floor(referentSurfaces.length / nProbes)) === 0).slice(0, nProbes);
const poolLabels = [...new Set(pool.map((c) => c.label ?? c.verb).filter(Boolean))];

const agg = { trueFaithful: { matched: 0, novel: 0, auth: [] }, trueInvented: { matched: 0, novel: 0, auth: [] }, randomFaithful: { matched: 0, novel: 0, auth: [] }, heard: 0 };
for (const surface of probes) {
  const q = `what does the book say about ${surface}?`;
  const trueExp = expectationFrom(chunks, q, (t) => rel.read(t), index);
  if (!trueExp.claims.length) continue; // no expectation to author from — withheld, never 0
  agg.heard += 1;
  const n = trueExp.claims.length;
  // The INVENTING mouth: claims ABOUT the asked-about (same ends, so they
  // touch) with a false label — the mouth fabricating relations about the
  // referent, the failure mode errorOf's off-topic guard is NOT built for.
  const inventedMouth = trueExp.claims.map((c) => ({ ...c, label: poolLabels[Math.floor(rng() * poolLabels.length)] ?? c.label }));
  const randomExp = { claims: sampleClaims(n), basis: "random", touches: trueExp.touches, ids: [], words: trueExp.words };
  const tally = (a, e) => { a.matched += e.matched.length; a.novel += e.novel.length; if (e.authorship != null) a.auth.push(e.authorship); };
  tally(agg.trueFaithful, errorOf(trueExp, trueExp.claims, index));
  tally(agg.trueInvented, errorOf(trueExp, inventedMouth, index));
  tally(agg.randomFaithful, errorOf(randomExp, trueExp.claims, index));
}
const mean = (a) => a.length ? Number((a.reduce((x, y) => x + y, 0) / a.length).toFixed(3)) : null;
console.log(`GFP Pass 42 — the expectation as author, vs a random null (${chunks.length} passages, ${probes.length} probes, ${agg.heard} heard)\n`);
console.log(`  faithful mouth  × TRUE expectation   matched ${agg.trueFaithful.matched}  novel ${agg.trueFaithful.novel}  authorship ${mean(agg.trueFaithful.auth)}`);
console.log(`  inventing mouth × TRUE expectation   matched ${agg.trueInvented.matched}  novel ${agg.trueInvented.novel}  authorship ${mean(agg.trueInvented.auth)}`);
console.log(`  faithful mouth  × RANDOM expectation matched ${agg.randomFaithful.matched}  novel ${agg.randomFaithful.novel}  authorship ${mean(agg.randomFaithful.auth)}`);
console.log(`\n  II.23: true-vs-random on the faithful mouth — fewer novel: ${agg.trueFaithful.novel <= agg.randomFaithful.novel}, more matched: ${agg.trueFaithful.matched >= agg.randomFaithful.matched}`);
console.log(`  the ratio measures the MOUTH: true expectation authors ${mean(agg.trueFaithful.auth)} of a faithful mouth but ${mean(agg.trueInvented.auth)} of an inventing one`);