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
segment is visible.

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
discloses for its run budget); terminal acts are not on the record — the
old terminal's posture, kept deliberately; a term-record mirror is named
future work, not implied.

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
