// nagarjuna.js — Nāgārjuna, the archon of the void: DEFINES what would need
// to be satisfied, and TESTS any filling by consequence (prasaṅga).
//
// Dependent arising (pratītyasamutpāda): a slot has NO own-being. It is
// defined by what it depends on — its ANCHOR (what the question is about),
// its KIND (what a "who"/"when"/"how many" asks for — received grammar,
// giver-named), and what STANDS AGAINST it (the material's own claims about
// the anchor). This module makes that explicit: `defineVoid` returns the
// slot's dependencies and the three things satisfaction requires of a
// filling; `prasaṅga` tests a candidate filling by its consequences — does
// it HOLD against the material, or COLLAPSE? A wrong filling collapses under
// examination; a grounded one holds. The tetralemma is the verdict space:
// a filling is affirmed (filled), negated (honestly-absent), both/neither
// (vacuous — collapses), or untested (unexamined).
//
// PURE. `deriveSlot` (slot-shape) supplies the dependent-arising of the
// question; `relationsFor` (the relation reader) supplies the material's
// claims; `decline` is the received absence detector. Aletheia renders the
// final satisfaction verdict AGAINST these slots.

export const PRASANGA = Object.freeze({
  HOLDS: "holds",
  COLLAPSES: "collapses",
  UNTESTED: "untested",
});

export const TERRAINS = Object.freeze([
  "void", "entity", "kind", "field", "link", "network", "atmosphere", "lens", "paradigm",
]);

// what it MEANS for an answer to satisfy at each terrain — the satisfaction
// each terrain's judgment is wired to.
export const TERRAIN_SATISFACTIONS = Object.freeze({
  void: "the answer is measured against the declared slot",
  entity: "the answer engages the same beings the question does",
  kind: "the being is the kind the slot asked for",
  field: "the answer holds against the material's whole ground",
  link: "the answer's claim binds to a material edge",
  network: "the answer composes with what the reading already holds",
  atmosphere: "the reading's regime is declared, not hidden",
  lens: "the judgment stands on a declared position",
  paradigm: "the answer's standing in the whole is established",
});

export const KOTIS = Object.freeze({
  FILLED: "filled",
  HONESTLY_ABSENT: "honestly-absent",
  VACUOUS: "vacuous",
  UNEXAMINED: "unexamined",
});

export function makeNagarjuna({ deriveSlot = null, relationsFor = null, decline = null, material = [], organs = {} } = {}) {
  const isDecline = (s) => (typeof decline === "function" ? decline(s) : false);

  /**
   * defineVoid(question) — the slot's dependent arising: what the slot IS,
   * and what a filling must do. Every field names its dependency.
   */
  function defineVoid(question) {
    const d = typeof deriveSlot === "function" ? deriveSlot(question) : { anchor: null, slot: null, kind: "unknown" };
    return {
      question,
      anchor: d.anchor,
      slot: d.slot,
      kind: d.kind,
      // what stands against the slot: the material's own claims about the
      // anchor (the reading's edges) — the ground a filling must hold against.
      against: material.length
        ? (relationsFor ? material.map((m) => m) : [])
        : [],
      requires: {
        addressed: `the answer engages ${d.anchor ? `the being "${d.anchor}"` : "the question"}`,
        filled: d.kind === "date" || d.kind === "number"
          ? `the answer supplies the ${d.kind}: "${d.slot}"`
          : `the answer supplies a claim for: "${d.slot}"`,
        grounded: `the supply HOLDS against the material (prasaṅga) — or, when the material is silent, the answer says so plainly`,
      },
    };
  }

  /**
   * prasaṅga(answer, void) — test a candidate filling by its consequences.
   * Returns {standing, reason} where standing is holds / collapses / untested.
   *   holds       — the answer's claim binds to the material (or the answer
   *                 honestly states the material is silent).
   *   collapses   — the answer's claim binds to nothing (or contradicts the
   *                 material), or the answer is a vacuous echo of the question.
   *   untested    — no claim could be extracted from the answer to test.
   */
  function prasaṅga(answer, v = {}) {
    if (isDecline(answer)) return { standing: PRASANGA.HOLDS, reason: "the void is honestly empty — the absence is the answer", koti: KOTIS.HONESTLY_ABSENT };
    const reader = relationsFor ? relationsFor(material.length ? material : v.against ?? [], { pool: material.length ? material : v.against ?? [] }) : null;
    const claims = reader?.read?.(answer)?.claims ?? [];
    if (!claims.length) {
      // vacuous echo or genuinely no claim: test by the question-echo
      const aw = String(answer).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
      const qw = new Set(String(v.question ?? "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2));
      const novel = aw.filter((w) => !qw.has(w)).length;
      if (novel < 2) return { standing: PRASANGA.COLLAPSES, reason: `the filling is a vacuous echo of the question (adds ${novel} new word${novel === 1 ? "" : "s"})`, koti: KOTIS.VACUOUS };
      return { standing: PRASANGA.UNTESTED, reason: "no claim could be extracted from the answer to test", koti: KOTIS.UNEXAMINED };
    }
    const verdict = claims[0].verdict ?? null;
    if (verdict === "bound") return { standing: PRASANGA.HOLDS, reason: `the claim binds the material (${claims.length} claim${claims.length === 1 ? "" : "s"})`, koti: KOTIS.FILLED };
    if (verdict === "contradicted") return { standing: PRASANGA.COLLAPSES, reason: "the claim CONTRADICTS the material", koti: KOTIS.FILLED };
    if (verdict === "unbound" || verdict === "beyond-reach" || verdict === "unheard") return { standing: PRASANGA.COLLAPSES, reason: `the claim binds to nothing in the material (${verdict})`, koti: KOTIS.FILLED };
    return { standing: PRASANGA.UNTESTED, reason: `no verdict could be reached (${verdict ?? "none"})`, koti: KOTIS.UNEXAMINED };
  }

  /**
   * prasaṅgaTerrains — the FULL holographic walk: all nine terrains, each
   * through its own organ, each asking its own satisfaction question of the
   * answer. A terrain with no organ injected is UNJUDGEABLE — disclosed,
   * never silently skipped and never a pass. The answer SATISFIES iff every
   * judgeable terrain holds.
   */
  function terrainVerdict(t, answer, v = {}, q = "") {
    const O = (name) => organs?.[name];
    switch (t) {
      case "void": {
        if (!v.slot) return { judgeable: false, terrain: "void", reason: "no slot declared" };
        return { judgeable: true, terrain: "void", standing: PRASANGA.HOLDS, reason: `slot "${v.slot}" declared; the answer is measured against it` };
      }
      case "entity": {
        const idx = O("entity");
        if (!idx?.resolve) return { judgeable: false, terrain: "entity", reason: "no referent index (cast.js) injected" };
        let qr = null, ar = null;
        try { qr = idx.resolve(q); ar = idx.resolve(answer); } catch { /* skip */ }
        if (!qr || !ar) return { judgeable: false, terrain: "entity", reason: qr ? "the answer's surfaces resolve to no being" : "the question's surfaces resolve to no being" };
        const same = qr === ar || (qr instanceof Set && ar instanceof Set && qr.size && ar.size && [...qr].every((x) => ar.has(x)));
        return { judgeable: true, terrain: "entity", standing: same ? PRASANGA.HOLDS : PRASANGA.COLLAPSES, reason: same ? "engages the same beings" : "engages different beings" };
      }
      case "kind": {
        const kindOf = O("kind");
        if (typeof kindOf !== "function") return { judgeable: false, terrain: "kind", reason: "no kind organ (kind-standing.js, P79) injected" };
        const want = v.kind;
        let is = null;
        try { is = kindOf(answer); } catch { /* skip */ }
        if (is == null) return { judgeable: false, terrain: "kind", reason: "the being's kind is unresolved" };
        return { judgeable: true, terrain: "kind", standing: is === want ? PRASANGA.HOLDS : PRASANGA.COLLAPSES, reason: `the answer supplies a ${is}; the slot asked for ${want ?? "anything"}` };
      }
      case "field": {
        const coverage = O("field");
        if (typeof coverage !== "function") return { judgeable: false, terrain: "field", reason: "no field organ (cite.js::coverage, pool-wide) injected" };
        const c = coverage(answer);
        const refs = Array.isArray(c) ? c.filter((x) => x?.ref) : [];
        if (!refs.length) return { judgeable: true, terrain: "field", standing: PRASANGA.COLLAPSES, reason: "the answer holds against no passage of the material's ground" };
        return { judgeable: true, terrain: "field", standing: PRASANGA.HOLDS, reason: `the answer holds against ${refs.length} passage${refs.length === 1 ? "" : "s"} of the ground` };
      }
      case "link": {
        const reader = relationsFor;
        if (!reader) return { judgeable: false, terrain: "link", reason: "no relation reader injected" };
        const claims = reader.read?.(answer)?.claims ?? [];
        if (!claims.length) return { judgeable: false, terrain: "link", reason: "no claim extracted to bind" };
        const verdict = claims[0].verdict ?? null;
        if (verdict === "bound") return { judgeable: true, terrain: "link", standing: PRASANGA.HOLDS, reason: "the claim binds a material edge" };
        if (verdict === "contradicted") return { judgeable: true, terrain: "link", standing: PRASANGA.COLLAPSES, reason: "the claim CONTRADICTS the material" };
        return { judgeable: true, terrain: "link", standing: PRASANGA.COLLAPSES, reason: `the claim binds to no edge (${verdict ?? "none"})` };
      }
      case "network": {
        const ledger = O("network");
        if (!ledger?.fold) return { judgeable: false, terrain: "network", reason: "no ledger organ (the record) injected" };
        const notes = ledger.fold() ?? [];
        const claim = (relationsFor?.read?.(answer)?.claims ?? [])[0];
        if (!claim) return { judgeable: false, terrain: "network", reason: "no claim to compose" };
        const key = [claim.end1 ?? claim.subject, claim.label ?? claim.verb, claim.end2 ?? claim.object].map((s) => String(s ?? "").toLowerCase().trim()).join("|");
        const composed = notes.some((n) => [n.end1 ?? n.subject, n.label ?? n.verb, n.end2 ?? n.object].map((s) => String(s ?? "").toLowerCase().trim()).join("|") === key);
        return { judgeable: true, terrain: "network", standing: composed ? PRASANGA.HOLDS : PRASANGA.COLLAPSES, reason: composed ? "the claim composes with the record" : "nothing in the record holds this claim" };
      }
      case "atmosphere": {
        const pathos = O("atmosphere");
        if (typeof pathos !== "function") return { judgeable: false, terrain: "atmosphere", reason: "no pathos organ injected" };
        try {
          const r = pathos({ text: answer });
          if (r?.refused) return { judgeable: false, terrain: "atmosphere", reason: `pathos refused: ${r.refused}` };
          return { judgeable: true, terrain: "atmosphere", standing: PRASANGA.HOLDS, reason: `the reading's felt shape is declared (strain ${r?.strain ?? "report"}, for ${r?.forWhom ?? "the reader"})` };
        } catch (e) { return { judgeable: false, terrain: "atmosphere", reason: `pathos refused (no declared experiencer): ${e?.message ?? e}` }; }
      }
      case "lens": {
        const frameOf = O("lens");
        if (typeof frameOf !== "function") return { judgeable: false, terrain: "lens", reason: "no frame organ injected — the judgment would stand from nowhere" };
        try {
          const f = frameOf();
          return { judgeable: true, terrain: "lens", standing: PRASANGA.HOLDS, reason: f?.declared ? `judged from a declared position (${f.declared})` : "a frame is declared" };
        } catch { return { judgeable: false, terrain: "lens", reason: "no frame declared — no view from nowhere" }; }
      }
      case "paradigm": {
        const logos = O("logos");
        const standingOf = O("paradigm");
        // LOGOS: the answer's claim, added to the record's notes, must not
        // turn the argument in on itself (reasoning-lint's findClaimCycle).
        // An answer that introduces a cycle into the whole is logically
        // unsound, whatever it binds to — logos, wired at the paradigm rung.
        if (typeof logos === "function") {
          const ledger = O("network");
          const notes = (ledger?.fold?.() ?? []);
          const claim = (relationsFor?.read?.(answer)?.claims ?? [])[0];
          if (claim) {
            const asNote = { id: "answer:claim", end1: claim.end1 ?? claim.subject, label: claim.label ?? claim.verb, end2: claim.end2 ?? claim.object, conceded: false };
            const cyc = logos([...notes, asNote]);
            if (cyc?.length) return { judgeable: true, terrain: "paradigm", standing: PRASANGA.COLLAPSES, reason: `the claim turns the argument in on itself (${cyc.length} cycle${cyc.length === 1 ? "" : "s"})` };
            return { judgeable: true, terrain: "paradigm", standing: PRASANGA.HOLDS, reason: "the claim stands soundly in the whole (no cycle)" };
          }
        }
        if (typeof standingOf !== "function") return { judgeable: false, terrain: "paradigm", reason: "no standing organ (and no logos organ) injected" };
        const s = standingOf(answer);
        return { judgeable: true, terrain: "paradigm", standing: s ? PRASANGA.HOLDS : PRASANGA.COLLAPSES, reason: s ? `standing established: ${s}` : "the answer's standing is unestablished" };
      }
      default:
        return { judgeable: false, terrain: t, reason: "unknown terrain" };
    }
  }

  function prasaṅgaTerrains(answer, v = {}, ctx = {}) {
    const q = v.question ?? ctx.question ?? "";
    const verdicts = {};
    for (const t of TERRAINS) verdicts[t] = terrainVerdict(t, answer, v, q);
    const judged = TERRAINS.filter((t) => verdicts[t].judgeable);
    const satisfied = judged.length > 0 && judged.every((t) => verdicts[t].standing === PRASANGA.HOLDS);
    return {
      satisfied,
      judgedTerrains: judged.length,
      totalTerrains: TERRAINS.length,
      verdicts,
      satisfies: judged.map((t) => TERRAIN_SATISFACTIONS[t]),
    };
  }

  return { defineVoid, prasaṅga, prasaṅgaTerrains, PRASANGA, KOTIS, TERRAINS, TERRAIN_SATISFACTIONS };
}