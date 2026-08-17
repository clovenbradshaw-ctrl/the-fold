# 2.1 — Nine Verbs

<!-- nav:start -->
[← 1.5 — Three Numbers and a Vital Sign](105-three-numbers-and-a-vital-sign.md) · [Contents](000-index.md) · [2.2 — The Order Things Happen In →](202-the-order-things-happen-in.md)
<!-- nav:end -->











**Why this matters:** Part I gave you the one move (build a ground, notice a
figure, check for pattern, speak only under witness). This chapter starts
answering a harder question: what *kinds* of thing can actually happen during
that move? There turn out to be exactly nine, and once you have them, you
have a vocabulary for describing any act this system performs — including
ones later chapters haven't shown you yet.

## Three questions, crossed

Go back to Chapter 0.2's three-way split — structure, claim, significance —
and simplify it to a question this system asks about every single thing it
does: **what kind of move is this, in what kind of territory?**

"What kind of move" turns out to have exactly three answers, called
**modes**: you can **Differentiate** something (pull it apart, tell it from
its ground), you can **Relate** something (connect it to something else),
or you can **Generate** something (bring a new whole into being).

"What kind of territory" also has exactly three answers, called
**domains**: **Existence** (is this thing here at all, and what is it),
**Structure** (how do things connect to each other), and **Interpretation**
(what does the pattern of connections mean).

Cross three modes against three domains and you get nine combinations. Each
one has a name, and each name is a verb this system can actually perform:

| | **Existence** | **Structure** | **Interpretation** |
|---|---|---|---|
| **Differentiate** | `NUL` — clearing | `SEG` — segmenting | `DEF` — refusing a claim |
| **Relate** | `SIG` | `CON` — connecting | `EVA` — witnessing |
| **Generate** | `INS` | `SYN` — synthesizing | `REC` — re-zeroing |

Three of these you've effectively already met. **`NUL`** is Chapter 1.1's
whole move — differentiating something from its own freshly-cleared ground,
in the domain of "does this exist at all." **`EVA`** is Chapter 1.3's
witness gate itself — relating a figure to actual evidence, at the level of
interpretation, and the source material is explicit that this verb
*structurally requires* the pattern to have moved something before it will
act at all. **`REC`** is what happens when a ground gets released and
rebuilt — generating a fresh interpretation-level starting point, the same
"never let it go stale" discipline from Chapter 1.4.

Two more you'll meet properly later in this book. **`CON`** is what the
binding organ does in Chapter 3.3 — relating two things structurally (this
entity showed up near that one, more than chance would predict) without
reading a single word of what either one is. **`SYN`** is the opposite
generative move — building a whole out of parts once you're sure the parts
belong together (the source material's own example, from a different but
related generation of this project: *"synthesize a ward from beds"* — three
individual beds, related structurally, generated into one larger unit).
**`DEF`** is the refusal itself: differentiating, at the interpretation
level, a claim the system is declining to make.

## Three of the nine, honestly incomplete

This book's own rule (P4: never hide a gap) applies to itself here. Of the
nine verbs, this chapter can point you to a real, worked instance of six:
`NUL`, `DEF`, `EVA`, and `REC` from the source material's own worked
examples, plus `CON` and `SYN` from real organs described elsewhere in this
book. The remaining three — `SIG`, `INS`, and `SEG` — appear in the grid
itself and can be placed correctly by the same mode-and-domain logic that
locates the other six, but this book hasn't found a genuine worked instance
of any of them to point you to. `SEG` in particular appears by name in one
place in the source material, but only inside a documented, admitted
mistake from an earlier, refuted version of this project — you'll see
exactly what went wrong with it in Chapter 2.5. That's not evidence these
three verbs are unused or unimportant. It just means this book isn't going
to pretend to a confidence it doesn't have — exactly the discipline Chapter
1.5 showed you with "Not yet earned."

## A strikingly similar 3×3 grid, built for an entirely different purpose

Crossing three modes against three domains to get nine named cells isn't
unique to this project. The philosopher and logician Charles Sanders
Peirce — working decades before modern linguistics or computing existed —
built his own theory of signs out of three independent three-way
distinctions (his own terms were denser: firstness/secondness/thirdness
crossed against a sign's relation to itself, its object, and its
interpreter), and used the resulting grid to name ten classes of signs,
including the well-known icon/index/symbol trio. In his own words
(*Collected Papers* 2.228): *"A sign, or representamen, is something
which stands to somebody for something in some respect or capacity. It
addresses somebody, that is, creates in the mind of that person an
equivalent sign, or perhaps a more developed sign."* And the trio, from
CP 2.247–248: an Icon *"refers to the Object that it denotes merely by
virtue of characters of its own"*; an Index *"by virtue of being really
affected by that Object."* Nobody in this project's
own working notes claims Peirce as an ancestor, and this book isn't
asserting one — the resemblance was noticed independently, the same
honest way Chapter 6.3 later describes an unrelated fifty-seven-year
correspondence. What the two grids share structurally is a bet that a
messy space of possible acts is better handled by crossing a small number
of orthogonal questions than by writing one label per case — the same bet
this chapter's own "why nine, and not some other number" section is about
to make explicit.

Where the two projects diverge matters more than the shared shape: Peirce
was classifying static *kinds of sign*, once, as a piece of philosophy.
This project's grid classifies *acts* — things the engine actually does,
checked against real measurements — and Chapter 2.5 will show you what
happens when a cell in a grid like this is filled in by hand rather than
derived from its own axes.

## Why nine, and not some other number

Notice what this grid is actually doing: it's turning "what happened" into
a coordinate rather than a label. Instead of describing an act with a loose
word like "noticed" or "linked," the system can say *exactly* which of nine
combinations of mode and domain it performed. That precision is what lets
later chapters talk about an organ's job with real specificity — Chapter
3.3's tour of the organs will describe each one partly by which of these
nine cells it lives in.

**Where this comes from:** the mode/domain grid and the operator labels
(`NUL`, `SIG`, `INS`, `SEG`, `CON`, `SYN`, `DEF`, `EVA`, `REC`) are defined in
`eoreader6/CUBE.md`, lines 19-21 and 39. Four of the nine are pinned down
directly by name, with a worked example, in CUBE.md's own text: `NUL·Void·
Clearing` ("Clearing the ground of existence"), `gap()` as `DEF ·
Interpretation` ("the engine refusing a claim"), `witness()` as `EVA ·
Interpretation` ("it structurally *requires* `pattern.moved === true`"),
and `reZero()` as `REC · Interpretation · Ground`. The remaining five
positions in the grid (`SIG`, `INS`, `SEG`, `CON`, `SYN`) are not spelled
out with individual definitions in CUBE.md itself; this chapter locates
them by the same mode-and-domain logic the four confirmed ones establish
(each group of three operators in the grid line shares one domain, and
position within the group fixes the mode). The Peirce quotes above are
from the electronic edition of the Harvard *Collected Papers* (CP 2.228
and 2.247–248), retrieved and checked directly rather than re-quoted
from a summary. `CON` is independently
corroborated as `Relate · Structure` by `eoreader6/SEED.md` Amendment X,
which describes the binding organ's output as "Structure-tier relations
(Figure cell on the operator grid)." `SYN`'s gloss ("synthesize a ward from
beds") is from a related but separate generation of this project,
`eoreader4.2/docs/eo-for-coders.md` line 249 — flagged as such because it
does not describe eoreader6 itself; see Part VII for why that document
belongs to a different generation. The Peirce connection earlier in this
chapter is this book's own added link to the history of semiotics, not
something the codebase itself cites.

<!-- anchors:start -->

---

**Byte anchors** (generated — `node scripts/anchor-quotes.mjs`, verified by `--verify`; sources and their provenance in `sources/MANIFEST.json`). Each anchor is the UTF-8 byte range of the quoted words in the snapshot the manifest names:

- “Clearing the ground of existence” → `eoreader6/CUBE.md#b3191-3225`
- “the engine refusing a claim” → `eoreader6/CUBE.md#b4673-4700`
- “it structurally *requires* `pattern.moved === true`” → `eoreader6/CUBE.md#b5353-5403`
- “Structure-tier relations (Figure cell on the operator grid).” → `eoreader6/SEED.md#b33976-34034`

**Attested by secondary witnesses** — the primary is not obtained (see the manifest's `unobtained` list), so the anchor names the bytes of an independent source that quotes the passage. A witness says what the witness quotes, never what the primary's own edition reads:

- “A sign, or representamen, is something which stands…” → `attest-morris-eric#b9814-10044` *(witness for `morris-1938-foundations-theory-of-signs`)*

Not located because a source this chapter names is **not yet obtained** (`eoreader4.2/docs/eo-for-coders.md` — see the manifest's `unobtained` list for each one's reason):

- “does this exist at all.”
- “never let it go stale”
- “synthesize a ward from beds”
- “refers to the Object that it denotes merely…”
- “by virtue of being really affected by that…”
- “why nine, and not some other number”

<!-- anchors:end -->

<!-- nav:start -->
[← 1.5 — Three Numbers and a Vital Sign](105-three-numbers-and-a-vital-sign.md) · [Contents](000-index.md) · [2.2 — The Order Things Happen In →](202-the-order-things-happen-in.md)
<!-- nav:end -->
