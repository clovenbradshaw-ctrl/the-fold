# 0.2 — A Ten-Minute Grammar and Meaning Primer

<!-- nav:start -->
[← 0.1 — What This Book Is, and Isn't](001-what-this-book-is-and-isnt.md) · [Contents](000-index.md) · [0.3 — A Ten-Minute Ontology and Epistemology Primer →](003-ontology-and-epistemology-primer.md)
<!-- nav:end -->











**Why this matters:** later in this book you'll meet words like *terrain* and
*stance*, and they will only make sense if you already have a gut feel for
something most people never had to name: that the same words, arranged
differently, can mean completely different things, and that *meaning*
itself splits into more than one kind of question. Ten minutes now saves
every later chapter from having to stop and explain this from scratch.

## The same words, a different sentence, a different world

Take two sentences:

> The dog bit the man.
> The man bit the dog.

Same four words. Same length. Completely different situation. What changed
wasn't the vocabulary — it was the *arrangement*: which word sits in the
"doer" position and which sits in the "done-to" position. That arrangement
is what linguists call **syntax**: the structure a sentence is built in,
independent of what it's actually about.

**Meaning** is a separate question from structure, and it actually splits
into two further questions, and this book will lean on the difference
between them constantly:

- **What does the sentence claim, on its own, regardless of who says it or
  when?** *"The dog bit the man"* claims a biting event, a dog as biter, a
  man as bitten — that claim doesn't change if you say it in a courtroom or
  a bedtime story. This is what's usually called **semantics**: meaning that
  belongs to the sentence itself.
- **What is the sentence actually *doing*, said by this particular person, in
  this particular moment?** If a nervous neighbor says *"the dog bit the
  man"* to a police officer, they're not reciting a fact for its own sake —
  they're reporting an incident, maybe asking for help, maybe defending
  themselves. This is **pragmatics**: meaning that depends on context, who's
  speaking, and why.

You don't need to remember these three words — syntax, semantics,
pragmatics — as vocabulary to pass a test. What you need is the *feel* for
the three-way split: structure, then what's literally claimed, then what's
actually being done with the claim. Once that feel is in place, later
chapters can build real distinctions on top of it without stopping to teach
grammar from zero.

## Why this matters for a machine that reads

A system reading a sentence has to make decisions at all three of those
levels, even though a human reader does it instantly and without noticing.
It has to figure out the structure (who did what to whom), it has to figure
out what's literally being claimed, and — this is the hard one — it has to
figure out what's actually significant about the claim, which is not the
same question as what the claim says. "The dog bit the man" and "the man
bit the dog" are equally grammatical, equally clear claims, and wildly
different in what they'd mean if you read them in a newspaper.

That three-way split — structure, claim, significance — is not a linguistics
detour. It's the shape of a problem this whole book is going to keep coming
back to, under different names, at every scale: from a single sentence, up
through what counts as worth noticing at all (Part I), up through the
different *kinds* of thing a sentence can be about and the different
*postures* you can take toward it (Part II).

## The same three-way split has a name already

This isn't this book's own invention, and it isn't even linguistics'
invention specifically. In 1938 the philosopher Charles Morris, laying out
the foundations of semiotics — the general study of signs — split the
study of *any* sign system into exactly three parts. His own defining
phrases, from *Foundations of the Theory of Signs* (1938), p. 6:
**syntactics** studies *"the formal relations of signs to one another"*;
**semantics** studies *"the relations of signs to the objects to which
the signs are applicable"*; **pragmatics** studies *"the relation of
signs to interpreters."* Linguists later narrowed his terms to fit
sentences specifically — the version you just met — but the three-way cut
itself is Morris's, and it's general enough to apply to traffic lights
and musical notation as easily as to "the dog bit the man."

Where the parallel actually stops: Morris was building a general theory of
signs, with no particular stake in what a reading system ought to do with
the distinction. This book borrows only the cut itself — structure, claim,
and use — not any of his larger theoretical apparatus.

**Where this comes from:** this chapter is original exposition written to
prepare the reader for Part II's operators, terrains, and stances (see
`HANDBOOK-SPEC.md` §6, Part II). It draws no content from the codebase — it
teaches only the general linguistic distinction the rest of the book
assumes. The Morris connection above is this book's own added link to the
wider history of semiotics, not a source the codebase itself cites — see
Charles W. Morris, "Foundations of the Theory of Signs" (1938). The
three defining phrases quoted above are Morris's own words as given for
p. 6 of that work by a secondary source (Wikiquote, citing the 1971
reprint in *Writings on the General Theory of Signs*); the printed book
itself was not retrievable in this pass, so the phrases are attested at
one remove rather than verified against the printing — flagged here
because this book means to keep the difference between those two claims
visible.

<!-- anchors:start -->

---

**Byte anchors** (generated — `node scripts/anchor-quotes.mjs`, verified by `--verify`; sources and their provenance in `sources/MANIFEST.json`). Each anchor is the UTF-8 byte range of the quoted words in the snapshot the manifest names:


**Attested by secondary witnesses** — the primary is not obtained (see the manifest's `unobtained` list), so the anchor names the bytes of an independent source that quotes the passage. A witness says what the witness quotes, never what the primary's own edition reads:

- “the relations of signs to the objects to…” → `attest-morris-eric#b7605-7634` *(witness for `morris-1938-foundations-theory-of-signs`)* *(+1 segment(s) not located)*
- “the relation of signs to interpreters.” → `attest-morris-eric#b7730-7767` *(witness for `morris-1938-foundations-theory-of-signs`)*
- “Foundations of the Theory of Signs” → `attest-morris-eric#b47613-47647` *(witness for `morris-1938-foundations-theory-of-signs`)*

Not located because a source this chapter names is **not yet obtained** (`morris-1938-foundations-theory-of-signs` — see the manifest's `unobtained` list for each one's reason):

- “The dog bit the man”
- “the dog bit the man”
- “the man bit the dog”
- “the formal relations of signs to one another”
- “the dog bit the man.”

<!-- anchors:end -->

<!-- nav:start -->
[← 0.1 — What This Book Is, and Isn't](001-what-this-book-is-and-isnt.md) · [Contents](000-index.md) · [0.3 — A Ten-Minute Ontology and Epistemology Primer →](003-ontology-and-epistemology-primer.md)
<!-- nav:end -->
