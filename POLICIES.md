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
