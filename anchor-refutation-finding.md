# How babies do it: two mechanisms tried, both refuted, and the reframe that survived (2026-09-01)

User's question — *"how do babies do it?"* — aimed at the anchor-selection
problem (which span before a label is the proposition's first end). Four
real acquisition mechanisms were named; two transferred cleanly enough to
test, and BOTH were refuted by their own controls. The refutations are the
finding.

## 1. RECURRENCE — refuted

Saffran/Aslin/Newport: boundaries fall where predictability drops. Mintz:
frequent frames categorize words. Transferred as: *a real unit recurs
across frames; an accident of adjacency does not.*

Measured on the whole of Dracula (7,057 gate-lit edges), with the census
junk class as a control built to fail:

| set | span-recurrence median | ≥2 | distinct frames median | ≥2 |
|---|---|---|---|---|
| faced (right anchors) | 2 | 54.4% | 2 | 53.8% |
| unfaced | **4** | 59.1% | 3 | 57.6% |
| CONTROL: census junk | 2 | **54.4%** | 2 | 53.5% |

Junk recurs **identically** to right anchors, and unfaced anchors recur
MORE than faced ones. A recurrence floor of ≥2 keeps 58.2% of edges and
moves the face rate DOWN (18.5% → 17.3%).

Why it fails: recurrence measures frequency, and frequency in language is
dominated by function words (Zipf). Same shape as two prior refutations
this week — the redeal null running backwards, and ±1-token company
measuring syntactic frame rather than act identity. The analogy was also
too loose: Saffran is phonemes→words and Mintz categorizes single words;
neither selects a noun phrase.

## 2. REFERENCE AT PARSE TIME — refuted, and it reframes the problem

*Babies have individuated objects before grammar; let the cast constrain
the parse.* Testable form: for every edge whose first end resolved to
nothing, was a known being sitting in the same clause — i.e. was a better
first end available and the matcher took an adjacent fragment instead?

- unfaced edges: **5,753**
- a known being was in the same clause: **70 (1.2%)** — and inspection
  shows even these are chapter headings (`DRACULA CHAPTER`), not real
  relocations
- nothing to find, honestly unanchored: **5,683 (98.8%)**
- ceiling if every relocatable one relocated: 18.5% → **19.5%**

**The extractor is not choosing badly among available beings. There is no
being there.**

## The reframe that survived

`"belief may stand forth as simple fact"`, `"a horse could go"`, `"the
door had been shut"` are REAL propositions with REAL subjects. They can
never carry a face because the cast admits **named individuals only**
(capitalized runs → referents, L2's own discipline).

So the face rate's ceiling is not 100% — it is the share of propositions
whose subject is a NAMED CHARACTER, and in a novel that is low. **18.5%
may be near the true ceiling for a names-only cast.** An earlier report in
this session that framed 48% of subjects as "junk" was substantially
wrong and is corrected here: some is genuine garbage (`and`, `which`,
`day belief`), much is honest propositions about unnamed things.

## The lever this exposes, one floor DOWN

Common-noun and definite-description referents. "The Count" individuates
only because it is capitalized; "the door" is individuated by nothing. The
JUDGMENT tier already treats definite descriptions as presupposition-
bearing (HL's `the r(s,o)` → CONTESTED when a functional relation carries
multiple bindings) — so the machinery exists at the top of the building
and not at the bottom. That is a Station-3 extension, not anchor surgery,
and it is the honest next build.

Its own control is already obvious and must be built with it: a definite
description is only a referent if it recurs and resolves consistently
("the door" in one room is not "the door" in another) — which is exactly
the identity problem `kind-standing.js` measures, one slot over.

## What was kept from the baby analogy

The third mechanism, untested but sound and already this project's law
elsewhere: **babies do not parse everything.** Acquisition is
high-precision and catastrophically low-recall, and works on redundancy.
An extractor that took the clear cases and typed the rest as unread would
lose nothing downstream — corroboration only ever uses repeatable
propositions — and would stop poisoning the ledger. That is
withhold-versus-convict applied one floor lower than it had been applied.
