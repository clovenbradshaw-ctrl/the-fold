# 3.4 — Turns and Memory

<!-- nav:start -->
[← 3.3 — A Guided Tour of the Organs](303-a-guided-tour-of-the-organs.md) · [Contents](000-index.md) · [3.5 — Refusal as an Answer →](305-refusal-as-an-answer.md)
<!-- nav:end -->











**Why this matters:** Chapter 1.1 said a ground gets rebuilt fresh every
time — never kept as a permanent fixture. So how does this system have a
conversation at all, across separate turns, without either dragging along
a pile of everything that ever happened, or forgetting everything the
moment a turn ends? This chapter is the answer, and it's a genuinely small
one.

## Not a history. A single handoff.

When one turn of reading finishes, it doesn't hand the next turn a
transcript of everything that happened. It hands over one small thing,
called a **register**: essentially, the closing warmth of the ground it
ended with, plus the specific choice of comparison method it used to get
there. The next turn opens with exactly that — not a summary, not a log,
just the same small package a fresh ground would need to pick up where the
last one left off, by identity, the same way one region inside a single
reading already opens with the region right before it.

That's the entire mechanism. No accumulating pile of history to re-read, no
growing burden as a conversation goes on. Just a small, constant-sized
object passed from one turn to the next.

## What this earns, and what it still can't promise

Because turns now hand off a register, the system can tell the difference
between a turn that's a genuine continuation and one that's opening cold —
a turn that received nothing simply says so, rather than quietly pretending
to be a continuation it isn't. That's a real, earned guarantee: *this*
engine now holds a sequence, locally, at the boundary between one turn and
the next.

What it still can't do is vouch for the thing one level up: whether this
was truly the very first reading anyone ever did, with nothing coming
before it at all. The engine has no way to know that a caller didn't
already read something earlier through some other channel entirely — that
question belongs to whoever's actually running the sequence of turns, not
to the engine measuring any one of them. This isn't a loose end left
lying around by accident. It's the same discipline from Chapter 3.2, run
on the conversation itself: the engine will tell you honestly what it can
verify about its own sequence, and will not quietly claim more than that.

## Two fields that already chose small handoffs over full history

Web architecture solved a related problem the same way. HTTP, the
protocol underneath most of the web, is deliberately **stateless** — a
server isn't required to remember anything about a previous request on its
own — and the practice that grew up around that constraint is to pass a
small token (a session ID, a cookie) forward instead, letting the *client*
carry continuity rather than making the server accumulate a growing
history of every past interaction. The register this chapter describes is
the same trade: a small, constant-sized handoff instead of an
ever-growing log the engine would have to keep re-reading.

Cognitive psychology draws a related line inside human memory itself.
Alan Baddeley's working-memory model (developed from the 1970s onward)
treats the small amount you're actively holding onto right now as
functionally distinct from the vast, separately-organized store of
long-term memory — a deliberately narrow, bounded workspace, not a
window onto everything you've ever experienced. The register is closer to
this project's version of working memory than to a full transcript: small
on purpose, refreshed every turn, never itself the archive.

Neither parallel is exact. HTTP's statelessness is a protocol-level
convenience that says nothing about cognition, and working memory is a
claim about human brains, not turn-taking software. What both share with
this chapter's register is the same underlying bet: continuity doesn't
require carrying the whole past forward, only a small enough piece of it
that the next step can pick up correctly.

## Why this avoids Chapter 3.3's watching problem

You might notice this sounds close to `frame`'s job from the last chapter —
keeping a trail — and wonder if handing a register between turns is
secretly the same self-watching regress `frame` refused to build. It isn't,
and the reason is precise: the register is one single closing number plus
one declared choice, never a rollup of everything that happened. It doesn't
accumulate, and it never gets fed back into a ground it was itself computed
from. It's a handoff, not a growing ledger — which is exactly what keeps
this small enough to avoid becoming the regress `frame` already refused to
build.

**Where this comes from:** `eoreader6/SEED.md`, Amendment IX, "Firstness,
partially earned: the turn holds a sequence" — *"`runTurn` now receives a
`register`... and hands its own back, so the engine holds the sequence
locally at the turn boundary... What is still not earned is the enforcement
that a genuinely-first ground is *received* — the engine cannot know that
the caller read nothing before... the register is one closing scalar plus a declared choice, never a rollup of the trail."* The HTTP-statelessness and
working-memory connections above are this book's own added links to web
architecture and cognitive psychology, not something the codebase itself
cites.

<!-- anchors:start -->

---

**Byte anchors** (generated — `node scripts/anchor-quotes.mjs`, verified by `--verify`; sources and their provenance in `sources/MANIFEST.json`). Each anchor is the UTF-8 byte range of the quoted words in the snapshot the manifest names:

- “Firstness, partially earned: the turn holds a sequence” → `eoreader6/SEED.md#b31582-31636`
- “`runTurn` now receives a `register`... and hands its…” → `eoreader6/SEED.md#b31888-31921`, `eoreader6/SEED.md#b32025-32110`, `eoreader6/SEED.md#b32714-32864`, `eoreader6/SEED.md#b32935-33021`

<!-- anchors:end -->

<!-- nav:start -->
[← 3.3 — A Guided Tour of the Organs](303-a-guided-tour-of-the-organs.md) · [Contents](000-index.md) · [3.5 — Refusal as an Answer →](305-refusal-as-an-answer.md)
<!-- nav:end -->
