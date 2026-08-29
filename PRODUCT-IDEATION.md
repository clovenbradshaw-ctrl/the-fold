# Product ideation, run as a void loop

**What this is.** A working protocol for deciding what feature to add to an
app, using the apparatus this project already built for deciding what an
answer is missing. It is assembled under the same discipline as
`CHAT-POLICIES.md` and `THE-27-CELLS.md`: **summarize and point, never
re-derive.** `POLICIES.md` wins on any conflict (P53 for the void loop, P58
and P64–P65 for the move space, P22 for the act grammar); the modules win on
mechanism (`void-shape.js`, `void-loop.js`, `grid.js`, `capacities.js`);
`eval/results/` wins on numbers. Standing document — amendments append.

**The one-sentence version.** Do not start from a feature idea. Start by
zeroing the space the feature would stand in — all nine operators, each one
declared or explicitly left as a typed gap — then run one DEF / EVA / REC loop
against that space, down a stance ladder, and let the answer be **what the
loop leaves standing**. An uncovered stretch of the space is a finding, not a
blank; a feature nobody can say would be wrong is not yet a candidate.

**Honest scope, up front.** `void-shape.js` and `void-loop.js` are real,
tested, running code — for questions asked of *text*. Nothing in this document
is executed by them today: this is their discipline carried onto a human
process, by hand, deliberately. Where a step is mechanized somewhere in this
repo, the module is named so the borrowing is visible. Wiring a product void
as an actual `EOVoidDeclaration@1` and running `openLoop` against it is real,
plausible, unbuilt work — named here, not implied done.

---

## 1. Why not start from the idea

The specimen that produced this whole line of work was not a product question,
and it does not matter that it was not. Asked *"who was Lincoln's vice
president?"*, the instrument answered **"Hannibal Hamlin"** on one draw and
**"Andrew Johnson"** on the next. Each is a true sentence. Neither is the
answer, because the slot holds two fillers and the reading had no way to know
it was still short (`void-shape.js`'s own header).

Every mechanism tried first read completeness off the **answer**. That is the
same failure a roadmap makes: the first plausible feature that anyone can
defend closes a space that was never measured, and it closes it *with a true
sentence*. "Users want faster export" is true. It is not the answer, if the
space it stands in also holds three other things and nobody drew the extent.

So the move is: stop asking the candidate whether it is sufficient, and ask
the **space**. A slot is not a bag of features; it is an extent with
dimensions, and a feature covers part of it. What is left over is not an
absence of evidence — it is a void with a size and edges, and something has to
be in it. That is what makes a second feature *necessary* rather than
hoped-for.

**Greedy search is the failure mode with a name.** `void-loop.js` fans DEF out
over an array and lands every candidate before any admission runs, and its
header states why structurally: *propose-one-test-it-propose-the-next is a
greedy search, and a greedy search over two true fillers returns whichever it
drew first.* In a room, that is the first idea spoken becoming the idea
evaluated.

---

## 2. Step zero — declare the void, all nine operators

Zeroing a space is not one declaration, it is nine. `declareVoid` (`void-shape.js`)
takes exactly these fields; each one is a different question a space must
answer *before anything stands in it*, and **every omission is a typed gap,
never a default**. A space missing one of the nine is not an error — it is a
silent assumption that shows up later as a confident wrong answer.

The cells below are computed by the engine's cube (`cellOf(op, grain)`), not
typed here: **operator × grain is the whole space, 27 cells; stance =
(mode, grain), terrain = (domain, grain), both derived.**

| op | field | cell | stance | the product question | what its absence costs |
|---|---|---|---|---|---|
| **NUL** | `slot` | Void · Ground | **Clearing** | What space is this, marked off from everything it is not? | You are ideating on a topic, not a slot. Every candidate is "related" and none is *in* or *out*. |
| **SIG** | `anchor` | Entity · Figure | **Binding** | What must resolve for this space to exist at all — which user, which surface, which job? | The unresolved anchor collects neighbours. (In the live specimen: undeclared, `lincoln` matched Lincoln Motor Company and the reading answered from car brochures.) |
| **INS** | `admits` | Kind · Pattern | **Composing** | What *kind* of thing may stand here — a feature, a setting, a doc change, a price? | The slot query returns junk that fits grammatically. (Live: "Congress", "the 22nd Amendment", "Though he" as candidate vice presidents.) |
| **SEG** | `extent` | Field · Ground | **Clearing** | The extent to be covered **and its units** — which sessions, which segment, which weeks, which % of the flow? | Nothing can ever be short, so nothing can ever be *enough*. This is the dimension the hole is measured along. |
| **CON** | `relation` | Link · Figure | **Binding** | What binds a filler to the anchor — "reduces time-to-first-X for", "removes the step where", "is the thing they open instead"? | Candidates get admitted for *co-occurring* with the anchor instead of *doing something to* it. |
| **SYN** | `composition` | Network · Pattern | **Composing** | How do fillers compose across the extent — do they partition it, overlap, stack, or exclude each other? | Two features that cannot coexist both get admitted, or two that need each other get shipped apart. |
| **DEF** | `cardinality` | Lens · Figure | **Dissecting** | How many fillers is this space *declared* to hold? | Read off the grammar of the ask ("*the* fix"), a two-filler space closes on one true filler. This is the cell whose absence produced the specimen. |
| **EVA** | `admission` | Lens · Figure | **Binding** | The test a candidate must pass to fill any of it — stated **before** candidates exist. | The test gets written after the favourite, and it fits the favourite. |
| **REC** | `reopensOn` | Paradigm · Pattern | **Composing** | What forces this whole declaration to be revised? | The space can never be wrong, only unfinished — and a space that cannot be wrong is not a space, it is a preference. |

**Read the stance column.** Three Clearings, three Bindings, three Composings
— and **exactly one Dissecting: DEF.** Cardinality is the single *cut* in a
space otherwise made of clearings, bindings and compositions. That is not a
curiosity; it is the cell whose silence produced every confident wrong answer
in the specimen, and in a product room it is the one question nobody asks:
*how many things is this space supposed to hold?*

**DEF and EVA share a terrain (Lens) and differ only in stance.** You cut with
the lens, then you bind with it. That is why they are a **loop** and not two
unrelated reviews.

**Inspect the declaration itself.** `undeclaredOf(declaration)` returns exactly
the operators left as gaps. Run it on your own void before you run anything on
candidates — the recursion is the point, not a flourish. An under-specified
void is the thing that produces confident wrong answers, and it should be as
visible as the missing filler is.

### The worksheet

```
slot        (NUL): ______________________________________________
anchor      (SIG): ______________________________________________
admits      (INS): ______________________________________________
extent      (SEG): _______________________ units: _______________
relation    (CON): ______________________________________________
composition (SYN): ______________________________________________
cardinality (DEF): ______________________________________________
admission   (EVA): ______________________________________________
reopensOn   (REC): ______________________________________________
broken:            ______________________________________________
```

`broken:` is not one of the nine. It is what `openLoop` **refuses without**
(`no_perturbation`), and this repo will not supply a default on a caller's
behalf: *opening a loop costs the caller a statement of what would make the
whole thing wrong — which is the wall that keeps a fan-out-and-score loop from
becoming a spiral that agrees with itself.* In product language: **no kill
criterion, no loop.**

---

## 3. The three refusals that stop a loop, and what they are in a room

`openLoop` refuses on exactly three absences and *discloses* the rest. The
first cut refused any under-specified declaration outright and its own test
caught the cost — a refusal no declaration can usefully pass is a claim about
the refusal, not about the declaration (the third time this repo has caught
that shape). So:

| refusal | means | in the room |
|---|---|---|
| `no_slot` | NUL undeclared | "We're doing something about onboarding." That is a topic. There is no space yet. |
| `no_anchor` | SIG undeclared | Nothing has to resolve, so every candidate is admissible to somebody. |
| `no_closing_condition` | neither an extent nor a numeric cardinality | Nothing could ever license a commit; the loop runs forever. This is the shape of a discovery track with no end. |
| `no_perturbation` | `broken:` missing | No stated way to be wrong. |

Everything else undeclared **rides the loop as `underSpecified`** and is
reported by `foldLoop`. Visible, not fatal — which is what makes the protocol
usable on a Tuesday.

---

## 4. The stance ladder — where candidates come from

The declared stance is the loop's one free variable: **it decides which
generator proposes candidates at all.** Three rungs (`STANCE_LADDER`),
descended only when the one above is exhausted — `skills.js`'s own descent
discipline (skill → slot-fill → model), with stances in place of tiers.

| rung | cell | generates | product reading |
|---|---|---|---|
| **extraction** | Differentiate · Figure | what the material itself already states | Support tickets, session recordings, telemetry, the sales-loss log, the churn survey, the thing three customers said in their own words. |
| **cultivation** | Relate · Figure | what binds to the anchor — a reference library, a fetched page, a witness | Competitor teardown, an adjacent product's solved version, a domain expert, a standard, a paper, an interview run *for this slot*. |
| **encounter** | Generate · Figure | a filler nothing named — supplied, not read | The invented idea. Nobody asked for it; you are proposing it. |

**`encounter` is last, and it is the only rung that can supply a filler the
material never named. That is where fabrication lives, and naming it as a
posture is what makes it visible instead of ambient.** An idea reached at
`encounter` and one reached at `extraction` are both answers, and they are not
the same kind of answer — the record says which without anyone inferring it
from a score. This is the single highest-value thing this protocol does to an
ordinary ideation session: it does not ban invention, it *labels* it, and it
requires the two rungs above to be exhausted first.

**Two stance faces, kept apart — do not harmonize them.** The *derived* stance
(the table in §2) is a property of a cell: computed, never chosen, cannot be
wrong. The *declared* stance (`from <stance>` in the act grammar) is the
actor's posture: declared per act, refusable. Same word, two standings; one of
the two breaks if you merge them.

---

## 5. The loop

### DEF — fan out, do not walk

`proposeFrom(loop, {stance, candidates})` takes an **array** and lands every
candidate before any admission runs. **The set of DEFs with no clearing EVA
yet IS the superposition** — addressable, projectable at a cursor, revisable,
because supersession keeps the past.

Facilitation consequence: everyone writes candidates for the *declared slot* at
the *declared rung*, all of them land, and **no candidate is discussed until
the fan-out is closed.** A candidate lands as a *wish* until an evaluate
clears it (`grid.js`'s own DEF/EVA fold: `wish` → `testimony` / `refused`).

### EVA — bind each to the ground

The admission test was declared at step zero, before any candidate existed.
Each candidate is evaluated against it *individually*, against the same ground.
A candidate stands as a **wish** until an evaluate clears it; after that it
carries one of three standings on the loop:

- **testimony** — cleared admission, with a witness named.
- **refused** — failed the declared test. Also lands `refusedBy: "extensional"`
  when the *extent alone* excluded it — arithmetic, before the test ever ran.
  Cheap, and it loses real information (see `extent_excludes`, below).
- **undetermined** — read, and nothing bound or refuted it. **This is not a
  failure and must not be folded into one.** The constitutional line this repo
  already holds: a checking organ may say "I have nothing to compare this
  against" (withhold) or "I compared it and it failed" (convict) — it may
  never manufacture the second out of the first.

### REC — re-zero, two triggers, two different acts

Not one verb. `grid.js` and `build-log.js` both carry the distinction and it
matters here:

1. **The posture is spent.** The rung generated everything it can and the space
   is still short → **concede** (EVIDENCE · REC, carrying the trigger
   verbatim, *no* `supersedes`) and **descend one rung**. A re-zero concedes a
   ground; it does not compile a new whole out of the old one.
2. **The declaration was wrong.** → **revise … supersedes `<the opening act>`**
   (SUPERSEDE). The act that zeroed the space is superseded, because the space
   was wrong. Reshaping resets the ladder, carries testimony across, and
   returns extensionally-refused candidates to *wish* — their refusal rested on
   the extent just conceded.

`reshapeTriggers(loop)` computes the second kind mechanically. Read them as
product signals:

| trigger | what the loop saw | what it means about your product |
|---|---|---|
| `extent_too_small` | an admitted filler runs past the declared extent | The thing you admitted serves people outside the segment you drew. **The segment is wrong**, not the feature. |
| `extent_excludes` | candidates excluded by the extent alone, **without ever being read**, while the space is still short | *A space that refuses candidates and reports itself unfilled is evidence about the space, not about them.* Your scope is doing the deciding. |
| `covered_but_unplaced` | the space reads complete while holding a filler it could not place | Either it does not belong, or **the extent's own grain is too coarse** — SEG's cell is "the extent to be covered, *and its units*". Found live: a year-grain extent cannot see a hole inside one year, and Johnson held the office six weeks inside 1865. |

### The loop's own law

`grid.js` pins one stance illegality: `synthesize` may not declare `from
relate` — *"you cannot commit a whole from a stance that refuses to commit."*
`void-loop.js` generalizes it and owns the generalization: **the loop may not
close from the posture it proposed from** (`stance_did_not_change`).

> A fan-out from `encounter` closed from `encounter` never tested anything —
> candidates were generated, a commitment was generated, and the EVA between
> them was ceremony.

In a room: **the posture that invented the idea may not be the posture that
certifies it cleared.** If the candidate came from `encounter` (somebody's
proposal), the close has to come from a different stance — an extraction
(the material now states it: a prototype's telemetry, a real usage log) or a
cultivation (a witness bound it). "We all agreed in the workshop" is closing
from the posture that proposed.

---

## 6. A gap the loop can name is a question it can ask

`whatWouldSettle(loop)` turns loop state into the questions that would settle
it — **ordered by what settles fastest**, and the ordering is the lesson:

1. **`place_filler`** — a candidate that cleared admission and cannot be
   placed. One targeted read against a source already identified. *Place the
   thing you already have before you go looking for a new one.* In product:
   before commissioning new discovery, answer "for which sessions, exactly,
   does the thing we already built apply?"
2. **`fill_void`** — a stretch nothing covers. A real question about the world,
   and the one that needs a new candidate. This is where discovery is actually
   warranted.
3. **`settle_undetermined`** — read, and nothing settled it. Weakest and last:
   a source that said nothing is the least promising place to ask again.

`placeFiller(loop, {filler, span, source})` folds an answer back in and
**refuses a span the extent cannot contain** (`span_outside_extent`) rather
than silently widening the extent. Widening an extent is a deliberate act with
its own REC on the record — never a side effect of answering a question. This
wall held live when a small reader answered a placement question with a wrong
span: the wrong read did not corrupt the space and did not produce a confident
answer. **That refusal is worth more than the reader being right, because it
holds for readers wrong in ways nobody anticipated.**

---

## 7. emanon → protogon → holon: the standing of a feature

**The giver, and the borrowing, declared.** *apparatus / emanon / protogon /
holon* are the cast's own individuation verdicts (`host/corpus.js`'s
classifier, reached here through POLICIES.md P40's account of
`castStandings`). That classifier answers a question about **referents in a
text** — whether a recurring surface is a being, a narrating device, or
something not yet individuated — using its own measured tests (e.g. "Continental
Newswire" typed `apparatus` at namingSentenceShare 0.525 over 27 mentions).
This document borrows the **ladder**, not the classifier's tests. The exit
tests below are this document's own and are stated as such.

**These are standings, not calendar phases.** A standing is revisable: P40's
`reviewEntities` re-runs the same gate against a grown reading, and a being
that no longer clears **lapses** — removed, appended to an append-only lapsed
ledger carrying the full gap object, never reduced to a bare tag. A feature
demotes the same way. Belief, not verdict.

### apparatus — the warning class, checked first

A thing that appears everywhere in the conversation and is a **naming device
rather than a being**: "the platform", "the dashboard", "AI", "the pipeline",
"our data layer". It co-occurs with everything by construction, which is
exactly why `host/terrains.js` **withholds** cast-typed apparatus referents
from co-arrival binding, *with the withholding itself a named entry*.

**Test:** does it appear mostly in sentences that name other things? Then it is
how you talk about the work, not the work. Building an apparatus is how a
quarter disappears.
**Action:** name it, withhold it from the candidate set, and record that you
withheld it. Do not silently drop it — the withholding is a finding.

### emanon — a difference felt, not yet named

A recurring complaint, drop-off, or workaround that is real and has no name yet.
There is a slot and an anchor; **nothing stands in the space.**

**Exit test → protogon:** the nine are declared (or their gaps typed and
visible), `broken:` is stated, the loop **opens** without `no_slot` /
`no_anchor` / `no_closing_condition`, and at least one candidate has landed a
DEF at a **named rung**.
**What it may not do yet:** appear on a roadmap. An emanon on a roadmap is a
date attached to a question.

### protogon — a provisional individual

One or more candidates standing. At least one has cleared EVA against the
declared admission test, with a witness. It is a **wish that became testimony**,
and it is still revisable: supersession keeps the past, the rung it was reached
at is on the record, and it can still be conceded.

**Exit test → holon:** three things, all of them, none inferable from the
others:
1. **Coverage is stated.** The extent reads covered, *or* the remaining void is
   named with its size and edges (`voidsOf`). "Complete" and "incomplete with a
   named hole" are both admissible; "we didn't check" is not.
2. **The close is from a different stance than the proposal**
   (`stance_did_not_change` refuses otherwise).
3. **SYN is honoured.** The declared composition actually holds against the rest
   of the app: it partitions, stacks or excludes as declared. A part that
   composes only in the deck is not composed.

**What it looks like in the build:** a prototype behind a flag, a spike, a
concierge version, a doc change — anything whose job is to move a candidate
from *wish* to *testimony* at the cheapest available rung.

### holon — a whole that is also a part

Committed. It stands on its own **and** it is a part of the system: it has an
address other things can call, it appears in whatever your equivalent of
`capacities.js` is (a registry naming the module and the function, so a
reference resolves to a real place and never to a promise), and — the part
teams skip — **a REC path exists.** A commitment you cannot concede is not a
commitment, it is an inheritance.

**Ongoing obligation:** re-run the gate as the reading grows. A holon that no
longer clears **lapses**, with its gap recorded. That is the mechanism by which
a roadmap can shrink honestly.

### The arc, in one line

> **emanon**: something is missing and we cannot name it.
> **protogon**: something is standing there provisionally and we can say who
> witnessed it.
> **holon**: it holds on its own, it composes with the rest, and we know what
> would make us give it up.

---

## 8. Coverage as a source of ideas — an empty cell is a lead, never a verdict

The second, complementary move (P58, P64, P65): stop asking what users want for
a moment and ask **what kinds of act your product can perform at all.** Lay the
product's features onto the 27 cells the way `eval/capability-coverage.mjs`
lays organs onto them, and read the holes.

**Cells classify MOVES, never content.** An edge does not *have* a cell; it was
*admitted under* one. Deriving a cell from a feature's subject matter is the
refuted move (95.7% of cell assignments survived shuffling the words inside
2,527 paragraphs). Ask *what kind of act does this feature let a person
perform*, never *what is it about*.

**Three kinds of hole share one count, and telling them apart is the whole
value:**

| hole | what it is | what to do |
|---|---|---|
| **registry debt** | the capability exists and is unregistered | Connect it. In this repo's own connection pass this was **over half the map** — 9/27 became 19/27 with no new organs written, only ten real, verified rows added. In a product: the thing already ships and nobody can find it. |
| **real incapacity** | the product genuinely cannot perform that kind of act | This is the feature idea. It is the strongest kind, and it is *derived*, not brainstormed. |
| **probe error** | the question asked of the cell was wrong | P44's battery got four probes wrong in a row before one was right. Suspect the probe before the product. |

**The rule that makes the third column earnable:** a cell earns the
*incapacity* reading only by a **falsifiable prediction stated before the check
is run, and confirmed on real material.** Only one cell in this repo's own map
ever earned it that way. Everything else was debt.

**Two axes, not one.** Coverage is *breadth* (what kinds of act). The other
axis is *depth* (P44's MHC battery — how complex an act, scored against a
received scale, with a real ceiling found and named). A product can be broad
and shallow or narrow and deep, and neither shows up on the other's chart.

**And the wall both axes hit, stated so nobody sells past it:** coherence is
strictly weaker than correspondence. A completed 27 would mean every kind of
act is *performable* — never that any is performed *correctly*. Only an
oracle settles that, and only on facts.

---

## 9. Worked example A — this app

**The ask as it arrived:** "readers should be able to see why an answer changed
between two runs."

**Zero the space.**

```
slot        (NUL): the reader's question "why is this answer different from the last one"
anchor      (SIG): one conversation's two adjacent turns over the same question
admits      (INS): a difference the instrument itself already recorded — an act on a log
extent      (SEG): every input that can differ between two turns, by kind
                   units: input kinds (model, material set, retrieval draw, regime, priors)
relation    (CON): "is an input that differed and moved the answer"
composition (SYN): kinds partition the extent; two kinds may both differ in one turn
cardinality (DEF): unknown — DO NOT read it off the question's singular "why"
admission   (EVA): the difference is on an append-only record with an address,
                   and the two turns can be projected at a cursor
reopensOn   (REC): a reader points at a change no declared input kind covers
broken:            shuffle the two turns' recorded acts — if the same explanation
                   is produced, the feature is reading the question, not the record
```

**Rung 1, extraction — what the material already states.** The reflex ledger
(`reflex.js`) already records asked / planned / retrieved / checked /
corrected / recorded / folded / surprise / errored per turn; the build log,
the grid log and `record/explore-record.jsonl` are all append-only with
addresses; `aperture.js` already records the regime and whether the window
narrowed. Candidates land as a fan-out, none discussed yet: *diff the two
turns' ledgers*; *show which sources were live and which were muted*; *show the
retrieval draw*; *show the regime*; *show the model*.

**EVA.** Each against the declared admission test. Several clear as testimony
immediately — they are already on a record with an address. One
(*"show the retrieval draw"*) lands **undetermined**: the draw is not on the
record today. Undetermined is not refused; it is a `settle_undetermined`
question, and it is the *weakest* one.

**Coverage.** `voidsOf` reads **incomplete**: nothing covers the priors kind.
That is the `fill_void` question — the one that warrants new work — and it
comes with its size and edges rather than as a blank.

**Where the standings land.** The ledger-diff is a **protogon**: witnessed,
provisional, behind whatever the cheapest surface is. The whole feature is
**not** a holon yet — SYN is untested (does a per-kind diff compose with the
existing `thinking` disclosure, which was *vastly simplified* on purpose to one
thing, or does it reopen the eight-things-under-one-word problem?). That is a
real gate, and it is exactly the sort a roadmap normally walks straight past.

**Note what the protocol did here:** it did not produce a cleverer idea. It
produced *one uncovered kind* and *one composition risk*, both of which the
original one-line ask concealed.

---

## 10. Worked example B — a different domain, so the domain is visibly incidental

**The ask:** "the clinic's scheduling app should reduce no-shows."

```
slot        (NUL): appointments that are booked and not attended, not cancelled
anchor      (SIG): one patient with one booked appointment at one clinic
admits      (INS): a contact, a change to the booking, or a change to the slot
                   itself — NOT a policy, NOT a staffing change
extent      (SEG): the interval from booking to appointment
                   units: hours before the appointment
relation    (CON): "changes whether this patient arrives"
composition (SYN): contacts stack (a reminder and a confirmation are both
                   possible); slot changes exclude each other
cardinality (DEF): unknown
admission   (EVA): a candidate must name the hours-before window it acts in,
                   and the clinic must already be able to perform it
reopensOn   (REC): a no-show cause that acts outside the booking→appointment
                   interval at all (transport, childcare, fear)
broken:            withhold the intervention from a random arm — if no-shows
                   move the same, the space is not what we think it is
```

**Extraction** yields: reminder SMS at 24h, reminder at 2h, one-tap confirm,
one-tap reschedule, waitlist backfill. Fanned out, none discussed. **EVA**
against the declared test: waitlist backfill **refuses** — it does not change
whether *this* patient arrives, it changes what happens after they do not. A
true and useful thing, refused *by the declared relation*, which is the test
doing its job rather than the room's enthusiasm doing it.

**Then the two triggers fire, and they are the whole example.**

`extent_excludes` — several candidates (transport help, childcare, an
explanation of the procedure) were excluded **by the extent alone, without ever
being read**, while the space is still short. *A space that refuses candidates
and reports itself unfilled is evidence about the space, not about them.* The
booking→appointment interval was the wrong extent.

`covered_but_unplaced` — the 24h reminder reads as "covering" the interval and
nobody can say which hours it acts in. The extent's **grain** is too coarse.

Both are **REC · revise … supersedes**, not concede: the declaration was wrong,
not the posture spent. The space is re-zeroed with a wider extent and finer
units, testimony carries across, and the extensionally-refused candidates
return to *wish* — because their refusal rested on the extent just conceded.

**The point of running it twice, in two domains:** nothing in §2–§6 mentions
reading, text, clinics or schedules. If a step needs the domain's vocabulary to
work, it has learned that domain, not anything general.

---

## 11. The act grammar, if you want the record

The loop's acts are landable on `grid.js`'s append-only log with the
composition law it already enforces (P22):

```
<verb> [<object>] at <terrain> from <stance>
       [ground <g> broken:<p>] [because <t>] [supersedes <id>] [warrant:<giver>]
```

Eight verbs over nine operators (`distinguish` alone carries two — SIG then
INS, "to sign a figure and individuate it are one motion at the surface, two
operators in the algebra"): `void`, `distinguish`, `separate`, `relate`,
`synthesize`, `define`, `evaluate`, `revise`.

The refusals are real and worth borrowing verbatim as room discipline:
`void` / `distinguish` / `evaluate` require a named `ground … broken:<p>`;
`relate` refuses two referents not yet established **unless** the edge carries
`warrant:<giver>` — in which case it lands **offered**, not established;
`synthesize` refuses parts sharing no warranting relation; `revise` refuses
without both a trigger and a target already on the log. **A define lands as a
wish until its evaluate clears** — that is a fold-time fact, not a grammar-time
one, so nothing refuses at parse for a missing evaluate.

Whether you literally type act lines or keep the log in a doc, the two
properties that matter are the ones the log has and a whiteboard does not:
**supersession keeps the past**, and **every commitment names its witness.**

---

## 12. Ninety minutes, in order

1. **10' — Declare the void.** Nine lines plus `broken:`. Fill what you can,
   leave the rest as explicit gaps. Read the gaps out loud.
2. **5' — Open, or refuse.** If `no_slot` / `no_anchor` / `no_closing_condition`
   / `no_perturbation`, the session's output is a *better declaration*, and that
   is a real output. Stop there without apology.
3. **5' — Name the apparatus.** What in this conversation is a naming device
   rather than a thing? Withhold it, on the record.
4. **20' — Fan out at `extraction` only.** Silent writing. Everything lands. No
   discussion, no clustering, no dot-voting — clustering is a greedy search
   wearing a friendlier costume.
5. **20' — EVA, one candidate at a time, against the test declared in step 1.**
   Three outcomes only: testimony (with a witness), refused (by which clause),
   undetermined. Do not convert undetermined into refused.
6. **10' — Coverage.** What does the extent still not cover? Name the void with
   its size and edges.
7. **10' — Descend or reshape.** Posture spent → concede, descend to
   `cultivation`, note the rung. A trigger fired → revise, supersede the
   opening, carry testimony across, return extensionally-refused candidates to
   wish.
8. **10' — `whatWouldSettle`.** Write the questions in the order the loop
   orders them: place what you hold, then fill the void, then re-ask the
   silent sources. **That ordered list, not a feature, is the session's
   deliverable.**

**Closing is a separate meeting, with a different posture, and that is not
bureaucracy — it is the one law this loop has.**

---

## 13. What this protocol does not do

- **It does not prioritize.** It produces standings and named voids. Sequencing
  them against cost and time is a different act, and pretending the ontology
  performs it would be exactly the "coherence read as correspondence" error §8
  ends on.
- **It does not score.** No weighted rubric, no RICE. Verdicts are typed
  (testimony / refused / undetermined) because a score collapses those three
  into one number and the collapse is where the information goes.
- **It does not classify content into cells.** Cells type acts. A feature is not
  "a Link feature" — it was *admitted under* a cell.
- **It is not executed by `void-loop.js` today.** See the scope note at the top.
  Declaring a product void as a real `EOVoidDeclaration@1` and running
  `openLoop` / `proposeFrom` / `admit` / `foldLoop` against it — so a product
  space gets the same append-only, supersession-keeping record an answer gets —
  is real, plausible, unbuilt work.

---

## 14. Pointers

| for | read |
|---|---|
| the nine-operator declaration and the coverage arithmetic | `void-shape.js` (its header is the specimen) |
| the loop, the ladder, the two RECs, the triggers | `void-loop.js`; POLICIES.md **P53** and its two amendments |
| the act grammar and its refusals | `grid.js`; POLICIES.md **P22** |
| the 27 cells, one by one, with organs and measured examples | `THE-27-CELLS.md` |
| coverage as diagnostic, and the three hole kinds | `CAPABILITY-POLICIES.md`; POLICIES.md **P58 / P64 / P65**; `eval/capability-coverage.mjs` |
| standings that can lapse | POLICIES.md **P40** |
| withholding vs convicting | CLAUDE.md, "The grounding ladder", the 2026-08-17 constitutional statement |
| depth rather than breadth | POLICIES.md **P44** (the MHC battery) |
