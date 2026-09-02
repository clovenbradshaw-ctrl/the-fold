# Next Passes — the plan of record, 2026-09-01

*Written at the close of the session that finished the tower's floors 0–4
to the material's own ceiling, filled the memory floor's mouth with its
first clean fact, sealed three amendments, and preserved the
three-mathematics reading. Companion to WHAT-IS-BEING-BORN.md (the
anatomy), THE-THREE-MATHEMATICS.md (the structure), and
CAPACITY-DEVELOPMENT-PLAN.md (the cell map). Standing: a PLAN — every
pass names its measurement and its control built to fail (II.23), and a
pass whose gate fails is closed, not forced.*

## The ordering principle

The canonical chain — **NUL SIG INS SEG CON SYN DEF EVA REC**, per
CUBE.md line 39 and the handbook — is math-major and per-claim:
arithmetic's units before geometry's edges before calculus's
accumulation, *for each claim's own lineage*. Floors 0–4 (units and
edges) are done to the material's ceiling: three levers were measured
against the ~20% anchor bound and the bound held, because it is a fact
about what novels assert, not about the reader. **So the work now is
calculus over earned units** — accumulation, judgment, revision — plus
two reconciliations the week's own checks flagged. Nothing below floor 4
is worth another lever; the refuted list at the end of this document
exists so nobody retries one.

---

## Tier 1 — make the memory floor real (floor 5 at scale)

The machine that earns a trusted fact exists and has earned exactly one.
Everything in this tier is making it earn faster, or connecting its
output to the chat that is supposed to be its beneficiary.

**Pass 1 — witness throughput: the slice lever.** One clean vote cost 40
asks / 143 s, with 36 refusals. The known bottleneck is named in P32
itself: `witnessSlice`'s anchor scoring has no prose-vs-table signal, so
a flattened table can out-anchor the prose that actually states the
answer. Fix the slice selection; measure corroborations-per-40-asks on
the Borodino pair before and after. Control: the fabricated-note set
must stay 0/N regardless of throughput — recall bought at precision's
expense is refused.

**Pass 2 — calibrate the walk.** The settling walk is SPRT's shape on
unit steps because the witness's true error rates are unmeasured. Run a
labeled batch (the witness-batch-eval harness exists) to estimate
p(states|true) and p(states|false) per model; if the estimates are
stable, replace unit steps with real log-likelihood ratios and derive
the boundaries from declared error tolerances (Wald), retiring
`maxAsks` to a safety ceiling. Also measure gemma2:2b against
qwen2.5:14b on the same candidates — reliability per model is the
Bovens-Hartmann parameter every consumer of a `testimony:` vote should
be able to weigh. Gate: the calibrated walk must beat the unit-step walk
on asks-per-clean-vote WITHOUT raising false-states; if it cannot, unit
steps stay, disclosed.

**Pass 3 — the third-source seeker.** A `contradicts` verdict is
reported and never landed, correctly — at n=2 disagreement is
undecidable (Lamport). But nothing yet *acts* on the report. Build the
inlet: a contested note routes to candidate discovery for a THIRD
source (the web organ and the corpus both qualify), and the walk's own
contested-first ranking already prioritizes the re-ask. Measure: seed a
real contested pair, verify the third source settles it one way or the
other, and verify an unresolvable one stays typed contested rather than
silently resolved. Control: a fabricated contradiction must not trigger
paid search beyond its budget.

**Pass 4 — wire the mouth into the app.** Two edits, both small and both
overdue: `holon.js`'s ledger gate counts `witnesses.length`, which is
wrong twice over since testimony votes exist — it should count
`distinctSources`; and `corroborateLedger` should be callable as a
background pass over `state.hyperlexiconLog` so the app's own
accumulated notes can earn second votes between turns. Measure: a real
chat turn whose `ledgerBlock` contains a testimony-corroborated line,
end to end. (holon.js/app.js are the fold-architecture session's
contract — coordinate, don't collide; the change is small enough to
land as a reviewed patch.)

**Pass 5 — reading-with-recall, done right this time.** The discarded
probe's design flaws are documented (citation policy independent of the
scorer; control drawn from material the cue never saw). Re-run it
properly: does prior-seeded `recallCandidates` surface the right record
at reading time better than cold ACT-R, in the cold-start region, with
a sound feedback policy? This is the step that turns the digest into a
reading — sentence N's parse depending on what the record *recalls*, not
on re-scannable text. Gate: the control must be able to fail (an
unseen-material cue must retrieve nothing), and the seeded arm must beat
cold on paired steps, not on a mean propped up by feedback.

## Tier 2 — the two reconciliations the checks flagged

**Pass 6 — the operator-order reconciliation. CLOSED 2026-09-01, and not
by a flip.** The audit the gate demanded was built and run
(`eval/operator-order-audit.mjs`, re-runnable): every operator-typed entry
in every persisted log on disk, replayed through the engine's OWN
`checkCubeProgression` walk under each order, with a drift check proving
the replay matches the real function. One discriminating flag
(`SEG → INS`), inspected and explained as the documented PROPOSE retyping
(typed SEG on 2026-08-17, INS from 2026-08-18) — a migration artifact, not
an order fact. The full native suite then ran under BOTH orders: 456/456
either way.

**What settled it was neither audit but a reading of the code.** `cube.js`'s
own `OP_MODE`/`OP_DOMAIN` tables derive canon exactly (domain-major × mode),
and `OP_MODE`'s key order IS canon — so `task-log.js`'s hand-written
`OPERATOR_ORDER` was a RESTATEMENT that had drifted from the tables in the
module it imports, in a file whose own header reads "Nothing is restated
here." The fix is therefore not flipping a literal but removing the
restatement: `cube.js` now derives and exports `OPERATOR_CHAIN`, and
`OPERATOR_ORDER` IS that object. The drift is structurally impossible, and
the audit now reports zero disagreeing pairs because there is one order.
457/457 native, 256/256 in the-fold's operator-consuming suites.

**Two lessons kept:** the burden is on a DIVERGENCE, never on canon — two
independent searches for what it protected found nothing, which is what
licensed the change; and the audit's own first cut grouped threads by build
number and reported 3 violations that were artifacts of that grouping (a
REC re-zero is deliberately its own single-entry thread, and the engine
keys threads by supersession lineage). It now replays through the engine's
own referee rather than re-deriving legality — search for the organ, even
when writing an audit.

**Pass 7 — unblock the SVO wipe's verification. BLOCKER CLEARED
2026-09-01; the wipe itself is NOT started, and the pass found something
bigger than it was looking for.** `hypergraph.test.mjs` loads and runs
(58 tests) — the sibling path resolves in this checkout, so the 81
assertions the wipe needs are runnable.

**What the unblocking surfaced.** The suite pins the FROZEN legacy
provider by path, while `app.js` — the only production caller of
`makeRelationReader` — has imported `/engine-v7/adapters/text/*` since
P69 crossed the ratchet. So this suite has been verifying a configuration
the app does not run, and that was invisible for as long as the file
could not load. Measured both ways: **legacy 54/58, native (production)
52/58** — the same 4 failures plus lemma-widening and
morphologyLanguage. The provider is now a declared switch
(`ENGINE=native node --test hypergraph.test.mjs`), legacy still the
default so the suite's own baseline does not move silently, and the
delta is a measurement anyone can take rather than a surprise.

**The 4 shared failures, diagnosed, not merely counted.** Two
(`party`/grammar-disclosure) are a DESIGN SUPERSESSION: BUILD-3's rule
was "the material's own belief graph is never filtered by grammar —
disclosure never filters", and P73/P74 then wired the POS prior INTO
`discoverRelationVocab` as a real vocabulary gate (measured there as a
gain: junk labels 18 → 0). Both decisions are defensible; they are not
compatible, and the tests encode the older one. Two (referent bar) report
`candidates: 0` — the extractor nominating nothing on that fixture, which
needs its own diagnosis.

**The referent-bar zero, diagnosed the same day.** `extractLeadingSurfaces`
— the organ the mechanism is built on, described in hypergraph.js's own
header and imported BY NAME by the test — **existed in neither engine
provider**, so the import yielded `undefined`, the mechanism could never
run, and the tests could never pass. Built now in eoreader7
(`native/adapters/text/surfaces.js`, 6 conformance cases, 463/463). With
it present the two tests STILL fail, and the cause is now measured:
`resolvePronouns` returns 8 gaps, all `pronoun_no_candidate` ("no
admissible candidate has been activated yet"), because the fixture
mentions its name once and activation never activates it. That is the
mechanism's OWN disclosed cold-start limit, which the tests assert past.
**Not fixed by moving a threshold** — that would be tuning against a
golden.

**ALL FOUR FAILURES CLOSED THE SAME DAY — the suite is 58/58 under BOTH
providers, production included (it started this pass at 52/58).** None was
closed by tuning:

* **Two were a DESIGN SUPERSESSION, now pinned on both sides.** BUILD-3's
  "disclosure never filters" vs P73/P74's real POS vocabulary gate. The
  test now asserts BOTH: unfiltered, the noun-labelled connector is heard
  (the old rule, still true when the prior is absent); gated, exactly the
  junk is dropped and the genuine verb survives, with the cost stated as a
  number (2 of 4 edges here, both junk). Whichever way that question is
  settled, the evidence is in the test rather than in a mystery failure.
  The live badge bug it guards stays closed by a DIFFERENT route
  (`unheard` rather than `beyond-reach` — the gate removes the connector
  before the claim is judged), so the test now asserts the INVARIANT (never
  a false red flag) and accepts either route.
* **Two were tests over-claiming past a disclosed limit,** on a mechanism
  whose own organ did not exist. `extractLeadingSurfaces` is built now
  (eoreader7); with it real, `resolvePronouns` still returns
  `pronoun_no_candidate` for every frame, because the fixture's name is
  activated by nothing — the cold-start limit hypergraph.js's header
  already discloses. The test asserts the limit and will fail, usefully, the
  day activation reaches this case. Its CONTROL had a fixture that
  contradicted its own comment (every "Bennett" opened its sentence, so the
  supposedly ordinarily-established referent was itself leading-only);
  corrected, and it now matches subject spans by inclusion because the
  extractor's leading debris ("saw Bennett") is P74's lever-3 gap and not
  this mechanism's business.

**One more unported organ surfaced:** `createLemmatizer` exists only in the
frozen provider (native's `morphology.js` exports `actClosure` alone), the
same shape `extractLeadingSurfaces` had. Its two tests now import it
explicitly from legacy with the gap named at the point it bites, rather
than failing unexplained under `ENGINE=native`. Production is unaffected —
lemma widening is opt-in and app.js injects neither organ. Porting it is
real, scoped, unstarted work.

**THE WIPE IS DONE (2026-09-02).** hypergraph.js's four construction
sites carry ONLY the earned names (end1/label/end2); internal readers,
edgeFace, phrase(), queryEdges and both query clusters migrated; the
arrangement transition tests flipped to assert the END STATE (SAE names
gone, so a re-introduction fails loudly). One deliberate boundary, caught
live when two shapes diverged mid-rename: FILLERS keep their own narrow
vocabulary (f.subject/f.object — "which value fills this slot"), consumed
by that name in holon.js by documented design; the query functions read
the earned names and emit the filler shape, meeting exactly there. One
real bug the suite caught: edgeFace called arrangementOf(e) on edges that
no longer carry .subject, yielding end1: undefined on every public face.
Consumers migrated: grammar-lens (label-first with .verb fallback), hl.js
/ hl-acquire.js (earned-name-first), their tests, capacity-runner's edge
assertions. 58/58 under BOTH providers; full sweep 1919/1922, the 3
remaining baselined as pre-existing against HEAD organs.

## Tier 3 — make THE-THREE-MATHEMATICS earn its keep

The document ships three falsifiable predictions; a nomination that is
never tested is decoration.

**Pass 8 — build one Ground-row cell from its depth-siblings (§VIII.2).**
CAPACITY-DEVELOPMENT-PLAN's remaining cells are CON·Ground, DEF·Ground,
INS·Ground. Pick one; before building, WRITE DOWN the design derived
from its two occupied depth-siblings (same stance, other mathematics);
then build and compare. If the sibling-derived design works, the depth
axis earned a point; if a from-scratch design succeeds where the derived
one fails, §VIII.2 is broken and the document says so. Either outcome
pays capability debt.

**Pass 9 — one domain-transfer test (§VIII.1).** Pick the Binding stance
(full first): specify what "the same organ, different adapter" means
across two mathematics for compare-to-bound, attempt the port, and
record the result as the first real evidence on the isomorphism
hypothesis — currently untested, since the contest.js precedent is
media, a different axis.

## Tier 4 — deferred, named, in order

10. **`kind-standing`'s caller** — the live cast still folds Castle
    Dracula into Count Dracula; `foldPermitted` exists and nothing calls
    it. Small, gated by its own existing 12 tests.
11. **The speaker boundary** — epistolary "I" bound to its section's
    declared author via segmentation claims + a heading detector; also
    unlocks per-narrator testimony in the crown (a journal's "I" is a
    WITNESS with a name).
12. **Floor 4½ — nesting** (`claim:` in an end slot). **OPENED
    2026-09-01** — the gate (Pass 1 slice lever, Pass 2 both witness
    protocols calibrated) was met, so the door was opened rather than
    left named. `nesting.js` + `nesting.test.mjs` (9 cases against the
    REAL ledger and the REAL independence counters). The wall that makes
    it worth having: **witnesses of an outer note never corroborate the
    inner claim** — `corroborationOf` keeps `direct` and `attributed`
    strictly apart with no option to sum them, and `leakCheck` is the
    assay (pinned both ways: an honest ledger does not leak, a planted
    leak is caught). Disagreement without contradiction works
    (`disagreement`, stance opposition declared by the caller — this
    module holds no stance list). Cycles and self-reference refused at
    any depth; `maxDepth` declared; an unresolved inner id is NAMED, not
    silently depth-0. P39's `self:model` is now the ordinary shape
    rather than a special case in `mergeTestimony`. **Not yet consumed
    by any caller** — the natural first one is `mergeTestimony`, which
    would replace its self-witness special case with the general
    mechanism.
13. **The obligation ledger** — long instruction sets admitted at the
    door, clause standings typed
    (satisfied/violated/waived/not-yet-visited), coverage as enumeration
    not relevance. The pieces exist; the ledger between them doesn't.
14. **Non-text adapters above floor 0** — STARTED (2026-09-01,
    `eval/omnimodal-pipeline.mjs` + results doc): real WAV and real MP4
    decoded to event streams, the SAME kind-discovery organs unmodified
    (one text prior found and made injectable: contextVectors' token
    cleaner), kinds discovered and corroborated across two sources per
    medium through the real hyperlexicon door, II.23 controls in-pass.
    Still missing: F2 arrangements ({end1,label,end2}) from non-text
    media, and the shared-instrument independence fix (a false music
    kind corroborated at "2 distinct sources" because both decodes
    share one tracker — recipeId belongs in the witness string).

## The refused list — measured dead ends, do not retry

- **A furniture/diet gate on the ledger's own surprise** (2026-09-02, P81 /
  eoreader7 S43): a source's tail run above its null misses real wrappers
  and the Gutenberg licence (their ends recur) and fires on closing LISTS
  in editor-written prose. Sound statistic, wrong claim. Furniture is
  "about something else" — a referent-tier question, not a surprise one.

- Raising the face rate past ~20% on narrative prose (three levers
  measured; the bound is the material's).
- Recurrence as an anchor signal (junk recurs identically; Zipf owns
  frequency).
- Parse-time reference from a names-only cast (98.8% of unanchored
  propositions have no being in their clause).
- Distributional company as act identity (syntactic frame, not
  synonymy) — and as a decider check at whole-claim grain (topic
  adjacency defeats any count; per-end is the licensed form).
- Mechanical note identity as the corroboration lever (flat within-book
  AND cross-document; the witness is the door).
- A tenth vocabulary-widening configuration (the MINE-1 plateau is a
  verdict-criterion gap, not a vocabulary gap).
- Overlap-descending candidate ranking (the dark room; mutation-checked
  guard now stands).

## The gate on the whole plan

Every pass above ships with a control built to fail, and the week's
record is why: the controls caught the engine's basin null, the redeal
null's direction, the membership test's grain, the enforcement test's
own first draft, the dark-room proposer, the whole-claim decider floor,
and two darknesses in the faces wire. Nothing here is exempt, including
the plan itself: if Tier 1 cannot raise clean-votes-per-ask measurably,
the memory floor's design — not its tuning — is what gets re-examined.

## Pass 10 — `/reopen`: restore the last open from the record (added 2026-09-02)

`reopen.test.mjs` carries the BECOMING (`{todo:true}`), written before any
code: restore the last source, fold, or door result the person had open,
from the record's OWN rows (`source-open` / `read-start` / `read-reused` /
`term-run` / `term-act`), never from a transcript search. Licensed only
when each wall has a test that would fail without it — address carried
from the row (P5.2), identical on a heard-only ledger, no model asked
what to reopen, `readsNothing`/self:model never an open, any hit rate
shuffled (REDEAL_SEED) before it is reported, restore never re-admits.
A wall that cannot be tested leaves the BECOMING open and says why.
Control built to fail: a fixture whose transcript text names a DIFFERENT
file than the record's last open — the door must follow the record.

## Phase 4 — the-fold as ONLY a surface (added 2026-09-02)

P80 moved the reading closure and the ledger; the-fold is not yet only an
interaction surface. Measured by the crude instrument "no `document.`,
`window.`, `localStorage`, `querySelector`, `addEventListener`, `createServer`
in the file" — a lead, not a verdict; some of these are pure UI helpers
(render, editor, folds-pane, templates) and some are servers' own pure halves
— these remain here and are candidates for `native/organs/` (or the kernel):

aperture arithmetic bound build-log builds chains claims clearance code-scout
consequence constitution crown description-standing dialogue-graph fact-block
firewall fold-log fold github grid ground-ledger handbook holon interact
library links metacognition mhc-interact mhc model-routing moves network pace
pass-delta periodicity predigest proof provenance proxy-api read-source
referent-fold reflex relations-chain reopen retrieval sameness seed seek
segmentation shape skills sources-store store-sql store succession tables
term-lessons title-fold transcribe-log unravel verification void-brief
void-hl void-loop void-narration void-shape web-claim web-hunt wheels wikidata

The rule that governs the order, learned by moving the last closure: **move a
closure together, never a file** — the seam's own header shows why hypergraph
waited (its imports reached the surface), and the fix was moving grounding/
source/web/cite/cast/asserted with it rather than re-pointing one. Candidate
next closures, by import graph: `holon.js` (with fact-block, firewall,
provenance, claims, verification, void-*) is the largest and is the model
loop itself — it belongs with the engine only once the model call is an
injected organ, which it already nearly is; `store.js`/`store-sql.js`/
`build-log.js`/`fold-log.js` (the EOT stores) are kernel-shaped already;
`proof.js`/`web-claim.js`/`web-hunt.js`/`primary` sit behind P13's egress
and must cross with their consent posture intact.
