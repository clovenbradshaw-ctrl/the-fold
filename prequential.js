// prequential.js — a real belief about this turn, before the turn happens.
//
// User, 2026-09-06: "the frontier LLM mimics chain of thought reasoning and
// baysean priors, but we can actually do it — and we have true dependency
// order reasoning guardrails."
//
// That is the distinction this file exists to make good on. A frontier model
// writes "I'm not certain" and "one correction first" and "probably"; those
// are tokens that RESEMBLE inference. Nothing was conditioned on anything.
// P140 measured what that buys and it buys a lot — but it is narration, and
// narration cannot be scored, calibrated, or wrong in a way that improves it.
//
// What is computed here instead: before the model drafts, the probability
// that THIS answer will contain sentences nothing backs. It is a real
// probability because it is scored against what actually happens, and it is
// honest because it may only be scored against a state of knowledge that
// existed strictly BEFORE the turn arrived (Dawid's prequential principle,
// whose firewall ground-ledger.js already enforces — that file's own header
// names this scorer as the declared gap, and this is it).
//
// ── WHERE THE PRIOR COMES FROM ─────────────────────────────────────────────
//
// Not from a constant. From the DEPENDENCY ORDER itself.
//
// The chain is the cube's, and it is the one already enforced by
// turn-order.js: NUL SIG INS SEG CON … Each cell asks something the cell
// after it depends on. So each cell partitions the stream more finely than
// the one before, and the estimate at a cell has, sitting immediately above
// it, a strictly coarser estimate over strictly more turns.
//
// That is a prior. Not by analogy — by construction. The parent cell's
// posterior IS the child cell's prior, and the chain that already binds the
// reasoning is the same chain that supplies the conditioning. This is what
// "true dependency order" buys that a narrated chain of thought cannot: the
// order is not the sequence in which reasons were mentioned, it is the
// nesting under which beliefs are conditioned, and it is the same order the
// admissibility gate enforces on what may be said.
//
// A cell with few turns under it barely moves off its parent; a cell with
// many turns speaks mostly for itself. Nothing decides that but the counts.
//
// ── NO CONSTANT: THE PRIOR'S OWN STRENGTH IS LEARNED PREQUENTIALLY ─────────
//
// How many pseudo-observations a parent lends its child is the one number
// this construction needs, and the first version set it to 1 and disclosed
// it. A test then showed what that bought: against a parent backed by two
// hundred turns, ONE contrary observation in a child cell moved the belief
// from 0.995 to 0.497. A single turn overturning two hundred is not a
// defensible belief, and "disclosed" does not make it one.
//
// So it is not set. A grid of candidate strengths is carried, each scored on
// exactly the turns it has already predicted, and the belief is their
// average weighted by exp(-loss) — the Bayes posterior over the candidates
// under log loss. Nothing is selected, nothing is fitted to the answer, and
// the weights at turn t depend only on turns before t, which is the same
// firewall the outer score runs under. A candidate that predicts badly stops
// being consulted because it predicted badly, not because it was excluded.
//
// The grid remains an authored set. `sensitivity` reports the score across
// several grids so that a result depending on which candidates were offered
// cannot be presented as though it did not.
//
// ── A CELL THAT PARTITIONS NOTHING CONDITIONS NOTHING ──────────────────────
//
// The chain's cells nest, so a cell can contain exactly the turns its parent
// contains — the refinement was real in principle and empty in this stream.
// Descending into it applied the same evidence a second time and shrank the
// estimate again for no reason. A cell is now entered only when it holds
// strictly fewer turns than its parent: the same evidence may inform a
// belief once.
//
// ── WHAT MAY NOT HAPPEN ────────────────────────────────────────────────────
//
// The probability never reaches the model. A small model handed "you are
// probably about to be wrong" is being handed a suggestion, not a fact
// (P126, measured). It is spent by the INSTRUMENT — on how much checking to
// buy, and on what the instrument itself discloses afterward.

/** The cube's chain, as turn-order.js enforces it. Coarse to fine: each cell conditions on every cell above it. */
export const CHAIN = Object.freeze(["NUL", "SIG", "INS", "SEG", "CON"]);

/**
 * The candidate strengths carried. Not a choice of one — every one of them
 * predicts every turn, and each is weighted by how well it has predicted so
 * far. The belief is their weighted average.
 */
export const STRENGTHS = Object.freeze([0.5, 1, 2, 4, 8, 16, 32]);

/**
 * The cells this turn falls into, coarsest first — each a refinement of the
 * last. Every value is known BEFORE the model drafts, which is the whole
 * point: a belief formed after the draft is a description, not a prediction.
 *
 * NUL  existence   — is there any material at all
 * SIG  reference   — did the question's own words reach it, or did retrieval widen
 * INS  generation  — will a model speak at all, or did a door already answer
 * SEG  structure   — how much material survived, in bands the stream's own quantiles set
 * CON  incidence   — what the premise check found before drafting
 */
export function cellsFor(turn = {}) {
  const passages = Number(turn.passages ?? 0);
  const path = [];
  path.push(`NUL:${passages > 0 ? "material" : "none"}`);
  path.push(`SIG:${turn.widened ? "widened" : "own-words"}`);
  path.push(`INS:${turn.answeredBeforeTheModel ? "door" : "model"}`);
  path.push(`SEG:${turn.band ?? "unbanded"}`);
  path.push(`CON:${turn.premiseUnverified ? "premise-absent" : "premise-clear"}`);
  return path.map((_, i) => path.slice(0, i + 1).join("|"));
}

/**
 * SEG's cell is the retrieved count ITSELF — no cut, no bin, no quantile.
 *
 * The first version of this binned at the stream's median and measured
 * nothing, because 915 of 996 turns in the run it was built on retrieved
 * exactly three passages: a median split puts everything on one side. The
 * lesson is not "choose a better cut", it is that no cut was needed. The
 * ladder above already prices a thin cell correctly — one turn under a cell
 * leaves that cell almost entirely its parent — so a rare count speaks only
 * as loudly as its evidence, and a common one speaks for itself. Binning
 * threw that away and replaced it with a chosen boundary, which is the exact
 * move this project refuses everywhere else.
 *
 * This holds while the value takes few distinct values, which a retrieval
 * count does. A genuinely continuous feature would need the licensed
 * apparatus (nul/index.js, as calibration.js uses it), never a hand cut.
 */
export function bandFor(passages) {
  const n = Number(passages ?? 0);
  return Number.isFinite(n) ? String(n) : "unknown";
}

const tally = (history, cell, key) => {
  let n = 0, k = 0;
  for (const h of history) if (h.cells?.includes(cell)) { n += 1; if (h[key]) k += 1; }
  return { n, k };
};

/**
 * predict(turn, history, {key, strength}) → {p, cell, depth, n, why, ladder}
 *
 * The belief, formed by walking the chain from its coarsest cell down, each
 * step taking the one above as its prior. `history` is every turn STRICTLY
 * EARLIER than this one — the caller's obligation, and ground-ledger.js's
 * firewall is what makes it enforceable rather than promised.
 *
 * With no history at all the answer is 1/2 and says so: not a hedge, the
 * actual state of knowledge before anything has been seen.
 */
export function predict(turn = {}, history = [], { key = "unbacked", strength = 1 } = {}) {
  const cells = turn.cells ?? cellsFor(turn);
  // The root prior: the stream's own base rate, which is the chain's cell 0.
  const root = tally(history, cells[0] ?? "", key);
  let p = history.length ? history.reduce((s, h) => s + (h[key] ? 1 : 0), 0) / history.length : 0.5;
  const ladder = [{ cell: "(stream)", n: history.length, p }];
  let above = history.length;
  for (const cell of cells) {
    const { n, k } = tally(history, cell, key);
    // A refinement that separates nothing is not a refinement: entering it
    // would apply the parent's own turns to the parent's own belief again.
    if (!n || n >= above) { ladder.push({ cell, n, p, held: true }); continue; }
    above = n;
    // The parent's belief enters as `strength` pseudo-observations. A cell
    // with one turn under it is almost entirely its parent; a cell with two
    // hundred is almost entirely itself. No cut decides which — the counts do.
    p = (k + strength * p) / (n + strength);
    ladder.push({ cell, n, k, p });
  }
  const deepest = [...ladder].reverse().find((r) => r.n > 0) ?? ladder[0];
  return {
    p,
    cell: deepest.cell,
    depth: cells.indexOf(deepest.cell) + 1,
    n: deepest.n,
    ladder,
    root: root.n,
    why: history.length
      ? `${deepest.n} earlier turn${deepest.n === 1 ? "" : "s"} of this shape`
      : "nothing has been seen yet",
  };
}

/** The null this must beat: the same rule with the chain switched off — the stream's base rate alone. */
export function baseRate(history = [], { key = "unbacked" } = {}) {
  if (!history.length) return 0.5;
  return history.reduce((s, h) => s + (h[key] ? 1 : 0), 0) / history.length;
}

/** Log loss in bits. Lower is better; a coin is 1 bit. Clamped only against infinity, at the resolution one observation can support. */
export function loss(p, outcome, n = 1) {
  const floor = 1 / (2 * Math.max(2, n));
  const q = Math.min(1 - floor, Math.max(floor, p));
  return -Math.log2(outcome ? q : 1 - q);
}

/**
 * THE BELIEF ACTUALLY USED: every candidate strength predicts, and their
 * average is weighted by exp(-bits each has already cost). That is the Bayes
 * posterior over the candidates under log loss, and it is formed from turns
 * strictly earlier than this one, exactly like everything else here.
 */
export function mixture(turn, history, weights, { key = "unbacked", strengths = STRENGTHS } = {}) {
  const parts = strengths.map((strength) => predict(turn, history, { key, strength }));
  const w = strengths.map((s, i) => weights?.[i] ?? 1);
  const total = w.reduce((a, b) => a + b, 0) || 1;
  return {
    p: parts.reduce((acc, part, i) => acc + (w[i] / total) * part.p, 0),
    parts,
    // Which candidate the stream has come to trust, for disclosure only.
    trusted: strengths[w.indexOf(Math.max(...w))],
    weights: w.map((x) => x / total),
    cell: parts[0].cell, depth: parts[0].depth, n: parts[0].n, why: parts[0].why, ladder: parts[0].ladder,
  };
}

/**
 * Score a whole stream prequentially: every turn predicted from the turns
 * strictly before it, and scored once. Both arms — the chain and its null —
 * see exactly the same history at every step, so the difference between them
 * is the chain and nothing else.
 */
export function scoreStream(turns = [], { key = "unbacked", strengths = STRENGTHS } = {}) {
  const history = [];
  // One running loss per candidate; the weights are exp(-loss), renormalised.
  const cost = strengths.map(() => 0);
  let chain = 0, base = 0, n = 0;
  const rows = [];
  for (const t of turns) {
    const band = bandFor(t.passages);
    const cells = cellsFor({ ...t, band });
    const best = Math.min(...cost);
    const weights = cost.map((c) => Math.exp(-(c - best)));
    const m = mixture({ ...t, cells }, history, weights, { key, strengths });
    const p0 = baseRate(history, { key });
    const y = Boolean(t[key]);
    const lc = loss(m.p, y, history.length), lb = loss(p0, y, history.length);
    chain += lc; base += lb; n += 1;
    m.parts.forEach((part, i) => { cost[i] += loss(part.p, y, history.length); });
    rows.push({ turn: t.turn ?? n, p: m.p, p0, y, cell: m.cell, depth: m.depth, trusted: m.trusted, lc, lb });
    history.push({ ...t, cells, [key]: y });
  }
  return {
    turns: n,
    chainBits: n ? chain / n : null,
    baseBits: n ? base / n : null,
    gain: n ? (base - chain) / n : null,
    trusted: rows.length ? rows[rows.length - 1].trusted : null,
    rows,
  };
}

/**
 * THE CONTROL, built to fail (II.23). The outcomes are permuted against the
 * features, destroying every real association while leaving both arms' shape,
 * counts and base rate untouched. Under permutation the chain must NOT beat
 * the null: any gain that survives here was never about the material, and a
 * gain reported without this having been run is not a finding.
 */
export function shuffledControl(turns = [], { key = "unbacked", strengths = STRENGTHS, seed = 1 } = {}) {
  let s = seed >>> 0 || 1;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const ys = turns.map((t) => Boolean(t[key]));
  for (let i = ys.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ys[i], ys[j]] = [ys[j], ys[i]]; }
  return scoreStream(turns.map((t, i) => ({ ...t, [key]: ys[i] })), { key, strengths });
}

/** The grid is authored even though no single value in it is: several grids, so a result that depends on which candidates were offered cannot hide. */
export function sensitivity(turns = [], { key = "unbacked", grids = [[1], [0.5, 1, 2, 4, 8, 16, 32], [1, 10, 100], [2, 8]] } = {}) {
  return grids.map((strengths) => {
    const { rows, ...r } = scoreStream(turns, { key, strengths });
    return { grid: strengths.join(","), ...r };
  });
}
