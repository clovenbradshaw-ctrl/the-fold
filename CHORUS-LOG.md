# Chorus log — append-only, one entry per lint run

## 2026-08-17 — build-turn chip noise fix (grounding.js, app.js, grounding.test.mjs, CLAUDE.md)

Constitution: `../FOLD-CONSTITUTION.md` + this repo's POLICIES.md/CLAUDE.md.

| persona | cell | citation | file:line | verdict | summary |
|---|---|---|---|---|---|
| Diaconis | NUL | II.11 earned-constant | grounding.js blankStructure | clean | list-marker prefix is markdown's own grammar, no tuned constant |
| Feynman | DEF | III.3 absent test / P13 disclosure discipline | app.js renderGrounding (check-online + names-&-figures section text) | fixed | fold text promised automatic lookups / clickable rows a build turn withholds; text now says "withheld" and the auto-check tail gates on !buildTurn |
| Dijkstra | SEG·Field | P5.2 offsets | grounding.js / grounding.test.mjs | clean | length-preservation pinned; marker digit blanks with the label |
| Simon | SEG·Network | P11 one shared fold | hypergraph.js via blankStructure | clean | relation tier inherits the fix through the one shared implementation; taggedProse residue disclosed in CLAUDE.md |
| Frankfurt | INS | II.1 giver | — | clean | nothing generated |
| Ostrom | CON | P7-style disclosed scope | app.js buildTurn | clean-as-disclosed | turn-scoped suppression names its over-reach in comment and doc |
| Holmes | SIG | — | — | clean | no identity logic touched |
| Pearl | EVA | — | — | clean | no independence claims touched |
| Alexander | SYN | — | app.js 1819→1839 | clean | class set before read at the only call site |
| Chekhov | residual | — | app.js proofCheckNode on build turns | noted | chips constructed then unmounted on build turns — live on every other turn, not dead code |
| Marshall | meta | IV.1/P10 | CLAUDE.md amendment; grounding.test.mjs | clean | doc appends, grounding change carries its test; app.js render paths have no DOM harness anywhere in repo (standing practice); no citations struck |

---

## 2026-08-17 — review of `daff86d` (origin/main, PR #12 "fact-check-claim-ledger" — the priors organ + claim ledger + evidence-pool work)

Eleven personas (Diaconis, Feynman, Dijkstra, Simon, Frankfurt, Ostrom,
Holmes, Pearl, Alexander, Chekhov, Marshall) run via `Workflow`, against
`FOLD-CONSTITUTION.md`, `POLICIES.md`, `CLAUDE.md`. Scope: the priors-organ
+ fact-checking diff merged as PR #12. Two runs (rate-limited mid-run,
resumed from cache): the first six personas' results are load-bearing; the
resume re-ran Dijkstra, Holmes, Chekhov, Alexander, and Marshall, and — per
Marshall's own note — the working tree had moved under the review by then
(a concurrent session was committing live), so Marshall's second pass
verified findings against a direct re-read of the byte-identical
`daff86d` content rather than trusting the shifted working tree.

| Persona | Cell | Article | File:Line | Verdict | Summary |
|---|---|---|---|---|---|
| Diaconis | NUL | POLICIES P13 | app.js:2696 | fixed | `search.gap` nulled whenever the evidence pool is non-empty — a refused/unrun search reads identical to a completed empty one |
| Diaconis | NUL | FOLD-CONSTITUTION II.11 / POLICIES P9 | app.js:2743 | fixed | bare `.slice(0, 2)` snip cap, no name/giver/count carried |
| Feynman | DEF | FOLD-CONSTITUTION IV.3 | priors.js:361 | fixed | `foldPriors` derives verdict straight through gapped documents instead of inheriting the gap |
| Feynman | DEF | FOLD-CONSTITUTION II.8 | priors.js:364 | fixed | "the reference library holds no document sharing the claim's words" overclaims — only filename+title were checked, never bodies |
| Feynman | DEF | CLAUDE.md — grounding ladder | claims.js:164 | fixed | "a primary source states it" asserts a class `classifyCitation` measured as "other" |
| Feynman | DEF | FOLD-CONSTITUTION III.3 | claims.js:176 | deferred | priors/primary gaps render as silence, same as never-consulted — deferred because (Chekhov confirms) neither tier has a live caller yet; must land with the wiring, not before |
| Dijkstra | SEG Field/Link | POLICIES P11 | proof.js:95 | fixed | `rankResults` builds overlap sets with plain `toLowerCase()`, no `foldDiacritics` — the one outlier among three structurally identical sibling rankers |
| Dijkstra | SEG Field/Link | CLAUDE.md — coordinate spaces | claims.js:170 | fixed | comment mislabels priors-tier snip offsets as "byte offsets"; they are JS-string char offsets |
| Dijkstra | SEG Field/Link | POLICIES P11 | app.js:3943 | noted | picker's live filter has no diacritic fold (manual browse aid, low stakes — not fixed this pass) |
| Simon | SEG Network | POLICIES P19 (priors) | explore-server.mjs:284 | fixed | `walkPriors` (toggle tab) omits the symlink guard `listPriorDocuments` (checking tier) carries — the two priors organs can see different document sets |
| Simon | SEG Network | POLICIES P1 (amendment 4) | web.test.mjs:257 | fixed | `priors-toggles.js`/`priors.js` missing from the Explore host-literal seam scan |
| Simon | — | process note | (git state) | noted | working tree didn't match the review's described "pending commit" at review time — resolved by reviewing `daff86d` directly |
| Frankfurt | INS | — | — | clean | first pass: real finding (folded into Diaconis's app.js:2696, same incident); second pass: clean on the verified `daff86d` content |
| Ostrom | CON | FOLD-CONSTITUTION III.3 | holon.js:876 | fixed | `hasMaterial` is a part-level boolean overriding a document-scoped accurate refusal, deleting it to `""` |
| Ostrom | CON | FOLD-CONSTITUTION II.7 | measure.test.mjs:434 | out-of-scope | identity assertion weakened to a type check — this is in the unrelated, uncommitted "measuring door" WIP, not `daff86d`; not touched |
| Ostrom | CON | FOLD-CONSTITUTION II.6 | (6→6.1 migration doc) | out-of-scope | same WIP; unrelated to the priors-organ review |
| Holmes | SIG | CLAUDE.md — priors organ | app.js:3986 | fixed | genre-prefix disambiguation is single-shot — a third same-named file across genres can silently overwrite a second |
| Holmes | SIG | POLICIES P11 | proof.js:269 | fixed | inline claim-key construction duplicates `claims.js::claimKey` with a diverging empty-tokens fallback |
| Pearl | EVA | POLICIES P12 | priors.js:359 | fixed | `foldPriors` counts document COUNT as independent-perspective count, no independence/residue field — the corpus holds 516 UDHR translations under one identical title |
| Pearl | EVA | CLAUDE.md — grounding ladder | priors.js:368 | fixed | "best-matching" is inaccurate when the tiebreak is path order, not relevance; same-work flooding undisclosed |
| Alexander | SYN | — | — | clean | no violations found |
| Chekhov | residual | POLICIES P19 | claims.js:175 | fixed (doc) | the priors/primary checking tiers have ZERO live callers — `state.priors`/`state.primary` are always undefined; CLAUDE.md's "Known limits" undersold this as a narrower, scoping-only gap — wording corrected |
| Marshall | meta | POLICIES.md amendment discipline | POLICIES.md:630,728 | fixed | two unrelated policies both headed `## P19` — renumbered the priors-organ one to P20 |
| Marshall | meta | — | 3 amendment docs (priors-note.md, primary-source-note.md, chip-coverage-note.md) | upheld — compliant | each proposes without disposing (VI.2); none edits POLICIES.md/FOLD-CONSTITUTION.md directly |
| Marshall | meta | FOLD-CONSTITUTION II.3 | widget.js:92-122 | **out-of-scope, disclosed separately** | `makeWidgetRouter` demands engine-register exports (`INDEFINITE_DETERMINERS` etc.) that exist nowhere in `eoreader6`/`eoreader6.1` — confirmed independently by direct test run against a clean `daff86d` checkout: `widget.test.mjs` throws at construction. This is baked into `daff86d` itself, not just the uncommitted WIP Marshall observed it in. **Not fixed this pass** — fixing it means adding word-list exports to a sibling repo's (`eoreader6`) prior register, a design decision outside this review's mandate. Reported directly to the user. |
| — | — | — | measure.test.mjs / app.js `perceiver/audio/reduce.js` | **out-of-scope, disclosed separately** | `perceiver/audio/reduce.js` does not exist in `eoreader6` or `eoreader6.1` on disk — `measure.test.mjs` fails at import on a clean `daff86d` checkout. Same posture as above: real, already-merged, unrelated to the priors-organ review, not fixed. |

**Verified fixed** (this pass, on branch `chorus-lint-fixes`, off `origin/main`):
Diaconis ×2, Feynman ×2 (of 3; one deferred), Dijkstra ×2 (of 3; one
noted), Simon ×2, Ostrom ×1 (of 1 in scope), Holmes ×2, Pearl ×2, Marshall
×1 (POLICIES.md numbering). Full suite re-run after fixes; see commit
message for the pass/fail count (two pre-existing, unrelated failures
excluded and disclosed, not silently skipped).

**Deferred, with reason:** claims.js:176 (priors/primary gap rendering —
must land with the wiring, currently no live caller).

**Out of scope, disclosed to the user directly rather than silently
skipped:** the "measuring door" feature (widget.js/measure.js) is broken
on `daff86d` itself for two independent reasons (missing engine exports,
missing engine module) — both require changes in a sibling repo
(`eoreader6`) this review has no mandate to make.
