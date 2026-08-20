**Update, later the same day:** the "one missing piece" and "unbuilt wiring
sketch" sections below were superseded by a broader, actually-built and
tested fix — not the narrow `succession-answer.js` module sketched here.
`grid.js`'s existing `evaluate` (EVA) verb now COMPUTES its verdict from
`hypergraph.js`'s real `read(claim)` for any text-shaped ground, with real
provenance attached, and a disagreeing re-check concedes the prior verdict
via a new `grid.concedeEvaluation` (REC) rather than silently overwriting
it — general, not succession-box-specific, live on both `term.js`'s `act`
command and app.js's `/act` chat door already. See `POLICIES.md` P36 and
CLAUDE.md's "EVA computes, REC concedes" section for the full account,
including what's still honestly undetermined (non-text material; the
disclosed "squaring polarity" gap found live). The coverage measurement and
specimen evidence below are otherwise unchanged and still accurate.

**Second update (2026-08-20): the narrow `succession-answer.js` sketch was
attempted, and correctly declined — two independent reasons, not one.**
A session tried building the sketch below (ordinal-lookup and neighbor-
lookup only, deliberately avoiding `resolveBoxSubjects`). It found the
attribution problem stated below is worse than it first reads: a box
never names its own subject at all (this file's own "single most
important finding" section already says so), so `b.lines.some(name
match)` — the obvious-looking safe check — essentially never fires for a
box's TRUE subject and instead risks matching on a PRECEDING or
SUCCEEDING name mentioned in the same box's own fields, which is the
identical misattribution class `resolveBoxSubjects` is already known
wrong for. That alone was reason enough to decline.

A second, independent reason surfaced checking the real cached Andrew
Johnson page directly (`web/pages/97e99f6ca33adad4.txt:24`): his 16th-VP
box's own `succeededBy` field reads "Schuyler Colfax" — textually
faithful to the source, and *still wrong to render as an answer*.
Johnson served as VP for six weeks (March 4 – April 15, 1865) before
Lincoln's assassination made him President; the vice presidency then sat
vacant for nearly four years (no 25th Amendment yet), and Colfax only
became VP in 1869 under Grant. Wikipedia's succession-box convention
names the next OFFICEHOLDER, skipping vacancies silently — so
`precededBy`/`succeededBy` conflate "next to hold this office" with
"immediately succeeded," and no fix to box-attribution would touch that.
A neighbor-lookup answer template ("X succeeded PERSON as OFFICE —
computed, not generated") would have been sourced from real material and
still have shipped a false claim. Both reasons are structural, not
tuning issues — the same standing this file already gives the
`resolveBoxSubjects` bug itself. `succession-answer.js` was deleted
rather than shipped; this paragraph is why, so it is not re-derived.

# Mechanical coverage investigation (2026-08-19)

Answers two connected questions as one design, per direct user framing:
(A) for what class of questions can this repo's hypergraph play the same role
`arithmetic.js` already does — compute the answer, never generate it, skip
the correction loop entirely; (B) what would it mean to make verification
itself explicit holonic tasks, mirroring how answer-generation is already
decomposed into a tracked plan/parts log, rather than one opaque
priority-ternary loop — and does a mechanically-computed answer collapse
verification to something trivial while a generated one still needs the
full task list.

Six real specimen questions were run against real cached Wikipedia material
by actually executing the organs' code (not by reading their source and
guessing) — full captured evidence for each is in this investigation's raw
output, referenced inline below. Everything under "Verification side" is
grounded the same way: real line numbers in `holon.js`/`verification.js`,
confirmed by grep, not assumed from documentation.

---

# Coverage: what the-fold's hypergraph already does mechanically, measured

Six real questions were run against real cached material. Classified by what actually happened when the code was executed — not by what the organs are documented to do — the split is:

| # | Question | Classification | What actually ran |
|---|---|---|---|
| 1 | Who was Lincoln's vice president? | `mechanical_after_missing_parser` | `succession.js` parses real boxes but misattributes Johnson's own VP box to "Abraham Lincoln"; the correct chain-rule fix exists in the code and was verified live in isolation, but is unreached |
| 2 | What number president/VP was Andrew Johnson? | `fully_mechanical_today` | `parseSuccessionBoxes` returns two clean, distinct `{ordinal, office}` records with zero model call — but nothing in the app reads `box.ordinal` for this purpose |
| 3 | Who succeeded Hannibal Hamlin as VP? | `mechanical_after_missing_parser` | `succession.js` computes the exact right answer (`succeededBy: "Andrew Johnson"`), unique among 1,901 parsed boxes — but there is no question-router that would ever call it this way |
| 4 | Who were FDR's vice presidents? | `mechanical_after_missing_parser` | `officeHolderGroups` returns `[]` on the real, full page — the VP list on FDR's own page is a flat bulleted sublist, not succession-box shape, so the existing parser has nothing to key on |
| 5 | Why did Lincoln choose Johnson as his running mate? | `needs_generation` | `hypergraph.js` swallows the causal clause whole into one opaque edge; five differently-attributed, hedged factors in the source require synthesis no organ performs |
| 6 | What did Johnson do as military governor of Tennessee? | `checked_generation` | Real bound/unbound/competing verdicts on name-subject sentences; pronoun-subject sentences (loyalty oaths, newspaper shutdown, troop recruitment) produce zero edges at all — a real, previously-undocumented gap |

One of six (17%) is fully mechanical today, with the computation already sitting in shipped code, unused for this purpose. Three more of six (50%) are mechanical in the narrower sense that the right answer is a real, verified field-read away — the computation exists and was proven correct against the real material, but the routing step that would call it this way (an NL-question-to-structured-slot-query parser, or a fix to `resolveBoxSubjects`'s attribution precedence, or fetching a VP's own page) does not exist. One of six (17%) is genuinely `needs_generation` — multi-source synthesis with no mechanical analogue anywhere in the surveyed organs. One of six (17%) is `checked_generation` — free drafting where hypergraph.js's bound/unbound/competing machinery does real, verified work as a post-hoc check, but cannot draft or complete the answer on its own.

So: 4/6 (67%) are candidates for a mechanical-answer path *once the one missing piece is built*; 1/6 already works with zero further engineering, just needs to be wired to a question rather than a completeness nag; 2/6 stay generation-dependent regardless. This is a narrow, real slice — succession-box slot-fill questions specifically — not a general claim about "questions the hypergraph can answer."

# The single most important finding

`succession.js`'s own real, already-parsed output could have prevented the exact error this investigation exists to check for, and today's wiring never uses it that way.

Run against the real cached Andrew Johnson page (`web/pages/97e99f6ca33adad4.txt`), `parseSuccessionBoxes` produces two clean, fully-populated, field-distinct records:

```
{ ordinal: 17, office: "President", precededBy: "Abraham Lincoln", succeededBy: "Ulysses S. Grant" }
{ ordinal: 16, office: "Vice President", presidentName: "Abraham Lincoln", precededBy: "Hannibal Hamlin", succeededBy: "Schuyler Colfax" }
```

This is not a hard extraction — Johnson's own article puts his own two offices as the first two title-matched boxes in the page text, no cross-page identity inference needed. `16` only ever sits inside a record whose `office` field is the literal string `"Vice President"`; `17` only ever sits inside a record whose `office` field is `"President"`. There is no shared field, no shared sentence, no place a model's restatement could glue the wrong number onto the wrong office — because in this path there is no model step at all.

But grepping `holon.js` (the only real caller of `succession.js` anywhere in the repo) shows `box.ordinal` is parsed onto every box object and then never read again by anything. The sole consumer, `successionIncompleteFindings` (holon.js:1257–1290), uses `parseSuccessionBoxes`/`resolveBoxSubjects`/`officeHolderGroups` exclusively to answer a different, narrower question: "did the drafted prose name every distinct confirmed holder of office X under president Y." It checks *holder completeness*, never *ordinal correctness*. The "17th Vice President" conflation this session exists to regression-test against is a model-drafting error — a sentence that merges two true numbers onto the wrong noun — and today's live app has no mechanism, mechanical or otherwise, positioned to catch that specific error, despite the exact structured fact pair (`16`/"Vice President", `17`/"President") sitting unused in `succession.js`'s own shipped output the entire time.

# What's real today vs. a real but disclosed gap

The organs' raw capability, called directly against real material, is genuinely stronger than the live app's actual use of it in every case surveyed:

**`succession.js`.** Called directly on a subject's own page for a self-page office lookup, its output is exact (Johnson ordinal specimen; Hamlin succession specimen). Called for cross-page/group aggregation (`resolveBoxSubjects` + `officeHolderGroups`), it is currently wrong on real material: it resolved Johnson's own VP box's subject to "Abraham Lincoln" because a single, uncorroborated pronoun-subject anchor sentence (`"The 16th vice president, he assumed the presidency..."`) unconditionally overrides a doubly-corroborated `precededBy`/`succeededBy` chain, even when both exist and disagree — verified live, and verified live *not fixed* by combining both real pages into one call. In today's app, `succession.js` is wired into `holon.js`'s correction loop through exactly one call site, `successionIncompleteFindings`, which runs after a model has already drafted an answer and only ever nags about missing names — `box.ordinal` has zero downstream readers anywhere in the repo.

**`hypergraph.js`.** Called directly on ordinary prose with a capitalized-name subject, it produces real, checkable bound/unbound/contradicted/competing verdicts (verified: a reversed-actor claim about Johnson's confiscated land was correctly caught and corrected via `competing`). Called on infobox/succession-box text, the sentence splitter never breaks on bare newlines, so "Preceded by X" / "Succeeded by Y" lines glue into garbage edges — zero clean triples, confirmed live against the exact Hamlin/Johnson material. Called on pronoun-subject prose (`"He demanded loyalty oaths..."`), it extracts zero triples at all, because candidate-verb nomination anchors only on capitalized surfaces — a previously-undocumented gap this investigation's military-governor specimen surfaced directly, distinct from the infobox failure. `bound` requires exact triple-shape convergence, not semantic entailment, so true paraphrases never bind.

**`cast.js`.** Its identity resolution is real and mechanical, but can both wrongly merge (two different "John Smith"/"John Doe" people collapsed into one referent via a hub-merge on the bare token "John," verified live) and wrongly fail to merge (sentence-initial capitalization stripping split one character's "Natasha"/"Rostova" mentions into two separate referents, verified live) — both are structural, not tuning issues.

**Question parsing.** None of the four candidate organs surveyed for this (`widget.js`, `grid.js`, `measure.js`, `resurf.js`) parse a natural-language question into a structured slot query. `widget.js` and `grid.js` correctly refuse a bare question at parse time by construction. `resurf.js` (present only on a different branch) comes closest but only reduces a question to an unstructured, order-agnostic bag of surface tokens — `"who was Lincoln's vice president"` becomes `["lincoln","vice","president"]`, with "vice" and "president" as two unrelated tokens rather than one office. This gap is exactly what stands between the real, correct computations `succession.js` can already perform and a chat question ever reaching them.

# The one missing piece — and the unbuilt wiring sketch

The missing piece is not a smarter organ; it is a router, in the exact shape `arithmetic.js` already proves out for numeric questions: detect (typed, refusal-first) → compute (organ call, injected material) → render (templated, "computed not generated") → typed refusal (never a silent fall-through, never a guess).

**This is a sketch, not a built module.** `succession-answer.js` does not exist in the repo. The design below is proposed, grounded in the six real specimens, and deliberately narrow:

- **`detectSuccession(question)`** matches only two closed shapes: ordinal-lookup (`"what number <office> was <PERSON>"`) and neighbor-lookup (`"who succeeded/preceded <PERSON> as <office>"`), office closed to `{president, vice president}`. Anything else returns `null` and falls through untouched — the same non-claim discipline `detectArithmetic` uses for a question it doesn't recognize.
- **`computeSuccession(parsed, material)`** calls the real, unmodified `parseSuccessionBoxes(material)` and filters boxes by exact office-string match — deliberately *not* calling `resolveBoxSubjects`, because that function's subject-attribution logic was independently measured wrong on this exact material shape (the Johnson-VP-box-resolves-to-Lincoln bug). `hypergraph.js` is also deliberately not consulted, since it structurally cannot parse this material shape either. Ambiguity (multiple disagreeing boxes) and absence (zero matching boxes, e.g. FDR's page) both produce a typed gap rather than a guess — the direct structural sibling of `normalizeArithmeticPhrase`'s refusal on order-reversing phrasing.
- **`render(result)`** templates a plain sentence off the box's own fields, captioned "computed, not generated" — the exact phrase reused verbatim from `arithmetic.js`/`tables.js`, not a new one invented for this module.

The honest limit of the sketch: it explicitly declines the harder, group-query shape ("who was PERSON's OFFICE," cardinality across holders) that the Lincoln-VP and FDR-VP specimens both attempted and both failed on — one via a real attribution bug, one via real material-coverage absence. Building a general slot-parser on top of today's buggy `resolveBoxSubjects` would only generalize the wrong answer. That is a second, separate, larger piece of work, named here as unclosed rather than folded into this sketch's scope.

# The verification side, today

Answer *generation* in `holon.js` is already explicit, tracked tasks. `PLAN_ENTRY_KINDS`/`createPlanLog`/`appendPlan`/`foldPlan`/`producePlan` (holon.js) is a real, deliberately lighter, in-file reimplementation of the same append-only, typed, five-kind vocabulary (`PROPOSE, SUPERSEDE, EVIDENCE, RESULT, RETRACT`) the real engine's `task-log.js` (eoreader6.1) implements with full operator/grain typing — confirmed by grep: `holon.js` credits the real module in comments but never imports it.

Answer *checking* has no such structure. `holon.js`'s correction loop computes `verdictOf(t,c)` and `modeOf(v,c)` fresh every iteration (lines ~1230–1470): plain local closures reassigned on each pass, never appended anywhere. The only signal that escapes a round is `onProgress?.('correct', part, {failures, mode, promptChars})` — a live-UI callback, not a stored record. `modeOf` is a hardcoded priority ternary (lines ~1398–1409) picking exactly one of five possible failure modes per round (`reproduction`/`echo`/`narrated`/`incomplete`/`unsupported`), with `MAX_CORRECTIONS = 1` per mode structurally bounding the whole loop to five rounds. There is no way to ask "was dimension X ever checked this round" — a dimension that loses the ternary, or has no branch at all, leaves nothing on any record: not a false, not a typed gap, nothing.

`verification.js`'s nine-cell taxonomy (`VERIFICATION_GRID`, `verificationTasksFor`, `verificationSummary`) is real and structured — each cell already self-describes its `domain`/`grain`/`terrain`/`giver`/`dependsOn` (verification.js:160–171) — but it is wired only as a post-hoc display panel. `app.js:3113–3127` builds it from `result.sections` *after* `runHolonicTask` has already returned; `app.js:5932–5958` renders it only into the "thinking" JSON disclosure panel. `holon.js` never imports `verification.js` at all (confirmed by grep). Nothing about `verificationTasksFor`'s output ever reaches `modeOf`, the while-loop's own condition, or `correctionFailures`.

This asymmetry is the concrete mechanism behind the user's own observed failure: a fix aimed at one named problem (holder incompleteness) can freely ship alongside a completely different, unwatched failure (the wrong ordinal) on the very same draft, because nothing was ever explicitly tasked with checking for it, and nothing that *was* checked leaves a trace a later dimension could be compared against.

# The explicit-holonic-verification-task design

**What to build on, and what to leave alone.** Reuse `holon.js`'s own `PLAN_ENTRY_KINDS`/`createPlanLog`/`appendPlan` vocabulary for the verification-task log's *mechanism*, and reuse `verification.js`'s `VERIFICATION_GRID`/`verificationTasksFor` as the source of each entry's typed *payload* — its `{domain, grain, terrain, giver, dependsOn}` classification is already correct and would only be duplicated by inventing a parallel typing scheme. Do not reach for the real engine `task-log.js`'s operator/grain enforcement (`OPERATOR_BASIS`, `checkCubeProgression`) as the log mechanism: that machinery polices a *composed sequence* of interdependent acts across a supersession thread, which is not the shape of a verification round — a verification round re-runs the same fixed battery against a fresh draft each time, and each cell's own presupposition-gating is already enforced by `verificationTasksFor`'s existing logic. Importing `checkCubeProgression` here would mean synthesizing a fake `operator_basis` for a lookup-and-compare, the same "un-earned decoration" `holon.js`'s own header already declines for answer-generation parts, one level up.

**Per-dimension shape.** Each dimension gets a `propose` → `evidence`/`result` entry set, `part_id` + `dimension` scoped, carrying the organ's own already-computed fields as payload (free under `appendPlan`'s documented rule that unrecognized keys are payload and are carried through the fold):

| Dimension | Built today? | Organ that computes it |
|---|---|---|
| reproduction | yes | `holon.js`'s own verbatim-overlap majority test (verdictOf) |
| echo | yes | `holon.js`'s own greeting/prompt-restatement detector |
| narration | yes | `stripScaffoldNarration` mass-majority test |
| completeness | yes | `hypergraph.js` clusterFillers-coverage + `succession.js` officeHolderGroups |
| ordinal_accuracy | **no** — new | draft-ordinal-extractor (new, small) cross-checked against `succession.js`'s existing `{ordinal, office}` records |
| redundancy | **no** — new | pairwise sentence-overlap over the draft's *own* sentences, no model call |
| presupposition_framing | **no** — new | `claim.fillers.length` (already computed) vs. the draft's own determiner class (definite-singular vs. plural), using priors.js's existing closed-class register |

The first four cost nothing new — they are the identical signals `verdictOf`/`incompleteClaimsOf` already compute, currently thrown away every loop iteration; this design just captures them instead of discarding them. `ordinal_accuracy` directly closes the Andrew Johnson gap named in section 2. `redundancy` directly targets the user's own opening failure class — a correction round that fixes incompleteness by appending a sentence that restates something already said. `presupposition_framing` is distinct from completeness: completeness asks whether all names are present anywhere in the draft; this asks whether the draft's own sentence grammar claims singularity ("the vice president was X") it hasn't earned — a draft naming both Hamlin and Johnson in two separate singular sentences would still pass completeness while failing this.

**How a new check gets added.** Today, adding a check means editing `verdictOf`'s object literal and inserting a new branch into `modeOf`'s hardcoded ternary at exactly the right position — get the ordering wrong and it silently never fires. Under this design, adding a dimension is one row in an ordered `DIMENSIONS` table (`{dimension, checkedBy, run}`), replacing the ternary with a loop over the table; "is there a task assigned to check dimension X" becomes a literal, answerable query — `log.entries.some(e => e.kind === "propose" && e.dimension === "ordinal_accuracy")` — a question that is unanswerable even in principle today.

**What's genuinely new versus what `verification.js` already renders.** For the four already-real dimensions, the underlying signal is not new — it's the same thing `verdictOf`/`incompleteClaimsOf`/`verificationTasksFor` compute today, currently thrown away or shown only post-hoc. What is new: per-round granularity during the loop itself (verification.js's single post-hoc pass never sees discarded intermediate drafts); the log *driving* mode selection rather than only describing what already shipped, so a failing-but-unbudgeted dimension becomes a typed, visible gap instead of vanishing (precisely the Johnson-ordinal situation); and absence becoming queryable — `verification.js`'s nine cells are always fully enumerated (five real, four permanently `not_yet_executable`), so it has no "unasked" state at all, while a task-log-shaped design does.

**`grid.js` — reuse or near-miss?** Near-miss on the machinery, real reuse on the pattern. `grid.js`'s `evaluate` verb requires a declared `ground <source> broken:<perturbation>` licensing clause with no verification-task analogue, and its verdict is explicitly *caller-declared*, never computed — the opposite of what every dimension here needs (a computed verdict from a real organ). Its DEF/EVA companion-matching (exact lowercase string equality, disclosed by its own comments as "a stand-in for a real referent index") solves an ambiguity problem verification tasks don't have, since `part_id` + `dimension` already link a propose to its result unambiguously. What transfers is the *shape*: propose-then-evaluate-then-read-the-verdict-off-the-fold, and specifically `attachResult`'s non-retyping discipline — a result attaches to a task that already exists and never re-declares the propose entry's own fields.

**Cost.** Structurally bounded: five rounds max per part (unchanged from today), each round running the full dimension table once. Worst case, 7 dimensions × ~2 entries (evidence folded onto result, per `appendPlan`'s own rule) × 5 rounds ≈ 70 entries per part — plain JS objects, zero additional model calls, never touching correction-prompt token budgets. Against that: the entire cost of a missed check today is a wrong fact shipping silently, which is exactly what happened in the specimen this investigation was built to catch.

# Where the two halves become one design

This is not two separate deliverables reported together — running the same fixed dimension list, without special-casing which path produced the draft, is exactly what makes the mechanical/generation distinction cheap and visible.

For specimen 2 (Andrew Johnson's ordinal), a mechanically-computed answer templated straight off `succession.js`'s own `{ordinal, office}` fields has no free-drafted text to reproduce from, echo, or narrate — those three dimensions report *not applicable* rather than running an expensive check on nothing, the same presupposition-gating discipline `verificationTasksFor`'s own Entity-failure-forces-downstream-gap rule already uses. Redundancy is vacuous (one templated fact has no sibling sentence to overlap with). Verification collapses to a single triad: propose `{dimension:"read-back", checkedBy:"same succession.js field the rendered answer came from"}` / result `{verdict:"pass", claimed:{ordinal:17,office:"President"}, source:box}`. The same collapse applies to specimens 3 (Hamlin succession) and, once `succession-answer.js` exists, specimen 1 (Lincoln's VP, corrected) and specimen 4 (FDR's VPs, once each VP's own page is fetched) — wherever the answer comes from a slot-fill read rather than free drafting, completeness and presupposition_framing still do real work only when the mechanical read itself returns a multi-filler slot (fillers > 1); otherwise they too pass trivially.

For specimen 5 (why Johnson was chosen) and specimen 6 (military governor duties), the draft is genuinely free prose, multiple sentences synthesized across several material facts — exactly the shape where reproduction/echo/narration/redundancy/presupposition_framing all have real content to check, and the full multi-round, multi-dimension cost is earned rather than wasted. Specimen 6 in particular shows *why* the full list still matters even where `hypergraph.js` gives real partial help: bound/unbound/competing verdicts on the name-subject sentences are real and load-bearing, but they say nothing about the pronoun-subject sentences (loyalty oaths, newspaper shutdown, troop recruitment) that never produced an edge at all — completeness and redundancy checks on the *draft itself* are the only mechanism that could ever catch an omission or restatement in that remainder.

One design, applied uniformly, is what makes the mechanical/generation boundary self-revealing: it collapses to a near-free read-back confirm exactly where the answer was never freely drafted, and spends its full structural budget exactly where free generation actually happened.

# The disclosed boundary — what stays generation-only either way

Specimen 5, "why did Lincoln choose Johnson as his running mate," is the clean negative case, and it is worth stating plainly rather than smoothing over. The source material itself distributes at least five factors (national-unity messaging, ticket-balancing symbolism, Lincoln's personal impression of Johnson's Tennessee governorship, Seward's factional New York maneuvering, Johnson's own lobbying) across differently-hedged, differently-attributed sentences ("Gordon-Reed points out that...," "historian Albert Castel...," "Trefousse believes... Sickles denied") without ranking or reconciling them. Run live, `extractRelations` swallows the material's own self-contained causal sentence whole into one opaque `"was"` edge's object string — the causal clause is present in the material and even present in the edge graph as text, but not queryable as a cause, because "because" has no relation-type representation anywhere in `hypergraph.js`. `queryEdges({subject:"Lincoln"})` returns three disconnected facts with no reason-for-preferring-Johnson-specifically among them. Reported-speech and appositive syntax extracted as garbage (`"According —to(+)→ historian Albert Castel..."`). No organ surveyed — `hypergraph.js`, `testimony.js`, `verification.js` — has any mechanism for causal-connective typing, cross-source confidence weighing, importance-ranking across overlapping factors, or reconciling a lead-paragraph summary against its own more detailed body. This is not a missing parser the way the succession-box gap is; it is genuinely an interpretive-synthesis task a model has to write.

Specimen 6 sits between: real, checkable partial help from `hypergraph.js` on the sentences it can reach, real and previously-undocumented blindness (pronoun subjects) on sentences it can't, and no mechanism anywhere that would notice the blindness itself without the draft-side redundancy/completeness checks proposed above.

The honest summary: the mechanical win measured here is real but narrow — succession-box slot-fill questions, one of six specimens fully closed today and three more closed once a small, disclosed router is built, exactly the same discipline by which `succession.js` itself was scoped down twice already in this session (first restricted to self-page boxes, then further restricted to avoid its own buggy cross-page attribution). Everything outside that narrow slot-fill shape — causal explanation, multi-source synthesis, free narrative description — stays generation-dependent, checked where `hypergraph.js`'s bound/unbound/competing machinery reaches (specimen 6) and unchecked-by-any-organ where it doesn't (specimen 5). A small, real, disclosed win is what the evidence supports; an overstated general claim about "the hypergraph replacing generation" is not.
