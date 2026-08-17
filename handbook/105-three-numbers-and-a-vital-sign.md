# 1.5 — Three Numbers and a Vital Sign

<!-- nav:start -->
[← 1.4 — The Two Deaths](104-the-two-deaths.md) · [Contents](000-index.md) · [2.1 — Nine Verbs →](201-nine-verbs.md)
<!-- nav:end -->











**Why this matters:** everything you've learned so far — ground, figure,
pattern, witness — is a set of *moves*. This chapter gives you the small set
of dials that control how finely and how often those moves actually get
made, plus the one number you check to tell whether the whole thing is
still healthy. Without these, later chapters that mention "window" or
"aperture" will sound like unexplained settings instead of the load-bearing
quantities they are.

## Three numbers, and nothing else is a default

This system declares exactly three numbers as its physiology — meaning:
these aren't convenience settings with a "usually fine" value baked in.
Every one of them has to be stated on purpose, every time, because each one
changes what a ground and a figure actually mean.

- **`draws`** — how many times the system samples when rebuilding a
  ground. Think of it as *how fine a distinction the system is capable of
  drawing at all*. With few draws, only big, obvious differences will ever
  register. With many, much subtler ones can. This is the resolution of
  everything the system is willing to say — the finest thing it could ever
  report is exactly one divided by this number.
- **`reseeds`** — how many times the comparison itself gets redone from
  scratch. This is the resolution of *pattern* specifically — how carefully
  the system checks whether a figure really did move the next ground,
  rather than appearing to on one lucky rebuild.
- **`window`** — how much of the recent material counts as "now." A ground
  is only ever built from what falls inside this reach. Make it too narrow
  and the system loses context; too wide, and things that are genuinely
  old start counting as current.

Notice what's *not* on this list: how much material there is overall. That's
not a dial the system sets — it's a fact about what was handed to it,
already decided by whoever supplied the material, before any of these three
numbers come into play.

## The one number that isn't a score

Given all that machinery, how do you tell, from the outside, whether the
system is doing well? Not by checking whether its answers feel right — this
system deliberately doesn't produce a confidence score you could read that
way. Instead there's a single vital sign, called **aperture**.

Aperture measures something very specific: *how wide the ground currently
is* — literally, the spread between the middle-ish values the ground's own
rebuilding produced. A ground that's narrow is a system with a very tight,
committed sense of "ordinary." A ground that's wide is a system whose sense
of "ordinary" still has real room in it.

Here's the part that matters most: **neither narrow nor wide is
automatically good.** A narrowing ground can mean the system has genuinely
learned something and sharpened its sense of what's typical — that's
healthy. Or it can mean the system is sliding toward Chapter 1.4's second
death, its ground slowly closing until nothing can surprise it. A widening
ground can mean the system just encountered something genuinely new and
is appropriately opening back up — also healthy. Or, read wrong, it could
look like the system just isn't settling on anything.

That's why aperture is never used as a gate ("don't answer below this
number") and never treated as a score ("higher is better"). It's checked
continuously, the way you'd check your own pulse — not to pass or fail a
threshold, but because a steady trace over time tells you something a
single reading never could. The source material's own description is worth
keeping as-is: aperture is *"the warmth you check for."*

## Two fields that already had a version of each idea

`draws`, `reseeds`, and `window` have a real cousin in statistics: kernel
density estimation, a decades-old technique for building a smooth picture
of "what's typical" out of raw data points, has to declare a **bandwidth**
— exactly the same kind of load-bearing dial as this system's three
numbers, in that a narrow bandwidth draws fine distinctions and risks
mistaking noise for structure, while a wide one smooths real structure away
entirely. Statisticians have never treated bandwidth as something with a
universally correct default either — it has to be chosen for the data in
front of you, the same discipline Chapter 1.5 insists on here.

Aperture's role — a single number, watched continuously, that is neither a
pass/fail gate nor a score to maximize — has an older parallel in
physiology itself: Walter Cannon's 1932 concept of **homeostasis**, later
refined into **allostasis** (stability achieved through change, rather than
around a fixed setpoint). A clinician checking a vital sign isn't hunting
for one correct number; they're watching a trace over time, the same
posture this chapter asks you to take toward aperture. Where the parallel
loosens: homeostasis classically describes a system defending one narrow
setpoint, while allostasis and aperture both describe systems that are
supposed to *move*, appropriately, in response to real change — aperture
narrowing or widening is not itself the problem; only the wrong kind of
narrowing or widening is.

## A word that changed, on purpose, and the record kept

This particular number wasn't always called aperture. Until early August
2026, it was called `ananda` — a word that means bliss. That name was
retired, deliberately, and this is worth knowing because it's the clearest
example in the whole system of a discipline you'll see again: **a name is a
claim.** Calling a plain interquartile-spread measurement "bliss" asserted
that the number told you something about the system's *state* — as though
a wide, healthy-looking ground meant the system was, in some sense, content.
Nothing about the measurement ever established that. The definition was
honest and the math never changed; the word was making a promise the
measurement hadn't earned. So it was renamed, and the old name wasn't
quietly erased — it's on the record, with the date and the reason, exactly
the way this book tries to handle its own claims.

**Where this comes from:** `eoreader6/SEED.md`, "Three declared numbers" and
"The sign of health" — *"They are the whole physiology. None of them is
ever a default"* and *"Aperture is the volume of the ground... Never a
gate, never a score: the warmth you check for."* The rename is recorded in
the same file and in Amendment XVII, *"A quantity's name is a claim about
what it is"* — *"Ananda means bliss. The identifier therefore asserted that
an interquartile width is a state of the system, and no null in this repo
establishes that."* The kernel-density-bandwidth and homeostasis/allostasis
connections above are this book's own added links to statistics and
physiology, not something the codebase itself cites.

<!-- anchors:start -->

---

**Byte anchors** (generated — `node scripts/anchor-quotes.mjs`, verified by `--verify`; sources and their provenance in `sources/MANIFEST.json`). Each anchor is the UTF-8 byte range of the quoted words in the snapshot the manifest names:

- “the warmth you check for.” → `eoreader6/SEED.md#b6014-6038`
- “They are the whole physiology. None of them…” → `eoreader6/SEED.md#b5127-5188`
- “Aperture is the volume of the ground... Never…” → `eoreader6/SEED.md#b5550-5586`, `eoreader6/SEED.md#b5985-6038`
- “A quantity's name is a claim about what…” → `eoreader6/SEED.md#b49621-49666`
- “Ananda means bliss. The identifier therefore asserted that…” → `eoreader6/SEED.md#b50129-50279`

Quoted spans **not located in any obtained source** and not explained by a known gap — each is either the book's own illustrative speech, or a passage that reads as verbatim and is not, which is itself a finding to resolve:

- “don't answer below this number”

<!-- anchors:end -->

<!-- nav:start -->
[← 1.4 — The Two Deaths](104-the-two-deaths.md) · [Contents](000-index.md) · [2.1 — Nine Verbs →](201-nine-verbs.md)
<!-- nav:end -->
