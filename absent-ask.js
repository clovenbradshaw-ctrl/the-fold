// absent-ask.js — the question asks for a RELATION the material never states.
//
// Canon typing (backstage): the declaration of the absence is SIG·Ground (an
// absence named as a settleable question); its false-fire measurement is
// NUL·Ground (measured against a broken nothing — a null, never a threshold);
// what the mouth does when it fabricates instead is INS·Figure (a Figure
// brought into being with no Ground under it). This file is the first.
//
// WHAT WAS WRONG, measured 2026-09-19 through the real organs (void-brief.js
// over the Vellmar battery): the existing declaration reads a noun-phrase
// slot, so "Who designed the Vellmar bridge?" declares the slot "vellmar
// bridge" (the ANCHOR mistaken for the slot) and "How much did the bridge cost
// to build?" declares nothing at all (declaredSlotShape refuses every how/why
// question outright). Both declarations, where they exist, land on the ledger
// and the panel only: nothing in app.js hands them to the mouth (the mouth's
// only doors are answerShape — seek fillers — and searchedVoid, which is
// FLAT-CHAT-only and fires only when a web search came back empty). So the
// mouth is told "if the answer is not there, say so" and nothing tells it that
// THIS answer is not there.
//
// WHAT THIS DECLARES, mechanically: the question's asked RELATION is a
// verb-capable content word (received UD POS prior: VERB attested, and the
// form's top class is VERB or NOUN — an AUX/ADP/DET is furniture). The
// relation is ABSENT when no token in the material is the same act
// (the engine's own morphology organ, UniMorph, via `sameForm`). It is only
// a void when the question is ABOUT something the material does hold: at
// least one other content word IS attested (else the material is simply the
// wrong material — UNRETRIEVED territory, not this). No list of "cost"/
// "design"; no threshold; the wh-word plays no part.
//
// KNOWN LIMIT, not smoothed over: surface absence is not semantic absence.
// "Who headed the ceremony?" against "…led by…" has no attested `head` and
// would fire. The measured false-fire rate on paraphrase is reported in the
// patch note; the fact handed over is worded as what the words DO NOT say,
// so a paraphrase false-fire degrades to a hedge, not a fabrication.
//
// The line is INFORMATION, in the void prefixes' posture (holon.js
// SEARCHED_VOID_PREFIX): the emptiness is real. It is fed through the same
// door as seek fillers (`answerShape`), never as a prohibition.

const tok = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/['’]s\b/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

/**
 * @param {string} question
 * @param {string[]} texts the live material's own text (every passage, not only the retrieved few)
 * @param {object} organs injected, never assumed
 *   closed:   Set<string> — closed classes (determiners, interrogatives, anaphora, stopwords)
 *   classesOf:(word)=>Array<{upos,share}>|null — the POS prior's candidates (wordclass.js::classifyWord)
 *   sameForm: (a,b)=>boolean — the morphology organ's sameAct
 *   verbForms:Set<string>|null — UniMorph verb surface forms, the witness for a word the POS prior has never seen
 *   interrogatives: Map<string,string> — priors.js::INTERROGATIVE_PRONOUNS (who→person, …)
 *   sentencesOf:(text)=>string[], atomsIn:(sentence)=>[{kind,text,start,end}] — grounding.js splitSentences / extractAtoms
 * @returns {null | {absent: string[], anchors: string[], line: string}}
 */
// A name that touches a figure ("4 March", "November 2030") is a date, not a
// being — read from the sentence's own layout, not from a month list.
const beingsIn = (sent, atomsIn) =>
  atomsIn(sent)
    .filter((a) => a.kind === "name" && !/\d\s*$/.test(sent.slice(0, a.start)) && !/^\s*\d/.test(sent.slice(a.end)))
    .map((a) => a.text);
const matArrHas = (words, a, sameForm) => [...words].some((m) => sameForm(a, m));

export function absentAsk(question, texts, { closed, classesOf, sameForm, verbForms = null, interrogatives = null, sentencesOf = null, atomsIn = null } = {}) {
  if (!(closed instanceof Set) || typeof classesOf !== "function" || typeof sameForm !== "function") return null;
  const q = tok(question).filter((t) => t.length > 2 && !closed.has(t));
  if (!q.length) return null;
  const mat = new Set();
  for (const t of texts ?? []) for (const w of tok(t)) mat.add(w);
  if (!mat.size) return null;
  const matArr = [...mat];
  const attested = (w) => mat.has(w) || matArr.some((m) => sameForm(w, m));
  const isRelation = (w) => {
    const c = classesOf(w);
    // A form the prior has never seen: the received verb lexicon is the witness.
    if (!c?.length) return Boolean(verbForms?.has(w));
    const top = c[0].upos;
    return (top === "VERB" || top === "NOUN") && c.some((x) => x.upos === "VERB" && x.share > 0);
  };
  const anchors = [], absent = [];
  for (const w of new Set(q)) {
    if (attested(w)) anchors.push(w);
    else if (isRelation(w)) absent.push(w);
  }
  if (!absent.length || !anchors.length) return null;
  // THE ASKED TYPE'S OWN WITNESS (person only): a "who" question whose relation
  // word is unattested is still answerable when a sentence that holds the
  // question's anchors also names a being other than the anchors — "Who headed
  // the … ceremony?" against "The … ceremony was led by … Ines Okafor". The
  // type comes from the engine's own interrogative class, never a word list;
  // quantity/time/place are not tested this way because a bare number or date
  // sits in nearly every sentence and would silence every void (measured).
  const asked = interrogatives?.get(tok(question)[0]) ?? null;
  if (asked === "person" && sentencesOf && atomsIn) {
    const skip = new Set([...tok(question)]);
    for (const t of texts ?? []) for (const sent of sentencesOf(t)) {
      const words = new Set(tok(sent));
      if (!anchors.some((a) => words.has(a) || matArrHas(words, a, sameForm))) continue;
      if (beingsIn(sent, atomsIn).some((n) => tok(n).some((w) => !skip.has(w)))) return null;
    }
  }
  const said = absent.map((w) => `"${w}"`).join(" and ");
  return {
    absent,
    anchors,
    line: `Nothing you were given says anything about ${said} in connection with this question. That emptiness is real; the answer to it is not written anywhere you can see.`,
  };
}
