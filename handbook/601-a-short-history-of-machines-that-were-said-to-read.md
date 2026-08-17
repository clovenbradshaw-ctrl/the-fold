# 6.1 — A Short History of Machines That Were Said to Read

<!-- nav:start -->
[← 5.6 — Senses, Memory, and Borrowed Models](506-senses-memory-and-borrowed-models.md) · [Contents](000-index.md) · [6.2 — The Fifty-Eight-Year-Old Objection, and Where the Project Is Actually Chipping at It →](602-the-fifty-year-old-objection.md)
<!-- nav:end -->








**Why this matters:** everything you've read so far might sound like the
first serious attempt at any of this. It isn't, and the people who built
this project are explicit about that. This chapter is the honest history —
told the way an outside reviewer of this project's own working notes told
it — so you can see this system as one entry in a much longer, mostly
failed, sequence rather than as something that fell from the sky.

## Reading has been redefined four times, and each time the definition was gamed

Here's the framing device this whole chapter is built on, stated plainly:
*"Reading is whatever the current benchmark measures. That has been true
four times, and each time the definition was gamed and then quietly
replaced."*

**First: reading as building something you could paraphrase from (1972).**
This is Roger Schank's **conceptual dependency** theory: a sentence
counted as understood once it had been converted into a structured
representation of basic actions, precise enough that a system could
generate paraphrases, answer questions, and draw the inferences a text
left implicit — in the essay's own words, *"John gave Mary a book becomes
an ATRANS with filled slots, and the system knows Mary has the book now
without being told."* Scripts followed in 1977 (Schank and Abelson), and
the systems built on them were real: *"This was real reading in a way
that nothing since has quite matched. SAM understood stories. PAM
tracked goals. FRUMP, in 1979, skimmed live UPI newswire using sketchy
scripts and produced summaries. That is a machine reading the news."*
It died of the knowledge acquisition bottleneck: *"Every script was
hand-built. The restaurant script did not generalize to a hospital, and
the hospital script did not generalize to a procurement hearing, and
there is no finite list of scripts. Lenat's CYC, from 1984, was the
heroic attempt to just write them all down, and forty years later that
project is still the standing demonstration of how large the number
is."*

**Second: reading as filling in a template (1987–1998).** The **Message
Understanding Conferences** — MUC — seven of them, DARPA-funded: read
news reports (MUC-3 and MUC-4 used Latin American terrorism reports) and
fill in fixed slots — perpetrator, target, date, instrument. It stalled:
scores plateaued well below what a human could do, and, tellingly, human
annotators didn't even agree with each other often enough to make the
ceiling itself clear. The programs that resulted were brittle and
expensive to move from one kind of document to another. One thing MUC
learned the expensive way outlived it: MUC-6, in 1995, split **named
entity recognition** and **coreference** out as scored tasks in their own
right — not because they were interesting, but because template filling
kept failing on them — and the modern definitions of both tasks descend
from that decision. Chapter 3.3's organs partition the same problem along
a strikingly similar seam, a convergence the essay works through at
length.

**Third: reading as picking out the right span of text (1999 onward).**
Hirschman's **Deep Read** (1999) proposed grade-school reading
comprehension tests as an AI evaluation — and found a bag-of-words
baseline did unnervingly well, which should have been the warning.
Instead the paradigm scaled: the CNN/Daily Mail cloze task (Hermann et
al., 2015), then **SQuAD** (Rajpurkar et al., 2016), and a decade of
leaderboards. It was gamed almost as fast as it scaled: Chen, Bolton and
Manning took apart CNN/Daily Mail in 2016 and showed a large fraction
was either trivially solvable or unanswerable noise; Jia and Liang
(2017) appended one irrelevant, distracting sentence to SQuAD passages
and watched systems collapse; and other work showed models that saw
*only* the passage or *only* the question still scored far above chance,
meaning the datasets carried exploitable artifacts. Hector Levesque had
anticipated the whole problem in 2011 with the Winograd Schema
Challenge — deliberately built so pronoun resolution required world
knowledge — and it, too, was eventually saturated.

**Fourth: reading as producing text a human rates as good (today).** In
the essay's words: *"It is not really a definition, it is a preference
model, and it has the interesting property of being unfalsifiable from
the outside: there is no artifact to inspect, no structure to audit, no
record of what was used. The system either satisfies you or it
doesn't."*

## A pattern with a name in philosophy of science generally

"Reading is whatever the current benchmark measures" isn't a complaint
unique to this field. The physicist Percy Bridgman named the general
version of it in 1927: **operationalism**, the position that a concept
just *is* the set of operations used to measure it — mass is whatever a
particular measuring procedure returns, nothing more and nothing less.
Bridgman meant this as a discipline for physics, forcing concepts to stay
tied to something actually measurable. Applied to a field without physics'
precision, the same idea curdles into exactly the trap Chapter 6.1
describes: if "reading" is simply whatever the current benchmark measures,
then a system that games the benchmark has, by that same definition,
learned to read — right up until the benchmark gets replaced and the
whole cycle starts over. Bridgman's own discipline and this field's
repeated experience are two sides of the same fact: tying a concept
tightly to one measurement procedure is powerful and honest exactly until
that procedure turns out to be gameable, at which point the concept and
the measurement quietly come apart.

## What all four have in common

Each one of these was operationalized by whatever could actually be
scored at the time — and each, once it became the scoreboard, got
optimized against directly rather than genuinely solved. That pattern is
exactly why the next chapter matters: the project this book is about is,
by its own outside reviewer's account, implicitly proposing a fifth
definition of reading, and Chapter 6.3 is about what makes that one
different in kind rather than just newer.

**Where this comes from:** `eoreader6/prior-art-teachable-language-
comprehender.md`, §II, "Reading has been redefined four times, each time by
its scoreboard." Every passage in quotation marks above is verbatim from
that section. The named systems and studies — Schank's conceptual
dependency (1972), Schank and Abelson's scripts (1977), SAM, PAM, FRUMP
(1979), Lenat's CYC (1984–), the Message Understanding Conferences
(1987–1998) and MUC-6's introduction of named entity recognition and
coreference (1995), Hirschman et al.'s Deep Read (1999), Hermann et al.'s
CNN/Daily Mail cloze (2015), Rajpurkar et al.'s SQuAD (2016), Chen,
Bolton and Manning's dataset analysis (2016), Jia and Liang's adversarial
distractors (2017), and Levesque's Winograd Schema Challenge (2011) — are
all named in that essay, §II and §IV, and its closing note carries its own
caution, repeated here because it applies to this chapter too: *"Prior art
is cited from memory and has not been re-read for this essay… Dates and
attributions should be verified before any of this is published."* The
Bridgman/operationalism connection above is this book's own added link to
the philosophy of science, not something the codebase itself cites.

<!-- anchors:start -->

---

**Byte anchors** (generated — `node scripts/anchor-quotes.mjs`, verified by `--verify`; sources and their provenance in `sources/MANIFEST.json`). Each anchor is the UTF-8 byte range of the quoted words in the snapshot the manifest names:

- “Reading is whatever the current benchmark measures. That…” → `eoreader6/prior-art-teachable-language-comprehender.md#b2713-2860`
- “John gave Mary a book becomes an ATRANS…” → `eoreader6/prior-art-teachable-language-comprehender.md#b3214-3334`
- “This was real reading in a way that…” → `eoreader6/prior-art-teachable-language-comprehender.md#b3406-3640`
- “Every script was hand-built. The restaurant script did…” → `eoreader6/prior-art-teachable-language-comprehender.md#b3692-4059`
- “It is not really a definition, it is…” → `eoreader6/prior-art-teachable-language-comprehender.md#b6219-6482`
- “Reading is whatever the current benchmark measures” → `eoreader6/prior-art-teachable-language-comprehender.md#b2713-2763`
- “Reading has been redefined four times, each time…” → `eoreader6/prior-art-teachable-language-comprehender.md#b2558-2624`
- “Prior art is cited from memory and has…” → `eoreader6/prior-art-teachable-language-comprehender.md#b27642-27712`, `eoreader6/prior-art-teachable-language-comprehender.md#b28852-28925`

<!-- anchors:end -->

<!-- nav:start -->
[← 5.6 — Senses, Memory, and Borrowed Models](506-senses-memory-and-borrowed-models.md) · [Contents](000-index.md) · [6.2 — The Fifty-Eight-Year-Old Objection, and Where the Project Is Actually Chipping at It →](602-the-fifty-year-old-objection.md)
<!-- nav:end -->
