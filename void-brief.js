// void-brief.js — turn a live question and its material into a declared
// void, so a reader can SEE the space being zeroed on a real turn.
//
// The bridge between the question the person asked and void-shape.js's
// arithmetic. Everything it declares is either read off the material or
// read off an injected organ; nothing here invents a number, and every
// operator it cannot answer is left undeclared rather than defaulted, so
// `undeclaredOf` reports the truth about how well the space was specified.
//
// WHAT IT DELIBERATELY DOES NOT DO: name the fillers. Measured live
// 2026-08-26, twice — the engine's own slot query over full fetched pages
// returns "Though he", "Congress" and "22nd Amendment" as candidate vice
// presidents, and a naive capitalised-name scan over the same material
// returns "Learn More" and "Mary's Charlatans Employees". Feeding either
// list to a model as candidate answers would make the answer worse than
// saying nothing, so this brief reports the SPACE and leaves the filler
// side visibly open. The void is honest about being empty; that is the
// whole point of it, and a brief that filled it with junk to look finished
// would be the failure it exists to expose.
//
// Organs are injected (the cast.js discipline): `slotShapeOf` is
// web-claim.js's declaredSlotShape with its closed classes already bound,
// and `cellOf` is the engine's cube. This file carries neither.

import { declareVoid, spaceFrom, voidsOf, yearSpansIn } from "./void-shape.js";

// A sentence states the ANCHOR'S OWN extent when it is about the anchor and
// about holding an office — never when it is about a person's life. The
// exclusion is load-bearing and is the same trap void-shape.test.mjs pins:
// a lifespan clipped to the office's extent covers all of it and would
// report a real hole closed.
const OFFICE = /(president|presidency|term|served|office|administration)/i;
const LIFE = /(born|died|\bb\.\s|\bd\.\s|birth|death)/i;

/**
 * The extent the slot is bounded by, measured from the material rather than
 * declared by a caller: among sentences that speak of the anchor holding an
 * office, the year span stated most often.
 *
 * Returns the span AND its margin, because "1861-1865 stated 11 times
 * against a runner-up stated 3" and "two spans tied at 1" are different
 * facts and a caller must be able to tell them apart. This is a frequency
 * vote and is disclosed as one — it has NOT been measured against a null,
 * which this repo's own rule asks for before a number is trusted, so the
 * margin is reported for a reader to judge rather than silently relied on.
 */
export function extentFor(anchor, texts, { minMentions = 1 } = {}) {
  const anchorRe = anchor ? new RegExp(String(anchor).split(/\s+/).filter(Boolean).join("|"), "i") : null;
  const tally = new Map();
  for (const t of texts ?? []) {
    for (const sent of String(t ?? "").match(/[^.!?]+[.!?]?/g) ?? []) {
      if (anchorRe && !anchorRe.test(sent)) continue;
      if (!OFFICE.test(sent) || LIFE.test(sent)) continue;
      for (const s of yearSpansIn(sent)) {
        const k = `${s.from}|${s.to}`;
        tally.set(k, (tally.get(k) ?? 0) + 1);
      }
    }
  }
  const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  if (!ranked.length || ranked[0][1] < minMentions) return { extent: null, mentions: 0, margin: 0, considered: ranked.length };
  const [key, mentions] = ranked[0];
  const [from, to] = key.split("|").map(Number);
  return {
    extent: { from, to },
    mentions,
    margin: mentions - (ranked[1]?.[1] ?? 0),
    considered: ranked.length,
  };
}

/**
 * Declare the void for a live turn. `slotShapeOf(question)` supplies the
 * head phrase and the declared cardinality; the material supplies the
 * extent. Operators this cannot answer from what it was given stay
 * undeclared — a brief that guessed them would defeat the disclosure the
 * declaration exists for.
 */
export function briefFor(question, texts, { slotShapeOf, cellOf, anchor = null } = {}) {
  if (typeof cellOf !== "function") throw new TypeError("briefFor: cellOf is injected from the engine's cube");
  if (typeof slotShapeOf !== "function") throw new TypeError("briefFor: slotShapeOf is injected (web-claim.js::declaredSlotShape, classes already bound)");
  const shape = slotShapeOf(question);
  if (!shape?.headPhrase) return null; // no slot in this question — nothing to zero
  const subject = anchor ?? shape.marker ?? null;
  const found = extentFor(subject, texts);
  const declaration = declareVoid(
    {
      slot: subject ? `${shape.headPhrase} of ${subject}` : shape.headPhrase,
      anchor: subject,
      // INS/CON/SYN/EVA/REC are NOT declared here. They are real questions
      // this brief has no organ to answer yet, and leaving them open is what
      // makes `undeclaredOf` a true report rather than a decorated one.
      extent: found.extent,
      dimension: found.extent ? "years" : null,
      cardinality: shape.declared,
    },
    { cellOf },
  );
  return {
    schema: "EOVoidBrief@1",
    declaration,
    space: spaceFrom(declaration),
    standing: voidsOf(spaceFrom(declaration)),
    evidence: found,
    grammaticalNumber: shape.grammaticalNumber ?? null,
  };
}
