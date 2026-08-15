# The Fold

A conversation whose context window does not grow.

Open `index.html` over any static server, paste an Anthropic API key, and talk
to Claude. Every finished turn is folded to one line of about a hundred
characters; a running summary tracks how the discourse evolved; and what gets
sent on turn four hundred is the summary, a bounded list of folds, and the last
two exchanges. The raw transcript is never resent. The right-hand panel shows
the exact message array going to the model each turn next to the size of the
transcript it is standing in for.

The key is held in this browser's local storage and is sent to no host but
`api.anthropic.com`. There is no server in this design to hide it behind, which
is why the SDK is constructed with `dangerouslyAllowBrowser` — appropriate for a
page you serve to yourself on localhost, not for one you deploy.

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
| `app.js` | the page: Claude client, turn loop, rendering. The only file that touches the network. |
| `fold.test.mjs` | `node --test` over both pure modules. No engine, no network. |

Two model calls per turn — the answer, and the summary refresh — and neither
one is ever handed the transcript.

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
python3 -m http.server 8811 --directory the-fold
```

Then open `http://localhost:8811`, paste a key, pick a model, and connect.

Two model calls per turn: the answer, and the summary refresh. The refresh runs
at `effort: "low"` — it is bookkeeping over lines that are already written, and
spending the answer's effort on it would double the turn's latency for nothing.

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
