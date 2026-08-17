# 1.4 — The Two Deaths

<!-- nav:start -->
[← 1.3 — Witness](103-witness.md) · [Contents](000-index.md) · [1.5 — Three Numbers and a Vital Sign →](105-three-numbers-and-a-vital-sign.md)
<!-- nav:end -->











**Why this matters:** every design choice later in this book — every organ,
every refusal, every amendment to the rules this system lives under — is,
in the end, a defense against exactly one of two ways this kind of system
can fail. Naming both clearly now means later chapters never have to stop
and re-explain what they're guarding against; they can just point back
here.

## Death one: talking without evidence

Chapter 1.3 laid out the witness gate — the system may only speak about a
figure that actually became a pattern, one that changed what "ordinary"
looks like next. The first failure mode is exactly what happens when a
system *doesn't* hold itself to that: it says something anyway. Fluent,
plausible, maybe even correct by accident — but not actually backed by a
figure that earned its way through the gate. This system calls that failure
**confabulation**: speaking without witness.

You already met a version of this in Chapter 0.4 — an ordinary language
model producing a confident, fluent sentence that simply isn't tied to
anything real. That's not a coincidence. Confabulation is what you get,
systematically, from any mechanism that builds its output straight out of
what's already present instead of insisting on a ground to be surprised
against first.

## Death two: nothing can surprise it anymore

The second failure is the opposite problem, and it's quieter, which makes it
more dangerous. Chapter 1.1 said a ground has to be rebuilt fresh, not kept
as a permanent fixture. Imagine a system that stopped doing that — that
kept using the same ground indefinitely, never refreshing its sense of
"ordinary." At first this looks harmless, even efficient. But a ground
that's never rebuilt eventually stops being a ground at all: everything
gets measured against a stale, fixed picture of the world, and the system
starts sounding exactly like an authority that has already made up its
mind. This system calls that failure **sclerosis**: the ground closes,
nothing can differ from it anymore, and the system becomes what this book's
source material calls "an oracle" — fluent, sourced, apparently correct,
and permanently incapable of actually encountering anything new.

That last phrase is worth sitting with: *incapable of encounter.* A
sclerotic system isn't wrong in any single answer you could point to — it's
wrong in a way you can't easily catch one answer at a time, because it has
stopped being able to register that anything unexpected has happened at
all.

## Both names were already taken, on purpose

Neither failure mode got a made-up name. **Confabulation** is a real
clinical term from neurology and psychiatry, describing patients — most
famously those with Korsakoff's syndrome, a memory disorder tied to
chronic thiamine deficiency — who state false memories with complete,
unhesitating confidence, not as lies but because the gap in their actual
memory doesn't feel like a gap to them at all. That's a closer, more
specific parallel than the more commonly used word "hallucination" (which
this book's own Chapter 0.4 already used for the everyday version of this
failure in language models): a hallucination suggests perceiving something
that isn't there, while a confabulation is specifically an ungrounded
*account*, offered fluently, of something that supposedly happened. This
project's choice of word is the more clinically precise one.

**Sclerosis** borrows from the same medical vocabulary in the other
direction — literally, a hardening of tissue that was once flexible.
The nearest well-known parallel outside medicine belongs to the historian
and philosopher of science Thomas Kuhn: his 1962 account of scientific
paradigms describes a community that has settled so completely into one
way of seeing its evidence that genuine anomalies stop registering as
anomalies at all, and get quietly explained away or ignored until the
weight of them forces a crisis. A ground that's stopped rebuilding and a
scientific paradigm that's stopped noticing its own anomalies are the same
shape of failure, one at the scale of a single measurement and one at the
scale of an entire field.

## Why naming both, together, changes what "safe" means

It would be easy to build a system that only guards against one of these.
Guard hard against confabulation — refuse to say anything you're not
completely sure of — and you risk drifting toward sclerosis: a system that
becomes so conservative it stops rebuilding its ground and just repeats
what it already believed. Guard only against sclerosis — insist on staying
constantly open to new evidence — and you risk confabulation: a system
willing to say anything, since "staying open" was never checked against an
actual witness requirement.

This system's whole design is aimed at both at once, and Chapter 1.2's
pattern requirement turns out to do most of that work by itself: a system
built so that figures must actually move the next ground before anything
gets said is, by that same construction, a system that cannot stop
noticing — because if it ever did, nothing would clear the pattern test
anymore, and its own silence would be the tell. You'll see this stated
formally as one of the system's declared vital signs in Chapter 1.5.

**Where this comes from:** `eoreader6/SEED.md`, "The entelechy" — *"Two
deaths, one conformance family each: Confabulation — it speaks without
witness. Sclerosis — the ground closes, nothing can differ from it, and it
becomes an oracle: fluent, sourced, correct, incapable of encounter. With
pattern in place the second is largely self-announcing."* The clinical
history of "confabulation" and the parallel to Kuhn's *The Structure of
Scientific Revolutions* (1962) above are this book's own added links to
those fields — not something the codebase itself cites.

<!-- anchors:start -->

---

**Byte anchors** (generated — `node scripts/anchor-quotes.mjs`, verified by `--verify`; sources and their provenance in `sources/MANIFEST.json`). Each anchor is the UTF-8 byte range of the quoted words in the snapshot the manifest names:

- “Two deaths, one conformance family each: Confabulation —…” → `eoreader6/SEED.md#b2666-2964`

<!-- anchors:end -->

<!-- nav:start -->
[← 1.3 — Witness](103-witness.md) · [Contents](000-index.md) · [1.5 — Three Numbers and a Vital Sign →](105-three-numbers-and-a-vital-sign.md)
<!-- nav:end -->
