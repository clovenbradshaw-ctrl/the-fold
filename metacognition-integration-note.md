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

**Amended 2026-09-01 — `surfWeight` wired via flow #2 (a concurrent,
independent pass, POLICIES.md P72's second/third/live-run amendments);
`forcesFoldRefresh` wired here, reconciled on merge.** Two sessions
worked this note's own item 4 at the same time without seeing each
other's work. The `surfWeight` half of THIS session's own first draft —
a bespoke `weight` multiplier wired straight into
`gatherPreflightMaterial`'s page count — is superseded and DROPPED: the
concurrent pass's `escalationFor` occupies the identical function and
parameter slot, more generally (it also widens `maxCorrections`/
`passagesPerPart`, not page count alone), more rigorously (three named,
pinned laws — asymmetry, ceil-not-round, non-compounding), and already
proven live end to end against a scripted-Ollama harness — see this
note's own item 4 below, which now describes it, and CLAUDE.md/
POLICIES.md P72 for the full account. Nothing here restates it further.

What THIS session actually contributes is `forcesFoldRefresh` — this
note's own guess that threading it "turned out LESS trivial than first
guessed" was traced, not just re-asserted. Reading `holonicTurn`'s
turn-ending sequence found `relationClaims` and `result.sections` —
everything `assessAgreement` needs — are already computed several lines
BEFORE `refreshSummary`'s own call, not after it; the metacognition
block (previously placed after `renderGrounding`/`crownTestimony`,
effectively too late to influence the SAME turn's own refresh decision)
moved to right after `renderAnswer`, before `refreshSummary` fires.
`refreshSummary` gained a fourth, options-object parameter
(`{forceRefresh = false}`, byte-identical to every existing caller that
omits it) and now computes `heldGround` once, ORing `forceRefresh` onto
it exactly as the module's own header names ("a natural OR onto
refreshSummary's existing gate ... not a replacement for it") — a
forced override logs its own `forcedRefresh` act, the same "never
silent" discipline the pre-existing `carried` skip already holds for
the opposite decision. One side effect, disclosed rather than
incidental: moving the block also moved it AHEAD of the
`!state.grounded` early return a few lines down, so a plain-mode S1/S2
turn's disagreement is now heard too — bookkeeping, not drawing, the
same "the fold and the record stay ON either way" rule the
checking-mode section (CLAUDE.md) already states for exactly this kind
of state; before this pass, a plain-mode S1/S2 turn silently never
reached the ledger at all. `needsSystem2` stays untouched and still
open: a materially bigger, riskier decision (whether S2 runs AT ALL)
with no mechanism this note, its parent module, or the concurrent pass
names — narrowing it further would have been exactly the kind of guess
this repo's own discipline forbids.

**What was verified.** `node --check app.js` passes; the full suite is
unchanged by name against this checkout's own pre-merge baseline
(`git stash` diff), zero regressions. This checkout's own
`legacy-eoreader6.1` submodule (a real, `.gitmodules`-declared git
submodule of `eoreader7`, never checked out before this reconciliation)
was initialized while merging — reversible, local, read-only — which is
also why the `/engine/` mount (not just `/engine-v7/`) now resolves in
this environment for the first time in any recent pass, closing P69's
own disclosed holdout for this checkout. A real browser load was
verified end to end: headless Chromium driven over the real DevTools
protocol (no Playwright/Puppeteer package present — Node 22's native
`WebSocket` speaks CDP directly) loaded the real page against a real
`serve.mjs` and found the `#not-served` banner hidden, the composer
present, real DOM content — the page's own boot code runs to
completion, byte-identical between the pre-merge baseline and this
pass's own final change. What could NOT be verified, matching every
recent pass's own disclosed limit: no Ollama is reachable in this
environment, so no real model-driven conversation could exercise
`forceRefresh` and show it actually moving a live turn's outcome —
`POLICIES.md` P71's own "does this actually help, not just run" leg
stays open for it, exactly as it does for `escalationFor` above, named
here rather than claimed closed.

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
   **`forcesFoldRefresh` — WIRED**, in a concurrent, independent pass
   reconciled on merge (this note's own 2026-09-01 amendment above): the
   metacognition block moved to right before `refreshSummary`'s own call
   (everything `assessAgreement` needs was already computed earlier in
   `holonicTurn`, contrary to this item's own original worry), and
   `refreshSummary` ORs a `{forceRefresh}` option onto its existing hold
   gate.

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
