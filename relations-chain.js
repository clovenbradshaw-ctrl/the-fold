// relations-chain.js — front and back handles on the relation list.
//
// MEASURED MOTIVATION (live Kutuzov page, 2026-08-17): the relations view
// rendered an unordered bag of isolated triples, and many were clause
// fragments that carry no meaning alone — "would write —that→ he would be
// remembered amongst Europe's most famous commanders", "and —that→ Russia
// would never forget", "had served —for→ 30 years with". Those fragments are
// not extraction failures to patch here: the extractor is the engine's
// declared heuristic and its residues (subordinate "that" clauses consuming
// an edge among them) are engine territory (CLAUDE.md, the grounding
// ladder). What IS this repo's to fix is that the view threw away the one
// thing that makes a fragment readable — its neighbours. A subordinate
// clause completes the statement before it; a statement about Kutuzov sits
// among the other statements about Kutuzov. This module derives those links,
// mechanically, with no model call anywhere.
//
// THREE HANDLES, EACH A MEASUREMENT, NEVER A GUESS:
//
//   prev / next — the discourse chain. extractRelations walks the text with
//     one forward regex and dedups on first statement, so the relation list
//     IS document order. Each relation is located back in the text (its own
//     words, whitespace-loose — the engine reads across hard-wrapped
//     newlines, so the locator must too), and two neighbours link only when
//     they are discourse-adjacent: in the same clause, in the same sentence,
//     or in clauses that share one boundary. The boundary characters are the
//     engine's own — SENTENCE_END's [.!?;] and clauseEndAfter's [.,;]
//     (perceiver/text/relations.js), unioned for the clause count because a
//     sentence ender necessarily ends its clause. The counts 0 and 1 are
//     structural facts (same unit; adjacent units), not tuned thresholds —
//     the same standing binding.js's "arrivals >= 2" minimum has.
//
//   shared — the referent siblings. Two relations link when an endpoint of
//     each resolves to the same referent, where "the same" is the engine's
//     own answer: the referent rows are sessionReferents' output (surfaces
//     grouped into identities by discoverReferents — never re-derived here),
//     and an endpoint mentions a referent exactly when one of its
//     ESTABLISHED surfaces appears word-bounded in the endpoint's text,
//     folded on both sides (P11: the string fold is the orthographic slice
//     of referent identity, licensed by the referent). This is the same
//     containment rule hypergraph.js's endpoint reader applies.
//
// A relation the locator cannot place back in the text keeps where: null and
// takes no chain handles — disclosed, never guessed — while its located
// neighbours chain past it and its referent handles still stand (they need
// no position). Pure module, organs injected (the cast.js pattern): diaNorm
// arrives as an argument because this file is imported by the page (which
// loads the engine from /engine) and by the node tests (relative path).
// Nothing here mutates its input; the annotated list is a new one.

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const words = (s) =>
  String(s ?? "")
    .split(/\s+/)
    .filter(Boolean);

// The engine's own boundary sets (perceiver/text/relations.js): SENTENCE_END
// is [.!?;]; clauseEndAfter walks [.,;]. The clause set here is their union —
// a character that ends a sentence ends the clause it closes.
const SENTENCE_END_CHARS = new Set([".", "!", "?", ";"]);
const CLAUSE_END_CHARS = new Set([".", ",", ";", "!", "?"]);

// How two located neighbours relate, from the boundary counts alone:
//   0 clause boundaries between them  -> same clause
//   0 sentence boundaries             -> same sentence (commas between)
//   1 clause boundary                 -> adjacent clauses (the boundary may
//                                        be a sentence ender: the last clause
//                                        of one sentence and the first of the
//                                        next are still adjacent)
//   anything else                     -> not discourse-adjacent; no handle.
function linkKind(gap) {
  let clauses = 0;
  let sentences = 0;
  for (const ch of gap) {
    if (CLAUSE_END_CHARS.has(ch)) clauses++;
    if (SENTENCE_END_CHARS.has(ch)) sentences++;
  }
  if (clauses === 0) return "same-clause";
  if (sentences === 0) return "same-sentence";
  if (clauses === 1) return "adjacent-clause";
  return null;
}

// Locate one relation's own words in the text, searching forward from
// `cursor` — the list is in document order, so a forward-only scan visits
// each region once (the engine's own forward-only discipline in
// extractRelations' terminator scan). The pattern is the relation's exact
// tokens separated by \s+ (the engine's object capture spans hard-wrap
// newlines, so the locator's whitespace must too), the verb matched
// case-insensitively because extractRelations lowercases it at birth, and
// the whole guarded by the engine's own word-start lookbehind. Falls back to
// subject+verb alone when the full triple does not match (the engine trims
// trailing punctuation off objects); returns null rather than guessing.
function locate(rel, text, cursor) {
  const subj = words(rel.subject).map(escapeRe).join("\\s+");
  const verb = escapeRe(String(rel.verb ?? ""));
  const obj = words(rel.object).map(escapeRe).join("\\s+");
  if (!subj || !verb) return null;
  const anchor = `(?<=^|[^\\p{L}])(${subj}\\s+${verb})`;
  for (const body of [obj ? `${anchor}\\s+${obj}(?=$|[^\\p{L}\\p{N}])` : null, `${anchor}(?=$|[^\\p{L}])`]) {
    if (!body) continue;
    const re = new RegExp(body, "giu");
    re.lastIndex = cursor;
    const m = re.exec(text);
    if (m) return { start: m.index, end: m.index + m[0].length, anchorEnd: m.index + m[1].length };
  }
  return null;
}

/**
 * `chainRelations(relations, { text, referents, diaNorm })` — the engine's
 * relation list (sessionRelations / extractRelations order, i.e. document
 * order) annotated with handles. Returns a NEW array of
 *
 *   { ...relation, index,
 *     where:  {start, end} | null      — char offsets into `text` (c-space),
 *     prev:   {index, link} | null     — the discourse chain, backward,
 *     next:   {index, link} | null     — and forward,
 *     shared: [{index, via: [names]}] }— relations sharing a resolved
 *                                        endpoint, document order, `via`
 *                                        naming the shared referent(s).
 *
 * `referents` is sessionReferents' own rows ({id, display?, surfaces}) — the
 * engine's ONE grouping of surfaces into identities, consumed, never
 * re-derived. `diaNorm` is the engine's fold, injected. Both optional: no
 * text means no chain handles, no referents means no shared handles — each
 * absence leaves null/empty, never a guess.
 */
export function chainRelations(relations, { text = "", referents = [], diaNorm = (s) => String(s ?? "") } = {}) {
  const list = Array.isArray(relations) ? relations : [];
  const s = String(text ?? "");

  // ── locate each relation, forward-only ────────────────────────────────
  const rows = [];
  let cursor = 0;
  for (let i = 0; i < list.length; i++) {
    const rel = list[i] ?? {};
    const at = s ? locate(rel, s, cursor) : null;
    if (at) cursor = at.anchorEnd;
    rows.push({ ...rel, index: i, where: at ? { start: at.start, end: at.end } : null, prev: null, next: null, shared: [] });
  }

  // ── the discourse chain over the located subsequence ──────────────────
  let last = null; // previous located row
  for (const row of rows) {
    if (!row.where) continue;
    if (last) {
      const gap = row.where.start > last.where.end ? s.slice(last.where.end, row.where.start) : "";
      const link = linkKind(gap);
      if (link) {
        last.next = { index: row.index, link };
        row.prev = { index: last.index, link };
      }
    }
    last = row;
  }

  // ── referent handles ──────────────────────────────────────────────────
  // One pattern per established surface, word-bounded, folded on both sides
  // — hypergraph.js's containment rule, against the engine's own grouping.
  const cast = [];
  for (const r of referents ?? []) {
    if (!r) continue;
    const surfaces = (r.surfaces ?? [])
      .map((x) => (typeof x === "string" ? x : x?.surface))
      .filter((x) => typeof x === "string" && x && !/@\d+-\d+$/.test(x)); // positional handles are not countable text (corpus.js's own rule)
    if (!surfaces.length) continue;
    const display = r.display ?? [...surfaces].sort((a, b) => b.length - a.length)[0];
    cast.push({
      id: r.id ?? display,
      display,
      patterns: surfaces.map((x) => new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRe(diaNorm(x))}(?:$|[^\\p{L}\\p{N}])`, "iu")),
    });
  }

  if (cast.length) {
    const displayOf = new Map(cast.map((c) => [c.id, c.display]));
    const mentions = (str) => {
      const folded = diaNorm(String(str ?? ""));
      const ids = new Set();
      for (const c of cast) if (c.patterns.some((re) => re.test(folded))) ids.add(c.id);
      return ids;
    };
    const idsByRow = rows.map((row) => new Set([...mentions(row.subject), ...mentions(row.object)]));
    const rowsByReferent = new Map();
    for (let i = 0; i < rows.length; i++) {
      for (const id of idsByRow[i]) {
        if (!rowsByReferent.has(id)) rowsByReferent.set(id, []);
        rowsByReferent.get(id).push(i);
      }
    }
    for (let i = 0; i < rows.length; i++) {
      const viaByIndex = new Map(); // sibling index -> Set(shared referent ids)
      for (const id of idsByRow[i]) {
        for (const j of rowsByReferent.get(id)) {
          if (j === i) continue;
          if (!viaByIndex.has(j)) viaByIndex.set(j, new Set());
          viaByIndex.get(j).add(id);
        }
      }
      rows[i].shared = [...viaByIndex.keys()]
        .sort((a, b) => a - b) // document order — nearest-first is a display choice, not this module's
        .map((j) => ({ index: j, via: [...viaByIndex.get(j)].map((id) => displayOf.get(id)).sort() }));
    }
  }

  return rows;
}
