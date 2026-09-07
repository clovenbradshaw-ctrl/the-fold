# Ground, Figure, Pattern — the addressed, the addressless, and the meta

A spec to develop, fully, what the relative-address experiment found on
2026-09-07. Status at writing: the experiment is measured and its two pure
modules and seven tests are on `main`; nothing is wired into the page. The
passes below take it from an experiment to an organ, in the order the
measurements justify, each with its own null and its own exit.

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
whatever the text makes it; comparison is cosine over lit bits). The *field*
holds nodes that are a state, a payload and their synapses, and offers
exactly four ways in — `recall(cue)`, `after(node)`, `before(node)`,
`bind(a, b)` — and no `get`. A *recall* activates every node by overlap with
the cue's state, lets activation spread one step along synapses, and reports
where it settled. A *verdict* is one of `figure`, `ambiguous`, `nothing`, and
is decided only against the *null band*: the highest activation, and the
widest lead over a runner-up, that random cues of that length pull out of
this field. No activation threshold is chosen anywhere.

The model is the other Figure-grain part: weights and activations, reached by
a prompt that is a cue and never a lookup. The field is the addressless
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

## 7. Not in scope, and said

Prediction as author (letting the record produce an expected answer before
the model speaks, and scoring the model against it) is the deeper
brain-likeness the earlier assessment named; it is a separate program and
touches the void work, not this one. A global workspace among the witnesses,
and consolidation of episodes into schemas, likewise. The model's weights do
not change anywhere in this spec: the addressless mouth stays as it is, and
what becomes addressless is memory.
