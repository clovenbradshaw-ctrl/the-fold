// snip-check.js — a section's claims checked against the snips it stands on,
// IN PROCESS, the cheap rung first (P119). Pure.
//
// User direction (2026-09-05): "now that we have the snips, what is an
// efficient way for it to evaluate the accuracy of its claims in process?"
// The order is the cost's:
//   1. SNIPS  — the spans of the section's passages that carry its
//              obligations (the cast) and its topic: verbatim, addressed.
//              These are what the section is handed to write from.
//   2. ATOMS  — every number, date and name in a drafted sentence is checked
//              against the snips by containment WITH COMPANY (P31): the atom
//              must sit in a snip beside a content word of the sentence's
//              own. No model. A number in no snip is a flag; a name in no
//              snip is a flag.
//   3. CONTRADICTION — a snip sharing the sentence's content words and
//              carrying a DIFFERENT year is a contradiction candidate: the
//              sentence says one date, the source another. No model.
//   4. Only then the witness (holon.js), and only where a flag stands.
//   5. One rewrite of the flagged sentences from the snips, accepted only
//              where the atoms now pass (holon.js).
// Every flag carries the snip it failed against or the absence it stands in.
import { numberSet, wordSet, CLAIM_STOPWORDS } from "./grounding.js";
import { namesIn } from "./ground-ladder.js";

const fold = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const contentWords = (t) => [...wordSet(fold(t))].filter((w) => w.length > 3 && !CLAIM_STOPWORDS.has(w));
const YEAR_RE = /\b(1[5-9]\d\d|20\d\d)\b/g;
/** This module's own vocabulary, and the asks built from it. A candidate
 * carrying any of it is describing the checking rather than the material. */
const APPARATUS_RE = /\b(?:appears? in (?:a|no) snip|beside none of this sentence|this section stood on|the sources do not use the (?:name|year|number)|what the sources say, verbatim|rewrite only those sentences|reply with the rewritten sentences|these sentences say things the sources|already found to be wrong on this material|bytes \d+–\d+ of that passage)\b/i;
export const SNIP_MAX = 40;         // snips a section is handed (P9: declared)
export const SNIP_WINDOW = 320;     // chars of a passage around a hit, when the passage has no sentence boundary near it

/** Split a passage into addressed sentences — the snip grain. */
function sentencesOf(passage) {
  const text = String(passage?.text ?? "");
  const out = [];
  const re = /[^.!?]+[.!?]+(?:["”’)]+)?|[^.!?]+$/g;
  let m;
  while ((m = re.exec(text))) { const s = m[0].trim(); if (s.length >= 20) out.push({ ref: passage.ref, start: m.index, end: m.index + m[0].length, text: s }); }
  return out;
}

/**
 * snipsFor(passages, { obligations, terms, max }) → [{ ref, start, end, text, hits }]
 * The sentences of the section's passages that carry an obligation or a
 * topic term, most hits first, deduplicated, capped.
 */
export function snipsFor(passages = [], { obligations = [], terms = [], max = SNIP_MAX } = {}) {
  const needles = [...new Set([...obligations, ...terms].map(fold).filter((x) => x.length > 2))];
  const seen = new Set();
  const out = [];
  for (const p of passages) {
    for (const s of sentencesOf(p)) {
      const f = fold(s.text);
      const hits = needles.filter((n) => f.includes(n));
      if (!hits.length) continue;
      const key = `${s.ref}|${s.start}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...s, hits });
    }
  }
  return out.sort((a, b) => b.hits.length - a.hits.length || a.ref.localeCompare(b.ref) || a.start - b.start).slice(0, max);
}

/** The snips as the block a section is handed: verbatim, each with its address. */
export function snipBlock(snips) {
  if (!snips.length) return "";
  return `What the sources say, verbatim, each at its address:\n${snips.map((s) => `- [${s.ref}#${s.start}-${s.end}] ${s.text.replace(/\s+/g, " ")}`).join("\n")}`;
}

/** The atoms of a sentence: numbers (years and figures) and names. */
export function atomsOf(sentence) {
  const nums = [...numberSet(sentence)].map((n) => ({ kind: /^(1[5-9]\d\d|20\d\d)$/.test(n) ? "year" : "number", value: n }));
  const names = namesIn(sentence).map((n) => ({ kind: "name", value: n }));
  return [...nums, ...names];
}

/**
 * checkSentence(sentence, snips) → { atoms, flags, contradiction, supported }
 * An atom is SUPPORTED when a snip contains it beside a content word of the
 * sentence (P31's company rule); otherwise it is a flag naming what was
 * looked for and where. A contradiction: a snip that shares ≥ 2 content
 * words with the sentence and carries a year the sentence does not, while
 * the sentence carries a year the snip does not.
 */
export function checkSentence(sentence, snips = []) {
  const atoms = atomsOf(sentence);
  const cw = contentWords(sentence);
  const flags = [];
  const supported = [];
  for (const a of atoms) {
    const needle = fold(a.value);
    const atomWords = new Set(contentWords(a.value));
    const company = cw.filter((w) => !atomWords.has(w));
    const hit = snips.find((s) => { const f = fold(s.text); return f.includes(needle) && (company.length === 0 || company.some((w) => f.includes(w))); });
    if (hit) supported.push({ ...a, ref: hit.ref, start: hit.start, end: hit.end });
    else flags.push({ ...a, reason: snips.some((s) => fold(s.text).includes(needle)) ? "no_company" : "absent", detail: `${a.kind} "${a.value}" ${snips.some((s) => fold(s.text).includes(needle)) ? "appears in a snip but beside none of this sentence's own words" : "appears in no snip this section stood on"}` });
  }
  const sentenceYears = new Set([...String(sentence).matchAll(YEAR_RE)].map((m) => m[1]));
  let contradiction = null;
  if (sentenceYears.size) {
    for (const s of snips) {
      const f = fold(s.text);
      const shared = cw.filter((w) => f.includes(w));
      if (shared.length < 2) continue;
      const snipYears = new Set([...s.text.matchAll(YEAR_RE)].map((m) => m[1]));
      if (!snipYears.size) continue;
      const theirs = [...snipYears].filter((y) => !sentenceYears.has(y));
      const mine = [...sentenceYears].filter((y) => !snipYears.has(y));
      if (theirs.length && mine.length) { contradiction = { ref: s.ref, start: s.start, end: s.end, text: s.text, sentenceYears: mine, snipYears: theirs, shared }; break; }
    }
  }
  return { atoms, flags, supported, contradiction };
}

/** The section's rows, one per sentence, and the flagged ones the rewrite is asked about. */
export function checkSection(sentences, snips) {
  const rows = sentences.map((text) => ({ sentence: text, ...checkSentence(text, snips) }));
  const flagged = rows.filter((r) => r.flags.length || r.contradiction);
  return { rows, flagged, atoms: rows.reduce((a, r) => a + r.atoms.length, 0), supported: rows.reduce((a, r) => a + r.supported.length, 0) };
}

/** The one ask a section gets for its flagged sentences: the flags as facts, the snips as the only ground. */
export function reviseAsk(flagged, snips, { words = null } = {}) {
  const lines = flagged.map((r) => {
    // PLAIN WORDS ONLY (measured live, S77 run 3): the flag's `detail` is
    // written for a person reading the export — "appears in a snip but beside
    // none of this sentence's own words" — and when it was put in front of the
    // model the model echoed it straight back into its rewrite, which then
    // landed. What the model needs is the FACT: which value the sources do not
    // carry, and what they say instead. "Snip" is this instrument's word for
    // its own working, never a fact about the world.
    const why = [
      ...r.flags.map((f) => `the sources do not use ${f.kind === "name" ? "the name" : f.kind === "year" ? "the year" : "the number"} "${f.value}" here`),
      ...(r.contradiction ? [`they say ${r.contradiction.snipYears.join(" and ")} where this says ${r.contradiction.sentenceYears.join(" and ")}: "${r.contradiction.text.replace(/\s+/g, " ").slice(0, 160)}"`] : []),
    ];
    return `- "${r.sentence}" — ${why.join("; ")}`;
  });
  return `These sentences say things the sources you were given do not:\n${lines.join("\n")}\n\n${snipBlock(snips)}\n\nRewrite only those sentences so each says what the sources establish, or drop a sentence the sources cannot support. Reply with the rewritten sentences only, one per line, in the same order; write "(dropped)" for a sentence you drop.`;
}

/** Apply a rewrite reply: line i replaces flagged sentence i when the new sentence's atoms pass; "(dropped)" removes it; anything else keeps the original. */
export function applyRewrite(text, flagged, reply, snips) {
  // Preamble lines ("Here are the rewritten sentences:") are not sentences and would shift every line after them.
  const lines = String(reply ?? "").split("\n").map((l) => l.replace(/^\s*[-*\d.)]+\s*/, "").replace(/^["“]|["”]$/g, "").trim()).filter((l) => l && !/:$/.test(l) && !/^(here|sure|certainly|okay|of course)\b/i.test(l));
  const outcomes = [];
  let out = String(text ?? "");
  flagged.forEach((r, i) => {
    const cand = lines[i] ?? null;
    if (!cand) { outcomes.push({ sentence: r.sentence, outcome: "kept", because: "no line came back" }); return; }
    if (/^\(dropped\)$/i.test(cand)) { out = out.replace(r.sentence, "").replace(/\s{2,}/g, " "); outcomes.push({ sentence: r.sentence, outcome: "dropped" }); return; }
    const c = checkSentence(cand, snips);
    // A rewrite that shares no content word with any snip stands on nothing given — refused, whatever its atoms.
    const stands = contentWords(cand).some((w) => snips.some((sn) => fold(sn.text).includes(w)));
    if (!stands) { outcomes.push({ sentence: r.sentence, candidate: cand, outcome: "refused", because: "the rewrite shares no word with any snip" }); return; }
    // A CORRECTION IS ABOUT THE SAME THING (measured live, S77 run 2): asked
    // to fix "The sources describe Prince Andrew's meeting with the Emperor",
    // the mouth returned "Our order should provide means to that end" — a
    // sentence whose atoms happened to sit in some snip, so the gate let it
    // land and the answer got a non sequitur in place of a claim. A rewrite
    // must keep the subject matter of the sentence it replaces: one content
    // word of the original, or an atom of it. Otherwise it is a different
    // sentence, not a correction, and the original stands flagged.
    // THE INSTRUMENT'S OWN WORDS MAY NEVER LAND IN THE ANSWER (measured live,
    // S77 run 3: "1. Function appears in a snip but beside none of this
    // sentence's own words It uses a combination of rules…" reached the
    // product because the echoed phrase's atoms passed the atom check).
    if (APPARATUS_RE.test(cand)) { outcomes.push({ sentence: r.sentence, candidate: cand, outcome: "refused", because: "the rewrite echoes the instrument's own words back" }); return; }
    const own = contentWords(r.sentence);
    const kept = own.filter((w) => contentWords(cand).includes(w));
    const keptAtom = r.atoms.some((a) => fold(cand).includes(fold(a.value)));
    if (own.length && !kept.length && !keptAtom) { outcomes.push({ sentence: r.sentence, candidate: cand, outcome: "refused", because: "the rewrite is about something else — a correction keeps the subject of the sentence it replaces" }); return; }
    if (c.flags.length || c.contradiction) { outcomes.push({ sentence: r.sentence, candidate: cand, outcome: "refused", because: c.contradiction ? "the rewrite still contradicts a snip" : `the rewrite still carries ${c.flags.map((f) => `"${f.value}"`).join(", ")} unsupported` }); return; }
    if (!out.includes(r.sentence)) { outcomes.push({ sentence: r.sentence, candidate: cand, outcome: "kept", because: "the sentence is no longer in the text" }); return; }
    out = out.replace(r.sentence, cand);
    outcomes.push({ sentence: r.sentence, candidate: cand, outcome: "rewritten" });
  });
  return { text: out.trim(), outcomes };
}
