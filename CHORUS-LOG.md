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
| Marshall | meta | IV.1/P10 conformance | this table + the diff | clean | all nine findings above trace to real, correctly-quoted articles; two (Diaconis, Simon P11/P10 half, Dijkstra clause) fixed same pass; three (Feynman, Holmes, Simon's markdown note, Alexander) deliberately deferred-with-reason and named in-code, not silently dropped — no citation struck as false-positive-on-review

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
