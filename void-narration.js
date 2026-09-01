// void-narration.js — the void's own work, thought out loud while it happens.
//
// User direction, verbatim (2026-08-27): "i want the 'thinking' reasoning to
// show in real time its work figuring out the shape of an answer that would
// satisfy", then — correcting the first cut — "think about how 'thinking'
// text works, our current affordance is too structured."
//
// THE FIRST CUT WAS WRONG AND THE CORRECTION IS THE WHOLE DESIGN. That
// version emitted one line per operator-step, and each line was structured
// data wearing sentence clothes:
//
//   still unspecified — 6 operators nothing has answered: INS (Kind) what
//   kind of thing may stand here · SEG (Field) the extent to be covered ·
//   CON (Link) what binds a filler to the anchor · SYN (Network) …
//
// That is a record laid out for a machine and then read aloud. It is not
// how thinking reads. Thinking reads as continuous prose that arrives at
// things: a subject taken up, a distinction drawn, a doubt named, a
// consequence followed. Nobody thinks in field-name/value pairs joined by
// middots, and text in that shape asks a reader to PARSE where it should
// let them READ.
//
// So this file emits PARAGRAPHS, not rows. The nine operators are still
// exactly what is being reasoned about — they are what the void IS — but
// they appear as the questions they actually are ("what kind of thing
// belongs here", "how wide is it") in running sentences, and their operator
// letters are not said at all. The letters are a notation for the record;
// the record already carries them, in `brief.declaration.cells`, and the
// panel still prints them. A reader watching a question get taken apart
// does not need the notation, and putting it in front of them is what made
// the first version unreadable.
//
// Matches this repo's own standing rule, one register over: "prompt format
// matches output format — prose in for prose out; avoid symbolic/bracket-tag
// scaffolding." That rule was written about what is SENT to a model. It is
// the same rule about what is shown to a person.
//
// PURE, and narration only. Every fact phrased here was already computed by
// void-shape.js and void-brief.js, and this file's whole contract is that it
// must never be able to disagree with them — `standingLine` carries
// `voidsOf`'s own `reason` verbatim rather than paraphrasing it, which is
// exactly how a narrator comes to contradict the arithmetic it reports.

/** The two moments a turn has something new to think about: the question by
 * itself, and then the material. Declared by the caller, never inferred from
 * an empty texts array — that would be this file guessing at its caller's
 * own state. */
export const VOID_PHASES = Object.freeze(["question", "material"]);

// Joined with the separator the ITEMS allow. An item carrying its own comma
// ("Hannibal Hamlin, covering 1861 to 1865") turns a comma-joined list into
// one unreadable run — the reader cannot tell which commas separate people
// and which separate a person from their dates. Semicolons in that case,
// commas otherwise. Found by reading the real output, not by reasoning about
// it in advance.
const listOut = (items) => {
  const xs = items.filter(Boolean);
  if (xs.length <= 1) return xs[0] ?? "";
  const internal = xs.some((x) => x.includes(","));
  const sep = internal ? "; " : ", ";
  // Two plain items take a bare "and" — "Hamlin, and Johnson" reads as a
  // list that lost an item. Two items that carry their own commas still need
  // the semicolon to stay parseable.
  if (xs.length === 2) return `${xs[0]}${internal ? ";" : ""} and ${xs[1]}`;
  return `${xs.slice(0, -1).join(sep)}${sep.trimEnd()} and ${xs[xs.length - 1]}`;
};

// Small counts as words. "1 statement put it there" and "the material names
// 2" read as a log line; prose spells them. Past a dozen the digits are
// clearer than the words, which is where ordinary English puts the line too.
const WORDS = Object.freeze(["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"]);
const count = (n) => (Number.isInteger(n) && n >= 0 && n < WORDS.length ? WORDS[n] : String(n));

// A span whose ends are the same year is a point, and "1865 to 1865" reads
// as a mistake rather than as a term that began and ended inside one year.
// The record's own precise dates when it stated them, the year endpoints
// otherwise. Added 2026-08-27 with `succession.js::officeSpanOf`'s date
// reader: a span whose years collapse to a point ("1865 to 1865" — Andrew
// Johnson's whole vice presidency) states nothing a reader can use, and
// `seg.js` now detects exactly that case mechanically rather than leaving
// it to whoever happens to read the sentence. Both endpoints are required
// before either is used: half a precise span is a mixed unit, not a
// sharper one.
const spanText = (s) => {
  if (!s) return null;
  if (s.fromText && s.toText) return s.fromText === s.toText ? s.fromText : `${s.fromText} to ${s.toText}`;
  return s.from === s.to ? `${s.from}` : `${s.from} to ${s.to}`;
};

// What each unanswered operator is actually asking, said as a person would
// ask it. `declareVoid`'s own `asks` strings are written for the record
// ("the extent to be covered, and its units") and read as column headers in
// running prose; these are the same questions in the voice the rest of the
// paragraph is in. Keyed by field, not by operator letter, because the field
// is what the reader is being told is missing.
const OPEN_QUESTIONS = Object.freeze({
  slot: "what space this even is",
  anchor: "who or what it hangs on",
  admits: "what kind of thing belongs in it",
  extent: "how wide it is",
  relation: "what would tie someone to it",
  composition: "how several answers would fit together if there are several",
  cardinality: "how many it holds",
  admission: "what test something has to pass to count",
  reopensOn: "what would make me take all this back",
});

/** The question, taken apart: what is being asked for, and what it hangs on. */
function openingPara(brief) {
  const slot = brief.declaration?.slot;
  if (!slot) return null;
  const anchor = (brief.declaration?.cells ?? []).find((c) => c.op === "SIG")?.declared ?? null;
  // `headPhrase`/`connective` are read directly off the brief — the two
  // pieces `slot` was concatenated FROM — never re-split out of the
  // concatenated string. Re-splitting with a hardcoded " of " match was
  // measured live to state the anchor twice under any other connective
  // ("in", "for", …): see void-brief.js's own header on these two fields
  // for the exact failure. `slot` itself is still the fallback for a brief
  // built before these fields existed (older callers, or a caller that
  // supplied its own `anchor` — see briefFor's own `anchor` override, which
  // does not go through `declaredSlotShape` and so carries no connective).
  const head = brief.headPhrase ?? slot;
  const connective = brief.connective ?? "of";
  return anchor
    ? `The question wants a ${head}, and it ties that to ${anchor}. So what has to be filled is the ${head} ${connective} ${anchor} — and before anything is worth calling an answer, I need to know what would actually fill it.`
    : `What has to be filled here is the ${head}. Before anything is worth calling an answer, I need to know what would actually fill it.`;
}

/**
 * How many, and — where grammar and declaration disagree — why the
 * declaration does not follow the grammar. That disagreement is the entire
 * reason web-claim.js stopped returning "single", so it is thought through
 * rather than left as an absence a reader has to notice.
 */
function cardinalityPara(brief) {
  const declared = (brief.declaration?.cells ?? []).find((c) => c.op === "DEF")?.declared ?? null;
  if (declared === "enumerated")
    return `The question asks for more than one outright, so a single name can never close this — however true that name is.`;
  if (brief.grammaticalNumber === "singular")
    return `It is phrased in the singular, but that is a fact about English and not about the world, so I will not read one filler into it. How many there are is still open.`;
  return `Nothing in the question says how many it holds, so I am not assuming.`;
}

/** The doubts, as doubts. Six open questions is a real state to be in and
 * saying so plainly is the point — a void that quietly defaulted its own
 * unanswered halves is what produced every confident wrong answer here. */
function openPara(brief) {
  const open = brief.declaration?.undeclared ?? [];
  if (!open.length) return `Every part of this is pinned down — there is nothing about the shape I am still guessing at.`;
  const qs = open.map((u) => OPEN_QUESTIONS[u.field]).filter(Boolean);
  if (!qs.length) return null;
  const tail =
    open.length === 1
      ? `That one still has to come from somewhere.`
      : `Those have to come from somewhere, and if they do not, I am answering into a shape I never established.`;
  return `What I still cannot say: ${listOut(qs)}. ${tail}`;
}

/** The extent, with its own evidence. A frequency vote is disclosed as one —
 * `extentFor` says outright it has never been measured against a null — so
 * the count travels with the span rather than the span travelling alone. */
function extentPara(brief) {
  const e = brief.evidence ?? {};
  // A REFUSED tie is a different fact from silence, and saying so is the
  // whole point of refusing rather than taking the top span. "Several spans
  // and none of them leads" tells a reader the material is ambiguous about
  // the shape; "nothing says how wide" tells them it is quiet about it.
  // Collapsing the two would hide exactly the ambiguity that caused the
  // false hole this refusal exists to prevent.
  if (!e.extent && e.refused) {
    const cands = (e.refused.candidates ?? []).map((c) => spanText(c)).slice(0, 3);
    return `${count(e.considered).replace(/^./, (c) => c.toUpperCase())} different spans are stated for it — ${listOut(cands)}${e.considered > cands.length ? ", among others" : ""} — and none of them leads the rest. So I will not treat any of them as the shape: a span picked out of a tie would let me report a hole that is really just my own arbitrary choice of edges.`;
  }
  if (!e.extent)
    return `Nothing I have read says how wide the slot is. Without that I have no shape to find a hole in, so I cannot tell whether an answer is complete — only whether it is wrong.`;
  const dim = brief.declaration?.dimension ?? null;
  // Agreement is on the COUNT OF STATEMENTS, never on the number of rival
  // readings — "One statements put it there, against five competing" was
  // live output.
  const stated = `${count(e.mentions)} statement${e.mentions === 1 ? "" : "s"} put it there`;
  const rivals =
    e.considered > 1
      ? `${stated}, against ${count(e.considered - 1)} competing reading${e.considered > 2 ? "s" : ""}`
      : `${stated} and nothing offered a competing span`;
  const R = rivals.charAt(0).toUpperCase() + rivals.slice(1);
  return `The sources put it at ${spanText(e.extent)}${dim ? `, in ${dim}` : ""}. ${R}. That turns the slot from a name into a stretch that an answer has to account for end to end.`;
}

/** What has actually been named, each with its own extent. A filler whose
 * extent was never read is named WITHOUT one rather than dropped — `fill()`'s
 * own contract: a null span is disclosed absence, never guessed. */
function namedPara(brief) {
  const fillers = brief.fillers ?? [];
  if (!fillers.length) return null; // the standing paragraph says it better
  // When NO filler carries an extent, the caveat is about the reading and
  // belongs once at the end. Repeating "though nothing says for how long"
  // after every name reads as a stutter and buries the names it qualifies.
  const anySpan = fillers.some((f) => f.span);
  if (!anySpan) return `So far the sources name ${listOut(fillers.map((f) => f.filler))} — but nothing I have read says how long ${fillers.length > 1 ? "any of them" : "it"} held it.`;
  const named = fillers.map((f) => (f.span ? `${f.filler}, covering ${spanText(f.span)}` : `${f.filler}, though nothing says for how long`));
  return `So far the sources name ${listOut(named)}.`;
}

/** The standing, in the void's OWN words — `voidsOf`'s `reason` is already
 * written for a reader, so it travels verbatim. Paraphrasing it here is
 * precisely how this file could come to disagree with the arithmetic. */
function standingPara(brief) {
  const st = brief.standing;
  if (!st) return null;
  if (st.standing === "covered") return `And that closes it: ${st.reason}. Nothing should be added to that set, and an answer that names more is naming something else.`;
  if (st.standing === "incomplete") {
    // `reason` says "filled by nothing named so far", which is exactly right
    // — nothing PLACED covers it — and reads as a flat contradiction when
    // the paragraph above just named two people. The reason still travels
    // verbatim (paraphrasing it is how this file would come to disagree with
    // the arithmetic); the apparent contradiction is resolved AFTER it, out
    // of `voidsOf`'s own `unplaced`, which is the fact that explains it.
    const unplaced = st.unplaced ?? [];
    const why = unplaced.length
      ? ` That is not a contradiction of what I just named: ${unplaced.length > 1 ? "those" : "that"} ${unplaced.length > 1 ? "names" : "name"} came with no dates attached, and a filler whose reach I cannot read cannot be shown to cover any of it.`
      : "";
    return `But there is a hole in it: ${st.reason}.${why} So whatever I say now is short of the answer, not a smaller version of it.`;
  }
  return `Which leaves the shape unbounded: ${st.reason}.`;
}

/**
 * THE REC — a concession, thought through rather than logged.
 *
 * Fires only where the grammar genuinely read singular AND the material
 * genuinely named more than one. It concedes a READING, not a declared
 * cardinality: `declared` is already `unknown` by design, so nothing on the
 * record is being retracted. What is conceded is the expectation a reader or
 * a model would otherwise carry forward from the question's own grammar —
 * and saying so is the difference between being right by luck and being
 * right on purpose.
 */
function revisionPara(brief) {
  // Fires on the DECLARATION having actually been revised, not on a filler
  // count. `briefFor` sets `reopened` when it re-declared the cardinality as
  // `enumerated` and answered REC's own cell with what forced it; this
  // paragraph reports that revision. Keying on the count instead would let
  // this sentence appear on a turn where nothing was actually revised, which
  // is a claim about the record that the record would not support.
  if (!brief.reopened) return null;
  const n = (brief.fillers ?? []).length;
  const asked =
    brief.grammaticalNumber === "singular"
      ? `the question asked as though there were one`
      : `the question never said how many there were`;
  return `So I am revising the shape I started with: ${asked}, and the sources bind ${count(n)} to it. That is the thing that was supposed to make me take it back, and it has — the slot holds several, not one. Naming ${n === 2 ? "either one" : "any one"} alone would not be a rougher version of the right answer; it would be the wrong shape.`;
}

/**
 * The facts a later pass compares itself against, so an unchanged pass can
 * say nothing rather than repeat itself.
 *
 * SCOPED TO WHAT THE PHASE ACTUALLY SAYS. The question pass renders the slot,
 * the cardinality and the open questions; the material pass renders the
 * extent, the fillers and the standing. Keying both on one undifferentiated
 * bag of facts makes a pass re-speak over a change it does not even print.
 *
 * AND `mentions` IS DELIBERATELY NOT IN IT — found live, 2026-08-27. The
 * corroboration count is in the rendered sentence ("Two statements put it
 * there"), so including it meant a third pass over slightly more material
 * re-printed BOTH material paragraphs to change one word from "Two" to
 * "Three". A stronger count for the same span, the same fillers and the same
 * standing is not something a reader learned; it is the same finding, held
 * a little more firmly, and spending two paragraphs on it reads as an
 * instrument stuck rather than one working. A change in the span itself, in
 * who is named, or in whether the space closes is real news and still speaks.
 */
function digestOf(brief, phase) {
  const slot = brief?.declaration?.slot ?? null;
  if (phase === "question") {
    return JSON.stringify({
      phase,
      slot,
      open: (brief?.declaration?.undeclared ?? []).map((u) => u.field),
      cardinality: (brief?.declaration?.cells ?? []).find((c) => c.op === "DEF")?.declared ?? null,
      grammar: brief?.grammaticalNumber ?? null,
    });
  }
  return JSON.stringify({
    phase: "material",
    slot,
    extent: brief?.evidence?.extent ?? null,
    fillers: (brief?.fillers ?? []).map((f) => `${f.filler}${f.span ? `:${f.span.from}-${f.span.to}` : ""}`),
    standing: brief?.standing?.standing ?? null,
    reopened: Boolean(brief?.reopened),
  });
}

/**
 * Think about a brief, in prose.
 *
 * `phase: "question"` is the pass that runs before any material has been
 * read — it takes the question apart and names what it cannot yet say, and
 * deliberately says nothing about extent or fillers, because claiming
 * "nothing states one" before anything has been consulted would be a report
 * on a reading that never happened.
 *
 * `phase: "material"` is every pass after material is in hand.
 *
 * `previous` is the digest returned by the last call. A pass that learned
 * nothing returns null rather than saying the same things again — repetition
 * reads as an instrument stuck, not an instrument working.
 *
 * Returns `{ text, digest }` or null.
 */
export function narrateVoid(brief, { phase = "question", previous = null } = {}) {
  if (!brief || brief.schema !== "EOVoidBrief@1") return null;
  const digest = digestOf(brief, phase);
  if (previous !== null && previous === digest) return null;

  const paras =
    phase === "question"
      ? [openingPara(brief), cardinalityPara(brief), openPara(brief)]
      : [extentPara(brief), namedPara(brief), standingPara(brief), revisionPara(brief)];

  const text = paras.filter(Boolean).join("\n\n");
  return text ? { text, digest } : null;
}

/**
 * The thought for a question that names no slot at all. Not a failure and
 * not silence: "how does photosynthesis work?" has no filler-shaped answer,
 * and the honest report is that there is no space here to zero — never a
 * zeroed space with every operator empty, which would read as an
 * under-specified void rather than an inapplicable one.
 */
export const noSlotLine = () =>
  `This question does not open a slot to fill — there is no particular thing an answer has to name, so there is no shape here for me to check an answer against. I will read it and answer it, but nothing below is measuring completeness.`;
