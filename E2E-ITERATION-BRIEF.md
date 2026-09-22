# E2E conversation drive — live findings log

Started 2026-09-22. Driving extended back-and-forth conversation against
the real running page (real engine, real gemma2:2b), logging every real
weirdness found — fixed same-session where the fix is small and clean,
named as open debt otherwise. Each entry: symptom → cause → fix (or why
not fixed yet).

## Fixed this session (before this log started)

1. **Canned greeting fired on real first questions, not just chit-chat**
   — removed entirely per user direction (`app.js`, `send()`).
2. **Socratic subject-extraction produced broken grammar** on comparative
   claims ("...move someone on remote work is more productive than office
   work") — `topicOf` generalized to split on the copula rather than a
   closed adjective list; a raw-clause fallback now wraps as "the claim
   that ..." (`socratic-epistemic.js`).
3. **Stale Socratic dialogues hijacked unrelated later turns** — a
   dialogue with no closing event stayed "active" through any number of
   disengaged turns, so "tell me a story about a lighthouse keeper" got
   answered as if it were replying to an old diet-claim examination.
   Fixed: any turn that reaches the end of `socraticRoute` without
   engaging the open dialogue marks it `resolving`; a resolving dialogue
   can never claim a later non-question turn as its answer (`app.js`).
4. **The engine now streams** (draft text + live progress notes) instead
   of a static "thinking" — `er7-client.js`, `proxy.mjs`.
5. **Small model fabricated personal experience** ("I've read 73 books...",
   a fake weekend) when asked ordinary personal-shaped questions —
   `PERSONAL_EXPERIENCE_RE` in `proxy-runner.mjs` now answers these
   mechanically, never generated.
6. **The boot-time "restored source" disclosure was an unprompted chat
   message** — removed per user direction; the underlying `meta.legacy`
   tag is untouched.

## In progress

Driving further now. New entries appended below as found.

7. **The streaming thinking-line note was hand-cut to 90 chars, mid-word**
   ("Still learning from … (135 salient, 41 no…") — the client's own
   client-side slice for the thinking DISPLAY, not the header status
   strip (which has its own CSS ellipsis and stays short by design). Fixed:
   `paintMessageThinking` now gets the full line; only `$("status")`, the
   one-line header strip, keeps the short form (`app.js`).

8. **Asking the identical question twice in one conversation re-spends the
   whole web preflight** (a fresh search, a fresh fetch, a fresh "learning
   from…" read of the same page) instead of reusing what was already
   established with provenance moments earlier. Traced to a real, EXPLICIT
   design decision in `gatherPreflightMaterial`'s own comment ("The digest
   is turn-scoped and was never kept") — a preflight fetch is deliberately
   never written to `state.sources`, so there is nothing durable for a
   later identical question to find. This is not a bug in `admission.js`
   or the hyperlexicon (both would gladly reuse an already-loaded source —
   there's genuinely nothing loaded to reuse). **Not fixed this pass** —
   this is a real, disclosed architectural gap, not a quick patch: closing
   it means deciding whether a preflight-fetched page should become a
   durable, reusable source (with the follow-on questions that raises —
   staleness, per-conversation vs per-workspace scope, how it interacts
   with the ~2% corroboration ceiling this codebase has already measured
   and extensively documented under P73/P74/P83/P182) rather than staying
   turn-scoped by design. Flagged for a dedicated pass, not rushed here.

## Dispatched to background subagents (2026-09-22, isolated worktrees)

Three larger investigations spun off rather than rushed inline, each with
its own worktree so it doesn't collide with the live drive above:

- **Instant recall from provenance** — item 8 above (the same question
  re-spends a full web preflight every time; `gatherPreflightMaterial`'s
  digest is turn-scoped and never kept).
- **Broken grounding chips** — user report, live: the citation/grounding
  marks on answer sentences aren't appearing/working right now, on the
  running app. Needs its own reproduction + `git log` check for a recent
  concurrent regression in this exact rendering path.
- **Prompt growth across a conversation** — user report, live, watching
  Heimdall's own monitor: the actual prompt hitting the model appears to
  grow with every turn rather than staying bounded. `app.js`'s own
  `chatHistory` slice is capped at 8 (checked), so if real, the growth is
  elsewhere — most likely the ever-growing hyperlexicon ledger block or
  an engine-side prompt-assembly path P232's Kondo tidy-pass doesn't
  reach everywhere.

Each agent was told to reproduce live (not just reason from the code),
measure before assuming a bug, fix narrowly, run the real test suites,
and write its own CLAUDE.md/POLICIES.md entry in this repo's own style.

## Fixed and committed (2026-09-22, second wave)

9. **`humanizeEngineError`** — a saturated-queue 429 (or any other engine
   failure) shipped its raw JSON body straight into the chat at all four
   `[engine error: ...]` display sites. Fixed, committed (the-fold `fceedf6`).

10. **proxy-runner.mjs's streaming final chunk** now carries `text`/`factGate`
    so a mechanically-answered turn (no content deltas) still has something
    to render. Committed (eoreader7 `524c7aa`, private-index commit — see
    below for why).

## Item 8 fixed: a read page is a stable sub-assembly (the watchmaker reading)

User direction: "think deeper on how to make this a good watchmaker so
that it fails least problematically; each level needs to create useful
enough info." Simon's two watchmakers — Hora builds from stable
sub-assemblies and loses only the current one to an interruption; Tempus
builds each watch in one piece and loses everything. Read level by level,
the turn is mostly Hora already, with one Tempus joint:

- **Void declared** (question alone) — lands on the record before any
  material (P105). Survives everything downstream. Useful alone: the
  shape of the answer that was needed.
- **Search** — the snippet digest is mirrored to the record, and it is a
  chunk in the turn even when every page fetch fails. Survives a fetch
  failure. Not kept past the turn (a skim, not a reading; left that way).
- **Hunt / fetch / read** — each page's bytes are kept server-side
  (web/pages), and the page is chunked and read into the turn. THIS was
  the Tempus joint: the reading was turn-scoped, so a failure one step
  later (the model 429'd after "settled after 2 page(s)", measured live)
  threw the search and the reading away, and the retry redid both; and
  the identical question asked twice searched twice — the second search
  drawing a different, off-topic page ("Chateaubriand Les Premières
  Années" for "qui a écrit Les Misérables ?").
- **Retrieve / draft / check / AnswerRecord** — the record is durable
  (P100) but only exists if the draft succeeded.

**The fix (POLICIES.md P245 — the recall subagent's version, reconciled
into main over my own narrower draft):** `keepPreflightSource` keeps each
fetched page as a source the moment it is read (the sub-assembly is
committed when complete, not at the end), with the page's OWN passages —
the chunks this turn actually read, so cited addresses and later-held
addresses cannot disagree — and a `state.preflightSources` row carrying
url, host, title, retrieval date, the conversation, and the QUERY that
fetched it. What a kept page is NOT: no `sourceOrigin` (no P235
exemption), no OPFS write (a cache, not a document), no read-on-arrival
(the preflight just read it). Dropped on `switchConvo`/`closeConvo`;
disclosed in the Sources row as "found while answering — not attached by
you"; names keyed to the URL so a page re-ranked by a later search is
recognised as already held.

**The part my draft was missing, found by the agent running it live:**
admission alone does NOT hold. With three Les Misérables pages kept,
"what is the boiling point of tungsten?" CLEARED admission against a
69,000-char Wikipedia article — a page that long carries almost any
ordinary word pair together in two paragraphs, the recurrence admission
trusts outright and never nulls (P234) — so `live` was non-empty, the
preflight never fired, and the answer was "not stated in the sources I
looked at". That is exactly the tungsten shape in the screenshot above.
`preflightStillOnTopic` is the low bar of a two-tier gate: a page fetched
for an earlier question is a candidate only if this question shares one
content word with the QUERY that fetched it (asked of the query, never of
the page — a long page's own text is what cannot discriminate);
admission's floor/company/null stays the high bar and still runs after.

Also fixed in the same pass (pre-existing): the named-URL branch's
`live = liveChunks()` re-read discarded admission's own refusals — P190/
P200/P234 silently undone on any turn reaching it; set-aside names are
held at function scope and re-applied there now.

**Measured live by the agent** (real page, real DuckDuckGo, real
gemma2:2b): turn 1 fires (`live: 0`), 3 calls, 21.3s; the same question
again does not fire (`live: 787`), 1–2 calls, 2.6–6.6s, cited to the kept
page with a working address; the tungsten question sets the three held
pages aside by name and searches again. Disclosed limit: a kept page's
only staleness signal is its retrieval date — no TTL, no re-check.

## Chrome on the live line, and a topic that would not let go (P246)

User: "i am most concerned with when we cant toggle topics, when we get a
bunch of chrome." The chrome was mine from earlier today: the streaming
pass painted every engine note verbatim on the thinking line ("Gore's
gather boundary: kept 2 of 10 result(s) — no tokenizer injected — declared
cap 2.", "Referent index: 192 referent(s) from 950 encounter(s) (113ms)",
"Prompt: system 896c + chat 0c…"), then stopped truncating them on
direction. Fixed at the right seam: the engine now sends each note's MOVE
beside the prose; the fold maps a closed table of moves to its own phase
words ("searching the web", "reading en.wikipedia.org", "working out what
an answer needs", "reading what came back", "writing", "checking") and
repaints nothing for a move it does not name. The prose stays in the
disclosure panel.

Topic stickiness had two mechanisms. (1) A `resolving` Socratic dialogue
(the stage my own staleness fix sets when the person walks away) was still
injecting "The operator is examining the claim: <old claim>" into every
later prompt's discourse line — fixed, only examining/aporia speak. (2)
P235's admission exemption for a person's own attachment was unbounded:
notes pasted on turn 1 were exempt on turn 30, and any later question
sharing one common word was answered against them (retrieve() has no
relevance floor by design). Bounded to RECENCY_WINDOW turns after the
attach — the declared reach of the present — after which the source is
judged like anything else; anaphoric asks still carry the discourse names.
The recency bound is verified by code reading only: six sequential model
turns were not drivable on the saturated box.

## Investigated, not code-fixed: "boiling point of tungsten" → "not stated"

Live specimen: checking+web on, real Wikipedia sources cited in the
disclosure (`web:en.wikipedia.org-1`, `web:fr.wikipedia.org-0`), yet the
final answer was "That is not stated in the sources I looked at." — a false
absence on a fact that's plainly in both fetched pages.

Ruled OUT by direct reproduction against the real production code (no
model needed): `chunkSource`/`retrieve()` run against the REAL fetched
`en.wikipedia.org/wiki/Tungsten` text (via `/api/web/fetch`, the exact
pipeline the app uses) correctly surfaces the boiling-point sentence as
retrieve()'s #1 pick at the real `limit=3` — cross-page competition with
a second fetched page (French Wikipedia) does not push it out. Retrieval
is not the bug.

Ruled OUT (partially): a small local model CAN correctly extract this
number from the exact retrieved passage — OLMo-2-1B, given the passage
directly, answered "5,930 °C" cleanly and correctly on the first try.

Could not pin down further: `gemma2:2b` specifically was unreachable on
this box for the whole remaining investigation window (`"gemma2:2b is not
answering on this box right now (Heimdall dropped it)"`, four retries,
all 503) — this shared machine is under heavy concurrent load from the
background agents and other sessions right now. The live failure is most
likely either (a) gemma2:2b specifically behaving worse than OLMo on this
exact material/full-noise prompt (not isolated), or (b) an artifact of
gemma2:2b being flaky/degraded under the SAME resource contention that
made it unreachable for this investigation. Not enough evidence to safely
change any check/gate — a fix aimed at the wrong cause here (e.g.
loosening a grounding check) would be worse than no fix. Flagged for
re-investigation once the shared box is quieter.
