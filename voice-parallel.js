// voice-parallel.js — the work-stealing dispatcher, the organ the
// eval/voice-mouth-parallel.mjs experiment measured: the claim-atomic turn
// (voice.js) with TWO mouths on one claim queue, CONCURRENTLY. Claims are
// dispatched MECHANICALLY in alternation across the mouths (G2 — compute what
// can be computed; no model
// ever decides routing), each mouth works its share while the others work
// theirs, and a claim that FAILED on its assigned mouth escalates to the next
// mouth under the same bounded budget. Measured 2026-09-12 on real material:
// the pair beat either singleton (0.95 matched vs 0.85 / 0.55) on one claim
// set — a licence to MEASURE the differential continuously, never a licence
// for the mechanism itself.
//
// THE DIFFERENCE THAT MAKES A DIFFERENCE (Bateson, this repo's own rule —
// P31's sketch, THE-CORE-MECHANISM's census, dmdWindow's own definition).
// Two mouths are earned only where escalation RECOVERS a claim the assigned
// mouth would fail. So every row carries its full attempt trail
// (`tried: [{mouth, verdict}]`), and the aggregate is a per-claim
// differential:
//     recovered   — failed on the first mouth, matched on a later one (the
//                    second mouth made a difference)
//     matched     — matched on the first mouth (escalation never spent)
//     no-difference — failed on EVERY mouth tried (no mouth made a
//                    difference — the finding belongs to the BORN GATE or
//                    the extractor, not to another mouth)
// An online calibration (the reflex ledger's standing tables) spends this
// differential against a null — what the better SINGLETON would have scored
// on the same claims — and the dispatcher is licensed only while recovered >
// the singleton's edge. A window with no recovered claims means the second
// mouth is idle weight.
//
// The walls voice.js already holds, inherited unchanged:
//   B1 — a claim's address never reaches any mouth (claimVoicePrompt).
//   The elenchus — every voiced sentence is verified against its claim before
//     the next is handed out; a drift/hedge/contradiction escalates.
//   The mouth's freedom is WORDING only, never content.
import { claimVoicePrompt, verifyVoiced, VOICE_SYSTEM_PROMPT } from "./voice.js";

const voice = async (call, claim, temperature) => {
  const voiced = await call([{ role: "system", content: VOICE_SYSTEM_PROMPT }, { role: "user", content: claimVoicePrompt(claim) }], { temperature });
  return String(voiced ?? "");
};

/**
 * Voice the record's claims through several mouths at once, mechanically
 * dispatched. `mouths` is an ordered array of `{ name, call }` where `call`
 * is a messages→text function (the same shape voiceClaims takes). Claims are
 * assigned round-robin; a claim that does not verify matched on its assigned
 * mouth escalates to the next unused mouth (cyclic), bounded by `retries`
 * escalations per claim. Returns rows carrying the attempt trail:
 *   { claim, voiced, verdict, attempts, mouth, tried: [{ mouth, verdict }] }
 * `tried[0]` is the assigned mouth — the differential is read off the trail.
 */
export async function voiceClaimsParallel(claims, mouths = [], { read, index, retries = 1, temperature = 0, onClaim = null } = {}) {
  if (!Array.isArray(mouths) || mouths.length < 2) throw new TypeError("voiceClaimsParallel: at least two mouths are required (a dispatcher with one mouth is voiceClaims)");
  if (!mouths.every((m) => m && typeof m.call === "function")) throw new TypeError("voiceClaimsParallel: each mouth is { name, call }");
  if (typeof read !== "function") throw new TypeError("voiceClaimsParallel: the reader (read) is injected");
  const calls = mouths.map((m) => m.call);
  const nameOf = (i) => mouths[i]?.name ?? String(i);
  const out = [];
  for (let i = 0; i < (claims ?? []).length; i++) {
    const claim = claims[i];
    let slot = i % calls.length;
    const tried = [];
    let budget = retries;
    let voiced = null, verdict = { verdict: "unvoiced", detail: "no attempt" };
    while (true) {
      voiced = await voice(calls[slot], claim, temperature);
      verdict = verifyVoiced(voiced, claim, read, index);
      tried.push({ mouth: nameOf(slot), verdict: verdict.verdict });
      if (verdict.verdict === "matched") break;
      if (budget <= 0) break;
      // escalate to a mouth not yet tried (mechanical rotation — the elenchus
      // routes, never a model)
      let next = null;
      for (let k = 1; k <= calls.length; k++) { const c = (slot + k) % calls.length; if (!tried.some((t) => t.mouth === nameOf(c))) { next = c; break; } }
      if (next === null) break;
      budget -= 1;
      slot = next;
    }
    const row = { claim, voiced, verdict, attempts: tried.length, mouth: tried[tried.length - 1]?.mouth ?? nameOf(slot), tried };
    out.push(row);
    if (onClaim) onClaim(row);
  }
  return out;
}

/**
 * The differential — the difference the dispatcher made, per row.
 *   recovered       — failed on the assigned mouth, matched on a later one
 *   matched         — matched on the assigned mouth (no escalation spent)
 *   no-difference   — failed on EVERY mouth tried (a born-gate/extractor
 *                     finding, not a mouth problem — no mouth made a difference)
 */
export function differential(row) {
  if (row?.verdict?.verdict === "matched") return row.tried.length > 1 ? "recovered" : "matched";
  return "no-difference";
}