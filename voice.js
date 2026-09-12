// voice.js — ONE PROPOSITION AT A TIME (2026-09-11). The record authors the
// claims; the mouth voices them one claim per call, and the record verifies
// each voiced sentence against its claim BEFORE the next is handed out. The
// authorship ratio approaches 1 by construction — the mouth asserts nothing,
// it only words — and the atomic unit is the CLAIM, the same grain the record
// judges (hypergraph bound/contradicted, the diff's matched/novel).
//
// The walls, inherited:
//   B1 / the address rule — a claim's `at` NEVER reaches the mouth (the
//     prompt carries the claim's words only; the record keeps the address).
//   The elenchus — every voiced sentence is verified against its claim; a
//     drift (the mouth voiced a DIFFERENT claim), a hedge (nothing extracted),
//     or a contradiction is caught and re-asked under a bounded budget.
//   The mouth's freedom is WORDING only — phrasing, grammar, tone — never
//     content, never a claim the record did not author.
import { refKey, fold } from "./dialogue.js";

/** The mouth's whole instruction: voice exactly the given claim, one sentence. */
export const VOICE_SYSTEM_PROMPT = "You are voicing a reading. You are given one fact the sources state. Write ONE plain sentence that says exactly that and nothing else — no introduction, no commentary, no hedging, no added names or figures. Your sentence will be checked word by word against the fact.";

/** The one-claim prompt. NO address reaches the mouth (B1); the record keeps it. */
export function claimVoicePrompt(claim) {
  const denied = String(claim?.polarity ?? "+") === "-";
  const body = [claim.end1 ?? claim.subject, claim.label ?? claim.verb, claim.end2 ?? claim.object].filter(Boolean).join(" ");
  return `The sources state${denied ? " do NOT state" : ""}: ${body}.\n\nSay it as one sentence.`;
}

/** Resolve a surface to its referent ids via the index (the index's own resolve). */
const resolveIds = (index, name) => { try { const r = index?.resolve?.(name); return r instanceof Set ? r : new Set(r ?? []); } catch { return new Set(); } };

/** The ends of a claim, referent-resolved when the index can, else folded — the identity the key rides on. */
function endsOf(c, index) {
  const end = (v) => { const s = String(v ?? "").trim(); const r = resolveIds(index, s); return r.size ? `#${[...r].sort().join("+")}` : fold(s); };
  return { a: end(c.end1 ?? c.subject), b: end(c.end2 ?? c.object) };
}

// The paraphrase tolerance (the wall P74 named): the extraction's end spans
// vary with wording ("for the spring quarter" drops), so a faithful voice is
// matched by SIGNIFICANT-TOKEN OVERLAP on both ends plus the same label —
// a drifted claim cannot share both ends' content.
const STOP = new Set(["the", "and", "for", "with", "that", "this", "from", "under", "through", "after", "during", "was", "were", "are", "is", "had", "has", "have", "by", "to", "of", "in", "on", "at"]);
const content = (s) => { const out = new Set(); for (const w of String(s ?? "").toLowerCase().split(/[^a-z0-9%]+/)) if (w.length >= 3 && !STOP.has(w)) out.add(w); return out; };
const spanShare = (a, b) => {
  const A = content(a), B = content(b);
  if (!A.size || !B.size) return 0;
  let n = 0; for (const w of A) if (B.has(w)) n++;
  return n / Math.min(A.size, B.size);
};
const sameLabel = (a, b, sameAct = null) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase() || (sameAct ? sameAct(a, b) : false);

/**
 * Verify a voiced sentence against its target claim, reading the sentence the
 * SAME way the material is read. Verdicts:
 *   matched       — the voiced claim IS the target: same key, or same label
 *                   (or same act) with both ends sharing significant content.
 *   unvoiced      — no claim extracted (the mouth hedged or narrated instead of voicing).
 *   drift         — the sentence voiced a DIFFERENT claim (ends or the act changed).
 *   contradicted  — the sentence asserts the opposite of the claim.
 * Never a guess: an unvoiced or drifted sentence is re-asked, not assumed.
 */
export function verifyVoiced(sentence, target, read, index, { sameAct = null } = {}) {
  let claimed = [];
  try { claimed = read(String(sentence ?? ""))?.claims ?? []; } catch { claimed = []; }
  const best = claimed.find((c) => c?.verdict === "bound") ?? claimed[0];
  if (!best) return { verdict: "unvoiced", detail: "no claim extracted from the voiced sentence" };
  const k = refKey(best, index).key;
  const tk = target?.key ?? refKey(target, index).key;
  if (k && tk && k === tk) return { verdict: "matched", key: k };
  if (best?.verdict === "contradicted") return { verdict: "contradicted", key: k ?? null };
  if (best?.polarity === "-") return { verdict: "contradicted", key: k ?? null };
  // the paraphrase-tolerant fallback: the same label (or same act), and both
  // ends substantially overlapping in content — a drifted claim cannot.
  const sA = spanShare(best.end1 ?? best.subject, target?.end1 ?? target?.subject);
  const sB = spanShare(best.end2 ?? best.object, target?.end2 ?? target?.object);
  if (sameLabel(best.label ?? best.verb, target?.label ?? target?.verb, sameAct) && sA >= 0.5 && sB >= 0.5) {
    return { verdict: "matched", key: k, via: "span-overlap" };
  }
  return { verdict: "drift", key: k ?? null, detail: `voiced a different claim: ${best.end1 ?? best.subject} ${best.label ?? best.verb} ${best.end2 ?? best.object}` };
}

/**
 * Drive the record's claims through the mouth ONE AT A TIME. Each claim is
 * voiced, verified, and re-asked under `retries` before moving on; a claim
 * that still fails to voice lands `unvoiced`/`drift` on the record — it is
 * never shipped as if it had been voiced, never guessed around. `call` is the
 * mouth (a messages→text function); `read`/`index` are the reader and the
 * referent index, the same organs the material is read with.
 */
export async function voiceClaims(claims, call, { read, index, retries = 1, temperature = 0, onClaim = null } = {}) {
  if (typeof call !== "function" || typeof read !== "function") throw new TypeError("voiceClaims: the mouth (call) and the reader (read) are injected");
  const out = [];
  for (const claim of claims ?? []) {
    const prompt = claimVoicePrompt(claim);
    let verdict = { verdict: "unvoiced", detail: "no attempt" };
    let voiced = null, attempts = 0;
    while (attempts <= retries) {
      voiced = await call([{ role: "system", content: VOICE_SYSTEM_PROMPT }, { role: "user", content: prompt }], { temperature });
      attempts += 1;
      verdict = verifyVoiced(String(voiced ?? ""), claim, read, index);
      if (verdict.verdict === "matched") break;
      if (attempts > retries) break;
    }
    const row = { claim, voiced, verdict, attempts };
    out.push(row);
    if (onClaim) onClaim(row);
  }
  return out;
}