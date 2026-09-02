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
*Amended 2026-08-16 (audit finding 4): "any file the page loads" was carried
by a hand-written list of 17 filenames, and the list was already wrong —
thirteen page-loaded modules (render.js, log-pane.js, web.js, quotes.js and
the rest) escaped every host scan in the repo. The scan set is now WALKED
from index.html by `page-graph.mjs`: its script entry points, then the
transitive closure of imports, dynamic imports, importScripts, Worker sources
and relative module paths held as data (term.js's ROSTER). Three kinds of
edge stay out of scope and each is typed, asserted to resolve on this disk,
and reported rather than skipped — `/engine` and `/nul` (another repo's bytes,
governed by eoreader6's own tests), `/node_modules` (vendored third-party,
where what is checked is that the bytes are served from localhost), and a
separate document in an iframe (Explore, scanned by web.test.mjs's seam).
A non-local host literal is a failure unless a TYPED allowance covers it and
that allowance's mechanical reason is checked in the same test: the SVG
namespace only inside an `xmlns` attribute, and web.js's archive addresses
only because web.js holds no egress call at all.*

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

*Amended (2026-08-16, appended): the hypergraph tier is WIRED —
`hypergraph.js`, on the engine's own organs (`discoverRelationVocab` /
`extractRelations` / the referent index cast.js projects), injected so the
module stays pure. The material's edges are read per passage, each carrying
every address that states it; the answer is read with the SAME vocabulary
and organs; every relation claim gets one of five typed verdicts — bound
(with corroboration counted as passages × distinct sources), contradicted
(opposite polarity), unbound (the flagship case, carrying the nearest edges
the material does bind), beyond-reach and unheard (the instrument's limits,
disclosed, never judged and never on the record as unsupported). Support is
never a bit: a claim's ground is graded by how many independent perspectives
state it, because the approach toward truth is asymptotic, through agreeing
perspectives — the same discipline `corroborateAtoms` now applies at atom
tier. Contradicted and unbound edges join the unsupported list and drive
the same bounded correction pass. The closed-class measure runs over the
POOL through cite.js's own `commonTerms` (its CORPUS_MINIMUM floor), never
over the turn's excerpt — measured while wiring: material.js's token-share
threshold degenerates at turn scale and classified "married" as a function
word. Enforced: `hypergraph.test.mjs` (against the engine's real organs,
including the flagship case, the polarity flip, and the typed limits) and
the relation-claims case in `provenance.test.mjs`.*

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

*Amended (2026-08-16, appended): proof-seeking. A claim the turn's checks
flag — an unsupported atom, a contradicted or unbound edge — may be taken
to the world through this same egress: a search on THE CLAIM'S OWN WORDS
(never a paraphrase), the top pages read through the recorded fetch, each
saved text face judged by the same containment rule the claim failed
locally, the result folded to counted perspectives ("stated by 2 of 3
pages consulted, 2 distinct hosts") with the syndication residue named on
the verdict — never "true", which this instrument cannot say. Authorization
is two-tier and stays explicit: the per-claim button is one click, one
crossing; the standing toggle (persisted, the user's alone) is the standing
consent that lets a turn seek automatically, bounded by
PROOF_TARGETS_PER_TURN with the bound visible in the disclosure. The page
still owns no network — search, fetch, and record stay in
explore-server.mjs; failures arrive as the typed gaps this policy already
names, and a failed crossing renders as a gap, never as "the web had
nothing". Enforced: `proof.test.mjs` — query-from-own-words, same-fold
containment, perspective counting with the never-"true" assertion, gap
typing, target ordering and dedup, the declared budgets, and the seam test
extended to proof.js, app.js, and index.html.*

*Amended again (2026-08-17, by user direction): the standing toggle DEFAULTS
ON, and it moved out of the settings dialog onto the composer, beside the
question it governs. The reasoning for default-off was that a crossing must
be authorized rather than assumed — but the toggle it protected was a
checkbox inside a modal nobody opened twice, so what it actually bought was
"the reader almost certainly never turned this on", not "the reader decided".
A switch in permanent view, one click from every question, whose state is
legible without opening anything, is the stronger form of the same
requirement: consent that can be seen and withdrawn beats consent that has to
be found. Nothing else in P13 moves — the egress is still the local server's
alone, still one request per explicit ask, still recorded before it resolves,
the per-claim button is still its own authorization, the per-turn bound is
still declared and visible, and the archive.org crossing (a public act,
unlike a private fetch) keeps ITS default off. Its sibling switch,
`attachments`, governs no egress at all: it is retrieval-only, and turning it
off unloads nothing and invalidates no address.*

*Amended again (2026-08-17, by user direction): a link this instrument hands
to the reader is checked before it is asserted, never taken on the far
side's own word. `archivePage` used to mark a Save Page Now result "saved"
the instant Wayback's Content-Location header named a snapshot address —
the archive's own claim about itself, rendered straight into the "archived
↗" link with nothing confirming the address actually resolved to real
content. `verifySnapshot` now fetches that named address and reads it with
the same organs (`looksLikeChallenge`, `extractReadable`) `fetchAndKeep`
already uses to judge any other fetch — a non-2xx response, a
challenge/shell page, or an empty text face all fail verification, and
`archive.status` ships `"failed"` with a typed detail naming what was
checked, never a silent pass-through of the header. Nothing else about the
crossing moves: still one deferred fetch to the address the archive itself
named, still recorded, still the local server's alone. **Enforced:** the
verification reuses `web.test.mjs`'s existing coverage of
`looksLikeChallenge`/`extractReadable` (no second threshold was invented);
`verifySnapshot` and `archivePage` are the impure half by construction (a
live fetch to web.archive.org), so — like the rest of the P13 egress
functions in explore-server.mjs — they are exercised live rather than
mocked, and are not independently unit-tested offline.*

*Amended (2026-08-17, by user direction: "go have it scrub for a pre-build
copyright free version before building it's own, carry provenance" / "grab
any arbitrary repo and ingest with provenance and edit in place" / "it
should have network access"): the SEED egress. P13 gains one more named
destination, server-only and recorded like the rest — api.github.com and
raw.githubusercontent.com, reached only by `/api/seed/search` (the scrub
before a build) and `/api/seed/ingest` (the /ingest door). The mechanical
license signal is GitHub's own license.spdx_id, graded by seed.js against
the closed SPDX permissive set (giver: spdx.org): `seedable` may splice
automatically when the file choice is also unambiguous; `stated` and
`unknown` never splice silently — but PROVENANCE IS CARRIED WHATEVER THE
SIGNAL SAYS (user direction: carrying provenance forever outweighs
definitive public-domain signals): source url, repo, path,
license-as-found-or-null, retrieval date ride the build's birth entry,
re-carry onto every re-zeroed ground, and stamp every export as a comment
header. Navigation among found candidates is the LOCAL MODEL'S, under
physics: the decoder's enum is the candidate list plus "none", so a repo
outside the found set is unrepresentable, and everything after the pick
(fetch, admission budgets, provenance) is mechanical. Rate-limit and
missing-repo refusals are typed (refused-upstream / not-present), every
crossing lands on the record before the response ships, and ingestion
budgets are declared and counted (INGEST_MAX_FILES, INGEST_MAX_BYTES),
the drop stated, never silent. Enforced: seed.test.mjs (offline, the
pure organs against the real engine prior register — demand detection,
archetype grammar, license grading, admission with counted drops,
provenance riding birth → re-zero → export); the server half is
exercised live per this policy's own posture, and was: candidates
returned license-graded, a CC0-1.0 repo ingested 6/6 files with
provenance, both crossings on the record.*

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

*Amended (2026-08-17, appended): the run crossing itself. Everything above
governs the log the PAGE keeps; it said nothing about the process that
`/api/run` actually spawns to produce a RESULT, and the audit of 2026-08-16
(finding 3) found that gap load-bearing — a direct POST to `/api/run` left
zero trace, sanctioned by no policy, on the same server whose header
already admitted pip and npm installs reach the network. That endpoint is
now sanctioned explicitly, on these terms, stated rather than left as a
code comment: `/api/run` is loopback-only and capped (`RUN_TIMEOUT`,
`RUN_MAX_OUTPUT`), but the process it spawns runs with this machine's own
ambient authority, network included — it is NOT a mediated egress in P13's
sense (one endpoint, one record, one clearable store) and does not become
one here. This is disclosed, not fixed: P18's terminal moved to a severed
browser sandbox precisely because a real process has real network, and a
build run is that same real process, still. Sandboxing the runner is
future work; what changes now is that the exception is never silent. Every
attempt is a crossing on `record/build-record.jsonl`, written by the
server itself: a `build-run` row lands BEFORE the process starts (code by
its sha256 and kept to a declared budget) — no record, no run; the one
place in serve.mjs where a failed append stops the act instead of
disclosing it after the fact — a `build-run-result` row lands as it
resolves (exit code, timing, true output size beside what the cap kept),
and a `build-run-refused` row lands for a rejected attempt
(off-loopback, no runner for the language, a malformed body) — so refusal
is as visible as success. This is independent of, and does not replace,
the page's own mirror (`attachRun` → `/api/build-record`): a UI-started
run now lands on the record twice, once from each side, addressed by the
same `run` id, which makes the two cross-checkable rather than either
standing alone as the only witness. **Enforced:** `serve-run.test.mjs` —
booting a real server against a throwaway record directory: a successful
run, a refused language, and a refused malformed body each produce their
row live, the crossing row precedes the result row and shares its `run`
id, the code is kept by sha256 and declared budget, and the true size of
capped output is stated beside what fit. The off-loopback refusal cannot
be produced live from a same-machine test (any socket this process opens
to itself is loopback by construction), so that branch is verified by
source shape instead — it must route through the same recorded `refuse()`
as every other rejection, never a bare response that would skip the row —
which is disclosed here as what it is, a narrower check than the rest,
rather than claimed as equivalent to the others.*

*Amended (2026-08-17, by user direction: "lets DEFINITELY do the diff
format" / "use the 9 operators as the primitives"): the patch carriage.
A SUPERSEDE now comes in two carriages — FULL (the entry holds the whole
code, `reviseBuild`, unchanged) and PATCH (`patchBuild`: the entry holds
only a delta, and `foldBuild` compiles the new whole by applying the patch
stack on top of the last full-carriage entry, the way a working tree is
checked out from a patch series). Same kind, same SYN · Figure · produced
cell, because the typing is from the ACT and both acts supersede one
version with the next — and SYN's own verb ("compile: a whole composed
from parts") is more literally true of the patch carriage than of a full
retype. The delta's primitives are the operators themselves: INS · admit
(bytes join after an anchor), SEG · snip (bytes cut out), SYN · compile
(a span recompiled). They live as ops INSIDE one SYN entry, not as entries
of their own, because the production order is one-way and a SEG entry
after an INS entry would run the engine's own referee backward — the same
wall that forced REC into its own thread, conceded to the same way.

Why: a small model can reliably say "change #4CAF50 to #2196F3"; it cannot
reliably retype a whole file without breaking something it was not asked
to touch. The log does the remembering; the model only has to be right
about the delta. Three facts about the seam, all MEASURED live
(gemma2:2b / qwen2.5-coder:1.5b, 2026-08-17), none reasoned into place:
(1) under an array-of-objects grammar gemma2:2b emits an empty array — so
the ask is ONE flat {find, add} edit per call, the shape a 2B decoder
physically walks; (2) the operator label is NEVER asked of the model —
both models said "INS" while supplying a replacement, which applied at
its word duplicates the span, so `deriveOp` computes the act from the
delta's own bytes (L5 applied to the delta: the mouth supplies bytes, the
instrument types the act); (3) the dominant strict-mode failure was
`ambiguous` on an edit that was well-defined on every occurrence ("make
the buttons bigger" naming the style attribute both buttons carry), so
`every` applies at all occurrences, counted, disclosed on the entry and
in the landing note — and strict stays the default, because `every` also
admits the bad case (a token living in markup AND script). Application is
exact-match, atomic, and typed on failure (`unlocated` / `ambiguous` /
`malformed`); a patch that does not apply NEVER lands; a stored patch
that stops applying (corrupt store) degrades to the last projectable
version with the gap named on the fold, never silently. A re-zero's new
ground still carries FULL code (its PROPOSE is its own base — the patch
walk never crosses a ground boundary) with the delta as `patchProvenance`.

The mechanical walls verify APPLICABILITY, not intent — measured: a
landed edit can still be the wrong edit, and the remedy is the fold's own
iteration loop, one complaint away, with nothing lost. Kinship disclosed:
this is the same shape as the sibling `bare-metal-eo-matrix-app` (state =
fold(dispatch, initial, events), operator-typed events, schema in the
log), with one divergence named — that repo reads DEF as "set a value in
the current frame"; this repo follows eoreader6's own register (DEF =
refuse), so a value swap here is SYN · compile, never DEF.

Amended same day, user direction ("INS is birth — go read the eoreader
handbook"): PROPOSE is retyped **INS · Figure · produced**. The handbook's
own axes (201-nine-verbs) place birth at Generate · Existence — a new
whole brought into being, in the domain of "is this thing here at all" —
and the sibling bare-metal-eo-matrix-app reads the cell identically
("INS creates new entities with permanent anchor IDs"). The old SEG
typing read the MECHANICS (a fence snipped out of the turn's answer,
proposeDiscovered's cell) rather than the ACT; the snip is how the
segment reached us, the birth is what the entry records. SEG keeps its
true station as the delta primitive that cuts a reach-unit out. INS → SYN
runs forward in the engine's own order, so the referee stays silent —
re-pinned rather than assumed. Stored logs are unaffected: replay goes
through the engine's `append`, which accepts both typings, and old
entries keep the operator they were born with — history is not retyped.

*Amended same day (user direction: "do all") — the loop is closed and five
more operators speak. Four new entry kinds, each its own micro-thread (the
REC precedent; the one-way order is why), none touching the projection:
**NUL · Ground** — the ask joins the log (birth lands the instruction
verbatim; a re-zero lands the amended ask beside its rebirth — the log's
first word on the grain axis beyond Figure, the axis the lexical corpus
measured strongest); **SIG · Figure** — attention: `scoutSpan` resolves
the operator's own words to the byte-span they name (shared tokens
through the one fold, boundary-checked, the most SELECTIVE term deciding
— "the reset button" scopes by "reset", never by "button"), the model is
shown that arena, the edit applies `within` it, and the span rides both
the SIG entry and the patch entry so replay recompiles the same arena;
**DEF · Figure** — a refused patch lands with its gap and its ops, and
the next ask QUOTES it ("already tried and refused"), so dead ends are
walked once; **EVA · Figure** — every landing is witnessed mechanically
(`witness.js`: script compile-checks — never invoked — id referential
integrity, root closure; unexaminable languages are typed `unexamined`,
never clean) and a dirty witness aims the next ask. The walls now check
applicability AND artifact integrity; intent still belongs to the
operator, one complaint away.

Measured end to end (eval/iterate-eval.mjs, the REAL organs, live
models, 2026-08-17): the morning's baseline was 3/6 landings with intent
unmeasured; with the full ladder, gemma2:2b and qwen2.5-coder:1.5b each
land 6/6 on turn one, 11/12 witness-clean on turn one, and 12/12 after
ONE repair turn — the single dirty landing (a script-breaking edit) was
caught by its own witness and repaired by the loop itself, at ~220
output tokens per model for all six iterations. Enforced: the new cases
in `build-log.test.mjs` (each operator's entry, thread, checker-silence,
and replay; the measured qwen id-clobber pinned as witness evidence; the
scout's offset map surviving decomposed diacritics per P5.2).*

**Enforced:** `build-log.test.mjs` — the INS birth cell derived by the
engine's own `cellOf`, applyOps' typed gaps and atomicity,
deriveOp/readOps off the bytes (the INS normalization: the anchor is never
carried twice), the every-carriage counts riding the entry and recompiling
identically from serialized entries alone, patch stacks folding
byte-identically at every cursor, checkCubeProgression silent across
patched, re-zeroed, re-patched threads, and the corrupt-store degradation.*

## P17 — A quotation is the source's bytes or it is not printed as one

Quotation marks are the strongest claim an answer makes — "these exact
words are in the source" — and the one claim no other check can see: every
token of a fabricated quotation can pass the byte check while the wording
is invented, and a drifted quotation still overlaps its passage well enough
to earn an attribution. So every quotation in every answer is followed to
the bytes, mechanically, with no model in the loop (L5 applied to the fact
that a quotation is real), against the material through the one shared fold
(P11):

- **verbatim** — the quoted words are the source's bytes (whitespace and
  emphasis aside: layout is not content). The quote earns its chunk's
  address inline — mechanical citation — and its precise char anchor rides
  the disclosure for one-click reopening.
- **drifted** — found under the fold, bytes differ. The answer is REPAIRED
  before rendering: the quoted words are rewritten to the source's own
  bytes, the correction is disclosed in the grounding panel ("Helene" →
  "Hélène", with the drift the reader never saw shown), and the repaired
  text is re-inspected so the record describes what the reader sees. The
  declared transformations between bytes and print are exactly two:
  whitespace runs to one space, inner double quotation marks to single.
- **unlocated** — quoted from nothing in the material. A fabricated
  quotation, on the record's unsupported list, driving the same bounded
  correction as an invented figure.
- **outside-offer** — real words from a live chunk the turn was not given:
  the model quoting past its evidence. A typed open entry with the anchor
  where the words actually live — never an inline address, because an
  address is a warrant and the turn was not given that material.
- **partial** — an ellipsis quotation part of which is invented: some shown
  segments in the bytes, at least one in no material at all. Eliding is
  legitimate — a quotation may skip material — but every segment it SHOWS
  asserts "these exact words are in the source," so one segment located
  nowhere makes the whole quotation not verbatim. It is a fabrication, not
  a disclosure: it joins the unsupported list and drives the same bounded
  correction as `unlocated`, one finding per invented segment, naming the
  words that failed, and it never earns an inline address — the located
  half is not a warrant for the invented half. Fabrication outranks
  `outside-offer`: a quotation holding both an unoffered segment and an
  invented one is `partial`, so an invention is never filed away as merely
  quoting past the evidence. The citation gate is therefore a WHITELIST —
  only `verbatim` and `drifted` earn an address — never a blacklist of
  known bad verdicts.

The repair is idempotent (a byte-true quote is untouched, an address is
never doubled), quotes below the declared floor (MIN_QUOTE_WORDS = 5) are
never judged, and no material means `unexamined`, never clean.

**Evidence:** the handbook's byte-anchor pass (eoreaderhandbook,
2026-08-16) — a book that already carried per-chapter footers CLAIMING
verbatim quotation was found, on backport, to hold six real drifts, all
silent re-capitalizations of the sources' own words; and eochatX's
citation-check lineage, whose "citation snippeting" and "did you mean"
corrector were left behind by grounding.js as unearned — this policy is
that capability re-earned at answer time. The `partial` clause has its own
evidence, from the audit of 2026-08-16: the verdict existed and NO consumer
read it — quoteFindings filtered `unlocated`, quoteOpens `outside-offer`,
holon folded only quoteFindings — while the citation gate's blacklist
(`status !== "outside-offer"`) passed it, so an ellipsis quotation whose
second half was invented shipped with the first half's chunk address
stamped on it and nothing on the record. Reproduced against quotes.test.mjs's
own corpus: `"the harbour committee had disputed the silting figure ... and
agreed to bury the report before the equinox"` → status `partial`,
quoteFindings `[]`, quoteOpens `[]`, cited `["assembly.txt#0-187"]`.
**Enforced:** `quotes.test.mjs` — pairing across line breaks, the anchor's
round trip through `readRange`, backport-and-cite with idempotence, the
fabricated-quotation finding, the outside-offer refusal to warrant, the
wholly-located ellipsis quotation that still earns its address, the
harbour-committee partial (no address, one finding naming the invented
segment), fabrication outranking outside-offer, the invariant across every
verdict (invented words ⇒ a finding per segment and never a warrant), the
no-material unexamined case, and the declared floor.

## P18 — The terminal is the browser sandbox, whole

The terminal ran a real zsh on the machine under a server PTY. That is
gone — at the user's direction (2026-08-16), removed rather than bypassed:
serve.mjs holds no exec route of any kind, the PTY helper is deleted from
disk, and nothing typed at the prompt can reach the machine. What the >_
opens instead is a registry of runtimes that live entirely in the page:

- **fold** — the instrument itself as commands (sources / search / read /
  folds / record), mechanical, no model, counting the same term overlap
  the chat's own evidence table counts;
- **js** — a dedicated Worker whose egress APIs (fetch, XMLHttpRequest,
  WebSocket, EventSource, WebTransport, importScripts, Worker,
  SharedWorker, caches) are severed at boot, before the first operator
  line runs;
- **python** — pyodide, vendored in node_modules and served from
  localhost like every other byte the page loads (P1: no CDN, hence no
  PyPI — the stdlib plus numpy/matplotlib/pandas is what a session starts
  with). *Amended by P21 (2026-08-17): `pip install <name>` is now a real
  fold command — the wheel organ, closed to pyodide's own ~350-package
  vetted build, never arbitrary PyPI. Everything above about the SANDBOX
  stands unchanged: the crossing is the local server's alone, and nothing
  typed inside a runtime ever reaches further than it already did.*
- **sql** — sqlite via sql.js, vendored the same way; loaded CSV material
  imports as typed tables (the quote-walking parse and the all-or-nothing
  column typing are term.js's own, tested).

Material reaches a runtime only by a visible crossing — "material
crossing into the sandbox: N sources, M bytes", printed where it happens —
mounted read-only (/material in python's MEMFS, material(name) in js,
.load in sql), re-synced only by the explicit `mount`. Runtimes that
cannot exist under P1 are refused with their reasons (bash/zsh/sh, node,
npm, WebContainers, WebVM, ssh) — typed refusals, never half-simulations;
the registry stays open to any runtime a localhost-served module can boot. The sandbox is an authority wall by
construction (P14's own disclosed posture), never claimed as a hardened
security boundary; P1 remains the outer wall. Budgets are named: the
display keeps KEEP_PER_EXEC per command, the sql worker carries
SQL_ROWS_KEPT rows back, and every drop is stated. There is no stdin
because there is no PTY — the runtimes themselves are the REPLs, one
command at a time, and interrupt is worker termination with the state
loss said out loud.

**Evidence:** the live run of 2026-08-16 — python 3.14.2 booting from
localhost, `typeof fetch` → undefined inside the js worker, a quoted CSV
loading as `city TEXT, stops INTEGER, riders INTEGER` and summing
correctly, and the one measured failure while building: the sql
continuation grammar swallowed `exit` and wedged the prompt at "…" —
fixed as the control-word rule, now pinned.
**Enforced:** `term.test.mjs` — the exec route gone from the server and
unreachable from every terminal file, the PTY helper absent from disk,
the seam scan, the severed-list agreement across all three workers, the
continuation grammar including the control-word rule, the CSV walk and
typing, and the roster/refusal shapes; `constitution.test.mjs` II.13
extended over term.js and the workers.

## P19 — A figure is a placement against a nothing, or it is refused

The instrument could draw a file's own rows (P12's tables and charts) and
could not say whether anything in them was more than the file's own
arithmetic. So that question got answered elsewhere, by hand, every time
someone had it — and the sibling `dfr-causal-analysis` repo is the measured
cost of that: of seven analysis scripts, four import eoreader6 by an absolute
path on one laptop (its own paper lists this under limitations: "those runs
cannot be reproduced by a third party"), three hand-roll permutation nulls
with `random.shuffle` and their own p-values, and two report weighted
averages and medians with **no null at all** — in a repo whose own writeup
says "never report a number."

The measuring door (`/measure`) closes that. Everything statistical is the
engine's, used and never copied: `nul` builds the nothing by breaking the
material on purpose and places the observation in it; `emergence/binding.js`
tests co-arrival per pair with its own displacement null. `measure.js` is the
gate in front of them, and the gate is the policy:

- **No figure without a nothing.** A declaration naming a statistic and no
  way of breaking the material is refused `no_ground`. There is no code path
  from a declaration to a bare number.
- **The engine's licensing table is enforced, not restated.** `nul` says of
  its own `LICENSED` map: "NOT enforced inside `ground` … An organ that wants
  the guarantee asks for it." This door asks. An unestablished
  statistic/perturbation pairing is refused `unlicensed_pair`, and the
  refusal carries every established pair *with the material its licence was
  earned on* — so it teaches rather than only blocking. The escape hatch is
  the engine's own: `trying:` in place of `as:` runs the pairing and types
  the result a trial, never testimony, in every phrasing and every row.
- **Never phrased finer than the draws can carry.** Every result rides its
  own floor of 1/draws. A co-arrival no broken copy matched reads "1 in
  draws or rarer", never zero; at twelve draws there is no phrasing in which
  a 95th percentile appears. The word "significant" appears nowhere — it
  names a threshold nobody here declared.
- **Best-of-n gets its own nothing.** Measuring every column and keeping the
  most extreme is refused (`best_of_n`) until a direction is declared, then
  routed to `extremeGround` with n *counted*, never chosen.
- **Every number is declared, by name.** draws and window are refused when
  missing, each with why it cannot be a default; the smallest admissible
  window is the consuming organ's own guard (2 for `nul.ground`, 1 for
  `displacementNull`), never one floor imposed across both.
- **A censored placement is a finding, not an error.** Outside the support
  the magnitude is real and the ground cannot supply a place; surfeit and
  regularity are phrased apart and never pooled.
- **Zero model calls.** A model asked to place a figure against a null could
  only retype numbers it cannot compute. `runMeasurement` is the single
  router both the turn and the eval use, so no caller re-derives dispatch and
  none can skip the gate.

**Evidence:** the door run against real published data
(`eval/measure-real-data.mjs`, 1,021 Santa Ana PD drone flights by local hour,
declarations fixed before the run and never revisited after seeing an output).
The declared question returns *censored above* — the largest 8-hour mean, 59.25
flights, sits above all 200 shuffles, so the concentration is real and the
ground honestly cannot say how far. The same observation against a
spectrum-preserving null lands at 59 of 200, unremarkable — which is why the
licensing gate exists, and why that run can only be had as a trial. Two walls
were found by running it rather than by reasoning about it: the `best_of_n`
refusal was sound and **unreachable** from any typed declaration (`across:`
exists because of it — a refusal no declaration can trigger is a comment, not
a wall), and `nul`'s window floor had been carried across to co-arrival, where
it refused a legitimate window of 1.

**Amended same day (any material, one gate).** The door takes any loaded
file, not only tables. Binary lands as bytes at the drop (a WAV recognized by
its own RIFF header, anything else honest raw bytes), is never chunked or
retrieved (retrieval is term overlap; bytes have no terms), and becomes a
series through the ENGINE'S own frame reduction — `perceiver/audio/reduce.js`,
the pure half split out of the ffmpeg-importing material.js so a page can load
it; rms and flux are statistics of a numeric frame and never ask what the
numbers meant. The reader declares `channel:` (the engine's closed set) and
`frame:` (the grain of hearing) — each refused by name when missing. A
compressed WAV is refused `unsupported_codec`, never half-decoded. And a bare
`/measure <file>` is a PROBE: the file's measurable surface plus example
declarations, computed off the material's own bytes — including a pairs
suggestion that names the column whose values actually recur, counted, after
the live e2e caught the blind version suggesting `pairs:time at:time`
(parseable, degenerate, doomed). Verified end to end in the real app over CDP
— real drop events, real composer submits — on 10,733 USGS earthquakes (mag
clustering censored-above: aftershock sequences, found not asserted), a
planted-burst WAV (positive control censored-above; flat-tone negative
control refused `degenerate_ground`), and a real .pyc measured as raw bytes.
The same live run also surfaced the second CSV-reader bug class: the naive
split burst 10,549 of the file's quoted rows, so one quote-aware walker
(`source.js::delimitedTable`) now serves tables.js, term.js, and this door.

**Enforced:** `measure.test.mjs` — 47 conformance tests against the REAL
`nul/index.js` and `emergence/binding.js` (a stub with a hand-written licensing
table would pass every one of them while proving nothing). Pinned: that no
declaration reaches a bare figure; that the refused pair list IS the engine's
table; that a trial says so in phrase and table alike; that no rank is finer
than the floor; that the best-of-n gate is reachable *through the grammar*;
that each dispatch matches what it would be by hand; and that every refusal
this door can produce carries a detail a reader can act on.

---

## P19 — Priors are gated by a ledger, and their papers ride every crossing

live_priors — the curated corpus one directory up (2,000+ documents in
numbered genre folders, each carrying its publisher's own frontmatter) — is
wired in as a place to stand, never as ambient knowledge:

- **A prior arrives OFF.** The corpus arrived wholesale by fetch script, so
  nothing in it is "material you took the trouble to attach" (the
  attachments switch's own reasoning, inverted by the same logic). Enabling
  is the explicit act, at whatever level the reader means it: everything,
  one genre (`06-government-legal`), one collection
  (`…/world-legislation/de`), one document. live_priors' own boundary —
  browsable, never auto-ingested — is kept.
- **Toggles are an append-only ledger** (`priors/toggles.jsonl`), folded to
  current state; the most SPECIFIC declaration on a document's path decides
  it, and the UI must say whether a state was set at that level, inherited
  (naming the level that decided), or the default — inherited state never
  dresses as chosen state. Every flip is one ledger line AND one record
  event; every document open is recorded WITH the publisher's source URL.
- **Papers ride every crossing.** A document's provenance — parsed
  mechanically from its own frontmatter by priors.js's one parser, never
  composed by a model — goes wherever the document goes: the Sources →
  priors card, the attachment pill, and the re-open dialog of any ref that
  cites it. A prior referenced in the surf answers "says who?" with the
  institution that published it, not with a file path.
- **The gate is the offer surface.** The chat's "already here" door lists
  only what the ledger has in play; attaching goes through
  `/api/priors/doc` so text and papers arrive in one recorded crossing and
  the copy-not-link rule (attachments, 2026-08-17) holds.

Two tiers, one corpus, one parser: priors-toggles.js is this gate;
priors.js is the checking tier (a claim against the library). Both read a
document's papers through priors.js's `parseFrontmatter`/`provenanceOf`, so
the card that shows provenance and the check that cites it cannot drift.

**Evidence:** the live run of 2026-08-17 — the German legislation
collection enabled at its own level (15 documents), one statute
(`BEAMTSTG.md`) vetoed at its own path and correctly excluded (14 in
play), the tab's chips reading "set at this level" / "inherited from …" /
"the default", ARBZG.md attached through the door with
"Arbeitszeitgesetz · BMJ … · in_force · gesetze-im-internet.de" riding the
pill, and `prior-toggle` / `prior-open` rows on the record carrying the
official source URL.
**Enforced:** `priors-toggles.test.mjs` — default-off with no decider
named, most-specific-wins naming its level, last-write-wins over the
ledger with bad lines counted, papers through the shared parser with
offsets naming the file on disk; `priors.test.mjs` (the sibling tier)
pins the parser both faces.

---

## P20 — A cited link is checked before it is asserted, never taken on its own word

A URL in an answer is P17's own claim one register over: "these exact
words are in the source" for a quotation, "this address is real, go look"
for a link — and the one claim local material containment cannot judge by
itself (P11 can confirm a URL's BYTES appear in what was read; it cannot
confirm the address exists). By user direction (2026-08-17), a cited URL is
now checked mechanically, exactly the way a quotation is: every distinct
URL in the settled draft, not already grounded in the loaded material's own
bytes, is fetched through the P13 egress and read with the SAME organs
`fetchAndKeep` already uses to judge any page (`looksLikeChallenge`,
`extractReadable`) — never a second, invented threshold. Five verdicts:

- **in-material** — the literal address is in the loaded material's own
  bytes. No network needed; this ground is free, and checked against the
  WHOLE loaded corpus (`live`), not just the current part's narrower
  retrieval — quotes.js's own offer/pool distinction, because a sibling
  part's material still counts as material.
- **resolved** — fetched, answered 2xx, reads as real content.
- **unreachable** — the fetch failed, answered outside 2xx, or held nothing
  readable: a fabricated citation, mechanically caught. `stripDeadLinks`
  replaces it in the shipped text with a named marker
  (`[link removed — did not resolve: …]`) — never rendered as a plain,
  working-looking link — and the finding joins the record's unsupported
  list, the same treatment an invented figure or a fabricated quotation
  already gets.
- **challenge** — the host is real but answered a bot-challenge page;
  disclosure only, never accused of fabrication (the same posture web.js
  already gives a challenge page elsewhere).
- **unexamined** — no check ran (the standing web consent, `state.webProof`,
  is off, or the turn's link budget was already spent). A gap, never
  silently treated as verified — a cited URL ships exactly as written when
  the reader has not turned checking on.

**Why once, and why mechanical, not another correction round trip.** A
fabricated name or an unlocated quotation is caught by free, local
containment, so `inspect()` re-runs it every correction retry and the model
gets a chance to fix its own invention. A link check is a live network
crossing — re-running it per retry would multiply live fetches for no
gain, and P9 already treats automatic egress as a bounded backstop, not a
thing to spend per iteration. So the link tier runs ONCE, after the
correction loop has already settled, capped at `LINK_CHECKS_PER_PART` (the
same duty PROOF_TARGETS_PER_TURN names for proof-seeking: automatic egress
the instrument decided to make, not a click the reader made, bounded and
the bound stays visible) — and a genuinely fake URL is fixed the same way
the mechanical fallback already fixes a stubborn model: the instrument
does it itself, deterministically, rather than trusting another round trip.

**Files.** `links.js` (pure: URL extraction with balanced-paren trimming so
a real address like Wikipedia's own `…Something_(disambiguation)` is never
truncated into a different, nonexistent one before it is checked; the
verdict fold; `linkFindings`; `stripDeadLinks`) + `links.test.mjs`;
`holon.js`'s `runPart` accepts the injected `checkLink` async organ (this
module owns no network — the caller fetches, `links.js` only folds the
result, the proof.js `foldProof` pattern exactly) and runs the tier right
after the quote repair; `app.js`'s `checkLinkCitation` is the organ,
reusing `/api/web/fetch` — the SAME recorded egress every other page read
goes through, so a model-cited URL lands in web history exactly like any
page the reader asked to read, because from the record's point of view
that is what happened: the instrument decided to look. Gated behind
`state.webProof` (P13's standing web consent) at the `runHolonicTask` call
site in `app.js`, the same switch proof-seeking already asks for.

**Known scope boundary, disclosed rather than implied as complete.** The
sentence-level MATERIAL/MODEL ground and stripe machinery (P12,
`provenance.js::classifySentences`) is NOT extended to link verdicts in
this pass — a `resolved` or `in-material` link earns no special inline
badge beyond surviving unmodified, and an `unexamined` one ships with no
visual mark distinguishing it from checked prose. `provenance.js` was
actively mid-edit by a concurrent session when this landed (a narration-
stripping feature, uncommitted); extending the stripe vocabulary to links
touches the same sentence-classification core and is named future work,
not folded in here to avoid compounding that collision. What this policy
guarantees today is narrower and load-bearing on its own: a fabricated
link never ships as a plain, working-looking citation.

**Evidence:** the live design constraint of 2026-08-17 — this repo's own
`explore-server.mjs::archivePage` was found, in the same session, trusting
Wayback's Content-Location header for a "stable snapshot" link without
ever confirming the address resolved (fixed the same day, `verifySnapshot`,
same organs); the model-citation case is the same failure one layer up,
where the far side making the claim is the model itself, not an external
service's header.
**Enforced:** `links.test.mjs` — extraction with the balanced-paren case
(a Wikipedia-shaped URL survives; a sentence's wrapping paren does not),
in-material short-circuiting before any fetch, every verdict branch
(resolved / unreachable / challenge / unexamined), idempotent repair,
right-to-left offset safety with multiple dead links in one draft; the
`checkLink` injection point in `holon.test.mjs` — off ships a URL
untouched, on strips an unreachable one and records the finding, a
resolved one ships unmodified and is fetched exactly once, and a URL
already in the wider loaded corpus is never fetched at all (asserted by
making the fake `checkLink` throw if called).

## P21 — The wheel organ: pip installs are a second sanctioned egress, closed to a vetted set

P18's "nothing typed here reaches the machine" is amended, not repealed:
the sandbox itself gains no new capability, and every guarantee P18 names
— severed workers, no exec route, no stdin, no PTY — stands exactly as
before. What is added is ONE more egress in the local server only
(`explore-server.mjs` `POST /api/wheels/install`, pure half in `wheels.js`)
to exactly one destination — pyodide's own package mirror, the SAME CDN
`scripts/fetch-pyodide-packages.sh` already pulls numpy/matplotlib/pandas
from — for exactly the packages that mirror's own lock file
(`pyodide-lock.json`) declares: a closed, pyodide-vetted set of wasm
builds, currently 356 packages, never arbitrary PyPI. `pip install <name>`
is a fold command, not Python: it asks the server to walk the requested
name's transitive dependency closure, fetch whatever is not already
vendored, sha256-verify EVERY wheel in the closure (freshly fetched and
already-on-disk alike, so a corrupted prior download is caught rather than
trusted) against the lock's own declared hash, and write it to
`node_modules/pyodide/` — the same disk location `indexURL` already
points at. Nothing downstream changes: `term-py-worker.mjs`'s existing
`loadPackagesFromImports` mechanism (untouched by this policy) picks up
whatever sits there, vendored or freshly fetched, on that runtime's next
FRESH session's first line — exactly as it already does for
numpy/matplotlib/pandas, inheriting the same disclosed constraint (only
the first exec's imports resolve; fetch severs right after). A name typed
inside a running python session as `pip install x` is still refused, not
silently reinterpreted — it never was valid Python, and the refusal now
redirects to the real fold command rather than claiming installs are
impossible.

Every crossing lands on the record before the fetch begins
(`wheel-install-requested`, naming the full closure and what actually
needs fetching) and again once it resolves or fails
(`wheel-install`/`wheel-install-failed`) — a name outside the lock is
`wheel-install-refused` and never touches the network at all. Two named
budgets bound the crossing (P9: named, with a duty): `WHEEL_MAX_BYTES`
(90MB, one wheel) and `WHEEL_CLOSURE_MAX_BYTES` (260MB, one install's
whole dependency closure) — a name whose closure exceeds the bound is a
typed `censored-above` refusal, never a half-fetched, half-usable state.

**Disclosed limit, not a silent absence.** This is NOT a general PyPI
organ. A pure-Python package outside pyodide's own build (arbitrary PyPI
via a real `micropip`/PyPI-JSON tier) is refused by name
(`gap.silence: "not-present"`, the reason stated) — a materially broader
crossing (an open-ended host, not one pinned mirror; arbitrary code
selected by whatever a request names) that deserves its own amendment,
weighed on its own, not folded in here to make this pass look larger than
it is.

**Evidence:** the live measurements of 2026-08-17 — a request for a name
outside the lock (`totally-not-a-real-package-xyz`) refused in the typed
shape above, zero network calls made; `pip install networkx` resolving a
15-wheel transitive closure (networkx itself pulls in matplotlib, and from
there numpy/pillow/kiwisolver/fonttools/…), 3 of the 15 not yet vendored,
fetched and sha256-verified in 1.5s; a repeat call resolving the same
closure with `fetchedNow: []` in 25ms (every wheel re-verified against
its hash on disk, not merely checked for existence); the whole loop driven
live end to end through the real terminal UI — `pip install networkx` at
the fold prompt, `exit`, a fresh `python`, `import networkx as nx; g =
nx.Graph(); g.add_edge("a","b"); print(nx.number_of_nodes(g))` as that
session's first line, printing `2`; and, separately, `pip install
requests` typed AS PYTHON inside a running session, correctly refused with
the redirect to the real command rather than a stack trace.
**Enforced:** `wheels.test.mjs` — the closure walk against a fixture lock
(a leaf, a diamond dependency deduplicated to one wheel, a lowercase-name
fallback, a miss returning null, every wheel carrying exactly its own
hash); `term.test.mjs` — `pip` is confirmed absent from `REFUSED` and the
in-Python guard is confirmed still present with its new redirect;
`constitution.test.mjs` II.13 is unchanged by this policy because
`explore-server.mjs` (where the one real crossing lives) and `wheels.js`
(pure, zero egress calls, never loaded by the page) both sit outside the
browser's own page graph — the same seam `web.js`'s sibling crossing in
that same server file already relies on.

---

*Established 2026-08-16, alongside the holonic layer, the constitution
channel, and the local-only excision. The lineage evidence cited here was
gathered by a five-reader sweep across eochat, eochatX, eoWebLLM, and the
engine; the full brief is preserved in that session's task output.*

## P22 — The terminal language: nine operators, one composition law, one capacity executing

`grid.js` (+ `capacities.js`, `grid.test.mjs`) implements the near-horizon
build `SEED-CREATION-LANGUAGE.md` names first and the fuller Terminal
Language document specs in full: a composition law —

    <verb> [<object>] at <terrain> from <stance>
      [ground <ground> broken:<perturbation>] [because <trigger>]
      [supersedes <event>] [warrant:<giver>]

— parsed into a typed event or a typed refusal, landed on the engine's own
append-only task log (`holon/task-log.js`, injected — the same
`createTaskLog`/`append`/`projectTasks`/`checkCubeProgression` machinery
build-log.js already trusts), folded on request. Reachable at the terminal
as three new fold commands: `act <line>` (parse and land one act on this
session's own log — never persisted, matching term.js's standing "terminal
acts are not on the record" posture), `grid` (fold the live acts, plus
DEF/EVA landing status; `grid legend` prints the fixed 9×9×9 reference
table, one command away rather than fronting the page — the same posture
Explore's own legend view already holds), and `capacities` (list the small
capacity registry `synthesize`'s parts are checked against).

**Reused, not re-derived.** The nine operators (NUL SIG INS SEG CON SYN DEF
EVA REC), the terrain grid (`TERRAIN_BY_DOMAIN`), and the append-only log
discipline all come from `packages/engine/operators.js` and
`holon/task-log.js` (`../eoreader6.1`) — grid.js adds the composition-law
surface and the stance axis on top, never a second copy of the algebra.
Three reconciliations were necessary between the Terminal Language document
as handed down and what this repo already ships, and grid.js's own header
carries the full reasoning; the load-bearing facts:

- **Operator order.** The document's prose names a "HELIX order" (NUL SIG
  INS SEG CON SYN DEF EVA REC). `task-log.js`'s own header — without
  spelling out that sequence's own letters — records that "an invented
  HELIX ordering" existed once as a hand-rolled application copy, and was
  superseded by the engine's real `OPERATOR_ORDER` (NUL SEG
  SIG CON EVA DEF INS SYN REC) — the one `validateChain`/
  `checkCubeProgression` actually enforce. grid.js uses the engine's order.
- **Terrain is medium-blind, even past the engine's own domain lock.**
  `operators.js::cellOf` ties an operator's terrain to its own fixed
  domain (SIG/INS are always Existence-domain, so `cellOf` alone could
  only ever land a `distinguish` on Void/Entity/Kind). The document's own
  §5 worked example uses `distinguish at Network from encounter` — Network
  is Structure-domain — and states why directly ("the operator is
  medium-blind"). `at <terrain>` is therefore taken as authoritative here,
  never re-derived from the verb's own operator letters; `cellOf` is not
  called to second-guess it.
- **Stance is a genuinely new, independent axis**, not derived from the
  operator's own fixed mode the way `operators.js::STANCE_BY_MODE` is. Its
  labels (Clearing, Dissecting, Cultivating…) only mean something when an
  operator and its terrain share one domain — exactly what the point above
  says this module does not require — so grid.js does not import or
  display them; the document's own mode/grain vocabulary is the only
  stance vocabulary landed here.
- **`encounter` is grain-flexible**, unlike the other three named
  shorthands (`extraction`, `cultivation`, `closure`, each locked to one
  grain). The document's own table format wants one fixed cell per
  shorthand, but its prose introduces `encounter` loosely across two
  cells, and §5's own worked example (`distinguish at Network from
  encounter`, Pattern-grain) and §2 ("read launchers default to
  `encounter`" across launchers of every grain) both only parse if
  `encounter` resolves like bare `generate` — any grain, taken from the
  terrain. Pinned as a regression in grid.test.mjs, verbatim against the
  worked example.

**What actually gates, checked against the real algebra, not decorated.**
Every refusal named in the document's own operator table is implemented as
a real, tested check — `void`/`distinguish`/`evaluate` require a named
`ground … broken:<perturbation>`; `separate` refuses at a Ground-grain
terrain or against an object not yet individuated on this log;
`relate` refuses two referents that are not yet established on the log
unless the edge carries `warrant:<giver>` (offered rather than
established — the document's own referent-resolution ladder); `synthesize`
refuses parts sharing no warranting relation and matching no capacity;
`revise` refuses without both a trigger and a target already on the log;
the one stance-law rule the document names (`synthesize` may not declare
`from relate`) is enforced directly. `define` is the one exception, by
design: no refusal fires at parse time for a missing companion `evaluate`
— the document is explicit that this is a FOLD-time fact ("a define lands
on the record only if its evaluate clears"), so `foldGrid` computes each
`define`'s landing (`wish` / `testimony` / `refused`) by matching it to a
same-object `evaluate` and its declared verdict.

**Disclosed, not silently absent.** `capacities.js` seeds the SEED doc's
own "prior set" with ten entries naming real modules/functions already in
this repo (cast.js, hypergraph.js, measure.js, build-log.js, witness.js
among them) — a DATA TABLE, checked against the real engine's own
domain/grain algebra by hand while it was written (two entries were caught
domain-illegal this way and fixed — see the module's own header). No
capacity is executed from the terminal this pass: `distinguish`'s deeper
refusal ("the figure doesn't clear it," a real statistical clearance) and
`void`'s perturbation-licensing check (nul/index.js's own LICENSED table,
or measure.js's `admit`) are both named as the natural next integration
and not faked here. `evaluate`'s verdict (`verdict:holds` / `verdict:
refused`) is DECLARED by whoever writes the line, not yet mechanically
computed — the SEED doc's own third named thread ("EVA need not be
hand-coded per capacity") is exactly this gap, still open. Read launchers
(§2 of the document), make launchers (§2), `spin`/the Python sandbox (§3),
and the retrieval-compose-slotfill authoring path (§7) are all unbuilt —
named in the document's own §9 build order as later passes, not implied
done by this one.

**Evidence:** `grid.test.mjs` — 47 conformance tests against the REAL
`operators.js`/`task-log.js` (grammar acceptance per verb, every named
refusal, the illegal stance-law cell, `distinguish` landing two real
task-log entries with `checkCubeProgression` staying silent on the pair,
append-only supersession via `revise`, and the three DEF landing states).
Driven live end to end through the real terminal UI (not just the module
in isolation): the §5 worked example's own `distinguish at Network from
encounter ground drone-log broken:rotation` lands two entries and prints
`SIG·Pattern`/`INS·Pattern`; a `relate … warrant:` lands without either
referent pre-established; `synthesize cast, zone-2` lands because `cast`
resolves against the capacity registry; a bare `define finding` folds as
`wish` until a same-object `evaluate … verdict:holds` lands, at which
point `grid` reports it `testimony` — exactly the document's own
load-bearing rule, live.

**Five real bugs, caught by an independent adversarial review before this
policy was written, fixed rather than shipped and disclosed after the
fact.** DEF/EVA companion matching used `Array.find` (first-match, so a
second same-object define could borrow the first one's verdict, and a
corrected re-evaluate could never win); `synthesize`'s relation check used
`String.includes` against a `relate` act's raw text (`"zone"` matched
inside `"zone-99"` though never itself related); the `ground`/`broken:`
check used `||` where the grammar means `&&`; `relate`'s "to" split and
`synthesize`'s comma split both ran on the already-joined, quote-stripped
object string, fracturing a referent whose own name contained the
separator; `capacities.js`'s only test checked terrain validity, never
domain-consistency with the declared op — the exact class of bug its
header already says was caught "by hand" twice. All five are now
regressions among the 47 cases (CLAUDE.md's own section has the full
account, bug by bug).
**Enforced:** `grid.test.mjs` — 47 cases total, capacities.js's own
(terrain/field validity, domain-consistency, id lookup, the refusal shape)
folded into the same file rather than a separate one, since capacities.js
is a small data table grid.js's tests already exercise directly;
`term.test.mjs` is unchanged (it tests only term.js's pure
exports, never `initTerminal`) — the new `act`/`grid`/`capacities` fold
commands are additive and `bridge.grid` is optional, so a caller (or a
Node test) that has not wired it still boots a working terminal;
`constitution.test.mjs` II.13 passes unchanged — grid.js/capacities.js are
plain relative imports and the one new `/engine/operators.js` import sits
beside the already-allowed `/engine/holon/task-log.js` import next to it.

**Amended same day — `cast` executes.** `capacity-runner.js` (new, pure,
organs injected — the exact bundle `app.js` already builds for `castFor`)
runs `cast.js::makeReferentIndex` for real when a landed `distinguish`'s
`ground` clause names an already-loaded source (checked by key presence,
not truthiness, so a name that resolves to nothing loaded stays a silent
ordinary abstract `distinguish` — no capacity runs, no gap prints — while
a name that resolves to an empty source correctly prints `no_material`);
the referents found attach as a task-log RESULT on the act's INS entry
(`grid.js`'s new `attachResult`). The other nine registered capacities
still refuse to run — `not_yet_executable`, named — never a silent no-op.
`cast.js` has no null test of its own, so this closes "nothing is
callable," not "`distinguish`'s statistical clearance is checked" — that
refusal (and `void`'s perturbation-licensing check) remain open, as P22's
own text above already said. Two further limits, found by a second
adversarial review and disclosed rather than fixed under time pressure
(capacity-runner.js's own header carries the full reasoning): `cast` runs
synchronously on the calling thread, unbounded and uninterruptible —
unlike term.js's other three runtimes, which are Workers for exactly this
reason; and a result attached to a `distinguish`'s INS entry does not
survive the SIG half of its own pair being superseded on its own —
`revise`-ing the wrong id of a SIG/INS pair orphans the surviving one,
result and all. Neither is attempted this pass. **Evidence:**
`capacity-runner.test.mjs` — 5 tests against the real engine perceiver
organs and real prose (referents actually discovered for a two-name
passage; a DIFFERENTIAL test — two different passages, two different
names — proving the output tracks the real input rather than two
hardcoded strings; an unknown id refused by name; empty text refused as
`no_material`; referent-free prose landing a real empty result rather
than a gap); `grid.test.mjs` grew 2 more for `attachResult` (49 total).
Driven live end to end, not only in test files: a real source dropped
onto the real page, `act distinguish who-is-here at Entity from encounter
ground excerpt.txt broken:rotation` finding and landing its two real
referents, `grid` still showing them attached after the fact.
**Enforced:** same two test files; no other suite is touched.

**Amended 2026-08-18 (third occurrence) — the chat's own `/act` door, and
`landAct` as the one shared landing.** The user's direction, verbatim:
"think the chat should be able to drive terminal work and things using
python and what not." This amendment builds the lower-risk half only —
composing the SAME nine-operator composition law from the chat composer,
never a raw-execution door — and states the reasoning for scoping it that
way rather than assuming it: `grid.js` already refuses a malformed or
unwarranted act BY GRAMMAR, so the blast radius of a chat-triggered act was
already bounded before this landed; running arbitrary Python/JS/SQL from a
chat message is a materially bigger step (P18's "nothing typed here
reaches the machine" and the Folds panel's own "consent to execute is
still earned by an explicit ▶ run" both cut against a model-triggered
execution door), and is deliberately NOT built here — see CLAUDE.md's own
section on this amendment for the recommendation held open pending
confirmation, not silently assumed.

**No new policy substance — a second door onto the identical, already-
governed mechanism.** The refusal grammar, the terrain/stance rules, the
one-capacity-executes boundary — all unchanged; a line means the same
thing whether composed at the terminal or in chat, and grid.js was not
touched to make this true. EXPLICIT-TRIGGER ONLY, matching this repo's
`/self`/`/priors`/`/reflect` doors: `/act <line>` is checked among the
other typed doors (`app.js`, before any automatic detector or the widget
router), so the model never decides on its own to compose an act — only a
person typing the door reaches this grammar, the same posture every other
slash door already has.

**One shared implementation, not two.** Before this, "a landed
`distinguish` whose `ground` names an already-loaded source runs `cast`
for real" was policy embedded inside term.js's own DOM-bound `act` handler
— exactly the shape of bug this policy's own postmortem already caught
twice (DEF/EVA's `Array.find` first-match bug, `synthesize`'s
`String.includes` substring bug: one correct implementation, and a second
place nobody kept in sync with it). `landAct(grid, log, line, { sources,
runCapacity })` (capacity-runner.js, new) is that orchestration moved to
one place and called by both doors — term.js's `act` fold command and
app.js's `actTurn` — so the terminal and chat compose against the
identical policy by construction, not by two authors remembering to keep
two copies in step.

**The log is shared, app-wide, not per conversation.** `state.gridLog`
(app.js) holds the SAME log both doors read and write — `grid.createLog()`
once, alongside `state.builds` rather than in `PER_CONVO` (the same
reasoning `builds` already states: "a build belongs to the instrument, not
to one conversation" — an act belongs to the instrument the same way).
`initTerminal`'s bridge gained `gridLog`/`setGridLog` accessors, the same
shape `sources`/`chunks`/`muted`/`folds` already have; term.js's own
`readGridLog`/`writeGridLog` fall back to a page-local log when a caller
hasn't wired sharing (a bare bridge, a Node test), so nothing that worked
before this lands differently now.

**Recording follows the same rule this policy already states: one file,
reused.** `actTurn` mirrors onto the identical
`record/explore-record.jsonl` via the SAME `POST /api/term-record` →
`record(event, fields)` route term.js's own `mirrorTerm` already uses —
never a second file or a second reader — adding one field, `via: "chat"`,
so the record can tell which door an act came through without a second
event vocabulary. A miss (no explore server reachable) is silent, matching
`mirrorTerm`'s own long-standing default.

**Evidence, driven live end to end through the real chat UI, not only in
test files.** Bare `/act` renders the usage line, mechanically, no model
call. `/act distinguish zone-3 at Network from encounter` (no ground)
refuses with the typed `no_ground` detail, exactly as the terminal does.
Real material pasted as an attachment (`pasted.txt`), then `/act
distinguish who-is-here at Entity from encounter ground pasted.txt
broken:rotation` typed in the chat composer lands two entries and runs
`cast` for real, printing the two real referents found (Bezukhov,
Rostova) — then opening the terminal and typing `grid` shows the
IDENTICAL entries with the IDENTICAL attached result, proving the shared
log, not a parallel one. The reverse direction was also driven live: an
act composed AT THE TERMINAL appeared correctly folded when the NEXT
chat-composed act read the log (continuing its own id sequence rather than
starting over). A brand-new second conversation tab, opened after acts
already existed on the log, saw and continued the SAME log immediately —
proving `gridLog` is genuinely app-wide, not scoped to the conversation
that composed it. `capacity-runner.test.mjs` grew 6 new cases for
`landAct` itself (a parse refusal lands nothing; an ordinary act lands
with `capacity: null`; a `ground` naming nothing loaded stays silently
ordinary; a `ground` naming a loaded-but-empty source reports
`no_material` without attaching; a `ground` naming real material runs
`cast` for real and attaches the result, re-discoverable by folding the
returned log; and two sequential `landAct` calls compose — the second
call's refusal proves it folded against the first call's own landed
acts, not a fresh log) — 670 total, 666 passing, the same 4 pre-existing,
unrelated failures (`measure.test.mjs`, three `webllm-rung.test.mjs`
cases — missing large vendored files, not something this amendment
touches).

**One pre-existing, harmless characteristic surfaced by sharing, disclosed
rather than silently absorbed.** `attachResult` appends a RESULT entry to
the log, and EVERY append — RESULT included — advances `task-log.js`'s own
`nextSeq`, which `grid.js`'s `nextEventId` reads to name the next act. A
`distinguish` whose ground triggers `cast` therefore consumes THREE
sequence numbers (SIG, INS, then the invisible RESULT), so visible act ids
run 0, 1, 3, 4, 6, 7 rather than 0, 1, 2, 3 whenever capacity execution is
in the mix. This predates this amendment — the identical id-consuming
call sequence (`land` then `attachResult`) already existed in term.js's
own original `act` handler — and is harmless (ids stay unique and
monotonic; nothing collides or overwrites); it is simply more OBSERVABLE
now that both doors write the same counter. Not fixed here — a cosmetic
numbering gap, not a correctness defect — but named so a future reader
does not mistake it for one.

**Two limits carried over unchanged, not touched by this amendment.**
`cast` still runs synchronously and unbounded on the calling thread from
EITHER door (capacity-runner.js's own disclosed limit, above); a `revise`
superseding the wrong half of a `distinguish`'s SIG/INS pair still orphans
the surviving entry's result. Neither is this amendment's to fix.

**Files.** `capacity-runner.js` grew `landAct` (+6 tests,
`capacity-runner.test.mjs`); `term.js`'s `act`/`grid` fold commands now
call `landAct` and read/write the log through `readGridLog`/`writeGridLog`
rather than a private field (`term.test.mjs` untouched — it never exercises
`initTerminal`); `app.js` grew `state.gridLog`, `actTurn`,
`mirrorTermRecord`, the `/act` door in the turn dispatcher, and the
`gridLog`/`setGridLog` accessors on the `initTerminal` bridge call.
**Enforced:** `capacity-runner.test.mjs` (11 cases total); `term.test.mjs`
and `grid.test.mjs` unchanged and still passing, confirming the refactor
changed no behavior their own suites already pin.

## P23 — A materialless question is answered by fetching first, not by checking after

Measured live 2026-08-18: asked "research the weather in NYC right now"
with nothing attached, a model invented "70 degrees, sunny." `checkGrounding`
did exactly what it should — `examined: false`, a deliberate withholding,
no material exists to check against. The failure was one door up:
`extractCheckableAtoms` (P4's own disclosed no-material fallback, "give the
web tier candidates on a genuine world-claim nobody sourced") then treated
every number and name in the model's OWN drafted sentence as unconditionally
unsupported, so proof-seeking searched for "70" and read an RV blog and a
"best year-round climates" page — never NYC weather, because `proofQuery`
reads only `claim.text`/`claim.sentence`, and both were the model's
invention. Asked "prove it," it got worse: the follow-up drafted a SECOND
fabrication ("I did just check a weather app"), and the search ran on that.
Every organ in the ladder was individually honest; the sequence — draft
first, check after, search on whatever the draft said — manufactured a
search for evidence of the hallucination instead of evidence about the
world.

**The fix is not another check — it is moving the existing checks earlier.**
Predictive processing, named because that is exactly the shape: the question
"is there material to check a draft against" is asked BEFORE the draft
exists, not after, so the answer can be "go get some" instead of "invent
something to blame." Three changes, one mechanism, no new checking logic:

- **The question travels with the finding.** `checkGrounding` and
  `extractCheckableAtoms` (grounding.js) now fold the turn's own question
  into each finding's `sentence` — the same anchor the single-source
  corroboration door in app.js already carries ("the question is the
  conversation's own anchor," P13's existing evidence), centralized at the
  source so every consumer of a finding inherits it, not just that one door.
  A topic-less follow-up's own drafted sentence may name nothing; the
  question still does.

- **Discourse anchors a flat turn's retrieval and its grounding question,
  never a decomposed part's.** `runPart` (holon.js) takes a `flat` flag,
  true only for the single part `runHolonicTask`'s `planMode: "flat"`
  proposes. When flat, both retrieval's `question` and the grounding check's
  `groundingQuestion` fold in `discourse` — the fold's own one-line
  topic/flow/entities summary. "Prove it" shares zero terms with anything;
  `retrieve()` (source.js) filters out any passage with zero term overlap by
  design (P4), so without this a flat follow-up could never retrieve
  material fetched for exactly its own question. Decomposed multi-part
  tasks are untouched — `flat` defaults false, and their narrow per-part
  scoping (the `strayed` disclosure already in holon.js) stays exactly as
  deliberate as before.

- **A preflight, not a post-hoc label.** `shouldPreflight` and
  `preflightQuery` (proof.js, pure, tested offline) name the gate and build
  the anchor; `gatherPreflightMaterial` (app.js, the one crossing, mirrors
  `seekProof`'s own pure/impure split) is the thin orchestrator. When a flat
  chat turn has nothing attached and both standing toggles — checking mode
  (`state.grounded`) and web consent (`state.webProof`) — are already on,
  it searches ONCE on the turn's own words plus `discourse`, before the
  model drafts anything, and folds any pages found into that turn's
  retrievable chunks via the SAME `chunkSource` (source.js) every
  attachment is chunked with. What follows — retrieve, checkGrounding,
  attribute, corroborateAtoms, resolveName, the relation tier — is the
  EXISTING ladder doing real work against real bytes, not a second checking
  mechanism. Turn-scoped: nothing is written to `state.sources`, so no
  attachment pill appears and nothing persists past the call — the same
  posture `seekProof`'s own `faces` pool already has for pages read
  mid-turn. The raw pages are still durably saved server-side by the same
  P13 fetch every read goes through; a reader who wants one as a standing
  attachment still opens it from web history, same as any other saved page.

**Why unconditional within the gate, never a guess at which questions
"need" it.** `shouldPreflight` is deliberately NOT a semantic classifier of
question intent — this repo's own history (widget.js's rewrite away from
hand-typed intent word lists) is the standing argument against exactly that
move, and the asymmetry here is the same one that argument turns on. A
false positive costs one wasted search on a turn that didn't need it —
`checkGrounding` runs fine against irrelevant material, a sentence sharing
nothing with it just stays unattributed, the same honest outcome as no
material at all. A false negative reproduces the bug this policy exists to
close. So the gate is purely structural — flat, nothing attached, both
toggles on — never a guess about the question's own words.

**Disclosed costs and residues, not hidden.** A materialless
grounded+web-on question now spends one search before its first token,
unconditional within the gate — a real latency cost on every such turn,
including ones (a poem, an explanation) that never needed fresh material;
`checkGrounding` and `provenance.js`'s classification handle the resulting
low-overlap material honestly, but the fetch itself is not free and is not
skipped by guessing it was unnecessary. Decomposed (multi-part) tasks are
out of scope for the preflight door — each part already retrieves on its
own words, and adding a second material-gathering pass there is unscoped,
named rather than silently attempted. A citation the model attributes to a
preflight-fetched passage resolves to a `web:<host>-<n>` source name not
present in `state.sources`; "open in Explore" on that chip fails caught
(app.js's existing `openInExplore().catch`), not working — wiring these
into the same reopen path attachments use is unscoped for this pass.

**Evidence.** Live, end to end, against a running instrument
(`qwen2.5:14b-instruct-q4_K_M`, real DuckDuckGo search, real fetched pages):
"research the weather in NYC right now" with nothing attached now narrates
"nothing attached — checking the web before answering…" then "found 3
page(s) · 127 passage(s) to answer from" BEFORE the draft is written; the
shipped answer carries no fabricated figure. The follow-up "prove it" —
sharing zero words with weather content — preflights again (turn-scoped,
nothing persisted from the first turn), finds 3 pages, and RETRIEVES 3
passages from them; the shipped answer is "standing on the material: 3
sentence(s)," every sentence cited to `web:accuweather.com-0#…`, not one
invented figure. 90 auto-generated regression scenarios (diverse topics —
weather, stocks, sports scores, population figures, historical dates,
exchange rates, company founding years — diverse topic-less phrasings of
"prove it") run through the real `runHolonicTask`: 88/90 matched
expectation exactly; the 2 near-misses were fixture-generation artifacts
(the scenario's own task words incidentally overlapped its material by a
common word — "time," "week" — independent of discourse, i.e. baseline
`retrieve()` behavior unrelated to this policy, confirmed by inspecting the
fixtures directly rather than assumed).

**Files.** `proof.js` (`PREFLIGHT_PAGES_CONSULTED`, `PREFLIGHT_QUERY_MAX_TERMS`,
`shouldPreflight`, `preflightQuery`, each declared and tested per P9/P4);
`grounding.js` (`checkGrounding`, `extractCheckableAtoms` — the
question-into-sentence fold-in); `holon.js` (`runPart`'s `flat` parameter,
threaded through `runHolonicTask`'s `runLive`); `app.js`
(`gatherPreflightMaterial`, and the preflight call site in `holonicTurn`
right before `runHolonicTask`).

**Enforced:** `proof.test.mjs` (`shouldPreflight`'s exact structural gate;
`preflightQuery`'s discourse-anchored construction and its term cap;
`extractCheckableAtoms`/`checkGrounding` carrying the question into
`sentence`); `holon.test.mjs` (a flat topic-less follow-up retrieves with
discourse present, retrieves NOTHING without it — proving the anchor is
causal, not incidental — and a decomposed part stays narrowly scoped even
when discourse names the exact right topic). 626 of 628 repo tests pass;
the two failures (`arithmetic.test.mjs`, `measure.test.mjs`) are
pre-existing and unrelated — a missing `mathjs` dependency and a stale
`eoreader6` path respectively, neither file touched by this policy.

**Amended 2026-08-19 — the join is earned, never assumed (stable
sub-assemblies, user direction: "change the way the prompting happens to be
stable sub assemblies, we are not following our own best practices").** The
original P23 folded the discourse line into the preflight search, the
retrieval question, and the grounding question UNCONDITIONALLY on a flat
turn. That fixed the topic-less follow-up and broke every self-contained
question asked after a topic change — measured live, three ways in one
short conversation: "research Robert Macnamera" asked right after a
greeting searched the web on the stale line's own words ("Greeting
exchange"), fetched a greeting-etiquette page, retrieval preferred it
(the misspelled name matched nothing; the stale words matched everything),
and the shipped answer described greetings with a fabricated "[4]";
"what is my name?" then searched and answered from a stranger's faculty
page; and proof-seeking inherited the same soup ("4 Conversation Macnamera
research Greeting exchange greeting Robert" as a literal search). The
user's null stood: a regular model with the full context would have
performed better than the apparatus. Four mechanical fixes, one principle —
each prompt is assembled from typed sub-assemblies (the question, the
conversation, the material), and no assembly's words enter another's
derived query unless the join is EARNED: (1) `runPart` retrieves on the
part's own words FIRST; only when that returns zero passages does a flat
part widen with the discourse line, and the widening lands on the research
progress event (`widened`), never folded silently. (2) The grounding
question joins the discourse only where the task's own words demonstrably
failed to anchor — retrieval widened, or no passages exist at all (the
original P23 case, preserved by construction). (3) `preflightQuery` takes
task and discourse as separate arguments (the call site no longer
pre-mixes them) and joins only when the task points back anaphorically —
the engine's own ANAPHORIC_PRONOUNS, injected, the widget.js pattern —
or carries no content words at all. (4) The flat material path now sends
the REAL role-structured chat history between the system prompt and the
part prompt — it used to drop the conversation entirely the moment
passages existed, which is exactly when it fired. Also closed in the same
pass, found by the same live conversation: `EXECUTE_SYSTEM_PROMPT` and all
three correction prompts still ordered "cite the address in square
brackets exactly as it appears" after the 2026-08-18 change removed every
address from the model's view — an instruction referencing a thing the
pipeline mechanically removed is a fabrication order, and "[4]" /
"[Faculty & Research]" were the model obeying it the only way it could.
The citation clauses are deleted; cite.js's mechanical attachment was
already the only real citation channel. Enforced: `holon.test.mjs` (a flat
question whose own words retrieve material never inherits the stale
topic's passages; the flat material call carries verbatim history; the
"prove it" pair and the decomposed-part wall all still pass unchanged) and
`proof.test.mjs` (`preflightQuery`'s earned join, both directions, with
the real engine closed class). The dangling-address half of the residue
was closed in the same pass, forced by the reader hitting it live
("unclear if these are fake citations" — a preflight chip re-opened to
"the address outlived it," making a real mechanical citation
indistinguishable from a fabricated one): every preflight page now also
lands in `state.citedMaterial` (name → text, conversation-lifetime, never
an attachment — no pill, and `liveChunks` never reads it), the reopen
dialog falls back to it with the archived state named on the address line,
and the Explore door is withheld for archived material rather than offered
dead. Disclosed residue remaining, named not fixed: web corroboration
still counts name-STRING matches across pages — three different Robert
McNamaras read as three agreeing perspectives — which is the referent-model
gap, not a counting bug.

## P24 — `/run`: the chat door onto the sandbox, for code a PERSON wrote

The P22 amendment named this as a recommendation, held open pending
confirmation, rather than assumed: "think the chat should be able to
drive terminal work and things using python and what not" names two
things of different sizes, and only the smaller one (composing the
nine-operator language via `/act`) had been built. This closes the
larger half — but a materially narrower slice of it than "run arbitrary
code from chat" might suggest, because most of that ground was already
covered.

**The decision: `/run <runtime>\n<code>`, a typed door, never a button on
a rendered segment.** `term.js` already had `runSandboxed` and app.js
already had `autoRunAndDisclose` — automatic, fire-and-forget sandboxed
execution of code the MODEL just wrote inside a turn's own fold, no click
needed, before this policy existed. That mechanism already answers "does
the model's own code run safely." The actual gap was code a PERSON types
or pastes straight into the composer, which had no door at all. A ▶
button drawn onto the same rendered segments auto-run already executes
would be redundant with a mechanism that already runs those exact
segments; a typed command is also the shape every other explicit trigger
in this dispatcher already takes (`/act`, `/self`, `/priors`, `/learn`),
so `/run` invents no new class of affordance, only fills the one gap that
was actually open.

**No new machine-execution path, ever — the identical sandbox, called the
identical way.** Every `/run` terminates in the SAME `runSandboxed`
function (term.js) that auto-run already calls, which terminates in the
SAME three Workers P18 already sandboxes (`term-js-worker.mjs`,
`term-py-worker.mjs`, `term-sql-worker.js` — network severed at boot,
before the first operator line runs). `serve.mjs` gained no exec route;
`term.test.mjs`'s existing seam scan (no non-local host, no exec call, in
any terminal file) was not weakened to make this land — it was not
touched at all, and still passes.

**The model never decides to execute; there is no standing switch.**
`parseRunCommand` (term.js, pure) only claims a turn typed EXACTLY as
`/run <runtime>\n<code>` this exact turn — checked among the other typed
doors in `send()`'s dispatcher (`app.js`), right after `/act`'s own check,
before any automatic detector or the widget router gets a look at the
question, the identical ordering discipline `/act`'s own policy states
("explicit typed doors are checked before anything downstream, in a fixed
order, so nothing typed can be hijacked"). Each `/run` is its own one-shot
action — like the Folds panel's own ▶ run, or `/act`'s own mechanical
land — never a toggle that authorizes a future turn to run something on
its own.

**What actually needed to change, and why.** Two small gaps closed rather
than one large door opened:

- **ROSTER's `type` field, consolidating a ternary that had already drifted
  into two copies.** `spawn()` and `runSandboxed` each separately
  hardcoded `name === "sql" ? "classic" : "module"` — the exact drift class
  this repo's own postmortems have already named twice under P22 (the
  DEF/EVA `Array.find` bug, `synthesize`'s `String.includes` bug: one
  correct implementation and a second place nobody kept in sync). `type`
  now lives once, on each `ROSTER` entry, read by both call sites.
- **`runSandboxed` grew what sql needed and js/python never did.** `result`-
  type worker messages (sql's `runSql` emits one per statement that
  returns rows; formatted with the SAME `formatCells` the interactive
  prompt's own message handler already uses) and a `.load <source>`
  pre-step read off the code's own first line (the SAME `csvTable` walk
  `exec()`'s own sql `.load` handling already uses). Without these, `/run
  sql` could only ever run a bare query against an empty database —
  auto-run never needed them because the model-authored fold path never
  routes SQL through this door at all.

**Disclosed choice: material crosses unfiltered.** `runTurn` (app.js)
hands `runSandboxed` `state.sources` exactly as written — every loaded
source, muted or not — matching `actTurn`/`landAct`'s own precedent rather
than diverging from it: the mute toggle is a retrieval concept (it governs
what a model turn is HANDED to answer from), not an execution concept, and
term.js's own `sourcesPayload()` already mounts every loaded source into
every sandboxed runtime for the identical reason. A `.load <source>`
inside `/run sql` code can therefore reach a muted source — the same as
typing `.load <source>` at the interactive terminal prompt already could.

**Evidence, driven live end to end through the real chat UI.** `/run
python\nprint(2+2)` printed `4` (10,191ms, matching P18's own ~9s pyodide
boot figure). `/run js\nconsole.log(3*7); 6*7` printed `21` then `42`
(29ms). Real CSV material pasted as an attachment, then `/run sql\n.load
pasted.txt\nselect city, riders from pasted where riders > 1500;` printed
the load line (`pasted: 3 rows · city TEXT, riders INTEGER`) followed by a
column-aligned table of exactly the two matching rows (359ms) — proving
both new `runSandboxed` capabilities against real attached bytes, not a
fixture. `/run ruby\nputs 1` refused mechanically (`unsupported_runtime`)
with no model call and no worker ever spawned; bare `/run` rendered the
usage line. Every run and refusal landed on `record/explore-record.jsonl`
within the same second, `via: "chat"`, read back via `curl
localhost:8812/api/record?tail=…`. The browser's own network log across
every one of these turns showed nothing beyond the sandbox worker files
and `POST /api/term-record` — no call to the model at :11434, and nothing
resembling a machine-execution route. `/act distinguish zone-3 at Network
from encounter` composed immediately afterward still refused with the
identical `no_ground` detail P22's own evidence names, confirming the new
door sitting beside it in the dispatcher disturbed nothing.

**Files.** `term.js` (`ROSTER[*].type`; `AUTO_RUN_LANGS`/
`AUTO_RUN_TIMEOUT_MS` grew a `sql` entry; `runSandboxed`'s `result`
handling and `.load` pre-step; the new pure `parseRunCommand`); `app.js`
(`runTurn`, `formatRunOutcome`, the `/run` dispatcher check, both new
`mirrorTermRecord` event types).

**Enforced:** `term.test.mjs` grew 7 cases — `autoRunnable`'s sql support;
`parseRunCommand`'s four parsing rules (valid runtime+code, missing code,
unknown runtime, no `/run` prefix at all → null); ROSTER's `type` field
checked against each worker file's OWN module shape (a real ESM `export`
detected in the file's text, not a hardcoded map); a source-scan
regression confirming the `name === "sql" ? "classic" : "module"` ternary
is gone from both call sites, not merely duplicated a third time.
`capacity-runner.test.mjs`/`grid.test.mjs` untouched and still passing,
confirming `/act`'s own machinery was not disturbed by sharing the
dispatcher with a sibling door.

**Disclosed limit, carried over unchanged, not this policy's to fix.**
`runSandboxed`'s worker-message accumulation has no output budget of its
own beyond what each worker already caps (KEEP_PER_EXEC-scale) — a `/run`
that prints an unbounded amount ships it whole into the turn's answer,
the same posture auto-run's own disclosure already accepts for a fold's
code. A future pass could bound `formatRunOutcome`'s own text the way
build-log.js's run entries already bound theirs (16K chars/stream,
`kept/of` stated); not attempted here, named rather than silently
absent.

## P25 — A database is an event stream, current state always projected

store.js (a prior pass) already holds the invariant, the user's own words,
verbatim: "the reality of the database should be the EOT event stream, the
current state always projected." This policy is that invariant wired into
the terminal's REAL `sql` runtime (and chat's `/run sql` door), so a
database a person actually populates — not only store.js's own test
fixtures — is stored AS A FOLD: it appears in the Folds panel, persists the
same way a code/table/html build already does, and reopens after a reload
rebuilt by REPLAYING the log, never by reading back a saved database
export. The one thing this policy forbids absolutely: calling
`db.export()` (or any equivalent) and stashing the bytes as "the persisted
current state." What is persisted is store.js's own task-log — a plain,
JSON-serializable array of entries — and nothing else.

**Ops are derived from real execution, never from parsing SQL.** sql.js
exposes no AST, and this repo's own house rule ("search for the organ
before you hand-roll one") points the same direction store.js's own header
already does: let the statement run against the live database exactly as
it already does, then DIFF the affected table's rows before and after,
using SQLite's own `rowid` as each row's stable identity. A rowid present
after but not before is a birth (`insertRow`); present in both with
different column values is a revision (`updateRow`, changed columns ONLY —
never a whole-row resend, which would defeat store.js's own per-key merge
semantics); present before but not after is a retraction (`deleteRow`). A
bare SELECT diffs to zero ops and never touches the store log — no
special-casing needed, the diff is simply empty. This is Choreo's own
"snapshot ingest generates operations" pattern (github.com/
clovenbradshaw-ctrl/Choreo), one register over: diff raw state, emit
granular typed ops, never trust a caller's own account of what it did —
applied here to a source of raw state (a live sqlite session) rather than
an externally-handed snapshot, and named as the borrowing it is, not
reinvented quietly.

**The worker stays dumb; the diffing intelligence lives in one ES module.**
term-sql-worker.js is a CLASSIC worker (P18's own reason: sql.js is UMD and
`importScripts` is the one loader that hands it a global scope) and cannot
`import` a plain ES module the way the rest of this codebase shares logic.
Rather than duplicate the diff algorithm inside the worker, the worker is
told — per `exec` message, from the caller — which table names to snapshot
before and after (an explicit list the caller cheaply detected off the
statement's own text, or an empty list meaning "use your own catalog"),
and hands the two raw `SELECT rowid, *` result sets back UNEXAMINED. All
of the actual diffing (`store-sql.js`, a plain ES module, imported
normally by term.js on the main thread) runs where ES module imports
already work. The worker never imports store.js or store-sql.js, and never
decides what a change means — only what a table currently holds.

**`.load` needs no diffing at all.** For a database fold specifically,
each row of a CSV `.load` becomes its own real `insertRow` call — never a
raw table dump — because the caller already holds the parsed
`{columns, rows}` shape BEFORE the worker ever sees it: every row of a
fresh load is a birth by construction, so `opsFromCsvTable` derives the
ops directly, with the row's 1-based position as `rowId`. `sanitizeTableName`
mirrors term-sql-worker.js's own `tableName()` exactly (disclosed, not
silently duplicated — the identical posture store.js's own header already
takes for `materializeSql` mirroring that same worker's CREATE TABLE
shape) so the fold's table name and the live session's table name never
disagree.

**One shared log, two doors, by construction, not by two authors keeping
two copies in step.** `term.js`'s module-level `sqlSnapshotFields` is the
ONE place that decides whether an `exec` message carries `snapshotTables`
and what it contains — used by BOTH the interactive terminal's `exec()`
and the standalone `runSandboxed()` (which chat's `/run sql` door and the
model's own auto-run both call), so the two never carry two copies of the
same check that could drift — this repo's own postmortems have already
caught that exact drift class twice (P22's DEF/EVA `Array.find` bug,
`synthesize`'s `String.includes` bug; P24's `type` ternary). `app.js`'s
`applyStoreOps` is the identical landing either door reaches: the
interactive terminal calls it directly via a new `bridge.applyStoreOps`
accessor (the same injection shape `gridLog`/`setGridLog` already
established for the terminal language); `/run sql`'s `runTurn` calls it
after `runSandboxed` resolves, reading the `dbOps` field that function's
resolved object now carries.

**Deliberately its own top-level `state.builds` entry kind, not a fifth
thread on build-log.js.** A database fold carries `entry.kind ===
"database"` and `entry.storeLog` (store.js's own log) where a code/table/
html build carries `entry.log` (build-log.js's) — it does NOT route
through build-log.js's PROPOSE/SUPERSEDE-per-edit versioning chain, because
that model fits one person or model editing one version at a time, not a
stream of many small granular row operations. Its "version"/"revision"
display is simply `entry.storeLog.entries.length` ("N operations
recorded"), read straight off the log. What IS reused, stated so nothing
here reads as a silent half-integration: `state.builds` itself (one array,
one numbering scheme, one persistence key); `renderBuilds`/`foldRow`'s
search-and-sort pipeline (folds-pane.js never learns a database fold's
shape — it only ever sees the same row shape every other kind already
produces); `artifactNode`'s table renderer, factored into a shared
`tableWrap` helper rather than built a second time. What is NOT reused:
build-log.js's PROPOSE/SUPERSEDE/RESULT vocabulary, its cursor scrubbing (a
database fold has no versioned "as of" position — the store log's own
entries ARE its history, always live), its editor, its run/restore/
download controls. Full CLAUDE.md section carries the reasoning for each.

**Scope: one database fold, app-wide.** The first row-level mutation from
either door lazily creates the ONE database fold this policy keeps; every
later mutation from either door lands on the same log — the identical
"belongs to the instrument, not one conversation" reasoning
`state.gridLog`/`state.builds` already state elsewhere. Several
simultaneous database folds is real, named future work, not attempted.

**Disclosed limitations, found while building.** A SQL column literally
named `id`, `table`, `row`, `because`, or any of task-log's reserved entry
keys collides with store.js's OWN disclosed collision guard and throws —
this pass does not work around it (renaming a column would silently
disagree with what the operator typed); `applyStoreOps` catches the
failure per op, keeps whatever succeeded, and reports what could not be
recorded rather than crashing or silently dropping the row. Re-entering
the interactive `sql` runtime after `exit` boots a genuinely fresh, empty
sqlite database — the store log remembers every row forever, but the live
session does not remember schema, and sqlite's own rowid counter resets
too, so a later session's rows can in principle collide with an earlier
session's already-recorded rowId for a same-named table; not reconciled
here. "Reopening" a fold means the Folds panel shows its live projection,
fresh on every render — it does NOT mean a freshly booted `sql` runtime is
pre-loaded with the fold's prior rows for continued live querying, which
would need `materializeSql` run inside the classic worker and was not
built this pass. `.load` run twice against the same source name is not
diffed against its own prior load. None of these are silent; each is
stated in code comments and in CLAUDE.md's own section.

**Evidence:** driven live end to end through a real browser against `node
serve.mjs` (not only in test files) — `CREATE TABLE t (...); INSERT ...;
INSERT ...;` landed 2 insert ops and rendered a 2-row table; `UPDATE ...`
landed exactly 1 update op (Bob's untouched row produced none); `DELETE
...` removed the row from the live view; **reloading the page** showed the
identical fold, and a console inspection of `localStorage["fold-builds"]`
showed the persisted object's only keys are `entries`/`kind`/`n`/`turn` —
`entries` an ordinary array of task-log entries (`propose`/`propose`/
`supersede`/`retract`), never a `db.export()` byte array. A pasted CSV,
`.load`ed, produced 3 separate insert ops (op count 4→7, not a single
table-dump entry) and a live `SELECT` immediately after produced no
`database fold:` line at all. Chat's `/run sql` door, in a fresh THROWAWAY
worker, landed on the SAME fold as the terminal — "one shared log, two
doors" proven live, not only asserted. Full CLAUDE.md section carries the
complete transcript.
**Enforced:** `store-sql.test.mjs` — 14 conformance tests against the REAL
sql.js package (every before/after pair a genuine `db.exec()` result, never
a hand-typed fixture): mutation/table detection, the zero-rows/no-such-
table/undefined collapse, insert/update/delete derivation off real CREATE
TABLE + INSERT/UPDATE/DELETE batches (including a same-batch insert-then-
delete netting to zero ops, and a table created and populated within one
batch), `deriveStoreOps`'s union-of-tables flattening, `sanitizeTableName`'s
mirror of the worker's own sanitizer, `opsFromCsvTable`'s row derivation
including a null cell, and one full end-to-end round trip (real sql.js →
`deriveStoreOps` → store.js's `insertRow`/`updateRow`/`deleteRow` →
`foldStore` → `materializeSql` against the real package). `term.test.mjs`
unchanged and still passing (23/23) — this policy's term.js changes are
additive (`sqlSnapshotFields`, `applyDbOps`, the `dbOps` field) and touch
no function that file already tests. Full-suite count: 706 tests / 702
passing / 4 failing before this policy (the same 4 this repo already
carries), 720 / 716 / 4 after.

## P26 — Three more terminal languages, two of them full parity, one honestly narrower

P18's registry "takes any runtime a localhost-served module can boot" — this
policy is that clause exercised, three more times, on real npm packages, not
a hypothetical. Ruby (`@ruby/wasm-wasi` + `@ruby/3.3-wasm-wasi`, ruby/ruby.wasm
on wasm32-wasi, MIT), PHP (`php-wasm`, seanmorris/php-wasm on Emscripten,
Apache-2.0), and R (`webr`, r-wasm/webr, Posit-backed) are vendored in
`node_modules` and served from localhost exactly as pyodide and sql.js
already are — no CDN, no PyPI-shaped tier, nothing this policy's own P1
would refuse.

**Ruby and PHP earn full parity with js/python/sql — fully severed, no
nested Worker, `AUTO_RUN_LANGS` reachable.** `term-ruby-worker.mjs` uses
`RubyVM.instantiateModule` + `consolePrinter` (the low-level path — never
`DefaultRubyVM`, whose stdout hardcodes to `console.log`) to get real
streamed out/err capture; `sever()` runs once boot resolves, because Ruby's
one `.wasm` carries the full interpreter AND stdlib, so nothing more is ever
fetched. `term-php-worker.mjs` uses the `PhpWeb` class, with `onoutput`/
`onerror` wired to real per-newline streaming. Both run directly in
whatever Worker `term.js` itself spawns for them — confirmed by reading
every file each imports, the same standard `web.js`'s pure/impure split
already holds this repo to.

**R is real and works, with one disclosed, load-bearing narrower guarantee:
it is not fully severable by this repo, and it is not offered where that
would matter.** `new WebR(...)` unconditionally spawns a SECOND, nested
Worker (r-wasm's own `webr-worker.js`) to run the actual R engine — a file
this repo did not author and cannot inject a `sever()` into before it runs.
Ordinary R code execution still touches no network (no proxy configured;
`download.file()`/`url()` fail the ordinary offline way); the one real path
is R's own package installer (`webr::install()`/`install.packages()`,
reaching webR's own default package-repository host from inside that
nested worker) — reachable only by operator-typed R code calling it
directly, the same class of residue P14 already discloses for the skills
sandbox's vm context ("an authority wall by construction... not a hardened
security boundary"). **The consequence is drawn, not left implicit:** `r`
is never added to `AUTO_RUN_LANGS`. It is unreachable from both automatic,
instrument-decided crossings this repo already has for the fully-severed
five — a model's own fold auto-running, and the chat's one-shot `/run`
door — and reachable ONLY by a person typing `r` at the fold prompt and
driving it themselves, the identical posture P22's `/act` and P24's `/run`
already hold for every crossing that needs a human's own deliberate
trigger. Verified live: `/run r\n1+1` in the real chat composer refuses
`unsupported_runtime` by name, mechanically, with no model call and no
worker ever spawned for it.

**Two live corrections to what the vendoring research could not have
caught without loading the packages in THIS repo's own bundler-free,
Worker-sandboxed architecture — found by running real code, not by
re-reading documentation (P5.5's discipline, both directions).**

1. The PHP candidate the research ranked first — `@php-wasm/web` +
   `@php-wasm/universal` (WordPress Playground) — does not load here at
   all: its per-version build glue opens with a static `import
   dependencyFilename from './8_3_32/php_8_3.wasm'`, a Vite-only asset-URL
   pattern that only resolves under a bundler and fails outright at the
   browser's module-script parse step against this repo's plain
   `import()`-from-disk serving. The research's own second-named
   candidate, `php-wasm` (seanmorris/php-wasm), was substituted — verified
   by reading its actual source (plain relative dynamic imports, real
   `fetch()`, no bundler assumptions) rather than trusted from its README.
   Its disclosed cost: no per-version npm install exists for it, so
   vendoring it means vendoring PHP 8.0 through 8.5 together (~182MB
   unpacked), of which only one ~13MB `.wasm` is ever fetched by the
   browser at runtime — a real, stated size tradeoff for the only candidate
   that actually works here, not a silent one.
2. Two Worker-compatibility gaps existed in the vendored bytes THEMSELVES,
   invisible to reading documentation and found only by booting in a real
   dedicated Worker: `php-wasm`'s Emscripten build references the bare
   identifiers `document`/`window` unconditionally at its own top level
   (dead fullscreen/canvas/audio-context runtime glue a text-mode SAPI
   never calls), fixed by assigning `globalThis.document = undefined;
   globalThis.window = undefined;` before import — `undefined`, never a
   functional stub, so the package's own environment detection (which
   reads `typeof window`) still correctly resolves WORKER, unchanged.
   Separately, `webr`'s declared "main" entry (`dist/webr.mjs`) opens with
   unconditional top-level `import {createRequire} from 'module'` — a
   genuine Node built-in the package's own `package.json` `exports` map
   already routes browsers AWAY from (the `"browser"` condition names
   `dist/webr.js`, verified to carry the identical exported surface with
   zero Node-only imports) — but a literal path import, unlike a bundler
   or Node's own resolver, cannot see `exports` map conditions, so the
   correct file had to be named explicitly rather than assumed from the
   package's own declared main. Both fixes are disclosed at their point of
   use in the worker files' own headers, not only here.

**A testing-tool artifact, disclosed so it is not re-chased as a code
defect.** The first live attempt at R's boot, run inside an AI coding
assistant's own sandboxed preview pane, failed with an opaque,
detail-stripped Worker error. A minimal control — a plain Worker spawning
ANOTHER plain Worker, no webR involved — failed identically in that same
pane and succeeded cleanly on the first try in a real, unsandboxed Chrome
tab against the same server. The restriction belongs to that specific
testing tool, not to a real browser, not to webR's own architecture, and
not to this repo's code — stated here because the wrong conclusion (that R
cannot run in a nested Worker at all) would have been a strictly worse,
and false, policy to write down.

**Continuation grammar, mechanical, not a parser, disclosed narrower
scope.** Ruby needs multi-line def/end blocks; `rubyBlockDepth` (term.js)
opens one level on a line-initial `def`/`class`/`module`/`case`/`begin`/
`for`/`if`/`unless`/`while`/`until` or a trailing `do`, and closes one per
free-standing `end` — the statement-modifier form ("puts x if y") never
opens, because it never starts a line with the keyword. R needs bracket-
spanning expressions; `rBracketDepth` tracks `(`/`{`/`[` depth per
character, skipping anything inside a `"…"`/`'…'` string or a `#` comment
so a bracket mentioned in either is never miscounted. Both are word/
character-boundary walks, not parsers — heredocs, %-literals, and R's raw
strings are not excluded — and both inherit the universal trailing-
backslash continuation every runtime already has as the disclosed escape
hatch when the heuristic misjudges. PHP gets no analogous rule this pass:
its primary REPL use (single-statement echo/var_dump) does not need one,
and a wrong heuristic risks wedging the prompt worse than the absence of
one — a deliberately narrower scope, named rather than silently assumed
complete.

**A finding that contradicted this policy's own drafting assumption,
corrected before being asserted.** The task that produced this policy
assumed `serve.mjs`'s static-file routing allow-lists specific
`node_modules` subpaths, matching how pyodide and sql.js are exposed.
Reading the actual routing code found the opposite: both `serve.mjs` and
`explore-server.mjs` serve the WHOLE repo directory generically (`join(ROOT,
rel)` plus a path-escape guard, nothing narrower), so no server change was
needed for any of the three new packages — the `.wasm` → `application/wasm`
MIME entry, needed for `WebAssembly.compileStreaming`, was already present
in both servers from the pyodide/sql.js pass. Stated here because the
policy's own premise turning out false, and being corrected rather than
assumed, is itself the P5.5 discipline this repo holds everywhere else.

**Evidence.** Driven live end to end, twice — once in a sandboxed preview
pane (caught the PHP and R bugs above), once in a real, unsandboxed Chrome
tab against the same `node serve.mjs` instance (confirmed every fix and
the pane-specific nested-Worker artifact). Ruby: `def greet(name)` / multi-
line body / `end` landed correctly, `greet("world")` printed `hi, world`
via Ruby's own auto-print of a visible return value; a `NameError` on an
undefined method printed as a clean typed error, not a crash. PHP: `echo 1
+ 1;` printed `2` (after the tag-ownership fix — before it, the bare
statement echoed back as literal text); `var_dump`/`array_sum` over a real
array printed correct structured output. R: `1 + 1` auto-printed `[1] 2`;
a multi-line `function(x) { x * 2 }` spanning three prompts via bracket
continuation, called as `f(21)`, printed `[1] 42`. Material crossing
(`File.read("/material/…")`, PHP's `file_exists("/material")`, the `mount`
re-sync command) confirmed for ruby and php against a real dropped file.
`/run ruby` and `/run php`, typed in the real chat composer against a real
running model (`gemma2:2b`), executed in fresh throwaway workers and
printed correct results (`42`, `hi from php: 42`); `/run r` refused as
designed; all three attempts and both non-R successes landed `term-run`/
`term-run-refused` rows on `record/explore-record.jsonl` with `via:"chat"`
within the same second, read back live via the record API, confirming the
identical recording path P24 already established is reused unchanged, not
duplicated. Boot times, measured live and repeatedly: ruby ~9-12s typical
(the `AUTO_RUN_TIMEOUT_MS` comment discloses a real, once-observed minute-
plus outlier under heavy concurrent load, not treated as the common case),
php ~9-10s, r ~13-15s — all the same order of magnitude as python's own
already-documented ~9s pyodide boot.

**Enforced:** `term.test.mjs` — the severed-egress list checked to agree
across all six workers (not three); `mountName` checked to agree across
all four material-mounting workers; `rubyBlockDepth`/`rBracketDepth` tested
directly as pure functions AND through `continues()`; `autoRunnable` and
`parseRunCommand` re-tested against the actual new boundary (ruby/php now
true, r now the disclosed false — two pre-existing tests that had encoded
"ruby is not runnable yet" as their own worked example were corrected to
test the real, current boundary rather than left to quietly assert a fact
this policy just changed). `constitution.test.mjs`'s II.13 scan passes with
all three new worker files walked from `term.js`'s `ROSTER` data (the
walker's own `module-path` extraction rule, built for exactly this
indirection) and zero non-local host literals — including in the new
files' own header comments, which name real remote hosts (`repo.r-wasm.org`
et al.) as PROSE, deliberately without a literal `https://` prefix, so the
disclosure is legible without tripping the same scan it is disclosing
against. Full suite: 735 tests / 731 passing / 4 failing before this
policy (the same 4 this repo already carries — `measure.test.mjs`, three
`webllm-rung.test.mjs` model-file cases, confirmed via `git stash` against
this exact worktree, not trusted from memory), 741 / 737 / 4 after — zero
regressions anywhere else in the suite.

## P27 — The model proxy: the fold servable AS a model, amending P1's own direction

Every policy above this line governs the fold as a CLIENT: what it may
fetch, what it may run, what it may say to a model it calls. P1 never
considered the opposite direction — another LOCAL tool (the Ollama desktop
app's "add provider," OpenCode's custom-provider config) pointing AT this
instrument and asking it to behave as a model. This policy is that
direction, opened for the first time, and it amends P1 exactly once: P1
still says no request LEAVES the machine; this adds that a request may now
ARRIVE from another process on the same machine and be answered by the
real grounded pipeline, not a bare model wearing the fold's name.

**The one rule that makes this safe to open at all: a servable model id is
always `fold:<real ollama model>`, never a bare name.** A client asking
for `gemma2:2b` is asking Ollama directly and gets refused, typed, at the
door — collapsing "plain Ollama" and "the fold" under one identifier would
make "did this answer go through the grounded pipeline" a guess, which is
the same failure mode P20 already refuses for a cited link and the
grounding ladder's own constitutional statement already refuses for a
checking organ: never manufacture a warrant the request did not earn.

**Full pipeline by default, not a passthrough with a flag nobody sets.**
The user's own framing, near-verbatim: most callers of an OpenAI-shaped
API will never discover an opt-in flag, so a "grounded if you ask for it"
default would in practice ship "Ollama with extra latency wearing the
fold's name" to everyone who does not already know this repo's internals.
Every `/v1/chat/completions` and `/api/chat` request therefore runs
holon.js's REAL `runHolonicTask` — the mechanical decomposition gate, per-
part retrieval, the quote and relation tiers, the bounded correction loop
— exactly the pipeline app.js's own `holonicTurn` calls, not a cheaper
approximation. `fold_grounded: false` is the one disclosed escape hatch
from the relation tier specifically (the ladder's most expensive tier),
for a caller doing high-volume plain chat who has read this far.

**Two wire protocols, one turn.** `proxy-api.js` (pure — no fetch, no
node:*, no engine import) shapes both OpenAI's and Ollama's identical
`{model, messages, stream}` request body into one turn (`task` = the last
user message, `chatHistory` = prior user/assistant turns verbatim, any
`system` message content folds into the one-line `discourse` app.js's own
flat-turn path already uses) and formats a finished turn back into either
wire shape — `GET /v1/models` / `GET /api/tags` (both list Ollama's real
pulled models, reprefixed, never a hand-maintained second list),
`POST /v1/chat/completions` / `POST /api/chat` (streaming and not).
`proxy-runner.mjs` owns what a pure module may not: the same organ bundle
app.js builds at app.js:208-259 (`makeCastResolver`, `makeRelationReader`
— one implementation of "the same name" and "the material's own edges,"
never a second one grown here to quietly drift from the browser's), and
the Ollama call itself, mirroring `eval/dialogue.mjs`'s own
`call(messages, {maxTokens, json})` shape and one-retry discipline.

**Disclosed scope, this pass — named, not silently absent.**
- **No material/attachments.** `chunks: []` on every turn — an OpenAI-
  shaped request has no composer to attach a file to. A question with no
  attached material still runs the real pipeline and still reports real
  findings (`unbacked`, `open`) about what it could not check against;
  it is not treated as a reason to skip checking, per the standing rule
  ("absence of material licenses withholding judgment, never
  manufacturing it," CLAUDE.md). Accepting attachments through a custom
  request field is named future work, not attempted here.
- **No link tier.** `checkLink: null` on every turn — P20's web-egress
  checking needs its own consent posture (the standing web-proof toggle a
  person sets in the browser), and silently granting it to every proxied
  call would make an API request a new, unconsented path to the same P13
  egress. A cited URL from this endpoint ships `unexamined`, exactly as
  it would from the browser with web consent off.
- **No persistent session.** Every request already resends its own full
  message history (the wire protocols' own contract), so each turn folds
  fresh — `foldedRefs: []`, no running summary, no warrant record —
  rather than pretending to a server-side conversation state the protocol
  does not carry. A caller wanting the fold's cross-turn record (P1 of
  READING-POLICY: "activation decays, identity does not") uses the
  browser, where that state genuinely persists.
- **Streaming is single-shot, not token-level, and this is a stated
  tradeoff, not a shortcut.** Both stream formats emit the WHOLE finished
  answer as one content chunk, then a stop/done chunk carrying the fold's
  findings, then the protocol's own terminator. Real token-level streaming
  would mean showing a draft before the correction loop and the quote/
  relation tiers have run against it — the one thing this instrument's
  entire grounding apparatus exists not to do. A client that only needs
  valid stream framing (most do) sees no difference; one that renders
  deltas live sees the answer arrive as a single burst.
- **One model per turn, no routing ladder.** `model-routing.js`'s
  fast/deep split exists because a person picks once per session and the
  fold protects the small model's context on their behalf across many
  turns. An OpenAI-shaped caller instead names a model on every single
  request — already a per-call routing decision — so every model call the
  turn makes (plan, each part, each correction) spends exactly the named
  model, never a silent substitution.

**Loopback only, unchanged from the rest of this server.** The routes live
on `explore-server.mjs` (already bound to `127.0.0.1` alone, never all
interfaces) rather than `serve.mjs` (which binds every interface) — this
widens what a LOCAL tool may treat as a model, never who may reach this
machine. P1's ban on a non-localhost host anywhere the *browser* loads is
untouched; this is a second local *server*, not a change to what the page
itself may fetch.

**Evidence.** `proxy-api.js` tested offline (`proxy-api.test.mjs`, 20
cases — the prefix wall, every message-shape refusal, both response and
both stream shapes, model-list reprefixing against a real-shaped and a
malformed body). The full pipeline was driven live end to end against a
real running `explore-server.mjs` and a minimal stand-in Ollama (this
session's sandbox has no Ollama install to test against for real, so the
stand-in is disclosed as exactly that — a scripted `/api/tags` +
`/api/chat` that a live model would replace transparently, since
`proxy-runner.mjs` speaks the identical wire calls `eval/dialogue.mjs`
already proves work against a real one): `GET /v1/models` and
`GET /api/tags` each reprefixed the one offered model to `fold:gemma2:2b`;
`POST /v1/chat/completions` with `{"model":"fold:gemma2:2b","messages":
[{"role":"user","content":"What is the capital of France?"}]}` ran the
real flat-turn pipeline (one Ollama call, `planMode: "flat"` — a single
interrogative sentence never plans, per the propose-then-check rule) and
returned the answer plus honest `unbacked`/`open` findings (nothing was
attached, so "Paris" is correctly reported as material the ladder could
not check, never silently passed); the identical request against
`POST /api/chat` returned Ollama's own wire shape; both streaming variants
emitted valid SSE / NDJSON framing carrying the same answer and findings.
A bare (unprefixed) model name refused with a typed 400 naming the
required `fold:` form; Ollama unreachable refused with a typed 502 naming
the configured URL, never a raw stack trace; every attempt landed on
`record/explore-record.jsonl` (`proxy-chat-requested` before the call,
`proxy-chat` or `proxy-chat-failed` after) via the same `record()` every
other event in this instrument already lands through.

**Files.** `proxy-api.js` (new, pure) + `proxy-api.test.mjs` (20 cases).
`proxy-runner.mjs` (new — the engine organs and the Ollama call).
`explore-server.mjs` (four new routes; the CORS/OPTIONS gate widened from
`/api/` alone to `/api/` or `/v1/`, since an OpenAI-compatible client's own
preflight behavior needs the same treatment this server's JSON API
already gives).

**Enforced:** `proxy-api.test.mjs`, offline, pure. The live pipeline
wiring (real `runHolonicTask`, real `makeCastResolver`/`makeRelationReader`
organ bundle, real route dispatch) has no committed regression test in
this pass — it was verified live, once, against a scripted stand-in
Ollama, the same way `eval/measure-real-data.mjs` and `eval/dialogue.mjs`
verify their own live paths outside the committed suite. A future pass
that wants this enforced rather than merely demonstrated should add a
`proxy-runner` test that injects a stub `call()` the way `holon.test.mjs`
already does for `runPart`/`runHolonicTask` directly — not attempted here,
named rather than implied as covered.

## P29 — A relation edge's verb-hood is a hypothesis, disclosed and counted, never a recovered fact

The user's redirect, near-verbatim, closing out the prior investigation
into `hypergraph.js`'s MINE-1 score: "we don't need to rediscover grammar
as linguists think of it, we need to discover real structure and MEANING,
which must always be asserted by a reader (even a mechanical one)." Nine
vocabulary-widening configurations (UniMorph, lemma matching, span-role
resolution, clause framing, adjacency voting) had all chased the same
question — "is this token the same verb as that one?" — the pareto-best of
the nine was plain unfiltered vocabulary, and `unbound` sat at 35–39% of
examined facts in every variant regardless: a paraphrase-tolerance gap in
the bound/unbound rubric itself, not a vocabulary gap `extractRelations`
could close. Scored under an entailment-style rubric the same graph landed
at 80%, above every published baseline — the exact-structural-match verdict
was measuring its own strictness more than the graph's quality.

**The actual defect, once named.** Every one of those nine configurations
trusted `extractRelations`'s own claim — "this word is the verb of this
clause" — as ground truth once recovered. A part of speech is not a fact a
word carries; it is a linguist's after-the-fact description. This repo
already refuses that exact move on the noun side: the cube is not a
content classifier (95.7% cell-assignment survival under word-shuffling);
L2 uses capitalisation as a veto, never a positive signal; the referent
index resolves identity over stemming. Nothing yet treated the verb side
the same way — the grounding ladder checks whether the MODEL's claims are
supported, but never asked whether the EXTRACTOR's own claim about a
clause was.

**What was searched for, and the honest finding: no ready-made organ.**
`nul/index.js`'s `LICENSED` table covers (statistic, perturbation) pairs
over NUMERIC SERIES only — text has no licensed perturbation there, and
admitting one is the engine's call, not this repo's. `emergence/
activation.js` has no unused retrieval mode for this either. What
transfers is the DISCIPLINE two established constructions already earned:
activation.js's cue gate (`df >= 2` to fire — "a form that has come round
again has proven it can bridge," the third occurrence is the first that
can recall) and `emergence/binding.js`'s arrivals-≥2 floor ("binding's
structural minimum") both land independently on 2 as the meaning of
recurrence; and `goldens/agency-civic/rotation-control.mjs` already built
and measured the exact construction this needed — a clause's own words
seeded-shuffled, the document's real surfaces/vocabulary held fixed,
scored through the identical pipeline — reporting real corpus admission at
10.6% against a 3.4% word-salad floor on 208 civic clauses. That golden's
own verdict (Link yield as an agentlessness meter is NOT supported on that
run, dominated by 87% recall loss) is a separate, standing finding and is
untouched here; what carries over is the CONSTRUCTION, reproduced per-edge
rather than per-clause because goldens are firewalled consumers (nothing
outside a golden's own directory may import from it).

**`asserted.js` (new, pure).** Two measures, and only one ever sets a
standing:

- **witnesses** — self-corroboration by recurrence. `standingOf(n)` types
  an edge `corroborated` at `WITNESS_FLOOR = 2` independent statements,
  `single-witness` below. Structural, never walked against a golden — the
  same 2 the two engine organs above earned independently.
- **orderArm** — the per-edge word-salad floor. Each PASSAGE's sentences
  are shuffled in place (vocabulary, referent identity, and sentence
  boundaries held fixed — the rotation-control isolation, generalized from
  "one clause" to "every sentence of the material"), re-run through the
  SAME vocabulary-bound extraction closure the caller supplies, `draws`
  times (declared, never defaulted — the arm's resolution is 1/draws).
  Reported as raw counts (`{ draws, fired, seed }`), phrased
  natural-frequency by `assertionPhrase` — **never collapsed into a
  verdict.** No cut is drawn anywhere in this pass: earning one needs more
  material than a synthetic suite and one real-prose sample, and tuning a
  threshold against either would be exactly the "calibrating on the answer
  key" mistake eoreader6.1's CLAUDE.md names twice over. Polarity is
  ignored when matching a shuffled-copy triple to an edge — under shuffle
  it is noise by construction, the negation window being an order fact
  the shuffle just destroyed.

**`hypergraph.js` wiring is strictly additive.** Every edge (and therefore
every claim's `bound`/`nearest` disclosure, which already projects through
`edgeFace`) carries `assertion: { standing, statements, verbSupport,
orderArm? }`. `verbSupport` is the vocabulary measure's own distinct-
surface count for that verb, kept rather than dropped — a verb admitted on
one surface is itself a single-witness assertion, one level up from the
edge. Nothing here convicts: `relationFindings`/`relationsClean` are
byte-for-byte unchanged, so a single-witness edge reaches the reader as
disclosure, never as a mark against the answer. The order arm runs only
when the caller passes `{ assert: { draws, seed } }` — omitted, it is
absent, never defaulted to zero and never silently run at a cost the
caller didn't ask to pay (armed, 200 draws over 827 real edges took 108s).

**`eval/asserted-eval.mjs` + `eval/asserted-blind-analysis.mjs` — the new
harness, decoupled from MINE-1's rubric by design.** Three parts, run and
recorded (`eval/results/asserted-eval.md`, `asserted-blind-results.json`):

1. **Synthetic adversarial suite**, ground truth by construction (no
   annotator needed — the author of a planted sentence knows what it
   states): control SVO, passive voice, a relative clause, coordinated
   verbs, a fronted adverbial, negation, a planted-false co-occurrence
   (every token present, the text never binds it — MINE-1's own flagship
   case, replayed here as a construction rather than a score), and two
   paraphrase cases (same verb restated; a different verb for the same
   fact, measuring rather than assuming the reader has no synonymy organ).
   Result: **8/9 intended edges heard correctly, 3 mis-heard** — passive
   voice reversed agent and patient exactly as the hazard predicts
   (`"Helene was" —married→ "by Pierre Bezukhov"`), the relative clause
   mis-bound its relative pronoun as subject (`"who" —married→ "Helene"`),
   coordinated verbs elided the shared subject onto the wrong noun phrase
   (`"and" —trusted→ "Dolokhov completely"`) — all three the exact gaps
   `goldens/agency-civic`'s README already named as `extractRelations`'s
   own recall failure on civic prose, now reproduced and typed on
   invented material instead of only reported as an aggregate rate. **1
   forbidden edge fabricated** (the passive-voice reversal, which is also
   counted as mis-heard): its own salad count (21/200) sat inside the
   range of genuinely correct edges, so the order arm did NOT distinguish
   it on this small suite — stated as a negative result, not glossed over.
2. **Order-arm separation**, reported as two raw distributions with a
   disclosed confound (a more-corroborated edge's words appear in more
   sentences, so more shuffles can luck into its shape — fired count is
   not comparable across edges with different witness counts without
   conditioning on that, which this pass does not attempt) — no cut drawn.
3. **Real prose**: the reader run over the already-captured Wikipedia War
   and Peace fixture (`web.js`'s own `extractReadable`, the same face a
   saved page gets), gated to paragraphs the engine's own `splitSentences`
   finds >= 2 sentences in (structural — a passage that cannot hold two
   statements cannot corroborate one). 827 edges (20 corroborated / 807
   single-witness) over 231 measured verbs. A stratified, deterministic,
   verdict-stripped blind sheet (24 items, 12 per stratum) was emitted for
   a hand-precision pass.

**The blind pass — LLM-panel proxy, agency-civic's own label carried
over, not a human ceiling.** Three independent, context-isolated
general-purpose agents scored the sheet from the passage alone, no access
to each other or to the engine's own verdicts. Fleiss' kappa across the
three raters, 24 items x 3 categories: **kappa = 0.789** (91.7% mean
pairwise agreement), above the kappa = 0.4 "moderate" floor
agency-civic's own analysis refuses below. Two findings, kept as measured
rather than reconciled toward each other: **(a)** corroborated and
single-witness standing showed IDENTICAL precision against the panel's
majority verdict — 75.0% each, n=12 per stratum — the witness-count floor
alone did not separate human-confirmed edges from human-rejected ones on
this sample, an honest negative result about the tier's own headline
distinction, not hidden because it complicates the story. **(b)** the
order arm's fired count showed a directional gap the synthetic suite's
4-vs-8 sample did not surface (median 20.5 vs 6, mean 25.7 vs 8.5,
human-YES vs human-NO edges) — at n=24 total and only 6 in the NO bucket
this is disclosed as a suggestive distribution, not a validated signal,
and licenses no cut. **A real human-annotated pass, replacing the
LLM-panel proxy, is still required before either finding is reported as
certified** — precisely the status agency-civic's own README holds itself
to, carried over rather than relaxed because this is a smaller pass.

**What was explicitly refused, per the handoff's own instruction.** No
tenth vocabulary-widening configuration. The inferred graph-hop verdict
stays dead (killed by two adversarial cases in the prior investigation,
proven dead code once made safe — not resurrected here). A higher
`bound%` is never treated as evidence of anything on its own — correcting
that premise is this policy's whole point.

**Files.** `asserted.js` (new, pure — `seededShuffle`/`seedFrom`, the
deterministic-LCG discipline reproduced from
`goldens/agency-civic/rotation-control.mjs` rather than imported, since
goldens are firewalled consumers; `shuffleSentenceWords`; `WITNESS_FLOOR`;
`standingOf`; `orderArm`; `assertionPhrase`) + `asserted.test.mjs` (7
cases: shuffle determinism and non-mutation, seed separation, the pinned
witness floor, `orderArm`'s declared-argument refusals, determinism under
seed against the REAL engine `extractRelations`/`splitSentences`, and the
phrase's own natural-frequency discipline). `hypergraph.js` (`assertion`
wired onto every edge; `relationFindings`/`relationsClean` untouched) +
2 new cases in `hypergraph.test.mjs` (per-edge disclosure; the arm
declared-only-when-requested and replaying identically under its seed).
`eval/asserted-eval.mjs` (the synthetic suite + real-prose run + blind
sheet emission) and `eval/asserted-blind-analysis.mjs` (Fleiss' kappa,
gated first; the cross-tab; the fired-count distributions; appends to
`eval/results/asserted-eval.md`) — both new, both re-runnable.
`eval/results/asserted-blind-panel-{a,b,c}.json` (the three raw panel
verdict files, committed so the analysis is reproducible from the repo
alone, not from a session's own scratch directory).

**Enforced:** `asserted.test.mjs` (7 cases) + `hypergraph.test.mjs`'s 2
new cases, both against the real engine organs. `eval/asserted-eval.mjs`
and `eval/asserted-blind-analysis.mjs` are live-driven eval scripts, not
committed regression tests (matching P19's and P27's own posture for
their eval drivers) — their output is the record in `eval/results/`, not
a pinned assertion, because the numbers are findings to be read, not
invariants to hold constant. Full suite: 719/724 passing after this
change, the same 5 pre-existing failures this repo already carries
(`measure.test.mjs`, `store-sql.test.mjs`, `store.test.mjs`,
`webllm-rung.test.mjs`, and the II.13 monaco-vendoring scan — none
touched by this pass), zero regressions.

## P28 — A preflight search earns the discourse join; it does not always take it

**Correction, stated plainly first:** P23's own amendment paragraph ("the
join is earned, never assumed") claimed `preflightQuery` already took task
and discourse as separate arguments and joined only when earned. Checked
against the actual function on this date: it did not. `preflightQuery`
unconditionally concatenated `${task} ${discourse}` regardless of argument
count, and its one call site (`gatherPreflightMaterial`) pre-joined them
into a single string before that. No `ANAPHORIC_PRONOUNS` import existed
anywhere in this file or `app.js`. The write-up described the right design;
the code did not yet do it. Recorded here rather than quietly patched,
because this repo's whole standing is that a claim of "fixed" is checked,
not assumed — including this file's own prior claims about itself.

**Measured live (2026-08-19), the actual failure the correction above
predicts.** A conversation's first turn was about a dog's trazodone use;
the fold's one-line discourse (topic/flow/entities) came to name trazodone,
dogs, serotonin syndrome, vaccine timing. The second turn asked a complete,
self-sufficient question with no anaphoric reference to anything earlier:
"who was Abraham Lincoln's vice president?" The unconditional join built
the search query `"Abraham Lincoln vice president trazodone dogs uses
interactions serotonin syndrome vaccine timing"` — twelve words, all of
them surviving `PREFLIGHT_QUERY_MAX_TERMS` because the combined anchor
happened to fit under the cap, so the cap-priority safety net the original
docstring described did nothing. The search returned a trazodone/vaccine
FAQ page; the model answered from it, honestly citing it, entirely about
the wrong subject. Confirmed directly: the actual sent prompt, pasted
verbatim into chat, showed a full vaccine-interaction FAQ as the turn's
only MATERIAL. Not a hallucination — a retrieval failure wearing grounded
citations, materially worse than a hallucination because it looks checked.

**The fix.** `preflightQuery(task, discourse, anaphoricPronouns)` now
takes a third, optional argument: the engine's own closed class
(`perceiver/text/priors.js::ANAPHORIC_PRONOUNS` — "it", "this", "that",
"these", "those" and their contractions), injected exactly the way
`widget.js`'s `makeWidgetRouter` already receives it — not a second,
hand-typed pronoun list. The join fires on either of two STRUCTURAL
conditions, never a semantic guess at what the new question is "about"
(this file's own standing argument against exactly that move, restated in
`proof.js`'s own header): the task contains an anaphoric pronoun ("prove
IT", "what about THAT"), or the task carries no content words of its own
at all. Omitting the third argument degrades to the old always-join
behavior — no caller breaks silently, and the regression is reproduced
byte-for-byte by the omission case in the new test, not just described.
`gatherPreflightMaterial` and its one call site (`app.js`'s `holonicTurn`)
now pass `task` and `discourseLine` as separate arguments instead of
pre-joining them into one string — that pre-join was what defeated the
gate even had it existed.

**Evidence.** `proof.test.mjs` gains a new test pinning the exact
regression: the polluted query with the pronoun set omitted (byte-for-byte
the old bug), the clean query with it supplied (no trazodone/vaccine words
anywhere in the output), the anaphoric case still joining, the
no-content-words case still joining, and a second self-sufficient-task
case (Springfield population vs. an unrelated lighthouse discourse)
verified to now exclude the unrelated topic ENTIRELY — the pre-existing
cap-priority test only ever verified the task's own words survived, never
that pollution was absent. Verified live end to end on a fresh worktree
server, real Ollama, the real conversation described above: the Lincoln
follow-up's actual search became `"Abraham Lincoln vice president"`,
retrieving Wikipedia and a Civil War encyclopedia, zero trazodone
contamination. 72/73 repo tests pass across proof/holon/hypergraph; the one
failure is the same pre-existing, unrelated `morphologyLanguage` test named
in earlier passes, untouched by this change.

**Disclosed, not this pass's problem:** the Lincoln answer that came back
from the now-correctly-retrieved material still named the wrong person
(Breckinridge, Buchanan's VP and Lincoln's 1860 opponent, not Hamlin or
Johnson) — but `checkGrounding` correctly flagged it ("no material matches
that sentence's words"), which is the grounding ladder doing exactly its
job on a different axis (a name the retrieved material doesn't actually
state, not a retrieval-topic failure). Two different failure classes;
fixing one does not paper over the other, and this policy claims only the
one it fixes.

**Files.** `proof.js` (`preflightQuery`'s third argument);
`proof.test.mjs` (`ANAPHORIC_PRONOUNS` imported from the real engine
module, one new test with five assertions); `app.js`
(`gatherPreflightMaterial`'s signature, its one call site).

**Enforced:** `proof.test.mjs`, offline, pure, against the real engine's
`ANAPHORIC_PRONOUNS` — not a local stand-in list that could silently drift
from the one `widget.js` actually uses.
## P30 — A finding is only novel if it differs from what the answerer was already given, never just from the material

Measured 2026-08-19, in a standalone dual-model experiment
(`experiments/system1-cpu-system2-gpu.mjs`) that reuses the real
`checkGrounding`/`corroborateAtoms` (grounding.js), not a copy of them: a
model given the ON RECORD block for a trazodone question — whose own Turn 4
`open` line read "not addressed by VCA Hospitals, AKC, or VetMedGuide" —
answered "...VCA Hospitals, AKC, and VetMedGuide do not cover this." All
three names failed the material check (the passages hold the sources'
quoted CONTENT, never their names as prose) and were flagged
`unsupported_claim`. But the model invented nothing — it read the phrase
back from three lines above in its own prompt. This is the SAME class of
gap P23's own residue already named ("web corroboration still counts
name-STRING matches... which is the referent-model gap, not a counting
bug") and CLAUDE.md's referent-model discipline already states in the
abstract ("a name is a reference to a REFERENT, not a byte sequence"), now
measured on a second axis: a check that only asks "is this atom in the
MATERIAL" cannot tell a model repeating its own prompt back from a model
inventing something, because both produce the identical observable
(absent from `passages`).

**The missing distinction is Bateson's: information is a difference that
makes a difference.** An atom identical to something already present in
what the answerer was GIVEN — its own system message, not just
`state.sources` — carries zero bits relative to that answerer:
`P(x | you were just told x) = 1`, so its surprisal is `-log2(1) = 0`. This
is not a new idea in this project — `emergence/surprise.js` already keeps
novelty (Shannon surprisal) and Bayesian surprise apart for exactly this
reason — it was simply never wired into the grounding ladder's own
unsupported-claim check, which has one index (the material) where it needs
two: material, and given-context.

**The fix, prototyped in the experiment script, NOT YET carried into
app.js/provenance.js (disclosed scope, see below):** every
`checkGrounding` finding is re-tested against a second union index built
from the answerer's own system-message content
(`buildUnionIndex`/`tokenSupported`, both already exported by grounding.js
— reused, not duplicated). A finding whose tokens are ALL present in that
second index is `echoed` — reported, kept on the record, but never counted
toward "claiming things nothing given backs," because it is not a claim
about the world, it is the answerer quoting its own briefing. A finding
still absent from BOTH indexes is `novel` — the only kind that should ever
move a hypergraph edge (hypergraph.js), a live_priors entry, or a human's
attention. **Enforced** (in the experiment only —
`system1-cpu-system2-gpu.test`'s self-test, no separate file yet): the
exact live case above is pinned as a regression (`echoReport` in
`selfTest()`), plus a genuine-fabrication case with an empty given-context
(nothing to echo from, so it correctly counts as novel).

**Why this is an efficiency law, not only a correctness one (user
direction, 2026-08-19): "an expert is not someone with a larger context
window, it's someone with better ability to query the hypergraph of
battle-tested experience."** P2's founding argument is that a modest model
with bounded context can carry a turn *if* what it is handed is well
addressed — the fold instead of a bigger window. Echo/novel classification
is the other half of that argument: once a fact is on record, re-deriving
or re-checking it every time it is repeated is wasted compute spent
reducing zero uncertainty. A system that can tell "this was already
settled" from "this is new" spends its (expensive) checking, proof-seeking,
and prior-updating budget only on the genuine deltas — the same discipline
P23's preflight-before-draft already applies to fetching (ask before
spending, not after), aimed here at checking instead. An instrument that
cannot tell echo from novelty either re-checks everything (slow) or
under-checks everything (unsafe); one that can, gets faster AND more
accurate from the same fix, not one at the cost of the other.

**Disclosed scope boundary, not fixed here.** `app.js`'s tally line and
`provenance.js`'s `classifySentences` are extremely likely to carry this
exact gap live — both call `checkGrounding` against material-only passages
without a given-context second index — but this was measured in the
standalone experiment, not by driving the production chat page, and
`app.js`/`provenance.js`/`holon.js` belong to the fold-architecture
session's ownership (this file's own multi-session rule, Explore section
above). Named as an open, high-confidence follow-up for that session,
not attempted here.

**Live attempt, 2026-08-19, result disclosed rather than left implied.**
The trazodone question was driven live against the real chat page
(gemma2:2b, then qwen2.5:14b-instruct-q4_K_M, four real turns, checking +
web on) specifically trying to force this exact shape — a turn naming a
source it had itself already named earlier. It did not reproduce on
demand: two turns answered clean with zero claims (heavily hedged), one
turn's single claim was genuinely material-supported, and one turn named
"The Merck Veterinary Manual" — a real proof-seeking search fired on it
(confirmed in the Log tab), which is `checkGrounding` working CORRECTLY
(that name is a genuine, novel, unsupported claim, present in neither the
material nor anything given — an honest catch, not this bug). So: the
mechanism this policy describes is real and demonstrated (prototyped,
self-tested, with the exact live case pinned as a regression), but a live
production reproduction was attempted and did not land in this session —
neither "proven live" nor "shown absent" should be read into that; the
underlying risk is unchanged because the same `checkGrounding` call
without a given-context index is still what production runs.

## P31 — A number is grounded by the company it keeps, not by its digits appearing somewhere in the document

Measured live 2026-08-19 (user, driving the instrument directly): a
grounding badge read "30" ✓ 5/6 for the sentence "trazodone typically
starts working within 30 to 60 minutes" — verified only because the digit
string "30" appeared somewhere in an offered passage's flattened bag of
words and numbers (`grounding.js`'s `buildUnionIndex`/`tokenSupported`,
also read by `corroborateAtoms`'s per-atom badges and `checkGrounding`'s
unsupported-claim findings). A passage that mentions "30" in an entirely
different sense — thirty dogs, a 30-day return window, page 30 — would
have counted identically. This is occurrence-counting over raw strings,
the exact failure [[referent-model-not-pointers]] already named for
`widget.js::scoutSpan` (byte-span selection by bare token frequency,
2026-08-17), now found in a second organ. The user's diagnosis, verbatim
in spirit: grounding must read the material's own contextual, hypergraphical
meaning — "you can tell a word by the company it keeps" (Firth).

**Why this is scoped to NUMBERS, not names too — ruled out by a live test,
not assumed.** A first version drew a number's "company" from its
immediate neighbour words; widened, it was tried on NAME atoms as well and
refuted immediately by this file's own suite: `grounding.test.mjs`'s "an
invented figure, agency and year are each caught" wraps a REAL name in a
FABRICATED predicate — "The Kessington Report gave a figure of 21
percent" — and the source states neither "gave" nor "figure" anywhere
near "Kessington Report" (it was "commissioned," never "gave a figure"),
so requiring the real name's company to overlap the fabrication's own
words made the real name fail too. Names keep their existing checks
untouched: `PROPER_RE`'s run-of-capitals already gives a multi-word name
phrase specificity a bare digit string has none of, and `checkGrounding`'s
`resolveName` rescue (P11, referent identity) already protects a
name's sub-forms. A single, ambiguous, referent-less token is where this
instrument had no defense, so that is exactly what got one.

**What shipped.** `buildLocalIndex` (grounding.js) explodes a passage into
its own sentences — the SAME `splitSentences` this file already applies to
the answer, now applied symmetrically to the material, because a fold that
folds only one side of a comparison is a fold that will eventually be
wrong about the other. `numberCompany` takes a number atom's own answer
sentence, minus every atom's tokens in it (a sibling figure or name is a
separate, independently-checked claim, never context that should gate this
one — the Kessington case again, at number scale this time: company is an
OR-match, so it can only make matching MORE permissive, and letting a
fabricated sibling's own words stand as "context" would launder it).
`numberSupporters` requires SOME single passage to have a SENTENCE — not
the whole document — carrying both the number and at least one company
word; with no company available (a bare number surrounded by nothing but
stopwords and siblings) it falls back to the old whole-passage containment
rather than manufacture a new false refusal. Wired into both
`corroborateAtoms` (the badges) and `checkGrounding` (the findings/tally),
which share the identical check so the two can never disagree about one
atom — `corroborateAtoms`'s own doc comment already promised this
equivalence ("an atom with empty refs here is the same fact as a finding
there"); this fix had to preserve it, not just add a check beside it.

**A narrower design was tried and refuted before this one, kept here so it
is not retried.** "Company = the number's single nearest content word each
side" passed the Kessington-style adversarial case (trivially — it doesn't
touch names) but FAILED a real one for numbers themselves:
`grounding.test.mjs`'s "row-group column names count as material" answers
"The case_number column lists 24-0011 for Gary IN PD" against a terse CSV
row — the words immediately beside "24" are the model's own narrative
gloss ("column", "lists"), absent from the terse row itself, while the
genuinely matching word ("case_number", from the header) sits three words
back. Whole-sentence company (minus siblings) fixed this without
reopening the Kessington case, because company is OR-matched and a
genuinely unrelated passage sentence essentially never shares real
vocabulary with a claim about something else (verified directly: an
adversarial passage about "30 dogs" and a "clinic" reopening "in 60 days"
shares zero words with "trazodone... 30 to 60 minutes" and is correctly
refused — the new regression, below).

**Disclosed residue, and the real next step, not attempted here.** Company
is bounded by the structural unit "sentence" — a real code boundary, not a
tuned token count, but still a HAND-CHOSEN unit rather than a measured
one, the same class of debt P4 already names for `ROWS_PER_CHUNK` and
`NULL_SAMPLES`. The user's own sharper statement of the fix this wants
to become (2026-08-19, verbatim in spirit): a word's universe in the
hypergraph is bounded by how many hops out you can go before you reach a
distinction without a difference — before widening the neighbourhood stops
moving the answer beyond what reseeding noise would move it anyway; "the
noise can't beat the NUL." That is `nul/index.js`'s `pattern()` by name
(`before`/`after` grounds, `moved`/`opened`, "a difference that makes a
difference," Bateson) applied to a question that module has never been
asked: not a numeric series, but a RANKED, hop-expanding candidate set
(nearest word, next word, ..., whole sentence, adjacent sentence) with a
STOPPING RULE earned the same way `pattern`'s reseed ceiling was — a null
built by drawing candidate "company" from material the claim was never
about (the same construction `cite.js::bestRival` already uses: drawn by
retrieval, the hardest available comparison, never a random stride), so
the hop expansion halts at the largest radius that still beats what an
unrelated draw of the same size would produce by chance, not at a radius
someone picked. This was named, sketched to this level of specificity, and
NOT built here: `nul`'s own apparatus (`ground`/`difference`/`pattern`) is
built for numeric series (burstiness, windowMean, permutation entropy) and
reusing it for a discrete hop-expansion stopping rule needs its own
design and its own measurement against real material before it earns a
name in this file — exactly the standard P4 and this file's "never tune a
parameter by checking what it does to a golden's own score" sibling rule
(eoreader6.1/CLAUDE.md) hold every other number in this instrument to.
Shipping a claimed null test that was not actually validated would be
worse than the honest, disclosed, sentence-scoped heuristic landed today —
"a heuristic tweak quietly standing in as if it were the real fix" is
exactly what [[referent-model-not-pointers]] warns against.

**Files.** `grounding.js` (`buildLocalIndex`, `numberCompany`,
`numberSupporters`, wired into `corroborateAtoms` and `checkGrounding`;
`hasWord`/`hasNumber`/`wordSet`/`numberSet`/`buildUnionIndex`/
`tokenSupported` untouched — `proof.js`/`primary.js`/`priors.js` read
those directly for a coarser, legitimately different question, whole-
document relevance, not this-claim's-context).

**Enforced.** `grounding.test.mjs`, new case "a bare number is not
grounded by an unrelated occurrence elsewhere in the passage" — the
trazodone sentence checked clean and single-sourced against its real
source, and checked NOT clean (both digits flagged, zero refs) against a
document containing the same two digit strings in unrelated sentences.
Every pre-existing case in the file still passes, including the two this
fix had to specifically satisfy (Kessington's real name inside a
fabricated predicate; the CSV row's column-name company three words back).
20/20 in this file. Measured twice: 749/752 repo-wide before reconciling
with 27 commits landed upstream by concurrent sessions while this was in
flight (three pre-existing, unrelated failures — `arithmetic.test.mjs`,
`measure.test.mjs`, and a flaky `holon.test.mjs` echo-narration case,
confirmed unrelated by stashing this change and re-running those files
alone); 759/760 after merging that work in, the upstream commits having
fixed `arithmetic.test.mjs` along the way — the one remaining failure
(`measure.test.mjs`, a stale `../eoreader6/` path predating the
`eoreader6.1` rename) touches neither `grounding.js` nor this policy.

## P32 — The witness tier: the verdict is derived from a pair of binary reads, never asked as a label

**The rule.** When a claim's web walk has fetched pages, a semantic witness
— the resident small model — may testify about ONE page's bytes, under
three mechanical walls: (1) it is only ever asked the binary question
"does the passage say this sentence is true?", twice — once for the claim
and once for its sibling-swapped twin, the sibling drawn from the page's
own names as the competing filler of the claim's own slot — and the
verdict is DERIVED from the pair (claim-no + sibling-yes → contradicts;
claim-yes + sibling-no → states; both-yes → refused insensitive; both-no →
no testimony), never asked as a classification; (2) the decider shown to
the reader is the source's own sentence — the witness's pointer when it is
verbatim in the bytes, else a located source sentence, else a
word-contained pointer, else the testimony is refused as uncontained; (3)
every refusal is typed (unreadable / insensitive / uncontained /
no-testimony / no-anchor / unreachable) and lands in the audit, and a
witnessed contradiction re-labels the chip (⇄) while the counts stay
visible — composition, never erasure.

**Why.** Measured live 2026-08-19 ("who won the 1960 world series?",
gemma2:2b): the model answered "The New York Yankees won the 1960 World
Series" — false — and the ladder split along its levels. The relation tier
said only "the material never binds this edge": its contradiction test
matches subject+verb, and "the Pirates won X" vs "the Yankees won X"
differs in subject, so no edge matched — that "won the 1960 World Series"
seats exactly ONE subject is world knowledge no mechanical extractor has.
The web tier CORROBORATED the false claim ✓ 3/3: the loser's name
saturates every page about the series, and a count that reads ✓ for
"Yankees won" and "Pirates won" alike is a distinction without a
difference wearing a checkmark. A reader over the same bytes settles it in
two short calls. The binary protocol is itself a measurement: the
three-way form ("states / contradicts / neither") drew from gemma2:2b a
`because` that stated the contradiction perfectly under a verdict label of
"neither" — the reading was right, the classification was beyond it, so
classification was taken away from the model entirely (the model is just
the mouth). The sibling arm doubles as the sensitivity null: a witness
affirming both fillers of one slot testifies about vocabulary, not the
claim, and is refused.

**What mechanical fact-checking would need from the hypergraph instead —
recorded so the boundary is a decision, not an accident.** Slot
competition: a verdict for "the material fills this slot OTHERWISE" —
matching on verb+object-referent with a DIFFERENT subject-referent (the
mirror of its current subject+verb match), gated on the object being a
definite unique referent (the received determiner register, never a
hand-list of exclusive verbs), with exclusivity measured from the
material's own universe (the slot observed with one filler, under a
redealt null, refused as underpowered on tiny materials), both sides of
every comparison through the one shared referent fold, and polarity plus
temporal adjuncts carried in the slot key. That is real, unbuilt work; the
witness tier covers the semantic remainder that no amount of it reaches.

**Files.** `testimony.js` (pure: WITNESS_SCHEMA, buildWitnessMessages,
readTestimony, witnessSlice, siblingSwap, locateDecider, becauseVerbatim/
becauseContained, foldTestimony) + `testimony.test.mjs` (7 conformance
tests, scripted witnesses — the walls, not the reading);
`eval/witness-live.mjs` (the specimen against a REAL model);
`app.js::witnessProof` (the two constrained calls, `format` = the schema,
run inside the proof chip's walk after seekProof, no new egress — the
witness reads bytes a recorded fetch already landed, so it runs under the
same standing web consent); `claims.js::composedSentence` (the witness
aspect, phrased beside the web counts). The reflex ledger gains a
`witnessed` act through its own designed unknown-act fallback — reflex.js
unedited.

**Evidence.** Offline: 7/7 conformance tests; full repo 767 passing (one
pre-existing failure, `measure.test.mjs`'s stale `eoreader6` path).
Live (`eval/witness-live.mjs`, gemma2:2b, three iterations recorded in the
session): the three-way form → right `because`, wrong label (led to the
binary redesign); the first binary run → correct pair (claim-no,
arm-yes) but the sibling picker chose a name spanning a sentence boundary
("National League. The Pittsburgh Pirates") and the pointer wall refused
the garbled arm — the discipline held while the swap was wrong (fixed:
candidates carrying a sentence break are excluded, and the sibling is
chosen by slot-word co-occurrence, longest only as tiebreak); the final
run → verdict "contradicts", armed, decider = the page's own decisive
sentence verbatim ("The Pittsburgh Pirates defeated the New York Yankees
in seven games to win the 1960 World Series.").

**Disclosed limits.** One page per claim (the first stating-or-read page
whose text the turn holds), two short calls — the budget is the walk's
own PROOF_TARGETS_PER_TURN, no new knob. Contradiction is only derivable
when the page offers a sibling in the slot: a page that merely omits the
claim (both-no) is silence, which the ∅ count already says; a
contradiction carried by negation alone ("X never happened") has no
sibling to affirm and is not reached — that is the hypergraph's
slot-competition work above, not a witness gap to paper over. The witness
reads the page the byte walk chose, so a walk that fetched only
irrelevant pages gives the witness nothing to read (no-anchor, typed).

**Amended 2026-08-19 (same day) — measured against 25 real facts, not
assumed: three bugs found, recall moved 2/25 → 5/25, precision held at
zero wrong corrections throughout.** The user's direction after the
witness tier first landed: "fix and chase to get better results" against
`eval/witness-batch-eval.mjs` (new — 25 real, well-known, single-answer
factoid claims, each with a declared `correctPattern` fixed before any run,
checked against REAL fetched Wikipedia pages via this instrument's own
explore-server, never fixtures — the whole point, after the hypergraph's
structural matcher was measured failing on real prose's variety of
phrasing, is that real material is messier than a hand-built specimen and
the witness tier has to survive that). Query building steers to Wikipedia
FIRST, an ordinary search only as fallback (user direction: "have it
always steer there and then go to primary sources" — the primary-source
half stays named, unbuilt follow-on work, not attempted here).

Three real, disclosed bugs, each found from an actual live read, fixed in
`testimony.js`: (1) `siblingSwap`'s candidate pool admitted names spanning
a raw newline (`"Other\nUndecided\nMargin"` — infobox cells glued by
plain-text extraction) and names whose only qualifying sentence was a
Wikipedia image caption legitimately repeating the claim's own topic words
in its own title text (`"Jean Leon Gerome Ferris"`, a portrait's painter,
for a "who wrote the Declaration" claim, because the portrait is titled
*"Writing the Declaration of Independence, 1776"*) — both now excluded
before scoring, and a zero-score tie now returns null instead of the
longest surviving name; (2) the witness's own `real.because`, when it
answers "no", frequently already NAMES the correct filler outright
(measured: "the Pittsburgh Pirates were matched against the New York
Yankees ... and the Pirates won" sat unused while the independent
slot-scoring heuristic picked "Major League Baseball" instead) —
`siblingSwap(sentence, slice, {hint})` now tries a name drawn from that
hint FIRST, walled exactly like every other candidate (it must already be
a real, filtered candidate in the same slice — a model's own possibly-
hallucinated reasoning can never become an ungrounded swap on the hint's
word alone); (3) no fixed temperature — the identical prompt against the
identical page flipped its own yes/no answer between two successive runs,
which is not tolerable in a fact-check. `completeOnce`/`complete` (app.js)
gained an optional `temperature` passthrough (undefined leaves every
ordinary generative call untouched; witness reads pass `0` — a
classification task, not a creative one).

**What did NOT move, and why that is the finding, not a shortfall.** Zero
wrong corrections across all three measured runs — every fix improved
RECALL (fewer honest refusals), none touched precision, because the
mechanism's walls (pointer containment, the sibling-agreement gate) are
independent of candidate quality by construction: a bad candidate produces
a refusal, never a lie. The dominant remaining failure, disclosed rather
than chased further this pass: `witnessSlice`'s anchor-sentence scoring has
no signal for whether a "sentence" is real prose at all, so a flattened
polling-table row that happens to repeat the claim's own words verbatim
(`"Poll source Date(s) administered Ronald Reagan (R) Jimmy Carter (D)
..."`) can out-anchor the page's actual prose naming the winner. That is a
different, harder problem than sibling selection — a structural prose-
vs-table signal belongs in the anchor scoring itself, not another
candidate filter — named as the next concrete step in
`eval/witness-batch-eval.mjs`'s own header, not attempted here.

**Files.** `testimony.js` (`CAPTION_MARKERS`, the newline/zero-score walls
in `siblingSwap`, the `hint` parameter); `testimony.test.mjs` (+4
conformance tests, each pinning one measured live shape — newline-glued
furniture, caption topic-restatement, hint-first with its own wall, the
zero-score-tie refusal); `app.js` (`completeOnce`/`complete` gain
`temperature`; `witnessProof` passes `hint: real.because` and
`temperature: 0`); `eval/witness-batch-eval.mjs` (new — the 25-specimen
harness itself, self-test mode, three runs' numbers recorded in its own
header). 831→832 repeated full-suite passes across the pass (the file
count moved only because tests were added, never because one broke).

**The same-day companion fix — the void, acknowledged.** Same user
session, a second direction: "if the surf did not turn something up, the
model should be fed the acknowledgement of this void." Before this, a
preflight search (P23) that ran and found nothing looked, to the model,
identical to a turn where no search was ever attempted — the drafting
model had no way to distinguish "I have no material because nobody
looked" from "I have no material because I looked and there was none."
`holon.js` gained `SEARCHED_VOID_PREFIX` and a `searchedVoid` parameter
threaded through `runHolonicTask` → `runPart`, reaching ONLY the flat
chat branches (both the with-history and without-history shapes) as a
fact appended to `CHAT_SYSTEM_PROMPT` — information, not an instruction
(the same posture `experiments/facts-before-draft.mjs`, an independent
session's parallel work the same day, converged on from a different
angle: "give the model only what it needs, don't stack behavioral
steering on top"). `app.js`'s `holonicTurn` sets it from
`gatherPreflightMaterial`'s own gap detail exactly when the preflight
search ran and came back with zero chunks; a decomposed part's own
narrower framing is untouched by design (`flat`-gated, matching every
other flat-only fold-in this policy set already establishes). Pinned by
4 new `holon.test.mjs` regressions: the fact reaches both flat chat
shapes, never appears on an ordinary materialless turn where no search
ran, and never leaks into a decomposed part.

## P33 — Verification is EVA, decomposed across the engine's own nine-cell grid, never one ad hoc tier

**The rule.** Whether a claim holds is not one check; it is up to nine,
addressed by the engine's own domain×grain grid
(`packages/engine/operators.js::TERRAIN_BY_DOMAIN` — three domains
(Existence, Structure, Interpretation) × three grains (Ground, Figure,
Pattern) = Void/Entity/Kind, Field/Link/Network, Atmosphere/Lens/Paradigm).
`verification.js::verificationTasksFor` walks all nine for one hypergraph
claim (+ an optional witness verdict) and returns nine typed cells, never
a scalar. Domain order is load-bearing, not cosmetic: Existence gates
Structure gates Interpretation, because a referent that fails to exist is
a PRESUPPOSITION FAILURE (Strawson on Russell's "the present king of
France is bald" — a type error, not a falsity), so a failed Entity cell
forces every claim-scoped cell below it (Link, Network, Lens) to a typed
`not_yet_executable` gap, REGARDLESS of what data the caller supplies for
them — a witness result handed in for a claim whose referent never
resolved is composed as absent, never reported. This is the JNJ incident
(P23's amendment) inverted: that bug manufactured a false referent and
then happily verified downstream; this rule is what stops the grid from
repeating it the other direction.

**Belnap's fourth value.** `holds` / `fails` / `both` / `gap` /
`not_yet_executable` — five verdict tokens, not three. `both` is Belnap's
told-true-and-told-false (*"How a computer should think,"* 1977): a bound
edge whose material ALSO states the opposite polarity elsewhere
(hypergraph.js's own `contested` field — "divergence between perspectives
is a signal, not noise to smooth") composes as `both`, counted in its own
bucket by `verificationSummary`, never averaged into `holds` or `fails` —
the same no-undeclared-scalar-collapse discipline this policy set already
holds elsewhere, read the same way at the verdict-vector level.

**Five cells are real, surfaced not duplicated** (the standing rule,
applied to this repo's own checking ladder): Void/Entity/Field/Link from
hypergraph.js (already built, P32's Belnap-`both` wiring landed the same
pass), Lens from testimony.js's witness tier. **Four are disclosed
absent**, typed `not_yet_executable` with a stated reason, never silently
skipped: Kind (`emergence/kinds.js` exists as a real engine organ, never
wired to a claim check), Network beyond the one measured slot-competition
case (P32's `competing` field covers same-verb+object/different-subject
only — not general network-exclusivity), Atmosphere and Paradigm (no
organ exists for either).

**Every cell carries its giver and its dependency**, declared once
(`GIVERS`, `DEPENDS_ON`) so the presupposition gate and the record's own
audit trail cannot drift apart — the truth-maintenance move (Doyle's TMS
/ de Kleer's ATMS): a belief carries its own justification, so a
superseded premise's downstream verdicts are mechanically findable, not
archaeological. A `cursor` (turn number, passed in — this module computes
no timestamp, the standing seq-not-clock discipline) rides every cell: a
verdict is a claim as of a tick, and bitemporal reasoning (Snodgrass —
valid time vs. transaction time) says which tick matters.

**Wired live**, one panel per turn in the existing "thinking" disclosure
(`renderFold`'s `verification` block, styled exactly like "what was sent"
— raw `JSON.stringify`, never a re-narrated summary): user direction,
verbatim, "make sure all routing like this is stored in the json of the
prompt and response available through the 'thinking' affordance." Verified
live (2026-08-19): `who won the 1960 world series?` composed all nine
cells correctly — Void/Entity/Field holding, Link failing (no edge for
"Yankees —won→ 1960 World Series"), Kind/Network/Atmosphere/Paradigm typed
absent, Lens typed absent with the honest reason "no witness ran for this
claim."

**Disclosed residue, not fixed here.** Lens is not yet wired to run
against the SAME claim object Link/Network compose from — the witness
tier (testimony.js) checks CHECKABLE ATOMS (extractCheckableAtoms's
extraction), a different representation than hypergraph.js's SVO triples,
extracted by a different organ on a different schedule (proof-chip
click/autorun vs. turn-render time). Unifying claim identity across the
two extraction mechanisms so a witness result composes into the SAME
nine-cell record as its hypergraph sibling is real, named, unattempted
work — not silently implied done because the Lens cell exists and is
wired for the CASE where a caller supplies both.

**Files.** `verification.js` (new, pure, no organ run, no network
crossing — composes already-computed results); `verification.test.mjs`
(16 conformance tests: the grid shape, presupposition short-circuiting
every claim-scoped cell including Lens, the Belnap-both composition, the
giver/dependsOn declarations, the cursor threading); `app.js`
(`verification` computed per hypergraph claim inside the turn's own
render path, one relation report per section — never cross-wired between
sections — passed to `renderFold`, rendered as its own "thinking"
sub-panel).

**Enforced.** 848/848 repeated full-suite passes across the pass (only
growing, never regressing, since verification.js duplicates no existing
organ's computation).

## P34 — The two-pass answer: S1 fast, S2 checked, and the discourse line rides with history, never instead of it

**S1/S2, decided (2026-08-19).** A turn can render a fast, unchecked
answer immediately (S1: no retrieval, no verification, `S1_SYSTEM_PROMPT`
alone) and, only when `extractCheckableAtoms` finds something in it worth
checking, run the full existing grounding pipeline as S2 — same model as
S1 (a deliberate correction from an initial cut that used the routing
ladder's fastest rung for S1 and the picker's model for S2; the point of
the experience is isolating whether the checking apparatus itself earns
its cost, not confounding that with a model-size difference) — handed
S1's own words (`priorPassFor`) as information to confirm, extend, or
correct, never as an instruction about which of those to do.

**The bug, measured live: "system 2 keeps drifting off the discourse."**
`holon.js`'s `executeMessages` assembly builds one of four message shapes
depending on (material present?, flat turn?). Two of the four
(flat+material, flat+materialless-with-history) computed a one-line
discourse fold (`chatContext` — the fold's own distilled topic/flow/
entities, `discourseLine` in app.js) and then discarded it whenever
verbatim `chatHistory` was also being sent: `(chatHistory.length ? "" :
chatContext)`. This reads as a reasonable de-duplication at a glance —
raw history looks like it should make a summary of that history
redundant — but the two are not the same information: `chatHistory` is
recent TURNS, `chatContext` is a SYNTHESIS (topic, flow, named entities)
that a small model does not reliably re-derive from raw turns for free,
especially under the "bare minimum context, snip as needed" design this
policy's own turn-construction already aims for elsewhere.

**Why this failure mode is worst exactly when it matters most.**
`aperture.js`'s regime (POLICIES.md's own "System 1's own ground, measured"
entry) can narrow `chatHistory` down to its structural floor — the two
messages of one exchange — under a startled turn. At that exact moment,
the raw-history slice is at its thinnest and the discourse line is the
ONLY remaining anchor to the wider conversation; the prior code discarded
precisely that anchor precisely when the raw slice could least stand in
for it. Not a defect in `presentWindow`'s own narrowing (a measured, tested
design — a declared floor, linear interpolation, the same decay rate
belief itself uses) — the defect was a second, complementary assembly
being thrown away beside it.

**The fix.** `chatContext` now folds into the system message
unconditionally in both affected branches, never gated on
`chatHistory.length`. Two regressions pinned in `holon.test.mjs`: the flat
material branch and the flat materialless-with-history branch each now
assert the discourse text survives a call that also carries verbatim
history — mirroring the existing `searchedVoid`-reaches-the-
history-branch pattern already pinned for the same reason (a fact fed
forward must reach every branch it applies to, not just the one branch
that happened to be tested first).

**Enforced.** 964/964 tests passing after the fix (963 before — two new
cases, one folded into an existing test, one standalone, plus the
pre-existing count).

## P35 — A chorus of nine is a label, not nine agent calls

**The question, from the user, connecting two existing mechanisms:**
whether System 2's checking should be "a chorus of 9" — CHORUS-LOG.md's
own multi-persona review practice, retargeted from code diffs onto
answers. Checked directly rather than assumed: `verification.js` (P33)
already decomposes every claim across the identical nine-cell grid
(`operators.js::TERRAIN_BY_DOMAIN`) the chorus proposal cites, with five
cells real (Void, Entity, Field, Link, Lens — the last via testimony.js's
witness tier) and four disclosed absent, using no extra model calls: it
composes results `hypergraph.js`/`testimony.js` already computed. It
already carries the Lincoln's-VP presupposition fix a chorus-style
Void/NUL amendment would ask for (`hgClaim.fillers.length > 1` — "the
space this claim names is not fully bounded").

**What CHORUS-LOG.md's chorus actually is, checked rather than assumed:**
a code-review practice — 9–11 named personas run as real Workflow agents,
reviewing a DIFF against POLICIES.md/CONSTITUTION.md citations. It has
never checked a model's answer against material; retargeting it literally
(nine real agent calls per claim, per turn) would be a real cost
regression, directly against this repo's own efficiency argument (P30,
echo/novel: do not re-spend compute on what a mechanical check already
settles).

**What shipped: labels, not agents.** `verification.js`'s
`VERIFICATION_GRID` now carries a `persona` field per cell, drawn from
CHORUS-LOG.md's own confirmed roster (Diaconis/Void, Holmes/Entity,
Frankfurt/Kind, Dijkstra/Field, Ostrom/Link, Alexander/Network, Feynman/
Lens, Pearl/Paradigm) — a name, costing nothing at runtime, giving a
reader "who is checking this" continuity with the existing review
practice without multiplying S2's cost. Atmosphere/REC has no confirmed
entry in CHORUS-LOG.md (checked directly, zero hits); Simon is carried as
a disclosed SUGGESTION only, matching the cell's own disclosed-absent
status — never presented as a confirmed reuse the way the other eight are.

**The three open questions the original proposal posed, answered on the
strength of what's actually in CHORUS-LOG.md rather than deferred
further:** Link is already Ostrom/CON in the confirmed roster — no real
overlap with Dijkstra, who owns Field/SEG; the one historical case where a
Dijkstra review also touched Link content was informal, not a standing
ownership claim. Ship-gate: disclosed-not-blocked, matching how
`verification.js` already treats `both` (Belnap's fourth value) and
`contradicted` as SURFACED states rather than hard blocks — consistent
with this repo's standing practice (CHORUS-LOG.md itself treats "noted,
not fixed" as a legitimate outcome, not a failure).

**Not built, not claimed built:** the actual nine-cell content is
unchanged by this pass — no new organ, no new verdict, only the persona
label. Kind, Network (general case), Atmosphere, and Paradigm remain
disclosed absent exactly as P33 already states.

## P36 — EVA computes, REC concedes: the hypergraph as a first-class verification act, with provenance

**The redirect, from the user, correcting an over-narrow first cut.** A
prior investigation (`MECHANICAL-COVERAGE-INVESTIGATION.md`) measured how
far this repo's hypergraph could answer questions mechanically and sketched
a `succession-answer.js` — a NEW module, narrowly shaped to Wikipedia's own
succession-box infobox format. The user's correction, verbatim-adjacent:
"this is far too shaped to that problem... we want to know essentially how
we evaluate EVA the hypergraph to be able to answer questions with
provenance, and REC our understanding as needed, for any arbitrary thing,
omnimodally." The fix was not a bigger succession-box parser — it was
noticing that grid.js's `evaluate` verb is ALREADY the general EVA seam
(P22), already logged, already terrain-typed, and already documented as
carrying a real, disclosed gap in its own refusal text: *"grid.js records a
declared verdict, it does not yet compute one."* Closing that gap generally
is a smaller, more general fix than a new succession-only module, and it
composes with material of any shape a real checking organ exists for —
never scoped to one Wikipedia format.

**What EVA computing means, concretely.** `evaluate <claim> at <terrain>
from <stance> ground <source> broken:<perturbation>` with NO `verdict:`
clause (already legal grammar, previously always left permanently
undetermined) now triggers a real check when `ground` names an
already-loaded source: `capacity-runner.js`'s `landAct` calls
`runCapacity("relations", {claim})`, which runs `hypergraph.js`'s real
`read(claim)` — the SAME judge() every material-grounded chat answer is
already checked against — against the named ground's real text. Only two
of judge()'s five verdicts are strong enough to COMPUTE a holds/refused:
`bound` → holds, `contradicted` → refused. `unbound`/`beyond-reach`/
`unheard`/`competing` all mean "the material does not settle this," never
"the material says no," and are deliberately left undetermined — no
verdict is set, `foldGrid`'s existing DEF/EVA companion read already
renders this honestly as "wish, no verdict declared yet" with ZERO changes
to that function. A wrong COMPUTED verdict would be worse than an honest
non-verdict, the same discipline `arithmetic.js`'s own order-reversing-
phrase refusal already holds elsewhere in this repo.

**Provenance rides for free.** The computed verdict's own evidence —
`hypergraph.js`'s `edgeFace`-shaped `refs` (real byte-address citations
into the ground material), `nearest`/`bound` edges on a miss, corroboration
counts — is attached whole as the RESULT's payload, never summarized away.
Verified live against a real 160KB cached Wikipedia page (Andrew Johnson,
not a fixture): `evaluate Andrew Johnson was the 17th president ... ground
andrew-johnson.txt` computed `holds`, with 8 real passage refs spanning the
article. The SAME real page's "The 16th vice president, he assumed the
presidency..." — true, and stated — computed `unbound`/undetermined,
because the sentence's subject is a pronoun; `extractRelations`'s candidate
nomination anchors only on capitalized surfaces (the identical
previously-undocumented gap the mechanical-coverage investigation's own
military-governor specimen surfaced, now confirmed live on a second,
independent real specimen). This is disclosed, not hidden: an honest
non-verdict on a true, unreachable claim is the correct behavior, not a
defect to paper over.

**REC — "revise understanding as needed."** Before a COMPUTED verdict
lands, the live fold is checked for an EARLIER evaluate of the SAME object
(case-folded) already carrying a determined verdict. If the new computation
disagrees, `grid.concedeEvaluation` lands an EVIDENCE·REC·Figure·produced
entry FIRST — `concedes` naming the prior act, `trigger` stating the
verbatim disagreement — mirroring `build-log.js::rezeroBuild`'s own real,
already-shipped shape exactly ("the operator judged the projection and the
ground it was built on is conceded"), applied to a checked claim instead of
a code build. Only then does the new verdict attach. Nothing here ever
silently overwrites an earlier verdict with a later one; re-confirming the
SAME verdict a second time lands no REC at all (agreement is not a
contradiction) — both directions pinned as regressions.

**Reuse over invention, at every layer.** `capacities.js`'s `relations`
entry (already wired 2026-08-19, same day, for graph queries) gained a
`claim` mode rather than a new capacity id. `grid.js`'s `attachResult`
gained an optional `extra` parameter (task-log.js's own documented payload-
merge rule — any non-reserved key on a RESULT entry rides onto the
projected task — means a computed `verdict` reaches `foldGrid`'s EXISTING
companion-match with ZERO changes to that function). No new engine import,
no new organ, no new capacity id. `term.js`'s `act` command and app.js's
`/act` chat door both already call the SAME `landAct`/`runCapacity`
instance (`initTerminal`'s own `runCapacity` pass-through, `relationsFor`
already injected 2026-08-19) — this capability is live on BOTH doors with
ZERO further wiring in either file.

**Omnimodal, honestly scoped.** Today this closes for TEXT material only,
because `hypergraph.js` is the one real checking organ this pass wires in.
A ground ruled by `measure.js` (numeric/audio) or `store.js`/`store-sql.js`
(tabular) has no checking organ plugged into this same seam yet — asking to
evaluate a claim against one of those today simply finds no `claims` to
judge and lands undetermined, which is honest (never a guess) but not yet
a REAL typed `not_yet_executable` disclosure the way `capacity-runner.js`'s
other nine reference-only capacities already have. Naming that gap
precisely, rather than leaving it implicit, is real, scoped, unattempted
next work — not claimed done here.

**Named, not built: squaring polarity.** Live verification surfaced a real,
disclosed limitation in `extractRelations`'s OWN negation handling, not in
anything this pass built: "Andrew Johnson was never the 17th president" (a
copula construction) did not reliably flip polarity the way "Lincoln never
appointed Hamlin" (a transitive verb) does — evaluating both the positive
and the fabricated-negative phrasing of the same claim against different
material both computed `bound`. The user's own proposed check, real and
unbuilt: evaluate a claim AND its negation independently and cross-check
the pair — opposite verdicts (bound vs. contradicted) mean the extractor's
negation detection is trustworthy on that sentence shape; the SAME verdict
on both readings is itself the tell that detection silently failed on that
construction, independent of trusting either single reading alone.
Structurally the same move `testimony.js`'s `siblingSwap` already makes
(ask twice, derive the verdict from the pair, never trust one pass) —
applied to polarity itself rather than the object filler. Not attempted
this pass.

**Files.** `grid.js` (`attachResult` gained `extra`; new `concedeEvaluation`,
exported). `capacity-runner.js` (`runCapacity`'s `relations` branch gained
`claim`; `landAct` gained the `evaluate` branch, REC check included).
`grid.test.mjs` unchanged, all 49 passing (purely additive signature).
`capacity-runner.test.mjs` grew from 16 to 23 cases — computed holds with
real provenance; computed refused from a real contradicted claim; stays
undetermined on unbound (never guesses); REC fires on genuine disagreement;
REC does NOT fire on repeated agreement; a human-declared `verdict:` is
left completely untouched (zero capacity run); an unloaded ground stays
silent, matching `distinguish`'s own precedent exactly — all against the
REAL engine perceiver organs, no stubs. Full suite: 23/23, 49/49,
zero regressions in either file. Live end-to-end verification against a
real, uncached-nowhere-else 160KB Wikipedia page is recorded above.

**Amended same day — a second real bug, and a rendering crash, both found
by actually driving the live app rather than trusting the test suite
alone.** Driving `/act evaluate` through the real chat UI crashed
immediately: `actTurn` (app.js) and term.js's own `act` handler both
assumed `landed.capacity.result` was always cast's `{referents}` shape
and called `.map()` on it unconditionally — `evaluate`'s new "relations"
result has no `referents` field, so every real evaluate crashed with
"Cannot read properties of undefined (reading 'map')". Fixed by branching
on `landed.event.verb` and rendering the computed verdict back through
`grid.foldGrid` (never a locally recomputed guess), so the message always
matches exactly what a later `grid`/`/self` read of the log shows.

With that fixed, real fact-checking against the exact Andrew Johnson
material this investigation started from found a second, different bug:
"Andrew Johnson was the 22nd president" (false) and "Andrew Johnson was
the 17th vice president" (false — the exact original conflation) both
computed `holds`, squared and confirmed. Squaring only checks polarity;
it says nothing about whether a bound claim's own object is the
material's real object or a substituted wrong one — hypergraph.js's own
`endpointsMatch` object fallback (`tokensShare`) needs only ONE shared
token to call two objects "the same," and "22nd president" / "the 17th
president of the United States" share "president" and nothing else.

Fixed as `checkObjectSpecificity`: read the real edge(s) that `judge()`
itself used to bind the claim, via the claim's own `refs` — never a
re-derived subject/verb guess, which a first attempt got wrong live (it
missed a claim's real backing edge on a pronoun subject and wrongly
downgraded a TRUE claim to undetermined). Require the real backing
edge's own object to state EVERY one of the claim's content tokens, not
merely one. A bound-but-unconfirmed verdict downgrades to undetermined,
disclosed with which tokens failed to match. Also found, honestly, not
smoothed over: "Andrew Johnson was the 16th vice president" (the
material's own TRUE words) *also* downgrades under this check — not a
regression. That sentence ("The 16th vice president, he assumed the
presidency...") is an appositive with no copula; `extractRelations`
never produces a clean "X was Y" edge from it, so the earlier "holds" was
itself a coincidental match via the same loose fallback, never a genuine
one — the fix doesn't only catch wrong answers, it refuses to keep
confidently shipping a right answer with no real backing.

Verified live end to end through the real chat UI: the exact original
conflation now renders "undetermined... a real edge shares some of the
claim's own words but not all of them (checked: 17th, vice, president) —
the material does not state this specific claim, only something that
resembles it." `capacity-runner.test.mjs`: 27 → 30 (three new cases
against the real engine organs and the real Andrew Johnson specimen).

**Disclosed, not wired: the ordinary chat path still makes this exact
mistake.** Everything above lives behind the explicit `/act evaluate`
door — nothing here is wired into `holonicTurn`'s ordinary S1/S2 answer
pipeline. Verified live, same session, same material, the plain question
"What number vice president and what number president was Andrew
Johnson?": the S1 fast draft answered "the 17th Vice President... served
under President Ulysses S. Grant" (the original conflation plus a
fabricated relationship — Johnson never served under Grant); the S2
checked pass dropped the fabrication but still answered "the 17th vice
president and the 17th president of the United States" (both ordinals
wrongly stated as 17th), and the existing grounding checker marked it
"standing on the material" regardless — it checks for the presence of
name tokens ("Andrew Johnson," "United States"), not the specific
numbers, the identical class of bug `checkObjectSpecificity` closes for
the `/act` path. Wiring an equivalent check into the ordinary answer
pipeline's own grounding ladder is real, directly motivated, unattempted
next work — named here rather than implied done.

## P37 — HL: reasoning over the hypergraph is a logic with declared givers, never a smarter matcher

**The law.** Content-general inference over the relation tier's edges —
functional exclusion, transitive composition, negation as involution,
quantifiers — lives in `hl.js` as a LOGIC whose models are stages
(finite, append-only hypergraphs) and whose verdicts are judgment
outcomes, never in `judge()` as additional matching heuristics. Every
declaration that licenses an inference (`functional`, `transitive`,
`complete`) enters with a named giver or is refused, typed — a
declaration is exactly as strong as its acquisition, and this module
makes their USE sound, never their acquisition free. Opt-in and
additive: `judge()`, `relationFindings`, `relationsClean` are
byte-identical; nothing in the live pipeline consumes hl.js yet.

**Why it exists — the measured gap.** `judge()` under-claims by
construction on uniqueness violations: "Lincoln was the 22nd president"
against material binding only `ordinal(lincoln, 16th)` finds no matching
edge and lands `unbound` — a silent under-claim, not a wrong verdict,
but the falsehood was checkable and nothing checked it. hl.js's R2
(functional exclusion) convicts it from the declaration `functional
(ordinal)` plus the bound edge, no numeric special case anywhere.
Pinned end to end in `hl.test.mjs` against the REAL engine organs: a
real `makeRelationReader` run over real passages, its public edges
adapted into a stage, `married(lincoln, someone-else)` reading
`unbound` before `declareFunctional("married", {giver})` and
`contradicted` after.

**The verdict lattice, and one disclosed divergence.** bound /
contradicted / contested / unbound are Belnap–Dunn FDE (negation swaps
the first two, fixes the rest — double negation involutes), with
`beyond-reach` outside the lattice as genuine inexpressibility (a term
with no anchor), absorbing through every compound. DIVERGENCE, decided
not accidental: support+counter is CONTESTED-dominant here, where
`judge()` verdicts `bound` and rides opposition as metadata. Any future
adapter from HL verdicts back onto the app's badge surface must map
this consciously — it is a real semantic difference, disclosed in both
files' headers.

**Quantifiers under the grain theorem.** ∃ binds on a witness and
persists; ∀ over an open domain is refutable (one persistent
counterexample) but never bindable at any finite stage — its
non-refutation is stage-indexed (`unrefuted@stage`) and does not
compose through ∧/∨ (typed refusal, not a silent coercion). ∀ over a
domain declared `complete(D, {giver})` reduces to a finite conjunction
and may bind: the postulation route, the declaration's giver carrying
the weight. Types genuinely restrict — an out-of-type counterexample
cannot refute a typed ∀, pinned adversarially after an external review
caught the type parameter accepted-and-ignored in the reference
implementation.

**The judgment layer.** `attach(φ) = verdict(φ) + sensitivity(φ)`: a
verdict earns attachment only if perturbing the claim (negation;
functional-slot substitutions) MOVES it; an insensitive verdict
downgrades to `undetermined` rather than attaching. Structural
consequence, tested: bare unbound on a non-functional relation never
attaches — a verdict that reads the same on the claim and its negation
was never a judgment about that claim.

**The anchor honesty clause.** `stageFromEdges` consumes the reader's
PUBLIC edge face (plain strings by design); anchor identity is an
injected `anchorOf` resolver when a caller has real referent identity,
folded strings when not, and the stage labels which
(`anchorKind: "resolved-referent" / "folded-string"`) — the P11
boundary ("the same name" and "the same recurring word" are never the
same claim) carried into the logic rather than blurred by it.

**Scope and residues, named.** No functional/transitive declarations
exist yet for any real corpus — the register is empty, and building it
(hand-named closed class, per-relation givers, priors.js's own
discipline) is the actual next work; R2's value on live material is
exactly proportional to that register. Wiring HL verdicts into the
grounding ladder or the verification taxonomy (P33's Lens cell is the
natural seat) is unattempted. The landing was scoped to two new files
(`hl.js`, `hl.test.mjs`, 16 conformance cases) touching zero existing
files, because the tree was mid-edit across app.js/grid.js/term.js by a
concurrent session — the ground-ledger.js posture. Full suite after:
1004/1004 passing, zero regressions.

**Amended 2026-08-20 — the core moved, acquisition landed, both against
disclosed evidence rather than assumption.** Two changes to what P37
originally described.

**(1) hl.js's core (Stage, declarations, R1-R6, the verdict lattice,
attach) moved to `eoreader7/native/interpretation/hl.js`.**
Not a preference — `operators.js`'s ORGANS table, audited by domain,
shows Interpretation as the most fragmented domain in the entire
registry (30 of 62 organs — corrected from an initial miscount of
"29 of 62" that failed its own arithmetic, caught by an independent
adversarial review the same day; real counts Existence 11 / Structure
21 / Interpretation 30) while Existence already has one (`nul/index.js`)
and Structure's was never promoted. Same review found the omnimodal
proof satisfies the constitution's Article II.1 but not its stronger
Article II.11 (a real cross-modal-failure contrast, not a second
hand-typed toy fixture) — disclosed, not yet closed. Full corrected
account: eoreader6.1/CLAUDE.md.
Proven content-general before trusting the move, not asserted: the
engine's own `hl.test.mjs` runs the identical rules over a
non-linguistic supply-chain stage with structurally identical results
(the omnimodal test, Article II.1). The-fold's `hl.js` is now the
adapter alone (`stageFromEdges`), re-exporting the engine's API so
nothing that imported it broke.

**(2) `hl-acquire.js` (new) is the spin-up gate, productionized from
the manual experiment — and it exists specifically NOT to repeat a
mistake found live, same day, in a concurrent session's work.** That
session wired DEF/EVA/REC into mechanical question-answering ("chase")
and hit a wall hand-tuning subject/verb/object per specimen — fixing
one regressed another, rediscovering one parameter at a time the exact
paraphrase-intolerance ceiling MINE-1's eleven passes already disclosed
in CLAUDE.md. `hl-acquire.js` is built to the opposite discipline: it
counts structure (does a subject bind more than one object for a
relation) and uses the grammar lens ONLY as a rejection filter, never
to re-derive roles or fix a specimen. Composes three organs this repo
already owns (`makeRelationReader`, `makeGrammarLens` with the real UD
treebank prior, and a refutation scan) with one reused, not re-derived,
number: `EVIDENCE_FLOOR = 2`, `emergence/binding.js`'s own structural
minimum ("one arrival has no co-arrival to test").

**The two-tier register, and the grain theorem applied to the
acquisition itself.** `functional(r)` is a Pattern-grain (∀-shaped)
claim — a corpus can refute it but never earn it, the identical theorem
probe D proved for the operator face. So `hl-acquire.js` produces
exactly two things: REFUTED (a real, permanent counterexample) and
CANDIDATE (unrefuted-at-this-stage, defeasible forever, licensing a
disclosed flag only — never R2 conviction, which needs a named giver
`declarations.js`'s own `promoteAndDeclare` requires explicitly).
Concession of a later-refuted candidate is REC
(`declarations.js::concede`), engine-side, mirroring `grid.js`'s own
`concedeEvaluation` exactly.

**Validated against an adversarial fixture, not War and Peace.**
`hl-acquire.test.mjs` invents a short chronicle (Zorlan, Brannic, Iyla —
no real referent, nothing recallable) with a genuine trap: "governs" is
actually functional in-world; "advises" is not, but looks IDENTICALLY
clean on the small sample (2 subjects, zero counterexamples) — the
exact coincidental-validation risk a memorizing extractor would hide.
Run through the REAL relation reader and REAL grammar lens twice: stage
one acquires both as candidates; the corpus grows by one sentence
("Zorlan advises Iyla."), re-read as one enlarged passage set (never
diffed against a separate reader instance — vocabulary discovery needs
real material, and this is how a re-read would actually happen), and
`recheckCandidates` concedes "advises" from the real extractor's own
new edge, leaving "governs" as the sole surviving candidate. Two live
extractor quirks found and worked around HONESTLY rather than patched
around: the real UD-treebank prior classifies "trades" as noun-
dominant (correctly rejected by the grammar lens before the trap could
even be reached — the first fixture draft used it and had to be
replaced, not fixed); and a single short sentence run through its own
isolated reader instance produces zero edges (vocabulary discovery
needs a real corpus, not four words) — the fix was re-reading the WHOLE
grown corpus together, which is also the honest way a real re-read
works, not a workaround.

**Full suite after: the-fold 1002/1002 (net -2 from the prior count —
hl.test.mjs shrank from 16 to 4 cases as its logic tests moved to the
engine; hl-acquire.test.mjs added 10), eoreader6.1's own new modules
19/19. One pre-existing failure in eoreader6.1's full suite
(`goldens/multimodal/score.test.mjs`, a video causal-boundary test) is
unrelated to this work — confirmed by `git status`: the only files this
change touches are CLAUDE.md, packages/engine/package.json, and the new
interpretation/ directory; the failing test and the modified
goldens/network files belong to a concurrent session already mid-edit
there.

## P38 — An index answering "does this exist" is not an index answering "is this established": never hand one to a mechanism that reads

**The law.** Any organ whose behavior depends on how much a material has
established — activation, recall, recurrence, cast membership, "is this a
real being or a passing mention" — must be handed a referent index built
for THAT question. It must never be handed an index built for the
different, narrower question "did this material mention this name at
all, even once" (a presence check). The two are computed by the same
function (`discoverReferents`) with one parameter (`minSentences`)
deciding which question it answers, and nothing in either index's own
shape marks which one it is — no type, no flag, no name. Confusing them
produces no error and no exception. It produces silence: the reading
mechanism quietly under-fires, or fires zero times, and looks exactly
like "this material doesn't support pronoun binding" when the real fact
is "the wrong index was asked." Before wiring any new activation-based,
decay-based, or recall-based mechanism to an existing referent index in
this repo, check what floor built that index. If it is `cast.js`'s
(`minSentences: 0`, its own header explains why — presence, not cast),
build a separate pass with `discoverReferents(surfaces, {})` instead,
letting the organ's own DERIVED recurrence floor apply — the same thing
eoreader6.1's `host/corpus.js` already does, validated at book scale.

**The incident this law is named for (2026-08-20).** Wiring
`pronouns.js::resolvePronouns` into `hypergraph.js`'s relation tier (to
stop a material edge from shipping as "He —was→ also the 16th vice
president" instead of "Andrew Johnson —was→..."), the first cut reused
`cast.js`'s already-built referent index — the SAME one `endpoint()`
already uses for matching, one identity, never a second cast, the P11
discipline this file already holds everywhere else. It compiled, it ran,
it threw nothing, and it never resolved a single pronoun against real
fetched Wikipedia prose, read in true left-to-right document order.
Traced by testing the hypothesis directly rather than assuming: zero
pronoun mentions were even ATTEMPTED, because `resolvePronouns`'s own
gate refuses any sentence carrying ANY named surface, and `cast.js`'s
`minSentences: 0` promotes a ONE-OFF place name ("Greeneville",
mentioned once) to full referent status exactly like "Johnson" (mentioned
dozens of times) — so a one-off place name in the same sentence blocked
the attempt just as hard as a real competing person would. This is not a
mismatch between the organ and encyclopedic prose (real biographical
writing renames its subject constantly and IS a harder case than a
novel's long pronoun-carried stretches, but that is a separate, honestly
smaller residual — see below); it was one line reusing the wrong index.

**The fix, and the measured before/after.** `hypergraph.js`'s
`resolvePronounSubjects` now runs its own `discoverReferents(surfaces,
{})` pass, per passage, instead of consuming the shared `index` —
deliberately a SECOND discovery pass over the identical text, because the
two callers are asking different questions of it, not the same question
twice. Before: 0 pronoun mentions attempted across a real ~3,300-character
Wikipedia passage naming its subject in nearly every sentence. After: real
bindings fire and the extracted edges show it — "Johnson gave a number of
speeches," "Johnson was eager to complete the work," "Johnson attended a
party," "Johnson delivered a rambling address," "Johnson only presided
over the Senate" — sentences whose raw text says only "He." Remaining
gaps are the organ's own honest, typed refusals (`pronoun_no_candidate`,
`pronoun_no_margin` — a sentence genuinely co-mentioning someone else, or
a real activation margin too thin to call), not silence.

**Chain of custody, for the next reader wondering how "prove the Lincoln
fix" turned into a fix in a shared eoreader6.1 file.** Same incident,
same day, three more real, measured, tested fixes surfaced and landed
along the way, each following the identical discipline (measure before
trusting, fix at the source, never chase a closed list of site-specific
punctuation): `hypergraph.js`'s `blankFurniture` organ, scoped to
extraction only, stopped a Wikipedia succession box's bare "Preceded
by"/"Succeeded by" rows from gluing into garbage relations.
`holon.js`'s `buildRedefinedPart` replaced a critique-of-the-prior-draft
correction prompt with a fresh, uncritical re-ask carrying the material's
own confirmed closed set as a given — three successive wording fixes to
the critique framing each got dodged a NEW way (an echoed escape phrase,
narrating the question, inventing an unconfirmed nearby name), which
diagnosed the framing itself as the defect, not the wording.
`gatherPreflightMaterial` (app.js) now folds every search result's own
snippet into one combined, honestly-addressed `web:search-results`
chunk — cheap, clean, and complete in a way a single fetched full page
often is not — after first shipping it as N separate per-result chunks
and measuring that nine near-identically-scoring candidates racing for
three retrieval slots is a coin flip on which FACTS survive. And
`extractSurfaces` (eoreader6.1, shared, widely used) gained `|` to its
run-breaking punctuation set — a web-title convention
("Topic | Section | Site") this organ, proven on book prose, had never
been checked against — found by running real material, not by auditing
the regex. Titles were then dropped from the search-results digest
entirely rather than chasing the open-ended set of a title's OWN
separator conventions one character at a time (hyphens next) — the exact
"cannot be formatted to specific sites" refusal this repo already made
for succession-box parsing, aimed here at title formatting instead.

**Full test status across every fix in this chain.** the-fold 1003/1003,
eoreader6.1 1116/1116 (the `extractSurfaces` fix, a shared file with real
regression history — CLAUDE.md's own "referent-merge chain of incidents"
— re-run in full, not spot-checked), both clean before and after.

**Amended same day — belief is held BY AN EXPERIENCER, not just given by
a source; the hypergraph now records it durably.** User direction,
verbatim: "this requires having the hypergraph record beliefs,
assertions, etc" and "everything isn't just given by a source it is
believed BY an experiencer." The completeness gate's own verdict (P36's
`fillers.length > 1` — "we were expecting one and got multiple") used to
live only in `runPart`'s local variables, gone the moment the call
returned. It now lands as a REAL task-log entry on the SAME shared,
app-wide log `/act`/the terminal already write to (`state.gridLog`),
composed from organs this repo already owns and tested — `grid.js`'s
`evaluate` verb, `capacity-runner.js`'s `landAct` orchestration (parse →
land → run `hypergraph.read()` → attach the RESULT), the exact organ
`capacity-runner.test.mjs` already proves lands a REC when a second
evaluate on the same object disagrees with the first. No parallel
mechanism was built for this — `runPart`/`runHolonicTask` gained four
new, fully optional, backward-compatible params (`grid`, `gridLog`,
`runCapacity`, `landAct`; all four null is byte-identical to before),
threaded through app.js's real `runHolonicTask` call gated on
`state.grounded` (the same gate `makeRelationReader` already uses two
lines up, for the identical reason: with checking off, nothing downstream
of it has anything to land). Every landed belief carries `because
<experiencer>` — which reading, for which part of which task, formed
it — because grid.js's grammar is space-delimited for clause keywords
(`ground`/`at`/`from`/`because`), NOT colon-suffixed like `broken:`/
`warrant:`, a real bug caught by writing `because:${x}` first and testing
it: the whole clause silently vanished into the PRECEDING `ground`
clause's own free-text capture, landing with `because: null`. Fixed,
and pinned as a regression (`holon.test.mjs`, two new cases: a real
computed verdict lands with a real experiencer attached; the whole
mechanism is provably a no-op when the four organs are omitted). Full
suite after: 1007/1007.

**Disclosed, not fixed — a live-verified gap, found the same day by
checking the terminal's own `grid` command after a real turn, not
assumed clean.** `isIncomplete` is an OR of two independent signals
(`incompleteClaimsOf` — the general hypergraph-claims one — and
`successionIncompleteFindings` — the narrower succession-box one); the
belief-landing above only ever walks the first. A live turn whose
redefine round was triggered by the SECOND signal correctly rewrites the
draft (the existing mechanism, untouched) but lands nothing on the belief
log — confirmed live: the redefine phrasing shipped, `grid` in the
terminal read "nothing landed yet." Extending `landCompletenessBelief`
to also land a belief per succession-box office-holder group is real,
scoped, unattempted next work, named here rather than implied covered.

**Named, not built — the next, sharper trigger this whole mechanism was
actually pointed at.** User's own synthesis, live, watching the two-pass
answer (P34) disagree with itself: S1 (fast) answered "Andrew Johnson,"
S2 (checked) answered "Hannibal Hamlin" — the SAME question, the SAME
turn, two DIFFERENT referents asserted as THE answer by the same
instrument. "The whole point of our rationality thing is that these
point at two different referents and point to a conflict that warrants
deeper reasoning via a def eva rec cycle." Nothing today compares S1's
and S2's own named referents against each other — `priorPass` threads
S1's text into S2's prompt as context, but no mechanical check asks
whether the two independently-formed answers agree on WHO. That
disagreement is a real, cheap, already-available signal — arguably
better than waiting on `clusterFillers` to find a multi-filler edge,
since it needs no retrieval luck at all, only two passes that already
run on every checked turn. The natural close: when S1's and S2's primary
referents diverge, land TWO evaluates (one per candidate) against the
turn's material via the SAME `landCompletenessBelief`/`landAct` path
just built, and let the material's own verdicts (not a guess) decide
whether this is a genuine "both true, redefine as an enumeration" case
or one candidate simply wrong. Not built — the infrastructure it needs
(durable belief-landing, REC-on-disagreement) is exactly what this
amendment just shipped.

**Amended again, same day — built, and the build caught the SAME mistake
twice in two different shapes, both from the SAME rule.** User direction,
verbatim, twice: "we need to point at REFERENTs not exant spans" and,
after the fix, "update that as a rule too, not pointing at spans, we
point to referents." This is not new to the codebase — it is
READING-POLICY P7.2's own words ("a check on a NAME asks about the
referent, not the string") and hypergraph.js's own `queryReferents`
carries the identical direction in its header already, dated 2026-08-19.
What is new is that THIS SESSION independently walked into the same hole
twice in one sitting, building the `competingSubjectsOf` check named
above:

1. First cut queried the standalone, module-level `queryFillers(edges,
   {verb, object})` — disclosed in hypergraph.js's own header as matching
   on exposed SURFACE STRINGS, not referent IDs, because it runs after
   `edges` has left the reader's closure. A test fixture spelled the same
   object "Lincoln's" in one place and "Lincolns" in another and the
   query missed the match outright — reproduced live, not theorized.
   Fixed by calling `relations.queryReferents({verb, object})` instead —
   the referent-aware sibling, run INSIDE the reader's closure against
   the SAME `endpoint()`/`endpointsMatch` `judge()` trusts internally,
   already built and already carrying this exact rule in its own
   comments from a PRIOR pass — found by reading it, not written fresh.

2. Second cut still broke, one layer up: the SLOT DEDUP KEY (`seenSlots`,
   deciding whether two claims describe "the same" verb+object) was built
   from `claim.object`'s own raw string. A corrected draft's second
   sentence added one trailing word ("...vice president TOO") and, keyed
   by string, that read as a second, unrelated slot — each sentence then
   saw only ITSELF as already covering the subject it named, and reported
   the OTHER as still missing, in both directions, forever. Fixed by
   keying the slot on `subjects`' OWN sorted identity — the material's
   confirmed referent set, already resolved by the query in step 1 — never
   the draft's own varying phrasing.

**The rule, general, so it does not have to be rediscovered a third
time:** anywhere code decides whether two pieces of text name "the same"
thing — a query, a dedup key, a coverage check, a cache key, an equality
test — that decision must run through referent identity
(`endpoint()`/`endpointsMatch`/`queryReferents`, or the equivalent for
whatever the codebase's own resolved-identity primitive is), never
through raw string/span comparison (substring, exact match, byte offset).
A span is where a word SITS; a referent is WHAT IT NAMES; two spans can
name the same referent while differing by a single character, and a span
comparison will silently treat them as unrelated. This is READING-POLICY
P7.2 restated for the-fold's own call sites, not a new rule — the value
of writing it here is that it now names two concrete, reproduced
the-fold incidents (not just eoreader6.1's) a future session can grep for
before building the third one.

## P39 — A claim's identity is threaded through existing fields, never a new mechanism built to carry it

**The law.** When a system needs one stable identity to follow a claim
across several independently-built stages — an act, its backing edges, a
computed verdict, a later concession — the identity itself (a content
address, minted once) is new, but CARRYING it never is. Before adding a
field, a parameter, or a whole new function to thread an identity through,
check what already threads through the same path: an operator/grain pair
is already free from picking a verb and a terrain; an attribution field
(who backs this) already exists if anything upstream already answers "who
vouches for this claim"; a payload extension point already exists if
anything upstream already merges extra fields onto a projected view. A
new cross-cutting concern is a reason to widen an existing carrier, almost
never a reason to build a second one beside it.

**What this closes.** The Per-Source Testimony spec (one coherent voice on
the surface, unique per-source testimony underneath, derived not stored)
names BUILD-0 as its own foundation: mint a claim_id once, thread it
through the act, its edges, a grammar tag, the per-source verdict, the
merge, and any concession — intra-pass identity only, no semantic
canonicalization, the same disclosed scope `induceEntityKind` already
carries elsewhere in this project's own cross-pocket work.

**The incident this law is named for, same day, same session.** The first
cut built `landCell(log, {claimId, domain, grain, operator, witness,
payload})` — a new function, landing a new EVIDENCE entry, with its own
validation. It compiled, it tested green, and it was deleted within the
hour, because every one of its six fields already existed somewhere else
in this exact file: `operator`/`grain` are free from picking a verb and a
terrain in an ORDINARY act (`land()`'s own header, reconciliation 2:
"terrain is medium-blind, past the engine's own domain lock" — the
identical move one field over); `witness` (who is testifying) was
answering the exact question `warrant:<giver>` already answers for
`relate`'s unestablished edges, and `land()` already threads
`event.warrant` onto the log; `payload` was reinventing `attachResult`'s
own `extra` parameter, whose doc comment already states it merges onto
the projected task via `projectTasks`' documented rule. The fix that
shipped needed exactly ONE new wire: `land()` gained `claim_id:
event.claim_id` in its already-enumerated field list, the same list
`warrant`/`because` already sit in — a caller mints the id and sets it on
the event object before calling `land()`; nothing else changes.
`attachResult(log, taskId, result, {claim_id})` already worked with zero
further grid.js change, since `extra` was already general.

**What actually landed, tested, real.** `grid.js` gained three
functions: `mintClaimId({subject, verb, object})` (async, Web Crypto
SHA-256, the identical digest approach `builds.js::buildHash` already
uses — a claim_id and a build's own hash read the same way on the
record); the one-line `land()` change above; and `foldClaim(log,
claimId, {domain, grain, at})`, a plain filter over `log.entries` reading
whatever fields those entries already carry — never a schema this
function invents or requires, and cursor-scrubbable exactly like
`foldBuild(log, atSeq)` already is for code. `capacity-runner.js`'s
`landAct` gained one optional `claimId` parameter (omitted →
byte-identical to every call before this pass) and two new pure
functions built on top: `perSourceReadings(grid, log, claimId)` (BUILD-1
— one record per source that checked a claim, `{claim_id, who, read,
revision, verdict, polarity, edges, grammar, corroboration, emitted_by}`)
and `mergeTestimony(readings)` (BUILD-2 — pure, no model, no
log-landing, the four spec-named cases: `AGREE`, `SINGLE`, `DISAGREE`,
`UNDETERMINED`).

**Two disclosed deviations from the spec's own sketch, found by reading
real code rather than assumed.** (1) The spec's §2 types `who` as the
SOURCE and `read` as which passage; `withExperiencer`'s existing,
already-shipped convention uses `who` for the MECHANISM that computed the
belief and `read` for the source/ground text — genuinely different
questions, not a naming accident to paper over. `experiencer.js` keeps
its own meaning unchanged; `perSourceReadings` maps spec-`who` from
`experiencer.read`, spec-`read` from `judged.refs` (finer-grained than
the whole source), and the mechanism identity lands on `emitted_by`, the
spec's own named slot for exactly this. (2) The spec types
`corroboration` as a bare `int`; `hypergraph.js`'s `judge()` already
computes the richer `{passages, sources}` — distinct sources counted
apart from raw passage count, this repo's own standing P12/P29 rule ("two
chunks of one file are one perspective"). Kept richer rather than
collapsed to match the spec's own placeholder type; `null` (not a fake
zero) when a claim never reaches corroboration at all.

**A disclosed fifth case the spec's own four-case enumeration misses.**
AGREE is written as "≥2 testimonies, all HOLDS" — literally, not "all
agree." A claim every determining source REFUSES (unanimous
contradiction, zero holds) is real, confident, and un-covered by any of
the spec's own four names — not the same as UNDETERMINED (silence) or
DISAGREE (a genuine split). Named `CONTRADICTED`, reusing the exact word
`hypergraph.js`'s own per-edge vocabulary already has for this, rather
than inventing a new term or silently filing it under UNDETERMINED and
losing the fact that something real WAS determined, just negatively.

**Measured, every case from a real testimony set through the real
pipeline, not synthesized reading objects — including a real, reproduced
extractor limit found building the DISAGREE fixture.** A first cut of
the opposed-polarity fixture ("Lincoln never appointed Hamlin. Someone
else got the job.") computed `undetermined`, not `refused` — not a
negation-detection failure, but the SAME L2 rule this file's own P38
entry already names, freshly reproduced: "Lincoln" appeared only
sentence-initially in a 2-sentence text and never cleared the referent
bar. Fixed the fixture (not the claim) by adding a third sentence putting
"Lincoln" outside sentence-initial position, exactly matching this file's
own already-proven `LINCOLN_TEXT` fixture shape — and confirmed the
correction, not just retried a phrasing until something happened to
pass. `grid.test.mjs`: 58/58. `capacity-runner.test.mjs`: 45/45,
including one case per named outcome (AGREE, SINGLE, DISAGREE,
CONTRADICTED, UNDETERMINED) plus an empty-set edge case. Full suite:
1044/1044, zero regressions.

**Named, not built this pass — real, scoped, disclosed next work.**
BUILD-3 (grammar-lens tagged at hypergraph EXTRACTION time rather than
`capacity-runner.js`'s current post-hoc `checkConnectorClass`, plus a
named-giver declaration for the UD treebank `grammar-lens.js` already
depends on but has never formally attributed) and BUILD-4 (the crown
render — a template-only, model-free renderer over `mergeTestimony`'s
own output, with a real, testable exactly-1 token-trace-coverage veto;
inspired by, never ported from, a frozen eoreader5 legacy reference —
Constitution I.2's re-earning discipline, not a copy) were both, as of
this writing, in flight as separate, non-file-overlapping passes. BUILD-5
(a `huntUndetermined` web result entering the SAME merge as one more
witness, `who: web:<url>@<date>`) and the model's own bare, unprompted
assertion entering as ITS OWN witness (`who: self:model` or similar,
almost certainly barred from ever counting toward AGREE's corroboration —
the sharper, generalized restatement of this file's own "Echo vs novel"
entry: nothing a model says is truly ungrounded, it is grounded in
itself, and that is a witness this system should name and weigh
honestly rather than exempt into a separate bucket) are named, real, and
not yet started.

Full suite after both fixes: the-fold 1018/1018.

**Amended 2026-08-20 — BUILD-4 landed (`crown.js`, the render — its own
files, own doc comments) exactly as scoped above, plus a direct,
mid-task user instruction that resolved the self:model question this
policy had only named: not a special "ungrounded" exception, but
TESTIMONY FROM A WITNESS whose read is its own weights — `SELF_WITNESS =
"self:model"` and `isSelfWitness` landed in `capacity-runner.js`,
`mergeTestimony` amended so a self-witness never co-signs AGREE's
corroboration count alone (DISAGREE's own condition untouched — a
self-witness genuinely opposed by a real refusal still disagrees, on
the record, never silently resolved toward CONTRADICTED), and
`crown.js`'s render functions never special-case it — they print
whatever `who` string a reading carries, verbatim, so a self-witness
sitting next to a real source name in a DISAGREE render is itself the
disclosure. Both amendments are backward compatible by construction:
byte-identical output whenever no reading's `who` is `SELF_WITNESS`.

**The other half — the construction — is now also real and tested, not
wired to any real caller.** Before this, EVERY test exercising a
self:model reading (`capacity-runner.test.mjs`, `crown.test.mjs`)
hand-built one — the mechanism was proven reachable in principle, never
actually producible. `capacity-runner.js` gained `landSelfAssertion(grid,
log, {subject, verb, object, verdict, claimId})`, the missing
construction, deliberately NOT built on `landAct`'s `evaluate` branch:
`evaluate`'s own grammar refuses at parse time without a named `ground …
broken:<perturbation>` (correctly, for a real check), and a self-assertion
has no ground by definition. `define` is grid.js's own already-documented
exception (no refusal fires at parse for a missing companion evaluate,
because defining is the act of putting a claim forward, not checking
one) — the correct EO-typing for an assertion with nothing behind it but
the asserter. `landSelfAssertion` lands a DEF act (through the unchanged
`grid.parseAct`/`grid.land`, the same `at Field from generate`
terrain+stance this file's own P22 entry already uses for a worked
`define` example) and attaches a RESULT to it directly, shaped —
proven by test — to be field-for-field indistinguishable from what
`perSourceReadings` already knows how to project. **`perSourceReadings`
and `mergeTestimony` needed ZERO further changes**: this pass's own
earlier amendment already treated `who === SELF_WITNESS` as ordinary
data on an ordinary RESULT cell, not a case requiring its own lookup
path, and that bet paid off exactly as designed.

**Deliberately deferred: no real call site.** `app.js` and `holon.js`
are named, twice, in this file's own CLAUDE.md map (the Explore section's
"Shared-file ownership (multi-session)" list, and independently in
`experiencer.js`'s own header, written the same week) as belonging to
the fold-architecture session's contract — and `app.js` was found,
mid-task, carrying live, unrelated, uncommitted work (an audio-
transcription feature, landed minutes before this pass began) that this
pass's own edits would have sat beside with no coordination. This is the
same posture P20's own residue already states for `provenance.js`
("actively mid-edit by a concurrent session... folding it in here would
have compounded that collision rather than avoided it") and the same one
HL's own map entry states for the same two files ("the tree was mid-edit
by a concurrent session across app.js/grid.js/term.js when this
landed"). Rather than guess at a call site inside a file this pass does
not own, the real, tested primitive ships alone, with an integration
note — `self-witness-integration-note.md`, this repo's own sibling to
`chip-coverage-note.md` — naming exactly where the trigger condition
already sits (`holon.js`'s `inspect()`, its no-material branch,
`holon.js:994-1000`) and the one real design nuance found while reading
that code rather than guessed at: the (subject, verb, object) triple a
caller should mint from is NOT `extractCheckableAtoms`'s atom-shaped
findings (`holon.js:998`, candidates for proof-seeking, not a triple
shape) — it is `relations.read(text)`'s own real edges
(`holon.js:1028`, `hypergraph.js`'s SVO extraction run against the
model's OWN drafted text), specifically the ones that come back
`beyond-reach`/`unheard` for lack of any material to bind against, since
those are exactly "the model asserted real structure and nothing was
there to check it against." Full detail, including the disclosed open
question the integration note does NOT resolve (how the owning session
should decide `holds` vs `refused` per edge, and whether every such edge
should mint a claim or only some), is in that note.

**Measured, real, tested.** `capacity-runner.js` gained one function
(`landSelfAssertion`, ~55 lines including its own doc comment) and no
other file was touched. `capacity-runner.test.mjs` gained 8 cases: a
real "holds"/"refused"/"undetermined" landing each proven, field for
field, against this file's own pre-existing hand-built `selfModelReading()`
fixture (the exact fixture every self-witness test in both
`capacity-runner.test.mjs` and `crown.test.mjs` already relies on);
three typed-refusal cases (`no_claim`, `unknown_verdict`, `no_claim_id`)
— never a silent no-op; one true end-to-end case landing a real material
hold AND a real `landSelfAssertion` hold on the SAME log and confirming
`mergeTestimony` reaches SINGLE, not AGREE, exactly as the self-witness
amendment above requires, with no hand-built object anywhere in the
chain; and one non-interference case confirming a self-assertion landed
under one claim_id does not disturb a different claim_id already on the
same shared log. `capacity-runner.test.mjs`: 55/55 before this pass'
own edit, 63/63 after — the +8 delta is exactly the 8 new cases, zero
regressions. `crown.test.mjs`: 26/26 before and after, untouched, as
expected (`crown.js` needed no change — the whole point of BUILD-4's own
`who`-is-just-a-string design). Full suite: 1086/1086 at this pass' own
start, 1099/1099 after — disclosed honestly rather than claimed as a
clean +13: a concurrent session modified `serve.mjs` and added new
`eval/` files WHILE this pass ran (confirmed live via `git status`
between two full-suite runs), so only +8 of that delta is this pass'
own; the remainder is unrelated, in-flight, concurrent work this pass
did not audit and makes no claim about. `git stash` was tried first to
isolate the count precisely and abandoned mid-attempt when it proved the
wrong tool here — `capacity-runner.js` already carried BUILD-4's own
uncommitted `SELF_WITNESS`/`mergeTestimony` amendment before this pass
began, so stashing this pass' own edit reverted straight to the last
COMMIT, not to "BUILD-4 before this pass" — which broke `crown.test.mjs`
(it imports `SELF_WITNESS`, which the stashed-to state no longer
exported) for the several seconds between the stash and its immediate
pop. Named here rather than silently smoothed over, in the same spirit
this file's own P5.5 already holds every other surprising result to.

## P40 — Belief-graph standing is conservative and revisable: surfing enriches, it never forces a first read to stand

**The law.** Two rules, stated together because they are one discipline
seen from either end. First, ADMISSION stays conservative rather than
greedy: a candidate being (referents/entity.js's own Born gate) or a
candidate standing (host/corpus.js's individuation classifier) is
admitted only on real, witnessed evidence, and absence of evidence is
withheld judgement, never manufactured conviction — this repo's own
constitutional statement from the grounding-ladder section, restated one
layer down at node identity itself. Second, and the part that was
missing: because more reading can always ENRICH what is already believed
("we can always enrich our reading through additional surfing"), a
belief the graph holds is a belief, not a verdict — it must stay
revisable as the reading grows, and a revision is CONCEDED (the prior
standing kept, on the record, superseded) rather than silently
overwritten. The belief graph the model carries is exactly that: a
belief. Surfing and folding can reveal that what looked like a character
was an artifact — a wire-service byline, a running head, a citation
apparatus stapled to nearly every paragraph — and the graph must be able
to say so without pretending its first read was final.

**Referents, never surface spans — the discipline this whole mechanism
had to honour to be correct at all.** Every join in this pass is keyed
by a referent's own canonical face (`host/graph.js::referentFace`, the
SAME lowercased display string `admitGraph`'s own `canon()` already
lands triples on), never by testing whether some string superficially
resembles another. Getting this wrong is not hypothetical here: building
this pass surfaced a REAL, pre-existing bug of exactly this shape,
living in the SAME file the new mechanism needed to touch.

**The bug found and fixed: two nodes for one referent, silently.**
`host/terrains.js`'s co-arrival binding register keyed its candidates by
`r.id` (a referent's opaque, positional id — `"ref:auto:elizabeth"`)
while the SVO stated-relations path, three lines above it in the same
function, canonicalised through `referentLookup` to `r.display`
(`"Elizabeth"`, lowercased to `"elizabeth"`). `bindingTriples` (engine
`emergence/binding.js`) reads `l.a.id`/`l.b.id` straight through into the
triples it hands `readTriples` — so a witnessed co-arrival pair landed
belief on a node keyed by the referent's OPAQUE ID, disconnected from the
node its own STATED relations already accumulated on. Measured live on
`pg84-frankenstein.txt`: 7 of 7 witnessed co-arrival pairs on this
fixture had `r.id !== referentFace(r)` — every single one would have
fragmented. Fixed by keying the binding register with `referentFace`
throughout, the one face every organ that touches a graph node now uses.
Pinned as a regression (`host-terrains.test.js`): after the fix, no node
in a real, bound admission is keyed `ref:auto:…` — the shape the bug
would leave behind if it regressed.

**What shipped, engine tier (`emergence/graph.js`).** `nodeWeights(graph)`
— every node's CURRENT weight, the sum of its incident edges' already-
decayed weight, in one O(edges) pass — closes a real asymmetry: `mentions`
only ever grows (a permanent tally, like a reading's raw word count),
while edges decay by design; ranking by `mentions` alone is exactly the
mistake `referents/entity.js`'s own register already refuses for beings
("frequency is not significance; that is how a reader ends up calling
the commonest word the protagonist"), now closed for graph nodes too.
`restandNode(graph, nodeId, {standing, giver, because})` — a witnessed
revision of what a node IS, modelled directly on the file's own
`injectPrior`: received, never derived, `giver` required on every call
("indistinguishable from a fabrication" otherwise, `injectPrior`'s own
phrase, reused verbatim in the new function's own doc comment).
APPEND-ONLY (`standingHistory`, copy-on-write so a staged snapshot never
silently grows a later revision) and CONSERVATIVE ON AGREEMENT — restating
the current standing is a no-op, `changed: false`, the exact rule P36
already states for EVA/REC on the claim ledger ("re-confirming the same
verdict lands no REC — agreement is not a contradiction"), now proven
identically at node-standing scale. DELIBERATELY VOCABULARY-AGNOSTIC:
`standing` is accepted as whatever the caller declares (including
explicit `null`, a genuine retraction, distinct from never having been
reviewed at all) — never checked against a fixed list. Importing
`referents/index.js`'s own `INDIVIDUATION_TYPES` into `emergence/graph.js`
was considered and refused: it would have been the FIRST-EVER coupling
from `emergence/` to `referents/` in this codebase (checked directly,
grepped both directions, neither currently imports the other), for a
five-word list this file has no business knowing the meaning of — the
same "IDENTITY IS WHATEVER IT IS GIVEN... the graph does not resolve
identity and must not" rule this file's own header already states for
triples, held one column over for kind. A node the graph has never
registered (no incident edges) is refused (`unknown_node`, a typed
report, never a throw) rather than manufactured just to hang a judgement
on — the constitutional line the-fold's own grounding ladder already
holds, applied here.

**What shipped, host tier (`host/graph.js`, `host/terrains.js`).**
`castStandings(session, sourceId)` reads the cast's own individuation
verdicts (host/corpus.js's already-shipped apparatus/emanon/protogon/
holon classifier), keyed by `referentFace`, OMITTING every referent whose
individuation is `null` — a classifier declining for lack of evidence
must never overwrite a standing an earlier, evidenced verdict already
set; absence licenses withholding, never manufacturing.
`reconcileGraphStandings(session, {sourceId})` lands each changed verdict
through `restandNode` and — the part that could not be skipped once
tested against real prose — DISCLOSES what it could not land. Measured
live on this repo's own `wire-quiet-subject.txt` fixture: "Continental
Newswire" is discovered, typed `apparatus` (namingSentenceShare 0.525,
27 mentions), and its verdict genuinely cannot land, because
`extractRelations`'s own subject span for this fixture's stated
relations is the shorter fragment "Newswire" alone — not one of the
referent's registered surfaces — so `canon()` falls through
uncanonicalised and the SVO triple lands belief on a DIFFERENT,
un-canonical node this reconciliation can never find by the referent's
own face. That is a real, separate, upstream limitation (the relation
extractor's own subject-span coverage — the same class of gap this
file's own P36/HL sections already name for pronoun subjects, now found
again on a different construction) — fixing it by fuzzy-matching surface
strings was considered and refused on the merits: that is precisely the
referent-vs-surface conflation this whole mechanism exists to refuse,
one level down. So the miss is named on `unresolved`, never silently
absorbed into an empty `restood` list — `admitGraph` and
`sessionTerrains` both now return it, and `host/terrains.js` pushes a
typed `standing_unresolved` entry onto the Void ledger naming exactly
which referent and why. `host/terrains.js` additionally WITHHOLDS every
cast-typed `apparatus` referent from co-arrival binding — a narrating
apparatus co-arrives with nearly everything by construction, so binding
it as cast would read the container's own voice as the story's
structure — with the withholding itself a named Void entry
(`apparatus_withheld_from_binding`), never a silent absence. Staged
network snapshots (the reading cursor) and `sessionGraphSnapshot` both
now rank nodes by `weight` (current belief), not lifetime `mentions`,
and both carry the complete `standings` list (never limit-cut — a
demotion must stay visible even once the demoted node no longer makes
the weight cut).

**What shipped, engine tier again — the symmetric door
`referents/entity.js` never had.** The host-tier apparatus classifier
above is one measured heuristic; the deeper, statistically rigorous Born
gate (`admitFromArrivals` — ground/difference/witness, the same organ
`goldens/cast`/`goldens/network` calibrate against) had NO mirror of it
at all. `offerCandidates` sweeps forward only — a surface already
admitted (`state.entities.has(surface)`) is skipped forever, regardless
of how much more has since been read. `reviewEntities(state)` re-runs
the SAME already-tested gate against the GROWN reading for every
currently-admitted being: a being that still clears is left alone,
silently (agreement is not a revision, the identical discipline
`restandNode` holds one tier up); a being that no longer clears LAPSES —
removed from `state.entities` (so its surface is honestly re-offerable,
should the pattern genuinely return) and appended to the new, append-only
`state.lapsed` ledger, carrying the FULL gap object `admitFromArrivals`
returned (not reduced to a bare type tag — `refusals()`'s own
`why.gap ?? why` idiom was copied by mistake in the first cut of
`lapsedEntities` and caught by this pass's own test: that expression
collapses to the tag, the opposite of what a lapse record should keep,
fixed to pass `why` through whole). A real, deterministic transition was
constructed and measured, not assumed: a candidate present only inside a
short reading's own spike admits with `censored: above`; the SAME
candidate, diluted across a much larger reading at the same recurrence
rate, no longer clears (`made_no_difference` — the pattern/witness test
refusing because the diluted late-half activity no longer differs from
what reseeding the early ground alone would produce) — the wire-service-
byline story, mechanically reproduced at the Born-gate layer, not only
the corpus-level heuristic layer. **A real id-collision this addition
would otherwise have created, fixed before it could ship:** `admitEntity`
built ids from `entities.size`; once a being can LEAVE `entities` (a
lapse), size can fall, and a later, genuinely different being could be
handed an id a lapsed being already used. Fixed with a monotonic
`state.bornCount`, incremented on every admission and never decremented
— pinned as its own regression (a lapse followed by a new admission gets
a provably fresh id).

**the-fold's own rendering (`explore/explore.js`, `explore/explore.css`).**
A node carrying a standing draws with a dashed pill (`.gnode.stood`) and
a small uppercase badge naming the CURRENT standing — the same visual
grammar the Entity view's own `.ind` tag already uses for individuation,
reused rather than given a second costume. The tooltip states the prior
standing when one was conceded, and the giver. The summary line counts
how many nodes were re-typed on review and how many were withheld as
apparatus, the same place binding's own counts already live — never
buried only in a per-node hover.

**Deliberately not attempted this pass, named rather than silently
absorbed.** The relation extractor's own subject-span coverage gap
(the reason "Continental Newswire" cannot be reconciled on the wire
fixture) is real, upstream, and unfixed — the same class of limitation
this file's P36/HL sections already disclose for pronoun subjects,
surfacing here on a different sentence construction. A node's on-canvas
FONT SIZE stays keyed to lifetime `mentions`, unchanged — only the
served/ranked ORDER now reflects current weight; redesigning what drives
visual size is a separate, larger decision this pass did not make.
`entity.js`'s own surface-keying (a real being can have several surfaces,
merged only by `referents/consequence.js`'s separate, deliberately
non-string causal identity test) was read and deliberately left
untouched — `consequence.js`'s own header states plainly why identity is
never decided by comparing spellings, and `reviewEntities` operates at
exactly the unit `entity.js` already works in, not a referent-merged one;
folding the causal identity layer INTO review (does a being's whole
merged-referent evidence, across all its surfaces, still clear the gate)
is real, scoped, future work.

**Files.** `packages/engine/emergence/graph.js` (`parseEdgeKey`,
`nodeWeights`, `restandNode`) + new `conformance/graph.test.js` (8
cases). `packages/engine/referents/entity.js` (`bornCount`, `lapsed`,
`reviewEntities`, `lapsedEntities`) + `conformance/entity.test.js` (+3
cases, deterministic construction verified live before being trusted).
`packages/host/graph.js` (`referentFace`, `castStandings`,
`reconcileGraphStandings`, `nodeWeights`/`restandNode`/`parseEdgeKey`
re-exported, `sessionGraphSnapshot` re-weighted and carrying
`standings`) + `conformance/host-graph.test.js` (+4 cases, two against
the real wire fixture, one a synthetic direct demonstration once a
matching node exists). `packages/host/terrains.js` (binding keyed by
`referentFace`, apparatus withholding, weighted staged snapshots,
per-call reconciliation, both new Void gap types) +
`conformance/host-terrains.test.js` (+3 cases, one a REGRESSION test
against the fragmentation bug on real Frankenstein prose). All in
eoreader6.1. `the-fold/explore/explore.js` + `explore/explore.css`
(standing rendering) in this repo.

**Measured.** eoreader6.1's full conformance suite: 1094/1091/0 passing
before this pass (3 skipped — the gitignored `goldens/cast` fixture,
unaffected), 1112/1109/0 after — the +18 delta is exactly this pass' own
18 new test cases (8+3+4+3), zero regressions, same 3 skips. Both new
Frankenstein/wire-fixture findings above (the binding-fragmentation bug,
the subject-span reconciliation miss) were confirmed live against the
real fixtures before being written up here, not assumed from reading the
code.

## P41 — A cell reports what it checked, or says it did not: the absence of a refusal is never a check

**The law.** Two rules, one discipline, both found by reading an existing
eval driver's own printed output rather than by reasoning about the code.

First: **a checking cell may report what it checked, or report that it did
not check — it may never report a check it never ran as though it had.**
This is the mirror of the constitutional statement CLAUDE.md's own
grounding-ladder section already carries for the other direction ("a
checking organ may say 'I have nothing to compare this against'
(withhold), or 'I compared it and it failed' (convict). It may never
manufacture the second out of the first"). The failure this closes is the
reflection of that one: manufacturing a confident **holds** out of the
absence of a refusal. Concretely, `verification.js`'s Existence/Entity
cell reported *"subject and object both resolve to referents this material
establishes"* on every claim whose hypergraph verdict was not
`beyond-reach` — and `beyond-reach` gates on the SUBJECT (plus the narrow
case of an object carrying neither referent nor content word). An object
that resolves to no referent but does carry a content word falls through
to `endpointsMatch`'s `tokensShare` branch and never touches that gate at
all. The absence of a refusal licensed a sentence about the subject and
nothing whatsoever about the object.

Second, the general form: **a downstream reader must not have to infer an
upstream organ's finding from the shape of its refusals.** If a cell needs
to know how each endpoint resolved, the organ that resolved them carries
that answer forward as data. `judge()` now attaches
`claim.endpoints = {subject, object}` — `"referent"` / `"form"` /
`"tokens"` / `"none"` — read off the same `endpoint()` results it already
computes.

**The measured specimen.** `eval/reasoning-e2e-no-llm.mjs` (a driver from
an earlier pass, unchanged at the time) printed, on the claim its own
source labelled *"no such referent in this material at all"*:

```
Lincoln appointed Napoleon (no referent):
  Entity: holds — subject and object both resolve to referents this material establishes
  Link:   fails — no edge binds this exact subject, verb, and object
```

Napoleon is nowhere in that material. Worse than a wrong sentence in
isolation: a reader seeing Existence hold and Structure fail reads "the
material says this is false", when the truth is "the material has never
heard of this object."

**Why the verdict did not move, stated because it cost something.**
Entity still reports `holds` wherever it held before — nothing downstream
of `verification.js` changes. The reason is measured, not cautious: an
object resolving by content word alone is NOT by itself evidence the
object fails to exist. Objects are very often descriptions rather than
names, and on the same material `"Pierre Bezukhov married the countess"`
lands in exactly the same `tokens` bucket `"…married Napoleon"` does — a
verdict flip keyed on that signal would fire on both, and would gate
Link/Network/Lens through the presupposition wall for ordinary prose. The
finding is reported, in the reason and in a machine-readable `endpoints`
field, and left for a reader (and for a later pass with a wider
measurement behind it) to weigh. Pinned as an explicit CONTROL case, so
the next pass does not "fix" it into a conviction without measuring first.

**A second defect, found the same way and fixed at the source.** Extending
the same driver surfaced a fabricated binding: against four sentences
stating only `Seward negotiated the Alaska purchase`, the claim
`"Seward negotiated the Suez canal"` came back **bound**, while
`"Seward negotiated Suez canal"` — the same claim without its article —
came back `unbound`. The definite article was the entire binding:
`endpointsMatch` falls through to `tokensShare`, one shared token is
enough, and the shared token was `"the"`. The corpus-scale function-word
filter (`cite.js::commonTerms`) declares its own floor and simply does not
run below `CORPUS_MINIMUM` chunks — a declared limit whose disclosed
residue is *"auxiliary noise in the vocabulary,"* i.e. something that can
only WIDEN what the reader hears. On the object side it does something
that disclosure never covered: it fabricates an edge. `makeRelationReader`
gained an optional `organs.determiners` — a RECEIVED closed class with its
own named giver (the engine's `perceiver/text/priors.js`:
`DEFINITE_DETERMINERS` + `INDEFINITE_DETERMINERS`, giver `lang/en`), never
a word list typed in this repo, the same discipline `widget.js`'s own
router already holds. Omitted, every existing caller is byte-identical.

**A correction to an earlier pass's own stated limit.** The same driver's
first results document concluded that negation-as-contradiction "lives
only in `capacity-runner.js`, not in bare `read()`". Measured across five
constructions, that is wrong: `judge()` returns `contradicted` through
bare `read()` for `"never"` and `"hardly"` alike. The real limit is the
engine's own gate, `relations.js::negationBeforeVerbFor` — the negation
word must sit BEFORE the verb. `"not"` and `"didn't"` are both already in
the engine's `NEGATION_WORDS`; the shape fails, not the vocabulary.
Periphrastic `"did not <verb>"` puts the auxiliary in the connector slot
and swallows the real predicate into the object, so the claim checked is
not the claim written; `"didn't"` extracts nothing at all; and post-verbal
negation (`"negotiated not the Alaska purchase"`) stays polarity-positive
and lands **bound** — a negated claim reported as supported, named here as
a hazard and not fixed.

**Enforcement.** `hypergraph.test.mjs` (+7: endpoint disclosure on a bound
claim, on a token-only object, the description CONTROL, a form-resolved
subject; the determiner defect pinned as it actually behaves so the fix
cannot silently become a no-op, the received class closing it, and an
opt-in byte-identity check). `verification.test.mjs` (+4: Entity never
asserts an unresolved object, keeps its plain sentence when both ends
really resolved, discloses a form-resolved subject, and says so when a
claim carries no disclosure at all). `eval/reasoning-e2e-no-llm.mjs` grew
Tiers 5–7 (negation measured across five constructions; the determiner
defect and its close, side by side on the same material; and the whole
ladder — `evaluate` + `squarePolarity` + `checkObjectSpecificity` — run
end to end with zero model calls, where the article-shared false `bound`
survives squaring and is caught one rung up, landing as a withheld verdict
rather than a lie).

**Evidence and its environment, disclosed.** Full account:
`eval/results/reasoning-e2e-no-llm-RESULTS.md`. The sandbox this ran in
had no checkout at the `../eoreader6.1` compatibility mount `./fold`
creates; it was reconstructed the way that script does (submodule init in
the sibling `eoreader7` checkout, then the mount symlink), and `npm
install` was never run. Measured via `git stash` on exactly this pass's
source files, over every test file importing `hypergraph.js` or
`verification.js`: 238/224/14 before, 249/235/14 after — +11 tests, all
passing, the same 14 failures either way (8 in `crown.test.mjs`; `hl` and
`hl-acquire` as whole files, since the engine cut pinned at this mount
predates `interpretation/hl.js`; 4 in `hypergraph.test.mjs` —
POS-prior/treebank and referent-bar cases). An environment gap,
established by running the baseline first, not a regression.
`verification.test.mjs` is fully green before and after.

## P42 — Two clocks, both measured from the material: binding forgets on the writer's window, retrieval forgets by power law

**Renumbered from P41 on merge** — a concurrent PR (#73, above) independently
landed its own P41 first; the number moved, nothing about the policy itself
did (the same house convention P29's own header already records).

**The law.** Memory carries TWO decay curves, never one, and neither is
typed in. The BINDING layer (pronoun resolution, the aperture, "the reach
of the present") forgets exponentially at a window read from the
material's own accessibility curve — the mapping gap-since-last-mention →
form-of-return (pronoun / definite descriptor / bare name) IS the
writer's broadcast model of the reader's memory (Accessibility Theory,
Ariel; referential distance, Givón 1983), measurable per material and per
genre with no dials (dyadic bins; majority = where a plurality flips).
The RETRIEVAL layer (ranking what comes back) forgets by POWER LAW —
ACT-R's base-level activation, B = ln Σ t^(−d), received d = 0.5,
Anderson's giver-named standard — which is recency-weighted but
frequency-preserving: old evidence thins, it never vanishes. Handing
either layer the other's clock is the measured way to lose, in both
directions.

**Amends READING-POLICY P1 constructively, not correctively.** P1 already
says activation decays, identity does not, recall is retrieval, and
"never enlarge the window to fix a recall failure." All of that stands
and is now MEASURED rather than asserted (below). What this adds: the
window P1 refuses to enlarge is the binding clock, and it is no longer
anyone's to declare — the material states it; and a recall failure's fix
at the retrieval layer now has a measured form — power-law activation
ranking — rather than only "the defect is in retrieval or coreference."
P4's zero-relevance-floor design is untouched: this is a ranking
refinement above the floor, never a new floor.

**The evidence, all in eoreader7 PR #22's committed results
(native/eval/results/, sibling repo), each with its prediction frozen
before its run:**

- *The writer's own curve* (`writer-decay-RESULTS.md`): Frankenstein,
  1,828 returns — pronoun-form returns majority only at gap 1, extinct
  past 128; bare-name returns at 83–100% after gaps of 1,000–4,000
  sentences, unglossed; definite descriptors PEAK at gaps 64–127 (.627) —
  the writer's own re-grounding device, and the material's own fold cue.
  Pride and Prejudice (its coref/frame prior curated for this): Austen's
  activation clock is TIGHTER (extinct by 16), and Shelley's mid-range
  descriptor peak is absent — the two clocks differ BY GENRE, which is
  why neither is a constant.
- *Retrieval's curve* (`forgetting-for-recall-RESEARCH.md` + paired
  stats): on 3,102 prequential next-arrival steps, exponential decay
  LOSES to undecayed accumulation (0.0382 vs 0.0549 — the wrong-shape
  negative, kept); ACT-R power-law BEATS accumulation (0.0582, paired
  z = 3.26), and the edge is ORDER-BORNE — under sentence shuffling it
  vanishes and reverses (z = −1.55), the signature separating a
  mechanism from an artifact. Forgetting improves recall exactly when
  its shape matches the environment's need-odds (Anderson & Schooler
  1991), and exponential is the wrong shape for retrieval because it
  destroys frequency.
- *The retraction discipline held en route* (`salience-dmd-RESULTS.md`
  and its successor): a reported "~29-sentence period" was withdrawn by
  its own arithmetic (mode half-life 0.27 sentences — it cannot
  oscillate), and `survivesOnePeriod` now prints beside any period so
  the claim cannot recur without its refutation beside it.

**What this binds in THIS repo, named as debt rather than silently
assumed done.** `fold.js`'s `RECENCY_WINDOW = 4` is the binding clock
wearing a typed constant — under this policy it is a PRIOR awaiting the
material's measured window, and any future change cites a measurement,
not a preference. `retrieve`'s term-match ranking carries no activation
at all; wiring power-law activation above its floor is real, scoped,
unstarted work — this policy names the law and the debt, and the wiring
is its own pass with its own evidence. The reflex ledger's recency slice
and the aperture's presentWindow are the same binding clock and inherit
the same standing. Nothing was rewired in this pass: a law landed ahead
of its enforcement is disclosed as exactly that (VI.3's own posture).

**Disclosed limits.** Measured on two novels and one benchmark task
(next-sentence motif recurrence); the fully-empirical need-odds variant
(the material's own measured cells, no functional form) was directionally
right but NOT significant (z = 0.72) — the received prior stands until
the material's own measurement holds more evidence, which is the
prior→material ladder behaving as designed, not a failure of it.


**Amended same day — falsified where it could be, and sharpened by it.**
The claim was put where it could lose (eoreader7,
`native/eval/results/forgetting-falsification-RESULTS.md`, predictions
frozen before the runs), on both of the asked-for fronts. READING A BOOK:
at entity level — ranking the constitutional cast by who returns next
sentence, the thing reading a novel actually asks of memory — power-law
recall improves on frequency by 57% relative (paired z = 5.32, edge
vanishing under sentence shuffling): not falsified, strengthened well
beyond the motif task. LISTENING TO AUDIO: on real music (chroma states
at ~46ms frames), the FIXED received exponent broke exactly where the
frozen risk clause said it might — persistence dominates at that
timescale and recency crushes d = 0.5 (z = −51.98) — while the
material-measured need-odds estimator ADAPTED to the medium's own
arrival statistics and landed within noise of the persistence oracle at
2.8× the received prior. So the law this policy states is sharpened, not
weakened: the durable, omnimodal mechanism is NEED-ODDS MATCHING; the
power-law with d = 0.5 is a TEXT-SCALE prior (Anderson & Schooler's own
environments were day-scale text needs), consulted first and superseded
by the material's measured odds — which text was too thin per-step to
earn and audio earned decisively. For THIS repo, whose material is text
at sentence scale, the retrieval-layer guidance stands as written; a
future audio or fine-timescale organ inherits the mechanism, never the
exponent.

## P43 — Polarity that was never measured is never a verdict, and a received class that closes a false binding is turned on

**Renumbered from P42 on merge** — a concurrent PR (#74) independently
landed its own P42 first, exactly as P42 itself records happening to P41.
The number moved; nothing about the policy did.

**The law, part one.** An organ may report a verdict only on what it
actually read. `extractRelations`'s polarity gate is
`relations.js::negationBeforeVerbFor` — the negation word must sit BEFORE
the verb it negates. When it does not, the extractor does not fail loudly:
it silently reads a different clause, the negation ends up leading the
OBJECT span, and the triple's own `polarity` stays `"+"`. **A claim or an
edge whose object span is led by a received negation word is therefore one
whose polarity nothing measured, and it may not decide anything** — it is
`beyond-reach` with a typed reason, on the claim side and on the material
side alike.

**Withheld, never flipped.** This tier does not know what the polarity
should have been; it knows only that nothing read it. Flipping would
assert a reading no organ earned — the same manufacture-from-absence P41
closes in the other direction. `beyond-reach` says exactly what happened,
and (by `relationFindings`'s own standing rule) never counts against an
answer, which is what makes over-firing safe by construction.

**The measured specimen, and why it is worse than a missed contradiction.**
Against material whose only relevant sentence is *"Lincoln did **not**
dismiss Seward"*, the extractor mis-parses THE MATERIAL identically to the
claim, producing the edge `Lincoln —did[+]→ not dismiss Seward`. Both ends
then carry an unread polarity, so they match:

```
"Lincoln did dismiss Seward"  ->  bound  [cabinet.txt#520-620]
```

Not a missed contradiction — an INVERTED one, cited to the very passage
that refutes it. This is the shape P41's own results document had named as
a mere "hazard" (a post-verbal negation landing `bound`) and left; chasing
it found the citation.

**Scope decisions that cost something.** The gate reads the FIRST token of
an object span only — precisely the position the mis-parse puts the word
in; a negation deeper inside an object (`"the treaty but not the
purchase"`) is a different, real, still-unaddressed construction, not this
one. The material side uses `every`, not `some`: a cleanly-stated edge
sitting beside an unmeasurable one still binds on its own merits. And the
class in use is the caller's own per-call `negationWords` when one was
declared, the injected organ otherwise — one class, never two that could
disagree about what a negation is on opposite sides of the same read.

**The honest cost.** Every claim whose negation the extractor mis-slots
now reads `beyond-reach` instead of a verdict — including
`"Lincoln did not dismiss Seward"`, which is TRUE and used to read
`bound`. That `bound` was accidental (nothing measured its polarity; the
opposite claim bound just as readily), so withholding is the honest
reading — but it is a real loss of verified claims, not a free fix.
`"Seward didn't negotiate…"` still extracts no claim at all: silence, with
no object to type, and not fixed.

**The law, part two: a received class that closes a FALSE BINDING is
turned on, not left opt-in.** P41 landed `organs.determiners` and this
policy lands `organs.negationWords`, both received closed classes with named
givers (`perceiver/text/priors.js`, `lang/en`). Both are now injected at
`app.js`'s own `makeRelationReader` call site rather than left as organs
nothing enables — because each closes a measured false binding in the live
app, not merely a widening of what the reader hears. Both are
one-directional (a binding can become `unbound`/`beyond-reach`, never the
reverse) and neither can newly convict an answer.

This deliberately ANSWERS, for these two organs only, the standing open
question CLAUDE.md records for `verbForms` and `createLemmatizer` (whether
the live app should load a received prior by default). The distinguishing
test is the whole argument and does not generalise on its own: **does the
prior close a false binding, or does it widen what the reader hears?** The
first is a correctness fix and ships on; the second is a coverage
trade-off and stays a separate decision.

**Enforcement.** `hypergraph.test.mjs` (+6: the inverted-and-cited `bound`
pinned as the defect so the fix cannot silently become a no-op; the
received class closing it; the claim side for both mis-slot shapes; a
CONTROL proving a correctly-read `never`/`hardly` still contradicts and an
ordinary positive still binds; `every`-not-`some` on a clean edge beside
an unmeasurable one; an opt-in byte-identity check). `eval/reasoning-e2e-
no-llm.mjs`'s Tier 5 now runs every negation shape through readers with
and without the class, side by side, and Tier 7 runs the ladder
deliberately WITHOUT the received classes — the two defenses are real and
independent.

**Evidence.** Full account:
`eval/results/reasoning-e2e-no-llm-RESULTS.md` §3b. Because this pass also
touches `app.js`, it was measured over the WHOLE suite via `git stash`
rather than the affected files alone: 993/972/21 before, 999/978/21 after
— +6 tests, all passing, the same 21 pre-existing environment failures,
zero regressions.

---

## P44 — A capacity claim names its assembly, its priors, and the task's order before the performance is scored

**The law.** This instrument may be scored against Commons's Model of
Hierarchical Complexity, and a score is admissible only when three things
are declared BEFORE any performance is measured: the ORDER of the task
(analytically, with its constituents named), the ASSEMBLY it was measured
on (READING-POLICY P0), and the PRIORS injected (READING-POLICY P3). A
number missing any of the three is not a weak measurement, it is not a
measurement.

**Why the MHC and not a scale of our own.** Commons's central complaint
about predecessor stage theories is that they *confounded stimulus and
response* — they scored performances without independently specifying the
complexity of the task performed. That is the same line this repo already
draws everywhere else from the other direction (the cube is not a content
classifier; a task's order is DECLARED, never computed from the material
it happens to run on). The MHC also supplies what a home-grown scale could
not: three structural axioms, quantal scoring with no partial credit, and
content-independence as a testable property rather than an aspiration.
The eo-wiki's own "MHC and EO" article already records the convergence and
supplies the order table; nothing here invents, renames, or reorders one.

**The axioms are arms, not assertions.** A declared order survives a test
or it is refused. Axiom 1 (defined in terms of the next lower order) is
structural — every constituent must resolve to a real item exactly one
order down. Axiom 2 (organizes them) is structural too — the item must
state its coordination and supply arms that can perturb it. Axiom 3
(non-arbitrarily, producing outcomes the lower order alone cannot reach)
is two arms: `lowerOrder`, where the constituents alone must FAIL the
task, and `arbitrary`, where the same constituents re-coordinated at
declared seeds must also fail. A fourth arm, `discrimination`, is this
battery's own and is labelled as such wherever it appears — the MHC scores
task structure and says nothing about an instrument's precision.

**Every arm is a null, so READING-POLICY A10 governs every arm.** "Before
spending a null, check the pair is licensed — a statistic insensitive to
its perturbation fails invisibly and globally." An arm must therefore SHOW
that its perturbation reached what the task reads; one that did not is
typed `unlicensed_perturbation` and leaves the item UNMEASURED, never read
as "the axiom held." This is not decorative: the first cut's order-12 arm
shuffled the ORDER of cells `verificationTasksFor` had already returned,
which cannot reach gating that happens inside the organ before it returns,
and it produced a false `arbitrary_coordination` refusal. A9 ("one null is
not a null") is why an arm may declare `draws`/`fired` and report plural
seeded grounds natural-frequency, the way `asserted.js`'s order arm does.

**A refused item is a gap in the battery; it is never a failure of the
system.** This is the task/performance separation enforced mechanically,
and it is the whole point. When an item's arms fail, what has been
measured is that the ITEM is mis-declared — so the system is UNMEASURED
there. That is categorically different from an item whose axioms hold and
whose task the system then fails, which is a real ceiling. `stageFrom`
therefore refuses to report a stage number ACROSS an unmeasured order
rather than guessing past it, and carries passes above the cap as
`isolated` observations explicitly not folded into the number — the same
posture every other verdict in this repo holds: a check may withhold, or
convict, never manufacture the second from the first.

**Files.** `mhc.js` (pure — the received order table with its giver, the
declaration grammar, the axioms as arms, quantal scoring, `stageFrom`'s
contiguity rule, `contentIndependence`) + `mhc.test.mjs` (31 conformance
cases, deliberately organ-free so the walls stay testable in any
checkout). `eval/mhc-battery.mjs` — a re-runnable driver, P19's and P27's
own posture for measurement drivers, binding items at orders 5-14 to real
organs over two real materials this repo already ships.

**Probes are derived from the material, never hardcoded.** The first cut
named its own answers ("Lincoln appointed Hamlin"), which made the battery
a test of one fixture and made content-independence unaskable. Every probe
is now read out of the material: the specimen edge is whichever the
material corroborates most among edges whose BOTH ends resolve to admitted
referents, the negative is that edge reversed, and a specimen the control
material also states is rejected as non-distinctive. Where a material
offers no such probe the item lands a typed gap naming what was missing,
never a fabricated specimen.

**The measured result, and its honest headline.** Orders 6, 8, 9, 11 and
12 pass on both materials; order 5 fails on both; 7, 10 and 13 diverge
between them, so content-independence does NOT hold for this battery and
that is reported as a property of the battery, not smoothed away. No stage
number is readable on either material, because order 5 — the floor — is a
measured failure, and nothing above a failed floor may be summed into a
stage. Orders 0-4 are typed `out_of_scope_by_construction`, not as a gap:
this instrument receives symbols and has no sensor, so it is not failing
those tasks, it is not in the business of them.

**What order 5's failure actually is, since "cannot refer" would be the
wrong reading.** Scored against `discoverReferents`'s OWN individuation
rule, the fold gathered 23/24 (War and Peace) and 10/12 (Borodino) of the
pairs that rule calls one being, and kept apart 4/4 and 3/3 of the pairs
it calls different — perfect precision, no observed over-merge. The three
strandings are one shape: a bare token left alone while the longer surface
containing it merged with a different partner (`Mikhail` alone while
`Mikhail Kutuzov` sits with `Kutuzov`). `discoverReferents` assigns by
first-match-wins over already-assigned surfaces with no second pass, so
the grouping is a greedy closure over a relation that is not transitive,
while "is the same being as" necessarily is. The obvious fix (union-find)
is NOT prescribed: it would also merge `Alexander` into `Emperor`, and the
real chain runs from `genericTokens` under-firing on a bounded slice
through a title surviving as individuating to greedy assignment — which
link to fix is a design question, not a one-line change.

**Four wrong versions of that one item, kept because each was the same
error.** Pairs chosen by spelling drew `Russian` | `Russian Army`; pairs
chosen by `namesCorefer` on RAW surfaces drew `Ilya Rostov` | `Petya
Rostov`; the regimes read off `cast.js`'s referent index drew 510 capture
artefacts, because that index is built with `minSentences: 0` — a PRESENCE
index, which is P38's own rule ("an index answering 'does this exist' is
not an index answering 'is this established'") walked into by this
driver against the very organ P38 was written about; and treating every
one-side-bare pair as a withholding reported `Anna` | `Anna Karenina` as
wrongly merged when it is the code's own documented singleton-partner
rescue firing correctly. In all four the reading was right and the probe
was wrong. Pairs whose decision needs that rescue branch are now excluded
from the score and counted as a disclosed abstention, rather than
reimplementing the engine's partner floor in a driver.

### P44, amended 2026-08-25 — order 13 earned, and content-independence read correctly

**The rung.** Order 13 refused on one material and passed on the other, and
the difference was luck rather than measurement. Diagnosed, not patched: it
was A10 one level deeper. The arbitrary arm destroyed claim-GROUPING (the
right coordination to perturb — `mergeTestimony`'s verdict is invariant to
source identity by construction, so shuffling WHO said what would be the
insensitive-statistic trap) but mixed in whichever second claim came to hand.
On War and Peace that claim contributed only `undetermined` readings, which
`mergeTestimony` genuinely does not read, so the mix could not change the
merge and the arm declared the coordination arbitrary while testing nothing:
fired 20 of 20 there, 0 of 20 on Borodino, on that difference alone.

**What made it trustworthy was finding the thing that is actually
metasystematic.** A claim's STANDING across witnesses — corroborated, or a
lone voice — is a property of the SET that no member of it carries. Two real
claims are selected BY MEASUREMENT against a fixed sample of ten
source-systems: one the sample corroborates (two or more bind it) and one it
does not (exactly one binds). The task requires the merge to type them
`AGREE`/`corroborated` and `SINGLE`/`single`, and — the clause that makes it
non-circular — that BELOW the merge the two are indistinguishable: each has a
system saying exactly `holds`, the same word, carrying no standing of its own.
The order-13 finding is therefore demonstrably not available at order 12,
rather than asserted to be. Every arm now carries its own licence: `lowerOrder`
only if the two merges genuinely differ, `arbitrary` only if the mixed set's
hold/refused counts differ from the clean set's, `discrimination` only if the
reversed claim really draws fewer holds. All three licensed and failing as
they must, on both materials.

**The general rule this adds.** A perturbation must be chosen against the
statistic's own readable inputs, and its licence CHECKED against them, not
assumed from the perturbation's shape. "I mixed in a second claim" looks like
a perturbation; "the mixed set's holds and refusals differ from the clean
set's" is one. The first version was already perturbing the right THING and
was still unlicensed, which is why the licence has to be computed rather than
argued.

**And the conceptual bug it surfaced, which was this battery's own.**
`contentIndependence` compared raw per-order verdicts and reported every
difference as "these items are reading content, not structure." That is FALSE
for a passed-here/failed-there difference. The MHC's content-independence is a
claim about the SCALE — a task's order does not depend on what it is about —
and emphatically NOT a claim that a performer succeeds equally across domains.
Separating task from performance is exactly what makes a per-domain difference
ordinary; it is what a stage measurement is for. Three outcomes are now kept
apart: **violation** (a valid order-N task on one material, MIS-DECLARED on
another — the only thing the scale forbids), **performance** (valid in both,
completed in one), **no probe** (the material offers no specimen). Reading
only the collapsed order-level status is how the first version could not see a
violation at all, so `byOrder` carries `refusedCount` and `unmeasuredCount`
apart — the same "two facts, never collapsed" discipline this policy already
holds items to, applied to the rows above them.

**Corrected result.** Scale **held: true**, zero violations. Seven orders
agree outright (5 failed, 6/8/9/11/12/13 passed); one performance difference
(order 7 — real pronoun bindings on War and Peace, all `pronoun_no_margin` on
Borodino, whose prose is dominated by collectives); one missing probe (order
10 on War and Peace, which offers no subject+verb slot with two distinct
fillers in its declared slice). The stage remains unreadable, because order 5
— the floor — is still a measured failure. Suite 718/605/113 → 721/608/113,
the same 113 pre-existing sibling-engine path failures, zero regressions.

### P44, second amendment (2026-08-25) — the floor fixed at the source, and the layering the fix nearly got wrong

**The order-5 failure is closed, in the engine, not papered over in the
battery.** eoreader7's `discoverReferents` (native/adapters/text/surfaces.js;
its READING-SPEC.md S17 is the engine-side record, PR #24) replaced the
first-match assignment scan with three mechanics: assignment walks
most-individuated-first (a bare form's counts include its compounds'
occurrences, so mention order seats fragments before their own evidence);
membership is decided against a group's MAXIMAL member, never its weakest;
and a multi-group merge happens only when the arriving surface's own tokens
CONTAIN each group's maximal evidence — a compound witnesses downward, a
bare fragment matching two groups witnesses nothing. Chasing it also found
a second, worse defect the battery's regime measurement had not reached:
with the fragment seated first, two REAL bearers accreted into one referent
through a shared first name at the generic fence — an over-merge, where the
strandings were only under-merges.

**The correction that shaped the fix, from the user, mid-pass:**
"coreference is a solved problem — are you doing it with referents or not?"
The first cut admitted an ambiguous bare form as its own referent — a third
being that does not exist, asserted at the TYPE level, which structurally
cannot answer WHICH being a mention names (the same string names different
people at different occurrences; READING-SPEC S11's "the type signature was
the bug"). The solved architecture — each mention resolved against
discourse salience — already exists in this engine as activation recall
(`resolvePronouns`, roles.js's generalization), and the canon already
routes ambiguity closure there (P2 stage 3's second pass; P3's per-text
prior). So the type level now says exactly what it can check and no more:
an ambiguous form lands as a typed `ambiguous_surface` GAP carrying its
candidate referent ids, admission withheld, closure named as the
occurrence layer's. The general statement, which is P38's rule meeting the
constitutional withhold-or-convict rule: **a layer that cannot check a
claim does not get to assert it — it names the layer that can, and hands
over the candidates.**

**Measured, end to end.** Battery coreference recall 23/24 → 24/24 (War
and Peace) and 10/12 → 12/12 (Borodino), precision 4/4 and 3/3 unchanged,
zero over-merges. Order 5 passes on both materials, and a stage is
readable for the first time: War and Peace reads **stage 9 (Concrete)**,
capped by order 10's missing probe (not a ceiling); Borodino reads
**stage 6 (Sentential)**, capped by a REAL measured ceiling — order 7,
pronoun binding, every attempt refused `pronoun_no_margin` on prose
dominated by collectives. Scale still held: zero violations. Engine suite
140/150 before and after (the identical 10 pre-existing environment
failures); the-fold suite 721/608/113, unchanged.

## P45 — The store is append-only; the prompt is a projection; recall is retrieval, not enlargement

The law this closes: READING-POLICY P1, "activation decays, identity does
not, recall is retrieval" — and the third clause had never been built. A
spec (`wiring-the-measured-memory-v2`, superseding a same-day v1 refuted at
line level: `fold.js` reading proved the SYSTEM 2 STORE itself, not only
the prompt, was being truncated) named six increments; this pass landed
four in full (A, C, D, one measurement pass covering B) plus F1, and named
E/F2 explicitly deferred rather than built partway. CLAUDE.md carries no
separate map section for this entry — the code's own headers (fold.js,
retrieval.js, consequence.js) already carry the map at the point of use,
which is where a reader actually needs it; this entry is the law and the
evidence.

**A — the store/projection split (`fold.js`).** `addWarrantRecord` sliced
`summary.records` at `RECORDS_IN_PROMPT` on every append; `advanceSummaryFold`/
`updateSummaryWithFold` did the same to `summary.folds` at
`MAX_FOLDS_IN_PROMPT`. Both are retroactive forgetting of the ONE tier P1
says does not decay — record #9 landing destroyed record #1 permanently.
Fixed by un-slicing the store and moving the bound to render time:
`projectRecords`/`projectFolds` (new, shared by `buildRecordSystemMessage`/
`buildSummaryUpdatePrompt` internally and by any caller that needs the
identical window, e.g. a consolidation check) apply the SAME default bound
as before, so every existing caller — app.js's own `buildRecordSystemMessage(state.summary)`
bare calls, every eval driver's `buildSummaryUpdatePrompt(summary,
[...summary.folds, fold])` pattern — is byte-identical in live behavior by
construction, having never needed to know the store's own size. A second,
real consumer had to be found and fixed the same way: `tables.js`'s `/self
folds` builder read `summary.folds` directly and would have started
showing the ENTIRE unbounded history the moment the store stopped
truncating itself — caught by a pre-existing test that (correctly, by this
codebase's own "widen the boundary, don't just re-pass" rule) encoded the
OLD truncating behavior as its assertion and had to be rewritten, not
loosened. `/self records`, by contrast, was left genuinely unbounded — an
explicit human request to see the full addressed history is exactly P1's
"re-openable," not a case needing a window at all; a new test pins this as
the deliberate asymmetry it is, not an oversight.

`deriveRecordWindow` (new) measures the record-projection window from the
store's own behavior via `dmdWindow` (eoreader7's real
`native/kernel/activation.js`, injected, cast.js pattern — fold.js stays
zero-import): the shallowest depth at which forgetting older records'
`refs` (the closest thing a record has to a referent/claim id; no
tokenizer exists here to read `gist` text, and none is invented) changes no
conclusion about which addresses are live. Real, tested against the real
eoreader7 module (a genuine sibling in this environment, not an
environment-gapped stub) — a stabilized identity set measures the
shallowest candidate; a genuinely singleton old reference correctly refuses
as `reach_exceeds_candidates` rather than guessing the widest. NOT wired
live into app.js's browser runtime this pass — that needs a new server
mount (`/native`, alongside `/engine`/`/nul`), a `page-graph.mjs` update,
and a `constitution.test.mjs` II.13 allowance, none of which this pass
touches; the declared `RECORDS_IN_PROMPT` stands as the operative default,
now correctly operating on a store that never destroys what falls outside
it, which is the actual bug this increment exists to fix. Folds' own window
stays declared only, disclosed as a scope decision, not a gap: a fold
string has no structural identity `deriveRecordWindow`'s `refs`-based
`derive` can reuse without inventing NLP fold.js has no business owning.

**C — recall is retrieval (`retrieval.js`, new).** The missing clause: a
turn beyond `RECENCY_WINDOW` and a record beyond the projection window are
addressed, not forgotten, but nothing brought a dormant one BACK. Composed
the S9 way, generate-then-rank, never blended: eoreader7's real
`native/memory/activation.js` (`codeOf`/`recall`/`encodeFrame` — Hebbian
sparse coding, one-hop completion, causal, already mature and consumed
elsewhere in that repo by `adapters/text/pronouns.js`/`anchoring.js`,
reused unmodified per the standing rule) generates the POSSIBLE set — only
a record sharing distinctive, already-recurring vocabulary with a question
can surface at all. Within that set, ACT-R base-level activation (received
d=0.5, giver Anderson, the exact formula
`native/eval/forgetting-falsification.mjs::actrScore` already measured,
reused verbatim) ranks by PROBABILITY — recency- and frequency-weighted
citation history — superseded by this conversation's own measured
need-odds once a (recency, frequency) cell clears a declared evidence
floor, the supersession reported in each candidate's own `basis`, never
silent. Two typed gaps only (`retrieval_no_cue`, `retrieval_no_margin`),
`[]` on either, never a guessed top-k.

A real bug was found and fixed by testing against the real organ, not
assumed correct from the design: the first cut trained need-odds tallies
on every record's own BIRTH (treating a new record's creation as a
"was every other live record needed and missed" trial), which seeds a
false universal "never needed again" signal from ordinary conversational
growth alone — a target record could land in one of those polluted cells
by (recency, frequency) coincidence and have its real ACT-R signal masked
by a spurious zero. Fixed: birth seeds a record's own citation history
directly; `recordCitation`'s training loop fires only on a GENUINE re-use.
Caught because the test suite is real (eoreader7 checked out as a true
sibling in this environment, not environment-gapped) and was actually run
against it, not trusted from the shape of the code.

**D — the promotion gate (`consequence.js`, new).** Recurrence (retrieval.js's
own `citedAt`, the arrivals>=2 structural floor this codebase already
holds every binding organ to) is necessary, never sufficient (S9: a count
is possibility, never standing — levers-RESULTS.md's own "the murder"
finding, the general case). Consequence — did a later turn's verdict
actually change because the claim was available — is typed three ways:
`consequence_untested` (a gap: no later turn ever engaged this ground),
`recurring_no_consequence` (engaged, available, nothing moved), or
`mattered`. The timing discipline is `ground-ledger.js`, ALREADY BUILT IN
THIS REPO, reused rather than re-derived: its two-rule prequential
firewall (a ground version cannot be frozen retroactively; a turn cannot be
re-priced once scored) is exactly what "score an ablation against the
ground as it stood at that turn, permanently" needs. `adaptTaskLog` bridges
`ground-ledger.js`'s expected shape (built against eoreader6.1's
`holon/task-log.js`, which carries a `GRAIN_RANK` export) to eoreader7's
real `native/kernel/task-log.js` + `native/kernel/cube.js` (which carries
ordinal `GRAINS` instead — `GRAIN_RANK` is that ordinality made explicit,
not a new fact) — a genuine reconciliation, not an assumed compatibility,
tested against the real eoreader7 modules end to end, incidentally giving
`ground-ledger.js`'s own firewall real test coverage in an environment
where `ground-ledger.test.mjs` itself cannot load (it imports eoreader6.1
directly, which this checkout does not have as a sibling).

The ablation computation itself — "re-run the mechanical grounding with
this claim excluded from the citation base" — is INJECTED, never computed
here: wiring it to grounding.js/hypergraph.js's real verification organs is
real, disclosed, unattempted work, the same posture this pass already
holds for C's live wiring and this project's own standing precedent (HL,
self-witness, grammar-lens: built and tested, not deep-wired into a
multi-session-owned file without that file's own explicit scope).

**B — measured, not merely assumed live from A/C's unit tests
(`eval/measured-memory-b.mjs`, new).** No real 40+ turn conversation
transcript with record citations exists on this disk — fold.js's store
stopped discarding history this same pass, but nothing has run the live
app long enough yet to leave one behind. A synthetic conversation with
ground truth by construction (four topics, each with a declared return
cadence and disjoint vocabulary, 90 turns) stands in, disclosed as exactly
that — this repo's own established fallback when no real corpus exists
(hl-acquire.test.mjs's invented chronicle; P29's own synthetic adversarial
suite). B1 (`kernel/return-curve.js`, real, unmodified): the writer's own
declared pronoun-vs-regloss return-form rule measures back out correctly
(majority window 3 for pronoun, 63 for regloss) — a check that the
composition is wired right, not a discovery about real writing, named as
such. B2 (retrieval.js's real need-odds/ACT-R composition, exercised at
scale): a topic returning 26 times in 90 turns earns a measured
supersession of the ACT-R prior; one returning twice does not, exactly as
S17's own rule requires. A genuine surprise, reported rather than smoothed
over: a third topic (3 returns, same count as one that stayed declared)
ALSO measured — traced to `recordCitation`'s shared cell-tally population
(a rare topic can clear the evidence floor early by sharing a cell with a
frequent one), a real, disclosed property of the mechanism, not a defect.
Full numbers: `eval/results/measured-memory-b-RESULTS.md`.

**F1 — the consolidation witness (`fold.js::extractSummaryFindings` +
`app.js::refreshSummary`).** The summary refresh is a live, chained
consolidation step — this project's own NELL lesson, unaddressed until
now: an entity still live in the CURRENTLY-PROJECTED record/fold window can
silently vanish from `entities` on any refresh, or an unsupported one can
silently appear, and every individual refresh looks clean. Reuses
`witness.js::witnessRegressed` verbatim (already in this repo, already
generic) — the left side is trivially clean by construction (`{ok:true,
findings:[]}`, nothing to regress against before a transition is
examined), the right side carries the real transition-computed findings
(`lost_live_entity` / `unsupported_addition`, literal case-insensitive
containment against live record/fold text, the same posture P31's own
`company` containment already holds this repo to — no claim of semantic
understanding, only "the words are there"). A regressed refresh is refused
(`advanceSummaryFold` carries the prior summary forward instead) and lands
a `consolidation_regressed` act on the reflex ledger through its own
designed unknown-act extension point — no reflex.js edit needed.

**E, F2 — explicitly deferred, per the spec's own build order, not built
partway.** E (within-conversation holon folding) is gated on D measuring a
real promotion rate high enough that flat projection demonstrably
degrades — D shipped this pass, but nothing has run it against a real
conversation long enough to measure that rate yet, so E's own un-defer
condition is unmet by construction. F2 (gating E's folds against drift) is
gated on E existing at all. Both named here so a future pass does not
re-derive the reasoning, and neither is silently implied as done.

**Evidence.** New files: `retrieval.js` (+9 tests, real against eoreader7's
`native/memory/activation.js`), `consequence.js` (+9 tests, real against
eoreader7's `native/kernel/task-log.js` + `cube.js`),
`eval/measured-memory-b.mjs` + its results doc. Modified:
`fold.js` (+12 tests: the store/projection split, `deriveRecordWindow`
real against eoreader7's `native/kernel/activation.js`,
`extractSummaryFindings`), `tables.test.mjs` (+1, the real second-order fix
this pass found), `app.js` (the `refreshSummary` witness gate — syntax
checked, no dedicated test harness exists for this browser-only file),
`reflex.js` (one comment corrected — a prior pass's own claim that
`summary.folds` was unbounded-unlike-`turnFolds` no longer holds; the
redundancy is named as real, unattempted follow-up rather than collapsed
this pass), `eoreader-contract.json` (+1 test: a new `testTimeConsumers`
section, declared as test-time-only and distinct from `runtimeConsumers` —
none of this pass's production code performs a live cross-repo import,
every eoreader7 dependency arrives injected, cast.js pattern, so there is
nothing yet to promote to a runtime consumer). Full suite: 722/608/114
before this pass, 754/640/114 after — the identical 114 pre-existing
environment failures (missing `../eoreader6.1/` sibling and several
vendored `node_modules`, this checkout's own disclosed gap, unrelated to
this pass), zero regressions, 32 new tests all genuinely passing — not
environment-gapped, because eoreader7 is checked out as a real sibling in
this environment and every new test that needed it was run against the
genuine article.

## P46 — What the source itself says about itself is real provenance; a model should never have to guess it

Found live, chasing "does this local-model chat feel like Claude." A
faithful headless probe of the real S1/S2 pipeline (`twoPassTurn` →
`runHolonicTask`, real organs, no shortcuts) asked "Who is Pierre
Bezukhov?" against this repo's own War and Peace fixture. S1 — by design,
no material — answered from the model's own confused prior: "the main
character in *The Brothers Karamazov* by Dostoevsky." Wrong book, wrong
author. The checking pipeline's whole job is to catch exactly this, and
across the run's own log it did not: `checkGrounding` correctly flagged
"Dostoevsky"/"The Brothers Karamazov" as `unsupported_claim` when tested
directly against the real organ — the check is not broken — but the
correction loop spends `maxCorrections` (1) attempt PER FAILURE MODE and
the mechanical mode-fallback only rescues `echoed`/`reproduced`/`narrated`
verdicts, never a plain `unsupported` survivor. A draft that is original
prose (not an echo, not a photocopy) but still wrong after its one
correction try ships exactly as it is, with the finding that could have
caught it simply not accumulating another action.

**The user's redirect closed it a level earlier: the model should never
have had to guess.** Not "catch the invention after the fact" — "why did
it have to invent in the first place." Project Gutenberg's own front
matter states `Title: War and Peace` / `Author: Leo Tolstoy` in the exact
file this instrument already reads, before the same `*** START OF THE
PROJECT GUTENBERG EBOOK ***` marker `stripContainer` already finds and
discards (P5.3). Nothing had ever mined it. And when the fix was first
reached for as "load a hyperlexicon so it can look up Wikipedia," the
user's own correction landed before any code did: **"the model should
NEVER have anything without provenance."** `hyperlexicon.js` (checked
directly, both repos) is the HL relation-composition-affordance ledger
(P37) — no lexical or encyclopedic content, nothing about book identities;
loading it would have supplied nothing relevant. A live Wikipedia fetch
would ALSO need its own real provenance chain (a URL, a retrieval date,
content-addressed) — this repo already has exactly that, in the web organ
(P13) and the witness/proof-seeking tiers (P32/P13) — and reaching for
either is real, separate, unbuilt future work, not attempted this pass.

**What shipped instead needs no network and invents nothing.**
`source.js` gained `declaredIdentity(name, text)` — reuses `stripContainer`'s
own START-marker regex (factored into one shared constant so the two
functions cannot silently disagree on where the header ends, the exact
drift class this repo's own postmortems have caught twice before) to read
the header span BEFORE that marker, and pulls `Title:`/`Author:` off it
with a plain line match. No Gutenberg header → `null`, not a guess — the
control case a hand-crafted plain-text fixture pins directly.
`identifyMaterial`'s prose fallback (the ONLY branch a Gutenberg ebook
ever reaches — rss/atom/table/json/html/code/markdown are untouched)
merges it in as `identity.declared`, threaded onto every chunk the same
way `identity.guess` already is. `buildSourceBlock` surfaces it as its own
labeled line — `(the source file's own declared header — Title: …,
Author: … — pg2600.txt#0-797)` — ahead of the passage text, addressed to
the real header bytes it was read from, giver named as "the source file's
own declared header" rather than this instrument's own claim.

**Measured, not assumed: verified against the real pipeline, twice, with
two different random S1 hallucinations.** One run: S1 guessed "Anna
Karenina." Another: "The Brothers Karamazov" again. Both times, with
`declaredIdentity` wired in, S2's real output was "Pierre Bezukhov is the
illegitimate son of Count Bezúkhov" (or a close paraphrase) — correctly
cited, `grounding.clean: true`, zero unsupported findings, no trace of
either wrong book. S1 itself is untouched and will keep guessing wrong —
that is its own documented design (no material, on purpose, P34) — the
fix is that S2 no longer needs to trust or repeat S1's guess, because the
material now says plainly what it is.

**Files.** `source.js` (`declaredIdentity`, `stripContainer`'s marker
factored to a shared constant, `identifyMaterial`'s prose branch,
`buildSourceBlock`'s new labeled line). `source.test.mjs` (new — this repo
had no dedicated test file for source.js before this pass; scoped to what
this pass touched, not a backfill of the whole file's coverage; 10 cases,
including the real pg2600.txt fixture on disk and a same-regex regression
pin between `declaredIdentity` and `stripContainer`). Full suite:
754/640/114 before this pass, 764/650/114 after — the same 114
pre-existing environment failures, zero regressions, all 10 new cases
genuinely passing.

**Disclosed, not silently narrower than it sounds.** Scoped to Gutenberg's
own header convention only — an attachment with no such header (most real
attachments) gets no `declared` field at all, exactly as before. This
closes the ONE class of "the model had to guess what it's reading"
measured live; it does not build a general bibliographic-metadata parser
for arbitrary formats, and it does not build the Wikipedia/web-grounding
half of the original ask — both real, both unattempted here, both needing
their own design pass through this repo's existing provenance-respecting
egress rather than a shortcut.

**Amended 2026-08-20 (third occurrence) — the disclosed TOKEN_RE gap
closed: a period inside a witness/source name.** `crown.js`'s own
tokenizer header, written the same day as the self-witness construction
above, disclosed its own scope boundary rather than pretending it away: "a
witness/source name containing a period, '@', or other character outside
this class would still fragment the same way 'self:model' just did... not
hit by any real specimen this pass exercised." It has since been hit. A
new headless multi-turn stress harness (`eval/material-dialogue-stress.mjs`
— the real claim-id spine end to end, `capacity-runner.js`'s own
landAct/perSourceReadings/mergeTestimony plus `crown.js`'s renderCrown,
over five varied topics) drove renderCrown against a source literally
named "titanic-a.txt" — an ordinary filename, not a contrived one — and
reproduced exactly the shape the header predicted: `witnessWords(
"titanic-a.txt")` split into three tokens ("titanic-a", ".", "txt"),
rendering "According to titanic-a. txt, ...".

**Not a bare repeat of the colon fix.** `TOKEN_RE`'s own header already
names colon's own precedent — widened into both the word-continuation
class and the standalone-punctuation alternative, safe because colon's
connective usage ("Holding:") never sits flush against a foreign preceding
word. Period's connective usage (`KNOWN_CONNECTIVES.period`, the ".",
used by every render function in this file to end a sentence) does
exactly that, on purpose, in nearly every rendered sentence —
`joinTypographically`'s whole `NO_SPACE_BEFORE` mechanism exists to glue
it flush. A bare widening (adding "." to the continuation class with no
further condition) would have made the tokenizer greedily eat that
trailing connective period into whatever word precedes it on EVERY
render, and `checkTraceCoverage`'s own independent re-tokenization would
then disagree with construction's own trace on nearly every existing test
— not a narrow fix, a wide regression waiting to happen. The actual fix
is a lookahead: a period counts as a word-continuation character only
when the very next character continues a word (`\.(?=[A-Za-z0-9])`) —
"titanic-a.txt" glues (period followed by "t"), a sentence-final period
stays standalone (followed by a space, another connective, or the end of
the string).

**Checked against the harder adjacency, not just the reported one.**
DISAGREE's own "Backing it: \<witness\>." shape glues the connective
period flush against the LAST witness with no comma when a side has
exactly one witness — so a period-bearing witness name can sit directly
against the sentence's own closing period, two periods back to back with
nothing between them (`"lincoln.txt."`). Confirmed this still splits
correctly into `["lincoln.txt", "."]`, never collapsing into one token,
because the SECOND period is followed by a space or the end of the
string, never by an alnum character.

**Measured, real, tested.** `crown.js`: `tokenize` itself unchanged,
`TOKEN_RE` widened, its own header rewritten to disclose the fix rather
than the gap it used to name. `crown.test.mjs` gained 4 cases: two
pinning `tokenize()` directly (the fix itself, and the hard adjacency's
safety property), and two real end-to-end `renderCrown` cases through the
actual claim-id spine (`realReadings` → `mergeTestimony` → `renderCrown`
→ `checkTraceCoverage`, no stubs) — a SINGLE case and a DISAGREE case,
both using `"lincoln.txt"`/`"lincolnNeg.txt"` as ground names (already
real, proven ground names throughout `capacity-runner.test.mjs`, pushed
through `crown.js`'s own render for the first time) rather than a fresh,
unproven Titanic fixture — the exact Titanic claim from
`eval/material-dialogue-stress.mjs` that originally surfaced this bug did
not reliably bind through this repo's own extraction pipeline when tried
live here (an unrelated, disclosed extraction-sensitivity gap, not a
rendering one — `crown.js` never sees a claim that didn't already bind),
so the already-proven `LINCOLN_TEXT`/`LINCOLN_TEXT_NEGATED` fixtures were
used instead for a reliable, deterministic regression. `crown.test.mjs`:
26/26 before, 30/30 after. Full suite: 1100/1100 before this fix's own
edit, 1104/1104 after — exactly the +4 new cases, zero regressions
anywhere else.

## P47 — eoreader7 is real; the reading-workbench spec named a real API, not a fictional one

**The correction.** A prior pass (this same day) concluded eoreader7 does
not exist anywhere and estimated one to three weeks of new engine work to
build five organs the reading-workbench spec names
(`deriveIdentityRevision`, `deriveSurprise`, `expectation`/
`expectationTransition`, `projectTerrainState`, `hypergraphAt`). That
conclusion checked local disk under `~/Documents` and stopped there. A peer
session working concurrently in a sibling repo (`commoncite`) had already
cloned `clovenbradshaw-ctrl/eoreader7` from GitHub — a real, actively
developed repo (24 PRs in two days) with a native recursive-reading kernel
under `native/kernel/` — and said so. Verified independently before acting
on it (per this repo's own standing rule that a peer's correction earns a
second check, not blind trust): `gh repo view` confirmed the repo and its
recent push; the checkout was cloned to a sibling of this repo
(`../eoreader7`) and its own test suite run directly (114/118 passing, 4
unrelated failures). All five named organs exist as real, callable exports.
One — `deriveIdentityRevision` — uses the exact parameter name
(`canonicalizationFloor`) the spec's own prose uses, strong evidence the
spec was written against this real API rather than invented.

**What actually landed, Increment A of the spec.**
[`eoreader-contract.json`](eoreader-contract.json) declares every eoreader7
export this repo's runtime is expected to consume — organ name, real
import path, real export name, which later increment needs it — and
[`eoreader-contract.test.mjs`](eoreader-contract.test.mjs) is the assay:
it reads the JSON and, for each declared entry, dynamically imports the
REAL checkout at `../eoreader7` by relative path (the same convention
`build-log.test.mjs` already uses for `../eoreader6.1`) and asserts the
export exists and is callable. No stub, no fixture, no hand-copied list to
drift from the JSON — the test walks the contract's own declaration.

**The gate was hand-verified, not just written.** The spec's own gate text
for Increment A: "fails when a named export is removed. Deliberately
verify the failure by hand once." Done against the real checkout, not
simulated: `export` was stripped from `deriveSurprise` in the real
`../eoreader7/native/kernel/dynamics.js`, the contract test was re-run and
failed with a message naming the broken organ and its consumer, the file
was restored, `git diff` confirmed byte-identical to before, and the full
suite was re-run clean (1131/1131).

**RETRACTED AT MERGE — the contract already existed on `main`, and this
pass rebuilt a worse one.** This policy originally claimed
`eoreader-contract.json` and `eoreader-contract.test.mjs` "genuinely did
not exist anywhere." That was true of this branch's working tree and false
of the repository: a concurrent session had already built both, and merging
`origin/main` surfaced them as an add/add conflict. Theirs is materially
better — it pins a reference head, and covers browser engine modules, node
imports, filesystem mounts, `testTimeConsumers` for eoreader7's native
tree, declared semantic capabilities, and a stated migration law. **Theirs
was taken wholesale; the version written here was discarded**, per this
file's own standing rule that two independently-grown tools get reconciled
on the merits rather than deduped by convenience.

The organs this pass declared (`deriveIdentityRevision`, `deriveSurprise`,
`expectation`/`expectationTransition`, `projectTerrainState`,
`graphEdgesAtSequence`/`hyperlexiconAt`) were NOT carried across, and that
is correct rather than an oversight: the surviving contract's own rule is
that an entry is promoted "only once a PRODUCTION file, not a test,
performs the import live," and nothing in this repo imports those five —
not a production file, not even a test. Declaring them would have been the
aspirational listing that contract exists to prevent.

**The cheap check that was skipped.** `git fetch && git log origin/main`
before building, not after. This repo's CLAUDE.md already carries that rule
by name ("when a fix duplicates work already landed on another branch,
reconcile before merging"), earned from the same mistake in eoreader6.1,
and it was not run here. The genuinely new work in this pass is the plan
and the corrected scoping (P47's first half, and the reach finding below),
not the contract.

Still true: nothing in this repo imports from eoreader7's kernel yet; the
-fold is, per eoreader7's own README, "the reference compatibility
application" expected to migrate, not yet migrated.

**Disclosed, not attempted here.** Whether `deriveIdentityRevision`'s real
signature (`{fold, supports, attacks, witness, giver,
canonicalizationFloor}`) actually carries the positional "distance back"
semantics Increment D's margin needs, or has the same gap eoreader6.1's
`revision.js` had, is unread — the single highest-value next research step,
named in `READING-WORKBENCH-ENGINE-PLAN.md` rather than guessed at here.
Increments B through F are unstarted; B and C in particular touch
`index.html`'s `.tabs` bar and `app.js`, both reserved to the
fold-architecture session per this file's own multi-session rule, and were
deliberately left alone this pass.

**Amended same day — the "blocker" (`deriveIdentityRevision`) was read
against the wrong repo, and reads as solved once read against the right
one.** The paragraph above disclosed one open question as the highest-value
next step: whether eoreader7's real `deriveIdentityRevision` carries the
positional "distance back" semantics Increment D's margin needs, given
that eoreader6.1's `revision.js` (a different file, read by mistake in the
first pass) does not. Read directly: it does, via a different and better
mechanism than the byte/sentence coordinate the first pass went looking
for. Every `REC` operation's `consequence` names the source edge it
re-canonicalizes (`sourceEdge`, shaped `edge:text:{sequencePosition}:
{index}` — `identity.js:97`); `understanding-scoreboard.mjs:142-144` reads
that address back out and computes `reach: pos - srcPos` — current
encounter position minus the re-made edge's own encounter position, which
IS "the distance between the position it landed and the position it
re-made." Fed through `reachSummary` (`:208-218`), this reproduces the
workbench spec's own cited numbers, digit for digit, against the repo's
own already-committed result on real Frankenstein
(`native/eval/results/understanding-scoreboard-RESULTS.md:212-213`):
median 749, min 82, max 2,046.

No Frankenstein text ships in this checkout (Gutenberg texts are
gitignored here, the same posture the-fold takes with `goldens/*/texts/`),
so this was confirmed by reading the real code path end to end and
cross-checking the already-committed, already-run result — not by
re-running the ~2-minute full read live. That re-run, against a freshly
fetched Frankenstein, is the natural next verification for whoever picks
up Increment D, not attempted here.

**What this changes.** Increment D is no longer named as this repo's
blocker. It is the increment with the strongest existing evidence: a real
function, a real downstream consumer computing exactly the spec's own
described quantity, and a committed reproduction matching the spec's cited
numbers exactly. The open work is adapting `understanding-scoreboard.mjs`'s
node/eval scoring into something a UI margin renders live per-source, and
settling the spec's own already-named deferred question (persistent gutter
vs. opens-on-demand) — not inventing a coordinate space, which was the
first pass's actual mistake: it read `eoreader6.1/packages/engine/
emergence/revision.js`'s missing positional field and concluded the
concept itself was absent from the organ, rather than checking whether the
real eoreader7 organ addressed the same need a different way.

## P48 — Increment B landed: the reading fronts by default, not Folds

The reading-workbench spec's Increment B, done. `index.html`'s Sources tab
is renamed **Reading** (`title="The reading — the source in focus, and
everything read from it"`), reordered first among the panel tabs, and is
now the default view at wide viewport — `app.js`'s `showView(matchMedia(...)
? "chat" : "explore")`, was `"builds"`. The static `.pane.on` class swapped
to match (`pane-explore` now carries it, `pane-builds` no longer does), so
there's no flash of the wrong pane before JS runs. `README.md`'s and
`package.json`'s one-line pitch changed from the bounded context window to
the reading — "A reading that runs for months without degrading, on a
machine nothing leaves. Its context window never grows — that's the
mechanism, not the point" — using the spec's own phrase
verbatim ("a reading can run for months without degrading").

**Gate, verified live, not just by test.** The spec's own gate: "Every
existing Explore test and `constitution.test.mjs` pass unchanged. The
Explore pane renders byte-identically to before the rename; this increment
moves furniture only." Full suite 1131/1131 (unchanged from before this
edit — nothing in it touches DOM markup). Driven live in the real browser
against `serve.mjs`: at wide viewport the Reading pane fronts by default
with its own internal content untouched (still says "SOURCES" as its own
h2 — that heading belongs to the pane's own established surface and was
deliberately left alone, only the TAB that opens it changed); clicking
Folds and back to Reading both correctly toggle `aria-selected` and pane
visibility (`document.body.dataset.view` correctly reads `"builds"` then
`"explore"`); zero console errors.

**A file-ownership note, checked before landing.** `app.js` and
`index.html`'s `.tabs` bar are named in this file's own multi-session rule
as reserved to "the fold-architecture session." Two peer sessions
(`3-0-07`, `3-0-c8`) were asked directly; neither claimed those files this
session, and one (`3-0-c8`) explicitly said "go ahead." No third session
was listed as active. Proceeded on that basis, disclosed here in case the
reserving session returns and disagrees with the call.

**Increment C, scoped and deliberately NOT started — a real fork found,
not a vague hesitation.** C wants a persistent three-region header
(GIVEN/READ/HELD), each a NAVIGATION destination reading a real organ.
Scoping it live surfaced something the spec did not anticipate: this repo
currently runs TWO separate, divergent source browsers. The one embedded
in `index.html` today (`pane-explore`, native, OPFS-backed, introduced by
commit `e6e57b2` "Sources panel: native file manager...") deliberately
REPLACED the older standalone `explore.html`/`explore.js` app (which still
exists, still runs on `explore-server.mjs`:8812, and still has the real
`priors`/`cast`/`graph` views GIVEN and HELD would naturally navigate to)
— but nothing embeds that older app's views in the current page anymore
(no `<iframe>` tag exists in `index.html`; grepped and confirmed). So
GIVEN's destination ("what did it come in knowing" — the priors view) and
HELD's (the cast/referent view) have no current home in the fronted page:
building them means either reviving a link to the app this repo's own
recent history moved away from, or building new sub-views inside the
native panel — a real product decision, not a wiring job, and exactly the
kind of "forced decision" this repo's own past UI passes have gotten
wrong before when guessed at instead of asked (the 3×3 terrain grid the
user refused, named in the Explore section above). Not guessed at here.
GIVEN's underlying number is cheap and real either way — `EXPLORE_BASE +
"/api/priors/enabled"` is already fetched elsewhere in `app.js`
(line 7433) — so the DATA side of C is not the blocker; the NAVIGATION
side is.

## P49 — Increment C landed: the three-question header, navigation not a readout

The reading-workbench spec's Increment C, done, using the option the user
chose directly when asked (build new sub-views in the native panel, rather
than reviving a link to the deprecated standalone Explore app P41 found).

**What landed.** A persistent bar under the header
(`.ghr-bar`/`#ghr-given`/`#ghr-read`/`#ghr-held`), present on every screen
at every viewport width. Each region is a real navigation destination, the
spec's own forced decision honoured exactly: clicking one calls
`showView("explore")` then `setExploreView(dest)` — it does not just
repaint a number in place. The Reading pane gained a three-way sub-nav
(`files` / `held` / `priors`, reusing the existing `.seg` control the
source viewer's read/raw toggle already uses, per this file's own UX-pass
rule: two faces of one thing is the same question in both places).

**GIVEN** opens a new Priors sub-view (`renderPriorsPanel`, `#priors-panel`)
reading `GET ${EXPLORE_BASE}/api/priors` — the SAME route the `/priors`
chat command and the terminal's `priors` command already read — and writing
through the SAME `POST /api/priors/toggle`. One ledger, now four doors
instead of three, per this file's own already-stated rule for that route.

**READ and HELD** reuse the existing Files sub-view (`renderSourcesPanel`,
unchanged data path) with one addition: a `held` filter that drops muted
text sources (media is never muted — always held once loaded, matching
`measure.js`'s own disclosed rule that mute is a retrieval concept).

**The gate, met exactly as declared.** "Every number in the bar is
traceable to an organ call. A test asserts the surface originates none of
them." `given-read-held.js` (new, pure — no DOM, no fetch) is the ENTIRE
computation: `givenReadHeldCounts({priors, sources, media, muted})` reads
its four inputs and returns three counts, nothing invented, GIVEN a typed
`null` (rendered "—") rather than a false `0` when the priors ledger
hasn't answered yet. `given-read-held.test.mjs` (8 cases) pins this as a
property, in Node, no DOM needed. The DOM-side render functions
(`renderGivenReadHeldBar` in app.js) do nothing but call this function and
write its result into three `textContent`s — checked by reading the
function's own body, not asserted from outside.

**Verified live, end to end, against the real running server — not just
the pure module's unit tests.** Driven through `javascript_tool` against
`serve.mjs` on :8811 (screenshots were unavailable mid-session — the
compositor wasn't displaying — so DOM state and computed geometry were
read directly instead, which is the more precise check anyway):
- GIVEN loaded the real corpus on first paint: 2,052 documents, 1,559 in
  play, matching this file's own priors organ.
- Clicking GIVEN switched the Reading tab to the Priors sub-view, updated
  the heading to "Given", marked the right sub-nav button active, hid the
  file-list toolbar (search/sort/add belong to the Files view, not this
  one).
- Toggling a real genre (`01-literature-books`, 45 documents) OFF dropped
  the header's GIVEN count from 1,559 to exactly 1,514 (−45) — the real
  ledger write round-tripping through the real server back into the
  header. Toggled back ON, confirmed 1,559 restored, ledger left clean.
- A real `drop` event (synthetic `DataTransfer`, the same event the app's
  own drop-anywhere handler listens for, not a private-state hack) added
  one source: READ and HELD both correctly went to 1.
- Muting that source: READ held at 1 (still loaded), HELD dropped to 0
  (not contributing), and switching to the Held sub-view rendered the
  disclosed empty state ("Nothing is held right now... every loaded
  source is muted") rather than a bare empty list.
- Removing the test source returned both counts to 0. No test artifact
  left in OPFS or the shared priors ledger.
- Zero console errors throughout. Full suite 1139/1139 (1131 before this
  increment's 8 new cases).

**Scope, disclosed rather than silently narrower than it reads.** HELD is
implemented as a FILTERED view of the same Files list, not a third,
independent surface — "what does it hold right now" reduces exactly to
"which loaded sources are live," which the existing mute state already
answers precisely; building a third parallel list would have duplicated
data this app already tracks in one place. A genuine `sessionReferents`/
cast view (what the engine has actually resolved from an open source,
rather than which files are attached) is real, more expensive
(~90s on a 3.3MB text per this file's own Explore section), and NOT what
HELD points at here — that is the deeper "what does it hold" the original
wireframe may have meant, and is future work, not this increment's scope.

**Amended same day — the toolbar was fitting with a few px to spare, not
robustly, and the user caught it live.** P42's own verification tested
wrapping at 1400px and 620px window widths and found no overflow either
time — but both tests were confused by the same wrong assumption: `main`'s
own `grid-template-columns: minmax(0,1fr) minmax(320px,430px)` caps the
PANEL COLUMN at 320-430px no matter how wide the window is. A 1400px
window gives the panel exactly the same room as an 1100px one — there was
never a "wide" case in this measurement, so "it fits at 1400px" and "it
fits at 620px" were the same borderline test run twice. It was passing
with single-digit pixels to spare, in one specific automated Chromium
build — the kind of margin that any real difference in font metrics,
scrollbar width, or zoom level breaks immediately, and it broke
immediately: the user's own real browser showed "priors" truncated to
"prio" and the search box collapsed to a sliver, screenshotted and
reported directly.

**The fix removes the borderline fit rather than widening the margin.**
`.sources-actions` (search/sort/add) now carries `flex: 1 1 100%` instead
of `flex: 1` — this forces it onto its own row unconditionally inside the
already-wrapping `.sources-toolbar`, so the title+subnav row and the
search/sort/add row each get the panel's full width, always, rather than
splitting one row three ways at whatever margin happens to survive.
Re-verified live at the panel's actual floor (320px, the CSS minimum) as
well as 620px: two clean rows, zero overflow (`scrollWidth === clientWidth`
everywhere checked), "priors" renders in full, search keeps a genuinely
usable 142px even at the floor.

**A second, independent bug found while fixing the first, unrelated to
layout.** `.ghr-region` (the header bar's buttons) and `#explore-subnav
.seg` (the pane's own sub-nav) both carried a `data-view` attribute with
overlapping values (`"files"`/`"held"`/`"priors"`) — an unscoped
`document.querySelector('[data-view="priors"]')` silently returns
whichever set comes first in DOM order (the header bar, since it sits
before `<main>`), not the one a caller likely means. Found by using
exactly that unscoped query while diagnosing the layout report and getting
the wrong element back. The header bar's attribute is renamed `data-dest`
— distinct name, same click-handler behavior, collision gone. Both
app.js's `.ghr-region` handler and every selector in this section were
already using SCOPED queries (`#explore-subnav .seg`,
`document.querySelectorAll(".ghr-region")`) so this collision never
actually misrouted a real click — it was a latent footgun for the next
unscoped query, not a live bug, and is closed now rather than left for
someone else to hit.

Full suite 1139/1139, unchanged (CSS and one attribute rename only).

**Amended again, same day — the composer went off-screen, and the cause was
this increment adding a row above `<main>` without telling the height math.**
Reported live by the user with a screenshot: the Send button was clipped off
the bottom of the window and the compose box was unusable. `main`'s height is
`calc(100dvh - var(--header-h))`, and `app.js`'s `trackHeader` measured
`document.querySelector("header").offsetHeight` — header only. `#ghr-bar` is
a SIBLING of `<header>`, not a child (it sits between `</header>` and
`<main>`), so its ~33px was never counted: `main` claimed 33px more height
than actually existed above the fold, and the composer lost exactly that
much off the bottom. The CSS comment on that line already warned about this
in as many words ("a wrong constant here scrolls the composer off-screen") —
the warning was read, and then the increment added a row anyway without
updating the measurement it governs.

**The fix.** `trackHeader` now sums EVERY fixed row above `<main>`
(`[header, ghrBar]`) rather than assuming one, and the `ResizeObserver`
observes both. The two CSS fallbacks moved with it (53→86 wide, 46→79
narrow) so the pre-JS first paint is not a frame of wrong layout. Verified
live at 700x820 and 1440x780, both after a real reload: `--header-h` equals
the measured sum exactly (83px and 97px respectively), `gapBelowMain` is
1px (rounding), Send is fully inside the viewport, and `document.body.scrollHeight
<= innerHeight` so the page itself never scrolls.

**The verification lesson, which is the more valuable half — and it is the
SECOND time in this increment the method was the defect.** Mid-diagnosis,
`--header-h` appeared frozen at a stale value across viewport resizes, which
read as a broken `ResizeObserver` and nearly became a fabricated second bug
plus an unnecessary rewrite. It was not broken: **`ResizeObserver` callbacks
are delivered as part of the rendering steps, so a Browser-pane tab that is
hidden or throttled produces no frames and therefore never delivers a resize
— every measurement taken against a non-fronted pane is potentially stale by
construction.** Proven rather than assumed, by arming an independent probe
`ResizeObserver` in the page, fronting the tab, and confirming both it and
the app's own observer fired (the var moved 97px→123px when `#ghr-bar` grew).
The standing rule this repo already had — front the tab and re-shoot before
trusting a blank render — extends to every measured layout value, not just
screenshots. The first instance was the borderline-fit toolbar above (a
constrained panel width mistaken for a wide one); this is the second. Both
times the code was fine or wrong for a different reason than the measurement
suggested, and both times the user caught what the automated check had
declared verified.

**REMOVED, same day, at the user's direction — the whole bar, not a fix to
it.** After the layout defects above were closed, the user's judgment was
that the app does not need GIVEN/READ/HELD at all. Everything this policy
describes building is gone: the `.ghr-bar` markup and CSS, `given-read-held.js`
and `given-read-held.test.mjs` (deleted), the `renderGivenReadHeldBar` render
pass and its four call sites, the `.ghr-region` click handler, `state.priorsData`
(added only to feed the bar, and read by nothing once the bar left), the
boot-time `/api/priors` fetch that existed only so GIVEN had a number on
first paint, and `--header-h`'s multi-row sum — back to header-only, because
nothing sits between `<header>` and `<main>` again. `trackHeader` keeps the
list-shaped form and the comment explaining WHY every row above `<main>` must
be summed, since that is the durable lesson and the list is one entry today
by fact rather than by assumption.

**What survives, deliberately.** The Priors sub-view in the Reading pane is
real, useful on its own, and stays — it reads the same `/api/priors` route
the `/priors` chat command already used. Increment B (the Reading tab) is
untouched. **This policy is kept rather than deleted** because the thing
worth remembering is not the bar: it is that a spec naming something as a
required increment is not authority that it belongs in the product, and two
consecutive verification defects (above) were found in a feature that then
turned out not to be wanted. Cheaper to have asked what it was for first.
Do not rebuild this from the reading-workbench spec without asking.

## P50 — A punctuation class is a CATEGORY, and one wall stands at every site that crosses it

**The law, two halves.** First: when an organ decides something by testing
punctuation, it is testing a CLASS, and the class must be named by its
Unicode general category, never by an enumeration of the characters seen so
far. Second: a wall of that kind is rarely at one site — the same crossing
is usually tested independently in several places, and fixing one of them
proves nothing, because the pipeline only produces its result when every
site agrees.

**What this closes, measured 2026-08-26.** "who was lincoln's vp?" returned
one vice president all day — sometimes Hamlin, sometimes Johnson, each a
true sentence, neither the answer. The cause was not the model, not the
retrieval, and not the logic. It was that the one sentence stating the fact
plainly could not be read:

```
"Hannibal Hamlin (August 27, 1809 - July 4, 1891) was an American
 politician ... the 15th vice president of the United States."

surfaces  ["Hamlin", "Hamlin August", "July", ...]   ← "Hannibal Hamlin"
                                                       never formed; the
                                                       glue crossed the "("
relations an American —politician→ who was the 15th vice president...
```

The subject of the sentence was lost, so no edge ever named Hamlin as a
vice president. Every downstream organ then behaved correctly on material
that was missing the fact.

**The class was already known and simply never named.** `surfaces.js`
started with `[,;:]`, gained `|` in 2026-08-20 for search-result titles,
and that fix's own note said the quiet part out loud: the pipe was "a
run-breaking mark this file had a category for and simply never listed."
Brackets were the next character in a list that has no end — the same trap
this repo already refused for succession boxes and for site-specific title
conventions. Unicode carries the category: `\p{Ps}` is every opening
punctuation mark in every script and `\p{Pe}` every closing one, so
`( [ { （ 「 【 ［` and their partners are covered without a list, and a
script this codebase has never been run against is covered in advance
rather than after the next incident.

**Deliberately not widened to all of `\p{Po}`:** that sweeps in the
apostrophe, and a raw chunk ending in one ("'quoted'") would break a run no
reader would call broken. A category is the right grain; the widest
category is not.

**THREE SITES, ONE WALL.** The bracket crossing was tested independently in
`surfaces.js`'s run-break marks, in `relations.js`'s scan for the token
following a surface, and in `relations.js`'s subject→verb matcher. Fixing
the first removed the spurious "Hamlin August" and changed nothing about
the answer. Fixing the second made "was" discoverable as a verb for the
first time and still produced no Hamlin edge. Only with the third did the
edge appear. **A fix that improves an intermediate number without moving
the result is evidence of more sites, not of a partial win** — and each
site had to be found by tracing the specimen through the pipeline, not by
grepping for the character.

**Leading marks need the other side.** A comma trails the token before it,
so the previous chunk's ENDING marks the break. An opening bracket LEADS
the token after it, and a check written only against the previous chunk's
tail cannot see it. A punctuation test written for one shape silently fails
the other, and both must be read off the same raw chunk so they cannot
drift apart.

**Why skipping an aside is meaning, not a workaround.** A parenthetical
after a name carries facts ABOUT the being just named — its dates, its
aliases. The being and its aside are one mention, so the token that follows
the MENTION is the token that follows the being. This is the same
"referent, not span" discipline this codebase already holds elsewhere,
applied to where a mention ends.

**Measured after:**

```
Hannibal Hamlin —was→ an American politician ... the 15th vice president
Andrew Johnson  —was→ the 16th vice president
```

Full suite 1259/1261, no regressions.

**DISCLOSED, and the next wall.** This fixes reading ONE SENTENCE. It does
not fix selecting fillers out of a large graph: at page scale (3,868 edges)
the slot query still returns "Though he", "22nd Amendment" and "000" as
candidate vice presidents, because matching is substring-tolerant and no
Kind gate filters candidates to the kind the slot admits. That is a
different defect with a different fix, and conflating the two is what would
make this policy read as "the answer is fixed" when it is not.

**The lesson underneath all of it: a reading failure wears the model's
face.** For most of a day the symptom was "the small model keeps giving one
VP", and every hypothesis chased the model, the prompt, the retrieval, and
the logic in turn. The instrument's own marks were right the whole time
("∅ not in the material"), the correction loop was right, and the
completeness gate was right — all of them reasoning correctly over material
from which the fact had been silently deleted at extraction. **Before
concluding a model or a downstream organ is at fault, read one sentence
that states the answer plainly and confirm the pipeline can extract it.**
That check takes a minute and would have saved the day.

## P51 — A certification is not a style: "computed, not generated" must never be a phrase the model can learn to say

**The law.** A house mark that certifies "code produced this, not a
language model" (`arithmetic.js`, `grid.js`'s evaluate outcome, tables.js/
reflex.js's own self-doors — all four already say "computed, not
generated" verbatim) must never appear in text that gets replayed to the
model as its own past speech. `state.history` is exactly that replay
surface (P23's "REAL role-structured history"): whatever an assistant
turn's `content` says is handed back to the model, verbatim, as something
it said. A certification living in that field is not a record, it is a
STYLE — and a model shown its own certified turns will learn to produce
the certification, not the thing it certifies.

**Measured live, arithmetic.js's own audit.** Asked "5 subtracted from
12" — order-reversing phrasing arithmetic.js correctly refused to compute
— the question fell through to the ordinary model pipeline, which drafted
"5 subtracted from 12 is 7 — computed, not generated," copying the
caption verbatim from an EARLIER turn's own history entry
(`arithmeticTurn`'s `answer` string, pushed into `state.history` with the
caption baked in). The number was right; the certification was forged.
`checkGrounding` correctly flagged the sentence as unsupported by any
material, but the visible text still claimed a mechanical guarantee it
never earned — exactly the "model is just the mouth" failure this
project's own standing rule names: never let a model mimic a property in
language it does not actually have.

**The fix, one shared choke point plus one direct push.**
`stripComputedCaption` (app.js) strips the trailing " — computed, not
generated" from whatever gets pushed into `state.history`, leaving the
rendered turn, the fold-line, and the record untouched — a human still
sees the caption everywhere it was already shown; only the model's own
replayed copy of its past turns loses it. `usageTurn` (the generic
no-model-call turn every slash door funnels through, including grid.js's
`/act … evaluate` — the SECOND confirmed site carrying this exact phrase)
applies it at its one `state.history` push; `arithmeticTurn` applies it at
its own. `mechanicalTurn`/`recallTurn` needed no change — they already
kept the caption OUT of `state.history` by construction (pushing
`toMarkdown(built.table)`, never `built.caption`), which is what made the
bug's shape legible in the first place: two of four callers already had
it right.

**Disclosed, not chased further.** `selfOverview`'s own bare `/self` text
was checked and does not carry the phrase — reflex.js's per-level captions
only reach `state.history` through `mechanicalTurn`'s already-correct
path. Not audited: whether the discourse-summary fold (`chatContext`,
P34) can itself pick up a captured caption through a model-written
paraphrase of a raw fold-line — a narrower, lower-probability path than
direct history replay, and a different mechanism (summarization, not
verbatim replay), named here as an open question rather than assumed
closed.

**Verified live, three consecutive turns, one conversation.** "5
subtracted from 12" → "12" and "5" swap correctly to `((12)-(5)) = 7`. "3
less than 10" → `((10)-(3)) = 7`. "5 divided into 20" (still refused,
below) fell through and drafted a real, grounded, uncaptioned answer
about division terminology — no trace of the phrase across any of it.

## P52 — Order-reversing arithmetic has exactly one standard reading, except the one that doesn't

**The law.** `arithmetic.js` bailed on ALL order-reversing English
phrasing ("N subtracted from M", "N less than M", "N fewer than M", "N
divided into M") on the theory that reversing operand order is inherently
too risky to get right mechanically. Checked against real usage, that
theory held for exactly one of the four. Where a phrase has one standard
reading, refusing to compute it is not caution, it is a gap — coverage
this door should have had from P4's own founding principle: BAIL is for
what this module cannot read confidently, not for everything it has not
gotten around to reading yet.

**What actually generalizes and what doesn't.** "N subtracted from M", "N
less than M", "N fewer than M" all mean M − N, with no competing everyday
reading — nobody means anything else by "5 subtracted from 12." "N
divided into M" is different in kind, not degree: real usage genuinely
splits between the classic long-division idiom (M/N — "5 divided into
20" is 4, the way the phrase is taught) and a common colloquial one (N/M
— "20 divided into 5 groups," said loosely for plain division), and there
is no structural signal in a bare question to tell which one a speaker
meant. That one phrase still bails; the other three now compute.

**The risk this checks before shipping.** A comparison question ("Is 3
less than 10?") sharing the same words as the newly-computed arithmetic
phrase is the obvious hazard — get it wrong and the app would answer a
yes/no question with "((10)-(3)) = 7". It is safe by a property that
already existed in the module before this pass touched it: `WRAPPER_RE`'s
stripped set does not include a bare "Is", so "Is 3 less than 10?"
survives normalization as "Is 10 - 3?" — the leftover "Is" fails
`PURE_EXPRESSION_RE` regardless of what the reversal computed underneath
it. Not a new guard added for this fix; an existing one, checked and
found to already cover it, then pinned as a regression rather than left
as an unverified assumption. Verified live against the real model, not
only the unit test: "Is 3 less than 10?" answered "Yes." — a real
comparison, never the arithmetic reversal.

**Evidence.** `arithmetic.test.mjs`: 14 → 18 cases (the reversed-operand
readings, "divided into" still refusing, and the comparison-safety case,
each checked against the real mathjs package). Full suite: 1264/1266
passing both before and after this pass's four new tests — the same 2
pre-existing failures (`eoreader-contract.test.mjs`,
`source.test.mjs`'s Tolstoy specimen), neither of which imports
`arithmetic.js` or `app.js`, zero regressions.

---

## P53 — Answering starts by defining the VOID, and the loop that fills it is DEF/EVA/REC

**The direction, verbatim** (2026-08-27): *"answering all questions starts
with defining the VOID that needs to be filled with a DEF, EVA, REC
loop"* — then, on the stance face: *"and the stance face?"* — then, on
verification: *"test e2e … asking the VP question and similar ones where
the findings should reshape the void."*

**The law.** A question is answered by zeroing its space across all nine
operators and running one loop against it: DEF fans out candidate fillers
from a declared posture, EVA admits or refuses each against the declared
admission test, and REC re-zeros when either the posture is spent or the
findings contradict the space itself. The answer is what the loop leaves
standing. An uncovered extent is a **finding**, never a blank, and never a
plausible partial answer.

**Both halves already existed; neither could reach the other.** `grid.js`
lands DEF/EVA/REC on an append-only task log with every refusal the
composition law names. `void-shape.js` declares a space across the nine
and does the coverage arithmetic. But `declareVoid`'s only caller
(`void-brief.js`) built a declaration **after `renderAnswer` had already
run**, wrapped so it could not break the turn, and threw it away; and
grid.js's acts were reachable only by a person typing `/act`. `void-loop.js`
is the loop and is deliberately the only new thing — no second log, no
second algebra, no second coverage test.

**The choreography is READ, never chosen.** Every act the loop lands takes
its terrain and stance from the void's own cells, computed by the engine's
cube at declaration time. Computed against the real cube, DEF is
`Differentiate·Figure` at Lens (**Dissecting**), EVA is `Relate·Figure` at
Lens (**Binding**), REC is `Generate·Pattern` at Paradigm (**Composing**) —
so the loop's spine is *cut the candidates out, bind each to the ground,
compose a new ground when the binding fails*. Two facts fall out of that
table that were not designed in: **DEF is the only Dissecting cell in the
whole declaration** (cardinality is the single cut in a space otherwise
made of clearings, bindings and compositions — and exactly the cell whose
absence produced the two-filler-slot-read-as-one specimen), and **DEF and
EVA share a terrain and differ only in stance** (you cut with the lens,
then you bind with it — which is why they are a loop and not two unrelated
checks). Nothing here hardcodes a terrain/stance table, so a change in the
engine's algebra moves this loop rather than leaving a drifting copy.

**Two stance faces, kept apart.** The DERIVED stance (`STANCE_BY_MODE`) is
a property of a cell — computed, never chosen, cannot be wrong. The
DECLARED stance (`from <stance>`) is the actor's posture — declared per act
and refusable three ways. `grid.js` will not import the engine's stance
labels and its header says why: a grid act is medium-blind, so an engine
label there would read as authoritative output when it is not. A void
declaration does not have that problem — `cellOf(op, grain)` uses the
operator's own domain, so its nine cells are domain-locked by construction.
Same word, two standings; harmonizing them breaks one.

**The ladder, and the loop's own law.** `extraction` → `cultivation` →
`encounter`, descended only on exhaustion, each descent a typed entry —
`skills.js`'s own ladder discipline with stances in place of tiers.
`encounter` is last and is the only rung that can supply a filler the
material never named; naming it as a posture is what makes fabrication
visible instead of ambient. Witness and stance are different facts and
both ride every candidate: the witness says WHO (material, library,
`self:model`), the stance says HOW. `grid.js` pins one stance illegality
(`synthesize` may not declare `from relate` — "you cannot commit a whole
from a stance that refuses to commit"); **this file generalizes it and OWNS
the generalization**: the loop may not close from the posture it proposed
from, because a fan-out from `encounter` closed from `encounter` tested
nothing and the EVA between was ceremony (`stance_did_not_change`).

**Fan-out, not walk.** `proposeFrom` takes an ARRAY and lands every
candidate before any admission runs. Structural, not stylistic:
propose-one-test-it-propose-the-next is a greedy search, and a greedy
search over two true fillers returns whichever it drew first — which *is*
the specimen. The set of DEFs with no clearing EVA is the superposition,
addressable on the log, projectable at a cursor, and revisable because
supersession keeps the past.

**REC has two triggers and grid.js already had both paths.** A spent
posture lands `concedeEvaluation` (EVIDENCE·REC, no supersedes —
`build-log.js::rezeroBuild`'s own semantics: a re-zero concedes a ground,
it does not compile a new whole). A **wrong declaration** lands
`revise … supersedes <opening>` (SUPERSEDE — the act that zeroed the space
is superseded, because the space it zeroed was the wrong one). Reshaping
resets the ladder, keeps the descents as record, carries testimony across,
and returns extensionally-refused candidates to `wish` — their refusal
rested on the very extent just conceded. A revision that changes nothing
is refused as churn (`no_change`), the same wall `reviseBuild` holds for
identical code and for the same reason: it would not terminate.

**Three walls found by testing, not by reasoning.**

1. *The blanket under-specified refusal was a wall nothing useful could
   pass.* The first cut refused any `under-specified` declaration outright,
   on the position that if the nine cannot be declared there is no question
   yet. Its own test caught the cost: a space with no numeric extent could
   never open, so the cardinality close — the only route such a space has —
   was unreachable code, and `void-shape.js`'s deliberate `constraint: null`
   branch could never be reached through a loop. **Third time this repo has
   caught that shape** (the measuring door's unreachable `best_of_n`,
   `nul`'s borrowed window floor). Graded to three named refusals —
   `no_slot`, `no_anchor`, `no_closing_condition` (neither extent nor
   numeric cardinality, so nothing could ever license a commit) — with
   everything else undeclared riding the loop as `underSpecified` and
   reported by `foldLoop`: visible exactly as `void-shape.js` asks, without
   being fatal.

2. *A trigger this module generates must be carriable by the act line this
   module composes.* The composition law has no escape syntax, so
   `reshapeTriggers`' own details quoted with `"` were refused by the
   loop's own quoting wall — the natural flow (take the finding, pass it as
   the trigger) was impossible. Generated details now quote with `« »`,
   this repo's own mark in generated prose (`crown.js`), leaving the
   refusal of a straight `"` intact where it belongs: a filler's identity,
   and a hand-written trigger.

3. *`extent_excludes`, found by running it on real material.* The first cut
   of `reshapeTriggers` only read *admitted* fillers that ran past the
   extent. The e2e showed the stronger signal is the opposite: a space
   refusing every candidate that could fill it **while reporting itself
   short** is evidence about the space. The disclosure is deliberately
   weaker than `extent_too_small`'s, and the reason is an ordering cost
   named rather than hidden — `admit` refuses a wholly-outside span as
   arithmetic *before* the admission organ is consulted, which saves a
   fetch per obviously-excluded candidate and loses real information: a
   candidate excluded by a *wrong* extent never gets the check that would
   show the extent was wrong. So the trigger claims exactly what happened,
   **excluded without being read**, and names the cell to revise rather
   than deciding which of extent-or-admission is at fault.

**Evidence.** `eval/void-loop-e2e.mjs` over live Wikipedia, transcript and
full findings in `eval/results/void-loop-e2e-RESULTS.md`. Twenty-eight junk
candidates offered by a deliberately crude generator across two specimens;
**zero reached testimony**, each refused with a reason read off its own
source, and a candidate that stated the relation with no span correctly
stayed a *wish* rather than being convicted. The FDR specimen reshaped its
own space (`1933-1937` → `1933-1945`), re-admitted the re-opened candidate
against the new ground, descended twice more, and then **refused to
commit** — "Henry Wallace" alone is a true sentence and a wrong answer, and
`void_open` declined it.

**Two limits, disclosed rather than engineered around.** (1) *The loop is
exactly as good as the space it was given.* Lincoln committed
`Hannibal Hamlin (1861-1865)` and called it complete — arithmetically
correct against the declared space, and not the whole answer, because
Andrew Johnson held the office six weeks *inside* 1865 and a year-grain
extent cannot see a hole inside one year. The defect is in SEG's own cell
("the extent to be covered, **and its units**"), the same granularity
disclosure `void-shape.js`'s `merge` already carries. Stated plainly
because it is the sharpest form of the position: **an under-declared space
produces a confidently complete wrong answer, and no loop machinery
downstream recovers it.** (2) *The generator's failure is a coreference
failure* — Garner was never found because the page names him `Garner` near
the relation and a two-word capitalised scan cannot see a single surname or
connect it to `John Nance Garner`, exactly the class `cast.js`'s referent
index (P38) exists for and which the crude control generator deliberately
does not use.

**Not wired into a live turn.** `void-loop.js` is pure with organs
injected, `void-loop.test.mjs` is its conformance suite, and the e2e drives
it over real bytes — but `app.js`'s turn still builds its brief after
`renderAnswer` and discards it. Moving `briefFor` ahead of retrieval, and
running the loop as the turn, is the next pass; `app.js` is the
fold-architecture session's contract and this pass does not reach into it.

**Files.** `void-loop.js` (new, pure — imports only `./void-shape.js`;
`grid` and the admission organ are injected, the cast.js discipline).
`void-loop.test.mjs` (36 conformance cases against the REAL cube, REAL
grid and REAL void-shape; no stubs that matter). `eval/void-loop-e2e.mjs`
+ `eval/results/void-loop-e2e-RESULTS.md` + `void-loop-e2e-transcript.txt`.
No existing file touched. Suite 805/687/118 before, 841/723/118 after —
failure names diffed against the baseline, not counted: zero regressions.
The 118 are pre-existing and environmental (`legacy-eoreader6.1` is an
uninitialised submodule in this checkout, so `grid.test.mjs` among others
cannot resolve its imports; `void-loop.test.mjs` therefore imports
eoreader7's **native** kernel, as `void-shape.test.mjs` already does).

### P53, amended 2026-08-27 — a model reads, the material checks, HL judges

**The direction, in two parts.** First: *"use the full power of the
hyperlexicon."* Then, watching the driver grow one admission rule per
specimen that broke: *"and a small model call because we can never define
every little case like «abbreviation gate»."*

**What forced it.** Admitting candidates by rule grew four rules in one
afternoon on one specimen family, each correct for the case that prompted
it and wrong for the next: a relation stated as "running mate" rather than
"vice president"; a span sitting beside the relation that belongs to a
DIFFERENT office two clauses over; a candidate whose kind is a faction;
and a sentence boundary falling inside "Franklin D." so the anchor landed
in the next fragment. That is the shape of a rule set nobody finishes.

**The split.** READING is a model's job — turning a page into "who held
what, under whom, over what span" is the half that cannot be enumerated.
JUDGING is HL's and must never be a model's — a verdict has to be sound,
reproducible and answerable for, which is what declared rules with named
givers buy and a model's opinion cannot. Between them, THE MATERIAL CHECKS
THE MODEL: a model's claim is never ground. So a reader never returns a
verdict; it returns EDGES WITH PROVENANCE, and swapping the reader changes
nothing about the judgment.

**`void-hl.js`** (new, pure) is the bridge: `stageFromReadings` stands
readings up as an HL stage with declarations, `admissionOf` asks HL and
maps its answer onto the loop's admission vocabulary. The mapping is a set
of decisions, each stated: BOUND → `holds`; CONTRADICTED → `refused`;
CONTESTED → `null`, because FDE's "both" is an unsettled question and
convicting on it is the accusation-with-no-evidence this repo's grounding
ladder already forbids; UNBOUND and BEYOND_REACH → `null`.

**What HL bought, on the case no rule could reach.** Calvin Coolidge is a
real vice president whose own page states the relation, whose kind is a
person, and who is not Roosevelt's — he passes every surface test that can
be written. Under HL he is CONTRADICTED by one declared rule with a named
giver (`functional(vicePresidentOf)`, giver: the office's own structure).
`void-hl.test.mjs` pins the mechanism: with the declaration,
`contradicted`; without it, on a byte-identical stage, `unbound`. **An
undeclared rule convicts nobody.** Live, the FDR specimen ran thirteen
candidates across two rungs with ZERO false admissions and two R2
exclusions (Coolidge, James M. Cox).

**R2'S PRECONDITION, found by testing and named because nothing named it.**
An earlier draft of `void-hl.js` claimed a reader's blind spot always
degrades to a gap. The real engine refuted it: with a functional
declaration, a reading that says «FDR» where the slot says «Franklin D.
Roosevelt» is not silence — R2 reads it as bound to a DIFFERENT object and
REFUSES a true candidate. **A functional relation makes anchor identity
load-bearing**, and with a string fold an alias convicts. The claim is
corrected rather than dropped, pinned as a regression, and
`stageFromReadings` reports `anchorIdentity` so a caller relying on the
default fold can see that it is. The fix is injecting real referent
identity (`cast.js::makeReferentIndex`), not more rules.

**THE QUESTION'S OWN SINGULAR IS A FUNCTIONAL DECLARATION.** "Who WAS
Lincoln's vice president?" is a definite description whose singular
phrasing asserts `functional(hasVicePresident)`; read in that direction HL
returns CONTESTED — presupposition failure. The honest answer is not one
filler, it is *the question presumed one and the material has two*. Both
directions are real and say different things: `vicePresidentOf(vp,
president)` IS functional and excludes Coolidge; `hasVicePresident` is
not, and asserting it is what the question does.

**The reader is a real local model on CPU** — `onnx-community/
Qwen2.5-0.5B-Instruct` at q4 via `@huggingface/transformers`, in-process,
no server and no GPU (~27s load, ~6s per read). **The prompt is measured,
not drafted**, four shapes scored against four real specimens: angle-
bracket placeholders 0/4 (echoed the placeholder and answered `false` on a
text that plainly stated the relation — `provenance.js`'s own documented
leak); concrete worked examples 2/4; + a distinctness rule and a
both-offices example 3/4; + **INS asked as INDIVIDUATION rather than
kind** 4/4. That last is the one to keep: "is a War Democrat a person" is
honestly YES — a faction is made of people — and the slot does not admit a
KIND of person, it admits ONE NAMED INDIVIDUAL. The engine's own
individuation vocabulary, asked as a question, did what a kind-matcher
could not.

**Two checks on the model, both the same law.** P31's company rule, aimed
at a model instead of at prose: the model's span is accepted only where
the source states it in the same breath as the relation. Measured —
Hamlin's 1861-1865 KEPT, Johnson's 1865-1869 DROPPED (his presidency),
Coolidge's 1923-1929 DROPPED. Dropping Johnson's span is what makes the
good result reachable: he lands admitted-but-unplaced, exactly what the
material supports. The relation gets the same treatment after the model
claimed Herbert Hoover was Roosevelt's vice president against a page that
never states the relation at all.

**Two bugs the run found.** `Number(null)` is `0` and `Number.isFinite(0)`
is `true`, so a null year became year zero — measured live as `span 0-0`,
a span that would have been filled into the space and corrupted the
coverage arithmetic, surviving only because the company check happened to
drop it. And **evaluated-and-inconclusive is not unevaluated**: both landed
on `wish`, so a candidate HL had already returned `unbound` for was
indistinguishable from one never looked at, and since `descend` refuses
while a wish is untested, one junk candidate nothing could settle pinned
the ladder forever. Surfaced only by wiring HL, where `unbound` is the
correct and common answer for a source that says nothing.

**Result.** `Hannibal Hamlin (1861-1865); Andrew Johnson` — both fillers,
exactly the right two, junk refused with reasons read off each candidate's
own source, nothing invented, and `NOT COMMITTED — unplaced_filler`
because the material never places Johnson.

**Limits.** A year-grain extent cannot see a hole inside one year (SEG's
own cell: "the extent to be covered, AND ITS UNITS"). The 0.5B reader is
wrong in exactly one place — "Northern Democrats" read as one named
individual on the Lincoln specimen (7/8 there, 13/13 on FDR) — contained
by the architecture as an unplaced filler that blocks the close and shows
in the answer, but a wrong filler nonetheless, and a READER limit rather
than an architectural one; whether a larger reader closes it is measurable
and was not measured. Garner is never offered at all, because the page
names him "Garner" and the crude generator cannot connect that to "John
Nance Garner" — the coreference gap P38's referent index exists for.

**Files.** `void-hl.js` + `void-hl.test.mjs` (17 cases against the REAL
engine HL). `void-loop.js` gained the `undetermined` standing, the
unplaced guard, `unplaced_filler`, and the `covered_but_unplaced` /
`extent_excludes` triggers; `void-loop.test.mjs` 36 → 43. Suite: this
checkout had NO `node_modules` at all (the original 118 failures), and
installing `@huggingface/transformers` for the reader let three test files
load that previously could not — so the baseline moved honestly from
805/687/118 to 912/793/119, where the delta is 60 new passing cases of
this pass's own, three file-level failures replaced by four real
environmental ones inside them (missing `sql.js`, missing WebLLM weight
shards), and zero regressions. Failure names were diffed, not counted.

### P53, amended again 2026-08-27 — a gap the loop can name is a question it can ask

**The direction:** *"it should also research Johnson to understand it, it
needs to be curious."*

**The defect.** The loop was honest and INCURIOUS. It admitted Andrew
Johnson, could not place him, reported `unplaced` and stopped — filing the
gap rather than pursuing it. The gap it filed is specific: not "something
is missing" but "I hold a filler and the source I read never says when."
A gap that specific is a question, and a question is something to go and
answer.

**`whatWouldSettle(loop)`** (pure, fetches nothing) turns loop state into
the questions that would settle it, each naming what changes if answered,
ordered by what settles fastest: placing a filler already in hand comes
before searching for a new one, because it is one targeted read against a
source already identified and it can close a space outright where a search
may find nothing. `openQuestions` is already taken by `fold.js` for a
different question (which facets of a TURN went unanswered), so this gets
its own name rather than overloading that one. Acting on the questions is
the caller's, exactly as reading is: **the loop knows what it needs to
know; it does not know how to find out.**

**`placeFiller(loop, {filler, span, source})`** folds an answer back in. It
revises an admitted filler's own reading — it proposes no new candidate and
does not re-open the ladder, because nothing new was found. It REFUSES a
span the extent cannot contain (`span_outside_extent`): **widening an
extent is a deliberate act with its own REC on the record, never a side
effect of answering a question.**

**Measured live, and the reader failed while the wall held.** The answer is
genuinely there — Johnson's Wikipedia SUMMARY carries no vice-presidential
span and his FULL page does ("…what happened on March 4, 1865", and better,
"sworn in alongside Hamlin, his predecessor as vice president", which states
the succession that partitions the extent outright). The loop stopped at the
summary because that is all it thought to ask for. Given a 1,400-character
window of the full page, the 0.5B reader answered `1808-1860` — his birth
year and an unrelated one, both genuinely present in the bytes shown, so
the "a model's value must appear in what it was shown" check passed.
`placeFiller` refused it on the extent. **A wrong read did not corrupt the
space, did not silently widen the extent, and did not produce a confident
answer.** That refusal is the property worth having, and it is worth more
than the reader being right would have been, because it holds for readers
that are wrong in ways nobody anticipated.

**The remaining defect is window SELECTION, named rather than fixed:** the
window is the relation's own sentences in DOCUMENT ORDER, and on a
90,000-character biography its first 1,400 characters are early life and
other people's vice presidencies. Ranking by sentences naming both the
candidate and the anchor is the obvious next move and was not measured.

**One more bug, caught by writing the test.** `fill` is append-only by
design — "a filler is never overwritten by a later one that happens to
share its name", because two witnesses covering different extents is the
Lincoln case itself — so placing a filler on top of its own spanless entry
left BOTH, and `voidsOf` would have gone on reporting it unplaced forever.
`placeFiller` rebuilds the space instead, the same rebuild `reshape`
already does.

**Files.** `void-loop.js` gained `whatWouldSettle` and `placeFiller`;
`void-loop.test.mjs` 43 → 50. The driver gained `deeperRead` (full page,
not summary; the window declared and the reader's years checked against
exactly it) and `beCurious`, which lands a placement as a RESULT on the act
that admitted it — never a silent state change. Suite 912/793/119 →
919/800/119, identical failure set, zero regressions.
## P54 — The void is declared out loud, before the answer exists; the marks come off the answer and stay in the drawer

**User direction, verbatim (2026-08-27):** *"hide the 'grounding' badges for
now, and i want the 'thinking' reasoning to show in real time its work
figuring out the shape of an answer that would satisfy."*

Those are one request, not two. The apparatus keeps RUNNING — the void
narration below is exactly the reasoning being asked for, and it is gated on
`state.grounded` — while it stops being PAINTED over the answer. The prose
gets clean; the reader gets more of the reasoning, in the place they open
when they want it.

### The defect: DEF rendered as a receipt

`void-brief.js`'s declaration was computed ONCE, at `app.js`'s render time,
AFTER `runHolonicTask` had returned and AFTER `renderAnswer` had already
painted the answer to the DOM. It landed in a collapsed `<details>` a reader
opened afterward to find out what shape the answer should have had.

So the one thing the whole void apparatus exists to establish — **what would
count as a satisfying answer, decided before the answer exists** — was the
one thing a reader could never watch happen. It was structurally incapable of
narrating: by the time it ran, the ticker had been cleared and the live log
element had been destroyed by `renderAnswer`'s own `body.textContent = ""`.

### Three moments, one declaration

`voidBriefFor(task, texts)` (app.js) is the single injection site all three
moments call, so they cannot drift into three subtly different declarations —
the drift class this repo's own postmortems have already caught twice (P22's
`Array.find`, P24's `name === "sql"` ternary).

1. **From the question alone, before any model call.** What is being asked
   for, what it hangs on, and everything about the shape still open. Nothing
   is said about extent or fillers: claiming "nothing states a span" before
   anything has been consulted would report a reading that never happened.
2. **From the material in hand, still before the model drafts.** The extent,
   what is named, what is still empty, and the concession where the material
   contradicts the question's own grammar. Reads `live` — the same array
   handed to `runHolonicTask` on the next line, never a second set gathered
   separately. **This is the pass that makes the void predictive rather than
   forensic.**
3. **From everything the turn held**, retrieved passages included.

### It has to read like thinking, and the first cut did not

**User correction, verbatim, on seeing it live:** *"think about how 'thinking'
text works, our current affordance is too structured."*

The first cut emitted one line per operator-step, and each line was structured
data wearing sentence clothes:

```
still unspecified — 6 operators nothing has answered: INS (Kind) what kind of
thing may stand here · SEG (Field) the extent to be covered, and its units ·
CON (Link) what binds a filler to the anchor · SYN (Network) …
```

That is a record laid out for a machine and then read aloud. **Thinking reads
as continuous prose that arrives at things** — a subject taken up, a
distinction drawn, a doubt named, a consequence followed. Nobody thinks in
field-name/value pairs joined by middots, and text in that shape asks a reader
to PARSE where it should let them READ.

So `void-narration.js` emits PARAGRAPHS, not rows. The nine operators are
still exactly what is being reasoned about — they are what the void IS — but
they appear as the questions they actually are ("what kind of thing belongs
in it", "how wide it is") in running sentences, **and their operator letters
are not said at all**. The letters are notation for the record; the record
already carries them in `brief.declaration.cells`, and the panel still prints
them. A reader watching a question get taken apart does not need the
notation, and putting it in front of them is what made the first version
unreadable. This is the repo's own standing rule — *"prompt format matches
output format; prose in for prose out, avoid symbolic/bracket-tag
scaffolding"* — which was written about what is SENT to a model, applied to
what is SHOWN to a person.

`void-narration.test.mjs` pins the SHAPE, not the wording: no middots, no
operator letters, no bullets, no `field = value`, several real sentences,
counts spelled as words. Wording is meant to be edited freely; the properties
that made the first version unreadable are not.

### Presentation: two voices, one chronology

The run log is a log — mono, one fact per line, `3 passage(s) retrieved` — and
reads correctly as one. Sharing its element made the reasoning read as more
log. But **splitting them into two stacked lanes broke chronology**, visible
immediately on the first live run: *"The material puts it at 1861 to 1865"*
sat ABOVE *"found 3 page(s)"*, the step that went and got the material. A
thought printed before the act that caused it reads as the instrument having
known it all along.

So: one container, blocks appended in real order, each in its own voice. A
thought closes the current run of log lines and opens prose; the next log line
opens a fresh run. The log lines end up reading as stage directions between
thoughts, which is what they are. `.reasoning` is proportional-faced, 1.62
line-height, 66ch measure, real paragraph spacing, with a quiet left rule that
marks it as thinking rather than answer without borrowing the accent the
disclosure panels use for their own rail.

**And it survives the turn where a reader will look for it.** It used to
persist only inside "how the task ran" — a mono `<pre>` in a nested
`<details>` inside the thinking panel, three clicks deep, interleaved with
retrieval counts. It now sits at the TOP of the disclosure, before the fold
line and every nested panel: open "thinking" and the first thing there is what
the turn thought.

### A fourth bug, found only by reading the live output

**The digest was too sensitive, so the instrument repeated itself.** The third
pass reads more material than the second, so the SAME span comes back with a
higher corroboration count — and the narration re-printed BOTH material
paragraphs whole to change one word from "Two" to "Three". Seven paragraphs in
the panel, two of them near-verbatim copies. A reader learned nothing and read
it twice.

`mentions` is now out of the digest, and the digest is scoped to what each
phase actually renders. A stronger count for the same span, the same fillers
and the same standing is not something a reader learned; it is the same
finding held a little more firmly, and spending two paragraphs on it reads as
an instrument stuck rather than one working. A change in the span itself, in
who is named, or in whether the space closes is real news and still speaks —
pinned both ways as regressions. The first attempt at that regression test was
itself wrong and caught by running it: doubling the specimen to raise the
count also duplicated its box subjects, which `verifyChain` rightly refuses as
`duplicate_id`, so the fillers changed too and the test measured something
else entirely.

### Three real bugs, all found by running it, none reasoned about first

**(1) The anchor was the possessive TOKEN, and it silently disabled the
measurement.** `briefFor` fell back to `shape.marker` when handed no anchor,
and for "Who was Abraham Lincoln's vice president?" that marker is
`lincoln's`. So SIG declared its anchor `lincoln's`, NUL's slot read `vice
president of lincoln's`, and `extentFor` built `/lincoln's/i` and looked for
THAT in the material. Real prose says "Lincoln was", "President Abraham
Lincoln", "during Lincoln's first term" — the possessive is the rare form, so
the extent read found nothing on material that plainly states it and the
space came back `unbounded` however good the material was. **A wrong anchor
does not merely mis-label the panel; it disables the measurement the panel
reports.** `possessorIn` (void-brief.js) reads the possessor in the
question's own casing. THE SIGNAL IS THE POSSESSIVE, NOT THE CAPITALISATION
(L2): `'s` is a received grammatical marker and decides that a possessor is
present at all; capitalisation only decides how far left the name runs — the
same division of labour `cite.js::namesIn` already holds. Measured live
after: SIG `Abraham Lincoln`, SEG `{from:1861,to:1865}`, on real fetched
Wikipedia.

**(2) Moment 3 clobbered moment 2 with a weaker read.** The final pass
declared over `result.sections`'s RETRIEVED passages alone — correct when it
was the only pass, wrong the moment a better-informed pass ran before it.
Retrieval keeps the top few passages, so the final declaration was built from
LESS material and silently replaced the one already narrated. Measured live:
moment 2 read the extent from 1,999 passages and stated it twice; moment 3
re-read from 3 and stated it once, and the panel showed the weaker number.
The void is a claim about the QUESTION's own space, not about which passages
the model happened to be shown, so moment 3 now declares over the UNION.
Retrieved passages stay in that union rather than being dropped for `live`:
on a decomposed task a part can retrieve material the flat array does not
hold, and losing that would be the same mistake in the other direction.
Measured after: `stated 3×`.

**(3) One control was doing two jobs, so neither could be asked for.**
`#marks-toggle` set `state.grounded` AND toggled `body.marks-off` in
lockstep. Consequence: `marks-off` could never hide anything on a newly
rendered turn (with checking off, nothing was drawn to hide) — it only ever
affected backscroll — and *checked-but-unpainted*, the state the user just
asked for, was unreachable. The control now owns only the MODE; `marks-off`
is a standing suppression applied once.

### The rule this pass adds to the CSS

**Every `marks-off` rule is scoped to `.msg .body`.** That scoping IS "hidden
drawing, never a hidden finding" expressed in CSS: `.turn-meta` is a SIBLING
of `.body`, not a child, so the drawer is out of reach by construction. Two
rules (`.grounding-strip`, `.proof-panel`) had been unscoped and — since both
now append INTO the drawer rather than beside the answer — were hiding the
finding too, the one thing the comment above them says they must not do.
`span.ref.bad`, `.crown-line` and `.grounds` were drawn in the body and
covered by nothing; they are covered now.

Verified live across two real turns: 0 visible ref chips, edge badges, crown
lines or grounding strips on the answer; 10 findings intact in the drawer.

### What this does NOT do, and the measurement that decided it

**The void is still DISPLAYED, never fed to the model** — and this pass
re-measured why rather than inheriting the claim. `void-shape.js::voidLine`'s
own docstring says it exists "to be given to a model," and it is tempting to
wire it now that the void is demonstrably good. It would make the answer
WORSE today, for a reason that is a fact about the filler side and not about
the model: the void reports `nothing named yet` (its structural reader found
no fillers in the live page format), so its line ends *"Do not fill this gap
from memory — say it is open"* — which would suppress the one true filler the
model DOES read out of the passages. **Feeding a void whose filler side is
blind converts an incomplete answer into a refusal.** Wiring `voidLine` into
a prompt is gated on the filler side first, not on anyone's appetite for it.

**The filler ceiling, re-measured on the real pages this session fetched**
(gab.ai/Hamlin, Wikipedia/Johnson, Wikipedia/Hamlin — three distinct hosts,
two naming exactly the two fillers). Running the live `makeRelationReader`
over them and querying the open subject slot returns `Though he`, `Congress`,
`as`, `After`, `Although`, `He served`, `first term` as candidate vice
presidents. This reproduces, on a third independent specimen, the ceiling
`void-brief.js`'s own header and MINE-1's results already record. **Chasing
fillers through the clause extractor is a closed road**, and the user's own
standing direction points away from the alternative: *"we can't over engineer
how it gets an answer from wikipedia."*

### What IS established, and it answers a question left open

The user's own prior open question was *"i can't tell if we created a good
void to EVA against."* Measured live, before the model drafted a word:

```
NUL  Existence      Void       slot = "vice president of Abraham Lincoln"
SIG  Existence      Entity     anchor = "Abraham Lincoln"
SEG  Structure      Field      extent = {"from":1861,"to":1865}
DEF  Interpretation Lens       cardinality = "unknown"
```

and the standing: *"1861-1865 is filled by nothing named so far — something
holds that extent, and this reading has not found it."*

That is a good void. It is correct, it is mechanical, it names its own five
remaining holes rather than defaulting them, and it fires before the answer
exists. The answer that turn was still incomplete ("The material confirms
this is Hannibal Hamlin. There is no mention of anything else beyond this")
— **the instrument measured the incompleteness the model asserted away.**
That disagreement is now visible in real time instead of discoverable in a
receipt, which is the whole of what this pass claims.

### Files

`void-narration.js` (new, pure) + `void-narration.test.mjs` (21 cases, every
one against a REAL brief built by the real chain over the real engine cube —
a fixture brief would make "the narrator cannot disagree with the arithmetic"
untestable by construction). `void-brief.js` gained `possessorIn` and the
anchor fallback. `app.js`: `voidBriefFor` and `paragraphsOf` hoisted, the
single interleaved trace replacing the two-lane body, `narrateTheVoid` wired
at all three moments, the post-hoc block replaced, `reasoning` threaded into
`renderFold` and rendered first, `yearSpansIn` import dropped as dead.
`index.html`: `.reasoning` prose typography added, the `marks-off` block
re-scoped and widened, the checking tooltip corrected — it had promised marks
that no longer draw.

**Evidence.** Full suite 1308/1310 passing — the same 2 pre-existing
failures this repo already carries (`eoreader-contract.test.mjs`,
`source.test.mjs`'s Tolstoy specimen, both recorded in P52 and neither
importing anything this pass touched), zero regressions. Driven live end to
end against `node serve.mjs` on the real page with the real model
(gemma2:2b) and real DuckDuckGo/Wikipedia fetches, not fixtures: the
reasoning streamed as prose into the turn's own trace, interleaved in real
order with the run log, while the model was still writing; the no-slot branch
("How does photosynthesis work?") said its one typed thought and correctly
never repeated it as material arrived; the repetition bug above was found by
reading the live panel and confirmed fixed there (7 paragraphs with 2
near-duplicates, then 5 with 0); and a DOM inspection across both turns found
0 visible ref chips, edge badges, crown lines or grounding strips on the
answer surface with 10 findings intact in the drawer.

### The REC, and the gap it exposed (amended same day)

**User, on seeing the reasoning live:** *"ok but when the contents are
returned and there's multiple VPs, it should trigger a REC on the slot, no?"*

Yes — and it did not, for two separate reasons, one of which is now fixed and
one of which is a real, measured, named gap.

**Fixed: the REC was only a sentence.** The concession paragraph fired off
`fillers.length >= 2` and said the singular reading was conceded, while the
declaration itself sat unchanged — `cardinality: "unknown"`, and REC's own
cell (`reopensOn`, "what forces this declaration to be revised") UNDECLARED,
as it had been on every turn this has ever run. A concession narrated but not
recorded is a claim about the record the record does not support.

`briefFor` now re-declares: more than one filler bound to a slot the question
did not declare plural makes `cardinality` `enumerated` and answers
`reopensOn` with what forced it. The narration fires on `reopened` — the
revision having actually happened — never on a count, so the sentence cannot
appear on a turn where nothing was revised. Each moment declares afresh from
what is known then, so the revision is visible as the difference between
moment 2's brief and moment 3's, which is the append-only trace across
moments rather than a mutation of one.

**Fixed: the void never asked the material how many.** `clusterFillers`
(hypergraph.js) has computed exactly this since 2026-08-19 — a slot the
material binds to MORE THAN ONE distinct object — and rides it on every claim
as `claim.fillers`. holon.js's completeness gate reads it. The void, the one
organ whose entire subject is *how many does this slot hold*, never asked.
`observedFillers` asks, picking the slot that is actually this void's by
shared content words with its slot phrase and anchor, and REFUSING a tie
rather than guessing.

**Not a fresh hunt, and that was measured rather than assumed.** Asking
`queryReferents` for the open subject of "was … vice president" over the real
pages a live turn fetched returns `Though he`, `Congress`, `as`, `After`,
`During`. Filtering on the `resolution: "referent"` disclosure does NOT clean
it — `Although he`, `After` and `Congress` all resolve as referents.
`clusterFillers` is not a better hunt; it is a better-posed QUESTION.

**And then it correctly refused, live, which is the finding.** Driven end to
end on the real page: the REC did not fire, DEF stayed `unknown`, REC stayed
UNDECLARED. Not a bug — the only multi-filler slot the turn produced was
`Hannibal Hamlin | was`, bound to *"the 15th vice president of the United
States"* and *"a politician and attorney from Maine who served in the public
service for over fifty years"*. Those are two DESCRIPTIONS OF HAMLIN, not two
vice presidents. Attributing them to the vice-presidency slot would have been
a fabrication dressed as a concession, and the shared-word guard is what
stopped it.

**The named gap, stated plainly because it is the next real step.**
`clusterFillers` computes cardinality only for slots THE ANSWER USED. The
answer named only Hamlin, so the only slot opened was "Hamlin was ___", and
the slot the question actually opened — the vice-presidency of Lincoln — was
never asked of the material by anything. **The void declares a slot and
nothing ever queries the material for that slot.** Both existing readers are
dry on this material for it: `queryReferents` at page scale returns junk
(measured twice, with and without the resolution filter), and
`officeHolderGroups`/`successionFillers` find 0 multi-holder groups across all
four real fetched pages, because the extracted text face carries no
succession-box structure. So the REC apparatus is correct, tested, and
structurally silent until something asks the material for the void's own slot.
That is one clean, nameable piece of work, and it is not "another parser".

**Files.** `void-brief.js` gained `observedFillers`, the `observed` option,
the two-reader pooling (a being named by both is one filler, and the one
carrying a span wins), and the REC re-declaration; the brief carries
`reopened` and `declaredBefore`. `void-narration.js`'s `revisionPara` keys on
`reopened`; `namedPara` says the no-extent caveat once at the end instead of
after every name; `standingPara` reconciles `voidsOf`'s verbatim *"filled by
nothing named so far"* against having just named two people, out of
`voidsOf`'s own `unplaced` — the reason still travels verbatim, the apparent
contradiction is resolved after it. `app.js` passes the turn's relation
claims through `observedFillers` at the third moment, where they first exist.

**Evidence.** `void-narration.test.mjs` 21 → 29 cases (the declaration
actually revising, REC's cell filled, no-REC when one filler, no-REC when the
question already asked for many, `observedFillers` matching / not matching /
refusing a tie / ignoring a single-filler slot, the two-reader pooling, and a
relation-only REC with extents disclosed unread). Full suite 1316/1318 — the
same 2 pre-existing failures, zero regressions.

### Generalization, tested on a net-new problem (amended same day)

**User direction:** *"keep testing e2e on net new difficult problem."* Every
part of this policy had been driven against ONE question — "Who was Abraham
Lincoln's vice president?" — so the standing risk was that it was tuned to a
specimen rather than built to a shape. Driving **"Who was the lead singer of
Van Halen?"** live exposed three defects, two now fixed and one named.

**Chosen for structural difficulty, not novelty.** Same singular grammar as
the flagship, but three fillers and — the part that should have broken the
interval model — RE-ENTRANT spans: Roth 1974-85, Hagar 1985-96, Cherone
1996-99, then **Roth again** 2006-20.

**The arithmetic passed, and that is worth recording.** `fill` is append-only
and its own header already anticipated this ("a filler is never overwritten
by a later one that happens to share its name"), so Roth's two tenures merge
into two covered intervals with a real gap at 1999-2006 — which is a TRUE
POSITIVE, the band's actual hiatus. Nothing in `voidsOf` needed changing.

**Defect 1: a determiner was being used as an anchor.** English binds a slot
to its anchor two ordinary ways and only one is possessive. On this question
`possessorIn` correctly found nothing and the fallback took `shape.marker` —
the DEFINITE ARTICLE `declaredSlotShape` scanned back to. Live result:
`SIG anchor = "the"`, `NUL slot = "lead singer of the"`, and every downstream
reader worked off that. `ofObjectIn` reads the "of" phrase's named object
(the preposition is the signal, a received closed-class word exactly as `'s`
is in `possessorIn`; capitalisation only decides how far RIGHT the name
runs), and `namesSomething` refuses a bare determiner outright — **having no
anchor is strictly better than having "the"**, since the slot then reads
"lead singer" (true, if unbound) rather than "lead singer of the"
(meaningless). Live after: `anchor = "Van Halen"`, `slot = "lead singer of
Van Halen"`.

**Defect 2: the extent gate was the Lincoln question wearing a regex.**
`extentFor` admitted a sentence only if it matched
`president|presidency|term|served|office|administration`. Measured: "the lead
singer of Van Halen", "chief executive of Apple" and "who played James Bond"
ALL read NO extent, while the one shape it was written against read fine.
This is precisely the disease this repo already caught in succession.js
("all of this is designed to solve this one problem when what we need is a
universal system for answering any question") — caught there, missed here,
one file over. The general form costs nothing and was already in hand: the
slot's own HEAD PHRASE, out of the question the person asked. That is
READING-POLICY's "retrieval is a function of the question's own words", not a
domain vocabulary this file guesses. The LIFE exclusion stays and stays
small, because it EXCLUDES rather than admits — its narrowness can only cost
recall, never manufacture an extent — and the lifespan trap is pinned.

**Defect 2b, found the same way: both gates were running per SENTENCE.** A
page names its subject in the title and first line and says "the band" for
the rest, so the sentence actually carrying the span almost never repeats the
anchor. **The anchor scopes the DOCUMENT; the head phrase matches the
SENTENCE.** A page about Queen still does not donate its span to a Van Halen
question — pinned both ways.

**Defect 3 fixed itself, which is the tell that Defect 1 was upstream.** The
first live run also fired a FALSE REC: `observedFillers` matched a junk slot
on the shared word "singer" and reported "the material binds two to it" over
two noun-phrase fragments. Once the slot phrase was correct, the shared-word
guard stopped matching it. No separate fix.

**THE CONTROL, and the worst defect of the pass.** Every question driven
until now had genuinely multiple fillers, so the apparatus had never once
been asked to stay QUIET. **"What is the capital of Brazil?"** — one clean
answer, no hole — read its extent as **1572-1578**, an arbitrary six-year
window out of Brazilian colonial history, on ONE mention against FIVE
competing readings, and declared a hole across it. The narration said the
evidence was worthless in the same breath as relying on it: *"One statements
put it there, against five competing readings."* **A false hole on a
question that has none is the apparatus manufacturing the very thing it
exists to detect** — strictly worse than reading no extent at all.

`extentFor` had always COMPUTED `margin` and its own docstring had always
said why ("'1861-1865 stated 11 times against a runner-up stated 3' and 'two
spans tied at 1' are different facts and a caller must be able to tell them
apart"). No caller ever told them apart. `briefFor` took `found.extent`
whatever the margin.

The floor is 1 and it is STRUCTURAL, not tuned: **a vote whose winner is not
stated strictly more often than its runner-up has not chosen.** Nothing is
fitted to a specimen — the identical rule independently kills the Van Halen
false hole below (that winning span also tied), and keeps every true positive
measured across four unrelated domains (Lincoln 3×, Apple, James Bond, the
document-scoped Van Halen read). A refused extent is REPORTED, never silent:
`refused: {type: "no_dominant_span", candidates}` rides the evidence, and the
reasoning says *"The material offers six different spans for it … and none of
them leads the rest. So I will not treat any of them as the shape: a span
picked out of a tie would let me report a hole that is really just my own
arbitrary choice of edges."* Live after: panel `unbounded`, SEG `UNDECLARED`,
no hole.

Same pass, same live output: `"One statements put it there"` — the plural
agreement was keyed to the number of RIVAL READINGS rather than to the count
of statements it was agreeing with. Fixed and pinned.

**THE REMAINING DEFECT, named and NOT fixed here: the extent vote confuses a
FILLER's span with the SLOT's.** Live, the void read the extent as 1974-1985
— David Lee Roth's first tenure — and then reported a hole across exactly
that, an extent Roth in fact filled completely. **A false hole, which is
worse than no extent at all.** The cause is that `extentFor` takes the MODE
of the stated spans, and a page about a slot restates its most-discussed
filler's tenure far more often than the container's own span (measured: 3
statements for Roth's 1974-1985 against 1 for the band's 1974-2020). Lincoln
never exposed it because a president's term and the vice-presidency's extent
coincide exactly; Van Halen exposes it because the band outlived every one of
its singers.

The mode is simply the wrong statistic for an extent — a container's extent
is closer to the HULL of what it contains than to the most-repeated span
inside it. A naive switch to the hull is not the fix either: one stray span
would widen the space and manufacture holes at both ends. This needs a real
design (and, by this repo's own standing rule, a null before any number is
trusted), so it is recorded rather than patched at the end of a long pass.

**Evidence.** `void-narration.test.mjs` 29 → 39 cases, the ten new ones
pinning generalization and the control: the "of X" anchor, both binding shapes plus the
lowercase refusal, the head-phrase extent gate across three unrelated
domains, document-scoping vs sentence-matching (with the Queen
cross-contamination control), the lifespan trap, the refused tie on both
measured false positives, the three true positives that must survive it, the
refused-reads-as-ambiguity-never-silence case, and count agreement. Full
suite 1316/1318 — the same 2 pre-existing failures, zero regressions. Both
net-new questions driven live end to end on the real page against the real
model with real fetched material.

### The wh- generalization — mechanical, giver-cited, no model call (amended same day)

**The screenshot that started this.** *"who was in van halen?"* opened NO
slot at all — the void declared nothing, and the follow-up *"who were
they?"* answered from an unrelated part of the material. Diagnosed as two
compounding causes: the question is fully lowercase (every anchor extractor
required a capitalised run) and it is a wh-question with NO determiner and
NO possessive (`declaredSlotShape` had exactly one trigger shape — "the X
of/'s Y" — and this question has neither).

**Two user corrections, both binding, both followed.** First: *"i dont want
'wh-' questions to be hard coded, it needs to be omnilingual."* Then, mid-
build, catching a wrong turn before it shipped: *"any model call should be
about creating surf query content, not structure the slots."* A schema-
constrained LLM proposal was tested directly against the real running model
first (see below) and abandoned on the second instruction, not on its own
measured results — which were mixed anyway.

**What was tried and refused: an LLM proposing the slot's structure.**
Tested live against gemma2:2b with a schema forcing `{opens_slot,
head_phrase, anchor}` — deliberately structure-only, never an answer. It
worked for cardinality (`opens_slot` correct 10/10) but consistently filled
`anchor` with the *answer* it happened to know (Andrew Johnson, Brasília,
David Lee Roth) rather than the entity the question depends on — the exact
"model is only the mouth" violation testimony.js's own header already
documents for a different tier. This is not a prompt-engineering gap to
iterate past; it is why the user's second correction is right: the model
has no business deciding what the void's own structure is, only ever
composing search text from a structure physics already declared.

**What shipped: fully mechanical, traced to giver-cited closed classes or
the received POS prior — zero model calls anywhere in this path.**

1. **`INTERROGATIVE_PRONOUNS`** (priors.js, new) — who/whom/whose/what/
   which/where/when, each mapped to the entity type it implicitly seeks
   ("who" → person) — a lexicographic fact any dictionary states, not an
   invented ontology. Same standing as DEFINITE_DETERMINERS/NEGATION_WORDS:
   giver "lang/en", disclosed, and — this is the actual omnilingual claim —
   the MECHANISM (a closed-class trigger read from a shared register) is
   what generalizes; a second language's own class is a DATA change in
   priors.js, never a code change in web-claim.js.
2. **`MANNER_REASON_PRONOUNS`** (priors.js, new) — how/why, kept SEPARATE
   after a live measurement: lumping them into the entity-seeking class
   made "How does photosynthesis work?" wrongly open a slot. There is
   nothing to zero a void against for a manner or a reason.
3. **`declaredSlotShape` gained Path 2** — an interrogative pronoun with an
   ELIDED head noun ("who was in Van Halen" has no written noun at all;
   "person" is implied by the pronoun itself). Path 1 (determiner/
   possessive) is checked first and still wins when a real noun is written;
   Path 2 only fires when Path 1 found nothing.
4. **Anchor recovery generalized past a single hardcoded "of".** The object
   of ANY adposition (in/for/at/with/…) is recovered via the received POS
   prior's ADP tag (`classifyWord`/`dominantClass`, already mounted for
   hypergraph.js's own posPriorFor) — one classifier call replaces what
   would otherwise be a second hand-typed preposition list. Shared by BOTH
   paths, so "the lead singer OF Van Halen" and "who was IN Van Halen"
   recover their anchor through one mechanism.
5. **Capitalisation dropped as an extraction REQUIREMENT everywhere in this
   path.** Extraction is case-insensitive throughout (L2: capitalisation is
   a differentiator, never the primary signal); confirming a candidate
   against real material stays the caller's job, never a gate on whether
   the candidate is even considered.

**Three real, PRE-EXISTING bugs found and fixed along the way, none
introduced by this pass.** (a) The possessive check (`/['’]s$/`) never
distinguished genitive 's ("Lincoln's") from a contraction of "is"/"has"
("that's" = "that is") — "Thanks, that's helpful." opened a slot with
headPhrase "helpful". English pronouns never take genitive 's at all (their
possessives are distinct words — "its", "his", "whose"), so an 's-marked
token whose base is already a pronoun is a contraction; the base check
reuses ANAPHORIC_PRONOUNS (which already lists "it's"/"that's"/"this's")
plus THIRD_PERSON_SINGULAR's own keys (deriving "he's"/"she's" from
received data rather than a third hand list). (b) The manner/reason
refusal, checked only inside the interrogative path, let "Why did the war
start?" open a slot anyway via the determiner path finding "the war" —
fixed by checking manner/reason FIRST, unconditionally. (c) The `namesSomething`
fallback (used only when neither a possessive nor an adposition anchor was
found) let an interrogative pronoun stand in as its own anchor — "who was
in Van Halen?" with no `isAdposition` reaching an anchor fell through to
`shape.marker`, which for Path 2 IS the pronoun itself, producing `slot:
"person of who"`. Fixed without a fourth word list: `grammaticalNumber` is
`undefined` if-and-only-if a shape came from Path 2 (Path 1 always sets
"plural"/"singular"), so a Path-2 marker never reaches the name-fallback at
all.

**A fourth bug, caught only by actually running it against the real page**
(the user's own standing instruction: "test to see what works and chase
the output"). The slot's own display connective was hardcoded to "of"
regardless of the real relation `declaredSlotShape` had already read — so
"who was in Van Halen" displayed as "person OF Van Halen," the wrong
paraphrase of a relation already read correctly. Fixed by carrying the
real preposition through as `anchorPreposition`. Fixing that surfaced a
FIFTH, this one only visible in the narration's own prose: `openingPara`
tried to recover the head phrase by string-matching `slot.endsWith(" of "
+ anchor)` — the identical hardcoded-"of" mistake, in a second place — so
on "person in Van Halen" the match failed and the paragraph stated the
anchor twice with two different connectives in one sentence ("...ties that
to van halen. So what has to be filled is the person in van halen OF van
halen"). Fixed by carrying `headPhrase`/`connective` as their own fields on
the brief rather than ever re-splitting a string a caller already has both
halves of.

**Live end to end, both the fixed case and the honest degradation.** "who
was in van halen?" now declares `slot: "person in van halen"`,
`anchor: "van halen"`, reasoning stating it once, correctly. The unrelated
follow-up "who were they?" (anaphora — out of scope, disclosed, not
chased) opens a slot ("person"), correctly finds NO anchor, and the panel
honestly reports `SIG anchor — UNDECLARED` with "who or what it hangs on"
listed among the open questions — no crash, no guessed anchor, the exact
degradation this repo's whole discipline asks for.

**Files.** `priors.js` (engine, `eoreader7/legacy-eoreader6.1`): two new
closed classes. `web-claim.js`: `declaredSlotShape` gained Path 2, the
contraction fix, the manner/reason gate, ADP-based anchor recovery, and the
`anchorHint`/`anchorPreposition` return fields. `void-brief.js`: the
`connective` computation, `headPhrase`/`connective` carried on the brief,
the `namesSomething` guard fix. `void-narration.js`: `openingPara` reads
the carried fields instead of re-splitting. `app.js`: `wordclass.js`
imported (new, disclosed in `eoreader-contract.json`), `isAdposition` built
off the already-loaded `posPriorCache`, all four new injections threaded
through `voidBriefFor`. `web-hunt.js`/`web-hunt.test.mjs`/
`eval/web-snip-eval.mjs`: the same two new classes threaded through their
own, independent `declaredSlotShape` call site (found by running the full
suite, not assumed complete after the primary call sites were done).

**Evidence.** `web-claim.test.mjs` rewritten: 5 → 12 cases, including one
explicit REVISION of a prior test that had pinned the very defect this pass
closes ("who served under him" used to assert `headPhrase: null` under the
title "no definite marker at all is unknown" — that was the bug, not a
fact worth preserving). `void-narration.test.mjs` gained 6 cases, two of
them pinning bugs found only by driving the real page. Full suite
1335/1337 — the same 2 pre-existing failures this repo already carries,
zero regressions, confirmed after every fix including the two additional
call sites the first full-suite run surfaced.

---

## P55 — Apparatus vocabulary is not model-facing: the firewall between the talking and the thinking

**User direction, verbatim (2026-08-27):** *"create a much firmer firewall of
the talking vs the thinking."*

### The incident

Five live runs of "Who was Abraham Lincoln's vice president?" against real
fetched Wikipedia and gemma2:2b produced, among others:

> "The prompt specifically identifies Hannibal Hamlin as Lincoln's vice president."
> "The prompt confirms that the vice president was Hannibal Hamlin…"
> "The prompt does not specify which point in his presidency should be addressed,
> but the provided material focuses on…"

The model was not answering the question. It was describing its own input —
and it learned the words to do that from us. Dumping the real prompt showed
`EXECUTE_SYSTEM_PROMPT` containing the literal phrase "the prompt" TWICE,
`FLAT_EXECUTE_SYSTEM_PROMPT` naming "the passages" three times (twice while
instructing the model not to mention them), `CHAT_SYSTEM_PROMPT` reporting a
retrieval outcome to the model ("matched no document to cite"), and
`buildFactBlock` carrying its own engineering commentary into a 2B model's
context: *"(7 of 97 sentence(s) with an extractable relation; the passages
above are the complete record, this list is a partial aid, not a substitute
for them)"*.

### The rule

**Counts, coverage, retrieval outcomes, the names of this instrument's own
parts, and every caveat about how a list was built belong to the THINKING —
the reasoning trace and the disclosure panels, where a reader can see them —
and never to the TALKING, which is the model's own answer to a person.**

This is L5, not a style preference. Every one of those strings ALSO instructed
the model not to do the thing ("do not describe the message or the passages").
A compliance-critical fact is never left to the model's own instruction-
following, and telling a model not to mention the passages while naming them
three times is that failure in its purest form. The mechanical fix is to not
have the vocabulary in the room.

It is also the SAME bug holon.js:479-492 already fixed once, one layer up:
"Write this part: the question. research Robert Macnamera" produced "This
prompt asks you to research Robert McNamara…", and the note there states the
general form — *prompt format matches output format; fed a description of the
task, a small model answers with a description of the task.* That fix was
applied to the TASK framing and never to the MATERIAL framing. P55 closes the
rest of it.

### A wall, not a habit

A fix applied by hand to six strings is a fix that regresses the next time a
seventh is written. `firewall.js` declares `APPARATUS_TERMS` (a closed class:
prompt, passage, material, document, source material, search result,
retrieved, extractable relation, chunk, citation, this turn, the record,
mechanically confirmed) and `assertModelFacing(named)`; `firewall.test.mjs`
runs it against the REAL exported prompt constants imported from holon.js and
the REAL output of `buildFactBlock`. A newly written prompt that explains the
machinery fails the suite rather than shipping and being found weeks later in
an answer. Same shape as constitution.test.mjs's II.13 host scan: checked
against what the app actually loads, never a list someone must remember.

### What must survive the wall, and did

**The void keeps its force.** `buildFactBlock`'s empty case exists because a
SILENT absence is what a model fills from memory — measured: "who was
lincoln's vp?" once returned "William R. Hargis", a person who does not
exist. The rewritten void still states the emptiness and still forbids filling
it; it just no longer describes the extractor that found it. Pinned as its own
regression.

**The counts left the prompt and did NOT leave the instrument.** `coverage`,
`sentenceCount`, `boundSentenceCount` and `omitted` are returned as fields for
the disclosure panel. Moving bookkeeping is not deleting it — pinned both ways.

### Evidence

`firewall.test.mjs` 10/10. Four `fact-block.test.mjs` cases were REVISED
rather than widened — each had encoded the apparatus text as its own
expectation ("the coverage disclosure must state a real fraction, e.g. 'N of
M'") and now assert the new real boundary: the count exists as data, and no
longer rides into the model's context. Full suite 1381 tests / 1378 passing,
the same 3 pre-existing failures this repo carries, zero regressions.

---

## P56 — Identity comes from a giver; the chain of custody is kept even though the model never sees it

**User direction, verbatim (2026-08-27), across the session that produced
this:** *"we should be able to digest a bunch of stuff about lincoln… in the
hypergraph, there should be a related entity 'vice president.' what it should
find is actually 2 people"*; *"why are you rewriting sentences? you should
just be connecting the referents as a revisable assertion"*; *"they should
carry the exact bytes that produced them if we're doing the hypergraph
right"*; *"'verb' is a particular type of slot fillage"*; *"words can be
multiple POS, it is contextual"*; *"let's follow assertions of wikipedia down
to the source material and find the bytes it appears to be citing, when the
full chain of custody preserved (this doesn't all get fed to the model)"*;
*"and ideally we've saved those sources to archive.org for a stable
snapshot"*.

**This policy is written while the work is PARTLY built, at the user's own
direction — "its the right shape even if we haven't gotten 100% of the way
there yet." Each section below states plainly whether it is shipped, built
but unwired, or absent. Nothing here should be read as a claim that the whole
chain runs today.**

### The measured verdict on the string tier (SHIPPED as a measurement)

Digesting the three real pages the live app fetched (161k/182k/56k chars):
2,298 SVO edges. Thirteen mention a vice presidency. Querying that slot for
its subjects returns **one** endpoint, whose surfaces are `it failed`,
`Trefousse believes`, `Another factor`, `as Seward`. The failure is uniform
and it is not a vocabulary gap: the LABEL slot is filled by non-verbs —
`—on→`, `—that→`, `—the→`, `—and→`, `—biographer→`, `—vice→`.

The user's framing is the correct one and eoreader7's kernel had already
conceded it in `relation-composition.js`: *"AN ARRANGEMENT HAS ENDS, NOT PARTS
OF SPEECH… ends are taken by ORDINAL POSITION… `role` remains free
caller-declared annotation the kernel never interprets."* "Verb" is what an
English-SVO adapter happens to write in the middle slot. A tier that reads
SLOT can never answer a question about IDENTITY.

### Identity comes from a giver (SHIPPED: `wikidata.js`, 11 tests)

`wikidata.js` is pure — no fetch anywhere in it, the wall `web.js`,
`github.js`, `links.js` and `wheels.js` already stand behind. Against real
captured `Special:EntityData` fixtures:

| referent | P31 | holds Q11699 | start | end | replaces | replacedBy |
|---|---|---|---|---|---|---|
| Hamlin `Q273546` | Q5 human | yes | 1861-03-04 | 1865-03-04 | Q273212 | **Q8612** |
| Johnson `Q8612` | Q5 human | yes | 1865-03-04 | 1865-04-15 | **Q273546** | Q310852 |
| the office `Q11699` | office/position | — | — | — | — | — |

Two people, typed `human` by a claim rather than a heuristic; the office
correctly holds nothing. **The chain closes MUTUALLY BY IDENTITY** — Hamlin's
`replacedBy` IS Johnson's qid and Johnson's `replaces` IS Hamlin's — which
closes the weakness `chains.test.mjs` discloses about bidirectional substring
matching, whose own stated fix was "a referent index." This is that index.
Records are `chains.js`-shaped and fed to the existing generic `chainFillers`
with `matches` as exact equality; no second chain walker was written.

**Independent corroboration, worth keeping:** those term dates match what
`succession.js`'s own precise-date reader extracted from a Wikipedia infobox
in the same session, arrived at separately. Two givers agreeing is what the
testimony apparatus exists to notice.

### Two refusals, both measured (SHIPPED)

**A short description is not an entity type.** Wikipedia's summary API
describes Andrew Johnson as *"President of the United States from 1865 to
1869"* — his most notable office, not the one being asked about, and the SAME
conflation the unaided model made. `wikidata.js` reads P31/P39 typed claims
with qualifiers and never the editorial blurb.

**A part of speech is a candidate set, never a per-occurrence verdict.** The
Wiktionary REST face gives a term's possible parts of speech from a named
giver, and the data proves the user's correction: `and` genuinely carries a
Verb sense, so it can never be refused on type. But `the`, `biographer` and
`vice_president` carry NO verb sense at all, so refusing those as arrangement
labels is sound and giver-backed. **Asymmetric use only** — a term with no
such sense is refused; a term with one stays a candidate to be resolved in
context. Anything stronger is the type-level collapse this repo's own
`roles.js` work already argued against: *"a surface span is never the thing
with a part of speech — the referent is."* Fixtures captured; module not built.

### Every edge carries the bytes that made it (SHIPPED)

Extraction moved from per-passage to per-sentence using `splitSentences`'s own
`offset`; each edge carries `spans: [{ref, start, end, text}]`, carried
through `edgeFace` (which dropped it at first — measured 0/2,298 before that
was fixed). **2,584/2,584 spans self-verify** against the real bytes, which is
P5.2's mandatory standard applied to the one tier that had been exempt from
it. Measured side effect: per-passage found 2,314 edges and per-sentence
2,289 — 48 lost, every sampled one cross-boundary garbage carrying a literal
newline in the subject (`1869\n\n17th —president→ of`), i.e. the P38
infobox-gluing class killed structurally rather than by widening
`blankFurniture` again; 23 gained, real.

**Named and NOT done:** `resolvePronounSubjects` still REWRITES text
(`out.slice(0, b.offset) + name + out.slice(end)`). That rewrite is why
addressing the original bytes needed a sentence-pairing step at all. The
correct shape is `relation-composition.js`'s: an `{occurrence → referent}`
binding held BESIDE immutable edges, with the projection recomputed when a
binding arrives (`endpointOf` / `rememberBinding` / `activate(edge, {replace:
true})`), and `identity.js::deriveIdentityRevision` as the ready-made
support/attack grammar that makes such a binding revisable. Disclosed hazard
for whoever builds it: `EOPronounBinding@1` is consumed in three kernel files
and **produced nowhere**, so the-fold would be its first producer, uncovered
by any eoreader7 test.

### The chain of custody (BUILT, ROUTED, UNWIRED — the honest state)

`primary.js` already states this policy's ambition in its own header: a claim
is taken THROUGH a saved Wikipedia page to the sources that page itself cites,
and judged against THOSE faces, *"each supporting passage carried verbatim
with its char offsets into the saved bytes… the assertion of record is the
snip, an address into a content-addressed face, never the article's own
paraphrase."*

It works. Driven live against the real saved Andrew Johnson page (1,265,503
bytes on disk): **95 citations extracted, 95 of 95 off-family** (real outside
sources, not navigation), classified into the declared ladder — 23
archive-library-museum, 21 dated-document, 11 government, 4 academic, 4
pdf-document, 1 identifier, 31 other. Ranking is claim-word overlap first,
then the class ladder, then the article's own citation order — no tuned
domain weights survive (P4/P9).

**But `app.js` imports only `snipClaim`.** `extractCitations`, `rankPrimary`,
`classifyCitation` and `foldPrimary` have no call site, and nothing in the
client ever calls `/api/web/primary`, though the route exists on
explore-server.mjs. The walk is built and not taken.

### Archive.org is the weakest link, and it is named rather than implied

The apparatus exists — `archivePage` + `verifySnapshot`, which re-fetches the
named snapshot and reads it with the SAME `looksLikeChallenge` /
`extractReadable` organs any page gets, so only a snapshot that resolves to
real content is marked `saved`. The coverage does not: across **1,598 saved
pages, 4 are `saved`, 5 `pending`, 1 `failed`, and 1,588 carry no archive
state at all.** A chain of custody whose final link is unarchived is a chain
that can rot. Raising that coverage — at minimum for pages a primary walk
actually consults — is real, named, unstarted work.

### The rule this policy fixes, whatever gets built next

### Amended 2026-08-28 — the giver's storage format is not a rendering, and the restatement never ran on the questions it existed for

Two fixes, both found by driving the live page.

**Dates.** `renderHolders` printed the giver's own timestamp straight through:
*"Hannibal Hamlin (1861-03-04 to 1865-03-04)"*. `dayOf` now renders
`March 4, 1861` — the same shape `succession.js` independently reads out of
infobox prose, so this is also two givers agreeing on the page rather than one
of them speaking in storage format. Each grain is said at its own grain: a
zeroed month is the bare year, a known month with an unknown day is
`March 1834`, never rounded down and never invented up. The SAME formatter now
builds the fillers handed to the model, because a 2B model given `1861-03-04`
writes `1861-03-04` back.

**The query restatement never ran on a shapeless question.** The seek gate
computed `who.toLowerCase() !== anchorTerm.toLowerCase()` where `anchorTerm`
is null whenever the question carries no possessive — so it threw, the throw
landed in the catch, and the ONE turn the restatement exists for was the one
turn it never ran on. *"who was the 23rd president?"* reached the ordinary
pipeline ungrounded every time. Null-safe now, and the P41 skip disclosure
moved to AFTER the restatement has had its turn — announcing the skip up front
described a state the rewrite was about to change.

**The custody ledger is provenance, not prompt material.** The user's own
parenthesis is binding: *"this doesn't all get fed to the model."* Every link
in the chain — qids, citation classes, snapshot addresses, char offsets — is
kept so a reader (or a later check) can walk it, and P55 governs what may
reach the model, which is the answer's content and nothing about the machine
that found it. Richer provenance must never become a bigger prompt; the
measured record in this repo is unanimous that additions to the model's
context lose, while additions to the mechanical tier win.

---

## P57 — Read content is an EOT event stream, admitted at a door; the reading is a projection

**User direction, verbatim (2026-08-28), said while looking at a live prompt
dump:** *"all content should be converted into EOT and folded for the
hyperlexicon. see here its just giving the model raw spans from the sources,
right?"*

Yes. And the measurement is worse than the dump alone shows.

### What was actually happening

Asked *"who was Queen Victoria's prime minister?"*, the app fetched two real
pages, retrieved three passages, and handed the model eight "notes" plus nine
raw source sentences. The notes were SVO edges re-extracted from those
passages on the spot and discarded at the end of the turn. Reproduced offline
against the same bytes, the extractor's ten edges were:

```
Queen Victoria —reigned→ for over 60 years
and —in→ that time had to get along with many politicians
the Victorian —era's→ hallmark industrialization
Robert Peel —is→ considered one of the most important Prime Ministers
Prime Minsters —of→ them all
complete list —is→ given above
with Peel —went→ well
young Victoria —ascended→ to the throne in 1837
and Melbourne —developed→ a close relationship
new queen —in→ government and politics
```

**Not one names a prime minister of Queen Victoria.** The sentence that
answers the question — *"The Ten Victorian Prime Ministers Under Queen
Victoria Robert Peel (1834-1835; 1841-1846)"* — yielded zero edges and
reached the model only as raw text. So the model did the reading, and read
the first name out of a list of ten: *"Queen Victoria's prime minister was
Robert Peel."*

Two defects, both visible in that one turn. **Nothing accumulated** — the same
bytes are re-read every turn and a second page's agreement with the first is
never noticed. **Nothing was admitted** — `and —in→`, `complete list —is→
given above` and `the Victorian —era's→` entered the model's context with
exactly the standing a real assertion has.

### The rule

**Content read from the world is admitted as EOT and projected, never
re-derived per turn and never handed over raw as the load-bearing material.**
`hyperlexicon.js` is `store.js` one register over, and that module's own
load-bearing line governs both: *"the reality of the database should be the
EOT event stream, the current state always projected."* A first sighting is
`INS · Figure · produced`; a later sighting of the same assertion is
`SUPERSEDE · SYN`, carrying only what changed — the witnesses and the spans,
UNIONED, never replaced. Two pages stating the same thing become **one note
with two witnesses**, not two notes. `foldHyperlexicon` is the projection,
ranked by corroboration so a cut for room drops the least witnessed;
rebuildability from the entries alone is pinned by replay.

That corroboration is the point, not a side effect: a fact already heard costs
nothing to hear again, and the budget it frees is what should go to what is
genuinely new — P30, aimed at reading.

### Admission is a door, not a funnel

`admit` returns what it took AND what it turned away, each refusal typed, and
`turnedAway` is not optional — a caller reading only `heard` still cannot
mistake a refusal for an absence. Three typed refusals: `not_a_verb`,
`incomplete`, `unaddressed` (P5.2 at the door — an assertion with no bytes
behind it cannot be defeated by its own source, which is the whole standing a
defeasible note has).

This finally wires `grammar-lens.js`, which had been built and left unwired.
Its use is **asymmetric, per P56**: a connector that *settles* as a non-verb
against a named prior is refused with its giver on the refusal; an
out-of-vocabulary word is a gap in the prior, never a fact about the word, and
admits. On the specimen it turns away exactly `and —in→`, `Prime Minsters
—of→`, `new queen —in→` and touches nothing else.

**No lens means no check, and no check never reports a pass (P41).** With no
`classifyConnector` injected, the verb-hood check does not run and nothing is
refused for it — stated as a real difference, never a silent default.

### Two bugs worth not re-making

**`VERB_CLASS` is a literal that is CHECKED.** Written `"Verb"`, it matched
nothing in `THRAX_MAP` (whose labels are lowercase), so `went`, `developed`
and `is` — three real verbs — were all turned away while the prepositions the
gate exists for got through on the same mistake. A capitalisation slip in a
comparison against another module's vocabulary fails silently and in the
safe-looking direction; the test now asserts the string is in that map.

**`append` returns a NEW log.** The first `admit` called `hear` against the
same original log ten times and discarded every result — reporting ten
successes and landing nothing. A write that reports success and lands nothing
is the worst shape a door can have, so the accumulated log comes back as the
first field of the result and there is no way to read the outcome without it.
Pinned: what `admit` reports as heard is what the returned log holds.

### The disclosed residue, pinned rather than claimed as solved

The door catches connectors. It cannot catch an assertion whose connector is a
perfectly good verb and whose SUBJECT is page furniture: `complete list is
given above`, `the Victorian era's …` and `with Peel went well` all survive,
and the test says so. **Admission removes three junk notes and does not put a
prime minister in the fold** — the only dated assertion that survives is
Victoria's own accession, and eight of the ten prime ministers the material
names never become a subject at all. A cleaner reading of a reading that
missed the answer is still a reading that missed it. That gap is upstream, and
it is P58.

**Files.** `hyperlexicon.js` + `hyperlexicon.test.mjs` (12 cases, against the
REAL task-log and the REAL UD treebank prior, over the ten edges the real
extractor produced on the real page). Not yet called from `app.js` —
disclosed, not implied done.

---

## P58 — The cube classifies MOVES, not content; a grain gap floors where a vocabulary gap degrades

**User direction, verbatim (2026-08-28):** *"go upstream"*; then, on the first
attempt to reach for the cube, the correction that made this policy possible —
*"it can classify all possible moves tho"*.

### The distinction this rests on

The cube may **not** be asked what a piece of text IS. `operators.js` records
that 95.7% of cell assignments survived shuffling the words inside 2,527
paragraphs, so a terrain derived from content is noise wearing a name — this
repo's oldest standing refusal. What the cube CAN do is enumerate the **moves**:
operator × grain is a closed, complete space of acts, and asking *"which of
these do I have an organ for"* is a question about this codebase, never about
the material. `moves.js` reads a byte of no document.

### The computed diagnosis

Nine operators × three grains = 27 cells, terrain DERIVED as
`TERRAIN_BY_DOMAIN[domainOf(op)][grain]` so it can never be chosen. Against the
real capacity registry:

```
CON·Figure   Link      relations     ← the SVO extractor we have
CON·Pattern  Network   — empty       ← the cell the list needs
```

`neighbours("CON·Pattern")` reports `sameActOtherGrain: ["CON·Figure"]` — the
same act, one grain finer, already occupied. **This instrument occupies 9 of
27 moves.**

### The rule

**A grain mismatch floors at zero; a vocabulary gap degrades. Measure which
before spending another configuration on vocabulary.** `relations` reads one
labelled edge between two ends. A record block —

```
William Lamb The Viscount Melbourne
20 June 1837 – 30 August 1841
```

— has no connector in any row, so a Figure-grain organ returns zero on it
correctly and permanently, however wide its vocabulary grows. The prediction
is falsifiable and was checked against the exact bytes the Pattern-grain organ
binds: **0 edges, not few.** This repo had already spent nine measured
vocabulary configurations against the neighbouring symptom
(`eval/results/mine-1-FINAL-COMPARISON.md`); none of them could ever have
touched this.

The empty cell is also the same hole CLAUDE.md's build-log accounting already
names from the other direction — *"CON (binding folds into systems) and the
Pattern grain … are the named remainder"*. Two independent walks, one hole.

### The organ

`network.js` occupies CON·Pattern: find a recurring arrangement, bind it.
Lines are typed by SHAPE through **injected** recognizers, so the refuted
content-classifier move is not available to it. Handed the whole 709-line
saved page it returns two systems and no noise — New Zealand's 15 premiers and
Britain's 10 prime ministers, every term, discontinuous service kept as
several extents (Gladstone's four ministries are four, never flattened into an
1868–1894 range nobody stated). 25/25 spans self-verify against source bytes.

**Two rules earned by running it, not designed.** *A cycle of one shape binds
nothing* — CON **relates**, and a run of like-typed lines relates nothing;
without this the page returned 39 "systems", 37 of them adjacent lines of one
kind. *An unrecognized line is a hole, never a wildcard* a pattern may cross.

**It does not name what binds the records.** The material shows they are
arranged alike; it never says "held this office". Inventing that here would be
the preset this repo already refused when it declined to write `P39` into
`wikidata.js`.

### The honest limit, disclosed rather than smoothed over

**The recognizers are still pre-established.** `extentShape` and
`surfaceShape` were chosen after looking at the page; had the block been
`name / party / constituency` the organ would find nothing and a party-shape
would have been written. The user named this directly — *"are you
pre-establishing how to parse the wiki or are you teaching it to fish?"* —
and the answer is that the binder fishes and the shapes were a fish handed to
it.

The route out is measured and unbuilt. A line's collapsed character-class
signature (`Aa Aa Aa` for a name, `9 Aa 9 . 9 Aa 9` for a date range) uses no
vocabulary at all, and similarity over it is periodic exactly where a record
block is: **lag 2 = 0.926 against lag 1 = 0.579 inside the block, flat
0.62/0.62/0.69 in prose on the same page, flat across the whole page.** Shapes
can therefore be INDUCED from periodicity rather than declared. That is a
measurement, not an implementation, and it needs its own null before it earns
a threshold.

**Files.** `moves.js` + `moves.test.mjs` (6 cases, real operators table, real
registry); `network.js` + `network.test.mjs` (8 cases, including the control
that measures the Link-grain organ at zero over the exact bound bytes, and a
changelog case proving the binder does not know it is reading offices).

---

## P59 — A sink is still learnable: the relation is learned from what points AT the slot

**User direction, verbatim (2026-08-28):** *"i am trying to move us into a
system where the hyperlexicon has enough context and intelligent navigation
that it can ACTUALLY answer it"*.

### What was missing

`seek.js` is already the navigation interface, and already source-independent
— its own suite drives it over a software release history with semver extents.
What it could not do was walk the hyperlexicon, and the reason was one
assumption in `learnRelation`: it reads things the slot **points at** and asks
which relation they use to point back.

A Wikidata office points at things. A slot built from a list read out of a
document does not: every member points at it and it points at nothing. So
`neighbours` returned `[]`, `examined` came back **0**, and the walk reported
`no_relation_learned` with the ten members sitting in the source unread.

### The rule

**A sink is not a source with no members.** `inbound(id)` — "who points at
this", with no relation named yet — is the same learn-by-example mechanism
asked in the direction the data actually goes. It is OPTIONAL and consulted
only when `neighbours` yields nothing, so every existing source behaves
byte-identically; a refused inbound read is a refusal, never an exhausted
source; and the result reports `via`, because *"learned from six things the
slot names"* and *"learned from six things that name the slot"* are different
evidence and a reader must be able to tell them apart.

### The walk, end to end, over what was read

```
resolve      "Queen Victoria" → ref:queen-victoria
             (passed over the list itself — holds nothing with a bounded extent)
specialize   sys:1=5  sys:0=4
learn        relation "listed-in", via: inbound
bindings     Melbourne · Peel · Russell · Derby · Aberdeen · Palmerston ·
             Disraeli · Gladstone · Salisbury · Rosebery, in order, with terms
```

No model read a span.

**Two lists on one page, and neither the arrangement nor the slot's own words
tell them apart.** Collapsing the two bound systems gave a 25-member merged
list. The line directly above the UK block is `[ edit ]` — the rendering's own
furniture — and the repair is emphatically NOT a furniture filter, which is
the wiki-specific parsing P58's organ exists to avoid: a system carries a
window of its own preceding lines, each addressed, and which of them declares
what the block is about stays the caller's judgment. Nor does the slot's own
context settle it — both blocks say "prime minister", New Zealand's in as many
words. It is settled by the **anchor's** words: what the page says about
Victoria ("Queen of the United Kingdom") overlaps one block's context and not
the other. **A tie returns no narrowing rather than a guess.**

### Disclosed, and load-bearing for whatever wires this

`tiles=false, gaps=18`. Real handovers carry day-level gaps — Peel ends
1846-06-29, Russell starts 1846-06-30 — so the coverage gate refuses to call
the set closed and `renderHolders` would refuse to state it. That is the gate
working as designed, and closing it needs a real decision about what counts as
contiguous (a one-day gap between ministries is not a missing prime minister),
never a threshold picked to make this specimen pass.

The adapter that makes the hyperlexicon a `seek.js` source is a driver, not a
module, and nothing in `app.js` calls it.

**Files.** `seek.js` (`inbound`, `via`) + 3 new `seek.test.mjs` cases,
including a blind control proving the old path really did learn nothing from a
sink.


### Amended 2026-08-28 — wired: what we have read is the second giver

`read-source.js` presents `network.js`'s bound arrangements through the same
four questions `wikidata.js` answers, and `app.js`'s seek block calls it when
the published record gaps. **The gap is not the end of the walk; it is the
point at which the same questions get asked of what this instrument has
read.** The result is re-shaped to the route's own vocabulary so no consumer —
ranking by coverage, `renderHolders`, the fillers handed to the model — can
tell which giver answered, which is the point of one interface.

Measured over the live turn's own material: **20 bindings held by 10 people**,
all inside Victoria's reign, New Zealand's premiers correctly excluded by
`specialize`. The relation is LEARNED (`listed-in`, via `inbound`), never named
by the adapter — it knows only that these members are listed in that system,
and calling it "held office" would be a claim the arrangement never made.

**Three bugs, all found by running it.** The prose pass required a bound system
in the SAME passage, so the reign range — which arrives in a search-results
digest holding no record block at all — was skipped exactly where it mattered
and the anchor stayed unscoped; a dated name is dated in a DOCUMENT. A list
titled after the anchor matches the anchor's own words as strongly as the
anchor does, and `chooseAnchor` takes the first candidate with a bounded
extent, so documents now sort last and are never the thing being asked about.
And `seekBindings` dropped the relation's own address when building a binding —
custody now survives the walk, a qid for one giver and a byte range for
another.

**Disclosed:** a `[surface → extent]` arrangement is the only shape wired
today, because those are the recognizers `network.js` ships (P58's own limit).
And a question whose material holds no arrangement returns the typed
`no_arrangement` gap — a fact about the material, never a failure of the walk.


### Amended 2026-08-28 (second) — the shapes are INDUCED, and that is what reaches a corpus

**User direction, verbatim:** *"we need to prove it is reading from the corpus,
leveraging the terrains to be able to make conclusions it couldnt do with raw
content fed to it."*

The proof required closing this policy's own disclosed limit first, because
measured against a real corpus the declared shapes are not leverage:

```
883 pages · 25.9MB  →  8 bound systems
```

`periodicity.js` describes a line by its own characters, collapsed by Unicode
class — `Sir Robert Peel` is `Aa Aa Aa`, `20 June 1837 – 30 August 1841` is
`9 Aa 9 . 9 Aa 9` — and finds the period by measuring how much MORE alike lines
`p` apart are than adjacent ones. No months, no names, no dates, no language;
the same descriptions arise in any script sharing those categories.

**The null destroys ORDER and nothing else** — the same lines, the same shapes,
the same counts, shuffled. An arrangement is a fact about order, so that is the
only thing worth removing. Measured on one real page: the two record blocks
land **z 3.46 and 4.04, beaten by 3 of 400 draws**; the most structured prose on
the same page reaches z 1.86 and the least reaches z 0.13 at 182 of 400.

**The statistic had to be fixed before it separated anything, and the first
version is worth not re-making.** Scoring each null draw at ITS OWN best period
saturated uselessly — a real block ranked 0.990 and ordinary prose 0.955. Held
at the OBSERVED period, the same measurement separates cleanly. A null scored
against a moving target measures the search, not the finding.

**The comparison, the whole read corpus, same bytes, 277s:**

```
883 pages · 25.7MB

DECLARED shapes (two, hand-picked):       8 systems
INDUCED  shapes (no vocabulary):      4,992 regions on 537 pages
```

Eight against nearly five thousand, and 537 of 883 pages carry at least one
arrangement where the declared recognizers reached six. The declared shapes
were not a smaller version of the same reading; they were a different reading,
of two layouts, in a corpus made of hundreds.

And what induction reaches is the point, not the count:

```
p=4 z=5.21  Accession of Andrew Johnson as president  ⏎  3 years, 323 days
p=2 z=3.17  - 1888 (Chicago) : Harrison / Morton      ⏎  - 1892 (Minneapolis) : Harrison / Morton
p=4 z=3.12  James Knox Polk                           ⏎  George M. Dallas
```

An event and a DURATION; a convention and a ticket; a president and a vice
president. None is `name → date range`, so the declared recognizers were
structurally blind to every one of them — including the last, which is the
Lincoln question's own answer sitting in an arrangement nobody could see.

**The honest cost, reported rather than hidden.** Induction also finds page
furniture — `Sign in to view more content` / `Create your free account`,
`+ Follow` / `Rate this article`, `23 contributions` / `-`. Those regions are
genuinely periodic and the null is right about them. **Periodicity answers
where an arrangement IS; it does not answer what an arrangement is ABOUT**, and
conflating the two would be this repo's oldest refuted move in new clothes. The
second question belongs to the caller — `read-source.js` already settles it by
the anchor's own words, and a tie is not narrowed.

**No threshold lives in the module.** `beatenBy`, `draws`, `z` and `censored`
are reported; the eval driver declares `ALPHA = 0.01` — the null's own tail —
beside every finding, so moving it and seeing what changes costs nothing.

**Files.** `periodicity.js` + `periodicity.test.mjs` (7 cases, including the
real block against the real prose on the same page, and a check that the module
exposes no verdict). `eval/induced-arrangements.mjs`, re-runnable over the
whole corpus in ~5 minutes; `node eval/induced-arrangements.mjs 120` for a
slice.

**Named, unbuilt, and the obvious next step:** nothing yet feeds an induced
region back into `network.js`'s binder, so the 4,992 regions are LOCATED and
not yet BOUND — turning a found period into typed rows still runs through the
two declared recognizers. Closing that is what would let `read-source.js` walk
an arrangement nobody described in advance, which is the whole point of
inducing them.

## P60 — The physics and chemistry of the cube: priors compile once, chemistry is given, reasoning settles

> **Corrected in place 2026-08-28** (third amendment below carries the
> measurement). This policy originally claimed the reaction circuit *produces*
> never-stated facts. Measured against a naive transitive control, it produces
> them **with provenance and a refusal surface, and adds no reach** — an
> unlicensed 20-line join reaches every product it reaches, plus 14 more.
> **The circuit is a filter, not a generator.** The headline is corrected here
> rather than only amended below, because a false claim about the apparatus
> standing at the top of its own policy is the exact defect this system exists
> to prevent. What follows is the original text, unaltered, with its
> amendments appended in order.

**User direction, near-verbatim (2026-08-28):** *"figure out how to get the
fold and eoreader7 to leverage all the priors as well as possible, whether
it's predigesting or what, and running a true 'neural net' style thing so we
can 'mechanically' reason using the physics and chemistry of the cube."*

### The finding: the parts existed; the circuit did not

Every half of that sentence names an organ already built and tested, and
almost none of them could reach each other:

- **Priors, three tiers.** Received priors on disk with givers
  (ConstructionPrior@1, MorphologyPrior@1, UniMorph, the closed classes);
  sedimented experience (eoreader7's `experience-priors.js` — WHICH
  structures a reader has met — and `rhythm-priors.js` — WHEN a being
  returns — with merge-without-rescan built in, which IS predigestion's
  mechanism); and composition affordances (the kernel hyperlexicon:
  "experience may nominate candidates; only a GIVEN affordance with a named
  giver licenses composition"). But the engine's own `experienced-new-book`
  driver spends ~40 minutes sedimenting prior works and discards every
  prior at process exit — nothing PERSISTED.
- **Physics.** `kernel/activation.js` (P1's first clause — decay at a
  measured or declared window, never defaulted) and `terrain-activation.js`
  (presence spreads one hop, costs O(what a proposition touches)). Nothing
  GATED any reasoning on it.
- **Chemistry.** `relation-composition.js` (chains bond only at referent
  bridges; candidates nominated only at ≥2 independent witnesses, by
  bipartite matching) and `interpretation/declarations.js`
  (functional/transitive with givers; the grain theorem — a corpus refutes
  a Pattern-grain claim, never earns one). But composition was evaluated
  ONCE at a cursor: licensed products could never re-enter and chain, so
  hl.js's R6 (transitive composition) had no operational form.

### What shipped

**eoreader7 `native/kernel/reaction.js`** — the circuit, and only the
circuit: `createReactionSubstrate({ entries, hyperlexicon, window })` +
`cue` / `step({floor})` / `settle({cue, floor, maxSteps})`. A chain may
react only in contact with the present (any of its three atoms lit at the
caller's declared floor; `cue: null`+`floor: null` is the disclosed
ungated control, `window: null` activation's own undecayed control). A
GIVEN affordance may declare what a reaction YIELDS (`meta.yields`, carried
through the hyperlexicon's existing meta channel — no schema change
anywhere): with yields, the product is a real derived hyperedge that
re-enters the ledger and chains again — one bridge-hop per step, to
quiescence or a declared cap; without, a terminal bridge fact. A derived
edge's witness names its own derivation and its meta carries both parents,
the bridge, the giver, and its depth — the provenance closure walks to raw
witnessed edges (pinned by test). A derivation that would restate a RAW
witnessed fact is refused as `alreadyWitnessed`; a second path to an
already-derived fact is counted, never duplicated. Multi-hop reach is NOT
spreading activation — memory/activation.js's measured refusal of the
similarity flood is honored: the front moves only because a product lights
its own ends, and every hop is its own act. Plus `closureAffordances` (the
four-row table closing a non-transitive adjacency into its declared
transitive product), `affordancesFromDeclarations` (GIVEN transitive(r) ⇒
(r,r)→r under the declaration's own giver; candidates and functional yield
nothing), and `nominateFromExperience` (the cross-work gate extracted from
the driver into one tested implementation). 13 conformance cases against
the real organs; native suite 150/140/10 → 163/153/10, identical failure
names, zero regressions.

**the-fold `predigest.js`** — compile once, load forever:
`sedimentReading`/`compilePriors` (the engine organs injected, cast.js
pattern) produce `EOCompiledPriors@1` with its corpus manifest, its
received-priors INVENTORY (schema+giver+path, or a typed gap — never a
copy), and the engine's own standing triple untouched (compiling never
promotes); `loadCompiledPriors` refuses typed (wrong schema, no giver,
tampered half); `assertionEdges` projects the-fold hyperlexicon assertions
(P57) into the engine's edge shape with the witness as the assertion's own
byte address and endpoint identity DISCLOSED as the assertion log's own
(`identity: "assertion-log"` — the P30/P38 referent-model residue named on
every participant). 5 conformance cases including the full circle: fold
assertions → reaction substrate → a never-stated fact derived with
provenance to the fold's own addresses. Suite 992/865/125 → 997/870/125,
identical failure names.

### Measured (full evidence: eval/results/*)

`eval/predigest-priors.mjs`: **111 works** (handbook 44 + eo-wiki 67) read
and sedimented in **34.1s**, one-time, into a 174KB standing artifact;
`live_priors` a typed gap; POSPrior@1 a named absence. The recurrent
vocabulary honestly leads with prepositions — the known no-POS-prior cost,
recorded faithfully because nomination is not licensing.

`eval/mechanical-reasoning.mjs`, over the three committed Wikidata
fixtures, no model call anywhere: 26 facts byte-addressed and
self-verified; admitted through P57's door to 25 notes with the
cross-fixture repeat FOLDED (one note, two witnesses, two addresses);
control arm 0 derived / 41 pair types withheld; chemistry arm **9
never-stated facts derived, quiescent in 3 steps** (each carrying provenance
and a refusal surface; against a naive transitive control this adds licensing,
not reach — see the third amendment), headline
**"Ulysses S. Grant held the presidency after Abraham Lincoln"** (derived
through Andrew Johnson; labels verified against live wikidata.org) and a
depth-2, 2-path fact (Colfax after Breckinridge, through Johnson AND
Hamlin); physics arm: cue at Hamlin alone, the front visibly propagating
person-to-person (5→4→0); priors arm: the compiled canon nominated **0 of
9** candidates — the gate refusing chemistry it never met is the
measurement.

### The rule this pass earned, found by running it (P5.5)

Office-scoping the relation (`replaces:<office>`) was designed in advance —
cross-office composition through a shared person is provably unsound. What
only the run surfaced: the first pass derived BOTH DIRECTIONS of one Senate
pair, because Hamlin held that seat for multiple terms and a person-level
bridge conflates two tenures. **"The same person" is not "the same tenure"
— a bridge must carry the identity the relation's semantics needs.** The
gate: an office's chemistry is licensed only where `replaces:<office>` is
functional AND inverse-functional over persons in this material (nobody
begins or leaves it twice) — R2's own vocabulary as a refutation search.
Measured: 6 offices licensed as the driver's declared risk (a named
process-giver, unrefuted-at-this-stage per the grain theorem), 1 refused
with its counterexamples named (Hamlin began the Senate seat against three
distinct predecessors in this material alone).

### Disclosed limits

Address precision (a span names the first place the file states the qid as
a value — real, self-verified bytes, not the exact qualifier node); the
finer per-bridge tenure gate (refusing only multi-tenure bridges inside a
refused office) named as future work — the substrate consults affordances
per relation pair and has no per-bridge veto hook; nothing here is wired
into app.js's live turn (the fold-architecture session's contract — the
same boundary P45/P53 already hold), so the browser runtime still needs a
`/native` mount + page-graph + II.13 allowance before any of this reaches
a live turn; and the compiled artifact's terrain/stance/operator
expectations are empty under this driver's assembly (no terrain-state
projection run — same as the engine's own driver), stated rather than
implied as an empty corpus.

### P60 amended 2026-08-28 — self-individuation refuted before it was built; the scan is a VETO, and pruning is the loop

**User direction:** *"we need to remove the giver thing, it should be able to
INS itself, but giving it an external name needs a given."* The reasoning was
sound in shape — an existence claim is earnable where a ∀-claim is not — and
it was tested before it was built.

**Step 0 refuted it.** `eval/falsification-probe.mjs` ran six corpora with
ground truth declared in advance through the real door and the real kernel
nominator. `succession-clean` and `defeated-acyclic` are STRUCTURALLY
IDENTICAL by construction — five adjacency facts, 1:1, acyclic, both
nominated at identical support, both clearing uniqueness — and opposite in
truth: succession composes soundly, dominance does not. **The scan cannot
tell them apart.** Refuting a transitive-composition claim needs a POSITIVE
counterexample; positive-only material supplies one only as a cycle or a
uniqueness violation; where neither is present, open-world absence refutes
nothing. Cost: one driver and six fixtures, instead of five modules shipping
plausible falsehoods with impeccable provenance.

Two further findings kept: `parent-nontransitive` was refused **for the
wrong reason** (uniqueness, never transitivity — A10's trap, recorded so no
pass reads it as the scan understanding composition), and `lineage-chain`
closed the middle ground — `son_of` composes soundly but to *descendant of*,
so structure cannot say what is yielded, and "an anonymous composition
exists here" is not a safe weaker claim because a composition site is always
structurally present.

**What shipped instead.** `kernel/refutation.js` — the same scan, reframed
as a **veto organ, not a licensing one**. `refuted: false` is never a
licence and every result says so; a scan below two resolved edges reports
`power: "insufficient"` rather than "unrefuted" (P41); unresolved-end edges
are counted, never dropped. `reaction.js` gained `settle({veto})` (refused
pairs refused at the door, tallied APART from `withheld` — "nobody vouched"
and "somebody vouched and was refuted" are different facts a concession
needs to tell apart), `derivedUnder`, `withdraw` with transitive cascade,
and `admit` for a growing substrate. `declarations.js` gained a `composes`
declKind so chemistry lives on the append-only register and can be conceded.

**A second correction, found by running rather than reasoning.** The first
audit ran the uniqueness check on every relation an affordance named and
reported the derived transitive closure REFUTED — because Colfax is `after`
both Hamlin and Breckinridge, which is the closure being CORRECT.
Many-to-many is what transitivity means. `expectUnique` is now declared by
the caller and defaults OFF; `closureAffordances` names the side its giver
claims is 1:1 (`meta.adjacency`) and the audit reads that rather than
inferring it. **A check applied where its precondition does not hold
produces a refutation that means nothing** — A10 again, one layer in.

**The loop, measured on real data** (`eval/results/pruning-timeline-RESULTS.md`):
streaming the 26 real succession facts one at a time, the Senate licence
**survived 10 facts and was refuted at fact 11** on a named counterexample;
the declaration was conceded with a real REC, one already-derived product
was withdrawn, history stayed whole (26 derived, 25 live), and the veto
stopped further derivation. Six licences survived the whole stream, reported
as *"unrefuted by THIS material — not a licence earned, and not a claim of
soundness."*

**The generalization.** Evidence cannot grant a licence; it can take one
away. Against the neuron analogy that prompted this, that is **pruning, not
Hebbian strengthening** — and it is also the answer to the staleness
question, since a compiled prior that can be refuted by later material is
one that does not silently rot.

**Faithfulness verified, not assumed:** replacing the hand-written tenure
check with the kernel organ reproduced the same verdict (6 licensed, 1
refused), the same 9 derived facts, the same headline — and is strictly
stronger, catching both `uniqueness` and `cycle` where the hand-written
version looked only at uniqueness. Suites: eoreader7 163/153/10 →
179/169/10; the-fold identical failure set, zero regressions in either.

### Amended 2026-08-28 (third) — measured against an independent oracle: the veto helps, the chemistry does not

Prompted by a direct challenge — *"prove if this actually helped"* — and the
honest answer was that P60 had not proven it. P60 measured that the mechanism
RUNS (9 never-stated facts, with provenance). It never measured whether those
facts are TRUE, never measured whether the gate PREVENTS anything, and never
ran the control that decides whether any of the apparatus is load-bearing.

`eval/derivation-precision.mjs` (offline, re-runnable) runs four arms against
an oracle that is independent BY CONSTRUCTION: the derivation reads P1365/P1366
(`replaces`/`replaced by`); the oracle reads P580/P582 (term start/end),
committed as `eval/fixtures/succession-terms.json` with its giver.

| arm | derived | true | false | precision |
|---|---|---|---|---|
| A shipped (office gate) | 9 | 5 | **0** | **1.000** |
| B gate removed | 26 | 20 | 2 | 0.909 |
| C naive join, zero apparatus | 23 | 16 | 3 | 0.842 |
| D per-bridge gate (the disclosed future work) | 10 | 6 | **0** | **1.000** |

**The veto helps** — 0.842 → 1.000 against the no-apparatus control, every
false fact eliminated including a self-loop (*"Amos Nourse after Amos
Nourse"*), and every false fact in every arm sits in the one office the gate
refused. That is a measured outcome where P60 shipped an assertion.

**The chemistry does not.** `chemistryFoundThatNaiveMissed: 0` — a 20-line
transitive join finds every fact the licensed chemistry finds, plus 14 more.
**The apparatus is a filter, not a generator.** P60's framing described the
mechanism accurately and oversold what it buys; the deriving was never the
hard part, and the reaction front is not where the value is.

**The cost is now priced rather than named: 15 true facts destroyed per 2 false
ones prevented** (7.5:1), all in the one refused office, because the refusal is
office-scoped and one multi-tenure holder forfeits every composition in that
office. Arm D builds P60's own disclosed "finer per-bridge gate" and recovers
exactly **1** of the 15 — so that future work is directionally right and **is
not the fix**. Most of the 15 genuinely pass through a multi-tenure bridge and
are true anyway; no material-internal test can see it.

**The real next step, and it is not another gate:** admit term DATES as
material. The oracle settles every one of these cases in a single comparison
and the derivation cannot, because it only ever received adjacency. Ingesting
P580/P582 as edges is the fix; a cleverer veto is not.

**The standing lesson.** *A mechanism that runs is not a mechanism that helps,
and the control that separates them is the cheap one you skipped.* The naive
join took twenty lines and answered the question the whole apparatus was built
to answer. Run the dumb control first.

### Amended 2026-08-28 (fourth) — a uniqueness violation is a GRAIN signal, and the previous amendment's fix was shaped

User direction, verbatim: *"be sure these edges are not politics shaped but
learn anything."* The correction landed on work from minutes earlier and was
right.

**What was shaped.** The third amendment named "admit term DATES as material"
as the fix, and the first implementation of it named each tenure
`person#office#start` — which works, and hardcodes *"someone holds an office
for a term."* It goes dark on material nobody labelled that way. That is the
mistake `relation-composition.js`'s own header already records the kernel
making once ("AN ARRANGEMENT HAS ENDS, NOT PARTS OF SPEECH… went dark on
everything else — not because the structure was absent but because nobody
wrote 'subject' on it"), committed a second time with a political role schema
in place of a Greek grammatical one.

**The general rule, with no domain in it:** an edge relates OCCURRENCES — the
episodes its ends actually belong to — not the durable entities those episodes
belong to. A one-to-one relation violated at entity grain is evidence **the
grain is too coarse**, not evidence the relation is unsound. Refine to the
material's own occurrence identity and re-scan; a violation that dissolves was
a grain defect. This reframes P60's veto directly: the uniqueness violation was
pointing at a fixable modelling error, and P60 read it as a permanent property
of the material.

**Checked, not claimed.** `eval/grain-refinement.mjs`'s core is 68 lines
containing zero occurrences of person, office, tenure, patient, bed, occupant,
slot, succession, politic, senate, president, vice or wikidata — asserted by a
scan in the driver's own run. Domain vocabulary lives only in adapters
(spec ← kernel ← adapters).

| adapter | entity grain | occurrence grain |
|---|---|---|
| Wikidata succession (real, political) | 101 derived, 2 false, 0.939 | 49 derived, **0 false, 1.000** |
| Hospital-bed occupancy (invented, non-political) | 9 derived, 1 false, 0.889 | 5 derived, **0 false, 1.000** |

The non-political control carries a trap **declared in the fixture before the
run** — a returning occupant makes person-grain composition yield "Brix after
Chen", backwards — and that is exactly the one false fact at entity grain,
gone at occurrence grain. **Precision reaches 1.000 in both domains with no
veto anywhere:** soundness from finer material, not from refusal.

**The signal distinguishes two cases and says which.** The synthetic relation
reports *"GRAIN DEFECT — the violation dissolves"*; the three real Wikidata
relations report *"real — the violation survives refinement"*, because partial
material leaves counterpart mentions unbindable. Reported, never assumed.

**And this corrects the previous amendment's own conclusion.** Naming
occurrences by statement INDEX reproduces an identical fact set
(`datesOnlyNameTenures: true`), and the synthetic adapter uses no dates in its
identifiers at all. **Dates were one adapter's way of naming occurrences.** The
work is done by occurrence identity; the dates are incidental.

**The standing lesson, now recorded twice in two registers:** when a mechanism
needs the material to have been labelled with one domain's vocabulary, it has
not learned anything general — it has learned that domain. Prove otherwise by
running the identical core over a corpus from somewhere else.

### Amended 2026-08-28 (fifth) - the spec's five increments, and the one that split its own prediction

Executed against a handed-down spec (A-E). A-D landed; **E was optional and is
not built** - named here rather than implied.

**A - the giver named.** The governing law *"the low establishes the possibility
for the high; the high establishes the probability for the low"* (READING-SPEC
S9) carried no giver, while the apparatus refuses gifts whose giver cannot be
named. It is now credited to **Arthur Koestler, *The Ghost in the Machine*
(1967)** - the holon, and hierarchic order's "fixed rules and flexible
strategies"; the two directions are the Janus-faced holon's two faces.
`native/eval/prior-art-cited.mjs` makes the rule enforceable against the spec's
own class of law: 21 laws, 21 with resolvable givers. **The lint's first version
was a comment, not a wall** - its detection window ran past the heading into the
next law and found *its* giver, so a deleted giver read as present. Caught by
planting the defect; fixed by bounding the window. It also reports a real
collision: **S17 is used twice**, and the-fold cites S17 three times, so an
external citation of it is ambiguous. Not renumbered - that would break those
citations.

**B - the chemistry says what it is.** `reaction.js`'s header and P60's headline
now state the measured result: **a filter, not a generator.**
`derivation-filter.test.mjs` holds it honest - the licensed fact set must stay a
SUBSET of the naive join's, with a third case guarding against the control
silently becoming a copy of the shipped arm (vacuous truth).

**C - the wall is executable.** `afterVeto(licensedByGiver, scans)` makes the
shape explicit: a named giver licenses, the scan only removes, and nothing
outside `licensedByGiver` can return however clean its scan. Two call sites had
spelled it `licensed: !scan.refuted`. A source guard forbids admitting on a
negated refusal, with a `veto-report:` marker for legitimate reporting uses.
**That guard was also a comment before it was a wall**: its pattern matched only
`!ident.refuted`, so a planted `!scanAt(...)[0].refuted` walked straight
through. Widened to any negated read.

**D - intervals, and a prediction that split.** `refuteRelation` gained
`intervalOf`: a repeat standing refutes only where two standings OVERLAP, and
(added when the first half proved insufficient) a cycle refutes only where it
CLOSES WITHIN ONE STANDING. Half-open, so a same-instant handover is disjoint;
a missing bound reads as unbounded, because disjointness excuses and must be
shown. Against the pre-registered prediction: **confirmed exactly** - 15 true
facts recovered, precisely the number the office gate destroyed; **refuted
exactly** - precision fell to 0.909, byte-identical to no gate at all.

**The reason is the finding.** Intervals fix the **gate's** over-refusal; they
do nothing about the **composition's** conflation at a bridge. A chain hopping
through a multi-tenure referent at referent grain has already lost which
standing it passed through, and no gate downstream can recover it. The spec
treated these as one defect. Neither half alone holds both recall and precision
- the interval gate recovers recall and loses precision; occurrence-grain
bridges hold precision and recover little. Joining them is named,
measured-as-necessary, and unbuilt.

**A defect found on the way, unrelated to the spec:** three kernel files carried
literal NUL bytes in template-literal key separators. Git handled them as text,
so no diff was ever affected - but **grep and ripgrep skip any file containing
one**, and Increment C asks for a *grep-level* guarantee. A guarantee whose tool
silently omits kernel files is worthless, so those NULs became escape sequences.
Two more sit in the-fold's `app.js` and `explore-server.mjs`, left untouched:
those belong to the fold-architecture session.


### P60 amended 2026-09-02 (fifth) — the judge never passed resolution; two numbers retracted, two re-read

`eval/full-circuit-oracle.mjs` ran the whole relay on this same material
and spent a null on the ORACLE for the first time — and the oracle
failed it. The person-grain verdict every P60 arm was scored with ("SOME
term of X begins after SOME term of Y ends") is TRUE for a random
within-office pair ~0.82 of the time, because any two holders of one
office are time-ordered and a multi-term holder gives "after" several
chances. `eval/derivation-precision-resolution.mjs` then ran this
policy's own driver over 40 redealt materials (succession targets
shuffled within each office, marginals kept) and asked, per arm, where
the real number sits in the shuffle's distribution
(`eval/results/derivation-precision-resolution.md`):

- **RETRACTED — the fourth amendment's "1.000 precision at occurrence
  grain with no veto anywhere" (arms E/E′).** 40 of 40 shuffles produce
  the identical perfect score at equal reach. The number was the judge's
  permissiveness, not the grain's virtue. The grain ARGUMENT (an edge
  relates occurrences, not entities) stands on the hospital-bed control
  and on the oracle run's tenure-grain judge; the precision NUMBER here
  did not earn it.
- **RE-READ — the third amendment's "0.842 → 1.000".** Arm C's 0.842 sits
  AT the null's median (0.850): the naive join's precision was
  chance-level on this judge, so the headline compared chance to a gated
  arm whose separation from the shuffle is REACH, not precision — the
  office gate derives 5 decided facts where the shuffle derives 1. Arms
  A and D stand, with that caveat attached: what the gate demonstrably
  does is refuse to compose on destroyed structure, which is a real
  property and a different one from "its facts are truer per fact".
- The claim that survives whole: **the veto prevents the false facts**
  (arms B/C carry 2–3 FALSE; A/D carry 0) — a FALSE-count claim, not a
  precision claim, and the shuffle does not touch it.

What licenses a precision claim on this material is the TENURE-GRAIN
judge (this tenure begins after that tenure ends — a random pair is
"after" only about half the time), under which the full circuit's 8/8 is
matched by 0 of 49 shuffles. Arms A–D compose at person grain and cannot
be judged there without carrying tenure identity; re-scoring them is
named work. **The rule this earns, for every oracle in the building:
before a precision number is reported, the judge is shuffled once.**

### P60 amended 2026-09-02 (sixth) — at scale, the grain fix generates; the oracle passes resolution outright

The fifth amendment's named next step, taken the same day: the full
circuit (`eval/full-circuit-oracle.mjs`) run over a 158-entity crawl
(`eval/fetch-succession.mjs`, two hops along P1365/P1366 from the 23
seeds, new fixture files, the committed set untouched). Under the
tenure-grain judge a redealt fact is TRUE with p≈0.54 — chance — and the
circuit's **223/223 TRUE, 0 FALSE** is matched by **0 of 50** shuffles.
The precision claim this policy could not license on 23 entities is
licensed on 158.

And the fourth amendment's grain argument, whose NUMBER was retracted an
amendment ago, earns a better number than it ever claimed: at person
grain 7 offices are refused and the naive arm derives 137; at tenure
grain **0 offices are refused and the circuit derives 224** — 101 facts
the person-grain arm cannot reach, every one oracle-TRUE. The "15 true
facts lost per 2 false prevented" cost was the wrong grain's cost. The
circuit gives up 21 naive-only facts, 19 of them unverifiable by the
oracle (single-witness edges): corroboration trades unverifiable reach
for verifiable reach, and tenure grain adds reach on top of that.
Full numbers: `eval/results/full-circuit-oracle-RESULTS.md`, wide run.

## P61 — Admission by measurement: the sequence type, and the gate that now precedes a kernel organ

**User direction, verbatim (2026-08-28):** *"this needs to demonstrably
improve retrieval and reasoning before admission"* — *"and prediction."*
Applied to the sequence type, and standing for whatever asks for kernel
admission next: elegance, row-count collapse, and baseline reproduction are
not admission; measured improvement on declared predictions is.

**The gate** (`eval/sequence-admission.mjs`, offline, predictions written
before the run): retrieval 47/47 unique-correct where the flat shape
conflated 7, zero wrong; reasoning 95 derived / 31 oracle-true / 0 false at
precision 1.000 and depth 6 with no office gate and no interval option —
strictly dominating the pareto frontier no shipped arm could (5 true @ 1.000
/ 20 true @ 0.909), the recall carried by continuity edges that exist only
because dates are material; prediction 7 leave-one-out recoveries at zero
wrong against a structural-zero baseline.

**The pre-registered prediction arm FAILED, and the failure is the most
valuable line in the results.** Three wrong guesses, all in "United States
senator" — ONE locus name for a hundred concurrent seats, boundaries
synchronized by the March-4 turnover, strict abutment crossing into a
parallel seat. The module's own declared algebra (`functionalPerPosition`)
was refutable from the material and nothing checked — the comment-not-a-wall
shape, in a module one day old. `refuteLocus` is the wall the failure
earned: concurrent standings of different occupants refute a locus as a
POOL, prediction refuses there, and a correct-by-luck recovery was returned
along with the wrong ones. Both arms are in the committed results; admission
rides the amended arm and says so.

**What admission retired:** the planned `chainOf` locus constraint and role
propagation — the blast-radius audit's riskiest item — proved unnecessary,
because position IDENTITY carries the locus and the kernel chains it
correctly unchanged. The constraint the 24 affordance rows encoded is held
by identity, not by new kernel semantics.

**The law is S21** (eoreader7 READING-SPEC): the material has its own arrow,
and it is not the reader's — structural, never metric; positions are
temporal, occupants are not; S20 is its interval-witness special case and
now says so. Full narrative: `eval/results/sequence-admission-RESULTS.md`.

## P62 — retrieve() was blind to every non-Latin script; the bytes were never the problem

**User direction, verbatim:** *"fix retrieve() so it tokenizes Hebrew and
all languages too. we have the bytes."*

**The bug, measured live, not assumed.** `source.js::tokenize` split on
`/[^a-z0-9%.\-]+/` — an ASCII allow-list, applied AFTER lowercasing.
`tokenize("שלום")` (bare Hebrew, "peace") returned `[]`. Every chunk-
construction path (`chunkProse`/`makeChunk`/`chunkByBoundaries`/
`chunkRows`) populates its `.terms` Set from `tokenize()` and only
`tokenize()`, and `retrieve()` calls `tokenize()` exactly once, on the
question. So the defect was never partial: a non-Latin corpus and a
non-Latin question were BOTH blind, on both sides of the one term-overlap
comparison `retrieve` makes — not merely unranked, structurally invisible.
`foldDiacritics` was checked and is NOT the cause: even bare, unpointed
Hebrew (no diacritic anywhere) tokenized to `[]`, because the base
LETTERS themselves sat outside the ASCII class, not just their vowel
marks.

**The fix reuses a precedent already sitting in the same file.**
`foldTypography` (source.js, built for a different purpose — comparing a
model's drafted prose against source material) already splits on
`/[^\p{L}\p{N}.]+/gu`, and its own header already states the reason:
*"Unicode classes, not `[a-z0-9]`, because a Cyrillic or CJK corpus must
fold to its words and not to nothing."* `tokenize` had simply never been
brought into line with that precedent. It now splits on
`/[^\p{L}\p{N}%.\-]+/u` — `\p{L}`/`\p{N}` are a STRICT SUPERSET of
`a-z`/`0-9` post-lowercase, so every existing ASCII caller is
byte-identical by construction, not merely by measurement (confirmed by a
full-suite run regardless: 1073/944/127, the same 127 pre-existing
failures by name, zero regressions).

**The companion fix, and why it is not gated behind an opt-in the way
`verbForms`/`createLemmatizer` are.** `foldDiacritics` widened too: Hebrew
nikud (U+0591–U+05C7) and Arabic tashkil (U+064B–U+065F, plus U+0670) now
fold away, the same Bezúkhov/Bezukhov shape this function already handled
for Latin, one script class over — a vocalized Talmud folio (real material,
fetched live from Sefaria for this test) and an unvocalized typed question
are otherwise the identical mismatch. Folding a vowel mark away can only
WIDEN what matches, never narrow a real distinction into a false one — the
same "safe by construction" class P41/P43's determiner/negation priors
already are — so this ships on for every caller, not behind a flag.

**Disclosed, not silently claimed: CJK is a narrower, honest improvement,
not real segmentation.** A boundary-based tokenizer cannot introduce a
split where the bytes have none — there is no character between adjacent
CJK ideographs for `\p{L}`-class splitting to find, regardless of which
characters count as "word" characters. Checked, not assumed, and it is
worse than merely "unsegmented": `tokenize("北京")` (Beijing, a genuine
two-character word) is STILL `[]`, because the same length floor
(`t.length > 2`) that drops a two-letter English word drops it too; only a
longer run of several ideographs survives, as one oversized merged token,
never a real word boundary. Both facts are pinned as tests
(`fold.test.mjs`), not glossed over. Real CJK reading needs a dictionary-
or model-based word breaker AND a length floor that is not tuned to
English's own average word length — neither attempted here.

**Verified against real material, not a synthetic string.** Six real
folios of the Babylonian Talmud (Berakhot 2a–4b, William Davidson Edition,
fetched live from Sefaria's API the same session this bug was found in)
chunked, and `retrieve()` on a real unvocalized Hebrew question found the
right passage — the exact practical case the fix was written for, not
only the unit-level round-trip.

**Files.** `source.js` (`tokenize`, `foldDiacritics` — both widened,
`retrieve`/`chunkSource`/every chunk-building path untouched: the fix is
entirely upstream of them). `fold.test.mjs` (+4 cases: a vocalized-Hebrew
retrieval round-trip mirroring the pre-existing accented-Latin one;
Hebrew/Cyrillic/Arabic surviving `tokenize` directly; the CJK limit pinned
as exactly what it is, both halves). No other file touched — `retrieve`,
every chunker, and every other consumer of `tokenize`/`foldDiacritics`
(`cite.js`'s `commonTerms`/`CORPUS_MINIMUM` included, checked directly:
its own algorithm reads only `c.terms`, so a non-Latin corpus goes from
"the function-word veto never fires" to "it fires for real," a quality
gain with no ASCII-side behavior change) needed no change to benefit.

**Amended same day — a background consumer sweep found three siblings, two
worth fixing and one worth pinning.** A general-purpose agent was asked,
independently of the fix above, to map every consumer of `tokenize`/
`foldDiacritics`/`retrieve` before this was trusted as done. Its report
confirmed the fix's own safety analysis (`cite.js`, `hypergraph.js`,
`grounding.js` all checked as either unaffected or strictly improved) and
also surfaced three sibling ASCII-only regexes doing the SAME job as
`tokenize` while never routing through it — none caused by this pass, all
real, and disclosed here rather than left for the next reader to
rediscover one at a time.

1. **`skills.js::claimSkill` had a live vacuous-truth bug, now closed as a
   side effect.** `s.skill.anchors.every((a) => tokenize(a).every((t) =>
   toks.has(t)))` — before this fix, a non-Latin-only anchor tokenized to
   `[]`, and `[].every(...)` is vacuously `true`: such a skill claimed
   EVERY task unconditionally, regardless of content. No code change was
   needed in `skills.js` itself (the fix lives entirely in `source.js`),
   but the fixed behavior is now pinned where the bug actually bit
   (`skills.test.mjs`: a Hebrew-anchored skill correctly refuses an
   unrelated task and correctly claims one that genuinely contains it).

2. **`fact-block.js` had its own, uncoordinated copy of the same job —
   fixed the same way.** `rankByQuestion` and `buildFactBlock`'s own
   `questionTerms` both built term sets with an independent
   `.split(/[^a-z0-9']+/)`, ranking hypergraph-derived facts for the
   model-facing notes block by overlap with the question. Widened to
   `\p{L}\p{N}'` — the character class alone, not a swap to `tokenize()`
   itself, because this ranking is deliberately lighter (no stopword
   filter, no length floor) and reusing `tokenize` wholesale would change
   more than the one thing that was actually broken.

3. **`capacity-runner.js::contentTokens` was the more serious of the
   two — a CHECK going blind, not just a ranking going blind.**
   `checkObjectSpecificity`'s own documented rule: `trusted` is `true`
   "when the claim's object carries no content token to check (nothing to
   confirm, so nothing to doubt)." On non-Latin content, the old
   `.split(/[^a-z0-9]+/)` always produced an empty set — so a non-Latin
   EVA/`landAct` verdict was silently TRUSTED rather than checked, the
   exact "checks go blind rather than wrong" failure shape this repo's
   own grounding-ladder section already names as worse than an ordinary
   miss (P41's own restatement of the same rule, aimed at a different
   cell). Widened the same surgical way; the fix is real but currently
   unreachable by any existing test (no non-Latin claim fixture exists
   for this path) — named here rather than left implicit.

Not touched, and disclosed rather than silently declined: `widget.js`'s
`forms()`/`clauseForms()` (its own comment already states why they are
deliberately NOT built on `tokenize` — they need to keep stopwords/short
words tokenize drops — so a non-English widget-iteration command still
won't route; a real, separate gap, out of scope for a retrieval fix);
`seed.js`'s own language/determiner-name splitter (a narrow, inherently
Latin-script domain); `crown.js`'s `TOKEN_RE` (scoped to witness/source
names, ASCII by construction in every real fixture today).

Full suite after all three fixes: 1074/945/127 — the same 127 by name,
confirmed via `git stash` diff a second time.

**Amended same day — the two disclosed gaps above closed, one fully and
one partially, each on its own honest terms.**

1. **`capacity-runner.js::contentTokens` is no longer "real but
   unreachable by any test."** A new case
   (`capacity-runner.test.mjs`, the mocked-`runCapacity` pattern
   `squarePolarity`'s own test already established, since the real
   `extractRelations` is capitalization-anchored and English-only and
   cannot itself produce a Hebrew edge) hands `landAct` a real Hebrew
   claim object ("נשיא עשרים", "president twenty") and a real,
   genuinely-mismatched backing edge ("נשיא שבע עשרה", "president
   seventeen") — the identical shape as the pre-existing English "22nd
   president" vs "17th president" case, one script over. Before this
   fix, `claimTokens` would have been the empty set and
   `checkObjectSpecificity`'s own "nothing to confirm, so nothing to
   doubt" rule would have TRUSTED the mismatch unconditionally; the test
   asserts the opposite — `claimTokens` carries the real Hebrew word
   tokens, the verdict downgrades, and the shared word ("נשיא") versus
   the claim's own distinguishing word ("עשרים", absent from the real
   edge) are both checked by name. Could not be executed in this
   session's own environment (the file's other real-pipeline cases need
   `legacy-eoreader6.1`, an uninitialised submodule here, an unrelated
   pre-existing gap this document already names elsewhere) — verified
   instead by extracting `contentTokens`/`negationCandidates`'s exact
   logic into an isolated script and running it directly against the
   same Hebrew strings, confirming the tokenization and the negation-
   candidate routing the test depends on both behave exactly as traced
   from the real source.

2. **`widget.js`'s `forms()`/`clauseForms()` had their OWN, separate
   ASCII-only split regex — narrowed, not eliminated.** The deliberate
   design decision named above (kept OFF `tokenize`, to preserve
   stopwords/short words a widget-iteration command needs) is
   unchanged and still correct — this is not that decision being
   reversed. What was fixed is a DIFFERENT, smaller bug living inside
   their own independent regex: `.split(/[^a-z0-9']+/)` was itself
   ASCII-only, so a message written wholly in a non-Latin script
   tokenized to `[]`, and `iterationTell`'s `if (!toks.length) return
   null` short-circuited before the one genuinely script-agnostic path
   here — content-word resolution against the build's own bytes, built
   on the already-fixed `tokenize` — ever got a chance to run. Widened
   the same surgical, character-class-only way as every sibling above
   (`\p{L}\p{N}'`, never a swap to `tokenize` itself). Pinned in
   `widget.test.mjs`: a Hebrew iteration message now resolves against a
   Hebrew build's own bytes exactly as an English one already did,
   while a genuinely unrelated Hebrew message still correctly falls
   through to `null`. Honest residue, restated rather than implied
   fixed: `NEGATION_WORDS`/`FIRST_PERSON`/`ANAPHORIC_PRONOUNS`/the
   determiner classes stay received, English-only closed classes
   (`lang/en`, named in their own headers) — judgment and anaphora
   detection are not fixed by this, only unblocked from an early, wrong
   `null`. Could not be executed in this session's environment for the
   same submodule reason as above.

Full suite after both closures: 1074/945/127 — the same 127 pre-existing
failures by name, confirmed via a third `git stash` diff (the file-level
failures for both `capacity-runner.test.mjs` and `widget.test.mjs` are
unchanged by name, since the whole file fails at module load regardless
of which cases it carries — the fix is verified by direct execution of
the extracted logic instead, per each item above).

## P63 — kinship reasoning: a two-hop, cross-relation-type derivation, live (2026-08-28)

User direction, verbatim: *"let's have it do complicated mechanical
reasoning that isn't just 'in' the text."* P60's own succession demo
composes ONE relation with itself (`replaces ∘ replaces ⇒ after`) — real
multi-hop reach, but a shape a careful reader could still spot by eye on
two adjacent succession-box entries. This closes the sharper ask: a
domain where the composition combines TWO DIFFERENT relations into a
third, and the second hop consumes the first hop's own derived product.

**The domain, and why.** Kinship: `childOf ∘ hasChild ⇒ siblingOf`
(bridge: the shared parent), then `childOf ∘ siblingOf ⇒ hasAuntOrUncle`
(bridge: the shared parent-generation person — consuming the FIRST row's
own derived edges). Neither derived relation is stated on any one
fetched page: siblinghood requires reading two separate people's own
pages and noticing they share a mother; Wikidata has no aunt/uncle
property at all, so there is nothing to even misread as "in the text".

**Material: four real Wikidata entities, fetched live, never a fixture**
— Queen Victoria (Q9439), her daughter Victoria, Princess Royal ("Vicky",
Q116728), Vicky's son Wilhelm II (Q2677), Victoria's son Edward VII
(Q20875). Verified by hand before any code: Vicky's own page states her
mother is Q9439, Wilhelm's own page states his mother is Q116728, Edward
VII's own page states his mother is Q9439 too — a real, mutually
self-consistent family fragment.

**Reused completely unmodified**: the-fold's own P57 hyperlexicon
admission door, `predigest.js::assertionEdges`'s projection, and
`eoreader7/native/kernel/reaction.js`'s reaction substrate — the exact
same circuit `eval/mechanical-reasoning.mjs` already exercises. This pass
supplies only a new domain, a new hand-declared cross-relation-type
chemistry (two `giveHyperlexiconAffordance` rows, not `closureAffordances`
— that helper is specifically the same-relation case), and a new
independent oracle.

**Result, measured, not assumed.** 11 raw facts (3 cross-page assertions
+ 9 of Victoria's own P40 entries), every one byte-addressed and
self-verified (P5.2), admitted with zero refusals. Reacted with `cue:
null` (the disclosed full-closure control — this pass tests the
chemistry gate, not the physics/cue gate P60's own arm 3 already
covers): step 1 derives **8 real `siblingOf` facts** (Vicky's real
siblings — Vicky herself correctly excluded by `relation-composition.js`'s
own self-loop guard, un-special-cased); step 2 derives **8 real
`hasAuntOrUncle` facts at depth 2**, each consuming a step-1 product;
step 3 quiescent. Control arm (no chemistry given): 0 derived, quiescent
— nothing reasons without a declared, giver-named chemistry, the same
wall reproduced on a different relation family. Post-settle audit: 0
self-refuted.

**Headline, full provenance across three separate real files:**
*Wilhelm II's aunt/uncle is Edward VII* — derived depth 2, provenance
`wikidata/Q2677.json#21551-21565` (Wilhelm's own P25) +
`wikidata/Q116728.json#17641-17653` (Vicky's own P25) +
`wikidata/Q9439.json#37956-37969` (Victoria's own P40 entry for Edward
VII) — none of which individually says anything about an uncle.

**The independent oracle, checked but never fed in.** Wikidata's own
`P3373` (sibling) on Vicky's and Edward VII's pages is fetched and read
ONLY after the derivation, never given to the substrate. Result: exact
agreement — all 8 derived siblings match `P3373` precisely, nothing
missed, nothing extra. **A real bug was caught getting there** (P5.5):
the first comparison reported zero agreement, because
`assertionEdges`'s own `normalizeEnd` lowercases every derived edge's
endpoints while Wikidata's raw qids are not lowercased — the oracle
compared them un-normalized and looked like a serious finding when it
was a case-mismatch in the driver's own comparison code. Fixed by
normalizing both sides consistently; recorded rather than smoothed over.

**"Never stated," checked mechanically.** Every raw fetched byte (all
four entity dumps) was scanned for the literal words "aunt"/"uncle".
Neither appears anywhere — the concept is absent from the schema of
everything read, not merely from one sentence.

**The model comparison: right verdict, fabricated reasoning.** A real
local model (`onnx-community/Qwen2.5-0.5B-Instruct`, the same fallback
`eval/void-loop-e2e.mjs` already established) was given ONLY the three
raw facts — never the words sibling/aunt/uncle — and asked directly
whether Edward VII was Wilhelm II's uncle. It answered "yes" (correct)
with reasoning that calls Edward VII "a cousin of... Victoria" (his own
mother) and invents "King George V" (named nowhere in the prompt) — a
verdict-only check would have scored this a clean pass and missed that
the stated reasoning does not actually demonstrate the two-hop
composition it was asked to perform. The raw prompt and raw answer are
committed verbatim so this reading can be checked, not trusted.

**Disclosed limits, stated rather than glossed.** The chemistry's giver
is this driver itself, not a received-priors register entry — "a
parent's sibling is your aunt/uncle" is ordinary, uncontroversial English
kinship terminology, but no corpus in this repo proved it; the
declaration names its own risk, matching `eval/mechanical-reasoning.mjs`'s
own `CHEM_GIVER` posture exactly. Half-siblings are not distinguished —
the affordance as declared derives a half-sibling relation identically to
a full one; does not bite on THIS family (Victoria and Albert's children
are full siblings) but is a real, named, unbuilt gate (the same class of
honest gap P60's tenure-identity fix already found and named once). Only
the four entities the demonstration needed were fetched, so seven of the
eight derived facts render with a bare qid rather than a name in the
committed JSON — a stated absence, never a silent one.

**Files.** `eval/kinship-reasoning.mjs` (new, re-runnable driver —
P19/P27's own posture) + `eval/results/kinship-reasoning.json` (committed)
+ `eval/results/kinship-reasoning-RESULTS.md` (the full account). No
existing file touched.

## P64 — an empty cell is a lead: the connection pass, and the three policy reassemblies it verified

**User direction, in sequence (2026-08-29):** *"do we have a 'reasoning'
policy doc like our reading policy?"* → *"write the reasoning policy,
learn everything from all our attempts. and when done, do a 'generation
policy'"* → *"think about if we need a policy doc for all 9 stances...
what the system is ever capable of"* → *"I suspect that we should have
organs that can do all 9 stances, and that we can use the cube to
identify where we are missing capabilities"* → *"connect all that already
exist and make a plan to develop the other capacities."*

### The three reassemblies

`REASONING-POLICIES.md` (19 laws + refuted moves), `GENERATION-POLICIES.md`
(15 laws + refuted moves, model-agnostic with its scope claim stated
per-model rather than overclaimed), `CAPABILITY-POLICIES.md` (the 27-cell
map, its three 9-way faces, and its walls) — each CHAT-POLICIES.md's
discipline applied to a new slice: summarize and point, never re-derive;
standing documents, amendments append; POLICIES.md wins on conflict, the
eval results docs win on numbers. Every Part-I reasoning number was
re-verified by re-running its offline driver before first commit.

**The verification was real, not ceremonial.** An adversarial workflow
(three independent checkers — 119 specific figures located in their
sources — plus a completeness critic) ran against the committed drafts
and returned 15 corrections (4 wrong, 11 overstated) and six missing
laws, all folded in the same day: among them, `deriveOp` misattributed to
widget.js (it is build-log.js:152); a crown.js/wikidata.js sentence swap;
R4 erasing P60's real no-chemistry control arm (what was missing was the
DUMB-BASELINE arm — a distinction R4 itself exists to enforce); R12's
convergence band corrected to the source table's own 17–43%-on-examined;
and the critic's three homeless laws now seated — "a wall nothing can
trigger is a comment, not a wall" (four independent measurements, the
most-measured law in the corpus with no entry), ask-twice-derive-the-
verdict at temperature 0, and "a reading failure wears the model's face."

### The coverage driver, and what it measured

`eval/capability-coverage.mjs` (new, offline): the REAL `moves.js`
coverage off the REAL native cube, geometry asserted mechanically first
(seven checks — operator IS (mode,domain), so the space is 27 = three
free axes with three 9-way projections, stance = (mode,grain) among
them). As found: **9/27 registered, one FULL stance (Binding), SEG and
REC at zero coverage** — and the zeros were false as capability claims:
nine real, tested, running organs existed unregistered.

### The connection

Ten rows joined `capacities.js`, every one a verified export and
mechanically domain-legal, each `what` naming whether its cell is
DOCUMENTED in the organ's own code/header (`network` — CON·Pattern, the
cell P58 built it for after the emptiness was confirmed; `patch`,
`extent`, `rezero`, `reshape`, `hear`, `declare`, `standing`) or REASONED
per the registry's own original hand-check discipline (`compile`,
`regime`). After: **19/27, no operator at zero, three FULL stances
(Binding, Making, Composing), no empty stance** — marginals moved from
Figure 5 / Ground 2 / Pattern 2 to Figure 8 / Pattern 6 / Ground 5.

### The law this pass earned

**An empty cell is a lead, never a verdict — and the holes come in three
kinds that share one count**: registry debt (an organ exists, nothing
declared its cell — 10 of the 18 "empty" cells, more than half),
real incapacity (convictable only via a stated-then-confirmed falsifiable
prediction — CON·Pattern's zero-edges page remains the only cell that
ever earned it, and the organ built in answer now fills it), and probe
error reported as incapacity (P44's four wrong probe versions; "a
statement about a path" reported as a statement about the system). The
constitutional line — withhold or convict, never manufacture conviction
from absence — applied to the capability map itself.

### The plan

`CAPACITY-DEVELOPMENT-PLAN.md` (repo root): per-cell plans for the eight
still empty. Tier 1 (candidates in this repo with measured specimens):
NUL·Figure is P22's own named clearance-test integration and the last
Dissecting cell; SIG·Ground has two live candidates (`searchedVoid`,
`whatWouldSettle`); SIG·Pattern + NUL·Pattern are the kinds
induce/null-arm pair, gated on one legacy-engine-path decision. Tier 2
(design work before nomination is honest): CON·Ground and INS·Ground
gated on the fold-architecture session's boundary; DEF·Ground lacking
even a workable specimen; SEG·Pattern the one genuine no-candidate
frontier (network decomposition), with its specimen named (a two-topic
document's belief graph separating at the boundary the atmosphere read
already finds in the stream).

**Files.** `capacities.js` (10 rows + the connection-pass header note);
`eval/capability-coverage.mjs` (debt ledger with per-organ `paid` flags,
the three-hole rule, CON·Pattern's closure recorded on its historical
conviction); `REASONING-POLICIES.md` / `GENERATION-POLICIES.md` /
`CAPABILITY-POLICIES.md` (all corrections + amendments);
`CAPACITY-DEVELOPMENT-PLAN.md` (new). Suite: unchanged failure set,
confirmed by name.

## P65 — the development pass: Tier 1 built, the frontier cell built, and the map at 24/27 (2026-08-29)

**The ask, verbatim: "build it" — CAPACITY-DEVELOPMENT-PLAN.md's own
order of work, executed.** Three genuinely new organs and two
registrations of already-tested code, each landed with conformance tests
whose walls are shown to FIRE (R17: a wall nothing can trigger is a
comment), and the whole move measured by re-running
`eval/capability-coverage.mjs` live rather than hand-tallied.

**The measured move.** 19/27 → **24/27 cells, 0 illegal, 25 registry
entries. Six FULL stances** (Dissecting, Unraveling, Tracing joined
Binding, Making, Composing), **Figure and Pattern grains complete at 9/9
each**, every mode at 8/9, zero operators at zero coverage. The three
cells still empty — CON·Ground, DEF·Ground, INS·Ground — are EXACTLY the
plan's gated three (two waiting on the fold-architecture session's
boundary, one on a workable specimen), and they are all Ground-grain, one
per mode: the whole remaining gap is the Ground row. That was not
designed; it fell out of the arithmetic, and it reads cleanly — the acts
this instrument cannot yet perform anywhere are maintaining-the-ground
kinds of act (tending the connective field, defining the interpretive
ambient, generating ground where none exists), while every
Figure-grain and Pattern-grain kind of act now has at least one organ.

**One premise of the plan was WRONG, found by reading rather than
assumed, and the build got cheaper because of it.** The plan gated the
kinds pair (SIG·Pattern + NUL·Pattern) on "the legacy-engine path
question" — registering a module this checkout cannot even read
(`eoreader7/legacy-eoreader6.1`, uninitialised submodule). But eoreader7's
NATIVE kernel already carries full ports: `kind-induction.js`
(`projectKinds`, the induction surface) and `entity-kind-induction.js`
(`induceEntityKindCandidates`, with a BUILT-IN seeded random-subset
binding-energy null per basin — `EONullResult@1`, declared permutations,
0.95 quantile). The gate had already dissolved when the plan was written;
the plan is amended in place-of-record (its own dated status section),
the wrong premise kept visible.

**What was built, and what building it measured:**

1. **`testKindMembers` (eoreader7 `native/kernel/entity-kind-induction.js`)
   — NUL·Pattern.** A DECLARED kind membership challenged against the
   SAME random-subset null the inducer runs on its own basins: the caller
   holds the hypothesis, the field answers. Structural refusals, never
   tuned floors: `unknown_members` (no measurable profile),
   `under_powered` (<2 members — no internal pair exists),
   `no_boundary` (members = whole population — the null cannot perturb;
   A10's licensing rule applied as a refusal). `cleared` mirrors the
   inducer's own gate exactly (`bindingEnergy > 0` AND the null passes);
   a failing declared set is a VERDICT with the measurement attached,
   never a refusal. 7 conformance cases in
   `native/tests/entity-kind-membership.test.js`, built through the REAL
   `createKindInductionIndex`/`indexKindEntries`/`kindEvidence` path (no
   hand-typed Map): the planted cluster clears, a scattered set fails as
   a verdict, all three refusal walls fire, the inducer and the declared
   test AGREE on the same field (cross-organ agreement), and the seeded
   null is deterministic. eoreader7 suite 171/167/4 → 178/174/4, the same
   4 failures by name.

2. **`clearance.js` (the-fold) — NUL·Figure, P22's own named next
   integration** ("the figure doesn't clear it"), built against the
   NATIVE adapters. The load-bearing discovery, found by reading the
   adapter before writing: native `extractSurfaces` ALREADY refuses
   sentence-initial capitalisation at extraction itself
   (`accumulateSurfaceEvidence` skips the sentence-initial token — "it is
   capitalised by position and carries no evidence of namehood on its
   own", L2 closed at the presence rung). So the position scan the plan
   sketched was never this organ's to build; clearance's real content is
   the ESTABLISHMENT LADDER over the presence set — P38's
   presence-vs-establishment distinction, mechanized: presence
   (`no_presence` for the sentence-initial specimen), the material's own
   derived recurrence floor (`below_recurrence_floor`, the floor
   disclosed by MEASUREMENT — bounds observed from the organ's own
   behaviour, never re-derived), ambiguity carried as a typed withholding
   with candidates (never a third being), and a pronoun rung that runs
   ONLY under declared numbers (`minActivation`/`minMargin`, the organ's
   own wall) with a TYPED SKIP otherwise — `skipped_no_organ` /
   `skipped_undeclared`, never a pass (P41), and a skip can never
   upgrade a standing to `bound`. Referent-fence overrides are the
   adapter's own declared parameter surface, forwarded verbatim and
   ECHOED on the result (`referentOptions.declared`) — derived-vs-declared
   always visible. Disclosed absence, stated in the header: no
   constructed-null clearance exists for referent establishment — the
   floor is a measured bar, not a perturbation arm; P29's search already
   found no licensed text perturbation and none is invented here (the
   kinds pair is where a declared membership DOES get a real null). Two
   fixture findings measured before pinning: the ambiguity branch is
   unreachable through DERIVED fences at fixture scale (the adapter's own
   conformance test declares `{minPartners: 2, minSentences: 1}` for the
   same reason — adopted, echoed, disclosed), and the pronoun organ binds
   by CAUSAL THEMATIC RECALL (its own tests' physics), so `bound` is
   reachable only where the pronoun's sentence carries the referent's
   thematic company — "He answered every question" after Johnson
   sentences is correctly `pronoun_no_candidate`, the adapter's own
   "unrelated pronoun material is refused rather than guessed" case
   reproduced independently. 9 conformance cases, all against the real
   adapters.

3. **`unravel.js` (the-fold) — SEG·Pattern, the plan's one no-candidate
   frontier cell.** Parameter-free network separation at the graph's own
   bridges: a structural fact, not a score, so there is no
   community-detection threshold to tune and none is invented — a
   2-edge-connected network is a typed `no_seam` refusal, never a cut
   bought with a parameter. Iterative Tarjan over EDGE ids, not parent
   nodes: the textbook parent-skip calls a PARALLEL crossing a bridge,
   and the defect was PLANTED to prove the wall — the parent-skip variant
   ships the false seam `a1-b1#6` on the two-parallel-edges graph, the
   shipped walk refuses it, and the test discriminates. Deterministic
   under input order (sorted adjacency, sorted roots, sorted outputs);
   cut edges addressed by the caller's own indices with the edge object
   carried verbatim (provenance to whatever the caller's edges carry);
   already-separate material reports its own parts with `cutEdges: []` —
   nothing cut, and the result says so. The organ's CODE is scanned by
   its own test for domain vocabulary (the grain-refinement discipline)
   — nodes are opaque ids. 10 conformance cases. Named, unmeasured next
   specimen (the plan's own): a real two-topic document's belief graph
   separating at the same boundary `atmosphereBoundaries` finds in the
   stream — the alignment run is future work, not implied done.

4. **Two registrations of already-tested code:** `settle` (SIG·Ground —
   `void-loop.js::whatWouldSettle`, P53's second amendment, typing
   reasoned per the registry's hand-check discipline) and `kinds`
   (SIG·Pattern — native `projectKinds`). These plus `kindnull` are the
   registry's first rows naming eoreader7 native modules; the `module`
   column stays what it always was — a resolvable pointer, data — and
   asking capacity-runner to execute them still returns
   `not_yet_executable`, never a silent no-op.

**Cell typings, all mechanically domain-legal (verified through the
native cube — 24 covered / 3 empty / 0 illegal):** `clear` NUL·Entity and
`unravel` SEG·Network carry CELL exports in the organ's own code (the
native adapters' own convention — relations.js/spans.js/pronouns.js/
surfaces.js/activation.js all stamp theirs); `kindnull` NUL·Kind is
documented in `testKindMembers`' own docstring; `settle` and `kinds` are
reasoned rows, stated as such.

**Evidence.** the-fold suite after this pass: 1093 tests / 964 pass /
127 fail / 2 skipped — the 19 new cases (9 clearance + 10 unravel) all
passing, and all 127 failure NAMES byte-identical to the standing
environment baseline (`before-names.txt`, diffed name-by-name — the
uninitialised `legacy-eoreader6.1` submodule set this checkout has always
carried), zero regressions. eoreader7: 178/174/4, same 4 by
name. `eval/results/capability-coverage.json` regenerated by the live
driver. moves.test.mjs's counts updated 19/8 → 24/3 with the history
kept in its own comment; its exact assertions verified against the live
registry through the native-cube shim (this checkout cannot run its
legacy imports), printed `assertions would pass: true`.

**What 24/27 does NOT mean, restated so nobody inflates it (CAPABILITY
C7, unchanged by this pass):** every KIND of act except the three Ground
gaps is now performable SOMEWHERE — not that any is performed correctly
(coherence < correspondence; the oracle rule stands), and not that each
organ reaches every ORDER of task (the MHC axis is separate). And the
registry rows are typed pointers: `clear`, `unravel`, `settle`, `kinds`
and `kindnull` execute from their own modules and tests, not yet from
the terminal's capacity-runner — wiring them into `runCapacity` is
real, named, unattempted work, exactly the boundary P22 drew for the
other reference-only rows.

### Amended same day — the adversarial pass reported, two real findings closed by mutation-killing pins

The verification the entry above declared pending completed: four refuters
(one per organ, one over every doc claim; 4/4 done, 93 tool calls), and
the pass EARNED its cost — two REAL findings, each fixed and pinned by
the exact mutation that had survived:

1. **clearance.js's rung had an untyped third state** — organ injected,
   numbers declared, presence empty → `pronounRung: null`, neither `ran`
   nor a typed skip: precisely the P41 hazard shape the entry above
   invokes as the wall. Fixed: the empty-presence path now RUNS the rung
   over an empty referent map (the organ's own typed gaps are the honest
   answer — measured: `{ran: true, bindings: 0, gaps: 2}` on pronoun-rich
   lowercase material), one shared `runPronounRung` implementation for
   both paths. And the refuter PROVED by mutation that the
   ambiguous-exclusion wall was untested (deleting it passed all 9
   tests); the killing assertion is pinned — under the mutation the suite
   now fails, restored it passes.
2. **testKindMembers' disclosed non-positive-binding decision was
   unpinned** — the "scattered" fixture's binding was accidentally
   POSITIVE (+0.034, failing only via the null), so an inducer-literal
   gate (refuse instead of measure) survived all 7 tests. Pinned with a
   genuinely repelling pair (`["e1","b8"]`, binding −0.172): measured,
   never refused, cleared false — Mutation B now fails the suite. The
   `bindingEnergy > 0` conjunct is disclosed in the test as
   belt-and-braces (the null's own construction makes passed-with-
   non-positive-binding structurally near-unreachable, so no honest
   fixture pins that half in isolation). Plus a third disclosed decision
   added to the docstring: the two doors share the null's PROTOCOL, not
   its draws (shared draws would make the cross-organ agreement test
   circular).

Nits taken in the same pass: the floor-refusal detail no longer claims
"derived" under a caller-declared floor; the pronoun-declaration gate
mirrors the organ's own walls exactly (non-negative, minMargin ∈ [0,1] —
a declaration outside them is a typed skip, never a mid-run throw);
unravel refuses `malformed_edges` by the caller's own indices instead of
coining a phantom node, `cutEdges` no longer aliases `bridges`, string-id
comparison is disclosed in the JSDoc, and a bowtie pins
articulation-reported-on-refusal; the coverage driver's header line about
SEG/REC reading zero is past-tense (it described the pre-P64 state).

**Final measured state after the amendments:** the-fold 1098 tests / 969
pass / 127 fail (names byte-identical to baseline); eoreader7 180 / 176 /
4 (same four by name). Test deltas over the entry above: clearance 9→11,
unravel 10→13, entity-kind-membership 7→9.

**And the pass's own material demonstration** (user direction: "read
something highly complicated and show me the reasoning"):
`eval/complicated-reading.mjs` + `eval/results/
complicated-reading-RESULTS.md` — the new cells run in sequence over the
live-fetched Second Schleswig War article (48KB, Palmerston's "only three
people ever understood it"): 84 established / 258 refused / floor
observed at 1<2; two real pronoun bindings at the declared numbers, BOTH
kept as instructive mistakes with the mechanism's own explanation (the
organ's documented `nonPersonal` parameter, undeclared by this driver);
578 edges heard with the P56 ceiling shown as heard; the belief graph
gated by clearance cut at 16 seams; and the kinds pair discovering the
Danevirke rear-guard's micro-geography (bustrup/selk/stockfleth_company/
vedelspang, p=0.008) from co-arrival structure alone, with the declared
door confirming it and the scattered control refused clearance at
p=0.264.

## P66 — co-presence is evidence, never an answer; and a ratio that hides its variance (2026-08-29)

**What landed.** `eoreader7/native/kernel/contest.js` — a medium-general
adjudicator, plus its 18 conformance tests — and the two DECLARED,
default-off parameters that wire it into `adapters/text/pronouns.js`.
Absent both, shipped behaviour is byte-identical and `pronouns.test.js`
passes 9/9 unchanged, so every prior measurement in either repo keeps its
denominator. Three re-runnable eval drivers and their results documents
land beside them in this repo.

**The defect the kernel names.** `resolvePronouns` refused, categorically,
any frame carrying a named surface (`if (named.size === 0 && ...)`). That
veto is text-shaped twice — it names "a named surface," and it treats
co-presence as disqualifying rather than as a difference to be weighed.
On encyclopedic prose that is most of the material, so a reported
`bindings: 0, gaps: 6` was a handful of gaps standing in for a hundred
chances, with the denominator stated nowhere. The fix moves the decision
into the kernel and makes co-presence a STANDING: a frame carrying
competitors must clear a stricter declared bar. **Co-presence raises the
BAR; it never raises a SCORE** — an unactivated co-present candidate still
loses, so nearest-name binding, which `pronouns.js`'s own header refuses
by name, is not smuggled back in through the kernel. Medium-generality is
asserted mechanically, not claimed: the test reads the kernel's own
executable body and fails if *sentence*, *pronoun*, *surface*, *token*,
*word* or *text* appears in it, and the same adjudicator is exercised
unchanged on an unlabelled gaze across two faces and an unattributed motif
across two instruments.

**Every return now carries a `regime` block** — which criterion ran, and
how many frames carried a pronoun, carried competitors, and were actually
adjudicated. A caller can no longer read a binding count without being
told the denominator that produced it. One development failure is
load-bearing and recorded: filing a gap for frames the refused regime
never adjudicated broke `gaps.length === 0`, and that was the design being
wrong. **A gap is a refusal the organ REACHED** — "I read this and could
not decide" — never a frame that was never read. The denominator belongs
in a count of frames, where it cannot be mistaken for a verdict.

**Both regimes it enables were measured, and both are OFF by default.**
The constant-bar regime (`contestedMargin`) is REFUTED and kept only as
the named control arm: a margin compared to a constant rewards a sparse
field, so scrambling a material — which destroys the coherence one-hop
recall is supposed to read — RAISES the mean margin (0.028 → 0.053;
0.047 → 0.073). `minMargin` measures separation, not evidence, and cannot
tell a well-supported winner from a lonely one. The permutation-null
regime (`nullTest: {draws, seed, alpha}`) is the fix for that and it
works: the anti-lift pathology is gone, encyclopedic zeros become honest
zeros, Aristotle separates 3/0. It is still not adopted as the default,
because it did not raise novel lift (1.31x → 1.24x; Pride 1.03x →
**0.56x**) and its survivors are rare-referent self-echo, which clears a
permutation null without being comprehension. **The bottleneck is the
SIGNAL, not the criterion** — one-hop lexical recall at sentence grain
carries too little identity information for any verdict rule over it to
become reading. Third independent measurement to land on that line;
`surfaces.js`'s MODEL-tier fence is confirmed, not challenged.

**The landing-time finding, which is this policy's second half.** The
drivers were rewired from the originating session's absolute paths to the
repos, and re-run. `writer-decay-genre.mjs` reproduces exactly.
`null-criterion.mjs` reproduces exactly on its four `live_priors`
materials. `contested-copresence.mjs` disagreed with its own results
document on one of two texts — a lift of 3.00x where the document reports
0.82x — and chasing that rather than reporting a reversal found the real
defect: **the lift is computed against ONE shuffle, and at these counts
one shuffle decides it.** Real bindings fixed at 12 while the shuffled
count swings 4 → 13 across twelve seeds; band 0.92x–3.00x, numerator never
moving. `0.82x` and `3.00x` are two draws from the same noise. The
refutation is carried by the other text and by the margin measurement, and
never by that lift.

**The rule.** A count that hides its denominator misleads — that is what
the `regime` block was added for. **A ratio that hides its variance
misleads the same way, and a null drawn once is a null drawn zero times.**
The driver now draws its null over a declared seed set and reports a band,
with a third verdict for a band that straddles 1, which is the discipline
`nullAdjudicate` already holds one layer down (draws declared, never one)
applied to the ratio the driver itself reports. A single-shuffle lift is
not a measurement and must not be printed as one.

**Disclosed, not smoothed over.** Two of the three drivers read materials
that no longer exist — plain-text extracts from a session's `/tmp`. The
only copies this repo commits are the raw article fixtures, read through
`web.js::extractReadable`, which carries the page's navigation, category
and reference chrome as well as its body (1,493 frames against 305; 1,077
against 314). So those runs' counts are records, not things this repo can
re-derive, and each results document now says which of its rows reproduce
and which do not. A Wikipedia-body extractor was considered and refused on
the repo's own standing grounds — per-site formatting rules are the trap
`succession.js` is condemned for. And one inconsistency inside the bundle
itself is named rather than edited away: `contest.js`'s header motivates
itself with Borodino at 113 pronoun-bearing frames, 99 co-present, where
the results document reports 75 and 69 for the same article. Both are
measurements on differently-extracted copies that are now gone; a header
comment recording a measurement is not something to adjust to match a
different one.

**Enforced.** `eoreader7/native/tests/contest.test.js` 18/18,
`pronouns.test.js` 9/9 unchanged. eoreader7 native suite 212/202/10 →
230/220/10, failure names diffed rather than counted: identical set, the
standing uninitialised-`legacy-eoreader6.1` failures, zero regressions.
the-fold suite 1039/912/125 before and after, failure names identical
(117 of the 125 are that same submodule).

## P67 — a reading is Talmud, not a cache: what the priors app may and may not do with one (2026-08-29)

**live_priors' own `POLICIES.md` (LP1–LP5) is the law here; this entry is the
pointer, and the constraint on THIS repo's code.** The corpus repo now
carries standing policy on what a corpus owes a reading and what a reading
owes a corpus. Two of its entries bind files in this repo directly, so they
are restated here rather than left one repo over where a session working on
`explore-server.mjs` would never see them.

**The frame.** A reading of a source is not a summary, a cache, or a
substitute — it is a record of an encounter with it by a named reader, and it
relates to the source the way commentary relates to a fixed text: anchored to
a locus, attributed to a reader, accumulating rather than overwriting. A cache
is regenerated when the code changes; **a record is appended to.** The
mechanism is already built — `hyperlexicon.js::hear` does PROPOSE on a first
sighting and SUPERSEDE on a later one, and its own line 128 states the
invariant: *"Witnesses and spans UNION, never replace."*

**The rules that bind this repo** (LP4 in full):

- A reading may be **offered** beside a source, typed as a reading, its
  recipe named.
- A reading may be used as an **index or accelerator** — to rank candidates,
  narrow a walk, decide where to look — **provided any result reached
  through it is re-verified against source bytes before it is asserted.** A
  reading may decide where to look; it may never decide what is true.
- A reading may **never be served in place of source bytes**.
  `/api/priors/doc` (`explore-server.mjs:1354`) reads the file and serves
  it, consulting no reading and no index. That is already correct; LP4 makes
  it a rule rather than an accident.
- A reading may **never gate** what the corpus offers. Whether a document is
  listed, toggleable, attachable or consultable must not depend on whether a
  reading of it exists or on what it found. **A document with no reading is
  not a document with nothing in it** — this file's own constitutional
  statement about checking organs (withhold vs. convict, the grounding-ladder
  section) applied one level out: absence of a reading is a fact about the
  reader, never about the document.

**The measured reason the last rule is not theoretical.** Six of fourteen
sources in `live_priors/digested/` carry little or nothing, and three of
those are worse than empty — the "content" is English caption debris. The six
Hebrew surfaces were `School`, `Athens`, `Raffaello`, `Internet`: an image
caption, never the article. Hardcoded as what the app knows, that reading
would have advertised those as the subject of a Hebrew philosophy article.
`scriptCoverage` (eoreader7 S24) now types exactly that as a gap.

**What this unblocks, named because this repo's own code names it as open.**
`/api/priors/check`'s header (`explore-server.mjs:1408`) records the cost —
2,047 documents, 183.4MB, a full sentence walk at ~9s per claim, so the check
consults only a ranked candidate slice — and says a proper index is future
work *"whose persistence and staleness story this server does not own."*
**That blocker is staleness, and the Talmudic frame dissolves it:** a reading
taken under an older recipe is not stale, it is older, and still a true record
of what that reader heard. Nothing is invalidated when the organs change; a
layer is added.

**Two prerequisites, in order, before any of this is built here** (LP3, LP5):
a reading's addresses must resolve in the source's own coordinates — measured
today, they do not, and resolve only inside the excerpt the digest carries —
and a reading must carry a content-addressed **recipe identity**, since the
witness currently names what was read and never who read it. Append-only
without attribution is strictly worse than an honest overwrite: it looks like
an accumulating record while being an unreadable one.

**Amended same day — the second prerequisite is built (2026-08-29).** See
P68 below: `hyperlexicon.js` now has `recipeId`, a real no-op fix on `hear()`
this recipe-identity work exposed, and a `vocabulary.candidates` disclosure
LP2's own consumer (live_priors' corpus-wide sweep) needed to tell "genuinely
nothing to hear" apart from "heard something, none of it cleared a floor."

---

## P68 — Recipe identity, a real double-counting bug it exposed, and nominated-vs-cleared

LP5 (live_priors, above and its own file) named recipe identity as the
missing primitive append-only depends on: a witness must name WHO read, not
only WHAT was read, or two passes under different organs land as an
unattributable pile rather than distinguishable increments on one log.

**`hyperlexicon.js::recipeId(descriptor)`** — SHA-256 over a canonicalized
JSON encoding of whatever descriptor object a caller declares (which organs
ran, which priors were injected, which were omitted, and — as of the
live_priors POS-gate pass this same day (its own POLICIES.md, LP6) — the
exact git-commit state of every repo whose code shaped the reading). A
witness is now `slug@recipeId`, never bare `slug`: two independent recipes
that both heard the same fact land as ONE note with TWO witnesses (LP2's
own union rule), which is cross-recipe corroboration for free, and a recipe
change is visible in the log rather than silently indistinguishable from
the recipe that produced the entries beside it.

**A real bug, found while wiring this, not designed around in advance.**
Re-running the SAME recipe against UNCHANGED bytes doubled the log on every
call — `hear()` had no notion of "this witness already said this and taught
me nothing new." Fixed: `hear()` now no-ops (returns the log unchanged) when
a re-sighting's own witnesses and spans add nothing the prior admission did
not already carry — checked structurally (witness count and span count both
unchanged), never by re-deriving the resulting text and comparing it. This
is the general form of the append-only discipline LP2 already states
("a recipe that hears nothing appends nothing") — applied at the granularity
of one already-admitted note re-heard, not only at the granularity of a
whole reading.

**`hypergraph.js::relationsFor`'s `vocabulary.candidates`** — found missing
by task #9's own adversarial audit (the-fold's own CLAUDE.md, "the
hyperlexicon, the move space, and navigation" section, and the SBLGNT
Greek New Testament apparatus specimen it names): `vocabulary.verbs: 0`
reads identically whether `discoverRelationVocab` genuinely found NO
candidate (an apparatus/table/record-block shape, not prose) or found real
candidates that simply never cleared the recurrence floor — two different
facts about the material a caller could not tell apart from `vocabulary`
alone. `candidates` is `discoverRelationVocab`'s own full nominated count,
before any floor; under this repo's own default configuration
(`MIN_SURFACES_PER_VERB=1`), `candidates === vocabulary.verbs` always,
UNLESS a caller also supplies `posPriorFor` (below), in which case the two
now genuinely diverge — the field was always going to matter once a real
gate existed to make it matter, and it was added before that gate was
wired anywhere, on the strength of the adversarial audit's own finding
alone.

**Consumed the same day by a sibling repo, not merely built and left.**
live_priors' `eot-digest.mjs` reads `vocabulary.candidates` directly (its
own `contentWithoutRelations` disclosure — real content found, the relation
tier heard nothing, an honest fact distinct from "this document is empty")
and its full corpus sweep is the first real, at-scale exercise of
`recipeId`/`hear()`'s no-op fix across 2,208 sources, 38,032 self-verified
spans, zero collisions or double-counted admissions. Full account,
including the POS-gate fix this same recipe-identity work made possible to
disclose honestly (a changed recipe's hash moves, so a reader can tell
which sweep produced which admission): live_priors' own POLICIES.md, LP6,
and `POS-VOCABULARY-GATE-VALIDATION.md`/`eot-sidecar-sweep-v2-RESULTS.md`
there.

**What is NOT claimed.** `hypergraph.js`'s own `posPriorFor` gate
(`discoverRelationVocab`'s `posPrior` param, gating candidate-verb
admission at a majority vote over the real UD_English-EWT treebank) already
existed in this repo before this pass — nothing in `hypergraph.js` itself
changed to make the gate WORK; what changed here is `vocabulary.candidates`
existing to disclose the gate's effect once a caller (live_priors) actually
wired it in. The gate's own wiring decision, its validation, and its two
disclosed limits (English-only; bounded by the treebank's own vocabulary
size) are entirely live_priors' own driver-side work, not this repo's.

## P69 — The ratchet, finished for the text tier: nine legacy imports crossed to native, one disclosed holdout

eoreader7's own README states the condition its ratchet requires: "a
compatibility subsystem may be retired only when its native replacement
passes behavioral/conformance tests." Before this pass, that ratchet had
never actually been pulled anywhere — `native/` was real (43 kernel
modules, 20 text adapters, its own conformance suite) but nothing in this
repo's runtime had crossed to it except two bare symbols (`cellOf`,
`GRAINS` from `kernel/cube.js`) and a namespace import
(`kernel/task-log.js`) app.js already carried, sitting beside — not
replacing — ten separate `/engine/` imports of the frozen provider,
including two genuine duplicates: `operators.js` alongside `cube.js`, and
`holon/task-log.js` alongside `kernel/task-log.js`. Two implementations of
the same two things, live in one file — the exact drift class this
document's own postmortems keep catching (P22's `Array.find`, P24's
runtime ternary, P25's `sqlSnapshotFields`) caught here across two engine
generations instead of two branches of one function.

**The gate, run before anything moved.** Parity first, never assumed: both
implementations of all six shared text organs (`spans`, `surfaces`,
`pronouns`, `relations`, `priors`, plus the operator/task-log algebra) were
run over the same real fetched Wikipedia material (War and Peace,
Battle of Borodino) and diffed. `splitSentences`/`looksLikeMaterial`/
`stripContainer`/`deriveAbbreviations`/`extractSurfaces`/`diaNorm`/
`namesCorefer`/`discoverRelationVocab`/`extractRelations` — byte-identical.
`discoverReferents` differed only in ORDERING (183/183 identical names on
War and Peace; on Borodino, native correctly REFUSED `"Alexander"` as a
typed `ambiguous_surface` gap the legacy provider silently admitted — S17's
fix, working). `resolvePronouns` was proven ADDITIVE, not merely similar:
stripped of native-only disclosure fields (`p`, `coPresent`, `barApplied`,
`regime`), every binding and every gap matched legacy exactly, field for
field, on both fixtures — `legacy-only key paths: []`. The operator/
task-log algebra (`isProductionOrder`/`isGrainProgression`/
`checkCubeProgression`) was checked exhaustively over all 81 operator pairs
plus junk inputs (106/106 agree) and against a hand-built log exercising a
clean thread, a reversal, and a coarsening — flags byte-identical. This is
the standard the migrationLaw section of `eoreader-contract.json` now
states explicitly, added by this pass: "a crossing is only real once
measured... an export list matching is necessary, never sufficient."

**What crossed.** `app.js`'s `/engine/` surface: `perceiver/text/segments.js`
(`lineIndex`, `outlineOfIndex`), `spans.js` (`splitSentences`), `surfaces.js`,
`pronouns.js`, `relations.js`, `priors.js`, `wordclass.js`, `operators.js`,
`holon/task-log.js` — nine imports, now zero. All now resolve through
`/engine-v7/`, eoreader7's native kernel. Three genuine gaps were closed,
not glossed:

1. **`segments.js`/`wordclass.js`** had no native equivalent at all — moved
   into `native/adapters/text/` byte-for-byte (both organs' whole remit is
   FORM, and v7's cut changed nothing about form; rewriting an organ with
   no pending redesign would break parity for nothing).
2. **`checkCubeProgression`/`isCurrentOperator`/`STRUCTURE_OPERATORS`** did
   not exist on `native/kernel/task-log.js`/`cube.js` — added there, built
   from primitives the native module already held (`GRAIN_RANK`,
   `OPERATOR_ORDER`), not restated. `isProductionOrder`'s native version
   compares `OPERATOR_ORDER` positions directly rather than reaching for a
   `validateChain` helper to answer a two-element question — verified, not
   assumed, by the exhaustive pairwise check above.
3. **`blankLabelRows`** did not exist ANYWHERE — not on the frozen
   provider, not on native. `app.js:147` imported it as a named ESM
   binding from `/engine/perceiver/text/spans.js`, which is a link-time
   error: the whole module graph was unloadable the moment a browser
   actually tried to boot this page. Found in the first five minutes of
   this pass, before any deliberate work began. The organ it names — a
   length-preserving table blanker so a clause extractor doesn't read a
   flattened Wikipedia infobox as prose — is a the-fold concern, never an
   engine one (infobox furniture is not a fact about language), so it now
   lives in `source.js`, declared per this repo's own P4/P9 discipline
   (`minRun`/`maxCell`, no defaults). Validated against the REAL fetched
   Hannibal Hamlin page (the specimen P50 already used): zero
   sentence-ending lines ever touched, hard-wrapped Gutenberg-style prose
   spanning multiple short lines left completely untouched (the control
   that matters — the same newline-crossing assumption P50's own specimen
   depends on), 44.6%/10.4% of two real Wikipedia pages correctly
   identified as table furniture.

Two more real, small closed classes were added to native's
`adapters/text/priors.js` because `web-claim.js`'s `declaredSlotShape`
already required them and nothing on any engine path had ever supplied
them: `INTERROGATIVE_PRONOUNS` (a Map, English's seven wh-words each glossed
to the kind of filler they ask for — "who"→"person", giver `lang/en`) and
`MANNER_REASON_PRONOUNS` ("how"/"why", which ask for an explanation rather
than a filler and must refuse a slot outright rather than open one nothing
can fill). Their absence meant `web-claim.test.mjs` had been failing for a
real reason this whole time — not one of this repo's disclosed
environmental gaps.

**What stayed, disclosed rather than silently ported shallow.**
`emergence/tiers.js` — the self plane's surprise meter (`reflex.js`/
`aperture.js`) — remains on `/engine/`. It stands on
`emergence/surprise.js` and, through it, `nul/index.js`: 1,306 lines, the
engine's entire statistics/perturbation subsystem (the `LICENSED` table,
~20 typed gap types). Native's own `dynamics.js::deriveSurprise` is not a
substitute — it is a structurally different mechanism (delta/operation-
based, keyed to `EOTransformation` records) from the Bayesian
tier-stack-plus-null-corrected-surprise design the self plane is built on.
Porting `nul`/`tiers`/`surprise` faithfully, with its own parity gate run
against real material, is a pass on the scale of this whole one — not a
rider tucked inside it. This is the one remaining `/engine/` import in
`app.js`, stated in the code at its own import line, not left for a reader
to discover by grepping.

**A second server needed the same mount, found by the crossing itself.**
`explore-server.mjs` — which this repo's own CLAUDE.md already documents
serving the chat page whole ("without that mount the chat page half-loads")
— had no `/engine-v7` mount at all. `serve.mjs` had carried both `ENGINE`
and `ENGINE_V7` since before this pass; `explore-server.mjs` only ever grew
`ENGINE`/`NUL`/`PRIORS_DATA`. Once app.js's crossing made `/engine-v7`
load-bearing rather than incidental, this became the identical two-server
drift class named above, one mount short. Fixed by mirroring `serve.mjs`'s
exact pattern (`ENGINE_V7 = path.resolve(ROOT, "..", "eoreader7", "native")`,
checked first in the routing chain since `/engine-v7/` does not collide
with the `/engine/` prefix test — confirmed, not assumed:
`"/engine-v7/...".startsWith("/engine/")` is `false`). Verified by
extracting the routing algorithm into an isolated harness and running it
against real disk paths (every `/engine-v7/…` and `/engine/…` case
resolves and exists; path-traversal cases stay contained under `ROOT`,
unchanged from the pre-existing behavior). A full live boot of
`explore-server.mjs` could not be completed in this environment — it
imports `packages/host/index.js` at module top level, which re-exports
from `packages/host/assertion-resolution.js`, a file in the FROZEN
`legacy-eoreader6.1` submodule (pinned commit
`e20e441d3cdfb735d605c75037e6d73892e707c0`) carrying a genuine, pre-existing
syntax error (12 open parens, 11 close, confirmed by direct count) that
predates this pass entirely and is unrelated to it — `serve.mjs` never
imports that path and was unaffected. This is disclosed rather than
silently patched: Constitution I.2 holds legacy as frozen reference, and a
bug in the pinned commit is a decision for whoever owns unfreezing it, not
a side effect of a ratchet pass.

**`app.js`'s own live boot was verified end to end, not just parsed.**
`node --check` is necessary and was insufficient by itself, so a real
headless Chromium (already vendored in this environment,
`PLAYWRIGHT_BROWSERS_PATH`) was driven directly over CDP — no Playwright
package needed, Node 22's own native `WebSocket` speaks the protocol
directly — against a real `serve.mjs` instance with every mount live.
Result: zero console errors, zero uncaught exceptions, and the four
network failures present were exactly the four pre-existing, unrelated,
already-documented 404s (`node_modules/katex`, `mathjs`, `monaco-editor` —
this checkout has no `node_modules`). A second CDP check confirmed the page
did not merely parse but actually BOOTED — the `#not-served` banner (which
this repo's own boot code only removes once its module execution
genuinely completes) was hidden, and the composer existed in the live DOM.

**`eoreader-contract.json` — the file whose own stated purpose is "what
EOReader 7 must satisfy for The Fold before native v7 migration begins" —
is updated to say a migration happened, not left to silently describe a
state that stopped being true.** `runtimeConsumers.browserEngineModules`
now lists exactly the one holdout (`tiers.js`); a new
`runtimeConsumers.browserNativeModules` records the nine crossed imports,
with a new `eoreader-contract.test.mjs` case mirroring the existing
legacy-side test exactly — so a future silent re-widening of either
surface fails loudly instead of drifting unnoticed, the same posture the
pre-existing test already held for `/engine/` alone. `filesystemMounts`
gained `"native"` for both servers. `migrationLaw` gained the parity-first
rule stated above.

**Measured, not assumed, that nothing broke.** Full suite, failure names
diffed rather than counted (this repo's own standing rule, stated for
every prior pass in this document): the-fold, 1467→1468 tests (one new
contract case), identical 45-name failure set before and after — every one
of the 45 a pre-existing, already-documented environmental gap
(`store.test.mjs`/`store-sql.test.mjs` missing vendored `sql.js`,
`webllm-rung.test.mjs`/`measure.test.mjs` missing model files,
`constitution.test.mjs`'s one II.13 case missing vendored `monaco-editor`,
and one unrelated pre-existing contract case naming `explore-worker.mjs`).
eoreader7 native's own suite — all 45 test files under `native/`, both
`.test.mjs` and `.test.js`, `eval/` drivers excluded per this repo's own
convention that those are re-runnable measurement drivers rather than
committed regressions — 320/320 passing, zero failures, including
`native-boundary.test.mjs` (no legacy import anywhere in `native/kernel/`)
and `text-boundary.test.mjs` (the identical check over
`native/adapters/text/`) — the ratchet's own two structural walls, both
holding after two new files landed inside the tree they scan.

**One condition of this pass, stated so it is not silently assumed to
extend further, and not overstated: the `legacy-eoreader6.1` submodule was
UNINITIALIZED in THIS session's checkout at this pass's start** (the
directory held nothing — no `.git`, no files). This is a fact about how
this particular container was provisioned, not a claim about what any
prior pass's environment looked like — the "108/113/114/118/119/127
pre-existing failures" figures this document accumulates across earlier
sessions name specific, well-understood gaps (`sql.js`, model files,
vendored `monaco-editor`) that presuppose the submodule WAS present, so
this checkout's uninitialized state is not offered as their explanation.
What it does explain: `git submodule update --init --depth 1` is what made
the parity measurement above possible at all in this session, and it is
what surfaced the `blankLabelRows` and `assertion-resolution.js` findings —
both structurally undiscoverable from a checkout where the file they live
in was never actually on disk. This session's own baseline, measured AFTER
initializing, is 45 failing (the-fold) / 320 passing, 0 failing
(eoreader7 native) — the number this pass's own before/after diff is
anchored to, not a claim about any other session's count.

## P70 — An arm's own null needs an exact form when one exists, not a noisier estimate of it

The MHC battery's order 8 item (`o8-primary`, `eval/mhc-battery.mjs`) checks
axiom 3 with an `arbitrary` arm: redeal the corpus's subjects among its
edges and see whether the specimen's exact `(subject, verb, object)` triple
still turns up. Widening `WORKING_PASSAGES` from 40 to close order 10's own
named gap (no subject+verb slot with two distinct fillers in the smaller
slice) broke order 8 in the same run: the arm's 20-seed Monte Carlo estimate
moved from 0/20 fired to 2/20 fired on the identical specimen, and the arm's
existing criterion — `completed: fired > 0` — read that as axiom 3 failing.

**The diagnosis, and why it is not a text-specific patch.** This question —
does a uniform random permutation of `n` labels (`K` of them equal to the
specimen's subject) place at least one of them onto any of `m` fixed target
positions — has a closed-form answer: a hypergeometric tail,
`P(>=1) = 1 - C(n-K, m) / C(n, m)`. A 20-draw Monte Carlo estimate of a true
rate near 0.6% is not reliably distinguishable from an estimate of a true
rate near 10% — 0/20 and 2/20 are both ordinary outcomes under either — so
"any nonzero count refutes" is exactly the bare-inequality-against-an-
uncorrected-background-rate mistake this document's own aperture.js and REC-
calibration sections (`nul/index.js`'s censored comparisons, `MIN_GROUND`/
`slackRunNull`) already caught and fixed twice elsewhere, found a third time
here. It is not a frequency threshold invented for MHC: it is the same
general principle (never gate a null-corrected question on a bare
inequality) applied to a shape that happens to have an EXACT answer, so
simulation is not merely improved, it is made unnecessary.

**The fix, derived before it was run — never tuned to the score.**
`redealAgainstExactNull` (`eval/mhc-battery.mjs`) computes `n`, `K`, `m`
directly from the real edge set and the exact hit probability via
`hyperAtLeastOne` (log-space `logChoose`, no simulation, no seed, no draw
count to be underpowered at). `completed` (axiom 3 fails) only when that
exact probability clears `ARBITRARY_ALPHA = 0.05` — reused, not invented:
this repo's own standing significance convention
(`network-standing.js::LINK_SPEC`'s draws-199/alpha-0.05 precedent,
`kind-induction.js`'s own default). The construction and the alpha were
both fixed before the wider run; only afterward was the question asked
whether the earlier discrepancy was signal or noise.

**Measured, not assumed.** At the original 40-passage window, the exact
arm reproduces the prior baseline verdict on both fixtures — zero
regression. At full-document scale (`WORKING_PASSAGES` raised 40 → 70,
covering war-and-peace's 61 and borodino's 67 available passages in full,
still a declared cap rather than an assumed wholeness — `totalPassages`
stays reported alongside it for whatever a longer future fixture would
show): the specimen's exact hit probability is 0.0058 (war-and-peace: `n`
=692, `K`=4, `m`=1) and 0.0176 (borodino: `n`=854, `K`=15, `m`=1) — both
comfortably below alpha, both computed from this corpus's own real counts,
not from a smaller, artificially safer slice. The earlier "2/20 fired" was
sampling noise around a true rate under 1%, not a real corpus-size
confound. Order 8 now passes on both materials at the wider window; order
10 — genuinely gated on that same window, not on anything about order 8 —
now has a real specimen and passes on both materials too. Order 7's real
ceiling on Borodino (pronoun binding, unchanged, unrelated to this fix)
still reads `failed`, correctly.

Full suite: 1468/1418/45 before and after — failure NAMES diffed via
`git stash`, byte-identical, zero regressions. Runtime at the wider window:
26.5s for both fixtures, well inside what an interactive re-run affords.

**Scope, stated rather than implied wider.** This closed-form replacement
applies to exactly one arm shape — "does one label land in a fixed target
set under a uniform permutation of a fixed-size population" — because that
is the one question in this file with an exact hypergeometric answer. Every
other `shuffled()`-based arm in this battery (passage reordering, source
grouping, sentence-order word-salad) perturbs something with no comparably
cheap closed form, and a Monte Carlo estimate stays the correct tool there;
nothing about those arms was touched.

**Amended same day — "solid, not padded": the ladder audited order by order, two more vacuous arms found.** User direction, verbatim: *"we must be solid on all levels earlier"* — a direct challenge to the "stage 13" headline the P70 fix above had just produced. Every order's `arbitrary` arm was re-read line by line rather than trusted from its own "passed" verdict, on the theory that P70's own defect (a check that reports the axiom-3-holds answer for the wrong reason) could recur elsewhere unnoticed.

**Order 9 had the identical class of defect, worse in two ways.** Its `arbitrary` arm shuffled the ORDER of the specimen's own `refs` array, then took `new Set(...)` over the shuffled copy — a Set is insensitive to element order, so the computed set was byte-identical to the unshuffled one on every single draw. It reported "0 of 20 fired" on both fixtures, which happened to be the correct axiom-3-holds answer, but as a tautology, not a measurement: no draw could ever have differed. Separately, and unfixable by tuning this arm alone: this driver tags every passage with the SAME source key (one Wikipedia page per material load), so "distinct sources" can never exceed 1 in ANY reading this battery produces — the very distinction order 9's own `organizes` field names ("distinguishes two passages of one source from two sources") has never once been exercised here, a fact about the driver's material-loading, not about a wrong threshold.

Rebuilt around the real question: does the corpus's own distribution of ref-counts-per-edge, arbitrarily redealt to a different edge identity (marginals preserved), still hand the SPECIMEN a count clearing the witness floor by pure chance? This has the identical exact closed form as P70's own fix (a straight proportion, no simulation) — `redealCountAgainstExactNull`, reusing the same `ARBITRARY_ALPHA = 0.05`. Measured, not assumed: the FIRST cut of this fix still used `shuffled()`'s 20-draw estimate and hit P70's own trap a second time — 2/20 fired (10%) on war-and-peace, which the exact computation then showed was sampling noise around a true rate of 0.0145 (10 of 692 edges clear the floor at all) — the identical shape of miscalibration, found and closed in the SAME pass rather than shipped. Borodino: 0.0187 (16 of 854). Both well below alpha; order 9 now passes on both materials for a real reason.

**Order 11's `arbitrary` arm was ALSO vacuous, and this one is disclosed rather than fixed.** Its construction built three IDENTICAL, unshuffled copies of the same text (only the first was ever read; the other two were built and discarded), reported `perturbed: seed >= 0` — always true regardless of seed, though nothing about the input ever varied — and ended its completion check with a hardcoded `&& false`, so it could never report success either way. Net effect: a rubber stamp, licensed and always-refused by construction, contributing zero real evidence toward order 11's "passed" verdict.

**This one is not patched with a guess.** Every candidate real construction considered hits the same trap orders 9 and 13 already found once each: `asserted.js::standingOf` is a pure function of ref-count, so feeding it any redealt count trivially reproduces a self-consistent label — proving nothing about whether the REAL assertion tier's output is actually derived from ref-count rather than independently arbitrary. A genuine test needs to perturb a specific edge's own ref-count via real material (add or remove a corroborating mention, re-read, confirm the standing moves) — a materially larger and riskier construction than this pass wanted to ship without separately validating it the way P70's own fix was validated before being trusted. The arm now honestly reports `perturbed: false` and a named reason, which routes the item through mhc.js's own `unlicensed_perturbation` path — order 11 is `unmeasured`, not `passed`.

**The consequence, stated plainly rather than left to be noticed later.** War-and-peace's reported STAGE, which the earlier P70 pass reported as 13 (Metasystematic) as a direct side effect of closing order 10's gap, is now honestly **10 (Abstract)** — order 11 sitting unmeasured caps the stage exactly where READING-POLICY says it must: `stageFrom` will not read a stage across an unmeasured order, and orders 12/13 (which genuinely do still pass, independently verified) are carried as observations above the cap rather than folded in. This is not a regression in the system; it is a correction to what the ladder was allowed to claim. Borodino's own stage (6, capped by order 7's real pronoun-binding ceiling) is untouched by any of this.

Full suite: 1468/1418/45 before and after every change in this amendment, failure names diffed via `git stash` three separate times across the three edits — identical throughout, zero regressions. Order 5 through 8, and 12/13, were also re-read in full during this audit and found genuinely licensed (order 5's own arm comment documents a prior instance of exactly this bug class already caught and fixed; order 12's arm comment does the same; order 13's construction is P44's own already-hardened rebuild). Order 6, 7, 10 were read and found sound. This audit is not claimed exhaustive beyond orders 5–13 — order 14's own item is a disclosed, honest search-and-fail (named in the MHC battery section above) and was not re-examined here since it makes no arm claims to audit.

**Amended same day (second) — order 11 fixed for real, not merely disclosed.** User direction, verbatim: *"fix it"*, then, when the first attempt turned out to check the wrong field: *"if 11 doesn't work I suspect the higher ones don't either or were conceiving of them all wrong."* Every naive redeal of `standingOf`'s own INPUT (ref-count) reproduces a self-consistent label by construction — the trap named above and correctly not shipped past. The way out is to redeal a DIFFERENT variable: not the count, the LABEL. If "corroborated" were assigned to k edges by pure chance rather than by real ref-count, the exact probability that an arbitrary same-size draw lands *entirely* inside the K edges that genuinely clear the witness floor is the hypergeometric point mass at the maximum, `C(K,k)/C(n,k)` — no simulation, the same closed-form family `redealAgainstExactNull`/`redealCountAgainstExactNull` already established. `arbitrary` now computes exactly this (`logChoose(K,k) - logChoose(n,k)`), with `K` measured off `assertion.statements` (the SAME field `hypergraph.js` itself keys `standingOf` off) — a first draft measured `K` off `refs.length` instead (order 9's deliberately different passage-grain metric), which manufactured four false "mismatches" that looked like a real engine defect; caught by writing a standalone script to inspect the raw edge data directly, reading `hypergraph.js`'s real assertion-computation code, and finding the statement-vs-passage-grain distinction is a documented, deliberate design choice there, not a bug — corrected before shipping, not after. Measured: war-and-peace 692/692 edges typed, 14 corroborated / 678 single-witness, `P(chance) ≈ 1.7e-29` — nowhere close to alpha, so the real derivation is not explained by chance; borodino 854/854, 18/836, `P(chance) ≈ 1.3e-37`. Order 11 now genuinely `passed` on both materials.

**The re-examination the user's challenge asked for, done rather than assumed away.** Order 12's arm was re-read against the same worry ("were we conceiving of them all wrong") and found structurally different from order 11's flaw: it tests real claim-sensitivity via verdict-DIFFERING pairs (a claim and its negation), never a self-referential redeal of a pure function's own output — sound as built.

**Consequence:** war-and-peace's reported stage returns to **13 (Metasystematic)**, this time standing on a real, non-tautological order-11 measurement rather than the unmeasured gap the prior amendment correctly capped it at. Borodino's stage (6, capped by the real order-7 pronoun-binding ceiling) is untouched. Full suite: 1468/1418/45, identical failure names via `git stash`, zero regressions.

**Amended same day (third) — tested omnilingually: a genuine, live-fetched Russian fixture, not a translation.** User direction, verbatim: *"we need to test these all omnimodally and omnilingually."* `eval/fixtures/wikipedia-borodino-ru.html` is `ru.wikipedia.org`'s own "Бородинское сражение" article, fetched live over the network (not translated, not hand-engineered to pass) and added to `FIXTURES` as `borodino-ru`, run alongside the two English fixtures with **no English-tagged closed-class prior opted in** (`determiners`/`negationWords`/`verbForms` all stay uninjected here, as before) — a pass on this material is evidence the CAPITALIZATION- and STRUCTURE-based machinery generalizes, never that an English prior quietly carried it.

**Content-independence held: zero violations across three materials, one of them genuinely non-Latin-script.** The scale's own claim — a task's order does not depend on what it is about — was not falsified by adding a language with case-inflected proper nouns and a different alphabet. Two real, honestly-typed differences surfaced, both correctly classified as *performance*, not scale violations:

- **Order 5 (Nominal) genuinely `failed` on the Russian material** — a real ceiling, not a gap. `discoverReferents`'s already-known greedy-non-transitive stranding bug (documented in this file's own P44/P50 history: `Mikhail`/`Mikhail Kutuzov`/`Kutuzov` splitting into two referents) reproduces identically on Cyrillic (`Огюст`/`Огюст Коленкур` stranded the same way) — the bug is a property of the greedy-closure ALGORITHM, not of English orthography, confirmed by seeing it fire on a script that has never exercised this code path before. But one NEW failure mode surfaced that English's uninflected proper nouns cannot produce: `Италии Евгений Богарне` (nominative) wrongly merged with `Италии Евгения` (an inflected case-form of the same name, genitive/accusative) — Russian's grammatical case system changes a proper name's own surface form, a distinction English lacks entirely, and whatever string-comparison the individuation rule uses did not survive it. Precision held (4/4 and 3/3 pairs correctly kept apart, matching the English materials' own 5/5 and 9/9), so this is a recall/precision-mix finding on the SAME under-tested surface, not a new class of defect — but it is real, previously invisible, and disclosed here rather than smoothed into "the same bug as before."
- **Order 7 (Preoperational, pronoun binding) `failed` on the Russian material with 0 pronouns even ATTEMPTED (0 bound, 0 refused)** — a materially different finding from borodino's own English failure (0 bound, 5 refused — attempted and lost). `resolvePronouns` is built on `ANAPHORIC_PRONOUNS`, an English closed class (`priors.js`, `lang/en`) — на Russian text (он/она/оно/они/его/её/их…) there is nothing in that vocabulary to even nominate a candidate, so the mechanism is not weak here, it is absent. This is the sharpest, most honest omnilingual finding of the run: a REAL, previously-unmeasured capability boundary, not a bug to fix under this task's own scope — closing it needs a Russian pronoun closed class with its own giver (the same discipline `priors.js`'s every other entry already holds to), not attempted here.

**Every `arbitrary`/`lowerOrder` arm from order 8 through 13 correctly reported `unmeasured` on a Russian-only single-material run** (no control material of different content to redeal against) and correctly resolved to real pass/fail verdicts once run in the three-way comparison — the SAME behavior these arms already have on the English materials when run alone, confirmed rather than assumed to generalize. Order 12 (Systematic) passed identically on all three materials (4/9 cells hold, the same existence/structure gate honored on Cyrillic referents).

**The honest limit, stated rather than glossed:** this is one non-Latin, non-uninflected language, on one topic already covered in English by this repo's own fixtures — not a general typological survey. It establishes that the capitalization/structure machinery is not silently English-only where it claims not to be, and names exactly one place (order 7) where it silently is. A wider language sweep (a non-case-inflecting, non-Latin-script language; a language with no capitalization distinction at all, which would test whether `discoverReferents`'s whole individuation mechanism — built on capitalized-surface recurrence — degrades gracefully or fails silently) is real, scoped, unattempted future work.

**"Omnimodally" is scoped honestly rather than attempted with the wrong tool.** No organ in either repo performs semantic or relational extraction from a non-text modality. `measure.js` (this file's own "measuring door" section, above) is the one organ that reads audio/binary material at all, and it computes NUMERIC-SERIES statistics only (`wavSamples`'s PCM walk, `nul`/`binding.js`'s series tests) — it has no path from a waveform or an image to a claim, a referent, or a relation, so no order of the MHC battery (which is built entirely on `extractSurfaces`/`extractRelations`/`resolvePronouns` — text organs, every one) has anything to run against a non-text file. Forcing a run would either error meaninglessly or, worse, silently score zero and be misread as "the system fails at Nominal on audio" when the true statement is "no organ was ever asked the question." Building that organ (an OCR/ASR/vision front end feeding the SAME hypergraph.js/cast.js pipeline this battery already drives) is real, large, unscoped future work — named here as the honest boundary of "omnimodal" today, not attempted under this pass.

**Files.** `eval/fixtures/wikipedia-borodino-ru.html` (new, ~866KB, real fetched HTML — genuine, not a fixture engineered to pass). `eval/mhc-battery.mjs` (`o11-formal`'s `arbitrary` arm rebuilt on the label-redeal hypergeometric construction, documented in the file's own comments; `FIXTURES` gained `borodino-ru`, documented inline as the omnilingual probe and why no English prior rides along). `eval/results/mhc-RESULTS.md` / `mhc-battery.json` regenerated (this is a re-runnable driver, P19/P27's posture, not a committed regression test). Full suite: 1468/1418/45 before and after, identical failure names via `git stash`, zero regressions.
## P71 — The generality gate: a specimen-shaped fix and a universal capability read identically until measured apart

**Generality:** not-applicable — this entry is the discipline itself, not a
claim about a reading mechanism's reach.

The user's own diagnosis, put directly: this repo has no standing way to
tell "we over-designed for our corpus" from "we found something that makes
omnimodal cognition better everywhere." Both look identical at the moment a
fix lands — a bug surfaces on one specimen, a change makes that specimen
pass, the change gets written up in this document's own confident,
evidence-heavy voice. What that voice has never been forced to state is
which of the two things it is claiming.

**This repo has already paid for both directions of the failure, more than
once, before this policy existed to name either.** Overclaiming:
`succession.js` generalized one Wikipedia infobox layout into what read,
for a long time, as a reading capability, and was later condemned outright
— "it should never have been made" (P57/P58). The MINE-1 vocabulary chase
ran nine configurations, each converging on the same 22–34%/17–43% band,
before the session stopped mistaking specimen-fitting for approach to a
universal ceiling and named the plateau honestly: "90% is not reachable by
further layering under the current verdict criterion... a
paraphrase-tolerance gap... not a tenth vocabulary layer." Underclaiming —
the mirror error, caught later and just as costly — is just as real: P60's
own chemistry organ was believed to add reasoning power because it ran
cleanly on real Wikidata, until `derivation-precision.mjs` showed a
twenty-line unlicensed join finds every fact the licensed chemistry finds,
plus fourteen more: "a mechanism that runs is not a mechanism that helps,
and the control separating them is the cheap one that got skipped. Run the
dumb baseline first." And P44's own content-independence check first read
an ordinary performance difference between two real materials as a scale
violation, before being corrected to keep "violation," "performance
difference," and "no probe" apart as three separate findings — the
apparatus meant to catch overfitting had itself overfit its own verdict to
whichever second claim happened to be at hand.

**The gate.** A finding earns the word `universal` in this document only
once it clears three checks — none of them new; each has already been run,
once, somewhere in this project's history. What is new is that all three
are now mandatory together, and disclosed, rather than each showing up in
isolation in whichever pass happened to need it that day:

1. **Cross-domain replay.** The mechanism, unmodified, is re-run over a
   second corpus that shares the fix's structural shape and nothing else —
   different subject, different vocabulary, no specimen overlap. The
   reference case is `eval/grain-refinement.mjs`: one 68-line core with
   zero domain words reached 1.000 precision at occurrence grain on both
   real Wikidata succession and an invented, unrelated hospital-bed corpus,
   with no veto anywhere, and the fixture's own trap — declared before the
   run — fired exactly as predicted at the coarser grain. A fix exercised
   only on the specimen that found it stays `specimen-scoped` until this
   runs, no matter how obviously general it looks from the inside.
2. **A named giver, or a derived floor — never a fit.** Every threshold,
   list, or constant a fix introduces either cites an external giver
   (UniMorph, the UD treebank, Wikidata, a genre prior per eoreader7's own
   `meta-parameters-INVENTORY.md`) or is a structural floor derived from
   the mechanism's own shape (binding's `arrivals >= 2` — "one arrival has
   no co-arrival to test" — or the assertion tier's `WITNESS_FLOOR = 2`). A
   number chosen because it makes THIS specimen's score move is neither,
   and P4's own "hand-picked constants... Open debt" finally has a place
   that is checked rather than merely confessed.
3. **A demonstrated necessity, on material the discovery never saw.** A
   case — found, or deliberately constructed — where the fix's absence
   genuinely fails and its presence genuinely succeeds, built from material
   that played no part in surfacing the original bug. The reference case is
   `eval/falsification-probe.mjs`: six corpora with ground truth declared
   in advance, because a five-fact succession chain and a five-fact
   dominance chain are structurally identical by construction and opposite
   in truth — "the scan cannot tell them apart" is exactly the finding that
   stopped five modules from shipping plausible, unearned reasoning power.
   P19's own line applies here without edit: "a refusal no declaration can
   trigger is a comment, not a wall."

**The direction this gate must not run: distrust dressed as rigor.** A
mechanism that performs differently on two materials has not necessarily
failed to generalize. P44's corrected reading keeps three outcomes apart
for exactly this reason — a **violation** (valid here, mis-declared there,
the actual thing the gate exists to catch), a **performance difference**
(valid both times, only completed on one), and **no probe** (the material
offers no specimen at all) — and collapsing the second into the first is
the overcorrection this policy would otherwise invite. The `moves.js`
coverage driver draws the identical line a third way, keeping registry
debt, real incapacity, and probe error apart rather than reading an empty
cell as one verdict (P64). eoreader7's own S24 states the rule cleanest: a
mechanism that is structurally inert on a caseless script is a disclosed
gap, never a lower score — "a silent claim of cross-script generality is a
more severe failure than a disclosed narrow scope," which cuts both ways:
false confidence and false suspicion are the same failure, aimed at
opposite conclusions.

**The tag.** Every POLICIES.md entry from P71 onward, and every
`native/READING-SPEC.md` entry from eoreader7's paired S31 onward, carries
one line, in whichever of three registers is actually true:

    **Generality:** universal (evidence: <eval driver or file, one line on what it showed>)
    **Generality:** specimen-scoped (disclosed; not claimed further)
    **Generality:** not-applicable (names why — a process or architecture decision, no claim about material)

`specimen-scoped` is not a lesser result. Most of this document's own
entries would have honestly carried it — P50's "filler selection at page
scale still returns garbage," P56's disclosed absences, P41's "silence,
unfixed" — and saying so plainly is this whole document's own habit,
applied consistently rather than left for a reader several hundred lines
later to infer from tone.

**Enforced.** `generality-gate.test.mjs` scans POLICIES.md's own `## P<N>`
headers for N ≥ 71 and fails if any entry lacks the tag; the matching case
in eoreader7's `native/conformance/reading-spec.test.mjs` does the same for
`## S<N>` at N ≥ 31. Both check DISCLOSURE only, never TRUTH — no test can
confirm that a cross-domain replay actually happened or that a cited giver
is honest, the same limit this document's own VI.1 already states for any
policy whose violation no test can catch. What closes is the silent case: a
fix that never says which kind of claim it is making cannot pass unremarked
because the reader's own confidence carried it.

## P72 — Metacognition: watching the gap between S1 and S2, as a learnable, revisable standing

**Generality:** specimen-scoped — the four-way classifier composes
medium-general primitives and clears P71's leg 2 (a reused, not
re-derived, floor) and, via `eval/metacognition-eval.mjs`, legs 1 and 3
(cross-domain replay and a demonstrated-necessity case). What is NOT
cleared: whether the LEDGER'S learned precision reading moves a real
turn's outcome — that needs a live call site this pass does not build (see
`metacognition-integration-note.md`), so the organ ships real and tested,
the claim that it HELPS a live turn stays open, named rather than assumed.

The ask, as put to this session: watch the surprise between what S1 and S2
generate, and feed that watching into the surf and the fold in ways that
are learnable, repeatable, revisable — pursued, at the asker's own
direction, "as Friston but visited by the Ramakrishna." Both halves of
that framing earn a place in the design, not as ornament.

**Friston's half is the one this repo's own P34 already half-built and
never watched.** `twoPassTurn` (app.js) already runs a fast, unchecked
generative pass (S1) and a checked one (S2, carrying S1's own words so it
can "confirm, extend, or correct" them — `priorPassFor`, holon.js) — this
is precisely active inference's own two-level shape, a prediction and a
check against it. What active inference adds beyond a bare check is that
the CONFIDENCE placed in a channel — its precision — is itself learned
from repeated exposure, never fixed once. Nothing before this policy
watched the S1/S2 gap as a standing fact at all: every turn started the
question "how much should I trust S1 here" from zero. `metacognition.js`
is the watcher: `assessAgreement` classifies one turn's gap, and
`makeMetacognition`'s ledger accumulates it, per caller-declared "cell,"
into exactly this precision reading — `standingOf` returning `unproven` /
`established` / `contested`, phrased natural-frequency, never finer than
the counts support.

**The failure Friston alone invites, guarded against explicitly.** A pure
surprise-minimizer is the textbook dark-room problem: an agent scored only
on "was I surprised" is incentivized toward silence, because nothing
unsaid can ever be corrected. `assessAgreement` returns an honest all-zero
profile when `extractCheckableAtoms` finds nothing in S1's draft, and
`observe` is a STRUCTURAL NO-OP on an all-zero delta — reusing
`hyperlexicon.js::hear`'s own rule verbatim ("a re-sighting that teaches
nothing appends nothing"). A run of nothing-but-silent turns cannot move a
cell's standing in either direction; `metacognition.test.mjs` pins this as
its own named regression, not an incidental property of the arithmetic.

**Ramakrishna's half corrects the OTHER failure Friston alone invites —
collapsing every disagreement into one error signal.** Ramakrishna's own
practice (Vedantic, Tantric, Islamic and Christian sadhanas pursued in
turn, each found genuine) and his doctrine that more than one real path
can stand are read here not as decoration but as the argument against
forcing every S1≠S2 delta toward a single verdict: a claim S2 can neither
confirm nor refute is not thereby an error, and punishing it as one would
be indistinguishable from punishing S1 for guessing right. `classifyAtom`
keeps this case — this repo's own `unbound`/`beyond-reach`/`unheard`
relation verdicts, or a plain containment miss with no relation edge
either way — in its own bucket, UNRESOLVED, which `standingOf` never
folds into either `confirmed` or `corrected`. This is the SAME
constitutional line CLAUDE.md's grounding-ladder section already draws
("a checking organ may say 'I have nothing to compare this against', or
'I compared it and it failed'. It may never manufacture the second out of
the first"), applied a second time in the same direction it was first
written: absence must not become conviction, and — the new half — absence
must not become acquittal either. `eval/metacognition-eval.mjs`'s own
"leg 3" demonstration makes the cost of skipping this concrete: on eight
atoms read from one real error and three real, honest gaps, the shipped
four-way classifier reports 2 corrected and holds 6 apart as unresolved;
the naive two-way collapse this policy's own header names — everything
non-`bound` counts as corrected, because it has nowhere else to put a gap
— reports all 8 as corrections, on the identical extraction.

**bhavamukha, and what `concede` is for.** The tradition's own name for
the sill a realized witness returns to — neither dissolved into
undifferentiated absorption (never checking, S1 forever) nor lost in
unexamined multiplicity (never trusting anything, S2's own cost paid every
turn) — is the shape given to the ledger's own standing. CLAUDE.md's
"Stance on the admission record, sedimented" section already states the
governing rule for exactly this kind of record: "these are always
defeasible assertions of the reader, the structure of their cognition,
not anything allegedly in the world." A cell's standing is never a claim
about the material; it is this instrument's own belief about its own
reliability on a kind of claim, and `concede(log, cell, {trigger})` —
mirroring `grid.js::concedeEvaluation` field for field, EVIDENCE·REC,
`trigger` required and never defaulted — is how that belief is revised
OUT LOUD, on the record, rather than left to drift silently as
observations accumulate. Learnable, repeatable, revisable, in order:
`observe` is how a standing is learned; the same delta into the same cell
always sums the same way, which is what makes it repeatable; `concede` is
how it is revised.

**What is real and tested, and what is disclosed as not yet done.**
`metacognition.js` (pure, the native `kernel/task-log.js` bundle
injected — the cast.js pattern every append-only substrate in this repo
already uses) + `metacognition.test.mjs` (25 cases: the classifier against
the real, pure `grounding.js` primitives; the ledger against eoreader7's
real native task-log; the dark-room and Ramakrishna guards each pinned as
their own named regression; `concede`'s two refusals and its
non-destructive landing). Full suite 1085/1085 (the pre-existing 125
failures, confirmed identical by name via `git stash`, zero regressions).
`eval/metacognition-eval.mjs` + `eval/results/metacognition-eval-
RESULTS.md`: Domain A is real, byte-verbatim Wikipedia text (reused,
not re-typed, from `experiments/mechanical-first-hamlin-johnson.mjs`'s
own `MATERIAL_TEXT` — this repo's own repeatedly-used Hamlin/Johnson/
Lincoln specimen); Domain B is a DECLARED INVENTED lab-instrument
chronicle, the same posture `eval/grain-refinement.mjs`'s own
hospital-bed corpus and `hl-acquire.test.mjs`'s own invented chronicle
already established for a cross-domain replay with no second real
fixture on hand. The SAME code, unmodified, reads an error-prone cell as
`contested` and a reliable one as `established` on both domains, sharing
no vocabulary — the cross-domain replay P71's leg 1 asks for.
`metacognition-integration-note.md` names exactly where a live call site
(`twoPassTurn`'s own `needsSystem2` gate, and `holonicTurn`'s already-
threaded `gridLog`/`hyperlexiconLog` return fields) would read the
ledger, and what it would need to decide that this pass does not: which
axis a "cell" should really be, whether S2's retrieved passages need
threading onto `holonicTurn`'s return for `assessAgreement` to use them
directly, and whether `surfWeight`/`forcesFoldRefresh` — both real, pure,
unwired — actually move an outcome once tried. Not attempted: any change
to `app.js`, which CLAUDE.md's Explore section already names as the
fold-architecture session's own contract, the same boundary P39/P53/P56/
P60/P63 have each independently held before landing their own new organs
unwired.

**Amended same day — wired in, by direct user instruction ("wire it in if
you believe it works").** Reading `holonicTurn`'s own turn-ending sequence
in `app.js` closely (rather than trusting this entry's own first-draft
guess above) found that both of the integration note's harder open
questions were already answered by the existing return shape:
`result.sections[].passages` and `result.sections[].relations.claims` are
BOTH already computed by the point `crownTestimony` fires — the same
fields `state.lastMaterialChars`/`relationClaims` were already reading a
few lines above — so nothing needed threading through `holon.js` at all.
`holonicTurn` now calls `assessAgreement`/`observe` directly, gated on
`opts.priorPass` (the identical "a caller with no S1 pass simply never
calls it" convention `priorPassFor` already established), onto one
disclosed starting cell, `"s1-draft"` — a global running estimate, never
claimed as a finer taxonomy this pass did not measure a basis for.
`metaLedger = makeMetacognition(nativeTaskLog)` reuses the EXACT same
native task-log instance `buildLog`/`store`/`grid` already share, no
second import; `state.metaLedger` holds it, app-wide and unpersisted, the
identical posture `gridLog`/`hyperlexiconLog` already state.

**What was verified, and the one thing that honestly could not be.**
`node --check app.js` passes; the full suite still reports the identical
125 pre-existing failures by name, zero regressions. `serve.mjs`
(`THE_FOLD_NO_OPEN=1`) served `/app.js` and `/metacognition.js` both 200,
confirming the new import resolves on disk. A real browser loading the
full page could NOT be verified: this checkout's `/engine/
emergence/tiers.js` (the legacy statistics subsystem `reflexMeter`/
`apertureMeter` still depend on, P69's own disclosed holdout) 404s —
confirmed unrelated to this change and pre-existing either way — which
breaks the WHOLE module graph's link step in a real browser regardless of
anything this pass added, and there is no way in this environment to
isolate the new import chain from that pre-existing gap. Every new line
was instead verified by direct inspection against already-live, adjacent
code in the identical function (not assumed) and by the fact that
`assessAgreement`/`makeMetacognition(nativeTaskLog).observe` are the SAME
calls `metacognition.test.mjs` already exercises against the real native
module. Two of the note's four open decisions are now resolved
(where S2's material comes from; that checking-mode-off degrades
honestly rather than manufacturing a wrong finding); two remain open
(a finer cell taxonomy; whether `surfWeight`/`forcesFoldRefresh` are
worth wiring — `forcesFoldRefresh` turned out to need `refreshSummary`
threaded from a different point in the turn-ending sequence than this
pass traced closely enough to risk). `metacognition-integration-note.md`
carries the full, corrected account.

**Second amendment — flow #2 wired: suspicion widens the search ("do
it", user direction after the flows were laid out).** The ledger was a
thermostat reading the room with no furnace connected; this connects
exactly one duct. `metacognition.js` gained `escalationFor(standing,
budgets)` — the one live consumer of `surfWeight`: on a `contested`
standing every numeric budget handed in is ceil-widened by the declared
1.5 factor; on `established`/`unproven`/none they come back
byte-identical. Three laws, each pinned as its own regression
(`metacognition.test.mjs`, 25 → 32): ASYMMETRY (budgets only ever rise —
a good record never quietly removes checking, an unmeasured one never
earns a discount; the dark-room refusal applied to the spend side);
CEIL, NOT ROUND (for any integer budget ≥ 1 and factor > 1,
`ceil(v·1.5) > v`, so `contested` always buys at least one more unit —
round would no-op a budget of 1 and turn the flow into a comment);
NON-COMPOUNDING BY CONSTRUCTION (the call site always passes the
DECLARED constants — holon.js's own exported `MAX_CORRECTIONS = 1` and
`PASSAGES_PER_PART = 3`, proof.js's own `PREFLIGHT_PAGES_CONSULTED = 3` —
never a prior escalated value, so the factor applies once per turn from
the same base).

**The concrete flow, in numbers.** On an S1/S2 turn whose `"s1-draft"`
standing reads `contested`: the preflight consults 5 pages instead of 3
(`gatherPreflightMaterial` gained an optional `pagesConsulted`,
defaulting to the same constant its slice always used — its one other
behavior byte-identical), each part retrieves 5 passages instead of 3,
and the correction loop gets 2 passes instead of 1. CHANNEL ALIGNMENT is
the scoping law: the escalation is gated on `opts.priorPass`, the
identical gate `observe`'s own call site uses — a standing measured on
S1/S2 turns adjusts S1/S2 turns, never a channel nothing measured. That
channel is thin today (S1 only runs on trivially-chatty questions that
volunteer something checkable, per the SEARCH-BEFORE-ANSWERING
amendment), and that thinness is stated rather than papered over: flow
#1 (the gate itself reading the standing) is what would widen the
channel, and it is deliberately not built here. Every engagement lands
on the reflex ledger as an `escalated` act (reflex.js's designed
unknown-act fallback, the same door `measured`/`carried`/`narrowed`
entered through) — a decision the instrument made is never silent.

**Still honest about what is not proven.** This wires the flow; it does
not prove the flow HELPS — whether the correction rate for the cell
actually falls once escalation engages is the same unrun measured leg
the first amendment already named (P60's own line stands: a mechanism
that runs is not a mechanism that helps). The observability for that
measurement now exists on the ledger itself (corrected counts per cell,
`escalated` acts on the reflex ledger); running it needs live turns this
environment cannot drive. Suite: 1085 → 1092, pass 958 → 965, the same
125 pre-existing environment failures by name, zero regressions.

**Third amendment — the hunt stops on surprise, not on a count (user
direction, near-verbatim: "we should hunt until we have enough
information such that what we experienced would not be surprising to a
degree that is a distinction that makes a difference").** The question
this answers, put back plainly first: flow #2 as first wired was a
fixed quantum — 3 pages (5 contested), decided before the hunt started,
spent blind. Nothing about what the pages actually SAID could stop the
hunt early or say "this is still moving, keep going." The user's clause
is this repo's own standing vocabulary — Bateson's
difference-that-makes-a-difference, `nul.pattern()`'s documented sign —
and P31 had already sketched exactly this stopping rule for a different
loop ("hop until widening stops moving the answer beyond what reseeding
noise would move it anyway; the noise can't beat the NUL"). This builds
it for the hunt.

**The mechanism.** `metacognition.js::makeHuntMeter` — the SAME
tier-stack physiology reflex.js and aperture.js already wire
(`emergence/tiers.js`, bayesianSurprise placed against
priorContinuationNull), injected the same cast.js way, on the SAME
declared numbers (SURPRISE_WINDOW/DRAWS/ALPHA/SEED, imported from
reflex.js where their givers are named), one tier. The meter is seeded
with what the hunt STARTS from — the question, the discourse line, the
search-results digest — so the first page is measured against a real
ground; each kept page then arrives as one observation, placed against
the material's own continuation null. `huntSettled` is aperture.js's own
live-measured cut applied per arrival (censored above → still
surprising; censored below → held; placed → held iff rank > 0.5, the
null's OWN median — the cut aperture earned through two measured
corrections, cited rather than re-derived). `gatherPreflightMaterial`'s
fetch loop stops EARLY on a settled arrival and runs to the declared
ceiling while pages keep genuinely moving belief; the escalation's
`pagesConsulted` is thereby reframed from "the count" into "the leash" —
`contested` buys a LONGER leash (5), and the settling decides where the
hunt actually stops inside it. Every hunt's outcome lands on the reflex
ledger as a `hunted` act (pages read, ceiling, and WHY it stopped —
`settled` or `ceiling`), and the return's own `hunt` record carries each
page's placement, so the decision is inspectable per turn.

**Measured against the REAL organ before a line of wiring** — probe run
kept in `metacognition-hunt.test.mjs`'s own header, fixtures declared
invented so nothing tests recalled world knowledge: a convergent stream
settles (page A rank 0.97 against a seed it overlaps, near-paraphrase B
0.98); an alien-topic page lands censored ABOVE and keeps the hunt alive;
an empty page is a typed gap and can NEVER stop the hunt (withheld is
not "nothing moved" — the grounding ladder's own line, applied to
stopping); a first page against a thin seed is unplaceable and continues
the hunt (the safe side); and the whole stream is byte-deterministic on
the declared null seed. 7/7 against the real engine module — runnable in
this checkout for the first time, because this same session initialized
the `legacy-eoreader6.1` submodule (which also swelled the honest suite:
1578 tests now execute where 1092 did, the old 125-name environment
failure set collapsing to 42, identical before/after every change here).

**The disclosed behavior change, named rather than smoothed.** A calm
turn may now stop BELOW the old fixed 3 pages — but only ever on a
MEASURED settle (a page placed past the null's own median), never on a
gap, an unreadable page, or an unplaceable first arrival, all of which
continue the hunt. The asymmetry law's spirit holds in the new register:
effort is only ever cut by the material itself converging this turn,
measured against its own null — never by a learned standing, never by
silence, never by default. And the sharper sign remains open, stated
here as aperture.js already states it for its own series: this is the
per-arrival continuation-null gate, NOT `nul.pattern()`'s licensed
windowMean/shuffle pair over the hunt's series — the null-of-nulls
`opened` reading stays unbuilt, named, not absorbed. Suite after this
amendment: 1585 tests / 1538 pass / the same 42 environment failures by
name, zero regressions.

**Live-run evidence (2026-09-01) — flow #2 proven END TO END on the real
page, not only in test files.** The user's own bar ("did you test it? did
it actually do those things?") was answered with the harness shape this
repo's own precedents supply whole: a scripted stand-in Ollama (P27's
disclosed posture — this sandbox has no real install), the real
`serve.mjs`, real headless Chromium driven over raw CDP (P69's method,
Node's native WebSocket, no Playwright), material attached through the
page's own real drop handler, turns typed through the real composer. The
scenario: attached material contradicting one fixed claim ("Renn Kessler
never founded the Ostrel Works"); the stub answers every text-mode call
with that claim verbatim, so every S2 relation read lands `contradicted`
against the material. Measured, from the stub's own request log with
marks between turns and from the page's own `/self acts` door: **turn 1
spent 3 text-mode model calls** (S1, S2 execute, ONE correction pass —
`rewrote the question` once on the ledger); its observation landed 3
CORRECTED atoms, standing `contested`; **turns 2 and 3 spent 4 text-mode
calls each** — `rewrote the question` TWICE on the ledger, the correction
budget's 1 → 2 visible in both currencies — and each landed
`escalated: cell s1-draft · corrections 2 · pages 5 · passages 5` on the
reflex ledger, read back through the page's own computed table. Zero page
exceptions across boot, attach, three S1/S2 turns and the mechanical
door. A side-confirmation rode along free: turn 2's summary refresh was
CARRIED by the aperture gate (zero json-mode calls in its window,
`carried: streak 1` on the same ledger) — the two meters coexisting on
one live turn.

Two harness findings kept (P5.5's discipline — both were the driver, not
the theory). (1) The first driver's turns said "hi" — and no escalation
could ever fire, because a turn text sharing NO token with the material
gives `retrieve()`'s zero-relevance-floor nothing to return: zero
passages → no relation vocabulary → no verdicts → no CORRECTED → never
`contested`. Diagnosed OFFLINE against the real organs first (the
material+claim pair does yield `contradicted` when passages reach the
reader), then fixed in the driver alone: turn texts that speak the
material's own words while staying inside the S1 gate. The lesson is
about the channel, not the harness: the metacognition loop only ever
learns from turns that actually reach the material — a turn that
retrieves nothing is measured as nothing. (2) The `/self acts` readback:
`mechanicalTurn` appends only `publishBuild`'s chip to the chat body and
the TABLE lives in the Folds pane, which at headless width (< 900px)
stays unshown — `innerText` excludes non-rendered nodes, `textContent`
does not; the build cards are the read. **The boundary, restated so this
addendum cannot be over-cited:** this proves the flow ENGAGES and SPENDS
— standing moves, budgets widen, the extra pass runs, every act lands —
not that it HELPS. "Does the correction rate fall once escalation
engages" remains the second amendment's named, unrun measured leg. The
harness files stay uncommitted per their own headers; this paragraph and
the ledger vocabulary above are the record.

**Fourth amendment (2026-09-01, landed independently and reconciled on
merge) — `forcesFoldRefresh` wired too.** The second amendment's own
scope note ("`forcesFoldRefresh` and the gate flow (#1, which would
widen the thin S1/S2 channel) stay deliberately unbuilt") is now half
closed — this pass wires the first, leaves the second exactly as named.
`forcesFoldRefresh`'s own open question — whether `refreshSummary` could
safely be threaded — traced clean rather than left standing:
`relationClaims`/`result.sections`, everything `assessAgreement` needs,
are already computed several lines BEFORE `refreshSummary`'s own call
inside `holonicTurn`, not after it, so the metacognition block moved to
right before that call (and, as a disclosed consequence, ahead of the
`!state.grounded` early return a few lines further down — a plain-mode
S1/S2 turn's disagreement now reaches the ledger too; bookkeeping, not
drawing, the same "the fold and the record stay ON either way" rule the
checking-mode section already states for exactly this kind of state).
`refreshSummary` gained a fourth, defaulted options parameter
(`{forceRefresh = false}`, byte-identical for every existing caller that
omits it) and now ORs it onto `exchangeHeldGround`'s own reading exactly
as `forcesFoldRefresh`'s own header names ("a natural OR onto
refreshSummary's existing gate ... not a replacement for it") — an
override logs its own `forcedRefresh` act, mirroring the `carried`
skip's own never-silent discipline for the opposite decision.

**What this pass's own first draft got wrong, found on merge rather than
shipped.** Working independently of the three amendments above, this
pass's own first cut ALSO wired `surfWeight` — directly into
`gatherPreflightMaterial`, via a bespoke `weight` multiplier on the page
count alone. Merging against `origin/main` found the identical function,
and the identical parameter slot, already occupied by flow #2's
`escalationFor`/`pagesConsulted` — more general (it widens
`maxCorrections`/`passagesPerPart` too, not page count alone), more
rigorously specified (the three named laws above), and already proven
live end to end, none of which this pass's own narrower version had.
That half of this pass's original draft is DROPPED entirely rather than
kept alongside theirs — two competing wideners of the same budget would
have been the exact "does the factor compound" hazard `escalationFor`'s
own NON-COMPOUNDING law was written to forbid. `needsSystem2` stays
untouched and named still open, exactly as both the module and the
amendments above already state — a materially larger, riskier decision
(whether S2 runs AT ALL) with no mechanism any of these passes name.

**Verified, on this checkout's own terms — including one gap closed
along the way.** `node --check app.js` passes. This checkout's own
`legacy-eoreader6.1` submodule (a real, declared git submodule of
`eoreader7`, `.gitmodules`-registered but never checked out before this
pass) was initialized during this reconciliation — a reversible, local,
read-only clone of a public repo, not a code change — which is why this
checkout's own suite counts differ from the second/third amendments'
own reported numbers above (1092/1585 there; a different number here,
both honest, each a fact about its own checkout's submodule state, not a
disagreement about the code) and, more directly useful, resolves the
`/engine/` mount for the first time in any of this repo's recent
sessions: `explore-server.mjs` can now actually boot in this
environment, where P69's own disclosed holdout previously blocked it.
Full suite unchanged by name against THIS checkout's own pre-merge
baseline (`git stash` diff), zero regressions from this pass's own
changes. A real browser load was verified end to end: headless Chromium
driven over raw CDP (no Playwright/Puppeteer package present — Node
22's native `WebSocket` speaks the protocol directly) loaded the real
page against a real `serve.mjs` and found the `#not-served` banner
hidden, the composer present, real DOM content — the page's own boot
code runs to completion, byte-identical between the pre-merge baseline
and this pass's own final change. What still could not be verified, the
same disclosed limit every recent pass in this file carries: no Ollama
is reachable in this environment, so `forcesFoldRefresh`'s live effect
on a real turn could not be shown the way flow #2's own live-run
addendum showed engagement above — only that it now runs safely, the
same honest boundary the very first P72 amendment already drew before
either signal was wired. `metacognition-integration-note.md` carries
the full, reconciled account.

## P73 — The hyperlexicon door made ready: the label data was one curl away, the identity question is now a socket

**Generality:** universal for the two seams (an injectable note identity,
a threaded door gate — neither knows any language or domain);
specimen-scoped for the shipped data layer (`priors-data/
pos-prior-eng.json` is `lang/en`, giver Universal Dependencies
UD_English-EWT, CC BY-SA 4.0 — riding every classification via
`POS_PRIOR_META`, exactly as P41/P43's received English classes already
ship).

**The question that opened it, verbatim: "are you reading eot well enough
to have a meaningful hypergraph?"** Measured rather than recalled
(`eval/hyperlexicon-door-probe.mjs`, mirroring the live turn exactly —
app.js's relation-reader configuration, holon.js's per-passage admission,
holon.js's own ≥2-witness ledger block — over the two committed real
Wikipedia fixtures): **no.** Of 29 notes the live door admitted, 18
carried a closed-class label (`—and→` ×7, `—of→` ×4, `—to→`, `—in→`,
`—on→`, `—or→`, `—himself→`…) and 0 ever reached two witnesses — the
same battle described by both pages, the same fact stated in both
("The Russian army withdraws the next day" / "Imperial Russian forces
retreated southwards"), and the ≥2-witness ledger block — the ONE place
the accumulated hypergraph reaches the model — rendered empty,
structurally, because note identity is the exact triple and prose never
restates a fact in extractable-identical form. Meanwhile the algebra
ABOVE admission was already measured strong (P60/P61/P63: multi-hop at
precision 1.000, oracle-checked). The bottleneck was admission from
prose, in two named halves. The user's direction: "assuming that's
coming, merge us to gh but ready to leverage those improvements."

**Half one — label quality — closed by data that already had its consumer
built.** Three organs were sitting complete and dark: `hypergraph.js`'s
`posPriorFor` vocabulary gate (P68), `hyperlexicon.js::admit`'s own
asymmetric `classifyConnector` gate (P56's rule, implemented, never
threaded), and app.js's fetch of `/priors-data/pos-prior-eng.json` into
the cache `posPriorFor` reads — against a file that did not exist. The
engine's own `scripts/build-pos-prior.mjs` header says exactly how to
make it (one curl of UD_English-EWT, one node run); built, it lands
16,654 forms — the documented figure exactly — and the probe's arm B
shows the vocabulary gate ALONE removing all 18 closed-class labels AT
EXTRACTION: bound 36 → 15, notes 29 → 10, closed-class labels 18 → 0,
every surviving connector a real verb (`fought`, `loses`, `suffers`,
`resorted`, `managed`, `translated`, `remained`, `set`, `took`,
`discusses`). Arm C threads the door gate on top and turns away zero —
a wall behind a wall, kept because it guards any future reader path that
lacks the vocabulary gate, at zero cost when there is nothing left to
refuse. The honest cost, disclosed as P41/P43's own distinguishing test
requires: the prior rides EVERY consumer of `relationsFor`, and `unheard`
rises 2 → 31 — claims whose connector was a function word no longer bind.
Those were never real relations (a conjunction heard as a verb fabricates
an edge — the closes-a-false-binding class, which ships on), but the
`bound` count is honestly lower everywhere, not only at this door.

**Half two — corroboration identity — built as a socket, not guessed at.**
`makeHyperlexicon` gains an injectable `noteIdentity(subject, verb,
object) → canonical forms`, used for the note's ID ALONE: the display
keeps the FIRST reading's own words (bytes read, never a normalised
paraphrase — evidence accumulates, the words do not drift),
witnesses/spans union exactly as before, a gapping organ falls back to
the surface form per field (an identity gap never blocks admission — the
withhold-vs-convict rule aimed at identity), and absent the organ the
door is byte-identical to before. `hyperlexicon-identity.test.mjs` (5
cases, native kernel only — the stance-test file's own
checkout-independence reasoning) proves the mechanism reachable: an
injected toy canonicalizer folds two differently-worded sightings into
ONE note with TWO witnesses, which is the exact event the live ledger
block has been waiting for. The PRODUCTION organ — referent faces for
the ends, `sameAct` lemma equivalence for the connector, both already
proven in the MINE-1 work — is the named next wiring, deliberately not
invented in the same pass as the seam (the same discipline the
referent-bar and `classifyConnector`/`minShare` postures already hold:
new enough that turning it on for real traffic is its own deliberate
decision).

**The wiring, all default-null, all byte-identical when absent.**
`holon.js`: `runPart`/`runHolonicTask` gain `classifyConnector = null`,
passed at the one admit call (minShare stays the door's own declared
default — no second number introduced); pinned in `holon.test.mjs` by a
threading test that asserts the lens arrives at `admit` BY IDENTITY, and
that the default path arrives null (a check that did not run never
reports a pass). `app.js`: the lens is DATA-GATED, never code-gated —
built in the same `.then` as `posPriorCache`, from `makeGrammarLens` with
`POS_PRIOR_META`/`THRAX_META` so givers ride every classification, and
passed `state.grounded ? connectorLens : null` beside the ledger it
guards; a checkout without `priors-data/` runs byte-identically to
before this policy existed.

**The third lever, named and untouched:** subject-span debris
(`and Andrei`, `that Napoleon`, `which Tolstoy` as subjects — clause
openers leading the span) is the extractor's own gap, eoreader7 native
`relations.js` territory, real unbuilt work.

**Evidence.** `eval/hyperlexicon-door-probe.mjs` +
`eval/results/hyperlexicon-door-probe-RESULTS.md` (the three-arm table,
every note printed for eyeball meaningfulness). Full suite 1587/1538/44
→ 1593/1544/44, the same 44 failure names via sorted-name diff (TAP
ordinals shift with 6 new tests; names are the authority), zero
regressions.

## P74 — A gate is closed by shipping its ground: the hypergraph admission door, measured at every seam

*(Renumbered from P72 on merge — a concurrent PR landed its own P72/P73
first; the number moved, nothing about the policy itself did.)*

Closes the 2026-09-01 admission findings, handed in from another
session's live measurement: (1) 18 of 29 notes the door admitted from
real prose carried non-verb labels (`—and→`, `—of→`, `—army→` — P56's
slot/class finding reproduced at the door); (2) corroboration fired 0/29,
so the ledgerBlock ("confirmed independently in more than one place")
rendered empty on real material; (3) the door's quality gate existed and
could not run — `admit` accepts a `classifyConnector`, holon.js never
passed one, and the grammar lens's own data layer 404'd on every
checkout. Full measurement record: `eval/results/
admission-gate-RESULTS.md` (re-runnable, offline). User direction:
*"let's do this well, close this for good... think of how to use the
full insight of the EO cube in the structure of the solution."*

**The EO shape of the defect, which dictated the fix order.** The
pipeline was performing INS without EVA, and SYN at the wrong grain, on
a Ground that shipped nowhere. Ground first: `serve.mjs`'s
`/priors-data/` mount pointed EXCLUSIVELY at
`../eoreader7/legacy-eoreader6.1/scripts/corpus/` — a **gitignored build
directory inside a submodule most checkouts never initialize** — so
`app.js`'s fetch of `pos-prior-eng.json` failed silently everywhere, and
every organ gated on that prior degraded to off. Not only the door's
lens: `hypergraph.js`'s own vocabulary-level POS gate (P68's
`posPriorFor` wiring) — fully built, tested, and dormant. A gate whose
ground cannot ship is a wish, not a wall (the DEF/EVA law: a define
lands only when its evaluate can run).

**The measured surprise, which reframed the handoff.** The four-arm
driver (`eval/admission-gate.mjs`: app.js's live reader config, organ
for organ, over the two committed Wikipedia fixtures) found the door's
gate is NOT the fix — the ground is. Arm A0 (reader blind, the live
404 condition): **18/32 junk**, reproducing the reported finding. Arm A1
(ground shipped, door still ungated): **0/19 junk** — the entire junk
class dies upstream at the vocabulary gate the moment its ground exists.
Arm B2 (door alone, reader blind): 18/32 refused, every refusal
verbatim-correct, zero real verbs lost — but `to` (settles as PART, out
of Thrax's declared scope, admits by the lens's own OUT_OF_SCOPE design)
and `right` slip through, so the door is strictly weaker than the
grounded reader. The door's real value: defense-in-depth when the fetch
fails, plus the TYPED refusal record.

**What shipped.**
1. **The ground** — `serve.mjs` + `explore-server.mjs`'s `/priors-data/`
   mounts fall back to **live_priors' committed
   `derived-priors/pos-priors/`** (still read live off a sibling repo,
   never a copy vendored here — /engine's own discipline), with one
   declared alias at the seam (`pos-prior-eng.json` →
   `pos-prior-en.json`: eoreader6.1 names files by ISO-3, live_priors by
   its LANG_OF codes — THRAX_MAP's own declared-translation precedent).
   live_priors is the Ground repo by construction: the artifact there is
   committed with giver, license, and per-file sha256 (its own
   POLICIES.md LP10/LP11 carry that side). Verified live: serve.mjs
   answers 200/699,764 bytes at the exact URL app.js fetches; the
   traversal guard holds. explore-server.mjs carries the identical edit,
   syntax-checked but NOT boot-verified here — it cannot boot in this
   checkout at all (P69's disclosed pre-existing submodule syntax error),
   disclosed rather than implied tested.
2. **The EVA station** — app.js builds `classifyConnector`
   (grammar-lens.js over the same prior, wrapped per call so a lens is
   never captured over a still-null cache; when the cache is null it
   degrades to exactly the ungated door — a check that cannot run must
   not refuse and must not block boot) and passes it through
   `runHolonicTask` → `runPart` → `hyperlexicon.admit`. Asymmetric per
   the grain theorem: a SETTLED non-verb refuses with its giver named;
   out-of-vocabulary admits.
3. **The refusals, visible at every boundary** — the admit loop no
   longer reads `turnedAway` and discards it (P57: not optional):
   runPart returns `hyperlexiconTurnedAway`, runHolonicTask accumulates
   across parts and returns it. app.js does not yet SURFACE it in any
   UI — a named absence, not an implied feature; the eval driver and the
   record are its living consumers today.

**The corroboration finding — the proposed lever refuted before it was
built.** The handoff's lever 1 (fold note identity by referent face +
`sameAct` lemma so cross-source restatements share a note) was measured
as arm C over the gated arm's 19 notes: **0 joins**, and the flagship
motivating pair fails by name — `sameLemma("withdraws", "retreated") =
false`. Withdraw≠retreat is SYNONYMY, not morphology: the corroboration
grain problem is real (P60's fourth amendment, inverted — a fold that
can never fire is a grain signal) but its closure lives in the semantic
tier this repo already has (the witness machinery, P32), not in identity
folding. This measurement sits under live_priors' LP11, earned the same
day from the same investigation's other half: **a loosened key is judged
on its MARGINAL admits, never aggregate coverage** — there, the loosest
key's marginal admits ran 0-56% accurate (in English, 0/8) on exactly
the rows where it would have been the only voice.

**The meta-finding, worth the policy line on its own:** nothing here
needed a new mechanism. The lens was built (P56-era), `admit`'s
parameter was declared (P57), the vocabulary gate was wired (P68), and
the prior was committed one repo over (live_priors, same day) — **three
unwired seams and a 404 masquerading as three missing features.**
Search-for-the-organ, applied to seams: before building anything, walk
the existing pieces end to end and find where the thread actually
breaks.

**Enforced.** `admission-gate.test.mjs` (3 cases, the REAL lens over the
REAL shipped prior through the REAL runPart): the junk-labeled edge
refused at the door with the lens's finding and the passage named on the
returned refusal; `classifyConnector: null` byte-identical to the old
door (both edges admit, nothing refused); out-of-vocabulary admits.
hyperlexicon.test.mjs's own door-level lens cases were already standing.

**Generality:** universal (evidence: `eval/admission-gate.mjs` — the
junk class and its elimination measured on real encyclopedic prose with
app.js's own live organ config; the gate's asymmetry is closed-class
membership against a received treebank, nothing fitted to these pages;
the arm-C refutation is per-specimen honest — 0 joins ON THIS MATERIAL —
and the synonymy-not-morphology reading of the flagship pair is checked
by name, not induced from the corpus).

### P74, amended 2026-09-01 — the availability tier's content is the sibling's artifact, byte for byte

P73 and P74 landed the SAME ground twice within the hour, from two
concurrent sessions: P73 committed a train-only POSPrior@1 into this
repo's `priors-data/` (16,654 forms — `build-pos-prior.mjs`'s own
documented single-file usage), P74's companion (live_priors #17, LP10)
committed a train+dev+test build with per-file sha256 provenance (19,341
forms). The merge kept both honestly — the serving chain's tier 2
(availability: present on every checkout of this repo) preferred the
SMALLER build over the richer one sitting one tier down. Reconciled, not
deduped (eoreader6.1's own rule): the tier is right to exist and its
CONTENT is now live_priors' artifact, copied byte-for-byte
(sha256 a5774fa16fd56bd4…, identical on both sides), so the two committed
copies can never silently drift — a divergence is one hash comparison
away, and live_priors remains the artifact's home (its build provenance,
its LP10 resolution discipline). Safe by construction: every consumer
reads `posPrior.forms` alone (checked: hypergraph.js, grammar-lens.js,
wordclass.js — none reads `language`/`provenance`/`giver`), and
`admission-gate.test.mjs` already proves this exact artifact through the
real lens. Measured after the swap: the three-arm probe's numbers are
IDENTICAL on the committed fixtures (15 bound / 10 notes / 0 junk labels
— the 2,687 extra forms flip no decision there, they widen coverage
elsewhere); full suite 1596/1547/44, the same 44 names, zero regressions.

## P75 — War and Peace, read omnilingually: a real script-blindness bug, found by using the gate on the flagship specimen

*(Renumbered from P72 on merge — concurrent PRs landed P72–P74 first; its live_priors companions renumbered LP7–LP9 → LP12–LP14 the same way. The numbers moved, nothing about the policy itself did.)*

**Generality:** universal (evidence: eoreader7 READING-SPEC.md S34 — the
identical, unmodified fix closes the defect on three independent,
unrelated scripts, Cyrillic/Greek/Hebrew, via a Unicode word-character
class the fixed file already had; two competing hypotheses, case
declension and code-switch dominance, were tested and refuted first)

The ask, directly: run this repo's own flagship specimen — War and Peace,
the text CLAUDE.md's own P5.2/P5.3/P50 already verify 11,132/11,132
passages against — through the full reading process in English, Russian,
and a third language, and use the resultant EOT files to measure whether
reading is actually omnilingual. This repo has no book-length,
multi-language reading pipeline of its own (`eval/crosslingual-eval.mjs`
asks an adjacent, narrower question — does the assertion tier honestly
DISCLOSE its own reach limit — and cannot run in every checkout, since it
targets the legacy `eoreader7/legacy-eoreader6.1` submodule path); the
actual EOT-producing pipeline (`hyperlexicon.js::admit`/`hear`,
end-to-end, over real fetched sources) lives in **live_priors**, as
`scripts/eot-sidecar.mjs` — this repo's own hyperlexicon.js and
eoreader7's own native organs, injected exactly the way this document's
Explore/priors sections already describe, just called from the sibling
repo that owns the corpus rather than from `app.js`.

**The measurement, the root cause, and the fix are all live_priors' and
eoreader7's own record — POLICIES.md LP12 (live_priors) is the corpus-side
account (the real fetched texts, the before/after edge counts, the
disclosed residual gap); READING-SPEC.md S34 (eoreader7) is the mechanism
fix itself. The one-line version: `discoverRelationVocab`'s surface-
relocation regex used `\b`, and JavaScript's `\b` is ASCII-`\w`-only with
no Unicode mode — so a name written entirely in a non-Latin script could
never be located, at all, regardless of recurrence. Measured live: every
edge this repo's own relation reader found in a real Russian excerpt of
War and Peace was from the novel's own embedded French dialogue, none
from its Cyrillic narration; after the fix, in the same append-only log,
under a new witness, 55 new genuine Russian triples landed alongside the
8 that were already there.**

**Why this belongs here even though nothing in this repo's own files
changed.** `hypergraph.js::makeRelationReader` (P12's own grounding-ladder
organ) and `holon.js`'s relation tier both call the SAME `extractRelations`/
`discoverRelationVocab` this fix touched, via the identical native import
path P69's ratchet already crossed `app.js` onto. The live chat's own
relation-tier grounding (bound/contradicted/unbound/beyond-reach/unheard,
per the grounding-ladder section above) was carrying this exact defect on
any non-Latin-script material, unmeasured until now — not a new
capability, a correctness fix to one this repo already depends on.

**Disclosed, not overclaimed.** The fix closes REACHABILITY — a real edge
can now be found — never precision. `grammarPrior: false` on every one of
the three live_priors sidecars (no local `POSPrior@1` build in that
checkout) means the vocabulary-quality gate (P29/live_priors' own LP6) sat
unloaded for English too, so both the pre-fix and post-fix Russian edges
sit at the same "no POS gate" precision floor English's own raw edges
already show in this exact run — a uniform, already-named limitation, not
a new Russian-specific one. And that gate, even loaded, is English-only by
construction (UD_English-EWT); a Russian equivalent is real, named,
unbuilt work, the identical footing `verbForms`/`createLemmatizer`/
`determiners`/`negationWords` already sit on elsewhere in this document.

**Amended 2026-08-30 — a second recipe defect, and the real cause of
referent fragmentation on morphologically rich languages, both found by
aligning the three languages to the SAME narrative content rather than
comparing unequal spans.** Pointer only, same reasoning as above for why
this belongs here though no file in this repo changed: `hypergraph.js`'s
relation tier and `namesCorefer`'s own name-variant coreference (which
`cast.js::makeReferentIndex` — the identity face this repo's own P38/P55
sections already depend on for referent resolution — is built on) both
call the exact organs both fixes touch, through the same native import
path. eoreader7 `native/READING-SPEC.md` S35 is the law for the
mechanism (a comma glued to a capitalised token's own trailing edge was
read as a name-run continuation, gluing two adjacent subjects into one
spurious surface — general, not script-specific, reproduced identically
on constructed English prose before being trusted); live_priors'
POLICIES.md LP12 (its own 2026-08-30 amendment) is the corpus-side record,
including a finding this repo's own `namesCorefer` should know about
directly: run against real aligned Russian material, one person's own
name fragments into **six** distinct referents across eight grammatically
case-declined surface forms, because `namesCorefer`'s exact-token
containment test has no morphological layer, and — a second,
INDIRECT effect of the same cause — declension's own proliferation of
distinct surface strings dilutes `genericTokens`'s derived partner-count
fence (measured: fence 1 on the Russian excerpt vs. fence 3 on the
equivalent English one) until it wrongly flags a legitimate,
unambiguous full-name pairing as generic. Disclosed there, not fixed
here or there: a Russian morphological (declension) folder for
`namesCorefer` is real, unbuilt work, distinct from the English-default
`createLemmatizer` this document's own MINE-1 sections already carry for
a different module's VERB-lemma matching.

**Amended 2026-08-30 — all 516 UN UDHR translations, and a real gap in
`scriptCoverage` this repo's own grounding ladder depends on.** User
direction: apply the same process to every version of the UDHR this
corpus already holds, "more than a universal reading, we're looking for
our blindspots." Pointer only, same reasoning as the entries above: this
repo's `hypergraph.js::makeRelationReader` and `cast.js`'s referent
machinery both depend on `surfaces.js`'s capitalisation layer through the
same native import path P69's ratchet already crossed `app.js` onto, and
`scriptCoverage` (P12's grounding-ladder organ's own upstream gate) is
part of that layer.

eoreader7 `native/READING-SPEC.md` S36 is the law for the mechanism; live_priors'
POLICIES.md LP13 is the corpus-side census (all 516 real translations
re-read, not a synthetic sample). The one-line version: `scriptCoverage`
already refused to read a script with no case category at all
(P75's original entry) — S36 closes a subtler, previously-uncaught form of
the identical hazard, where a script IS Unicode-cased but the material
never actually uses the case CONTRAST the extraction mechanism depends
on. Georgian's everyday alphabet is Unicode-lowercase by category, with
no working uppercase convention in ordinary use; a Cherokee translation
using the syllabary's traditional all-uppercase block fails the mirror
image; and — the finding worth carrying into any future work on this
layer — most of the 24 languages this closes for are not exotic scripts
at all but 20th-century Latin-alphabet orthographies (missionary or
post-colonial linguistic work) that simply never adopted
capitalisation-marks-a-name as a convention. This repo's whole
proper-name layer, and everything built on it, assumes that convention;
it is now honestly absent rather than silently wrong for a measured,
named set of the world's languages.

**Amended 2026-08-31 — the three blind spots the UDHR census found,
closed.** User direction, verbatim: *"fix the issues."* Pointer only,
same reasoning as both entries above: this repo consumes `surfaces.js`
and `hypergraph.js::makeRelationReader` through the same native import
path P69's ratchet crossed `app.js` onto, so a fix to either lands here
by the same route, whether or not this repo's own code is touched.

eoreader7 `native/READING-SPEC.md` S37/S38 are the law for the two
mechanism fixes; live_priors' POLICIES.md LP14 is the corpus-side wiring
and the full 516-file re-sweep. The one-line versions: (1)
`capitalisationIsSignificant`'s normal-approximation significance test —
found under-powered on a Czech specimen, but the real defect (an
exhaustive sweep, not that one specimen) was a systematic bias at small
sample sizes, 24 false positives out of 1,711 checked pairs, all in the
same direction — replaced with an exact one-sided binomial tail; (2) a
highly-inflected language's own name declension (Russian's "Кутузов"/
"Кутузова"/"Кутузову", "Анна"/"Анне"/"Анны") fragmenting one referent
into several strangers, closed by `declension.js`'s new pairwise
case-fold organ, verified at 38 correct merges and zero false ones
against real fetched Russian War and Peace; (3) live_priors' own
POS-vocabulary gate, described in that repo's `loadOrgans` as measured
and working while its actual import path pointed at an empty submodule —
never loaded, for English or any other language, until this pass. None
of the three required a code change in this repo; P12's grounding
ladder and the relation tier it stands on inherit all three the moment
either sibling repo's fix lands, the same way P69's ratchet was designed
to work.

## P76 — The arrangement is two ends and a label; subject/verb/object is a reading of it, not its shape

*(Renumbered from P72 on merge — concurrent PRs landed P72–P75 first; P77 below was P73, and the eoreader7 companions S32/S33 landed there as S39/S40 for the same reason. The numbers moved, nothing about the policies themselves did.)*

**Generality:** not-applicable (names why — a schema/naming decision about
this repo's own stored data shape, no claim about a reading mechanism's
reach over any material).

The grammar-lens work (P29-adjacent, CLAUDE.md) already stated the
principle: *"the ARRANGEMENT (an ordered first end, a label, an ordered
second end) is earned... the READING of that arrangement as subject/
verb/object is a declared, giver-named OVERLAY, switchable, never baked
into the record."* It was never true of the stored shape. Every edge and
claim `hypergraph.js` builds is keyed literally `.subject`/`.verb`/
`.object`, at four separate construction sites (the primary edge loop,
`judge()`, `edgeFace()`'s projection, and the `unheard`-verdict claim) —
the SAE-grammar reading, baked in as the record rather than laid over it.

**Why now.** Raised while scoping a genuinely non-English relation
extractor: `relations.js`'s own header says its slot-finding is
POSITIONAL ("the token immediately FOLLOWING a candidate referent
surface... the slot SVO order puts a verb in") — not merely English
VOCABULARY, an assumption that fails outright on case-marked, freer-order
languages (Latin, Russian, Finnish, Japanese, Korean), several of which
are already in `live_priors`. The user's own correction closed a wrong
next step: building a SECOND, case-marking strategy that still recovers
"subject" and "object" by a different signal is the same borrowed
category surviving through a different mechanism, not removed. The
arrangement itself never needed grammatical names — two ordered ends and
a label is already typologically neutral, true of every clause in every
language regardless of how that language locates its two ends. What
varies per language is only WHERE to look (position, case ending,
particle, agreement) — never which one is the agent.

**What shipped — additive, not a rename.** `arrangementOf(t)` (hypergraph.js,
exported — it closes over nothing, so it is directly unit-testable without
the organ-injected reader behind it) maps `{subject, verb, object}` onto
`{end1, label, end2}` under their earned names. Wired at all four
construction sites via `...arrangementOf(t)`, so the mapping cannot drift
the way four independent `{subject: t.subject, verb: t.verb, object:
t.object}` literals eventually would — this file's own history (DEF/EVA's
`Array.find`, `synthesize`'s `String.includes`) has already found that
drift class twice. `subject`/`verb`/`object` are untouched at every site;
`end1`/`label`/`end2` sit beside them. No existing caller changes
behavior; nothing existing reads the new fields yet.

**What this is not.** Not the full rename P56's own grammar-lens section
already scoped and deferred ("touches ~120 call sites across this repo...
not attempted without [scope] confirmation") — that count is now 221
across 22 files in this repo alone (not counting eoreader7's own `hl.js`
kernel), larger than when it was first measured. Not a second (case-
marking) extraction strategy — that is real, separate, unstarted work,
and it should be built AGAINST the neutral shape, not against
`subject`/`object`, so it never has to answer "which one is the agent" in
the first place. Migrating a consumer off `subject`/`verb`/`object` onto
`end1`/`label`/`end2` happens file by file, verified at each step — the
user's own explicit choice over a single big-bang rename, given the size.

**Evidence.** `arrangement.test.mjs` (new, 6 cases) — a separate file on
purpose, the same precedent `hyperlexicon-stance.test.mjs` and
`hypergraph-vocabulary-candidates.test.mjs` already established:
`hypergraph.test.mjs` reaches the engine through
`../eoreader7/legacy-eoreader6.1`, an uninitialised submodule in this
checkout, so a case appended there would silently never execute. Two
pure-function cases on `arrangementOf` itself, and four against the REAL
native engine organs, one per construction site, including the `nearest`/
`competing` projection (found needing a fixture fix live: a bare
sentence-initial single-word capitalized subject, "Lincoln appointed...",
produced zero candidates at all — `extractSurfaces` correctly refuses that
as indistinguishable from ordinary sentence-initial capitalization; a
two-word name, "Abraham Lincoln," is what the working
`hypergraph-vocabulary-candidates.test.mjs` fixture already used, and
matching it fixed the test rather than weakening the assertion). Full
suite: 1060/933/125 (pre-existing failures, `git stash`-confirmed
identical) → 1066/939/125, zero regressions.

**Amended same day — the first real migration pass, and the finding that
reframes the whole count.** The 221-call-site figure conflates SEVERAL
independent, unrelated systems that happen to share the English words
"subject"/"verb"/"object" for genuinely different reasons — found by
reading each file's actual usage before editing it, not by trusting the
grep. **`grid.js`'s 26 sites (and everything downstream of it —
`web-hunt.js`'s `priorAct.object`, parts of `capacity-runner.js`) are the
terminal-language ACT grammar** (`act relate <subject> to <object>`,
`VERBS[raw.verb]`) — a completely different, independently-justified
naming for an act's own arguments, never hypergraph.js's arrangement, and
out of P76's scope entirely. `succession.js`'s `box.subject` is a parsed
Wikipedia succession-box field. `relations-chain.js`'s `rel.subject`/
`.verb`/`.object` read the ENGINE's raw `extractRelations()` triples
directly, bypassing hypergraph.js and `arrangementOf` altogether — its
own test confirms this (`extractRelations` imported straight from the
engine, never through `makeRelationReader`). `templates.js`'s
`edgeChips()` uses its own independent shape (`.from`/`.to`, not
`.subject`/`.object`) and has no production caller anywhere in this repo.
None of these four are hypergraph.js's arrangement wearing English
clothes — they are four separate things that never needed migrating.

**Two real regressions, caught by running tests, not by inspection.**
`hl.js::stageFromEdges` takes an `edges` parameter from ANY caller, not
exclusively hypergraph.js's own pipeline — `hl.test.mjs` hand-builds
minimal `{subject, verb, object}` fixtures with no `end1`/`label`/`end2`,
and migrating the read broke 2 of 4 cases silently (`git stash` comparison
caught it: 3 passing before, 1 passing after). Reverted — a function whose
contract is "any edge-shaped object" cannot assume an internal
implementation detail of one particular producer. The same class of risk
was found and fixed forward, not reverted, everywhere the caller WAS
confirmed to be hypergraph.js's own pipeline: `provenance.test.mjs`,
`proof.test.mjs`, `verification.test.mjs` (3 cases), and `firewall.test.mjs`
(2 cases, found only by the FULL suite diff — `fact-block.test.mjs` itself
cannot load in this checkout, so its own fixtures were fixed proactively
and unverifiably here, but `firewall.test.mjs` exercises the same
`fact-block.js` code path from a file that CAN load, and caught a real
`"undefined — undefined→ undefined"` break) all needed their hand-built
claim fixtures widened to carry `end1`/`label`/`end2` alongside the
originals — the correct fix, not a reason to revert the production code,
since a hand-built fixture omitting a field `arrangementOf` would have
supplied is the fixture falling behind the shape, not the migration being
wrong.

**What actually migrated, confirmed safe by real callers and real
tests:** `provenance.js`, `fact-block.js`, `proof.js`, `verification.js`
— each confirmed to read exclusively from hypergraph.js's own
`report.claims`/`relations.read()` output before being touched. Full
suite 1066/939/125 → 1071/944/125, zero regressions (`git stash -u`
diffed against the pre-migration baseline, not merely counted).

**What remains, named rather than claimed done:** `dialogue-graph.js`,
`hl-acquire.js`, `hyperlexicon.js`, `predigest.js`, `explore/explore.js`,
`term.js`, and the hypergraph-related portions of `capacity-runner.js`,
`holon.js`, `app.js` (each confirmed, by sampling, to MIX grid.js acts
and hypergraph edges in the same file — the highest-risk shape, since a
wrong call halfway through silently corrupts one system while looking
like progress on the other). **The wipe itself — removing `subject`/
`verb`/`object` from hypergraph.js's own edge/claim construction — is not
attempted and is not yet safe**: the majority of real consumers, even
after subtracting the four false-positive systems above, are still
unmigrated, and removing the fields they still read would break them.
Additive stays additive until that changes.

**Amended same session — the consumer migration finished; the wipe is
blocked on something bigger than remaining consumers.** All nine files
named above were traced to a real conclusion, each verified by the same
discipline (real caller confirmed before touching it; `git stash -u`
full-suite diff after): `term.js` (one genuine site, the `query`
command's no-query edge dump — `reader.edges`, real `edgeFace()` output);
`capacity-runner.js` (confirmed mixed as predicted — `checkObjectSpecificity`/
`checkConnectorClass` read genuine `judge()` output via `runCapacity`'s
"relations" claim branch, migrated; `perSourceReadings`' own `edges`
construction migrated on the READ side only, keeping `subject`/`verb`/
`object` as the DESTINATION keys since `crown.js:376` still destructures
that exact shape as ITS OWN established contract; grid.js's own act-event
fields and `grammar-lens.js`'s `classifyConnector` — which reads
`edge.verb` internally by its own pre-P76 disclosed, deliberately-
unrenamed design — both left alone); `holon.js` (six genuine sites,
`landCompletenessBelief` and both `incompleteClaimsOf`/
`competingSubjectsOf`, same pattern: migrate the hypergraph read, keep
`queryReferents`'/`clusterFillers`'s own separate, already-disclosed
conventions untouched); `app.js` (`crownTestimony`, the edge-badge
renderer, `renderGrounding`'s claim rows — all genuine judge()/
`edgeFace()` consumers; `mintClaimId`'s own required parameter names kept
as the destination shape, same pattern as `perSourceReadings`; found and
fixed, as a byproduct of rewriting the exact line touched, a pre-existing
pair of literal null bytes sitting in `crownTestimony`'s dedup key in
place of two ordinary spaces — harmless in practice, isolated to that
one line, unrelated to this migration). `dialogue-graph.js` and
`hl-acquire.js` confirmed a THIRD and FOURTH instance of the hl.js
pattern above (both explicitly, in their own file headers, hand-author
post-extraction edges as a deliberate two-tier testing design — not
fixable the way a fixture merely falling behind the shape is).
`hyperlexicon.js` and `predigest.js` confirmed to share their OWN
independent EOT-ledger vocabulary (P57) — `predigest.js` even imports
`assertionId` directly from `hyperlexicon.js`, matching its exact
signature, proving the coupling. `explore/explore.js` confirmed to read
an entirely different organ (eoreader6/7's `sessionRelations`/binding-tie
output via the standalone Explore app), never hypergraph.js at all.
`capacities.js` and `proxy-runner.mjs` (found in a final repo-wide sweep
for every `makeRelationReader` importer, beyond the originally-scoped
nine) carry zero direct field reads — clean. One real fixture needed
fixing, not reverting: `capacity-runner.test.mjs`'s Hebrew
object-specificity test hand-builds a `mockRunCapacity` whose claims/
edges carried only `.object` — widened to also carry `end2`, the correct
fix per this same section's own established rule, confirmed by tracing
the test's full logic and every assertion by hand since this file cannot
execute in this sandbox (the same `legacy-eoreader6.1` gap named below).
Full suite after every step: 1071/944/125, identical failure names,
zero regressions throughout.

**The wipe is still not safe, and the reason has changed.** Every
originally-scoped consumer is now accounted for. What blocks the actual
field removal is `hypergraph.js`'s OWN canonical test suite:
`hypergraph.test.mjs` — the primary correctness contract for the exact
file the wipe would edit — has 81 lines across 1,231 directly asserting
`.subject`/`.verb`/`.object` on REAL claims and edges produced by the
real engine pipeline (`c.subject === "Lincoln"`, `e.verb === "appointed"`,
and so on, dozens of times over). That file cannot load in this
checkout — `legacy-eoreader6.1` is an uninitialised submodule pointing
at a repository (`eoreader6.1`) outside this session's own GitHub
access scope — so there is no way here to update those 81 lines and
verify the result by running them. A hand-edited, unexecuted change to
81 assertions in a 1,231-line file is a real, disclosed risk of
shipping a silently-wrong test suite, which is worse than leaving a
correct-but-unmigrated one in place — the same "checks go blind rather
than wrong" failure class P62 already names. Roughly two dozen `eval/`
and `experiments/` scripts share the same dependency and the same
unverifiability, and are named here rather than silently left as an
undisclosed gap — this repo's own standing posture already treats these
as re-runnable historical measurement records, not maintained code, so
they are not migrated, but a future re-run of one after the wipe would
need updating first or would silently print `undefined` in place of a
real value.

**What "ready" now requires, stated plainly so the next pass does not
have to re-discover it:** a checkout with `legacy-eoreader6.1`
initialised (or an equivalent working `eoreader6.1` engine checkout), so
`hypergraph.test.mjs`'s 81 dependent assertions can be migrated to
`end1`/`label`/`end2` AND VERIFIED BY RUNNING, before the four
construction sites (`edges.push`'s literal, `judge()`'s claim object,
`edgeFace()`'s return, the `unheard`-verdict `report.claims.push`) drop
their `subject:`/`verb:`/`object:` lines. `claim.endpoints`'s own
`{subject, object}` diagnostic (P50) and `clusterFillers`'s narrow
`{object}` filler shape (P36) are not part of this wipe at all — separate,
already-disclosed structures, never touched by `arrangementOf`.

## P77 — A genuine second typology, built and measured: case-marking relation extraction, wired through the neutral arrangement

**Generality:** specimen-scoped (disclosed; not claimed further) — see
eoreader7's `native/READING-SPEC.md` S40 for the full measured account
(the organ itself lives there); this entry is the the-fold-side wiring
and its own test evidence.

P76 closed the schema half — the arrangement is two ordered ends and a
label, additive, never forcing `subject`/`object` on a language those
categories don't cleanly fit. This entry closes the half P76's own
"what this is not" section named as real, separate, unstarted work: a
genuinely SECOND extraction strategy, for a language where position
carries no grammatical signal at all, proving the neutral shape is
*required*, not merely tidy.

**Why Latin, and why it had to be measured rather than argued.** S31's
own gate: a fix scoped to a convenient case proves nothing. Latin's
grammatical role is signaled by case morphology (a noun's own ending),
not position — free word order, several real specimens in the corpus
already (`live_priors`' Ovid, Lucretius). The organ
(`eoreader7/native/adapters/text/relations-case-marked.js`) is real,
tested against 380 held-out gold sentences from UD_Latin-Perseus (never
used to build its case prior), and matches a real VOS (verb-object-
subject) specimen — *"possedit cetera pontus"*, "the sea possessed the
rest" — exactly, using zero information about word position. Full
numbers, every disclosed limit, and four real bugs found by measuring
against gold rather than reasoning about it (a punctuation-stripping
regex that never trimmed "manent." to "manent"; mined-vs-received verb
personal endings; weak-ending collisions with common noun cases; a
preposition misread as a nominative) are in eoreader7's own S40 and
`native/eval/results/latin-case-marking-RESULTS.md` — not restated here,
per this document's own summarize-and-point discipline.

**What's wired here, and what deliberately is not.**
`hypergraph.js::makeCaseMarkedRelationReader` is a SEPARATE entry point
from `makeRelationReader`, not a branch inside it — the English
pipeline's referent-index resolution (`cast.js`), assertion order-arm,
connector-class checks, and gender evidence all assume a positional
extractor's own edge shape (`subjectEnd`/`objectEnd` fuzzy matching over
a referent index) that a case-marked organ does not produce. Retrofitting
full pipeline parity is real, scoped, unattempted future work — named
here rather than silently implied done. What IS real: a working reader,
organ-injected (the cast.js pattern — this file never imports
`relations-case-marked.js` directly), producing edges in the shared
`{end1, label, end2}` shape with byte-accurate spans (verified against
source bytes, P5.2's self-verification discipline) and a `case`/`number`
detail on each end that the positional English reader has no use for and
never needed — because Latin's oblique cases (dative, ablative, genitive)
have no honest 1:1 mapping onto `subject`/`object` and this reader
refuses to force one. A gap (multi-clause sentences, ambiguous verbs,
unresolved case endings) is reported on its own list, never silently
dropped — the same "never attempted" vs "attempted and refused" bucket
discipline S22/S39 already hold.

**Evidence.** `case-marked-relations.test.mjs` (new, 5 cases, against the
REAL eoreader7 native organs — `spans.js` + `relations-case-marked.js`,
the same real-organ-integration-test precedent `arrangement.test.mjs`
set): the declared-organs guard, the VOS specimen matched with byte-
accurate spans, the neutral shape checked at the integration boundary
too (never `subject`/`verb`/`object`), a gap correctly surfaced rather
than dropped, multiple passages/sentences all read. Full suite:
1066/939/125 → 1071/944/125, zero regressions (`git stash -u` confirmed
identical failure set — untracked new files included this time, unlike
an earlier check in this same session that omitted `-u` and produced a
misleading result, caught and corrected before being reported here).


## P78 — Working with something that answers back is a capacity the instrument holds, not a score it receives

*(Renumbered from P54 on merge — main took P54–P77 while this PR was open; the entry moved to the tail, nothing about it changed.)*

**Generality:** not-applicable (a capability/architecture pass written before P71's gate existed; renumbered on merge, not retroactively re-measured)

*(Renumbered from P45 on merge — concurrent PRs landed P45 through P53 first. The number moved; nothing about the policy did. Same convention P42 and P29 already record for their own merges.)*

**The law.** Where this instrument acts on something that RESPONDS — a
sandboxed runtime, its own act grammar, a shell, a database, a web organ,
another agent — it may hold, and must be able to hold, seven capacities,
each coordinating the one below it: name what the counterpart affords and
read its refusal as information; attribute an effect to the act that caused
it; compute a later act FROM what came back; predict an effect before
causing it and compare; count corroboration by ROUTE rather than by
repetition; quantify over an open slot rather than trying one filler; and
intervene — run the world again without the act — to establish that an
effect depended on it. `interact.js` is where they live. A caller may not
claim a capacity it did not exercise: what an interaction reached is
DERIVED from the run's own structure, never from what the caller meant.

**The list is received, not invented.** The seven are Commons's orders 5
through 11 (P44's own GIVER names the sources; the eo-wiki's "MHC and EO"
article is where this project already recorded the convergence), read as
requirements on a task rather than as a scale to be graded against. Applied
to interaction instead of to reading they name, in dependency order,
exactly what every door this app owned was missing: `/run`, `/act`,
`.load`, `pip install` each fire ONE act and read ONE response. Before this
policy there was nowhere in this repo to say *do this, read what came back,
then do that with it* — let alone to predict an effect before causing it,
or to establish that an effect actually depended on the act that appeared
to cause it.

**The distinction that produced this policy, kept because the first pass
got it backwards.** The pass that became this one began as a BATTERY: a
ladder of items scoring whether the instrument's interaction reached order
N. That is a thermometer, and a thermometer is not a capacity — the user's
own correction, verbatim: *"are you saying the code is examples of mhc? I
want the app to have these capacities."* The machinery turned out to be the
same machinery either way (a counterpart contract, a closed-loop plan
runner, and the blinding/reordering/intervention controls), pointed at a
different consumer. So the capacities live in `interact.js`, which the app
calls, and the battery (`mhc-interact.js` + `eval/mhc-interaction-
battery.mjs`) is a SECOND CONSUMER of that same organ — never a parallel
copy, because a battery that scores machinery nobody runs has measured
nothing that matters, and two implementations of one fact is the drift
class this repo's own postmortems keep naming (P22's `Array.find`, P24's
runtime-type ternary, P39's deleted `landCell`).

**What interaction can establish that no amount of reading can.** CLAUDE.md
records the causal door as deliberately shut for the measuring organ:
`binding.js` carries `transferEntropy` and `reversalNull`, and the DFR work
measured 100/100 false positives on common-cause synthetic data — that
paper's own conclusion being that confounding *"requires design, not
statistics."* Interaction IS that design. `depends()` infers nothing from a
record: it runs the world again with the act removed, again with an
accepted-but-irrelevant act in its place, and again with that irrelevant
act merely ADDED. All four counts are reported natural-frequency, and a
dependence is established only when the pattern is unanimous. This is the
one capacity here with no counterpart anywhere else in this repo.

**Four honesty rules, each earned by a live failure rather than reasoned
into place.**

1. *A refusal is information, never an exception.* A counterpart saying "I
   do not have that" is the first capacity working. Every step carries
   `accepted`; nothing throws.

2. *An effect is read across the WHOLE run, never off its last response.*
   Found by running an intervention, not by reasoning about one: an effect
   predicate that inspects only the final observation reports where the
   transcript happened to STOP, so appending a no-op breaks it — which is
   exactly what the insertion control does. A sound intervention item was
   refused for `arbitrary_coordination` before this was understood.
   `EFFECT_READS_THE_WHOLE_RUN` is the named export that states it.

3. *A control that decides a correctness claim does not get to depend on a
   seed.* The insertion control originally sampled ONE random position per
   draw and could simply miss the position that breaks the effect,
   reporting robustness it never tested. It now sweeps every position.

4. *Provenance, not position, locates the computed act.* The reordering
   control moves a computed act off whatever index it started at, and a
   positional goal then reads whichever act happened to land there — which
   is how a null gets satisfied by an act that was never computed from
   anything. `runPlan` records `computed` on the act itself.

**Rung 7 is proven, not assumed.** Writing a step as a function of the
responses is a CLAIM; that the act genuinely changed because of them is a
FACT, and only the fact is the capacity. `verifyLoop` re-runs the script
open-loop — every act built from an empty response history — and reports
whether the acts actually differed. A script whose "closed loop" produces
identical acts is not a loop, and that is a real finding about the script,
reported as `loopReal: false` rather than as an error.

**Experiments do not land on the record.** The act-grammar counterpart
(`term.js::actsCounterpart`) opens a SCRATCH log every time, never the
shared app-wide `gridLog`. An intervention runs its plan once per draw plus
once per insertion position, and landing all of that on the instrument's
real append-only record would bury it under an experiment nobody asked to
keep. What is learned lands; what was tried in order to learn it does not.
A caller that wants an act ON the record uses `act`, which is what that
command is for.

**The doors.** `openRuntime(lang)` (term.js) holds a sandboxed runtime OPEN
across acts — the same boot/exec/done protocol every worker here already
speaks, with the same per-runtime budget `runSandboxed` uses, and a
timed-out act resolving as a refused response rather than a thrown error.
The interactive prompt already had a held session; the instrument did not,
because `spawn()` is wired to the drawer's DOM. Two terminal commands
expose the capacities: `interact <counterpart> | <act> | <act>` (where `$N`
is the Nth response — which is what makes an act computed rather than
typed — and `=> text` declares an expectation BEFORE the act runs), and
`depends <counterpart> effect:<text> omit:<n> placebo:<act> | <act> | ...`.
Counterparts are derived from `ROSTER` plus the act grammar, so a runtime
added there is workable-with without an edit here. The grammars are pure
and exported (`parseInteract`/`buildScript`/`parseDepends`) so they are
tested off the page, and `buildScript` is tested by CONDUCTING against an
in-memory counterpart — "this act is computed from the response" is
demonstrated, not asserted.

**Evidence.** `interact.test.mjs`, 32 cases, process-free and organ-free:
every capacity against in-memory counterparts whose behaviour is fully
known, including a deliberately deaf one (answers identically whatever it
is asked) which never establishes a dependence, and a deliberately brittle
plan which cannot establish one either and says why. `term.test.mjs` grew 8
cases for the doors' grammars. `eval/mhc-interaction-battery.mjs` runs the
scoring consumer against three genuinely different REAL counterparts — this
repo's act grammar over the engine kernel, a real `python3 -i` subprocess,
and a real `sh` subprocess, no model anywhere — and all three reach stage
11 with the scale holding: **zero orders changed their order-hood with the
counterpart**. Full suite: 608 passing / 116 failing before this pass,
672 / 116 after — the same 116 pre-existing environment failures (missing
vendored `sql.js`, model files, `monaco-editor`, and the sibling-engine
import paths this checkout does not carry), confirmed by `git stash`
against this exact worktree, zero regressions.

**Disclosed, not silently absent.** A live model is a legitimate
counterpart for this contract and is not wired: scoring one re-opens P44's
own confound (both sides act, so the number is about the pair) and needs a
scripted control of declared order beside it. The web organ, the database
fold and the GitHub organ all satisfy the contract and have no adapter yet
— each is one `open()` away, and naming them is not the same as having
written them. Orders 12 and above carry no capacity here: `interact.js`
stops at 11, and `stageFrom` caps accordingly rather than implying more.

## P79 — The resolution test: a statistic must move (2026-09-01)

**Generality:** universal.

**Law:** eo-constitution **II.23** (19th amendment, sealed). This is the
pointer; read the article for the binding text.

**The one-line version.** P70 and A10 already say a null must be licensed.
II.23 splits the claim in two, because the halves fail independently:
**II.10 governs the null** (does it differ in exactly one axis), **II.23
governs the statistic** (does it move when that axis moves). A perfectly
commensurable null carried by a statistic that cannot resolve the question
fails exactly the way an unconditional null does — real ground, real rank,
no trace that nothing was measured.

**Found by breaking it three times in one session** (`kind-induction-finding.md`
carries the measurements):

1. A basin chosen for cohesion, placed against random subsets of its own
   population — already forbidden by II.10's *selection is an axis*, and
   broken anyway. The law existing was not enough; that is why II.23 ships
   with a conformance test.
2. Direction assumed rather than derived. Redealing hands every entity the
   corpus-average profile, so redealt entities are **more** alike than real
   ones. "Observed beats the null" was the wrong inequality, and it reports
   an absent effect as a present one.
3. A commensurable null whose statistic could not resolve the claim. Adding
   one foreign member to a cohesive ten-set moves a set-level statistic by
   less than its own noise, so every candidate passed — including the ones
   that had to fail.

**What binds here.** A module in this repo that spends a null ships a
control **constructed to fail**, named as one; carries the null's own spread
beside the verdict, never the verdict alone; scopes the perturbation to the
grain of the claim; and types absence of evidence apart from evidence of
difference. `kind-standing.js` is the reference implementation and the
registered seam.

**Enforced:** `eo-constitution/conformance/resolution.test.mjs`, derived
from source in III.4's shape. It is mutation-checked: stripping the named
controls from a registered seam fails it. Its own first version was
toothless (it keyed on assertion shapes, so ordinary `assert.equal(x,
false)` lines counted as controls) — II.23 caught the file written to
enforce II.23, which is the strongest evidence available that the article
is doing work.

**Honest boundary.** The test verifies a control was BUILT, never that it
is a good one — the same boundary P71's generality gate draws. The
measurement is still real work.

## P80 — The ledger is the engine's, medium-blind, and born with its frame; the-fold keeps only the surface (2026-09-02)

**Generality:** universal.

**User direction, verbatim:** "I think the hyperlexicon should be part of
eoreader7, medium agnostic" — "make that shift and learn lessons about music
and priors and have all reading be vastly richer. no view from nowhere" —
"the fold should only be an interaction surface."

**Decision.** The assertion ledger (P57) lives in eoreader7 as
`native/kernel/notes.js`: ends `end1/label/end2` (P76's earned names), gate
injected, structural refusals only, spans carried opaque past their address,
and a `frame` declared at creation as the log's first entry (DEF · Ground ·
declared). `native/organs/hyperlexicon.js` is the text face and keeps every
caller's API byte-compatible; this repo's `hyperlexicon.js` is a shim. The
reading closure that the seam had deferred — `hypergraph.js` and the twelve
files it closes over — crossed into `native/organs/` together, with eleven
test files; shims stand at every old path; `web-seam.test.mjs` (new here) is
the one test that came back, because it reads this surface's own page files.

**No view from nowhere, as code.** A ledger born under `holonicTurn` carries
`readerFrame()` (app.js): the organs `relationsFor` was built from, which
priors had loaded by then, which are deliberately absent, the model. Read it
back with `hyperlexiconFor.frameOf(log)`; a ledger with no frame says
`no_frame` and is never given one. Honest edge: the frame is a fact about the
ledger's BIRTH — priors that load after the first grounded turn are not in
it, which is true of that reading and is not a promise about later ones.

**The music lesson, measured and mostly negative.** The ledger is now a stream
`surprise-segments.js` cuts unchanged (`stream`/`figures`/`segment` on the
kernel). Against three real pages' own section headings the cuts land at
chance at every grain (best 12% vs 11% null median, 58/200 at or above) — a
page's section is a convention of its script, as the sentence was. What
surprise DID find, untold, on all three pages: the most surprising hearings
are the page's furniture at its tail (`category link —is→ on Wikidata`) — the
diet boundary of a reading, a lead for the admission door. And one kernel
bug, caught by two numbers disagreeing: the flat cut ran without the stream's
own alphabet as its floor. Full account: eoreader7 S42 and
`native/eval/the-fold/results/notes-segments-RESULTS.md`.

**Enforced.** eoreader7 `tests/notes.test.js` (7, including the medium pin —
the kernel's body may not name sentence/word/verb/subject/object/bar/pitch),
`organs/hyperlexicon*.test.mjs` 36/36, the eleven moved files 168/168
(`hypergraph.test.mjs` 58/58 native — Pass 7 had it at 52/58); here,
`holon.test.mjs`/`admission-gate.test.mjs` unchanged. Suites diffed by
failure NAME against clean baselines: this repo 1052/125 → 940/67 with zero
new failures (every line that left is a moved test); eoreader7 592/23 →
792/22, zero new, one fixed. The real page loaded through the shims in
headless Chromium: boot completed, zero exceptions, zero console errors.

**Disclosed, not done.** The-fold still holds ~90 modules with no DOM or
server reference (`NEXT-PASSES.md`, Phase 4 inventory) — the surface is not
yet ONLY the surface; this pass moved the closure that blocked the seam and
the ledger that the music work named as the next stream. The-fold's tests
for cite, primary, measure, capacity-runner and crown stay here because they
import surface modules (provenance, proof, tables, grid, crown) and run
through the shims. A non-English page passes the English POS gate untouched
(every Cyrillic label is out of its vocabulary): a gate with no giver for the
language is honestly no gate, and stays that way until one is received.

## P81 — The frame follows the reader, and every witness names its recipe (2026-09-02)

**Generality:** universal.

**Decision.** The ledger's frame is no longer a birthday: `holon.js`
redeclares it on every grounded turn from `app.js::readerFrame()` as the
reader stands now (eoreader7 `kernel/notes.js::redeclareFrame`, SUPERSEDE,
the past kept), so a prior that loads after the first grounded turn is
recorded as in force from the hearing it first read. And every mechanical
witness the ledger lands carries the reader's recipe — `<ref>~<recipe>`,
`recipeId` over the frame (P68) — so `independentReadings` counts this
reader as ONE instrument across every page it reads. Until now every live
witness was bare and every reading was its own undeclared instrument.

**The door that was proposed beside it is refuted, and stays refuted.** A
"diet boundary" by surprise (a source's tail run above its own null) was
built, tested on planted structure, and measured on real pages and a real
Gutenberg licence: it misses furniture and fires on lists. eoreader7 S43
and `diet-boundary-RESULTS.md` carry the numbers; the kernel keeps the
statistic as a diagnostic and the concession act unlicensed. Do not
rebuild a furniture gate on surprise. Furniture is about something else,
and "about" is the referent tier's question (P38, P79).

**A first number for reading getting richer from what it has read:** the
ORDER of labels on one English page predicts the next English page's
hearings 0.2–0.3 bits better than its own shuffle, 20/20; nothing
transfers on the ends. One number, three pages, the label stream.

**Enforced.** eoreader7 `tests/notes.test.js` 10/10; here `holon.test.mjs`
unchanged and the full suite 940/67, zero new failures by name; the real
page loaded through `serve.mjs` in headless Chromium — boot completed, zero
exceptions, zero console errors. Not verified live: a turn against a real
model, since no Ollama is reachable here; the recipe reaches the record
through the same `admit` call every grounded turn already makes.
