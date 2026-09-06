// pattern.js — CON·Pattern, the first executable move at a second grain (P154).
//
// THE CEILING THIS LIFTS. P152 measured it: of the cube's 27 legal moves,
// three execute — `cast` at SIG·Figure and INS·Figure, `relations` at
// CON·Figure — and all three are Figure grain. So re-zeroing produced a
// Pattern-grain ground and nothing could read it: height 2 established
// nothing and the walk stopped at a fixed point one level up from where it
// started. The instrument could not recurse because it owned one grain.
//
// `moves.js` named this exact cell years of passes ago, from the other side.
// A page of prime ministers yielded ZERO edges — not few, zero — and the
// diagnosis there is this file's whole reason: "a list's meaning is carried
// by the RECURRENCE of an arrangement, which is Pattern grain by definition.
// There is no connector in any row, so a Figure-grain organ returns zero on
// this material correctly and permanently, however wide its vocabulary
// grows." A grain gap floors; a vocabulary gap degrades.
//
// The address: CON · Pattern → mode Relate, domain Structure, grain Pattern
// → terrain NETWORK, stance TRACING. Derived from the cube, not chosen.
//
// ── WHAT A RECURRENCE MUST SURVIVE ─────────────────────────────────────────
//
// Any repeated word looks like a pattern. Recurrence is only a finding if it
// exceeds what the same material would produce by chance, so nothing here is
// established without passing a null that holds the material's own margins
// fixed — every subject keeps its number of edges and every label keeps its
// total. `wikidata.js::curveballStep` is that null and it is injected rather
// than reimplemented: it is already the licensed pair for exactly this shape,
// with its own pin ("curveballStep preserves BOTH margins — every degree and
// every total").
//
// Censoring is the nul apparatus's own rule: a null of `draws` samples can
// resolve no finer than 1/draws, and a recurrence the null never reached is
// reported at that resolution rather than as certainty.

/** An arrangement: which axis recurs. Each is a different claim about the material. */
export const ARRANGEMENTS = Object.freeze({
  LABEL: "the same relation holding between different things",
  SUBJECT: "the same thing standing in many relations",
  OBJECT: "many things standing in the same relation to one",
});

const norm = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * arrangementsOf(edges) — the recurrences present, before any null.
 *
 * `edges` are CON·Figure's own bound claims: { end1, label, end2, ref }.
 * Only `bound` edges count; a beyond-reach edge is not a fact about the
 * material and may not contribute to a pattern in it.
 */
export function arrangementsOf(edges = []) {
  const bound = edges.filter((e) => (e?.verdict ?? "bound") === "bound" && e?.end1 && e?.label && e?.end2);
  const tally = (keyOf) => {
    const m = new Map();
    for (const e of bound) {
      const k = keyOf(e); if (!k) continue;
      const g = m.get(k) ?? { key: k, count: 0, refs: new Set(), members: [] };
      g.count += 1; if (e.ref) g.refs.add(e.ref);
      g.members.push({ end1: e.end1, label: e.label, end2: e.end2, ref: e.ref });
      m.set(k, g);
    }
    return [...m.values()].filter((g) => g.count >= 2)
      .map((g) => ({ ...g, refs: [...g.refs] }))
      .sort((a, b) => b.count - a.count);
  };
  return {
    examined: bound.length,
    byLabel: tally((e) => norm(e.label)),
    bySubject: tally((e) => norm(e.end1)),
    byObject: tally((e) => norm(e.end2)),
  };
}

/**
 * THE LEVELS. Recurrence is not one question — the same material loops at
 * several scales at once, and a pattern at one level says nothing about
 * another. User, 2026-09-06: "be sure it is looking at multiple levels of
 * loops, words, propositions, sentences, passages."
 *
 *   WORD        a token recurring across passages
 *   PROPOSITION an edge (end1,label,end2) recurring
 *   CONVERGENCE many different subjects on ONE (label,object) — the list shape
 *   SENTENCE    a sentence recurring verbatim
 *   PASSAGE     an address contributing repeatedly
 *
 * Each is scored against its own null, because the chance level of a word
 * recurring and of a proposition recurring are not remotely the same number.
 */
export const LEVELS = Object.freeze(["surface", "proposition", "convergence", "sentence", "passage"]);

/**
 * The levels that are OWED and have not run. Naming them is not decoration:
 * a level that has not run may never be read as "no pattern there", and these
 * are the two that would make this organ a reading of the material rather
 * than of its spelling.
 *
 *   referent  the same REFERENT (not surface) recurring across passages —
 *             needs the cast/referent index, which distinguishes two princes
 *   fold      what survives CURSOR MOVEMENT in the folded hypergraph. The
 *             existing machinery's own claim (eval/hypergraph-cursor.mjs):
 *             "a node at 100% may be two nodes at 25%; identity is
 *             retrieval-time." A node that persists across cursors is real;
 *             one that appears at a single cursor is an artifact of that
 *             reading depth. That is the recurrence that matters, and it is
 *             not built here.
 */
export const OWED_LEVELS = Object.freeze(["referent", "fold"]);

/**
 * THE STATISTIC, CORRECTED (and the correction is the finding).
 *
 * The first version took "the largest number of edges sharing a label" and
 * tested it against a margin-preserving rewiring. That null could never fire:
 * max-label-multiplicity is a property of the label multiset ALONE, so every
 * label-preserving shuffle returns the observed value exactly. Run against a
 * planted list of ten prime ministers it reported "a rewiring reached 10 in
 * 400 of 400 draws" and established nothing — a check structurally incapable
 * of passing, which II.10 says must report `unmeasured`, never `pass`.
 *
 * What a list actually is, is CONVERGENCE: many DIFFERENT subjects standing
 * in the same relation to the same object. That is a joint fact about (end1,
 * label, end2) and a shuffle of objects across edges has real freedom to
 * destroy it, which is what makes the null a null.
 */
export function convergence(edges = []) {
  const m = new Map();
  for (const e of edges) {
    if ((e?.verdict ?? "bound") !== "bound" || !e?.end1 || !e?.label || !e?.end2) continue;
    const k = `${norm(e.label)}\u0000${norm(e.end2)}`;
    const g = m.get(k) ?? { label: e.label, object: e.end2, subjects: new Set(), members: [] };
    g.subjects.add(norm(e.end1)); g.members.push(e);
    m.set(k, g);
  }
  return [...m.values()].map((g) => ({ ...g, count: g.subjects.size, subjects: [...g.subjects] }))
    .filter((g) => g.count >= 2).sort((a, b) => b.count - a.count);
}

/**
 * THE NULL. The edges are rewired with both margins held — every subject
 * keeps its degree, every label its total — and the largest recurrence the
 * rewiring produces is the yardstick. An observed recurrence no larger than
 * chance is not established, however striking it reads.
 *
 * `curveball` is injected (wikidata.js::curveballStep). Absent it, this
 * returns a typed gap rather than a verdict: a check that did not run never
 * reports a pass.
 */
export function recurrenceNull(edges = [], { draws = 400, seed = 1 } = {}) {
  const bound = edges.filter((e) => (e?.verdict ?? "bound") === "bound" && e?.end1 && e?.label && e?.end2);
  if (bound.length < 4) return { gap: "empty_material", why: `${bound.length} bound edge(s) is too few to test` };
  const conv = convergence(bound);
  const observed = conv.length ? conv[0].count : 0;
  if (observed < 2) return { gap: "degenerate_ground", why: "no two subjects share a relation to one object; there is no convergence to test" };

  // THE NULL NEEDS SOMETHING TO DEAL. If every edge names the same object,
  // re-dealing objects changes nothing and the null returns the observed
  // value every time — the same degeneracy that made the FIRST statistic
  // unfalsifiable, surviving into the second in a different place. Caught by
  // its own test. A ground with one object cannot be tested here and says so.
  const distinctObjects = new Set(bound.map((e) => norm(e.end2))).size;
  if (distinctObjects < 2) {
    return { gap: "degenerate_ground", observed, top: conv[0],
      why: `every edge names the same object ("${conv[0].object}"), so re-dealing objects changes nothing — this convergence cannot be tested against a null, and is not established` };
  }

  // The null with real freedom: objects are dealt across the edges at their
  // OWN observed frequencies, so the vocabulary and the edge count are held
  // and only the JOINING is destroyed. If ten subjects converge on one object
  // by chance this often, ten subjects converging is not a finding.
  const objects = bound.map((e) => norm(e.end2));
  const labels = bound.map((e) => norm(e.label));
  const subjects = bound.map((e) => norm(e.end1));
  let s2 = seed >>> 0 || 1;
  const rnd = () => ((s2 = (s2 * 1664525 + 1013904223) >>> 0) / 4294967296);
  let atLeastAsBig = 0;
  for (let d = 0; d < draws; d++) {
    const shuffled = objects.slice();
    for (let i = shuffled.length - 1; i > 0; i--) { const j2 = Math.floor(rnd() * (i + 1)); [shuffled[i], shuffled[j2]] = [shuffled[j2], shuffled[i]]; }
    const m = new Map();
    for (let i = 0; i < bound.length; i++) {
      const k2 = `${labels[i]}\u0000${shuffled[i]}`;
      const g = m.get(k2) ?? new Set(); g.add(subjects[i]); m.set(k2, g);
    }
    const best = Math.max(0, ...[...m.values()].map((g) => g.size));
    if (best >= observed) atLeastAsBig += 1;
  }
  const share = atLeastAsBig / draws;
  return {
    observed, draws, atLeastAsBig, top: conv[0],
    share: atLeastAsBig === 0 ? `<${(1 / draws).toFixed(4)}` : share.toFixed(4),
    established: share < 1 / draws || atLeastAsBig === 0,
    why: atLeastAsBig === 0
      ? `${observed} subjects converge on one relation, and a re-dealing of the same objects never reached that in ${draws} draws`
      : `a re-dealing reached ${observed} in ${atLeastAsBig} of ${draws} draws — this convergence is what the material's own vocabulary already produces`,
  };
}

/**
 * THE LOOPS AT EVERY LEVEL. One call, five scales, each against its own null —
 * because the chance level of a word recurring and of a proposition recurring
 * are not the same number and comparing them on one threshold would be the
 * binning mistake this session found four times.
 *
 * `passages` carry the text; `edges` carry the propositions read from them.
 * A level with too little to test returns a typed gap and is NOT counted as
 * "no pattern found" — a check that could not run never reports a pass.
 */
export function loops({ passages = [], edges = [], splitSentences, draws = 400, seed = 1, stopwords } = {}) {
  const out = {};
  const stop = stopwords ?? new Set("the a an of to in and or is are was were it its this that for on at by with as from be been".split(" "));
  let s2 = seed >>> 0 || 1;
  const rnd = () => ((s2 = (s2 * 1664525 + 1013904223) >>> 0) / 4294967296);

  // SURFACE — a token recurring across DIFFERENT passages.
  //
  // NAMED "surface" AND NOT "word", BECAUSE IT IS NOT A FINDING ABOUT THE
  // MATERIAL (user, 2026-09-06: "it's not about raw tokens recurrence, it's
  // about the folded hypergraphical cursor based reading"). Counting strings
  // is exactly what the referent model refuses: "prince" appearing in 14 of
  // 14 passages conflates Prince Andrew with Prince Vasili and reports the
  // conflation as a pattern. A recurrence of SURFACES is a fact about the
  // spelling; a recurrence of REFERENTS would be a fact about the material,
  // and only the second is a pattern in what the text is about.
  //
  // It is kept because it is honest about being a surface count and it does
  // one useful thing: it separates markup-dense material from prose (on the
  // Lincoln HTML the top surface is "https" in 14/14, which says the source
  // is link-dense, not that the source is about links). The referent-level
  // and fold-level loops are OWED, and are named in `notYetRun` rather than
  // silently absent — a level that has not run may never read as "no pattern".
  const perPassage = passages.map((p) => [...new Set(String(p?.text ?? "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 3 && !stop.has(w)))]);
  if (perPassage.length >= 3) {
    const tally = new Map();
    for (const ws of perPassage) for (const w of ws) tally.set(w, (tally.get(w) ?? 0) + 1);
    const observed = Math.max(0, ...tally.values());
    const flat = perPassage.flat();
    let hit = 0;
    for (let d = 0; d < draws; d++) {
      const t = new Map(); let i = 0;
      for (const ws of perPassage) { const seen = new Set();
        for (let k = 0; k < ws.length; k++) seen.add(flat[Math.floor(rnd() * flat.length)]);
        for (const w of seen) t.set(w, (t.get(w) ?? 0) + 1); i++; }
      if (Math.max(0, ...t.values()) >= observed) hit++;
    }
    const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
    out.surface = { observed, of: perPassage.length, key: top?.[0], atLeastAsBig: hit, draws, aboutSurfacesNotReferents: true,
      established: hit === 0, why: hit === 0 ? `"${top?.[0]}" appears in ${observed} of ${perPassage.length} passages, beyond anything a re-dealing reached` : `a re-dealing reached ${observed} in ${hit} of ${draws} draws` };
  } else out.surface = { gap: "empty_material", why: `${perPassage.length} passage(s) is too few to test a surface's spread` };

  // PROPOSITION and CONVERGENCE — the edge levels.
  out.convergence = recurrenceNull(edges, { draws, seed });
  const props = new Map();
  for (const e of edges) { if ((e?.verdict ?? "bound") !== "bound") continue;
    const k = `${norm(e.end1)}|${norm(e.label)}|${norm(e.end2)}`; props.set(k, (props.get(k) ?? 0) + 1); }
  const repeated = [...props.entries()].filter(([, n]) => n >= 2);
  out.proposition = repeated.length
    ? { observed: Math.max(...repeated.map(([, n]) => n)), established: true, key: repeated.sort((a, b) => b[1] - a[1])[0][0],
        why: `${repeated.length} proposition(s) stated more than once — a restatement needs no null, it is identity` }
    : { observed: 1, established: false, why: "no proposition is stated twice" };

  // SENTENCE — verbatim recurrence. Identity again, so no null is owed.
  if (typeof splitSentences === "function") {
    const seen = new Map();
    for (const p of passages) for (const sp of splitSentences(String(p?.text ?? ""))) {
      const t = String(sp?.text ?? sp).trim(); if (t.length < 25) continue;
      seen.set(t, (seen.get(t) ?? 0) + 1);
    }
    const dup = [...seen.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]);
    out.sentence = dup.length
      ? { observed: dup[0][1], established: true, key: dup[0][0].slice(0, 60), why: `${dup.length} sentence(s) appear verbatim more than once` }
      : { observed: 1, established: false, why: "no sentence appears twice verbatim" };
  } else out.sentence = { gap: "no_splitter", why: "the sentence splitter is injected; without it this level did not run" };

  // PASSAGE — an address carrying repeatedly. Identity.
  const byRef = new Map();
  for (const e of edges) { if (!e?.ref) continue; byRef.set(e.ref, (byRef.get(e.ref) ?? 0) + 1); }
  const top = [...byRef.entries()].sort((a, b) => b[1] - a[1])[0];
  out.passage = top && top[1] >= 2
    ? { observed: top[1], key: top[0], established: true, why: `${top[0]} carried ${top[1]} propositions` }
    : { observed: top?.[1] ?? 0, established: false, why: "no address carried more than one proposition" };

  const fired = LEVELS.filter((l) => out[l]?.established);
  const couldNotRun = LEVELS.filter((l) => out[l]?.gap);
  return { levels: out, fired, couldNotRun, notYetRun: OWED_LEVELS,
    why: `${fired.length} of ${LEVELS.length} level(s) established a recurrence` +
      (couldNotRun.length ? `; ${couldNotRun.length} could not run and is not counted as absence` : "") +
      `; ${OWED_LEVELS.length} level(s) (${OWED_LEVELS.join(", ")}) are not built and say nothing either way` };
}

/**
 * THE MOVE. CON·Pattern: read the established Figure edges for an arrangement
 * that recurs beyond its own null, and return it as a Pattern-grain finding
 * carrying every address it stands on.
 *
 * Nothing is generated. A Pattern here is a statement about edges that were
 * already established at Figure grain, which is what makes it legal to stand
 * on: `ascend`'s provenance rule holds, because every member carries its ref.
 */
export function conPattern(edges = [], { draws = 400, seed = 1 } = {}) {
  const nul = recurrenceNull(edges, { draws, seed });
  if (nul.gap) return { cell: "CON·Pattern", terrain: "Network", stance: "Tracing", established: [], gap: nul.gap, why: nul.why };
  if (!nul.established) return { cell: "CON·Pattern", terrain: "Network", stance: "Tracing", established: [], why: nul.why, nul };
  const top = nul.top;
  return {
    cell: "CON·Pattern", terrain: "Network", stance: "Tracing",
    established: [{
      arrangement: "CONVERGENCE", what: ARRANGEMENTS.OBJECT, key: `${top.label} → ${top.object}`, count: top.count,
      // The spans are the Figure edges' own addresses — this is what lets a
      // level above stand on this one without leaving the material.
      spans: top.members.map((m) => ({ ref: m.ref, text: `${m.end1} ${m.label} ${m.end2}` })),
    }],
    nul,
    why: `${top.count} different subjects stand in "${top.label}" to "${top.object}" — ${nul.why}`,
  };
}
