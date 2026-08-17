# 5.4 — A Citation You Can Actually Check

<!-- nav:start -->
[← 5.3 — Four Promises to the Reader, in Plain Language](503-four-promises-to-the-reader.md) · [Contents](000-index.md) · [5.5 — Writing Something Long Without Losing the Thread →](505-writing-something-long-without-losing-the-thread.md)
<!-- nav:end -->











**Why this matters:** Chapter 3.1 showed you a citation in a real answer —
`pg84.txt @ bytes 263105–265217` — and asked you to trust that it actually
pointed somewhere real. This chapter is about the mechanism that makes that
trust checkable instead of assumed, and about a real incident where the
mechanism briefly wasn't.

## The rule that shapes every citation before it's even written

While an answer is being generated, the instruction governing it is blunt
about scope: *"When the turn provides numbered passages [1] through [N],
every claim you draw from that material is followed by its bracket... Only
the numbers provided exist. NEVER cite [N+1] or higher — a bracket outside
the range is a fabricated citation: it looks like evidence and points at
nothing."* A citation can't reference something that was never actually
retrieved. The set of things that can be cited is fixed before the answer
is written, not expanded afterward to cover something the answer wanted to
say.

## The round trip has to close

That rule alone would still leave a gap: a citation could point at
something real that was retrieved, and still misquote it. So there's a
second, independent check, stated as its own law: *"A quoted passage can be
followed to its source bytes and those bytes match the quote. An audit path
that leads somewhere unverifiable is decoration."* The actual check walks
the whole chain for real — from the citation, to the specific span it
claims, to that span's surrounding context, to the raw bytes of the
original source file at the span's own offsets — and compares the quoted
text against those bytes directly, not against a paraphrase of them.

## What happens before you even see an answer

There's a check that runs earlier still, before a quotation is ever shown
to you: *"Every apparent quotation in a model's answer is checked against
the real source bytes before being shown to the reader. A phrase that reads
like a citation is treated as a potential fabrication, not as evidence,
until it is confirmed to be a literal substring of the material the model
was actually given."* A quotation doesn't get the benefit of the doubt for
looking like one. It has to actually be found, byte for byte, in the real
source, or it doesn't survive to reach you.

## When the round trip broke, and what it looked like from outside

This isn't a theoretical guarantee — the check has actually caught a real
break in the chain. Citations use identifiers built one way (something like
a source name plus a specific chunk number); the lookup used to find a
citation's surrounding context and raw bytes was built expecting a
slightly different identifier shape. The two didn't line up, and the
practical effect was total rather than partial: *"reading a quote's bytes
or its surrounding text failed for every source."* A separate, related gap
showed up for anything you'd attached directly through the interface
rather than loaded from a file on disk — those carry an identifier no
filesystem can look up at all, so a byte-level read against them returned
a plain "file not found." Both were fixed by giving every source, however
it arrived, one shared, byte-consistent way to be looked up — the same
underlying index serving both a real file path and something you'd
attached directly, so the two cases produce identical offsets instead of
two different addressing schemes quietly disagreeing with each other.

## The same problem, at a much larger scale, in science itself

This mechanism is a small, automated answer to a problem that's caused a
genuine crisis in published research. John Ioannidis's widely cited 2005
paper "Why Most Published Research Findings Are False" argued that a
large fraction of scientific claims can't actually be traced back,
reliably, to the evidence that supposedly supports them — and the
so-called **replication crisis** that followed found that a striking share
of results in fields like psychology couldn't be reproduced at all when
someone actually tried. The common thread: a citation, in a paper or in a
chat answer, is only as good as the round trip back to what it claims to
rest on, and for years the scientific literature simply didn't check that
round trip systematically, at scale, before publication.

Forensic science's **chain of custody** is the older, more literal version
of the same idea: evidence has to be traceable, unbroken, from the moment
it's collected to the moment it's presented, or it doesn't count as
admissible regardless of how compelling it looks. The mechanism this
chapter describes — citation, to span, to source bytes, checked before
display — is a chain of custody for a quoted sentence, run automatically,
on every single claim, rather than assumed to hold and audited only when
someone happens to complain.

## What this actually buys you as a reader

None of this promises the *interpretation* in an answer is correct — Part
III already told you interpretation stays revisable. What it promises is
narrower and, in a specific sense, more valuable: if an answer quotes
something, that quotation is not decoration. You can start from your own
doubt about any specific claim, follow it to the exact bytes it's supposed
to come from, and check for yourself whether the quote is real — without
having to trust the system's word that the audit trail would have held up
if you'd bothered to look.

**Where this comes from:** the citation-scope rule is `eochat/instruction-
set/020-core-citation-law.md`, lines 12-14. The round-trip law (L2f) and
the pre-display fabrication check (L8) are `eochat/LAWS.md`, lines 215-217
and 627-634. The incident and its fix are `eochat/LAWS.md`, lines 220-248. The
reproducibility-crisis and chain-of-custody connections above are this
book's own added links to the philosophy of science and forensics, not
something the codebase itself cites.

<!-- anchors:start -->

---

**Byte anchors** (generated — `node scripts/anchor-quotes.mjs`, verified by `--verify`; sources and their provenance in `sources/MANIFEST.json`). Each anchor is the UTF-8 byte range of the quoted words in the snapshot the manifest names:

- “Why Most Published Research Findings Are False” → `ioannidis-2005#b3941-3988`

Not located because a source this chapter names is **not yet obtained** (`eoWebLLM/LAWS.md` — see the manifest's `unobtained` list for each one's reason):

- “When the turn provides numbered passages [1] through…”
- “A quoted passage can be followed to its…”
- “Every apparent quotation in a model's answer is…”
- “reading a quote's bytes or its surrounding text…”

<!-- anchors:end -->

<!-- nav:start -->
[← 5.3 — Four Promises to the Reader, in Plain Language](503-four-promises-to-the-reader.md) · [Contents](000-index.md) · [5.5 — Writing Something Long Without Losing the Thread →](505-writing-something-long-without-losing-the-thread.md)
<!-- nav:end -->
