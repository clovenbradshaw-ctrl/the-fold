# Chip coverage — integration note for the app.js/holon.js session

2026-08-17. Measured live: a three-sentence answer, every sentence standing on
the material, shipped with a bare middle sentence — the reader asked "how did
it know all this?". The pure layer now closes its half of that gap; this note
is exactly what the rendering side must call and draw. cite.test.mjs (the
"coverage" section, 8 new tests) pins everything claimed here; the whole suite
is 392/392.

## What exists now (cite.js — done, tested, yours to consume)

`coverage(answer, offered, pool, {samples})` — cite.js:370. Same entry shape
as `attribute` (`{text, ref, score, floor}`, plus `cited`/`vetoed`), so
`classifySentences` and `attributedRefs` take its output unchanged.
Differences, each visible on the entry:

- A sentence whose best-supporting passage is a NON-OFFERED pool chunk gets
  that chunk's address: `ref` set, `via: "pool"`, `rescued: true`. This was
  the measured gap: the answer's opening sentence stood on the page's own
  lead, the lead was not offered, the null found it and outscored the offered
  passages 6–2 — and `attribute` refused the address it had just found.
- An offered passage that TIES the null now attaches: `via: "offered"`,
  `rescued: true`. (Strict wins carry `via: "offered"` and no `rescued` —
  identical refs to `attribute`, pinned by test.)
- A pool-side winner that ties another rival is refused as `ambiguous: true`
  — an address names one place; an argmax with two winners names none.
- The names veto and MIN_RUN stand unchanged. Invented subjects still get
  nothing (pinned: Hendersonville, Éloise, Iríska cases run against
  `coverage` too). Rescue, never invention.
- `coverage(answer, [], pool)` works — a turn that retrieved nothing can
  still have its sentences covered by loaded material. (`attribute` returns
  `[]` there; that difference is deliberate.)

`attribute` (cite.js:254) is byte-for-byte the same discipline as before —
the record's organ. Nothing you already call changed behavior.

## Web sources: the ref shape, verified

A fetched page's text face is `web/pages/<sha16>.txt` on disk, but it reaches
the chat named by BASENAME: explore-server.mjs:520 (`name: path.basename`) →
explore.js:577 `fold:material:add` → app.js:3196 `addSource(d.name, …)`. So a
Wikipedia source's chunks carry refs like `b02d7a4f9c4d1e63.txt#2576-2827` —
no directory, no URL. Nothing in cite.js assumes file-style names; both the
basename shape and a slashed `web/pages/ab12cd34.txt#a-b` shape are pinned
attaching and `readRange`-round-tripping in cite.test.mjs. No app.js change
is needed for web refs specifically: they are ordinary refs into loaded
sources, and `reopen(ref)` already resolves them.

## What to change, per call site

Rendering swaps to `coverage`; records keep `attribute`. Same evidence, two
duties — `rescued`/`via` keep the difference visible.

1. **A/B turn.** app.js:1007 and :1026 compute `freeAttr`/`boundAttr` with
   `attribute`. Add `const freeCov = coverage(free, passages, live)` and
   `const boundCov = coverage(flat, passages, live)`; pass THOSE to the two
   `classifySentences` calls at app.js:1039 and :1050. Leave the record math
   at app.js:1093–1096 on `attributedRefs(boundAttr)` (or widen deliberately
   — see "records" below).

2. **Holonic turn.** The render at app.js:1511 passes
   `result.sections.flatMap((s) => s.attributions)` (app.js:1456). Compute
   `coverage(result.output, offered, liveChunks())` at that point (the
   `offered` union built on app.js:1455) and pass it to `renderAnswer`
   instead; `renderAnswer` only feeds it to `classifySentences`
   (app.js:1580), so nothing else moves. holon.js:582 can stay on
   `attribute` — its output feeds the per-part record.

3. **/reflect (self plane).** app.js:1167 → `coverage(answer, offered, all)`
   with the same `all = ledgerChunks(...)` (app.js:1136), passed to the
   render at app.js:1177. Pool-side rescues there point into the ledger —
   same plane, still `self:` refs, no wall crossed.

## Two rendering fixes the pure layer cannot make

4. **The run-collapse hides chips after an interruption.** app.js:1587–1596:
   `lastRef` resets on a model-CITED sentence but NOT on a model-voice one,
   so `s1(ref A) · s2(model voice) · s3(ref A)` gives s3 `showChip: false` —
   a bare material sentence, the exact symptom measured. Reset on ANY
   sentence that carries no `ref`:

   ```js
   if (e.ref) { e.showChip = e.ref !== lastRef; lastRef = e.ref; }
   else lastRef = null;
   ```

5. **The chip's title must say which claim it makes.** app.js:1858–1868
   currently says "attached by this app against a measured null" on every
   attached chip. That is now true only when `entry.rescued` is absent. Read
   the fields:
   - no `rescued` — keep the current copy (margin beaten);
   - `via: "offered"`, `rescued` — "attached by this app — the passage the
     turn was given states this phrase";
   - `via: "pool"`, `rescued` — "attached by this app — the material states
     this in a passage this turn was not shown. Press to read it." (Consider
     a distinct visual, e.g. `.ref.attached.pool`, so a reader can see the
     difference without hovering; IV.4's spirit.)

## Records — decide, don't drift

`attributedRefs(coverageEntries)` works, but putting rescued refs on a
warrant record silently upgrades containment-found addresses to
margin-earned authority. If you widen the record, do it visibly (e.g. a
`covered` channel beside `attributed`, refs from entries with `rescued`
listed under it). Doing nothing is also coherent: chips widen, records stay
strict, and the tally at app.js:1627–1639 will already count more sentences
as material-ground because classification follows the entries you pass it.

## The theorem you get

Pinned in cite.test.mjs ("classified over coverage, no material-ground
sentence is bare"): after `classifySentences(answer, coverage(...), …)`,
every `ground: "material"` entry carries an address (inline or `ref`), and
every bare sentence is honestly `ground: "model"`. With fix 4, "material
ground" and "wears its address" become the same fact on screen — coverage of
provenance is the product.

## Residues, so you can say them rather than rediscover them

- A sentence rewritten past any shared two-term run cannot be attached and
  stays model-voice (dotted). Support only the atom/relation tiers can see
  is their business, not a phrase organ's.
- An `ambiguous` refusal can be genuinely supported material — a phrase the
  corpus states everywhere is better attested, not worse — but one address
  for an everywhere-phrase would be false precision; `corroborateAtoms`
  counts that support as perspectives.
- A generic two-term run living in exactly one drawn pool passage earns a
  weak chip (measured live: "troops against" → the Barclay passage). The
  chip's literal claim — these bytes state this phrase — stays true; the
  stripe machinery independently flags any figures the material lacks
  (P12's orthogonality, untouched).
