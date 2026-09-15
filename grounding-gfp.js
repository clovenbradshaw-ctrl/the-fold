// grounding-gfp.js — the GFP-base grounding adapter (2026-09-15, user
// direction: "meaning is relational, identity is the universe folded at a
// point bounded by distinctions that make a difference with a particular for
// whom"; "you've stuck in SVO if it works on english but not those, the base
// is GFP"; "word order matters in some languages conventions and not in
// others"; "GFP slots themselves are eigenvalues determined by things
// specific to those languages"; "if I asked the capital of France and someone
// said 'uh france, capital is' in a yoda like way, I wouldn't say that was
// factually wrong, I'd say it's GRAMMATICALLY wrong"; "there is a role for an
// LLM to make a judgement call eventually, but as a last resort"). Pure.
//
// THE TWO CONVENTIONS, KEPT APART (this is the whole design):
//
//   ROLE ASSIGNMENT IS THE GRAMMAR. Which token is the FIGURE (the subject,
//   the thing the sentence is about) and which is the GROUND (the object,
//   what it is related to) is a LANGUAGE-SPECIFIC rule — word order in
//   isolating scripts (English, Chinese), case endings in inflectional ones
//   (Russian, Latin, Turkish), root-and-pattern in Semitic (Hebrew, Arabic),
//   the segmenter in CJK. This is the SLOT ORGAN's job — the language's own
//   EIGENVALUE. It is a grammar question, and a language declares its own.
//   Crucially, a "Yoda" reorder — "uh, france, capital is" — does NOT change
//   the roles: the figure is still France's capital, the ground is still
//   Paris. It is GRAMMATICALLY wrong, not factually wrong, and it must ground.
//
//   RELATION IDENTITY IS THE MEANING. Once the roles are resolved to an
//   arrangement {end1, label, end2} — figure, act, ground — identity is
//   ORDER-INDEPENDENT: "capital of France —is→ Paris" is the same relation
//   whether the words come in SVO or Yoda order. This is Parmenides' `same`
//   (parmenides.js): identity through the equivalence forms, never through a
//   string. "France is the capital of Paris" has DIFFERENT ends (the figure
//   is France, the ground is Paris's capital) — OTHER, refused. The roles
//   make the difference; the word order does not.
//
// THE LADDER, MECHANICAL FIRST, THE LLM LAST (user: "a role for an LLM to
// make a judgement call eventually, but as a last resort"). This adapter is
// the MECHANICAL middle tier — below the byte `verbatim` rung (the bytes
// state it) and above the witness. A sentence grounds here when its RESOLVED
// RELATION is a note the material already asserts (heard into the medium-
// blind ledger, kernel/notes.js — no grammar in the store). Only when no
// mechanical tier decides does the witness (an LLM) read the passage and
// answer "does it state this?" — its verdict derived mechanically from the
// pair (P32), never the model's own classification.
//
// `slotsOf` (the language's role eigenvalue), `makeNotes` (the hyperlexicon
// seam) and `parmenides` (parmenides.js) are INJECTED — the cast.js pattern —
// so this module stays pure and node-testable. The DEFAULT slot organ is
// ordered trigrams (positional), correct for order-matter isolating scripts;
// a caller reading an inflectional, Semitic or CJK text injects that
// language's own slot organ.
//
// THE SLOTS ARE THE LANGUAGE'S EIGENVALUES (the user's principle, applied):
// the arrangement's {end1, label, end2} is not a universal SVO and not even a
// universal adjacency — it is the invariant structure of the language read,
// determined by THAT language's own signals:
//
// THE LADDER, MECHANICAL FIRST, THE LLM LAST (user: "a role for an LLM to
// make a judgement call eventually, but as a last resort"). This adapter is
// the MECHANICAL middle tier — below the byte `verbatim` rung (the bytes
// state it) and above the witness. A sentence grounds here when its RESOLVED
// RELATION is a note the material already asserts (heard into the medium-
// blind ledger, kernel/notes.js — no grammar in the store). Only when no
// mechanical tier decides does the witness (an LLM) read the passage and
// answer "does it state this?" — its verdict derived mechanically from the
// pair (P32), never the model's own classification.
//
// `slotsOf` (the language's role eigenvalue), `makeNotes` (the hyperlexicon
// seam) and `parmenides` (parmenides.js) are INJECTED — the cast.js pattern —
// so this module stays pure and node-testable. The DEFAULT slot organ is
// ordered trigrams (positional), correct for order-matter isolating scripts;
// a caller reading an inflectional, Semitic or CJK text injects that
// language's own slot organ.

/** Ordered word trigrams — the DEFAULT eigenvalue for order-matter isolating
 *  scripts: position IS the slot structure (English, Chinese). */
export function positionalSlots(text) {
  const w = String(text ?? "").split(/\s+/).filter(Boolean).map((t) => t.replace(/[.,;:!?]+$/u, ""));
  const out = [];
  for (let i = 0; i + 2 < w.length; i++) out.push({ end1: w[i], label: w[i + 1], end2: w[i + 2] });
  return out;
}

import { kindOf } from "./relation-kinds.js";

/** The received determiner class (priors.js, lang/en) — the definiteness
 *  signal that STAYS ON when word order turns OFF. */
const DETERMINERS = new Set(["the", "a", "an", "this", "that", "these", "those"]);
const GENITIVE_MARKERS = new Set(["of", "'s"]);

/** An NP unit found by STRUCTURE, not position: [det]? head (of [det]?
 *  possessor)* — "the capital of France", "Paris", "France". The determiner
 *  marks the phrase; the genitive binds head to possessor; neither is a
 *  position signal. */
function structuralNps(tokens) {
  const units = [];
  let i = 0;
  const n = tokens.length;
  while (i < n) {
    const t = tokens[i].toLowerCase();
    if (t === "is" || t === "are" || t === "was" || t === "were") { i++; continue; } // the copula is the label, never an end
    if (DETERMINERS.has(t)) { i++; continue; } // determiner opens an NP; its head is next
    let np = tokens[i];
    let j = i + 1;
    while (j + 1 < n && GENITIVE_MARKERS.has(tokens[j].toLowerCase())) {
      if (DETERMINERS.has(tokens[j + 1].toLowerCase())) { j++; continue; }
      np = `${np} of ${tokens[j + 1]}`;
      j += 2;
    }
    units.push(np);
    i = j;
  }
  return units;
}

/**
 * THE ENGLISH ROLE ORGAN (2026-09-15, user: "to understand yoda, we actually
 * turn OFF some conventions"). Role assignment is the grammar — which token
 * is the FIGURE and which the GROUND is a language convention, and for a
 * Yoda register the WORD-ORDER convention is turned OFF while the
 * STRUCTURAL conventions (definiteness, genitive, the copula) stay ON. This
 * organ reads an English sentence with the word-order convention declared:
 *
 *   `englishSlots(text)`           — word order ON (canonical SVO): the
 *     figure is the NP before the copula, the ground the NP after.
 *   `englishSlots(text, {wordOrder:false})` — word order OFF (Yoda): the two
 *     NP units are the ends regardless of which side of the copula they sit,
 *     and the copula-identity is canonicalized (X is Y ≡ Y is X).
 *
 * The distinction that makes a difference is the STRUCTURE, never position:
 * "France is the capital of Paris" has the definite description `capital of
 * Paris` as one end — OTHER to the material's `capital of France` — while
 * "The capital of France, Paris is" (Yoda) resolves to the SAME `capital of
 * France | is | Paris`. The determiners and genitives are the conventions
 * that stay ON; the order is the one that turns OFF.
 */
export function englishSlots(text, { wordOrder = true } = {}) {
  const toks = String(text ?? "").split(/\s+/).filter(Boolean).map((t) => t.replace(/[.,;:!?]+$/u, ""));
  if (toks.length < 3) return [];
  const units = structuralNps(toks);
  if (units.length < 2) return [];
  const labelIdx = toks.findIndex((t) => ["is", "are", "was", "were"].includes(t.toLowerCase()));
  if (labelIdx < 0) return [];
  const label = toks[labelIdx];
  let [a, b] = [units[0], units[1]];
  if (wordOrder) {
    // Canonical SVO: figure = NP before the copula, ground = NP after.
    const before = toks.slice(0, labelIdx).filter((t) => !DETERMINERS.has(t.toLowerCase())).filter((t) => !["is", "are", "was", "were"].includes(t.toLowerCase()));
    const after = toks.slice(labelIdx + 1).filter((t) => !DETERMINERS.has(t.toLowerCase()));
    const headBefore = before[before.length - 1];
    const headAfter = after[after.length - 1];
    const hasGen = (u) => u.includes(" of ");
    if (headBefore && hasGen(units.find((u) => u.startsWith(headBefore) || u.endsWith(headBefore)) ?? "") && units.some((u) => u === a && hasGen(u))) {
      // genitive phrase before the copula is the figure; a bare noun after is the ground
      a = units.find((u) => u.startsWith(headBefore) || u.endsWith(headBefore)) ?? a;
      b = units.find((u) => !u.startsWith(headBefore) && !u.endsWith(headBefore) && !hasGen(u)) ?? b;
    } else if (headAfter && hasGen(units.find((u) => u.startsWith(headAfter) || u.endsWith(headAfter)) ?? "")) {
      b = units.find((u) => u.startsWith(headAfter) || u.endsWith(headAfter)) ?? b;
      a = units.find((u) => !u.startsWith(headAfter) && !u.endsWith(headAfter)) ?? a;
    } else {
      a = units[0]; b = units[1];
    }
    return [{ end1: a, label, end2: b }];
  }
  // WORD ORDER OFF (Yoda): position ignored, structure canonicalized.
  const aGen = a.includes(" of "), bGen = b.includes(" of ");
  const [x, y] = aGen !== bGen ? (aGen ? [a, b] : [b, a]) : [a, b].sort();
  return [{ end1: x, label, end2: y }];
}

export function makeGfpGround({
  makeNotes,
  slotsOf = positionalSlots,
  recipe = "gfp-adjacency",
  witnessFor = (p) => p.ref ?? "passages", frame = { reader: "gfp-adjacency" },
  taskLog = null, parmenides = null,
} = {}) {
  if (!makeNotes || typeof slotsOf !== "function")
    throw new TypeError("makeGfpGround: makeNotes and slotsOf are injected — required, never defaulted");
  const notesFactory = taskLog ? () => makeNotes(taskLog) : makeNotes;

  return function gfpGround({ passages = [], sentence = null } = {}) {
    const notes = notesFactory();
    let log = notes.createHyperlexicon({ frame });
    const materialSets = (passages ?? []).map((p) => new Set(String(p?.text ?? "").split(/\s+/).filter(Boolean).map((t) => t.replace(/[.,;:!?]+$/u, ""))));
    const materialSlots = new Set((passages ?? []).flatMap((p) => slotsOf(p?.text ?? "").flatMap((s) => {
      // Copula-identity canonicalization, same rule as claimsFor: both orders
      // of "X is Y" are one relation, so the material's own slots carry both
      // the raw and the canonical (definite-description-first) key.
      if (["is", "are", "was", "were"].includes(String(s.label).toLowerCase())) {
        const a = String(s.end1), b = String(s.end2);
        const aGen = a.includes(" of "), bGen = b.includes(" of ");
        const [x, y] = aGen !== bGen ? (aGen ? [a, b] : [b, a]) : [a, b].sort();
        return [`${s.end1}|${s.label}|${s.end2}`, `${x}|${s.label}|${y}`];
      }
      return [`${s.end1}|${s.label}|${s.end2}`];
    })));

    // Hear the material's slots into the ledger as notes, addressed in the
    // stream's own EVENT-ORDINAL coordinates (arrangementsFrom's convention,
    // P5.2) — never a string index, which the token-cleaning would break.
    for (const p of passages ?? []) {
      const text = String(p?.text ?? "");
      if (!text.trim()) continue;
      const rawToks = text.split(/\s+/).filter(Boolean);
      const cleanToks = rawToks.map((t) => t.replace(/[.,;:!?]+$/u, ""));
      const slots = slotsOf(text);
      for (const s of slots) {
        // A slot end may be multi-word ("capital of France") — locate its
        // first token in the stream for the event-ordinal address, not a
        // whole-string index (P5.2: the address must read back as its pair).
        const firstTok = String(s.end1).split(/\s+/)[0];
        const i = cleanToks.indexOf(firstTok);
        if (i < 0) continue;
        log = notes.hear(log, {
          subject: s.end1, verb: s.label, object: s.end2,
          witness: `${witnessFor(p)}~${recipe}`,
          spans: [{ at: `${p.ref ?? "passages"}#e${i}-e${i + 3}` }],
          because: `${s.end1} ${s.label} ${s.end2}`,
        });
      }
    }
    const folded = notes.foldHyperlexicon(log);
    // THE CELL, FROM THE METASTRUCTURE (relation-kinds.js, user: "the
    // metastructure is the meaning"). Every arrangement's label resolves to
    // one of the 27 cells via kindOf — so the reading compares CELLS, never
    // label strings. This is what makes it omnilingual: a Hebrew copula, an
    // English "is", a Russian inflection all land on SIG·Figure, because the
    // cell is a place in the lattice, not a string. A note whose label no
    // closed kind admits keeps the raw label and is honestly unclassed.
    const withCell = (n) => {
      const k = kindOf(n.label ?? n.verb);
      return k?.gap ? n : { ...n, cell: k.cell, kindFrom: k.from, terrain: k.terrain, stance: k.stance, domain: k.domain };
    };
    const foldedCells = folded.map(withCell);

    // RESTATEMENT GUARD (the user's principles applied): form is the identity.
    // Every answer token must be SAME to a material token (Parmenides) or
    // literally present — a token the material never uses, in any form, is a
    // typo or invention, OTHER, and the GFP claims are withheld (the verbatim
    // rung's byte refusal stands). Whether a REORDER is a restatement is the
    // slot organ's own answer: the positional eigenvalue refuses a flip, the
    // inflectional eigenvalue admits a case-marked reorder.
    const sameAsMaterial = (t) => {
      if (materialSets.some((ms) => ms.has(t))) return true;
      // SHORT TOKENS ARE FUNCTION WORDS in essentially every script's
      // orthography (was, by, את, של, de, im, is) — introduced by
      // construction (a passive), not a new claim; exempt, never a wall.
      // A token 4+ letters long that the material never uses, in any form,
      // is a typo or invention.
      if (t.length <= 3) return true;
      if (!parmenides) return false;
      for (const ms of materialSets) for (const m of ms) { try { if (parmenides.same(t, m)?.verdict === "same") return true; } catch { /* one form refusing is not a wall */ } }
      return false;
    };

    const claimsFor = (s) => {
      if (!s) return [];
      const sToks = String(s).split(/\s+/).filter(Boolean).map((t) => t.replace(/[.,;:!?]+$/u, ""));
      if (!sToks.length) return [];
      if (sToks.some((t) => !sameAsMaterial(t))) return [];
      // ONLY the answer's slots that the material itself asserts — the
      // distinction that makes a difference. A flipped/fabricated claim
      // shares none, so nothing is emitted and the `recorded` rung stays
      // silent. A COPULA-IDENTITY relation is canonicalized (X is Y ≡ Y is X
      // — "the capital of France is Paris" and "Paris is the capital of
      // France" are the same relation, order-independent; the distinction
      // that makes a difference is WHICH definite description, carried by
      // structure, never by which side it sits on — the user's Yoda point).
      const canonPair = (sl) => {
        if (["is", "are", "was", "were"].includes(String(sl.label).toLowerCase())) {
          const a = String(sl.end1), b = String(sl.end2);
          const aGen = a.includes(" of "), bGen = b.includes(" of ");
          return aGen !== bGen ? (aGen ? [a, b] : [b, a]) : [a, b].sort();
        }
        return [String(sl.end1), String(sl.end2)];
      };
      return slotsOf(String(s))
        .filter((sl) => {
          const [e1, e2] = canonPair(sl);
          return materialSlots.has(`${e1}|${sl.label}|${e2}`);
        })
        .map((sl) => {
          const [e1, e2] = canonPair(sl);
          const k = kindOf(sl.label);
          return { end1: e1, label: sl.label, end2: e2, sentence: String(s), ...(k?.gap ? {} : { cell: k.cell, kindFrom: k.from, terrain: k.terrain, stance: k.stance, domain: k.domain }) };
        });
    };

    return { notes: foldedCells, claimsFor, ledger: log, materialSlots };
  };
}