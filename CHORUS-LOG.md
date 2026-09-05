# Chorus log — append-only, one entry per lint run

## 2026-08-18 — dialogue-narration echo guard (holon.js, provenance.js, holon.test.mjs)

Constitution: `../FOLD-CONSTITUTION.md` + this repo's POLICIES.md/CLAUDE.md. Reviewed diff: `isFraming` gains a third echo shape (subject-names-a-dialogue-participant + carries-a-dialogue-act-verb), catching drafts like "The user is waiting for more information about the weather." that neither the question-word-coverage test nor WH_CLAUSE could see.

| persona | cell | citation | file:line | verdict | summary |
|---|---|---|---|---|---|
| Diaconis | NUL | II.11 earned-constant, vs. ACT_WORDS' own dated-measurement precedent | holon.js NARRATION_SUBJECT (pre-fix) | fixed | vocabulary trimmed to exactly the measured lemmas (subjects: user/conversation; verbs: ask/start/wait/look) — unmeasured guesses (say, seek, need, request, wonder, refer, concern, mention; subjects question/prompt/model/assistant/chat/dialogue) removed |
| Feynman | DEF | II.10 falsifiability | holon.js comment | noted, not fixed | the disclosed false-positive residue (real material about users/conversations carrying a listed verb) remains untested by design — local law permits disclosed-not-tested, but the disclosure text was tightened to name the exact consequence |
| Dijkstra | SEG·Field | II.3 register-ladder; CLAUDE.md's markdown-anchor-defeat precedent | holon.js regex gap-class | fixed (clause boundary) / noted (markdown prefix) | `[^.;:!?]*?` widened a dialogue verb's reach across commas/dashes into unrelated clauses — narrowed to match WH_CLAUSE's own stop class `[,;:—–]`, pinned as a regression (holon.test.mjs, "a dialogue-act verb inside a LATER clause…"); markdown-bullet/bold leading-junk gap left as a disclosed note, not fixed this pass |
| Simon | SEG·Network | POLICIES.md P11 one shared fold; P10 test-lands-with-code | holon.js vs provenance.js:136 `NARRATION_SUBJECT` | fixed | provenance.js's own null-measured (194 docs/~460k sentences) NARRATION_SUBJECT/CUT_RES extended with the two measured-live gaps (wait(s)/waiting, look(s)/looking) it was missing; holon.js's constant renamed `DIALOGUE_NARRATION_RE` with an explicit cross-reference explaining the two mechanisms are NOT redundant (clean() deletes pre-judgment with no verdict signal; isFraming classifies what survives, driving the echoed verdict/correction/fallback) — not unified into one function this pass, since that would touch the shared sentence-classification core another concurrent session owns; P10 gap (tests committed in HEAD without the code) closed by this commit landing atomically |
| Frankfurt | INS | Article V claim/verdict discipline, III.3 absent test | holon.js:1145-1212 | clean | narration verdict lands a typed open entry, never silent; mechanical fallback ships real addressed material, not fabrication |
| Ostrom | CON | scope-of-blame | holon.js judge()/contentSentencesOf | clean | per-sentence scope is correct — a single narration sentence beside real content trims, never convicts the whole draft |
| Holmes | SIG | identity/surface-overlap | holon.js:isFraming consumers (contentSentencesOf) | noted | "the user" as dialogue-narration vs. as a material referent (an API doc) is a real surface collision; disclosed in the widened residue paragraph (reproduction-denominator consequence named), not resolved — same disclosed-not-tested posture as Feynman's finding |
| Pearl | EVA | independence of corroborating signals | holon.js DIALOGUE_NARRATION_RE | clean-as-disclosed | subject+verb tells share a common cause (dialogue register); the comment discloses this rather than claiming independence |
| Alexander | SYN | composition seam, ship-cut invariant | holon.js:1145-1187 | noted, not fixed | mid-draft narration (not prefix/suffix) still ships despite being classified as framing — pre-existing gap this diff widens the class flowing through; named explicitly in the widened residue paragraph as future work, not silently left |
| Chekhov | residual | reachability | holon.js DIALOGUE_NARRATION_RE | clean | live path confirmed app.js→holonicTurn→runHolonicTask→runPart→isFraming; both regressions (holon.test.mjs) exercise the new branch; all 40 tests pass |
| Marshall | meta | IV.1/P10 conformance | this table + the diff | clean | all nine findings above trace to real, correctly-quoted articles; two (Diaconis, Simon P11/P10 half, Dijkstra clause) fixed same pass; three (Feynman, Holmes, Simon's markdown note, Alexander) deliberately deferred-with-reason and named in-code, not silently dropped — no citation struck as false-positive-on-review |

**Post-merge addendum, same day.** Simon's and Alexander's warnings above materialized the moment this branch merged with `main`, which had independently landed the same `stripNarrationSentences`/`CUT_RES` wiring into `holon.js`'s `clean()` — confirming the diverging-vocabulary risk was real, not theoretical. Once both the sibling mechanism's vocabulary and this file's DIALOGUE_NARRATION_RE covered "waiting"/"looking", `clean()` started removing BOTH sentences of the live 3-turn transcript entirely, BEFORE `judge()` ever saw one — and `judge("")`'s empty-input branch (`{echoed: false, reproduced: false}`) reads a wholly-narrated, now-empty draft as "no text produced," which is materially weaker than "the model narrated instead of answering": no correction retry, no mechanical fallback, the turn ships nothing. Fixed at both call sites in `runPart` (the first draft and the correction retry): when the raw model output was non-empty but cleaning emptied it, the verdict is forced to `echoed` so the existing pipeline runs exactly as it does for any other echo. Verified against the exact live transcript in an isolated worktree (`../eoreader6.1`-adjacent, so relative engine imports resolve): 700/704 tests pass, the 4 failures being pre-existing environment gaps (`eoreader6`'s own missing `perceiver/audio/reduce.js`, unfetched local model-weight fixtures) unrelated to this change.

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

## 2026-09-05 — P95: the audit finished (branch `p94-audit-pass13`; docs only in this repo)

Constitution: `../eo-constitution/CONSTITUTION.md` + POLICIES.md/CLAUDE.md. Reviewed diff: POLICIES.md P95, CLAUDE.md pointer, NEXT-PASSES.md Pass 13 closed / Pass 14 opened. The code under review lives in eoreader7 (`eoreader7/CHORUS-LOG.md`, same date, carries the full table). The ten persona subagents were rate-limited before reporting; lenses run sequentially in-session.

| persona | cell | citation | file:line | verdict | summary |
|---|---|---|---|---|---|
| Ostrom | CON | II.9; P41 | POLICIES.md P95 (rashomon, subject-wall clauses) | fixed (wording) | drift attributed to S63/S64 as cause; now candidates, not isolated |
| Alexander | SYN | — | P95 / S65 / NEXT-PASSES Pass 14 / CLAUDE.md pointer | clean | counts and file names agree across the four documents and with the eoreader7 diff |
| Marshall | meta | POLICIES.md Generality discipline (P≥71); IV.1 | POLICIES.md P95 | upheld — compliant | Generality line present and read by `generality-gate.test.mjs`; enforcement ships in the paired eoreader7 diff |
| others | — | — | — | clean | no code in this repo's diff |

## 2026-09-05 — P115: frontier-25, arithmetic's shaped questions and calendar, shape.js's declared form (branch `frontier-25`)

Constitution: `../eo-constitution/CONSTITUTION.md` + POLICIES.md/CLAUDE.md. Tier 1 (`chorus-fast.sh --working`): law ok (8 citations resolve; P19/S17 pre-existing duplicates warned), routed Diaconis · Feynman · Dijkstra · Marshall; suites the-fold 1,605 pass / 3 fail (`webllm-rung.test.mjs`'s mirrored-weights walls — the gitignored mirror is absent in this worktree, present in the main checkout; not this diff's) · arithmetic 23/23 · shape 17/17 · generality-gate + constitution 16/16.

| lens | citation | file:line | verdict | one line |
|---|---|---|---|---|
| Diaconis | II.23; P4 | POLICIES.md P115 "The eval" | clean | the only null in the diff is the measuring door's own (burstiness/shuffle, draws 200); the video pairing's collapse is reported as `degenerate_ground`, a fact about the pairing, and the fixture pins that verdict rather than a cut claim |
| Feynman | P4 (no hand-set thresholds) | arithmetic.js:238 `nums.length < 2` | clean | a statistic "of" one number is not a list — structural, not tuned; the mouth arm's arithmetic witness compares at the organ's own precision (a rounded "8.05 km" reads as failed) and the results doc says so |
| Dijkstra | III.3 | arithmetic.js:224 `unitWord` | noted | `toLowerCase` on unit words is ASCII-safe for mathjs's own unit names; `°c`/`°f` are mapped by hand — a non-Latin unit word falls to the engine, which refuses it as unknown (typed gap), never a wrong number |
| Marshall | IV.1/IV.2; P71 | POLICIES.md P115, CLAUDE.md, NEXT-PASSES Pass 31 | upheld — compliant | a policy entry with its Generality line (generality-gate 16/16), enforcement in the same diff (arithmetic.test, shape.test, eoreader7 frontier-25.test), no constitution edit; the deleted first-cut modules are named in the entry |
clean: nothing struck; the standing P19/S17 duplicates remain the activation-rule carry (renumber in their own commit).

## 2026-09-05 — P116: the in-tab roster wired, the launch pass, the phone layout (branch `frontier-25`, second batch)

Constitution: `../eo-constitution/CONSTITUTION.md` + POLICIES.md/CLAUDE.md. Tier 1 (`chorus-fast.sh --working`): law ok; routed Dijkstra · Marshall · Simon/Chekhov; suites the-fold full + rung 41/41 + constitution.

| lens | citation | file:line | verdict | one line |
|---|---|---|---|---|
| Dijkstra | II.13 (no non-local host the page can reach) | webllm-rung.js roster | fixed | the first cut carried model-card URLs (huggingface.co) in a page-loaded module; the rung's own test caught it; the cards moved to P116 |
| Simon | P10 / the mirror gate | models/fetch-webllm.sh | fixed | OLMo 2 ships only tensor-cache.json and names vocab.json/merges.txt; the script reads the manifest that exists and every tokenizer file the config names — the rung test's shard walk refused the half mirror |
| Chekhov | III.5 (prose may not claim wiring) | app.js fillModels/connect/completeOnce; explore-server.mjs serveStatic | fixed | the WebLLM rung had shipped unwired since P21; the Explore page's shims had no server alias — both measured in a browser |
| Feynman | P41 (a check that did not run never reports a pass) | webllm-rung.test.mjs mirror walks | upheld | absence skips TYPED, presence with drift fails |
| Alexander | SYN — the cascade | index.html / explore.css phone blocks | fixed | a phone block placed above the base rules lost at equal specificity; kept LAST on purpose, said so in the sheet |
| Marshall | IV.1/IV.2; P71 | POLICIES P116, README, CLAUDE.md, MVP-LAUNCH-CHECKLIST.md | upheld — compliant | Generality line present; enforcement in the same diff; the checklist's decisions (web toggle default, LICENSE) are proposed, not disposed |
clean: nothing struck.

## 2026-09-05 — P117: public gateways as the learned fall-through (branch `frontier-25`, third batch)

Constitution: `../eo-constitution/CONSTITUTION.md` + POLICIES.md/CLAUDE.md. Tier 1: law ok; routed Diaconis · Dijkstra · Ostrom · Marshall; suites the-fold full, native web-gateways 5/5, constitution + seam + contract 20/20.

| lens | citation | file:line | verdict | one line |
|---|---|---|---|---|
| Diaconis | II.23; P4 (no hand-set threshold) | web.js rankGateways | upheld | natural frequency, untried-before-failed, no cut-off; the roster is never pruned; "open" is only ever the last try |
| Dijkstra | II.13; III.3 | web.js GATEWAYS (six hosts in a page-loaded module) | clean | covered by the standing web.js allowance (address builders, zero egress calls) — constitution.test.mjs 12/12 |
| Ostrom | II.9 (property of the instrument vs the material) | P117 "Measured" | fixed (wording) | the leak probe decided nothing because no relay was open; the table says "not measurable while closed", never "safe" |
| Feynman | P41 | explore-server.mjs fetchThroughGateways | clean | a Wayback snapshot over the byte cap is a typed refusal on the record (bloomberg.com), not a silent skip |
| Marshall | IV.1/IV.2; P71 | POLICIES P117, README, checklist, CLAUDE.md | upheld — compliant | Generality line present; enforcement (web-gateways.test.js, constitution scan) in the same diff; the maintainer's-proxy question is recorded as a decision with its reasons |
clean: nothing struck.
