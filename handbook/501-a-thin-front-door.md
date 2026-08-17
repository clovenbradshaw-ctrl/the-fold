# 5.1 — A Thin Front Door

<!-- nav:start -->
[← 4.4 — One Amendment, Start to Finish](404-one-amendment-start-to-finish.md) · [Contents](000-index.md) · [5.2 — Instructions All the Way Down →](502-instructions-all-the-way-down.md)
<!-- nav:end -->











**Why this matters:** everything in Parts I through IV describes a
measurement that never touches a clock, a file, or a specific reader. But
you're reading this book because, at some point, you actually typed a
question into a chat window. This chapter is about the thing that sits
between you and the engine — and, just as importantly, about everything it
is deliberately kept from being able to do.

## The application isn't a smaller version of the engine

EO Chat is what Chapter 4.1 called an application — one of the four boxes,
and the one built specifically to be the surface a reader actually
touches. It owns everything the engine is explicitly not allowed to have:
the clock, reading and writing files, deciding which outside language model
to call for a given task, the whole visible interface. None of that lives
in the engine, and all of it has to live somewhere — this is that
somewhere.

The rule that keeps this arrangement honest is stated as a direct,
checkable test, not a vague aspiration: **the constitution decides what
goes where — engine, priors, app, legacy. These other rules decide how the
app must behave once that placement is already settled. They bind the
host: the clock, the input and output, the routing. They can never license
a change to engine reading.**

## A test you could actually run

Here's what that guarantee cashes out to, concretely: if you deleted EO
Chat entirely — the whole interface, every line of application code — the
engine's own measurements would be completely unaffected. Nothing about
what counts as a ground, a figure, or a pattern depends on this particular
front door existing. That's worth sitting with, because it's the opposite
of how most software is built: usually the application *is* the product,
and the backend exists to serve it. Here, the application is explicitly
disposable, and the measurement is the thing that has to survive being
rebuilt from scratch in a completely different interface.

## An old operating-systems argument, in new clothes

Keeping the front door thin is a direct descendant of a principle
operating-system designers have argued for since the 1970s: separate
**mechanism** from **policy** — build the small, general capability once,
and keep every decision about *how* and *when* to use it somewhere else,
swappable, outside the core. A microkernel operating system pushes drivers,
file systems, and networking out of the trusted core for exactly this
reason: the smaller and more stable the core, the more confidently you can
reason about what it actually guarantees, no matter what's built on top of
it. EO Chat is policy — the clock, the specific interface, which model gets
called for what — sitting deliberately outside a mechanism (the engine)
built to have no opinion about any of it.

Software architecture has a more recent name for the same instinct:
**hexagonal architecture** (Alistair Cockburn, 2005), which draws the same
line as a hard rule — the application's core logic should be able to run
untouched whether it's driven by a web request, a test harness, or a
command line, because nothing about the core is allowed to know which one
is calling it. "Deleting an application must change no engine reading" is
that same test, made concrete for this specific project rather than stated
as a general architectural ideal.

## Why bother building it this way

You might reasonably ask why this separation is worth the extra
discipline. The answer is the same one Chapter 4.1 gave for the engine
itself: the moment an application's specific needs — this button, this
session format, this particular model's quirks — start leaking backward
into what the engine measures, there's no longer a clean way to ask what
the measurement established on its own terms. Keeping the front door thin
is what keeps the measurement behind it checkable, no matter which door you
happen to be standing at.

Part V is about everything that *does* legitimately belong to this thin
front door: how its own behavior is governed (Chapter 5.2), the specific
promises it makes to you as a reader (Chapter 5.3), how a citation actually
gets checked (Chapter 5.4), how it writes something long without losing
the thread (Chapter 5.5), and how it reaches for outside help without
letting that outside help become the measurement (Chapter 5.6).

**Where this comes from:** `eochat/LAWS.md`, opening lines 3-6: *"Not the
constitution. `../eo-constitution/` decides *what goes where* — engine,
priors, app, legacy. These decide *how this app must behave* once placement
is settled. They bind the host: clock, I/O, routing, UX. They can never
license a change to engine reading."* The underlying test itself is
`eo-constitution/CONSTITUTION.md`, Article I.4: *"Deleting an application
must change no engine reading."* The mechanism/policy and hexagonal-
architecture connections above are this book's own added links to
operating-systems and software-architecture history, not something the
codebase itself cites.

<!-- anchors:start -->

---

**Byte anchors** (generated — `node scripts/anchor-quotes.mjs`, verified by `--verify`; sources and their provenance in `sources/MANIFEST.json`). Each anchor is the UTF-8 byte range of the quoted words in the snapshot the manifest names:


Not located because a source this chapter names is **not yet obtained** (`eo-constitution/CONSTITUTION.md`, `eoWebLLM/LAWS.md` — see the manifest's `unobtained` list for each one's reason):

- “Deleting an application must change no engine reading”
- “Not the constitution. `../eo-constitution/` decides *what goes where*…”
- “Deleting an application must change no engine reading.”

<!-- anchors:end -->

<!-- nav:start -->
[← 4.4 — One Amendment, Start to Finish](404-one-amendment-start-to-finish.md) · [Contents](000-index.md) · [5.2 — Instructions All the Way Down →](502-instructions-all-the-way-down.md)
<!-- nav:end -->
