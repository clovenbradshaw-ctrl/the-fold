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
(claims before prose + the model-swap claim diff), 20 (contest live), 21
(derivation live), 22 (the terminal assay), 23 (the grain-leak prediction),
24 (documents reconciled), 25 (unwired ratchet). The program's exclusions
are P96's.

