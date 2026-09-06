// correction.js — a wrong answer is corrected AT ANY LEVEL (P125), and the
// premise a question smuggles in is checked before the mouth ever sees it.
//
// User direction (2026-09-05): "wire it up so wrong answers get corrected at
// any level … we don't need a system that's always right, but we do need one
// that is actively learning to get better."
//
// Until this file, the only self-correction in the instrument was P122's, and
// it ran ONLY for a piece's section. A plain turn drafted, was marked, and
// stood — measured live in the long-stream run (S77): asked "Earlier we
// established from POLICIES.md that: `EFFECT_READS_THE_Sherman_RUN` is the
// named export that states it", gemma2:2b answered "You're right, we
// established that…" and confabulated a meaning for a token the material
// never contains. Nothing checked the QUESTION.
//
// Two acts, both mechanical, neither a prompt asking the model to be careful
// (the model is just the mouth — compute it outside, hand back the result):
//
//   1. THE PREMISE CHECK, before drafting. A question that asserts something
//      as already established carries claims. Their atoms are looked for in
//      the material the same way a drafted sentence's are (P122's company
//      rule). An atom in no passage is an unverified premise; a passage that
//      shares the premise's words and carries a DIFFERENT value is a
//      contradiction with an address. Both are handed to the model as FACTS
//      about what the sources say — never as an instruction to be skeptical.
//   2. THE ANSWER CHECK, after drafting. The same atoms-against-snips check
//      P122 runs for a section, run for any turn with passages, with the
//      same gate: a rewrite lands only when its own atoms clear the check.
//
// PURE: no model call of its own, no I/O. `correctTurn` takes the call it is
// given and spends exactly the rounds it is handed.
import { snipsFor, snipBlock, checkSection, checkSentence, reviseAsk, applyRewrite, atomsOf as atomsOfText } from "./snip-check.js";
import { CLAIM_STOPWORDS } from "./grounding.js";
import { namesIn } from "./ground-ladder.js";

const fold = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const contentWords = (t) => [...new Set(fold(t).split(/[^\p{L}\p{N}_]+/u))].filter((w) => w.length > 3 && !CLAIM_STOPWORDS.has(w));

/** The phrasings by which a question hands over a claim as already settled —
 * measured off the live run and the ordinary ways people talk. The trigger is
 * found first, then the claim it introduces: the quoted span that follows it,
 * or the `that …` clause when nothing is quoted. Splitting it this way is why
 * "Earlier we established from POLICIES.md that: …" is caught — an earlier
 * draft's one-shot regexes excluded the dot in a filename and matched nothing. */
const TRIGGER_RE = /\b(?:(?:earlier|previously|before|already)\b[^"“]{0,60}?)?\b(?:we|you|i)\b\s+(?:had\s+)?(?:established|agreed|confirmed|said|told me|showed|determined)\b/gi;
const ACCORDING_RE = /\baccording to\b[^"“]{0,80}?/gi;
const QUOTED_RE = /["“]([^"”]{12,400})["”]/;
const THAT_RE = /^[^"“]{0,40}?\bthat\b[:,]?\s+([^"“.?!]{12,400})/i;
const WINDOW = 160;

/**
 * premisesOf(question) → [{ text, how }]
 * What the question asserts as already true. A question that asserts nothing
 * returns [] and every caller stays byte-identical to before this existed.
 */
export function premisesOf(question) {
  const q = String(question ?? "");
  const out = [];
  const seen = new Set();
  const take = (text, how) => {
    const t = String(text ?? "").trim().replace(/[.,;:]+$/, "");
    const key = fold(t);
    if (t.length < 12 || seen.has(key)) return;
    seen.add(key);
    out.push({ text: t, how });
  };
  for (const re of [TRIGGER_RE, ACCORDING_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(q))) {
      const after = q.slice(m.index + m[0].length, m.index + m[0].length + WINDOW);
      const quoted = after.match(QUOTED_RE);
      if (quoted) { take(quoted[1], "asserted as established"); continue; }
      const clause = after.match(THAT_RE);
      if (clause) take(clause[1], "asserted as established");
    }
  }
  return out;
}

/**
 * checkPremises(question, passages, { terms }) → { premises: [...], unverified, contradicted }
 * Each premise's atoms looked for in the material — the same containment with
 * company P122 uses, over snips built from the passages the turn actually has.
 */
export function checkPremises(question, passages = [], { terms = [], cited = null, referentIndexFor = null } = {}) {
  const premises = premisesOf(question);
  if (!premises.length) return { premises: [], unverified: [], contradicted: [], snips: 0 };
  const needles = [...new Set(premises.flatMap((p) => contentWords(p.text)))];
  // A TOKEN IS SCOPED TO THE SOURCE IT IS CLAIMED OF (P135). "Does this token
  // exist in the corpus" was never the question; "does it belong in THIS
  // source's passage" is. Measured live (2026-09-06): a probe planted
  // "Kutúzov" into a Lincoln-article sentence and every check passed it,
  // because Kutúzov is unquestionably in the corpus — he is in War and Peace.
  // Vienna, Army and Berry failed the same way. When the question names its
  // source, only that source's passages can answer for it.
  const inScope = cited ? passages.filter((p) => String(p?.ref ?? p?.source ?? "").includes(cited)) : passages;
  const snips = snipsFor(inScope.length ? inScope : passages, { obligations: needles, terms });
  const scoped = inScope.length ? inScope : passages;
  const rows = premises.map((p) => {
    const c = checkSentence(p.text, snips);
    // THE REFERENT READING (P135), where the cast can be read: a name the
    // cited passage's own cast does not establish is `beyond-reach` — the
    // claim is about someone that passage never introduces — and that is a
    // finding of a different and better kind than a missing substring.
    const ref = referentIndexFor ? premiseReferents(p.text, scoped, { referentIndexFor }) : { unresolved: [], reached: false };
    return { ...p, atoms: c.atoms, flags: c.flags, contradiction: c.contradiction, supported: c.supported, beyondReach: ref.reached ? ref.unresolved : [], castReached: ref.reached };
  });
  return {
    premises: rows,
    unverified: rows.filter((r) => (r.flags.length || r.beyondReach.length) && !r.contradiction),
    contradicted: rows.filter((r) => r.contradiction),
    snips: snips.length,
    snipRows: snips,
  };
}

/**
 * premiseReferents(premise, passages, { referentIndexFor }) →
 *   { names, unresolved, resolved }
 *
 * THE CHECK IS ABOUT REFERENTS, NOT SPANS (P135). Whether a string occurs in
 * a byte range is the wrong question twice over: a name can occur in the
 * material and name someone else, and a referent can be established under a
 * surface the claim does not use. What the claim asserts is about a PERSON,
 * A PLACE, A THING — and the question is whether the cited passage's own cast
 * establishes that one.
 *
 * Measured live (2026-09-06): a probe planted "Kutúzov" into a sentence of
 * the Lincoln article. Every containment check passed, because Kutúzov is
 * unquestionably in the corpus — he is in War and Peace, a different work
 * entirely. Scoping the STRING to the cited file helps, but it is still the
 * wrong quantity: it would equally pass a name that happens to appear in the
 * file while naming nobody the passage establishes.
 *
 * The right reading is the one this instrument already has an organ and a
 * name for. `makeReferentIndex` builds the cast the material's own text
 * establishes; a name that resolves to no referent there is THE-NULL-STATES'
 * `beyond-reach` — "the subject resolves to no referent, nothing to mark it
 * on" (SIG·Figure) — which is a typed finding, not a missing substring.
 */
export function premiseReferents(premise, passages = [], { referentIndexFor } = {}) {
  const names = namesIn(String(premise ?? ""));
  if (!names.length || typeof referentIndexFor !== "function" || !passages.length) return { names, unresolved: [], resolved: [], reached: false };
  let index;
  try { index = referentIndexFor(passages); } catch { return { names, unresolved: [], resolved: [], reached: false }; }
  if (!index || typeof index.resolve !== "function") return { names, unresolved: [], resolved: [], reached: false };
  const unresolved = [];
  const resolved = [];
  for (const n of names) {
    let ids;
    try { ids = index.resolve(n); } catch { ids = null; }
    // A cast that could not be read reaches nothing, and an unreachable
    // search is never a finding about the world (the standing line).
    if (!ids) continue;
    (ids.size ? resolved : unresolved).push(n);
  }
  return { names, unresolved, resolved, reached: true };
}

/**
 * premiseFacts(check) → what the sources DO say, and nothing else.
 *
 * NEVER THE FALSE CLAIM ITSELF (P126's rule, applied here too — it was missed
 * in this file for a day and the miss was measured). An earlier draft wrote
 * `Nothing in the passages contains "Durham", so "<the whole false claim>" is
 * not something the sources establish`, quoting the falsehood back at the
 * mouth. Live (S77 run 5, turn 15) the mouth then explained it at length and
 * invented a "Durham investigation" to explain. Repeating a falsehood in
 * order to deny it hands a small model the falsehood.
 *
 * So this block carries only positives: the source's own sentence where it
 * speaks of the same thing, or — when there is nothing to put in its place —
 * one short line naming ONLY the value the sources do not use. The claim is
 * never restated, and the enforcement is not here at all: `premiseGuard`
 * below keeps the absent values and the draft is checked against them.
 */
export function premiseFacts(check) {
  if (!check?.premises?.length) return "";
  const lines = [];
  const seen = new Set();
  for (const r of check.premises) {
    if (r.contradiction) {
      const t = r.contradiction.text.replace(/\s+/g, " ").trim();
      const key = fold(t);
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(`- ${t} [${r.contradiction.ref}#${r.contradiction.start}-${r.contradiction.end}]`);
    }
  }
  const absent = [...new Set(check.premises.flatMap((r) => (r.contradiction ? [] : r.flags.map((f) => f.value))))];
  const strangers = [...new Set(check.premises.flatMap((r) => r.beyondReach ?? []))];
  const parts = [];
  if (lines.length) parts.push(`What these sources say about it:\n${lines.join("\n")}`);
  if (strangers.length) parts.push(`${strangers.map((v) => `"${v}"`).join(", ")} ${strangers.length === 1 ? "is not someone or something" : "are not people or things"} this passage introduces at all.`);
  // A name already reported as someone this passage does not introduce is not
  // reported a second time as a missing string — the referent reading is the
  // better one and it supersedes.
  const onlyAbsent = absent.filter((v) => !strangers.includes(v));
  if (onlyAbsent.length) parts.push(`These sources do not use ${onlyAbsent.map((v) => `"${v}"`).join(", ")} anywhere. There is nothing here to describe under that name.`);
  return parts.join("\n\n");
}

/**
 * premiseGuard(check) → the values the question asserted that the material
 * does not carry. The instrument keeps these and checks the DRAFT against
 * them; they are the enforcement the prompt is not asked to provide.
 */
export function premiseGuard(check) {
  if (!check?.premises?.length) return [];
  return [...new Set(check.premises.flatMap((r) => (r.contradiction ? [] : [...r.flags.map((f) => f.value), ...(r.beyondReach ?? [])])))]
    .filter(Boolean)
    .map((value) => ({ value, fold: fold(value) }));
}

/**
 * repeatsAbsentPremise(sentence, guards) → the guard a sentence repeats, or
 * null. A sentence that asserts the very token the sources lack is the
 * capitulation this whole check exists to stop, so it does not ship.
 */
export function repeatsAbsentPremise(sentence, guards = []) {
  const f = fold(sentence);
  return guards.find((g) => g.fold && f.includes(g.fold)) ?? null;
}

/**
 * correctTurn({ text, passages, question, call, messages, splitSentences, rounds, maxTokens, streaming })
 *   → { text, check, outcomes, asked, before, after }
 * P122's check and rewrite, for ANY turn. Byte-identical to no-op when there
 * are no passages, no snips, or no flags.
 */
export async function correctTurn({ text, passages = [], question = "", terms = [], call = null, messages = [], splitSentences, rounds = 1, maxTokens = 512, streaming = {}, onRewrite = null }) {
  const body = String(text ?? "");
  if (!body.trim() || !passages.length || typeof splitSentences !== "function") return { text: body, check: null, outcomes: [], asked: 0 };
  const snips = snipsFor(passages, { obligations: contentWords(question), terms });
  if (!snips.length) return { text: body, check: null, outcomes: [], asked: 0 };
  const before = checkSection(splitSentences(body), snips);
  let out = body;
  const outcomes = [];
  let asked = 0;
  let standing = before.flagged;
  let lastReply = null;
  while (asked < rounds && standing.length && typeof call === "function") {
    asked += 1;
    let reply;
    try { reply = await call([...messages, { role: "assistant", content: out }, { role: "user", content: reviseAsk(standing, snips) }], { effort: "low", maxTokens, ...streaming }); }
    catch (e) { outcomes.push({ outcome: "refused", because: `the rewrite ask failed: ${String(e?.message ?? e).slice(0, 120)}`, round: asked }); break; }
    const applied = applyRewrite(out, standing, reply, snips);
    outcomes.push(...applied.outcomes.map((o) => ({ ...o, round: asked })));
    const moved = applied.outcomes.some((o) => o.outcome === "rewritten" || o.outcome === "dropped");
    if (moved && applied.text && applied.text !== out) { out = applied.text; onRewrite?.(applied.outcomes.filter((o) => o.outcome === "rewritten" || o.outcome === "dropped")); }
    standing = checkSection(splitSentences(out), snips).flagged;
    if (String(reply ?? "") === lastReply) break;
    lastReply = String(reply ?? "");
  }
  const after = checkSection(splitSentences(out), snips);
  return {
    text: out, asked, outcomes,
    check: { snips: snips.length, atoms: before.atoms, supported: before.supported, flagged: before.flagged.length, after: { flagged: after.flagged.length, supported: after.supported, atoms: after.atoms }, flags: after.flagged.map((r) => ({ sentence: r.sentence, flags: r.flags.map((f) => ({ kind: f.kind, value: f.value, reason: f.reason })), contradiction: r.contradiction ? { ref: r.contradiction.ref, start: r.contradiction.start, end: r.contradiction.end, snipYears: r.contradiction.snipYears } : null })) },
    before, after,
  };
}


// ── THE MOUTH NARRATING ITS OWN PROCESS (P127) ──────────────────────────────
// Measured all through the long-stream run: answers that open "## Identify
// the passage", "This analysis focuses on a passage from the `holon.js`
// file", "Let's break down the code and understand its purpose" — the model
// describing the act of answering instead of answering. `cutMetaTalk` cannot
// see this: it matches the PIECE's own instruction vocabulary, and none of
// these words are in it.
//
// The cut is deliberately narrow, because the two things it must not touch
// are the two that matter most:
//   * A STATED ABSENCE stays. "The sources do not contain a passage about
//     Scheria" is a finding (THE-NULL-STATES, law 3), not scaffolding.
//   * ANYTHING CARRYING CONTENT stays. A sentence with a name, a number, or
//     a word the material itself uses is answering, whatever it sounds like.
// So a sentence goes only when it is process narration AND says nothing about
// the material at all.
const HEADING_RE = /^\s*(?:#{1,6}\s|\*\*[^*]+\*\*\s*:?\s*$|\d+\.\s*\*\*)/;
const PROCESS_RE = /^\s*(?:let(?:'|’)?s\b|let me\b|i(?:'|’)?(?:ll|m|d|ve)\b|i \w+\b|we(?:'|’)?(?:ll|re|ve)\b|here(?:'|’)?s\b|this (?:analysis|passage|section|code|snippet|document|text|response|answer|breakdown)\b|the (?:following|passage|snippet|code) (?:is|describes|shows|focuses)\b|to (?:answer|summarize|understand|break)\b|in (?:short|summary|conclusion)\b|first,|next,|finally,|okay|sure|certainly)/i;
const KEEPS_RE = /\b(?:do(?:es)?n['’]t|do(?:es)? not|cannot|can['’]t|no|none|nothing|not)\b[^.]{0,60}\b(?:contain|mention|say|state|include|provide|appear|find|specify|indicate|give|exist)/i;

/**
 * cutProcessTalk(text, { materialText, splitSentences }) → { text, cut }
 * Sentences that narrate the answering and say nothing about the material.
 */
export function cutProcessTalk(text, { materialText = "", splitSentences }) {
  if (typeof splitSentences !== "function") return { text: String(text ?? ""), cut: [] };
  const material = new Set(contentWords(materialText));
  const cut = [];
  const kept = [];
  for (const raw of splitSentences(String(text ?? ""))) {
    const sent = String(raw?.text ?? raw ?? "");
    if (!sent.trim()) continue;
    const shape = HEADING_RE.test(sent) || PROCESS_RE.test(sent);
    if (!shape) { kept.push(sent); continue; }
    if (KEEPS_RE.test(sent)) { kept.push(sent); continue; }              // a stated absence is a finding
    if (atomsOfText(sent).length) { kept.push(sent); continue; }          // carries a name, number or date
    if (contentWords(sent).some((w) => material.has(w))) { kept.push(sent); continue; } // speaks the material's own words
    cut.push(sent);
  }
  if (!cut.length || !kept.length) return { text: String(text ?? ""), cut: kept.length ? cut : [] };
  return { text: kept.join(" ").replace(/\s{2,}/g, " ").trim(), cut };
}

/** The snips a turn stands on, as the block handed above its material (P122's, for any turn). */
export function turnSnipBlock(passages, question, terms = []) {
  const snips = snipsFor(passages, { obligations: contentWords(question), terms });
  return snips.length ? snipBlock(snips) : "";
}
