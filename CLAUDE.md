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

## The model proxy (added 2026-08-18) — what was decided, so it is not re-derived

P27 in POLICIES.md is the law; this is the map. The ask, from the user
directly: the fold should show up as a usable model in the Ollama desktop
app or in OpenCode — a proxy onto the fold, in addition to the browser.

**The reframe.** Both named clients add a custom model provider by base
URL and speak an OpenAI-compatible `POST /v1/chat/completions` +
`GET /v1/models` (OpenCode's provider config, and the Ollama app's own
"add provider"); the Ollama app can additionally be pointed at something
that speaks Ollama's own native `/api/chat` + `/api/tags`. So "make the
fold a model" reduces to standing up both wire shapes on the already-
loopback-bound `explore-server.mjs` and, behind them, running the SAME
turn app.js's `holonicTurn` runs — `holon.js`'s real `runHolonicTask`, not
a lighter reimplementation — headlessly.

**Every servable model id is `fold:<real ollama model>`, never bare.**
Decided first, because it is what makes the rest safe: a request naming
plain `gemma2:2b` is asking Ollama, not the fold, and is refused rather
than quietly answered as if the grounded pipeline had run. `GET /v1/models`
/ `GET /api/tags` list Ollama's real pulled models, reprefixed — never a
second, hand-maintained list that could name something Ollama does not
actually have.

**Full pipeline by default.** Chosen over a passthrough-with-an-opt-in-flag
specifically because most callers of an OpenAI-shaped endpoint will never
discover the flag — a quiet default of "raw Ollama, checked if you ask"
would in practice ship exactly the confusion the `fold:` prefix exists to
prevent. `fold_grounded: false` is the one disclosed opt-out, and it only
turns off the relation tier (the ladder's most expensive part), never the
rest of the pipeline.

**Files.** `proxy-api.js` (new, pure — no fetch, no engine import: the
`fold:` prefix wall, both wire protocols' identical `{model, messages,
stream}` parse into one turn shape, both response/stream formatters) +
`proxy-api.test.mjs` (20 cases, offline). `proxy-runner.mjs` (new — the
one place the engine organs and the Ollama network call live: the SAME
`makeCastResolver`/`makeRelationReader` bundle app.js builds at
app.js:208-259, and a `call()` shaped exactly like `eval/dialogue.mjs`'s
own). `explore-server.mjs` gained four routes (`GET /v1/models`,
`POST /v1/chat/completions`, `GET /api/tags`, `POST /api/chat`) and its
CORS/OPTIONS gate widened from `/api/` alone to `/api/` or `/v1/`.

**Disclosed scope, named rather than silently absent.** No material/
attachments this pass (`chunks: []` — an OpenAI-shaped request has no
composer); no link tier (`checkLink: null` — P20's web egress keeps its
own consent posture, not silently granted to a proxied call); no
persistent session (each turn folds fresh off the request's own resent
history, since the wire protocols already carry it that way — no running
summary, no warrant record; that state lives in the browser, not here);
streaming is single-shot (the whole checked answer as one chunk, then
stop/done) rather than token-level, because token streaming would mean
showing a draft before the correction loop and the quote/relation tiers
have run against it — the one thing this instrument's grounding apparatus
exists not to do; one model per turn, no fast/deep routing-ladder
substitution, because an API caller naming a model on every request has
already made the routing decision app.js's picker makes once per session.

**Loopback only, unchanged.** The routes live on `explore-server.mjs`
(bound to `127.0.0.1` alone), never `serve.mjs` (which binds every
interface) — this widens what a LOCAL tool may address as a model, never
who may reach this machine. Nothing here touches what the browser page
itself may fetch; P1's host ban is untouched.

**Evidence.** Full detail and the live-driven transcript (a scripted
stand-in Ollama — this pass's own sandbox had no real Ollama install to
test against, disclosed as exactly that) are in POLICIES.md P27.

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

## The database fold (added 2026-08-18) — what was decided, so it is not re-derived

P25 in POLICIES.md is the law; this is the map. `store.js`/`store.test.mjs`
(a prior pass, already tested — read in full, not redesigned) hold the load-
bearing invariant, the user's own words, verbatim: **"the reality of the
database should be the EOT event stream, the current state always
projected."** This pass is the wiring that makes that true of a database a
person actually populates, at the terminal's real `sql` runtime or through
chat's `/run sql` door, rather than only in store.js's own tests: a mutation
lands on a fold, the fold appears in the Folds panel, persists the same way
a code/table/html build already does, and reopens after a reload — rebuilt
by REPLAYING the log, never by reading back a saved database export. The
Choreo lineage store.js's own header already claims (github.com/
clovenbradshaw-ctrl/Choreo — "the log is truth, projection is convenience")
is this pass's lineage too, one register over: **"snapshot ingest generates
operations"** — diff raw state, emit granular typed ops — read directly off
sql.js's own before/after row snapshots rather than off a hand-rolled SQL
parser, since sql.js exposes no AST to search for one.

**Files.** `store-sql.js` (new, pure: `looksMutating`/`detectTables` — cheap
text regexes, never a parser, and a caller's cue to fall back when they find
nothing; `snapshotFromExec`/`diffSnapshots`/`deriveStoreOps` — the diff
itself, over sql.js's own real `{columns, values}` result shape;
`sanitizeTableName`/`opsFromCsvTable` — the `.load` path, disclosed as a
deliberate mirror of term-sql-worker.js's own `tableName()`, the same
posture store.js's own header already takes for materializeSql mirroring
that worker's CREATE TABLE shape) + `store-sql.test.mjs` (14 conformance
tests against the REAL sql.js package — every "before"/"after" pair is a
genuine `db.exec("SELECT rowid, * FROM t")` result, not a hand-typed
fixture). `term-sql-worker.js` grew `listTables`/`snapshotNames` and one
new `exec` protocol field (`snapshotTables`) — the worker stays a dumb
executor: it is TOLD which tables to snapshot (or told to use its own
catalog) and hands the raw before/after row-sets back UNEXAMINED; all the
diffing intelligence lives in store-sql.js, a plain ES module the caller
(term.js, main thread) already imports normally — the worker never imports
store.js or store-sql.js, and never decides what a change means. `term.js`
grew the module-level `sqlSnapshotFields` (shared by BOTH the interactive
terminal's `exec()` and the standalone `runSandboxed()`, one implementation
rather than two that could drift — this repo's own postmortems have already
caught that exact drift twice under P22/P24), `applyDbOps` (the terminal's
own closure, prints "database fold: N row-level change(s) recorded" where
it happens), and `runSandboxed`'s resolved object grew a `dbOps` field so
`/run sql` can apply the identical landing after a throwaway worker settles.
`app.js` grew the database-fold section (`findDatabaseFold`/
`createDatabaseFold`/`applyStoreOps`/`databaseProjection`), a `buildFold`
guard (`entry.kind === "database"` → `null`, which is what makes every OTHER
reader of a build — `kindOf`, `buildWords`, `buildChip`'s auto-run — already
safe on a database entry without each needing its own guard), an early
refusal in `foldTurn` (`/fold <n>` is text revision; a database fold is not
text revision's to touch), `persistBuilds`/`restoreBuilds` branches, a
`databaseFoldCard` (deliberately NOT `buildCard` — no cursor scrubber, no
edit/run/restore controls, none of build-log.js's machinery applies), and
`artifactNode`'s new `"database"` branch (drawing through a newly factored
`tableWrap` helper — the SAME table renderer `seg.type === "table"` already
used, not a second one built for this).

**The operator-typing decision, stated because it costs something.** A
diffed row change is landed as `store.insertRow`/`updateRow`/`deleteRow`
exactly as store.js's own header already types them (INS · Figure ·
produced for a birth; SUPERSEDE · SYN · Figure · produced, changed columns
only, for a revision; RETRACT · NUL for a retraction) — nothing new is
typed here, because the typing question was already answered by the module
this pass builds on. What THIS pass decided: a mutating statement is
detected by a bare keyword regex (`INSERT`/`UPDATE`/`DELETE`/`REPLACE`),
never a parser — sql.js exposes no AST, and this repo's own house rule
("search for the organ before you hand-roll one") pointed at diffing
sql.js's own real execution rather than attempting one. Table names are
detected the same cheap way, with an EXPLICIT, disclosed fallback (an empty
detection list tells the worker "snapshot your own full catalog") rather
than a guess dressed as certainty. `.load` needs no diffing at all — every
row of a fresh CSV load is a birth by construction, so it calls `insertRow`
directly off the already-parsed `{columns, rows}` term.js already holds,
never round-tripping through the worker to ask what changed.

**Scope, decided and stated rather than silently assumed — one fold,
app-wide, not per-conversation or per-session.** The first row-level
mutation from EITHER door (the terminal, or chat's `/run sql`) lazily
creates the ONE database fold this pass keeps; every later mutation from
either door lands on the same log — the identical "belongs to the
instrument, not one conversation" reasoning `state.gridLog`/`state.builds`
already state elsewhere in this repo. A "new database" affordance (several
simultaneous database folds) is real, named future work, not attempted:
nothing that motivated this pass asked for more than one.

**Deliberately NOT routed through build-log.js.** A database fold is its
OWN top-level `state.builds` entry kind (`entry.kind === "database"`,
carrying `storeLog` where a code/table/html build carries `log`) rather than
a fifth thread on build-log.js's PROPOSE/SUPERSEDE-per-edit versioning
chain — that model fits a code revision (one person or model editing one
version at a time), not a stream of many small granular row operations; a
database fold's "version" display is simply `entry.storeLog.entries.length`
("N operations recorded"), read straight off the log the same way
build-log.js's own `timeline` reads a code build's addenda count. What IS
reused, named plainly so nothing here reads as a silent half-integration:
`state.builds` itself (one array, one numbering scheme, one persistence
key, `n` allocated the identical `state.builds.length + 1` way every other
kind already is); `renderBuilds`/`foldRow`'s search-and-sort pipeline
(folds-pane.js never learns a database fold's shape — it only ever sees the
same `{n, caption, lang, type, address, code, addenda}` row every other kind
already produces); `artifactNode`'s table renderer, factored into
`tableWrap` so there is exactly one table-drawing implementation. What is
NOT reused: build-log.js's PROPOSE/SUPERSEDE/RESULT vocabulary, its cursor
scrubbing (a database fold has no versioned "as of" position to scrub — the
store log's own entries ARE its history, always shown at the live head),
its editor, its run/restore/download controls.

**Disclosed limitations, found while building, not glossed over.** (1) A
SQL column literally named `id`, `table`, `row`, `because`, `operator`,
`grain`, or any of task-log's other reserved entry keys — `id` especially,
extremely common in ordinary schemas — collides with store.js's OWN
disclosed collision guard and throws at `insertRow`/`updateRow`. This is
store.js's own documented deviation, not something this pass invented, and
this pass does not work around it (renaming or escaping a column would
silently disagree with what the operator actually typed): `applyStoreOps`
catches the failure per-op, keeps whatever succeeded before it, and reports
what could not be recorded, plainly, rather than crashing the batch or
silently dropping the row. (2) Re-entering the interactive `sql` runtime
after `exit` boots a genuinely FRESH, empty in-memory sqlite database — the
STORE LOG remembers every row forever, but the live session does not
remember SCHEMA, so a bare `INSERT` without a matching `CREATE TABLE` in
the new session fails exactly as it would against any fresh sqlite
connection. A second-order consequence, disclosed rather than silently
risked: sqlite's own `rowid` counter also resets to 1 in that fresh
session, so a NEW row inserted into a same-named table in a later session
can collide with an EARLIER session's already-recorded rowId for that
table if the two are never reconciled — not attempted here. (3) "Reopening"
a database fold means the Folds panel shows its live projection
(`store.foldStore`, fresh on every render) — it does NOT mean a freshly
booted `sql` runtime is pre-loaded with the fold's prior rows so a person
can keep querying it live; that would need `materializeSql` (or the
equivalent CREATE-TABLE-plus-INSERT priming) run INSIDE the classic sql
worker, which this pass did not build. (4) `.load`, run a second time
against the same source name, is not diffed against its own prior load —
every row lands as a birth again; a shrink (fewer rows the second time)
leaves the earlier rows' fold entries live and stale. None of these are
silent: each is stated here, and (1) additionally surfaces to the operator
at the moment it happens.

**Evidence, driven live end to end through a real browser against `node
serve.mjs`, not only in test files.** Typed at the terminal:
`CREATE TABLE t (name TEXT, age INTEGER); INSERT INTO t VALUES ('Alice',
30); INSERT INTO t VALUES ('Bob', 25);` landed `database fold: 2 row-level
changes recorded (2 insert, 0 update, 0 delete)`; the Folds panel showed
`DATABASE · 2 OPERATIONS RECORDED` with a rendered `t` table of exactly
those two rows. `UPDATE t SET age = 31 WHERE name = 'Alice';` landed
`(0 insert, 1 update, 0 delete)` — the op count rose by exactly one, Alice
read 31, Bob's row was untouched (not resent). `DELETE FROM t WHERE name =
'Bob';` removed Bob from the live view, op count at 4. **Reloading the
page** — the actual test that matters — showed the identical fold, `4
OPERATIONS RECORDED`, Alice still at 31; a console inspection of
`localStorage["fold-builds"]` both immediately before and immediately after
the reload showed the persisted object's only keys are `["entries", "kind",
"n", "turn"]` — `entries` an ordinary JSON array of task-log entries
(`kind: "propose"/"propose"/"supersede"/"retract"`, the first one literally
`{kind:"propose", operator:"INS", task_id:"t:1", table:"t", row:"1",
name:"Alice", age:30, ...}`) — never a `db.export()` byte array, never
anything resembling a serialized sql.js database. A real CSV
(`city,riders\nNashville,1200\nMemphis,900\nKnoxville,450`) pasted as an
attachment, then `.load pasted.txt` at the terminal, printed `database
fold: 3 row-level changes recorded (3 insert, 0 update, 0 delete)` and the
panel grew a second table (`PASTED · 3 ROWS`) with exactly those three
rows — three separate `insertRow` calls, confirmed by the operation count
(4 → 7) rather than a single table-dump entry; `SELECT * FROM pasted;`
immediately after read back all three rows from the live session AND
produced no new `database fold:` line at all — a bare SELECT genuinely
never touches the store log. Finally, chat's own `/run sql` door —
`/run sql\nCREATE TABLE orders (item TEXT, qty INTEGER); INSERT INTO
orders VALUES ('widget', 5);` — ran in a fresh THROWAWAY worker (a
different door entirely) and still landed `database fold 1: 1 row-level
change recorded`, and the SAME Folds panel grew to `8 OPERATIONS RECORDED
— currently 5 live rows across 3 tables`, proving the "one shared log, two
doors" claim live rather than only by code inspection. The full suite ran
before and after: 706 tests / 702 passing / 4 failing before this pass
(the same 4 this repo already carries — `measure.test.mjs`, three
`webllm-rung.test.mjs` model-file cases), 720 / 716 / 4 after — the 14 new
`store-sql.test.mjs` cases all passing, the same 4 pre-existing failures
untouched, zero regressions anywhere else in the suite.

## Three more terminal languages — ruby, php, r (added 2026-08-18, ninth pass) — what was decided, so it is not re-derived

P26 in POLICIES.md is the law; this is the map. The user's direction, near-
verbatim: extend the terminal's ROSTER with real Ruby, PHP, and R runtimes,
following term-py-worker.mjs's own message protocol exactly. All three were
accepted by prior research (trusted, not re-litigated) as real, currently-
maintained, vendorable-via-npm candidates; this pass is the actual vendoring,
wiring, live verification, and — twice — a correction of what the research
could not have caught without loading the packages in this repo's own
bundler-free, Worker-sandboxed architecture and running real code in them.

**Ruby lands clean, full parity with js/python/sql.** `@ruby/wasm-wasi` +
`@ruby/3.3-wasm-wasi` (npm, MIT), ~102MB vendored (`ruby.wasm` 16MB no-stdlib,
`ruby+stdlib.wasm` 34MB — the one actually served, `ruby.debug+stdlib.wasm`
54MB never touched). `term-ruby-worker.mjs` uses the LOW-LEVEL boot path —
`RubyVM.instantiateModule` + `consolePrinter({stdout, stderr})` — never the
package's own `DefaultRubyVM` convenience wrapper, which hardcodes stdout to
`console.log` and would give this terminal no real capture at all. Material
mounts at `/material` through a WASI `PreopenDirectory` whose backing
`Directory.contents` is a plain JS `Map` — re-mounting just clears and
refills it, the identical shape python's MEMFS mount already has. Ruby ships
the full interpreter AND stdlib in one `.wasm`, so — unlike python, which
defers `sever()` past the first exec's own package-loading fetch — nothing
more is ever fetched once boot resolves, and `sever()` runs at the end of
boot, matching js's simpler timing. `def`/`class`/`module`/`case`/`begin`/
`for` and line-initial `if`/`unless`/`while`/`until`, plus a trailing `do`,
open one continuation level each; every free-standing `end` closes one —
`rubyBlockDepth` in term.js, mechanical word-boundary walk, not a parser,
with the universal trailing-backslash rule as the disclosed escape hatch
when it misjudges. No gem/bundler organ exists (no P21-style wheel organ for
Ruby) — out of scope for this pass, said plainly in the ready note rather
than silently promised.

**PHP required a live substitution the research itself named as a fallback,
found necessary by actually loading the package, not by re-reading its
docs.** The research's own top pick — `@php-wasm/web` + `@php-wasm/universal`
(WordPress Playground) — was installed and read, and its per-version glue
file (`@php-wasm/web-8-3/asyncify/php_8_3.js`) opens with `import
dependencyFilename from './8_3_32/php_8_3.wasm'` — a Vite-only asset-URL
import that only resolves under a bundler. serve.mjs's own header states the
house rule this collides with: "plain ES modules loaded straight from disk."
A raw `import()` of that file fails at the browser's module-script step (the
server answers `.wasm` with `application/wasm`, not a JS content type, so
the static import cannot even parse) — verified live, not assumed. The
research's own-named fallback, `php-wasm` (seanmorris/php-wasm, npm,
Apache-2.0), uses plain relative dynamic imports and `fetch()` throughout —
confirmed by reading every file this worker imports — and was substituted
in. Its cost, disclosed rather than hidden: this package has no per-version
install (unlike `@ruby/3.3-wasm-wasi`'s scoped package name) — `npm install
php-wasm` vendors PHP 8.0 through 8.5 together, ~182MB unpacked, of which
`PhpWeb`'s own per-version dynamic import ever loads ONE ~13MB `.wasm` at
runtime. node_modules is gitignored, so this is a one-time local install
cost, never a git-history cost. `term-php-worker.mjs` uses the `PhpWeb`
class (`new PhpWeb({version:"8.3"})`), `onoutput`/`onerror` event handlers
wired to real streaming (OutputBuffer flushes per newline, the same posture
consolePrinter gives ruby), and `mkdir`/`writeFile` for material.

Two more bugs, found only by booting in a REAL dedicated Worker rather than
trusted from the package's own "web" label: (1) the vendored Emscripten
build's factory function references the bare identifiers `document` and
`window` UNCONDITIONALLY at its own top level
(`specialHTMLTargets=[0,document,window]`, dead fullscreen/canvas/audio-
context runtime glue this text-mode SAPI never calls) — a genuine Worker
compatibility gap in the vendored bytes themselves, not something the
research could see without instantiating it. Fixed by assigning
`globalThis.document = undefined; globalThis.window = undefined;` before
importing — the minimal fix, because assigning `undefined` (never a
functional stub) makes the bare identifiers referenceable without making
`typeof window` report anything but `"undefined"`, so the package's own
Node/Web/Worker environment detection (which reads exactly that) still
correctly resolves WORKER, unchanged. (2) `PhpWeb.run()`'s own documented
`?>${phpCode}` prefix trick — meant to let bare statements run without a
`<?php` tag — does NOT do that for this SAPI: measured live, `echo 1+1;`
typed with no tag came back ECHOED AS LITERAL TEXT ("echo 1+1;", not "2"),
because the leading `?>` only closes an ALREADY-open PHP context, and with
none open the whole string starts and stays in HTML-passthrough mode.
`term-php-worker.mjs` now owns the tag itself — every exec is wrapped
`<?php\n${code}` before reaching `run()` — so the ready note's promise ("no
`<?php>` tag needed") holds regardless of what the library's own trick
actually does. Both fixes are disclosed in the file's own header, not just
here, because a future reader touching this file needs them at the point of
use, not three files away.

**R is real, vendored, and works — with the one runtime here whose sandbox
guarantee is honestly narrower, and that narrowness is a design decision,
not an oversight.** `webr` (r-wasm/webr, Posit-backed, npm), ~52MB vendored.
The package's declared "main" entry (`dist/webr.mjs`) is NOT the browser
build — it opens with unconditional top-level `import {createRequire} from
'module'` (plus `'url'`/`'path'`), genuine Node built-ins, so it fails to
even PARSE in a Worker ("Failed to resolve module specifier 'module'"),
found live, not from documentation. package.json's own `exports` map names
the real one: `dist/webr.js` under the `"browser"` condition — confirmed by
reading it directly (same exported surface: `WebR`, `Shelter`,
`ChannelType`, …, zero Node-only imports anywhere). `term-r-worker.mjs`
imports that one explicitly, since a literal path import bypasses
`exports`-map condition resolution entirely — a bundler or Node's own
resolver would have picked the right file automatically; a raw browser
`import()` of an absolute path does not.

The disclosed gap: `new WebR(...)` unconditionally spawns a SECOND, nested
Worker to run the actual R engine (`webr-worker.js`, r-wasm's own vendored
file). This repo authors and severs the FIRST four runtimes' own single
Worker; it does not author webR's nested one and cannot inject a `sever()`
into its global scope before it runs. Plain R code execution still touches
no network (`download.file()`/`url()` need a configured proxy this file
never sets); the one real path is R's own package installer
(`webr::install()`/`install.packages()`, reaching `repoUrl`, webR's own
default, deliberately left unset here rather than restated to the identical
value — restating it as a literal would have failed this repo's own II.13
host scan for the very reason this paragraph names the risk). Nothing here
wires an R-equivalent of P21's wheel organ, so that path is reached only by
operator-typed R code calling it directly. **Consequence, drawn rather than
left implicit:** `r` is not in `AUTO_RUN_LANGS` — never auto-run, never
reachable from `/run` — reachable only by a person typing `r` at the fold
prompt themselves. Verified live: `/run r\n1+1` in chat refuses
`unsupported_runtime` by name, mechanically, no model call.

**A verification-methodology finding, worth keeping so it is not re-chased.**
The FIRST live attempt at R's boot, in an AI coding assistant's own
sandboxed preview pane, failed with an opaque, detail-stripped worker error
("An error occurred initialising the webR PostMessageChannel worker.",
`console.error` logging a bare `Event` with no message/filename/lineno). A
minimal control — a plain Worker spawning ANOTHER plain Worker, no webR
involved at all — failed IDENTICALLY in that same pane, and succeeded
cleanly in a real, unsandboxed Chrome tab (`claude-in-chrome`, a real local
browser, not an embedded preview) against this same server, on the first
try. The pane itself restricts nested Worker creation; that restriction is
real but belongs to the testing tool, not to a real browser, not to webR,
and not to this repo's code. Every runtime in this pass was re-verified end
to end in that real Chrome tab: `def`/`end` and bracket continuation working
live, `puts`/`echo`/`readLines`/`var_dump`/`array_sum` all producing real
correct output, material crossing (`File.read("/material/…")`,
`file_exists("/material")`, `mount` re-sync) confirmed for ruby and php,
`/run ruby` and `/run php` executing from the real chat composer with the
real model (`gemma2:2b`) and landing `term-run` rows on
`record/explore-record.jsonl` with `via:"chat"`, `/run r` refusing exactly
as designed, and `exit` returning cleanly to `fold ›` from all three. Boot
times, measured live and repeatedly rather than guessed: ruby ~9-12s typical
(once past a minute under heavy concurrent tab/worker load — a real ceiling
disclosed in `AUTO_RUN_TIMEOUT_MS`'s own comment, not the common case), php
~9-10s typical, r ~13-15s typical (a heavier boot: R.wasm plus the vfs
asset set plus the nested-worker handshake) — all in the same order of
magnitude as python's own already-documented ~9s pyodide boot, no worse.

**Decided, not implied: ruby and php join `AUTO_RUN_LANGS`; r does not.**
Both new fully-severed runtimes earn the identical automatic-execution
posture js/python/sql already have — no disclosed sandbox gap, no reason to
withhold. r's disclosed nested-worker gap is precisely the kind of thing
that should never be reachable without a person's own awareness of what
they typed, so it stays terminal-only by explicit design, not by omission.

**Files.** `term-ruby-worker.mjs`, `term-php-worker.mjs`, `term-r-worker.mjs`
(new); `term.js` (three new `ROSTER` rows with measured blurbs;
`rubyBlockDepth`/`rBracketDepth` + their `continues()` cases;
`promptFor()`'s hardcoded runtime→prompt map extended — checked and
confirmed this one does NOT generalize off `ROSTER` the way `spawn()`/
`runSandboxed` already do, so it needed the same three-line addition
`AUTO_RUN_LANGS`/`REFUSED` did not; `AUTO_RUN_LANGS`/`AUTO_RUN_TIMEOUT_MS`
grew ruby and php with measured budgets); `term.test.mjs` (SEVERED
cross-check extended to all three new workers; `mountName` cross-checked
against all three; new continuation-grammar cases for ruby and r;
`autoRunnable`/`parseRunCommand` cases updated for the new true/false split
— two PRE-EXISTING tests had encoded "ruby is not runnable yet" as their
own example and were corrected to test the now-different, real boundary,
never just widened to keep passing); `package.json` (six new dependencies:
`@ruby/wasm-wasi`, `@ruby/3.3-wasm-wasi`, `php-wasm`, `webr` — the
`@php-wasm/web-8-3`/`@php-wasm/universal` packages installed during the PHP
candidate's live rejection were uninstalled again rather than left as dead
weight). No change to serve.mjs or explore-server.mjs: both already serve
the whole repo directory generically (checked directly — neither has a
node_modules subpath allow-list the way the task's own framing guessed one
might; `.wasm`'s `application/wasm` MIME entry, needed for
`WebAssembly.compileStreaming`, was already present in both from the
python/sql.js pass).

**Enforced:** `term.test.mjs` — 29 cases total (up from 16), including the
severed-list agreement across all six workers, mountName agreement across
all four material-mounting workers, ruby's def/end and r's bracket
continuation grammar as their own pure functions AND through `continues()`,
and the corrected autoRunnable/parseRunCommand boundary. Full suite: 735
tests / 731 passing / 4 failing before this pass (the same 4 this repo
already carries — `measure.test.mjs`, three `webllm-rung.test.mjs`
model-file cases, confirmed via `git stash` against this exact worktree
rather than trusted from memory), 741 / 737 / 4 after — zero regressions
anywhere else in the suite.

## The assertion tier — a relation edge's verb-hood is a hypothesis, never a recovered fact (added 2026-08-19)

P29 in POLICIES.md is the law; this is the map (renumbered from P28 on
merge — a concurrent PR independently landed its own P28 first; the
number moved, nothing about the policy itself did). This closes a handoff from
an investigation that had exhausted vocabulary-widening on `hypergraph.js`'s
MINE-1 score (nine configurations, same pareto-best plain vocabulary,
`unbound` stuck at 35–39% in every one — a paraphrase-tolerance gap in the
scoring rubric, not a vocabulary gap). The user's redirect: stop chasing "is
this token the same verb as that one" (a linguist's category, recovered and
then trusted) and instead treat `extractRelations`'s own claim about a
clause the way this repo already treats every other unverified claim — a
hypothesis with disclosed support, never a fact once recovered. The same
line this repo already draws on the noun side (the cube is not a content
classifier; L2's capitalisation veto; the referent index over stemming),
drawn on the verb side.

**Search-first, and the honest finding: no ready-made organ existed.**
`nul/index.js`'s `LICENSED` table has no licensed text perturbation (only
numeric-series pairs); `emergence/activation.js` has no unused retrieval
mode for this. What DID exist and transfer: activation.js's cue gate and
`emergence/binding.js`'s arrivals floor both independently land on 2 as
"how much recurrence makes a pattern," and
`goldens/agency-civic/rotation-control.mjs` had already built and measured
the exact construction — a clause's own words seeded-shuffled, the
document's real vocabulary held fixed, scored through the identical
pipeline — at clause scale. `asserted.js` generalizes that construction
from "one clause" to "every sentence of the material," per relation edge
rather than per clause, because goldens are firewalled consumers (nothing
outside `goldens/agency-civic/` may import from it — its own conformance
test enforces this).

**Two measures, one ever sets a standing.** Self-corroboration by
recurrence (`WITNESS_FLOOR = 2`, structural, never walked against a
golden) types every edge `corroborated` or `single-witness`. A word-salad
order arm (draws declared, never defaulted) reports raw fired-counts,
phrased natural-frequency — **never a verdict, never a cut**: no threshold
is earned by this pass, so none is invented (the same discipline the kinds
arm and the proof-seeking tier already hold this repo to). Wired into
`hypergraph.js` additively — `assertion` rides every edge and therefore
every claim's `bound`/`nearest` disclosure — and it convicts nothing:
`relationFindings`/`relationsClean` are byte-for-byte unchanged.

**The new eval harness, deliberately decoupled from MINE-1's rubric.**
`eval/asserted-eval.mjs`'s synthetic adversarial suite (ground truth by
construction — passive voice, a relative clause, coordinated verbs, a
fronted adverbial, negation, a planted-false co-occurrence, two paraphrase
cases) reproduces `goldens/agency-civic`'s own three named recall gaps as
concrete, typed failures rather than only an aggregate rate: passive voice
reversed agent and patient, the relative clause mis-bound its pronoun as
subject, coordinated verbs elided the shared subject onto the wrong
object. 8/9 intended edges heard correctly; the one forbidden edge
fabricated had a salad count indistinguishable from genuine edges on this
small suite — an honest negative result, not glossed over. A real-prose
run over the already-captured Wikipedia War and Peace fixture (827 edges)
produced a stratified, verdict-stripped blind sheet, scored by three
independent, context-isolated general-purpose agents (`eval/
asserted-blind-analysis.mjs` — Fleiss' kappa 0.789, well above the
kappa = 0.4 floor `agency-civic`'s own analysis refuses below). Two
findings kept exactly as measured: corroborated and single-witness
standing showed IDENTICAL precision against the panel (75.0% each,
n=12/stratum) — the witness floor alone did not separate confirmed edges
from rejected ones on this sample; the order arm's fired count showed a
directional gap the synthetic suite did not surface (median 20.5 vs 6,
human-YES vs human-NO) but at n=24 total licenses no cut. **Labeled
throughout, agency-civic's own discipline carried over: this is an
LLM-panel proxy, not a human ceiling, and a real human pass is still
required before either finding is reported as certified.**

**What this pass explicitly refused to do, per the handoff.** No tenth
vocabulary-widening configuration. The inferred graph-hop verdict, already
killed by two adversarial cases and proven dead code once made safe, was
not resurrected. A higher `bound%` was never treated as evidence of
anything by itself — correcting that premise was the whole point of the
redirect.

**Files.** `asserted.js` (new, pure) + `asserted.test.mjs` (7 cases, one
against the real engine `extractRelations`/`splitSentences`).
`hypergraph.js` (`assertion` wired onto every edge, additive) + 2 new
`hypergraph.test.mjs` cases. `eval/asserted-eval.mjs` +
`eval/asserted-blind-analysis.mjs` (both re-runnable eval drivers, not
committed regression tests — matching P19's and P27's own posture);
`eval/results/asserted-eval.md`, `asserted-blind-results.json`, and the
three raw panel verdict files are committed so the analysis reproduces
from the repo alone. Full suite: 719/724 passing, the same 5 pre-existing
failures this repo already carries, zero regressions.

## Closing the MINE-1 gap — recurring-form subjects (added 2026-08-18, tenth pass)

`goldens/EXTERNAL-BENCHMARKS.md` ("The Goldens", eoreader6.1) named MINE-1
as priority 1; `eval/mine-1-RESULTS.md` ran it and measured a weak result
(5.8%/17.1% bound) with a diagnosed cause: 57.2% of the facts that even
extracted a claim failed `beyond-reach` — the subject (`"Butterflies"`,
`"Caterpillars"`) never resolves to a referent, because `cast.js` requires
a proper name or a resolved pronoun and MINE-1's essays are encyclopedic.
The user's own direction, asked to work backwards from the score: consider
every real lever, with nothing hardcoded.

**Priors was tried first, honestly, and closed as a dead end for THIS
benchmark** — see `eval/mine-1-priors-RESULTS.md`: 0/1,575 facts landed
`stated-by-library` against the WHOLE `live_priors` corpus treated as
activated (no toggle gate). Not a broken mechanism (85% of facts found
real candidate documents and were genuinely read) — `live_priors` is a
curated philosophy/classics/law/foundational-science canon, and has no
shelf for roller coasters or butterfly metamorphosis. Ruled out by
running it, not by argument.

**What actually closed most of the gap was already sitting in this
project, one repo over, solving a differently-named version of the exact
same problem.** `host/terrains.js`'s Network-graph organ had already
diagnosed "concept documents starve the cast ladder" (measured on
SEED-SPEAKER.md: four sentence-initial capitals at one arrival each, vs.
21 form nodes once recurring content words are counted) and built the fix
for the GRAPH surface: recurring-form co-arrival binding, admitted at
`arrivals >= 2` sentences — "binding's structural minimum, not a tuned
floor: one arrival has no co-arrival to test." `hypergraph.js`'s own
`beyond-reach` verdict was the identical starvation, one tier over, never
connected to that organ before. The search-for-the-organ-first rule
(eoreader6.1's own CLAUDE.md), applied one level up: search for the organ
before inventing a new threshold, even inside your own repo.

**The fix.** `hypergraph.js`'s `endpoint()` now grants a SUBJECT the same
identity `host/terrains.js` already grants a graph node — a content word
recurring at least `FORM_MIN_ARRIVALS` (= 2, reused whole from
`FORM_BINDING`'s own structural minimum, not re-derived) sentences in the
material — namespaced `form:<word>` so it can never be mistaken for a real
cast referent, and every claim resting on one is marked `formBased: true`
on the claim itself so a reader can tell a form-anchored `bound` from a
name-anchored one (P11: "the same name" and "the same recurring word" are
never the same claim). Confined to SUBJECTS ONLY — `endpoint(str, true)`
at every subject call site, `endpoint(str)` (forms off, unchanged) at
every object call site — because the object side already had a working,
tested `tokensShare` stem-tolerant fallback for "no referent," and merging
forms into it too would have made `endpointsMatch` take the STRICTER
exact-id `intersects` branch instead, whenever both sides happened to
share a form — a real regression to already-shipped matching that this
benchmark's own score would never have surfaced (MINE-1 only exercises the
subject gate). The function-word exclusion reuses `hypergraph.js`'s own
already-computed `commonTerms`-based measure (the one this file's own
header already documented choosing over `material.js`'s document-scale
`functionWordSet`, which degenerates at this material's size) — one
measure, not a second one at a different scale.

**Measured, not assumed.** `eval/mine-1-forms-RESULTS.md`: bound facts
92 → 222 (a 2.4x lift on both denominators, 5.8%→14.1% / 17.1%→41.3%),
`beyond-reach` 307 → 87, essays with ≥1 bound fact 37/105 → 52/105, zero
contradictions both before and after (537 claims read either way — claim
EXTRACTION is untouched by this fix, only what happens after extraction).
`no_claims_extracted` stayed exactly 1,038 (65.9%) — this fix cannot touch
it, and it remains the dominant, larger bottleneck, the same one
`goldens/agency-civic`'s own README already named as its next concrete
step (widening `relations.js`'s clause-terminal SVO match to relative
clauses, fronted adverbials, coordinated verb phrases). The realistic
ceiling for THIS fix alone, stated before running and checked after:
best case ~25.3%/~74.3% if every recovered `beyond-reach` case turned out
bound; the real result landed well short of that, honestly, because most
recovered subjects turned out `unbound` or `unheard` rather than `bound`
— a referent-resolution fix can only let the reader FORM an opinion about
more claims, never make the essay have said more than it did.

**Two bugs caught building this, not smoothed over.** (1) The first cut
captured `named` (does this endpoint already have a real referent) BEFORE
the surface-pattern match ran, so a subject like "Darwin" — which
resolves only through the surface-MENTION pass, not `index.resolve()`
alone — read as `formOnly: true`, wrongly; caught by this file's own new
regression test, fixed by moving the capture after both real resolution
paths run. (2) The confine-to-subjects decision above was found by
REASONING about `endpointsMatch`'s two branches before writing the object
call sites, not discovered as a live failure — disclosed as a design
decision the tests now pin, not a bug that shipped and was later found.

**Test coverage.** `hypergraph.test.mjs` grew from 9 to 13 cases: a
recurring plain-noun subject resolving as a form and landing
`bound`/`formBased: true`; a named subject under the SAME material never
marked `formBased` (bug (1) above, pinned so it cannot silently regress);
a subject recurring exactly once still refused `beyond-reach` (the floor
is real); a form-resolved subject with no matching edge landing `unbound`,
not a silent beyond-reach. All 9 pre-existing cases pass unchanged. Full
repo suite (46 files, 699 cases) shows 5 failures — confirmed via
`git stash` to be identical with or without this change, all missing
vendored `node_modules` this particular checkout never received
(`sql.js` for `store.test.mjs`/`store-sql.test.mjs`, model files for
`webllm-rung.test.mjs`/`measure.test.mjs`, `monaco-editor` for one
`constitution.test.mjs` II.13 case) — an environment gap, not a
regression, and a count worth restating honestly here since it differs
from the "4 failing" this file's own prior passes recorded: this
particular worktree's `node_modules` is missing more than that one was.

## Closing more of the MINE-1 gap — a received prior beats induction, tested (added 2026-08-19, eleventh pass)

The prior pass's own "next steps" note (`eval/results/mine-1-next-steps.md`)
named two live options for the still-dominant `no_claims_extracted`
bottleneck (65.9% of all facts): induce verb-hood from `live_priors` via
kind-induction, or receive it from UniMorph. User direction: don't be
stingy about the received prior — test what actually works best.

**Kind-induction, tried honestly first, is real but not there yet.**
`emergence/kinds.js`'s `induceKinds` is fully generic (population +
attribute profiles, nothing entity-specific) and was pointed at candidate
words from real `live_priors` text with closed-class-derived distributional
features. It found genuine, non-trivial clustering (four cohesive groups,
each clearing `eva()`'s existence gate) — but the features tried don't
isolate verb-hood as the discriminating axis, and the full pipeline's own
stronger search-aware null correctly refused all four anyway. Architecturally
sound, empirically unproven; real further work, not a quick win.

**UniMorph, tried second, won clearly.** `hypergraph.js` grew an optional,
backward-compatible `verbForms` organ: a Set of known verb surface forms
from UniMorph's English paradigm table (github.com/unimorph/eng, a received
resource with its own giver — vendored, 103,318 forms,
`eval/fixtures/unimorph-eng-verb-forms.json`). Every essay word that is
BOTH a recurring form (the SAME `FORM_MIN_ARRIVALS`-gated set the prior
pass's subject-identity fix already computes — one recurrence measure, not
two) AND a known verb form joins the vocabulary directly, bypassing
`discoverRelationVocab`'s own surface-anchoring step entirely. This is why
it works where two anchor-WIDENING attempts (feeding recurring forms, then
determiner phrases, into `discoverRelationVocab` itself as candidate
anchors) were tried and rejected on the merits first: that function's
candidate nomination assumes anchor SPARSITY only proper names reliably
give it, and a received lexicon needs no anchor at all — it answers a
direct per-word question instead of nominating candidates near one.

**Measured, not assumed:** bound facts 222 → 531 (headline 14.1% → 33.7%
against MINE-1's own full fact count), essays with zero measurable
vocabulary 29/105 → 0/105, `no_claims_extracted` — the bucket the prior
fix explicitly could not touch — 1,038 → 189. Zero contradictions, as in
every run this project has logged against this fixture.

**The honest cost, disclosed rather than smoothed over.** A hand spot-check
of 20 `bound` triples (not just counts) found roughly HALF have a genuine
subject/verb boundary error — English's deep noun-verb conversion means
even "feed", "play", "serve", "gain" are tagged both N and V in UniMorph,
and `extractRelations`'s own boundary logic sometimes anchors on the wrong
adjacent verb-tagged word ("Dinosaurs roamed the —earth→ millions of years
ago" instead of "Dinosaurs —roamed→ the earth..."). The verdicts still hold
honestly — a `bound` match requires the SAME shape in both the material's
edges and the answer being read, and since MINE-1's facts are drawn from
their own essay, a systematic mis-parse lands identically on both sides, so
the match is a real repeated pattern, not a hallucinated one — but it is
NOT the same as every recovered triple being a clean, human-readable SVO
statement, and this is why `verbForms` ships **opt-in only**: no existing
caller's behavior changes, and whether the live app's own grounding checks
should adopt it by default is a real, undecided question (a live chat
answer's wording won't always mirror its material as closely as a
benchmark fact drawn from its own source essay does) — flagged, not
resolved here.

**Files.** `hypergraph.js` (the `verbForms` organ, backward compatible —
omitted, byte-identical to the prior pass); `hypergraph.test.mjs` (13 → 16
cases: vocabulary widened on truly nameless material, a hapax lexicon
match still refused by the same recurrence floor, full backward-compat
check); `eval/mine-1-unimorph.mjs` + `eval/fixtures/
unimorph-eng-verb-forms.json` + `eval/results/mine-1-unimorph-RESULTS.md`
(the three-way comparison table: baseline / recurring-forms / UniMorph).
Full repo suite: 702 tests / 697 passing / 5 failing — the same 5
pre-existing environment failures this worktree already carries, zero
regressions.

**Immediate follow-up, same day: "what about both?" — tried, and it loses.**
The disclosed boundary-quality cost above prompted the obvious next
question — combine the received prior with the material's own local
distributional evidence, rather than choosing one or the other. Tried as
`eval/mine-1-unimorph-disambiguated.mjs`: UniMorph tags 25,031 English
words as BOTH noun and verb (`eval/fixtures/unimorph-eng-ambiguous-nv.json`);
for an ambiguous word, ask the essay's own local counts whether it is
usually preceded by a determiner (noun-leaning) or not (verb-leaning) —
`priors.js`'s received `DEFINITE_DETERMINERS`/`INDEFINITE_DETERMINERS`
again, one vote per essay, no new engine change (`hypergraph.js` itself is
untouched — a smarter `verbForms` Set is still just a Set the caller
builds).

**It does not help.** Headline-on-examined ticks up marginally (38.3% →
39.8%) but headline-on-all-facts drops (33.7% → 30.7%): `no_claims_extracted`
nearly doubles (189 → 362) and absolute `bound` facts fall (531 → 483) —
the vote is not surgically separating good triples from bad ones, it is
refusing a large share of ambiguous words outright, and recall drops
almost twice as fast as precision improves. Worse, it introduces the
session's first two `contradicted` verdicts, both traced by hand to the
SAME root cause: the local vote has no way to distinguish real noun-verb
conversion ("feed"/"play"/"serve") from UniMorph simply also tagging a
closed-class function word with a rare archaic verb sense ("but", "more") —
admitting "but" as a verb broke a "not only X but also Y" correlative
construction on opposite sides of the negation scope; admitting "more" as
a verb broke a comparative spanning a clause boundary the extractor
doesn't model. Both are real, disclosed gaps in the underlying clause
extractor becoming newly reachable, not semantic disagreements between two
claims. Verdict: UniMorph alone (unfiltered) remains the strongest result
of the three — a cheap local heuristic is the wrong tool for this
ambiguity class, because it conflates two different problems (real
conversion vs. UniMorph's own overly broad function-word tagging) that
need different fixes. Not ruled out: a real POS tagger, or a narrower
ambiguity list built to exclude function-word verb senses before the vote
runs. Full write-up: `eval/results/mine-1-unimorph-disambiguated-RESULTS.md`.

**Closed the same day — a new engine organ, not another word-level proxy
(`packages/engine/perceiver/text/roles.js`, in `eoreader6.1`).** Every
proxy above scored a WORD's own decontextualized behavior. Calibrated
against real control words (a follow-up check, same day: pooled
determiner-adjacency over `live_priors` and raw `extractRelations`
selection rate, both recomputed with pure-noun/pure-verb/pure-function-word
controls), neither had any real discriminating power — determiner-
adjacency saturated identically for "but" and "eat"; the shape-based
extractor rate saturated identically for "the" and "destroy". A third try,
`discoverRelationVocab` fed named+form referents as anchors (referent-
adjacency instead of bare-span stats), worked in most essays but leaked
via a recurring ADJECTIVE ("enjoyable") standing in as a referent-anchor —
29.6%/42.1%, 2 contradictions, same root cause both times: "recurs ≥2
times" has no noun/adjective distinction. User's own reframe closed it:
"these words don't mean things objectively... point to referents" — and a
check of eoreader6/5/4.2 (per user direction) found eoreader6.1's own
stripped research scratch (`eoreaderhandbook`'s vendored slice of
`scripts/experiments/FINDINGS.md`) had already reached the identical
conclusion for agent-role resolution: "a surface span is never the thing
with a part of speech — the referent is." `roles.js` (`resolveSpanRole`)
is the general engine organ this closes with — the sibling of
`pronouns.js::resolvePronouns` at the SAME quarantine level (both thin
text-tier consumers of `emergence/activation.js`'s domain-agnostic
mechanism, reused unmodified), generalized so "role" is a caller-declared
label, never typed in as pronoun or verb — user-directed, explicitly: not
named after pronouns, natural-language specifics quarantined out of the
general core. `conformance/roles.test.js` (6 cases, real module, no
stubs) pins the two deliberate divergences from `pronouns.js` (no
same-sentence skip rule; an open N-ary role vocabulary, not gender's fixed
binary) as regressions, not just documentation.

**Result: cleanest precision of everything tried, real recall cost,
honestly explained.** `eval/mine-1-span-role.mjs` supplies the only
NL-specific part (UniMorph-unambiguous verbs/nouns as known evidence,
UniMorph-ambiguous words as the spans to resolve) — 22.4%/42.7%, **zero
contradictions**, matching plain UniMorph's own cleanliness where both
refinement attempts introduced 2. Checked, not assumed: the butterfly
essay alone has 254 ambiguous occurrences but only 7 words total cleared
into its final vocabulary, because unambiguous-verb evidence is
structurally sparse within one ~300-word essay (predicates rarely repeat
verbatim) while the essay's own topic nouns recur constantly and clear
`activation.js`'s sparse-coding floor easily — `pronouns.js`'s mechanism
was proven on book-length material; MINE-1 is two orders of magnitude
shorter. Plain UniMorph's raw 33.7% stays the strongest headline of the
whole session. Disclosed, not fixed: bridging per-occurrence bindings back
to `hypergraph.js`'s flat, essay-scoped `verbForms` Set (admit a word if
ANY occurrence resolved "verb") is itself the type-level collapse this
whole reframe argues against, done only because `extractRelations` has no
per-occurrence API yet. Full write-up, the five-way comparison table, and
the honest prediction for book-scale material (untested here):
`eval/results/mine-1-span-role-RESULTS.md`.

**Closed for the night — a real bug found and fixed, and a ceiling
confirmed rather than assumed.** Pushed for "proper layering... the
relativistic NULs": tried using `resolveSpanRole`'s non-verb resolutions
as a targeted VETO over UniMorph's permissive vocabulary (an essay-
relative correction, not a positive gate) — net loss (31.1%/39.2% vs
UniMorph's 33.7%/38.3%), and inspecting the bindings directly (not
assumed) found why: `resolveSpanRole` shares ONE recall pass per SENTENCE
across every ambiguous word in it — correct for `pronouns.js`'s actual
question (one referent per sentence) but wrong here, where different
words in one sentence can have different true roles. Six different words
in one sentence carried the IDENTICAL margin and activation — sentence-
topic classification, not per-occurrence resolution. Fixed at the CALLER
layer only (`roles.js` itself untouched, still general): clause-level
frames instead of sentence frames, segmented by `pronouns.js`'s own
`CLAUSE_OPENER_RE` closed class (same giver, reused as a segmenter rather
than a pairwise check). Real, confirmed fix — verb resolutions went from
0 to 121 across the corpus, and both the clause-level gate and the
clause-level veto beat their sentence-shared predecessors on every axis.
Neither beat plain UniMorph. Nine configurations total, spanning a wide
precision/recall range, converge in the same 22-34%/17-43% band — plain
UniMorph stays the pareto-best result of all of them. **90% is not
reachable by further layering under the current verdict criterion**:
`unbound` sits at 35-39% of examined facts in every variant, untouched by
any vocabulary change, because it is a paraphrase-tolerance gap (`bound`
requires exact triple-shape convergence between two independent
extractions) — closing it needs a different verdict criterion entirely
(semantic entailment, not structural matching), not a tenth vocabulary
layer. Full nine-way table and the reasoning: `eval/results/
mine-1-FINAL-COMPARISON.md`.

**"Check against other systems" — and the whole picture changes.**
Fetched the MINE-1 paper's own methodology directly (arxiv.org/abs/
2502.09956) rather than assuming `bound` was comparable to its reported
numbers: it scores via embedding retrieval (`all-MiniLM-L6-v2`) + 2-hop
graph expansion + an LLM judge deciding whether a fact is INFERABLE from
the retrieved subgraph — permissive/entailment-style, nothing like
`bound`'s exact structural match. Reported baselines under that rubric:
OpenIE 29.84%, GraphRAG 47.80%, **KGGen 66.07%**. Built the retrieval half
of that exact pipeline against this reader's own graph
(`eval/mine-1-official-graph.mjs` + `eval/mine1_official_retrieve.py`,
real sentence-transformers embeddings, no fixture faked); no hosted LLM
judge is available in this environment, so a disclosed sample (11/105
essays, 165/1,575 facts) was judged by hand against the paper's exact
rubric — honestly flagged as unblinded and uncalibrated, unlike the
paper's own judge (validated at 90.2% human agreement). **Result: 80.0%
(132/165) — above every reported baseline, including KGGen.** This
confirms directly what the structural reasoning already argued: the low
`bound` score mostly measures verdict strictness, not a weak underlying
graph. Also surfaced one real, separate weakness worth its own future
work — one essay's retrieval collapsed to the same generic edges for
every fact, a genuine low-edge-diversity problem unrelated to the metric
question. Full write-up, honest limits, and reproduction path:
`eval/results/mine-1-official-methodology-RESULTS.md`.

**"Wire this in to be how we work" — a dead end, found adversarially, and
the real fix behind it.** The obvious move, widen `bound` itself with a
sixth verdict (`inferred`) covering a claim from a graph NEIGHBORHOOD
instead of one edge, was built and then broken on purpose before it was
trusted: "Pierre married Dolokhov" (the tier's own flagship fabrication
case) passed at first, because Pierre and Dolokhov are genuinely connected
by unrelated real edges and a one-token object costs nothing to cover.
Tightened, it STILL passed a worse case, reproduced live: "Pierre painted
delicate watercolors" fired when the material said Natasha painted them —
hopping through an unrelated "Pierre admired Natasha" edge let her own
action get attributed to him. The only safe fix (no graph hop at all,
pool only a subject's own statements) turned out to be provably dead
code: `bound`'s own single-edge match already accepts any one shared
token, a strictly weaker bar than anything safe built from the same
primitive could add. Reverted in full. The honest lesson: the 80% score's
power came from two things this tier correctly refuses to mechanize live
(real embeddings, a real judge's relational reasoning) — widening REACH
without either adds nothing safe can't already reach.

**What did add real, safe value: a different primitive, not a
repackaging.** Every verb comparison in `hypergraph.js` used exact string
equality, so "underwent metamorphosis" against material stating
"undergoes metamorphosis" — the same predicate, different tense — lost
the claim, sometimes silently (never even extracted). `organs.
createLemmatizer`/`organs.morphologyIndex` (`perceiver/text/
morphology.js`, UniMorph-backed, irregular-inflection-aware, found by
searching before writing anything) widen verb equality to `sameAct` —
checked live that an unrelated verb sharing no lemma stays refused, so
this is narrow lemma equivalence, never a general fuzzy match. Optional
and backward compatible exactly like `verbForms`. Measured: bound
531 → 536, unheard 48 → 42, zero contradictions either way — small
because MINE-1's own facts are close paraphrases already, real on every
axis regardless. Whether the live app should load either prior by
default remains the same open question already named for `verbForms`,
not resolved here either. Full account: `eval/results/
mine-1-lemma-RESULTS.md`.

**"Stemming or referents?" — argued referents; "try it" — proved the
argument by breaking the naive version first.** `endpoint()`'s `useForms`
had stayed subject-only by explicit prior design, with a disclosed but
never-reproduced regression risk on the object side. Reproducing it live
confirmed it: "underwent transformations" read `unbound` against
material stating "underwent a remarkable transformation," because
singular and plural independently became DISTINCT exact-token form ids
once objects got forms — referent identity keyed by exact string is not
actually referent identity, it is stemming wearing a `form:` prefix.
Fixed by reusing the SAME `sameAct` organ the verb amendment already
proved safe: `formIdOf` groups a token with every other recurring form
that is the same act as it (nouns exactly like verbs), object identity
enabled ONLY when `createLemmatizer` is provided, never unconditionally
— the regression cannot recur without a lemmatizer.

**"It needs to work for Ancient Greek, or we have high-level priors
steering for different grammars" — checked, not assumed, and it didn't,
until fixed.** `morphology.js`'s DATA layer was already properly
quarantined (every prior must declare `language` and `giver`), but its
regular-inflection RULE (hardcoded ASCII English suffix-stripping) ran
unconditionally regardless of what a loaded prior declared — a
hypothetical Greek prior would still get silent English suffix-guesses
folded in underneath it. Fixed at the source (`createLemmatizer` now
takes `language`, defaulting to English only when unspecified, matching
every existing caller); `organs.morphologyLanguage` threads a prior's own
declaration through hypergraph.js automatically, nothing English-specific
living in this file at all. Combined effect of both fixes, zero
contradictions throughout: bound 531 → 557, beyond-reach 267 → 236,
headline 33.7% → 35.4%. Full account, same file.

## The grammar lens — "verb" gets a citation (added 2026-08-19)

The assertion tier (P29) already treats an edge's verb-hood as a
hypothesis, never a recovered fact — measured with a real null. This pass
closes a narrower, older question the same session's own committed
evidence had been carrying unaddressed the whole time: `eval/results/
asserted-crosslingual.md`'s raw triples include `"that" —this→ "means
war"`, `"if you" —still→ "try"`, `"CHAPTER XII" —book→ "ONE"` — a pronoun,
an adverb, a noun, each sitting in the field every part of this app calls
"verb" (the UX pass's own `linkNode()`/`linkText()`: "subject —verb→
object"), because nothing between `extractRelations` and the renderer ever
checked. Not a bug in a classifier — a grammatical category, applied
without a citation, to a slot that was never built to earn one.

**The reframe, and where it came from.** A survey of world grammatical
traditions (Pāṇini's kāraka role theory, Sanskrit; Sibawayh's ism/fiʿl/ḥarf
trichotomy and root-and-pattern morphology, Arabic; Dionysius Thrax's eight
parts of speech, Greek, ~100 BCE, the direct ancestor of "subject, verb,
object" itself) surfaced the actual defect: this repo's earned
representation is `Entity — Link(label) — Entity`, nothing more — no noun,
verb, subject, or object was ever in the operator table's own vocabulary
(`packages/engine/operators.js`'s three faces: Ground/Field, Figure/Link,
Pattern/Network — no grammar anywhere in it). "Verb" was imported, without
a receipt, from a 2,100-year-old Greek grammar built to describe Greek.
Corrected the same way this repo already corrects every other unearned
claim (the giver test, `priors.js`'s own standing discipline — a received
closed class enters with its giver named or it does not enter): the
ARRANGEMENT (an ordered first end, a label, an ordered second end) is
earned and stays exactly as `hypergraph.js` already computes it; the
READING of that arrangement as subject/verb/object is a declared,
giver-named OVERLAY, switchable, never baked into the record.

**The cube was considered and correctly refused for this.** CLAUDE.md's
own law is explicit: "the cube is not a content classifier... deriving a
terrain from a passage is a refuted move," measured at 95.7% cell-
assignment survival under word-shuffling. Reading a word's grammatical
category off its DISTRIBUTIONAL COMPANY and landing it on a terrain column
would be exactly that refuted move under new vocabulary (an emanon/
protogon/holon framing was proposed and set aside for this reason,
mid-session). What this pass builds instead reads a word's category off
STRUCTURAL POSITION and CLOSED-CLASS/LEXICON MEMBERSHIP — never off
content or meaning — which is the same axis `extractRelations`'s own
slot-matching already operates on, not a new instance of the refuted move.

**SLOT is not CLASS — Halliday's Systemic Functional Grammar keeps them
apart on purpose (function vs. class: a function can be realised by any
class), and conflating them is precisely how "at" became a verb.**
`extractRelations` reads SLOT correctly (something fills the connector
position); it never checked CLASS (is that filler a verb). The fix is not
a smarter extractor — it is a second, independent question, answered
separately and disclosed separately.

**Search-first, and a second-order find: the organ for this half-existed,
unused, in the sibling repo.** eoreader6.1's `scripts/build-pos-prior.mjs`
was already written, fully commented, and had never been run — a
transform from Universal Dependencies' UD_English-EWT treebank (CC BY-SA
4.0, real human annotation) into `POSPrior@1`, ambiguity preserved per
word form. Fetching the real treebank and running the existing script
(one `curl`, one `node` invocation, `scripts/corpus/` gitignored so this
is a local build, never a git-history cost) produced a stronger foundation
than the two hand-typed closed classes (prepositions, conjunctions) this
pass was about to add to `priors.js` — real counts covering every UD tag
at once, not just the two that were missing. `perceiver/text/wordclass.js`
(eoreader6.1, new) is the consumer: `classifyWord`/`dominantClass`,
Thrax's eight as a declared translation FROM UD's tagset (`THRAX_MAP`,
every entry naming exactly where the two schemes agree — UD's AUX/VERB
and CCONJ/SCONJ splits have no ancient counterpart — and where they do
not; `THRAX_OUT_OF_SCOPE` for UD tags with no Thrax analogue at all,
ADJ/PART/NUM/PUNCT/SYM/X, kept OUT rather than forced into the nearest
category). Full account, including the disclosed participle gap
(UD's UPOS carries no separate participle tag; the signal lives in FEATS,
which the builder does not yet tally): eoreader6.1's own CLAUDE.md.

**Files, this repo.** `grammar-lens.js` (new, pure, organs injected —
the cast.js pattern, exactly like `verbForms`/`createLemmatizer` are
already injected into `hypergraph.js`): `makeGrammarLens` classifies an
edge's connector span; `mismatchedConnectors` is the new disclosed
diagnostic this repo did not have before — which edges' connectors do
NOT read as a verb under the Thrax lens, at the caller's declared
`minShare` (never defaulted, the same standing `dominantClass`'s own
floor and `resolveSpanRole`'s `minActivation`/`minMargin` already hold).
`grammar-lens.test.mjs` (5 cases): the crosslingual eval's own three
disclosed junk triples, copied verbatim, all correctly caught; a genuine
verb edge never flagged; an honest disclosed cost (`"married"`: VERB 4 vs
ADJ 3 in the real treebank — settles at an ordinary majority, correctly
refuses to settle at a strict 0.9 floor, a real trade named rather than
hidden); an out-of-vocabulary word landing a disclosed gap, never a
guess and never counted as a mismatch; and one end-to-end case running
the REAL extraction pipeline (`makeRelationReader`, real material) into
the REAL lens, not a hand-built edge.

**Deliberately additive — nothing renamed, nothing revoked.** `edge.verb`/
`edge.subject`/`edge.object` are untouched; `relationFindings`/
`relationsClean`/the assertion tier's own fields are byte-identical.
`grammar-lens.js` reads an edge hypergraph.js already produced and returns
a SEPARATE classification alongside it — the same posture `verbForms`/
`assertion` already established for additive organs in this file. A full
rename of the internal `verb` field to a neutral `label`, with the
Sibawayh/Thrax reading wired as the app's default rendering overlay, is
real, scoped, unattempted future work: it touches ~120 call sites across
this repo (measured, `grep -c '\.verb\b'`) and the render layer's own
`linkNode()`/`linkText()`, and needs the same kind of explicit scope
confirmation this repo already asks for before any cross-cutting rename —
not attempted without it.

**Named, not built, this pass: the kāraka/PP-role tier.** Pāṇini's
semantic roles beyond the two the triple already gives for free (kartā =
first span, karma = second span, no new code) — karaṇa/instrument,
sampradāna/recipient, apādāna/source, adhikaraṇa/locus — all read off a
governing preposition on an attached phrase `extractRelations` does not
currently capture at all (it matches subject-verb-object only, no
adjunct PPs). A preposition closed class is no longer the blocker (UD's
ADP tag closes it, see above); the PP-attachment reader itself is
unbuilt. A second, looser correspondence (which preposition signals which
kāraka role) would need its own giver, disclosed as an approximate
English-specific mapping — English prepositions do not line up 1:1 with
Sanskrit vibhakti case endings.

**Evidence.** `node --test wordclass.test.mjs` (eoreader6.1): 10/10.
Full eoreader6.1 conformance suite: 1,103 tests / 1,100 passing / 0
failing / 3 skipped (up from 1,093/1,090/0/3 before this pass — the 10
new cases, zero regressions). `node --test grammar-lens.test.mjs` (this
repo): 5/5, including the real-pipeline case. Full suite, confirmed via
`git stash` against this exact worktree: 744/739/5 before this pass's two
new files, 749/744/5 after — the same 5 pre-existing environment
failures this repo already carries (`measure.test.mjs`,
`webllm-rung.test.mjs`, `store.test.mjs`/`store-sql.test.mjs` missing
vendored `sql.js`, `constitution.test.mjs`'s one II.13 case missing
vendored `monaco-editor`), zero regressions anywhere else in the suite.
## Echo vs novel (added 2026-08-19) — what was decided, so it is not re-derived

POLICIES.md P30 is the law; this is the pointer, kept short on purpose —
read P30 for the full measured case and its evidence.

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
(P30, here).

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
experience") — full argument in P30: a fact already on record costs
nothing to repeat: re-checking or re-fetching it every time is compute
spent reducing zero uncertainty, and the budget that frees up is exactly
what should go toward the genuine deltas — the same "ask before spending"
shape P23's preflight already uses for fetching, aimed here at checking.

## Number grounding: company, not bare occurrence (added 2026-08-19) — what was decided, so it is not re-derived

P31 in POLICIES.md is the law; this is the map. Found live by the user
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
POLICIES.md P31).

## The witness tier (added 2026-08-19) — what was decided, so it is not re-derived

P32 in POLICIES.md is the law; this is the map. The user's ask, verbatim:
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
semantic remainder; P32 records the boundary.

**Amended 2026-08-19 (same day) — measured against 25 real facts: three
bugs fixed, recall 2/25 → 5/25, zero wrong corrections throughout.** User
direction after the witness tier landed: "fix and chase to get better
results," then validate with `eval/witness-batch-eval.mjs` (new — 25 real
factoid claims against REAL fetched Wikipedia pages, never fixtures,
query-building steering to Wikipedia first per direct instruction, an
ordinary search only as fallback). Three bugs found from actual live
reads: `siblingSwap`'s candidates admitted newline-glued infobox fragments
and caption text that legitimately repeats the claim's topic words without
asserting it (both now excluded, a zero-score tie now refuses rather than
guessing); the witness's own `real.because` frequently already names the
correct filler and is now tried FIRST as a walled hint before the
independent slot-scoring heuristic; and no fixed temperature let the
identical prompt flip its own answer between runs (`completeOnce`/
`complete` gained an optional `temperature`, witness reads pass `0`). Every
fix moved recall; precision (zero wrong corrections) held across all three
measured runs by construction — a bad candidate produces a refusal, never
a lie. Dominant remaining gap, disclosed not chased: `witnessSlice`'s
anchor scoring has no prose-vs-table signal, so a flattened polling table
can out-anchor real prose naming the answer — named as the next step in
the eval's own header. Full amendment in POLICIES.md P32.

**Same-day companion — the void, acknowledged.** Second direction, same
session: "if the surf did not turn something up, the model should be fed
the acknowledgement of this void." A preflight search (P23) that ran and
found nothing used to look, to the model, identical to a turn where no
search was ever attempted. `holon.js`'s `SEARCHED_VOID_PREFIX` +
`searchedVoid` now threads through `runHolonicTask` → `runPart`, reaching
only the flat chat branches as a fact appended to `CHAT_SYSTEM_PROMPT` —
information the model receives, never a behavioral instruction stacked on
top (the same posture an independent parallel session's
`experiments/facts-before-draft.mjs` converged on the same day, from
tracing an echo bug to its input rather than patching the output). Full
amendment in POLICIES.md P32.

## The verification taxonomy (added 2026-08-19) — what was decided, so it is not re-derived

P33 in POLICIES.md is the law; this is the map. User direction, verbatim,
after a session of finding individual verification bugs one measured
incident at a time: "it needs to decompose any given fact into tasks to
verify, which is why we need a taxonomically complete list of things a
proposition needs to be verified by a witness."

**The taxonomy is read off the engine's own grid, not invented.**
`operators.js::TERRAIN_BY_DOMAIN` already names nine cells (Existence ×
Structure × Interpretation, each × Ground/Figure/Pattern) as the complete
space any act can occupy; checking a proposition is EVA, and EVA's own
grain can be any of the three — with Existence and Structure gating
whether Interpretation may even run. `verification.js::verificationTasksFor`
walks all nine per claim. Domain order is Strawson/Russell presupposition
logic, not tidying: a referent that fails to exist makes downstream cells
typed GAPS, never falses — enforced as an explicit short-circuit that
overrides even a supplied witness result, because trusting one would be
the JNJ incident (P23) in the other direction. Verdicts are five-valued
(`holds`/`fails`/`both`/`gap`/`not_yet_executable`), Belnap's fourth value
(`both`) landing exactly where hypergraph.js's own `contested` field
already lived, unused until this pass.

**Five cells real, four disclosed absent** — see P33 for the exact map.
Every cell declares its own giver and dependency (truth-maintenance:
beliefs carry their justifications) and carries a caller-supplied
`cursor`, never a computed timestamp. Wired live into the existing
"thinking" disclosure, one JSON panel per turn, verified against a real
turn (`who won the 1960 world series?`) composing correctly end to end.

**Known residue:** Lens does not yet compose against the SAME claim
object Link/Network do — the witness tier reads checkable atoms, hypergraph
reads SVO triples, two different extractions on two different schedules.
Unifying them is named, real, unattempted next work.

## The two-pass answer: S1 fast, S2 checked (added 2026-08-19) — what was decided, so it is not re-derived

P34 in POLICIES.md is the law; this is the map. User direction, verbatim:
"one is just the raw transcript that gets summarized for size and responds
fast, the next is the system 2 response, which also has access to the fast
response" — then, correcting the first cut, "let's use the same model for
each, what's different is behind the scenes, the surf and fold and stuff."

**The shape.** `twoPassTurn` (app.js) renders S1 immediately — one plain
`complete()` call, `S1_SYSTEM_PROMPT`, no retrieval, no checking — then
gates: `extractCheckableAtoms` (grounding.js, mechanical, zero extra model
calls) decides whether S1's own draft contains anything worth running the
full pipeline against. A gated-in turn runs `holonicTurn` exactly as any
other turn does — the SAME existing holon.js pipeline, not a lighter
reimplementation — with `priorPass: s1Text` so S2 can confirm, extend, or
correct S1 rather than starting cold (`priorPassFor`, holon.js). Both
passes run on the SAME model (`state.model`, read once) — not S1 on the
fastest routing rung and S2 on the picker's choice, which was the first
cut and was corrected specifically so this experience isolates ONE
variable (does the apparatus earn its cost) from a confound (a bigger
model would also help, with or without any of it).

**Amended same day — the discourse line was being dropped exactly when it
mattered most.** Measured live: "system 2 keeps drifting off the
discourse." `holon.js`'s `executeMessages` assembly carried a bug in two of
its four branches (flat+material, flat+materialless-with-history): the
one-line discourse fold (`chatContext` — S1's own distilled topic/flow/
entities, computed once in app.js as `discourseLine`) was included ONLY
when `chatHistory` was empty (`chatHistory.length ? "" : chatContext`) —
backwards, because the two carry different information (raw turns vs. a
distilled synthesis) and are not substitutes for each other. The failure
mode this produces is worst exactly when `aperture.js`'s regime has
narrowed `chatHistory` down toward its floor (as little as the two messages
of one exchange, under startle — CLAUDE.md's own "System 1's own ground,
measured" section, above) — the discourse line was the only thing that
could have kept the wider conversation in view at that moment, and it was
the thing being thrown away. Fixed by folding `chatContext` into the
system message unconditionally in both branches, never gated on
`chatHistory.length`. Pinned as a regression in `holon.test.mjs` (two
cases: the material branch and the materialless branch, each asserting the
discourse text survives a call that also carries verbatim history).
`presentWindow` itself (aperture.js) was left untouched — it is a measured,
tested design (a declared floor, linear interpolation, tied to the belief
prior's own decay rate), not the defect; the defect was a second assembly
being silently discarded next to it, not the window's own narrowing.

**Full suite: 964/964 passing after the fix** (963 before — the two new
cases plus the pre-existing count).

## EVA computes, REC concedes (added 2026-08-19) — what was decided, so it is not re-derived

P36 in POLICIES.md is the law; this is the map. The redirect that produced
it, from the user: a prior investigation's own `succession-answer.js`
sketch was "far too shaped to that problem" — the real ask was how to EVA
the hypergraph generally, with provenance, and REC understanding as
needed, for any material a real checking organ exists for, not one more
Wikipedia-succession-box-shaped module.

**The seam already existed.** `grid.js`'s `evaluate` verb (P22) already had
a documented, disclosed gap in its own refusal text — "grid.js records a
declared verdict, it does not yet compute one." Closing that generally
turned out smaller than the narrow module it replaced: `evaluate <claim>
... ground <source> broken:<p>` with no `verdict:` clause now runs
`hypergraph.js`'s real `read(claim)` against the named ground when it's an
already-loaded source, via a `claim` mode added to `capacities.js`'s
existing `relations` capacity (no new capacity id). Only `bound`/
`contradicted` compute holds/refused; `unbound`/`beyond-reach`/`unheard`/
`competing` all stay undetermined by design — `foldGrid`'s existing
DEF/EVA companion match already renders that honestly as "wish, no verdict
declared yet," unchanged. `grid.js`'s `attachResult` gained one optional
`extra` parameter so the computed verdict rides onto the RESULT entry as
ordinary payload (task-log.js's own documented merge rule) — no other
function touched.

**REC mirrors `build-log.js`'s real `rezeroBuild` exactly**, applied to a
checked claim instead of a code build: a later evaluate that disagrees
with an earlier determined verdict for the SAME object concedes it first
(EVIDENCE·REC·Figure·produced, `concedes` + verbatim `trigger`), landed
via a new `grid.concedeEvaluation`, before the new verdict attaches.
Re-confirming the same verdict lands no REC — agreement is not a
contradiction, pinned as its own regression alongside the disagreement
case.

**Live on both doors already, zero further wiring.** `term.js`'s `act`
command and app.js's `/act` chat door both already call the identical
`landAct`/`runCapacity` instance app.js builds once (`relationsFor`
already injected the same day the `relations` capacity itself was wired) —
this shipped complete on both surfaces the moment `capacity-runner.js`
landed.

**Verified live against real, uncached-elsewhere material** (a real 160KB
Wikipedia page, not a fixture): a true, stated fact in ordinary prose
computed `holds` with 8 real passage citations; a second true fact stated
with a pronoun subject ("The 16th vice president, he assumed...") computed
honestly undetermined rather than guessed — `extractRelations` anchors
candidate verbs on capitalized surfaces only, the same previously-
undocumented gap `MECHANICAL-COVERAGE-INVESTIGATION.md`'s own
military-governor specimen already surfaced, now confirmed on a second,
independent real specimen.

**Disclosed, not silently narrower than it sounds.** Text only, today —
the omnimodal generalization the user actually asked for is honest about
where it currently stops: a ground ruled by `measure.js` or `store.js` has
no checking organ wired into this seam yet, and asking evaluates it as an
honest (never-guessing) but not yet distinctly-typed undetermined, unlike
the other nine capacities' own `not_yet_executable` gap. Also named,
real, and unbuilt: "squaring polarity" (the user's own proposed next
check) — evaluate a claim and its negation independently and cross-check
the pair, since live verification found `extractRelations`'s own negation
detection unreliable on copula constructions ("was never X") though
reliable on transitive ones ("never appointed X") — the SAME verdict on
both readings of one claim is itself the tell that this sentence
construction's negation detection silently failed, the identical
ask-twice-derive-the-verdict shape `testimony.js`'s `siblingSwap` already
holds elsewhere, aimed at polarity instead of the object filler.

**Files.** `grid.js` (`attachResult` gained `extra`; new
`concedeEvaluation`). `capacity-runner.js` (`runCapacity`'s `relations`
gained `claim`; `landAct` gained the `evaluate` branch). `grid.test.mjs`:
49/49 unchanged. `capacity-runner.test.mjs`: 16 → 23, all against the real
engine perceiver organs, no stubs.

**Amended same day.** Driving this live crashed both render sites
(app.js's `actTurn`, term.js's own `act` handler) — both assumed
`landed.capacity.result` was always cast's `{referents}` shape; fixed by
branching on `landed.event.verb`. A second real bug, found the same way:
squaring confirms polarity only, so "Andrew Johnson was the 22nd
president" and the exact original conflation, "Andrew Johnson was the
17th vice president," both still computed `holds` — hypergraph.js's
object-matching needs just one shared word ("president") to call two
different objects "the same." Closed by `checkObjectSpecificity`
(requires every one of the claim's content tokens on the real edge that
actually backed the verdict, read via its own `refs`, never a re-derived
guess) — `capacity-runner.test.mjs` 23 → 30. Full account, including the
honest finding that a true appositive-sentence claim also downgrades (no
real edge ever backed it either) and that the ORDINARY chat pipeline
still makes the exact original mistake since none of this is wired into
it yet: POLICIES.md P36's own same-day amendment.

## HL — the logic over hypergraph stages (added 2026-08-20) — what was decided, so it is not re-derived

P37 in POLICIES.md is the law; this is the map. The lineage: the
positional-calculus probes (A–D, run in conversation against the kernel
record and reproduced independently before anything landed) proved a
sound/complete presupposition logic over the operator face and a
no-upward-entailment theorem at Pattern grain; HL is the same three-face
split pointed at the relation tier — stages (Site) as models,
content-general rules (Act) as proof theory, judgment outcomes
(Resolution) as verdicts.

**Files.** `hl.js` (pure, standalone, imports nothing — organs and
edges arrive as arguments; the cast.js posture without even the
injection, since the logic needs no engine organ) + `hl.test.mjs`
(16 conformance cases: the reference probes ported, the giver/
provenance walls, the adapter against synthetic edges in the real
public shape AND against a real `makeRelationReader` run over the real
engine organs — the same sibling-repo imports hypergraph.test.mjs
uses). Zero existing files touched, deliberately: the tree was mid-edit
by a concurrent session across app.js/grid.js/term.js when this landed
(the ground-ledger.js scoping precedent, reused).

**What it buys that judge() structurally cannot:** R2 functional
exclusion (a declared-functional relation's bound edge convicts any
DIFFERENT object in the same slot — the uniqueness-violation case
judge() can only land `unbound` on), R6 transitive composition (a
never-stated fact derived, provenance recording the chain), definite
descriptions as grammar (`the r(s,o)` — presupposition failure reads
`contested` when a keyed functional relation carries multiple
bindings), and typed quantification where the type genuinely bites.

**Decisions that cost something:** contested-DOMINANT verdicts (FDE's
"both"), knowingly diverging from judge()'s bound-plus-contested-
metadata — both files' headers carry the divergence so an adapter maps
it consciously; `unrefuted@stage` refusing to compose through ∧/∨
rather than silently coercing; declarations refused without a named
giver (empty register today — building the functional/transitive
closed class with per-relation givers is the named next work, and R2's
live value is exactly proportional to it); `attach` downgrading
insensitive verdicts to `undetermined` (the PR-#61 sensitivity posture
as a definition, not a check bolted on).

**Not claimed:** nothing live consumes hl.js yet — no grounding-ladder
wiring, no verification-taxonomy seat (P33's Lens cell is the natural
one), no UI. The gating-vs-attractor question for R5's open-domain
clause stays open, disclosed in the module header.

## HL, amended (2026-08-20) — the core moved, acquisition landed

P37's amendment in POLICIES.md is the law; this is the map update. The
core logic (Stage, R1-R6, the verdict lattice) now lives in
`eoreader7/native/interpretation/hl.js` — Interpretation-
domain engine infrastructure, not a the-fold concern (full placement
evidence: eoreader6.1/CLAUDE.md, "The Interpretation domain's own logic
— HL"). This repo's own `hl.js` is the adapter alone
(`stageFromEdges`), re-exporting the engine's API unchanged so nothing
that imported `./hl.js` broke.

**New: `hl-acquire.js` + `hl-acquire.test.mjs`.** The spin-up gate,
composed from organs this repo already owns
(`makeRelationReader`, `makeGrammarLens`) plus a refutation scan and
`EVIDENCE_FLOOR = 2` (reused from `emergence/binding.js`'s own
structural minimum, never re-derived). Produces two disclosed tiers —
REFUTED and CANDIDATE, never GIVEN — because `functional(r)` is a
Pattern-grain claim and the grain theorem (probe D) says a corpus can
refute one but never earn one. Concession of a later-refuted candidate
routes through the engine's new `declarations.js::concede` (REC,
mirroring `grid.js::concedeEvaluation` exactly).

**Built explicitly against a live mistake, not a hypothetical one.** A
concurrent session's same-day "chase" work (DEF/EVA/REC wired to
mechanical question-answering) hand-tuned subject/verb/object per
specimen and hit the paraphrase-intolerance ceiling MINE-1 already
disclosed, one parameter at a time. `hl-acquire.js` counts structure
and uses the grammar lens only to reject, never to re-derive roles —
named in its own header so the next pass does not repeat the mistake
either.

**Validated adversarially, not on Wikipedia.** `hl-acquire.test.mjs`'s
invented chronicle (Zorlan/Brannic/Iyla, nothing recallable) contains a
genuine coincidental-validation trap: "advises" looks exactly as clean
as the genuinely-functional "governs" until the corpus grows by one
sentence and the real extractor's own new edge refutes it — caught live
through the REAL relation reader and grammar lens, twice (the direct-
edge unit test and the end-to-end real-organs test), not asserted.

## Pronoun resolution wired into the relation tier, and the index-purpose bug it was found through (2026-08-20) — what was decided, so it is not re-derived

P38 in POLICIES.md is the law (**"an index answering 'does this exist' is
not an index answering 'is this established' — never hand one to a
mechanism that reads"**); this is the map. Started from a live complaint
("who was Abraham Lincoln's vice president?" reading confused) and ended
several layers deeper than the original bug.

**What actually shipped, in the order it was found.** (1) `hypergraph.js`
gained a `blankFurniture` organ, scoped to extraction only
(`discoverRelationVocab`/`extractRelations`'s own input, never `list`
itself) — a Wikipedia succession box's bare "Preceded by"/"Succeeded by"
rows have no sentence terminator between them, and `extractRelations`'s
MATCHER reads whitespace connectors across a bare newline on purpose (real
Gutenberg hard-wrapped prose needs that), so the two rules collided and
glued adjacent box rows into nonsense. Verified by replaying the exact
retrieved passages through both completeness signals deterministically,
bypassing the model entirely: both already computed the correct answer.
(2) `holon.js` gained `buildRedefinedPart` — when the completeness gate
finds a cardinality violation (P36's own `clusterFillers`/`fillers.length
> 1`, "we were expecting one and got multiple," the object-side member of
the family described below), the fix is no longer a critique of the prior
draft ("your draft answers as if there is only one... rewrite it") but a
fresh, uncritical re-ask (`buildExecutePrompt`, not
`buildCorrectionPrompt`) carrying the confirmed closed set as a stated
given. Three successive wording fixes to the critique framing were each
dodged a NEW way live (an echoed escape phrase, narrating the question
instead of answering it, inventing a real-but-unconfirmed nearby name) —
three different dodges from three different wordings diagnosed the
FRAMING itself as the defect, this file's own repeated lesson ("a
directive about the task produces a description of the task") confirmed a
third time. (3) `gatherPreflightMaterial` (app.js) folds every search
result's own snippet into one combined `web:search-results` chunk instead
of fetching only full pages — tried first as N separate per-result
chunks and measured to fail: nine near-identically-scoring snippets
racing for three retrieval slots is a coin flip on which FACTS survive,
confirmed live when a real draw won two Hamlin-only snippets and a
Johnson-only one over three that each independently stated both names.
(4) `extractSurfaces` (eoreader6.1, shared) gained `|` to its
run-breaking punctuation set, the same class of fix as the comma incident
this file's own referent-merge history already records — found by
running a real search-results page through it, not by auditing the
regex: `"Hannibal Hamlin | Abraham Lincoln, Maine, Civil War |
Britannica"` glued into one spurious "Hamlin Abraham Lincoln" surface.
Titles were then dropped from the digest text entirely rather than
chasing the next title separator (a bare hyphen) one character at a
time — search-result titles are metadata, not prose, and enumerating
every site's own title convention is the identical "cannot be formatted
to specific sites" trap this repo already refused for succession-box
parsing.

**(5) The one P38 is actually named for.** `resolvePronouns`
(eoreader6.1's `perceiver/text/pronouns.js`) composed into
`hypergraph.js` via a new `resolvePronouns` organ, reusing
`host/corpus.js`'s own declared, disclosed-as-unvalidated operating point
(`minActivation: 0.05`, `minMargin: 0.2` — no golden exists for pronoun
binding in either repo, moving these numbers is expected, not a
regression) rather than inventing new ones. Scoped PER PASSAGE, never
across passages — `relationsFor`'s own `list` is retrieved top-N
passages, often from unrelated pages, and resolving one passage's pronoun
against a name that only happens to occur in another would be the exact
cross-document contamination READING-POLICY P1 already warns against
("never carry a window across books"). First cut reused `cast.js`'s
already-built referent index for the surface→referent lookup — compiled,
ran, threw nothing, resolved nothing: zero pronoun mentions were even
ATTEMPTED against real continuous Wikipedia prose, read in true document
order. `cast.js`'s index is built with `minSentences: 0`, its own header
naming exactly why ("presence... a name mentioned once is present once")
— the RIGHT floor for a citation-presence check, the WRONG one for an
activation mechanism, because `resolvePronouns`'s own gate refuses any
sentence carrying ANY named surface, and with no floor a one-off place
name earns referent status exactly like a real recurring person, blocking
the attempt just as hard. Fixed by giving `resolvePronounSubjects` its
own second `discoverReferents(surfaces, {})` pass — the organ's own
DERIVED recurrence floor, the same one `host/corpus.js` already relies on
by omission, validated at book scale. Measured before/after on the same
real passage: 0 attempts → real bindings (`Johnson gave a number of
speeches`, `Johnson was eager to complete the work`, `Johnson attended a
party` — sentences whose raw text said only "He") plus honestly typed
remaining gaps (`pronoun_no_candidate`, `pronoun_no_margin`), never
silence.

**Full suite, every fix in this chain, before and after each one:**
the-fold 1003/1003; eoreader6.1 1116/1116 (its own `extractSurfaces` fix
re-run against the FULL conformance suite, not spot-checked, given that
file's own regression history in this document).

## The claim-id spine (added 2026-08-20) — what was decided, so it is not re-derived

P39 in POLICIES.md is the law; this is the map. BUILD-0 through BUILD-2 of
the "Per-Source Testimony" spec (one coherent voice on the surface, unique
per-source testimony underneath, derived not stored — a proposal, gated on
the tasks/hypergraph/grammar integration investigation this same session
ran first). The spec's own build order does not start until its gating
investigation reports; it reported (§7.1's role-predication-wall
hypothesis was refuted as originally stated and refined into two real,
separate upstream bugs — a pronoun-subject that never resolves, and an
object silently truncated at a comma — both upstream of
`checkObjectSpecificity`/`squarePolarity`, which behave exactly as
designed; §7.2 confirmed `concedeEvaluation` stamps no experiencer at all,
in either real call site).

**Files.** `grid.js` gained `mintClaimId` (async, Web Crypto SHA-256,
`builds.js::buildHash`'s own approach), one field on `land()`'s
already-enumerated list (`claim_id: event.claim_id` — the exact place
`warrant`/`because` already sit), and `foldClaim` (a plain filter over
`log.entries`, cursor-scrubbable like `foldBuild`). `capacity-runner.js`'s
`landAct` gained an optional `claimId`; `perSourceReadings` and
`mergeTestimony` are new, pure functions built on top.

**The one thing worth not re-deriving: a bespoke `landCell` function was
built, tested, and deleted the same day.** Every field it needed already
existed — `operator`/`grain` from picking a verb and terrain in an
ordinary act, `witness` from the already-real `warrant:<giver>` clause,
`payload` from `attachResult`'s own already-general `extra` parameter.
The load-bearing lesson, stated generally in P39: a new cross-cutting
identity is a reason to widen an existing carrier, not to build a second
one. Caught live by a direct question ("as soon as you start making N-ary
modules, aren't these just one of the 9 operators?") — the same
search-for-the-organ-before-inventing-one discipline this file's every
other section already holds, aimed at this repo's own new code instead of
eoreader6.1's.

**Two disclosed deviations from the spec's own sketch** (found by reading
real code, not assumed): `who`/`read` map onto `experiencer.js`'s
existing, DIFFERENT convention (mechanism vs. source) rather than
renaming it — spec-`who` reads from `experiencer.read`, spec-`read` from
`judged.refs`, the mechanism lands on `emitted_by`; `corroboration` stays
`judge()`'s own real `{passages, sources}` shape rather than collapsing to
the spec's placeholder bare `int`. And a fifth merge case the spec's own
four never name — unanimous refusal (`CONTRADICTED`) — found while
implementing, not designed in advance.

**Not yet built, in flight as of this writing.** BUILD-3 (grammar-lens
tagged at extraction rather than post-hoc; a named-giver declaration for
the UD treebank grammar-lens.js already depends on) and BUILD-4 (the
crown render — inspired by a frozen eoreader5 legacy reference
(`row-stance-templates.md`'s exactly-1 token-trace-coverage veto), never
ported per Constitution I.2, rebuilt fresh as a template-only, model-free
renderer over `mergeTestimony`'s own output) are dispatched as separate,
non-overlapping passes. Named, real, unstarted: BUILD-5 (a web-hunt result
entering the same merge as one more witness), and — the sharper,
generalized restatement of this file's own "Echo vs novel" section above —
the model's own bare, unprompted assertion entering as its OWN witness
(`who: self:model`) rather than an exceptional "ungrounded" case exempted
from the Testimony system entirely: nothing a model says is truly
ungrounded, it is grounded in itself, and a system that already tracks who
backs a claim should name that witness honestly, including — especially —
refusing to let it silently co-sign its own corroboration.

## BUILD-4 landed, and the self-witness construction — real, tested, not wired (added 2026-08-20)

POLICIES.md's amendment to P39 is the law; this is the map update. BUILD-4
(`crown.js` — the render) landed as its own files, scoped exactly as named
above. The same pass carried a direct, mid-task user instruction that
resolved this section's own still-open question, verbatim: a model's bare,
unwitnessed assertion "CAN say things that are 'ungrounded,' but really
it's just grounded in itself" — not an exceptional case exempted from the
Testimony system, TESTIMONY FROM A WITNESS whose read is its own weights.
`SELF_WITNESS = "self:model"` / `isSelfWitness` landed in
`capacity-runner.js`; `mergeTestimony` was amended so a self-witness never
co-signs AGREE's corroboration count alone (DISAGREE's own condition
untouched — a self-witness genuinely opposed by a real refusal is still a
real disagreement, on the record, never silently resolved toward
CONTRADICTED); `crown.js`'s render functions never special-case
`SELF_WITNESS` at all — they print whatever `who` string a reading
carries, verbatim, so a self-witness sitting next to a real source name in
a DISAGREE render IS the disclosure. Both backward compatible by
construction: byte-identical output whenever no reading's `who` is
`SELF_WITNESS`.

**The construction — minting and landing an actual self:model reading —
is now also real and tested, and deliberately NOT wired to any real
caller.** Every test exercising a self:model reading before this, in both
`capacity-runner.test.mjs` and `crown.test.mjs`, hand-built one; the
mechanism was provably reachable but nothing in this repo could produce
one. `capacity-runner.js` gained `landSelfAssertion(grid, log, {subject,
verb, object, verdict, claimId})` — deliberately NOT built on `landAct`'s
`evaluate` branch, because `evaluate`'s own grammar refuses at PARSE TIME
without a named `ground … broken:<perturbation>` (correctly, for a real
check), and a self-assertion has no ground by definition. `define` is
grid.js's own already-documented exception (no refusal fires at parse for
a missing companion evaluate — defining is the act of putting a claim
forward, not checking one), which is the correct EO-typing here.
`landSelfAssertion` lands a DEF act through the unchanged
`grid.parseAct`/`grid.land` (the same `at Field from generate`
terrain+stance this file's own terminal-language section already uses for
a worked `define` example — not a fresh convention) and attaches a RESULT
directly, shaped — proven by test, field for field against this file's own
pre-existing `selfModelReading()` fixture — to be exactly what
`perSourceReadings` already knows how to project. `perSourceReadings` and
`mergeTestimony` needed ZERO further changes: the earlier amendment's own
`who === SELF_WITNESS` handling was already ordinary data-shaped, not a
lookup path, and that design bet is what made this half addable without
touching either function.

**Deferred, on purpose, and disclosed rather than silently left open: no
real call site exists yet.** This file's own Explore section already
states, twice-over counting `experiencer.js`'s own header, that `app.js`
and `holon.js` belong to the fold-architecture session's contract — and
`app.js` was found, mid-pass, carrying live uncommitted work (an audio-
transcription feature, landed minutes before this pass started) this
pass's own edits would have sat beside with no coordination. The same
posture P20's own residue and the HL section above both already hold for
these exact two files. Rather than guess at a call site in a file this
pass does not own, the tested primitive ships alone, with an integration
note (`self-witness-integration-note.md`, this repo's own sibling to
`chip-coverage-note.md`) naming exactly where the trigger already sits —
`holon.js`'s `inspect()`, its no-material branch, `holon.js:994-1000` —
and one real design nuance found by reading that code rather than guessed
at: the (subject, verb, object) triple a caller should mint from is NOT
`extractCheckableAtoms`'s atom-shaped findings (`holon.js:998` —
proof-seeking candidates, not a triple shape) but `relations.read(text)`'s
own real edges (`holon.js:1028`, hypergraph.js's SVO extraction run
against the model's OWN drafted text), specifically the ones that come
back `beyond-reach`/`unheard` for lack of any material to bind against —
exactly "the model asserted real structure and nothing was there to check
it against." Full detail, and the one question the note does NOT resolve
(how to decide `holds` vs `refused` per edge, and whether every such edge
should mint a claim or only some), is in that note.

**Files.** `capacity-runner.js` gained one function
(`landSelfAssertion`), no other production file touched.
`capacity-runner.test.mjs` gained 8 cases (55 → 63): three real verdict
landings each checked field-for-field against the pre-existing
`selfModelReading()` fixture, three typed refusals (`no_claim`,
`unknown_verdict`, `no_claim_id`), one true end-to-end case (a real
material hold plus a real `landSelfAssertion` hold on one log correctly
reaching `mergeTestimony`'s SINGLE, not AGREE, with no hand-built object
anywhere in the chain), and one non-interference case across two
claim_ids on a shared log. `crown.test.mjs`: 26/26 untouched — the whole
point of BUILD-4's own `who`-is-just-a-string design is that this half
needed no crown.js change at all. Full suite: 1086/1086 at this pass' own
start, 1099/1099 after, disclosed honestly rather than claimed as a clean
+13 — a concurrent session modified `serve.mjs` and added new `eval/`
files while this pass ran (caught live via `git status` between two full
runs), so +8 of that delta is this pass' own and the rest is unrelated,
unaudited, concurrent work. A `git stash` scoped to just this pass' two
files was tried first to measure the delta precisely and abandoned mid-way
when it proved the wrong tool: `capacity-runner.js` already carried
BUILD-4's own uncommitted `SELF_WITNESS` amendment before this pass began,
so stashing reverted to the last COMMIT rather than to "BUILD-4 before
this pass" — which broke `crown.test.mjs`'s import for the few seconds
between the stash and its immediate pop. Named here rather than smoothed
over.

## Belief-graph standing — conservative admission, revisable belief (added 2026-08-21)

POLICIES.md P40 is the law; this is the map. The user's own framing:
reading enriches through additional surfing, so admission stays
conservative rather than greedy — and the graph's belief is a belief, not
a verdict, so it must stay revisable as more is read. The flagship case:
what surfaced as a recurring name can turn out, on further reading, to be
a wire-service byline rather than a character, and the graph must be able
to say so rather than pretending its first read was final.

**A real bug, found while building this, kept here because the next pass
should not re-derive the lesson.** Every join in this mechanism is keyed
by a referent's own canonical face (`host/graph.js::referentFace`), never
by comparing strings — and getting that wrong is not hypothetical:
`host/terrains.js`'s co-arrival binding register was keyed by a
referent's opaque `r.id` while the SVO stated-relations path, three
lines above it, canonicalised to `r.display` — two disconnected nodes
for one referent, on every one of 7/7 witnessed pairs measured on real
Frankenstein prose. Fixed by keying both paths through `referentFace`,
the single face `admitGraph`'s own `canon()` already uses.

**Engine tier** (`packages/engine/emergence/graph.js`, eoreader6.1):
`nodeWeights` — a node's CURRENT (decayed) weight, closing the asymmetry
where `mentions` only ever grows while edges decay; `restandNode` — a
witnessed revision of what a node IS, modelled on the file's own
`injectPrior` (received, giver required, append-only, conservative on
agreement — restating the same standing is a no-op). Deliberately
vocabulary-agnostic: `standing` is whatever the caller declares, never
checked against a fixed list — importing `referents/index.js`'s
`INDIVIDUATION_TYPES` was considered and refused as the first-ever
`emergence/` → `referents/` coupling in this codebase, for a five-word
list this file has no business knowing the meaning of.

**`referents/entity.js` gained the symmetric door `offerCandidates` never
had.** `reviewEntities` re-runs the SAME Born gate against the grown
reading for every currently-admitted being; a being that no longer
clears LAPSES (removed, appended to a new append-only `lapsed` ledger
carrying the full gap object, never reduced to a bare tag). Fixed, in
the same pass, a real id-collision this addition would otherwise have
created: ids were built from `entities.size`, which can now fall on a
lapse — moved to a monotonic `bornCount`.

**Host tier** (`host/graph.js`, `host/terrains.js`): `castStandings`
reads the cast's own individuation verdicts (apparatus/emanon/protogon/
holon), omitting `null` (a decline, never overwriting an earlier
evidenced verdict); `reconcileGraphStandings` lands them through
`restandNode` and — measured live on this repo's own
`wire-quiet-subject.txt` fixture — DISCLOSES what it cannot land, rather
than silently dropping it: "Continental Newswire" types `apparatus`
correctly, but `extractRelations`'s own subject span ("Newswire" alone)
never matches the referent's registered surfaces, so no node exists at
its canonical face to restand. That miss is a real, separate, upstream
limitation (the relation extractor's own coverage — the same class of
gap P36/HL already name for pronoun subjects) and is named on
`unresolved`, never fuzzy-matched away. `host/terrains.js` also withholds
every cast-typed apparatus referent from co-arrival binding (a narrating
apparatus co-arrives with nearly everything by construction), with the
withholding itself a named Void entry.

**the-fold's own rendering:** a standing-carrying node draws with a
dashed pill and a small badge naming its current standing — the same
visual grammar the Entity view's `.ind` tag already uses, not a second
costume. The summary line counts re-typed and withheld nodes, the same
place binding's own counts already live.

Full evidence, every number, and the disclosed residues (the extractor's
own subject-span gap; node font size still keyed to lifetime mentions,
unchanged; `consequence.js`'s own causal identity layer left untouched
and un-composed with review) are in POLICIES.md P40.

## REC's recourse locality, measured (added 2026-08-21) — pointer only, nothing here changed

A borrowed-literature check (bounded-recourse online algorithms; see
eoreader6.1/CLAUDE.md's own section, same date, for the full account) asked
whether `loops/atmosphere.js`'s REC (re-zero) firing — the engine's one
place where "REC fires" is a literal, numeric, `tolerance`-triggered event
— actually re-touches only a small, bounded part of the material at each
firing, the way that literature's guarantees require. Checked against real
material at the real shipped parameters (`packages/host/terrains.js`'s
`ATMOSPHERE_REGIME`): it does not. A region routinely grows to cover nearly
all of a read before conceding (or never concedes at all — Heart of
Darkness re-zeroed zero times across the whole book), and amortized
recompute work per turn grows near-linearly with turns on both books
tested (r=0.987, r=0.998).

**Nothing in this repo changed.** `readAtmosphere`/`createRegimeTracker`
are consumed here (`source.js`, reusing `packages/host/terrains.js`'s
`ATMOSPHERE_REGIME`; `explore.js` renders `regime.rezeroCount`/
`clearingCount`/`regions.length`/`tolerance`) but the new fields this
measurement added (`stepsRead`, `recomputeWork`, `recomputeWorkPerStep` on
`readAtmosphere`; `recomputeWork`/`amortizedRecourse` getters on
`createRegimeTracker`) are purely additive and this repo's own consumers
read neither the old nor the new fields any differently — verified by
running the existing `source-atmosphere.test.mjs`/`eval/
atmosphere-chunking-eval.mjs` unchanged. Surfacing the new diagnostic in
Explore's own UI was considered and deliberately not done this pass: it
would be scope creep past what was asked (a literature check against the
engine mechanism, not a UI feature), and explore.js/app.js are shared,
multi-session-owned files per this document's own standing rule above —
not touched without a clear, asked-for reason to. The measurement, the new
fields, and the full disclosed finding (including the two distinct,
un-disentangled causes — trigger insensitivity vs. non-incremental
recompute — and the honestly-left-open recourse-vs-stability question) all
live in eoreader6.1 alone.

## The absence of a refusal is not a check (added 2026-08-25) — pointer

POLICIES.md P41 is the law; this is the short map. Found by reading an
existing eval driver's own printed output — `eval/reasoning-e2e-no-llm.mjs`,
the mechanical "how far without an LLM" driver — rather than by auditing
code.

**The one-line version.** `verification.js`'s Existence/Entity cell said
"subject and object both resolve to referents this material establishes"
on every claim whose hypergraph verdict was not `beyond-reach` — but
`beyond-reach` gates on the SUBJECT. It had checked one end and spoken for
two. This is the mirror of the grounding-ladder section's own
constitutional statement, one direction over: a cell may report what it
checked, or say it did not check; it may never report a check it never ran
as though it had.

**What shipped, all additive.** `hypergraph.js`'s `judge()` carries
`claim.endpoints = {subject, object}` (`referent` / `form` / `tokens` /
`none`), so no downstream reader infers an upstream finding from the shape
of its refusals. `verification.js`'s Entity reason is built from that;
the VERDICT is deliberately unchanged, because a legitimate DESCRIPTION
("the countess") lands in the same token-only bucket a genuine stranger
("Napoleon") does — pinned as a CONTROL case so the next pass does not
turn a disclosure into a conviction without measuring first.

**A second defect from the same driver, fixed at the source.** A shared
definite article was binding claims the material never made ("Seward
negotiated the Suez canal" → `bound`; the same claim without "the" →
`unbound`). `commonTerms`'s declared `CORPUS_MINIMUM` floor means the
function-word filter does not run at all on small material, and its
disclosed residue ("auxiliary noise in the vocabulary") only covers
WIDENING what the reader hears — on the object side it fabricates an edge.
`makeRelationReader` gained an optional `organs.determiners`, a received
closed class with its own giver (`priors.js`'s `DEFINITE_DETERMINERS` +
`INDEFINITE_DETERMINERS`, `lang/en`), never a word list typed here; opt-in,
byte-identical when omitted. Whether the live app should inject it is the
same open question already recorded for `verbForms` and
`createLemmatizer`, and it is not resolved here.

**One earlier claim corrected.** That driver's first results document said
negation-as-contradiction "lives only in `capacity-runner.js`, not in bare
`read()`". Measured across five constructions, wrong: `judge()` returns
`contradicted` through bare `read()` for "never" and "hardly". The real
limit is `relations.js::negationBeforeVerbFor` — the negation word must
sit BEFORE the verb; "not"/"didn't" are already in the engine's own
`NEGATION_WORDS`, so the shape fails, not the vocabulary.

## Two clocks, measured (added 2026-08-25) — pointer only, nothing rewired

P42 in POLICIES.md is the law (renumbered from P41 on merge — a concurrent
PR landed its own P41 first, above); the evidence lives in eoreader7 PR #22
(native/READING-SPEC.md S9–S15 and native/eval/results/ there). The one-line
version: the binding/present layer forgets exponentially at a window the
MATERIAL states (the writer's own accessibility curve — pronoun majority at
gap 1, names unglossed at gap 4,000; genre moves it: Austen tighter than
Shelley), and the retrieval layer forgets by POWER LAW (ACT-R, received
d = 0.5 — beats undecayed accumulation at paired z = 3.26, and the edge
vanishes under sentence shuffling, so it is the material's order being
read). Exponential decay at the retrieval layer is the measured way to
lose; so is typing either clock where a measurement is available.
`fold.js`'s RECENCY_WINDOW = 4 and `retrieve`'s activation-free ranking are
named in P42 as debts, not silently amended — wiring is its own pass.
Amended same day, by falsification: at entity level (who returns next
sentence) the law strengthened to +57% relative (z = 5.32); on real audio
at ~46ms the fixed d = 0.5 broke (persistence dominates; the
material-measured need-odds estimator adapted and beat it 2.8×) — so the
omnimodal mechanism is need-odds matching, the exponent is a text-scale
prior, and this repo's text-scale guidance stands as written.

## Polarity nothing read is never a verdict (added 2026-08-25) — pointer

POLICIES.md P43 is the law; this is the short map. The section above named
a post-verbal `bound` as a hazard and left it. Chasing it found something
worse: the extractor mis-parses THE MATERIAL the same way it mis-parses
the claim, so against a passage reading "Lincoln did **not** dismiss
Seward" the claim `"Lincoln did dismiss Seward"` came back **bound, cited
to that passage**. Not a missed contradiction — an inverted one wearing a
real address.

**The rule.** A claim or an edge whose OBJECT span is led by a received
negation word has a polarity nothing measured, so it decides nothing:
`beyond-reach` with a typed reason, claim side and material side alike.
Withheld, never flipped — this tier does not know what the reading should
have been. First token only (that is where the mis-parse puts it);
`every`, not `some`, on the edge side (a clean edge beside an unmeasurable
one still binds). Gated on `organs.negationWords`, the engine's own
`NEGATION_WORDS`, `lang/en`.

**And the open question, answered for two organs only.** Both received
classes this line of work added — `determiners` (P41) and `negationWords`
(P43) — are now INJECTED at `app.js`'s own `makeRelationReader` call site,
not left as organs nothing enables. The distinguishing test, which does
NOT generalise on its own to `verbForms`/`createLemmatizer`: **does the
prior close a false binding, or does it widen what the reader hears?** The
first is a correctness fix and ships on; the second stays a separate
decision. Honest cost, disclosed: a true-but-never-measured claim
(`"Lincoln did not dismiss Seward"`) loses its accidental `bound` too.
`"didn't"` still extracts no claim at all — silence, unfixed.

## The MHC battery — capacity scored against a received scale (added 2026-08-25)

POLICIES.md P44 is the law; this is the map. The ask: test this system's
capacity against Commons's Model of Hierarchical Complexity.

**The scale is received, and this repo already recorded the convergence.**
`eo-wiki/articles/wiki/mhc-and-eo.md` holds the sixteen orders and names
the MHC "an important convergent instance" — independently derived,
arriving at the same structural conclusion this project's grain axis does
(a higher order must be defined in terms of, and non-arbitrarily organize,
the one below). Nothing here invents an order or reorders the sequence;
`mhc.js`'s `GIVER` names Commons, Richards, and the wiki article the table
was reproduced from.

**Why the MHC earns its place rather than a home-grown scale.** Commons's
own complaint about predecessor stage theories is that they confounded
stimulus and response — scoring performances without independently
specifying the task's complexity. That is this repo's own line drawn from
the other direction (the cube is not a content classifier). The MHC adds
what a local scale could not: quantal scoring, and content-independence as
a property that can be TESTED by running one battery over two materials.

**The three axioms are control arms, not assertions** — see P44. The one
worth restating here is the consequence: **a refused item is a gap in the
battery, never a failure of the system.** `stageFrom` will not read a stage
across an unmeasured order and carries passes above the cap as `isolated`,
never summed in.

**READING-POLICY governs this more than anything in this repo does, and
reading it changed the design three times.** P0 ("any claim about what
this system can do must name the assembly") makes `assembly` a required
field on every item and on the report — and forces the honest statement
that this driver hand-chains organs, so it is an EXPERIMENT, not
`packages/host`'s assembled reader. P3 ("state which priors were
injected") caught a live false measurement: an early item scored the
system on folding "Abraham Lincoln" into "Lincoln", which P3 says outright
is measuring the missing coref prior, not the engine. A10 ("before
spending a null, check the pair is licensed — a statistic insensitive to
its perturbation fails invisibly and globally") is the rule every arm now
lives under, since every arm IS a null; it caught the order-12 arm
shuffling cells AFTER the organ had already gated them.

**Measured result** (amended 2026-08-25, below — the first cut read this
wrong). Orders 6, 8, 9, 11, 12, 13 pass on both materials; order 5 fails on
both; order 7 varies by material and order 10 lacks a probe in one. **The
scale held: zero orders changed their order-hood with the content.** No stage
is readable, because the floor failed and nothing above a failed floor sums.
Orders 0-4 are `out_of_scope_by_construction`: this instrument receives
symbols and has no sensor.

**Order 5's failure was a real finding about `discoverReferents`, and it is
CLOSED at the source** (second amendment in P44; the engine-side record is
eoreader7's READING-SPEC.md S17, PR #24). The strandings were greedy
first-match order-dependence; chasing them found a worse accretion
over-merge the battery had not reached. The fix: evidence-first assignment
order, membership against the group's maximal member, merges witnessed
downward by containment, and — the part the user's own correction
("coreference is a solved problem") re-aimed mid-fix — an ambiguous bare
form is a typed `ambiguous_surface` GAP with candidates, never a third
being: which being a MENTION names is the occurrence layer's solved
question (activation recall), and the type level does not absorb it.
After: recall 24/24 and 12/12, precision unchanged, order 5 passes on both
materials, and a stage is readable for the first time — War and Peace at
9 (capped by a missing probe), Borodino at 6 (capped by the real order-7
pronoun ceiling).

**Four wrong versions of that item, all the same error, kept so it is not
re-made** (full list in P44): the probe repeatedly asked a question a
lower-purpose organ could not answer and then scored the reading for the
probe's own error — including reading the coref regimes off `cast.js`'s
`minSentences: 0` PRESENCE index, which is this repo's own P38 walked into
by a new driver against the very organ P38 was written about.

**Files.** `mhc.js` (pure, no engine import — items supply their own
async task and arms) + `mhc.test.mjs` (31 cases, organ-free on purpose so
the walls stay testable wherever this repo is checked out; the full suite
went 687/574/113 → 718/605/113, the same 113 pre-existing sibling-engine
path failures, zero regressions). `eval/mhc-battery.mjs` + `eval/results/
mhc-RESULTS.md` + `mhc-battery.json` — a re-runnable driver, P19/P27's own
posture, over two real Wikipedia fixtures this repo already ships.

**Amended same day — order 13 trusted rather than disclosed, and a
conceptual bug in this battery's own content-independence check.** Order 13
was the ladder's shakiest rung: it refused on one material and passed on the
other, and the difference was luck. Diagnosed rather than patched — it was
A10 again, one level deeper. The arbitrary arm mixed in whichever second
claim came to hand; on War and Peace that claim (`content -from-> Wikipedia`)
contributed ONLY `undetermined` readings, which `mergeTestimony` genuinely
does not read, so the mix could not change the merge and the arm reported the
coordination arbitrary while testing nothing (fired 20 of 20 there, 0 of 20
on Borodino, on that difference alone).

Rebuilt around what is actually metasystematic: a claim's **standing across
witnesses** — corroborated, or a lone voice — is a property of the SET that no
member carries. Two real claims are now selected BY MEASUREMENT against a
fixed sample of ten source-systems: one the sample corroborates (>=2 bind) and
one it does not (exactly 1 binds). The task requires the merge to type them
`AGREE`/`corroborated` and `SINGLE`/`single`, AND — the non-circular part —
that below the merge the two are INDISTINGUISHABLE: each has a system saying
exactly `holds`, the same word, carrying no standing of its own. Every arm is
now licensed by construction: `lowerOrder` only if the two merges genuinely
differ, `arbitrary` only if the mixed set's hold/refused counts differ from
the clean one, `discrimination` only if the reversed claim really draws fewer
holds. Passes on both materials, all three arms licensed and failing as they
must.

**The conceptual bug that fix surfaced.** `contentIndependence` compared raw
per-order verdicts and reported every difference under one heading — "these
items are reading content, not structure." For a passed-here/failed-there
difference that is simply FALSE. The MHC's content-independence is a claim
about the SCALE (a task's order does not depend on what it is about); it is
emphatically not a claim that a performer succeeds equally across domains —
separating task from performance is precisely what makes a per-domain
difference ordinary. Three outcomes are now kept apart: a **violation** (valid
on one material, MIS-DECLARED on another — the real thing the scale forbids),
a **performance** difference (valid both times, completed once), and **no
probe** (the material offers no specimen). Reading only the collapsed
order-level status is how the first version could not see a violation at all,
so `byOrder` now carries `refusedCount` and `unmeasuredCount` apart.

Under the corrected reading: **held: true, zero violations**, seven orders
agreeing outright, one performance difference (order 7, pronoun binding — real
bindings on War and Peace, all `pronoun_no_margin` on Borodino, whose prose is
dominated by collectives), one missing probe (order 10 on War and Peace, which
offers no subject+verb slot with two distinct fillers in its declared slice).
Suite 718/605/113 -> 721/608/113, the same 113 pre-existing failures.

**Disclosed, not silently absent.** The battery resolves the engine across
two known layouts (`eoreader6.1/packages/engine/perceiver/text`,
`eoreader7/native/adapters/text`) and DECLARES which it found, because a
hardcoded path would report "organ unreachable" as a statement about the
system when it is a statement about a path — this checkout has only the
second. Orders 14-16 carry one item (order 14, paradigmatic) whose task is
a search for an organ that coordinates two metasystematic results into a
third framework; it fails, naming what was searched. Order 13's arbitrary arm
perturbs claim-GROUPING rather than source identity, because
`mergeTestimony`'s verdict is invariant to WHO said what by construction —
shuffling source labels would be A10's trap exactly.

## Measured memory, wired (added 2026-08-26) — pointer

POLICIES.md P45 is the law; this is the short map. `wiring-the-measured-
memory-v2` (the spec) named six increments; this pass landed A, B, C, D, F1
and explicitly deferred E/F2 (named, not silently skipped — E's own
un-defer condition, a measured promotion rate from D, is unmet until D has
run against real conversations).

**The one-line version.** `fold.js`'s record/fold STORE was being
truncated at `RECORDS_IN_PROMPT`/`MAX_FOLDS_IN_PROMPT` on every append —
retroactive forgetting of the one tier (System 2, the addressed record)
READING-POLICY P1 says does not decay. The store is unbounded now; only
the PROJECTION (what a prompt actually shows) is still bounded, exactly as
before by default (`projectRecords`/`projectFolds`, new, shared by every
existing caller). `retrieval.js` (new) is P1's still-missing third clause,
"recall is retrieval": eoreader7's real `native/memory/activation.js`
(Hebbian cue, one-hop completion, reused unmodified) generates which
dormant records are POSSIBLE, ACT-R base-level (d=0.5, received) or this
conversation's own measured need-odds ranks them by PROBABILITY, never
blended. `consequence.js` (new) is the promotion gate — recurrence AND a
measured consequence, reusing this repo's OWN already-built
`ground-ledger.js` prequential firewall rather than re-deriving one, via a
task-log adapter reconciling eoreader6.1's shape (`GRAIN_RANK`) with
eoreader7's real one (ordinal `GRAINS`).

**Genuinely tested, not environment-gapped.** Every new test imports
eoreader7's real `native/` modules by relative path
(`../eoreader7/native/...`) — a real sibling in this environment, unlike
`../eoreader6.1/`, which is not — so all 32 new tests actually run and
pass, including a real bug caught and fixed by running against the real
organ (need-odds tallies were being trained on a record's own BIRTH, a
false "never needed again" signal from ordinary conversational growth
alone; fixed to train only on genuine re-use). Full suite 722/608/114 →
754/640/114, the same 114 pre-existing environment failures, zero
regressions. Not wired live into app.js's browser runtime this pass
(needs a new `/native` server mount, a `page-graph.mjs` update, a
`constitution.test.mjs` II.13 allowance) — disclosed, not implied done;
`eoreader-contract.json`'s new `testTimeConsumers` section names exactly
this boundary.

## The material's own declared identity (added 2026-08-26) — pointer

POLICIES.md P46 is the law; this is the short map. Chasing "does local-model
chat feel like Claude" surfaced a real, live, repeatable bug: S1 guessed the
wrong book and author for Pierre Bezukhov, and S2's own checking pipeline —
which correctly flags the fabricated names when tested directly — still
shipped it, because the correction budget is spent per failure mode and the
mechanical fallback only rescues echo/reproduction/narration, never a plain
survived-`unsupported` draft (a real, disclosed gap in `holon.js`'s
correction loop, named here but NOT fixed this pass).

**The actual fix closes it a level earlier.** `source.js::declaredIdentity`
reads Project Gutenberg's own `Title:`/`Author:` header — real bytes,
already in the file, addressed to their own span — and `buildSourceBlock`
surfaces it labeled as the source's own claim. The model no longer has to
guess what book this is. Verified against the real pipeline twice, two
different random S1 hallucinations, both times fixed by S2. A first reach
for "load a hyperlexicon for Wikipedia" was checked and refused on the
merits — `hyperlexicon.js` is the P57 ASSERTION ledger, not a lexical
source. (Corrected 2026-09-01: this sentence used to call it "the HL
relation-composition ledger (P37)", conflating three different modules
that share the name. See the hyperlexicon-names note below.) — and the user's own redirect is the standing rule for
whatever reaches for Wikipedia next: **the model should never have anything
without provenance.** A live Wikipedia fetch would need the SAME real
provenance chain the web organ (P13) and witness/proof-seeking tiers
(P32) already carry — reusing those, not a new mechanism, is the named,
unattempted next step.

**`CHAT-POLICIES.md`** (new, repo root) is where the chat-specific slice of
this document and POLICIES.md was pulled together into one reference —
what a turn needs (the S1/S2 shape, bounded context, the grounding ladder,
the correction loop and its one disclosed hole, provenance as the
governing rule) plus everything this pass measured live (real per-turn
timing, the concurrency-confound and chatHistory-windowing lessons for
any future probe, the Pierre Bezukhov specimen in full, the hyperlexicon
red herring). Summarizes and points at the fuller policy entries rather
than duplicating them — read it first before touching chat behavior,
POLICIES.md for the full detail behind any one claim in it. It is a
standing document: a future pass that changes chat behavior appends its
own findings and decisions to it (its own header states the rule —
amendments append, they do not rewrite, POLICIES.md's own discipline),
not a one-time report to be left stale.

## crown.js's disclosed TOKEN_RE gap, closed (added 2026-08-20)

POLICIES.md's third same-day amendment to P39 is the law; this is the
pointer. `TOKEN_RE`'s own header (crown.js) disclosed, in writing, a scope
boundary it had not yet been tested against: a witness/source name
containing a period would fragment the same way "self:model" once did
before the colon fix. `eval/material-dialogue-stress.mjs` hit it for
real, against a source named "titanic-a.txt" (an ordinary filename) —
renderCrown rendered "According to titanic-a. txt, ...".

Closed with a lookahead, not a bare widening: `\.(?=[A-Za-z0-9])`. A bare
widening (period added to the continuation class exactly the way colon
was) would have been unsafe in a way colon never was —
`KNOWN_CONNECTIVES.period` is used, throughout every render function in
this file, as a token deliberately glued flush against whatever word ends
a sentence, so a bare widening would swallow that connective period into
the preceding word on nearly every render. The lookahead tells the two
cases apart: a period followed by another word character glues
("titanic-a.txt"); a period followed by anything else — a space, the end
of the string, another connective — stays its own token, including when a
period-bearing witness name sits directly against the sentence's own
closing period with no comma between them (DISAGREE's one-witness-per-side
shape). `crown.test.mjs` gained 4 cases, two real end-to-end (SINGLE and
DISAGREE) using `"lincoln.txt"`/`"lincolnNeg.txt"` — already-proven ground
names from `capacity-runner.test.mjs`, pushed through `crown.js`'s own
render for the first time. Full suite: 1104/1104, zero regressions.

## eoreader7 scoping for the reading-workbench spec (added 2026-08-25)

POLICIES.md P47 is the law; this is the pointer. **Increment A ("extend the
contract") needed no work — `eoreader-contract.json` and
`eoreader-contract.test.mjs` already existed on `main`**, built by a
concurrent session and more thorough than the version this branch wrote
before fetching (P47 carries the retraction and what the skipped
`git fetch` cost). Read the contract itself for what the runtime consumes;
its own rule is that an entry is promoted only when a PRODUCTION file, not
a test, imports it live.

What IS new here: `READING-WORKBENCH-ENGINE-PLAN.md` (repo root), the
scoping of the five kernel organs the spec's increments D-F name, and two
corrections worth not re-deriving — eoreader7 is real and lives at
`clovenbradshaw-ctrl/eoreader7` (an earlier same-day pass searched local
disk only and wrongly concluded it did not exist), and
`deriveIdentityRevision` DOES carry the positional semantics Increment D's
margin needs, via each REC's `sourceEdge` address rather than a coordinate
field. `understanding-scoreboard.mjs` computes reach from it and reproduces
the spec's own cited numbers (median 749, min 82, max 2,046) on real
Frankenstein.

## Increment B landed; Increment C blocked on a real fork, not a guess (added 2026-08-26)

POLICIES.md P48 is the law; this is the pointer. The Reading tab (was
"Sources") fronts by default at wide viewport now — `app.js`'s
`showView(...)` default changed from `"builds"` to `"explore"`, and
`README.md`/`package.json`'s one-line pitch changed from the bounded
context window to the reading. Verified live: pane toggling still works
both directions, zero console errors, full suite 1131/1131.

Increment C (the three-question GIVEN/READ/HELD header) is NOT started.
Scoping it found that this repo now runs two divergent source browsers —
the native `pane-explore` panel embedded in this page today, and the
older standalone `explore.html`/`explore.js` app on `explore-server.mjs`
(still running, still has the real priors/cast/graph views, no longer
embedded anywhere). GIVEN and HELD's natural navigation destinations live
only in the app this repo moved away from. Real product decision, not a
wiring job — see P41 for the full finding.

## Increment C (the three-question header) — built, then REMOVED (2026-08-26)

POLICIES.md P49 is the law and carries the full account. `.ghr-bar`
(GIVEN/READ/HELD) shipped as a persistent bar under the header, each
region a navigation destination, and was **removed the same day at the
user's direction** — the product judgment was that the app does not need
it. Do not rebuild it from the reading-workbench spec without asking:
the spec still names it as Increment C, and the spec is not the authority
on whether it belongs.

What SURVIVES the removal and is still live: the Priors sub-view in the
Reading pane (`#explore-subnav`'s third segment, reading `/api/priors`),
and the Reading tab itself (Increment B). What went with it:
`given-read-held.js` + its test, `state.priorsData`, the boot-time priors
fetch, and `--header-h`'s multi-row sum (back to header-only, since
nothing sits between `<header>` and `<main>` again).

## Reading: a bracketed aside hid the subject (added 2026-08-26)

POLICIES.md **P50** is the law; this is the map. Three sites tested the
same punctuation crossing independently — `surfaces.js`'s run-break marks,
`relations.js`'s scan for the token after a surface, and `relations.js`'s
subject→verb matcher — and each allowed only whitespace where a
parenthetical aside can stand. So the one sentence that states the fact
plainly ("Hannibal Hamlin (August 27, 1809 – July 4, 1891) was … the 15th
vice president") yielded no edge naming Hamlin at all, and a question with
two right answers returned one for a whole day.

The rule is Unicode's own category (`\p{Ps}`/`\p{Pe}`), never an
enumeration — the generalization `surfaces.js`'s own pipe fix already
asked for. Brackets need two sides where a comma needs one: a comma trails
the token before it, an opening bracket leads the token after it.

**Three things worth carrying to the next reading bug:**
1. A fix that moves an intermediate number without moving the result means
   there are MORE SITES, not that you half-won.
2. A punctuation decision is a class; name the category, not the characters.
3. **A reading failure wears the model's face.** Before blaming the model,
   the prompt, retrieval, or the logic, take one sentence that states the
   answer plainly and confirm the pipeline can extract it.

The engine edits live in the `eoreader7` submodule (`legacy-eoreader6.1`),
not in this repo — see P50 for what changed and what is still open (filler
selection at page scale still returns "Though he" and "22nd Amendment").

## math.js audit: a forgeable certification, and a refusal that was wider than its own reason (added 2026-08-26)

POLICIES.md **P51** and **P52** are the law; this is the map. The ask was
to get `arithmetic.js` (mathjs) fully working; static wiring already
looked complete (imported, `arithmeticTurn` called from `send()`'s
dispatcher, index.html's script-order gotcha still correct) and the fast
path — "17 times 24" → `408`, no model call, `window.math` verified
loaded — worked exactly as documented on first live test. Pushing past
"it's wired" into "does the whole feature actually hold up" found two
real defects, neither visible from reading `arithmetic.js` alone.

**P51 — the caption was forgeable.** `state.history` is replayed to the
model verbatim as its own past turns; `arithmeticTurn` pushed its full
"`17 * 24 = 408 — computed, not generated`" into it, so a LATER question
that correctly bypassed the fast path (order-reversing phrasing) came back
from the model captioned "computed, not generated" on prose it had
generated itself — the exact house mark this app uses in four places to
mean "code produced this, not language" was, ONE conversation later,
free for a small model to imitate. `stripComputedCaption` closes it at
`usageTurn` and `arithmeticTurn`'s two `state.history` pushes; the caption
still renders everywhere a human looks.

**P52 — the refusal covered four phrasings, three of which have one
reading.** `arithmetic.js` bailed on ALL order-reversing English ("N
subtracted from M" / "N less than M" / "N fewer than M" / "N divided into
M") on one shared worry. Checked one phrase at a time: three have exactly
one standard reading and now compute (`((12)-(5)) = 7`, instant, no model
call); "divided into" genuinely splits between two live conventions (the
long-division idiom vs. a colloquial one with the operands swapped) and
still bails, on its own, narrower reason. The obvious hazard — hijacking
a real comparison question ("Is 3 less than 10?") into the arithmetic
reading — is caught by a guard that was already in the module
(`WRAPPER_RE` never stripped a bare "Is", so the leftover word fails
`PURE_EXPRESSION_RE` regardless), checked and pinned rather than assumed.

Both verified live against the real running page, not only in
`arithmetic.test.mjs` (14 → 18 cases): three consecutive turns in one
conversation — a correct instant computation, a second correct instant
computation, then "divided into" falling through to a real grounded
answer with no trace of the caption anywhere. Full suite 1264/1266 before
and after, same 2 pre-existing failures, neither importing
`arithmetic.js` or `app.js`.

## The void loop — answering as DEF/EVA/REC (added 2026-08-27)

P53 in POLICIES.md is the law; this is the map. User direction, verbatim:
*"answering all questions starts with defining the VOID that needs to be
filled with a DEF, EVA, REC loop"*, then *"and the stance face?"*, then
*"test e2e … asking the VP question and similar ones where the findings
should reshape the void."*

**Both halves already existed and could not reach each other.**
`void-shape.js` declares a space across all nine operators and does the
coverage arithmetic; `grid.js` lands DEF/EVA/REC on an append-only log
with every refusal the composition law names. But `declareVoid`'s ONLY
caller (`void-brief.js`) built its declaration at `app.js:3753` — **after
`renderAnswer` had already run**, in a try/catch so it could not break the
turn — and discarded it; and grid.js's acts were reachable only by a
person typing `/act`. `void-loop.js` is the loop, and deliberately the
only new thing: no second log, no second algebra, no second coverage test.

**The choreography is read off the void's own cells, never chosen here.**
DEF = `Differentiate·Figure` at Lens (**Dissecting**), EVA =
`Relate·Figure` at Lens (**Binding**), REC = `Generate·Pattern` at
Paradigm (**Composing**) — cut the candidates out, bind each to the
ground, compose a new ground when the binding fails. Two things fell out
of that table rather than being designed in: **DEF is the only Dissecting
cell in the whole declaration** (cardinality is the single cut, and
exactly the cell whose absence produced the two-filler-slot-read-as-one
specimen), and **DEF and EVA share a terrain and differ only in stance**
(you cut with the lens, then bind with it — which is why they are a loop).

**Two stance faces, and they must not be merged.** The DERIVED stance
(`STANCE_BY_MODE`) is a property of a cell, computed, cannot be wrong. The
DECLARED stance (`from <stance>`) is the actor's posture, refusable three
ways. `grid.js` refuses to import the engine's labels because a grid act
is medium-blind; a void declaration is domain-locked by construction
(`cellOf` uses the operator's own domain) so its stances are legitimately
meaningful. Same word, two standings — harmonizing them breaks one.

**The ladder and the loop's own law.** `extraction` → `cultivation` →
`encounter`, descended only on exhaustion (`skills.js`'s ladder, stances
in place of tiers). Witness says WHO, stance says HOW, and both ride every
candidate. `grid.js` pins one stance illegality (`synthesize` may not
declare `from relate`); **this module generalizes it and owns the
generalization** — the loop may not close from the posture that proposed
its fillers, or the EVA between was ceremony. DEF **fans out** (an array,
all landed before any EVA): propose-one-test-it-propose-the-next is a
greedy search, and a greedy search over two true fillers returns whichever
it drew first, which is the specimen.

**REC has two triggers, and grid.js already had both paths.** A spent
posture → `concedeEvaluation` (EVIDENCE·REC, no supersedes). A wrong
DECLARATION → `revise … supersedes <opening>` (SUPERSEDE — the act that
zeroed the space is superseded, because the space was wrong). Reshaping
resets the ladder, carries testimony across, and returns
extensionally-refused candidates to `wish` — their refusal rested on the
extent just conceded.

**Three walls found by testing, not by reasoning** (full text in P53): the
blanket `under-specified` refusal was a wall nothing useful could pass and
made the cardinality close unreachable — **the third time this repo has
caught that shape**, now graded to `no_slot` / `no_anchor` /
`no_closing_condition` with the rest disclosed; a trigger this module
GENERATES has to be carriable by the act line this module COMPOSES, so
generated details quote with `« »` (crown.js's own mark) since the
composition law has no escape syntax; and `extent_excludes` — a space
refusing every candidate that could fill it while reporting itself short —
which only appeared by running the loop on real bytes.

**Evidence.** `eval/void-loop-e2e.mjs` over live Wikipedia. 28 junk
candidates from a deliberately crude generator, **zero reached
testimony**; a candidate stating the relation with no span correctly
stayed a *wish* rather than being convicted; FDR reshaped its own space
(`1933-1937` → `1933-1945`), re-admitted the re-opened filler, descended
twice, and then **refused to commit** — "Henry Wallace" alone is a true
sentence and a wrong answer.

**Two limits, disclosed rather than engineered around.** The loop is
exactly as good as the space it was given: Lincoln committed
`Hannibal Hamlin (1861-1865)` as complete, which is right against the
declared space and not the whole answer, because a **year-grain extent
cannot see a hole inside one year** and Johnson held the office six weeks
inside 1865 — the defect is SEG's own cell ("the extent to be covered,
**and its units**"). And the generator's own failure is a coreference
failure: `Garner` near the relation is invisible to a two-word capitalised
scan, exactly the class `cast.js`'s referent index (P38) exists for and
which the crude control deliberately does not use.

**Not wired into a live turn**, and named rather than implied: `app.js`
still builds its brief after the answer and throws it away. Moving
`briefFor` ahead of retrieval and running the loop AS the turn is the next
pass — `app.js` is the fold-architecture session's contract and this pass
does not reach into it.

**Files.** `void-loop.js` (pure; only `./void-shape.js` imported, `grid`
and the admission organ injected — the cast.js discipline) +
`void-loop.test.mjs` (36 cases against the REAL cube, grid and
void-shape). `eval/void-loop-e2e.mjs` + `eval/results/
void-loop-e2e-RESULTS.md` + its transcript. No existing file touched.
Suite 805/687/118 → 841/723/118, failure names diffed rather than counted:
zero regressions. The 118 are pre-existing and environmental —
`legacy-eoreader6.1` is an uninitialised submodule here, so `grid.test.mjs`
among others cannot resolve; `void-loop.test.mjs` imports eoreader7's
**native** kernel instead, as `void-shape.test.mjs` already does.

### Amended 2026-08-27 — a model reads, the material checks, HL judges

P53's amendment in POLICIES.md is the law; this is the map. Two
directions, in order: *"use the full power of the hyperlexicon"*, then —
watching the driver grow one admission rule per specimen that broke — *"a
small model call because we can never define every little case like
«abbreviation gate»"*.

**Why it changed.** Admitting by rule grew four rules in one afternoon on
one specimen family, each right for its own case and wrong for the next:
the relation stated as "running mate"; a span beside the relation that
belongs to a DIFFERENT office; a candidate whose kind is a faction; a
sentence boundary inside "Franklin D.". The split: **reading** is a
model's (the half that cannot be enumerated), **judging** is HL's and
never a model's, and between them **the material checks the model** — a
reader returns EDGES WITH PROVENANCE, never a verdict.

**`void-hl.js`** (new, pure) is the bridge: `stageFromReadings` +
`admissionOf`, with the HL→admission mapping stated line by line
(CONTESTED maps to `null`, not `refused` — FDE's "both" is an unsettled
question, and convicting on it is the accusation-with-no-evidence the
grounding ladder already forbids).

**What HL bought.** Calvin Coolidge passes every surface test that can be
written and is not Roosevelt's vice president. HL excludes him by one
declared rule with a named giver, and `void-hl.test.mjs` pins the
mechanism: with the declaration `contradicted`, without it — byte-identical
stage — `unbound`. **An undeclared rule convicts nobody.**

**R2's precondition, named because nothing named it:** a functional
relation makes anchor identity load-bearing. An earlier draft claimed a
reader's blind spot always degrades to a gap; the real engine refuted it —
«FDR» against «Franklin D. Roosevelt» is not silence, R2 reads it as bound
to a different object and REFUSES a true candidate. Corrected, pinned, and
`anchorIdentity` is now reported. The fix is injecting real referent
identity (`cast.js::makeReferentIndex`), not more rules.

**The question's own singular is a functional declaration.** "Who WAS
Lincoln's vice president?" asserts `functional(hasVicePresident)`; HL
returns CONTESTED — presupposition failure. The honest answer is *the
question presumed one and the material has two*.

**The reader is a real local model on CPU** (`onnx-community/
Qwen2.5-0.5B-Instruct`, q4, `@huggingface/transformers`, in-process, ~27s
load / ~6s per read). The prompt is **measured, not drafted** — 0/4 with
angle-bracket placeholders, 2/4 with concrete worked examples, 3/4 with a
distinctness rule, **4/4 once INS was asked as INDIVIDUATION rather than
kind**. "Is a War Democrat a person" is honestly yes; the slot admits ONE
NAMED INDIVIDUAL, not a kind of person.

**Two checks on the model, both P31's company law:** the model's span is
kept only where the source states it with the relation (Johnson's
presidency span DROPPED — which is what makes him correctly
admitted-but-unplaced), and the relation itself is corroborated the same
way (the model claimed Hoover against a page that never states it).

**Two bugs the run found:** `Number(null)` is `0` and `Number.isFinite(0)`
is `true`, so a null year became year zero and would have corrupted the
coverage arithmetic; and **evaluated-and-inconclusive is not unevaluated**
— both landed on `wish`, so one junk candidate nothing could settle pinned
the ladder forever. Only wiring HL surfaced it, because `unbound` is the
correct and common answer for a source that says nothing.

**Baseline moved honestly.** This checkout had NO `node_modules` (the
original 118 failures); installing the reader let three test files load
that previously could not. 805/687/118 → 912/793/119: 60 new passing cases
of this pass's own, three file-level failures replaced by four real
environmental ones inside them, zero regressions, failure names diffed
rather than counted.

### Amended again 2026-08-27 — a gap the loop can name is a question it can ask

P53's second amendment in POLICIES.md is the law; this is the map. User
direction: *"it should also research Johnson to understand it, it needs to
be curious."*

**The defect.** The loop was honest and INCURIOUS: it admitted Johnson,
could not place him, reported `unplaced` and stopped. But the gap it filed
is specific — "I hold a filler and the source I read never says when" — and
a gap that specific is a question.

**`whatWouldSettle(loop)`** (pure, fetches nothing) turns loop state into
the questions that would settle it, ordered by what settles fastest:
placing a filler already in hand before searching for a new one, because it
is one targeted read against a source already identified. `openQuestions`
is taken by `fold.js` for a different question, so this gets its own name.
Acting on the questions is the caller's, exactly as reading is — **the loop
knows what it needs to know; it does not know how to find out.**

**`placeFiller`** folds an answer back in and REFUSES a span the extent
cannot contain: **widening an extent is a deliberate act with its own REC,
never a side effect of answering a question.**

**Measured live: the reader failed and the wall held.** The answer is
genuinely there — Johnson's SUMMARY has no VP span, his FULL page does
("…what happened on March 4, 1865"; "sworn in alongside Hamlin, his
predecessor as vice president"). The 0.5B reader answered `1808-1860` — his
birth year, genuinely present in the bytes shown, so the shown-bytes check
passed — and `placeFiller` refused it on the extent. A wrong read did not
corrupt the space, did not widen the extent, and did not produce a
confident answer. That refusal is worth more than the reader being right,
because it holds for readers wrong in ways nobody anticipated.

**Named, not fixed:** window SELECTION. The window is the relation's
sentences in DOCUMENT ORDER, and on a 90KB biography its first 1,400
characters are early life and other people's vice presidencies. Ranking by
sentences naming both candidate and anchor is the next move, unmeasured.

**One more bug, caught by the test:** `fill` is append-only by design, so
placing a filler on top of its own spanless entry left BOTH and `voidsOf`
would report it unplaced forever. `placeFiller` rebuilds the space, the
same rebuild `reshape` already does.
## The void, said out loud (added 2026-08-27) — what was decided, so it is not re-derived

POLICIES.md **P54** is the law; this is the map. User direction, verbatim:
*"hide the 'grounding' badges for now, and i want the 'thinking' reasoning
to show in real time its work figuring out the shape of an answer that would
satisfy."* One request, not two — the apparatus keeps RUNNING while it stops
being PAINTED over the answer.

**The defect.** `void-brief.js`'s declaration ran ONCE, after
`runHolonicTask` returned and after `renderAnswer` had already painted, into
a collapsed panel. So the one thing the void exists to establish — what
would COUNT as a satisfying answer, decided before the answer exists — was
the one thing a reader could never watch happen. It could not have narrated
if it wanted to: the ticker was cleared and the live log element destroyed
by `renderAnswer`'s own `body.textContent = ""` before it ran.

**Three moments, one `voidBriefFor`** (app.js), so they cannot drift into
three declarations: from the question alone before any model call; from
`live` — the same array handed to `runHolonicTask` on the next line — still
before the model drafts; and from the UNION of everything the turn held.
`void-narration.js` is pure and narration-only, and `standingLine` carries
`voidsOf`'s own `reason` VERBATIM: paraphrase is how a narrator comes to
disagree with the arithmetic it reports. The delta rule drops any step whose
line is unchanged — a second identical sentence is repetition, not learning.

**Three bugs, all found by RUNNING it.** (1) The anchor fallback was the
possessive TOKEN (`lincoln's`), so `extentFor` searched for a form real
prose rarely uses and the space read `unbounded` however good the material
was — **a wrong anchor disables the measurement, it does not merely mislabel
it**; `possessorIn` fixes it, and the signal is the possessive `'s` (a
received marker), never the capitalisation, which only decides how far left
the name runs. (2) Moment 3 declared over RETRIEVED passages alone and so
clobbered moment 2's better read with a weaker one (extent `2×` → `1×`, live
measurement) — the void is a claim about the QUESTION's space, not about
which passages the model was shown, so it declares over the union. (3)
`#marks-toggle` set `state.grounded` AND `body.marks-off` in lockstep, so
`marks-off` could never hide anything on a newly rendered turn and
*checked-but-unpainted* was unreachable; the control now owns only the mode.

**The CSS rule worth keeping: every `marks-off` rule is scoped to
`.msg .body`.** `.turn-meta` is a SIBLING of `.body`, so scoping puts the
drawer out of reach by construction — that IS "hidden drawing, never a
hidden finding" written in CSS. Two rules had been unscoped and were hiding
findings in the drawer they were never meant to reach.

**Deliberately NOT done, with the measurement that decided it.** Feeding
`voidLine` to the model — which its own docstring says it exists for — would
make the answer WORSE today: the void reports `nothing named yet`, so its
line ends "Do not fill this gap from memory — say it is open," which would
suppress the one true filler the model does read. **A void whose filler side
is blind turns an incomplete answer into a refusal.** Gated on the filler
side, not on appetite. And the filler side was re-measured on the three real
pages this session fetched: the live relation reader's open subject slot
returns `Though he`, `Congress`, `as`, `After` as candidate vice presidents
— the same ceiling `void-brief.js`'s header and MINE-1 already record, on a
third independent specimen. Chasing fillers through the clause extractor is
a closed road.

**What IS established** — and it answers the standing open question, *"i
can't tell if we created a good void to EVA against"*: measured live before
the model drafted, NUL/SIG/SEG/DEF all declared correctly (`vice president
of Abraham Lincoln`, `Abraham Lincoln`, `1861-1865`, `unknown`), five holes
named rather than defaulted, and the standing *"1861-1865 is filled by
nothing named so far."* The answer that turn still said "There is no mention
of anything else beyond this" — the instrument measured the incompleteness
the model asserted away, and that disagreement is now visible in real time
instead of buried in a receipt.

## The firewall, and identity from a giver (added 2026-08-27) — what was decided, so it is not re-derived

POLICIES.md **P55** and **P56** are the law; this is the map. P56 is
deliberately written over PARTLY-BUILT work, at the user's own direction
("its the right shape even if we haven't gotten 100% of the way there yet") —
read it for which parts ship today and which are named absences.

**P55, the one-line version.** Apparatus vocabulary is not model-facing. The
live app answered *"The prompt specifically identifies Hannibal Hamlin…"*
because `EXECUTE_SYSTEM_PROMPT` contained the literal phrase "the prompt"
twice, `FLAT_EXECUTE_SYSTEM_PROMPT` named "the passages" three times (twice
while forbidding the model to mention them), and `buildFactBlock` carried
"(7 of 97 sentence(s) with an extractable relation…)" into a 2B model's
context. That is L5, not style: every one of those strings also INSTRUCTED
the model not to do it. `firewall.js`'s `APPARATUS_TERMS` +
`assertModelFacing` is enforced by `firewall.test.mjs` against the REAL
exported prompt constants and the REAL `buildFactBlock` output, so a future
prompt that explains the machinery fails the suite. Counts moved to fields
for the thinking panel — moving bookkeeping is not deleting it, pinned both
ways. The void kept its force (the "William R. Hargis" case).

**P56, the one-line version.** A tier that reads SLOT cannot answer a
question about IDENTITY. Measured: 2,298 SVO edges over three real pages, 13
mentioning a vice presidency, and the slot query returns ONE endpoint whose
surfaces are "it failed", "Trefousse believes", "Another factor". The label
slot is filled by non-verbs (`—the→`, `—and→`, `—biographer→`, `—vice→`) —
and eoreader7's kernel already conceded the general point: *"AN ARRANGEMENT
HAS ENDS, NOT PARTS OF SPEECH."*

**What ships:** `wikidata.js` (pure, 11 tests, real captured fixtures) —
Hamlin `Q273546` and Johnson `Q8612` are both `P31=Q5` human, both hold
`P39=Q11699`, with real term qualifiers, and **the chain closes mutually by
qid**, closing `chains.test.mjs`'s own disclosed substring-matching weakness
("the real fix is a referent index" — this is it). Its dates independently
match `succession.js`'s infobox reader: two givers agreeing. Every hypergraph
edge now carries `spans` — **2,584/2,584 self-verified** against real bytes
(P5.2 applied to the one tier that was exempt), and per-sentence extraction
killed 48 cross-boundary garbage edges (literal `\n\n` in the subject) while
gaining 23 real ones.

**Two refusals worth not re-deriving:** Wikipedia's short `description` is
NOT an entity type (it calls Andrew Johnson "President of the United States",
the same conflation the model made). A part of speech is a CANDIDATE SET, not
a per-occurrence verdict — `and` really does have a Verb sense, so it can
never be refused on type; `the`/`biographer`/`vice_president` have none, so
refusing those as labels is sound. Asymmetric use only.

**Named absences, so nobody reports them as done:** `resolvePronounSubjects`
still rewrites text instead of holding an `{occurrence → referent}` binding
beside immutable edges (the shape is `relation-composition.js`'s
`endpointOf`/`rememberBinding`/`activate(edge,{replace:true})`, with
`identity.js::deriveIdentityRevision` as the revision grammar; hazard:
`EOPronounBinding@1` is consumed in three kernel files and produced nowhere).
`primary.js`'s citation walk is BUILT and ROUTED and UNWIRED — driven live it
pulls 95 real off-family citations from the saved Andrew Johnson page, but
`app.js` imports only `snipClaim` and nothing calls `/api/web/primary`. And
archive coverage is the weakest link, stated plainly: of 1,598 saved pages, 4
`saved`, 5 `pending`, 1,588 with no archive state at all.

**The rule that governs whatever gets built next:** the custody ledger is
PROVENANCE, NOT PROMPT MATERIAL (user, verbatim: "this doesn't all get fed to
the model"). P55 governs what reaches the model; richer provenance must never
become a bigger prompt.

## The hyperlexicon, the move space, and navigation (added 2026-08-28)

POLICIES.md **P57**, **P58** and **P59** are the law; this is the map. All
three came out of one specimen: *"who was Queen Victoria's prime minister?"*
answered *"Robert Peel"* — one name read out of a list of ten.

**P57 — content is EOT, admitted at a door.** `hyperlexicon.js` is `store.js`
one register over ("the reality of the database should be the EOT event
stream, the current state always projected"), aimed at what this instrument
has READ. First sighting `INS · Figure`, later sightings `SUPERSEDE · SYN`
with witnesses and spans UNIONED — two pages agreeing become one note with two
witnesses, not two notes. `admit` returns `{log, heard, turnedAway}` and
`turnedAway` is not optional. This is where `grammar-lens.js` finally gets
wired, asymmetrically (P56): a settled non-verb is refused with its giver, an
out-of-vocabulary word admits.

**P58 — the cube classifies MOVES, not content.** `moves.js` enumerates 27
cells (operator × grain, terrain derived, never chosen) and computes coverage
against the real capacity registry. It reads no document — the
content-classifier move stays refuted. The finding: `relations` sits at
CON·Figure (Link) and **CON·Pattern (Network) is empty**, which is why a
record block yields **zero** edges rather than few. *A grain gap floors; a
vocabulary gap degrades* — measure which before spending a tenth vocabulary
configuration. `network.js` occupies that cell: injected shape recognizers,
`RECURRENCE_FLOOR = 2`, a cycle of one shape binds nothing (CON *relates*), an
unrecognized line is a hole and never a wildcard. It deliberately does not
name what binds a system.

**P59 — `seek.js` can learn from a sink.** `learnRelation` read only what a
slot points AT; a slot built from a list points at nothing, so `examined` came
back 0 with the members unread. `inbound(id)` is optional, consulted only when
`neighbours` is empty, and reports `via` so the two directions of evidence are
never confused. With it the walk answers the specimen by navigation, no model
reading a span.

**Three honest limits, disclosed rather than implied fixed.** `network.js`'s
recognizers are still pre-established — the vocabulary-free route (a line's
collapsed character-class signature; lag-2 similarity 0.926 vs 0.579 inside a
record block, flat in prose) is MEASURED and unbuilt. `tiles=false, gaps=18`
because real handovers carry day-level gaps, so the coverage gate refuses to
call the set closed — a real decision, not a threshold to tune. And nothing
here is wired into `app.js`: the `seek`-source adapter is a driver, not a
module. (Corrected 2026-09-01: this used to say `hyperlexicon.js` has no
caller. It HAS one — `app.js` builds it and threads the log through
`runHolonicTask`, landed by P73/P74. What remains unwired is `network.js`
and the seek adapter.)

**`succession.js` is condemned but still in the tree** (user, 2026-08-28: *"it
should never have been made"*). It is not a delete: it reads a different
layout (`In office / dates / Preceded by / Succeeded by`) and has two live
consumers — `holon.js`'s cardinality gate and `app.js`'s `fillersFor`.
Replacing it means shape recognizers for that layout plus reworking both call
sites.

## The physics and chemistry of the cube — priors compiled, reasoning settled (added 2026-08-28)

POLICIES.md **P60** is the law; this is the map. The ask, near-verbatim:
leverage all the priors as well as possible ("whether it's predigesting or
what") and run a true "neural net"-style thing that MECHANICALLY reasons
using the physics and chemistry of the cube.

**The finding first: the parts existed, unconnected.** eoreader7's kernel
already sediments completed readings into portable memory
(`experience-priors.js` WHICH + `rhythm-priors.js` WHEN, merge built for
never-rescanning), already holds the chemistry table (the kernel
hyperlexicon — "only a GIVEN affordance with a named giver licenses
composition"), already bonds chains at referent bridges with ≥2-independent-
witness nomination (`relation-composition.js`), and already has the physics
(`activation.js` decay at declared/measured window; `terrain-activation.js`
one-hop presence). What did not exist: persistence (the engine's own driver
reads ~40min of priors and discards them at exit), iteration (composition
evaluated once at a cursor — products never re-enter), and any gate tying
reasoning to the reach of the present.

**eoreader7 `native/kernel/reaction.js`** (new) is the circuit: a cue
settles against a prior-conditioned substrate. Physics — a chain reacts
only in contact with the present (declared floor; `cue:null`/`floor:null`
the disclosed ungated control; `window` inherited from activation's own
wall). Chemistry — a GIVEN affordance may declare what it YIELDS
(`meta.yields`, no schema change), so products re-enter and chain, one
bridge-hop per step, to quiescence; provenance walks to raw witnesses;
raw-stated facts are never re-derived (`alreadyWitnessed`); extra paths
counted, never duplicated. Deliberately NOT spreading activation —
memory/activation.js's measured refusal of the similarity flood is honored:
the front moves because products light their own ends, each hop its own
act. Plus `closureAffordances` (4-row transitive-closure table),
`affordancesFromDeclarations` (GIVEN transitive(r) ⇒ (r,r)→r; candidates
and functional yield NOTHING — the grain theorem), `nominateFromExperience`
(the cross-work gate, extracted from the engine driver into one tested
implementation).

**the-fold `predigest.js`** (new, pure, organs injected): compile-once
priors — `EOCompiledPriors@1` with corpus manifest, received-priors
INVENTORY (pointers with givers, typed gaps for absences, never copies),
standing triple untouched (compiling never promotes); typed load refusals;
and `assertionEdges` projecting the P57 hyperlexicon into engine edges
(witness = the assertion's own byte address; endpoint identity disclosed
as `identity: "assertion-log"`).

**Measured** (`eval/results/predigest-priors-RESULTS.md`,
`mechanical-reasoning-RESULTS.md`): 111 works sedimented in 34.1s into a
174KB standing artifact; then, on the committed Wikidata fixtures with no
model call anywhere — 26 byte-addressed facts through P57's door (the
cross-fixture repeat folding to ONE note with TWO witnesses), control arm
0 derived / 41 withheld pair types, chemistry arm **9 never-stated facts**
(headline: *Ulysses S. Grant held the presidency after Abraham Lincoln*,
derived through Andrew Johnson with fixture byte addresses; a depth-2
2-path fact: Colfax after Breckinridge through Johnson AND Hamlin), physics
arm showing the front propagate Hamlin → Johnson → Johnson's offices
(5→4→0), priors arm nominating 0 of 9 (the canon never met these forms —
the gate refusing IS the measurement).

**The rule this pass earned, by running it:** the first chemistry run
derived BOTH directions of one Senate pair — Hamlin held the seat multiple
terms, and a person-level bridge conflates tenures. *"The same person" is
not "the same tenure": a bridge must carry the identity the relation's
semantics needs.* The shipped gate licenses an office's chemistry only
where `replaces:<office>` is functional AND inverse-functional over persons
in this material (a refutation search, R2's own vocabulary): 6 offices
licensed as the driver's declared risk, the Senate seat refused with its
counterexamples named. The finer per-bridge gate is named future work.

**Not wired into a live turn**, deliberately: app.js is the
fold-architecture session's contract (the P45/P53 boundary), and the
browser runtime needs a `/native` mount + page-graph + II.13 allowance
first. The compiled artifact, both drivers, and both result docs are
committed so everything reproduces from the repos alone.

### Amended 2026-08-28 — self-individuation refuted at Step 0; the scan is a veto, and the loop is pruning

P60's amendment in POLICIES.md is the law; this is the map update. Asked to
remove the giver requirement so a composition could "INS itself", the
proposal was TESTED BEFORE IT WAS BUILT (`eval/falsification-probe.mjs`,
`eval/results/falsification-RESULTS.md`): six corpora, ground truth declared
in advance, real door and real kernel nominator. A five-fact succession chain
and a five-fact dominance chain are structurally identical by construction
and opposite in truth — **the scan cannot tell them apart.** Refuting a
composition needs a POSITIVE counterexample (a cycle, or a uniqueness
violation); open-world absence refutes nothing. One driver and six fixtures
instead of five modules shipping plausible falsehoods with real provenance.

**`eoreader7 native/kernel/refutation.js`** is the same scan reframed as a
**veto organ**: `refuted: false` is never a licence and every result says so,
a scan below two resolved edges reports `insufficient` power rather than
"unrefuted", unresolved ends are counted. `reaction.js` gained
`settle({veto})` (vetoed tallied APART from withheld — nobody vouched vs
somebody vouched and was refuted), `derivedUnder`, `withdraw` with transitive
cascade, `admit`. `declarations.js` gained `composes` so chemistry lives on
the append-only register and can be conceded.

**Two traps caught by running, not reasoning.** `parent-nontransitive` was
refused for the WRONG reason (uniqueness, never transitivity — recorded so
nobody reads it as the scan understanding composition). And the first audit
reported the derived closure REFUTED because Colfax is `after` both Hamlin
and Breckinridge — which is transitivity being correct; `expectUnique` is now
declared, never inferred, and `closureAffordances` names the 1:1 side.

**Measured** (`eval/results/pruning-timeline-RESULTS.md`): streaming the real
succession facts one at a time, the Senate licence **survived 10 facts, was
refuted at 11**, conceded with a real REC, one derived product withdrawn,
history whole (26 derived / 25 live), veto holding. Six licences survived the
whole stream — reported as *"unrefuted by THIS material — not a licence
earned."*

**The generalization, and the answer to the staleness question:** evidence
cannot grant a licence, only take one away. Against the neuron analogy, that
is **pruning, not Hebbian strengthening**.

### Amended 2026-08-28 (third) — the veto helps, the chemistry does not

POLICIES.md P60's third amendment is the law; this is the pointer. Asked to
*prove it actually helped*, the honest answer was that P60 hadn't: it measured
that the mechanism RUNS, never that its facts are TRUE or that the gate
PREVENTS anything. `eval/derivation-precision.mjs` (offline) scores four arms
against an oracle independent by construction — the derivation reads
P1365/P1366, the oracle reads P580/P582 term dates.

**Two findings.** The veto is real: precision 0.842 (naive join, zero
apparatus) → 1.000 (shipped gate), every false fact eliminated, all of them in
the one office the gate refused. And the chemistry adds **no derivation power
at all** — a 20-line transitive join finds every fact the licensed chemistry
finds plus 14 more. **The apparatus is a filter, not a generator.**

**The cost is now priced: 15 true facts lost per 2 false ones prevented.** The
disclosed "finer per-bridge gate" was built as arm D and recovers 1 of the 15 —
directionally right, not the fix. The fix is admitting term DATES as material,
not a cleverer veto: the derivation only ever received adjacency.

**The lesson worth carrying:** a mechanism that runs is not a mechanism that
helps, and the control separating them is the cheap one that got skipped. Run
the dumb baseline first.

### Amended 2026-08-28 (fourth) — a uniqueness violation is a grain signal

POLICIES.md P60's fourth amendment is the law; this is the pointer. Asked to
be sure the edges were *"not politics shaped but learn anything"*, the fix from
the previous amendment turned out shaped: `person#office#start` hardcodes
"someone holds an office for a term" and goes dark elsewhere — the same mistake
`relation-composition.js`'s header records the kernel making with Greek grammar
("AN ARRANGEMENT HAS ENDS, NOT PARTS OF SPEECH").

**The general rule:** an edge relates OCCURRENCES, not the durable entities
those occurrences belong to. A one-to-one relation violated at entity grain is
evidence the **grain is too coarse**, not that the relation is unsound — which
reframes P60's veto as having pointed at a fixable modelling error all along.

`eval/grain-refinement.mjs` proves it is not domain-bound: a 68-line core with
**zero** domain words (scanned, not eyeballed) runs unmodified over real
Wikidata succession and an invented hospital-bed corpus. Both reach **1.000
precision at occurrence grain with no veto anywhere**. The non-political control
carries a trap declared in the fixture before the run and it fires exactly as
predicted at entity grain.

It also corrects the previous amendment: naming occurrences by statement index
gives identical results, and the synthetic adapter uses no dates at all —
**dates were one adapter's way of naming occurrences**, not the fix.

**The lesson:** a mechanism that needs material labelled in one domain's
vocabulary has learned that domain, not anything general. Prove otherwise by
running the identical core over a corpus from somewhere else.

## Stance on the admission record, sedimented (added 2026-08-28)

User direction, in two corrections that each changed the design. First:
**"these are always defeasible assertions of the reader, the structure of their
cognition, not anything allegedly in the world."** Second: **"remember that
it's 27 cells, not 9x9x9."**

**What the first correction fixed.** An earlier draft here proposed attaching
stance to EDGES. Wrong: an edge does not HAVE a stance, it was ADMITTED under
one. `grid.js` already put stance on acts and never on edges, which was the
architecture being right where this was about to make it wrong.

It also retro-explains the falsification probe. That probe concluded "structure
does not license composition" because the scan could not separate the twins,
and it was written up as an EVIDENCE problem. It is not: **licensing was never
a world-question.** The corpus was being asked something categorically outside
what a corpus answers, which is why only a named giver can grant it and why no
further reading would ever have helped. The defeat mechanisms were already
built correctly for reader-structure too — `refuteRelation` finds cycles and
uniqueness violations (internal incoherence), never "the world disagrees"; and
the void loop's `posture_spent` -> REC is a defeasible commitment defeated by
exhaustion rather than falsified.

**What the second correction fixed.** The space is **27 = operator x grain**;
mode, domain, terrain and stance are all DERIVED from that pair (`cube.js`:
`{ op, grain, mode, domain, terrain: TERRAIN_BY_DOMAIN[domain][grain],
stance: STANCE_BY_MODE[mode][grain] }`). There is no free stance axis to
declare, and `moves.js` already enumerates the 27 as `${op}·${grain}`. An
earlier probe here assigned stances to RELATIONS as if they were primitive;
what it actually found is that three relation-properties correspond to three
ACTS — DEF·Figure (Dissecting), EVA·Figure (Binding), REC·Pattern
(Composing) — which is the void loop's own choreography. Disclosed honestly:
that probe assigned `governs` vs `advises` by whether they were functional, so
those two were contaminated; the `replaces` vs `after:` split is independent
and is the clean evidence (it is S19's hand-fix, read as a cell difference).

**The wiring was nearly free, because the cell was already on the record.**
`hear()` already wrote `operator` (INS first sighting, SYN on a re-sighting)
and `grain` (Figure). The cell was derivable the whole time and simply never
read off. `makeHyperlexicon` now takes an optional injected `cellOf` (the
cast.js pattern, the engine's own function, never a restated table) and carries
`cell`/`stance`/`terrain`/`mode`/`domain` on each entry.

**A finding that fell out rather than being designed:** INS is Existence-domain
and SYN is Structure-domain, so a first sighting lands `INS·Figure` ->
terrain **Entity**, and a re-sighting lands `SYN·Figure` -> terrain
**Link**. Same stance (Making, both Generate·Figure); the terrain moves.
A birth brings a thing into existence; corroboration makes it structural.

**Sedimentation reuses the kernel organ unmodified.**
`readingFromHyperlexicon(log, {source})` projects a log into the shape
`experience-priors.js` already counts (`fold.transformationObjects` ->
`stanceExpectations`). The adapter lives in the consumer, not the kernel: that
organ is domain-agnostic and has no business learning what a hyperlexicon note
is. Measured through the REAL organ: 5 postures across 2 works, `Making` at
occurrences 5 / workSupport 2 — clearing `memoryStanding`'s
`recurrent_cross_work_memory` bar of >= 2 works.

**THE PLANE SEPARATION IS A WALL, NOT A CONVENTION.** Only the act crosses —
operator, stance, terrain. No subject, verb, object, witness or span does, and
`graphEntries` stays deliberately EMPTY, because relation vocabulary is
world-facing. A prior that learned those would be learning the world from its
own habits. Enforced by a test that serializes the projection and scans for
every world-facing string; planting a `subject` leak fails it.

**The consequence worth stating, since nothing else can catch it:** cells,
stances and affordances are constrained only by coherence, productivity, and a
named giver's declared risk — which is strictly weaker than correspondence. A
reader can be internally coherent, productive, and systematically misreading,
and this apparatus cannot detect that. Only an oracle can, and only on FACTS.
The two planes must never share machinery, or the instrument begins proving its
own cognition correct.

**Files.** `hyperlexicon.js` (optional `cellOf`; `cellFields`;
`readingFromHyperlexicon`) + `hyperlexicon-stance.test.mjs` (7 cases, native
kernel only). The tests are a SEPARATE file on purpose: `hyperlexicon.test.mjs`
reaches the engine through `legacy-eoreader6.1`, an uninitialised submodule in
this checkout, so that whole file cannot load and a test appended to it would
never have run — caught by appending there first and watching 7 new cases
silently not execute. Suite 1069/940/127, failure names diffed against a
stashed baseline: identical, zero regressions. Both eval drivers re-run
unchanged (9 derived, 6 licensed).


## The sequence type, admitted by measurement (added 2026-08-28) — pointer

POLICIES.md **P61** is the law here; eoreader7's **S21** is the law there;
`eval/results/sequence-admission-RESULTS.md` is the full account. The bar
was the user's, set before the run: demonstrably improve retrieval,
reasoning AND prediction, or stay a prototype. It passed — retrieval 47/47
vs 40/47 with 7 conflations; reasoning 95/31-true/0-false @ 1.000 depth 6,
strictly dominating every shipped arm; prediction 7 recovered / 0 wrong vs
a structural zero — **after its pre-registered prediction arm failed** (3
wrong guesses, all in a POOLED locus: "US senator" is one name for a
hundred concurrent seats). The failure is kept verbatim and produced
`refuteLocus`, the wall the module's own declared algebra had promised and
lacked. Four of this file's own patches are subsumed (`replaces:<office>`,
`intervalOf`, `person#office#start`, interval-aware cycles — one missing
type, rediscovered four times), and the planned `chainOf` kernel change is
retired unbuilt: position identity carries the locus. The three shipped
eval drivers keep the old encoding as the measurement record; new work
declares a sequence.

## retrieve() was blind to every non-Latin script (added 2026-08-28) — pointer

POLICIES.md **P62** is the law; this is the short map. User direction,
verbatim: *"fix retrieve() so it tokenizes Hebrew and all languages too. we
have the bytes."* `source.js::tokenize` split on an ASCII allow-list
(`/[^a-z0-9%.\-]+/`), so `tokenize("שלום")` returned `[]` — and since every
chunk-building path and `retrieve()`'s own query side both route through
`tokenize` and only `tokenize`, a non-Latin corpus and a non-Latin question
were blind on BOTH sides of the one comparison, not merely unranked.
`foldDiacritics` was checked and cleared: bare, unpointed Hebrew failed
identically, so the base letters were the defect, not the vowel marks.

**The fix reuses a precedent already in the same file.** `foldTypography`
already splits on `\p{L}\p{N}` for exactly the stated reason ("a Cyrillic
or CJK corpus must fold to its words and not to nothing") — `tokenize` had
simply never been brought into line with it. `\p{L}`/`\p{N}` is a strict
superset of `a-z`/`0-9` post-lowercase, so every ASCII caller is
byte-identical by construction, confirmed by a zero-regression full-suite
run (1073/944/127, same 127 by name). `foldDiacritics` widened too —
Hebrew nikud and Arabic tashkil now fold, the identical Bezúkhov/Bezukhov
shape one script class over, shipped on for every caller (folding a vowel
mark away can only widen what matches, never narrow a real distinction) —
verified live against six real fetched Talmud folios, a vocalized corpus
answering an unvocalized question.

**Disclosed, not silently claimed:** CJK gets no real word segmentation —
there is no boundary character between adjacent ideographs for a
split-on-boundaries tokenizer to find, and a genuine two-character CJK
word (`tokenize("北京")`) is STILL `[]`, dropped by the same length floor
that drops a two-letter English word. Both halves pinned as tests, not
glossed over.

**Amended same day — a consumer sweep found and closed two sibling
ASCII-only regexes doing the same job, uncoordinated.** `skills.js`'s
`claimSkill` had a live vacuous-truth bug (a non-Latin-only anchor
tokenized to `[]` and claimed every task unconditionally) closed as a
side effect of the source.js fix alone, now pinned where it bit.
`fact-block.js`'s own question-ranking regex and `capacity-runner.js`'s
`contentTokens` (the more serious one — an empty content-token set makes
`checkObjectSpecificity` TRUST an unchecked non-Latin verdict rather than
examine it) both got the identical character-class widening. `widget.js`'s
deliberately-separate `forms()`/`clauseForms()` stays as is — a real,
disclosed, out-of-scope gap, not silently declined.

**Amended same day (second occurrence) — the two named gaps above closed.**
`capacity-runner.js::contentTokens` now has a real test (a mocked-
`runCapacity` Hebrew claim/edge pair, since the real extractor is
English-only and cannot produce a Hebrew edge itself) proving a claim
mismatch on non-Latin text downgrades rather than being trusted blind.
`widget.js`'s `forms()`/`clauseForms()` keep their deliberate design (OFF
`tokenize`, so stopwords/short words survive) but their OWN independent
split regex was itself ASCII-only, short-circuiting `iterationTell` to
`null` before the already-fixed, script-agnostic `resolvesInto` path ever
ran on non-Latin text — narrowed the same character-class-only way,
judgment/anaphora detection staying named English-only exactly as before.
Full detail and both tests: POLICIES.md P62's same-day amendment.

## The thinking affordance, vastly simplified (added 2026-08-28)

User direction, verbatim: "vastly simplify the thinking affordance to just
what the history of the system was on that turn (including the full prompt
history related to that turn)." Landed one day after "the void, said out
loud" (above) grew the disclosure to eight things stacked under one word —
the live narration, the model's own deliberation, the fold line and its
char-count note, the running summary's bookkeeping, the append-only record,
a run log, the void's own JSON declaration, and the nine-cell verification
taxonomy. This tears all of it back out. `renderFold` now takes one
parameter, `sent`, and renders exactly two things: the verbatim messages
array for every model call this turn actually made (JSON.stringify, one
`<pre>` per call — the existing "what was sent" panel, promoted from a
nested `<details>` to the whole of it), or, when a turn spent no model call
at all (arithmetic, a chart, the entity-seek public-record lookup, `/run`'s
sandbox, `/self`'s ladder…), one honest line saying so — never a blank box.

**Nothing that used to render there stopped RUNNING.** The void's own
declaration still drives the entity-seek branch's actual behavior
(`voidBrief` is read for real, not just narrated); the record still feeds
`state.summary`; the verification taxonomy's only consumer was this
panel, so that computation (and its now-unused `verificationTasksFor`/
`verificationSummary` import) was deleted outright rather than left
computing for nobody. Consistent with this file's own standing rule for
the build-turn gate ("hidden drawing, never a hidden finding"): checks run,
findings still land on the append-only record: only the drawing stopped.

**The one-function rewrite uncovered three MORE writers into the same box**
that a first pass at just `renderFold` would have missed entirely, found by
grepping every `querySelector(".turn-meta > .fold`-shaped call in the file
rather than trusting the one function's name:

1. `renderGrounding` (quotation checks, per-claim verdicts, corroboration
   counts, and an interactive "check online" proof-seeking chip strip that
   triggers real web fetches on click) and the tally line inside
   `renderAnswer` ("standing on the material: N sentence(s)…") both wrote
   into the identical `<p>` `renderFold` also writes into — the SAME
   element, not a sibling. The tally always ran BEFORE `renderFold` in
   every turn that reaches it, so it was already being built and wiped
   unseen the moment `renderFold`'s own `out.textContent = ""` landed —
   pure dead code, deleted. `renderGrounding` runs at the same point but
   has real, load-bearing side effects beyond drawing (the ledger notes,
   the `run()` closures the automatic background proof-seeking walk
   executes, and that walk's `onVerdict` callback, which updates the
   `.edge-badge` marks live in the ANSWER's own prose — a different,
   untouched surface). Gutting the function was wrong; instead its `box`
   is now a scratch element created with `document.createElement("div")`,
   never attached to the page — every line under it still runs exactly as
   before, with nothing left to append the result to.
2. `crownTestimony` (the per-source testimony spine, P39) runs AFTER
   `renderFold` and fire-and-forget (never awaited), so its own `disclose()`
   calls were literally appending "testimony · CASE …" lines onto the
   thinking box a few seconds after `renderFold` had already drawn the
   simplified content — the one writer that would have kept showing up
   even after the main rewrite landed, had it not been caught. Same fix:
   `disclose` now writes into a detached scratch div. The crown sentence
   itself (the visible "According to X, …" the reader actually sees) was
   already appended to the answer's own `body`, untouched.
3. `transcribeTurn`'s three-layer pipeline display (raw Whisper text,
   priors-coref, self-coref) built its `<details>` layers directly inside
   the real fold box — a live progress view of `/transcribe`, hidden by
   default since the disclosure itself starts collapsed. `renderFold`'s own
   rewrite already wiped it the instant the turn finished (same "cleared
   then overwritten" shape as the tally), so this was a second case of the
   same defect rather than a new decision — same scratch-element fix, kept
   consistent with the other two rather than deleted, since unlike the
   tally this one's layer-population calls are threaded through the whole
   function under two different code paths (file and URL) and a bigger
   removal would have been a larger, riskier change for the same outcome.

**The generalizing check, so the next pass does not have to re-find these
by hand:** `grep -n 'querySelector(All)\?(["'"'"'\`][^"'"'"'\`]*\.fold'` across
app.js now returns exactly one hit — `renderFold`'s own — confirming it is
the sole remaining writer into the real disclosure element. Any future
function that wants to put something in "thinking" again should be measured
against that grep before it ships.

**Not attempted:** a live end-to-end test through the real composer. This
checkout has neither the sibling `eoreader7` repo (`/engine`, `/engine-v7`,
`/nul` all 404 from `serve.mjs`) nor `node_modules` (`mathjs`, `monaco`,
`katex` all 404 too) nor a reachable Ollama — `fillModels()`'s own fetch to
`:11434` never resolves or rejects in this sandbox even with the request
faked via Playwright route interception, so `state.ready` never flips and
the composer's submit handler no-ops on every attempt. Verified instead:
`node --check` on the edited file; a live headless load of the page showing
zero new console/page errors beyond the pre-existing 404s just named; and
the grep above. This is a pre-existing environment gap, not a property of
the change — the same gap this file's own recent passes (P56, the sequence
work above) already navigated around by testing their engine-side modules
directly rather than through this page.

## Kinship reasoning — complicated mechanical reasoning, not just adjacency (added 2026-08-28) — pointer

POLICIES.md **P63** is the law; this is the short map. User direction:
*"let's have it do complicated mechanical reasoning that isn't just 'in'
the text."* P60's succession demo composes one relation with itself
(real multi-hop, but spottable by eye on two adjacent entries); this
closes the sharper ask with a domain that composes TWO DIFFERENT
relations, the second hop consuming the first hop's own derived product:
`childOf ∘ hasChild ⇒ siblingOf`, then `childOf ∘ siblingOf ⇒
hasAuntOrUncle`. Neither relation is stated on any one fetched page —
Wikidata has no aunt/uncle property at all.

Live, never a fixture: four real Wikidata entities (Queen Victoria and
three of her real descendants) fetched over the network the moment the
driver runs. The reaction circuit, the-fold's own P57 admission door,
and `predigest.js`'s projection are all reused completely unmodified
from `eval/mechanical-reasoning.mjs` — this pass supplies only a new
domain, a hand-declared cross-relation-type chemistry, and a new
independent oracle (Wikidata's own `P3373` sibling property, fetched and
checked ONLY after the derivation, never fed to the substrate — exact
agreement, 8/8).

Headline, three separate real files, none saying anything about an
uncle alone: *Wilhelm II's aunt/uncle is Edward VII* — derived depth 2,
provenance walking to real byte addresses on Wilhelm's, Vicky's, and
Victoria's own separate pages, mechanically confirmed absent (the literal
words "aunt"/"uncle") from every byte fetched. A real local model given
only the three raw facts answered the yes/no question correctly but with
fabricated reasoning (calling Edward VII "a cousin of... Victoria," his
own mother, and inventing an unmentioned "King George V") — a verdict-
only check would have missed that the stated reasoning never actually
performs the two-hop composition it was asked to do.

## Three standing policy reassemblies — reasoning, generation, capability (added 2026-08-29)

`REASONING-POLICIES.md`, `GENERATION-POLICIES.md`, and
`CAPABILITY-POLICIES.md` (repo root) are CHAT-POLICIES.md's discipline
applied to three more slices: each is a reassembly of already-measured
law — summarize and point, never re-derive; standing documents, amendments
append; POLICIES.md wins on conflict, the eval results docs win on
numbers. Every number in all three was re-verified by re-running its
driver before first commit.

The one genuinely new mechanism beside them:
`eval/capability-coverage.mjs`, which drives the REAL `moves.js` coverage
off the REAL native cube through all three 9-way projections (operator /
stance / terrain — each drops one of the cube's three free axes;
operator=(mode,domain) is verified mechanically, so the space is 27 with
three faces, not four axes). Its findings, kept where the next pass will
look: registered coverage is 9/27 with ONE full stance (Binding);
**an empty cell is a lead, never a verdict** — SEG and REC read zero
coverage while NINE real, tested organs exist unregistered (registry
debt; after-debt projection 13/27, Composing becomes the second full
stance), whereas CON·Pattern earned the incapacity reading the only way
it can be (a falsifiable prediction stated before the file existed,
confirmed on real material — P58's zero-edges list page). Three stances
are genuinely empty after the debt: Unraveling, Tracing, Cultivating —
each a KIND of act currently performable in no domain, which is the
build-order the map licenses. Depth is the OTHER axis (P44's MHC battery,
stage 9 / stage 6 with a real order-7 ceiling), and the wall neither axis
crosses: coherence is strictly weaker than correspondence — a completed
27 would mean every kind of act is performable, never that any is
performed correctly.

## The connection pass — the registry debt paid, the map live (added 2026-08-29) — pointer

POLICIES.md **P64** is the law; this is the short map. The adversarial
verification the three policy docs' first commit declared pending ran
(119 figures checked, 15 corrections, six missing laws — all folded in),
and the user's own hypothesis ("organs for all 9 stances, the cube
identifies what is missing") was closed in two moves. **Connect:** ten
rows joined `capacities.js` — every one a verified export, mechanically
domain-legal, cell typing documented in the organ's own code where it is
and reasoned per the registry's original discipline where not. 9/27 →
**19/27, no operator at zero, three FULL stances, no empty stance.** The
law earned: an empty cell is a lead, never a verdict — three hole kinds
share one count (registry debt, which was over half the map; real
incapacity, which only CON·Pattern ever earned and whose answering organ
now fills it; probe error, P44's four wrong probes). **Plan:**
`CAPACITY-DEVELOPMENT-PLAN.md` carries the eight remaining cells —
NUL·Figure first (P22's own named clearance test, the last Dissecting
cell), SEG·Pattern the one genuine no-candidate frontier, three cells
gated on the fold-architecture session's boundary rather than guessed at.

## The development pass — Tier 1 built, the frontier cell built, 24/27 (added 2026-08-29) — pointer

POLICIES.md **P65** is the law; this is the short map. "Build it" —
CAPACITY-DEVELOPMENT-PLAN.md executed: three new organs, two
registrations, **19/27 → 24/27, six FULL stances, Figure and Pattern
grains complete at 9/9; the whole remaining gap is the Ground row**
(CON·Ground / DEF·Ground / INS·Ground — the plan's own gated three, one
per mode).

**`clearance.js`** (NUL·Figure, P22's named "the figure doesn't clear
it") — the establishment ladder over presence, P38 mechanized: typed
refusals per rung (`no_presence` / `below_recurrence_floor` /
`ambiguous_surface`), the floor disclosed by measurement, a pronoun rung
only under declared numbers with a TYPED skip (P41 — a skip never
upgrades a standing). The build's own finding: native `extractSurfaces`
already refuses sentence-initial capitalisation at extraction, so the
position rung lived in the adapter all along. **`unravel.js`**
(SEG·Pattern, the no-candidate frontier cell) — parameter-free separation
at the network's own bridges, `no_seam` typed refusal for 2-edge-connected
graphs, edge-id Tarjan whose parallel-edge trap was PLANTED and proven
(the textbook parent-skip ships a false seam; the test discriminates).
**`testKindMembers`** (eoreader7 native, NUL·Pattern) — a DECLARED kind
membership against the inducer's own random-subset null; structural
refusals (`unknown_members` / `under_powered` / `no_boundary`), a failing
set is a verdict, never a refusal. Plus `settle` (SIG·Ground,
`whatWouldSettle`) and `kinds` (SIG·Pattern, native `projectKinds`) —
the registry's first native-module rows, pointers still
`not_yet_executable` from the terminal.

**The plan's kinds gate was WRONG and is corrected in the plan's own
dated status section:** the native ports existed with a built-in null —
the "legacy path" premise dissolved before the plan was written, found by
reading the modules. Suites after the same-day adversarial amendment
(P65's own amendment carries the two real findings and their
mutation-killing pins, plus the complicated-reading demonstration):
the-fold 1098/969/127 (all 127 by name, the standing environment set,
zero regressions); eoreader7 180/176/4 (same 4 by name).

## The 27 cells, explained (added 2026-08-29) — pointer

`THE-27-CELLS.md` (repo root) is the per-cell reference the three policy
reassemblies point around: how to read an address (27 = operator × grain,
three derived faces), all twenty-seven cells with their organs and one
measured usage example each, the three empty Ground-row cells with their
gates, and the together-section (the act grammar, the void loop's three
read-off cells, coverage as diagnostic, what the map does not say). The
cell/organ assignments are generated against the live cube and registry —
`eval/capability-coverage.mjs` is the regeneration check and wins any
disagreement; the prose is the document's own. Verified by a three-checker
adversarial pass (21 findings — one fatal, eight real, all folded in;
among them: two CAPACITIES execute, touching three cells; the SEG·Figure
ops story corrected to deriveOp's actual typing; the native surfaces.js
CELL stamp reconciling the demonstration's "SIG·Ground presence" label;
the SYN·Pattern reaction-circuit reading flagged as this document's own
nomination). A designed HTML rendering of the same reference is published
as an artifact.

## Co-presence is evidence, never an answer (added 2026-08-29) — pointer

POLICIES.md **P66** is the law; this is the short map. `resolvePronouns`
refused any frame carrying a named surface, which on encyclopedic prose is
most of the material — so `bindings: 0, gaps: 6` was six gaps standing in for
a hundred chances, denominator stated nowhere.
`eoreader7/native/kernel/contest.js` takes the decision into the kernel and
makes co-presence a STANDING rather than a gate: a contested frame must clear
a stricter declared bar. **Co-presence raises the BAR, never a SCORE** — an
unactivated co-present candidate still loses, so nearest-name binding is not
smuggled back in. Medium-generality is asserted mechanically (the test scans
the kernel's own body for *sentence*/*pronoun*/*surface*/*token*/*word*/
*text* and fails if any appears) and exercised on a film shot and a bar of
music unchanged.

**Both regimes it enables are OFF by default and both were measured.** The
constant bar (`contestedMargin`) is REFUTED and kept only as the named
control arm — a constant rewards a sparse field, so scrambled material clears
it more easily than coherent material, which means `minMargin` measures
separation, not evidence. The permutation null (`nullTest: {draws, seed,
alpha}`) fixes exactly that and is still not adopted: novel lift did not rise
and its survivors are rare-referent self-echo. **The bottleneck is the SIGNAL,
not the criterion** — the third independent measurement to land on that line,
confirming `surfaces.js`'s MODEL-tier fence rather than challenging it.
Absent both parameters, shipped behaviour is byte-identical
(`pronouns.test.js` 9/9 unchanged).

**Two rules worth carrying.** A gap is a refusal the organ REACHED, never a
frame it never read — the denominator belongs in the `regime` block every
return now carries, where it is a count of frames and cannot be mistaken for
a verdict. And, found on landing when a driver disagreed with its own results
document: **a ratio that hides its variance misleads exactly the way a count
that hides its denominator does — a null drawn once is a null drawn zero
times.** The disputed lift moved 0.92x–3.00x across twelve shuffle seeds with
its numerator fixed; the driver now draws a declared seed band and has a third
verdict for a band that straddles 1.

**Disclosed:** two drivers read materials that no longer exist, so their
counts are records rather than things this repo re-derives — each results
document now says which rows reproduce (writer-decay: all; null-criterion:
its four `live_priors` rows exactly; contested-copresence: none, the article
fixtures extract ~5x the frames the runs read). A Wikipedia-body extractor
was refused on this repo's own grounds — per-site formatting rules are the
trap `succession.js` is condemned for.

## A reading is Talmud, not a cache (added 2026-08-29) — pointer

POLICIES.md **P67** is the constraint on this repo; **live_priors' own
`POLICIES.md` (LP1–LP5) is the law** — a new standing document in the corpus
repo governing what a corpus owes a reading and what a reading owes a corpus.

**The frame.** A reading of a source is a record of an encounter with it by a
named reader — anchored to a locus, attributed to a reader, accumulating
rather than overwriting. A cache is regenerated when the code changes; **a
record is appended to.** `hyperlexicon.js::hear` already implements it
(PROPOSE then SUPERSEDE, witnesses and spans UNION never replace, line 128).

**How much should a reading grow? Not a size question** — a gate: an
increment lands iff it resolves against real bytes AND names its recipe.
Growth is bounded by the source's extent × distinct recipes, and is
self-limiting, because a recipe that hears nothing appends nothing. A refuted
reading is conceded (REC), never deleted.

**What binds this repo:** a reading may be OFFERED beside a source, and may
accelerate a walk provided every result is re-verified against source bytes —
but it may never be **served in place of** source bytes, and may never
**gate** what the corpus offers. **A document with no reading is not a
document with nothing in it** — the withhold-vs-convict statement in the
grounding-ladder section, one level out: absence of a reading is a fact about
the reader, never about the document. Measured: six of fourteen digested
sources carry little or nothing and three are English caption debris; the
Hebrew article's "surfaces" were `School`, `Athens`, `Raffaello`, `Internet`.

**Two prerequisites before building any of it here.** A reading's addresses
must resolve in the source's own coordinates — measured, today they do not
(a span addressed `#196-256` sits at 1165 in the file, and the recorded
`bodyOffset` does not reconcile it, because `normaliseNewlines` is
length-changing and unrecorded) — and a reading needs a content-addressed
**recipe identity**, since the witness names what was read and never who read
it. Append-only without attribution is worse than an honest overwrite.

**What it unblocks:** `/api/priors/check`'s own header names a proper index as
future work *"whose persistence and staleness story this server does not
own."* That blocker is staleness, and this frame dissolves it — an older
reading is not stale, it is older.

## Recipe identity, built (added 2026-08-29) — pointer

POLICIES.md **P68** is the law; this is the short map. LP5's own named
prerequisite for append-only — a witness naming WHO read, not only WHAT —
is built: `hyperlexicon.js::recipeId` (SHA-256 over a caller-declared
descriptor, now including every relevant repo's own git-commit state), a
real double-counting bug caught and fixed in the same pass (`hear()` used
to append even a re-sighting that taught it nothing new — now a structural
no-op), and `hypergraph.js::relationsFor`'s `vocabulary.candidates` (task
#9's own adversarial audit finding: nominated vs. cleared are different
facts, and the field genuinely diverges once a caller wires the
already-existing `posPriorFor` POS gate in — which live_priors did, the
same day, at corpus scale; see that repo's own POLICIES.md LP6 for the
full account of the gate itself, which is entirely that repo's own
driver-side decision).

## The ratchet, finished for the text tier (added 2026-08-29) — pointer

POLICIES.md **P69** is the law; this is the short map. eoreader7's own
README states its ratchet: a compatibility subsystem retires only once its
native replacement passes conformance. Before this pass, nothing had
actually crossed — `app.js` carried nine separate `/engine/` imports of the
frozen provider (`segments`, `spans`, `surfaces`, `pronouns`, `relations`,
`priors`, `wordclass`, `operators`, `holon/task-log`) plus a native
`/engine-v7/` import of the SAME two things twice over
(`cube.js`/`operators.js`, `kernel/task-log.js`/`holon/task-log.js`) — the
double-carriage drift this file's own postmortems (P22, P24, P25) already
name, caught here across two engine generations rather than two branches
of one function. All nine now cross to native, gated on measured parity
(not export-shape agreement) run against real fetched Wikipedia material
first — `resolvePronouns` proven strictly ADDITIVE field-for-field, the
operator/task-log algebra checked over all 81 operator pairs. One import,
`emergence/tiers.js` (and the 1,306-line `nul/index.js` statistics
subsystem it stands on), stays on `/engine/` — disclosed, not silently
ported shallow: native's `dynamics.js` is a structurally different
mechanism from the Bayesian tier-stack the self plane (`reflex.js`/
`aperture.js`) depends on, and porting it faithfully is its own pass.

**Three real, load-bearing bugs found in the first minutes, before any
deliberate work began.** `app.js:147` imported `blankLabelRows` as a named
binding from `/engine/perceiver/text/spans.js` — a symbol that exists on
NO engine path, legacy or native, anywhere. This was a link-time error:
the page's whole module graph was unloadable in any real browser. Not
caught by `node --check` (which only parses); found only by reading what
the import actually resolved to. The organ it names — a length-preserving
blanker so a flattened Wikipedia infobox is never read as prose by the
clause extractor — is a the-fold concern (infobox furniture is not a fact
about language), so it now lives in `source.js`, declared per this
file's own P4 discipline (`minRun`/`maxCell`, no defaults), validated
against the real fetched Hannibal Hamlin page this file's own P50 section
already used as a specimen. Second: `explore-server.mjs`, which this
file's own Explore section already documents as needing every mount
`serve.mjs` has ("without that mount the chat page half-loads"), had no
`/engine-v7` mount at all — fixed by mirroring `serve.mjs`'s exact
pattern. Third, found and deliberately NOT fixed: `packages/host/
assertion-resolution.js`, in the frozen `legacy-eoreader6.1` submodule at
its pinned commit, has a genuine unbalanced-parens syntax error (12 opens,
11 closes) that predates this pass and blocks `explore-server.mjs` from
booting in this environment — Constitution I.2 holds legacy as frozen
reference, so this is disclosed rather than silently patched.

**Verified, not assumed, at every layer.** A real headless Chromium
(already vendored, no Playwright package needed — Node 22's native
`WebSocket` speaks CDP directly) loaded the real page against a real
`serve.mjs`: zero console errors, zero exceptions, the `#not-served`
banner correctly hidden (this file's own boot code only removes it once
module execution genuinely completes). Full suites, failure names diffed
rather than counted (this file's own standing rule): the-fold's 45-name
failure set identical before and after; eoreader7 native's own 320 tests
— including both structural walls, `native-boundary.test.mjs` and
`text-boundary.test.mjs` — all passing. `eoreader-contract.json`, whose
own stated purpose is tracking exactly this migration, now records the
crossing: `runtimeConsumers.browserEngineModules["app.js"]` holds the one
disclosed holdout, a new `browserNativeModules` entry holds the nine that
crossed, and a new contract test fails loudly on any future silent drift
of either surface — the same posture the pre-existing `/engine/` test
already held.

## The MHC scaffold's own null, fixed: exact where an exact answer exists (added 2026-08-30) — pointer

POLICIES.md **P70** is the law; this is the pointer. Order 10's own missing
probe (this file's "MHC battery" section, above) turned out not to be a
capability ceiling: widening the read window to get order 10 a real
specimen made order 8's `arbitrary` arm flip on a 20-draw Monte Carlo
estimate that could not tell a true rate near 0.6% from one near 10%.
Replaced with the exact hypergeometric answer this one arm's shape actually
has (`redealAgainstExactNull`, `eval/mhc-battery.mjs`) — no draws, no seed,
nothing to be underpowered at — derived and its alpha fixed (reusing this
repo's own standing 0.05, `network-standing.js`'s convention) BEFORE the
wider run, never tuned to make it pass. Both orders now hold on both
materials at full-document scale (`WORKING_PASSAGES` 40 → 70, still a
declared cap, not an assumed wholeness); order 7's real ceiling on
Borodino is untouched. Suite 1468/1418/45, failure names diffed via
`git stash`: identical, zero regressions.

**Amended same day — audited, not assumed, and the reported stage moved
down as a result.** Told *"we must be solid on all levels earlier,"* the
whole ladder's own `arbitrary` arms were read one by one rather than
trusted from their "passed" verdicts. Order 9's arm had the identical
defect P70 had just fixed, worse: it shuffled the ORDER of an array and
then took a `Set()` of it — order-insensitive by construction, so the
check never varied across any of its 20 draws — and separately, this
driver's own material-loading tags every passage with one source key, so
the "two passages of one source vs. two sources" distinction order 9
claims to test has never once been exercisable here. Rebuilt on the same
exact-proportion pattern as P70 (`redealCountAgainstExactNull`) and
caught hitting the SAME bare-Monte-Carlo trap a second time mid-fix (2/20
fired read as signal, the exact math showed 0.0145/0.0187 — real noise
around a true rate under 2%) before being trusted. Order 11's arm was
ALSO vacuous — three identical unshuffled text copies, a completion check
hardcoded `&& false`, `perturbed` falsely hardcoded true — and this one is
NOT patched with a guess: every real construction considered reduces to
testing a pure function against itself. It now honestly reports
`unlicensed_perturbation`. **Consequence:** war-and-peace's reported STAGE
drops from 13 back to 10 — order 11 sitting unmeasured caps it exactly
where `stageFrom` must, and the earlier "13" was standing on an arm that
was never really evidence. Full account, including which orders (5–8,
12–13) were re-read and found genuinely sound: POLICIES.md P70's
same-day amendment.

**Amended same day (second) — order 11 fixed for real.** The dead end named
above (every naive redeal reproduces `standingOf`'s own pure-function input)
is escaped by redealing a different variable: not the ref-count, the
CORROBORATED LABEL. If that label were assigned to k edges by chance, the
exact probability a same-size arbitrary draw lands entirely inside the K
edges that genuinely clear the witness floor is the hypergeometric point
mass at the maximum — closed-form, no simulation. A first attempt measured
K off the wrong field (`refs.length`, order 9's distinct-passage grain) and
manufactured false mismatches that looked like a real engine bug; caught by
inspecting the raw edge data directly before shipping, and fixed to read
`assertion.statements` — the field `hypergraph.js` itself keys `standingOf`
off. War-and-peace: 692/692 typed, `P(chance) ≈ 1.7e-29`. Borodino:
854/854, `P(chance) ≈ 1.3e-37`. **Stage returns to 13**, standing on real
evidence this time. Full account: POLICIES.md P70's second same-day
amendment.

**Amended same day (third) — tested omnilingually.** A genuine Russian
Wikipedia fixture (`ru.wikipedia.org`'s own Battle of Borodino article,
fetched live, not translated) joined the two English fixtures, with no
English-tagged prior (determiners/negation/verb-forms) opted in. **Zero
scale violations across three materials, one non-Latin.** Two real,
disclosed performance gaps, not scale failures: order 5 (Nominal)
reproduces the already-known greedy-non-transitive coreference stranding
on Cyrillic AND surfaces a genuinely new failure mode English cannot
produce — a proper name wrongly merged with its own grammatically
inflected case-form (`Евгений`/`Евгения`); order 7 (pronoun binding)
fails with 0 pronouns even ATTEMPTED, because `resolvePronouns` runs on
an English-only closed class (`priors.js`'s `ANAPHORIC_PRONOUNS`,
`lang/en`) — not a weak mechanism, an absent one for this language, named
as real unbuilt work rather than fixed here. "Omnimodally" was scoped
honestly rather than forced: no organ in either repo does semantic or
relational extraction from a non-text modality — `measure.js` (this
file's own "measuring door" section) reads audio only as numeric series,
with no path to a claim or referent, so no MHC order has anything to run
against a non-text file. Full account, every number, the two disclosed
limits: POLICIES.md P70's third same-day amendment.
## The generality gate — specimen-scoped or universal, said out loud (added 2026-08-29) — pointer

POLICIES.md **P71** is the law; eoreader7's **`native/READING-SPEC.md` S31**
is its paired entry there — the same discipline stated once in each repo's
own register rather than duplicated text, because a fix crossing the
fold/native boundary (most of them do, per the ratchet) should not need
translating between two different disclosure languages.

The gate closes a question this document has answered by feel for seventy
entries: whether a fix that made one specimen pass is a corpus-specific
patch or a universal improvement to reading. Three checks, all already
exercised somewhere in this project's own history and now made mandatory
together — cross-domain replay on a structurally-similar but unrelated
corpus (`eval/grain-refinement.mjs`'s politics/hospital-beds pairing is the
reference), a named giver or a derived structural floor rather than a
number fitted to the specimen, and a demonstrated-necessity case built from
material the discovery never saw (`eval/falsification-probe.mjs`'s
six-corpora design is the reference). The gate runs both directions on
purpose: P44's own corrected content-independence check is the standing
reminder that a mechanism performing differently across materials is not
automatically a violation, and reading it as one is the overcorrection this
same gate would otherwise invite.

Every POLICIES.md entry from P71 on, and every READING-SPEC.md entry from
S31 on, states `**Generality:** universal / specimen-scoped /
not-applicable`, enforced going forward by `generality-gate.test.mjs` here
and the matching case added to `native/conformance/reading-spec.test.mjs`
there. Neither test can verify the claim is TRUE — only that it was made.
The measurement underneath it is still real work, done the way
`grain-refinement.mjs` and `falsification-probe.mjs` already did it, not a
label applied for free.

## Metacognition: watching the gap between S1 and S2 (added 2026-08-31) — pointer

POLICIES.md **P72** is the law; this is the short map. The ask: watch the
surprise between what S1 (`runFastPass`) and S2 (`holonicTurn`) generate,
and feed it into the surf and the fold as something learnable, repeatable,
revisable — pursued "as Friston but visited by the Ramakrishna."

**The one-line version.** `metacognition.js` is the watcher P34's own
two-pass turn never had: `assessAgreement` classifies each of S1's
checkable atoms against S2's material into CONFIRMED / CORRECTED /
EXTENDED / UNRESOLVED — CORRECTED only ever fires on a real
`contradicted` relation verdict, never on a bare containment miss, which
is this repo's own "may never manufacture conviction from absence" rule
applied a second time — and `makeMetacognition`'s ledger (the native
`kernel/task-log.js` bundle injected, `hyperlexicon.js`'s own append-only
shape) accumulates the classification per caller-declared cell into a
`standingOf` reading: `unproven` / `established` / `contested`, never
phrased finer than `WITNESS_FLOOR` (reused from `asserted.js`) supports.

**Friston's contribution is precision-weighting an S1/S2 gap this repo
already produces and never watched;** the dark-room failure that produces
by itself is closed structurally — `observe` is a no-op on an all-zero
delta, reusing `hyperlexicon.js::hear`'s own rule, so silence can never
move a standing. **Ramakrishna's contribution is refusing to collapse
UNRESOLVED into CORRECTED** — a claim S2 can neither confirm nor refute is
its own outcome, never smoothed into either bucket, the same discipline
this file's own grounding-ladder section already states in the opposite
direction. `concede` (mirroring `grid.js::concedeEvaluation` exactly) is
how a standing is explicitly revised, never left to drift — bhavamukha's
own shape, read onto an append-only ledger.

**Measured, not asserted.** `metacognition.test.mjs`, 25/25, both guards
pinned as named regressions; full suite 1085/1085, the same 125
pre-existing environment failures by name, zero regressions.
`eval/metacognition-eval.mjs` clears two of POLICIES.md P71's three legs
live: cross-domain replay (the SAME code, unmodified, reads an
error-prone cell `contested` and a reliable one `established` on both
real, byte-verbatim Wikipedia text — reused from `experiments/
mechanical-first-hamlin-johnson.mjs` — and a declared-invented,
zero-shared-vocabulary lab-instrument chronicle) and demonstrated
necessity (on eight atoms from one real error and three real gaps, the
shipped classifier reports 2 corrected / 6 unresolved; the naive
Friston-alone collapse this policy's own header names reports all 8 as
corrections).

**Amended same day — wired in, by direct instruction.** Reading
`holonicTurn`'s own turn-ending sequence closely found both of the
integration note's harder open questions already answered on the
existing return shape (`result.sections[].passages` and
`.relations.claims` were already being read a few lines above, for
`state.lastMaterialChars`/`relationClaims`) — so `holonicTurn` now calls
`assessAgreement`/`observe` directly, gated on `opts.priorPass`, onto one
disclosed starting cell (`"s1-draft"`), reusing the exact `nativeTaskLog`
instance `buildLog`/`store`/`grid` already share. `node --check app.js`
passes, the full suite's 125 pre-existing failures are unchanged by name.
A real browser load could not be verified — this checkout's
`/engine/emergence/tiers.js` 404s regardless of this change (P69's own
disclosed holdout), breaking the WHOLE module graph's link step, with no
way here to isolate the new import chain from that pre-existing gap; every
new line was instead verified against already-live, adjacent code in the
same function. Two open decisions remain: a finer cell taxonomy, and
whether `surfWeight`/`forcesFoldRefresh` are worth wiring —
`metacognition-integration-note.md` carries the full, corrected account.

**Amended again — flow #2 wired ("do it"): suspicion widens the search.**
P72's second amendment is the law; the one-line map:
`metacognition.js::escalationFor` is now `surfWeight`'s one live consumer
— on a `contested` `"s1-draft"` standing, an S1/S2 turn's preflight
consults 5 pages instead of 3, each part retrieves 5 passages instead of
3, and the correction loop gets 2 passes instead of 1 (ceil × the
declared 1.5, always from holon.js/proof.js's own exported constants,
never a prior escalated value — so it cannot compound). Asymmetric by
construction (`established`/`unproven` come back byte-identical — trust
never removes checking), channel-aligned (gated on `opts.priorPass`, the
same gate `observe` uses — measured on S1/S2 turns, adjusts S1/S2 turns),
and never silent (an `escalated` act lands on the reflex ledger). Whether
the flow HELPS — does the correction rate fall once it engages — remains
the named, unrun measured leg; the counts to answer it now accumulate on
the ledger itself. `forcesFoldRefresh` and the gate flow (#1, which would
widen the thin S1/S2 channel) stay deliberately unbuilt.

**Amended once more — the hunt stops on surprise, not on a count.** P72's
third amendment is the law; the one-line map: the user's own stopping
rule ("hunt until what we experienced would not be surprising to a
degree that is a distinction that makes a difference" — Bateson's sign,
P31's own sketched rule, built for the hunt loop) is live in
`gatherPreflightMaterial`: `makeHuntMeter` (metacognition.js) runs the
SAME tier-stack physiology reflex.js/aperture.js already wire, seeded
with the question + discourse + snippets digest, each kept page placed
against the material's own continuation null; a page landing past the
null's own median (`huntSettled` — aperture's live-measured cut, cited
not re-derived) stops the hunt early, a genuinely-moving page keeps it
alive to the ceiling, and a GAP never stops anything. Escalation's
`pagesConsulted` is thereby a LEASH, not a count — contested buys a
longer one, the settling decides the spend. Probed against the REAL
engine organ before wiring (convergent stream settles at rank 0.97/0.98,
alien page censored above, empty page refused as a stop, thin-seed first
page continues, byte-deterministic) — 7/7 in
`metacognition-hunt.test.mjs`, runnable here because this same session
initialized `legacy-eoreader6.1` (suite honestly swelled: 1585 tests
execute, the old 125-name environment set now 42, identical
before/after). Every hunt lands a `hunted` act on the reflex ledger.
Disclosed: a calm turn may stop below the old fixed 3 pages, but only on
a MEASURED settle — never on a gap, never on silence; and this is the
per-arrival gate, not `nul.pattern()`'s licensed pair over the series,
which stays open exactly as aperture.js's own header already names.

**Amended 2026-09-01 — flow #2 proven live, end to end, on the real
page.** P72's live-run addendum carries the numbers; the one-line map: a
scripted stand-in Ollama answering every call with a claim the attached
material contradicts drove the whole chain through the real browser —
turn 1 spent 3 text-mode calls and observed 3 corrected atoms
(`contested`), turns 2 and 3 spent 4 calls each with the correction pass
visibly run twice, and `escalated: cell s1-draft · corrections 2 ·
pages 5 · passages 5` landed on the reflex ledger, read back through the
page's own `/self acts` door. Zero page exceptions; the aperture gate
carried turn 2's summary in the same run. Two harness lessons kept in
P72: a turn sharing no token with the material can never teach the loop
anything (`retrieve()`'s zero-relevance-floor starves the whole channel),
and the `/self acts` table lives in the Folds pane, so a DOM readback
needs `textContent` on the build cards, not `innerText`. Proves the flow
engages and spends — whether it HELPS stays the named, unrun leg.

**Amended 2026-09-01 (independently, reconciled on merge) —
`forcesFoldRefresh` wired too.** The third amendment's own scope note
("`forcesFoldRefresh` and the gate flow (#1...) stay deliberately
unbuilt") is now half closed. `relationClaims`/`result.sections` —
everything `assessAgreement` needs — are already computed before
`refreshSummary`'s own call in `holonicTurn`, so the metacognition block
moved to right before that call (also ahead of the `!state.grounded`
early return a few lines further down — a plain-mode S1/S2 disagreement
now reaches the ledger too, bookkeeping rather than drawing).
`refreshSummary` gained a fourth, defaulted `{forceRefresh}` option and
ORs it onto `exchangeHeldGround`'s own reading, logging its own
`forcedRefresh` act on override. This pass's own first draft also wired
`surfWeight` directly into `gatherPreflightMaterial`, via a bespoke
`weight` multiplier — on merge, found to be the identical function flow
#2's `escalationFor`/`pagesConsulted` already occupies, more generally
(multiple budgets, not one) and better tested; that half is DROPPED, not
merged alongside it. `needsSystem2` stays untouched and named still
open, as both the module and the amendments above already state.
Verified: a real headless-Chromium load over raw CDP (no Playwright
package present, Node 22's native `WebSocket` speaks the protocol
directly) confirmed the page's boot code runs to completion — banner
hidden, composer present — byte-identical between the unmodified
baseline and this change, correcting an earlier pass's own worry that
the `/engine/emergence/tiers.js` 404 blocks the whole module graph (it
doesn't — only the self plane's own surprise meter, its actual
importer). Full suite unchanged by name, zero regressions. Still open,
the same disclosed limit every recent pass carries: no Ollama reachable
in this checkout, so `forcesFoldRefresh`'s live effect on a real turn
could not be shown the way flow #2's own live-run addendum showed
engagement above — only that it now runs safely. POLICIES.md P72's own
fourth amendment and `metacognition-integration-note.md` carry the full
account.

## The hyperlexicon door made ready (added 2026-09-01) — pointer

POLICIES.md **P73** is the law; this is the short map. The question,
verbatim: *"are you reading eot well enough to have a meaningful
hypergraph?"* Measured against the live door's exact configuration
(`eval/hyperlexicon-door-probe.mjs`, two real committed Wikipedia
fixtures): no — 18 of 29 admitted notes carried a closed-class label
(`—and→`, `—of→`, `—to→`…), and 0 of 29 ever reached two witnesses, so
the ≥2-witness ledger block (the one place the accumulated hypergraph
reaches the model) rendered EMPTY on real prose. Then, on the user's
*"assuming that's coming, merge us to gh but ready to leverage those
improvements"*: **half one closed by data** — `priors-data/
pos-prior-eng.json` built by the engine's own `build-pos-prior.mjs`
(UD_English-EWT, 16,654 forms, the documented figure exactly) lights up
`hypergraph.js`'s already-built `posPriorFor` vocabulary gate, which
removes ALL 18 junk labels at extraction (notes 29 → 10, every surviving
connector a real verb); the door's own asymmetric `classifyConnector`
gate is threaded through holon.js and app.js (data-gated on the same
fetch, null-default byte-identical) as the wall behind that wall.
**Half two built as a socket:** `makeHyperlexicon` takes an injectable
`noteIdentity` organ — ID-only canonicalization, first reading's face
wins the display, gaps fall back to surface forms — with the mechanism
proven in `hyperlexicon-identity.test.mjs` (a toy canonicalizer folds two
restatements into one note with two witnesses). The production organ
(referent faces + `sameAct`, both proven in the MINE-1 work) and the
subject-span-debris extractor gap are the two named next levers, not
built here. Disclosed cost: the prior rides every `relationsFor`
consumer — bound 36 → 15, `unheard` 2 → 31 on the probe — the
closes-a-false-binding class (P41/P43), shipped on. Suite 1587/1538/44 →
1593/1544/44, same 44 names, zero regressions.

## The admission door closed by its ground (added 2026-09-01) — pointer

POLICIES.md **P74** is the law (renumbered from P72 on merge — a
concurrent PR landed its own P72/P73 first; the number moved, nothing
about the policy itself did); `eval/results/admission-gate-RESULTS.md`
the measurement; live_priors' POLICIES.md **LP10/LP11** the Ground-repo
side. The one-line version: the hypergraph door's 18-of-29-junk admissions
and its unrunnable quality gate were **a 404 masquerading as three missing
features** — the POS prior's mount pointed at a gitignored dir inside an
uninitialized submodule, so `hypergraph.js`'s own already-wired
vocabulary-level POS gate (P68) had never once run. Shipping the ground
(the `/priors-data/` mounts now fall back to live_priors' committed
POSPrior@1, one declared eng→en alias at the seam) takes junk 18/32 → 0/19
with the door still ungated; the door's lens (classifyConnector, now
threaded app.js → runHolonicTask → runPart → admit, refusals returned as
`hyperlexiconTurnedAway`, never read-and-discarded) is defense-in-depth —
alone it catches 18/32 with zero real verbs lost, but `to`/PART slips its
declared Thrax scope.

**The corroboration half was refuted before it was built:** folding note
identity by referent face + lemma yields 0 joins on the real pages, and
the flagship pair fails by name — `sameLemma("withdraws","retreated") =
false`. Withdraw≠retreat is synonymy: the ledgerBlock's emptiness is the
semantic tier's problem (the witness machinery, P32), not identity
folding's — measured under live_priors LP11's own law, earned the same
day: a loosened key is judged on its marginal admits (there: 0-56%
accurate, 0/8 in English), never aggregate coverage.

Named absences: turnedAway reaches no UI yet; explore-server.mjs's mount
edit is syntax-checked only (that server cannot boot here — P69's
disclosed submodule error); subject-span hygiene (the handoff's lever 3)
is untouched upstream extractor work.

**Amended 2026-09-01 — the two committed priors reconciled.** P73 (this
repo, train-only, 16,654 forms) and P74's companion (live_priors,
train+dev+test with sha256 provenance, 19,341 forms) had shipped two
DIFFERENT builds of the same POSPrior@1, and the serving chain's
availability tier preferred the smaller. `priors-data/pos-prior-eng.json`
is now live_priors' artifact byte-for-byte (drift = one hash comparison),
every consumer reads `forms` alone, and the probe's numbers are identical
after the swap. Full account: POLICIES.md P74's 2026-09-01 amendment.

## Pronoun/anaphora as an omnimodal function — the medium axis was already right; the language axis is now declared (added 2026-08-30) — pointer, nothing here changed

Asked directly whether the recent pronoun/anaphora work (P38, P66) actually
conforms to how this project wants a capability built as an omnimodal
function. It splits into two different axes, and only one had been
addressed.

**The medium axis was already correct, verified by reading the code rather
than the changelog.** `eoreader7/native/kernel/contest.js` (P66) genuinely
extracted the decision procedure — co-presence raises the bar, never the
score; test the lead against the material's own permutation null — into a
kernel module with zero text vocabulary, exactly the eoreader7
`READING-SPEC.md` S6/S16 law ("the kernel never speaks a medium's
grammar... the kernel is omnimodal"). This is enforced MECHANICALLY
(`contest.test.js` reads the module's own source and fails if `sentence`,
`pronoun`, `surface`, `token`, `word` or `text` appears in it) and exercised
on two real non-text synthetic cases in the same file (an unlabelled gaze
across two faces in a film shot; an unattributed motif across two
instruments in a bar of music). It is a live production dependency
(`native/assemblies.js`, `adapters/text/pronouns.js`), not an orphaned
module, and both new regimes it unlocks are honestly measured and shipped
default-off because they do not yet improve the actual reading — a
disclosed negative result, not a silent no-op.

**The language axis had not been.** Both pronoun mechanisms
(`resolvePronouns`, `resolvePronounsByActivation`) ran a hardcoded English
pronoun regex and gender table against whatever text arrived, with no
`language` parameter anywhere. Non-Latin material happened to degrade
safely (P70's omnilingual MHC test: Russian correctly gets zero pronoun
attempts) but that safety was an ACCIDENT of script mismatch, not a
declared decision — this codebase already has the correct template for
exactly this class of gap (`createLemmatizer({ language })`, defaulting to
English only when unspecified, the fix "it needs to work for Ancient
Greek" section above), and pronouns.js had not been brought into it.

**Closed in eoreader7, not here.** `native/READING-SPEC.md` **S39** is the
law and carries the full account: a small per-language registry
(`PRONOUN_PRIORS`, one entry today) replaces the bare constant, all three
functions take a `language` parameter defaulting to `"en"`, and a declared
language with no registered prior returns one typed gap
(`no_pronoun_prior_for_language`) for the whole call rather than a silent
English attempt or a pile of per-sentence non-matches. Byte-identical for
every existing caller (none of which pass `language`); 255 native tests
passing both before and after (same pre-existing failures), 13/13 in
`pronouns.test.js` (9 pre-existing plus 4 new). **Nothing in this repo
changed** — `app.js`/`hypergraph.js` import `resolvePronouns` from
`/engine-v7/adapters/text/pronouns.js` and omit `language`, so they get the
unchanged default. No second language's pronoun table exists yet; this
closes the honesty gap, not the coverage gap.

**Corrected the same day — "add a second language" was the wrong target;
the arrangement itself was still English-shaped.** User's own redirect,
twice: first, don't add French next — it shares English's SVO typology and
would pass by accident, never testing the real gap (`relations.js`'s own
header: slot-finding is POSITIONAL, "the token immediately FOLLOWING a
candidate referent surface" — a fact about word order, not vocabulary, and
it fails outright on case-marked languages like Latin, Russian, Finnish,
several of which are already in `live_priors`). Second, correcting the
proposed fix itself: a case-marking STRATEGY that still recovers "subject"
and "object" by a different signal is the same borrowed grammatical
category surviving through a new mechanism, not removed. **POLICIES.md
P76** is the law: `hypergraph.js`'s edges and claims are keyed literally
`.subject`/`.verb`/`.object` at four construction sites — the grammar-lens
section's own stated principle ("the arrangement is earned, the SAE
reading is a declared overlay") was never true of the STORED shape. Two
ordered ends and a label is already typologically neutral; what a language
signals is only WHERE to look for them, never which one is the agent.

**Shipped additively, by explicit choice over a full rename.** `arrangementOf(t)`
maps `{subject, verb, object}` onto `{end1, label, end2}` under their
earned names, wired at all four sites so the mapping cannot drift the way
four independent literals eventually would. `subject`/`verb`/`object` are
untouched everywhere; the neutral fields sit beside them, read by nothing
yet. The full rename this closes part of (P56's own grammar-lens section:
"~120 call sites... not attempted without confirmation") is now 221 across
22 files — larger than last measured, and still not attempted: migrating a
consumer off the SAE names is real, scoped, future work, one file at a
time. Verified against the real native engine organs (`arrangement.test.mjs`,
6 cases, the `hyperlexicon-stance.test.mjs` separate-file precedent since
`hypergraph.test.mjs` cannot load in this checkout): full suite
1060/933/125 → 1066/939/125, zero regressions. A real second-typology
extractor (case-marking, for a language like Latin already in the corpus)
is named, real, and unstarted — it should build against this neutral
shape, never against `subject`/`object`.

**Built and measured the same day — the second typology is real, not just
named.** `eoreader7/native/adapters/text/relations-case-marked.js`
(READING-SPEC.md S40) reads grammatical role off Latin case morphology,
not position — a genuinely different mechanism from `relations.js`'s own
positional slot-finding, proving the neutral arrangement is REQUIRED for
a language like this, not merely tidy. Built against real UD_Latin-Perseus
treebank data (fetched live, CC BY-NC-SA 2.5, committed as a fixture),
measured against 380 held-out gold sentences never used to build its case
prior: matches a real verb-object-subject specimen ("possedit cetera
pontus," the sea possessed the rest) exactly, using zero information
about word position — the actual proof positional extraction cannot give.
Modest, honestly disclosed precision/recall (end1 vs gold nsubj: 0.26/0.08;
end2 vs gold obj: 0.33/0.12) — subject detection is genuinely harder than
object detection because Latin's nominative case is the least
systematically marked, a real fact about Latin morphology, not a defect
in the organ. Four real bugs found by measuring against gold rather than
reasoning about it, all disclosed in S40 and `eval/results/
latin-case-marking-RESULTS.md`.

**Wired into this repo via `hypergraph.js::makeCaseMarkedRelationReader`**
(POLICIES.md P77) — a SEPARATE entry point from `makeRelationReader`, not
a branch inside it, because the English pipeline's referent-index/
assertion/connector-class machinery all assume the positional extractor's
own edge shape. What's shared is the actual point: every edge carries
`end1`/`label`/`end2`, never `subject`/`verb`/`object` — Latin's oblique
cases have no honest 1:1 mapping onto English argument structure, and
this reader refuses to force one (a `case`/`number` detail rides each end
instead). Verified against eoreader7's real organs, byte-accurate spans
confirmed against source bytes: `case-marked-relations.test.mjs` (5
cases). Full pipeline parity with the English reader (referent
resolution, assertion tiers, connector-class) is real, scoped,
unattempted future work — disclosed, not silently implied done. Full
suite: 1066/939/125 → 1071/944/125, zero regressions.
`LatinCasePrior@1` itself moved to `live_priors/derived-priors/
case-priors/` the same session, matching `act-priors`' own precedent
exactly ("a received lexicon is content, not app logic") — see
`live_priors`'s own README there and eoreader7's `READING-SPEC.md` S40
amendment for the full move.

**The consumer migration named above as remaining is now finished; the
wipe is blocked on something bigger.** POLICIES.md P76's own amendment
carries the full account — the short version: every one of the nine
files named as unmigrated (`term.js`, `capacity-runner.js`, `holon.js`,
`app.js`, plus `dialogue-graph.js`/`hl-acquire.js`/`hyperlexicon.js`/
`predigest.js`/`explore/explore.js`, confirmed out of scope) was traced
to a real conclusion, verified by full-suite diff at every step
(1071/944/125, zero regressions throughout). A final repo-wide sweep for
every `makeRelationReader` importer beyond the originally-scoped nine
found `capacities.js`/`proxy-runner.mjs` (clean) and — the actual
blocker — `hypergraph.test.mjs` itself: 81 lines across 1,231 directly
assert `.subject`/`.verb`/`.object` on real engine output, and that file
cannot load in this checkout (`legacy-eoreader6.1`, an uninitialised
submodule pointing outside this session's own GitHub access scope), so
those 81 assertions cannot be migrated and verified by running here. The
wipe — removing the old fields from hypergraph.js's four construction
sites — needs a checkout where that submodule resolves; nothing else is
in its way.


## Working with what answers back (added 2026-08-25) — the capacities, not a score

P78 in POLICIES.md is the law; this is the map. The pass began as a
battery — a ladder scoring whether this instrument's interaction reached
order N — and the user's correction is the whole reason the shape is what
it is, verbatim: *"are you saying the code is examples of mhc? I want the
app to have these capacities."* A thermometer is not a capacity. The
machinery turned out identical either way; only its consumer changed.

**Where they live.** `interact.js` (pure, counterparts injected — the
cast.js pattern) holds seven capacities, Commons's orders 5-11 read as
requirements on a task rather than as a scale: `conduct` (name an
affordance, attribute an effect, compute a later act from what came back,
predict before acting), `verifyLoop`, `corroborate`, `enumerateSlot`,
`depends`, `orderMatters`. `interact.test.mjs` — 32 cases, process-free
and organ-free on purpose, the same reason mhc.test.mjs states for itself.

**What the app was actually missing, and it was not subtle.** Every door
this repo owns fires ONE act and reads ONE response — `/run`, `/act`,
`.load`, `pip install`. There was nowhere to say *do this, read what came
back, then do that with it*, and nothing anywhere predicted an effect
before causing it or established that an effect depended on the act that
appeared to cause it. `openRuntime` (term.js) is the missing primitive:
the same boot/exec/done protocol every worker already speaks, held OPEN
across acts. The interactive prompt had a held session; the instrument did
not, because `spawn()` is wired to the drawer's DOM.

**The battery is now a SECOND CONSUMER, never a parallel copy.**
`mhc-interact.js` imports `runPlan`/`streamOf`/`declareCounterpart`/the
capacities from `interact.js` and re-exports them. A battery that scores
machinery nobody runs has measured nothing that matters — and two
implementations of one fact is the drift class this file's own postmortems
keep naming (P22's `Array.find`, P24's runtime-type ternary, P39's deleted
`landCell`).

**Four rules, each earned by a live failure rather than reasoned into
place** (full text in P78): a refusal is information, never an exception;
an effect is read across the WHOLE run, never off its last response (an
insertion control breaks any last-response predicate, which refused a
sound item before this was understood); a control that decides a
correctness claim does not depend on a seed (the insertion sweep was
sampling one position and could miss the one that mattered); and
provenance, not position, locates the computed act (reordering moves it,
and a positional goal then reads whichever act landed there).

**Rung 7 is proven, not assumed.** `verifyLoop` re-runs a script open-loop
and reports whether the acts genuinely differed. A "closed loop" whose
computed act comes out identical is not a loop — a real finding about the
script, reported as `loopReal: false`, never an error.

**Experiments do not land on the record.** `actsCounterpart` opens a
SCRATCH grid log every time, never the shared app-wide `gridLog`: an
intervention runs its plan once per draw plus once per insertion position,
and burying the real append-only record under an experiment nobody asked
to keep is not what that record is for. What is learned lands; what was
tried to learn it does not.

**The doors.** `interact <counterpart> | <act> | <act>` (`$N` is the Nth
response — that substitution is what makes an act computed rather than
typed; `=> text` declares an expectation before the act runs) and `depends
<counterpart> effect:<text> omit:<n> placebo:<act> | <act> | ...`.
Counterparts derive from `ROSTER` plus the act grammar, so a runtime added
there is workable-with with no edit here. Grammars are pure and exported
(`parseInteract`/`buildScript`/`parseDepends`), and `buildScript` is
tested by CONDUCTING against an in-memory counterpart rather than by
asserting what it built.

**Evidence.** `eval/mhc-interaction-battery.mjs` runs the scoring consumer
against three genuinely different REAL counterparts — this repo's act
grammar over the engine kernel, a real `python3 -i` subprocess, a real
`sh` subprocess, no model anywhere — and all three reach stage 11 with the
scale holding: zero orders changed their order-hood with the counterpart.
Full suite 608/116 before, 672/116 after: the same 116 pre-existing
environment failures this checkout carries (missing vendored `sql.js`,
model files, `monaco-editor`, sibling-engine import paths), confirmed via
`git stash` against this exact worktree, zero regressions.

**Disclosed, not silently absent.** A live model satisfies the contract
and is deliberately NOT wired — scoring one re-opens P44's confound (both
sides act, so the number is about the pair) and needs a scripted control
of declared order beside it. The web organ, the database fold and the
GitHub organ all satisfy the contract and have no adapter yet; each is one
`open()` away, and naming them is not the same as having written them.
Orders 12 and above carry no capacity: `interact.js` stops at 11.

## Kinds, and the resolution test (added 2026-09-01) — pointer

eo-constitution **II.23** (19th amendment, sealed, enforced by
`conformance/resolution.test.mjs`) is the law; **P79** here and **S41** in
eoreader7 are the two registers; `kind-induction-finding.md` and
`run-splitting-finding.md` carry the measurements.

**The one-line version.** II.10 governs the NULL (does it differ in exactly
one axis); **II.23 governs the STATISTIC** (does it move when that axis
moves). They fail independently. A statistic earns its use by a control
**built to fail**, named as one — a run reporting only successes has not
demonstrated anything, because a statistic returning "significant" for every
input returns it for the true ones too.

**Three failures in one session, all on one specimen**, and the law existed
for the first one already: a basin chosen for cohesion placed against random
subsets of its own population (II.10's *selection is an axis*, broken anyway
— which is why II.23 ships with a test rather than as prose); a direction
assumed rather than derived (redealing makes entities MORE alike, so
"observed beats the null" was the wrong inequality); and a commensurable
null whose statistic could not resolve the claim (one foreign member added
to a cohesive ten-set moves a set statistic by less than its noise, so every
candidate passed). **The enforcement test caught itself**: version one keyed
on assertion shapes, and a mutation run left it passing with every real
control stripped.

**`kind-standing.js`** is the reference null-spender and the registered
seam: what KIND of thing a referent is, from company alone (the token before
and after each mention — Firth, P31), counts not sets, with the POPULATION
as the null and nothing redealt. `foldPermitted` refuses a fold only on
positive evidence of different standing; **`unknown` allows**, because a thin
profile is a fact about the reader, not about the referents — the
withhold-vs-convict rule the grounding-ladder section already states, one
register over.

**Two findings worth not re-deriving.** Places are a MARKED kind; "person"
is the unmarked default and is therefore undetectable against its own
background (p≈0.163) — that is a fact about the material, not a weak
mechanism. And the cast/Entity relation: **cast members are referents**,
while the Entity terrain types the ACT of first assertion (INS is
Existence-domain, SYN is Structure-domain) — P58's cube-classifies-moves
law. Cast members are what an arrangement's ENDS resolve to.

**Not closed, named:** `kind-standing.js` has no caller — the live cast
still folds Castle Dracula into Count Dracula. East/West Cliff is out of
reach (too few mentions; absence of evidence, pinned as a test of the
limit). And the SVO wipe stays open: `arrangementOf` (P76) gives
`end1/label/end2`, the live table now uses it, and 221 call sites do not.


## Three modules share the name "hyperlexicon" (added 2026-09-01) — pointer

They are not the same thing and two entries above had conflated them:

| module | what it is | law |
|---|---|---|
| `the-fold/hyperlexicon.js` | the **assertion ledger** — what the material was heard to say, INS first sighting / SYN re-sighting, witnesses and spans unioned, append-only | P57 |
| `the-fold/hl.js` | the **adapter** to HL, whose logic moved into the engine | P37 |
| `eoreader7/native/kernel/hyperlexicon.js` | the **chemistry table** — which affordances license composition, giver required | HL amendment |

**Where the assertion ledger actually stands, measured.** It is live:
`app.js` builds it, `state.hyperlexiconLog` persists it across turns, and
`holon.js` threads it per part. Its ONE path to the model is `ledgerBlock`,
gated at `witnesses.length >= 2`.

That gate is nearly always empty, and it is a structural starvation, not a
bug in the gate. On a whole real book (Dracula, end to end): **11,624 notes
at one witness, 260 at two or more — 2.2%.** P73's own probe measured
**0 of 29** on Wikipedia pages. So the ledger accumulates real, correctly
typed, append-only knowledge that almost never reaches a prompt.

**The cause is identity, and the seam for it already exists.** A note's
identity is the exact `(subject, verb, object)` triple, so *"The Russian
army withdraws"* and *"Imperial Russian forces retreated"* are two notes
forever. P73 built the injectable `noteIdentity` organ for exactly this;
P74 then measured that referent-face + lemma folding gives **0 joins** on
real pages, because `sameLemma("withdraws","retreated")` is false — this is
**synonymy, not morphology**. The seam is built and the organ that would
fill it is not.

**A hypothesis worth testing, not a claim.** `kind-standing.js` (P79)
measures what a referent IS from its distributional company alone. Two
labels with near-identical company are plausibly the same act — which is
the same shape as the missing `noteIdentity` organ, one slot over
(labels instead of ends). Untested, and it must be tested the way P79 was:
with a control built to fail, per II.23.

**One measure disagrees between two callers, deliberately noted.**
`holon.js` counts `witnesses.length` (cross-SOURCE corroboration — two
chunks of one file are one perspective, `corroborateAtoms`' own rule).
The Dracula driver counts `max(witnesses, spans)`, so a fact heard twice
in ONE book counts. Neither is wrong; they answer different questions, and
the 260-vs-0 gap between them is entirely that difference.

## The hyperlexicon's real bottlenecks, in order (added 2026-09-01, second pass) — pointer

The "three modules" section above named exact-triple identity as the
starvation cause. **Measured same day: identity is the SECOND cause.** The
first was that the door's diet was garbage — the POS grammar gate had run
dark in `live_priors/scripts/eot-digest.mjs` for its whole life (one wrong
word in a filename: `pos-eng.json` for `pos-prior-eng.json`), so 12,696
Dracula edges arrived with `the`/`and`/`of`/`he` as labels and a quotation
mark as a subject, and the door turned away zero. Gate lit: 6,503 edges,
labels real verbs. eo-constitution **III.5** (20th amendment, sealed: a
typed gap no test reads is a report, not an enforcement) and live_priors'
`scripts/eot-digest.test.mjs` are the law and the assertion.

**One refutation worth not retrying:** act identity by distributional
company is DEAD — `saw/wrote` cosine 0.744 beats the genuine synonym pair
`looked/gazed` at 0.585; company at ±1 token measures syntactic frame, not
act. The control (II.23) is what caught it before it shipped.

**The order of remaining levers, each gated on a measurement:** (1) subject
-span hygiene, upstream in the extractor — ends like `"a dark"`/`"'e
never"` make any identity organ pointless (P74's lever 3, still the
biggest); (2) then `noteIdentity` ends through the earned referent standing,
with `segmentation.js`'s cursor-honest `correct()` re-keying notes when a
referent fold lands; (3) label identity stays `sameLemma` only — synonymy
is open, disclosed, and not approximated by company; (4) `kind-standing.js`
as the fold gate. Corroboration held at ~2.3% before and after the gate —
the identity work only pays once the ends are real.


## The corroboration bottleneck, third revision (added 2026-09-01) — pointer

`reading-recall-finding.md` carries the measurements. The "bottlenecks in
order" section above is superseded on one point: **identity is refuted as
the corroboration lever.** The P73 `noteIdentity` seam was filled with the
earned referent organ and measured FLAT — within-book (Dracula, three arms
byte-identical at 0.4%) and cross-document (the Borodino pair: two pages
about one battle, 727 notes, ZERO exact restatements, one near-verbatim
join that the deranged-alias control also found, so attributable lift
zero). Fiction re-mentions referents, not propositions; encyclopedic prose
restates propositions in different words. The remainder is PARAPHRASE —
the same wall MINE-1's `unbound` plateau and P74's withdraw/retreat
verdict already named — and the licensed tool is the witness tier (P32)
pointed at the door's >=2-witness gate: "does this page state this note?",
asked of a small model, verdict derived mechanically. Also recorded there:
the sidecars measured stale and regenerated `--fresh` (41.4% -> 27.9% junk,
excerpt-scale by design), and a retrieval-loop probe DISCARDED by its own
broken control before its numbers became claims.
