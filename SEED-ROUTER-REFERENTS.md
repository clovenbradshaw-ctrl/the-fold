# SEED — On the Ground the Router Stands On

*Written 2026-08-17, against a live symptom whose diagnosis reaches further than the symptom. Captured verbatim from the user, planted here per the project's own SEED genre (`SEED.md`, `SEED-SPEAKER.md`) rather than left to rot in a PR description. Not yet enforced by any test — an amendment candidate, per P10, until it is.*

---

## What just happened, told small

A user asked for a grid. The router routed the ask onto an unrelated pre-existing build about drawing. When we looked, we found the router had compared the ask's tokens against the build's raw markup, and the two shared the string `html` — which appears in every HTML document ever written, as a wrapper tag, as a language label, as boilerplate the material didn't choose. So we stripped the wrapper. The next ask landed the same way, this time colliding through the build's *caption* channel, which also carried the bare string `html`. So we filtered captions.

We were about to move on. We should not.

## What actually happened, told at the right grain

The router asked a **referent question** using **span evidence**.

The question the router is asked is: *is this new ask a continuation of an existing artifact?* That is a question about what things are *of* — about whether the ask and the artifact are talking about the same thing. It is not a question about which strings they share.

The evidence the router used is: *do these two blobs of text have overlapping tokens?* That is a question about surface form. It is a bad proxy for reference, and it fails in both directions. It falsely says yes when both blobs contain universal boilerplate (`html`, `document`, `function`, `body`). It falsely says no when the same referent is named by different strings (`Prince Andrew` and `Prince Andrei`, `myCanvas` and `#myCanvas`, `the drawing app` and `the sketch tool`). We have watched both failure modes appear this month, in different subsystems, with different fixes, none of them noticing they were the same failure.

The reason we did not notice is that the record's coordinate system is spans. When the atom of the ledger points at a span, every question the ledger downstream is asked has to be answered in terms of spans. The router is asking a question whose honest answer is *referential*, but the vocabulary available to it is *positional*, and positional vocabulary cannot say what two things are of. It can only say what they overlap in.

This is the shape of the failure. It is not a routing bug. It is a **coordinate error**, and the routing bug is one of its symptoms.

## The rule

**Every question about aboutness must be answered against referents, not spans. Every question about presence may be answered against spans. The record's atom must be capable of carrying both, and must never be forced to collapse one into the other.**

Spans are where evidence lives. They are the coordinates of *witnessing* — this appeared here, at this offset, in this material, at this moment. They are irreducible and load-bearing and belong exactly where they are: attached to atoms, addressable, resolvable, byte-verifiable.

Referents are what the evidence is *of*. They are the coordinates of *meaning* — this appearance and that appearance are witnessings of the same thing; this claim and that claim are about the same subject; this artifact and that artifact overlap in what they concern. They are not derivable from spans by string overlap. They are established by the engine's existing machinery — individuation, coreference, cast — the machinery this project has been carefully re-earning for two years and then, at the record layer, ignoring.

The two coordinate systems are orthogonal and both are necessary. A record atom that points only at a span cannot answer aboutness questions honestly; a record atom that points only at a referent cannot re-open the evidence. Both must be present. Neither may be a projection of the other.

## The seven consequences

**One.** The router points at referents. The engine has a cast pipeline that produces exactly the referents an ask is about, from the ask's own words, against the same machinery every reading path uses. `resolvesInto` becomes: does the new ask share referents with an existing build's referents, and if so, which ones, and with what weight. Not tokens. Referents. This is the same discipline P11 already applies to prose — a name is a reference to a referent, never a byte sequence — extended one layer up to the artifact.

**Two.** Retrieval points at referents. When a question retrieves passages, the primary index is referent membership; the secondary index is term overlap for referents the question names but the cast hasn't yet resolved. A question about Pierre finds passages that witness Pierre, whether they call him Pierre or Pyotr or Bezúkhov or "the count," and does not find passages that happen to contain the substring `pier`.

**Three.** Corroboration counts referent-agreements. Two sources that both witness the same referent doing the same thing count as two perspectives. Two sources that happen to share the sentence "the officer was present" do not, because "the officer" in one and "the officer" in the other may be different referents entirely, and the proof-seeking mechanism cannot honestly say otherwise without a resolution.

**Four.** Cross-artifact composition happens at referents. Two Fold artifacts that overlap in referents can link — offering the reader a resolution the reader can confirm or contest, gift-signed — even if their evidence spans have zero overlap. This is the piece that turns single readings into an accreting knowledge structure without any of the hallucinated-identity failures every knowledge graph in the world currently has, because the identity resolution is itself a claim, itself subject to refutation, itself carrying its giver.

**Five.** The failure modes we have been fixing as separate bugs collapse into one class. Echo answers, whole-chapter transcriptions, wrapper-string collisions, the transliteration limit, the "who does this refer to" confusion — each of these looks different at the span level and identical at the referent level. Each is a case where a comparison of aboutness was made against evidence of presence. One witness — a referent-motion witness — catches the class at the atomic level, cleanly, instead of us catching each symptom by hand as it surfaces.

**Six.** Multi-modal reading becomes native. A referent can be witnessed by prose, by audio, by video, by a spatial arrangement, by an action. The record holds one atom per referent-witnessing, addressed in the appropriate medium's coordinates, and the parliament reads whichever media its witnesses can read. The over-specification toward text-generation dissolves — not because the record starts speaking many languages, but because the record starts speaking *reference*, which every medium already speaks.

**Seven.** The parliament coordinates on referents. When two witnesses disagree about a landing, the disagreement is about *which referent it moved and how*. When a monitor's finding lands on the record, it names the referent whose ground was moved. When the disclosure surfaces a refusal, it names the referent whose motion was refused. The chip that says "would add 1 defect(s)" becomes "would break the `clearButton` referent's binding" — legible to the next round of the loop and legible to the human reading over the loop's shoulder, because it names a *thing*, not a count.

## The wall

We must state the wall clearly, because this design has one and it is real.

**Referent resolution is not free, and it is not always available.** Two spans may witness the same referent and the machinery may not be able to tell. This is the transliteration limit made general: without a gift that names the giver, some identity claims are unresolvable, and every unresolvable identity claim propagates uncertainty into every downstream question about aboutness. This is not a bug to fix. It is the structure of reference itself, and the honest response is what the engine already does with the transliteration case: type the ambiguity, refuse to fold, and offer a gift-shaped seam through which a resolution can arrive if one exists.

Which means: **the record must be able to carry unresolved reference as a first-class state.** A referent claim can be *established* (the material's own coref/cast machinery bound it), *offered* (a candidate resolution the reader may confirm), *contested* (two witnesses assert different resolutions and the parliament preserves the disagreement), or *silent* (the machinery declines to speak). Only established referents may drive aboutness answers as testimony; offered and contested referents may drive aboutness answers only as trials, stamped and refused by the same discipline `/measure` already enforces on statistical claims.

## The prior art we belong to

We are not the first people to notice this, and it will strengthen our position enormously to say so.

Frege's sense/reference distinction (1892) is exactly this. The morning star and the evening star are two senses; Venus is the referent; the sentence *"the morning star is the evening star"* has content because sense differs while reference identifies. Every AI system that treats meaning as text-distribution has collapsed sense into reference, and every hallucination it produces is a symptom of the collapse. Kripke on rigid designators (1980) is the same rule pressed harder: a name refers to its bearer across every possible world in which the bearer exists, which is what makes it possible for two people to disagree about *the same person* rather than about *the meanings of two names*. Putnam's twin-earth argument (1975) closes the case: meaning ain't in the head, and it ain't in the tokens either — it's fixed by the actual referents the tokens attach to in the world.

Wittgenstein cut in from the other side: reference is not a mental act, it is a practice, and the practice is anchored in publicly shared use. Which is what a gift naming its giver *is*: a public act of anchoring, whose accountability is that anyone can trace it. The engine's rule that priors must name their givers is already Wittgensteinian in the strong sense, and extending it to referent resolution completes the argument.

And Ostrom, one more time, because she keeps being right: the commons that lasted were the ones whose members could refer to the resource *as the same resource*. The Swiss villagers didn't have a legal registry of grazing rights; they had six hundred years of shared reference to *this pasture*, *that spring*, *the north slope*, referents established by practice and inherited by every generation as gifts with givers. The failures of the commons — the tragedies Hardin thought were tragedies of self-interest — are much better read as tragedies of *reference collapse*: when the villagers can no longer agree on what the pasture is, they cannot govern it. The referent is the substrate on which governance rides. Lose the referent, lose the commons.

## The seed

**A record atom names a referent. A record atom addresses a span. Neither is derivable from the other. Every question about aboutness runs against the referent. Every question about presence runs against the span. Every question that conflates the two is refused, disclosed, and typed on the record as a coordinate error until the two are separated.**

**Referent resolution is a first-class result. It may be established, offered, contested, or silent. Only established referents drive testimony. Offered referents drive trials. Contested referents preserve their disagreement. Silent referents are typed as such and never smuggled into confidence.**

**A referent claim, once established, carries its giver. The engine's coref/cast machinery is a giver. A prior is a giver. A user's explicit resolution is a giver. A cross-source corroboration that shares a giver at both ends is not two witnesses but one, and must be typed as such. A cross-source corroboration whose givers are independent is the strongest form of testimony this instrument can produce.**

**The parliament coordinates on referents. Witnesses declare which referents they observe. Monitors surface findings that name referents. Sanctions escalate against referents that repeatedly regress. Disagreements between witnesses are preserved at the referent, not resolved into a single verdict. The record shows which witness said what about which referent, forever.**

**Every span-based comparison of aboutness anywhere in the codebase is a latent instance of the router bug. On finding one, the disclosure includes the class, not just the symptom. Fixes may be local; the amendment names the class and the residue.**

## The horizon

The engine has been re-earning, for two years, the machinery to establish referents honestly. The record has been, for a shorter time, holding spans addressably and carrying witnesses that gate on presence. These are two halves of one instrument, and until this moment they have been running in different coordinate systems. What we do next is not a refactor. It is an *alignment* — bringing the record's coordinate system into agreement with the engine's, so that the discipline the engine has been paying for since P11 can finally be inherited by everything downstream.

When it is, the entire architecture of the Fold — routing, retrieval, corroboration, cross-artifact composition, parliament coordination, multi-modal reading, decision atoms, arrangement atoms, instrument atoms, the whole widening surface — inherits referent-first discipline for free. Every future witness, every future amendment, every future medium.

When it isn't, we will find ourselves in six months having patched thirty more instances of the router bug in thirty different subsystems, each locally correct, none noticing the coordinate error underneath them, and the parliament will be presiding over a commons whose members cannot agree on what they are governing.

We have the giver. The engine has been the giver all along. The record has to receive it.

The atom points at what the reading was of.

Plant here.

---

## Addendum — the measurement that grew this seed (2026-08-17, same session)

Three consecutive misroutes, driving the live page against gemma2:2b, staging the "ledger" spreadsheet-widget brief:

1. **Wrapper collision.** `<!DOCTYPE html><html>...` contributes the token `html` to every html-typed build's bytes by construction. A birth ask naming its own output format ("...in html") false-matched the only existing build (a canvas drawing app) on that token alone. Fixed narrowly: `widget.js::stripHtmlWrapper` strips the four wrapper tag names before `resolvesInto` tokenizes.
2. **Caption collision.** `buildWords()` (app.js) concatenates `caption + "\n" + code`, and an unrenamed caption defaults to the bare language (`defaultCaption`: `seg.lang || "code"`) — so the same token arrived through a second channel. Fixed narrowly: `stripHtmlWrapper` also strips a first line that is exactly one of the wrapper names.
3. **Real (if accidental) overlap.** The FIRST misroute had already landed as a rezero on the drawing-app build — meaning the model, handed the drawing app's code as "your current code, revise it," actually merged a `generateGrid()` using `row`/`col`/`cell` vocabulary INTO it. The next ask then matched on genuinely shared vocabulary, no longer a boilerplate artifact at all — the misrouting had contaminated its own target, making the next misroute more confident, not less. This is the diagnostic: two narrow fixes closed two channels, and the third channel wasn't even the same *kind* of hole — it was the first hole's own consequence.

Immediate response, this session (not the full referent-router — that is the amendment above, not yet built):
- `widget.js::matchedTerms` / `evidenceOf` — every "resolved"/"judgment" routing decision now discloses which of the operator's words it matched on, riding the REC entry as payload (`matchedOn`) and the rezero chip note. Ostrom's monitoring principle, mechanically: a monitor's findings must be legible to the other monitors, not just correct in isolation. This does not fix the coordinate error; it makes each instance of it a five-minute read instead of a two-hour reproduction.
- This file, and the amendment issue it is filed against, so the finding survives past this session's context.

## Grep residue — other span/token comparisons standing in for aboutness (2026-08-17, not yet audited individually, not yet fixed)

Swept `tokenize(`/`terms(`/`sameForm(` across the repo (outside tests) for the same *shape* of comparison — deciding "is X about/the-same-as Y" from token overlap rather than from a resolved referent. Retrieval itself (`source.js::retrieve`) is NOT residue — READING-POLICY already licenses term-overlap as retrieval's own mechanism; the residue class is specifically *identity/dispatch* decisions wearing retrieval's clothes:

- **`skills.js` (`claimSkill`, slot-filling, lines ~193-250).** A skill's declared anchors must all appear in the task's own words through the shared fold; most-anchors-wins; a tie is refused as ambiguous. Structurally identical to the router's problem: "which skill is this task an instance of" is an aboutness question, answered with token containment. Likely the SAME class, unaudited.
- **`holon.js` (~line 611-613, and the evidence-table match at ~479-486).** "A part whose words share no term with the task" is P7's own *disclosed* deviation (plan-steered retrieval) — already bounded and tested, but the mechanism itself is the identical shape: term-share deciding whether a part's retrieval is "about" the task. Worth revisiting under this seed's discipline rather than assuming P7's existing disclosure already covers it.
- **`hypergraph.js` (~line 145, passage `terms` sets).** Feeds relation-vocabulary discovery / corroboration counting. Not yet checked against this seed's "Three" (corroboration counts referent-agreements, not shared sentences) — worth a dedicated look, since corroboration is named explicitly above as a place this class causes silent overcounting.
- **`app.js::renderEvidence`** (~line 3525, `terms = tokenize(question)`) — the evidence table's "matched" column is term-overlap between a question and a passage. This one is arguably legitimate (it is disclosing retrieval's own match, not deciding identity), but it is the same primitive and worth a second look once the referent layer exists, since "matched" currently means "shares a string," not "witnesses the same thing."
- **`cite.js`** (`namesIn`, `commonTerms`) — NOT flagged as residue on inspection: CLAUDE.md's own P11 section states this already resolves through the engine's cast organs rather than a local reimplementation, i.e. already on the referent side of this seed's line. Named here so the next pass doesn't re-audit it from scratch.

None of the above are fixed by this pass. The point, per the seed: make the class visible, not exhaustively patch it.
