# The Fold

A conversation whose context window does not grow, on a machine nothing leaves.

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

```bash
./fold
```

One command, from `the-fold/`. It checks eoreader6.1 is cloned next to this
repo, installs `node_modules` on first run, starts Ollama if it isn't already
listening on `:11434`, starts `explore-server.mjs` on `:8812` (the Explore
pane and the priors organ both need it — reused if another the-fold session
on this machine already has one running), then starts `serve.mjs` and opens
the browser on it. Pick an Ollama model and connect. Pass a port to run the
chat server somewhere other than `:8811` (`./fold 8899`); `:8812` for Explore
is fixed — the chat page's iframe is hardcoded to it.

Equivalent by hand, in two terminals:

```bash
node the-fold/explore-server.mjs 8812
node the-fold/serve.mjs 8811
```

(The chat server must be `serve.mjs`, not a generic static server: it mounts
eoreader6.1's engine at `/engine` and serves everything no-store.)

Two model calls per ordinary turn: the answer, and the summary refresh. The
refresh runs constrained to JSON at a 300-token cap — it is bookkeeping over
lines that are already written, and spending the answer's effort on it would
double the turn's latency for nothing.

Tests — no engine, no network, no install:

```bash
cd the-fold && npm test
```

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
