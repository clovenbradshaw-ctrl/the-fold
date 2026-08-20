# Self-witness landing — integration note for the app.js/holon.js session

2026-08-20. BUILD-4 of the Per-Source Testimony spec (POLICIES.md P39,
CLAUDE.md's "claim-id spine" + "BUILD-4 landed" sections) shipped the crown
render and, same pass, a real, tested construction for a self:model
reading. Nothing calls any of it yet — `perSourceReadings`, `mergeTestimony`,
and `crown.js`'s `renderCrown` are ALL still unwired to the live app (`app.js`
imports only `makeCapacityRunner`/`landAct` from `capacity-runner.js`,
checked directly before writing this note). This note is scoped narrowly to
the one piece that's new this pass — the self-witness half — not a request
to wire the whole spine. `capacity-runner.test.mjs` is 63/63, `crown.test.mjs`
is 26/26, full suite 1099/1099 (see POLICIES.md's P39 amendment for the exact
count reconciliation — a concurrent session touched unrelated files mid-pass).

## What exists now (capacity-runner.js — done, tested, yours to consume)

`landSelfAssertion(grid, log, {subject, verb, object, verdict, claimId})` —
capacity-runner.js, right after `mergeTestimony`. Mints nothing itself —
`claimId` must already exist (`await grid.mintClaimId({subject, verb,
object})`, the same triple, called first, same convention `landAct` already
uses). Returns `{ok: true, log, ids, event}` on success, `{ok: false,
refusal: {type, detail}}` on a bad call — three typed refusals, never a
silent no-op: `no_claim` (subject/verb/object missing), `unknown_verdict`
(verdict isn't `"holds"`/`"refused"`/`"undetermined"`), `no_claim_id`.

Call it once per (subject, verb, object) triple you've decided is worth
minting a claim for; `perSourceReadings(grid, log, claimId)` then reads it
back like any other source, and `mergeTestimony(readings)` merges it with
whatever else has checked the same claim_id — including nothing else at all,
which lands `SINGLE`, not `AGREE`, by design (a self-witness never
co-signs its own corroboration).

```js
const claimId = await grid.mintClaimId({ subject, verb, object });
const landed = landSelfAssertion(grid, state.gridLog, {
  subject, verb, object,
  verdict: "holds", // or "refused" — see "What a call site needs to decide" below
  claimId,
});
if (landed.ok) state.gridLog = landed.log;
```

## Where the trigger already sits

`holon.js`'s `inspect()` (the function ending around `holon.js:1028`) has
the no-material branch this was written against — `holon.js:994-1000`:

```js
const grounding = passages.length || isArtifactPart
  ? checkedGrounding
  : (() => {
      const findings = extractCheckableAtoms(shipped, { question: groundingQuestion });
      return { ...checkedGrounding, findings, clean: findings.length === 0 };
    })();
```

**The one real design nuance found reading this, not guessed at beforehand:**
`extractCheckableAtoms`'s `findings` (line 998) are NOT a (subject, verb,
object) shape — they're proof-seeking candidates (grounding.js's own
docstring: "what percentage of Earth's atmosphere is nitrogen"), figures and
names, not triples. The real triple source sits nine lines further down,
already running in the same function regardless of `passages.length`:

```js
const relationReport = relations ? relations.read(text) : null;
```

— `holon.js:1028`. `relations.read(text)` runs hypergraph.js's real SVO
extraction against the model's OWN drafted text (`text`, not `shipped`) and
returns real edges even with zero material, because `judge()` doesn't
require material to extract a triple — only to BIND one to something. With
no passages, every extracted edge's verdict can only ever land in the
disclosure-only bucket (`beyond-reach`/`unheard`/`unbound` — CLAUDE.md's own
five-verdict list), never `bound`/`contradicted`. That is exactly the
mechanical signal for "the model asserted real structure and nothing was
there to check it against" — the honest trigger, not `passages.length ===
0` alone (which fires on `extractCheckableAtoms` too, for a different
reason) and not `extractCheckableAtoms`'s own findings (wrong shape
entirely).

## What a call site needs to decide (not resolved here, on purpose)

This pass built the landing primitive and stopped at the edge of your file's
ownership — these are real judgment calls, not oversights:

1. **Which edges mint a claim.** Every `beyond-reach`/`unheard` edge in
   `relationReport`, or some filtered subset (a minimum confidence, a cap
   per turn, only the edges that also appear in `shipped` rather than a
   discarded draft sentence)? `capacity-runner.js` has no opinion — it lands
   whatever triple you hand it.
2. **`holds` vs `refused` per edge.** This pass's own fixture-matching tests
   only prove the SHAPE each verdict produces, not how to pick one for a
   real edge. The natural read is: an affirmative extracted edge is `holds`
   (the model asserted it as fact); a negated one (relationReport's own
   polarity field, the same one `squarePolarity` already reads elsewhere in
   this file) is `refused`. Not implemented or tested here.
3. **Whether this should be gated behind `state.grounded`** (checking mode
   — see CLAUDE.md's UX-pass section, "Checking is a MODE, not a paint
   setting"), the same way every other relation-tier read already is, or
   run unconditionally. Given `relations.read(text)` already only runs when
   a `relations` organ was injected — which today only happens under
   checking mode — this may already fall out for free; not verified against
   a live call site because none exists yet.
4. **Where the reading is kept.** `perSourceReadings`/`mergeTestimony`
   consume `state.gridLog` the same way `landAct`'s own callers already do —
   nothing new needed there — but nothing today calls either function
   against a live turn's claim_ids, self-witness or otherwise. Wiring
   `renderCrown` into an actual answer's rendering is the larger, separate,
   already-open integration this note does not attempt to shrink.

## Residues, so you can say them rather than rediscover them

- `landSelfAssertion` requires `claimId` — unlike `landAct`, where it's
  optional. A self-assertion landed without one can never be found by
  `foldClaim`/`perSourceReadings`, so there is no honest default; the
  refusal (`no_claim_id`) is deliberate, not a gap to relax later.
- The DEF act this function lands carries a hardcoded terrain+stance
  (`at Field from generate`) rather than reading one from the caller. If a
  real call site needs the act to carry a different terrain for its own
  bookkeeping reasons, that's a real, small, disclosed extension — not
  attempted here because nothing today needs it.
- `emitted_by` is hardcoded to the string `"the-fold:app.js:selfAssertion"`
  (matching both pre-existing test fixtures' own choice, made before this
  pass, in `capacity-runner.test.mjs` and `crown.test.mjs`). If the real
  call site ends up living in `holon.js` rather than `app.js`, that mechanism
  name is now slightly inaccurate and worth a one-line fix at the same time
  the call site is added — not fixed pre-emptively here since guessing the
  real file wrong would be worse than leaving the (accurate today, checked)
  name alone.
