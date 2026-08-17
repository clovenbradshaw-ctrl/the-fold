// folds-pane.js — the Folds panel's pure half.
//
// The panel grew past a scroll: it needs search, an ordering, and a compact
// list face, and it needs the `/fold <n> <instruction>` chat door that routes
// a model revision onto an existing fold's own log. Everything mechanical
// about those lives here — no DOM, no IO, no model — so the walls are
// testable in node and the page only draws what these functions return.
//
// A row is a plain summary the page derives from a fold's log at render
// time: { n, caption, lang, type, address, code, addenda }. Nothing here
// reads a log; the fold over the log is build-log.js's job and stays there.

/**
 * The orderings on offer, each one a declared mechanical rule — never "best
 * first", which would make the default the most flattering available view
 * (FOLD-CONSTITUTION III.1). The panel's default is `newest`, by the rule
 * the panel has always declared: the thing just produced is the thing being
 * looked at.
 */
export const FOLD_SORTS = Object.freeze([
  Object.freeze({ key: "newest", label: "newest first" }),
  Object.freeze({ key: "oldest", label: "oldest first" }),
  Object.freeze({ key: "name", label: "name A→Z" }),
  Object.freeze({ key: "addenda", label: "most addenda" }),
]);

/**
 * The chat door: `/fold <n> <instruction>`. The number IS the reference —
 * the door carries the target mechanically, so whatever code the model
 * returns lands on that fold's log regardless of how its prose phrases the
 * work (the same discipline builds.js::referencedBuild holds: nothing the
 * model could phrase as intent is trusted). Returns null unless both the
 * number and a non-empty instruction are present; the caller answers a bare
 * `/fold` with its usage line.
 */
export function parseFoldCommand(text) {
  const m = String(text ?? "").match(/^\/fold\s+#?(\d+)\s+(\S[\s\S]*)$/);
  return m ? { n: Number(m[1]), instruction: m[2].trim() } : null;
}

/**
 * Every term of the query must appear somewhere in the fold's own words —
 * its address, caption, language, kind, or code. Case folds; nothing is
 * ranked (a filter that ordered by "relevance" would be a judgment wearing
 * a setting's clothes — the ordering belongs to sortFolds's declared keys).
 * An empty query hides nothing.
 */
export function filterFolds(rows, query) {
  const terms = String(query ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (!terms.length) return [...rows];
  return rows.filter((r) => {
    const hay = [`fold ${r.n}`, `build ${r.n}`, r.caption, r.lang, r.type, r.address, r.code]
      .filter((v) => v != null && v !== "")
      .join(" ")
      .toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}

/**
 * Order a copy of the rows by one declared key. An unknown key throws —
 * a silent fallback would be a default nobody chose (II.1: defaults are
 * givers and must sign; this module refuses to sign for one).
 */
export function sortFolds(rows, key) {
  const cmp = {
    newest: (a, b) => b.n - a.n,
    oldest: (a, b) => a.n - b.n,
    name: (a, b) =>
      String(a.caption ?? "").localeCompare(String(b.caption ?? "")) || a.n - b.n,
    addenda: (a, b) => (b.addenda ?? 0) - (a.addenda ?? 0) || b.n - a.n,
  }[key];
  if (!cmp) throw new TypeError(`sortFolds: unknown sort ${JSON.stringify(key)}`);
  return [...rows].sort(cmp);
}

/**
 * The code segment a `/fold` revision lands: the first fenced block whose
 * language matches the fold's own (a bare fence counts as a match — models
 * routinely drop the tag), else the first fenced block at all. Mechanical
 * preference, declared here once, so a reply that fences a shell one-liner
 * before the revised program still lands the program when the languages say
 * so. Returns null when the reply carried no code — the caller renders that
 * as a typed gap, never as a silent no-op.
 */
export function pickRevisionSegment(segments, lang) {
  const code = (segments ?? []).filter((s) => s?.type === "code" && String(s.code ?? "").trim());
  if (!code.length) return null;
  const want = String(lang ?? "").toLowerCase();
  return code.find((s) => !s.lang || String(s.lang).toLowerCase() === want) ?? code[0];
}
