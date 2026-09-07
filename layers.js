// layers.js — a tower of watchers, and the law that keeps it finite (P132).
//
// User, 2026-09-06: "I think this implies (and we've discussed previously)
// system 3 thinking, and perhaps an arbitrary number of layers above it
// recursively."
//
// It does, and the layers were already here unnamed:
//
//   1  FAST         answers what is exactly known, with no model at all
//                   (answerable.js) — Kahneman's S1 where it is competent
//   2  DELIBERATE   drafts and checks against material (holon.js) — S2
//   3  CALIBRATING  watches 2's record and measures the cut 2 spends by,
//                   from the stream's own regime (calibration.js) — this is
//                   the layer the strain meter secretly was, once its
//                   threshold stopped being declared
//   4  AUDITING     watches 3's record and asks the only question 3 cannot
//                   ask about itself: is this calibrator DISCRIMINATING? A
//                   cut that fires on every turn, or on none, is not
//                   calibrating anything — it is a constant wearing a
//                   measurement's clothes, which is this project's oldest
//                   failure shape.
//
// WHY IT DOES NOT GO ON FOREVER, and why that is not an arbitrary stop. The
// tower is bounded by a law this codebase already states and had never
// enforced: `self_referential` — "an act that reads the trail's own trail is
// the watcher's regress — refused at the gate" (THE-NULL-STATES), the same
// wall THE-WAYS-OF-KNOWING names as the empty hub, Advaita's sākṣin, the eye
// that cannot see itself. A layer's object is always the record BELOW it.
// Layer 5 would have to take layer 4's own record as its object, and 4's
// record is a reading about 3 — asking "was my audit well audited" is the
// regress, and it is refused here by construction rather than by taste.
//
// So the tower is arbitrary in principle and finite in fact: it rises exactly
// as far as there is a record below with width in it. Each layer stops on its
// own when the thing beneath has nothing left to measure — too little
// history, or a null of zero width that would clear anything. A layer that
// cannot measure says so, and a typed gap NEVER reads as "nothing to adjust"
// (the standing line: a search that did not reach its object is a fact about
// the reader, not a finding about the world).
//
// PURE: no model, no I/O. Readings are functions the caller supplies.

/** The name every tower's base carries: it watches material, not another layer. */
export const GROUND = null;

/**
 * makeTower(layers) → { layers, order } or throws.
 * `layers`: [{ name, watches, read }] — `read(recordBelow, ctx)` returns
 * `{ reading, adjust?, gap? }`. Validated at construction, because a cycle in
 * a watch chain IS the regress and must never be discovered at run time.
 */
export function makeTower(layers = []) {
  const byName = new Map();
  for (const l of layers) {
    if (!l?.name) throw new TypeError("every layer is named");
    if (byName.has(l.name)) throw new TypeError(`two layers named ${l.name}`);
    byName.set(l.name, l);
  }
  for (const l of layers) {
    if (l.watches === GROUND) continue;
    if (l.watches === l.name) throw new TypeError(`${l.name} watches itself — the watcher's regress, refused at the gate`);
    if (!byName.has(l.watches)) throw new TypeError(`${l.name} watches ${l.watches}, which is not in the tower`);
    // Walk the chain; a cycle anywhere is the same refusal.
    const seen = new Set([l.name]);
    let at = byName.get(l.watches);
    while (at && at.watches !== GROUND) {
      if (seen.has(at.name)) throw new TypeError(`${l.name} watches a cycle through ${at.name} — the watcher's regress, refused at the gate`);
      seen.add(at.name);
      at = byName.get(at.watches);
    }
  }
  // Base first, then each layer after the one it watches.
  const order = [];
  const placed = new Set();
  let guard = layers.length + 1;
  while (order.length < layers.length && guard-- > 0) {
    for (const l of layers) {
      if (placed.has(l.name)) continue;
      if (l.watches === GROUND || placed.has(l.watches)) { order.push(l); placed.add(l.name); }
    }
  }
  return { layers, order, byName };
}

/**
 * climb(tower, records, ctx) → { readings, adjustments, stoppedAt }
 * Each layer reads the record of the one it watches. A layer that returns a
 * gap adjusts nothing and the climb STOPS there: a layer above would be
 * reading a reading that was never made.
 */
export function climb(tower, records = {}, ctx = {}) {
  const readings = {};
  const adjustments = {};
  let stoppedAt = null;
  for (const layer of tower.order) {
    const below = layer.watches === GROUND ? records[layer.name] : readings[layer.watches]?.reading ?? records[layer.watches];
    if (layer.watches !== GROUND && below === undefined) { stoppedAt = { layer: layer.name, why: `nothing recorded by ${layer.watches} to read` }; break; }
    let out;
    try { out = layer.read(below, ctx) ?? {}; }
    catch (e) { out = { gap: "read_threw", why: String(e?.message ?? e).slice(0, 160) }; }
    readings[layer.name] = out;
    if (out.gap) { stoppedAt = { layer: layer.name, why: out.why ?? out.gap, gap: out.gap }; break; }
    if (out.adjust) adjustments[layer.name] = out.adjust;
  }
  return { readings, adjustments, stoppedAt };
}

/**
 * discriminating(fires, n, { floor }) → the layer-4 question, asked of any
 * cut: does it separate anything? A cut that fires on all of n or none of n
 * has told you nothing about any particular turn — it is a constant, and the
 * project's own oldest failure is a constant wearing a measurement's clothes
 * (P88's unreachable guard: a wall that never fires reads as rigour).
 *
 * `floor` is the share below which firing is indistinguishable from never,
 * and above 1 - floor from always. Declared, and honest about it: the honest
 * alternative is a null over shuffled histories, which needs more stream than
 * this has yet seen and is named as owed rather than faked.
 */
export function discriminating(fires, n, { floor = 0.02 } = {}) {
  if (!Number.isInteger(n) || n <= 0) return { gap: "empty_material", why: "no turns to audit" };
  const share = fires / n;
  if (share <= floor) return { discriminating: false, share, why: `the cut fired on ${fires} of ${n} turns — indistinguishable from a cut that never fires`, suspect: "never" };
  if (share >= 1 - floor) return { discriminating: false, share, why: `the cut fired on ${fires} of ${n} turns — indistinguishable from a cut that always fires`, suspect: "always" };
  return { discriminating: true, share, why: `the cut fired on ${fires} of ${n} turns, so it separates them` };
}
