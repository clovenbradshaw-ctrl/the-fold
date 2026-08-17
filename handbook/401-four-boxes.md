# 4.1 — Four Boxes

<!-- nav:start -->
[← 3.6 — How the Engine Is Allowed to Grow](306-how-the-engine-is-allowed-to-grow.md) · [Contents](000-index.md) · [4.2 — The Tests, in Plain Language →](402-the-tests-in-plain-language.md)
<!-- nav:end -->











**Why this matters:** Part III showed you an engine that measures things
very carefully and refuses to speak past its evidence. This chapter is
about why that engine is kept so deliberately narrow — and where everything
it *doesn't* do is supposed to live instead.

## Every claim gets sorted into exactly one of four places

This whole project — the engine (Part III), the priors it receives (Chapter
3.2), and the chat application that puts it in front of a reader (Part V) —
is governed by one document that decides, for any given piece of behavior,
which of exactly four places it belongs:

- **The engine.** This is the measurement itself — the current, continually
  re-earned implementation of everything Part I and Part III described. It
  is deliberately built to have no clock, no ability to read or write
  files, no randomness it doesn't declare, and no memory of any specific
  text. Anything that would only make sense for one particular deployment,
  or one particular piece of material, doesn't belong here.
- **Priors.** This is the ground, in the sense Chapter 3.2 already gave
  you: knowledge that cannot be measured and has to be received instead,
  always with a named giver.
- **Applications.** These are the thin, surface-level programs a reader
  actually touches — a chat interface, a proxy, anything with a user
  interface. This is where the clock lives, where files get read and
  written, where a specific model gets called. The governing rule for this
  box is stated as a direct test: **deleting an application must change no
  engine reading.** If removing the chat interface entirely would somehow
  alter what the engine measures, something has leaked across the wall
  that isn't supposed to exist.
- **Legacy.** Earlier versions of this project, kept as a frozen historical
  record rather than a living codebase. Nothing gets carried over from
  legacy just because it worked there — every organ has to re-earn its
  place in the current engine, from scratch, on its own evidence. The
  record of what was tried and failed in legacy is treated as just as
  load-bearing as anything that succeeded.

## Why keep the engine so deliberately empty

It would be more convenient, in the short term, for the engine to just know
things — to cache a fact about a specific book, or adjust its behavior
based on which application is calling it. The reason it doesn't is the same
reason Chapter 0.4 gave for distrusting a language model that blends
"what's in the document" with "what it already knew" into one
inseparable mechanism: the moment the engine starts absorbing anything
specific to one text or one deployment, there's no longer a clean way to
ask what the measurement itself actually established, independent of where
it happened to run or what it happened to be reading. Keeping the box
empty is what keeps the measurement checkable at all.

## Two much older versions of "keep these apart, on purpose"

Political philosophy has its own name for splitting power across
boxes precisely so that none of them can quietly absorb another's job:
Montesquieu's 1748 argument for **separation of powers** — legislative,
executive, and judicial kept apart specifically so that whoever writes a
law isn't also the one enforcing it or judging it. The four boxes here
aren't branches of government, but the underlying worry is the same one:
a system where one part can reach into another's job stops being checkable
by anyone standing outside it.

Software engineering has run the identical argument for decades under the
name **separation of concerns**, a phrase usually credited to Edsger
Dijkstra, who argued a system is only reasoned about reliably when each
part can be understood on its own, without having to hold the whole thing
in your head simultaneously. "Deleting an application must change no
engine reading" is that principle turned into an actual, runnable test
rather than a design slogan — most software that claims separation of
concerns has no equivalent check that would catch a violation the moment
it happened.

## What doesn't fit any of the four boxes

The rule for anything that doesn't cleanly land in one of the four is
blunt: **it's a gap, not a fifth category.** The four boxes aren't a menu
of convenient options to pick from — they're presented as the necessary
consequence of what this whole project is actually trying to measure, so a
thing that fits none of them hasn't discovered a new kind of component. It
has surfaced something nobody has figured out how to place yet, and that
gets treated as an open question, not quietly filed away as its own new
box.

**Where this comes from:** `eo-constitution/CONSTITUTION.md`, Article I,
"The domain" — I.1 through I.5, including *"The engine is `eoreader6`...
the current, re-earned implementation of the one operation"*; I.2 on
legacy, *"Their dead-end logs are load-bearing and must be trusted... every
organ is re-earned in eoreader6 or it does not come"*; I.4 on applications,
*"Deleting an application must change no engine reading"*; and I.5, *"No
other domain exists. A thing that fits none of the four is a gap, not a new
category."* The Montesquieu and separation-of-concerns connections above
are this book's own added links to political philosophy and software
engineering, not something the codebase itself cites.

<!-- anchors:start -->

---

**Byte anchors** (generated — `node scripts/anchor-quotes.mjs`, verified by `--verify`; sources and their provenance in `sources/MANIFEST.json`). Each anchor is the UTF-8 byte range of the quoted words in the snapshot the manifest names:


Not located because a source this chapter names is **not yet obtained** (`eo-constitution/CONSTITUTION.md` — see the manifest's `unobtained` list for each one's reason):

- “keep these apart, on purpose”
- “Deleting an application must change no engine reading”
- “The engine is `eoreader6`... the current, re-earned implementation…”
- “Their dead-end logs are load-bearing and must be…”
- “No other domain exists. A thing that fits…”

<!-- anchors:end -->

<!-- nav:start -->
[← 3.6 — How the Engine Is Allowed to Grow](306-how-the-engine-is-allowed-to-grow.md) · [Contents](000-index.md) · [4.2 — The Tests, in Plain Language →](402-the-tests-in-plain-language.md)
<!-- nav:end -->
