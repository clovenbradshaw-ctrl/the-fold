// judge.js — THE LIVE JUDGE CALL SITE (2026-09-28). The-fold's surface over
// eoreader7's kernel/ingestion.js + organs/judgment-reader.js.
//
// User direction, in order: "provide the full span section to an llm to make
// a judgement relative to the respective for whom … but I want us to see how
// much we can do mechanically"; "I just don't get why we're not already doing
// that if it doesn't require a model call"; "We can't stop it from writing a
// verdict in prose and shouldn't, but we can read that mechanically for the
// answer."
//
// WHEN THE JUDGE IS ASKED. answer-record.js::ingestionOf already ran, every
// turn, with no model: it typed each cited address unread / partial / read and
// walked the learned ladder (mechanical → witness → judge) for every claim
// resting on something not fully read. The judge is the LAST rung: asked only
// for a claim the mechanical tier left as a typed gap AND the sentence witness
// did not settle, under a declared per-turn budget. A claim already judged by
// the witness costs nothing here.
//
// WHAT IT IS HANDED. The section: the cited passage AND its neighbours in the
// same source, in reading order, up to a declared width — the "full span
// section", never the whole book (a judge handed 3MB has read nothing). The
// for-whom: this turn's question, as the frame the judgment stands in. Plain
// words only (P55): the messages built here are checked by firewall.js's
// apparatus scan in judge.test.mjs.
//
// WHAT COMES BACK. Prose. organs/judgment-reader.js reads it for the one
// candidate it commits to and whether what it points at is IN the section it
// was handed; kernel/ingestion.js lands that as a collapse FOR this for-whom —
// chosen only when anchored, contested when the judge asserted past the
// bytes, none when it committed to nothing. The outcome deposits on the
// escalation trails (the judge's own rung, ok = chosen), so the next turn's
// ladder is learned from this one (Wilson).
//
// THE WALLS. Nothing here edits the answer (P186). Nothing here changes the
// ingestion standing — the gaps stay on the record; the judgment sits BESIDE
// them on the claim's own row. A judge that cannot point at the section is
// never trusted for its verdict.

// GARY KEEPS THE JUDGE'S DOOR (gary.js, 2026-09-28, user direction: "use Gary
// to understand how to best prompt models"). His rules are the whole of what
// this file knows about prompting, and every ask goes through `gary.hand`:
// no address reaches the judge (struck); no apparatus noun (the section is
// "the text", the material is never "passages"); no JSON asked for in prose
// (the judge answers in prose and the reader reads it); INFORMATION, NOT
// PROHIBITION — the judge is told what a candidate word means, never what
// not to say; the question LAST, the person's own words, after the text and
// the claim it is asked about; and a bag that fits the window the model is
// loaded at. What he finds is disclosed on the judgment row; a REFUSE finding
// means the judge is not asked at all.
//
// A MODEL CALL LEAVES A HABIT (kernel/habit.js, user direction: "be sure
// that model calls create a revisable habit that makes the next instance of
// something similar less likely to need a model call"). A chosen, anchored
// judgment is learned: the claim's key, the verdict, and the decider the
// judge pointed at. The next claim with the same key is answered by the
// habit when its decider is in the section at hand — the HABIT rung, no
// model call, deposited on the trails so the ladder learns to try it before
// the witness and the judge. A habit is conceded (REC, trigger quoted) the
// moment the material contradicts it: the relation tier reads the claim
// `contradicted` while the habit holds, or the witness refuses it. A conceded
// habit answers nothing; the next judgment learns anew.

// THE WITNESS RUNG, INSIDE THIS FILE (2026-09-28, same day). The paragraph
// above ("A claim already judged by the witness costs nothing here") names
// a PASSIVE check: answer-record.js::ingestionOf already matches a claim's
// ends against whatever sentences THIS TURN'S DRAFTED ANSWER happened to
// have witnessed (holon.js's own per-part sweep) before `judgeCandidates`
// is even computed — no model call of its own, and every row that reaches
// this file already failed it. What was missing was an ACTIVE ask about
// the CLAIM ITSELF, between the habit rung and the judge: `witnessClaim`
// composes eoreader7's already-built, already-tested organ
// (organs/witness-sentences.js over organs/testimony.js's SELECT protocol
// — sibling-swap armed, point-then-word, never a verdict in prose) over
// the same section the judge would otherwise read whole. Its own budget
// (WITNESS_ASKS_PER_TURN) is declared apart from the judge's, and a
// "states"/"refused" verdict lands exactly the way a chosen judgment does
// — through the SAME learnFromDecider helper, so a claim the witness
// settles becomes a habit too. A "skipped" verdict spent nothing and the
// claim falls to the judge unchanged. Wired only when the caller supplies
// `selectAsk`/`testimony` (and `witnessAsk` for the select protocol's own
// generate fallback); omitting them reproduces this file's behaviour from
// before this addition, byte for byte.

import { judgmentRequest, landJudgment, INGESTION_SCHEMA, ingestionStanding } from "../eoreader7/native/kernel/ingestion.js";
import { readJudgment, pointedDecider } from "../eoreader7/native/organs/judgment-reader.js";
import { splitSentences as engineSentences } from "../eoreader7/native/adapters/text/spans.js";
import { becauseContained } from "../eoreader7/native/organs/testimony.js";
import { witnessSentences } from "../eoreader7/native/organs/witness-sentences.js";
import { recordOutcome, recordContradiction } from "../eoreader7/native/kernel/escalation.js";
import { createHabits, learnHabit, recallHabit, applyHabit, concedeHabit, HABIT_RUNG } from "../eoreader7/native/kernel/habit.js";
import { NEGATION_WORDS } from "../eoreader7/native/adapters/text/priors.js";
import { tokenize } from "../eoreader7/native/organs/source.js";
import { makeGary } from "../eoreader7/native/organs/index.js";
import { strikeAddresses, apparatusMentions } from "./firewall.js";

export const JUDGE_RUNG = "judge";
export const WITNESS_RUNG = "witness";
export { HABIT_RUNG };
/** Judge asks per turn — P9: a budget is declared, never implied. Two: the witness already spent this turn's asks on the sentences; the judge takes the remainder the witness could not settle, and a turn is not a courtroom. */
export const JUDGE_ASKS_PER_TURN = 2;
/**
 * Witness asks per turn — P9, declared separately from JUDGE_ASKS_PER_TURN
 * so the two never eat each other's budget. Two: a select-protocol point
 * (and its sibling-swapped arm, when one can be built) is cheaper than the
 * judge's own full-section point-then-word pair, but it is still a real
 * model call, and this rung runs BEFORE the judge for every judge
 * candidate — a generous witness budget would leave nothing for the judge
 * to try on whatever the witness could not settle.
 */
export const WITNESS_ASKS_PER_TURN = 2;
/** The section's width in characters — the cited passage plus its neighbours, in reading order. The width of a printed page of prose, not a tuned number: wide enough to hold the sentence before and after the one cited, narrow enough that a small model reads all of it. */
export const JUDGE_SECTION_CHARS = 2400;
export const JUDGE_MAX_TOKENS = 220;

/** "/name/a-b" (kernel holon) -> "name#a-b" (this app's ref); "/name" -> "name". */
export const refOfHolon = (holon) => { const segs = String(holon ?? "").split("/").filter(Boolean); return segs.length >= 2 ? `${segs[0]}#${segs[1]}` : segs[0] ?? null; };

/**
 * sectionAround(chunks, holon, { chars }) -> { text, refs, source, start, end } | null
 * The cited chunk and its same-source neighbours, alternating before/after,
 * while the budget holds. Null when the holon names nothing this app chunked.
 */
export function sectionAround(chunks, holon, { chars = JUDGE_SECTION_CHARS } = {}) {
  const ref = refOfHolon(holon);
  if (!ref) return null;
  const at = (chunks ?? []).find((c) => c.ref === ref);
  if (!at) return null;
  const siblings = (chunks ?? []).filter((c) => c.source === at.source && typeof c.start === "number").sort((a, b) => a.start - b.start);
  const i = siblings.indexOf(at);
  let lo = i, hi = i, used = at.text.length;
  for (let step = 0; ; step++) {
    const tryBefore = step % 2 === 0;
    const cand = tryBefore ? siblings[lo - 1] : siblings[hi + 1];
    const other = tryBefore ? siblings[hi + 1] : siblings[lo - 1];
    if (!cand && !other) break;
    const pick = cand && used + cand.text.length + 2 <= chars ? cand : other && used + other.text.length + 2 <= chars ? other : null;
    if (!pick) break;
    used += pick.text.length + 2;
    if (pick === siblings[lo - 1]) lo -= 1; else hi += 1;
  }
  const kept = siblings.slice(lo, hi + 1);
  return { text: kept.map((c) => c.text).join("\n\n"), refs: kept.map((c) => c.ref), source: at.source, start: kept[0].start, end: kept[kept.length - 1].end };
}

/** The rows the judge is for: escalated, not fully read, and the witness did not settle them. */
export const judgeCandidates = (ingestion) => (ingestion?.byClaim ?? []).map((row, i) => ({ row, i })).filter(({ row }) => row.shape && row.standing !== "read" && (row.judged === null || row.judged === undefined) && !row.judgment);

/** Plain words. No address, no apparatus noun (checked by test against firewall.js's own list). The judge may answer in prose; it is asked to quote and to end on one word so the reader has something to read. */
/** The section's sentences, numbered as the ask shows them — the same list the reader is handed, so a pointed number names the same bytes. */
export const numberedSentences = (text) => engineSentences(String(text ?? "")).map((s) => (typeof s === "string" ? s : s.text)).map((t) => t.trim()).filter(Boolean);
export function buildJudgeMessages(request, claim) {
  const stated = [claim?.end1, claim?.label, claim?.end2].filter(Boolean).join(" ");
  const sentences = numberedSentences(request.text);
  const numbered = sentences.map((t, i) => `[${i + 1}] ${t}`).join("\n");
  return [
    // information, not prohibition: what each word means, and that the deciding sentence is named by its number
    // (v1 of fast-reasoning.mjs: a small judge answers one word and quotes nothing; it can still point)
    // (v2 of fast-reasoning.mjs: an example number in the instruction — "like [3]" — was the number a 0.5B judge gave back on every claim; no example here)
    { role: "system", content: "One piece of text, its sentences numbered, and one claim about it. The answer names the number of the sentence that decides the claim, then ends with one word: holds (the text states the claim), refused (the text states otherwise), undetermined (the text settles neither)." },
    // the text, the claim, and LAST the question in the asker's own words
    { role: "user", content: `Text:\n${numbered}\n\nClaim: ${stated}\n\n${request.forWhom.question}` },
  ];
}
/**
 * THE POINT-THEN-WORD PROTOCOL (v2 of fast-reasoning.mjs, 2026-09-28): a very
 * small judge cannot carry two parts in one answer — asked to point and to
 * decide, it did neither. Asked for ONLY the number it pointed right; asked
 * for ONLY the word over that one sentence it decided right (a false claim
 * refused from the pointed bytes). Two asks, each a point, each read
 * mechanically; the second sees the pointed sentence alone, the claim, and
 * the question LAST. Two calls per judged claim, declared; a point the
 * company wall refuses spends one and lands NONE (no word was asked for).
 */
export const JUDGE_PROTOCOLS = Object.freeze(["point-then-word", "prose"]);
export function buildPointMessages(request, claim) {
  const stated = [claim?.end1, claim?.label, claim?.end2].filter(Boolean).join(" ");
  const numbered = numberedSentences(request.text).map((t, i) => `[${i + 1}] ${t}`).join("\n");
  return [
    { role: "system", content: "A numbered list of sentences and a claim. The answer is only the number of the one sentence that speaks to the claim." },
    { role: "user", content: `Sentences:\n${numbered}\n\nClaim: ${stated}\n\nWhich sentence speaks to the claim?` },
  ];
}
export function buildWordMessages(sentence, claim, question) {
  const stated = [claim?.end1, claim?.label, claim?.end2].filter(Boolean).join(" ");
  return [
    { role: "system", content: "One sentence and one claim. The answer is one word: holds if the sentence states the claim, refused if the sentence states otherwise, undetermined if it settles neither." },
    { role: "user", content: `Sentence: ${sentence}\n\nClaim: ${stated}\n\n${question}` },
  ];
}
/**
 * THE COUNTER-DECIDER WALL (fast-reasoning v4, 2026-09-28): a habit answered
 * `holds` by containment with "Mina never was the brightest..." one sentence
 * away, because the relation reader reads no claim from a copula + adjective
 * sentence and so no contradiction ever reached the revision loop. A habit is
 * only as revisable as the eyes that watch it; this is the habit rung's own
 * eye. Before a habit answers, every sentence of the section that shares the
 * decider's company (its first content word and one more) is read for a
 * received negation word (priors.js NEGATION_WORDS, lang/en); one found stands
 * the habit down — NOT APPLICABLE, never a verdict — and the judge is asked.
 */
export function negatedNearby(decider, material, claimText = null) {
  // v5: the company is the CLAIM's when the caller hands it over — a decider sentence may open with a clause the claim is not about
  const dTok = tokenize(claimText ?? decider);
  if (dTok.length < 2) return false;
  // a negation the decider itself carries is its own polarity, not a counter
  const own = new Set(dTok.filter((w) => NEGATION_WORDS.has(w)));
  for (const s of numberedSentences(material)) {
    const t = tokenize(s); const set = new Set(t);
    const shares = set.has(dTok[0]) && dTok.slice(1).some((x) => set.has(x));
    if (shares && t.some((w) => NEGATION_WORDS.has(w) && !own.has(w))) return true;
  }
  return false;
}
/** The habit's key for "the same claim again": the arrangement's ends and label, folded. */
export const habitKeyOf = (claim) => [claim?.end1, claim?.label, claim?.end2].map((x) => String(x ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim()).join("|");
/** The default door: Gary with the firewall's own organs, no window (a gap he reports, never a verdict). */
export const defaultGary = () => makeGary({ strikeAddresses, apparatusMentions });

/**
 * THE WITNESS RUNG (2026-09-28) — a small model handed the claim's OWN
 * arrangement, asked through eoreader7's already-built, already-tested
 * organ (organs/witness-sentences.js, composing organs/testimony.js's
 * SELECT protocol: the model points at a mechanically gathered candidate
 * by index, sibling-swap armed, and never writes a verdict in prose — the
 * same point-then-word discipline `buildPointMessages`/`buildWordMessages`
 * already hold this file to, one organ over).
 *
 * NOT to be confused with the OTHER "witness" already in this file: the
 * `witness` array `judgeTurn` already accepts (and `ingestionOf`, upstream
 * in answer-record.js, already reads to decide `judgeCandidates` in the
 * first place — see that file's own `ESCALATION_RUNGS` and `witnessed()`).
 * That one is a PASSIVE reuse of whatever sentences THIS TURN'S DRAFTED
 * ANSWER happened to have witnessed already (holon.js's own per-part sweep,
 * `WITNESS_ASKS_PER_PART`); it matches a claim against a witnessed
 * sentence's tokens, no model call of its own. It is exactly why every row
 * `judgeCandidates` returns already failed that passive check — a claim the
 * model never restated as a sentence never reaches it. `witnessClaim` asks
 * about the CLAIM ITSELF, so the residual population still gets one more,
 * cheaper try before the judge is asked the same question over the full
 * section.
 *
 * witnessClaim(claim, passages, { witnessAsk, selectAsk, testimony,
 * splitSentences, maxAsks }) -> { row, asks } | null
 *   claim:      { end1, label, end2 } — [end1, label, end2].join(" ") is the
 *               one "sentence" this asks about.
 *   passages:   [{ ref, text }] — the section's own bytes (sectionAround's
 *               `source`/`text`); witnessSentences joins them into one
 *               source and offers the model candidate sentences drawn from
 *               it, never from anywhere else.
 *   witnessAsk: async (sentence, slice) -> parsed verdict — the GENERATE
 *               fallback witnessNote falls to when the select protocol has
 *               no co-present candidate to offer. Named `witnessAsk`, not
 *               `ask`, on purpose: judgeTurn's own `ask(messages) -> prose`
 *               is a different function with a different shape (the judge's
 *               prose ask), and the two must never be confused for one
 *               another or handed to the wrong organ.
 *   selectAsk:  async (messages) -> { index, verdict } — the point, never a
 *               verdict in prose.
 *   testimony:  { witnessSlice, siblingSwap, foldTestimony,
 *               buildSelectMessages, foldSelect, ...(sameForm?) } — the
 *               SAME bundle app.js's own `witnessTestimony()` already
 *               builds for the answer-sentence witness; nothing new to
 *               compose, only to hand over again.
 * Returns null when the claim carries no arrangement to ask about at all
 * (a claim's ends and label are all this asks); otherwise the one row
 * witnessSentences produced for it, and how many of `maxAsks` it spent
 * (0 when it never reached a model — no content to anchor a candidate on,
 * or the budget handed in was already 0).
 */
export async function witnessClaim(claim, passages, { witnessAsk, selectAsk, testimony, splitSentences = engineSentences, maxAsks = 1 } = {}) {
  const sentence = [claim?.end1, claim?.label, claim?.end2].filter(Boolean).join(" ");
  if (!sentence) return { row: null, asks: 0 };
  const claimRow = { sentence, end1: claim?.end1 ?? null, end2: claim?.end2 ?? null };
  const { rows, asks } = await witnessSentences([sentence], [claimRow], passages, { ask: witnessAsk, selectAsk, splitSentences, testimony, maxAsks });
  return { row: rows[0] ?? null, asks };
}

/**
 * A chosen judgment's decider is a habit worth learning again — the SAME
 * rule for both rungs that can spend a model call here (the judge's own
 * point-then-word, and the witness's select point): a verdict with nothing
 * to find again is a rumour (learnHabit's own wall), so this is a no-op
 * whenever there is no decider, and both call sites share it rather than
 * each re-deriving the guard.
 */
function learnFromDecider(log, { shape, key, verdict, decider, giver, forWhom, cursor }) {
  if (!decider) return { log, learned: null };
  return { log: learnHabit(log, { shape, key, verdict, decider, giver, forWhom, cursor }), learned: { key, verdict } };
}

/**
 * judgeTurn({ ingestion, claims, question, forWhomId, chunks, ask, recipe, maxAsks, cursor, onStep,
 *             witnessAsk, selectAsk, testimony, maxWitnessAsks })
 *   ingestion: answer-record.js's ingestionOf result (byClaim rows aligned with `claims`)
 *   claims:    the record's claims (end1/label/end2 per row)
 *   ask:       async (messages) -> prose — the one model call, the caller's (app.js binds complete())
 *   recipe:    the judge's address (model + prompt version) — the collapse's giver
 *   witnessAsk, selectAsk, testimony: the WITNESS RUNG's own organs (witnessClaim's own doc,
 *              above, has the full shape). All three are OPTIONAL — omit any one and the witness
 *              rung is skipped entirely, byte-identical to before it existed: every judgeCandidates
 *              row goes straight to the habit-then-judge path this file already had.
 *   maxWitnessAsks: the witness rung's own declared per-turn budget (WITNESS_ASKS_PER_TURN, P9) —
 *              never the judge's; the two are counted apart.
 * -> { ingestion (rows carrying `judgment` where asked), trails, asked: [{ i, holon, verdict, landed, anchored, decider }] }
 * Nothing awaited here edits the answer; a throw in one ask lands as a typed `judgment.error` on that row and the next is tried.
 */
export async function judgeTurn({ ingestion, claims = [], question, forWhomId, chunks = [], ask, recipe, maxAsks = JUDGE_ASKS_PER_TURN, cursor = null, onStep = null, gary = null, model = null, windowOf = null, habits = null, witness = [], protocol = "point-then-word", witnessAsk = null, selectAsk = null, testimony = null, maxWitnessAsks = WITNESS_ASKS_PER_TURN } = {}) {
  if (!JUDGE_PROTOCOLS.includes(protocol)) throw new TypeError(`judgeTurn: protocol is one of ${JUDGE_PROTOCOLS.join(" / ")}`);
  if (!ingestion?.byClaim) return { ingestion, trails: ingestion?.trails ?? {}, asked: [], habits: habits ?? createHabits(), conceded: [] };
  if (typeof ask !== "function") throw new TypeError("judgeTurn: ask(messages) is the caller's — this module calls no model");
  if (!recipe) throw new TypeError("judgeTurn: the judge's recipe is declared");
  const door = gary ?? makeGary({ strikeAddresses, apparatusMentions, windowOf });
  const forWhom = { id: forWhomId ?? `turn:${cursor ?? "?"}`, giver: "the question asked this turn", question };
  const byClaim = ingestion.byClaim.map((r) => ({ ...r }));
  let trails = ingestion.trails ?? {};
  let log = habits ?? createHabits();
  const asked = [], conceded = [];
  // THE WITNESS RUNG's own budget (P9) — spent across every judgeCandidates
  // row this turn, never per-row; a skip that never reached a model (no
  // content to anchor a candidate on, or this budget already at 0) spends
  // nothing, matching witnessSentences' own accounting (`asks`).
  let witnessAsksSpent = 0;
  const toks = (t) => new Set(String(t ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2));
  // REVISION FIRST: a live habit the material now contradicts is conceded before anything is answered by it
  for (let i = 0; i < claims.length; i++) {
    const c = claims[i]; const key = habitKeyOf(c); const live = recallHabit(log, key);
    if (!live) continue;
    const said = (w) => toks(w?.sentence ?? "");
    const ends = [...toks(c.end1), ...toks(c.end2)];
    const refusedByWitness = ends.length > 0 && (witness ?? []).some((w) => w.witness === "refused" && ends.every((t) => said(w).has(t)));
    const trigger = c.verdict === "contradicted" && live.verdict === "holds" ? `the relation tier read the claim contradicted at ${(c.refs ?? [])[0] ?? "?"} while the habit held`
      : c.verdict === "bound" && live.verdict === "refused" ? `the relation tier bound the claim at ${(c.refs ?? [])[0] ?? "?"} while the habit refused it`
      : refusedByWitness && live.verdict === "holds" ? "the witness refused the sentence the habit held" : null;
    if (!trigger) continue;
    const r = concedeHabit(log, key, { trigger, giver: "judge.js revision", cursor });
    log = r.log; conceded.push({ i, key, verdict: live.verdict, trigger });
    if (byClaim[i].shape) trails = recordContradiction(trails, { shape: byClaim[i].shape, rung: HABIT_RUNG });
    byClaim[i].habitConceded = { verdict: live.verdict, trigger };
  }
  for (const { row, i } of judgeCandidates(ingestion)) {
    const section = sectionAround(chunks, row.holon);
    if (!section) { byClaim[i].judgment = { refused: "section_unavailable", because: `nothing loaded is chunked at ${row.holon}` }; continue; }
    const key = habitKeyOf(claims[i]);
    // THE HABIT RUNG: a learned judgment whose decider is in this section answers with no model call
    const live = recallHabit(log, key);
    const stated0 = [claims[i]?.end1, claims[i]?.label, claims[i]?.end2].filter(Boolean).join(" ");
    const applied = applyHabit(live, section.text, { holds: (decider, material) => becauseContained(decider, material) && !negatedNearby(decider, material) && !negatedNearby(decider, material, stated0) });
    if (live && !applied && becauseContained(live.decider, section.text)) byClaim[i].habitStoodDown = { verdict: live.verdict, because: "a negated restatement of the decider's own company is in the section" };
    if (applied) {
      trails = recordOutcome(trails, { shape: row.shape, rung: HABIT_RUNG, ok: true, ms: 0 });
      byClaim[i].judgment = Object.freeze({ rung: HABIT_RUNG, recipe: applied.giver, learnedAt: applied.seq, forWhom: forWhom.id, section: { source: section.source, start: section.start, end: section.end, refs: section.refs, chars: section.text.length }, verdict: applied.verdict, anchored: true, decider: applied.decider, landed: "chosen", reason: `a habit learned from ${applied.giver} — its decider is in the section, no model asked`, noModel: true });
      asked.push({ i, holon: row.holon, verdict: applied.verdict, landed: "chosen", anchored: true, decider: applied.decider, rung: HABIT_RUNG });
      onStep?.(byClaim[i].judgment, claims[i]);
      continue;
    }
    // THE WITNESS RUNG (witnessClaim, above): the claim's own arrangement,
    // asked through the SAME select-protocol/sibling-swap organ the
    // answer's own sentences are already witnessed with — never the passive
    // token-coverage match `ingestionOf` already tried upstream (this row
    // reached judgeCandidates precisely because that one found nothing).
    // Skipped entirely when the caller did not supply the organs — the
    // rest of this loop is then byte-identical to before this rung existed.
    if (selectAsk && testimony && witnessAsksSpent < maxWitnessAsks) {
      const t0w = Date.now();
      let wr = { row: null, asks: 0 };
      try { wr = await witnessClaim(claims[i], [{ ref: section.source, text: section.text }], { witnessAsk, selectAsk, testimony, maxAsks: maxWitnessAsks - witnessAsksSpent }); }
      catch { wr = { row: null, asks: 0 }; }
      witnessAsksSpent += wr?.asks ?? 0;
      const wrow = wr?.row ?? null;
      // "skipped" (no content to anchor a candidate on, or the corroboration
      // organ itself could not commit — unarmed, indiscriminate, figure
      // unbacked) is not a finding: nothing here was settled, so the claim
      // falls through to the judge exactly as it would have before this
      // rung existed. Only "states"/"refused" — the witness actually
      // committed to something and its own arm backs it — land here.
      if (wrow && wrow.witness !== "skipped") {
        const verdict = wrow.witness === "states" ? "holds" : "refused";
        const decider = wrow.decider ?? null;
        trails = recordOutcome(trails, { shape: row.shape, rung: WITNESS_RUNG, ok: true, ms: Date.now() - t0w });
        const learn = learnFromDecider(log, { shape: row.shape, key, verdict, decider, giver: recipe, forWhom: forWhom.id, cursor });
        log = learn.log;
        byClaim[i].judgment = Object.freeze({
          rung: WITNESS_RUNG, recipe, forWhom: forWhom.id,
          section: { source: section.source, start: section.start, end: section.end, refs: section.refs, chars: section.text.length },
          verdict, anchored: true, decider, landed: "chosen",
          reason: wrow.witness === "states"
            ? `the sentence witness pointed at the section — states, deciding on «${String(decider ?? "").slice(0, 80)}»`
            : "the sentence witness was armed with the section's own candidates and refused every one of them",
          learned: learn.learned, calls: wr.asks,
        });
        asked.push({ i, holon: row.holon, verdict, landed: "chosen", anchored: true, decider, rung: WITNESS_RUNG, learned: !!learn.learned });
        onStep?.(byClaim[i].judgment, claims[i]);
        continue;
      }
    }
    if (asked.filter((a) => a.rung === JUDGE_RUNG).length >= maxAsks) continue;
    const standing = ingestionStanding({ holon: row.holon, reached: [{ holon: row.holon, recipe: "arrival-read" }], gaps: row.left.map((reason) => ({ holon: row.holon, reason })), slots: [] });
    if (standing.schema !== INGESTION_SCHEMA || standing.standing === "read") continue;
    const request = judgmentRequest({ standing, forWhom, sectionOf: () => section.text, claim: { key: row.key, i } });
    if (!request) continue;
    // GARY HANDS THE BAG: struck, checked, refused where his rules say so
    const stated = [claims[i]?.end1, claims[i]?.label, claims[i]?.end2].filter(Boolean).join(" ");
    const sentences = numberedSentences(request.text);
    const firstBag = door.hand(protocol === "prose" ? buildJudgeMessages(request, claims[i]) : buildPointMessages(request, claims[i]), { model, material: 1, options: { num_predict: JUDGE_MAX_TOKENS } });
    const gate = { findings: firstBag.findings.map((f) => ({ rule: f.rule, severity: f.severity, detail: f.detail })), gaps: firstBag.gaps.map((g) => g.type), struck: firstBag.struck, tokens: firstBag.tokens, window: firstBag.window ?? null, protocol };
    if (firstBag.refused.length) { byClaim[i].judgment = { refused: "gary_refused", because: firstBag.refused.map((f) => `${f.rule}: ${f.detail}`).join("; "), gary: gate }; asked.push({ i, holon: row.holon, verdict: null, landed: "refused", rung: JUDGE_RUNG }); continue; }
    const t0 = Date.now();
    let prose, callsSpent = 0;
    try {
      const first = String((await ask(firstBag.messages)) ?? ""); callsSpent += 1;
      if (protocol === "prose") prose = first;
      else {
        // POINT, read; then the WORD over the pointed sentence alone — only when the point anchors (the company wall), else one call is spent and the judgment is contested on the point
        const point = pointedDecider(first, sentences, stated);
        if (!point?.anchored) prose = point ? `[${point.index}]` : first;
        else {
          const wordBag = door.hand(buildWordMessages(point.decider, claims[i], request.forWhom.question), { model, material: 1, options: { num_predict: 12 } });
          gate.wordFindings = wordBag.findings.map((f) => f.rule);
          const word = String((await ask(wordBag.messages)) ?? ""); callsSpent += 1;
          prose = `[${point.index}] ${word}`;
        }
      }
    } catch (e) { byClaim[i].judgment = { refused: "ask_failed", because: String(e?.message ?? e), gary: gate }; asked.push({ i, holon: row.holon, verdict: null, landed: "error", rung: JUDGE_RUNG }); continue; }
    const { collapse, reading } = landJudgment(request, { answer: prose, read: (p, q) => readJudgment(p, q, { sentences, claim: stated }), judge: { recipe }, cursor });
    const ok = collapse.verdict === "chosen";
    trails = recordOutcome(trails, { shape: row.shape, rung: JUDGE_RUNG, ok, ms: Date.now() - t0 });
    // THE HABIT LEARNED: a chosen judgment with a decider to find again
    // (learnFromDecider, shared with the witness rung above — one guard,
    // not two copies of it: "a verdict with nothing to find again is a
    // rumour" is learnHabit's own wall, and both rungs that can spend a
    // model call here answer to it the same way).
    const learn = ok ? learnFromDecider(log, { shape: row.shape, key, verdict: reading.verdict, decider: reading.decider, giver: recipe, forWhom: forWhom.id, cursor }) : { log, learned: null };
    log = learn.log; const learned = learn.learned;
    byClaim[i].judgment = Object.freeze({
      rung: JUDGE_RUNG, recipe, forWhom: forWhom.id,
      section: { source: section.source, start: section.start, end: section.end, refs: section.refs, chars: section.text.length },
      verdict: reading.verdict, anchored: reading.anchored, decider: reading.decider ?? null, because: reading.because ?? null,
      landed: collapse.verdict, reason: collapse.reason ?? null,
      prose: String(prose ?? "").slice(0, 600), gary: gate, learned, calls: callsSpent,
    });
    asked.push({ i, holon: row.holon, verdict: reading.verdict, landed: collapse.verdict, anchored: reading.anchored, decider: reading.decider ?? null, rung: JUDGE_RUNG, learned: !!learned });
    onStep?.(byClaim[i].judgment, claims[i]);
  }
  const judged = asked.filter((a) => a.landed === "chosen").length;
  return { ingestion: { ...ingestion, byClaim, trails, judged, judgeAsks: asked.filter((a) => a.rung === JUDGE_RUNG).length, byHabit: asked.filter((a) => a.rung === HABIT_RUNG).length, byWitness: asked.filter((a) => a.rung === WITNESS_RUNG).length, habitsConceded: conceded.length }, trails, asked, habits: log, conceded };
}

/** One line for the thinking trace, plain words. */
export function judgeLine(j, claim) {
  const stated = [claim?.end1, claim?.label, claim?.end2].filter(Boolean).join(" ");
  if (j?.refused) return `judge · ${stated || "a claim"} · not asked (${j.because ?? j.refused})`;
  const where = j.section ? `${j.section.source} ${j.section.start}-${j.section.end}` : "?";
  if (j.rung === HABIT_RUNG) return `habit · ${stated} · ${j.verdict} — no model asked; the decider «${String(j.decider).slice(0, 70)}» is in ${where} (learned from ${j.recipe})`;
  if (j.rung === WITNESS_RUNG) return `witness · ${stated} · ${j.verdict} — settled before the judge was asked${j.decider ? `, deciding on «${String(j.decider).slice(0, 70)}»` : ""}${j.learned ? " · learned as a habit" : ""}`;
  if (j.landed === "chosen") return `judge · ${stated} · ${j.verdict} — read ${where}${j.decider ? `, deciding on «${String(j.decider).slice(0, 70)}»` : ""}${j.learned ? " · learned as a habit" : ""}`;
  if (j.landed === "contested") return `judge · ${stated} · said ${j.verdict} but pointed at nothing in ${where} — not trusted`;
  return `judge · ${stated} · no verdict read (${j.because ?? "committed to nothing"})`;
}
