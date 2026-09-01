# Overlong capitalised runs need Kind-typing, not frequency (2026-09-01)

Found live reading Dracula end to end. `Fenchurch Street Lord Godalming`
(79 mentions in the cast, one actual occurrence in the book) is a real
4-token capitalised run with **no punctuation and no abbreviation
anywhere in it**:

```
Just before we reached Fenchurch Street
Lord Godalming said to me:--
```

A hard line wrap sits between `Street` and `Lord`, and `extractSurfaces`
crosses a bare newline **on purpose** — Gutenberg hard-wraps prose
mid-sentence, and refusing to cross would lose most of a book
(`source.js`'s own `blankFurniture` header states the same reasoning from
the other direction). So this is not a punctuation bug, not an
abbreviation bug, and not a regression. A first hypothesis blaming
`deriveAbbreviations` was **measured and refuted** before anything was
built (P5.5: check the driver before the theory).

## What was tried, measured against every multi-token surface in the book

A description-length-flavoured split rule: prefer the segmentation whose
parts are better attested than the glued whole.

| rule | fires | correct |
|---|---|---|
| `min(n(left), n(right)) > n(whole)`, 3+ tokens | 10 | 2 |
| + a part that cannot stand alone as a referent cannot license a split (reuses the bare-honorific refusal already shipped this pass) | 5 | 2 |
| + independent attestation (`n(left) − n(whole)`, since `extractSurfaces` generates every prefix, so a prefix is credited the whole's own count) | 3 | 2 |

The third variant fires correctly on `Fenchurch Street Lord Godalming`
and still splits `Miss Lucy Westenra` into `Miss Lucy` | `Westenra`.

## Why no further tuning was attempted

There is **no frequency signal** separating the two cases, because
frequency is not what differs. In `Fenchurch Street Lord Godalming` the
two parts name **different entities** — a street and a person. In
`Miss Lucy Westenra` every part names the **same** entity. Both parts are
genuinely, independently attested in both cases. A threshold tuned to
split the first splits the second; that is specimen-fitting, which
POLICIES.md P71's generality gate exists to refuse, and which this
session's user direction has repeatedly redirected away from.

## The real finding: three reported bugs, one missing capability

All three cast defects reported live in this session reduce to the same
absent organ, not to three separate patches:

- `Castle Dracula` conflated with `Count Dracula` — a place and a person
  sharing a final token.
- `East Cliff` merged with `West Cliff` — two places sharing a final
  token, which `namesCorefer`'s shared-final-token rule cannot separate.
- `Fenchurch Street Lord Godalming` — a place run and a person run glued
  across a line wrap, which no frequency rule can separate.

Each needs the reader to know **what kind of thing** a referent is.
`entity-kind-induction.js`'s `induceEntityKindCandidates` / `testKindMembers`
(the Kind terrain, Existence × Pattern) is the organ that answers it, and
wiring it is real, scoped, unstarted work — named here rather than
approximated by a fourth threshold.

## What DID ship this pass, all measured and live-verified

- `stripItalicsMarkup` (`source.js`) — Gutenberg `_italics_` markup, 308
  occurrences, was leaking into subjects (`_Hell`, `_Czarina Catherine_`).
- `NEVER_A_NAME` wired into `surfaces.js`'s run detector — an existing,
  unconsumed prior; removed `I've`/`I'll`/`I'm`/`I'd` from the cast.
- `HONORIFIC_TITLES` (new closed class, `priors.js`, giver `lang/en`) —
  a bare title is never its own referent; removed `Dr`(100)/`Mr`(81)/
  `Mrs`(72)/`Lord`(55)/`Miss`(39).
- `STRUCTURAL_LABELS` (new closed class) — removed `August CHAPTER`,
  `Harker Journal CHAPTER`, `Seward Diary CHAPTER`.

## One regression caught and reverted, worth not repeating

Filtering `STRUCTURAL_LABELS` inside `surfaces.js` itself broke
eoreader7's own `rich-referents.test.js` ("the Princess wall"). That
suite pins a **deliberate two-stage design**: extraction is permissive on
purpose so that `minPartners`/`minSentences` can disqualify junk
downstream — `"Chapter Marlowe"` is *supposed* to be admitted as a junk
partner surface. Display-level filtering belongs in the-fold's own cast
assembly, never in the shared extractor.
