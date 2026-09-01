# Metacognition — integration note for the app.js/holon.js session

2026-08-31, amended same day. `metacognition.js` shipped as a real,
tested, standalone organ, and — by direct user instruction ("wire it in
if you believe it works") — the core observation is now WIRED into the
live turn. What follows is split into what is done and what is still
open; the note is kept rather than retired because real decisions remain.

**Now live in `app.js`.** `holonicTurn`'s own turn-ending sequence (the
same function both `twoPassTurn`'s S2-gated call and every other caller
run through) calls `assessAgreement`/`observe` directly, gated on
`opts.priorPass` — the identical "a caller with no S1 pass simply never
calls it" convention `priorPassFor` already established, so this fires
ONLY on the S1/S2 turns this organ exists to watch, never on a plain
`/task`, `/bound`, or the preflight-first non-trivial-question branch
(which never sets `priorPass`). It reads `result.sections[].passages` and
`result.sections[].relations.claims` — BOTH already computed by this
point in the function (the identical fields `relationClaims` and
`state.lastMaterialChars` were already reading, confirmed by direct
inspection before wiring, not assumed) — so nothing needed threading
through `holon.js` at all; the integration note's own original "where S2's
passages come from" question turned out to already be answered on the
existing return shape. `metaLedger = makeMetacognition(nativeTaskLog)` is
constructed once, alongside `buildLog`/`store`/`grid` (the same
`make*(nativeTaskLog)` pattern, same file, same lines); `state.metaLedger`
holds the live ledger, app-wide and unpersisted, the identical posture
`state.gridLog`/`state.hyperlexiconLog` already state and for the
identical reason.

**The cell taxonomy decision, made and disclosed.** Everything currently
observes onto ONE cell, `"s1-draft"` — a single, global running estimate
of "how much should this instrument trust S1's unchecked draft, in
general." This is a deliberate, disclosed STARTING choice, not an
oversight: a finer taxonomy (per relation verb, per grid cell) needs
grouping `assessAgreement`'s per-atom verdicts by whatever the finer axis
is, which the module does not do today (it returns one summed `counts`
object per call) — real, unattempted, and not worth guessing at before
real turns produce data to judge it against, the same restraint P58/P64's
own "an empty cell is a lead, never a verdict" already argues for.

**Verified, and the one thing that could not be.** `node --check app.js`
passes; `node --test *.test.mjs` still reports the exact same 125
pre-existing failures by name, zero regressions. `serve.mjs` (started with
`THE_FOLD_NO_OPEN=1`, no other flags) served `/app.js` and
`/metacognition.js` both 200, confirming the new import resolves on disk.
What could NOT be verified: a real browser loading the page end to end.
This checkout's `/engine/emergence/tiers.js` (the legacy `nul`/tiers.js
statistics subsystem `reflexMeter`/`apertureMeter` both still depend on,
per this file's own disclosed P69 holdout) 404s — an environment gap that
predates this change and is unrelated to it (confirmed: the same route
404s with or without this edit), but it means the WHOLE module graph
fails to link in a real browser here regardless, and there is no way in
this environment to isolate "does my own new import chain work" from that
pre-existing failure. Every line this pass added was instead verified by
direct inspection against ALREADY-LIVE, adjacent code in the exact same
function (`result.sections[].passages`, `.relations.claims`, `opts.priorPass`
are all read the identical way one to a few lines above the new code,
confirmed by reading them before writing anything, not assumed) and by
the fact that `assessAgreement`/`makeMetacognition(nativeTaskLog).observe`
are the SAME calls, same shapes, `metacognition.test.mjs` already
exercises against the real native task-log module. A real live-browser
confirmation is still the honest gap — named here rather than implied
closed.

Original framing, kept below for what is still genuinely open:

## What exists now (metacognition.js — done, tested, yours to consume)

`assessAgreement(s1Text, {question, s2Passages, relationEdges})` — the
per-turn classifier. Runs `extractCheckableAtoms` (grounding.js, already
imported by `needsSystem2` at the exact call site named below) on S1's own
draft, grades each atom CONFIRMED / CORRECTED / UNRESOLVED against
`s2Passages` (via `checkGrounding`, pure) and, if you hand it `S2`'s own
already-read relation edges, against the real `bound`/`contradicted`/
`unbound`/`beyond-reach`/`unheard` vocabulary — CORRECTED only ever fires
on `contradicted`, never on a bare containment miss (see this file's own
header for why that line matters). Returns `{atoms, extended, counts,
examined}`; `counts` is exactly the shape `observe` below wants.

`makeMetacognition(taskLog)` — the ledger factory, taking the SAME native
`kernel/task-log.js` bundle `grid.js`/`hyperlexicon.js` already take
injected. `observe(log, {cell, delta})` sums a turn's counts onto a
caller-declared `cell` string (append-only, structural no-op on an
all-zero delta — silence never moves a standing). `standingOf(log, cell)`
reads it back as one of three typed, never-finer-than-the-counts
standings: `unproven` (below `WITNESS_FLOOR`, reused from `asserted.js`),
`established` (at/above the floor, zero corrections), `contested` (at/above
the floor, at least one). `concede(log, cell, {trigger})` lands an
EVIDENCE·REC record of a standing being explicitly revised, mirroring
`grid.js::concedeEvaluation` field for field.

```js
import { assessAgreement, makeMetacognition, surfWeight, forcesFoldRefresh } from "./metacognition.js";
import * as nativeTaskLog from "../eoreader7/native/kernel/task-log.js"; // see caveat below

const meta = makeMetacognition(nativeTaskLog);
// state.metaLedger, alongside state.gridLog / state.hyperlexiconLog — the
// SAME "belongs to the instrument, not one conversation" reasoning those
// two already state (CLAUDE.md, "The chat's own /act door").
```

## Where the trigger sits (RESOLVED — now live, described above)

`twoPassTurn`'s own S2-gated call passes `priorPass: s1Text` into
`holonicTurn`; `holonicTurn`'s turn-ending sequence reads `opts.priorPass`
straight back and, when present, calls `assessAgreement`/`observe` using
`result.sections[].passages` and `result.sections[].relations.claims` —
BOTH already on the return, contrary to this note's own first-draft guess
below that passages were not threaded through. Kept in place as the
record of what was checked and found, not corrected in place.

~~`assessAgreement`'s own `relationEdges` parameter wants raw edges... not
currently threaded onto `holonicTurn`'s return~~ — WRONG, see above:
`result.sections[].passages` was there all along, `state.lastMaterialChars`
was already reading it the same way two lines above where the new code
now sits.

## What a call site needs to decide (updated — two resolved, two open)

1. ~~Where S2's passages come from~~ — **RESOLVED**, see above.
2. **Which cell a claim lands on.** Wired at the coarsest possible
   answer — one global cell, `"s1-draft"` — disclosed as a deliberate
   starting choice, not a final one. A finer taxonomy (per relation verb,
   per grid cell) needs `assessAgreement` (or its caller) to group
   per-atom verdicts rather than return one summed total, which is real,
   unattempted work — not worth guessing at before real turns produce
   data to judge a finer split against.
3. ~~Whether this runs only in checking mode~~ — **RESOLVED, and it falls
   out for free exactly as guessed**: retrieval populates
   `result.sections[].passages` regardless of `state.grounded`, so
   `s2Passages` is always real; `relationEdges` is only ever non-empty
   when a `relations` organ was injected, which today only happens under
   checking mode. With checking off, `assessAgreement` still reads
   CONFIRMED/UNRESOLVED off containment alone and simply never reads
   CORRECTED (no edges to contradict against) — a graceful, honest
   degradation, never a wrong finding manufactured from a check that did
   not run.
4. **`surfWeight` — WIRED (flow #2, second amendment, "do it").**
   `escalationFor` (metacognition.js) is its one live consumer:
   `holonicTurn` reads the `"s1-draft"` standing once per S1/S2 turn
   (gated on `opts.priorPass`, the same gate `observe` uses) and, on
   `contested`, ceil-widens the three declared budgets — preflight pages
   3 → 5 (`gatherPreflightMaterial`'s new optional `pagesConsulted`),
   passages per part 3 → 5, correction passes 1 → 2 — always computed
   from the exported constants so it cannot compound, always landing an
   `escalated` act on the reflex ledger. "Widen WHAT" is thereby
   answered: the three budgets that were already parameters. What is
   STILL not proven: that the widening helps — the correction rate's
   response to escalation is the measured leg that needs live turns.
   **`forcesFoldRefresh` — STILL OPEN**, for the reason already stated:
   `refreshSummary` fires from a different point in the turn-ending
   sequence than the assessment, and threading a signal across that gap
   was not traced closely enough to risk.

## Residues, so you can say them rather than rediscover them

- ~~The engine bundle to inject is `eoreader7/native/kernel/task-log.js`,
  not the legacy provider~~ — **RESOLVED**: `app.js` was already on
  `nativeTaskLog` (imported from `/engine-v7/kernel/task-log.js`, the
  ratchet's own crossing) for `buildLog`/`store`/`grid`; `metaLedger =
  makeMetacognition(nativeTaskLog)` reuses the exact same instance, no
  second import.
- The atom<->edge match (`sharesToken`) is bare token overlap, not
  referent identity — disclosed in the module's own header as the same
  first-cut heuristic `grounding.js::numberCompany` shipped before two
  later iterations earned a better one (P31). A real call site that finds
  this too permissive or too strict on live turns should measure before
  tightening it, not guess.
- `eval/metacognition-eval.mjs` demonstrates the classifier's own
  cross-domain replay and necessity case (POLICIES.md P71's legs 1 and 3)
  but does NOT demonstrate the ledger moving a real turn's outcome — that
  demonstration needs a live call site, which is exactly what this note
  is asking the owning session to build.
