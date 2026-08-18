// store-sql.js — deriving store.js events from REAL SQL execution, never by
// parsing SQL ourselves.
//
// sql.js exposes no AST: there is no organ here to search for that would
// hand back "this text is an UPDATE touching these columns". What sql.js
// DOES give for free is the one thing store.js actually needs — the
// truth of what changed — so this module lets the statement run against
// the live in-memory database exactly as it already does, and DIFFS the
// affected table's rows before and after using SQLite's own built-in
// `rowid` as each row's stable identity. From that diff: a rowid present
// after but not before is a birth (insertRow); a rowid in both with
// different column values is a revision (updateRow, changed columns only —
// never a whole-row resend, because store.js's own merge semantics are
// per-key); a rowid before but not after is a retraction (deleteRow). A
// bare SELECT changes nothing between the two snapshots, so it produces no
// ops and never touches the store log at all — no special-casing needed to
// make that true, it falls out of the diff being empty.
//
// This is Choreo's own "snapshot ingest generates operations" pattern
// (github.com/clovenbradshaw-ctrl/Choreo), read one register over: Choreo
// diffs a snapshot handed to it from OUTSIDE; here the snapshot is taken on
// either side of a statement THIS instrument itself just ran. Same idea —
// diff raw state, emit granular typed ops, never trust a caller's own
// characterization of what it did — applied to a different source of raw
// state. Named here, not silently reinvented.
//
// Pure: no DOM, no Worker globals, no engine import. Two boundaries hand
// this module its raw material rather than it reaching for either: the
// live `db` (or its raw `exec()` result shapes) is the caller's to hold —
// term-sql-worker.js still owns the only running SQLite instance, exactly
// as P18 already requires — and the actual `insertRow`/`updateRow`/
// `deleteRow` calls (which need store.js's injected task-log engine) are
// the caller's too. This module only ever turns "here is a table's rows
// before, and after" into "here is what happened", as plain typed objects.
// That split is what makes it testable against the real `sql.js` package in
// Node with zero stubbing (store-sql.test.mjs) — the exact discipline
// store.test.mjs already holds for store.js itself.

/** Does this SQL text contain a row-mutating statement at all? Checked
 * before any snapshot is taken — a bare SELECT (or a dot-command already
 * turned into one, or DDL alone) never pays for a `SELECT rowid, *` round
 * trip it has no use for. */
const MUTATING_RE = /\b(INSERT|UPDATE|DELETE|REPLACE)\b/i;
export function looksMutating(sql) {
  return MUTATING_RE.test(String(sql ?? ""));
}

// The cheap detection the header promises: bare identifiers only (no
// schema-qualified names, no quoting) — the same disclosed limitation
// store.js's own materializeSql already carries for identifiers it writes,
// extended here to identifiers this module only ever READS off statement
// text. A name this misses (quoted, bracketed oddly, buried in a subquery)
// is not a defect in the mutation itself — the caller falls back to the
// full table list, which is always correct, just not as cheap.
const TABLE_RE = /\b(?:INSERT\s+(?:OR\s+\w+\s+)?INTO|UPDATE|DELETE\s+FROM|REPLACE\s+INTO)\s+["'`[]?([A-Za-z_][A-Za-z0-9_]*)["'`\]]?/gi;

/** Every table name a mutating statement's own text names, in first-seen
 * order, deduplicated — never a table it merely reads (a subquery's source,
 * a join). An empty return means "could not cheaply tell" — the caller's
 * signal to fall back to the live db's own full table list, not a claim
 * that nothing was touched. */
export function detectTables(sql) {
  const text = String(sql ?? "");
  const seen = new Set();
  const out = [];
  const re = new RegExp(TABLE_RE.source, TABLE_RE.flags);
  let m;
  while ((m = re.exec(text))) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      out.push(m[1]);
    }
  }
  return out;
}

/**
 * One table's raw `db.exec("SELECT rowid, * FROM t")` result — `{columns,
 * values}` with `rowid` first — turned into `Map<rowId, {col: value}>`.
 * `result` is `undefined` (sql.js omits the whole result-set object when a
 * SELECT matches zero rows — confirmed against the real package, never
 * assumed) or `null` (the caller's own convention for "no such table",
 * since sql.js THROWS on that rather than returning anything) or the raw
 * object itself. All three "nothing here" cases collapse to the same empty
 * map — an empty table and an absent table diff identically, which is
 * exactly right: neither has any rows for the other side to differ from.
 */
export function snapshotFromExec(result) {
  const map = new Map();
  if (!result || !Array.isArray(result.columns) || !Array.isArray(result.values)) return map;
  const [, ...cols] = result.columns; // rowid is always first — the caller's own SELECT put it there
  for (const row of result.values) {
    const [rowid, ...vals] = row;
    const record = {};
    cols.forEach((c, i) => {
      record[c] = vals[i];
    });
    map.set(String(rowid), record);
  }
  return map;
}

/**
 * The diff itself, over two already-snapshotted maps for ONE table —
 * store.js's own row identity (`rowId`, a string) is the key throughout,
 * matching what `insertRow`/`updateRow`/`deleteRow` already expect. Column
 * comparison is per-key, never a whole-row resend: an update op carries
 * ONLY the columns whose value actually changed, because that is what
 * store.js's updateRow means by "changed columns" — a caller that resent
 * every column on every update would defeat the very merge semantics
 * store.js's own header spends a paragraph explaining.
 */
export function diffSnapshots(before, after) {
  const ops = [];
  for (const [rowId, row] of after) {
    const prior = before.get(rowId);
    if (!prior) {
      ops.push({ type: "insert", rowId, columns: { ...row } });
      continue;
    }
    const columns = {};
    let changed = false;
    for (const [col, value] of Object.entries(row)) {
      if (prior[col] !== value) {
        columns[col] = value;
        changed = true;
      }
    }
    if (changed) ops.push({ type: "update", rowId, columns });
  }
  for (const rowId of before.keys()) {
    if (!after.has(rowId)) ops.push({ type: "delete", rowId });
  }
  return ops;
}

/**
 * The whole-batch diff: `before`/`after` are `{tableName: rawExecResult |
 * null | undefined}` — exactly the shape term-sql-worker.js's `snapshots`
 * message carries, one entry per table it was asked to (or chose to, on
 * the full-table-list fallback) snapshot on each side. The union of both
 * sides' own table names is walked — a table that only appears on the
 * `after` side (created by the statement itself, e.g. `CREATE TABLE t
 * (...); INSERT INTO t …` run as one batch) diffs correctly against an
 * implicit empty `before`, and a table dropped mid-batch diffs correctly
 * against an implicit empty `after` — every op returned carries its own
 * `table`, flattened across every table touched.
 */
export function deriveStoreOps(before, after) {
  const names = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const ops = [];
  for (const table of names) {
    const before_ = snapshotFromExec(before?.[table]);
    const after_ = snapshotFromExec(after?.[table]);
    for (const op of diffSnapshots(before_, after_)) ops.push({ ...op, table });
  }
  return ops;
}

// ── `.load` — a CSV populates the fold via insertRow, not a table dump ─────
//
// term-sql-worker.js's `.load` handler drops a table directly (CREATE TABLE
// + a batch INSERT, no log involved) — correct and unchanged for a
// session-only table. For a database FOLD specifically, the caller (term.js)
// already holds the parsed `{columns, rows}` shape (csvTable, term.js's own)
// BEFORE it ever reaches the worker, so no diffing is needed here at all:
// every row of a `.load` is, by construction, a birth. `sanitizeTableName`
// mirrors term-sql-worker.js's own `tableName()` exactly (disclosed, not
// silently duplicated — the same posture store.js's own header already
// takes for materializeSql mirroring that same worker's CREATE TABLE shape)
// so the fold's table name and the live session's table name never disagree.

export function sanitizeTableName(sourceName) {
  const base = String(sourceName).replace(/\.[^.]+$/, "");
  const name = base.replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  return name && !/^\d/.test(name) ? name : `t_${name || "table"}`;
}

/**
 * `table` is csvTable's own `{columns:[{name,type}], rows:[[...]]}` shape.
 * Each row becomes exactly one `insertRow` call worth of op, `rowId` the
 * row's 1-based position — stable, caller-supplied, and (for a FRESH load
 * into an empty table, which `.load` always is) identical to the rowid
 * SQLite itself would assign, so a later mutation against this same table
 * diffs against the same identities the load itself used.
 */
export function opsFromCsvTable(tableName, table) {
  return table.rows.map((row, i) => {
    const columns = {};
    table.columns.forEach((c, ci) => {
      columns[c.name] = row[ci] ?? null;
    });
    return { type: "insert", table: tableName, rowId: String(i + 1), columns };
  });
}
