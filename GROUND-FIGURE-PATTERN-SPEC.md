# Ground, Figure, Pattern — the addressed, the addressless, and the meta

*The addressless half of the Figure is THE SHADOW (field-of-record.js
`THE_SHADOW`) — the keyless field (relative.js) by its remembered name:
the holograph is the addressable side of recall, the shadow is the other
side. Ground casts; the shadow follows; the pattern measures the light.
THE_IMPRESSION is the shadow's thin form (2026-09-11, user direction "the
minimum we remember"): a node with a state and a pointer, NO words —
recall-only, never re-expandable, structurally unreadable. Resolution
(SDR_BITS) is the impression's size knob, measured by Pass 36, never picked.*

A spec to develop, fully, what the relative-address experiment found on
2026-09-07, and — added the same day — to turn the meta part from an
auditor into an author. Status at writing: the experiment is measured and
its two pure modules and seven tests are on `main`; nothing is wired into
the page. The passes below take it from an experiment to an organ, in the
order the measurements justify, each with its own null and its own exit.

The system has three parts, and they are the three grains.

| part | grain | what it holds | its one property |
|---|---|---|---|
| the record and the sources | **Ground** | bytes, with absolute addresses: a seq in a ledger, `name#start-end` into a source, an mxc in a media store | exact or nothing |
| the model, and the memory this spec adds | **Figure** | states; reached only from a cue or one synapse along; no keys | graceful and never exact: it degrades, and says by how much |
| the checks: witnesses, null bands, the ground ladder, attribution, the leak instrument, and the correspondence acts this spec adds | **Pattern** | nothing of its own — facts about the relation between the other two | the only part that can tell *moved* from *gone* |

The rule the experiment supports, and this spec enforces: **the ends stay
absolute and the middle goes relative.** Bytes keep their addresses. Memory
becomes a state field with none. And what the meta part decides about their
correspondence is written to the record with an address like anything else,
which is the difference between a mind that recalls and a lab that recalls
and can show its notebook.

## 0. The finding this rests on

`node eval/relative-addresses.mjs` — 400 passages of Tolstoy, 120 probes per
task, a hit counted only above a null band measured on that field for a cue
of that length (150 random cues drawn from the field's own vocabulary).

| task | addresses alone | the field alone | the pattern between them |
|---|---|---|---|
| whole passage as the cue | 120/120 | 120/120 | 120/120 |
| first 30% of the words | 0/120 | 119/120 | |
| 40% of the words replaced | 0/120 | 120/120 | |
| first 15% of the words | 0/120 | 87/120, and 29 say *ambiguous* rather than guess | |
| random 20-word cues the field calls a figure | | 0/120 | |
| every offset shifted by a preface | 0/120 | 119/120 | 120/120 |
| source renamed and prefaced | 0/120 | 119/120 | 120/120 |
| one passage in five deleted | 0/120 | 95/120 | 96/120, and 24 *apart* — exactly the 24 deleted |
| a fully shuffled store, rebuilt | | same figure 120/120, same synapse 120/120 | |

One recall over 400 nodes costs about 1.4 ms. The field carries no positions:
its store names each node's neighbours by signature, so re-ordering it
changes nothing.

## 1. Definitions

**Ground.** A source's bytes and every absolute address into them. The
record's seq. An mxc. Law II.3 holds without exception: a ref re-opens the
exact bytes it names or fails with a typed gap. Nothing in this spec rewrites
a ground address, ever; a repair is a new entry that names the old address
and the new one.

**Figure.** A *state* is the set of bits a text lights (`relative.js
sdrOf`: words and their ordered pairs, hashed onto 4,096 bits; density is
whatever the text makes it; comparison is cosine over lit bits). The *field* —
**the shadow**, by the name this spec's companion files carry — holds nodes that are a state, a payload and their synapses, and offers
exactly four ways in — `recall(cue)`, `after(node)`, `before(node)`,
`bind(a, b)` — and no `get`. A node may be a full node (text retained,
re-expandable to the ground) or an *impression* — **THE_IMPRESSION**, the
minimum we remember: state and pointer, no words, recall-only, never
re-anchored (there are no words to search for). A *recall* activates every node by overlap with
the cue's state, lets activation spread one step along synapses, and reports
where it settled. A *verdict* is one of `figure`, `ambiguous`, `nothing`, and
is decided only against the *null band*: the highest activation, and the
widest lead over a runner-up, that random cues of that length pull out of
this field. No activation threshold is chosen anywhere.

The model is the other Figure-grain part: weights and activations, reached by
a prompt that is a cue and never a lookup. The field — the shadow — is the addressless
*memory*; the model is the addressless *mouth*. The meta part never asks the
model anything (the model is just the mouth): every verdict below is
mechanical.

**Pattern.** A *correspondence act* takes a ground address and the text it
was minted for, checks the ground (`drift`: exact, shifted, moved, gone),
recalls the figure (`reanchor`: a figure, ambiguous, absent, unheld), and
lands one of five verdicts (`correspond`): `agree`, `repaired`, `ground-only`,
`ground-shifted`, `apart`. A correspondence act is a ledger entry at grain
Pattern. It carries the ground address it started from, the figure's
activation and the band it was measured against, the verdict, and the
address it minted if any. It is appended, never applied in place.

## 2. Invariants

- **G1.** No absolute address is ever rewritten. A repair is `propose` of a new address with `operator_basis: derived`, resting on the pattern entry that produced it; the old address stands in the record with its own `retract`-shaped note pointing forward. (`ENTRY_KINDS` and `OPERATOR_BASIS` are the ledger's own, `native/kernel/task-log.js`.)
- **G2.** A source's bytes are never edited by this organ. `drift` and `reanchor` read; only the record is written.
- **F1.** The field exposes no key. Any function that takes an index, a seq or an id into the field is a violation, and `relative.test.mjs` asserts `Field.get` is undefined.
- **F2.** Every verdict is relative to a null band measured on the field it was made in, for the cue length it was made with, and the band is written beside the verdict. A band is never reused across fields.
- **F3.** The field's store carries no positions. Neighbours are named by signature. Shuffling the store must rebuild the same field (tested).
- **F4.** Structural constants are stated, not tuned: 4,096 bits, one spreading step at gain 0.25. Pass 36 measures their sensitivity; until then they are the ones the experiment was measured with.
- **P1.** A correspondence act carries: `was` (the ground address), `at` (what it minted or confirmed), `verdict`, `activation`, `band {lo, hi, margin, draws}`, and `figure` (the recalled node's signature). Nothing else is needed to re-run it.
- **P2.** *Moved* is never reported as *gone*, and *gone* is never papered over. `apart` is a typed gap on the record, and in the deletion run it named exactly the deleted probes and nothing else. That property is the exit test of Pass 34.
- **P3.** The meta part never replaces a retrieval path silently. Where the figure is used to find material for a turn (Pass 35) it is one witness among the others, its disagreements typed, its contribution scored prequentially — the same discipline every witness already lives under.
- **P4.** Text in the field's store has the record's own status: local, in the browser's private file system, and sealed under the chat key when it travels to a room (Pass 39). Nothing in the field is ever sent in the clear.
- **A1.** The expectation for a turn is composed only from the record, the sources, the priors and the voids — never from the model. The model is the mouth; the ledger is the author.
- **A2.** The expectation is on the record *before* the draft, as a `propose` at grain Figure with `operator_basis: derived`, resting on the addresses and priors it was built from. The diff is taken against something written down, never against something remembered.
- **A3.** The self tier stays open. A claim the mouth adds that the expectation did not hold is never suppressed: it is cited as the model's own until a witness binds it, and it is the only channel through which novelty enters short of material arriving. Error is how the author learns.
- **A4.** Precision is the tier, never a chosen weight. Error against a bound expectation is a strong signal; error against a self-tier expectation is expected and cheap. No number is set by hand.

## 3. Cells and the registry

The cube's grains are `Ground`, `Figure`, `Pattern` (`native/kernel/cube.js`).
The ground ladder already names the cells this spec extends: `SIG·Ground`
for a named address, `SYN·Figure` for a recorded figure, `SYN·Pattern` for a
derived product. The proposed seats, to be confirmed against `cellOf` before
any organ is written (P92, "read CAPACITIES before writing an organ"):

| act | proposed cell | why |
|---|---|---|
| a recall from a cue | `SIG·Figure` | a signal picks out a figure from a field; nothing is asserted about bytes |
| a drift check | `EVA·Ground` | an evaluation of whether an address still names its bytes |
| a correspondence act | `SYN·Pattern` | a product derived over a ground and a figure, resting on both |

Each organ gets one row in `native/organs/capacities.js` in that table's own
shape — `{ id, terrain, op, module, fn, what }` — where `terrain` is not a
free label but `TERRAIN_BY_DOMAIN[domainOf(op)][grain]`, derived from the
operator letter and the grain and checked by hand against `operators.js`
the way every row there already is. The proposed rows, with terrains left
to that derivation rather than guessed here:

```
{ id: "recall",     op: "SIG", grain: "Figure",  module: "relative.js",         fn: "recallAgainstNull", what: "a cue settles a keyless field; a figure only above the band random cues of that length pull out" }
{ id: "drift",      op: "EVA", grain: "Ground",  module: "relative-pattern.js", fn: "drift",             what: "does an address still name its bytes — exact, shifted, moved, gone; nothing rewritten" }
{ id: "correspond", op: "SYN", grain: "Pattern", module: "relative-pattern.js", fn: "correspond",        what: "the pattern over a ground and a figure — agree, repaired, apart — as a ledger act resting on both" }
```

Two organs: `relative.js` (the field) and `relative-pattern.js` (the
correspondence). Both stay pure; their crossings (OPFS, the reopen door, the
room) live in the page and are named in each pass.

## 4. The passes

NEXT-PASSES numbering continues from Pass 31. Each pass names what it
builds, what it measures, the null it measures against, its exit, and what
it does not claim. A pass that fails its null is stopped, not tuned.

### Pass 32 — the organ and its seat

*Build.* The two modules as they are, moved under the organ seam if the
registry says they belong there; one registry row each with the cell
confirmed by `cellOf`; the seven tests kept; the experiment runner kept
under `eval/` and its table kept in a dated results file.
*Measure.* Nothing new: the table in §0, re-run on the seated modules, must
reproduce to the probe.
*Exit.* Rows in the registry; `cellOf` agrees with the table in §3 or the
table is corrected and the correction is written down.
*Not claimed.* That the field belongs in the page yet.

### Pass 33 — the field over the real record

*Build.* Admission at the two places material already arrives: the reader
loop (`read-on-arrival.js`, one passage per macrotask, so the field fills
as a source is read, never in one freeze) and the record's own append (every
`propose`/`result` entry's text). The store persists to OPFS beside the
records as signature-named rows (`record-store.js`'s discipline: append,
never rewrite) and rebuilds on boot. The field is *derived* from the record
and the sources: deleting it loses nothing; it is rebuilt.
*Measure.* The §0 table again, over the actual record and loaded sources
rather than Tolstoy: partial cues, corrupted cues, shifted and renamed
sources. Plus the cost of admission per passage and the store's size.
*Null.* The field's own band per cue length, as always; and the *rebuild*
null — a field rebuilt from a shuffled store must recall and navigate
identically on every probe.
*Exit.* Recall from a 30% fragment of any record entry or passage lands
above the band on at least the share Tolstoy gave (119/120), and the
boot rebuild is exact.
*Not claimed.* That the field is used for anything yet.

### Pass 34 — the pattern act at reopen

*Build.* In the one place a ground address is resolved for a person
(`reopen`, law II.3), when `resolveAddress` fails or returns bytes that are
not the note's, run `correspond`. On `repaired`, show the bytes at the new
address with the line "re-anchored from memory: was `A`, now `B`", and append
the correspondence act to the ledger; on `ground-shifted` (the bytes found
by search but the field could not settle) show the bytes and say the field
did not confirm them; on `apart`, the typed gap, unchanged. The dialog never
shows a repaired address as if it had always been the address.
*Measure.* Over every address on the record: how many agree, how many
were repaired, how many are apart, and the drift per source. Re-run after
a source is re-attached with a preface, after a rename, after a deletion.
*Null.* P2's test: in a run where a known set of passages is deleted, the
`apart` set must equal the deleted set — no false losses, no papered-over
losses. Any deviation stops the pass.
*Exit.* Repairs are on the record as `SYN·Pattern` entries resting on the
address and the figure; the reopen dialog shows its work; the deletion null
holds exactly.
*Not claimed.* That the record's own seqs change: they do not, ever.

### Pass 35 — the figure as one witness in retrieval

*Build.* A seat in the parliament: for a turn, the field is recalled from
the question (and from the last answer's claims), and what it settles on is
offered beside what lexical retrieval found. Agreement is noted;
disagreement lands typed on the record (`witnessed`, `EVA·Figure`), naming
both sets. The field never replaces the other retrieval and never feeds the
model on its own.
*Measure.* Prequential: for each turn, score the answer's ground tier with
and without the field's offering counted, over a long stream (the
long-stream fixtures). Count turns where the field found a passage the
lexical path missed and the answer was then bound to it; count the reverse.
*Null.* A field admitted from a *shuffled* record (the same texts, random
adjacency) run through the same turns: the synapse contribution must beat
that, or spreading is turned off for this use.
*Exit.* A measured, dated difference in ground tiers, positive or not; if not
positive, the seat stays but is off by default, and the entry says so.
*Not claimed.* Better answers. Only better *grounding*, if that.

### Pass 36 — cost at scale

*Build.* Posting lists over bits (which nodes light bit *b*) so a recall
touches only nodes that share a bit with the cue. Bits are features, not
addresses of nodes: F1 still holds. Fields of 1k, 10k, 100k nodes from the
long-stream fixtures.
*Measure.* Milliseconds per recall and per admission at each size; store
bytes per node; and the §0 table at each size, because a bigger field has
a wider null band and the 15% task will fall — by how much is the number.
Sensitivity: 2,048 / 4,096 / 8,192 bits, spread 0 / 0.25 / 0.5, on the same
probes.
*Null.* The band, per size; and a *saturation* check — random cues must
still never be called a figure at 100k nodes.
*Exit.* A recall under 50 ms at 100k nodes on this machine, or the size at
which it is not, written down; the constants of F4 either confirmed or
replaced with the measured best, in the record.
*Not claimed.* That anything past 100k was measured.

### Pass 37 — binding by use

*Build.* `bind(a, b)` on nodes that were reached together for a turn that
was then bound to material (a Hebbian step), with a decay measured in
recalls, not in time.
*Measure.* Held-out cues: does binding raise recall on cues the field has
not seen, or only on the cues that trained it?
*Null.* The same number of bindings placed at random. If use-binding does not
beat random binding on held-out cues, this pass ends with binding off.
*Exit.* A measured answer, either way.
*Not claimed.* Consolidation. Nothing here compresses many episodes into a
schema; that is named as out of scope in §6.

### Pass 38 — the meta part audited

*Build.* Prequential scoring of correspondence acts: when an address a
pattern act repaired is later reopened, does it hold? A drift rate per
source over time. An alarm when a source's drift rate rises above what the
null gives.
*Measure.* Over the record's life: agree / repaired / apart counts by day and
by source.
*Null.* The rate of `apart` on sources that were not touched.
*Exit.* The meta part reports on itself the way it reports on the other two,
and its own reports are on the record.
*Not claimed.* That the meta part is correct — that it is *scored*.

### Pass 39 — the room

*Build.* The field over a room's preserved turns, built on each member's
machine from the decrypted blocks, stored sealed under the chat key (P4),
never sent. `correspond` over chain pointers: after a rotation or a manifest
cap, a block that is no longer listed is found by walking, and its pointer
re-issued as a pattern act on the member's own chain head — the room's
ground repaired by the room's figure, on the record.
*Measure.* Recall of a preserved turn from a fragment in another member's
browser; re-anchoring of every unlisted block after a rotation.
*Null.* The leak instrument over everything the homeserver saw: the field's
store, like a block, must leave no readable byte.
*Exit.* Zero offences; every unlisted block re-anchored; recall in a second
browser above the band.
*Not claimed.* That the field replaces the chain. The chain is the room's
ground; the field is its figure.

### Pass 40 — the expectation before the draft

The turn today runs question, retrieval, draft, witnesses, ladder, surprise:
the expectation is computed after the draft and used to grade it. This pass
runs the same organs in the other order, so that prediction authors and the
mouth renders.

*Build.* `expect(question)`: the referent index names the passages the
question's words reach; derivation contributes its products with what they
rest on; the priors contribute their claims, provenance and toggle state;
the void brief contributes what is absent and the scope it was absent in.
The result is a structured expected answer — `{ claims: [{ text, at,
tier, restsOn }], voids, shape }` — appended to the record first (A2), then
rendered into the prompt's ground block in place of bare passages. Where
the preflight already generates ground on nothing, it runs first and feeds
the same composer. Where the mechanical turn can render the expectation
without a model, it does, and the mouth is not called.
*Measure.* Per turn: the expectation's size, its tiers, its cost, and how
often it is empty. Per stream: how the size grows as reading accumulates.
*Null.* An expectation composed from a *shuffled* record — the same entries
under random adjacency and order — run through Pass 41's diff on the same
answers. The true expectation must produce fewer novel claims than the
shuffled one, or the composition is noise and the pass stops.
*Exit.* Every grounded turn carries an expectation on the record before its
draft, and the null resolves.
*Not claimed.* Better answers yet. Only that the ledger now speaks first.

### Pass 41 — the diff as the error signal

*Build.* `error(expectation, answer)`: each claim in the answer is
*matched* (expected and said), *novel* (said, not expected), or
*contradicted* (said against an expectation — a dispute on the record); each
expected claim unsaid is *missing* (the mouth dropped something grounded,
reported as such). Novel claims are scored against a null — what an answer
of that length matches in the record by chance — and carry the tier of
whatever they land on. The witnesses spend their budget on novel and
contradicted claims only; matched claims at a bound tier cost nothing to
check, because the expectation already carried their addresses. A void the
answer fills is a novel claim at self tier by construction: the void-not-fed
failure becomes a diff line before any witness runs.
*Measure.* Per turn: the four counts; witness calls spent, against the calls
the same turn spends today; the answer's ground tiers, scored prequentially
against today's. Over a long stream: all of it by turn index.
*Null.* A random expectation — claims sampled from the record at the same
size — on the same answers. The diff must resolve (II.23): the true
expectation must yield fewer novel and more matched claims than the random
one, or the diff is not measuring what it claims to.
*Exit.* Witness calls fall while ground tiers do not fall, over at least one
long stream; every diff is on the record as an `evidence` entry resting on
the expectation and the answer.
*Not claimed.* That fewer calls means a cheaper turn overall — composing
the expectation has a cost, measured in Pass 40 and added here.

### Pass 42 — the error updates the record, and the authorship ratio

*Build.* A novel claim a witness binds becomes a ledger entry as it does
today; a confirmed surprise updates the learned priors, which already exist;
a claim that keeps matching raises its prior's precision; a void a bound
claim fills is re-zeroed at the door, as it is today. And one new number on
the record per turn: the *authorship ratio* — the share of the answer's
claims the expectation authored against the share the mouth added.
*Measure.* The ratio over the long-stream fixtures, by turn index, per
stream. As reading accumulates the record should author more of each
answer. If the ratio does not rise, the reading is not becoming knowledge,
and the number says so.
*Null.* The ratio under a shuffled record, and under no reading at all (the
priors alone). A rise that the shuffled record also shows is not learning.
*Exit.* The ratio is on the record for every turn and rises beyond the null
on at least one long stream — or does not, and that is the finding, written
down.
*Not claimed.* Anything about the model. Its weights do not change; what
learns is the record.

## 5. Shapes

A field store row (no positions):
```
{ text, payload: { source, at }, signature, next: [[signature, w], …], prev: [[signature, w], …] }
```

A correspondence act on the ledger (grain Pattern):
```
{ kind: "evidence", operator: "SYN", operator_basis: "derived", grain: "Pattern",
  was: "borodino#1201-1533", at: "borodino_v2#3001-3333", verdict: "repaired",
  figure: "5b1e…", activation: 0.471, band: { lo: 0.065, hi: 0.171, margin: 0.063, draws: 150 } }
```

Gap types, all typed, none silent: `address_malformed`, `source_absent`,
`address_beyond_source`, `address_names_other_bytes`, `figure_absent`,
`figure_ambiguous`, `figure_unheld`.

## 6. Fully developed means

- Both organs seated in the registry with confirmed cells (Pass 32).
- The field derived from the record and sources, persisted without positions, rebuilt on boot exactly (33).
- Every reopen that would have failed on drift is repaired on the record, and every true loss is reported as one (34).
- The figure sits in the parliament with a measured, dated effect (35).
- Cost and constants measured to 100k nodes (36).
- Binding measured against random binding and kept or dropped on that (37).
- The meta part scored on its own repairs (38).
- The room's ground repaired by the room's figure with no readable byte leaving (39).
- The expectation on the record before every grounded draft, beating a shuffled record (40).
- The diff as the error signal: witnesses spend only on error, tiers hold, every diff recorded (41).
- The error updating the record, and an authorship ratio that rises beyond the null, or is shown not to (42).

## 7. Not in scope, and said

Prediction as author was first written here as a separate program. That
was wrong, and the correction is Passes 40–42: every organ it needs — the
referent index, derivation, the priors, the void brief, the preflight,
prequential scoring, the ladder's tiers as precision — already exists, and
what was missing was the order of the turn and one feedback path. It is a
reordering of this program, not another one.

Still out: a global workspace among the witnesses (Pass 41 lets them spend
on error, which is a step toward competition but not a broadcast), and
consolidation of episodes into schemas. The model's weights do not change
anywhere in this spec: the addressless mouth stays as it is; what becomes
addressless is memory, and what learns is the record.
