# GFP as the substrate under closed-class discovery — Passes 43–46

*A direct extension of `GROUND-FIGURE-PATTERN-SPEC.md` (read that first; this
file restates nothing of its §0–§2 except where a new invariant is needed).
Its own numbering continues from the landed sequence — Passes 32–42 are
built and measured (`NEXT-PASSES.md`'s own tail; Pass 39, the room, is the
one still open and unrelated to this). This file does not introduce a new
mechanism. It answers a question raised in conversation, not in code: is a
received, hand-typed, English-only word list (STOPWORDS, NEGATION_WORDS,
DETERMINERS, CLAUSE_OPENERS — all `priors.js`, all `lang: "en"`) the only
way to get this instrument a closed class, or can GFP's own Figure grain
stand under it the same way it already stands under memory and retrieval?*

The short answer, checked against real code before this was written rather
than assumed: **the discovery half already exists and is already
omnilingual.** `kind-standing.js::discoverCompanyKinds` groups words by the
company they keep — no word list, no part of speech, no semantic label —
gated by a real permutation null (II.23) proven to catch a false positive a
bare share-floor missed on a small alphabet (the turbulence specimen,
`kind-standing.js`'s own header). `relative.js::tokensOf` splits on
`\p{L}\p{N}'` — the exact Unicode-general-category fix P62 made to
`source.js::tokenize` for the identical reason. **What does not exist is the
third grain**: a Pattern act that says whether a discovered, unlabeled
cluster *corresponds to* a received, giver-named class — the same shape
`drift`/`reanchor`/`correspond` already give for an address and a figure,
aimed here at a closed class and a company-kind instead of a byte range and
a recalled passage.

## 0. The finding this rests on

Three facts, each already measured somewhere in this repo, none re-measured
here — cited, not re-derived, per this spec's own §2 invariants below:

1. **Discovery needs no word list and no English assumption.**
   `discoverCompanyKinds` found `kind:before=the` (a determiner-fronted
   cluster) and `kind:before=^` (a bare-subject-position cluster) on real
   War and Peace prose with zero taught vocabulary — the signature IS the
   name. The structural distinction a consumer may lean on without any word
   list is already named in that file's own header: a kind signed by a
   *word* (`before=the`) is a frame-kind; a kind signed by *position alone*
   (`before=^`/`before=$`) is not a word at all, in any language.

2. **The null the discovery answers to is not free — and the repo already
   knows the cheap version fails on a small alphabet.** The bare share
   floor (`minShare` alone) was refuted live on turbulence's four-symbol
   quadrant alphabet: a symbol at ~50% marginal frequency cleared `minShare
   0.4` by chance, and the within-phrase shuffle control survived (should
   have dissolved, didn't). `nullArm` (draws/seed/alpha, all declared, no
   default) is the fix already shipped in `discoverCompanyKinds` — every
   pass below inherits this: **a correspondence claim between a discovered
   cluster and a named class must itself clear a null, or it is exactly the
   failure this repo already caught once.**

3. **Distributional company answers "what kind of thing," not "what does it
   mean."** The refuted attempt to infer verb *synonymy* from ±1-token
   company (P73's own dead end: "saw"/"wrote" scored more similar than the
   real synonym pair "looked"/"gazed") is the load-bearing negative result
   for this whole spec. It means: discovery can tell you a cluster is
   *structurally* function-word-shaped; it cannot tell you the cluster
   *means* negation, or determiner, or clause-opener. That gap is not a bug
   to close by trying harder on the same signal — it is why Pass 43 below
   is a correspondence act against a *received* label, never a fifth
   distributional trick aimed at meaning.

## 1. Definitions, extended

**Ground**, here, is not a byte address — it is a **named closed class with
a giver**: `priors.js`'s `NEGATION_WORDS`, `DETERMINERS`, `CLAUSE_OPENERS`,
each already required (P41/P43/P76) to carry its giver or not exist at all.
A language with no such entry has no Ground here — same as a source that
was never loaded has no ground for `drift` to check.

**Figure** is unchanged from the base spec's own Field, pointed at a
different admission: instead of admitting whole passages for recall, this
spec admits **discovered company-kinds** (`discoverCompanyKinds`'s own
output, one node per kind) as Figure-grain nodes carrying no words of their
own — a kind's `signature` and `members` are its state, exactly the way a
shadow node carries a state and an address with no text. A discovered kind
degrades exactly the way a recalled figure does: `unknown`/`no_population`
(`kindMembership`'s own verdicts) are typed gaps, never silent absences.

**Pattern** is the new act this spec proposes: `classCorrespond(kind,
named)` — does a discovered Figure-grain cluster correspond to a Ground-grain
named class? Same five-way shape as `correspond`:

- `agree` — the discovered cluster's members overlap the named class above
  what a same-size random redraw of the vocabulary achieves (its own null,
  §2 below) — **and** the named class exists for this language.
- `repaired` — no named class exists (or the existing one is stale — see
  Pass 45), but a giver labels the discovered cluster, minting a *new*
  Ground entry that rests on the Figure — the closed-class analogue of
  `reanchor` minting a byte address from a recalled state.
- `ground-only` — a named class exists but no discovered cluster clears the
  null against it (too few mentions, or the language's real structure
  doesn't cluster the way the named list assumes).
- `apart` — neither side accounts for the other: a named class exists, a
  cluster exists, and they don't correspond above chance. This is the
  disagreement case worth logging, not silently discarding — it is exactly
  how the repo would learn that, say, its determiner list drifted from what
  the material actually does.
- `unheld` — the discovered cluster's members are too few to test at all
  (mirrors `reanchor`'s own `figure_unheld`).

## 2. Invariants (new; the base spec's G1–G2/F1–F4/P1–P4 hold unmodified)

- **C1.** A correspondence act between a discovered cluster and a named
  class never asserts meaning from distribution alone (finding 3, above). A
  cluster with no giver-supplied label stays an *address*, not a semantic
  claim — usable for structural jobs (an admission floor, a fold gate) that
  never needed the label, per `kind-standing.js`'s own `frameWords`
  precedent, and refused for jobs that need one (negation-polarity checks,
  P43) until labeled.
- **C2.** The overlap between a discovered cluster and a named class is
  itself judged against a null — a same-size random subset of the
  vocabulary compared to the same named class — reusing `nullArm`'s own
  shape (draws/seed/alpha, all declared, no default). An `agree` that
  cannot clear this null is not an agreement; it is coincidence on a small
  alphabet, exactly finding 2's own lesson.
- **C3.** Minting a new Ground entry (the `repaired` case) is a person's
  act, never a model's and never automatic from the correspondence alone —
  the giver requirement (P41/P43/P76) is not waived because the label came
  from a discovered cluster instead of a blank page. One label per
  *cluster*, not per word: this is the actual cost reduction over hand-
  building a list — a giver reviews and names a handful of discovered
  clusters, not hundreds of individual words.
- **C4.** An `apart` verdict against a shipped named class is never
  silently absorbed into the class (no auto-repair of an existing Ground
  entry) — it is logged as a disagreement (mirroring `drift`'s own
  `gone`/`moved`), because a named class silently drifting to match
  whatever the material does is exactly the "result tunes the instrument"
  failure the constitution's own II.5 firewall exists to block.
- **C5.** Nothing here changes what already ships. `NEGATION_WORDS`/
  `DETERMINERS`/`CLAUSE_OPENERS` stay exactly as they are, doing exactly
  the jobs they already do (P41/P43/P210), until a correspondence pass
  explicitly measures them and a person acts on the result. This spec adds
  a checking layer, not a replacement.

## 3. Cells and the registry (proposed; confirm against `cellOf` before writing)

| act | proposed cell | why |
|---|---|---|
| discover a company-kind over the admitted field | `SIG·Pattern` (already registered — `capacities.js`'s own `kinds` row, `native/organs/kinds.js::projectKinds`) | a signal picks a cluster out of the accumulated company; nothing asserted about meaning |
| `classCorrespond` | `SYN·Pattern` | a product derived over a Ground class and a Figure cluster, resting on both — the exact cell `correspond` itself already occupies |
| minting a new named class from a labeled cluster | `INS·Ground` | a giver individuates a new closed class into existence — the same cell `revision.js`'s self-declared "admitting a raw occurrence" already sits at, one register over (a class, not an occurrence) |

Two organs, both new, both pure, mirroring `relative-pattern.js`'s own
split: `class-correspond.js` (the act and its null) and a thin admission
adapter wherever a caller currently builds `vecs`/`sentences` for
`discoverCompanyKinds` (no new admission path — reuse what's already there).

## 4. The passes

### Pass 43 — the correspondence act and its null

*Build.* `classCorrespond(kind, named, { draws, seed, alpha })` — Jaccard
overlap between `kind.members` and `named` (a plain `Set`, whatever
`priors.js` already exports), checked against `draws` random same-size
subsets of the discovery's own vocabulary (not the whole language — the
vocabulary the field actually saw, so the null matches what could have been
discovered at all). Returns one of the five verdicts in §1, with the null's
band carried exactly the way `correspond`'s own `band` field is (P1's shape,
reused).

*Measure.* Run `discoverCompanyKinds` over real English material already in
this repo's fixtures (the War and Peace excerpt `discoverCompanyKinds`'s own
header cites) and `classCorrespond` each discovered kind against
`DETERMINERS`. Expected, stated before running per this repo's own "declare
before you measure" discipline: `kind:before=the` should `agree` with
`DETERMINERS` above the null; `kind:before=^` should not correspond to
anything (it's a position, not a word class) and should read `ground-only`
or simply not be offered a comparison at all.

*Null.* C2's own random-subset control. A run where `classCorrespond` calls
`agree` on a **scrambled** named class (the same words, randomly relabeled
across kinds) must fail to agree — the II.23 discriminating-power check
this repo runs on every new statistic before trusting it.

*Exit.* The predicted `kind:before=the` ↔ `DETERMINERS` agreement measures
real and clears its null; the scrambled-class control fails to agree.

*Not claimed.* That any language besides English has been tested yet.

### Pass 44 — a second language, tested honestly

*Build.* Nothing new — Pass 43's organ, pointed at a real non-English
corpus this repo already has reading infrastructure for (this session's own
prior finding: Russian Wikipedia material was already fetched live for the
omnilingual MHC battery, P70's third same-day amendment — reuse that
fixture rather than fetching a fresh one). No `DETERMINERS`-equivalent exists
for Russian in `priors.js` today, so every correspondence act on this
material is expected to read `ground-only` or trigger the `repaired`
minting path (Pass 45) — this pass is explicitly designed NOT to have a
comfortable pre-built answer waiting, per P71's generality-gate discipline
(a claim of generality needs a corpus the discovery never saw shaped by the
mechanism it's testing).

*Measure.* How many discovered clusters exist at all on real Russian
prose, at the same declared floors Pass 43 used; whether any of them are
structurally frame-kind-shaped (a word-signed cluster, not a bare-position
one) the way `kind:before=the` was for English.

*Null.* Same as Pass 43 — a scrambled-vocabulary control per discovered
cluster, run on the Russian material's own vocabulary, never English's.

*Exit.* At least one real, null-clearing discovered cluster on non-English
material, reported honestly whether or not it corresponds to anything named
— this is P44's whole point: proving the DISCOVERY half needs no per-
language work, whatever the correspondence half finds.

*Not claimed.* That Russian negation, determiners, or any other specific
closed class has been identified. Only that discovery ran and produced
typed, null-cleared output on material with no English assumption anywhere
in the path.

### Pass 45 — the one-label-per-cluster minting path

*Build.* The `repaired` verdict's real consequence: `mintClosedClass(kind,
label, giver)` — an `INS·Ground` ledger entry (`propose`, `operator_basis:
derived`, resting on the discovered kind's own address the way G1 already
requires a repair to rest on its figure) that a caller can subsequently read
the same way `priors.js`'s existing constants are read — i.e., this is
where a genuinely NEW named class enters the running app, not a permanent
research artifact.

*Measure.* End to end: run Pass 44's Russian discovery, have a person (not
a model — C3) review the discovered clusters, label one, mint it, and
confirm a downstream consumer (the admission-floor company check, P216/
P234's own shape) can read the newly-minted class exactly as it reads
`DETERMINERS` today with zero special-casing.

*Null.* None new — this pass is plumbing over Pass 43/44's already-null-
cleared output; its own exit is a wiring proof, not a statistic.

*Exit.* A person can go from "no closed class exists for language X" to "one
exists, giver-named, ledger-addressed, consumable" by labeling a handful of
discovered clusters rather than hand-typing a word list — the actual cost
claim this whole spec is testing.

*Not claimed.* That every job a closed class does (P43's negation-scoping,
specifically) works correctly off a freshly minted class on its first try.
That is real downstream verification, scoped as its own follow-up once a
class actually exists to test against.

### Pass 46 — false-positive audit and registry entry

*Build.* Nothing new. A dated results file (`eval/results/`, this repo's own
convention) walking every `agree`/`repaired` verdict Passes 43–45 produced
against a held-out slice of material neither pass trained its expectations
on, plus the registry rows from §3 landed in `capacities.js` per this
repo's own P64/P65 discipline (an empty cell is a lead, never a verdict,
until an organ fills it and is registered).

*Measure.* Precision of `agree`/`repaired` verdicts against a human check
of a sample (the same LLM-panel-proxy-with-disclosed-limits posture P29's
assertion tier already uses, if no human pass is available at the time).

*Null.* The scrambled-class control from Pass 43, re-run at scale.

*Exit.* A written, dated precision number with its own disclosed limits —
never claimed higher than measured — and both new organs registered in
`capacities.js` with confirmed cells.

*Not claimed.* Completion of the 27-cell registry's Ground row (still
gated on the fold-architecture session's boundary per `CAPACITY-
DEVELOPMENT-PLAN.md`) — this spec's `INS·Ground` cell is a NEW proposed
inhabitant of a cell this repo has separately been tracking as thin, not a
claim that the row is now full.

## 5. Shapes

A correspondence act (mirrors `relative-pattern.js`'s own `correspond`
shape exactly, grain `Pattern`):
```
{ kind: "agree" | "repaired" | "ground-only" | "apart" | "unheld",
  cluster: "kind:before=the", named: "DETERMINERS", overlap: 0.83,
  band: { lo: 0.02, hi: 0.11, draws: 200, seed: 7, alpha: 0.05 },
  giver: null }   // set only on `repaired`, by C3
```

A minted closed-class ledger entry (grain `Ground`):
```
{ kind: "propose", operator: "INS", operator_basis: "derived", grain: "Ground",
  class: "ru:negation-candidate-1", label: "negation (candidate)", giver: "@person",
  restsOn: "kind:before=ne~ru-wiki-battle-of-borodino", members: [...] }
```

## 6. Fully developed means

- `classCorrespond` and its null land, and the predicted English
  `DETERMINERS` agreement measures real (43).
- Discovery is proven to work on a language it has never been pointed at
  before, honestly reporting whatever it finds (44).
- A person can mint a new, giver-named, ledger-addressed closed class from
  a labeled cluster, and a downstream consumer reads it with no special
  case (45).
- A dated, honestly-scoped precision number exists for the whole
  correspondence layer, and both organs are registered (46).

## 7. Not in scope, and said

**Not proposed here:** a semantic-role tagger, a universal POS induction
system, or anything that infers *what* a discovered cluster means beyond
"a person looked at it and named it" (C1/C3 — finding 3 is the reason).
**Not proposed here:** retiring any of the existing English closed classes —
C5 holds them exactly as they are. **Not proposed here:** running this on
every language this repo touches — Pass 44 tests exactly one (Russian,
because the fixture already exists), and each further language is its own,
separately-measured pass, per this repo's own standing rule that a
generality claim is earned per corpus, never assumed from one success
(P71's generality gate, cited not restated).

**Generality:** universal (the discovery and correspondence organs are
medium-/language-blind by construction, per finding 1 and F1/F3 of the base
spec) for the MECHANISM; specimen-scoped for every individual correspondence
claim this spec's passes produce (each must be re-measured per language and
per material, per C2/C4) — stated per P71's own required format for a new
policy entry.
