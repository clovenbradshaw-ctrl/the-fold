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
attach) moved to `eoreader6.1/packages/engine/interpretation/hl.js`.**
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

## P42 — Polarity that was never measured is never a verdict, and a received class that closes a false binding is turned on

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
turned on, not left opt-in.** P41 landed `organs.determiners` and P42
lands `organs.negationWords`, both received closed classes with named
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
