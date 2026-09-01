// store-sql.test.mjs — the diff-derivation logic, against the real sql.js
// package, no stubs (store.test.mjs's own convention). Every "before"/
// "after" pair below is a REAL `db.exec("SELECT rowid, * FROM t")` result
// from a REAL in-memory SQLite database — not a hand-typed fixture standing
// in for one — so a change to sql.js's own result shape would break these
// tests rather than pass silently against an out-of-date guess.

import test from "node:test";
import assert from "node:assert/strict";
import initSqlJs from "sql.js";

import {
  looksMutating,
  detectTables,
  snapshotFromExec,
  diffSnapshots,
  deriveStoreOps,
  sanitizeTableName,
  opsFromCsvTable,
} from "./store-sql.js";

let SQL = null;
async function getSQL() {
  if (!SQL) SQL = await initSqlJs({ locateFile: (f) => `node_modules/sql.js/dist/${f}` });
  return SQL;
}

/** One table's raw exec result, `undefined` when the table has zero rows —
 * matching sql.js's own real behaviour (confirmed live, not assumed): a
 * SELECT that matches nothing is OMITTED from exec()'s return array
 * entirely, not returned as an empty {columns, values} object. */
function snap(db, table) {
  try {
    const r = db.exec(`SELECT rowid, * FROM ${table}`);
    return r.length ? r[0] : undefined;
  } catch {
    return null; // no such table
  }
}

test("looksMutating claims INSERT/UPDATE/DELETE/REPLACE and only those", () => {
  assert.equal(looksMutating("INSERT INTO t VALUES (1)"), true);
  assert.equal(looksMutating("update t set x=1"), true);
  assert.equal(looksMutating("DELETE FROM t"), true);
  assert.equal(looksMutating("REPLACE INTO t VALUES (1)"), true);
  assert.equal(looksMutating("SELECT * FROM t"), false);
  assert.equal(looksMutating("CREATE TABLE t (x INTEGER)"), false);
  assert.equal(looksMutating(".tables"), false);
});

test("detectTables reads the bare table name off INSERT/UPDATE/DELETE/REPLACE, deduplicated, in first-seen order", () => {
  assert.deepEqual(detectTables("INSERT INTO orders VALUES (1); INSERT INTO orders VALUES (2);"), ["orders"]);
  assert.deepEqual(detectTables("UPDATE users SET age = 31 WHERE name = 'Alice';"), ["users"]);
  assert.deepEqual(detectTables("DELETE FROM users WHERE name = 'Bob';"), ["users"]);
  assert.deepEqual(detectTables("INSERT INTO a VALUES (1); UPDATE b SET x=1;"), ["a", "b"]);
  assert.deepEqual(detectTables("INSERT OR REPLACE INTO t VALUES (1);"), ["t"]);
  assert.deepEqual(detectTables("SELECT * FROM t"), []); // no mutation named — the caller's cue to fall back
});

test("snapshotFromExec collapses zero-rows, no-such-table, and undefined to the same empty map", () => {
  assert.deepEqual(snapshotFromExec(undefined), new Map());
  assert.deepEqual(snapshotFromExec(null), new Map());
  assert.deepEqual(
    snapshotFromExec({ columns: ["rowid", "name", "age"], values: [[1, "Alice", 30]] }),
    new Map([["1", { name: "Alice", age: 30 }]]),
  );
});

test("a real CREATE TABLE + two INSERTs, diffed against a real db, derives two insert ops with the full row's columns", async () => {
  const SQLns = await getSQL();
  const db = new SQLns.Database();
  const before = snap(db, "t"); // table does not exist yet — null
  db.exec("CREATE TABLE t (name TEXT, age INTEGER); INSERT INTO t VALUES ('Alice', 30); INSERT INTO t VALUES ('Bob', 25);");
  const after = snap(db, "t");
  const ops = diffSnapshots(snapshotFromExec(before), snapshotFromExec(after));
  assert.equal(ops.length, 2);
  assert.deepEqual(ops.map((o) => o.type), ["insert", "insert"]);
  const byRow = Object.fromEntries(ops.map((o) => [o.rowId, o.columns]));
  assert.deepEqual(byRow["1"], { name: "Alice", age: 30 });
  assert.deepEqual(byRow["2"], { name: "Bob", age: 25 });
});

test("a real UPDATE of one column diffs to exactly one update op carrying ONLY that column — the untouched row is silent", async () => {
  const SQLns = await getSQL();
  const db = new SQLns.Database();
  db.exec("CREATE TABLE t (name TEXT, age INTEGER); INSERT INTO t VALUES ('Alice', 30); INSERT INTO t VALUES ('Bob', 25);");
  const before = snap(db, "t");
  db.exec("UPDATE t SET age = 31 WHERE name = 'Alice';");
  const after = snap(db, "t");
  const ops = diffSnapshots(snapshotFromExec(before), snapshotFromExec(after));
  assert.equal(ops.length, 1); // Bob's row produced no op at all — column-for-column equal
  assert.equal(ops[0].type, "update");
  assert.equal(ops[0].rowId, "1");
  assert.deepEqual(ops[0].columns, { age: 31 }); // name is NOT resent — the whole point of the merge
});

test("a real DELETE diffs to exactly one delete op, naming only the removed rowid", async () => {
  const SQLns = await getSQL();
  const db = new SQLns.Database();
  db.exec("CREATE TABLE t (name TEXT, age INTEGER); INSERT INTO t VALUES ('Alice', 31); INSERT INTO t VALUES ('Bob', 25);");
  const before = snap(db, "t");
  db.exec("DELETE FROM t WHERE name = 'Bob';");
  const after = snap(db, "t");
  const ops = diffSnapshots(snapshotFromExec(before), snapshotFromExec(after));
  assert.deepEqual(ops, [{ type: "delete", rowId: "2" }]);
});

test("a bare SELECT diffs to zero ops — before and after are the identical snapshot", async () => {
  const SQLns = await getSQL();
  const db = new SQLns.Database();
  db.exec("CREATE TABLE t (name TEXT); INSERT INTO t VALUES ('Alice');");
  const before = snap(db, "t");
  db.exec("SELECT * FROM t;"); // a read — nothing changes
  const after = snap(db, "t");
  assert.deepEqual(diffSnapshots(snapshotFromExec(before), snapshotFromExec(after)), []);
});

test("an insert-then-delete of the same row within ONE batch nets to zero ops — the row's whole lifecycle is invisible from outside the batch", async () => {
  const SQLns = await getSQL();
  const db = new SQLns.Database();
  db.exec("CREATE TABLE t (name TEXT);");
  const before = snap(db, "t");
  db.exec("INSERT INTO t VALUES ('ghost'); DELETE FROM t WHERE name = 'ghost';");
  const after = snap(db, "t");
  assert.deepEqual(diffSnapshots(snapshotFromExec(before), snapshotFromExec(after)), []);
});

test("deriveStoreOps flattens ops across every table in the union of before/after, each op tagged with its own table", async () => {
  const SQLns = await getSQL();
  const db = new SQLns.Database();
  db.exec("CREATE TABLE users (name TEXT); CREATE TABLE orders (total INTEGER);");
  const before = { users: snap(db, "users"), orders: snap(db, "orders") };
  db.exec("INSERT INTO users VALUES ('Ada'); INSERT INTO orders VALUES (42);");
  const after = { users: snap(db, "users"), orders: snap(db, "orders") };
  const ops = deriveStoreOps(before, after);
  assert.equal(ops.length, 2);
  assert.deepEqual(
    ops.map((o) => [o.table, o.type, o.rowId]).sort(),
    [["orders", "insert", "1"], ["users", "insert", "1"]],
  );
});

test("deriveStoreOps handles a table that appears only on the after side — created and populated within the same batch", async () => {
  const SQLns = await getSQL();
  const db = new SQLns.Database();
  const before = {}; // nothing snapshotted yet — the caller couldn't have named "t", it didn't exist
  db.exec("CREATE TABLE t (name TEXT); INSERT INTO t VALUES ('Ada');");
  const after = { t: snap(db, "t") };
  const ops = deriveStoreOps(before, after);
  assert.deepEqual(ops, [{ table: "t", type: "insert", rowId: "1", columns: { name: "Ada" } }]);
});

test("sanitizeTableName mirrors term-sql-worker.js's own tableName() exactly", () => {
  assert.equal(sanitizeTableName("orders.csv"), "orders");
  assert.equal(sanitizeTableName("my report (final).csv"), "my_report_final");
  assert.equal(sanitizeTableName("2024.csv"), "t_2024");
  assert.equal(sanitizeTableName(".csv"), "t_table");
});

test("opsFromCsvTable derives one insert op per row, 1-based rowId, all-columns", () => {
  const table = {
    columns: [{ name: "city", type: "TEXT" }, { name: "riders", type: "INTEGER" }],
    rows: [["Nashville", 1200], ["Memphis", 900]],
  };
  const ops = opsFromCsvTable("t", table);
  assert.deepEqual(ops, [
    { type: "insert", table: "t", rowId: "1", columns: { city: "Nashville", riders: 1200 } },
    { type: "insert", table: "t", rowId: "2", columns: { city: "Memphis", riders: 900 } },
  ]);
});

test("opsFromCsvTable carries a null cell through as a real null column value, never omitted", () => {
  const table = { columns: [{ name: "note", type: "TEXT" }], rows: [[null]] };
  assert.deepEqual(opsFromCsvTable("t", table), [{ type: "insert", table: "t", rowId: "1", columns: { note: null } }]);
});

test("end to end: real sql.js batch → deriveStoreOps → store.js insertRow/updateRow/deleteRow round-trips through foldStore", async () => {
  const SQLns = await getSQL();
  const taskLog = await import("../eoreader7/legacy-eoreader6.1/packages/engine/holon/task-log.js");
  const { makeStore } = await import("./store.js");
  const store = makeStore(taskLog);

  const db = new SQLns.Database();
  let before = { t: snap(db, "t") };
  db.exec("CREATE TABLE t (name TEXT, age INTEGER); INSERT INTO t VALUES ('Alice', 30); INSERT INTO t VALUES ('Bob', 25);");
  let after = { t: snap(db, "t") };
  let log = store.createStoreLog();
  for (const op of deriveStoreOps(before, after)) {
    log = op.type === "insert" ? store.insertRow(log, { table: op.table, rowId: op.rowId, columns: op.columns })
      : op.type === "update" ? store.updateRow(log, { table: op.table, rowId: op.rowId, columns: op.columns })
      : store.deleteRow(log, { table: op.table, rowId: op.rowId });
  }
  assert.deepEqual(store.foldStore(log).t.rows, [
    { id: "1", name: "Alice", age: 30 },
    { id: "2", name: "Bob", age: 25 },
  ]);

  before = { t: snap(db, "t") };
  db.exec("UPDATE t SET age = 31 WHERE name = 'Alice';");
  after = { t: snap(db, "t") };
  for (const op of deriveStoreOps(before, after)) {
    log = store.updateRow(log, { table: op.table, rowId: op.rowId, columns: op.columns });
  }
  const entriesAfterUpdate = log.entries.length;
  assert.equal(entriesAfterUpdate, 3); // 2 inserts + exactly ONE update entry — Bob is untouched
  const rows = store.foldStore(log).t.rows;
  assert.deepEqual(rows.find((r) => r.id === "1"), { id: "1", name: "Alice", age: 31 });
  assert.deepEqual(rows.find((r) => r.id === "2"), { id: "2", name: "Bob", age: 25 });

  before = { t: snap(db, "t") };
  db.exec("DELETE FROM t WHERE name = 'Bob';");
  after = { t: snap(db, "t") };
  for (const op of deriveStoreOps(before, after)) {
    log = store.deleteRow(log, { table: op.table, rowId: op.rowId });
  }
  assert.equal(log.entries.length, 4);
  assert.deepEqual(store.foldStore(log).t.rows.map((r) => r.id), ["1"]);

  // The invariant this whole file exists to prove: materializeSql, called
  // FRESH against the log's own projection, is a real, query-able database —
  // never the thing that was saved (the log's entries alone were saved).
  const database = store.materializeSql(SQLns, store.foldStore(log));
  assert.deepEqual(database.exec("SELECT name, age FROM t")[0].values, [["Alice", 31]]);
});
