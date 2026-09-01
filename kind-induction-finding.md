# The kind is there; the null was hiding it (2026-09-01)

User direction, in order: *"it should be able to type them differently,
our entities should be typed as kinds"* → *"yes teach it nothing, let it
name these categories on its own"* → *"we are probably using a bad NUL."*

All three were right, and the third is the load-bearing one.

## The bad null, named precisely

`entity-kind-induction.js::induceEntityKindCandidates` validates a basin
against `random-subset-binding-energy`: it draws random subsets **of the
same size, from the same population** and compares binding energy.

Run over Dracula's 174 recurring surfaces, the organ returned **one**
basin of **149** entities and marked it validated. That verdict is
vacuous by construction: a random 149-subset drawn from 174 entities is
almost the same set as the observed one, so the statistic cannot vary
with the perturbation. This is READING-POLICY **A10** exactly — *before
spending a null, check the pair is licensed; a statistic insensitive to
its perturbation fails invisibly and globally.* The null did not merely
fail to catch a bad kind; it also concealed that a real kind was present.

The basin mechanism contributes the other half: `connectedBasins` takes
connected components of a mutual-kNN graph at `neighborCount = ceil(√n)`
= 14. At that degree the graph percolates and everything is one
component. Lowering k would have split it — and choosing k to make the
specimens separate is specimen-fitting (P71), so it was not done.

## The null that is licensed

Preserve the marginals, destroy the association — the same construction
CLAUDE.md already describes for the kinds arm ("redealt copies, marginals
preserved, co-occurrence destroyed"), applied at the right grain:

> Each MENTION keeps its own contexts. Which ENTITY that mention belongs
> to is redealt. Every entity's mention count is preserved exactly; the
> corpus's context distribution is preserved exactly; only the
> entity↔context association is destroyed.

Statistic: binding energy of a deterministic 2-way split (mean
intra-cluster cosine − mean inter-cluster cosine) over raw
count-vectors. 200 draws, seed declared.

| | value |
|---|---|
| observed | **0.2657** |
| redeal null, median | 0.0720 |
| redeal null, max over 200 | 0.2009 |
| rank | **0/200 matched or beat it — censored above** |

## Features: nothing named, nothing taught

The only features are the token immediately **before** and immediately
**after** each mention — Firth's company, which this repo already cites
in P31. No word list, no part of speech, no semantic label. Sentence
start is its own token (`^`), sentence end `$`.

One encoding lesson worth keeping: **a presence/absence set destroys the
signal.** Van Helsing genuinely has `before=to` (14×) — it is simply
swamped by `^`(78) and `dr`(63). Membership cannot express "mostly
prepositions" vs "mostly subject position"; count vectors can. A PMI gate
over presence sets was tried at three thresholds and did not fragment the
basin either — the fix was the vector, not the filter.

## What it actually found

**Castle Dracula → cluster B. Count Dracula → cluster A.** Separated,
unsupervised, with nothing taught — which is the specimen that started
this.

But the top-level split is **not** person/place, and must not be reported
as such. Cluster B is Danube, Carpathians, Slovaks, Szgany, Turk,
Hungarian, Borgo Pass, East Cliff — the Transylvania register. It is a
real distinction the material genuinely carries; naming it is the
reader's act, not the organ's. Person/place is a deeper cut than a 2-way
split reaches.

A separate, hand-declared control confirms the person/place signal is
present in the same features (cosine to declared person-set vs
place-set): 16/16 reference entities classified correctly, `Castle
Dracula` reads place at margin 0.410, `Count Dracula` reads person at
margin 0.155. That arm **declares its reference sets**, so it is a
control on the signal, never the mechanism — the unsupervised arm above
is the mechanism.

## Not yet built

The merge gate itself. `referent-fold.js` / `title-fold.js` do not
consult a kind, so `Castle Dracula` and `Count Dracula` still fold
together in the live cast even though the induction separates them.
Wiring the standing in is the next pass: the gate is "refuse a fold whose
two sides sit in different validated kinds," and it needs the kind
standing carried on the referent, not recomputed per merge.

Drivers: `/tmp` probes, to be promoted to `eval/` when the gate lands.


---

# Addendum: three nulls, and the one that answers membership (2026-09-01)

User: *"lets just let things segment into kinds as they truly are"* and
*"we are probably using a bad NUL."* Both were right, and chasing them
produced a working discriminator — `kind-standing.js`.

## The null ran BACKWARDS, which is why agglomeration stalled

Redealing which entity each mention belongs to gives every entity the
CORPUS-AVERAGE profile. So redealt entities are MORE alike than real ones:

| redeal null over 60 draws, 23,780 pairs | |
|---|---|
| median pairwise cosine | 0.400 |
| p99 | 0.880 |
| max | **0.950** |

Real entities are specialised, therefore LESS similar than chance. Testing
"observed similarity beats the null" is the wrong direction — it stalls
agglomeration at 105 singletons, which is exactly what was measured.
Binding energy (intra minus inter) has the direction right, which is why
the structure test worked and the similarity test did not.

## Binding energy is right for STRUCTURE and insensitive for MEMBERSHIP

Testing declared groups against the redeal null:

| group | observed | null max | verdict |
|---|---|---|---|
| places | 0.3557 | 0.0719 | 0/300 — censored above |
| persons | 0.2766 | 0.3058 | p≈0.163 — not a kind |
| CONTROL mixed 5+5 | 0.1628 | 0.1962 | p≈0.050 |
| CONTROL arbitrary 10 | 0.0119 | 0.2252 | p≈1.000 — correctly refused |

Two real findings. **Places are a MARKED kind; "person" is the unmarked
default** — the population is mostly persons, so a person-set is not
differentiated from its own background. And the controls behave, which is
what licenses reading the rest.

But adding ONE outsider to a cohesive ten-member set barely moves binding
energy: `PLACES + Van Helsing`, `PLACES + Mina` and `PLACES + Castle
Dracula` ALL came back censored above. A10 one level in — sound for "does
structure exist", insensitive to "does this member fit".

## The licensed pairing: the population is the null

Nothing redealt. "Is X a member of K" is answered by asking whether X sits
closer to K's members than the rest of the material does; the comparison
is every other entity, measured rather than simulated.

| candidate | fit | rank in population | verdict |
|---|---|---|---|
| Whitby, Varna, Exeter *(declared)* | 0.65-0.67 | 0/100 | member |
| **Castle Dracula** | **0.595** | **3/100** | **member** |
| Purfleet *(declared)* | 0.477 | 10/100 | marginal — disclosed |
| Renfield | 0.319 | 29/100 | not a member |
| **Count Dracula** | **0.244** | **43/100** | **not a member** |
| Van Helsing / Mina | 0.24 / 0.20 | 44 / 51 | not a member |
| East Cliff | 0.180 | 61/100 | not a member — *for want of evidence* |

9 of 10 declared members recover. The specimen separates by more than 2x.

## What ships, and what does not

`kind-standing.js` + `kind-standing.test.mjs` (12 cases, the real book, no
fixtures). `foldPermitted` refuses a fold ONLY on positive evidence of
different standing; `unknown` on either side allows it, because a thin
profile is a fact about the reader and not about the referents.

NOT closed, and pinned as a test rather than left implicit: **East Cliff /
West Cliff**. East Cliff has too few mentions to read and lands
mid-population — absence of evidence, not evidence of difference. The
merge gate is still not wired into the live cast; `kind-standing.js` has
no caller yet.
