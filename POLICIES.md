# The Fold — operating policies

What may be done here and how, one level below the constitution. The
constitution (`../FOLD-CONSTITUTION.md`) says what may be *asserted*; these
policies say how this repo *works*. Each names its evidence and its
enforcement point, per VI.1: a policy whose violation no test can catch is a
wish, and is marked as such. Amendments append; they do not rewrite.

## P1 — Local only

No request leaves the machine: the model is Ollama on localhost, the fonts
are the system's, there is no API-key path and none may be added.
**Evidence:** the hosted path was removed 2026-08-16 at the user's direction;
the corpora this instrument is for (surveillance records among them) make
this the only acceptable arrangement.
**Enforced:** `constitution.test.mjs` fails on any non-localhost host in any
file the page loads.
*Amended by P13 (2026-08-16, appended below): the Explore server carries one
narrow, recorded egress — the web organ. Everything P1 says about the model,
the page, and API keys stands unchanged.*

## P2 — The model is the mouth, and protocols are physics

The model is never expected to follow a protocol — no tool calls, no exact
JSON shapes, no citation formats relied on. Structure is obtained by
grammar (a JSON schema passed as Ollama's `format`, enforced by the
decoder) or extracted mechanically from whatever text arrives
(balanced-bracket walks, object unwrapping). A parse failure is fixed by
widening the extractor or degrading to a typed gap — never by asking the
model harder.
**Evidence:** under plain `format: "json"` gemma2:2b physically cannot emit
the plan array (one object is where that grammar ends); under the schema it
emits three clean parts. Two models 4× apart in size ignored the cite
instruction identically.
**Enforced:** `parsePlan` tests cover talk-wrapped, object-wrapped,
part-shaped, and unparseable replies; `normalizeSummary` survives a hostile
refresh; nothing downstream reads model output without a mechanical check.

## P3 — A plan is inserts on an append-only log

Plans are never mutated. Entries are appended (propose / supersede /
evidence / result / retract, ordered by `seq`, no clock); the current plan
is a fold over the log; supersession keeps the past because "the work was
once seen that way" is itself evidence. Evidence accumulates from any entry
carrying it; unrecognized keys are payload and ride through the fold; a
missing field is a typed gap with a reason.
**Evidence:** the `task-log.js` lineage — identical code drove six domains
in eochat (67 tests), was re-earned in the engine (42/42 conformance), and
rebuilds byte-identically from `log.entries` alone at all 7 interruption
points of the resumption eval.
**Enforced:** `holon.test.mjs` — append-only invariants, supersession,
evidence accumulation, and a resumption test (fold rebuilt from serialized
entries alone).

## P4 — Decompose only on a counted property

A task is split only when the request's own shape says so: several
substantive clauses, each pinning its own concrete anchor
(`needsDecomposition`), or the explicit `/task` door. Never a model call
deciding, never "a corpus happens to be loaded."
**Evidence:** eochat's own eval — default holonic decomposition LOST to the
flat fold, 5/9 vs 7/9. The model-JSON `decomposes` boolean came back
malformed exactly on the turns that needed it (eochatX, commit c7f55ba).
**Enforced:** gate tests in `holon.test.mjs`; the door order test — the
explicit door is checked before every heuristic.

## P5 — Production closes on the fold, and halt facts stay distinct

Execution is the closure: run what is live and unrun, fire mechanical rules
on the fold's own evidence, append what they yield, refold; stop at
fixpoint (fold digest unchanged) or the step guard. Fixpoint, guard-trip,
and open-gaps-remaining are three different facts; only closure with no
gaps means done, and a tripped guard is a typed `open` entry on the record.
**Evidence:** `produce()` in the eochat spine, including its measured
regression (closure by entry count churned forever; fold digest fixed it).
**Enforced:** the production-retry test (stray part superseded, live fold
holds only the grounded retry) and the halt-fact assertions.

## P6 — A record exists only where a check ran

ON RECORD authority requires that some part actually retrieved material and
had its checks run. Caps on a record's lists compress overflow into a
visible count ("+N more — see the run log"), never a silent drop.
**Evidence:** the adversarial review (18 agents) reproduced unchecked prose
acquiring record authority through the original holonic path; the guard
send() already held was extended to tasks.
**Enforced:** the record guard in `holonicTurn`; capped-list construction
against `RECORD_*_MAX` from fold.js.

## P7 — The one disclosed deviation: plan-steered retrieval

A holonic part retrieves on the plan's words, which are model-authored — an
authority ordinary turns do not grant. This is accepted, bounded, and
visible: a part sharing no term with the task is a typed `open` entry; part
labels are checked with drafts against the part's own passages; the retry
rule repairs the strayed-and-empty case in the task's own words. The
residue (a plan steering toward subjects the corpus happens to contain)
stays disclosed in CLAUDE.md rather than papered over.
**Enforced:** stray-disclosure and label-check tests; the disclosure
paragraph itself is the policy.

## P8 — The constitution's channel is one fold plus a map

The model receives exactly one bounded paragraph
(`constitution.js::CONSTITUTION_PROMPT`) — the articles a mouth can honor.
Every enforceable article binds code, named in the `ENFORCEMENT` map;
articles nothing wires (III.1, III.4, III.5) are listed as unwired, per
VI.3, and the assay fails if the unwired list is ever emptied by fiat.
**Enforced:** `constitution.test.mjs` walks the map and probes each row's
behavior with the real organs.

## P9 — Numbers are earned, budgets are named

No tuned detection constants. A bounded pass (MAX_CORRECTIONS,
MAX_PRODUCE_STEPS, maxParts) is a budget with a name and a stated duty —
runaway backstop, not quality threshold — and the last state stands with
its failures on the record when a budget runs out. Constants that P4 of the
reading policy says should be derived (ROWS_PER_CHUNK, NULL_SAMPLES,
CORPUS_MINIMUM, MAX_FINDINGS) remain documented as open debt in CLAUDE.md.
**Enforced:** the correction-budget test (a stubborn model's failure stays
on record); the debt list is the honest remainder.

## P10 — A policy change lands with its test

Per VI.1: an amendment that cannot be expressed as a changed failing test
is an exception, not an amendment. Every policy above cites its test; a new
policy without one is marked as a wish until its test exists.

## P11 — A name is a reference to a referent, never a byte sequence

Every organ that compares text to text shares the pipeline's one fold, and
every check on a NAME consults the referent the material itself establishes
— via the engine's own cast organs (`extractSurfaces` / `discoverReferents`
/ `namesCorefer`, injected through `cast.js`), never a local
reimplementation of what "the same name" means. Two consequences:

- **The fold is one, and shared.** Retrieval folding what a check does not
  fold makes a found passage fail the check that should confirm it.
  Measured live: `tokenize` folded diacritics, the grounding index didn't,
  and Bezúkhov — plainly in the retrieved bytes — was flagged invented.
  A string fold is only ever the orthographic slice of referent identity;
  it is licensed by the referent, not by convenience.
- **Support is asymmetric where coreference is not.** A sub-form of an
  established name ("Bezukhov" where the material writes "Pierre Bezúkhov")
  resolves to its referent and is supported; an EXTENSION ("Pierre
  Bezukhov" where the material only ever wrote "Pierre") is model-supplied
  content wearing a resolved name, and is refused. The genuinely disjoint
  alias ("Peter Kirílovich") is model-tier, typed as a gap by the engine
  itself, and closes only through a received prior with a named giver —
  the resolver is that prior's seam, not its substitute.

**Evidence:** the War and Peace run of 2026-08-16 (five false "not in the
material" flags on real names), and the engine's own history — a blanket
combining-mark strip was tried and reverted in `surfaces.js` for silently
claiming cross-script generality (II.13).
**Enforced:** `grounding.test.mjs` — the fold-both-sides regression and the
cast-resolution test, which runs against the engine's real organs and pins
the asymmetry.

## P12 — Every sentence stands on a named ground

There is no "ungrounded content" in a rendered answer; that framing was the
mistake. There are two grounds — THE MATERIAL (an address into the bytes,
cited or attribution-earned) and THE MODEL (its own voice, typed as such) —
and every sentence is classified onto one, mechanically, from checks the
turn already ran (`provenance.js` reads `attribute()` and `checkGrounding()`
output; it measures nothing fresh). Orthogonal to the ground is the stripe:
a sentence committing to figures or names the material does not hold is a
claim of fact on model authority, drawn with the warning stripe whichever
ground it stands on — a cited sentence that drifted shows both facts at
once. The renderer keeps the grounds visually distinct (IV.4): material
plain with its address, model-voice dotted, claims striped.

**Named future work, not implied by the word "grounded":** relation-level
reading — the hypergraph tier, where "Pierre married Dolokhov" fails with
every token present because the text never bound that edge. The organs are
the engine's (`extractRelations`, the binding nulls); until they are wired,
sentence-level ground plus atom-level stripes is what this instrument
actually checks, and it says so.

**Evidence:** the live dialogue run's first turn — gemma2:2b called Pierre
"the main character in Anna Karenina"; the stripe machinery flagged Anna
Karenina and Leo Tolstoy as not-in-the-material on the record while the
legitimate sentences attributed to Pierre's actual introduction chapter.
**Enforced:** `provenance.test.mjs`, including the orthogonality case
(cited AND striped), and the IV.4 row in `constitution.js`'s map.

## P13 — The web organ: one sanctioned egress, recorded, with a clearable store

P1's "no request leaves the machine" is amended, not repealed: the model
still has no hosted path, the page still loads nothing remote, and no
API-key path exists. What is added — at the user's direction, 2026-08-16 —
is ONE egress, in the local server only (`explore-server.mjs` `/api/web/*`,
pure half in `web.js`), to exactly three destinations, each by explicit
user action: the no-key search endpoint for a typed query; the one page a
request names (never a crawl — subresources are not fetched); and
`web.archive.org`'s Save Page Now, only while the archive setting is on
(default off — a fetch is private, the archive crossing is not). Every
crossing lands in the append-only record before or as it resolves.

What a fetch keeps is the WHOLE page, not a bookmark: raw bytes and the
extracted readable face, content-addressed under `web/pages/`, indexed by
`web/history.jsonl` with the retrieval date; salience is served by the fold
over the saved text, never by truncating what is saved. The history store
is the one deliberately clearable thing this server owns — the user may
empty it, per entry or entirely — and the clearing is itself a record
event: the pages can be deleted; that they were read cannot. Upstream
refusals are typed, never silent: the search endpoint's bot-challenge page
is `refused-upstream`, an intermediary's error body is off-endpoint (a
failed search, not an empty one), and a host's challenge interstitial is
marked on the entry it produced.

**Evidence:** the live build measurements of 2026-08-16 — DuckDuckGo's
anomaly page from a distrusted address, a proxy's 200 "upstream connect
error" body that would otherwise have shipped as "the web had nothing",
and britannica.com's "Just a moment..." interstitial (5.7KB, zero readable
chars) — each now a pinned fixture or case.
**Enforced:** `web.test.mjs` — extraction (including the quote-aware tag
walk the Wikipedia fixture forced), both search faces plus the blocked and
off-endpoint refusals, the history fold's patch-by-id and clear semantics,
archive-address naming, and the seam test: `explore/explore.js`,
`explore.html`, and `explore-bridge.js` still reference no non-local host,
same rule II.13 pins for the Converse page.

## P14 — Work done twice becomes code; the model proposes, the gate disposes

L5 extended from facts to work. A procedure the instrument has performed once
may be deposited as a SKILL — executable code with declared slots, declared
anchors, declared organ needs, and its own check — and from then on the model
does as little as possible, in a ladder whose every descent is a typed `open`
entry: (1) a saved skill claims the task mechanically (all anchors in the
task's own words, most-specific wins, ties refused as ambiguous) and its
slots fill from the task's own words — zero model calls; (2) slots the task
does not determine are filled by ONE grammar-constrained call and validated
mechanically before anything runs; (3) no claim, and the task runs the way it
always did. Five walls hold this up:

- **The body is code the model never executes, sees at runtime, or edits in
  place.** The model touches a skill at two seams only: slot values
  (validated, basis-tagged "task" or "model" — a model-filled slot is a
  disclosed authority, P7's class) and candidate authoring.
- **Admission is P10 made mechanical.** A candidate without its own check is
  refused as a wish; a check that fails against the candidate's own body in
  the real sandbox refuses admission; the refusal lands ON the log with its
  reason, because "tried and refused" is evidence.
- **Authority is granted, never ambient.** A body runs in an empty vm context
  with exactly the organs it declared and was granted; the forbidden-token
  scan refuses at admission what the sandbox would not hand over. Stated
  honestly: this is an authority wall by construction, not a hardened
  security boundary — P1 is the outer wall.
- **The library is a log** (P3's discipline): admit / supersede / retract /
  invoke / refuse, folded to a live library, rebuilt from the record alone;
  bodies live content-addressed in `skills/<digest>.json`, identity is the
  digest of the mechanism (provenance rides the entry, not the identity),
  and bytes that stop matching their digest drop from the live fold as a
  typed defect, never trusted silently.
- **Provenance is measured, not claimed.** A run's refs are harvested from
  what its granted organs actually returned; budgets (run, check, stack
  depth) are named backstops whose overrun is a typed refusal.

**Evidence:** the session of 2026-08-16 — two models ignoring the cite
instruction (L5's own record) generalizes: anything reusable left as prose
instructions is re-derived or drifted on every use, while the same procedure
as gated code runs identically forever and costs zero tokens.
**Enforced:** `skills.test.mjs` — the wish refusal, the token scan, the
check-must-pass gate, the ambiguity refusal, the zero-model-call skill path,
the typed descent, organ-grant denial, budget overruns, stacking with
dependency-order admission, and the digest-mismatch drop on reload.

## P15 — The instrument's cognition is a second plane, never mixed with the material

The chat's own acts — what each turn asked, retrieved, checked, corrected,
folded, recorded, and how far each arrival moved its belief — are themselves
a record: an append-only ledger per conversation (`reflex.js`, the pace.js
discipline — entries appended, never mutated, seq not clock), rendered to an
addressed text on the reserved `self:` namespace and re-openable like any
source. Four mechanical walls keep the planes apart: a loaded source may not
claim the `self:` namespace; the ledger never enters material retrieval's
store; self passages reach the model only under their own SELF block, which
declares what it cannot support; and a record earned on the self plane is
typed `plane: "self"` at birth (`fold.js`), marked in ON RECORD, and said in
the renderer — introspection never wears the authority of a check that ran
against the world. The levels are answered on request, cheapest first: the
computed tables (`/self` — acts, surprise, pace, plus the app-plane levels
tables.js already had) spend no model call; `/reflect` is a model turn whose
material IS the ledger, audited by the same organs as any turn.

"What is most surprising" is measured, never asked — L5 applied to
introspection: a model asked to report its own surprise is a
compliance-critical fact left to instruction-following. The meter is the
engine's own tier stack (eoreader6 `emergence/tiers.js`,
`createTierStack`/`foldThrough` over `surprise.js`), used, never copied
(organs injected, the cast.js pattern; served via the `/engine` and `/nul`
mounts). Every message the conversation hears is one arrival, placed against
the reader's own continuation null. The numbers name their givers and none
was tuned here: window = `RECENCY_WINDOW` (the fold's own declared present —
one declaration, not a second knob), gamma derived by the engine's own
`gammaFor(window)`, draws = 200 (read-frankenstein's declared resolution of
testimony), alpha = 1 (same giver). The first arrival seeds belief and is a
typed gap, never a number (SEED.md #1).

**Evidence:** the engine organs' own conformance (the surprise boundary
invariant; tiers' decay-mass assertions); the live browser run of
2026-08-16 — the meter measuring real arrivals against the null with the
declared numbers in the caption, zero page errors.
**Enforced:** `reflex.test.mjs` — append-only ledger, byte-identical rebuild
and offset self-verification, reserved namespace, plane-typed records with
the ON RECORD marker and the II.5 firewall across planes, typed first-ground
gap, declared numbers checked against their givers, deterministic
measurement and mechanical ranking against the engine's real organs, and the
door tests (detectReflex requires the second-person tell; the material
always wins).

## P16 — Anything built is an append-only log with EO notation, projected, downloadable at any cursor

P3 extended from plans to the things built. A build — a code artifact, a
table, an html/svg render, anything the conversation produces and keeps — is
never a mutable object. It is a thread on the engine's own task log
(eoreader6 `engine/holon/task-log.js`, used through the `/engine` mount,
injected so `build-log.js` stays pure — the cast.js pattern): its birth is a
PROPOSE, every edit and reset a SUPERSEDE that keeps the past, every run a
RESULT attached to the version that actually ran. What the app shows is a
FOLD over the entries — the projected build — and a cursor scrubs that fold
to any entry (the graph cursor's semantics: the build AS OF that point),
where it is downloadable as a file named by its address (`build-3@5.py`).

The EO notation is mechanical, from the ACT, never from the content — the
cube stays refuted as a content classifier. Constitutive entries carry it:
PROPOSE is SEG · Figure · produced (the artifact snipped out of the turn's
own answer and named — `proposeDiscovered`'s exact cell, reused); SUPERSEDE
is SYN · Figure · produced (a new whole compiled from the prior version and
the edit); RESULT carries no operator, because a result attaches an answer
to a task that already exists and stamping it would re-type the task —
task-log.js's own `produce()` discipline, carried rather than re-derived.
This is the one disclosed amendment to "this repo is not a cube consumer":
for builds, and builds only, the operator half of the vocabulary is carried,
by user direction (2026-08-16). holon.js's plan log is unchanged.

Further walls: editor keystrokes are a DRAFT, not an act — the SUPERSEDE
lands when the draft is committed, never per keypress, and LEAVING the
editor commits it (an edit the log never saw would be a second, hidden
truth: the panel and the download showing older bytes than the newest
work). Identical code is churn and appends nothing. A result entry keeps
run output to a declared budget with the drop stated on the entry
(`kept: {stdout: {kept, of}}`) — the alternative is the browser store's
quota failing persistence SILENTLY a few dozen runs in. Persistence is the
entries alone, replayed through the engine's own `append` on restore, so a
stored row that violates the vocabulary fails loudly instead of loading as
state. Every entry is mirrored, as appended, to
`record/build-record.jsonl` (append-only, FOLD-CONSTITUTION I.5) through
serve.mjs — batched per append-set and chained per build so rows land in
log order — where the engine's `append` is the validation gate: a refused
entry lands on the record as a typed refusal with the engine's own reason,
and never blocks the valid entries around it. A download is a crossing and
is recorded (`build-export`), the posture Explore's record already holds.

**Evidence:** the mutable shape this replaced lost history by construction —
`entry.code` overwritten on every editor keystroke, `lastRun` on every run,
reset discarding the path that led anywhere; none of it addressable after
the fact. The log shape reproduces every historical state byte-identically
at its cursor position (pinned), and the engine's own `checkCubeProgression`
stays silent on build threads — the typing never runs the algebra backward.
**Enforced:** `build-log.test.mjs` — the EO cells on constitutive entries,
the past kept on revise, churn refused, cursor folds byte-identical at every
seq, rebuild from serialized entries alone, vocabulary violations thrown on
replay, the engine's own progression checker silent, exports per artifact
type (code/csv/html/svg) named by address, and the legacy migration floor.

---

*Established 2026-08-16, alongside the holonic layer, the constitution
channel, and the local-only excision. The lineage evidence cited here was
gathered by a five-reader sweep across eochat, eochatX, eoWebLLM, and the
engine; the full brief is preserved in that session's task output.*
