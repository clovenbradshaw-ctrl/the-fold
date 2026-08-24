# 15 — What a language-understanding machine says about human language,
# and what EO does (and does not) unfold across emergent structure

*Companion series, essay 15. Distinct from #14 (the layers and mathematics of
terrain and stance): this one is philosophical and comparative, and takes
#14's findings as supporting evidence rather than as its subject.*

---

## 0. Verification ledger, stated before the argument

The spec for this essay (§9) named five grounding steps to run before
drafting. Three of them could not be run, and the reason is not a scheduling
failure but a fact about this working tree, so it goes at the top rather than
in a footnote.

**Available and read in this session:**

- `eoreader7` at `706b527` — a deliberately small native kernel (47 tracked
  files), including `native/kernel/cube.js` (the closed nine-operator
  algebra), `native/kernel/fold.js`, `native/adapters/text/` (the text
  perceiver: `relations.js`, `surfaces.js`, `pronouns.js`, `priors.js`,
  `recursive.js`).
- `the-fold` at `fb93f00` — including its committed evaluation record under
  `eval/results/`, notably `mine-1-FINAL-COMPARISON.md`,
  `asserted-crosslingual.md`, and `asserted-eval.md`.

**Absent from this working tree, and therefore not cited as fact anywhere
below:**

- `eoreader5` — so `induceKind` / `induceCalculus` and the mean-over-members
  aggregation fix are referred to only as *claims held in memory*, never
  quoted with figures.
- `eoreader6` and `eoreader6.1` — `eval/measure-real-data.mjs` fails at import
  (`Cannot find module '/home/user/eoreader6/nul/index.js'`), so the
  numeric-series measuring door could be read but not re-run.
- `scripts/codon-periodicity.mjs` — searched for by name and by content
  (`codon`, `Yersinia`, `periodicity`) across both repos: **no such file
  exists here.** The DNA result, the strongest single plank in the spec's
  domain-generality case, is therefore *unverified in this session*. The
  essay does not lean on it.
- The WALS / modifier-order p-values and the Magic Flute cross-modal work —
  same status, same treatment.
- `eo-constitution` — the article texts (II.2, II.8, II.9, IV.5, Amendment
  XVII) were **not** re-read from source. Where they appear below they appear
  as the spec states them, and the essay's own discipline is the thing doing
  the work, not an appeal to an article I did not open.

This ledger is not throat-clearing. The spec's own standing rule is that
every cross-domain claim be traced to an actually-run test rather than to the
algebra's stated ambition. Half the cross-domain evidence the spec planned to
lean on is, in this tree, ambition. Saying so changes the essay: what follows
is a narrower argument on firmer ground, and the narrowing is itself one of
the findings.

---

## 1. Russell's question, restaged as an engineering constraint

Russell's question, in the form Chomsky quotes it: how do beings whose
contact with the world is brief, personal, and limited nonetheless arrive at
rich, convergent, largely correct systems of belief?

Hand a reader one document and nothing else — no world, no second text, no
lexicon — and ask it to produce a Kind, a Network, or a Paradigm. That is
Russell's predicament with the poetry removed. The document is the brief and
personal contact; the demand for structure that generalizes is the demand for
convergent belief; and the gap between them is not a philosophical puzzle
here but a build order. Something has to supply what the single document
does not contain, or the ladder stops at Entity.

The classical answers Chomsky sets out map, with unusual precision, onto
three routes the constitution has already ruled on.

**Aristotelian abstraction** — structure built up out of the particulars
themselves, by noticing what they have in common. In reader terms: derive the
roles from the text. This is the route the role-priors work identified as
circular: roles need Link, and Link needs roles. The GIVER TEST refuses it
not because abstraction is philosophically suspect but because material
knowledge arriving with no named source is untraceable, and an untraceable
claim cannot be revised — it is a wall, not a gap waiting to be filled.

**Cudworth's and Leibniz's innatism** — the structure is already present and
the encounter merely evokes it. This is refused from the opposite side and
for the same reason. Structure that appears spontaneously, undeclared, has no
giver either. The activation-bound-pronoun-referent claim sits on the books
as exactly this refusal, marked REFUTED; the wall has no exemption for
results that happen to look good.

**Kant's schematism** — an apparatus that shapes what can count as experience
without itself being drawn from experience. This is the one route left
standing, and the correspondence is tighter than analogy usually gets,
because it is enforced in code rather than admired in prose. A
structural-tier prior steers *how* the reader reads — retrieval floors,
margins, tolerances — and is never itself cited as evidence for anything. It
carries `canWarrant: false`. It conditions the reading and stays out of the
record of what was read.

Two details make this more than a pleasing table.

First, the numbers are not merely declared, they are *refused when absent*.
`resolvePronouns` throws if `minActivation` is missing and throws again if
`minMargin` is missing (`native/tests/pronouns.test.js` pins both). There is
no default to fall back on. A schematism with a silent default would be an
innatism wearing a lab coat: structure entering the reading with nobody's
name on it.

Second, the same gate stands at the door for received content. In
`native/adapters/text/recursive.js`, a supplied part-of-speech prior is
rejected outright unless it is a `POSPrior@1` *and* carries
`provenance.source` — "posPrior must be a giver-named POSPrior@1". You may
hand the reader a lexicon. You may not hand it an anonymous one.

So the GIVER TEST is not a hygiene rule that happens to sit near this
question. It is the constitution's own answer to the three-way fork, and it
answers it the way Kant does: not by choosing between abstraction and
innateness, but by relocating the structure to a declared apparatus that
conditions experience and is never confused with it.

---

## 2. The thesis, stated so it can fail

> The operator algebra and the priors/pockets system are structurally
> isomorphic to Chomsky's two-part answer to poverty of stimulus — a small
> domain-invariant set of principles (the nine operators) plus a finite,
> externally-set parameter list (priors and pockets, each required to name
> its giver) — and the isomorphism was arrived at by refusal rather than by
> design. **Where the analogy breaks is exactly where it matters:** Chomsky's
> mature position holds the generative core to be language-*specific*, while
> EO's central bet is that one unmodified algebra generates structure across
> language, mathematics, music, and biology alike.

The essay's job is to find out which picture the actually-measured evidence
supports. The answer, worked out below, is that it supports neither cleanly,
and that the split it *does* support runs along a different seam than either
side draws — a seam between the statistical core and the perceptual
interface, which is visible in the measurements and invisible in both
theories.

---

## 3. The mapping, and the disanalogy that should not be smoothed

Principles and Parameters, stated plainly for use rather than for exegesis: a
species-universal, largely innate set of structural principles constrains the
space of possible grammars, and a small finite set of open parameters is
fixed quickly from ambient exposure. Convergent competence from poor input,
accounted for in two layers.

| Universal Grammar | EO |
|---|---|
| Principles — universal, unlearned, constrain the hypothesis space | the nine operators (NUL SIG INS SEG CON SYN DEF EVA REC), declared once in `cube.js`, domain-invariant, not learned per document |
| Parameters — finite, set by exposure | priors and pockets — a closed list of legal dials (activation floor, margin, warrant threshold, regime tolerance, null draws/window/seed), each naming its giver |
| Critical-period acquisition | admission / consolidation / interpretation as three distinct readings; slow prior drift as the long tail |

The shape is genuinely the same shape. Both layers are *finite and closed*.
`cube.js` freezes exactly nine operators against three modes, three domains,
and three grains; a pocket manifest freezes exactly which dials exist. Neither
is an open-ended hypothesis space, and in both cases the closure is the
point — it is what makes fast convergence from thin input conceivable at all.

Now the disanalogy, which the table will imply away if it is left unstated.

UG's principles are claimed unlearned and fixed from birth. The nine
operators have a visible development history: authored and re-authored across
successive readers, amended, and at least twice refuted and replaced —
`ananda` renamed to `aperture` under Amendment XVII because the original name
claimed more than the measurement established; multiple results marked
REFUTED and superseded. **A principle with a revision history is not a
principle in Chomsky's sense.** It is a well-tested convention, which is a
different and more modest kind of object.

Two things are worth adding rather than conceding this and moving on.

The first is that the disanalogy tracks a live controversy *inside*
linguistics, not just a gap between a repo and a theory. Whether UG's
principles are as fixed as classical nativism holds — whether the principles
layer is itself more learnable than Chomsky allowed — has been contested for
decades. The operators' revision history puts EO on the contested side of a
question linguistics has not closed, rather than in obvious violation of a
settled one.

The second cuts the other way, against EO. `cube.js` does not merely list the
operators; it *locks each one to a domain* (`OP_DOMAIN`: NUL, SIG, INS to
Existence; SEG, CON, SYN to Structure; DEF, EVA, REC to Interpretation), and
`cellOf` derives the terrain from that lock. Meanwhile the terminal language
built above it treats terrain as caller-declared and medium-blind, on the
stated grounds that a single DEF means the same act whether one is defining a
variable, a character, a policy, or a hypothesis — and deliberately does not
call `cellOf` to second-guess it. Both positions are defensible. But they are
not the same position, and the tension between them is precisely the
domain-specificity question, already live *inside* the algebra, before any
comparison to Chomsky is drawn. The algebra has not fully settled with itself
whether its operators are medium-blind.

---

## 4. Domain specificity: what the measurements actually show

Hauser, Chomsky and Fitch split the faculty of language into a narrow sense
(FLN — hypothesized to be recursion, possibly unique to language) and a broad
sense (FLB — general cognitive and motor resources reused for language). FLN
is a domain-*specific* claim about a small core. EO's stated bet is the
opposite.

### 4.1 What the domain-general case rests on here

In this tree, the honest inventory is short.

The numeric-series door is real: `eval/measure-real-data.mjs` runs the same
null-tested machinery over 1,021 Santa Ana police drone flights — a
non-linguistic signal, real published data — with every parameter fixed
before the run and none revisited after (window 8 chosen as a patrol shift,
draws 200 inherited from a standing declaration, seed 0). Its declarations
are exemplary and its result is instructive: the same observation reads
*censored above* against one null and unremarkable against another. That is
the licensing gate earning its keep. But it could not be re-run in this
session, and one numeric-series application does not make an algebra
domain-general; it makes it applicable to numeric series, which was never in
doubt.

The codon-periodicity result would have been the strong plank, precisely
because DNA is as far from language as a structure-discovery target gets. It
is not in this tree. I looked for it by filename and by content and found
nothing. The mathematical-transfer and modifier-order results are in the same
position. **The domain-general case, as it can be verified today, is one
numeric-series door and an ambition.**

### 4.2 The confound the spec asked to be named, and a correction to it

The spec notes that the same specific bug — aggregating candidate evidence by
maximum rather than by mean, letting one lucky match launder a false positive
— recurred independently in a lemma/slot abstraction refutation and in a
cross-source transfer bug, and asks whether that recurrence is evidence the
underlying statistics are genuinely domain-general (same failure, same fix,
same reason, different domain) or merely evidence of one author's habits of
mind appearing in three places.

Both readings should be held open, as the spec asks. But there is a third
reading that is likelier than either, and it weakens the finding further: *max
versus mean is one of the two or three most common aggregation errors in
applied statistics generally.* Its recurrence across domains is close to
uninformative about those domains, because it recurs across domains for
everyone. A shared failure mode is only evidence of shared structure when the
failure is specific enough that sharing it is surprising. This one is not.

### 4.3 The measurement that actually bears on FLN — and it is not encouraging

Here the tree does contain something sharp, and it is better evidence than
anything the spec planned to cite, because it tests the thing FLN is actually
about.

`eval/results/asserted-eval.md` records a synthetic adversarial suite with
ground truth by construction. The control case — a plain transitive clause —
is heard correctly. Every case requiring hierarchical structure fails, and
fails in a diagnostic way:

- **Passive voice**: wanted `bezukhov —married→ helene`; heard
  `"Helene was" —married→ "by Pierre Bezukhov"`. Agent and patient reversed.
  A passive is an argument-structure alternation — the mapping from
  hierarchical positions to surface order changes while the predicate's
  argument structure does not. A flat left-to-right reader cannot see that,
  and did not.
- **Relative clause**: heard `"who" —married→ "Helene"`. The embedded clause's
  relative pronoun was taken as the subject. This is embedding, read flat.
- **Coordinated verbs**: heard `"and" —trusted→ "Dolokhov completely"`. The
  shared subject was elided across the coordination and the reader took the
  conjunction as the subject. Shared-argument ellipsis under coordination is
  a hierarchical dependency by definition.

Three constructions, three failures, one cause. The extraction machinery is a
flat-string matcher over a surface slot, and every construction whose meaning
depends on hierarchical rather than linear organization defeats it.

Two more facts sharpen this. First, the word "recursive" is all over this
codebase — `recursive.js`, "native canonical recursive-reading kernel",
"recursive interrogation" — and in every instance it names a *reading loop
that revisits material*, not syntactic recursion or hierarchical embedding.
The two senses are unrelated, and the coincidence of vocabulary should not be
allowed to look like coverage. Second, there is no multi-arity event-frame
machinery anywhere in the text adapter; relations are `(subject, verb,
object, polarity)` quadruples and nothing above them consumes more.

So the honest state of the FLN comparison is this. EO has not attempted a
test that touches recursion or hierarchical embedding — and where such
structure has incidentally shown up in an adversarial suite, the reader
failed it, three times out of three, for the same structural reason. The
domain-general evidence, whatever its eventual weight, bears on a *different
and more general question* — can structure-in-general be discovered by
recurrence against a null across any signal — than the one FLN asks. FLN
asks whether hierarchy specifically is special. This tree's only measurement
on that question is a negative one about the reader, not a positive one about
language, and it does not decide the theoretical issue at all. It does
suggest that if hierarchy is going to be recovered, it will not be recovered
by a wider vocabulary.

### 4.4 The seam that the measurements *do* reveal

The cross-lingual run in `eval/results/asserted-crosslingual.md` is, to my
mind, the most philosophically loaded artifact in the repo, and it draws a
line neither Chomsky nor EO's stated ambition draws.

Three texts, same pipeline, declared draws 200 and seed 0:

- *War and Peace*, English (Maude): 76,017 triples, 1,664 distinct verbs.
- *Война и мир*, Russian original: 10,710 triples, 129 distinct verbs.
- *こころ* (Sōseki, Japanese): **0 triples**, and a typed gap —
  `no_candidate_surfaces`: 1,333 sentences read, no surface survived the
  capitalisation filter.

The gap's own text is the finding: name detection here works by mid-sentence
capitalisation, which is a property of Latin, Greek and Cyrillic *script* —
not of language, and certainly not of structure. On a caseless script the
detector does not apply, "and its silence is not evidence that the text has
no cast."

The negation probe makes the same point again from a different angle. Polarity
detection is built from `NEGATION_WORDS`, explicitly tagged `giver: "lang/en"`.
Against Russian prose, of 8,743 native-script triples sitting near a negation
marker, **zero** read negative polarity. The reach gap was predicted and then
confirmed on real material. And Japanese, whose negation is a bound verbal
suffix rather than a free word, has no free-standing marker to search for at
all — so the probe was honestly skipped rather than run against the wrong
shape.

Here is what that pattern means for the thesis. The pipeline splits cleanly
into two layers with *opposite* generality profiles:

- The **statistical core** — recurrence measured against a declared null,
  co-arrival binding, activation with a floor and a margin — is genuinely
  medium-blind. It consumed English and Russian identically and would consume
  drone flight hours or audio frames identically, and `relations.js`'s own
  header says so explicitly: the organ above it "consumes (subject, verb,
  object, polarity) triples and never learns where they came from — a video
  perceiver would supply its own triples from actor-action-target and the
  graph would not change a line."
- The **perceptual interface** — how a name, a verb slot, or a negation is
  found in *this* medium — is irreducibly specific, and specific at a finer
  grain than "language". Capitalisation is a fact about scripts. Free-standing
  negation is a fact about particular languages. Neither is a fact about
  structure.

That is a real FLB/FLN-shaped split, discovered by measurement rather than
argued for — but it falls in a different place than Chomsky's. Chomsky's
narrow faculty is a *generative* core (recursion) and the broad faculty is
the shared periphery. What the measurements show here is the mirror image: a
domain-*general* statistical core, and a periphery that is not merely
domain-specific but *script*- and *language*-specific, in ways that silently
zero out the whole pipeline when the assumption fails. EO's ambition is right
about the core and much too optimistic about the interface. Chomsky's picture
locates the specificity in the wrong layer for this system — but this system
has not tested the layer his claim is about.

Neither theory is confirmed. The seam is real and belongs to neither.

---

## 5. The third lineage, and the two measurements that split it down the middle

The usage-based and statistical-learning tradition — Elman's connectionist
rebuttals, Tomasello's construction grammar, Bates and Goodman on
lexicon-grammar continuity — holds that far more structure is recoverable
from distributional regularities in the input than classical nativism allows,
without a rich innate grammar. The spec suggests, plausibly, that this is the
better-fitting comparison class for what EO has actually measured, since
giver-free recurrence-against-a-null discovery is closer in spirit to
statistical learning than to nativism.

It is the better fit for the *core*. But two measurements in this tree pull
in opposite directions, and holding them both is more informative than
picking a lineage.

**The measurement for the usage-based side.** `relations.js`'s header records
an unusually clean natural experiment. The verb vocabulary used to be a
hand-written 90-word English list. On civic prose using ordinary verbs the
list happened to omit — *praised, approved, filed, briefed, lobbied,
summoned* — the reader produced **zero triples**. Rewrite the same sentences
using verbs the list happened to contain — *told, gave, found, knew, saw* —
and a full graph appears. The header's own verdict: "The list was not a
simplification of English, it was a sample of it standing in for the whole."
Replacing the list with a measurement (`discoverRelationVocab`, deriving verb
candidates from the slot after a detected surface, gated on a Zipf-derived
closed class computed from the text itself) fixed it. Stipulated structure
lost; derived structure won; the failure mode of the stipulation was exactly
the one usage-based critics predict — a hand-specified inventory silently
mistaking its own coverage for the language's.

**The measurement for the nativist side.** `eval/results/mine-1-FINAL-COMPARISON.md`
runs nine structurally different configurations against the same benchmark.
Configuration #3 — plain, unfiltered UniMorph, a *received external lexicon
with a named giver* — is pareto-best: 33.7% bound of all facts, zero
contradictions. Every attempt to improve it with material-internal evidence
lost. The determiner-vote variant dropped to 30.7% and introduced 2
contradictions. Referent-anchored vocabulary: 29.6%, 2 contradictions.
Span-role resolution, even after a genuine per-occurrence bug fix that took
verb resolutions from 0 to 121 across the corpus: 23.9%. Layered vetoes:
27.2–31.1%. Nine configurations, a wide precision/recall spread, all
converging in the same band, and the winner is the one that *received* its
structure rather than inducing it.

And the diagnosis for why induction lost is the poverty-of-stimulus argument
in miniature, stated in the file itself: essay-scale material of roughly 300
words "does not contain enough recurring same-role vocabulary for the
mechanism to form an opinion on most occurrences" — 18,101 gaps out of
roughly 21,500 ambiguous occurrences. The same mechanism works at book scale.
The stimulus was not poor in principle. It was poor *at that quantity*, and
the received prior is what bridged the shortfall.

So: derived beats received when the received thing is a hand-written sample
of an open class mistaken for the class itself. Received beats derived when
the material is too small for recurrence to speak. Both are measured, in the
same lineage, months apart. Neither lineage wins; the *quantity of exposure*
is the variable that decides which one is right on a given occasion — which
is, and this is worth saying plainly, precisely what the acquisition debate
has been arguing about since Elman.

---

## 6. "Unfolds", held at arm's length

The series' own vocabulary invites the comparison and so must handle it
carefully. Bohm's implicate order is enfolded structure; the explicate order
is its unfolding into manifest, localized form — a framework Bohm himself
connected to non-dual and holistic traditions this project has independently
engaged.

The structural echo is real and worth stating precisely. `fold.js` builds an
`EOFold@1` whose classes are witnessed, provisional, expectations,
obligations, exclusions, unresolved alternatives — and the reader's state is
a projection of that fold rather than a thing held alongside it. Promotion
from Void through Entity, Kind and Network is gated on something
measurement-like. Potential structure, enfolded, becoming localized upon an
act of measurement, is not a bad description of what the code does.

Amendment XVII exists to stop exactly this kind of sentence from being
spent for free. `ananda` was renamed `aperture` because the name claimed more
than the measurement established. So: what would have to be true for
"unfolds" to be earned here rather than decorative?

At minimum, three things. The enfolded order would have to be *prior to and
independent of* the projection, not merely a serialization of it — Bohm's
implicate order is not a compressed encoding of the explicate, it is
ontologically prior. The measurement-like gate would have to be doing
measurement's actual work, non-commutatively: the order of acts would have to
change the outcome, not merely the log. And the enfolded structure would have
to be *inaccessible except through* projection, rather than sitting in a JSON
object one can print.

The third fails outright. `receivedGround` returns a plain object; the fold is
readable, cloneable, `structuredClone`-able. Nothing is hidden in it. The
first fails too: the fold is assembled from operations that were themselves
recorded from readings, so it is downstream of the explicate, not prior to it.
The second is at least arguable — order does matter to a fold, and REC
genuinely re-zeros a ground — but "order matters" is true of every
append-only log ever written, and does not distinguish this one.

**So the equivalence is declined.** Bohm's implicate order is a physical and
ontological hypothesis about quantum wholeness. The fold is an engineering
construct with an append-only discipline and a statistical gate. They share a
diagram and nothing more, and the diagram is generic enough — potential
becoming actual on an act — that sharing it establishes very little. The word
"unfolds" in this series should be read as ordinary English for "develops
across", and should not be allowed to import Bohm's weight by adjacency. Per
the series' standing habit, what is being reported here is a *rejected class*,
not a resolved question.

---

## 7. What this actually tells us about human language capacity

Two findings, in opposite directions, neither smoothed into the other.

**First, and without hedging: this is evidence *for* poverty of stimulus, not
against it.** Consider what the machinery requires. Numbers declared, never
defaulted, with a thrown error where a default would be. Priors admitted only
with a named giver and refused outright without one. Hash-pinned external
lexicons. Null arms with declared draws and seeds. Typed gaps for every
refusal. Hand-curated corpora. And the result of all that apparatus is
shallow relation extraction that reverses agent and patient on a passive,
takes "who" for a subject in a relative clause, and produces zero triples on
Japanese because it was looking for capital letters. A child, given a few
thousand hours of noisy, unlabelled, partly ungrammatical input, no declared
nulls, no giver test and no seed, acquires competence this system is not
within orders of magnitude of. Whatever bridges that gap in the child is not
a bigger corpus, because the corpus here is bigger. The asymmetry is stark
and it should be stated as such rather than managed.

**Second, a sharpening of what "poverty" can mean.** The giver-free results
are not nothing. Recurrence against a null does find real structure with no
named source in at least some cases — the derived verb vocabulary that
replaced the 90-word list; the Zipf-derived closed class computed from the
text's own distribution, which appears to have caught bare negation markers
out of the verb slot on pure recurrence, "a save it was not designed for but
may be working anyway"; the whole numeric-series door. Structure is genuinely
there in the signal, and it is genuinely extractable without help.

So the honest reading is not "the stimulus is empty." It is a gradient claim,
and MINE-1 puts a number on the gradient: enough structure exists in the
signal to fix *some* things without help, and at ~300 words of material, not
enough to fix the specific target rule without either more data or a received
prior. Roughly 18,101 of 21,500 ambiguous occurrences produced no opinion at
all, and the same mechanism works at book scale. That is not a refutation of
poverty of stimulus and not a confirmation of nativism. It is the shape the
usage-based rebuttal has always actually had: the argument is about *how
much* structure the input carries relative to *how much* the target rule
needs, and both quantities are empirical.

What this project adds to that old argument is small but real: a setting
where both quantities can be varied and measured, and where the crossover was
observed rather than asserted — received priors winning at essay scale,
derived structure winning where a stipulated list had mistaken its sample for
the whole.

---

## 8. The open question this essay ends on

Has any EO-descended system ever attempted a test that specifically targets
recursive or hierarchical constituency?

On the evidence in this tree, no. There is no multi-arity event-frame
machinery; relations are flat quadruples; "recursive" throughout the codebase
names a reading loop rather than syntactic embedding; role priors were
explicitly proposed to *bypass* constituency rather than to solve it; and the
one adversarial suite that incidentally contains hierarchical constructions
records three failures out of three, each traceable to flat left-to-right
matching.

Until such a test exists, the FLN comparison can bear very little weight in
either direction. It cannot be cited as evidence that hierarchy is nothing
special, because hierarchy has not been attempted. And it cannot be cited as
evidence that hierarchy is special, because a flat matcher failing on
hierarchical input is a fact about the matcher.

The tractable next step is not a tenth vocabulary configuration —
`mine-1-FINAL-COMPARISON.md` has already established, across nine variants
spanning a wide precision/recall range, that the ceiling there is structural
rather than a tuning problem. It is a perceiver that reads argument structure
rather than surface order, evaluated against constructions built to defeat
surface order: passives, relative clauses, coordination with shared
arguments, and centre-embedding. The adversarial suite that would score it
already exists in outline. Until it is run, the strongest sentence this essay
can honestly write about EO and the faculty of language is that the two have
not yet been pointed at the same question.

---

## Appendix: sources actually opened for this essay

| Claim used | File | Status |
|---|---|---|
| Nine operators; operator→domain lock; terrain grid | `eoreader7/native/kernel/cube.js` | read |
| Fold as projection; `EOFold@1` classes | `eoreader7/native/kernel/fold.js` | read |
| Priors carry giver and scope | `eoreader7/native/adapters/text/priors.js` | read |
| Declared floors throw when absent | `eoreader7/native/tests/pronouns.test.js` | read |
| POS prior refused without named giver | `eoreader7/native/adapters/text/recursive.js` | read |
| 90-verb list produced zero triples on ordinary prose | `eoreader7/native/adapters/text/relations.js` (header) | read |
| No multi-arity / constituency machinery | `eoreader7/native/adapters/text/` (surveyed) | read |
| Nine-configuration comparison; UniMorph pareto-best; 18,101 gaps | `the-fold/eval/results/mine-1-FINAL-COMPARISON.md` | read |
| Passive / relative-clause / coordination failures | `the-fold/eval/results/asserted-eval.md` | read |
| EN/RU/JA counts; `no_candidate_surfaces`; RU polarity 0/8,743 | `the-fold/eval/results/asserted-crosslingual.md` | read |
| Numeric-series door on real drone data; declarations fixed pre-run | `the-fold/eval/measure-real-data.mjs` | read, **could not re-run** (`eoreader6` absent) |
| Codon periodicity / *Yersinia pestis* | — | **not present in this tree** |
| `induceKind` / `induceCalculus` figures | — | **`eoreader5` absent** |
| WALS modifier-order p-values; Magic Flute cross-modal | — | **not present in this tree** |
| Constitutional article texts (II.2, II.8, II.9, IV.5, XVII) | — | **`eo-constitution` absent; not re-read from source** |
