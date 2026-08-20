**Update, live in the browser, after every fix landed today (stripFraming,
crown.js's period tokenizer, the narration extension): the root cause is
confirmed still open.** Same material, same question run earlier this
document cites ("did Hannibal Hamlin serve as VP for Lincoln's whole
presidency?"). S1's raw first take was correct: "Hannibal Hamlin was
Lincoln's 1861 Vice President, but he only served the first term." S2
shipped anyway: "Yes. Hannibal Hamlin served as vice president for all of
President Abraham Lincoln's term." — flatly contradicting S1's own correct
answer. TWO independent honest mechanisms caught it, in the disclosure,
neither on the visible surface: the pre-existing grounding-ladder marked
the sentence "∅ the material never says this... it says: of Maine —served→
as vice president to President Abraham Lincoln in 1861-65"; `crownTestimony`
(built earlier today) separately minted a claim, checked it against all
three loaded sources, and correctly computed UNDETERMINED — no source
explicitly holds OR refutes the exact wording, so it correctly declined to
render a crown line at all rather than assert something the merge itself
couldn't determine (`renderCrown`'s own design: only a DETERMINED verdict
speaks). Both mechanisms are working exactly as built. Neither prevents
the wrong sentence from shipping as the bolded, visible answer — that gap
is Phase 2's, not Phase 3's: S2 had to correctly parse three raw prose
passages under a corrected-first-take framing and get the date range
right unaided. A structured fact ("Hamlin —served as VP for→ Lincoln's
first term, 1861–1865 [address]"; "Johnson —served as VP for→ Lincoln's
second term [address]") hand to S2 before it drafts is the actual fix this
specimen argues for — not a third downstream check.

**Update, later the same day: a real 52-turn stress run supplies the
concrete evidence this plan argued from theory.** `eval/material-dialogue-
stress.mjs` (new this session) ran gemma2:2b against real material for 52
turns and found, verbatim: turn 31, asked "Is Saturn the largest planet in
the Solar System?", drafted a CORRECT first take ("No, Jupiter is the
largest planet... Saturn is the second-largest") — then the correction
loop ran two more rounds and shipped an answer to the PREVIOUS turn's
question instead, discarding the correct draft entirely. Turn 48 shipped
`holon.js:540`'s own hardcoded correction-prompt sentence ("The record
confirms exactly this, and nothing beyond it, even if other names or
claims sit nearby in the material below") verbatim as if it were content —
the model copied its instructions instead of following them, twice in a
row (turns 47–48). Separately: `stripNarrationSentences` is confirmed
running in detect-only mode (a 2026-08-19 direction, quoted in its own
header) — narration this plan cites as a symptom is not silently fixed by
today's correction loop at all, only counted, unless it crosses a 50%-of-
draft threshold (0/52 turns did). And the reason crown/testimony landed
UNDETERMINED on all 37 real firings in the run: `holon.js`'s relation-tier
reads a draft BEFORE its own framing-stripper removes an echoed question,
so a correction retry that opens by echoing the question contaminates
`relationClaims` with garbage entries from the question text — a
controlled diagnostic against the identical real material confirms the
merge mechanism itself reaches AGREE/SINGLE correctly once given
uncontaminated input. None of this is a hypothetical case for Phase 3's
"measure before shrinking" — it is the measurement, arrived early. Full
run: `eval/results/material-dialogue-stress-703.jsonl`.

# Hypergraph-first generation: a plan, not yet built (2026-08-20)

Direct user framing, verbatim, across one session: "we need the talking
model to be fed the right information, and as little else as possible";
"merge the output into a single (seeming) stream"; "post processing of
responses needs to be abandoned"; "if its not fit to print, have it be in
'thinking'"; and the reorientation that supersedes the smaller UX fixes
those implied: "let's reorient from mechanical post facto fact checking
(that's causing more problems than solving), but let's leverage the
hypergraph to have the best possible fetch, surf and fold so the talking
model can have exactly what it needs (and there is provenance)." The goal
stated alongside it: Claude-like responses from the local model, on any
topic, at any needed length and style, with full provenance.

This document is a plan. Nothing in it is built. Where it leans on
mechanisms that already exist and work, that is said plainly, with the
file:line evidence; where it proposes something new, that is said plainly
too. It does not repeat findings already written up elsewhere — it cites
them and builds on top.

## What already exists, and must not be re-derived

**`MECHANICAL-COVERAGE-INVESTIGATION.md`** ran six real questions against
real material and measured, precisely, where the hypergraph can compute an
answer versus where it can only check one versus where it has nothing to
offer at all. Its central honest finding: 1 of 6 was fully mechanical
today with zero further engineering; 3 more were mechanical *once a
missing router exists*; 2 of 6 — causal explanation, multi-fact synthesis —
stay generation-dependent regardless, because no organ in this repo has
"any mechanism for causal-connective typing, cross-source confidence
weighing, importance-ranking across overlapping factors." That boundary is
load-bearing for everything below. This plan does not claim the hypergraph
replaces generation. It claims generation can be handed much better
material than raw prose, and that a real slice of turns don't need
generation at all.

**P36 / "EVA computes, REC concedes"** (POLICIES.md; CLAUDE.md
:3578) is the closest thing to "hypergraph-first" that has actually
shipped: `grid.js`'s `evaluate` verb, given no `verdict:` clause, now runs
`hypergraph.js`'s real `read(claim)` against a named, already-loaded
ground and computes `holds`/`refused` mechanically — squared against the
claim's own negation (`squarePolarity`), checked for connector-class and
object-specificity, provenance riding on the result via `attachResult`'s
`extra`. It is live on both `term.js`'s `act` command and app.js's `/act`
chat door. And its own map says exactly where it stops, verbatim: **"the
ORDINARY chat pipeline still makes the exact original mistake since none
of this is wired into it yet."** There is no router from an ordinary typed
question ("who was Lincoln's VP?") to this mechanism. That gap is this
plan's Phase 1.

**The Per-Source Testimony spine**, built earlier today (POLICIES.md P39;
this session): `grid.mintClaimId` → `landAct`'s per-source `evaluate` →
`perSourceReadings` → `mergeTestimony` → `crown.js`'s template-only render.
This is the right SHAPE of a provenance-carrying structured claim —
`{claim_id, who, read, verdict, edges, corroboration}` — and it is reused
below, not duplicated. Today it only runs *after* a turn ships, checking
claims the chat surface already asserted. This plan's Phase 2 asks the
same shape to run *before* generation, over retrieved material, to build
what the model is shown.

**P37 / HL** (`eoreader6.1/packages/engine/interpretation/hl.js`,
CLAUDE.md :3668, :3715) is a sound logic layer strictly stronger than
`judge()` — functional exclusion, transitive derivation, presupposition
failure on definite descriptions — explicitly disclosed as **not consumed
anywhere live**. Named here as the natural place to deepen Phase 2 once
the simpler version is proven; not a Phase 1 or 2 dependency.

## The current pipeline, traced (not assumed)

Confirmed by direct inspection, this session:

1. `retrieve(chunks, question, limit, foldedRefs)` (`source.js:615`) —
   pure term-overlap scoring over already-loaded material. No hypergraph.
2. `buildSourceBlock(passages)` (`source.js:661`) concatenates the
   **raw passage text** (`c.text`) of whatever `retrieve` picked, plus an
   optional type-guess header. Nothing structured; nothing addressed
   per-fact; nothing hypergraph-derived.
3. `runPart` (`holon.js:829`) builds `sourceBlock` at line 930 —
   **before** `makeRelationReader` is even constructed, at line 953. The
   ordering itself is the evidence: relation structure cannot inform
   material selection today because it does not exist yet at the point
   material is selected.
4. The model drafts freely from that raw block.
5. Only now does the hypergraph run: `relations.read(text)` (`holon.js
   :1033`, inside `inspect()`) extracts triples **from the model's own
   drafted sentences** and checks them against the material's real edges.
   `provenance.js`'s `classifySentences` and `capacity-runner.js`'s
   `landAct` evaluate branch are likewise both post-hoc — they classify or
   judge a sentence that already exists.
6. If a verdict trips (echoed / reproduced / narrated / incomplete),
   `buildCorrectionPrompt` fires a second real model call. The original
   failed draft is not shown anywhere the user can see it — it is
   discarded outright, not sent to "thinking," which is the specific thing
   the day's direction says should stop.

This is generate-then-police. It asks a small model to correctly parse
prose and extract-and-restate facts (hard, error-prone for gemma2:2b) and
only checks whether it succeeded after the fact, in the harder-to-parse
space of arbitrary generated English rather than the narrower space of
extraction from source text the hypergraph already handles better.

Real specimens from today's own live testing back this up directly: S2
(the checked pass) was fed S1's raw, unchecked hedge verbatim
(`priorPassFor`, `holon.js:469`) as anchor context and then answered a
"did Hamlin serve Lincoln's whole presidency" question with a bare "Yes...
1861 to 1865" that glosses over Johnson's second term — the material was
in the prompt the whole time, as raw prose, and the small model didn't
correctly reason over it. A narration leak ("This passage establishes
that...") shipped because the detector's verb list hadn't seen that lemma
yet — a real, fixed instance of the more general problem: catching bad
prose after generation is a never-finished list of patterns, while feeding
correct structure before generation removes the need to catch it at all
for whatever fraction of the answer the hypergraph can actually reach.

## The reorientation

Stop asking "did the free draft turn out okay" after the fact. Start
asking "what does the hypergraph already know about this material, with
its own provenance, before the model writes a word" — and split every turn
on the answer:

**A. Directly computable.** The claim in the question matches a real,
already-loaded ground closely enough for P36's `evaluate`-with-no-verdict
path to compute `holds`/`refused`/`undetermined` mechanically. Zero
generation. `crown.js` renders it. This is Phase 1, and the mechanism is
already built and tested — only the router from question text to this
call is missing, the exact gap both `MECHANICAL-COVERAGE-INVESTIGATION.md`
and CLAUDE.md's EVA section name.

**B. Generation from structured material.** The claim needs a written
answer (synthesis, narrative, multi-fact composition — the honest majority
per the coverage investigation), but the source material the answer will
draw from can be pre-extracted into hypergraph edges with real provenance.
The model is hand a *fact block* built from those edges — subject/verb/
object with the address each came from — alongside (not instead of) the
raw passage text, so material the extractor can't reach (pronoun subjects,
causal clauses, infobox-shaped text — all real, disclosed gaps below)
still reaches the model some way.

**C. Generation only.** No material, or material the hypergraph
structurally cannot help with (pure opinion, creative writing, the
disclosed causal/synthesis case). The existing `CHAT_SYSTEM_PROMPT` /
self:model-witness path stands, unchanged — already honest about what it
is (POLICIES.md, self-witness work, this session).

## The honest limits of B, stated before it's built

`hypergraph.js`'s extraction, measured live and disclosed in
`MECHANICAL-COVERAGE-INVESTIGATION.md` and CLAUDE.md's EVA section:

- Candidate-verb nomination anchors on **capitalized surfaces only** —
  a pronoun-subject sentence ("He demanded loyalty oaths...") produces
  **zero triples**, confirmed on two independent real specimens.
- Infobox/succession-box text glues into garbage edges — the sentence
  splitter doesn't break on the bare newlines that format uses.
- A causal clause swallows whole into one opaque edge's object string —
  "because" has no relation-type representation anywhere in the extractor.
- `bound` requires exact triple-shape convergence, never semantic
  entailment — a true paraphrase never binds.

None of this is news to fix as part of this plan; it is the reason Phase 2
feeds the fact block *alongside* raw passage text rather than *instead of*
it, and why coverage (what fraction of a passage's sentences actually
yielded a triple) rides as a disclosed number next to the fact block, the
same "typed gap, never a guess" discipline this repo already holds
everywhere else. A fact block with 30% coverage is real, useful, honestly
partial help — not a claim the other 70% doesn't exist.

## Build plan, phased

**Phase 1 — correction, found implementing, not just planning (2026-08-20
later the same day).** The version above conflated two different
mechanisms. P36's `evaluate` VERIFIES a fully-specified declarative claim
("Lincoln appointed Hamlin" → holds/refused/undetermined) — it cannot
ANSWER an open question ("who was Lincoln's VP") because nothing supplies
the candidate object to test in the claim's empty slot. Filling that slot
from a question's own words is exactly the "NL-question-to-structured-
slot-query parser" `MECHANICAL-COVERAGE-INVESTIGATION.md`'s own "Question
parsing" section already surveyed four organs for and found in none of
them — and is the same gap that made `succession-answer.js` (which sidesteps
the ambiguity by reading `succession.js`'s own already-typed fields
instead) worth attempting at all. Reaching for open-question-answering here
without that parser would either silently reproduce the declined sketch's
own two independent failure modes or invent a narrower parser under time
pressure with no measurement behind it — the same "an overstated general
claim... is not [what the evidence supports]" warning this document's own
closing section already gives, now nearly violated by this document itself.

**Phase 1, honestly re-scoped: a claim-VERIFICATION router, not a
question-ANSWERING one.** Buildable today with zero new parsing
infrastructure: when a chat turn already supplies (or the model's own
first pass already asserts) a fully-formed declarative claim — a yes/no
question with the claim embedded ("did Lincoln appoint Hamlin as VP?"), or
a drafted sentence asserting one — route THAT directly to `evaluate` +
`crown.js`, skipping generation for that claim specifically. This is
narrower than the original ambition and reuses `crownTestimony`'s own
existing per-claim verification shape (built earlier this session,
app.js:3817) rather than a new mechanism — the real remaining gap is
running it earlier (gating a draft before it ships, not only after) and on
directly-asked yes/no questions, not only on claims the model already
volunteered. Open-question slot-filling stays exactly as unsolved as
`MECHANICAL-COVERAGE-INVESTIGATION.md` already found it, named here again
rather than quietly worked around.

Original text, kept for the record rather than silently edited away: a
`detectSlotFillQuestion(question)` in the shape
`MECHANICAL-COVERAGE-INVESTIGATION.md`'s own declined sketch specified for
`arithmetic.js`: typed, refusal-first, closed shapes only
("who/what was X's Y", not open synthesis). On a match, against
already-loaded material: mint a claim id, run P36's real evaluate path,
render via `crown.js`. No match: fall through untouched, exactly the
`detectArithmetic` discipline already established. This closes the exact
gap CLAUDE.md's own EVA section names as the reason "the ordinary chat
pipeline still makes the exact original mistake."

**Phase 2 — the fact block.** Reorder `runPart` (`holon.js`) so relation
extraction runs over the *retrieved passages*, before `sourceBlock` is
built, not only later inside `inspect()` over the model's draft. A new
function, alongside `buildSourceBlock` (not replacing it — additive, the
same "widen an existing carrier" law P39 already lives by), renders the
extracted edges as a compact, addressed list: `subject — verb — object
[ref]`, using the exact `perSourceReadings`-shaped record so this reuses
BUILD-1's field names rather than inventing a second vocabulary. Coverage
(sentences with an edge / total sentences) rides alongside, disclosed.
`FLAT_EXECUTE_SYSTEM_PROMPT` gains this block; raw `sourceBlock` stays too.

**Phase 3 — shrink the correction loop, measured, not assumed.** Once
Phase 1 and 2 are live, re-run this session's own real specimens (the
Hamlin/Johnson VP set; the succession-box six) before/after and count how
often `verdictOf` still trips. This repo's standing law is measure, don't
assume — the correction loop is not deleted on faith that better input
fixes everything; it stays as the safety net until real numbers say what,
if anything, is now redundant. `MECHANICAL-COVERAGE-INVESTIGATION.md`'s
own "explicit-holonic-verification-task" design (its final section) is the
right shape if the loop's *checking* side needs restructuring too — named
here as the candidate, not re-designed from scratch.

**Phase 4 — one visible stream.** Concretely scoped already this session,
folded in here rather than shipped as an isolated UX patch: `runFastPass`
and `holonicTurn` (`app.js:3007`, `:3083`) currently each call
`addMessage("assistant", "")` — two real bubbles per gated turn, confirmed
live. Merge to one: `twoPassTurn` passes S1's own node into `holonicTurn`
for reuse instead of letting it create a second one; S1's raw text, when
superseded, moves into that turn's "thinking" fold (disclosed, not
discarded — the direct implementation of "if it's not fit to print, have
it be in thinking") instead of vanishing or standing as its own bubble.
`priorPassFor`'s verbatim quote-back of S1's text into S2's prompt
(`holon.js:469`) is dropped at the call site — once bubbles merge, the
only reason it existed (making S2 "feel like" a continuation rather than
a second agent, for a reader who could see both) no longer applies, and
dropping it is a direct, free instance of "as little else as possible."
S2's job becomes "write from the fact block," not "check S1's guess" —
a cleaner role than either had before.

**Phase 5 — length and style stay orthogonal.** `complete()`'s existing
`autoContinue` stitching (`app.js:889`, `MAX_AUTO_CONTINUATIONS = 6`)
already produces one seamless long answer from several backend calls; it
composes under Phase 2 unchanged — nothing about feeding a fact block
instead of raw prose interacts with continuation length. Style (a plan
part's own EXECUTE prompt vs. FLAT_EXECUTE vs. CHAT) already varies by
shape; each variant gets the same fact-block treatment when material
exists, and none of it changes for the no-material conversational case.

## Open questions this plan does not resolve on its own

- **How much of the correction loop eventually retires** is a real call
  that needs Phase 3's real before/after numbers, not a guess made now.
- **Fact-block size on a large retrieval set** — cap by count, by
  relevance to the question's own terms (reusing `retrieve`'s existing
  scoring), or show all and let the model's own context window be the
  limit? Not decided here.
- **Whether `hl.js`'s richer logic belongs in Phase 2 now** or stays
  deferred until the simpler `judge()`-based fact block is proven live —
  leaning deferred, since HL itself is disclosed as unconsumed anywhere
  and untested against real generation-feeding use, but this is a real
  design fork, not settled by this document.

## What this is not

Not a claim that the hypergraph replaces generation — the coverage
investigation's own specimen 5 (causal synthesis) stands as the honest
counter-example, unchanged. Not a rewrite of `judge()`'s own matching
strictness — exact-triple-convergence stays exactly as strict and exactly
as disclosed. Not a removal of the correction loop today — Phase 3 is
measured shrinkage, not a deletion on faith. Not yet code: everything
above is a plan, dated, committed, and meant to be checked against as each
phase actually lands — the same discipline `MECHANICAL-COVERAGE-
INVESTIGATION.md`'s own update notes already model, where a later, better
answer superseded an earlier sketch and said so in writing rather than
quietly replacing it.
