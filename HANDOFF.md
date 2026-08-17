# The Fold — handoff prompt for a fresh agent

Paste everything below this line into a new session started in `/Users/mlacy/Documents/3.0`.

---

You are picking up work on **The Fold**, a local-only app at `/Users/mlacy/Documents/3.0/the-fold`. Read `FOLD-CONSTITUTION.md` and `POLICIES.md` in that directory first — they are binding. Then read this brief and continue the in-flight batch.

## What the app is

Experiments in extracting signal from noise from any data, using **only a local model** (Ollama: gemma2:2b, qwen2.5:14b). Nothing leaves the machine (P1, assay-enforced). Chat UI + sources + append-only record. Dev server: use the browser preview tool with launch config **`the-fold-8815`** (serve.mjs on :8815). Tests: `npm test` in the-fold (node --test, ~270 passing). After every change batch: reload the page in the preview browser and verify live with a screenshot — never ask the user to check.

## Laws you must not break

- **Physics, not tool calling.** Never ask the model to comply, format, cite, or self-describe. Structure comes from decoding grammar (JSON schema as Ollama `format`), mechanical extraction, and checks outside the model. The model is just the mouth.
- **Local only.** No network egress except the Explore server's recorded egress (P13), and only on explicit consent.
- **Append-only logs.** Plans, folds (née builds), and records are inserts on logs, projected/folded as needed. Never mutate history.
- **Two grounds, never alike.** Every sentence is material-ground (byte address into sources) or model-ground (dotted underline); unbacked figures/names get the wavy claims stripe. Echo/verbatim reproduction of the source is a *failure*, not grounding.
- **No hand-set thresholds** — measure a null instead. **No EO jargon in the UI.**
- **Change lands with a test** (P10) for anything pure.
- Restart serve.mjs (preview_stop/preview_start) if its file is newer than the running process — stale servers 404 on new routes.

## Concurrent session warning

Another Claude session works this repo simultaneously. It owns `explore/*`, `library.js`, the builds feature core (`builds.js`, `build-log.js`, `serve.mjs`), and model routing. You own `app.js` chat-side, `holon.js`, `provenance.js`, grounding. `node --check app.js` before relying on it; console errors in the preview can be stale across navigations. If launch.json loses the `the-fold-8815` entry, restore it. Coordinate via SendMessage if a peer session is listed by ListAgents.

## Current in-flight batch (user-ordered, do these)

1. **Rename “Builds” → “Folds” in all visible copy.** The tab already says Folds. Still showing: `index.html` pane heading `<h2>Builds …` (~line 1046), any note/empty-state text, editor title `build ${n}` in app.js, download titles. Keep internal identifiers (`builds`, `#builds-count`, file names) unchanged to avoid colliding with fold.js and the peer session.
2. **Folds panel: search + sort + list view**, not just a scroll. Add pure `filterFolds`/`sortFolds` helpers (in builds.js or a new pure module) with tests, then wire controls into the pane rendering (`renderBuilds` in app.js, ~line 1828).
3. **Addressing.** Each fold card should show its address: `fold N`, plus its projection file path under `the-fold/materials/`. Chat door: `/fold <n> <instruction>` handled mechanically in `send()` in app.js *before* the `/task` door — the door carries the target, so returned code lands as a REVISION on fold N regardless of the model's prose (extract code via `parseSegments` from artifact.js; append via POST `/api/builds/log` with `{verb:"revision", author:"model", …}` — note the server param is `verb`, not `kind`). `referencedBuild` in builds.js already matches `/\bbuild\s+#?(\d+)\b/i`; extend it to also match `fold`.
4. **Full-panel / full-screen fold viewer.** A dialog reusing `artifactNode` (app.js), backdrop-click to close, added to the existing dialog-close list.
5. **Light-mode toggle button.** The three-state CSS already landed in index.html (`:root` light default; media-query dark guarded `:root:not([data-theme="light"])`; explicit `:root[data-theme="dark"]` duplicate). Still needed: a small header toggle button cycling system → light → dark, a pre-paint inline script reading `localStorage["the-fold.theme"]` and stamping `data-theme` on `<html>` before first paint.

## Immediate loose end

Fold/build **#2** (“spiral”) renders a **circle** — the model's arc radius never grows. A revision was just requested through chat: *“In build 2 the spiral only draws a circle. Fix it: make the radius grow with the angle…”*. Check whether that revision landed on the fold's log (`record/builds/`), scrub to the new version, hit ▶ run (run-consent grants `sandbox="allow-scripts"`; the CSP wall in artifact.js keeps it networkless), and confirm a real spiral animates. If the model's fix is still a circle, iterate the revision — this is also the live demo of item 3's addressing.

## Verification pattern (established, follow it)

Edit → `node --check` changed files → `npm test` → reload preview → drive the UI (javascript_tool / computer) → screenshot proof to the user. Read the model's actual outputs in any dialogue runs and fact-check them; that is how echo and reproduction failures were found.

When the batch lands and is verified live, commit and push (user's standing “merge to gh” pattern) — but check `git status` carefully first because of the concurrent session.
