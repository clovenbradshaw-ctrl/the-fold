// term-sql-worker.js — the terminal's sql runtime: sqlite compiled to wasm
// (sql.js), vendored in node_modules and served from localhost (P1). A
// CLASSIC worker on purpose: sql.js ships as a UMD script, and
// importScripts is the one loader that hands it a global scope — so the
// boot uses importScripts, and then severs it along with every other
// egress API, before the first operator line runs.
//
// The CSV → table walk lives in term.js (csvTable — pure, tested); this
// worker only receives the parsed shape and holds the database. Results are
// kept to a declared budget (SQL_ROWS_KEPT) with the drop stated — the
// display side has its own keep budget, and two honest caps beat one
// silent one.

var SEVERED = ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "WebTransport", "importScripts", "Worker", "SharedWorker", "caches"];
var SQL_ROWS_KEPT = 500; // rows a result carries back; the total is always stated

function sever() {
  for (var i = 0; i < SEVERED.length; i++) {
    try {
      Object.defineProperty(self, SEVERED[i], { value: undefined, configurable: false, writable: false });
    } catch (e) {
      /* absent in this browser — nothing to sever */
    }
  }
}

var db = null;

function tableName(sourceName) {
  var base = String(sourceName).replace(/\.[^.]+$/, "");
  var name = base.replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  return name && !/^\d/.test(name) ? name : "t_" + (name || "table");
}

/** The sqlite shell's own dot grammar, the two commands material needs. */
function dotCommand(text) {
  var t = text.trim();
  if (t === ".tables") return "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;";
  var m = t.match(/^\.schema(?:\s+(\S+))?$/);
  if (m) return m[1]
    ? "SELECT sql FROM sqlite_master WHERE name='" + m[1].replace(/'/g, "''") + "';"
    : "SELECT sql FROM sqlite_master WHERE sql IS NOT NULL;";
  return null;
}

function runSql(text) {
  var results = db.exec(text);
  if (!results.length) {
    self.postMessage({ type: "out", text: "ok (no rows)" });
    return;
  }
  for (var r = 0; r < results.length; r++) {
    var res = results[r];
    var kept = res.values.slice(0, SQL_ROWS_KEPT);
    self.postMessage({ type: "result", columns: res.columns, values: kept, of: res.values.length });
  }
}

self.onmessage = function (ev) {
  var m = ev.data || {};
  if (m.type === "boot") {
    try {
      importScripts("/node_modules/sql.js/dist/sql-wasm.js");
      self
        .initSqlJs({ locateFile: function (f) { return "/node_modules/sql.js/dist/" + f; } })
        .then(function (SQL) {
          db = new SQL.Database();
          sever();
          var names = Object.keys(m.sources || {});
          self.postMessage({
            type: "ready",
            note:
              "sqlite ready (sql.js, local) — .load <source> imports a loaded CSV as a table, .tables and .schema read the catalog, a trailing ; runs a statement. " +
              (names.length ? names.length + " source(s) are loadable: " + names.join(", ") + ". " : "") +
              "no network: " + SEVERED.length + " egress APIs are severed in this worker.",
          });
        })
        .catch(function (e) {
          self.postMessage({ type: "err", text: "the sql runtime could not boot: " + e.message });
          self.postMessage({ type: "done" });
        });
    } catch (e) {
      self.postMessage({ type: "err", text: "the sql runtime could not boot: " + e.message });
      self.postMessage({ type: "done" });
    }
    return;
  }
  if (!db) return;
  if (m.type === "load") {
    try {
      var t = tableName(m.name);
      var cols = m.table.columns;
      db.run("DROP TABLE IF EXISTS " + t + ";");
      db.run(
        "CREATE TABLE " + t + " (" +
          cols.map(function (c) { return c.name + " " + c.type; }).join(", ") +
          ");",
      );
      var stmt = db.prepare(
        "INSERT INTO " + t + " VALUES (" + cols.map(function () { return "?"; }).join(",") + ")",
      );
      db.run("BEGIN;");
      for (var i = 0; i < m.table.rows.length; i++) stmt.run(m.table.rows[i]);
      db.run("COMMIT;");
      stmt.free();
      self.postMessage({
        type: "out",
        text:
          t + ": " + m.table.rows.length.toLocaleString() + " rows · " +
          cols.map(function (c) { return c.name + " " + c.type; }).join(", ") +
          (m.table.ragged ? " · some rows were ragged (short rows padded with NULL)" : ""),
      });
    } catch (e) {
      self.postMessage({ type: "err", text: e.message });
    }
    self.postMessage({ type: "done" });
    return;
  }
  if (m.type !== "exec") return;
  var started = Date.now();
  try {
    runSql(dotCommand(m.code) || String(m.code || ""));
  } catch (e) {
    self.postMessage({ type: "err", text: e.message });
  }
  self.postMessage({ type: "done", ms: Date.now() - started });
};
