// handbook.js — the vendored EO Reader 6 / EO Chat handbook (`handbook/`,
// copied whole from the `eoreaderhandbook` repo, P1: local, nothing
// fetched off-host) as an addressable table of contents. Pure: this file
// only parses bytes already read; term.js and app.js own the fetch.
//
// The chapter list is DERIVED from `handbook/000-index.md`'s own table of
// contents — "- [N.N Title](file.md)" lines — never hand-duplicated here.
// The index is the one place chapter numbers and titles are written; a
// chapter added there is available everywhere this module is used without
// a second edit.

const TOC_LINE = /^-\s*\[([\d.]+)\s+([^\]]+)\]\(([^)]+\.md)\)/;

/** [{n, title, file}] in the index's own order. Lines that are not a TOC
 * entry (prose, blank lines, headings) are simply not matches — parsing a
 * loose document, never a fixed grammar it must obey line-for-line. */
export function parseHandbookIndex(md) {
  const out = [];
  for (const line of String(md ?? "").split(/\r?\n/)) {
    const m = line.match(TOC_LINE);
    if (m) out.push({ n: m[1], title: m[2].trim(), file: m[3].trim() });
  }
  return out;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A chapter named by its number ("2.3"), its file
 * ("203-nine-kinds-of-where.md") — or, failing both, a single distinctive
 * word from its own title ("constitution", "witness"), against an index
 * already parsed by parseHandbookIndex. Case- and whitespace-tolerant on
 * the number; the file match is exact.
 *
 * The title fallback exists because `/help`'s own documented `/learn`
 * example ("/learn constitution") named a chapter by a word from its
 * title, never by number or filename — typed exactly as shown, the door
 * found nothing (found live, 2026-09-15, `task_23bbb378`'s sibling bug).
 * Neither a chapter's number nor its filename is memorable; a word from
 * its own title usually is, so this generalizes rather than just patching
 * one example. Matched whole-word, case-insensitively, against every
 * title, and only when the word names EXACTLY ONE chapter — several of
 * this handbook's own title words ("the", "nine", "memory"...) recur
 * across more than one chapter, and a query that could mean more than one
 * must refuse rather than silently guess which one the reader meant (this
 * app's standing rule: withhold, never manufacture). A query under 4
 * characters never reaches this fallback at all — short words are almost
 * always function words ("an", "at", "it"), never worth a title search. */
export function findChapter(index, want) {
  const w = String(want ?? "").trim();
  if (!w) return null;
  const named = index.find((c) => c.n === w || c.file === w || c.file === `${w}.md`);
  if (named) return named;
  if (w.length < 4) return null;
  const hits = index.filter((c) => new RegExp(`\\b${escapeRe(w)}\\b`, "i").test(c.title));
  return hits.length === 1 ? hits[0] : null;
}
