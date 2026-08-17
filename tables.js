// tables.js — tables the app already knows the answer to.
//
// Asked "list my sources" or "show the records", the app has the answer in
// hand. Sending that question to a model means asking something to paraphrase
// a data structure it can only see through a paraphrase — it will drop a row,
// round a number, or invent a file. Every table here is built with
// `tableFrom` from state, and none of them costs a model call.
//
// This follows the same rule as retrieval: whether a turn is tabular is a
// deterministic function of the question's own words, not a decision handed to
// the model. For these turns the model is not asked anything at all.
//
// Pure: no DOM, no IO, no model.

import { chartFrom, tableFrom } from "./artifact.js";
import { delimitedTable } from "./source.js";
import { foldPace } from "./pace.js";
import { actsTable, paceTable, surpriseTable } from "./reflex.js";

/** Words that ask for an enumeration, in any order with the subject. */
const ASKS = /\b(table|tabulate|tabular|list|enumerate|show|display|what)\b/i;

const SUBJECTS = [
  [/\b(records?|on.?record|warrants?)\b/i, "records"],
  [/\b(sources?|materials?|files?|documents?|corpus|corpora)\b/i, "sources"],
  [/\b(folds?|summary|discourse)\b/i, "folds"],
  [/\b(passages?|citations?|refs?|references?|addresses|retrieved)\b/i, "passages"],
];

/**
 * Which table a question is asking for, or null. Requires an asking word, a
 * subject, and a possessive or definite article before that subject — the tell
 * that the subject is the app's rather than the material's. Without it, "what
 * did the report say about sources of funding" would be hijacked into a file
 * listing, and a question about the corpus must always win.
 */
export function detectTable(question) {
  const q = String(question ?? "");
  if (!ASKS.test(q)) return null;
  for (const [re, kind] of SUBJECTS) {
    const m = q.match(re);
    if (!m) continue;
    const before = q.slice(0, m.index).toLowerCase();
    if (!/\b(my|our|the|these|loaded|current)\s*$/.test(before)) continue;
    // "the document" is the app's when you are asking for it, and the
    // material's when you are asking about what is inside it. A locative
    // preposition ahead of the article is the difference: "list the ships
    // mentioned IN the document" is a question about the text, and answering
    // it with a file listing would be worse than answering it badly.
    if (/\b(in|from|within|inside|across|throughout|during|per|on)\s+\w*\s*$/.test(before))
      continue;
    return kind;
  }
  return null;
}

const DASH = "—";
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Returns `{table, caption}` or null when there is nothing to show.
 *
 * The caption travels beside the segment rather than on it: a built table and
 * a parsed one are the same object shape, and one renderer draws both. Adding
 * a field here that the parser cannot produce would make that quietly untrue.
 */
export function buildTable(kind, state) {
  const build = BUILDERS[kind];
  return build ? build(state) : null;
}

const BUILDERS = {
  records({ summary }) {
    const records = summary?.records ?? [];
    if (!records.length) return null;
    return caption(
      tableFrom(records, [
        { label: "Turn", get: (r) => r.turn },
        { label: "What it established", get: (r) => r.gist },
        { label: "Checked against", get: (r) => r.refs.join("\n") || DASH },
        { label: "Left open", get: (r) => r.open.join("; ") || DASH },
      ]),
      `${plural(records.length, "record")} · computed, not generated`,
    );
  },

  sources({ sources, chunks, muted }) {
    const names = Object.keys(sources ?? {});
    if (!names.length) return null;
    return caption(
      tableFrom(names, [
        { label: "Source", get: (n) => n },
        { label: "Passages", get: (n) => chunks.filter((c) => c.source === n).length },
        { label: "Characters", get: (n) => sources[n].length.toLocaleString() },
        { label: "Read from", get: (n) => (muted.has(n) ? "no" : "yes") },
      ]),
      `${plural(names.length, "source")} · computed, not generated`,
    );
  },

  folds({ summary }) {
    const folds = summary?.folds ?? [];
    if (!folds.length) return null;
    // The fold list is bounded, so the first row is not always turn 1.
    const first = (summary.turnCount ?? folds.length) - folds.length + 1;
    return caption(
      tableFrom(folds, [
        { label: "Turn", get: (_f, i) => first + i },
        { label: "Fold", get: (f) => f },
      ]),
      `${plural(folds.length, "fold")} kept of ${summary.turnCount} turns · computed, not generated`,
    );
  },

  passages({ passages }) {
    if (!passages?.length) return null;
    return caption(
      tableFrom(passages, [
        { label: "Address", get: (p) => p.ref },
        { label: "Opening", get: (p) => firstLine(p.text) },
      ]),
      `${plural(passages.length, "passage")} retrieved last turn · computed, not generated`,
    );
  },

  // ── the self plane's levels (reflex.js owns the shapes) ────────────────────
  // Same rule as every builder above: the app has these rows in hand, and a
  // model paraphrasing its own act ledger or its own measured surprise is the
  // introspection version of the failure this file exists to refuse.

  acts({ reflexLog }) {
    return actsTable(reflexLog);
  },

  surprise({ meter }) {
    return surpriseTable(meter);
  },

  pace({ paceLog, model }) {
    return paceTable(paceLog && model ? foldPace(paceLog, model) : null);
  },
};

/** What to say when the answer is honestly empty. */
export const NOTHING = {
  records: "No turns have been checked against material yet, so there are no records.",
  sources: "No material is loaded.",
  folds: "Nothing has been folded yet.",
  passages: "No passages were retrieved on the last turn.",
  acts: "The ledger is empty — no act has been recorded in this conversation yet.",
  surprise: "Nothing has arrived yet, so nothing has been measured.",
  pace: "Pace is unmeasured — no completed call on this model yet.",
};

function caption(table, text) {
  return { table, caption: text };
}

function firstLine(text) {
  const t = String(text).replace(/\s+/g, " ").trim();
  return t.length > 120 ? t.slice(0, 117) + "..." : t;
}

// ── charts the app already knows the answer to ─────────────────────────────
//
// "Chart the filings in monthly-totals-2020.csv" is the tables rule one rung
// up: the rows are loaded bytes, the aggregation (if any) already happened
// before the file was loaded, and the drawing is geometry. A model asked to
// produce this retypes twelve figures at two tokens a second and gets cut
// off by its own decode budget — measured live, 2026-08-16, before this door
// existed. Whether a turn is a chart turn is a deterministic function of the
// question's own words; the source is found by its NAME in the question
// (P11 — names are referents); the columns are read off the file's own
// header. No model call anywhere.

/** Words that ask for a drawing rather than an enumeration. */
const DRAWS = /\b(chart|graph|plot|visuali[sz]e|visuali[sz]ation)\b/i;

export function detectChart(question) {
  return DRAWS.test(String(question ?? ""));
}

/**
 * Split a source's text as delimited rows. The delimiter is whichever of
 * comma / tab / semicolon splits the header into the most cells — read off
 * the bytes, never declared. Returns {head, rows} or null when the text is
 * not tabular (fewer than two columns or two lines).
 */
export function delimitedRows(text) {
  // The walk itself lives in source.js::delimitedTable — one quote-aware
  // scanner for every reader of delimited bytes. This wrapper keeps the
  // name and contract every caller already has. The naive String.split
  // version that used to live here burst quoted cells at their own commas:
  // measured on the first real dataset the measuring door met (USGS
  // all_month.csv), 10,549 of 10,733 rows came out too wide and every
  // column right of `place` silently shifted.
  return delimitedTable(text);
}

/**
 * A bar chart of a loaded source, or a typed gap saying which leg is
 * missing. The source is the one whose name the question carries; y is the
 * first column whose every value is a number (a header word named in the
 * question wins); x is the first remaining column. The title is the
 * question's own words after "title it:" when given, the columns' names
 * otherwise. Returns {seg, caption, source} | {gap}.
 */
export function chartOf(question, sources = []) {
  const q = String(question ?? "");
  const named = sources
    .filter((s) => s.name && q.toLowerCase().includes(s.name.toLowerCase()))
    .sort((a, b) => b.name.length - a.name.length)[0];
  if (!named)
    return { gap: "no loaded source is named in the question — a chart draws a file's own rows, so say which file" };
  const parsed = delimitedRows(named.text);
  if (!parsed)
    return { gap: `${named.name} does not read as delimited rows, so there is nothing to chart`, source: named.name };
  const { head, rows } = parsed;
  const numeric = head.map((_, c) =>
    rows.every((r) => r[c] !== undefined && r[c] !== "" && Number.isFinite(Number(r[c]))),
  );
  const namedCol = (want) =>
    head.findIndex(
      (h, c) => numeric[c] === want && h && new RegExp(`\\b${h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(q),
    );
  let yi = namedCol(true);
  if (yi === -1) yi = numeric.indexOf(true);
  if (yi === -1)
    return { gap: `${named.name} has no all-numeric column, so there is no series to draw`, source: named.name };
  let xi = namedCol(false);
  if (xi === -1) xi = head.findIndex((_, c) => c !== yi && !numeric[c]);
  if (xi === -1) xi = head.findIndex((_, c) => c !== yi);
  const titled = q.match(/title(?:d)?(?:\s+it)?\s*:?\s*["'“]?(.+?)["'”]?\s*$/im);
  const seg = chartFrom(rows, {
    x: { label: head[xi], get: (r) => r[xi] },
    y: { label: head[yi], get: (r) => Number(r[yi]) },
    title: titled ? titled[1] : `${head[yi]} by ${head[xi]} · ${named.name}`,
  });
  return {
    seg,
    source: named.name,
    caption:
      `bar chart · ${head[yi]} by ${head[xi]} · ${named.name} · ${seg.rows} row(s)` +
      (seg.dropped ? ` · ${seg.dropped} dropped (non-numeric)` : "") +
      ` · every figure is the file's own bytes, no model call`,
  };
}

/**
 * The table as text, for the transcript. A later turn's recency window may
 * include this answer, and the model should see the rows it is following up
 * on rather than a note that a table was drawn.
 */
export function toMarkdown(table) {
  const esc = (s) => String(s).replace(/\n/g, " ").replace(/\|/g, "\\|");
  return [
    `| ${table.head.map(esc).join(" | ")} |`,
    `| ${table.head.map(() => "---").join(" | ")} |`,
    ...table.rows.map((r) => `| ${r.map(esc).join(" | ")} |`),
  ].join("\n");
}
