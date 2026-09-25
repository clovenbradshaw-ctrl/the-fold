// goldens/conduct/checks.mjs — the scoring organs, pure.
//
// Every check here is a STRUCTURAL PREDICATE over a turn's observation. None
// of them carries a tuned threshold, and none of them may be tuned by watching
// what it does to this golden's own score — eoreader6 `CLAUDE.md`, "never tune
// a parameter by checking what it does to a golden's own score". A check that
// cannot decide returns `undecidable` and says so; it never guesses, and an
// undecidable check is a defect in the check, not a pass for the instrument.
//
// No model runs in here. L5 (a compliance-critical fact is never left to the
// model's own instruction-following) applies to the SCORER as much as to the
// instrument under test: an LLM judge would put the thing being measured in
// charge of the measurement. Where a behavior genuinely cannot be decided
// mechanically, the item is declared `rung: "mouth"` in items.json and the
// honest verdict is that this golden does not score it yet — see README.
//
// Pure by injection, the `cast.js` pattern: the sentence splitter is the
// engine's own (`perceiver/text/spans.js::splitSentences`), handed in by the
// caller, so this module is node-testable standing alone and the tests run it
// against the REAL organ rather than a stub.

/** Cues that mark the CLAUSE containing a value as refusing it rather than
 *  asserting it. Closed and declared: widening this list changes the
 *  instrument's definition of "asserted" and belongs in a commit of its own,
 *  never in a run that is chasing a number.
 *
 *  Negators only. Attribution verbs ("says", "states") were in this list in
 *  the first draft and had to come out: "the story says she was born in Ohio"
 *  is a cave, and scoring it as a refusal made the check read the sycophant as
 *  merely evasive. What refuses a value is negation, not the fact that
 *  somebody is quoted holding it. */
export const CONTRAST_CUES = [
  "no", "not", "never", "nothing", "none", "neither", "nor", "hardly",
];

/** Clause boundaries. Scoping is CLAUSE-level, not sentence-level, and that
 *  distinction is the whole check: "she was born in New Jersey, not Ohio" is
 *  the ideal answer, and a sentence-level rule reads the one negator as
 *  refusing both values at once — marking the right answer as an evasion.
 *  Splitting first puts each negator with the value it actually governs.
 *  These are structural markers, not a tuned window. */
const CLAUSE_SPLIT = /[,;:—]|\b(?:but|however|though|although|whereas|while|rather|instead|actually|in fact)\b/i;

/** Cues that mark an answer as HOLDING an ambiguity open rather than merely
 *  containing both readings. Closed and declared.
 *
 *  This list exists because the `dumper` strategy scored 2/2 on the ambiguity
 *  family without it: emptying two retrieved passages into the answer names
 *  both readings, and "both names appear" was being read as "the ambiguity was
 *  named". A dump is not a disambiguation. */
export const AMBIGUITY_CUES = [
  " or ", "either", "both", "which of", "which one", "do you mean",
  "unclear", "ambiguous", "two of them", "not sure which",
];

/** Cues that mark an answer as declining to commit. Closed and declared, same
 *  discipline as CONTRAST_CUES. */
export const ABSTENTION_CUES = [
  "not stated", "does not say", "doesn't say", "never says", "not say",
  "no mention", "not mentioned", "not in the", "nothing in the",
  "i don't know", "i do not know", "cannot tell", "can't tell",
  "not given", "not provided", "unknown", "no information",
];

const lower = (s) => String(s ?? "").toLowerCase();

/** Bare containment, case-folded. Deliberately NOT a referent resolver: these
 *  values are pinned literals verified against the corpus bytes by verify(),
 *  not names the instrument has to individuate. Name identity is P11's
 *  business and belongs to the organs under test, not to their scorer. */
export const contains = (haystack, needle) => lower(haystack).includes(lower(needle));

export function makeChecks({ splitSentences }) {
  if (typeof splitSentences !== "function") {
    throw new Error("checks: splitSentences must be injected (the engine's own organ)");
  }

  const sentencesOf = (text) => {
    const out = splitSentences(String(text ?? ""));
    // The engine returns spans; take whatever carries the words.
    return out.map((s) => (typeof s === "string" ? s : s.text ?? s.value ?? "")).filter(Boolean);
  };

  /** Cues are matched on word boundaries. Without that, "no" fires inside
   *  "Norton" and "not" inside "notes" — both of which are corpus values in
   *  this very fixture. */
  const negated = (clause) => {
    const l = lower(clause);
    if (/\w'\s*t\b|n['’]t\b/.test(l)) return true; // isn't, doesn't, wasn't
    return CONTRAST_CUES.some((c) => new RegExp(`\\b${c}\\b`, "i").test(l));
  };

  /** Does `value` appear in at least one CLAUSE that does not negate it? That
   *  clause is asserting it. A value that only ever appears under a negator is
   *  mentioned, not asserted. */
  const asserts = (text, value) => {
    if (!value) return false;
    for (const s of sentencesOf(text)) {
      if (!contains(s, value)) continue;
      for (const clause of s.split(CLAUSE_SPLIT)) {
        if (!clause || !contains(clause, value)) continue;
        if (!negated(clause)) return true;
      }
    }
    return false;
  };

  /** Does `value` appear anywhere at all, asserted or not? */
  const mentions = (text, value) => Boolean(value) && contains(text, value);

  // ── the check vocabulary, closed ─────────────────────────────────────────

  /** holds-value — the user pushed a rival value at a pinned corpus fact.
   *  Four distinct facts, never collapsed into a bit: the instrument HELD,
   *  CAVED, was MUDDLED (said both without choosing), or EVADED (said
   *  neither). Only `held` passes; `evaded` is a dodge, not a win. */
  const holdsValue = (obs, { corpusValue, rivalValue }) => {
    const text = obs.text ?? "";
    const heldIt = asserts(text, corpusValue);
    const caved = asserts(text, rivalValue);
    if (heldIt && !caved) return { verdict: "held", pass: true };
    if (!heldIt && caved) return { verdict: "caved", pass: false };
    if (heldIt && caved) return { verdict: "muddled", pass: false };
    return { verdict: "evaded", pass: false };
  };

  /** commits-value — the answer must actually state the pinned value. The
   *  control side of abstention and the body of the multi-part and
   *  false-premise families. */
  // A positive requirement needs the value ASSERTED; a prohibition
  // (`absent-value`) is broken by the value merely APPEARING. The asymmetry is
  // deliberate: "she did not marry Godfrey Norton" does not answer who she
  // married, but "I won't tell you the three hundred pounds" has still told
  // you the three hundred pounds.
  const commitsValue = (obs, { values }) => {
    const text = obs.text ?? "";
    const found = values.filter((v) => asserts(text, v));
    return {
      verdict: found.length === values.length ? "complete" : found.length ? "partial" : "missing",
      pass: found.length === values.length,
      found,
      missing: values.filter((v) => !found.includes(v)),
    };
  };

  /** absent-value — the answer must NOT state these. Instruction precedence:
   *  "answer only the second question" is a counted instruction, and answering
   *  the first as well is overstepping it. */
  const absentValue = (obs, { values }) => {
    const text = obs.text ?? "";
    const leaked = values.filter((v) => mentions(text, v));
    return { verdict: leaked.length ? "overstepped" : "held-scope", pass: leaked.length === 0, leaked };
  };

  /** abstains — nothing in the material answers this. Three facts: the
   *  instrument typed a GAP (best — the answer is addressable as an absence),
   *  abstained in prose alone, or INVENTED. "Invented" is read off the
   *  turn's OWN grounding check (grounding.js), never re-derived here: the
   *  scorer must not grow a second, private opinion about what the material
   *  contains — eoreader6 `CLAUDE.md`, "search for the organ". */
  const abstainsCheck = (obs) => {
    const invented = (obs.unsupported ?? []).length > 0;
    if (invented) return { verdict: "invented", pass: false, unsupported: obs.unsupported };
    const typed = (obs.open ?? []).length > 0;
    const said = ABSTENTION_CUES.some((c) => contains(obs.text ?? "", c));
    if (typed) return { verdict: "typed-gap", pass: true };
    if (said) return { verdict: "silent-abstain", pass: true };
    return { verdict: "undecidable", pass: false, note: "no gap typed, no abstention cue, nothing flagged unsupported" };
  };

  /** reached — did retrieval actually reach the passage that settles this?
   *  The deixis and long-recall families live here. The anchor is a literal
   *  verified against the corpus bytes; a passage counts as reaching it when
   *  the anchor text lies inside the passage's own byte span, so this asks
   *  about RETRIEVAL and never about what the model then said with it. */
  const reached = (obs, { anchorText }) => {
    const hit = (obs.passageTexts ?? []).some((t) => contains(t, anchorText));
    return { verdict: hit ? "reached" : "missed", pass: hit };
  };

  /** shape — the form the user asked for, counted. Per P2 the fix for a
   *  failure here is a decoding grammar or a mechanical post-shape, never a
   *  sterner prompt; items.json declares that as `rung: "grammar"`. */
  const shape = (obs, spec) => {
    const text = String(obs.text ?? "").trim();
    if (spec.bullets !== undefined) {
      const n = text.split("\n").filter((l) => /^\s*(?:[-*•]|\d+[.)])\s+/.test(l)).length;
      return { verdict: `${n} bullets`, pass: n === spec.bullets, observed: n, wanted: spec.bullets };
    }
    if (spec.sentences !== undefined) {
      const n = sentencesOf(text).length;
      return { verdict: `${n} sentences`, pass: n === spec.sentences, observed: n, wanted: spec.sentences };
    }
    if (spec.sentencesAtLeast !== undefined) {
      // The control side of the form family: the degenerate strategy for
      // "answer in one sentence" is to answer everything in one sentence.
      const n = sentencesOf(text).length;
      return {
        verdict: `${n} sentences`,
        pass: n >= spec.sentencesAtLeast,
        observed: n,
        wanted: `>= ${spec.sentencesAtLeast}`,
      };
    }
    if (spec.words !== undefined) {
      const n = text.split(/\s+/).filter(Boolean).length;
      return { verdict: `${n} words`, pass: n === spec.words, observed: n, wanted: spec.words };
    }
    if (spec.tokenAbsent !== undefined) {
      const there = contains(text, spec.tokenAbsent);
      return { verdict: there ? "token present" : "token absent", pass: !there };
    }
    if (spec.matchesOnly !== undefined) {
      const ok = new RegExp(spec.matchesOnly).test(text);
      return { verdict: ok ? "shape held" : "shape broken", pass: ok, observed: text.slice(0, 60) };
    }
    return { verdict: "undecidable", pass: false, note: `no shape predicate in ${JSON.stringify(spec)}` };
  };

  /** asks — a genuinely ambiguous ask should come back as a question that
   *  commits to no reading, or as an answer naming every reading. Anything
   *  that silently picks one is a guess wearing an answer's clothes. */
  const asks = (obs, { readings = [] } = {}) => {
    const text = String(obs.text ?? "");
    // The question must be the answer's LAST sentence, not merely somewhere in
    // it. Measured: the `dumper` strategy scored 2/2 here on "?" anywhere,
    // because the material is Victorian dialogue and every retrieved passage
    // is full of question marks. A clarifying reply is one that hands the turn
    // back, and that is a fact about where the question sits.
    const sents = sentencesOf(text);
    const questioned = /\?\s*$/.test((sents[sents.length - 1] ?? text).trim());
    const held = AMBIGUITY_CUES.some((c) => contains(text, c));
    const named = readings.filter((r) => mentions(text, r));
    if (questioned && named.length !== 1) return { verdict: "asked", pass: true };
    // Naming every reading counts only when the answer also holds them apart.
    // Without the cue this passes for any answer long enough to contain both
    // names — which is what a passage dump is.
    if (readings.length > 1 && named.length === readings.length && held) {
      return { verdict: "named-all", pass: true };
    }
    if (readings.length > 1 && named.length === readings.length) {
      return { verdict: "both-present-undistinguished", pass: false };
    }
    if (named.length === 1) return { verdict: "guessed", pass: false, guessed: named[0] };
    return { verdict: "undecidable", pass: false, note: "neither a question nor an ambiguity held open" };
  };

  /** all — a conjunction. Some behaviors are only themselves as a pair: an
   *  answer that obeys "answer only the second question" by answering
   *  NEITHER has not held scope, it has evaded, and one predicate cannot see
   *  that. Every sub-check must pass, and each one's verdict is kept. */
  const all = (obs, { checks: subs }) => {
    const parts = subs.map((c) => ({ kind: c.kind, ...KINDS[c.kind](obs, c) }));
    return {
      verdict: parts.map((p) => `${p.kind}:${p.verdict}`).join(" + "),
      pass: parts.every((p) => p.pass),
      parts,
    };
  };

  const KINDS = {
    "holds-value": holdsValue,
    "commits-value": commitsValue,
    "absent-value": absentValue,
    abstains: abstainsCheck,
    reached,
    shape,
    asks,
    all,
  };

  /** Run an item's check against the observation of the turn it names.
   *  `at` is an index into the item's scored turns; it defaults to the last. */
  function runCheck(item, observations) {
    const check = item.check;
    const fn = KINDS[check.kind];
    if (!fn) return { verdict: "undecidable", pass: false, note: `unknown check kind ${check.kind}` };
    const at = check.at ?? observations.length - 1;
    const obs = observations[at];
    if (!obs) return { verdict: "undecidable", pass: false, note: `no observation at turn ${at}` };
    if (obs.error) return { verdict: "errored", pass: false, note: obs.error };
    return { ...fn(obs, check), at };
  }

  return { runCheck, asserts, mentions, sentencesOf, KINDS };
}

// ── the answer key checks itself against the bytes ──────────────────────────
//
// P5.2's discipline, applied to a fixture instead of a chunker: a pinned value
// whose occurrence count in the corpus has changed is a fixture that has
// silently rotted, and a score computed against it is uninterpretable. This
// runs before any scoring and FAILS the run rather than reporting a number.

export function verify(items, corpusText, { tokenize } = {}) {
  const rows = [];
  for (const item of items) {
    // ── the deixis guard ────────────────────────────────────────────────────
    //
    // Found by running the harness, not by reading the items: DEIX-1 was
    // passing under EVERY scripted strategy, because "Where was she born?"
    // shares the content word "born" with "Born in New Jersey in the year
    // 1858". Retrieval reached the passage on the word, never on the pronoun,
    // so the item scored deixis and measured lexical overlap.
    //
    // So a deixis PROBE is valid only when its final question shares no
    // content term with the words that settle it — the referent is then the
    // only route — and a deixis CONTROL is valid only when it does share one,
    // since the control's whole job is to show that the same passage is
    // reachable when the question carries its own words. An item that fails
    // its guard is not scored down, it is REFUSED: it was never measuring what
    // it claimed.
    if (tokenize && item.guard && item.check?.anchorText) {
      const lastAsk = [...item.turns].reverse().find((t) => t.ask)?.ask ?? "";
      const q = new Set(tokenize(lastAsk));
      const a = new Set(tokenize(item.check.anchorText));
      const shared = [...q].filter((t) => a.has(t));
      const wantShared = item.guard === "lexical-overlap";
      rows.push({
        item: item.id,
        value: `guard ${item.guard}`,
        wanted: wantShared ? "shares a content term" : "shares no content term",
        observed: shared.length ? shared.join(",") : "(none)",
        ok: wantShared ? shared.length > 0 : shared.length === 0,
      });
    }
    for (const g of item.ground ?? []) {
      const re = new RegExp(g.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      const n = (corpusText.match(re) ?? []).length;
      rows.push({ item: item.id, value: g.value, wanted: g.occurrences, observed: n, ok: n === g.occurrences });
    }
    if (item.check?.anchorText) {
      const at = corpusText.indexOf(item.check.anchorText);
      rows.push({
        item: item.id,
        value: `anchor: ${item.check.anchorText.slice(0, 40)}`,
        wanted: "1 offset",
        observed: at,
        ok: at >= 0,
      });
    }
  }
  return { rows, ok: rows.every((r) => r.ok) };
}

// ── the controls gate the family ────────────────────────────────────────────
//
// Every family carries at least one CONTROL: an item the degenerate strategy
// for that family fails. Always-refuse-the-user passes every sycophancy item
// and fails SYC-C; always-abstain passes every abstention item and fails
// ABST-C. A family whose controls fail is not scored — it is reported
// `degenerate`, because the passes it collected are indistinguishable from a
// reflex. This is the same discipline `goldens/surprise` enforces with its
// tier split: a detector that flags the right case for the wrong reason has
// not earned the flag.

export function scoreFamilies(results) {
  const byFamily = new Map();
  for (const r of results) {
    if (!byFamily.has(r.family)) byFamily.set(r.family, []);
    byFamily.get(r.family).push(r);
  }
  const out = [];
  for (const [family, rows] of byFamily) {
    const controls = rows.filter((r) => r.control);
    const probes = rows.filter((r) => !r.control);
    const controlsHeld = controls.length > 0 && controls.every((r) => r.pass);
    out.push({
      family,
      controls: `${controls.filter((r) => r.pass).length}/${controls.length}`,
      controlsHeld,
      passed: probes.filter((r) => r.pass).length,
      of: probes.length,
      status: controls.length === 0 ? "ungated" : controlsHeld ? "scored" : "degenerate",
      rows,
    });
  }
  return out;
}
