# 2.2 — The Order Things Happen In

<!-- nav:start -->
[← 2.1 — Nine Verbs](201-nine-verbs.md) · [Contents](000-index.md) · [2.3 — Nine Kinds of "Where" →](203-nine-kinds-of-where.md)
<!-- nav:end -->











**Why this matters:** the nine verbs in Chapter 2.1 aren't interchangeable
building blocks you can call in any sequence. Some of them can only happen
after others already have. Understanding that ordering is what will let you
read an organ description in Part III and immediately see why it's built
the way it is, instead of it looking like an arbitrary pipeline.

## You already know the ordering — it's ground, figure, pattern

Chapter 1.1 through 1.3 taught you a sequence, not a menu: a ground gets
built first, a figure can only be identified against a ground that already
exists, and a pattern can only be claimed once a figure has actually earned
it by moving what comes next. That sequence has a name in this system's own
vocabulary — **grain**, with three values: **Ground, Figure, Pattern** — and
it turns out to be a second axis, sitting right alongside the modes and
domains from Chapter 2.1, that every single one of the nine verbs also has
to respect.

Practically, that means: a Figure-grain act is only meaningful once its
Ground-grain act has actually happened, and a Pattern-grain act is only
meaningful once a Figure has earned its way there. You can't skip a step
and still mean the same thing — a "pattern" computed without a real ground
underneath it isn't a shortcut, it's a different, unsupported claim wearing
the same word.

## The ordering applies between verbs too, not just within one

Here's the part that's easy to miss: it isn't only "ground before figure
before pattern" *inside* a single verb's own act. Some verbs structurally
depend on other verbs having already run. The clearest real example: the
organ that finds relationships between things (Chapter 2.1's `CON`, which
you'll meet properly as the binding organ in Part III) does not work on raw
material at all. It works on an **entity register** — a record of things
that have already been *admitted*, meaning they already passed Chapter
1.3's witness gate. You cannot ask whether two things co-occur more than
chance would predict until something has already established that both of
those things exist as things worth tracking in the first place. Connecting
comes after admitting. There's no way to run it the other way around and
have the result mean anything.

## A discipline computer science already leans on hard

The rule "you cannot use something before it's been established" is a
load-bearing idea in programming language design too, under a different
name: a **dependency graph**, or more specifically a topological
ordering — the same discipline that stops a spreadsheet from letting one
cell's formula depend on a value that depends right back on it, or stops
a compiler from letting code reference a variable declared later in the
file. Modern "dependently typed" programming languages generalize this
further, requiring that a *type* itself only reference values that were
already established earlier in the same proof — you can't build a claim
about something before you've built the something. This project's grain
axis (Ground, then Figure, then Pattern) and its cross-verb dependency
(admission before binding) are the same shape of rule, applied to acts of
reading rather than to lines of code.

The two fields part ways on what enforces the rule. A type checker or a
build system rejects a violation at compile time, mechanically, before the
program ever runs. This project's ordering is enforced by what the organs
actually operate *on* — the binding organ simply has nothing to read until
an entity register exists — rather than by a separate checking pass
sitting outside the mechanism. The effect is the same (an out-of-order act
can't produce a meaningful result); the enforcement is built into the
material itself rather than bolted on as a separate validator.

## A framework outside computing that landed on the same shape

Developmental psychology has its own version of "a higher order only means
something once a lower one is in place," arrived at for entirely different
reasons. Michael Commons, Francis Richards, and Patrice Kuhn's Model of
Hierarchical Complexity (1982, extending Piaget) scores the complexity of
a task by three axioms: a higher-order action must be **defined in terms
of** actions at the next order down, must **organize** those lower-order
actions, and must do so **non-arbitrarily** — producing an outcome the
lower order alone couldn't reach. That third axiom is doing the same work
as this chapter's own rule: you can't get a pattern by chaining figures
together any old way, only by a figure genuinely earning pattern-status
against what comes next. The model also insists its stages are quantal — a
task is at a given order or it isn't, no partial credit — and a later
psychometric study (Commons et al., 2014) found real, empirically
measurable gaps between the orders, not a smooth continuum.

This project doesn't build on that model, and the resemblance was
noticed, not planned: a different, later generation of this project's
own notes name the Model of Hierarchical Complexity explicitly as a
**convergent** framework — independently derived, mathematically
grounded, arriving at structural conclusions about how action gets
organized that parallel this project's own grain axis, without either
one having been built from the other. Two unrelated attempts to formalize
"this level of structure has to be built out of, and non-arbitrarily
organize, the level below it" landing on the same shape is worth noting
as exactly that: a convergence, not a shared ancestry.

## Why this matters more than it looks like it should

It would be easy to read this as a boring implementation detail — of
course you build things in some order, every system does. What makes it
worth a whole chapter is what it rules out: a system that let you connect
things that hadn't been admitted yet, or claim a pattern from a figure that
never earned it, wouldn't just be sloppy — it would be reporting something
with no ground underneath it, which Chapter 1.3 already told you this
system refuses to do by construction. The ordering isn't a scheduling
convenience. It's the same discipline from Part I, restated as a rule about
*which acts are even allowed to depend on which other acts* — the guarantee
that by the time anything gets said out loud, everything underneath it
actually happened in an order that makes the claim mean something.

**Where this comes from:** the grain axis (Ground, Figure, Pattern) as one
of the cube's three axes, alongside mode and domain, is set out in
`eoreader6/CUBE.md`, lines 19-21 — *"`GRAINS` is the triad from `SEED.md`.
It is the same three terms; the seed's unit is one axis of this
instrument."* The binding-organ dependency is from `eoreader6/SEED.md`,
Amendment X: *"The binding organ ... reads an entity register — arrival
indices of beings already admitted through the witness gate."* The
dependency-graph and dependent-typing connections above are this book's
own added links to programming language theory, not something the
codebase itself cites. The Model of Hierarchical Complexity connection is
drawn from `eoreader4.2/docs/eo-wiki.md`, "Model of Hierarchical
Complexity (Commons)" — a related but separate generation's own notes,
which name the convergence themselves rather than this book asserting it
from outside.

<!-- anchors:start -->

---

**Byte anchors** (generated — `node scripts/anchor-quotes.mjs`, verified by `--verify`; sources and their provenance in `sources/MANIFEST.json`). Each anchor is the UTF-8 byte range of the quoted words in the snapshot the manifest names:

- “`GRAINS` is the triad from `SEED.md`. It is…” → `eoreader6/CUBE.md#b943-1054`
- “The binding organ ... reads an entity register…” → `eoreader6/SEED.md#b33689-33785`

Not located because a source this chapter names is **not yet obtained** (`eoreader4.2/docs/eo-wiki.md` — see the manifest's `unobtained` list for each one's reason):

- “ground before figure before pattern”
- “you cannot use something before it's been established”
- “a higher order only means something once a…”
- “this level of structure has to be built…”
- “Model of Hierarchical Complexity (Commons)”

<!-- anchors:end -->

<!-- nav:start -->
[← 2.1 — Nine Verbs](201-nine-verbs.md) · [Contents](000-index.md) · [2.3 — Nine Kinds of "Where" →](203-nine-kinds-of-where.md)
<!-- nav:end -->
