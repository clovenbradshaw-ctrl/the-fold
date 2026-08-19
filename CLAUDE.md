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

One measured gap found while wiring — `searchSpans` did not fold diacritics
(`Natásha` returned three spans, `Natasha` zero, while this repo's `tokenize`
folds; same bug class, opposite state) — was CLOSED upstream 2026-08-16:
eoreader6's READING-POLICY A23 records it, `searchSpans` now folds both
sides through the session's one `diaNorm`, and the cross-organ agreement
fixture its P7.1 demanded exists (`conformance/fold-agreement.test.js`).
Admission also now strips the container at the door (A20's container half),
so `wp:chunk-0` is no longer the PG header — spans are body-only, with byte
addresses still naming the received file.

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

**Seeing the file (added 2026-08-17).** Explore's surfaces are all READINGS
of a file; the thing itself now has its own face. `explore/preview.js` +
`preview.test.mjs` (14 conformance tests, DOM through a stub document the way
render.test.mjs does it) hold the faces — image / audio / video / pdf / html
(EMPTY sandbox) / markdown / table / code with line numbers / text — and, for
anything the browser cannot render (docx, xlsx, pptx, epub), a NAMED refusal
plus the download and the hex, never a blank pane or a hex dump passing for a
document. The overlay is `#preview` in explore.html, its bar and keys in
explore.js (‹ › walk the folder, Esc closes, ⤓ downloads, "Read this →" hands
it to the reader). **A preview never starts a read** — peeking costs a stat
and a decode, so a 3MB book is instant; the organs run when you ask them to.
The one always-present control is `⛶ view the file` in the header line: a
reader who wants the bytes as they are should never have to work out which
surface is least interpreted. web.test.mjs's P13 seam scan now includes
preview.js (it builds every img/iframe/media src).

Three bugs it was built on top of, all found by driving the live page:
double-click never opened anything (the details panel appeared on the first
click, reflowed the grid, and the second click landed elsewhere — fixed by a
fixed-width always-present details column AND a path-keyed click tracker, not
node identity); `openSource` re-rendered while `source` was still null, so
Field was not yet a view and the active view was silently reset to "files" —
every open looked like a no-op (`state.opening` is now a place to stand); and
a failed open (a library ref whose file has moved) escaped as an unhandled
rejection with nothing on screen — `state.openError` says it in the header.
`parseDelimited` is now the page's ONE csv reader, shared by the preview and
the reader's table face.

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

**A link handed to the reader is checked, never taken on the far side's own
word (added 2026-08-17, user direction).** `archivePage` in
explore-server.mjs used to mark a Save Page Now result "saved" the moment
Wayback's Content-Location header named a snapshot address — the archive's
own claim, rendered straight into the "archived ↗" link in history, with
nothing confirming the address actually resolved to real content before
the reader saw it as stable. `verifySnapshot` now fetches that named
address and reads it exactly as any other page is read — `looksLikeChallenge`
and `extractReadable`, the SAME organs `fetchAndKeep` already uses for this
exact question, reused rather than a second threshold invented for it. Only
a page that answers 2xx and reads as real content lands `archive.status:
"saved"`; anything else — a non-2xx snapshot, a shell/interstitial, an
empty text face, a network failure on the verification fetch itself —
lands `"failed"` with a typed detail naming what was actually checked and
found, never a silent trust of the header. The same discipline generalizes:
any link this instrument is about to hand to a reader as "this is a real,
working thing" is checked before it is asserted, not after — the world's
claim about itself is data, not ground, until read.

**The same generalization, applied to the model's own citations (P20,
added 2026-08-17, user direction: "it can't make fake url citations").**
The archive fix above closes the case where an EXTERNAL service's header
was trusted unchecked; the same failure shape exists one layer in, where
the far side making an unchecked claim is the model itself, writing a URL
into an answer. `links.js` (new, pure — mirrors `quotes.js`'s shape one
register over: verdicts `in-material` / `resolved` / `unreachable` /
`challenge` / `unexamined`) + `holon.js`'s `runPart`, which now runs the
tier ONCE after the correction loop settles (a link check is a live P13
network crossing, not free containment, so it does not re-run every
correction retry the way a fabricated name or quote does) and fixes what
it finds MECHANICALLY: an `unreachable` URL is replaced in the shipped
text with a named marker (`[link removed — did not resolve: …]`) and the
finding joins the record's unsupported list — never another round trip
asking the model to fix its own invention, the same posture the
mechanical fallback already takes when a model cannot be trusted to
self-correct. `app.js`'s `checkLinkCitation` is the injected fetch,
reusing `/api/web/fetch` (a model-cited URL lands in web history exactly
like any page the reader asked to read), gated behind `state.webProof` —
the same standing web consent proof-seeking already asks for, since this
is the same class of crossing: automatic, instrument-decided, not a click
the reader made. **Disclosed scope boundary:** the sentence-level
MATERIAL/MODEL stripe machinery (P12, `provenance.js`) is NOT extended to
link verdicts in this pass — `provenance.js` was actively mid-edit by a
concurrent session (a narration-stripping feature, uncommitted) when this
landed, and extending the stripe vocabulary touches the same
sentence-classification core; folding it in here would have compounded
that collision rather than avoided it. What P20 guarantees today stands on
its own regardless: a fabricated link never ships as a plain,
working-looking citation. Full policy text: POLICIES.md P20.

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

**The scan set is derived, not listed** (2026-08-16, audit finding 4). It was
a hardcoded array of filenames, and it had gone stale by thirteen modules —
render.js, log-pane.js, web.js, quotes.js among them — so the invariant the
policy claimed was not the one the test enforced. `page-graph.mjs` now walks
index.html's script entries and the transitive load graph (imports, dynamic
imports, importScripts, Worker sources, and relative module paths held as
data — term.js's ROSTER is why that last rule exists: the workers are named
in a registry, never in a literal `new Worker("…")`). What is out of scope is
typed and asserted to resolve locally, never silently skipped: `/engine` and
`/nul` (eoreader6's bytes, its own tests), `/node_modules` (vendored, checked
only for being on this disk), the Explore iframe (web.test.mjs's own seam).
Non-local hosts need a TYPED allowance whose reason is itself checked — the
`xmlns` namespace by its attribute context, web.js's archive addresses by the
fact that web.js contains no egress call. Adding a module needs no edit here;
adding a module that reaches a CDN fails the assay.

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

**Amended 2026-08-17 — a build turn's prose belongs to its fold, not the
chat's claim ledger.** Measured live: gemma2:2b answered a counter-widget
ask with the code plus its own walk-through ("1. **HTML Structure:** …",
"**Event Listeners:** …"), and the apparatus rendered a wall of label chips
("Counter Initialization" ✓ 3/6, "Event Listeners", "DOM", …) plus
"claiming things nothing given backs: 76" — the model's own labels for its
own code checked as claims about the world. Two fixes, both mechanical.
(a) `blankStructure`'s line-initial-bold heading anchor now also blanks the
label behind a list-marker prefix (digits+dot or -/*/+ bullet) — the known
gap where `1. **HTML Structure:**` defeated the `^\*\*` anchor and leaked
through as atoms; still length-preserving, fenced-code blanking untouched;
regression pinned in `grounding.test.mjs` (the walk-through case).
(b) The user's rule, verbatim: "just the fact that it is content in the
FOLD item means it's not relevant there, it's code." On a turn that landed
at least one code build (`landedThisTurn` in `renderAnswer`), the answer's
prose is the model explaining its own artifact — its subject IS the turn's
own fold, and its ground is the artifact and its run witness, never web
corroboration of its labels. So the chat surface's claim apparatus stands
down for that turn (`.build-turn` class on the message): the tally line is
skipped, `renderGrounding` withholds the chip strip and the automatic
proof-seeking, and the fold's check-online line says "withheld" rather
than promising a lookup nobody will run. The marks toggle's own
discipline, keyed per turn: the checks still run, the findings still land
on the record and in the thinking disclosure — hidden drawing, never a
hidden finding. Disclosed residue: inline sentence stripes (taggedProse)
still draw on a build turn under the marks toggle, and the suppression is
turn-scoped — world-claim prose sharing a turn with a code build loses
its chips too.

**Amended 2026-08-17 (second occurrence, holon.js) — absence of material
licenses withholding judgment, never manufacturing it.** The build-turn fix
above closed app.js's single-flat-turn path; the same failure shape was
still live in `holon.js`'s multi-part pipeline (a plan with an artifact
part — `runPart`'s `inspect`), which is a different code path and was not
touched by that fix. Measured live: a counter-widget build with no material
attached still produced the wall of label chips
("Okay" / "Counter Initialization" ✓3/6 / "Event Listeners" / …) plus a
"claiming things nothing given backs: N" tally — because `inspect`'s
no-material branch unconditionally calls `extractCheckableAtoms`, whose own
docstring is explicit about what it is for: give the web-proof-seeking tier
candidates on a genuine world-claim nobody sourced (its own example:
"what percentage of Earth's atmosphere is nitrogen"). That is a legitimate,
narrow use — `checkGrounding` at zero passages returns `examined: false`,
a deliberate *withholding*, and proof-seeking still needs somewhere to
point on a bare factual question with nothing attached. The bug was
applying that same fallback to a part whose subject is an artifact the
model just produced: a build's own account of its own code ("initializes a
counter set to 0", "adds click listeners") is not an unsourced claim about
the world, it is the model narrating bytes sitting right next to it — its
ground is the artifact, not something absent. `extractCheckableAtoms`
converts "nothing to check against" into "everything is guilty by
definition," which is exactly backwards from `checkGrounding`'s own stated
principle one branch up (`examined` and `clean` are different facts, on
purpose — grounding.test.mjs) applied to a case that principle was never
meant to cover.

**The constitutional statement, so the next pass does not re-derive it
turn-type by turn-type:** a checking organ may say "I have nothing to
compare this against" (withhold), or "I compared it and it failed"
(convict). It may never manufacture the second out of the first — treating
absence-of-material as presence-of-fabrication is not a check, it is an
accusation with no evidence, dressed as one. Where a part DOES have ground
the ladder doesn't read — its own artifact, sitting in the same turn — the
fallback must recognize that ground exists rather than treating "the ladder
found no material" as "there is none." Concretely: `inspect` now runs
`parseSegments(text)` (artifact.js, the same organ app.js's own segment
renderer uses — one parser, not a second fence regex) and gates the
no-material fallback on whether the part produced a code segment; a build
part gets `checkedGrounding` (correctly `examined: false`, `clean: true`)
exactly as a material part would if it had none, and a genuine unsourced
factual part still gets `extractCheckableAtoms`'s candidates — pinned by
both cases as regressions (`holon.test.mjs`, "a build part with no material
never manufactures unbacked findings from its own code labels" alongside
the pre-existing "no material still offers a checkable figure" case that
must keep working). This is a stronger fix than the app.js drawing toggle:
that one withholds the CHIP STRIP while the finding still lands on the
record ("hidden drawing, never a hidden finding," by design, because a real
check ran and found something real). Here no real check ran — the finding
itself was synthetic, manufactured by the fallback rather than observed —
so there is nothing honest to disclose by keeping it; withholding the
finding IS the honest disclosure.

**Amended 2026-08-18 — checked before generation, not only after (P23 in
POLICIES.md is the law; this is the map).** Every organ above this line was
individually honest and the sequence still manufactured a lie: measured
live, "research the weather in NYC right now" with nothing attached drafted
"70 degrees, sunny" from nowhere; `checkGrounding` correctly declined
(`examined: false`), and `extractCheckableAtoms` — this section's own
no-material fallback, built for "a genuine world-claim nobody sourced" —
then treated the model's INVENTED sentence as the thing to search for, so
proof-seeking read an RV blog, never NYC weather. "Prove it" made it worse:
a second fabrication, searched on in turn. The fix does not add a check —
it moves the existing ones earlier, predictive-processing style: ask "is
there material to check a draft against" BEFORE the draft exists, not
after. `checkGrounding`/`extractCheckableAtoms` now fold the turn's own
question into each finding's `sentence` (grounding.js), so a topic-less
follow-up's search still anchors on the real conversation even when the
model's own drafted words don't. `runPart` (holon.js) takes a `flat` flag —
true only for the single part a plain chat question runs as — and folds
`discourse` into both retrieval and the grounding question when flat,
because `retrieve()`'s zero-relevance-floor design (P4) filters out any
passage sharing no term with the query, and "prove it" shares none with
anything on its own; decomposed parts are untouched (`flat` defaults
false), their deliberate narrow scoping (the `strayed` disclosure, above)
preserved by construction. And app.js's `holonicTurn` now preflights: a
flat chat turn with nothing attached, checking mode on, and standing web
consent on gets ONE search before the model drafts anything
(`shouldPreflight`/`preflightQuery`, proof.js, pure and tested;
`gatherPreflightMaterial`, app.js, the one crossing), folding fetched pages
into that turn's chunks via the same `chunkSource` every attachment uses —
turn-scoped, never written to `state.sources`. What follows is this
section's EXISTING ladder doing real work against real bytes, not a second
mechanism. Verified live end to end (real model, real DuckDuckGo, real
fetched pages) and against 90 auto-generated regression scenarios; full
evidence, the disclosed cost (one search before the first token on every
materialless grounded+web-on question, unconditional within the gate —
never a guess at which questions "need" it, the same argument widget.js's
word-list rewrite already stands on), and the disclosed residues (decomposed
tasks out of scope; a preflight-sourced citation's "open in Explore" fails
caught, not working) are in POLICIES.md P23.

**Amended 2026-08-19 — stable sub-assemblies: the join is earned, never
assumed (user direction).** P23's unconditional discourse fold-in fixed the
topic-less follow-up and broke every self-contained question asked after a
topic change — measured live: "research Robert Macnamera" after a greeting
searched on the stale line's words, fetched a greeting-etiquette page, and
answered about greetings with a fabricated "[4]"; "what is my name?"
answered from a stranger's faculty page. The prompt's assemblies (the
question, the conversation, the material) are now typed and joined only on
measurement: `runPart` retrieves on the part's own words first and widens
with discourse only on zero passages (disclosed as `widened` on the
research event); the grounding question joins discourse only where
retrieval widened or no passages exist; `preflightQuery(task, discourse,
{anaphors})` joins only on an anaphoric task (engine's ANAPHORIC_PRONOUNS,
injected) or one with no content words — the call site no longer pre-mixes;
and the flat material path sends REAL role-structured history (it used to
drop the conversation exactly when passages existed — the user's null,
"a regular model with the full context would have performed better," stood
against the apparatus). Same pass: the vestigial "cite the address in
square brackets" clauses in EXECUTE_SYSTEM_PROMPT and the correction
prompts were deleted — addresses left the model's view 2026-08-18, so the
instruction was a fabrication order, and "[4]" was the model obeying it.
Full amendment, evidence, and the two disclosed residues (dangling
turn-scoped citation chips; name-string web corroboration across distinct
referents) are in POLICIES.md P23's 2026-08-19 amendment.

## The UX pass (2026-08-17) — what was decided, so it is not re-derived

A working pass over both pages, driven live. The decisions, not the diff:

**Two words could not keep meaning two things.** `fold` named the artifact
type (the Folds pane, `/fold <n>`) AND the per-turn disclosure. The disclosure
is now **thinking** — the resting place of the narration a turn already
streams live under that class name, plus what the narration produced. The
`.fold` CSS class is deliberately unchanged: it is shared disclosure styling,
nested boxes included, and renaming it buys nothing a reader sees. In Explore,
the Lens view's label moved the other way — `projections` → **folds** — by
user direction.

**Material became attachments, and moved onto the composer.** The overhead
strip is gone; pills sit in the composer bar where what-you-attached belongs
to what-you-are-about-to-ask. Adding and switching are ONE control (paperclip
+ count, with the master switch inside the same group, appearing only once
there is something to govern). Three doors behind ＋: upload, **already
here** (the Explore library `/api/library` and saved pages `/api/web/history`,
so material on this machine is never found twice), paste. Attaching COPIES the
text — never a live link, because bytes that could change under a record's
addresses would make those addresses lie. The second control surface for the
same state (`#pane-material`'s row list, in a pane with no tab) is deleted.

**Two switches, both default ON, both retrieval-or-egress scoped, both in
permanent view.** `attachments` is the master over per-source mute — see
`liveChunks()` / `liveSources()` in app.js, now the ONLY readers of
`state.muted`, so no caller filters it independently again. `web` is P13's
standing consent, whose default flip is amended in POLICIES.md with its
reasoning. A third control, **marks**, hides the grounding apparatus drawn
into answers (address chips, ground underlines, relation badges) via one
`body.marks-off` class — so it reaches every turn already on screen, without
re-rendering, and identically. It hides the drawing, never the finding: the
classification still ran, the tally still counts it, `thinking` still lists it.

**Explanations became tooltips.** `note()` in explore.js took a fourth
argument: `text` is what stays visible and should be FACTS (counts, sizes,
what was capped), `why` is the sentence, and it rides the standing chip. The
standing is still declared — that is not negotiable — but a declaration nobody
needs twice is not put in the reader's way.

**The Explore view row holds still.** It was built from surfaces that had
ALREADY landed, and a read streams them over ~90s, so it grew a tab at a time
and every label to the right moved out from under the pointer. Now every view
a read WILL produce is present from the first frame as `pending` (visible,
disabled) — a surface not yet arrived is not the same as one not coming, and
the honest rendering is also the stable one. Count slots are reserved
(`COUNTED`), active is a pill not a weight, and `VIEW_ORDER` is the one
ordering. A rule separates the two levels the row was conflating: `files` /
`web` are places to stand, everything after is a surface of the open source.

**Kinds induce themselves** at the quick draw when a read lands (user
direction). Automatic is the TRIGGER, not the standard of evidence: the null
arm still lands after, kinds still render `provisional` until it does, the
renderer still may not phrase finer than `finestRank`, and `thorough` stays
an explicit escalation — now reachable from the result, since the pre-run
screen that used to hold it is no longer seen.

**One drawing of a link, everywhere.** `linkNode()` / `linkText()` in
explore.js. A statement was appearing three ways on one screen — styled
subject/verb/object spans in its own row, a flat 90-char truncated string in
the neighbour pills, a spaceless arrow-less label in the pivot — and the same
edge in three costumes reads as three kinds of thing. Now: `subject —verb→
object [negated]`, sides in the reading face (the material's own words), verb
in mono (the instrument's finding), truncation per side rather than through
the arrow. Every hop out of a statement has one shape too, with the kind of
neighbour in a FIXED left column (`↑ before` / `↓ after` / `⇢ shared cast`) —
before, `before` wore a leading `‹` and `after` a trailing `›`, so the column
that said what kind of hop it was could not be scanned.

**A saved page is titled by what it is.** Pages the web organ keeps are
content-addressed, so the file is `108c4b618934090b.txt`; `savedPageFor()`
reads the history index for the page's own title and host, and `openSource`
loads that index when the path is under `web/pages/` (nothing else on that
path ever asks for it). Nothing is renamed on disk and no address moves.

**Propose-then-check (2026-08-17, user-directed) — three suppressors removed
and one cut added.** The failing question was "What river is Nashville on,
what US state is it in, and who was its mayor in 2019?" and each layer made
it worse in its own way. (1) `needsDecomposition` planned it into three
parts; each part re-answered the WHOLE question; the sections contradicted
each other on the mayor (Briley vs Cooper) under `## headings`. Now a single
interrogative sentence never plans — a question is one propose, and the
checking ladder (which verifies every name and figure separately anyway) is
the fact-check; imperative multi-sentence WORK still plans. (2) The
constitution prompt told the model never to supply a value the material
lacked — instruction-following as a wall, the thing L5 distrusts — so it
withheld the mayor it knew. The prompt now asks for the model's honest
answer, with the epistemics left to the organs that enforce them. (3) The
correction loop treated unbacked knowledge as failure: it rewrote the true
mayor away, the rewrite collapsed into reproduction, and the mechanical
fallback shipped no mayor at all. `inspect()` now returns two lists —
`unsupported` (lies about the given: fake addresses, fabricated quotes,
CONTRADICTED edges) still drives the bounded correction; `unbacked` (names/
figures the material is silent on, UNBOUND edges) ships and is marked, and
the record names both (`relationFindings` takes a verdicts option; default
unchanged). The added cut: the framing-stripper now also cuts a TRAILING
framing sentence — a draft that echoes the unanswered facet back as a
question ships a question as its last sentence — material path only, since
in plain chat "How can I help you today?" is conversation. End state,
measured: one fluent answer, every fact right, marks and quote-verification
drawn over it, 667 tokens where the planned version spent 1,339 being wrong.

**Attachment pills open a sheet** (`#attach-sheet`, `openAttachSheet`): rows
of checkbox (same mute state as ever) · name (click = peek at the bytes) ·
size · remove, with ＋ Add more closing the sheet before opening the menu —
stacked modals close like nested parentheses otherwise. The pill's click
used to silently toggle mute: a state change wearing a label's clothes.

**Checking is a MODE, not a paint setting** (`state.grounded`, the header
toggle, seal-check icon — the highlighter said "colour the text", which was
the smallest true thing about it). Off, the relation tier is never asked for
(`makeRelationReader: null` — off means not computed, not computed-and-hidden),
`renderAnswer` is handed empty attributions/findings/claims so no chips,
underlines or badges are produced, the tally is skipped (0-of-N is a
measurement nobody took dressed as one that was), and the turn returns before
`renderEvidence` / `renderGrounding` — which is also what kills proof-seeking,
since the web rows live in the grounding panel. What is left is a model
answering a question.

Two things stay ON in either mode, and this is deliberate: the **fold** (the
running summary IS how the conversation works — switching it off would not be
a plain chatbot, it would be a broken one) and the **record**
(FOLD-CONSTITUTION I.5: append-only, and not the UI's to switch off). Both
remain disclosed under the turn either way. Honest residue: `checkGrounding`
and the quote tier still run inside holon.js per part, because that module
belongs to another session's contract — nothing is drawn from them and no
crossing is made, but they are not yet skipped.

**Turn cost is measured, never estimated.** `tokensSeen` accumulates
`prompt_eval_count` / `eval_count` from Ollama's own `done` chunks; a message
node stamps the counter's reading at birth and `renderFold` shows the DELTA.
A turn is many calls (plan, one per part, corrections, the fold), so a
delta is the only way to count a message's real cost without instrumenting
every path. Shown in checking mode, which is the mode that incurs it.

**The model picker moved to the composer** (OpenCode's shape: `＋ | model ⌄ |
… | Send`). It was a chip in the far corner of the header opening a dialog
with a `<select>` AND a Connect button — two decisions in two places for the
one setting a person reconsiders per question. Picking a model IS connecting
to it, so the menu has no second step; `#model` survives hidden as the single
source of truth the connect path already reads, so the menu can never name a
model routing would then fail on.

**The chat header holds still.** The model chip mirrored the whole status
line, so a model IDENTITY carried "marks shown" or "attachments on" — messages
about the reader's own settings — and the header re-measured on every one of
them. Now the chip is the model name and a pulsing dot when a turn is working
(`data-working`, `TRANSIENT` decides which messages are settings noise), and
everything transient goes to `#status-line` above the composer, which is
allowed to change because nothing is laid out against it; settings
acknowledgements clear after 2.6s, work in flight does not (clearing that
would hide that something is still running). The two view preferences share
one `.icon-group`, the theme control is a Phosphor icon rather than a word
whose width changed on every press, and the tagline is cut.

**The files desk speaks the page's language now.** It had been built to a
file-manager reference — 22px pill search at 620px, 16px pill bar buttons, a
filled capsule "+ New", tiles carrying a 60px full-width colour band — and
beside the rest of the instrument it read as a different application that
happened to be embedded. Nothing about browsing files needs its own shapes:
it now uses the page's radii and control sizes, "+ New" is "Add" as an
ordinary primary button, and grid/list is the SAME `.seg` control the source
view uses for rendered/raw (two faces of one thing is the same question in
both places — reusing the control is how the drift stops). The one thing kept
is the per-kind colour chip, which genuinely earns its place: colour per kind
is how a folder of mixed contents reads at a glance. It is a 22px mark beside
the name — the size it already was in list view — not a band across the tile.

**Code and tables render inline in chat now, not chip-only.** Measured live:
a chip alone forced a reader to leave the turn they were reading just to
find out whether the code even looked right. `artifactNode` already built
exactly this box for html/svg; the fix was calling it for every non-prose
segment in `renderAnswer`'s loop, not building a second renderer. `scripts`
stays gated to `RENDERABLE.has(seg.lang)` — consent to execute is still
earned by an explicit ▶ run in the Folds card, never granted just because a
segment is visible. (This paragraph named the fix before the matching
`renderAnswer` edit actually landed — the call site was still gated on
`RENDERABLE.has(seg.lang)` alone, so python/sql/ruby/every non-html-svg
language and every table stayed chip-only. Closed for real this pass, live
against qwen2.5:14b: a 3-row fruit table and a ruby method both now render
their box inline, unprompted, beside the chip.)

**Arithmetic is computed, never generated** (`arithmetic.js` +
`arithmeticTurn` in app.js) — L5 at its smallest scale. Measured live in
this repo: asked "What's 17 times 24?", qwen2.5:14b answered 372; the
product is 408, and nothing caught it because nothing checked it.
`detectArithmetic` claims a question only when it normalizes (English
operator words → symbols, word-class matching that never itself computes
anything, the same L2 discipline as the capitalization veto) to a PURE
numeric expression with zero free symbols — a real question ("what year was
Nashville founded") never reaches evaluation. When it claims a turn, the
model is never sent the question at all: `window.math` (mathjs, vendored
per P1, `{math}` injected the cast.js way so the module stays Node-testable
against the real package) evaluates it and the work is shown —
`17 * 24 = 408`, captioned "computed, not generated", tables.js's own house
phrase. Order-reversing phrasing ("5 subtracted from 12") is refused rather
than risked backwards — a wrong mechanical answer is worse than none.
**Load-bearing gotcha:** mathjs's vendored UMD bundle must load BEFORE
monaco's AMD loader script, not after — monaco's `loader.js` defines a
global `define()` with `.amd` set, and a UMD wrapper loaded afterward takes
the AMD branch and registers as a module instead of falling through to
`window.math`. Order is the fix; there is no config flag for it.

**Opened off the disk, both pages say so.** A `file://` load blocks module
execution and has no `/engine`, `/nul` or `/api` mounts, so the reader got
unstyled raw HTML with dead links — which reads as "this app is broken", not
"this app is not running". Both pages now carry a `#not-served` notice with
the commands to run. Three properties are load-bearing: it uses INLINE styles
(the stylesheet is one of the things that may not have loaded, so the notice
cannot depend on it); it is removed by each page's own boot, so it shows
exactly when the page's code did not run, whatever the cause; and a CLASSIC
inline script — which does run over `file://` — hides it immediately over
http and restores it after 4s if boot never happened, because the module that
removes it is deferred and the banner would otherwise flash on every healthy
load. Served-but-dead gets different wording from never-served: naming the
wrong failure sends the reader to the wrong fix.

**Explore's route home is in the header** (`.page-nav`), at every width, and
hidden only in embed mode. The bottom `.page-tabs` bar is the narrow layout's
switcher — hiding it on wide screens (correct) left the standalone page with
no way back to the chat, which is a trap, not a tidy-up.

**Other decisions worth not re-deriving:** the model dialog no longer blocks
boot (a reachable model is connected to, since "connect" was the only outcome
of the only dialog on offer; the dialog opens only when there is a real
choice — nothing reachable, or nothing pulled); dialogs are one object
(`.sheet-head` / `.sheet-body` / `.sheet-foot`, a visible ✕ because Escape is
undiscoverable and a backdrop click is a guess); the composer bar never wraps,
because the Send button must not move because of what you attached; Explore's
bottom page-tabs are the NARROW layout's switcher and are hidden wide; data
views lost their fixed pixel caps (prose keeps its 74ch measure — that is a
reading measure, not a layout accident); the source title is kind-badge, name,
then quiet context, and it dropped `cursor: read at HH:MM:SSZ`, a wall-clock
stamp of the current render. Icons are **Phosphor regular**, vendored under
`node_modules/@phosphor-icons/core` and inlined as paths in index.html — the
no-CDN rule covers icon fonts like everything else, and inlining in HTML also
keeps the SVG namespace out of the II.13 host scan.

## The priors organ (added 2026-08-17) — what was decided, so it is not re-derived

P19 in POLICIES.md is the law; this is the map. The user's direction, in
three sentences: live_priors gets its own tab; priors must be readable and
toggleable on/off at all levels, down to specific sources or entire genres;
and as priors are referenced in the surf they need to carry provenance.

**Files.** `priors-toggles.js` (pure, browser-safe: ledger fold,
most-specific-wins resolution with the decider NAMED, papers via priors.js
— see below) + `priors-toggles.test.mjs`; explore-server.mjs owns the I/O
(`priors/toggles.jsonl` append-only ledger, the corpus walk, routes
`GET /api/priors`, `POST /api/priors/toggle`, `GET /api/priors/doc`,
`GET /api/priors/enabled`); explore.js's `renderPriors` is the tab (a third
place-to-stand after `web`); app.js carries `state.provenance` and the
picker's third store.

**Two sessions, two tiers, one parser — the collision and its settlement.**
This organ and priors.js (the claim-checking tier, a sibling session, same
day) were built concurrently; the sibling took the `priors.js` filename
mid-build. Settlement: the gate lives in `priors-toggles.js` and imports
`parseFrontmatter`/`provenanceOf` from priors.js rather than keeping its
own parser — one implementation of "what do this document's papers say" on
every side (the tab's card, the doc route, the check). Do not re-introduce
a second frontmatter reading.

**Decisions that cost something:** default OFF with `decidedBy: null` (the
corpus arrived wholesale; enabling is the act — and the default is a fact
of the code, not a hidden ledger line); the chip must distinguish set-here
(dot) / inherited (named level) / default; there is deliberately NO unset
verb — flip the level or flip its parent, the ledger stays two-verb; the
walk skips the corpus's machinery (`scripts`, `src`, `manifests`, dotfiles,
top-level loose files) by declared rule and the tree listing applies the
same rule so no uncounted row is offered a toggle; attaching COPIES text
via `/api/priors/doc?text=1` (one crossing, papers + text together, the
open recorded with the publisher's URL); name collisions across genres
disambiguate with the genre prefix rather than silently replacing;
`renderSources()` must be re-called after papers land (the pill is drawn
by addSource before provenance exists — measured live, the papers were
missing from the pill until this was added).

**Known limits, disclosed:** toggles gate the OFFER surface (picker and
tab), and the checking tier reads the corpus directly — wiring the ledger
into `/api/priors/check`'s candidate walk is named future work, not
implied; enabled-list responses list every enabled doc (fine at hundreds,
unpaged at thousands).

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

**The reliable path is COMPOSITION with the /fold door (added at merge,
2026-08-17).** The fold-architecture session independently built `foldTurn`
(`/fold <n> <instruction>`): the model is handed the fold's CURRENT code,
the returned fence is extracted mechanically (`pickRevisionSegment` —
tolerates a dropped language tag), churn is refused by the log, and a
codeless reply is a typed gap. That is exactly what iteration-by-complaint
needed and did not have: before, a routed complaint depended on the model
happening to re-emit a fence into ordinary chat — measured live (gemma2:2b),
a coin flip. Now `widgetRouter.routeMessage` decides in `send()`, BEFORE any
model call, whether the operator's words point at an existing code build
(checked after every explicit door and the material's detectors, so nothing
typed or material-bound can be hijacked), and a hit runs `foldTurn` with
`{rezero: true}` — same sighted prompt, same mechanical extraction, but the
landing is `rezeroBuild` (REC, trigger verbatim) rather than `reviseBuild`
(SYN), because a judgment concedes a ground and an instruction compiles a
new whole. The two landings, one machine. `routeSegment` remains the
downstream wall for ordinary turns that happen to produce code.

**The delta carriage (added 2026-08-17, user-directed: "lets DEFINITELY do
the diff format" / "use the 9 operators as the primitives").** P16's
amendment is the law; this is the map. `/fold` and every routed complaint
now ask the model for ONE flat {find, add} edit first — grammar-held
(`PATCH_SCHEMA`), mechanically read (skills.js's `extractObject`, reused),
operator-typed off the bytes by `deriveOp`/`readOps` (never off a model
label — measured: both small models say "INS" while supplying a
replacement), applied strict-first with `every` as the disclosed rescue of
an `ambiguous` gap, landed by `patchBuild` as a SUPERSEDE whose entry
carries only the delta. `foldBuild` compiles every cursor's whole from the
last full entry plus the patch stack. The descent ladder in `foldTurn` is
typed and said out loud: ops that apply → patch entry; ops that don't →
the old full-code ask; neither → a typed gap. Same pass, same direction:
PROPOSE is retyped **INS · Figure · produced** — birth is Generate ·
Existence by the handbook's own axes (201-nine-verbs), and the SEG typing
had read the snip mechanics rather than the act; SEG keeps its true
station as the deletion primitive. And `routeMessage` is NOW
ACTUALLY WIRED in `send()` (it was documented below as wired before it
was — the same documented-but-never-called failure routeSegment had):
checked after every typed door and material detector, a complaint lands
on its fold as a re-zero whose ground seed is compiled mechanically from
the conceded projection plus the model's delta, the delta kept as
`patchProvenance`. Live measurements and their costs are in P16's
amendment; the honest residue is that the walls verify applicability,
not intent — the repair is the next iteration, which is the design.

**The loop closed (same day, "do all").** Seven of the nine operators now
speak on a build log: NUL asks (Ground grain), SIG scouts, INS births and
admits, SEG snips, SYN compiles, DEF refuses, EVA witnesses, REC re-zeros
— CON (binding folds into systems) and the Pattern grain (skills.js as
Kind/Paradigm — still structurally unreachable from chat) are the named
remainder, each its own pass. The turn's ladder: scout → one grammar-held
{find, add} edit against the scouted arena → act derived off the bytes →
strict-within, `every` only as disclosed ambiguous-rescue → refusal lands
DEF and is quoted to the next ask → landing witnessed (witness.js) and
the witness lands EVA and aims the next ask. Measured live
(eval/iterate-eval.mjs): 12/12 landings, 11/12 clean turn-one, 12/12
after one repair turn, ~220 output tokens per model per six iterations —
against a 3/6 unmeasured-intent morning baseline.

**Three build-log modules exist and only one is wired.** `build-log.js` is
live (app.js imports it); `builds.js` is unwired except for `referencedBuild`
and `BUILD_MESSAGE_MAX`, which widget.js now imports rather than re-deriving;
`buildlog.js` is unwired entirely — and its SIG/INS/REC/EVA vocabulary is
where the REC reading here was first written down. Named so the next pass
does not mistake one for another, as this one nearly did.
## The terminal (added 2026-08-16, sixth pass) — what was decided, so it is not re-derived

P18 in POLICIES.md is the law; this is the map. The user's direction: the
terminal only runs in the browser sandbox — and still gets to be a real
instrument (python, sql, js, and the fold itself as runtimes).

**Files.** `term.js` — the registry (ROSTER + REFUSED, both typed), the
drawer's command wiring, the fold runtime, the continuation grammar
(`continues` + `isControl`), the CSV walk (`csvTable`), the named budgets;
pure parts exported and tested. `term-js-worker.mjs` — module worker, REPL
over indirect eval (var/function persist, let/const do not — said in its
ready note, not fixed with a rewriter). `term-py-worker.mjs` — module
worker; pyodide imported dynamically INSIDE boot so node can import the
file's severed list without resolving /node_modules URLs. `term-sql-worker.js`
— a CLASSIC worker on purpose: sql.js is UMD and importScripts is the one
loader that hands it a global scope; importScripts is then severed with the
rest right after boot. `term.test.mjs` — P18's assay. app.js's whole
terminal section is now one `initTerminal(bridge)` call handing over
accessors (the cast.js pattern); log-pane.js still owns how the drawer is
SHOWN; serve.mjs lost the exec routes and tools/ entirely.

**Decisions that cost something, kept here:**

- **Vendored, never CDN.** pyodide (13MB) and sql.js land in node_modules
  like monaco already did; `.wasm`/`.zip` got MIME entries in BOTH servers
  (each serves the chat page whole). II.13's scan list now includes the
  terminal's four files. No PyPI at runtime follows from no-CDN: micropip
  and loadPackage would need egress and are absent, not shimmed — pip is a
  typed refusal naming P1.
- **The severed list is one list held in three files**, agreement pinned by
  test — a worker file stays standalone, and drift is a failing test, not a
  quiet hole. Severing is defineProperty-on-the-worker-global:
  construction, not hardening, P14's own disclosed posture.
- **`exit` is a control word checked before the continuation grammar.**
  Measured live: sql's own semicolon rule swallowed `exit` and the prompt
  wedged at "…". The grammar alone still swallows it — the ORDER is the
  fix, and the test says so.
- **Material crosses visibly.** A runtime gets a snapshot of every loaded
  source at boot, `mount` re-syncs on demand, and the crossing is printed
  where it happens ("material crossing into the sandbox: N sources, M
  bytes"). The mute stays a retrieval concept — muted sources cross too.
- **One command at a time, no stdin, no queue.** A submit during flight is
  dropped with a line (the old pane's own posture); there is no stdin
  because there is no PTY — the runtimes are the REPLs. Interrupt (✕ or
  ctrl+c) is worker termination; the state loss is said in the same line.
- **WebContainers / WebVM / ssh / node stay refused with reasons** in the
  `runtimes` command — licence + CDN, external proxy, egress, the machine —
  so the next pass does not re-derive why the famous routes are absent. The
  registry itself takes any runtime a localhost-served module can boot
  (ruby.wasm, php-wasm, WebR are one vendored package + one ROSTER row
  away).

**Known edges, disclosed:** the browser tools' synthetic key events did not
reach the input during verification (real typing does; the live run drove
the same handler with dispatched KeyboardEvents); a worker that spins
synchronously is stoppable only by ✕ (the same one hole the skills sandbox
discloses for its run budget).

**Amended 2026-08-18 — terminal acts ARE on the record now.** "Terminal
acts are not on the record... a term-record mirror is named future work"
is closed, by user direction ("make sure EVERYTHING gets logged in the
log"): `explore-server.mjs` grew `POST /api/term-record`, a thin route
that calls the SAME `record(event, fields)` function every other event in
this instrument already lands through — one file
(`record/explore-record.jsonl`), never a second one. term.js mirrors two
grains: every submitted line, any runtime, fire-and-forget
(`term-exec` — `mirrorTerm` in `submit()`, capped at
`TERM_RECORD_LINE_CAP` so an unbounded paste can't become an unbounded
record row), and richer structured detail for the terminal language
specifically (`term-act` on a landed act, `term-act-refused` on a typed
refusal, `term-capacity-run` on a real `cast` execution). Sequential
two-base fallback, same shape `record`/`priors`/`pip` already use for
reads — silent when neither base has the route, which stays this
terminal's honest default when no fold server is running, not an error
surfaced mid-command. Verified live: `sources`/`act distinguish…`/`act
synthesize…` (one landed, one refused) all appeared in
`record/explore-record.jsonl` within the same second they were typed, and
the terminal's own `record` command read them straight back.

## The measuring door (added 2026-08-17, seventh pass) — what was decided, so it is not re-derived

P19 in POLICIES.md is the law; this is the map. The ask this answers, from the
user directly: the fold should carry **standardized eoreader6-based statistics
modules, so DFR-repo-style analysis stops being hand-rolled** — and the point
is to make *people*, not only the model, less prone to bullshitting.

**Nothing was added to eoreader6, and that is the finding.** The organs were
already there and the search-before-you-write rule found them: `nul/index.js`
(1,306 lines — PERTURBATIONS × STATISTICS with a `LICENSED` table, ~20 typed
gap types, `ground` / `difference` / `extremeGround`, the censoring floor) and
`emergence/binding.js` (displacement / reversal / reseed nulls, transfer
entropy, per-pair `bindLinks`). What was missing was never a statistic. It was
the **gate**, and `nul` says in as many words that the gate is the caller's to
ask for: "NOT enforced inside `ground` … An organ that wants the guarantee asks
for it." So the gate is the fold's, the statistics stay the engine's, and the
standing rule (*leave everything you can in eoreader6*) is honoured by
subtraction rather than by a port.

**Files.** `measure.js` — pure, organs injected (cast.js pattern): the
declaration grammar, `admit` (the gate), the table→series and table→arrivals
adapters, `measureSeries` / `measureAcross` / `measurePairs`, the single
`runMeasurement` router, `phrase` and `toTable`. `measure.test.mjs` — 35
conformance tests against the REAL nul and binding modules.
`eval/measure-real-data.mjs` + `eval/fixtures/santa-ana-flight-hours.csv` —
the door run on 1,021 real drone flights. app.js's `measureTurn` is plumbing
only: find the named file, hand the declaration to the router, print whichever
of result-or-refusal came back. No server change: both mounts (`/engine`,
`/nul`) already existed, and `page-graph.mjs` picked `measure.js` up on its own
— "adding a module needs no edit here" held.

**The grammar is keyed, not positional** (`series:` / `across:` / `pairs:` /
`at:` / `as:` / `trying:` / `broken:` / `draws:` / `window:` / `seed:` /
`direction:`), order-free, because a reader is declaring a spec and a
positional form would make the fourth number they type silently mean something
else. `broken:` is the plain-language name for a perturbation (the handbook's
own "break it on purpose"); nul's registry keys stay underneath so there is no
second vocabulary to drift.

**Decisions that cost something, kept here:**

- **The fixture is copied, not read across repos.** Twenty-four integers from
  `dfr-causal-analysis/profiles/profile-santa-ana.json`. Reaching over there
  would have inherited the exact defect that repo's own paper lists under
  limitations ("cannot be reproduced by a third party") while criticising it.
- **The real-data declarations were fixed before the run and never revisited**
  (eoreader6's tune-nothing-against-the-answer rule, applied to a measurement's
  parameters). window 8 = a patrol shift, a unit of the world the material came
  from; draws 200 = this repo's standing null-arm number, giver named.
- **The result is worth knowing.** The declared question returns *censored
  above* (59.25 flights in the largest 8-hour mean, above all 200 shuffles).
  The same observation against a spectrum-preserving null sits at 59/200 —
  unremarkable. Two nulls, opposite readings, and only one pairing established:
  that contrast is the licensing gate's whole justification, found live rather
  than argued.
- **Two walls were found by RUNNING it, not by reasoning about it** (P5.5's
  discipline, both directions). (1) The `best_of_n` refusal was correct and
  **unreachable** — the only route into `measureAcross` was supplying the very
  `direction:` whose absence it refuses, so a sound wall nobody could touch.
  `across:` exists because of that; a refusal no declaration can trigger is a
  comment, not a wall, and its test now goes through the grammar. (2) `nul`'s
  `window >= 2` had been carried across to co-arrival, where `displacementNull`
  states its own floor of 1 — so a legitimate "arrived at an adjacent position"
  was refused. Each floor is now the consuming organ's own.
- **One router, because there were briefly two.** app.js's turn and the eval
  each grew a three-way dispatch and disagreed within the hour (one routed on
  `direction`, the other on `across`). `runMeasurement` is the only
  implementation, and it re-runs the gate so no path reaches a measurement that
  skipped it — eoreader6's "reconcile, don't dedupe" rule, applied before the
  second copy could rot.
- **`measured` is a new act on the reflex ledger and reflex.js was NOT edited.**
  Its `stableDetail` fallback renders an unknown act deterministically from
  sorted keys — the module's own designed extension point.

**Amended same day — any material, and the probe.** Binary files land as
bytes (`state.media`, never chunked/retrieved; the mute does not apply — it is
a retrieval concept). Container detection is MAGIC FIRST, text heuristic
second (`measure.js::sniffContainer`, closed list, tested against real files
on disk): a PDF's first kilobytes are ASCII, so the looks-like-text check read
one as prose and chunked a compression stream as paragraphs — the container's
own first bytes outrank any guess. Naming a container changes only what the
probe says and which decoder may run (wav → the PCM walk); everything else
measures identically as frames of bytes. Bytes become series through the engine's
`perceiver/audio/reduce.js` — the pure half split OUT of material.js in
eoreader6 (its ffmpeg import made the whole module unloadable in a page; the
split is packaging, not a new statistic, and material.js re-exports so no
engine caller moved). `wavSamples` in measure.js is the one genuinely new
parser, with its reason stated: no ffmpeg in the page, no CDN decoder under
P1, and a PCM RIFF walk is addressing. Compressed audio is `unsupported_codec`,
never half-decoded. `channel:`+`frame:` are the binary declaration; bare
`/measure <file>` probes the material's measurable surface with paste-back
example lines. Two more incidents for the record: the shared CSV walker
(`source.js::delimitedTable`) exists because the naive delimitedRows burst
10,549 of 10,733 USGS rows on the first real file (both prior readers were
half-right — term.js walked quotes but only spoke comma; tables.js sniffed
delimiters but split naively — reconciled, not deduped); and the probe's
pairs suggestion counts recurrence off the rows because the blind version
suggested `pairs:time at:time` live. E2E is `scratchpad`-driven CDP against
the real page: real drop events, real composer submits, quakes.csv + a
planted-burst WAV (positive and negative controls both honest) + a .pyc as
raw bytes.

**Known edges, disclosed:** the causal door is deliberately absent. `binding.js`
carries `transferEntropy` and `reversalNull`, and the DFR work measured both an
inflated false-positive rate and 100/100 false positives on common-cause
synthetic data — the paper's own conclusion is that confounding "requires
design, not statistics." A `/measure … causes:` door would therefore need a
design declaration, not another null, and that is scoped work rather than
something to bolt on here. Also absent: a space-time (position-held,
time-permuted) perturbation, which is the one null `matter_grouping.py`
hand-rolled that has no organ yet — `measurePairs` covers the co-arrival
question over ordered positions, not the spatial one. And the DFR scripts
themselves are untouched: this door is what they should have called, but
porting them is its own pass.

## The GitHub organ (added 2026-08-17) — what was decided, so it is not re-derived

A connect / pull / push door onto a real GitHub repo, ported from eoWebLLM's
`github-auth.ts` + `github-sync.ts` (device flow, Contents API read/write)
but re-split to this repo's law: nothing loaded by the page may fetch a
non-localhost host, so every github.com and n8n crossing had to move server-side.

**Reused, not re-registered.** The public GitHub App is eoWebLLM's own
(`Iv23livftc7ZekSCjCvL`) — it already exists and works, and OAuth Device
Flow needs no client secret, so reusing it costs nothing and a second app
would only be two things to keep straight. Say so if a separate app is ever
wanted; nothing here assumes it.

**Files, same split as the web organ.** `github.js` is PURE — zero fetch
calls anywhere in it (checked by `constitution.test.mjs`'s II.13 scan, the
same `egressCalls(src).length === 0` allowance web.js and links.js already
carry): device-flow response shaping, Contents API URL/payload
building/parsing, exact-utf8 base64, the repo-path convention, and the
pull-merge set differences. `github.test.mjs` tests all of it offline — no
stub fetch needed because, like web.js, there is no fetch to stub.
`explore-server.mjs` owns every crossing: `POST /api/github/device-code` and
`/access-token` relay to the two n8n webhooks (github.com's device-flow
token endpoint has no CORS headers, so even the device flow needs a server
in the loop); `POST /api/github/contents/read` and `/contents/write` are the
Contents API, token carried in the POST body end to end (client→server,
then server→github.com as a Bearer header) so it never rides a URL. A read
of a directory path returns `{isDirectory:true, entries}` instead of a
file's text — one route serves both a file pull and a listing, since the
Contents API itself does. `github-pane.js` is the browser half, log-pane.js's
"standalone, owns its own pane" pattern: connect state, the device-flow
poll loop, and three thin actions over the same read/write plumbing.

**Repo path convention for durable memory.** `.the-fold/skills/<digest>.json`
and `.the-fold/history/<slug>.json` — content-addressed for skills (reusing
skills.js's OWN identity: `skillDigest` over the mechanism, provenance
excluded, so a skill pulled from GitHub is the same file skill-runner.mjs's
`saveSkill` would have written locally) and slug-named for history
(`build-<n>`, the naming convention CLAUDE.md's build-log section already
uses — `build-4.py`). Chosen over one big JSON blob because both organs
already keep one-artifact-per-file locally (skills/<digest>.json,
record/builds/<slug>.jsonl) — the repo mirrors that shape instead of
inventing a second one.

**Skills sync.** `GET /api/skills` (new) lists the local library straight off
disk — skill-runner.mjs's own `SKILLS_DIR`, dormant until a skill is first
admitted, so this route reads whatever skill-runner.mjs would have written,
nothing else. Push writes each local skill to its digest path (sha-based
conflict retry, below). Pull lists `.the-fold/skills/`, diffs against local
digests (`mergeSkillsPull`, pure), and for each new one calls
`POST /api/skills/import` (new) — which RECOMPUTES the digest from the
pulled mechanism rather than trusting the remote filename, then writes
`skills/<digest>.json` locally only if a file at that address does not
already exist. A skill imported from GitHub is indistinguishable from one
admitted on this machine.

**History sync.** Build history has no server-side store to read (it lives
in the browser's own `localStorage["fold-builds"]`, app.js's `BUILDS_KEY`),
so github-pane.js reads/writes that key directly rather than adding a
server route for state the server never held. Push sends each build
(`{n, turn, entries, draft}`) to `.the-fold/history/build-<n>.json`. Pull
lists the repo's `.the-fold/history/`, diffs against locally-held slugs
(`mergeHistoryPull`, pure), and appends new builds into the same
localStorage key. **Disclosed limitation:** a pulled build does not appear
in the Folds panel until the page is reloaded — `restoreBuilds()` only runs
at load, and github-pane.js does not reach into app.js's live state to
avoid coupling two independently-owned modules; the pane's own note says
so, never a silent no-op.

**Conflict handling, one implementation.** `shouldRetryConflict` (github.js,
pure) bounds `MAX_CONFLICT_RETRIES = 3` retries, ported directly from
eoWebLLM's `pushHistory`: a 409 means the held sha is stale, so the caller
re-reads the sha and retries rather than guessing. The one-file push,
skills push, and history push all call the SAME `pushOneFile` helper in
github-pane.js — one conflict-retry loop, not three copies of it.

**Consent posture.** GitHub egress is never automatic — every crossing is a
button click (Connect, Pull, Push, "push/pull skills", "push/pull
history"), mirroring P13's standing-consent shape for the web organ without
literally reusing its toggle (a GitHub token is a different kind of
consent than "may this instrument read the web" — conflating them would
either make web search require a GitHub connection or make connecting
GitHub silently enable background sync, neither of which was asked for).

**Known limits, disclosed rather than glossed:** the token is held in
`localStorage["fold-github"]` in plaintext, the same trust boundary this
repo's other localStorage state already lives in (fold-web-proof,
fold-marks, theme) — acceptable for a local-only single-user instrument,
not something to carry into a shared or hosted deployment without
reconsidering. History pull does not merge conflicting local edits to the
same `n` — it only imports slugs the local set lacks; a real merge of
divergent build logs is unscoped. Skills/history sync is pull-then-import,
never a live two-way sync — there is no polling, no background sync, and
no automatic push on every skill admission or build; every crossing is the
three named buttons.

## System 1's own ground, measured (added 2026-08-17) — what was decided, so it is not re-derived

The ask, from a conversation about what fold.js's two folds are missing: S1
(the running summary) and S2 (the warrant record) are Ground and Figure in
the engine's own sense, and the engine already has a name and a built,
tested primitive for the third term — `eoreader6.1/nul/index.js`'s own
header states it before this repo ever needed it: "figure — difference from
its own ground; pattern — the difference that figure made to the next
ground... Bateson's: a difference that makes a difference." That module's
`pattern()` already carries the sign this section's title borrows from —
"a difference that narrows the ground is still a pattern, and it is
extraction. Only widening is encounter" — null-corrected, measured against
its own false-positive rate, not a bare inequality. This was found by
searching before writing anything, the way eoreader6.1's own CLAUDE.md
insists on: `grep`-adjacent reading of `nul/index.js` and
`emergence/tiers.js`, not a new statistic invented from the conversation
alone.

**What tiers.js itself already discloses, and does not paper over.** The
self-plane's own surprise meter (reflex.js, wired to `emergence/tiers.js`)
has Ground and Figure — a tier's decaying prior, and `bayesianSurprise`
placed against `priorContinuationNull` — and tiers.js's header says outright
that it has no Pattern term: "nothing asks whether the shift changed what
the tier does next. `witness()` is deliberately NOT called: it would
refuse, and supplying a third term it did not measure is the confabulation
the gate exists to prevent." That refusal is also, independently, this
repo's own witness gate (the reflex ledger's `made_no_difference` shape,
`nul.witness()`'s own refusal, and the fold's echo/reproduction detectors
in holon.js) — the same rule, discovered separately at three altitudes and
named here once, together.

**What this closes, and what it deliberately does not.** `aperture.js`
(new, pure, organs injected the cast.js/reflex.js way) gives S1 its own
Ground+Figure: a SECOND tier-stack meter, same declared numbers as
reflex.js's (`SURPRISE_WINDOW`/`DRAWS`/`ALPHA`/`SEED` — re-exported from
reflex.js, never re-declared), pointed at the conversation's own discourse
stream instead of the instrument's acts — one meter per plane, never a
shared instance, for the same reason reflex.js's four walls exist. Wired
into `app.js`'s `observeExchange` (the one choke-point every turn-ending
path already calls through) and `state.aperture`/`PER_CONVO`, alongside
`state.meter` — never into `state.reflexLog`, which stays the self plane's
alone. It does NOT close tiers.js's own disclosed gap: no Pattern term was
added to the engine, and no null-tested `opened` sign (`nul.pattern()`'s)
was computed for S1. What `aperture.js` adds beyond Ground+Figure is a
DIRECT, un-nulled Shannon-entropy reading of the discourse tier's own
decayed prior (`entropy`, `apertureDelta`, `apertureDirection` on every
observation) — a textbook width-of-belief measure, disclosed as exactly
that and never dressed up as the null-corrected signal `opened` is.
Measured, not assumed (`aperture.test.mjs`, against the real engine
module): repeating one sentence does not widen the ground; a genuinely
foreign one does, by a margin larger than the repeat's own settling noise.

**Two residues, named so the next pass does not have to re-find them.** (1)
A real `opened` for S1 would mean reframing the entropy series (or a
comparable numeric one) as material for `nul.ground()`/`nul.pattern()`
(the licensed `windowMean/shuffle` pair) so the sign earns the same
reseed-noise null `opened` already has — not attempted here. (2) The
engine's third use of the same operation, `level()` (one figure measured
against another figure's ground — "does this ground constrain more than
that one") is unconnected to S1, and is a different question from cast.js's
referent-identity machinery ("is this the same name") — cross-turn
corroboration in the `level()` sense is real, unbuilt future work, not the
same thing as coreference.

Not yet drawn anywhere in the UI — and now BY LAW rather than by
deferral: see the amendment below. (`apertureLine`, this paragraph's
original "future disclosure surface," was removed the same day.)

**Amended same day — the meter consumed, not displayed: the refresh gate,
the startle regime, and the rule that self-state is never a rendered
metric.** The user's direction, near-verbatim: the system registering
surprise to itself matters, "not in just like a number — never show it
metrics of its own self state"; make it aware of its surprise in an
analogue way; surprise causes a narrowing of attention, a focus, time
dilated. Three things landed, each measured e2e against live models
before being trusted.

(1) **The summary refresh is gated on the meter's own verdict**
(`exchangeHeldGround` in aperture.js; `refreshSummary` in app.js). When
every arrival of the exchange was measured and none landed on the
surprising side of its continuation null, the summary is CARRIED
(advanceSummaryFold — the fold line still lands, turnCount still counts)
instead of rewritten by a model call; a `carried` act goes on the ledger;
the hold is bounded by MAX_FOLDS_IN_PROMPT so no held fold line ever
falls out of the refresh prompt's window unseen. The gate's reading is
tiers.js's own propagation gate carried over ("nothing to say upward: the
ground did not change" — foldThrough, verbatim), which is also this
repo's own closure rule (holonic closure on the fold digest, not entry
count) applied to S1: a turn that moved no ground has nothing for the
state transition to record. TWO measured corrections got it here, both
worth not re-deriving. First, the strict both-censored-below reading was
UNREACHABLE on any realistic stream (zero fires across eight exchanges
including near-verbatim repeats — a repeat's KL sits inside the null's
support, not below it; a gate nothing can trigger is a comment, not a
wall). Second, the censored-above-only reading was UNSAFE, and only a
LIVE model showed it: qwen2.5:14b paraphrases even its own repeats, which
widens the null enough that a genuine topic pivot placed at rank 0.01 —
99th percentile of surprise, one step inside the support's edge — and
the gate held straight through it; the gated summary's topic stayed
"Harbor Traffic in Spring" while the conversation had moved to crops in
volcanic soil. The shipped cut is the null's own median (`rank > 0.5` on
placed arrivals; censored-below holds, censored-above refuses, gaps
refuse — withheld is never "nothing moved"). That transcript is pinned
verbatim as the regression in aperture.test.mjs. Honest cost accounting
(eval/summary-refresh-gate-eval.mjs, live): the unsafe gate saved 8/9
refresh calls and went stale; the safe gate saved 2/9 on the same stream
(~800 tokens, ~9s) and refreshed exactly where the ground moved. Safety
bought at 6 calls — the right side to be wrong on.

(2) **Surprise is consumed as posture, never displayed** (aperture.js's
regime block; `regimeAfter`/`presentWindow`; app.js's `state.regime`).
A standing 0..1 regime: raised to the exchange's own measured surprise
(max over the exchange's arrivals; censored-above is the ceiling, a
placed arrival reads 1−rank, so the scale is continuous through the
gate's own cut), released at the discourse tier's own gamma — belief's
own forgetting clock, not a second number. Consumed as a CONTRACTION of
the raw present: `chatHistory` slices at `presentWindow(regime,
RECENCY_WINDOW)` — calm is the declared baseline untouched, full startle
narrows to ONE exchange (the structural floor: the exchange that caused
the startle is what attention narrowed onto). The first draft WIDENED the
window under surprise and that reads the phenomenology backwards — time
dilates because the grain got finer, not because the reader reached
further back. When the contraction is actually in effect it lands on the
ledger as a `narrowed` act (registered to itself; the ledger and its
/self doors remain the one place self-state is readable, on request).
`apertureLine` was deleted: a phrasing helper for self-state metrics is
exactly the thing the direction forbids. Verified live end to end:
settle → `carried: streak 1` (161-token turn vs 458 baseline) → pivot
(10/200, 8/200 — hold refused, refresh ran) → next turn `narrowed: of 4
· window 2`, answer still correct because the two raw messages kept were
exactly the pivot exchange.

(3) **Tracking, so "how does learning affect surprise" is a readable
series, not a vibe:** every measured observation now carries the tier's
own learning state (novelRate — the continuation null's expected novelty,
falling = the ground settling; mass; forms) beside its surprise
(bits/rank/censored) — the two causes a stateless engine can't tell apart
(reader fatigue vs material gone quiet) on one row. `meterSnapshot` reads
the whole ladder (all three tiers: observations, mass, forms, novelRate,
shifts, entropy). One negative result recorded so nobody re-asserts it
untested: on the captured 9-turn transcript, exchange surprise vs
per-turn entropy delta ("surprise widens aperture") correlates NEGATIVELY
mid-scale (Spearman −0.33, n=9) while the ceiling case matches (the
pivot produced the run's largest widening, +0.34 bits). The claim holds
at the extreme and is unproven in the middle — at this n, on this
stream. Not a law yet.

**Open work this pass names and does not take:** finer record grain
under startle (a high-surprise turn decomposing into sub-turn atoms on
the record — the record's grain matching the reader's grain); a
tightened retrieval pool and raised correction budget under the same
regime (holon.js's knobs — another session's contract today); the
regime as a conversation-scale diagnostic (extraction narrows /
encounter widens, with the aperture series as its measurement, pending
the null-tested `opened` sign named above).

## The wheel organ (added 2026-08-17) — what was decided, so it is not re-derived

P21 in POLICIES.md is the law; this is the map. The ask, from the user
directly, after the numpy/matplotlib/pandas vendoring landed: have the
terminal's python actually run `pip install`, "as powerful as possible,"
while never running anything on the real machine's own terminal.

**The reframe that made this tractable.** `pip install <name>` sounds like
it needs a general package-install organ. It doesn't. pyodide already
ships its own wasm build of ~350 packages — the SAME mirror
`scripts/fetch-pyodide-packages.sh` already pulls numpy/matplotlib/pandas
from, listed in the SAME `pyodide-lock.json` that already governs what
`loadPackagesFromImports` can resolve. So "make pip work" reduces to
"generalize that script from three hardcoded names to any name in the
lock" — a route that fetches, sha256-verifies, and vendors onto the SAME
disk `indexURL` already points at. `term-py-worker.mjs` needed ZERO
changes to its exec/sever logic: its existing `loadPackagesFromImports`
mechanism already resolves whatever sits at `indexURL`, vendored ahead of
time or freshly fetched moments before — it has no idea, and does not need
one. Arbitrary PyPI (a package outside this lock) stays a named, disclosed
absence, not something quietly promised — a real `micropip`/PyPI-JSON tier
is a materially different, broader crossing (an open host, not one pinned
mirror) and is future work, weighed on its own.

**Files.** `wheels.js` (new, pure — the transitive dependency-closure
walk over a lock object, zero egress calls, mirroring the
web.js/github.js/priors-toggles.js split between shape and crossing) +
`wheels.test.mjs` (6 conformance tests against a small fixture lock: a
leaf, a diamond dependency deduplicated to one wheel, a lowercase-name
fallback, a miss, every wheel keeping its own hash). `explore-server.mjs`
owns the one crossing: `POST /api/wheels/install`, reusing
`fetchCapped` — the SAME fetch pipeline `fetchAndKeep` (the web organ)
already uses — rather than a second one. `term.js` gained a `pip` fold
command (the `hit()`-against-two-bases pattern `priors()`/`record()`
already use) and lost `pip` from `REFUSED`; `term-py-worker.mjs`'s
in-Python pip guard stayed (typing `pip install x` as Python still isn't
valid Python) but its message now redirects to the real command instead
of claiming installs are impossible.

**Decisions that cost something, kept here.** The whole closure is
sha256-re-verified on every call, not just newly-fetched wheels — an
already-vendored file from an interrupted prior run is checked, never
trusted because its filename already existed on disk. Two named budgets
(P9): `WHEEL_MAX_BYTES` (90MB/wheel) and `WHEEL_CLOSURE_MAX_BYTES`
(260MB/install) — measured against this lock's own largest builds
(scipy, opencv), not guessed. The crossing is recorded twice per install —
`wheel-install-requested` before the fetch begins (naming the full
closure and what actually needs fetching), `wheel-install`/
`wheel-install-failed` once it resolves — so a name outside the lock
(`wheel-install-refused`) is visibly distinct on the record from one that
tried and failed partway through.

**The inherited constraint, stated rather than papered over.** A
pip-installed package is invisible to any ALREADY-RUNNING python session —
`term-py-worker.mjs` severs its own fetch right after the first exec's
imports resolve, a constraint this policy does not touch and could not
without reopening P18. `pip install <name>` only ever prepares the ground:
a FRESH `python` session's first line is what actually loads it, exactly
the way numpy/matplotlib/pandas already work. The command's own output
says this every time, rather than promising something the architecture
cannot yet do.

**Evidence, driven live end to end through the real terminal UI** (not
just the route in isolation): `pip install networkx` at the fold prompt
resolved a 15-wheel transitive closure (networkx pulls in matplotlib, and
from there numpy/pillow/kiwisolver/fonttools/…), fetched and verified the
3 wheels not already vendored in 1.5s; a repeat call re-verified the full
closure's hashes and fetched nothing in 25ms; `exit` then a fresh `python`
then `import networkx as nx; g = nx.Graph(); g.add_edge("a","b");
print(nx.number_of_nodes(g))` as that session's first line printed `2`;
separately, `pip install requests` typed AS PYTHON inside a running
session was refused with the redirect, not a stack trace. Full numbers and
the refusal-path measurement are in POLICIES.md P21.

## The terminal language (added 2026-08-18) — what was decided, so it is not re-derived

P22 in POLICIES.md is the law; this is the map. `SEED-CREATION-LANGUAGE.md`
(planted a few commits before this one, same repo) named the near-horizon
build: an event schema, grammar-constrained, then a capacity library seed.
A fuller specification followed in the same lineage (not yet a file in this
repo — handed down directly) naming nine operators, nine terrains, nine
postures, and one composition law. This pass builds the schema in full and
starts, deliberately without finishing, the library seed.

**Files.** `grid.js` (pure, organs injected — the cast.js/build-log.js
pattern: `makeGrid({ operators, taskLog })` takes the engine's own
`packages/engine/operators.js` and `holon/task-log.js` namespaces as
arguments, so the page loads them from `/engine` and the tests load them
by relative path — `../eoreader6.1/packages/engine/...`, the same path
build-log.test.mjs already uses); `capacities.js` (a small, disclosed data
table — ten entries naming real modules/functions this repo already has);
`capacity-runner.js` (the one capacity actually WIRED to run —
`cast`, cast.js's own `makeReferentIndex`, over the engine's real
perceiver organs — kept in its own file so capacities.js stays a plain
table rather than blurring into a runtime); `grid.test.mjs` (53
conformance tests against the real engine modules, capacities.js's own
checks folded in) and `capacity-runner.test.mjs` (4 more, against real
prose, proving real referents come back — no stub, no canned list).
`term.js` gained three fold commands (`act`, `grid`, `capacities`, below
`pip` in the roster); `app.js` gained three new imports
(`/engine/operators.js`, alongside the pre-existing `/engine/holon/
task-log.js` import right next to it; `capacity-runner.js`; and
`makeReferentIndex` added to the existing `cast.js` import line) and one
`grid` instance plus one `runCapacity` function, passed into
`initTerminal`'s bridge object alongside the accessors that were already
there. `referentIndexFor` reuses the EXACT organ bundle `castFor` already
builds two lines above it — no new engine import for the capacity runner
itself, one more use of an already-open door.

**Nothing in the algebra is reinvented — grid.js adds a surface on top of
it.** The nine operators (NUL SIG INS SEG CON SYN DEF EVA REC — literally
the letters `packages/engine/operators.js` already has), the terrain grid
(`TERRAIN_BY_DOMAIN`), and the append-only log discipline (propose /
supersede, seq not clock, supersession keeps the past) are all imported,
never copied — the standing rule (*leave everything you can in
eoreader6.1*) held by subtraction again, the same way the measuring door's
CLAUDE.md section records it holding for `nul`/`binding.js`. What grid.js
actually contributes: the composition-law parser (`<verb> [<object>] at
<terrain> from <stance> [ground <g> broken:<p>] [because <t>] [supersedes
<id>] [warrant:<giver>]`), the refusal grammar per verb, and the STANCE
axis — mode × grain, independently declared — which the engine's own two
faces (operator × terrain) do not carry at all.

**Three reconciliations, each cost something, disclosed in grid.js's own
header too (not only here).**

1. **Operator order.** The handed-down document's prose calls the chain
   "NUL SIG INS SEG CON SYN DEF EVA REC" — the "HELIX order." `task-log.js`'s
   own header (already in this repo, unrelated to this pass) — without
   spelling out the old sequence's letters itself — records that "an
   invented HELIX ordering" existed once, as a hand-rolled partial copy in
   application-side code, and was replaced by the engine's real
   `OPERATOR_ORDER` (NUL SEG SIG CON EVA DEF INS SYN REC) — the one
   `validateChain`/`checkCubeProgression` actually enforce. The shared,
   distinctive name is what ties the two together, not a literal quote of
   the old sequence. Reusing the superseded name would have silently
   reintroduced the defect the supersession was for either way. grid.js
   uses the engine's order.
2. **Terrain is medium-blind, past the engine's own domain lock.**
   `operators.js::cellOf` ties an operator's terrain to `OP_DOMAIN[op]` —
   SIG/INS are always Existence-domain there, so `cellOf` alone could only
   ever land a `distinguish` on Void/Entity/Kind. The document's own §5
   worked example reads `distinguish at Network from encounter` — Network
   is Structure-domain — and states the reason directly ("the operator is
   medium-blind... A single DEF means the same act whether defining a
   variable, a character, a policy, a paragraph, or a hypothesis"). So
   `at <terrain>` is authoritative here, never re-derived from the verb's
   own operator letters, and `cellOf` is not called to second-guess it —
   pinned as a regression in grid.test.mjs against that exact line.
3. **Stance is a genuinely new axis, not a relabelling of
   `STANCE_BY_MODE`.** The engine's stance labels (Clearing, Dissecting,
   Tending, Cultivating…) only mean something when an operator and its
   terrain share one domain — exactly what point 2 says this module does
   not require. Landing them onto an act that has deliberately stepped
   outside that requirement would read as authoritative engine output when
   it is not, so grid.js does not import or display them anywhere. The
   document's own mode/grain vocabulary (Differentiate/Relate/Generate ×
   Ground/Figure/Pattern, plus the four named shorthands) is the only
   stance vocabulary a landed event carries.

**`encounter` needed a fourth, smaller call, found only by trying to parse
the document's own worked example.** Three of the four named shorthands
(`extraction`, `cultivation`, `closure`) are unambiguous — one fixed
(mode, grain) cell each, matching every place the document uses them.
`encounter`'s own introducing prose ("the encounter of
generate·ground/generate·figure") already names two cells loosely, and the
table format wants one; §5's worked example (`distinguish at Network from
encounter`, Pattern-grain) and §2 ("read launchers default to `encounter`"
across launchers of every different grain) both only parse if `encounter`
resolves like bare `generate` — any grain, taken from the terrain, not
fixed. That reading is what shipped, and grid.test.mjs pins it verbatim
against the worked example so the next pass does not have to re-derive it
by re-reading the document.

**Every refusal the document names for a verb is a real, tested check
against the log — not a decorative validation.** `void`/`distinguish`/
`evaluate` require a named `ground … broken:<perturbation>`; `separate`
refuses at a Ground-grain terrain or against an object not yet
individuated ON THIS LOG; `relate` refuses two referents not yet
established on the log unless the edge carries `warrant:<giver>` (lands as
OFFERED rather than established — the document's own referent-resolution
ladder, § "The wall, stated so it isn't glossed over"); `synthesize`
refuses parts sharing no warranting relation and matching no capacity; the
one stance-law rule the document actually names and pins as illegal
(`synthesize` may not declare `from relate` — "you cannot commit a whole
from a stance that refuses to commit") is enforced directly; `revise`
refuses without both a trigger and a target already on the log. `define`
is the deliberate exception: the document is explicit that "a define lands
on the record... only if its evaluate clears" is a FOLD-time fact, not a
grammar-time one, so no refusal fires at parse for a missing companion
`evaluate` — `foldGrid` instead computes each define's landing (`wish` /
`testimony` / `refused`) by matching it to a same-object `evaluate` and
its declared verdict.

**`distinguish` lands as two real task-log entries, SIG then INS**,
sharing one act (`actGroup: "SIG+INS"`) — the document's own words taken
literally ("to sign a figure and individuate it are one motion at the
surface, two operators in the algebra"). SIG precedes INS in the engine's
real `OPERATOR_ORDER`, so `checkCubeProgression` stays silent on the pair;
pinned as a regression.

**One capacity actually executes; the rest stay disclosed absences, not
silent ones.** `capacities.js` seeds the "prior set"
(SEED-CREATION-LANGUAGE.md's own phrase) with ten entries naming real
modules and functions already in this repo — cast.js, hypergraph.js,
relations-chain.js, aperture.js, measure.js, priors.js, web.js, skills.js,
build-log.js, witness.js — each checked BY HAND against the real
domain-fixed-by-operator rule while the table was written (later backed by
a mechanical test, grid.test.mjs's own "domain-consistent with its
declared op" case — see the bug list below); two entries (`skill`,
`build`) were caught domain-illegal this way (an op letter that could
never land on the terrain first written down) and fixed — see the
module's own header for exactly what was wrong and why. `cast` is now
wired to run for real: a landed `distinguish` whose `ground` clause names
an already-loaded source calls `capacity-runner.js`'s `runCapacity`, which
runs `cast.js::makeReferentIndex` over the engine's real perceiver organs
and attaches the referents found as a task-log RESULT on the act's INS
entry (`grid.js`'s new `attachResult`, matching `produce()`'s own
discipline: "a result attaches an answer to a task that already exists;
stamping an operator on it would re-type the task"). Asking to run any of
the other nine returns a typed `not_yet_executable` gap from the runner
itself, never a silent no-op or a fabricated result. `distinguish`'s
deeper refusal ("the figure doesn't clear it" — a real statistical
clearance over `cast`'s own referent set) and `void`'s
perturbation-licensing check (`nul/index.js`'s own LICENSED table, or
measure.js's `admit`) remain the natural next integration, not faked here
— `cast.js` itself has no null test to gate on, so "executed" here means
"the real organ ran and its real output landed," not "a statistical claim
cleared." `evaluate`'s verdict (`verdict:holds` / `verdict:refused`) is
still DECLARED by whoever writes the line — the SEED doc's own third named
thread ("EVA need not be hand-coded per capacity," measured there against
`eval/ledger-harness.mjs`'s eight hand-written stage-checks) is exactly
this gap, and it is still open. Read launchers, make launchers,
`spin`/the Python sandbox, and the retrieval-compose-slotfill authoring
path are all unbuilt, named in the handed-down document's own build order
as later passes.

**Evidence, driven live end to end through the real terminal UI, not just
the module in isolation:** the exact §5 worked-example line
(`act distinguish zone-2 at Network from encounter ground drone-log
broken:rotation`) lands two entries and `grid` prints `SIG·Pattern`/
`INS·Pattern` for both; `act relate zone-2 to council-vote-mar-3 at Link
from cultivation warrant:temporal-adjacency` lands with neither referent
pre-established, because the warrant marks it offered; `act synthesize
cast, zone-2 at Field from generate` lands because `cast` resolves against
the capacity registry; `act distinguish zone-3 at Network from encounter`
(no ground) is refused with the typed `no_ground` detail; a bare
`act define finding at Field from generate` folds as `wish` under `grid`
until `act evaluate finding at Field from differentiate ground m
broken:rotation verdict:holds` lands, at which point `grid` reports it
`testimony` — the document's own load-bearing rule, live, in the real
page, not only in a test file.

**Five real bugs, caught by an independent adversarial review of the first
cut and fixed before landing — not decorative validation.** All five are
now pinned as regressions in grid.test.mjs (39 → 47 cases at the time;
49 now, with `attachResult`'s own two). (1) The
DEF/EVA companion match used `Array.find`, so it always returned the
FIRST same-object evaluate — a second, unrelated `define` of the same
object silently borrowed the first one's verdict, and a corrected
re-evaluate could never override an earlier wrong one; `foldGrid` now
scopes each define's search window to the next same-object define and
takes the LATEST evaluate inside it. (2) `synthesize`'s relation check used
`String.includes` against a `relate` act's raw object text, so a part
named `zone` matched inside `zone-99` even though `zone` was never itself
related to anything; `relate` now carries its own exact two-referent pair
(`event.referents`) and `synthesize` checks membership against that, never
a substring. (3) The `ground`/`broken:` check used `||`, so either half
alone passed a check meant to require both; now `&&`. (4) `relate`'s
"<a> to <b>" split and `synthesize`'s comma split both ran on the
already-quote-stripped, already-joined object STRING, so a referent whose
own name contained a bare "to" or "," fractured the split; `tokenize` now
tags each token as quoted or not, and both splits work on that token list,
skipping separators inside quotes. (5) `capacities.js`'s only test checked
terrain VALIDITY, never that a terrain agreed with its declared op's
domain — the exact class of bug the module's header already says was
caught "by hand" twice; a mechanical domain-consistency check now runs the
same arithmetic (`operatorOf(op).domain` → `TERRAIN_BY_DOMAIN[domain][grain]`)
against every entry, so a future one doesn't need someone to re-derive it
by eye. A sixth, smaller finding — this section's own operator-order
citation slightly overstated what task-log.js's header literally says — is
corrected in point 1's wording above.

**Amended same day — `cast` is wired to run for real.** The boundary the
first pass drew ("no capacity is EXECUTED from the terminal yet") is
narrowed by one: `capacity-runner.js` (new, pure, organs injected —
`referentIndexFor`, the exact bundle `app.js` already builds for
`castFor`/`handlesFor`) executes `cast.js::makeReferentIndex` for real
when an `act distinguish <object> at Entity from <stance> ground <source>
broken:<perturbation>` line names an already-loaded source as its ground.
The referents found land as a task-log RESULT on the act's own INS entry
(`grid.js`'s new `attachResult`) — never a re-typing of the act, matching
`produce()`'s stated discipline for RESULT entries elsewhere in this repo.
Every other capacity in the registry still returns a typed
`not_yet_executable` gap from `runCapacity` itself when asked to run,
which is different from and stronger than the earlier state (nothing
callable at all) — a caller now gets a real refusal naming exactly what is
missing, not a silent absence. Deliberately NOT claimed: `cast.js` has no
null test of its own, so "executed" here means the real organ ran and its
real output landed on the record — not that a statistical claim cleared
against a constructed nothing, which is still `void`/`distinguish`'s own
disclosed gap above.

**Files.** `capacity-runner.js` (+`capacity-runner.test.mjs`, 5
conformance tests against the real engine perceiver organs and real
prose — Pierre Bezukhov/Natasha Rostova referents actually discovered, a
DIFFERENTIAL test proving the output tracks the actual input rather than
two hardcoded strings, an unknown capacity id refused by name, empty text
refused as `no_material`, and prose with no discoverable referents landing
a real empty result rather than a gap); `grid.js` grew `attachResult` (+2
tests in grid.test.mjs: refuses a target not on the log, lands a result
without re-typing the act); `term.js`'s `act` command grew the trigger (no
new fold command — `distinguish`'s own grammar already carries `ground
<source>`), gated on the ground candidate being an ACTUAL loaded-source
key (not merely truthy text) so `no_material`, when it prints, always
means "loaded and empty," never "no such source" — a nonexistent ground
candidate stays silent, an ordinary abstract `distinguish`; `app.js` grew
`makeReferentIndex` on the existing `cast.js` import line, a
`referentIndexFor` built from the same organ bundle `castFor` already
uses, and `runCapacity` passed into `initTerminal`'s bridge.

**Two limits, found by a second adversarial review and disclosed rather
than fixed under time pressure** (capacity-runner.js's own header carries
the full text): (1) `runCapacity` executes SYNCHRONOUSLY on the calling
thread, unbounded and uninterruptible — unlike term.js's other three
runtimes, which are Workers precisely so a long computation cannot freeze
the page and CAN be killed. A large loaded source could take real,
unbounded time with nothing the reader can do but wait; moving execution
into a worker (term-py-worker.mjs's own shape) is the natural fix, not
attempted here. (2) A result attached to a `distinguish`'s INS entry is
exactly as durable as that entry — `grid.js`'s ordinary append-only
supersession rule, applied consistently, but worth stating because
`distinguish` lands a SIG/INS *pair* and only INS ever carries a result: a
`revise … supersedes <the SIG id>` (the wrong half of the pair) leaves an
orphaned INS-only entry with its result still live and no surviving SIG
partner — the pair is not kept atomic under supersession. Not attempted
here either.

**Evidence, live end to end.** With `zone-99`/`zone-100`/`f2` and two
`drone-log`-style entities already established (from the prior pass's own
worked-example driving), the fixed relation check was re-verified live at
the terminal: `act synthesize zone, alpha at Field from generate` now
REFUSES (`zone` merely resembles `zone-99`'s prefix, never itself
related), while `act synthesize zone-99, zone-100 at Field from generate`
LANDS; a `define`/`evaluate`/`evaluate` sequence (refused, then a later
corrected `verdict:holds`) folds to `testimony`, confirming the DEF/EVA
fix live, not only in the test file. `cast`'s own execution was driven
live too, real material dropped onto the real page (not a fixture): a
source `excerpt.txt` carrying "Pierre Bezukhov ... Natasha Rostova ..."
attached via the app's own drop handler, then `act distinguish
who-is-here at Entity from encounter ground excerpt.txt broken:rotation`
printed `cast · 2 referents found in "excerpt.txt": Bezukhov, Rostova` and
a subsequent `grid` call showed the same two referents still attached to
`act-1`'s result — the capacity ran, found real referents in real dropped
material, and the result persisted on the fold, not only in the command's
own echo.

## The chat's own `/act` door (added 2026-08-18) — what was decided, so it is not re-derived

P22 in POLICIES.md carries the full amendment text (its "third occurrence"
paragraph); this is the map. The ask, near-verbatim from the user: "think
the chat should be able to drive terminal work and things using python and
what not." That sentence names TWO things, of different sizes, and this
pass deliberately builds only the smaller one.

**Why the smaller half first, stated rather than assumed.** `grid.js`
already refuses a malformed or unwarranted act BY GRAMMAR, so a chat
message that reaches this door was already bounded before any of this
landed — composing an act from chat costs nothing new in blast radius that
composing one at the terminal didn't already have. Running arbitrary
Python/JS/SQL FROM a chat message is a different, larger crossing: P18's
own law ("nothing typed here reaches the machine... the terminal runs
entirely in the browser sandbox") and the Folds panel's own consent
posture ("consent to execute is still earned by an explicit ▶ run...
never granted just because a segment is visible") both point the same
way — real code execution should stay gated behind a visible, explicit
person-made action, never something a model decides mid-answer. That
recommendation is written up below as a PROPOSAL, not built — it needs
the user's confirmation first, the same posture this repo already holds
for every other consent-shaped crossing (P13's web toggle, the GitHub
organ's button-only egress).

**One door, explicit-trigger only, no new policy.** `/act <line>` joins
`/self`/`/priors`/`/reflect`/`/learn` in `app.js`'s turn dispatcher —
checked among the other typed doors, before any automatic detector (
`detectTable`, `detectChart`, `detectReflex`) or the widget router gets a
look at the question, so the model never decides on its own to compose an
act; only a person typing the door reaches this grammar. `actTurn`
renders MECHANICALLY via `usageTurn` (no model call), matching every other
door's shape exactly: parse the argument, act on it, print a computed
answer.

**`landAct`: the parse→land→maybe-execute orchestration, moved to one
place.** Before this, "a landed `distinguish` whose `ground` names an
already-loaded source runs `cast` for real" lived only inside term.js's
own DOM-bound `act` handler — policy embedded in a UI handler, which is
exactly the shape of bug P22's own postmortem already caught twice
(DEF/EVA's `Array.find` first-match bug, `synthesize`'s `String.includes`
substring bug). Rather than copy that check into `app.js` and hope the two
never drift, it moved into `capacity-runner.js` as `landAct(grid, log,
line, { sources, runCapacity })` — the ONE implementation both term.js's
`act` fold command and app.js's `actTurn` now call. Each caller still owns
its own formatting (DOM lines for the terminal, a joined string for
`usageTurn`) and its own recording — `landAct` itself touches no DOM, no
chat message, no record file.

**The log is shared, app-wide.** `state.gridLog` (app.js) is the SAME log
the terminal reads and writes — `grid.createLog()` once, held beside
`state.builds` rather than in `PER_CONVO` (the identical reasoning
`builds` already states there: an act belongs to the instrument, not to
one conversation). `initTerminal`'s bridge grew `gridLog`/`setGridLog`
accessors — the same accessor-pair shape `sources`/`chunks`/`muted`/
`folds` already have — and term.js's own `readGridLog`/`writeGridLog`
fall back to a page-local log when a caller hasn't wired sharing (a bare
bridge, a Node test), so nothing that worked before this lands
differently now. A prior session had sketched this exact accessor pair
directly in `app.js`'s `initTerminal` call, then reverted it unmerged
before running out of context — relayed as part of this pass's own
handoff, not a file in this repo. On reconsideration the shape held (the
reasoning above is why, derived fresh here rather than assumed from that
sketch); the rest of that earlier sketch (a `/act` door of some form) was
not assumed and was designed and built from the ask itself.

**Recording reuses the identical route.** `actTurn` posts onto
`record/explore-record.jsonl` through the SAME `POST /api/term-record` →
`record(event, fields)` path term.js's own `mirrorTerm` already uses,
adding one field (`via: "chat"`) so the record can tell which door an act
came through without a second event vocabulary or a second file.

**A pre-existing quirk, surfaced by sharing rather than caused by it.**
`attachResult` appends a RESULT entry, and `task-log.js`'s `append`
advances `nextSeq` on EVERY entry it accepts, RESULT included — so a
`distinguish` that triggers `cast` consumes three sequence numbers (SIG,
INS, then the invisible RESULT), and visible act ids run 0, 1, 3, 4, 6, 7
rather than a plain count whenever capacity execution is in the mix. This
already happened in term.js's own original `act` handler, unrelated to
this pass; sharing the log across two doors just makes it visible in one
place instead of two. Ids stay unique and monotonic either way — nothing
collides — so this is named rather than fixed.

**Evidence, driven live end to end through the real chat UI.** Bare
`/act` renders the usage line. `/act distinguish zone-3 at Network from
encounter` (no ground) refuses with the typed `no_ground` detail. Real
material pasted as an attachment (`pasted.txt`), then `/act distinguish
who-is-here at Entity from encounter ground pasted.txt broken:rotation`
typed in the composer lands two entries and runs `cast` for real
(`Bezukhov, Rostova` found) — opening the terminal and typing `grid`
immediately afterward shows the IDENTICAL entries with the IDENTICAL
attached result. The reverse direction was driven too: composing at the
terminal, then reading from chat, continues the same id sequence rather
than starting over. A brand-new second conversation tab, opened after
acts already existed, saw and continued the same log on its first `/act`
— proving `gridLog` is genuinely app-wide. `capacity-runner.test.mjs`
grew 6 cases for `landAct` (670 tests total, 666 passing, the same 4
pre-existing unrelated failures this repo already carries).

**The bigger half — raw Python/JS/SQL driven from chat — is a proposal,
not code.** Recommendation, for confirmation before anything is built:
trigger stays EXPLICIT ONLY (a `/run <runtime>` chat door, or a visible
button on a code segment already in the turn — never the model deciding
mid-answer to execute something); scope stays the SAME sandboxed runtimes
term.js already has (js/python/sql Workers, severed egress, P18 unchanged)
— never a new capability, only a new door onto the existing one; consent
posture matches the Folds panel's own ▶ run and P13's web toggle, i.e. a
visible, person-made action per execution, not a standing switch that
silently authorizes every future one. Not started here.

**Amended 2026-08-18 (fourth occurrence) — the bigger half is built:
`/run <runtime>\n<code>`, P24 in POLICIES.md.** The recommendation above
is exactly what shipped, not a redesign: the trigger is a typed chat door
and nothing else, the runtimes are the identical `python`/`js`/`sql`
Workers term.js already ran code in, and there is no standing switch —
every `/run` is its own one-shot action. The one thing worth restating
plainly, since it is the reasoning that decided the shape: `term.js`
already had `runSandboxed` and app.js already had `autoRunAndDisclose` —
automatic, fire-and-forget sandboxed execution of code the MODEL just
wrote in a fold, no click needed. That mechanism already answers "does
the model's own code run safely" for every code segment a turn produces.
The actual gap was code a PERSON types or pastes, which had no door at
all — not "the existing segments also deserve a ▶ button," which would
duplicate a mechanism that already runs those exact segments. `/run`
fills the real gap and deliberately leaves the redundant one alone.

`term.js` grew a `type` field on each `ROSTER` entry (`"module"` for
js/python, `"classic"` for sql — sql.js is UMD and `importScripts` is the
one loader that hands it a global scope, term-sql-worker.js's own header
already said so) — this replaced a `name === "sql" ? "classic" :
"module"` ternary that had drifted into two separate copies (`spawn()`
and `runSandboxed`), the exact drift class P22's own postmortem already
named twice (DEF/EVA's `Array.find`, `synthesize`'s `String.includes`).
`AUTO_RUN_LANGS`/`AUTO_RUN_TIMEOUT_MS` grew a third entry, `sql` (15s,
declared as sitting between js's near-instant boot and pyodide's ~9s —
sql.js's own wasm-over-importScripts boot is real but lighter than
pyodide's). `runSandboxed` grew two things sql needed that python/js
never did: `result`-type worker messages (sql's `runSql` emits these for
every statement that returns rows — formatted with the SAME `formatCells`
the interactive prompt's own `spawn()` handler already uses), and a
`.load <source>` pre-step read off the code's own first line, reusing the
SAME `csvTable` walk `exec()`'s own sql `.load` handling already has — so
`/run sql\n.load orders\nselect …` can prime a table from already-attached
material before the query runs, without a second CSV parser. A new pure,
exported `parseRunCommand(text)` parses the shape (the first line's
second token is the runtime; everything after the first newline is the
code, verbatim) and returns `null` on any shape mismatch — no leading
`/run`, or a `/run <runtime>` with no code — matching `parseMeasure`/
`parseFoldCommand`'s own "null lets the caller's door fall through"
convention, or a typed `{ refused: { type: "unsupported_runtime", detail
} }` when the shape is whole but the runtime is not one `autoRunnable`
accepts (never `fold` — composing a terminal-language act or reading a
source is not "running code" — and never a machine-only runtime).

`app.js` grew `runTurn(runCmd, typed)` and `formatRunOutcome(outcome)`,
mirroring `ingestTurn`'s async shape (`addMessage` now, fill in the
result once the sandbox settles) rather than `actTurn`'s fully
synchronous one, since `runSandboxed` is a real worker boot + exec.
`/run` is wired into `send()`'s dispatcher checked right after `/act`'s
check, for the identical reason `/act` itself states: explicit typed
doors are checked before any automatic detector or the widget router, in
a fixed order, so nothing typed can be hijacked downstream — `parseMeasure`/
`parseFoldCommand`'s two-step shape (parse first; a bare `/run\b` match
that parsed to `null` prints the usage line) is reused rather than
re-invented. Material crosses UNFILTERED — `state.sources`, matching
`actTurn`/`landAct`'s own precedent above: the mute toggle silences
retrieval, not what crosses into a sandbox, and term.js's own
`sourcesPayload()` already mounts every loaded source, muted or not, for
the identical reason. Recording reuses the IDENTICAL
`mirrorTermRecord`/`POST /api/term-record` route `/act` already uses, two
new event types (`term-run`, `term-run-refused`), the same `via: "chat"`
field `/act` established.

**Evidence, driven live end to end through the real chat UI, not only in
test files.** `/run python\nprint(2+2)` printed `4` (10,191ms — pyodide's
own boot cost, matching P18's documented ~9s figure). `/run js\n
console.log(3*7); 6*7` printed `21` then `42` (29ms — no pyodide tax).
Real CSV material pasted as an attachment (`pasted.txt`), then `/run
sql\n.load pasted.txt\nselect city, riders from pasted where riders >
1500;` printed `pasted: 3 rows · city TEXT, riders INTEGER` followed by a
column-aligned table of the two matching rows (359ms) — proving both new
`runSandboxed` capabilities (the `.load` pre-step and `result`-message
formatting) against real attached bytes, not a fixture. `/run ruby\nputs
1` refused mechanically (`unsupported_runtime`, no model call, no worker
ever spawned). Bare `/run` rendered the usage line. Every run and refusal
appeared in `record/explore-record.jsonl` within the same second, `via:
"chat"`, exactly as `/act`'s own events do. The network tab across all of
this showed nothing beyond the sandbox worker files themselves and
`/api/term-record` — no call to Ollama (mechanical, no model call, as
designed) and nothing resembling a machine-execution route. `/act`
composed immediately afterward (`/act distinguish zone-3 at Network from
encounter`) still refused with the identical `no_ground` detail P22's own
evidence names, confirming the new door sitting beside it in the
dispatcher disturbed nothing.

`term.test.mjs` grew 7 cases (23 total, up from 16): `autoRunnable`'s sql
support; `parseRunCommand`'s four parsing rules (valid runtime+code,
missing code, unknown runtime, no `/run` prefix at all → null); ROSTER's
`type` field checked against each worker file's OWN module shape (real
ESM `export` detected in the file text, not a hardcoded map) rather than
merely checked for a truthy value; and a source-scan regression
confirming the `name === "sql" ? "classic" : "module"` ternary is gone
from both `spawn()` and `runSandboxed`, not merely duplicated a third
time. Full-suite count: this session's own worktree is nested two levels
deeper than a normal checkout (`.claude/worktrees/<agent>/` rather than a
sibling of `eoreader6.1`), which breaks every test file's relative
sibling-repo import AND `constitution.test.mjs`'s own `/engine`-mount
disk check — an environment artifact of how this particular worktree was
placed, present identically before this change and confirmed via a
verification-only Node loader that fixes ONLY module-specifier resolution
(never committed, never touches the repo). With that resolution fixed and
`npm install` run (this worktree had never had one), the suite reproduces
the destroyed agent's own baseline exactly — 677 tests before this
change's 7 additions — and lands at 684 tests / 679 passing / 5 failing
after: the same 4 pre-existing failures the baseline names (`measure.test.mjs`,
three `webllm-rung.test.mjs` model-file cases) plus the one disclosed
worktree-nesting artifact above, itself confirmed unaffected by this
change (identical failure, identical file, both before and after).
## Echo vs novel (added 2026-08-19) — what was decided, so it is not re-derived

POLICIES.md P24 is the law; this is the pointer, kept short on purpose —
read P24 for the full measured case and its evidence.

**The one-line version.** `checkGrounding` failing an atom against the
MATERIAL only answers "is this in the passages." It does not answer "did
the model invent this" — a name absent from the passages but present in
the answerer's OWN system message (its summary, its ON RECORD block) is
the answerer reading its own briefing back, not a fabrication, and the two
must never share one bucket. Caught live in
`experiments/system1-cpu-system2-gpu.mjs` (a standalone CPU/System-1 vs
GPU/System-2 dual-model harness, unrelated to production routing): the
GPU arm named its own three checked sources ("VCA Hospitals, AKC,
VetMedGuide") straight out of a record line it had just been handed, and
the material-only check flagged all three as claims nothing given backs.

**Second axis of the SAME gap this file's grounding-ladder section already
disclosed** ("web corroboration still counts name-STRING matches... which
is the referent-model gap, not a counting bug" — P23's own residue,
[[referent-model-not-pointers]]): a string test cannot tell "the same
referent, said twice" from "a referent invented once," on either axis —
across sources (the P23 residue) or across what-was-given-vs-what-was-said
(P24, here).

**Not yet in production.** The fix — a second union index built from the
answerer's own given context, `buildUnionIndex`/`tokenSupported` reused
from grounding.js — is prototyped and self-tested ONLY in the standalone
experiment script. `app.js`'s tally line and `provenance.js`'s
`classifySentences` almost certainly carry the same gap (both check
material-only) but this was never driven live against the production
chat page, and those files are the fold-architecture session's own
(this file's multi-session rule, Explore section above) — named as a
high-confidence open follow-up for that session, not touched here.

**Why it is an efficiency law too, not only a correctness one** (user
direction: "an expert is not someone with a larger context window, it's
someone with better ability to query the hypergraph of battle-tested
experience") — full argument in P24: a fact already on record costs
nothing to repeat: re-checking or re-fetching it every time is compute
spent reducing zero uncertainty, and the budget that frees up is exactly
what should go toward the genuine deltas — the same "ask before spending"
shape P23's preflight already uses for fetching, aimed here at checking.

## Number grounding: company, not bare occurrence (added 2026-08-19) — what was decided, so it is not re-derived

P26 in POLICIES.md is the law; this is the map. Found live by the user
driving the instrument: a grounding badge verified "30" in "trazodone...
30 to 60 minutes" because the digit string appeared SOMEWHERE in an
offered passage's flattened bag of words and numbers
(`buildUnionIndex`/`tokenSupported`) — the same failure shape
[[referent-model-not-pointers]] already named for `widget.js::scoutSpan`
(byte selection by raw token frequency), now found in `grounding.js`'s
atom checking. The user's diagnosis: grounding must read the material's
own contextual, hypergraphical meaning, not raw counts — "you can tell a
word by the company it keeps" (Firth).

**Scoped to numbers, not names — refuted by this file's own tests when
tried wider.** A bare digit string is the single-token, referent-less
case this instrument had no defense for; a multi-word name already has
`PROPER_RE`'s specificity and `checkGrounding`'s referent-resolution
rescue (P11). Requiring a NAME's local company was tried and broken by
`grounding.test.mjs`'s own "an invented figure, agency and year" case — a
real name wrapped in a fabricated predicate shares no words with its true
source context, so demanding overlap punished the real name for its
fabricated neighbour. Company is scoped to numbers only.

**What shipped.** `buildLocalIndex` explodes a passage into its own
sentences (this file's existing `splitSentences`, now applied to material
symmetrically with the answer). `numberCompany` is a number's own answer
sentence, minus every atom's tokens in it (numbers and names alike — a
sibling atom is a separate, independently-checked claim, never context).
`numberSupporters` requires some single passage to have a SENTENCE — not
its whole bag — carrying both the number and at least one company word;
with no company available it falls back to the old whole-passage
containment, never a new false refusal. One check, wired into both
`corroborateAtoms` (the badges) and `checkGrounding` (the findings/tally),
preserving the equivalence `corroborateAtoms`'s own header already
promises between the two.

**Two designs were tried and refuted before the one that shipped, kept
here so they are not retried.** Whole-comma-joined-clause company broke
on the exact same Kessington case (a comma-joined clause can bundle a real
name with a fabricated number, and gating the name on the fabrication's
words fails it too). Nearest-single-neighbour-word company passed
Kessington but failed a real number: "The case_number column lists
24-0011 for Gary IN PD" against a terse CSV row — the words immediately
beside "24" are the model's own narrative gloss ("column", "lists"),
absent from the row itself, while the real matching word ("case_number",
from the header) sits three words back. Whole-sentence company (minus
siblings) passed both, because company is OR-matched: widening it can
only make matching MORE permissive, and an unrelated passage sentence
essentially never shares real vocabulary with a claim about something
else (verified: a decoy passage about "30 dogs" and a clinic "reopen[ing]
in 60 days" shares nothing with "trazodone... 30 to 60 minutes" and is
correctly refused).

**Disclosed, not attempted here — the real next step.** "Sentence" is a
structural boundary, not a tuned token count, but it is still a
HAND-CHOSEN unit — the same class of debt P4 already names for
`ROWS_PER_CHUNK`/`NULL_SAMPLES`. The user's own sharper statement of where
this goes (2026-08-19): a word's universe in the hypergraph is bounded by
how many hops out you can go before you hit a distinction without a
difference — before widening the neighbourhood stops moving the answer
beyond what reseeding noise would move it anyway; "the noise can't beat
the NUL." That is `nul/index.js`'s `pattern()` (`before`/`after` grounds,
`moved`/`opened`, Bateson's "a difference that makes a difference"),
asked a question it has never been asked: not a numeric series, but a
ranked, hop-expanding candidate set (nearest word → next word → ... →
whole sentence → adjacent sentence) with a stopping rule earned the same
way `pattern`'s reseed ceiling was earned — a null built by drawing
candidate company from material the claim was never about (the same
construction `cite.js::bestRival` already uses: drawn by retrieval, the
hardest available comparison, never a random stride). Sketched to this
level of specificity and NOT built: `nul`'s apparatus is built for numeric
series and reusing it for a discrete hop-expansion stopping rule needs its
own design and its own measurement before it earns a name here — the same
standard this file's own "never tune a parameter by checking what it does
to a golden's own score" sibling rule (eoreader6.1/CLAUDE.md) holds every
other number to. A claimed null test that was not actually validated
would be worse than the honest, disclosed, sentence-scoped heuristic
shipped today.

**Files.** `grounding.js` (`buildLocalIndex`, `numberCompany`,
`numberSupporters`; `hasWord`/`hasNumber`/`wordSet`/`numberSet`/
`buildUnionIndex`/`tokenSupported` untouched — `proof.js`/`primary.js`/
`priors.js` read those directly for a coarser, legitimately different
question). Enforced by `grounding.test.mjs`'s new trazodone/decoy case;
20/20 in that file; 759/760 repo-wide after reconciling with concurrent
upstream work (full numbers, and how they were confirmed unrelated, in
POLICIES.md P26).

## The witness tier (added 2026-08-19) — what was decided, so it is not re-derived

P27 in POLICIES.md is the law; this is the map. The user's ask, verbatim:
"wire in the witness tier, but also, tell me what the mechanical fact
checking would need from the hypergraph first" — born from the measured
Yankees specimen (a false claim the relation tier could only call unbound
while the web tier corroborated it ✓ 3/3 by string co-occurrence).

**The one design fact to keep:** the witness model is only ever the mouth.
It answers "does the passage say this sentence is true?" — yes/no, with
the passage's own deciding words — TWICE: the claim, then its
sibling-swapped twin (the sibling drawn from the page's own names as the
competing filler of the claim's slot, chosen by slot-word co-occurrence,
sentence-boundary-spanning "names" excluded). The verdict is DERIVED
mechanically from the pair in `testimony.js::foldTestimony`; the model is
never asked to classify. Measured reason: three-way classification drew
the right `because` under the wrong label from gemma2:2b — the small
model can read, not label. The decider shown to the reader is source
bytes (verbatim pointer → located sentence → word-contained pointer →
refuse), quotes.js's own posture.

**Wiring.** `app.js::witnessProof` runs inside the proof chip's walk after
seekProof — no new egress, same standing consent; testimony re-labels the
chip (⇄) and joins `claims.js::composedSentence` as the witness aspect;
refusals are typed into the audit; the reflex ledger gains `witnessed`
through its designed unknown-act fallback. The narration registers in
provenance.js and holon.js were extended the same day with the measured
modifier-gap + appositive + relate-lemma shape ("The 1960 World Series
question, «…», is directly related to…") — one register, two files,
extended together.

**The hypergraph's own missing piece, named as a decision:** slot
competition (same verb+object-referent, different subject-referent;
definite-unique objects only, exclusivity measured from the material's own
universe under a redealt null; shared referent fold both sides; polarity
and temporal adjuncts in the slot key). Unbuilt — the witness covers the
semantic remainder; P27 records the boundary.
