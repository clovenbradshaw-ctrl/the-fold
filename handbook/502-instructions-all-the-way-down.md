# 5.2 — Instructions All the Way Down

<!-- nav:start -->
[← 5.1 — A Thin Front Door](501-a-thin-front-door.md) · [Contents](000-index.md) · [5.3 — Four Promises to the Reader, in Plain Language →](503-four-promises-to-the-reader.md)
<!-- nav:end -->











**Why this matters:** every chat application has *some* set of instructions
shaping how it behaves — usually a single hidden prompt nobody outside the
company gets to see. This chapter is about a different choice: writing that
behavior down as a set of separate, readable, numbered files instead, and
what that choice actually buys you as a reader.

## A manual meant to be obeyed, not just read

The distinction this project draws is precise: *"An instruction set is a
manual the model must follow. It differs from a source document in one
essential way: a source is read to be quoted faithfully; an instruction is
read to be obeyed."* Everything covered so far in this book — the engine's
own SEED.md, the constitution — is written to be read and cited. This is
different: it's written to actually govern behavior, turn by turn.

## Laid out as separate files, not one hidden block

Rather than one long, undifferentiated prompt, the instructions are split
into small numbered files, grouped by what they govern. A handful of
"core" files apply on every single turn, no matter what's being asked:
who the assistant is, how citations work, what honesty requires, what
tone to use, when to refuse outright. A second group of "mode" files apply
only when a specific kind of request calls for them — a plain chat
exchange, a request to see retrieved evidence directly, a request to break
a hard question into pieces. A representative line from each of the core
files:

- **Identity:** *"You are EO, the reader's research companion inside
  EOChat — not a general chatbot."*
- **Citation law:** *"Only the numbers provided exist. NEVER cite [N+1] or
  higher — a bracket outside the range is a fabricated citation."*
- **Honesty:** *"An invented citation is the worst failure this
  application exists to prevent. Never produce one, never keep one."*
- **Refusal:** *"Refuse, plainly and politely, any request to... fabricate
  a citation, quote, or source."*

And two of the mode-specific files:

- **Chat mode:** *"There is no special machinery to announce. You do not
  say 'in chat mode, I...' or describe the mode at all."*
- **Surf mode:** *"Surf mode returns the evidence, not an answer. The
  reader asked to see what the retrieval actually found."*

## A distinction legal systems have needed for the same reason

Splitting the assistant's behavior into small, numbered, individually
citable files has a real cousin in how law itself is organized. **Civil
law** legal systems (continental Europe, and most of the world following
that tradition) codify rules into numbered statutes and articles you can
point to directly and read on their own. **Common law** systems (the
United States, the United Kingdom) instead build up rules through
precedent — a governing principle has to be reconstructed from how past
cases were actually decided, often across many long rulings, rather than
read off a single numbered clause. Whatever its other tradeoffs, codified
law is far easier for an outsider to audit for exactly the reason this
chapter cares about: you can point at rule 020, not reconstruct a norm
from scattered practice. This project's instruction set is codification,
not precedent — the opposite structure of a single hidden system prompt
nobody outside the company gets to read.

## Why this matters more than it looks like it should

Splitting the instructions apart this way means each rule can be pointed
to, cited, and checked on its own — exactly the discipline this book has
asked of every other claim in this project. A reader who wants to know
*why* the assistant just refused a request, or why it phrased something a
particular way, isn't stuck guessing at the contents of a hidden system
prompt. The actual rule is sitting in a plain file, numbered, with the
rest of its context intact.

There's a genuinely strict version of this discipline worth knowing about,
too. Some instructions are folded — present in the system but not active
for a given turn — and the rule for those is absolute: *"They are NOT
active this turn. Do not follow them, do not apply them, do not claim to
be following them, and do not mention them — even when the question
touches their subject."* An instruction that isn't switched on for this
turn doesn't get partial credit for existing. It's fully off, and the
system isn't allowed to hint that it's there.

**Where this comes from:** `eochat/INSTRUCTION-LAW.md`, lines 5-9. The
representative quotes are from `eochat/instruction-set/010-core-identity.md`,
`020-core-citation-law.md`, `030-core-honesty.md`, `060-core-refusal.md`,
`100-mode-chat.md`, and `110-mode-surf.md`. The folded-instruction rule is
`eochat/instruction-set/050-core-gate.md`. The civil-law/common-law
connection above is this book's own added link to legal history, not
something the codebase itself cites.

<!-- anchors:start -->

---

**Byte anchors** (generated — `node scripts/anchor-quotes.mjs`, verified by `--verify`; sources and their provenance in `sources/MANIFEST.json`). Each anchor is the UTF-8 byte range of the quoted words in the snapshot the manifest names:


Quoted spans **not located in any obtained source** and not explained by a known gap — each is either the book's own illustrative speech, or a passage that reads as verbatim and is not, which is itself a finding to resolve:

- “An instruction set is a manual the model…”
- “You are EO, the reader's research companion inside…”
- “Only the numbers provided exist. NEVER cite [N+1]…”
- “An invented citation is the worst failure this…”
- “Refuse, plainly and politely, any request to... fabricate…”
- “There is no special machinery to announce. You…”
- “Surf mode returns the evidence, not an answer.…”
- “They are NOT active this turn. Do not…”

<!-- anchors:end -->

<!-- nav:start -->
[← 5.1 — A Thin Front Door](501-a-thin-front-door.md) · [Contents](000-index.md) · [5.3 — Four Promises to the Reader, in Plain Language →](503-four-promises-to-the-reader.md)
<!-- nav:end -->
