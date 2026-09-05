# MVP launch checklist — The Fold

*Audited 2026-09-05 on branch `frontier-25` against one promise: it can be wrong, but it always shows its work. Each row says what could go wrong or what a person would want, what was found, and what was done. "Fixed" means fixed on this branch and verified in a browser or a test; "open" means named, not built; "decision" means the maintainer's call, stated with the trade.*

## 1. Nothing about a person leaves their machine

| item | found | status |
|---|---|---|
| Third-party relay in the GitHub device flow | `explore-server.mjs` relayed device codes and access tokens through the maintainer's own n8n (`n8n.intelechia.com`); every user's login would have passed through it | **fixed** — the local server calls `github.com/login/device/code` and `/login/oauth/access_token` directly; verified: a device code issued through this route; `constitution.test.mjs`'s allowance rewritten to say so |
| Page load reaching a non-local host | `connect()` pre-warmed the Whisper weights from huggingface.co on every fresh page load | **fixed** — no pre-warm; the first `/transcribe` says what it fetches before it starts; measured: a fresh load makes no request beyond its origin and `localhost:11434` |
| Telemetry / analytics | none (gtag, sentry, posthog, plausible, sendBeacon: no hits) | clean |
| The local record | `record/*.jsonl` (build runs, explore, folds, skills, transcriptions) — on the user's disk only, gitignored; the Log pane reads the same file | clean |
| Consented egress | web search / page fetch (DuckDuckGo, archive.org save) when the `web` toggle is on; `pip install` from pyodide's mirror; GitHub when a repo is connected; Whisper weights on first transcription | disclosed in README ("what leaves only when you act") |
| `web` toggle default ON | a material-less question runs a DuckDuckGo search before the model drafts (P23's preflight) — the query leaves the machine by default, disclosed in the turn's THINKING line | **decision** — keep P23's default, or default off for the website build |
| The in-tab models' bytes | served from the site's own origin (`models/`), never from the publisher at runtime on localhost; README says a site must mirror | **fixed** (roster + mirror script) |

## 2. First run, fresh machine

| item | found | status |
|---|---|---|
| `./fold` cloned the engine into `../eoreader6.1` while both servers read `../eoreader7` | a fresh machine came up with every engine import 404ing behind a blank page | **fixed** — clones `../eoreader7` with its submodule, checks the three mounts by name |
| A missing mount surfaced as a blank page | `serve.mjs` served 404s silently | **fixed** — boot check names the path and the repair, exits 2 |
| The Explore page half-booted on every checkout | `explore-server.mjs` never served `/eoreader7/native/…`, which explore.html's own shims import; the page showed its "needs its local server" banner | **fixed** — the two aliases serve.mjs already carried; verified on a phone-sized viewport |
| live_priors (~250 MB) is best-effort | typed gap in the priors tab without it | clean |
| Ollama absent | before: no model at all; now the in-tab roster is offered when WebGPU is present, and the blocker's own fix is stated otherwise | **fixed** |
| No LICENSE file | `package.json` is `private: true`; nothing states the licence of the code | **decision** — pick one before launch |
| README named the wrong engine repo | "clones eoreader6.1" | **fixed** |
| Explore server hardcoded to `:8812` | reused across sessions; a collision is a typed line in the chat (`/reopen`) | clean, documented |

## 3. It always shows its work

| surface | what a person sees | status |
|---|---|---|
| A computed answer (arithmetic, units, an equation, a date) | `5 mile to km = 8.04672 km — computed, not generated`; zero model calls (measured: no `/api/chat` request) | clean — extended to shaped questions and the calendar (P108) |
| A model answer | the answer, then THINKING: what was attached, whether the web was checked, pages and passages found, the plan, each part's retrieval; refs click back to bytes; unsupported and open items listed | clean |
| The measuring door | `/measure` teaches its own grammar; `/measure <file>` probes what is measurable; a placement names statistic, null, draws, seed, window and verdict, or a typed refusal | **fixed** — advertised on every media pill, routed nowhere |
| A slash no door claims | before: sent to the model as a question (and to a search) | **fixed** — `no door named /x — the doors: …` |
| A door that throws | before: the composer went dead (`state.busy` never released) | **fixed** — `guardedSend` lands a typed line and frees the composer |
| The in-tab model | the picker names publisher and licence; the option's title carries what the publisher discloses; the status line says where the weights come from | **fixed** |
| A creative task's declared form | `shape.js::declaredForm/checkForm` (P108) is not yet run by the chat's creative turn | **open** (NEXT-PASSES Pass 30, item 3) |
| Media beyond wav in the page | `/measure` on a dropped png or mp4 frames the container's bytes; the probe says the decoder is node-side | **open** (Pass 30, item 2) |
| The ledger the mouth was handed | the void tier and the ledger block (P105–P107), visible in THINKING | clean |

## 4. On a phone

| item | found | status |
|---|---|---|
| Layout | the narrow layout already stacks: chat as one tab, a bottom tab bar; no horizontal overflow at 375px | clean |
| Touch targets | tabs 34px, Send 37, Attach 32, header icons 29, model chip 31, switches 16px tracks | **fixed** — 44–48px targets, larger switches |
| Inputs at 15px | iOS zooms the page on focus | **fixed** — 16px on phones |
| The model's name | squeezed to 0px by the one-row composer rule | **fixed** — the bar wraps into two rows on phones; the name reads |
| Sheets | the model sheet overran the viewport (bottom 886 on an 812 screen) | **fixed** — bottom sheets capped at 88dvh, scrolling inside |
| Hover-only actions on sources | `opacity: 0` until hover | **fixed** — visible on touch (`hover: none`) and on narrow screens |
| Safe area | the composer carried the inset; on a phone the tab bar is lower | **fixed** — inset moved to the tab bar |
| Explore page | a 270px rail beside a 105px stage; targets 18–32px | **fixed** — rail as a drawer above the stage; 38–48px targets |
| Explore server | the page could not boot at all (row in §2) | **fixed** |

## 5. Suites and what they prove

| suite | at this commit |
|---|---|
| the-fold `npm test` | the `webllm-rung` mirror walks pass where the mirrors are present and skip typed where they are not |
| `constitution.test.mjs` | no host but localhost in anything the page loads (github.js and webllm-rung.js carry no fetch and no publisher host) |
| eoreader7 native | 655 pass / 1 TODO (pre-existing) |
| in the browser, this session | arithmetic door; `/measure` usage; unknown slash; three in-tab models each answering; GitHub device code through the direct route; the chat and Explore pages at 375×812 |

## 6. Not done, stated

- A model trained only on licensed / public-domain text (Common Corpus, Common Pile) is not in the vendored catalog; offering one means compiling it with mlc_llm.
- The static-site deployment itself (a hosted origin serving this repo + `models/`) was not stood up here; the localhost page exercised the identical code path with `isLocalPage` true.
- The-fold's `measure.test.mjs` still imports `../eoreader6` (nul and binding) and needs that sibling beside the repo.
- Phone testing was done in a Chromium-shaped pane with device emulation, not on a physical phone; WebGPU on iOS needs Safari 26+ or Chrome with the flag on, and a 1B model needs ~1 GB free on the device.
