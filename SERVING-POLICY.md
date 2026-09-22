# The Output Always Comes — a serving framework

Status: design document, recorded verbatim as the user wrote it
(2026-09-22). Not the law yet — POLICIES.md P247 covers a real but partial
slice of tier 3/4 below (reactive hop-on-failure, not the proactive,
stamped, revisable framework this describes). See the status note at the
foot of this file for exactly what is built, what is not, and the two
falsifying controls this framework itself says must run before it ships.

## 1. The principle

**Every turn produces an output, on time, at whatever tier the box can honestly afford — stamped with its tier and its revisability. No turn is left waiting on a resource the box does not have; the output degrades in surface, never in truth, and never in disclosure.**

The void is always filled — forward by the mechanism or a mouth, backward by asking the person back — never left empty. A queue is not an answer; it is a hold placed on one that could already be served.

## 2. Why it is load-bearing (the measured ground)

- The record is model-independent; only the mouth's additions differ, and those are marked and driven to zero (`model-swap-diff`). **Content does not degrade when the realization mouth changes.**
- "Mouths are interchangeable; the scaffolding is the product" (`harness-baseline`). The pipeline's correctness lives in the mechanism, not in any one model.
- The traffic-jam post-mortem: refusing-with-a-wait was the system holding an output hostage to a box that was already the cause of the delay. Serving from a tier that cannot cause the jam is self-consistent.
- The mechanical system answers many asks at `usage {0,0}`; the swarm answers hard meaning with zero tokens. A model is never required for an output to come.

## 3. The serving ladder (de-escalate placement, never stall)

| Tier | Served by | When | Envelope stamp |
|---|---|---|---|
| 1 · Mechanism | arithmetic, race, record, fold replay, hard-meaning swarm | the mechanical system knows it | `tier: full`, `usage {0,0}` |
| 2 · GPU mouth | gemma2:2b, resident | box idle | `tier: full` |
| 3 · CPU mouth | Llama-3.2-1B (or OLMo-2-1B), RAM-resident | box busy (saturated/memory-pressured/eviction storm) | `tier: provisional, revisable: true, revisableBy: gemma2:2b` |
| 4 · Person's device | WebLLM Llama-3.2-1B in-browser | server busy or the person's own machine | `tier: provisional` (client-stamped) |
| 5 · Ask-back | the person fills the void | void under-specified — nothing serves it | `asksBack: true`, mechanical |

Tier selection is mechanical (the same signals heimdall already measures: CPU idle, free pages, wedge state), never a model judgment.

## 4. The revisable contract

- A provisional answer is the **same record, same grounding, same fact gate** — only its realization is cheap. Its additions are counted exactly like a full-tier mouth's.
- It rides `provisional: true` plus a re-draw hook. When the box frees, the pipeline re-draws from the same record with the full mouth; the person is offered the revision; the record keeps both.
- Revisability is a property of **surface**, never of content. Nothing true is ever retracted by a re-draw — only the voice changes.

## 5. Gates that must not be crossed

- **The fact gate never skips.** A provisional mouth's output is still read sentence-by-sentence against the record; its unbacked additions are still marked and counted. Degradation never buys silence on the leak.
- **AntiStrauss never bypasses.** The cheap tier is still a gated draw, not a raw passthrough.
- **Tiers are always disclosed.** The person can always tell which mouth said it and which tier is pending.
- **The probe tests the work model.** A per-model wedge in the CPU tier is invisible to a gemma probe (§35); the monitor for each tier speaks to that tier's own model.
- **Busy never becomes a hang.** A tier that cannot answer in bounded time is not a tier; it is demoted.

## 6. Falsifying controls (the ladder is a claim, not a fact)

1. **Busy-box run:** reproduce the traffic-jam conditions with the CPU mouth as the serving tier — every turn answered in bounded time, zero wedges, zero reload storms. If the CPU mouth hangs, tier 3 is not real.
2. **Llama-3.2-1B clean score:** run it through the mouth-minimal-feed battery against gemma2:2b's 77%. If it lands near there, the ladder ships; if soft, the CPU tier becomes OLMo-2-1B (already calibrated on select).
3. **Provisional parity:** a provisional and a full-tier answer to the same ask must fact-gate to the same record-backed claim set; a difference is a broken degradation, not a revision.
4. **Ask-back still fires:** a genuinely under-specified void is never "served" by a provisional guess — it goes to the person. A provisional mouth that invents what the void left open concedes the framework.

## 7. What this replaces, and what stays

It replaces **refusal-with-a-queue** for anything the mechanism or a resident mouth can serve now. The queue and SLA zipper survive only for jobs that genuinely require the full mouth (long-form essays, composition) — where a provisional answer would be a lie about the grain, not a degradation. Everything else is governed by one sentence:

**An output always comes — on time, at the honest tier, stamped with what it is and what it could become.**

---

## Status against this repo, as of 2026-09-22 (added, not part of the user's original text)

Read against the-fold's real code before anything here is built further:

- **Tier 1 (mechanism).** Already real and load-bearing — arithmetic.js,
  the record/AnswerRecord (P100), fold replay (P99), the mechanical doors.
  Nothing to add.
- **Tier 2 (GPU mouth, gemma2:2b resident).** Already real — the primary
  eoreader7-engine path and the in-browser Ollama path both serve it.
- **Tier 3 (CPU mouth) and Tier 4 (person's device / WebLLM).** POLICIES.md
  **P247** ships a REAL but PARTIAL slice: `huginn.js`'s hop ladder now
  reaches the in-tab TF (CPU) and WebLLM (GPU-in-browser) rungs when the
  primary box answers `unserved`. This is REACTIVE (hop after a failure
  is observed), not PROACTIVE (this framework's own "box busy → serve tier
  3 immediately, never attempt tier 2 first"), and it carries none of this
  framework's stamping (`tier`, `provisional`, `revisableBy`) or its
  re-draw-when-free loop. Both are real, unbuilt work.
- **Tier 5 (ask-back).** P244's no-oracle-mode already refuses to answer a
  materialless, claim-less turn from nothing — the same SHAPE as
  "ask-back", not yet reframed as this ladder's own formal tier or stamped
  `asksBack: true`.
- **None of the falsifying controls in §6 have been run.** In particular,
  Llama-3.2-1B has not been scored against the mouth-minimal-feed battery
  in this repo, and the busy-box stress run has not been reproduced here.
  Building the proactive ladder and the revisable contract before either
  control runs would be exactly the "claim before the null" move this
  project's own house rule refuses elsewhere.

Recommended next step, not yet started: run control #1 (a reproduction of
the traffic-jam conditions with the CPU mouth serving) and control #2
(the battery score) before building the proactive tier-selection probe or
the provisional/revisable envelope — both are real, scoped, separate
passes from P247.
