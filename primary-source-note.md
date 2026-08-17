# The primary-source walk — integration note

*2026-08-17. The organ exists and is tested; this note is for the sessions
that own app.js, explore/explore.js and POLICIES.md, so the wiring lands on
their terms. Nothing in here is wired yet.*

## What exists now

**`primary.js`** (pure, no network, 14 conformance tests in
`primary.test.mjs` against the real Borodino bytes in
`eval/fixtures/wikipedia-battle-of-borodino.html`):

- `extractCitations(html)` — a saved Wikipedia page's RAW HTML face →
  outbound citations `{url, host, text, index, archiveUrl?}`, document
  order, deduplicated; wiki-family links skipped; `web.archive.org/web/…`
  wrappers unwrapped with BOTH faces kept.
- `rankPrimary(claim, citations)` — lexicographic, no tuned weight
  anywhere: claim-word overlap count (grounding.js's one fold, both sides),
  then the declared class ladder (`government, academic, identifier,
  archive-library-museum, pdf-document, dated-document, other`), then the
  article's own citation order.
- `snipClaim(claim, faceText, {facePath,url,host})` — the assertion-bearing
  sentences of a saved text face, VERBATIM, each `{text, start, end,
  facePath, url, host}`; slicing the face at `[start,end)` reproduces the
  text exactly (P5.2). An empty list is a result, not an error.
- `foldPrimary(claim, {citationsFound, consulted})` — the typed, counted
  verdict: `stated-by-primary` / `unstated-by-consulted` / `not-consulted`.
- `isWikipediaHost(host)` — the chaining seam (below).

**`POST /api/web/primary`** on explore-server.mjs:
request `{ claim: {kind, text, tokens, sentence}, wikiPath }` where
`wikiPath` is a saved page under `web/pages/` in the FILE API's path space
(a history entry's `rawPath`, exactly). The route extracts, ranks, fetches
the top `PRIMARY_SOURCES_CONSULTED` (= proof.js's `PROOF_PAGES_CONSULTED`,
3) SEQUENTIALLY through the same `fetchAndKeep` pipeline as `/api/web/fetch`
— every fetch lands in `web/history.jsonl` and on the record like any other
— snips the claim against each face, and answers
`{ verdict, citationsFound, read, failed, statingHosts, independence,
consulted: [{url, host, structuralClass, citation, title?, textPath?,
textChars?, snipsFound?, snips?, archivedCopy?, challenge?, gap?}],
sentence }` with every failure typed (`not-present`, `censored-above`,
`beyond-reach` for a face with no text — a PDF's bytes are kept and named,
never judged silent).

## How the proof pipeline should chain it

`seekProof` (app.js ~2593) already fetches pages and reads their faces.
The seam is one predicate: after a consulted fetch resolves, if
`isWikipediaHost(hostOf(f.entry.finalUrl))`, that entry's `rawPath` IS the
`wikiPath` the primary route wants. Wikipedia stating a claim is a weak
perspective by construction (an encyclopedia is testimony about testimony);
the honest move when the walk's stepping stone shows up in a proof result:

- **Offer, per claim:** a button on the proof row, same posture as the
  existing per-claim "seek proof online" — one click, one authorization,
  one bounded walk. Copy below.
- **Auto-run** only under the same standing `web` toggle that authorizes
  automatic proof-seeking, and the bound must stay visible: a turn's
  disclosure should state targets × pages the way it already does, plus
  "primary walk: up to 3 more pages per Wikipedia stepping stone". Do not
  invent a second toggle; this is the same consent class P13 already names.
- The walk's verdict does not REPLACE the proof verdict; it is a further
  perspective, appended: a claim can be "stated by 2 of 3 pages read" AND
  "stated by 1 primary source the encyclopedia itself cites". Count them
  separately; never sum them (a Wikipedia article and the source it cites
  are not independent perspectives — the article cites it).

## How the UI should phrase it (plain language, assembled from fields)

Every sentence below is BUILT from the response's computed fields — the
conversational surface ("let me see if I can confirm that…") is assembled
from these results by the same mechanical narration the turn already
streams, and is NEVER prompted as a style. The model neither produces nor
sees this walk; instructing a model to sound like it is checking is the
exact failure L5/P2 exist to prevent. The mouth speaks after the organ has
counted, and only what it counted.

- **The offer** (proof result shows a Wikipedia host):
  "Wikipedia cites {citationsFound} outside sources for this; read the top
  one: {consulted[0].host}."
- **A snip landed:**
  "Wikipedia cites {citationsFound} sources for this; the top one,
  {host}, states: “{snips[0].text}” [saved copy]" — the saved-copy link is
  `pageFaceUrl(EXPLORE_BASE, textPath)` plus the snip's `#start-end`, the
  same re-openable address shape material refs already use.
- **Read but silent:** "{host} was read and does not state it — a result,
  not a refutation ({snipsFound} of its sentences state the claim; face
  kept at {textPath})."
- **Thin face:** when `textChars` is tiny (the live run measured
  muse.jhu.edu and doi.org serving ~206-char scripts-only shells), say so:
  "{host} answered, but its readable face is only {textChars} characters —
  likely a bot shell, not the document." Show the number; do not invent a
  threshold for "tiny" (P4) — the count speaks.
- **Beyond reach:** "{host}'s source is a PDF; its bytes are kept at
  {rawPath}, but snipping needs a text face this instrument does not have
  yet." (PDF text extraction is named future work, not implied.)
- **Fallback disclosed:** when `archivedCopy` is true: "the original link
  refused; this is the archive.org copy of it."

## The verdict phrasing — never stronger than counted

"Stated by the primary source at {host}" with the snip's address — that is
the ceiling. With several: "stated by {statingHosts.length} of the
{read} primary sources consulted ({independence.hosts} distinct hosts)".
The `independence.basis` residue rides every verdict: two citations may
trace to one upstream work, and this instrument does not test that. The
words "true", "confirmed", "verified" never appear; `primary.test.mjs`
pins that for the fold's own sentence, and consumers must not re-introduce
them in their templates.

## For the POLICIES owner

The route stands on P13's proof-seeking amendment (pages chosen by a saved
article's ranked citations instead of ranked search results — same bound,
same sequential discipline, same record, same typed gaps). P13's base text
says "the one page a request names"; a one-sentence amendment in P13's own
appended style would make the standing explicit rather than inherited.
Suggested wording: *"the primary-source walk (/api/web/primary) reads up to
PRIMARY_SOURCES_CONSULTED pages named by a saved Wikipedia page's own
citations, ranked on the claim's words — each fetch recorded, historied,
and clearable exactly as if the user had named it."* Enforcement is already
in place: `primary.test.mjs` (the pure half, including the seam test that
primary.js holds no egress call) and the sequential bound in the route.

## Residues, disclosed

- Citation text comes from regex walks over rendered markup (quote-aware,
  web.js's ATTRS); a nested list item can truncate a citation's CONTEXT,
  never its URL. The `<cite>` element wins when present, and CS1 renders
  one for every bibliography entry.
- The class ladder's host lists (identifier hosts, library hosts) are
  declared classifications, extensible by edit; they are not weights and
  there is nothing to tune.
- A JS-shell page defeats the snip the same way it defeats every fetch in
  this repo — the face says almost nothing and `textChars` says so. That is
  the honest limit of reading without executing pages, which P13 does not
  allow anyway.
