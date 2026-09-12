# Note for the agent building the voice pipeline

*2026-09-11. Handoff. `voice.js` proves the claim-atomic mouth: the record
authors the claims, the mouth voices ONE proposition per call, and the record
verifies each voiced sentence against its claim BEFORE the next is handed
out. It ran end-to-end against a REAL local model (gemma2:2b via Ollama,
temperature 0) — the record authored "The Kessington | report | put the
harbor figure at 12%…", the model voiced it as one sentence, the record
verified it as the same claim (exact key match). This note is everything the
pipeline-builder needs to turn that proof into the production turn.*

---

## 1. The shape

Instead of the mouth free-drafting a paragraph that is then checked post-hoc,
the turn is a loop:

```
expectationFrom(chunks, question, read, index)  →  the record's claims (the skeleton)
    for each claim, ONE at a time:
        claimVoicePrompt(claim)     →  the mouth's input (claim's words, NO address)
        call(messages)             →  the mouth's ONE sentence
        verifyVoiced(sentence, claim, read, index)  →  matched | unvoiced | drift | contradicted
        matched → keep, hand out the next claim
        not matched → re-ask (bounded), then land on the record, never shipped as voiced
```

The authorship ratio approaches 1 by construction: the mouth asserts nothing,
it only words. This is the skeleton-first turn (`THE-HOLOGRAPH.md` §5) made
literal.

## 2. The API (all in `voice.js`)

- `VOICE_SYSTEM_PROMPT` — the mouth's whole instruction (fixed prose).
- `claimVoicePrompt(claim)` → the one-claim user message. **The claim's `at`
  never reaches the mouth (B1); the record keeps every address.**
- `verifyVoiced(sentence, claim, read, index, { sameAct })` → the verdict:
  - `matched` — exact key, OR same label (or `sameAct`) with both ends
    sharing ≥50% significant content (`span-overlap`);
  - `unvoiced` — no claim extracted (the mouth hedged or narrated);
  - `drift` — a different claim (ends or the act changed), with the detail;
  - `contradicted` — the sentence asserts the opposite.
- `voiceClaims(claims, call, { read, index, retries = 1, temperature = 0, onClaim })`
  → the loop; `call(messages, { temperature })` is the mouth (Ollama/OpenAI
  chat shape); `read`/`index` are the SAME relation reader and referent index
  the material is read with. Returns `[{ claim, voiced, verdict, attempts }]`.

## 3. The grain — exact on the ACT, tolerant on the END-SPANS

The one design fact that makes verification work: **the mouth may rephrase the
referents' phrasing, never the act.** `verifyVoiced` is exact on the label
(the verb slot) and tolerant on the end-spans (significant-token overlap,
threshold 0.5 declared, `STOP` list in voice.js). Measured:

- "…12 percent in the spring quarter" for "…12% for the spring quarter" → **matched** (span-overlap).
- "…the Kessington *document*…" for "…the Kessington *report*…" → **drift** — changing the verb is not voicing, it is editing, and it is caught.
- "Dredging runs through March…" → **drift** — a different claim.
- "In summary, the matter deserves consideration…" → **unvoiced** — a hedge.

## 4. The walls the pipeline must not break

- **B1**: never put a claim's address in the mouth's prompt. The record attaches addresses after (cite.js).
- **The mouth is small**: a 2B model at temperature 0 voices the claim almost verbatim — which is what you want (it is the record's voice). A bigger or looser model will paraphrase more aggressively → more `drift` → more re-asks; the `retries` budget bounds this.
- **The verification is only as good as the extractor**: the relation reader's spans are fragile across paraphrase (P74 / MINE-1's `unbound` plateau is this wall). The span-overlap tolerance is the honest compromise; if the pipeline needs act-paraphrase tolerance ("report"≈"document"), that is the `sameAct` widening — `createLemmatizer`/UniMorph (morphology.js) — inject it and measure it, never assume it.
- **`firewall.js` should scan `VOICE_SYSTEM_PROMPT`**: it is fixed prose handed to the model — it must carry no apparatus vocabulary and no addresses (the same scan `assertModelFacing` already runs).

## 5. What the pipeline must decide (the gaps this note names)

1. **Where it plugs in.** Replace the free-draft path in `runPart` (or the
   `piece` machinery) with `voiceClaims` over the expectation's claims, then
   assemble the verified sentences into the answer and let `cite.js` attach
   the addresses. The `onClaim` callback drives progress and the reflex
   ledger (`expected` / `witnessed` / a new `voiced` act) — the turn's story
   stays on the record.
2. **Cost.** One model call per claim (plus re-asks). A 3-claim answer = 3
   calls; a long piece = claims × sections. Weigh this against the
   verification gain — every sentence is bound before the next exists. Tie
   `retries` to the depth slider's budget (P123) so strain governs it.
3. **Assembly.** The output is a sequence of verified sentences, not one
   flowing paragraph. The pipeline owns the ordering, the connectors, and the
   section structure — the prose join is a rendering concern, never a
   re-wording of the claims.
4. **The drift/unvoiced/contradicted rows land on the record** — like
   `witnessLearned`, they are findings, never silently dropped. A claim the
   mouth cannot voice is a typed gap, disclosed.
5. **Real-material calibration.** The 0.5 span-overlap threshold and the
   `STOP` list are declared, not measured. Run `eval/voice-one-at-a-time.mjs`
   over a real book's expectation and read the matched/drift/unvoiced rates
   before tuning anything — and II.23 it (the verification must move the
   authorship ratio, or the tolerance is wrong).

## 6. The measured guarantees it ships with

- `voice.test.mjs`, 3/3: a faithful paraphrase matched; a drift and a hedge
  caught; B1 holds (the address never in the prompt); the loop re-asks a
  non-voiced claim under the budget.
- The real-model run: gemma2:2b voiced the claim verbatim and matched on the
  exact key. The proof is real; the pipeline is the next step.

---

*Honest status: this is the claim-atomic turn as a pure, tested organ with a
real-model proof, NOT yet wired into the turn. The wiring (where it replaces
free-draft, the assembly, the ledger acts, the budget tie-in) is the pipeline
builder's work — and every wall above is the contract it must hold.*