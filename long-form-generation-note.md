# Note for the coder working on long-form generation

*2026-09-11. Handoff, in the project's own register: what the memory work of
the last few days means for whoever next touches the long-form (`piece`)
machinery — `piece-edit.js`, `piece-revise.js`, `snip-check.js`, `longform.js`,
and the `piece` branch of `holon.js` `runPart`/`runHolonicTask`. Read the essay
first: `THE-TRIAD-THAT-INVOLVES-THE-HOLOGRAPH.md`. Then this note is the map.*

---

## 1. The triad that involves the holograph — the shape under generation

Every generation task — a chat answer, a section of an essay, a whole piece —
is one reading act seen at three depths. There is no task-shaped machinery;
there is the reading, and the task only decides which grain to consult and how
much of the reading to hand the mouth.

- **G — the file.** The raw bytes. Existence. Never rewritten.
- **F — the holograph.** The log of the EOT reading, *folded at a cursor* — the
  record merged: full tokens **and** the address, both sides. The **only tier
  the mouth reads**. Re-expandable to the bytes. This is what a section's
  passages are.
- **P — the shadow**, and its coarse grain **the echo**. The deidentified
  residue of significance: state + address, **no words**. It recognizes ("have
  I met this"), it knows where, it carries the significance the reading found
  (standing, band, surprise — DEF/EVA/REC). It can be shared without
  confession. It can never be spoken.

Three verbs: G *is*, F *perceives*, P *signifies* — existence, structure,
significance. The oldest name is sat-cit-ānanda; the note is not about the
name, it is about the walls.

## 2. The broken base (B1) — the law a long-form generator must never cross

The semiotic triangle's broken base, re-derived by measurement: **the symbol
cannot touch the referent except through the thought.** The deidentified
pattern cannot reach the file except through the reading. Concretely:

- **The mouth may voice only the holograph.** `recallForTurn` filters shadow
  and echo nodes out; a section must be written from addressed holograph
  passages, never from fingerprint similarity.
- Retrieval and significance may *nominate* ("this is worth a section"); only
  the holograph supplies *what a sentence may say*. If you ever find yourself
  about to hand a shadow or an echo to the model as material — stop. That is
  the one wall the whole architecture exists to hold.

## 3. The significance residue is a salience prior for long form

A shadow/echo node carries the residue of the DEF/EVA/REC calculus — the
reading's finding (standing, band, surprise), deidentified, on the payload
(`field-of-record.js`, `admitPassage`/`admitEntry` with `significance`). For
long form:

- Passages the reading already found **significant** are the load-bearing ones.
  A piece that must cover a book should weight sections toward what the reading
  already marked as mattering — without re-reading, and without the prior
  carrying content.
- The grain ladder is the cost ladder: an essay over a million-page corpus
  settles echoes first (is this worth a section at all), shadows second (where),
  and opens holographs only for what the mouth will actually voice.

## 4. The expectation is the skeleton — and it is already on the record

Passes 40–42 make prediction the author: the record composes the answer's
skeleton, the mouth is reduced to voicing it. What is wired:

- `dialogue.js::expectationFrom(passages, question, read, index, voids)` —
  the reader's own bound claims whose ends resolve to the question's referents,
  **plus the declared voids** (what was searched for and not yet heard, with
  the scope). `expectationFacts` renders both to the mouth.
- `dialogue.js::errorOf(expectation, answerClaims, index)` — the diff:
  `matched / novel / missing / contradicted` and the **authorship ratio** (the
  share of the answer the record authored vs. the mouth added).
- `holon.js` emits a typed `expected` event immediately after composing the
  expectation, **before the draft**; `app.js` lands it on the reflex ledger as
  an `expected` act (A2). The diff is taken against something written down,
  never against something remembered.

**For long form this is the per-section contract.** A piece is planned into
sections; every section is a part. Give every section its own expectation —
composed from its own passages, its own voids — before it drafts, and diff
every section against it. That is the skeleton-first turn
(`THE-HOLOGRAPH.md` §5) applied to an essay: the record authors the skeleton,
the mouth voices it, and the **authorship ratio per section is the honest
health metric** — as reading accumulates, the record should author more of each
section, and the mouth's delta is measured, never assumed (Pass 42).

## 5. Spend the witness budget on error only (Pass 41, not yet built)

The spec's next pass: the witnesses (the per-sentence witness tier) should
spend their asks on **novel and contradicted claims only**; a **matched** claim
at a bound tier costs nothing to check, because the expectation already carried
its addresses. When you touch the long-form budgets (`pieceWitnessAsks`,
`snipRounds`, `revisionRounds`), the rule to keep in view is this: the check
budget is for what the expectation did NOT already author. The diff (errorOf)
is the error signal; the witnesses are its police; matched claims are already
paid for.

## 6. The walls that hold long form honest

- **Never read P back into F.** A shadow/echo is a lien on content, never the
  content. The echo is not a compressed section; it is the reason to open one.
- **Never let the pattern feed the mouth alone** (GFP P3). A fingerprint is
  not material.
- **Never let the mouth author the pattern.** The shadow/echo are derived
  mechanically from the reading; the mouth writes prose, never memory.
- **Never rewrite G.** A repair is a new entry that names the old.
- **Belief is earned by the elenchus, never declared.** The null band, the
  witness, the probe — those are the only things that turn a section's
  recollection into knowledge. A sentence the shadow recognized but the witness
  refused is not a fact; it is the mouth's own voice, disclosed.

## 7. Files to read before you write a line

- `THE-TRIAD-THAT-INVOLVES-THE-HOLOGRAPH.md` — the essay (listen to it).
- `THE-HOLOGRAPH.md` (`eoreader7/native/docs/`) — the addressed-pattern theory.
- `GROUND-FIGURE-PATTERN-SPEC.md` — **B1** (the broken base) and Passes 40–42.
- `field-of-record.js` — `THE_HOLOGRAPH`/`THE_SHADOW`/`THE_ECHO`, the
  significance residue, `recallForTurn` (the mouth's gate).
- `relative.js` — the state ladder, `ECHO_BITS`.
- `dialogue.js` — `expectationFrom` (with voids), `errorOf`, `expectationFacts`,
  the authorship ratio.
- `holon.js` — the `expected` event before the draft; the `piece` branch,
  `piece-edit.js`, `piece-revise.js`, `snip-check.js`.

---

*Status, honest: the memory tiers, the broken base, and the significance
residue are built and tested. The expectation-with-voids and its announcement
on the record before the draft (Pass 40, A2) are built and tested. The next
increments in the spec's order are Pass 41 (witnesses spend on novel/
contradicted only) and Pass 42 (the error updates the record, and the
authorship ratio measured beyond the null) — the two places a long-form coder
will actually spend this note.*