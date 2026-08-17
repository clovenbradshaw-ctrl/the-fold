# The Fold — inherited law

This repo does not get to invent its own rules. The canon lives elsewhere and
is read first. This repo's own operating policies — the standing decisions
made under that canon, each with its evidence and its enforcing test — are in
`POLICIES.md` and bind every session working here.

| document | what it governs | path |
|---|---|---|
| `CONSTITUTION.md` | what an organ may do, what is legacy, what an amendment costs | `../eo-constitution/` |
| `LAWS.md` | eoWebLLM's laws, L1–L7 — each one a mistake made twice | `../eoWebLLM/LAWS.md` |
| `READING-POLICY.md` | **canonical for how reading works** — P0–P6 | `../eoreader6/` |
| `CUBE.md`, `12-nine-terrains…md` | the nine terrains as a *representation* standard | `../eoreader6/` |
| `SEED.md` | perceive only by difference from a ground you rebuild | `../eoreader6/` |

The rest of this file is the mapping: which law binds which file here, where
this repo already complies, and where it knowingly does not. It exists so the
next pass does not re-derive any of it from scratch — which is what happened
through most of this one, at real cost.

---

## Laws this repo is built on

**L5 — a compliance-critical fact is never left to the model's own
instruction-following.** The load-bearing one. `BASE_PROMPT` asks for an
address after every claim; two models four times apart in size ignored it on
tabular material, zero addresses across six turns. The fix was not a better
prompt: `cite.js` attaches the address mechanically, `grounding.js` checks
every figure and name against the bytes, `tables.js` computes a table the app
already knows the answer to rather than asking for one. **This law was
rediscovered here by measurement before it was read. It was already written
down.**

**READING-POLICY P1 — activation decays, identity does not, recall is
retrieval.** `RECENCY_WINDOW` is the reach of the present, not the size of
memory. A turn that falls out of it is not forgotten; its record is addressed
and re-openable. *Never enlarge the window to fix a recall failure* — if
something is not coming back, the defect is in retrieval or coreference.

**P5.2 — normalize before computing offsets; byte-offset self-verification is
mandatory.** Every chunker here is verified: 121/121 row groups on the MNPD
CSV, 670/670 on the Nashville slice, 11,132/11,132 on War and Peace.

**P5.3 — strip container boilerplate.** Was violated until just now: 47 of
11,190 War and Peace passages were the Gutenberg licence and donation appeal,
fully retrievable and citable. `stripContainer` in `source.js` drops them and
carries the offset forward so addresses still name the file on disk.

**P4 — numbers are declared, gaps are results.** Partially honoured. `retrieve`
has no relevance floor by design; `checkGrounding` distinguishes `examined`
from `clean`; `openQuestions` reports a gap rather than guessing. But
`ROWS_PER_CHUNK`, `NULL_SAMPLES`, `CORPUS_MINIMUM` and `MAX_FINDINGS` are
hand-picked constants that P4 says should be derived from the material. **Open
debt.**

**P5.5 — when a result surprises you, check the driver before the theory.**
Honoured twice: the attribution false-warrant rate was traced to the null, not
to the corpus; the "fix didn't work" was traced to a stale module served from
cache, not to the fix.

**L2 — capitalisation is a differentiator, never the primary signal.**
`cite.js::namesIn` uses capitalisation to find names and then *vetoes* on them;
it never admits an entity on capitalisation alone. `grounding.js` carries the
discourse-adverb stoplist for the same reason.

---

## What this repo may not do

**The cube is not a content classifier.** `packages/engine/operators.js` records
the measurement: 95.7% of cell assignments survived shuffling the words inside
2,527 paragraphs. Deriving a terrain from a passage is a refuted move. The nine
terrains are a representation standard and a dispatch key for verbs — never a
label computed from text.

**Only two of the nine terrains have lenses today** (Entity, Link — referent
identity and modifier scope; `eoreader6/reading/index.js` says so in its own
header). "All the terrains" is not available anywhere, including in eoreader6.
A reading with no lens on a terrain omits it, and that omission must stay
visible — never silently implied as "there is nothing there."

**Nothing is ported from `eoreader4.x`.** Constitution I.2: legacy is frozen
reference; a legacy organ that has not been re-earned does not exist for
placement purposes.

---

## Where the engine already does it

Do not rebuild these. `eoreader6/packages/host/` is the assembled reader:

- `createSession` / `admitChunked` / `ingestFile` — admission, chunked, with
  byte-accurate spans and provenance. Ingests 3.3MB in 8.4s.
- `searchSpans` — retrieval returning `{span_id, source_id, byte_start,
  byte_end, text}`, the same address shape this repo's refs use.
- `sessionReferents` / `sessionRelations` — coreference and relations.
- `executePrompt` (`surfer.js`) — the address ladder SOURCE → HEADING →
  CONTENT → WINDOW, "never fabrication".
- `emergence/surprise.js` — novelty (Shannon surprisal) and Bayesian surprise,
  kept apart, provably identical only at full commitment. This is the measured
  answer to "what is most interesting", and the only licensed one.

One measured gap found while wiring: `searchSpans` does not fold diacritics —
`Natásha` returns three spans, `Natasha` returns zero. This repo's `tokenize`
does fold them. Same bug class, opposite state.

---

## Explore (added 2026-08-16) — what was decided, so it is not re-derived

Explore is the data explorer: one source in focus, its surfaces revealed as
plain-named views (source / cast / relations / graph / trace / kinds / gaps /
projections / legend). **The nine-terrain grid never fronts the UI** — the
user refused the 3×3 map ("surfaces should reveal themselves"); the canon
lives in the legend view, typed `received` with its giver.

**Files.** `explore-server.mjs` (port 8812; localhost-only CORS; serves this
whole directory INCLUDING the `/engine` mount serve.mjs has — without that
mount the chat page half-loads and its tab handler silently never binds),
`explore-worker.mjs`, `explore.html`, `explore/explore.{css,js}`,
`explore-bridge.js`, `render.js` (+ tests). Engine work lives in
**eoreader6 `packages/host/terrains.js`** (sessionTerrains / sessionKinds /
kindsNullArm, conformance in `host-terrains.test.js`) — the user's standing
rule is *leave everything you can in eoreader6*.

**The record (FOLD-CONSTITUTION I.5).** `record/explore-record.jsonl`,
append-only: every source open, every job with its declared parameters,
every deposit, every error. Never truncated, never rewritten. Deposits from
Converse land content-addressed in `materials/`.

**Coordinate spaces, never mixed silently.** `b0/b1` = UTF-8 bytes (engine);
`c0/c1` = JS-string chars (chat refs; `readRange` slices the JS string).
`explore.js::byteCharIndex` converts; deep links carry whichever space they
were born in.

**Kinds ship armed.** induceKinds fabricates on structureless material
(eo-evidence: 10% against a registered 5% bar), so every run carries a
per-population null arm (redealt copies, marginals preserved, co-occurrence
destroyed), DEFERRED so the kinds render first as `provisional` and the arm
lands after. Draws are caller-declared; **the renderer may never phrase
finer than the arm's `finestRank`** — the banner sentence is built from
draws/drawsWithKinds, natural-frequency style. Tiny populations return a
typed `refused-as-underpowered` gap, never the engine's raw throw.

**Atmosphere runs at hop = window.** Not an optimisation: the slack-run
null is calibrated at that stride (loops/reading-regime.js: 55–90% false
alarms at stride 1 vs 0–3% at window). hop=1 was the miscalibrated choice —
and also 148s of what used to be a 7-minute read of War and Peace.

**Reads stream.** `sessionTerrains` emits each surface as its organ
finishes, cheapest first (Field ms → Atmosphere ~30s → cast ~88s → graph
~25s on the 3.3MB Tolstoy; admission itself is 8.6s). The worker forwards
each as `reading:<Surface>`; the server accumulates `job.partial`; the page
reveals views progressively. Completed reads are memoized in-memory by
path·mtime·size and reuse is recorded (`read-reused`), never silent.

**Embed contract.** The chat page hosts Explore as a pane
(`pane-explore` → iframe `http://localhost:8812/explore.html?embed=1`,
loading=lazy). Embed mode drops Explore's own chrome; the rail folds behind
☰. Explore → chat crossings are postMessages:
`{type: "fold:material:add", name, path, text}` — the chat side owns the
listener, its sources strip, and mute/unmute. The Material TAB is removed
by user direction (drop-anywhere and paste flows remain).

**Shared-file ownership (multi-session).** `app.js` interior, holon.js,
constitution.js belong to the fold-architecture session — render.js was
built to its contract (block structure only; every inline run through
`decorateInline`; fenced code and tables belong to artifact.js; addresses
`[name#a-b]` are opaque tokens). `.tabs` in index.html is the panel tab
bar; anything header-level must not take that class. Hard rule enforced by
constitution.test.mjs: **no non-localhost host anywhere** — no webfonts, no
CDN, nothing.

The same class then surfaced INSIDE this repo, found by running the
instrument on War and Peace (2026-08-16): `tokenize` folded, so retrieval
found the right chapters, while `grounding.js`'s containment index and
`cite.js`'s name veto did not fold — so Bezúkhov and Hélène, plainly in the
retrieved bytes, were flagged "not in the material" and real attributions
risked the veto. Fixed with one shared `foldDiacritics` (source.js) applied
on BOTH sides of every containment; regression pinned in
`grounding.test.mjs`. The lesson generalizes: every organ that compares text
to text must share retrieval's fold, or a found passage fails the very check
that should confirm it.

---

## The web organ (added 2026-08-16) — what was decided, so it is not re-derived

Web search and page reading exist, as P13's one sanctioned egress (POLICIES
P13 amends P1 — read it before touching any of this). The split is strict:
**`web.js` is pure** (extraction, both DuckDuckGo faces, the history fold,
archive-address naming — all tested offline against captured fixtures in
`eval/fixtures/`), **`explore-server.mjs` owns the network** (`/api/web/
search|fetch|history|settings|clear`), and **the browser page still fetches
nothing remote** — `web.test.mjs`'s seam test scans explore.js/explore.html/
explore-bridge.js exactly the way II.13 scans the Converse files. Archive
links in the UI are anchors built from server data, user-followed, never
page-loaded.

**A fetch keeps everything.** Raw bytes AND the extracted readable face land
content-addressed (sha256) in `web/pages/`; the visit lands in
`web/history.jsonl` with its retrieval date. Salience is `foldExtract` over
the whole saved text (kept-of-N declared) — finding what matters never
shrinks what is kept. Saved pages are ordinary sources: opening one from
history runs the full reading pipeline. Re-fetching identical content
stores one copy (content addressing) but each visit is its own history row
— browser-history semantics, except the rows hold the pages.

**history.jsonl is a fold, and clearable.** Append-only in operation (the
deferred archive.org result patches by id — SPN routinely takes a minute
the fetch response must not wait for), clearable by decision (per entry or
all; files deleted only when no kept entry names them). The clearing is a
record event: `web/` is the user's to empty, `record/` is not. web/ is
gitignored like record/ and materials/.

**The UI is the "web" view** (always present, next to "files") — omnibox
(address reads, anything else searches), the archive.org toggle (server
truth, default off), salient-lines card, then history grouped by day:
time · title · host · size kept · archive state · html · ✕. Deliberately
NOT the materials strip and NOT the desk tiles.

**Refusals stay typed** — measured live while building: DDG's anomaly page
→ `refused-upstream`; a proxy's 200 "upstream connect error" body →
off-endpoint (a failed search, never "the web had nothing"); britannica's
Cloudflare "Just a moment..." → `challenge: true` on the entry, bytes still
saved, ⚠ in history. And the extraction lesson: attribute values legally
contain ">" (Wikipedia's data-mw JSON), so every tag regex in web.js walks
quoted values — the naive `[^>]*` leaked half an infobox into the text face.

## The holonic layer, and its one known deviation

`holon.js` runs a task as parts: plan (shape enforced by decoding grammar,
never by instruction), then per part the same organs an ordinary turn uses.
The plan is an append-only log in `task-log.js`'s vocabulary (propose /
supersede / evidence / result / retract; seq not clock; supersession keeps
the past; evidence accumulates from any entry; payload carried through the
fold) — the cube/operator half of that module is deliberately NOT carried:
this repo is not a cube consumer.

**Known deviation, disclosed rather than hidden:** a part retrieves on the
plan's words, which are model-authored — an authority ordinary turns do not
grant (READING-POLICY: retrieval is a function of the question's own words).
The mitigations are mechanical: a part whose words share no term with the
task is a typed `open` entry; part labels are checked with the draft against
the part's own passages; and the task's record only exists when some part
actually retrieved something. An adversarial review (18 agents) confirmed
this deviation can still steer a certified record toward plan-invented
subjects when the corpus happens to contain the plan's words — that residue
is accepted and this paragraph is its disclosure.

## The constitution's channel

`FOLD-CONSTITUTION.md` (repo root, one level up) governs this workbench. It
reaches the model as ONE folded paragraph (`constitution.js::CONSTITUTION_PROMPT`
— the system prompt), and the model is never trusted with any article: the
article→organ map in `constitution.js::ENFORCEMENT` names which code enforces
what, `constitution.test.mjs` is the assay that walks it, and the unwired
articles (III.1 anchor, III.4 opposite, III.5 prediction) are listed there as
unwired — VI.3 — rather than implied as compliant.

## Local only

There is no hosted-model path. The Anthropic SDK, provider select, key input,
and webfonts were all removed 2026-08-16; `constitution.test.mjs` fails on any
non-localhost host in the files the page loads. Do not add one back.

## The self plane (added 2026-08-16) — what was decided, so it is not re-derived

The chat has access to its own cognition on request, held on a plane the
material can never be confused with. P15 in POLICIES.md is the binding
statement; this is the map of the decisions.

**The ledger.** `reflex.js` — per conversation, append-only (seq not clock),
one act per cognitive event: asked / planned / retrieved / checked /
corrected / recorded / folded / surprise / errored / answered-from-state.
Written mechanically from app.js's own turn loop (the same onProgress
branches that already narrate); no model ever authors an entry. Rendered to
a deterministic text (one paragraph per turn), chunked with self-verifying
offsets, addressed as `self:ledger#a-b` — the reserved `self:` namespace,
refused to loaded sources at `addSource`. Self refs re-open in the same
dialog as material refs (rebuilt from entries alone); no Explore deposit —
the ledger is the conversation's, not a file's.

**The levels, on request.** `/self` is the ladder with counts; `/self
acts|surprise|pace|folds|records|sources|passages` are computed tables
(mechanicalTurn — no model call; the new builders live in reflex.js, served
through tables.js). Natural phrasings go through `detectReflex`, which
REQUIRES the second-person tell ("what surprised **you**", "how do **you**
think") and runs after detectTable — a question about surprise IN the
material stays the material's. `/reflect <question>` is the model turn over
the plane: retrieval with the same `retrieve` organ over ledger chunks
(recency slice = RECENCY_WINDOW/2 turn-paragraphs, the fold's own present
converted, plus top-3 term matches), the SELF block distinct from MATERIAL
by framing, the same checks (checkGrounding / attribute / checkCitations /
classifySentences) run against the ledger's bytes, and the warrant typed
`plane: "self"` end to end (fold.js carries it, ON RECORD marks it, the
renderer says it). Material refs quoted inside offered ledger lines join
the known set so they render re-openable, not "invented" — the self plane
may point into the world's record; it never absorbs it.

**Surprise is measured, never asked.** The meter is eoreader6's
`emergence/tiers.js` — `createTierStack(["discourse","atmosphere","lens"])`
+ `foldThrough`, over `surprise.js` — injected via the cast.js pattern so
reflex.js stays node-testable. One arrival per message heard, both roles
(for a computed table, its caption — rows restated from state are not an
arrival). Numbers: window = RECENCY_WINDOW, gamma = the engine's
`gammaFor(window)` = 0.75, draws = 200 and alpha = 1 (read-frankenstein's
declarations), seed = 0 — givers named, nothing tuned here. First arrival =
typed `no_ground` gap. Ranking is mechanical: censored-above first, then
rank, then bits; the caption phrases the null natural-frequency style.
`tiers.js` imports `../../../nul/index.js`, so **both servers carry a
`/nul` mount** beside `/engine` (serve.mjs and explore-server.mjs) — without
it the page dies at import time.

## The graph's three organs and its cursor (added 2026-08-16, second pass)

The Network surface admits belief from three engine organs, each with its own
null, all declared on the result: (1) SVO statements from the clause ladder;
(2) cast co-arrival binding (emergence/binding.js, the read-frankenstein
numbers: window 2, draws 199); (3) **recurring-form co-arrival binding** —
the same organ over the document's own Zipf-filtered vocabulary, arrivals ≥ 2
(binding's structural minimum), form cap 24 and draws 64 as the declared
interactive dial with finestRank carried. (3) exists because concept
documents starve the cast ladder — measured on SEED-SPEAKER.md: cast of four
sentence-initial capitals, one arrival each, graph of 2 nodes; with form
binding, 21 nodes / 38 edges of the document's actual vocabulary structure.
Form nodes are never presented as cast.

The reading cursor: the graph is admitted in ordered stages (12 + one per
binding organ), one snapshot each — scrubbing shows belief AS OF that point;
decay per stage is the organ's own semantics, stated in the UI. Layout is
computed once over the final stage and cached so the cursor scrubs belief,
not geography. Soft breaks in markdown paragraphs join as spaces
(CommonMark); blockquotes keep their lines; pipe tables are explore.js's own
pass (render.js stays table-free per the app.js contract).

## The build log (added 2026-08-16, fourth pass) — what was decided, so it is not re-derived

P16 in POLICIES.md is the law; this is the map. The idea, verbatim from the
user: **all builds are append-only logs with EO notation — anything being
built, folded into the projected app, downloadable at any cursor.**

**Files.** `build-log.js` (pure; the engine's `holon/task-log.js` injected —
cast.js pattern — so the page loads it from `/engine` and the tests by
relative path); `build-log.test.mjs` (13 conformance tests against the REAL
engine module); app.js's builds/editor sections consume the fold;
serve.mjs's `POST /api/build-record` writes `record/build-record.jsonl`.

**The shape.** One log per build, one thread: PROPOSE (birth, from the
turn's parsed segment) → SUPERSEDE per committed edit/reset/restore (past
kept) → RESULT per run (attached to the version that ran). `foldBuild(log,
atSeq)` is the projection; the builds panel renders THAT, at the cursor the
reader scrubbed to, and `exportAt` downloads the fold as a file named by its
address (`build-3@5.py`). Restore is a forward SUPERSEDE carrying old bytes,
never a rewind.

**The EO typing is from the act, never the content** (the cube stays refuted
as a content classifier): PROPOSE = SEG·Figure·produced — task-log.js's own
`proposeDiscovered` cell, reused, because artifact.js literally snips the
segment out of the turn's answer; SUPERSEDE = SYN·Figure·produced; RESULT =
no operator (results attach, they never re-type — `produce()`'s own
discipline). SEG→SYN→… never runs the algebra backward; the engine's
`checkCubeProgression` is the pinned referee, not a local restatement.

**The disclosed amendment.** "The cube/operator half of that module is
deliberately NOT carried" (holonic layer, above) is now amended FOR BUILDS
ONLY, by user direction (2026-08-16). holon.js's plan log is untouched and
still carries no operators.

**Edges decided, not implied:** editor keystrokes are a persisted DRAFT
(`entry.draft`), committed to a SUPERSEDE when the draft runs OR when the
editor is left (`commitDraft` in showView/openBuild) — per-keypress entries
would make the log a keylogger, but a draft that never entered the log
would be a second, hidden truth the panel and the download silently
disagree with. The one residue: a reload mid-edit keeps the draft
uncommitted until the editor is next left. Identical code is churn, refused
by `reviseBuild` (the entry would change no state). Result entries keep run
output to a declared budget (16K chars/stream, `kept/of` stated on the
entry) because unbounded results would fail localStorage persistence
silently. localStorage persists `log.entries` alone and restore REPLAYS
them through the engine's `append` (a corrupt row throws and skips that
build, never loads silently); the pre-log mutable shape migrates via
`fromLegacy` to the honest floor — history that was never kept is not
invented. The mirror batches each append-set in ONE request and chains
batches per build, so record rows land in log order; downloads are recorded
as `build-export` crossings. The record mirror lives on serve.mjs only (the
same server that runs builds); a page served from explore-server's 8812
reports the miss to the console, the same posture `/api/run` already has
there.

## The grounding ladder (added 2026-08-16, fifth pass) — what was decided, so it is not re-derived

The P12 amendment (hypergraph wired) and the P13 amendment (proof-seeking)
are the law; this is the map. The organizing idea, from the user directly:
grounding is not about never being wrong — it is the visible EFFORT of
reading the output against objective phenomena, where objectivity is the
asymptotic approach toward truth from different perspectives. So support is
never a bit anywhere in this ladder: it is counted perspectives, typed
verdicts, and disclosed limits.

**The ladder, bottom to top.** (1) address tier — `checkCitations` /
`attribute` (unchanged); (1.5) quotation tier — `quotes.js` (P17), NEW:
every quotation followed to the bytes; verbatim quotes self-cite their
chunk mechanically, drifted quotes are REWRITTEN to the source's own bytes
before rendering (repair disclosed, then re-inspected so the record
describes what ships), fabricated quotations join unsupported and drive
correction, outside-offer quotations are typed opens with the anchor where
the words live but never an inline warrant; (2) atom tier —
`checkGrounding` for absence, `corroborateAtoms` (grounding.js) for
STRENGTH: every checkable atom with the passages that state it, refs and
distinct sources counted apart because two chunks of one file are one
perspective; (3) relation tier —
`hypergraph.js`, NEW: the material's own edges (engine organs, injected —
`discoverRelationVocab` / `extractRelations` / the referent index) versus
the answer read with the SAME organs, five typed verdicts (bound /
contradicted / unbound / beyond-reach / unheard — the field's own
convergence: FEVER, SAFE, AIS all keep ≥3 verdicts plus a refusal); (4) the
world — `proof.js` pure + the P13 egress: flagged claims searched on their
own words, pages judged by the same containment fold, verdicts as counted
hosts with the syndication residue named.

**Files.** `hypergraph.js` (+9-case `hypergraph.test.mjs`, against the
REAL engine organs); `proof.js` (+`proof.test.mjs`, offline, with the seam
test extended to app.js/index.html); `cast.js` grew `makeReferentIndex`
(identity face of the resolver — ONE implementation of "the same name",
the resolver is now its boolean projection); `grounding.js` grew
`blankStructure` (shared furniture-blanking, length-preserving) and
`corroborateAtoms`; `provenance.js::classifySentences` takes relation
claims as a fourth argument and rides them on each sentence as `edges`;
holon.js injects the reader per part (`makeRelationReader`), merges
contradicted/unbound into `unsupported` (driving the existing bounded
correction), and returns the report per section; app.js draws badges
(`⇄ contradicted` / `∅ never bound`, click → the passage the material DOES
bind), the tally line's relation counts, and the grounding disclosure
(claim rows with click-through chips, corroboration counts, per-claim
"seek proof online", auto-seek behind the default-off settings toggle).

**Decisions that cost something, kept here.** The closed class for the
relation vocabulary is measured from the POOL via cite.js's `commonTerms`
(CORPUS_MINIMUM floor), NOT material.js's `functionWordSet` at turn scale —
its token-share threshold degenerates on excerpts (measured: "married"
classified as a function word on a three-passage set). `minSurfaces` is 1,
justified structurally (a wider vocabulary can only widen what the reader
HEARS, never fabricate an edge) — never walked against a golden.
Beyond-reach and unheard stay OFF the record's unsupported list: limits of
the instrument must not punish the answer. A verb that only ever appears
negated never enters the vocabulary (the candidate slot holds "never") —
it enters through an affirmative use elsewhere; the extractor is the
engine's declared heuristic and its residues (subordinate "that" clauses
consuming an edge, a colon overrunning the polarity window) are engine
territory, not silently patched here. Proof-seeking is sequential, never a
fan-out burst; the per-claim click is its own authorization and the toggle
is the standing one; nothing anywhere phrases a web verdict stronger than
"stated by N of M pages (K distinct hosts)".

## Skills (added 2026-08-16, third pass) — procedures kept as code

P14 in POLICIES.md is the law; this is the map. The ask this answers: when
the fold has worked out how to make a kind of output once, the *how* must not
stay locked in prose or in a model's habits — it becomes an executable
program the instrument calls, and the model's remaining job is slot-filling.
Skills are NOT instruction sets for the model; the model never sees or runs
a body. They are code, and they stack.

**Files.** `skills.js` (pure, browser-safe: shape, digest identity, the
append-only library log, mechanical claiming on declared anchors,
mechanical-first slot filling with one grammar-constrained fallback call,
`runSkilledTask` dispatch, authoring prompts + `SKILL_SCHEMA` +
`parseSkillCandidate`); `skill-runner.mjs` (Node: empty-context vm execution
with organs granted by declaration, `admitSkill` — the gate, `skills.call`
stacking with a depth budget, content-addressed persistence in
`skills/<digest>.json` plus append-only `record/skill-record.jsonl`);
`skills.test.mjs` (22 conformance tests — the walls themselves, not stubs).

**The ladder.** skill (zero model calls) → slot-fill (one constrained call,
validated) → model path (holon.js, unchanged — holon.js was deliberately not
touched; `runSkilledTask` takes the model path as an injected `runModel`).
Every descent is a typed `open` entry. Dispatch is mechanical (P4's spirit):
all of a skill's anchors must appear in the task's own words through the
shared fold; most anchors wins; a tie is refused as ambiguous, never guessed.

**The gate.** A candidate (model-authored or hand-written — same gate) is
admitted only if its shape is whole, its body and check pass the
forbidden-token scan, both compile, and ITS OWN CHECK passes against its own
body in the real sandbox with the real library — so admission order is
dependency order, and what passed admission is what will run. A skill
without a check is refused as a wish. Refusals stay on the log.

**Honest edges, disclosed here rather than papered over:** the vm sandbox is
an authority wall by construction (empty context + declared grants + token
scan), not a hardened security boundary — P1 local-only is the outer wall;
the run budget guards await points, and a synchronous spin inside a body is
the one hole it does not cover (the compile step alone runs under a vm
timeout); free string slots are never filled mechanically because there is
no unambiguous mechanical reading of "which words are the value."

## The build log — code as a projection of an append-only record (added 2026-08-16, third pass)

Code never appears in the chat as a block. It is deposited as an ADDENDUM to a
build's append-only log, and the code file in `materials/` is PROJECTED from
that log — the way a working tree is checked out from git history. The log is
the record; the file is a view of it.

**Files.** `builds.js` (pure: the vocabulary of addenda, the hash, the
projection, the diff, the anchor that routes new code onto an existing build);
`builds.test.mjs` (13 conformance tests — sealed chained hashes, projection
from head alone, reset re-projects deposit, the anchor reads only the number);
`serve.mjs` (`POST /api/builds/log` and `GET /api/builds/<slug>` — the server
owns the record: it stamps the time, writes `record/builds/<slug>.jsonl`,
projects the content-addressed file into `materials/`, and best-effort tells
Explore about the deposit so it surfaces in "My files" on the first deposit
only; `app.js` — the chat emits prose plus a compact `▤ build N · file.py · N
addenda` handle; the Builds pane shows the git-style log and the "file" button
opens the projection in Explore).

**The addendum vocabulary.** deposit (the model first produced this code;
the seed), revision (the model produced new code for an existing build —
routed by `referencedBuild`'s mechanical anchor "build 3"), edit (the operator
saved in the build editor), reset (the projection returns to the deposit),
run (the projection was executed; the outcome is the addendum). Each verb
is declared; the vocabulary is closed.

**The hash.** Every addendum is sealed by `seq`, `prev`, and a SHA-256 `hash`
over its canonical payload (kind, message, code, lang, author, run, prev). The
hash is chained — a re-append from the serialized record lines alone
reproduces the same log, byte-for-byte, the resumption property the skill
log already proved.

**The projection.** `projectCode(log)` returns the code of the last
code-bearing addendum. A `revision`, `edit`, or `reset` moves the
projection; a `run` does not. The file lands at
`materials/<slug>.<hash8>.<ext>`, content-addressed: every revision is a new
file and every old one stays on disk like a git object. On deposit only,
best-effort `POST` to the Explore server adds a library ref so the file
surfaces in "My files" without anyone browsing for it. Revisions re-project
but do not re-list — the build's log keeps the history, the file keeps
the head.

**The chat.** Prose only. Code is a one-line handle to the build; clicking
it scrolls the Builds pane. The "open file" control in the pane opens the
projection in Explore.

**Known design choice, not a gap:** `nameFor` takes a filename token with a
known extension if the model wrote one (the natural thing: "save it as
countdown.py" lands on `countdown.py`); without one, the first prose line
slugified, then the server disambiguates a taken name mechanically. A build
named `build-4.py` is honest — the model did not name it.

## Iterating a build (added 2026-08-17) — REC, grounds, and the router

The ask, verbatim: *"give the widget the ability to be iterated on through
append only modifications (including REC)"*, then the clarification that
settled the design — *"So if I'm like 'I don't like the colors' or 'it's
broken' it's able to modify that particular one and not create a net new
one."*

**The defect this closed.** `publishBuild` counted `state.builds.length + 1`
and stopped there, so every code segment a turn produced was a NEW build.
Complaining at a widget forked it: build 1 the original, build 2 the
recolour, build 3 the fix — three orphans, and build 1's append-only log
frozen at the moment the operator first spoke. The log was append-only in
the small and abandoned in the large.

**REC is a re-zero, and a re-zero opens a GROUND.** `operators.js` types REC
as *rezero* — Generate · Interpretation, "a new ambient ground begins". A
complaint is exactly that: the operator judged the projection and the ground
it was built on is conceded. Two entries per re-zero, and the shape is
forced, not stylistic: the engine's production order is one-way
(`isProductionOrder("SYN","REC")` is **true**, `("REC","SYN")` is **false**),
so a REC inside a build's thread would forbid every later edit on it —
editing a widget after complaining about it, i.e. the normal case. So the
concession is its own single-entry thread (EVIDENCE · REC · Figure ·
produced, carrying the operator's words VERBATIM and the version it
concedes) and the next ground is born as any production is, PROPOSE · SEG,
with **no `supersedes`** — a re-zero concedes a ground, it does not compile a
new whole out of the old one. Threads read `[SEG SYN…] [REC] [SEG SYN…]` and
`checkCubeProgression` stays silent across all of them, for any number of
grounds. Ground 1 keeps the plain `b<n>.v<k>` address, so a log that never
re-zeroed is addressed exactly as it always was and replays unchanged.

**The router (`widget.js`) contains no word lists, and that is the point.**
The first version decided the question with four hand-typed English lists —
presupposing verbs, creation verbs, judgment adjectives, anaphora. That is
precisely the mistake `relations.js`'s own header records having undone: a
90-word hand-listed verb string that was *"not a simplification of English,
it was a sample of it standing in for the whole"*. It was rewritten to
compose organs instead:

- **Closed classes from the engine's prior register**
  (`perceiver/text/priors.js`, every entry naming its giver, Amendment IV).
  `INDEFINITE_DETERMINERS` / `DEFINITE_DETERMINERS` / `ANAPHORIC_PRONOUNS`
  are NEW there — the register is where a received closed class lives, not a
  private regex in this repo; `NEGATION_WORDS` and `FIRST_PERSON` were
  already there. An indefinite determiner INTRODUCES its noun and decides
  outright; an anaphor POINTS BACK; negation with a first-person subject is a
  JUDGMENT. None of this needs to know what a verb means.
- **The build's own bytes.** A definite phrase ("the button") lands on the
  build whose projection contains it, both sides through retrieval's own
  fold (`tokenize`/`foldDiacritics`) — CLAUDE.md's diacritics lesson applied
  to routing. This is also why a material question cannot be hijacked: the
  widget's bytes hold no "report".

`extractRelations`/`discoverRelationVocab` was reached for first and refused
**on the merits**, stated rather than assumed: it anchors candidate verbs on
capitalised surfaces, and "I don't like the colors" has no surface at all
(`NEVER_A_NAME` excludes "I"), so the ladder measures an empty vocabulary.
Same posture as `outlineOfIndex` being tried and rejected in eoreader6's own
`goldens/network`.

**Two rules that only a real model produced.** Both were found running the
page against a live `gemma2:2b` on ollama, and neither was reachable from
canned fixtures:

1. **A turn is one act.** Asked for one counter widget, gemma2:2b replied
   with FIVE html fences, and every one opened a build — one request, five
   orphans. Later blocks of the same kind in one turn are SUPERSEDE · SYN
   versions of the first, never siblings (no ground is conceded: nobody
   judged anything in between). Two different KINDS in one turn are still two
   builds.
2. **An untagged fence is a gap, not a difference.** Complained at, the model
   answered with a bare ``` fence holding the fix, and the strict
   language match forked it. Silence is not a declaration of difference: the
   strict match exists to stop a DECLARED python file from becoming a version
   of a DECLARED html widget, and an undeclared fence adopts the build's own
   language so the widget keeps its preview frame and its `.html` download.

**The stated limit, kept rather than bought back with a list.** A definite
phrase naming something the artifact does not YET contain does not resolve:
"change the background to blue" on a widget with no background falls through
to a new build. The verb list caught that one phrasing and would have
silently mis-routed every phrasing outside itself. Anaphora ("make it
blue"), judgment ("I don't like the background") and the number ("build 2")
all still route, so the affordance is narrower, never absent. Morphology is
not folded either — "the colors" does not resolve against `color:` — and
there is no stemmer in this engine to borrow.

**Files.** `widget.js` (pure, priors injected — the cast.js pattern);
`widget.test.mjs` (the e2e walk plus the router's walls, against the REAL
engine modules); `build-log.js` grew `rezeroBuild`/`groundCount` and
ground-aware ids; app.js's `publishSegment` routes and `buildChip` is shared;
`constitution.test.mjs`'s II.13 host scan now covers widget.js and builds.js,
which the page now loads.

**Three build-log modules exist and only one is wired.** `build-log.js` is
live (app.js imports it); `builds.js` is unwired except for `referencedBuild`
and `BUILD_MESSAGE_MAX`, which widget.js now imports rather than re-deriving;
`buildlog.js` is unwired entirely — and its SIG/INS/REC/EVA vocabulary is
where the REC reading here was first written down. Named so the next pass
does not mistake one for another, as this one nearly did.
