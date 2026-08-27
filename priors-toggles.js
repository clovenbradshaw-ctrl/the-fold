// priors-toggles.js — the priors organ's GATE: which slices of live_priors
// are in play, decided at any level, folded from an append-only ledger.
// Pure logic here (testable offline, browser-safe); the I/O half — the
// ledger file, the corpus walk, the confinement — lives in
// explore-server.mjs, the split library.js and web.js already keep.
//
// This file is the toggle/browse tier; priors.js (a sibling session's
// module, same day) is the CHECKING tier — a claim against the library.
// They share one reading of a document's papers: parseFrontmatter and
// provenanceOf are imported from priors.js, never re-implemented, so "what
// does this document's header say" cannot drift between the tab that shows
// it and the check that cites it.
//
// The three rules this file holds:
//
// 1. A prior arrives OFF. The corpus arrived wholesale (2,000+ documents
//    fetched by script), so nothing in it is "material you took the trouble
//    to attach" — enabling is the explicit act, at whatever level the
//    reader means: the whole corpus (""), a genre ("06-government-legal"),
//    a collection (".../world-legislation/de"), one document. The library's
//    starts-empty posture, applied to a corpus already on disk; live_priors'
//    own boundary ("never auto-ingested") kept.
//
// 2. Toggles are an append-only ledger, folded. Every flip at every level
//    is one line; current state is the fold; nothing edits in place. The
//    most SPECIFIC declaration on a document's path decides it — disable a
//    genre, re-enable one statute inside it, and the statute is on because
//    its own path says so — and the decision always names the level that
//    made it, so inherited state never dresses as chosen state.
//
// 3. Papers ride every crossing. A document's provenance line (its
//    publisher's own frontmatter, canonically aliased by priors.js) goes
//    wherever the document goes — the tab's card, a chat attachment, a
//    re-opened ref — so a cited prior answers "says who?" with the
//    institution that published it, not with a file path.

import { parseFrontmatter, provenanceOf } from "./priors.js";

/** A ledger path, one shape: corpus-relative, "/"-separated, no leading or
 * trailing slash. "" names the corpus root — the everything toggle. */
export function normalizePriorPath(p) {
  return String(p ?? "")
    .split("\\").join("/")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

/**
 * The toggle ledger, folded. Every line is {path, on, at}; the newest line
 * per path wins (file order, not clock — one server appends). Unparseable
 * or shapeless lines are counted, never silently skipped — library.js::
 * foldLibrary's own discipline.
 */
export function foldPriorToggles(jsonl) {
  const byPath = new Map();
  let skipped = 0;
  for (const line of String(jsonl ?? "").split("\n")) {
    if (!line.trim()) continue;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      skipped++;
      continue;
    }
    if (!obj || typeof obj.path !== "string" || typeof obj.on !== "boolean") {
      skipped++;
      continue;
    }
    byPath.set(normalizePriorPath(obj.path), { on: obj.on, at: obj.at ?? null });
  }
  return { byPath, skipped };
}

/**
 * What decides a path, and what it decided. The most specific declaration
 * on the path's own ancestry wins: the path itself, then each parent, then
 * "" (the corpus root). No declaration anywhere → off by default, decidedBy
 * null — the default is a fact of this file, not a hidden ledger line.
 */
export function effectivePrior(byPath, relPath) {
  let p = normalizePriorPath(relPath);
  while (true) {
    const d = byPath.get(p);
    if (d) return { on: d.on, decidedBy: p, at: d.at ?? null };
    if (p === "") return { on: false, decidedBy: null, at: null };
    const cut = p.lastIndexOf("/");
    p = cut === -1 ? "" : p.slice(0, cut);
  }
}

/**
 * Whether a document's path falls within a declared SCOPE — a caller-named
 * restriction for one request, never persisted, never a substitute for the
 * ledger above. Same ancestry test `effectivePrior` climbs, read the other
 * direction: true when `relPath` IS `scope` or sits anywhere inside it. No
 * scope (null/empty) admits everything — scoping is opt-in, so an ordinary
 * check's candidate set is unchanged unless a caller asks for a slice.
 *
 * Named for the case a corpus grown by (geography, period) folders needs:
 * checking a claim against exactly one dated, placed slice of live_priors
 * (a "universe") rather than whatever happens to be toggled on for browsing
 * — an instrument's deliberate choice, not the reader's ambient setting, so
 * it composes with `effectivePrior` (AND, never OR): a document a person
 * has toggled off stays off even when a scope would otherwise admit it.
 */
export function withinPriorScope(relPath, scope) {
  const s = normalizePriorPath(scope);
  if (!s) return true;
  const p = normalizePriorPath(relPath);
  return p === s || p.startsWith(s + "/");
}

/** The declarations as JSON-shaped rows for the wire, sorted by path so the
 * same ledger always serializes the same way. */
export function declarationRows(byPath) {
  return [...byPath.entries()]
    .map(([path, d]) => ({ path, on: d.on, at: d.at }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

/** Rebuild the Map from the wire shape — the browser side of declarationRows. */
export function declarationsFrom(rows) {
  const byPath = new Map();
  for (const r of Array.isArray(rows) ? rows : []) {
    if (r && typeof r.path === "string" && typeof r.on === "boolean") {
      byPath.set(normalizePriorPath(r.path), { on: r.on, at: r.at ?? null });
    }
  }
  return byPath;
}

/**
 * A document's papers, one call: parseFrontmatter + provenanceOf (priors.js,
 * the one implementation), shaped for the tab and the chat. provenance is
 * null when the document carries no header — absence is a result. bodyStart
 * is parseFrontmatter's offset: the text is never sliced here, addresses
 * keep naming the file as it sits on disk.
 */
export function papersOf(text) {
  const { meta, offset, title } = parseFrontmatter(text);
  const has = Object.keys(meta).length > 0;
  const provenance = has ? provenanceOf(meta) : null;
  if (provenance && title && provenance.title == null) provenance.title = title;
  return { provenance, line: provenanceLine(provenance), bodyStart: offset, title };
}

// The papers line's fields, in the order a reader wants them — the
// canonical aliases priors.js::provenanceOf fills (url / publisher / date)
// plus the header's own title, country and status. A declared ordering
// rule; absent fields are simply absent.
const PROVENANCE_LINE_FIELDS = ["title", "publisher", "country", "date", "status", "url"];

/**
 * One line of papers for wherever a prior is referenced. Mechanical
 * concatenation of the document's own fields; null when there is nothing to
 * say, so callers can tell "no papers" from an empty string.
 */
export function provenanceLine(prov) {
  if (!prov || typeof prov !== "object") return null;
  const parts = [];
  for (const f of PROVENANCE_LINE_FIELDS) {
    const v = prov[f];
    if (typeof v === "string" && v.trim()) parts.push(f === "country" ? v.toUpperCase() : v);
  }
  return parts.length ? parts.join(" · ") : null;
}
