# The reading workbench — what the engine actually has, corrected

**Status:** Increments A, B and C landed and verified live (POLICIES.md P40,
P41, P42). D's mechanism confirmed real via `eoreader7`, not yet wired into
a UI margin. E and F unscoped. SUPERSEDES its own first version (below the
fold) · **Governs:** the five engine organs the reading-workbench spec's
increments D, E and F consume, plus B/C's own UI wiring

---

## Second erratum, same day, later — the "blocker" was read wrong too

Two things below are now stale and are corrected here rather than edited
in place, so the record shows what was actually found and in what order.

**1. Increment A is landed, not merely proposed.** The first erratum below
says "Increment A's gate still has nothing to run against" and lists
`eoreader-contract.json`/`eoreader-contract.test.mjs` as not existing
anywhere. Both now exist, at the repo root of this checkout, declaring all
five organs against their real `../eoreader7` paths, with the gate
hand-verified (export stripped from a real file, test confirmed to fail
naming the broken organ, file restored, `git diff` clean). POLICIES.md P40
is the full record.

**2. `deriveIdentityRevision` was NOT the blocker the first pass called it.**
The section below ("§5, the real blocker") argued this organ has "nothing
to derive its central quantity from" because `revision.js` (the
**eoreader6.1** file it was reading) carries no positional field. That
reasoning does not transfer to eoreader7's real `identity.js` — a
different file, doing a different (and better-fitted) thing.

Read in full: `deriveIdentityRevision` is not about textual position at
all. It is about REFERENTIAL identity — whether two forms ("Andrew",
"Prince Andrew") corefer — evidenced by `supports`/`attacks`, gated by
`canonicalizationFloor`, and it emits a `REC` operation per re-canonicalized
edge whose `consequence` carries `from: before?.participants ?? null` and
`to: next.participants` (`identity.js:97`) — a genuine, structured
before/after pair, on every rewrite, for free.

The "distance between the position it landed and the position it re-made"
the spec's margin wants is computed one layer up, already built, already
run: `understanding-scoreboard.mjs:142-144` parses the REC's
`consequence.sourceEdge` (shaped `edge:text:{sequencePosition}:{index}`,
the source edge's own address) and computes `reach: pos - srcPos` — encounter
position now, minus the encounter position of the edge being re-made. Fed
through `reachSummary` (`understanding-scoreboard.mjs:208-218`), this
produces `{n, median, max, min}` — and the repo's own committed
`native/eval/results/understanding-scoreboard-RESULTS.md:212-213` states,
on real ordered Frankenstein: **"a median of 749 sentences back (min 82,
max 2,046)"** — the exact numbers the workbench spec cites for D's gate.
This is not a coincidence and not a fabrication check needed on my part —
it is the eoreader7 team's own already-measured, already-committed result,
read directly rather than assumed.

**What this means for the estimate.** Increment D is not "the blocker." It
is the one increment with the strongest existing evidence behind it — a
real function, a real downstream consumer that computes exactly the
quantity the spec's prose describes, and a committed reproduction on a
real novel matching the spec's cited numbers digit-for-digit. The open
work for D is adapting `understanding-scoreboard.mjs`'s scoring logic (a
node/eval script) into something a UI margin can render live per-source,
plus deciding the deferred question the spec itself already names
(persistent gutter vs. opens-on-demand) — not inventing a coordinate space
that does not exist. That was the real gap in the first pass's reasoning:
it read the wrong file's positional story and concluded the concept was
missing, when it was present, just addressed differently (via the edge's
own source address, not a bolt-on coordinate).

No Frankenstein text fixture is committed to this checkout (Gutenberg texts
are gitignored here the same way the-fold's own `goldens/*/texts/` are), so
this pass verified the CODE PATH (read `identity.js` and
`understanding-scoreboard.mjs` in full, confirmed the reach computation is
real and wired) and cross-checked the ALREADY-COMMITTED result rather than
re-running the ~2-minute full read itself. Re-running it live against a
fetched copy of Frankenstein is the natural verification step for whoever
picks up D, not done here.

---

## Erratum, dated same day (superseded in part by the section above)

The first version of this document (kept below, struck through in spirit
though not in markup, for the record) concluded `eoreader7` does not exist and
that the five organs the spec names would need one to three weeks of new
engine work. **That conclusion was wrong**, and it was wrong for a specific,
nameable reason: it checked local disk under `~/Documents` and stopped there.
`eoreader7` is a real, actively developed GitHub repository
(`clovenbradshaw-ctrl/eoreader7`, created 2026-08-23, pushed as recently as
~2 hours before this correction, 24 PRs in two days) that simply was not
cloned onto this machine at the time of the first pass. A peer session working
concurrently in a sibling repo (`commoncite`) had already cloned and vendored
it, ran a real import through it, and said so. Verified directly here after
that correction landed: cloned to `/Users/mlacy/Documents/3.0/eoreader7`,
confirmed via `gh repo view`.

**What's actually there.** `native/kernel/` is a real, native recursive-reading
kernel with no implementation dependency on eoreader6.1 (the repo's own
README says this in as many words). It exports, as real functions with real
tests:

| spec name | real export | file |
|---|---|---|
| `deriveIdentityRevision` | `deriveIdentityRevision({fold, supports, attacks, witness, giver, canonicalizationFloor})` | `native/kernel/identity.js:111` |
| `deriveSurprise` | `deriveSurprise(delta)` | `native/kernel/dynamics.js:3` |
| `expectation` / `expectationTransition` | both, verbatim | `native/kernel/expectations.js:5,11` |
| `projectTerrainState` | `projectTerrainState(fold, {ids})` | `native/kernel/terrain-state.js:139` |
| `hypergraphAt` | not that literal name, but the real thing: `graphEdgesAtSequence(graph, sequencePosition)` and `hyperlexiconAt(hypergraph, {given})` | `native/kernel/hypergraph.js:145`, `native/kernel/hypergraph-projection.js:125` |

`understanding-scoreboard.mjs` (`native/eval/understanding-scoreboard.mjs`)
and `omnimodal-kernel.test.js` (`native/tests/omnimodal-kernel.test.js`) both
exist too — the first version's claim that increment D's gate "has no
referee" is false; the referee exists and runs. `node --test
native/tests/*.test.js` here: 114/118 passing (4 unrelated failures —
`construction`, `hypergraph`, `morphology-vocab`, `network-standing` — none of
them touch identity-revision or omnimodal-kernel, both of which pass clean).

**What's still true from the first pass, narrowed to its correct scope.**
`eoreader-contract.json` and `eoreader-contract.test.mjs` genuinely do not
exist anywhere — not in eoreader7, not in the-fold, not in eoreader6.1.
Increment A's gate still has nothing to run against. And the README itself
says the important thing about scope: **"The Fold is the reference
compatibility application: it currently consumes EOReader 7 through the
frozen legacy path contract while new v7 work targets `kernel.js`."** That is
the repo's own account of the-fold's relationship to it — meaning this repo
is EXPECTED to consume the new kernel, is not doing so yet, and nothing in
this tree currently imports from `native/kernel/` at all. So "not mounted in
the-fold" (the first version's actual, narrower claim, before it overgeneralized
to "does not exist anywhere") holds up. The overgeneralization is the part
that was wrong, and it was wrong in a way that materially changes the
estimate below.

**What this means for the estimate.** The five organs are not a build. They
are an **integration**: vendor or submodule eoreader7 into the-fold (the repo
ships a `legacy-eoreader6.1` submodule specifically for compat during this
exact migration), write the actually-missing contract file and its test
against the real checkout now sitting on disk, and re-point the-fold's engine
imports from `eoreader6.1/packages/...` paths to `eoreader7/kernel.js`. That
is days, not weeks — Increment A's gate can be written and run today. The
open design question the first pass raised for `deriveIdentityRevision` — what
coordinate space does "position" live in — is still open and still worth
settling before increment D renders anything, but it is now a question to ask
of a real, running function's real parameters (`fold`, `supports`, `attacks`,
`canonicalizationFloor`) rather than a question with nothing to attach to.

**Process note, for whoever reads this next.** The correction came from a
peer session, unprompted, mid-task, citing a `gh repo view` timestamp against
this document's own claim. It was verified independently before this erratum
was written — cloned, inspected, tests run — rather than taken on the peer's
word. That verification step is the only reason this correction is safe to
act on; a claim this load-bearing (it changes a 1–3-week estimate to a
few-days one) earns a second check even from a trusted source.

---

*The original document follows, unedited except for this note. Read it for
the still-accurate parts (increment A's contract gate, the multi-session
ownership disclosure, the `sessionTerrains`/`asOf` detail on the eoreader6.1
side, which remains true of that repo regardless of v7's existence) and treat
every "does not exist" claim about eoreader7 itself as superseded above.*

---

## The correction this opens with

The spec's header reads **"Engine: eoreader7 (already mounted;
`eoreader-contract.json`)"**. Checked against disk, on the paths this repo
actually uses:

| the spec claims | what is on disk |
|---|---|
| `eoreader7` | ~~does not exist anywhere under `~/Documents`~~ **exists on GitHub, now cloned to `/Users/mlacy/Documents/3.0/eoreader7` — see erratum above** |
| `eoreader-contract.json` | no such file, in any repo — still true |
| `eoreader-contract.test.mjs` | no such file, in any repo — still true |
| `understanding-scoreboard.mjs` | ~~no such file — increment D's own gate has no referee~~ **exists at `eoreader7/native/eval/understanding-scoreboard.mjs` — see erratum above** |
| `omnimodal-kernel.test.js` | ~~no such file — the medium-blindness claim is unproven~~ **exists at `eoreader7/native/tests/omnimodal-kernel.test.js`, passes clean — see erratum above** |
| `binding.js`'s `WITNESS_FLOOR` | `binding.js` is real (`eoreader6.1/packages/engine/emergence/binding.js`); the constant is not in it. `WITNESS_FLOOR = 2` lives **here**, in [`asserted.js:117`](asserted.js:117) |

`.claude/worktrees/eoreader6.1` is a symlink to `/Users/mlacy/Documents/3.0/eoreader6.1`
— a genuine, distinct engine repo, and genuinely a 6.1, not a v7 under another name.
**This remains true and is not affected by the erratum: eoreader6.1 and
eoreader7 are two different, real repos, and the-fold currently imports from
the former, not the latter.**

**Increment A as written is now buildable**, not blocked — the checkout the
erratum names is real and on disk. What is still missing is only the contract
file itself.

---

## The five organs, re-scoped against real code (eoreader6.1 read, superseded by eoreader7 where noted)

*Everything below this line reflects the first pass's reading of
`eoreader6.1`, before eoreader7 was known to exist. It is kept for its detail
on `eoreader6.1`'s own organs (still accurate about that repo) but no longer
governs the estimate — see the erratum. A second pass reading eoreader7's
`native/kernel/` directly, rather than reasoning from its eoreader6.1
predecessor, is the next real step and is not done here.*

A first estimate ranked these by apparent difficulty and got the order **nearly
backwards**. The corrected ranking, each line carrying the file and line that
settles it:

| organ | nearest real thing | gap |
|---|---|---|
| `deriveSurprise` | already built, and already consumed twice in this repo | **none** |
| `hypergraphAt` | `asOf` + the stages array, both real | **small** |
| `expectation` / `expectationTransition` | a tier already IS the state object | **medium** |
| `projectTerrainState` | `sessionTerrains`, 268 lines, cache-stateful | **medium–large** |
| `deriveIdentityRevision` | `revision.js` measures the wrong axis | **the blocker** |

### 1. `deriveSurprise` — already built, twice, under other names

`emergence/surprise.js` is byte-identical across both engine repos (same
`shasum`). Its exports return bare magnitudes, not placements:
`shannonSurprisal` returns a number of bits, `bayesianSurprise` returns KL bits,
`priorContinuationNull` returns a sorted array of null draws.

The `rank` / `censored` / `bits` shape the spec's surfaces want is produced one
level up, by `placeAgainstContinuation` in `emergence/tiers.js:171-216`, which
returns `{censored, support, censoredAt, reZero, passed}` or
`{rank, support, aperture, passed}`.

**And this repo already reads exactly that, in two live files.** Both
[`aperture.js:210`](aperture.js:210) and [`reflex.js:285`](reflex.js:285) take
`t0.surprise` off a `foldThrough` result and rename it `bits`, passing `rank`
and `censored` through untouched.

So `deriveSurprise` is not an organ to build. It is a name for something with
two working consumers in this repo today. Building it as a new export would be
a third copy of a two-copy mechanism — the drift class this repo's own
postmortems have already caught twice (`Array.find` in the DEF/EVA match,
`String.includes` in `synthesize`'s relation check). **Recommendation: delete it
from the spec and cite `foldThrough` directly.**

*(Erratum note: eoreader7's own `deriveSurprise` at `native/kernel/dynamics.js:3`
is a real, differently-shaped export — `deriveSurprise(delta)`, operating on a
DeltaFold rather than a tier. Whether the-fold should keep citing
`foldThrough` or migrate to the v7 kernel's own `deriveSurprise` is exactly
the kind of question the contract file (increment A) should settle, not this
document.)*

### 2. `hypergraphAt` — compose two organs that already exist

The first estimate called this the heaviest lift, on the grounds that nothing
supports "the graph as of tick T." That is wrong on both halves.

**The as-of query is real, and constitutionally argued.**
`eoreader6.1/event_log/index.js:64`:

```js
export const asOf = (log, cursor) => { … log.events.filter((e) => e.tick < cursor) }
```

Its header cites `CONSTITUTION.md` II.17 and refuses to default the cursor —
"as of this cursor" and "as of whenever this happened to run" are different
claims. The comparison is half-open (`<`, not `<=`) on purpose, so
`asOf(log, log.tick)` stays stable even if the caller appends afterward. That
reasoning is already paid for; it must not be re-derived or loosened.

**The staged snapshots are real too.** `sessionTerrains` already admits the
belief graph in stages and snapshots each one —
`eoreader6.1/packages/host/terrains.js:324-334`, the local `snap()` closure,
pushing `{label, upTo, of, tick: graph.tick, nodes, edges, nodeCount, edgeCount}`.
`GRAPH_STAGES = 12` plus one stage per binding organ. Each stage is a full copy
(capped at `GRAPH_LIMIT = 240` nodes and the 240 strongest edges), and the
array is cached on the session at `terrains.js:316`. The header at
`terrains.js:310-314` says outright this exists "so a reader can scrub
belief-as-of-a-point-in-the-read," and `explore/explore.js` already scrubs it.

So `hypergraphAt` is a query over an existing indexed sequence, mirroring an
existing cursor discipline. **Small.** The one real design question is which
clock the cursor names — `graph.tick` and `event_log`'s tick are two different
counters and must not be silently conflated.

*(Erratum note: eoreader7 has its own real answer to this question directly —
`graphEdgesAtSequence(graph, sequencePosition)` at `native/kernel/hypergraph.js:145`
and `hyperlexiconAt(hypergraph, {given})` at `native/kernel/hypergraph-projection.js:125`
— which may make this whole composition moot rather than merely small.)*

### 3. `expectation` / `expectationTransition` — the state exists; the API is imperative

A tier already is the thing the spec is asking for. `createTier`
(`tiers.js:126-153`) returns
`{name, window, draws, seed, gamma, prior: Map, total, novelMass, seenMass, shiftRecords, shifts, novelRate, observations}`
— a decaying prior, a novelty estimator, and a witnessed shift ledger, which is
an expectation in everything but name. `gammaFor(window) = 1 - 1/window` sits at
`tiers.js:120`.

What does not exist is the transition shape. **`foldThrough` does not return a
new tier — `observe` (`tiers.js:222`) mutates in place**, writing `novelMass`,
`seenMass`, decaying every `prior` entry and `total`, incrementing
`observations`, pushing to `shiftRecords`. It returns only the measurement.

Converting `(tier, arrival) → mutation` into `(state, arrival) → newState` is a
real change with real consumers — `aperture.js` and `reflex.js` both depend on
the current mutating semantics, and `aperture.js`'s refresh gate and startle
regime are measured, tested behaviour that a state-shape change would put at
risk. **Medium, and it should not be attempted while the summary-refresh gate is
the thing keeping S1 honest.**

*(Erratum note: eoreader7 already ships an explicit transition function,
verbatim — `expectationTransition(current, state, {witness, consequence,
grain, reframes})` at `native/kernel/expectations.js:11`. If this is adopted,
the medium-effort mutation-to-transition conversion described above may not
need to happen in eoreader6.1 at all — it already happened, upstream, in v7.)*

### 4. `projectTerrainState` — statefulness exists, but as a cache, not a projection

`sessionTerrains` (`terrains.js:225`, spanning ~268 lines to L492) takes
`(session, {sourceId, emit})` and returns nine named surfaces:
`{Void, Entity, Kind, Field, Link, Network, Atmosphere, Lens, Paradigm}`, or a
typed `{gap: {reason: "unknown_source"}}`.

Three facts shape the work:

- **`emit` is a plain synchronous callback**, not a generator and not events —
  `terrains.js:227`. The whole function is synchronous, so a streaming host has
  to yield to the event loop itself.
- **It already carries session state**: `session._terrainsGraphAdmitted` (L315)
  and `session._terrainsGraphStages` (L316/L427). This is deliberate —
  re-admitting would double-count belief, since `admitGraph` advances it on
  every call. But it is a *cache keyed by sourceId*, not a projection anyone can
  ask "given prior state plus new evidence, what is next."
- **Two of the nine surfaces are already declared absent**, and this must not be
  papered over: `Kind` always returns `{silence: "not-computed", schedule: "sessionKinds"}`
  (L472) and `Lens` is always a `not-present` gap (L444). This repo's own
  CLAUDE.md already binds that: "a reading with no lens on a terrain omits it,
  and that omission must stay visible."

**Medium–large**, and the largest part is not the projection — it is deciding
what a "next state" means for nine surfaces whose costs differ by four orders of
magnitude (Field in milliseconds, the cast at ~90s on 3.3MB of Tolstoy).

*(Erratum note: eoreader7 has a real, differently-designed
`projectTerrainState(fold, {ids})` at `native/kernel/terrain-state.js:139`,
operating on a Fold rather than a session — likely NOT cache-stateful the way
`sessionTerrains` is, since v7's whole design (per its README) is a pure
`Fold → DeltaFold → revised Fold` cycle. This paragraph's estimate may not
transfer at all; it needs its own read of `terrain-state.js`, not done here.)*

### 5. `deriveIdentityRevision` — the real blocker

This is increment D, the increment the spec itself says "has to be right — it is
the claim the whole product rests on."

`eoreader6.1/packages/engine/emergence/revision.js` is the canonical copy (463
lines, vs eoreader6's 455; same export set). It genuinely measures revision:
`snapshot(graph)` returns a structural copy, `revise` produces a record carrying
`arrival`, `triples`, `operator_changes`, `counts`, `vector`, `REC`,
`breadth {nodesMoved, nodesHeld, edgesTouched, edgesHeld}`, `depth`,
`standpoints`, `refused`, `durability`, `productivity`, `nullDraws`,
`committed`. `MEASURED` is the operator key-list driving three loops inside
`revise`; REC is excluded on purpose, returned by `decompose` as a
`gap("wrong_grain")` pointing at tiers.js.

**But the spec's headline requirement is positional, and revision.js carries no
position.** The margin must show, per revision, "the position it landed, the
position it re-made, and the distance between them." The `revise` record has no
seq, no index, no span, no tick. The only ordinal anywhere in the file is
`graph.tick` — the graph's own clock, not the revision's — copied by `snapshot`
at L108 and incremented by `applyTo` at L136.

So `deriveIdentityRevision` is the one organ on this list with **nothing to
derive its central quantity from**. It is not a composition of existing parts
and not a rename; it needs new positional plumbing threaded from admission
through revision, and that plumbing has to answer a question nobody has settled
yet: *position in what coordinate space* — byte offset in the source, sentence
index, arrival ordinal, or graph tick. This repo already keeps `b0/b1` and
`c0/c1` rigorously apart by name for exactly this reason; a fourth coordinate
space entering through the margin must be named before it is built, not after.

**This section is the one most overturned, and now closed — see the "Second
erratum" section at the top of this document.** eoreader7 ships a REAL,
TESTED `deriveIdentityRevision({fold, supports, attacks, witness, giver,
canonicalizationFloor})` at `native/kernel/identity.js:111`, and it DOES
carry the positional semantics this section worried were missing — just not
as a coordinate bolted onto the revision record. Each re-canonicalization's
`REC` operation names the source edge it rewrites
(`consequence.sourceEdge`, shaped `edge:text:{sequencePosition}:{index}`);
`understanding-scoreboard.mjs` reads that address back out and computes
`reach: pos - srcPos` — exactly "the distance between the position it
landed and the position it re-made." The repo's own committed result
(`native/eval/results/understanding-scoreboard-RESULTS.md:212-213`)
reproduces the spec's own cited numbers on real Frankenstein: median 749,
min 82, max 2,046. No new coordinate space needs naming; the one that
exists (the edge's own sequence position) is the right one and is already
in use. Everything past this point in the document (build order, honest
estimate) still reflects the pre-correction reasoning — read the "Second
erratum" section at the top for what actually replaces it.

---

## What this means for the spec's build order (SUPERSEDED — see erratum)

*The section below assumed weeks of new engine work across the board. With
eoreader7 real and its organs largely already built, this ordering is
obsolete. It is kept only so the reasoning that produced it is visible, not
because it should be followed.*

The spec's own order is `A → B → C → D → E → F`, with "do not start E until D's
gate reproduces the separation." That order is sound. The problem is that **D is
gated on the one organ with no foundation, and its gate has no referee** — the
`understanding-scoreboard.mjs` it is supposed to reproduce does not exist.

~~A build order that reflects what is actually there:~~

```
0  name the coordinate space for "position"     ← design, not code; blocks D entirely
1  hypergraphAt        ← small; asOf's discipline over terrains.js's stages
2  the D referee       ← build the scoreboard BEFORE the organ it is meant to judge
3  deriveIdentityRevision  ← the real work, once 0 and 2 exist
4  projectTerrainState ← independent of the above; can run in parallel
5  expectationTransition   ← last, and not while aperture.js's gate is load-bearing
```

**The real next step, replacing all of the above:** read `native/kernel/identity.js`,
`native/kernel/terrain-state.js`, and `native/eval/understanding-scoreboard.mjs`
directly and confirm what they actually compute, against the spec's own text,
before writing any new the-fold code. Then write the one thing that genuinely
does not exist yet — `eoreader-contract.json` and its test — against the real
checkout now on disk.

---

## The honest estimate (SUPERSEDED twice — see both erratum sections at top)

~~**Not a few days.** One to three weeks of engine work~~ ~~**This estimate is
retracted.** ... plus one open research question (whether `identity.js`'s
real revision record actually carries the positional semantics increment D
needs) — a matter of days, pending that one unread file.~~

**Current estimate, as of the second erratum:** Increment A is DONE (contract
+ test, landed and passing). Increment D's core mechanism is real, tested,
and already reproduces the spec's own cited numbers on a real novel — the
open research question is answered, and the answer is favorable. What
remains for D is adapting a node/eval script's scoring logic into a
live-rendering UI margin, plus the spec's own already-named deferred
decision (persistent gutter vs. opens-on-demand). B and C are unstarted and
blocked on coordination with the fold-architecture session (they touch
`app.js`/`index.html`), not on anything engine-side. E and F are unscoped —
see below.

---

## Disclosed, so it is not re-derived

- **A concurrent session is live in this tree.** `serve.mjs` is modified and
  uncommitted as of this writing; confirmed via a peer session (`3-0-c8`) not
  to be theirs either — its owner is still unidentified. CLAUDE.md reserves
  `app.js`'s interior, `holon.js` and `constitution.js` for the fold-architecture
  session; increment C's header touches app.js and must be coordinated, not
  landed unilaterally. A second peer (`3-0-c8`) has confirmed it is not working
  in the-fold at all this session (it was in `Eviction-Overwatch`) and has no
  claim on any of those files.
- **`sessionTerrains` is identical between the two engine repos** except for
  three `const` → `export const` promotions in 6.1 (`CHUNK_WORDS`,
  `ATMOSPHERE_REGIME`, `mulberry`). Cite 6.1 — but see the erratum: this whole
  comparison may be moot if the-fold migrates to eoreader7's kernel instead.
- **This plan measured nothing itself, on the eoreader6.1 side.** Every number
  in the superseded sections is a line count, a file path, or a constant read
  off disk. No claim about what the organs would *score* is made, because none
  was run. **The eoreader7 side is different: `node --test native/tests/*.test.js`
  was actually run, live, against the real cloned checkout — 114/118 passing,
  4 unrelated failures named above.**
- **Increments E and F were not re-scoped**, on either engine version. E
  (refusals, ceiling, clock) and F (asking returns a reading) rest on stored
  reports and existing citation machinery rather than on these five organs,
  and deserve their own pass.
- **A third repo, `commoncite`, exists** at `/Users/mlacy/Documents/3.0/commoncite`,
  built by a different peer session this same day, with its own vendored copy
  of eoreader7 and a working end-to-end import already run through it. Its
  root `package.json` briefly read `"name": "eoreader6"` (stale from
  vendoring) — flagged independently by two peer sessions and fixed same-day,
  commit `587631a`; it now correctly reads `"name": "eoreader7"`, so a
  name-based grep will find it fine. (`legacy-eoreader6.1/package.json`
  underneath it is untouched and correctly still says `eoreader6` — that one
  is a faithful copy of the real upstream submodule, not a mislabel.) Worth
  reading before vendoring eoreader7 a second, independent way into the-fold.
