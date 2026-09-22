# The One-Model-In-One-Place Principle

Status: design document, recorded verbatim as the user wrote it
(2026-09-22), companion to SERVING-POLICY.md's ladder. See the status note
at the foot for what's already real infrastructure in eoreader7's Heimdall
versus what is asserted but unverified from this repo.

## The principle

**At any moment, one model is resident in each serving tier — and each model has exactly one place. A model swap is a declared transition (unload, then load), never an eviction and never a competition.**

Concretely, three binds:

1. **One resident per tier, at a time.** The GPU tier holds the GPU mouth; the CPU tier holds the CPU mouth; the witness tier holds the witness. They are never both hot in the same tier, and nothing else squats the memory they need.
2. **One model, one job.** A model serves one placement, with that placement's own feeding discipline and its own probe. The chat mouth is not also the witness; the witness is not also the chat mouth. A model doing two jobs means both jobs contend and both degrade.
3. **A swap is a declared event, never a discovered one.** The ladder moves from tier to tier by deliberate unload-then-load with a measured transition — never by a silent eviction that the next turn pays for.

## Why it is load-bearing (measured)

- The traffic-jam post-mortem is this principle's falsifying control, already fired: gemma2:2b reloaded 23× (6.2 s each) because olmo2:7b's pings kept evicting it — the jam was not a dead server, it was *competing residency*. One model in one place would have made the storm structurally impossible.
- Lesson 6: "the resident/warm model wins — smallest ≠ usable" and "every window change is a full reload." Residency is the product; a swap is a reload.
- Lesson 36's one-window rule: the reload that hurt was an **eviction**, not a re-window — eviction is the principle being violated silently.
- Per-model wedges (§35) and mid-run GPU squatters (contention notes) are the same failure at the same boundary: a second model in a tier that the first was promised.
- `model-swap-diff` is what makes the principle *safe* rather than merely tidy: the record is model-independent, so a deliberate swap never changes what is true — only the voice.

## What it buys

- The serving ladder degrades cleanly: when the box is busy, the GPU tier unloads to the CPU tier — *one* transition, bounded and measured — instead of a multi-model scramble that makes everything slow.
- The never-delayed promise holds: a tier can answer immediately precisely because it is the only resident in its tier.
- Probes stay honest: each tier's probe tests its own work model, and there is never a second model present to confuse the reading.

## Falsifying controls

1. Under traffic-jam conditions, the resident model's `loaded` state is stable across a full working window — zero `evicting` in the daemon log (the control the 2026-09-21 fix already ran).
2. The ladder's tier transition shows exactly one unload and one load in sequence, no third model appearing in `/api/ps` between.
3. A model that is asked to do a second job while holding its first must be refused at admission with the reason "already placed" — a typed refusal, not a silent double-duty.

---

## Status against the actual code, as of 2026-09-22 (added, not part of the user's original text)

Checked directly in `../eoreader7/heimdall.mjs` and this repo's `model-routing.js`/`app.js` before writing anything further — none of this was assumed:

- **Residency infrastructure is real and already live.** Heimdall keeps a
  model warm via Ollama's own `keep_alive` (`api/generate` with
  `keep_alive: "1h"`), has an explicit unload path (`keep_alive: 0`), and
  gates concurrent turns of one model family (`familyCap`, a live,
  adjustable setting — `saturated`/`expected_wait` both step it down).
  This is real machinery this framework's binds could be checked against,
  not a green field.
- **"One model, one job" already holds for the witness.** `model-routing.js`
  declares `WITNESS_MODEL` (OLMo-2-1B) separately from the chat/S2 model,
  and `app.js` resolves it independently — the witness has never shared a
  placement with the chat mouth in this codebase's own routing.
- **One window per model is already enforced for the chat mouth.**
  `declaredWindowFor` (P232) pins `num_ctx` per model rather than leaving
  it to Ollama's own memory-adaptive default — the exact failure mode
  bind 3 warns about ("every window change is a full reload") is already
  closed for that one axis.
- **Not verified from this repo:** whether Heimdall's family-cap/keep_alive
  machinery actually PREVENTS a silent eviction under real contention (the
  traffic-jam reproduction in control #1), whether a swap is genuinely
  ONE measured unload-then-load with nothing else appearing in `/api/ps`
  between (control #2), or whether a double-duty placement is refused with
  a typed "already placed" reason anywhere (control #3) — that refusal
  shape does not appear in a direct grep of heimdall.mjs. These three
  controls are Heimdall's own to run; they were not run as part of this
  note, and nothing here should be read as claiming they passed.

This document and SERVING-POLICY.md's own status section share one open
item: control #1 (the busy-box / traffic-jam reproduction) is named by
both frameworks as the single measurement that would validate the most
of this at once. It has not been run.
