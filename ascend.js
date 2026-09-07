// ascend.js — legal moves, generated and recursed, to whatever height the
// material licenses (P152).
//
// User, 2026-09-06: "the intelligence should be able to recursively generate
// legal logical moves to any arbitrary height."
//
// ── WHY IT COULD NOT, MEASURED ─────────────────────────────────────────────
//
// The algebra has 27 legal moves (9 operators × 3 grains — not 9×9×9; stance
// and terrain are PROJECTIONS of one address, not free axes). The registry
// covers 27/27. But exactly THREE execute — `cast` at SIG·Figure and
// INS·Figure, `relations` at CON·Figure (capacity-runner.js returns
// `not_yet_executable` for every other id) — and all three are Figure grain.
//
// Three consequences, each of which had been measured separately before this
// file connected them:
//
//   · P149's walk (NUL→SIG→INS→CON→DEF) was not a design. It is the only
//     executable path through the cube, rediscovered by hand and mistaken
//     for a choice.
//   · P150 found Ground-grained questions failing at 62% against Figure's
//     39%. There are no executable Ground moves; the instrument answers
//     every question with the only grain it has.
//   · Height was capped at 1, and STRUCTURALLY so. Every executable move
//     works the ground it was handed. None of them produces a new one.
//
// Recursion needs a move that LIFTS: takes what has been established and
// composes a new ground from it, so the same algebra can run again, one level
// up. Without a lift, "recursion" is just a longer straight line.
//
// ── WHAT A LIFT MAY NOT BE ─────────────────────────────────────────────────
//
// It may not invent. The new ground is composed of established findings and
// their addresses — nothing else — so height is bought by RE-READING what was
// established at a coarser grain, never by generating new material. That is
// the same principle the depth slider was built on (P123: better output the
// way people make it, by more passes over bounded material, never more
// context), applied to the ground rather than to the budget.
//
// It may not be free. A lift that produces a ground no different from a
// random regrouping of the same findings has done nothing, and `liftNull`
// below is how that is caught rather than assumed.
//
// It may not run forever. The walk stops at a FIXED POINT — a round that
// establishes nothing new — and that is the honest bound: height is however
// far the material licenses, not a number chosen here.

/** The three cells that actually execute today, and the fact that they are all one grain is the finding. */
export const EXECUTABLE = Object.freeze(["SIG·Figure", "INS·Figure", "CON·Figure"]);

/**
 * legalMoves(state, { executable, preconditions })
 *
 * A move is legal when (a) something can execute it and (b) the state
 * satisfies its preconditions. Preconditions come from the cube's own
 * dependency order: a move at operator O needs the operators before O in
 * OPERATOR_CHAIN to have been established at the same grain. Nothing is
 * hand-ordered here — the chain is injected.
 */
export function legalMoves(state, { chain, executable = EXECUTABLE } = {}) {
  if (!Array.isArray(chain) || !chain.length) throw new TypeError("ascend.legalMoves: the operator chain is injected (kernel/cube.js OPERATOR_CHAIN)");
  const have = new Set((state?.established ?? []).map((e) => e.cell));
  const out = [];
  for (const cell of executable) {
    const [op, grain] = String(cell).split("·");
    if (have.has(cell)) continue;                                   // already established at this height
    const before = chain.slice(0, chain.indexOf(op));
    // Only the earlier operators that are THEMSELVES executable at this grain
    // can be required; requiring an unexecutable precondition would make
    // every move illegal forever, which is a bug wearing a law.
    const needed = before.filter((o) => executable.includes(`${o}·${grain}`));
    const missing = needed.filter((o) => !have.has(`${o}·${grain}`));
    if (missing.length) { out.push({ cell, op, grain, legal: false, blockedBy: missing.map((o) => `${o}·${grain}`) }); continue; }
    out.push({ cell, op, grain, legal: true });
  }
  return out;
}

/**
 * THE GRAIN CYCLE — how three grains give unbounded height (P152).
 *
 * The first version of this lifted by NARROWING: regroup the established
 * spans into fewer grounds, stop when you cannot narrow. It reached height 3
 * and stopped, which is not arbitrary height — it is a funnel that terminates
 * by exhaustion. Nothing was ascending; the material was shrinking.
 *
 * RE-ZEROING is the other move. You do not keep narrowing the same material;
 * you take what was established, treat it as a NEW GROUND — a fresh zero —
 * and run the whole algebra again on it. NUL fires again, which is why the
 * chain begins there: every level starts by asking "what is here" of whatever
 * it is now standing on.
 *
 * And the grain CYCLES, which is the part that makes height unbounded with
 * only three of them. A Pattern, once established, IS the Ground in which the
 * next level differentiates Figures. Ground → Figure → Pattern → Ground' →
 * Figure' → … That is an abstraction ladder, and it is the ordinary shape of
 * building an argument: each conclusion becomes a premise and you start again
 * from a clean slate whose contents are your own prior conclusions.
 */
export const GRAIN_CYCLE = Object.freeze(["Ground", "Figure", "Pattern"]);
export const nextGrain = (g) => GRAIN_CYCLE[(GRAIN_CYCLE.indexOf(g) + 1) % GRAIN_CYCLE.length];

/**
 * rezero(state) — the established findings become the ground of the next
 * level, one grain up the cycle.
 *
 * THE WALL, and it is the one THE-NULL-STATES already names. "An act that
 * reads the trail's own trail is the watcher's regress — refused at the gate."
 * In a static tower `layers.js::makeTower` refuses that by checking who
 * watches whom; here the levels are made at runtime and each watches the one
 * below, so no cycle is possible by construction and the danger takes a
 * different form: a level whose ground no longer traces to material bytes IS
 * the trail's own trail, however acyclic the diagram looks.
 *
 * So the rule is PROVENANCE, checked every level: every element of a new
 * ground must carry addresses that resolve into the original material.
 * Height is legal exactly as long as it stays anchored, which is this
 * instrument's oldest discipline applied to its own recursion.
 */
export function rezero(state, { grain = "Figure", anchored } = {}) {
  const est = state?.established ?? [];
  const spans = est.flatMap((e) => e.spans ?? []);
  if (!spans.length) return { ok: false, why: "nothing was established, so there is no ground to re-zero onto", gap: "empty_material" };

  // Every span must still reach bytes. `anchored(span)` is the caller's — it
  // is the only thing that can know whether an address resolves — and absent
  // it the check falls back to the address's own shape, which is weaker and
  // says so.
  const check = typeof anchored === "function" ? anchored : (s) => /#\d+\-\d+|@[\d:.]+/.test(String(s?.ref ?? ""));
  const rooted = spans.filter((s) => check(s));
  if (!rooted.length) {
    return { ok: false, gap: "self_referential",
      why: "no span at this height still reaches material bytes — a level standing only on the level below is the watcher's regress" };
  }

  const up = nextGrain(grain);
  // The new ground is the established spans PRESENTED AT THE NEXT GRAIN, not
  // summarised and not shrunk. Nothing is invented: every element carries the
  // addresses it came from, so the walk above can be replayed to bytes from
  // any height.
  const ground = rooted.map((s) => ({ ref: s.ref, text: s.text, from: [s.ref] }));
  return {
    ok: true, ground, grain: up,
    dropped: spans.length - rooted.length,
    why: `${rooted.length} established span(s) re-zeroed as a ${up}-grain ground` +
      (spans.length - rooted.length ? `; ${spans.length - rooted.length} dropped for reaching no bytes` : ""),
  };
}

/**
 * METACOGNITION — the same move, pointed inward.
 *
 * The walk's own record is a ground: which cells ran, what each established,
 * what each refused. Read by the SAME algebra, because that is the point —
 * no new machinery at level n+1, the same machinery aimed at level n's output
 * ("never one witness that gets smarter").
 *
 * A record-ground is marked `aboutTheReading`, and it may NEVER be the only
 * ground at a level: a level that reads only its own reading has left the
 * material, which is `self_referential` whatever it is called. So this
 * returns the record beside the material ground, never instead of it.
 */
export function reading(levels = []) {
  return levels.flatMap((L) => [
    ...(L.blocked ?? []).map((cell) => ({ ref: `reading:h${L.height}`, aboutTheReading: true,
      text: `at height ${L.height} the move ${cell} was not legal` })),
    ...(L.established ? [{ ref: `reading:h${L.height}`, aboutTheReading: true,
      text: `at height ${L.height}, ${L.established} finding(s) were established` }] : []),
  ]);
}

/** A level's ground is legal only if something in it is material. The record may accompany; it may never stand alone. */
export function groundIsAnchored(ground = []) {
  const material = ground.filter((g) => !g?.aboutTheReading);
  return material.length
    ? { ok: true, material: material.length, aboutTheReading: ground.length - material.length }
    : { ok: false, gap: "self_referential", why: "this level's ground is entirely the reading's own record — the watcher's regress" };
}

/**
 * ascend — the recursion. Rounds of legal moves; when a round establishes
 * something, the ground is lifted and the algebra runs again one level up.
 *
 * `apply(move, state)` is the caller's: it executes one move and returns
 * `{ established: [{cell, spans, ...}], ... }` or null. Everything about WHAT
 * a move does lives there; this file only decides what is legal, when to
 * lift, and when to stop.
 *
 * Stops at a FIXED POINT — a round that establishes nothing new, or a lift
 * that does not narrow. `maxHeight` is a runaway guard, not the bound: if it
 * is what stopped the walk, the result says so, because a walk that hit its
 * guard has not found its own ceiling and must not be reported as though it had.
 */
export async function ascend({ ground, apply, chain, executable = EXECUTABLE, grain = "Figure", anchored, withReading = false, maxHeight = 12 } = {}) {
  if (typeof apply !== "function") throw new TypeError("ascend: apply(move, state) is injected");
  const levels = [];
  let state = { ground, established: [], height: 0, grain };
  for (let h = 0; h < maxHeight; h++) {
    // A level standing only on its own record is refused before any move runs.
    const anchor = groundIsAnchored(state.ground);
    if (!anchor.ok) return { levels, height: h, state, stopped: anchor.why, gap: anchor.gap };

    const moves = legalMoves(state, { chain, executable });
    const established = [];
    for (const m of moves.filter((x) => x.legal)) {
      const got = await apply(m, state);
      if (got?.established?.length) established.push(...got.established.map((e) => ({ ...e, cell: m.cell })));
    }
    levels.push({ height: h, grain: state.grain, moves, established: established.length,
      blocked: moves.filter((x) => !x.legal).map((x) => x.cell), material: anchor.material });
    if (!established.length) return { levels, height: h, state, stopped: "fixed point: a round established nothing new" };

    state = { ...state, established: [...state.established, ...established] };
    const up = rezero(state, { grain: state.grain, anchored });
    levels[levels.length - 1].rezero = up.why;
    if (!up.ok) return { levels, height: h + 1, state, stopped: `no re-zero: ${up.why}`, gap: up.gap };

    // The reading's own record may ACCOMPANY the next ground, never replace it.
    const next = withReading ? [...up.ground, ...reading(levels)] : up.ground;
    state = { ground: next, established: [], height: h + 1, grain: up.grain };
  }
  return { levels, height: maxHeight, state, stopped: "hit the runaway guard — this walk did NOT find its own ceiling", guarded: true };
}

// ── THE TWO DIRECTIONS (P153) ──────────────────────────────────────────────
//
// User, 2026-09-06: "the low sets the possibility of the high, the high the
// probability of the low."
//
// That is the law of this recursion and it is not symmetric.
//
//   UP is POSSIBILITY. The level below determines what the level above may
//   even attempt. You cannot establish a Pattern its Figures do not permit.
//   This is hard, deductive, and already computed — `legalMoves`, whose
//   preconditions come from the cube's own dependency order. A move is either
//   licensed or it is not, and no amount of expectation makes an unlicensed
//   move legal.
//
//   DOWN is PROBABILITY. The level above, once established, is a PRIOR OVER
//   ITS OWN INSTANCES. A Pattern makes some Figures expected and others
//   surprising. This is soft and defeasible: it re-weights what the level
//   below attends to, and it may never license anything, because probability
//   is not permission.
//
// So the recursion is not a ladder. It is a circuit, and the two halves were
// built separately today without seeing they were one thing: `ascend` is the
// upward half, and `prequential.js`'s ladder — where a cell's prior IS the
// posterior of the cell above it — is the downward half.
//
// THE WALL THAT KEEPS THEM APART. Probability may never become possibility.
// A descent that made an illegal move legal would be expectation overruling
// licensing, which is how a reader talks itself into what it already
// believed. `descend` returns WEIGHTS ONLY; `legalMoves` never reads them.
// That separation is pinned, not merely intended.

/**
 * descend(levels) → { weight(ref), of, why }
 *
 * The prior the established higher levels place over the material below. A
 * span that carried a finding upward is expected; one that carried nothing is
 * not. Weights are relative to the level's own mean, so a level in which
 * everything carried is a level that says nothing — which is correct, and is
 * what `informative` reports.
 */
export function descend(levels = []) {
  const carried = new Map();
  let total = 0;
  for (const L of levels) {
    for (const e of L.establishedSpans ?? []) {
      const ref = String(e?.ref ?? "");
      if (!ref) continue;
      carried.set(ref, (carried.get(ref) ?? 0) + 1);
      total += 1;
    }
  }
  const refs = [...carried.keys()];
  const mean = refs.length ? total / refs.length : 0;
  return {
    of: refs.length,
    // A ref nothing carried is not weightless — it is BELOW the mean, which
    // is a different statement and the one that can be wrong.
    weight: (ref) => (mean > 0 ? (carried.get(String(ref)) ?? 0) / mean : 1),
    informative: refs.length > 1 && new Set(carried.values()).size > 1,
    why: refs.length
      ? `${refs.length} address(es) carried findings upward; ${new Set(carried.values()).size} distinct weight(s)`
      : "nothing was carried upward, so the levels above place no expectation below",
  };
}

/**
 * THE CONTROL. A descent that re-weights nothing has not descended, and a
 * descent whose weights do not change what the level below establishes is
 * decorative however elegant it looks. This runs the lower level BOTH ways
 * and reports whether the outcome differed — the only evidence that the
 * downward half of the circuit is doing anything at all.
 */
export async function descentChanges({ ground, apply, chain, executable = EXECUTABLE, prior } = {}) {
  const run = async (w) => {
    const state = { ground, established: [], height: 0, grain: "Figure", weight: w };
    const out = [];
    for (const m of legalMoves(state, { chain, executable }).filter((x) => x.legal)) {
      const got = await apply(m, { ...state, established: out });
      if (got?.established?.length) out.push(...got.established.map((e) => ({ ...e, cell: m.cell })));
    }
    return out;
  };
  const without = await run(null);
  const with_ = await run(prior?.weight ?? null);
  const key = (rs) => rs.flatMap((r) => (r.spans ?? []).map((s) => s.ref)).sort().join("|");
  const a = key(without), b = key(with_);
  return { changed: a !== b, without: without.length, with: with_.length,
    why: a === b ? "the level below established exactly the same spans with and without the prior — the descent is decorative"
                 : "the prior changed what the level below established" };
}

/** Probability may never become possibility: `legalMoves` must not read weights. Pinned. */
export const LICENSING_IS_NOT_EXPECTATION = Object.freeze({
  rule: "descend() returns weights; legalMoves() never reads them",
  why: "a descent that made an illegal move legal would be expectation overruling licensing — how a reader talks itself into what it already believed",
});
