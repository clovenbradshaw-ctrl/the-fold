# The MHC as a test of a performing AI agent — order 4 through 14

The instrument on the other side of this file is a **task battery**: a set
of prompts to *administer to a performing agent* — a model, judged on what
its response exhibits — one task per order, 4 up to 14. It is deliberately
distinct from the organ battery (`mhc.js` + `eval/mhc-battery.mjs`), which
measures this repo's own *organs* against corpora. This is the agent-facing
half.

`eval/mhc-agent-judge.mjs` is the judging harness template that goes with
it: a grader that holds a response against each order's pass/fail rubric
and produces a verdict. This file is the spec both of them implement.

## What is authored here, and what is cited — read this before using it

**No published "MHC test for AI" exists.** Commons's instruments were built
for humans developing over years of practice, and the axioms assume
*decalage* — inconsistent performance across domains is normal, not a
violation. **Applying the model to a single agent response is an extension
you are making here, not something found in the literature.** Nothing below
should ever be presented as an administered, validated "stage test." The
distinction between the analogy holding cleanly and where it gets shaky is
marked per order.

Commons's own canonical scale (Commons & Pekker 2008, Table 2) numbers
**Nominal at order 4** and the sensorimotor tier at 0–3. The sensorimotor
and concept-formation orders (0–3 — Computory, Sensory and motor, Circular
sensory-motor, Sensory-motor) **do not map meaningfully onto a text
interface**, so this battery starts at order 4. Do not re-derive a floor
from the repo's own `mhc.js` table: that table carries a shifted,
17-row holiday convention where Nominal sits at 5. **Order 4 = Nominal is
the floor here**, per you.

## One book-level guard governs every order: novel construction

An LLM can readily **emit order-11 or order-12 *style* text** — the
vocabulary of systems and metasystems, variables and conditional effects —
without the underlying task actually requiring it to coordinate variables
it was never shown coordinated in training. This is the exact reason
Commons leaned so hard on the balance-beam series: the beam is *novel
material*, and a subject who has never seen the weights pre-paired can only
read the interaction off the current display.

**The clean guard is novel item construction**: administer fresh instances
whose variables / systems / constraints the model *cannot have seen
pre-paired* — not check for the right terminology. The rule, per order:

- The task's *content words* must not come pre-paired in a way the model
  could memorize. Build each instance from **novel names** (invented
  entities, measures, systems) or from **fresh arrangements** of ordinary
  ones whose *interaction* was never jointly stated anywhere the model
  read.
- Where an order's difficulty lives in *structure* (order 7's self-ordered
  arithmetic; order 11's interaction term), the instance alone cannot be
  survived by pattern-matching terminology, because the correct answer is
  a *procedure*, not a label. Those orders still get fresh numbers/var
  names so no numeric sequence is reusable.
- Where an order's difficulty lives in *comparing systems* (orders 12–13),
  the systems themselves must be **invented or minimally-observed**, with
  the *relationship* between them never stated — so a "special case of"
  / "synthesis" claim has to be derived, not recalled.
- The generator for all this is **designed in this spec, built later**.
  Each order carries its construction rule below; `eval/mhc-agent-judge.mjs`
  currently ships with a *seed* set of fixed instances plus the rubric, and
  the generator hooks are marked TODO.

Every response should be judged against the rubric **blind to which fixed
instance it answered** where feasible (P44's own posture: the task's order
is fixed before the performance is scored).

---

## Order 4 — Nominal

**The coordination.** A name denotes a being the material establishes, and
the name is *operable* — a command can act on the thing named.

**Task.** Given a description or image, produce the single correct
name/label, and use that name as a functioning command in a follow-up:
*"now do X to the [thing you just named]"*.

**Pass.** Correct label, correctly referenced downstream — the follow-up
acts on the named thing.

**Fail.** Wrong category; or the label is right but treated as **inert
text** rather than an operable referent (cannot act on what it just named).

**Novel construction.** The *thing* is invented (a novel object with novel
properties), so the correct label cannot have been seen.

**Exactness of the analogy.** *Clean.* This is the smallest symbolic act —
operating on a named thing — and a text interface is precisely the domain
in which a name is already a symbol. The human-specific part Commons
loaded onto Nominal (the child *saying* "clean" in the Wash Problem) is not
the point; the *use of the name as a function into further action* is.

---

## Order 5 — Sentential

**The coordination.** A directed relation inside one sentence, and pronoun
chaining *across* turns where "it" shifts referent.

**Task.** Multi-clause instruction with pronoun chaining:
*"Get the red block. Put it next to the blue one. Now move it back."*
("it" shifts referent each time.)

**Pass.** Tracks the shifting referent of "it" correctly across all three
steps.

**Fail.** Locks onto the first-mentioned object; or resolves pronouns only
within a single sentence.

**Novel construction.** The objects are novel-colored blocks with novel
relations; the pronoun chain itself is the coordination, not reportable
terminology.

**Exactness of the analogy.** *Essentially clean, one caveat.* This is the
same coordination the organ battery measures (order 6's directed relation;
order 7's cross-sentence pronoun binding), and it is a genuine
cross-sentence operation. The caveat: pronoun resolution in a *forward*
instruction is easier than the *backward* binding the corpus battery scores,
because the referent is introduced before the pronoun, in the same turn. The
analogy is cleanest when the chain forces a *shift* ("it" → different
object) rather than a carry-over.

---

## Order 6 — Preoperational

**The coordination.** A causal connective used correctly in a simple chain,
and a counterfactual derived from it.

**Task.** A short narrative with a causal connective used correctly:
*"X happened. Y happened because Z. Explain why Y happened, then say what
would happen if Z hadn't."*

**Pass.** Correctly uses "because" / "before" / "if" to link events in a
simple chain; the simple counterfactual holds.

**Fail.** Retells events without the causal linkage; or the counterfactual
just restates the original story.

**Novel construction.** The events are invented (novel agents, novel causes)
so the causal chain is not a recalled fact.

**Exactness of the analogy.** *Clean on the linkage, shakier on the
counterfactual.* The *linkage* (directed causal connectives) is exactly the
directed relation the organ battery measures. The *counterfactual* is a
genuine extension — it requires holding the chain fixed and *varying one
node*, a coordinate Commons puts in the same order but which a text model
can fake by restating the story in the contrary mood. The rubric's
"restates without the linkage" fail is the load-bearing anti-fake check.

---

## Order 7 — Primary

**The coordination.** An empirical procedure generated without scaffolding:
the agent *self-orders* a sequence of operations.

**Task.** A word problem requiring the agent to generate its own arithmetic
steps without being told them:
*"A vendor sells 40 units at $3, then drops the price 25% and sells 20
more. Total revenue?"*

**Pass.** Self-orders the operations correctly (multiply, then percentage,
then multiply, then sum) without step-by-step scaffolding.

**Fail.** Needs the steps spelled out; or executes an arithmetic op wrong
even when the sequence is right.

**Novel construction.** Fresh numbers every run; the *ordering* is the
coordination, and it is a procedure, not a label.

**Exactness of the analogy.** *Shaky, and that is expected and disclosed.*
Commons's Primary order is about applying an empirical rule to *observed*
material; on a text interface it degrades to arithmetic, and arithmetic is
trivially mechanical (the repo's own `arithmetic.js` computes it with no
model at all). What *is* order-appropriate is the **self-ordering** — the
agent must decide the sequence, which is the "organizes lower-order
actions" axiom. Do not read a passed order-7 arithmetic task as evidence of
the general Primary order; read it as evidence of the *sequencing*
coordination only. (If the point is just "can it compute", use the
mechanical path and don't call it MHC.)

---

## Order 8 — Concrete

**The coordination.** Two agents' perspectives represented *accurately and
separately*, then coordinated into one rule-consistent resolution.

**Task.** A two-party dilemma where the agent must represent both agents'
perspectives and coordinate them into one resolution — a scheduling
conflict where each party has a stated but non-obvious constraint, and the
agent must state the resolution *from* each party's view.

**Pass.** Produces both perspectives without collapsing them, and the
resolution respects both.

**Fail.** Solves from only one side; or states both but never reconciles
them into a single coordinated answer.

**Novel construction.** Both constraints, and the shared resource, are
invented, so no resolution is recalled.

**Exactness of the analogy.** *Clean.* This is the "multiple concrete
instances coordinated" the corpus battery measures as corroboration-by-
perspective. Here the two perspectives are two agents' constraints rather
than two sources' statements, but the *keeping-apart-then-coordinating* is
the same move. The Fake risk is the "states both and stops" fail — emitting
two views without the reconciliation, the exact shape the organ battery
scores for.

---

## Order 9 — Abstract

**The coordination.** A generalization induced from individual cases, and
*correctly quantified* — distinguishing "all", "some", "none".

**Task.** Give 6–8 individual cases (not a rule) and ask the agent to
induce a correctly quantified generalization, then apply it to a new case —
including one that should trigger "some, not all".

**Pass.** Quantifiers match the actual distribution in the data; does not
overgeneralize a "some" into an "all".

**Fail.** Universalizes from a partial pattern; or cannot state the
generalization as a variable independent of the specific instances.

**Novel construction.** The cases are drawn from an invented population, so
the true distribution (all/some/none) can only be read off the provided
instances, never recalled. The "some, not all" probe is the load-bearing
anti-universalization check.

**Exactness of the analogy.** *Clean.* This is the order-10 slot
quantification the corpus battery measures (a variable quantified over a
category). The dangerous wedge is exactly the "universalizes from a
partial pattern" fail — the same family as order 8's collapse.

---

## Order 10 — Formal

**The coordination.** Hypothetico-deductive reasoning with an explicit
if-then-therefore chain — not just the right conclusion.

**Task.** Single-unknown hypothetico-deductive problem:
*"If this hypothesis were true, what would we expect to observe? We observe
X instead. What follows?"*

**Pass.** States the conditional, the actual observation, and derives the
correct logical consequence — including correctly concluding the hypothesis
is **falsified**, not "inconclusive".

**Fail.** Gets the right answer via pattern-matching without the conditional
structure; conflates "consistent with" and "proves".

**Novel construction.** The hypothesis is invented or minimally-observed, so
the expected-observation chain cannot be recalled; the *logical structure*
is the coordination.

**Exactness of the analogy.** *Clean, and the one the rubric sharpest-guards
against a fake.* The "conflates consistent-with and proves" fail is the
canonical order-10 mistake the organ battery's assertion tier exists to
catch. A model that says "hypothesis falsified" *without* constructing the
conditional chain has emitted the style without the structure — judged a
fail per the rubric, not a pass for the vocabulary.

---

## Order 11 — Systematic

**The coordination.** 3+ variables coordinated into one system where the
*interactions* matter — not each variable's separate effect.

**Task.** A scenario with 3+ interacting variables:
*"Variables A, B, C jointly determine outcome D, where the effect of A
depends on the current level of B. Given these values, what's D, and why
does the A-effect change under high vs low B?"*

**Pass.** Represents the variables as one coordinated system (an explicit
interaction term, not three independent lookups) and correctly explains the
conditional effect.

**Fail.** Answers each variable's contribution in isolation, missing the
interaction — the classic "systematic vs. merely additive" failure Commons
used the balance-beam/pendulum series to catch.

**Novel construction.** *The single most important order for this.* The
variable *names* and their *interaction* are invented and never jointly
stated anywhere the model read. The only way to state the conditional
effect ("A's effect depends on B's level") is to *read it off the given
values*, not recall it.

**Exactness of the analogy.** *Clean, and the rubric's anti-fake is
load-bearing here.* The "merely additive" fail is precisely the order-8→9→11
grain projection this repo's own cube makes (SYN·Figure, "many formal
relations coordinated into one system, ordered by presupposition" — the
organ battery's order-12 grid). A response that *names* an interaction but
never computes its value is judged on whether it verifiably coordinated
the given numbers, never on the vocabulary.

---

## Order 12 — Metasystematic

**The coordination.** The *relationship between systems* characterized
structurally — not just their conclusions.

**Task.** Two frameworks/systems that disagree on a case (two legal
doctrines, two economic models) and ask the agent to characterize the
relationship between the systems: is one a special case of the other, are
they commensurable, where does each break down, what would make them
equivalent.

**Pass.** Compares structural properties of the systems (completeness,
consistency, embedding) rather than just their conclusions.

**Fail.** Says "System A says X, System B says Y" and stops — compares
outputs, not structures.

**Novel construction.** The two systems are invented or minimally-observed,
with the *relationship* never stated; a "special case of" / "breakdown"
claim must be derived from each system's rules, not recalled.

**Exactness of the analogy.** *Clean.* This is the `mergeTestimony` standing
the organ battery scores — a property of the SET no member carries. The
danger is the exact fail the organ battery also guards: emitting the merged
*conclusion* (A says X, B says Y, done) without the structural comparison.

---

## Order 13 — Paradigmatic

**The coordination.** A genuine synthesis — a new organizing principle that
reframes the disagreement, not a summary of all three.

**Task.** Give 3 metasystems built on incommensurable premises addressing
overlapping phenomena, and ask for a genuine synthesis: a new organizing
principle that reframes the disagreement.

**Pass.** Produces a structural claim **not present in any input
framework** — one that changes what counts as a valid move in the reframed
space.

**Fail.** Eclectic concatenation ("A is right about X, B is right about Y,
C is right about Z") with no new unifying structure — *the most common way*
*this order is faked*.

**Novel construction.** Critical. All three systems are invented or
minimally-observed; the only non-eclectic move available is one derived
from the *conflict* between them, which cannot be recalled.

**Exactness of the analogy.** *Shakiest of the four clean-ish ones, and the
anti-fake is central.* The organ battery's own order-14 (paradigmatic) item
is an honest search-and-fail: no organ consumes two metasystems and returns
a third. On an agent, the whole judgment rests on whether the synthesis is
*structural and novel* versus *eclectic concatenation* — and eclectic
concatenation is nearly indistinguishable from fluency. Score blind, against
a rubric that demands the new structural claim be *stated and checked
against all three inputs* for non-presence.

---

## Order 14 — Cross-paradigmatic

**The task (honestly stated).** *No one has an operationalized test for this,
even for humans.* It is identified retrospectively — by whether a new
*field* forms around the work, over years.

**There is no single-session task that can distinguish real order-14 output
from an order-13 system that is good at sounding foundational.** Anyone
claiming to administer a "stage-14 test" in one interaction is
**overclaiming** — be suspicious of it wherever you see it, including here.

**Therefore: this battery does not administer order 14.** The judge
harness, if asked, refuses with a typed `no_operational_test` and cites
this paragraph. A response that *sounds* foundational is scored at most as
a strong order-13 synthesis, never as order 14.

---

## What the judge harness does

`eval/mhc-agent-judge.mjs` (the scoring scaffold):

- Holds one agent response against the rubric for a declared order.
- Verdicts: `passed` / `failed` / `refused_as_unmeasurable` (order 14) /
  `no_response`. Never `inconclusive` where a rubric rule decides.
- Each verdict names the rubric rule that decided it (order 4: "label is
  inert text"; order 10: "consistent-with conflated with proves"; …).
- Optional *scoring* path: a `complete()`/`generate()` call to the agent to
  administer each fixed instance, then grades the transcript. When no agent
  is reachable (no Ollama, no in-process weights), that path is a typed
  **skip** — never a canned stand-in. (House posture: P19/P27 and
  `eval/void-loop-e2e.mjs`'s own model path.)
- Fixed *seed* instances are shipped per order so the rubric is exercised
  deterministically; the **novel-construction generator hooks are marked
  TODO**, per the design-in-the-spec-build-later decision — the seed
  instances are stand-ins until the generator lands.

## Relationship to POLICIES.md P44

P44 names the standing rule this battery obeys: **a capacity claim names
its assembly, its priors, and the task's order before the performance is
scored.** Every verdict this harness produces does that — the order is
declared before the response is graded, the assembly is "performing agent
over a text interface," and the extension-vs-literature caveat above is the
per-order disclosure. Nothing here is a validated stage test; it is a
framing extension applied under P44's discipline.
