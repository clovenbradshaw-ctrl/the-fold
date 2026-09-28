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

import { judgmentRequest, landJudgment, INGESTION_SCHEMA, ingestionStanding } from "../eoreader7/native/kernel/ingestion.js";
import { readJudgment } from "../eoreader7/native/organs/judgment-reader.js";
import { recordOutcome } from "../eoreader7/native/kernel/escalation.js";

export const JUDGE_RUNG = "judge";
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
export function buildJudgeMessages(request, claim) {
  const stated = [claim?.end1, claim?.label, claim?.end2].filter(Boolean).join(" ");
  return [
    { role: "system", content: "You are reading one piece of text to decide whether it settles a claim. Quote the exact words in the text that decide it. Then finish with exactly one of these words on its own: holds, refused, undetermined. Say undetermined when the text does not settle it either way." },
    { role: "user", content: `Question: ${request.forWhom.question}\n\nClaim: ${stated}\n\nText:\n\n${request.text}` },
  ];
}

/**
 * judgeTurn({ ingestion, claims, question, forWhomId, chunks, ask, recipe, maxAsks, cursor, onStep })
 *   ingestion: answer-record.js's ingestionOf result (byClaim rows aligned with `claims`)
 *   claims:    the record's claims (end1/label/end2 per row)
 *   ask:       async (messages) -> prose — the one model call, the caller's (app.js binds complete())
 *   recipe:    the judge's address (model + prompt version) — the collapse's giver
 * -> { ingestion (rows carrying `judgment` where asked), trails, asked: [{ i, holon, verdict, landed, anchored, decider }] }
 * Nothing awaited here edits the answer; a throw in one ask lands as a typed `judgment.error` on that row and the next is tried.
 */
export async function judgeTurn({ ingestion, claims = [], question, forWhomId, chunks = [], ask, recipe, maxAsks = JUDGE_ASKS_PER_TURN, cursor = null, onStep = null } = {}) {
  if (!ingestion?.byClaim) return { ingestion, trails: ingestion?.trails ?? {}, asked: [] };
  if (typeof ask !== "function") throw new TypeError("judgeTurn: ask(messages) is the caller's — this module calls no model");
  if (!recipe) throw new TypeError("judgeTurn: the judge's recipe is declared");
  const forWhom = { id: forWhomId ?? `turn:${cursor ?? "?"}`, giver: "the question asked this turn", question };
  const byClaim = ingestion.byClaim.map((r) => ({ ...r }));
  let trails = ingestion.trails ?? {};
  const asked = [];
  for (const { row, i } of judgeCandidates(ingestion)) {
    if (asked.length >= maxAsks) break;
    const section = sectionAround(chunks, row.holon);
    if (!section) { byClaim[i].judgment = { refused: "section_unavailable", because: `nothing loaded is chunked at ${row.holon}` }; continue; }
    // The standing the kernel asks over: the same gaps the record row carries.
    const standing = ingestionStanding({ holon: row.holon, reached: [{ holon: row.holon, recipe: "arrival-read" }], gaps: row.left.map((reason) => ({ holon: row.holon, reason })), slots: [] });
    if (standing.schema !== INGESTION_SCHEMA || standing.standing === "read") continue;
    const request = judgmentRequest({ standing, forWhom, sectionOf: () => section.text, claim: { key: row.key, i } });
    if (!request) continue;
    const t0 = Date.now();
    let prose;
    try { prose = await ask(buildJudgeMessages(request, claims[i])); }
    catch (e) { byClaim[i].judgment = { refused: "ask_failed", because: String(e?.message ?? e) }; asked.push({ i, holon: row.holon, verdict: null, landed: "error" }); continue; }
    const { collapse, reading } = landJudgment(request, { answer: String(prose ?? ""), read: readJudgment, judge: { recipe }, cursor });
    const ok = collapse.verdict === "chosen";
    trails = recordOutcome(trails, { shape: row.shape, rung: JUDGE_RUNG, ok, ms: Date.now() - t0 });
    byClaim[i].judgment = Object.freeze({
      rung: JUDGE_RUNG, recipe, forWhom: forWhom.id,
      section: { source: section.source, start: section.start, end: section.end, refs: section.refs, chars: section.text.length },
      verdict: reading.verdict, anchored: reading.anchored, decider: reading.decider ?? null, because: reading.because ?? null,
      landed: collapse.verdict, reason: collapse.reason ?? null,
      prose: String(prose ?? "").slice(0, 600),
    });
    asked.push({ i, holon: row.holon, verdict: reading.verdict, landed: collapse.verdict, anchored: reading.anchored, decider: reading.decider ?? null });
    onStep?.(byClaim[i].judgment, claims[i]);
  }
  return { ingestion: { ...ingestion, byClaim, trails, judged: asked.filter((a) => a.landed === "chosen").length, judgeAsks: asked.length }, trails, asked };
}

/** One line for the thinking trace, plain words. */
export function judgeLine(j, claim) {
  const stated = [claim?.end1, claim?.label, claim?.end2].filter(Boolean).join(" ");
  if (j?.refused) return `judge · ${stated || "a claim"} · not asked (${j.because ?? j.refused})`;
  const where = j.section ? `${j.section.source} ${j.section.start}-${j.section.end}` : "?";
  if (j.landed === "chosen") return `judge · ${stated} · ${j.verdict} — read ${where}${j.decider ? `, deciding on «${String(j.decider).slice(0, 70)}»` : ""}`;
  if (j.landed === "contested") return `judge · ${stated} · said ${j.verdict} but pointed at nothing in ${where} — not trusted`;
  return `judge · ${stated} · no verdict read (${j.because ?? "committed to nothing"})`;
}
