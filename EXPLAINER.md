# The Fold, explained

## The problem

A conversation gets longer. Every turn you add makes the next one more
expensive, and eventually the model is spending most of its attention
re-reading things you already said.

There are two standard answers and both give away the thing that mattered.

**Send more.** Enlarge the window until the whole transcript fits. This works
until it doesn't, costs linearly forever, and — on a small model — degrades
badly long before it runs out: a 2B with 40,000 tokens of history is not a 2B
with a good memory, it is a 2B that has stopped paying attention.

**Send a summary.** Compress the transcript and send that instead. This is
worse than it looks. "The report put the figure at 12 percent" and "the report
put the figure at 21 percent" compress to the same sentence. Once a
conversation has been summarised, nothing in it can be checked. You are left
with the memory of having known something, which is exactly the state a
research tool must never put a reader in.

The Fold takes the second approach and adds the thing it was missing:
**an address**.

---

## Two folds, not one fold at two resolutions

Every finished turn is folded twice, and the two results are deliberately
different in kind.

**System 1 — the running summary.** About a hundred characters per turn,
rolled into a topic, a flow, a list of entities, and what carries forward.
Lossy and associative on purpose: this is what a person actually retains from
a conversation, the gist rather than the transcript. It exists so the model
can follow a thread that started earlier.

Its limit is not that it is short. It is that **a paraphrase has no address**.
Nothing in it can get back to the source, which is why the block that carries
it into the prompt says so about itself, in the prompt, every turn:

> This is a paraphrase, not a record. It cannot support a factual claim.

**System 2 — the record.** What the turn established, which channels carried
it, the byte ranges it was checked against, what failed the check, and what
was left open. Every field is read off work the turn already did, so it costs
no model call and cannot disagree with its own evidence.

A System 1 fold can only be recalled. **A System 2 fold can be re-opened** —
press the address and the exact bytes come back out of the file. The two are
never merged into one block, because merged, the record would inherit the
paraphrase's disclaimer and the paraphrase would inherit the record's
authority.

Measured over 400 turns: the transcript grows past 48,000 characters while
what is carried stays flat at about 900. But flatness is the cheap half of the
claim. The point is that what survives the compression is *addressed*.

---

## Everything checkable is computed, never requested

This is the load-bearing discipline, and it is not original to this repo —
it is `eoWebLLM/LAWS.md` **L5**: *a compliance-critical fact is never left to
the model's own instruction-following.*

The evidence for it here is blunt. The prompt asked, in plain words, for a
source address after any claim taken from the material. Two models four times
apart in size — a 3B and a 14B — produced **zero addresses across six turns**
of tabular material. The 14B was 2–3× slower and noticeably more accurate
about *facts*, and bought exactly no additional compliance. A prompt is a
request, not a guarantee.

So the checkable work happens outside the model:

| question | how it is answered | never |
|---|---|---|
| which passages does this question reach? | term overlap on the question's own words | a tool call the model decides to make |
| where does a passage begin and end? | boundaries found by form — a short line, blank line after, numbered or all-caps, with substance beneath | a fixed byte budget, or the word "chapter" |
| did the answer cite something we handed it? | string match against the offered addresses | trust |
| are the figures and names in the answer in the bytes? | containment, with prefix stemming and a closed abbreviation table | a second model asked to check the first |
| where did an uncited sentence come from? | longest shared run of distinctive terms, against a null | a guess with a confident tag on it |
| how many, which, how much? | computed from state | a table the model was asked to format |

The model's job is what is left: saying it in language. It writes prose in
whatever shape suits the answer, and the app does the structure.

---

## Why this makes a local model enough

A frontier model, on a long document, is usually doing three jobs:
**remembering**, **finding**, and **being careful**. Those are the jobs that
scale with parameters. The Fold takes all three away from it.

- **Remembering** is the fold. The model never sees the transcript — it sees
  the summary, the record, and the last two exchanges. Turn 400 is the same
  size as turn 1, so the long-context collapse that forces the upgrade never
  happens.
- **Finding** is retrieval and segmentation, both mechanical. War and Peace:
  376 boundaries discovered in 45ms, 1,051 chapter-shaped passages, searched
  in about 2ms.
- **Being careful** is the checks above. On adversarial probes, attribution
  is 100% correct on verbatim claims and **0% false warrants** on the hard
  case — a claim offered only its neighbouring passages.

What remains is phrasing, which is the one thing a small model is genuinely
decent at. The whole app runs on `gemma2:2b` — 1.6 GB, no key, no network,
nothing leaving the machine. For a surveillance corpus that is not a
convenience, it is the only acceptable arrangement.

Two bounded model calls per turn: the answer, and a summary refresh capped at
300 tokens with constrained decoding.

---

## Where the theory comes from

Almost none of this is invented here. The repo's job is to hold a conversation
accountable to rules that already exist elsewhere.

| idea | canon | how it is used |
|---|---|---|
| the fold — two kinds of memory | `eochat/server/conversation-summary.js` → `eoWebLLM` → `eochatX/eo-discourse.ts` | ported; algorithm unchanged |
| grounding — a claim backed by the bytes cited | `eochat/server/citation-check.js` → `eochatX/eo-citation-check.ts` | ported; the UI-bound two-thirds left behind |
| boundaries found by form, never vocabulary | `eoreader6/packages/engine/perceiver/text/segments.js` | **used live**, mounted at `/engine` — not copied |
| compliance facts are computed | `eoWebLLM/LAWS.md` L5 | why the mechanical checks exist at all |
| activation decays, identity doesn't, recall is retrieval | `eoreader6/READING-POLICY.md` P1 | the recency window is never enlarged to fix recall |
| numbers declared, gaps are results | P4 | `examined` ≠ `clean`; no relevance floor |
| strip the container; verify offsets | P5.2 / P5.3 | 47 licence passages dropped; every address byte-verified |
| a null is the hardest available comparison | `eoWebLLM/LAWS.md` L8 | 35% → 0% false warrants |

And two things the canon **forbids**, which this repo therefore does not do:
the cube is not a content classifier (95.7% of cell assignments survived
shuffling the words inside 2,527 paragraphs), and only two of the nine
terrains have lenses anywhere, including in eoreader6. A reading with no lens
on a terrain omits it, visibly.

---

## What is not done

- **Holonic tasks.** `eochatX/eo-holonic-plan.ts` has the mechanical half
  already: `needsDecomposition` decides from the question's own shape whether
  it is several dependent parts, and `evaluateCompliance` checks a draft
  against a declared spec — word count, truncation, required and forbidden
  content. The right wiring is: the model *declares* the form it is producing
  and the app checks it mechanically, rather than being told a format and
  trusted. Per LAWS L3 the gate is the shape of the request, never whether a
  corpus happens to be loaded. Not yet ported.
- **"What is most interesting."** The licensed answer is
  `eoreader6/emergence/surprise.js` — novelty and Bayesian surprise, kept
  apart, provably identical only at full commitment. Identified, not wired.
  Anything else would be asking the model for an opinion and calling it a
  reading.
- **Retrieval has no stemming.** "inherit" does not find "inheritance".
- **Four constants are hand-picked** where P4 says derive them from the
  material: rows per passage, null samples, corpus minimum, findings cap.
- **The Claude path is untested.** The code is there; nothing needs it.

---

## The shape of a turn

1. Retrieve, mechanically, from the question's own terms.
2. Assemble **one** system message: base prompt, the paraphrase block, the
   record block, the retrieved material. Then the last two exchanges, then the
   question.
3. Stream the answer.
4. Check it three ways: addresses cited, addresses attributable, figures and
   names present in the bytes.
5. Fold the turn — System 1 line, System 2 record — both mechanical.
6. One capped call to refresh the running summary.

Nothing in steps 1, 2, 4 or 5 asks the model for anything. That is the design.
