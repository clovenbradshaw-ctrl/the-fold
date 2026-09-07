// grain.js — the cube's THIRD face, read off the question (P150).
//
// User, 2026-09-06: "we are not leveraging the full power of the cube, think
// of what unlocks with the terrains and stances, and using all 3 faces."
//
// The cube is 3 x 3 x 3 and this instrument has been using one face of it.
// From kernel/cube.js, which is the source and is never restated here:
//
//   MODES    Differentiate · Relate · Generate
//   DOMAINS  Existence · Structure · Interpretation
//   GRAINS   Ground · Figure · Pattern
//
// The nine OPERATORS are mode x domain — that is the face the answering path
// has always used (NUL SIG INS SEG CON SYN DEF EVA REC). The other two faces
// were never touched:
//
//   TERRAIN = domain x grain    what is being worked on
//             Void  Entity  Kind   /  Field  Link  Network  /  Atmosphere  Lens  Paradigm
//   STANCE  = mode x grain      how it is being worked
//             Clearing Dissecting Unraveling / Tending Binding Tracing / Cultivating Making Composing
//
// Which means every procedure written here so far has run at ONE grain,
// implicitly Figure: find the named thing, quote the sentence that mentions
// it, answer about it. A question that is not about a figure gets figure
// treatment anyway.
//
// MEASURED before this was built (run 1, 869 model turns):
//
//   grain of the question   n     answers with a high defect rate
//   Figure                 422              39%
//   Ground                 283              62%
//   Pattern                  2               —
//
// A twenty-three point gap, in the predicted direction. And it collapses the
// rest of the day's findings into one account: Ground questions have few
// content words and common ones, so `coverage` runs high on them — the
// coverage-equals-1.0 failure regime IS the Ground-grained questions being
// answered by Figure machinery. Coverage was a proxy for grain.
//
// ── WHAT THIS MAY NOT DO (FOLD-CONSTITUTION II.12) ─────────────────────────
//
// "A terrain, category, cluster, or type assigned by the machine and
// presented as found is refused. Addresses are declared and checked for
// coherence, never inferred and asserted."
//
// So the grain is not induced. It is READ OFF THE ASKER'S OWN WORDS — the
// person who wrote "tell me more" declared a Ground-grained question by
// writing it that way — and where the words do not settle it the reading is
// `provisional` and says so. 162 of 869 real questions came back unsettled
// and none of them was guessed at. A provisional reading must not be allowed
// to choose a procedure; it falls back to whatever ran before.
//
// The null arm II.12 also requires is `grainNull` below.

/** The three grains. Canon (kernel/cube.js GRAINS), named here because a name cannot drift; every TABLE stays injected. */
export const GRAINS = Object.freeze(["Ground", "Figure", "Pattern"]);

// The surface forms, each with the reason it is that grain. These are the
// asker's words, not the machine's inference — which is the whole basis on
// which this is allowed to exist at all.
const FORMS = Object.freeze([
  { grain: "Pattern", re: /\b(what kinds?|what types?|how (?:do|are) .{0,30}\b(?:relate|compare|differ)|across (?:the|all|both)|patterns?\b|themes?\b|trends?\b|in common|list (?:the|all)|every (?:time|place|instance))\b/i,
    why: "asks across many for a shape or a kind" },
  { grain: "Ground", re: /\b(tell me more|what else|say more|go on|continue|elaborate|summari[sz]e|overall|in general|the whole|generally|broadly)\b/i,
    why: "asks about the extent as a whole, naming nothing in it" },
  { grain: "Figure", re: /\b(where does|what does .{1,40} say about|which passage|appear(?:s)? in|reads:|who (?:is|was|said)|when (?:did|was)|numbers? or dates?|fill(?:ed)? (?:in )?the blank)\b/i,
    why: "asks about one named thing" },
]);

/**
 * grainOf(question) → { grain, why, provisional }
 *
 * `provisional: true` means the question's own words did not settle it. That
 * is a real state and not a default: nothing downstream may choose a
 * procedure on a provisional reading (II.12), and `grain` is null there
 * rather than a guess wearing a name.
 */
export function grainOf(question) {
  const q = String(question ?? "");
  if (!q.trim()) return { grain: null, why: "there is no question to read", provisional: true };
  for (const f of FORMS) if (f.re.test(q)) return { grain: f.grain, why: f.why, provisional: false };
  return { grain: null, why: "the question's own words do not settle its grain", provisional: true };
}

/**
 * The terrain and stance this reading implies, taken FROM THE CUBE rather
 * than restated — `cube` is kernel/cube.js, injected like every other engine
 * module. A reading with no grain has no terrain and no stance, and says so.
 */
export function placeOf(cube, { op, grain }) {
  if (!cube?.cellOf) throw new TypeError("grain.placeOf: the cube is injected (kernel/cube.js)");
  if (!grain) return { gap: "unsettled_grain", reason: "no grain was read, so no terrain or stance follows" };
  return cube.cellOf(op, grain);
}

/**
 * THE NULL ARM II.12 REQUIRES. An induced kind must show that the population
 * it splits actually splits — so the labels are permuted against the outcomes
 * and the same split is measured again. A separation that survives permutation
 * was never about the questions.
 *
 * Returns { real, shuffled, separates } where each rate is the spread between
 * the best and worst grain's outcome rate.
 */
export function grainNull(rows = [], { outcome = "high", seed = 1 } = {}) {
  const spread = (rs) => {
    const by = new Map();
    for (const r of rs) { if (!r.grain) continue; const g = by.get(r.grain) ?? []; g.push(r[outcome] ? 1 : 0); by.set(r.grain, g); }
    const rates = [...by.values()].filter((v) => v.length >= 20).map((v) => v.reduce((a, b) => a + b, 0) / v.length);
    return rates.length >= 2 ? Math.max(...rates) - Math.min(...rates) : null;
  };
  let s = seed >>> 0 || 1;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const ys = rows.map((r) => Boolean(r[outcome]));
  for (let i = ys.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ys[i], ys[j]] = [ys[j], ys[i]]; }
  const real = spread(rows);
  const shuffled = spread(rows.map((r, i) => ({ ...r, [outcome]: ys[i] })));
  return { real, shuffled, separates: real != null && shuffled != null && real > shuffled * 2 };
}
