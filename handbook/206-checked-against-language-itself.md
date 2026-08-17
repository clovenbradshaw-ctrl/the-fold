# 2.6 — Checked Against Language Itself

<!-- nav:start -->
[← 2.5 — Why All Three Have to Agree](205-why-all-three-have-to-agree.md) · [Contents](000-index.md) · [2.7 — Tried Against a Rival →](207-tried-against-a-rival.md)
<!-- nav:end -->



**Why this matters, and a boundary to draw first:** this chapter, like Part
VII, describes a related but separate generation of this project
(`eoreader4.2`), not eoreader6 or the current engine — but unlike Part VII,
what it describes isn't a different design choice. It's an actual empirical
test of the very three-axis structure Chapters 2.1, 2.3, and 2.4 just taught
you, run against real sentences in 41 languages, with its predictions
locked in advance and its failures reported as plainly as its successes.

## The question this study asked

Chapters 2.1 through 2.4 crossed three yes-or-no-or-neither questions —
what kind of change, what kind of territory, what grain — to build three
nine-cell grids. That's a claim about the shape of *any* transformation,
not just something read into eoreader6's own material after the fact. A
claim that general ought to be checkable against something completely
outside the project — and a related generation of this lineage actually
went and checked it, against language itself, across dozens of languages,
without ever showing the test's own vocabulary to whatever was doing the
checking.

## The method, stated plainly

Real sentences were pulled from real corpora in 41 languages. Each one was
asked three plain-language questions, with no mention anywhere of
"operator," "terrain," "stance," or any other word from this book:

- **Is this transformation separating, connecting, or producing?**
- **Is it operating on existence, organization, or meaning?**
- **Is the target a background condition, a specific thing, or a
  recurring pattern?**

Two different AI systems (Claude and GPT-4) answered independently, never
told what the answers would later be mapped onto. Only afterward were the
three answers translated into this project's own three axes — mode,
domain, grain — the same crossing Chapter 2.1 built the nine operators
from, Chapter 2.3 built the nine terrains from, and Chapter 2.4 built the
nine stances from. Separately, each original sentence was embedded by a
model that had never seen any of this project's vocabulary either. The
test then asked a simple question: do sentences that got the *same*
three answers end up sitting *closer together* in that blind embedding
space than sentences picked at random? If the three questions are tracking
something real about language, they should. If they're an arbitrary
grid imposed from outside, they shouldn't.

## What held up

The predictions were locked in before the results were read, and several
of them held. Sentences differing on more of the three axes really were
farther apart in embedding space, and the relationship was monotonic — one
axis of difference produced more distance than none, two more than one,
three more than two. Each of the three axes alone showed real, positive
geometric coherence (the "domain" axis showing the strongest signal, as
predicted in advance). Crossing two axes at once — producing this book's
own nine operators, nine terrains, and nine stances — showed *stronger*
coherence than any single axis alone, and the full 27-cell address stronger
still. Two independent AI judges agreed with each other at a real,
moderate-to-good rate on all three questions, not just a chance level. And
the structure wasn't an English artifact: 30 of 41 languages tested, from
Arabic to Vietnamese, showed the same signal at a real, checkable
strength, with the weakest results concentrated in the languages with the
least available text (Gothic, Wolof, Swahili) rather than scattered
randomly.

## What didn't, stated with the same plainness

Exactly the discipline this whole book has asked you to expect: several of
the study's own locked-in predictions failed, and its own report says so
in the same document, at the same length as the successes. The prediction
that all three axes would be statistically independent of one another
did not hold — mode and domain showed a real, stable correlation across
every version of the test, not just noise, and a follow-up check found no
support for the hope that this was an artifact of one axis simply having
sparser cells. More strikingly, a separate test asked whether the exact
numeric spacing this project's own coordinate system predicts for each
axis — equal steps for mode, a specific 4.8-to-1 asymmetry for domain, a
specific additive relationship for grain — actually shows up as real
distances in the embedding space. It came back negative on all three
counts: the steps were unequal in the wrong ratio, the domain asymmetry
ran in the opposite direction from what was predicted, and the grain
distances didn't add up the way the coordinate system says they should. The study's own
one-line verdict on itself is worth quoting exactly: *"Empirically strong
on proportionality and face-level clustering; mixed on axis independence;
coordinate geometry predictions not met."*

## A working exemplar set, as a side effect

Because the study needed real sentences to test against, it left behind
something usable on its own terms: close to 20,000 real clauses across 41
languages, each one independently tagged with which of the 27 cells it
falls into. That corpus is a genuine resource for a question this book has
answered so far only with invented illustrations — a hospital ward, a
mutual-aid map, a reading group. Wanting to know what an actual sentence at
`CON(Link, Binding)` or `EVA(Paradigm, Tracing)` looks like, in Spanish or
in Korean, has a real answer sitting in this corpus, not just a plausible-
sounding hospital analogy.

## Why this belongs next to Chapter 2.5, not instead of it

Chapter 2.5 told you the cube was tried once as a machine that reads real
content and assigns it a cell, and that this failed — shuffling the words
in real paragraphs left most cell assignments unchanged, meaning the
assignment was tracking something other than meaning. This study is not
that same test run again with a different result. It never asks the cube
to read a sentence and guess its cell; it asks two independent judges,
using plain language with no EO vocabulary in it at all, and only checks
afterward whether their answers correspond to real geometric structure.
Both findings can be true at once, and this book isn't going to blur them:
the cube still shouldn't be trusted to classify content on its own, and
the three-axis structure it's built from still shows up as something real
in blind, independent judgments of actual language — a claim about the
axes, not a vindication of the cube-as-classifier Chapter 2.5 already
retired.

One control this study never ran: every comparison here is against
*chance*, not against a rival set of three questions — so "the axes
track something real" was established, and "these axes are better than
some other three would be" was not. That missing test has since been run,
adversarially and pre-registered, and Chapter 2.7 reports what happened
to it.

**Where this comes from:** everything in this chapter is `eoreader4.2/docs/
eo-wiki.md`, "EO Lexical Analysis v2 — Results Report" and its companion
entry "The Lexical Analysis: EO's Preliminary Empirical Grounding" (the
latter carrying the exact epistemic-status line quoted above and the full
pre-committed-prediction table), describing a related but separate
generation's own empirical work — not eoreader6, and not a claim this book
is making about the current engine. The corpus size (19,764 clauses
embedded, 9,221 in consensus across 41 languages), the three-question
design and its verbatim prompt text, the z-scores and monotonicity result,
the ARI independence figures and the cell-exclusion follow-up, the
inter-model kappa figures, the per-language z-score table, and the
coordinate-geometry (α/η/Ω) test and its three negative results are all
drawn directly from those two entries.

<!-- anchors:start -->

---

**Byte anchors** (generated — `node scripts/anchor-quotes.mjs`, verified by `--verify`; sources and their provenance in `sources/MANIFEST.json`). Each anchor is the UTF-8 byte range of the quoted words in the snapshot the manifest names:


Not located because a source this chapter names is **not yet obtained** (`eoreader4.2/docs/eo-wiki.md` — see the manifest's `unobtained` list for each one's reason):

- “Empirically strong on proportionality and face-level clustering; mixed…”
- “the axes track something real”
- “these axes are better than some other three…”
- “EO Lexical Analysis v2 — Results Report”
- “The Lexical Analysis: EO's Preliminary Empirical Grounding”

<!-- anchors:end -->

<!-- nav:start -->
[← 2.5 — Why All Three Have to Agree](205-why-all-three-have-to-agree.md) · [Contents](000-index.md) · [2.7 — Tried Against a Rival →](207-tried-against-a-rival.md)
<!-- nav:end -->
