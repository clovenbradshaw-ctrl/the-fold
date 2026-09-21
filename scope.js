// scope.js — the SCOPE slot of a fact, typed mechanically, and the predicate
// for an UNGROUNDED FACT. Pure: no DOM, no IO, no model.
//
// Handles: Clippy (what is in the present: the ambient "now", the referents the
// conversation holds), Kairos (the timing sign: is the claim's interval able to
// reach today), Kelsen (lex posterior: of two dated grounds the later prevails).
//
// WHAT SHAPE A FACT HAS. (jurisdiction, referent, relation, value) — the
// hypergraph edge `subject —relation→ object` — plus a SCOPE (when it holds)
// and a GROUND (bytes + the source's own date). The edge already carries
// exact bytes (`source#start-end`); it carries no scope and the source has no
// date on the claim record. This file types the scope and states when a
// claim with no dated ground is a "gut answer".
//
// SCOPE TYPES, each decided from the sentence's own structure:
//   instant   one calendar anchor (a 4-digit year, an ISO date, "<month> <day>")
//   interval  two anchors or a range, OR a past-tense main verb (a closed
//             interval, even undated: "Shakespeare wrote Hamlet")
//   open-now  a present-tense (or tenseless) predication over an INSTANCE:
//             a proper name, a definite noun phrase whose complement is not a
//             kind, a ranked head (superlative), or the ambient "it" of
//             "what year is it". Its interval is [when it began, now] and it
//             DECAYS: only a source dated inside it can ground it.
//   timeless  a present predication over a KIND: bare / indefinite / mass
//             subject, or a definite noun phrase whose complement is a bare
//             common noun or a number ("the boiling point of water",
//             "the square root of 144").
//   none      no referent at all (chit-chat) or a first/second-person
//             deictic sentence (about the conversation, not the world).
// Nothing here reads "president", "current", "now", "latest": the signals are
// tense morphology, determiners, capitalisation, adpositions, digit shapes and
// the calendar the platform itself parses. Closed grammatical classes arrive
// INJECTED from the engine's prior register (the declaredSlotShape pattern).

export const SCOPE_SCHEMA = "EOScope@1";

// Tense of the CLOSED auxiliary paradigm. Declared, giver lang/en, the same
// standing as priors.js's AUXILIARY_VERBS (which carries no tense: see
// COPULA_PARADIGM_META "tense is not carried" — the gap this closes). Open-
// class verbs get their tense from morphology (see tenseOfToken).
export const AUX_TENSE = Object.freeze({
  am: "present", is: "present", are: "present", "'s": "present", "'re": "present", "'m": "present",
  has: "present", have: "present", does: "present", do: "present",
  was: "past", were: "past", had: "past", did: "past",
  will: "irrealis", shall: "irrealis", would: "irrealis", could: "irrealis", should: "irrealis",
  can: "present", may: "irrealis", might: "irrealis", must: "present",
});
export const AUX_TENSE_META = Object.freeze({ giver: "lang/en", scope: "closed auxiliary paradigm only; open-class tense is read from morphology" });

const YEAR = /^(1[0-9]{3}|20[0-9]{2})$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const words = (s) => String(s ?? "").split(/[^\p{L}\p{N}'’\-–.]+/u).map((w) => w.replace(/^[.\-–]+|[.\-–]+$/g, "")).filter(Boolean);
const lc = (w) => w.toLowerCase();
const isMonth = (w) => /^\p{L}{3,9}\.?$/u.test(w) && !Number.isNaN(Date.parse(`1 ${w} 2000`)) && !Number.isNaN(Date.parse(`${w} 1, 2000`));

function need(priors) {
  const p = priors ?? {};
  for (const k of ["definite", "indefinite", "interrogative", "aux", "pos"]) if (!p[k]) throw new TypeError(`scope: priors.${k} must come from the engine's prior register`);
  return p;
}

/** The dominant part-of-speech tag of a form in the received POS prior, or null. */
export function dominantTag(pos, form) {
  const row = pos(lc(form));
  if (!row) return null;
  let best = null, n = -1;
  for (const [t, c] of Object.entries(row)) if (c > n) { best = t; n = c; }
  return best;
}

/**
 * The tense of one token: closed auxiliaries by the declared paradigm, open-
 * class verbs by morphology (regular -ed whose de-suffixed stem is a known
 * form, or an irregular form the UniMorph prior maps to a different lemma).
 * Returns "past" | "present" | "irrealis" | null (not a finite verb).
 */
export function tenseOfToken(tok, priors) {
  const w = lc(tok);
  if (AUX_TENSE[w]) return AUX_TENSE[w];
  const tag = dominantTag(priors.pos, w);
  if (tag !== "VERB" && tag !== "AUX") return null;
  const lem = priors.lemmasOf ? [...priors.lemmasOf(w)].filter((l) => l !== w) : [];
  if (/(ed)$/.test(w) && lem.some((l) => priors.pos(l))) return "past";
  if (priors.irregular && priors.irregular(w) && !/(s|ing)$/.test(w)) return "past"; // irregular past/participle
  if (/ing$/.test(w)) return null;
  return "present";
}

/** Calendar anchors in a text: [{ kind: "year"|"iso"|"month-day", text }]. */
export function anchorsOf(text) {
  const ws = words(text), out = [];
  for (let i = 0; i < ws.length; i++) {
    const w = ws[i];
    if (ISO.test(w)) { out.push({ kind: "iso", text: w }); continue; }
    if (YEAR.test(w)) { out.push({ kind: "year", text: w }); continue; }
    const m = /^(1[0-9]{3}|20[0-9]{2})[-–](1[0-9]{3}|20[0-9]{2}|[0-9]{2})$/.exec(w);
    if (m) { out.push({ kind: "year", text: m[1] }, { kind: "year", text: m[2], range: true }); continue; }
    if (isMonth(w) && (/^\d{1,2}(st|nd|rd|th)?$/.test(ws[i + 1] ?? "") || YEAR.test(ws[i + 1] ?? ""))) out.push({ kind: "month-day", text: `${w} ${ws[i + 1]}` });
  }
  return out;
}

const cap = (w) => /^\p{Lu}/u.test(w);

/**
 * The referential CLASS of a text's subject matter: how the fact's referent
 * is given. "instance" (a proper name, an uncomplemented / instance-
 * complemented definite phrase, a ranked head, ambient "it"), "kind" (bare,
 * indefinite, kind-complemented, numeric), "deictic" (speaker / addressee),
 * or "none".
 */
export function referentOf(text, priors) {
  const P = need(priors);
  const ws = words(text);
  if (!ws.length) return { cls: "none", why: "empty" };
  const first = lc(ws[0]);
  const wh = P.interrogative.has(first);
  // "how"/"why" ask for a manner or reason, unless "how" opens a DEGREE
  // question ("how many", "how tall": the next word is an adjective/adverb).
  const nextTag = ws[1] ? dominantTag(P.pos, ws[1]) : null;
  const manner = P.mannerReason?.has(first) && !(first === "how" && (nextTag === "ADJ" || nextTag === "ADV"));
  // speaker/addressee deixis anchors the sentence to the conversation's own
  // present ("I can help you", "give me a prompt"), not to a world referent.
  if (ws.some((w) => /^(i|me|my|mine|we|us|our|you|your|yours)$/i.test(w) || /^i['’](m|ll|d|ve)$/i.test(w))) return { cls: "deictic", why: "speaker/addressee deixis" };
  // ranked head: an ADJ-tagged -est form, or "most" before an adjective
  for (let i = 0; i < ws.length; i++) {
    const w = lc(ws[i]);
    if (w.length > 4 && /est$/.test(w) && dominantTag(P.pos, w) === "ADJ") return { cls: "instance", why: "ranked", head: w };
    if (w === "most" && i + 1 < ws.length && dominantTag(P.pos, ws[i + 1]) === "ADJ") return { cls: "instance", why: "ranked", head: w };
  }
  // proper: capitalised, not clause-initial-common. A clause opens after
  // sentence punctuation, a colon, a bullet mark or a line break; its first
  // word is capitalised by position, so it is a name only if the prior says
  // it is not a common word. A word that opens a wh-question is never a name.
  for (const clause of String(text ?? "").split(/[.!?:;\n]+|\*+/)) {
    const cw = words(clause);
    for (let i = 0; i < cw.length; i++) {
      const w = cw[i];
      if (!cap(w) || /^I$/.test(w)) continue;
      if (i === 0) {
        const d = dominantTag(P.pos, w);
        if (d && d !== "PROPN") continue;
      }
      if (dominantTag(P.pos, w) === "PROPN" || i > 0 || !P.pos(lc(w))) return { cls: "instance", why: "proper", head: w };
    }
  }
  // ambient "it": wh + noun + copula + it — "what year is it"
  if (wh && ws.length >= 3 && ws.some((w) => lc(w) === "it") && dominantTag(P.pos, ws[1]) === "NOUN") return { cls: "instance", why: "ambient", head: ws[1] };
  // definite noun phrase: the determiner, then its head, then an optional complement
  const d = ws.findIndex((w) => P.definite.has(lc(w)) && lc(w) === "the");
  if (d !== -1 && d + 1 < ws.length) {
    let j = d + 1;
    const head = [];
    while (j < ws.length && head.length < 3 && !AUX_TENSE[lc(ws[j])] && dominantTag(P.pos, ws[j]) !== "ADP" && !P.interrogative.has(lc(ws[j]))) { head.push(ws[j]); j++; }
    const adp = j < ws.length && dominantTag(P.pos, ws[j]) === "ADP" ? j : -1;
    if (adp === -1) return { cls: "instance", why: "definite-unanchored", head: head.join(" ") };
    const c = adp + 1 < ws.length ? ws[adp + 1] : null;
    if (!c) return { cls: "instance", why: "definite-unanchored", head: head.join(" ") };
    // a complement is a KIND only when the received prior knows it as a common
    // word; an unknown form (lowercase "openai") is a name, the OOV=name rule.
    const ct = dominantTag(P.pos, c), knownCommon = ct != null && ct !== "PROPN", numeric = /^\d/.test(c);
    if (P.definite.has(lc(c)) || cap(c) || (!knownCommon && !numeric)) return { cls: "instance", why: "definite-instance-complement", head: head.join(" ") };
    return { cls: "kind", why: "definite-kind-complement", head: head.join(" ") };
  }
  return { cls: manner ? "none" : "kind", why: P.indefinite.has(ws.find((w) => P.indefinite.has(lc(w))) ?? "") ? "indefinite" : "bare" };
}

/** The main-verb tense of a text: the first finite verb, or null. */
export function tenseOf(text, priors) {
  const P = need(priors);
  for (const w of words(text)) {
    if (/^\p{Lu}/u.test(w) && words(text)[0] !== w) continue;
    const t = tenseOfToken(w, P);
    if (t) return t;
  }
  return null;
}

/**
 * The scope of ONE text (a question or a sentence).
 * @returns {{schema, type, tense, referent, anchors, closed}}
 *   type: "instant" | "interval" | "open-now" | "timeless" | "none"
 */
export function scopeOf(text, { priors } = {}) {
  const P = need(priors);
  const referent = referentOf(text, P);
  const anchors = anchorsOf(text);
  const tense = tenseOf(text, P);
  let type;
  // no predication (no finite verb, no wh-slot, no anchor) is not a fact: "hi there", "thanks a lot"
  const asks = P.interrogative.has(lc(words(text)[0] ?? ""));
  if (referent.cls === "none" || referent.cls === "deictic" || (tense == null && !asks && !anchors.length)) type = "none";
  else if (anchors.length >= 2 || anchors.some((a) => a.range)) type = "interval";
  else if (anchors.length === 1) type = "instant";
  else if (tense === "past") type = "interval";
  else if (tense === "irrealis") type = "none";
  else if (referent.cls === "kind") type = "timeless";
  else type = "open-now"; // instance + present/tenseless + no anchor
  return { schema: SCOPE_SCHEMA, type, tense, referent, anchors, closed: type === "instant" || type === "interval" };
}

const dateOf = (g) => { const t = Date.parse(g?.date ?? g?.pubDate ?? ""); return Number.isNaN(t) ? null : t; };

/**
 * KELSEN — of several grounds for one claim the LATER dated one prevails
 * (lex posterior); an undated ground never outranks a dated one, and never
 * counts as dated. Returns the standing ground or null.
 */
export function standingGround(grounds = []) {
  const dated = (grounds ?? []).filter((g) => dateOf(g) != null).sort((a, b) => dateOf(b) - dateOf(a));
  return dated[0] ?? null;
}

/**
 * THE PREDICATE. A claim is an UNGROUNDED FACT iff it asserts about the world
 * (its scope is not `none`), the scope asked is open-now, and no ground for it
 * carries a date. Timeless, dated-past and chit-chat never fire: a closed
 * interval is a record, a kind is a definition, and neither decays.
 *
 * The scope asked is the QUESTION's when the question is a fact-seeking
 * referent-bearing one; the sentence's own otherwise. The answer contributes
 * what the question cannot: its own anchors (a dated answer to an open-now
 * question is still uncovered — its interval ends before now: `stale`).
 *
 * @param {{question?:string, sentence:string, grounds?:object[], now?:Date, priors:object}} a
 */
export function ungroundedFact({ question = "", sentence = "", grounds = [], now = new Date(), priors } = {}) {
  const q = question ? scopeOf(question, { priors }) : null;
  const s = sentence ? scopeOf(sentence, { priors }) : null;
  const asked = q && q.type !== "none" ? q : (s ?? q);
  const claimed = s ?? asked;
  const stand = standingGround(grounds);
  const worldly = asked && asked.type !== "none";
  const open = worldly && asked.type === "open-now";
  const stale = !!(open && claimed && claimed.closed);
  const fires = open && !stand;
  return {
    fires,
    asked: asked?.type ?? "none", claimed: claimed?.type ?? "none",
    stale,
    ground: stand ? { ref: stand.ref ?? null, date: stand.date ?? stand.pubDate, ageDays: Math.round((now.getTime() - dateOf(stand)) / 864e5) } : null,
    why: !worldly ? "no world referent" : !open ? `scope ${asked.type}` : stand ? "dated ground" : "open-now scope with no dated ground",
    detail: { question: q, sentence: s },
  };
}

/** The plain words the composition seam appends. Information, never a refusal (P186). */
export function uncheckedLine({ now = new Date(), jurisdiction = null } = {}) {
  const day = now.toISOString().slice(0, 10);
  const j = jurisdiction?.jurisdiction && jurisdiction.assumed ? `Taking this to mean ${jurisdiction.jurisdiction}, as of ${day}: ` : `As of ${day}: `;
  return `${j}nothing I found backed this up, so treat it as unchecked.`;
}

/**
 * CLIPPY — the jurisdiction implicit in a question, resolved by salience over
 * the conversation's present (the holograph's referents, weighted by what the
 * turns asked and said). CONTRACT (stub-compatible):
 *   resolveJurisdiction(question, present, { isJurisdiction, locale })
 *     -> { jurisdiction: string|null, confidence: number in [0,1], assumed: boolean }
 * `present` is a holographOf() model (`referents[]` with `name`, `weight`).
 * `isJurisdiction(name)` is INJECTED (the index's kind of the referent: a
 * polity/place; Wikidata instance-of via wikidata.js) — absent, only a name
 * the question itself carries can resolve. `confidence` is the top referent's
 * share of the candidates' weight (a ratio, never a cut); `assumed` is true
 * whenever the question did not name the jurisdiction itself, so the answer
 * must state it. `locale` is the deployment's own default, used last.
 */
export function resolveJurisdiction(question, present, { isJurisdiction = null, locale = null } = {}) {
  const q = ` ${String(question ?? "").toLowerCase()} `;
  const cands = (present?.referents ?? []).filter((r) => typeof isJurisdiction === "function" && isJurisdiction(r.name));
  const named = cands.find((r) => q.includes(` ${String(r.name).toLowerCase()} `) || q.includes(` ${String(r.name).toLowerCase()}?`));
  if (named) return { jurisdiction: named.name, confidence: 1, assumed: false };
  if (cands.length) {
    const total = cands.reduce((n, r) => n + (r.weight || 0), 0) || 1;
    const top = cands[0];
    return { jurisdiction: top.name, confidence: (top.weight || 0) / total, assumed: true };
  }
  if (locale) return { jurisdiction: locale, confidence: 0, assumed: true };
  return { jurisdiction: null, confidence: 0, assumed: true };
}

/**
 * THE INTENT PAIR, read BEFORE the draw. Every turn carries two: what the
 * person is trying to do, and the act the system's reply will perform. Both
 * are typed from the QUESTION's structure alone (never the answer):
 *   person: "ask" (interrogative / question mark) | "tell" (declarative
 *           predication) | "acknowledge" (no predication: greeting, thanks)
 *   system: "assert" (the reply will be a DEF of a worldly fact) | "acknowledge"
 * The gate is a function of the pair and the resolved scope:
 *   assert + open-now  -> S2, ground first (declared preflight aimed at the
 *                         resolved jurisdiction); the draw is handed the result
 *   assert + other     -> S1 stands; the post-draw predicate remains the backstop
 *   acknowledge        -> S1 untouched
 * The post-draw `ungroundedFact` on the question+answer pair stays as backstop.
 */
export function intentPair(question, { priors, present = null, isJurisdiction = null, locale = null, now = new Date() } = {}) {
  const P = need(priors);
  const q = String(question ?? "");
  const s = scopeOf(q, { priors: P });
  const asks = /\?\s*$/.test(q) || P.interrogative.has(lc(words(q)[0] ?? ""));
  const person = s.type === "none" && !asks ? "acknowledge" : asks ? "ask" : "tell";
  const system = s.type === "none" || s.type === "timeless" && person !== "ask" ? "acknowledge" : "assert";
  const ground = system === "assert" && s.type === "open-now";
  const jurisdiction = ground ? resolveJurisdiction(q, present, { isJurisdiction, locale }) : null;
  return {
    person, system, scope: s.type,
    tier: ground ? "S2" : "S1",
    action: ground ? "ground-first" : system === "assert" ? "draw-then-check" : "draw",
    jurisdiction, asOf: now.toISOString().slice(0, 10),
    scopeDetail: s,
  };
}

/**
 * The readings as internal NOTES (native/kernel/notes.js shape: end1 —label→ end2
 * + witness). The reader is the witness (`self:reader~scope-v1`); nothing here
 * is a claim about the world. A later global-workspace competition selects
 * which of these is broadcast; this contract only says what is recorded.
 */
export function intentNotes(turn, pair) {
  const w = "self:reader~scope-v1";
  const at = `turn:${turn}`;
  const out = [
    { end1: at, label: "person-intends", end2: pair.person, witness: w },
    { end1: at, label: "system-intends", end2: pair.system, witness: w },
    { end1: at, label: "scope-of-ask", end2: pair.scope, witness: w },
    { end1: at, label: "routes-to", end2: pair.tier, witness: w },
  ];
  if (pair.jurisdiction) out.push({ end1: at, label: "assumes-jurisdiction", end2: pair.jurisdiction.jurisdiction ?? "unresolved", witness: w });
  return out;
}
