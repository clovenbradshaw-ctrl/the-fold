// store.test.mjs — the walls themselves, against the real engine and the
// real sql.js package.
//
// Every test here runs store.js over eoreader6's actual
// engine/holon/task-log.js (imported by relative path, the same way
// build-log.test.mjs/grid.test.mjs already do it) — no stub carries these
// walls. materializeSql is exercised against the REAL sql.js npm package
// (initSqlJs, the same Node-compatible loading incantation
// term-sql-worker.js's own boot uses, adapted for Node's locateFile) — an
// actual round trip through real SQLite, never a mock.

import test from "node:test";
import assert from "node:assert/strict";
import initSqlJs from "sql.js";

import * as taskLog from "../eoreader7/legacy-eoreader6.1/packages/engine/holon/task-log.js";
import { makeStore } from "./store.js";

const store = makeStore(taskLog);

let SQL = null;
async function getSQL() {
  if (!SQL) {
    SQL = await initSqlJs({ locateFile: (f) => `node_modules/sql.js/dist/${f}` });
  }
  return SQL;
}

test("insert then foldStore round-trips the exact columns given", () => {
  let log = store.createStoreLog();
  log = store.insertRow(log, { table: "users", rowId: "1", columns: { name: "Ada", age: 30, active: true } });
  const projected = store.foldStore(log);
  assert.deepEqual(projected.users.columns, ["name", "age", "active"]);
  assert.deepEqual(projected.users.rows, [{ id: "1", name: "Ada", age: 30, active: true }]);
});

test("update merges only the changed columns onto an existing row — an unmentioned column survives untouched", () => {
  let log = store.createStoreLog();
  log = store.insertRow(log, { table: "users", rowId: "1", columns: { name: "Ada", age: 30, email: "ada@example.com" } });
  log = store.updateRow(log, { table: "users", rowId: "1", columns: { age: 31 } });
  const row = store.foldStore(log).users.rows[0];
  assert.equal(row.age, 31);
  assert.equal(row.name, "Ada");
  assert.equal(row.email, "ada@example.com");
});

test("update on a nonexistent row throws — a typed refusal, never a silent insert", () => {
  let log = store.createStoreLog();
  assert.throws(
    () => store.updateRow(log, { table: "users", rowId: "1", columns: { age: 31 } }),
    /no live row/,
  );
});

test("delete removes a row from foldStore's output while log.entries still holds every entry ever appended", () => {
  let log = store.createStoreLog();
  log = store.insertRow(log, { table: "users", rowId: "1", columns: { name: "Ada" } });
  log = store.insertRow(log, { table: "users", rowId: "2", columns: { name: "Bob" } });
  const entriesBefore = log.entries.length;
  log = store.deleteRow(log, { table: "users", rowId: "1" });
  assert.equal(log.entries.length, entriesBefore + 1); // the retraction itself is one more entry
  const projected = store.foldStore(log);
  assert.deepEqual(projected.users.rows.map((r) => r.id), ["2"]);
  // History is never erased — every entry appended is still there, forever.
  assert.equal(
    log.entries.filter((e) => e.kind === taskLog.ENTRY_KINDS.PROPOSE).length,
    2,
  );
});

test("two different tables can each have a rowId of \"1\" without colliding", () => {
  let log = store.createStoreLog();
  log = store.insertRow(log, { table: "users", rowId: "1", columns: { name: "Ada" } });
  log = store.insertRow(log, { table: "orders", rowId: "1", columns: { total: 42 } });
  const projected = store.foldStore(log);
  assert.equal(projected.users.rows[0].name, "Ada");
  assert.equal(projected.orders.rows[0].total, 42);
});

test("a column name colliding with a reserved task-log key throws a clear error naming the key", () => {
  const log = store.createStoreLog();
  assert.throws(
    () => store.insertRow(log, { table: "users", rowId: "1", columns: { operator: "sneaky" } }),
    /operator/,
  );
});

test("a column name colliding with this module's own field (table/row/because/id) also throws, naming the key", () => {
  const log = store.createStoreLog();
  assert.throws(
    () => store.insertRow(log, { table: "users", rowId: "1", columns: { row: "sneaky" } }),
    /"row"/,
  );
  assert.throws(
    () => store.insertRow(log, { table: "users", rowId: "1", columns: { id: "sneaky" } }),
    /"id"/,
  );
});

test("foldStore is pure and deterministic — call it twice on the same log, get deep-equal results", () => {
  let log = store.createStoreLog();
  log = store.insertRow(log, { table: "users", rowId: "1", columns: { name: "Ada", age: 30 } });
  log = store.updateRow(log, { table: "users", rowId: "1", columns: { age: 31 } });
  log = store.insertRow(log, { table: "users", rowId: "2", columns: { name: "Bob" } });
  const first = store.foldStore(log);
  const second = store.foldStore(log);
  assert.deepEqual(first, second);
});

test("materializeSql against a real sql.js instance actually executes a real SELECT and gets correct rows back", async () => {
  const SQLns = await getSQL();
  let log = store.createStoreLog();
  log = store.insertRow(log, { table: "users", rowId: "1", columns: { name: "Ada", age: 30 } });
  log = store.insertRow(log, { table: "users", rowId: "2", columns: { name: "Bob", age: 25 } });
  log = store.insertRow(log, { table: "users", rowId: "3", columns: { name: "Cy", age: 40 } });
  const projection = store.foldStore(log);
  const database = store.materializeSql(SQLns, projection);
  const res = database.exec("SELECT name, age FROM users WHERE age > 26 ORDER BY name");
  assert.deepEqual(res[0].columns, ["name", "age"]);
  assert.deepEqual(res[0].values, [["Ada", 30], ["Cy", 40]]);
});

test("materializeSql infers INTEGER/REAL/TEXT the same all-or-nothing way csvTable does, off real JS values", async () => {
  const SQLns = await getSQL();
  let log = store.createStoreLog();
  log = store.insertRow(log, { table: "readings", rowId: "1", columns: { count: 3, ratio: 1.5, label: "a" } });
  log = store.insertRow(log, { table: "readings", rowId: "2", columns: { count: 7, ratio: 2, label: "b" } });
  const projection = store.foldStore(log);
  const database = store.materializeSql(SQLns, projection);
  const schema = database.exec("SELECT sql FROM sqlite_master WHERE name = 'readings'")[0].values[0][0];
  assert.match(schema, /count INTEGER/);
  assert.match(schema, /ratio REAL/); // 1.5 forces REAL even though 2 alone would look like an integer
  assert.match(schema, /label TEXT/);
});

test("materializeSql never caches — re-running it fresh on a re-folded log reflects a row deleted in between", async () => {
  const SQLns = await getSQL();
  let log = store.createStoreLog();
  log = store.insertRow(log, { table: "users", rowId: "1", columns: { name: "Ada" } });
  const before = store.materializeSql(SQLns, store.foldStore(log));
  assert.deepEqual(before.exec("SELECT name FROM users")[0].values, [["Ada"]]);
  log = store.deleteRow(log, { table: "users", rowId: "1" });
  const after = store.materializeSql(SQLns, store.foldStore(log));
  // No live rows at all means foldStore never surfaces "users" as a table —
  // materializeSql then never CREATEs it either, so the fresh database
  // genuinely has nothing named "users", not an empty one.
  assert.deepEqual(after.exec("SELECT name FROM sqlite_master WHERE type='table'"), []);
});

test("insertRow/updateRow/deleteRow require non-empty string table and rowId", () => {
  const log = store.createStoreLog();
  assert.throws(() => store.insertRow(log, { table: "", rowId: "1", columns: {} }), TypeError);
  assert.throws(() => store.insertRow(log, { table: "users", rowId: "", columns: {} }), TypeError);
  assert.throws(() => store.deleteRow(log, { table: "users", rowId: "" }), TypeError);
});

test("insertRow lands one PROPOSE · INS · Figure · produced entry", () => {
  const log = store.insertRow(store.createStoreLog(), { table: "users", rowId: "1", columns: { name: "Ada" } });
  assert.equal(log.entries.length, 1);
  const e = log.entries[0];
  assert.equal(e.kind, taskLog.ENTRY_KINDS.PROPOSE);
  assert.equal(e.operator, "INS");
  assert.equal(e.grain, "Figure");
  assert.equal(e.operator_basis, taskLog.OPERATOR_BASIS.PRODUCED);
  assert.equal(e.task_id, "users:1");
});

test("updateRow lands one SUPERSEDE · SYN · Figure · produced entry with no `supersedes` field", () => {
  let log = store.insertRow(store.createStoreLog(), { table: "users", rowId: "1", columns: { name: "Ada" } });
  log = store.updateRow(log, { table: "users", rowId: "1", columns: { name: "Ada B." } });
  const e = log.entries[1];
  assert.equal(e.kind, taskLog.ENTRY_KINDS.SUPERSEDE);
  assert.equal(e.operator, "SYN");
  assert.equal(e.grain, "Figure");
  assert.equal(e.operator_basis, taskLog.OPERATOR_BASIS.PRODUCED);
  assert.equal(e.supersedes, undefined);
  assert.equal(e.task_id, "users:1");
});

test("deleteRow lands one RETRACT · NUL entry carrying no grain, and append() accepts it", () => {
  let log = store.insertRow(store.createStoreLog(), { table: "users", rowId: "1", columns: { name: "Ada" } });
  log = store.deleteRow(log, { table: "users", rowId: "1" });
  const e = log.entries[1];
  assert.equal(e.kind, taskLog.ENTRY_KINDS.RETRACT);
  assert.equal(e.operator, "NUL");
  assert.equal(e.grain, undefined);
});

test("`because`, when given, rides the entry and does not appear as a data column", () => {
  let log = store.insertRow(store.createStoreLog(), {
    table: "users",
    rowId: "1",
    columns: { name: "Ada" },
    because: "seed data",
  });
  assert.equal(log.entries[0].because, "seed data");
  const projected = store.foldStore(log);
  assert.deepEqual(projected.users.columns, ["name"]);
  assert.equal(projected.users.rows[0].because, undefined);
});

test("checkCubeProgression stays silent on an insert-then-update-then-delete thread", () => {
  let log = store.insertRow(store.createStoreLog(), { table: "users", rowId: "1", columns: { name: "Ada" } });
  log = store.updateRow(log, { table: "users", rowId: "1", columns: { name: "Ada B." } });
  log = store.deleteRow(log, { table: "users", rowId: "1" });
  assert.deepEqual(taskLog.checkCubeProgression(log), []);
});
