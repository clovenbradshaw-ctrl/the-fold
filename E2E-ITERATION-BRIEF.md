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
