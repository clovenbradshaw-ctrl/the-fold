// enumeration.js — when the material lists its own answer, READ THE LIST.
//
// USER DIRECTION, 2026-09-01: "trust our mechanical reasoning more than the
// 'thinking' model — the thinking should only be useful as it aids the surf
// and fold." This module is that rule applied to the one sentence shape that
// answers a completeness question outright, and which every tier above it
// currently throws away.
//
// THE SPECIMEN, measured live. Asked "what are the two methods of curing the
// mischiefs of faction", against the real Federalist Papers:
//
//   "There are two methods of curing the mischiefs of faction: the one, by
//    removing its causes; the other, by controlling its effects."
//
// The relation extractor keeps `two methods —of→ curing the mischiefs of
// faction` — the SUBJECT, which merely restates the question — and drops both
// items, because its matcher reads a clause-terminal triple and a colon ends
// the clause. So the note fed to the model restated the question and carried
// none of the answer, and the answer survived only because the raw passage
// went too. The list was sitting in the bytes the whole time, delimited,
// countable, and addressable.
//
// STRUCTURE, NOT VOCABULARY. This module reads PUNCTUATION and nothing else:
// a colon introduces, semicolons separate, the sentence ends. There is no
// list of English enumerating words here and there must never be one — P50's
// own rule ("a punctuation decision is a class; name the category, not the
// characters") and the reason `succession.js` is condemned in this repo's own
// notes ("it should never have been made" — per-site, per-phrasing parsing).
// Unicode categories are used for the marks themselves so a non-Latin script
// with its own colon (：) or semicolon (؛ ；) is read on the same terms.
//
// WHAT IT REFUSES, and why each refusal is real rather than decorative:
//   no_colon        nothing introduces a list here.
//   single_item     a colon with nothing after it to separate is an
//                   apposition ("one thing: this"), not an enumeration. Two
//                   is the structural minimum, the same floor
//                   `emergence/binding.js` states for co-arrival — one item
//                   has no parallelism to read.
//   unbalanced      a declared count that disagrees with the items actually
//                   found. REPORTED, never silently reconciled: the material
//                   saying "two" and offering three is a fact about the
//                   material (or about this reader), and picking a winner
//                   would hide whichever one is wrong.
//
// EVERY ITEM CARRIES ITS OWN BYTE SPAN, absolute in the source, so an answer
// assembled from these is addressable the same way any other claim is (P5.2).
// Nothing here paraphrases: an item's text is the material's own bytes,
// sliced, never rewritten.

/** Opening/closing marks, by Unicode category — never an enumerated list. */
const OPEN = /\p{Ps}/u;
const CLOSE = /\p{Pe}/u;

// The three marks this reads, each by what it DOES: introduce, separate, end.
// Written as explicit sets because these are the marks' own identities, not a
// sample of a larger class — a colon is the introducing mark in every script
// that has one, and the variants below are that same mark, not other marks.
const INTRODUCE = new Set([":", "：", "܃", "፥"]);
const SEPARATE = new Set([";", "；", "؛", "፤"]);
const END = new Set([".", "!", "?", "．", "。", "۔", "।"]);

/**
 * Every enumeration in `text`, each item addressed absolutely.
 *
 * `base` is the byte offset `text` begins at in its source (a chunk's own
 * `start`), so an item's span reads back from the file the reader actually
 * has rather than from this excerpt — the same discipline `chunkProse`
 * states for its own offsets.
 *
 * Returns `{ enumerations, gaps }`. A caller that finds `enumerations` empty
 * gets `gaps` saying which shape failed and where, never silence.
 */
export function enumerationsIn(text, { base = 0 } = {}) {
  const s = String(text ?? "");
  const enumerations = [];
  const gaps = [];

  let sentenceStart = 0;
  let depth = 0;
  let colonAt = -1;
  const breaks = [];

  const flush = (endIdx) => {
    if (colonAt !== -1) {
      const headRaw = s.slice(sentenceStart, colonAt);
      const head = headRaw.trim();
      // THE HEAD CARRIES ITS OWN SPAN, because a caller that recomposes one
      // from `start` + `head.length` gets it wrong: `head` is TRIMMED and
      // `start` is not, so the address lands left of the head by exactly the
      // leading whitespace and loses the same count off the tail. Found in
      // `eot-lines.js`, which composed exactly that and emitted
      // `" There are two methods of curing the mischiefs of facti"` for a
      // head of `"There are two methods of curing the mischiefs of faction"`.
      //
      // Span self-verification does NOT catch this: the address reads back
      // the text that was recorded. What is wrong is that the recorded text
      // is not the head the enumeration reported — which is why the fix is to
      // stop making callers do the arithmetic at all, the same reason
      // `enumerationsInChunk` exists one seam over.
      const headLead = headRaw.length - headRaw.trimStart().length;
      // Items are the spans BETWEEN the colon and each separator, and between
      // separators, up to the sentence end.
      const cuts = [colonAt, ...breaks, endIdx];
      const items = [];
      for (let i = 0; i < cuts.length - 1; i += 1) {
        const from = cuts[i] + 1;
        const to = cuts[i + 1];
        const raw = s.slice(from, to);
        const lead = raw.length - raw.trimStart().length;
        const trimmed = raw.trim();
        if (!trimmed) continue;
        items.push({
          text: trimmed,
          start: base + from + lead,
          end: base + from + lead + trimmed.length,
        });
      }
      if (items.length >= 2) {
        enumerations.push({
          head,
          headStart: base + sentenceStart + headLead,
          headEnd: base + sentenceStart + headLead + head.length,
          items,
          count: items.length,
          // The span of the whole enumeration, head included — what a reader
          // would highlight if asked to point at "the list".
          start: base + sentenceStart,
          end: base + endIdx,
        });
      } else if (items.length === 1) {
        gaps.push({ type: "single_item", head, at: base + sentenceStart });
      }
    }
    sentenceStart = endIdx + 1;
    colonAt = -1;
    breaks.length = 0;
  };

  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (OPEN.test(ch)) depth += 1;
    else if (CLOSE.test(ch)) depth = Math.max(0, depth - 1);
    // A mark inside a parenthetical belongs to the aside, not to this
    // sentence's structure — the same crossing rule `discoverRelationVocab`
    // learned the hard way when an aside hid a verb.
    else if (depth === 0) {
      if (INTRODUCE.has(ch) && colonAt === -1) colonAt = i;
      else if (SEPARATE.has(ch) && colonAt !== -1) breaks.push(i);
      else if (END.has(ch)) flush(i);
    }
  }
  if (sentenceStart < s.length) flush(s.length);

  if (!enumerations.length && !gaps.length) gaps.push({ type: "no_colon" });
  return { enumerations, gaps };
}

/**
 * The same read, for a chunk — and the ONLY form a caller should reach for
 * when reading one, because computing the base by hand is a trap that has
 * already been sprung once.
 *
 * `chunkSource` sets a chunk's `start` to where its body begins in the file
 * but stores `text` TRIMMED, so an offset measured inside `chunk.text` is
 * ahead of `chunk.start` by exactly what the trim removed. Passing
 * `chunk.start` straight in as `base` therefore produces spans that look
 * plausible, sit a few characters early, and fail to read back — measured
 * live on this module's own first run: both items of the Federalist
 * enumeration came out right and both spans verified FALSE. The arithmetic
 * lives here now so no caller repeats it.
 */
export function enumerationsInChunk(chunk, sourceText, opts = {}) {
  const raw = String(sourceText ?? "").slice(chunk?.start ?? 0, chunk?.end ?? 0);
  const trimmed = raw.length - raw.trimStart().length;
  return enumerationsIn(chunk?.text ?? "", { ...opts, base: (chunk?.start ?? 0) + trimmed });
}

/**
 * Does the material DECLARE how many items it is about to list, and does that
 * declaration match what was found?
 *
 * `cardinals` is an INJECTED map of number-words to values — a received
 * closed class with its own giver, never typed here (this module has no
 * English in it and must not acquire any). Omitted, the check is skipped and
 * `declared` is null: an absent prior is a disclosed absence, not a guess.
 */
export function checkDeclaredCount(enumeration, { cardinals = null } = {}) {
  if (!cardinals) return { declared: null, agrees: null, reason: "no_cardinal_prior_injected" };
  const head = String(enumeration?.head ?? "").toLowerCase();
  let declared = null;
  for (const [word, value] of cardinals instanceof Map ? cardinals : Object.entries(cardinals)) {
    if (new RegExp(`(?<![\\p{L}\\p{N}])${word}(?![\\p{L}\\p{N}])`, "u").test(head)) {
      declared = value;
      break;
    }
  }
  const digits = head.match(/(?<![\p{L}\p{N}])(\d+)(?![\p{L}\p{N}])/u);
  if (declared === null && digits) declared = Number(digits[1]);
  if (declared === null) return { declared: null, agrees: null, reason: "no_count_declared" };
  const agrees = declared === enumeration.count;
  return {
    declared,
    found: enumeration.count,
    agrees,
    // Reported, never reconciled — see this file's header.
    ...(agrees ? {} : { reason: "unbalanced" }),
  };
}

// A single shared word is a coincidence, not a question about a list.
// Measured live in the browser: with a floor of one, "What is a faction?"
// was answered with Federalist 10's two-methods list, because the head and
// the question both contain "faction" — a confident, byte-addressed, wrong
// answer, which is the one failure mode a mechanical door must not have
// (arithmetic.js: "a wrong mechanical answer is worse than none"). Two is the
// same structural minimum this repo uses wherever recurrence has to mean
// something; a caller who wants a different bar declares it.
const ANSWERS_MIN_SHARED = 2;

/**
 * The enumeration whose head best answers `question`, by shared content
 * words — the same fold every other reader here uses, injected rather than
 * imported so this module stays pure and script-agnostic.
 *
 * Returns null when nothing shares a word with the question: an enumeration
 * that is not about what was asked is not an answer to it, and returning the
 * longest list on the page would be exactly the "confident wrong answer" this
 * repo refuses everywhere else.
 */
export function answeringEnumeration(enumerations, question, { tokenize, minShared = ANSWERS_MIN_SHARED } = {}) {
  if (typeof tokenize !== "function") throw new TypeError("answeringEnumeration: tokenize is injected — this module reads no language of its own");
  const asked = new Set(tokenize(String(question ?? "")));
  if (!asked.size) return null;
  let best = null;
  for (const e of enumerations ?? []) {
    const head = new Set(tokenize(e.head ?? ""));
    let shared = 0;
    for (const w of head) if (asked.has(w)) shared += 1;
    if (shared >= minShared && (!best || shared > best.shared)) best = { enumeration: e, shared };
  }
  return best;
}
