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

**Measured, 2026-09-11** (`eval/authorship-null.mjs`, 250 passages of the real
book, 30 probes, 17 heard): the expectation is SIGNAL, not noise, and the ratio
measures the mouth. On a faithful mouth (the reading's own claims about the
asked-about), the true expectation matched 137 claims, authored 0 novel, at
**authorship 1.0**; a random expectation of the same size matched 6 and left
131 novel, at **authorship 0.019** — II.23 resolves: fewer novel, more matched,
so Pass 41's witness-steering is licensed to lean on the expectation. And the
ratio measures the MOUTH, not the expectation's size: the same true expectation
authors 1.0 of a faithful mouth but **0.034 of an inventing one** (claims about
the asked-about with false labels). When a long piece's section drifts from the
record, the authorship ratio is the number that says so — per section.

**For long form this is the per-section contract.** A piece is planned into
sections; every section is a part. Give every section its own expectation —
composed from its own passages, its own voids — before it drafts, and diff
every section against it. That is the skeleton-first turn
(`THE-HOLOGRAPH.md` §5) applied to an essay: the record authors the skeleton,
the mouth voices it, and the **authorship ratio per section is the honest
health metric** — as reading accumulates, the record should author more of each
section, and the mouth's delta is measured, never assumed (Pass 42).

## 5. The witness budget spends on error only (Pass 41 — built)

The witnesses spend their asks on **novel and contradicted claims only**; a
**matched** claim at a bound tier costs nothing to check, because the
expectation already carried its addresses. `witnessSentences` now takes a
`matched` set (a sentence ALL of whose claims the expectation already authors
is skipped, no ask spent); holon.js computes the diff against the expectation
*first* and hands the matched sentences to the witness. When you touch the
long-form budgets (`pieceWitnessAsks`, `snipRounds`, `revisionRounds`), the
rule is this: the check budget is for what the expectation did NOT already
author. The diff (errorOf) is the error signal; the witnesses are its police;
matched claims are already paid for.

And the error now updates the record (Pass 42, last half): a NOVEL sentence
the witness confirms the passages state is admitted to the belief ledger,
extracted from the **decider's own bytes** (the passage sentence the witness
pointed at) and witnessed by the decider's span — never the mouth's words,
never self:model (P128/P2). The elenchus binds the recollection; the record
learns the fact it had not yet heard, with the source as its witness. A long
piece whose section's novel-but-true claims enter the ledger is a piece that
leaves knowledge behind, not just prose.

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

## 8. One proposition at a time — the claim-atomic mouth (built 2026-09-11)

`voice.js` / `voice.test.mjs` / `eval/voice-one-at-a-time.mjs`: the record
authors the claims (`expectationFrom`); the mouth voices **ONE claim per
call**; the record verifies each voiced sentence against its claim
(`verifyVoiced`) **before the next is handed out**. A faithful voice is
matched; a mouth that drifts (changes the act or the referents) or hedges is
caught and re-asked under a bounded budget — never shipped as voiced.

The grain is the honest one: **exact on the ACT (the label), tolerant on the
END-SPANS** (the extracted spans vary with wording — "12 percent" for "12%",
a dropped adjunct — P74's wall, tolerated by significant-token overlap). A
mouth that changes the verb is drifting, not voicing, and is caught. The
address never reaches the mouth (B1); the authorship ratio approaches 1 by
construction, because the mouth asserts nothing — it only words.

This is the shape the long-form coder should hold: a piece is not one
paragraph the mouth writes, it is a sequence of claims the record authors and
the mouth voices, each verified before the next. The skeleton-first turn,
made literal, one proposition at a time.

## 9. Files to read before you write a line

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
on the record before the draft (Pass 40, A2) are built and tested, and the
authorship ratio is MEASURED beyond the null (`eval/authorship-null.mjs` —
II.23 resolves, and the ratio discriminates the faithful mouth from the
inventing one). Pass 41 is built — the witness budget spends on error only,
matched claims cost nothing. Pass 42's last half is built — a witness-confirmed
novel claim enters the ledger, witnessed by the decider's bytes. The full
generation loop now stands: expect on the record (DEF) → voice → diff (EVA) →
the error updates the record (REC). Remaining in the broader spec, named not
claimed: Pass 36's second half (the packed/bitfield shadow), Pass 37 (the
witness-confirmed paraphrase orbit), Pass 38 (the meta part audited), Pass 39
(the room).*