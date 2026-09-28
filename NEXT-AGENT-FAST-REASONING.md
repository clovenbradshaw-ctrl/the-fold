# Prompt for the next agent: fast, low-model reasoning with what this session built

Branch on all three repos: `claude/holographical-reasoning-engine-2e1nn0`
(eoreader7 PR #136, the-fold PR #187, live_priors PR #31). Read this file
first, then `the-fold/CLAUDE.md`'s standing rules (search for the organ before
writing one; every number declared or given; a control built to fail before a
number is reported; a model is the mouth, never the judge of its own words;
P186 — the mouth is not censored; append-only records; nothing pushed to a
different branch). Attribution lines for commits are in your system reminder.

## Status, 2026-09-28 (the session that wrote this ran it)

Run in this container with `onnx-community/Qwen2.5-0.5B-Instruct` in-process
(no Ollama). E1, E2 and E4 are DONE across six registered runs —
`eoreader7/native/eval/identity/results/fast-reasoning-v1…v6-RESULTS.md`
— with every prediction holding on v6 (0.21 correct per model call on first
sight, 0.25 with habits, 0.08 for the judge alone, zero fabrications
throughout). Two organ changes came out of it, both in the-fold `judge.js`:
the point-then-word protocol and the habit rung's counter-decider wall.
Still open for you: E3 (needs the witness rung, i.e. Ollama), E5, E6, and
the three levers named at the end of v6's results.

## The ask

Take the identity and ingestion machinery built on 2026-09-28 and run it AS A
REASONER: answer questions about a real book with as few model calls as
possible, measure exactly where a model call is still needed, and make the
next instance of each such case cheaper — by a habit, a prior, or a mechanical
rung — without ever letting a model decide a verdict. The score you are
chasing is not accuracy alone: it is **correct answers per model call**, with
the cost of every call on the record, and zero fabrications.

There is no Ollama in the cloud container this session ran in. Everything
below was proven against real kernels with scripted judges, never a live
model. Your first job is to run it live (a machine with `ollama` and
`gemma2:2b` / `OLMo-2-1B` pulled, or the WebLLM rung in the browser) and find
out what the scripts could not.

## What exists, by rung (cheapest first)

1. **Mechanical, no model.** `eoreader7/native/adapters/text/occupancy-testimony.js`
   — `readOccupancyTestimony` (who held which position, with typed refusals:
   `inverted_subject`, `irrealis`, `locus_not_nominal`, `pronoun_unbound`…),
   `namedOccupants` (a being SIGNED into a title by naming, never predicated —
   Cyril's row), `positionsByPattern`, `nestedOccupants`. Every standing lands
   as an act on the cube (NUL·Ground for a state — "a state is the transition of
   non-transition"). `kernel/merge-standing.js` turns a two-occupant locus into
   an undecided slot collapsed per for-whom (`NESTED_NAMES`, `CAST_DISTINCTNESS`).
   `adapters/text/name-spans.js` — names as trees; nesting in five levels; a
   patronymic read by POSITION or by an ESTABLISHED father's given name, never by
   its ending (the endings are a candidate class from
   `live_priors/derived-priors/name-priors/`, composed per language with
   `namePartsFrom(en, mul, ru)`; hand the cast's own first names in as
   `givenNames`). `adapters/text/grammar.js` — the register a language's organs
   come online from, by holon level (name < phrase < clause < sentence < …).
2. **Ingestion standing, no model.** `kernel/ingestion.js` — per holon:
   `unread` / `partial` / `read`, read off every reader's own reach and typed
   gaps; `unreadCited` names the claims resting on something not fully read;
   `judgmentRequest` builds the ask (the ENCLOSING section, the for-whom, the
   findings). the-fold `answer-record.js::ingestionOf` runs it every grounded
   turn, folding the arrival read AND the constitutional reader's positional
   reach (`readers`), and walks the ladder per claim.
3. **The ladder learns (Wilson).** `kernel/escalation.js` over
   `kernel/stigmergy.js` — rungs `mechanical, habit, witness, judge`; the ORDER
   tried is learned from deposits per shape (`shapeOf(standing)`), a
   contradiction outweighs three successes (`VETO_WEIGHT`). Persisted in the
   page as `fold-escalation-trails`.
4. **Habit, no model.** `kernel/habit.js` — a chosen, anchored judgment is
   learned under the claim's folded key with the DECIDER the judge pointed at;
   the next same-key claim is answered when `becauseContained` finds the
   decider in the section at hand; conceded by REC (trigger quoted) the moment
   the relation tier reads the claim `contradicted` or the witness refuses the
   sentence. Persisted as `fold-judge-habits`.
5. **Witness (one small model, select protocol).** The existing sentence
   witness (`organs/witness-sentences.js`, `testimony.js`), armed with a sibling
   swap; the model POINTS, never writes a verdict.
6. **Judge (one small model, prose).** the-fold `judge.js` — the full section
   around the cited passage plus the question, through **Gary's door**
   (`gary.js::makeGary().hand`: addresses struck, no apparatus noun, no JSON
   asked in prose, information not prohibition, question LAST, window checked).
   The prose is read mechanically by `organs/judgment-reader.js`
   (`readJudgment`: the one candidate committed to outside quotes and negation;
   the decider anchored in the section or the verdict is CONTESTED, never
   trusted). Budget `JUDGE_ASKS_PER_TURN = 2`, section width
   `JUDGE_SECTION_CHARS = 2400`, both declared.

Drivers and records: `eoreader7/native/eval/identity/occupancy-host-eval.mjs`
(V2–V16 pre-registered, results in `results/*-RESULTS.md`; raw JSON is
gitignored and regenerates), `eval/identity/ingestion-demo.mjs` (War and Peace:
34,255 sentences typed unread/partial/read), `docs/THE-UNDECIDED.md` (the
census of where the reader used to decide too early).

## The experiment program (each item: pre-register, run once, record, commit)

**E1 — the baseline you must beat.** Twenty factual questions about *War and
Peace* (Gutenberg 2600) and twenty about a second book of another genre
(Dracula, 345), answered by the live turn with the ladder OFF (every claim
straight to the model) versus ON. Record per question: model calls, seconds,
verdict correctness against a hand-written key fixed BEFORE the run, and
fabrications (a name or figure in the answer the material never states).
Controls: the same questions against a shuffled-sentence copy of each book
(the ladder must not answer better than chance there).

**E2 — the habit curve.** Ask the same forty questions in three passes.
Prediction to register: pass 2 spends fewer judge calls than pass 1 because
habits answer; pass 3 fewer still. Then INJECT contradiction: edit five
passages so the habit's decider is gone or reversed, ask again, and show the
habit is conceded (REC on the ledger, trigger quoted) rather than answering
wrong. A habit that survives its own contradiction is a failed run.

**E3 — where the witness and the judge disagree.** For every claim both were
asked, record both verdicts. Disagreement rate, and which the material sides
with (read the section yourself). Register before running: the judge, handed
the whole section, corrects the witness more often than the reverse.

**E4 — Gary's rules, measured.** Run the judge prompt three ways on the same
100 asks: as shipped; with the question FIRST; with a prohibition added ("do
not guess"). Register: the shipped order yields the highest anchored-chosen
rate and the fewest contested (assertions past the bytes). If a rule loses,
say so in `gary.js`'s header — his rules are measured, not believed.

**E5 — the ingestion frontier.** With the native constitutional reader capped
(`NATIVE_MAX_CHARS`), plot answer correctness against the cited holon's
standing (`read` / `partial` / `unread`). Register: `read` beats `partial`
beats `unread`; and a judge over the section closes most of the `partial`
gap at one call each.

**E6 — reading priors, not organs.** Any rule you are tempted to type into an
organ (a title list, a verb, a suffix) goes into `live_priors/derived-priors/`
as a file with a giver, and the organ reads it. Test the patronymic reading
on a third language's names by adding ONE file, changing no organ.

## Walls you may not cross

- A model never decides a verdict: it points (select) or it writes prose that
  a mechanical reader reads. If you need a new verdict kind, extend
  `judgment-reader.js`, not the prompt.
- Every judgment that answers without a model must be anchored: the decider
  is in the bytes at hand, or it is `contested`.
- Absence of material is never a conviction; a reader's gap is typed, never
  silent; a habit's decider absent from the section is "not applicable".
- Numbers are declared or given; a threshold that makes a specimen pass is
  refused. Register predictions before the run; a failed prediction is
  recorded as failed with the reading, then fixed under a new registration.
- Commit each run's `*-RESULTS.md`; never commit the raw run JSON (ignored).
- Nothing edits the model's own answer (P186). Findings are marked and
  recorded; the mouth's sentence ships as it was said.

## What to hand back

A results document per experiment, the three PRs updated (draft), and one
paragraph in `the-fold/CLAUDE.md` (a pointer, like every other section) saying
what the ladder now costs per correct answer, what still needs a model, and
which of those a habit or a prior could take next.
