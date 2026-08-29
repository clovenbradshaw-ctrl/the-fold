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

**One product, all the way through.** Every section below is worked against
the same ask, on the same app: a team that makes an app for birders has been
told to **"add bird ID."** That is deliberate. A protocol illustrated with a
fresh example per section reads as nine unrelated tips; run against one
product from the declaration to the commitment, the moves connect, and you can
see what each one actually buys. §10 is the control: the same protocol, in a
clinic, so you can check that none of this was about birds.

**Honest scope, up front.** `void-shape.js` and `void-loop.js` are real,
tested, running code — for questions asked of *text*. Nothing in this document
is executed by them today: this is their discipline carried onto a human
process, by hand, deliberately. Where a step is mechanized somewhere in this
repo, the module is named so the borrowing is visible. Wiring a product void
as an actual `EOVoidDeclaration@1` and running `openLoop` against it is real,
plausible, unbuilt work — named here, not implied done.

---

## 1. Why not start from the idea

**"We should add bird ID."** Two teams answer it. One proposes **photo ID** —
point the phone, get a species — with the pile of blurry uploads to back it.
The other proposes **sound ID** — hold up the phone, get a species — with the
abandoned recordings to back it. Each is a true answer to the ask. Each has
evidence. Each is a good feature.

And the argument about which one to build is the wrong argument, because
neither team has drawn the space. The thing a birder actually holds at an
unidentified sighting is **evidence, of six recognisable kinds** — what they
saw, what they heard, where they were, when, what it was doing, and how long
they had. Photo ID covers one. Sound ID covers one. Nothing in the room can
say that the answer is *still short*, so nothing in the room can say when it
would be done.

```
extent (SEG): the evidence a birder holds at an unnamed sighting
              units: evidence kinds

  saw        heard      where      when       doing      how long
  ▓▓▓▓▓▓▓    ▓▓▓▓▓▓▓    ·······    ·······    ·······    ········
  photo ID   sound ID

  covered: 2 of 6 · void: where, when, doing, how long — named, with edges
```

Read completeness off *the answer* and both candidates look sufficient,
because each is genuinely good at the kind of evidence it consumes. That is
the failure, and it never announces itself as one: the first plausible feature
anyone can defend closes a space that was never measured, and it closes it
*with a true sentence*. "Users want faster export" is true. It is not the
answer, if the space it stands in also holds three other things and nobody
drew the extent.

So the move is: stop asking the candidate whether it is sufficient, and ask
**the space**. A slot is not a bag of features; it is an extent with
dimensions, and a feature covers part of it. What is left over is not an
absence of evidence — it is a void with a size and edges, and something has to
be in it. That is what makes a third candidate *necessary* rather than
hoped-for, and it is the only thing that can tell the room when it is done.

**Greedy search is the failure mode, and it has a name.** `void-loop.js` fans
DEF out over an *array* and lands every candidate before any admission runs.
Its header states why, structurally: *propose-one-test-it-propose-the-next is
a greedy search, and a greedy search over two true fillers returns whichever
it drew first.* In a room, that is photo-versus-sound: two good candidates, one
argument, and whichever wins ships as if it were the whole answer.

---

## 2. Step zero — declare the void, all nine operators

Zeroing a space is not one declaration, it is nine. `declareVoid`
(`void-shape.js`) takes exactly these fields; each one is a different question
a space must answer *before anything stands in it*, and **every omission is a
typed gap, never a default**. A space missing one of the nine is not an error
— it is a silent assumption that shows up later as a confident wrong answer.

The cells are computed by the engine's cube (`cellOf(op, grain)`), not typed
here: **operator × grain is the whole space, 27 cells; stance = (mode, grain),
terrain = (domain, grain), both derived.**

### The declaration, for "add bird ID"

```
slot        (NUL): a sighting the birder could not name, in the field, at the
                   moment they had it — NOT a bird they did name and want to
                   log, NOT one they look up at home from memory that evening
anchor      (SIG): one birder, one sighting, one place and time
admits      (INS): something the app can offer AT the sighting — a capture, a
                   narrowing, a comparison. Never a course, a forum thread, or
                   a field-guide upsell
extent      (SEG): the evidence a birder actually holds at an unnamed sighting
                   units: evidence kinds — what they saw, what they heard,
                   where they were, when, what it was doing, how long they had
relation    (CON): "narrows the candidate set using evidence the birder has"
composition (SYN): evidence kinds COMBINE — each narrows further, and two
                   together narrow more than either alone. They stack on the
                   extent; they do not partition it
cardinality (DEF): unknown — DO NOT read it off the singular in "add bird ID"
admission   (EVA): a candidate names which evidence kinds it consumes, and
                   works with no signal — a marsh at dawn has no bars
reopensOn   (REC): a sighting whose evidence is of a kind the extent does not
                   name, or at a grain it cannot see
broken:            re-run it on real sightings with location and date STRIPPED.
                   If the suggestions do not change, the extent names
                   dimensions the feature never uses, and the coverage we are
                   about to claim is fiction
```

**What that declaration already did, before a single candidate existed.** The
*anchor* stopped "birders" from meaning two incompatible people. The *admits*
line ruled out three plausible, popular, adjacent things. The *extent* turned
"bird ID" from a feature into a *measurable* six-kind space. And EVA's offline
clause was written before anyone had a favourite — which is the only moment it
can be written honestly.

### The nine, and what each one's silence costs

| op | field | cell | stance | the question it asks | what its silence costs, on this ask |
|---|---|---|---|---|---|
| **NUL** | `slot` | Void · Ground | **Clearing** | What space is this, marked off from everything it is not? | "We're doing something about identification" is a topic, not a slot. Half the room is then arguing about the logging flow — a different space entirely — and nobody notices they are answering different questions. |
| **SIG** | `anchor` | Entity · Figure | **Binding** | What must resolve for this space to exist at all? | "Birders" admits the lifer-chasing lister and the kitchen-window feeder-watcher at once. They need opposite things, so the candidate that wins the argument serves neither. |
| **INS** | `admits` | Kind · Pattern | **Composing** | What *kind* of thing may stand here? | The slot fills with things that fit the sentence: *partner with a field-guide publisher*, *hire an ornithologist*, *run an ID webinar*. All real things to do. None of them can stand at a sighting. |
| **SEG** | `extent` | Field · Ground | **Clearing** | The extent to be covered **and its units**. | Nothing can ever be short, so nothing can ever be enough. "Improve ID" is then a heading that gets added to every quarter and finished in none. |
| **CON** | `relation` | Link · Figure | **Binding** | What binds a filler to the anchor? | Candidates get admitted for being *about birds* rather than for narrowing a candidate set. A species-of-the-day card is about birds, co-occurs with identification, and narrows nothing. |
| **SYN** | `composition` | Network · Pattern | **Composing** | How do fillers compose across the extent? | Photo ID and a range-filtered shortlist both ship, nobody declared how they combine, and the first screen that runs both shows one birder two different answers. |
| **DEF** | `cardinality` | Lens · Figure | **Dissecting** | How many fillers is this space *declared* to hold? | Read off the singular in "add bird ID", one working classifier closes a six-kind space. This is the cell whose silence produced §1. |
| **EVA** | `admission` | Lens · Figure | **Binding** | The test a candidate must pass — stated *before* candidates exist. | The test gets written after the favourite, and it fits the favourite: the offline clause quietly disappears the week the cloud model tests better. |
| **REC** | `reopensOn` | Paradigm · Pattern | **Composing** | What forces this whole declaration to be revised? | The space can never be wrong, only unfinished. A birder reporting a 400-metre silhouette becomes a bug in the classifier instead of evidence the extent was drawn at the wrong grain. |

**Read the stance column.** Three Clearings, three Bindings, three Composings —
and **exactly one Dissecting: DEF**. Cardinality is the single *cut* in a space
otherwise made of clearings, bindings and compositions. That is not a
curiosity; it is the cell whose silence produced the photo-versus-sound
argument, and in a product room it is the question nobody asks: *how many
things is this space supposed to hold?*

**DEF and EVA share a terrain (Lens) and differ only in stance.** You cut with
the lens, then you bind with it. That is why they are a **loop** and not two
unrelated reviews.

**Inspect the declaration itself** before you inspect any candidate —
`undeclaredOf(declaration)` returns exactly the operators left as gaps. The
recursion is the point, not a flourish: an under-specified void is the thing
that produces confident wrong answers, and it should be as visible as the
missing filler is.

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
becoming a spiral that agrees with itself.* On this ask it is the
strip-the-location test above; in product language generally, **no kill
criterion, no loop.**

---

## 3. The three refusals that stop a loop, and what they are in a room

`openLoop` refuses on exactly three absences and *discloses* the rest. The
first cut refused any under-specified declaration outright, and its own test
caught the cost — a refusal no declaration can usefully pass is a claim about
the refusal, not about the declaration (the third time this repo has caught
that shape).

| refusal | means | what it sounds like on this ask |
|---|---|---|
| `no_slot` | NUL undeclared | "We're doing something about identification." That is a topic. There is no space yet, and the logging people and the ID people are both in the room believing it is theirs. |
| `no_anchor` | SIG undeclared | Nothing has to resolve, so the feeder-watcher's request and the seawatcher's request are both admissible — and they want opposite products. |
| `no_closing_condition` | neither an extent nor a numeric cardinality | Nothing could ever license a commit. "Improve ID" runs forever, one quarter at a time. This is the shape of a discovery track with no end. |
| `no_perturbation` | `broken:` missing | Nobody can say what result would make the team stop. |

Everything else undeclared **rides the loop as `underSpecified`** and is
reported by `foldLoop`. Visible, not fatal — which is what makes the protocol
usable on a Tuesday.

---

## 4. The stance ladder — where candidates come from

The declared stance is the loop's one free variable: **it decides which
generator proposes candidates at all.** Three rungs (`STANCE_LADDER`),
descended only when the one above is exhausted — `skills.js`'s own descent
discipline (skill → slot-fill → model), with stances in place of tiers.

| rung | cell | generates | on this ask |
|---|---|---|---|
| **extraction** | Differentiate · Figure | what the material itself already states | The "sp." and "unidentified" entries in users' own lists. Support mail describing a bird in words. The blurry photos people upload anyway. The recordings they make and never use. The forum posts that open "small brown thing, marsh, Tuesday". |
| **cultivation** | Relate · Figure | what binds to the anchor — a reference library, a fetched page, a witness | What the other birding apps already solved and how. A county records committee's own ID criteria. A paper on acoustic classification. An ornithologist interviewed *for this slot* rather than in general. |
| **encounter** | Generate · Figure | a filler nothing named — supplied, not read | "What if the app watched through the binoculars." Nobody asked for it. You are proposing it. |

**`encounter` is last, and it is the only rung that can supply a filler the
material never named. That is where fabrication lives, and naming it as a
posture is what makes it visible instead of ambient.** An idea reached at
`encounter` and one reached at `extraction` are both answers, and they are not
the same kind of answer; the record says which without anyone inferring it
from a score. This is the single highest-value thing the protocol does to an
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

Facilitation consequence: everyone writes candidates for the *declared slot*
at the *declared rung* — here, "the evidence a birder holds at an unnamed
sighting", at `extraction` — all of them land, and **no candidate is discussed
until the fan-out is closed.** A candidate lands as a *wish* until an evaluate
clears it (`grid.js`'s own DEF/EVA fold: `wish` → `testimony` / `refused`).

### EVA — bind each to the ground

The admission test was declared at step zero, before any candidate existed.
Each candidate is evaluated against it *individually*, against the same ground.
A candidate stands as a **wish** until an evaluate clears it; after that it
carries one of three standings on the loop:

- **testimony** — cleared admission, with a witness named. *Sound ID: consumes*
  what they heard*, runs on-device, so the offline clause holds.*
- **refused** — failed the declared test. *Ask the community: it does not
  narrow using evidence the birder has, it defers the question to someone
  else, later, with signal.* Also lands `refusedBy: "extensional"` when the
  *extent alone* excluded it — arithmetic, before the test ever ran. Cheap, and
  it loses real information (see `extent_excludes`, below).
- **undetermined** — read, and nothing bound or refuted it. *The stepwise
  narrowing key: nobody knows whether a person holding binoculars will tap
  through six questions, and the app has no data because it has never offered
  one.* **This is not a failure and must not be folded into one.** The
  constitutional line this repo already holds: a checking organ may say "I have
  nothing to compare this against" (withhold) or "I compared it and it failed"
  (convict) — it may never manufacture the second out of the first.

Note which candidate got refused there. *Ask the community* is a genuinely good
thing to build. It was refused by the **declared relation and admission test**,
written before anyone had a favourite — which is the test doing its job instead
of the room's enthusiasm doing it.

### REC — re-zero, two triggers, two different acts

Not one verb. `grid.js` and `build-log.js` both carry the distinction and it
matters here:

1. **The posture is spent.** Extraction gave up everything the logs and the
   support mail hold, and the space is still short → **concede** (EVIDENCE ·
   REC, carrying the trigger verbatim, *no* `supersedes`) and **descend one
   rung**, to `cultivation`. A re-zero concedes a ground; it does not compile a
   new whole out of the old one.
2. **The declaration was wrong.** → **revise … supersedes `<the opening act>`**
   (SUPERSEDE). The act that zeroed the space is superseded, because the space
   was wrong. Reshaping resets the ladder, carries testimony across, and
   returns extensionally-refused candidates to *wish* — their refusal rested on
   the extent just conceded.

`reshapeTriggers(loop)` computes the second kind mechanically. Read them as
product signals:

| trigger | what the loop saw | what it means, on this ask |
|---|---|---|
| `extent_too_small` | an admitted filler runs past the declared extent | Sound ID turns out to be used most by birders who **already named the bird** and want confirmation. The thing you admitted serves people outside the slot you drew. **The slot is wrong**, not the feature. |
| `extent_excludes` | candidates excluded by the extent alone, **without ever being read**, while the space is still short | Every candidate needing a network was excluded by the offline clause without anyone reading it, and four evidence kinds are still open. *A space that refuses candidates and reports itself unfilled is evidence about the space, not about them* — the marsh-at-dawn assumption is doing the deciding. |
| `covered_but_unplaced` | the space reads complete while holding a filler it could not place | A bird at arm's length on a feeder and a silhouette at 400 metres through a scope are both *what they saw*, and photo ID covers exactly one of them. **The extent's own grain is too coarse** — SEG's cell is "the extent to be covered, *and its units*". |

### The loop's own law

`grid.js` pins one stance illegality: `synthesize` may not declare `from
relate` — *"you cannot commit a whole from a stance that refuses to commit."*
`void-loop.js` generalizes it and owns the generalization: **the loop may not
close from the posture it proposed from** (`stance_did_not_change`).

> A fan-out from `encounter` closed from `encounter` never tested anything —
> candidates were generated, a commitment was generated, and the EVA between
> them was ceremony.

In a room: **the posture that invented the idea may not be the posture that
certifies it cleared.** "What if the app watched through the binoculars" came
from `encounter`, so the close cannot: it needs an extraction (a prototype's
own logs now state it) or a cultivation (someone who has built one bound it).
"We all agreed in the workshop" is closing from the posture that proposed.

---

## 6. A gap the loop can name is a question it can ask

`whatWouldSettle(loop)` turns loop state into the questions that would settle
it — **ordered by what settles fastest**, and the ordering is the lesson:

1. **`place_filler`** — a candidate that cleared admission and cannot be
   placed. One targeted read against a source already identified. *Place the
   thing you already have before you go looking for a new one.* Here: *"likely
   here, now" cleared — does it cover* where *alone, or* where *and* when*?"
   One afternoon against range data already in hand, and it moves the coverage
   count.
2. **`fill_void`** — a stretch nothing covers. A real question about the world,
   and the one that needs a new candidate. Here: *"who narrows on behaviour?"*
   That is the discovery worth commissioning, and it now arrives sized rather
   than as "do more research".
3. **`settle_undetermined`** — read, and nothing settled it. Weakest and last:
   a source that said nothing is the least promising place to ask again. Here:
   the stepwise key.

`placeFiller(loop, {filler, span, source})` folds an answer back in and
**refuses a span the extent cannot contain** (`span_outside_extent`) rather
than silently widening the extent. Widening an extent is a deliberate act with
its own REC on the record — never a side effect of answering a question. This
wall was measured in the mechanism this borrows from: an answer came back
wrong, the extent refused it, and the wrong answer neither corrupted the space
nor produced a confident conclusion. **The refusal is worth more than the
answer being right, because it holds for answers wrong in ways nobody
anticipated** — including the confident stakeholder, the mis-scoped research
round, and the number that turns out to have measured something else.

---

## 7. emanon → protogon → holon: the standing of a feature

**The giver, and the borrowing, declared.** *apparatus / emanon / protogon /
holon* are the cast's own individuation verdicts (`host/corpus.js`'s
classifier, reached here through POLICIES.md P40's account of
`castStandings`). That classifier answers a question about **referents in a
text** — whether a recurring surface is a being, a narrating device, or
something not yet individuated — using its own measured tests. This document
borrows the **ladder**, not the classifier's tests. The exit tests below are
this document's own and are stated as such.

**These are standings, not calendar phases.** A standing is a belief about a
thing, not a milestone it passed, so it is revisable in both directions: the
same gate is re-run as more comes in, and what no longer clears **lapses** —
removed, with its full reason appended to an append-only ledger, never reduced
to a bare tag. A feature demotes exactly that way, and a roadmap that cannot
demote is a roadmap that can only grow. (The mechanism this mirrors is P40's
`reviewEntities`.)

### apparatus — the warning class, checked first

A thing that appears everywhere in the conversation and is a **naming device
rather than a being**. On this ask it is **"the ID engine"** — also "the
model", "our data pipeline", "the platform". It co-occurs with everything by
construction, so it appears to relate to every candidate and discriminates
between none, which is why the mechanism this borrows from **withholds**
apparatus from its own binding step, *with the withholding itself a named
entry* rather than a silent drop.

**Test:** does it appear mostly in sentences that name other things? Then it is
how you talk about the work, not the work. A quarter spent on "the ID engine"
can end with no evidence kind covered and everyone able to describe progress.
**Action:** name it, withhold it from the candidate set, and record that you
withheld it — the withholding is a finding, not a tidy-up.

### emanon — a difference felt, not yet named

A recurring complaint, drop-off, or workaround that is real and has no name
yet. There is a slot and an anchor; **nothing stands in the space.** Here:
birders keep logging "sp." and writing in about birds they could not name, and
nobody can yet say what they were missing at the moment they needed it.

**Exit test → protogon:** the nine are declared (or their gaps typed and
visible), `broken:` is stated, the loop **opens** without `no_slot` /
`no_anchor` / `no_closing_condition`, and at least one candidate has landed a
DEF at a **named rung**.
**What it may not do yet:** appear on a roadmap. An emanon on a roadmap is a
date attached to a question.

### protogon — a provisional individual

One or more candidates standing. At least one has cleared EVA against the
declared admission test, with a witness. It is a **wish that became
testimony**, and it is still revisable: supersession keeps the past, the rung
it was reached at is on the record, and it can still be conceded. Here: **sound
ID, behind a flag, scoped to the one evidence kind it names, with a stated
accuracy bar.**

**Exit test → holon:** three things, all of them, none inferable from the
others:

1. **Coverage is stated.** The extent reads covered, *or* the remaining void is
   named with its size and edges (`voidsOf`). "Four of six evidence kinds, with
   behaviour and duration open" is admissible; "we didn't check" is not.
2. **The close is from a different stance than the proposal**
   (`stance_did_not_change` refuses otherwise).
3. **SYN is honoured.** The declared composition actually holds against the
   rest of the app. Here that is the live gate: the declaration says evidence
   kinds *combine*, and nothing has checked that photo ID and "likely here,
   now" compose. Apply the shortlist *after* the model rather than folding it
   in as a prior and the two disagree in public — one screen, two answers, one
   birder. A part that composes only in the deck is not composed.

### holon — a whole that is also a part

Committed. It stands on its own **and** it is a part of the system: it has an
address other things can call, it appears in whatever your equivalent of
`capacities.js` is (a registry naming the module and the function, so a
reference resolves to a real place and never to a promise), and — the part
teams skip — **a REC path exists.** A commitment you cannot concede is not a
commitment, it is an inheritance.

Here the REC path is concrete rather than ceremonial: a species' range shifts,
the "likely here, now" prior is now wrong for a whole region, sound ID's
accuracy drops below the bar it stated, and the holon **lapses** — with its
reason on the ledger — instead of remaining shipped and quietly wrong.

**The arc, in one line:**

> **emanon**: birders keep logging "sp." and we cannot say what they needed.
> **protogon**: sound ID is standing there provisionally and we can say who
> witnessed it and what it covers.
> **holon**: it holds on its own, it composes with the range prior, and we know
> what would make us give it up.

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
perform*, never *what is it about* — "it's a bird thing" is not a cell.

**Three kinds of hole share one count, and telling them apart is the whole
value:**

| hole | what it is | on this ask |
|---|---|---|
| **registry debt** | the capability exists and is unregistered | The app already computes a range-filtered shortlist inside its search screen, and nobody on the ID team knows. In this repo's own connection pass this kind was **over half the map** — 9/27 became 19/27 with no new organs written, only ten verified rows added. |
| **real incapacity** | the product genuinely cannot perform that kind of act | Nothing in the product can take *behaviour* as an input at all — no field, no capture, no vocabulary. That is the feature idea, and it is *derived* rather than brainstormed. |
| **probe error** | the question asked of the cell was wrong | "The app can't do sound" was really "we asked whether it can do sound *offline*, and it can't do that specific thing." The MHC battery got four probes wrong in a row before one was right. Suspect the probe before the product. |

**The rule that makes the second row earnable:** a cell earns the *incapacity*
reading only by a **falsifiable prediction stated before the check is run, and
confirmed on real material.** Only one cell in this repo's own map ever earned
it that way. Everything else was debt.

**Two axes, not one.** Coverage is *breadth* (what kinds of act). The other
axis is *depth* (P44's MHC battery — how complex an act, scored against a
received scale, with a real ceiling found and named). A product can be broad
and shallow or narrow and deep, and neither shows up on the other's chart.

**And the wall both axes hit, stated so nobody sells past it:** coherence is
strictly weaker than correspondence. A completed 27 would mean every kind of
act is *performable* — never that any is performed *correctly*. Only an oracle
settles that, and only on facts. A perfectly covered map can still misidentify
the bird.

---

## 9. The whole loop, run once

The sections above took one move each. Here is the same ask from the opening
act to the standing, so the moves connect.

**Open.** The nine declared as in §2, `broken:` stated, `openLoop` clears —
`no_slot`, `no_anchor` and `no_closing_condition` all pass, and the two fields
nobody could fill ride along as `underSpecified` rather than blocking.

**Fan out at `extraction`.** Silent writing against the declared slot. All of
it lands before any of it is discussed: *photo ID*; *sound ID*; *a stepwise
narrowing key*; *a "likely here, now" shortlist*; *compare two species*; *ask
the community*.

**EVA, one at a time.** Photo ID → **testimony** (*what they saw*, on-device).
Sound ID → **testimony** (*what they heard*, same way). "Likely here, now" →
**testimony** (*where* and *when*, off cached range data). Ask the community →
**refused**, by the declared relation. Stepwise key → **undetermined**. Compare
two species → **refused**, extensionally: it needs a candidate set to compare
*from*, and nothing in the extent produces one yet.

**Coverage.** Four of six evidence kinds — up from the two §1's argument would
have shipped. The void is *what it was doing* and *how long they had*, named
with its edges. Every birder knows the hovering-then-plunging bird and the
two-second flyover; nothing on the board touches either.

**`whatWouldSettle`, in its own order.** Place "likely here, now" (one
afternoon, moves the count) → commission the behaviour question (sized) → then
the stepwise key. That ordered list, not a feature, is the session's output.

**REC fires, and it is a grain finding rather than a new idea.** A user writes
in about the sighting they most wanted help with: a bird through a scope at 400
metres in flat light — shape and motion only, no colour, no photograph
possible. *What they saw* is an evidence kind the extent names, so this is not
outside the space. It is `covered_but_unplaced`: a feeder bird at arm's length
and a 400-metre silhouette are not the same evidence, and photo ID covers one
of them. **The extent's grain is too coarse.** That is *revise … supersedes* —
the declaration was wrong, not the posture spent — splitting *what they saw*
into *seen well* and *seen poorly*, at which point coverage honestly drops to
four of seven and *compare two species* returns from refused to *wish*, because
its refusal rested on the extent just conceded.

**Standings.** Sound ID is a **protogon**. "Bird ID" as a whole is **not** a
holon, and the gate stopping it is SYN: nothing has checked that photo ID and
"likely here, now" compose.

**What the protocol produced.** Not a cleverer idea than the room had: *one
candidate refused with a stated reason*, *one named void of two evidence
kinds*, *one cheap question that moves the count*, *one wrong premise about
grain caught before anything shipped*, and *one composition risk that would
otherwise have arrived as a bug report*. None of that was in the one-line ask,
and none of it required anyone to be cleverer than they already were.

---

## 10. The control — the same protocol, in a clinic

Everything above has been one product. Here is the check that none of it was
about birds: nothing in §2–§8 mentions sightings, species, binoculars or
evidence kinds. **If a step needs the domain's own vocabulary to work, it has
learned that domain, not anything general** — so it is run somewhere
unrelated, rather than trusted because it was written to sound general.

**The ask:** "the clinic's scheduling app should reduce no-shows."

```
slot        (NUL): appointments booked and not attended, not cancelled
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
true and useful thing, refused *by the declared relation* — structurally the
same refusal *ask the community* took in the birding run, on a different
continent of subject matter.

**Then the two triggers fire, and they are the whole point of the control.**

`extent_excludes` — several candidates (transport help, childcare, an
explanation of the procedure) were excluded **by the extent alone, without ever
being read**, while the space is still short. *A space that refuses candidates
and reports itself unfilled is evidence about the space, not about them.* The
booking→appointment interval was the wrong extent.

`covered_but_unplaced` — the 24h reminder reads as "covering" the interval and
nobody can say which hours it acts in. The extent's **grain** is too coarse —
the same finding the 400-metre silhouette produced, in a domain with no birds
in it.

Both are **REC · revise … supersedes**, not concede: the declaration was wrong,
not the posture spent. The space is re-zeroed with a wider extent and finer
units, testimony carries across, and the extensionally-refused candidates
return to *wish*.

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
wish until its evaluate clears** — that is a fold-time fact, not a
grammar-time one, so nothing refuses at parse for a missing evaluate.

### The birding run, as act lines

The loop's own choreography reads its terrain and stance off the void's cells,
so the acts are not chosen — they fall out of the declaration:

```
void "unnamed sighting" at Void from differentiate
     ground app-logs broken:strip-location-and-date

define "photo ID" at Lens from extraction
define "sound ID" at Lens from extraction
define "likely here now" at Lens from extraction
define "stepwise key" at Lens from extraction
define "compare two species" at Lens from extraction
define "ask the community" at Lens from extraction
     — the whole fan-out lands before any evaluate runs. That set,
       with no clearing EVA yet, IS the superposition

evaluate "sound ID" at Lens from cultivation
     ground on-device-benchmark broken:strip-location-and-date
     verdict:holds

evaluate "ask the community" at Lens from cultivation
     ground admission-test broken:strip-location-and-date
     verdict:refused
     because "defers the question instead of narrowing on evidence held"

revise "the extent" at Paradigm from closure
     supersedes act-0
     because "«a 400 m silhouette» and «a feeder bird» are both what they
              saw — the grain is too coarse"
```

Three things in that transcript are load-bearing rather than decorative. The
opening `void` **cannot be typed without** its `ground … broken:` — the kill
criterion is grammar, not etiquette. Every `define` lands at `extraction`, so
the record says where the candidates came from without anyone inferring it. And
the closing `revise` names both a **trigger** and a **target**: it supersedes
`act-0`, the act that zeroed the space, because the space was wrong.

Whether you literally type act lines or keep the log in a doc, the two
properties that matter are the ones the log has and a whiteboard does not:
**supersession keeps the past** — the conceded six-kind extent is still
readable after the grain fix superseded it, so "we used to think evidence had
six kinds" is a fact you can still look up — and **every commitment names its
witness.**

---

## 12. Ninety minutes, in order

1. **10' — Declare the void.** Nine lines plus `broken:`. Fill what you can,
   leave the rest as explicit gaps. Read the gaps out loud.
2. **5' — Open, or refuse.** If `no_slot` / `no_anchor` /
   `no_closing_condition` / `no_perturbation`, the session's output is a
   *better declaration*, and that is a real output. Stop there without apology.
3. **5' — Name the apparatus.** What in this conversation is a naming device
   rather than a thing? ("the ID engine.") Withhold it, on the record.
4. **20' — Fan out at `extraction` only.** Silent writing. Everything lands. No
   discussion, no clustering, no dot-voting — clustering is a greedy search
   wearing a friendlier costume.
5. **20' — EVA, one candidate at a time, against the test declared in step 1.**
   Three outcomes only: testimony (with a witness), refused (by which clause),
   undetermined. Do not convert undetermined into refused.
6. **10' — Coverage.** What does the extent still not cover? Name the void with
   its size and edges ("behaviour and duration, of six kinds").
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

- **It does not prioritize.** It produces standings and named voids. Deciding
  that behaviour matters more than duration, against cost and time, is a
  different act, and pretending the ontology performs it would be exactly the
  "coherence read as correspondence" error §8 ends on.
- **It does not score.** No weighted rubric, no RICE. Verdicts are typed
  (testimony / refused / undetermined) because a score collapses those three
  into one number and the collapse is where the information goes.
- **It does not classify content into cells.** Cells type acts. Sound ID is not
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
