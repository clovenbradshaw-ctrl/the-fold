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

---

*Established 2026-08-16, alongside the holonic layer, the constitution
channel, and the local-only excision. The lineage evidence cited here was
gathered by a five-reader sweep across eochat, eochatX, eoWebLLM, and the
engine; the full brief is preserved in that session's task output.*
