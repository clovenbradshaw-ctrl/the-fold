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
// Morphology folds ONE narrow way: a received inflectional suffix
// (INFLECTIONAL_SUFFIXES, the register's own class, giver lang/en) — "the
// colors" resolves against a build whose bytes say `color:`, "the buttons"
// against `button`. That is the quotient this file is licensed to read;
// there is no stemmer in this engine, and inventing one here (dialect
// spelling, derivational morphology, anything past a received suffix class)
// would be the same mistake at a different altitude. `scoutSpan` shares this
// exact fold with the router (P11: an organ that compares text to text must
// share retrieval's fold), so a term that ROUTES a complaint to a build can
// also SCOPE the edit within it — the two questions read the same bytes.
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
 * Two tokens are forms of one referent when they are identical or differ by
 * a received inflectional suffix — stated language-free (identity under a
 * received variation class; the class carries the language, with its
 * giver). Shared by the router (`iterationTell`, deciding which build a
 * complaint routes to) and `scoutSpan` (deciding which bytes of that build
 * an edit scopes to) — P11: the two questions read the same bytes and must
 * share the same fold, or a term that finds the build fails to find itself
 * inside it. Engine-side placement of this mechanism is named future work;
 * the class it consumes is already the register's.
 */
function sameForm(a, b, suffixes) {
  if (a === b) return true;
  for (const sfx of suffixes) {
    if (a.length > b.length ? a === b + sfx : b === a + sfx) return true;
  }
  return false;
}

/**
 * Strip an html document's own wrapper tags — <!DOCTYPE>, <html>, <head>,
 * <body>, open and close, whatever attributes they carry — never their
 * content. Every html-typed build carries this exact wrapper by
 * construction (P5.3's own container-stripping precedent, applied to this
 * format's boilerplate rather than a corpus's); a token contributed SOLELY
 * by it is common to every such build and can never discriminate one
 * build's content from another's.
 *
 * A SECOND source of the same non-discriminating token, found completing
 * this same measurement live: `known` here is always `caption + "\n" +
 * code` (app.js's `buildWords`), and a caption the operator never renamed
 * defaults to the bare segment language (`defaultCaption`: `seg.lang ||
 * "code"`) — so `known`'s own FIRST LINE is literally "html" for every
 * unrenamed html build, same as the wrapper tags, just arriving through a
 * different field. Stripped only at that exact position (the string's own
 * first line, matching `buildWords`'s own construction) so a real word
 * "html" appearing anywhere in actual content is untouched.
 */
function stripHtmlWrapper(text) {
  return String(text ?? "")
    .replace(/^(?:html|head|body)\s*(?=\n|$)/i, " ")
    .replace(/<!doctype\b[^>]*>/gi, " ")
    .replace(/<\/?(?:html|head|body)\b[^>]*>/gi, " ");
}

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
    ANAPHORIC_PRONOUNS,
    NEGATION_WORDS,
    FIRST_PERSON,
    INFLECTIONAL_SUFFIXES,
  } = priors;

  for (const [name, set] of Object.entries({ ANAPHORIC_PRONOUNS, NEGATION_WORDS, INFLECTIONAL_SUFFIXES })) {
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

    // THE DECISION IS A READING, NOT A WORD-LIST VETO (user direction,
    // 2026-08-17: "no hardcoded list of english articles — it needs to
    // climb the terrain ladder like any arbitrary content; colors and
    // colours point to the same referent"). The earlier rule here let ANY
    // indefinite determiner veto routing, and the brief's own canonical
    // complaint — "I don't like the counter widget, make the buttons
    // bigger with SOME color" — was thereby unroutable. What decides now:
    //
    //   · FORM RESOLUTION. A content word of the message resolves into the
    //     build when the build's own bytes hold the same FORM — identical
    //     through retrieval's fold, or differing by a member of
    //     INFLECTIONAL_SUFFIXES (the register's received morphology class,
    //     giver lang/en): "buttons" resolves against "button", "colors"
    //     against "color:". Identity lives in the quotient; the suffix
    //     class only says which surface differences are ground, not
    //     figure. (Dialect spelling — colour/color — is NOT inflection;
    //     it closes only through a received spelling prior with its own
    //     giver, and until then stays a typed limit, per II.2's "a missing
    //     giver is a wall, never derive".)
    //   · ANAPHORA. "it's broken", "make it bigger" — the pronoun class
    //     is resolution's own pronoun face: the form itself says the
    //     object is already here.
    //   · JUDGMENT is a LABEL on the tell, never the tell itself: negation
    //     plus first person says the operator is judging; what they are
    //     judging still has to resolve.
    const judged = toks.some((t) => NEGATION_WORDS.has(t)) && toks.some((t) => FIRST_PERSON.test(t));
    if (resolvesInto(raw, known)) return judged ? "judgment" : "resolved";
    // The pointer is the more specific fact than the judging of it — a
    // judgment that arrives BY anaphora reports as the anaphor (the
    // earlier doctrine's own line, kept).
    if (toks.some((t) => ANAPHORIC_PRONOUNS.has(t))) return "anaphora";
    return null;
  }

  /** Does any content word of the message resolve into the build's own
   * bytes? Both sides through retrieval's one fold (tokenize — stopwords
   * and short forms drop on both sides), then form identity.
   *
   * `known` is stripped of the html document's own wrapper tags first
   * (P5.3's own precedent — strip container boilerplate, keep the
   * content). Measured live, 2026-08-17: a session with one existing html
   * build (a canvas drawing app) asked "make me a 5-column by 5-row
   * spreadsheet grid in html, with column headers..." — a birth request
   * naming its OUTPUT FORMAT, pointing at nothing the drawing app
   * contains — and it resolved onto the drawing app anyway, because
   * `<!DOCTYPE html><html>...` contributes the token "html" to every
   * single html-typed build's bytes by construction. That token carries
   * zero discriminating signal: it is common to every build of this kind,
   * so it can never be evidence that a message points at THIS one. Only
   * the four wrapper tag names are stripped (doctype/html/head/body,
   * open and close, whatever attributes they carry) — everything nested
   * inside (title text, style rules, real content) is untouched, so a
   * genuine referent living inside <head> or the body is exactly as
   * resolvable as it always was. */
  function resolvesInto(message, known) {
    return matchedTerms(message, known).length > 0;
  }

  /**
   * WHICH of the message's own words actually drove a resolvesInto match —
   * the router's decision, made legible rather than a silent boolean.
   *
   * Found necessary by the SAME live measurement the wrapper/caption fixes
   * came from: two consecutive false-positive routings, through two
   * different channels (raw markup, then the default caption), were each
   * fixed narrowly without ever seeing what the router had actually
   * matched on — and a THIRD routing (this time onto genuinely shared
   * vocabulary: an earlier misrouted turn had already merged a
   * `generateGrid()` using "row"/"col" into the build it was never meant
   * to touch, so the next ask matched on real, if accidental, overlap)
   * would have been diagnosed in seconds instead of by hand-fetching
   * localStorage, if the match evidence had been on the record from the
   * start. This does not fix the underlying category error — `resolvesInto`
   * still compares SPANS (token overlap) where the actual question is
   * about REFERENTS ("is this ask a continuation of what this build is
   * ABOUT"), the same gap P11 already names for prose ("a name is a
   * reference to a referent, never a byte sequence") — it only makes each
   * routing decision legible enough that the next collision is a five-
   * minute read of the record instead of a two-hour reproduction. The
   * referent-level fix (routing through the engine's own cast/referent
   * organs instead of this module's tokenizer) is named, not built, here —
   * see the routing amendment this measurement produced.
   */
  function matchedTerms(message, known) {
    const have = [...new Set(terms(stripHtmlWrapper(known)))];
    if (!have.length) return [];
    const hits = [];
    for (const t of new Set(terms(message))) {
      for (const s of have) {
        if (sameForm(t, s, INFLECTIONAL_SUFFIXES)) {
          hits.push(s === t ? t : `${t}~${s}`);
          break;
        }
      }
    }
    return hits;
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
      if (tell) return { n: live[i].n, tell, trigger: capture(message), ...evidenceOf(tell, message, live[i].text) };
    }
    return null;
  }

  /** The router's own evidence for a routing decision, as a payload ready
   * to ride the record (P3: unrecognized keys ride the fold as payload).
   * Only "resolved"/"judgment" decisions have span evidence to disclose —
   * "named" and "anaphora" are already self-explaining from the tell alone. */
  function evidenceOf(tell, message, known) {
    if (tell !== "resolved" && tell !== "judgment") return {};
    const matchedOn = matchedTerms(message, known ?? "");
    return matchedOn.length ? { matchedOn } : {};
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
      if (tell) return { kind: "rezero", n: live[i].n, lang: resolveLang(live[i], seg), tell, trigger: capture(message), ...evidenceOf(tell, message, live[i].text) };
    }
    return { kind: "new", why: "the turn's words introduce something, they do not point at something" };
  }

  return Object.freeze({ iterationTell, routeMessage, routeSegment, matchedTerms });
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
 * Same discipline as the router's own tells, deliberately, and now the same
 * FOLD too (P11, measured live 2026-08-17: the canonical complaint "make the
 * buttons bigger" routed correctly to the widget that says `button`, then
 * scoped to the wrong span because "buttons" has no exact match in the
 * code — the scout fell back to "widget", a single accidental hit in the
 * `<title>`, and the edit landed there instead of near the buttons). A
 * message term that has no exact match in the code may still resolve
 * through a received inflectional suffix (`suffixes`, the register's own
 * class) — "buttons" resolves against `button` the same way it does for
 * the router.
 *
 * DISCLOSED LIMIT, found the same session and only PARTLY closed here: this
 * function has no model of what a "button" or a "widget" IS — no referent,
 * only byte-occurrence counts (P11's own principle, "a name is a reference
 * to a referent, never a byte sequence," is not yet honored HERE the way
 * cast.js's referent index honors it for prose). Fixing "buttons" → "button"
 * alone was not enough: "widget" (an accidental single hit inside the
 * document's own `<title>`, which names the whole artifact, not any part of
 * it) still out-selects "button" (4 real occurrences, the actual referent of
 * the complaint) on raw rarity. The one exclusion below — `<title>` — is a
 * narrow, disclosed, STRUCTURAL patch (the same class of fix as P5.3's
 * container-stripping: `<title>` is document metadata by the HTML spec
 * itself, never rendered page content, never anything a visual complaint
 * could be about), not a referent model. A real fix needs to know that
 * "widget" names the whole artifact and "button" names two of its parts,
 * and would generalize past this one tag; that is future work, named here
 * rather than smuggled in as if this patch already were it.
 *
 * No match at all → null, and the caller keeps the whole-file rule. The
 * span is mechanical: from the start of the first line holding the term to
 * the end of the last line holding it.
 */
export function scoutSpan(message, code, suffixes) {
  const text = String(code ?? "");
  if (!text) return null;
  if (!(suffixes instanceof Set) || !suffixes.size)
    throw new TypeError("scoutSpan: suffixes must come from the engine's prior register");
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
  // then located with boundary checks for the same reason. A message word
  // with no exact match still resolves if it is the same FORM as a code
  // token (sameForm, shared with the router) — the term used for locating
  // places is always the code's own spelling, since that is what the bytes
  // actually hold.
  const codeTokenList = [...new Set(tokenize(text))];
  const codeTokens = new Set(codeTokenList);
  const terms = [
    ...new Set(
      [...new Set(tokenize(String(message ?? "")))]
        .filter((t) => t.length > 2)
        .map((t) => (codeTokens.has(t) ? t : codeTokenList.find((c) => sameForm(t, c, suffixes))))
        .filter(Boolean),
    ),
  ];
  // <title> is document metadata (HTML's own definition — never rendered
  // page content, never anything a visual complaint names): its bytes are
  // excluded from every term's places, so its own accidental vocabulary
  // ("Counter Widget") cannot out-select the actual referent of a complaint
  // by pure rarity. See the disclosed-limit note above this function.
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(text);
  const titleStart = titleMatch ? titleMatch.index + titleMatch[0].indexOf(titleMatch[1]) : -1;
  const titleEnd = titleMatch ? titleStart + titleMatch[1].length : -1;
  const inTitle = (origIndex) => titleStart >= 0 && origIndex >= titleStart && origIndex < titleEnd;

  const wordy = (ch) => ch !== undefined && /[a-z0-9_]/.test(ch);
  const placesOf = (term) => {
    const places = [];
    let at = folded.indexOf(term);
    while (at !== -1) {
      if (!wordy(folded[at - 1]) && !wordy(folded[at + term.length]) && !inTitle(map[at])) places.push(at);
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

/**
 * The MECHANICAL rung of the edit ladder: when the instruction itself names
 * both ends of a value change, the edit is computed from the operator's own
 * words and the projection's own bytes — no model call at all.
 *
 * The measured need (2026-08-17, live e2e, gemma2:2b): asked to "change the
 * brush size slider's max from 30 to 60" — an ask that NAMES both values —
 * the model rewrote an unrelated event listener and broke the script's
 * syntax. The witness gate refused it (correctly), but a refusal is not an
 * edit: the user's direction is that edits must land easily, reliably, fast,
 * and at scale, a little at a time. For the value-change class, the model
 * was never needed: the instruction holds the old value and the new one,
 * the code holds exactly one of them, and which is which is decided by
 * OCCURRENCE, not by English — the literal the code contains is `from`, the
 * one it lacks is `to`. No preposition list, no phrasing pattern: identity
 * under presence, readable in any word order and any language.
 *
 * The shape is deliberately narrow (the mergeHtmlScript discipline — act
 * only on the unambiguous case, descend otherwise):
 *   · LITERALS are numbers (30, 2.5), hex colors (#2196F3), and quoted
 *     strings — token shapes, not vocabulary.
 *   · Exactly TWO distinct literals in the instruction, exactly ONE of them
 *     present in the code (word-boundary, through the scout's own fold
 *     discipline), the other absent. Anything else — both present, neither,
 *     three literals — is not this rung's case and returns null.
 *   · The present literal must occur exactly ONCE in the arena (`within`
 *     when the scout resolved one, the whole projection otherwise) — an
 *     ambiguous value falls to the model, never to a guess.
 *   · The op's `find` is the whole LINE holding the value (unique context
 *     for applyOps's strict wall), `add` is that line with old → new.
 *
 * Returns `{ops, from, to}` or null. The caller lands it as an ordinary
 * SYN patch — same append-only stack, same witness gate, same record — so
 * a mechanical landing is indistinguishable in the log from any other,
 * except that its reason says no model was asked.
 */
export function literalSwap(instruction, code, { within = null } = {}) {
  const text = String(code ?? "");
  if (!text) return null;
  const ask = String(instruction ?? "");
  // Token shapes, not vocabulary: hex colors first (so #30 is a color, not
  // the number 30), then quoted strings, then bare numbers.
  const LITERAL = /#[0-9a-fA-F]{3,8}\b|"[^"\n]{1,60}"|'[^'\n]{1,60}'|\b\d+(?:\.\d+)?\b/g;
  const seen = [];
  for (const m of ask.match(LITERAL) ?? []) {
    const v = m.replace(/^['"]|['"]$/g, "");
    if (!seen.includes(v)) seen.push(v);
  }
  if (seen.length !== 2) return null;

  const arena = within ? text.slice(within[0], within[1]) : text;
  const wordy = (ch) => ch !== undefined && /[a-z0-9_]/i.test(ch);
  const placesIn = (hay, needle) => {
    const places = [];
    let at = hay.indexOf(needle);
    while (at !== -1) {
      // Word-boundary only where the literal's own edge is wordy — a hex
      // color's "#" is its own edge, a quoted string brings its context.
      const leftOk = !wordy(needle[0]) || !wordy(hay[at - 1]);
      const rightOk = !wordy(needle[needle.length - 1]) || !wordy(hay[at + needle.length]);
      if (leftOk && rightOk) places.push(at);
      at = hay.indexOf(needle, at + 1);
    }
    return places;
  };

  const counts = seen.map((v) => placesIn(arena, v).length);
  // Occurrence decides direction: the value the code holds is what changes,
  // the value it lacks is what it becomes. Both present or both absent is
  // not this rung's case.
  let from = null;
  let to = null;
  if (counts[0] > 0 && counts[1] === 0) [from, to] = seen;
  else if (counts[1] > 0 && counts[0] === 0) [from, to] = [seen[1], seen[0]];
  else return null;
  const places = placesIn(arena, from);
  if (places.length !== 1) return null;

  // The find is the whole line holding the value — unique context for the
  // strict wall, and the line is scoutSpan's own unit of arena.
  const at = places[0] + (within ? within[0] : 0);
  const lineStart = text.lastIndexOf("\n", at) + 1;
  const lineEnd = text.indexOf("\n", at);
  const line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);
  // The line itself must be unique in the projection, and hold the value
  // exactly once — otherwise applyOps would be handed an ambiguity this
  // rung exists to avoid.
  if (text.split(line).length - 1 !== 1 || placesIn(line, from).length !== 1) return null;
  const swapAt = placesIn(line, from)[0];
  const newLine = line.slice(0, swapAt) + to + line.slice(swapAt + from.length);
  return { ops: [{ op: "SYN", find: line, add: newLine }], from, to };
}
