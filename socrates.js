// socrates.js — Socrates, the archon of the standing question.
//
// NOT A SAFETY MECHANISM, and this file is written so it cannot become one
// by accident: it never withholds, edits, blocks, or refuses a render
// (P186 — the mouth is not censored; crown.js already never edits a word
// of what comes back). Nothing here checks content for harm, nothing here
// has a severity, nothing here has a REFUSE. The one thing it does is
// DISCLOSE, beside a render's own standing, the question a careful reader
// would ask next — because being asked a real question, honestly, is what
// makes a reader think for themselves, not because withholding an answer
// would be safer. That is an effectiveness claim, not a guardrail: Plato's
// own aporetic dialogues (Euthyphro, Laches, Charmides, Republic I) end in
// a NAMED not-yet-knowing and treat that as the delivered result, not a
// failure of the form. This file's whole design follows that shape —
// never supply the missing premise, produce one counter-instance that
// survives the interlocutor's OWN stated criterion, stop at aporia rather
// than hand over a replacement belief.
//
// What this is not:
//   - a second corroboration counter (capacity-runner.js::mergeTestimony's
//     job — this file only reads its already-computed verdict, exactly
//     the way crown.js only renders it);
//   - a personality layer (the ethos-grounded role-carriers, e.g.
//     marcus-aurelius.js/ramakrishna.js, already hold the rule that an
//     archon's voice must trace to its own real canon, never a thematic
//     gloss — this file holds the identical discipline: every question
//     below cites the Platonic passage it is drawn from);
//   - a gate. crown.js's `socratic` field is purely additive disclosure,
//     exactly like its existing `apparatus` field — nothing in this file
//     can change a render's `text` or `verified`, and nothing here is
//     called anywhere in the crown build's own verification wall.
//
// THE BANK IS CLOSED (five rows: one per real mergeTestimony case, plus
// the question-begs-itself case logos.js::questionCycle already detects
// independently of any case). A caller asking for a phrasing outside this
// table is refused with a thrown error — the same discipline crown.js's
// own `connectiveWords` already holds for an undeclared connective id.
// Growing the bank means editing this file and its test, in the open,
// never composing a sixth question at runtime.
//
// PURE. No model call, no fetch, no DOM.

export const BANK = Object.freeze([
  {
    id: "elenchus-definition",
    fires: "SINGLE",
    cites: "Plato, Euthyphro 6d–11b",
    question: () =>
      "What's the case for this, on its own — not what agrees with it, but what would make it true?",
  },
  {
    id: "elenchus-counterinstance",
    fires: "DISAGREE",
    cites: "Plato, Republic I, 331c–336a",
    question: (m) => {
      const who = m.refused?.[0]?.who ?? "the source that disagrees";
      return `Here's a reading that holds the opposite. What would have to be true of ${who} for it to be the one that's wrong?`;
    },
  },
  {
    id: "elenchus-aporia",
    fires: "UNDETERMINED",
    cites: "Plato, Meno 80a–d",
    question: () =>
      "Nothing here settles it yet. That's the honest place to be — what would actually settle it, if you went and looked?",
  },
  {
    id: "elenchus-unanimous-refusal",
    fires: "CONTRADICTED",
    cites: "Plato, Apology 21b–23b",
    question: (m) => {
      const witnesses = m.refused ?? [];
      const who = witnesses[0]?.who ?? "the source";
      return witnesses.length > 1
        ? `Every witness here refuses this — including ${who}. What made it seem plausible before you checked?`
        : `${who} refuses this. What made it seem plausible before you checked?`;
    },
  },
  {
    // Never reached via `merged.case` (fires: null) — this row only ever
    // renders when a caller passes a real questionCycle result. It exists
    // in the same closed table as every other row so the whole bank stays
    // one declared, auditable list rather than four rows here and a fifth
    // phrase invented at the call site.
    id: "elenchus-question-begs-itself",
    fires: null,
    cites: "Plato, Republic I, 336e–338b",
    question: (_m, cycle) => {
      const premise = cycle?.cycle?.[0] ?? "the first premise";
      return `This only follows if ${premise} is already granted — is it, or is that the actual thing in question?`;
    },
  },
]);

function findBank(id) {
  const row = BANK.find((r) => r.id === id);
  if (!row) throw new RangeError(`socrates.js: "${id}" is not a declared question — the bank is closed`);
  return row;
}

/**
 * The one public entry point.
 *
 * `merged` — mergeTestimony's own return value (`{case, holds, refused,
 * undetermined, standing}`).
 * `cycle` — optional: logos.js::questionCycle's own return value, when a
 * caller has one. Only the question-begs-itself row ever needs it.
 *
 * Returns `null` for AGREE with no cycle: two or more real, independent
 * witnesses agreeing IS the honest resting point, and forcing a question
 * onto it would be reflexive doubt, not Socratic method — the dialogues
 * this file is built from never practice elenchus for its own sake; they
 * stop only where the interlocutor's OWN account gives out. Every other
 * case returns `{id, cites, text}` — disclosure only, never a verdict.
 */
export function socraticQuestion(merged, cycle = null) {
  const m = merged ?? {};
  if (cycle) {
    const row = findBank("elenchus-question-begs-itself");
    return { id: row.id, cites: row.cites, text: row.question(m, cycle) };
  }
  const row = BANK.find((r) => r.fires === m.case);
  if (!row) return null;
  return { id: row.id, cites: row.cites, text: row.question(m) };
}
