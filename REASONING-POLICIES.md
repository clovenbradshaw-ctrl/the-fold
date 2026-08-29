# Reasoning policy — what mechanical reasoning earned, and what it refuted

This is not a new law. Everything binding here already lives in
`POLICIES.md`, `eoreader7/native/READING-SPEC.md`, and the eval results
they cite, scattered across entries each aimed at a different tier. This
document exists because "how does this system reason, and when may it
trust a derived fact" is a single question, and answering it today means
reading a dozen numbered policies and ten results documents to reassemble
the parts that touch reasoning. This file is that reassembly. Where
something is already fully documented elsewhere, it summarizes and points
rather than re-deriving — the discipline `CHAT-POLICIES.md` established
for the chat slice, applied to the reasoning slice.

Nothing below authorizes skipping the source's own detail. When this file
and `POLICIES.md` disagree, `POLICIES.md` is the law; when this file and
an eval results document disagree on a number, the results document is the
measurement.

**This is a standing document, not a one-time report — read before
building reasoning machinery, appended to after.** Amendments append; they
do not rewrite (POLICIES.md's own discipline). Every Part-I number was
re-verified by re-running its driver on 2026-08-29 before this file was
first committed — those drivers are offline and re-runnable, so a future
reader who doubts a figure can reproduce it in minutes. The MINE-1
figures (R12) and the kinship run (R8, live-network by design) stand on
their committed run artifacts rather than a re-run; the 80.0%
official-rubric figure is a hand-judged, disclosed sample. An adversarial
verification pass (three independent checkers, 119 specific figures
located in sources) ran the same day; its corrections are folded in below
and the pass itself is part of this document's record.

---

## Part I — what licenses an inference

### R1. Structure alone never licenses composition; only a named giver can

The decisive measurement is the twin test (`eval/falsification-probe.mjs`,
`falsification-RESULTS.md`, P60's first amendment): two five-fact corpora,
**structurally identical by construction** (`structurallyIdentical: true`,
confirmed mechanically) — a succession chain, where transitivity is sound,
and a dominance chain (A beat B, B beat C), where nothing whatever
follows. Both nominated by the real kernel at identical support. The scan
cannot tell them apart (`discriminates: false`). 5/6 corpora were judged
correctly and the one failure IS the finding: the unsound twin was wrongly
cleared, and no amount of further reading would ever have caught it,
because refuting a transitivity claim needs a POSITIVE counterexample and
open-world absence supplies none.

Consequence, stated as the probe stated it: "a real regularity exists
here" is refutable from evidence but never earnable from it. A
composition licence is a DECLARATION with a named giver who owns its risk
— `closureAffordances` refuses to build without one, and the register
(`declarations.js`) exists so the licence can later be CONCEDED, which a
licence living in a caller's local variable cannot be.

Two corollaries the same probe pinned:
- **Right answer, wrong reason is a trap, and it is recorded so nobody
  re-reads it as competence**: `parent-nontransitive` was correctly
  refused — on uniqueness, never on transitivity. The scan does not
  understand composition; it catches two positive shapes (cycles,
  uniqueness violations) and nothing else.
- **"An anonymous composition exists here" is not a safe weaker claim.**
  A composition site is always structurally present — two edges sharing a
  bridge is a fact about the graph, not the world. Naming what a
  composition YIELDS is a DEF act no structural evidence performs
  (`lineage-chain`: son-of composes soundly — to descendant-of, never to
  son-of, and structure cannot say which).

### R2. Refutation is a veto, never a licence — and evidence can only take a licence away

`refutation.js` is built as a veto organ and says so on every result:
`refuted: false` is never a licence; a scan below two resolved edges
reports `insufficient` power rather than "unrefuted". The standing loop
this supports (`eval/pruning-timeline.mjs`): a licence granted by a giver
is hunted CONTINUOUSLY as the corpus grows, and conceded — with a REC
carrying the counterexample verbatim, and its products withdrawn (a
transitive cascade backs the withdrawal, exercised in the kernel's own
suite; on the measured stream the one withdrawn product had no
dependents, so the cascade did no work there) — the moment the material
supplies a positive counterexample. Measured on the real succession stream: the Senate
licence survived 10 facts and was refuted at fact 11 (Hamlin began the
office against multiple predecessors); 1 already-derived product was
withdrawn; history stayed whole (26 derived across the run, 25 live —
withdrawal marks, never deletes). Six licences survived the whole stream
and are reported as *"unrefuted by THIS material — not a licence earned"*,
because R1 already proved unrefuted-sound and unrefuted-unsound are
indistinguishable.

Against the neuron analogy: this is **pruning, not Hebbian
strengthening**. Use stops nothing; only a counterexample moves anything.

### R3. The deriving apparatus is a filter, not a generator — and say it that way

`eval/derivation-precision.mjs`, four arms against an oracle independent
by construction (the derivation reads succession qualifiers; the oracle
reads term dates):

| arm | derived | precision on decided |
|---|---|---|
| A — shipped gate | 9 | **1.000** |
| B — gate removed | 26 | 0.909 |
| C — naive 20-line transitive join, zero apparatus | 23 | 0.842 |

`chemistryFoundThatNaiveMissed: 0` — the licensed chemistry derives
NOTHING a dumb join does not already find. The apparatus's whole
measured value is the veto (0.842 → 1.000, every false fact eliminated,
a self-loop included) and the provenance every product carries. Claiming
the mechanism as a source of inference nothing else could perform would
be a false provenance claim about the apparatus itself — `reaction.js`'s
own header now carries this as a standing regression: the licensed set
must remain a subset of the naive join's, and the day it is not, the
header is what must be rewritten.

### R4. Run the dumb baseline first — a mechanism that runs is not a mechanism that helps

P60 shipped with a measurement that the circuit RUNS (9 never-stated
facts, provenance to real bytes) and no measurement that it HELPS — no
truth-scoring, and no dumb-baseline arm (its no-chemistry control only
showed that nothing derives without a licence; the 20-line naive join
that decides whether the apparatus is load-bearing was never run). The
direct challenge "prove it actually helped" produced R3's table, which
both vindicated the veto and demolished the generator framing. The control separating "runs" from "helps" was the
cheap one (a 20-line join), and it got skipped. Every reasoning mechanism
after this one runs its dumb baseline in the same driver, before any
claim ships.

### R5. A uniqueness violation is a grain signal — an edge relates occurrences, not durable entities

`eval/grain-refinement.mjs`, one 68-line core mechanically scanned for
domain vocabulary (zero occurrences of person/office/tenure/patient/bed/
senate/wikidata...), run UNMODIFIED over real Wikidata succession and an
invented hospital-bed corpus:

| material | grain | derived | false | precision |
|---|---|---|---|---|
| Wikidata (real, political) | entity | 101 | 2 | 0.939 |
| | **occurrence** | 49 | **0** | **1.000** |
| hospital beds (invented control) | entity | 9 | 1 | 0.889 |
| | **occurrence** | 5 | **0** | **1.000** |

The control carried a trap declared in the fixture BEFORE the run (a
patient occupying one bed in two non-contiguous episodes) and it fired
exactly as predicted at entity grain, and dissolved at occurrence grain.
**Precision reaches 1.000 in both domains with no veto anywhere** —
soundness came from the material being individuated finely enough, not
from refusing a relation. So a one-to-one relation violated at entity
grain is evidence the GRAIN is too coarse, not that the relation is
unsound — which retro-reads R2's veto as having pointed at a fixable
modelling error all along. The grain signal says which case you are in,
with one disclosed limit: a violation that dissolves under refinement was
a grain defect; one that survives is reported as real — and on PARTIAL
material (the real Wikidata case) survival can also mean ends the adapter
could not bind to an occurrence, a difference the driver does not
separate.

Two superseded fixes, kept so they are not retried: "admit term dates as
material" was one adapter's way of naming occurrences (statement-index
naming produced the identical fact set — `datesOnlyNameTenures: true`);
`person#office#start` was politics-shaped and would have gone dark on any
material nobody labelled that way.

### R6. Domain vocabulary in the mechanism means the mechanism learned the domain

The rule R5's driver was built to enforce on itself, and the second time
this codebase learned it — `relation-composition.js`'s header records the
first ("AN ARRANGEMENT HAS ENDS, NOT PARTS OF SPEECH": kernel chaining
silently required material an adapter had labelled with Greek grammar).
Proof of generality is running the IDENTICAL core over a corpus from
somewhere else, with the domain-word absence asserted by a scan in the
driver's own run, not by eye.

### R7. Where a relation carries the world's own irreversibility, that arrow is structural, not metric — and a missing type gets rediscovered as patches until it is admitted

S21 (eoreader7 READING-SPEC) / P61. Four independent patches —
`replaces:<office>` smuggling a locus into a relation name, `intervalOf`
passing an order witness out of band, `person#office#start` rebuilding
position identity, interval-aware cycles — were each rebuilding a fragment
of one missing thing: a sequence TYPE whose positions carry their locus in
their identity. The type was admitted only by measurement against a bar
set before the run (`eval/sequence-admission.mjs`): retrieval 47/47
uniquely correct vs 40/47-with-7-conflations flat; reasoning 95 derived /
31 oracle-true / 0 false at precision 1.000 and depth 6, strictly
dominating every shipped arm; prediction 7 recovered / 0 wrong vs a
structural-zero baseline.

**The pre-registered prediction arm FAILED (8 recovered / 3 wrong), and
the failure is kept verbatim rather than smoothed**: all three wrong
guesses sat in a POOLED locus ("US senator" is one name for a hundred
concurrent seats) — the module's own declared algebra violated by the
declaration, with the corpus holding the counterexample and nothing
checking. The comment-not-a-wall shape. The failure produced `refuteLocus`
(concurrent standings of different occupants refute the locus as a pool),
which is the wall the algebra had promised and lacked. Admission rides the
amended arm and says so — completing a declared commitment, never tuning
toward a pass.

### R8. Composition across DIFFERENT relations, consuming its own products, is the same machinery — and the licence is still a declaration

P63 (`eval/kinship-reasoning.mjs`, live Wikidata): `childOf ∘ hasChild ⇒
siblingOf`, then `childOf ∘ siblingOf ⇒ hasAuntOrUncle` — the second hop
consuming the first hop's own derived edges, depth 2, deriving a relation
Wikidata has no property for at all (confirmed by scanning every fetched
byte for the words). Checked against an oracle never fed to the substrate
(Wikidata's own P3373): exact agreement, 8/8. Control arm with no
chemistry: 0 derived. Nothing about cross-relation composition needed new
machinery; the giver of the kinship chemistry is the driver itself, named
as its own risk exactly as R1 requires.

---

## Part II — what a judgment may say

### R9. A check may withhold, or convict; it may never manufacture conviction out of absence — and it may never report a check it never ran

The constitutional line, earned three separate times (CLAUDE.md's
grounding-ladder amendments), and its mirror caught live in the mechanical
tier (P41, `reasoning-e2e-no-llm-RESULTS.md`): the Existence/Entity cell
reported "subject and object both resolve to referents" on every claim
whose verdict was not `beyond-reach` — but `beyond-reach` gates on the
SUBJECT. It had checked one end and spoken for two, on a claim whose
object ("Napoleon") appeared nowhere in the material. The fix is
disclosure, not conviction: `judge()` now carries `claim.endpoints`
(`referent`/`form`/`tokens`/`none` per end) so no downstream reader infers
an upstream finding from the shape of a refusal — and the verdict was
deliberately NOT flipped, because a legitimate description ("the
countess") lands in the same token-only bucket a genuine stranger does,
pinned as a CONTROL case so the next pass does not turn a disclosure into
a conviction without measuring first.

### R10. A polarity nothing measured decides nothing — withheld, never flipped

P43. The extractor mis-parses periphrastic negation identically in a
CLAIM and in the MATERIAL, so against a passage reading "Lincoln did
**not** dismiss Seward", the claim "Lincoln did dismiss Seward" came back
**bound, cited to the passage that says the opposite** — an inverted
verdict wearing a real address, strictly worse than a miss. The rule: an
object span led by a received negation word has a polarity nothing
measured, so the claim is `beyond-reach` with a typed reason — on the
claim side and the material side alike, withheld rather than flipped,
because this tier does not know what the reading should have been. The
engine's real limit is a SHAPE, not a vocabulary: `negationBeforeVerbFor`
requires the negation before the verb; "never"/"hardly" contradict
correctly through bare `read()`, while "did not <verb>" puts the auxiliary
in the connector slot and swallows the predicate into the object.

### R11. Presupposition orders judgment: Existence gates Structure gates Interpretation

P33. Checking a proposition decomposes over the engine's own nine cells,
walked in domain order because it is Strawson/Russell presupposition
logic, not tidying: a referent that fails to exist makes every downstream
cell a typed GAP, never a false — enforced as a short-circuit that
overrides even a supplied witness result. Verdicts are five-valued
(`holds`/`fails`/`both`/`gap`/`not_yet_executable`); FDE's "both" is a
real verdict (HL's CONTESTED — a presupposition failure like "who WAS
Lincoln's vice president?" against a material with two, where the honest
answer is *the question presumed one and the material has two*), and it
maps to "unsettled question", never to conviction (`void-hl.js`: CONTESTED
→ `null`, not `refused`).

### R12. The verdict criterion is itself a measured choice — before hardening a reader, measure whether the gap is in the reader or the rubric

The MINE-1 arc, end to end (`eval/results/mine-1-FINAL-COMPARISON.md`,
`mine-1-official-methodology-RESULTS.md`). Nine structurally different
vocabulary/role configurations converged in one 17–43% band on examined
facts under the strict structural `bound` criterion, with every
UniMorph-era refinement (configurations 3–9) stuck at 22.4–33.7% on all
facts and nothing beating plain UniMorph's 33.7% — `unbound` sat at
35–39% of examined facts in every one, untouched by ANY vocabulary
change, because `bound` requires exact triple-shape convergence between
two independent extractions and honest paraphrases routinely fail that. The SAME underlying graph, scored under
the benchmark's own official rubric (embedding retrieval + subgraph
expansion + entailment-style judging), measured **80.0%** on a disclosed
hand-judged sample — above every baseline the paper reports. The low
score was measuring verdict strictness, not graph weakness. The
tenth-configuration urge is the tell: when structurally different attempts
converge in one band, the ceiling is not a tuning problem.

And the guard rail on loosening: the obvious permissive widening
(`inferred`, covering a claim from a graph neighbourhood) was built and
broken on purpose before being trusted — it attributed Natasha's action
to Pierre through an unrelated edge — and the only safe variant was
provably dead code. Loosening a criterion is a design with its own
adversarial cases, never a knob.

### R13. A grain gap floors; a vocabulary gap degrades — measure which before spending a configuration

P58 / `moves.js`'s own header. A real fetched list page (ten prime
ministers, exact terms) yielded ZERO edges — not few — and the prediction
that it must was stated before the enumeration file was written: a
Figure-grain reader (one labelled edge between two ends) has nothing to
return on material whose meaning is carried by the RECURRENCE of an
arrangement, which is Pattern grain by definition. No connector exists in
any row, so vocabulary width is irrelevant — the same KIND of ceiling no
vocabulary work touches that R12 measured on different material (the
MINE-1 configurations never ran against the list page; the relation is
analogy, not identity). Diagnose the CELL before tuning the organ.

### R14. Answering is a DEF/EVA/REC loop over a declared void — and the loop's shape is read off the algebra, not designed

P53. A question is answered by zeroing its space across the nine
operators, then: DEF fans out candidate fillers (an ARRAY, all landed
before any EVA — propose-one-test-one is a greedy search that returns
whichever of two true fillers it drew first, which was the live
specimen); EVA admits or refuses each against the declared admission
test; REC re-zeros when the posture is spent or a finding contradicts the
space itself. An uncovered extent is a finding, never a blank. The
choreography falls out of the cube rather than being chosen: DEF is the
only Dissecting cell in the declaration, DEF and EVA share a terrain and
differ only in stance (cut with the lens, then bind with it — which is
why they are a loop), and the loop may not close from the posture that
proposed its fillers, or the EVA between was ceremony.

Measured live, the wall matters more than the reader: a 0.5B model
misread a page (returned a birth year as a term span, genuinely present
in the shown bytes) and `placeFiller` refused it on the extent — a wrong
read did not corrupt the space, did not widen the extent, and did not
produce a confident answer. **That refusal is worth more than the reader
being right, because it holds for readers wrong in ways nobody
anticipated.** And its complement: the loop is exactly as good as the
space it was given — Lincoln's year-grain extent could not see a
six-week hole inside 1865, so the committed answer was right against the
declared space and not the whole answer. The defect class is SEG's own
cell (the extent AND ITS UNITS), not the loop.

### R15. A gap the loop can name is a question it can ask

P53's second amendment. "I hold a filler and the source I read never says
when" is not a shrug — it is a specific question, and `whatWouldSettle`
turns loop state into the questions that would settle it, ordered by what
settles fastest (placing a held filler before hunting a new one). Acting
on them is the caller's; the loop knows what it needs to know, not how to
find out. And folding an answer back in respects the walls: widening an
extent is a deliberate REC, never a side effect of answering a question.

### R16. Right verdict is not right reasoning — a verdict-only check misses fabrication

P63's model comparison, the cleanest specimen: a real local model, given
only the three raw kinship facts, answered the uncle question "yes" —
correct — with reasoning that called Edward VII "a cousin of... Victoria"
(his own mother) and invented an unmentioned "King George V". A pass/fail
check on the verdict scores this a clean pass. The mechanical derivation
of the same fact carries a provenance walk to three byte addresses and an
oracle check. Where reasoning matters, score the derivation, not the
verdict — and note the converse from `reasoning-e2e-no-llm`: genuine
two-hop composition (Lincoln→appointed→Seward ∘ Seward→negotiated→Alaska)
runs correctly with ZERO model calls where the edges are real. The
generator is not where the reasoning lives.

### R17. A wall nothing can trigger is a comment, not a wall — every arm must be shown live

The most independently-measured law in this corpus, with no home until
this entry — four separate measurements: `measure.js`'s `best_of_n`
refusal was correct and UNREACHABLE (the only route in supplied the very
argument whose absence it refused — "a refusal no declaration can trigger
is a comment, not a wall", the measuring door's own record); the aperture
refresh gate's strict reading fired ZERO times across eight exchanges
including near-verbatim repeats (a gate nothing can trigger held nothing);
the MHC order-13 arbitrary arm fired 20/20 on one material WHILE TESTING
NOTHING (its perturbation could not change the merge — A10's "a statistic
insensitive to its perturbation fails invisibly and globally"); and the
sequence type's pre-registered prediction arm carried the shape a fourth
time ("the comment-not-a-wall shape, again" — the algebra's own
`functionalPerPosition` violated with nothing checking, R7). The rule:
every refusal, gate, and null arm is licensed only by a demonstration
that it CAN fire — a planted defect it catches, or a live specimen it
refused. Two lints in one session were comments rather than walls, and
neither was found by reading; both were found by planting.

### R18. Recall is upstream of every settle, and its clocks are measured elsewhere

A seam pointer, not a restatement: `reaction.js`'s physics gate ("a chain
reacts only in contact with the present") inherits activation's window,
and the laws governing that window are P42's — the binding layer forgets
exponentially at a window the MATERIAL states, the retrieval layer by
power law (ACT-R, received d = 0.5, the edge vanishing under sentence
shuffling), refined at audio scale to need-odds matching. A reader of
this file alone cannot derive why the physics floor is shaped as it is;
P42 (and eoreader7 PR #22's evidence) is where that lives.

### R19. The reader's coherence is strictly weaker than correspondence — and no internal check can close that gap

The plane-separation law (CLAUDE.md, "Stance on the admission record").
Cells, stances, and affordances are constrained by coherence,
productivity, and a named giver's declared risk — which is strictly
weaker than correspondence. A reader can be internally coherent,
productive, and systematically misreading, and this apparatus cannot
detect that. Only an oracle can, and only on FACTS — which is why every
Part-I driver carries one (term dates, P3373, a declared fixture ground
truth) and why reasoning results without an oracle arm are claims about
the mechanism running, not about it being right (R4).

---

## Part III — refuted moves, kept refuted

- **Deriving a cell/terrain from content.** 95.7% of cell assignments
  survived shuffling the words inside 2,527 paragraphs — the cube
  classifies ACTS and ORGANS, never material. (CLAUDE.md's standing law;
  `moves.js` restates it before using the cube for coverage.)
- **Licensing composition from structural evidence** — R1's twin test.
  Refuted before being built; the probe cost one driver and six fixtures,
  the mechanism would have cost five modules shipping plausible
  falsehoods with impeccable provenance.
- **The graph-neighbourhood verdict (`inferred`)** — built, broken twice
  adversarially, proven dead code once made safe, reverted in full (R12).
- **A tenth vocabulary configuration** against a converged band — R12.
- **Reading "unrefuted" as "sound"** — R2; the phrasing "unrefuted by
  THIS material — not a licence earned" is the finding, not decoration.
- **An office/relation-scoped veto as the fix for bridge conflation** —
  R3's driver priced it (the shipped gate destroyed 7.5 true facts per
  false fact prevented, measured on the original 3-page fixture — a
  figure the driver's own amendment scopes to that small material) and
  R5's grain fix dissolved the need.

## Open, named, unbuilt

- Joining the interval gate (recovers recall) to occurrence-grain bridges
  (holds precision) — each alone measured insufficient
  (`derivation-precision-RESULTS.md`, arm F: byte-identical to no gate at
  all at person grain).
- A per-bridge (rather than per-relation) veto hook in the reaction
  substrate (P60's disclosed future work; arm D recovered 1 of 15).
- Semantic-entailment verdict criterion for the paraphrase-tolerance
  floor (R12) — real, scoped, different work from vocabulary layering.
- Wiring any of Part I into a live chat turn — every driver here is
  headless; app.js is the fold-architecture session's contract.
