# The reference-library check — integration contract

For the sessions that own app.js, claims.js and the chip flow. This note is
the seam; the code is `priors.js` (pure, 15 conformance tests in
`priors.test.mjs`) and `POST /api/priors/check` on explore-server.mjs
(port 8812 once that server is restarted by its owner — the route is in the
file now, the running process predates it).

## What it is

The fact-checking ladder's FREE tier: a claim checked against `live_priors`,
the curated 2,044-document corpus beside this repo, with **zero egress** —
no crossing, no consent to spend, nothing recorded but the check itself.
That is why the chip flow can afford to call it **before the web check**
(`proof.js` / `/api/web/*`): the library costs nothing, so P13's one
sanctioned egress can be spent only on what the shelf leaves unsettled.
Whether the web check is then skipped when the library states the claim, or
always runs and the two verdicts sit side by side on the ledger, is the
owning session's ordering decision — this note only establishes that the
library call is safe to make first and always.

## The call

```
POST /api/priors/check
{ "claim": { "kind": "name" | "number", "text": "...", "tokens": [...], "sentence": "..." } }
```

Same claim shape `/api/web/primary` takes — a grounding.js atom, a proof
target, or a relation claim's content words. Tokens are judged on the
claim's own words, never a paraphrase.

## The answer — the claims.js "priors" aspect payload

```
{
  verdict:    "stated-by-library" | "unstated-by-consulted" | "no-candidates",
  claim:      "...",             // echo
  kind:       "name" | "number",
  candidates: 518,               // documents sharing the claim's words (filename+title)
  consulted:  12,                // documents actually read, ≤ PRIORS_DOCS_CONSULTED
  stating:    2,                 // documents with at least one stating sentence
  documents: [
    {
      path: "06-government-legal/world-factbook/africa_ag.txt",  // relative to live_priors
      category: "06-government-legal",
      title: "The World Factbook — Algeria",
      stating: true,
      snipsFound: 28,            // true count; snips below are capped at PRIORS_SNIPS_KEPT (12)
      snips: [ { text, start, end } ],   // char offsets into THE FILE as it sits on disk;
                                         // slicing the file at [start,end) reproduces text
                                         // (self-verified before shipping, test-pinned)
      source: { ... }            // FULL PROVENANCE — see below
    }
  ],
  sentence: "the reference library: 2 of 5 document(s) consulted state it"
}
```

Feed it to the ledger as `ledger.note(claim, "priors", payload)` —
`composedSentence` already reads `pr.consulted` and `pr.stating` as numbers
and phrases the count; the `documents` array is what the projection opens
when the reader clicks through. **The provenance rule (user direction,
2026-08-17): a prior referenced in the surf is a citation like any other.**
Never render the count without keeping the documents behind it reachable.

`source` is the document's own provenance header, passed through untouched
(every key the file wrote — `status: "in_force"`, `isbn`, `Region`, whatever
it carries), plus three canonical aliases filled from the corpus's own key
names when absent: `url` (the official source URL — legislation keeps it
under `source:`), `publisher` (or the publishing `department`), `date`
(`publication_date` / `adopted`). `title` is the document naming itself.

## UI phrasing, plain language

- Stated: `the reference library: 2 of 3 documents state it — CIA World
  Factbook (2024): "…snip…" [06-government-legal/world-factbook/africa_ag.txt#1218-1474]`
  — document named by `source.title` or `source.publisher` (+ `source.date`'s
  year when present), snip verbatim, address as the opaque `[path#a-b]`
  token render.js already treats as re-openable.
- Unstated: `the reference library: 0 of 12 documents consulted state it` —
  never "false", never "refuted"; a shelf that does not state a claim is a
  result, not a refutation.
- No candidates: `the reference library holds nothing sharing the claim's
  words` — a gap in the shelf, not a verdict.
- The bound, when it engaged (`candidates > consulted`): `518 documents
  matched; the 12 best were read`.

The response's own `sentence` field is a ready-made one-liner in exactly
this register if the surface would rather not compose.

## Measured facts the design stands on (2026-08-17, this machine)

- Corpus: 2,047 files, 183.4MB, 31.2M words. Listing ~12ms; stat sweep
  ~5ms; reading every byte ~1.1s; tokenizing everything ~9.2s. A full
  per-check sweep is therefore NOT interactive — selection is required, and
  it is mechanical: claim-word overlap with filename + provenance title
  (argmax count), then the claim's category ladder (encyclopedic and
  government before literature for world claims), then path order.
  Consultation is bounded by `PRIORS_DOCS_CONSULTED` (12, engineering
  starting point, declared in priors.js) with the true candidate count
  always on the result.
- Route latency, live: ~450ms cold (first head sweep of the corpus builds
  the path·mtime·size-memoized title listing), ~40–50ms warm per check,
  including reading and sentence-walking the consulted documents.
- Offsets verified end to end: a snip's `[start,end)` sliced from the live
  corpus file on disk reproduces the snip byte-for-byte (checked
  independently of the server in the smoke run, and pinned in
  priors.test.mjs against the fixture).

## Known residue, measured, disclosed

"Universal Declaration of Human Rights" yields 518 candidates of identical
overlap — 516 of them same-titled UDHR *translations* — and path order then
buries the English text (`udhr-eng.txt`) outside the 12 consulted: verdict
`unstated-by-consulted` although the shelf plainly holds the statement.
Filename+title selection cannot see inside a shelf of same-titled documents.
The honest output still holds (0 of 12, bound disclosed); the real fix is
the proper index named in priors.js's comments — eoreader6 host ingestion
(`createSession`/`admitChunked`, then `searchSpans`, the same
`{byte_start, byte_end}` address shape this repo's refs use) — which is a
minutes-long one-time admission of 183MB whose persistence story this pass
does not own. Named future work, not half-built.

## Seams with concurrent work

- `priors-toggles.js` + `/api/priors`, `/api/priors/toggle`, `/api/priors/doc`,
  `/api/priors/enabled` (another session, same day) are the corpus's
  *attachment* organ — what the chat may ingest as material. The CHECK does
  not read the toggle ledger: a fact-check consult and a material attachment
  are different acts. If the owning session decides disabled shelves should
  also be invisible to the check, the wiring point is one line
  (`listPriorDocuments` filtering on `effectivePrior`), but that decision —
  and whether it is honest to let a toggle silently shrink a fact check —
  belongs to that session, not this note.
- Both walks deliberately share the same scope rule (FIND_SKIP, PRIORS_SKIP,
  dotfiles, top-level loose files) so the two priors organs see one corpus.
- The fixture `eval/fixtures/ukpga-2017-1.md` is a byte-identical copy
  (sha256 a2fa6dab…) of
  `live_priors/06-government-legal/world-legislation/uk/ukpga-2017-1.md`
  with its provenance frontmatter intact; priors.test.mjs names it as its
  origin.
