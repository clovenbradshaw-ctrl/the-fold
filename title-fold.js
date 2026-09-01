// title-fold.js — a shared surname/tail is not enough to prove two names
// are the same person, and it is not enough to prove they are different
// people either. What decides it is whether the DISAGREEING part of the
// name is a parameter that could hold more than one value at once
// (ADDITIVE — a title, a first name) or a parameter that could not
// (FUNCTIONAL — a surname, in the naming convention this measures).
//
// USER DIRECTION, 2026-09-01, verbatim: "our reasoning engine should be
// able to look at these entities and determine they point as the same
// thing because they do not have parameters that misalign, no?" — and,
// naming the mechanism precisely: capacity-runner.js's own R2 (a
// functional relation makes anchor identity load-bearing — a person has
// exactly one surname) applied here to NAME-MERGING instead of
// relation-verification.
//
// THE SPECIMEN THIS CLOSES, real, live-observed: "Van Helsing" (527
// mentions), "Professor Van Helsing" (177), "Abraham Van Helsing" (9) —
// three referents for one person, because eoreader7's own
// discoverReferents refuses a witnessed merge when a bare form matches
// MULTIPLE established clusters unless every cluster's tokens are a
// subset of what arrived (surfaces.js's own comment: correct for
// "Mikhail Kutuzov" vs "Mikhail Barclay", the SAME shape and the OPPOSITE
// truth). The engine cannot tell the two shapes apart from token overlap
// alone; this module supplies the missing distinction.
//
// MEASURED, NOT ASSUMED, which parameter is additive: a title recurs as
// an ordinary LOWERCASE common noun elsewhere in the same material ("he
// was a professor of...") or is a recognised abbreviation (Mr/Dr/Mrs —
// injected, never re-derived a second way); a personal name essentially
// never does either. Measured live on Dracula: "professor" 3x lowercase,
// "lord" 2x, "abraham" 0x.
//
// THE ONE RULE, and why it is safe against the case that would break a
// naive version: two or more candidates sharing one tail merge into it
// UNLESS more than one of their own leading qualifiers fails the title
// test — because two DIFFERENT unrecognised qualifiers on one tail
// ("John Smith" / "Robert Smith") is exactly the Kutuzov/Barclay shape:
// two people who happen to share a surname. At most ONE unrecognised
// qualifier is safe — that is the one person's own first name.
//
// PURE. Text-scanning and title-classification are the only work done
// here; the caller supplies the candidate cast entries, their own
// address-verified mentions, and whichever abbreviation set it already
// has (deriveAbbreviations, or an injected prior — this module does not
// care which, matching every other organ's own injected-priors posture).

/**
 * Does `word` behave like a TITLE (additive — a person can hold several)
 * rather than a PERSONAL NAME (which, in this convention, cannot double
 * up the way a title can)? `abbreviations` is a Set of tokens (bare, no
 * trailing period) already known to be abbreviations — reused, never
 * re-derived a second way.
 */
// PINNED, NOT BUILT — speaker attribution as a document boundary.
// User direction, 2026-09-01, live: "its still mistaking pronouns as
// entities sometimes, when in fact this should have been the person
// speaking" / "we need the activation of who is speaking as a boundary,
// pin that." Dracula is epistolary — journals, letters, diary entries —
// and inside one such SECTION, "I" is not merely noise to exclude
// (NEVER_A_NAME, surfaces.js) but real referential information: it names
// the section's own declared author. A document already carries the
// boundary this needs (a chapter/entry heading — "Jonathan Harker's
// Journal", "Letter, Mina Harker to Lucy Westenra" — is itself a SIG·Figure
// act, a first-person speaker binding that holds until the next such
// heading supersedes it). The mechanism this wants is closer to
// `segmentation.js`'s own binding claims than to title-fold's qualifier
// logic: PROPOSE a speaker binding at each section heading, keyed by
// section span, and resolve "I" WITHIN that span to the declared speaker
// instead of discarding it — never guessed at per-sentence, always
// anchored to a real, addressed heading. Not started: needs a heading
// detector (a title-fold-shaped problem in its own right — "Letter, X to
// Y" and "<Name>'s Journal" have real, closed-ish surface shapes) before
// there is anything to bind against.

export function isTitleQualifier(word, bodyText, abbreviations, honorifics = null) {
  const w = String(word ?? "").trim();
  if (!w) return false;
  if (abbreviations && abbreviations.has(w)) return true;
  const lower = w.toLowerCase();
  // HONORIFIC_TITLES (priors.js, lang/en, received) is the SUFFICIENT
  // condition a mined statistic cannot be. Bare lowercase-recurrence
  // alone is NOT sufficient — measured live, it merged "Castle Dracula"
  // into "Count Dracula" because "castle" genuinely recurs as an
  // ordinary common noun (the building), not as anyone's title. When a
  // caller injects the closed class, membership in it is decisive on
  // its own; a word outside it still gets the weaker recurrence test,
  // which remains useful where no closed class was supplied (a test
  // fixture, a language with no injected register) — a real, disclosed,
  // lower-confidence fallback, never the sole signal once the class is
  // available.
  if (honorifics) return honorifics.has(lower);
  const lowerForm = new RegExp(`(?<![\\p{L}])${lower}(?![\\p{L}])`, "u");
  return lowerForm.test(String(bodyText ?? ""));
}

/**
 * `entries` — [{ name, ...anything else the caller wants preserved }].
 * `name` is a space-joined token sequence; a SHORTER entry's own name is
 * a TAIL of a LONGER entry's name when the longer one's own final tokens
 * equal the shorter one's tokens exactly, in order.
 *
 * Returns `{ merges, refused }`:
 *   merges  — [{ into: <tail entry>, absorbs: [<fragment entries>], reasons: [...] }]
 *             one row per tail that gained at least one fragment.
 *   refused — [{ tail, qualifiers }] — a tail whose candidate fragments
 *             carried MORE THAN ONE unrecognised qualifier, the
 *             Kutuzov/Barclay shape, disclosed rather than guessed.
 *
 * This function decides WHICH entries merge; it does not mutate anything
 * or touch a ledger — the caller (segmentation.js, or any other
 * append-only record) is where a decision like this actually lands.
 */
export function foldTitleFragments(entries, bodyText, abbreviations, honorifics = null) {
  const list = Array.isArray(entries) ? entries : [];
  const byTail = new Map();
  for (const e of list) {
    const words = String(e.name ?? "").trim().split(/\s+/).filter(Boolean);
    for (let tailLen = 1; tailLen < words.length; tailLen++) {
      const tail = words.slice(-tailLen).join(" ").toLowerCase();
      if (!byTail.has(tail)) byTail.set(tail, []);
      byTail.get(tail).push({ entry: e, qualifier: words.slice(0, words.length - tailLen).join(" ") });
    }
  }
  const absorbed = new Set();
  const merges = [];
  const refused = [];
  for (const anchor of list) {
    if (absorbed.has(anchor.name)) continue;
    const candidates = (byTail.get(anchor.name.toLowerCase()) ?? []).filter(
      (c) => c.entry !== anchor && !absorbed.has(c.entry.name),
    );
    if (!candidates.length) continue;
    const unrecognised = new Set();
    for (const c of candidates) if (!isTitleQualifier(c.qualifier, bodyText, abbreviations, honorifics)) unrecognised.add(c.qualifier.toLowerCase());
    if (unrecognised.size > 1) {
      refused.push({ tail: anchor.name, qualifiers: candidates.map((c) => c.qualifier) });
      continue;
    }
    const absorbs = [];
    const reasons = [];
    for (const c of candidates) {
      absorbed.add(c.entry.name);
      absorbs.push(c.entry);
      reasons.push(
        unrecognised.has(c.qualifier.toLowerCase())
          ? `"${c.qualifier}" is this person's own name — the only unrecognised qualifier on this tail`
          : `"${c.qualifier}" is a recognised title — recurs lowercase or is a known abbreviation`,
      );
    }
    merges.push({ into: anchor, absorbs, reasons });
  }
  return { merges, refused };
}
