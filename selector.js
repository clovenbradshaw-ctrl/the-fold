// selector.js — Increment 1 of the Corpus Mouth: the Selector, propose-content mode.
//
// WHAT THIS IS. The mouth is split in two: the Selector decides WHAT gets
// said, the Realizer decides HOW it is phrased. This file is the Selector
// only — no prose, no model, no render. Given a question (or task) and a
// fixed reading (ledger notes with witnesses/spans), it returns a ranked,
// typed, address-nested candidate list. A Realizer (crown.js/compose.js, or
// a constrained model) may phrase exactly these claims later; it may never
// introduce one this file did not supply.
//
// REUSED, NOT REBUILT (the spec's own architecture):
// - resolutions.js::activeReferents + lensCut — the gate-before-generation.
//   lensCut used to run audit-after-generation (the Lens display block); here
//   it filters WHAT is proposed, before anything is generated.
// - capacity-runner.js::mergeTestimony's five-verdict vocabulary
//   (AGREE/SINGLE/UNDETERMINED/DISAGREE/CONTRADICTED) — types each candidate.
//   mergeTestimony is INJECTED (the cast.js pattern), never imported as the
//   only path, so tests run it real and callers may pass it real.
// - NAVIGATE has no such export anywhere in the-fold or eoreader7/native
//   (checked 2026-09-19); the per-note evaluate+merge loop in app.js
//   (factsTurn) is the closest real thing and is the shape this file follows.
//   No NAVIGATE function is invented here.
//
// RANKING. Corroboration strength only, never relevance guessing:
// verdict order AGREE < SINGLE < DISAGREE < CONTRADICTED < UNDETERMINED,
// then distinct-source count desc, then witness count desc, then ledger
// order (stable — ties never re-sorted by meaning).
//
// PURE. No fetch, no model, no DOM. Cut and merge organs injected.

import { activeReferents, lensCut } from "./resolutions.js";
import { mergeTestimony as defaultMerge } from "../eoreader7/native/organs/index.js";

export const VERDICT_ORDER = Object.freeze({
  AGREE: 0,
  SINGLE: 1,
  DISAGREE: 2,
  CONTRADICTED: 3,
  UNDETERMINED: 4,
});

export const SELECTOR_REFUSALS = Object.freeze({
  no_notes: "no notes were given to select from",
  nothing_carries_active: "no note carries an active referent of the question",
});

const refOf = (w) => String(typeof w === "string" ? w : (w?.at ?? w?.ref ?? "")).split("~")[0];
const sourceOf = (w) => refOf(w).split("#")[0];

function distinctSourcesOf(witnesses = []) {
  return new Set(witnesses.map(refOf).filter(Boolean).map((r) => r.split("#")[0]).filter(Boolean)).size;
}

function addressesOf(note) {
  const fromW = (note?.witnesses ?? []).map(refOf).filter((a) => a && a.includes("#"));
  const fromS = (note?.spans ?? []).map((s) => refOf(s?.ref ?? s?.at ?? s)).filter((a) => a && a.includes("#"));
  // A note's readings carry their own refs (perSourceReadings' `read` addrs
  // and edge `refs`) — an address living only there is still a real address.
  // Without this, a note whose readings hold but whose witness list is empty
  // reads as an orphan; with it, only a claim with NO address anywhere demotes.
  const fromR = (note?.readings ?? []).flatMap((r) => [
    ...((r?.read ?? []).map(refOf)),
    ...((r?.edges ?? []).flatMap((e) => (e?.refs ?? []).map(refOf))),
  ]).filter((a) => a && a.includes("#"));
  return [...new Set([...fromW, ...fromS, ...fromR])];
}

function claimOf(note) {
  return { end1: note?.subject ?? note?.end1 ?? "", label: note?.verb ?? note?.label ?? "", end2: note?.object ?? note?.end2 ?? "" };
}

/** Derive a merge-shaped verdict without a grid log: witness count only, never meaning. */
function witnessMerge(note) {
  const sources = distinctSourcesOf(note?.witnesses ?? []);
  const disputed = (note?.disputedBy ?? []).length;
  if (disputed) return { case: "DISAGREE", standing: null, sources };
  if (sources >= 2) return { case: "AGREE", standing: "corroborated", sources };
  if (sources === 1) return { case: "SINGLE", standing: "single", sources };
  return { case: "UNDETERMINED", standing: null, sources: 0 };
}

/**
 * selectContent({ question, notes, index, transcript, merge, cut }) ->
 * { candidates, refused, basis }
 *
 * - notes: ledger notes ({subject|end1, verb|label, object|end2, witnesses[], spans[], disputedBy[]});
 *   a note may also carry `readings[]` (perSourceReadings shape) for a REAL merge.
 * - merge: (readings) -> {case, standing, ...}; defaults to the real mergeTestimony.
 * - cut: ({active, index, notes, question, transcript}) -> {rows:[{n,...}], basis,...};
 *   defaults to the real lensCut.
 * - candidates: [{ claim, addresses, verdict, standing, witnesses, sources, note }];
 *   ranked by corroboration, no prose anywhere.
 */
export function selectContent({ question = "", notes = [], index = null, transcript = [], merge = defaultMerge, cut = lensCut } = {}) {
  const all = [...(notes ?? [])];
  if (!all.length) return { candidates: [], refused: { type: "no_notes", detail: SELECTOR_REFUSALS.no_notes }, basis: "no input notes" };

  let active = null;
  let activeBasis = "no conversation index — whole set in scope";
  if (index) {
    try {
      const a = activeReferents(question, transcript, index);
      active = a.ids;
      activeBasis = a.basis;
    } catch { active = null; }
  }

  let scoped = all;
  let cutBasis = activeBasis;
  if (active && active.size && typeof cut === "function") {
    let out = null;
    try { out = cut({ active, index, notes: all, question, transcript }); } catch { out = null; }
    if (out && Array.isArray(out.rows)) {
      cutBasis = `lensCut gate: ${out.basis ?? ""} (active: ${activeBasis})`;
      const kept = out.rows.map((r) => r?.n).filter(Boolean);
      // An empty cut over non-empty notes is a TYPED outcome, never silent:
      // report it rather than falling back to the whole set (a fallback here
      // would be the "decorated default" the shuffle-null exists to catch).
      if (!kept.length) {
        return { candidates: [], refused: { type: "nothing_carries_active", detail: SELECTOR_REFUSALS.nothing_carries_active }, basis: cutBasis };
      }
      scoped = kept;
    }
  }

  const ranked = scoped.map((note, order) => {
    let merged = null;
    let mergeThrew = false;
    if (Array.isArray(note?.readings) && note.readings.length && typeof merge === "function") {
      try { merged = merge(note.readings); } catch { merged = null; mergeThrew = true; }
    }
    // A merge that THREW is a gap, never evidence: falling back to
    // witness-count ranking here once inverted a unanimous refusal into
    // AGREE (the fallback counts witnesses; the refusal was their verdict).
    // Withheld as UNDETERMINED — the instrument's reach ends where its
    // check threw, and the omission stays visible.
    if (mergeThrew) merged = { case: "UNDETERMINED", standing: null, sources: 0 };
    merged = merged ?? witnessMerge(note);
    let verdict = String(merged?.case ?? "UNDETERMINED").toUpperCase();
    const witnesses = [...(note?.witnesses ?? [])];
    const addresses = addressesOf(note);
    // mouthFacing INTEGRITY (FOLD-CONSTITUTION II.9, hard fail, no partial
    // credit): a corroborated-sounding verdict with no address anywhere —
    // not on witnesses, spans, or readings — is an orphan. Demoted to
    // UNDETERMINED, disclosed on the candidate, never dropped silently:
    // compose withholds UNDETERMINED by name, so the claim stays visible
    // but unassertable downstream.
    let demoted = null;
    if (verdict !== "UNDETERMINED" && addresses.length === 0) {
      verdict = "UNDETERMINED";
      merged = { case: "UNDETERMINED", standing: null, sources: 0 };
      demoted = "orphan_no_address";
    }
    const sources = Number.isFinite(merged?.sources) ? merged.sources : distinctSourcesOf(witnesses);
    return {
      claim: claimOf(note),
      addresses,
      verdict,
      standing: merged?.standing ?? null,
      witnesses,
      sources,
      places: sources,
      order,
      demoted,
      note,
    };
  }).sort((a, b) =>
    (VERDICT_ORDER[a.verdict] ?? 99) - (VERDICT_ORDER[b.verdict] ?? 99)
    || b.sources - a.sources
    || b.witnesses.length - a.witnesses.length
    || a.order - b.order,
  );

  return { candidates: ranked, refused: null, basis: cutBasis };
}

/** scoreSelection(candidates) — the one number the shuffle-null compares. Higher = stronger. */
export function scoreSelection(candidates = []) {
  let score = 0;
  for (const c of candidates) {
    const order = VERDICT_ORDER[c?.verdict] ?? 99;
    score += (5 - Math.min(order, 5)) * 10 + Math.min(c?.sources ?? 0, 9);
  }
  return score;
}

/**
 * redealWitnesses(notes, shift = 1) — the shuffle-null control
 * (FOLD-CONSTITUTION II.4): rotate every witness bag by `shift` notes,
 * preserving marginals (each note keeps a COUNT from the real ledger) while
 * destroying co-occurrence (no claim keeps its own support).
 *
 * ONE draw is not a null (II.4: draws bound the claim; a single rotation can
 * tie on uniform material or, where the cut keeps a note that GAINS a bigger
 * bag, favor the shuffled set). Callers compare the real score against the
 * distribution over all shifts 1..n-1 and read the median, never one draw.
 * A distribution that ties throughout is UNLICENSED (zero width): the
 * material gives the statistic nothing to move, and the control reports that
 * rather than passing or failing.
 */
export function redealWitnesses(notes = [], shift = 1) {
  const all = [...(notes ?? [])];
  if (all.length < 2) return all.map((n) => ({ ...n }));
  const k = ((shift % all.length) + all.length) % all.length || all.length;
  const bags = all.map((n) => [...(n?.witnesses ?? [])]);
  return all.map((n, i) => ({ ...n, witnesses: bags[(i + k) % bags.length] }));
}

/**
 * nullScores(notes, scoreFn) — the shuffle-null distribution: scoreFn applied
 * to every rotation 1..n-1. ScoreFn receives redealt notes and returns a
 * number (usually scoreSelection of a fresh selectContent over them).
 */
export function nullScores(notes = [], scoreFn) {
  const all = [...(notes ?? [])];
  if (all.length < 2 || typeof scoreFn !== "function") return [];
  const out = [];
  for (let shift = 1; shift < all.length; shift++) out.push(scoreFn(redealWitnesses(all, shift)));
  return out;
}
