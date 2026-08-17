# 6.5 — Ancestors Named in the Code

<!-- nav:start -->
[← 6.4 — The Honest Gap List](604-the-honest-gap-list.md) · [Contents](000-index.md) · [7.1 — A Construction Language →](701-a-construction-language.md)
<!-- nav:end -->


**Why this matters:** Chapters 6.1 through 6.4 drew on one essay — the
outside review of machines that were said to read. The project has since
run a **second** citation audit on itself, covering a different set of
organs (boundary detection and associative memory), and this book had not
carried a word of it until this chapter. That audit did three things this
book's own discipline requires it to report: it put citations *into the
code files themselves*, it ran a real measured comparison against two
published rivals and reported losing ground where it lost ground, and it
corrected a stale number this book itself had inherited. All three belong
here, at full size.

## Citations moved from prose into the code

The first audit (Chapter 6.3's source) drew the Quillian line by hand, in
an essay. The second audit went further: it put the lineage into the
files, next to the mechanisms. The memory organ's own header
(`eoreader6/packages/engine/emergence/activation.js`) now names its
ancestors and — just as carefully — the lineage it is *not*:

> "sparse coding at the dentate gyrus and one-shot pattern completion at
> CA3 are Marr's (1971) archicortex model, developed into the sparse/dense
> complementary-learning-systems account by McClelland, McNaughton &
> O'Reilly (1995). The nearby-sounding but DIFFERENT lineage is spreading
> activation (Collins & Loftus 1975; surveyed for IR by Crestani 1997) —
> cited here because it is the mechanism this one is not: spreading
> activation propagates across multiple hops with decay, which is exactly
> the 'similarity flood' #3 above names and rejects. One recurrent hop is
> a deliberate departure from that lineage, not an application of it."

Read that twice, because it's the whole method in one comment: **cite the
ancestor without also asserting the sameness the code's own design argues
against.** David Marr's 1971 model of the hippocampus and the 1995
complementary-learning-systems account are claimed as real ancestors of
the mechanism. Collins and Loftus's spreading activation — the direct
descendant of the very 1969 program Chapter 6.3 is about — is named in the
same breath *as the thing this organ deliberately is not*. If you
remember Chapter 6.3's "fifty-seven years apart, same mechanism," this is
the correction that keeps that sentence honest: same *starting* mechanism,
and then one deliberate structural departure — one recurrent hop, never a
multi-hop flood — that the code states as a rejection of the older
lineage, not an implementation of it.

The boundary-detection organ got the same treatment. `emergence/tiers.js`
finds section boundaries by watching for runs where the material exceeds
what its own prior would predict — its header's claim is *"runs of
exceedance ARE the windows."* The audit named that claim's literature and
its divergence from it, in the file:

> "unsupervised text/audio segmentation by local statistical departure,
> without a topic label or trained model — Foote (2000)'s
> self-similarity-matrix novelty for audio, Hearst (1997)'s TextTiling
> lexical-cohesion valleys for text. Cited here, not applied: both score a
> FIXED comparison (a similarity kernel; adjacent-block cohesion) against
> its own local history, where this gate scores KL-divergence exceedance
> against a null GENERATED from the tier's own prior … — a different
> statistic solving the same problem, not an instance of theirs."

Jonathan Foote's 2000 method finds boundaries in *audio* by sliding a
checkerboard-shaped kernel along a self-similarity matrix; Marti Hearst's
1997 TextTiling finds them in *text* by looking for valleys in
lexical cohesion between adjacent blocks. Both are real, published
ancestors of "find the seams by local statistical departure." And the
divergence is stated where it can't drift away from the code it
describes: those methods compare against a fixed local statistic, this
organ compares against a null rebuilt from its own prior.

## The measured comparison, including where it lost

Naming Hearst's TextTiling as an ancestor raised an obvious question the
audit did not duck: *does this project's boundary detector actually beat
it?* So it ran the comparison — TextTiling and a second published
method, C99 (Choi's 2000 algorithm), reimplemented from their papers,
on the same Frankenstein text, same 100-word frames, same 24-chapter
ground truth as every other Frankenstein measurement in the repository,
scored with the segmentation field's own standard error metrics (Pk,
from Beeferman, Berger & Lafferty 1999; WindowDiff, from Pevzner &
Hearst 2002).

The result, exactly as the audit stated it:

> "The modelless novelty detector does not clearly beat TextTiling/C99 on
> Pk/WindowDiff — it is roughly tied with C99's oracle-count mode and
> ahead of both baselines' natural mode, on a five-boundary, likely
> underpowered sample."

Unpacked: left to their own natural stopping rules, both published
baselines placed an order of magnitude too many boundaries (249 and 422
against 24 real chapters) and scored at or below chance. Handed the true
answer count — an oracle this project's own detector has no parameter to
receive — C99 came out *slightly ahead* of this project's mechanism.
The honest framing the audit chose, and this book repeats, leans on what
the detector actually has: it was the only method of the three that beat
a matched-count random null *without being told how many boundaries to
find* — and it does **not** lean on a raw-score victory, "because on
this run it does not clearly do that."

## A stale number, caught and corrected

The same audit caught the project — and, by inheritance, this book —
citing a dead result. Chapter 6.4 told you the count of prior passages
that respond to a cue carries real signal. The figure behind that claim
("22/24, p≈0.005") turned out to have been measured against a fixture
path from a legacy repository that doesn't exist in eoreader6, and it
does not reproduce on the fixture actually committed there. The audit
re-ran it: **8/24 causal recall, p≈0.046** — still a real signal, several
times weaker than the number in circulation. Its own words: *"The number
this repo has been citing for this comparison is stale."* Chapter 6.4
now says so too. A corrected number that still clears its null is not an
embarrassment in this project's terms; citing the uncorrected one after
the correction exists would be.

## Ancestors cited before the organ exists

One more discipline worth showing. A planned mechanism the project calls
Assembly C — a slow layer re-tuning a fast layer's own parameters — is
*not built*. The audit cited its nearest ancestors anyway, in the design
document and in the file the mechanism would plug into: Fortescue,
Kershenbaum & Ydstie (1981) for continuous forgetting-factor re-dialing,
and the drift-detection pair DDM (Gama, Medas, Castillo & Rodrigues,
2004) and ADWIN (Bifet & Gavaldà, 2007) for the discrete gate — *"recorded
so the comparison is available when C is built, not invented
retroactively to make C look novel."* Prior art filed before the thing
exists cannot be accused of being decorated on afterward.

## The comparison it refused to fake

The audit was asked to compare the memory organ against HippoRAG 2
(Gutiérrez et al., 2025), a state-of-the-art retrieval system that also
takes its architecture from the hippocampus. It reported the dependency
comparison that *is* checkable — HippoRAG 2 needs a large language
model, an embedding encoder, and a vector index; this project's memory
organ imports none of the three, checkable against the import list of
every file in `emergence/` and `referents/` — and then declined to run a
recall benchmark, for a stated structural reason: *"this repo has no
multi-hop retrieval mode to point at one"* — one recurrent hop is the
whole design, and building a multi-hop mode just to lose or win a
benchmark would be inventing the capability under audit. And when the
request that prompted the audit mentioned a falsification paper by one
"Nikolopoulos" that could not be located, the audit wrote down that it
could not be located, and did not invent a citation to fill the slot —
Chapter 3.5's "a gap is a result," applied to a bibliography.

**Where this comes from:** everything in this chapter is
`eoreader6/prior-art-surprise-segmentation-and-memory.md` (all six
sections), plus the two code headers it edited, quoted above directly
from `eoreader6/packages/engine/emergence/activation.js` and
`eoreader6/packages/engine/emergence/tiers.js` as they now stand. The
measured table (Pk/WindowDiff for this repo's detector, TextTiling, and
C99, natural and oracle modes) is that essay's §4; the stale-number
correction is §4, agreeing with `eoreader6/scripts/RESULTS.md`, "(3) The
premise number does not reproduce"; the Assembly C citations are §3; the
HippoRAG 2 dependency comparison and the refused benchmark are §5; the
refused Nikolopoulos citation is §6. The one-line summaries of Foote
(2000), Hearst (1997), and Choi's C99 given above are this book's own
glosses of those published methods, added so the reader knows what the
cited papers actually do — the citations themselves are the code's and
the essay's, not this book's.

<!-- anchors:start -->

---

**Byte anchors** (generated — `node scripts/anchor-quotes.mjs`, verified by `--verify`; sources and their provenance in `sources/MANIFEST.json`). Each anchor is the UTF-8 byte range of the quoted words in the snapshot the manifest names:

- “sparse coding at the dentate gyrus and one-shot…” → `eoreader6/packages/engine/emergence/activation.js#b1562-1601`, `eoreader6/packages/engine/emergence/activation.js#b1805-1845`, `eoreader6/packages/engine/emergence/activation.js#b1950-1991`, `eoreader6/packages/engine/emergence/activation.js#b2029-2071`, `eoreader6/packages/engine/emergence/activation.js#b2106-2144` *(+8 segment(s) not located)*
- “fifty-seven years apart, same mechanism,” → `eoreader6/prior-art-surprise-segmentation-and-memory.md#b712-751`
- “runs of exceedance ARE the windows.” → `eoreader6/packages/engine/emergence/tiers.js#b3626-3660`
- “unsupervised text/audio segmentation by local statistical departure, >…” → `eoreader6/packages/engine/emergence/tiers.js#b4011-4059`, `eoreader6/packages/engine/emergence/tiers.js#b4369-4419` *(+8 segment(s) not located)*
- “The modelless novelty detector does not clearly beat…” → `eoreader6/prior-art-surprise-segmentation-and-memory.md#b7103-7170` *(+3 segment(s) not located)*
- “because on this run it does not clearly…” → `eoreader6/prior-art-surprise-segmentation-and-memory.md#b7694-7741`
- “The number this repo has been citing for…” → `eoreader6/prior-art-surprise-segmentation-and-memory.md#b4119-4184`
- “recorded so the comparison is available when C…” → `eoreader6/prior-art-surprise-segmentation-and-memory.md#b3385-3489`
- “this repo has no multi-hop retrieval mode to…” → `eoreader6/prior-art-surprise-segmentation-and-memory.md#b9040-9097`
- “a gap is a result,” → `eoreader6/11-terrain-occupancy-and-the-two-ascents.md#b520-537`
- “(3) The premise number does not reproduce” → `eoreader6/prior-art-surprise-segmentation-and-memory.md#b4398-4438`

Quoted spans **not located in any obtained source** and not explained by a known gap — each is either the book's own illustrative speech, or a passage that reads as verbatim and is not, which is itself a finding to resolve:

- “find the seams by local statistical departure.”

<!-- anchors:end -->

<!-- nav:start -->
[← 6.4 — The Honest Gap List](604-the-honest-gap-list.md) · [Contents](000-index.md) · [7.1 — A Construction Language →](701-a-construction-language.md)
<!-- nav:end -->
