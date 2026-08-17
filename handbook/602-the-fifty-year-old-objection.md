# 6.2 — The Fifty-Eight-Year-Old Objection, and Where the Project Is Actually Chipping at It

<!-- nav:start -->
[← 6.1 — A Short History of Machines That Were Said to Read](601-a-short-history-of-machines-that-were-said-to-read.md) · [Contents](000-index.md) · [6.3 — What's Actually New Here →](603-whats-actually-new-here.md)
<!-- nav:end -->








**Why this matters:** Chapter 3.6 already showed you the role-fold arc as a
worked example of the growth rule in action. This chapter is about the
actual problem that arc is trying to solve — a specific, named, decades-old
objection this project has not fully answered — and about being precise
regarding exactly what was borrowed from where in the attempt.

## The objection, stated the way its author stated it

In 1968, the linguist Charles Fillmore published an argument that a
sentence's grammatical subject is not the same thing as its semantic
agent — the thing actually doing the action — and that any system treating
the two as interchangeable will fail on a large fraction of ordinary
language. His own examples: *"John broke the window,"* *"the hammer broke
the window,"* *"the window broke."* In all three, the broken window sits in
the same grammatical slot. But John is the one who did it, the hammer is
the tool he did it with, and in the third sentence there's no agent named
at all. A rule that reads "the thing before the verb is the doer" gets the
first sentence right and the other two wrong — not as an edge case, but as
a predictable consequence of the rule itself. Fillmore's positive claim,
in his own retrieved words (from the working-paper text of "The Case for
Case"): *"The case notions comprise a set of universal, presumably
innate, concepts which identify certain types of judgments which human
beings are capable of making on the events that are going on around
them, judgments on such matters as who did it, who it happened to, what
got changed"* — and, on the sentences: *"none of these cases can be
interpreted as matched by the surface-structure relations Subject or
Object in any particular language."* Worth stating precisely: this
project borrows Fillmore's *diagnosis* (surface position is not semantic
role) and explicitly does not adopt his *remedy* — role-fold induces
unlabeled clusters from distribution alone, and claims nothing about
universal or innate case concepts.

## This project's own mouth has exactly that problem, by direct measurement

This isn't a hypothetical risk. The organ in this project responsible for
finding *who did what to whom* worked, for a long time, by finding a verb
and reading the word immediately before it as the doer — a word-order
rule, in exactly the shape Fillmore spent a career arguing against. And it
was tested directly, against real text judged independently for who
actually acted in each clause. It lost 87% of what that independent
judgment said was actually there. That's not a rounding error. It's the
specific, predicted failure of exactly the assumption Fillmore named,
arriving on schedule, fifty-eight years later, in a system that had never
read his paper going in — the project's own working notes state the
connection plainly rather than treat the failure as a mystery.

## What the wider field did about it, and why this project isn't doing that

Fillmore's objection has a well-trodden answer in the research world:
semantic role labeling. Large hand-annotated collections of real
sentences, with each argument tagged as agent, instrument, patient, and so
on — FrameNet, PropBank, a long-running sequence of shared evaluation
tasks. It works, moderately well, and it is thoroughly **supervised**: it
depends on exactly the kind of large, hand-built, human-annotated resource
the "reading as filling a template" era already showed doesn't scale
cleanly (FrameNet from 1997, PropBank from 2005, both hand-annotated).
There's also an **unsupervised** version of the idea — inducing role-like
clusters from patterns in text with no hand labels at all: Titov and
Klementiev, and Lang and Lapata, around 2010–11. It's real, live
research, with results that remain considerably weaker than the
supervised version — and, the essay adds, *"as far as I know, [it] has
never been demonstrated on the agentless register,"* the register this
project most needs it for.

The field also rediscovered Fillmore's problem from the opposite
direction, and one finding from that rediscovery converges on this
project's own mechanism closely enough that it has to be named. Open
Information Extraction — TextRunner in 2007, then ReVerb in 2011 (Fader,
Soderland and Etzioni) — set out to extract relations from web text with
no target schema at all. The ReVerb paper's own abstract, retrieved from
the published proceedings: *"This paper shows that the output of
state-of-the-art Open IE systems is rife with uninformative and
incoherent extractions. To overcome these problems, we introduce two
simple syntactic and lexical constraints on binary relations expressed
by verbs."* The lexical constraint is the one that matters here: a
relation phrase earns its status by recurring across many distinct
argument pairs. The essay's own words on what that means here: *"That is
`discoverRelationVocab` and the ≥2-distinct-surfaces recurrence
requirement, arrived at independently, and the convergence is the good
news. The bad news is in the first constraint: even with the recurrence
test, ReVerb needed a verb-centered syntactic pattern to avoid garbage."*
And verb-centered extraction has a well-known blind spot the essay names
precisely because it lands on this project's own corpus: it misses
nominalized relations — *"the acquisition of X by Y, the deployment of
cameras in the district"* — exactly the construction that dominates
administrative prose.

**This project is not doing either of those things**, and it's worth being
precise about why not, rather than leaving the impression that role-fold
is a homegrown reimplementation of semantic role labeling. Nothing in
role-fold is trained against a hand-annotated corpus of agent/instrument/
patient labels, and nothing in it inherits FrameNet's or PropBank's
category system. What it borrows instead — and this is the same precise
sense of "borrowed" Chapter 3.6 already walked through — is a strategic
idea from a completely different field: Michael Tomasello's "verb island"
work on how children actually acquire verbs, which found that they build
narrow, per-verb patterns of "who does this with what" long before they
generalize across verbs at all. Role-fold took that one finding — cluster
narrow, per verb, before you ever pool across verbs — and used it to
reorder its own clustering question, then tested whether the reorder
helped its own real data. It did. A second technique for finding
candidate word groups in the first place borrows, in the same precise
way, a statistical signature from Saffran, Aslin and Newport's research
on how infants segment continuous speech into word-like chunks with no
grammar at all.

## What this has actually earned, stated at the same size as the claim

A cross-lingual test found that the clustering mechanism itself reaches
real, structured groupings at similar rates across English, French,
German, and Finnish — evidence that the mechanism isn't secretly
English-specific, even though the earlier step that proposes candidate
words in the first place clearly is, and breaks predictably on German. The
short version, in the project's own words: *the mouth is language-specific
by construction, the organ isn't.*

And the honest ceiling, stated as plainly as the progress: what's been
found so far is **two unlabeled, position-shaped clusters per verb** — a
real structural finding, not nothing — and not yet Fillmore's actual goal,
which was named semantic roles like agent and instrument. Telling two
groups apart by their position in an event is a real step past a bare
word-order rule. It is not the same achievement as being able to say
*which* group is the agent and *which* is the instrument. That gap is
named directly, in the same file that reports the progress, rather than
left for a reader to notice on their own.

**Where this comes from:** Fillmore's argument and the field's response
(FrameNet 1997, PropBank 2005, unsupervised SRL by Titov & Klementiev
and Lang & Lapata c. 2010–11, TextRunner 2007, and ReVerb — Fader,
Soderland & Etzioni, 2011) are from `eoreader6/prior-art-teachable-
language-comprehender.md`, §III, including the direct citation *"Charles
Fillmore, The Case for Case, 1968"* and its three examples; every passage
in quotation marks above is verbatim from that section, including the
ReVerb convergence and the nominalized-relations limitation — except two
now drawn from the primary sources directly: the Fillmore sentences are
from the ERIC working-paper text of "The Case for Case" (ED019631; the
1968 Bach & Harms book printing has minor wording differences and was
not itself retrievable), and the ReVerb abstract is from the EMNLP 2011
proceedings PDF (ACL Anthology D11-1142). The 87%
recall-loss measurement is from `eoreader6/scripts/experiments/
FINDINGS.md` §1 (PR #44, `goldens/agency-civic/`). The verb-island
reordering (Tomasello), the transitional-probability chunking (Saffran,
Aslin & Newport), and the cross-lingual result ("the mouth is
language-specific by construction, the organ isn't") are from `eoreader6/
scripts/experiments/README.md` (PRs #45–48), which carries those
citations itself. The stated ceiling against Fillmore's actual goal (two
coarse, unlabeled kinds rather than named roles) is from `FINDINGS.md`
§11.4.

<!-- anchors:start -->

---

**Byte anchors** (generated — `node scripts/anchor-quotes.mjs`, verified by `--verify`; sources and their provenance in `sources/MANIFEST.json`). Each anchor is the UTF-8 byte range of the quoted words in the snapshot the manifest names:

- “the hammer broke the window,” → `eoreader6/prior-art-teachable-language-comprehender.md#b7151-7178`
- “The case notions comprise a set of universal,…” → `fillmore-1968#b74814-74970`, `fillmore-1968#b74971-75033`, `fillmore-1968#b75033-75092` *(+0 segment(s) not located)*
- “as far as I know, [it] has never…” → `eoreader6/prior-art-teachable-language-comprehender.md#b8604-8653` *(+1 segment(s) not located)*
- “This paper shows that the output of state-of-the-art…” → `reverb-2011#b589-653`, `reverb-2011#b655-779` *(+1 segment(s) not located)*
- “That is `discoverRelationVocab` and the ≥2-distinct-surfaces recurrence requirement,…” → `eoreader6/prior-art-teachable-language-comprehender.md#b9502-9789`
- “the acquisition of X by Y, the deployment…” → `eoreader6/prior-art-teachable-language-comprehender.md#b9890-9958`
- “Charles Fillmore, The Case for Case, 1968” → `eoreader6/prior-art-teachable-language-comprehender.md#b6904-6947`
- “the mouth is language-specific by construction, the organ…” → `eoreader6/scripts/experiments/README.md#b6685-6748`

Quoted spans **not located in any obtained source** and not explained by a known gap — each is either the book's own illustrative speech, or a passage that reads as verbatim and is not, which is itself a finding to resolve:

- “the thing before the verb is the doer”
- “none of these cases can be interpreted as…”
- “reading as filling a template”
- “who does this with what”

<!-- anchors:end -->

<!-- nav:start -->
[← 6.1 — A Short History of Machines That Were Said to Read](601-a-short-history-of-machines-that-were-said-to-read.md) · [Contents](000-index.md) · [6.3 — What's Actually New Here →](603-whats-actually-new-here.md)
<!-- nav:end -->
