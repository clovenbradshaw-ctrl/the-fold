# 0.4 — What a Language Model Is, in Plain Terms, and Why This Project Keeps Its Distance From One

<!-- nav:start -->
[← 0.3 — A Ten-Minute Ontology and Epistemology Primer](003-ontology-and-epistemology-primer.md) · [Contents](000-index.md) · [1.1 — Noticing →](101-noticing.md)
<!-- nav:end -->











**Why this matters:** you cannot understand why this system is built the way
it is without first understanding, in plain terms, what it is deliberately
*not*. Several of the hardest design choices later in this book — refusing
to answer, insisting on a citation, distrusting fluency — only make sense as
a reaction to a specific, real problem with the tools everyone already knows
about. This chapter builds just enough of that picture for the contrast to
land, and no more.

## What a language model actually does

Strip away the branding, and a large language model does one thing: given
the text so far, it predicts what word (or word-fragment, called a *token*)
is likely to come next. Trained on enormous amounts of writing, it gets
extremely good at this — good enough that stringing together its own
predictions, one token at a time, produces fluent, often accurate,
often genuinely useful prose. That's the whole mechanism. There's no
separate "understanding" module sitting behind it; the fluency itself *is*
the prediction, done very well, over and over.

This is worth sitting with, because it explains something that otherwise
seems strange: a language model can write a perfectly confident, perfectly
fluent paragraph that is simply wrong — not lying, not confused in any
human sense, just a very good next-word guess that happened not to
correspond to anything real. That failure mode has a name, **hallucination**,
and the name is slightly misleading: it isn't a malfunction. It's the same
mechanism that produces every correct sentence, applied to a case where
nothing grounded the prediction in anything true.

## Why that's hard to catch from the inside

Here's the part that matters for the rest of this book. When a language
model reads a document and then answers a question about it, there is no
separate step where it "looks something up" and a different step where it
"knows things in general." Its trained-in knowledge and its reading of your
document are mixed into the same underlying mechanism — the same
next-word-prediction machinery handles both. That mixing is exactly why it
works as well as it does: the model can bring everything it's ever
absorbed to bear on the sentence in front of it, seamlessly.

It's also exactly the problem. If you wanted to ask *afterward*, "was that
answer based on this document, or on something the model picked up from its
training, or some blend of both, in what proportion?" — there is no ledger
to check. The reading and the knowing were never kept separate, so they
can't be separated after the fact either. You can ask the model to explain
itself, and it will give you a fluent explanation — produced by the exact
same next-word-guessing mechanism, with exactly the same risk of sounding
right without being right.

## The specific move this project refuses

The technical name for the mechanism that lets a model blend "what's already
in the document" with "what's already inside the model" so seamlessly is
**attention** — a way of letting every word a model produces be built as a
weighted mix of everything it's already seen, all at once. It's a genuinely
elegant piece of engineering, and it is also, this project argues, precisely
the place where the ledger disappears: a mechanism that forms its answer as
a *weighted combination of what's already present* has, by construction, no
outside thing to check itself against. It cannot be surprised. It can only
ever be a smoother or rougher version of what was already there.

This project's answer is to insist, everywhere, on the opposite discipline:
never build an answer directly out of what's present. First construct a
kind of deliberate, disposable "blank" — a *nothing*, rebuilt fresh each
time — and only speak about what turned out to be *different* from that
blank. You'll meet the technical name for that blank, and the whole
apparatus built on top of it, starting in the very next chapter. For now,
the one thing worth carrying forward is the shape of the disagreement: an
ordinary language model gets its fluency by weighting what's already there;
this system insists on building something to be surprised against first,
and speaking only when something actually was.

## Two names from the field itself for a related worry

This project's argument about attention isn't a lone objection from
outside the field. Emily Bender, Timnit Gebru, and colleagues' 2021 paper
"On the Dangers of Stochastic Parrots" argued, from inside NLP, that a
model trained purely to predict the next token has no mechanism connecting
its fluent output to communicative intent or to the world the text
describes — fluency and understanding, on their account, simply come
apart. That's close to this chapter's own point, though not identical to
it: stochastic-parrots is fundamentally about scale and training data (the
model never had grounded experience of the world to begin with); this
project's own complaint is narrower and mechanistic — even granting a
model everything it absorbed from training, the specific move of blending
"what's in the document" with "what the model already knew" into one
inseparable computation is what removes the ledger. The two critiques
point at the same family of systems from different angles and shouldn't be
collapsed into one.

The mechanism itself, attention, has a much narrower, purely technical
origin worth naming precisely: Ashish Vaswani and colleagues' 2017 paper
"Attention Is All You Need" introduced it as an efficient way to let a
model weigh every part of its input against every other part, with no
claim at all, one way or the other, about whether that constitutes
understanding. This project's choice to treat that same mechanism as the
place a ledger disappears is an interpretive argument layered on top of a
technical one — not something the mechanism's own inventors asserted.

**Where this comes from:** the contrast in this chapter is drawn from
`eo-constitution/CONSTITUTION.md` Article II.8, "The difference test" (*"Does
this mechanism build a nothing, or weight what is present? ... Attention is
the canonical instance and is refused wherever it is the measurement"*), and
from `eoreader6/prior-art-teachable-language-comprehender.md` §VI, on the
"absorb it" strategy and its cost: *"there is no ledger. You cannot ask
which of its knowledge was used, or what it declined to conclude, or what it
discarded."* The Vaswani et al. and Bender et al. connections above are
this book's own added links to the wider NLP literature, not sources the
codebase itself cites.

<!-- anchors:start -->

---

**Byte anchors** (generated — `node scripts/anchor-quotes.mjs`, verified by `--verify`; sources and their provenance in `sources/MANIFEST.json`). Each anchor is the UTF-8 byte range of the quoted words in the snapshot the manifest names:

- “Attention Is All You Need” → `attention-2017#b174-199`
- “there is no ledger. You cannot ask which…” → `eoreader6/prior-art-teachable-language-comprehender.md#b20194-20315`

**Attested by secondary witnesses** — the primary is not obtained (see the manifest's `unobtained` list), so the anchor names the bytes of an independent source that quotes the passage. A witness says what the witness quotes, never what the primary's own edition reads:

- “On the Dangers of Stochastic Parrots” → `attest-parrots-citing#b165015-165051` *(witness for `bender-gebru-2021-stochastic-parrots`)*

Not located because a source this chapter names is **not yet obtained** (`eo-constitution/CONSTITUTION.md`, `bender-gebru-2021-stochastic-parrots` — see the manifest's `unobtained` list for each one's reason):

- “was that answer based on this document, or…”
- “what's already in the document”
- “what's already inside the model”
- “what the model already knew”
- “Does this mechanism build a nothing, or weight…”

<!-- anchors:end -->

<!-- nav:start -->
[← 0.3 — A Ten-Minute Ontology and Epistemology Primer](003-ontology-and-epistemology-primer.md) · [Contents](000-index.md) · [1.1 — Noticing →](101-noticing.md)
<!-- nav:end -->
