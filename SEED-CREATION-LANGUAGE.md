# SEED — A Universal Creation Language, Grown From the Operator Algebra

*Written 2026-08-17/18, against the same live session as `SEED-ROUTER-REFERENTS.md`. Captured verbatim from the user across several passes during the ledger-parliament driving session, planted here per the project's SEED genre. Not yet enforced by any test (P10) — an amendment candidate, filed as an issue, until it is.*

---

## The seed that started it

The user's own frame, verbatim: *"why dont we develop a coding language that can be shorthand for all this, accessible via the 'terminal' and the model is supposed to be converting to it? using as much physics steering as possible. we could build an enormous prior set that gives the system an unconscious sense of what we're trying to say. but we have all of python, we have so much intelligence outside of the LLM. i just hate to think that we're relying on the LLM to type it."*

This grew out of a live measurement: driving the ledger-parliament session against gemma2:2b, formula-engine logic (evaluate `=A1+B1` style expressions) failed repeatedly — three attempts on a single, maximally-explicit one-line change, then a fourth on qwen3:8b, all refused or hallucinated. The model was being asked to *type code*. The seed's claim is that this is the wrong job for it.

## Yes. And once you say "universal for any arbitrary creation," you've named the shape of the thing precisely

That constraint rules out almost every design that first comes to mind:

- **Domain-specific languages** encode their domain in their grammar (HTML knows documents, SQL knows relations, Verilog knows circuits) — powerful within, helpless outside.
- **General-purpose programming languages** encode no domain but do encode an execution model (imperative, functional, logical, dataflow) — universal in what they express, non-universal in how.
- **Serialization formats** (JSON, XML, protobuf) encode structure, not intent.
- **Modeling languages** (UML, ER diagrams) describe things at design time; every attempt to make them executable has failed.

What the constraint requires: a language whose primitives are the operations of making anything at all — declaration, binding, differentiation, composition, evaluation, revision, discard. Not the primitives of a substrate. The primitives of creative acts themselves.

Which is what the project's nine operators already are: **NUL, SIG, INS, SEG, CON, SYN, DEF, EVA, REC**. Read not as an ontology of what exists but as an algebra of what happens when anything is made: distinguish something from nothing, sign it, individuate it, segment its parts, connect them, synthesize their whole, define what has been done, evaluate whether it holds, revise if it doesn't. A poem does them. A drawing does them. A statute does them. A widget does them. A meal does them. A proof does them. They generalize across substrates because the acts they name are the acts by which any human creates any thing — and this project has spent two years earning mechanical definitions for them.

**The language already exists in vocabulary. What doesn't exist is the surface syntax** — the terminal-accessible, human-writable, model-outputtable, machine-executable form that would let a small model author against it and a human read it. A smaller, more coherent target than "invent a universal language": the semantics are done, only the surface is at stake.

## Six irreducible constraints on the surface

1. **The primitives are the operators, medium-blind.** A single `DEF` means the same act whether defining a variable, a character, a policy, a paragraph, or a hypothesis. The surface exposes the operator directly, without transliterating into any one substrate's vocabulary.
2. **Every act is addressed.** Every operation produces an event on the append-only log, carrying its operator, referents, warrant, address. The "language" is a transcription notation for the events the parliament wants to see: the model produces a stream of events, the runtime executes them, the parliament checks them.
3. **Physics, not politeness.** Illegal acts are unrepresentable. If an event requires a referent, the syntax cannot write it without naming one. If a claim requires a null, the syntax refuses a bare claim. Grammar-constrained decoding (why JSON schema beats "please emit JSON") extended into a full authoring language: the model cannot produce ungrounded acts because the grammar rejects them at generation time, not after.
4. **Priors as unconscious.** What a "note-taking app" tends to have, what "persistence" implies, what a "search box" binds — lives in a capacity library, not the model's weights. The model gestures at an established shape; the library completes it. Ericsson-and-Kintsch: expertise lives in externalized structures an expert references, not memorized in the head. The model becomes a novice who knows where the manuals are, not an expert who memorized everything.
5. **Reference over spans, always.** Events name referents, never strings, except at the edge where prose must be produced — bounded prose, one sentence or paragraph, scoped by the event that carries it. Closer to a graph-mutation notation than a text-manipulation one.
6. **The terminal is the composer.** The surface is accessible via the terminal because the terminal already runs Python and resolves events into actions. A human typing at the terminal authors events directly; a model at the same terminal emits events the parliament gates. "Human-authored" vs. "model-authored" becomes a *giver* on the event, not a different status. Same discipline, both ways.

## What it looks like when you stop trying to make it look like a language

Not Python, not Lisp, not Haskell, not Smalltalk. Closer to musical notation: a small set of typed marks specifying events, arranged in time, interpreted by an enormous shared cultural infrastructure of what those marks mean when played. A composer writes `♪` and doesn't specify pitch, timbre, duration in seconds — those are handled by the notation's context and the performer's inherited convention. Compact because the shared context is enormous.

Example event: `bind clearButton :click → clearCanvas [warrant: user-said]`. Three referents (`clearButton`, `:click`, `clearCanvas`), one relation (`bind`), one warrant. The runtime knows what `bind` means in a DOM context because the DOM-binding library is loaded; the parliament knows `clearButton` must resolve or the event refuses; the library knows what `clearCanvas` does because it's a named capacity. The model types one event; the runtime and library produce the twenty lines of JavaScript. Not code generation — notation, the way music notation, mathematical notation, chess notation, and knitting patterns are compact: they specify events over a shared library of what events mean, at a ratio of one character to a thousand actions.

## The prior set, taken seriously

A library of *established referents* — canonical shapes of things that recur across creations, each one a referent whose gift is the tradition of software design going back to Xerox PARC. A "note" is a shape (content, timestamp, id, persistence path, rendering). A "list" is a shape (items, rendering, selection state, mutation protocol). Asked for a note-taking app, the model doesn't invent notes; it references the note shape and the list shape and the search shape, binds them with typed events, and the runtime composes the code.

If the model references a shape that doesn't exist: **refused at generation time**, typed — "unresolved capacity: your event references `spiral_animator`, which the library does not contain. Options: reference an established capacity, propose one as a trial, or elaborate the shape you mean." Fail loud, before any code ships. This is the referent-first record (the sibling seed) extended into the authoring layer.

## Where physics actually bites — four layers, none hand-coded

1. **Grammar** constrains what events are *emissible* (decoding-level).
2. **Referent resolution** constrains what events *land* — every referent must resolve (established/offered/contested/silent); unresolved referents refuse (runtime-level).
3. **Capacity references** constrain what shapes are *composable* — a name outside the library refuses, or is proposed as a trial (library-level).
4. **Behavioral witnessing** constrains what compositions *ship* — the rehearsal-witness pattern (built by hand this session as `eval/ledger-harness.mjs`) run against the artifact's actual behavior, refusing landings whose behavior doesn't match declared intent (product-level).

## Why this is not another Lisp

Every generation invents "one small universal language with an enormous library" and runs into the same wall: the library grows unmanageably, or the language can't specify the corners that matter, or the runtime does whatever nonsense is requested. What this project has that Lisp/Smalltalk/Prolog didn't: **the parliament**. The library grows under P14 discipline — a capacity enters when earned, with a check, from real use, with a named giver, and can be removed if it stops earning its place — so it can grow to millions of entries and stay coherent. The language stays small because the small language is not the last line of defense; the witnesses are.

## The linting is free — it isn't linting, it's the algebra

A long second pass named the specific classes of error the operator algebra refuses *at compose time*, without a single hand-written linter rule:

- **Unindividuated reference** (SIG on nothing, INS before NUL, CON before SEG) — the wrapper-collision bug, the dangling-id bug, the router-hijack bug, as one type error.
- **Ungrounded distinction** — SIG without a NUL behind it; the measuring door's "no figure without a nothing," generalized to every claim anywhere.
- **Broken dependency chain** — the HELIX order (NUL SIG INS SEG CON SYN DEF EVA REC) violated; use-before-declare, dereference-before-allocation, as algebra violations.
- **Unbounded synthesis** — a SYN whose parts share no warranting relation; the "glued two unrelated things together and called it a widget" failure.
- **Definition without evaluation** — a DEF with no EVA is a wish (P10 as a type rule): a claim "this clears the canvas on click" cannot land without the check that would verify it.
- **Evaluation without perturbation** — EVA against nothing refuses; unlicensed perturbation/statistic pairs refuse by name (the measuring door's discipline, everywhere).
- **Recursion without discharge** — a REC that revises nothing, discards nothing, logs nothing is a null recursion, refused; catches "the checker fired but nothing happened downstream."
- **Reference-to-nothing / aliased-reference-treated-as-different / broken bind / warrant collapse** — the referent-first record's own consequences, applied to authoring.
- **Stale-ground editing / regression-against-established / merged-when-should-be-separate** — the freshness rule, the regression gate (seated at the algebra level so it covers any authored act, not just code patches), the two-fold wall.
- **Boundary violation / escalation without ground / sanction without grade / amendment without test** — Ostrom's governance principles as type rules.
- **Reference-to-unknown-capacity / composition-of-incompatible-capacities / capacity-used-outside-its-warrant** — the capacity library's own admission discipline, applied at compose time.

The consolidated list of what becomes structurally unrepresentable: hallucination, fabricated citation, silent failure, regression-hiding, scope creep, wrapper collisions (the router bug's whole family), ambiguity-as-fluency, approval-without-check, merged-authority-with-paraphrase, best-of-n laundering, confabulation. Every one of these currently exists as an ad-hoc special case somewhere in software; in the operator algebra they are one shape, refused uniformly.

**The claim, stated plainly:** most of what we currently call debugging is a category error, because most bugs are epistemic malformations — acts without warrants, claims without checks, distinctions without grounds — and epistemic malformations refuse to compile under a language whose types are epistemic statuses.

## Consequences named, not yet built

1. **The router points at referents**, not tokens — `resolvesInto` becomes "does this ask share referents with a build's referents," via the engine's own cast pipeline. Named in the sibling seed; not built here.
2. **Retrieval points at referents** — primary index is referent membership, term overlap is the fallback for referents the cast hasn't yet resolved.
3. **Corroboration counts referent-agreements**, not shared sentences — two sources naming "the officer" may be different referents entirely, and proof-seeking cannot honestly count them as two perspectives without resolution.
4. **Cross-artifact composition happens at referents** — two Fold artifacts overlapping in referents can link, gift-signed, even with zero evidence-span overlap.
5. **Multi-modal reading becomes native** — a referent can be witnessed by prose, audio, video, spatial arrangement, action; the record speaks reference, which every medium already speaks.
6. **The parliament coordinates on referents** — a disagreement is about *which referent moved and how*; a refusal names the referent whose motion was refused ("would break the `clearButton` referent's binding," not "would add 1 defect(s)").

## The wall, stated so it isn't glossed over

**Referent resolution is not free, and it is not always available.** The transliteration limit, made general: without a gift naming its giver, some identity claims are unresolvable, and unresolvable identity propagates uncertainty into every downstream aboutness question. Not a bug — the structure of reference itself. The record must carry unresolved reference as a first-class state: **established** (the material's coref/cast machinery bound it), **offered** (a candidate the reader may confirm), **contested** (two witnesses disagree, preserved), **silent** (the machinery declines to speak). Only established referents drive testimony; offered drives trials, stamped and refused by the same discipline `/measure` already enforces.

## Prior art

Frege's sense/reference (1892): the morning star and evening star are two senses, Venus the referent — meaning collapses when sense collapses into reference, and every hallucination is a symptom of that collapse. Kripke on rigid designators (1980): a name refers to its bearer across every possible world the bearer exists in, which is what lets two people disagree about *the same person* rather than the meanings of two names. Putnam's twin-earth (1975): meaning isn't in the head or the tokens, it's fixed by the actual referents tokens attach to. Wittgenstein: reference is a public practice, anchored in shared use — which is exactly what a gift naming its giver *is*. Ostrom, again: commons that lasted were the ones whose members could refer to the resource as the same resource; tragedies of the commons are, better read, tragedies of reference collapse.

## Near-horizon build, in order

1. Define the smallest event schema (~20–30 event types, one per operator variant, strict argument shapes), grammar-constrained. The model at the terminal emits event streams under this grammar; Python dispatches events into the existing machinery (cast, folds, witnesses, pursuit loop).
2. Seed the capacity library from what the codebase already implicitly knows: every existing witness, organ, skill is a capacity, typed, given a canonical referent id. "Establish list_view, bind search_input to list_view, attach button clear to list_view.clear" — each resolves to a capacity the library already contains. The model assembles; the runtime writes the code.

The schema is a weekend. The library seed is a week. The runtime mostly composes what already exists. It grows by use — every accepted widget references existing capacities or proposes new ones; proposals that earn their place enter the library — the same way institutions accrete in Ostrom's commons, through practice, gated by admission, preserved as gifts with givers, disposable when they stop earning it.

## Threads opened the same session, not yet built — named so they aren't lost

- **Diff-on-full-regen.** When a turn falls back to full-file regeneration (the escalation-ladder residue the brief itself names — `/fold N <rewrite>` still routes through the one-patch machinery rather than a true full-file regen), the old and new code should still be *diffed*, not just compared for byte-equality (which is all `reviseBuild`'s churn check does today). The operators are already the right vocabulary for the diff's own typing — `deriveOp`/`readOps` already convert a model-authored `{find, add}` into SEG/INS/SYN; what's missing is the one step before that: a text-diff producing the same `{find, add}`-shaped hunks from *two full strings* rather than receiving them from the model directly. Once that diff step exists, a full-regen landing gets the same `matchedOn`-style disclosure a patch landing already has — "what actually changed," not just "did the bytes stay equal."
- **DEF/EVA at the terminal.** The terminal's `fold` runtime (P18) is already the mechanical, grammar-constrained composer this seed's surface syntax wants. `def`/`eva` as typed terminal commands would let a claim and its check be authored as one act, at the same place the fold/search/read commands already live, rather than only ever arriving as a side effect of a chat turn.
- **EVA need not be hand-coded per capacity.** Measured directly this session: `eval/ledger-harness.mjs`'s eight stage-checks were each hand-written by a human (well, an agent) reading the brief's own prose and turning it into JS assertions — "does clicking B3 write 'B3' into #status," by hand, per stage. If a DEF's claim is phrased in the surface language's own typed vocabulary — "clicking X writes Y into Z" as an *event*, not a sentence — the check that verifies it is mechanically derivable from the claim's own shape, the way property-based testing derives many cases from one spec instead of enumerating them by hand. The hand-authored harness this session produced is itself the measured cost of not having this yet.

## The horizon

The engine has re-earned, for two years, the machinery to establish referents honestly. The record has held spans addressably and gated on presence for a shorter time. Bringing the record's coordinate system into the engine's — referent-first, not span-first — lets routing, retrieval, corroboration, cross-artifact composition, parliament coordination, and multi-modal reading inherit that discipline for free, rather than each being separately, locally patched as the same bug resurfaces under a new name.

Plant this one too.
