# Next Passes — the plan of record, 2026-09-01

*Written at the close of the session that finished the tower's floors 0–4
to the material's own ceiling, filled the memory floor's mouth with its
first clean fact, sealed three amendments, and preserved the
three-mathematics reading. Companion to WHAT-IS-BEING-BORN.md (the
anatomy), THE-THREE-MATHEMATICS.md (the structure), and
CAPACITY-DEVELOPMENT-PLAN.md (the cell map). Standing: a PLAN — every
pass names its measurement and its control built to fail (II.23), and a
pass whose gate fails is closed, not forced.*

*Reconciliation note, added 2026-09-03: several Tier 3/4 items below were
built and closed on 2026-09-02 without this document being re-edited at
the time — a real staleness gap, caught by a cross-repo survey that
checked commit history and both repos' actual file trees against this
text. Status notes are appended in place at each affected item rather
than rewriting the original prescriptive text, so the plan's own history
stays legible and a reader can see what was asked for versus what
shipped. Nothing in Tier 1, Tier 2 or the refused list was found stale.
The gate-on-the-plan section read current at the moment of this survey and
was CLOSED by P84 later the same day — see its own entry below, which
records that it too stood stale for a day. A survey is a reading at a
cursor, not a standing guarantee; it is dated for exactly that reason.*

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

**Status note, added 2026-09-03 (reconciliation pass).** Built, as
`native/organs/frame.js` (+`frame.test.mjs`) — DEF·Ground, derived from
its two depth-siblings (NUL·Ground's declaration gate, SEG·Ground's
extent-and-units) exactly as the pass prescribes: a declaration gate
with typed refusals, verdicts stamped with content-addressed frame ids,
a cross-frame comparison wall. Verified live against the two real
hypergraph providers (legacy vs. native) as two declared frames over one
material. The depth axis earned one point; see
`native/docs/def-ground-derivation.md` and the-fold's CLAUDE.md, "DEF·
Ground built from its depth-siblings." The remaining two Ground-row
cells were filled the same day rather than deferred further: CON·Ground
as `field` (`fold.js::advanceSummaryFold`, the running summary's
maintenance act) and INS·Ground as `preflight`
(`proof.js::preflightQuery`, P23's one-search-before-drafting). The
capability registry now reads **27/27, nine full stances, zero illegal
cells** — see the-fold's CLAUDE.md, "The map at 27/27, and a second
judge shuffled." Closed.

**Pass 9 — one domain-transfer test (§VIII.1).** Pick the Binding stance
(full first): specify what "the same organ, different adapter" means
across two mathematics for compare-to-bound, attempt the port, and
record the result as the first real evidence on the isomorphism
hypothesis — currently untested, since the contest.js precedent is
media, a different axis.

**Status note, added 2026-09-03 (reconciliation pass).** Attempted and
recorded, as `native/organs/binding-core.js` (+`binding-transfer.test.mjs`,
5 cases): the Binding stance's algebra extracted once, domain-blind (a
figure seeks its counterpart in a field; declared criterion scores;
unique clearing winner or typed refusal; an optional foil probe), then
three thin adapters reproduce the REAL decisions of three existing
Binding organs on real material (mention→referent against the real
referent index, claim→edge against the real relation reader — both
bound and not-bound cases, testimony→verdict against the armed select
protocol). Zero core edits between domains. Scope is stated honestly:
agreement on specimens, not proven behavioral equivalence, and one
refinement surfaced — margin is domain-owned, not core (geometry's exact
tie of fully-clearing edges reads as corroboration; arithmetic's tie
reads as genuine ambiguity). One earned point toward §VIII.1, not a
closed law; broader stance coverage beyond Binding is still real,
unattempted work. See the-fold's CLAUDE.md, "§VIII.1 tested: Binding
transfers across the three mathematics." Closed as a first trial;
extending to other stances remains open (folded into Tier 4 below).

## Tier 4 — deferred, named, in order

10. **`kind-standing`'s caller** — the live cast still folds Castle
    Dracula into Count Dracula; `foldPermitted` exists and nothing calls
    it. Small, gated by its own existing 12 tests.

    **Status note, added 2026-09-03 (reconciliation pass).** Built —
    `native/organs/fold-gate.js` (+`fold-gate.test.mjs`): review-not-
    prevention over `discoverReferents`' own reported merges, judged
    against a declared kind plus the cast as population (kind-standing's
    own null needs the rest-of-material — found by the first live run
    refusing `no_population`). Measured live against real Dracula bytes:
    the {Count Dracula ← Castle Dracula} merge is VETOED by the live
    gate. Closed.

11. **The speaker boundary** — epistolary "I" bound to its section's
    declared author via segmentation claims + a heading detector; also
    unlocks per-narrator testimony in the crown (a journal's "I" is a
    WITNESS with a name).

    **Status note, added 2026-09-03 (reconciliation pass).** Built —
    `native/organs/speaker.js` (+`speaker.test.mjs`): declared-speaker
    sections as a binding table beside immutable text (offsets into the
    text as given, P5.2-verified), a structural heading gate
    (underscore-wrapped or all-caps — prose containing "journal" is
    never a heading), possessive/from-phrase/letter-comma author
    detection, kind-only boundaries typed speakerless. Measured on the
    whole real Dracula text: 110 sections read like the novel's own
    contents (Seward's 29 diary entries, the firms, Sister Agatha, Van
    Helsing with his degrees). Consumed the same day by
    `capacity-runner.js`'s `speakerWho` — a reading's `who` now names
    the section's speaker (e.g. `dracula.txt:DR. SEWARD`) rather than
    only the source, additive and typed-absent where a source declares
    no speakers. Closed.

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

    **Correction, added 2026-09-03 (reconciliation pass).** The line
    directly above ("not yet consumed by any caller") is stale.
    `nesting.js` was consumed the SAME day (2026-09-01) by
    `mergeTestimony`, via a structural `readsNothing` check: an
    unaddressed hold is an outer note, which subsumes the earlier
    `self:model`-only special case (a namespace-based exclusion attempt
    was tried first and refuted by a pre-existing pin — `self:ledger`
    reads addressed bytes and is a genuine source read — before the
    structural fix landed). See the-fold's CLAUDE.md, "Floor 4½ opened:
    nesting, and the wall that makes it worth having." Closed.

13. **The obligation ledger** — long instruction sets admitted at the
    door, clause standings typed
    (satisfied/violated/waived/not-yet-visited), coverage as enumeration
    not relevance. The pieces exist; the ledger between them doesn't.

    **Status note, added 2026-09-03 (reconciliation pass).** Built —
    `native/organs/obligation.js` (+`obligation.test.mjs`): declared
    enumeration admitted at a door (prose refused, boundaries never
    invented), four typed standings with not-yet-visited its own
    standing, append-only entries carrying `because`+`refs` (a violation
    later satisfied keeps its road), waivers requiring both a reason and
    a name, coverage as ENUMERATION — the unvisited named, complete only
    when nothing is unvisited and nothing stands violated. Consumed the
    same day via the-fold's `/must` chat door (blob-staged). Closed.

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

    **Status note, added 2026-09-03 (reconciliation pass).** Both
    remaining pieces shipped the same week. F2 arrangements:
    `native/organs/event-arrangements.js` (+`event-arrangements.test.mjs`)
    — recurrence-gated adjacency with declared labels and event-ordinal
    addresses (coordinate space declared, P5.2 self-verified), landing as
    ordinary hyperlexicon notes with `~recipe`-tagged witnesses; the e2e
    puts the turbulence ejection-sweep grammar on the real ledger at 2
    distinct sources × 2 distinct instruments. The shared-instrument
    independence fix: `corroboration.js` gained `independentReadings`/
    `distinctRecipes`, counting (source, recipe) pairs rather than
    sources alone, with witnesses now carrying `<source>~<recipe>` (P68
    recipe identity) so two decodes sharing one tracker no longer
    corroborate each other — proven on the original music failure (the
    false shared-tracker kind stays at 1 instrument and is refused; a
    second, genuinely different tracker lifts the two true kinds to 2
    sources × 2 instruments). See the-fold's CLAUDE.md, "Music and video
    through the pipeline" and "Turbulence through the pipeline." Closed.

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

**Fired 2026-09-02 (P83).** The witness walk ran live on CPU over a real
novel and the page pair, with the walls on and the source count
corrected: 0.017 and 0.033 clean votes per ask, zero lies. The number
cannot be raised on a novel — restatement across chapters is structurally
rare — so the floor's DESIGN is what gets re-examined: the ≥2-witness gate
on the ledger block (`holon.js`) withholds a book's whole reading from the
model to guard against a diet the door no longer admits. Next pass: a
single-witness note with a verified address reaches the model with its
corroboration DISCLOSED, measured live against the current gate.

**CLOSED 2026-09-03 by P84 (the Ranke pass), and this entry was stale for a
day — corrected here rather than left pointing at finished work, because a
plan of record that names a done thing as next is worse than one that names
nothing.** The gate is gone: `holon.js` (the `ledgerBlock` construction)
now ranks BOTH tiers by shared vocabulary with the question and uses
standing only as the TIEBREAK, so a single-witness note reaches the model on
its own relevance and its corroboration is disclosed rather than withheld
("stated in more than one place" / "stated once so far"). A question the
ledger holds nothing on gets no block at all — measured by
`eval/the-fold/gate-proof.mjs`, which also caught the reason the first cut
failed: with the corroborated tier unranked, 21 corroborated notes filled
the five-line budget on every question and the asked single-witness note
reached the model on 1 of 8.

So the gate fired, the design was re-examined, and the re-examination
landed. What it did NOT do is raise clean-votes-per-ask — that number is
still the plan's open gate, and the remaining lever is named in
`reading-recall-finding.md`: identity is REFUTED (0 joins on real pages;
`sameLemma("withdraws","retreated")` is false), so what is left of the ~2%
wall is PARAPHRASE, and the licensed tool for paraphrase is P32's witness
tier. That is Pass 12 step 4.

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

**Status note, added 2026-09-03 (reconciliation pass).** This list has
NOT been re-verified against current file trees in this pass (the
reconciliation was scoped to Tier 3/Tier 4 status text, which is
authoritative and independently gated). A quick cross-check while
reconciling found `capacity-runner.js`, `hypergraph.js`, `testimony.js`,
`experiencer.js`, `primary.js`, `source.js`, `web.js`, `cite.js`,
`cast.js`, `grounding.js`, `quotes.js`, `asserted.js` and `measure.js`
already present in `eoreader7/native/organs/` as of today (per P80's own
closure), consistent with several files above being past-tense
candidates rather than current ones; a fresh Phase 4 pass should
re-derive this list from the actual current the-fold file tree rather
than trust it standing.

## Pass 11 — Ranke: the primary-source chase, gated and witnessed (added 2026-09-03)

The gate on the plan (above) fired and was closed by P84: the ledger block
discloses a note's standing instead of withholding on it, and a new agent
— Ranke, after Leopold von Ranke — chases a note read off a citing page to
the sources that page cites (any outbound link) or quotes without a source
(searched). Three rules earned by running, each with a control: a page that
cites nothing chases nothing (a novel is never chased — the gate); a link
sharing no word with the claim is not a lead for it (178 blind fetches on
the first run); and containment is a LEAD, never a landing — the redealt
ledger attested 6 to the real ledger's 1, so only the witness tier's own
"states" lands a `primary:` witness (0 real / 1 control with the model
reading). On the Austerlitz/Third-Coalition pages zero notes landed: the
cited primaries are catalogues and books. Next, named there: address rules
for full-text faces with givers; the witness at book scale; quote leads on
an engine that answers. The switch is default OFF and every run is
budgeted — this is a door, not a per-turn cost.

**Status note, added 2026-09-03 (reconciliation pass).** Extended twice
more the same day: S46 amended (containment 1 real / 6 redealt on a
larger run; gate-proof measured on gemma2:2b) and a "worked backwards"
run over Apollo 11 (`ranke-backwards.mjs`) that earned three more rules
(a footnote marker is a lead; a marker at a span's start belongs to the
previous sentence; a cited address is not the cited document until its
face carries the citation's own title words or an archive copy). The
named next-work list from this pass is still open and is where Pass 12
picks up: more address rules, book-scale runs, a real answering search
engine, and — explicitly, per the second amendment — pointing the
witness at the 162 of 226 "partial" (object-missing) notes via the cited
face's own referent activation rather than word containment. See
eoreader7's `native/READING-SPEC.md` S46 and its two amendments.

## Pass 12 — two universes, and the bridge between them (added 2026-09-03)

**The finding this starts from, which is a defect and not a plan.**
`hear()` unions two sources' witnesses onto one note when their
`(end1, label, end2)` triple matches exactly. That single string comparison
is doing TWO jobs: asserting the two propositions are the same, and
asserting the two documents' referents are the same. The second is a
BRIDGE between two readings, and today it is never established, never
recorded, and cannot be conceded. It is usually right, and silently
catastrophic when it is not: two different Smiths, two different
commissions, one note, two witnesses, no way to find out.

So P83's corroboration rarity reads differently now. The measured ~2% was
not only paraphrase. It was also that **string identity is the only bridge
this system has**, and it is an unrecorded one — which means the rare
firings are as unexamined as the common misses.

**The reframe (user, 2026-09-03), and why "lens" was the wrong word.** A
lens is one reader over one material. What two readings produce is two
UNIVERSES of referents, each existing only relative to the reading that
established it. `frame` is already taken, correctly, for HOW a reading was
made; a universe is WHAT it produced. `frame.js` already refuses to compare
readings taken under different frames, which is the right default and
exactly where a licensed door belongs: a bridge is what makes that
comparison legal, and it must be earned per crossing rather than assumed by
a matching string.

**The load-bearing clause, verbatim: "it is the same set of operations,
just at another level."** Nothing new is needed operationally.
Individuating a referent from mentions and individuating a correspondence
from two referents are the same act one level up — SIG then INS to
establish, EVA to test it against a ground, REC to concede it when
refuted. The nine operators already cover this; what is missing is the
object they act on.

**Two more rules from the same conversation, both about not throwing
information away.**

*Never sever a proposition from its reading.* Notes keep spans and
witnesses, so provenance to the source survives. What does not survive is
the READING STATE — which referents were live, and how strongly, when this
proposition was heard. That is a handful of ids and values per note. It is
PROVENANCE, never prompt material (P55). Its absence is why the slicer pass
existed at all: three slicers reconstructing, from cold text, something the
reader had for free at extraction. `ranke-slicers.mjs`'s activation arm
literally rebuilt an activation state over the face because the real one
was gone.

*Checks run where they are needed, in context.* A batch sweep over 162
notes is out of context by construction, and it spends calls on
propositions nobody is using. Checking at point of use keeps the reader
standing there with its activation live, and is the same efficiency law
P30 already states. The eval corollary: an eval must stay repeatable and
offline, so its correct form is to RECORD AND REPLAY the activation, never
to re-derive it.

**The order, and it matters — each step is worthless before the one above
it.**

1. **Separate the two jobs `hear()` conflates.** Proposition identity and
   referent identity become distinct, separately recorded claims. A union
   today asserts both; after this it asserts one and NAMES the other as
   assumed, so the assumption is at least visible. Control built to fail: a
   fixture with two documents using one name for genuinely different
   referents — the union must be refused or flagged, and a run over real
   material must report how many existing unions rested on an unestablished
   bridge. If that count is near zero, this pass is smaller than it looks
   and the plan should say so.
2. **Bridges as recorded objects.** A correspondence between universes
   carries a witness, provenance, a standing, and a path to concession
   (REC), exactly as any other claim does. Defeasible, corroboratable,
   never assumed.
3. **Read the cited document with the same apparatus.** Today the article
   gets the full pipeline and the cited source gets a regex window and a
   prompt — an asymmetry that is the entire reason a slicer existed. Read
   both and the candidate set stops being eight heuristic sentences and
   becomes the other reading's own propositions; the witness's question
   shrinks from "read this page and tell me if it says X" to "are these two
   notes the same act", which is the pointing question the select protocol
   is actually good at. Cost: the extraction pipeline per cited document,
   which is real compute and ZERO model calls.
4. **Only then does witnessed paraphrase have somewhere to land** — as a
   bridge at the proposition level, with its own provenance, rather than
   another string match. P84's own next-step note is this, correctly framed.

**What this does not do, said now so it is not claimed later.** It does not
dissolve paraphrase. It reduces it to "same act?" between two structured
notes, which is still the synonymy question that measured flat under every
mechanical identity tried (reading-recall-finding, P74). It makes that
question askable with both sides structured, and makes its answer
recordable. That is all.

**The gate on this pass.** Do not build step 2 before step 1 has been
measured on real material. If unexamined bridges turn out to be rare and
harmless, the honest outcome is a disclosure on `hear()` and a much smaller
pass — and P85's retirement clause is the shape of that: an apparatus
earns its place against a control, or it does not get built.

**Also standing, from Pass 11's own handoff:** the slicer licensing
measurement is unrun (`slicer-licensing-RESULTS.md`,
`slicer-licensing-HANDOFF.md`). It should be run AFTER step 3, not before —
step 3 may remove the model from that slot entirely, at which point the
licensing question answers itself and the 480 calls are never spent. The
cheap pre-check named in the handoff, candidate recall with no model calls,
still applies and still comes first.

**Step 1 status (2026-09-03): built, measured, honest.** eoreader7 S48
(companion PR clovenbradshaw-ctrl/eoreader7#63): `hear()`'s exact-triple
union is split into proposition identity (unchanged) and referent identity
(now a recorded, refusable `join`). Gate measurement on real material: 22
of 22 corroborated notes rest on an assumed bridge, common, not rare, so
step 2 is warranted on that finding alone. A zero-model probe (do the two
sources' own `discoverReferents` universes independently name the joined
ends the same way) was built and its first cut refuted itself — false
disagreements from using a stricter identity rule than `namesCorefer`
already licenses elsewhere in this codebase, fixed at the source. Even
corrected, a seeded II.23 control matches the real suspect rate exactly
(4.3%): **the probe cannot separate real bridges from random ones at this
sample size.** Reported as a power problem, not a clearance — see
`eoreader7/native/eval/the-fold/results/bridge-audit-RESULTS.md` for the
full account, including that 57% of crossings are unexaminable by this
method at all (a joined end is often a definite description the extractor
never names as a referent).

**What this licenses, and what it does not.** Step 2 (bridges as recorded
objects with witness/provenance/standing/concession) may proceed — the
`join` shape already carries most of what step 2 needs (source, basis,
standing), so step 2 is closer to formalizing it than building it fresh.
What it must NOT do is claim the 22 measured bridges are safe; that
question is still open, and a stronger probe (more material, or one that
can examine non-named ends) is the honest way to close it, not an
assumption that "common" implies "fine".

**Step 2 landed (2026-09-03): eoreader7 S49 / PR #65.** `organs/bridges.js`
— bridges as recorded objects on their own ledger, corroborated when two
independently-derived content notes assume the same correspondence. 46
arrangements from 22 joined notes collapsing to 43 distinct objects, 3
corroborated. 40 stood `single-witness` with nothing able to move them,
which is what step 4 went after.

**Step 4 landed, and it refutes the hope that motivated it (2026-09-03):
eoreader7 S52 / PR #70.** `organs/bridge-witness.js` asks a witness whether
a single-witness bridge is real — select protocol, armed against a decoy
drawn from a sibling bridge candidate, an unarmed "same" refused, the act
(`concede`) kept apart from the diagnostic. Measured live on the same three
fixtures: real correspondences landed "same" 8 of 12, the mispaired control
2 of 12, **Fisher exact one-sided p = 0.0180** at a declared α = 0.05, run
twice at temperature 0 with identical results. The organ discriminates.

**And it cannot reach the wall this plan was aiming at. 12 of 12 examined
candidates have two faces that are the IDENTICAL string.** A bridge exists
only where `hear()`'s exact-triple match already fired, so a paraphrased
restatement never produces a join, never becomes a bridge candidate, and is
never put to a witness. **Witnessing bridges cannot touch the ~2%
corroboration wall** — that wall is the match that never happened, and this
organ runs strictly downstream of it. Step 4 makes bridges ACCOUNTABLE; it
does not make more of them.

**What that leaves for the plan.** Step 3 (read the cited document through
the full extraction apparatus, replacing the regex-window slicer) is
STILL the only named step that could move corroboration, because it is the
only one that operates UPSTREAM of the match — it changes what gets
extracted before identity is ever asked. Ranke already does most of its
shape (footnote-bound leads, document-identity verification, containment as
a lead only, the witness as the verdict), so step 3 is now better read as
"give Ranke's witness two STRUCTURED notes to compare instead of a claim
against raw prose" than as new machinery. Unstarted.

And the standing gate on the whole plan is unchanged and unmet: none of
this raised clean-votes-per-ask. Step 4's honest contribution to that
number is zero, by construction, and it says so.

**And step 3's premise was measured before building it (2026-09-03):
eoreader7 S53 / PR #70.** P85's licensing run — unrun since it died with
its container twice — was taken: **no slicer earns a license.** The
proposed better candidate-selector (referent activation, the one meant to
see "the crew", "it", "the module") could not offer candidates on 24 of 40
notes and landed real and control at the SAME rate — refused by its own
control. Containment separated on the count (9 vs 1) and then dissolved on
inspecting the sample: 8 of its 9 landings are page furniture signed as
testimony («Support the Museum», «Visit the Apollo Journals Website», a
video caption), and under the decider-company wall it reads 1 vs 0.

**The structural finding that reshapes step 3.** P85's L4 names the
decider-company wall as one of the non-learned organs bounding a slicer's
authority. It is not below the select path at all — it runs only on the
generate path — and it CANNOT be switched on there, because it requires
each end's own words while the seam exists precisely to reach cases where
an end's words are absent (implemented, measured, reverted: it breaks
`corroboration.test.mjs`'s own pinned "end2 never fires literally" test).

So step 3 is not "give the witness better candidates" — that was measured
and it does not help. The unguarded thing is RELATEDNESS on injected
candidates, and the only shapes that could guard it without forbidding
paraphrase are referent-identity ones: resolve the end (`makeReferentIndex`
— "the crew" to the crew, not letter-matching) and ask about the referent,
and draw the arm's sibling pool from the reader's referent state rather
than from capitalized surfaces. Named, unmeasured, and now the actual
content of step 3.

**Superseding the reconciliation pass's own status note (2026-09-03).** That
note read: *"Step 1 is the most recent landed work in either repo as of this
reconciliation (eoreader7 PR #63, merged; the-fold PR #125, merged). Steps 2-4
above are the standing next engineering work - not started as of this note."*
It was true when written and is false now: steps 2 and 4 landed the same day
(eoreader7 S49/PR #65 and S52/PR #70), and step 3's premise was measured
(S53/PR #70). Recorded rather than deleted, because two passes writing the
same day from different branches is exactly how a plan of record acquires a
line that points at finished work as though it were next.

## Pass 13 — the reproducibility audit, continued (added 2026-09-05)

**Closed 2026-09-05 — POLICIES.md P95 / eoreader7 S65.** Decided: refuse.
All nine run with no cap and classified; four transcription docs enforced
by `lib/` + `tests/`; `audit-results.sh` kept with the map; the MHC
one-material refusal typed. What it handed forward is Pass 14.

POLICIES.md **P94** / eoreader7 **S64** are the law; this is the handoff.
The audit of committed eval results ran **3 of 13** wipe-exposed drivers
before the session wrapped. Established: `admission-gate` drifted by one
`the`-labeled note in its blind arm (the finding stands, the defect arm
moved); `asserted-eval` cannot run here (frozen-provider path into an
uninitialized submodule); `cited-source-null` and `ordered-read-reach`
are unreproducible since `5541af4` — 86 of the 106 faces their walk names
were untracked 32 minutes after the docs landed, and both drivers
narrowed their pool to the 20 that remained without saying so (they say
so now). Take the rest in this order:

1. **Decide the fixture rule before re-running anything.** Two options:
   commit the faces a results doc stands on (content-addressed, hundreds
   of KB), or make every walk-based driver REFUSE — a typed gap and a
   non-zero exit — when the walk names faces the checkout lacks, and mark
   the two docs "reproducible only where the walk's fixtures exist."
   Recommendation: refuse. A null over a silently narrowed pool is the
   worst of the three outcomes, and the docs are already dated records of
   one run, not claims about the repo.
2. **Run the nine unrun drivers locally** (the user's "then we'll run
   local"): `full-circuit`, `hyperlexicon-door-probe`, `mechanical-
   reasoning`, `object-boundary`, `pruning-timeline`, `rashomon-contrast`,
   `reasoning-e2e-no-llm`, `subject-wall`, `vendored-prior-eval`. For the
   five that write a tracked file, `git diff -- results/` is the measure.
   For the four transcription docs (`full-circuit`, `hyperlexicon-door-
   probe`, `object-boundary`, `reasoning-e2e-no-llm`) compare stdout to
   the doc's numbers by hand — the audit script's diff was vacuous for
   them, which was the audit's own first finding. No 600 s cap: a
   20-draw null needs ~12 min.
3. **Make the transcription docs enforceable** the way P94 made
   `mhc-RESULTS.md` enforceable: the driver's computation moves into a
   `lib/` function that a `node --test` file reads on every run
   (`lib/coref-agreement.mjs` + `mhc-order5-precision.test.js` is the
   template). One pattern, nine docs; the numbers a test does not read
   are reports.
4. **The audit runner** was scratch (`/tmp/audit-run.sh`, not committed).
   If it is kept, it lives at `eoreader7/native/eval/the-fold/
   audit-results.sh`, carries P94's driver→artifact map, and classifies a
   print-only driver as such instead of reporting `diff lines: 0`.

Also carried: the MHC battery picks its control from the run set, so a
one-material invocation reports "none readable" for want of a control —
worth a typed refusal in `main()` rather than a misleading stage.

## Pass 14 — what the finished audit handed forward (added 2026-09-05)

P95 / S65 closed Pass 13. Five things it found and deliberately did not fix,
each a fact on the record with a named file, in the order they matter:

1. **The door admits a closed-class connector in a script the prior does
   not cover.** `hyperlexicon-door-probe` arm C now carries `Война —и→ мир`
   and `Война —и→ миръ` — Cyrillic "and" from the article's Russian title,
   invisible to the probe's English hand list and absent from the English
   POS prior. Same shape as the labels P73 closed for English, one script
   over. The probe reports "labels the prior has no entry for" beside the
   hand-list count (`lib/door-probe.mjs`); the fix is a received prior for
   the script, or a wall that refuses a label the prior cannot classify at
   all — measure which, and what the second costs on English ("discusses"
   sits in the same column).
2. **`boundedObjects` is gone and two files still point at it.**
   `object-boundary.mjs` (refuses, typed) and `lib/borodino-ledger.mjs`'s
   `BOUNDED` flag both name an opt-in this repo's P80 removed. Either the
   referent-aware trim the object-boundary doc pointed at instead ("cut
   after an earned face only when nothing earned follows", at
   `hypergraph.js::endpoint`) is built and measured on the same Dracula
   slice, or the flag comes out. Not both left standing. When it is
   re-measured, the marginal pairing key (`spans[0].at` start + label +
   end1) collides where one sentence yields two edges on one subject and
   verb — the source of the "moved by the cut: 53" artifact even on
   identical arms — and needs the edge's own id or full span before any
   "moved" count is trusted.
3. **Two docs are enforced by nothing and are named as such** in
   `audit-results.sh`: `admission-gate` (drifted by one note in P94, still
   print-only) and `rashomon-contrast` (its slot-level table — 1537/15/14,
   251/7/7, 117/15/15 — was never computed by its driver). The rashomon
   next step P92 named (the contrast at slot grain through
   `cardinality.fillers` and `contest.js::adjudicate`, with a null) would
   make that table a driver output before it is made a test.
4. **A results doc that prints its own wall-clock never diffs to zero.**
   `asserted-eval.md` reproduced except for "armed at 200 draws in 32.6s".
   Move timing to stderr or a separate untracked line in that driver and
   any other that writes elapsed seconds into a tracked artifact.
5. **The wiped SVO names are still read somewhere.** S64 found 47 sites in
   one driver; P95 found the same in `reasoning-e2e-no-llm`. Before any
   driver's display is trusted: `grep -n "\.subject\|\.verb\|\.object" native/eval/the-fold/*.mjs`
   and check each hit against an edge that carries `end1/label/end2`.
   On 2026-09-05 that grep hits 14 drivers; several are legitimate
   (`e.end2 ?? e.object` fallbacks, the MHC `edgesOf` seam, `queryFillers`
   results), so each hit is read, not counted.
   `queryFillers` still returns `{subject, object}` by design; that is the
   one legitimate reader of the old names.

**Status, 2026-09-05 (Pass 15).** Items 4 and 5 closed, item 2's flag half
closed: `asserted-eval` prints its wall-clock to stderr and its doc diffs to
zero; the SVO grep was READ hit by hit — the cited-source drivers, rashomon,
copresence and the MHC battery map claims to SVO at their own seam and are
legitimate, `complicated-reading` reads the ADAPTER's triples (which still
carry `subject`), and three drivers read the wiped names off organ edges or
claim rows and were migrated at one seam each: `mine-1-official-graph`
(as it stood, every node it would write was `undefined`; its committed
export predates the wipe and was left as the dated record it is), `try-grid-on-transcript` (threw on `e.subject.toLowerCase()`),
`material-dialogue-stress` (every claim skipped as "empty subject"). The
`BOUNDED` flag came out of `lib/borodino-ledger.mjs`; the referent-aware
trim it pointed at is still capability work. Items 1 and 3 are carried to
Pass 25. POLICIES.md **P96**.

## Pass 15 — zero-call hygiene before the circuit (added 2026-09-05, CLOSED same day)

The first pass of the program that follows Pass 14 (plan of record:
`/Users/mlacy/.claude/plans/assuming-the-pass-13-joyful-ocean.md`, mirrored
in P96's own "what follows"). Green suites, the SVO sweep, the crash in the
`/corroborate` door, and the reader's frame derived rather than restated.
Measured: the-fold 1,581 tests / 3 fail → 1,588 / 0; the three names that
left the set are the two EOReader-contract tests (one real drift, one
harness regex) and the SELF/MATERIAL block test (a banner P80 retired).
eoreader7 native 619 → 619 (1 todo), organs 449 → 449. POLICIES.md **P96**.

## Pass 16 — the finish line, executable (added 2026-09-05, CLOSED same day)

`eoreader7/native/eval/the-fold/lib/product-assay.mjs` + driver + `tests/
product-assay.test.js`: twelve walls over a built corpus, ten held on the
first run, one was the fold not the circuit (`foldDerived` omitted
`restsOn` — projected now), two breach by named mechanism and are logged
not pinned: the per-source spine cannot see a negated denial (P43's own
inversion; the record is ready, the reader is not) and one shared object
token binds a fabricated draft (sub-floor `tokensShare`). The model arm ran
once (gemma2:2b, 13 calls) and fabricated a founder — the passages, not the
record, reached the mouth. POLICIES.md **P97** / S67. Handed forward to
Pass 19: the two draft-side walls.

## Pass 17 — one durable reading record (added 2026-09-05, CLOSED same day)

`record-log.js` (pure) + `record-store.js` (OPFS) + nine `syncRecords()`
sites and a boot `restoreRecords()` in app.js. Pinned: replay is
byte-identical by value, a mutated entry is not (the control fails as
built), a hole is typed. Verified live: attach → ask → reload → `record
restored: hyperlexicon 5` → attachments off → ask → the prompt carries
"From earlier reading … opened→ in 1889 (stated once so far)" and the
model answers 1889 from the record alone. POLICIES.md **P98**. Then Pass 17 (one durable record), 18 (read on arrival), 19

## Pass 18 — read when material arrives (added 2026-09-05, CLOSED same day)

`read-on-arrival.js` (`admitPassages` — holon's loop moved out verbatim and
called from there; `readOnArrival` — resumable, one passage per macrotask,
ledger of the moment; `unreadExtent`), wired into `addSource` and boot with
a per-source cursor and recipe; the turn is told what is still unread and
its ledger block says so; write-backs merge (`mergeAppendOnly`). Live: a
143 KB slice read in 31.3 s (44 passages, 698 notes), the cursor honored on
reload, the mid-read disclosure in the prompt. Two rules earned by running:
a hidden tab clamps setTimeout (yield by MessageChannel); serialize at job
time (replay's typed gap found the duplicated stretch). POLICIES.md
**P99**.

## Pass 19 — claims before prose (added 2026-09-05, CLOSED same day)

`objectSpecificity` at the reader's judge (S68; the assay's wall 6 holds
4/4); `answer-record.js` — one AnswerRecord per grounded turn, appended to
`records/answers.jsonl` and shown first in the thinking panel; the marks
painted again; the fast pass classified. `model-swap-diff.mjs` measured
bar item 5 and it breaches as first written: both small mouths add
unbacked sentences and their record-backed sets differ 3/3 — restated in
P100 (the record is model-independent; the mouth's additions are marked
and counted). Handed forward: retrieval by term hits prefers long
passages (a 3 KB War and Peace passage outranked the 174-byte source that
held the answer); the whole-book arrival read is blocked on a superlinear
reader build (bound the pool). POLICIES.md **P100**.

## Pass 20 — contest in the live circuit (added 2026-09-05, CLOSED same day, live contest not yet produced)

`crownTestimony` lands a DISAGREE/CONTRADICTED through `landContest`
(kind contest, the source's own bytes as decider, never a conviction);
`ledgerBlock` phrases a disputed note as "disputed by X — not settled"
(pinned). No live contest yet: the spine cannot read a denial as
`contradicted` (P43, assay wall 4a) and the `/corroborate` witness skipped
the denying pair at the co-presence gate. POLICIES.md **P101**.

## Pass 21 — derivation and recourse in the live circuit (added 2026-09-05, CLOSED same day)

A declarations register (fourth persisted log), `/declare`, `/derive`
(carry: true, the honest floor), `/concede` (exposure first) and
`/concede!`; the ledger block's derived tier (pinned). Live: declared
"preceded transitive", derived Rowan → Owen resting on two single-source
premises, the prompt carried it, the concession withdrew it, and it stayed
withdrawn after a reload. Handed forward: a derived sentence needs its
own ground mark (today: a material chip beside a witness ∅). POLICIES.md
**P102**.

## Pass 22 — the terminal assay, first run (added 2026-09-05, RUN, 8 of 11 held)

`eoreader7/native/eval/the-fold/results/terminal-assay-RESULTS.md`; POLICIES.md
**P103**. Not held: a live open contest (the reader reads a denial as
unbound, P43); claims identical across models (restated, P100); only
wording changing (both mouths add marked unbacked sentences). Next levers,
all on the reader: read a denial as contradicted; a derived sentence's own
ground mark; a bounded pool for the arrival read. Passes 23–25 (the
grain-leak script, the documents reconciled, the unwired ratchet) remain
open.
(claims before prose + the model-swap claim diff), 20 (contest live), 21
(derivation live), 22 (the terminal assay), 23 (the grain-leak prediction),
24 (documents reconciled), 25 (unwired ratchet). The program's exclusions
are P96's.

## Pass 22b — the cut, and negation through time (added 2026-09-05, CLOSED same day)

P104 / S69. The reader's miss from Pass 22 (a denial read as unbound) is closed by giving the denial its own cell: SEG·Figure, a cut apart from the link, contest at the door, `negationTimeline` for the reading through time. Product assay 12/12. **The user's standing instruction for everything in this family: track negation and void through time** — never a state read off the present fold; every act with its seq.

## Pass 23 — the void through time (added 2026-09-05, CLOSED same day)

P105 / S70. Built to the entry below: `declareVoid` with scope, the door's re-zero on one arrival, `rezeroVoid` for a face's own filling, `/void` + `/void!`, the fourth ledger tier, assay wall 9 (13/13), live on the real page. Residue: slot-shaped voids fill live only through the brief's filler organ.

## The null experiments — Passes 24–29 (proposed 2026-09-05, user direction: "keep building but have experiments in mind that leverage our ability to rezero, cite types of void, etc.")

Each names its measurement, the test that reads it (P94), the control built to fail (II.23), the gate and the cost. Zero-call first.

**Pass 24 — Re-zero under a stream (0 calls). CLOSED 2026-09-05 — eoreader7 S71, 4/4 claims held, both controls failed as built.** Declare N act-shaped voids BEFORE reading (questions before material), stream the corpus one passage at a time through the door, and record the cursor at which each void fills. Claims: a void fills at the first passage stating its arrangement and never on a denial; the fill cursor is order-dependent but the FINAL open set is order-invariant (prefix invariance, P99's own rule read at the void); a void over ends the corpus never states stays open with `reached: true` — a finding, not a failure to look. Control: the object-deranged corpus fills a different set; a void declared over a never-stated arrangement must stay open on every order. Driver `eval/the-fold/void-rezero-stream.mjs`, lib + test.

**Pass 25 — Every ∅ cites its void (0 calls for the record arm, model arm dated). CLOSED 2026-09-05 — P106; the model arm is Pass 28.** Today the answer surface marks "∅ no passage states this" from the witness's refusal; the mark should CITE a declared void id and its scope when one is open over the sentence's ends, and count every ∅ that cites none. Claim: after wiring, the P54 leak ("there is no mention of anything else") is countable as ∅-without-void; the model-swap diff reports it per mouth. Control: a planted ∅ with no void in scope must be counted, never absorbed.

**Pass 26 — A census of nulls through time (0 calls). CLOSED 2026-09-05 — eoreader7 S75, 4/4: a draft's null changes TYPE with the cursor (`unheard` → `bound` at the arrival); the derived-only sentence is `unbound` at the reader and derived on the record; shuffles move every cursor and no census.** On a real read (the Dracula walk, the War and Peace slice), log every typed null's lifetime — `unread_extent`, `unheard`, `beyond-reach`, `unbound`, cut, void — declared-at and closed-at cursors. Claim under test: nulls compose downward (THE-NULL-STATES law 5): when an `unread_extent` closes, the `unbound` verdicts over that extent move; when a Ground void fills, its Figure voids close with it. Control: shuffled passage order must change closing cursors, not the final census.

**Pass 27 — Settlement by arrival (0 calls; seeker arm dated). CLOSED 2026-09-05 (record arm) — eoreader7 S72, 5/5; finding: the seeker's default featurizer is blind to numeric ends; the witness-tier seeker arm is unrun.** A cut meets its link (contest open); a THIRD source arrives. Claim: `contestedSearch` with declared kinds routes the contest to the seeker and a `settleDispute` lands with its outcome and trigger; `negationTimeline` reads link → cut → contest → settled. Control: a third source that restates the link must not settle (corroboration is a label, never a gate, P89); a third source silent on the pair must leave the contest open.

**Pass 28 — The mouth's absence leak, measured (model arm). RUN 2026-09-05 — P107 / S73: one question, two mouths; the tier turned a dodge into a stated gap (gemma) and cut a fabrication 7 → 2 unbacked (llama); label morphology in `voidInScope` is the named next fix.** Across the model-swap diff, count sentences asserting absence ("no mention", "not stated", "unknown") that stand where no void is open in scope. Claim: with the void tier in the prompt the count falls; with the tier withheld (control) it does not. Cost: the diff's own two-model budget.

**Pass 29 — Re-zero as a surprise to the fold (0 calls for the gate). WIRED 2026-09-05 — P109 (`fillingsSince` → `forceRefresh` with its reason); the staleness measurement against the P34 pivot case and a random-filling control is unrun.** A void filling is REC·Ground — the ground moved. Claim: gating the summary refresh on "a void filled this turn" refreshes exactly where the P34 pivot case went stale and carries elsewhere. Control: gating on a random filling must not improve staleness. Gate: Pass 24's stream driver.


DEF·Ground, the other empty cell in THE-NULL-STATES. A void is a declared emptiness over an extent WITH scope (what was looked at: passages read, cursor, pool), an event with a cursor, re-zeroed by one arrival — another event. The three verdict strings and the badge that stand in for it today (`searchedVoid`, the witness's ∅, "no passage states this") become one object on the record with a `voidTimeline` on the shape of `negationTimeline`. Measurement: the arrival read declares the void for a question's extent before the mouth speaks; one arriving passage re-zeros it and the timeline shows both events; the control built to fail: a void with no scope is refused, and a void over an extent the reader never reached is a fact about the reader (`unread_extent`), never a void. Gate: Pass 22b. Refused-check: not a corroboration lever.

## Pass 30 — a program asked for by its shape: the piece machinery pointed at code (proposed 2026-09-05, NOT started)

The long-form organs (P108–P111) are medium-blind by construction: a plan sized by a declared number, a section told its place and obligations, one measured continuation, a model-free editor, every act on the record. Code already has the other half: the build log with its patch carriage (`build-log.js`, P16 — a delta per turn, the whole compiled at any cursor), the sandbox auto-run as EVA (`autoRunAndDisclose`, P18/P24 — the run outcome is the witness, never the model's say-so), `witness.js` (an HTML widget's declared ids vs referenced ids; regression between versions), `code-scout.js` (the region an instruction names; the ops a change amounts to), and `longform-code.mjs` (the carriage measured: a delta stack compiles the same whole at a fraction of the emission).

**The organ to build:** `detectLongForm` gains the code shape — "write me a python program that …", "build a widget that …" with a stated size (files, functions, features) or a spec list; the plan is modules/functions as parts; each part lands as a PATCH on ONE build (never a fresh fence per section — the P16 lesson); after each part the sandbox runs the whole (EVA, mechanical); a failing run marks the part and asks once with the run's own stderr as the fact (the mouth is told what happened, not what to do); obligations are the spec's own named features, coverage measured by `declaredReferents` (does the function the spec named now exist?); the editor removes duplicate declarations and unreferenced ones (`code-scout.js::deltaOps`), every edit an act; the conclusion is the run witness. Measurement: features declared vs features present and passing; the control built to fail: the regenerate arm (whole artifact per turn) and a shuffled spec. Model: qwen2.5-coder:1.5b or gemma2:2b — small only.

## Pass 31 — the section checks its own atoms against its snips, in process (LANDED 2026-09-05 — P119)

Snips above the material; atoms (numbers, dates, names) against the snips with the company rule, no model; contradiction candidate by year at the source's address; one rewrite ask per section, landed only when it clears; the witness spent flagged-first; the export's check line per section. Open: the live measurement (3-page, then 30-page) is recorded as P119's amendment; the snip grain is the sentence — a paraphrase that scatters an atom across two sentences reads as absent (the same wall as P115's binding rate); names are checked by surface only.

## Pass 32 — the thinking-depth slider (LANDED 2026-09-05 — P120) and the long-stream stress (BUILT 2026-09-05 — P121 / S77; the 1,000-turn run is the open item)

Depth: `depth.js` rungs over holon's own budgets, wired through the section's hunts, continuations, snip rewrites, witness and revision; the slider in the model menu; on the record and the export. Long-stream: `eoreader7/native/eval/the-fold/long-stream.mjs` + runbook. Open: run 1,000 turns at depth 1 (then a depth-2 arm on the same seed), score, fix what it exposes, amend P121 with the numbers.

## Composition track — Passes 26–32 (proposed 2026-09-05, NOT started)

Relayed by the user from another agent; recorded here as a named future
track, gated and refused-checked in its own words, so it is not re-derived.
It slots after Pass 25 and is a new capability (long-form composition), not
part of the Q&A/contest/derivation program. Hard prerequisites: Pass 18
(read on arrival) and Pass 19 (claims before prose).

- **26 — scope the number** (0 calls): a declared word band; the arithmetic
  against the ledger's own measured density (~2% corroboration, P83/P86;
  Dracula 11,624 single / 260 corroborated; `compose.js`'s words-per-claim)
  → how many source pages fill the band at the disclosed-standing bar.
- **27 — hierarchical outline from evidence** (0 calls): extend
  `eochat/server/longform.js::outlineFromEvidence` to two levels by
  recursion; port to eoreader7 (P69). Control: shuffled evidence must split
  differently.
- **28 — an append-only essay log, projected like code**: `build-log.js`'s
  PROPOSE/SUPERSEDE/RESULT reused for prose; `foldEssay(log, atCursor)`.
  Control: the regenerate-every-turn arm, `longform-code.mjs`'s own table.
- **29 — section drafting ported and re-measured**: eochat's
  draft/re-read/revise loop onto the current checking apparatus; FIRST
  diagnose `essay-golden.md`'s 0/1 yield before any scaling. Control: a
  no-revision arm.
- **30 — chapters fed from deep reading** (needs Pass 18): evidence pools
  drawn from the growing ledger; measure whether depth moves 26's number
  or the ~2% ceiling binds regardless.
- **31 — disclosed standing, not a gate** (P84): a section may rest on
  single-witness claims and says so, via `compose.js`'s coverage report.
- **32 — the 60-page run**, dated and budgeted: the table shape of
  `longform-code.mjs` plus the coverage report; "there" = the band reached,
  every claim addressed, every section's standing disclosed, drops named,
  cost stated, reproducible from the repos. Proves honest assembly, never
  good writing.

Refused by the track: no bigger model for 29's yield before the
diagnostic; no raising `maxSections` past 27's derived structure; no
single-witness content dressed as settled.

## Pass 15 — what the whole law says to do next (added 2026-09-05)

**How this was written.** Every standing document was read end to end
before a line of this was drafted: the-fold `POLICIES.md` P1–P92 (P1–P35
and P78–P92 in full, P35–P77 by their heads), eoreader7 `READING-SPEC.md`
S1–S65 and S74, live_priors LP1–LP15, the four reassemblies (CHAT / REASONING /
GENERATION / CAPABILITY), WHERE-WE-ARE, THE-WAYS-OF-KNOWING,
THE-CORE-MECHANISM, LEVELS, THE-THREE-MATHEMATICS, PRIOR-ART-INVENTORY,
ASSEMBLIES-AND-ARTIFACTS, WHAT-IS-BEING-BORN, `constitution.js`'s
ENFORCEMENT map, and the S74 walk this session ran. Not on disk in this
checkout and known only through their pointers: READING-POLICY, SEED, CUBE,
FOLD-CONSTITUTION and eo-constitution (dangling symlinks into the
uninitialised legacy submodule; the constitution repo is outside this
session's GitHub scope). This is a plan, not a policy: nothing here is law
until it lands with its test.

### The reading, in four sentences

The measurement law is ahead of the mechanism. Breadth is closed (27/27),
depth is measured (stage 13 on text), floors 0–4 are built to the
material's own ceiling, and the project has learned to spend nothing
without a control built to fail — with the consequence that its last five
corroboration levers were refuted BY their controls (identity folding,
bridge witnessing, every slicer, distributional company, the ends-only
proposer). What is left of floor 5 is a SELECTOR problem the law already
names (S62: null the free stage before buying the paid one; the reader's
resolved referent face is the one selector that separates, p≈0.048, where
co-presence does not, p≈0.905) and a CURRENCY problem the law already
suspects (WHERE-WE-ARE's falsifier: if cross-source corroboration cannot be
moved, it is the wrong currency for the material). And a large part of what
the next passes need is already built, tested and unconsumed — the hunt
meter, the void loop, `whatWouldSettle`, Assembly@1, `compose.js`'s
contested transition, three unwired constitution articles — which makes
PRIOR-ART-INVENTORY's own rule (S8: grep the inventory, the engine and the
attempt log before building) the first instruction of this plan, not the
last.

### What the pilot walk measured, held against the law

The walk was asked for as a test of the system's ability, and it should be
read as one. What it proved: the fold researches with the model as mouth
only (91 calls, every one an index pick, nothing it wrote in the document);
every span self-verifies against bytes (29/29); every proposition carries
its witness and its frame; the material taught the reader its own aliases
at addresses; six process defects were found by running and fixed in the
process, never in the output; and the control, on its third construction,
reached the model. What it did NOT prove: corroboration. The gate-surviving
control attested 6 of 89 (0.067 per ask) against the real arm's 6 of 74
(0.081 per ask). By II.23 the walk is measuring topic overlap on this
material, and §3.1 may not be read as "stated by more than one source" —
the document says so itself, in its own §5.

Three things bound that verdict, and they are facts about the run, not the
instrument: the material is 4–7 short pages, so every recurrence statistic
is at excerpt scale (S2 — a prefix is a different material); the three
largest local outlets are absent (403/429, and the archive replay path
answers 403 here even where the availability API reports a snapshot); and
the user's own material was never attached, so the ledger maps the public
record only. And one thing is a fact about the process: the walk spent 74
paid asks through the co-presence selector that S62 had already measured
dead (p≈0.905). The free stage was not nulled before the paid one. That is
the first thing to fix, and it costs no new organ.

### The passes, in the law's own order

The order is the canonical chain applied per claim (units → edges →
integral), the null-before-judge rule (S62), and work-done-twice-becomes-
code (P14). Each pass names its control and its P71 tag.

**15.1 — Null the selector, then read the six.** Two things, both cheap.
(a) Print WHICH six control propositions were attested —
`civic-research-walk.mjs` phase 6 holds `control.attested` with the
swapped triple and its address; print end1 / label / swapped object and
the sentence the witness pointed at. The inspection decides the reading: a
swap that happens to make a TRUE statement (the material says the subject
also did the swapped thing) is a LEAKY CONTROL, fixed by drawing the swap
pool against the ledger (exclude any object the subject is already joined
to under any label); a false statement the witness nonetheless attested is
a FOOLED MODEL at excerpt scale, and the protocol needs the referent-
resolved arm that Pass 12 step 3 already names as its content. (b) Replace
`endsCopresentWindow` as the candidate proposer with the reader's resolved
referent face — S62's one separating selector — and rerun both arms on the
same page set under the same budget. Read the wall at zero calls first
(S60): how many pairs each selector proposes and how many the door refuses
before a single ask. **Control:** the same redeal through the new selector;
success is real > control at the exact binomial (S37) on the real arm's own
asks; parity again means the selector was not the wall on this material,
and that is a result, not a failure. Cost: ~150 model calls on CPU, zero
new organs. **Generality:** universal — the rule is S62's, measured here on
a different material.

**15.2 — The walk becomes an Assembly, and its dials become regimes.** The
driver carries some twenty hand-picked constants (MAXQ 10, MAXF 16, MAXTRY
40, RESULTS 8, WALK_ASKS 40, CHASE_F 10, CHASE_S 4, MAX_END_CHARS 60,
MIN_FACE_CHARS 400, ANCHOR_MIN 2, ALIAS_MIN_USES 2, NAME_ROUNDS 4,
SHARED_SENTENCE_CHARS 40, SHARED_SENTENCES_MIN 2, PREFLIGHT_OVERLAP 0.3,
SECOND_SOURCE_OVERLAP 0.6, ARCHIVE_PROBE_LIMIT 3, SEARCH_PAUSE_MS 4000,
ALIAS_MIN_CONFIRM 0.3, ALIAS_MIN_FIRES 100). S16: every dial is a prior
awaiting the material's measurement; II.11 stands `partial` in the
ENFORCEMENT map for exactly this reason, and P90 says a reading whose
configuration is not on the record measures the instrument. Declare the
walk as `Assembly@1` (ASSEMBLIES-AND-ARTIFACTS): the cells it occupies,
each regime with its giver or basis, `stagesNotRun` named (the archive
route, the paywalled outlets, the primary chase's zero containment leads).
Then, for each GATING floor (PREFLIGHT_OVERLAP, SECOND_SOURCE_OVERLAP,
MIN_FACE_CHARS, ANCHOR_MIN, the SHARED_* pair), measure whether it MOVES —
refusals under the real floor against a redealt one — and delete any that
never fires (R17: a wall nothing can trigger is a comment). The counts
(MAXQ, MAXF, WALK_ASKS) stay, as LEASHES; the stopping rule becomes the
hunt meter (P72's `makeHuntMeter`/`huntSettled`: stop on a measured
settle, never on a count, never on a gap). **Control:** replaying the
assembly from its own record reproduces the run (LP1–LP5); a run under the
meter must stop below the leash on a converging stream and run to it on a
moving one — the metacognition-hunt test's own two cases, on this
material. **Generality:** universal for the assembly shape; every regime
VALUE is specimen-scoped until measured.

**15.3 — Work done twice becomes code.** The six defects are fixed in the
driver. P14 says the *how* becomes code the instrument calls, and P92 says
each move is resolved to its cube cell and checked against the registry
BEFORE an organ is written. Nominations — P92 decides, not this list:

- *"a page that never NAMES the subject is kept, addressable, not read"* —
  this is `clearance.js`'s own `no_presence` rung (NUL·Figure), applied to
  a page against a declared subject. Consume it; do not rewrite it.
- *"a result must carry the question's own content words before it earns a
  fetch"* (`carries`) — a floor on a search result against the question,
  the ends-must-be-present shape of `preflight` (INS·Ground) or a wall
  beside it.
- *"a refusal is never cached as an answer"* and *"the cache prevents a
  re-fetch, not a re-read"* — laws of the web organ; they land in `web.js`
  and the search cache with tests and no cell (storage discipline, LP4).
- *"the anchor floor gates SPENDING and ordering, never admission"* —
  spend ordering beside `settle` (SIG·Ground, `whatWouldSettle`).
- `MAX_END_CHARS` — a debris cut that S44's subject walls may already cover
  upstream. Measure the overlap; delete the driver's copy or move the wall
  into the extractor. Never both.
- *"a reading counts whether its evidence was found by containment or
  attested by the witness, and says which"* — this is `standingOf.kinds`
  (P84) consumed by the document renderer: kinds apart in §3, never
  summed.
- Register `organs/aliases.js` in `organs/capacities.js` (29 rows; aliases
  absent). An alias is a declared correspondence between two surfaces of
  one referent — nominated beside `cast` (SIG+INS · Entity). P92 governs.

**Control**, each: the driver's own measured cases (an aggregator's
recirculation link, an off-topic feed result for a real funding vote, a
generic encyclopedia article's off-subject propositions, the discarded
attestations) pinned as regressions,
plus one case from material the discovery never saw (P71's third leg).
**Generality:** universal for the presence rung, the cache laws and the
kinds-apart rendering; specimen-scoped for `carries`, the anchor floor and
the debris cut until replayed.

**15.4 — WITHDRAWN, superseded below.** [The original draft here proposed
declaring specific public-record document classes for a specific subject
as seed sources. Refused by direct user correction — see the amendment's
own "On 15.4" paragraph for the standing rule this became: nothing is
ever seeded; discovery, not declaration, is how the walk finds documents.
The general shape worth keeping is P84's own point, independent of any
one subject: outlets syndicate, so "stated by three pages" is one
perspective, and the currency that survives syndication is the KIND of
witness (an account, versus the document it cites) and the depth of the
chase to it — a chase the walk must run itself, never one seeded for it.]
§3 of the document then reports kinds apart: stated by an account / stated
by a document / both. **Control:** the same chase from a redealt document
set (documents about a different Metro body) must land nothing on the
Partnership's notes. **Generality:** universal for the kinds rule;
specimen-scoped seeds.

**15.5 — The user's material is the missing ground.** The run reads the
public record because nothing else was attached. The material the ask
names should enter as SOURCES with addresses, and the walk's TASK should
be DERIVED from it — the void's own NUL/SIG/SEG declaration over the
attached material (P53/P54), not the hand-written sentence the driver
carries at its line 153 — so the questions the fold asks are the
material's own. The model still only points. What changes is that the
reader has a ground to check accounts against: an account echoing the
user's own document is echo, not novel (P30's given-context index); an
account contradicting it lands CONTESTED on the record (P88/P91). Nothing
asserts wrongdoing: the ledger maps what is claimed, by whom, against
which document. Blocked on the material being supplied; nothing above it
is.

**15.6 — Three constitution articles are unwired, and the code for two of
them exists.** `constitution.js`'s ENFORCEMENT map lists III.1 (anchor —
the default view is a claim), III.4 (opposite — the strongest contrary
slice is rendered) and III.5 (prediction — the reader states expectations
before results) as `enforced: null`. III.5's shape is already live in the
void (P53/P54 declare what would satisfy BEFORE the draft) and in every
pre-registered eval (def-ground-derivation, the spatial run's five fixed
predictions); the map has not caught up — audit it and either wire the
article to `voidBriefFor` or correct the map, never leave a wired thing
listed as unwired. III.4's machinery exists and is unconsumed:
`compose.js`'s `contested` transition, `nesting.js`'s `disagreement`,
P88's CON·Figure·CONTESTED on the record. The research document should
render, per claim, the strongest contrary slice the ledger holds — for
investigative material that IS the deliverable. III.1 is the smallest and
comes last. **Control:** a ledger with a planted contradiction must render
its contrary slice; one without must render none — never a manufactured
"however". **Generality:** universal.

**15.7 — Cross-domain replay before any "universal" tag on the walk.**
P71's first leg. `eviction-overwatch` is in this session's scope and is
the natural corpus: public dockets with addresses, a different domain, the
same shape (accounts citing documents). The walk, unmodified, over that
material, with the same control. If the six rules hold there they earn
universal; if not, they are shaped to this one pilot and the plan says so. Gated on
the user — their repo, their data.

**15.8 — Housekeeping.** eoreader7 PR #80's body was stale on a fact
corrected this pass ("the redealt control spends 0 asks" → the third
control reached the model and attested at parity). This pass's own two
numbers moved repeatedly across three separate merges with concurrent,
unrelated work landing in the same repos under the same numbering
sequences — `READING-SPEC.md`'s entry from S64 through S65 to its final
**S74**, and this file's own pass from "Pass 13" through "Pass 14" to its
final **Pass 15** — each collision found only at actual merge time, never
predicted, and each resolved the same way this project's own convention
already states: the later-merging branch takes the next free number.
Every reference throughout this pass reads its final number; the
intermediate ones are not tracked here beyond this note. Both PRs stay
draft. The concurrent sessions' untracked `eval/` files stay untouched.
`organs/aliases.js`'s registration rides 15.3.

### What this plan refuses

A tenth vocabulary configuration (the MINE-1 plateau is paraphrase
tolerance, not vocabulary). Deriving an initialism (a rule that derives a
name can invent one — S74). Tuning `MIN_FACE_CHARS` or any floor so a
particular face passes (II.23; tune nothing against the answer). Reading
§3.1 as corroboration before 15.1 has been read. Building a slicer (no
slicer earns a license — S55). Handing the model any content-writing slot:
the whole test stood on the model doing very little, and it held.

### The gate on Pass 15

Clean votes per ask on the pilot material with a clean control, real >
control at the exact binomial. If 15.1's selector swap does not separate
the arms, WHERE-WE-ARE's falsifier has fired on research material too, and
15.4 is the design re-examination — not a tuning of 15.1. And the ordering
rule that produced this plan binds it: nothing in 15.2–15.7 is spent before
15.1 has been read, because every one of them is more expensive than
nulling a selector.

### Amended 2026-09-05 — the plan corrected against direction, and 15.1's ground built

Four answers from the user, same day, each changing a numbered item above.

**On saving (bears on 15.2's Assembly regimes and every future run of this
driver):** *"priors are only so the reader doesn't start fresh. but it
shouldn't be saving these test documents."* Un-saving is done: the fetched
pages and the produced reading are gitignored and were deleted from local
disk; priors (the alias-declaration prior) stay, because they are a
measured artifact of a different, permanent corpus, not this run's own
material. Any future Assembly@1 declaration of this walk's regimes (15.2)
must record ITS OWN dials, never a copy of a prior run's fetched material.

**On 15.4, directly: *"im not telling you the answer, it should discover
than [sic]."*** 15.4 as drafted above proposed declaring seed sources —
specific public-record document classes and specific real websites for
the pilot's specific subject — refused. **15.4 is withdrawn as drafted.**
The corrected form: nothing is seeded, ever; the
fold's TASK is now the only place a human names the subject (env-
overridable, `eoreader7`'s S74 amendment), and which documents answer a
question remains entirely the walk's own discovery, through the same
mechanisms (`preflightQuery`/`proofQuery` over the ledger's own thin
notes, Ranke's chase to what an account itself cites). A currency that
survives syndication (accounts vs. documents, P84's kind) is still the
right target; a hand-picked list of WHERE to find documents is not, and
this correction generalizes past this one pass — see eoreader7
READING-SPEC.md's own amendment, same day: "a reader may be told what is
being asked; it may not be told where to look."

**On where the next run happens: *"prep this and we'll run locally."***
Confirmed for both 15.1 (start now?) and the run generally — "same
answer." Nothing was executed this pass; the ground for a local run was
built instead: portable sibling-repo paths (env-overridable), a `CHECK=1`
preflight (verified against both a working and a deliberately broken
path, catching a real exit-code bug in the process), and the driver's
header comment rewritten as full run instructions.

**On 15.7 (cross-domain replay over eviction-overwatch): "no."** 15.7 is
REFUSED. No replay of this walk over eviction-overwatch will run absent a
later, separate ask. P71's cross-domain leg for this walk's rules
therefore stays unmet, and any future "universal" tag on them should say
so rather than assume it.

**15.1's ground, built rather than run.** `corroboration.js::facesReachable`
(the referent-face selector) and `corroborateLedger`'s `reachable` override
are real, tested, and wired behind `SELECTOR=referent-face`; every attested
control proposition now prints with a mechanical leaky-swap check against
the real ledger. Neither arm was re-run — that happens on the user's
machine, against their own material, next.

**15.3's registration item, done in the same pass:** `aliases.js` was
never actually unregistered from a cell registry — `capacities.js` moved
to `eoreader7/native/organs/` (Phase 2 of the organ migration) before this
plan was written, and the-fold's own copy is now a one-line shim. The
registration question (does `aliases.js` earn a row in the real registry,
and under which cell) is real and still open, but it is eoreader7's
registry to extend, not the-fold's — corrected here so the next pass does
not look for a file that moved.

Everything else in Pass 15 (15.2's Assembly framing, 15.3's other five
rule-nominations, 15.5's material-as-ground, 15.6's constitution articles,
15.8) stands as written, unstarted, gated on the same order: nothing
after 15.1 until 15.1's real run is read.
