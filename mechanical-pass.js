// mechanical-pass.js — the pre-speech walk: what the instrument can close
// before the model speaks, cell by cell, and the exact residual the mouth
// must compose.
//
// THE LAW (2026-09-16, user direction): the mechanical pass is the
// instrument's unconscious — a walk over earned units, silent by default.
// The model is not a second kind of cognition; it handles the residue the
// earned units cannot cover. You never decide "mechanical vs model" ahead
// of time — you run the pass, and the first typed refusal is the boundary.
// A claim with an address was known before the model existed; a claim
// without one is the mouth's, and is marked.
//
// WHICH CELLS CLOSE, AND HOW:
//   NUL·Ground  measure  — is there any material at all? (admission)
//   SIG·Ground  settle   — the void named as the questions that would
//                          settle it (whatWouldSettle)
//   SIG·Figure  cast     — the question's referents resolved (referentIndex)
//   INS·Figure  build    — the exact doors: the question answered at an
//                          address, no model at all (answerBeforeTheModel)
//   SEG·Figure  patch    — the cuts: a misquote, a smuggled premise
//   CON·Figure  relations— the material's own bound edges about the asked-
//                          about, closed over the morphology prior (sameAct)
//                          — this is where INFLECTIONAL PARAPHRASE closes
//   SYN·Figure  hear     — the sedimented reading (re-sighting = one note)
//   DEF·Figure  priors   — the frame declared; the premise graded
//   EVA·Figure  web      — the expectation: what the material states about
//                          the asked-about, before the draft
//   REC·Figure  rezero   — anything the pass conceded (a prior answer the
//                          material contradicts)
//
// Each cell returns a CLOSE (with addresses — the instrument knew) or a
// typed REFUSAL (what is missing — the model's authorization). The walk
// never guesses: a cell that cannot close refuses with the reason, and
// the residual is exactly the question minus every close.
//
// PURE. No model, no I/O. Every organ arrives injected (the cast.js
// pattern); absent organs degrade a cell to a typed refusal, never a
// silent skip that looks like a close.

const CELL_ORDER = ["NUL·Ground", "SIG·Ground", "SIG·Figure", "INS·Figure", "SEG·Figure", "CON·Figure", "SYN·Figure", "DEF·Figure", "EVA·Figure", "REC·Figure"];

const refusal = (cell, type, detail = "") => Object.freeze({ cell, act: null, close: null, refusal: Object.freeze({ type, detail }) });
const closing = (cell, act, text, addresses = [], why = null) => Object.freeze({ cell, act, close: Object.freeze({ text, addresses, why }), refusal: null });

/**
 * runMechanicalPass({ question, organs, context }) → { cells, closes, residual, boundary }
 *
 * `organs` injects (each optional; an absent organ degrades its cell to a
 * typed refusal):
 *   admission({ question, sources })      → { admitted, refused } (NUL·Ground)
 *   whatWouldSettle(loop)                 → the settling questions (SIG·Ground)
 *   referentIndex.resolveIn(question)     → referent ids (SIG·Figure)
 *   answerBeforeTheModel({ question, passages, transcript, math, chunksByRef })
 *                                         → the exact doors (INS·Figure)
 *   findMisquote(question, passages)      → { misquoted, shouldBe, said } (SEG·Figure)
 *   checkPremises(question, passages, opts) → { unverified, contradicted } (DEF·Figure)
 *   read(passageText)                     → { claims } bound edges (CON·Figure)
 *   sameAct(a, b)                         → the morphology prior (CON·Figure)
 *   hearNote(existing, note)              → whether a re-sighting folds (SYN·Figure)
 *
 * `context` supplies the material: { passages, transcript, chunksByRef,
 * math, voids, loop, questionReferents }.
 *
 * Returns:
 *   cells    every cell walked, in chain order, each close or refusal
 *   closes   the closes only — what the instrument knew before the model
 *   residual the question minus the closes: what the mouth must compose,
 *            or null when the pass closed the whole question
 *   boundary the first typed refusal (cell + type), or null when closed
 */
export function runMechanicalPass({ question, organs = {}, context = {} }) {
  const q = String(question ?? "");
  const cells = [];
  const closes = [];
  const addressesSeen = new Set();

  const addClose = (cell, act, text, addresses = [], why = null) => {
    const c = closing(cell, act, text, addresses, why);
    cells.push(c);
    closes.push(c.close);
    for (const a of addresses ?? []) if (a) addressesSeen.add(a);
    return c;
  };
  const addRefusal = (cell, type, detail = "") => {
    const r = refusal(cell, type, detail);
    cells.push(r);
    return r;
  };

  // ── NUL·Ground — measure: is there any material at all? ───────────────
  const admission = organs.admission;
  if (admission) {
    try {
      const a = admission({ question: q, sources: context.sources ?? [] });
      if (a?.admitted?.length) {
        addClose("NUL·Ground", "measure", `${a.admitted.length} source(s) admitted against the question's ground`, a.admitted.map((s) => s?.ref).filter(Boolean));
      } else if (a?.refused?.length) {
        addRefusal("NUL·Ground", "no_admitted_material", `the question shares nothing with ${a.refused.length} candidate source(s)`);
      } else {
        addRefusal("NUL·Ground", "no_material", "no sources offered for this question");
      }
    } catch { addRefusal("NUL·Ground", "organ_error", "admission threw"); }
  } else {
    addRefusal("NUL·Ground", "no_admission_organ", "admission not injected");
  }

  // ── SIG·Ground — settle: the void as the questions that would close it ─
  if (organs.whatWouldSettle && context.loop) {
    try {
      const s = organs.whatWouldSettle(context.loop);
      if (s?.length) addClose("SIG·Ground", "settle", `${s.length} question(s) would settle the declared void`, [], s.map((x) => x.ask).join(" | "));
      else addRefusal("SIG·Ground", "no_open_void", "nothing would settle — no admitted-but-unplaced filler, no uncovered stretch");
    } catch { addRefusal("SIG·Ground", "organ_error", "whatWouldSettle threw"); }
  } else {
    addRefusal("SIG·Ground", "no_void_loop", "no loop or whatWouldSettle injected");
  }

  // ── SIG·Figure — cast: the question's referents resolve ───────────────
  if (organs.referentIndex) {
    try {
      const r = organs.referentIndex.resolveIn ? organs.referentIndex.resolveIn(q) : null;
      const ids = r instanceof Set ? [...r] : Array.isArray(r) ? r : null;
      if (ids?.length) addClose("SIG·Figure", "cast", `${ids.length} referent(s) the material establishes resolve from the question`, ids, "referent identity, never a string match");
      else addRefusal("SIG·Figure", "no_resolved_referent", "no referent the material establishes resolves from the question's names");
    } catch { addRefusal("SIG·Figure", "organ_error", "referentIndex threw"); }
  } else {
    addRefusal("SIG·Figure", "no_referent_index", "referentIndex not injected");
  }

  // ── INS·Figure — build: the exact doors, answered before any model ────
  if (organs.answerBeforeTheModel) {
    try {
      const known = organs.answerBeforeTheModel({ question: q, passages: context.passages ?? [], transcript: context.transcript ?? [], math: context.math ?? null, chunksByRef: context.chunksByRef ?? null });
      if (known) addClose("INS·Figure", "build", known.text, known.addresses ?? [], known.why ?? "the instrument knows the answer exactly, at an address");
      else addRefusal("INS·Figure", "not_exactly_answerable", "the exact doors declined (or the question wants prose)");
    } catch { addRefusal("INS·Figure", "organ_error", "answerBeforeTheModel threw"); }
  } else {
    addRefusal("INS·Figure", "no_exact_door", "answerBeforeTheModel not injected");
  }

  // ── SEG·Figure — patch: the cuts the material forces on the question ──
  const passages = context.passages ?? [];
  if (organs.findMisquote && passages.length) {
    try {
      const m = organs.findMisquote(q, passages);
      if (m?.misquoted) addClose("SEG·Figure", "patch", `the sources say ${m.shouldBe.join(", ")}, not ${m.said.join(", ")}`, [], "a misquote cut before the draft");
      else addRefusal("SEG·Figure", "no_misquote", "no quoted span contradicts the material");
    } catch { addRefusal("SEG·Figure", "organ_error", "findMisquote threw"); }
  } else {
    addRefusal("SEG·Figure", "no_misquote_organ", "findMisquote not injected, or no passages");
  }

  // ── CON·Figure — relations: the material's own bound edges about the
  //    asked-about, closed over the morphology prior (the paraphrase seam) ─
  if (organs.read && passages.length) {
    const same = organs.sameAct ?? null;
    const claims = [];
    const seen = new Set();
    for (const p of passages) {
      let cs = [];
      try { cs = organs.read(String(p?.text ?? ""))?.claims ?? []; } catch { cs = []; }
      for (const c of cs) {
        if (c?.verdict !== "bound") continue;
        const e1 = String(c.end1 ?? c.subject ?? "").toLowerCase();
        const e2 = String(c.end2 ?? c.object ?? "").toLowerCase();
        const qw = q.toLowerCase();
        const touch = (e) => {
          if (!e) return false;
          if (qw.includes(e)) return true;
          if (same) {
            const qwords = qw.match(/\p{L}{4,}/gu) ?? [];
            return qwords.some((w) => same(w, e));
          }
          return false;
        };
        if (!touch(e1) && !touch(e2)) continue;
        const key = `${e1}|${String(c.label ?? c.verb ?? "").toLowerCase()}|${e2}`;
        if (seen.has(key)) continue;
        seen.add(key);
        claims.push({ text: [c.end1 ?? c.subject, c.label ?? c.verb, c.end2 ?? c.object].filter(Boolean).join(" "), refs: [...new Set([p.ref, ...(c.refs ?? [])].filter(Boolean))], morphology: same ? "sameAct" : null });
      }
    }
    if (claims.length) addClose("CON·Figure", "relations", `${claims.length} claim(s) the material states about what was asked: ${claims.map((c) => c.text).join("; ")}`, [...new Set(claims.flatMap((c) => c.refs))], claims[0].morphology ? "inflectional paraphrase closed through the morphology prior" : "bound edges");
    else addRefusal("CON·Figure", "nothing_bound", "no bound edge touches the asked-about");
  } else {
    addRefusal("CON·Figure", "no_relation_reader", "no relation reader injected, or no passages");
  }

  // ── SYN·Figure — hear: the sedimented reading folds re-sightings ──────
  if (organs.hearNote && context.priorNotes) {
    try {
      let folded = 0;
      for (const n of context.priorNotes) {
        try { if (organs.hearNote(null, n)?.folded) folded += 1; } catch { /* one note */ }
      }
      if (folded) addClose("SYN·Figure", "hear", `${folded} re-sighting(s) fold into notes already heard`, [], "corroboration makes a finding structural");
      else addRefusal("SYN·Figure", "nothing_new_to_hear", "no re-sighting folds into an existing note");
    } catch { addRefusal("SYN·Figure", "organ_error", "hearNote threw"); }
  } else {
    addRefusal("SYN·Figure", "no_notes", "no hearNote or priorNotes injected");
  }

  // ── DEF·Figure — priors: the premise the question smuggles in, graded ─
  if (organs.checkPremises && passages.length) {
    try {
      const p = organs.checkPremises(q, passages, { referentIndexFor: organs.referentIndexFor ?? null });
      const refused = p?.contradicted?.length;
      if (refused) addClose("DEF·Figure", "priors", `the question's premise "${p.contradicted[0].text}" is contradicted by the material`, [], "the premise is checked, never assumed");
      else if (p?.unverified?.length) addRefusal("DEF·Figure", "unverified_premise", `${p.unverified.length} premise(s) the material does not carry`);
      else addRefusal("DEF·Figure", "no_premise", "no premise the question smuggles in");
    } catch { addRefusal("DEF·Figure", "organ_error", "checkPremises threw"); }
  } else {
    addRefusal("DEF·Figure", "no_premise_check", "checkPremises not injected, or no passages");
  }

  // ── EVA·Figure — web: the expectation composed before the draft ───────
  if (organs.expectationFrom && passages.length) {
    try {
      const exp = organs.expectationFrom(passages, q, organs.read, organs.referentIndex ?? null, context.voids ?? []);
      if (exp?.claims?.length) addClose("EVA·Figure", "web", `${exp.claims.length} expected claim(s) — what the material states about what was asked, before the draft`, [...new Set(exp.claims.flatMap((c) => c.refs ?? []))], `by ${exp.basis}`);
      else if (exp?.voids?.length) addClose("EVA·Figure", "web", `${exp.voids.length} declared absence(s) — looked for and not found so far`, [], "a typed void, never a finding that it is false");
      else addRefusal("EVA·Figure", "no_expectation", "the material states nothing about what was asked");
    } catch { addRefusal("EVA·Figure", "organ_error", "expectationFrom threw"); }
  } else {
    addRefusal("EVA·Figure", "no_expectation_organ", "expectationFrom not injected, or no passages");
  }

  // ── REC·Figure — rezero: anything the pass itself conceded ────────────
  if (organs.priorConceded && context.priorAnswers) {
    try {
      const conceded = organs.priorConceded(context.priorAnswers, q);
      if (conceded?.length) addClose("REC·Figure", "rezero", `${conceded.length} earlier answer(s) conceded against the material`, conceded.map((c) => c?.ref).filter(Boolean), "a ground conceded before a word is spoken");
      else addRefusal("REC·Figure", "nothing_conceded", "no earlier answer contradicts the material");
    } catch { addRefusal("REC·Figure", "organ_error", "priorConceded threw"); }
  } else {
    addRefusal("REC·Figure", "no_record", "no priorConceded or priorAnswers injected");
  }

  // ── the residual: the question minus every close ──────────────────────
  // ONLY THE EXACT DOOR (INS·Figure) eliminates the residual — it knows the
  // answer at an address, no model at all. Every other close NARROWS the
  // residual (the material's facts ride with it, addressed) but the mouth
  // must still compose: a close like "the material states the French army
  // crossed the Niemen" does not answer "did it retreat?" — the question's
  // own act was never covered, and claiming it was would be the fabrication
  // this pass exists to refuse.
  const exact = cells.find((c) => c.cell === "INS·Figure")?.close ?? null;
  const answered = Boolean(exact);
  const firstRefusal = cells.find((c) => c.refusal);
  const residual = answered
    ? null
    : Object.freeze({
        question: q,
        closes: closes.map((c) => ({ ...c, cell: cells.find((x) => x.close === c)?.cell ?? null })),
        why: firstRefusal ? `the mechanical pass exhausted at ${firstRefusal.cell}: ${firstRefusal.refusal.detail}` : "no cell could close — the whole question is the mouth's",
        boundary: firstRefusal ? { cell: firstRefusal.cell, type: firstRefusal.refusal.type } : null,
      });

  return Object.freeze({ cells, closes, residual, boundary: residual?.boundary ?? null, answered });
}