# 6.4 — The Honest Gap List

<!-- nav:start -->
[← 6.3 — What's Actually New Here](603-whats-actually-new-here.md) · [Contents](000-index.md) · [6.5 — Ancestors Named in the Code →](605-ancestors-named-in-the-code.md)
<!-- nav:end -->








**Why this matters:** this book has followed one rule since Chapter 0.1 —
never hide a gap. This closing chapter of Part VI is where that rule gets
applied at the largest scale in the whole book: a direct, sourced list of
what this project's own reading still doesn't do, stated by the same
outside review that named what's genuinely new in the last chapter.

## A note on where this diagnosis comes from

Everything in this chapter is one outside reviewer's assessment of the
codebase, checked against established psychology-of-reading research —
**not** design documents the project was following. A reviewer familiar
with that research read the actual code and measured results and reported
where they lined up and where they didn't. Three separate,
independently-developed theories from cognitive psychology happen to
agree with each other on one point, and the reviewer used that agreement
as a diagnostic tool — a checklist to hold the project's own measurements
up against. (One update since the first edition of this chapter: it used
to say the project's own working files never cite this literature. That
was true when the review was written and is no longer true — a second
audit has since put citations for the memory and boundary organs directly
into the code files themselves, with their divergences stated. Chapter
6.5 covers that audit in full.)

## The gap three theories agree on

The three theories, by name: Walter Kintsch and Teun van Dijk's
comprehension model (1978), developed into Kintsch's
**construction-integration model** (1988); Morton Ann Gernsbacher's
**Structure Building Framework** (1990); and Jerome Myers and Edward
O'Brien's **resonance model** (1996–98). The shared claim: comprehension
has two phases. The first is promiscuous and undiscriminating — a passage
activates everything associated with it, irrelevant material included,
with no filtering yet. The second is a settling process, where things
that reinforce each other strengthen and things that don't get
suppressed — in Gernsbacher's version the mechanism is **suppression**
itself, and her evidence is that less-skilled comprehenders are not worse
at activating meanings, they're worse at suppressing the ones that lose.
The reviewer's summary sentence, kept exact: *"Three theories, developed
independently over twenty years, all say the same thing: activation
without settling is not comprehension."*

One of the three the project actually got *right*, and the reviewer says
so: the resonance model holds that reactivation from long-term memory is
passive, cue-driven, and unguided by discourse focus — *"which eoreader6
committed to explicitly, in the conformance test that says activation
beats recency. This is the half the project got right, and getting it
right was a real theoretical choice, not a default."* What's missing is
the other half. There's no step where an already-resolved binding
actively dampens whatever competed with it, so a competitor that lost
stays exactly as active as it was before it lost. The reviewer's verdict
on the cost of that absence: *"I would call this the single highest-value
unbuilt thing in the reading path, and it is not a research problem. It
is a known algorithm from 1988."*

The project's own measurements are quietly consistent with this gap: the
raw count of things that responded to a passage carries real signal,
while the strength of any one response carries far less. (A caution the
second audit added later: the strongest version of that number in
circulation — 22 of 24 recalls, p≈0.005 — turned out to be stale,
measured against a fixture that doesn't exist in this repository. The
re-run gives 8 of 24, p≈0.046: still a real signal, several times
weaker. Chapter 6.5 has the full correction.)

## Three of five situation-model dimensions, honestly absent

Rolf Zwaan and Gabriel Radvansky's 1998 review of situation models
proposes that readers track a situation along five dimensions at once,
and pay a measurable cost whenever any one of the five breaks
continuity. Their own sentence, retrieved from the paper itself (p.
167): *"Each event can be indexed on each of five dimensions: time,
space, causation, motivation, and protagonist."* (One precision the
retrieval forced: the five dimensions are named in the paper's body, not
its abstract, and the paper itself alternates between "motivation" and
"intentionality" for the fourth dimension across sections.) Checked against this project's organs, in the
reviewer's own words: *"eoreader6 tracks protagonist (referents, well),
something adjacent to causation (surprise and strain, indirectly), time
only as reading order rather than as narrated time, and neither space nor
motivation at all."* Stated as what it is: not a criticism so much as a
map of where the remaining work actually goes, with the dimension this
project has invested most in being only one of five.

## What Chapter 6.2 already told you, in this list's terms

Chapter 6.2's ceiling belongs on this list too, stated at the same size:
the role-fold arc has found two unlabeled, position-shaped clusters per
verb, not yet Fillmore's actual named roles. Real progress, clearly short
of the fifty-eight-year-old goal, and — following this whole chapter's
discipline — stated as one honest sentence rather than left as two
different impressions depending on which part of the project someone
happened to read.

## What this chapter is not saying

None of this is presented, in the source material or here, as evidence
the project doesn't work or isn't worth taking seriously. It's the same
move Chapter 1.4 taught you about the two deaths, run on the project's own
self-assessment: naming a gap precisely is what lets it eventually get
closed, and a project that can't say exactly what it's missing is a
project that has quietly stopped being able to tell the difference between
"not built yet" and "doesn't exist."

**Where this comes from:** the two-phase comprehension theories (Kintsch
and van Dijk, 1978; Kintsch's construction-integration model, 1988;
Gernsbacher's Structure Building Framework, 1990; Myers and O'Brien's
resonance model, 1996–98 — all three-plus-one named there, and every
sentence quoted above is verbatim from there) are from
`eoreader6/prior-art-teachable-language-comprehender.md`, §V. Zwaan and
Radvansky's five-dimension situation-model checklist and its comparison
against this project's organs is from the same file, end of §V. Both are
explicitly the outside reviewer's own analysis, stated as such in the
essay's closing note: *"The connections drawn between this literature and
the engine's behaviour are mine and have not been checked against anyone
else's reading of it."* The stale-number correction (22/24 p≈0.005 →
8/24 p≈0.046) and the fact that `activation.js` and `tiers.js` now carry
their own citations in-file are from
`eoreader6/prior-art-surprise-segmentation-and-memory.md`, §4 and §1,
covered in full in Chapter 6.5. The Zwaan & Radvansky sentence is quoted
from the paper itself (*Psychological Bulletin* 123(2), 1998, retrieved
in full). Kintsch's 1988 *Psychological Review* paper and Gernsbacher's
Structure Building Framework texts could **not** be retrieved in this
pass (paywalled; the one candidate site failed repeatedly), so their
positions above are carried only in the essay's words, not their own —
stated per this book's rule that attested-at-one-remove and
verified-against-the-printing are different claims.

<!-- anchors:start -->

---

**Byte anchors** (generated — `node scripts/anchor-quotes.mjs`, verified by `--verify`; sources and their provenance in `sources/MANIFEST.json`). Each anchor is the UTF-8 byte range of the quoted words in the snapshot the manifest names:

- “Three theories, developed independently over twenty years, all…” → `eoreader6/prior-art-teachable-language-comprehender.md#b16480-16611`
- “which eoreader6 committed to explicitly, in the conformance…” → `eoreader6/prior-art-teachable-language-comprehender.md#b15312-15518`
- “I would call this the single highest-value unbuilt…” → `eoreader6/prior-art-teachable-language-comprehender.md#b17085-17230`
- “Each event can be indexed on each of…” → `eoreader6/prior-art-teachable-language-comprehender.md#b17311-17379` *(+1 segment(s) not located)*
- “eoreader6 tracks protagonist (referents, well), something adjacent to…” → `eoreader6/prior-art-teachable-language-comprehender.md#b17481-17692`
- “The connections drawn between this literature and the…” → `eoreader6/prior-art-teachable-language-comprehender.md#b28927-29070`

<!-- anchors:end -->

<!-- nav:start -->
[← 6.3 — What's Actually New Here](603-whats-actually-new-here.md) · [Contents](000-index.md) · [6.5 — Ancestors Named in the Code →](605-ancestors-named-in-the-code.md)
<!-- nav:end -->
