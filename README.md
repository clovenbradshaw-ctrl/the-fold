# The Fold

A reading that runs for months without degrading, on a machine nothing leaves.
Its context window never grows — that's the mechanism, not the point.

## Quickstart

```bash
git clone https://github.com/clovenbradshaw-ctrl/the-fold.git
cd the-fold
./fold
```

One command, from nothing. `./fold` installs Node.js and Ollama if they're
missing, clones the two sibling repos it needs (`eoreader7` — the reading
engine, with the frozen 6.1 cut it pins as a submodule — and `live_priors`
for the priors organ's corpus), installs this
repo's own dependencies, pulls a starter model if none is pulled yet, and
opens the browser once everything is up. What each step does, and how to run
the pieces by hand, is in [Running it](#running-it) below.

Open `index.html` over `serve.mjs`, pick an Ollama model, and talk. Every
finished turn is folded to one line of about a hundred characters; a running
summary tracks how the discourse evolved; and what gets sent on turn four
hundred is the summary, a bounded list of folds, and the last two exchanges.
The raw transcript is never resent. The right-hand panel shows the exact
message array going to the model each turn next to the size of the transcript
it is standing in for.

Local only, and checked: the model is Ollama on localhost, the fonts are the
system's, and `constitution.test.mjs` fails if any file the page loads names a
host that is not localhost. There is no API-key path — for the corpora this
instrument is for, nothing leaving the machine is not a preference but the
arrangement.

## Two folds, not one fold at two resolutions

**System 1** is the paraphrase. It is associative and lossy on purpose, because
that is what a person actually retains from a conversation — the gist, not the
transcript. Its limit is not that it is short. It is that a paraphrase has no
address: "the report put the figure at 12%" and "the report put the figure at
21%" fold to the same line, and nothing in the prompt can tell them apart or
get back to the source. Harmless for following a conversation, disqualifying as
evidence — so the prompt block says exactly that about itself.

**System 2** is the answer to that, and it is a different *kind* of record
rather than a longer one: it keeps the address. What the turn established,
which channels carried it, the byte ranges the check ran against, what failed
that check, what was left open. Every field is read off work the turn already
did, so a record costs no model call and cannot disagree with its own check. A
System 2 fold can be re-opened — click a ref in the app and the exact bytes are
read back out of the material. A System 1 fold can only be recalled.

The two blocks are never merged. Merged, an addressed record would inherit the
paraphrase's disclaimer and a paraphrase would inherit the record's authority.

## What runs where

| file | what it is |
| --- | --- |
| `fold.js` | the fold: summary, folds, records, prompt assembly. Pure — no IO, no model calls, no imports. |
| `source.js` | the address half: paragraph chunking with byte ranges, mechanical term-overlap retrieval, citation checking, read-back. Also pure. |
| `holon.js` | the task layer: a plan as inserts on an append-only log (propose / supersede / evidence / result / retract — `task-log.js` lineage), folded into live parts; per-part research → write → mechanical check → bounded correction; assembly with provenance. Pure — the model arrives as an injected function. |
| `constitution.js` | the constitution's channel: the one folded paragraph the model receives, and the article→organ map saying which code enforces which article. |
| `app.js` | the page: Ollama client, turn loop, rendering. The only file that touches the network. |
| `*.test.mjs` | `node --test` over the pure modules, plus `constitution.test.mjs` — the assay that walks the enforcement map. No engine, no network. |

Two model calls per ordinary turn — the answer, and the summary refresh — and
neither one is ever handed the transcript.

## Tasks

A turn that is a task rather than a question — typed as `/task …`, or detected
mechanically when the question's own shape is several separately-anchored
parts (`needsDecomposition`, ported from eochatX) — runs the holonic loop:
one plan call whose SHAPE is enforced by decoding grammar (a JSON schema
passed to Ollama, physics rather than a request), then per part: mechanical
retrieval, one write call, the same citation/grounding/attribution checks an
ordinary turn gets, and one bounded correction pass when the checks fail.
The whole task folds to ONE line and ONE record, built from the parts' own
checks — nothing re-measured at assembly. The plan itself is an append-only
log; a part that retrieved nothing, produced nothing, or strayed from the
task's vocabulary is a typed entry in the record, never a silent drop. A plan
reply that parses to nothing degrades to the task-as-single-part, and says so
on the record.

## What the meter is measuring

Conversation against conversation: everything the transcript holds, against what
stands in for it this turn. Retrieved material and the base prompt are counted
separately, because they are the same size on turn 1 and on turn 400 — folding
them in would flatter the fold on a short conversation and say nothing about a
long one.

The first several turns look like the fold losing. Its two framing blocks are a
fixed cost of roughly a kilobyte, paid in full on turn one, and a two-turn
transcript hasn't outgrown that yet. What is flat is everything after: the
transcript climbs without limit and the carried number does not. `fold.test.mjs`
pins that at 400 turns.

## Rules the code is holding to

- **The model does not get tools.** Whether a turn retrieves is a deterministic
  function of the question's own words. No tool list, no model deciding to
  search.
- **No hand-set thresholds.** A passage either shares a term with the question
  or it does not; there is no relevance floor asserted that the material did
  not supply. A passage already folded into an earlier record has its score
  halved — proportional to how relevant it was — rather than docked a constant.
- **The summary refresh cannot rewrite the records.** A model that could edit
  the record could edit the evidence, so `normalizeSummary` carries the
  previous records through untouched no matter what the refresh returns.
- **A talking model receives only content it would be fine to say out loud.**
  No forbidden-vocabulary lists, no example text planted in a prompt on the
  theory that an instruction will suppress it.
- **Whatever cannot be addressed is a typed gap, never a guess.** A question
  that matches no material retrieves nothing and is recorded as open.

## Running it

See [Quickstart](#quickstart) above for the one-command path. In full,
`./fold` installs Node.js if missing (Homebrew on macOS), clones
`eoreader7` next to this repo if it isn't there (the engine both servers
mount: its `native/` kernel and the frozen 6.1 cut it pins as a submodule), clones `live_priors` next to this repo if it isn't there (the priors
organ's corpus — soft dependency, explore-server.mjs shows a typed gap
without it, so this is best-effort and never blocks the rest of the launch),
installs `node_modules`, installs Ollama if missing and starts it if it
isn't already listening on `:11434`, pulls `gemma2:2b` if nothing at all is
pulled yet (so there's a model to talk to immediately), starts
`explore-server.mjs` on `:8812` (the Explore pane and the priors organ both
need it — reused if another the-fold session on this machine already has
one running), then starts `serve.mjs` and opens the browser on it. Pass a
port to run the chat server somewhere other than `:8811` (`./fold 8899`);
`:8812` for Explore is fixed — the chat page's iframe is hardcoded to it.

Equivalent by hand, in two terminals:

```bash
node the-fold/explore-server.mjs 8812
node the-fold/serve.mjs 8811
```

(The chat server must be `serve.mjs`, not a generic static server: it mounts
eoreader7's frozen 6.1 engine at `/engine`, its native kernel at `/engine-v7`,
and serves everything no-store.)

Two model calls per ordinary turn: the answer, and the summary refresh. The
refresh runs constrained to JSON at a 300-token cap — it is bookkeeping over
lines that are already written, and spending the answer's effort on it would
double the turn's latency for nothing.

Tests — no engine, no network, no install:

```bash
cd the-fold && npm test
```

## The fold as a model, not only a client

`explore-server.mjs` (`:8812`) also serves the fold AS a model — point the
Ollama desktop app's "add provider," OpenCode's custom-provider config, or
any OpenAI-compatible client at `http://localhost:8812/v1` (or Ollama's
own native shape at the same host's `/api/tags` and `/api/chat`). Every
answer runs the real grounded pipeline (`holon.js`'s plan gate, retrieval,
quote/relation tiers, bounded correction) — never a raw passthrough to
Ollama — so a servable model id is always `fold:<real ollama model>`
(e.g. `fold:gemma2:2b`), never a bare name: naming a bare model asks
Ollama directly and is refused, typed, at the door, on purpose. See
POLICIES.md P27 for the full policy and CLAUDE.md's "the model proxy" for
the disclosed scope of this pass (no attachments, no link tier, no
persistent session, single-shot streaming — each named rather than silent).

## Testing it honestly

Models are extremely good at plausible, so "did it give a reasonable
answer" proves nothing. Paste material containing a specific invented fact — a
fictional name, a made-up number — into the Material tab, ask about it, and
check the literal answer against the literal text. Then keep talking for
twenty turns about something else and ask again: the point of the record is
that the address still resolves after the paraphrase has forgotten.

## Lineage

The algorithm is ported from `eochatX`'s `app/client/eo-discourse.ts`, which is
itself a port of `eochat`'s `server/conversation-summary.js`. This repo is that
mechanism standing on its own, with no framework around it.

## Three homes, one page

The Fold runs from a terminal (`./fold`), from a static site, and — packaged
by the same build — as a Chrome extension. Which routes are open is never
assumed from where the page is: at boot it probes Ollama, WebGPU, the local
explore server and its own server, says what it found on the status chip,
and `/routes` prints the table (POLICIES.md P118). A Pages visitor who also
runs `./fold` gets their local record and web organ; a terminal user without
Ollama gets the in-tab models.

```bash
node deploy/build-site.mjs --out dist                 # the static site (GitHub Pages serves dist/)
node deploy/build-site.mjs --out dist --models copy   # a self-contained pin (archive.org item, ~3.6 GB)
node deploy/build-site.mjs --out dist --extension     # + manifest.json: load dist/ unpacked in chrome://extensions
node deploy/build-site.mjs --out dist --mirror https://archive.org/download/<item>/models
```

The build carries exactly what the page loads (derived from `page-graph.mjs`)
laid out as the repos already sit — `the-fold/`, `eoreader7/`, `node_modules/`
— with the five server mount-point paths rewritten to relative ones, so it
runs at a domain root, under a subpath, from an archive.org item, or from an
extension origin. `SHA256SUMS` and `BUILD.json` record every byte and the
commit.

## Preserve, share, and borrow a machine — through a homeserver you name

A chat can be preserved to a Matrix room, shared by a link, and answered by a
model on another member's machine — with nothing readable ever leaving the
page (POLICIES.md P119). The page names no homeserver: `/matrix login` opens
a sheet and you type yours — your own, a friend's, a public one. What that
server holds is ciphertext under a chat key it never sees, pointers, and
public keys; the tests prove it against a homeserver built to keep and read
everything.

```
/matrix                    where you stand, and what the server can see
/preserve [name]           seal this chat's turns into blocks (new turns only, each time)
/share @who:server         a link for that account alone — no key in it, one use, 7 days
/share open                the magic key: whoever holds the link reads the chat
/share words <three words> the key sealed under words you say aloud
/share grant @who:server   trust an unverified key after comparing fingerprints
/join <link> [the words]   open a shared chat: every block read back and decrypted here
/matrix members            who is in the room, each key's fingerprint, who holds the key
/matrix rotate · remove @who   a new key epoch; removal takes the seat and rotates
/matrix lock · unlock      seal what this browser keeps under a passphrase
/serve                     answer the room's sealed prompts with this machine's models
/pool                      the devices offering a mouth, and what each has answered
```

**Prefer `/share @who:server`.** That link carries no key: it works only for
that account, signed in as themselves, once, and the key is handed over only
after their browser publishes a public key carrying the link's proof — which
a homeserver cannot forge or swap (POLICIES.md P120). `/share open` is a
**magic key**: whoever holds that link reads the whole chat, past and future,
and it cannot be taken back. `/matrix remove @who` rotates the key so nothing
after it reaches them; what they already read, they keep.

A member who runs `/serve` (or `node matrix-worker.mjs <link>` on a headless
machine with Ollama) shows up in every member's model picker as
`room:@who:server model`; a turn under that rung goes to them sealed and comes
back sealed. The pool sheet counts what your own jobs measured — latency,
tokens per second, the device — never a guess. Every member of a room holds
full power.

## Run it from a website

The page does not need Ollama. Serve this directory (plus `models/`, see
below) from any static host over https, and the model runs **in the
visitor's own tab** on WebGPU — nothing leaves their machine, and nothing
about them reaches the site's owner: the site serves bytes, the browser does
the reading. Three in-tab models are offered, chosen for what their
publishers disclose about the training data (POLICIES.md P116):

| picker | publisher, licence | training data |
|---|---|---|
| OLMo 2 1B · in this tab | Ai2, Apache-2.0 | data, code, weights and logs all published |
| SmolLM2 1.7B · in this tab | Hugging Face, Apache-2.0 | pretraining mixture and instruction data published |
| RedPajama-INCITE 3B · in this tab | Together, Apache-2.0 | RedPajama-1T, the open reproduction of the LLaMA data |

Weights climb a ladder: the site's own `models/` first on any origin (a pinned
copy that carries them is self-contained), then each mirror the site names in
`models/MIRRORS.json`, then the publisher; the status line says which one
answered. GitHub Pages cannot hold the shards (~100 MB each), so a Pages build
names a mirror or lets the publisher serve them. Mirror them once, so a local
page or a pin serves every byte itself:

```bash
sh models/fetch-webllm.sh
```

That fetches ~3.3 GB from the publishers into `models/` (md5-verified,
resumable; one model: `sh models/fetch-webllm.sh <id>`). WebGPU needs a
secure origin (https:// or localhost) and a Chrome- or Edge-shaped browser
with hardware acceleration; the page says which of those is missing rather
than offering a model that would fail. The page is laid out for a phone
as well as a desk: on a narrow screen the chat is one tab among the panels,
every control is reachable by touch, and the in-tab models run the same way.

What a page load reaches: its own origin, and `localhost:11434` if Ollama is
there. What leaves only when you act: a web search or page fetch when the
`web` toggle is on (through the local explore server), `/transcribe`'s
one-time Whisper download from huggingface.co (said before it starts),
`pip install` from pyodide's mirror, GitHub when you connect a repo —
straight to github.com from the local server, through no one's relay —
and, when a site refuses the direct fetch and the `web` toggle is on, a
public gateway (the Wayback Machine, a reader or relay service) that then
sees the address; which gateways are open and what each forwards about you
is learned from your own record, shown by `/gateways`, and every page read
that way says so (POLICIES.md P117). Nothing about you reaches this
project's maintainer by any route.
