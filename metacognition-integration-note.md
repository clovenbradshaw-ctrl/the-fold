# Metacognition — integration note for the app.js/holon.js session

2026-08-31. `metacognition.js` shipped as a real, tested, standalone organ —
the watcher over the gap between S1 (`runFastPass`) and S2
(`holonicTurn`/`inspect()`), accumulated into a learnable, revisable
per-cell standing. Nothing calls any of it from a live turn yet (`app.js`
imports checked directly before writing this note — no reference to
`metacognition.js` anywhere in it). Same posture `self-witness-
integration-note.md` already set for the identical boundary: this note is
scoped to what a live call site needs to decide, not a request to wire the
whole thing. `metacognition.test.mjs` is 25/25; full suite 1085/1085 with
the same 125 pre-existing environment failures this repo already carries
(`git stash`-confirmed identical failure NAMES, not just counts).

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

## Where the trigger already sits

`twoPassTurn` (app.js) is the ONLY place S1 and S2 ever run over the same
question today. Its own gate, `needsSystem2(question, s1Text)`, already
calls `extractCheckableAtoms(s1Text, {question})` — S1's checkable atoms
are computed there and thrown away the moment the gate returns a boolean.
When the gate fires, `holonicTurn(question, question, "flat", {priorPass:
s1Text, ...})` runs S2 with the return shape `holon.js::runHolonicTask`
already documents: `{..., unsupported, unbacked, gridLog,
hyperlexiconLog}`.

**The one real design nuance found reading this, not guessed at
beforehand:** `assessAgreement`'s own `relationEdges` parameter wants raw
edges (subject/verb/object/verdict), not `unsupported`/`unbacked` — those
two fields are built from S2's OWN drafted answer's atoms
(`checkGrounding(shipped, passages, ...)`), not from S1's. Diffing S1
against S2 needs S2's real relation edges run directly against S1's own
text, which means calling `assessAgreement(s1Text, {s2Passages, ...})` with
whatever `passages` S2 actually retrieved (not currently threaded onto
`holonicTurn`'s return — see "what a call site needs to decide," below) and
`relationEdges` from `relations.read(s1Text)` if a `relations` reader is
in scope at the call site (checking mode only — see point 3 below).

## What a call site needs to decide (not resolved here, on purpose)

1. **Where S2's passages come from.** `holonicTurn`'s return does not
   currently expose the retrieved `passages` array — only `refs`. Either
   thread `passages` through the return (a small, additive change to
   `runHolonicTask`'s own return object) or call `assessAgreement` with
   `s2Passages: null` and lean on `relationEdges` alone (checkGrounding's
   own `examined: false` posture is preserved either way — this file
   never guesses).
2. **Which cell a claim lands on.** This file has no opinion — see its own
   header. A grid cell (the engine's `cellOf`, the same table
   `hyperlexicon.js::cellFields` already reads) is one natural axis; the
   claim's own verb (`hypergraph.js`'s edges already carry one) is
   another, finer-grained and probably more useful for "how much to trust
   S1 on claims shaped like THIS." Not decided here because it needs
   measurement against real turns this pass did not run.
3. **Whether this runs only in checking mode.** `relationEdges` can only
   ever be non-empty when a `relations` organ is in scope, which today
   only happens under `state.grounded` (CLAUDE.md, "Checking is a MODE,
   not a paint setting") — so this may already fall out for free, exactly
   the same open question `self-witness-integration-note.md` left for its
   own, adjacent trigger.
4. **Whether `surfWeight`/`forcesFoldRefresh` are worth wiring at all
   yet.** Both are pure, real, tested — but neither has been validated
   against a real turn where widening retrieval, or forcing a fold
   refresh, actually changed an outcome (POLICIES.md's own generality
   gate, P71, names exactly this as the unrun leg for this pass). Wiring
   `forcesFoldRefresh` into `refreshSummary`'s own gate (app.js, the
   `arrivals && exchangeHeldGround(arrivals) && ...` condition) is a
   one-line additive `||`; wiring `surfWeight` into
   `gatherPreflightMaterial`/`needsSystem2` is a larger, real design
   question (widen WHAT — the retrieval pool size, the correction budget,
   the preflight query itself) this pass deliberately leaves open rather
   than guessing.

## Residues, so you can say them rather than rediscover them

- The engine bundle to inject is **`eoreader7/native/kernel/task-log.js`**,
  not the legacy provider — the ratchet (P69) already crossed grid.js's
  own kind of consumer to native, and this file's own tests import native
  directly since `legacy-eoreader6.1` is an uninitialized submodule in
  this checkout. If `app.js` is still on the legacy `/engine/holon/
  task-log.js` mount for whatever bundle it hands `grid.js`/
  `hyperlexicon.js` today, hand this module the SAME bundle, whichever one
  that is — the shape (`createTaskLog`/`append`/`projectTasks`/
  `ENTRY_KINDS`/`OPERATOR_BASIS`) is identical on both sides of the
  ratchet by construction.
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
