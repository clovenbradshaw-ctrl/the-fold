# The-fold → eoreader7 native migration (legacy-eoreader6.1 retired)

Prepared 2026-09-15 after `eoreader7@8445a84` retired the
`legacy-eoreader6.1` submodule and its 28 root compatibility symlinks.
This is the SIZING and PLAN, not the migration. The pointer doc
(`eoreader7/LEGACY-EOREADER6.1.md`) names this as the owning consumer's
pass; this file is the fold's half of that handoff.

## The pairing rule this migration serves

**The fold is a surface on eoreader7.** the-fold depends on eoreader7,
never the reverse. Cloning either repo from GitHub provides the pair.
After this migration the fold's only eoreader7 imports resolve
`../eoreader7/kernel.js` or `../eoreader7/native/…` — the retired
`../eoreader7/legacy-eoreader6.1/…` surface never appears again.

## Shipped 2026-09-15 (this pass)

- **PRIORS_DATA repoint** — `serve.mjs` and `explore-server.mjs` primary
  now reads `eoreader7/native/eval/the-fold/fixtures/` (the byte-identical
  POSPrior@1 committed there) instead of the retired `scripts/corpus/`
  gitignored build dir — which on disk held only the raw corpora, never the
  derived prior, so the mount had been served by the fallback chain all
  along. The `PRIORS_DATA_OWN` → `PRIORS_DATA_SHIPPED` chain and the
  `eng → en` alias are unchanged (both server comments rewritten to say so
  honestly rather than describing the retired primary).
- **Contract updated** — `eoreader-contract.json` filesystemMounts now
  lists `native/eval/the-fold/fixtures` for both servers (was
  `scripts/corpus`); `eoreader-contract.test.mjs` 7/7 (its
  `"eoreader7", "legacy-eoreader6.1"` sibling-mount assertion still holds
  on the retained ENGINE/NUL mounts).
- **`network.test.mjs` control** — its direct text-organ imports repointed
  to `native/adapters/text/` (exact export-name match for all ten names;
  the Link-grain-zero control passes on native, 12/12).
- **Six comments-only references** to the retired path cleared
  (void-loop / predigest / metacognition / metacognition-hunt test
  headers, `grid.js`, `widget.js`).

## Proof of the defect (what must be true after)

Fresh clones of both repos (the `./fold` quickstart layout):

```
OK   eoreader7 kernel.js (native)                       — v7 loads
OK   the-fold → eoreader7/native/organs/index.js (seam) — surface path resolves
FAIL the-fold → eoreader7/legacy-eoreader6.1/…          — 57 files, RETIRED path
OK   no legacy-eoreader6.1, no .gitmodules in clone     — retirement is real
```

## Size

- **57 committed files** import the retired path
- **21 distinct legacy subpaths** (below)
- Breakdown: 10 `experiments/`, 8 `eval/`, 4 runtime surface files
  (`serve.mjs`, `explore-server.mjs`, `explore-worker.mjs`,
  `proxy-runner.mjs`, `deploy/build-site.mjs`, `grid.js`), 34 test files

## The migration table — legacy subpath → native home

### Direct 1:1 (native twins exist, verified)

| legacy subpath | native home | exports match? |
|---|---|---|
| `packages/engine/perceiver/text/spans.js` | `native/adapters/text/spans.js` | verified in `spans.js` |
| `…/text/surfaces.js` | `native/adapters/text/surfaces.js` | `extractSurfaces/discoverReferents/namesCorefer/diaNorm` |
| `…/text/relations.js` | `native/adapters/text/relations.js` | `discoverRelationVocab/extractRelations` |
| `…/text/material.js` | `native/adapters/text/material.js` | `tokenize` |
| `…/text/priors.js` | `native/adapters/text/priors.js` | closed classes |
| `…/text/wordclass.js` | `native/adapters/text/wordclass.js` | `classifyWord` |
| `…/engine/operators.js` | `native/kernel/cube.js` | `cellOf`, `OPERATOR_CHAIN` (the one canonical order) |
| `…/engine/holon/task-log.js` | `native/kernel/task-log.js` | `ENTRY_KINDS, OPERATOR_BASIS, createTaskLog, append` (four exports, verified — fold commit cc294ee already repointed HL here) |

### Hard organs — no 1:1 native twin, decided per organ

| legacy subpath | fold usage | disposition |
|---|---|---|
| `…/emergence/tiers.js` | `createTierStack/foldThrough` — self plane's surprise meter (`reflex.js`/`aperture.js`) | **native `native/kernel/dynamics.js` is a structurally different mechanism** (Bharata's expectation/obligation axis). P69's ratchet disclosed this as the one holdout. Decision needed: port tiers faithfully (its own pass) OR re-point the self plane at dynamics. NOT a one-line repoint. |
| `…/emergence/binding.js` | arrivals floor / co-arrival binding (`network.js`, `clippy.js` gates) | check for a native co-arrival/binding home (`native/` search first); if none, this is the second genuinely-ported organ |
| `…/engine/referents/index.js` | `projectReferents` (`eval/`, `explore`) | native referent home is `native/adapters/text/surfaces.js` + `native/organs/cast.js`; verify `projectReferents`' caller needs |
| `…/nul/index.js` | the statistics subsystem (`measure.js` reads it; ~1,306 lines, `LICENSED` table, `ground/difference/extremeGround`) | **native has no `nul`**. P69 left it on `/engine/` deliberately. This is the largest port: the statistics engine itself. NOT a one-line repoint. |
| `…/nul/` + `…/nul/index.js` (paths) | server mount `"/nul/" → eoreader7/legacy-eoreader6.1/nul/` (`serve.mjs`, `explore-server.mjs`, `deploy/build-site.mjs`) | a served mount, not an import — repoint the mount or drop it with nul's port |
| `…/bin/priors/pos/en-ud-ewt.json` | POS prior (`grid.test.mjs` etc.) | eoreader7's CLI already BUNDLES this (`cli/priors/pos-prior-en.json`, per `cli/eoreader7.mjs` header). Point tests at the bundled copy. |
| `…/scripts/corpus/pos-prior-eng.json` | POS prior (train/dev/test build) | **SHIPPED**: served mount primary repointed to `native/eval/the-fold/fixtures/` (the byte-identical POSPrior@1 committed there); OWN → SHIPPED fallback chain retained (P73/P74) |
| `…/odyssey-greek.txt` | corpus fixture (`web-claim.test.mjs` etc.) | a DATA fixture, not code — migrate to `native/eval/the-fold/fixtures/` |

## Migration order (dependency-aware)

1. **Pure repoints first** — the 1:1 rows (spans/surfaces/relations/material/
   priors/wordclass/operators/task-log). Mechanical; the fold's own
   `ENGINE=native` precedent (eoreader7 P69) proves native parity is the
   suite's own supported configuration.
2. **Data + bundled prior** — the two prior paths and the greek fixture.
3. **The three decided organs** — tiers, binding, nul: each is its own
   port with its own conformance, never a silent repoint. nul is the
   largest (a statistics engine); the `nul/` server mount dies with it.
4. **The served mount** in `serve.mjs`/`explore-server.mjs`/
   `deploy/build-site.mjs` — after 3, `/nul/` has nothing left to serve.

## What proves each step

- The fold's own suite (`npm test` / `node --test`) runs green after
  each file's repoint — the same engine-parity posture eoreader7's P69
  ratchet already uses (`ENGINE=native`).
- The pair-proof fresh-clone check flips from `FAIL` to `OK` for the
  fold's runtime entrypoints (`proxy-runner.mjs`, `serve.mjs`,
  `explore-server.mjs`).
- Zero occurrences of `legacy-eoreader6.1` in the fold's committed tree
  (the acceptance gate: `git grep -l "eoreader7/legacy-eoreader6.1"` is empty).

## Out of scope (named, not silently dropped)

- `nul` statistics engine port (step 3, own pass).
- `tiers.js` faithful port vs. dynamics adoption (step 3, needs a decision).
- The skeleton-first Lens-as-answer build (THE-HOLOGRAPH §5's next build)
  is untouched by this migration; the migration is its precondition.