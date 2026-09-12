// eval/binding-by-use.mjs — GFP Pass 37: Hebbian binding, measured. The spec's
// question: does binding nodes that were REACHED TOGETHER for a turn that was
// then bound to material raise recall on cues the field has NOT seen — or only
// on the cues that trained it? The null: the SAME number of bindings placed at
// RANDOM pairs. If use-binding does not beat random binding on held-out cues,
// binding stays off for this use.
//
//   node eval/binding-by-use.mjs [--passages N] [--pairs K] [--probes N]
import { readFileSync } from "node:fs";
import { Field, sdrOf, tokensOf, isWord } from "../relative.js";
import { fragmentOf } from "../relative-pattern.js";
import { chunkSource } from "../source.js";

const args = process.argv.slice(2);
const want = Number(args[args.indexOf("--passages") + 1]) || 600;
const nPairs = Number(args[args.indexOf("--pairs") + 1]) || 60;
const nProbes = Number(args[args.indexOf("--probes") + 1]) || 60;

const ROOT = new URL("../", import.meta.url).pathname;
const text = readFileSync(`${ROOT}pg2600.txt`, "utf8");
const chunks = chunkSource("pg2600.txt", text).filter((c) => tokensOf(c.text).filter(isWord).length >= 8).slice(0, want);
let s = 7; const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };

// A turn "reached together and was bound to material" = a cue settled on two
// nodes that share a real referent. Use co-word sharing as the reach signal
// (real turns reach passages about the same asked-about).
const vocab = (p) => new Set(tokensOf(p).filter(isWord));
function buildFields(bindingPairs) {
  const use = new Field(), rand = new Field(), none = new Field();
  for (const c of chunks) { use.admit(c.text, { source: "pg", at: c.ref }); rand.admit(c.text, { source: "pg", at: c.ref }); none.admit(c.text, { source: "pg", at: c.ref }); }
  for (const [a, b] of bindingPairs) {
    use.bind(use.nodes[a], use.nodes[b]);
    const ra = Math.floor(rng() * use.size), rb = Math.floor(rng() * use.size);
    rand.bind(rand.nodes[ra], rand.nodes[rb]);
  }
  return { use, rand, none };
}
const pickPairs = () => {
  const pairs = [];
  // co-reach: passages sharing the most vocabulary — a real "reached together"
  for (let k = 0; k < nPairs; k++) {
    let best = null, bestOverlap = -1;
    for (let t = 0; t < 30; t++) {
      const a = Math.floor(rng() * chunks.length);
      const b = Math.floor(rng() * chunks.length);
      if (a === b) continue;
      const va = vocab(chunks[a].text), vb = vocab(chunks[b].text);
      let ov = 0; for (const w of va) if (vb.has(w)) ov++;
      if (ov > bestOverlap) { bestOverlap = ov; best = [a, b]; }
    }
    if (best) pairs.push(best);
  }
  return pairs;
};

const pairs = pickPairs();
const { use, rand, none } = buildFields(pairs);
// held-out cues: fragments of passages that were NEVER in a training pair
const trained = new Set(pairs.flat());
const heldOut = chunks.filter((_, i) => !trained.has(i) && i % Math.max(1, Math.floor(chunks.length / nProbes)) === 0).slice(0, nProbes);

const score = (field, cue) => {
  const r = field.recall(cue, { steps: 1 });
  return { top: r[0]?.activation ?? 0, topAt: r[0]?.node?.payload?.at ?? null };
};
const agg = { use: 0, rand: 0, none: 0, exactUse: 0, exactRand: 0, exactNone: 0 };
for (const c of heldOut) {
  const cue = fragmentOf(c.text, 0, 0.3);
  const u = score(use, cue), r = score(rand, cue), n = score(none, cue);
  agg.use += u.top; agg.rand += r.top; agg.none += n.top;
  if (u.topAt === c.ref) agg.exactUse++; if (r.topAt === c.ref) agg.exactRand++; if (n.topAt === c.ref) agg.exactNone++;
}
const m = (x, k) => (x / k).toFixed(4);
console.log(`GFP Pass 37 — binding by use, held-out cues (${heldOut.length} probes, ${pairs.length} use-pairs, random-null control)\n`);
console.log(`  mean top activation on held-out fragments:  none ${m(agg.none, heldOut.length)}   use-bound ${m(agg.use, heldOut.length)}   random-bound ${m(agg.rand, heldOut.length)}`);
console.log(`  exact figure recalled:                      none ${agg.exactNone}/${heldOut.length}   use-bound ${agg.exactUse}/${heldOut.length}   random-bound ${agg.exactRand}/${heldOut.length}`);
console.log(`\n  EXIT: use-binding must beat RANDOM binding on held-out cues, or binding stays off for this use (P37).`);
console.log(`  use vs random mean: ${m(agg.use, heldOut.length)} vs ${m(agg.rand, heldOut.length)}`);