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

import { judgmentRequest, landJudgment, INGESTION_SCHEMA, ingestionStanding } from "../eoreader7/native/kernel/ingestion.js";
import { readJudgment, pointedDecider } from "../eoreader7/native/organs/judgment-reader.js";
import { splitSentences as engineSentences } from "../eoreader7/native/adapters/text/spans.js";
import { becauseContained } from "../eoreader7/native/organs/testimony.js";
import { recordOutcome, recordContradiction } from "../eoreader7/native/kernel/escalation.js";
import { createHabits, learnHabit, recallHabit, applyHabit, concedeHabit, HABIT_RUNG } from "../eoreader7/native/kernel/habit.js";
import { makeGary } from "./gary.js";
import { strikeAddresses, apparatusMentions } from "./firewall.js";

export const JUDGE_RUNG = "judge";
export { HABIT_RUNG };
/** Judge asks per turn — P9: a budget is declared, never implied. Two: the witness already spent this turn's asks on the sentences; the judge takes the remainder the witness could not settle, and a turn is not a courtroom. */
export const JUDGE_ASKS_PER_TURN = 2;
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
/** The habit's key for "the same claim again": the arrangement's ends and label, folded. */
export const habitKeyOf = (claim) => [claim?.end1, claim?.label, claim?.end2].map((x) => String(x ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim()).join("|");
/** The default door: Gary with the firewall's own organs, no window (a gap he reports, never a verdict). */
export const defaultGary = () => makeGary({ strikeAddresses, apparatusMentions });

/**
 * judgeTurn({ ingestion, claims, question, forWhomId, chunks, ask, recipe, maxAsks, cursor, onStep })
 *   ingestion: answer-record.js's ingestionOf result (byClaim rows aligned with `claims`)
 *   claims:    the record's claims (end1/label/end2 per row)
 *   ask:       async (messages) -> prose — the one model call, the caller's (app.js binds complete())
 *   recipe:    the judge's address (model + prompt version) — the collapse's giver
 * -> { ingestion (rows carrying `judgment` where asked), trails, asked: [{ i, holon, verdict, landed, anchored, decider }] }
 * Nothing awaited here edits the answer; a throw in one ask lands as a typed `judgment.error` on that row and the next is tried.
 */
export async function judgeTurn({ ingestion, claims = [], question, forWhomId, chunks = [], ask, recipe, maxAsks = JUDGE_ASKS_PER_TURN, cursor = null, onStep = null, gary = null, model = null, windowOf = null, habits = null, witness = [], protocol = "point-then-word" } = {}) {
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
    const applied = applyHabit(live, section.text, { holds: (decider, material) => becauseContained(decider, material) });
    if (applied) {
      trails = recordOutcome(trails, { shape: row.shape, rung: HABIT_RUNG, ok: true, ms: 0 });
      byClaim[i].judgment = Object.freeze({ rung: HABIT_RUNG, recipe: applied.giver, learnedAt: applied.seq, forWhom: forWhom.id, section: { source: section.source, start: section.start, end: section.end, refs: section.refs, chars: section.text.length }, verdict: applied.verdict, anchored: true, decider: applied.decider, landed: "chosen", reason: `a habit learned from ${applied.giver} — its decider is in the section, no model asked`, noModel: true });
      asked.push({ i, holon: row.holon, verdict: applied.verdict, landed: "chosen", anchored: true, decider: applied.decider, rung: HABIT_RUNG });
      onStep?.(byClaim[i].judgment, claims[i]);
      continue;
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
    let learned = null;
    if (ok && reading.decider) { log = learnHabit(log, { shape: row.shape, key, verdict: reading.verdict, decider: reading.decider, giver: recipe, forWhom: forWhom.id, cursor }); learned = { key, verdict: reading.verdict }; }
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
  return { ingestion: { ...ingestion, byClaim, trails, judged, judgeAsks: asked.filter((a) => a.rung === JUDGE_RUNG).length, byHabit: asked.filter((a) => a.rung === HABIT_RUNG).length, habitsConceded: conceded.length }, trails, asked, habits: log, conceded };
}

/** One line for the thinking trace, plain words. */
export function judgeLine(j, claim) {
  const stated = [claim?.end1, claim?.label, claim?.end2].filter(Boolean).join(" ");
  if (j?.refused) return `judge · ${stated || "a claim"} · not asked (${j.because ?? j.refused})`;
  const where = j.section ? `${j.section.source} ${j.section.start}-${j.section.end}` : "?";
  if (j.rung === HABIT_RUNG) return `habit · ${stated} · ${j.verdict} — no model asked; the decider «${String(j.decider).slice(0, 70)}» is in ${where} (learned from ${j.recipe})`;
  if (j.landed === "chosen") return `judge · ${stated} · ${j.verdict} — read ${where}${j.decider ? `, deciding on «${String(j.decider).slice(0, 70)}»` : ""}${j.learned ? " · learned as a habit" : ""}`;
  if (j.landed === "contested") return `judge · ${stated} · said ${j.verdict} but pointed at nothing in ${where} — not trusted`;
  return `judge · ${stated} · no verdict read (${j.because ?? "committed to nothing"})`;
}
