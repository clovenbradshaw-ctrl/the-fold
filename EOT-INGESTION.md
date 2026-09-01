# Ingesting content as EOT lines, folded into a hypergraph on retrieval

*Second pass. First written 2026-09-01 morning, against the working tree as it
stood then. This version supersedes it — same title, same law, most of the
theory unchanged — because the same day's work found the theory was right and
the practice wasn't, found governance for the gap between three repos that no
single repo's own law could catch, and found (while proving the point on a
book fetched live from Project Gutenberg) that the practice had a second,
sharper defect the first pass never suspected. Written to be read on its own;
the first pass is not required reading, and where this one disagrees with it,
this one is the correction.*

---

## 1. The theory, unchanged

The law is `store.js`'s, about database rows, applied to reading:

> **the reality of the database should be the EOT event stream, the current
> state always projected.**

A line is an act, addressed, accumulating by union, and a refuted line is
conceded, never deleted. Four commitments, four pieces of code:
`hyperlexicon.js::hear` (accumulate by union), `admit` (addressed or refused),
`cellOf` (typed by the cube, never chosen), and REC/`concedeEvaluation`
(concession, not deletion). None of this changed today. What changed is
everything downstream of it — the governance that watches the seams between
repos, and the actual reading pipeline, which turned out to violate the
theory it was supposedly implementing.

---

## 2. What was actually happening: three repos, each compliant, together wrong

The first pass found three EOT vocabularies that didn't meet and called that
the central finding. It was too narrow. The REAL finding, from later the same
day: **live_priors' corpus recipe passed eleven of the twenty-five organs
`hypergraph.js::makeRelationReader` accepts, and left the rest — every
occurrence-level one, `resolvePronouns` among them — silently omitted.** Not
because any law was broken. eoreader7 built and tested the organ. the-fold
accepted it into its reader. live_priors simply never passed it. Every one
of 2,208 stored readings was, and had always been, purely type-level: no
decay, no present, no recall — every referent decided by capitalization and
recurrence alone, nothing else.

**No policy anywhere caught this, and no policy could have.** Each repo's own
`POLICIES.md`/`READING-SPEC.md` governs what that repo does with what it is
given. None of them governs what a *composition* of three repos silently
fails to pass between them. That is a jurisdictional gap, not a discipline
failure, and it needed a jurisdiction that doesn't yet exist to close it.

### The union, founded on what already existed

The instinct was to found a new repo for this — `eoreader8`, the union of
the three, law above all of them. That instinct was wrong and the user
caught it in one sentence: *"wait dont we have a constitution repo?"* —
`eo-constitution`, thirteen ratified amendments, a claims register, a
routing assay, sitting one directory over, unconsulted. The right move was
never to found something new. It was to search for the organ before writing
one, applied to governance itself, and accede eoreader7 (and by extension
the-fold and live_priors, wherever their seams are the ones in question) into
the institution that already exists, rather than build a second one beside
it.

**Article III.4**, entered there: a composition declares every organ its
consumer accepts, or names why it omits each one. Enforcement is a derived
audit, not a hand-written checklist — the accepted set is parsed off
`makeRelationReader`'s own destructuring, the passed set off the recipe's own
call site, so adding an organ to the reader adds it to the audit with no
edit anywhere. It runs today and fails, correctly, naming twelve undeclared
omissions — two of which (`casePrior`, `extractCaseMarkedRelation`, from the
Latin case-marking work) I would not have found by reading the recipe by
eye. **The article does not require any organ be injected. It requires the
silence to end.**

### Closing the omission, and what it actually bought

Wiring `resolvePronouns` in, plus disclosing every remaining omission by
name in the recipe descriptor itself (not just the recipe file — every
sidecar now carries `unionOmitted`, ten organs, each with a real reason, so
a reader of one file never has to cross-reference a second repository to
know what this pass chose not to hear), was the mechanical half of III.4
compliance. The referent-identity half — `hyperlexicon.js`'s `noteIdentity`
socket, undwired since it was written — is the harder half, and it answers a
question the user put directly:

**Should the log be about tokens, or about the system's revisable thoughts
about the referents of the tokens?** Both, at two distinct grains, never
collapsed. The token — a byte span — is free to recover, any time, from the
address. What is worth an append-only ledger is the **claim** about what a
subject or object string names, because that is the thing that can be wrong
and later corrected. `noteIdentity`, now wired through `cast.js`'s referent
index (the same organ `hypergraph.js` already trusts internally for
endpoint resolution — identity here cannot drift from what the reader
already believed), canonicalizes a subject or object to its resolved
referent's own established face when resolution is unambiguous, and falls
back to the surface form otherwise — never guessing on an ambiguous
resolution, P38's own rule applied a second time.

Measured, honestly: on one direct, controlled comparison (Byzantine Empire's
own Wikipedia excerpt, same 93 edges, exact-string identity vs.
referent-canonicalized identity, side by side) **the fold count came out
identical.** The theoretical gap this closes — P57's own 0/29 finding, that
two different wordings of the same fact can never fold under exact-string
matching — is real and separately documented, but one new sample didn't
happen to exercise it. Reported honestly rather than oversold: the socket is
real, wired, and tested; its aggregate corpus-wide payoff is still unmeasured.

---

## 3. The Dracula reading: the theory's second, sharper defect

Every already-fetched Gutenberg text in the corpus already had a sidecar.
"Try a new one" meant an actual network fetch — confirmed with the user
first, per this session's own standing policy on downloading files — of
Bram Stoker's *Dracula*, Project Gutenberg #345, 890KB, never before in this
corpus. Character-dense on purpose: Harker, Mina, Van Helsing, the Count
himself, all recurring under multiple surfaces, chosen specifically to
exercise the referent-identity wiring in a way Byzantine Empire's own
excerpt hadn't.

**At the default 8,000-character window: 58 edges, zero folded notes, zero
2+-span notes.** Not a bug — the opening 8,000 characters of *Dracula* are
Jonathan Harker's solitary travel journal. The ensemble cast that would
actually restate facts about a shared referent doesn't arrive until later.
This is the same defect the first pass already measured for The Federalist
Papers (2,125 blank lines chunking to 1,537 sane passages in one edition,
ONE passage of 1.3 million characters in another) wearing a different
costume: **a fixed prefix window cannot see restatement that occurs past its
own edge, and narrative prose puts its restatements wherever the narrative
puts its characters, not wherever an excerpt happens to stop.**

*"Why any window limits? Read in order."* — the user's own question, and
the right one. There is no principled floor under `EXCERPT_CHARS = 8000`;
it is declared and was never measured. Removing it and reading the whole
861,407-character body took 18.4 seconds and found real folding at every
window tested along the way (16k→147 edges/2 folded, 32k→369/8, 48k→697/20,
climbing, never falling). At the full document: **`gate: gapped_self_verify`,
every one of 15,149 extracted edges carrying zero spans.**

### The actual defect, found by instrumenting rather than guessing

The reflex diagnosis — "resolvePronouns's own substitution desyncs
sentence counts" — was tested directly and was wrong: on the raw,
un-normalized body, sentence counts paired exactly (9,470 = 9,470), because
1,506 of 1,514 real pronoun bindings were refused by the offset guard as
stale before they ever touched the text. The real cause needed three more
rounds of direct instrumentation to isolate: on the **newline-normalized
excerpt** (the text the pipeline actually reads), every one of the same
1,514 bindings applies cleanly — and applying them shifts sentence
segmentation from 9,470 to 9,770, because Victorian prose is full of
referents whose fullest surface is a title abbreviation (*Dr. Van Helsing*,
*Mrs. Harker*), and inserting one where the author wrote *he* hands a naive
sentence-splitter a period the author never punctuated. The pairing check
that exists to catch exactly this kind of drift is **passage-scoped, not
sentence-scoped** — one boolean for the whole 861K-character document — so a
single such collision anywhere in the book zeroed every span in the whole
reading at once, having genuinely extracted real content the entire time.

### What the author of this codebase's own law already says about it

*"With stuff like this, how does the AUTHOR want us to think about
segments?"* and then, sharper, *"how does the AUTHOR want activation to
work?"* Both answered by the project's own standing law, not invented for
the occasion. READING-POLICY P1: **activation decays, identity does not,
recall is retrieval.** Activation answers *who does this occurrence refer
to* — a binding between an existing span and an established referent. It
was never meant to touch the text. LP1 says the same thing from the
source's side: the source is the Torah, immutable, never replaced by a
reading. `resolvePronounSubjects`, as it stood that morning, did something
the author's own law forbids: it took a revisable belief (this pronoun
names that referent) and **baked it into a rewritten copy of the bytes**,
then asked segmentation to run a second time on text the author never
wrote. That is a category error dressed as a bug — a Talmudic commentary
mistaken for Torah — and it fails exactly where the mistake predicts:
wherever the commentary's own words happen to contain punctuation the
original never had.

And even that framing needed one more correction, from the user directly,
against my own first attempt at a fix: *"what if the first assertion of
punctuation is wrong? we have a whole intelligence of search and seek and
stuff. and yes it's all append only."* Treating the FIRST segmentation pass
— against real, untouched bytes — as an unrevisable oracle overclaims in the
other direction: a sentence splitter is a heuristic even against real
bytes ("Dr. Seward met Mr. Harker" is genuinely ambiguous with no rewrite
anywhere near it). The correct standing is that **segmentation is itself a
claim** — a `SEG·Figure` act, the same shape every `INS`/`SYN` entry in this
system already takes — revisable under the same append-only, witnessed
discipline as everything else here, through the reasoning apparatus this
project already built and mostly leaves idle: `grid.js`'s own
`concedeEvaluation` (REC, built for exactly "a later evaluation disagrees
with an earlier determined verdict"), `capacity-runner.js`'s `landAct` (the
checked, witnessed landing a capacity's result attaches to a log entry
without re-typing the act), `refutation.js`'s veto on genuine incoherence,
`seek.js`'s evidence-gathering navigation. The difference this draws is not
"revisable vs. not." Everything here is revisable. **The difference is
whether a revision is an accountable act on the record, or an invisible
mutation nobody asked for, discovered only by chasing a mysterious gate
failure three levels down.**

### The fix that shipped, verified against the existing suite before anything else

`hypergraph.js` no longer rewrites a whole passage and re-splits it.
Sentence segmentation is computed **exactly once per passage**, off the
untouched bytes each passage actually carries. A pronoun binding is applied
**within its own already-fixed sentence's span alone** — never to
neighboring sentences, never re-split afterward — so there is no second
sentence count anywhere in the pipeline for the first one to disagree with.
The `paired` boolean and its null-span fallback are gone entirely, not
patched: with per-sentence isolation there is nothing left for them to
guard against. Furniture-blanking got the same treatment, on the same
reasoning, since it shares the identical failure shape.

**Verified, not assumed, before being called done:** `hypergraph.test.mjs`
passes 52 of 56 both before and after the rewrite, the same four failures
by name in both runs (a missing vendored treebank fixture in this
checkout, unrelated to this change, confirmed by stashing the edit and
re-running). The rewrite is behavior-preserving for every existing caller
and closes a real, previously-undiagnosed failure mode for every new one.

### What's found and disclosed, not yet closed

Instrumenting the fix surfaced a **third, sharper defect**, structural
rather than empirical: `bestSurface` — the map deciding which name to
substitute for a bound pronoun — is built from referent discovery over the
**whole passage at once**, choosing the longest established surface with no
positional check whatsoever. Confirmed by construction on a synthetic
specimen: a referent whose only full surface ("Count Vladimir Alexandrovich
Tepesescu") appears in the document's last sentence would, if bound to a
bare "He" in the first sentence, substitute a name the reader could not
possibly know yet. This is real lookahead — the document's future informing
its past — the exact thing `S3` ("lookahead is not reading") and the
streaming-DMD design already forbid elsewhere in this same codebase. It is
disclosed here, not fixed: confirmed structurally (the code has no
positional gate to remove), not yet confirmed to fire on a live specimen,
and the scoped repair — restrict `bestSurface` to referents established
*at or before* the pronoun's own position — is real, named, future work.

**Segmentation-as-a-witnessed-act itself was designed, not built.** The
shape is settled: a `segmentation.js` sibling to `hyperlexicon.js`,
proposing `SEG·Figure` entries per sentence, conceding and re-proposing
under `REC` when later evidence disagrees — and every act carrying the
`seq` cursor it landed at, so a correction can be audited for exactly the
property the third defect above violates: that it cited evidence at or
before its own position, never after. Nothing here is provisional about the
*shape*; the module itself does not exist yet.

---

## 4. What this pass actually closed, stated plainly

A real, load-bearing bug (`blank-furniture-sentence-drift`, filed earlier
this session), a second real, load-bearing bug found on a live Gutenberg
fetch and **closed** by a structural fix rather than a patch
(`resolve-pronouns-sentence-drift`), a third found and honestly disclosed
but not yet closed (the `bestSurface` lookahead risk), one constitutional
article with a derived, self-updating audit that already caught two
omissions a hand-written checklist would have missed, and the referent-
identity socket wired for the first time, its real payoff still unmeasured
at corpus scale.

None of this was theoretical. Every claim above was checked against real
bytes, a real fetch, a real test suite, or a real synthetic specimen built
to be adversarial — and where a check came back inconclusive or the
evidence was thin, that is what's written here, not something stronger.
