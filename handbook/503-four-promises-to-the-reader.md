# 5.3 — Four Promises to the Reader, in Plain Language

<!-- nav:start -->
[← 5.2 — Instructions All the Way Down](502-instructions-all-the-way-down.md) · [Contents](000-index.md) · [5.4 — A Citation You Can Actually Check →](504-a-citation-you-can-actually-check.md)
<!-- nav:end -->











**Why this matters:** the last two chapters described how this application
is governed and instructed. This chapter is about what it actually promises
*you*, as the person on the other side of the screen — and, in each case,
the real, measured failure that's on record as the reason the promise
exists at all.

## No dead air

**The promise:** *"Between a trigger and its first visible consequence
there is no silence."* Once you've done something that should cause a
response, you should never be left staring at nothing, wondering whether
anything is happening at all.

**The measured failure behind it:** a one-kilobyte file, uploaded while the
system was busy with something else, once took **39 seconds** to show any
sign of being received — not because the file was large, but because
ingesting it shared a process with an active chat response, and the two
were competing for the same resources. A 3.3-megabyte book, uploaded when
nothing else was running, came back in under a second. The problem was
never file size. It was silence during contention. After the fix, the
first visible signal for a comparable case dropped from over a minute of
nothing to **528 milliseconds**.

## Audit is local

**The promise:** *"Anything the reader can doubt, they can inspect from
where they doubt it."* You shouldn't have to leave the point where you're
suspicious of a claim and go hunt through a separate menu to check it.

**The measured failure behind it:** a real check that walks a citation all
the way from the quoted text, to the exact span it claims to come from, to
the raw bytes of the original source, to a byte-for-byte comparison —
found a case where the identifiers used for a citation's location and the
identifiers used to look up its surrounding context simply didn't match
each other. *"Reading a quote's bytes or its surrounding text failed for
every source."* A byte mismatch here isn't a cosmetic bug — it means a
citation looked verifiable without actually being checkable, which is
exactly the failure this whole promise exists to catch.

## No silent truncation

**The promise:** *"Where output is cut, the cut is reported."* If something
had to be shortened to fit a limit, you get told that it happened — never a
result that quietly looks complete when it isn't.

**The measured failure behind it:** an ingestion limit once silently capped
any document at 500,000 characters. A document over 700,000 characters
long was accepted, silently reduced to fit, and reported back as a
successful ingest — with no indication anything had been cut. A search for
a phrase deliberately placed past that cutoff came back empty, *"exactly
how the corpus reports a phrase a book genuinely does not contain"* — a
false negative indistinguishable, from the outside, from the truth. The
actual fix went further than just reporting the cut: *"The cap is gone.
Documents are admitted whole."*

## No implied completeness

**The promise:** the interface never lets a compressed or shortened view
of a source stand in for the source itself without saying so. A summary
should never be able to pass for everything.

**The measured failure behind it:** a panel showing a compressed view of
retrieved material displayed a count of how many items it was showing — but
that count was only ever compared against an already-shortened internal
list, never against the true total that had actually been found and left
out. The fix computes a real *withheld total*, specifically, in the
system's own words, "so a truncated list cannot be mistaken for the whole
one."

## A field that already named some of these promises, decades ago

Interface design already has a well-known checklist covering some of this
same ground: Jakob Nielsen's ten usability heuristics (1994) include
**"visibility of system status"** — the system should always keep users
informed, through appropriate feedback, within reasonable time — which is
essentially "no dead air" stated as a general design principle rather than
tied to a specific 39-second incident. Nielsen's heuristics are broad,
general-purpose advice meant to apply to any interface at all; they don't
specify a number, and they're evaluated by expert judgment ("does this
feel responsive") rather than by a measured incident with a before-and-
after number attached.

That's the real difference worth naming: this chapter's four promises
aren't restatements of general usability advice — each one is anchored to
an actual, dated, measured failure (39 seconds of silence, a byte mismatch
found by an actual audit trail, a document silently capped at 500,000
characters, a count compared against the wrong total) rather than an
abstract design ideal. Nielsen's heuristics tell you what to look for.
This chapter's promises are what happened when nobody had looked yet.

## The pattern underneath all four

Notice what these four promises have in common: none of them is "always
succeed" or "never make a mistake." Each one is about never letting a
limitation — of time, of evidence, of length, of scope — pass silently for
something it isn't. That's the same discipline Chapter 3.5 described for
the engine's own refusals, applied one layer up, to the application
deciding what to show you and how honestly to show it.

**Where this comes from:** all four promises and their measured incidents
are from `eochat/LAWS.md` — no dead air (L1, lines 23 and 79-91, 160-165),
audit is local (L2, lines 181 and 215-224, 237-241), no silent truncation
(L3, lines 288 and 306-316), and no implied completeness (L6, lines
485-487 and 493-500). The Nielsen usability-heuristics connection above is
this book's own added link to interface-design history, not something the
codebase itself cites.

<!-- anchors:start -->

---

**Byte anchors** (generated — `node scripts/anchor-quotes.mjs`, verified by `--verify`; sources and their provenance in `sources/MANIFEST.json`). Each anchor is the UTF-8 byte range of the quoted words in the snapshot the manifest names:


Not located because a source this chapter names is **not yet obtained** (`eoWebLLM/LAWS.md` — see the manifest's `unobtained` list for each one's reason):

- “Between a trigger and its first visible consequence…”
- “Anything the reader can doubt, they can inspect…”
- “Reading a quote's bytes or its surrounding text…”
- “Where output is cut, the cut is reported.”
- “exactly how the corpus reports a phrase a…”
- “The cap is gone. Documents are admitted whole.”
- “so a truncated list cannot be mistaken for…”

<!-- anchors:end -->

<!-- nav:start -->
[← 5.2 — Instructions All the Way Down](502-instructions-all-the-way-down.md) · [Contents](000-index.md) · [5.4 — A Citation You Can Actually Check →](504-a-citation-you-can-actually-check.md)
<!-- nav:end -->
