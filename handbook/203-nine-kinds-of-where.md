# 2.3 — Nine Kinds of "Where"

<!-- nav:start -->
[← 2.2 — The Order Things Happen In](202-the-order-things-happen-in.md) · [Contents](000-index.md) · [2.4 — Nine Kinds of "How" →](204-nine-kinds-of-how.md)
<!-- nav:end -->











**Why this matters:** Chapter 0.3 gave you a reflex — before accepting a
claim, ask what *kind* of thing it's even about: a specific individual, a
category, or a relationship. This chapter turns that reflex into a precise,
nine-way map, and it's the map every organ in Part III will be located on.

## Domain and grain, crossed again

You've now met both halves of what makes this grid. **Domain** (Chapter
2.1) is Existence, Structure, or Interpretation — is-it-there, how-does-it-
connect, what-does-it-mean. **Grain** (Chapter 2.2) is Ground, Figure, or
Pattern — the freshly-built baseline, the thing that stood out against it,
and the thing that went on to matter. Cross them and you get nine
**terrains**: nine different kinds of "where" something can be, each one a
specific (domain, grain) pair.

## The Existence row — cashing in Chapter 0.3 directly

- **Void** — the Ground grain of Existence. Nothing yet: the cleared,
  freshly-rebuilt sense of "what's present" before anything has stood out
  against it. In a hospital ward, this is the state before you've noticed
  any specific patient at all — just the raw material the ward presents.
- **Entity** — the Figure grain of Existence. A specific individual thing
  that stood out. In the ward: one actual patient, in one actual bed, right
  now — exactly Chapter 0.3's first example.
- **Kind** — the Pattern grain of Existence. Not one individual, but the
  category that recurring individuals turn out to share — "patients," as a
  category, earned by noticing the same kind of figure recur often enough
  to matter, not assumed in advance.

## The Structure row — how things connect

- **Field** — the Ground grain of Structure. The raw space of *how* things
  in the ward could possibly relate to each other, before any specific
  connection has actually been confirmed — not yet a relationship, just the
  shape a relationship could take.
- **Link** — the Figure grain of Structure. One actual, confirmed
  relationship: this patient and that nurse showed up together far more
  than chance would predict. This is exactly what Chapter 2.1's `CON` verb
  and Part III's binding organ produce.
- **Network** — the Pattern grain of Structure. Not one link, but the
  accumulated graph of many links, once enough of them have built up to
  form a real map of who connects to whom.

## The Interpretation row — what it all means

- **Atmosphere** — the Ground grain of Interpretation. The overall,
  freshly-rebuilt felt sense of a stretch of material, before any specific
  reading of it has been pinned down.
- **Lens** — the Figure grain of Interpretation. One specific interpretive
  angle that stood out against that atmosphere — a way of reading this
  stretch that's actually distinguishable from other ways of reading it.
- **Paradigm** — the Pattern grain of Interpretation. The current, settled
  framework — the accumulated set of kinds and categories the system is
  presently reading through, always revisable, never assumed permanent.

## The Existence row's oldest ancestor

Sorting the world into a specific thing, a category of things, and a
relationship between things is Aristotle's move before it's this project's
— his *Categories* treats "primary substance" (one actual man), "secondary
substance" (man, the species) and relations as genuinely different kinds
of being, not just different words for the same kind of thing described at
different zoom levels. Biological taxonomy runs a version of the same
three-way split: one organism, a species, and an ecological relationship
between species are treated as different *kinds* of scientific claim, not
interchangeable ones — a fact about one tagged wolf doesn't automatically
transfer to "wolves" as a category, and neither transfers automatically to
"predator-prey relationship."

Where this project's grid does something Aristotle's never needed to: it
crosses this three-way existence split against two *other* three-way
splits (structure and interpretation) to get to nine terrains total, and
it ties each cell to a specific, checkable act (a Ground gets built, a
Figure gets admitted) rather than to a static description of what kind of
being something has. Aristotle was answering "what is there." This grid
answers "what got established, by which kind of act."

## A seventeen-century-long lineage of stopping at one row

Worth being precise about what follows: it isn't an outside field
converging on this grid independently. It's a related, later generation of
this very project (`eoreader4.2`, in its own internal wiki notes — again,
describing that generation's own thinking, not eoreader6 or the current
engine) reusing these same nine terrain names — Void, Entity, Kind, Field,
Link, Network, Atmosphere, Lens, Paradigm, unchanged — to make a historical
argument about Aristotle's actual descendants. nearly every major formal ontology
since has kept his move but never crossed it against anything else. Its
own account, worth taking seriously as a critique even where this book
can't independently verify every historical claim in it, runs: Porphyry's
Tree (c. 270 CE) partitions "Substance" downward by repeated binary
division; Linnaeus (1735) reruns the same partition on living things;
Frege and Russell (1879–1910) formalize it as set membership; and the
Basic Formal Ontology (BFO, 2002–present — by that account adopted by
over 650 projects and mandated in some U.S. government contexts) still
splits its own root, Entity, the same way. Each of these, on this account,
stays inside a single row — Existence alone — and never asks the
Structure or Interpretation questions this chapter's other two rows cover
at all. The one break in the whole lineage it names is Edgar Codd's 1970
relational database model, which abandoned hierarchical navigation for
flat tables reachable by any path — not a better tree, but an escape from
needing one.

Whether or not every step of that lineage holds up to closer scrutiny than
this book can give it here, the underlying diagnosis is worth sitting
with on its own terms: a single-row ontology can tell you *what a thing
is*, but has no native way to represent *how it connects to other things*
or *what it means*, and has to bolt those on as an afterthought rather
than treating all three as equally primitive from the start — which is
exactly the gap crossing three rows against three columns is built to
close.

## Why a mutual-aid map or a reading group would show the exact same grid

None of the nine terrains above required saying anything about hospitals
specifically. Swap the domain for a neighborhood mutual-aid map: Void is the
raw map before any garden or pantry has been marked; Entity is one specific
mutual-aid station; Kind is "mutual-aid stations" as a category, distinct
from "libraries" as a different one; Link is one confirmed relationship
between two specific locations; Network is the whole connected map. Swap it
again for a reading group: Void is the unread stack; Entity is one specific
member's comment; Kind is "objections" as a recurring category of comment;
Atmosphere is the felt tenor of tonight's discussion before anyone's pinned
down what it's really about. The grid doesn't change shape. Only the
material poured into it does — which is exactly the point: these nine kinds
of "where" are a property of *how attention can be organized at all*, not a
property of hospitals, maps, or books.

**Where this comes from:** the terrain grid (`terrain = (domain, grain)`)
and its nine names are defined in `eoreader6/CUBE.md`, lines 41-43. `Kind`
and `Network`'s operational glosses ("`Kind` is induced over relation
*terms*; `Network` is a graph over admitted Entities and Links") and
`Atmosphere`'s definition ("the span between two re-zero events over the
reader's accumulated ground") are from `eoreader6/11-terrain-occupancy-and-
the-two-ascents.md`, lines 17-19 and 135-136. `Paradigm`'s gloss ("the
current set of induced Kinds plus their core fields") is from the same
file, line 19. The neighborhood-map and reading-group domains are the same
domain-invariant triad introduced in `eoreader4.2/docs/eo-for-coders.md`
§C.2-C.3 — a related but separate generation of this project; see Part VII.
The Aristotle and biological-taxonomy connections above are this book's
own added links to those fields, not something the codebase itself cites.
The Porphyry/Linnaeus/Frege-Russell/Codd/BFO lineage is drawn from
`eoreader4.2/docs/eo-wiki.md`, "Most Ontologies: 'It's all Entities.' EO:
'Entities are only one of many'" — the same later generation's own wiki,
reusing this chapter's nine terrain names to make its own historical
argument, not a claim eoreader6 itself makes.

<!-- anchors:start -->

---

**Byte anchors** (generated — `node scripts/anchor-quotes.mjs`, verified by `--verify`; sources and their provenance in `sources/MANIFEST.json`). Each anchor is the UTF-8 byte range of the quoted words in the snapshot the manifest names:

- “`Kind` is induced over relation *terms*; `Network` is…” → `eoreader6/11-terrain-occupancy-and-the-two-ascents.md#b754-847`
- “the span between two re-zero events over the…” → `eoreader6/11-terrain-occupancy-and-the-two-ascents.md#b6945-7017`
- “the current set of induced Kinds plus their…” → `eoreader6/11-terrain-occupancy-and-the-two-ascents.md#b863-918`

Not located because a source this chapter names is **not yet obtained** (`eoreader4.2/docs/eo-wiki.md`, `eoreader4.2/docs/eo-for-coders.md` — see the manifest's `unobtained` list for each one's reason):

- “what got established, by which kind of act.”
- “Most Ontologies: 'It's all Entities.' EO: 'Entities are…”

<!-- anchors:end -->

<!-- nav:start -->
[← 2.2 — The Order Things Happen In](202-the-order-things-happen-in.md) · [Contents](000-index.md) · [2.4 — Nine Kinds of "How" →](204-nine-kinds-of-how.md)
<!-- nav:end -->
