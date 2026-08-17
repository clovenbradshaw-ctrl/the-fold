// widget.js — which build a turn's artifact belongs to.
//
// The problem this exists for, in the user's own words: "So if I'm like 'I
// don't like the colors' or 'it's broken' it's able to modify that particular
// one and not create a net new one."
//
// Before this module, every code segment a turn produced was born as a new
// build (`publishBuild` counted `state.builds.length + 1` and stopped there).
// Feedback on a widget therefore forked it: build 1 the original, build 2 the
// recolour, build 3 the fix — three orphans, no thread, and the append-only
// log of build 1 frozen at the moment the operator first complained.
//
// The routing is MECHANICAL (L5: a compliance-critical fact is never left to
// the model's own instruction-following). The model saying "here is build 3,
// updated" is not evidence of anything — it is the model's phrasing, and
// phrasing is exactly what L5 refuses to trust. The decision is read off two
// things the model does not author: the OPERATOR's own words, and the shape
// of what came back.
//
// ── WHAT THIS FILE IS NOT ALLOWED TO CONTAIN, AND WHY ───────────────────────
//
// The first version of this module decided the question with four hand-typed
// English word lists: presupposing verbs (fix|change|resize|recolour|…),
// creation verbs (make|build|write|…), judgment adjectives
// (broken|ugly|wrong|…), and anaphora. That is precisely the mistake
// relations.js's own header records having made and undone — a 90-word
// hand-listed verb string that was "not a simplification of English, it was a
// sample of it standing in for the whole". Every complaint phrased outside my
// sample would have forked a build, silently, and no test written by the same
// hand that wrote the sample would ever have caught it.
//
// So the lists are gone. What decides now is:
//
//   · CLOSED CLASSES, RECEIVED FROM THE ENGINE'S PRIOR REGISTER
//     (perceiver/text/priors.js — every entry names its giver, Amendment IV).
//     Indefinite determiners INTRODUCE their noun; definite determiners and
//     anaphoric pronouns POINT BACK; NEGATION_WORDS and FIRST_PERSON make a
//     judgment. These are closed classes, so there is no sample standing in
//     for a whole — the class IS the whole.
//
//   · THE BUILD'S OWN BYTES, through retrieval's own fold. A definite noun
//     phrase ("the button", "the counter") lands on a build when the build's
//     own text contains it — the same containment discipline grounding.js and
//     cite.js already hold, sharing tokenize/foldDiacritics so a found word
//     cannot fail the check that should confirm it (CLAUDE.md's diacritics
//     lesson, applied to routing).
//
// No verb is named anywhere below. A verb list could only ever be a sample.
//
// ── WHAT THAT COSTS, STATED RATHER THAN PAPERED OVER ────────────────────────
//
// A definite phrase naming something the artifact does not YET contain does
// not resolve: "change the background to blue" on a widget that has no
// background is not routed, and falls through to a new build. The hand-typed
// verb list caught that case and this does not. It is kept as a stated limit
// rather than bought back with a list, for the reason above — the list would
// also have silently mis-routed every phrasing outside it, and a limit that
// is visible is worth more than a sample that is not. "Make it blue" (an
// anaphor), "I don't like the background" (a judgment), and "build 2" (the
// number) all route, so the affordance is never absent, only narrower.
//
// Morphology is not folded either: "the colors" does not resolve against a
// build whose bytes say `color:`. There is no stemmer in this engine and
// inventing one here would be the same mistake at a different altitude.
//
// ── WHAT WAS CONSIDERED AND REFUSED ─────────────────────────────────────────
//
// `extractRelations` + `discoverRelationVocab` (the measured SVO ladder) was
// the first organ reached for, and it is the right organ for prose about
// named entities — which a chat complaint is not. `discoverRelationVocab`
// anchors candidate verbs on capitalised surfaces (extractSurfaces); "I don't
// like the colors" has no surface at all (priors.js::NEVER_A_NAME excludes
// "I"), so the ladder measures an empty vocabulary and extractRelations
// returns nothing. Named here rather than assumed, the way segments.js's
// `outlineOfIndex` was tried and refused on the merits in eoreader6's own
// goldens/network before a new splitter was written.
//
// Pure and browser-safe; organs injected (the cast.js pattern) so the page
// loads the priors from /engine and the node tests load them by relative
// path. Used, never copied.

import { BUILD_MESSAGE_MAX, referencedBuild } from "./builds.js";
import { foldDiacritics, tokenize } from "./source.js";

/**
 * Bind the router to the engine's prior register.
 *
 * `makeWidgetRouter(priors)` → `{ iterationTell, routeSegment }`, where
 * `priors` is the namespace of perceiver/text/priors.js. Every closed class
 * below arrives from there, with its giver attached at the source; this file
 * declares none of its own.
 */
export function makeWidgetRouter(priors) {
  const {
    INDEFINITE_DETERMINERS,
    DEFINITE_DETERMINERS,
    ANAPHORIC_PRONOUNS,
    NEGATION_WORDS,
    FIRST_PERSON,
  } = priors;

  for (const [name, set] of Object.entries({ INDEFINITE_DETERMINERS, DEFINITE_DETERMINERS, ANAPHORIC_PRONOUNS, NEGATION_WORDS })) {
    if (!(set instanceof Set) || !set.size)
      throw new TypeError(`makeWidgetRouter: ${name} must come from the engine's prior register`);
  }

  // TWO FOLDS, EACH THE RIGHT ONE FOR ITS SIDE — and they are not
  // interchangeable, which is worth stating because reaching for the
  // convenient one silently breaks this file:
  //
  //   · `forms` keeps every word. The closed classes ARE function words, and
  //     source.js::tokenize drops function words by design (STOPWORDS, plus a
  //     three-character floor) — reading determiners through it would find
  //     none, ever. This is tokenization, not vocabulary: no word is named
  //     here, only the shape of a word. Curly apostrophes fold to straight so
  //     "don’t" and "don't" reach the register as the same form.
  //   · `terms` is retrieval's own tokenizer, used for the content-word
  //     comparison against a build's bytes, where dropping function words is
  //     exactly what is wanted. Both sides of that containment go through it,
  //     per CLAUDE.md's diacritics lesson: an organ that compares text to text
  //     must share retrieval's fold, or a found passage fails the very check
  //     that should confirm it.
  const forms = (s) =>
    foldDiacritics(String(s ?? ""))
      .toLowerCase()
      .replace(/[‘’]/g, "'")
      .split(/[^a-z0-9']+/)
      .filter(Boolean);
  const terms = (s) => tokenize(String(s ?? ""));

  /**
   * The tell that a message is feedback on something already built, or null.
   *
   * `known` is the target's own words (its caption and its current code) —
   * supplied by the caller so this stays pure. It is only consulted for the
   * definite case, where the question "does 'the button' point at anything
   * here?" is answerable from the build's bytes and nowhere else.
   */
  function iterationTell(message, known = "") {
    const raw = String(message ?? "");
    if (!raw.trim()) return null;
    const toks = forms(raw);
    if (!toks.length) return null;

    // 1. AN INDEFINITE DETERMINER INTRODUCES ITS NOUN, and that decides
    //    outright. "Make me another one with better colours" carries a
    //    complaint and a pointer and is still a demand for a second artifact;
    //    the determiner is what separates it from "make it better", and the
    //    determiner wins. Required to actually determine something — a
    //    trailing "a" with no noun after it introduces nothing.
    for (let i = 0; i < toks.length - 1; i++) {
      if (INDEFINITE_DETERMINERS.has(toks[i])) return null;
    }

    // 2. AN ANAPHORIC PRONOUN POINTS BACK. "it's broken", "make it bigger",
    //    "this is unreadable" — the form itself says the object is already
    //    here, which is the whole of what needs deciding.
    if (toks.some((t) => ANAPHORIC_PRONOUNS.has(t))) return "anaphora";

    // 3. A NEGATED FIRST PERSON IS A JUDGMENT about what is present. "I don't
    //    like the colors" — the subject is the operator, the polarity is
    //    negative, and neither fact needs to know what "like" means.
    const negated = toks.some((t) => NEGATION_WORDS.has(t));
    if (negated && toks.some((t) => FIRST_PERSON.test(t))) return "judgment";
    // A negation with no first person is still a judgment about something
    // present ("the button doesn't work") — the negated thing is the subject,
    // and rule 4 decides whether it is this build's.
    if (negated && definiteHit(toks, known)) return "judgment";

    // 4. A DEFINITE NOUN PHRASE THAT THE BUILD'S OWN BYTES CONTAIN. "fix the
    //    counter" and "the button does nothing" resolve here, against the
    //    artifact rather than against a vocabulary. A definite phrase naming
    //    something the build has never contained is NOT this build's — which
    //    is also why "what does the report say about funding" cannot be
    //    hijacked: the widget's bytes hold no "report".
    if (definiteHit(toks, known)) return "definite-reference";

    return null;
  }

  /** Does a definite determiner in the message govern a word the build's own
   * text actually contains? Both sides through the same fold. */
  function definiteHit(toks, known) {
    const have = new Set(terms(known));
    if (!have.size) return false;
    for (let i = 0; i < toks.length - 1; i++) {
      if (!DEFINITE_DETERMINERS.has(toks[i])) continue;
      // The determiner's noun phrase runs until the next determiner or the
      // end; any content word inside it that the build states is a hit.
      for (let j = i + 1; j < toks.length; j++) {
        if (DEFINITE_DETERMINERS.has(toks[j]) || INDEFINITE_DETERMINERS.has(toks[j])) break;
        if (have.has(toks[j])) return true;
      }
    }
    return false;
  }

  /**
   * The PRE-TURN face of the router: does this message, by itself, point at
   * an existing build? Decided BEFORE any model call, from the operator's
   * words and the builds' own bytes — nothing else exists yet.
   *
   * This is what makes iteration reliable rather than probabilistic. The
   * post-answer route (routeSegment, below) can only route code the model
   * happened to emit — and measured live (gemma2:2b, 2026-08-17), a small
   * model answers a bare complaint in prose as often as not, so the
   * complaint routed nowhere. Deciding first lets the caller run a SIGHTED
   * revision instead: hand the model the target's current code and extract
   * the returned fence mechanically (the /fold door's own machinery —
   * pickRevisionSegment tolerates a dropped language tag, churn is refused
   * by the log, a codeless reply is a typed gap). The model is only the
   * mouth; the routing never depends on its behaviour.
   *
   * `builds` is `[{n, type, lang, text}]` in birth order, code builds only
   * — a complaint cannot revise a table. Returns `{n, tell, trigger}` or
   * null; null means the turn is a question or a demand for something new,
   * and the ordinary path keeps it.
   */
  function routeMessage(message, builds = []) {
    const live = (builds ?? []).filter((b) => b && b.type === "code");
    if (!live.length) return null;

    const named = referencedBuild(message);
    if (named) {
      const target = live.find((b) => b.n === named.n);
      return target ? { n: target.n, tell: "named", trigger: capture(message) } : null;
    }

    for (let i = live.length - 1; i >= 0; i--) {
      const tell = iterationTell(message, live[i].text ?? "");
      if (tell) return { n: live[i].n, tell, trigger: capture(message) };
    }
    return null;
  }

  /**
   * Route one produced segment: onto an existing build's log, or to a new
   * build of its own.
   *
   * `builds` is a projection the caller supplies — `[{n, type, lang, text}]`
   * in birth order, where `text` is that build's own caption and code — so
   * this module never learns the build log's shape. The answer is always one
   * of three typed shapes; there is no "probably", because a maybe would have
   * to be resolved by somebody, and the only somebody available is the model.
   */
  function routeSegment(seg, message, builds = [], { landedThisTurn = [] } = {}) {
    // A TURN IS ONE ACT. Measured live against gemma2:2b (2026-08-17): asked
    // for one counter widget, it answered with five html fences in a single
    // reply — a small model restating itself — and every one opened a build,
    // so one request produced five orphans. Later fences are not more
    // artifacts; they are the model compiling a new whole in the same breath.
    // (Two different KINDS in one turn are still two builds.)
    const already = (landedThisTurn ?? []).find((b) => b && sameKind(b, seg));
    if (already) return { kind: "revise", n: already.n, lang: resolveLang(already, seg), why: "a later block of the same kind in the same turn" };

    const live = (builds ?? []).filter((b) => b && sameKind(b, seg));
    if (!live.length) return { kind: "new", why: "nothing of this kind has been built yet" };

    // The number IS the reference — builds.js's own anchor, reused rather
    // than re-derived. Read out of the OPERATOR's words only: the model
    // naming a build is the model's phrasing, and L5 does not spend trust on
    // phrasing.
    const named = referencedBuild(message);
    if (named) {
      const target = live.find((b) => b.n === named.n);
      if (target) return { kind: "rezero", n: target.n, lang: resolveLang(target, seg), tell: "named", trigger: capture(message) };
      return { kind: "new", why: `build ${named.n} is not a build of this kind` };
    }

    // The present one first — the last of this kind is what "it" points at,
    // which is the rule a conversation already uses. Each candidate is asked
    // against its OWN bytes, newest first, so a definite phrase lands on the
    // build that actually contains it rather than on whichever came last.
    for (let i = live.length - 1; i >= 0; i--) {
      const tell = iterationTell(message, live[i].text ?? "");
      if (tell) return { kind: "rezero", n: live[i].n, lang: resolveLang(live[i], seg), tell, trigger: capture(message) };
    }
    return { kind: "new", why: "the turn's words introduce something, they do not point at something" };
  }

  return Object.freeze({ iterationTell, routeMessage, routeSegment });
}

/** Two names for one runtime — the fold's own RENDERABLE/RUNNERS aliases. */
const LANG_ALIAS = { js: "javascript", node: "javascript", bash: "shell" };
const norm = (l) => {
  const s = String(l ?? "").toLowerCase().trim();
  return LANG_ALIAS[s] ?? s;
};

/**
 * Same kind of artifact? Type must match, and language too — a python script
 * is not a version of an html widget, however the words around it read.
 *
 * The exception is an UNDECLARED language: a bare fence with no tag. Measured
 * live against gemma2:2b (2026-08-17): complained at about a widget, it
 * answered with an untagged fence holding the fix, and a strict match forked
 * that onto a build of its own. Silence is not a declaration of difference.
 * The strict match exists to stop a DECLARED python file from becoming a
 * version of a DECLARED html widget; it was never meant to fork on a gap.
 */
const sameKind = (build, seg) => {
  if (build?.type !== seg?.type) return false;
  if (seg?.type !== "code") return true;
  const a = norm(build.lang);
  const b = norm(seg.lang);
  return !a || !b || a === b;
};

/**
 * The language the landed segment should carry. An undeclared fence adopts
 * the build's own — a widget complained at and answered with a bare fence is
 * still an html widget, and letting the gap blank the declaration would cost
 * it its preview and its .html download.
 */
const resolveLang = (build, seg) => (norm(seg?.lang) ? seg.lang : (build?.lang ?? seg?.lang));

/**
 * The trigger, taken verbatim from the operator and held to a declared budget
 * (builds.js's own BUILD_MESSAGE_MAX — one number, one source). Verbatim
 * matters: the re-zero entry's whole job is to record WHY the ground was
 * conceded, and a paraphrase of the reason is not the reason.
 */
export function capture(message) {
  const flat = String(message ?? "").replace(/\s+/g, " ").trim();
  return flat.length > BUILD_MESSAGE_MAX ? `${flat.slice(0, BUILD_MESSAGE_MAX - 1)}…` : flat;
}

/**
 * SIG · scout — resolve the operator's own term to the byte-span of the
 * projection it names, BEFORE any model call. Attention as an act.
 *
 * The measured failures this narrows (live e2e, 2026-08-17): `ambiguous`
 * finds (the model names bytes that appear on both buttons) and
 * wrong-target hits (a token like "inc" living in markup AND script). An
 * edit only has to be unique within what attention scoped, and the model
 * is only shown the scouted region — a smaller arena for a small model.
 *
 * Same discipline as the router's own tells, deliberately: the term must
 * appear in the code through retrieval's one fold, exactly (no stemmer in
 * this engine, morphology stays unfolded — "the colors" does not resolve
 * against `color:`; the affordance is narrower, never absent). No match →
 * null, and the caller keeps the whole-file rule. The span is mechanical:
 * from the start of the first line holding the term to the end of the
 * last line holding it.
 */
export function scoutSpan(message, code) {
  const text = String(code ?? "");
  if (!text) return null;
  // The fold is NOT length-preserving (NFD + mark-strip shrinks decomposed
  // input), so positions in the folded string may not be positions in the
  // text — P5.2's offset lesson. Fold per character and keep the map back.
  const map = [];
  let folded = "";
  for (let i = 0; i < text.length; i++) {
    const f = foldDiacritics(text[i]).toLowerCase();
    for (const ch of f) {
      folded += ch;
      map.push(i);
    }
  }
  // A term is a WORD the message and the code share — retrieval's own
  // token rule on both sides, never a substring graze ("don", the fragment
  // tokenize cuts from "don't", must not land on "done"). Occurrences are
  // then located with boundary checks for the same reason.
  const codeTokens = new Set(tokenize(text));
  const terms = [...new Set(tokenize(String(message ?? "")))].filter((t) => t.length > 2 && codeTokens.has(t));
  const wordy = (ch) => ch !== undefined && /[a-z0-9_]/.test(ch);
  const placesOf = (term) => {
    const places = [];
    let at = folded.indexOf(term);
    while (at !== -1) {
      if (!wordy(folded[at - 1]) && !wordy(folded[at + term.length])) places.push(at);
      at = folded.indexOf(term, at + 1);
    }
    return places;
  };
  // The most SELECTIVE shared term decides the arena — fewest occurrences,
  // ties to the longer term. "The reset button" scopes by "reset" (one
  // place), never by "button" (every row): a union over every shared word
  // would re-widen the arena the phrase just narrowed.
  let hit = null;
  let hitPlaces = null;
  for (const term of terms) {
    const places = placesOf(term);
    if (!places.length) continue;
    if (
      !hitPlaces ||
      places.length < hitPlaces.length ||
      (places.length === hitPlaces.length && term.length > hit.length)
    ) {
      hit = term;
      hitPlaces = places;
    }
  }
  if (!hitPlaces) return null;
  let a = -1;
  let b = -1;
  for (const at of hitPlaces) {
    const t0 = map[at];
    const t1 = map[at + hit.length - 1] + 1;
    if (a === -1 || t0 < a) a = t0;
    if (t1 > b) b = t1;
  }
  const start = text.lastIndexOf("\n", a) + 1;
  const nl = text.indexOf("\n", b);
  const end = nl === -1 ? text.length : nl;
  return { term: hit, span: [start, end] };
}
