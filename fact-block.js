import { splitSentences } from "./cite.js";

// fact-block.js — a structured fact list, extracted from the material
// itself, handed to the model BEFORE it drafts. HYPERGRAPH-FIRST-
// GENERATION.md's Phase 2: stop asking a small model to correctly parse
// dense prose under pressure and only check the result afterward; instead
// give it the material's own subject/verb/object facts directly, pre-
// digested, in the SAME shape crown.js already renders — reusing
// `hypergraph.js`'s existing extraction rather than building a second one.
//
// THE ONE THING THIS FILE DELIBERATELY DOES NOT DO: attach an address to
// any line. `source.js::buildSourceBlock`'s own header states why, with
// the measured incident — shown a working example of this instrument's
// own `[ref]` syntax, the model invented fake ones ("[4]",
// "[Faculty & Research]") that then shipped and were parsed as claims.
// This file follows that same rule, not a looser one: a fact block line
// is bare content, nothing else. (A separate, pre-existing tension, found
// while building this and left alone as out of scope: holon.js's
// `buildCorrectionPrompt`'s "unsupported"/"incomplete" modes DO thread
// `relationFindings`'s bracketed refs into a model-facing prompt today —
// a real, live instance of the same risk `buildSourceBlock` was written
// to avoid, in a different call path this file does not touch.)
//
// WHY THIS IS SAFE TO CALL ON THE PASSAGES THEMSELVES: `relations.read(x)`
// (hypergraph.js) extracts candidate triples from `x` and checks each
// against `edges` — the pool's own edge graph, built once from these same
// passages when `makeRelationReader` was constructed. A passage's own
// sentence, read back through the SAME reader that helped build the pool
// it is checked against, binds `verdict: "bound"` for whatever the
// extractor cleanly parses — not a new mechanism, the existing one, called
// on the source material instead of on a model's draft.
//
// THE HONEST LIMIT, disclosed in the plan doc and repeated here because a
// caller reading only this file should see it too: `extractRelations`
// anchors candidate verbs on capitalized surfaces only (a pronoun-subject
// sentence yields nothing), infobox/succession-box text glues into
// garbage on bare newlines, and a causal clause swallows whole into one
// opaque edge. A fact block with real, disclosed partial coverage is
// useful; a caller that reads coverage as completeness is trusting more
// than this file claims. This block SUPPLEMENTS the raw passage text
// (`sourceBlock`), never replaces it.

// `rankByQuestion` — real, live-measured need (2026-08-20): asked "did
// Hannibal Hamlin serve as VP for Lincoln's WHOLE presidency", the
// unranked block handed the model 16 real, correctly-extracted facts —
// mostly true biography ("despised his position," "missed becoming
// President by weeks") — with the one fact the question actually turns on
// (Hamlin's own term boundary, next to Johnson's) sitting unranked among
// them. The model still answered wrong. This is not the extractor's job to
// fix — the user's own framing, direct: the model, not a mechanical
// checker, is the one faculty that can judge whether a set of true facts
// answers a question; mechanical checking (crown.js/testimony) can only
// ever confirm a wording is or isn't addressable, never resolve a
// synthesis across facts, and this file does not try to make it do so.
// What IS this file's job: hand the model FEWER, MORE RELEVANT true
// constraints to reason from, the same term-overlap relevance `retrieve()`
// (source.js) already uses for passage selection — not a smarter judge,
// a smaller haystack for the same needle.
// A cap, not a threshold on truth: every real fact still gets extracted
// and ranked (rankByQuestion, above) — this only bounds how many of the
// lowest-ranked ones ride along into the prompt. Real, live-measured need
// (2026-08-20, user: "the more we spam the model the dumber it is" / "a
// lot of irrelvant shit... we need a salience gate"): the unranked,
// uncapped block put 18 real facts in front of a 2B model for a question
// that turned on exactly one of them, sitting unranked among the rest.
// The number itself is not derived from anything — a real, disclosed,
// round choice pending actual measurement of where accuracy starts
// degrading with fact-block size, matching the honest posture P39/POLICIES
// already hold for other unmeasured constants in this repo (named as a
// number to revisit, not presented as tuned).
const MAX_FACT_LINES = 8;

const rankByQuestion = (lines, questionTerms) => {
  if (!questionTerms.size) return lines;
  return lines
    .map((l, i) => ({
      l,
      i,
      score: l
        .toLowerCase()
        .split(/[^a-z0-9']+/)
        .filter((w) => questionTerms.has(w)).length,
    }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((r) => r.l);
};

/**
 * `buildFactBlock(relations, passages, question = "")` — `relations` is
 * `makeRelationReader`'s own return value (hypergraph.js), already built
 * from these same `passages`; `passages` is `retrieve()`'s own return
 * shape (`source.js`), each carrying at least `{ref, text}`. Returns
 * `null` when nothing binds (no relation vocabulary measured, or every
 * extracted candidate stayed unbound) — a typed gap, not an empty string,
 * so a caller can tell "ran, found nothing" apart from "never ran."
 *
 * Deduplicated on the exact (subject, verb, object) triple, lowercased —
 * the same identity `crownTestimony` (app.js) already dedupes on, so a
 * fact stated in two overlapping passages appears once, not twice.
 * `question`, when given, re-orders (never filters or drops) the
 * deduplicated lines by term overlap with the question's own words —
 * the facts most likely load-bearing for THIS question read first, but
 * every extracted fact still ships; a lower-ranked fact might be exactly
 * what a differently-worded question needed, and this file has no way to
 * know it's safe to discard one. Omitted: passage order, first-extracted
 * within a passage — every existing caller unaffected.
 */
// `dedupeSourceText(passages)` — the OTHER half of the salience gate,
// found the same live pass (user: "a lot of irrelvant shit... we need a
// salience gate" — reacting to a real captured prompt where the raw
// MATERIAL block restated "Hannibal Hamlin, 15th vice president,
// 1861-1865" in six differently-worded snippets, a `web:search-results`
// chunk's own ordinary shape — several pages' short bios concatenated).
// This is deliberately the SAFE half: it only ever removes a sentence
// that is near-identical to one ALREADY kept, so it can reduce volume but
// can never discard a genuinely unique fact the way a relevance filter
// risks doing (a sentence sharing zero terms with the question can still
// be exactly the contrastive fact a synthesis question needs — the "he
// was VP the same year Lincoln died, but was he VP the WHOLE time"
// specimen this same pass found; that is a real, harder, NOT-yet-solved
// problem this function does not attempt).
//
// TWO PASSES, not one — found live, in this exact order: a first cut using
// only string normalization (lowercase + collapsed whitespace + stripped
// punctuation) measured against the real specimen and UNDER-collapsed —
// "Hannibal Hamlin was the 15th vice president... serving from 1861 to
// 1865" and "Hannibal Hamlin (1809-1891) was the 15th vice president...
// (1861-1865)" are the SAME fact, differently worded, and stayed as two
// separate strings under exact-normalized matching (real test failure,
// not a guess). A fuzzy string-similarity threshold would catch that —
// and also risks silently conflating "Hamlin served as VP 1861-1865" with
// "Hamlin was replaced as VP by Andrew Johnson in 1865" (real adversarial
// test, below), which share most of the same words but say opposite
// things. No hand-picked similarity number is defensible here (this
// repo's own standing rule: measure a real signal, never tune a
// threshold) — so redundancy is instead measured the same way
// `buildFactBlock` already measures fact identity: does this sentence's
// OWN set of BOUND (subject,verb,object) triples add nothing beyond what
// an earlier-kept sentence already contributed? Two differently-worded
// restatements of "Hamlin —was→ 15th vice president" bind to the SAME
// triple (hypergraph.js's own real extraction, not a string comparison),
// so the second is redundant BY WHAT IT ACTUALLY ASSERTS, not by how it
// happens to be spelled — while "replaced by Andrew Johnson" asserts a
// DIFFERENT triple (or none at all, its own real, disclosed extraction
// limit — see this file's own header) and is never at risk of being
// mistaken for a restatement. Pass 1 (exact-normalized) still runs first,
// cheaply, for the literal copy-paste case that needs no extraction at
// all; pass 2 (`relations`, when supplied) catches what pass 1 can't.
// `relations` optional and omitted-safe: every call site that doesn't
// have one yet gets pass 1's real, smaller, honestly-partial win only.
//
// Cross-passage, first-seen order wins — deliberately not the longest or
// most-detailed phrasing, because "which restatement is most informative"
// is exactly the judgment this function has no way to make safely.
//
// Returns a NEW passages array — `p.text` rewritten, every other field
// (`ref`, `identity`, …) preserved — for building the PROMPT only.
// Callers must keep the ORIGINAL `passages` for citation checking
// (`checkCitations`), succession-box parsing (`parseSuccessionBoxes`),
// and everything else that must see the material's own real bytes.
const normalizeForDedup = (s) =>
  s
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Real, measured refinement (still no similarity threshold): the extractor
// captures everything after subject+verb up to the sentence boundary as
// ONE object, so "Hamlin —was→ the 15th vice president" (short sentence)
// and "Hamlin —was→ the 15th vice president... in the administration of
// President Lincoln" (a longer trailing clause on the SAME core fact)
// bind to DIFFERENT full-object strings under exact matching — measured
// live, a real test failure, not assumed. `subsumes` catches this
// specific, disclosed extractor shape (one object is a PREFIX of the
// other, same subject+verb) without comparing arbitrary similarity: a
// "lawyer" object is never a prefix of "the 15th vice president..." or
// the reverse, so two genuinely different facts sharing a subject+verb
// (the exact adversarial case this file's own tests pin) are never at
// risk from this check.
const subsumes = (existingKeys, subj, verb, obj) =>
  existingKeys.some(([s, v, o]) => s === subj && v === verb && (o.startsWith(obj) || obj.startsWith(o)));

const tripleKeysOf = (relations, sentence) => {
  const report = relations.read(sentence);
  return (report?.claims ?? [])
    .filter((c) => c.verdict === "bound")
    .map((c) => `${c.subject}|${c.verb}|${c.object}`.toLowerCase());
};

export function dedupeSourceText(passages, relations = null) {
  if (!Array.isArray(passages) || !passages.length) return passages ?? [];
  const seenText = new Set();
  const seenParsed = []; // [subject, verb, object] — subsumes() covers exact matches too (o.startsWith(o) is always true)
  return passages.map((p) => {
    const text = String(p?.text ?? "");
    if (!text.trim()) return p;
    const kept = splitSentences(text).filter((s) => {
      const norm = normalizeForDedup(s);
      if (!norm) return false;
      if (seenText.has(norm)) return false;
      if (relations) {
        const keys = tripleKeysOf(relations, s);
        // Redundant only when EVERY triple this sentence asserts was
        // already contributed by an earlier-kept sentence (exact match, or
        // `subsumes`'s own prefix case — see its header) — a sentence
        // asserting one already-seen fact PLUS one new one still carries
        // real, new information and must survive. A sentence with zero
        // extracted triples (extraction's own disclosed coverage gap —
        // pronoun subjects, garbled passive voice) is never treated as
        // redundant by this pass; only pass 1's literal-text check can
        // catch a true copy-paste repeat of such a sentence.
        const covered = keys.length && keys.every((k) => {
          const [subj, verb, obj] = k.split("|");
          return subsumes(seenParsed, subj, verb, obj);
        });
        if (covered) return false;
        for (const k of keys) seenParsed.push(k.split("|"));
      }
      seenText.add(norm);
      return true;
    });
    return { ...p, text: kept.join(" ") };
  });
}

export function buildFactBlock(relations, passages, question = "") {
  if (!relations || !Array.isArray(passages) || !passages.length) return null;
  const questionTerms = new Set(
    String(question ?? "")
      .toLowerCase()
      .split(/[^a-z0-9']+/)
      .filter(Boolean),
  );
  const seen = new Set();
  const lines = [];
  let sentenceCount = 0;
  let boundSentenceCount = 0;
  for (const p of passages) {
    const text = String(p?.text ?? "");
    if (!text.trim()) continue;
    // The real total, independent of report.claims: a pronoun-subject
    // sentence (hypergraph.js's own disclosed gap — candidate-verb
    // nomination anchors on capitalized surfaces only) yields ZERO
    // entries anywhere in report.claims, not even an "unheard" one
    // (judge()'s own read() skips it — "a pronoun subject is noise here,
    // not a claim about the cast"), so a denominator built FROM claims
    // would silently drop exactly the sentences most worth disclosing as
    // uncovered. splitSentences here is the SAME function hypergraph.js's
    // own sentencesOf calls internally (via cite.js); the two can
    // disagree only where a passage carries structural furniture
    // (headers, addresses) sentencesOf's own blankStructure pass masks
    // first — ordinary prose, the shape this block exists for, splits
    // identically either way.
    sentenceCount += splitSentences(text).length;
    const report = relations.read(text);
    if (!report?.examined || !report.claims?.length) continue;
    const boundSentences = new Set();
    for (const claim of report.claims) {
      if (claim.verdict !== "bound") continue;
      boundSentences.add(claim.sentence);
      const key = `${claim.subject}|${claim.verb}|${claim.object}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const negated = claim.polarity === "-" ? " not" : "";
      lines.push(`${claim.subject} —${negated} ${claim.verb}→ ${claim.object}`);
    }
    boundSentenceCount += boundSentences.size;
  }
  // AN EXPLICIT VOID, never a vanished block. User rule, 2026-08-26: "the
  // best way to keep a model from hallucinating is to either give it the
  // answer, or an explicit void in place of the answer." Returning null
  // here did neither — the FACTS section simply disappeared from the
  // prompt, leaving the model passages, no facts, and no statement that
  // there were no facts. A silent absence is precisely the shape a model
  // fills from memory, and it filled it: "who was lincoln's vp?" came back
  // "William R. Hargis", a person who does not exist.
  //
  // The difference between this and `null` is not cosmetic. `null` is the
  // absence of a claim about the material; this is a CLAIM that the
  // material yielded nothing — the same distinction grounding.js already
  // holds between `examined: false` and `clean` ("clean and examined are
  // different facts"), stated here in the one place the model can read it.
  //
  // The `sentenceCount` guard keeps a distinction the existing tests were
  // right to protect: NO MATERIAL and MATERIAL THAT YIELDED NOTHING are
  // different facts, and only the second is a void worth stating. Passages
  // that are empty or whitespace examine zero sentences — there is nothing
  // to have failed to extract from, so `null` stays correct there and the
  // caller's own no-material disclosure handles it. One real sentence that
  // yielded no relation is the case this void exists for.
  if (!lines.length && sentenceCount === 0) return null;
  if (!lines.length) {
    return {
      lines: [],
      allLines: [],
      coverage: 0,
      empty: true,
      text:
        `FACTS — none. Not one of the ${sentenceCount} sentence(s) in your material ` +
        `yielded an extractable relation, so there is no mechanically confirmed fact ` +
        `behind this turn. This is a stated absence, not an oversight: if the passages ` +
        `above do not answer the question, say plainly that they do not. Do not fill ` +
        `this space from memory.`,
    };
  }
  const ranked = rankByQuestion(lines, questionTerms);
  const shown = ranked.slice(0, MAX_FACT_LINES);
  const omitted = ranked.length - shown.length;
  const coverage = sentenceCount ? Math.round((boundSentenceCount / sentenceCount) * 100) : 0;
  return {
    lines: shown,
    allLines: ranked,
    coverage,
    text:
      `FACTS — read directly from your material (${boundSentenceCount} of ${sentenceCount} ` +
      `sentence(s) with an extractable relation; the passages above are the complete record, ` +
      `this list is a partial aid, not a substitute for them` +
      (omitted ? `; ${omitted} lower-ranked fact(s) omitted here, still present in the passages above` : "") +
      `):\n` +
      shown.map((l) => `- ${l}`).join("\n"),
  };
}
