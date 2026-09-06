// cursor.js — the fold level: what cursor movement actually shows (P156).
//
// User, 2026-09-06: "it's not about raw tokens recurrence, it's about the
// folded hypergraphical cursor based reading" — and, on levels: "it should be
// an arbitrary number of levels working on any type of material."
//
// This is the level `pattern.js::OWED_LEVELS` named and did not build. It
// reads the hypergraph projected from the reading log at several cursors, so
// the unit is a REFERENT the reading resolved, never a string that recurred:
// "prince" in 14 of 14 passages conflates two princes; `ref:auto:vasili` and
// `ref:auto:prince_vasili_kuragin` are told apart because the reading told
// them apart.
//
// Node identity is comparable across cursors: an id is minted once as a pure
// function of its founding surface (`ref:auto:${diaNorm(surface)}`,
// surfaces.js:1102), not a counter and not retrieval-scoped, so two
// projections of the same log mint the same strings.
//
// ── THE FIRST THING MEASURED, AND IT KILLED THE OBVIOUS DESIGN ─────────────
//
// "A pattern is what survives cursor movement" is VACUOUS on this machinery.
// The fold is upsert-only — `applyObservation` and `applyDelta` both end in
// `upsertManyById`, and the sole removal in the payload switch touches
// `fold.provisional`, never `graphEntries`. Measured on War and Peace's first
// 120 KB at four cursors: 32 of 32 nodes present at 50% are still present at
// 100%, and the lost set is EMPTY at every step. Everything survives, so
// survival distinguishes nothing.
//
// What does carry information is what a node DOES after it appears:
//
//   LIVE        still arriving at the last cursor
//   DORMANT     stopped arriving — the reading has moved on from it
//   SUPERSEDED  dormant, and its surface now belongs to a node that grew one
//
// The third is a MERGE, and it is why this file exists.
//
// ── THE DEFECT THIS RECOVERS FROM ─────────────────────────────────────────
//
// `discoverReferents` detects merges and records them:
// `merges.push({ kept: referentId, folded, witness: surface })`
// (surfaces.js:1083), returned at surfaces.js:1165 as `{ events, gaps,
// merges }`. The perceiver's cache reads `events` and `gaps` and NEVER
// `merges` (recursive.js:297–303). Verified: the only `.merges` consumer in
// either repo is an unrelated one in clearance.js. So the record is computed
// and thrown away, and the projection's own header — "a node at cursor 500
// may be two nodes at cursor 200, and scrubbing the cursor SHOWS that" —
// is left to the reader of two node lists to notice.
//
// Seen live in the same run: `ref:auto:prince_vasili_kuragin` is the ONE node
// whose surfaces grew, while `ref:auto:vasili` went dormant. That is the
// merge, sitting in the residue with nothing naming it.
//
// So `supersessions` below RECOVERS the merge by inference — dormancy plus
// surface capture — and says so. It is a reconstruction, weaker than the
// record that was discarded, and is reported as `inferred` rather than as
// testimony. The real repair is upstream: stop dropping `merges`.

/** What a node is doing at the last cursor. Three states, and they are not degrees of one thing. */
export const STATES = Object.freeze({ LIVE: "live", DORMANT: "dormant", SUPERSEDED: "superseded" });

const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * trace(projections) — the fold level, over an ARBITRARY number of cursors.
 *
 * `projections` are `EOHypergraph@1` objects in cursor order (whatever
 * `projectHypergraph(log, {atSeq})` returned). Two is the minimum; there is
 * no maximum and no assumption about spacing, because the caller's cursors
 * are the caller's business.
 *
 * Material-agnostic by construction: nothing here reads text. It reads nodes,
 * their arrival counts and their surfaces, which is what any perceiver's
 * projection carries.
 */
export function trace(projections = []) {
  if (projections.length < 2) return { gap: "empty_material", why: `${projections.length} cursor(s) — a trace needs at least two to compare` };
  const at = projections.map((g) => new Map((g?.nodes ?? []).map((n) => [n.id, n])));
  const last = at[at.length - 1];
  const first = at[0];

  // The vacuity check, run rather than assumed: if nothing is ever lost, say
  // so, so that no caller reports "survived the cursor" as a finding.
  const lost = [...first.keys()].filter((id) => !last.has(id));
  const rows = [];
  for (const [id, node] of last) {
    const arrivalsNow = (node.arrivals ?? []).length;
    // Where it first appeared, and whether it has arrived since.
    const firstSeen = at.findIndex((m) => m.has(id));
    const before = firstSeen >= 0 && firstSeen < at.length - 1 ? (at[at.length - 2].get(id)?.arrivals ?? []).length : null;
    const stillArriving = before == null ? true : arrivalsNow > before;
    rows.push({ id, surfaces: node.surfaces ?? [], arrivals: arrivalsNow, firstSeenAt: firstSeen,
      state: stillArriving ? STATES.LIVE : STATES.DORMANT });
  }
  return {
    cursors: projections.length,
    nodes: rows,
    lost,
    monotone: lost.length === 0,
    // Stated every time, because the obvious reading of a cursor trace is the
    // wrong one on an upsert-only fold.
    persistenceIsVacuous: lost.length === 0,
    why: lost.length === 0
      ? "no node was lost at any cursor — this fold is upsert-only, so persistence distinguishes nothing and only what a node DOES carries information"
      : `${lost.length} node(s) present at the first cursor are absent at the last`,
  };
}

/**
 * supersessions(traced) — merges RECOVERED by inference, because the record
 * was discarded upstream.
 *
 * A node is superseded when it has gone dormant AND one of its surfaces now
 * belongs to a node that gained surfaces. That is the visible residue of
 * `merges.push({ kept, folded, witness })` — the same event, reconstructed
 * from its footprint instead of read from its record.
 *
 * `inferred: true` on every row is not decoration. This is weaker than the
 * testimony that exists and is thrown away, and a caller must be able to tell
 * a reconstruction from a witness.
 */
export function supersessions(traced, firstProjection) {
  if (traced?.gap) return { gap: traced.gap, why: traced.why };
  const before = new Map((firstProjection?.nodes ?? []).map((n) => [n.id, new Set((n.surfaces ?? []).map(norm))]));
  const grew = traced.nodes.filter((n) => {
    const was = before.get(n.id);
    return was && n.surfaces.map(norm).some((s) => !was.has(s));
  });
  const out = [];
  for (const d of traced.nodes.filter((n) => n.state === STATES.DORMANT)) {
    const mine = new Set(d.surfaces.map(norm));
    for (const g of grew) {
      if (g.id === d.id) continue;
      const captured = g.surfaces.map(norm).filter((s) => mine.has(s) || norm(g.id).includes(norm(d.id).replace("ref:auto:", "")));
      if (captured.length) { out.push({ folded: d.id, kept: g.id, inferred: true,
        why: `${d.id} stopped arriving while ${g.id} gained surfaces covering it — the footprint of a merge whose record was discarded` }); break; }
    }
  }
  return { supersessions: out, inferred: true,
    why: out.length
      ? `${out.length} merge(s) reconstructed from dormancy plus surface capture; the upstream record (surfaces.js merges) is discarded at recursive.js and this is weaker than it`
      : "no merge footprint found at these cursors" };
}

/** The three states, counted — the fold level's finding, in the shape `pattern.js::loops` reports. */
export function foldLevel(projections = []) {
  const t = trace(projections);
  if (t.gap) return { level: "fold", gap: t.gap, why: t.why };
  const sup = supersessions(t, projections[0]);
  const folded = new Set((sup.supersessions ?? []).map((s) => s.folded));
  const rows = t.nodes.map((n) => (folded.has(n.id) ? { ...n, state: STATES.SUPERSEDED } : n));
  const count = (s) => rows.filter((r) => r.state === s).length;
  return {
    level: "fold", cursors: t.cursors, nodes: rows.length,
    live: count(STATES.LIVE), dormant: count(STATES.DORMANT), superseded: count(STATES.SUPERSEDED),
    persistenceIsVacuous: t.persistenceIsVacuous,
    supersessions: sup.supersessions ?? [],
    // A finding, and an honest one: the states separate, and "survived" does not.
    established: count(STATES.DORMANT) > 0 || count(STATES.SUPERSEDED) > 0,
    why: `${count(STATES.LIVE)} live, ${count(STATES.DORMANT)} dormant, ${count(STATES.SUPERSEDED)} superseded across ${t.cursors} cursors` +
      (t.persistenceIsVacuous ? "; persistence itself distinguishes nothing here and is not reported as a finding" : ""),
  };
}
