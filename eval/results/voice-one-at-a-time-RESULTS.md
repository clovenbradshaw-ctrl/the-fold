# voice-one-at-a-time — the calibration, and the two-mouth parallel

*2026-09-12. `eval/voice-mouth-parallel.mjs`. The measurement the
one-proposition-at-a-time note (`one-proposition-at-a-time-note.md`) named as
the gate before tuning: run `voiceClaims` over REAL material, read the
matched/drift/unvoiced rates, the re-ask rate, and the cost — and answer the
CPU-model question directly: because the units are so narrow (one claim, one
sentence), does a tiny IN-PROCESS CPU mouth voice the record nearly as well
as the 2B server mouth? And how could BOTH be used in parallel?*

## Setup

- Material: `pg2600.txt` (War and Peace), 120 passages, the real constitutional
  reader (`eoreader7/native/organs/index.js` — `makeRelationReader` +
  `makeReferentIndex`, the exact bundle `holon.test.mjs`/`authorship-null.mjs`
  build). Claims from `expectationFrom` over the index's own referents:
  20 claims, 8 probes.
- The verifier: `voice.js::verifyVoiced` — mechanical, identical across arms.
  Only the MOUTH differed. B1 held: 0/20 addresses in any mouth prompt.
- Arms (same claims, same verifier):
  - `gemma2:2b` — Ollama (the proof's own model), temperature 0.
  - `SmolLM2-360M-Instruct` q4 — `@huggingface/transformers`, in-process,
    pure CPU, temperature 0 (greedy), the same chat-template invocation the
    model's own pipeline applies.
  - `phi3:mini` — Ollama, size bracket. **Disqualified:** >600s for 20 claims
    (timed out) on this machine's CPU. Not a mouth here.
- Commands: `node eval/voice-mouth-parallel.mjs --arm <gemma2|smollm> --claims 20
  --probes 8 --passages 120 [--hybrid] [--dump]`

## The rates

| mouth | n | matched | drift | unvoiced | contra | re-ask | median/claim |
|---|---|---|---|---|---|---|---|
| gemma2:2b (Ollama) | 20 | 17 (0.85) | 2 | 1 | 0 | 3 | ~1–18s* |
| SmolLM2-360M CPU | 20 | 11 (0.55) | 5 | 4 | 0 | 9 | 1.09s |
| hybrid (both, escalation) | 20 | **19 (0.95)** | 1 | 0 | 0 | 5 esc. | ≈ gemma2's stream |

\* gemma2's per-claim time ranged 1.0s–18.6s median across runs on this shared
machine (Ollama on CPU, contended); the CPU mouth's 1.09s was stable. Timings
are indicative only; the matched-rate numbers are the robust signal.

## The findings

1. **The narrow-unit thesis holds.** A 360M in-process CPU mouth voices the
   record's own claims at 0.55 matched with the SAME mechanical verifier that
   gives gemma2:2b 0.85 — at ~17× less latency. The spotlight grain (one
   claim per call) is what makes a tiny mouth usable at all.

2. **Escalation recovers it fully — and beats either model alone.** The
   work-stealing dispatcher (both mouths on one queue CONCURRENTLY, claims
   alternated mechanically, failures escalated to the other mouth): 5 CPU
   failures escalated, **5/5 fixed by gemma2:2b**, final matched **0.95**
   vs 0.85 gemma2-only. The two mouths' failure sets are disjoint enough
   that the pair out-performs the better singleton. The routing is
   mechanical end to end (alternation + the elenchus) — G2 held, no
   model ever decided routing.

3. **The parallel ceiling is the better model, not the sum.** Hybrid wall ≈
   gemma2's own wall (the slow-but-better stream is the bottleneck; the CPU
   stream idles after its quick half). So the honest value of the CPU mouth
   is NOT turn-latency — it is (a) quality via escalation, (b) offload of a
   real share of the queue, (c) running on a SECOND resource while Ollama
   does the big-grain synthesis the spotlight can't chop (MECHANICAL-
   COVERAGE's generation-dependent cases).

4. **The extractor debris floor.** 4 of 20 claims (20%) are verbless
   fragments the relation reader produced (`turning to Anna Pávlovna`,
   `Pávlovna Schérer on the contrary`) that NO mouth can voice as a
   sentence — they only match when the mouth echoes the words and
   span-overlap fires. This is the P74/P83 subject-span wall, unchanged.
   The CPU mouth's real deficit on VOICEABLE claims is 5, not 9.

5. **The fixed voice prompt plants its own echo (P55, measured).** Three of
   the CPU mouth's five voiceable drifts carry the word "sources" —
   `"The sources state that Prince Vasíli to Anna Pávlovna."` twice, and
   `"went up to the sources."` The mouth's own instruction ("the sources
   state…") taught it the apparatus word. Same law, one level in: a prompt
   that names the apparatus produces apparatus. G6's subtraction is the
   named fix (say "the record holds" or nothing), to be re-measured before
   trusting.

6. **Re-ask on the same mouth recovers nothing.** All 9 CPU failures were
   re-asked once on the CPU mouth and none recovered — a mouth's failure is
   a habit, not a slip. The re-ask budget belongs on the OTHER mouth
   (escalation), which is exactly what the dispatcher does.

## The failure taxonomy (the eyeball the note demanded)

From the dumped rows (`eval/results/voice-mouth-parallel.json`):

- **apparatus echo (3):** `"The sources state that…"` / `"went up to the
  sources"` — the prompt's own words, voiced back.
- **role inversion (1):** claim `she glanced at Anna Pávlovna` → voiced
  `Anna Pávlovna glanced at her` — the 360M resolved the pronoun by name and
  flipped the argument order.
- **compound restructure (1):** `Prince Andrew screwed up his eyes and turned
  away` → `Prince Andrew's eyes turned away, and he screwed up his face` —
  a compound claim re-arranged by the mouth.
- **fragment echo (4):** debris claims → the mouth echoes the fragment, the
  verifier extracts nothing. Unvoiceable by construction.

## Disclosed limits

- Timings: shared machine, Ollama on CPU, wildly variable (gemma2 median 1s
  one run, 18.6s another); phi3:mini >10min/20 claims and was dropped. The
  CPU model's timing is the stable one.
- The verifier's 0.50 span-overlap and the `STOP` list remain DECLARED, not
  tuned — this run is the calibration they were waiting on; tuning them
  against this review (II.23: the verifier must move matched without
  manufacturing it) is the named next step, not done here.
- Matched is bounded by extractor noise; the 0.95 hybrid is 19/20 on THIS
  claim set, not a licence.
- One hybrid row remained drift (not dumped); its claim is unknown — a
  rerun with `--dump` under `--hybrid` is the next measurement if it matters.

## What the experiment licenses for the wiring

The dispatcher shape (concurrent queue + mechanical alternation + escalation
to the better mouth) is measured and works. Where it plugs in: the `voice`
loop in the turn (the note's gap 1), with `retries` on the primary mouth
spent as ESCALATION to the other mouth instead of a same-mouth re-ask, and
the CPU mouth's 0.55 on voiceable claims meaning ~half the queue leaves
Ollama free for the grain that needs it.

## Wired, same day — the dispatcher organ, the differential, and the two gates

### The organ: `voice-parallel.js` (`voiceClaimsParallel`, `differential`)

The measured dispatcher, as tested code: two or more mouths on one claim
queue, mechanical alternation, escalation on failure, **every row carrying
its attempt trail** (`tried: [{mouth, verdict}]`) so the online calibration
can spend the differential claim by claim. `differential(row)` reads the
trail: `recovered` (failed on the assigned mouth, matched on a later one —
the second mouth made a difference), `matched` (no escalation spent),
`no-difference` (failed on EVERY mouth — the finding belongs to the born
gate / extractor, never to a third mouth). `voice-parallel.test.mjs`, 5/5:
the earning control resolves (two mouths with DISJOINT failure sets recover
the union no singleton reaches, while each singleton reaches 3/6); the
earned-vs-measured case is pinned (recoveries are real but worthless when
the better singleton matched the whole set — the trail is what makes that
comparison computable); no-difference stays typed; retries bound escalation;
B1 holds (no address reaches any mouth). voice.js itself is untouched.

### The gates, measured (`eval/voice-structure.mjs`, model-free)

**DMD over the claim stream.** `contextualModes` on the claim trajectory
resolves: measured window **22/22** — at this size the gist is NOT
compressible, forgetting any claim changes the decomposition; 21 modes of 22
observations, 20 oscillatory, all fast-decaying (ρ≈0.18). The spotlight's
grain is the material's own answer, and here the material says: carry the
whole set. A shallow grain is licensed only where the dynamics say so —
the streaming (Hemati) formulation on longer streams is the named future
measurement, not faked here. A sparse stream degrades to NaN eigenvalues and
says so (DEGENERATE) rather than printing a false mode.

**Born-gate feedback.** The live verdict stream is an evidence channel for
`reviewEntities` (P40): grouped per subject, **3 subjects lapse by the
fragment-echo signature** (the mouth can only echo <4-word fragments of
their claims) — `turning`, `Pávlovna Schérer`, `had` — removing 4 claims
from the voice queue that NO mouth could ever voice because the referent
was never cleanly born. The lapser is the fragment signature, never a bare
drift: `Prince Andrew`'s single compound drift and `went`/`she`'s single
drifts are kept (a mouth slip, not debris). Verb-forms as subjects
(`turning`, `went`, `had`) are the extractor's own misfire, the P74/P82
subject-hygiene wall — the difference that makes a difference is the lapse,
not another mouth and not a better prompt.