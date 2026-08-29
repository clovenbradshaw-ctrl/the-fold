# So you want to invent something

*Good. Here's how to find out what you're actually inventing — before you spend
a single afternoon building the wrong two-thirds of it.*

**The trap you're about to walk into, if you haven't already.** You have an idea.
It's a good idea. You can already see it working. And somewhere near you, someone
else has a *different* good idea for the same problem — also real, also
justified, also convincing. You're about to spend the next hour arguing about
whose idea is better.

Don't. Both of you are about to be right, and both of you are about to be
building a third of the actual thing.

> **Meet the example.** **Fieldmark** — three years old, about 40,000 people,
> a small team. It's a birding app people already use to log sightings, keep a
> life list, and see what other birders nearby have found. It's useful, and it
> has one hole a lot of its users hit constantly — **you're standing in a
> marsh, looking at a bird, and you don't know what it is.** Fieldmark has
> nothing for that moment.
>
> **That's the problem.** What actually lands on the team, though, isn't the
> problem — it's already a solution, in disguise: *"add bird ID,"* pushed by
> two people for two different reasons. **Priya Osei** runs support. She's the
> one who reads the "unidentified" backlog every week — hundreds of blurry
> photos people upload hoping someone can name what they saw. **Marcus Yun**
> is an engineer, and a birder himself, mostly by ear. He's already built a
> weekend prototype: a bioacoustic model pointed at the recordings people
> upload and never do anything with. Each of them is arguing from something
> real they've personally seen pile up. We stay with the two of them, and
> Fieldmark, from the very first argument to the final commitment, so you can
> watch how the pieces connect. §9 runs the identical process on a medical
> clinic, so you can see it isn't a trick that only works on birds.

**The actual problem — the one this whole document is about.** It isn't "which
idea is better." That question shows up *after* the real work, and most rooms
answer it before the real work has even started. **Almost all of the work in
inventing something is finding out, precisely, what's missing** — not picking
between solutions for it. Skip that, and you're not choosing badly; you're
choosing *early*, before there's anything real to choose between.

**The move that fixes it.** Before anyone proposes anything, **describe the hole
you're trying to fill** — precisely enough that you could point at the parts of
it and count them. Only once that's done does a proposed solution mean anything
at all: it's not a decision, it's a **hypothesis about the shape of an answer**,
and a hypothesis doesn't get defended, it gets tested. Ideas compete against a
test you wrote *before* you had a favourite — and what happens next isn't a
verdict, it's a loop: something fails, and you revise it; something fails in a
way that shows the *problem* was drawn wrong, and you go back and redraw the
problem, not just the idea. **Describe the problem. Hypothesize a shape.
Correct toward what actually works.** §10 is where the correcting part is
spelled out.

**What you get that you didn't have before:** a way to tell when you're actually
done. Right now, "done" probably means "we built something and got tired." That's
not the same thing, and this is how you tell the difference.

**How to use this.** §3 is eighteen small tasks, in order. Do them in order and
you'll get a first answer — but the order isn't a straight line. Parts of it
loop, on purpose, and more than once: §10 shows exactly where, and what each
loop costs. Everything else in here is explaining *why* the tasks are shaped
the way they are, for whenever you want that. If you're going to read one
section, read §3 and the one-page recap at the very end.

**What this isn't.** Not a scoring system. Not a prioritisation framework. Not
software. It's a short list of questions, asked in a fixed order, with names for
the ways you'll get stuck — and for when you'll have to ask some of them again.

---

## 1. The argument you were about to have

Here's what skipping that work actually looks like, the first time it happens
on a real team.

**"We should add bird ID."** Two people answer.

Priya says: **photo ID** — point your phone at the bird, get a name. She reads
the unidentified backlog every week; she has the pile of blurry photos people
upload to prove it.

Marcus says: **sound ID** — hold your phone up, get a name. He already has a
working prototype, built on his own time, trained on the recordings people
make and never do anything with.

Both are right. Both have evidence. Both would be good. And the argument about
which to build is the wrong argument — because nobody has described what a
birdwatcher actually has to work with when they can't name a bird.

Which is: **evidence, of about six kinds.** What they saw. What they heard. Where
they were. What time of year it was. What the bird was doing. And how long they
had before it vanished.

Photo ID uses one of those. Sound ID uses one. So whichever one wins the
argument, the team ships something genuinely good and covers **two of six** — and
nobody in the room is in a position to notice, because nobody wrote the six down.

```
what a birdwatcher has, when they can't name the bird:

  saw        heard      where      when       doing      how long
  ▓▓▓▓▓▓▓    ▓▓▓▓▓▓▓    ·······    ·······    ·······    ········
  photo ID   sound ID

  covered: 2 of 6.  The other four have nothing on them.
```

Look at the *ideas* and both are convincing, because each one really is good at
the thing it does. Look at the *gap* and you learn something neither idea could
tell you: there are four more kinds of evidence, nothing addresses them, and a
third idea isn't a nice-to-have — **it's necessary**, or the feature ships
half-built and nobody planned for that.

That's the whole method. **Stop asking whether the idea is good. Ask what the
gap is, and whether the idea fills it.**

### Why "just have a good discussion" doesn't do this

Because of how discussions move. Someone proposes, everyone reacts, it gets
better or it dies, someone proposes the next thing. That feels rigorous and it
isn't: **whichever good idea gets said first sets the frame**, and the second
good idea gets judged as a competitor to the first instead of as another piece of
the same gap.

The fix isn't better discipline in the discussion. It's changing the order:
**every idea gets written down before any idea gets discussed.**

---

## 2. The one thing to get right, if you skim everything else

If you take nothing else: **describe the gap in a way that can be counted.**

"Bird ID is weak" cannot be counted. "There are six kinds of evidence a
birdwatcher has, and we address two" can be counted — and that single change is
what lets you say *what's missing*, *how much is missing*, and *when you'd be
done*.

In practice that means one thing: **you can write the parts down as a list, and
point at the ones nothing covers.** Everything in Phase A exists to get you to
that list. If you only take one idea from this document, take that one.

---

## 3. The eighteen tasks

Eighteen tasks in four phases. Each says what to do, how you know it's finished,
and the trap that usually swallows it.

Phase A is the one people skip, and it's the one that does the work. Two of the
phases also loop back on themselves — Phase B can send you back to fan out from
a new source (Task 12), and Phase C can send you all the way back to redraw
Phase A's gap (Tasks 13–14). That's not a sign something went wrong; §10 walks
through why it happens and what each loop actually costs.

### Phase A — describe the gap (Tasks 1–7)

> **Task 1 — Write down the ask, word for word.**
> Whatever you were told: "add bird ID", "reduce churn", "make onboarding
> better." Write it exactly as it arrived, without improving it.
> **Done when:** everyone agrees that's what was actually said.
> **Trap:** silently upgrading it to what you wish had been asked. Do that later,
> in the open, so people can disagree.

> **Task 2 — Name the moment it happens.**
> One person, one occasion, one place and time. Here: *a birdwatcher, at a
> sighting, right now, who can't name what they're looking at.*
> **Done when:** you could point at a single real person having a single real
> moment.
> **Trap:** "our users." That's two different people at once — the obsessive
> lister chasing a rare bird and someone watching a feeder from the kitchen. They
> want opposite things, so whatever you build for "our users" serves neither.

> **Task 3 — Say what's out.**
> Name three plausible, adjacent, popular things that do *not* belong in this
> gap. Here: an ID course, a discussion forum, a field-guide upsell — all real
> things to do, none of which help someone standing in a marsh right now.
> **Done when:** you have three, and someone in the room slightly regrets one.
> **Trap:** ruling out only the silly things. If everything you excluded was
> obviously bad, you haven't drawn an edge yet.

> **Task 4 — Draw the ground, and give it units.**
> What has to be covered, and in what countable pieces? Here: *the kinds of
> evidence a birdwatcher actually has* — and the units are **evidence kinds**, of
> which there are six.
> **Done when:** you can write the pieces out as a list — an actual list, with
> lines on it. If you can't, try a different angle before you decide the units are
> wrong — see below.
> **Trap:** units you can't count — "a better experience", "user delight". If you
> can't count it, nothing can ever be missing from it, so nothing can ever be
> finished.

### If Task 4 won't come: six angles to try on the same gap

This is where almost everyone gets stuck, and the reason is almost always the
same: they try *one* way of slicing the moment, it doesn't split cleanly, and
they conclude "our thing doesn't come apart into pieces." It nearly always does.
You were just looking at it from one angle.

Below are six different questions you can ask about the same moment. They are
not steps — you don't do all six. Try two or three, in whatever order interests
you, and stop at the first one that produces a list where **each piece is
genuinely different from the others** — different enough that a good answer to
one wouldn't be a good answer to the next.

| angle | ask | reach for this when… | on the bird app |
|---|---|---|---|
| **what they have** | What does the person already possess or already know, right at this moment? | the gap is about someone missing *information* or *a capability* | what they saw, heard, where, when, what it was doing, how long they had — six evidence kinds |
| **when it happens** | Is "the moment" really several smaller moments back to back? | the moment feels instantaneous but is actually a short process | notice something odd → try for a good look or recording → check it against memory → give up, or log it as unknown |
| **who's really there** | Is one label ("the birdwatcher", "the customer") hiding several different people with different needs? | your "one person" (Task 2) still feels like it covers two different kinds of person | the casual feeder-watcher · the competitive lister chasing a rare bird · someone filling in a survey for a conservation group |
| **why it's hard** | What is actually stopping them, today, without your help? | you don't yet know *why* the current situation fails | no signal · doesn't know the local species · looks just like two other species · only had it in view for two seconds |
| **what goes wrong today** | The different ways the unhelped situation currently plays out. | there's already a workaround people use, and it's failing in visible ways | gives up and logs nothing · guesses and logs a wrong species · posts to a forum and never gets an answer |
| **where it happens** | Does the setting change what's even possible? | context — location, tools at hand, who's nearby — swings the answer | alone in a marsh at dawn · on a guided walk with an expert three feet away · at the kitchen window with full signal |

Notice that "what they have" and "why it's hard" are **two different, both valid**
ways of describing the same bird-ID gap. One gives you six evidence kinds; the
other gives you a shorter list of obstacles. Neither is the "correct" one — pick
whichever produces the cleaner, more distinct list, because that's the one you
can actually build against.

**If two angles both click, you don't have one messy gap — you have two real
ones.** Don't merge them into one giant grid; that's usually how "add bird ID"
turns into a spreadsheet nobody can act on. Write both down, pick whichever
matters more right now, and run Tasks 5–18 on that one. The angle you set aside
isn't lost — it's a written list, so coming back to it later is its own short
pass through Phase A, not starting over.

> **Task 5 — Say how pieces fit together.**
> Do two answers stack up, or does one rule out the other? Here they **stack**:
> knowing what it sounded like *and* where you were narrows things further than
> either alone.
> **Done when:** you can say "stacks", "excludes", or "splits it up" and give one
> example.
> **Trap:** skipping this because it's obvious. It's the thing that decides
> whether two shipped features quietly contradict each other on the same screen.

> **Task 6 — Write the test, before anyone has a favourite.**
> What must a proposal do to count? Two parts: **what it has to achieve** (here:
> *narrow down what the bird could be, using evidence the person actually has*)
> and **the hard constraint** (here: *works with no phone signal — a marsh at
> dawn has no bars*).
> **Done when:** it's written down and nobody has proposed anything yet.
> **Trap:** writing it after the favourite exists. It will fit the favourite. You
> won't notice, and neither will anyone else.

> **Task 7 — Write the kill line.**
> One sentence: *what result would tell us this whole picture is wrong?* Here:
> *re-run it on real sightings with the location and date removed — if the
> suggestions don't change, then "where" and "when" were never really doing
> anything, and the coverage we're claiming is fiction.*
> **Done when:** someone could actually go and run it.
> **Trap:** "if users don't like it." That's not a result, it's a mood. If you
> can't write this line, don't start — a plan with no way to be wrong will
> survive any evidence at all.

### Checkpoint — write the list, and read out what isn't ticked

You now have everything you need to do the one thing this whole method is for.

**Write the parts down as a list. Tick the ones you already cover. Read the
unticked ones out loud.**

```
what a birdwatcher has, when they can't name the bird

  ✓  what they saw          → photo ID
  ✓  what they heard        → sound ID
  ☐  where they were
  ☐  what time of year
  ☐  what the bird was doing
  ☐  how long they had
```

That's it. That's the checkpoint. Four unticked boxes, each with a name — and
suddenly the photo-versus-sound argument from §1 looks like what it was: two
people arguing about which box to tick first, in a room where nobody had written
the list.

**The list is the finding.** Not a score, not a percentage. If someone needs a
number you can say "two of six", but the number is the boring part. The useful
part is that *where they were* and *what the bird was doing* are now written down
as things, sitting there, waiting for someone to pick them up.

**And it's the test of whether you actually did Task 4.** If you can't write this
list, you don't have a gap yet — you have a topic. That's not a failure of the
session; it's the session's result, and it's a much better place to stop than one
step further on, having chosen something.

The same list in a completely different situation, so the shape is visible:

```
what we need to know about a candidate, before we can decide

  ✓  can they do the technical work    → the exercise
  ✓  have they done it at this scale   → the résumé conversation
  ✓  will they work well with the team → the panel
  ☐  how do they handle disagreement
  ☐  can they explain their work to someone outside the team
```

Two unticked, both named, both obviously addressable — and neither of them was
going to come up on its own, because the three ticked ones already felt like a
thorough process.

**Two things people reasonably ask here.**

*"The boxes aren't equally important."* Correct, and the list isn't claiming they
are. It's an inventory, not a ranking. Which unticked box is worth doing is a
judgement you still have to make — see §11. What the list prevents is making that
judgement without ever having seen the options.

*"Our thing doesn't come apart into a list."* It usually does, once you stop
looking for the parts in the *solution* and look for them in the *situation*. Not
"how many features" — how many **kinds of moment**, **kinds of evidence**,
**steps in the process**, **reasons people give**, **stages of the journey**. If
you genuinely can't find the parts, that is the finding: you don't yet know what
you're looking at, which is worth far more than a plan built on top of not
knowing.

### Phase B — fill it (Tasks 8–12)

> **Task 8 — Name the fake subject, and park it.**
> There's usually one thing everyone mentions that isn't actually a thing you can
> build: **"the ID engine."** Also "the model", "the platform", "our data
> layer". It fits into every sentence, which is exactly why it's useless — it
> connects to every idea and distinguishes between none of them.
> **Done when:** it's named on the board with a line through it, and *the fact
> that you parked it is written down*.
> **Trap:** quietly dropping it. It comes back next quarter with a new name and
> another quarter attached to it. **Test:** does it mostly appear in sentences
> that are describing other things? Then it's how you talk about the work, not
> the work.

> **Task 9 — Fan out, in silence, from one source only.**
> Everyone writes proposals for the gap from Task 2–4. Start with the source
> you already have: **what people have already told you.** Support mail, the
> "unidentified" entries in people's own lists, the blurry photos, the recordings
> nobody used, the forum posts that start "small brown thing, marsh, Tuesday."
> **Done when:** every proposal is written down and **not one has been
> discussed.**
> **Trap:** clustering, dot-voting, or "ooh, building on that." All three collapse
> the options early — which is the same mistake as arguing photo-versus-sound,
> just with sticky notes.

> **Task 10 — Judge them one at a time, against Task 6.**
> Each proposal, on its own, against the test — not against the other proposals.
> Three possible outcomes, and only three:
>
> | outcome | means | example |
> |---|---|---|
> | **passes** | meets the test; say who or what vouches for it | *sound ID* — uses what they heard, runs on the phone, works with no signal |
> | **fails** | doesn't meet the test; **say which part it failed** | *ask the community* — doesn't help the person standing there now; it hands the question to someone else, later, with signal |
> | **can't tell** | you looked, and nothing settled it | *a step-by-step questionnaire* — nobody knows whether someone holding binoculars will tap through six questions, because it's never been offered |
>
> **Done when:** every proposal has one of the three, and the failures name the
> clause they failed.
> **Trap:** turning "can't tell" into "no". They are completely different, and the
> difference matters more than almost anything else here — see §5.

> **Task 11 — Mark the coverage and name the hole.**
> Put what passed onto the ground from Task 4. Count it. Then **name what's left
> over, with its size**.
> **Done when:** the list from the Checkpoint is ticked, and you can read the
> unticked lines out loud — here: *what the bird was doing*, and *how long they
> had*.
> **Trap:** writing "gaps remain". A hole with a name and a size is a piece of
> work. "Gaps remain" is a shrug.

> **Task 12 — If it's still short, change source and go again.**
> You've used up what people already told you. Say so out loud — *"this source is
> spent"* — write it down, and move to the next one:
> **what someone else already knows** (how other apps solved it, an expert
> interviewed *for this specific gap*, published work, a standards body). Then, and
> only then: **what you invent**.
> **Done when:** the coverage number moved, or you've reached the last source.
> **Trap:** jumping straight to inventing. It's the most fun and the least
> reliable, and once someone has invented something they defend it as though it
> came from evidence. See §4.

### Phase C — check the gap itself (Tasks 13–15)

> **Task 13 — Look for the three signs you drew the gap wrong.**
> Not errors — findings. Any of these means the *description* is off, not the
> proposals:
>
> | sign | what you'd see |
> |---|---|
> | **it's aimed at the wrong people** | something that passed turns out to be used mostly by people outside the moment you described — here, sound ID used mostly by people who *already knew* the bird and wanted confirmation |
> | **it's throwing away answers unread** | proposals were ruled out by the boundary alone, without anyone considering them — and the gap is *still* not filled. If your rules keep rejecting things while the problem stays open, the rules are doing the deciding |
> | **it looks full but something won't fit** | you're holding something that clearly belongs and there's nowhere to put it — which means your units are too coarse |
>
> **Done when:** you've checked all three and said which, if any, fired.
> **Trap:** treating these as bad news. The third one, especially, is the most
> valuable thing a session can produce.

> **Task 14 — If a sign fired, redraw the gap.**
> Rewrite the description. **Keep what already passed** — it's still true. And
> **un-reject anything that was rejected only by the boundary you just changed**;
> those proposals never got a fair hearing.
> **Done when:** the new description is written, the survivors carry over, and the
> un-rejected ones are back on the board.
> **Trap:** quietly widening the boundary to fit whatever you want to build.
> Redrawing is a decision you announce and record, not a thing that happens by
> itself while nobody's looking.

> **Task 15 — Write the questions that would settle it, in order.**
> The gap tells you what to go and find out. The order matters, because rooms
> reliably reach for the slowest one first:
>
> 1. **Place what you already have.** Something passed and you can't say exactly
>    where it sits. Here: *"'what's likely here, now' passed — does that cover
>    location only, or location and season?"* One afternoon with data you already
>    hold, and the coverage number changes.
> 2. **Fill the hole.** *"Who helps with what the bird was doing?"* This is the
>    one that genuinely needs new research — and it now arrives with a size on it
>    instead of as "let's do more discovery."
> 3. **Re-ask what came back blank.** Weakest and last. Somewhere that already
>    told you nothing is the least likely place to get an answer.
>
> **Done when:** the list exists, in that order.
> **Trap:** commissioning the expensive research first. It's the most impressive
> thing to announce and the least efficient thing to do.

### Phase D — commit, and leave a way back (Tasks 16–18)

> **Task 16 — Give each survivor a standing.**
> Three, and they mean different things — see §6 for the full version:
> **hunch** (real, unnamed, not yet describable) · **candidate** (passed the test,
> provisional, has a witness) · **commitment** (it holds on its own, fits the rest
> of the product, and can be given up).
> **Done when:** every survivor has one, written down.
> **Trap:** putting hunches on the roadmap. A hunch with a date on it is a
> question with a deadline.

> **Task 17 — Check the three gates before calling anything committed.**
> All three, none implied by the others:
> **(a)** coverage is stated — either it's covered, or the hole is named with its
> size; "we didn't check" doesn't count.
> **(b)** the decision to commit came from somewhere other than where the idea
> came from — the people who invented it don't get to be the ones who certify it.
> **(c)** it actually fits with everything else, tested, not assumed.
> **Done when:** all three are ticked, or you can say which one is blocking.
> **Trap:** (c). Here it's the live one: photo ID and the "likely here, now"
> shortlist have never been checked together, and if the shortlist is applied
> *after* the photo model instead of feeding into it, one screen shows a
> birdwatcher two different answers.

> **Task 18 — Write the route back.**
> What would make you stop doing this? Here: *a bird's range shifts, the "likely
> here now" list becomes wrong for a whole region, sound ID's accuracy falls below
> the bar it claimed — and it gets pulled, with the reason recorded.*
> **Done when:** the condition is written down beside the commitment.
> **Trap:** treating this as pessimism. **A commitment you can't undo isn't a
> commitment, it's an inheritance** — and a roadmap that can only grow is one
> nobody can ever fix.

---

## 4. Where your ideas actually come from — and why it matters

Three sources. Use them **in this order**, and only move on when the one above is
genuinely used up.

| source | what it gives you | on this ask |
|---|---|---|
| **1 · what people already told you** | things already true, that you haven't read yet | The "unidentified" entries. Support mail describing a bird in words. Blurry photos, unused recordings, the "small brown thing, marsh, Tuesday" posts. |
| **2 · what someone else already knows** | things true elsewhere, that you can go and get | How other apps solved this. A birding records committee's own criteria. Published work on sound recognition. An expert interviewed *for this gap*, not in general. |
| **3 · what you invent** | things nobody has said yet — supplied by you | "What if the app could watch through the binoculars." Nobody asked for this. You're proposing it. |

**Source 3 is last, and it's the only one that can produce something nobody has
evidence for. That's not a reason to ban it — it's a reason to label it.**

An idea from source 1 and an idea from source 3 are both ideas, and they are not
the same kind of thing. Writing down which source each came from means nobody has
to guess later, and nobody can quietly promote a hunch into a finding.

This is the single most useful habit here. Most rooms start inventing about three
minutes in, because inventing is more enjoyable than reading support mail — and
then defend the invention as though it came from the evidence.

---

## 5. "We don't know yet" is not "no"

The most common way this goes wrong, and the easiest to fix.

When a proposal comes back **can't tell**, there is enormous pressure to file it
as a no. It feels tidier. It clears the board. And it's a mistake, because the two
mean opposite things:

- **fails** = we checked, and it doesn't do the job.
- **can't tell** = we don't have what we'd need to check.

The first is a fact about the proposal. The second is a fact about *you*. Filing
the second as the first means you've decided against something on the basis of
your own ignorance, and written it down as though it were evidence.

Keep them apart. "Can't tell" isn't a failure — it's a question, and Task 15 tells
you where in the queue it goes. (Last, usually. But last isn't gone.)

---

## 6. From hunch, to something real, to something you'd defend

Three standings a thing can have. They are **not** stages on a calendar — they're
what you currently believe, and belief moves both ways. Something can lose its
standing when you learn more, and it should: the whole point of writing the
standing down is that it can change.

### hunch

Something real that you can't describe yet. Here: people keep logging
"unidentified" and writing in about birds they couldn't name — and nobody can yet
say what they were actually missing.

**To become a candidate:** the gap is described (Tasks 1–7), the kill line exists,
and at least one proposal is on the board with its source noted.
**Not allowed yet:** a spot on the roadmap. A hunch with a date attached is a
question with a deadline.

### candidate

Something that passed the test, with a witness. Here: **sound ID, behind a flag,
covering exactly one kind of evidence, with a stated accuracy bar.** Still
provisional. Still droppable. The record says which source it came from and what
it covers.

**To become a commitment:** all three gates from Task 17.

### commitment

It stands on its own *and* it's part of the whole: other things can use it, people
can find it without asking whoever built it, and **there's a stated way to give it
up** (Task 18).

> **hunch:** people keep logging "unidentified" and we can't say what they needed.
> **candidate:** sound ID is there provisionally, we know what it covers and who
> vouched for it.
> **commitment:** it holds up, it works with the rest, and we know what would make
> us drop it.

### One more standing to watch for: the fake subject

Before any of the three, check for the thing that isn't a thing at all — "the ID
engine", "the platform", "the pipeline". It sounds like a candidate. It can't be
one, because it doesn't do anything specific enough to test. That's Task 8, and
it comes first for a reason: a fake subject can absorb an entire quarter and leave
everyone able to describe progress.

---

## 7. Or, work backwards: what can your thing *already* do?

A complementary move, useful when the gap-filling has stalled.

Instead of asking what people want, list the **kinds of action** your product lets
someone take — not what it's about, but what it lets a person *do*. Distinguish
one thing from another. Relate two things. Judge whether something holds. Notice
what's missing. Then look for the kinds it can't do at all.

**When you find one, three very different things could be going on**, and telling
them apart is the entire value:

| what you found | what it actually is | what to do |
|---|---|---|
| **you already have it** | the capability exists, nobody knows | Here: the app already builds a location-filtered shortlist inside its search screen, and the ID team has never heard of it. **Check this first, every single time** — it's the cheapest possible fix, and it's more common than anyone expects. |
| **you genuinely can't** | there's no way to do this at all | Here: nothing in the product can take *what the bird was doing* as input — no field, no capture, no vocabulary. **This is the feature idea**, and you got to it by working rather than brainstorming. |
| **you asked the wrong question** | the gap is in the question | "We can't do sound" was really "we can't do sound *offline*." Suspect your own question before you suspect the product. |

**How to earn the middle row:** say in advance what would be impossible if the gap
were real — *"if we truly can't do this, then X should be impossible; let's go
look"* — and then go look. Without that, "we can't do this" is usually the first
row wearing a disguise.

**And the limit worth saying out loud:** even a complete list of what you *can* do
says nothing about whether you do any of it *well*. Being consistent with yourself
is much weaker than being right about the world. That's what the kill line in
Task 7 is for — it's the only part of this that reaches outside the room.

---

## 8. The bird-ID example, start to finish

The tasks, actually run.

**Tasks 1–7.** The ask, written down: Priya's photo ID and Marcus's sound ID,
both pushed hard, neither one backed yet by a gap description. The moment: a
birdwatcher at a sighting who can't name the bird — not someone logging a bird
they already know, not someone looking it up at home that evening. Out: a
course, a forum, a field-guide upsell. The ground: six kinds of evidence.
Pieces stack. The test: *narrows down what the bird could be, using evidence
the person actually has* — and works with no signal. The kill line: strip the
location and date, and see if the answers change.

**Checkpoint.** The list goes on the wall: six lines, two ticked, four not —
and the four unticked ones get read out loud, with Priya and Marcus both in
the room. *Where they were. What time of year. What the bird was doing. How
long they had.* First time anyone at Fieldmark has seen them written down as
things.

**Task 8.** "The ID engine" named and parked, in writing.

**Task 9.** Silent fan-out from what people already told you: photo ID, sound
ID, a step-by-step questionnaire, a "likely here, now" shortlist, a
side-by-side comparison of two similar species, ask the community. Nothing
discussed — Priya and Marcus each write proposals alongside everyone else,
including ones that aren't their own.

**Task 10.** Photo ID **passes** (what they saw, runs on the phone). Sound ID
**passes, with a catch nobody had checked for**: Marcus's model is trained on
birdsong, and roughly a third of the real recordings Fieldmark users upload
are calls and chip-notes — shorter, less distinctive, and the model is far
less confident on them. "Likely here, now" **passes** (where and when, using
data already on the device). Ask the community **fails** — it doesn't help the
person standing there. The questionnaire is **can't tell**. The side-by-side
comparison **fails on the boundary alone**: it needs a shortlist to compare
*from*, and nothing produces one yet.

**Task 11.** Four of six — up from the two the original argument would have
shipped. Uncovered: what the bird was doing, and how long they had. Every
birdwatcher knows the hovering-then-diving bird and the two-second flyover, and
nothing on the board touches either.

**Task 15.** Place "likely here, now" (an afternoon; changes the number) → find
someone who helps with behaviour (real research, now sized) → revisit the
questionnaire (last).

**Task 13, and this is the good part.** Someone writes in about the sighting
they most wanted help with: a bird through a telescope at 400 metres in flat
light. Shape and movement only. No colour, no photo possible.

*What they saw* is one of the six kinds, so this isn't outside the gap. It's
the third sign: **it looks full but something won't fit.** A bird at arm's
length on a feeder and a silhouette at 400 metres are not the same evidence,
and photo ID handles exactly one of them. **The units were too coarse.**

**Task 14.** Redraw: split "what they saw" into *seen well* and *seen poorly*.
Coverage honestly drops to four of seven. The side-by-side comparison comes
back onto the board, because the boundary that rejected it just changed.

**Tasks 16–18.** Sound ID is a **candidate**, and so is photo ID — but "bird
ID" as a whole is **not a commitment yet**, and gate (c) is doing the
blocking, twice over. First: nobody has checked that photo ID and the "likely
here, now" shortlist agree — a Willow Flycatcher and an Alder Flycatcher look
identical and only reliably separate by song, so a user who photographs one
gets a photo-ID answer and a shortlist answer that quietly disagree, and
neither was built to notice. Second, and this is Task 10's catch coming due:
Marcus's model is strongest on song, and the shortlist's own location data
shows a third of Fieldmark's users are near the coast, where people report far
more calls than song. **Sound ID's accuracy claim doesn't hold evenly across
the userbase it's about to ship to.** Both go down as the condition, not
shipped past.

**What the session produced.** Not a cleverer idea than anyone had: *one
proposal rejected for a stated reason*, *one named hole with a size*, *one
cheap question that moves the number*, *one wrong assumption caught before
anything was built*, *one accuracy claim that turned out to depend on where a
user stood*, and *one conflict that would otherwise have shipped and become a
bug report.* None of it was in the one-line ask, and none of it required Priya
or Marcus to be smarter than they already were — it required someone to write
down what they already knew before either of them got to defend it.

---

## 9. Proof it isn't about birds: the same thing, in a clinic

A check that none of this is about birds — or about software.

**The ask:** "the clinic's booking app should reduce missed appointments."

- **The moment (2):** one patient, with one appointment booked, who doesn't turn up
  and didn't cancel.
- **Out (3):** a policy change, a staffing change, a poster in reception.
- **The ground (4):** the time between booking and appointment. **Units: hours
  before the appointment.**
- **Fitting (5):** contacts stack — a reminder and a confirmation can both happen.
  Changes to the appointment itself exclude each other.
- **The test (6):** it must say which hours-before window it acts in, and the
  clinic must already be able to do it.
- **The kill line (7):** don't do it for a random half — if missed appointments
  fall the same either way, this whole picture is wrong.

**Fan-out (9):** a text at 24 hours, a text at 2 hours, one-tap confirm, one-tap
reschedule, filling the slot from a waiting list.

**Judging (10):** the waiting list **fails** — it doesn't change whether *this*
patient turns up, it changes what happens after they don't. A genuinely good idea,
rejected by the test rather than by anyone's taste. Structurally the same refusal
*ask the community* got in the birding run, in a completely different world.

**Then two signs fire (13).** *Throwing away answers unread:* help with transport,
help with childcare, an explanation of what the appointment involves — all excluded
by the boundary, none of them ever actually considered, and the problem is still
there. The window between booking and appointment was the wrong ground. *Looks full
but something won't fit:* the 24-hour reminder appears to "cover" the window, and
nobody can say which hours it actually works in. The units were too coarse — **the
same finding the 400-metre bird produced**, in a place with no birds in it.

Both are Task 14: redraw wider and finer, keep what passed, put back what the old
boundary excluded.

---

## 10. Why you'll go around more than once

Three loops, not one straight line. Each one is triggered by a different kind
of surprise, and each one costs more than the one before it — which is exactly
why you check the cheap one first.

**Loop 1 — inside Phase B: change source, try again (Task 12).**
Fires when: what you've fanned out so far doesn't cover the ground. Costs: one
more silent fan-out, from the next source down the list. Nothing about the gap
description changes — you're just drawing from a different well. Here: sound
ID and photo ID both came from what people already told you (source 1);
coverage was still two of six, so the room moved to source 2 — how other
birding apps and field-guide publishers had solved this — before anyone was
allowed to invent anything.

**Loop 2 — back to Phase A: redraw the gap (Tasks 13–14).**
Fires when: one of the three signs in Task 13 goes off — something's aimed at
the wrong people, real answers are being rejected unread, or something
obviously belongs and there's nowhere to put it. Costs: rewriting the ground
itself, which reopens every proposal that was rejected only by the old
boundary. Here: two months after sound ID shipped, Priya was reading the usage
data and it came back wrong in an informative way — most people running it
already *knew* the bird and were using it to confirm, not to identify. That's
sign one, word for word.
The gap wasn't "birdwatchers can't name birds" — it was narrower:
*birdwatchers who've never seen this species before, in the field, alone.*
Redrawn, two of the six evidence kinds from Task 4 turned out not to matter at
that narrower moment — and a proposal parked back in Task 10, "ask the
community," got un-rejected, because it had only failed the old, wider
boundary.

**Loop 3 — back to Task 1: the ask itself was wrong (Task 18, and beyond).**
Fires when: the world moves, not the room. A commitment holds up fine against
everything you tested it against, and then the ground it was standing on
shifts anyway. Here, from Task 18: a bird's range moves, and "likely here,
now" is quietly wrong for a whole region. This loop costs the most, because
nobody in the room did anything wrong — the commitment simply stopped being
true. It's why Task 18 makes you write the give-up condition *before* you need
it: this loop doesn't announce itself as a bug. It shows up as a support
ticket, eighteen months later, from someone standing in a marsh with a wrong
answer on their screen.

**The rule that makes this safe rather than exhausting: a loop only ever
reopens what it actually touched.** Loop 1 never rewrites the gap. Loop 2
rewrites the gap but keeps every proposal that already passed — Task 14 says
so directly: *keep what already passed.* Nobody re-does Phase D because Phase
B found one more source.

**And one more thing worth knowing before you're in it:** if a fix changes an
answer somewhere in the middle without changing what actually ships, it isn't
a fix — it means the same mistake is sitting in more than one place, and
you're not done looking yet.

**Deciding to commit is a different meeting, on a different day, with different
people in it.** That isn't bureaucracy: it's gate (b) of Task 17, and it's the
one rule here that people break without noticing.

---

## 11. What this won't do for you — said plainly

- **It won't rank things.** It produces standings and named holes. Whether
  behaviour matters more than duration, given what each costs, is a judgement you
  still have to make. No method makes it for you.
- **It won't give you a score.** Passes / fails / can't tell stay separate on
  purpose. Collapsing them into a number is exactly where the information goes.
- **It won't tell you if you're right.** Everything here checks whether you're
  consistent with your own description. A room can be perfectly consistent and
  completely wrong about the world. Only Task 7's kill line reaches outside the
  room — which is why you don't start without it.

---

## 12. If you remember one page of this

**Describe the gap first (Tasks 1–7).** The ask, word for word · the moment (one
person, one occasion) · what's out · the ground *and its countable units* · how
pieces fit · the test, written before anyone has a favourite · and the kill line.

**What you're aiming for:** a list of the parts, ticked where you cover them —
and you can read the unticked ones out loud, by name. If you can't write the list,
that's the session's finding.

**Fill it (8–12).** Park the fake subject. Fan out in silence from what people
already told you. Judge one at a time against the test. Count. Change source only
when the one you're on is used up.

**Three outcomes only:** passes (with a witness) · fails (name which part) ·
**can't tell — which is not a no**.

**Three signs you drew the gap wrong (13):** it's aimed at the wrong people · it's
rejecting answers unread while the problem stays open · it looks full but
something won't fit.

**Three questions, in order (15):** place what you already have → fill the hole →
re-ask what came back blank.

**Three standings (16):** hunch → candidate → commitment. And a route back (18) —
a commitment you can't undo isn't a commitment.

**Two rules that carry the rest:** every idea gets written down before any idea
gets discussed · the people who invented it don't get to be the people who certify
it.

---

## Appendix — the formal names

This is a plain-language version of a method that has a more formal vocabulary.
If you meet it in that form, here's the mapping. You don't need any of this to run
the tasks.

| plain | formal |
|---|---|
| the moment | the **slot** (NUL) |
| one person, one occasion | the **anchor** (SIG) |
| what kind of thing counts | **admits** (INS) |
| the ground, and its units | the **extent** (SEG) |
| what it has to achieve | the **relation** (CON) |
| how pieces fit together | the **composition** (SYN) |
| how many pieces | the **cardinality** (DEF) |
| the test | the **admission** (EVA) |
| what would change our mind | **reopens on** (REC) |
| the kill line | the **perturbation** — `broken:` |
| the three sources | the **stance ladder** — extraction, cultivation, encounter |
| passes / fails / can't tell | **testimony** / **refused** / **undetermined** |
| hunch → candidate → commitment | **emanon** → **protogon** → **holon** |
| the fake subject | an **apparatus** |
| redraw the gap | **re-zero** — concede, or revise and supersede |

The nine questions aren't a list someone assembled from experience. They're the
nine operators of a closed algebra of acts, across three domains (what exists, how
things are structured, how they're judged) and three grains (the background, a
single difference against it, a repeating pattern). That's why there are exactly
nine, and why they group the way they do — but the tasks work whether or not you
ever look at that.
