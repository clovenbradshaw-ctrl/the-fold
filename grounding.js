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

const CLAIM_STOPWORDS = new Set([
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

const NUMBER_RE = /\b\d[\d,]*(?:\.\d+)?%?\b/g;
const PROPER_RE =
  /\p{Lu}[\p{L}]*(?:['\u2019][\p{L}]+)?(?:[ -](?:of|the|de|von|van|del|la|le)?[ ]?\p{Lu}[\p{L}]*(?:['\u2019][\p{L}]+)?)*/gu;

export function wordSet(s) {
  const set = new Set();
  for (const w of String(s || "").toLowerCase().split(/[^\p{L}\p{N}]+/u)) if (w) set.add(w);
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
  const w = String(word).toLowerCase();
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
  while ((m = PROPER_RE.exec(sentence)) !== null) {
    const phrase = m[0].trim();
    const words = phrase.split(/[\s-]+/).filter(Boolean);
    const contentWords = words.filter(
      (w) => !CLAIM_STOPWORDS.has(w.toLowerCase().replace(/['\u2019]s$/, "")),
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
 * Every figure and name in the answer, checked against everything the turn was
 * handed.
 *
 * `examined` is not the same as `clean`. Clean is true both for "checked,
 * found nothing wrong" and for "there was nothing to check against", and those
 * are different facts that must not read alike — a caller wanting "verified
 * clean" reads `examined && clean`. A capped list says it was capped for the
 * same reason: a truncated report that looks complete is a lie of omission.
 */
export function checkGrounding(answer, passages, { question = "" } = {}) {
  if (!passages?.length) {
    return { sentences: 0, atomsChecked: 0, findings: [], clean: true, examined: false, truncated: null };
  }
  const index = buildUnionIndex(passages);
  const questionWords = wordSet(question);
  // An address is not a claim. `kessington.txt#80-174` carries two numbers
  // that are byte offsets this app asked for, and checking them against the
  // material flagged the citation itself as an unsupported figure — the check
  // accusing the answer of inventing the very thing it was told to write.
  const sentences = splitSentences(answer.replace(ADDRESS, " "));
  const findings = [];
  let atomsChecked = 0;

  for (const s of sentences) {
    for (const atom of extractAtoms(s.text, s.start)) {
      atomsChecked++;
      const absent = atom.tokens.filter((t) => !tokenSupported(index, atom.kind === "number", t));
      if (!absent.length) continue;
      findings.push({
        kind: "unsupported_claim",
        atomKind: atom.kind,
        text: atom.text,
        absent,
        start: atom.start,
        end: atom.end,
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

/** The findings as short lines, for a record's `unsupported`. */
export function unsupportedClaims(report) {
  return report.findings.map((f) =>
    f.atomKind === "number" ? `figure ${f.text} not in the material` : `${f.text} not in the material`,
  );
}
