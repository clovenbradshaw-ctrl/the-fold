# 7.3 — A Worked Build, Start to Finish

<!-- nav:start -->
[← 7.2 — The Watchmaker's Discipline](702-the-watchmakers-discipline.md) · [Contents](000-index.md) · [8.1 — Telling a Rhyme From a Borrowing →](801-telling-a-rhyme-from-a-borrowing.md)
<!-- nav:end -->






**Why this matters:** the last two chapters described this construction
language in the abstract. This chapter walks one real, complete example
from the source material — building a small hospital-ward application —
so you can see the two laws from Chapter 7.1 and 7.2 actually operating on
something concrete, in the same hospital-ward setting Part II already used
for the terrains and stances.

## Assembly one: a room for patients

The build starts by declaring a **room** — one of this language's basic
containers — named for the patients it will hold, with a contract
declaring which operators it may fire (creating records, defining values,
connecting to other rooms, and revising its own frame later if needed),
which terrains its events may land in (specific patients, and the category
"patients" as a whole), and which stances are available to it (making a
judgment call, dissecting something specific, binding two things
together). Underneath the contract sits a plain schema: a name, a date of
birth, a ward, a status. Then, immediately, a checkpoint — the room is
validated **alone**, using nothing but its own declared lines.

## Assembly two: a room for rounds

A second room follows the same shape, for daily rounds: which patient,
which date, what notes, which physician. Its contract is narrower — it
never needs to synthesize a whole from parts, so that operator isn't
declared for it at all. Checked alone again, exactly like the first.

## Assembly three: the connection between them

Only once both rooms already exist, independently checked, does a link
get drawn between them. This is Chapter 2.2's ordering rule, showing up
here in exactly the form that chapter predicted: you cannot connect two
things that haven't been established yet. The checkpoint on this assembly
validates the link against *both* rooms it touches — a check that couldn't
even be phrased before assemblies one and two had already passed their own.

## Assembly four: the surfaces a person would actually see

With the rooms and their connection in place, three surfaces get built on
top of them: a table of patients, a table of rounds, and a board that
groups patients by ward, showing each one as a card labeled by name. Each
surface declares which room it's drawn from, and each is checked on its
own, against the room underneath it, before the next surface starts.

## Assembly five: the app itself, closed last

Only at the very end does the actual application get declared — named,
given its set of surfaces, told which surface is "home," and given a
filter. Its own checkpoint is different in kind from the ones before it:
it verifies that the app's contract is a true envelope of everything
underneath it — nothing any surface can do that the app doesn't actually
permit. This is the last assembly closed, on purpose: it's the emergent
whole, and Chapter 2.1's `SYN` verb is exactly the operator for producing
a whole from parts that have already proven, individually, that they
belong together.

## What the watchmaker discipline actually buys, made concrete

Here's the payoff, stated the way the source material states it: *"If
assembly 4 fails, assemblies 1 through 3 stand and assembly 5 has not been
started. You revise the surface in hand."* Nothing about a failed surface
forces the rooms underneath it to be rebuilt, and nothing about the
unstarted app is put at risk by a problem two layers down. Five
assemblies, five checkpoints, and a failure at any one of them costs
exactly the assembly that failed — never more, and never less.

**Where this comes from:** the complete worked build, in full, including
every field and every checkpoint, is `eoreader4.2/docs/eo-for-coders.md`,
"Layer 0 — The Legend," the EOT block beginning `# ── assembly 1: the
patients room ──`. The closing quote about assembly 4's failure and
assembly 5 not yet starting is from the same section, immediately following
the code block.

<!-- anchors:start -->

---

**Byte anchors** (generated — `node scripts/anchor-quotes.mjs`, verified by `--verify`; sources and their provenance in `sources/MANIFEST.json`). Each anchor is the UTF-8 byte range of the quoted words in the snapshot the manifest names:


Not located because a source this chapter names is **not yet obtained** (`eoreader4.2/docs/eo-for-coders.md` — see the manifest's `unobtained` list for each one's reason):

- “If assembly 4 fails, assemblies 1 through 3…”
- “Layer 0 — The Legend,”

<!-- anchors:end -->

<!-- nav:start -->
[← 7.2 — The Watchmaker's Discipline](702-the-watchmakers-discipline.md) · [Contents](000-index.md) · [8.1 — Telling a Rhyme From a Borrowing →](801-telling-a-rhyme-from-a-borrowing.md)
<!-- nav:end -->
