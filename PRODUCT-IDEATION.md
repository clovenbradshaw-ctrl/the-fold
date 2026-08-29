# Deciding what to build, run as a void loop

**What this is.** A working protocol for deciding what to add to something you
are building. It replaces "come up with ideas, then pick one" with a different
order: **declare the space the thing would stand in first**, then run one
loop against that space and let the answer be what the loop leaves standing.

**The one-sentence version.** Do not start from an idea. Start by zeroing the
space — nine questions, each answered or explicitly left as a named gap — then
propose candidates, admit or refuse each against a test you wrote *before* you
had a favourite, and re-zero when the posture that produced the candidates
runs out. An uncovered stretch of the space is a **finding**, not a blank; an
idea nobody can say would be wrong is not yet a candidate.

**One example, all the way through.** Every section is worked against the same
ask, on the same product: a team that makes an app for birders has been told
to **"add bird ID."** That is deliberate. A protocol illustrated with a fresh
example per section reads as nine unrelated tips; run against one thing from
the declaration to the commitment, the moves connect and you can see what each
one buys. §10 is the control — the same protocol in a clinic, so you can check
that none of it was about birds. It is not about software either.

**What this is not.** It is not software. Nothing here runs itself, scores
anything, or produces a ranking. It is a set of questions in a fixed order,
with named ways to fail, that a room can run in ninety minutes.

---

## 1. Why not start from the idea

**"We should add bird ID."** Two teams answer it. One proposes **photo ID** —
point the phone, get a species — with the pile of blurry uploads to back it.
The other proposes **sound ID** — hold up the phone, get a species — with the
abandoned recordings to back it. Each is a true answer to the ask. Each has
evidence. Each is a good feature.

And the argument about which one to build is the wrong argument, because
neither team has drawn the space. What a birder actually holds at an
unidentified sighting is **evidence, of six recognisable kinds** — what they
saw, what they heard, where they were, when, what it was doing, and how long
they had. Photo ID covers one. Sound ID covers one. Nothing in the room can
say the answer is *still short*, so nothing in the room can say when it would
be done.

```
the extent: the evidence a birder holds at an unnamed sighting
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

**Greedy search is the failure mode, and it is worth naming.** Propose one
candidate, test it, propose the next, and you are running a greedy search — and
a greedy search over two true fillers returns whichever one you happened to
draw first. In a room, that is photo-versus-sound: two good candidates, one
argument, and whichever wins ships as if it were the whole answer. The fix is
structural, not attitudinal: **every candidate is written down before any
candidate is judged.**

---

## 2. Step zero — zero the space, in nine questions

Zeroing a space is not one declaration, it is nine. Each is a different
question a space must answer *before anything stands in it*, and **every
omission is a named gap, never a default**. A space missing one of the nine is
not an error — it is a silent assumption that shows up later as a confident
wrong answer.

The nine come from a closed algebra of acts: nine operators (**NUL SIG INS SEG
CON SYN DEF EVA REC**) across three domains (Existence, Structure,
Interpretation) and three grains (Ground, Figure, Pattern). You do not need the
algebra to run the protocol — the nine questions stand on their own — but the
grouping is not arbitrary, and §2's last part shows what falls out of it.

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
reopens on  (REC): a sighting whose evidence is of a kind the extent does not
                   name, or at a grain it cannot see
broken:            re-run it on real sightings with location and date STRIPPED.
                   If the suggestions do not change, the extent names
                   dimensions the feature never uses, and the coverage we are
                   about to claim is fiction
```

**What that declaration already did, before a single candidate existed.** The
*anchor* stopped "birders" from meaning two incompatible people. The *admits*
line ruled out three plausible, popular, adjacent things. The *extent* turned
"bird ID" from a feature into a *measurable* six-kind space. And the admission
test's offline clause was written before anyone had a favourite — which is the
only moment it can be written honestly.

### The nine, and what each one's silence costs

| op | field | terrain · grain | stance | the question it asks | what its silence costs, on this ask |
|---|---|---|---|---|---|
| **NUL** | slot | Void · Ground | **Clearing** | What space is this, marked off from everything it is not? | "We're doing something about identification" is a topic, not a slot. Half the room is then arguing about the logging flow — a different space — and nobody notices they are answering different questions. |
| **SIG** | anchor | Entity · Figure | **Binding** | What must resolve for this space to exist at all? | "Birders" admits the lifer-chasing lister and the kitchen-window feeder-watcher at once. They need opposite things, so the candidate that wins the argument serves neither. |
| **INS** | admits | Kind · Pattern | **Composing** | What *kind* of thing may stand here? | The slot fills with things that fit the sentence: *partner with a field-guide publisher*, *hire an ornithologist*, *run an ID webinar*. All real things to do. None of them can stand at a sighting. |
| **SEG** | extent | Field · Ground | **Clearing** | The extent to be covered **and its units**. | Nothing can ever be short, so nothing can ever be enough. "Improve ID" becomes a heading that gets added to every quarter and finished in none. |
| **CON** | relation | Link · Figure | **Binding** | What binds a filler to the anchor? | Candidates get admitted for being *about birds* rather than for narrowing a candidate set. A species-of-the-day card is about birds, co-occurs with identification, and narrows nothing. |
| **SYN** | composition | Network · Pattern | **Composing** | How do fillers compose across the extent? | Photo ID and a range-filtered shortlist both ship, nobody declared how they combine, and the first screen that runs both shows one birder two different answers. |
| **DEF** | cardinality | Lens · Figure | **Dissecting** | How many fillers is this space *declared* to hold? | Read off the singular in "add bird ID", one working classifier closes a six-kind space. This is the cell whose silence produced §1. |
| **EVA** | admission | Lens · Figure | **Binding** | The test a candidate must pass — stated *before* candidates exist. | The test gets written after the favourite, and it fits the favourite: the offline clause quietly disappears the week the cloud model tests better. |
| **REC** | reopens on | Paradigm · Pattern | **Composing** | What forces this whole declaration to be revised? | The space can never be wrong, only unfinished. A birder reporting a 400-metre silhouette becomes a bug in the classifier instead of evidence the extent was drawn at the wrong grain. |

**Read the stance column.** Three Clearings, three Bindings, three Composings —
and **exactly one Dissecting: DEF**. Cardinality is the single *cut* in a space
otherwise made of clearings, bindings and compositions. That is not a
curiosity; it is the question whose silence produced the photo-versus-sound
argument, and it is the one nobody asks: *how many things is this space
supposed to hold?*

**DEF and EVA sit on the same terrain and differ only in stance.** You cut with
the lens, then you bind with it. That is why they are a **loop** and not two
unrelated reviews.

**Inspect the declaration itself** before you inspect any candidate. Which of
the nine did you leave blank? That list is the first output of the session, and
an under-specified space is the thing that produces confident wrong answers —
so it should be as visible as the missing filler is.

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
reopens on  (REC): ______________________________________________
broken:            ______________________________________________
```

`broken:` is not one of the nine. It is the tenth line, and the loop should
refuse to open without it: **opening a space costs you a statement of what
would make the whole thing wrong.** That is the wall that keeps a
fan-out-and-argue session from becoming a spiral that agrees with itself. On
this ask it is the strip-the-location test above. In general: **no kill
criterion, no loop.**

---

## 3. Four refusals that stop a loop

Three absences make the loop unrunnable. Everything else undeclared rides
along, visible but not fatal — which is what makes the protocol usable on a
Tuesday rather than an ideal nobody reaches.

| refusal | means | what it sounds like on this ask |
|---|---|---|
| **no slot** | NUL undeclared | "We're doing something about identification." That is a topic. There is no space yet, and the logging people and the ID people are both in the room, each believing it is theirs. |
| **no anchor** | SIG undeclared | Nothing has to resolve, so the feeder-watcher's request and the seawatcher's request are both admissible — and they want opposite products. |
| **no closing condition** | neither an extent nor a number | Nothing could ever license a commit. "Improve ID" runs forever, one quarter at a time. This is the shape of a discovery track with no end. |
| **no perturbation** | `broken:` missing | Nobody can say what result would make the team stop. |

**One trap worth knowing in advance.** The first version of this refusal list
was a single blanket rule: *refuse any under-specified declaration*. It made
the protocol unusable, because a real declaration always has gaps — and worse,
it made the most valuable finding unreachable, since a space you cannot open is
a space whose cardinality you never test. **A refusal nothing can usefully pass
is a claim about the refusal, not about the thing being refused.** If your
process has a gate nobody has ever cleared, the gate is the defect.

---

## 4. The stance ladder — where candidates come from

The declared **stance** is the loop's one free variable: it decides which
generator proposes candidates at all. Three rungs, descended only when the one
above is exhausted.

| rung | mode · grain | generates | on this ask |
|---|---|---|---|
| **extraction** | Differentiate · Figure | what the material itself already states | The "sp." and "unidentified" entries in users' own lists. Support mail describing a bird in words. The blurry photos people upload anyway. The recordings they make and never use. The forum posts that open "small brown thing, marsh, Tuesday". |
| **cultivation** | Relate · Figure | what binds to the anchor — a reference, a source, a witness | What the other birding apps already solved and how. A county records committee's own ID criteria. A paper on acoustic classification. An ornithologist interviewed *for this slot* rather than in general. |
| **encounter** | Generate · Figure | a filler nothing named — supplied, not read | "What if the app watched through the binoculars." Nobody asked for it. You are proposing it. |

**`encounter` is last, and it is the only rung that can supply a candidate the
material never named. That is where invention lives, and naming it as a posture
is what makes it visible instead of ambient.** An idea reached at `encounter`
and one reached at `extraction` are both answers, and they are not the same
kind of answer; the record says which without anyone inferring it from a score.

This is the single highest-value thing the protocol does to an ordinary
ideation session: it does not ban invention, it *labels* it, and it requires
the two rungs above to be exhausted first. Most rooms invent at minute three
because inventing is more fun than reading support mail — and then defend the
invention as though it had come from the material.

**Two senses of "stance", kept apart.** There is the stance *of a cell* — a
property of the question being asked, computed from its mode and grain, which
cannot be wrong. And there is the stance *you declare* — the posture you are
taking on this act, which is a choice and can be refused. Same word, two
standings; do not merge them.

---

## 5. The loop

### Propose (DEF) — fan out, do not walk

Everyone writes candidates for the *declared slot* at the *declared rung*, and
**every one of them lands before any one of them is discussed.**

That is structural, not a facilitation preference. Propose-one-test-it-
propose-the-next is a greedy search, and a greedy search over two true fillers
returns whichever it drew first. The set of proposed-but-not-yet-judged
candidates **is** the useful state: it is the only moment where the room holds
all of its options at once. Clustering, dot-voting and "let's build on that"
all collapse it early — clustering especially, which is a greedy search wearing
a friendlier costume.

A candidate stands as a **wish** until an admission clears it.

### Admit (EVA) — bind each to the ground

The admission test was written at step zero, before any candidate existed. Each
candidate is evaluated against it *individually*, against the same ground, and
comes out with one of three standings:

| standing | what it means | on this ask |
|---|---|---|
| **testimony** | Cleared admission, with a witness named. | **Sound ID** — consumes *what they heard*, runs on-device, so the offline clause holds. |
| **refused** | Failed the declared test. Note *which clause* it failed. | **Ask the community** — it does not narrow using evidence the birder has; it defers the question to someone else, later, with signal. |
| **undetermined** | Read, and nothing settled it either way. | **The stepwise narrowing key** — nobody knows whether a person holding binoculars taps through six questions, and the app has no data because it has never offered one. |

Note which candidate got refused there. *Ask the community* is a genuinely good
thing to build. It was refused by the **declared relation and admission test**,
written before anyone had a favourite — which is the test doing its job instead
of the room's enthusiasm doing it.

> **Undetermined is not refused, and folding one into the other is the most
> common way this goes wrong.** A check may say "I have nothing to compare this
> against" (withhold), or "I compared it and it failed" (convict). It may never
> manufacture the second out of the first. Treating absence of evidence as
> evidence of failure is not rigour; it is an accusation with no evidence,
> dressed as one.

### Re-zero (REC) — two triggers, two different acts

Not one move. The distinction matters, because the two have different
consequences for everything already on the board.

1. **The posture is spent.** The rung gave up everything it holds and the space
   is still short → **concede** it, note the concession, and **descend one
   rung**. Nothing already admitted is disturbed. On this ask: extraction gave
   up everything the logs and the support mail hold, so the room descends to
   cultivation.
2. **The declaration was wrong.** → **revise, and supersede the act that
   opened the space.** Reshaping resets the ladder, carries the already-cleared
   candidates across, and returns candidates that were refused *by the extent
   alone* to **wish** — because their refusal rested on the extent you just
   conceded.

Three signals tell you the second kind has happened. Read them as product
findings, not as errors:

| signal | what it looks like | what it means, on this ask |
|---|---|---|
| **the extent is too small** | an admitted candidate serves people outside the space you drew | Sound ID turns out to be used most by birders who **already named the bird** and want confirmation. **The slot is wrong**, not the feature. |
| **the extent excludes** | candidates were excluded by the extent alone, *without ever being read*, while the space is still short | Every candidate needing a network was excluded by the offline clause without anyone reading it, and four evidence kinds are still open. *A space that refuses candidates and reports itself unfilled is evidence about the space, not about them* — the marsh-at-dawn assumption is doing the deciding. |
| **covered but unplaced** | the space reads complete while holding something you cannot place in it | A bird at arm's length on a feeder and a silhouette at 400 metres through a scope are both *what they saw*, and photo ID covers exactly one of them. **The extent's grain is too coarse** — the extent question is "what is to be covered, *and in what units*". |

### The loop's own law

**The loop may not close from the posture it proposed from.**

> A fan-out from `encounter` closed from `encounter` never tested anything —
> candidates were generated, a commitment was generated, and the admission
> between them was ceremony.

In a room: **the posture that invented the idea may not be the posture that
certifies it cleared.** "What if the app watched through the binoculars" came
from `encounter`, so the close cannot: it needs an extraction (a prototype's
own logs now state it) or a cultivation (someone who has built one bound it).
"We all agreed in the workshop" is closing from the posture that proposed.

---

## 6. A gap you can name is a question you can ask

When the loop stalls, its own state tells you what to go and find out — and the
questions come **ordered by what settles fastest**. The ordering is the lesson,
because rooms reliably reach for the slowest one first.

1. **Place what you already hold.** A candidate that cleared admission and
   cannot be placed in the extent. Here: *"'likely here, now' cleared — does it
   cover* where *alone, or* where *and* when*?"* One afternoon against range
   data already in hand, and it moves the coverage count. **Place the thing you
   have before you go looking for a new one.**
2. **Fill the void.** A stretch nothing covers. Here: *"who narrows on
   behaviour?"* This is the one that genuinely needs new discovery — and it now
   arrives *sized*, rather than as "do more research".
3. **Settle the undetermined.** Read, and nothing settled it. Weakest and last:
   a source that already said nothing is the least promising place to ask again.

When an answer comes back, fold it in — and **refuse an answer the extent
cannot contain** rather than quietly widening the extent to fit it. Widening an
extent is a deliberate act with its own re-zero; it is never a side effect of
answering a question.

That wall is worth more than it looks. An answer that comes back wrong gets
refused by the arithmetic, and the wrong answer neither corrupts the space nor
produces a confident conclusion. **The refusal is worth more than the answer
being right, because it holds for answers wrong in ways nobody anticipated** —
the confident stakeholder, the mis-scoped research round, the number that turns
out to have measured something else.

---

## 7. emanon → protogon → holon: the standing of a feature

The three words are borrowed from an ontology of individuation — how something
goes from *a difference you notice* to *a thing you can name* to *a whole that
is also a part*. The ladder is the borrowing; the exit gates below are this
document's own.

**These are standings, not calendar phases.** A standing is a belief about a
thing, not a milestone it passed, so it is revisable in both directions: the
gate is re-run as more comes in, and what no longer clears **lapses** — with
its reason recorded, not reduced to a bare tag. A feature demotes exactly that
way, and **a roadmap that cannot demote is a roadmap that can only grow.**

### apparatus — the warning class, checked first

A thing that appears everywhere in the conversation and is a **naming device
rather than a being**. On this ask it is **"the ID engine"** — also "the model",
"our data pipeline", "the platform". It co-occurs with everything by
construction, so it appears to relate to every candidate and discriminates
between none.

**Test:** does it appear mostly in sentences that are naming other things? Then
it is how you talk about the work, not the work. A quarter spent on "the ID
engine" can end with no evidence kind covered and everyone able to describe
progress.
**Action:** name it, withhold it from the candidate set, and *record that you
withheld it*. The withholding is a finding, not a tidy-up — an apparatus that
gets silently dropped comes back next quarter with a new name.

### emanon — a difference felt, not yet named

A recurring complaint, drop-off, or workaround that is real and has no name.
There is a slot and an anchor; **nothing stands in the space.** Here: birders
keep logging "sp." and writing in about birds they could not name, and nobody
can yet say what they were missing at the moment they needed it.

**Exit → protogon:** the nine are declared (or their gaps named and visible),
`broken:` is stated, the loop opens without the three refusals, and at least
one candidate has been proposed at a **named rung**.
**What it may not do yet:** appear on a roadmap. An emanon on a roadmap is a
date attached to a question.

### protogon — a provisional individual

At least one candidate has cleared admission against the declared test, with a
witness — a **wish that became testimony**. Still revisable: the past is kept,
the rung it was reached at is on the record, and it can still be conceded.
Here: **sound ID, behind a flag, scoped to the one evidence kind it names, with
a stated accuracy bar.**

**Exit → holon:** three things, all of them, none inferable from the others.

1. **Coverage is stated.** The extent reads covered, *or* the remaining void is
   named with its size and edges. "Four of six evidence kinds, with behaviour
   and duration open" is admissible; "we didn't check" is not.
2. **The close is from a different stance than the proposal.**
3. **Composition is honoured.** The declared composition actually holds against
   the rest of the product. Here that is the live gate: the declaration says
   evidence kinds *combine*, and nothing has checked that photo ID and "likely
   here, now" compose. Apply the shortlist *after* the model rather than folding
   it in as a prior and the two disagree in public — one screen, two answers,
   one birder. **A part that composes only in the deck is not composed.**

### holon — a whole that is also a part

Committed. It stands on its own **and** it is a part of the system: other
things can call it, it is findable by name rather than by whoever built it,
and — the part teams skip — **a route back exists.** A commitment you cannot
concede is not a commitment, it is an inheritance.

Here that route is concrete rather than ceremonial: a species' range shifts,
the "likely here, now" prior is now wrong for a whole region, sound ID's
accuracy drops below the bar it stated, and the holon **lapses** — with its
reason recorded — instead of staying shipped and quietly wrong.

**The arc, in one line:**

> **emanon**: birders keep logging "sp." and we cannot say what they needed.
> **protogon**: sound ID is standing there provisionally and we can say who
> witnessed it and what it covers.
> **holon**: it holds on its own, it composes with the range prior, and we know
> what would make us give it up.

---

## 8. Coverage as a source of ideas — an empty cell is a lead, never a verdict

The complementary move. Stop asking what users want for a moment, and ask
**what kinds of act your product can perform at all.**

Lay what you already have onto the grid of acts — the nine operators across
three grains, twenty-seven cells — and read the holes. The rule that makes this
work rather than becoming astrology: **the grid types ACTS, never subject
matter.** A cell is not a label you compute from what a feature is about. Ask
*what kind of act does this let a person perform*: "it's a bird thing" is not a
cell; "it distinguishes one individual from a background" is.

**Three different things produce an empty cell, and telling them apart is the
entire value:**

| hole | what it is | on this ask |
|---|---|---|
| **debt** | the capability exists and nobody has registered it | The app already computes a range-filtered shortlist inside its search screen, and nobody on the ID team knows. Check this first, every time — it is the cheapest to close, and it is more common than anyone expects. |
| **real incapacity** | the product genuinely cannot perform that kind of act | Nothing in the product can take *behaviour* as an input at all — no field, no capture, no vocabulary. That is the feature idea, and it is *derived* rather than brainstormed. |
| **probe error** | the question you asked of the cell was the wrong question | "The app can't do sound" was really "we asked whether it can do sound *offline*, and it can't do that specific thing." Suspect the probe before the product. |

**The rule that makes the middle row earnable:** a cell earns the *incapacity*
reading only by a **prediction stated before the check is run and then
confirmed** — "if this is a real gap, then X should be impossible; let's go
see." Without that, "we can't do this" is a story about the map, not the
territory, and the story is usually debt.

**Two axes, not one.** Coverage is *breadth*: what kinds of act. The other axis
is *depth*: how complex an act, how many levels of structure it coordinates. A
product can be broad and shallow or narrow and deep, and neither shows up on
the other's chart.

**And the wall both axes hit, stated so nobody sells past it:** a complete map
means every kind of act is *performable*, never that any is performed
*correctly*. Coherence is strictly weaker than correspondence. A perfectly
covered map can still misidentify the bird.

---

## 9. The whole loop, run once

The sections above took one move each. Here is the same ask from the opening
to the standing, so the moves connect.

**Open.** The nine declared as in §2, `broken:` stated. The slot, the anchor
and a closing condition are all present, so the loop opens; the two fields
nobody could fill ride along named rather than blocking.

**Fan out at `extraction`.** Silent writing against the declared slot. All of
it lands before any of it is discussed: *photo ID*; *sound ID*; *a stepwise
narrowing key*; *a "likely here, now" shortlist*; *compare two species*; *ask
the community*.

**Admit, one at a time.** Photo ID → **testimony** (*what they saw*,
on-device). Sound ID → **testimony** (*what they heard*, same way). "Likely
here, now" → **testimony** (*where* and *when*, off cached range data). Ask the
community → **refused**, by the declared relation. Stepwise key →
**undetermined**. Compare two species → **refused by the extent alone**: it
needs a candidate set to compare *from*, and nothing in the extent produces one
yet.

**Coverage.** Four of six evidence kinds — up from the two §1's argument would
have shipped. The void is *what it was doing* and *how long they had*, named
with its edges. Every birder knows the hovering-then-plunging bird and the
two-second flyover; nothing on the board touches either.

**The questions, in their own order.** Place "likely here, now" (one afternoon,
moves the count) → commission the behaviour question (sized) → then the
stepwise key. **That ordered list, not a feature, is the session's output.**

**Then it re-zeros, and it is a grain finding rather than a new idea.** A user
writes in about the sighting they most wanted help with: a bird through a scope
at 400 metres in flat light — shape and motion only, no colour, no photograph
possible. *What they saw* is an evidence kind the extent names, so this is not
outside the space. It is **covered but unplaced**: a feeder bird at arm's
length and a 400-metre silhouette are not the same evidence, and photo ID
covers one of them. **The extent's grain is too coarse.** That is *revise and
supersede* — the declaration was wrong, not the posture spent — splitting *what
they saw* into *seen well* and *seen poorly*, at which point coverage honestly
drops to four of seven and *compare two species* returns from refused to
*wish*, because its refusal rested on the extent just conceded.

**Standings.** Sound ID is a **protogon**. "Bird ID" as a whole is **not** a
holon, and the gate stopping it is composition.

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
learned that domain, not anything general** — so run it somewhere unrelated
rather than trusting it because it was written to sound general.

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
reopens on  (REC): a no-show cause that acts outside the booking→appointment
                   interval at all (transport, childcare, fear)
broken:            withhold the intervention from a random arm — if no-shows
                   move the same, the space is not what we think it is
```

**Extraction** yields: reminder SMS at 24h, reminder at 2h, one-tap confirm,
one-tap reschedule, waitlist backfill. Fanned out, none discussed. **Admission**
against the declared test: waitlist backfill **refuses** — it does not change
whether *this* patient arrives, it changes what happens after they do not. A
true and useful thing, refused *by the declared relation* — structurally the
same refusal *ask the community* took in the birding run, on a completely
different continent of subject matter.

**Then two of the three signals fire, and they are the whole point of the
control.**

*The extent excludes* — several candidates (transport help, childcare, an
explanation of the procedure) were excluded **by the extent alone, without ever
being read**, while the space is still short. *A space that refuses candidates
and reports itself unfilled is evidence about the space, not about them.* The
booking→appointment interval was the wrong extent.

*Covered but unplaced* — the 24h reminder reads as "covering" the interval and
nobody can say which hours it acts in. The extent's **grain** is too coarse —
the same finding the 400-metre silhouette produced, in a domain with no birds
in it.

Both are **revise and supersede**, not concede: the declaration was wrong, not
the posture spent. The space is re-zeroed with a wider extent and finer units,
the cleared candidates carry across, and the extent-refused ones return to
*wish*.

---

## 11. If you want a formal record

The loop's moves can be written as acts on an append-only log, one line each:

```
<verb> [<object>] at <terrain> from <stance>
       [ground <g> broken:<p>] [because <t>] [supersedes <id>] [warrant:<who>]
```

Eight verbs cover the nine operators — `distinguish` carries two, because
signing something and individuating it are one motion at the surface and two
acts underneath: `void`, `distinguish`, `separate`, `relate`, `synthesize`,
`define`, `evaluate`, `revise`.

### The birding run, as act lines

The terrain and stance are read off the space's own questions, so the acts are
not chosen — they fall out of the declaration:

```
void "unnamed sighting" at Void from differentiate
     ground app-logs broken:strip-location-and-date

define "photo ID"            at Lens from extraction
define "sound ID"            at Lens from extraction
define "likely here now"     at Lens from extraction
define "stepwise key"        at Lens from extraction
define "compare two species" at Lens from extraction
define "ask the community"   at Lens from extraction
     — the whole fan-out lands before any evaluate runs. That set,
       with nothing yet cleared, is the room's real state

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

Three things there are load-bearing rather than decorative. The opening `void`
**cannot be written without** its `ground … broken:` — the kill criterion is
grammar, not etiquette. Every `define` names the rung it came from, so the
record says where the candidates originated without anyone inferring it later.
And the closing `revise` names both a **trigger** and a **target**: it
supersedes the act that zeroed the space, because the space was wrong.

A few refusals are worth borrowing verbatim as room discipline: opening a
space, distinguishing a thing, or evaluating a candidate all require a named
ground and a named way to be wrong; relating two things not yet established
needs a warrant, and lands as *offered* rather than established; composing a
whole from parts that share no established relation is refused; and revising
needs both a trigger and a target already on the record. **A definition lands
as a wish until its evaluation clears it.**

Whether you literally write act lines or keep a log in a document, the two
properties that matter are the ones a log has and a whiteboard does not:
**supersession keeps the past** — the conceded six-kind extent is still
readable after the grain fix superseded it, so "we used to think evidence had
six kinds" is a fact you can look up — and **every commitment names its
witness.**

---

## 12. Ninety minutes, in order

1. **10' — Zero the space.** Nine lines plus `broken:`. Fill what you can,
   leave the rest as explicit gaps. Read the gaps out loud.
2. **5' — Open, or refuse.** If the slot, the anchor, a closing condition or
   `broken:` is missing, the session's output is a *better declaration*, and
   that is a real output. Stop there without apology.
3. **5' — Name the apparatus.** What here is a naming device rather than a
   thing? ("The ID engine.") Withhold it, on the record.
4. **20' — Fan out at `extraction` only.** Silent writing. Everything lands. No
   discussion, no clustering, no dot-voting.
5. **20' — Admit, one candidate at a time,** against the test declared in step
   1. Three outcomes only: testimony (with a witness), refused (by which
   clause), undetermined. Do not convert undetermined into refused.
6. **10' — Coverage.** What does the extent still not cover? Name the void with
   its size and edges — "behaviour and duration, of six kinds".
7. **10' — Descend or reshape.** Posture spent → concede, descend to
   `cultivation`, note the rung. A signal fired → revise, supersede the
   opening, carry the cleared candidates across, return extent-refused ones to
   wish.
8. **10' — What would settle it.** Write the questions in the loop's order:
   place what you hold, then fill the void, then re-ask the silent sources.
   **That ordered list, not a feature, is the session's deliverable.**

**Closing is a separate meeting, with a different posture** — and that is not
bureaucracy, it is the one law this loop has.

---

## 13. What this does not do

- **It does not prioritize.** It produces standings and named voids. Deciding
  that behaviour matters more than duration, against cost and time, is a
  different act — and pretending a protocol performs it would be exactly the
  coherence-read-as-correspondence error §8 ends on.
- **It does not score.** No weighted rubric, no RICE. Verdicts are typed
  (testimony / refused / undetermined) because a score collapses those three
  into one number, and the collapse is where the information goes.
- **It does not classify features by subject.** The grid types acts. Sound ID
  is not "a Link feature" — it was *admitted under* a cell.
- **It does not guarantee you are right.** Every refusal it makes is about
  internal consistency: whether this space, as declared, can hold this
  candidate. A room can be perfectly consistent and systematically wrong about
  the world. Only contact with the world settles that — which is what
  `broken:` is for, and why the protocol refuses to start without it.

---

## 14. One page, if you remember nothing else

**Nine questions, before any idea:** what space (slot) · what must resolve
(anchor) · what kind of thing may stand here (admits) · how much, in what units
(extent) · what binds a filler to the anchor (relation) · how fillers combine
(composition) · how many (cardinality) · what test admits one (admission) ·
what would force a rewrite (reopens on). Plus: **what would make this wrong.**

**Three rungs, in order:** what the material states → what binds to it → what
you invent. Descend only on exhaustion. Label which one you are on.

**Three standings:** testimony (cleared, with a witness) · refused (by a named
clause) · undetermined (nothing settled it — *not* a failure).

**Three signals you drew the space wrong:** it serves people outside your slot ·
it excludes candidates unread while still short · it reads complete while
holding something you cannot place.

**Three standings for the thing itself:** emanon (felt, unnamed) → protogon
(standing provisionally, witnessed) → holon (holds alone, composes, and can be
given up).

**Two laws:** the loop may not close from the posture it proposed from · a gap
you can name is a question you can ask, and the cheapest question is to place
what you already hold.
