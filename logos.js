// logos.js — Logos, the archon of SOUNDNESS: do the claims on the table
// turn the argument back on itself?
//
// nagarjuna.js's own "paradigm" terrain already names this exactly
// ("LOGOS: the answer's claim... must not turn the argument in on itself
// (reasoning-lint's findClaimCycle). An answer that introduces a cycle
// into the whole is logically unsound, whatever it binds to") but the
// organ it calls for was never built here — `grep -rn findClaimCycle`
// across this repo found the one comment naming it and nothing wiring
// it. This is that organ, reusing eoreader7's real `findClaimCycle`
// (organs/reasoning-lint.js, "Degrees Kelsen") rather than a second
// cycle-detector grown here — the same function this session already
// verified live against the eoreader7 proxy's own reasoning_content
// stream.
//
// PURE. `findClaimCycle` takes a flat array of {end1, label, end2} notes
// — the exact shape `hypergraph.js`'s own `relationsFor(...).edges`
// already carries (P76's earned-name wipe), so nothing here re-derives
// what an edge is.

import { findClaimCycle } from "../eoreader7/native/organs/reasoning-lint.js";

/** nagarjuna.js's own `organs.logos(notes)` contract: an array of found
 * cycles (today, at most one — findClaimCycle stops at the first). */
export function logos(notes) {
  const cycle = findClaimCycle(notes ?? []);
  return cycle ? [cycle] : [];
}

/**
 * Does the QUESTION's own claims already form a cycle, independent of any
 * answer? Treats the question as its own material — the one place this
 * repo's checking apparatus never looks, since every other check compares
 * an ANSWER against retrieved ground, never a question against itself.
 * `relationsFor` is app.js's own already-built reader (makeRelationReader's
 * returned function): called here with the question as its one passage so
 * the edges it returns are the question's own, nothing external.
 */
export function questionCycle(question, relationsFor) {
  const text = String(question ?? "").trim();
  if (!text || typeof relationsFor !== "function") return null;
  let reader;
  try { reader = relationsFor([{ text }], { pool: [{ text }] }); } catch { return null; }
  const edges = reader?.edges ?? [];
  if (!edges.length) return null;
  const cycle = findClaimCycle(edges);
  return cycle
    ? { cycle: cycle.cycle, detail: `A support cycle in the question's own claims: ${cycle.cycle.join(" → ")} — nothing outside the cycle grounds it (begs the question).` }
    : null;
}
