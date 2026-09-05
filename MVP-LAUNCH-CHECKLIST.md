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
| `web` toggle default ON | a material-less question runs a DuckDuckGo search before the model drafts (P23's preflight) — the query leaves the machine by default, disclosed in the turn's THINKING line | **decided 2026-09-05: stays on** (the maintainer's call; README says what leaves) |
| A site refuses the direct fetch | before: a typed gap and nothing else | **fixed** — public gateways tried in an order learned off the record, every try recorded, the route disclosed on the page; `/gateways` shows what is open and what each forwards about you (P117) |
| "Can the maintainer's proxy be hidden behind public relays so nobody can tell who requests what?" | a relay hides who only if it strips the address (measurable per relay); nothing hides what — every target lands in the proxy's log | **decided: the maintainer's proxy stays out of the loop**; Oblivious HTTP is the design with that property, named in P117 |
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
| A computed answer (arithmetic, units, an equation, a date) | `5 mile to km = 8.04672 km — computed, not generated`; zero model calls (measured: no `/api/chat` request) | clean — extended to shaped questions and the calendar (P115) |
| A model answer | the answer, then THINKING: what was attached, whether the web was checked, pages and passages found, the plan, each part's retrieval; refs click back to bytes; unsupported and open items listed | clean |
| The measuring door | `/measure` teaches its own grammar; `/measure <file>` probes what is measurable; a placement names statistic, null, draws, seed, window and verdict, or a typed refusal | **fixed** — advertised on every media pill, routed nowhere |
| A slash no door claims | before: sent to the model as a question (and to a search) | **fixed** — `no door named /x — the doors: …` |
| A door that throws | before: the composer went dead (`state.busy` never released) | **fixed** — `guardedSend` lands a typed line and frees the composer |
| The in-tab model | the picker names publisher and licence; the option's title carries what the publisher discloses; the status line says where the weights come from | **fixed** |
| A creative task's declared form | `shape.js::declaredForm/checkForm` (P115) is not yet run by the chat's creative turn | **open** (NEXT-PASSES Pass 31, item 3) |
| Media beyond wav in the page | `/measure` on a dropped png or mp4 frames the container's bytes; the probe says the decoder is node-side | **open** (Pass 31, item 2) |
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

## 4b. Three homes

| item | found | status |
|---|---|---|
| Static hosts died at import time | root-absolute mount paths (`/engine-v7/`, `/engine/`, `/nul/`, `/node_modules/`) only a server maps | **fixed** — `deploy/build-site.mjs` rewrites exactly those to relative paths; assayed by `build-site.test.mjs`; measured on a plain static host at a subpath |
| The Pages workflow checked out the old engine and sed'ed one subpath | the deployed site was broken twice over | **fixed** — the workflow runs the same build, eoreader7 beside the-fold with its submodule |
| A pinned copy could not be self-contained | the rung read `models/` only on localhost | **fixed** — the weights ladder: own `models/`, then named mirrors, then the publisher; the chosen base is stated |
| The page assumed its home | — | **fixed** — routes probed at boot, said on the chip, `/routes` for the table; every gap typed |
| Chrome extension | none | **built, not run** — `--extension` writes an MV3 manifest and background; loading it is a maintainer step |
| Pages deployment | none from here | **open** — push to main runs the workflow; set `WEIGHTS_MIRROR` to the archive.org pin once it exists |

## 4c. The room (P119)

| item | found | status |
|---|---|---|
| Preserve and share a chat | none | **built** — blocks AES-256-GCM under a chat key the server never holds; share link's fragment carries the key; `matrix.test.mjs` + `matrix-client.test.mjs` (24) prove nothing readable reaches an adversarial homeserver, three ways |
| Use other machines for inference; pool them | none | **built** — `/serve`, `matrix-worker.mjs`, a member's models as picker rungs, sealed jobs spread by in-flight count; the pool sheet |
| A default homeserver | — | **none, by decision** — the page names and prefers no homeserver; the sign-in sheet's placeholder is generic |
| A share link was a bearer key with no revocation | whoever held it read the room forever | **fixed (P120)** — `/share @who:server` carries no key: one-shot secret, HMAC proof only that account can publish, granter wraps to that key alone; open links say they are a magic key |
| A homeserver could substitute a member's published key | the grant was wrapped on sight | **fixed** — an unproved key is never granted automatically; it is listed with a fingerprint to compare aloud; the swap is exercised in the suite |
| One key per room forever | no revocation | **fixed** — key epochs; `/matrix remove` kicks and rotates; blocks name the epoch that opens them |
| Session and keys in plain localStorage | readable by anything with that origin | **fixed, opt-in** — `/matrix lock` (PBKDF2, 600k rounds); every door is a typed gap until unlock |
| Browser history holds an opened link | — | **partly** — the fragment is stripped at boot, but the original visit may be in history; a bound or passphrase link makes that harmless |
| Room power | first cut flattened viewers to −1 | **fixed** — every member at 100 (`users_default`), by decision |
| `<dialog>` `close` never fires in Chromium 148 (browser pane) | the paste sheet attached nothing there; the sign-in sheet's first cut did nothing | **fixed** — both act on the form's `submit`; verify on a release Chrome before launch |
| A real homeserver | not exercised from here | **open** — the person's first sign-in; proofs are against the fixture, which implements the routes used and the auth rules leaned on |
| Identity survives a wipe | no | **open, said** — a wiped browser reads again from the link or a member's next `/share`; eopm's account-key backing is the next step |

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
