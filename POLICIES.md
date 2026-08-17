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
  PyPI — pip is a typed refusal naming this policy; the stdlib is all
  there is);
- **sql** — sqlite via sql.js, vendored the same way; loaded CSV material
  imports as typed tables (the quote-walking parse and the all-or-nothing
  column typing are term.js's own, tested).

Material reaches a runtime only by a visible crossing — "material
crossing into the sandbox: N sources, M bytes", printed where it happens —
mounted read-only (/material in python's MEMFS, material(name) in js,
.load in sql), re-synced only by the explicit `mount`. Runtimes that
cannot exist under P1 are refused with their reasons (bash/zsh/sh, node,
pip/npm, WebContainers, WebVM, ssh) — typed refusals, never
half-simulations; the registry stays open to any runtime a
localhost-served module can boot. The sandbox is an authority wall by
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

*Established 2026-08-16, alongside the holonic layer, the constitution
channel, and the local-only excision. The lineage evidence cited here was
gathered by a five-reader sweep across eochat, eochatX, eoWebLLM, and the
engine; the full brief is preserved in that session's task output.*
