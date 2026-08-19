# Getting iterative fold development actually working — brief for a fresh session

Paste this into a new session started in `/Users/mlacy/Documents/3.0`. Read `the-fold/CLAUDE.md` and `the-fold/POLICIES.md` first — they're binding.

## The goal

A small local model (gemma2:2b-class — see the standing "keep the local model small" rule) should be able to build genuinely good, non-trivial artifacts through **iteration on one append-only log**, not by getting the whole thing right in one completion. The log is what makes correctness cumulative: each turn only has to get the *next small thing* right — a color, a bug, a feature — and the log carries every version, so the artifact keeps improving instead of losing quality every time the model retypes it from scratch. This is the same principle the rest of the fold is built on (holon.js's plan log, the claim ledger, the record) applied to code: **the log does the remembering; the model only has to be right about the delta.**

## The problem, as found live (2026-08-17)

Asked for a counter widget, then told "I don't like the counter widget — make the buttons bigger with some color," the fold **spawned a second, disconnected build** instead of revising the first. Traced to three stacked gaps, now two of them closed:

1. **Fixed.** `widget.js`'s REC-routing (`routeMessage`/`routeSegment` — decides from the operator's own words, before any model call, whether a code segment is feedback on an existing build or a demand for a new one) was documented extensively in CLAUDE.md as wired into `app.js`, but **was never actually called anywhere in the file**. `publishBuild` unconditionally did `state.builds.length + 1` on every code segment. Now wired: `renderAnswer`'s segment loop calls `routeAndPublish`, which asks `widgetRouter.routeSegment` and lands the result as `new` / `revise` (SUPERSEDE) / `rezero` (REC) accordingly.

2. **Fixed.** `makeWidgetRouter` couldn't even construct — it throws unless it receives `INDEFINITE_DETERMINERS`, `DEFINITE_DETERMINERS`, and `ANAPHORIC_PRONOUNS` from the engine's prior register (`eoreader6.1/packages/engine/perceiver/text/priors.js`), and those three closed classes didn't exist there despite being documented as already added. Added them (small, standard English closed classes, `giver: "lang/en"`, matching the register's own convention) and fixed `widget.test.mjs`'s stale `../eoreader6/` import paths to `../eoreader6.1/`. All 23 widget tests now pass (previously threw before a single assertion could run).

3. **Open.** Revisions currently replace the build's **entire code** (`buildLog.reviseBuild`/`rezeroBuild` both take a full `code` string). This is the wrong shape for what a small model is actually good at: gemma2:2b can say "change the button color to blue" reliably; it cannot reliably retype an entire HTML/CSS/JS file byte-for-byte without introducing a new mistake somewhere else in the file it wasn't even asked to touch. **This is the real blocker to "genuinely good iterative output," more than the routing gap was** — routing now gets a complaint onto the right build's log, but each landing still asks the small model to regenerate everything.

## What's still needed — the diff-format addendum (user-directed, explicit)

> "it should be real easy to get a small model to make genuinely good things using the append only log on a fold" / "think how easy it is to swap a hexcode on a fold by just appending an EOT line that changes it" / "lets DEFINITELY do the diff format" / "it must use our 9 operators"

Concretely, this means:

- A new addendum kind in `build-log.js`'s closed vocabulary (currently: deposit/revision/edit/reset/run per `builds.js`'s pattern, or propose/supersede/result per `build-log.js`'s own task-log-backed shape) — a **PATCH** entry that carries a diff against the live projection, not a full replacement.
- `foldBuild`'s projection (`projectFold`/`foldBuild` — the fold-over-the-log function every reader, download, and cursor scrub already goes through) needs to apply a sequence of patches on top of whatever full-code entry it last saw, the same way `git apply` walks a patch stack — mechanically, never re-asking the model to reproduce context around the change.
- **Every addendum must still type through the nine EO operators** (per `operators.js`, the same discipline `build-log.js`'s existing PROPOSE=SEG/SUPERSEDE=SYN/REC-rezero typing already follows) — a PATCH addendum needs its own operator reading stated and checked against `checkCubeProgression`, not just bolted on as an untyped extra field. Work out what operator a *delta* production actually is before writing the code — don't guess it silently the way the first widget.js router guessed at word lists and had to be rebuilt around closed classes instead.
- The model should be **asked for the smallest possible diff** ("change #4CAF50 to #2196F3", not "here is the whole file again") — matching L5 (never trust the model with a compliance-critical fact it doesn't have to restate) and matching what gemma2:2b actually measures well at doing.
- Mechanical patch application must degrade honestly (a patch that doesn't apply is a typed gap, never a silent no-op or a guess at intent) — same posture as every other mechanical extractor in this repo (`pickRevisionSegment`, `parsePlan`, etc.).

## Also found and fixed, same session, adjacent to this work

- `grounding.js::blankStructure` didn't blank fenced code blocks, so a fold's own `<!DOCTYPE html>`, `getElementById`, `addEventListener` — code syntax, not claims about the world — were extracted as "unsupported figures" and sent to the live web-search proof-seeking tier for pointless "corroboration." Fixed: fenced code blocks are now blanked the same length-preserving way headings and bold labels already are.
- Still open, lower priority: numbered-list bold labels (`1. **HTML Structure:** ...`) aren't caught by the existing line-initial-bold heading regex (it requires the `**` to start the line; a leading `1. ` defeats the anchor), so list-item labels in a model's own explanatory prose can still leak through as flagged claims. Small, well-scoped regex fix, not yet done.

## Also requested, not yet built

- UI: fold-card controls (edit/run/download/expand) should be visually subtler, moved to the top-right of the card.
- UI: a way to see **the log for one specific fold** (its own PROPOSE/SUPERSEDE/REC/RESULT entries), not just the global Log tab.
- UI: a "▶ run" affordance on a fold's **inline chat rendering**, not only inside the Folds panel card.
- Feature (separate, larger, not started): "knowledge trees of who believes what" — per-speaker belief/assertion tracking. `hypergraph.js`'s SVO extraction and `cast.js`'s coreference resolver are the two organs closest to this; there is no dedicated speech-act/belief-attribution tier today. Needs its own design pass, not a bolt-on.
- `skills.js` (P14, mechanical skill creation/execution) exists with 22 passing conformance tests but is imported nowhere in `app.js` or `index.html` — structurally unreachable from the chat UI right now.

## Where things stand on disk

`the-fold/app.js`, `the-fold/widget.js`, `the-fold/grounding.js`, `the-fold/widget.test.mjs`, and `eoreader6.1/packages/engine/perceiver/text/priors.js` all carry uncommitted changes for items 1, 2, and the code-fence fix above. **This working directory has at least one other concurrent Claude session actively editing `app.js`/`term.js`/`explore-server.mjs`** — files here have been observed reverting mid-session more than once. Check `git status`/`git diff` before trusting any description above as still true, and prefer landing finished work through an isolated `git worktree` + PR against `origin/main` (not a direct commit in this shared directory) the way the two earlier fixes this session shipped as [PR #15](https://github.com/clovenbradshaw-ctrl/the-fold/pull/15).
