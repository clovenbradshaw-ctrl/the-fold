// line-diff.js — a line-by-line diff for DISPLAY only. Nothing here decides
// what changes: the Coding pane's iteration lands its edit mechanically
// (build-log.js's applyOps, off the model's own {find, add} bytes, never a
// diff) — this module answers a later, different question, "what did that
// change look like", over the before/after text the patch already
// produced. Pure: two strings in, a line-typed array out.
//
// LCS over lines, not characters — a line-diff view (the convention this
// pane is built to match) reads as edited LINES, not a tangle of character
// runs. O(n*m) table; the-fold's own generated functions and edited folds
// run tens to low hundreds of lines, never a scale where this needs to be
// sub-quadratic — diffLinesBounded refuses rather than spending unbounded
// memory on a pair of genuinely huge texts (P9's own "named budgets" rule).

/** Every line of `oldText` and `newText`, typed same/remove/add — a
 *  standard LCS-backed line diff. Lines compare by exact string equality
 *  (no whitespace folding: a real edit that changed only indentation
 *  should read as a real edit, not vanish). */
export function diffLines(oldText, newText) {
  const a = String(oldText ?? "").split("\n");
  const b = String(newText ?? "").split("\n");
  const n = a.length, m = b.length;
  // lcs[i][j] = length of the LCS of a[i:] and b[j:]
  const lcs = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ type: "same", line: a[i] }); i += 1; j += 1; }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) { out.push({ type: "remove", line: a[i] }); i += 1; }
    else { out.push({ type: "add", line: b[j] }); j += 1; }
  }
  while (i < n) { out.push({ type: "remove", line: a[i] }); i += 1; }
  while (j < m) { out.push({ type: "add", line: b[j] }); j += 1; }
  return out;
}

// Set by hand, not measured against real material (II.11's own disclosed
// "received" half): a round ~2000x2000-line ceiling, chosen because nothing
// this app's own code-piece/fold pipelines produce comes remotely close to
// it — a real generated function or edited fold runs tens to low hundreds
// of lines. A caller past it should show the two texts whole rather than
// wait on an unbounded table.
export const DIFF_MAX_CELLS = 4_000_000;

/** `diffLines`, refused (returns null) above DIFF_MAX_CELLS table cells
 *  rather than silently spending the memory — the one this pane's renderer
 *  should actually call. */
export function diffLinesBounded(oldText, newText) {
  const n = String(oldText ?? "").split("\n").length;
  const m = String(newText ?? "").split("\n").length;
  if (n * m > DIFF_MAX_CELLS) return null;
  return diffLines(oldText, newText);
}
