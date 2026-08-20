// succession.js — Wikipedia-style succession-box field parsing, pure.
//
// Disclosed scope: this reads ONE shape of material — an infobox rendered as
// plain text, ordinal + office title ("15th Vice President of the United
// States"), an "In office" line, a "President <name>" line, and "Preceded
// by"/"Succeeded by" lines — the exact shape Wikipedia's own succession
// boxes take once extracted to text. It is not a general infobox parser and
// does not try to be; a table shaped any other way is silently outside it.
//
// Why this exists as its own module rather than a widened hypergraph.js
// vocabulary: window/proximity approaches (character-window sizes 20-400)
// were tried and rejected first, and rejected on the merits, not for want of
// tuning — in one succession box the WRONG filler sits closer to the
// president's name than the RIGHT one, and in another box the distances
// reverse. That is a category error (prose-adjacency assumptions applied to
// a FIELD-structured record), not a threshold to hunt for, so this reads the
// fields as fields.
//
// The three exports compose: parseSuccessionBoxes splits the material into
// records and reads each record's own fields; resolveBoxSubjects works out
// WHO actually held each record's office (the record itself, per Wikipedia's
// own convention, never states its own subject's name — only who preceded
// and succeeded them); officeHolderGroups is the completeness signal —
// every (office, president) pairing with two or more distinct confirmed
// holders is the true filler set a caller should check an answer against.

import { foldTypography } from "./source.js";
import { namesIn, splitSentences } from "./cite.js";

// A record's own title line: "<ordinal><suffix> <office> of the United
// States". The office phrase is deliberately NOT hardcoded to "Vice
// President"/"President" — Wikipedia types a great many offices this way
// ("United States Senator" does not, and stays outside this pattern by
// design; see the parsing note below on why that is fine) — only the "of
// the United States" root is fixed, because that is the one shape this pass
// is licensed against (Wikipedia's, not infoboxes generally).
const TITLE_RE = /^(\d+)(?:st|nd|rd|th)\s+(.+?)\s+of the United States$/i;
const IN_OFFICE_RE = /^In office$/i;
const PRECEDED_RE = /^Preceded by\s+(.+)$/i;
const SUCCEEDED_RE = /^Succeeded by\s+(.+)$/i;
const PRESIDENT_RE = /^President\s+(.+)$/;

const isTitleLine = (line) => TITLE_RE.test(line);

const findFirst = (lines, re) => {
  for (const line of lines) {
    const m = re.exec(line);
    if (m) return m[1].trim();
  }
  return null;
};

const parseBox = (lines) => {
  const titleMatch = TITLE_RE.exec(lines[0] ?? "");
  return {
    ordinal: titleMatch ? Number(titleMatch[1]) : null,
    office: titleMatch ? titleMatch[2].trim() : null,
    presidentName: findFirst(lines, PRESIDENT_RE),
    precededBy: findFirst(lines, PRECEDED_RE),
    succeededBy: findFirst(lines, SUCCEEDED_RE),
    lines,
  };
};

/**
 * Split raw material into succession-box records. A new record starts at a
 * title line (matched regardless of what preceded it — the title line IS
 * the record's own boundary) or at a blank line (a box's fields never
 * straddle one). Absent either, lines accumulate into the CURRENT record —
 * this is deliberate, not a gap: Wikipedia sometimes runs a second,
 * differently-shaped record (a Senate seat, a diplomatic post) directly
 * against a succession box with no blank line between them, and that
 * record's own fields have no title line of this shape to start a fresh box
 * on. Its lines still land somewhere; findFirst above always reads the
 * FIRST occurrence of each field, so the record's own true fields (which
 * come first, since the title line — when there is one — is always line
 * zero) are read correctly and the trailing, unrelated fields are inert
 * noise for a caller not asking about that record.
 */
export function parseSuccessionBoxes(text) {
  const lines = String(text ?? "").split(/\r?\n/);
  const boxes = [];
  let current = [];
  const flush = () => {
    if (current.length) boxes.push(parseBox(current));
    current = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (isTitleLine(line) && current.length) flush();
    current.push(line);
  }
  flush();
  return boxes;
}

// foldTypography-normalized substring match, both directions — the same
// rule holon.js's own incompleteClaimsOf already uses to decide whether a
// draft's wording covers a material filler, applied here to two names
// instead of a claim object and a filler object.
const namesMatch = (a, b) => {
  if (!a || !b) return false;
  const fa = foldTypography(String(a)).toLowerCase();
  const fb = foldTypography(String(b)).toLowerCase();
  return fa.includes(fb) || fb.includes(fa);
}

// A "candidate name" for the direct-anchor test (step 2): a run of
// capitalised words that is not itself a "President <name>" or "Vice
// President <name>" mention. That exclusion is load-bearing, not
// decorative — namesIn's own capitalised-run matching glues "President"
// onto the name that follows it ("President Abraham Lincoln" is ONE run),
// so without the exclusion a sentence naming both the office-holder being
// anchored and the president they served under would always read as two
// candidates and refuse every anchor a biographical sentence could ever
// supply. Filtering out the president MENTION (an office reference, never a
// candidate filler for a different office's slot) is the same distinction
// this module's own presidentName field already draws.
const TITLE_ATTACHED_RE = /^(?:Vice President|President)\b/;
// "United States" itself is the one other structural phrase this module's
// own TITLE_RE already treats as fixed furniture ("of the United States"),
// not a candidate filler — without this a biographical sentence naming the
// office ("...the 15th vice president of the United States...") reads
// "United States" as a second candidate purely because it is capitalised,
// and refuses an anchor a real sentence plainly supports.
const STRUCTURAL_PHRASE_RE = /^United States$/i;
const candidateNamesIn = (sentence) =>
  namesIn(sentence).filter((n) => !TITLE_ATTACHED_RE.test(n) && !STRUCTURAL_PHRASE_RE.test(n));

// A record's own structural lines are never eligible to anchor themselves —
// stated directly in the validated algorithm this module implements ("a
// box's own fields cannot anchor themselves"). Preceded by/Succeeded
// by/In office lines are excluded because the algorithm names them
// explicitly; a title line is excluded for the identical reason one level
// up — it is where a record's OWN ordinal and office come from, and
// counting it as a "prose sentence" about that same ordinal would be
// circular. (It also happens to contain a "vice president" phrase glued to
// nothing but "of the United States" — every capitalised word in it reads
// as a spurious single "candidate name" once the title-attached exclusion
// above strips the office phrase itself, which is exactly the false anchor
// this exclusion prevents.)
const isStructuralLine = (s) =>
  isTitleLine(s) || IN_OFFICE_RE.test(s) || PRECEDED_RE.test(s) || SUCCEEDED_RE.test(s);

const ANCHOR_RE = /(\d+)(?:st|nd|rd|th)\s+vice president/i;

const buildDirectAnchors = (text) => {
  const anchors = new Map();
  for (const sentence of splitSentences(String(text ?? ""))) {
    if (isStructuralLine(sentence)) continue;
    const m = ANCHOR_RE.exec(sentence);
    if (!m) continue;
    const names = candidateNamesIn(sentence);
    // Exactly one candidate name licenses the anchor; zero or two-or-more
    // both refuse it — never a guess among several.
    if (names.length === 1) anchors.set(Number(m[1]), names[0]);
  }
  return anchors;
};

/**
 * Resolve each box's SUBJECT — who actually held that record's office —
 * recursively, memoized, with a cycle guard. A direct anchor (a prose
 * sentence naming the ordinal and exactly one candidate) settles it
 * outright; otherwise the chain rule: if the PREVIOUS ordinal's box already
 * resolved a subject, and THIS box's own precededBy field names that same,
 * already-resolved subject (not merely the previous box's raw succeededBy
 * text — the cross-check is against the RESOLVED subject, which is the bug
 * the validated algorithm this implements was built to avoid repeating),
 * and the previous box's succeededBy field is non-null, then THIS box's
 * subject is the previous box's succeededBy NAME. Any failed condition —
 * missing anchor, no previous box, a precededBy mismatch, a null
 * succeededBy — resolves to null. Never a fallback guess.
 */
export function resolveBoxSubjects(boxes, text) {
  const anchors = buildDirectAnchors(text);
  const byOrdinal = new Map();
  for (const box of boxes) if (box.ordinal != null && !byOrdinal.has(box.ordinal)) byOrdinal.set(box.ordinal, box);

  const memo = new Map();
  const inProgress = new Set();

  const resolve = (ordinal) => {
    if (memo.has(ordinal)) return memo.get(ordinal);
    if (inProgress.has(ordinal)) return null; // cycle guard
    inProgress.add(ordinal);
    let subject = null;
    if (anchors.has(ordinal)) {
      subject = anchors.get(ordinal);
    } else {
      const box = byOrdinal.get(ordinal);
      const prevBox = byOrdinal.get(ordinal - 1);
      if (box && prevBox) {
        const prevSubject = resolve(ordinal - 1);
        if (prevSubject && box.precededBy && namesMatch(box.precededBy, prevSubject) && prevBox.succeededBy) {
          subject = prevBox.succeededBy;
        }
      }
    }
    inProgress.delete(ordinal);
    memo.set(ordinal, subject);
    return subject;
  };

  return boxes.map((box) => ({ ...box, subject: box.ordinal == null ? null : resolve(box.ordinal) }));
}

/**
 * The completeness signal: every (office, president) pairing with two or
 * more distinct CONFIRMED holders — a box that actually resolved a subject
 * (step 4) under that president (step 5's match). A name that only ever
 * appears in someone else's precededBy/succeededBy field, and never as a
 * box's own confirmed subject, is never counted here — that is exactly what
 * keeps a predecessor or successor named in passing from being mistaken for
 * a holder nobody's own record confirmed.
 */
export function officeHolderGroups(resolvedBoxes) {
  const groups = new Map();
  for (const box of resolvedBoxes) {
    if (!box.subject || !box.office || !box.presidentName) continue;
    const key = `${foldTypography(box.office).toLowerCase()}|${foldTypography(box.presidentName).toLowerCase()}`;
    let group = groups.get(key);
    if (!group) {
      group = { office: box.office, president: box.presidentName, holders: [] };
      groups.set(key, group);
    }
    if (!group.holders.some((h) => namesMatch(h, box.subject))) group.holders.push(box.subject);
  }
  return [...groups.values()].filter((g) => g.holders.length >= 2);
}
