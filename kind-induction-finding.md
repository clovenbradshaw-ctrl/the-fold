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
