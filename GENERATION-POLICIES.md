# Generation policy — producing output through a generator you do not trust

This is not a new law. Everything binding here already lives in
`POLICIES.md` (P14, P16, P23, P34, P51/P52, P55 among others),
`CHAT-POLICIES.md`, and the experiments they cite. This document is the
reassembly of the parts that touch GENERATION — how this instrument gets
correct output through a component that fluently produces incorrect
output — summarized and pointed at, never re-derived. When this file and
a source disagree, the source is the law.

**The scope claim, stated up front with its evidence.** These laws are
written to be model-agnostic: none of them names a property of a specific
model. The generators this project has driven — gemma2:2b, qwen2.5:14b,
and Qwen2.5-0.5B-Instruct — span a ~30× parameter range, and each of the
founding failure shapes was measured on at least one of them
(address-dropping on two models four sizes apart; task-description echo,
apparatus-vocabulary leakage and set-dropping on gemma2:2b; a wrong
product from qwen2.5:14b's own arithmetic; fabricated reasoning around a
correct verdict on Qwen2.5-0.5B) — measured per-model, not reproduced
across the whole range for every shape. L5's founding measurement is exactly this:
"two models four times apart in size ignored it on tabular material, zero
addresses across six turns." The honest limit: everything here was
measured on text LLMs. The laws are stated so they would apply to any
generator whose output is fluent-but-unwarranted (that is the only
property they use), but no non-text generator has been measured — that
generalization is design intent, not evidence.

**This is a standing document — read before building a generation path,
appended to after.** Amendments append; they do not rewrite. An
adversarial verification pass (23 figures located in sources) plus a
completeness critic ran the day this file was written; their corrections
— two source misattributions, four overstatements, three missing laws
(G6's voidLine specimen, G7b, G14) — are folded in.

---

## Part I — the root law and the ladder

### G1. A compliance-critical fact is never left to the generator's instruction-following

L5, the load-bearing law of this whole repo, rediscovered here by
measurement before it was read. Asking for an address after every claim
produced zero addresses; the fix was never a better prompt — `cite.js`
attaches addresses mechanically, `grounding.js` checks figures and names
against the bytes, `tables.js` computes tables the app already knows.
Every law below is a specialization of this one: whatever must be true of
the output is made true by machinery, and the generator's job shrinks to
the part machinery cannot do.

### G2. Compute what can be computed; generate only the remainder

The ladder, in `skills.js`'s own shape: **skill (zero model calls) →
slot-fill (one grammar-constrained call, validated) → model path**, every
descent a typed entry. The same shape at every scale:

- **Arithmetic** (`arithmetic.js`): "what's 17 times 24?" is never sent to
  a model — measured live, qwen2.5:14b answered 372; the product is 408.
  Detection claims a turn only when it normalizes to a pure numeric
  expression with zero free symbols; ambiguity ("N divided into M" — two
  live English conventions) is refused rather than risked backwards,
  because a wrong mechanical answer is worse than none (P52).
- **Tables** (`tables.js`): a table the app can compute is computed,
  captioned "computed, not generated".
- **The crown render** (`crown.js`): template-only, and its header states
  the reason as the general law — *"there is no free-text generation step
  for a wrong word to come FROM."* Every word is a claim's own
  subject/verb/object word read off the reading's `edges`, a witness name
  printed verbatim, or a member of a closed connective set.
- **The mechanical answer path** (`wikidata.js::renderHolders`): same, one
  register up — every word a label read verbatim from the giver, a date
  from a qualifier, the question's own terms, or a closed connective —
  with the refusal that makes it safe: see G13.

### G3. A directive about the task produces a description of the task — fix the framing, never the wording

The most-confirmed generation law in this repo — three independent
confirmations, each time by a model dodging a NEW wording a NEW way:

1. `holon.js`: "Write this part: the question. research Robert Macnamera"
   → "This prompt asks you to research Robert McNamara…". The note there
   states the general form: *prompt format matches output format; fed a
   description of the task, a small model answers with a description of
   the task.*
2. The cardinality-correction framing (P38): three successive wording
   fixes to a critique-of-your-draft prompt were each dodged differently
   (an echoed escape phrase, narrating the question, inventing a nearby
   name) — the fix was abandoning the critique FRAME for a fresh,
   uncritical re-ask carrying the confirmed facts as a stated given.
3. `experiments/facts-before-draft.mjs`, the cleanest measurement: an
   A/B/C comparison (material-only / facts-only / both) initially showed
   arm differences — then the production framing ("Write this part: the
   question. <q>") was identified as pure unearned ceremony for a flat
   question and removed, and **every arm went 6/6 with zero question-
   echoes across 18 trials**. The ceremony was confounding the
   comparison. What looked like a content problem was a framing problem.

Consequence for any prompt experiment: the framing is a confound to
remove FIRST, or every arm measures the ceremony.

### G4. Apparatus vocabulary is not generator-facing — the firewall is mechanical, not disciplinary

P55. The live app answered "The prompt specifically identifies Hannibal
Hamlin…" because `EXECUTE_SYSTEM_PROMPT` contained the literal phrase
"the prompt" twice, `FLAT_EXECUTE_SYSTEM_PROMPT` named "the passages"
three times — twice while INSTRUCTING the model not to mention them —
`CHAT_SYSTEM_PROMPT` reported a retrieval outcome to the model ("matched
no document to cite"), and `buildFactBlock` carried engineering
commentary ("7 of 97 sentence(s) with an extractable relation…") into a
2B model's context.
Telling a generator not to mention X while naming X three times is G1's
failure in its purest form. The mechanical fix is to not have the
vocabulary in the room: counts, coverage, retrieval outcomes, the names
of the instrument's own parts, and every caveat about how a list was
built belong to the THINKING (disclosure panels, the record) and never to
the TALKING. Enforced by `firewall.js::assertModelFacing` running in the
test suite against the real exported prompt constants — a future prompt
that explains the machinery fails the build, which is the only kind of
firewall that holds.

### G5. A prompt is a measured parameter, not a drafted one

The void-loop reader prompt (P53's first amendment), scored against a
fixed 4-case set across four drafts: **0/4** with angle-bracket
placeholders → **2/4** with concrete worked examples → **3/4** with a
distinctness rule → **4/4** once the ask was reframed as INDIVIDUATION
rather than kind ("is a War Democrat a person" is honestly yes; the slot
admits one named individual, not a kind of person). Nothing about that
trajectory was predictable from reading the drafts; every increment was a
measurement. A prompt without a scoreboard is a guess with formatting.

### G6. Additions to a prompt do not reliably win; subtraction and substitution do

Three measurements, one direction:

- `facts-before-draft` (post-confound): facts-only (B), material-only
  (A), and both (C) TIED on correctness at 6/6 — the addition bought
  nothing — and B won on the only remaining differentiator, cost (~716
  vs ~1213 vs ~1812 prompt tokens). Recommended arm: B, "give the model
  only what it needs."
- `wikidata.js`'s render (P56 lineage): the verified closed set was wired
  into the prompt as content — the exact names, real dates, no apparatus
  vocabulary — and measured live three times; the model still dropped
  members of the set. *Handing a small model a set it must not drop from
  does not stop it dropping from the set.* The fix was rendering the set
  mechanically (G2), not a fourth prompt.
- The strongest specimen — an addition measured to make the answer WORSE
  (P54): feeding `voidLine` to the model, the thing its own docstring
  says it exists for, was measured and refused. The void's filler side
  was blind, so its line ended "Do not fill this gap from memory — say it
  is open," which would have suppressed the one true filler the model
  does read. *A void whose filler side is blind turns an incomplete
  answer into a refusal* — the addition inverts the answer.
- The vestigial "cite the address in square brackets" clause (P23's
  amendment): addresses had left the model's view, so the surviving
  instruction was a fabrication order — and "[4]" was the model obeying
  it. An instruction whose referent is gone does not become inert; it
  becomes a generator of the missing referent.

### G7. Read the generator's output mechanically; never trust its self-labels

- `build-log.js::deriveOp`: the operator typing of a patch is derived OFF
  THE BYTES, never off the model's label — measured, both small models
  (gemma2:2b, qwen2.5-coder:1.5b) say "INS" while supplying a
  replacement.
- Grammar-held output: `PATCH_SCHEMA` / `SKILL_SCHEMA` — shape enforced by
  decoding grammar, never by instruction; extraction by `extractObject` /
  `pickRevisionSegment`, which tolerates a dropped language tag because
  silence is not a declaration of difference.
- One parser per artifact kind, shared with the renderer (`parseSegments`)
  — a second fence regex is how the checked thing and the shipped thing
  diverge.
- The forgeable caption (P51): `arithmeticTurn` pushed its full "computed,
  not generated" caption into `state.history`, which is replayed to the
  model verbatim as its own past turns — a later turn of the same
  conversation then carried the house mark for "code produced this" on
  prose the model generated itself (the caption copied verbatim from an
  earlier turn's own history entry). A mechanical certification that
  enters the generator's context becomes a generatable string; strip
  apparatus marks from replayed history (`stripComputedCaption`).

### G7b. When a verdict is needed anyway: ask twice as binary reads, derive the verdict mechanically, at temperature zero

G7 says never read the model's label; this law says how to get a verdict
out of a generator regardless. P32's founding measurement: three-way
classification drew the right `because` under the WRONG label from
gemma2:2b — the small model can read, not label. So the witness tier asks
a binary question TWICE — the claim, then its sibling-swapped twin — and
`testimony.js::foldTestimony` DERIVES the verdict mechanically from the
pair; the model is never asked to classify. P36's squaring is the same
shape aimed at polarity (a claim and its negation read independently; the
SAME verdict on both readings is itself the tell that negation detection
silently failed). And the determinism requirement that makes a mechanical
read of a generator meaningful at all, found live: with no fixed
temperature the identical prompt flipped its own answer between runs —
witness reads pass `temperature: 0` (P32's amendment).

### G8. Check before generation where material exists; only after where it does not

P23, predictive-processing style: every organ downstream was individually
honest and the sequence still manufactured a lie ("70 degrees, sunny"
drafted from nothing, then proof-seeking searched on the invention). The
fix moved existing checks EARLIER — ask "is there material to check a
draft against" before the draft exists (the preflight), fold the turn's
own question into findings so a topic-less follow-up anchors on the real
conversation. And the void said out loud (P54): what would COUNT as a
satisfying answer is declared before the answer exists, from the
question alone, then from the material, then from the union — never
derived from the draft.

### G9. The generator's bare assertion is testimony from a witness whose ground is itself — never an exceptional case

P39/BUILD-4: nothing a model says is ungrounded; it is grounded in its
own weights, and a system that tracks who backs a claim names that
witness honestly (`self:model`). The two rules that make it safe: a
self-witness never co-signs a corroboration count alone, and the render
never special-cases it — a self-witness printed beside a real source name
IS the disclosure. The generalization of "Echo vs novel" (P30): a name
absent from the material but present in the generator's own briefing is
the generator reading its briefing back, not fabricating — the two must
never share a bucket, and telling them apart requires indexing what the
generator was GIVEN, not only what the material says.

### G10. Joins between context assemblies are earned by measurement, never assumed

P23's 2026-08-19 amendment — corrected and actually landed by P28, which
opens by retracting the amendment's own claim ("the write-up described
the right design; the code did not yet do it": `preflightQuery` was still
unconditionally concatenating task and discourse). The unconditional
discourse fold-in fixed the topic-less follow-up and broke every
self-contained question after a topic change ("research Robert Macnamera"
after a greeting fetched a greeting-etiquette page). The assemblies
(question, conversation, material) are typed and joined only on
measurement: retrieve on the part's own words first, widen with discourse
only on zero passages; preflight joins only on an anaphoric task or one
with no content words.
Its sibling for snippet assembly (P38): N separate per-result chunks
racing for retrieval slots is a coin flip on which FACTS survive —
measured live when a real draw won two Hamlin-only snippets and a
Johnson-only one over three snippets that each independently stated both
names; fold the snippets into ONE chunk.

### G11. When the generator cannot be trusted to self-correct, correct mechanically — and budget the loop

- `links.js` (P20): an unreachable model-cited URL is replaced in the
  shipped text with a named marker — never another round trip asking the
  model to fix its own invention.
- `quotes.js` (P17): a drifted quotation is REWRITTEN to the source's own
  bytes before rendering, repair disclosed, then re-inspected so the
  record describes what ships.
- The correction loop is bounded, its budget is spent per failure mode,
  and its one disclosed hole is documented rather than papered over
  (CHAT-POLICIES: the mechanical fallback rescues echo/reproduction/
  narration, never a plain survived-`unsupported` draft).
- The two-pass shape (P34): S1 fast and unchecked, S2 the full pipeline
  with `priorPass` — SAME model for both, deliberately, so the apparatus
  is the only variable being evaluated, never confounded with model size.

### G12. Absence of material licenses withholding judgment, never manufacturing it

The constitutional statement, earned twice in the generation path
(CLAUDE.md's grounding-ladder amendments): a build turn's prose about its
own artifact is not a set of world-claims to convict ("claiming things
nothing given backs: 76" over the model's own code labels); a checking
organ may say "nothing to compare against" or "compared and failed",
never convert the first into the second. Where a part HAS ground the
ladder doesn't read — its own artifact in the same turn — the fallback
must see that ground exists.

### G13. A generation that cannot meet its contract is a typed refusal, never a degraded output

`renderHolders` returns null unless the set is CLOSED (`coverage.tiles`)
— a partial set stated in the closed voice would be a closure claim the
data never made. A codeless model reply to a code ask is a typed gap. An
ambiguous arithmetic phrasing is a refusal naming the ambiguity (P52) —
and P52's other half: a refusal must be exactly as wide as its reason
(three of four "order-reversing" phrasings had one standard reading and
now compute; the fourth still refuses, on its own narrower reason). The
mechanical render, the loop, and the fast path all share one posture:
fall through to the honest slower path, never ship the confident partial.

### G14. A reading failure wears the model's face — confirm the pipeline before blaming the generator

P50's diagnostic law, measured at real cost: a question with two right
answers returned one FOR A WHOLE DAY while the generator was everyone's
first suspect; the actual defect was three uncoordinated punctuation
walls in the extraction pipeline (a parenthetical aside hiding the
subject at three independent sites). Before blaming the model, the
prompt, retrieval, or the logic: take one sentence that states the answer
plainly and confirm the pipeline can extract it. Without this law, a
reader of this document would run G5's prompt-measurement ladder against
a pipeline bug.

---

## Refuted moves, kept refuted

- **A better prompt as the fix for a compliance failure** — G1's founding
  measurement, and every reconfirmation since.
- **Critique-framed correction prompts** — dodged three ways (G3);
  replaced by fresh re-asks carrying confirmed facts as givens.
- **Prompt ceremony in experiments** — it confounded a whole A/B/C
  comparison until removed (G3).
- **Adding the answer-set to the prompt as the fix for set-dropping** —
  measured three times, still dropped (G6); the fix was mechanical
  rendering.
- **Trusting the generator's own operator/type labels** — measured wrong
  on both small models (G7).
- **Letting mechanical certifications ride replayed history** — forgeable
  a few turns later in the same conversation (G7/P51).
- **Instructing the model not to mention what the prompt names** — P55;
  the vocabulary leaves the room instead.

## Open, named, unbuilt

- The correction loop's disclosed hole (a survived-`unsupported` draft
  ships unrescued) — named in CHAT-POLICIES and holon.js, unfixed.
- Non-text generators: nothing here is measured beyond text LLMs; the
  laws use only "fluent-but-unwarranted output" and should transfer, but
  that is a design claim awaiting a measurement.
- Whether the live app should adopt `verbForms`/`createLemmatizer` by
  default (the opt-in priors question) — recorded in POLICIES, still
  open.
