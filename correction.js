// correction.js — a wrong answer is corrected AT ANY LEVEL (P122), and the
// premise a question smuggles in is checked before the mouth ever sees it.
//
// User direction (2026-09-05): "wire it up so wrong answers get corrected at
// any level … we don't need a system that's always right, but we do need one
// that is actively learning to get better."
//
// Until this file, the only self-correction in the instrument was P119's, and
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
//      the material the same way a drafted sentence's are (P119's company
//      rule). An atom in no passage is an unverified premise; a passage that
//      shares the premise's words and carries a DIFFERENT value is a
//      contradiction with an address. Both are handed to the model as FACTS
//      about what the sources say — never as an instruction to be skeptical.
//   2. THE ANSWER CHECK, after drafting. The same atoms-against-snips check
//      P119 runs for a section, run for any turn with passages, with the
//      same gate: a rewrite lands only when its own atoms clear the check.
//
// PURE: no model call of its own, no I/O. `correctTurn` takes the call it is
// given and spends exactly the rounds it is handed.
import { snipsFor, snipBlock, checkSection, checkSentence, reviseAsk, applyRewrite } from "./snip-check.js";
import { CLAIM_STOPWORDS } from "./grounding.js";

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
 * company P119 uses, over snips built from the passages the turn actually has.
 */
export function checkPremises(question, passages = [], { terms = [] } = {}) {
  const premises = premisesOf(question);
  if (!premises.length) return { premises: [], unverified: [], contradicted: [], snips: 0 };
  const needles = [...new Set(premises.flatMap((p) => contentWords(p.text)))];
  const snips = snipsFor(passages, { obligations: needles, terms });
  const rows = premises.map((p) => {
    const c = checkSentence(p.text, snips);
    return { ...p, atoms: c.atoms, flags: c.flags, contradiction: c.contradiction, supported: c.supported };
  });
  return {
    premises: rows,
    unverified: rows.filter((r) => r.flags.length && !r.contradiction),
    contradicted: rows.filter((r) => r.contradiction),
    snips: snips.length,
    snipRows: snips,
  };
}

/**
 * premiseFacts(check) → what the sources DO say, and nothing else.
 *
 * NEVER THE FALSE CLAIM ITSELF (P123's rule, applied here too — it was missed
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
  const parts = [];
  if (lines.length) parts.push(`What these sources say about it:\n${lines.join("\n")}`);
  if (absent.length) parts.push(`These sources do not use ${absent.map((v) => `"${v}"`).join(", ")} anywhere. There is nothing here to describe under that name.`);
  return parts.join("\n\n");
}

/**
 * premiseGuard(check) → the values the question asserted that the material
 * does not carry. The instrument keeps these and checks the DRAFT against
 * them; they are the enforcement the prompt is not asked to provide.
 */
export function premiseGuard(check) {
  if (!check?.premises?.length) return [];
  return [...new Set(check.premises.flatMap((r) => (r.contradiction ? [] : r.flags.map((f) => f.value))))]
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
 * P119's check and rewrite, for ANY turn. Byte-identical to no-op when there
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

/** The snips a turn stands on, as the block handed above its material (P119's, for any turn). */
export function turnSnipBlock(passages, question, terms = []) {
  const snips = snipsFor(passages, { obligations: contentWords(question), terms });
  return snips.length ? snipBlock(snips) : "";
}
