# 2.7 — Tried Against a Rival

<!-- nav:start -->
[← 2.6 — Checked Against Language Itself](206-checked-against-language-itself.md) · [Contents](000-index.md) · [3.1 — A Reading, From the Inside →](301-a-reading-from-the-inside.md)
<!-- nav:end -->


**Why this matters:** Chapter 2.6 showed you the three axes tested against
*chance* — and holding up. This chapter reports the test Chapter 2.6's
study never ran: the same instrument, aimed at the question that actually
decides whether the axes deserve their standing. "The three questions
track something real" and "the three questions carve language better than
some other three questions would" are different claims. Only the first
had ever been measured. The second was tested, adversarially, on purpose,
by this project — and this chapter reports what happened to it, in the
order the predictions were locked.

## The design: same instrument, plus the missing control

The original study's logic: ask blind judges three plain-language
questions about real sentences, embed the sentences with a model that
never sees the labels, and check whether sentences that answered the same
way sit closer together than chance. This experiment
(`eoreader6/scripts/experiments/rival-triads/`) reran that logic on 360
fresh English sentences from twelve sources across seven registers — and
added the control: a **rival triad**, assembled deliberately from
off-the-shelf linguistics that owes nothing to this project. Its three
questions: does the sentence mainly describe *an action, an experience of
sensing/feeling/saying, or a state of being/having* (process type, after
Halliday); is it about *the past, the present, or the future/a timeless
generality* (time); does the main event involve *one, two, or
none-or-more-than-two participants*. A third, mechanical "system" —
sentence-length terciles, comma counts, and an alphabetical axis designed
to be pure noise — calibrated the instrument itself.

Every prediction was written down before a single sentence was judged
(the pre-registration file itself is precise about what that ordering
can and can't be proven by, since the experiment lands in git as one
batch). Four independent judges (two per question-set) saw only
shuffled sentences and their own three questions — no vocabulary from
either theory, no statement of purpose. The falsification rule, verbatim
from the pre-registration: *"if an off-the-shelf rival triad from
ordinary linguistics matches or beats the EO triad on the same
instrument, the superiority claim is falsified — coherence-against-chance
would then be a cheap property many partitions share, not evidence for
these particular axes."*

## What held

Chapter 2.6's core result replicated on a fresh sample: every one of the
three axes shows real geometric coherence (the weakest, mode, at z≈5;
domain and grain far above), the full 27-cell address is more coherent
than any axis alone, and distance grows monotonically with the number of
axes two sentences differ on. The noise axis showed nothing (z=−1.1),
so the instrument doesn't manufacture coherence out of arbitrary labels.

## What did not

**The rival triad reproduced the entire qualitative signature.** Real
coherence per axis. Real full-address coherence. The same clean
monotonic staircase. On the primary specification (sentences where both
judges agreed on everything — the original study's own consensus rule),
the project's triad came out ahead on both headline measures — by about
10–15%. That margin did not survive a change of specification: scored on
all 360 sentences under one judge's labels, the rival's mean per-axis
score was *higher*. Effect sizes stayed modestly in the project's favor
throughout, never by more than about 16%.

So: not falsified — the rival did not match-or-beat the project's triad
across the board. And not vindicated either — a triad assembled in an
afternoon from textbook distinctions landed within noise of axes this
lineage has spent years on, and every property Chapter 2.6 reported as
evidence *for* these axes (coherence, address-level structure,
monotonicity) turned out to be evidence only that a partition is
semantically real, not that it is *these* axes. The results file's own
summary sentence: *"The stronger claim — that THESE three dimensions
carve language better than some other three would — is unsupported."*

Two more findings, one against the grid and one for it, reported at the
same size. Against: the rival's questions were operationally *cheaper* —
independent judges fully agreed on 80% of sentences under the rival's
questions, 67% under this project's. For: the one clear, unpredicted win
was **axis independence**. The project's axes reproduced Chapter 2.6's
known mode–domain correlation, but the rival's axes were more entangled
still — so if the triad has a measured superiority claim on this
instrument, it is "closer to orthogonal than an obvious rival," which is
a real virtue in a coordinate system, and a much narrower claim than
anyone had been making.

And one deflationary calibration that binds both triads: a partition of
the same sentences by *which document they came from* carries roughly
ten times the geometric coherence of either triad. Whatever the three
questions measure, it is a thin layer of structure on top of a much
larger topical signal — a proportion worth keeping in view whenever
these axes are described as carving language at its joints.

## Why this chapter exists at all

An opinionated ontology (Chapter 0.3's phrase) earns the right to its
opinions exactly this way: by naming, in advance, the result that would
embarrass it, and running the test anyway. The grid has now been
demoted once (the classifier, Chapter 2.5), confirmed once against
chance (Chapter 2.6), and held to a draw by a rival it invited (this
chapter). What remains standing afterward is smaller than the original
claim and better earned: three questions that track something real,
more independent of each other than an obvious alternative, and no
longer describable as uniquely privileged carvers of language — because
that was tested, and it didn't hold.

**Where this comes from:** the experiment, its locked predictions, its
raw judge labels, and its full numbers are
`eoreader6/scripts/experiments/rival-triads/` — `PREREGISTRATION.md`
(written before judging, with its own note on how that ordering is
attested; the falsification rule above is quoted from it verbatim),
`RESULTS.md` (all quoted verdicts), `results.json`, and `labels/`. The original study it extends is the one Chapter 2.6
describes (`eoreader4.2/docs/eo-wiki.md`, "EO Lexical Analysis v2"). The
rival's process-type axis is adapted from M.A.K. Halliday's transitivity
system (material/mental/relational processes) — named here as the
book's own choice of a strong rival, precisely *because* it is
well-established prior art, not because this project ever drew on it.

<!-- anchors:start -->

---

**Byte anchors** (generated — `node scripts/anchor-quotes.mjs`, verified by `--verify`; sources and their provenance in `sources/MANIFEST.json`). Each anchor is the UTF-8 byte range of the quoted words in the snapshot the manifest names:


Not located because a source this chapter names is **not yet obtained** (`eoreader4.2/docs/eo-wiki.md` — see the manifest's `unobtained` list for each one's reason):

- “The three questions track something real”
- “the three questions carve language better than some…”
- “if an off-the-shelf rival triad from ordinary linguistics…”
- “The stronger claim — that THESE three dimensions…”
- “closer to orthogonal than an obvious rival,”

<!-- anchors:end -->

<!-- nav:start -->
[← 2.6 — Checked Against Language Itself](206-checked-against-language-itself.md) · [Contents](000-index.md) · [3.1 — A Reading, From the Inside →](301-a-reading-from-the-inside.md)
<!-- nav:end -->
