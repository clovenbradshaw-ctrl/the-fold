# Chat policy — what a turn needs, and what was measured

This is not a new law. Everything binding here already lives in
`POLICIES.md` and `READING-POLICY.md`, scattered across a dozen entries
each aimed at a different tier. This document exists because "does
talking to this instrument feel trustworthy and natural" is a single
question a reader asks, and answering it today means reading forty-six
numbered policies to reassemble the parts that touch chat. This file is
that reassembly, plus everything one investigation pass (2026-08-26,
"chase getting Claude like chat with the local model") measured live and
did not have anywhere else to go. Where something is already fully
documented elsewhere, this file summarizes it and points rather than
re-deriving it — the same discipline CLAUDE.md already holds itself to.

Nothing below authorizes skipping the source policy's own detail. When
this file and POLICIES.md disagree, POLICIES.md is the law.

---

## Part I — what a turn needs (the standing architecture, summarized)

### The shape of a turn: fast first, checked only when it earns it

P34. A turn is two passes on the SAME model (never a fast model for S1 and
a bigger one for S2 — that would confound "does the checking apparatus
help" with "is a bigger model just better"):

- **S1** (`runFastPass`, `S1_SYSTEM_PROMPT`) — no retrieval, no material,
  no checking. Recent history only, windowed (below). Renders immediately.
  Framed in first person ("give YOUR first take") so a later S2 pass reads
  as continuing its own thought, not narrating a second agent's
  intervention — measured against real models: third-person framing makes
  S2 announce itself ("A first pass answered..."); first-person framing
  makes it just answer.
- **The gate** (`needsSystem2`) is mechanical, not a second model call:
  `extractCheckableAtoms(s1Text)` — does this reply assert anything a
  reader could check? Empty or uncheckable (small talk, an opinion, a
  closing) → S1 stands as the whole turn. Anything checkable → S2 runs.
- **S2** is the full existing pipeline (`runHolonicTask`), unchanged,
  handed S1's own text as `priorPass` so it can confirm, extend, or
  correct rather than starting cold.

This is why a real greeting or a "thanks, that's all" should be fast:
nothing about the architecture requires the heavy pipeline for a turn
with nothing to check. Measured this pass (below): it is.

### Context stays bounded — never grows to compensate for recall failure

READING-POLICY P1 ("activation decays, identity does not, recall is
retrieval") and P45 ("the store is append-only; the prompt is a
projection"). Two separate claims, easy to conflate:

- The **store** (`state.summary.records`/`.folds`) is unbounded and never
  truncated — P45. Nothing is ever forgotten at the record layer.
- What a PROMPT actually shows is a bounded PROJECTION of that store —
  `projectRecords`/`projectFolds`, capped at `RECENCY_WINDOW`/
  `MAX_FOLDS_IN_PROMPT`.
- `chatHistory` passed into any turn function is **windowed at the call
  site**, not raw: `state.history.slice(-present)`, where
  `present = presentWindow(state.regime, RECENCY_WINDOW)` — 4 messages at
  the calm baseline (regime 0), contracting toward 2 under a measured
  startle (aperture.js). This windowing happens at BOTH the S1 call site
  and the S2 call site in `app.js` — a caller that reconstructs this
  pipeline outside app.js (an eval driver, a probe) must window
  `chatHistory` itself or its own measurements are about the harness, not
  the product. See "A bug in our own probe," below — this was not
  theoretical.
- Retrieval is capped per part (`PASSAGES_PER_PART = 3`) regardless of how
  long the conversation has run. A turn late in a long conversation should
  cost roughly the same as an early one, structurally — never enlarge the
  window to fix a recall failure; the defect is in retrieval or
  coreference (P1's own rule), not in how much is carried.

### The grounding ladder — what checks a draft before it ships

Full detail: CLAUDE.md's own "grounding ladder" section, POLICIES.md
P12/P17/P20/P30/P31/P41/P42/P43. The short version, bottom to top:
address (`checkCitations`) → quotation (`quotes.js`, drift repaired
mechanically) → atom (`checkGrounding`/`corroborateAtoms` — every
checkable figure/name against the retrieved bytes, numbers checked
against their local sentence-level "company," not bare occurrence) →
relation (`hypergraph.js` — the material's own SVO edges, five typed
verdicts) → the world (`proof.js`, P13's web egress, counted perspectives
never a bare bit).

**A cell reports what it checked, or says it did not check — never a
check it never ran (P41).** This governs every tier above, including any
future one: partial coverage is a disclosed gap, not silently generalized
into "clean."

### The correction loop, and its one disclosed hole (2026-08-26)

`holon.js`'s `runPart`: a draft is classified into one of five failure
modes (`echoed`/`reproduced`/`narrated`/`incomplete`/`unsupported`), each
gets `maxCorrections` (1) attempt, and a mechanical fallback exists for
when correction fails — but **the fallback only fires on
`echoed`/`reproduced`/`narrated`, never on a plain `unsupported` draft
that survives its one correction attempt.** A draft that is original
prose (not an echo, not a photocopy) but still factually wrong after one
correction try ships exactly as it is, with the checking apparatus's own
finding simply not acted on further.

This is deliberate-shaped, not an oversight with an obvious fix: this
repo has an equally real, hard-won rule against the OPPOSITE failure (the
"Propose-then-check" section of CLAUDE.md — an over-eager correction loop
once deleted a TRUE fact, a real mayor's name, because the material didn't
confirm it). `unbacked` (true-but-unconfirmed) ships, marked, by design.
"Dostoevsky wrote Pierre Bezukhov" is not unconfirmed-but-true, though —
it is false — and the pipeline currently has no mechanical way to tell
those two cases apart once one correction attempt has failed, short of an
actual external check (the witness/proof-seeking tiers, P32/P13, which
are not in this loop).

**Open, undecided:** whether to (a) widen the mechanical fallback narrowly
— only for an `unsupported` atom that is a proper name sharing nothing
with the retrieved passages — or (b) widen it broadly — any post-correction
`unsupported` survivor falls back, same as echo/reproduction/narration.
(b) is simpler and risks suppressing genuine unconfirmed-true knowledge
the way the Nashville-mayor case already warns against; (a) is narrower
and needs its own test built specifically to distinguish "false claim"
from "true unconfirmed claim" before it ships, mirroring the regression
this repo already keeps for the mayor case. Not built either way.

### Provenance is not optional, anywhere in this ladder

Stated directly, mid-session, when a proposed fix reached for external
context without a clear source: **"the model should NEVER have anything
without provenance."** This is not new — it is L5 ("a compliance-critical
fact is never left to the model's own instruction-following") and every
`giver`-tagged closed class this repo already carries (`priors.js`'s
`_META.giver`, `hyperlexicon.js`'s own refused-without-a-giver
declarations, P19's provenance-carrying priors) — restated here as the
one rule that governs EVERY future addition to what a chat turn is shown,
including whatever eventually closes the correction-loop gap above or
brings in external (Wikipedia-class) grounding. Concretely: anything
injected into a turn's context needs an answer to "where did this come
from, and can a reader check it," or it does not go in. A hardcoded
assumption is not provenance. A model's own guess is not provenance. The
source file's own declared bytes are. A fetched page with its URL and
retrieval date is. See the `declaredIdentity` account below for what this
looks like built.

---

## Part II — what this pass measured, live (2026-08-26)

Investigation: "chase getting Claude like chat with the local model,"
against `gemma2:2b` on CPU-only local Ollama, using the real
`twoPassTurn`/`runHolonicTask` pipeline (not a simplified stand-in),
composed from eoreader7's `native/adapters/text/` organs standing in for
the unavailable `../eoreader6.1/` sibling — confirmed elsewhere this same
pass to be name-for-name compatible for exactly this bundle
(`splitSentences`, `extractSurfaces`, `discoverReferents`, `namesCorefer`,
`diaNorm`, `resolvePronouns`, `discoverRelationVocab`, `extractRelations`,
the closed-class priors).

### A clean run's real numbers

A hand-written, varied 7-turn conversation (greeting → real question →
pronoun follow-up → opinion ask → short factual follow-up → vague
continuation → close) — the point being a shape an actual person's
conversation has, not a second model free-associating questions (see
below):

| turn | shape | path | time | notes |
|---|---|---|---|---|
| 1 | "Hi! What can you help me with?" | S1-only | 3.2s | gate correctly stayed off |
| 2 | "Who is Pierre Bezukhov?" | S1+S2 | 13.6s | see the bug below |
| 3 | "What does he inherit from his father?" | S1+S2 | 11.3s | pronoun resolved correctly |
| 4 | "Most interesting thing about his character?" | S1-only | 3.7s | opinion — gate correctly stayed off |
| 5 | "How old is he when the novel starts?" | S1+S2 | 10.8s | |
| 6 | "That's interesting — tell me more." | S1-only | 3.6s | thin reply, see below |
| 7 | "Thanks, that's all for now." | S1-only | 2.8s | natural close |

Total: **49 seconds for the whole conversation.** `msgCount` per model
call plateaued at 6 and stayed there (2→4→4→6→6→6→6) — confirmed by
direct per-call instrumentation (every model call logs its own prompt
char count), not inferred from timing: the architecture's "context window
doesn't grow" claim holds under measurement, not just under design intent.

**Minor, real, not chased further this pass:** turn 6's reply to a vague
"tell me more" ("Twenty. Makes you think about all the life choices he's
about to make in that time, right?") is thin — a real conversational
partner expands meaningfully on a vague continuation prompt rather than
restating the last fact and adding one aside. Worth a look if chat feel
is revisited; not measured deeply enough here to diagnose a mechanism.

### A confound that made the first pass's numbers meaningless

The first run of this same probe showed wildly inconsistent timing (a
greeting took 61s; a real question took less). The cause was NOT the
architecture: a separate, unrelated memory-validation e2e run was still
executing concurrently against the same local Ollama instance, which
(confirmed: `ollama serve`'s `llama-server` runs `-np 1`, one request slot,
no true parallelism, on a 4-core box already at load average ≈ 3.9) queues
requests rather than running them in parallel. **House rule: never run two
Ollama-calling processes concurrently when measuring anything about
latency** — stop one first, or the numbers describe queueing, not the
pipeline.

### A bug in our own probe — chatHistory must be windowed to mean anything

The same first pass also passed the raw, ever-growing `chatHistory` array
into every model call, never windowed — unlike app.js's real call sites,
which slice to `presentWindow(...)` before every use (Part I, above). This
is a bug in the TEST HARNESS, not a finding about the product: an
un-windowed probe would show prompt size growing turn over turn in a way
the real app never does, and anyone building a future eval/probe against
this pipeline needs to replicate the windowing explicitly or their
measurements are about their own harness.

### The Pierre Bezukhov / Dostoevsky finding, in full

Asked "Who is Pierre Bezukhov?" against this repo's own War and Peace
fixture:

- **S1** (no material, by design): *"He's the main character in **The
  Brothers Karamazov** by **Dostoevsky**."* Wrong book, wrong author —
  Pierre Bezukhov is Tolstoy's *War and Peace*, the exact corpus loaded.
- **S2** (the full checked pipeline): *"Pierre Bezukhov is the main
  character in Fyodor Dostoevsky's novel The Brothers Karamazov."* — the
  SAME wrong claim, more confident, not caught.

Diagnosed directly against the real organs, not guessed: `checkGrounding`
run in isolation against that exact sentence DOES correctly flag
"Dostoevsky" and "The Brothers Karamazov" as `unsupported_claim` — the
check itself is not broken. The gap is the correction loop's mechanical
fallback (Part I, above), confirmed by reading `holon.js` directly. Root
cause, one level earlier: nothing in the material or the prompt ever told
either pass what book this actually is, so S1 had nothing but its own
confused prior to draw on, and S2's own independent draft — primed by
`priorPassFor(s1Text)`, which explicitly restates S1's wrong claim and
asks the model to "confirm, extend, or correct it" — sometimes just
confirmed it instead of re-deriving from the passages.

### The fix: `declaredIdentity` — real provenance, zero invention

Project Gutenberg's own front matter states `Title: War and Peace` /
`Author: Leo Tolstoy` in the exact file already loaded, before the same
`*** START OF THE PROJECT GUTENBERG EBOOK ***` marker `stripContainer`
already finds and discards (P5.3). `source.js::declaredIdentity` reads
that header (reusing the identical marker regex, factored into one shared
constant — not a second copy that could drift), pulls `Title:`/`Author:`
off it, and returns `null` — never a guess — when no such header exists.
`buildSourceBlock` surfaces it as its own labeled, addressed line ahead
of the passage text: `(the source file's own declared header — Title:
War and Peace, Author: Leo Tolstoy — pg2600.txt#0-797)`.

**Verified against the real pipeline twice, with two different random S1
hallucinations** ("Anna Karenina" one run, "The Brothers Karamazov" again
the next). Both times, with the fix in place, S2's real output was
"Pierre Bezukhov is the illegitimate son of Count Bezúkhov" — correct,
cited, `grounding.clean: true`, no trace of either wrong book. S1 is
untouched and will keep guessing (its own documented design, P34 — no
material, on purpose); the fix is that S2 no longer needs to trust or
repeat the guess.

Full account, files, and test coverage: POLICIES.md P46.

### The hyperlexicon red herring — named so it is not tried again

The first reach for "give the model real-world context" was "load the
hyperlexicon so it can answer with relevant Wikipedia info." Checked
directly before writing any code: `hyperlexicon.js` (present in
eoreader7's `native/kernel/`, referenced twice in this repo purely for a
shared numeric floor) is the **HL relation-composition-affordance
ledger** (P37) — which relation PAIRS may compose with which, e.g.
whether "governs" and "advises" are the same functional relation. It
holds no lexical, encyclopedic, or bibliographic content whatsoever.
"Loading" it would supply nothing relevant to "what book is this
character from." A future pass reaching for real-world/encyclopedic
grounding should not reach for this file — nothing here does what the
name suggests.

### What a real Wikipedia-grounding mechanism would need (unbuilt)

Named, not built. Per the provenance rule above, it cannot be a bare
fetch-and-trust: this repo already has the machinery — the web organ
(P13: `web.js` pure extraction, `explore-server.mjs` owns the one
egress, content-addressed with retrieval date) and the witness/
proof-seeking tiers (P32's `testimony.js`, P13's `proof.js` — verdicts as
counted perspectives, never a bare bit). The right shape for "let the
model check a claim against Wikipedia" is routing a flagged claim (most
naturally, a post-correction `unsupported` survivor — the same case named
in the correction-loop gap above) through THAT existing pipeline, gated
behind the SAME standing web-consent toggle (`state.web`) every other
automatic crossing already respects, never a new, second egress
mechanism. Two real design questions before this is buildable: what
triggers it (every `unsupported` survivor, or only ones shaped like a
factual/bibliographic claim), and how its provenance renders alongside
the material's own citations without conflating "the book said X" with
"Wikipedia said X" — this repo already keeps that exact distinction for
self-witness vs. sourced testimony (P39/BUILD-4's `crown.js`), and
whatever ships here should reuse that vocabulary rather than invent a
third.

---

## Open list (not authorization to build — a map of what's undecided)

1. Correction-loop mechanical fallback: narrow vs. broad widening for a
   survived `unsupported` verdict (Part I). Needs its own false-vs-true
   regression case before either ships.
2. Wikipedia/world grounding via the existing web organ + witness tier,
   gated on standing consent, with its own provenance rendering. Unbuilt.
3. Turn 6's thin reply to a vague continuation — real, minor, unchased.
4. `declaredIdentity` is scoped to Gutenberg's own header convention only.
   Generalizing to other declared-metadata conventions (an EPUB's own
   metadata block, a webpage's `<title>`/`og:site_name`, a CSV's own
   header row naming its source) is real, unattempted future work — each
   would need its own real, addressable provenance, not a guess dressed
   as one.
