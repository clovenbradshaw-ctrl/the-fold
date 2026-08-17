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

/** A chapter named by its number ("2.3") or its file ("203-nine-kinds-of-where.md"),
 * against an index already parsed by parseHandbookIndex. Case- and
 * whitespace-tolerant on the number; the file match is exact. */
export function findChapter(index, want) {
  const w = String(want ?? "").trim();
  if (!w) return null;
  return index.find((c) => c.n === w || c.file === w || c.file === `${w}.md`) ?? null;
}
