// grounding.js — is every checkable claim in this answer actually in the bytes?
//
// Ported from eochatX's app/client/eo-citation-check.ts (itself a port of
// eoWebLLM's, itself a port of eochat's server/citation-check.js). The
// organising idea is unchanged: a claim attached to material must be backed by
// bytes that material actually contains, and that is checked mechanically —
// string containment — for the two things a model most often invents, numbers
// and proper names. It never judges whether an uncited claim is true.
//
// This complements what was already here. `checkCitations` in source.js checks
// ADDRESSES: did the answer cite something it was handed. `attribute` in
// cite.js attaches an address where the model wrote none. Neither looks inside
// the sentence. This does: it pulls the figures and names out of the answer and
// asks whether the material says them at all. Together they answer three
// different questions, and a record built from all three can say what a turn
// established, where, and what it made up.
//
// What was left behind, and why: eochatX's file carries an inline void-marker
// renderer, a "did you mean" corrector, citation snippeting, a polarity check,
// evasion detection, multi-ground cross-checking and a re-surf resolver. All of
// them serve UI surfaces or pipeline stages this app does not have. Porting
// them would be assuming complexity rather than earning it.
//
// Pure: no DOM, no IO, no model.

import { foldDiacritics } from "./source.js";

export const CLAIM_STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "this",
  "that",
  "these",
  "those",
  "there",
  "here",
  "it",
  "its",
  "he",
  "she",
  "they",
  "them",
  "his",
  "her",
  "hers",
  "their",
  "theirs",
  "we",
  "us",
  "our",
  "ours",
  "you",
  "your",
  "yours",
  "i",
  "me",
  "my",
  "mine",
  "who",
  "whom",
  "whose",
  "which",
  "what",
  "where",
  "why",
  "how",
  "and",
  "but",
  "or",
  "nor",
  "so",
  "yet",
  "for",
  "as",
  "if",
  "then",
  "than",
  "when",
  "while",
  "after",
  "before",
  "since",
  "because",
  "although",
  "though",
  "unless",
  "until",
  "whether",
  "in",
  "on",
  "at",
  "by",
  "to",
  "from",
  "with",
  "within",
  "without",
  "of",
  "about",
  "into",
  "onto",
  "over",
  "under",
  "between",
  "among",
  "through",
  "during",
  "against",
  "toward",
  "towards",
  "upon",
  "across",
  "per",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "am",
  "has",
  "have",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "shall",
  "should",
  "can",
  "could",
  "may",
  "might",
  "must",
  "let",
  "let's",
  "no",
  "not",
  "yes",
  "both",
  "each",
  "every",
  "either",
  "neither",
  "some",
  "any",
  "all",
  "none",
  "few",
  "many",
  "much",
  "more",
  "most",
  "less",
  "least",
  "several",
  "one",
  "two",
  "three",
  "other",
  "another",
  "same",
  "such",
  "own",
  "very",
  "only",
  "just",
  "also",
  "too",
  "still",
  "already",
  "always",
  "never",
  "often",
  "again",
  "first",
  "second",
  "third",
  "next",
  "last",
  "later",
  "earlier",
  "now",
  "today",
  "however",
  "moreover",
  "therefore",
  "thus",
  "hence",
  "meanwhile",
  "instead",
  "overall",
  "finally",
  "additionally",
  "furthermore",
  "nevertheless",
  "besides",
  "accordingly",
  "consequently",
  "similarly",
  "conversely",
  "notably",
  "indeed",
  // Discourse adverbs a small model loves to open sentences with. They are
  // never proper names, so a capitalized "Unfortunately" is grammar, not a
  // claim — flagging it makes the reader pay for the model's mannerisms.
  "unfortunately",
  "fortunately",
  "thankfully",
  "regrettably",
  "admittedly",
  "sadly",
  "luckily",
  "ironically",
  "surprisingly",
  "honestly",
  "interestingly",
  "perhaps",
  "maybe",
  "possibly",
  "likely",
  "clearly",
  "importantly",
  "generally",
  "specifically",
  "particularly",
  "essentially",
  "ultimately",
  "together",
  "according",
  "based",
  "note",
  "given",
  "regarding",
  "concerning",
  "despite",
  "well",
  "actually",
  "otherwise",
  "source",
  "sources",
  "passage",
  "passages",
  "text",
  "texts",
  "document",
  "documents",
  "answer",
  "answers",
  "question",
  "questions",
  "reader",
  "material",
  "context",
  "citation",
  "citations",
  "quote",
  "quotes",
  "summary",
  "response",
]);

export const NUMBER_RE = /\b\d[\d,]*(?:\.\d+)?%?\b/g;
const PROPER_RE =
  /\p{Lu}[\p{L}]*(?:['\u2019][\p{L}]+)?(?:[ -](?:of|the|de|von|van|del|la|le)?[ ]?\p{Lu}[\p{L}]*(?:['\u2019][\p{L}]+)?)*/gu;

export function wordSet(s) {
  const set = new Set();
  // Folded the same way retrieval folds (source.js::foldDiacritics): the
  // check must judge the same alphabet the search searched, or every
  // accented name in a found passage reads as invented.
  for (const w of foldDiacritics(String(s || "").toLowerCase()).split(/[^\p{L}\p{N}]+/u)) if (w) set.add(w);
  return set;
}

const NUM_IN_TEXT_RE = /\d[\d,]*(?:\.\d+)?/g;
export function numberSet(s) {
  const set = new Set();
  const src = String(s || "");
  NUM_IN_TEXT_RE.lastIndex = 0;
  let m;
  while ((m = NUM_IN_TEXT_RE.exec(src)) !== null) set.add(m[0].replace(/,/g, ""));
  return set;
}

/**
 * A word counts as present if the bytes contain it, or a long-enough stem of
 * it. "Investigation" in the answer is supported by "investigations" in the
 * source; four characters is the shortest thing that can be a stem rather than
 * a coincidence.
 */
const MIN_STEM = 4;
export function hasWord(words, word) {
  // Both sides of the containment pass through the same fold — an answer
  // that copies the source's own accents must not fail against an index
  // that folded them.
  const w = foldDiacritics(String(word).toLowerCase());
  if (words.has(w)) return true;
  if (w.length < MIN_STEM) return false;
  for (const hw of words) {
    if (hw.length >= MIN_STEM && (hw.startsWith(w) || w.startsWith(hw))) return true;
  }
  return false;
}

export function hasNumber(numbers, token) {
  return numbers.has(String(token).replace(/,/g, ""));
}

// A source that says "Chief Executive" supports an answer that says "CEO", and
// the reverse. These are fixed, symmetric equivalences applied to the index at
// build time, so the check itself stays exact string containment. Deliberately
// small: office roles only, nothing that collides with ordinary prose.
const ABBREV_EXPANSIONS = {
  ceo: ["chief", "executive"],
  coo: ["chief", "operating", "officer"],
  cfo: ["chief", "financial", "officer"],
  cto: ["chief", "technology", "officer"],
  cio: ["chief", "information", "officer"],
  cmo: ["chief", "marketing", "officer"],
  vp: ["vice", "president"],
};

export function abbreviationExpansion(word) {
  const key = String(word || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return ABBREV_EXPANSIONS[key] ?? null;
}

/** One index over everything the turn was given, both directions expanded. */
export function buildUnionIndex(passages) {
  const words = new Set();
  const numbers = new Set();
  for (const p of passages) {
    for (const w of wordSet(p.text)) words.add(w);
    for (const n of numberSet(p.text)) numbers.add(n);
    // A row group's column names are part of what the material says.
    if (p.header) for (const w of wordSet(p.header)) words.add(w);
  }
  for (const w of [...words]) {
    const exp = abbreviationExpansion(w);
    if (exp) for (const e of exp) words.add(e);
  }
  for (const [key, phrase] of Object.entries(ABBREV_EXPANSIONS)) {
    if (phrase.every((p) => hasWord(words, p))) words.add(key);
  }
  return { words, numbers };
}

export function tokenSupported(index, isNumber, token) {
  if (isNumber) return hasNumber(index.numbers, token);
  if (hasWord(index.words, token)) return true;
  const exp = abbreviationExpansion(token);
  if (exp) return exp.every((e) => hasWord(index.words, e));
  return false;
}

const ABBREV =
  /(?:\b(?:mr|mrs|ms|dr|st|prof|rev|hon|vol|no|pp?|ch|ed|fig|cf|vs|etc|al|inc|ltd|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)|\b[A-Z])\.$/i;

/** Sentences with their offsets, not fooled by "Dr." or "Jan.". */
export function splitSentences(text) {
  const out = [];
  const src = String(text || "");
  let start = 0;
  const re = /[.!?]+(?=["'\u201d\u2019)\]]*(?:\s|$))|\n{2,}/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const end = m.index + m[0].length;
    const piece = src.slice(start, end);
    if (ABBREV.test(piece.trimEnd())) continue;
    const trimmed = piece.trim();
    if (trimmed) out.push({ text: trimmed, start: start + piece.indexOf(trimmed), end });
    start = end;
  }
  const tail = src.slice(start);
  const trimmed = tail.trim();
  if (trimmed) out.push({ text: trimmed, start: start + tail.indexOf(trimmed), end: src.length });
  return out;
}

/** The checkable things in a sentence: figures, and names. */
export function extractAtoms(sentence, absoluteStart = 0) {
  const atoms = [];
  NUMBER_RE.lastIndex = 0;
  let m;
  while ((m = NUMBER_RE.exec(sentence)) !== null) {
    const before = sentence.slice(0, m.index);
    // "1." opening a line is a list marker, not a claim about a quantity.
    const atLineStart = /(^|\n)[\s>*-]*$/.test(before);
    const followedByMarker = /^[.)]\s/.test(sentence.slice(m.index + m[0].length));
    if (atLineStart && followedByMarker) continue;
    atoms.push({
      kind: "number",
      text: m[0],
      tokens: [m[0].replace(/[,%]/g, "")],
      start: absoluteStart + m.index,
      end: absoluteStart + m.index + m[0].length,
    });
  }
  PROPER_RE.lastIndex = 0;
  // The lead includes a list marker: "1. Social standing…" capitalizes
  // "Social" by position exactly as a sentence start does (run 5 flagged it
  // as an invented referent through the bare-whitespace lead).
  const sentenceLead = sentence.match(/^\s*(?:[-*>]\s+|\d+[.)]\s+)?\s*/)[0].length;
  while ((m = PROPER_RE.exec(sentence)) !== null) {
    const phrase = m[0].trim();
    const words = phrase.split(/[\s-]+/).filter(Boolean);
    // A single capitalized word at the sentence's own start is capitalized
    // by position — the engine's measured principle (surfaces.js skips
    // sentence-initial tokens for cap evidence), applied here after run 3
    // flagged list-lead emotion words ("Shock", "Anxiety") as invented
    // referents. The trade is disclosed: a single-token invented name that
    // only ever opens sentences escapes; multi-token names and any
    // mid-sentence recurrence are still caught.
    if (words.length === 1 && m.index === sentenceLead) continue;
    const contentWords = words.filter(
      (w) =>
        !CLAIM_STOPWORDS.has(w.toLowerCase().replace(/['\u2019]s$/, "")) &&
        // A capitalized contraction is grammar, never a name \u2014 "Isn't" opening
        // a sentence was flagged as an invented referent (run 2, turn 37).
        !/^[A-Z][a-z]*['\u2019]t$/.test(w),
    );
    if (!contentWords.length) continue;
    atoms.push({
      kind: "name",
      text: phrase,
      tokens: contentWords.map((w) => w.replace(/['\u2019]s$/, "")),
      start: absoluteStart + m.index,
      end: absoluteStart + m.index + m[0].length,
    });
  }
  atoms.sort((a, b) => a.start - b.start);
  return atoms;
}

const MAX_FINDINGS = 40;

/** An address as source.js writes it — bytes, not a claim about quantities. */
const ADDRESS = /\[?[^\s\]]+#\d+-\d+\]?/g;

/**
 * The answer with its structure blanked, length preserved: headings,
 * line-initial bold labels, and bracketed addresses are the model's own
 * scaffolding, not claims (the measured cases live in checkGrounding's
 * comment below). Exported because every organ that reads CLAIMS out of an
 * answer must skip the same furniture — the relation tier (hypergraph.js)
 * shares this, or a Title-Case heading would read as a subject and a byte
 * address as a figure. Length-preserving so every offset an extractor
 * reports lands in the original answer's own coordinate space.
 */
export function blankStructure(answer) {
  const blank = (m) => " ".repeat(m.length);
  return String(answer)
    .replace(/^[ \t]*#{1,6}[^\n]*$/gm, blank)
    .replace(/^[ \t]*\*\*[^\n*]+\*\*[ \t]*:?[ \t]*$/gm, blank)
    // A line-initial bold phrase with a colon is a heading even when prose
    // follows on the same line ("**Anatole's Effect:** she felt…").
    .replace(/^([ \t]*)\*\*[^\n*]+:\*\*|^([ \t]*)\*\*[^\n*]+\*\*:/gm, blank)
    .replace(ADDRESS, blank);
}

/**
 * Every checkable atom in the answer with the passages that STATE it — the
 * corroboration face of the same walk checkGrounding does. Where
 * checkGrounding asks "is anything absent from the union", this asks "how
 * many of the offered passages, across how many distinct sources, state each
 * atom" — because support is not a bit. A figure one passage states and a
 * figure four passages from three sources state are different strengths of
 * ground, and the difference is the whole methodology: the approach toward
 * truth is asymptotic, through agreeing perspectives that are actually
 * independent. `sources` counts distinct source files (the ref before `#`),
 * which is this instrument's honest independence test for local material —
 * two chunks of one file are one perspective, not two.
 *
 * Read-only companion to checkGrounding, never a replacement: an atom with
 * empty `refs` here is the same fact as a finding there.
 */
export function corroborateAtoms(answer, passages) {
  if (!passages?.length) return { examined: false, atoms: [] };
  const per = passages.map((p) => ({
    ref: p.ref ?? null,
    source: String(p.ref ?? "").split("#")[0] || null,
    index: buildUnionIndex([p]),
  }));
  const atoms = [];
  for (const s of splitSentences(blankStructure(answer))) {
    for (const atom of extractAtoms(s.text, s.start)) {
      const supporters = per.filter(({ index }) =>
        atom.tokens.every((t) => tokenSupported(index, atom.kind === "number", t)),
      );
      atoms.push({
        kind: atom.kind,
        text: atom.text,
        start: atom.start,
        end: atom.end,
        sentence: s.text,
        refs: supporters.map((x) => x.ref).filter(Boolean),
        sources: [...new Set(supporters.map((x) => x.source).filter(Boolean))],
      });
    }
  }
  return { examined: true, atoms };
}

/**
 * Every figure and name in the answer, checked against everything the turn was
 * handed.
 *
 * `examined` is not the same as `clean`. Clean is true both for "checked,
 * found nothing wrong" and for "there was nothing to check against", and those
 * are different facts that must not read alike — a caller wanting "verified
 * clean" reads `examined && clean`. A capped list says it was capped for the
 * same reason: a truncated report that looks complete is a lie of omission.
 */
export function checkGrounding(answer, passages, { question = "", resolveName = null } = {}) {
  if (!passages?.length) {
    return { sentences: 0, atomsChecked: 0, findings: [], clean: true, examined: false, truncated: null };
  }
  const index = buildUnionIndex(passages);
  const questionWords = wordSet(question);
  // An address is not a claim. `kessington.txt#80-174` carries two numbers
  // that are byte offsets this app asked for, and checking them against the
  // material flagged the citation itself as an unsupported figure — the check
  // accusing the answer of inventing the very thing it was told to write.
  //
  // A heading is not a claim either. Measured on the live dialogue run: a
  // model that structures its answer with markdown headings writes Title
  // Case phrases ("Clash of Ideals", "A Catalyst") that the proper-name
  // extractor reads as names, and the record drowns in structure flagged as
  // invention while the real drift (an invented novel title) sits in the
  // noise. Heading lines — # markers, and lines that are entirely a bold
  // phrase — are the model's own scaffolding and are blanked (length
  // preserved) before atoms are extracted (blankStructure, above — shared
  // with the relation tier, hypergraph.js). A name INSIDE a body sentence
  // is still checked; only the furniture is exempt.
  const sentences = splitSentences(blankStructure(answer));
  const findings = [];
  let atomsChecked = 0;

  for (const s of sentences) {
    for (const atom of extractAtoms(s.text, s.start)) {
      atomsChecked++;
      const absent = atom.tokens.filter((t) => !tokenSupported(index, atom.kind === "number", t));
      if (!absent.length) continue;
      // A name is a reference to a REFERENT, not a byte sequence, and the
      // byte test above cannot see that "Bezukhov" and "Pierre Bezúkhov"
      // point at the same being. When the caller supplies a resolver built
      // from the material's own cast (cast.js, on the engine's organs), a
      // name the cast covers is supported — rescue only, never veto: a
      // resolver can save a finding from being raised, it cannot raise one.
      // The content tokens go, not the raw phrase, so a possessive or a
      // connective in the phrase cannot spoil the resolution.
      if (atom.kind === "name" && resolveName?.(atom.tokens.join(" "))) continue;
      findings.push({
        kind: "unsupported_claim",
        atomKind: atom.kind,
        text: atom.text,
        absent,
        start: atom.start,
        end: atom.end,
        // The sentence the claim stands in, carried so a proof-seeker can
        // search on the claim's own context (proof.js) without re-locating
        // it — the same words, no paraphrase.
        sentence: s.text,
        // A name the question itself supplied is the model repeating the
        // asker, not inventing a source — worth knowing when reading a finding.
        echoesQuestion: atom.tokens.every((t) => questionWords.has(t.toLowerCase())),
      });
    }
  }

  findings.sort((a, b) => a.start - b.start);
  const kept = findings.slice(0, MAX_FINDINGS);
  return {
    sentences: sentences.length,
    atomsChecked,
    findings: kept,
    clean: findings.length === 0,
    examined: true,
    truncated:
      findings.length > kept.length
        ? { reported: kept.length, total: findings.length, dropped: findings.length - kept.length }
        : null,
  };
}

/**
 * Every checkable atom in an answer, unconditionally unsupported — for a
 * caller that has no material at all and still wants candidates for the web
 * tier (proofTargets). This is NOT checkGrounding with the guard removed:
 * checkGrounding's `examined: false` at zero passages is a deliberate fact
 * ("clean and examined are different facts" — grounding.test.mjs) and stays
 * exactly as it is for every existing caller. Measured live (2026-08-17): a
 * plain question with no material attached ("what percentage of Earth's
 * atmosphere is nitrogen...") produced zero proof-seeking chips — not
 * because proof-seeking was off, but because `findings` never had anything
 * in it to offer, since checkGrounding correctly declines to examine
 * against an index that does not exist. With no material, every atom is
 * trivially unsupported by definition, so this mirrors checkGrounding's own
 * atom scan without the index comparison. Same finding shape, so an
 * existing consumer of `findings` (proofTargets, unsupportedClaims) needs
 * no changes to accept it.
 */
export function extractCheckableAtoms(answer, { question = "" } = {}) {
  const questionWords = wordSet(question);
  const sentences = splitSentences(blankStructure(answer));
  const findings = [];
  for (const s of sentences) {
    for (const atom of extractAtoms(s.text, s.start)) {
      findings.push({
        kind: "unsupported_claim",
        atomKind: atom.kind,
        text: atom.text,
        absent: atom.tokens,
        start: atom.start,
        end: atom.end,
        sentence: s.text,
        echoesQuestion: atom.tokens.every((t) => questionWords.has(t.toLowerCase())),
      });
    }
  }
  findings.sort((a, b) => a.start - b.start);
  return findings.slice(0, MAX_FINDINGS);
}

/** The findings as short lines, for a record's `unsupported`.
 *
 * A name the question itself supplied is the model repeating the asker, not
 * inventing a source — the finding stays in the report (and in the drawn
 * stripe, where mildness is cheap), but it does not enter the RECORD's
 * unsupported list, where it reads as invention and drowns the real drift.
 * Measured live: a question naming Karatáev produced "Karataev's not in the
 * material" on the record of an answer that merely stayed on topic. */
export function unsupportedClaims(report) {
  return report.findings
    .filter((f) => !f.echoesQuestion)
    .map((f) =>
      f.atomKind === "number" ? `figure ${f.text} not in the material` : `${f.text} not in the material`,
    );
}
