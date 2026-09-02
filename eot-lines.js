// eot-lines.js — a reading is a stream of addressed lines; the hypergraph is
// a FOLD over them, computed on request.
//
// USER DIRECTION, 2026-09-01, two sentences that set the whole shape:
// "we shouldnt really be chunking stuff, it should all live as jsonl lines of
// reading", and "the line gets FOLDed in to hypergraph content on request".
//
// That is `store.js`'s own law one register up — "the reality of the database
// should be the EOT event stream, the current state always projected" —
// applied to reading instead of to rows. The consequences are not cosmetic:
//
//   A CHUNK IS A CONTAINER WE IMPOSED. Passage boundaries are an artifact of
//   retrieval-by-passage, not a fact about the text, and this session measured
//   what they cost: an argument that spans a boundary is retrieved in half
//   (the passage announcing "two methods" was fetched because it echoes the
//   question's words; the passage RESOLVING it — "relief is only to be sought
//   in the means of controlling its EFFECTS" — sat in the adjacent chunk and
//   was dropped). A line of reading has no such boundary to fall across.
//
//   THE GRAPH IS NEVER THE RECORD. Edges are projected from lines and can be
//   re-projected differently, at a cursor, without rewriting anything — the
//   same reason `foldBuild`, `foldGrid`, `foldHyperlexicon` and `foldStore`
//   all exist. A line is appended; an edge is computed.
//
// EVERY LINE IS ONE ACT, typed by the engine's own cube (`cellOf`) and
// addressed to real bytes. Nothing here paraphrases: `text` is the material's
// own span, sliced, and `at` reads back from the file.

/** Lines that actually carry an act, in sequence order. */
function ordered(lines) {
  return [...(lines ?? [])].filter((l) => l && l.id).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
}

/**
 * Project hypergraph content from lines of reading.
 *
 * `at` is a cursor: only lines up to and including that seq are folded, so a
 * reader can ask what the graph looked like partway through the reading. The
 * same scrubbing `foldBuild` gives a build log.
 *
 * Every edge carries the `at` address of the line that produced it — an edge
 * is a claim, and a claim with no address is one nothing can be checked
 * against.
 */
/**
 * The labels this fold emits, and WHERE EACH ONE COMES FROM.
 *
 * Declared in one table because the alternative is what this module did
 * first: six label strings invented at their call sites with no basis and no
 * giver, which is precisely the unearned overlay this project refuses on the
 * noun side (`grammar-lens.js`: the arrangement is earned, the reading of it
 * as subject/verb/object is a DECLARED overlay). These are not the material's
 * own words and they are not the cube's — they are this module's reading of
 * what a line's role does, and naming that here is the whole point.
 *
 * `from` is the role that produces the label; `basis` is what licenses it.
 */
export const FOLD_LABELS = Object.freeze({
  admits: { from: "filler", basis: "the filler declares `fills`, pointing at the extent it fills" },
  opens: { from: "extent", basis: "the extent declares `nests_under`, pointing at the filler it re-opens" },
  "refused-by": { from: "verdict", basis: "the verdict declares `about` and carries verdict: refused" },
  "held-by": { from: "verdict", basis: "the verdict declares `about` and carries any other verdict" },
  "eliminated-by": { from: "elimination", basis: "the elimination declares `about`" },
  "resolves-to": { from: "resolution", basis: "the resolution declares `about` and `resolves_to`" },
});

/**
 * Project hypergraph content from lines of reading.
 *
 * `at` is a cursor: only lines up to and including that seq are folded, so a
 * reader can ask what the graph looked like partway through the reading. The
 * same scrubbing `foldBuild` gives a build log.
 *
 * Returns `{ edges, gaps, regime }`.
 *
 * EVERY EDGE CARRIES AN IDENTITY AND A DISPLAY, and they are not the same
 * thing. `subject`/`object` are the material's own text, for a reader.
 * `subjectId`/`objectId` are the LINE IDS, for joining. The first version of
 * this fold had only the text, which made the node for an extent the whole
 * sentence "There are two methods of curing the mischiefs of faction" — a
 * node nothing could ever join with, and two readings of one extent would
 * have produced two unrelated nodes.
 *
 * THE LIMIT OF THAT IDENTITY, stated rather than left to be discovered: a
 * line id is identity WITHIN ONE READING. It is not coreference and it does
 * not survive across readings or sources. Real cross-reading identity is
 * `makeHyperlexicon`'s own `noteIdentity` socket (referent faces for the
 * ends, `sameAct` for the connector), which is built and not yet plugged in.
 * Until it is, do not read a join across two readings into these ids.
 *
 * NOTHING IS DROPPED SILENTLY. A line whose `fills`/`about`/`nests_under`
 * points at something not in this cursor's window is a TYPED GAP, counted and
 * returned — never an edge that simply fails to appear. A fold that skips
 * quietly is indistinguishable from a fold that never ran, which is a bug
 * this session has already paid for once.
 */
export function foldHypergraph(lines, { at = Infinity } = {}) {
  const all = ordered(lines);
  const rows = all.filter((l) => (l.seq ?? 0) <= at);
  const byId = new Map(rows.map((l) => [l.id, l]));
  const edges = [];
  const gaps = [];

  // A reference that must resolve, or say why it did not.
  const ref = (line, field) => {
    const id = line[field];
    if (!id) {
      gaps.push({ type: "missing_reference", field, line: line.id, role: line.role, at: line.at });
      return null;
    }
    const target = byId.get(id);
    if (!target) {
      // Beyond the cursor is a different fact from absent altogether, and a
      // reader scrubbing a cursor needs to be able to tell them apart.
      const known = all.some((l) => l.id === id);
      gaps.push({
        type: known ? "beyond_cursor" : "dangling_reference",
        field, line: line.id, role: line.role, wanted: id, at: line.at,
      });
      return null;
    }
    return target;
  };

  const add = (from, label, to, line, extra = {}) =>
    edges.push({
      subject: from.text, subjectId: from.id,
      label, object: to.text, objectId: to.id,
      at: line.at, cell: line.cell, from: line.id, ...extra,
    });

  for (const l of rows) {
    switch (l.role) {
      case "filler": {
        const extent = ref(l, "fills");
        if (extent) add(extent, "admits", l, l, { ordinal: l.ordinal ?? null });
        break;
      }
      case "extent": {
        // An extent that nests is a real edge; one that does not is a root,
        // not a defect — so only a DECLARED-but-unresolvable pointer gaps.
        if (l.nests_under) {
          const parent = ref(l, "nests_under");
          if (parent) add(parent, "opens", l, l);
        }
        break;
      }
      case "verdict": {
        const about = ref(l, "about");
        if (about) add(about, l.verdict === "refused" ? "refused-by" : "held-by", l, l, { verdict: l.verdict ?? null });
        break;
      }
      case "elimination": {
        const about = ref(l, "about");
        if (about) add(about, "eliminated-by", l, l);
        break;
      }
      case "resolution": {
        const about = ref(l, "about");
        const to = ref(l, "resolves_to");
        // BOTH ends or nothing. This used to fall back to the resolution's
        // own text when `resolves_to` was missing, emitting a self-edge that
        // reads as "this extent resolves to this sentence" — a different
        // claim than the one intended, and a fabricated one.
        if (about && to) add(about, "resolves-to", to, l);
        break;
      }
      default:
        gaps.push({ type: "unknown_role", role: l.role ?? null, line: l.id, at: l.at });
    }
  }

  return {
    edges,
    gaps,
    regime: {
      folded: rows.length,
      of: all.length,
      at: at === Infinity ? null : at,
      edgesByLabel: edges.reduce((acc, e) => ((acc[e.label] = (acc[e.label] ?? 0) + 1), acc), {}),
      gapsByType: gaps.reduce((acc, g) => ((acc[g.type] = (acc[g.type] ?? 0) + 1), acc), {}),
      // Said out loud: these ids join within THIS reading only.
      identity: "line-id, within one reading — not coreference across readings",
    },
  };
}

/**
 * What the reading establishes about one extent — the shape an answer is
 * assembled FROM, never generated.
 *
 * Returns the extent, its fillers in the material's own order, which of them
 * the material itself eliminated (and with what words), and what it resolved
 * to. A caller that wants prose renders this; it does not ask a model what the
 * passage said.
 */
export function foldExtent(lines, extentId) {
  const rows = ordered(lines);
  const byId = new Map(rows.map((l) => [l.id, l]));
  const extent = byId.get(extentId);
  if (!extent) return { gap: "no_such_extent", extentId };

  const fillers = rows
    .filter((l) => l.role === "filler" && l.fills === extentId)
    .map((f) => {
      const nested = rows.filter((l) => l.role === "extent" && l.nests_under === f.id);
      const elimination = rows.find((l) => l.role === "elimination" && l.about === f.id);
      const verdicts = rows.filter((l) => l.role === "verdict" && l.about === f.id);
      return {
        id: f.id, text: f.text, at: f.at, ordinal: f.ordinal ?? null,
        eliminated: Boolean(elimination),
        elimination: elimination ? { text: elimination.text, at: elimination.at } : null,
        verdicts: verdicts.map((v) => ({ verdict: v.verdict, text: v.text, at: v.at })),
        opens: nested.map((n) => n.id),
      };
    });

  const resolution = rows.find((l) => l.role === "resolution" && l.about === extentId);
  const declared = extent.declares?.cardinality ?? null;

  return {
    extent: { id: extent.id, text: extent.text, at: extent.at },
    declared,
    found: fillers.length,
    // Reported, never reconciled — the same discipline enumeration.js holds.
    agrees: declared === null ? null : declared === fillers.length,
    fillers,
    standing: fillers.filter((f) => !f.eliminated).map((f) => f.id),
    resolution: resolution
      ? { text: resolution.text, at: resolution.at, to: resolution.resolves_to ?? null }
      : null,
  };
}

// ── deriving lines of reading, mechanically ──────────────────────────────
//
// Everything above folds lines that already exist. This produces them, from a
// source and nothing else — no model call anywhere in it.
//
// THE ONE INSIGHT THAT MADE THIS BUILDABLE, found by working backwards from a
// hand-authored target: an EVA verdict's polarity ("worse than the disease")
// needs evaluative semantics this instrument does not have and should not
// fake. But it does not need to. Where a text eliminates an option it
// generally SAYS SO, in that option's own words, under negation — Federalist
// 10 answers "removing its causes" with "the CAUSES of faction cannot be
// removed". That is lexical overlap plus a RECEIVED negation class, both of
// which exist here already. The evaluative sentence becomes supporting
// evidence attached to an elimination, never the thing that has to be
// understood for the elimination to be found.
//
// AND RESOLUTION IS ARITHMETIC, not vocabulary: an extent declaring N fillers
// with N-1 eliminated resolves to the survivor. An earlier draft looked for
// exclusivity words ("only"), which would have been an English word list of
// exactly the kind this repo condemns `succession.js` for.

const CONTENT_MIN = 2; // declared: how many shared content words make a restatement
const COVERAGE_MIN = 0.5; // declared: what share of a filler a restatement must cover

function contentWords(text, { tokenize, functionWords, lemma }) {
  const out = new Set();
  for (const t of tokenize(String(text ?? ""))) {
    if (functionWords?.has(t)) continue;
    out.add(lemma ? lemma(t) : t);
  }
  return out;
}

function shared(a, b) {
  let n = 0;
  for (const w of a) if (b.has(w)) n += 1;
  return n;
}

/**
 * Read a source into lines of reading.
 *
 * `organs`: `{ splitSentences, tokenize, negationWords, functionWords?, lemma?, cellOf }`
 * — injected, the cast.js pattern, so this module imports no engine and reads
 * no language of its own. `lemma` is optional; without it "removed" and
 * "removing" are different words and some eliminations will be missed, which
 * is a disclosed loss of recall, never a wrong finding.
 */
export function readEotLines(source, { ref, organs, minShared = CONTENT_MIN, minCoverage = COVERAGE_MIN, enumerationsIn }) {
  const { splitSentences, tokenize, negationWords, functionWords, lemma, cellOf, sameClause } = organs ?? {};
  for (const [name, v] of Object.entries({ splitSentences, tokenize, negationWords, cellOf, enumerationsIn }))
    if (!v) throw new TypeError(`readEotLines: ${name} is injected — this module reads no language and imports no engine of its own`);

  const s = String(source ?? "");
  const lines = [];
  let seq = 0;
  const emit = (operator, grain, role, span, extra = {}) => {
    const c = cellOf(operator, grain);
    const id = `l${seq}`;
    lines.push({
      seq: seq++, id, kind: "propose", operator, grain, cell: `${operator}·${grain}`,
      mode: c.mode, domain: c.domain, terrain: c.terrain, stance: c.stance,
      role, text: s.slice(span.start, span.end).replace(/\s+/g, " "),
      at: `${ref}#${span.start}-${span.end}`, ...extra,
    });
    return id;
  };

  // 1. every enumeration in the source becomes an extent and its fillers
  const { enumerations } = enumerationsIn(s, { base: 0 });
  const extents = [];
  for (const e of enumerations) {
    // The head's OWN span, reported by the reader — never recomposed from
    // `start` + `head.length`, which is trimmed-vs-untrimmed and lands left.
    const headSpan = { start: e.headStart, end: e.headEnd };
    const extentId = emit("SEG", "Figure", "extent", headSpan, { declares: { cardinality: e.count } });
    const fillers = e.items.map((it, i) =>
      ({ id: emit("INS", "Figure", "filler", it, { fills: extentId, ordinal: i + 1, depends_on: [extentId] }), item: it }));
    extents.push({ id: extentId, head: e.head, headEnd: e.end, fillers });
  }

  // 2. a later extent whose head restates a filler NESTS under it
  for (const later of extents) {
    const headWords = contentWords(later.head, { tokenize, functionWords, lemma });
    for (const earlier of extents) {
      if (earlier.id === later.id) continue;
      for (const f of earlier.fillers) {
        const fw = contentWords(byId(lines, f.id).text, { tokenize, functionWords, lemma });
        if (shared(headWords, fw) >= minShared && later.headEnd > earlier.headEnd) {
          const line = byId(lines, later.id);
          line.nests_under = f.id;
          line.depends_on = [f.id];
        }
      }
    }
  }

  // 3. a later sentence restating a filler UNDER NEGATION eliminates it
  // splitSentences returns {text, offset, order} — it already carries the
  // address, so USE IT. An earlier cut re-found each sentence with indexOf on
  // its `text`, which silently returned -1 for every one of 96 sentences (the
  // objects are not strings) and left the elimination scan with nothing to
  // read. A locator that reports "found nothing" and one that never ran are
  // indistinguishable downstream, which is exactly why the control case
  // mattered: Federalist 10, where an elimination is known to exist, reported
  // zero and looked like an honest negative.
  const located = (splitSentences(s) ?? [])
    .map((x) => (typeof x === "string" ? null : { text: x.text, start: x.offset, end: x.offset + x.text.length }))
    .filter(Boolean);

  for (const ex of extents) {
    for (const f of ex.fillers) {
      const fLine = byId(lines, f.id);
      const fw = contentWords(fLine.text, { tokenize, functionWords, lemma });
      for (const sent of located) {
        if (sent.start <= f.item.end) continue; // must come after the filler
        const sw = contentWords(sent.text, { tokenize, functionWords, lemma });
        // COVERAGE, not a raw count. A real restatement covers most of what
        // the filler is made of; a coincidental sentence shares two common
        // words out of fifteen. Measured on Federalist 10: a raw floor of 2
        // let ONE sentence "eliminate" four unrelated fillers, because
        // "number"/"representatives" are shared by everything in the
        // neighbourhood. Ratio is declared by the caller for the same reason
        // minShared is.
        const cov = fw.size ? shared(fw, sw) / fw.size : 0;
        if (shared(fw, sw) < minShared || cov < minCoverage) continue;
        // THE NEGATION MUST SCOPE OVER THE RESTATEMENT, not merely share a
        // sentence with it. Measured: "the CAUSES of faction cannot be
        // removed, and that relief is only to be sought in the means of
        // controlling its EFFECTS" correctly eliminates "removing its
        // causes" AND, sentence-scoped, also "eliminated" its opposite —
        // the very filler that clause ENDORSES. `sameClause` (received,
        // eoreader7's own closed subordinator class) is the wall: a
        // negation and the words it is claimed to negate must sit in one
        // clause. This is `negationBeforeVerbFor`'s lesson one tier up.
        const scoped = sameClauseNegation(sent.text, fw, { tokenize, negationWords, functionWords, lemma, sameClause });
        if (!scoped) continue;
        emit("SYN", "Figure", "elimination", sent, { about: f.id, verdict: "refused", depends_on: [f.id], because: scoped });
        break; // the first restatement that eliminates is the one on record
      }
    }
  }

  // 4. RESOLUTION IS ARITHMETIC: N fillers, N-1 eliminated => the survivor
  for (const ex of extents) {
    const eliminated = new Set(lines.filter((l) => l.role === "elimination").map((l) => l.about));
    const standing = ex.fillers.filter((f) => !eliminated.has(f.id));
    if (ex.fillers.length >= 2 && standing.length === 1 && eliminated.size) {
      const survivor = standing[0];
      emit("SYN", "Pattern", "resolution", { start: byIdSpan(lines, survivor.id).start, end: byIdSpan(lines, survivor.id).end },
        { about: ex.id, resolves_to: survivor.id, depends_on: [ex.id], derived: "sole survivor of a declared extent" });
    }
  }
  return lines;
}

function byId(lines, id) { return lines.find((l) => l.id === id); }
function byIdSpan(lines, id) {
  const [a, b] = byId(lines, id).at.split("#")[1].split("-").map(Number);
  return { start: a, end: b };
}

/**
 * Is there a negation in the SAME CLAUSE as a word the filler and this
 * sentence share? Returns the deciding pair, so an elimination carries the
 * words that made it rather than only the claim that something did.
 */
function sameClauseNegation(sentence, fillerWords, { tokenize, negationWords, functionWords, lemma, sameClause }) {
  if (typeof sameClause !== "function") return null;
  const words = [...sentence.matchAll(/[\p{L}\p{N}'\u2019]+/gu)].map((m) => ({ w: m[0].toLowerCase(), at: m.index }));
  const negs = words.filter((x) => negationWords.has(x.w));
  if (!negs.length) return null;
  for (const n of negs) {
    for (const x of words) {
      if (functionWords?.has(x.w)) continue;
      const key = lemma ? lemma(x.w) : x.w;
      if (!fillerWords.has(key)) continue;
      if (sameClause(sentence, n.at, x.at)) return { negation: n.w, over: x.w };
    }
  }
  return null;
}
