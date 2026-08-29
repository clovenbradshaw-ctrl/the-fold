# Capability policy — the 27 cells as the map of what this instrument can do, and the honest limits of reading it that way

This is not a new law. The geometry lives in eoreader7's
`native/kernel/cube.js`, the enumeration in `moves.js` (P58), the
registry in `capacities.js` (P22), the depth scale in `mhc.js` (P44), and
the wall at the end in CLAUDE.md's plane-separation section. This file is
the reassembly of the parts that answer one question — *what is this
system capable of, and how would we know* — summarized and pointed at,
never re-derived. When this file and a source disagree, the source is the
law.

The driver behind every coverage number here is
`eval/capability-coverage.mjs` (offline, re-runnable; writes
`eval/results/capability-coverage.json`). It asserts the geometry
mechanically before reporting anything — seven checks, every projection
verified against the live cube rather than trusted from prose.

**Standing document; amendments append.**

---

## C1. The geometry: three free axes, three faces, and why no single face is the map

The cube is **27 cells = mode(3) × domain(3) × grain(3)** — verified
mechanically, not asserted: the nine operators are exactly the nine
(mode, domain) pairs, so there is no fourth free axis. The three named
9-way faces are each a PROJECTION dropping one axis:

| face | is | drops | so one face-value spans |
|---|---|---|---|
| operator | (mode, domain) | grain | 3 cells, one per grain |
| **stance** | (mode, grain) | **domain** | 3 cells, one per domain |
| terrain | (domain, grain) | mode | 3 cells, one per mode |

A stance is HOW an act proceeds (Dissecting, Binding, Composing…); a
terrain is WHERE it lands (Entity, Link, Paradigm…); an operator is the
act itself with its altitude left open. Because each face drops an axis,
**a face-level "covered" can be false at two of its three cells**: the
driver measures Binding as this instrument's one FULL stance precisely
because it checked all three domains, and measures Making as covered
only at Existence — a stance-only readout would have called both
"capable of Making." The 27 is the map; the faces are three readouts of
it, each useful and none sufficient alone.

## C2. The hypothesis this file exists to serve: organs for all nine stances, with the cube naming what is missing

The direction, near-verbatim (2026-08-29): *we should have organs that
can do all 9 stances, and we can use the cube to identify where we are
missing capabilities.* Both halves hold, with one refinement each:

- **"All 9 stances" is the right ambition read at the right face.** A
  stance held in NO domain is a kind of act this instrument cannot
  perform ANYWHERE — the strongest kind of gap the map can show. The
  refinement: completing a stance means filling its three domain-cells,
  not one; the unit of building is the cell, the unit of ambition is the
  stance.
- **The cube identifies where capabilities are MISSING FROM THE
  REGISTRY; a second step identifies where they are missing from the
  instrument.** See C4 — collapsing those two readings is the one error
  that would make this map lie.

## C3. What the map says today, measured

`capacities.js` (10 entries) against the 27, as of 2026-08-29 — with the
registry's own self-description carried, because it changes the reading:
*"THIS IS A DATA TABLE, NOT A RUNTIME… starts — deliberately does not
finish — the library seed."*

**Registered coverage: 9/27 cells.** By stance (each 0–3 domains):

| stance | mode·grain | filled | held at | empty at |
|---|---|---|---|---|
| **Binding** | Relate·Figure | **3/3 FULL** | cast, relations, web/witness | — |
| Composing | Generate·Pattern | 2/3 | skill, graph | REC·Pattern |
| Clearing | Differentiate·Ground | 1/3 | measure | SEG·Ground, DEF·Ground |
| Dissecting | Differentiate·Figure | 1/3 | priors | NUL·Figure, SEG·Figure |
| Tending | Relate·Ground | 1/3 | atmosphere | SIG·Ground, CON·Ground |
| Making | Generate·Figure | 1/3 | cast, build | SYN·Figure, REC·Figure |
| **Unraveling** | Differentiate·Pattern | **0/3** | — | all three |
| **Tracing** | Relate·Pattern | **0/3** | — | all three |
| **Cultivating** | Generate·Ground | **0/3** | — | all three |

The marginals are the instrument's profile in one line: **Figure 5/9,
Ground 2/9, Pattern 2/9**. This instrument individuates and binds
figures; it barely clears grounds and barely works patterns — which is
the same diagnosis P58 reached from one specimen (the list page that
yielded zero edges) now visible as a shape across the whole map.

## C4. An empty cell is a lead, never a verdict — the constitutional line, applied to the map itself

Two kinds of hole share the count, and the raw map cannot tell them
apart:

**Registry debt.** SEG and REC both read ZERO coverage — and both have
real, running, tested organs nobody registered: `reaction.js::withdraw`
(cascading), `declarations.js::concede`, `build-log.js::rezeroBuild`,
`grid.js::concedeEvaluation`, `void-loop.js::reshape` for REC;
build-log's PATCH deletion primitive, grid's `separate` verb,
void-shape's SEG·Ground extent, `identity.js:182` for SEG. Eight of nine
carry their OWN documented cell typing (build-log's header, declarations'
`grain: "Pattern"` in code, P53's read-off cells), so the driver computes
the after-debt projection: **13/27 covered, Composing becomes the second
FULL stance** — without building anything. Reading those zeros as
incapacity would have been false.

**Real incapacity.** CON·Pattern (Tracing at Network) earned the strong
reading the only way it can be earned: a FALSIFIABLE PREDICTION derived
from the emptiness, stated before the enumeration was written, confirmed
on real material — a Figure-grain reader on Pattern-grain material
returns ZERO edges, not few, and it did (P58; the same KIND of ceiling no
vocabulary work touches that `REASONING-POLICIES.md` R12 measured on
different material — analogy, not identity: the MINE-1 configurations
never ran against the list page). That reading was earned BEFORE
`network.js` was built; P58's same pass then occupied the cell
(`network.js`, tested), so CON·Pattern today is registry debt like SEG
and REC — the confirmed prediction is the historical proof that the
strong reading is earnable, not a current claim of emptiness.

**Probe error, the third kind of hole.** P44's battery went through FOUR
wrong versions of one item, each asking a question a lower-purpose organ
could not answer and scoring the reading for the probe's own error — and
its own path-resolution rule exists because "a hardcoded path would
report 'organ unreachable' as a statement about the system when it is a
statement about a path." A hole in the map can be the harness's, not the
instrument's, and nothing in the count distinguishes it.

The rule, this repo's constitutional line pointed at its own map: **three
kinds of hole share the count — registry debt, real incapacity, and probe
error reported as incapacity. The map may report "no organ is registered
here" (withhold); it may report "this instrument cannot do this"
(convict) only where a falsifiable prediction derived from the emptiness
has been stated and confirmed — and never before the probe itself has
been checked.**
Everything else an empty cell says is a lead — and `moves.js::neighbours`
grades the leads: an empty cell whose SAME OPERATOR is occupied at a
neighbouring grain (the same act, never performed at that resolution) is
the strongest kind, which is exactly what CON·Pattern was before it was
confirmed.

## C5. The build order the map licenses

In order of cost-to-close, from the driver's own tables:

1. **Pay the registry debt** — nine rows in `capacities.js`, zero new
   code, 9/27 → 13/27, and the map stops lying about SEG and REC.
2. **The unregistered-in-any-domain stances were the frontier this
   section first named** — Unraveling (Differentiate·Pattern), Tracing
   (Relate·Pattern), Cultivating (Generate·Ground) — with C4's own rule
   applied to the naming: each was a kind of act with no organ
   REGISTERED, and (except for the SEG cells and CON·Pattern) no organ
   hunt had yet been run for its cells, so each was a lead, not a
   verdict. The amendment below records what the hunt then found:
   CON·Pattern was `network.js` (P58, tested, unregistered), and the same
   sweep surfaced registrable organs for DEF·Pattern, EVA·Pattern,
   SYN·Ground and REC·Ground — so of the nine "empty-stance" cells, five
   were registry debt and four (NUL·Pattern, SEG·Pattern, SIG·Pattern,
   INS·Ground) remain leads for the development plan.
3. Every claimed closure lands with a falsifiable specimen, the way
   CON·Pattern's emptiness was confirmed — a cell filled by a row with no
   organ behind it is worse than an honest hole (a check that did not run
   must never report a pass, P41).

## C6. Kind is not depth: the map says WHAT, the MHC battery says HOW FAR

The 27 cells classify kinds of act; they say nothing about how complex a
task the instrument completes. That is a second, independent axis, and it
is already measured (P44, `eval/results/mhc-RESULTS.md`) against a
received scale (Commons's MHC), with control arms per order and the
task/performance separation kept:

- **War and Peace: stage 9** (Concrete) — capped by a MISSING PROBE at
  order 10, not a failure (the slice offers no two-filler slot).
- **Borodino: stage 6** (Sentential) — capped by a REAL ceiling: order 7
  (pronoun binding across sentences) measured and failed, every attempt
  `pronoun_no_margin`.
- Orders 11–13 (Formal, Systematic, Metasystematic) PASS on both
  materials — and are carried as isolated observations, never summed into
  a stage across a failed or unmeasured floor. A refused item is a gap in
  the battery, never a failure of the system; a pass above a hole is
  never a stage.
- Orders 0–4 are out of scope BY CONSTRUCTION: this instrument receives
  symbols and has no sensor. That is the honest floor of any capability
  claim it ever makes.
- **The scale held**: zero orders changed their order-hood with the
  content. Two orders differ across materials, kept apart: order 7 is the
  one PERFORMANCE difference (a well-formed task, completed on one
  material and not the other — what a stage measurement is for), and
  order 10's difference is a MISSING PROBE, a fact about the material.
  The three-way reading (violation / performance / no-probe) is itself
  one of P44's earned findings.

So a full capability statement is a pair: *which cells have organs*
(this map) × *what order those organs complete on given material* (the
battery). The sharpest illustration: Binding is FULL on the map, and the
battery's one real ceiling is order 7, pronoun binding — a task that
reads as Binding-stance work (binding a mention to a referent identity is
SIG·Figure territory; this cell assignment is this document's own
reading of the task, not a claim the battery makes). A cell can be
occupied by an organ that completes order-6 tasks and fails order-7
tasks on hard material. Neither axis substitutes for the other.

## C7. The two walls no capability map can see past

**The refuted move stays refuted.** The cube may never be asked what a
piece of MATERIAL is — 95.7% of cell assignments survived shuffling the
words inside 2,527 paragraphs, so a terrain derived from content is noise
wearing a name. This map classifies ORGANS and ACTS (a question about
the codebase), which is why it is legal. The moment a cell is inferred
from content, this whole document is void for that reading.

**Coherence is strictly weaker than correspondence.** The plane-
separation law (CLAUDE.md, "Stance on the admission record"): cells,
stances, and affordances are constrained by coherence, productivity, and
a named giver's declared risk. A reader can be internally coherent,
productive, and systematically misreading, and this apparatus cannot
detect that — only an oracle can, and only on facts. **A completed 27
would mean the instrument can perform every kind of act the received
algebra names — not that it performs any of them correctly.**
Correctness stays where REASONING-POLICIES puts it: an oracle arm per
mechanism, or no claim.

And the boundary of "ever": the 27 bounds the RECEIVED ALGEBRA'S
VOCABULARY for acts, not the space of possible organs. It is closed
because mode, domain, and grain are each closed triads by declaration —
a giver's frame, with its risk named. Nothing measured in this repo
earns the stronger claim that every capability an instrument could have
lands somewhere in these 27; what IS earned (P44, the MHC convergence;
the void loop's read-off choreography; the moves enumeration predicting
the list-page floor) is that the frame has repeatedly sorted real
capabilities and real gaps without needing a 28th cell. That is a frame
holding under load, reported as exactly that.

## Open, named, unbuilt

- ~~The nine registry-debt rows (C5.1)~~ — PAID, see the amendment below.
- ~~`network.js` ↔ registry reconciliation for CON·Pattern (C5.2)~~ —
  DONE, same amendment.
- Organs for the eight still-empty cells — `CAPACITY-DEVELOPMENT-PLAN.md`
  (repo root) is the per-cell plan, each earning its cell with a
  specimen, per C5.3.
- A per-cell MHC probe (C6 pairs the axes globally; pairing them per
  cell — "what order does the Binding organ complete at Entity vs Lens" —
  is real, scoped, unattempted).

---

## Amended 2026-08-29, same day — the verification pass, and the connection

**The adversarial pass this document's first commit declared pending
ran** (three independent checkers, 119 figures located in sources, plus a
completeness critic) and its corrections are folded in above: CON·Pattern
re-read as closed-then-unregistered rather than currently empty (C4);
C5.2's "performable nowhere" softened to the lead language C4's own rule
requires; C6's two cross-material differences kept apart (performance vs
no-probe); the R12 pointer corrected from identity to analogy; and the
critic's third hole kind (probe error) added to C4's rule.

**The connection (P64): the registry debt is paid, and the hunt was run
for every empty cell rather than only the zero-coverage operators.** Ten
rows joined `capacities.js` — every one a verified export, every one
mechanically domain-legal, each `what` naming whether its cell typing is
DOCUMENTED in the organ's own code/header (eight rows: `network`,
`patch`, `extent`, `rezero`, `reshape`, `hear`, `declare`, `standing`) or
REASONED per the table's own original hand-check discipline (two rows:
`compile`, `regime`). Measured after (`eval/capability-coverage.mjs`,
re-run):

| | before | after |
|---|---|---|
| cells covered | 9/27 | **19/27** |
| operators at zero | SEG, REC | **none** |
| FULL stances | 1 (Binding) | **3 (Binding, Making, Composing)** |
| empty stances | 3 | **0** — every stance ≥ 1/3 |

Marginals moved from Figure 5 / Ground 2 / Pattern 2 to **Figure 8/9,
Pattern 6/9, Ground 5/9** — the Figure-heavy diagnosis of C3 stands but
the Pattern and Ground floors are real now, not near-absent. C3's table
is kept above as the as-found record (this document's own append rule);
the live numbers are the driver's to report, and `registryDebt.ledger`
in its JSON carries a per-organ `paid` flag so the historical debt and
the current state can never be conflated.

**The eight cells still empty** — NUL·Figure, NUL·Pattern, SEG·Pattern,
SIG·Ground, SIG·Pattern, CON·Ground, DEF·Ground, INS·Ground — each now
carries a per-cell plan, candidate organ (where one was found), and
required specimen in `CAPACITY-DEVELOPMENT-PLAN.md`.

## Amended 2026-08-29 (second, same day) — the development pass: 24/27, six full stances, and the gap is the Ground row

P65 in POLICIES.md is the law; this is the map update. The plan's Tier 1
plus the frontier cell were BUILT (three new organs — `testKindMembers`
in eoreader7, `clearance.js` and `unravel.js` here — and two
registrations), every wall fired in tests, and the coverage driver
re-run live:

| face | before this amendment | after |
|---|---|---|
| cells | 19/27 | **24/27** (0 illegal, 25 entries) |
| full stances | 3 (Binding, Making, Composing) | **6** (+ Dissecting, Unraveling, Tracing) |
| empty stances | 0 | 0 |
| grain marginals | Figure 8, Pattern 6, Ground 5 | **Figure 9/9, Pattern 9/9**, Ground 6/9 |
| operators at zero | 0 | 0 |

**The finding this table earns:** the three cells still empty —
CON·Ground, DEF·Ground, INS·Ground — are all Ground-grain, one per mode.
Figure and Pattern are COMPLETE. The kinds of act this instrument cannot
yet perform anywhere are exactly the maintaining-the-ground kinds
(tending the connective field, defining the interpretive ambient,
generating ground where none exists), and all three were already Tier 2's
gated cells for reasons independent of this arithmetic (two on another
session's contract boundary, one on a missing specimen). C4's rule is
unchanged and these three are LEADS under it — no falsifiable
emptiness-prediction has been stated for any of them.

**C7 restated for the new number, because inflation risk grows with the
count:** 24/27 means every non-Ground kind of act is performable
SOMEWHERE — never that any is performed correctly (coherence <
correspondence; only an oracle checks facts), and never that each organ
reaches every ORDER of task (the MHC axis is separate). Five of the 25
rows are typed pointers not yet wired into capacity-runner's execution
path — asking runs them nowhere; their own modules and tests are where
they execute today.
