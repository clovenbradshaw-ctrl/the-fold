# Theory guards

The standing constraints this instrument's theory rests on, each with the
mechanical gate that catches its regression. Written 2026-09-06, after a
session in which **the same defect was found four separate times** and two
of them were committed by the author of the guard against it.

A guard is not advice. Every entry names either a test that fails when the
guard is broken, or says plainly that it is **UNENFORCED** and why. An
unenforced guard is a debt, not a rule — `theory-guards.test.mjs` fails if
any entry declares neither.

**Amendments append.** A guard is removed only by a measurement showing it
protects nothing, recorded here with that measurement.

---

## G1 — A check that cannot fail is not a check

**Claim.** A gate reports `unmeasured`, never `pass`, until it has been shown
capable of returning both verdicts (FOLD-CONSTITUTION II.10).

**Why regression is tempting.** A statistic and its null can be individually
reasonable and jointly degenerate. Twice in one organ (P154): "largest number
of edges sharing a label" tested against a margin-preserving rewiring is
determined by the label multiset alone, so the null returned the observed
value every time and a *planted* ten-item list established nothing; the same
degeneracy then survived into the corrected statistic wherever every edge
named one object.

**Gate.** `pattern.test.mjs` — "THE DEFECT THIS REPLACES", "THE CONTROL",
"A GROUND WITH ONE OBJECT cannot be tested". Every null-bearing organ carries
a test that its null can *fail to reach* the observed value, and one that it
*does* reach it on flat material.

## G2 — A path is derived, never authored

**Claim.** The order of reasoning steps comes from the algebra (`cellOf`,
`OPERATOR_CHAIN`, the executable set), not from a list written by hand.

**Why regression is tempting.** A hand-written pipeline looks like a design
and runs fine. P149's walk `NUL→SIG→INS→CON→DEF` was written by hand and
believed to be a choice; P152 found it is the **only executable path** through
the cube, and the hand-writing had merely hidden that fact for a whole pass.

**Gate.** `ascend.test.mjs` — "the walk's ORDER is derived from the algebra,
not written down" reconstructs the order from `OPERATOR_CHAIN` and asserts it.
Adding a capacity must change the derived path with no edit to the walk.

## G3 — Levels come from the material, not from the author

**Claim.** How many levels there are, and what a level is, is a property of
the material and its perceiver — never a list in a module.

**Why regression is tempting.** Hard-coding `word / sentence / passage` is
easy, reads naturally, and is silently text-only: audio, CSV, code and images
have none of those units. It was committed and had to be pulled back the same
day.

**Gate.** `cursor.test.mjs` — "AN ARBITRARY NUMBER OF CURSORS" runs the fold
level at 2, 3, 7 and 20 cursors and asserts each is read as itself, and
"MATERIAL-AGNOSTIC: nothing here reads text" traces a projection whose nodes
carry no text at all. The fold level takes its levels from the caller's
cursors and its units from the perceiver's projection; nothing in it names a
word, a sentence or a passage. `pattern.js`'s five hand-authored levels remain
text-only and are the standing exception, disclosed in `OWED_LEVELS`.

## G4 — Recurrence of surfaces is not recurrence of referents

**Claim.** Counting strings is not reading. `"prince"` in 14 of 14 passages
conflates Prince Andrew with Prince Vasili and reports the conflation as a
pattern (see `referent-model-not-pointers`).

**Why regression is tempting.** Surface counting is cheap, always returns
something, and the something looks like a finding.

**Gate.** `pattern.test.mjs` — "the surface level says it is about SPELLING,
not about referents" asserts the level is not named `word` and carries
`aboutSurfacesNotReferents`. Any level claiming to read the material must
resolve through a referent index.

## G5 — A level that did not run may never read as absence

**Claim.** "Could not run", "not built" and "found nothing" are three states
and are never collapsed.

**Why regression is tempting.** A summary line reading "2 of 5 levels fired"
invites the reader to treat the other three as negative results.

**Gate.** `pattern.test.mjs` — "a level that COULD NOT RUN is never counted as
'no pattern'" and "the levels that are OWED are named, and say nothing either
way". `loops` returns `couldNotRun` and `notYetRun` separately from `fired`.

## G6 — Probability may never become possibility

**Claim.** The low licenses; the high expects. A prior may re-weight what is
attended to and may never make an unlicensed move legal.

**Why regression is tempting.** It is exactly the shortcut that makes a system
seem cleverer — and exactly how a reader talks itself into what it already
believed.

**Gate.** `ascend.test.mjs` — "THE WALL: probability may never become
possibility" asserts `legalMoves` returns byte-identical output with and
without a prior in the state.

## G7 — Height stays anchored to bytes

**Claim.** Every level of a recursion must reach material bytes. A level
standing only on the level below is the watcher's regress
(`self_referential`, THE-NULL-STATES).

**Why regression is tempting.** Runtime levels each watch the one below, so
the *diagram* is acyclic and looks safe while the ground quietly stops
reaching material.

**Gate.** `ascend.test.mjs` — "THE REGRESS", "METACOGNITION accompanies the
material, and may never stand alone". `rezero` drops spans that reach no
bytes; `groundIsAnchored` refuses a ground of only the reading's own record.

## G8 — A guard hit is not a ceiling

**Claim.** A recursion stopped by its runaway limit has not found its own
bound and is never reported as though it had.

**Why regression is tempting.** `height: 8` reads like a result.

**Gate.** `ascend.test.mjs` — "the recursion stops at a real ceiling, and says
when it did NOT". `ascend` sets `guarded: true` and says so in `stopped`.

## G9 — Where a backoff exists, a bin is a worse estimator wearing a decision

**Claim.** Do not cut a continuous quantity into levels when a hierarchy can
price sparsity directly.

**Why regression is tempting.** Bins are legible and a cut looks like a
decision made. Measured cost (P144): binning coverage into strain levels
destroys 97% of its information, 0.0755 bits → 0.0019. Found four times in
one session, including twice by the person writing the rule.

**Gate.** `prequential.test.mjs` — "NO CUT: the SEG cell is the count itself"
and the sensitivity test over candidate grids;
`earned-constants.test.mjs` (P146) ratchets every new unearned constant.

## G10 — Any-defect outcomes are confounded by output length

**Claim.** Measure a rate, not a presence, whenever output length varies.

**Why regression is tempting.** "Did the answer contain an error?" is the
natural question and it silently measures how long the answer was — P(any
unbacked sentence) ran 0.38 under forty words to 1.00 past two hundred forty,
and it made a headline number substantially an artifact (P143 → P144).

**Gate.** `prequential.test.mjs` — "P144: whether an answer has ANY defect is
mostly a fact about its length — the outcome must be a rate".

## G11 — The cube's tables are injected, never restated

**Claim.** `MODES`, `DOMAINS`, `GRAINS`, `TERRAIN_BY_DOMAIN`,
`STANCE_BY_MODE`, `OPERATOR_CHAIN` come from `kernel/cube.js` at the call
site. Terrain and stance are **projections** of one address — 27 cells, not
9×9×9 — and are derived, never chosen.

**Why regression is tempting.** A local copy removes a dependency and reads
more clearly. `cube.js`'s own header records the last divergence this caused,
in a file whose comment said "nothing is restated here".

**Gate.** `grain.test.mjs` — "the cube is INJECTED — this module may not carry
its own copy of a table that can drift" asserts `placeOf` throws without it.

## G12 — A kind read off the machine is refused; one read off the asker is not

**Claim.** FOLD-CONSTITUTION II.12. A terrain or grain assigned by the machine
and presented as found is refused; an induced kind carries a per-population
null arm or renders `provisional`.

**Why regression is tempting.** The classifier is usually right and the
`provisional` branch feels like a gap to be filled.

**Gate.** `grain.test.mjs` — "a question whose words do not settle its grain is
PROVISIONAL, never guessed", "THE NULL ARM (II.12)", and a control that a split
which is not there is reported absent.

## G13 — Survival is not a finding on an upsert-only fold

**Claim.** "What persists across cursors" distinguishes nothing when the
structure never loses anything. A trace must check its own vacuity and report
it, rather than letting a caller present survival as a result.

**Why regression is tempting.** "A pattern is what survives cursor movement"
is the obvious and attractive design, and it reads as principled. Measured on
War and Peace's first 120 KB at four cursors: **32 of 32 nodes present at 50%
are still present at 100%, and the lost set is empty at every step** — the
fold is upsert-only (`applyObservation`/`applyDelta` both end in
`upsertManyById`; the sole removal touches `fold.provisional`, never
`graphEntries`). What carries information is what a node *does* after it
appears: live, dormant, or superseded.

**Gate.** `cursor.test.mjs` — "THE VACUITY, measured not assumed", "what a
node DOES separates", and "the fold level reports its own vacuity every time".
`trace` returns `persistenceIsVacuous` on every call.

## G14 — A reconstruction is never reported as the record it replaces

**Claim.** Where a finding is recovered by inference because its testimony was
discarded, it is marked `inferred` and names what was lost.

**Why regression is tempting.** The reconstruction works. `supersessions`
recovers real merges — `ref:auto:vasili` and `ref:auto:prince_vasili` folding
into `ref:auto:prince_vasili_kuragin`, three ids for one being — from dormancy
plus surface capture. But the *actual* record exists upstream and is thrown
away: `discoverReferents` builds `merges.push({kept, folded, witness})`
(`surfaces.js:1083`) and returns it (`:1165`), and the perceiver's cache reads
`events` and `gaps` and never `merges` (`recursive.js:297–303`). A
reconstruction that presents itself as testimony hides the repair that is
actually owed.

**Gate.** `cursor.test.mjs` — "A MERGE IS RECOVERED from dormancy plus surface
capture — and marked INFERRED" asserts the flag and the disclosure, with
"THE CONTROL: dormancy alone is not a merge" so identity is never invented.

---

## Owed

- **All guards are enforced.** G3's gate landed with `cursor.js` (P156).
- **The repair upstream is owed, and it is not this repo's.** `merges` is
  computed in `eoreader7`'s `surfaces.js` and dropped in `recursive.js`; until
  that is wired, every supersession here is `inferred` (G14) and weaker than
  the testimony that already exists.
- `pattern.js`'s five levels remain hand-authored and text-only. They are the
  standing exception to G3 and are named in `OWED_LEVELS`; the fold level is
  the general one.
- The cursor trace is an OFFLINE reading, not a turn organ: a full book read
  is ~115 s and 5.4 GB, and exceeds Node's default heap. Each projection is a
  full replay from entry 0.
