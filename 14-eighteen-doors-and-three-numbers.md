# Eighteen Doors and Three Numbers

*Companion series, №14. On the layers and the math behind every terrain and
every stance — read as one object, then set beside the prior art.*

---

## What this is, and what moved under it

The spec that commissioned this essay pinned `eoreader6@0923d0f` and
`eo-constitution@05478f0`, and named three in-repo documents as its primary
sources: `11-terrain-occupancy-and-the-two-ascents.md`,
`12-nine-terrains-as-representation-standard.md`, and
`13-the-resolution-face.md`.

**None of those three files exists in the source this essay could actually
reach, and neither does the constitution.** What is reachable is
`eoreader7@706b527`, whose README states the situation plainly: v7 began from
EOReader 6.1 frozen at `e20e441d3cdf`, kept as a `legacy-eoreader6.1`
submodule "solely for compatibility with applications that still import
historical `packages/engine` / `packages/host` paths" and for parity tests.
Every number below was re-verified against that frozen 6.1 tree — checked out
live for this essay, not quoted from the spec and not quoted from memory —
plus one script re-run end to end. Where a claim could not be verified because
its document is out of reach, it is marked **[unreachable]** and not used to
support anything.

That is not a preamble apology. It is the first result. The spec asked for a
synthesis of three documents; what came back is a synthesis of the *code those
documents describe*, and in two places (§6) the code has since moved past what
the spec recorded — one open gap closed, one open item half-closed by a
mechanism whose own test then refused it.

---

## 1. The thesis, stated so it can fail

> Terrain answers **what a thing is**. Stance answers **how finely it may be
> claimed**. The nine terrains' promotion gates are nine measurement
> procedures at nine points on one resolution ladder — `window` (Ground),
> `draws` (Figure), `reseeds` (Pattern) — not nine unrelated heuristics that
> happen to share an algebra.

The test: for each terrain, can its gate be re-expressed as "which declared
number governs the finest claim this terrain is entitled to make," and does
that number match the terrain's own grain?

**Read against running code, the strong form of that thesis is false, and the
way it fails is more interesting than the thesis was.** Two terrains match
their grain's knob cleanly. Two more match it approximately. One has no
statistics at all. Two are governed by numbers that are not on the ladder —
one of them a plain integer count, the other a decay rate. And SEED.md, the
document that declares the three numbers as "the whole physiology," already
concedes in its own §"A fourth declared number" that `rho`, `order`, `alpha`
and `gamma` are declared, never defaulted, and are none of the three — filing
the physiology question as unresolved rather than closed.

The ladder is real. It is not the whole apparatus, and no document in the tree
claims it is.

---

## 2. Four kinds of math, kept apart

The single most common way to get this material wrong is to write "the math of
terrain X" as if that phrase named one kind of thing. It names four, and they
are not interchangeable.

**(a) Inferential, with a null and a verdict.** `nul/index.js` — 1,306 lines,
a `LICENSED` table pairing statistics to perturbations, `ground()` /
`difference()` / `pattern()` / `level()` / `witness()`, roughly twenty typed
gap types. Entity's late/early-half activity test, Kind's two Born gates,
binding's displacement null, Atmosphere's tolerance-triggered re-zero, and the
two-knob cross of §5 all live here.

**(b) Deterministic construction, no statistics whatsoever.** `emergence/
field.js`, 129 lines. Its own header: *"DECLARED NUMBERS. None new — the extent
is handed in by the parts' own addresses. The engine never declares the size of
what it did not receive."* Verified by grep: the file contains no `draws`, no
`reseeds`, no null, no RNG. Field composes only when its parts tile their
source byte-exactly; a missing part is a gap, an overlap is a contradiction,
and both are refused by type rather than measured. **One of the nine terrains
has no probability in it at all**, and that is a structural fact about the
ladder, not an omission in it.

**(c) Algebraic and definitional.** `packages/engine/operators.js` lines 45–47:
`MODES` (Differentiate/Relate/Generate), `DOMAINS` (Existence/Structure/
Interpretation), `GRAINS` (Ground/Figure/Pattern), all frozen.
`TERRAIN_BY_DOMAIN` and `STANCE_BY_MODE` are frozen lookup tables. `CUBE.md`:
"The addressable space is operator × grain = **27**, not 729. Of 729, 702 are
type errors by construction." Nothing is measured here; 96% of the nominal
space is refused before any material arrives.

**(d) Refuted-as-classifier.** `CUBE.md` line 11: shuffling the words inside
2,527 paragraphs left **95.7%** of cell assignments unchanged. The cube does
not discriminate content. It is kept as a design instrument and an address
space, and every downstream document in both repos repeats the prohibition:
deriving a terrain from a passage is a refuted move.

Averaging across (a)–(d) would produce a number about nothing. The table below
tags every row with which kind it is.

---

## 3. The spine: nine terrains

The grid, verbatim from `operators.js:57–61` — note that the commissioning
spec's own table misplaced two of these, and the code is the authority:
**Existence** = Void (Ground) / **Entity (Figure)** / **Kind (Pattern)**;
**Structure** = Field / Link / Network; **Interpretation** = Atmosphere / Lens
/ Paradigm.

The "governing numbers" column is a token census over each organ's source —
which declared numbers the file actually names, and how often. Crude, and
exactly right for the question being asked, which is not *what does this organ
compute* but *which knob is in its hand*.

| terrain | cell | organ | kind (§2) | governing numbers (occurrences) | matches its grain? |
|---|---|---|---|---|---|
| Void | Ex·Ground | `nul/index.js` | a | the primitive itself: `window`, `draws` | — (it *is* the ladder) |
| Entity | Ex·Figure | `referents/entity.js` | a | **draws 14**, window 11, reseeds 8, minArrivals 8 | **yes**, draws-dominant |
| Kind | Ex·Pattern | `emergence/kinds.js` | a | **reseeds 16**, draws 2 | **yes**, cleanest match in the grid |
| Field | St·Ground | `emergence/field.js` | b | *none* | n/a — no statistics |
| Link | St·Figure | `perceiver/text/relations.js` | a′ | minSurfaces 10, window 8; **draws: zero** | **no** — a recurrence count, not a rank |
| Network | St·Pattern | `emergence/graph.js` | a′ | **gamma 13**; reseeds: zero | **no** — a decay rate, off-ladder |
| Atmosphere | In·Ground | `loops/atmosphere.js` | a | **window 67**, tolerance 23, reseeds 16, draws 15 | **yes**, window-dominant |
| Lens | In·Figure | `emergence/tiers.js` | a | gamma 19, draws 17, window 15 | partial — draws present, gamma co-equal |
| Paradigm | In·Pattern | `emergence/paradigm.js` | a | reseeds 1, draws 2 (pass-through) | untestable at this thinness |

Four readings that the table earns and prose alone would not:

**Kind is the thesis's best case.** `emergence/kinds.js` throws on a missing
`reseeds`, and the message is the thesis in one line: *"a declared `reseeds`
(the resolution of pattern) of at least 2 is required — the Born gates alone
certify clusters found in noise, whatever the channel."* A Pattern-grain
terrain refusing to run without the Pattern knob, in code, with a reason.

**Link is the thesis's worst case, and it is not sloppiness.**
`relations.js` gates on `minSurfaces` — a candidate verb is admitted when it
follows at least *n* **distinct** named surfaces — and contains no `draws` at
all. It refuses a default (`"minSurfaces is declared — how much recurrence
counts as a pattern is the caller's to say, never a default here"`), so it
obeys the *discipline* of declared numbers while sitting off the ladder
entirely. The header calls itself a heuristic four separate times and pins the
one guarantee that matters: *"It will not fabricate: no triple is emitted
without a literal verb match in the clause."* A Figure-grain terrain governed
by an integer count of surfaces, not by rank resolution.

**Network's `gamma` is a fourth unit.** `createGraph` requires `gamma` in
(0,1] and refuses a default — *"it is the rate of forgetting"* — and the file
names no `reseeds` anywhere. Belief decays; it is not nulled at the graph
level. SEED.md's own fourth-number section already anticipates this and
declines to resolve it.

**Occupancy is not weight.** `coverageReport()`, run live: **27 of 27 cells
occupied, zero empty** — the "entirely unbuilt columns" that `tiers.js` and
`graph.js` describe in their headers are, at the registry level, closed. But
the organ count per cell runs from **1 to 11** (EVA·Pattern/Paradigm has 11;
INS·Figure/Entity has 1). A full grid is a claim about addressability, never
about evidence, and reading it as the latter is precisely the mistake the
95.7% shuffle result exists to prevent.

---

## 4. The spine: nine stances

Stance is the same three grains read down the mode axis instead of the domain
axis — `STANCE_BY_MODE`, `operators.js:63–67`:

| | Ground | Figure | Pattern |
|---|---|---|---|
| **Differentiate** | Clearing | Dissecting | Unraveling |
| **Relate** | Tending | Binding | Tracing |
| **Generate** | Cultivating | Making | Composing |

Three things are true of this face at once, and only saying all three is
honest.

**It is currently decorative where it is supposed to be falsifiable.**
`cellOf(op, grain)` (`operators.js:82–96`) stamps both `terrain` and `stance`
from a **single** `grain` argument. Terrain-grain and stance-grain are
described as two different readings of one axis value, but nothing in the code
can hold them apart, so nothing can catch them disagreeing. An
over-determination that cannot fail is not an over-determination.

**One cell is cross-validated against evidence that never saw this codebase.**
Interpretation·Ground — DEF=`gap()`=Clearing, EVA=`witness()`=Tending,
REC=`reZero()`=Cultivating — corroborated against `eo-lexical-analysis-2.0`'s
real cross-linguistic exemplars at **40.9% held-out top-1 vs 3.7% chance**
(`CUBE.md:95`). One cell of nine, external, and reported as one cell of nine.

**And it is the only face that can see a whole class of defect.** That is §5.

---

## 5. The two-knob cross, re-run

This is the one place in the entire apparatus where a prediction was
pre-registered, written into a committed script *before* the numbers were
read, and then **refused by its own data**. It carries the essay's weight
accordingly.

`level()` asks a Pattern-grain question — is one ground above, below, or peer
to another. Its threshold has two possible sources, one per grain:
`floor = 2/draws` (Figure) and `reseedNull`, the max rank displacement over
`reseeds` reseeds of own's ground (Pattern). It uses `max(floor, reseedNull)`.
The prediction: turning the knob of the grain a question is *asked at* should
improve the answer; turning any other grain's knob should not, however far it
is turned.

- **P1** — floor only: the false-ladder rate does not fall as `draws` rises.
- **P2** — with the reseeding null: at fixed `draws`, the rate falls as
  `reseeds` rises.
- **P3** — *the discriminating one*: with the reseeding null supplied, the
  rate is flat in `draws`.

I re-ran `scripts/resolution-knob-cross.mjs` live rather than quoting the
committed table. It reproduces to the tenth of a percentage point, including
the direction-balance design check (602 above / 643 below). `same-law` control,
96 trials, no level exists by construction; false-ladder rate:

| threshold | draws=60 | 120 | 300 | 600 |
|---|---|---|---|---|
| floor only | 81.5% | 89.2% | 93.5% | 96.8% |
| reseeds=6 | 57.5% | 63.0% | 74.2% | 80.9% |
| reseeds=12 | 51.8% | 58.7% | 72.0% | 78.7% |
| reseeds=24 | 42.7% | 50.5% | 68.5% | 77.7% |
| reseeds=48 | 36.3% | 47.7% | 66.3% | 73.4% |

**P1 HELD.** Paying for more Figure resolution buys a *worse* Pattern answer —
81.5% → 96.8% wrong. **P2 HELD** at every `draws`, monotonically. **P3
REFUSED**, and not narrowly: the spread across `draws` is 15.3pp with the
Pattern knob absent and **23.4 / 26.9 / 35.0 / 37.2pp** with it supplied at
reseeds 6/12/24/48. Supplying the Pattern knob made the Figure knob's grip
*stronger*, not weaker. (These per-cell spreads are printed by the script; the
committed write-up states the refusal in prose without them.)

The diagnosis was pre-registered too, as two instruments committed before their
own numbers were read. **M1** — mean `reseedNull` falls as `draws` rises — held
at every setting; at reseeds=48, 0.180 → 0.049, a 3.6× collapse across a 10×
change in a knob that is supposed to be irrelevant. **M2** — mean
`|displacement|` runs 0.148 → 0.139 → 0.140 → 0.140, flat within 0.6% after a
first-step dip. The threshold collapses; the signal it must clear does not; the
verdict follows the threshold.

Read the code and the reason is visible without any statistics at all:
`displacement = cross.rank - fig.rank`, and rank resolution is `1/draws`. The
Pattern-grain threshold is **denominated in Figure-grain units**. `level()`'s
two declared numbers pull opposite ways on one quantity — `reseeds` widens the
threshold, `draws` narrows it — so "declare more resolution" is ambiguous in
this organ depending on which number you meant.

Two smaller honesties from the live run, since the point of re-running was to
find out rather than to confirm. The `seed-only` control produced **zero false
ladders in all twenty cells**, exactly as recorded — its printed P1/P2/P3
verdicts are vacuous (a rate of 0 cannot rise, fall, or spread) and support
nothing. And on that same vacuous control the M2 instrument prints REFUSED,
because there `|displacement|` genuinely does fall with `draws` (0.00503 →
0.00052) while sitting far inside every threshold. The committed write-up
discusses M2 only on the informative control. Neither changes the finding;
both are the kind of thing that only shows up if you actually run it.

**The name for this defect is a grain leak** — a quantity belonging to one
grain, denominated in another grain's units. It is invisible to the operator
face (the act is `EVA` either way) and invisible to the terrain face (the
object is a Network either way). Only the stance face carries resolution, so
only the stance face can see it. That is the strongest argument in the tree for
keeping the stance face at all, and it is an argument from a **refutation**,
not from a confirmation.

---

## 6. What moved since the spec was written

Two of the spec's own open items resolved, in opposite directions.

**Closed: `level()`'s missing `incommensurate_extent` guard.** The spec
records it as "noted, unfixed." It is now at `nul/index.js:1159`, refusing a
null built over a different amount of material than the ground it is the null
for, alongside a `cites()` check that the material is the material own
actually cites. The gap the spec asked about no longer exists.

**Half-closed, then refused: `activation.js`'s `recalled` channel.** The spec
carried it as the repo's strongest single measured result (22/24 Frankenstein
chapter boundaries, p≈0.005) and as stranded — imported by nothing. It is now
imported: `loops/reading-regime.js` wires it into `atmosphere.js`'s
`createRegimeTracker`, and `host/surfer.js` consumes it with a declared spec
(`channel: "recalled", window 12, draws 200, tolerance 3, reseeds 5, seed 17`).
The growth-rule violation is closed.

**And the assembly built on that seam was refused by its own stated test.**
Six re-zeros, spaced *exactly* 122 frames apart every time; thirty
shuffled-order trials produced exactly six re-zeros each, mean 6.00, sd 0.00.
785 ÷ 122 ≈ 6.4: the re-zero count is arithmetic on total length and the
minimum ground size, not a reading of the material. The write-up declines to
search for better parameters and records the pre-registered stop condition as
met. Note also what remains true of the spec's F2 as stated: the channel now
has an engine importer, but it feeds the *reading regime*, not Kind, Network,
or Paradigm.

**Superseded outright: the Link yield story.** The spec's F1 has agentless
civic prose starving the SVO mouth. The terrain census measured the opposite —
civic Link yield **20.9× richer** than Frankenstein's (56/1382 stated links vs
5/1654), because Frankenstein's subjects are pronouns, invisible to a resolver
that matches literal named surfaces, while institutional names have no pronoun
to carry them and must recur. The census also marks its own instrument flaw
without prompting: normalizing per 1000 sentences makes Field exactly
1000.0/1000 on every source by construction, so Field's apparent stability is
a normalization artifact and not a measurement.

**[unreachable]** Docs 11, 12 and 13 themselves; the constitution's II.8,
II.9, II.17 and Amendment XVII; the spec's §5.1 committed table as a document
(its numbers were re-derived by running the script instead); and whether spec
13's Assemblies C–F have been built — `scripts/RESULTS.md` carries spec 11's
Assemblies A and B and spec 13's Assembly A, and nothing beyond.

---

## 7. Prior art, audited rather than picked

**Renormalization-group / scale separation.** The best-fitting *description* of
P3's refusal: a coupling that was supposed to decouple across scales did not.
Where it breaks: RG has one coupling running with scale under a flow equation.
This ladder has three separately declared numbers and no flow equation between
them — the tree contains no place where `window`, `draws` and `reseeds`
compose. Suggestive; not structural.

**Wavelet multi-resolution analysis.** Nested approximation/detail at
successive scales is genuinely close to Ground→Figure→Pattern. Where it
breaks: wavelet levels are uniform in kind — every level has coefficients, a
null, a discard. Field has no statistics at all. One rung of this ladder is a
different kind of object, so the decomposition analogy fails at exactly the
rung a decomposition would need most.

**Sequential analysis / SPRT.** "How finely, and therefore at what cost" is
error-budget-per-look in other words, and the `draws` sweep is literally an
operating-characteristic curve. Where it breaks: SPRT trades resolution
against a single accept/reject boundary; this ladder trades resolution against
*which terrain gets built at all*. Different payoff structure, and the
difference is the interesting part — a refused promotion is not a deferred
decision, it is a typed gap that downstream organs must handle.

**Measurement-theoretic instrument resolution.** The closest fit to the
apparatus's own stated claim, that a precision bound is a refusal costing
nothing to enforce. It also explains Field without strain: an instrument that
*constructs* rather than *measures* has no resolution limit, only a
correctness condition. Adopted here as the frame, with one caveat: it gives no
purchase on the grain leak, because it has no vocabulary for *which* bound a
threshold is expressed in.

**Dimensional analysis — proposed here, not borrowed.** Treat `window`,
`draws` and `reseeds` as three **incommensurable units**. A well-formed
stance-governed statistic is expressible in exactly one of them. A grain leak
is then not a subtle statistical failure but a **units error**: `level()` adds
a Pattern-grain threshold to a Figure-grain-denominated signal, the way one
adds seconds to metres. This is sharper than "the right knob governs," because
it is checkable by inspection rather than by sweep — you can read
`displacement = cross.rank - fig.rank` and know the leak is there before
running anything. It also predicts where to look next: any organ mixing
`gamma` with a rank (Lens, by the census in §3, carries both) is a candidate
for the same defect. Named cautiously and claimed narrowly: it is a
bookkeeping discipline, not a theory, and calling it more would be the naming
overreach the tree's own amendment history exists to prevent.

**Explicitly rejected: information-theoretic coarse-graining / MDL
hierarchies.** Tempting, and wrong here. Those frameworks assume one nested
description-length hierarchy; `CUBE.md` is explicit that terrain-grain and
stance-grain are two *different readings* of the same axis value, not one
hierarchy viewed twice. Recording the rejection is the useful part — it is the
same shape as the tree's refusal to collapse "Interpretation" and
"Significance" into one name.

---

## 8. What the eighteen actually are

No false symmetry. Of the nine terrains: **two earned and grain-matched**
(Kind, Atmosphere — each refusing to run without its own grain's knob, with a
stated reason); **two earned and grain-approximate** (Entity, Lens — the right
knob present, sharing the file with others); **one structural with no
statistics** (Field, and this is a property of the object, not a debt); **two
earned but off-ladder** (Link on a recurrence count, Network on a decay rate —
both refusing defaults, neither denominated in a ladder unit); **one that is
the ladder rather than a rung** (Void); **one too thin to test** (Paradigm).

Of the nine stances: **one externally cross-validated** (Interpretation·Ground,
40.9% vs 3.7%); **eight occupied in the registry and unvalidated as stances**;
and **all nine currently unfalsifiable by construction**, because `cellOf`
derives terrain and stance from one `grain` argument and cannot represent them
disagreeing. The face's single load-bearing demonstration is negative: it is
the only face that could see the grain leak.

And across the whole grid, the finding that should survive longest:
**occupancy is not evidence.** 27/27 cells occupied, 0 to 11 organs behind
each, one cell cross-validated externally, one prediction pre-registered and
refused. The refused one taught more than the other twenty-six put together.

---

## 9. The open question, left open

The dimensional reading of §7 makes a prediction that nothing here has tested,
and it is the next thing that should be pre-registered rather than argued:

> **Every organ that compares a rank to a threshold not itself denominated in
> ranks carries a grain leak of the same shape as `level()`'s, and the leak's
> magnitude scales with the ratio between the two units.**

That is checkable, and the material for checking it is already in the tree.
`nul/index.js:1242`, some forty lines below `level()`, contains a
draws-invariant form of the same comparison: `objectify()` reports
`displacement / reseedNull` — a ratio, dimensionless, the units error divided
out. It is written for `pattern` records rather than for `level()`'s own
verdict, so this is a port, not a one-line swap; but the arithmetic is
already there, and whether it removes the `draws` dependence in the §5 table
or merely relocates it is one script and one afternoon.

The honest reason not to run it here: a fix that has not been measured against
the same pre-registered cross is a hope, and this series' whole claim on a
reader's attention is that it does not report hopes as results. The cross
already exists, the control is already built and already survived its own
design check, and the arithmetic is written. Someone should run it and
publish the number **whichever way it comes out** — which is, in the end, the
only methodological commitment any of the eighteen doors was ever really
about.
