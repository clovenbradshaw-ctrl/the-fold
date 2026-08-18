// store.js — a database whose only reality is the EOT event stream; the
// current state is always a projection, never a cached truth.
//
// The user's own correction, verbatim, is the load-bearing invariant of this
// whole module: "the reality of the database should be the EOT event
// stream, the current state always projected." Not a database WITH an
// audit log bolted beside it — the log IS the database, and "the current
// rows" is one particular fold over it, recomputed, never stored back as if
// it were itself the source of truth. This is the same theoretical lineage
// as the user's prior project, Choreo (github.com/clovenbradshaw-ctrl/
// Choreo — one append-only operations log, nine operators, "the log is
// truth, projection is convenience... it can be dropped and rebuilt from
// the log at any time") — not ported, applied: this repo already commits to
// exactly this principle in grid.js/build-log.js/task-log.js, and this
// module is that same commitment aimed at a new domain, database rows,
// rather than a new idea grafted on.
//
// Row identity is `${table}:${rowId}` as the task-log task_id — a caller-
// supplied table plus a caller-supplied rowId, so two different tables can
// each hold a row "1" without colliding. rowId is NEVER invented here
// (task-log's own "no silent coercion" discipline, extended): the caller —
// later, term.js — is expected to supply SQLite's own `rowid` for this
// role, because a real rowid needs no schema assumptions this module would
// otherwise have to invent (an auto-increment counter, a UUID scheme, a
// "first free integer" scan). That handoff is this module's own disclosed
// scope boundary: nothing here allocates identity, it only carries whatever
// identity arrives.
//
// insertRow is INS (birth, Figure grain) and updateRow is SYN (a full-value
// SUPERSEDE would be — but see below, updateRow is a field-merge, not a
// full retype), both typed `operator_basis: PRODUCED` — build-log.js's own
// precedent for this repo's mapping of the nine operators onto a domain:
// the entry is what a deterministic rule produced in response to an
// action, never raw dictation. deleteRow is NUL — the ask that a row no
// longer exist joins the log the same way build-log's own askEntry treats
// NUL as "the instruction verbatim," here typed to the retraction itself.
//
// THE MERGE SEMANTICS ARE task-log's OWN, NOT REDERIVED HERE. projectTasks
// (task-log.js) already merges any entry's non-reserved top-level keys onto
// the running per-task_id projection as `{...prior, ...payload}` — later
// entries for the SAME task_id win PER KEY, not wholesale. That is exactly
// SQL UPDATE semantics (change the columns named, leave the rest alone),
// already built, already tested — updateRow's whole job is to append ONE
// SUPERSEDE entry carrying only the changed columns and let projectTasks do
// the actual merging. This is why updateRow's own SUPERSEDE never carries a
// `supersedes` field: `supersedes` means "retire this OTHER task_id, a
// thread swap" (build-log.js's reviseBuild); a same-task_id SUPERSEDE is a
// field patch onto the SAME live row, a different act task-log's own fold
// already knows how to fold correctly without help.
//
// foldStore is the pure projection — Choreo's own "tables are implicit"
// principle, held here too, and consonant with this repo's own "no hand-set
// thresholds" ethos (POLICIES.md, feedback_no_handset_thresholds): a
// table's schema is never declared anywhere; it is the union of whatever
// columns its live rows have actually been given, discovered from the fold,
// never fixed in advance. CALLING foldStore TWICE ON THE IDENTICAL LOG MUST
// PRODUCE BYTE-IDENTICAL OUTPUT — this is the module's own core invariant,
// the same one build-log.js's foldBuild and task-log.js's projectTasks
// already hold, and nothing here may memoize state that could drift from
// what the log actually says.
//
// materializeSql bridges the pure projection into a REAL, query-able
// sql.js database, mirroring term-sql-worker.js's own `.load` handler's
// CREATE TABLE + prepared-statement batch INSERT (wrapped in BEGIN/COMMIT)
// — the same SQL-generation shape, not a second one invented here. It is
// deliberately dumb and mechanical, and it NEVER caches its own result:
// every caller is expected to re-run `materializeSql(SQL, foldStore(log))`
// fresh, every time it needs the live database. This is the single most
// important invariant in this file and the easiest one for a later change
// to quietly break — a cached Database object is exactly the "projection
// cached as truth" mistake the user's own correction exists to forbid, one
// layer further down the stack.
//
// Pure, organs injected: `taskLog` arrives as an argument (the cast.js /
// build-log.js pattern) so this file is loadable from `/engine` by the page
// and by relative path in tests, and `SQL` (sql.js's own exported
// namespace) arrives the same way so materializeSql is testable against the
// real npm package, never a stub.
//
// ── Disclosed deviations from the literal spec handed down, and why ────────
//
// (1) The collision guard extends beyond the module's own `table` field.
// The spec named `table` explicitly as a field this module writes onto an
// entry that a caller's `columns` must not silently clobber. The same
// silent-overwrite failure is just as real for three siblings this module
// also writes: `row` (the entry's own rowId field), `because` (the entry's
// own justification field), and `id` (the field foldStore itself writes
// onto every projected row, downstream of the entry). A caller's column
// named any of these four would otherwise ride through append() untouched,
// merge into the projection under that exact key via task-log's own
// `{...prior, ...payload}` fold, and then silently overwrite the module's
// own bookkeeping the next time that field is read — the exact class of
// bug this repo's own postmortems keep finding and fixing elsewhere (the
// DEF/EVA `Array.find` first-match bug, `synthesize`'s `String.includes`
// substring bug: CLAUDE.md's terminal-language section). Guarding all four
// the same way is a straightforward extension of the same rule the spec
// already named once; each is thrown with the exact colliding key named,
// never silently dropped or renamed.
//
// (2) foldStore also strips `task_id` and `because` from a row's own column
// set, beyond the bookkeeping-field list named in the spec. `task_id` is
// task-log's own internal identity string (`${table}:${rowId}`) — never
// something a caller put in via `columns` — and leaving it in would both
// violate "a row's columns are ONLY what the caller actually put in" and
// duplicate the identity information `id` already carries, under a
// confusing second key. `because` is this module's own optional
// justification field, carried on the entry but never part of `columns`
// either. Both are stripped for the identical reason `table`/`row` are.
//
// (3) materializeSql uses BARE (unquoted) SQL identifiers for table and
// column names, mirroring term-sql-worker.js's own `.load` handler exactly
// — CREATE TABLE's column list is `name TYPE` pairs joined by ", ", no
// quoting invented here that handler does not already have. term.js's own
// callers (csvTable, tableName) guarantee safe bare identifiers upstream by
// sanitizing every name into `[A-Za-z0-9_]`; THIS module's callers do not —
// `table` and every key of `columns` arrive exactly as the caller wrote
// them, unsanitized, per the "rowId is never invented, no silent coercion"
// discipline extended to names generally. A table or column name that is
// not itself already a valid bare SQL identifier (a space, an embedded
// quote, a reserved word) will therefore produce broken or unsafe SQL here.
// This is a known, disclosed limitation, not a silent gap: sanitizing names
// the way term.js's CSV path already does is a real option for a future
// pass, and is not invented here because the spec asked this function to
// mirror an existing shape, not to design a new one.
//
// (4) A table whose union column set is empty (every live row in it was
// inserted with `columns: {}`) is SKIPPED by materializeSql rather than
// attempted — SQLite's CREATE TABLE syntax requires at least one column,
// and inventing a placeholder column here would mean the materialized
// schema sometimes disagrees with `foldStore`'s own declared `columns: []`
// depending on data nobody asked this function to interpret. Disclosed
// rather than silently patched; not expected to be hit by ordinary rows,
// since a row with no columns at all is a degenerate insert to begin with.

const RESERVED_ENTRY_KEYS = Object.freeze(new Set([
  "kind", "task_id", "seq", "supersedes", "operator", "operator_basis",
  "grain", "description", "depends_on", "evidence", "result",
]));

// This module's own field names — see deviation (1) above for why all four,
// not only `table`.
const OWN_FIELDS = Object.freeze(new Set(["table", "row", "because", "id"]));

// task-log's own bookkeeping, stripped from a projected row before it
// becomes a table's column set — everything projectTasks adds to a task
// that is not domain payload the caller actually supplied. `task_id` is
// this module's own addition to the list (deviation 2, above).
const BOOKKEEPING_FIELDS = Object.freeze(new Set([
  "first_seq", "last_seq", "operator", "operator_basis", "operator_gap",
  "grain", "grain_gap", "cell", "description", "depends_on", "evidence",
  "result", "table", "row", "task_id", "because",
]));

function assertTableRowId(table, rowId, who) {
  if (typeof table !== "string" || !table) {
    throw new TypeError(`${who}: table must be a non-empty string`);
  }
  if (typeof rowId !== "string" || !rowId) {
    throw new TypeError(`${who}: rowId must be a non-empty string`);
  }
}

function assertColumns(columns, who) {
  if (!columns || typeof columns !== "object" || Array.isArray(columns)) {
    throw new TypeError(`${who}: columns must be a flat object of column-name -> value`);
  }
  for (const key of Object.keys(columns)) {
    if (RESERVED_ENTRY_KEYS.has(key)) {
      throw new TypeError(`${who}: column ${JSON.stringify(key)} collides with task-log's own reserved entry key`);
    }
    if (OWN_FIELDS.has(key)) {
      throw new TypeError(`${who}: column ${JSON.stringify(key)} collides with this module's own field of the same name`);
    }
  }
}

export function makeStore(taskLog) {
  const { createTaskLog, append, projectTasks, ENTRY_KINDS, OPERATOR_BASIS, GRAIN_RANK } = taskLog;

  // Read the same way build-log.js does — the name has one source of truth
  // (task-log's own GRAIN_RANK), never restated as a literal string here.
  const FIGURE = Object.keys(GRAIN_RANK).find((g) => GRAIN_RANK[g] === 1);

  /** A fresh, empty store log. */
  function createStoreLog() {
    return createTaskLog();
  }

  /**
   * Birth a row. One entry: PROPOSE · INS · Figure · produced. `columns` is
   * the row's starting values, flat, no key colliding with task-log's own
   * reserved entry keys or this module's own fields (table/row/because/id —
   * see this file's header, deviation 1).
   */
  function insertRow(log, { table, rowId, columns, because = null }) {
    assertTableRowId(table, rowId, "insertRow");
    assertColumns(columns, "insertRow");
    const task_id = `${table}:${rowId}`;
    return append(log, {
      kind: ENTRY_KINDS.PROPOSE,
      task_id,
      operator: "INS",
      operator_basis: OPERATOR_BASIS.PRODUCED,
      grain: FIGURE,
      table,
      row: rowId,
      description: `insert into ${table}`,
      ...(because != null ? { because } : {}),
      ...columns,
    });
  }

  /**
   * Revise a row. One entry: SUPERSEDE · SYN · Figure · produced, carrying
   * ONLY the changed columns — no `supersedes` field, because this is a
   * same-task_id field-merge (task-log's own projectTasks already does the
   * right thing for repeated task_ids: `{...prior, ...payload}`, later
   * entries winning per key), not a thread swap retiring one task_id in
   * favour of another.
   *
   * LOUDLY: a column NOT mentioned here is left exactly as it was — this is
   * the entire point of the merge semantics, and the single easiest thing
   * to get wrong. updateRow(log, {table, rowId, columns: {age: 31}}) on a
   * row that also has `name` and `email` changes ONLY age; name and email
   * survive untouched. A caller that wants to retype the whole row still
   * only needs to pass the columns that changed — passing every column
   * every time is never required and never assumed.
   *
   * Refuses (throws) if the row is not currently live in the log's own
   * projection — an update to a row that does not exist is a typed gap
   * here, not a silent insertRow. State this refusal, never degrade.
   */
  function updateRow(log, { table, rowId, columns, because = null }) {
    assertTableRowId(table, rowId, "updateRow");
    assertColumns(columns, "updateRow");
    const task_id = `${table}:${rowId}`;
    const live = projectTasks(log).some((t) => t.task_id === task_id);
    if (!live) {
      throw new Error(
        `updateRow: no live row ${JSON.stringify(task_id)} — an update to a row that does not exist is refused here, never silently treated as insertRow`,
      );
    }
    return append(log, {
      kind: ENTRY_KINDS.SUPERSEDE,
      task_id,
      operator: "SYN",
      operator_basis: OPERATOR_BASIS.PRODUCED,
      grain: FIGURE,
      table,
      row: rowId,
      description: `update ${table}`,
      ...(because != null ? { because } : {}),
      ...columns,
    });
  }

  /**
   * Retract a row. One entry: RETRACT · NUL · produced. NUL, not a bare
   * RETRACT with no operator: this repo's own grid.js already names NUL as
   * true destruction (the `void` verb, VERBS.void.ops === ["NUL"]), and it
   * is Choreo's own reading too — "the only operator that truly destroys...
   * the thing was here, and now it isn't" — the exact lineage this module
   * is built from. There is no build-log.js precedent to match here:
   * build-log.js's own retractBuild sets no operator on its RETRACT entry
   * at all, because a build's re-zero/retraction is a different act than a
   * row's death; NUL is chosen on its own merits, not borrowed.
   *
   * RETRACT entries carry no grain — checked against append()'s real
   * validation, not assumed: append() requires an operator whenever a grain
   * is supplied, but the reverse is not required, so an operator with no
   * grain at all is legal. projectTasks() drops any task_id carrying a
   * RETRACT entry out of the live projection entirely
   * (`retracted.add(e.task_id); continue`) — the row's own payload on this
   * entry is therefore never read by the fold either way, so none is
   * written here beyond what a reader of the raw log needs to know an act
   * happened and why.
   *
   * The entries themselves stay on the log forever — real deletion of
   * VISIBILITY, never of history.
   */
  function deleteRow(log, { table, rowId, because = null }) {
    assertTableRowId(table, rowId, "deleteRow");
    const task_id = `${table}:${rowId}`;
    return append(log, {
      kind: ENTRY_KINDS.RETRACT,
      task_id,
      operator: "NUL",
      operator_basis: OPERATOR_BASIS.PRODUCED,
      ...(because != null ? { because } : {}),
    });
  }

  /**
   * The pure projection. THE CORE INVARIANT: call this twice on the
   * identical log and get byte-identical output, every time — nothing here
   * may cache or memoize state that could drift from what the log actually
   * says; every call folds `log.entries` fresh.
   *
   * Returns `{ [table]: { columns, rows } }` — `columns` is the union of
   * every column key ever seen on any LIVE row in that table (schema is
   * implicit/emergent, discovered from the fold, never declared anywhere —
   * Choreo's own "tables are implicit"), in first-seen order across rows
   * (themselves ordered by `first_seq`, so the union order is itself
   * reproducible from the same log every time). `rows` is
   * `[{ id: rowId, ...columns }]`, one entry per live row, in insertion
   * order — a row carries only the columns it has actually been given
   * (sparse, not padded to the table's own union), because task-log's own
   * projection never invents a value nobody set.
   */
  function foldStore(log) {
    const tasks = projectTasks(log).filter((t) => t.table != null);
    const byTable = new Map();
    for (const t of tasks) {
      if (!byTable.has(t.table)) byTable.set(t.table, []);
      byTable.get(t.table).push(t);
    }
    const out = {};
    for (const [table, tableTasks] of byTable) {
      const seenColumns = [];
      const seenSet = new Set();
      const rows = tableTasks.map((t) => {
        const row = { id: t.row };
        for (const [key, value] of Object.entries(t)) {
          if (BOOKKEEPING_FIELDS.has(key)) continue;
          row[key] = value;
          if (!seenSet.has(key)) { seenSet.add(key); seenColumns.push(key); }
        }
        return row;
      });
      out[table] = { columns: seenColumns, rows };
    }
    return out;
  }

  /**
   * A column's SQLite type from the actual JS values present, the same
   * all-or-nothing ratchet csvTable (term.js) already applies to CSV text —
   * here read off real typed values instead of strings, because a row's
   * columns already carry real JS values (string/number/boolean/null), not
   * bytes to reparse: typeof "number" with Number.isInteger -> INTEGER,
   * typeof "number" otherwise -> REAL, else -> TEXT; a column with no
   * non-null samples defaults to TEXT, exactly csvTable's own
   * `type: any ? type : "TEXT"`.
   */
  function inferColumnType(values) {
    let type = "INTEGER";
    let any = false;
    for (const v of values) {
      if (v === null || v === undefined) continue;
      any = true;
      if (typeof v !== "number") { type = "TEXT"; break; }
      if (type === "INTEGER" && !Number.isInteger(v)) type = "REAL";
    }
    return any ? type : "TEXT";
  }

  /**
   * Bridge the pure projection into a real, query-able sql.js database.
   * `SQL` is sql.js's own exported namespace (injected — this must be
   * requirable/testable with the real npm package, never a stub).
   *
   * NEVER CACHED, NEVER STORED: this function is deliberately dumb and
   * mechanical, and every caller is expected to re-run
   * `materializeSql(SQL, foldStore(log))` fresh whenever it needs the live
   * database. This is the single most important invariant in this file —
   * see this module's own header for why it is easy for a later change to
   * quietly break it.
   *
   * Mirrors term-sql-worker.js's own `.load` handler's exact SQL-generation
   * shape: CREATE TABLE with bare (unquoted) identifiers, a prepared
   * INSERT statement run once per row inside one BEGIN/COMMIT — see this
   * file's header, deviations 3 and 4, for the two disclosed edges this
   * carries over (unsanitized identifiers; a zero-column table is skipped).
   */
  function materializeSql(SQL, projection) {
    const db = new SQL.Database();
    for (const [table, { columns, rows }] of Object.entries(projection)) {
      if (!columns.length) continue; // deviation 4 — nothing valid to CREATE
      const typed = columns.map((name) => ({
        name,
        type: inferColumnType(rows.map((r) => r[name])),
      }));
      db.run(`CREATE TABLE ${table} (${typed.map((c) => `${c.name} ${c.type}`).join(", ")});`);
      const stmt = db.prepare(`INSERT INTO ${table} VALUES (${typed.map(() => "?").join(",")})`);
      db.run("BEGIN;");
      for (const row of rows) {
        stmt.run(typed.map((c) => (row[c.name] === undefined ? null : row[c.name])));
      }
      db.run("COMMIT;");
      stmt.free();
    }
    return db;
  }

  return Object.freeze({
    createStoreLog,
    insertRow,
    updateRow,
    deleteRow,
    foldStore,
    materializeSql,
  });
}
